/**
 * Retrieves the folder list using the sessiondata.ashx OWA API endpoint.
 *
 * @returns        {Object}
 *   folderList:   {Array[Object]} The Exchange folder objects. Flat list.
 *     @see Microsoft documentation for the properties of Exchange folder objects
 *   rootFolderId: {String}        The Exchange folder id of the root folder
 */
OWAAccount.prototype.FindMyFolders = async function() {
  let url = this.serverURL + "sessiondata.ashx";
  let response = await fetch(url, {
    method: "POST",
    credentials: "include",
  });
  let json = await this.CheckJSONResponse(response, url); // owa.js
  let {RootFolder} = json.findFolders.Body.ResponseMessages.Items[0];

  // Fallback, just in case
  if (!RootFolder) {
    let query = {
      __type: "FindFolderJsonRequest:#Exchange",
      Header: {
        __type: "JsonRequestHeaders:#Exchange",
        RequestServerVersion: "Exchange2013",
      },
      Body: {
        __type: "FindFolderRequest:#Exchange",
        FolderShape: {
          BaseShape: "Default",
          AdditionalProperties: [{
            __type: "PropertyUri:#Exchange",
              FieldURI: "folder:FolderClass",
          }, {
            __type: "PropertyUri:#Exchange",
              FieldURI: "folder:ParentFolderId",
          }, {
            __type: "PropertyUri:#Exchange",
              FieldURI: "folder:DistinguishedFolderId",
          }],
        },
        Paging: null,
        ParentFolderIds: [{
          __type: "DistinguishedFolderId:#Exchange",
          Id: "msgfolderroot",
        }],
        ReturnParentFolder: true,
        Traversal: "Deep",
      },
    };
    let result = await this.CallService("FindFolder", query); // owa.js
    RootFolder = result.RootFolder;
  }
  return {
    folderList: RootFolder.Folders.filter(folder => folder.__type == "Folder:#Exchange"),
    rootFolderId: RootFolder.ParentFolder.FolderId.Id,
  };
}

/**
 * Retrieves the visible public folder hierarchy under a given public folder.
 *
 * @param aParent {String?} The public folder id whose hierarchy to retrieve.
 * @param aDepth  {Number?} The depth of folder hierarchy to retrieve.
 * @returns       {Array[FolderTree]}
 *
 * Note: Subfolders of the given public folder are retrieved in parallel.
 * If no folder id is passed, the function will attempt to recursively
 * retrieve the entire public folder hierarchy to the given depth.
 * Folders are only returned if they or one of their descendents are
 * either writable or contain readable messages.
 */
OWAAccount.prototype.FindPublicFolders = async function(aParent, aDepth = 15) {
  let query = {
    __type: "FindFolderJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "FindFolderRequest:#Exchange",
      FolderShape: {
        BaseShape: "Default",
        AdditionalProperties: [{
          __type: "PropertyUri:#Exchange",
            FieldURI: "folder:EffectiveRights",
        }],
      },
      Paging: null,
      ParentFolderIds: [aParent ? {
        __type: "FolderId:#Exchange",
        Id: aParent,
      } : {
        __type: "DistinguishedFolderId:#Exchange",
        Id: "publicfoldersroot",
      }],
      ReturnParentFolder: false,
      Traversal: "Shallow",
    },
  };
  let result = await this.CallService("FindFolder", query); // owa.js
  let folders = await Promise.all(result.RootFolder.Folders.filter(folder => folder.__type == "Folder:#Exchange").map(async folder => ({
    id: folder.FolderId.Id,
    name: folder.DisplayName,
    type: "ImapPublic",
    total: folder.TotalCount,
    unread: folder.UnreadCount,
    children: folder.ChildFolderCount && aDepth ? await this.FindPublicFolders(folder.FolderId.Id, aDepth - 1) : [],
    read: folder.EffectiveRights.Read,
    write: folder.EffectiveRights.CreateContents,
  })));
  return folders.filter(folder => folder.children.length || folder.read && folder.total || folder.write);
}

/**
 * Retrieves shared mailboxes configured in OWA.
 *
 * @returns {Array[FolderTree]} An array of shared mailbox folder hierarchies
 *
 * If any of the calls to `FindSharedFolders()` throws an exception,
 * a placeholder object is substitutued in its place. This placeholder only
 * has the name and type properties, plus a boolean flag `keepSubfolders`.
 */
OWAAccount.prototype.GetSharedFolders = async function() {
  let result = await this.CallService("GetOtherMailboxConfiguration", {});
  let mailboxes = result.OtherMailboxEntries;
  return Promise.all(mailboxes.map(async mailbox => {
    try {
      return await this.FindSharedFolders(mailbox);
    } catch (ex) {
      logError(ex);
      // Return a placeholder object so we don't accidentally delete
      // shared folders that we successfully retrieved previously.
      return {
        name: mailbox.DisplayName,
        type: "ImapOtherUser",
        keepSubfolders: true,
      };
    }
  }));
}

