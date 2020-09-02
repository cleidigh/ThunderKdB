/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var Cu = Components.utils;
var Cc = Components.classes;
var Ci = Components.interfaces;

var E2TBLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
var E2TBLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
var E2TBDialog = ChromeUtils.import("chrome://enigmail/content/modules/dialog.jsm").EnigmailDialog;
var E2TBWindows = ChromeUtils.import("chrome://enigmail/content/modules/windows.jsm").EnigmailWindows;
var E2TBFiles = ChromeUtils.import("chrome://enigmail/content/modules/files.jsm").EnigmailFiles;
var E2TBTimer = ChromeUtils.import("chrome://enigmail/content/modules/timer.jsm").EnigmailTimer;
var E2TBKeyRing = ChromeUtils.import("chrome://enigmail/content/modules/keyRing.jsm").EnigmailKeyRing;
var E2TBCryptoAPI = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI.jsm").EnigmailCryptoAPI;
var E2TBPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
var E2TBCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
var Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

// OpenPGP implementation in TB
var EnigmailDialog = ChromeUtils.import("chrome://openpgp/content/modules/dialog.jsm").EnigmailDialog;
var EnigmailKeyRing = ChromeUtils.import("chrome://openpgp/content/modules/keyRing.jsm").EnigmailKeyRing;
var uidHelper = ChromeUtils.import("chrome://openpgp/content/modules/uidHelper.jsm").uidHelper;
var PgpSqliteDb2 = ChromeUtils.import("chrome://openpgp/content/modules/sqliteDb.jsm").PgpSqliteDb2;
var EnigmailCryptoAPI = ChromeUtils.import("chrome://openpgp/content/modules/cryptoAPI.jsm").EnigmailCryptoAPI;
var RNP = ChromeUtils.import("chrome://openpgp/content/modules/RNP.jsm").RNP;

var gSelectedPrivateKeys = null,
  gPublicKeys = [],
  gAcceptButton = null,
  gCancelButton = null,
  gDialogCancelled = false,
  gProcessing = false,
  gRestartNeeded = false;

function onLoad() {
  E2TBLog.DEBUG(`setupWizard2.js: onLoad()\n`);

  if (!E2TBCore.getService(window, false)) {
    E2TBDialog.alert(window, E2TBLocale.getString("gpgNotInPath"));
    window.close();
    return;
  }

  let dlg = document.getElementById("setupWizardDlg");
  gAcceptButton = dlg.getButton("accept");
  gAcceptButton.setAttribute("disabled", "true");
  gCancelButton = dlg.getButton("cancel");

  let secKeys = E2TBKeyRing.getAllSecretKeys(false);
  if (secKeys.length > 5) {
    document.getElementById("manyKeys").style.visibility = "visible";
  }

  gSelectedPrivateKeys = secKeys.map(keyObj => {
    return "0x" + keyObj.fpr;
  });
}

function onAccept() {
  if (gRestartNeeded) restartApplication();
  return true;
}

function closeAfterCancel() {
  E2TBLog.DEBUG("importExportWizard: closing after Cancel clicked\n");
  window.close();
  return false;
}

function onCancel() {
  gDialogCancelled = true;
  if (gProcessing) {
    return false;
  }
  return true;
}

function selectPrivateKeys() {
  let resultObj = {};
  window.openDialog("chrome://enigmail/content/ui/enigmailKeySelection.xhtml", "", "chrome,dialog,centerscreen,modal", {
    options: `private,allowexpired,trustallkeys,multisel,nosending,sendlabel=${E2TBLocale.getString("setupWizard.selectKeysButton")},`
  }, resultObj);

  if (resultObj.cancelled) return;
  gSelectedPrivateKeys = resultObj.userList;
  E2TBLog.DEBUG(`setupWizard2.js: selectPrivateKeys: selKey: ${gSelectedPrivateKeys.join(", ")}\n`);
}

