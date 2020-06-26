
/**
 * Retrieves the folder hierarchy using the sessiondata.ashx OWA API endpoint.
 *
 * @param aMsgWindow {Integer}
 */
EWSAccount.prototype.FindFolders = async function(aMsgWindow) {
  let request = {
    m$GetFolder: {
      m$FolderShape: {
        t$BaseShape: "IdOnly",
      },
      m$FolderIds: {
        t$DistinguishedFolderId: Object.keys(kFolderTypes).map(Id => ({ Id })),
      },
    },
  };
  if (this.requestVersion >= kExchange2013) {
    // We only need the root folder for Exchange 2013+
    // The other folders are needed only for Exchange 2010.
    request.m$GetFolder.m$FolderIds.t$DistinguishedFolderId.length = 1;
  }
  let response = await this.CallService(aMsgWindow, request);
  if (response.errors && response.errors.length) {
    throw response.errors[0];
  }
  let DistinguishedFolderIds = ensureArray(response).map(response => response.Folders.Folder.FolderId.Id);
  let query = {
    m$FindFolder: {
      Traversal: "Deep",
      m$FolderShape: {
        t$BaseShape: "Default",
        t$AdditionalProperties: {
          t$FieldURI: [{
            FieldURI: "folder:FolderClass",
          }, {
            FieldURI: "folder:ParentFolderId",
          }, {
            FieldURI: "folder:DistinguishedFolderId",
          }],
        },
      },
      m$ParentFolderIds: {
        t$DistinguishedFolderId: [{
          Id: "msgfolderroot",
        }],
      },
    },
  };
  if (this.requestVersion < kExchange2013) {
    // folder:DistinguishedFolderId does not exist in Exchange 2010
    query.m$FindFolder.m$FolderShape.t$AdditionalProperties.t$FieldURI.length = 2;
  }
  response = await this.CallService(aMsgWindow, query);
  if (this.requestVersion < kExchange2013) {
    for (let folder of response.RootFolder.Folders.Folder) {
      let index = DistinguishedFolderIds.indexOf(folder.FolderId.Id);
      if (index > 0) {
        // We assume the array indices of the request and response match.
        folder.DistinguishedFolderId = request.m$GetFolder.m$FolderIds.t$DistinguishedFolderId[index].Id;
      }
    }
  }
  let rootFolder = DistinguishedFolderIds[0];
  return ConvertFolderList(response.RootFolder.Folders.Folder, rootFolder);
}

/**
 * Get details for a folder
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}  The folder's id
 * @returns          {Object}  Some properties of the folder
 */
EWSAccount.prototype.GetFolder = async function(aMsgWindow, aFolder) {
  let request = {
    m$GetFolder: {
      m$FolderShape: {
        t$BaseShape: "Default",
      },
      m$FolderIds: {
        t$FolderId: [{
          Id: aFolder,
        }],
      },
    },
  };
  let result = await this.CallService(aMsgWindow, request); // ews.js
  let folder = result.Folders.Folder;
  return {
    id: folder.FolderId.Id,
    name: folder.DisplayName,
    total: Number(folder.TotalCount),
    unread: Number(folder.UnreadCount),
  };
}

/**
 * Create a folder
 *
 * @param aMsgWindow {Integer}
 * @param aParent    {String}  The parent folder's id (empty means root folder)
 * @param aName      {String}  The new folder name
 * @returns          {String}  The new folder's id
 */
EWSAccount.prototype.CreateFolder = async function(aMsgWindow, aParent, aName) {
  let request = {
    m$CreateFolder: {
      m$ParentFolderId: aParent ? {
        t$FolderId: {
          Id: aParent,
        },
      } : {
        t$DistinguishedFolderId: {
          Id: "msgfolderroot",
        },
      },
      m$Folders: {
        t$Folder: [{
          t$FolderClass: "IPF.Note",
          t$DisplayName: aName,
        }],
      },
    },
  };
  let result = await this.CallService(aMsgWindow, request); // ews.js
  return result.Folders.Folder.FolderId.Id;
}

/**
 * Delete a folder
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}  The folder's id
 * @param aPermanent {String}  False if this is just a move to Deleted Items
 */
EWSAccount.prototype.DeleteFolder = async function(aMsgWindow, aFolder, aPermanent) {
  let request = {
    m$DeleteFolder: {
      m$FolderIds: {
        t$FolderId: [{
          Id: aFolder,
        }],
      },
      DeleteType: aPermanent ? "SoftDelete" : "MoveToDeletedItems",
    },
  };
  await this.CallService(aMsgWindow, request); // ews.js
}

/**
 * Move a folder
 *
 * @param aMsgWindow {Integer}
 * @param aParent    {String}  The folder's id
 * @param aTarget    {String}  The new parent folder's id
 */
