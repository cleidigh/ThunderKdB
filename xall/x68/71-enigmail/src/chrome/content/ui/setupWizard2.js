/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var Cu = Components.utils;
var Cc = Components.classes;
var Ci = Components.interfaces;

var EnigmailAutoSetup = ChromeUtils.import("chrome://enigmail/content/modules/autoSetup.jsm").EnigmailAutoSetup;
var EnigmailConstants = ChromeUtils.import("chrome://enigmail/content/modules/constants.jsm").EnigmailConstants;
var EnigmailApp = ChromeUtils.import("chrome://enigmail/content/modules/app.jsm").EnigmailApp;
var EnigmailPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
var EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
var EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
var EnigmailTimer = ChromeUtils.import("chrome://enigmail/content/modules/timer.jsm").EnigmailTimer;
var EnigmailLazy = ChromeUtils.import("chrome://enigmail/content/modules/lazy.jsm").EnigmailLazy;
var EnigmailOS = ChromeUtils.import("chrome://enigmail/content/modules/os.jsm").EnigmailOS;
var EnigmailDialog = ChromeUtils.import("chrome://enigmail/content/modules/dialog.jsm").EnigmailDialog;
var EnigmailFiles = ChromeUtils.import("chrome://enigmail/content/modules/files.jsm").EnigmailFiles;
var InstallGnuPG = ChromeUtils.import("chrome://enigmail/content/modules/installGnuPG.jsm").InstallGnuPG;
var EnigmailConfigBackup = ChromeUtils.import("chrome://enigmail/content/modules/configBackup.jsm").EnigmailConfigBackup;
var EnigmailGpgAgent = ChromeUtils.import("chrome://enigmail/content/modules/gpgAgent.jsm").EnigmailGpgAgent;
var EnigmailKeyRing = ChromeUtils.import("chrome://enigmail/content/modules/keyRing.jsm").EnigmailKeyRing;
var EnigmailWindows = ChromeUtils.import("chrome://enigmail/content/modules/windows.jsm").EnigmailWindows;
var EnigmailPEPAdapter = ChromeUtils.import("chrome://enigmail/content/modules/pEpAdapter.jsm").EnigmailPEPAdapter;
var EnigmailInstallPep = ChromeUtils.import("chrome://enigmail/content/modules/installPep.jsm").EnigmailInstallPep;

const getCore = EnigmailLazy.loader("enigmail/core.jsm", "EnigmailCore");

/* Imported from commonWorkflows.js: */
/* global EnigmailCommon_importKeysFromFile: false */

const FINAL_ACTION_DONOTHING = 0;
const FINAL_ACTION_USEPEP = 1;
const FINAL_ACTION_CREATEKEYS = 2;

var gEnigmailSvc = null;
var gResolveInstall = null;
var gDownoadObj = null;
var gFoundSetupType = {
  value: -1
};
var gPepAvailable = null;
var gSecretKeys = [];
var gFinalAction = FINAL_ACTION_DONOTHING;

function onLoad() {
  EnigmailLog.DEBUG(`setupWizard2.js: onLoad()\n`);
  let dlg = document.getElementById("setupWizardDlg");
  dlg.getButton("accept").setAttribute("disabled", "true");

  document.getElementById("foundAcSetupMessage").innerHTML = EnigmailLocale.getString("setupWizard.foundAcSetupMessage");
  document.getElementById("foundAcNoSetupMsg").innerHTML = EnigmailLocale.getString("setupWizard.foundAcNoSetupMsg");
  document.getElementById("setupComplete").innerHTML = EnigmailLocale.getString("setupWizard.setupComplete");

  // let the dialog be loaded asynchronously such that we can disply the dialog
  // before we start working on it.
  EnigmailTimer.setTimeout(onLoadAsync, 1);

}

