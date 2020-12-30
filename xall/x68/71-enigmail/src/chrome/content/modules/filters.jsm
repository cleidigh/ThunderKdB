/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailFilters"];

const EnigmailLazy = ChromeUtils.import("chrome://enigmail/content/modules/lazy.jsm").EnigmailLazy;
const EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
const EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
const EnigmailPersistentCrypto = ChromeUtils.import("chrome://enigmail/content/modules/persistentCrypto.jsm").EnigmailPersistentCrypto;
const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const EnigmailFuncs = ChromeUtils.import("chrome://enigmail/content/modules/funcs.jsm").EnigmailFuncs;
const EnigmailKeyRing = ChromeUtils.import("chrome://enigmail/content/modules/keyRing.jsm").EnigmailKeyRing;
const EnigmailStreams = ChromeUtils.import("chrome://enigmail/content/modules/streams.jsm").EnigmailStreams;
const EnigmailConstants = ChromeUtils.import("chrome://enigmail/content/modules/constants.jsm").EnigmailConstants;
const EnigmailData = ChromeUtils.import("chrome://enigmail/content/modules/data.jsm").EnigmailData;
const jsmime = ChromeUtils.import("resource:///modules/jsmime.jsm").jsmime;
const NetUtil = ChromeUtils.import("resource://gre/modules/NetUtil.jsm").NetUtil;
const EnigmailMime = ChromeUtils.import("chrome://enigmail/content/modules/mime.jsm").EnigmailMime;
const EnigmailCompat = ChromeUtils.import("chrome://enigmail/content/modules/compat.jsm").EnigmailCompat;

const getDialog = EnigmailLazy.loader("enigmail/dialog.jsm", "EnigmailDialog");

var gNewMailListenerInitiated = false;

/**
 * filter action for creating a decrypted version of the mail and
 * deleting the original mail at the same time
 */

