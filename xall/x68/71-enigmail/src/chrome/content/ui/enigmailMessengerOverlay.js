/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

/* Globals from Thunderbird: */
/* global ReloadMessage: false, gDBView: false, gSignatureStatus: false, gEncryptionStatus: false, showMessageReadSecurityInfo: false */
/* global gFolderDisplay: false, messenger: false, currentAttachments: false, msgWindow: false, PanelUI: false */
/* global currentHeaderData: false, gViewAllHeaders: false, gExpandedHeaderList: false, goDoCommand: false, HandleSelectedAttachments: false */
/* global statusFeedback: false, displayAttachmentsForExpandedView: false, gMessageListeners: false, gExpandedHeaderView: false, gSignedUINode: false */

var EnigmailCompat = ChromeUtils.import("chrome://enigmail/content/modules/compat.jsm").EnigmailCompat;
var EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
var EnigmailFuncs = ChromeUtils.import("chrome://enigmail/content/modules/funcs.jsm").EnigmailFuncs;
var EnigmailMsgRead = ChromeUtils.import("chrome://enigmail/content/modules/msgRead.jsm").EnigmailMsgRead;
var EnigmailVerify = ChromeUtils.import("chrome://enigmail/content/modules/mimeVerify.jsm").EnigmailVerify;
var EnigmailVerifyAttachment = ChromeUtils.import("chrome://enigmail/content/modules/verify.jsm").EnigmailVerifyAttachment;
var EnigmailFixExchangeMsg = ChromeUtils.import("chrome://enigmail/content/modules/fixExchangeMsg.jsm").EnigmailFixExchangeMsg;
var EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
var EnigmailPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
var EnigmailOS = ChromeUtils.import("chrome://enigmail/content/modules/os.jsm").EnigmailOS;
var EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
var EnigmailFiles = ChromeUtils.import("chrome://enigmail/content/modules/files.jsm").EnigmailFiles;
var EnigmailKey = ChromeUtils.import("chrome://enigmail/content/modules/key.jsm").EnigmailKey;
var EnigmailData = ChromeUtils.import("chrome://enigmail/content/modules/data.jsm").EnigmailData;
var EnigmailApp = ChromeUtils.import("chrome://enigmail/content/modules/app.jsm").EnigmailApp;
var EnigmailDialog = ChromeUtils.import("chrome://enigmail/content/modules/dialog.jsm").EnigmailDialog;
var EnigmailTimer = ChromeUtils.import("chrome://enigmail/content/modules/timer.jsm").EnigmailTimer;
var EnigmailWindows = ChromeUtils.import("chrome://enigmail/content/modules/windows.jsm").EnigmailWindows;
var EnigmailTime = ChromeUtils.import("chrome://enigmail/content/modules/time.jsm").EnigmailTime;
var EnigmailPersistentCrypto = ChromeUtils.import("chrome://enigmail/content/modules/persistentCrypto.jsm").EnigmailPersistentCrypto;
var EnigmailStreams = ChromeUtils.import("chrome://enigmail/content/modules/streams.jsm").EnigmailStreams;
var EnigmailEvents = ChromeUtils.import("chrome://enigmail/content/modules/events.jsm").EnigmailEvents;
var EnigmailKeyRing = ChromeUtils.import("chrome://enigmail/content/modules/keyRing.jsm").EnigmailKeyRing;
var EnigmailDecryption = ChromeUtils.import("chrome://enigmail/content/modules/decryption.jsm").EnigmailDecryption;
var EnigmailAttachment = ChromeUtils.import("chrome://enigmail/content/modules/attachment.jsm").EnigmailAttachment;
var EnigmailConstants = ChromeUtils.import("chrome://enigmail/content/modules/constants.jsm").EnigmailConstants;
var EnigmailPassword = ChromeUtils.import("chrome://enigmail/content/modules/passwords.jsm").EnigmailPassword;
var EnigmailKeyUsability = ChromeUtils.import("chrome://enigmail/content/modules/keyUsability.jsm").EnigmailKeyUsability;
var EnigmailURIs = ChromeUtils.import("chrome://enigmail/content/modules/uris.jsm").EnigmailURIs;
var EnigmailProtocolHandler = ChromeUtils.import("chrome://enigmail/content/modules/protocolHandler.jsm").EnigmailProtocolHandler;
var EnigmailPEPAdapter = ChromeUtils.import("chrome://enigmail/content/modules/pEpAdapter.jsm").EnigmailPEPAdapter;
var EnigmailPEPDecrypt = ChromeUtils.import("chrome://enigmail/content/modules/pEpDecrypt.jsm").EnigmailPEPDecrypt;
var EnigmailAutocrypt = ChromeUtils.import("chrome://enigmail/content/modules/autocrypt.jsm").EnigmailAutocrypt;
var EnigmailMime = ChromeUtils.import("chrome://enigmail/content/modules/mime.jsm").EnigmailMime;
var EnigmailArmor = ChromeUtils.import("chrome://enigmail/content/modules/armor.jsm").EnigmailArmor;
var EnigmailWks = ChromeUtils.import("chrome://enigmail/content/modules/webKey.jsm").EnigmailWks;
var EnigmailStdlib = ChromeUtils.import("chrome://enigmail/content/modules/stdlib.jsm").EnigmailStdlib;
var EnigmailConfigure = ChromeUtils.import("chrome://enigmail/content/modules/configure.jsm").EnigmailConfigure;
var Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

var Enigmail;
if (!Enigmail) {
  Enigmail = {};
}

Enigmail.getEnigmailSvc = function() {
  return EnigmailCore.getService(window);
};

