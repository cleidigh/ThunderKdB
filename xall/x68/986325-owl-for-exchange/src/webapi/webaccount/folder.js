var {moveCopyModule} = ChromeUtils.import("resource:///modules/activity/moveCopy.jsm");
var kMaxMessageMime = 50 << 10; // 50KB
var kRecent = 5 * 24 * 60 * 60; // 5 days
var nsMsgKey_None = 0xffffffff;
var kMaxBatch = 100;

var gStringBundle = Services.strings.createBundle("chrome://messenger/locale/imapMsgs.properties");

/**
 * For debugging / error log only.
 */
function GetFolderInfo(aFolder, aListSubFoldersAndFiles) {
  let info = {
    folderName: aFolder.name,
    folderPath: aFolder.filePath.path,
    folderURI: aFolder.URI,
  };
  if (aListSubFoldersAndFiles) {
    info.existingSubFolders = [];
    for (let subFolder of aFolder.subFolders) {
      info.existingSubFolders.push(GetFolderInfo(subFolder, false));
    }
    let sbd = aFolder.filePath;
    if (!aFolder.isServer) {
      sbd.leafName += ".sbd";
    }
    if (sbd.exists() && sbd.isDirectory()) {
      info.files = [];
      let entries = sbd.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);
      while (entries.hasMoreElements()) {
        info.files.push(entries.nextFile.leafName);
      }
      entries.close();
    }
  }
  return info;
}

/**
 * Create a subfolder with the specified name.
 * Note that the store may return a folder with a different name,
 * if it decided that the provided name was an unsuitable filename.
 * We have to fix the folder's name, and then save the name in a
 * property so that we can restore it after the next local discovery.
 */
function CreateSubfolder(aServer, aParentFolder, aFolderNameOnServer)
{
  let msgFolder = aServer.msgStore.createFolder(aParentFolder, aFolderNameOnServer);
  msgFolder.flags = Ci.nsMsgFolderFlags.Mail;
  msgFolder.name = aFolderNameOnServer;
  // Encode the name because setStringProperty only works with ISO-8859-1 chars.
  msgFolder.setStringProperty("owlEncodedFolderNameOnServer", encodeURIComponent(aFolderNameOnServer));
  return msgFolder;
}

/**
 * Deletes the backing storage for a folder.
 *
 * @param aFolder {nsIMsgFolder} The folder whose storage to delete.
 *
 * In Thunderbird 68, this was available through `aFolder.Delete()`,
 * but that API was renamed and made [noscript] in Thunderbird 72.
 *
 * This function is necessary in three places:
 * 1. When emptying the trash
 * 2. When moving a folder, the new folder has to have its storage removed
 *    so that the old folder's storage can be moved into its place
 * 3. When creating missing archive folders, the message archiver creates a
 *    bogus folder whose storage needs to be removed so that the real
 *    folder can be created by its parent
 */
function DeleteStorage(aFolder)
{
  aFolder.ForceDBClosed();
  let file = aFolder.summaryFile;
  if (file.exists()) {
    file.remove(true);
  }
  aFolder.msgStore.deleteFolder(aFolder);
}

/**
 * Move a folder
 *
 * @see note in _MoveOrRenameFolder()
 *
 * @param aOldFolder {nsIMsgFolder}  The folder to be moved
 * @param aNewParent {nsIMsgFolder} The destination of the move
 * @param aMsgWindow {nsIMsgWindow} (Optional)
 * @returns          {nsIMsgFolder} The new folder object
 *
 * @see note in _MoveOrRenameFolder()
 */
function MoveFolder(aOldFolder, aNewParent, aMsgWindow) {
  return _MoveOrRenameFolder(aOldFolder, aNewParent, null, aMsgWindow);
}

/**
 * Rename a folder
 *
 * @see note in _MoveOrRenameFolder()
 *
 * @param aFolder {nsIMsgFolder}  The folder to be renamed
 * @param aNewName   {String}       The new name of the folder
 * @param aMsgWindow {nsIMsgWindow} (Optional)
 * @returns          {nsIMsgFolder} The new folder object
 */
function RenameFolder(aFolder, aNewName, aMsgWindow) {
  return _MoveOrRenameFolder(aFolder, null, aNewName, aMsgWindow);
}

/**
 * Implementation to move or rename a folder
 *
 * The top-level rename or move has to be done explicitly by
 * creating a new folder and manually moving the data to it.
 * The child folders can then be moved to their new parent.
 *
 * @param aOldFolder {nsIMsgFolder} The folder to be moved or renamed
 * @param aNewParent {nsIMsgFolder} The destination of the move
 * @param aNewName   {String}       The new name of the folder
 * @param aMsgWindow {nsIMsgWindow} (Optional)
 * @returns          {nsIMsgFolder} The new folder object
 */
function _MoveOrRenameFolder(aOldFolder, aNewParent, aNewName, aMsgWindow)
{
  // Create the folder, but clear out the default content.
  // The nsIFile objects will still point to where they should be.
  let destFolder = aNewParent || aOldFolder.parent;
  let newFolder = CreateSubfolder(destFolder.server, destFolder, aNewName || aOldFolder.name);
  DeleteStorage(newFolder);
  aOldFolder.ForceDBClosed();
  let oldFile = aOldFolder.summaryFile;
  let newFile = newFolder.summaryFile;
  oldFile.moveTo(newFile.parent, newFile.leafName);
  oldFile = aOldFolder.filePath;
  newFile = newFolder.filePath;
  if (oldFile.exists()) {
    oldFile.moveTo(newFile.parent, newFile.leafName);
  }
  oldFile.leafName += ".sbd";
  if (oldFile.exists()) {
    oldFile.moveTo(newFile.parent, newFile.leafName + ".sbd");
  }
  if (aOldFolder.matchOrChangeFilterDestination(newFolder, true) && aMsgWindow) {
    aOldFolder.alertFilterChanged(aMsgWindow);
  }
  // Calling this unconditionally for its side-effect of copying the
  // FolderId from the old folder to the new folder. Sadly the C++ code
  // code doesn't do this for leaf folders, nor does it return the new
  // folder, so there's no way to set the FolderId on it in that case.
  newFolder.renameSubFolders(aMsgWindow, aOldFolder);
  // Delete aOldFolder
  aOldFolder.parent.propagateDelete(aOldFolder, false, aMsgWindow);
  aOldFolder.parent = null;
  destFolder.NotifyItemAdded(newFolder);
  return newFolder;
}

/**
 * Delete headers directly at the database level.
 *
 * This method does not delete the messages on the server. It should be used to
 * delete headers locally once they have been deleted or moved on the server.
 *
 * The two arrays should obviously be the same length. Unfortunately the
 * underlying APIs use different sorts of arrays so we're stuck with it.
 *
 * @param aFolder {nsIMsgFolder}       The folder containing the messages
 * @param aHdrs   {Array[nsIMsgDBHdr]} The headers to be deleted
 * @param aKeys   {Array[Integer]}     The keys of the headers
 * @param aNotify {Boolean}            Whether to notify folder listeners
 * @param aIArray {nsIArray?}          COMPAT for TB 68 (bug 1612239)
 */
function deleteFromDatabase(aFolder, aHdrs, aKeys, aNotify, aIArray) {
  if (aFolder.msgDatabase.deleteMessages.length == 3) { // COMPAT for TB 68 (bug 1612239)
    if (!aIArray) {
      aIArray = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      for (let hdr of aHdrs) {
        aIArray.appendElement(hdr);
      }
    }
    aHdrs = aIArray;
  }
  if (aNotify) {
    MailServices.mfn.notifyMsgsDeleted(aHdrs);
  }
  if (!aFolder.msgStore.supportsCompaction) {
    aFolder.msgStore.deleteMessages(aHdrs);
  }
  aFolder.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, false);
  if (aFolder.msgDatabase.deleteMessages.length == 3) { // COMPAT for TB 68 (bug 1612239)
    aFolder.msgDatabase.deleteMessages(aKeys.length, aKeys, null); // COMPAT for TB 68 (bug 1612239)
  } else { // COMPAT for TB 68 (bug 1612239)
    aFolder.msgDatabase.deleteMessages(aKeys, null);
  } // COMPAT for TB 68 (bug 1612239)
  aFolder.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, true);
}

/**
 * Given an nsIMsgDBHdr, safely obtain its Exchange server message ID,
 * if it has one. If it hasn't, and it's a real header, then report the error.
 * @param aHdr {nsIMsgDBHdr}
 * @returns    {String} or null/undefined
 */
