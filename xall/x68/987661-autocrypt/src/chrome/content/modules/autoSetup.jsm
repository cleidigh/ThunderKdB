/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/*eslint no-loop-func: 0*/

/**
 *  Module to determine the type of setup of the user, based on existing emails
 *  found in the inbox
 */

var EXPORTED_SYMBOLS = ["AutocryptAutoSetup"];

const AutocryptLog = ChromeUtils.import("chrome://autocrypt/content/modules/log.jsm").AutocryptLog;
const AutocryptLocale = ChromeUtils.import("chrome://autocrypt/content/modules/locale.jsm").AutocryptLocale;
const AutocryptAutocrypt = ChromeUtils.import("chrome://autocrypt/content/modules/autocrypt.jsm").AutocryptAutocrypt;
const AutocryptFuncs = ChromeUtils.import("chrome://autocrypt/content/modules/funcs.jsm").AutocryptFuncs;
const AutocryptWindows = ChromeUtils.import("chrome://autocrypt/content/modules/windows.jsm").AutocryptWindows;
const AutocryptDialog = ChromeUtils.import("chrome://autocrypt/content/modules/dialog.jsm").AutocryptDialog;
const AutocryptConstants = ChromeUtils.import("chrome://autocrypt/content/modules/constants.jsm").AutocryptConstants;
const AutocryptKeyRing = ChromeUtils.import("chrome://autocrypt/content/modules/keyRing.jsm").AutocryptKeyRing;
const AutocryptMime = ChromeUtils.import("chrome://autocrypt/content/modules/mime.jsm").AutocryptMime;
const AutocryptTb60Compat = ChromeUtils.import("chrome://autocrypt/content/modules/tb60compat.jsm").AutocryptTb60Compat;
const jsmime = ChromeUtils.import("resource:///modules/jsmime.jsm").jsmime;
const AutocryptTimer = ChromeUtils.import("chrome://autocrypt/content/modules/timer.jsm").AutocryptTimer;
const AutocryptStreams = ChromeUtils.import("chrome://autocrypt/content/modules/streams.jsm").AutocryptStreams;

// Interfaces
const nsIFolderLookupService = Ci.nsIFolderLookupService;
const nsIMsgAccountManager = Ci.nsIMsgAccountManager;
const nsIMsgAccount = Ci.nsIMsgAccount;
const nsIMsgDBHdr = Ci.nsIMsgDBHdr;
const nsIMessenger = Ci.nsIMessenger;
const nsIMsgMessageService = Ci.nsIMsgMessageService;
const nsIMsgFolder = Ci.nsIMsgFolder;

/**
 * the determined setup type
 */
var gDeterminedSetupType = {
  value: AutocryptConstants.AUTOSETUP_NOT_INITIALIZED
};