const filterActionMoveDecrypt = {
  apply: function(aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {

    EnigmailLog.DEBUG("filters.jsm: filterActionMoveDecrypt: Move to: " + aActionValue + "\n");

    var msgHdrs = [];

    for (var i = 0; i < aMsgHdrs.length; i++) {
      msgHdrs.push(aMsgHdrs.queryElementAt(i, Ci.nsIMsgDBHdr));
    }

    EnigmailPersistentCrypto.dispatchMessages(msgHdrs, aActionValue, aListener, true);
  },

  isValidForType: function(type, scope) {
    return true;
  },

  validateActionValue: function(value, folder, type) {
    getDialog().alert(null, EnigmailLocale.getString("filter.decryptMove.warnExperimental"));

    if (value === "") {
      return EnigmailLocale.getString("filter.folderRequired");
    }

    return null;
  }
};

/**
 * filter action for creating a decrypted copy of the mail, leaving the original
 * message untouched
 */
const filterActionCopyDecrypt = {
  apply: function(aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
    EnigmailLog.DEBUG("filters.jsm: filterActionCopyDecrypt: Copy to: " + aActionValue + "\n");

    var msgHdrs = [];

    for (var i = 0; i < aMsgHdrs.length; i++) {
      msgHdrs.push(aMsgHdrs.queryElementAt(i, Ci.nsIMsgDBHdr));
    }

    EnigmailPersistentCrypto.dispatchMessages(msgHdrs, aActionValue, aListener, false);
  },

  isValidForType: function(type, scope) {
    EnigmailLog.DEBUG("filters.jsm: filterActionCopyDecrypt.isValidForType(" + type + ")\n");

    let r = true;
    return r;
  },

  validateActionValue: function(value, folder, type) {
    EnigmailLog.DEBUG("filters.jsm: filterActionCopyDecrypt.validateActionValue(" + value + ")\n");

    if (value === "") {
      return EnigmailLocale.getString("filter.folderRequired");
    }

    return null;
  }
};

/**
 * filter action for to encrypt a mail to a specific key
 */
const filterActionEncrypt = {
  apply: function(aMsgHdrs, aActionValue, aListener, aType, aMsgWindow) {
    // Ensure KeyRing is loaded.
    if (aMsgWindow) {
      EnigmailCore.getService(aMsgWindow.domWindow);
    }
    else {
      EnigmailCore.getService();
    }
    EnigmailKeyRing.getAllKeys();

    EnigmailLog.DEBUG("filters.jsm: filterActionEncrypt: Encrypt to: " + aActionValue + "\n");
    let keyObj = EnigmailKeyRing.getKeyById(aActionValue);

    if (keyObj === null) {
      EnigmailLog.DEBUG("filters.jsm: failed to find key by id: " + aActionValue + "\n");
      let keyId = EnigmailKeyRing.getValidKeyForRecipient(aActionValue);
      if (keyId) {
        keyObj = EnigmailKeyRing.getKeyById(keyId);
      }
    }

    if (keyObj === null && aListener) {
      EnigmailLog.DEBUG("filters.jsm: no valid key - aborting\n");

      aListener.OnStartCopy();
      aListener.OnStopCopy(1);

      return;
    }

    EnigmailLog.DEBUG("filters.jsm: key to encrypt to: " + JSON.stringify(keyObj) + ", userId: " + keyObj.userId + "\n");

    var msgHdrs = [];
    for (let i = 0; i < aMsgHdrs.length; i++) {
      let msg = aMsgHdrs.queryElementAt(i, Ci.nsIMsgDBHdr);
      // Maybe skip messages here if they are already encrypted to
      // the target key? There might be some use case for unconditionally
      // encrypting here. E.g. to use the local preferences and remove all
      // other recipients.
      // Also not encrypting to already encrypted messages would make the
      // behavior less transparent as it's not obvious.
      msgHdrs.push(msg);
    }

    if (msgHdrs.length) {
      EnigmailPersistentCrypto.dispatchMessages(msgHdrs, null /* same folder */ , aListener,
        true /* move */ , keyObj /* target key */ );
    }
  },

  isValidForType: function(type, scope) {
    return true;
  },

  validateActionValue: function(value, folder, type) {
    // Initialize KeyRing. Ugly as it blocks the GUI but
    // we need it.
    EnigmailCore.getService();
    EnigmailKeyRing.getAllKeys();

    EnigmailLog.DEBUG("filters.jsm: validateActionValue: Encrypt to: " + value + "\n");
    if (value === "") {
      return EnigmailLocale.getString("filter.keyRequired");
    }

    let keyObj = EnigmailKeyRing.getKeyById(value);

    if (keyObj === null) {
      EnigmailLog.DEBUG("filters.jsm: failed to find key by id. Looking for uid.\n");
      let keyId = EnigmailKeyRing.getValidKeyForRecipient(value);
      if (keyId) {
        keyObj = EnigmailKeyRing.getKeyById(keyId);
      }
    }

    if (keyObj === null) {
      return EnigmailLocale.getString("filter.keyNotFound", [value]);
    }

    if (!keyObj.secretAvailable) {
      // We warn but we allow it. There might be use cases where
      // thunderbird + enigmail is used as a gateway filter with
      // the secret not available on one machine and the decryption
      // is intended to happen on different systems.
      getDialog().alert(null, EnigmailLocale.getString("filter.warn.keyNotSecret", [value]));
    }

    return null;
  }
};

function isPGPEncrypted(data) {
  // We only check the first mime subpart for application/pgp-encrypted.
  // If it is text/plain or text/html we look into that for the
  // message marker.
  // If there are no subparts we just look in the body.
  //
  // This intentionally does not match more complex cases
  // with sub parts beeing encrypted etc. as auto processing
  // these kinds of mails will be error prone and better not
  // done through a filter

  var mimeTree = EnigmailMime.getMimeTree(data, true);
  if (!(mimeTree.subParts.length)) {
    // No subParts. Check for PGP Marker in Body
    return mimeTree.body.indexOf('-----BEGIN PGP MESSAGE-----') >= 0;
  }

  // Check the type of the first subpart.
  var firstPart = mimeTree.subParts[0];
  var ct = firstPart.fullContentType;
  if (typeof(ct) == "string") {
    ct = ct.replace(/[\r\n]/g, " ");
    // Proper PGP/MIME ?
    if (ct.search(/application\/pgp-encrypted/i) >= 0) {
      return true;
    }
    // Look into text/plain pgp messages and text/html messages.
    if (ct.search(/text\/plain/i) >= 0 ||
      ct.search(/text\/html/i) >= 0) {
      return firstPart.body.indexOf('-----BEGIN PGP MESSAGE-----') >= 0;
    }
  }
  return false;
}

/**
 * filter term for OpenPGP Encrypted mail
 */
const filterTermPGPEncrypted = {
  id: EnigmailConstants.FILTER_TERM_PGP_ENCRYPTED,
  name: EnigmailLocale.getString("filter.term.pgpencrypted.label"),
  needsBody: true,
  match: function(aMsgHdr, searchValue, searchOp) {
    var folder = aMsgHdr.folder;
    var stream = folder.getMsgInputStream(aMsgHdr, {});

    var messageSize = folder.hasMsgOffline(aMsgHdr.messageKey) ? aMsgHdr.offlineMessageSize : aMsgHdr.messageSize;
    var scriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
    var data;
    try {
      data = NetUtil.readInputStreamToString(stream, messageSize);
    }
    catch (ex) {
      EnigmailLog.DEBUG("filters.jsm: filterTermPGPEncrypted: failed to get data.\n");
      // If we don't know better to return false.
      stream.close();
      return false;
    }

    var isPGP = isPGPEncrypted(data);

    stream.close();

    return ((searchOp == Ci.nsMsgSearchOp.Is && isPGP) ||
      (searchOp == Ci.nsMsgSearchOp.Isnt && !isPGP));
  },

  getEnabled: function(scope, op) {
    return true;
  },

  getAvailable: function(scope, op) {
    return true;
  },

  getAvailableOperators: function(scope, length) {
    length.value = 2;
    return [Ci.nsMsgSearchOp.Is, Ci.nsMsgSearchOp.Isnt];
  }
};

/**
 * Add a custom filter action. If the filter already exists, do nothing
 * (for example, if addon is disabled and re-enabled)
 *
 * @param filterObj - nsIMsgFilterCustomAction
 */
function addFilterIfNotExists(filterObj) {
  let filterService = Cc["@mozilla.org/messenger/services/filters;1"].getService(Ci.nsIMsgFilterService);

  let foundFilter = null;
  try {
    foundFilter = filterService.getCustomAction(filterObj.id);
  }
  catch (ex) {}

  if (!foundFilter) {
    EnigmailLog.DEBUG("filters.jsm: addFilterIfNotExists: " + filterObj.id + "\n");
    filterService.addCustomAction(filterObj);
  }
}

function initNewMailListener() {
  EnigmailLog.DEBUG("filters.jsm: initNewMailListener()\n");

  if (!gNewMailListenerInitiated) {
    let notificationService = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
      .getService(Ci.nsIMsgFolderNotificationService);
    notificationService.addListener(newMailListener, notificationService.msgAdded);
  }
  gNewMailListenerInitiated = true;
}

function shutdownNewMailListener() {
  EnigmailLog.DEBUG("filters.jsm: shutdownNewMailListener()\n");

  if (gNewMailListenerInitiated) {
    let notificationService = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
      .getService(Ci.nsIMsgFolderNotificationService);
    notificationService.removeListener(newMailListener);
    gNewMailListenerInitiated = false;
  }
}

function getIdentityForSender(senderEmail, msgServer) {
  let accountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);

  let identities = accountManager.getIdentitiesForServer(msgServer);

  for (let i = 0; i < identities.length; i++) {
    let id = identities.queryElementAt(i, Ci.nsIMsgIdentity);
    if (id.email.toLowerCase() === senderEmail.toLowerCase()) {
      return id;
    }
  }

  return null;
}

