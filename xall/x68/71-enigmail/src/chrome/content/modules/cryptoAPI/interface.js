/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

/**
 * CryptoAPI - abstract interface
 */

var inspector;

class CryptoAPI {
  constructor() {
    this.api_name = "null";
  }

  get apiName() {
    return this.api_name;
  }

  /**
   * Initialize the tools/functions required to run the API
   *
   * @param {nsIWindow} parentWindow: parent window, may be NULL
   * @param {Object} esvc: Enigmail service object
   * @param {String } preferredPath: try to use specific path to locate tool (gpg)
   */
  initialize(parentWindow, esvc, preferredPath) {
    return null;
  }

  /**
   * Close/shutdown anything related to the functionality
   */
  finalize() {
    return null;
  }

  /**
   * Synchronize on a Promise: wait synchonously until a promise has completed and return
   * the value that the promise returned.
   *
   * NOTE: just like await, this will throw an exception if the Promise fails with "reject"
   *
   * @param {Promise} promise: the promise to wait for
   *
   * @return {Variant} whatever the promise returns
   */
  sync(promise) {
    if (!inspector) {
      inspector = Cc["@mozilla.org/jsinspector;1"].createInstance(Ci.nsIJSInspector);
    }

    let res = null,
      isError = false;
    let p = promise.then(gotResult => {
      res = gotResult;
      inspector.exitNestedEventLoop();
    }).catch(gotResult => {
      res = gotResult;
      isError = true;
      inspector.exitNestedEventLoop();
    });

    inspector.enterNestedEventLoop(0);

    if (isError) {
      throw res;
    }
    return res;
  }

  /**
   * Obtain signatures for a given set of key IDs.
   *
   * @param {String}  fpr:            key fingerprint
   * @param {Boolean} ignoreUnknownUid: if true, filter out unknown signer's UIDs
   *
   * @return {Promise<Array of Object>}
   *     - {String} userId
   *     - {String} rawUserId
   *     - {String} keyId
   *     - {String} fpr
   *     - {String} created
   *     - {Array} sigList:
   *            - {String} userId
   *            - {String} created
   *            - {String} signerKeyId
   *            - {String} sigType
   *            - {Boolean} sigKnown
   */
  async getKeySignatures(fpr, ignoreUnknownUid = false) {
    return null;
  }

  /**
   * Export the minimum key for the public key object:
   * public key, user ID, newest encryption subkey
   *
   * @param {String} fpr  : a single FPR
   * @param {String} email: [optional] the email address of the desired user ID.
   *                        If the desired user ID cannot be found or is not valid, use the primary UID instead
   *
   * @return {Promise<Object>}:
   *    - exitCode (0 = success)
   *    - errorMsg (if exitCode != 0)
   *    - keyData: BASE64-encded string of key data
   */
  async getMinimalPubKey(fpr, email) {
    return {
      exitCode: -1,
      errorMsg: "",
      keyData: ""
    };
  }

  /**
   * Get a minimal stripped key containing only:
   * - The public key
   * - the primary UID + its self-signature
   * - the newest valild encryption key + its signature packet
   *
   * @param {String} armoredKey: Key data (in OpenPGP armored format)
   *
   * @return {Promise<Uint8Array, or null>}
   */

  async getStrippedKey(armoredKey) {
    return null;
  }

  /**
   * Get the list of all konwn keys (including their secret keys)
   * @param {Array of String} onlyKeys: [optional] only load data for specified key IDs
   *
   * @return {Promise<Array of Object>}
   */
  async getKeys(onlyKeys = null) {
    return [];
  }

  /**
   * Get groups defined in gpg.conf in the same structure as KeyObject
   * [synchronous]
   *
   * @return {Array of KeyObject} with type = "grp"
   */
  getGroupList() {
    return [];
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
    return null;
  }

  /**
   * Import key(s) from a file
   *
   * @param {nsIFile} inputFile:  the file holding the keys
   *
   * @return {Object} or null in case no data / error:
   *   - {Number}          exitCode:        result code (0: OK)
   *   - {Array of String) importedKeys:    imported fingerprints
   *   - {Number}          importSum:       total number of processed keys
   *   - {Number}          importUnchanged: number of unchanged keys
   */

  async importKeyFromFile(inputFile) {
    return null;
  }

