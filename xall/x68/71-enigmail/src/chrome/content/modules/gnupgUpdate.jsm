/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */


"use strict";

var EXPORTED_SYMBOLS = ["EnigmailGnuPGUpdate"];

const EnigmailPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
const InstallGnuPG = ChromeUtils.import("chrome://enigmail/content/modules/installGnuPG.jsm").InstallGnuPG;
const EnigmailOS = ChromeUtils.import("chrome://enigmail/content/modules/os.jsm").EnigmailOS;
const EnigmailGpg = ChromeUtils.import("chrome://enigmail/content/modules/gpg.jsm").EnigmailGpg;
const EnigmailGpgAgent = ChromeUtils.import("chrome://enigmail/content/modules/gpgAgent.jsm").EnigmailGpgAgent;
const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const EnigmailVersioning = ChromeUtils.import("chrome://enigmail/content/modules/versioning.jsm").EnigmailVersioning;
const EnigmailTimer = ChromeUtils.import("chrome://enigmail/content/modules/timer.jsm").EnigmailTimer;
const EnigmailDialog = ChromeUtils.import("chrome://enigmail/content/modules/dialog.jsm").EnigmailDialog;
const EnigmailFiles = ChromeUtils.import("chrome://enigmail/content/modules/files.jsm").EnigmailFiles;
const EnigmailOpenPGP = ChromeUtils.import("chrome://enigmail/content/modules/openpgp.jsm").EnigmailOpenPGP;
const EnigmailKeyRing = ChromeUtils.import("chrome://enigmail/content/modules/keyRing.jsm").EnigmailKeyRing;
const EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;

var EnigmailGnuPGUpdate = {
  isUpdateAvailable: async function() {
    EnigmailLog.DEBUG(`gnupgUpdate.jsm: isUpdateAvailable()\n`);

    if (!this.isGnuPGUpdatable()) return false;

    let now = Math.floor(Date.now() / 1000);
    let lastCheck = Number(EnigmailPrefs.getPref("gpgLastUpdate"));
    if (now > lastCheck) {
      EnigmailPrefs.setPref("gpgLastUpdate", String(now));
    }

    let newVer = await InstallGnuPG.getAvailableInstaller();

    if (newVer && EnigmailVersioning.greaterThan(newVer.gpgVersion, EnigmailGpg.agentVersion)) {
      // new version is available
      return true;
    }

    return false;
  },

  isUpdateCheckNeeded: function() {
    // check once a week
    let now = Math.floor(Date.now() / 1000);
    return (now > Number(EnigmailPrefs.getPref("gpgLastUpdate")) + 604800);
  },

  stopCheckingForUpdate: function() {
    // set the last check date to Dec 31, 2299
    EnigmailPrefs.setPref("gpgLastUpdate", String(Math.floor(Date.parse('31 Dec 2299') / 1000)));
  },

  enableCheckingForUpdate: function() {
    // set the last check date "now"
    let now = Math.floor(Date.now() / 1000);
    EnigmailPrefs.setPref("gpgLastUpdate", String(now));
  },

  isAutoCheckEnabled: function() {
    let farAway = Math.floor(Date.parse('31 Dec 2299') / 1000);
    return Number(EnigmailPrefs.getPref("gpgLastUpdate")) < farAway;
  },


  isGnuPGUpdatable: function() {
    if (!EnigmailPrefs.getPref("gpgUpgradeFrom20")) {
      // don't upgrade if GnuPG 2.0.x is detected
      if (EnigmailVersioning.greaterThan("2.1", EnigmailGpg.agentVersion)) {
        return false;
      }
    }

    try {
      switch (EnigmailOS.getOS()) {
        case "Darwin":
          return isGpgOsxInstalled();
        case "WINNT":
          return isGpg4WinInstalled();
      }
    }
    catch (x) {}

    return false;
  },

  runUpdateCheck: function() {
    EnigmailLog.DEBUG(`gnupgUpdate.jsm: runUpdateCheck()\n`);
    if (!this.isGnuPGUpdatable()) {
      EnigmailLog.DEBUG(`gnupgUpdate.jsm: runUpdateCheck: cannot update GnuPG\n`);
      return;
    }
    if (!this.isUpdateCheckNeeded()) {
      EnigmailLog.DEBUG(`gnupgUpdate.jsm: runUpdateCheck: no checking needed\n`);
      return;
    }

    let self = this;
    let timeoutSec = 300 + Math.floor(Math.random() * 1800);

    EnigmailLog.DEBUG(`gnupgUpdate.jsm: runUpdateCheck: check needed; waiting for ${timeoutSec} seconds\n`);

    EnigmailTimer.setTimeout(async function f() {
      if (await self.isUpdateAvailable()) {
        EnigmailLog.DEBUG(`gnupgUpdate.jsm: runUpdateCheck: check available\n`);
        let w = ChromeUtils.import("chrome://enigmail/content/modules/windows.jsm").EnigmailWindows;
        w.openGnuPGUpdate();
      }
    }, timeoutSec * 1000);
  },

  /**
   * Is is required to upgrade the keyring from GnuPG 2.0 to 2.2
   *
   * @return {Boolean}: true if upgrade required
   */
  requireKeyRingUpgrade: function() {
    return EnigmailVersioning.greaterThan("2.1", EnigmailGpg.agentVersion);
  },

  /**
   * Perform Update of GnuPG.
   *
   * @param {Object} progressListener: same structure as InstallGnuPG progressListener
   */
  performUpdate: function(progressListener) {
    InstallGnuPG.startInstaller(progressListener);
  },

  /**
   * Trigger conversion of GnuPG 2.0 keyring to GnuPG 2.2.
   *
   * This is done by (re-)reading the secret keys, after the file gpg-v21-migrated was deleted.
   */
  triggerKeyringConversion: function() {
    EnigmailLog.DEBUG(`gnupgUpdate.jsm: importKeysFromOldGnupg()\n`);

    if (prepareKeyringConversion()) {
      importKeysFromOldGnuPG();
    }

    EnigmailKeyRing.clearCache();
    EnigmailKeyRing.getAllKeys();
  }
};