function GetIdFromHdr(aHdr)
{
  try {
    let id = aHdr.getStringProperty("X-GM-MSGID");
    // The property would be missing if the header has already been deleted.
    if (id) {
      return id;
    }
  } catch (ex) {
    // We also see NS_ERROR_NULL_POINTER thrown for some reason.
  }

  // Handle error cases
  try {
    // Checks whether the message was already deleted,
    // and just skip this message without error.
    if (!aHdr.folder.msgDatabase.ContainsKey(aHdr.messageKey)) {
      return;
    }
  } catch (ex) {
    logError(ex);
  }
  let error = new Error("Invalid message header");
  error.name = "MissingMSGID";
  logError(error);
}

/**
 * Given an array of message headers, returns the extension's ids,
 * plus optionally the database keys for those headers.
 * @param aMessages  {Array[nsIMsgDBHdr]} The message headers
 * @param aKeys      {out Array[Number]}  Optional array to push the keys
 * @param aIsMessage {out Array[Boolean]} Optional array for is message flags
 * @returns          {Array[String]}      The extension's ids
 */
function GetIdsAndKeysFromHdrs(aMessages, aKeys, aIsMessage)
{
  let ids = [];
  for (let hdr of aMessages) {
    let id = GetIdFromHdr(hdr);
    if (!id) {
      continue;
    }
    ids.push(id);
    if (aKeys) {
      aKeys.push(hdr.messageKey);
    }
    if (aIsMessage) {
      aIsMessage.push(hdr.getStringProperty("isMessage") == "true");
    }
  }
  return ids;
}

/**
 * Performs Mime2 encoding because nsIMsgDBHdr wants encoded header values.
 * @param aHeader         {String} The decoded value.
 * @param aIsEmailAddress {Boolean}
 * @returns               {String} The encoded value.
 */
function encodeMime(aHeader, aIsEmailAddress)
{
  try {
    return MailServices.mimeConverter.encodeMimePartIIStr_UTF8(aHeader, aIsEmailAddress, 8, MailServices.mimeConverter.MIME_ENCODED_WORD_SIZE);
  } catch (ex) {
    logError(ex);
    return aHeader;
  }
}

/**
 * Given an email address, returns an encoded header value.
 * @param aMailboxObject {Mailbox} An object with name and email properties
 * @returns              {String}  The encoded value
 */
function encodeAddress(aMailboxObject)
{
  return encodeMime(MailServices.headerParser.makeMimeHeader([aMailboxObject], 1), true);
}

/**
 * Given an array of email addresses, returns an encoded header value.
 * @param aMailboxObjects {Array[Mailbox]} The mailbox objects
 * @returns               {String}         The encoded value
 */
function encodeAddresses(aMailboxObjects)
{
  return aMailboxObjects.map(encodeAddress).join(", ");
}

/**
 * Sends a progress update to the UI.
 * @param aStatusFeedback {nsIMsgStatusFeedback}
 * @param aFormatString   {String}  Used to format the status message.
 * @param aCurrent        {Integer} The current progress.
 * @param aMax            {Integer} The total progress.
 * @param aName           {String}  The folder name.
 */
function showProgress(aStatusFeedback, aFormatString, aCurrent, aMax, aName)
{
  aStatusFeedback.showProgress(aCurrent * 100 / aMax);
  aStatusFeedback.showStatusString(gStringBundle.formatStringFromName(aFormatString, [aCurrent, aMax, aName], 3)); // COMPAT for TB 68 (bug 1557793)
}

/**
 * Apply filter actions to a matched message.
 * @param aFolder {nsIMsgFolder}    The folder being filtered
 * @param aFilter {nsIMsgFilter}    The filter that matched the header
 * @param aHdr    {nsIMsgDBHdr}     The header of the matched message
 * @param aMsgWindow {nsIMsgWindow}
 * @param aListener {Object}        An object with extended filter properties
 *   database       {nsIMsgDatabase}
 *   logging        {Boolean}       Whether filter logging is enabled
 *   copies         {Array[String]} Folder(s) to copy the message to
 *   delete         {Boolean}       Whether to delete the message
 *   isNew          {Boolean}       Whether the message is still new
 *   move           {Boolean}       Folder to move the message to
 * @return          {Boolean}       Whether to check the remaining filters
 */
function ApplyFilterHit(aFolder, aFilter, aHdr, aMsgWindow, aListener)
{
  let hdrArray;
  let applyMore = true;
  for (let action of /* COMPAT for TB 68 (bug 1612237) */toArray(aFilter.sortedActionList, Ci.nsIMsgRuleAction)) {
    if (aListener.logging) {
      aFilter.logRuleHit(action, aHdr);
    }
    switch (action.type) {
    case Ci.nsMsgFilterAction.Delete:
      aListener.delete = true;
      applyMore = false;
      break;
    case Ci.nsMsgFilterAction.MoveToFolder:
      if (action.targetFolderUri) {
        aListener.move = action.targetFolderUri;
        applyMore = false;
      }
      break;
    case Ci.nsMsgFilterAction.CopyToFolder:
      if (action.targetFolderUri) {
        aListener.copies.push(action.targetFolderUri);
      }
      break;
    case Ci.nsMsgFilterAction.KillSubthread:
      aHdr.OrFlags(Ci.nsMsgMessageFlags.Ignored);
      // fall through
    case Ci.nsMsgFilterAction.MarkRead:
      aHdr.markRead(true);
      aListener.isNew = false;
      noAwait(CallExtension(aFolder.server, "UpdateMessages", { folder: aFolder.getStringProperty("FolderId"), messages: [GetIdFromHdr(aHdr)], read: true }, aMsgWindow), ex => ReportException(ex, aMsgWindow));
      break;
    case Ci.nsMsgFilterAction.MarkUnread:
      aHdr.markRead(false);
      aListener.isNew = true;
      noAwait(CallExtension(aFolder.server, "UpdateMessages", { folder: aFolder.getStringProperty("FolderId"), messages: [GetIdFromHdr(aHdr)], read: false }, aMsgWindow), ex => ReportException(ex, aMsgWindow));
      break;
    case Ci.nsMsgFilterAction.MarkFlagged:
      aHdr.markFlagged(true);
      noAwait(CallExtension(aFolder.server, "UpdateMessages", { folder: aFolder.getStringProperty("FolderId"), messages: [GetIdFromHdr(aHdr)], flagged: true }, aMsgWindow), ex => ReportException(ex, aMsgWindow));
      break;
    case Ci.nsMsgFilterAction.KillThread:
      try {
        let thread = database.GetThreadContainingMsgHdr(aHdr);
        database.MarkThreadIgnored(thread, thread.threadKey, true, null);
      } catch (e) {
        aHdr.setUint32Property("ProtoThreadFlags", Ci.nsMsgMessageFlags.Ignored);
      }
      aHdr.markRead(true);
      aListener.isNew = false;
      noAwait(CallExtension(aFolder.server, "UpdateMessages", { folder: aFolder.getStringProperty("FolderId"), messages: [GetIdFromHdr(aHdr)], read: true }, aMsgWindow), ex => ReportException(ex, aMsgWindow));
      break;
    case Ci.nsMsgFilterAction.WatchThread:
      try {
        let thread = database.GetThreadContainingMsgHdr(aHdr);
        database.MarkThreadWatched(thread, thread.threadKey, true, null);
      } catch (e) {
        aHdr.setUint32Property("ProtoThreadFlags", Ci.nsMsgMessageFlags.Watched);
      }
      break;
    case Ci.nsMsgFilterAction.ChangePriority:
      aHdr.priority = action.priority;
      break;
    case Ci.nsMsgFilterAction.Label:
      aHdr.label = action.label;
      // XXX label on server
      break;
    case Ci.nsMsgFilterAction.AddTag:
      hdrArray = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      hdrArray.appendElement(aHdr);
      aFolder.addKeywordsToMessages(hdrArray, action.strValue);
      break;
    case Ci.nsMsgFilterAction.JunkScore:
      aHdr.setStringProperty("junkscore", action.junkScore);
      aHdr.setStringProperty("junkscoreorigin", "filter");
      if (action.junkScore == Ci.nsIJunkMailPlugin.IS_SPAM_SCORE) {
        aListener.isNew = false;
      }
      // XXX TODO get junk filtering to reclassify message
      break;
    case Ci.nsMsgFilterAction.Forward:
      MailServices.compose.forwardMessage(action.strValue, aHdr, aMsgWindow, aFolder.server, Ci.nsIMsgComposeService.kForwardAsDefault);
      break;
    case Ci.nsMsgFilterAction.Reply:
      MailServices.compose.replyWithTemplate(aHdr, action.strValue, aMsgWindow, aFolder.server);
      break;
    case Ci.nsMsgFilterAction.StopExecution:
      applyMore = false;
      break;
    case Ci.nsMsgFilterAction.Custom:
      hdrArray = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      hdrArray.appendElement(aHdr);
      action.customAction.apply(hdrArray, action.strValue, null, Ci.nsIMsgFilterType.InboxRule, aMsgWindow);
      if (!(aHdr.flags & Ci.nsMsgMessageFlags.New)) {
        aListener.isNew = false;
      }
      break;
    }
  }
  return applyMore;
}

