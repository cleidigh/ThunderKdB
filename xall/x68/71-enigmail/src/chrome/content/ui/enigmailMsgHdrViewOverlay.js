/*global EnigmailWindows: false, EnigmailLocale: false, EnigmailPrefs: false, EnigmailTime: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */


"use strict";

/* Globals from Thunderbird: */
/* global gFolderDisplay: false, currentAttachments: false, gSMIMEContainer: false, gSignedUINode: false, gEncryptedUINode: false */
/* global gDBView: false, msgWindow: false, messageHeaderSink: false, gMessageListeners: false, findEmailNodeFromPopupNode: true */
/* global gExpandedHeaderView: false, CanDetachAttachments: true, gEncryptedURIService: false, FillAttachmentListPopup: false */
/* global attachmentList: false, MailOfflineMgr: false, currentHeaderData: false, ContentTypeIsSMIME: false */

var EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
var EnigmailFuncs = ChromeUtils.import("chrome://enigmail/content/modules/funcs.jsm").EnigmailFuncs;
var EnigmailVerify = ChromeUtils.import("chrome://enigmail/content/modules/mimeVerify.jsm").EnigmailVerify;
var EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
var EnigmailPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
var EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
var EnigmailWindows = ChromeUtils.import("chrome://enigmail/content/modules/windows.jsm").EnigmailWindows;
var EnigmailDialog = ChromeUtils.import("chrome://enigmail/content/modules/dialog.jsm").EnigmailDialog;
var EnigmailTime = ChromeUtils.import("chrome://enigmail/content/modules/time.jsm").EnigmailTime;
var EnigmailGpg = ChromeUtils.import("chrome://enigmail/content/modules/gpg.jsm").EnigmailGpg;
var EnigmailKey = ChromeUtils.import("chrome://enigmail/content/modules/key.jsm").EnigmailKey;
var EnigmailKeyRing = ChromeUtils.import("chrome://enigmail/content/modules/keyRing.jsm").EnigmailKeyRing;
var EnigmailURIs = ChromeUtils.import("chrome://enigmail/content/modules/uris.jsm").EnigmailURIs;
var EnigmailConstants = ChromeUtils.import("chrome://enigmail/content/modules/constants.jsm").EnigmailConstants;
var EnigmailData = ChromeUtils.import("chrome://enigmail/content/modules/data.jsm").EnigmailData;
var EnigmailClipboard = ChromeUtils.import("chrome://enigmail/content/modules/clipboard.jsm").EnigmailClipboard;
var EnigmailPEPAdapter = ChromeUtils.import("chrome://enigmail/content/modules/pEpAdapter.jsm").EnigmailPEPAdapter;
var EnigmailStdlib = ChromeUtils.import("chrome://enigmail/content/modules/stdlib.jsm").EnigmailStdlib;
var EnigmailWks = ChromeUtils.import("chrome://enigmail/content/modules/webKey.jsm").EnigmailWks;
var EnigmailMime = ChromeUtils.import("chrome://enigmail/content/modules/mime.jsm").EnigmailMime;
var EnigmailMsgRead = ChromeUtils.import("chrome://enigmail/content/modules/msgRead.jsm").EnigmailMsgRead;
var EnigmailSingletons = ChromeUtils.import("chrome://enigmail/content/modules/singletons.jsm").EnigmailSingletons;
var EnigmailAutocrypt = ChromeUtils.import("chrome://enigmail/content/modules/autocrypt.jsm").EnigmailAutocrypt;
var EnigmailCompat = ChromeUtils.import("chrome://enigmail/content/modules/compat.jsm").EnigmailCompat;

if (!Enigmail) var Enigmail = {};

