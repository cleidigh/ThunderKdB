/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2012 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

const EXPORTED_SYMBOLS = ["EwsNativeMachine"];

var Cu = Components.utils;
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "PromiseUtils",
                               "resource://exquilla/PromiseUtils.jsm");
var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");
ChromeUtils.defineModuleGetter(this, "EwsSoapRequest",
                               "resource://exquilla/EwsSoapRequest.jsm");

Utils.importLocally(this);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});

// As async objects trying to survive in a mixed C++/javascript environment, a
//  machine is responsible to stay alive until the StopMachine event. In js,
//  do that with a global array
var gActiveMachines = [];

// Distinguished folder list
var gDistinguishedIds =   ["calendar", "contacts", "deleteditems", "drafts", "inbox",
                          "outbox", "sentitems", "tasks", "msgfolderroot", "junkemail"];
const NORMAL_ITEMS_PER_SYNC = 100;
const MAX_ITEMS_PER_SYNC = 200;
const MAX_ITEMS_TO_GET = 5;

function EwsNativeMachine()
{
  // In the C++ version we held onto references to speed folder loading. For now,
  //  do the same in js
  gActiveMachines.push(this);
  this._isAborted = false;
}

EwsNativeMachine.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  run: function _run() {
    throw CE("not implemented", Cr.NS_ERROR_NOT_IMPLEMENTED);
  },

  getProperty: function _getProperty(aName) {
    throw CE("not implemented", Cr.NS_ERROR_NOT_IMPLEMENTED);
  },

  genericMachineDoTask: function _GenericMachineDoTask(aInnerTask, aMailbox, aListener) {
    let result = {status: Cr.NS_ERROR_FAILURE};
    if (aListener && !aListener.onEvent) {
      throw CE("Wrong type for machine listener");
    }
    (async () => {
      try {
        if (aListener) aListener.onEvent(this, "StartMachine", null, Cr.NS_OK);
        result = await promiseInitial(aMailbox, aListener);

        if (result.status == Cr.NS_OK && aInnerTask) {
          result = await aInnerTask();
        }
      } catch (e) {
        oe(result, "genericMachineDoTaskError", e);
        this.machineErrorResponse(aListener, "InnerMachineReject", null, se(e));
      }
      this.stopMachine(aListener, result);
    })();
  },

  checkOnline: async function _checkOnline(aMailbox, aListener)
  {
    try {
      if (aListener) aListener.onEvent(this, "StartMachine", null, Cr.NS_OK);
      let result = await promiseCheckOnline(aMailbox, aListener);
      this.stopMachine(aListener, result);
    } catch (e) {
      this.machineErrorResponse(aListener, "CheckOnlineMachineReject", null, se(e));
      let result = {status: Cr.NS_ERROR_FAILURE};
      this.stopMachine(aListener, result);
    }
  },

  discoverFolders: async function _discoverFolders(aMailbox, aListener)
  {
    let result = {status: Cr.NS_ERROR_FAILURE};
    try {
      if (aListener) aListener.onEvent(this, "StartMachine", null, Cr.NS_OK);
      do {
        if (Services.io.offline)
        {
          result.status = Cr.NS_ERROR_NOT_AVAILABLE;
          break;
        }
        if (aMailbox.needOnlineCheck)
        {
          result = await promiseCheckOnline(aMailbox, aListener);

          log.config('discoverFoldersMachine checkOnline result is ' + result.status);
        }
        if (!aMailbox.isOnline)
        {
          result = await PromiseUtils.promiseAutodiscover(aMailbox.email.length ? aMailbox.email : aMailbox.username,
            aMailbox.username, aMailbox.domain, aMailbox.password, false, domWindow(), null);

          if (result.status == Cr.NS_OK && result.foundSite)
          {
            // test each possible ews url to see if it is valid
            let urls = [ result.ewsUrl, result.internalEwsUrl, result.ewsOWAGuessedUrl ];
            // todo: the test
            let oldUrl = aMailbox.ewsUrl;
            for (let url of urls)
            {
              if (!url) {
                continue;
              }
              aMailbox.ewsURL = url;
              result = await promiseCheckOnline(aMailbox, aListener);

              log.debug('discoverFoldersMachine checkOnline url ' + url + ' result is ' + result.status);
              if (result.status == Cr.NS_OK)
              {
                log.debug("using ewsUrl from autodiscover: " + url);
                break;
              }
            }
            if (result.status != Cr.NS_OK)
            {
              log.info("autodiscover could not find a valid ews url");
              aMailbox.ewsURL = oldUrl;
              break;
            }
          }
          else
          {
            log.info("Mailbox is not online, and autodiscover did not help");
            result.status = Cr.NS_ERROR_FAILURE;
            break;
          }
        }
        result = await promiseGetDistinguishedIds(aMailbox, aListener);

        log.debug('discoverFoldersMachine getDistinguishedIds result is ' + result.status);
        if (result.status != Cr.NS_OK)
          break;
        let rootFolder = aMailbox.getDistinguishedNativeFolder("msgfolderroot");
        result = await promiseDiscoverSubfolders(aMailbox, rootFolder, aListener);

        log.debug('discoverFoldersMachine discoverFolders result is ' + (result ? result.status : 'result is null!'));
      } while (false);
    }
    catch(e) {
      this.machineErrorResponse(aListener, "taskDiscoverFoldersError", null, se(e));
      if (result.status == Cr.NS_OK) result.status = Cr.NS_ERROR_FAILURE;
    }
    finally {
      if (aListener) aListener.onEvent(null, "StopMachine", null, result.status);
    }
  },

  createSubfolder: function _createSubfolder(aMailbox, aListener, aParentFolder, aChildFolder)
  {
    async function taskCreateSubfolder()
    {
      let soapResponse = new PromiseSoapResponse(aListener);
      let request = new EwsSoapRequest();
      request.mailbox = aMailbox;
      request.createFolder(soapResponse, aParentFolder, aChildFolder);
      aMailbox.queueRequest(request);
      let result = await soapResponse.promise;
      return (result);
    }
    this.genericMachineDoTask(taskCreateSubfolder.bind(this), aMailbox, aListener);
  },

  getFolder: function _getFolder(aMailbox, aListener, aFolder)
  {
    async function taskGetFolder()
    {
      let soapResponse = new PromiseSoapResponse(aListener);
      let request = new EwsSoapRequest();
      request.mailbox = aMailbox;
      request.getFolder(soapResponse, aFolder);
      aMailbox.queueRequest(request);
      let result = await soapResponse.promise;
      return (result);
    }
    this.genericMachineDoTask(taskGetFolder.bind(this), aMailbox, aListener);
  },

  // aClass = 0: error is local   1: error in generator function
  invalidType: function _invalidType(aMailbox, aListener, aClass)
  {
    async function taskInvalidType()
    {
      log.debug("taskInvalidType");
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        if (aClass == 0)
        {
          try {
            // This represents an unexpected, unhandled error of the machine js.
            // We expect the promise to resolve with an error result.
            throw CE("invalid machine type", Cr.NS_ERROR_FAILURE);
          }
          catch (e) {
            this.machineErrorResponse(aListener, "InvalidType0MachineError", null, se(e));
          }
        }
        else if (aClass == 1)
        {
          // Throw an error in the inner task
          try {
            result = await promiseCheckOnline(aMailbox, aListener);
            if (result.status != Cr.NS_OK)
              throw CE("Failure return from checkOnline", result.status);
            result = await taskInvalid(aMailbox, aListener);
          }
          catch (e) {
            if (result.status == Cr.NS_OK)
              result.status = Cr.NS_ERROR_FAILURE;
            this.machineErrorResponse(aListener, "InvalidType1MachineError", null, se(e));
          }
        }
        else
          throw CE("unexpected class in invalidType", Cr.NS_ERROR_FAILURE);
      }
      catch (e) {throw e;}
      finally {return (result);}
    }
    this.genericMachineDoTask(taskInvalidType.bind(this), aMailbox, aListener);
  },

  generateError: function _checkOnline(aMailbox, aListener)
  {
    async function taskGenerateError() {
      log.debug("taskGenerateError");
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        let soapResponse = new PromiseSoapResponse(aListener);
        let request = new EwsSoapRequest();
        request.mailbox = aMailbox;
        request.generateError(soapResponse);
        aMailbox.queueRequest(request);
        result = await soapResponse.promise;
      }
      catch (e) {
        this.machineErrorResponse(aListener, "taskGenerateErrorMachineError", null, se(e));
      }
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskGenerateError.bind(this), aMailbox, aListener);
  },

  /**/
  getItemBody: function _getItemBody(aMailbox, aListener, aNativeItem)
  {
    async function taskGetItemBodyMachine() {
      log.debug("taskGetItemBodyMachine");
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        do {
          if (aNativeItem.processingFlags & aNativeItem.HasBody)
          {
            log.debug('body already exists, nothing to do!');
            // We already have the body, so just deliver it
            result.status = Cr.NS_OK;
            break;
          }

          // Do we have the body perhaps embedded in the properties?
          if (!aNativeItem.isBodyEmpty)
          {
            aNativeItem.processingFlags |= aNativeItem.HasBody;
            result.status = Cr.NS_OK;
            break;
          }

          // Do we have the body in storage?
          if (aNativeItem.flags & aNativeItem.HasOfflineBody)
          {
            log.debug('get body from datastore');
            // get the body from storage
            let dsListener = new PromiseUtils.DatastoreListener();
            aMailbox.datastore.getBody(aNativeItem, dsListener);
            result = await dsListener.promise;
            break;
          }

          // Get the body from the remote server
          let items = Cc["@mozilla.org/array;1"]
                        .createInstance(Ci.nsIMutableArray);
          items.appendElement(aNativeItem, false);
          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          request.getItemBodies(soapResponse, items);
          aMailbox.queueRequest(request);
          result = await soapResponse.promise;

          if (result.status == Cr.NS_OK)
          {
            // persist the body in the datastore
            let dsListener = new PromiseUtils.DatastoreListener();
            aMailbox.datastore.putBody(aNativeItem, dsListener);
            result = await dsListener.promise;
          }

          if (result.status == Cr.NS_OK)
          {
            // persist the item flags in the datastore
            let dsListener = new PromiseUtils.DatastoreListener();
            aMailbox.datastore.putItem(aNativeItem, dsListener);
            result = await dsListener.promise;
          }
          // done!
        } while (false);
      }
      catch (e) {
        this.machineErrorResponse(aListener, "taskGetItemBodyMachine", null, se(e));
      }
      finally   {return (result);}
    }
  this.genericMachineDoTask(taskGetItemBodyMachine.bind(this), aMailbox, aListener);
  },

  getAttachmentContent: function _getAttachmentContent(aMailbox, aListener, aAttachment)
  {
    async function taskGetAttachmentContent()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        do {
          // Don't act if it already exists.
          if (aAttachment.downloaded) {
            result.status = Cr.NS_OK;
            result.data = aAttachment;
            break;
          }
          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          request.getAttachment(soapResponse, aAttachment);
          aMailbox.queueRequest(request);
          result = await soapResponse.promise;
          if (result.status != Cr.NS_OK)
            break;

          // persist the attachment
          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.putItem(aAttachment.parentItem, dsListener);
          result = await dsListener.promise;

          // return the attachment as the event data.
          result.data = aAttachment;
        } while (false);
      }
      catch (e) {oe(result, "taskGetAttachmentContent", e);}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskGetAttachmentContent.bind(this),
                              aMailbox, aListener);
  },

  copyItems: function _copyItems(aMailbox, aListener, aDstFolder, aItemIds, aIsMove)
  {
    async function taskCopyItems() {
      log.debug("taskCopyItems");
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        do {
          // hold onto oldItems since we have not persisted them
          let oldItems = [];
          let newItems = aDstFolder.newItems;
          newItems.clear();

          // We have a race condition, where skink delete does both a markRead on the old messages,
          //  as well as the move. We need to mark the messages as deleted so that the markRead updates
          //  can detect this, and do nothing. This is a slight kludge since we are raising
          //  DeletedLocally without actually persisting.
          for (let i = 0; i < aItemIds.length; i++)
          {
            let item = aMailbox.getItem(aItemIds.getAt(i));
            if (aIsMove)
              item.raiseFlags(item.DeletedLocally);
            oldItems.push(item);
          }

          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          request.copyItems(soapResponse, aDstFolder, aItemIds, aIsMove);
          aMailbox.queueRequest(request);
          result = await soapResponse.promise;

          if (result.status != Cr.NS_OK)
            break;

          let copyBodies = (oldItems.length == newItems.length);
          if (!copyBodies)
            log.warn("Not copying new item bodies since old and new lengths differ");
          for (let i = 0; i < newItems.length; i++)
          {
            let item = newItems.queryElementAt(i, Ci.nsISupports).wrappedJSObject;
            item.clearFlags(item.AllOnServer);
            let dsListener = new PromiseUtils.DatastoreListener();
            aMailbox.datastore.putItem(item, dsListener);
            result = await dsListener.promise;

            if (result.status != Cr.NS_OK)
              log.error("failed to persist new item");

            // request.copyItems does not copy bodies, it sets resync for
            // esoteric reasons. But we know the body from the old item, and
            // gloda indexes right away and needs that body, so set it.
            if (!(item.processingFlags & item.HasBody))
            {
              // how about the old item?
              let oldItem = oldItems[i];
              if (oldItem.flags & oldItem.HasOfflineBody &&
                  !(oldItem.processingFlags & oldItem.HasBody)) {
                let dsListener = new PromiseUtils.DatastoreListener();
                aMailbox.datastore.getBody(item, dsListener);
                result = await dsListener.promise;
                // ignore error
              }
              if (oldItem.processingFlags & oldItem.HasBody)
                item.body = oldItem.body;
            }
            if (item.processingFlags & item.HasBody)
            {
              let dsListener = new PromiseUtils.DatastoreListener();
              aMailbox.datastore.putBody(item, dsListener);
              result = await dsListener.promise;
              if (result.status != Cr.NS_OK)
                log.info("Failed to persist item body");
            }
          }

          // notify listeners of new items
          if (aListener) aListener.onEvent(aItemIds, "NewCopiedItems", newItems, Cr.NS_OK);

          // presumably the listener also updated any locally moved items, so we will
          //  fully delete any moved items.
          for (let oldItem of oldItems)
          {
            if (oldItem.deleted)
            {
              let dsListener = new PromiseUtils.DatastoreListener();
              aMailbox.datastore.deleteBody(oldItem, dsListener);
              result = await dsListener.promise;

              if (result.status != Cr.NS_OK)
                log.info("Failed to delete item body in datastore");

              dsListener = new PromiseUtils.DatastoreListener();
              aMailbox.datastore.deleteItem(oldItem, dsListener);
              result = await dsListener.promise;

              if (result.status != Cr.NS_OK)
                log.info("Failed to delete item in datastore");
              // signal that the mailbox does not need to do the delete
              oldItem.processingFlags |= oldItem.DeletedInDatastore;
              aMailbox.removeItem(oldItem);
            }
          }
          oldItems = null; // probably not needed
        } while (false);
      }
      catch (e) {this.machineErrorResponse(aListener, "taskCopyItems", null, se(e));}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskCopyItems.bind(this), aMailbox, aListener);
  },