function onLoadAsync() {
  let installPromise = checkGnupgInstallation().then(foundGpg => {
    if (foundGpg) {
      document.getElementById("searchingGnuPG").style.visibility = "visible";
      document.getElementById("foundGnuPG").style.visibility = "visible";
      document.getElementById("findGpgBox").style.visibility = "collapse";
      document.getElementById("requireGnuPG").style.visibility = "collapse";
      document.getElementById("determineInstall").style.visibility = "visible";
      gSecretKeys = EnigmailKeyRing.getAllSecretKeys(true);
    }
  });

  let pepPromise = checkPepAvailability();

  let setupPromise = EnigmailAutoSetup.getDeterminedSetupType().then(r => {
    EnigmailLog.DEBUG(`setupWizard2.js: onLoadAsync: got setupType ${r.value}\n`);
    gFoundSetupType = r;
  });

  Promise.all([installPromise, pepPromise, setupPromise]).then(r => {
    displayExistingEmails();
  }).catch(err => {
    displayExistingEmails();
  });
}

/**
 * Main function to display the found case matching the user's setup
 */
function displayExistingEmails() {
  EnigmailLog.DEBUG(`setupWizard2.js: displayExistingEmails(): found setup type ${gFoundSetupType.value}\n`);
  let prevInstallElem = "previousInstall_none";
  let unhideButtons = [];

  if (gSecretKeys.length > 0) {
    // secret keys are already available
    EnigmailLog.DEBUG(`setupWizard2.js: displayExistingEmails: found existing keys\n`);
    prevInstallElem = "previousInstall_keysAvailable";
  }
  else {
    switch (gFoundSetupType.value) {
      case EnigmailConstants.AUTOSETUP_AC_SETUP_MSG:
        // found Autocrypt Setup Message
        prevInstallElem = "previousInstall_acSetup";
        break;
      case EnigmailConstants.AUTOSETUP_AC_HEADER:
        // found Autocrypt messages
        prevInstallElem = "previousInstall_ac";
        unhideButtons = ["btnRescanInbox", "btnImportSettings"];
        break;
      case EnigmailConstants.AUTOSETUP_PEP_HEADER:
        // found pEp encrypted messages
        if (gPepAvailable) {
          prevInstallElem = "previousInstall_pEp";
          unhideButtons = ["btnImportKeys"];
        }
        else {
          gFoundSetupType.value = EnigmailConstants.AUTOSETUP_ENCRYPTED_MSG;
          displayExistingEmails();
          return;
        }
        gFinalAction = FINAL_ACTION_USEPEP;
        installPepIfNeeded();
        enableDoneButton();
        break;
      case EnigmailConstants.AUTOSETUP_ENCRYPTED_MSG:
        // encrypted messages without pEp or Autocrypt found
        prevInstallElem = "previousInstall_encrypted";
        unhideButtons = ["btnImportKeys"];
        enableDoneButton();
        break;
      default:
        // no encrypted messages found
        enableDoneButton();
        EnigmailPrefs.setPref("juniorMode", 0);
        gFinalAction = FINAL_ACTION_CREATEKEYS;
    }
  }
  document.getElementById("determineInstall").style.visibility = "collapse";
  document.getElementById(prevInstallElem).style.visibility = "visible";

  for (let e of unhideButtons) {
    document.getElementById(e).style.visibility = "visible";
  }
}

/**
 * Check if GnuPG is available and set dialog parts accordingly
 */
function checkGnupgInstallation() {
  return new Promise((resolve, reject) => {
    if (getEnigmailService(true)) {
      resolve(true);
      return;
    }
    else {
      gResolveInstall = resolve;
      document.getElementById("searchingGnuPG").style.visibility = "collapse";
      document.getElementById("requireGnuPG").style.visibility = "visible";

      if (InstallGnuPG.checkAvailability()) {
        document.getElementById("installBox").style.visibility = "visible";
      }
      else {
        document.getElementById("findGpgBox").style.visibility = "visible";
      }
    }
  });
}

/**
 * Determine if pEp is avaliable, and if it is not available,
 * whether it can be downaloaded and installed. This does not
 * trigger installation.
 */
async function checkPepAvailability() {
  if (await EnigmailPEPAdapter.isPepAvailable(false)) {
    gPepAvailable = true;
  }
  else {
    EnigmailPEPAdapter.resetPepAvailability();
    gPepAvailable = await EnigmailInstallPep.isPepInstallerAvailable();
  }

  return gPepAvailable;
}

