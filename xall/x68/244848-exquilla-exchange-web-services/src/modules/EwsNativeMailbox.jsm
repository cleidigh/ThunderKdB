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

const EXPORTED_SYMBOLS = ["EwsNativeMailbox"];

var Cu = Components.utils;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("native");
  return _log;
});

ChromeUtils.defineModuleGetter(this, "Services",
                               "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "OAuth2Login",
                               "resource://exquilla/EwsOAuth2.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeMachine",
                               "resource://exquilla/EwsNativeMachine.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeItem",
                               "resource://exquilla/EwsNativeItem.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeFolder",
                               "resource://exquilla/EwsNativeFolder.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeService",
                               "resource://exquilla/EwsNativeService.jsm");
ChromeUtils.defineModuleGetter(this, "EwsDataStore",
                               "resource://exquilla/datastore.js");

// used to distinguish regular from distinguished folder ids
const MAX_DISTINGUISHED_LENGTH = 14

function EwsNativeMailbox() {
  // cache of EwsNativeFolder objects, referenced by folder ID.
  // Entries are added both for plain folder id, and for distinguished
  // folder id (if it exists).
  this._folders = new Map();
  this._items = new Map();
  this._eventListeners = [];

  // initializations
  this._needFolderDiscovery = true;
  this._isOnline = false;
  this._needOnlineCheck = true;
  this._didAutodiscover = false;
  this._connectionLimit = 1;
  this._shutdown = false;
  this._serverVersion = "2007sp1";
  this._requestQueue = [];
  this._domain = "";
  this._email = "";
  this._username = "";
  this._password = "";
  this._authMethod = Ci.nsMsgAuthMethod.anything;
  this._serverURI = "";
  this._rootFolderId = "";
  this._datastoreDirectory = null;
  this._datastore = null;
  this._attachmentsDirectory = null;
  this._soapLogFile = null;
  this._soapLogStream = null;
  this._activityListener = null;
  this._ewsURL = "";
  this._testType = 0;

  this._oAuth2Login = new OAuth2Login(this);
}