//  void deleteSubfolders(in EwsNativeMailbox aMailbox, in EwsEventListener aListener,
//                        in StringArray aFoldersIds, in boolean aMoveToDeletedItems);
  deleteSubfolders: function _deleteSubfolders(aMailbox, aListener, aFolderIds, aMoveToDeletedItems)
  {
    async function taskDeleteSubfolders()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        do {
          let hardDeleteIds = new StringArray();
          let moveDeleteIds = new StringArray();
          let deleteIds = new StringArray();
          let batchLength = 50;

          for (let i = 0; i < aFolderIds.length; i++)
          {
            let folderId = aFolderIds.getAt(i);
            let folderToDelete = aMailbox.getNativeFolderFromCache(folderId);
            if (!folderToDelete)
            {
              log.warn("Could not find folder in cache, skipping delete");
              continue;
            }
            let parentDId = aMailbox.getNativeFolderFromCache(folderToDelete.parentFolderId)
                                    .distinguishedFolderId;
            if (!aMoveToDeletedItems || (parentDId == "deleteditems"))
              hardDeleteIds.append(folderId);
            else
              moveDeleteIds.append(folderId);
          }
          for (let index = 0; index < moveDeleteIds.length;)
          {
            deleteIds.clear();
            while (deleteIds.length < batchLength && index < moveDeleteIds.length)
              deleteIds.append(moveDeleteIds.getAt(index++));
            if (deleteIds.length)
            {
              let soapResponse = new PromiseSoapResponse(aListener);
              let request = new EwsSoapRequest();
              request.mailbox = aMailbox;
              request.deleteFolders(soapResponse, deleteIds, true);
              aMailbox.queueRequest(request);
              result = await soapResponse.promise;
              if (result.status != Cr.NS_OK)
                break;
            }
          }
          for (let index = 0; index < hardDeleteIds.length;)
          {
            deleteIds.clear();
            while (deleteIds.length < batchLength && index < hardDeleteIds.length)
              deleteIds.append(hardDeleteIds.getAt(index++));
            if (deleteIds.length)
            {
              let soapResponse = new PromiseSoapResponse(aListener);
              let request = new EwsSoapRequest();
              request.mailbox = aMailbox;
              request.deleteFolders(soapResponse, deleteIds, false);
              aMailbox.queueRequest(request);
              result = await soapResponse.promise;
              if (result.status != Cr.NS_OK)
                break;
            }
          }
        } while (false);
      }
      catch (e) {oe(result, "taskDeleteSubfolders", e);}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskDeleteSubfolders.bind(this), aMailbox, aListener);
  },

  deleteItems: function _deleteItems(aMailbox, aListener, aItemIds, aMoveToDeletedItems)
  {
    async function taskDeleteItems()
    {
      log.debug("taskDeleteItems");
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {

        do {
          // set the deleted locally flag on items, then persist
          for (let i = 0; i < aItemIds.length; i++)
          {
            let item = aMailbox.getItem(aItemIds.getAt(i));
            item.raiseFlags(item.DeletedLocally);
            item.clearFlags(item.NewLocally | item.UpdatedLocally);
            let dsListener = new PromiseUtils.DatastoreListener();
            aMailbox.datastore.putItem(item, dsListener);
            result = await dsListener.promise;
          }

          // delete the items on the server
          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          request.deleteItems(soapResponse, aItemIds, aMoveToDeletedItems);
          aMailbox.queueRequest(request);
          result = await soapResponse.promise;

          if (result.status != Cr.NS_OK)
          {
            log.warning('item failed to delete on server, not found?');
            break;
          }

          // persist the item as fully deleted
          for (let i = 0; i < aItemIds.length; i++)
          {
            let item = aMailbox.getItem(aItemIds.getAt(i));
            // At this point the item is deleted on the server, but the local
            //  syncstate does not reflect that until we do a folder update. This
            //  will update automatically from the syncState.
            item.clearFlags(item.DeletedLocally);
            let dsListener = new PromiseUtils.DatastoreListener();
            aMailbox.datastore.putItem(item, dsListener);
            result = await dsListener.promise;
          }
        } while (false);
      }
      catch (e) {this.machineErrorResponse(aListener, "taskDeleteItems", null, se(e));}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskDeleteItems.bind(this), aMailbox, aListener);
  },

  discoverSubfolders: function _discoverSubfolders(aMailbox, aListener, aFolder)
  {
    async function taskDiscoverSubfoldersCall()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        result = await promiseDiscoverSubfolders(aMailbox, aFolder, aListener);
      }
      catch (e) {oe(result, "taskDiscoverSubfoldersCall", e);}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskDiscoverSubfoldersCall.bind(this), aMailbox, aListener);
  },

  // This method is a machine, but does not have the usual check of online.
  allIds: async function _allIds(aMailbox, aListener, aFolderId)
  {
    let result = {status: Cr.NS_ERROR_FAILURE};
    log.debug("taskAllIds() for folderId " + aFolderId);
    try {
      if (aListener)
        aListener.onEvent(this, "StartMachine", null, Cr.NS_OK);
      let dsListener = new PromiseUtils.DatastoreListener();
      aMailbox.datastore.getIdsForFolder(aFolderId, dsListener);
      result = await dsListener.promise;

      if (result.status != Cr.NS_OK)
        throw CE("Failed to get mailbox ids");
      let itemIds = result.data.wrappedJSObject.StringArray;
      let changeKeys = result.item.wrappedJSObject.StringArray;
      log.debug("datastore itemIds length is " + itemIds.length);

      // add to that list any cached ids, but with warning
      let cachedIds = aMailbox.allCachedIds(aFolderId);
      let gaveWarning = false;
      if (cachedIds.length)
        log.debug("cached ids length is " + cachedIds.length);
      for (let i = 0; i < cachedIds.length; i++)
      {
        if (itemIds.indexOf(cachedIds.getAt(i)) == -1)
        {
          if (!gaveWarning)
          {
            gaveWarning = true;
            log.warn('adding cached but not persisted itemId to request for allIds');
            aListener.onEvent(null, "UnpersistedIdWarning", null, Cr.NS_OK);
          }
          itemIds.append(cachedIds.getAt(i));
          changeKeys.append("");
        }
      }
    }
    catch(e) {
      this.machineErrorResponse(aListener, "genAllIdsError", null, se(e));
      result.status = Cr.NS_ERROR_FAILURE;
    }
    finally {
      // result.data are itemIds, result.item are changeKeys
      this.stopMachine(aListener, result);
    }
  },