/**
 * Wrapper adound the Copy Service to turn it into an async function.
 * @param aFolder    {nsIMsgFolder} The folder containing the messages
 * @param aMessages  {nsIArray}     The message headers
 * @param aTarget    {nsIMsgFolder} The target folder
 * @param aIsMove    {Boolean}      Whether this is a move
 * @param aMsgWindow {nsIMsgWindow}
 * @returns          {Number}       The final nsresult of the copy
 */
async function CopyMessages(aFolder, aMessages, aTarget, aIsMove, aMsgWindow)
{
  return new Promise((resolve, reject) => {
    let listener = {
      OnStartCopy: function() {},
      OnProgress: function(aProgress, aProgressMax) {},
      SetMessageKey: function(aKey) {},
      GetMessageId: function(aOutMessageId) {},
      OnStopCopy: resolve,
    };
    MailServices.copy.CopyMessages(aFolder, aMessages, aTarget, aIsMove, listener, aMsgWindow, false);
  });
}

/**
 * Updates a folder to be in sync with the server.
 * @param aFolder         {nsIMsgFolder}      The folder to update
 * @param aMsgWindow      {nsIMsgWindow}
 * @param aStatusFeedback {nsIStatusFeedback} An object to receive messages
 * @param aPerformingBiff {Boolean}           Whether this is a biff
 * Note: Only pass a real nsIMsgFolder to this method, not a cppBase object.
 */
async function ResyncFolder(aFolder, aMsgWindow, aStatusFeedback, aGettingNewMessages, aPerformingBiff)
{
  // Check whether the folder is already being updated.
  if (aFolder.locked) {
    return;
  }
  aFolder.acquireSemaphore(aFolder);
  let database = aFolder.msgDatabase;
  let finalStatus = "";
  /// Used to populate an nsIMsgDBHdr object from MIME source.
  let parser = Cc["@mozilla.org/messenger/messagestateparser;1"].createInstance(Ci.nsIMsgParseMailMsgState);
  parser.SetMailDB(database);
  /// Used to convert previews from unicode to the UTF-8 that the backend wants.
  let conv = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
  conv.charset = "UTF-8";
  /// An expression to detect whether a subject is a reply.
  let re = null;
  /// The count of new messages, if we're performing biff.
  let numNewUnread = 0;
  /// An nsIMutableArray of message headers to delete.
  let hdrs = null;
  /// An array of existing message keys.
  let keys = [];
  /// An array of new message ids of large messages.
  let largeIds = [];
  /// An array of new message ids of small messages.
  let smallIds = [];
  /// A map of message ids to partially downloaded headers.
  let partial = {};
  /// A map of message ids to existing partial nsIMsgDBHdr objects.
  let oldHdrs = {};
  /// A list of headers for background offline download.
  let backgroundHdrs = [];
  // Populate the list of keys. We don't have access to an nsIMsgKeyArray
  // object but fortunately XPConnect lets us emulate it.
  let filterList = aFolder.getFilterList(aMsgWindow);
  if (aStatusFeedback) {
    aStatusFeedback.startMeteors();
  }
  try {
    // Compute a regexp to check subjects for Re:
    re = Services.prefs.getComplexValue("mailnews.localizedRe", Ci.nsIPrefLocalizedString).value;
    if (re) {
      re = "|" + re.replace(/,/g, "|");
    }
    re = "^(\\s*(Re|RE|re|rE" + re + ")([\\[(]\d+[\\])])?:\\s*)+";
    // If we logged in this would have updated the pending total count.
    // We use this to estimate the number of flags to download.
    let folder = aFolder.getStringProperty("FolderId");
    let syncState = database.dBFolderInfo.getCharProperty("SyncState");
    let total = aFolder.getTotalMessages(false);
    // Server only gives us 100 flags at once
    let index = 0;
    // But adding the headers will update the values properly,
    // so we need to clear the pending values here.
    aFolder.changeNumPendingTotalMessages(-aFolder.numPendingTotalMessages);
    aFolder.changeNumPendingUnread(-aFolder.numPendingUnread);
    let done;
    do {
      if (aStatusFeedback) {
        showProgress(aStatusFeedback, "imapReceivingMessageFlags3", index + 1, total, aFolder.name);
      }
      let result = await CallExtension(aFolder.server, "FindMessages", { folder, index, syncState }, aMsgWindow);
      index = result.index || index + result.messages.length;
      total = result.total > 0 ? result.total : total;
      syncState = result.syncState;
      done = result.done;
      if (!hdrs) {
        hdrs = [];
        if (!result.deletions) {
          // A full resync has no deletions, so assume everything was deleted.
          database.ListAllKeys({
            appendElement: function(key) {
              keys.push(key);
            },
            setCapacity: function(capacity) {
            },
          });
        }
      }
      for (let message of result.messages) {
        // This call searches all headers for the X-GM-MSGID string property.
        // This is the only search directly supported by the message database.
        // (All other searches work via enumeration and filtering.)
        let hdr = database.GetMsgHdrForGMMsgID(message.id);
        if (hdr) {
          // We already have this message, just update the flags we know about.
          if (keys.includes(hdr.messageKey)) {
            keys.splice(keys.indexOf(hdr.messageKey), 1);
          }
          UpdateHeaderStates(hdr, message);
          // XXX Temporary fix for existing test profiles.
          hdr.AndFlags(~Ci.nsMsgMessageFlags.Partial);
          if (hdr.getStringProperty("X-Partial") == "true") {
            // We failed to fetch the details last time for some reason. Retry.
            if (message.messageSize > kMaxMessageMime) {
              largeIds.push(message.id);
            } else {
              smallIds.push(message.id);
            }
            partial[message.id] = message;
            oldHdrs[message.id] = hdr;
          }
        } else {
          // We don't have quite enough detail to recreate a whole header
          // so create a temporary partial header.
          // XXX TODO find out whether we can get the details more cheaply
          hdr = database.CreateNewHdr(nsMsgKey_None);
          hdr.setStringProperty("X-Partial", "true");
          CopyDetailsToHdr(hdr, re, conv, message);
          database.AddNewHdrToDB(hdr, true);
          message.hdr = hdr;
          total++;
          if (message.messageSize > kMaxMessageMime) {
            largeIds.push(message.id);
          } else {
            smallIds.push(message.id);
          }
          partial[message.id] = message;
          oldHdrs[message.id] = hdr;
        }
      }
      if (result.deletions) {
        for (let id of result.deletions) {
          let hdr = database.GetMsgHdrForGMMsgID(id);
          if (hdr) {
            keys.push(hdr.messageKey);
            hdrs.push(hdr);
          }
        }
      }
    } while (!done);
    if (keys.length) {
      // These headers didn't appear in the query, so we need to delete them.
      if (!hdrs.length) {
        for (let key of keys) {
          hdrs.push(database.GetMsgHdrForKey(key));
        }
      }
      deleteFromDatabase(aFolder, hdrs, keys, true);
    }
    let numNewMsgs = 0;
    // Loop over the headers of the large and small messages.
    // For the large messages we download the headers only.
    // For the small messages we download the raw MIME too.
    for (let mime of [false, true]) {
      let newIds = mime ? smallIds : largeIds;
      // Now download full details for the new messages so we can create headers
      let size = newIds.length;
      let count = 0;
      while (newIds.length) {
        // Check for messages that were deleted before we could download them.
        newIds = newIds.filter(id => !oldHdrs[id] || GetIdFromHdr(oldHdrs[id]));
        if (!newIds.length) {
          break;
        }
        if (aStatusFeedback) {
          showProgress(aStatusFeedback, mime ? "imapFolderReceivingMessageOf3" : "imapReceivingMessageHeaders3", count + 1, size, aFolder.name);
        }
        let messages = newIds.slice(0, kMaxBatch);
        let results = await CallExtension(aFolder.server, mime ? "GetMessagesCompleteMime" : "GetMessagesProperties", { folder, messages }, aMsgWindow);
        for (let details of results) {
          if (details.overloaded) {
            continue;
          }
          let result = details.result;
          let id = details.id;
          newIds.splice(newIds.indexOf(id), 1);
          count++;
          if (!details.succeeded) {
            ReportException(details.e, aMsgWindow);
            finalStatus = details.e.message;
            continue;
          }
          let hdr = oldHdrs[id];
          if (hdr) {
            // This was a partial header we created temporarily.
            // Updating it in place will fail if it's threaded,
            // and if it's filtered we don't want it anyway.
            // Easiest is just to delete it here.
            // Do this before creating the new header so that id search works.
            // First check in case it has already been deleted.
            // In that case we just want to ignore this message.
            if (!GetIdFromHdr(hdr)) {
              continue;
            }
            // We want to notify gloda and search integration,
            // but we don't want this registered as user activity.
            MailServices.mfn.removeListener(moveCopyModule);
            deleteFromDatabase(aFolder, [hdr], [hdr.messageKey], true);
            moveCopyModule.init();
          }
          if (result.mime) {
            parser.state = Ci.nsIMsgParseMailMsgState.ParseHeadersState;
            for (let line of result.mime.match(/[^\n]*\n/g)) {
              parser.ParseAFolderLine(line, line.length);
            }
            if (parser.state == Ci.nsIMsgParseMailMsgState.ParseHeadersState) {
              parser.ParseAFolderLine("\r\n", 2);
            }
            parser.FinishHeader();
            hdr = parser.newMsgHdr;
            parser.Clear();
            parser.envelopePos = 0;
            hdr.setStringProperty("X-GM-MSGID", id);
            UpdateHeaderStates(hdr, partial[id]);
          } else {
            hdr = database.CreateNewHdr(nsMsgKey_None);
            CopyDetailsToHdr(hdr, re, conv, result, partial[id].preview);
          }
          let listener = {
            database: database,
            logging: filterList.loggingEnabled,
            copies: [],
            delete: false,
            isNew: !hdr.isRead,
            move: null,
            applyFilterHit: function(aFilter, aMsgWindow) {
              try {
                return ApplyFilterHit(aFolder, aFilter, hdr, aMsgWindow, this);
              } catch (ex) {
                ReportException(ex, aMsgWindow);
                finalStatus = ex.message;
                throw ex;
              }
            },
          };
          if (!hdr.isRead &&
              (aFolder.flags & Ci.nsMsgFolderFlags.Inbox ||
               aFolder.getInheritedStringProperty("applyIncomingFilters") == "true")) {
            filterList.applyFiltersToHdr(Ci.nsMsgFilterType.Incoming, hdr, aFolder, database, null, listener, aMsgWindow);
            // If we supported junk classification, we would run those filters then.
            if (!listener.move && !listener.delete) {
              filterList.applyFiltersToHdr(Ci.nsMsgFilterType.PostPlugin, hdr, aFolder, database, null, listener, aMsgWindow);
            }
            aFolder.NotifyFolderEvent("FiltersApplied");
          }
          // If there are both copies and a move or delete,
          // we need to ensure that all of the copies have processed first.
          // So instead of triggering the copies in ApplyFilterHit,
          // they are collected by the listener and we then process them here.
          if (listener.copies.length || listener.move) {
            let hdrArray = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
            hdrArray.appendElement(hdr);
            for (let copy of listener.copies) {
              let target = MailServices.folderLookup.getFolderForURL(copy);
              if (listener.move || listener.delete) {
                await CopyMessages(aFolder, hdrArray, target, false, aMsgWindow);
              } else {
                // We don't need to wait for the copy to complete in this case.
                MailServices.copy.CopyMessages(aFolder, hdrArray, target, false, null, aMsgWindow, false);
              }
            }
            if (listener.move) {
              let target = MailServices.folderLookup.getFolderForURL(listener.move);
              // We don't need to wait for the move to complete.
              MailServices.copy.CopyMessages(aFolder, hdrArray, target, true, null, aMsgWindow, false);
            }
          }
          if (listener.delete) {
            // We don't need to wait for the delete to complete.
            noAwait(CallExtension(aFolder.server, "DeleteMessages", { folder: aFolder.getStringProperty("FolderId"), messages: [id], permanent: false, areMessages: partial[id].isMessage }, aMsgWindow), ex => ReportException(ex, aMsgWindow));
          }
          else if (!listener.move) {
            // The message hasn't been moved or deleted, so we're good to add it.
            // This also triggers update of the UI.
            database.AddNewHdrToDB(hdr, true);
            if (listener.isNew) {
              database.AddToNewList(hdr.messageKey);
              aFolder.hasNewMessages = true;
              aGettingNewMessages = false;
              if (aPerformingBiff)
                numNewMsgs++;
            }
            if (result.mime) {
              StoreOfflineMessage(hdr, result.mime); // protocolhandler.js
            } else if (!result.read || result.dateReceived - Date.now() / 1000 > kRecent) {
              backgroundHdrs.push(hdr);
            }
          }
        }
      }
    }
    database.dBFolderInfo.setCharProperty("SyncState", syncState);
    if (numNewMsgs) {
      aFolder.server.performingBiff = true;
      aFolder.setNumNewMessages(numNewMsgs);
      aFolder.biffState = Ci.nsIMsgFolder.nsMsgBiffState_NewMail;
      aFolder.server.performingBiff = false;
    }
    // If aGettingNewMessages is still true at this point, then we tried
    // to get new messages, but there weren't any, so tell the user.
    if (!finalStatus && aGettingNewMessages) {
      finalStatus = gStringBundle.GetStringFromName("imapNoNewMessages");
    }
    noAwait(BackgroundOfflineDownload(backgroundHdrs, aMsgWindow), ex => ReportException(ex, aMsgWindow));
  } finally {
    if (aStatusFeedback) {
      aStatusFeedback.showProgress(0);
      aStatusFeedback.stopMeteors();
      aStatusFeedback.showStatusString(finalStatus);
    }
    aFolder.releaseSemaphore(aFolder);
  }
}