function enableOpenPGPPref() {
  E2TBPrefs.getPrefRoot().setBoolPref("mail.openpgp.enable", true);

  return new Promise((resolve, reject) => {
    E2TBTimer.setTimeout(function _f() {
      resolve(true);
    }, 1000);
  });
}

async function startMigration() {
  for (let btn of ["btnSelectPrivateKeys", "btnStartMigration"]) {
    document.getElementById(btn).setAttribute("disabled", "true");
  }

  // enable OpenPGP functionality unconditionally
  if (!E2TBPrefs.getPrefRoot().getBoolPref("mail.openpgp.enable")) {
    await enableOpenPGPPref();
    gRestartNeeded = true;
  }

  let BondOpenPGP = ChromeUtils.import("chrome://openpgp/content/BondOpenPGP.jsm").BondOpenPGP;
  if (!BondOpenPGP.allDependenciesLoaded()) {
    gRestartNeeded = false;
    E2TBDialog.alert(window, E2TBLocale.getString("openpgpInitError"));
    window.close();
    return;
  }

  gProcessing = true;
  let tmpDir = E2TBFiles.createTempSubDir("enig-exp", true);
  exportKeys(tmpDir);
  if (gDialogCancelled) return;

  // temprarily disable saving keys
  let origSaveKeyRing = RNP.saveKeyRings;

  RNP.saveKeyRings = function() {};
  RNP.init();
  await PgpSqliteDb2.checkDatabaseStructure();

  try {
    await importKeys(tmpDir);
  }
  catch (x) {}
  finally {
    // restore saving function
    RNP.saveKeyRings = origSaveKeyRing;
    RNP.saveKeyRings();
  }

  if (gDialogCancelled) return;

  document.getElementById("applyingSettings").style.visibility = "visible";
  try {
    tmpDir.remove(true);
  }
  catch (ex) {}
  gProcessing = false;
  EnigmailKeyRing.clearCache();
  await applyKeySignatures();
  applyAccountSettings();
  if (gDialogCancelled) return;

  if (gRestartNeeded) {
    document.getElementById("restartNeeded").style.visibility = "visible";
  }
  else {
    document.getElementById("migrationComplete").style.visibility = "visible";
  }
  gAcceptButton.removeAttribute("disabled");
  gCancelButton.setAttribute("disabled", "true");

  E2TBWindows.closeUpdateInfo();
}



function exportKeys(tmpDir) {
  E2TBLog.DEBUG(`setupWizard2.js: exportKeys(${tmpDir.path})\n`);

  document.getElementById("exportingKeys").style.visibility = "visible";

  let exportProgess = document.getElementById("exportProgress");

  function setExportProgress(percentComplete) {
    exportProgess.setAttribute("value", percentComplete);
  }

  let allPubKeys = E2TBKeyRing.getAllKeys(window).keyList.map(keyObj => {
    return "0x" + keyObj.fpr;
  });

  let exitCodeObj = {},
    errorMsgObj = {},
    totalNumKeys = gSelectedPrivateKeys.length + allPubKeys.length,
    numKeysProcessed = 0;

  for (let fpr of gSelectedPrivateKeys) {
    if (gDialogCancelled) return closeAfterCancel();

    let secKeyFile = tmpDir.clone();
    secKeyFile.append(fpr + ".sec");

    E2TBLog.DEBUG("setupWizard2.js: exportKeys: secFile: " + secKeyFile.path + "\n");
    E2TBKeyRing.extractKey(true, fpr, secKeyFile, exitCodeObj, errorMsgObj);

    ++numKeysProcessed;
    setExportProgress(numKeysProcessed / totalNumKeys * 100);

    if (exitCodeObj.value !== 0) {
      E2TBLog.DEBUG(`importExportWizard: error while exporting secret key ${fpr}\n`);
      E2TBDialog.alert(window, E2TBLocale.getString("dataExportError"));
      return false;
    }
  }

  for (let fpr of allPubKeys) {
    if (gDialogCancelled) return closeAfterCancel();

    if (!(fpr in gSelectedPrivateKeys)) {
      let pubKeyFile = tmpDir.clone();
      pubKeyFile.append(fpr + ".asc");

      E2TBKeyRing.extractKey(false, fpr, pubKeyFile, exitCodeObj, errorMsgObj);
      if (exitCodeObj.value === 0) {
        gPublicKeys.push(fpr);
      }

      ++numKeysProcessed;
      setExportProgress(numKeysProcessed / totalNumKeys * 100);
    }
  }

  document.getElementById("exportingKeys").style.visibility = "collapse";
  document.getElementById("keysExported").style.visibility = "visible";

  return true;
}