EWSAccount.prototype.MoveFolder = async function(aMsgWindow, aFolder, aTarget) {
  let request = {
    m$MoveFolder: {
      m$ToFolderId: aTarget ? {
        t$FolderId: {
          Id: aTarget,
        },
      } : {
        t$DistinguishedFolderId: {
          Id: "msgfolderroot",
        },
      },
      m$FolderIds: {
        t$FolderId: [{
          Id: aFolder,
        }],
      },
    },
  };
  await this.CallService(aMsgWindow, request); // ews.js
}

/**
 * Rename a folder
 *
 * @param aMsgWindow {Integer}
 * @param aParent    {String}  The folder's id
 * @param aName      {String}  The folder's new name
 */
EWSAccount.prototype.RenameFolder = async function(aMsgWindow, aFolder, aName) {
  let request = {
    m$UpdateFolder: {
      m$FolderChanges: {
        t$FolderChange: [{
          t$FolderId: {
            Id: aFolder,
          },
          t$Updates: {
            t$SetFolderField: [{
              t$FieldURI: {
                FieldURI: "folder:DisplayName",
              },
              t$Folder: {
                t$DisplayName: aName,
              },
            }],
          },
        }],
      },
    },
  };
  if (this.requestVersion < kExchange2013) {
    // Exchange 2010 requires the ChangeKey
    let fetch = {
      m$GetFolder: {
        m$FolderShape: {
          t$BaseShape: "IdOnly",
        },
        m$FolderIds: {
          t$FolderId: {
            Id: aFolder,
          },
        },
      },
    };
    let response = await this.CallService(aMsgWindow, fetch); // ews.js
    request.m$UpdateFolder.m$FolderChanges.t$FolderChange[0].t$FolderId = response.Folders.Folder.FolderId;
  }
  await this.CallService(aMsgWindow, request); // ews.js
}

/**
 * Synchronise messages in a folder.
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}        The folder's id
 * @param aSyncState {String}        The previous sync state (empty if none)
 * @param aIndex     {Number}        The number of changes already processed
 * @param aLimit     {Number}        The number of changes to find
 * @returns          {Object}        Details on the found changes
 *   messages        {Array[Object]} A list of new or changed items
 *   deletions       {Array[String]} A list of deleted item ids
 *   syncState       {String}        The state to use on the next call
 *   done            {Boolean}       False if there are more changes waiting
 */
EWSAccount.prototype.FindMessages = async function(aMsgWindow, aFolder, aSyncState, aIndex, aLimit) {
  let sync = {
    m$SyncFolderItems: {
      m$ItemShape: {
        t$BaseShape: "IdOnly",
        t$AdditionalProperties: {
          t$FieldURI: [{
            FieldURI: "message:IsRead",
          }, {
            FieldURI: "item:HasAttachments",
          }, {
            FieldURI: "item:Size",
          }, {
            FieldURI: "item:Subject",
          }, {
            FieldURI: "item:DateTimeSent",
          }, {
            FieldURI: "item:DateTimeReceived",
          }, {
            FieldURI: "message:From",
          }, {
            FieldURI: "message:Sender",
          }, {
            FieldURI: "item:ItemClass",
          }, {
            FieldURI: "item:Categories",
          }, {
            FieldURI: "item:Flag",
          }, {
            FieldURI: "item:Preview",
          }],
        },
      },
      m$SyncFolderId: {
        t$FolderId: {
          Id: aFolder,
        },
      },
      m$SyncState: aSyncState || null,
      m$MaxChangesReturned: 512,
    }
  };
  if (this.requestVersion < kExchange2013) {
    // item:Preview and item:Flag do not exist in Exchange 2010
    sync.m$SyncFolderItems.m$ItemShape.t$AdditionalProperties.t$FieldURI.length -= 2;
    sync.m$SyncFolderItems.m$ItemShape.t$AdditionalProperties.t$ExtendedFieldURI = {
      PropertyTag: "0x1090",
      PropertyType: "Integer",
    };
  }
  let response;
  try {
    response = await this.CallService(aMsgWindow, sync); // ews.js
  } catch (ex) {
    if (aIndex || !(ex instanceof InvalidSyncStateServerError)) {
      throw ex;
    }
    aSyncState = "";
    delete sync.m$SyncFolderItems.m$SyncState;
    response = await this.CallService(aMsgWindow, sync); // ews.js
  }
  return {
    messages: ensureArray(response.Changes.Update).concat(ensureArray(response.Changes.Create)).map(EWSAccount.GetItem).map(item => ({
      id: item.ItemId.Id,
      read: item.IsRead == "true",
      flagged: item.Flag ? item.Flag.FlagStatus == "Flagged" : !!item.ExtendedProperty,
      hasAttachments: item.HasAttachments == "true",
      messageSize: parseInt(item.Size),
      subject: item.Subject || "",
      date: Date.parse(item.DateTimeSent) * 1000 || 0,
      author: item.From ? EWS2MailboxObject(item.From.Mailbox) :
              item.Sender ? EWS2MailboxObject(item.Sender.Mailbox) : null,
      dateReceived: Date.parse(item.DateTimeReceived) / 1000 || 0,
      keywords: ensureArray(item.Categories && item.Categories.String),
      preview: item.Preview || "",
      isMessage: item.ItemClass == "IPM.Note",
    })).concat(ensureArray(response.Changes.ReadFlagChange).map(item => ({
      id: item.ItemId.Id,
      read: item.IsRead == "true",
    }))),
    deletions: aSyncState ? ensureArray(response.Changes.Delete).map(item => item.ItemId.Id) : null,
    syncState: response.SyncState,
    done: response.IncludesLastItemInRange == "true",
  };
}