//  void getItemsMimeContent(in EwsNativeMailbox aMailbox, in EwsEventListener aListener,
//                           in nsIMutableArray aItems);
  getItemsMimeContent: function _getItemsMimeContent(aMailbox, aListener, aItems)
  {
    async function taskGetItemsMimeContent()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        let soapResponse = new PromiseSoapResponse(aListener);
        let request = new EwsSoapRequest();
        request.mailbox = aMailbox;
        request.getItemsMimeContent(soapResponse, aItems);
        aMailbox.queueRequest(request);
        result = await soapResponse.promise;
      }
      catch (e) {oe(result, "taskGetItemsMimeContent", e);}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskGetItemsMimeContent.bind(this), aMailbox, aListener);
  },

  getItemOffline: function _getItemOffline(aMailbox, aListener, aItem)
  {
    async function taskGetItemOffline()
    {
      let result = {status: Cr.NS_OK};
      try {
        do {
          // Do we need to get the body?
          if (!(aItem.flags & aItem.HasOfflineBody))
          {
            log.debug('get offline body from server');
            let items = Cc["@mozilla.org/array;1"]
                          .createInstance(Ci.nsIMutableArray);
            items.appendElement(aItem, false);
            let soapResponse = new PromiseSoapResponse(aListener);
            let request = new EwsSoapRequest();
            request.mailbox = aMailbox;
            request.getItemBodies(soapResponse, items);
            aMailbox.queueRequest(request);
            result = await soapResponse.promise;
            if (result.status != Cr.NS_OK)
              break;

            // persist the body in the datastore
            let dsListener = new PromiseUtils.DatastoreListener();
            aMailbox.datastore.putBody(aItem, dsListener);
            result = await dsListener.promise;
            if (result.status != Cr.NS_OK)
              break;

            // persist the item flags in the datastore
            dsListener = new PromiseUtils.DatastoreListener();
            aMailbox.datastore.putItem(aItem, dsListener);
            result = await dsListener.promise;
            if (result.status != Cr.NS_OK)
              break;
          }

          // Get any attachments
          for (let i = 0; i < aItem.attachmentCount; i++)
          {
            let attachment = aItem.getAttachmentByIndex(i);
            if (attachment.downloaded)
              continue;
            let listener = new PromiseUtils.MachineListener();
            aMailbox.getAttachmentContent(attachment, listener);
            result = await listener.promise;
            if (result.status != Cr.NS_OK)
              log.warn("Failed to download attachment");
          }
        } while (false);
      }
      catch (e) {oe(result, "taskGetItemOffline", e);}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskGetItemOffline.bind(this), aMailbox, aListener);
  },

  createMessageFromString: function _createMessageFromString(aMailbox, aListener, aMessage, aFolder, aProperties)
  {
    async function taskCreateMessageFromString()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        do {
          let nativeItem = aMailbox.createItem("", "IPM.Note", aFolder);
          nativeItem.properties = aProperties;

          nativeItem.mimeContent = aMessage;

          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          request.createItem(soapResponse, nativeItem, "SaveOnly");
          aMailbox.queueRequest(request);
          result = await soapResponse.promise;
          if (!Components.isSuccessCode(result.status))
            break;

          // the server parses the message, and updates properties. So we have to get them.
          log.debug("Raising NeedsResync in createMessageFromString");
          nativeItem.raiseFlags(nativeItem.NeedsResync);
          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.putItem(nativeItem, dsListener);
          result = await dsListener.promise;
        } while (false);
      }
      catch (e) {this.machineErrorResponse(aListener, "taskCreateMessageFromFile", null, se(e));}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskCreateMessageFromString.bind(this), aMailbox, aListener);
  },

  createMessageFromFile: function _createMessageFromFile(aMailbox, aListener, aFile, aFolder, aProperties)
  {
    async function taskCreateMessageFromFile()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        do {
          let nativeItem = aMailbox.createItem("", "IPM.Note", aFolder);
          nativeItem.properties = aProperties;
          result = await PromiseUtils.promiseAsyncFetch(aFile);
          if (!Components.isSuccessCode(result.status))
            break;

          nativeItem.mimeContent = NetUtil.readInputStreamToString(result.inputStream,
                                                                   result.inputStream.available());

          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          request.createItem(soapResponse, nativeItem, "SaveOnly");
          aMailbox.queueRequest(request);
          result = await soapResponse.promise;
          if (!Components.isSuccessCode(result.status))
            break;

          // the server parses the message, and updates properties. So we have to get them.
          log.debug("Raising NeedsResync in createMessageFromFile");
          nativeItem.raiseFlags(nativeItem.NeedsResync);
          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.putItem(nativeItem, dsListener);
          result = await dsListener.promise;
        } while (false);
      }
      catch (e) {this.machineErrorResponse(aListener, "taskCreateMessageFromFile", null, se(e));}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskCreateMessageFromFile.bind(this), aMailbox, aListener);
  },

  moveSubfolders: function _moveSubfolders(aMailbox, aListener, aSourceFolderIds, aDestFolder)
  {
    async function taskMoveSubfolders()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        let soapResponse = new PromiseSoapResponse(aListener);
        let request = new EwsSoapRequest();
        request.mailbox = aMailbox;
        request.moveFolders(soapResponse, aSourceFolderIds, aDestFolder);
        aMailbox.queueRequest(request);
        result = await soapResponse.promise;
      }
      catch (e) {this.machineErrorResponse(aListener, "taskMoveSubfolders", null, se(e));}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskMoveSubfolders.bind(this), aMailbox, aListener);
  },