/**
 * Retrieves the folder hierarchy for a shared mailbox.
 *
 * @param aMailbox        {Object}     The shared mailbox
 *   DisplayName          {String}
 *   PrincipalSMTPAddress {String}
 * @returns               {FolderTree} The folder hiearchy of the shared mailbox
 */
OWAAccount.prototype.FindSharedFolders = async function(aMailbox) {
  let query = {
    __type: "FindFolderJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "FindFolderRequest:#Exchange",
      FolderShape: {
        BaseShape: "Default",
        AdditionalProperties: [{
          __type: "PropertyUri:#Exchange",
            FieldURI: "folder:FolderClass",
        }, {
          __type: "PropertyUri:#Exchange",
            FieldURI: "folder:ParentFolderId",
        }, {
          __type: "PropertyUri:#Exchange",
            FieldURI: "folder:DistinguishedFolderId",
        }],
      },
      Paging: null,
      ParentFolderIds: [{
        __type: "DistinguishedFolderId:#Exchange",
        Id: "msgfolderroot",
        Mailbox: {
          EmailAddress: aMailbox.PrincipalSMTPAddress,
        },
      }],
      ReturnParentFolder: true,
      Traversal: "Deep",
    },
  };
  let folders, rootFolderId;
  try {
    let result = await this.CallService("FindFolder", query); // owa.js
    folders = result.RootFolder.Folders;
    rootFolderId = result.RootFolder.ParentFolder.FolderId.Id;
  } catch (ex) {
    if (ex.type != "ErrorItemNotFound") {
      throw ex;
    }
    // We don't have visibility of the shared folder root.
    // Maybe the user only shared their Inbox. OWA tries this.
    query.Body.ParentFolderIds[0].Id = "inbox";
    let result = await this.CallService("FindFolder", query); // owa.js
    folders = result.RootFolder.Folders;
    folders.unshift(result.RootFolder.ParentFolder);
    rootFolderId = result.RootFolder.ParentFolder.ParentFolderId.Id;
  }
  return {
    id: rootFolderId,
    name: aMailbox.DisplayName,
    type: "ImapOtherUser",
    total: 0,
    unread: 0,
    children: ConvertFolderList(folders.filter(folder => folder.__type == "Folder:#Exchange"), rootFolderId),
  };
}

/**
 * Check the latest total and unread counts for a folder.
 *
 * @param aFolder {String}  The folder's id
 * @param aUnread {Integer} The number of unread messages
 * @param aTotal  {Integer} The total number of messages
 * @returns       {Boolean} Whether the counts are incorrect
 */
OWAAccount.prototype.CheckFolderCounts = async function(aFolder, aUnread, aTotal) {
  let fetch = {
    __type: "GetFolderJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "GetFolderRequest:#Exchange",
      FolderShape: {
        __type: "FolderResponseShape:#Exchange",
        BaseShape: "IdOnly",
        AdditionalProperties: [{
          __type: "PropertyUri:#Exchange",
            FieldURI: "folder:UnreadCount",
        }, {
          __type: "PropertyUri:#Exchange",
            FieldURI: "folder:TotalCount",
        }],
      },
      FolderIds: [{
        __type: "FolderId:#Exchange",
        Id: aFolder,
      }],
    },
  };
  let result = await this.CallService("GetFolder", fetch); // owa.js
  return result.Folders[0].UnreadCount != aUnread || result.Folders[0].TotalCount != aTotal;
}

/**
 * Create a folder
 *
 * @param aParent   {String} The parent folder's id (empty for the root folder)
 * @param aName     {String} The new folder name
 * @returns         {String} The new folder's id
 */
OWAAccount.prototype.CreateFolder = async function(aParent, aName) {
  let request = {
    __type: "CreateFolderJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "CreateFolderRequest:#Exchange",
      ParentFolderId: {
        __type: "TargetFolderId:#Exchange",
        BaseFolderId: aParent ? {
          __type: "FolderId:#Exchange",
          Id: aParent,
        } : {
          __type: "DistinguishedFolderId:#Exchange",
          Id: "msgfolderroot",
        },
      },
      Folders: [{
        __type: "Folder:#Exchange",
        FolderClass: "IPF.Note",
        DisplayName: aName,
      }],
    },
  };
  let result = await this.CallService("CreateFolder", request); // owa.js
  return result.Folders[0].FolderId.Id;
}

/**
 * Delete a folder
 *
 * @param aParent    {String} The folder's id
 * @param aPermanent {String} False if this is just a move to Deleted Items
 */