/**
 * Fetch properties of multiple messages
 *
 * @param aMsgWindow {Integer}
 * @param aParent    {String}        The folder's id
 * @param aItemIds   {Array[String]} The IDs of the items
 * @returns          {Array[Object]} Various properties of the items
 *
 * Note: Not all of the original messages requested may be returned.
 */
EWSAccount.prototype.GetMessagesProperties = async function(aMsgWindow, aFolder, aItemIds) {
  let fetch = {
    m$GetItem: {
      m$ItemShape: {
        t$BaseShape: "AllProperties",
      },
      m$ItemIds: {
        t$ItemId: aItemIds.slice(0, EWSAccount.kMaxGetItemIds).map(id => ({
          Id: id,
        })),
      },
    },
  };
  if (this.requestVersion < kExchange2013) {
    // item:Flag does not exist in Exchange 2010
    fetch.m$GetItem.m$ItemShape.t$AdditionalProperties = {
      t$ExtendedFieldURI: {
        PropertyTag: "0x1090",
        PropertyType: "Integer",
      },
    };
  }
  let results;
  try {
    results = await this.CallService(aMsgWindow, fetch); // ews.js
    // Get all the results, or wrap the single result if there is only one.
    results = results.all || [{
      succeeded: true,
      item: results,
    }];
  } catch (ex) {
    if (ex instanceof EWSItemError) {
      // aItemIds.length is always 1 in this case.
      results = [{
        succeeded: false,
        ex: ex,
      }];
    } else {
      throw ex;
    }
  }
  return results.map((result, i) => {
    if (result.succeeded) {
      let item = this.ConvertItemResponse(result.item);
      return {
        succeeded: true,
        id: item.id,
        result: item,
      };
    } else { // error
      // Results correspond 1:1 with request item IDs.
      result.ex.parameters.itemid = aItemIds[i];
      return {
        succeeded: false,
        e: result.ex.serialise(),
        overloaded: false,
        id: aItemIds[i],
      };
    }
  });
}

/**
 * Fetch raw MIME source of multiple messages
 *
 * @param aMsgWindow {Integer}
 * @param aParent    {String}        The folder's id
 * @param aItemIds   {Array[String]} The IDs of the items
 * @returns          {Array[Object]} The source of the items
 *
 * Note: Not all of the original messages requested may be returned.
 */
EWSAccount.prototype.GetMessagesMime = async function(aMsgWindow, aFolder, aItemIds) {
  let fetch = {
    m$GetItem: {
      m$ItemShape: {
        t$BaseShape: "IdOnly",
        t$IncludeMimeContent: true,
      },
      m$ItemIds: {
        t$ItemId: aItemIds.slice(0, EWSAccount.kMaxGetItemIds).map(id => ({
          Id: id,
        })),
      },
    },
  };
  let results;
  try {
    results = await this.CallService(aMsgWindow, fetch); // ews.js
    // Get all the results, or wrap the single result if there is only one.
    results = results.all || [{
      succeeded: true,
      item: results,
    }];
  } catch (ex) {
    if (ex instanceof EWSItemError) {
      // aItemIds.length is always 1 in this case.
      results = [{
        succeeded: false,
        ex: ex,
      }];
    } else {
      throw ex;
    }
  }
  return results.map((result, i) => {
    if (result.succeeded) {
      let item = EWSAccount.GetItem(result.item.Items);
      return {
        succeeded: true,
        id: item.ItemId.Id,
        result: {
          mime: atob(item.MimeContent.Value),
        }
      };
    } else { // error
      // Results correspond 1:1 with request item IDs.
      result.ex.parameters.itemid = aItemIds[i];
      return {
        succeeded: false,
        e: result.ex.serialise(),
        overloaded: false,
        id: aItemIds[i],
      };
    }
  });
}

/**
 * Fetch a message body and properties
 *
 * @param aMsgWindow {Integer}
 * @param aParent    {String}  The folder's id
 * @param aItem      {String}  The item's id
 * @param aOmitBody  {Boolean} Whether the item body is wanted
 * @returns          {Object}  Various properties of the item.
 */
