/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/****
   Private sub-module to gnupg.js for handling key import/export
 ****/

"use strict";

var EXPORTED_SYMBOLS = ["GnuPG_importKeyFromFile", "GnuPG_importKeyData", "GnuPG_extractSecretKey", "GnuPG_extractPublicKey",
  "GnuPG_generateKey", "GnuPG_getTrustLabel"
];

const EnigmailExecution = ChromeUtils.import("chrome://enigmail/content/modules/execution.jsm").EnigmailExecution;
const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const EnigmailGpg = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI/gnupg-core.jsm").EnigmailGpg;
const EnigmailFiles = ChromeUtils.import("chrome://enigmail/content/modules/files.jsm").EnigmailFiles;
const EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
const subprocess = ChromeUtils.import("chrome://enigmail/content/modules/subprocess.jsm").subprocess;
const EnigmailPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;


async function GnuPG_importKeyFromFile(inputFile) {
  EnigmailLog.DEBUG("gnupg-key.jsm: importKeysFromFile: fileName=" + inputFile.path + "\n");
  var command = EnigmailGpg.agentPath;
  var args = EnigmailGpg.getStandardArgs(false).concat(["--no-tty", "--batch", "--no-verbose", "--status-fd", "2", "--no-auto-check-trustdb", "--import"]);

  var fileName = EnigmailFiles.getEscapedFilename((inputFile.QueryInterface(Ci.nsIFile)).path);

  args.push(fileName);

  const res = await EnigmailExecution.execAsync(command, args, "");

  let importedKeys = [];
  let importSum = 0;
  let importUnchanged = 0;
  let secCount = 0;
  let secImported = 0;
  let secDups = 0;

  if (res.statusMsg) {
    let r = parseImportResult(res.statusMsg);
    if (r.exitCode !== -1) {
      res.exitCode = r.exitCode;
    }
    if (r.errorMsg !== "") {
      res.errorMsg = r.errorMsg;
    }

    importedKeys = r.importedKeys;
    importSum = r.importSum;
    importUnchanged = r.importUnchanged;
    secCount = r.secCount;
    secImported = r.secImported;
    secDups = r.secDups;
  }

  return {
    exitCode: res.exitCode,
    errorMsg: res.errorMsg,
    importedKeys: importedKeys,
    importSum: importSum,
    importUnchanged: importUnchanged,
    secCount: secCount,
    secImported: secImported,
    secDups: secDups
  };
}

async function GnuPG_importKeyData(keyData, minimizeKey = false, limitedUids = []) {
  let args = EnigmailGpg.getStandardArgs(false).concat(["--no-verbose", "--status-fd", "2"]);
  if (minimizeKey) {
    args = args.concat(["--import-options", "import-minimal"]);
  }

  if (limitedUids.length > 0 && EnigmailGpg.getGpgFeature("export-specific-uid")) {
    let filter = limitedUids.map(i => {
      return `mbox =~ ${i}`;
    }).join(" || ");

    args.push("--import-filter");
    args.push(`keep-uid=${filter}`);
  }
  args = args.concat(["--no-auto-check-trustdb", "--import"]);

  const res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args, keyData);

  let importedKeys = [];
  let importSum = 0;
  let importUnchanged = 0;
  let secCount = 0;
  let secImported = 0;
  let secDups = 0;

  if (res.statusMsg) {
    let r = parseImportResult(res.statusMsg);
    if (r.exitCode !== -1) {
      res.exitCode = r.exitCode;
    }
    if (r.errorMsg !== "") {
      res.errorMsg = r.errorMsg;
    }

    importedKeys = r.importedKeys;
    importSum = r.importSum;
    importUnchanged = r.importUnchanged;
    secCount = r.secCount;
    secImported = r.secImported;
    secDups = r.secDups;
  }

  return {
    exitCode: res.exitCode,
    errorMsg: res.errorMsg,
    importedKeys: importedKeys,
    importSum: importSum,
    importUnchanged: importUnchanged,
    secCount: secCount,
    secImported: secImported,
    secDups: secDups
  };
}

async function GnuPG_extractSecretKey(userId, minimalKey) {
  let args = EnigmailGpg.getStandardArgs(true);
  let exitCode = -1,
    errorMsg = "";

  if (minimalKey) {
    args.push("--export-options");
    args.push("export-minimal,no-export-attributes");
  }

  args.push("-a");
  args.push("--export-secret-keys");

  if (userId) {
    args = args.concat(userId.split(/[ ,\t]+/));
  }

  let res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args, "");
  exitCode = res.exitCode;

  if (res.stdoutData) {
    exitCode = 0;
  }

  if (exitCode !== 0) {
    if (res.errorMsg) {
      errorMsg = EnigmailFiles.formatCmdLine(EnigmailGpg.agentPath, args);
      errorMsg += "\n" + res.errorMsg;
    }
  }

  return {
    keyData: res.stdoutData,
    exitCode: exitCode,
    errorMsg: errorMsg
  };
}