/**
 * Update the read and maybe flagged and attachment states of a header.
 *
 * @param aHdr     {nsIMsgDBHdr} The header to be updated
 * @param aMessage {Object}      The details to update
 */
function UpdateHeaderStates(aHdr, aMessage)
{
  aHdr.markRead(aMessage.read);
  // This might be a ReadFlagChange update without any other data.
  if (typeof aMessage.flagged == "boolean") {
    aHdr.markFlagged(aMessage.flagged);
  }
  if (typeof aMessage.hasAttachments == "boolean") {
    aHdr.markHasAttachments(aMessage.hasAttachments);
  }
  if (typeof aMessage.isMessage == "boolean") {
    aHdr.setStringProperty("isMessage", String(aMessage.isMessage));
  }
  if (Array.isArray(aMessage.tags)) {
    SetTagsOnHdr(aHdr, aMessage.tags);
  }
}

/**
 * Copy the details of a message into an nsIMsgDBHdr object
 *
 * @param aHdr     {nsIMsgDBHdr} The target header
 * @param aRe      {String}      A pattern to match Re: subjects
 * @param aConv    {nsIScriptableUnicodeConverter}
 * @param aDetails {Object}      The message details
 * @param aPreview {String?}     The message preview
 */
function CopyDetailsToHdr(aHdr, aRe, aConv, aDetails, aPreview)
{
  // This is a magic property that we can search on.
  // It's only otherwised used by IMAP to track Gmail messages.
  aHdr.setStringProperty("X-GM-MSGID", aDetails.id);
  aHdr.setPriorityString(aDetails.priority);
  aHdr.markRead(aDetails.read);
  aHdr.markFlagged(aDetails.flagged);
  aHdr.markHasAttachments(aDetails.hasAttachments);
  SetTagsOnHdr(aHdr, aDetails.tags);
  aHdr.messageSize = aDetails.messageSize;
  if (aDetails.subject) {
    let subject = aDetails.subject;
    let match = subject.match(aRe);
    if (match) {
      subject = subject.slice(match[0].length);
      aHdr.OrFlags(Ci.nsMsgMessageFlags.HasRe);
    }
    aHdr.subject = encodeMime(subject);
  }
  if (aDetails.date) {
    aHdr.date = aDetails.date;
  }
  if (aDetails.messageId) {
    aHdr.messageId = aDetails.messageId;
  }
  if (aDetails.ccList) {
    aHdr.ccList = encodeAddresses(aDetails.ccList);
  }
  if (aDetails.bccList) {
    aHdr.bccList = encodeAddresses(aDetails.bccList);
  }
  if (aDetails.author) {
    aHdr.author = encodeAddress(aDetails.author);
  }
  if (aDetails.recipients) {
    aHdr.recipients = encodeAddresses(aDetails.recipients);
  }
  if (aDetails.references) {
    aHdr.setReferences(aDetails.references);
  }
  if (aDetails.dateReceived) {
    aHdr.setUint32Property("dateReceived", aDetails.dateReceived);
  }
  if (aDetails.preview || aPreview) {
    aHdr.setStringProperty("preview", aConv.ConvertFromUnicode(aDetails.preview || aPreview) + aConv.Finish());
  }
}

/**
 * If the tags were changed on the server,
 * save tags in the local message and notify TB.
 *
 * @param aHdr  {nsIMsgDBHdr}   The target header
 * @param aTags {Array[String]} The new tags
 */