EWSAccount.prototype.GetMessage = async function(aMsgWindow, aFolder, aItem, aOmitBody) {
  let fetch = {
    m$GetItem: {
      m$ItemShape: {
        t$BaseShape: "AllProperties",
      },
      m$ItemIds: {
        t$ItemId: [{
          Id: aItem,
        }],
      },
    },
  };
  if (this.requestVersion < kExchange2013) {
    // item:Flag does not exist in Exchange 2010
    fetch.m$GetItem.m$ItemShape.t$AdditionalProperties = {
      t$ExtendedFieldURI: {
        PropertyTag: "0x1090",
        PropertyType: "Integer",
      },
    };
  }
  let result = await this.CallService(aMsgWindow, fetch); // ews.js
  if (aOmitBody) {
    delete EWSAccount.GetItem(result.Items).Body;
  }
  return this.ConvertItemResponse(result);
}

/**
 * Converts a GetItemResponseMessage to an OWL message object
 *
 * @param aMessage {GetItemResponseMessage}
 * @returns        {Object}
 *
 * Note: This function is passed as a callback, so it has no `this`.
 */
EWSAccount.prototype.ConvertItemResponse = function(aMessage) {
  let item = EWSAccount.GetItem(aMessage.Items);
  return {
    id: item.ItemId.Id,
    priority: item.Importance || "",
    read: item.IsRead == "true",
    flagged: item.Flag ? item.Flag.FlagStatus == "Flagged" : !!item.ExtendedProperty,
    hasAttachments: item.HasAttachments == "true",
    messageSize: parseInt(item.Size),
    subject: item.Subject || "",
    date: Date.parse(item.DateTimeSent) * 1000 || 0,
    messageId: item.InternetMessageId || "",
    ccList: item.CcRecipients ? ensureArray(item.CcRecipients.Mailbox).map(EWS2MailboxObject) : [],
    bccList: item.BccRecipients ? ensureArray(item.BccRecipients.Mailbox).map(EWS2MailboxObject) : [],
    author: item.From ? EWS2MailboxObject(item.From.Mailbox) :
            item.Sender ? EWS2MailboxObject(item.Sender.Mailbox) : null,
    recipients: item.ToRecipients ? ensureArray(item.ToRecipients.Mailbox).map(EWS2MailboxObject) : [],
    references: item.References || "",
    dateReceived: Date.parse(item.DateTimeReceived) / 1000 || 0,
    keywords: ensureArray(item.Categories && item.Categories.String),
    preview: item.Preview || "",
    contentType: item.Body ? "text/" + item.Body.BodyType.toLowerCase() : "",
    body: item.Body ? item.Body.Value : "",
    // XXX Handle ItemAttachment? .concat(ensureArray(item.Attachments.ItemAttachment))
    attachments: item.Attachments ? ensureArray(item.Attachments.FileAttachment).map((attachment, index) => ({ id: attachment.AttachmentId.Id, name: attachment.Name, size: parseInt(attachment.Size), contentType: attachment.ContentType, contentId: attachment.IsInline && attachment.ContentId || "", part: "1." + (index + 2) })) : [],
    isMessage: item.ItemClass == "IPM.Note",
  };
}

/**
 * Fetch a message's raw MIME source
 *
 * @param aMsgWindow {Integer}
 * @param aParent    {String}  The folder's id
 * @param aItem      {String}  The item's id
 * @returns          {String}  The MIME source of the item
 */
EWSAccount.prototype.GetMime = async function(aMsgWindow, aFolder, aItem) {
  let fetch = {
    m$GetItem: {
      m$ItemShape: {
        t$BaseShape: "IdOnly",
        t$IncludeMimeContent: true,
      },
      m$ItemIds: {
        t$ItemId: [{
          Id: aItem,
        }],
      },
    },
  };
  let result = await this.CallService(aMsgWindow, fetch); // ews.js
  return { id: aItem, mime: atob(EWSAccount.GetItem(result.Items).MimeContent.Value) };
}

/**
 * Create a message without sending it.
 * The message is always created in the Drafts folder.
 * @see SendMessage() for sending it.
 *
 * @param aMsgWindow     {Integer}
 * @param aBody          {String}
 * @param aContentType   {String}  Either text/html or text/plain
 * @param aFrom          {MailboxObject}
 * @param aReplyTo       {MailboxObject}
 * @param aToRecipients  {Array[MailboxObject]}
 * @param aCcRecipients  {Array[MailboxObject]}
 * @param aBccRecipients {Array[MailboxObject]}
 * @param aSubject       {String}
 * @param aPriority      {String}  e.g. Normal
 * @param aDSN           {Boolean}
 * @param aReturnReceipt {Boolean}
 * @param aReferences    {String}
 * @returns              {String}  The id of the new item
 */