var AutocryptAutoSetup = {

  getDeterminedSetupType: async function() {
    if (gDeterminedSetupType.value === AutocryptConstants.AUTOSETUP_NOT_INITIALIZED) {
      return await this.determinePreviousInstallType();
    }
    else
      return gDeterminedSetupType;
  },

  /**
   * Identify which type of setup the user had before Autocrypt was (re-)installed
   *
   * @return Promise<Object> with:
   *   - value : For each case assigned value, see AutocryptConstants.AUTOSETUP_xxx values
   *   - acSetupMessage {nsIMsgDBHdr}  in case value === 1
   *   - msgHeaders {Object}           in case value === 2
   */
  determinePreviousInstallType: function() {
    let self = this;
    gDeterminedSetupType = {
      value: AutocryptConstants.AUTOSETUP_NOT_INITIALIZED
    };

    return new Promise(async (resolve, reject) => {
      AutocryptLog.DEBUG("autoSetup.jsm: determinePreviousInstallType()\n");

      let msgAccountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(nsIMsgAccountManager);
      let folderService = Cc["@mozilla.org/mail/folder-lookup;1"].getService(nsIFolderLookupService);
      let returnMsgValue = {
        value: AutocryptConstants.AUTOSETUP_NO_HEADER
      };

      var accounts = msgAccountManager.accounts;

      let msgHeaders = [];
      let autocryptSetupMessage = {};

      // If no account, except Local Folders is configured
      if (accounts.length <= 1) {
        gDeterminedSetupType.value = AutocryptConstants.AUTOSETUP_NO_ACCOUNT;
        resolve(gDeterminedSetupType);
        return;
      }

      // Iterate through each account

      for (var i = 0; i < accounts.length; i++) {
        var account = accounts.queryElementAt(i, Ci.nsIMsgAccount);
        var accountMsgServer = account.incomingServer;
        AutocryptLog.DEBUG(`autoSetup.jsm: determinePreviousInstallType: scanning account "${accountMsgServer.prettyName}"\n`);

        let msgFolderArr = [];

        try {
          getMsgFolders(account.incomingServer.rootFolder, msgFolderArr);
        }
        catch (e) {
          AutocryptLog.DEBUG("autoSetup.jsm: determinePreviousInstallType: Error: " + e + "\n");
        }

        if (account.incomingServer.type.search(/^(none|nntp)$/) === 0) {
          // ignore NNTP accounts and "Local Folders" accounts
          continue;
        }

        // Iterating through each non empty Folder Database in the Account

        for (var k = 0; k < msgFolderArr.length; k++) {
          let msgFolder = msgFolderArr[k];
          let msgDatabase = msgFolderArr[k].msgDatabase;

          if ((msgFolder.flags & Ci.nsMsgFolderFlags.Junk) ||
            (msgFolder.flags & Ci.nsMsgFolderFlags.Trash) ||
            (!account.defaultIdentity)) {
            continue;
          }

          AutocryptLog.DEBUG(`autoSetup.jsm: determinePreviousInstallType: scanning folder "${msgFolder.name}"\n`);

          let msgEnumerator = msgDatabase.ReverseEnumerateMessages();

          // Iterating through each message in the Folder
          while (msgEnumerator.hasMoreElements()) {
            let msgHeader = msgEnumerator.getNext().QueryInterface(nsIMsgDBHdr);
            let msgURI = msgFolder.getUriForMsg(msgHeader);

            let msgAuthor = "";
            try {
              msgAuthor = AutocryptFuncs.stripEmail(msgHeader.author);
            }
            catch (x) {}

            // Listing all the headers in the message

            let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(nsIMessenger);
            let mms = messenger.messageServiceFromURI(msgURI).QueryInterface(nsIMsgMessageService);

            let headerObj = await getStreamedHeaders(msgURI, mms);

            let checkHeaderValues = await checkHeaders(headerObj, msgHeader, msgAuthor, account.defaultIdentity.email, msgFolder, returnMsgValue, msgHeaders);

            msgHeaders = checkHeaderValues.msgHeaders;
            returnMsgValue = checkHeaderValues.returnMsgValue;

            const currDateInSeconds = getCurrentTime();
            const diffSecond = currDateInSeconds - msgHeader.dateInSeconds;

            /**
                2592000 = No. of Seconds in a Month.
                This is to ignore 1 month old messages.
            */
            if (diffSecond > 2592000.0) {
              break;
            }
          }

        }

      }

      if (returnMsgValue.acSetupMessage) {
        AutocryptLog.DEBUG(`autoSetup.jsm: determinePreviousInstallType: found AC-Setup message\n`);
        gDeterminedSetupType = returnMsgValue;
        resolve(gDeterminedSetupType);
      }
      else {
        AutocryptLog.DEBUG(`msgHeaders.length: ${msgHeaders.length}\n`);

        // find newest message to know the protocol
        let latestMsg = null;
        for (let i = 0; i < msgHeaders.length; i++) {
          if (!latestMsg) {
            latestMsg = msgHeaders[i];
          }

          if (msgHeaders[i].dateTime > latestMsg.dateTime) {
            latestMsg = msgHeaders[i];
          }
        }

        if (latestMsg) {
          if (latestMsg.msgType === "Autocrypt") {
            returnMsgValue.value = AutocryptConstants.AUTOSETUP_AC_HEADER;
            returnMsgValue.msgHeaders = msgHeaders;
          }
          else {
            returnMsgValue.value = AutocryptConstants.AUTOSETUP_ENCRYPTED_MSG;
            returnMsgValue.msgHeaders = msgHeaders;
          }
        }

        if (msgAccountManager.defaultAccount) {
          returnMsgValue.userName = msgAccountManager.defaultAccount.defaultIdentity.fullName;
          returnMsgValue.userEmail = msgAccountManager.defaultAccount.defaultIdentity.email;
        }
        else {
          returnMsgValue.userName = undefined;
          returnMsgValue.userEmail = undefined;
        }

        gDeterminedSetupType = returnMsgValue;
        AutocryptLog.DEBUG(`autoSetup.jsm: determinePreviousInstallType: found type: ${returnMsgValue.value}\n`);
        resolve(returnMsgValue);
      }
    });

  },

  /**
   * Process the Autocrypt Setup Message
   *
   * @param {Object} headerValue: contains header and attachment of an Autocrypt Setup Message
   * @param {nsIWindow} passwordWindow: parent window for password dialog
   * @param {nsIWindow} confirmWindow:  parent window for confirmation dialog
   *        (note: split into 2 parent windows for unit tests)
   *
   * @return {Promise<Number>}: Import result.
   *                  1: imported OK
   *                  0: no Autocrypt setup message
   *                 -1: import not OK (wrong password, canceled etc.)
   */

  performAutocryptSetup: async function(headerValue, passwordWindow = null, confirmWindow = null) {
    AutocryptLog.DEBUG("autoSetup.jsm: performAutocryptSetup()\n");

    let imported = 0;
    if (headerValue.attachment.contentType.search(/^application\/autocrypt-setup$/i) === 0) {
      try {
        let res = await AutocryptAutocrypt.getSetupMessageData(headerValue.attachment.url);
        let passwd = AutocryptWindows.autocryptSetupPasswd(passwordWindow, "input", res.passphraseFormat, res.passphraseHint);

        if ((!passwd) || passwd == "") {
          throw "noPasswd";
        }

        await AutocryptAutocrypt.handleBackupMessage(passwd, res.attachmentData, headerValue.acSetupMessage.author);
        AutocryptDialog.info(confirmWindow, AutocryptLocale.getString("autocrypt.importSetupKey.success", headerValue.acSetupMessage.author));
        imported = 1;
      }
      catch (err) {
        AutocryptLog.DEBUG("autoSetup.jsm: performAutocryptSetup got cancel status=" + err + "\n");
        imported = -1;

        switch (err) {
          case "getSetupMessageData":
            AutocryptDialog.alert(confirmWindow, AutocryptLocale.getString("autocrypt.importSetupKey.invalidMessage"));
            break;
          case "wrongPasswd":
            if (AutocryptDialog.confirmDlg(confirmWindow, AutocryptLocale.getString("autocrypt.importSetupKey.wrongPasswd"), AutocryptLocale.getString("dlg.button.retry"),
                AutocryptLocale.getString("dlg.button.cancel"))) {
              AutocryptAutoSetup.performAutocryptSetup(headerValue);
            }
            break;
          case "keyImportFailed":
            AutocryptDialog.alert(confirmWindow, AutocryptLocale.getString("autocrypt.importSetupKey.invalidKey"));
            break;
          default:
            AutocryptDialog.alert(confirmWindow, AutocryptLocale.getString("keyserver.error.unknown"));
        }
      }
    }

    return imported;
  },

  /**
   * Process accounts with Autocrypt headers
   *
   * @param {Object} setupType: containing Autocrypt headers from accounts
   *
   * @return {Promise<Number>}: Result: 0: OK / 1: failure
   */

  processAutocryptHeader: function(setupType) {
    AutocryptLog.DEBUG("autoSetup.jsm: processAutocryptHeader()\n");

    return new Promise(async (resolve, reject) => {

      // find newest message to know the protocol
      let latestMsg = null;
      for (let i = 0; i < setupType.msgHeaders.length; i++) {
        if (!latestMsg) {
          latestMsg = setupType.msgHeaders[i];
        }

        if (setupType.msgHeaders[i].dateTime > latestMsg) {
          latestMsg = setupType.msgHeaders[i];
        }
      }

      let sysType = latestMsg.msgType;
      AutocryptLog.DEBUG(`autoSetup.jsm: processAutocryptHeader: got type: ${sysType}\n`);


      for (let i = 0; i < setupType.msgHeaders.length; i++) {
        if (setupType.msgHeaders[i].msgType === "Autocrypt") {
          // FIXME
          let success = await AutocryptAutocrypt.processAutocryptHeader(setupType.msgHeaders[i].fromAddr, [setupType.msgHeaders[i].msgData],
            setupType.msgHeaders[i].date);
          if (success !== 0) {
            resolve(1);
          }
        }
      }
      resolve(0);
    });
  },

  /**
   * Create a new autocrypt key for every configured account and configure the account
   * to use that key. The keys are not protected by a password.
   *
   * The creation is done in the background after waiting timeoutValue ms
   * @param {Number} timeoutValue: number of miliseconds to wait before starting
   *                               the process
   */
  createKeyForAllAccounts: function(timeoutValue = 1000) {
    AutocryptLog.DEBUG("autoSetup.jsm: createKeyForAllAccounts()\n");
    let self = this;

    AutocryptTimer.setTimeout(async function _f() {
      let msgAccountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(nsIMsgAccountManager);
      let accounts = msgAccountManager.accounts;
      let createdKeys = [];

      for (let i = 0; i < accounts.length; i++) {
        let account = accounts.queryElementAt(i, Ci.nsIMsgAccount);
        let id = account.defaultIdentity;

        if (id && id.email) {
          let keyId = await self.createAutocryptKey(id.fullName, id.email);
          AutocryptLog.DEBUG(`autoSetup.jsm: createKeyForAllAccounts: created key ${keyId}\n`);
          if (keyId) {
            let keyObj = AutocryptKeyRing.getKeyById(keyId);
            if (keyObj) createdKeys.push(keyObj);
            id.setBoolAttribute("enablePgp", true);
            id.setCharAttribute("pgpkeyId", keyId);
            id.setIntAttribute("pgpKeyMode", 1);
            id.setBoolAttribute("pgpMimeMode", true);
            id.setBoolAttribute("pgpSignEncrypted", true);
          }
        }
      }

      // upload created keys to WKD (if possible)
    }, timeoutValue);
  },

  /**
   * Create a new autocrypt-complinant key
   * The keys will not be protected by passwords.
   *
   * @param {String} userName:  Display name
   * @param {String} userEmail: Email address
   *
   * @return {Promise<Boolean>}: Success (true = successful)
   */
  createAutocryptKey: function(userName, userEmail) {
    return new Promise((resolve, reject) => {
      AutocryptLog.DEBUG("autoSetup.jsm: createAutocryptKey()\n");

      let keyType = "ECC",
        keyLength = 0;

      let expiry = 1825, // 5 years
        passphrase = "",
        generateObserver = {
          keyId: null,
          backupLocation: null,
          _state: 0,

          onDataAvailable: function(data) {},
          onStopRequest: function(exitCode) {
            AutocryptLog.DEBUG("autoSetup.jsm: createAutocryptKey(): key generation complete\n");
            resolve(generateObserver.keyId);
          }
        };

      try {
        let keygenRequest = AutocryptKeyRing.generateKey(userName, "", userEmail, expiry, keyLength, keyType, passphrase, generateObserver);
      }
      catch (ex) {
        AutocryptLog.DEBUG("autoSetup.jsm: createAutocryptKey: error: " + ex.message);
        resolve(null);
      }
    });
  },

  /**
   * Configure Autocrypt to use existing keys
   */
  applyExistingKeys: function() {
    let msgAccountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(nsIMsgAccountManager);
    let identities = msgAccountManager.allIdentities;

    for (let i = 0; i < identities.length; i++) {
      let id = identities.queryElementAt(i, Ci.nsIMsgIdentity);

      if (id && id.email) {
        let keyObj = AutocryptKeyRing.getSecretKeyByEmail(id.email);
        if (keyObj) {
          AutocryptLog.DEBUG(`autoSetup.jsm: applyExistingKeys: found key ${keyObj.keyId}\n`);
          id.setBoolAttribute("enablePgp", true);
          id.setCharAttribute("pgpkeyId", "0x" + keyObj.fpr);
          id.setIntAttribute("pgpKeyMode", 1);
          id.setBoolAttribute("pgpMimeMode", true);
          id.setBoolAttribute("pgpSignEncrypted", true);
        }
      }
    }
  }
};