function SetTagsOnHdr(aHdr, aTags) {
  let keywords = aTags.map(keyForTag).join(" ");
  if (aHdr.getStringProperty("keywords") != keywords) {
    aHdr.setStringProperty("keywords", keywords);
    aHdr.folder.NotifyPropertyFlagChanged(aHdr, "Keywords", 0, keywords.length);

    // Unfortunately not everyone we want to listens to the above notification,
    // so generate a fake flag change notification to update the thread pane view.
    aHdr.folder.msgDatabase.NotifyHdrChangeAll(aHdr, aHdr.flags, aHdr.flags, null);
  }
}

/**
 * Get or create a TB-internal key for a tag.
 * - Tag = what the user sees
 * - key/keyword = what TB saves internally
 *
 * @param aTag {String} The display name of the tag
 * @returns    {String} The internal keyword of the tag
 */
function keyForTag(aTag) {
  let key = MailServices.tags.getKeyForTag(aTag);
  if (!key) {
    MailServices.tags.addTag(aTag, "#000000", "");
    key = MailServices.tags.getKeyForTag(aTag);
  }
  return key;
}

/**
 * Convert an internal keyword list to a tag array.
 * - Tag = what the user sees
 * - key/keyword = what TB saves internally
 *
 * @param aKeywords {String}        A space-separated list of internal keywords
 * @returns         {Array[String]} An array of tag display names
 */
function keywords2Tags(aKeywords) {
  let tags = [];
  for (let keyword of aKeywords.split(" ")) {
    if (MailServices.tags.isValidKey(keyword)) {
      tags.push(MailServices.tags.getTagForKey(keyword));
    }
  }
  return tags;
}

async function BackgroundOfflineDownload(aHdrArray, aMsgWindow)
{
  for (let hdr of aHdrArray) {
    // Check that the header hasn't been deleted.
    if (!GetIdFromHdr(hdr)) {
      continue;
    }
    // Double-check, no point doing this if it got downloaded elsewhere.
    if (!(hdr.flags & Ci.nsMsgMessageFlags.Offline)) {
      try {
        await DownloadFullMessage(hdr, aMsgWindow); // protocolhandler.js
      } catch (ex) {
        ReportException(ex, aMsgWindow);
      }
    }
  }
}

/// Object used by the jsaccount mechanism to create the component factory.
var gFolderProperties = {
  baseContractID: "@mozilla.org/jacppmsgfolderdelegator;1",
  baseInterfaces: [
    Ci.nsIUrlListener,
    Ci.nsIMsgTraitClassificationListener,
    Ci.nsIMsgFolder,
    Ci.nsIJunkMailClassificationListener,
    Ci.nsIInterfaceRequestor,
    Ci.nsIDBChangeListener,
    Ci.msgIOverride,
  ],
  contractID: "@mozilla.org/mail/folder-factory;1?name=",
  classDescription: "Mail Folder",
  classID: Components.ID("{77d92772-9053-46eb-954f-0a26b15db722}"),
};

if (Ci.nsIRDFResource) { // COMPAT for TB 68 (bug 1527764)
  gFolderProperties.baseInterfaces.push(Ci.nsIRDFResource);
  gFolderProperties.contractID = "@mozilla.org/rdf/resource-factory;1?name=";
}

/// The jsaccount folder extension object.
function Folder(aDelegator, aBaseInterfaces) {
  this.delegator = Cu.getWeakReference(aDelegator);
  this.cppBase = aDelegator.cppBase;
  for (let i of aBaseInterfaces) {
    this.cppBase instanceof i;
  }
  // XXX TODO
}

