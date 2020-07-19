/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */


"use strict";

var EXPORTED_SYMBOLS = ["getGnuPGAPI"];

var Services = Components.utils.import("resource://gre/modules/Services.jsm").Services;

Services.scriptloader.loadSubScript("chrome://enigmail/content/modules/cryptoAPI/interface.js",
  null, "UTF-8"); /* global CryptoAPI */

const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const EnigmailGpg = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI/gnupg-core.jsm").EnigmailGpg;
const EnigmailExecution = ChromeUtils.import("chrome://enigmail/content/modules/execution.jsm").EnigmailExecution;
const EnigmailFiles = ChromeUtils.import("chrome://enigmail/content/modules/files.jsm").EnigmailFiles;
const EnigmailConstants = ChromeUtils.import("chrome://enigmail/content/modules/constants.jsm").EnigmailConstants;
const EnigmailTime = ChromeUtils.import("chrome://enigmail/content/modules/time.jsm").EnigmailTime;
const EnigmailData = ChromeUtils.import("chrome://enigmail/content/modules/data.jsm").EnigmailData;
const EnigmailLocale = ChromeUtils.import("chrome://enigmail/content/modules/locale.jsm").EnigmailLocale;
const EnigmailPassword = ChromeUtils.import("chrome://enigmail/content/modules/passwords.jsm").EnigmailPassword;
const EnigmailErrorHandling = ChromeUtils.import("chrome://enigmail/content/modules/errorHandling.jsm").EnigmailErrorHandling;

const {
  obtainKeyList,
  createKeyObj,
  getPhotoFileFromGnuPG,
  extractSignatures,
  getGpgKeyData
} = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI/gnupg-keylist.jsm");

const {
  GnuPG_importKeyFromFile,
  GnuPG_extractSecretKey,
  GnuPG_extractPublicKey,
  GnuPG_importKeyData,
  GnuPG_generateKey,
  GnuPG_getTrustLabel
} = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI/gnupg-key.jsm");


const DEFAULT_FILE_PERMS = 0o600;

/**
 * GnuPG implementation of CryptoAPI
 */

class GnuPGCryptoAPI extends CryptoAPI {
  constructor() {
    super();
    this.api_name = "GnuPG";
  }

  /**
   * Initialize the tools/functions required to run the API
   *
   * @param {nsIWindow} parentWindow: parent window, may be NULL
   * @param {Object} enigSvc: Enigmail service object
   * @param {String } preferredPath: try to use specific path to locate tool (gpg)
   */
  initialize(parentWindow, enigSvc, preferredPath) {
    const EnigmailGpgAgent = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI/gnupg-agent.jsm").EnigmailGpgAgent;

    EnigmailGpgAgent.setAgentPath(parentWindow, enigSvc, preferredPath);
    EnigmailGpgAgent.detectGpgAgent(parentWindow, enigSvc);
    EnigmailGpgAgent.setDummyAgentInfo();
  }

  /**
   * Close/shutdown anything related to the functionality
   */
  finalize() {
    const EnigmailGpgAgent = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI/gnupg-agent.jsm").EnigmailGpgAgent;
    EnigmailGpgAgent.finalize();
  }

  /**
   * Get the list of all knwn keys (including their secret keys)
   * @param {Array of String} onlyKeys: [optional] only load data for specified key IDs
   *
   * @return {Promise<Array of Object>}
   */
  async getKeys(onlyKeys = null) {
    let keyList = await obtainKeyList(onlyKeys);
    return keyList.keys;
  }

  /**
   * Get groups defined in gpg.conf in the same structure as KeyObject
   *
   * @return {Array of KeyObject} with type = "grp"
   */
  getGroupList() {
    let groups = EnigmailGpg.getGpgGroups();

    let r = [];
    for (var i = 0; i < groups.length; i++) {

      let keyObj = createKeyObj(["grp"]);
      keyObj.keyTrust = "g";
      keyObj.userId = EnigmailData.convertGpgToUnicode(groups[i].alias).replace(/\\e3A/g, ":");
      keyObj.keyId = keyObj.userId;
      var grpMembers = EnigmailData.convertGpgToUnicode(groups[i].keylist).replace(/\\e3A/g, ":").split(/[,;]/);
      for (var grpIdx = 0; grpIdx < grpMembers.length; grpIdx++) {
        keyObj.userIds.push({
          userId: grpMembers[grpIdx],
          keyTrust: "q"
        });
      }
      r.push(keyObj);
    }

    return r;
  }


