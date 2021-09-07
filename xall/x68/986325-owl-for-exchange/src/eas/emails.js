const kItemSyncKeyError = "3";
const kItemNotFound = "8";

/**
 * Create a folder
 *
 * @param aMsgWindow {Integer}
 * @param aParent    {String}  The parent folder's id (empty means root folder)
 * @param aName      {String}  The new folder name
 * @returns          {String}  The new folder's id
 */
EASAccount.prototype.CreateFolder = function(aMsgWindow, aParent, aName) {
  return this.waitForSyncKey(async syncKey => {
    let request = {
      FolderCreate: {
        SyncKey: syncKey,
        ParentId: aParent,
        DisplayName: aName,
        Type: "1",
      },
    };
    let result = await this.CallService(aMsgWindow, "FolderCreate", request); // eas.js
    await browser.incomingServer.setStringValue(this.serverID, "sync_key", result.SyncKey);
    return result.ServerId;
  });
}

/**
 * Delete a folder
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}  The folder's id
 */
EASAccount.prototype.DeleteFolder = function(aMsgWindow, aFolder) {
  return this.waitForSyncKey(async syncKey => {
    let request = {
      FolderDelete: {
        SyncKey: syncKey,
        ServerId: aFolder,
      },
    };
    let result = await this.CallService(aMsgWindow, "FolderDelete", request); // eas.js
    await browser.incomingServer.setStringValue(this.serverID, "sync_key", result.SyncKey);
    this.RemoveFolderListener(aFolder);
  });
}

/**
 * Update a folder
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}  The folder's id
 * @param aTarget    {String}  The desired parent folder's id
 * @param aName      {String}  The folder's desired name
 */