/**
 * Recusrively go through all folders to get a flat array of all sub-folders
 * starting with a parent folder.
 *
 * @param {nsIMsgFolder} folder:       the folder to scan
 * @param {nsIMsgFolder} msgFolderArr: An array to be filled with all folders that contain messages
 */

function getMsgFolders(folder, msgFolderArr) {
  if (folder.getTotalMessages(false) > 0) {
    msgFolderArr.push(folder);
  }

  // add all subfolders
  if (folder.hasSubFolders) {
    let subFolders = folder.subFolders;
    while (subFolders.hasMoreElements()) {
      getMsgFolders(subFolders.getNext().QueryInterface(nsIMsgFolder), msgFolderArr);
    }
  }
}

// Util Function for Extracting manually added Headers
function streamListener(callback) {
  let streamListener = {
    mAttachments: [],
    mHeaders: [],
    mBusy: true,

    onStartRequest: function(aRequest) {
      this.mAttachments = [];
      this.mHeaders = [];
      this.mBusy = true;

      var channel = aRequest.QueryInterface(Components.interfaces.nsIChannel);
      channel.URI.QueryInterface(Components.interfaces.nsIMsgMailNewsUrl);
      channel.URI.msgHeaderSink = this; // adds this header sink interface to the channel
    },
    onStopRequest: function(aRequest, aStatusCode) {
      callback();
      this.mBusy = false; // if needed, you can poll this var to see if we are done collecting attachment details
    },
    onDataAvailable: function(aRequest, aInputStream, aOffset, aCount) {},
    onStartHeaders: function() {},
    onEndHeaders: function() {},
    processHeaders: function(aHeaderNameEnumerator, aHeaderValueEnumerator, aDontCollectAddress) {
      while (aHeaderNameEnumerator.hasMore()) {
        this.mHeaders.push({
          name: aHeaderNameEnumerator.getNext().toLowerCase(),
          value: aHeaderValueEnumerator.getNext()
        });
      }
    },
    handleAttachment: function(aContentType, aUrl, aDisplayName, aUri, aIsExternalAttachment) {
      if (aContentType == "text/html") {
        return;
      }
      this.mAttachments.push({
        contentType: aContentType,
        url: aUrl,
        displayName: aDisplayName,
        uri: aUri,
        isExternal: aIsExternalAttachment
      });
    },
    onEndAllAttachments: function() {},
    onEndMsgDownload: function(aUrl) {},
    onEndMsgHeaders: function(aUrl) {},
    onMsgHasRemoteContent: function(aMsgHdr) {},
    getSecurityInfo: function() {},
    setSecurityInfo: function(aSecurityInfo) {},
    getDummyMsgHeader: function() {},

    QueryInterface: function(aIID) {
      if (aIID.equals(Components.interfaces.nsIStreamListener) ||
        aIID.equals(Components.interfaces.nsIMsgHeaderSink) ||
        aIID.equals(Components.interfaces.nsISupports)) {
        return this;
      }

      throw Components.results.NS_NOINTERFACE;
    }
  };

  return streamListener;
}

