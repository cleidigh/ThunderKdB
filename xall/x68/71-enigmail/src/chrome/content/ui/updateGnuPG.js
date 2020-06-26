/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var Cu = Components.utils;
var Cc = Components.classes;
var Ci = Components.interfaces;

const EnigmailLocalizeHtml = ChromeUtils.import("chrome://enigmail/content/modules/localizeHtml.jsm").EnigmailLocalizeHtml;
const EnigmailGnuPGUpdate = ChromeUtils.import("chrome://enigmail/content/modules/gnupgUpdate.jsm").EnigmailGnuPGUpdate;
const EnigmailDialog = ChromeUtils.import("chrome://enigmail/content/modules/dialog.jsm").EnigmailDialog;
const EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
const EnigmailPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const EnigmailLazy = ChromeUtils.import("chrome://enigmail/content/modules/lazy.jsm").EnigmailLazy;
const EnigmailApp = ChromeUtils.import("chrome://enigmail/content/modules/app.jsm").EnigmailApp;
const getCore = EnigmailLazy.loader("enigmail/core.jsm", "EnigmailCore");


var gEnigmailSvc = null;
var gResolveInstall = null;
var gDownoadObj = null;

async function checkGnuPGUpdate() {
  let elem = "noUpdateAvailable";

  if (!EnigmailGnuPGUpdate.isGnuPGUpdatable()) {
    elem = "cannotUpdateGnuPG";
  } else if (await EnigmailGnuPGUpdate.isUpdateAvailable()) {
    elem = "updateAvailable";
  }

  document.getElementById(elem).classList.remove("hidden");
}


function onload() {
  EnigmailLocalizeHtml.onPageLoad(document);
  if (!EnigmailGnuPGUpdate.isAutoCheckEnabled()) {
    document.getElementById("noMoreUpdates").checked = true;
  }
  checkGnuPGUpdate();
}

function stopChecking(elem) {
  if (elem.checked) {
    EnigmailGnuPGUpdate.stopCheckingForUpdate();
  } else {
    EnigmailGnuPGUpdate.enableCheckingForUpdate();
  }
}

function installUpdate() {
  let progressBox = document.getElementById("progressBox");
  let downloadProgress = document.getElementById("downloadProgress");
  let installProgressBox = document.getElementById("installProgressBox");
  let installProgress = document.getElementById("installProgress");
  let btnInstallGnupg = document.getElementById("btnInstallGnupg");

  btnInstallGnupg.setAttribute("disabled", true);
  progressBox.classList.remove("hidden");

  let requireKeysUpgrade = EnigmailGnuPGUpdate.requireKeyRingUpgrade();

  EnigmailGnuPGUpdate.performUpdate({
    onStart: function(reqObj) {
      gDownoadObj = reqObj;
    },

    onError: function(errorMessage) {
      if (typeof(errorMessage) == "object") {
        var s = EnigmailLocale.getString("errorType." + errorMessage.type);
        if (errorMessage.type.startsWith("Security")) {
          s += "\n" + EnigmailLocale.getString("setupWizard.downloadForbidden");
        } else
          s += "\n" + EnigmailLocale.getString("setupWizard.downloadImpossible");

        EnigmailDialog.alert(window, s);
      } else {
        EnigmailDialog.alert(window, EnigmailLocale.getString(errorMessage));
      }

      this.returnToDownload();
    },

    onWarning: function(message) {
      var ret = false;
      if (message == "hashSumMismatch") {
        ret = EnigmailDialog.confirmDlg(window, EnigmailLocale.getString("setupWizard.hashSumError"), EnigmailLocale.getString("dlgYes"),
          EnigmailLocale.getString("dlgNo"));
      }

      if (!ret) this.returnToDownload();

      return ret;
    },

    onProgress: function(event) {
      if (event.lengthComputable) {
        var percentComplete = event.loaded / event.total * 100;
        downloadProgress.setAttribute("value", percentComplete);
      } else {
        downloadProgress.removeAttribute("value");
      }
    },

    onDownloaded: function() {
      gDownoadObj = null;
      downloadProgress.setAttribute("value", 100);
      installProgressBox.classList.remove("hidden");
    },


    returnToDownload: function() {
      btnInstallGnupg.removeAttribute("disabled");
      progressBox.classList.add("hidden");
      downloadProgress.setAttribute("value", 0);
      installProgressBox.classList.add("hidden");
    },

    onLoaded: async function() {
      installProgress.setAttribute("value", 100);

      let origPath = EnigmailPrefs.getPref("agentPath");
      EnigmailPrefs.setPref("agentPath", "");

      let svc = reinitEnigmail();

      if (!svc) {
        EnigmailPrefs.setPref("agentPath", origPath);
        this.returnToDownload();
        EnigmailDialog.alert(window, EnigmailLocale.getString("setupWizard.installFailed"));
      } else {
        if (requireKeysUpgrade) {
          document.getElementById("convertKeyring").classList.remove("hidden");
          EnigmailGnuPGUpdate.triggerKeyringConversion();
          document.getElementById("importingKeysProgress").classList.add("hidden");
          document.getElementById("importingKeysDone").classList.remove("hidden");
        }

        document.getElementById("updateComplete").classList.remove("hidden");
      }
    }
  });
}

function reinitEnigmail() {
  if (!gEnigmailSvc) {
    try {
      gEnigmailSvc = getCore().createInstance();
    } catch (ex) {
      EnigmailLog.ERROR("updateGnuPG.js: reinitEnigmail: Error in instantiating EnigmailService\n");
      return null;
    }
  }

  EnigmailLog.DEBUG("updateGnuPG.js: reinitEnigmail: gEnigmailSvc = " + gEnigmailSvc + "\n");

  if (gEnigmailSvc.initialized) {
    try {
      gEnigmailSvc.reinitialize();
    } catch (ex) {}
  } else {
    // Try to initialize Enigmail

    try {
      // Initialize enigmail
      gEnigmailSvc.initialize(window, EnigmailApp.getVersion());

      // Reset alert count to default value
      EnigmailPrefs.getPrefBranch().clearUserPref("initAlert");
    } catch (ex) {
      return null;
    }

    let configuredVersion = EnigmailPrefs.getPref("configuredVersion");
    EnigmailLog.DEBUG("updateGnuPG.js: reinitEnigmail: " + configuredVersion + "\n");
  }

  return gEnigmailSvc.initialized ? gEnigmailSvc : null;
}