async function GnuPG_extractPublicKey(userId, cleanKey) {
  let args = EnigmailGpg.getStandardArgs(true);
  let exitCode = -1,
    errorMsg = "";

  args.push("-a");
  args.push("--export");
  if (cleanKey) {
    args.push("--export-options");
    args.push("export-clean");
  }

  if (userId) {
    args = args.concat(userId.split(/[ ,\t]+/));
  }

  let res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args, "");
  exitCode = res.exitCode;

  if (res.stdoutData) {
    exitCode = 0;
  }

  if (exitCode !== 0) {
    if (res.errorMsg) {
      errorMsg = EnigmailFiles.formatCmdLine(EnigmailGpg.agentPath, args);
      errorMsg += "\n" + res.errorMsg;
    }
  }

  return {
    keyData: res.stdoutData,
    exitCode: exitCode,
    errorMsg: errorMsg
  };
}

/**
 * Parse GnuPG status output
 *
 * @param statusMsg
 */
function parseImportResult(statusMsg) {
  // IMPORT_RES <count> <no_user_id> <imported> 0 <unchanged>
  //    <n_uids> <n_subk> <n_sigs> <n_revoc> <sec_read> <sec_imported> <sec_dups> <not_imported>

  let import_res = statusMsg.match(/^IMPORT_RES ([0-9]+) ([0-9]+) ([0-9]+) 0 ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+) ([0-9]+)/m);

  let keyList = [];
  let res = {
    errorMsg: "",
    exitCode: -1,
    importedKeys: [],
    importSum: 0,
    importUnchanged: 0
  };

  if (import_res !== null) {
    let secCount = parseInt(import_res[9], 10); // number of secret keys found
    let secImported = parseInt(import_res[10], 10); // number of secret keys imported
    let secDups = parseInt(import_res[11], 10); // number of secret keys already on the keyring

    if (secCount !== secImported + secDups) {
      res.errorMsg = EnigmailLocale.getString("import.secretKeyImportError");
      res.exitCode = 1;
    }
    else {
      res.importSum = parseInt(import_res[1], 10);
      res.importUnchanged = parseInt(import_res[4], 10);
      res.secCount = parseInt(import_res[9], 10); // number of secret keys found
      res.secImported = parseInt(import_res[10], 10); // number of secret keys imported
      res.secDups = parseInt(import_res[11], 10); // number of secret keys already on the keyring

      res.exitCode = 0;
      var statusLines = statusMsg.split(/\r?\n/);

      for (let j = 0; j < statusLines.length; j++) {
        var matches = statusLines[j].match(/IMPORT_OK ([0-9]+) (\w+)/);
        if (matches && (matches.length > 2)) {
          if (typeof(keyList[matches[2]]) != "undefined") {
            keyList[matches[2]] |= Number(matches[1]);
          }
          else
            keyList[matches[2]] = Number(matches[1]);

          res.importedKeys.push(matches[2]);
          EnigmailLog.DEBUG("gnupg-key.jsm: parseImportResult: imported " + matches[2] + ":" + matches[1] + "\n");
        }
      }
    }
  }

  return res;
}