function isGpg4WinInstalled() {
  const reg = ["Software\\Gpg4win", "Software\\GNU\\Gpg4win", "Software\\WOW6432Node\\Gpg4win", "Software\\WOW6432Node\\GNU\\Gpg4win"];

  for (let i in reg) {
    let s = EnigmailOS.getWinRegistryString(reg[i], "Installer Language", Ci.nsIWindowsRegKey.ROOT_KEY_LOCAL_MACHINE);
    if (s.length > 0) return true;
  }

  return false;
}

function isGpgOsxInstalled() {
  // check the installation path of GnuPG
  return (EnigmailGpg.agentPath.path.search(/^\/usr\/local\/gnupg-2.[12]\//) === 0);
}

/**
 * Prepare conversion of keyring
 *
 * @return {Boolean}: true - need to import keys / false: key import not needed
 */
function prepareKeyringConversion() {
  // delete gpg-v21-migrated in GnuPG profile if existing
  EnigmailLog.DEBUG(`gnupgUpdate.jsm: prepareKeyringConversion()\n`);
  let homeDir = EnigmailGpgAgent.getGpgHomeDir();
  let gpgHomeDir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  EnigmailFiles.initPath(gpgHomeDir, homeDir);

  try {
    let gpgMigrationFile = gpgHomeDir.clone();
    gpgMigrationFile.append("gpg-v21-migrated");

    if (gpgMigrationFile.exists()) {
      gpgMigrationFile.remove(false);
    }
  }
  catch (ex) {}

  try {
    // if pubring.kbx is present, then re-import all keys from pubring.gpg and secring.gpg
    let pubring = gpgHomeDir.clone();
    pubring.append("pubring.kbx");

    if (pubring.exists()) {
      return true;
    }
  }
  catch(ex) {}

  return false;
}


function importKeysFromOldGnuPG() {
  EnigmailLog.DEBUG(`gnupgUpdate.jsm: importKeysFromOldGnuPG()\n`);

  let homeDir = EnigmailGpgAgent.getGpgHomeDir();
  let gpgHomeDir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  EnigmailFiles.initPath(gpgHomeDir, homeDir);

  let keyRing = gpgHomeDir.clone();
  try {
    keyRing.append("secring.gpg");
    if (keyRing.exists()) EnigmailKeyRing.importKeyFromFile(keyRing);
  }
  catch (ex) {}

  keyRing = gpgHomeDir.clone();
  try {
    keyRing.append("pubring.gpg");
    if (keyRing.exists()) EnigmailKeyRing.importKeyFromFile(keyRing);
  }
  catch (ex) {}
}