OWAAccount.prototype.DeleteFolder = async function(aFolder, aPermanent) {
  let request = {
    __type: "DeleteFolderJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "DeleteFolderRequest:#Exchange",
      FolderIds: [{
        __type: "FolderId:#Exchange",
        Id: aFolder,
      }],
      DeleteType: aPermanent ? "SoftDelete" : "MoveToDeletedItems",
    },
  };
  await this.CallService("DeleteFolder", request); // owa.js
}

/**
 * Move a folder
 *
 * @param aParent   {String} The folder's id
 * @param aTarget   {String} The new parent folder's id
 */
OWAAccount.prototype.MoveFolder = async function(aFolder, aTarget) {
  let request = {
    __type: "MoveFolderJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "MoveFolderRequest:#Exchange",
      FolderIds: [{
        __type: "FolderId:#Exchange",
        Id: aFolder,
      }],
      ToFolderId: {
        __type: "TargetFolderId:#Exchange",
        BaseFolderId: aTarget ? {
          __type: "FolderId:#Exchange",
          Id: aTarget,
        } : {
          __type: "DistinguishedFolderId:#Exchange",
          Id: "msgfolderroot",
        },
      },
    },
  };
  await this.CallService("MoveFolder", request); // owa.js
}

/**
 * Rename a folder
 *
 * @param aParent   {String} The folder's id
 * @param aName     {String} The folder's new name
 */
OWAAccount.prototype.RenameFolder = async function(aFolder, aName) {
  let request = {
    __type: "UpdateFolderJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "UpdateFolderRequest:#Exchange",
      FolderChanges: [{
        __type: "FolderChange:#Exchange",
        FolderId: {
          __type: "FolderId:#Exchange",
          Id: aFolder,
        },
        Updates: [{
          __type: "SetFolderField:#Exchange",
          Folder: {
            __type: "Folder:#Exchange",
            DisplayName: aName,
          },
          Path: {
            __type: "PropertyUri:#Exchange",
            FieldURI: "FolderDisplayName",
          },
        }],
      }],
    },
  };
  await this.CallService("UpdateFolder", request); // owa.js
}

/**
 * Find messages in a folder
 *
 * @param aParent   {String} The folder's id
 * @param aOffset   {Number} The number of items already found
 * @param aLimit    {Number} The number of items to find
 * @returns         {Object} Details on the found items
 *   messages       {Array}  A list of found items
 *   index          {Number} The new number of items already found
 *   total          {Number} The total number of items, if known
 */
OWAAccount.prototype.FindMessages = async function(aFolder, aOffset, aLimit) {
  let query = {
    __type: "FindItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "FindItemRequest:#Exchange",
      ItemShape: {
        __type: "ItemResponseShape:#Exchange",
        BaseShape: "IdOnly",
      },
      ParentFolderIds: [{
        __type: "FolderId:#Exchange",
        Id: aFolder,
      }],
      Traversal: "Shallow",
      Paging: {
        __type: "IndexedPageView:#Exchange",
        BasePoint: "Beginning",
        Offset: aOffset,
        MaxEntriesReturned: aLimit,
      },
      ViewFilter: "All",
      IsWarmUpSearch: false,
      FocusedViewFilter: -1,
      Grouping: null,
      ShapeName: "MailListItem",
      SortOrder: [{
        __type: "SortResults:#Exchange",
        Order: "Descending",
        Path: {
          __type: "PropertyUri:#Exchange",
          FieldURI: "DateTimeCreated",
        },
      }],
    },
  };
  let result = await this.CallService("FindItem", query); // owa.js
  let items = result.RootFolder.Items.map(OWAAccount.ConvertItem);
  return {
    messages: items,
    index: result.RootFolder.IndexedPagingOffset,
    total: result.RootFolder.TotalItemsInView,
    done: result.RootFolder.IndexedPagingOffset == result.RootFolder.TotalItemsInView,
  };
}

/**
 * Fetch properties of multiple messages
 *
 * @param aParent   {String}        The folder's id
 * @param aItems    {Array[String]} The ids ofs the items
 * @returns         {Array[Object]} Various properties of the items
 *
 * Note: Not all of the original messages requested may be returned.
 */
OWAAccount.prototype.GetMessagesProperties = async function(aFolder, aItems) {
  return this.ParallelFetch(aItems, aItem => this.GetMessage(aFolder, aItem, true));
}

/**
 * Fetch raw MIME source of multiple messages
 *
 * @param aParent   {String}        The folder's id
 * @param aItems    {Array[String]} The ids ofs the items
 * @returns         {Array[Object]} The source of the items
 *
 * Note: Not all of the original messages requested may be returned.
 */
OWAAccount.prototype.GetMessagesMime = function(aFolder, aItems) {
  return this.ParallelFetch(aItems, aItem => this.GetMime(aFolder, aItem));
}