EWSAccount.prototype.CreateMessage = async function(aMsgWindow, aBody, aContentType, aFrom, aReplyTo, aToRecipients, aCcRecipients, aBccRecipients, aSubject, aPriority, aDSN, aReturnReceipt, aReferences) {
  let create = {
    m$CreateItem: {
      m$Items: {
        t$Message: [{
          t$ItemClass: "IPM.Note",
          t$Subject: aSubject,
          t$Body: {
            BodyType: aContentType == "text/html" ? "HTML" : "Text",
            _TextContent_: aBody,
          },
          t$Importance: aPriority || "Normal",
          t$ToRecipients: {
            t$Mailbox: aToRecipients.map(MailboxObject2EWS),
          },
          t$CcRecipients: {
            t$Mailbox: aCcRecipients.map(MailboxObject2EWS),
          },
          t$BccRecipients: {
            t$Mailbox: aBccRecipients.map(MailboxObject2EWS),
          },
          t$IsReadReceiptRequested: aReturnReceipt,
          t$IsDeliveryReceiptRequested: aDSN,
          t$From: aFrom ? {
            t$Mailbox: MailboxObject2EWS(aFrom),
          } : null,
          t$References: aReferences,
          t$ReplyTo: {
            t$Mailbox: aReplyTo.map(MailboxObject2EWS),
          },
        }],
      },
      MessageDisposition: "SaveOnly",
    },
  };
  let response = await this.CallService(aMsgWindow, create); // ews.js
  // This item is always a message because we created it that way.
  return response.Items.Message.ItemId.Id;
}

/**
 * Send a message from MIME source
 *
 * @param aMsgWindow     {Integer}
 * @param aFolder        {String} The id of the folder to save to
 * @param aContent       {String} The MIME source
 * @param aBccRecipients {Array[MailboxObject]}
 */
EWSAccount.prototype.SendMime = async function(aMsgWindow, aFolder, aContent, aBccRecipients) {
  let create = {
    m$CreateItem: {
      m$SavedItemFolderId: aFolder ? {
        t$FolderId: {
          Id: aFolder,
        },
      } : null,
      m$Items: {
        t$Message: [{
          t$MimeContent: btoa(aContent),
          t$BccRecipients: {
            t$Mailbox: aBccRecipients.map(MailboxObject2EWS),
          },
        }],
      },
      MessageDisposition: "SendAndSaveCopy", // always save, even if the folder pref is empty - server will use default Sent mail folder - Hotfix for #425
    },
  };
  await this.CallService(aMsgWindow, create); // ews.js
}

/**
 * Compose a message from MIME source
 *
 * @param aMsgWindow     {Integer}
 * @param aContent       {String} The MIME source
 * @param aBccRecipients {Array[MailboxObject]}
 * @returns              {String} The id of the new item
 *
 * The message is always created in the Drafts folder.
 * @see SendMessage() for sending it.
 */
EWSAccount.prototype.ComposeMime = async function(aMsgWindow, aContent, aBccRecipients) {
  let create = {
    m$CreateItem: {
      m$Items: {
        t$Message: [{
          t$MimeContent: btoa(aContent),
          t$BccRecipients: {
            t$Mailbox: aBccRecipients.map(MailboxObject2EWS),
          },
        }],
      },
      MessageDisposition: "SaveOnly",
    },
  };
  let response = await this.CallService(aMsgWindow, create); // ews.js
  // This item is always a message because we created it that way.
  return response.Items.Message.ItemId.Id;
}

/**
 * Create a message from MIME source
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}  The id of the target folder (empty means Drafts)
 * @param aContent   {String}  The MIME source
 * @param aIsDraft   {Boolean} Whether the item is a draft
 * @param aRead      {Boolean} Whether the item is read or unread
 * @param aFlagged   {Boolean} Whether the item is flagged
 * @param aKeywords  {Array[String]}
 * @returns          {String}  The id of the new item
 */
EWSAccount.prototype.CreateMime = async function(aMsgWindow, aFolder, aContent, aIsDraft, aRead, aFlagged, aKeywords) {
  let create = {
    m$CreateItem: {
      m$SavedItemFolderId: aFolder ? {
        t$FolderId: {
          Id: aFolder,
        },
      } : null,
      m$Items: {
        t$Message: [{
          t$MimeContent: btoa(aContent),
          t$Categories: {
            t$String: aKeywords,
          },
          t$ExtendedProperty: [{
            t$ExtendedFieldURI: {
              PropertyTag: "0x0E07",
              PropertyType: "Integer",
            },
            t$Value: aIsDraft ? MAPI_MSGFLAG_UNSENT : 0,
          }],
          t$IsRead: aRead,
          t$Flag: {
            t$CompleteDate: null,
            t$DueDate: null,
            t$StartDate: null,
            t$FlagStatus: aFlagged ? "Flagged" : "NotFlagged",
          },
        }],
      },
      MessageDisposition: "SaveOnly",
    },
  };
  if (this.requestVersion < kExchange2013) {
    // Exchange 2010 needs us to set the Read status via MAPI
    if (aRead) {
      create.m$CreateItem.m$Items.t$Message[0].t$ExtendedProperty[0].t$Value |= MAPI_MSGFLAG_READ;
    }
    // t:Flag does not exist in Exchange 2010
    delete create.m$CreateItem.m$Items.t$Message[0].t$Flag;
    if (aFlagged) {
      create.m$CreateItem.m$Items.t$Message[0].t$ExtendedProperty.push({
        t$ExtendedFieldURI: {
          PropertyTag: "0x1090",
          PropertyType: "Integer",
        },
        t$Value: 2,
      });
    }
  }
  let response = await this.CallService(aMsgWindow, create); // ews.js
  // This item is always a message because we created it that way.
  return response.Items.Message.ItemId.Id;
}

