/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */


"use strict";

var EXPORTED_SYMBOLS = ["EnigmailSend"];

const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const EnigmailFiles = ChromeUtils.import("chrome://enigmail/content/modules/files.jsm").EnigmailFiles;
const EnigmailStdlib = ChromeUtils.import("chrome://enigmail/content/modules/stdlib.jsm").EnigmailStdlib;
const EnigmailFuncs = ChromeUtils.import("chrome://enigmail/content/modules/funcs.jsm").EnigmailFuncs;
const Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
const EnigmailRNG = ChromeUtils.import("chrome://enigmail/content/modules/rng.jsm").EnigmailRNG;
var MailServices;
try {
  MailServices = ChromeUtils.import("resource:///modules/MailServices.jsm").MailServices;
}
catch (x) {
  try {
    MailServices = ChromeUtils.import("resource:///modules/MailServices.js").MailServices;
  }
  catch(x) {
    MailServices = ChromeUtils.import("resource://gre/modules/mailServices.js").MailServices;
  }
}

var EnigmailSend = {
  /**
   * Send out an email
   *
   * @param msgData    - String: complete MIME string of email (including all headers etc.)
   * @param compFields - Object: compose fields (nsIMsgCompFields)
   * @param listener   - Object: progress listener (nsIMsgSendListener)
   *
   * @return Boolean - true: everything was OK to send the message
   */

  sendMessage: function(msgData, compFields, listener = null) {
    EnigmailLog.DEBUG("EnigmailSend.sendMessage()\n");
    let tmpFile, msgIdentity;
    try {
      tmpFile = EnigmailFiles.getTempDirObj();
      tmpFile.append("message.eml");
      tmpFile.createUnique(0, 0o600);
    }
    catch (ex) {
      return false;
    }

    EnigmailFiles.writeFileContents(tmpFile, msgData);
    EnigmailLog.DEBUG("EnigmailSend.sendMessage: wrote file: " + tmpFile.path + "\n");

    try {
      msgIdentity = EnigmailStdlib.getIdentityForEmail(compFields.from);
    }
    catch (ex) {
      msgIdentity = EnigmailStdlib.getDefaultIdentity();
    }

    if (!msgIdentity) {
      return false;
    }

    EnigmailLog.DEBUG("EnigmailSend.sendMessage: identity key: " + msgIdentity.identity.key + "\n");

    let acct = EnigmailFuncs.getAccountForIdentity(msgIdentity.identity);
    if (!acct) return false;

    EnigmailLog.DEBUG("EnigmailSend.sendMessage: account key: " + acct.key + "\n");

    let msgSend = Cc["@mozilla.org/messengercompose/send;1"].createInstance(Ci.nsIMsgSend);
    msgSend.sendMessageFile(msgIdentity.identity,
      acct.key,
      compFields,
      tmpFile,
      true, // Delete  File On Completion
      false, (Services.io.offline ? Ci.nsIMsgSend.nsMsgQueueForLater : Ci.nsIMsgSend.nsMsgDeliverNow),
      null,
      listener,
      null,
      ""); // password

    return true;
  },

  /**
   * Send message (simplified API)
   *
   * @param aParams: Object -
   *    - identity: Object - The identity the user picked to send the message
   *    - to:       String - The recipients. This is a comma-separated list of
   *                       valid email addresses that must be escaped already. You probably want to use
   *                       nsIMsgHeaderParser.MakeFullAddress to deal with names that contain commas.
   *    - cc (optional) Same remark.
   *    - bcc (optional) Same remark.
   *    - returnReceipt (optional) Boolean: ask for a receipt
   *    - receiptType (optional) Number: default: take from identity
   *    - requestDsn (optional) Boolean: request a Delivery Status Notification
   *    - composeSecure (optional) (contains securityInfo for TB < 64)
   *
   * @param body: complete message source
   * @param callbackFunc: function(Boolean) - return true if message was sent successfully
   *                                           false otherwise
   *
   * @return Boolean - true: everything was OK to send the message
   */
  simpleSendMessage: function(aParams, body, callbackFunc) {
    EnigmailLog.DEBUG("EnigmailSend.simpleSendMessage()\n");
    let fields = Cc["@mozilla.org/messengercompose/composefields;1"]
      .createInstance(Ci.nsIMsgCompFields);
    let identity = aParams.identity;

    fields.from = identity.email;
    fields.to = aParams.to;
    if ("cc" in aParams) fields.cc = aParams.cc;
    if ("bcc" in aParams) fields.bcc = aParams.bcc;
    fields.returnReceipt = ("returnReceipt" in aParams) ? aParams.returnReceipt : identity.requestReturnReceipt;
    fields.receiptHeaderType = ("receiptType" in aParams) ? aParams.receiptType : identity.receiptHeaderType;
    fields.DSN = ("requestDsn" in aParams) ? aParams.requestDsn : identity.requestDSN;
    if ("composeSecure" in aParams) {
      if ("securityInfo" in fields) {
        // TB < 64
        fields.securityInfo = aParams.securityInfo;
      }
      else
        fields.composeSecure = aParams.composeSecure;
    }

    fields.messageId = EnigmailRNG.generateRandomString(27) + "-enigmail";
    body = "Message-Id: " + fields.messageId + "\r\n" + body;

    let listener = {
      onStartSending: function() {},
      onProgress: function() {},
      onStatus: function() {},
      onGetDraftFolderURI: function() {},
      onStopSending: function(aMsgID, aStatus, aMsg, aReturnFile) {
        if (callbackFunc) callbackFunc(true);
      },
      onSendNotPerformed: function(aMsgID, aStatus) {
        if (callbackFunc) callbackFunc(false);
      }
    };

    return this.sendMessage(body, fields, listener);
  }
};