/**
 * Perform multiple downloads in parallel.
 *
 * @param aItems    {Array[String]} The ids ofs the items
 * @param aFunction {Function(aItem)}      The function for a single download
 *   @param aItem   {String}        The id of the item
 * @returns         {Array[Object]} The result status
 *   id             {String}        The id of the item
 *   succeeded      {Boolean}       Whether this result contains data
 *   result         {Object}        The result of the function
 *   overloaded     {Boolean}       Whether this item should be retried
 *   ex             {Object}        Some properties of the error
 *
 * Note: Not all of the original downloads requested may be returned.
 *       Functions that throw TooManyRequestsServerError will be skipped.
 */
OWAAccount.prototype.ParallelFetch = async function(aItems, aFunction) {
  let maxParallelFetches = Math.round(0.8 * await this.MaxConcurrency());
  return Promise.all(aItems.slice(0, maxParallelFetches).map(async item => {
    try {
      return { succeeded: true, id: item, result: await aFunction(item) };
    } catch (ex) {
      let e = {
        message: ex.message,
        type: ex.code || ex.name,
        stack: ex.stack,
      };
      if (ex instanceof ParameterError) {
        e.type = ex.type;
        e.parameters = ex.parameters;
      }
      return { succeeded: false, e: e, overloaded: ex instanceof TooManyRequestsServerError, id: item };
    }
  }));
}

/**
 * Fetch a message body and properties
 *
 * @param aParent      {String}  The folder's id
 * @param aItem        {String}  The item's id
 * @param aOmitBody    {Boolean} Whether the item body is wanted
 * @returns            {Object}  Various properties of the item.
 */
OWAAccount.prototype.GetMessage = async function(aFolder, aItem, aOmitBody) {
  let fetch = {
    __type: "GetItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "GetItemRequest:#Exchange",
      ItemShape: {
        __type: "ItemResponseShape:#Exchange",
        BaseShape: "AllProperties",
      },
      ItemIds: [{
        __type: "ItemId:#Exchange",
        Id: aItem,
      }],
    },
  };
  if (!aOmitBody) {
    fetch.Body.ShapeName = "ItemBody";
  }
  let result = await this.CallService("GetItem", fetch); // owa.js
  return OWAAccount.ConvertItem(result.Items[0]);
}

/**
 * Convert an OWA Item into an OWL message.
 *
 * @param item   {Object} The OWA item from FindItem or GetItem.
 * @returns      {Object} An OWL message object.
 *
 * Note: This function is passed as a callback, so it has no `this`.
 */
OWAAccount.ConvertItem = function(item) {
  return {
    id: item.ItemId.Id,
    priority: item.Importance || "",
    read: item.IsRead,
    flagged: item.Flag.FlagStatus == "Flagged",
    hasAttachments: item.HasAttachments,
    messageSize: item.Size,
    subject: item.Subject || "",
    date: Date.parse(item.DateTimeSent) * 1000 || 0,
    messageId: item.InternetMessageId || "",
    ccList: item.CcRecipients ? item.CcRecipients.map(EWS2MailboxObject) : [],
    bccList: item.BccRecipients ? item.BccRecipients.map(EWS2MailboxObject) : [],
    author: item.From ? EWS2MailboxObject(item.From.Mailbox) :
            item.Sender ? EWS2MailboxObject(item.Sender.Mailbox) : null,
    recipients: item.ToRecipients ? item.ToRecipients.map(EWS2MailboxObject) : [],
    references: item.References || "",
    dateReceived: Date.parse(item.DateTimeReceived) / 1000 || 0,
    tags: item.Categories || [],
    preview: item.Preview || "",
    contentType: item.Body ? "text/" + item.Body.BodyType.toLowerCase() : "",
    body: item.Body ? item.Body.Value : "",
    attachments: item.Attachments ? item.Attachments.map(OWAAccount.ConvertAttachment) : [],
    isMessage: item.ItemClass == "IPM.Note",
  };
}

/**
 * Extract the data Thunderbird needs from an OWA attachment object
 *
 * @param aAttachment {Object} The OWA attachment object.
 * @returns           {Object} Data required by Thunderbird.
 *
 * Note: This function is passed as a callback, so it has no `this`.
 */
OWAAccount.ConvertAttachment = function(aAttachment) {
  return {
    id: aAttachment.AttachmentId.Id,
    name: aAttachment.Name,
    size: aAttachment.Size,
    contentType: aAttachment.ContentType,
    contentId: aAttachment.IsInline && aAttachment.ContentId || "",
  };
}

/**
 * Fetch a message's raw MIME source
 *
 * @param aParent   {String} The folder's id
 * @param aItem     {String} The item's id
 * @returns         {String} The MIME source of the item
 */