//  void saveNewItem(in EwsNativeMailbox aMailbox, in EwsEventListener aListener,
//                   in EwsNativeItem aNativeItem);
  saveNewItem: function _saveNewItem(aMailbox, aListener, aItem)
  {
    async function taskSaveNewItem()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        do {
          if (!aItem.itemId || !aItem.itemId.length)
          {
            // We'll use a temporary ID
            let uuid = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator).generateUUID().toString();
            aItem.itemId = uuid;
            aItem.raiseFlags(aItem.HasTempId);
          }

          // update flags
          aItem.raiseFlags(aItem.NewLocally);
          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.putItem(aItem, dsListener);
          result = await dsListener.promise;
          if (result.status != Cr.NS_OK)
            break;

          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          request.createItem(soapResponse, aItem, "");
          aMailbox.queueRequest(request);
          // need to implement this for test!
          // BREAK_IF_FALSE(!mTestType.EqualsLiteral("CreateOffline"), "Testing CreateOffline");

          result = await soapResponse.promise;
          if (result.status != Cr.NS_OK)
            break;

          // now add the attachments, if any
          for (let i = 0; i < aItem.attachmentCount; i++)
          {
            let attachment = aItem.getAttachmentByIndex(i);
            let soapResponse = new PromiseSoapResponse(aListener);
            let request = new EwsSoapRequest();
            request.mailbox = aMailbox;
            request.createAttachment(soapResponse, attachment);
            aMailbox.queueRequest(request);
            result = await soapResponse.promise;
            if (result.status != Cr.NS_OK)
            {
              log.error("Failed to save attachment");
              break;
            }
          }
          if (result.status != Cr.NS_OK)
            break;

          // local updates should now be saved
          aItem.localProperties.removeElement("Updates");

          // If the item is deleted remotely before updated locally, then we miss that
          //  delete. So force a resync of this item.
          aItem.raiseFlags(aItem.NeedsResync);

          dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.putItem(aItem, dsListener);
          result = await dsListener.promise;
        } while (false);
      }
      catch (e) {this.machineErrorResponse(aListener, "taskSaveNewItem", null, se(e));}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskSaveNewItem.bind(this), aMailbox, aListener);
  },

  // xxx todo: deal with calendar issues, for now does not support
  updateManyItems: function _updateManyItems(aMailbox, aListener, aItems)
  {
    async function taskUpdateManyItems()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        let itemsToUpdate = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
        // We will persist first, then do the soap call to
        // persist the changes externally
        for (let i = 0; i < aItems.length; i++)
        {
          let item = aItems.queryElementAt(i, Ci.nsISupports).wrappedJSObject;
          if (!item.itemId || !item.itemId.length)
          { // We'll use a temporary ID
            let uuid = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator).generateUUID().toString();
            item.itemId = uuid;
            item.raiseFlags(item.HasTempId);
          }

          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.putItem(item, dsListener);
          result = await dsListener.promise;
          if (result.status != Cr.NS_OK)
            log.error("Failed to persist changed item");

          if (item.changeKey.length)
            itemsToUpdate.appendElement(item, false);
          else
          {
            // If an item has no change key, then it has been created then modified
            //  locally, but we still need to create it on the server instead of
            //  doing an update.
            log.config("Empty change key for UpdateItemProperties, creating instead");
            // Should also have the temp id flag.
            if (!(item.flags & item.HasTempId))
              throw CE("No changeKey, but no HasTempId, not creating item");

            let soapResponse = new PromiseSoapResponse(aListener);
            let request = new EwsSoapRequest();
            request.mailbox = aMailbox;
            request.createItem(soapResponse, item, "");
            aMailbox.queueRequest(request);
            result = await soapResponse.promise;
            if (result.status != Cr.NS_OK)
              throw CE("failed to create item");

            // now add the attachments, if any
            for (let j = 0; j < item.attachmentCount; j++)
            {
              let attachment = item.getAttachmentByIndex(j);
              let soapResponse = new PromiseSoapResponse(aListener);
              let request = new EwsSoapRequest();
              request.mailbox = aMailbox;
              request.createAttachment(soapResponse, attachment);
              aMailbox.queueRequest(request);
              result = await soapResponse.promise;
              if (result.status != Cr.NS_OK)
                throw CE("Failed to save attachment");
            }
          }
        }

        // During skink deletes, there is a sync request to mark read, followed by the delete
        //  request. So while we are busy persisting above, the message gets deleting on the
        //  server. Detect this, and don't bother to update if message is deleted already.
        log.debug("Checking if items are deleted prior to actually doing the update");
        for (let ip1 = itemsToUpdate.length; ip1 > 0; ip1--)
        {
          let item = itemsToUpdate.queryElementAt(ip1 - 1, Ci.nsISupports).wrappedJSObject;
          if (item.flags & (item.DeletedBit |
                            item.DeletedOnServerBit ||
                            item.DeletedLocally))
            itemsToUpdate.removeElementAt(ip1 - 1);
        }

        // now save the updates
        if (itemsToUpdate.length)
        {
          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          let rv = Cr.NS_OK;
          try {
            request.saveManyUpdates(soapResponse, itemsToUpdate);
          } catch (e) {rv = e.result;}
          if (rv == Cr.NS_OK)
          {
            aMailbox.queueRequest(request);
            result = await soapResponse.promise;
            if (result.status == Cr.NS_ERROR_NOT_AVAILABLE)
            {
              // We often get this as a race condition during message delete. Just note.
              log.info("item not found during update");
              rv = Cr.NS_OK;
            }
            else if (result.status != Cr.NS_OK)
              throw CE('Failed to save updates');
          }
          // NS_ERROR_ALREADY_INITIALIZED is an expected result, meaning nothing changed
          else if (rv != Cr.NS_ERROR_ALREADY_INITIALIZED)
            throw CE(rv);
        }

        // We have completed updates, so we need to reset the local
        //  updates PL
        for (let i = 0; i < aItems.length; i++)
        {
          let item = aItems.queryElementAt(i, Ci.nsISupports).wrappedJSObject;
          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.putItem(item, dsListener);
          result = await dsListener.promise;
          if (result.status != Cr.NS_OK)
            log.error("Failed to persist changed item");
        }
      }
      catch (e) {oe(result, "taskUpdateManyItems", e);}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskUpdateManyItems.bind(this), aMailbox, aListener);
  },

  updateItemProperties: function _updateItemProperties(aMailbox, aListener, aItem, aProperties)
  {
    async function taskUpdateItemProperties()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        let rv = Cr.NS_OK;
        let mergeResult;
        // We will update locally and persist first, then do the soap call
        try {
          mergeResult = aItem.mergeChanges(aProperties);
        } catch (e) {rv = e.result;}
        if (rv != Cr.NS_OK)
          throw CE(rv);

        // persist the changes
        //  Deal with a recurrence item exception that does not have an original start
        rv = Cr.NS_OK;
        try {
          let dummyId = aItem.exItemId;
        } catch (e) {rv = e.result}
        if (rv == Cr.NS_ERROR_NOT_IMPLEMENTED)
        {
          // This will prevent offline changes to occurrence exceptions from working!
          log.info('Not persisting pre-exchange local copy of occurrence exception');
        }
        else if (rv != Cr.NS_OK)
          throw CE(rv);
        else // persist the item
        {
          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.putItem(aItem, dsListener);
          result = await dsListener.promise;
          if (result.status != Cr.NS_OK)
            log.error("Failed to persist changed item");
        }

        result = await promiseDeletedOccurrences(aItem, aMailbox, aListener);
        if (result.status != Cr.NS_OK)
          log.error('Failed to deleted deleted occurrences');

        // now save the updates

        let soapResponse = new PromiseSoapResponse(aListener);
        let request = new EwsSoapRequest();
        request.mailbox = aMailbox;
        rv = Cr.NS_OK;
        try {
          request.saveUpdates(soapResponse, aItem);
        } catch (e) {rv = e.result;}
        if (rv == Cr.NS_OK)
        {
          aMailbox.queueRequest(request);
          result = await soapResponse.promise;
          if (result.status != Cr.NS_OK)
          {
            log.error('Failed to save updates');
            throw CE('Failed to save updates');
          }
        }
        // NS_ERROR_ALREADY_INITIALIZED is an expected result, meaning nothing changed
        else if (rv != Cr.NS_ERROR_ALREADY_INITIALIZED)
          throw CE(rv);

        // We have completed updates, so we need to reset the local
        //  updates PL
        try {
          aItem.localProperties.removeElement("Updates");
        } catch (e) {}

        let dsListener = new PromiseUtils.DatastoreListener();
        aMailbox.datastore.putItem(aItem, dsListener);
        result = await dsListener.promise;
        if (result.status != Cr.NS_OK)
          log.error("Failed to persist changed item");
      }
      catch (e) {oe(result, "taskUpdateItemProperties", e);}
      finally   {return (result);}
    }

    // If an item has no change key, then it has been created then modified
    //  locally, but we still need to create it on the server instead of
    //  doing an update.
    // XXX ToDo: I need to persist this?
    if (!aItem.changeKey.length)
    {
      log.warn("Empty change key for UpdateItemProperties, creating instead");
      aItem.properties = aProperties;
      return this.saveNewItem(aMailbox, aListener, aItem);
    }

  this.genericMachineDoTask(taskUpdateItemProperties.bind(this), aMailbox, aListener);
  },

  sendItem: function _sendItem(aMailbox, aListener, aNativeItem, aSaveItem, aSavedItemFolderId)
  {
    async function taskSendItem()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        let soapResponse = new PromiseSoapResponse(aListener);
        let request = new EwsSoapRequest();
        request.mailbox = aMailbox;
        request.sendItem(soapResponse, aNativeItem, aSaveItem, aSavedItemFolderId);
        aMailbox.queueRequest(request);
        result = await soapResponse.promise;
      }
      catch (e) {oe(result, "taskSendItem", e);}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskSendItem.bind(this), aMailbox, aListener);
  },

  resolveNames: function _resolveNames(aMailbox, aListener, aEntry, aReturnFullContactData)
  {
    async function taskResolveNames()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        let soapResponse = new PromiseSoapResponse(aListener);
        let request = new EwsSoapRequest();
        this._activeRequest = request;
        request.mailbox = aMailbox;
        request.resolveNames(soapResponse, aEntry, aReturnFullContactData);
        aMailbox.queueRequest(request);
        result = await soapResponse.promise;

        if (result.status == Cr.NS_OK)
        {
          try {
            result.data = request.result.getPropertyLists("ResolutionSet/Resolution");
          } catch (e) {log.debug('machine resolveNames no results found');}
        }
      }
      catch (e) {oe(result, "taskResolveNames", e);}
      finally   {
        this._activeRequest = null;
        return (result);
      }
    }
    this.genericMachineDoTask(taskResolveNames.bind(this), aMailbox, aListener);
  },

  // abort currently only partially implemented
  abort() {
    if (!this.isAborted && this._activeRequest)
      this._activeRequest.abort();
    this._isAborted = true;
    this._activeRequest = null;
  },

  getAllServerIds: function _getAllIds(aMailbox, aListener, aNativeFolder)
  {
    async function taskGetAllServerIds()
    {
      let result = {status: Cr.NS_ERROR_FAILURE};
      try {
        let allItemsPL = new PropertyList();

        let maxItemsPerCall = 500;
        try {
          maxItemsPerCall = Services.prefs.getIntPref("extensions.exquilla.resyncItemsMax");
        } catch (e) {log.warn("Error getting pref extensions.exquilla.resyncItemsMax: " + e);}
        log.debug("getAllServerIds with max items per call " + maxItemsPerCall);

        let includesLastItemInRange = false;
        let offset = 0;
        // For all except the first scan, we confirm that the first ids matches the last
        // of the previous scan
        while (!includesLastItemInRange)
        {
          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = aMailbox;
          // repeat the previous id
          request.getAllIds(soapResponse, aNativeFolder, offset > 0 ? offset - 1 : 0, maxItemsPerCall);
          aMailbox.queueRequest(request);
          result = await soapResponse.promise;

          if (result.status != Cr.NS_OK)
            break;
          // for some reason the RootFolder is not returning its attributes,
          //  so parse them from the DOM result
          let rootFolder = request.soapResponse.body.getElementsByTagNameNS(
                             "http://schemas.microsoft.com/exchange/services/2006/messages",
                             "RootFolder")[0];
          //let indexedPagingOffset = parseInt(rootFolder.getAttribute("IndexedPagingOffset"), 10);
          includesLastItemInRange = rootFolder.getAttribute("IncludesLastItemInRange") == "true";
          let items = request.result.getPropertyList("RootFolder/Items");
          for (let i = 0; items && i < items.length; i++)
          {
            //dump("item #" + i + " name is " + items.getNameAt(i) + "\n");
            let item = items.getPropertyListAt(i);
            if ( (i == 0) && (offset != 0))
            {
              // check for match to prevent list changes during finds
              if (item.getAString("ItemId/$attributes/Id") == allItemsPL.getPropertyListAt(offset - 1).getAString("ItemId"))
                continue;
              // No match, quit with error
              log.config("Aborting getAllServerIds because item id list changed during download");
              result.status = Cr.NS_ERROR_NOT_AVAILABLE;
              result.responseCode = "MsqGetAllServerIdsItemMismatch";
              break;
            }
            let itemPL = new PropertyList();
            itemPL.setAString("ItemId", item.getAString("ItemId/$attributes/Id"));
            itemPL.setAString("ChangeKey", item.getAString("ItemId/$attributes/ChangeKey"));
            itemPL.setAString("ItemClass", item.getAString("ItemClass"));
            itemPL.setBoolean("IsRead", item.getAString("ExtendedProperty/Value") == "true");
            allItemsPL.appendPropertyList("Item", itemPL);
            offset++;
          }
          if (result.status != Cr.NS_OK)
            break;
        }
        result.item = allItemsPL;
      }
      catch (e) {oe(result, "taskGetAllServerIds", e);}
      finally   {return (result);}
    }
    this.genericMachineDoTask(taskGetAllServerIds.bind(this),
                              aMailbox, aListener);
  },

  getNewItems: function _getNewItems(aMailbox, aListener, aFolder, aGetAttachments)
  {
    async function taskGetNewItems()
    {
      // hold a reference to items so they do not get garbage collected while
      // we are doing a long get.
      let itemsDeathGrip = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      let result = {status: Cr.NS_OK};
      let messageCount = 0;
      try {
        let getBodies = aGetAttachments ||
                          Cc["@mozilla.org/preferences-service;1"]
                            .getService(Ci.nsIPrefBranch)
                            .getBoolPref("extensions.exquilla.getAllBodies");
        // before we can get items for a particular folder, we need to fix any items that are flagged
        //  as having a missing folder
        log.config("genGetNewItems for folder " + aFolder.displayName + " getBodies? " + getBodies);
        try { // continue anyway if error
          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.getIdsForFolder("MISSING", dsListener);
          let result = await dsListener.promise;
          if (result.status != Cr.NS_OK)
            throw new CE("Failed to get items with missing folder id", Cr.NS_ERROR_FAILURE);
          let missingFolderIds = result.data.wrappedJSObject.StringArray;
          if (missingFolderIds.length)
            log.info("Getting " + missingFolderIds.length + " items with missing folder ids");
          for (let i = 0; i < missingFolderIds.length; i++)
          {
            if (aMailbox.isShutdown)
              throw CE("Mailbox is shutdown");
            let itemId = missingFolderIds.getAt(i);
            let changedItem = aMailbox.getItem(itemId);
            try {
              let getChangedIds = new StringArray();
              getChangedIds.append(itemId);

              let soapResponse = new PromiseSoapResponse(aListener);
              let request = new EwsSoapRequest();
              request.mailbox = aMailbox;
              request.getChangedItemProperties(soapResponse, null, getChangedIds, false);
              aMailbox.queueRequest(request);
              let result = await soapResponse.promise;

              if ( (result.responseCode && result.responseCode == "ErrorItemNotFound") ||
                   (result.responseCode && result.responseCode == "ErrorInvalidIdMalformed") ||
                   (result.responseCode && result.responseCode == "ErrorAccessDenied") ||
                   (changedItem.flags & changedItem.DeletedOnServerBit)
              )
              {
                // Neither we nor Exchange knows what this is. Just delete it from the datastore.
                log.info('deleting stray or inaccessible item in datastore');
                let dsListener = new PromiseUtils.DatastoreListener();
                aMailbox.datastore.deleteItem(changedItem, dsListener);
                await dsListener.promise;
              }
              else if (result.status == Cr.NS_OK)
              {
                changedItem.raiseFlags(changedItem.Dirty);
                changedItem.clearFlags(changedItem.AllLocally);
                let dsListener = new PromiseUtils.DatastoreListener();
                aMailbox.datastore.putItem(changedItem, dsListener);
                result = await dsListener.promise;
              }
              else
              {
                // I need to tell the difference between a permanent and a temporary error. For now, I'll
                //  just assume this is temporary.
                log.warn("getChangedItemProperties failed with response code " + result.responseCode);
                continue;
              }
            }
            catch (e)
            {
              // if we fail, then delete the item from the datastore to prevent further attempts
              try {
                log.info("error processing missing folders, deleting item in datastore: " + e);
                let dsListener = new PromiseUtils.DatastoreListener();
                aMailbox.datastore.deleteItem(changedItem, dsListener);
                await dsListener.promise;
              } catch (e) { e.code = "error-deleting-missing-item"; log.error('delete of failed missing folder item failed', e);}
            }
          }
        } catch (e) {log.error(CE(e));}

        // get locally changed ids
        let id = aFolder.folderId.length ? aFolder.folderId : aFolder.distinguishedFolderId;
        let dsListener = new PromiseUtils.DatastoreListener();
        aMailbox.datastore.changedOnFolder(id, dsListener);
        result = await dsListener.promise;
        // this is an irrecoverable internal error
        if (result.status != Cr.NS_OK)
          throw CE("changedOnFolder failed", Cr.NS_ERROR_FAILURE);
        let changedLocallyIds = result.data.wrappedJSObject.StringArray;
        let dirtyIds = [];

        // do local changes
        if (changedLocallyIds.length)
          log.config("Going to process " + changedLocallyIds.length + " changedLocallyIDs");
        for (let i = 0; i < changedLocallyIds.length; i++)
        {
          log.debug("processing changedLocallyId # " + i + " of " + changedLocallyIds.length);
          if (aMailbox.isShutdown)
            throw CE("Mailbox is shutdown");
          // default error to detect js error
          let changedItem;
          let deleteMe = false;
          result = {status: Cr.NS_ERROR_NOT_INITIALIZED};
          try {
            let itemId = changedLocallyIds.getAt(i);
            changedItem = aMailbox.getItem(itemId);
            let flags = changedItem.flags;
            // We'll get dirty items later
            if (flags & (changedItem.Dirty | changedItem.NeedsResync))
            {
              log.debug("Item is dirty");
              dirtyIds.push(itemId);
              result.status = Cr.NS_OK;
              continue;
            }
            if (flags & changedItem.DeletedLocally)
            {
              log.debug("Item is deleted locally");
              // the server does not yet know of this local deletion
              let deletedIds = new StringArray();
              deletedIds.append(itemId);
              let soapResponse = new PromiseSoapResponse(aListener);
              let request = new EwsSoapRequest();
              request.mailbox = aMailbox;
              // todo: support Move To Deleted Items preference
              request.deleteItems(soapResponse, deletedIds, true);
              aMailbox.queueRequest(request);
              result = await soapResponse.promise;
              deleteMe = true;
            }
            else if (flags & changedItem.NewLocally)
            {
              log.debug("Item is new locally");
              // the server does not yet know of this new item, create it
              let soapResponse = new PromiseSoapResponse(aListener);
              let request = new EwsSoapRequest();
              request.mailbox = aMailbox;
              request.createItem(soapResponse, changedItem, "SaveOnly");
              aMailbox.queueRequest(request);
              result = await soapResponse.promise;
            }
            else if (flags & changedItem.UpdatedLocally)
            {
              log.debug("Item is updated locally");
              // the server does not yet know of this item update
              let soapResponse = new PromiseSoapResponse(aListener);
              let request = new EwsSoapRequest();
              let rv = Cr.NS_OK;
              request.mailbox = aMailbox;
              try {
                request.saveUpdates(soapResponse, changedItem);
              } catch (e) {rv = e.result;}
              if (rv == Cr.NS_OK)
              {
                aMailbox.queueRequest(request);
                result = await soapResponse.promise;
              }
              else if (rv == Cr.NS_ERROR_ALREADY_INITIALIZED)
              {
                try {
                  result.status = Cr.NS_OK;
                  log.info('tried to update an item that did not need it on folder ' + aFolder.displayName);
                  changedItem.clearFlags(changedItem.UpdatedLocally);
                  changedItem.localProperties.removeElement("Updates");
                } catch (e) {}
              }
              else
                throw e;
              if (soapResponse.responseCode && soapResponse.responseCode.length)
              {
                log.warn("saveUpdate had a response code " + soapResponse.responseCode);
                if (soapResponse.responseCode == "ErrorItemNotFound")
                {
                  // Exchange does not know what this is. Just delete it from the datastore.
                  log.warn('stray item in datastore deleted with subject ' +
                           (changedItem.properties ? changedItem.properties.getAString("Subject") : "Missing"));
                  deleteMe = true;
                }
              }
            }
            else
            {
              // We end up here with a simple deleteBit, that is the message is deleted in skink,
              //  presumably as part of a multipart transaction. That's the common delete case,
              //  the message should be gone, so let's not bother to look for it.
              //
              if (changedItem.flags & changedItem.DeletedBit) {
                log.debug("No local change but deletedBit, deleting from datastore");
                deleteMe = true;
                result.status = Cr.NS_OK;
              }
              // 2012-04-13 we want to change the usage of the OnServer flags, stop persisting them, and
              //  only use them during ItemChanged notifications. If any exist, then fix that here.
              else if (changedItem.flags & changedItem.AllOnServer)
              {
                log.debug("No changed detected, clearing AllOnServer flags");
                changedItem.clearFlags(changedItem.AllOnServer);
              }
              // Otherwise, we don't know what is going on, so leave the error to set this dirty.
            }
          } catch (e) {
            log.warn("changedLocallyIds error " + e);
            if (result.status == Cr.NS_OK) result.status = Cr.NS_ERROR_FAILURE;
          } finally {
            if (deleteMe)
            {
              let dsListener = new PromiseUtils.DatastoreListener();
              aMailbox.datastore.deleteItem(changedItem, dsListener);
              let result = await dsListener.promise;
              if (result.status != Cr.NS_OK)
                log.debug("Failed to delete item, probably was bogus to begin with");
            }
            // todo: detect offline and handle
            // We'll handle errors by setting the item dirty
            else if ( (result.status != Cr.NS_OK) && changedItem)
            {
              log.debug("Changed locally id unsuccessful, mark item dirty");
              changedItem.raiseFlags(changedItem.Dirty)
              changedItem.clearFlags(changedItem.NewLocally ||
                                     changedItem.DeletedLocally ||
                                     changedItem.UpdatedLocally);
              dirtyIds.push(changedItem.itemId);
              let dsListener = new PromiseUtils.DatastoreListener();
              aMailbox.datastore.putItem(changedItem, dsListener);
              let result = await dsListener.promise;
              if (result.status != Cr.NS_OK)
                log.warn("failed to persist changed item");
            }
            else if (changedItem)
            {
              try {
                // We have to deal with the case of a recurrence item exception that does
                //  not have an original start. An error getting exItemId is a sign
                //  of that
                let dummy = changedItem.exItemId;
                // if we succeed go on to persist
                //log.debug('persisting item with flags ' + changedItem.flags);
                let dsListener = new PromiseUtils.DatastoreListener();
                aMailbox.datastore.putItem(changedItem, dsListener);
                let result = await dsListener.promise;
                if (result.status != Cr.NS_OK)
                  log.warn("failed to persist changed item");
              }
              catch (e)
              {
                log.warn("Not persisting local copy of occurrence exception");
                continue;
              }
              let result = await promiseDeletedOccurrences(changedItem, aMailbox, aListener);
              if (result.status != Cr.NS_OK)
                log.warn("failed to delete DeletedOccurrences");
            }
          }
        }
        if (dirtyIds.length)
          log.debug('items are dirty or needs resync, getting later, count:' + dirtyIds.length);

        // get folder properties
        let soapResponse = new PromiseSoapResponse(aListener);
        let request = new EwsSoapRequest();
        request.mailbox = aMailbox;
        request.getFolder(soapResponse, aFolder);
        aMailbox.queueRequest(request);
        result = await soapResponse.promise;
        if (result.status != Cr.NS_OK)
          log.warn("failed to get folder properties");
        let folderId = aFolder.folderId;
        if (!folderId.length)
          throw CE("Sync folder id is empty");

        // Let listeners process the folder totals
        if (aListener)
          aListener.onEvent(this, "GotFolder", aFolder, Cr.NS_OK);

        // During initial download, we get in this awful state of downloading
        //  zillions of useless read flag changes. When we get there, we
        //  want to increase the itemsPerSync to max to get it over with.
        //  So keep track of this so we can up it when needed.
        let itemsPerSync = NORMAL_ITEMS_PER_SYNC;
        let syncState = "";
        try {
          dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.getSyncState(aFolder, dsListener);
          result = await dsListener.promise;
          if (result.status != Cr.NS_OK)
            throw CE("Failed to get sync state from datastore");
          syncState = result.data.QueryInterface(Ci.nsISupportsString).data;
          //log.debug('syncState is ' + syncState);
        } catch (e) {log.error(e);}
        if (!syncState.length)
          log.config('Empty sync state');

        // main loop to get and process changes
        for (let itemsPending = true; itemsPending;)
        {
          if (aMailbox.isShutdown)
            throw CE("Mailbox is shutdown");
          // ask the server for a list of changed item ids relative to he current syncState
          result = await promiseChangedItems(aFolder, syncState, itemsPerSync);

          if (result.status != Cr.NS_OK)
          {
            log.warn("syncFolderItemsProperties failed with responseCode " + result.responseCode);
            // handle known errors
            if (result.responseCode == "ErrorInvalidSyncStateData")
            {
              // sync state is corrupt. Reset and try again
              if (syncState.length)
              {
                syncState = "";
                continue;
              }
            }
            break;
          }

          // get dirty and resync items and add those to the list
          // remove any existing items from dirtyIds
          let items = result.items;
          for (let i = 0; i < items.length; i++)
          {
            let itemId = items.queryElementAt(i, Ci.nsISupports).wrappedJSObject.itemId;
            let foundIndex = dirtyIds.indexOf(itemId);
            if (foundIndex != -1)
              dirtyIds.splice(foundIndex, 1);
          }
          for (let dirtyId of dirtyIds)
            items.appendElement(aMailbox.getItem(dirtyId), false);

          let somethingChanged = false;

          // Outer loop called multiple times to gather batches to process. An
          // initial group of batches may add additional items that need to
          // also be processed.
          for (let nextItemToGet = 0; nextItemToGet < items.length;)
          {
            if (aMailbox.isShutdown)
              throw CE("Mailbox is shutdown");
          // Divide the items into batches to process
            let batchIdLists = []; // msqIStringArrays with batches of ids to process
            let syncPromises = []; // list of promises for a particular sync state

            // Inner loop to break items into batches
            while(nextItemToGet < items.length)
            {
              let currentItemIndex = nextItemToGet; // failsafe to prevent infinite loop
              let getChangedIds = new StringArray();

              // accumulate a list of items that we want to update
              let batchClass = "";
              // try to add another item to the batch.
              while ((getChangedIds.length < MAX_ITEMS_TO_GET) && (nextItemToGet < items.length))
              {
                let changedItem = items.queryElementAt(nextItemToGet, Ci.nsISupports).wrappedJSObject;
                // As a kludge, we are going to hold onto the reference for this item
                //  to speed up initial folder loading.
                itemsDeathGrip.appendElement(changedItem, false);

                // Special testing
                if (aMailbox.testType == "ForceFailedItem")
                {
                  log.warn("Simulating invalid item id for testing");
                  changedItem.itemId = "IamInvalidId";
                  aMailbox.testType = "";
                }
                if (aMailbox.testType == "ForceFailedClass")
                {
                  log.warn("Simulating invalid item class for testing");
                  changedItem.itemClass = "IamInvalidClass";
                  aMailbox.testType = "";
                }

                // Are we not in that awful state where only read flags are changing?
                let didNotChange = changedItem.processingFlags & changedItem.DidNotChange;
                if (!somethingChanged && !didNotChange)
                  somethingChanged = true;

                // dirty items are handled one at a time
                if (changedItem.flags & changedItem.Dirty)
                {
                  if (!getChangedIds.length)
                  {
                    log.config('getting dirty item with flags ' +
                               changedItem.flags + ' itemClass ' +
                               changedItem.itemClass + ' in folder ' +
                               aFolder.displayName);
                    getChangedIds.append(changedItem.itemId);
                    nextItemToGet++;
                  }
                  break; // start a new batch
                }

                // skip items that are deleted on the server
                // skip items that don't need properties and did not change
                if ( (!changedItem.needsProperties && didNotChange) ||
                     (changedItem.deletedOnServer))
                {
                  if (changedItem.deletedOnServer)
                    log.info("Item is deleted on server");
                  var promiseItem;
                  // We need properties from the datastore to process the change.
                  if (!changedItem.properties)
                  {
                    let dsListener = new PromiseUtils.DatastoreListener();
                    aMailbox.datastore.getItem(changedItem, dsListener);
                    promiseItem = dsListener.promise;
                  }
                  else
                    promiseItem = Promise.resolve({item: changedItem, status: Cr.NS_OK});

                  syncPromises.push((async () => {
                    try {
                      let result = await promiseItem;
                      if (result.item.EwsNativeItem)
                      {
                        if (aListener)
                          aListener.onEvent(this, "ItemChanged", result.item, Cr.NS_OK);
                      }
                      else
                        log.warning("no item or property list in datastore");
                      return result;
                    } catch (ex) {
                      log.warning("Not reporting item change, listener or properties is null");
                      return {status: Cr.NS_ERROR_FAILURE};
                    }
                  })());
                  nextItemToGet++;
                  continue; // add more items to batch
                }

                // On reindex, we get newOnServer items but we have a body for them!
                try {
                  if (changedItem.flags & changedItem.NewOnServerBit)
                  {
                    if (changedItem.flags & changedItem.HasOfflineBody) {
                      let dsListener = new PromiseUtils.DatastoreListener();
                      aMailbox.datastore.getBody(changedItem, dsListener);
                      result = await dsListener.promise;

                      // If the body is empty, remove the HasOfflineBody flag
                      if (!changedItem.body.length) {
                        log.info("Missing body! We'll try to get it again when needed");
                        changedItem.flags &= ~changedItem.HasOfflineBody;
                      }
                      // Don't keep the body to reduce memory usage
                      changedItem.body = null;
                    }
                  }
                } catch (ex) {
                  log.debug("error in empty body check! " + ex);
                  changedItem.flags &= ~changedItem.HasOfflineBody;
                }

                // we must use a single class for a get
                if (batchClass.length)
                {
                  if (changedItem.itemClass != batchClass)
                    break; // done with batch
                }
                else
                  batchClass = changedItem.itemClass;

                getChangedIds.append(changedItem.itemId);
                nextItemToGet++;
              } // end adding items to batch

              if (getChangedIds.length) // is there anything to get?
                batchIdLists.push(getChangedIds);
              if (currentItemIndex == nextItemToGet) { // did we fail to process a new item?
                log.error("Stopped loop!");
                break;
              }
            }

            // We have the batches defined, start getting
            for (let getChangedIds of batchIdLists)
            {
              log.debug("native machine batch getting " + getChangedIds.length + " items");
              syncPromises.push((async function _taskGetIds() {
                if (aMailbox.isShutdown)
                  throw CE("Mailbox is shutdown");
                let localIds = getChangedIds;
                // If there is any issue getting the items, then I will set the entire list dirty
                // todo: handle offline and other expected server errors
                let soapResponse = new PromiseSoapResponse(aListener);
                let result = {status: Cr.NS_ERROR_FAILURE};
                try {
                  let request = new EwsSoapRequest();
                  request.mailbox = aMailbox;
                  // simulate random missing bodies, see https://exquilla.zendesk.com/tickets/11
                  if ( (aMailbox.testType == "ForceMissingBody") ||
                       ((aMailbox.testType == "FakeMissingBody") && (Math.random() < 0.1)) )
                  {
                    log.warn("Simulating missing body for testing");
                    request.doError = 1;
                    if (aMailbox.testType == "ForceMissingBody")
                      aMailbox.testType = "ForceFailedClass";
                  }
                  request.getChangedItemProperties(soapResponse, aFolder, localIds, getBodies);
                  aMailbox.queueRequest(request);
                  result = await soapResponse.promise;
                  if (result.status != Cr.NS_OK)
                    log.warn("getChangedItemProperties failed");
                }
                catch (e) {
                  e.code = "error-get-changed-item-properties";
                  log.error("Error during getChangedItemProperties", e);
                  result = {status: Cr.NS_ERROR_FAILURE};
                }
                finally {
                  log.debug("nativeMachine getChangedItemProperties result = " + result.status);
                  if (result.status != Cr.NS_OK)
                  {
                    // Something went wrong, so set the whole batch dirty
                    //  (Unless already dirty and online, treat that as deleted)
                    try {
                      for (let i = 0; i < localIds.length; i++)
                      {
                        if (aMailbox.isShutdown)
                          throw CE("Mailbox is shutdown");
                        let dirtyItem = aMailbox.getItem(localIds.getAt(i));

                        if (aMailbox.isOnline && (dirtyItem.flags & dirtyItem.Dirty))
                        {
                          if (soapResponse.responseCode == "ErrorInvalidPropertyRequest" &&
                              dirtyItem.itemClass != "IPM.Item")
                          {
                            log.info("ErrorInvalidPropertyRequest, so try again as a simple item");
                            dirtyItem.itemClass = "IPM.Item";
                            dirtyItem.needsProperties = true;
                            let dsListener = new PromiseUtils.DatastoreListener();
                            aMailbox.datastore.putItem(dirtyItem, dsListener);
                            let result = await dsListener.promise;
                            items.appendElement(dirtyItem, false); // get it this time around
                            // ignore errors
                          }
                          else if (soapResponse.responseCode == "ErrorInvalidChangeKey" && dirtyItem.changeKey.length)
                          {
                            log.info("ErrorInvalidChangeKey, so try again with blank change key");
                            dirtyItem.changeKey = "";
                            dirtyItem.needsProperties = true;
                            let dsListener = new PromiseUtils.DatastoreListener();
                            aMailbox.datastore.putItem(dirtyItem, dsListener);
                            let result = await dsListener.promise;
                            items.appendElement(dirtyItem, false); // get it this time around
                            // ignore errors
                          }
                          else
                          {
                            log.info('marking failed dirty item deletedOnServer');
                            dirtyItem.raiseFlags(dirtyItem.DeletedOnServerBit);
                            if (aListener)
                              aListener.onEvent(this, "ItemChanged", dirtyItem, Cr.NS_OK);
                            else
                              log.warning("Missing listener when reporting ItemChanged");
                            aMailbox.removeItem(dirtyItem); // sync datastore! but only 1 item
                          }
                        }
                        else
                        {
                          log.config('marking failed item dirty with item class ' + dirtyItem.itemClass);
                          dirtyItem.raiseFlags(dirtyItem.Dirty);
                          let dsListener = new PromiseUtils.DatastoreListener();
                          aMailbox.datastore.putItem(dirtyItem, dsListener);
                          let result = await dsListener.promise;
                          items.appendElement(dirtyItem, false); // get it this time around
                          // ignore errors
                        }
                      }
                    } catch(e) { log.config('error in handling getNewItem: ' + e);}
                  }
                  else { // handle special cases, report changed items
                    let batchPromises = [];
                    for (let nextIndexToReport = 0; nextIndexToReport < localIds.length; nextIndexToReport++)
                    {
                      // package a single index into a promise transaction
                      let changedItem = aMailbox.getItem(localIds.getAt(nextIndexToReport));
                      batchPromises.push(promiseProcessItem(changedItem, aGetAttachments, aListener, itemsDeathGrip));
                    }
                    let results = await Promise.all(batchPromises);
                    warnErrors(results, "Failed to process changed item");
                    // Assume that promiseProcessItem takes appropriate action for failures
                  }
                  return ({status: Cr.NS_OK}); // get the next batch
                }
              })());
            } // for batchIdLists

            log.debug("native machine getItemResults syncPromises count is " + syncPromises.length);
            let getItemResults = await Promise.all(syncPromises);
            log.debug("native machine after Promise.all for syncPromises");
            result = warnErrors(getItemResults, "Failed to get new or updated item ");
            syncPromises.length = 0;
          } // end of outer loop allowing processing of additions to items

          // end of sync state processing
          // Are we in that awful state where we download a zillion useless read flag changes?
          itemsPerSync = somethingChanged ? NORMAL_ITEMS_PER_SYNC : MAX_ITEMS_PER_SYNC;
          syncState = aFolder.syncState;
          let dsListener = new PromiseUtils.DatastoreListener();
          aMailbox.datastore.setSyncState(aFolder, syncState, dsListener);
          result = await dsListener.promise;
          if (result.status != Cr.NS_OK)
            log.warn("Failed to persist folder sync state");
          itemsPending = aFolder.syncItemsPending;
        }
      }
      catch (e) {this.machineErrorResponse(aListener, "taskGetNewItems", null, se(e));}
      finally   {
        // we're done so report changes
        try {
          if (aMailbox.activityListener)
            aMailbox.activityListener.onDownloadCompleted(aFolder, messageCount);
        } catch (e) {}
        return (result);
      }
    }
    this.genericMachineDoTask(taskGetNewItems.bind(this), aMailbox, aListener);
  },

  testInitial: function _testInitial(aMailbox, aListener)
  {
    this.genericMachineDoTask(null, aMailbox, aListener);
  },

  // local functions
  dereference: function _dereference() {
    let myIndex = gActiveMachines.indexOf(this);
    if (myIndex != -1)
      gActiveMachines.splice(myIndex, 1);
  },

  stopMachine: function _stopMachine(listener, result) {
    this._activeRequest = null;
    //log.debug("listener is " + listener);
    //log.debug("listener.onEvent is " + listener.onEvent);
    if (listener)
      listener.onEvent( (result && result.item) ? result.item : null,
                         "StopMachine",
                        (result && result.data) ? result.data : null,
                        result ? result.status : Cr.NS_ERROR_FAILURE);
    this.dereference();
  },
  machineErrorResponse: function _machineErrorResponse(aListener, aResponseError, aResponseCode, aMessageText)
  {
    let responseCode = aResponseCode || aResponseError;
    if (responseCode == "ErrorItemNotFound")
    {
      log.info("SOAP error ErrorItemNotFound but not reporting");
      return;
    }
    let responseCodePrimitive = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
    responseCodePrimitive.data = responseCode;
    log.error("machine error: " + aResponseError + " responseCode:" + responseCode + " aMessageText: <" + aMessageText + ">");
    if (aListener) aListener.onEvent(this, "MachineError", responseCodePrimitive, Cr.NS_OK);
  },

};

