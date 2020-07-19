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

var E2TBLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
var E2TBPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
var E2TBLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
var E2TBKeyRing = ChromeUtils.import("chrome://enigmail/content/modules/keyRing.jsm").EnigmailKeyRing;
var E2TBWindows = ChromeUtils.import("chrome://enigmail/content/modules/windows.jsm").EnigmailWindows;
var E2TBTimer = ChromeUtils.import("chrome://enigmail/content/modules/timer.jsm").EnigmailTimer;
var E2TBSingletons = ChromeUtils.import("chrome://enigmail/content/modules/singletons.jsm").EnigmailSingletons;
//var Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

var E2TB = {
  messengerStartup: function() {
    E2TBLog.DEBUG("enigmailMessengerOverlay.js: messengerStartup()\n");

    const lastVersion = E2TBPrefs.getPref("configuredVersion");
    const vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);

    E2TBTimer.setTimeout(() => {
      let keyList = E2TBKeyRing.getAllSecretKeys(false);

      if (keyList.length > 0) {
        E2TBLog.DEBUG("enigmailMessengerOverlay.js: messengerStartup: displaying menu\n");
        let mnu = document.getElementById("enigmailUpgradeMenu");
        if (mnu) mnu.removeAttribute("collapsed");
      }

      if (vc.compare(lastVersion, "2.2a1") >= 0) {
        return;
      }

      if (E2TBSingletons.upgradeInfoDisplayed) return;
      if (keyList.length > 0) E2TBWindows.openUpdateInfo();
    }, 3000);
  },


  messengerClose: function() {
    E2TBLog.DEBUG("enigmailMessengerOverlay.js: messengerClose()\n");

  },

  onUnloadEnigmail: function() {
    E2TBLog.DEBUG("enigmailMessengerOverlay.js: onUnloadEnigmail()\n");

    window.removeEventListener("unload", E2TB.messengerClose, false);
    window.removeEventListener("unload-enigmail", E2TB.onUnloadEnigmail, false);
    window.removeEventListener("load-enigmail", E2TB.messengerStartup, false);

    E2TB = undefined;
  }
};

window.addEventListener("load-enigmail", E2TB.messengerStartup.bind(E2TB), false);
window.addEventListener("unload", E2TB.messengerClose.bind(E2TB), false);
window.addEventListener("unload-enigmail", E2TB.onUnloadEnigmail.bind(E2TB), false);