OWAAccount.prototype.GetMime = async function(aFolder, aItem) {
  let fetch = {
    __type: "GetItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "GetItemRequest:#Exchange",
      ItemShape: {
        __type: "ItemResponseShape:#Exchange",
        BaseShape: "IdOnly",
        IncludeMimeContent: true,
      },
      ItemIds: [{
        __type: "ItemId:#Exchange",
        Id: aItem,
      }],
    },
  };
  let result = await this.CallService("GetItem", fetch); // owa.js
  return { id: aItem, mime: atob(result.Items[0].MimeContent.Value) };
}

/**
 * Create a message without sending it.
 * The message is always created in the Drafts folder.
 * @see SendMessage() for sending it.
 *
 * @param aBody          {String}
 * @param aContentType   {String} Either text/html or text/plain
 * @param aFrom          {MailboxObject}
 * @param aReplyTo       {MailboxObject}
 * @param aToRecipients  {Array[MailboxObject]}
 * @param aCcRecipients  {Array[MailboxObject]}
 * @param aBccRecipients {Array[MailboxObject]}
 * @param aSubject       {String}
 * @param aPriority      {String} e.g. Normal
 * @param aDSN           {Boolean}
 * @param aReturnReceipt {Boolean}
 * @param aReferences    {String}
 * @returns              {String} The id of the new item
 */
OWAAccount.prototype.CreateMessage = async function(aBody, aContentType, aFrom, aReplyTo, aToRecipients, aCcRecipients, aBccRecipients, aSubject, aPriority, aDSN, aReturnReceipt, aReferences) {
  let create = {
    __type: "CreateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "CreateItemRequest:#Exchange",
      Items: [{
        __type: "Message:#Exchange",
        From: aFrom ? MailboxObject2OWA(aFrom) : null,
        ReplyTo: aReplyTo.map(MailboxObject2OWA),
        ToRecipients: aToRecipients.map(MailboxObject2OWA),
        CcRecipients: aCcRecipients.map(MailboxObject2OWA),
        BccRecipients: aBccRecipients.map(MailboxObject2OWA),
        Body: {
          __type: "BodyContentType:#Exchange",
          BodyType: aContentType == "text/html" ? "HTML" : "Text",
          Value: aBody,
        },
        Importance: aPriority || "Normal",
        IsDeliveryReceiptRequested: aDSN,
        IsReadReceiptRequested: aReturnReceipt,
        Subject: aSubject,
        References: aReferences,
      }],
      MessageDisposition: "SaveOnly",
    },
  };
  let response = await this.CallService("CreateItem", create); // owa.js
  return response.Items[0].ItemId.Id;
}

/**
 * Compose a message from MIME source
 *
 * @param aContent       {String} The MIME source
 * @param aBccRecipients {Array[MailboxObject]}
 * @param aDSN           {Boolean}
 * @returns              {String} The id of the new item
 *
 * The message is always created in the Drafts folder.
 * @see SendMessage() for sending it.
 */
OWAAccount.prototype.ComposeMime = async function(aContent, aBccRecipients, aDSN) {
  let create = {
    __type: "CreateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "CreateItemRequest:#Exchange",
      Items: [{
        __type: "Message:#Exchange",
        MimeContent: {
          CharacterSet: "UTF-8",
          Value: btoa(aContent),
        },
        BccRecipients: aBccRecipients.map(MailboxObject2OWA),
        IsDeliveryReceiptRequested: aDSN,
      }],
      MessageDisposition: "SaveOnly",
    },
  };
  let response = await this.CallService("CreateItem", create); // owa.js
  return response.Items[0].ItemId.Id;
}

/**
 * Create a message from MIME source
 *
 * @param aFolder  {String}  The id of the target folder (empty means Drafts)
 * @param aContent {String}  The MIME source
 * @param aIsDraft {Boolean} Whether the item is a draft
 * @param aRead    {Boolean} Whether the item is read or unread
 * @param aFlagged {Boolean} Whether the item is flagged
 * @param aTags    {Array[String]}
 * @returns        {String}  The id of the new item
 */
OWAAccount.prototype.CreateMime = async function(aFolder, aContent, aIsDraft, aRead, aFlagged, aTags) {
  let create = {
    __type: "CreateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "CreateItemRequest:#Exchange",
      Items: [{
        __type: "Message:#Exchange",
        MimeContent: {
          CharacterSet: "UTF-8",
          Value: btoa(aContent),
        },
        ExtendedProperty: [{
          ExtendedFieldURI: {
            PropertyTag: "0x0E07",
            PropertyType: "Integer",
          },
          Value: (aIsDraft ? MAPI_MSGFLAG_UNSENT : 0).toString(),
        }],
        IsRead: aRead,
        Flag: {
          __type: "FlagType:#Exchange",
          CompleteDate: null,
          DueDate: null,
          StartDate: null,
          FlagStatus: aFlagged ? "Flagged" : "NotFlagged",
        },
        Categories: aTags,
      }],
      /* EWS accepts a SavedItemFolderId, but OWA doesn't seem to.
      SavedItemFolderId: {
        __type: "TargetFolderId:#Exchange",
        FolderId: {
          __type: "FolderId:#Exchange",
          Id: aOverride,
        },
      },
      */
      MessageDisposition: "SaveOnly",
    },
  };
  let response = await this.CallService("CreateItem", create); // owa.js
  let item = response.Items[0].ItemId.Id;
  if (aFolder) {
    return this.CopyOrMoveMessages(aFolder, [item], "Move");
  }
  return item;
}