  /**
   * Import key(s) from a string
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
    return null;
  }

  /**
   * Delete keys from keyring
   *
   * @param {Array<String>} fpr: fingerprint(s) to delete
   * @param {Boolean} deleteSecretKey: if true, also delete secret keys
   * @param {nsIWindow} parentWindow: parent window for displaying modal dialogs
   *
   * @return {Promise<Object>}:
   *      - {Number} exitCode: 0 if successful, other values indicate error
   *      - {String} errorMsg: error message if deletion not successful
   */
  async deleteKeys(fpr, deleteSecretKey, parentWindow) {
    return null;
  }

  /**
   * Export secret key(s) as ASCII armored data
   *
   * @param {String}  keyId       Specification by fingerprint or keyID, separate mutliple keys with spaces
   * @param {Boolean} minimalKey  if true, reduce key to minimum required
   *
   * @return {Object}:
   *   - {Number} exitCode:  result code (0: OK)
   *   - {String} keyData:   ASCII armored key data material
   *   - {String} errorMsg:  error message in case exitCode !== 0
   */

  async extractSecretKey(keyId, minimalKey) {
    return null;
  }

  /**
   * Export public key(s) as ASCII armored data
   *
   * @param {String}  keyId       Specification by fingerprint or keyID, separate mutliple keys with spaces
   * @param {Boolean} minimalKey  if true, reduce key to minimum required
   *
   * @return {Object}:
   *   - {Number} exitCode:  result code (0: OK)
   *   - {String} keyData:   ASCII armored key data material
   *   - {String} errorMsg:  error message in case exitCode !== 0
   */