/**
 * Try to access pEp, such that it will be installed if it's not available
 */
function installPepIfNeeded() {
  EnigmailLog.DEBUG(`setupWizard2.js: installPepIfNeeded()\n`);
  EnigmailPrefs.setPref("juniorMode", 2);
  EnigmailPEPAdapter.isPepAvailable(true);
}

/**
 * Try to initialize Enigmail (which will determine the location of GnuPG)
 */
function getEnigmailService(resetCheck) {
  if (resetCheck)
    gEnigmailSvc = null;

  if (gEnigmailSvc) {
    return gEnigmailSvc.initialized ? gEnigmailSvc : null;
  }

  try {
    gEnigmailSvc = getCore().createInstance();
  }
  catch (ex) {
    EnigmailLog.ERROR("setupWizard2.js: getEnigmailService: Error in instantiating EnigmailService\n");
    return null;
  }

  EnigmailLog.DEBUG("setupWizard2.js: getEnigmailService: gEnigmailSvc = " + gEnigmailSvc + "\n");

  if (!gEnigmailSvc.initialized) {
    // Try to initialize Enigmail

    try {
      // Initialize enigmail
      gEnigmailSvc.initialize(window, EnigmailApp.getVersion());

      // Reset alert count to default value
      EnigmailPrefs.getPrefBranch().clearUserPref("initAlert");
    }
    catch (ex) {
      return null;
    }

    let configuredVersion = EnigmailPrefs.getPref("configuredVersion");
    EnigmailLog.DEBUG("setupWizard2.js: getEnigmailService: " + configuredVersion + "\n");
  }

  return gEnigmailSvc.initialized ? gEnigmailSvc : null;
}


/**
 * Locate GnuPG using the "Browse" button
 */
function locateGpg() {
  const fileName = "gpg";
  let ext = "";
  if (EnigmailOS.isDosLike) {
    ext = ".exe";
  }

  let filePath = EnigmailDialog.filePicker(window,
    EnigmailLocale.getString("locateGpg"),
    "", false, ext,
    fileName + ext, null);

  if (filePath) {
    EnigmailPrefs.setPref("agentPath", EnigmailFiles.getFilePath(filePath));
    let svc = getEnigmailService(true);

    if (!svc) {
      EnigmailDialog.alert(window, EnigmailLocale.getString("setupWizard.invalidGpg"));
    }
    else {
      gResolveInstall(true);
    }
  }
}

function installGnuPG() {
  let progressBox = document.getElementById("progressBox");
  let downloadProgress = document.getElementById("downloadProgress");
  let installProgressBox = document.getElementById("installProgressBox");
  let installProgress = document.getElementById("installProgress");
  let btnInstallGnupg = document.getElementById("btnInstallGnupg");
  let btnLocateGnuPG = document.getElementById("btnLocateGnuPG");
  window.outerHeight += 100;

  btnInstallGnupg.setAttribute("disabled", true);
  btnLocateGnuPG.setAttribute("disabled", true);
  progressBox.style.visibility = "visible";

  InstallGnuPG.startInstaller({
    onStart: function(reqObj) {
      gDownoadObj = reqObj;
    },

    onError: function(errorMessage) {
      if (typeof(errorMessage) == "object") {
        var s = EnigmailLocale.getString("errorType." + errorMessage.type);
        if (errorMessage.type.startsWith("Security")) {
          s += "\n" + EnigmailLocale.getString("setupWizard.downloadForbidden");
        }
        else
          s += "\n" + EnigmailLocale.getString("setupWizard.downloadImpossible");

        EnigmailDialog.alert(window, s);
      }
      else {
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
      }
      else {
        downloadProgress.removeAttribute("value");
      }
    },

    onDownloaded: function() {
      gDownoadObj = null;
      downloadProgress.setAttribute("value", 100);
      installProgressBox.style.visibility = "visible";
    },


    returnToDownload: function() {
      window.outerHeight -= 100;
      btnInstallGnupg.removeAttribute("disabled");
      btnLocateGnuPG.removeAttribute("disabled");
      progressBox.style.visibility = "collapse";
      downloadProgress.setAttribute("value", 0);
      installProgressBox.style.visibility = "collapse";
    },

    onLoaded: function() {
      installProgress.setAttribute("value", 100);
      progressBox.style.visibility = "collapse";
      installProgressBox.style.visibility = "collapse";
      document.getElementById("installBox").style.visibility = "collapse";
      window.outerHeight -= 100;

      let origPath = EnigmailPrefs.getPref("agentPath");
      EnigmailPrefs.setPref("agentPath", "");

      let svc = getEnigmailService(true);

      if (!svc) {
        EnigmailPrefs.setPref("agentPath", origPath);
        this.returnToDownload();
        EnigmailDialog.alert(window, EnigmailLocale.getString("setupWizard.installFailed"));
      }
      else {
        gResolveInstall(true);
      }
    }
  });
}