/**
 * Delete messages
 *
 * @param aItems       {Array[String]} The ids of the items to delete
 * @param aPermanent   {Boolean} False if this is just a move to Deleted Items
 * @param aAreMessages {Boolean} False unless all items are known to be messages
 */
OWAAccount.prototype.DeleteMessages = async function(aItems, aPermanent, aAreMessages) {
  let request = {
    __type: "DeleteItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "DeleteItemRequest:#Exchange",
      ItemIds: aItems.map(id => ({
        __type: "ItemId:#Exchange",
        Id: id,
      })),
      DeleteType: aPermanent ? "SoftDelete" : "MoveToDeletedItems",
      ReturnMovedItemIds: false, // TODO !aPermanent,
      SuppressReadRecipts: true,
    },
  };
  if (!aAreMessages) {
    request.Body.SendMeetingCancellations = "SendToNone";
    request.Body.AffectedTaskOccurrences = "AllOccurrences";
  }
  try {
    await this.CallService("DeleteItem", request); // owa.js
  } catch (ex) {
    if (ex.type == "ErrorItemNotFound") {
      // Already deleted. Ignore.
    } else {
      throw ex;
    }
  }
}

/**
 * Copying or move messages between folders on the same server
 *
 * @param aFolder   {String}        The target folder's id
 * @param aItems    {Array[String]} The ids of the items to copy or move
 * @param aAction   {String}        One of Copy or Move
 */
OWAAccount.prototype.CopyOrMoveMessages = async function(aFolder, aItems, aAction) {
  let request = {
    __type: aAction + "ItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: aAction + "ItemRequest:#Exchange",
      ItemIds: aItems.map(id => ({
        __type: "ItemId:#Exchange",
        Id: id,
      })),
      ToFolderId: {
        __type: "TargetFolderId:#Exchange",
        BaseFolderId: {
          __type: "FolderId:#Exchange",
          Id: aFolder,
        },
      },
    },
  };
  await this.CallService(aAction + "Item", request); // owa.js
  // TODO return new item ids
}

/**
 * Mark message as read or flagged (or remove the flag)
 *
 * @param aFolder   {String}        The target folder's id
 * @param aItems    {Array[String]} The ids of the items to update
 * @param aRead     {Boolean?}      Whether the items should be marked read
 * @param aFlagged  {Boolean?}      Whether the items should be flagged
 */
OWAAccount.prototype.UpdateMessages = async function(aFolder, aItems, aRead, aFlagged) {
  let updates = [];
  if (typeof aRead == "boolean") {
    updates.push({
      __type: "SetItemField:#Exchange",
      Item: {
        __type: "Message:#Exchange",
        IsRead: aRead,
      },
      Path: {
        __type: "PropertyUri:#Exchange",
        FieldURI: "IsRead",
      },
    });
  }
  if (typeof aFlagged == "boolean") {
    updates.push({
      __type: "SetItemField:#Exchange",
      Item: {
        __type: "Message:#Exchange",
        Flag: {
          __type: "FlagType:#Exchange",
          CompleteDate: null,
          DueDate: null,
          StartDate: null,
          FlagStatus: aFlagged ? "Flagged" : "NotFlagged",
        },
      },
      Path: {
        __type: "PropertyUri:#Exchange",
        FieldURI: "Flag",
      },
    });
  }
  let request = {
    __type: "UpdateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "UpdateItemRequest:#Exchange",
      ConflictResolution: "AlwaysOverwrite",
      ItemChanges: aItems.map(id => ({
        __type: "ItemChange:#Exchange",
        ItemId: {
          __type: "ItemId:#Exchange",
          Id: id,
        },
        Updates: updates,
      })),
      MessageDisposition: "SaveOnly",
      SendCalendarInvitationsOrCancellations: "SendToNone",
      SuppressReadReceipts: true,
    },
  };
  try {
    await this.CallService("UpdateItem", request); // owa.js
  } catch (ex) {
    if (ex.type == "ErrorItemNotFound" && aRead) {
      // We're going to ignore marking not found items as read.
      // They were probably deleted out from a parallel call.
    } else {
      throw ex;
    }
  }
}