async function importKeys(tmpDir) {
  E2TBLog.DEBUG(`setupWizard2.js: importKeys(${tmpDir.path})\n`);

  let pubKeysFailed = [],
    secKeysFailed = [];
  let importProgess = document.getElementById("importProgress");

  function setImportProgress(percentComplete) {
    importProgess.setAttribute("value", percentComplete);
  }

  document.getElementById("importingKeys").style.visibility = "visible";

  let numKeysProcessed = 0;
  const totalNumKeys = gSelectedPrivateKeys.length + gPublicKeys.length;

  for (let fpr of gSelectedPrivateKeys) {
    if (gDialogCancelled) return closeAfterCancel();

    let secKeyFile = tmpDir.clone();
    secKeyFile.append(fpr + ".sec");

    E2TBLog.DEBUG("setupWizard2.js: importKeys: secFile: " + secKeyFile.path + "\n");
    if (!(await importKeyFile(fpr, secKeyFile, true))) {
      secKeysFailed.push(fpr);
    }
    ++numKeysProcessed;
    setImportProgress(numKeysProcessed / totalNumKeys * 100);
  }

  if (secKeysFailed.length > 0) {
    E2TBDialog.alert(
      window,
      E2TBLocale.getString("importSecKeysFailed", secKeysFailed.join("\n"))
    );
  }

  for (let fpr of gPublicKeys) {
    if (gDialogCancelled) return closeAfterCancel();

    let pubKeyFile = tmpDir.clone();
    pubKeyFile.append(fpr + ".asc");

    ++numKeysProcessed;
    setImportProgress(numKeysProcessed / totalNumKeys * 100);

    E2TBLog.DEBUG("setupWizard2.js: importKeys: pubFile: " + pubKeyFile.path + "\n");
    if (!(await importKeyFile(fpr, pubKeyFile, false))) {
      pubKeysFailed.push(fpr);
    }
  }

  document.getElementById("importingKeys").style.visibility = "collapse";
  document.getElementById("keysImported").style.visibility = "visible";

  if (pubKeysFailed.length > 0) {
    E2TBDialog.alert(
      window,
      E2TBLocale.getString("importPubKeysFailed", pubKeysFailed.join("\n"))
    );
  }
  return true;
}

async function applyKeySignatures() {
  E2TBLog.DEBUG(`setupWizard2.js: applyKeySignatures\n`);

  const cApi = E2TBCryptoAPI();

  let keyList = await cApi.getKeySignatures("", true);
  const secKeyIds = [];
  const numKeys = keyList.length;
  let i = 0;

  for (let fpr of gSelectedPrivateKeys) {
    let keyObj = E2TBKeyRing.getKeyById(fpr);
    secKeyIds[keyObj.keyId] = 1;

    if (keyObj.ownerTrust === "u") {
      await applyPersonalKey(keyObj.fpr);
    }
  }

  for (let keyObj of keyList) {
    let signedEmails = [];

    if (secKeyIds[keyObj.keyId] === 1) continue; // skip secret keys

    for (let u in keyObj.uid) {
      let uid = keyObj.uid[u],
        splitUid = {};

      try {
        uidHelper.getPartsFromUidStr(uid.userId, splitUid);
        if (splitUid.email) {
          for (let sig of uid.sigList) {
            if (sig.signerKeyId in secKeyIds) {
              signedEmails.push(splitUid.email);
              break;
            }
          }
        }
      }
      catch (x) {}
    }

    if (signedEmails.length > 0) {
      E2TBLog.DEBUG(`setupWizard2.js: applyKeySignatures: setting 'verified' for 0x${keyObj.fpr}\n`);

      await PgpSqliteDb2.updateAcceptance(
        keyObj.fpr,
        [...new Set(signedEmails)],
        "verified"
      );
    }
  }
}