var consumerList = [];


function JsmimeEmitter(requireBody) {
  this.requireBody = requireBody;
  this.mimeTree = {
    partNum: "",
    headers: null,
    body: "",
    parent: null,
    subParts: []
  };
  this.stack = [];
  this.currPartNum = "";
}

JsmimeEmitter.prototype = {

  createPartObj: function(partNum, headers, parent) {
    return {
      partNum: partNum,
      headers: headers,
      body: "",
      parent: parent,
      subParts: []
    };
  },

  getMimeTree: function() {
    return this.mimeTree.subParts[0];
  },

  /** JSMime API **/
  startMessage: function() {
    this.currentPart = this.mimeTree;
  },
  endMessage: function() {},

  startPart: function(partNum, headers) {
    EnigmailLog.DEBUG("filters.jsm: JsmimeEmitter.startPart: partNum=" + partNum + "\n");
    //this.stack.push(partNum);
    let newPart = this.createPartObj(partNum, headers, this.currentPart);

    if (partNum.indexOf(this.currPartNum) === 0) {
      // found sub-part
      this.currentPart.subParts.push(newPart);
    }
    else {
      // found same or higher level
      this.currentPart.subParts.push(newPart);
    }
    this.currPartNum = partNum;
    this.currentPart = newPart;
  },

  endPart: function(partNum) {
    EnigmailLog.DEBUG("filters.jsm: JsmimeEmitter.startPart: partNum=" + partNum + "\n");
    this.currentPart = this.currentPart.parent;
  },

  deliverPartData: function(partNum, data) {
    EnigmailLog.DEBUG("filters.jsm: JsmimeEmitter.deliverPartData: partNum=" + partNum + "\n");
    if (this.requireBody) {
      if (typeof(data) === "string") {
        this.currentPart.body += data;
      }
      else {
        this.currentPart.body += EnigmailData.arrayBufferToString(data);
      }
    }
  }
};