function oe(result, name, e)
{
  if ((result.status == undefined) || (result.status == Cr.NS_OK))
    result.status = Cr.NS_ERROR_FAILURE;
  if (!result.responseCode)
    result.responseCode = name + "Error";
  log.warn(name + " error: " + se(e));
}

// Return promise to delete deleted occurrences
function promiseDeletedOccurrences(aItem, aMailbox, aListener)
{
  let result = {status: Cr.NS_OK};
  // delete deleted occurrences
  let updates = aItem.localProperties.getPropertyList("Updates");
  if (updates && updates.length)
  {
    let deletedOccurrences = updates.getPropertyList("DeletedOccurrences");
    if (deletedOccurrences && deletedOccurrences.length)
    {
      let soapResponse = new PromiseSoapResponse(aListener);
      let request = new EwsSoapRequest();
      request.mailbox = aMailbox;
      // Failure (NS_ERROR_ALREADY_INITIALIZED) indicates nothing to do
      try { request.deleteDeletedOccurrences(soapResponse, aItem, false);}
      catch (e) { return Promise.resolve(result);}
      aMailbox.queueRequest(request);
      return soapResponse.promise;
    }
  }
  return Promise.resolve(result);
}

// aListener is EwsEventListener
function PromiseSoapResponse(aListener) {
  PromiseUtils.SoapResponse.call(this, aListener);
  this.passwordChanged = false;
}
PromiseSoapResponse.prototype = Object.create(PromiseUtils.SoapResponse.prototype);