/**
 * Change categories on a message
 *
 * @param aFolder {String} The item's folder's id
 * @param aItem   {String} The ids of the item to update
 * @param aTags   {Array[String]} The categories to set
 */
OWAAccount.prototype.UpdateTags = async function(aFolder, aItem, aTags) {
  let request = {
    __type: "UpdateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "UpdateItemRequest:#Exchange",
      ConflictResolution: "AlwaysOverwrite",
      ItemChanges: [{
        __type: "ItemChange:#Exchange",
        ItemId: {
          __type: "ItemId:#Exchange",
          Id: aItem,
        },
        Updates: [{
          __type: "SetItemField:#Exchange",
          Item: {
            __type: "Message:#Exchange", // OWA doesn't do Item for some reason
            Categories: aTags,
          },
          Path: {
            __type: "PropertyUri:#Exchange",
            FieldURI: "Categories",
          },
        }],
      }],
      MessageDisposition: "SaveOnly",
    },
  };
  await this.CallService("UpdateItem", request); // owa.js
}

/**
 * Send a message from MIME source
 *
 * @param aFolder        {String} The id of the folder to save to
 * @param aContent       {String} The MIME source
 * @param aBccRecipients {Array[MailboxObject]}
 * @param aDSN           {Boolean}
 */
OWAAccount.prototype.SendMime = async function(aFolder, aContent, aBccRecipients, aDSN) {
  let create = {
    __type: "CreateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "CreateItemRequest:#Exchange",
      Items: [{
        __type: "Message:#Exchange",
        MimeContent: {
          CharacterSet: "UTF-8",
          Value: btoa(aContent),
        },
        BccRecipients: aBccRecipients.map(MailboxObject2OWA),
        IsDeliveryReceiptRequested: aDSN,
      }],
      /* EWS accepts a SavedItemFolderId, but OWA doesn't seem to.
      SavedItemFolderId: {
        __type: "TargetFolderId:#Exchange",
        FolderId: {
          __type: "FolderId:#Exchange",
          Id: aOverride,
        },
      },
      */
      MessageDisposition: "SendAndSaveCopy", // always save, even if the folder pref is empty - server will use default Sent mail folder - Hotfix for #425
    },
  };
  await this.CallService("CreateItem", create); // owa.js
}

/**
 * Send a created message
 *
 * @param aItem     {String}  The id of the item to send
 * @param aSaveCopyFolderId  {Folder ID as string} In which folder to save a copy of the sent mail
 */
OWAAccount.prototype.SendMessage = async function(aItem, aSaveCopyFolderId) {
  aSaveCopyFolderId = true; // HACK Hotfix for #248, because some users have an empty folder pref

  let request = {
    __type: "UpdateItemJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "UpdateItemRequest:#Exchange",
      ComposeOperation: "newMail",
      ConflictResolution: "AlwaysOverwrite",
      ItemChanges: [{
        __type: "ItemChange:#Exchange",
        ItemId: {
          __type: "ItemId:#Exchange",
          Id: aItem,
        },
        Updates: [],
      }],
      MessageDisposition: aSaveCopyFolderId ? "SendAndSaveCopy" : "SendOnly",
      OutboundCharset: "AutoDetect",
      PromoteInlineAttachments: false,
      SendCalendarInvitationsOrCancellations: "SendToNone",
      SendOnNotFoundError: true,
      SuppressReadReceipts: false,
    },
  };
  await this.CallService("UpdateItem", request); // owa.js
}

/**
 * Add an attachment to a created message
 *
 * @param aItem        {String} The id of the item to add the attachment
 * @param aContent     {String} The binary content of the attachment
 * @param aContentType {String} The content type of the attachment
 * @param aContentId   {String} For inline attachments, its content id
 * @param aName        {String} The name of the attachment
 * @param aSize        {Number} The length of aContent
 */
OWAAccount.prototype.AddAttachment = async function(aItem, aContent, aContentType, aContentId, aName, aSize) {
  let attach = {
    __type: "CreateAttachmentJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "CreateAttachmentRequest:#Exchange",
      Attachments: [{
        __type: "FileAttachment:#Exchange",
        Content: btoa(aContent),
        ContentType: aContentType,
        ContentId: aContentId,
        Name: aName,
        Size: aSize,
        IsInline: !!aContentId,
      }],
      ParentItemId: {
        __type: "ItemId:#Exchange",
        Id: aItem,
      },
    },
  };
  await this.CallService("CreateAttachmentFromLocalFile", attach); // owa.js
}

/**
 * Fetch the content of an attachment using the /s/ API endpoint.
 *
 * @param aFolder     {String} The folder of the item
 * @param aItem       {String} The id of the item
 * @param aAttachment {String} The id of the attachment
 * @returns           {String} The binary content of the attachment
 */