Enigmail.msg = {
  createdURIs: [],
  decryptedMessage: null,
  securityInfo: null,
  lastSaveDir: "",
  messagePane: null,
  noShowReload: false,
  decryptButton: null,
  savedHeaders: null,
  removeListener: false,
  enableExperiments: false,
  headersList: ["content-transfer-encoding",
    "x-enigmail-version", "x-pgp-encoding-format",
    "autocrypt-setup-message"
  ],
  buggyExchangeEmailContent: null, // for HACK for MS-EXCHANGE-Server Problem
  buggyMailType: null,
  changedAttributes: [],
  lastSMimeReloadURI: "",

  messengerStartup: function() {

    let self = this;

    // private function to overwrite attributes
    function overrideAttribute(elementIdList, attrName, prefix, suffix) {
      for (var index = 0; index < elementIdList.length; index++) {
        var elementId = elementIdList[index];
        var element = document.getElementById(elementId);
        if (element) {
          try {
            var oldValue = element.getAttribute(attrName);
            EnigmailLog.DEBUG("enigmailMessengerOverlay.js: overrideAttribute " + attrName + ": oldValue=" + oldValue + "\n");
            var newValue = prefix + elementId + suffix;

            element.setAttribute(attrName, newValue);
            self.changedAttributes.push({
              id: elementId,
              attrib: attrName,
              value: oldValue
            });
          }
          catch (ex) {}
        }
        else {
          EnigmailLog.DEBUG("enigmailMessengerOverlay.js: *** UNABLE to override id=" + elementId + "\n");
        }
      }
    }

    let t = document.getElementById("tabmail");
    if (t) {
      // TB >= 63
      t.addEventListener("pageshow", Enigmail.msg.pageShowListener, false);
    }

    let customizeToolbar = document.getElementById("customizeToolbarSheetIFrame");
    customizeToolbar.addEventListener("pageshow", function(event) {
      let Overlays = ChromeUtils.import("chrome://enigmail/content/modules/overlays.jsm", {}).Overlays;
      Overlays.loadOverlays("Enigmail", event.target.defaultView, ["chrome://enigmail/content/ui/enigmailCustToolOverlay.xul"]);
    }, false);

    Enigmail.msg.messagePane = document.getElementById("messagepane");

    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: Startup\n");

    // Override SMIME ui
    overrideAttribute(["cmd_viewSecurityStatus"], "Enigmail.msg.viewSecurityInfo(null, true);", "", "");

    // Override Postbox Attachment menu
    overrideAttribute(["msgPaneAttachmentMenuList"], "onpopupshowing", "Enigmail.hdrView.pbxFillAttachmentListPopup(event, this, '", "');");

    // Override print command
    var printElementIds = ["cmd_print", "cmd_printpreview", "key_print", "button-print",
      "mailContext-print", "mailContext-printpreview"
    ];

    overrideAttribute(printElementIds, "oncommand",
      "Enigmail.msg.msgPrint('", "');");

    //Enigmail.msg.overrideLayoutChange();
    Enigmail.msg.prepareAppMenu();
    Enigmail.msg.setMainMenuLabel();

    Enigmail.msg.juniorModeObserver = EnigmailPEPAdapter.registerJuniorModeObserver(Enigmail.msg.setMainMenuLabel);

    let statusCol = document.getElementById("enigmailStatusCol");
    if (statusCol) {
      if (EnigmailPEPAdapter.usingPep()) {
        statusCol.setAttribute("label", EnigmailLocale.getString("enigmailPep.msgViewColumn.label"));
      }
      else {
        statusCol.setAttribute("label", EnigmailLocale.getString("enigmail.msgViewColumn.label"));
      }
    }

    Enigmail.msg.savedHeaders = null;

    Enigmail.msg.decryptButton = document.getElementById("button-enigmail-decrypt");

    EnigmailTimer.setTimeout(function _f() {
      // if nothing happened, then load all keys after 1 hour
      // to trigger the key check
      EnigmailKeyRing.getAllKeys();

    }, 3600 * 1000); // 1 hour

    if (EnigmailPEPAdapter.usingPep()) {
      EnigmailTimer.setTimeout(function _f() {
        // check if there is an update to pEp after 20 seconds of uptime
        EnigmailPEPAdapter.checkForPepUpdate();
      }, 20 * 1000);
    }


    // Need to add event listener to Enigmail.msg.messagePane to make it work
    // Adding to msgFrame doesn't seem to work
    Enigmail.msg.messagePane.addEventListener("unload", Enigmail.msg.messageFrameUnload.bind(Enigmail.msg), true);

    this.treeController = {
      supportsCommand: function(command) {
        // EnigmailLog.DEBUG("enigmailMessengerOverlay.js: treeCtrl: supportsCommand: "+command+"\n");
        switch (command) {
          case "button_enigmail_decrypt":
            return true;
        }
        return false;
      },
      isCommandEnabled: function(command) {
        // EnigmailLog.DEBUG("enigmailMessengerOverlay.js: treeCtrl: isCommandEnabled: "+command+"\n");
        try {
          if (gFolderDisplay.messageDisplay.visible) {
            if (gFolderDisplay.selectedCount != 1) {
              Enigmail.hdrView.statusBarHide();
            }
            return (gFolderDisplay.selectedCount == 1);
          }
          Enigmail.hdrView.statusBarHide();
        }
        catch (ex) {}
        return false;
      },
      doCommand: function(command) {
        //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: treeCtrl: doCommand: "+command+"\n");
        // nothing
      },
      onEvent: function(event) {
        // EnigmailLog.DEBUG("enigmailMessengerOverlay.js: treeCtrl: onEvent: "+command+"\n");
        // nothing
      }
    };

    top.controllers.appendController(this.treeController);
    gMessageListeners.push(Enigmail.msg.messageListener);
    Enigmail.msg.messageListener.onEndHeaders();

    const vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
    const oldVersion = EnigmailPrefs.getPref("configuredVersion");

    if (oldVersion === "") {
      EnigmailConfigure.configureEnigmail(window, false);
    }
    else if (vc.compare(oldVersion, "2.1.7") < 0) {
      EnigmailPrefs.setPref("configuredVersion", EnigmailApp.getVersion());

      if ((!EnigmailPEPAdapter.usingPep()) &&
        new Date < new Date(2020, 8, 30)) // 2020-09-30; months are indexed from 0
        EnigmailConfigure.upgradeTo217();
    }
  },

  pageShowListener: function(e) {
    if (e.type === "pageshow" && e.target.URL === "about:preferences") {
      EnigmailLog.DEBUG("enigmailMessengerOverlay.js: loading enigmailPrivacyOverlay.xul\n");
      let Overlays = ChromeUtils.import("chrome://enigmail/content/modules/overlays.jsm", {}).Overlays;
      Overlays.loadOverlays("Enigmail", e.target.defaultView, ["chrome://enigmail/content/ui/enigmailPrivacyOverlay.xul"]);
    }
  },

  messageListener: {
    onStartHeaders: function() {
      Enigmail.msg.mimeParts = null;
      if ("autocrypt" in gExpandedHeaderView) {
        delete gExpandedHeaderView.autocrypt;
      }
      if ("openpgp" in gExpandedHeaderView) {
        delete gExpandedHeaderView.openpgp;
      }
    },
    onEndHeaders: function() {},
    onEndAttachments: function() {}
  },

  viewSecurityInfo: function(event, displaySmimeMsg) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: viewSecurityInfo\n");

    if (event && event.button !== 0) {
      return;
    }

    if (gSignatureStatus >= 0 || gEncryptionStatus >= 0) {
      showMessageReadSecurityInfo();
    }
    else {
      if (Enigmail.msg.securityInfo) {
        this.viewOpenpgpInfo();
      }
      else {
        showMessageReadSecurityInfo();
      }
    }
  },

  viewOpenpgpInfo: function() {
    if (Enigmail.msg.securityInfo) {
      if (EnigmailCompat.isPostbox()) {
        // Postbox
        let op2Label = null;
        let dlgOp2 = 0;
        if (document.getElementById("enigmail_importKey").getAttribute("hidden") !== "true") {
          op2Label = EnigmailLocale.getString("detailsDlg.importKey");
          dlgOp2 = 1;
        }
        else if (this.securityInfo.keyId) {
          op2Label = EnigmailLocale.getString("expiry.OpenKeyProperties");
          dlgOp2 = 2;
        }
        let args = {
          msgtext: EnigmailLocale.getString("securityInfo") + Enigmail.msg.securityInfo.statusInfo,
          dialogTitle: EnigmailLocale.getString("securityInfo"),
          iconType: 1,
          button2: op2Label
        };
        let r = EnigmailDialog.msgBox(window, args);
        if (r === 1) {
          switch (dlgOp2) {
            case 1:
              Enigmail.msg.handleUnknownKey();
              break;
            case 2:
              Enigmail.hdrView.dispKeyDetails();
              break;
          }
        }
      }
      else {
        // Thunderbird
        EnigmailDialog.info(window, EnigmailLocale.getString("securityInfo") + Enigmail.msg.securityInfo.statusInfo);
      }
    }
  },

  clearLastMessage: function() {
    const {
      EnigmailSingletons
    } = ChromeUtils.import("chrome://enigmail/content/modules/singletons.jsm");
    EnigmailSingletons.clearLastDecryptedMessage();
  },

  messageReload: function(noShowReload) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageReload: " + noShowReload + "\n");

    Enigmail.msg.noShowReload = noShowReload;
    this.clearLastMessage();
    ReloadMessage();
  },

  messengerClose: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messengerClose()\n");

    if (this.juniorModeObserver) {
      EnigmailPEPAdapter.unregisterJuniorModeObserver(this.juniorModeObserver);
      this.juniorModeObserver = null;
    }

  },

  reloadCompleteMsg: function() {
    this.clearLastMessage();
    gDBView.reloadMessageWithAllParts();
  },


  setAttachmentReveal: function(attachmentList) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: setAttachmentReveal\n");

    var revealBox = document.getElementById("enigmailRevealAttachments");
    if (revealBox) {
      // there are situations when evealBox is not yet present
      revealBox.setAttribute("hidden", !attachmentList ? "true" : "false");
    }
  },


  messageCleanup: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageCleanup\n");

    var enigmailBox = document.getElementById("enigmailBox");

    if (enigmailBox && !enigmailBox.collapsed) {
      enigmailBox.setAttribute("collapsed", "true");

      var statusText = document.getElementById("expandedEnigmailStatusText");
      if (statusText) {
        statusText.value = "";
      }
    }

    let exchBox = document.getElementById("enigmailBrokenExchangeBox");
    if (exchBox) {
      exchBox.setAttribute("collapsed", "true");
    }

    this.setAttachmentReveal(null);

    if (Enigmail.msg.createdURIs.length) {
      // Cleanup messages belonging to this window (just in case)
      var enigmailSvc = Enigmail.getEnigmailSvc();
      if (enigmailSvc) {
        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: Cleanup: Deleting messages\n");
        for (var index = 0; index < Enigmail.msg.createdURIs.length; index++) {
          EnigmailURIs.deleteMessageURI(Enigmail.msg.createdURIs[index]);
        }
        Enigmail.msg.createdURIs = [];
      }
    }

    Enigmail.msg.decryptedMessage = null;
    Enigmail.msg.securityInfo = null;
  },

  messageFrameUnload: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageFrameUnload\n");

    if (Enigmail.msg.noShowReload) {
      Enigmail.msg.noShowReload = false;

    }
    else {
      Enigmail.msg.savedHeaders = null;

      Enigmail.msg.messageCleanup();
    }
  },

  getCurrentMsgUriSpec: function() {
    try {
      if (!EnigmailCompat.isPostbox()) {
        // Thunderbird
        if (gFolderDisplay.selectedMessages.length != 1) {
          return "";
        }

        var uriSpec = gFolderDisplay.selectedMessageUris[0];
        //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: getCurrentMsgUriSpec: uriSpec="+uriSpec+"\n");

        return uriSpec;
      }
      else {
        // Postbox
        if (gFolderDisplay.selectedMessageUri) {
          return gFolderDisplay.selectedMessageUri;
        }
        else if (gFolderDisplay.selectedMessageUris.length > 0) {
          return gFolderDisplay.selectedMessageUris[0];
        }
        else
          return "";
      }
    }
    catch (ex) {
      return "";
    }
  },

  getCurrentMsgUrl: function() {
    var uriSpec = this.getCurrentMsgUriSpec();
    return EnigmailMsgRead.getUrlFromUriSpec(uriSpec);
  },

  updateOptionsDisplay: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: updateOptionsDisplay: \n");
    var optList = ["autoDecrypt"];

    for (let j = 0; j < optList.length; j++) {
      let menuElement = document.getElementById("enigmail_" + optList[j]);
      menuElement.setAttribute("checked", EnigmailPrefs.getPref(optList[j]) ? "true" : "false");

      menuElement = document.getElementById("enigmail_" + optList[j] + "2");
      if (menuElement) {
        menuElement.setAttribute("checked", EnigmailPrefs.getPref(optList[j]) ? "true" : "false");
      }
    }

    optList = ["decryptverify"];
    for (let j = 0; j < optList.length; j++) {
      let menuElement = document.getElementById("enigmail_" + optList[j]);
      if (Enigmail.msg.decryptButton && Enigmail.msg.decryptButton.disabled) {
        menuElement.setAttribute("disabled", "true");
      }
      else {
        menuElement.removeAttribute("disabled");
      }

      menuElement = document.getElementById("enigmail_" + optList[j] + "2");
      if (menuElement) {
        if (Enigmail.msg.decryptButton && Enigmail.msg.decryptButton.disabled) {
          menuElement.setAttribute("disabled", "true");
        }
        else {
          menuElement.removeAttribute("disabled");
        }
      }
    }
  },

  setMainMenuLabel: function() {
    if (EnigmailCompat.isPostbox()) return;
    if (!EnigmailCompat.isAtLeastTb68()) return;

    let usePep = EnigmailPEPAdapter.usingPep();
    let o = ["menu_Enigmail", "appmenu-Enigmail"];

    let m0 = document.getElementById(o[0]);
    let m1 = document.getElementById(o[1]);

    m1.setAttribute("enigmaillabel", m0.getAttribute("enigmaillabel"));
    m1.setAttribute("peplabel", m0.getAttribute("peplabel"));

    for (let menuId of o) {
      let menu = document.getElementById(menuId);

      if (menu) {
        let lbl = menu.getAttribute(usePep ? "peplabel" : "enigmaillabel");
        menu.setAttribute("label", lbl);
      }
    }
  },

  prepareAppMenu: function() {
    let menu = document.querySelector("#appMenu-mainView > vbox");
    if (!menu) return;

    // don't try to add Enigmail menu more than once
    if (document.getElementById("appmenu-Enigmail")) return;

    let tsk = document.getElementById("appmenu_tasksMenu");
    let e = document.createXULElement("toolbarbutton");
    e.setAttribute("label", "xxEnigmail");
    e.id = "appmenu-Enigmail";
    e.setAttribute("class", "subviewbutton subviewbutton-nav subviewbutton-iconic");
    e.setAttribute("closemenu", "none");
    e.setAttribute("oncommand", "Enigmail.msg.displayAppmenu('appMenu-enigmailView', this)");
    e.setAttribute("overlay_source", "enigmail");
    menu.insertBefore(e, tsk);
  },

  displayAppmenu: function(targetId, targetObj) {
    let menuElem = document.getElementById("appmenu_enigmailMenuPlaceholder");
    this.displayMainMenu(menuElem);
    PanelUI.showSubView(targetId, targetObj);
  },

  displayMainMenu: function(menuPopup) {

    let usePep = EnigmailPEPAdapter.usingPep();
    let obj = menuPopup.firstChild;

    while (obj) {
      if (obj.getAttribute("enigmailtype") == "enigmail" || obj.getAttribute("advanced") == "true") {
        if (usePep) {
          obj.setAttribute("hidden", "true");
        }
        else {
          obj.removeAttribute("hidden");
        }
      }

      obj = obj.nextSibling;
    }

    if (!usePep) {
      EnigmailFuncs.collapseAdvanced(menuPopup, 'hidden', Enigmail.msg.updateOptionsDisplay());
    }

  },

  toggleAttribute: function(attrName) {
    EnigmailLog.DEBUG("enigmailMsgessengerOverlay.js: toggleAttribute('" + attrName + "')\n");

    var menuElement = document.getElementById("enigmail_" + attrName);

    var oldValue = EnigmailPrefs.getPref(attrName);
    EnigmailPrefs.setPref(attrName, !oldValue);

    this.updateOptionsDisplay();

    if (attrName == "autoDecrypt") {
      this.messageReload(false);
    }
  },

  /**
   * Determine if Autocrypt is enabled for the currently selected message
   */
  isAutocryptEnabled: function() {
    if (EnigmailPEPAdapter.usingPep()) {
      return false;
    }

    try {
      let email = EnigmailFuncs.stripEmail(gFolderDisplay.selectedMessage.recipients);
      let maybeIdent = EnigmailStdlib.getIdentityForEmail(email);

      if (maybeIdent && maybeIdent.identity) {
        if (!maybeIdent.identity.getBoolAttribute("enablePgp")) {
          return false;
        }

        let acct = EnigmailFuncs.getAccountForIdentity(maybeIdent.identity);
        return acct.incomingServer.getBoolValue("enableAutocrypt");
      }
    }
    catch (ex) {}

    return false;
  },

  messageImport: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageImport:\n");

    return this.messageParse(true, true, "", this.getCurrentMsgUriSpec(), false);
  },

  /***
   * check that handler for multipart/signed is set to Enigmail.
   * if handler is different, change it and reload message
   *
   * @return: - true if handler is OK
   *          - false if handler was changed and message is reloaded
   */
  checkPgpmimeHandler: function() {
    let uriSpec = this.getCurrentMsgUriSpec();
    if (uriSpec !== this.lastSMimeReloadURI) {
      if (EnigmailVerify.currentCtHandler !== EnigmailConstants.MIME_HANDLER_PGPMIME) {
        this.lastSMimeReloadURI = uriSpec;
        EnigmailVerify.registerContentTypeHandler();
        this.messageReload();
        return false;
      }
    }

    return true;
  },

  // callback function for automatic decryption
  messageAutoDecrypt: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageAutoDecrypt:\n");
    Enigmail.msg.messageDecrypt(null, true);
  },

  // analyse message header and decrypt/verify message
  messageDecrypt: function(event, isAuto) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageDecrypt: " + event + "\n");

    event = event ? true : false;
    var cbObj = {
      event: event,
      isAuto: isAuto
    };

    this.mimeParts = null;

    if (!isAuto) {
      EnigmailVerify.setManualUri(this.getCurrentMsgUriSpec());
    }

    let contentType = "text/plain";
    if ('content-type' in currentHeaderData) {
      contentType = currentHeaderData['content-type'].headerValue;
    }


    // don't parse message if we know it's a PGP/MIME message
    if (contentType.search(/^multipart\/encrypted(;|$)/i) === 0 && contentType.search(/application\/pgp-encrypted/i) > 0) {
      if (EnigmailPEPAdapter.usingPep()) {
        EnigmailPEPAdapter.processPGPMIME(currentHeaderData);
      }

      this.movePEPsubject();
      this.messageDecryptCb(event, isAuto, null);
      return;
    }
    else if (contentType.search(/^multipart\/signed(;|$)/i) === 0 && contentType.search(/application\/pgp-signature/i) > 0) {
      if (EnigmailPEPAdapter.usingPep()) {
        // treat PGP/MIME message like inline-PGP for the context of pEp
        this.hidePgpKeys();
        EnigmailPEPAdapter.processInlinePGP(this.getCurrentMsgUrl(), currentHeaderData);
      }

      this.movePEPsubject();
      this.messageDecryptCb(event, isAuto, null);
      return;
    }
    else if (EnigmailPEPAdapter.usingPep()) {
      this.hidePgpKeys();
      EnigmailPEPAdapter.processInlinePGP(this.getCurrentMsgUrl(), currentHeaderData);
    }

    try {
      EnigmailMime.getMimeTreeFromUrl(this.getCurrentMsgUrl().spec, false,
        function _cb(mimeMsg) {
          Enigmail.msg.messageDecryptCb(event, isAuto, mimeMsg);
        });
    }
    catch (ex) {
      EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageDecrypt: exception: " + ex.toString() + "\n");
      this.messageDecryptCb(event, isAuto, null);
    }
  },

  /***
   * walk through the (sub-) mime tree and determine PGP/MIME encrypted and signed message parts
   *
   * @param mimePart:  parent object to walk through
   * @param resultObj: object containing two arrays. The resultObj must be pre-initialized by the caller
   *                    - encrypted
   *                    - signed
   */
  enumerateMimeParts: function(mimePart, resultObj) {
    EnigmailLog.DEBUG("enumerateMimeParts: partNum=\"" + mimePart.partNum + "\"\n");
    EnigmailLog.DEBUG("                    " + mimePart.fullContentType + "\n");
    EnigmailLog.DEBUG("                    " + mimePart.subParts.length + " subparts\n");

    try {
      var ct = mimePart.fullContentType;
      if (typeof(ct) == "string") {
        ct = ct.replace(/[\r\n]/g, " ");
        if (ct.search(/multipart\/signed.*application\/pgp-signature/i) >= 0) {
          resultObj.signed.push(mimePart.partNum);
        }
        else if (ct.search(/application\/pgp-encrypted/i) >= 0) {
          resultObj.encrypted.push(mimePart.partNum);
        }
      }
    }
    catch (ex) {
      // catch exception if no headers or no content-type defined.
    }

    var i;
    for (i in mimePart.subParts) {
      this.enumerateMimeParts(mimePart.subParts[i], resultObj);
    }
  },

  messageDecryptCb: function(event, isAuto, mimeMsg) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageDecryptCb:\n");

    this.buggyExchangeEmailContent = null; // reinit HACK for MS-EXCHANGE-Server Problem

    let enigmailSvc;
    let contentType = "";
    try {

      if (!mimeMsg) {
        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageDecryptCb: mimeMsg is null\n");
        try {
          contentType = currentHeaderData['content-type'].headerValue;
        }
        catch (ex) {
          contentType = "text/plain";
        }
        mimeMsg = {
          partNum: "1",
          headers: {
            has: function() {
              return false;
            },
            contentType: {
              type: contentType,
              mediatype: "",
              subtype: ""
            }
          },
          fullContentType: contentType,
          body: "",
          parent: null,
          subParts: []
        };
      }

      this.hideNonStandardMimeStructure(mimeMsg);

      // Copy selected headers
      Enigmail.msg.savedHeaders = {
        autocrypt: []
      };

      for (let h in currentHeaderData) {
        if (h.search(/^autocrypt\d*$/) === 0) {
          Enigmail.msg.savedHeaders.autocrypt.push(currentHeaderData[h].headerValue);
        }
      }

      if (!mimeMsg.fullContentType) {
        mimeMsg.fullContentType = "text/plain";
      }

      Enigmail.msg.savedHeaders["content-type"] = mimeMsg.fullContentType;
      this.mimeParts = mimeMsg;

      for (var index = 0; index < Enigmail.msg.headersList.length; index++) {
        var headerName = Enigmail.msg.headersList[index];
        var headerValue = "";

        if (mimeMsg.headers.has(headerName)) {
          let h = mimeMsg.headers.get(headerName);
          if (Array.isArray(h)) {
            headerValue = h.join("");
          }
          else {
            headerValue = h;
          }
        }
        Enigmail.msg.savedHeaders[headerName] = headerValue;
        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: header " + headerName + ": '" + headerValue + "'\n");
      }

      if (("autocrypt" in Enigmail.msg.savedHeaders) && Enigmail.msg.savedHeaders.autocrypt.length > 0 &&
        ("from" in currentHeaderData)) {

        let dateValue = "";
        if ("date" in currentHeaderData) {
          dateValue = currentHeaderData.date.headerValue;
        }

        EnigmailAutocrypt.processAutocryptHeader(currentHeaderData.from.headerValue, Enigmail.msg.savedHeaders.autocrypt,
          dateValue, Enigmail.msg.isAutocryptEnabled());
      }
      else {
        Enigmail.msg.createArtificialAutocryptHeader();
      }

      var msgSigned = (mimeMsg.fullContentType.search(/^multipart\/signed/i) === 0 &&
        EnigmailMime.getProtocol(mimeMsg.fullContentType).search(/^application\/pgp-signature/i) === 0);
      var msgEncrypted = (mimeMsg.fullContentType.search(/^multipart\/encrypted/i) === 0 &&
        EnigmailMime.getProtocol(mimeMsg.fullContentType).search(/^application\/pgp-encrypted/i) === 0);
      var resultObj = {
        encrypted: [],
        signed: []
      };

      if (mimeMsg.subParts.length > 0) {
        this.enumerateMimeParts(mimeMsg, resultObj);
        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: embedded objects: " + resultObj.encrypted.join(", ") + " / " + resultObj.signed.join(", ") + "\n");

        msgSigned = msgSigned || resultObj.signed.length > 0;
        msgEncrypted = msgEncrypted || resultObj.encrypted.length > 0;

        if ("autocrypt-setup-message" in Enigmail.msg.savedHeaders && Enigmail.msg.savedHeaders["autocrypt-setup-message"].toLowerCase() === "v1") {
          if (currentAttachments[0].contentType.search(/^application\/autocrypt-setup$/i) === 0) {
            Enigmail.hdrView.displayAutoCryptSetupMsgHeader();
            return;
          }
        }

        // HACK for Zimbra OpenPGP Zimlet
        // Zimbra illegally changes attachment content-type to application/pgp-encrypted which interfers with below
        // see https://sourceforge.net/p/enigmail/bugs/600/

        try {

          if (mimeMsg.subParts.length > 1 &&
            mimeMsg.headers.has("x-mailer") && mimeMsg.headers.get("x-mailer")[0].indexOf("ZimbraWebClient") >= 0 &&
            mimeMsg.subParts[0].fullContentType.indexOf("text/plain") >= 0 &&
            mimeMsg.fullContentType.indexOf("multipart/mixed") >= 0 &&
            mimeMsg.subParts[1].fullContentType.indexOf("application/pgp-encrypted") >= 0) {
            this.messageParse(event, false, Enigmail.msg.savedHeaders["content-transfer-encoding"], this.getCurrentMsgUriSpec(), isAuto);
            return;
          }
        }
        catch (ex) {}


        // HACK for MS-EXCHANGE-Server Problem:
        // check for possible bad mime structure due to buggy exchange server:
        // - multipart/mixed Container with
        //   - application/pgp-encrypted Attachment with name "PGPMIME Versions Identification"
        //   - application/octet-stream Attachment with name "encrypted.asc" having the encrypted content in base64
        // - see:
        //   - http://www.mozilla-enigmail.org/forum/viewtopic.php?f=4&t=425
        //   - http://sourceforge.net/p/enigmail/forum/support/thread/4add2b69/

        // iPGMail produces a similar broken structure, see here:
        //   - https://sourceforge.net/p/enigmail/forum/support/thread/afc9c246/#5de7

        if (mimeMsg.subParts.length == 3 &&
          mimeMsg.fullContentType.search(/multipart\/mixed/i) >= 0 &&
          mimeMsg.subParts[0].fullContentType.search(/multipart\/encrypted/i) < 0 &&
          mimeMsg.subParts[0].fullContentType.search(/text\/(plain|html)/i) >= 0 &&
          mimeMsg.subParts[1].fullContentType.search(/application\/pgp-encrypted/i) >= 0) {
          if (mimeMsg.subParts[1].fullContentType.search(/multipart\/encrypted/i) < 0 &&
            mimeMsg.subParts[1].fullContentType.search(/PGP\/?MIME Versions? Identification/i) >= 0 &&
            mimeMsg.subParts[2].fullContentType.search(/application\/octet-stream/i) >= 0 &&
            mimeMsg.subParts[2].fullContentType.search(/encrypted.asc/i) >= 0) {
            this.buggyMailType = "exchange";
          }
          else {
            this.buggyMailType = "iPGMail";
          }

          // signal that the structure matches to save the content later on
          EnigmailLog.DEBUG("enigmailMessengerOverlay: messageDecryptCb: enabling MS-Exchange hack\n");
          this.buggyExchangeEmailContent = "???";

          this.buggyMailHeader();
          return;
        }
      }

      var contentEncoding = "";
      var xEnigmailVersion = "";
      var msgUriSpec = this.getCurrentMsgUriSpec();

      if (Enigmail.msg.savedHeaders) {
        contentType = Enigmail.msg.savedHeaders["content-type"];
        contentEncoding = Enigmail.msg.savedHeaders["content-transfer-encoding"];
        xEnigmailVersion = Enigmail.msg.savedHeaders["x-enigmail-version"];
      }

      let smime = (contentType.search(/multipart\/signed; protocol="application\/pkcs7-signature/i) >= 0);
      if (!smime && (msgSigned || msgEncrypted)) {
        // PGP/MIME messages
        enigmailSvc = Enigmail.getEnigmailSvc();
        if (!enigmailSvc) {
          return;
        }

        if (!Enigmail.msg.checkPgpmimeHandler()) {
          return;
        }

        if (isAuto && (!EnigmailPrefs.getPref("autoDecrypt"))) {

          if (EnigmailVerify.getManualUri() != this.getCurrentMsgUriSpec()) {
            // decryption set to manual
            Enigmail.hdrView.updateHdrIcons(EnigmailConstants.POSSIBLE_PGPMIME, 0, // exitCode, statusFlags
              "", "", // keyId, userId
              "", // sigDetails
              EnigmailLocale.getString("possiblyPgpMime"), // infoMsg
              null, // blockSeparation
              "", // encToDetails
              null); // xtraStatus
          }
        }
        else if (!isAuto) {
          Enigmail.msg.messageReload(false);
        }
        return;
      }

      // inline-PGP messages
      if (!isAuto || EnigmailPrefs.getPref("autoDecrypt")) {
        this.messageParse(event, false, contentEncoding, msgUriSpec, isAuto);
      }
    }
    catch (ex) {
      EnigmailLog.writeException("enigmailMessengerOverlay.js: messageDecryptCb", ex);
    }
  },

  getPostboxNumContainers: function() {
    if (EnigmailCompat.isPostbox()) {
      let contentDocument = document.getElementById('messagepane').contentDocument;
      let messageContainers = contentDocument.getElementsByClassName('message-container');
      return messageContainers.length;
    }
    else
      return -1;
  },

  hideNonStandardMimeStructure: function(mimeMsg) {
    if (Enigmail.msg.securityInfo === null) return;
    if (Enigmail.msg.securityInfo.encryptedMimePart === "1") return;
    if (!((Enigmail.msg.securityInfo.statusFlags & EnigmailConstants.PGP_MIME_SIGNED) !== 0 &&
        (Enigmail.msg.securityInfo.statusFlags & EnigmailConstants.DECRYPTION_OKAY) === 0)) return;

    if (Enigmail.msg.securityInfo.encryptedMimePart === "1.1" &&
      mimeMsg.subParts.length === 2 &&
      mimeMsg.headers.contentType.type === "multipart/mixed" &&
      mimeMsg.subParts[1].headers.contentType.type === "text/plain") return;

    // Hide status bar for PGP/MIME signed messages, if we found a non-standard message structure
    Enigmail.msg.securityInfo.statusFlags = 0;
    Enigmail.msg.securityInfo.statusLine = "";
    Enigmail.msg.securityInfo.statusInfo = "";
    Enigmail.hdrView.displayStatusBar();
    let signedUINode = Enigmail.hdrView.getSignedIcon();
    signedUINode.removeAttribute("signed");
    signedUINode.collapsed = true;
  },

  // display header about reparing buggy MS-Exchange messages
  buggyMailHeader: function() {
    let uriStr = EnigmailURIs.createMessageURI(this.getCurrentMsgUrl(),
      "message/rfc822",
      "",
      "??",
      false);

    let ph = new EnigmailProtocolHandler();
    let uri = ph.newURI(uriStr, "", "");
    Enigmail.hdrView.headerPane.updateSecurityStatus("", 0, 0, "", "", "", "", "", uri, "", "1");
  },

  messageParse: function(interactive, importOnly, contentEncoding, msgUriSpec, isAuto, pbMessageIndex = '0') {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParse: " + interactive + "\n");

    var bodyElement = this.getBodyElement(pbMessageIndex);
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: bodyElement=" + bodyElement + "\n");

    if (!bodyElement) {
      return;
    }

    let topElement = bodyElement;
    var findStr = /* interactive ? null : */ "-----BEGIN PGP";
    var msgText = null;
    var foundIndex = -1;

    if (bodyElement.firstChild) {
      let node = bodyElement.firstChild;
      while (node) {
        if (node.firstChild &&
          node.firstChild.nodeName == "LEGEND" &&
          node.firstChild.className == "mimeAttachmentHeaderName") {
          // we reached the area where inline attachments are displayed
          // --> don't try to decrypt displayed inline attachments
          break;
        }
        if (node.firstChild &&
          node.firstChild.nodeName.toUpperCase() == "LEGEND" &&
          node.firstChild.className == "mimeAttachmentHeaderName") {
          // we reached the area where inline attachments are displayed
          // --> don't try to decrypt displayed inline attachments
          break;
        }
        if (node.nodeName === "DIV") {
          foundIndex = node.textContent.indexOf(findStr);

          if (foundIndex >= 0) {
            if (node.textContent.indexOf(findStr + " LICENSE AUTHORIZATION") == foundIndex) {
              foundIndex = -1;
            }
          }

          if (foundIndex === 0) {
            bodyElement = node;
            break;
          }
          if (foundIndex > 0 && node.textContent.substr(foundIndex - 1, 1).search(/[\r\n]/) === 0) {
            bodyElement = node;
            break;
          }
        }
        node = node.nextSibling;
      }
    }

    if (foundIndex >= 0 && (!this.hasInlineQuote(topElement))) {
      if (Enigmail.msg.savedHeaders["content-type"].search(/^text\/html/i) === 0) {
        let p = Cc["@mozilla.org/parserutils;1"].createInstance(Ci.nsIParserUtils);
        const de = Ci.nsIDocumentEncoder;
        msgText = p.convertToPlainText(topElement.innerHTML, de.OutputRaw | de.OutputBodyOnly, 0);
      }
      else {
        msgText = bodyElement.textContent;
      }
      msgText = EnigmailMsgRead.trimAllLines(msgText);
    }

    if (!msgText) {
      // No PGP content

      // but this might be caused by the HACK for MS-EXCHANGE-Server Problem
      // - so return only if:
      if (!this.buggyExchangeEmailContent || this.buggyExchangeEmailContent == "???") {
        return;
      }

      EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParse: got buggyExchangeEmailContent = " + this.buggyExchangeEmailContent.substr(0, 50) + "\n");

      // fix the whole invalid email by replacing the contents by the decoded text
      // as plain inline format
      if (this.displayBuggyExchangeMail()) {
        return;
      }
      else {
        msgText = this.buggyExchangeEmailContent;
      }

      msgText = msgText.replace(/\r\n/g, "\n");
      msgText = msgText.replace(/\r/g, "\n");

      // content is in encrypted.asc part:
      let idx = msgText.search(/Content-Type: application\/octet-stream; name="encrypted.asc"/i);
      if (idx >= 0) {
        msgText = msgText.slice(idx);
      }
      // check whether we have base64 encoding
      var isBase64 = false;
      idx = msgText.search(/Content-Transfer-Encoding: base64/i);
      if (idx >= 0) {
        isBase64 = true;
      }
      // find content behind part header
      idx = msgText.search(/\n\n/);
      if (idx >= 0) {
        msgText = msgText.slice(idx);
      }
      // remove stuff behind content block (usually a final boundary row)
      idx = msgText.search(/\n\n--/);
      if (idx >= 0) {
        msgText = msgText.slice(0, idx + 1);
      }
      // decode base64 if it is encoded that way
      if (isBase64) {
        try {
          msgText = EnigmailData.decodeBase64(msgText);
        }
        catch (ex) {
          EnigmailLog.writeException("enigmailMessengerOverlay.js: decodeBase64() ", ex);
        }
        //EnigmailLog.DEBUG("nach base64 decode: \n" + msgText + "\n");
      }
    }

    var charset = msgWindow ? msgWindow.mailCharacterSet : "";

    // Encode ciphertext to charset from unicode
    msgText = EnigmailData.convertFromUnicode(msgText, charset);

    if (isAuto) {
      let ht = this.determineHeadAndTail(msgText);
      if (ht) {
        Enigmail.hdrView.updateHdrIcons(0, ht, "", "", "", "", null, "", "process-manually");
        return;
      }
    }
    var mozPlainText = bodyElement.innerHTML.search(/class="moz-text-plain"/);

    if ((mozPlainText >= 0) && (mozPlainText < 40)) {
      // workaround for too much expanded emoticons in plaintext msg
      var r = new RegExp(/( )(;-\)|:-\)|;\)|:\)|:-\(|:\(|:-\\|:-P|:-D|:-\[|:-\*|>:o|8-\)|:-\$|:-X|=-O|:-!|O:-\)|:'\()( )/g);
      if (msgText.search(r) >= 0) {
        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParse: performing emoticons fixing\n");
        msgText = msgText.replace(r, "$2");
      }
    }

    // extract text following armored block
    var head = "";
    var tail = "";
    if (findStr) {
      var endStart = msgText.indexOf("-----END PGP");
      var nextLine = msgText.substring(endStart).search(/[\n\r]/);
      if (nextLine > 0) {
        tail = msgText.substring(endStart + nextLine).replace(/^[\n\r\s]*/, "");
      }
    }

    //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: msgText='"+msgText+"'\n");

    var mailNewsUrl = EnigmailMsgRead.getUrlFromUriSpec(msgUriSpec);

    var urlSpec = mailNewsUrl ? mailNewsUrl.spec : "";

    let retry = (charset != "UTF-8" ? 1 : 2);

    Enigmail.msg.messageParseCallback(msgText, contentEncoding, charset, interactive,
      importOnly, urlSpec, "", retry, head, tail,
      msgUriSpec, isAuto, pbMessageIndex);
  },

  hasInlineQuote: function(node) {
    if (node.innerHTML.search(/<blockquote.*-----BEGIN PGP /i) < 0) {
      return false;
    }

    return EnigmailMsgRead.searchQuotedPgp(node);
  },

  determineHeadAndTail: function(msgText) {
    let startIndex = msgText.search(/-----BEGIN PGP (SIGNED )?MESSAGE-----/m);
    let endIndex = msgText.search(/-----END PGP (SIGNED )?MESSAGE-----/m);
    let hasHead = false;
    let hasTail = false;
    let crypto = 0;

    if (startIndex > 0) {
      let pgpMsg = msgText.match(/(-----BEGIN PGP (SIGNED )?MESSAGE-----)/m)[0];
      if (pgpMsg.search(/SIGNED/) > 0) {
        crypto = EnigmailConstants.UNVERIFIED_SIGNATURE;
      }
      else {
        crypto = EnigmailConstants.DECRYPTION_FAILED;
      }
      let startSection = msgText.substr(0, startIndex - 1);
      hasHead = (startSection.search(/\S/) >= 0);
    }

    if (endIndex > startIndex) {
      let nextLine = msgText.substring(endIndex).search(/[\n\r]/);
      if (nextLine > 0) {
        hasTail = (msgText.substring(endIndex + nextLine).search(/\S/) >= 0);
      }
    }

    if (hasHead || hasTail) {
      return EnigmailConstants.PARTIALLY_PGP | crypto;
    }

    return 0;
  },

  getBodyElement: function(pbMessageIndex = '0') {
    let bodyElement = null;

    if (!EnigmailCompat.isPostbox()) {
      // Thunderbird
      let msgFrame = EnigmailWindows.getFrame(window, "messagepane");
      if (msgFrame) {
        // TB < 69
        bodyElement = msgFrame.document.getElementsByTagName("body")[0];
      }
      else {
        // TB >= 69
        msgFrame = document.getElementById('messagepane');
        bodyElement = msgFrame.contentDocument.getElementsByTagName("body")[0];
      }
    }
    else {
      // Postbox
      let messagePaneDocument = document.getElementById('messagepane').contentDocument;
      let iframe = messagePaneDocument.getElementById('flyingpigs' + pbMessageIndex);
      if (iframe) {
        bodyElement = iframe.contentDocument.getElementsByTagName("body")[0];
      }
      else return null;
    }
    return bodyElement;
  },


  messageParseCallback: function(msgText, contentEncoding, charset, interactive,
    importOnly, messageUrl, signature, retry, head, tail, msgUriSpec, isAuto,
    pbMessageIndex) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParseCallback: " + interactive + ", " + interactive + ", importOnly=" + importOnly + ", charset=" + charset + ", msgUrl=" +
      messageUrl +
      ", retry=" + retry + ", signature='" + signature + "'\n");

    if (!msgText) {
      return;
    }

    var enigmailSvc = Enigmail.getEnigmailSvc();
    if (!enigmailSvc) {
      return;
    }

    var plainText;
    var exitCode;
    var newSignature = "";
    var statusFlags = 0;

    var errorMsgObj = {
      value: ""
    };
    var keyIdObj = {};
    var userIdObj = {};
    var sigDetailsObj = {};
    var encToDetailsObj = {};
    var pEpResult = null;

    var blockSeparationObj = {
      value: ""
    };

    if (importOnly) {
      // Import public key
      this.importKeyFromMsgBody(msgText);
      return;
    }
    else {

      let armorHeaders = EnigmailArmor.getArmorHeaders(msgText);
      if ("charset" in armorHeaders) {
        charset = armorHeaders.charset;
        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParseCallback: OVERRIDING charset=" + charset + "\n");
      }

      var exitCodeObj = {};
      var statusFlagsObj = {};
      var signatureObj = {};
      signatureObj.value = signature;

      var uiFlags = interactive ? (EnigmailConstants.UI_INTERACTIVE |
        EnigmailConstants.UI_ALLOW_KEY_IMPORT |
        EnigmailConstants.UI_UNVERIFIED_ENC_OK) : 0;

      if (EnigmailPEPAdapter.usingPep()) {
        let addresses = {
          from: null,
          to: EnigmailFuncs.parseEmails(gFolderDisplay.selectedMessage.recipients),
          cc: EnigmailFuncs.parseEmails(gFolderDisplay.selectedMessage.ccList)
        };
        let fromAddr = EnigmailFuncs.parseEmails(gFolderDisplay.selectedMessage.author);
        if (fromAddr.length > 0) {
          addresses.from = fromAddr[0];
        }

        pEpResult = EnigmailPEPDecrypt.decryptMessageData(false, msgText, addresses);
        if (pEpResult) {
          plainText = pEpResult.longmsg;
          if (pEpResult.shortmsg.length > 0) {
            Enigmail.hdrView.setSubject(pEpResult.shortmsg);
          }
          exitCode = 0;
        }
        else {
          plainText = "";
          exitCode = 1;
        }
      }
      else {
        plainText = EnigmailDecryption.decryptMessage(window, uiFlags, msgText,
          signatureObj, exitCodeObj, statusFlagsObj,
          keyIdObj, userIdObj, sigDetailsObj,
          errorMsgObj, blockSeparationObj, encToDetailsObj);

        //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParseCallback: plainText='"+plainText+"'\n");

        exitCode = exitCodeObj.value;
        newSignature = signatureObj.value;

        if (plainText === "" && exitCode === 0) {
          plainText = " ";
        }

        statusFlags = statusFlagsObj.value;

        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: messageParseCallback: newSignature='" + newSignature + "'\n");
      }
    }

    var errorMsg = errorMsgObj.value;

    if (importOnly) {
      if (interactive && errorMsg) {
        EnigmailDialog.alert(window, errorMsg);
      }
      return;
    }

    var displayedUriSpec = Enigmail.msg.getCurrentMsgUriSpec();
    if (!msgUriSpec || (displayedUriSpec == msgUriSpec)) {
      if (EnigmailPEPAdapter.usingPep() && pEpResult) {
        Enigmail.hdrView.displayPepStatus(pEpResult.rating, pEpResult.fpr, null, pEpResult.persons);
      }
      else {
        if (tail.length > 0) {
          statusFlags |= EnigmailConstants.PARTIALLY_PGP;
        }
        Enigmail.hdrView.updateHdrIcons(exitCode, statusFlags, keyIdObj.value, userIdObj.value,
          sigDetailsObj.value,
          errorMsg,
          null, // blockSeparation
          encToDetailsObj.value,
          null); // xtraStatus
      }
    }

    var noSecondTry = EnigmailConstants.GOOD_SIGNATURE |
      EnigmailConstants.EXPIRED_SIGNATURE |
      EnigmailConstants.EXPIRED_KEY_SIGNATURE |
      EnigmailConstants.EXPIRED_KEY |
      EnigmailConstants.REVOKED_KEY |
      EnigmailConstants.NO_PUBKEY |
      EnigmailConstants.NO_SECKEY |
      EnigmailConstants.IMPORTED_KEY |
      EnigmailConstants.MISSING_PASSPHRASE |
      EnigmailConstants.BAD_PASSPHRASE |
      EnigmailConstants.UNKNOWN_ALGO |
      EnigmailConstants.DECRYPTION_OKAY |
      EnigmailConstants.OVERFLOWED;

    if ((exitCode !== 0) && (!(statusFlags & noSecondTry))) {
      // Bad signature/armor
      if (retry == 1) {
        msgText = EnigmailData.convertFromUnicode(msgText, "UTF-8");
        Enigmail.msg.messageParseCallback(msgText, contentEncoding, charset,
          interactive, importOnly, messageUrl,
          signature, retry + 1,
          head, tail, msgUriSpec, isAuto, pbMessageIndex);
        return;
      }
      else if (retry == 2) {
        // Try to verify signature by accessing raw message text directly
        // (avoid recursion by setting retry parameter to false on callback)
        newSignature = "";
        Enigmail.msg.msgDirectDecrypt(interactive, importOnly, contentEncoding, charset,
          newSignature, 0, head, tail, msgUriSpec,
          Enigmail.msg.messageParseCallback, isAuto);
        return;
      }
      else if (retry == 3) {
        msgText = EnigmailData.convertToUnicode(msgText, "UTF-8");
        Enigmail.msg.messageParseCallback(msgText, contentEncoding, charset, interactive,
          importOnly, messageUrl, null, retry + 1,
          head, tail, msgUriSpec, isAuto, pbMessageIndex);
        return;
      }
    }

    if (!plainText) {
      if (interactive && Enigmail.msg.securityInfo && Enigmail.msg.securityInfo.statusInfo) {
        EnigmailDialog.info(window, Enigmail.msg.securityInfo.statusInfo);
      }
      return;
    }

    if (retry >= 2) {
      plainText = EnigmailData.convertFromUnicode(EnigmailData.convertToUnicode(plainText, "UTF-8"), charset);
    }

    if (blockSeparationObj.value.indexOf(" ") >= 0) {
      var blocks = blockSeparationObj.value.split(/ /);
      var blockInfo = blocks[0].split(/:/);
      plainText = EnigmailData.convertFromUnicode(EnigmailLocale.getString("notePartEncrypted"), charset) +
        "\n\n" + plainText.substr(0, blockInfo[1]) + "\n\n" + EnigmailLocale.getString("noteCutMessage");
    }

    // Save decrypted message status, headers, and content
    var headerList = {
      "subject": "",
      "from": "",
      "date": "",
      "to": "",
      "cc": ""
    };

    var index,
      headerName;

    if (!gViewAllHeaders) {
      for (index = 0; index < headerList.length; index++) {
        headerList[index] = "";
      }

    }
    else {
      for (index = 0; index < gExpandedHeaderList.length; index++) {
        headerList[gExpandedHeaderList[index].name] = "";
      }

      for (headerName in currentHeaderData) {
        headerList[headerName] = "";
      }
    }

    for (headerName in headerList) {
      if (currentHeaderData[headerName]) {
        headerList[headerName] = currentHeaderData[headerName].headerValue;
      }
    }

    // WORKAROUND
    if (headerList.cc == headerList.to) {
      headerList.cc = "";
    }

    var hasAttachments = currentAttachments && currentAttachments.length;
    var attachmentsEncrypted = true;

    for (index in currentAttachments) {
      if (!Enigmail.msg.checkEncryptedAttach(currentAttachments[index])) {
        if (!EnigmailMsgRead.checkSignedAttachment(currentAttachments, index, currentAttachments)) {
          attachmentsEncrypted = false;
        }
      }
    }

    var msgRfc822Text = "";
    if (tail) {
      msgRfc822Text += EnigmailData.convertFromUnicode(EnigmailLocale.getString("beginPgpPart"), charset) + "\n\n";
    }
    msgRfc822Text += plainText;
    if (tail) {
      msgRfc822Text += "\n\n" + EnigmailData.convertFromUnicode(EnigmailLocale.getString("endPgpPart"), charset) + "\n\n" + tail;
    }

    Enigmail.msg.decryptedMessage = {
      url: messageUrl,
      uri: msgUriSpec,
      headerList: headerList,
      hasAttachments: hasAttachments,
      attachmentsEncrypted: attachmentsEncrypted,
      charset: charset,
      plainText: msgRfc822Text
    };

    // don't display decrypted message if message selection has changed
    displayedUriSpec = Enigmail.msg.getCurrentMsgUriSpec();
    if (msgUriSpec && displayedUriSpec && (displayedUriSpec != msgUriSpec)) {
      return;
    }


    // Create and load one-time message URI
    var messageContent = Enigmail.msg.getDecryptedMessage("message/rfc822", false);

    Enigmail.msg.noShowReload = true;
    var node;
    var bodyElement = Enigmail.msg.getBodyElement(pbMessageIndex);

    if (bodyElement.firstChild) {
      node = bodyElement.firstChild;

      while (node) {
        if (node.nodeName == "DIV") {
          // for safety reasons, we replace the complete visible message with
          // the decrypted or signed part (bug 983)
          node.innerHTML = EnigmailFuncs.formatPlaintextMsg(EnigmailData.convertToUnicode(messageContent, charset));
          Enigmail.msg.movePEPsubject();
          return;
        }
        node = node.nextSibling;
      }

      // if no <DIV> node is found, try with <PRE> (bug 24762)
      node = bodyElement.firstChild;
      while (node) {
        if (node.nodeName == "PRE") {
          node.innerHTML = EnigmailFuncs.formatPlaintextMsg(EnigmailData.convertToUnicode(messageContent, charset));
          Enigmail.msg.movePEPsubject();
          return;
        }
        node = node.nextSibling;
      }

      // HACK for MS-EXCHANGE-Server Problem:
      // - remove empty text/plain part
      //   and set message content as inner text
      // - missing:
      //   - signal in statusFlags so that we warn in Enigmail.hdrView.updateHdrIcons()
      if (this.buggyExchangeEmailContent) {
        if (this.displayBuggyExchangeMail()) {
          return;
        }

        EnigmailLog.DEBUG("enigmailMessengerOverlay: messageParseCallback: got broken MS-Exchange mime message\n");
        messageContent = messageContent.replace(/^\s{0,2}Content-Transfer-Encoding: quoted-printable\s*Content-Type: text\/plain;\s*charset=windows-1252/i, "");
        node = bodyElement.firstChild;
        while (node) {
          if (node.nodeName == "DIV") {
            node.innerHTML = EnigmailFuncs.formatPlaintextMsg(EnigmailData.convertToUnicode(messageContent, charset));
            Enigmail.hdrView.updateHdrIcons(exitCode, statusFlags, keyIdObj.value, userIdObj.value,
              sigDetailsObj.value,
              errorMsg,
              null, // blockSeparation
              encToDetailsObj.value,
              "buggyMailFormat");
            return;
          }
          node = node.nextSibling;
        }
      }

    }

    EnigmailLog.ERROR("enigmailMessengerOverlay.js: no node found to replace message display\n");

    return;
  },

  importKeyFromMsgBody: function(msgData) {
    let beginIndexObj = {};
    let endIndexObj = {};
    let indentStrObj = {};
    let blockType = EnigmailArmor.locateArmoredBlock(msgData, 0, "", beginIndexObj, endIndexObj, indentStrObj);
    if (!blockType || blockType !== "PUBLIC KEY BLOCK") {
      return;
    }

    let keyData = msgData.substring(beginIndexObj.value, endIndexObj.value);

    let errorMsgObj = {};
    let preview = EnigmailKey.getKeyListFromKeyBlock(keyData, errorMsgObj);
    if (errorMsgObj.value === "") {
      this.importKeyDataWithConfirmation(preview, keyData);
    }
    else {
      EnigmailDialog.alert(window, EnigmailLocale.getString("previewFailed") + "\n" + errorMsgObj.value);
    }
  },

  importKeyDataWithConfirmation: function(preview, keyData) {
    let exitStatus = -1,
      errorMsgObj = {};
    if (preview.length > 0) {
      if (preview.length == 1) {
        exitStatus = EnigmailDialog.confirmDlg(window, EnigmailLocale.getString("doImportOne", [preview[0].name, preview[0].id]));
      }
      else {
        exitStatus = EnigmailDialog.confirmDlg(window,
          EnigmailLocale.getString("doImportMultiple", [
            preview.map(function(a) {
              return "\t" + a.name + " (" + a.id + ")";
            }).join("\n")
          ]));
      }

      if (exitStatus) {
        try {
          exitStatus = EnigmailKeyRing.importKey(window, false, keyData, "", errorMsgObj);
        }
        catch (ex) {}

        if (exitStatus === 0) {
          var keyList = preview.map(function(a) {
            return a.id;
          });
          EnigmailDialog.keyImportDlg(window, keyList);
        }
        else {
          EnigmailDialog.alert(window, EnigmailLocale.getString("failKeyImport") + "\n" + errorMsgObj.value);
        }
      }
    }
    else {
      EnigmailDialog.alert(window, EnigmailLocale.getString("noKeyFound"));
    }
  },

  /**
   * Extract the subject from the 1st content line and move it to the subject line
   */
  movePEPsubject: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: movePEPsubject:\n");

    let bodyElement = this.getBodyElement();

    if (bodyElement && bodyElement.textContent.search(/^\r?\n?Subject: [^\r\n]+\r?\n\r?\n/i) === 0 &&
      ("subject" in currentHeaderData) &&
      currentHeaderData.subject.headerValue === "pEp") {

      if (gFolderDisplay.selectedMessage) {
        let m = EnigmailMime.extractSubjectFromBody(bodyElement.textContent);
        if (m) {
          let node = bodyElement.firstChild;
          let found = false;

          while ((!found) && node) {
            if (node.nodeName == "DIV") {
              node.innerHTML = EnigmailFuncs.formatPlaintextMsg(m.messageBody);
              found = true;
            }
            node = node.nextSibling;
          }

          // if no <DIV> node is found, try with <PRE> (bug 24762)
          node = bodyElement.firstChild;
          while ((!found) && node) {
            if (node.nodeName == "PRE") {
              node.innerHTML = EnigmailFuncs.formatPlaintextMsg(m.messageBody);
              found = true;
            }
            node = node.nextSibling;
          }

          Enigmail.hdrView.setSubject(m.subject);
        }
      }
    }
  },

  /**
   * Fix broken PGP/MIME messages from MS-Exchange by replacing the broken original
   * message with a fixed copy.
   *
   * no return
   */
  fixBuggyExchangeMail: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: fixBuggyExchangeMail:\n");

    function hideAndResetExchangePane() {
      document.getElementById("enigmailBrokenExchangeBox").setAttribute("collapsed", "true");
      document.getElementById("enigmailFixBrokenMessageProgress").setAttribute("collapsed", "true");
      document.getElementById("enigmailFixBrokenMessageButton").removeAttribute("collapsed");
    }

    document.getElementById("enigmailFixBrokenMessageButton").setAttribute("collapsed", "true");
    document.getElementById("enigmailFixBrokenMessageProgress").removeAttribute("collapsed");

    let msg = gFolderDisplay.messageDisplay.displayedMessage;

    let p = EnigmailFixExchangeMsg.fixExchangeMessage(msg, this.buggyMailType);
    p.then(
      function _success(msgKey) {
        // display message with given msgKey

        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: fixBuggyExchangeMail: _success: msgKey=" + msgKey + "\n");

        if (msgKey) {
          let index = gFolderDisplay.view.dbView.findIndexFromKey(msgKey, true);
          EnigmailLog.DEBUG("  ** index = " + index + "\n");

          EnigmailTimer.setTimeout(function() {
            gFolderDisplay.view.dbView.selectMsgByKey(msgKey);
          }, 750);
        }

        hideAndResetExchangePane();
      }
    );
    p.catch(function _rejected() {
      EnigmailDialog.alert(window, EnigmailLocale.getString("fixBrokenExchangeMsg.failed"));
      hideAndResetExchangePane();
    });
  },

  /**
   * Hide attachments containing OpenPGP keys
   */
  hidePgpKeys: function() {
    let keys = [];
    for (let i = 0; i < currentAttachments.length; i++) {
      if (currentAttachments[i].contentType.search(/^application\/pgp-keys/i) === 0) {
        keys.push(i);
      }
    }

    if (keys.length > 0) {
      let attachmentList = document.getElementById("attachmentList");

      for (let i = keys.length; i > 0; i--) {
        currentAttachments.splice(keys[i - 1], 1);
      }

      if (attachmentList) {
        // delete all keys from attachment list
        while (attachmentList.firstChild) {
          attachmentList.removeChild(attachmentList.firstChild);
        }

        // build new attachment list

        /* global gBuildAttachmentsForCurrentMsg: true */
        let orig = gBuildAttachmentsForCurrentMsg;
        gBuildAttachmentsForCurrentMsg = false;
        displayAttachmentsForExpandedView();
        gBuildAttachmentsForCurrentMsg = orig;
      }
    }

  },

  /**
   * Attempt to work around bug with headers of MS-Exchange message.
   * Reload message content
   *
   * @return: true:  message displayed
   *          false: could not handle message
   */
  displayBuggyExchangeMail: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: displayBuggyExchangeMail\n");
    let hdrs = Cc["@mozilla.org/messenger/mimeheaders;1"].createInstance(Ci.nsIMimeHeaders);
    hdrs.initialize(this.buggyExchangeEmailContent);
    let ct = hdrs.extractHeader("content-type", true);

    if (ct && ct.search(/^text\/plain/i) === 0) {
      let bi = this.buggyExchangeEmailContent.search(/\r?\n/);
      let boundary = this.buggyExchangeEmailContent.substr(2, bi - 2);
      let startMsg = this.buggyExchangeEmailContent.search(/\r?\n\r?\n/);
      let msgText;

      if (this.buggyMailType == "exchange") {
        msgText = 'Content-Type: multipart/encrypted; protocol="application/pgp-encrypted"; boundary="' + boundary + '"\r\n' +
          this.buggyExchangeEmailContent.substr(startMsg);
      }
      else {
        msgText = 'Content-Type: multipart/encrypted; protocol="application/pgp-encrypted"; boundary="' + boundary + '"\r\n' +
          "\r\n" + boundary + "\r\n" +
          "Content-Type: application/pgp-encrypted\r\n" +
          "Content-Description: PGP/MIME version identification\r\n\r\n" +
          "Version: 1\r\n\r\n" +
          this.buggyExchangeEmailContent.substr(startMsg).replace(/^Content-Type: +application\/pgp-encrypted/im,
            "Content-Type: application/octet-stream");

      }

      let enigmailSvc = Enigmail.getEnigmailSvc();
      if (!enigmailSvc) {
        return false;
      }

      let uri = EnigmailURIs.createMessageURI(this.getCurrentMsgUrl(),
        "message/rfc822",
        "",
        msgText,
        false);

      EnigmailVerify.setMsgWindow(msgWindow, null);
      messenger.loadURL(window, uri);

      // Thunderbird
      let atv = document.getElementById("attachmentView");
      if (atv) {
        atv.setAttribute("collapsed", "true");
      }

      // SeaMonkey
      let eab = document.getElementById("expandedAttachmentBox");
      if (eab) {
        eab.setAttribute("collapsed", "true");
      }

      return true;
    }

    return false;
  },

  // check if the attachment could be encrypted
  checkEncryptedAttach: function(attachment) {
    return (EnigmailMsgRead.getAttachmentName(attachment).match(/\.(gpg|pgp|asc)$/i) ||
      (attachment.contentType.match(/^application\/pgp(-.*)?$/i)) &&
      (attachment.contentType.search(/^application\/pgp-signature/i) < 0));
  },

  getDecryptedMessage: function(contentType, includeHeaders) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: getDecryptedMessage: " + contentType + ", " + includeHeaders + "\n");

    if (!Enigmail.msg.decryptedMessage) {
      return "No decrypted message found!\n";
    }

    var enigmailSvc = Enigmail.getEnigmailSvc();
    if (!enigmailSvc) {
      return "";
    }

    var headerList = Enigmail.msg.decryptedMessage.headerList;
    var statusLine = Enigmail.msg.securityInfo ? Enigmail.msg.securityInfo.statusLine : "";
    var contentData = "";
    var headerName;

    if (contentType == "message/rfc822") {
      // message/rfc822

      if (includeHeaders) {
        try {

          var msg = gFolderDisplay.selectedMessage;
          if (msg) {
            let msgHdr = {
              "From": msg.author,
              "Subject": msg.subject,
              "To": msg.recipients,
              "Cc": msg.ccList,
              "Date": EnigmailTime.getDateTime(msg.dateInSeconds, true, true)
            };


            if (gFolderDisplay.selectedMessageIsNews) {
              if (currentHeaderData.newsgroups) {
                msgHdr.Newsgroups = currentHeaderData.newsgroups.headerValue;
              }
            }

            for (let headerName in msgHdr) {
              if (msgHdr[headerName] && msgHdr[headerName].length > 0) {
                contentData += headerName + ": " + msgHdr[headerName] + "\r\n";
              }
            }

          }
        }
        catch (ex) {
          // the above seems to fail every now and then
          // so, here is the fallback
          for (let headerName in headerList) {
            let headerValue = headerList[headerName];
            contentData += headerName + ": " + headerValue + "\r\n";
          }
        }

        contentData += "Content-Type: text/plain";

        if (Enigmail.msg.decryptedMessage.charset) {
          contentData += "; charset=" + Enigmail.msg.decryptedMessage.charset;
        }

        contentData += "\r\n";
      }

      contentData += "\r\n";

      if (Enigmail.msg.decryptedMessage.hasAttachments && (!Enigmail.msg.decryptedMessage.attachmentsEncrypted)) {
        contentData += EnigmailData.convertFromUnicode(EnigmailLocale.getString("enigContentNote"), Enigmail.msg.decryptedMessage.charset);
      }

      contentData += Enigmail.msg.decryptedMessage.plainText;
    }
    else {
      // text/html or text/plain

      if (contentType == "text/html") {
        contentData += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=" + Enigmail.msg.decryptedMessage.charset + "\">\r\n";
        contentData += "<html><head></head><body>\r\n";
      }

      if (statusLine) {
        if (contentType == "text/html") {
          contentData += "<b>" + EnigmailLocale.getString("enigHeader") + "</b> " +
            EnigmailMsgRead.escapeTextForHTML(statusLine, false) + "<br>\r\n<hr>\r\n";
        }
        else {
          contentData += EnigmailLocale.getString("enigHeader") + " " + statusLine + "\r\n\r\n";
        }
      }

      if (includeHeaders) {
        for (headerName in headerList) {
          let headerValue = headerList[headerName];

          if (headerValue) {
            if (contentType == "text/html") {
              contentData += "<b>" + EnigmailMsgRead.escapeTextForHTML(headerName, false) + ":</b> " +
                EnigmailMsgRead.escapeTextForHTML(headerValue, false) + "<br>\r\n";
            }
            else {
              contentData += headerName + ": " + headerValue + "\r\n";
            }
          }
        }
      }

      if (contentType == "text/html") {
        contentData += "<pre>" + EnigmailMsgRead.escapeTextForHTML(Enigmail.msg.decryptedMessage.plainText, false) + "</pre>\r\n";

        contentData += "</body></html>\r\n";
      }
      else {
        contentData += "\r\n" + Enigmail.msg.decryptedMessage.plainText;
      }

      if (!(EnigmailOS.isDosLike)) {
        contentData = contentData.replace(/\r\n/g, "\n");
      }
    }

    return contentData;
  },


  msgDefaultPrint: function(elementId) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: this.msgDefaultPrint: " + elementId + "\n");

    goDoCommand(elementId.indexOf("printpreview") >= 0 ? "cmd_printpreview" : "cmd_print");
  },

  msgPrint: function(elementId) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: msgPrint: " + elementId + "\n");

    var contextMenu = (elementId.search("Context") > -1);

    if (!Enigmail.msg.decryptedMessage || typeof(Enigmail.msg.decryptedMessage) == "undefined") {
      this.msgDefaultPrint(elementId);
      return;
    }

    var mailNewsUrl = this.getCurrentMsgUrl();

    if (!mailNewsUrl) {
      this.msgDefaultPrint(elementId);
      return;
    }

    if (Enigmail.msg.decryptedMessage.url != mailNewsUrl.spec) {
      Enigmail.msg.decryptedMessage = null;
      this.msgDefaultPrint(elementId);
      return;
    }

    var enigmailSvc = Enigmail.getEnigmailSvc();
    if (!enigmailSvc) {
      this.msgDefaultPrint(elementId);
      return;
    }

    // Note: Trying to print text/html content does not seem to work with
    //       non-ASCII chars
    var msgContent = this.getDecryptedMessage("message/rfc822", true);

    var uri = EnigmailURIs.createMessageURI(Enigmail.msg.decryptedMessage.url,
      "message/rfc822",
      "",
      msgContent,
      false);
    Enigmail.msg.createdURIs.push(uri);

    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: msgPrint: uri=" + uri + "\n");

    var messageList = [uri];
    var printPreview = (elementId.indexOf("printpreview") >= 0);

    window.openDialog("chrome://messenger/content/msgPrintEngine.xul",
      "",
      "chrome,dialog=no,all,centerscreen",
      1, messageList, statusFeedback,
      printPreview, Ci.nsIMsgPrintEngine.MNAB_PRINTPREVIEW_MSG,
      window);

    return;
  },

  msgDirectDecrypt: function(interactive, importOnly, contentEncoding, charset, signature,
    bufferSize, head, tail, msgUriSpec, callbackFunction, isAuto) {
    EnigmailLog.WRITE("enigmailMessengerOverlay.js: msgDirectDecrypt: contentEncoding=" + contentEncoding + ", signature=" + signature + "\n");
    var mailNewsUrl = this.getCurrentMsgUrl();
    if (!mailNewsUrl) {
      return;
    }

    var callbackArg = {
      interactive: interactive,
      importOnly: importOnly,
      contentEncoding: contentEncoding,
      charset: charset,
      messageUrl: mailNewsUrl.spec,
      msgUriSpec: msgUriSpec,
      signature: signature,
      data: "",
      head: head,
      tail: tail,
      isAuto: isAuto,
      callbackFunction: callbackFunction
    };

    var msgSvc = messenger.messageServiceFromURI(msgUriSpec);

    var listener = {
      QueryInterface: EnigmailCompat.generateQI(["nsIStreamListener"]),
      onStartRequest: function() {
        this.data = "";
        this.inStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);

      },
      onStopRequest: function() {
        var start = this.data.indexOf("-----BEGIN PGP");
        var end = this.data.indexOf("-----END PGP");

        if (start >= 0 && end > start) {
          var tStr = this.data.substr(end);
          var n = tStr.indexOf("\n");
          var r = tStr.indexOf("\r");
          var lEnd = -1;
          if (n >= 0 && r >= 0) {
            lEnd = Math.min(r, n);
          }
          else if (r >= 0) {
            lEnd = r;
          }
          else if (n >= 0) {
            lEnd = n;
          }

          if (lEnd >= 0) {
            end += lEnd;
          }

          callbackArg.data = this.data.substring(start, end + 1);
          EnigmailLog.DEBUG("enigmailMessengerOverlay.js: data: >" + callbackArg.data.substr(0, 100) + "<\n");
          Enigmail.msg.msgDirectCallback(callbackArg);
        }
      }
    };

    if (EnigmailCompat.isMessageUriInPgpMime()) {
      // TB >= 67
      listener.onDataAvailable = function(req, stream, offset, count) {
        this.inStream.init(stream);
        this.data += this.inStream.read(count);
      };
    }
    else {
      listener.onDataAvailable = function(req, ctxt, stream, offset, count) {
        this.inStream.init(stream);
        this.data += this.inStream.read(count);
      };
    }


    msgSvc.streamMessage(msgUriSpec,
      listener,
      msgWindow,
      null,
      false,
      null,
      false);

  },


  msgDirectCallback: function(callbackArg) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: msgDirectCallback: \n");

    var mailNewsUrl = Enigmail.msg.getCurrentMsgUrl();
    var urlSpec = mailNewsUrl ? mailNewsUrl.spec : "";
    var newBufferSize = 0;

    var l = urlSpec.length;

    if (urlSpec.substr(0, l) != callbackArg.messageUrl.substr(0, l)) {
      EnigmailLog.ERROR("enigmailMessengerOverlay.js: msgDirectCallback: Message URL mismatch " + mailNewsUrl.spec + " vs. " + callbackArg.messageUrl + "\n");
      return;
    }

    var msgText = callbackArg.data;
    msgText = EnigmailData.convertFromUnicode(msgText, "UTF-8");

    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: msgDirectCallback: msgText='" + msgText.substr(0, 100) + "'\n");

    var f = function(argList) {
      var msgText = argList[0];
      var cb = argList[1];
      cb.callbackFunction(msgText, cb.contentEncoding,
        cb.charset,
        cb.interactive,
        cb.importOnly,
        cb.messageUrl,
        cb.signature,
        3,
        cb.head,
        cb.tail,
        cb.msgUriSpec,
        cb.isAuto);
    };

    EnigmailEvents.dispatchEvent(f, 0, [msgText, callbackArg]);
  },


  revealAttachments: function(index) {
    if (!index) {
      index = 0;
    }

    if (index < currentAttachments.length) {
      this.handleAttachment("revealName/" + index.toString(), currentAttachments[index]);
    }
  },

  // handle the attachment view toggle
  handleAttchmentEvent: function() {
    let attList = document.getElementById("attachmentList");

    let clickFunc = function(event) {
      Enigmail.msg.attachmentListClick('attachmentList', event);
    };

    if (attList && attList.itemCount > 0) {
      for (let i = 0; i < attList.itemCount; i++) {
        let att = attList.getItemAtIndex(i);
        att.addEventListener("click", clickFunc, true);
      }
    }
  },

  // handle a selected attachment (decrypt & open or save)
  handleAttachmentSel: function(actionType, selectedItem = null) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: handleAttachmentSel: actionType=" + actionType + "\n");

    let selectedAttachments, anAttachment, contextMenu;

    if (EnigmailCompat.isPostbox()) {
      // Postbox
      if (!selectedItem) {
        contextMenu = document.getElementById('msgPaneAttachmentContextMenu');
        /* global gatherSelectedAttachmentsForMessage: false */
        selectedAttachments = gatherSelectedAttachmentsForMessage(contextMenu.target);
        anAttachment = selectedAttachments[0];
      }
      else {
        anAttachment = selectedItem;
      }
    }
    else {
      // Thunderbird
      selectedAttachments = Enigmail.hdrView.getSelectedAttachment();
      anAttachment = selectedAttachments[0];
    }

    switch (actionType) {
      case "saveAttachment":
      case "openAttachment":
      case "importKey":
      case "revealName":
        this.handleAttachment(actionType, anAttachment);
        break;
      case "verifySig":
        this.verifyDetachedSignature(anAttachment);
        break;
    }
  },

  /**
   * save the original file plus the signature file to disk and then verify the signature
   */
  verifyDetachedSignature: function(anAttachment) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: verifyDetachedSignature: url=" + anAttachment.url + "\n");

    var enigmailSvc = Enigmail.getEnigmailSvc();
    if (!enigmailSvc) {
      return;
    }

    var origAtt,
      signatureAtt;
    var isEncrypted = false;

    if ((EnigmailMsgRead.getAttachmentName(anAttachment).search(/\.sig$/i) > 0) ||
      (anAttachment.contentType.search(/^application\/pgp-signature/i) === 0)) {
      // we have the .sig file; need to know the original file;

      signatureAtt = anAttachment;
      var origName = EnigmailMsgRead.getAttachmentName(anAttachment).replace(/\.sig$/i, "");

      for (let i = 0; i < currentAttachments.length; i++) {
        if (origName == EnigmailMsgRead.getAttachmentName(currentAttachments[i])) {
          origAtt = currentAttachments[i];
          break;
        }
      }

      if (!origAtt) {
        for (let i = 0; i < currentAttachments.length; i++) {
          if (origName == EnigmailMsgRead.getAttachmentName(currentAttachments[i]).replace(/\.pgp$/i, "")) {
            isEncrypted = true;
            origAtt = currentAttachments[i];
            break;
          }
        }
      }
    }
    else {
      // we have a supposedly original file; need to know the .sig file;

      origAtt = anAttachment;
      var attachName = EnigmailMsgRead.getAttachmentName(anAttachment);
      var sigName = attachName + ".sig";

      for (let i = 0; i < currentAttachments.length; i++) {
        if (sigName == EnigmailMsgRead.getAttachmentName(currentAttachments[i])) {
          signatureAtt = currentAttachments[i];
          break;
        }
      }

      if (!signatureAtt && attachName.search(/\.pgp$/i) > 0) {
        sigName = attachName.replace(/\.pgp$/i, '.sig');
        for (let i = 0; i < currentAttachments.length; i++) {
          if (sigName == EnigmailMsgRead.getAttachmentName(currentAttachments[i])) {
            isEncrypted = true;
            signatureAtt = currentAttachments[i];
            break;
          }
        }
      }
    }

    if (!signatureAtt) {
      EnigmailDialog.alert(window, EnigmailLocale.getString("attachment.noMatchToSignature", [EnigmailMsgRead.getAttachmentName(origAtt)]));
      return;
    }
    if (!origAtt) {
      EnigmailDialog.alert(window, EnigmailLocale.getString("attachment.noMatchFromSignature", [EnigmailMsgRead.getAttachmentName(signatureAtt)]));
      return;
    }

    // open
    var tmpDir = EnigmailFiles.getTempDir();
    var outFile1,
      outFile2;
    outFile1 = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    outFile1.initWithPath(tmpDir);
    if (!(outFile1.isDirectory() && outFile1.isWritable())) {
      EnigmailDialog.alert(window, EnigmailLocale.getString("noTempDir"));
      return;
    }
    outFile1.append(EnigmailMsgRead.getAttachmentName(origAtt));
    outFile1.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
    EnigmailFiles.writeUrlToFile(origAtt.url, outFile1);

    if (isEncrypted) {
      // Try to decrypt message if we suspect the message is encrypted. If it fails we will just verify the encrypted data.
      EnigmailDecryption.decryptAttachment(window, outFile1,
        EnigmailMsgRead.getAttachmentName(origAtt),
        EnigmailFiles.readBinaryFile(outFile1), {}, {}, {});
    }

    outFile2 = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
    outFile2.initWithPath(tmpDir);
    outFile2.append(EnigmailMsgRead.getAttachmentName(signatureAtt));
    outFile2.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
    EnigmailFiles.writeUrlToFile(signatureAtt.url, outFile2);

    var promise = EnigmailVerifyAttachment.attachment(outFile1, outFile2);
    promise.then(function(message) {
      EnigmailDialog.info(window, EnigmailLocale.getString("signature.verifiedOK", [EnigmailMsgRead.getAttachmentName(origAtt)]) + "\n\n" + message);
    });
    promise.catch(function(err) {
      EnigmailDialog.alert(window, EnigmailLocale.getString("signature.verifyFailed", [EnigmailMsgRead.getAttachmentName(origAtt)]) + "\n\n" +
        err);
    });

    outFile1.remove(false);
    outFile2.remove(false);
  },

  handleAttachment: function(actionType, anAttachment) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: handleAttachment: actionType=" + actionType + ", anAttachment(url)=" + anAttachment.url + "\n");

    var argumentsObj = {
      actionType: actionType,
      attachment: anAttachment,
      forceBrowser: false,
      data: ""
    };

    var f = function _cb(data) {
      argumentsObj.data = data;
      Enigmail.msg.decryptAttachmentCallback([argumentsObj]);
    };

    var bufferListener = EnigmailStreams.newStringStreamListener(f);
    var ioServ = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var msgUri = ioServ.newURI(argumentsObj.attachment.url, null, null);

    var channel = EnigmailStreams.createChannel(msgUri);
    channel.asyncOpen(bufferListener, msgUri);
  },

  setAttachmentName: function(attachment, newLabel, index) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: setAttachmentName (" + newLabel + "):\n");

    var attList = document.getElementById("attachmentList");
    if (attList) {
      var attNode = attList.firstChild;
      while (attNode) {
        if (attNode.getAttribute("name") == attachment.name) {
          attNode.setAttribute("name", newLabel);
        }
        attNode = attNode.nextSibling;
      }
    }

    if (typeof(attachment.displayName) == "undefined") {
      attachment.name = newLabel;
    }
    else {
      attachment.displayName = newLabel;
    }

    if (index && index.length > 0) {
      this.revealAttachments(parseInt(index, 10) + 1);
    }
  },

  decryptAttachmentCallback: function(cbArray) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: decryptAttachmentCallback:\n");

    var callbackArg = cbArray[0];

    var exitCodeObj = {};
    var statusFlagsObj = {};
    var errorMsgObj = {};
    var exitStatus = -1;

    var enigmailSvc = Enigmail.getEnigmailSvc();
    var outFile;
    var origFilename;
    var rawFileName = EnigmailMsgRead.getAttachmentName(callbackArg.attachment).replace(/\.(asc|pgp|gpg)$/i, "");

    if (callbackArg.actionType != "importKey") {
      origFilename = EnigmailAttachment.getFileName(window, callbackArg.data);
      if (origFilename && origFilename.length > rawFileName.length) {
        rawFileName = origFilename;
      }
    }

    if (callbackArg.actionType == "saveAttachment") {
      outFile = EnigmailDialog.filePicker(window, EnigmailLocale.getString("saveAttachmentHeader"),
        Enigmail.msg.lastSaveDir, true, "",
        rawFileName, null);
      if (!outFile) {
        return;
      }
    }
    else if (callbackArg.actionType.substr(0, 10) == "revealName") {
      if (origFilename && origFilename.length > 0) {
        Enigmail.msg.setAttachmentName(callbackArg.attachment, origFilename + ".pgp", callbackArg.actionType.substr(11, 10));
      }
      Enigmail.msg.setAttachmentReveal(null);
      return;
    }
    else {
      // open
      var tmpDir = EnigmailFiles.getTempDir();
      try {
        outFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        outFile.initWithPath(tmpDir);
        if (!(outFile.isDirectory() && outFile.isWritable())) {
          errorMsgObj.value = EnigmailLocale.getString("noTempDir");
          return;
        }
        outFile.append(rawFileName);
        outFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
      }
      catch (ex) {
        errorMsgObj.value = EnigmailLocale.getString("noTempDir");
        return;
      }
    }

    if (callbackArg.actionType == "importKey") {
      var preview = EnigmailKey.getKeyListFromKeyBlock(callbackArg.data, errorMsgObj);

      if (errorMsgObj.value !== "" || preview.length === 0) {
        // try decrypting the attachment
        exitStatus = EnigmailDecryption.decryptAttachment(window, outFile,
          EnigmailMsgRead.getAttachmentName(callbackArg.attachment),
          callbackArg.data,
          exitCodeObj, statusFlagsObj,
          errorMsgObj);
        if ((exitStatus) && exitCodeObj.value === 0) {
          // success decrypting, let's try again
          callbackArg.data = EnigmailFiles.readBinaryFile(outFile);
          preview = EnigmailKey.getKeyListFromKeyBlock(callbackArg.data, errorMsgObj);
        }
      }

      if (errorMsgObj.value === "") {
        this.importKeyDataWithConfirmation(preview, callbackArg.data);
      }
      else {
        EnigmailDialog.alert(window, EnigmailLocale.getString("previewFailed") + "\n" + errorMsgObj.value);
      }
      outFile.remove(true);
      return;
    }

    exitStatus = EnigmailDecryption.decryptAttachment(window, outFile,
      EnigmailMsgRead.getAttachmentName(callbackArg.attachment),
      callbackArg.data,
      exitCodeObj, statusFlagsObj,
      errorMsgObj);

    if ((!exitStatus) || exitCodeObj.value !== 0) {
      exitStatus = false;
      if ((statusFlagsObj.value & EnigmailConstants.DECRYPTION_OKAY) &&
        (statusFlagsObj.value & EnigmailConstants.UNVERIFIED_SIGNATURE)) {

        if (callbackArg.actionType == "openAttachment") {
          exitStatus = EnigmailDialog.confirmDlg(window, EnigmailLocale.getString("decryptOkNoSig"), EnigmailLocale.getString("msgOvl.button.contAnyway"));
        }
        else {
          EnigmailDialog.info(window, EnigmailLocale.getString("decryptOkNoSig"));
        }
      }
      else {
        EnigmailDialog.info(window, EnigmailLocale.getString("failedDecrypt") + "\n\n" + errorMsgObj.value);
        exitStatus = false;
      }
    }
    if (exitStatus) {
      if (statusFlagsObj.value & EnigmailConstants.IMPORTED_KEY) {

        if (exitCodeObj.keyList) {
          let importKeyList = exitCodeObj.keyList.map(function(a) {
            return a.id;
          });
          EnigmailDialog.keyImportDlg(window, importKeyList);
        }
      }
      else if (statusFlagsObj.value & EnigmailConstants.DISPLAY_MESSAGE) {
        HandleSelectedAttachments('open');
      }
      else if ((statusFlagsObj.value & EnigmailConstants.DISPLAY_MESSAGE) ||
        (callbackArg.actionType == "openAttachment")) {
        var ioServ = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var outFileUri = ioServ.newFileURI(outFile);
        var fileExt = outFile.leafName.replace(/(.*\.)(\w+)$/, "$2");
        if (fileExt && !callbackArg.forceBrowser) {
          var extAppLauncher = Cc["@mozilla.org/mime;1"].getService(Ci.nsPIExternalAppLauncher);
          extAppLauncher.deleteTemporaryFileOnExit(outFile);

          try {
            var mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
            var fileMimeType = mimeService.getTypeFromFile(outFile);
            var fileMimeInfo = mimeService.getFromTypeAndExtension(fileMimeType, fileExt);

            fileMimeInfo.launchWithFile(outFile);
          }
          catch (ex) {
            // if the attachment file type is unknown, an exception is thrown,
            // so let it be handled by a browser window
            Enigmail.msg.loadExternalURL(outFileUri.asciiSpec);
          }
        }
        else {
          // open the attachment using an external application
          Enigmail.msg.loadExternalURL(outFileUri.asciiSpec);
        }
      }
    }
  },

  loadExternalURL: function(url) {
    if (EnigmailApp.isSuite()) {
      Enigmail.msg.loadURLInNavigatorWindow(url, true);
    }
    else {
      messenger.launchExternalURL(url);
    }
  },

  // retrieves the most recent navigator window (opens one if need be)
  loadURLInNavigatorWindow: function(url, aOpenFlag) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: loadURLInNavigatorWindow: " + url + ", " + aOpenFlag + "\n");

    var navWindow;

    // if this is a browser window, just use it
    if ("document" in top) {
      var possibleNavigator = top.document.getElementById("main-window");
      if (possibleNavigator &&
        possibleNavigator.getAttribute("windowtype") == "navigator:browser") {
        navWindow = top;
      }
    }

    // if not, get the most recently used browser window
    if (!navWindow) {
      var wm;
      wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(
        Ci.nsIWindowMediator);
      navWindow = wm.getMostRecentWindow("navigator:browser");
    }

    if (navWindow) {

      if ("loadURI" in navWindow) {
        navWindow.loadURI(url);
      }
      else {
        navWindow._content.location.href = url;
      }

    }
    else if (aOpenFlag) {
      // if no browser window available and it's ok to open a new one, do so
      navWindow = window.open(url, "Enigmail");
    }

    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: loadURLInNavigatorWindow: navWindow=" + navWindow + "\n");

    return navWindow;
  },

  // handle double click events on Attachments
  attachmentListClick: function(elementId, event) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: attachmentListClick: event=" + event + "\n");

    var attachment = event.target.attachment;
    if (this.checkEncryptedAttach(attachment)) {
      if (event.button === 0 && event.detail == 2) { // double click
        this.handleAttachment("openAttachment", attachment);
        event.stopPropagation();
      }
    }
  },

  // create a decrypted copy of all selected messages in a target folder

  decryptToFolder: function(destFolder) {
    let msgHdrs = gFolderDisplay ? gFolderDisplay.selectedMessages : null;
    if (!msgHdrs || msgHdrs.length === 0) {
      return;
    }

    EnigmailPersistentCrypto.dispatchMessages(msgHdrs, destFolder.URI, false, false);
  },

  importAttachedKeys: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: importAttachedKeys\n");

    let keyFound = false;

    for (let i in currentAttachments) {
      if (currentAttachments[i].contentType.search(/application\/pgp-keys/i) >= 0 ||
        EnigmailMsgRead.getAttachmentName(currentAttachments[i]).match(/\.asc\.(gpg|pgp)$/i)) {
        // found attached key
        this.handleAttachment("importKey", currentAttachments[i]);
        keyFound = true;
      }
    }

    return keyFound;
  },

  importKeyFromKeyserver: function() {
    var pubKeyId = "0x" + Enigmail.msg.securityInfo.keyId;
    var inputObj = {
      searchList: [pubKeyId],
      autoKeyServer: EnigmailPrefs.getPref("autoKeyServerSelection") ? EnigmailPrefs.getPref("keyserver").split(/[ ,;]/g)[0] : null
    };
    var resultObj = {};
    EnigmailWindows.downloadKeys(window, inputObj, resultObj);


    if (resultObj.importedKeys > 0) {
      return true;
    }

    return false;
  },

  // download or import keys
  handleUnknownKey: function() {
    let imported = false;
    // handline keys embedded in message body

    if (Enigmail.msg.securityInfo.statusFlags & EnigmailConstants.INLINE_KEY) {
      //return Enigmail.msg.messageDecrypt(true, false);
      return Enigmail.msg.messageImport();
    }

    imported = this.importAttachedKeys();
    if (!imported) {
      imported = this.importKeyFromKeyserver();
    }

    if (imported) {
      this.messageReload(false);
    }

    return null;
  },

  /**
   * Create an artificial Autocrypt: header if there was no such header on the message
   * and the message was signed
   */
  createArtificialAutocryptHeader: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: createArtificialAutocryptHeader\n");

    if ("autocrypt" in currentHeaderData) {
      return;
    }

    let created = false;
    let dateValue = "",
      fromValue = "";

    if ("date" in currentHeaderData) {
      dateValue = currentHeaderData.date.headerValue;
    }
    if ("from" in currentHeaderData) {
      fromValue = currentHeaderData.from.headerValue;
    }

    if (Enigmail.msg.securityInfo && Enigmail.msg.securityInfo.statusFlags) {
      let securityInfo = Enigmail.msg.securityInfo;
      let keyObj = EnigmailKeyRing.getKeyById(securityInfo.keyId);
      if (keyObj && keyObj.getEncryptionValidity().keyValid) {
        if (securityInfo.statusFlags & EnigmailConstants.GOOD_SIGNATURE) {
          let hdrData = "addr=" + EnigmailFuncs.stripEmail(fromValue) +
            ((securityInfo.statusFlags & EnigmailConstants.DECRYPTION_OKAY) ||
              (securityInfo.statusFlags & EnigmailConstants.PGP_MIME_ENCRYPTED) ? "; prefer-encrypt=mutual" : "") +
            "; _enigmail_artificial=yes; _enigmail_fpr=" + keyObj.fpr + '; keydata="LQ=="';

          created = true;

          EnigmailAutocrypt.processAutocryptHeader(fromValue, [hdrData], dateValue,
            Enigmail.msg.isAutocryptEnabled());
        }
      }
    }

    if (!created) {
      let hdrData = "addr=" + EnigmailFuncs.stripEmail(fromValue) +
        '; prefer-encrypt=reset; _enigmail_artificial=yes; keydata="LQ=="';

      EnigmailAutocrypt.processAutocryptHeader(fromValue, [hdrData], dateValue,
        Enigmail.msg.isAutocryptEnabled());
    }
  },

  flexActionRequest: function() {
    switch (Enigmail.msg.securityInfo.xtraStatus) {
      case "wks-request":
        this.confirmWksRequest();
        break;
      case "autocrypt-setup":
        this.performAutocryptSetup();
        break;
      case "process-manually":
        this.messageDecrypt(null, false);
        break;
    }
  },

  confirmWksRequest: function() {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: confirmWksRequest()\n");
    try {
      var msg = gFolderDisplay.selectedMessage;
      if (!(!msg || !msg.folder)) {
        var accMgr = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
        var msgHdr = msg.folder.GetMessageHeader(msg.messageKey);
        let email = EnigmailFuncs.stripEmail(msgHdr.recipients);
        let maybeIdent = EnigmailStdlib.getIdentityForEmail(email);

        if (maybeIdent && maybeIdent.identity) {
          EnigmailStdlib.msgHdrsModifyRaw([msgHdr], function(data) {
            EnigmailWks.confirmKey(maybeIdent.identity, data, window, function(ret) {
              if (ret) {
                EnigmailDialog.info(window, EnigmailLocale.getString("wksConfirmSuccess"));
              }
              else {
                EnigmailDialog.alert(window, EnigmailLocale.getString("wksConfirmFailure"));
              }
            });
            return null;
          });
        }
        else {
          EnigmailDialog.alert(window, EnigmailLocale.getString("wksNoIdentity", [email]));
        }
      }
    }
    catch (e) {
      EnigmailLog.DEBUG(e + "\n");
    }
  },

  performAutocryptSetup: function(passwd = null) {
    EnigmailLog.DEBUG("enigmailMessengerOverlay.js: performAutocryptSetup()\n");

    if (("message-id" in currentHeaderData) && EnigmailAutocrypt.isSelfCreatedSetupMessage(currentHeaderData["message-id"].headerValue)) {
      EnigmailDialog.info(window, EnigmailLocale.getString("autocrypt.importSetupKey.selfCreated"));
      return;
    }

    if (EnigmailAutocrypt.isAccountSetupForPgp(currentHeaderData.from.headerValue)) {
      // Ask user what to do if the account is already correctly configured

      if (!EnigmailDialog.confirmDlg(window,
          EnigmailLocale.getString("autocrypt.importSetupKey.accountPreconfigured"),
          EnigmailLocale.getString("dlg.button.overwrite"),
          EnigmailLocale.getString("dlg.button.cancel")
        )) {
        return;
      }
    }

    if (currentAttachments[0].contentType.search(/^application\/autocrypt-setup$/i) === 0) {

      EnigmailAutocrypt.getSetupMessageData(currentAttachments[0].url).then(res => {
        passwd = EnigmailWindows.autocryptSetupPasswd(window, "input", res.passphraseFormat, passwd || res.passphraseHint);

        if ((!passwd) || passwd == "") {
          throw "noPasswd";
        }

        return EnigmailAutocrypt.handleBackupMessage(passwd, res.attachmentData, currentHeaderData.from.headerValue);
      }).then(res => {
        EnigmailDialog.info(window, EnigmailLocale.getString("autocrypt.importSetupKey.success", currentHeaderData.from.headerValue));
      }).catch(err => {
        EnigmailLog.DEBUG("enigmailMessengerOverlay.js: performAutocryptSetup got cancel status=" + err + "\n");

        switch (err) {
          case "getSetupMessageData":
            EnigmailDialog.alert(window, EnigmailLocale.getString("autocrypt.importSetupKey.invalidMessage"));
            break;
          case "wrongPasswd":
            if (EnigmailDialog.confirmDlg(window, EnigmailLocale.getString("autocrypt.importSetupKey.wrongPasswd"), EnigmailLocale.getString("dlg.button.retry"),
                EnigmailLocale.getString("dlg.button.cancel"))) {
              Enigmail.msg.performAutocryptSetup(passwd);
            }
            break;
          case "keyImportFailed":
            EnigmailDialog.alert(window, EnigmailLocale.getString("autocrypt.importSetupKey.invalidKey"));
            break;
        }
      });
    }
  },

  onUnloadEnigmail: function() {
    //EnigmailLog.DEBUG("enigmailMessengerOverlay.js: onUnloadEnigmail()\n");

    window.removeEventListener("unload", Enigmail.msg.messengerClose, false);
    window.removeEventListener("unload-enigmail", Enigmail.msg.onUnloadEnigmail, false);
    window.removeEventListener("load-enigmail", Enigmail.msg.messengerStartup, false);
    let t = document.getElementById("tabmail");
    if (t) {
      t.removeEventListener("pageshow", Enigmail.msg.pageShowListener, false);
    }

    this.messageCleanup();

    if (this.messagePane) {
      this.messagePane.removeEventListener("unload", Enigmail.msg.messageFrameUnload, true);
    }

    for (let c of this.changedAttributes) {
      let elem = document.getElementById(c.id);
      if (elem) {
        elem.setAttribute(c.attrib, c.value);
      }
    }

    if (this.treeController) {
      top.controllers.removeController(this.treeController);
    }

    for (let i = 0; i < gMessageListeners.length; i++) {
      if (gMessageListeners[i] === Enigmail.msg.messageListener) {
        gMessageListeners.splice(i, 1);
        break;
      }
    }
    this.messengerClose();

    if (Enigmail.columnHandler) {
      Enigmail.columnHandler.onUnloadEnigmail();
    }
    if (Enigmail.hdrView) {
      Enigmail.hdrView.onUnloadEnigmail();
    }

    Enigmail = undefined;
  }
};

window.addEventListener("load-enigmail", Enigmail.msg.messengerStartup.bind(Enigmail.msg), false);
window.addEventListener("unload", Enigmail.msg.messengerClose.bind(Enigmail.msg), false);
window.addEventListener("unload-enigmail", Enigmail.msg.onUnloadEnigmail.bind(Enigmail.msg), false);