/**
 * Import Autocrypt Setup Messages
 */
function importAcSetup() {
  let btnInitiateAcSetup = document.getElementById("btnInitiateAcSetup");
  btnInitiateAcSetup.setAttribute("disabled", true);
  EnigmailAutoSetup.performAutocryptSetup(gFoundSetupType).then(r => {
    if (r > 0) {
      document.getElementById("previousInstall_none").style.visibility = "visible";
      enableDoneButton();
    }
  });
}

/**
 * Actively re-scan the inbox to find (for example) a new Autocrypt Setup Message
 */
function rescanInbox() {
  EnigmailAutoSetup.determinePreviousInstallType().then(r => {
    EnigmailLog.DEBUG(`setupWizard2.js: onLoad: got rescanInbox ${r.value}\n`);
    gFoundSetupType = r;

    for (let i of ["previousInstall_ac", "btnRescanInbox", "btnImportSettings"]) {
      document.getElementById(i).style.visibility = "collapse";
    }

    displayExistingEmails();
  }).catch(x => {
    for (let i of ["previousInstall_ac", "btnRescanInbox", "btnImportSettings"]) {
      document.getElementById(i).style.visibility = "collapse";
    }
    displayExistingEmails();
  });
}

/**
 * open the "Restore Settings and Keys" wizard
 */
function importSettings() {
  EnigmailWindows.openImportSettings(window);
}


function enableDoneButton() {
  let dlg = document.getElementById("setupWizardDlg");
  dlg.getButton("cancel").setAttribute("collapsed", "true");
  dlg.getButton("accept").removeAttribute("disabled");
}


function onCancel() {
  if (gDownoadObj) {
    gDownoadObj.abort();
    gDownoadObj = null;
  }

  return true;
}


function onAccept() {
  if (gFinalAction === FINAL_ACTION_CREATEKEYS) {
    EnigmailAutoSetup.createKeyForAllAccounts();
  }
  return true;
}

function importKeysFromFile() {
  EnigmailCommon_importKeysFromFile();
  applyExistingKeys();
}

function applyExistingKeys() {
  if (gFoundSetupType.value === EnigmailConstants.AUTOSETUP_PEP_HEADER && gPepAvailable) {
    installPepIfNeeded();
  }
  else {
    EnigmailPrefs.setPref("juniorMode", 0);
    EnigmailAutoSetup.applyExistingKeys();
  }

  document.getElementById("btnApplyExistingKeys").setAttribute("disabled", "true");
  document.getElementById("applyExistingKeysOK").style.visibility = "visible";
  document.getElementById("previousInstall_none").style.visibility = "visible";
  enableDoneButton();
}

function handleClick(event) {
  if (event.target.hasAttribute("href")) {
    let target = event.target;
    event.stopPropagation();
    EnigmailWindows.openMailTab(target.getAttribute("href"));
  }
}


document.addEventListener("dialogaccept", function(event) {
  if (!onAccept())
    event.preventDefault(); // Prevent the dialog closing.
});

document.addEventListener("dialogcancel", function(event) {
  if (!onCancel())
    event.preventDefault(); // Prevent the dialog closing.
});