  async extractPublicKey(keyId) {
    return null;
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
   * @return {Object}: Handle to key creation
   *    - {function} cancel(): abort key creation
   *    - {Promise<exitCode, generatedKeyId>} promise: resolved when key creation is complete
   *                 - {Number} exitCode:       result code (0: OK)
   *                 - {String} generatedKeyId: generated key ID
   */

  generateKey(name, comment, email, expiryDate, keyLength, keyType, passphrase) {
    return null;
  }


  /**
   * Determine the file name from OpenPGP data.
   *
   * @param {byte} byteData    The encrypted data
   *
   * @return {String} - the name of the attached file
   */

  async getFileName(byteData) {
    return null;
  }

  /**
   * Verify the detached signature of an attachment (or in other words,
   * check the signature of a file, given the file and the signature).
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
    return null;
  }

  /**
   * Decrypt an attachment.
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
    return null;
  }

  /**
   * Generic function to decrypt and/or verify an OpenPGP message.
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

  async decrypt(encrypted, options) {
    return null;
  }

  /**
   * Decrypt a PGP/MIME-encrypted message
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
   *     - {String} userId: signature user Id
   *     - {String} keyId: signature key ID
   *     - {String} sigDetails: as printed by GnuPG for VALIDSIG pattern
    retStatusObj.encToDetails = encToDetails;
*
   *
   * Use Promise.catch to handle failed decryption.
   * retObj.errorMsg will be an error message in this case.
   */

  async decryptMime(encrypted, options) {
    return null;
  }

  /**
   * Verify a PGP/MIME-signed message
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
    return null;
  }

  /**
   * Get details (key ID, UID) of the data contained in a OpenPGP key block
   *
   * @param {String} keyBlockStr  String: the contents of one or more public keys
   *
   * @return {Promise<Array>}: array of objects with the following structure:
   *          - id (key ID)
   *          - fpr
   *          - name (the UID of the key)
   */

  async getKeyListFromKeyBlock(keyBlockStr) {
    return null;
  }

  /**
   * Export the ownertrust database
   * @param {String or nsIFile} outputFile: Output file name or Object - or NULL if trust data
   *                                        should be returned as string
   *
   * @return {Object}:
   *          - ownerTrustData {String}: if outputFile is NULL, the key block data; "" if a file is written
   *          - exitCode {Number}: exit code
   *          - errorMsg {String}: error message
   */
  async getOwnerTrust(outputFile) {
    return {
      exitCode: 0,
      ownerTrustData: "",
      errorMsg: ""
    };
  }


  /**
   * Import the ownertrust database
   *
   * @param {String or nsIFile} inputFile: input file name or Object
   *
   * @return {Object}:
   *         - exitCode {Number}: exit code
   *         - errorMsg {String}: error message
   */
  async importOwnerTrust(inputFile) {
    return {
      exitCode: 0,
      errorMsg: ""
    };
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
   * @return {Object}:
   *     - {Number} exitCode:    0 = success / other values: error
   *     - {String} data:        encrypted data
   *     - {String} errorMsg:    error message in case exitCode !== 0
   *     - {Number} statusFlags: Status flags for result
   */

  async encryptMessage(from, recipients, hiddenRecipients, encryptionFlags, plainText, hashAlgorithm = null, parentWindow = null) {
    return null;
  }

  /**
   * Encrypt Files
   *
   * @param {String} from: keyID or email address of sender/signer
   * @param {String} recipients: keyIDs or email addresses of recipients, separated by spaces
   * @param {String} hiddenRecipients: keyIDs or email addresses of hidden recipients (bcc), separated by spaces
   * @param {Number} encryptionFlags: Flags for Signed/encrypted/PGP-MIME etc.
   * @param {nsIFile} inputFile: source file to encrypt
   * @param {nsIFile} outputFile: target file containing encrypted data
   *
   * @return {Object}:
   *     - {Number} exitCode:    0 = success / other values: error
   *     - {String} data:        encrypted data
   *     - {String} errorMsg:    error message in case exitCode !== 0
   *     - {Number} statusFlags: Status flags for result
   */

  async encryptFile(from, recipients, hiddenRecipients, encryptionFlags, inputFile, outputFile, parentWindow = null) {
    return null;
  }

  /**
   * Clear any cached passwords
   *
   * @return {Boolean} true if successful, false otherwise
   */
  async clearPassphrase() {
    return null;
  }

  /**
   * Return an array containing the aliases and the email addresses
   *
   * @return {Array<{Alias,KeyList}>} <{String,String}>
   */
  getGroups() {
    return [];
  }

  /***
   * Determine if a specific feature is available by the used toolset
   *
   * @param {String} featureName:  String; one of the following values:
   *    version-supported    - is the gpg version supported at all (true for gpg >= 2.0.10)
   *    supports-gpg-agent   - is gpg-agent is auto-started (true for gpg >= 2.0.16)
   *    keygen-passphrase    - can the passphrase be specified when generating keys (false for gpg 2.1 and 2.1.1)
   *    windows-photoid-bug  - is there a bug in gpg with the output of photoid on Windows (true for gpg < 2.0.16)
   *    genkey-no-protection - is "%no-protection" supported for generting keys (true for gpg >= 2.1)
   *    search-keys-cmd      - what command to use to terminate the --search-key operation. ("save" for gpg > 2.1; "quit" otherwise)
   *    socks-on-windows     - is SOCKS proxy supported on Windows (true for gpg >= 2.0.20)
   *    supports-dirmngr     - is dirmngr supported (true for gpg >= 2.1)
   *    supports-ecc-keys    - are ECC (elliptic curve) keys supported (true for gpg >= 2.1)
   *    supports-sender      - does gnupg understand the --sender argument (true for gpg >= 2.1.15)
   *    supports-wkd         - does gpg support wkd (web key directory) (true for gpg >= 2.1.19)
   *    export-result        - does gpg print EXPORTED when exporting keys (true for gpg >= 2.1.10)
   *    decryption-info      - does gpg print DECRYPTION_INFO (true for gpg >= 2.0.19)
   *    export-specific-uid  - does gpg support exporting a key with a specific UID (true for gpg >= 2.2.8)
   *    supports-show-only   - does gpg support --import-options show-only (true for gpg >= 2.1.14)
   *    handles-huge-keys    - can gpg deal with huge keys without aborting (true for gpg >= 2.2.17)
   *    smartcard            - does the library support smartcards
   *
   * @return: depending on featureName - Boolean unless specified differently:
   *    (true if feature is available / false otherwise)
   *   If the feature cannot be found, undefined is returned
   */
  supportsFeature(featureName) {
    return false;
  }

  /**
   * Return the key management functions (sub-API)
   */
  getKeyManagement() {
    return null;
  }

  getTrustLabel(trustCode) {
    return trustCode;
  }
}