  /**
   * Obtain signatures for a given set of key IDs.
   *
   * @param {String}  keyId:            space-separated list of key IDs
   * @param {Boolean} ignoreUnknownUid: if true, filter out unknown signer's UIDs
   *
   * @return {Promise<Array of Object>} - see extractSignatures()
   */
  async getKeySignatures(keyId, ignoreUnknownUid = false) {
    EnigmailLog.DEBUG(`gnupg.js: getKeySignatures: ${keyId}\n`);

    let args = EnigmailGpg.getStandardArgs(true).concat(["--with-fingerprint", "--fixed-list-mode", "--with-colons", "--list-sig"]);

    if (keyId.length > 0) {
      args = args.concat(keyId.split(" "));
    }

    let res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args, "");

    if (!(res.statusFlags & EnigmailConstants.BAD_SIGNATURE)) {
      // ignore exit code as recommended by GnuPG authors
      res.exitCode = 0;
    }

    if (res.exitCode !== 0) {
      if (res.errorMsg) {
        res.errorMsg += "\n" + EnigmailFiles.formatCmdLine(EnigmailGpg.agentPath, args);
        res.errorMsg += "\n" + res.errorMsg;
      }
      return "";
    }

    if (res.stdoutData.length > 0) {
      return extractSignatures(res.stdoutData, ignoreUnknownUid);
    }
    return null;
  }


  /**
   * Export the minimum key for the public key object:
   * public key, primary user ID, newest encryption subkey
   *
   * @param {String} fpr:                a single FPR
   * @param {String} email:              [optional] the email address of the desired user ID.
   *                                     If the desired user ID cannot be found or is not valid, use the primary UID instead
   * @param {Array<Number>} subkeyDates: [optional] remove subkeys with sepcific creation Dates
   *
   * @return {Promise<Object>}:
   *    - exitCode (0 = success)
   *    - errorMsg (if exitCode != 0)
   *    - keyData: BASE64-encded string of key data
   */
  async getMinimalPubKey(fpr, email, subkeyDates) {
    EnigmailLog.DEBUG(`gnupg.js: getMinimalPubKey: ${fpr}\n`);

    let retObj = {
      exitCode: 0,
      errorMsg: "",
      keyData: ""
    };
    let minimalKeyBlock = null;

    let args = EnigmailGpg.getStandardArgs(true);

    if (EnigmailGpg.getGpgFeature("export-specific-uid")) {
      // Use GnuPG filters if possible
      let dropSubkeyFilter = "usage!~e && usage!~s";

      if (subkeyDates && subkeyDates.length > 0) {
        dropSubkeyFilter = subkeyDates.map(x => `key_created!=${x}`).join(" && ");
      }
      args = args.concat(["--export-options", "export-minimal,no-export-attributes",
        "--export-filter", "keep-uid=" + (email ? "mbox=" + email : "primary=1"),
        "--export-filter", "drop-subkey=" + dropSubkeyFilter,
        "--export", fpr
      ]);
    }
    else {
      args = args.concat(["--export-options", "export-minimal,no-export-attributes", "-a", "--export", fpr]);
    }

    const statusObj = {};
    const exitCodeObj = {};
    let res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args);
    let exportOK = true;
    let keyBlock = res.stdoutData;

    if (EnigmailGpg.getGpgFeature("export-result")) {
      // GnuPG 2.1.10+
      let r = new RegExp("^\\[GNUPG:\\] EXPORTED " + fpr, "m");
      if (res.stderrData.search(r) < 0) {
        retObj.exitCode = 2;
        retObj.errorMsg = EnigmailLocale.getString("failKeyExtract");
        exportOK = false;
      }
    }
    else {
      // GnuPG older than 2.1.10
      if (keyBlock.length < 50) {
        retObj.exitCode = 2;
        retObj.errorMsg = EnigmailLocale.getString("failKeyExtract");
        exportOK = false;
      }
    }

    if (EnigmailGpg.getGpgFeature("export-specific-uid")) {
      // GnuPG 2.2.9+
      retObj.keyData = btoa(keyBlock);
      return retObj;
    }

    retObj.keyData = minimalKeyBlock;
    return retObj;
  }

  /**
   * Extract a photo ID from a key, store it as file and return the file object.
   *
   * @param {String} keyId:       Key ID / fingerprint
   * @param {Number} photoNumber: number of the photo on the key, starting with 0
   *
   * @return {nsIFile} object or null in case no data / error.
   */
  async getPhotoFile(keyId, photoNumber) {
    let file = await getPhotoFileFromGnuPG(keyId, photoNumber);
    return file;
  }

  /**
   * Import key(s) from a file
   *
   * @param {nsIFile} inputFile:  the file holding the keys
   *
   * @return {Object} or null in case no data / error:
   *   - {Number}          exitCode:        result code (0: OK)
   *   - {Array of String) importedKeys:    imported fingerprints
   *   - {String}          errorMsg:        human readable error message
   *   - {Number}          importSum:       total number of processed keys
   *   - {Number}          importUnchanged: number of unchanged keys
   */
  async importKeyFromFile(inputFile) {
    let keys = await GnuPG_importKeyFromFile(inputFile);
    return keys;
  }

  /**
   * Import key(s) from a file
   *
   * @param {String} keyData:  the key data to be imported (ASCII armored)
   * @param {Boolean} minimizeKey: import the minimum key without any 3rd-party signatures
   * @param {Array of String} limitedUids: skip UIDs that were not specified
   *
   * @return {Object} or null in case no data / error:
   *   - {Number}          exitCode:        result code (0: OK)
   *   - {Array of String) importedKeys:    imported fingerprints
   *   - {Number}          importSum:       total number of processed keys
   *   - {Number}          importUnchanged: number of unchanged keys
   */

  async importKeyData(keyData, minimizeKey, limitedUids) {
    let keys = await GnuPG_importKeyData(keyData, minimizeKey, limitedUids);
    return keys;
  }

  /**
   * Delete keys from keyring
   *
   * @param {Array<String>} fpr: fingerprint(s) to delete. Separate multiple keys with space
   * @param {Boolean} deleteSecretKey: if true, also delete secret keys
   * @param {nsIWindow} parentWindow: parent window for displaying modal dialogs
   *
   * @return {Promise<Object>}:
   *      - {Number} exitCode: 0 if successful, other values indicate error
   *      - {String} errorMsg: error message if deletion not successful
   */
  async deleteKeys(fpr, deleteSecretKey, parentWindow) {
  }


  /**
   * Export secret key(s) as ASCII armored text
   *
   * @param {String}  keyId      Specification by fingerprint or keyID
   * @param {Boolean} minimalKey  if true, reduce key to minimum required
   *
   * @return {Object}:
   *   - {Number} exitCode:  result code (0: OK)
   *   - {String} keyData:   ASCII armored key data material
   *   - {String} errorMsg:  error message in case exitCode !== 0
   */

  async extractSecretKey(keyId, minimalKey) {
    let ret = await GnuPG_extractSecretKey(keyId, minimalKey);

    if (ret.exitCode !== 0) {
      ret.errorMsg = EnigmailLocale.getString("failKeyExtract") + "\n" + ret.errorMsg;
    }
    return ret;
  }

  /**
   * Generate a new key pair
   *
   * @param {String} name:       name part of UID
   * @param {String} comment:    comment part of UID (brackets are added)
   * @param {String} email:      email part of UID (<> will be added)
   * @param {Number} expiryDate: Unix timestamp of key expiry date; 0 if no expiry
   * @param {Number} keyLength:  size of key in bytes (e.g 4096)
   * @param {String} keyType:    'RSA' or 'ECC'
   * @param {String} passphrase: password; use null if no password
   *
   * @return {Object}:
   *    - {function} cancel(): abort key creation
   *    - {Promise<exitCode, generatedKeyId>} promise: resolved when key creation is complete
   *                 - {Number} exitCode:       result code (0: OK)
   *                 - {String} generatedKeyId: generated key ID
   */

  generateKey(name, comment, email, expiryDate, keyLength, keyType, passphrase) {
    return GnuPG_generateKey(name, comment, email, expiryDate, keyLength, keyType, passphrase);
  }

  /**
   * Export public key(s) as ASCII armored text
   *
   * @param {String}  keyId      Specification by fingerprint or keyID
   *
   * @return {Object}:
   *   - {Number} exitCode:  result code (0: OK)
   *   - {String} keyData:   ASCII armored key data material
   *   - {String} errorMsg:  error message in case exitCode !== 0
   */

  async extractPublicKey(keyId) {
    let ret = await GnuPG_extractPublicKey(keyId, EnigmailGpg.getGpgFeature("export-specific-uid"));

    if (ret.exitCode !== 0) {
      ret.errorMsg = EnigmailLocale.getString("failKeyExtract") + "\n" + ret.errorMsg;
    }
    return ret;
  }


  /**
   *
   * @param {byte} byteData    The encrypted data
   *
   * @return {String or null} - the name of the attached file
   */

  async getFileName(byteData) {
    EnigmailLog.DEBUG(`gnupg.js: getFileName()\n`);
    const args = EnigmailGpg.getStandardArgs(true).concat(EnigmailPassword.command()).concat(["--decrypt"]);

    let res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args, byteData + "\n");

    const matches = res.stderrData.match(/^(\[GNUPG:\] PLAINTEXT [0-9]+ [0-9]+ )(.*)$/m);
    if (matches && (matches.length > 2)) {
      var filename = matches[2];
      if (filename.indexOf(" ") > 0) {
        filename = filename.replace(/ .*$/, "");
      }
      return EnigmailData.convertToUnicode(unescape(filename), "utf-8");
    }
    else {
      return null;
    }
  }

  /**
   *
   * @param {String} filePath    Path specification for the signed file
   * @param {String} sigPath     Path specification for the signature file
   *
   * @return {Promise<String>} - A message from the verification.
   *
   * Use Promise.catch to handle failed verifications.
   * The message will be an error message in this case.
   */

  async verifyAttachment(filePath, sigPath) {

  }


  /**
   *
   * @param {Bytes}  encrypted     The encrypted data
   *
   * @return {Promise<Object>} - Return object with decryptedData and
   * status information
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async decryptAttachment(encrypted) {
    EnigmailLog.DEBUG(`gnupg.js: decryptAttachment()\n`);

    let args = EnigmailGpg.getStandardArgs(true);
    args.push("--yes");
    args = args.concat(EnigmailPassword.command());
    args.push("-d");

    let res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args, encrypted);
    return res;
  }


  /**
   *
   * @param {String} encrypted     The encrypted data
   * @param {Object} options       Decryption options
   *      - logFile (the actual file)
   *      - keyserver
   *      - keyserverProxy
   *      - fromAddr
   *      - noOutput
   *      - verifyOnly
   *      - uiFlags
   *      - mimeSignatureFile
   *      - maxOutputLength
   *
   * @return {Promise<Object>} - Return object with decryptedData and status information:
   *     - {String} decryptedData
   *     - {Number} exitCode
   *     - {Number} statusFlags
   *     - {String} errorMsg
   *     - {String} blockSeparation
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async decrypt(encrypted, options) {

  }

  /**
   *
   * @param {String} encrypted     The encrypted data
   * @param {Object} options       Decryption options
   *
   * @return {Promise<Object>} - Return object with decryptedData and
   * status information
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async decryptMime(encrypted, options) {
    EnigmailLog.DEBUG(`gnupg.js: decryptMime()\n`);

    // write something to gpg such that the process doesn't get stuck
    if (encrypted.length === 0) {
      encrypted = "NO DATA\n";
    }

    options.noOutput = false;
    options.verifyOnly = false;
    options.uiFlags = EnigmailConstants.UI_PGP_MIME;

    return this.decrypt(encrypted, options);
  }

  /**
   *
   * @param {String} signedData    The signed data
   * @param {String} signature     The signature data
   * @param {Object} options       Decryption options
   *
   * @return {Promise<Object>} - Return object with decryptedData and
   * status information
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async verifyMime(signedData, signature, options) {
    EnigmailLog.DEBUG(`gnupg.js: verifyMime()\n`);

    options.noOutput = true;
    options.verifyOnly = true;
    options.uiFlags = EnigmailConstants.UI_PGP_MIME;

    // create temp file holding signature data
    let sigFile = EnigmailFiles.getTempDirObj();
    sigFile.append("data.sig");
    sigFile.createUnique(sigFile.NORMAL_FILE_TYPE, 0x180);
    EnigmailFiles.writeFileContents(sigFile, signature, 0x180);

    options.mimeSignatureFile = EnigmailFiles.getEscapedFilename(EnigmailFiles.getFilePath(sigFile));

    let r = await this.decrypt(signedData, options);

    if (sigFile) sigFile.remove(false);
    return r;
  }

  async getKeyListFromKeyBlock(keyBlockStr) {

    let res = await getGpgKeyData(keyBlockStr);
    return res;
  }

  /**
   * Export the ownertrust database from GnuPG
   * @param {String or nsIFile} outputFile: Output file name or Object - or NULL if trust data
   *                                        should be returned as string
   *
   * @return {Object}:
   *          - ownerTrustData {String}: if outputFile is NULL, the key block data; "" if a file is written
   *          - exitCode {Number}: exit code
   *          - errorMsg {String}: error message
   */
  async getOwnerTrust(outputFile) {
    let args = EnigmailGpg.getStandardArgs(true).concat(["--export-ownertrust"]);

    let res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args, "");
    let exitCode = res.exitCode;
    let errorMsg = res.errorMsg;

    if (outputFile) {
      if (!EnigmailFiles.writeFileContents(outputFile, res.stdoutData, DEFAULT_FILE_PERMS)) {
        exitCode = -1;
        errorMsg = EnigmailLocale.getString("fileWriteFailed", [outputFile]);
      }
      return "";
    }

    return {
      ownerTrustData: res.stdoutData,
      exitCode: exitCode,
      errorMsg: errorMsg
    };
  }


  /**
   * Import the ownertrust database into GnuPG
   *
   * @param {String or nsIFile} inputFile: input file name or Object
   *
   * @return {Object}:
   *         - exitCode {Number}: exit code
   *         - errorMsg {String}: error message
   */
  async importOwnerTrust(inputFile) {
    let args = EnigmailGpg.getStandardArgs(true).concat(["--import-ownertrust"]);
    let res = {
      exitCode: -1,
      errorMsg: ""
    };

    let exitCodeObj = {};
    try {
      let trustData = EnigmailFiles.readFile(inputFile);
      res = await EnigmailExecution.execAsync(EnigmailGpg.agentPath, args, trustData);
    }
    catch (ex) {}

    return res;
  }


  /**
   * Encrypt messages
   *
   * @param {String} from: keyID or email address of sender/signer
   * @param {String} recipients: keyIDs or email addresses of recipients, separated by spaces
   * @param {String} hiddenRecipients: keyIDs or email addresses of hidden recipients (bcc), separated by spaces
   * @param {Number} encryptionFlags: Flags for Signed/encrypted/PGP-MIME etc.
   * @param {String} plainText: data to encrypt
   * @param {String} hashAlgorithm: [OPTIONAL] hash algorithm
   * @param {nsIWindow} parentWindow: [OPTIONAL] window on top of which to display modal dialogs
   *
   * @returns {Object}:
   *     - {Number} exitCode:    0 = success / other values: error
   *     - {String} data:        encrypted data
   *     - {String} errorMsg:    error message in case exitCode !== 0
   *     - {Number} statusFlags: Status flags for result
   */
  encryptMessage(from, recipients, hiddenRecipients, encryptionFlags, plainText, hashAlgorithm = null, parentWindow = null) {
    return null;
  }

  async encryptFile(from, recipients, hiddenRecipients, encryptionFlags, inputFile, outputFile, parentWindow) {
    return null;
  }

  /**
   * Clear any cached passwords
   *
   * @return {Boolean} true if successful, false otherwise
   */
  async clearPassphrase() {

    const EnigmailGpgAgent = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI/gnupg-agent.jsm").EnigmailGpgAgent;

    const input = "RELOADAGENT\n/bye\n";

    let res = await EnigmailExecution.execAsync(EnigmailGpgAgent.connGpgAgentPath, [], input);
    return (res.stdoutData.search(/^ERR/m) < 0);
  }

  supportsFeature(featureName) {
    return EnigmailGpg.getGpgFeature(featureName);
  }

  /**
   * Return the key management functions (sub-API)
   */
  getKeyManagement() {
    return null;
  }

  getGroups() {
    return EnigmailGpg.getGpgGroups();
  }

  getTrustLabel(trustCode) {
    return GnuPG_getTrustLabel(trustCode);
  }
}


function getGnuPGAPI() {
  return new GnuPGCryptoAPI();
}