EwsNativeMailbox.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },

  // Used to identify this as an EwsNativeMailbox
  get EwsNativeFolder() {
    return this;
  },

  QueryInterface: ChromeUtils.generateQI([Ci.nsISupportsWeakReference]),

  get username()  { return this._username;},
  set username(a) { this._username = a;},

  get domain()  { return this._domain;},
  set domain(a) {
    if (a != this._domain) {
      this._domain = a;
      // only used in testing
      this._postEvent("DomainChange", null, Cr.NS_OK);
    }
  },

  get password() {
    if (!this._password) {
      // try to find the password in the password manager
      let domainAndUser = "";
      if (this.domain)
        domainAndUser = this.domain + "\\";
      domainAndUser += this.username;

      // parse the serverURI to reconstruct the uri expected by the login manager
      let uriObject = newParsingURI(this.serverURI);
      let loginURI = "https://" + uriObject.host;
      log.debug("NativeMailbox get password for username " + this.username +
                " loginURI " + loginURI);
      let foundLogins = Services.logins.findLogins(loginURI, null, loginURI);
      for (let login of foundLogins) {
        if (login.username == domainAndUser) {
          if (login.password)
            this._password = login.password;
          break;
        }
      }
    }
    return this._password;
  },
  set password(a) { this._password = a;},

  get authMethod()  { return this._authMethod; },
  set authMethod(a) { this._authMethod = a; },

  get serverURI()  { return this._serverURI;},
  set serverURI(a) { this._serverURI = a;},

  get ewsURL()  { return this._ewsURL;},
  set ewsURL(a) { this._ewsURL = a;},

  get email()  { return this._email;},
  set email(a) { this._email = a;},

  get testType()  { return this._testType;},
  set testType(a) { this._testType = a;},

  get rootFolderId()  { return this._rootFolderId;},
  set rootFolderId(a) { this._rootFolderId = a;},

  get oAuth2Login() { return this._oAuth2Login; },

  promptUsernameAndPassword(domWindow) {
    this._checkShutdown();

    let domainAndUser = "";
    if (this.domain)
      domainAndUser += this.domain + "\\";
    domainAndUser += this.username;
    log.debug("NativeMailbox.promptUsernameAndPassword for username " + domainAndUser);

    // parse the uri to get the host expected by the login manager
    let uri = newParsingURI(this.serverURI);

    let login = Cc["@mozilla.org/login-manager/loginInfo;1"]
                  .createInstance(Ci.nsILoginInfo);
    login.init("https://" + uri.host, null, "https://" + uri.host, domainAndUser, this.password, "", "");

    let nativeService = new EwsNativeService();
    let aOK = nativeService.promptUsernameAndPassword(domWindow, login);
    if (aOK)
    {
      domainAndUser = login.username;
      log.info("PromptUsernameAndPassword returned " + domainAndUser);
      // parse out a domain name, if any
      let pos = domainAndUser.indexOf("\\");
      if (pos < 0) // no separate domain
      {
        this.domain = "";
        this.username = domainAndUser;
      }
      else
      {
        this.domain = domainAndUser.substring(0, pos);
        this.username = domainAndUser.substring(pos + 1);
      }
      this.password = login.password;
      this._postEvent("CredentialsChange", null, Cr.NS_OK);
    }
    return aOK;
  },

  get needFolderDiscovery()  { return this._needFolderDiscovery;},
  set needFolderDiscovery(a) { this._needFolderDiscovery = a;},

  get datastoreDirectory() { return this._datastoreDirectory;},
  set datastoreDirectory(datastoreDirectory) {
    this._checkShutdown();
    if (this._datastoreDirectory)
      throw CE("Cannot set datastore directory because the datastore is open", Cr.NS_ERROR_FAILURE);

    this._datastoreDirectory = datastoreDirectory;
    this._datastore = new EwsDataStore();
    this._datastore.open(datastoreDirectory);

    // set the attachments directory relative to the datastore directory
    this._attachmentsDirectory = datastoreDirectory.clone();
    this._attachmentsDirectory.append("mailbox-attachments");
    if (!this._attachmentsDirectory.exists())
      this._attachmentsDirectory.create(Ci.nsIFile.DIRECTORY_TYPE, 0o700);
  },

  get attachmentsDirectory() { 
    if (this._attachmentsDirectory)
      return this._attachmentsDirectory.clone();
    return null;
  },

  get soapLogFile() { return this._soapLogFile;},
  set soapLogFile(file) {
    this._soapLogFile = file;
    if (this._soapLogStream)
      this._soapLogStream.close();
    this._soapLogStream = null;
    if (file) {
      let fileStream = Cc["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Ci.nsIFileOutputStream);
      fileStream.init(file, -1, 0o600, 0);
      this._soapLogStream = Cc["@mozilla.org/intl/converter-output-stream;1"]
                              .createInstance(Ci.nsIConverterOutputStream);
      this._soapLogStream.init(fileStream, null, 0, "?");
    }
  },

  writeToSoapLog(aText) {
    try {
      if (this._soapLogStream) {
        let isSuccess = this._soapLogStream.writeString(aText);
      }
    }
    // just ignore logging errors
    catch (ex) {}
  },

  get activityListener()  { return this._activityListener;},
  set activityListener(a) { this._activityListener = a;},

  get datastore() { return this._datastore;},

  get isOnline()  { return this._isOnline;},
  set isOnline(a) { this._isOnline = a;},

  get needOnlineCheck()  { return this._needOnlineCheck;},
  set needOnlineCheck(a) { this._needOnlineCheck = a;},

  get didAutodiscover() { return this._didAutodiscover;},
  set didAutodiscover(a) { this._didAutodiscover = a;},

  get connectionLimit()  { return this._connectionLimit;},
  set connectionLimit(a) { this._connectionLimit = a;},

  getNativeFolder(aId) {
    let folder;
    if (aId)
      folder = this._folders.get(aId);

    if (!folder) {
      folder = new EwsNativeFolder();
      folder.mailbox = this;
      if (aId) {
        if (aId.length > MAX_DISTINGUISHED_LENGTH)
          folder.folderId = aId;
        else
          folder.distinguishedFolderId = aId;
      }
      this.ensureCached(folder);
    }
    return folder;
  },

  getNativeFolderFromCache(aFolderId) {
    let folder = this._folders.get(aFolderId);
    return (folder || null);
  },

  ensureCached(folder) {
    folder = folder.wrappedJSObject;
    for (let idType of ["folderId", "distinguishedFolderId"]) {
      let id = folder[idType];
      if (id) {
        let cachedFolder = this._folders.get(id);
        if (cachedFolder)
          cachedFolder = cachedFolder.wrappedJSObject;
        if (cachedFolder !== folder) {
          if (cachedFolder) {
            if (folder.distinguishedFolderId)
              log.warn("caching different folder by FolderId, existing folder uncached for distinguishedId " + folder.distinguishedFolderId);
            else
              log.warn("caching different folder by FolderId, existing folder uncached for name " + folder.displayName);
            cachedFolder[idType] = "";
          }
        this._folders.set(id, folder);
        }
      }
    }
    folder.mailbox = this;
  },

  clearCache() {
    this._folders.clear();
  },

  removeFolderFromCache(folderId) {
    this._folders.delete(folderId);
  },

  getDistinguishedNativeFolder(aId) { return this.getNativeFolder(aId);},

  setNativeFolderId(aNativeFolder, aFolderId) {
    if (!aFolderId) {
      throw CE("Can't set a blank folderId");
    }
    aNativeFolder.folderId = aFolderId;
  },

  updateSubfolderIds() {
    // clear the subfolder ids for all folders
    this._folders.forEach(folder => {
      if (folder.subfolderIds)
        folder.subfolderIds.clear();
    });

    // add each folder's id to the subfolderIds of its parent
    this._folders.forEach( (folder, key, map) => {
      // we only want to add the real id
      if (key.length <= MAX_DISTINGUISHED_LENGTH)
        return;

      let parentFolderId = folder.parentFolderId;
      if (parentFolderId) {
        let parentFolder = map.get(parentFolderId);
        if (parentFolder) {
          parentFolder.subfolderIds.append(key);
        }
      }
    });
  },

  getItem(aItemId) {
    return this.getItemAsync(aItemId, null);
  },

  getItemAsync(aItemId, aListener) {
    function GetItemListener() {
      // States.
      //
      //   Initial: getting properties
      //   GetProperties: getting properties, need to check for additional processing

      //   SaveDirty: persisting dirty flag
      //   GetDL: getting expansion list.
      //
      this._state = "Initial";
    }

    GetItemListener.prototype.getItem = function(mailbox) {
      log.debug("native mailbox GetItemListener.getItem");
      this._state = "GetProperties";
      this._mailbox = mailbox;

      let item = null;
      if (aItemId)
        item = mailbox.getItemFromCache(aItemId);
      if (item) {
        // We can assume that an item in the cache already has its properties, so
        // simulate a return from getItem for post properties processing.
        return this.onEvent(item, "FakeStatementComplete", null, Cr.NS_OK);
      }

      // We did not get the item from the cache, need to create.
      item = new EwsNativeItem();
      item.mailbox = mailbox;
      if (aItemId) {
        item.itemId = aItemId;
        mailbox._items.set(aItemId, item);
      }
      else {
        // a new item has no item id, nothing else to do.
        if (aListener)
          return dispatchOnEvent(aListener, item, "OnDone", null, Cr.NS_OK);
        return item;
      }

      // We have a new item with an itemId, needs its properties.
      if (aListener)
        return mailbox.datastore.getItem(item, this);
      mailbox.datastore.getItem(item, null);
      return this.onEvent(item, "FakeStatementComplete", null, Cr.NS_OK);
    }

    GetItemListener.prototype.onEvent = function(aItem, aEvent, aData, aResult) {
      let item = aItem;
      if (aEvent != "StatementComplete" && aEvent != "FakeStatementComplete") {
        // unprocessed event
        return;
      }

      switch (this._state)
      {
        case "SaveDirty":
        {
          // dirty item, nothing more to do.
          if (aListener)
            return dispatchOnEvent(aListener, item, "OnDone", null, Cr.NS_OK);
          return item;
        }

        case "GetProperties":
        {
          // StatementComplete is a return from the datastore. If the item still has no
          // properties, mark it dirty.
          if (aEvent == "StatementComplete" &&
             (!item.properties || !item.properties.length) &&
             (!(item.flags & (item.Dirty | item.NeedsResync))) &&
             (item.folderId))
          {
            log.info("Item has no properties, marking dirty");
            this._state = "SaveDirty";
            item.raiseFlags(item.Dirty);
            if (aListener)
              return this._mailbox.datastore.putItem(item, this);
            this._mailbox.datastore.putItem(item, null);
            // dirty item, nothing more to do.
            return item;
          }

          // distribution lists have a separate storage for their expansions.
          if (item.itemClass.startsWith("IPM.DistList")) {
            this._state = "GetDL";
            if (aListener)
              return this._mailbox.datastore.getDlExpansion(item, this);
            this._mailbox.datastore.getDlExpansion(item, null);
          }
          // fall through to end processing in "GetDL"
        }

        case "GetDL":
        {
          // process return
          if (aListener)
            return dispatchOnEvent(aListener, item, "OnDone", null, Cr.NS_OK);
          return item;
        }
      }

      log.error("Unexpected state: " + this._state);
      if (aListener)
        return dispatchOnEvent(aListener, aItem, "OnDone", null, Cr.NS_ERROR_UNEXPECTED);
      return null;
    }

    // beginning of GetItemAsync code
    let getItemListener = new GetItemListener();
    let item = getItemListener.getItem(this);
    if (!aListener)
      return item;
  },

  // WARNING: copied from C++ without testing
  getExItem(aItemId, aParentItemId, aOriginallStart) { 
    // We sometimes get, for unknown reasons, errors about a missing item
    //  property list (bug 566). To try to work this, if the property list
    //  of the cached item is missing, we will update the item from the datastore.

    let item;
    if (aItemId)
      item = this.getItemFromCache(aItemId);

    let exItemId = "";

    if (aParentItemId && aOriginalStart)
    {
      exItemId = aParentItemId + "?OriginalStart=" + aOriginalStart;
      if (!item)
      {
        //EWS_LOG_DEBUG_TEXT16("item not found by itemId, checking exItemId", exItemId.get());
        item = this.getItemFromCache(exItemId);
      }
      // Should I be checking if cached by exitemid anyway here?
    }

    let properties;
    if (item)
    {
      log.debug("Item found in cache");
      properties = item.properties;
    }
    else
    {
      log.debug("item not found in cache");
      let itemId = aItemId ||
                   Cc("@mozilla.org/uuid-generator;1")
                   .getService(Ci.nsIUUIDGenerator)
                   .generateUUID();

      item = new EwsNativeItem();
      item.mailbox = this;
      item.itemId = itemId;
      if (!aItemId)
        item.raiseFlags(item.HasTempId);
      item.parentId = aParentItemId;
      item.originalStart = aOriginalStart;

      // add the item to the cache
      this._items.put(itemId, item.wrappedJSObject);
      if (exItemId)
      {
        this._items.put(exItemId, item.wrappedJSObject);
      }
    }

    /// XXX todo: remove the item from the cache using original ID if present

    if (!properties && this._datastore)
    {
      //printf("getting item from datastore\n");
      this._datastore.getItem(item, null);
    }
    //else
    //  printf("using empty item properties is <%lx> mDatastore is <%lx> itemId is <%S>\n", properties, mDatastore, nsString(aItemId).get());

    return item;
  },

  getItemFromCache(aItemId) {
    let item = this._items.get(aItemId);
    return (item || null);
  },

  createItem(aItemId, aItemClass, aNativeFolder) {
    let item = this.getItem(aItemId);
    if (aItemClass)
      item.itemClass = aItemClass;

    if (aNativeFolder)
      item.folderId = aNativeFolder.folderId || aNativeFolder.distinguishedFolderId;

    if (aItemId)
      this.ensureItemCached(item);
    return item;
  },

  removeItem(aNativeItem) { 
    log.debug("msqEwsNativeMailbox::RemoveItem");

    // remove any cached versions of item attachments
    let attachmentCount = aNativeItem.attachmentCount;
    for (let index = 0; index < attachmentCount; index++)
    {
      let nativeAttachment = aNativeItem.getAttachmentByIndex(index);
      if (nativeAttachment)
        aNativeItem.removeAttachment(nativeAttachment);
    }

    if (!(aNativeItem.processingFlags & aNativeItem.DeletedInDatastore))
    {
      this._datastore.deleteBody(aNativeItem, null);
      this._datastore.deleteItem(aNativeItem, null);
    }

    this.removeItemFromCache(aNativeItem.itemId);
  },

  shutdown() {
    this._shutdown = true;
    this.clearCache();
    if (this._soapLogStream)
      this._soapLogStream.close();
    // Now we use AsyncShutdown to close the database
    //if (this._datastore)
    //  this._datastore.asyncClose(null);
    //this._datastore = null;
  },

  get isShutdown() { return this._shutDown;},

  removeItemFromCache(aItemId) {
    if (this._items.has(aItemId))
      this._items.delete(aItemId);
  },

  ensureItemCached(aNativeItem) {
    if (!aNativeItem.itemId)
      throw CE("Native item has no item id", Cr.NS_ERROR_NOT_INITIALIAZED);

    // try to find by item id
    let cachedByItemId = this.getItemFromCache(aNativeItem.itemId);

    // try to find by exItemId
    let exItemId = aNativeItem.parentFolderId;
    let cachedByExItemId = null;
    if (exItemId) {
      if (aNativeItem.originalStart) {
        exItemId += "?OriginalStart=" + aNativeItem.originalStart;
        cachedByExItemId = this.getItemFromCache(exItemId);
        // 
      }
      else
        exItemId = "";
    }

    if (cachedByItemId && aNativeItem &&
       (cachedByItemId.wrappedJSObject !== aNativeItem.wrappedJSObject))
      log.warn("caching different item by item id, existing item uncached");
    if (cachedByExItemId && aNativeItem &&
       (cachedByExItemId.wrappedJSObject !== aNativeItem.wrappedJSObject))
      log.warn("caching different item by exItemId, existing item uncached");

    // update if needed item in cache
    if (!cachedByItemId)
      this._items.set(aNativeItem.itemId, aNativeItem.wrappedJSObject);
    if (!cachedByExItemId && exItemId)
      this._items.set(exItemId, aNativeItem.wrappedJSObject);

    // remove any references to the item by a previous id
    if (aNativeItem.previousId && (aNativeItem.previousId != aNativeItem.itemId)) {
      let previousItem = this.getItem(aNativeItem.previousId);
      // The previous implementation had this, but it is a delete which makes
      // no sense.
      //if (this._datastore) {
      //  this._datastore.deleteBody(previousItem, null);
      //  this._datastore.deleteItem(previousItem, null);
      //}
      this.removeItemFromCache(aNativeItem.previousId);
      aNativeItem.previousId = "";
    }
  },

  changeItemId(aNativeItem, aNewItemId) {
    log.debug("changeItemId");
    let oldItemId = aNativeItem.itemId;
    aNativeItem.itemId = aNewItemId; // note this adjusts mailbox cache
    if (this._datastore) {
        // we ignore errors, as maybe these items don't exist
      try {this._datastore.changeIdMeta(oldItemId, aNewItemId, null);}
      catch (e) {log.warn(e);}
      try {this._datastore.changeIdBody(oldItemId, aNewItemId, null);}
      catch (e) {log.warn(e);}
      try {this._datastore.changeIdDl(oldItemId, aNewItemId, null);}
      catch (e) {log.warn(e);}
    }
  },

  changedOnFolderIds(aFolderId, aListener) { 
    this._datastore.changedOnFolder(aFolderId, aListener);
  },

  needsPropertiesIds(aNativeFolder) {
    let sa = new StringArray();
    for (let entry of this._items) {
      //let item = entry[1];
      if (entry[1].needsProperties)
        sa.append(entry[0]);
    }
    return sa;
  },

  allIds(aFolderId, aListener) {
    let machine = new EwsNativeMachine();
    machine.allIds(this, aListener, aFolderId);
  },

  allCachedIds(aFolderId) {
    let sa = new StringArray();
    for (let entry of this._items) {
      if (aFolderId == entry[1].folderId)
        sa.append(entry[0]);
    }
    return sa;
  },

  /// array of all folder ids (deep traversal) for a folder from folder cache
  allFolderIds(aParentFolderId, aFolderIds) {
    let parentFolder = this.getNativeFolderFromCache(aParentFolderId);
    if (!parentFolder) {
      log.warn("Parent folder not found in cache");
      return;
    }

    let idsArray = parentFolder.subfolderIds;
    if (idsArray)
    {
      for (let i = 0; i < idsArray.length; i++)
      {
        let folderId = idsArray.getAt(i);
        aFolderIds.append(folderId);
        // Also append the subfolder's subfolders
        this.allFolderIds(folderId, aFolderIds);
      }
    }
  },

  loadSchema(aServerVersion) {
    this._serverVersion = aServerVersion;
  },

  get serverVersion() {
    return this._serverVersion;
  },

  get typeNamespace() { return "http://schemas.microsoft.com/exchange/services/2006/types";},
  get messageNamespace() { return "http://schemas.microsoft.com/exchange/services/2006/messages";},

  persistItem(aItem, aEventListener) {
    this._checkShutdown();
    this._datastore.putItem(aItem, aEventListener);
  },

  /// queue a soap request. If the request is null, sends any existing requests
  queueRequest(aRequest) {
    try {
      this._checkShutdown();
    }
    catch (ex) {
      // if shutting down, stop queueing requests
      dump("Mailbox shutting down, stop queueing requests\n");
      return;
    }
    if (aRequest) {
      if (aRequest.requestName == "GetOnline")
        this._requestQueue.unshift(aRequest);
      else
        this._requestQueue.push(aRequest);
    }

    // count active requests
    let activeRequests = 0;
    for (let request of this._requestQueue) {
      if (request.inProgress)
        activeRequests++;
    }

    // invoke any pending requests up to connection limit
    for (let request of this._requestQueue) {
      if (activeRequests >= this.connectionLimit)
        break;
      if (request.inProgress)
        continue;
      activeRequests++;
      log.debug("Invoking request name " + request.requestName + " (" + activeRequests + ")");
      request.invoke();
    }
  },

  /// remove a request from the active queue when it is complete
  finishRequest(aRequest) {
    let requestIndex = this._requestQueue.indexOf(aRequest);
    if (requestIndex >= 0)
      this._requestQueue.splice(requestIndex, 1);
    // signal the queue to fire any pending requests
    this.queueRequest(null);
  },

  /// The following methods are calls to the server

  getNewItems(aFolder, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.getNewItems(this, aEventListener, aFolder, false);
  },

  getNewItemsAndAttachments(aFolder, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.getNewItems(this, aEventListener, aFolder, true);
  },

  discoverFolders(aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.discoverFolders(this, aEventListener);
  },

  discoverSubfolders(aFolder, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.discoverSubfolders(this, aEventListener, aFolder);
  },

  generateError(aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.generateError(this, aEventListener);
  },

  invalidType(aEventListener, aClass) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.invalidType(this, aEventListener, aClass);
  },

  getItemBody(aNativeItem, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.getItemBody(this, aEventListener, aNativeItem);
  },

  getItemMimeContent(aNativeItem, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    items.appendElement(aNativeItem, false);
    machine.getItemsMimeContent(this, aEventListener, items);
  },

  getItemOffline(aNativeItem, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.getItemOffline(this, aEventListener, aNativeItem);
  },

  updateItemProperties(aNativeItem, aNewProperties, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.updateItemProperties(this, aEventListener, aNativeItem, aNewProperties);
  },

  updateManyItems(aItems, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.updateManyItems(this, aEventListener, aItems);
  },

  getAttachmentContent(aAttachment, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.getAttachmentContent(this, aEventListener, aAttachment);
  },

  copyItems(aDestinationFolder, aItemIds, aIsMove, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.copyItems(this, aEventListener, aDestinationFolder, aItemIds, aIsMove);
  },

  createSubfolder(aParentFolder, aChildFolder, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.createSubfolder(this, aEventListener, aParentFolder, aChildFolder);
  },

  deleteSubfolders(aFolderIds, aEventListener, aMoveToDeletedItems) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.deleteSubfolders(this, aEventListener, aFolderIds, aMoveToDeletedItems);
  },

  moveSubfolders(aSourceFolderIds, aDestFolder, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.moveSubfolders(this, aEventListener, aSourceFolderIds, aDestFolder);
  },

  deleteItems(aItemsIds, aMoveToDeletedItems, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.deleteItems(this, aEventListener, aItemsIds, aMoveToDeletedItems);
  },

  createMessageFromString(aMessage, aFolder, aProperties, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.createMessageFromString(this, aEventListener, aMessage, aFolder, aProperties);
  },

  createMessageFromFile(aMessageFile, aFolder, aProperties, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.createMessageFromFile(this, aEventListener, aMessageFile, aFolder, aProperties);
  },

  saveNewItem(aItem, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.saveNewItem(this, aEventListener, aItem);
  },

  checkOnline(aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.checkOnline(this, aEventListener);
  },

  sendItem(aNativeItem, aSaveItem, aSavedItemFolderId, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.sendItem(this, aEventListener, aNativeItem, aSaveItem, aSavedItemFolderId);
  },

  resolveNames(aEntry, aReturnFullContactData, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.resolveNames(this, aEventListener, aEntry, aReturnFullContactData);
    return machine;
  },

  getAllServerIds(aNativeFolder, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.getAllServerIds(this, aEventListener, aNativeFolder);
  },

  getFolder(aNativeFolder, aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.getFolder(this, aEventListener, aNativeFolder);
  },

  testInitial(aEventListener) {
    this._checkShutdown();
    let machine = new EwsNativeMachine();
    machine.testInitial(this, aEventListener);
  },

  addListener(a) {
    if (!this._eventListeners.includes(a)) {
      if (a.wrappedJSObject) {
        a = a.wrappedJSObject;
        log.config("Adding mailbox listener for wrappedJSObject since it exists");
      }
      log.config("Adding mailbox listener " + a);
      this._eventListeners.push(a);
    }
  },

  removeListener(a) {
    let foundIndex = this._eventListeners.indexOf(a);
    if (foundIndex >= 0)
      this._eventListeners.splice(foundIndex, 1);
  },

    // helper methods
  _postEvent(aEvent, aData, result) {
    for (let ip1 = this._eventListeners.length; ip1 > 0; ip1--) {
      try {
        this._eventListeners[ip1 - 1].onEvent(this, aEvent, aData, result);
      } catch (ex) {
        ex.code = "error-post-event";
        log.error("mailbox event listener failed, continuing", ex);
      }
    }
  },

  _checkShutdown() {
    if (this._shutdown)
      throw CE("The mailbox is shutting down", Cr.NS_ERROR_NOT_AVAILABLE);
  },

}