function GnuPG_generateKey(name, comment, email, expiryDate, keyLength, keyType, passphrase) {
  EnigmailLog.DEBUG("gnupg-key.jsm: generateKey()\n");

  let proc = null;
  let generatedKeyId = "";
  let returnHandle = {
    cancel: function() {
      EnigmailLog.DEBUG("gnupg-key.jsm: generateKey -> cancel()\n");
      if (proc) {
        proc.kill(false);
      }
    }
  };

  returnHandle.promise = new Promise((resolve, reject) => {
    const EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
    const args = EnigmailGpg.getStandardArgs(true).concat(["--gen-key"]);

    EnigmailLog.CONSOLE(EnigmailFiles.formatCmdLine(EnigmailGpg.agentPath, args) + "\n");

    let inputData = "%echo Generating key\nKey-Type: ";

    switch (keyType) {
      case "RSA":
        inputData += "RSA\nKey-Usage: sign,auth\nKey-Length: " + keyLength;
        inputData += "\nSubkey-Type: RSA\nSubkey-Usage: encrypt\nSubkey-Length: " + keyLength + "\n";
        break;
      case "ECC":
        inputData += "EDDSA\nKey-Curve: Ed25519\nKey-Usage: sign\n";
        inputData += "Subkey-Type: ECDH\nSubkey-Curve: Curve25519\nSubkey-Usage: encrypt\n";
        break;
      default:
        throw "Invalid algoeithm";
    }

    if (name.replace(/ /g, "").length) {
      inputData += "Name-Real: " + name + "\n";
    }
    if (comment && comment.replace(/ /g, "").length) {
      inputData += "Name-Comment: " + comment + "\n";
    }
    inputData += "Name-Email: " + email + "\n";
    inputData += "Expire-Date: " + String(expiryDate) + "\n";

    EnigmailLog.CONSOLE(inputData + " \n");

    if (passphrase.length) {
      inputData += "Passphrase: " + passphrase + "\n";
    }
    else {
      if (EnigmailGpg.getGpgFeature("genkey-no-protection")) {
        inputData += "%echo no-protection\n";
        inputData += "%no-protection\n";
      }
    }

    inputData += "%commit\n%echo done\n";

    try {
      proc = subprocess.call({
        command: EnigmailGpg.agentPath,
        arguments: args,
        environment: EnigmailCore.getEnvList(),
        charset: null,
        stdin: function(pipe) {
          pipe.write(inputData);
          pipe.close();
        },
        stderr: function(data) {
          // extract key ID
          if (data.search(/^\[GNUPG:\] KEY_CREATED/m)) {
            let m = data.match(/^(\[GNUPG:\] KEY_CREATED [BPS] )([^ \r\n\t]+)$/m);
            if (m && m.length > 2) {
              generatedKeyId = "0x" + m[2];
            }
          }
        },
        done: function(result) {
          try {
            resolve({
              exitCode: result.exitCode,
              generatedKeyId: generatedKeyId
            });
          }
          catch (ex) {}
        },
        mergeStderr: false
      });
    }
    catch (ex) {
      EnigmailLog.ERROR("keyRing.jsm: generateKey: subprocess.call failed with '" + ex.toString() + "'\n");
      reject(ex);
    }

    EnigmailLog.DEBUG("keyRing.jsm: generateKey: subprocess = " + proc + "\n");
  });

  return returnHandle;
}


function GnuPG_getTrustLabel(trustCode) {
  let keyTrust;
  if (EnigmailPrefs.getPref("acceptedKeys") === 0) {
    // only accept valid/authenticated keys
    switch (trustCode) {
      case 'q':
        keyTrust = EnigmailLocale.getString("keyValid.unknown");
        break;
      case 'i':
        keyTrust = EnigmailLocale.getString("keyValid.invalid");
        break;
      case 'd':
      case 'D':
        keyTrust = EnigmailLocale.getString("keyValid.disabled");
        break;
      case 'r':
        keyTrust = EnigmailLocale.getString("keyValid.revoked");
        break;
      case 'e':
        keyTrust = EnigmailLocale.getString("keyValid.expired");
        break;
      case 'n':
        keyTrust = EnigmailLocale.getString("keyTrust.untrusted");
        break;
      case 'm':
        keyTrust = EnigmailLocale.getString("keyTrust.marginal");
        break;
      case 'f':
        keyTrust = EnigmailLocale.getString("keyTrust.full");
        break;
      case 'u':
        keyTrust = EnigmailLocale.getString("keyTrust.ultimate");
        break;
      case 'g':
        keyTrust = EnigmailLocale.getString("keyTrust.group");
        break;
      case '-':
        keyTrust = "-";
        break;
      default:
        keyTrust = "";
    }
  }
  else {
    // simplified validity model if all keys are accepted
    switch (trustCode) {
      case 'n':
        keyTrust = EnigmailLocale.getString("keyTrust.untrusted");
        break;
      case 'd':
      case 'D':
        keyTrust = EnigmailLocale.getString("keyValid.disabled");
        break;
      case 'i':
        keyTrust = EnigmailLocale.getString("keyValid.invalid");
        break;
      case 'r':
        keyTrust = EnigmailLocale.getString("keyValid.revoked");
        break;
      case 'e':
        keyTrust = EnigmailLocale.getString("keyValid.expired");
        break;
      case '-':
      case 'o':
      case 'q':
      case 'm':
      case 'f':
        keyTrust = EnigmailLocale.getString("keyValid.valid");
        break;
      case 'u':
        keyTrust = EnigmailLocale.getString("keyValid.ownKey");
        break;
      case 'g':
        keyTrust = EnigmailLocale.getString("keyTrust.group");
        break;
      default:
        keyTrust = "";
    }
  }
  return keyTrust;
}