Enigmail.hdrView = {

  statusBar: null,
  enigmailBox: null,
  lastEncryptedMsgKey: null,
  lastEncryptedUri: null,
  pEpStatus: null,
  flexbuttonAction: null,


  hdrViewLoad: function() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.hdrViewLoad\n");

    // THE FOLLOWING OVERRIDES CODE IN msgHdrViewOverlay.js
    // which wouldn't work otherwise

    this.origCanDetachAttachments = CanDetachAttachments;
    CanDetachAttachments = function() {
      return Enigmail.hdrView.origCanDetachAttachments() && Enigmail.hdrView.enigCanDetachAttachments();
    };

    this.msgHdrViewLoad();

    // Override SMIME ui
    let signedHdrElement = document.getElementById("signedHdrIcon");
    if (signedHdrElement) {
      signedHdrElement.setAttribute("onclick", "Enigmail.msg.viewSecurityInfo(event, true);");
    }

    let encryptedHdrElement = document.getElementById("encryptedHdrIcon");
    if (encryptedHdrElement) {
      encryptedHdrElement.setAttribute("onclick", "Enigmail.msg.viewSecurityInfo(event, true);");
    }

    if (EnigmailCompat.isPostbox()) {
      document.getElementById("messagepane").addEventListener('click', Enigmail.hdrView.postboxMessagePaneOnClick, true);
      /* global pbSmimeMessagePaneOnClick: false */
      document.getElementById("messagepane").removeEventListener('click', pbSmimeMessagePaneOnClick, true);
    }
    this.statusBar = document.getElementById("enigmail-status-bar");
    this.enigmailBox = document.getElementById("enigmailBox");
    this.pEpBox = document.getElementById("enigmail-pEp-bc");

    let addrPopup = document.getElementById("emailAddressPopup");
    if (addrPopup) {
      addrPopup.addEventListener("popupshowing", Enigmail.hdrView.displayAddressPopup.bind(addrPopup), false);
    }

    // Thunderbird
    let attCtx = document.getElementById("attachmentItemContext");
    if (attCtx) {
      attCtx.addEventListener("popupshowing", this.onShowAttachmentContextMenu.bind(Enigmail.hdrView), false);
    }

    // Postbox
    attCtx = document.getElementById("msgPaneAttachmentContextMenu");
    if (attCtx) {
      attCtx.addEventListener("popupshowing", function _f(event) {
        Enigmail.hdrView.onShowAttachmentContextMenu(event);
      }, false);
    }
  },

  postboxMessagePaneOnClick: function(event) {
    let targetClassName = event.originalTarget.className;
    if (/hdr-signed-button/.test(targetClassName) || /hdr-encrypted-button/.test(targetClassName)) {
      Enigmail.msg.viewSecurityInfo(event, true);
      event.preventDefault();
    }
    else if (/quick-reply-button/.test(targetClassName)) {
      Enigmail.hdrView.postboxHandleQuickReplyButton(event);
    }
    else if (/load-remote-button/.test(targetClassName)) {
      let node = event.originalTarget;
      while (node.parentNode) {
        if (node.id === "enigmailFlexActionButton") {
          Enigmail.hdrView.handlePostboxFlexEvent(event);
          return;
        }
        node = node.parentNode;
      }
    }
  },

  displayAddressPopup: function(event) {
    let target = event.target;
    if (EnigmailPEPAdapter.usingPep()) {
      let adr = findEmailNodeFromPopupNode(document.popupNode, 'emailAddressPopup');
      if (adr) {
        Enigmail.hdrView.setPepVerifyFunction(adr);
      }
    }
    EnigmailFuncs.collapseAdvanced(target, 'hidden');
  },

  statusBarHide: function() {
    function resetPepColors(textNode) {
      let nodes = textNode.getElementsByTagName("mail-emailaddress");
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].setAttribute("class", "");
      }
    }

    try {
      this.statusBar.removeAttribute("signed");
      this.statusBar.removeAttribute("encrypted");
      this.enigmailBox.setAttribute("collapsed", "true");
      this.pEpBox.setAttribute("collapsed", "true");

      resetPepColors(gExpandedHeaderView.from.textNode);
      resetPepColors(gExpandedHeaderView.to.textNode);
      resetPepColors(gExpandedHeaderView.cc.textNode);
      resetPepColors(gExpandedHeaderView["reply-to"].textNode);
      Enigmail.msg.setAttachmentReveal(null);
      if (Enigmail.msg.securityInfo) {
        Enigmail.msg.securityInfo.statusFlags = 0;
        Enigmail.msg.securityInfo.msgSigned = 0;
        Enigmail.msg.securityInfo.msgEncrypted = 0;
      }

      let enigMsgPane = document.getElementById("enigmailMsgDisplay");
      let bodyElement = document.getElementById("messagepane");
      enigMsgPane.setAttribute("collapsed", true);
      bodyElement.removeAttribute("collapsed");
    }
    catch (ex) {}
  },

  setStatusText: function(txt) {
    let s = document.getElementById("enigmailStatusText");
    if (s) {
      s.firstChild.data = txt;
    }
  },

  updateHdrIcons: function(exitCode, statusFlags, keyId, userId, sigDetails, errorMsg, blockSeparation, encToDetails, xtraStatus, encMimePartNumber) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.updateHdrIcons: exitCode=" + exitCode + ", statusFlags=" + statusFlags + ", keyId=" + keyId + ", userId=" + userId + ", " + errorMsg +
      "\n");

    if (EnigmailPEPAdapter.usingPep()) return;

    if (Enigmail.msg.securityInfo && Enigmail.msg.securityInfo.xtraStatus && Enigmail.msg.securityInfo.xtraStatus === "wks-request") {
      return;
    }

    this.statusBar = document.getElementById("enigmail-status-bar");
    this.enigmailBox = document.getElementById("enigmailBox");

    if (gFolderDisplay.selectedMessageUris && gFolderDisplay.selectedMessageUris.length > 0) {
      this.lastEncryptedMsgKey = gFolderDisplay.selectedMessageUris[0];
    }

    if (!errorMsg)
      errorMsg = "";

    var replaceUid = null;
    if (!userId) {
      userId = "";
    }
    if (keyId && gFolderDisplay.selectedMessage) {
      replaceUid = EnigmailMsgRead.matchUidToSender(keyId, gFolderDisplay.selectedMessage);
    }

    if (!replaceUid) {
      replaceUid = userId.replace(/\n.*$/gm, "");
    }

    if (Enigmail.msg.savedHeaders && "x-pgp-encoding-format" in Enigmail.msg.savedHeaders &&
      (Enigmail.msg.savedHeaders["x-pgp-encoding-format"].search(/partitioned/i) === 0)) {
      if (currentAttachments && currentAttachments.length) {
        Enigmail.msg.setAttachmentReveal(currentAttachments);
      }
    }

    if (userId && replaceUid) {
      // no EnigConvertGpgToUnicode() here; strings are already UTF-8
      replaceUid = replaceUid.replace(/\\[xe]3a/gi, ":");
      errorMsg = errorMsg.replace(userId, replaceUid);
    }

    var errorLines = "";
    var fullStatusInfo = "";

    if (exitCode == EnigmailConstants.POSSIBLE_PGPMIME) {
      exitCode = 0;
    }
    else {
      if (errorMsg) {
        // no EnigConvertGpgToUnicode() here; strings are already UTF-8
        errorLines = errorMsg.split(/\r?\n/);
        fullStatusInfo = errorMsg;
      }
    }

    if (errorLines && (errorLines.length > 22)) {
      // Retain only first twenty lines and last two lines of error message
      var lastLines = errorLines[errorLines.length - 2] + "\n" +
        errorLines[errorLines.length - 1] + "\n";

      while (errorLines.length > 20)
        errorLines.pop();

      errorMsg = errorLines.join("\n") + "\n...\n" + lastLines;
    }

    var statusInfo = "";
    var statusLine = "";
    var statusArr = [];

    if (statusFlags & EnigmailConstants.NODATA) {
      if (statusFlags & EnigmailConstants.PGP_MIME_SIGNED)
        statusFlags |= EnigmailConstants.UNVERIFIED_SIGNATURE;

      if (statusFlags & EnigmailConstants.PGP_MIME_ENCRYPTED)
        statusFlags |= EnigmailConstants.DECRYPTION_INCOMPLETE;
    }

    // if (!(statusFlags & EnigmailConstants.PGP_MIME_ENCRYPTED)) {
    //   encMimePartNumber = "";
    // }

    if (!EnigmailPrefs.getPref("displayPartiallySigned")) {
      if ((statusFlags & (EnigmailConstants.PARTIALLY_PGP)) &&
        (statusFlags & (EnigmailConstants.BAD_SIGNATURE))) {
        statusFlags &= ~(EnigmailConstants.BAD_SIGNATURE | EnigmailConstants.PARTIALLY_PGP);
        if (statusFlags === 0) {
          errorMsg = "";
          fullStatusInfo = "";
        }
      }
    }

    var msgSigned = (statusFlags & (EnigmailConstants.BAD_SIGNATURE |
      EnigmailConstants.GOOD_SIGNATURE |
      EnigmailConstants.EXPIRED_KEY_SIGNATURE |
      EnigmailConstants.EXPIRED_SIGNATURE |
      EnigmailConstants.UNVERIFIED_SIGNATURE |
      EnigmailConstants.REVOKED_KEY |
      EnigmailConstants.EXPIRED_KEY_SIGNATURE |
      EnigmailConstants.EXPIRED_SIGNATURE));
    var msgEncrypted = (statusFlags & (EnigmailConstants.DECRYPTION_OKAY |
      EnigmailConstants.DECRYPTION_INCOMPLETE |
      EnigmailConstants.DECRYPTION_FAILED));

    if (msgSigned && (statusFlags & EnigmailConstants.IMPORTED_KEY)) {
      statusFlags &= (~EnigmailConstants.IMPORTED_KEY);
    }

    if (!(statusFlags & EnigmailConstants.DECRYPTION_FAILED) &&
      ((!(statusFlags & (EnigmailConstants.DECRYPTION_INCOMPLETE |
          EnigmailConstants.UNVERIFIED_SIGNATURE |
          EnigmailConstants.DECRYPTION_FAILED |
          EnigmailConstants.BAD_SIGNATURE))) ||
        (statusFlags & EnigmailConstants.DISPLAY_MESSAGE) &&
        !(statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE)) &&
      !(statusFlags & EnigmailConstants.IMPORTED_KEY)) {
      // normal exit / display message
      statusLine = errorMsg;
      statusInfo = statusLine;

      if (sigDetails) {
        var detailArr = sigDetails.split(/ /);

        let dateTime = EnigmailTime.getDateTime(detailArr[2], true, true);
        var txt = EnigmailLocale.getString("keyAndSigDate", [keyId, dateTime]);
        statusArr.push(txt);
        statusInfo += "\n" + txt;
        var fpr = "";
        if (detailArr.length >= 10) {
          fpr = EnigmailKey.formatFpr(detailArr[9]);
        }
        else {
          fpr = EnigmailKey.formatFpr(detailArr[0]);
        }
        if (fpr) {
          statusInfo += "\n" + EnigmailLocale.getString("keyFpr", [fpr]);
        }
        if (detailArr.length > 7) {
          var signingAlg = EnigmailGpg.signingAlgIdToString(detailArr[6]);
          var hashAlg = EnigmailGpg.hashAlgIdToString(detailArr[7]);

          statusInfo += "\n\n" + EnigmailLocale.getString("usedAlgorithms", [signingAlg, hashAlg]);
        }
      }
      fullStatusInfo = statusInfo;

    }
    else {
      // no normal exit / don't display message
      // - process failed decryptions first because they imply bad signature handling
      if (statusFlags & EnigmailConstants.BAD_PASSPHRASE) {
        statusInfo = EnigmailLocale.getString("badPhrase");
        statusLine = statusInfo + EnigmailLocale.getString("clickDecryptRetry");
      }
      else if (statusFlags & EnigmailConstants.DECRYPTION_FAILED) {
        if (statusFlags & EnigmailConstants.MISSING_MDC) {
          statusInfo = EnigmailLocale.getString("missingMdcError");
          statusLine = statusInfo;
        }
        else if (statusFlags & EnigmailConstants.MISSING_PASSPHRASE) {
          statusInfo = EnigmailLocale.getString("missingPassphrase");
          statusLine = statusInfo + EnigmailLocale.getString("clickDecryptRetry");
        }
        else if (statusFlags & EnigmailConstants.NO_SECKEY) {
          statusInfo = EnigmailLocale.getString("needKey");
        }
        else {
          statusInfo = EnigmailLocale.getString("failedDecrypt");
        }
        statusLine = statusInfo + EnigmailLocale.getString("clickDetailsButton");
      }
      else if (statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE) {
        statusInfo = EnigmailLocale.getString("unverifiedSig");
        if (keyId) {
          statusLine = statusInfo + EnigmailLocale.getString("clickImportButton");
        }
        else {
          statusLine = statusInfo + EnigmailLocale.getString("keyTypeUnsupported");
        }
      }
      else if (statusFlags & (EnigmailConstants.BAD_SIGNATURE |
          EnigmailConstants.EXPIRED_SIGNATURE |
          EnigmailConstants.EXPIRED_KEY_SIGNATURE)) {
        statusInfo = EnigmailLocale.getString("unverifiedSig");
        statusLine = statusInfo + EnigmailLocale.getString("clickDetailsButton");
      }
      else if (statusFlags & EnigmailConstants.DECRYPTION_INCOMPLETE) {
        statusInfo = EnigmailLocale.getString("incompleteDecrypt");
        statusLine = statusInfo + EnigmailLocale.getString("clickDetailsButton");
      }
      else if (statusFlags & EnigmailConstants.IMPORTED_KEY) {
        statusLine = "";
        statusInfo = "";
        EnigmailDialog.info(window, errorMsg);
      }
      else {
        // TODO: can we ever get to this point anymore?
        // FIXME: the viewInfo string is outdated
        statusInfo = EnigmailLocale.getString("failedDecryptVerify");
        statusLine = statusInfo + EnigmailLocale.getString("viewInfo");
      }
      // add key infos if available
      if (keyId) {
        var si = EnigmailLocale.getString("unverifiedSig"); // "Unverified signature"
        if (statusInfo === "") {
          statusInfo += si;
          statusLine = si + EnigmailLocale.getString("clickDetailsButton");
        }
        if (statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE) {
          statusInfo += "\n" + EnigmailLocale.getString("keyNeeded", [keyId]); // "public key ... needed"
        }
        else {
          statusInfo += "\n" + EnigmailLocale.getString("keyUsed", [keyId]); // "public key ... used"
        }
      }
      statusInfo += "\n\n" + errorMsg;
    }

    if (statusFlags & EnigmailConstants.DECRYPTION_OKAY ||
      (this.statusBar.getAttribute("encrypted") == "ok")) {
      var statusMsg;
      if (xtraStatus && xtraStatus == "buggyMailFormat") {
        statusMsg = EnigmailLocale.getString("decryptedMsgWithFormatError");
      }
      else {
        statusMsg = EnigmailLocale.getString("decryptedMsg");
      }
      if (!statusInfo) {
        statusInfo = statusMsg;
      }
      else {
        statusInfo = statusMsg + "\n" + statusInfo;
      }
      if (!statusLine) {
        statusLine = statusInfo;
      }
      else {
        statusLine = statusMsg + "; " + statusLine;
      }
    }

    if (EnigmailPrefs.getPref("displayPartiallySigned")) {
      if (statusFlags & EnigmailConstants.PARTIALLY_PGP) {
        if (msgSigned && msgEncrypted) {
          statusLine = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgSignedAndEnc")]);
          statusLine += EnigmailLocale.getString("clickDetailsButton");
          statusInfo = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgSigned")]) +
            "\n" + statusInfo;
        }
        else if (msgEncrypted) {
          statusLine = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgEncrypted")]);
          statusLine += EnigmailLocale.getString("clickDetailsButton");
          statusInfo = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgEncrypted")]) +
            "\n" + statusInfo;
        }
        else if (msgSigned) {
          if (statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE) {
            statusLine = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgSignedUnkownKey")]);
            if (keyId) {
              statusLine += EnigmailLocale.getString("clickImportButton");
            }
            else {
              statusLine += EnigmailLocale.getString("keyTypeUnsupported");
            }
          }
          else {
            statusLine = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgSigned")]);
            statusLine += EnigmailLocale.getString("clickDetailsButton");
          }
          statusInfo = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgSigned")]) +
            "\n" + statusInfo;
        }
      }
    }

    // if we have parsed ENC_TO entries, add them as status info
    if (encToDetails && encToDetails.length > 0) {
      statusInfo += "\n\n" + EnigmailLocale.getString("encryptKeysNote", [encToDetails]);
    }

    if (xtraStatus === "process-manually") {
      let buttonLabel = "";
      if (statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE) {
        statusLine = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgSigned")]);
        statusLine += EnigmailLocale.getString("verifyManually");
        buttonLabel = EnigmailLocale.getString("headerView.button.verify");
      }
      else {
        statusLine = EnigmailLocale.getString("msgPart", [EnigmailLocale.getString("msgEncrypted")]);
        statusLine += EnigmailLocale.getString("decryptManually");
        buttonLabel = EnigmailLocale.getString("headerView.button.decrypt");
      }

      Enigmail.msg.securityInfo = {};
      this.displayFlexAction(statusLine, buttonLabel, xtraStatus);
      return;
    }

    if (!statusLine) {
      return;
    }

    Enigmail.msg.securityInfo = {
      statusFlags: statusFlags,
      keyId: keyId,
      userId: userId,
      statusLine: statusLine,
      msgSigned: msgSigned,
      statusArr: statusArr,
      statusInfo: statusInfo,
      fullStatusInfo: fullStatusInfo,
      blockSeparation: blockSeparation,
      xtraStatus: xtraStatus,
      encryptedMimePart: encMimePartNumber
    };

    Enigmail.msg.createArtificialAutocryptHeader();

    if (statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE) {
      this.tryImportAutocryptHeader();
    }

    this.displayStatusBar();
    this.updateMsgDb();

  },

  /**
   * Check whether we got a WKS request
   */
  checkWksConfirmRequest: function(jsonStr) {
    let requestObj;
    try {
      requestObj = JSON.parse(jsonStr);
    }
    catch (ex) {
      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: checkWksConfirmRequest parsing JSON failed\n");
      return;
    }

    if ("type" in requestObj && requestObj.type.toLowerCase() === "confirmation-request") {
      EnigmailWks.getWksClientPathAsync(window, function _res(wksClientPath) {
        if (!wksClientPath) return;

        Enigmail.hdrView.displayFlexAction(EnigmailLocale.getString("wksConfirmationReq"),
          EnigmailLocale.getString("wksConfirmationReq.button.label"), "wks-request");
        Enigmail.hdrView.displayWksMessage();
      });
    }
    else {
      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: checkWksConfirmRequest failed condition\n");
    }
  },

  /**
   * Display Enigmail header with text and specific button
   *
   * @param {String} hdrMessage: Message to be displayed in header
   * @param {String} buttonLabel: Label of button
   * @param {String} requestType: action to be performed
   */
  displayFlexAction: function(hdrMessage, buttonLabel, requestType) {
    if (!Enigmail.msg.securityInfo) {
      Enigmail.msg.securityInfo = {};
    }
    Enigmail.msg.securityInfo.xtraStatus = requestType;
    Enigmail.msg.securityInfo.statusInfo = hdrMessage;

    if (!EnigmailCompat.isPostbox()) {
      // Thunderbird
      this.setStatusText(hdrMessage);
      this.enigmailBox.removeAttribute("collapsed");
      let button = document.getElementById("enigmail_flexActionButton");
      button.setAttribute("label", buttonLabel);
      button.removeAttribute("hidden");
      document.getElementById("enigmail_importKey").setAttribute("hidden", "true");

      this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureUnknown");
    }
    else {
      // Postbox
      let messageContainer = this.getPostboxContainer();

      let doc = document.getElementById("messagepane").contentDocument;
      let sc = messageContainer.getElementsByClassName("securitycontentbox");

      for (let i = 0; i < sc.length; i++) {
        if (sc[i].id === "enigmailFlexActionButton") {
          sc[i].parentElement.removeChild(sc[i]);
          break;
        }
      }

      let div = doc.createElement('div');
      div.className = 'securitycontentbox';
      div.setAttribute('value', hdrMessage);
      div.setAttribute('label', buttonLabel);
      div.setAttribute('id', 'enigmailFlexActionButton');
      let insertionNode = messageContainer.getElementsByClassName('message-progress-container')[0];
      insertionNode.parentNode.insertBefore(div, insertionNode);
    }
  },

  postboxHandleQuickReplyButton: function(event) {
    if (Enigmail.msg.securityInfo && Enigmail.msg.securityInfo.statusFlags) {
      if (Enigmail.msg.securityInfo.statusFlags & EnigmailConstants.DECRYPTION_OKAY) {
        event.stopPropagation();
        event.preventDefault();
        event.stopImmediatePropagation();
        EnigmailDialog.info(window, EnigmailLocale.getString("postbox.cannotUseQuickReply.message"));
      }
    }
  },

  handlePostboxFlexEvent: function(event) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: handlePostboxFlexEvent()\n");
    event.stopPropagation();
    event.stopImmediatePropagation();
    event.preventDefault();

    let action = Enigmail.msg.securityInfo.xtraStatus;
    switch (action) {
      case "autocrypt-setup":
      case "wks-request":
      case "process-manually":
        Enigmail.msg.flexActionRequest();
        break;
      case "keyImp":
        Enigmail.msg.handleUnknownKey();
        break;
      case "repairMessage":
        Enigmail.msg.fixBuggyExchangeMail();
        break;
    }
  },

  /**
   * Display a localized message in lieu of the original message text
   */
  displayWksMessage: function() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: displayWksMessage()\n");

    if (Enigmail.msg.securityInfo.xtraStatus === "wks-request") {

      let enigMsgPane = document.getElementById("enigmailMsgDisplay");
      let bodyElement = document.getElementById("messagepane");
      bodyElement.setAttribute("collapsed", true);
      enigMsgPane.removeAttribute("collapsed");
      enigMsgPane.textContent = EnigmailLocale.getString("wksConfirmationReq.message");
    }
  },

  /**
   * Try to import an autocrypt header from an unverified signature
   * (i.e. the sender's key is not available)
   */
  tryImportAutocryptHeader: function() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: tryImportAutocryptHeader()\n");

    if (!("autocrypt" in currentHeaderData)) return;
    if (!Enigmail.msg.isAutocryptEnabled()) return;
    if (!("from" in currentHeaderData)) return;

    let fromEmail = "";
    try {
      fromEmail = EnigmailFuncs.stripEmail(currentHeaderData.from.headerValue).toLowerCase();
    }
    catch (ex) {}

    let keys = EnigmailKeyRing.getKeysByUserId(fromEmail, true);
    if (keys.length > 0) return;

    EnigmailAutocrypt.importAutocryptKeys([fromEmail]).then(foundKeys => {
      EnigmailLog.DEBUG("enigmailMsgComposeOverlay.js: tryImportAutocryptHeader: got " +
        foundKeys.length + " autocrypt keys\n");
      if (foundKeys.length > 0) {
        let k = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);
        if (k) gDBView.reloadMessageWithAllParts();
      }
    });
  },

  /**
   * Display the Enigmail status bar and ask for handling the Setup Message
   */
  displayAutoCryptSetupMsgHeader: function() {
    Enigmail.hdrView.displayFlexAction(EnigmailLocale.getString("autocryptSetupReq"),
      EnigmailLocale.getString("autocryptSetupReq.button.label"), "autocrypt-setup");
    //view.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureUnknown");
    this.displayAutocryptMessage(true);
  },

  displayAutocryptMessage: function(allowImport) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: displayAutocryptMessage()\n");

    if (!EnigmailCompat.isPostbox()) {
      let enigMsgPane = document.getElementById("enigmailMsgDisplay");
      let bodyElement = document.getElementById("messagepane");
      bodyElement.setAttribute("collapsed", true);

      let txt = EnigmailLocale.getString("autocryptSetupReq.setupMsg.desc") + "\n\n";
      if (allowImport) {
        txt += EnigmailLocale.getString("autocryptSetupReq.message.import");
      }
      else {
        txt += EnigmailLocale.getString("autocryptSetupReq.message.sent");
      }
      txt += "\n\n" + EnigmailLocale.getString("autocryptSetupReq.setupMsg.backup");

      enigMsgPane.textContent = txt;
      enigMsgPane.removeAttribute("collapsed");
    }

  },

  displayStatusBar: function() {
    let statusText = document.getElementById("enigmailStatusText");
    let expStatusText = document.getElementById("expandedEnigmailStatusText");
    let icon = document.getElementById("enigToggleHeaderView2");
    let bodyElement = document.getElementById("messagepanebox");

    let secInfo = Enigmail.msg.securityInfo;
    let statusFlags = secInfo.statusFlags;
    let sMimeContainer, encryptedUINode, signedUINode;

    if (secInfo.statusArr.length > 0) {
      expStatusText.value = secInfo.statusArr[0];
      expStatusText.setAttribute("state", "true");
      icon.removeAttribute("collapsed");
    }
    else {
      expStatusText.value = "";
      expStatusText.setAttribute("state", "false");
      icon.setAttribute("collapsed", "true");
    }

    if (secInfo.statusLine) {
      this.setStatusText(secInfo.statusLine + " ");
      this.enigmailBox.removeAttribute("collapsed");
      this.displayExtendedStatus(true);

      if ((secInfo.keyId && (statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE)) ||
        (statusFlags & EnigmailConstants.INLINE_KEY)) {
        document.getElementById("enigmail_importKey").removeAttribute("hidden");
      }
      else {
        document.getElementById("enigmail_importKey").setAttribute("hidden", "true");
      }
      document.getElementById("enigmail_flexActionButton").setAttribute("hidden", "true");
    }
    else {
      this.setStatusText("");
      this.enigmailBox.setAttribute("collapsed", "true");
      this.displayExtendedStatus(false);
    }

    if (EnigmailCompat.isPostbox()) {
      let doc = document.getElementById("messagepane").contentDocument;

      let encNodes = doc.getElementsByClassName("hdr-encrypted-button");
      if (encNodes && encNodes.length > 0) {
        encryptedUINode = encNodes[0];
      }

      sMimeContainer = document.getElementById("expandedEnigmailStatusText");
    }
    else {
      sMimeContainer = gSMIMEContainer;
      encryptedUINode = gEncryptedUINode;
    }

    signedUINode = this.getSignedIcon();

    /* eslint block-scoped-var: 0*/
    if (typeof(sMimeContainer) !== "object")
      return;
    if (!sMimeContainer)
      return;

    // Update icons and header-box css-class
    try {
      sMimeContainer.collapsed = false;
      signedUINode.collapsed = false;
      encryptedUINode.collapsed = false;

      if ((statusFlags & EnigmailConstants.BAD_SIGNATURE) &&
        !(statusFlags & EnigmailConstants.GOOD_SIGNATURE)) {
        // Display untrusted/bad signature icon
        signedUINode.setAttribute("signed", "unknown");
        this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureUnknown");
        this.statusBar.setAttribute("signed", "unknown");
      }
      else if ((statusFlags & EnigmailConstants.GOOD_SIGNATURE) &&
        (statusFlags & EnigmailConstants.TRUSTED_IDENTITY) &&
        !(statusFlags & (EnigmailConstants.REVOKED_KEY |
          EnigmailConstants.EXPIRED_KEY_SIGNATURE |
          EnigmailConstants.EXPIRED_SIGNATURE))) {
        // Display trusted good signature icon
        signedUINode.setAttribute("signed", "ok");
        this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureOk");
        this.statusBar.setAttribute("signed", "ok");
        bodyElement.setAttribute("enigSigned", "ok");
      }
      else if (statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE) {
        // Display unverified signature icon
        signedUINode.setAttribute("signed", "unknown");
        this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureUnknown");
        this.statusBar.setAttribute("signed", "unknown");
      }
      else if (statusFlags & (EnigmailConstants.REVOKED_KEY |
          EnigmailConstants.EXPIRED_KEY_SIGNATURE |
          EnigmailConstants.EXPIRED_SIGNATURE |
          EnigmailConstants.GOOD_SIGNATURE)) {
        // Display unverified signature icon
        signedUINode.setAttribute("signed", "unknown");
        this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureVerified");
        this.statusBar.setAttribute("signed", "unknown");
      }
      else if (statusFlags & EnigmailConstants.INLINE_KEY) {
        if (!EnigmailCompat.isPostbox()) {
          this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureUnknown");
        }
        else {
          Enigmail.hdrView.displayFlexAction(secInfo.statusInfo, EnigmailLocale.getString("detailsDlg.importKey"), "keyImp");
          return;
        }
      }
      else {
        this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelNoSignature");
      }

      if (statusFlags & EnigmailConstants.DECRYPTION_OKAY) {
        EnigmailURIs.rememberEncryptedUri(this.lastEncryptedMsgKey);

        // Display encrypted icon
        encryptedUINode.setAttribute("encrypted", "ok");
        this.statusBar.setAttribute("encrypted", "ok");
      }
      else if (statusFlags &
        (EnigmailConstants.DECRYPTION_INCOMPLETE | EnigmailConstants.DECRYPTION_FAILED)) {
        // Display un-encrypted icon
        encryptedUINode.setAttribute("encrypted", "notok");
        this.statusBar.setAttribute("encrypted", "notok");
        this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureNotOk");
      }

      // special handling after trying to fix buggy mail format (see buggyExchangeEmailContent in code)
      if (secInfo.xtraStatus && secInfo.xtraStatus == "buggyMailFormat") {
        this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelBuggyMailFormat");
      }
    }
    catch (ex) {
      EnigmailLog.writeException("displayStatusBar", ex);
    }
  },

  getSignedIcon: function() {
    let signedUINode = null;

    if (EnigmailCompat.isPostbox()) {
      let doc = document.getElementById("messagepane").contentDocument;
      let sigNodes = doc.getElementsByClassName("hdr-signed-button");
      if (sigNodes && sigNodes.length > 0) {
        signedUINode = sigNodes[0];
      }
    }
    else {
      signedUINode = gSignedUINode;
    }

    return signedUINode;
  },

  dispSecurityContext: function() {
    try {
      if (Enigmail.msg.securityInfo) {
        if ((Enigmail.msg.securityInfo.statusFlags & EnigmailConstants.NODATA) &&
          (Enigmail.msg.securityInfo.statusFlags &
            (EnigmailConstants.PGP_MIME_SIGNED | EnigmailConstants.PGP_MIME_ENCRYPTED))) {
          document.getElementById("enigmail_reloadMessage").removeAttribute("hidden");
        }
        else {
          document.getElementById("enigmail_reloadMessage").setAttribute("hidden", "true");
        }
      }

      var optList = ["pgpSecurityInfo", "copySecurityInfo"];
      for (var j = 0; j < optList.length; j++) {
        var menuElement = document.getElementById("enigmail_" + optList[j]);
        if (Enigmail.msg.securityInfo) {
          menuElement.removeAttribute("disabled");
        }
        else {
          menuElement.setAttribute("disabled", "true");
        }
      }

      this.setSenderStatus("signSenderKey", "editSenderKeyTrust", "showPhoto", "dispKeyDetails");
    }
    catch (ex) {
      EnigmailLog.ERROR("error on displaying Security menu:\n" + ex.toString() + "\n");
    }
  },


  updateSendersKeyMenu: function() {
    this.setSenderStatus("keyMgmtSignKey",
      "keyMgmtKeyTrust",
      "keyMgmtShowPhoto",
      "keyMgmtDispKeyDetails",
      "importpublickey");
  },

  setSenderStatus: function(elemSign, elemTrust, elemPhoto, elemKeyProps, elemImportKey) {

    function setElemStatus(elemName, disabledValue) {
      document.getElementById("enigmail_" + elemName).setAttribute("disabled", !disabledValue);

      let secondElem = document.getElementById("enigmail_" + elemName + "2");
      if (secondElem) secondElem.setAttribute("disabled", !disabledValue);
    }

    var photo = false;
    var sign = false;
    var trust = false;
    var unknown = false;
    var signedMsg = false;
    var keyObj = null;

    if (Enigmail.msg.securityInfo) {
      if (Enigmail.msg.securityInfo.statusFlags & EnigmailConstants.PHOTO_AVAILABLE) {
        photo = true;
      }
      if (Enigmail.msg.securityInfo.keyId) {
        keyObj = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);
      }
      if (Enigmail.msg.securityInfo.msgSigned) {
        signedMsg = true;
        if (!(Enigmail.msg.securityInfo.statusFlags &
            (EnigmailConstants.REVOKED_KEY | EnigmailConstants.EXPIRED_KEY_SIGNATURE | EnigmailConstants.UNVERIFIED_SIGNATURE))) {
          sign = true;
        }
        if (keyObj && keyObj.isOwnerTrustUseful()) {
          trust = true;
        }

        if (Enigmail.msg.securityInfo.statusFlags & EnigmailConstants.UNVERIFIED_SIGNATURE) {
          unknown = true;
        }
      }
    }

    if (elemTrust) setElemStatus(elemTrust, trust);
    if (elemSign) setElemStatus(elemSign, sign);
    if (elemPhoto) setElemStatus(elemPhoto, photo);
    if (elemKeyProps) setElemStatus(elemKeyProps, (signedMsg && !unknown));
    if (elemImportKey) setElemStatus(elemImportKey, unknown);
  },

  editKeyExpiry: function() {
    EnigmailWindows.editKeyExpiry(window, [Enigmail.msg.securityInfo.userId], [Enigmail.msg.securityInfo.keyId]);
    gDBView.reloadMessageWithAllParts();
  },

  editKeyTrust: function() {
    let enigmailSvc = EnigmailCore.getService();
    let key = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);

    EnigmailWindows.editKeyTrust(window, [Enigmail.msg.securityInfo.userId], [key.keyId]);
    gDBView.reloadMessageWithAllParts();
  },

  signKey: function() {
    let enigmailSvc = EnigmailCore.getService();
    let key = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);

    EnigmailWindows.signKey(window, Enigmail.msg.securityInfo.userId, key.keyId, null);
    gDBView.reloadMessageWithAllParts();
  },

  getPostboxContainer: function() {
    /* global pbGetMessageContainerForHdr: false */

    let msg = gFolderDisplay.selectedMessage;
    if (msg) {
      return pbGetMessageContainerForHdr(msg);
    }

    return null;
  },

  msgHdrViewLoad: function() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.msgHdrViewLoad\n");

    this.messageListener = {
      enigmailBox: document.getElementById("enigmailBox"),
      onStartHeaders: function _listener_onStartHeaders() {
        EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: _listener_onStartHeaders\n");

        try {

          Enigmail.hdrView.statusBarHide();
          EnigmailVerify.setMsgWindow(msgWindow, Enigmail.msg.getCurrentMsgUriSpec());
          Enigmail.hdrView.setStatusText("");
          this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureOk");

          let msgFrame = EnigmailWindows.getFrame(window, "messagepane");
          if (!msgFrame) {
            // TB >= 69
            msgFrame = document.getElementById('messagepane').contentDocument;
          }

          if (msgFrame) {
            msgFrame.addEventListener("unload", Enigmail.hdrView.messageUnload.bind(Enigmail.hdrView), true);
            msgFrame.addEventListener("load", Enigmail.hdrView.messageLoad.bind(Enigmail.hdrView), true);
          }

          Enigmail.hdrView.forgetEncryptedMsgKey();
          Enigmail.hdrView.setWindowCallback();
        }
        catch (ex) {}
      },

      onEndHeaders: function _listener_onEndHeaders() {
        EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: _listener_onEndHeaders\n");

        try {
          Enigmail.hdrView.statusBarHide();

          this.enigmailBox.setAttribute("class", "expandedEnigmailBox enigmailHeaderBoxLabelSignatureOk");
        }
        catch (ex) {}
      },

      beforeStartHeaders: function _listener_beforeStartHeaders() {
        return true;
      }
    };

    gMessageListeners.push(this.messageListener);

    // fire the handlers since some windows open directly with a visible message
    this.messageListener.onStartHeaders();
    this.messageListener.onEndHeaders();
  },

  messageUnload: function(event) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.messageUnload\n");
    if (Enigmail.hdrView.flexbuttonAction === null) {
      if (Enigmail.msg.securityInfo && Enigmail.msg.securityInfo.xtraStatus) {
        Enigmail.msg.securityInfo.xtraStatus = "";
      }
      this.forgetEncryptedMsgKey();
    }
  },

  messageLoad: function(event) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.messageLoad\n");

    Enigmail.hdrView.enablePepMenus();
    Enigmail.msg.messageAutoDecrypt();
    Enigmail.msg.handleAttchmentEvent();
  },

  copyStatusInfo: function() {
    if (Enigmail.msg.securityInfo) {
      EnigmailClipboard.setClipboardContent(Enigmail.msg.securityInfo.statusInfo);
    }
  },

  showPhoto: function() {
    if (!Enigmail.msg.securityInfo) return;

    let enigmailSvc = EnigmailCore.getService();
    let key = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);

    EnigmailWindows.showPhoto(window, key.keyId, Enigmail.msg.securityInfo.userId);
  },


  dispKeyDetails: function() {
    if (!Enigmail.msg.securityInfo) return;

    let enigmailSvc = EnigmailCore.getService();
    let key = EnigmailKeyRing.getKeyById(Enigmail.msg.securityInfo.keyId);

    EnigmailWindows.openKeyDetails(window, key.keyId, false);
  },

  createRuleFromAddress: function(emailAddressNode) {
    if (emailAddressNode) {
      if (typeof(findEmailNodeFromPopupNode) == "function") {
        emailAddressNode = findEmailNodeFromPopupNode(emailAddressNode, 'emailAddressPopup');
      }
      EnigmailWindows.createNewRule(window, emailAddressNode.getAttribute("emailAddress"));
    }
  },

  forgetEncryptedMsgKey: function() {
    if (Enigmail.hdrView.lastEncryptedMsgKey) {
      EnigmailURIs.forgetEncryptedUri(Enigmail.hdrView.lastEncryptedMsgKey);
      Enigmail.hdrView.lastEncryptedMsgKey = null;
    }

    if (Enigmail.hdrView.lastEncryptedUri && gEncryptedURIService) {
      gEncryptedURIService.forgetEncrypted(Enigmail.hdrView.lastEncryptedUri);
      Enigmail.hdrView.lastEncryptedUri = null;
    }
  },

  displayExtendedStatus: function(displayOn) {
    var expStatusText = document.getElementById("expandedEnigmailStatusText");
    if (displayOn && expStatusText.getAttribute("state") == "true") {
      if (expStatusText.getAttribute("display") == "true") {
        expStatusText.removeAttribute("collapsed");
      }
      else {
        expStatusText.setAttribute("collapsed", "true");
      }
    }
    else {
      expStatusText.setAttribute("collapsed", "true");
    }
  },

  toggleHeaderView: function() {
    var viewToggle = document.getElementById("enigToggleHeaderView2");
    var expandedText = document.getElementById("expandedEnigmailStatusText");
    var state = viewToggle.getAttribute("state");

    if (state == "true") {
      viewToggle.setAttribute("state", "false");
      viewToggle.setAttribute("class", "enigmailExpandViewButton");
      expandedText.setAttribute("display", "false");
      this.displayExtendedStatus(false);
    }
    else {
      viewToggle.setAttribute("state", "true");
      viewToggle.setAttribute("class", "enigmailCollapseViewButton");
      expandedText.setAttribute("display", "true");
      this.displayExtendedStatus(true);
    }
  },

  getSelectedAttachment: function() {
    let contextMenu, selectedAttachments;
    if (EnigmailCompat.isPostbox()) {
      // Postbox
      /* global gatherSelectedAttachmentsForMessage: false */
      selectedAttachments = gatherSelectedAttachmentsForMessage(event.target.target);
      contextMenu = event.target;
    }
    else {
      // Thunderbird
      contextMenu = document.getElementById('attachmentItemContext');
      selectedAttachments = contextMenu.attachments;

      if (!contextMenu.attachments) {
        // Interlink
        let attachmentList = document.getElementById("attachmentList");
        if (attachmentList.selectedItems.length > 0) {
          selectedAttachments = [attachmentList.selectedItems[0].attachment];
        }
        else {
          selectedAttachments = currentAttachments;
        }
      }
    }

    return selectedAttachments;
  },

  onShowAttachmentContextMenu: function(event) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.onShowAttachmentContextMenu\n");

    let selectedAttachments = Enigmail.hdrView.getSelectedAttachment();

    var decryptOpenMenu = document.getElementById('enigmail_ctxDecryptOpen');
    var decryptSaveMenu = document.getElementById('enigmail_ctxDecryptSave');
    var importMenu = document.getElementById('enigmail_ctxImportKey');
    var verifyMenu = document.getElementById('enigmail_ctxVerifyAtt');

    if (selectedAttachments.length > 0) {
      this.enableContextMenuEntries(selectedAttachments[0], decryptOpenMenu, decryptSaveMenu, importMenu, verifyMenu);
    }
    else {
      openMenu.setAttribute('disabled', true); /* global openMenu: false */
      saveMenu.setAttribute('disabled', true); /* global saveMenu: false */
      decryptOpenMenu.setAttribute('disabled', true);
      decryptSaveMenu.setAttribute('disabled', true);
      importMenu.setAttribute('disabled', true);
      verifyMenu.setAttribute('disabled', true);
    }
  },

  enableContextMenuEntries: function(attachment, decryptOpenMenu, decryptSaveMenu, importMenu, verifyMenu) {
    if (attachment.contentType.search(/^application\/pgp-keys/i) === 0) {
      importMenu.removeAttribute('disabled');
      decryptOpenMenu.setAttribute('disabled', true);
      decryptSaveMenu.setAttribute('disabled', true);
      verifyMenu.setAttribute('disabled', true);
    }
    else if (Enigmail.msg.checkEncryptedAttach(attachment)) {
      if ((typeof(attachment.name) !== 'undefined' && attachment.name.match(/\.asc\.(gpg|pgp)$/i)) ||
        (typeof(attachment.displayName) !== 'undefined' && attachment.displayName.match(/\.asc\.(gpg|pgp)$/i))) {
        importMenu.removeAttribute('disabled');
      }
      else {
        importMenu.setAttribute('disabled', true);
      }
      decryptOpenMenu.removeAttribute('disabled');
      decryptSaveMenu.removeAttribute('disabled');
      if (EnigmailMsgRead.checkSignedAttachment(attachment, null, currentAttachments)) {
        verifyMenu.removeAttribute('disabled');
      }
      else {
        verifyMenu.setAttribute('disabled', true);
      }
      if (typeof(attachment.displayName) == "undefined") {
        if (!attachment.name) {
          attachment.name = "message.pgp";
        }
      }
      else if (!attachment.displayName) {
        attachment.displayName = "message.pgp";
      }
    }
    else if (EnigmailMsgRead.checkSignedAttachment(attachment, null, currentAttachments)) {
      importMenu.setAttribute('disabled', true);
      decryptOpenMenu.setAttribute('disabled', true);
      decryptSaveMenu.setAttribute('disabled', true);
      verifyMenu.removeAttribute('disabled');
    }
    else {
      importMenu.setAttribute('disabled', true);
      decryptOpenMenu.setAttribute('disabled', true);
      decryptSaveMenu.setAttribute('disabled', true);
      verifyMenu.setAttribute('disabled', true);
    }
  },

  updateMsgDb: function() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.updateMsgDb\n");
    var msg = gFolderDisplay.selectedMessage;
    if (!msg || !msg.folder) return;

    var msgHdr = msg.folder.GetMessageHeader(msg.messageKey);

    if (EnigmailPEPAdapter.usingPep()) {
      let rating = 0;
      if (this.pEpStatus.rating !== null) {
        rating = this.pEpStatus.rating;
      }

      rating = (rating + 0xFF) << 8;

      let pepColor = 0;
      switch (this.pEpStatus.messageColor) {
        case "red":
          pepColor = 1;
          break;
        case "yellow":
          pepColor = 2;
          break;
        case "green":
          pepColor = 3;
          break;
      }

      msgHdr.setUint32Property("enigmailPep", rating + pepColor);
    }
    else {
      if (this.statusBar.getAttribute("encrypted") == "ok")
        Enigmail.msg.securityInfo.statusFlags |= EnigmailConstants.DECRYPTION_OKAY;
      msgHdr.setUint32Property("enigmail", Enigmail.msg.securityInfo.statusFlags);
    }
  },

  enigCanDetachAttachments: function() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: this.enigCanDetachAttachments\n");

    var canDetach = true;
    if (Enigmail.msg.securityInfo && (typeof(Enigmail.msg.securityInfo.statusFlags) != "undefined")) {
      canDetach = ((Enigmail.msg.securityInfo.statusFlags &
        (EnigmailConstants.PGP_MIME_SIGNED | EnigmailConstants.PGP_MIME_ENCRYPTED)) ? false : true);
    }
    return canDetach;
  },

  fillAttachmentListPopup: function(item) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: Enigmail.hdrView.fillAttachmentListPopup\n");
    FillAttachmentListPopup(item);

    if (!this.enigCanDetachAttachments()) {
      for (var i = 0; i < item.childNodes.length; i++) {
        if (item.childNodes[i].className == "menu-iconic") {
          var mnu = item.childNodes[i].firstChild.firstChild;
          while (mnu) {
            if (mnu.getAttribute("oncommand").search(/(detachAttachment|deleteAttachment)/) >= 0) {
              mnu.setAttribute("disabled", true);
            }
            mnu = mnu.nextSibling;
          }
        }
      }
    }
  },

  pbxFillAttachmentListPopup: function(event, item) {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: Enigmail.hdrView.pbxFillAttachmentListPopup\n");
    FillAttachmentListPopup(event, item);

    let c = item.firstChild;
    let att = document.getElementById("msgPaneAttachmentMenuList").firstChild.firstChild.firstChild.attachment;
    let menuItem = document.getElementById("msgPaneAttachmentMenuList").firstChild;

    const actionList = [{
      labelId: "enigmail_ctxImportKey",
      action: "importKey"
    }, {
      labelId: "enigmail_ctxDecryptOpen",
      action: "openAttachment"
    }, {
      labelId: "enigmail_ctxDecryptSave",
      action: "saveAttachment"
    }, {
      labelId: "enigmail_ctxVerifyAtt",
      action: "verifySig"
    }];

    let itm = {};

    while (c && c.tagName === "menu") {
      for (let i of actionList) {
        let lbl = document.getElementById(i.labelId).getAttribute("label");
        itm[i.action] = menuItem.appendItem(lbl, `${i.labelId}_pbx`);
        itm[i.action].setAttribute("oncommand", `Enigmail.msg.handleAttachmentSel('${i.action}', this.attachment);`);
        itm[i.action].attachment = att;
      }
      c = c.nextSibling;
    }

    this.enableContextMenuEntries(att, itm.openAttachment, itm.saveAttachment, itm.importKey, itm.verifySig);

    if (!this.enigCanDetachAttachments()) {
      for (var i = 0; i < item.childNodes.length; i++) {
        if (item.childNodes[i].className == "menu-iconic") {
          var mnu = item.childNodes[i].firstChild.firstChild;
          while (mnu) {
            if (mnu.getAttribute("oncommand").search(/(detachAttachment|deleteAttachment)/) >= 0) {
              mnu.setAttribute("disabled", true);
            }
            mnu = mnu.nextSibling;
          }
        }
      }
    }
  },

  setSubject: function(subject) {
    if (gFolderDisplay.selectedMessages.length === 1 && gFolderDisplay.selectedMessage) {
      let subj = EnigmailData.convertFromUnicode(subject, "utf-8");
      if (gFolderDisplay.selectedMessage.flags & Components.interfaces.nsMsgMessageFlags.HasRe) {
        subj = subj.replace(/^(Re: )+(.*)/, "$2");
      }
      gFolderDisplay.selectedMessage.subject = subj;
      if (EnigmailCompat.isPostbox()) {
        this.updatePostboxSubject(subject);
      }
      else {
        this.updateHdrBox("subject", subject); // this needs to be the unmodified subject
      }

      let tt = document.getElementById("threadTree");
      if (tt && ("invalidate" in tt)) {
        tt.invalidate();
      }
    }
  },

  updatePostboxSubject: function(subject) {
    let container = Enigmail.hdrView.getPostboxContainer();
    if (container) {
      let idx = container.getAttribute("index");
      if (idx && idx === "0") {
        // we are the top message bein displayed -> replace subject
        let msgDoc = document.getElementById('messagepane').contentDocument;
        let subj = msgDoc.getElementsByClassName("conversation-subject-box");

        if (subj && subj.length > 0) {
          subj = subj[0];
          subj.setAttribute("title", subject);
          subj.setAttribute("value", subject);
        }
      }
    }
  },

  updateHdrBox: function(header, value) {
    let e = document.getElementById("expanded" + header + "Box");
    if (e) {
      e.headerValue = value;
    }
  },

  displayPepStatus: function(rating, keyIDs, uri, persons) {

    if (typeof(keyIDs) === "string") {
      keyIDs = keyIDs.split(/,/);
    }

    this.pEpStatus = {
      rating: rating,
      messageColor: "grey",
      emailRatings: [],
      keyIDs: keyIDs
    };

    this.displayPepMessageRating(rating);
    this.displayPepIdentities(persons);
  },

  displayPepMessageRating: function(rating) {
    this.pEpBox.removeAttribute("collapsed");

    if (rating === -2 || rating === 2) {
      this.pEpStatus.messageColor = "grey";
      this.pEpBox.setAttribute("ratingcode", "unknown");
    }
    else if (rating < 0) {
      this.pEpStatus.messageColor = "red";
      this.pEpBox.setAttribute("ratingcode", "mistrust");
    }
    else if (rating < 6) {
      this.pEpStatus.messageColor = "grey";
      this.pEpBox.setAttribute("ratingcode", "unknown");
    }
    else if (rating >= 7) {
      this.pEpStatus.messageColor = "green";
      this.pEpBox.setAttribute("ratingcode", "trusted");
    }
    else {
      this.pEpStatus.messageColor = "yellow";
      this.pEpBox.setAttribute("ratingcode", "reliable");
    }

    this.updateMsgDb();
  },

  displayPepEmailRating: function(textNode, person) {
    let nodes = textNode.getElementsByTagName("mail-emailaddress");
    let emailAddress = person.address.toLowerCase();

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("hidden") !== "true" && nodes[i].getAttribute("emailAddress").toLowerCase() === emailAddress) {
        EnigmailPEPAdapter.pep.getIdentityRating(person).then(
          cbObj => {
            if ("result" in cbObj && Array.isArray(cbObj.result.outParams) && typeof(cbObj.result.outParams[0]) === "object") {
              if ("rating" in cbObj.result.outParams[0]) {
                let rating = EnigmailPEPAdapter.calculateColorFromRating(cbObj.result.outParams[0].rating);
                let setClass = EnigmailPEPAdapter.getRatingClass(cbObj.result.outParams[0].rating);

                nodes[i].setAttribute("class", setClass);
                Enigmail.hdrView.pEpStatus.emailRatings[emailAddress] = rating;
              }
            }
          }).catch(function _err() {});
      }
    }
  },

  displayPepIdentities: function(persons) {

    if ("from" in persons && persons.from) {
      this.displayPepEmailRating(gExpandedHeaderView.from.textNode, persons.from);
    }

    if ("to" in persons && persons.to) {
      for (let p of persons.to) {
        this.displayPepEmailRating(gExpandedHeaderView.to.textNode, p);
      }
    }

    if ("cc" in persons && persons.cc) {
      for (let p of persons.cc) {
        this.displayPepEmailRating(gExpandedHeaderView.cc.textNode, p);
      }
    }

    if ("reply_to" in persons && persons.reply_to) {
      for (let p of persons.reply_to) {
        this.displayPepEmailRating(gExpandedHeaderView["reply-to"].textNode, p);
      }
    }

  },

  pEpIconPopup: function() {
    // let rating = this.pEpStatus.rating;
    let addrs = "";
    if ("from" in currentHeaderData) {
      addrs = currentHeaderData.from.headerValue;
    }
    if ("to" in currentHeaderData) {
      addrs += "," + currentHeaderData.to.headerValue;
    }
    if ("cc" in currentHeaderData) {
      addrs += "," + currentHeaderData.cc.headerValue;
    }
    if ("bcc" in currentHeaderData) {
      addrs += "," + currentHeaderData.bcc.headerValue;
    }

    let emailsInMessage = [];
    try {
      emailsInMessage = EnigmailFuncs.stripEmail(addrs).toLowerCase().split(/,/);
    }
    catch (ex) {}

    if (emailsInMessage.length === 0) {
      EnigmailDialog.info(window, EnigmailLocale.getString("handshakeDlg.error.noPeers"));
      return;
    }

    EnigmailPEPAdapter.pep.getOwnIdentities().then(function _gotOwnIds(data) {
      if (("result" in data) && typeof data.result.outParams[0] === "object" && Array.isArray(data.result.outParams[0])) {
        let ownIds = data.result.outParams[0];
        let myEmail = "";

        for (let i = 0; i < ownIds.length; i++) {
          for (let j = 0; j < emailsInMessage.length; j++) {
            if (ownIds[i].address.toLowerCase() === emailsInMessage[j]) {
              myEmail = ownIds[i].address;
              break;
            }
          }
        }

        let inputObj = {
          myself: myEmail,
          addresses: emailsInMessage,
          direction: 0,
          parentWindow: window,
          onComplete: Enigmail.msg.reloadCompleteMsg.bind(Enigmail.msg)
        };

        window.openDialog("chrome://enigmail/content/ui/pepPrepHandshake.xul",
          "", "dialog,modal,centerscreen", inputObj);
      }
    });
  },

  enablePepMenus: function() {
    if (EnigmailPEPAdapter.usingPep()) {
      document.getElementById("enigmailCreateRuleFromAddr").setAttribute("collapsed", "true");
    }
    else if (!EnigmailCompat.isPostbox()) {
      document.getElementById("enigmailCreateRuleFromAddr").removeAttribute("collapsed");
      document.getElementById("enigmailVerifyPepStatus").setAttribute("collapsed", "true");
      document.getElementById("enigmailRevokePepStatus").setAttribute("collapsed", "true");
    }
  },

  setPepVerifyFunction: function(addressNode) {
    let emailAddress = addressNode.getAttribute("emailAddress").toLowerCase();
    if (Enigmail.hdrView.pEpStatus.emailRatings[emailAddress]) {
      let idColor = Enigmail.hdrView.pEpStatus.emailRatings[emailAddress];
      if (idColor === "green") {
        document.getElementById("enigmailRevokePepStatus").removeAttribute("collapsed");
        document.getElementById("enigmailVerifyPepStatus").setAttribute("collapsed", "true");
      }
      else {
        document.getElementById("enigmailVerifyPepStatus").removeAttribute("collapsed");
        document.getElementById("enigmailRevokePepStatus").setAttribute("collapsed", "true");
      }
    }
    else {
      document.getElementById("enigmailVerifyPepStatus").setAttribute("collapsed", "true");
      document.getElementById("enigmailRevokePepStatus").setAttribute("collapsed", "true");
    }
  },

  verifyPepTrustWords: function(emailAddressNode) {
    if (emailAddressNode) {
      if (typeof(findEmailNodeFromPopupNode) == "function") {
        emailAddressNode = findEmailNodeFromPopupNode(emailAddressNode, 'emailAddressPopup');
      }
      let emailAddr = emailAddressNode.getAttribute("emailAddress");

      EnigmailWindows.verifyPepTrustWords(window, emailAddr, currentHeaderData).then(function _done() {
        gDBView.reloadMessageWithAllParts();
      }).catch(function _err() {});
    }
  },

  revokePepTrust: function(emailAddressNode) {
    if (emailAddressNode) {
      if (typeof(findEmailNodeFromPopupNode) == "function") {
        emailAddressNode = findEmailNodeFromPopupNode(emailAddressNode, 'emailAddressPopup');
      }
      let emailAddr = emailAddressNode.getAttribute("emailAddress");

      if (EnigmailDialog.confirmDlg(window,
          EnigmailLocale.getString("pepRevokeTrust.question", emailAddr),
          EnigmailLocale.getString("pepRevokeTrust.doRevoke"),
          EnigmailLocale.getString("dlg.button.close"))) {
        EnigmailPEPAdapter.resetTrustForEmail(emailAddr).then(function _done() {
          gDBView.reloadMessageWithAllParts();
        }).catch(function _err() {});
      }
    }
  },

  setWindowCallback: function() {
    EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: setWindowCallback\n");

    EnigmailSingletons.messageReader = this.headerPane;
  },

  headerPane: {

    isCurrentMessage: function(uri) {
      let uriSpec = (uri ? uri.spec : null);

      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.isCurrentMessage: uri.spec=" + uriSpec + "\n");

      if (!uriSpec || uriSpec.search(/^enigmail:/) === 0) {
        // we cannot compare if no URI given or if URI is Enigmail-internal;
        // therefore assuming it's the current message
        return true;
      }

      let msgUriSpec = Enigmail.msg.getCurrentMsgUriSpec();

      let currUrl = EnigmailCompat.getUrlFromUriSpec(msgUriSpec);
      if (!currUrl) {
        EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.isCurrentMessage: could not determine URL\n");
        currUrl = {
          host: "invalid",
          path: "/message",
          scheme: "enigmail",
          spec: "enigmail://invalid/message",
          schemeIs: function(s) {
            return s === this.scheme;
          }
        };
      }

      let currMsgId = EnigmailURIs.msgIdentificationFromUrl(currUrl);
      let gotMsgId = EnigmailURIs.msgIdentificationFromUrl(uri);

      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.isCurrentMessage: url=" + currUrl.spec + "\n");

      if (uri.host == currUrl.host &&
        currMsgId.folder === gotMsgId.folder &&
        currMsgId.msgNum === gotMsgId.msgNum) {
        EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.isCurrentMessage: true\n");
        return true;
      }

      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.isCurrentMessage: false\n");
      return false;
    },

    /**
     * Determine if a given MIME part number is a multipart/related message or a child thereof
     *
     * @param mimePart:      Object - The MIME Part object to evaluate from the MIME tree
     * @param searchPartNum: String - The part number to determine
     */
    isMultipartRelated: function(mimePart, searchPartNum) {
      if (searchPartNum.indexOf(mimePart.partNum) == 0 && mimePart.partNum.length <= searchPartNum.length) {
        if (mimePart.fullContentType.search(/^multipart\/related/i) === 0) return true;

        for (let i in mimePart.subParts) {
          if (this.isMultipartRelated(mimePart.subParts[i], searchPartNum)) return true;
        }
      }
      return false;
    },

    /**
     * Determine if a given mime part number should be displayed.
     * Returns true if one of these conditions is true:
     *  - this is the 1st displayed block of the message
     *  - the message part displayed corresonds to the decrypted part
     *
     * @param mimePartNumber: String - the MIME part number that was decrypted/verified
     * @param uriSpec:        String - the URI spec that is being displayed
     */
    displaySubPart: function(mimePartNumber, uriSpec) {
      if ((!mimePartNumber) || (!uriSpec)) return true;
      let part = EnigmailMime.getMimePartNumber(uriSpec);

      if (part.length === 0) {
        // only display header if 1st message part
        if (mimePartNumber.search(/^1(\.1)*$/) < 0) return false;
      }
      else {
        let r = EnigmailFuncs.compareMimePartLevel(mimePartNumber, part);

        // analyzed mime part is contained in viewed message part
        if (r === 2) {
          if (mimePartNumber.substr(part.length).search(/^\.1(\.1)*$/) < 0) return false;
        }
        else if (r !== 0) return false;

        if (Enigmail.msg.mimeParts) {
          if (this.isMultipartRelated(Enigmail.msg.mimeParts, mimePartNumber)) return false;
        }
      }
      return true;
    },

    /**
     * Determine if there are message parts that are not signed/encrypted
     *
     * @param mimePartNumber String - the MIME part number that was authenticated
     *
     * @return Boolean: true: there are siblings / false: no siblings
     */
    hasUnauthenticatedParts: function(mimePartNumber) {
      function hasSiblings(mimePart, searchPartNum, parentNum) {
        if (mimePart.partNum === parentNum) {
          // if we're a direct child of a PGP/MIME encrypted message, we know that everything
          // is authenticated on this level
          if (mimePart.fullContentType.search(/^multipart\/encrypted.{1,255}protocol="?application\/pgp-encrypted"?/i) === 0) return false;
        }
        if (mimePart.partNum.indexOf(parentNum) == 0 && mimePart.partNum !== searchPartNum) return true;

        for (let i in mimePart.subParts) {
          if (hasSiblings(mimePart.subParts[i], searchPartNum, parentNum)) return true;
        }

        return false;
      }

      let parentNum = mimePartNumber.replace(/\.\d+$/, "");
      if (mimePartNumber.search(/\./) < 0) {
        parentNum = "";
      }

      if (mimePartNumber && Enigmail.msg.mimeParts) {
        if (hasSiblings(Enigmail.msg.mimeParts, mimePartNumber, parentNum)) return true;
      }

      return false;
    },

    updateSecurityStatus: function(unusedUriSpec, exitCode, statusFlags, keyId, userId, sigDetails, errorMsg, blockSeparation, uri, extraDetails, mimePartNumber) {
      // uriSpec is not used for Enigmail anymore. It is here becaue other addons and pEp rely on it

      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: updateSecurityStatus: mimePart=" + mimePartNumber + "\n");


      let uriSpec = (uri ? uri.spec : null);

      if (this.isCurrentMessage(uri)) {

        if (statusFlags & EnigmailConstants.DECRYPTION_OKAY) {
          if (gEncryptedURIService) {
            // remember encrypted message URI to enable TB prevention against EFAIL attack
            Enigmail.hdrView.lastEncryptedUri = gFolderDisplay.selectedMessageUris[0];
            gEncryptedURIService.rememberEncrypted(Enigmail.hdrView.lastEncryptedUri);
          }
        }

        if (!this.displaySubPart(mimePartNumber, uriSpec)) return;
        if (this.hasUnauthenticatedParts(mimePartNumber)) {
          EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: updateSecurityStatus: found unauthenticated part\n");
          statusFlags |= EnigmailConstants.PARTIALLY_PGP;
        }

        let encToDetails = "";
        if (extraDetails && extraDetails.length > 0) {
          try {
            let o = JSON.parse(extraDetails);
            if ("encryptedTo" in o) {
              encToDetails = o.encryptedTo;
            }
          }
          catch (x) {}
        }

        Enigmail.hdrView.updateHdrIcons(exitCode, statusFlags, keyId, userId, sigDetails,
          errorMsg, blockSeparation, encToDetails,
          null, mimePartNumber);
      }

      if (uriSpec && uriSpec.search(/^enigmail:message\//) === 0) {
        // display header for broken MS-Exchange message
        if (!EnigmailCompat.isPostbox()) {
          // Thunderbird
          let ebeb = document.getElementById("enigmailBrokenExchangeBox");
          ebeb.removeAttribute("collapsed");
        }
        else {
          // Postbox
          let btn = document.getElementById("enigmailFixBrokenMessageButton");
          Enigmail.hdrView.displayFlexAction(EnigmailLocale.getString("brokenExchangeMessage"), btn.label, "repairMessage");
        }
      }

      return;
    },

    processDecryptionResult: function(uri, actionType, processData, mimePartNumber) {
      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.processDecryptionResult:\n");
      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: actionType= " + actionType + ", mimePart=" + mimePartNumber + "\n");

      let msg = gFolderDisplay.selectedMessage;
      if (!msg) return;
      if (!this.isCurrentMessage(uri) || gFolderDisplay.selectedMessages.length !== 1) return;

      switch (actionType) {
        case "modifyMessageHeaders":
          this.modifyMessageHeaders(uri, processData, mimePartNumber);
          return;
        case "wksConfirmRequest":
          Enigmail.hdrView.checkWksConfirmRequest(processData);
          return;
        case "displayPepStatus":
          try {
            let o = JSON.parse(processData);
            Enigmail.hdrView.displayPepStatus(o.rating, o.fpr, uri, o.persons);
          }
          catch (x) {}
          return;
      }
    },

    modifyMessageHeaders: function(uri, headerData, mimePartNumber) {
      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.modifyMessageHeaders:\n");

      let updateHdrBox = Enigmail.hdrView.updateHdrBox;
      let uriSpec = (uri ? uri.spec : null);
      let hdr;

      try {
        hdr = JSON.parse(headerData);
      }
      catch (ex) {
        EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: modifyMessageHeaders: - no headers to display\n");
        return;
      }

      if (typeof(hdr) !== "object") return;
      if (!this.displaySubPart(mimePartNumber, uriSpec)) return;

      let msg = gFolderDisplay.selectedMessage;

      if ("subject" in hdr) {
        Enigmail.hdrView.setSubject(hdr.subject);
      }

      if ("date" in hdr) {
        msg.date = Date.parse(hdr.date) * 1000;
      }
      /*
            if ("newsgroups" in hdr) {
              updateHdrBox("newsgroups", hdr.newsgroups);
            }

            if ("followup-to" in hdr) {
              updateHdrBox("followup-to", hdr["followup-to"]);
            }

            if ("from" in hdr) {
              gExpandedHeaderView.from.outputFunction(gExpandedHeaderView.from, hdr.from);
              msg.setStringProperty("Enigmail-From", hdr.from);
            }

            if ("to" in hdr) {
              gExpandedHeaderView.to.outputFunction(gExpandedHeaderView.to, hdr.to);
              msg.setStringProperty("Enigmail-To", hdr.to);
            }

            if ("cc" in hdr) {
              gExpandedHeaderView.cc.outputFunction(gExpandedHeaderView.cc, hdr.cc);
              msg.setStringProperty("Enigmail-Cc", hdr.cc);
            }

            if ("reply-to" in hdr) {
              gExpandedHeaderView["reply-to"].outputFunction(gExpandedHeaderView["reply-to"], hdr["reply-to"]);
              msg.setStringProperty("Enigmail-ReplyTo", hdr["reply-to"]);
            }
      */
    },

    handleSMimeMessage: function(uri) {
      if (this.isCurrentMessage(uri)) {
        EnigmailVerify.unregisterContentTypeHandler();
        Enigmail.msg.messageReload(false);
      }
    },

    maxWantedNesting: function() {
      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.maxWantedNesting:\n");
      return this._smimeHeaderSink.maxWantedNesting();
    },

    signedStatus: function(aNestingLevel, aSignatureStatus, aSignerCert) {
      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.signedStatus:\n");
      return this._smimeHeaderSink.signedStatus(aNestingLevel, aSignatureStatus, aSignerCert);
    },

    encryptionStatus: function(aNestingLevel, aEncryptionStatus, aRecipientCert) {
      EnigmailLog.DEBUG("enigmailMsgHdrViewOverlay.js: EnigMimeHeaderSink.encryptionStatus:\n");
      return this._smimeHeaderSink.encryptionStatus(aNestingLevel, aEncryptionStatus, aRecipientCert);
    }
  },

  onUnloadEnigmail: function() {
    window.removeEventListener("load-enigmail", Enigmail.hdrView.hdrViewLoad, false);
    for (let i = 0; i < gMessageListeners.length; i++) {
      if (gMessageListeners[i] === Enigmail.hdrView.messageListener) {
        gMessageListeners.splice(i, 1);
        break;
      }
    }

    let signedHdrElement = document.getElementById("signedHdrIcon");
    if (signedHdrElement) {
      signedHdrElement.setAttribute("onclick", "showMessageReadSecurityInfo();");
    }

    let encryptedHdrElement = document.getElementById("encryptedHdrIcon");
    if (encryptedHdrElement) {
      encryptedHdrElement.setAttribute("onclick", "showMessageReadSecurityInfo();");
    }

    let addrPopup = document.getElementById("emailAddressPopup");
    if (addrPopup) {
      addrPopup.removeEventListener("popupshowing", Enigmail.hdrView.displayAddressPopup, false);
    }

    let attCtx = document.getElementById("attachmentItemContext");
    if (attCtx) {
      attCtx.removeEventListener("popupshowing", this.onShowAttachmentContextMenu, false);
    }

    let msgFrame = EnigmailWindows.getFrame(window, "messagepane");
    if (msgFrame) {
      msgFrame.removeEventListener("unload", Enigmail.hdrView.messageUnload, true);
      msgFrame.removeEventListener("load", Enigmail.hdrView.messageLoad, false);
    }

    if (EnigmailCompat.isPostbox()) {
      document.getElementById("messagepane").removeEventListener('click', Enigmail.hdrView.postboxMessagePaneOnClick, true);
      document.getElementById("messagepane").addEventListener('click', pbSmimeMessagePaneOnClick, true);
    }


    CanDetachAttachments = Enigmail.hdrView.origCanDetachAttachments;
  }
};

window.addEventListener("load-enigmail", Enigmail.hdrView.hdrViewLoad.bind(Enigmail.hdrView), false);