PromiseSoapResponse.prototype.errorResponse =
function _errorResponse(aRequest, aResponseError, aResponseCode, aMessageText)
{
  this.responseCode = aResponseCode;
  if (aResponseCode == "ErrorItemNotFound")
  {
    log.debug("SOAP error ErrorItemNotFound but not reporting");
    return;
  }

  // I think that the aResponseError is bogus here, but I leave it to be safe
  if (aResponseError == "PasswordMissing" || aResponseCode == "HtmlStatus401" || aResponseCode == "PasswordMissing")
  {
    log.warn("Password problem, prompting for user name and password");
    let isOK = false;
    try {
      isOK = aRequest.mailbox
                     .promptUsernameAndPassword(Services.ww.activeWindow);
    } catch (e) {log.warning("Error running promptUsernameAndPassword: " + e);}
    if (isOK)
    {
      // signal password changed so that user can rety
      this.passwordChanged = true;
      if (this.listener) {
        this.listener.onEvent(this, "PasswordChanged", null, Cr.NS_OK);
      }
      return;
    }
  }

  log.info("Soap request error: " + aResponseError + " responseCode:" + aResponseCode + " aMessageText: <" + aMessageText + ">");
  PromiseUtils.SoapResponse.prototype.errorResponse.call
    (this, aRequest, aResponseError, aResponseCode, aMessageText);
}