function getStreamedMessage(msgFolder, msgHeader) {
  return new Promise((resolve, reject) => {
    let msgURI = msgFolder.getUriForMsg(msgHeader);
    var listener = streamListener(() => {
      resolve(listener.mAttachments[0]);
    });
    let messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(nsIMessenger);
    let mms = messenger.messageServiceFromURI(msgURI).QueryInterface(nsIMsgMessageService);
    mms.streamMessage(msgURI, listener, null, null, true, "filter");
  });
}

function checkHeaders(headerObj, msgHeader, msgAuthor, accountEmail, msgFolder, returnMsgValue, msgHeaders) {
  return new Promise(async (resolve, reject) => {
    if (headerObj['autocrypt-setup-message'] && msgHeader.author == msgHeader.recipients) {

      // To extract Attachement for Autocrypt Setup Message

      returnMsgValue.attachment = await getStreamedMessage(msgFolder, msgHeader);

      if (!returnMsgValue.acSetupMessage) {
        returnMsgValue.value = 1;
        returnMsgValue.acSetupMessage = msgHeader;
      }
      else if (returnMsgValue.acSetupMessage.date < msgHeader.date) {
        returnMsgValue.acSetupMessage = msgHeader;
      }

    }
    else if (msgAuthor == accountEmail &&
      (("autocrypt" in headerObj) ||
        ("x-pep-version" in headerObj))) {

      let msgType = ("x-pep-version" in headerObj) ? "pEp" : "Autocrypt";

      let fromHeaderExist = null;
      for (let j = 0; j < msgHeaders.length; j++) {
        if (msgHeaders[j].fromAddr == msgAuthor) {
          fromHeaderExist = msgHeaders[j];
          break;
        }
      }

      if (fromHeaderExist === null) {
        let dateTime = new Date(0);
        try {
          dateTime = jsmime.headerparser.parseDateHeader(headerObj.date);
        }
        catch (x) {}

        let addHeader = {
          fromAddr: msgAuthor,
          msgType: msgType,
          msgData: headerObj.autocrypt,
          date: headerObj.date,
          dateTime: dateTime
        };
        msgHeaders.push(addHeader);
      }
      else {
        let dateTime = new Date(0);
        try {
          dateTime = jsmime.headerparser.parseDateHeader(headerObj.date);
        }
        catch (x) {}
        if (dateTime > fromHeaderExist.dateTime) {
          fromHeaderExist.msgData = headerObj.autocrypt;
          fromHeaderExist.date = headerObj.date;
          fromHeaderExist.msgType = msgType;
          fromHeaderExist.dateTime = dateTime;
        }
      }
    }

    resolve({
      'returnMsgValue': returnMsgValue,
      'msgHeaders': msgHeaders
    });
  });
}