function applyAccountSettings() {
  const msgAccountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
  let accounts = msgAccountManager.accounts;

  for (let i = 0; i < accounts.length; i++) {
    let ac = accounts[i];
    if (ac.incomingServer.type !== "none") {
      for (let id = 0; id < ac.identities.length; id++) {
        let ident = ac.identities[id];

        if (ident.getBoolAttribute("enablePgp")) {
          applyIdentitySettings(ident);
        }
      }
    }
  }

  document.getElementById("applyingSettings").style.visibility = "collapse";
  document.getElementById("settingsApplied").style.visibility = "visible";
}

function applyIdentitySettings(identity) {
  const keyPolicy = identity.getIntAttribute("pgpKeyMode");
  let keyObj = null;
  if (keyPolicy === 1) {
    // use key id
    keyObj = EnigmailKeyRing.getKeyById(identity.getCharAttribute("pgpkeyId"));
  }
  else {
    // use "from" address
    keyObj = EnigmailKeyRing.getSecretKeyByEmail(identity.email);
  }

  if (keyObj) {
    identity.setCharAttribute("openpgp_key_id", keyObj.keyId);
    identity.setIntAttribute("encryptionpolicy", identity.getIntAttribute("defaultEncryptionPolicy") > 0 ? 2 : 0);
    identity.setBoolAttribute("sign_mail", (identity.getIntAttribute("defaultSigningPolicy") > 0));
  }
}

function handleClick(event) {
  /*
  if (event.target.hasAttribute("href")) {
    let target = event.target;
    event.stopPropagation();
    EnigmailWindows.openMailTab(target.getAttribute("href"));
  } */
}


async function applyPersonalKey(fpr) {
  try {
    await PgpSqliteDb2.acceptAsPersonalKey(fpr);
  }
  catch (x) {}
}

document.addEventListener("dialogaccept", function(event) {
  if (!onAccept())
    event.preventDefault(); // Prevent the dialog closing.
});

document.addEventListener("dialogcancel", function(event) {
  if (!onCancel())
    event.preventDefault(); // Prevent the dialog closing.
});

async function importKeyFile(fpr, inFile, isSecretKey) {
  const cApi = EnigmailCryptoAPI();

  try {
    let res;
    if ("importKeyFromFile" in cApi) {
      res = await cApi.importKeyFromFile(window, passphrasePromptCallback, inFile, !isSecretKey, isSecretKey);
    }
    else
      res = await cApi.importKeyFromFileAPI(window, passphrasePromptCallback, inFile, !isSecretKey, isSecretKey);

    return (res && res.importedKeys && res.importedKeys.length > 0);
  }
  catch (ex) {
    E2TBLog.DEBUG(`setupWizard2.js: import key failed for key ${fpr}\n`);
    Services.console.logMessage(ex);

    return false;
  }
}

/**
 * opens a prompt, asking the user to enter passphrase for given key id
 * returns: the passphrase if entered (empty string is allowed)
 * resultFlags.canceled is set to true if the user clicked cancel
 */
function passphrasePromptCallback(win, keyId, resultFlags) {
  let p = {};
  p.value = "";
  let dummy = {};
  if (
    !Services.prompt.promptPassword(
      win,
      "",
      E2TBLocale.getString("passphrasePrompt", [keyId]),
      p,
      null,
      dummy
    )
  ) {
    resultFlags.canceled = true;
    return "";
  }

  resultFlags.canceled = false;
  return p.value;
}

function restartApplication() {
  let oAppStartup = Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup);
  if (!oAppStartup.eRestart) throw ("Restart is not supported");
  oAppStartup.quit(oAppStartup.eAttemptQuit | oAppStartup.eRestart);
}