// utility functions
async function promiseChangedItems(aFolder, aSyncState, aItemsPerSync)
{
  // list of changed item ids is returned in result.items, while the
  // update sync state is in aFolder.syncState
  let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  let soapResponse = new PromiseSoapResponse();
  let request = new EwsSoapRequest();
  request.mailbox = aFolder.mailbox;
  request.syncFolderItemsProperties(soapResponse, aFolder, aSyncState, items, aItemsPerSync);
  aFolder.mailbox.queueRequest(request);
  let result = await soapResponse.promise;
  result.items = items;
  return result;
}

async function promiseCheckOnline(aMailbox, aListener)
{
  log.config('taskCheckOnline()');
  let result = {status: Cr.NS_ERROR_FAILURE};
  try {
    let rerun = false;
    do {
      let request = new EwsSoapRequest();
      request.mailbox = aMailbox;
      let soapResponse = new PromiseSoapResponse(aListener);
      request.getOnline(soapResponse);
      aMailbox.queueRequest(request);
      result = await soapResponse.promise;
      rerun = soapResponse.passwordChanged;
      if (rerun)
        log.config("Rerunning checkOnline since password was changed by user");
    } while (rerun);
    if (result.status == Cr.NS_OK) {
      // Check and fix the mailbox version
      // xmlns:h="http://schemas.microsoft.com/exchange/services/2006/types"
      // xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
      // <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
      //   <s:Header>
      //     <h:ServerVersionInfo MajorVersion="14" MinorVersion="3" MajorBuildNumber="158" MinorBuildNumber="1" Version="Exchange2010_SP2"
      try {
        let ServerVersionInfo =  result.request.soapResponse.header.firstElementChild;
        let majorVersion = parseInt(ServerVersionInfo.getAttribute("MajorVersion"), 10);
        let minorVersion = parseInt(ServerVersionInfo.getAttribute("MinorVersion"), 10);
        log.config("Server MajorVersion is " + majorVersion + " MinorVersion is " + minorVersion);
        let serverVersion = "2007sp1";
        // We support Exchange2007SP1 and Exchange2010SP1
        if ( (majorVersion > 14) ||
              (majorVersion == 14 && minorVersion > 0))
          serverVersion = "2010sp1";
        log.config("Using schema for server version " + serverVersion);
        if (serverVersion != aMailbox.serverVersion) {
          log.config("Reloading schema with modified version");
          aMailbox.loadSchema(serverVersion);
        }
      } catch (e) {log.warn("Error " + e + " getting server version");}

      // Beginning with Thunderbird 31, we can support multiple connections in NTLM. Allow.
      if (!!Ci.nsIAsyncStreamCopier2) // This interface was added in Gecko31
      {
        let connectionLimit = Services.prefs.getIntPref("extensions.exquilla.connectionLimit");
        if (connectionLimit < 1) connectionLimit = 1;
        if (connectionLimit > 10) connectionLimit = 10;
        aMailbox.connectionLimit = connectionLimit;
      }
    }
    // We'll try autodiscover once
    if (result.status != Cr.NS_OK && !aMailbox.didAutodiscover)
    {
      log.config("trying autodiscover on mailbox since checkOnline failed");
      aMailbox.didAutodiscover = true;
      result = await promiseAutodiscoverUrl(aMailbox, aListener);
    }

    aMailbox.needOnlineCheck = false;
  }
  catch (e) {oe(result, "taskCheckOnline", e);}
  finally {
    aMailbox.isOnline = (result.status == Cr.NS_OK);
    return (result);
  }
}

async function promiseInitial(aMailbox, aListener)
{
  let result = {status: Cr.NS_OK};
  try {
    do {
      if (aMailbox.needOnlineCheck)
      {
        log.config("mailbox needs online check");
        result = await promiseCheckOnline(aMailbox, aListener);
      }

      if (result.status != Cr.NS_OK)
        break;

      if (aMailbox.needFolderDiscovery)
      {
        log.config("mailbox needs Folder Discovery");
        result = await promiseGetDistinguishedIds(aMailbox, aListener);
        if (result.status != Cr.NS_OK)
          break;

        let nativeRootFolder = aMailbox.getDistinguishedNativeFolder("msgfolderroot");
        result = await promiseDiscoverSubfolders(aMailbox, nativeRootFolder, aListener);
        if (result.status != Cr.NS_OK)
          break;
      }
      // If we get here (even doing nothing) then all is OK
      result.status = Cr.NS_OK;

    } while (false);
  }
  catch (e) {oe(result, "taskInitial", e);}
  finally   {return (result);};
}

async function promiseGetDistinguishedIds(aMailbox, aListener)
{
  log.config('taskGetDistinguishedIds()');
  let result = {status: Cr.NS_ERROR_FAILURE};
  try {
    let folders = [];
    for (let id of gDistinguishedIds)
      folders.push(aMailbox.getNativeFolder(id));

    let soapResponse = new PromiseSoapResponse(aListener);
    let request = new EwsSoapRequest();
    request.mailbox = aMailbox;
    request.getFolders(soapResponse, folders);
    aMailbox.queueRequest(request);
    result = await soapResponse.promise;

    log.debug('taskGetDistinguishedIds result.status is  ' + result.status);
    if (result.status == Cr.NS_ERROR_NOT_AVAILABLE)
    {
      log.warn("One or more distinguished folders missing but continuing");
      result.status = Cr.NS_OK;
    }

  }
  catch (e) {oe(result, "taskGetDistinguishedIds", e);}
  finally {
    log.debug("taskGetDistinguishedIds finally with status " + result.status);
    if (result.status == Cr.NS_OK)
      aMailbox.needFolderDiscovery = false;
    return (result);
  }
}

// ToDo: add the discover folders processing
/*
function taskDiscoverFolders(aMailbox, aListener)
{
  log.debug('taskDiscoverFolders()');
  let result = {status: Cr.NS_ERROR_FAILURE};
  try {
    let soapResponse = new PromiseSoapResponse(aListener);
    let request = new EwsSoapRequest();
    request.mailbox = aMailbox;
    let nativeRootFolder = aMailbox.getDistinguishedNativeFolder("msgfolderroot");
    request.discoverSubfolders(soapResponse, nativeRootFolder, 5000, 0);
    aMailbox.queueRequest(request);
    result = await soapResponse.promise;
    log.debug('taskDiscoverFolders result.status is  ' + result.status);
  }
  catch (e) {oe(result, "taskDiscoverFolders", e);}
  finally {return (result);}
}
*/