Folder.prototype = {
  _JsPrototypeToDelegate: true,
  /// nsISupports
  QueryInterface: ChromeUtils.generateQI(gFolderProperties.baseInterfaces),
  /// nsIMsgFolder
  get incomingServerType() {
    return Services.io.extractScheme(this.cppBase.URI);
  },
  /**
   * This has no default implementation because local folders want to rebuild
   * themselves if their summary file is corrupt while IMAP folders want to
   * track their online name.
   */
  getDBFolderInfoAndDB: function(aFolderInfo) {
    // Ensure that we really exist before continuing.
    // Otherwise JsAccount code will create a dummy offline store file,
    // which prevents this folder from being created until the next restart.
    // Worse, the dummy file completely breaks maildir accounts.
    // This can happen on first run when Thunderbird tries to verify
    // Copies and Folders settings, as the folders don't exist yet.
    if (!this.cppBase.filePath.exists()) {
      throw new Error("Attempting to get the database for a folder that doesn't exist");
    }
    let database = this.cppBase.msgDatabase;
    aFolderInfo.value = database.dBFolderInfo;
    return database;
  },
  /**
   * This has no default implementation although all existing classes simply
   * suffix "-message" to the scheme. This may yet become necessary at some
   * point but for now I'm going to try sticking with a single scheme.
   */
  get baseMessageURI() {
    return this.cppBase.URI;
  },
  /**
   * Returns a URI that allows us to load a message. The C++ implementation
   * joins the base message URI with a "#" and the key but that would break
   * any anchors in the message so I'm going for a query-based approach.
   */
  generateMessageURI(messageKey) {
    return this.cppBase.URI + "?key=" + messageKey;
  },
  /**
   * Unlike GenerateMessageURI(), this C++ implementation accesses the internal
   * member instead of calling our override but we didn't want the "#" anyway.
   */
  getUriForMsg(msgHdr) {
    return this.cppBase.URI + "?key=" + msgHdr.messageKey;
  },
  /**
   * Used to prevent people from dropping messages onto shared folder roots.
   */
  get canFileMessages() {
    return this.cppBase.canFileMessages && !this.noSelect;
  },
  /**
   * Used here and by the UI to identify folders that do not contain messages.
   */
  get noSelect() {
    return !!(this.cppBase.flags & (Ci.nsMsgFolderFlags.ImapNoselect | Ci.nsMsgFolderFlags.ImapOtherUser));
  },
  /**
   * Used to prevent people from renaming shared folder roots.
   */
  get canRename() {
    return this.cppBase.canRename && !(this.cppBase.flags & Ci.nsMsgFolderFlags.ImapOtherUser);
  },
  /**
   * Used to enable the Compact item on the context menu.
   */
  get canCompact() {
    return false;
  },
  /**
   * Deletes folders.
   * @param aFolders   {nsIArray} The subfolders to delete (always 1 folder?)
   * @param aMsgWindow {nsIMsgWindow}
   */
  deleteSubFolders: async function(aFolders, aMsgWindow) {
    let strongThis = this.delegator.get();
    try {
      let folder = aFolders.queryElementAt(0, Ci.nsIMsgFolder);
      if (folder.flags & Ci.nsMsgFolderFlags.Virtual) {
        this.cppBase.deleteSubFolders(aFolders, aMsgWindow);
        return;
      }
      let message = this.cppBase.isSpecialFolder(Ci.nsMsgFolderFlags.Trash) ? "imapDeleteNoTrash" : "imapMoveFolderToTrash";
      if (!aMsgWindow.promptDialog.confirmEx(gStringBundle.GetStringFromName("imapDeleteFolderDialogTitle"), gStringBundle.formatStringFromName(message, [folder.name], 1), Ci.nsIPrompt.BUTTON_TITLE_IS_STRING * Ci.nsIPrompt.BUTTON_POS_0 + Ci.nsIPrompt.BUTTON_TITLE_CANCEL * Ci.nsIPrompt.BUTTON_POS_1, gStringBundle.GetStringFromName("imapDeleteFolderButtonLabel"), null, null, null, {})) { // COMPAT for TB 68 (bug 1557793)
        // If we're already a child of Trash then this is a real delete.
        if (this.cppBase.isSpecialFolder(Ci.nsMsgFolderFlags.Trash, true)) {
          if (!this.cppBase.matchOrChangeFilterDestination(null, false) || this.cppBase.confirmFolderDeletionForFilter(aMsgWindow)) {
            await CallExtension(this.cppBase.server, "DeleteFolder", { folder: folder.getStringProperty("FolderId"), parent: this.cppBase.getStringProperty("FolderId"), permanent: true }, aMsgWindow);
            this.cppBase.deleteSubFolders(aFolders, aMsgWindow);
          }
        } else {
          // Move the folder to the trasn.
          MailServices.copy.CopyFolders(aFolders, this.cppBase.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash), true, null, aMsgWindow);
        }
      }
    } catch (ex) {
      ReportException(ex, aMsgWindow);
    }
  },
  /**
   * Creates a folder.
   * @param aName      {String} The name of the new folder
   * @param aMsgWindow {nsIMsgWindow}
   */
  createSubfolder: async function(aName, aMsgWindow) {
    let strongThis = this.delegator.get();
    try {
      let id = await CallExtension(this.cppBase.server, "CreateFolder", { parent: this.cppBase.getStringProperty("FolderId"), name: aName }, aMsgWindow);
      let newFolder = CreateSubfolder(this.cppBase.server, strongThis, aName);
      // Just setting the property doesn't seem to work?!
      if (newFolder.getStringProperty("FolderId") != id) {
        newFolder.setStringProperty("FolderId", id);
      }
    } catch (ex) {
      ReportException(ex, aMsgWindow);
      this.cppBase.NotifyFolderEvent("FolderCreateFailed");
    }
  },
  /**
   * Let everyone know about it when we add a subfolder.
   * We want to do this for startup discoverty too,
   * which is why it's here and not in createSubfolder().
   */
  addSubfolder: function(name) {
    let folder = null;
    try {
      folder = this.cppBase.addSubfolder(name);
      // Ensure that the database exists, in case this is a recycled folder.
      folder.msgDatabase;
      this.cppBase.NotifyItemAdded(folder);
      folder.NotifyFolderEvent("FolderCreateCompleted");
      MailServices.mfn.notifyFolderAdded(folder);
      // Ensure that we're not using a hashed name.
      let existingName = decodeURIComponent(folder.getStringProperty("owlEncodedFolderNameOnServer"));
      if (existingName) {
        folder.name = existingName;
      } else {
        // Migrate the old property, in case it only used ISO-8859-1 characters. TODO Remove after 2019-07-01
        existingName = folder.getStringProperty("owlFolderNameOnServer");
        if (existingName) {
          folder.name = existingName;
          folder.setStringProperty("owlEncodedFolderNameOnServer", encodeURIComponent(existingName));
          folder.setStringProperty("owlFolderNameOnServer", "");
        }
      }
      return folder;
    } catch (ex) {
      try {
        ex.parameters = GetFolderInfo(this.cppBase, true);
        ex.parameters.subFolderName = name;
        if (folder) {
          ex.parameters.subFolder = GetFolderInfo(folder, false);
          try {
            // Check whether the msgDatabase is OK
            folder.msgDatabase;
            ex.parameters.subFolder.msgDatabase = "OK";
            ex.parameters.subFolder.nameOnServer = decodeURIComponent(folder.getStringProperty("owlEncodedFolderNameOnServer")) || folder.getStringProperty("owlFolderNameOnServer");
          } catch (ex2) {
            ex.parameters.subFolder.msgDatabase = ex2.name || "0x" + ex2.result.toString(16);
          }
        }
      } catch (ex2) {
        console.error("Error while logging error " + ex + ":");
        console.error(ex2);
      }
      noAwait(logErrorToServer(ex), console.error);
      ex.report = false;
      throw ex;
    }
  },
  /**
   * Empties the Trash folder.
   * @param aMsgWindow {nsIMsgWindow}
   * @param aListener  {nsIUrlListener}
   * Note: We only support Empty Trash from the UI, which calls this function
   * on the trash folder to be emptied and does not pass a listener.
   * Core support for Empty Trash on exit only exists for IMAP servers.
   */
  emptyTrash: async function(aMsgWindow, aListener) {
    let strongThis = this.delegator.get();
    if (this.cppBase.flags & Ci.nsMsgFolderFlags.Trash) {
      try {
        await CallExtension(this.cppBase.server, "EmptyTrash", null, aMsgWindow);
        for (let child of this.cppBase.subFolders) {
          this.cppBase.propagateDelete(child, true, null);
        }
        // Bulk-delete all the messages by deleting the msf file and storage.
        // This is a little kludgy.
        let dBTransferInfo = this.cppBase.dBTransferInfo;
        DeleteStorage(strongThis);
        this.cppBase.dBTransferInfo = dBTransferInfo;
        this.cppBase.sizeOnDisk = 0;
        MailServices.mfn.notifyFolderDeleted(strongThis);
      } catch (ex) {
        ReportException(ex, aMsgWindow);
      }
    }
  },
  /**
   * Renames a folder.
   * @param aName      {String} The new name of the folder
   * @param aMsgWindow {nsIMsgWindow}
   */
  rename: async function(aName, aMsgWindow) {
    let strongThis = this.delegator.get();
    try {
      if (this.cppBase.flags & Ci.nsMsgFolderFlags.Virtual) {
        this.cppBase.rename(aName, aMsgWindow);
      } else {
        await CallExtension(this.cppBase.server, "RenameFolder", { folder: this.cppBase.getStringProperty("FolderId"), name: aName }, aMsgWindow);
        RenameFolder(strongThis.QueryInterface(Ci.nsIMsgFolder), aName, aMsgWindow);
      }
    } catch (ex) {
      ReportException(ex, aMsgWindow);
    }
  },
  /**
   * Helper function called by rename().
   * @param aMsgWindow {nsIMsgWindow}
   * @param aOldFolder {nsIMsgFolder} The folder which this folder supersedes
   */
  renameSubFolders: function(aMsgWindow, aOldFolder) {
    this.cppBase.flags = aOldFolder.flags;
    this.cppBase.setStringProperty("FolderId", aOldFolder.getStringProperty("FolderId"));
    for (let child of aOldFolder.subFolders) {
      let newFolder = CreateSubfolder(this.cppBase.server, this.delegator.get(), child.name);
      if (child.matchOrChangeFilterDestination(newFolder, true) && aMsgWindow) {
        child.alertFilterChanged(aMsgWindow);
      }
      newFolder.renameSubFolders(aMsgWindow, child);
    }
  },
  /**
   * How many bytes would be saved by compating this folder?
   * Unfortunately autocompaction requires offline support,
   * so we have to lie and say there are no bytes to be saved.
   */
  get expungedBytes() {
    return 0;
  },
  /**
   * Is this folder deletable?
   */
  get deletable() {
    return !this.cppBase.isServer && !this.cppBase.getStringProperty("FolderType");
  },
  /**
   * This gets called when we select a folder in the UI.
   */
  updateFolder: async function(aMsgWindow) {
    let strongThis = this.delegator.get();
    try {
      let dBFolderInfo = this.cppBase.msgDatabase.dBFolderInfo;
      let total = dBFolderInfo.numMessages;
      let unread = dBFolderInfo.numUnreadMessages;
      let folder = this.cppBase.getStringProperty("FolderId");
      if (await CallExtension(this.cppBase.server, "UpdateFolder", { folder, unread, total }, aMsgWindow)) {
        await ResyncFolder(strongThis.QueryInterface(Ci.nsIMsgFolder), aMsgWindow, aMsgWindow && aMsgWindow.statusFeedback, false, false);
      } else {
        // Our database matches the server; ensure the UI is correct too.
        this.cppBase.changeNumPendingTotalMessages(-this.cppBase.numPendingTotalMessages);
        this.cppBase.changeNumPendingUnread(-this.cppBase.numPendingUnread);
      }
    } catch (ex) {
      ReportException(ex, aMsgWindow);
    }
    this.cppBase.NotifyFolderEvent("FolderLoaded");
  },
  /**
   * Deletes messages from a folder.
   * @param aMessages  {nsIArray}     The message headers to delete
   * @param aMsgWindow {nsIMsgWindow}
   * @param aPermanent {Boolean}      Whether the delete should bypass Trash
   * @param aWasMove   {Boolean}      Whether this was a cross-server move
   * @param aListener  {nsIMsgCopyServiceListener} Unused?
   * @param aAllowUndo {Boolean}      Whether this should be undoable // XXX
   */
  deleteMessages: async function(aMessages, aMsgWindow, aPermanent, aWasMove, aListener, aAllowUndo) {
    let strongThis = this.delegator.get();
    try {
      let hdrs = toArray(aMessages, Ci.nsIMsgDBHdr);
      // The nsMsgDBView warns by default when you're deleting messages from
      // the trash, however it doesn't actually let us know to expect a
      // permanent delete, so we have to check for that again...
      if (this.cppBase.getFlag(Ci.nsMsgFolderFlags.Trash)) {
        aPermanent = true;
      }
      let keys = [];
      let isMessage = [];
      let ids = GetIdsAndKeysFromHdrs(hdrs, keys, isMessage);
      if (ids.length) {
        await CallExtension(this.cppBase.server, "DeleteMessages", { folder: this.cppBase.getStringProperty("FolderId"), messages: ids, permanent: aPermanent, areMessages: !isMessage.includes(false) }, aMsgWindow);
      }
      // XXX TODO add the messages to the trash folder
      deleteFromDatabase(this.cppBase, hdrs, keys, !aWasMove, aMessages);
      this.cppBase.NotifyFolderEvent("DeleteOrMoveMsgCompleted");
    } catch (ex) {
      ReportException(ex, aMsgWindow);
      this.cppBase.NotifyFolderEvent("DeleteOrMoveMsgFailed");
    }
  },
  /**
   * Copies messages between folders.
   * @param aSrcFolder {nsIMsgFolder} The source folder, might be cross server
   * @param aMessages  {nsIArray}     The message headers to copy or move
   * @param aIsMove    {Boolean}      Whether this is a copy or a move
   * @param aMsgWindow {nsIMsgWindow}
   * @param aListener  {nsIMsgCopyServiceListener} Unused?
   * @param aIsFolder  {Boolean}      Unused
   * @param aAllowUndo {Boolean}      Whether this should be undoable // XXX
   */
  copyMessages: async function(aSrcFolder, aMessages, aIsMove, aMsgWindow, aListener, aIsFolder, aAllowUndo) {
    let strongThis = this.delegator.get();
    try {
      let hdrs = toArray(aMessages, Ci.nsIMsgDBHdr);
      let cppBase = this.cppBase;
      let keys = [];
      let numUnread = 0;
      if (aSrcFolder.server == cppBase.server) {
        // Same-server copy, just do the copy on the server.
        let ids = GetIdsAndKeysFromHdrs(hdrs, keys);
        if (ids.length) {
          await CallExtension(cppBase.server, aIsMove ? "MoveMessages" : "CopyMessages", { folder: aSrcFolder.getStringProperty("FolderId"), target: cppBase.getStringProperty("FolderId"), messages: ids }, aMsgWindow);
        }
        for (let hdr of hdrs) {
          if (!(hdr.flags & Ci.nsMsgMessageFlags.Read)) {
            numUnread++;
          }
        }
      } else {
        // Cross-server copy, so download the messages from the source.
        let target = cppBase.getStringProperty("FolderType") == "Drafts" ? "" : cppBase.getStringProperty("FolderId");
        let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
        for (let hdr of hdrs) {
          let keywords = hdr.getStringProperty("keywords");
          let uri = aSrcFolder.getUriForMsg(hdr);
          let messageService = messenger.messageServiceFromURI(uri);
          // Convert the listener-based API into a promise that we can await.
          let promise = new Promise((resolve, reject) => {
            let content = "";
            let listener = {
              QueryInterface: ChromeUtils.generateQI([Ci.nsIStreamListener, Ci.nsIRequestObserver]),
              onDataAvailable: function(aRequest, aStream, aOffset, aCount) {
                let stream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
                stream.init(aStream);
                content += stream.read(aCount);
              },
              onStartRequest: function(aRequest) {
              },
              onStopRequest: function(aRequest, aStatus) {
                if (Components.isSuccessCode(aStatus)) {
                  resolve(content);
                } else {
                  reject(Components.Exception("", aStatus));
                }
              },
            };
            messageService.CopyMessage(uri, listener, aIsMove, null, aMsgWindow, {});
          });
          await CallExtension(cppBase.server, "CreateMessageFromMime", { folder: target, content: await promise, draft: false, read: !!(hdr.flags & Ci.nsMsgMessageFlags.Read), flagged: !!(hdr.flags & Ci.nsMsgMessageFlags.Marked), tags: keywords2Tags(keywords) }, aMsgWindow);
          if (!(hdr.flags & Ci.nsMsgMessageFlags.Read)) {
            numUnread++;
          }
        }
      }
      // Rather than performing a full resync, we just fake out the counts.
      cppBase.changeNumPendingTotalMessages(hdrs.length);
      cppBase.changeNumPendingUnread(numUnread);
      if (cppBase.msgDatabase.deleteMessages.length == 3) { // COMPAT for TB 68 (bug 1612239)
        MailServices.mfn.notifyMsgsMoveCopyCompleted(aIsMove, aMessages, strongThis, null); // COMPAT for TB 68 (bug 1612239)
      } else { // COMPAT for TB 68 (bug 1612239)
        MailServices.mfn.notifyMsgsMoveCopyCompleted(aIsMove, hdrs, strongThis, []);
      } // COMPAT for TB 68 (bug 1612239)
      if (aIsMove) {
        if (aSrcFolder.server == cppBase.server) {
          // The messages were moved so delete their headers.
          deleteFromDatabase(aSrcFolder, hdrs, keys, false, aMessages);
        } else {
          // The original messages need to be deleted to complete the move.
          aSrcFolder.deleteMessages(aMessages, aMsgWindow, true, true, null, aAllowUndo);
        }
      }
      MailServices.copy.NotifyCompletion(aSrcFolder, strongThis, Cr.NS_OK);
      if (aIsMove) {
        aSrcFolder.NotifyFolderEvent("DeleteOrMoveMsgCompleted");
      }
    } catch (ex) {
      ReportException(ex, aMsgWindow);
      MailServices.copy.NotifyCompletion(aSrcFolder, strongThis, Cr.NS_ERROR_FAILURE);
      if (aIsMove) {
        aSrcFolder.NotifyFolderEvent("DeleteOrMoveMsgFailed");
      }
    }
  },
  /**
   * Recursively copies folders.
   * @param aSrcFolder {nsIMsgFolder} The source folder, might be cross server
   * @param aIsMove    {Boolean}      Whether this is a copy or a move
   * @param aMsgWindow {nsIMsgWindow}
   * @param aListener  {nsIMsgCopyServiceListener} Unused?
   * Note: the UI can only generate a same-server move or a cross-server copy.
   * The other backend implementations don't support other operations.
   */
  copyFolder: function(aSrcFolder, aIsMove, aMsgWindow, aListener) {
    // Cross-server folder copies not supported yet.
    if (!aIsMove || aSrcFolder.server != this.cppBase.server) {
      throw Cr.NS_ERROR_NOT_AVAILABLE;
    }
    if (aSrcFolder.flags & Ci.nsMsgFolderFlags.Virtual) {
      throw Cr.NS_ERROR_NOT_AVAILABLE;
    }
    // Deleting a folder turns into a move to the Trash folder. Confirm it now.
    if (this.cppBase.getStringProperty("FolderType") == "Trash") {
      if (aSrcFolder.matchOrChangeFilterDestination(null, false)) {
        if (!aSrcFolder.confirmFolderDeletionForFilter(aMsgWindow)) {
          throw Cr.NS_ERROR_FAILURE;
        }
      }
    }
    // This bit needs to be async. It's either this or manual .then()/.catch().
    let strongThis = this.delegator.get();
    (async () => {
      try {
        await CallExtension(this.cppBase.server, "MoveFolder", { folder: aSrcFolder.getStringProperty("FolderId"), target: this.cppBase.getStringProperty("FolderId") }, aMsgWindow);
        let msgFolder = MoveFolder(aSrcFolder, strongThis.QueryInterface(Ci.nsIMsgFolder), aMsgWindow);
        MailServices.copy.NotifyCompletion(aSrcFolder, msgFolder, Cr.NS_OK);
      } catch (ex) {
        ReportException(ex, aMsgWindow);
        MailServices.copy.NotifyCompletion(aSrcFolder, strongThis, Cr.NS_ERROR_FAILURE);
      }
    })();
  },
  /**
   * Copies a .eml file to a folder, or saves a draft.
   * @param aFile         {nsIFile}        The .eml file to copy
   * @param aHdrToReplace {nsIMsgDBHdr}    The previous draft
   * @param aIsDraft      {Boolean}        Whether this is a draft
   * @param aMsgFlags     {Number}         The flags to set on the message
   * @param aKeywords     {String}         The keys to set on the message
   * @param aMsgWindow    {nsIMsgWindow}   The window to use for prompts
   * @param aListener     {nsIUrlListener} A listener for the new message key
   */
  copyFileMessage: async function(aFile, aHdrToReplace, aIsDraft, aMsgFlags, aKeywords, aMsgWindow, aListener) {
    let strongThis = this.delegator.get();
    try {
      let target = this.cppBase.getStringProperty("FolderType") == "Drafts" ? "" : this.cppBase.getStringProperty("FolderId");
      let content = await readFileAsync(aFile);
      let id = await CallExtension(this.cppBase.server, "CreateMessageFromMime", { folder: target, content: content, draft: aIsDraft, read: !!(aMsgFlags & Ci.nsMsgMessageFlags.Read), flagged: !!(aMsgFlags & Ci.nsMsgMessageFlags.Marked), tags: keywords2Tags(aKeywords) }, aMsgWindow);
      if (aListener && id) {
        // XXX Thunderbird has a "pending header" system to avoid a full resync
        await ResyncFolder(strongThis.QueryInterface(Ci.nsIMsgFolder), aMsgWindow, null, false, false);
        let msgHdr = this.cppBase.msgDatabase.GetMsgHdrForGMMsgID(id);
        if (msgHdr) {
          aListener.SetMessageKey(msgHdr.messageKey);
        }
      } else {
        this.cppBase.changeNumPendingTotalMessages(1);
      }
      MailServices.copy.NotifyCompletion(aFile, strongThis, Cr.NS_OK);
    } catch (ex) {
      ReportException(ex, aMsgWindow);
      MailServices.copy.NotifyCompletion(aFile, strongThis, Cr.NS_ERROR_FAILURE);
    }
  },
  /**
   * Called to get new messages for a server or folder.
   * (Getting messages for a server calls through to the root folder.)
   * @param aMsgWindow {aMsgWindow}     The window to use for prompts
   * aParam aListener  {nsIUrlListener} Unused
   */
  getNewMessages: async function(aMsgWindow, aListener) {
    let strongThis = this.delegator.get();
    let performingBiff = false;
    try {
      // Getting new messages for a server might be a biff.
      // Mark the server as busy until the biff completes to avoid reentrancy.
      performingBiff = this.cppBase.server.performingBiff;
      if (performingBiff) {
        this.cppBase.server.serverBusy = true;
      }
      // We need to log in first so that the folders have been discovered.
      await CallExtension(this.cppBase.server, "EnsureLoggedIn", null, aMsgWindow);
      if (this.cppBase.getStringProperty("FolderId")) {
        // Getting new messages for a single folder.
        // Resync the folder, but tell the user if there are no new messages.
        await ResyncFolder(strongThis.QueryInterface(Ci.nsIMsgFolder), aMsgWindow, aMsgWindow && aMsgWindow.statusFeedback, true, false);
      } else { // Getting new messages for the server
        // Update the unread counts on all folders. This triggers a
        // resync of the folder when the user switches to it, as needed.
        await CallExtension(this.cppBase.server, "GetNewMessages", null, aMsgWindow);
        // Check the inbox and any folders specifically opted in.
        for (let folder of toArray(this.cppBase.rootFolder.descendants, Ci.nsIMsgFolder)) {
          if (folder.flags & (Ci.nsMsgFolderFlags.Inbox | Ci.nsMsgFolderFlags.CheckNew)) {
            await ResyncFolder(folder, aMsgWindow, aMsgWindow && aMsgWindow.statusFeedback, true, performingBiff);
          }
        }
      }
    } catch (ex) {
      ReportException(ex, aMsgWindow);
    } finally {
      if (performingBiff) {
        this.cppBase.server.serverBusy = false;
      }
    }
  },
  markMessagesRead: async function(aMessages, aIsRead) {
    let strongThis = this.delegator.get();
    try {
      let hdrs = toArray(aMessages, Ci.nsIMsgDBHdr);
      let ids = GetIdsAndKeysFromHdrs(hdrs, null);
      if (ids.length) {
        await CallExtension(this.cppBase.server, "UpdateMessages", { folder: this.cppBase.getStringProperty("FolderId"), messages: ids, read: aIsRead }, null);
      }
      this.cppBase.markMessagesRead(aMessages, aIsRead);
    } catch (ex) {
      logError(ex);
    }
  },
  markAllMessagesRead: async function(aMsgWindow) {
    try {
      // Get a list of the messages that were unread.
      let keys;
      if (this.cppBase.msgDatabase.MarkAllRead) { // COMPAT for TB 68 (bug 1594892)
        let countTB68 = {}, keysTB68 = {};
        this.cppBase.msgDatabase.MarkAllRead(countTB68, keysTB68);
        keys = keysTB68.value;
      } else { // COMPAT for TB 68 (bug 1594892)
        keys = this.cppBase.msgDatabase.markAllRead();
      } // COMPAT for TB 68 (bug 1594892)
      if (keys.length) {
        await CallExtension(this.cppBase.server, "UpdateMessages", { folder: this.cppBase.getStringProperty("FolderId"), messages: keys.map(key => GetIdFromHdr(this.cppBase.msgDatabase.GetMsgHdrForKey(key))), read: true }, aMsgWindow);
      }
    } catch (ex) {
      ReportException(ex, aMsgWindow);
    }
  },
  markMessagesFlagged: async function(aMessages, aIsFlagged) {
    let strongThis = this.delegator.get();
    try {
      let hdrs = toArray(aMessages, Ci.nsIMsgDBHdr);
      let ids = GetIdsAndKeysFromHdrs(hdrs, null);
      if (ids.length) {
        await CallExtension(this.cppBase.server, "UpdateMessages", { folder: this.cppBase.getStringProperty("FolderId"), messages: ids, flagged: aIsFlagged }, null);
      }
      this.cppBase.markMessagesFlagged(aMessages, aIsFlagged);
    } catch (ex) {
      logError(ex);
    }
  },
  markThreadRead: async function(aThread) {
    try {
      // Get a list of the unread messages in the thread.
      let countTB68 = {}, keysTB68 = {}; // COMPAT for TB 68 (bug 1594892)
      let keys = this.cppBase.msgDatabase.MarkThreadRead(aThread, null, /* COMPAT for TB 68 (bug 1594892) */ countTB68, keysTB68) /* COMPAT for TB 68 (bug 1594892) */ || keysTB68.value;
      if (keys.length) {
        await CallExtension(this.cppBase.server, "UpdateMessages", { folder: this.cppBase.getStringProperty("FolderId"), messages: keys.map(key => GetIdFromHdr(this.cppBase.msgDatabase.GetMsgHdrForKey(key))), read: true }, null);
      }
    } catch (ex) {
      logError(ex);
    }
  },
  /**
   * Called to enable various UI elements.
   */
  isCommandEnabled(aCommand) {
    switch (aCommand) {
    case "cmd_compactFolder":
    case "button_compact":
      return false;
    case "cmd_renameFolder":
    case "cmd_delete":
    case "button_delete":
      return !this.cppBase.isServer && !this.cppBase.getStringProperty("FolderType") && !Services.io.offline;
    default:
      return true;
    }
  },
  /**
   * Called to arrange the order of top-level folders.
   *
   * Folders are sorted by concatenating their sort order (as a string)
   * with the folder name. This means that 0Inbox sorts before 1Drafts etc.
   * This works because there are 9 special folder types using order 0-8,
   * while regular folders use order 9 and come last.
   * This causes a problem because we want more than 10 sort orders.
   * Newsgroups work around the problem by using sort orders of 9000-9999
   * for their regular folders, so they still sort after special folders
   * but also sort stably within themselves.
   * However it turns out all we need to do is to add 10 to the default
   * sort order, so now the special folders have orders 10-18, normal
   * folders have order 19, and our shared and public folders can thus
   * be given sort orders of 20 and 21 respectively.
   */
  get sortOrder() {
    if (this.cppBase.flags & Ci.nsMsgFolderFlags.ImapPublic) {
      return 21;
    }
    if (this.cppBase.flags & Ci.nsMsgFolderFlags.ImapOtherUser) {
      return 20;
    }
    return this.cppBase.sortOrder + 10;
  },
  /**
   * Called to request message preview text for a message.
   * We assume that our message resync has already provided preview text.
   * @param aKeys      {Array[nsMsgKey]} The keys of the messages to preview
   * @param aNumKeys   {Number}          The number of keys
   * @param aLocalOnly {Boolean}         Whether to download messages
   * @param aListener  {nsIUrlListener}  Listener for async preview generation
   * @returns          {Boolean}         Whether the previews will be async
   */
  fetchMsgPreviewText(aKeys, /* COMPAT for TB 68 (bug 1604645) */ aNumKeysTB68, aLocalOnly, aUrlListener) {
    return false;
  },
  addKeywordsToMessages(aMessages, aKeywords) {
    this.cppBase.addKeywordsToMessages(aMessages, aKeywords);
    noAwait(this.updateKeywordsForMessages(aMessages), logError);
  },
  removeKeywordsFromMessages(aMessages, aKeywords) {
    this.cppBase.removeKeywordsFromMessages(aMessages, aKeywords);
    noAwait(this.updateKeywordsForMessages(aMessages), logError);
  },
  async updateKeywordsForMessages(aMessages) {
    let server = this.cppBase.server; // Protect against crash #596
    let folder = this.cppBase.getStringProperty("FolderId");
    for (let hdr of toArray(aMessages, Ci.nsIMsgDBHdr)) {
      try {
        let message = GetIdFromHdr(hdr);
        if (!message) {
          continue;
        }
        let tags = keywords2Tags(hdr.getStringProperty("keywords"));
        await CallExtension(server, "UpdateTags", { folder, message, tags });
      } catch (ex) {
        logError(ex);
      }
    }
  },
  // XXX TODO
};

gFolderProperties.factory = JSAccountUtils.jaFactory(gFolderProperties, Folder);
gModules.push(gFolderProperties);
