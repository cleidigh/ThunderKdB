/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

// provides sending of an ews message

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "JSAccountUtils", "resource://exquilla/JSAccountUtils.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
ChromeUtils.defineModuleGetter(this, "MailUtils",
  "resource:///modules/MailUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");

ChromeUtils.defineModuleGetter(this, "JaBaseSend",
                               "resource://exquilla/JaBaseSend.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeService",
                               "resource://exquilla/EwsNativeService.jsm");
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");
ChromeUtils.defineModuleGetter(this, "PromiseUtils",
                               "resource://exquilla/PromiseUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("send");
  return _log;
});

// globals

let gSendError = "send failed";

{
  let composeBundle = Services.strings
                              .createBundle("chrome://messenger/locale/messengercompose/composeMsgs.properties");
  gSendError = composeBundle.GetStringFromName("sendFailed");
}

var SMTP_DELIV_MAIL = "smtpDeliveringMail";
var NS_MSG_CREATING_MESSAGE = "creatingMailMessage";

// Extend the base properties.
EwsSend.Properties = {
  __proto__: JaBaseSend.Properties,

  contractID: "@mesquilla.com/ewssend;1",
  classID: Components.ID("{DBF0D7B6-C52A-4323-8B22-E4F892B4F3EE}"),

  // Add an additional interface only needed by this custom class.
  extraInterfaces: [],
}

// Main class.
var global = this;
function EwsSend(aDelegator, aBaseInterfaces) {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);

  // Superclass constructor
  JaBaseSend.call(this, aDelegator, aBaseInterfaces);

  // local instance variables
  this.mailbox = null;
  this.ewsCompose = null; // This is set by ewsCompose when creating the ewsSend object.
  this.testLeak = false; // testing only
  this.recall = false; // Are we re-calling gatherMimeAttachments to generate a file?

// saved parameters
  this.draftItemId = null;
  this._from = null;

  // these are used to override during testing
  this._deliverMode = null;
  this._identity = null;
  this._recallListener = null;
  this._isTesting = false; // only used in testing
}