// recheck autodiscover to try to find an online url
async function promiseAutodiscoverUrl(aMailbox, aEventListener)
{
  let result = {status: Cr.NS_ERROR_FAILURE};
  try {
    result = await PromiseUtils.promiseAutodiscover(aMailbox.email.length ? aMailbox.email : aMailbox.username,
              aMailbox.username, aMailbox.domain, aMailbox.password, false, domWindow(), null);

    if (result.foundSite)
    {
      // test each possible ews url to see if it is valid
      let urls = [ result.ewsUrl, result.internalEwsUrl, result.ewsOWAGuessedUrl ];
      // todo: the test
      let oldUrl = aMailbox.ewsUrl;
      for (let url of urls)
      {
        aMailbox.ewsURL = url;
        result = await promiseCheckOnline(aMailbox, aEventListener);

        log.config('promiseAutodiscoverUrl checkOnline result is ' + result.status);
        if (result.status == Cr.NS_OK)
        {
          log.debug("using ewsUrl from autodiscover");
          break;
        }
      }
      if (result.status != Cr.NS_OK)
      {
        log.info("autodiscover could not find a valid ews url");
        aMailbox.ewsURL = oldUrl;
      }
    }
  }
  catch (e) {oe(result, "taskAutodiscoverUrl", e);}
  finally   {return (result);}
}

async function promiseDiscoverSubfolders(aMailbox, aFolder, aListener)
{
  let result = {status: Cr.NS_ERROR_FAILURE};
  try
  {
    log.config('taskDiscoverSubfolders()');
    let subfolderIds = new StringArray();
    if (aFolder.folderId.length)
    {
      try {
        // mark existing folders unverified
        aMailbox.allFolderIds(aFolder.folderId, subfolderIds);
        for (let index = 0; index < subfolderIds.length; index++)
          aMailbox.getNativeFolder(subfolderIds.getAt(index))
                  .verifiedOnline = false;
      } catch (e) {} // can fail if no folders yet exist
    }

    let batchSize = 100;
    let lastItem = false;
    let offset = 0;
    while (!lastItem)
    {
      let soapResponse = new PromiseSoapResponse(aListener);
      let request = new EwsSoapRequest();
      request.mailbox = aMailbox;
      request.discoverSubfolders(soapResponse, aFolder, batchSize, offset);
      offset += batchSize;
      aMailbox.queueRequest(request);
      result = await soapResponse.promise;

      if (result.status != Cr.NS_OK)
      {
        // Discover failed, so we are not going to take any action. Reverse
        // clearing verifiedOnline, and fail.
        try {
          aMailbox.allFolderIds(aFolder.folderId, subfolderIds);
          for (let index = 0; index < subfolderIds.length; index++)
            aMailbox.getNativeFolder(subfolderIds.getAt(index))
                    .verifiedOnline = true;
        }
        catch (e) {} // can fail if no folders yet exist
        throw "discoverSubfolders failed";
      }
      else
      {
        aFolder.verifiedOnline = true;

        // parse the RootFolder attributes. These are an attribute group, which is not
        // handled by webservices, so parse the DOM
        let rootFolderElement =
          request.soapResponse
                 .envelope
                 .getElementsByTagNameNS(
                   "http://schemas.microsoft.com/exchange/services/2006/messages",
                   "RootFolder")[0];
        lastItem = !(rootFolderElement.getAttribute("IncludesLastItemInRange") == "false");
      }
    }

    let oldLength = subfolderIds.length;
    for (let indexp1 = oldLength; indexp1 != 0; indexp1--)
    {
      let folder = aMailbox.getNativeFolder(subfolderIds.getAt(indexp1 - 1));
      if (!folder.verifiedOnline)
        aMailbox.removeFolderFromCache(subfolderIds.getAt(indexp1 - 1));
    }

    // replace the existing list of subfolder ids with the new one.
    // XXX todo: It seems like I should be also reporting changes here?
    aMailbox.updateSubfolderIds();
  }
  catch (e) {oe(result, "genDiscoverSubfolders", e);}
  finally   {return (result);}
}

// Process a changed item from getNewItems
async function promiseProcessItem(aChangedItem, aGetAttachments, aListener, aItemsDeathGrip)
{ let result = {status: Cr.NS_OK};
  try {
    let mailbox = aChangedItem.mailbox;
    let folder = mailbox.getNativeFolder(aChangedItem.folderId);
    let properties = aChangedItem.properties;
    let itemClass = aChangedItem.itemClass;
    let isDeleted = aChangedItem.flags & (aChangedItem.DeletedBit | aChangedItem.DeletedOnServerBit);

    // Test failure, simulate errors on the second item
    if (mailbox.testType == "FailInMachineReporting")
    {
      mailbox.testType = "";
      throw("Simulated indexToReport failure");
    }

    // If this item is a distribution list, we also have to get its expansion
    if (itemClass.indexOf("IPM.DistList") == 0)
    {
      let soapResponse = new PromiseSoapResponse(aListener);
      let request = new EwsSoapRequest();
      request.mailbox = mailbox;
      request.expandDL(soapResponse, aChangedItem);
      mailbox.queueRequest(request);
      result = await soapResponse.promise;
      if (result.status != Cr.NS_OK)
        log.warn("expandDL failed");
    }

    if ( (itemClass.indexOf("IPM.Appointment") == 0) ||
         (itemClass.indexOf("IPM.Task") == 0) )
    {
      do
      {
        if (properties || !properties.length)
        {
          log.warn("calendar item has no properties");
          break;
        }
        // If this is a recurring master, then we must also get occurrence items
        let calendarItemType = properties.getAString("CalendarItemType");
        if (calendarItemType != "RecurringMaster")
          break;
        // get occurrences
        let modifiedOccurrences = properties.getPropertyList("ModifiedOccurrences");
        if (!modifiedOccurrences || !modifiedOccurrences.length)
          break;
        let occurrences = modifiedOccurrences.getPropertyLists("Occurrence");
        if (!occurrences)
          break;
        log.debug("Getting " + occurrences.length + " occurrences for a recurring master");
        for (let occurrence of occurrences)
        {
          if (!occurrence)
          {
            log.warn("occurrence is not a property list");
            continue;
          }
          let itemId = occurrence.getAString("ItemId/$attributes/Id");
          let originalStart = occurrence.getAString("OriginalStart");
          // For normal items (that is that have a real native folder), the change bits
          //  are set in the folder sync. We don't do a folder sync of occurrences, so we
          //  have to manage those bits manually here.
          let occurrenceItem = mailbox.getExItem(itemId, aChangedItem.parentId, originalStart);
          if (!occurrenceItem)
          {
            log.warn("Could not get occurrence item with originalStart of " + originalStart);
            continue;
          }
          aItemsDeathGrip.appendElement(occurrenceItem, false);
          if (occurrenceItem.properties)
            occurrenceItem.updatedOnServer = true;
          else
            occurrenceItem.newOnServer = true;
          // Apparently the change key for occurrences is the same as the change key for
          //  the recurring item, so you cannot tell which exception changed, and you
          //  have to get all of them :(
          mailbox.changeItemId(occurrenceItem, itemId);
          occurrenceItem.folderId = aChangedItem.folderId;
          occurrenceItem.itemClass = "IPM.OLE.CLASS.{00061055-0000-0000-C000-000000000046}";
          // get and persist the occurrence item
          let soapResponse = new PromiseSoapResponse(aListener);
          let request = new EwsSoapRequest();
          request.mailbox = mailbox;
          request.getChangedItemProperties(soapResponse, folder, getChangedIds, false);
          mailbox.queueRequest(request);
          result = await soapResponse.promise;
          if (result.status != Cr.NS_OK)
            log.warn("syncFolderItemsProperties failed");
          else
          {
            let dsListener = new PromiseUtils.DatastoreListener();
            mailbox.datastore.putItem(occurrenceItem, dsListener);
            result = await dsListener.promise;
            if (result.status != Cr.NS_OK)
              log.warn("Could not persist occurrence item");
          }
        }
      } while (false);
    } // if appointment or task

    // persist the expansion list
    if (itemClass.indexOf("IPM.DistList") == 0)
    {
      let dsListener = new PromiseUtils.DatastoreListener();
      if (isDeleted)
        mailbox.datastore.deleteDlExpansion(aChangedItem, dsListener);
      else
        mailbox.datastore.putDlExpansion(aChangedItem, dsListener);
      result = await dsListener.promise;
      if (result.status != Cr.NS_OK)
        log.warn("datastore error in DLExpansion");
    }

    // get any attachments if needed
    if (aGetAttachments)
    {
      for (let index = 0; index < aChangedItem.attachmentCount; index++)
      {
        try {
          let attachment = aChangedItem.getAttachmentByIndex(index);
          let listener = new PromiseUtils.MachineListener();
          mailbox.getAttachmentContent(attachment, listener);
          let result = await listener.promise;
          if (result.status != Cr.NS_OK)
            log.warn("Failed to download attachment");
        } catch (e) {log.warn("Failed to download attachment");}
      }
    }

    if (aListener)
      aListener.onEvent(null, "ItemChanged", aChangedItem, Cr.NS_OK);
    else
      log.warn("Missing listener when reporting ItemChanged");

    // After the items have been reported, then at least in theory the skink
    // representation should match the server representation, and the ..onServer
    // flags may be cleared.
    aChangedItem.clearFlags(aChangedItem.AllOnServer);

    // now persist the changes
    if (isDeleted)
    {
      // todo: the RemoveItem deletes from datastore sync. This is probably causing a UI lock on large deletes!
      mailbox.removeItem(aChangedItem);
    }
    else if (properties && properties.length)
    {
      if (!(aChangedItem.flags & aChangedItem.Dirty) &&
           aChangedItem.processingFlags & aChangedItem.DidNotChange)
      {
        // C++ does not do the put, let me warn to see if this happens
        log.info("Not persisting item because it did not change")
      }
      else
      {
        // We need to persist the body of types where it is available, but
        //  not stored in the properties.
        let hasBodyProperty = folder.itemHasBodyProperty(itemClass);
        if (!hasBodyProperty && !aChangedItem.isBodyEmpty)
        {
          // persist the body in the datastore
          log.debug("Persisting the body in the datastore");
          let dsListener = new PromiseUtils.DatastoreListener();
          mailbox.datastore.putBody(aChangedItem, dsListener);
          result = await dsListener.promise;
        }
        if (result.status != Cr.NS_OK)
          log.warn("Could not persist changed item body");
        if (aChangedItem.flags & aChangedItem.Dirty)
          aChangedItem.clearFlags(aChangedItem.Dirty);
        let dsListener = new PromiseUtils.DatastoreListener();
        mailbox.datastore.putItem(aChangedItem, dsListener);
        result = await dsListener.promise;
        if (result.status != Cr.NS_OK)
          log.warn("Could not persist changed item");
      }
    }
    else
      log.warn("changed item has no properties");
  }
  catch (e) {log.error(CE(e));}
  finally   {return (result);}
}

function taskInvalid(aMailbox, aMachine)
{
  throw new CE("taskInvalidError", Cr.NS_ERROR_FAILURE);
}

/**
 * Detect whether a value is a generator.
 */
function isGenerator(aValue) {
  return Object.prototype.toString.call(aValue) == "[object Generator]";
}

// Report errors from an array of results
function warnErrors(aResults, aMessage) {
  for (let result of aResults) {
    if (result.status != Cr.NS_OK) {
      log.warn(aMessage);
      return result;
    }
  }
  return {status: Cr.NS_OK};
}