OWAAccount.prototype.GetAttachment = async function(aFolder, aItem, aAttachment) {
  let url = this.serverURL + "service.svc/s/GetFileAttachment?id=" + aAttachment + "&X-OWA-CANARY=" + await this.getCanary();
  let response = await fetch(url, { credentials: "include" }); // auth.js
  await this.CheckResponse(response); // owa.js
  let blob = await response.blob();
  let reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(blob);
  });
}

/**
 * Delete all items and folders in the Deleted Items folder
 */
OWAAccount.prototype.EmptyTrash = async function() {
  let request = {
    __type: "EmptyFolderJsonRequest:#Exchange",
    Header: {
      __type: "JsonRequestHeaders:#Exchange",
      RequestServerVersion: "Exchange2013",
    },
    Body: {
      __type: "EmptyFolderRequest:#Exchange",
      FolderIds: [{
        __type: "DistinguishedFolderId:#Exchange",
        Id: "deleteditems",
      }],
      DeleteType: "SoftDelete",
      DeleteSubFolders: true,
      SuppressReadReceipt: true,
    },
  };
  await this.CallService("EmptyFolder", request); // owa.js
}

/**
 * Processes a request from the backend.
 *
 * @param aServerId   {String}  The account's server key
 * @param aOperation  {String}  The requested operation
 * @param aParmaeters {Object}  Operation-specific parameters
 * @param aMsgWindow  {Integer}
 * @returns           {Any?}    Operation-dependent return value
 */
OWAAccount.prototype.ProcessOperation = function(aOperation, aParameters, aMsgWindow) {
  switch (aOperation) {
  case "EnsureLoggedIn":
    return;
  case "GetNewMessages":
    return this.CheckFolders(false);
  case "UpdateFolder":
    return this.CheckFolderCounts(aParameters.folder, aParameters.unread, aParameters.total);
  case "CreateFolder":
    return this.CreateFolder(aParameters.parent, aParameters.name);
  case "DeleteFolder":
    return this.DeleteFolder(aParameters.folder, aParameters.permanent);
  case "MoveFolder":
    return this.MoveFolder(aParameters.folder, aParameters.target);
  case "RenameFolder":
    return this.RenameFolder(aParameters.folder, aParameters.name);
  case "FindMessages":
    return this.FindMessages(aParameters.folder, aParameters.index, aParameters.limit);
  case "GetMessage":
    return this.GetMessage(aParameters.folder, aParameters.message, false);
  case "GetMessageProperties":
    return this.GetMessage(aParameters.folder, aParameters.message, true);
  case "GetMessagesProperties":
    return this.GetMessagesProperties(aParameters.folder, aParameters.messages, false);
  case "GetMessageCompleteMime":
    return this.GetMime(aParameters.folder, aParameters.message);
  case "GetMessagesCompleteMime":
    return this.GetMessagesMime(aParameters.folder, aParameters.messages, true);
  case "CreateMessage":
    return this.CreateMessage(aParameters.body, aParameters.contentType, aParameters.from, aParameters.replyTo, aParameters.to, aParameters.cc, aParameters.bcc, aParameters.subject, aParameters.priority, aParameters.deliveryReceipt, aParameters.readReceipt, aParameters.references);
  case "ComposeMessageFromMime":
    return this.ComposeMime(aParameters.content, aParameters.bcc, aParameters.deliveryReceipt);
  case "CreateMessageFromMime":
    return this.CreateMime(aParameters.folder, aParameters.content, aParameters.draft, aParameters.read, aParameters.flagged, aParameters.tags);
  case "DeleteMessages":
    return this.DeleteMessages(aParameters.messages, aParameters.permanent, aParameters.areMessages);
  case "CopyMessages":
    return this.CopyOrMoveMessages(aParameters.target, aParameters.messages, "Copy");
  case "MoveMessages":
    return this.CopyOrMoveMessages(aParameters.target, aParameters.messages, "Move");
  case "UpdateMessages":
    return this.UpdateMessages(aParameters.folder, aParameters.messages, aParameters.read, aParameters.flagged);
  case "UpdateTags":
    return this.UpdateTags(aParameters.folder, aParameters.message, aParameters.tags);
  case "SendMessageFromMime":
    return this.SendMime(aParameters.folder, aParameters.content, aParameters.bcc, aParameters.deliveryReceipt);
  case "SendMessage":
    return this.SendMessage(aParameters.message, aParameters.save);
  case "AddAttachment":
    return this.AddAttachment(aParameters.message, aParameters.content, aParameters.type, aParameters.contentId, aParameters.name, aParameters.size);
  case "GetAttachment":
    return this.GetAttachment(aParameters.folder, aParameters.message, aParameters.attachment);
  case "EmptyTrash":
    return this.EmptyTrash();
  }
  throw new Error("Not Implemented");
}