function processIncomingMail(url, requireBody, aMsgHdr) {
  EnigmailLog.DEBUG("filters.jsm: processIncomingMail()\n");

  let inputStream = EnigmailStreams.newStringStreamListener(msgData => {
    let opt = {
      strformat: "unicode",
      bodyformat: "decode"
    };

    try {
      let e = new JsmimeEmitter(requireBody);
      let p = new jsmime.MimeParser(e, opt);
      p.deliverData(msgData);


      for (let c of consumerList) {
        try {
          c.consumeMessage(e.getMimeTree(), msgData, aMsgHdr);
        }
        catch (ex) {
          EnigmailLog.DEBUG("filters.jsm: processIncomingMail: exception: " + ex.toString() + "\n");
        }
      }
    }
    catch (ex) {}
  });

  try {
    let channel = EnigmailStreams.createChannel(url);
    channel.asyncOpen(inputStream, null);
  }
  catch (e) {
    EnigmailLog.DEBUG("filters.jsm: processIncomingMail: open stream exception " + e.toString() + "\n");
  }
}

function getRequireMessageProcessing(aMsgHdr) {
  let isInbox = aMsgHdr.folder.getFlag(Ci.nsMsgFolderFlags.CheckNew) || aMsgHdr.folder.getFlag(Ci.nsMsgFolderFlags.Inbox);
  let requireBody = false;
  let inboxOnly = true;
  let selfSentOnly = false;
  let processReadMail = false;

  for (let c of consumerList) {
    if (!c.incomingMailOnly) {
      inboxOnly = false;
    }
    if (!c.unreadOnly) {
      processReadMail = true;
    }
    if (!c.headersOnly) {
      requireBody = true;
    }
    if (c.selfSentOnly) {
      selfSentOnly = true;
    }
  }

  if (!processReadMail && aMsgHdr.isRead) return null;
  if (inboxOnly && !isInbox) return null;
  if (selfSentOnly) {
    let sender = EnigmailFuncs.parseEmails(aMsgHdr.author, true);
    let id = null;
    if (sender && sender[0]) {
      id = getIdentityForSender(sender[0].email, aMsgHdr.folder.server);
    }

    if (!id) return null;
  }

  EnigmailLog.DEBUG("filters.jsm: getRequireMessageProcessing: author: " + aMsgHdr.author + "\n");

  let u = EnigmailCompat.getUrlFromUriSpec(aMsgHdr.folder.getUriForMsg(aMsgHdr));

  if (! u) {
    return null;
  }

  let op = (u.spec.indexOf("?") > 0 ? "&" : "?");
  let url = u.spec + op + "header=enigmailFilter";

  return {
    url: url,
    requireBody: requireBody
  };
}

const newMailListener = {
  msgAdded: function(aMsgHdr) {
    EnigmailLog.DEBUG("filters.jsm: newMailListener.msgAdded() - got new mail in " + aMsgHdr.folder.prettiestName + "\n");

    if (consumerList.length === 0) return;

    let ret = getRequireMessageProcessing(aMsgHdr);
    if (ret) {
      processIncomingMail(ret.url, ret.requireBody, aMsgHdr);
    }
  }
};

/**
  messageStructure - Object:
    - partNum: String                       - MIME part number
    - headers: Object(nsIStructuredHeaders) - MIME part headers
    - body: String or typedarray            - the body part
    - parent: Object(messageStructure)      - link to the parent part
    - subParts: Array of Object(messageStructure) - array of the sub-parts
 */

var EnigmailFilters = {
  onStartup: function() {
    let filterService = Cc["@mozilla.org/messenger/services/filters;1"].getService(Ci.nsIMsgFilterService);
    filterService.addCustomTerm(filterTermPGPEncrypted);
    if (EnigmailCompat.isAtLeastTb68()) {
      initNewMailListener();
    }
  },

  onShutdown: function() {
    shutdownNewMailListener();
  },

  /**
   * add a new consumer to listen to new mails
   *
   * @param consumer - Object
   *   - headersOnly:      Boolean - needs full message body? [FUTURE]
   *   - incomingMailOnly: Boolean - only work on folder(s) that obtain new mail
   *                                  (Inbox and folders that listen to new mail)
   *   - unreadOnly:       Boolean - only process unread mails
   *   - selfSentOnly:     Boolean - only process mails with sender Email == Account Email
   *  - consumeMessage: function(messageStructure, rawMessageData, nsIMsgHdr)
   */
  addNewMailConsumer: function(consumer) {
    EnigmailLog.DEBUG("filters.jsm: addNewMailConsumer()\n");
    consumerList.push(consumer);
  },

  removeNewMailConsumer: function(consumer) {

  },

  moveDecrypt: filterActionMoveDecrypt,
  copyDecrypt: filterActionCopyDecrypt,
  encrypt: filterActionEncrypt
};
