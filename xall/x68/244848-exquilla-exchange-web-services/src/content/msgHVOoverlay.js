/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2014 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

var exquilla;
if (typeof(exquilla) == 'undefined')
  exquilla = {};

exquilla.msgHVOoverlay = (function _msgHVOoverlay()
{
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const Cr = Components.results;

  ChromeUtils.defineModuleGetter(this, "PromiseUtils",
                                    "resource://exquilla/PromiseUtils.jsm");

  let pub = {};
  if (typeof (exquilla.Utils) == "undefined")
    Object.assign(exquilla, ChromeUtils.import("resource://exquilla/ewsUtils.jsm"));

  // local shorthands
  let re = exquilla.Utils.re;
  let log = exquilla.Utils.ewsLog;
  let safeGetJS = exquilla.Utils.safeGetJS;
  let safeInstanceOf = exquilla.Utils.safeInstanceOf;

  function onLoad()
  {
    // messenger.saveAllAttachments allows no override for account type, so we have to capture
    //  calls to it upstream, and implement our own version here.
    let oldHandleMultipleAttachments = HandleMultipleAttachments;
    HandleMultipleAttachments = function _HandleMultipleAttachments(attachments, action)
    { try {
      log.debug("ExQuilla HandleMultipleAttachments()");
      if (!attachments || !attachments.length)
      {
        log.warn("No attachments found during attachment operation");
        return;
      }

      // determine if this is an ExQuilla message
      let uri = attachments[0].uri;
      if (!(attachments[0].uri.substring(0, 8) == 'exquilla'))
      {
        oldHandleMultipleAttachments(attachments, action);
        return;
      }

      switch (action)
      {
        case "detach":
        case "delete":
          Cu.reportError("detach and delete attachments are not supported in ExQuilla");
          break;

        case "save":
          log.debug("save attachment(s) in ExQuilla");
          saveAllAttachments(attachments);
          break;

        default:
          log.debug("Using standard attachment handler for exquilla attachment, action " + action);
          oldHandleMultipleAttachments(attachments, action);
          break;
      }
    } catch (e) {re(e);}}

    // Override CanDetachAttachments() to detect exquilla
    let oldCanDetachAttachments = CanDetachAttachments;
    CanDetachAttachments = function ewsCanDetachAttachments()
    {
      if (oldCanDetachAttachments())
      {
        // also reject for exquilla type
        let message = gFolderDisplay.selectedMessage;
        if (gFolderDisplay.selectedMessage &&
            !safeGetJS(gFolderDisplay.selectedMessage.folder, "EwsMsgFolder"))
          return true;
      }
      return false;
    }

    // override the save action of AttachmentInfo, since messenger.saveAttachment does not allow
    //  new account types
    let oldAttachmentInfoSave = AttachmentInfo.prototype.save;
    AttachmentInfo.prototype.save = function _AttachmentInfoSave()
    {
      let override = false;
      // detect if this is exquilla or not
      if (this.uri.substring(0, 8) == 'exquilla')
        override = true;
      log.config('override normal AttachmentInfo save? ' + override);
      if (!override)
        oldAttachmentInfoSave.call(this);
      else
      {
        let hdr = messenger.msgHdrFromURI(this.uri);
        let ewsServer = safeGetJS(hdr.folder.server, "EwsIncomingServer");
        try {
          ewsServer.saveAttachment(this.contentType,
                                   this.url,
                                   this.name,
                                   this.uri,
                                   this.isExternalAttachment);
        } catch (e) {Cu.reportError("Failed to save attachment: " + e);}
      }
    };

  }

  const messengerStrings = Cc["@mozilla.org/intl/stringbundle;1"]
                             .getService(Ci.nsIStringBundleService)
                             .createBundle("chrome://messenger/locale/messenger.properties");
  const exquillaStrings = Cc["@mozilla.org/intl/stringbundle;1"]
                                .getService(Ci.nsIStringBundleService)
                                .createBundle("chrome://exquilla/locale/exquilla.properties");

  async function saveAllAttachments(attachments)
  {
      // Get and save the saveas directory
      let filePicker = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      filePicker.init(window,
                      messengerStrings.GetStringFromName("SaveAllAttachments"),
                      Ci.nsIFilePicker.modeGetFolder);

      let lastSaveDir = null;
      try {
        lastSaveDir = Services.prefs.getComplexValue("messenger.save.dir", Ci.nsIFile).data;
        filePicker.setDisplayDirectory(lastSaveDir);
      } catch (e) {}
      let dialogResult = await new Promise(resolve => filePicker.open(resolve));
      if (dialogResult != Ci.nsIFilePicker.returnOK)
        return;
      Services.prefs.setComplexValue("messenger.save.dir", Ci.nsIFile,
          filePicker.file.isDirectory() ? filePicker.file : filePicker.file.parent);

      // invariants over the attachment loop
      let hdr = messenger.msgHdrFromURI(attachments[0].uri);
      let ewsServer = safeGetJS(hdr.folder.server);
      let ewsService = Cc["@mozilla.org/messenger/messageservice;1?type=exquilla"]
                         .getService(Ci.nsIMsgMessageService);
      let mailbox = ewsServer.nativeMailbox;

      // Get if needed the attachment, and copy
      let statusFeedback = msgWindow ? msgWindow.statusFeedback : null;

      if (statusFeedback)
        statusFeedback.showStatusString(exquillaStrings.GetStringFromName("savingAttachments"));
      let hasError = false;
      for (let attachment of attachments)
      {
        // adapted from msqEwsIncomingServer::SaveAttachment
        if (attachment.isExternalAttachment)
        {
          log.warn("External attachments are not supported");
          hasError = true;
          continue;
        }
        
        let neckoURL = {};
        ewsService.GetUrlForUri(attachment.url, neckoURL, null);
        let url = neckoURL.value;
        let ewsUrl = safeGetJS(url, "EwsUrl");
        if (!ewsUrl)
        {
          log.warn("This is not an ews url: " + url.spec);
          hasError = true;
          continue;
        }
        if (!ewsUrl.isAttachment)
        {
          log.warn("This is not an attachment url: " + url.spec)
          hasError = true;
          continue;
        }
        let nativeItem = mailbox.getItem(ewsUrl.itemId);
        let nativeAttachment = nativeItem.getAttachmentByIndex(ewsUrl.attachmentSequence);
        if (!nativeAttachment.isFileAttachment)
        {
          log.warn("Only file attachments can be saved with SaveAll");
          hasError = true;
          continue;
        }

        if (!nativeAttachment.downloaded)
        {
          // get the attachment
          let machineListener = new exquilla.PromiseUtils.MachineListener();
          mailbox.getAttachmentContent(nativeAttachment, machineListener);
          let machineResult = await machineListener.promise;

          if (machineResult.result != Cr.NS_OK || !nativeAttachment.downloaded)
          {
            log.warn("Could not download attachment " + attachment.name);
            hasError = true;
            continue;
          }
        }

        // copy the downloaded file
        try {
          existingFile = Services.io.newURI(nativeAttachment.fileURL, null, null)
                                 .QueryInterface(Ci.nsIFileURL)
                                 .file;
          let saveToFile = filePicker.file.clone();
          saveToFile.append(attachment.name);
          saveToFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
          existingFile.copyTo(filePicker.file, saveToFile.leafName);
          log.config("Attachment saved to location " + saveToFile.path);
        } catch (e) {
          hasError = true;
          log.warn("File save failed for name " + saveToFile + " with error " + e);
        }
      }
      if (statusFeedback)
        statusFeedback.showStatusString(
            hasError? exquillaStrings.GetStringFromName("errorSavingAttachments")
                    : exquillaStrings.GetStringFromName("doneSavingAttachments"));
  }

  // publically available symbols
  pub.onLoad = onLoad;

  return pub;
})();

window.addEventListener("load", function() { exquilla.msgHVOoverlay.onLoad();}, false);