EASAccount.prototype.UpdateFolder = function(aMsgWindow, aFolder, aTarget, aName) {
  return this.waitForSyncKey(async syncKey => {
    let request = {
      FolderUpdate: {
        SyncKey: syncKey,
        ServerId: aFolder,
        ParentId: aTarget || "0",
        DisplayName: aName,
      },
    };
    let result = await this.CallService(aMsgWindow, "FolderUpdate", request); // eas.js
    await browser.incomingServer.setStringValue(this.serverID, "sync_key", result.SyncKey);
  });
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
EASAccount.prototype.FindMessages = async function(aMsgWindow, aFolder, aSyncState, aIndex, aLimit) {
  let init = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: "0",
          CollectionId: aFolder,
        },
      },
    },
  };
  let syncKey = aSyncState;
  if (!syncKey) {
    let response = await this.CallService(aMsgWindow, "Sync", init); // eas.js
    syncKey = response.Collections.Collection.SyncKey;
  }
  let sync = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: syncKey,
          CollectionId: aFolder,
          WindowSize: "512",
          Options: {
            MIMESupport: "2",
            BodyPreference: {
              Type: "4",
              TruncationSize: "0",
              Preview: "255",
            },
          },
        },
      },
    },
  };
  let response;
  try {
    response = await this.CallService(aMsgWindow, "Sync", sync); // eas.js
  } catch (ex) {
    if (aIndex || ex.code != kItemSyncKeyError) {
      throw ex;
    }
    aSyncState = "";
    response = await this.CallService(aMsgWindow, "Sync", init); // eas.js
    syncKey = response.Collections.Collection.SyncKey;
    sync.Sync.Collections.Collection.SyncKey = syncKey;
    response = await this.CallService(aMsgWindow, "Sync", sync); // eas.js
  }
  let collection = response ? response.Collections.Collection : { SyncKey: syncKey };
  let result = {
    messages: ensureArray(collection.Commands && collection.Commands.Add).concat(ensureArray(collection.Commands && collection.Commands.Change)).map(({ ServerId, ApplicationData }) => this.ConvertItemResponse(ServerId, ApplicationData)),
    deletions: aSyncState ? ensureArray(collection.Commands && collection.Commands.Delete).map(item => item.ServerId) : null,
    syncState: collection.SyncKey,
    done: collection.MoreAvailable == null,
  };
  if (result.done) {
    this.ListenToFolder(aFolder, "Email");
  }
  return result;
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
EASAccount.prototype.GetMessagesProperties = async function(aMsgWindow, aFolder, aItemIds) {
  let fetch = {
    ItemOperations: {
      Fetch: aItemIds.slice(0, EASAccount.kMaxGetItemIds).map(id => ({
        Store: "Mailbox",
        ServerId: id,
        CollectionId: aFolder,
        Options: {
          BodyPreference: {
            Type: "4",
            TruncationSize: "0",
            Preview: "255",
          },
        },
      })),
    },
  };
  let results = await this.CallService(aMsgWindow, "ItemOperations", fetch); // eas.js;
  return ensureArray(results.Response.Fetch).map((response, i) => {
    if (response.Status == "1") {
      let item = this.ConvertItemResponse(response.ServerId, response.Properties);
      return {
        succeeded: true,
        id: response.ServerId,
        result: item,
      };
    } else { // error
      let ex = new EASError(null, "ItemOperations", fetch, response.Status);
      ex.parameters.serverid = response.ServerId;
      return {
        succeeded: false,
        e: ex.serialise(),
        overloaded: false,
        id: response.ServerId,
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
EASAccount.prototype.GetMessagesMime = async function(aMsgWindow, aFolder, aItemIds) {
  let fetch = {
    ItemOperations: {
      Fetch: aItemIds.slice(0, EASAccount.kMaxGetItemIds).map(id => ({
        Store: "Mailbox",
        ServerId: id,
        CollectionId: aFolder,
        Options: {
          MIMESupport: "2",
          BodyPreference: {
            Type: "4",
          },
        },
      })),
    },
  };
  let results = await this.CallService(aMsgWindow, "ItemOperations", fetch); // eas.js;
  return ensureArray(results.Response.Fetch).map((response, i) => {
    if (response.Status == "1") {
      return {
        succeeded: true,
        id: response.ServerId,
        result: {
          mime: response.Properties.Body.Data,
        }
      };
    } else { // error
      let ex = new EASError(null, "ItemOperations", fetch, response.Status);
      ex.parameters.serverid = response.ServerId;
      return {
        succeeded: false,
        e: ex.serialise(),
        overloaded: false,
        id: response.ServerId,
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
EASAccount.prototype.GetMessage = async function(aMsgWindow, aFolder, aItem, aOmitBody) {
  let fetch = {
    ItemOperations: {
      Fetch: {
        Store: "Mailbox",
        ServerId: aItem,
        CollectionId: aFolder,
        Options: {
          BodyPreference: [{
            Type: "2",
          }, {
            Type: "1",
          }],
        },
      },
    },
  };
  if (aOmitBody) {
    for (preference of fetch.ItemOperations.Fetch.Options.BodyPreference) {
      preference.TruncationSize = "0";
    }
  }
  let result = await this.CallService(aMsgWindow, "ItemOperations", fetch); // eas.js;
  if (result.Response.Fetch.Status != "1") {
    throw new EASError(null, "ItemOperations", fetch, result.Response.Fetch.Status);
  }
  return this.ConvertItemResponse(result.Response.Fetch.ServerId, result.Response.Fetch.Properties);
}

/**
 * Converts an EAS item to an OWL message object
 *
 * @param aServerID   {String}
 * @param aProperties {ApplicationData|Properties}
 * @returns           {Object}
 */
EASAccount.prototype.ConvertItemResponse = function(aServerId, aProperties) {
  return {
    id: aServerId,
    priority: ["Low", "Normal", "High"][aProperties.Importance] || "",
    read: aProperties.Read != "0",
    flagged: aProperties.Flag && aProperties.Flag.Status == "2",
    hasAttachments: !!aProperties.Attachments,
    messageSize: aProperties.Body && aProperties.Body.Type == "4" ? aProperties.Body.EstimatedDataSize : 0,
    subject: aProperties.Subject || "",
    date: Date.parse(aProperties.DateReceived) * 1000 || 0, // XXX
    ccList: aProperties.Cc || "",
    bccList: aProperties.Bcc || "",
    author: aProperties.From || aProperties.Sender,
    recipients: aProperties.To || "",
    dateReceived: Date.parse(aProperties.DateReceived) / 1000 || 0,
    tags: ensureArray(aProperties.Categories && aProperties.Categories.Category),
    preview: aProperties.Body && aProperties.Body.Preview || "",
    contentType: [, "text/plain", "text/html"][aProperties.Body && aProperties.Body.Type] || "",
    body: aProperties.Body && aProperties.Body.Data || "",
    attachments: aProperties.Attachments ? ensureArray(aProperties.Attachments.Attachment).map((attachment, index) => ({ id: attachment.FileReference, name: attachment.DisplayName, size: parseInt(attachment.EstimatedDataSize), contentType: attachment.Method == "5" ? "message/rfc822" : "application/octet-stream", contentId: attachment.IsInline == "1" && attachment.ContentId || "", part: "1." + (index + 2) })) : [],
    isMessage: aProperties.MessageClass == "IPM.Note",
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
EASAccount.prototype.GetMime = async function(aMsgWindow, aFolder, aItem) {
  let fetch = {
    ItemOperations: {
      Fetch: {
        Store: "Mailbox",
        ServerId: aItem,
        CollectionId: aFolder,
        Options: {
          MIMESupport: "2",
          BodyPreference: {
            Type: "4",
          },
        },
      },
    },
  };
  let result = await this.CallService(aMsgWindow, "ItemOperations", fetch); // eas.js;
  if (result.Response.Fetch.Status != "1") {
    throw new EASError(null, "ItemOperations", fetch, result.Response.Fetch.Status);
  }
  return { id: aItem, mime: result.Response.Fetch.Properties.Body.Data };
}

/**
 * Send a message from MIME source
 *
 * @param aMsgWindow     {Integer}
 * @param aFolder        {String} The id of the folder to save to
 * @param aContent       {String} The MIME source
 * @param aBccRecipients {Array[MailboxObject]}
 */
EASAccount.prototype.SendMime = async function(aMsgWindow, aFolder, aContent, aBccRecipients) {
  if (aBccRecipients.length) {
    throw new OwlError("bcc-not-supported");
  }
  let send = {
    SendMail: {
      ClientId: await EASAccount.NextClientId(),
      SaveInSentItems: /* aFolder && */ {}, // always save, even if the folder pref is empty - server will use default Sent mail folder - Hotfix for #425
      Mime: new TextEncoder().encode(aContent),
    },
  };
  await this.CallService(aMsgWindow, "SendMail", send); // eas.js
}

/**
 * Delete messages
 *
 * @param aMsgWindow   {Integer}
 * @param aFolder      {String}        The folder from which to delete
 * @param aItems       {Array[String]} The ids of the items to delete
 * @param aPermanent   {Boolean} False if this is just a move to Deleted Items
 */
EASAccount.prototype.DeleteMessages = async function(aMsgWindow, aFolder, aItems, aPermanent) {
  let syncKey = await browser.incomingServer.getSyncState(this.serverID, aFolder);
  let request = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: syncKey,
          CollectionId: aFolder,
          DeletesAsMoves: aPermanent ? "0" : "1",
          GetChanges: "0",
          Commands: {
            Delete: aItems.map(item => ({
              ServerId: item,
            })),
          },
        },
      },
    },
  };
  let response = await this.CallService(aMsgWindow, "Sync", request); // eas.js
  if (response.Collections.Collection.Status != "1") {
    throw new EASError(null, "Sync", request, response.Collections.Collection.Status);
  }
  syncKey = response.Collections.Collection.SyncKey;
  browser.incomingServer.setSyncState(this.serverID, aFolder, syncKey);
  if (response.Collections.Collection.Responses) {
    throw new EASError(null, "Sync", request, ensureArray(response.Collections.Collection.Responses.Delete)[0].Status);
  }
}

/**
 * Move messages between folders on the same server
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}        The folder containing the items to move
 * @param aItems     {Array[String]} The ids of the items to move
 * @param aTarget    {String}        The target folder's id
 */
EASAccount.prototype.MoveMessages = async function(aMsgWindow, aFolder, aItems, aTarget) {
  let request = {
    MoveItems: {
      Move: aItems.map(item => ({
        SrcMsgId: item,
        SrcFldId: aFolder,
        DstFldId: aTarget,
      })),
    },
  };
  let result = await this.CallService(aMsgWindow, "MoveItems", request); // eas.js
  // log errors, but otherwise ignore them
  for (let response of ensureArray(result.Response)) {
    // "3" is success for a Move operation... go figure.
    if (response.Status != "3") {
      logError(new EASError(null, "MoveItems", request, response.Status));
    }
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
EASAccount.prototype.UpdateMessages = async function(aMsgWindow, aFolder, aItems, aRead, aFlagged) {
  // All messages get the same updates, so first construct the application data, then apply this to all msgs
  let data = {};
  if (typeof aRead == "boolean") {
    data.Read = aRead ? "1" : "0";
  }
  if (typeof aFlagged == "boolean") {
    data.Flag = aFlagged ? { Status: "2", FlagType: "for Follow Up" } : {};
  }
  let syncKey = await browser.incomingServer.getSyncState(this.serverID, aFolder);
  let request = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: syncKey,
          CollectionId: aFolder,
          GetChanges: "0",
          Commands: {
            Change: aItems.map(item => ({
              ServerId: item,
              ApplicationData: data,
            })),
          },
        },
      },
    },
  };
  try {
    let response = await this.CallService(aMsgWindow, "Sync", request); // eas.js
    if (response.Collections.Collection.Status != "1") {
      throw new EASError(null, "Sync", request, response.Collections.Collection.Status);
    }
    syncKey = response.Collections.Collection.SyncKey;
    browser.incomingServer.setSyncState(this.serverID, aFolder, syncKey);
    if (response.Collections.Collection.Responses) {
      throw new EASError(null, "Sync", request, ensureArray(response.Collections.Collection.Responses.Change)[0].Status);
    }
  } catch (ex) {
    if (ex.code == kItemNotFound && aRead) {
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
 * @param aTags      {Array[String]} The categories to set
 */
EASAccount.prototype.UpdateTags = async function(aMsgWindow, aFolder, aItem, aTags) {
  let syncKey = await browser.incomingServer.getSyncState(this.serverID, aFolder);
  let request = {
    Sync: {
      Collections: {
        Collection: {
          SyncKey: syncKey,
          CollectionId: aFolder,
          GetChanges: "0",
          Commands: {
            Change: [{
              ServerId: aItem,
              ApplicationData: {
                Categories: {
                  Category: aTags,
                },
              },
            }],
          },
        },
      },
    },
  };
  let response = await this.CallService(aMsgWindow, "Sync", request); // eas.js
  if (response.Collections.Collection.Status != "1") {
    throw new EASError(null, "Sync", request, response.Collections.Collection.Status);
  }
  syncKey = response.Collections.Collection.SyncKey;
  browser.incomingServer.setSyncState(this.serverID, aFolder, syncKey);
  if (response.Collections.Collection.Responses) {
    throw new EASError(null, "Sync", request, ensureArray(response.Collections.Collection.Responses.Change)[0].Status);
  }
}

/**
 * Delete all items and subfolders in a folder
 *
 * @param aMsgWindow {Integer}
 * @param aFolder    {String}  The folder to empty
 */
EASAccount.prototype.EmptyTrash = async function(aMsgWindow, aFolder) {
  let request = {
    ItemOperations: {
      EmptyFolderContents: [{
        CollectionId: aFolder,
        Options: {
          DeleteSubFolders: {},
        },
      }],
    },
  };
  await this.CallService(aMsgWindow, "ItemOperations", request);
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
EASAccount.prototype.ProcessOperation = function(aOperation, aParameters, aMsgWindow) {
  switch (aOperation) {
  case "EnsureLoggedIn":
    return;
  case "GetNewMessages":
    return this.CheckFolders(aMsgWindow, false);
  case "UpdateFolder":
    // Sync is cheap in EAS
    return true;
  case "CreateFolder":
    return this.CreateFolder(aMsgWindow, aParameters.parent, aParameters.name);
  case "DeleteFolder":
    return this.DeleteFolder(aMsgWindow, aParameters.folder);
  case "MoveFolder":
  case "RenameFolder":
    return this.UpdateFolder(aMsgWindow, aParameters.folder, aParameters.target, aParameters.name);
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
  case "SendMessageFromMime":
    return this.SendMime(aMsgWindow, aParameters.save, aParameters.content, aParameters.bcc);
  case "DeleteMessages":
    return this.DeleteMessages(aMsgWindow, aParameters.folder, aParameters.messages, aParameters.permanent, aParameters.areMessages);
  case "CopyMessages":
    throw new OwlError("eas-unsupported");
  case "MoveMessages":
    return this.MoveMessages(aMsgWindow, aParameters.folder, aParameters.messages, aParameters.target);
  case "UpdateMessages":
    return this.UpdateMessages(aMsgWindow, aParameters.folder, aParameters.messages, aParameters.read, aParameters.flagged);
  case "UpdateTags":
    return this.UpdateTags(aMsgWindow, aParameters.folder, aParameters.message, aParameters.tags);
  case "EmptyTrash":
    return this.EmptyTrash(aMsgWindow, aParameters.folder);
  }
  throw new Error("Not Implemented");
}