EwsSend.prototype = {

  // Typical boilerplate to include in all implementations.
  __proto__: JaBaseSend.prototype,

  // InterfaceRequestor override, needed if extraInterfaces.
  getInterface: function(iid) {
    for (let iface of EwsSend.Properties.extraInterfaces) {
      if (iid.equals(iface)) {
        return this;
      }
    }
    return this.QueryInterface(iid);
  },

  notifyListenerOnStopCopy(aStatus) {
    log.debug("notifyListenerOnStopCopy(" + aStatus + ")");
    this.cppBase.QueryInterface(Ci.nsIMsgSend).notifyListenerOnStopCopy(aStatus);
  },

  notifyListenerOnStopSending(aMsgID, aStatus, aMsg, aReturnFile)
  {
    if (this._recallListener) // We are re-calling gatherMimeAttachments
    {
      log.config("recall in sending aStatus is " + aStatus + 
                " aReturnFile.path is " + (aReturnFile ? aReturnFile.path : ""));
      this._recallListener._resolve(
        {msgID: aMsgID, status: aStatus, msg: aMsg, returnFile: aReturnFile});
      return;
    }
    log.debug("calling base notifySenderOnStopSending with status " + aStatus);
    this.cppBase.QueryInterface(Ci.nsIMsgSend)
        .notifyListenerOnStopSending(aMsgID, aStatus, aMsg, aReturnFile);
    return;
  },

  async gatherMimeAttachments()
  {
    // Keep a local reference to the delegator to prevent it from
    // getting garbage collected when we yield to the event loop.
    let delegator = this.delegator;
    log.config("EwsSend gatherMimeAttachments() deliveryMode " + this.deliveryMode);
    if (this.recall)
    {
      // We're using the base gatherMimeAttachments to generate a file. The core code calls
      //  itself again, but that call ends up here instead of in the core code. So
      //  handle that case explicitly.
      log.debug("Recalling core gatherMimeAttachments");
      return this.cppBase.QueryInterface(Ci.nsIMsgSend).gatherMimeAttachments();
    }

    // gatherMimeAttachments becomes the primary entry to complete the send operation,
    // with notifications by notifyListenerOnStopCopy.
    // This is the result for the whole process, default to failure in case
    // we get an exception.
    let gatherMimeResult = Cr.NS_ERROR_FAILURE;
    try {
      let deliveryMode = this.deliveryMode;

      // First, determine if we will be saving an item in the current mailbox
      let sendItemToMailbox = false;
      let saveItemToMailbox = false;
      let savetoURL = "";
      let savetoFolderId = "";
      let savetoNativeFolder = null;
      let identity = this.identity;

      if (deliveryMode == Ci.nsIMsgCompDeliverMode.Background)
      {
        log.info("Send in background not supported, just sending now");
        deliveryMode = Ci.nsIMsgCompDeliverMode.Now;
      }

      if (deliveryMode == Ci.nsIMsgCompDeliverMode.Now ||
          deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsDraft ||
          deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsTemplate)
      {
        // get the saveto URL
        if (identity)
        {
          if (deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsTemplate)
            savetoURL = identity.stationeryFolder;
          else if (deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsDraft)
          {
            savetoURL = identity.draftFolder;
            // FIXME: none of this makes sense with newer design
            //this.cppBase.QueryInterface(Ci.nsIMsgSend)
            //    .notifyListenerOnStopSending(aMsgID, aStatus, aMsg, returnFile);

            //if (this.sendListener)
            //  this.sendListener.onGetDraftFolderURI(savetoURL);
          }
          else if ( (deliveryMode == Ci.nsIMsgCompDeliverMode.Now) && identity.doFcc)
            savetoURL = identity.fccFolder;

          // Check for fccReplyFollowsParent
          // Only check whether the user wants the message in the original message
          // folder if the msgcomptype is some kind of a reply.
          let type = this.ewsCompose.type;
          if (identity.fccReplyFollowsParent &&
              identity.doFcc &&
              this.ewsCompose.originalMsgURI.length && (
                type == Ci.nsIMsgCompType.Reply ||
                type == Ci.nsIMsgCompType.ReplyAll ||
                type == Ci.nsIMsgCompType.ReplyToGroup ||
                type == Ci.nsIMsgCompType.ReplyToSender ||
                type == Ci.nsIMsgCompType.ReplyToSenderAndGroup ||
                type == Ci.nsIMsgCompType.ReplyWithTemplate))
          {
            try {
              let folder = getMsgDBHdrFromURI(this.ewsCompose.originalMsgURI)
                           .folder;
              // per nsMsgSend, rss can falsely report it can file
              if (folder.canFileMessages && (!(folder.server.type == "rss")))
              {
                savetoURL = folder.URI;
                log.debug("saving sent message to original message folder");
              }
            }
            catch (e) {log.warn("error trying to detect reply follows parent" + e);}
          }
        }
        log.debug("Saving draft, fcc, or template to folder <" + savetoURL + ">");

        if (savetoURL.length)
        {
          // I don't trust getExistingFolder to return the correct folder for special
          //  URIs like /Sent /Drafts and /Outbox. So I will detect if the server
          //  is EWS, and if so I will map those special folders specifically to
          //  a root distinguished folder.
          let uriObject = newParsingURI(savetoURL);
          if (uriObject.scheme == "exquilla")
          {
            // Process using native EWS methods
            let serverUri = uriObject.prePath;
            let nativeService = new EwsNativeService();
            let destMailbox = nativeService.getExistingMailbox(serverUri);
            if (destMailbox)
            {
              log.config("path for saveTo folder is " + uriObject.path);
              switch (uriObject.path)
              {
                case "/Sent":
                case "/Sent%20Items": // older version
                case "/Sent Items":   // just to be safe
                  savetoNativeFolder = destMailbox.getNativeFolder("sentitems");
                  break;
                case "/Drafts":
                  savetoNativeFolder = destMailbox.getNativeFolder("drafts");
                  break;
              }
            }
            else
              log.warn("Could not find EWS mailbox with serverURI " + serverUri);
          }

          if (!savetoNativeFolder)
          {
            let folder = MailUtils.getExistingFolder(savetoURL);
            let ewsFolder = safeGetJS(folder, "EwsMsgFolder");
            if (ewsFolder)
              savetoNativeFolder = ewsFolder.nativeMailbox.getNativeFolder(ewsFolder.folderId);
            else if (deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsDraft ||
                   deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsTemplate)
            {
              // we should be able to let the default send handle this
              log.config("Default nsMsgSend can handle this operation");

              this._recallListener = new PromiseUtils.PromiseBase(); // stores _resolve
              executeSoon(this.cppBase.QueryInterface(Ci.nsIMsgSend).gatherMimeAttachments);
              let recallResult = await this._recallListener.promise;
              gatherMimeResult = recallResult.status;
              log.debug("Core gatherMimeAttachments did this operation with result " + gatherMimeResult);
              throw("NEED TO FINISH");
            }
            else
            {
              // must be a send, save the name
              this.savedToFolderName = folder.prettyName;
            }
          }
        }
        if (savetoNativeFolder &&
             (deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsDraft ||
              deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsTemplate))
          saveItemToMailbox = true;
        else
          sendItemToMailbox = true;
      }
      else
      {
        throw CE("we have not implemented delivery mode " + deliveryMode);
      }

      if (!(sendItemToMailbox || saveItemToMailbox))
      {
        throw CE("!(sendItemToMailbox || saveItemToMailbox)");
      }

      // The item to save or send is on the current mailbox, so create it.
      let compFields = this.sendCompFields;
      // create empty message as a property list
      let properties = oPL({ ItemClass: 'IPM.Note' });

      // append set properties
      properties.appendString('Subject', compFields.subject);
      if (compFields.references.length)
        properties.appendString('References', compFields.references);

      let sendBodyType = this.sendBodyType;
      let bodyIsHtml = sendBodyType == "text/html";
      let plainTextBody = null;
      let sendBody = this.sendBody;
      if (bodyIsHtml && compFields.forcePlainText)
      {
        log.debug("Converting HTML body to plain text");
        let wrapLength = 0;
        try {
          wrapLength = Services.prefs.getIntPref("mailnews.wraplength");
        } 
        catch (e) {}
        if (wrapLength == 0 || wrapLength > 990)
          wrapLength = 990;
        else if (wrapLength < 10)
          wrapLength = 10;
        plainTextBody = Cc["@mozilla.org/parserutils;1"].getService(Ci.nsIParserUtils)
                          .convertToPlainText(sendBody, Ci.nsIDocumentEncoder.OutputFormatted, wrapLength);
        bodyIsHtml = false;
      }

      try {
        log.debug("getSendBody length is " + sendBody.length);
        if (plainTextBody) {
          log.debug("plainTextBody.length is " + plainTextBody.length);
          if (Services.prefs.getBoolPref("extensions.exquilla.logBodies"))
          {
            // DEBUG output of plain and original body
            log.debug("plainTextBody:\n" + plainTextBody.substr(0, 500));
            log.debug("sendBody:\n" + sendBody.substr(0, 500));
          }
        }
      }
      catch (e) {log.debug(e);}
      if (bodyIsHtml) {
        // Thunderbird 78 mangles <style><!-- --></style> elements by
        // dropping the closing HTML comment. Exchange doesn't like this.
        // Find and fix offending comments.
        sendBody = sendBody.replace(/(<style[^]*?>\s*<!--[^]*?)(\s*<\/style>)/g, (match, prefix, suffix) => prefix.endsWith("-->") ? match : prefix + " -->" + suffix);
      }
      let bodyPL = oPL(
                     {$value: (plainTextBody ? plainTextBody : sendBody),
                      $attributes: oPL({BodyType: bodyIsHtml ? "HTML" : "Text"})
                     });
      properties.appendPropertyList('Body', bodyPL);
      addAddresses(compFields.to, "ToRecipients", properties);
      addAddresses(compFields.cc, "CcRecipients", properties);
      addAddresses(compFields.bcc, "BccRecipients", properties);
      addAddresses(compFields.replyTo, "ReplyTo", properties);

      // Add to address collector, adapted from msMsgSend::DeliverFileAsMail
      try {
        let collectAddress = Services.prefs.getBoolPref("mail.collect_email_address_outgoing");
        let collector = Cc["@mozilla.org/addressbook/services/addressCollector;1"]
                          .getService(Ci.nsIAbAddressCollector);
        collector.collectAddress(compFields.to, collectAddress, Ci.nsIAbPreferMailFormat.unknown);
        collector.collectAddress(compFields.cc, collectAddress, Ci.nsIAbPreferMailFormat.unknown);
        collector.collectAddress(compFields.bcc, collectAddress, Ci.nsIAbPreferMailFormat.unknown);
      }
      catch (e) {log.warn("Error collecting addresses:", e);}

      let itemToSend = sendItemToMailbox ?
                         this.mailbox.createItem(null, "IPM.Note", this.mailbox.getNativeFolder("outbox")) :
                         savetoNativeFolder.mailbox.createItem(null, "IPM.Note", savetoNativeFolder);
      itemToSend.properties = properties;

      let attachmentCount =  this.attachmentCount;
      log.config("attachment count is " + attachmentCount);
      for (let i = 0; i < attachmentCount; i++)
      {
        try {
          let attachment = this.getAttachment(i);
          if (!attachment.uri) {
            // This attachment is a duplicate of a previous attachment
            // (e.g. image repeated in multiple signatures) so only
            // the contentId (if any) will have been initialised.
            continue;
          }
          if (attachment.sendViaCloud)
          {
            log.config("Send attachment via cloud: " + attachment.name);
            continue;
          }
          let nativeAttachment = itemToSend.addAttachment("");
          let uri = Services.io.newFileURI(attachment.tmpFile)
                            .QueryInterface(Ci.nsIFileURL).spec;
          nativeAttachment.fileURL = uri;
          nativeAttachment.name = attachment.name.length ? attachment.name :
                                                           attachment.tmpFile.leafName;
          nativeAttachment.contentType = attachment.type;
          nativeAttachment.contentId = attachment.contentId;
          log.config("Add native attachment name: " + nativeAttachment.name +
                    " contentType:" + nativeAttachment.contentType +
                    " encoding: " + attachment.encoding +
                    " charset: " + attachment.charset +
                    " alreadyEncoded:" + attachment.alreadyEncoded +
                    " uri: " + uri);

          // nativeAttachment is a wrapper around the item property list, so no need to save
        } 
        catch (e) {
          e.code = "error-add-attachment";
          log.error("Error trying to add attachment", e);
          continue;
        }
      }

      let doServerFcc = false;
      if (sendItemToMailbox)
      {
        let sendSucceeded = false;
        let sendToMailboxResult = Cr.NS_ERROR_FAILURE;
        let fccResult = Cr.NS_OK;
        try {
          // switch message to "Creating mail message"
          if (this.sendReport)
            this.sendReport.currentProcess = Ci.nsIMsgSendReport.process_SMTP;
          else
            log.warn("Missing baseSend.sendReport");
          this.updateStatus(NS_MSG_CREATING_MESSAGE);
          this.notifyListenerOnStartSending(null, null);
          let saveItemListener = new PromiseUtils.MachineListener();
          this.mailbox.saveNewItem(itemToSend, saveItemListener);
          let saveItemMOS = await saveItemListener.promise; // Machine On Stop MOS
          if (!CS(saveItemMOS.status))
            throw("Failed to save new item as prelude to send");

          let fcc = compFields.fcc;
          log.config('fcc to folder ' + fcc);
          let serverFccFolderId = "";
          // see if this folder is on the same server
          let itemServerURI = itemToSend.mailbox.serverURI;
          doServerFcc = savetoNativeFolder &&
                          (savetoNativeFolder.mailbox.serverURI == itemToSend.mailbox.serverURI);
          if (doServerFcc)
            serverFccFolderId = savetoNativeFolder.folderId;

          // switch message to Delivering mail
          this.updateStatus(SMTP_DELIV_MAIL);
          let sendItemMOS = {};
          if (this._isTesting) {
            log.debug("fake Sending item with doServerFcc: " + doServerFcc +
                      " fccFolderId: " + serverFccFolderId);
            sendItemMOS.status = Cr.NS_OK;
            if (doServerFcc) {
              let copyItemListener = new PromiseUtils.MachineListener();
              let itemIds = new StringArray();
              itemIds.append(itemToSend.itemId);
              this.mailbox.copyItems(savetoNativeFolder, itemIds, true, copyItemListener);
              let copyResult = await copyItemListener.promise;
              log.debug("fake send (as move) with result " + copyResult.status);
              sendItemMOS.status = copyResult.status;
            }
          }
          else {
            log.debug("Sending item with doServerFcc: " + doServerFcc +
                      " fccFolderId: " + serverFccFolderId);
            let sendItemListener = new PromiseUtils.MachineListener();
            this.mailbox.sendItem(itemToSend, doServerFcc, serverFccFolderId, sendItemListener);
            sendItemMOS = await sendItemListener.promise;
          }
          sendToMailboxResult = sendItemMOS.status;
          if (sendItemMOS.status == Cr.NS_OK)
            sendSucceeded = true;
        }
        catch (e) {log.error(e);}
        finally {
          if (!sendSucceeded && sendToMailboxResult == Cr.NS_OK)
            sendToMailboxResult = Cr.NS_ERROR_FAILURE;
          log.config("Finished sending item with status " + sendToMailboxResult);
          if (sendToMailboxResult != Cr.NS_OK)
          {
            this.cppBase.QueryInterface(Ci.nsIMsgSend).fail(sendToMailboxResult, gSendError);
          }
          // should we be doing this now, or waiting until completion?
          this.notifyListenerOnStopSending(null, sendToMailboxResult, null, null);
        }

        // Do we have a foreign server fcc to handle?
        if (sendToMailboxResult == Cr.NS_OK &&
            !doServerFcc && savetoURL.length)
        {
          log.config("doing foreign server fcc");
          fccResult = Cr.NS_ERROR_FAILURE; // reset to true after success
          try {
            if (this.sendReport)
              this.sendReport.currentProcess = Ci.nsIMsgSendReport.process_FCC;

            if (savetoNativeFolder)
            {
              log.debug("Saving fcc to folder on foreign ews server");
              itemToSend = itemToSend.clone("", "", savetoNativeFolder);
              let saveFccListener = new PromiseUtils.MachineListener();
              savetoNativeFolder.mailbox.saveNewItem(itemToSend, saveFccListener);
              let saveFccMOS = await saveFccListener.promise;
              fccResult = saveFccMOS.status;
            }
            else if (compFields.fcc.length)
            {
              // use the original gatherMimeAttachments to generate an outgoing file
              this.dontDeliver = true;
              this.recall = true;
              log.debug("calling core gatherMimeAttachments to generate a send file");
              // We'll use an instance listener for gatherMimeAttachments() to call when
              // it is done.
              this._recallListener = new PromiseUtils.PromiseBase(); // stores _resolve
              executeSoon(this.cppBase.QueryInterface(Ci.nsIMsgSend).gatherMimeAttachments);
              let recallResult = await this._recallListener.promise;
              log.debug("after await from base GatherMimeAttachments recallResult is " +
                        (recallResult && recallResult.status));
              // recallResult contains parameters from notifyListenerOnStopSending

              this.recall = false;
              this.dontDeliver = false;
              this._recallListener = null;

              if (recallResult.status == Cr.NS_OK)
              {
                let file = recallResult.returnFile.QueryInterface(Ci.nsIFile);
                log.debug("file with fcc message url is " + file.path);
                // use the copy service to copy this file to the final destination
                const copyService = Cc["@mozilla.org/messenger/messagecopyservice;1"]
                                      .getService(Ci.nsIMsgCopyService);
                let copyListener = new PromiseUtils.CopyListener();
                executeSoon( function () {
                  copyService.CopyFileMessage(file,
                                              MailUtils.getExistingFolder(savetoURL),
                                              null, // msgToReplace
                                              false, // isDraftOrTemplate
                                              0, // aMsgFlags
                                              "", // aMsgKeywords
                                              copyListener, //nsIMsgCopyServiceListener
                                              null); // msgWindow
                                        });
                let copyResult = await copyListener.promise;
                log.debug("fcc copyResult is " + (copyResult && copyResult.status));
                file.remove(false);
                fccResult = copyResult.status;
              }
            }
            else // nothing to do
              fccResult = Cr.NS_OK;
          }
          catch (e) {
            log.warn("Failed to copy sent message to FCC folder: " + e);
          }
        }
        if (sendToMailboxResult == Cr.NS_OK)// we need this since compose will leave open the window
        {
          if (fccResult == Cr.NS_OK)
            this.notifyListenerOnStopCopy(Cr.NS_OK);
          else {
            if (this._isTesting)
              throw CE("Failed to complete fcc");
            else
              this.notifyListenerOnStopCopy(fccResult);
          }
        }

        // do we have an existing item to delete?
        if ((fccResult == Cr.NS_OK && sendToMailboxResult == Cr.NS_OK) &&
          this.ewsCompose.draftItemId && this.ewsCompose.draftItemId.length)
        {
          log.config("Compose is deleting draft copy");
          let itemIds = new StringArray();
          itemIds.append(this.ewsCompose.draftItemId);
          let deleteDraftListener = new PromiseUtils.MachineListener();
          this.mailbox.deleteItems(itemIds, false, deleteDraftListener);
          let deleteDraftMOS = await deleteDraftListener.promise;
          if (deleteDraftMOS.status != Cr.NS_OK)
            log.warn("failed to delete draft message on EWS server");
        }
      }

      else if (saveItemToMailbox) {
        let saveToMailboxResult = Cr.NS_ERROR_FAILURE;
        try {
          let saveItemListener = new PromiseUtils.MachineListener();
          itemToSend.mailbox.saveNewItem(itemToSend, saveItemListener);
          let saveItemMOS = await saveItemListener.promise;

          let newItemId = (saveItemMOS.status == Cr.NS_OK) ? itemToSend.itemId : null;

          if (deliveryMode == Ci.nsIMsgCompDeliverMode.SaveAsDraft)
          {
            // do we have an existing item to delete?
            if (saveItemMOS.status == Cr.NS_OK &&
              this.ewsCompose.draftItemId && this.ewsCompose.draftItemId.length)
            {
              log.debug("Compose is deleting draft copy");
              let itemIds = new StringArray();
              itemIds.append(this.ewsCompose.draftItemId);
              let deleteDraftListener = new PromiseUtils.MachineListener();
              itemToSend.mailbox.deleteItems(itemIds, false, deleteDraftListener);
              let deleteDraftMOS = await deleteDraftListener.promise;
              if (deleteDraftMOS.status != Cr.NS_OK)
                log.warn("Failed to delete draft on EWS server");
            }
            if (newItemId)
              this.ewsCompose.draftItemId = newItemId;
          }
          saveToMailboxResult = Cr.NS_OK;
        }
        catch(e) {log.error(e);}
        finally {
          if (saveToMailboxResult != Cr.NS_OK)
            log.error("Send failed, error code is " + saveToMailboxResult);
          this.notifyListenerOnStopCopy(saveToMailboxResult);
        }
      }

      log.config("Send complete");
      // These seem to be needed to stop a leak, and allow send to release,
      //  which is critical to delete temporary files.
      //this.ewsSend.__proto__ = this.ewsSend.__proto__.__proto__;
      //this.baseSend = null;
    } catch (ex) {
      if (ex != "TESTING") {
        log.error(ex);
        gatherMimeResult = ex.result || Cr.NS_ERROR_FAILURE;
        log.debug("calling notifyListenerOnStopCopy with result " + gatherMimeResult);
        this.notifyListenerOnStopCopy(gatherMimeResult);
      }
    }
  },

  // local functions
  updateStatus(aStatusId) // see nsSmtpProtocol::UpdateStatus
  {
    let statusPosted = false;
    try {
      let progress = this.getProgress();
      if (progress instanceof Ci.nsIMsgProgress)
      {
        let composeBundle = Services.strings
                                    .createBundle("chrome://messenger/locale/messengercompose/composeMsgs.properties");
        let status = (typeof aStatusId == 'number') ? composeBundle.GetStringFromID(aStatusId)
                                                    : composeBundle.GetStringFromName(aStatusId);

        progress.onStatusChange(null, null, Cr.NS_OK, status);
        statusPosted = true;
      }
      else
        log.debug("Missing baseSend.progress");
    } 
    catch (e) {log.warn("updateStatus error: " + e);}
    if (!statusPosted)
      log.warn("Did not post status for statusId " + aStatusId);
  },

  get deliveryMode() {
    if (this._deliveryMode)
      return this._deliveryMode;
    return this.cppBase.deliveryMode;
  },

  get identity() {
    if (this._identity)
      return this._identity;
    return this.cppBase.identity;
  },
}

// helper functions

// add a skink address list to a SOAP property list
function addAddresses(aList, aName, aProperties)
{
  if (!aList.length)
    return;

  let addresses = MailServices.headerParser.parseEncodedHeader(aList, /* COMPAT for TB 68 */"UTF-8");

  let toPL = oPL({});
  for (let address of addresses)
  {
    let mailbox = oPL( {Name: (address.name || ""),
                        EmailAddress: address.email
                       } );
    toPL.appendPropertyList('Mailbox', mailbox);
  }
  if (addresses.length)
    aProperties.appendPropertyList(aName, toPL);
}

// Constructor
function EwsSendConstructor() {
}

// Constructor prototype (not instance prototype).
EwsSendConstructor.prototype = {
  classID: EwsSend.Properties.classID,
  _xpcom_factory: JSAccountUtils.jaFactory(EwsSend.Properties, EwsSend),
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsSendConstructor]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