/**
 * Delete messages
 *
 * @param aMsgWindow   {Integer}
 * @param aItems       {Array[String]} The ids of the items to delete
 * @param aPermanent   {Boolean} False if this is just a move to Deleted Items
 * @param aAreMessages {Boolean} False unless all items are known to be messages
 */
EWSAccount.prototype.DeleteMessages = async function(aMsgWindow, aItems, aPermanent, aAreMessages) {
  let request = {
    m$DeleteItem: {
      m$ItemIds: {
        t$ItemId: aItems.map(id => ({
          Id: id,
        })),
      },
      DeleteType: aPermanent ? "SoftDelete" : "MoveToDeletedItems",
      SuppressReadReceipts: true,
    },
  };
  if (this.requestVersion < kExchange2013) {
    // SuppressReadReceipts did not exist in Exchange 2010
    delete request.m$DeleteItem.SuppressReadReceipts;
  }
  if (!aAreMessages) {
    request.m$DeleteItem.SendMeetingCancellations = "SendToNone";
    request.m$DeleteItem.AffectedTaskOccurrences = "AllOccurrences";
  }
  try {
    let response = await this.CallService(aMsgWindow, request); // ews.js
    if (response.errors && response.errors.length) { // some succeeded, some failed
      throw response.errors[0];
    }
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
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}        The target folder's id
 * @param aItems     {Array[String]} The ids of the items to copy or move
 * @param aAction    {String}        One of Copy or Move
 */
EWSAccount.prototype.CopyOrMoveMessages = async function(aMsgWindow, aFolder, aItems, aAction) {
  let request = {
    ["m$" + aAction + "Item"]: {
      m$ToFolderId: {
        t$FolderId: {
          Id: aFolder,
        },
      },
      m$ItemIds: {
        t$ItemId: aItems.map(id => ({
          Id: id,
        })),
      },
      m$ReturnNewItemIds: false,
    },
  };
  let response = await this.CallService(aMsgWindow, request); // ews.js
  if (aAction == "Move") {
    // log errors, but otherwise ignore them
    ensureArray(response.errors).map(logError);
  } else if (response.errors && response.errors.length) {
    // copy must fail if anything fails, in case user deletes originals
    throw response.errors[0];
  }
  // TODO return new item ids
}

/**
 * Mark message as read or flagged (or remove the flag)
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}        The target folder's ID
 * @param aItems     {Array[String]} The IDs of the messages to update
 * @param aRead      {Boolean?}      Whether the items should be marked read
 * @param aFlagged   {Boolean?}      Whether the items should be flagged
 */
EWSAccount.prototype.UpdateMessages = async function(aMsgWindow, aFolder, aItems, aRead, aFlagged) {
  // All messages get the same updates, so first construct the field updates, then apply this to all msgs
  let updates = {
    t$SetItemField: [],
  };
  if (typeof aRead == "boolean") {
    updates.t$SetItemField.push({
      t$FieldURI: {
        FieldURI: "message:IsRead",
      },
      t$Message: {
        t$IsRead: aRead,
      },
    });
  }
  if (typeof aFlagged == "boolean") {
    if (this.requestVersion >= kExchange2013) {
      updates.t$SetItemField.push({
        t$FieldURI: {
          FieldURI: "item:Flag",
        },
        t$Item: {
          t$Flag: {
            t$CompleteDate: null,
            t$DueDate: null,
            t$StartDate: null,
            t$FlagStatus: aFlagged ? "Flagged" : "NotFlagged",
          },
        },
      });
    } else {
      // t:Flag does not exist in Exchange 2010
      if (aFlagged) {
        updates.t$SetItemField.push({
          t$ExtendedFieldURI: {
            PropertyTag: "0x1090",
            PropertyType: "Integer",
          },
          t$Item: {
            t$ExtendedProperty: {
              t$ExtendedFieldURI: {
                PropertyTag: "0x1090",
                PropertyType: "Integer",
              },
              t$Value: 2,
            },
          },
        });
      } else {
        updates.t$DeleteItemField = {
          t$ExtendedFieldURI: {
            PropertyTag: "0x1090",
            PropertyType: "Integer",
          },
        };
      }
    }
  }
  let items = aItems.map(Id => ({ Id }));
  try {
    if (this.requestVersion < kExchange2013) {
      let fetch = {
        m$GetItem: {
          m$ItemShape: {
            t$BaseShape: "IdOnly",
          },
          m$ItemIds: {
            t$ItemId: items,
          },
        },
      };
      let response = await this.CallService(aMsgWindow, fetch); // ews.js
      if (response.errors && response.errors.length) { // some succeeded, some failed
        throw response.errors[0];
      }
      items = ensureArray(response).map(result => result.Items).map(EWSAccount.GetItem).map(item => item.ItemId);
    }
    let request = {
      m$UpdateItem: {
        m$ItemChanges: {
          t$ItemChange: items.map(item => ({
            t$ItemId: item,
            t$Updates: updates,
          })),
        },
        ConflictResolution: "AlwaysOverwrite",
        MessageDisposition: "SaveOnly",
        SendMeetingInvitationsOrCancellations: "SendToNone",
        SuppressReadReceipts: true,
      },
    };
    if (this.requestVersion < kExchange2013) {
      // SuppressReadReceipts did not exist in Exchange 2010
      delete request.m$UpdateItem.SuppressReadReceipts;
    }
    let response = await this.CallService(aMsgWindow, request); // ews.js

    if (response.errors && response.errors.length) { // some succeeded, some failed
      throw response.errors[0];
    }
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
 * @param aMsgWindow {Integer}
 * @param aFolder    {String} The target folder's id
 * @param aItem      {String} The id of the message to update
 * @param aKeywords  {Array[String]} The categories to set
 */
EWSAccount.prototype.UpdateKeywords = async function(aMsgWindow, aFolder, aItem, aKeywords) {
  let item = {
    Id: aItem,
  };
  if (this.requestVersion < kExchange2013) {
    let fetch = {
      m$GetItem: {
        m$ItemShape: {
          t$BaseShape: "IdOnly",
        },
        m$ItemIds: {
          t$ItemId: item,
        },
      },
    };
    let result = await this.CallService(aMsgWindow, fetch); // ews.js
    item = EWSAccount.GetItem(result.Items).ItemId;
  }
  let request = {
    m$UpdateItem: {
      m$ItemChanges: {
        t$ItemChange: {
          t$ItemId: item,
          t$Updates: {
            t$SetItemField: {
              t$FieldURI: {
                FieldURI: "item:Categories",
              },
              t$Item: {
                t$Categories: {
                  t$String: aKeywords,
                },
              },
            },
          },
        },
      },
      ConflictResolution: "AlwaysOverwrite",
      MessageDisposition: "SaveOnly",
    },
  };
  await this.CallService(aMsgWindow, request); // ews.js
}

/**
 * Send a created message
 *
 * @param aMsgWindow {Integer}
 * @param aItem      {String}  The id of the item to send
 * @param aSaveCopyFolderId  {Folder ID as string} In which folder to save a copy of the sent mail
 */
EWSAccount.prototype.SendMessage = async function(aMsgWindow, aItem, aSaveCopyFolderId) {
  let fetch = {
    m$GetItem: {
      m$ItemShape: {
        t$BaseShape: "IdOnly",
      },
      m$ItemIds: {
        t$ItemId: [{
          Id: aItem,
        }],
      },
    },
  };
  let result = await this.CallService(aMsgWindow, fetch); // ews.js
  let send = {
    m$SendItem: {
      m$ItemIds: {
        t$ItemId: [{
          Id: aItem,
          // This item is always a message because we created it that way.
          ChangeKey: result.Items.Message.ItemId.ChangeKey,
        }],
      },
      m$SavedItemFolderId: aSaveCopyFolderId ? {
        t$FolderId: {
          Id: aSaveCopyFolderId,
        },
      } : null,
      SaveItemToFolder: true, // always save, even if the folder pref is empty - server will use default Sent mail folder - Hotfix for #425
    },
  };
  await this.CallService(aMsgWindow, send); // ews.js
}

/**
 * Add an attachment to a created message
 *
 * @param aMsgWindow   {Integer}
 * @param aItem        {String}  The id of the item to add the attachment
 * @param aContent     {String}  The binary content of the attachment
 * @param aContentType {String}  The content type of the attachment
 * @param aContentId   {String}  For inline attachments, its content id
 * @param aName        {String}  The name of the attachment
 * @param aSize        {Number}  The length of aContent
 */
EWSAccount.prototype.AddAttachment = async function(aMsgWindow, aItem, aContent, aContentType, aContentId, aName, aSize) {
  let attach = {
    m$CreateAttachment: {
      m$ParentItemId: {
        Id: aItem,
      },
      m$Attachments: {
        t$FileAttachment: [{
          t$Name: aName,
          t$ContentType: aContentType,
          t$ContentId: aContentId,
          t$Size: aSize,
          t$IsInline: !!aContentId,
          t$Content: btoa(aContent),
        }],
      },
    },
  };
  await this.CallService(aMsgWindow, attach); // ews.js
}

/**
 * Fetch the content of an attachment using the /s/ API endpoint.
 *
 * @param aMsgWindow  {Integer}
 * @param aFolder     {String}  The folder of the item
 * @param aItem       {String}  The id of the item
 * @param aAttachment {String}  The id of the attachment
 * @returns           {String}  The binary content of the attachment
 */
EWSAccount.prototype.GetAttachment = async function(aMsgWindow, aFolder, aItem, aAttachment) {
  let request = {
    m$GetAttachment: {
      m$AttachmentIds: [{
        t$AttachmentId: {
          Id: aAttachment,
        },
      }],
    },
  };
  let response = await this.CallService(aMsgWindow, request);
  return atob(response.Attachments.FileAttachment.Content);
}

/**
 * Delete all items and folders in the Deleted Items folder
 *
 * @param aMsgWindow {Integer}
 */
EWSAccount.prototype.EmptyTrash = async function(aMsgWindow) {
  let request = {
    m$EmptyFolder: {
      m$FolderIds: {
        t$DistinguishedFolderId: [{
          Id: "deleteditems",
        }],
      },
      DeleteType: "SoftDelete",
      DeleteSubFolders: true,
    },
  };
  await this.CallService(aMsgWindow, request);
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
EWSAccount.prototype.ProcessOperation = function(aOperation, aParameters, aMsgWindow) {
  switch (aOperation) {
  case "EnsureLoggedIn":
    return;
  case "GetNewMessages":
    return this.CheckFolders(aMsgWindow, false);
  case "UpdateFolder":
    // Sync is cheap in EWS
    return true;
  case "CreateFolder":
    return this.CreateFolder(aMsgWindow, aParameters.parent, aParameters.name);
  case "DeleteFolder":
    return this.DeleteFolder(aMsgWindow, aParameters.folder, aParameters.permanent);
  case "MoveFolder":
    return this.MoveFolder(aMsgWindow, aParameters.folder, aParameters.target);
  case "RenameFolder":
    return this.RenameFolder(aMsgWindow, aParameters.folder, aParameters.name);
  case "FindMessages":
    return this.FindMessages(aMsgWindow, aParameters.folder, aParameters.syncState, aParameters.index, aParameters.limit);
  case "GetMessage":
    return this.GetMessage(aMsgWindow, aParameters.folder, aParameters.message, false);
  case "GetMessageProperties":
    return this.GetMessage(aMsgWindow, aParameters.folder, aParameters.message, true);
  case "GetMessagesProperties":
    return this.GetMessagesProperties(aMsgWindow, aParameters.folder, aParameters.messages, false);
  case "GetMessageCompleteMime":
    return this.GetMime(aMsgWindow, aParameters.folder, aParameters.message);
  case "GetMessagesCompleteMime":
    return this.GetMessagesMime(aMsgWindow, aParameters.folder, aParameters.messages, true);
  case "CreateMessage":
    return this.CreateMessage(aMsgWindow, aParameters.body, aParameters.contentType, aParameters.from, aParameters.replyTo, aParameters.to, aParameters.cc, aParameters.bcc, aParameters.subject, aParameters.priority, aParameters.deliveryReceipt, aParameters.readReceipt, aParameters.references);
  case "AddAttachment":
    return this.AddAttachment(aMsgWindow, aParameters.message, aParameters.content, aParameters.type, aParameters.contentId, aParameters.name, aParameters.size);
  case "SendMessage":
    return this.SendMessage(aMsgWindow, aParameters.message, aParameters.save);
  case "ComposeMessageFromMime":
    return this.ComposeMime(aMsgWindow, aParameters.content, aParameters.bcc);
  case "SendMessageFromMime":
    return this.SendMime(aMsgWindow, aParameters.folder, aParameters.content, aParameters.bcc);
  case "CreateMessageFromMime":
    return this.CreateMime(aMsgWindow, aParameters.folder, aParameters.content, aParameters.draft, aParameters.read, aParameters.flagged, aParameters.keywords);
  case "DeleteMessages":
    return this.DeleteMessages(aMsgWindow, aParameters.messages, aParameters.permanent, aParameters.areMessages);
  case "CopyMessages":
    return this.CopyOrMoveMessages(aMsgWindow, aParameters.target, aParameters.messages, "Copy");
  case "MoveMessages":
    return this.CopyOrMoveMessages(aMsgWindow, aParameters.target, aParameters.messages, "Move");
  case "UpdateMessages":
    return this.UpdateMessages(aMsgWindow, aParameters.folder, aParameters.messages, aParameters.read, aParameters.flagged);
  case "UpdateKeywords":
    return this.UpdateKeywords(aMsgWindow, aParameters.folder, aParameters.message, aParameters.keywords);
  case "GetAttachment":
    return this.GetAttachment(aMsgWindow, aParameters.folder, aParameters.message, aParameters.attachment);
  case "EmptyTrash":
    return this.EmptyTrash(aMsgWindow);
  }
  throw new Error("Not Implemented");
}