function getStreamedHeaders(msgURI, mms) {

  return new Promise((resolve, reject) => {
    let headers = Cc["@mozilla.org/messenger/mimeheaders;1"].createInstance(Ci.nsIMimeHeaders);
    let headerObj = {};
    try {
      mms.streamHeaders(msgURI, AutocryptStreams.newStringStreamListener(aRawString => {
        try {
          //AutocryptLog.DEBUG(`getStreamedHeaders: ${aRawString}\n`);
          headers.initialize(aRawString);

          let i = headers.headerNames;
          while (i.hasMore()) {
            let hdrName = i.getNext().toLowerCase();

            let hdrValue = headers.extractHeader(hdrName, true);
            headerObj[hdrName] = hdrValue;
          }

          if ("autocrypt" in headerObj) {
            let acHeader = headers.extractHeader("autocrypt", false);
            acHeader = acHeader.replace(/keydata=/i, 'keydata="') + '"';

            let paramArr = AutocryptMime.getAllParameters(acHeader);
            paramArr.keydata = paramArr.keydata.replace(/[\r\n\t ]/g, "");

            headerObj.autocrypt = "";
            for (i in paramArr) {
              if (headerObj.autocrypt.length > 0) {
                headerObj.autocrypt += "; ";
              }
              headerObj.autocrypt += `${i}="${paramArr[i]}"`;
            }
          }
        }
        catch (e) {
          reject({});
          AutocryptLog.DEBUG("autoSetup.jsm: getStreamedHeaders: Error: " + e + "\n");
        }
        resolve(headerObj);
      }), null, false);
    }
    catch (e) {
      reject({});
      AutocryptLog.DEBUG("autoSetup.jsm: getStreamedHeaders: Error: " + e + "\n");
    }
  });
}


function getCurrentTime() {
  return new Date().getTime() / 1000;
}
