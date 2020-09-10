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

'use strict';
const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "EnsureLicensed",
  "resource://exquilla/License.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("base");
  return _log;
});
ChromeUtils.defineModuleGetter(this, "OS", "resource://gre/modules/osfile.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNativeItem",
                               "resource://exquilla/EwsNativeItem.jsm");
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");

// Exchange Extended Data properties
const PR_LAST_VERB_EXECUTED = "0x1081";
const EXCHIVERB_FORWARD = "104";
const EXCHIVERB_REPLYTOALL = "103";
const EXCHIVERB_REPLYTOSENDER = "102";
const PR_FLAG_STATUS = "0x1090";
const PR_FLAG_STATUS_FOLLOWUPCOMPLETE = "1";
const PR_FLAG_STATUS_FOLLOWUPFLAGGED = "2";
const PR_FOLLOWUP_ICON = "0x1095";
const PR_FOLLOWUP_ICON_RED = "6";
const PR_TODO_ITEM_FLAGS = "0x0E2B";
const PR_TODO_ITEM_FLAGS_FLAGGED = "1";
const PR_TODO_ITEM_FLAGS_UNFLAGGED = "0";
const PR_MESSAGE_FLAGS = "0x0e07";
const MAPI_MSGFLAG_READ = 0x01;
const MAPI_MSGFLAG_UNSENT = 0x08;

// reindex in progress flags for message (using an unused nsMsgMessageFlags)
const REINDEX_FLAG = 0x00004000;

const FOLDER_SUFFIX = ".sbd"; // the suffix we use for folder subdirectories

// Most recently used (opened, moved to, got new messages)
const MRU_TIME_PROPERTY = "MRUTime";

ChromeUtils.defineModuleGetter(this, "JSAccountUtils", "resource://exquilla/JSAccountUtils.jsm");
ChromeUtils.defineModuleGetter(this, "JaBaseMsgFolder", 
                               "resource://exquilla/JaBaseMsgFolder.jsm");
ChromeUtils.defineModuleGetter(this, "PromiseUtils",
                               "resource://exquilla/PromiseUtils.jsm");

// local functions

/**
 * Change a folder URI in all filters from an old to a new value.
 * Unlike matchOrChangeTarget in nsIMsgFilterList, this will match a URI
 * prefix. This is primarily used in the massive change in canonical URIs
 * done post build 1192.
 * @function changeFilterURIs
 * @param oldURI [string} the previous URI for a folder
 * @param newURI {string} the new URI for a folder
 *
 */
function changeFilterURIs(oldURI, newURI) {
  for (let server of /* COMPAT for TB 68 */toArray(MailServices.accounts.allServers, Ci.nsIMsgIncomingServer)) {
    try { // continue with next server if failure
      if (!server.canHaveFilters)
        continue;
      let filterList = server.getFilterList(null);
      let somethingChanged = false;
      for (let j = 0; j < filterList.filterCount; j++) {
        let filter = filterList.getFilterAt(j);
        for (let k = 0; k < filter.actionCount; k++) {
          let action = filter.getActionAt(k);
          if (action.type == Ci.nsMsgFilterAction.MoveToFolder ||
              action.type == Ci.nsMsgFilterAction.CopyToFolder) {
            let actionURI = action.targetFolderUri;
            if (actionURI.includes(oldURI)) {
              let newFolderURI = actionURI.replace(oldURI, newURI);
              action.targetFolderUri = newFolderURI;
              somethingChanged = true;
            }
          }
        }
      }
      if (somethingChanged) {
        log.info("Updating filter list file after updating with changedURIs");
        filterList.saveToDefaultFile();
      }
    } catch (ex) {
      log.warn("Error trying to change filters for server " + serverURI + " : " + ex);
    }
  }
}

function changeIdentityAttribute(identity, attribute, newValue) {
  // Because ExQuilla restores values of key identity attributes on restart
  // to workaround a reset to Local Folders done by skink, when we save an
  // identity attribute be need to change the exQuilla backup as well as the
  // actual attribute.
  identity[attribute] = newValue;
  let pref = "";
  if (attribute == "fccFolder")
    pref = "fcc_folder";
  else if (attribute == "draftFolder")
    pref = "draft_folder";
  else if (attribute == "archiveFolder")
    pref = "archive_folder";
  else if (attribute == "stationeryFolder")
    pref = "stationery_folder";
  if (!pref)
    throw CE("Unsupported attribute " + attribute);
  let backupPref = "extensions.exquilla.mail.identity." + identity.key + "." + pref;
  Services.prefs.setCharPref(backupPref, newValue);
}

// nsIStringInputStream implementing nsILineInputStream.
function stringLineStreamFactory(aString) {
  let stringStream = inputStreamFromString(aString);
  let lineStream = Object.create(stringStream);
  Object.defineProperty(lineStream, 'QueryInterface', {
    value: ChromeUtils.generateQI([Ci.nsIInputStream,
                                   Ci.nsILineInputStream]),
    writable: false,
    configurable: true,
    enumerable: true
  });
  lineStream._lines = aString.split('\n');
  lineStream._linesRead = 0;
  lineStream.readLine = function(aResultObject) {
    if (this._linesRead >= this._lines.length)
      return false;
    aResultObject.value = this._lines[this._linesRead++];
    return true;
  }
  return lineStream;
}

// force the bit aBit to value flags
function forceBit(aFlags, aBit, aValue)
{
  if (aValue)
    aFlags |= aBit;
  else
    aFlags &= ~aBit;
  return aFlags;
}

// given a property list "properties" with SOAP header plName, get a list
//  of email addresses (SOAP type t:ArrayOfRecipientsType) and put it
//  into message header msgHdr with attribute msgHdrName.
//
function addressesToHeader(properties, plName, msgHdr, msgHdrName) {
  let addressEx = "";
  do {
    let mailboxes = properties.getPropertyLists(plName);
    for (let mailboxPL of mailboxes) {
      let addressName = mailboxPL.getAString("Name");
      try {
        addressName = MailServices.mimeConverter
                                  .encodeMimePartIIStr_UTF8(addressName, false, "UTF-8", 0, 999);
      } catch (e) { log.warn("Failed to decode address name " + addressName);}
      let addressEmail = mailboxPL.getAString("EmailAddress");
      if (addressEx)
        addressEx += ", ";
      addressEx += MailServices.headerParser.makeMimeAddress(addressName, addressEmail);
    }
  } while (false);
  msgHdr[msgHdrName] = addressEx;
}

function getSummaryFileLocation(srcFileFolder) {
  let newSummaryLocation = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  newSummaryLocation.initWithFile(srcFileFolder);
  newSummaryLocation.leafName = newSummaryLocation.leafName + ".msf";
  return newSummaryLocation;
}

function addDirectorySeparator(file) {
  // Add the directory separator character to the file (nsIFile)
  //let OS = Cc["@mozilla.org/xre/runtime;1"].getService(Ci.nsIXULRuntime).OS;
  //file.leafName +=  (OS == "WINNT") ? "\\" : "/";

  // No, add the folder suffix
  file.leafName += FOLDER_SUFFIX;
}

// Note Skink version did an alert.
function checkIfFolderExists(newFolderName, parentFolder)
{
  let subFolders = parentFolder.subFolders;
  while (subFolders.hasMoreElements())
  {
    let msgFolder = subFolders.getNext().QueryInterface(Ci.nsIMsgFolder);
    if (newFolderName == msgFolder.name) {
      return true;
    }
  }
  return false;
}

// promise wrapper for nsICopyServiceListener, with 
// termination event StopCopy from an EwsEventListener
function DualListener(copyServiceListener) {
  this._promise = new Promise((resolve, reject) => {
    this._resolve = resolve;
    this._reject = reject;
  });
  this._started = false;
  this._stopped = false;
  this._resolved = false;
  this._stoppedResult = Cr.NS_ERROR_UNEXPECTED;
  this._copyServiceListener = copyServiceListener;
}
DualListener.prototype = {
  QueryInterface: ChromeUtils.generateQI([Ci.nsICopyServiceListener]),
  onEvent(item, eventName, data, result) {
    if (eventName == "StopCopy" && !this._resolved) {
      this._resolved = true;
      this._resolve(result);
    }
  },
  OnStartCopy() {
    if (!this._started && this._copyServiceListener) {
      this._started = true;
      this._copyServiceListener.OnStartCopy();
    }
  },
  OnProgress(aProgress, aProgressMax) {
    if (this._copyServiceListener)
      this._copyServiceListener.OnProgress(aProgress, aProgressMax);
  },
  SetMessageKey() { log.warn("Unexpected SetMessageKey call");},
  GetMessageId() { log.warn("Unexpected GetMessageId call");},
  OnStopCopy(aStatus) {
    if (!this._stopped) {
      this._stopped = true;
      if (this._copyServiceListener)
        this._copyServiceListener.OnStopCopy(aStatus);
      this._resolved = true;
      this._resolve(aStatus);
    }
    else
      log.debug("Second call to OnStopCopy");
  },
  get promise() { return this._promise; }
};

// Main class.
var global = this;
function EwsMsgFolder(aDelegator, aBaseInterfaces) {

  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
  // Superclass constructor
  JaBaseMsgFolder.call(this, aDelegator, aBaseInterfaces);

  // instance variables
  this._verifiedAsOnlineFolder = false;
  this._nativeFolder = null;
  this._numNewNativeMessages = 0;
  this._itemIdKeyMap = new Map();
  this._highWater = 0;
  this._initialized = false;
  this._needFolderLoadedEvent = false;
  this._updateInProcess = false;
  this._repairInProcess = false;
  this._resyncInProcess = false;
  this._resyncDone = false;
  this._initialized = false;
  this._baseMessageURI = "";
  this._databaseInited = false;

  // Shall we aply incoming filters on this folder?
  this._applyIncomingFilters = false;
}

// Extend the base properties.
EwsMsgFolder.Properties = {
  __proto__: JaBaseMsgFolder.Properties,

  contractID: /* COMPAT for TB 68 */"@mozilla.org/rdf/rdf-service;1" in Cc ? "@mozilla.org/rdf/resource-factory;1?name=exquilla" : "@mozilla.org/mail/folder-factory;1?name=exquilla",
  classID: Components.ID("{CF5ABC99-F459-42E8-85A1-10B4D6590D33}"),

// Add an additional interface only needed by this custom class.
  extraInterfaces: [],
}

// Extend the base class methods.
EwsMsgFolder.prototype = {
  // Typical boilerplate to include in all implementations.
  __proto__: JaBaseMsgFolder.prototype,

  // Used to identify this as an EwsMsgFolder
  get EwsMsgFolder() {
    return this;
  },

  // InterfaceRequestor override, needed if extraInterfaces.
  getInterface: function(iid) {
    for (let iface of EwsMsgFolder.Properties.extraInterfaces) {
      if (iid.equals(iface)) {
        return this;
      }
    }

    return this.QueryInterface(iid);
  },

  // EwsMsgFolder implementation

  get nativeMailbox() {
    let exqServer = safeGetJS(this.server, "EwsIncomingServer");
    return exqServer.nativeMailbox;
  },

  get folderId() {
    if (this.isServer) {
      return this.server.getUnicharValue("ewsFolderId");
    }
    let folderInfoObject = {};
    let db = this.getDBFolderInfoAndDB(folderInfoObject);
    let folderInfo = folderInfoObject.value;
    return folderInfo.getProperty("ewsFolderId");
  },

  set folderId(a) {
    if (this.isServer) {
      return this.server.setUnicharValue("ewsFolderId", a);
    }
    let folderInfoObject = {};
    let db = this.getDBFolderInfoAndDB(folderInfoObject);
    let folderInfo = folderInfoObject.value;
    return folderInfo.setProperty("ewsFolderId", a);
  },

  get distinguishedFolderId() {
    if (this.isServer) {
      return this.server.getUnicharValue("ewsDistinguishedFolderId");
    }
    let folderInfoObject = {};
    let db = this.getDBFolderInfoAndDB(folderInfoObject);
    let folderInfo = folderInfoObject.value;
    return folderInfo.getProperty("ewsDistinguishedFolderId");
  },

  set distinguishedFolderId(a) {
    if (this.isServer) {
      return this.server.setUnicharValue("ewsDistinguishedFolderId", a);
    }
    let folderInfoObject = {};
    let db = this.getDBFolderInfoAndDB(folderInfoObject);
    let folderInfo = folderInfoObject.value;
    return folderInfo.setProperty("ewsDistinguishedFolderId", a);
  },

  get verifiedAsOnlineFolder()  { return this._verifiedAsOnlineFolder;},
  set verifiedAsOnlineFolder(a) { this._verifiedAsOnlineFolder = a;},

  initNativeFolder() {
    //log.debug("initNativeFolder has folder? " + !!this._nativeFolder);

    // It's not clear this ever gets executed, instead init occurs in updateFromNative
    if (this._nativeFolder)
      return;

    // Force creation of msg database.
    let msgDatabase = this.msgDatabase;

    // Give priority to lookup to distinguishedFolderId
    let folderId = this.distinguishedFolderId;
    if (!folderId)
      folderId = this.folderId;

    if (!this.folderId) {
      log.warn("folderId is empty for folder", this.name);
      throw CE("folderId is empty for folder", Cr.NS_ERROR_NOT_INITIALIZED);
    }
    this._nativeFolder = this.nativeMailbox.getNativeFolder(folderId);
    if (this.distinguishedFolderId)
      this._nativeFolder.folderId = this.folderId;

    // glue from native folder to mail folder
    this._nativeFolder.folderURI = this.URI;

    // fill in remaining fields in the native folder
    this._updateNativeFromSkink();

  },

  ///Extends nsIMsgFolder to include EWS-specific issue
  //void updateFolderWithListener(in nsIMsgWindow aMsgWindow, in nsIUrlListener aListener);
  async updateFolderWithListener(aMsgWindow, urlListener) {
    let result;
    try {
      result = await (async () => {
        log.config("msqEwsMailFolder.updateFolderWithListener " + this.name);
        this._needFolderLoadedEvent = true;
        let mailbox = this.nativeMailbox;
        if (mailbox)
          this.initNativeFolder();
        let nativeFolder = this._nativeFolder;

        let ewsServer = safeGetJS(this.server, "EwsIncomingServer");
        if (ewsServer.unavailable != ewsServer.AVAILABLE)
        {
          // We'll do a server expand first, which contains the logic to check online
          log.debug("UpdateFolderWithListener doing expand because of server unavailable");
          let urlListener = new PromiseUtils.UrlListener();
          ewsServer.performExpandAsync(aMsgWindow, urlListener);
          let result = await urlListener.promise;

          if (result != Cr.NS_OK)
            throw CE("Failed to perform expand on server", result);

          if (ewsServer.unavailable != ewsServer.AVAILABLE) {
            log.config("updateFolderListener returning without update since server is unavailable");
            return Cr.NS_OK;
          }
        }

        if (this._repairInProcess)
        {
          // get rid of the annoying wait icon
          log.warn("Update folder while resync in progress");
          this._notifyFolderLoaded();
          this._needFolderLoadedEvent = true;
          return Cr.NS_OK;
        }

        if (this._updateInProcess)
        {
          log.warn("Update in progress on ews folder");
          return Cr.NS_OK;
        }

        // Cripple point: don't proceed with invalid license
        if (!(await EnsureLicensed())) {
          log.info("Not doing update because of license status");
          let bundle = Services.strings.createBundle("chrome://exquilla/locale/settings.properties");
          throw CE(bundle.GetStringFromName("noLicenseFound"));
        }

        let syncState = "";
        try {
          let dsListener = new PromiseUtils.DatastoreListener();
          mailbox.datastore.getSyncState(nativeFolder, dsListener);
          let result = await dsListener.promise;

          if (result.status != Cr.NS_OK)
            throw CE("Failed to get sync state from datastore");
          syncState = result.data.QueryInterface(Ci.nsISupportsString).data;
        } catch (e) { log.warn(e);}
        if (!syncState) {
          log.config("Blank sync state for folder " + this.name);

          // need to reindex!
          log.info("Reindexing database for folder " + this.name);
          // XXX TODO This can be slow, maybe I should not wait?
          let reindexListener = new PromiseUtils.UrlListener();
          this.reindex(aMsgWindow, reindexListener);
          let reindexResult = await reindexListener.promise;
          return reindexResult;
        }

        let db;
        try {
          db = this.msgDatabase;
        } catch (e) {
          log.config("Error getting database for folder " + this.name);
        }

        if (!db || !db.summaryValid)
        {
          log.info("Resyncing database for folder " + this.name);
          let resyncListener = new PromiseUtils.UrlListener();
          this.resyncFromNative(true, resyncListener);
          let result = await resyncListener.promise;
          log.debug("after resyncFromNative, result is " + result);

          if (result != Cr.NS_OK)
            throw CE("Error from resyncFromNative", result);
        }

        // this should really be done AFTER update Does nothing because of _updateInProcess
        //this._notifyFolderLoaded(); // That is, the summary database is OK

        this._updateInProcess = true;

        // update subfolders
        let discoverFoldersListener = new PromiseUtils.MachineListener;
        mailbox.discoverSubfolders(nativeFolder, discoverFoldersListener);
        let discoverFoldersResult = await discoverFoldersListener.promise;

        if (discoverFoldersResult.status != Cr.NS_OK)
          throw CE("Failed to discover subfolders");

        // If this is the inbox, filters will be applied. Otherwise, we test the
        // inherited folder property "applyIncomingFilters" (which defaults to empty).
        // If this inherited property has the string value "true", we will apply
        // filters even if this is not the inbox folder.
        let applyIncomingFilters = this.getInheritedStringProperty("applyIncomingFilters");
        if (this.getFlag(Ci.nsMsgFolderFlags.Inbox))
          this._applyIncomingFilters = !(applyIncomingFilters == "false");
        else
          this._applyIncomingFilters = (applyIncomingFilters == "true");

        // Call getNewItems, processing special events that are used
        // to not new messages or folder info.
        let getNewListener = new PromiseUtils.MachineListener(
          async (aItem, aEvent, aData, aResult) => {

            if (aEvent == "GotFolder") {
              // Update the folder summary totals
              mailbox.updateSubfolderIds();
              this.updateFromNative(nativeFolder);
              this.updateSummaryTotals(true);
            }

            if (aEvent == "ItemChanged") {
              log.debug("ItemChanged in folder " + this.name);
              let item = aData.EwsNativeItem;
              this._reconcileItem(item, true);
              log.debug("changed item has flags " + item.flags);

              // Either deleted or persist
              let datastoreListener = new PromiseUtils.DatastoreListener();
              if (item.flags & (item.DeletedBit | item.DeletedOnServerBit))
                mailbox.datastore.deleteItem(item, datastoreListener);
              else // Store the change flags after reconcile.
                mailbox.datastore.putItem(item, datastoreListener);
              //  Hard to propagate an error here, so we will just report any issue.
              try {
                let result = await datastoreListener.promise;
                if (result.status != Cr.NS_OK)
                  log.warn("Error saving item in database");
              } catch (ex) {
                log.warn("Error saving item in database: " + ex);
              }
            }
          }
        );

        log.debug("Entering getNewListener");
        // Is this folder enabled for offline? If so also download attachments.
        log.debug("Download attachments? " + !!this.getFlag(Ci.nsMsgFolderFlags.Offline))
        if (this.getFlag(Ci.nsMsgFolderFlags.Offline))
          mailbox.getNewItemsAndAttachments(nativeFolder, getNewListener);
        else
          mailbox.getNewItems(nativeFolder, getNewListener);
        let getNewResult = await getNewListener.promise;
        if (getNewResult.status != Cr.NS_OK)
          throw CE("Failed to get new items");

        // junk processing
        let filtersRun = this.callFilterPlugins(null);
        let numNewNativeMessages = this.numNewNativeMessages;
        if (numNewNativeMessages > 0) {
          this.setNumNewMessages(this.getNumNewMessages(false) + numNewNativeMessages);
          this.hasNewMessages = true;
          this.numNewNativeMessages = 0;
          if (!filtersRun) {
            // we want to notify biff to get e. g. the system sound
            if (this.getFlag(Ci.nsMsgFolderFlags.Inbox)) {
              this.server.performingBiff = true;
              this.biffState = Ci.nsIMsgFolder.nsMsgBiffState_NewMail;
              this.server.performingBiff = false;
            }
          }
        }

        this._updateInProcess = false;
        this._notifyFolderLoaded();

        // Allow avoiding auto resync on large folders
        let totalCount = this._nativeFolder.totalCount;
        let folderSizeMax = Services.prefs.getIntPref("extensions.exquilla.resyncFolderSizeMax");
        if (totalCount > folderSizeMax)
        {
          log.info("Skip auto resync on folder : " + this.name +
                   ", extensions.exquilla.resyncFolderSizeMax less than folder count of ", totalCount);
          this._resyncDone = true;
        }
        
        // Should we do a resync to native? Once per session
        if (!this._resyncDone)
        {
          this._resyncDone = true;
          log.config("Doing auto resync for a folder " + this.name + " with count " + totalCount);

          let fixSkink = Services.prefs.getBoolPref("extensions.exquilla.fixskinkdb");
          let resyncListener = new PromiseUtils.UrlListener();
          this.resyncFromNative(fixSkink, resyncListener);
          let result = await resyncListener.promise;

          return result;
        }

        this._updateInProcess = false;
        return Cr.NS_OK;
      })();
    } catch (ex) {
      ex.code = "error-update-folder";
      log.error("Error in updateFolderWithListener", ex);
      this._notifyFolderLoaded();
      this._updateInProcess = false;
      if (urlListener) {
        executeSoon( () => urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE));
      }
      if (aMsgWindow && aMsgWindow.statusFeedback) {
        aMsgWindow.statusFeedback.showStatusString(ex.message);
      }
      return;
    }
    this._notifyFolderLoaded();
    if (this._updateInProcess)
      log.debug("Why are we OK but this._updateInProcess set???");
    if (urlListener) {
      executeSoon( () => urlListener.OnStopRunningUrl(null, result));
    }
  },

  /// given an up-to-date native folder, update a mail folder and its children.
  updateFromNative(aNativeFolder)
  {
    log.config("updateFromNative folder " + aNativeFolder.displayName);
    let needBaseInit = !this._nativeFolder;
    if (this._nativeFolder && (aNativeFolder.folderId != this._nativeFolder.folderId)) {
      log.info("folder id changed for " + aNativeFolder.displayName);
      needBaseInit = true;
    }
    if (!aNativeFolder)
      this.initNativeFolder();
    else
      this._nativeFolder = aNativeFolder;

    // As a change in behavior from C++, I will not verify skink as online if native is not.
    this.verifiedAsOnlineFolder = this._nativeFolder.verifiedOnline;
    if (!this._nativeFolder.verifiedOnline)
      log.info("Updating skink folder '" + this.name + "' from an unverified native folder");
    let localFolderId = this.folderId;
    let ewsFolderId = this._nativeFolder.folderId;
    if (!ewsFolderId)
      log.warn("empty ews folderId");
    if (localFolderId != ewsFolderId)
    {
      if (localFolderId)
      {
        log.warn("local FolderId does not match ews folderId");
      }
      if (ewsFolderId)
        this.folderId = ewsFolderId;
      else
        log.warn("Should I be resetting a non-blank folderId (I did not here!)?");
    }

    // also update distinguished folder id if present
    let colonialDFolderId = this.distinguishedFolderId;
    if (colonialDFolderId != this._nativeFolder.distinguishedFolderId)
    {
      if (colonialDFolderId)
        log.warn("Native distinguished folder id does not match colonial, was: " + colonialDFolderId +
                 " is : " + this._nativeFolder.distinguishedFolderId);
      this.distinguishedFolderId = this._nativeFolder.distinguishedFolderId;
    }

    if (needBaseInit) {
      this.initNativeFolder();
    }

    // Figure out if this URI is invalid
    let did = this.distinguishedFolderId;
    try { // let this fail and continue
      if (did && this.parent && this.parent.isServer) {
        log.config("Found folder with distinguishedId " + did);
        let localName = "";
        if (did == "junkemail")
            localName = "Junk";
        else if (did == "deleteditems")
            localName = "Trash";
        else if (did == "drafts")
            localName = "Drafts";
        else if (did == "sentitems")
            localName = "Sent";
        else if (did == "inbox")
            localName = "Inbox";
        else if (did == "archivemsgfolderroot")
            localName = "Archives";
        else if (did == "outbox")
            localName = "Unsent Messages";
        if (localName) {
          // does this match the leaf URI?
          let myURI = this.URI;
          let canonicalURI = this.server.serverURI + "/" + encodeURIComponent(localName);
          log.config("myURI is " + myURI + " canonicalURI is " + canonicalURI);
          if (myURI != canonicalURI) {
            log.warn("Flagging folder for rename with incorrect URI");
            let oldName = this.filePath.leafName;
            log.config("oldName is " + oldName + " for localName " + localName);
            let renameFile = this.filePath.parent.clone();
            renameFile.append(oldName + "." + localName + ".rename");
            renameFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
          }
        }
      }
    } catch(ex) {
      log.info("Failed to create rename file for folder " + this.name + " " + ex);
    }

    let flags = this.flags;
    // set message folder flags for distinguished folders
    if (this.distinguishedFolderId)
    {
      let did = this.distinguishedFolderId;
      flags = forceBit(flags, Ci.nsMsgFolderFlags.Trash, did == "deleteditems");
      flags = forceBit(flags, Ci.nsMsgFolderFlags.Drafts, did =="drafts");
      flags = forceBit(flags, Ci.nsMsgFolderFlags.SentMail, did == "sentitems");
      flags = forceBit(flags, Ci.nsMsgFolderFlags.Queue, did == "outbox");
      flags = forceBit(flags, Ci.nsMsgFolderFlags.Inbox, did == "inbox");
      flags = forceBit(flags, Ci.nsMsgFolderFlags.Junk, did == "junkemail");
    }

    // note which are email folders
    let folderClass = this._nativeFolder.folderClass;
    flags = forceBit(flags, Ci.nsMsgFolderFlags.Mail,
                       (folderClass = "IPF.StickyNote" ||
                        folderClass.substr(0, 8) == "IPF.Note"));
    this.flags = flags;

    let nativeName = this._nativeFolder.displayName;
    log.debug("msqEwsMailFolder.updateFromNative folder " + nativeName);
    // Early TB 52 may have set a bad value in folderName. We aren't
    // using that any more.
    //{
    //  let folderInfoObject = {};
    //  let db = this.getDBFolderInfoAndDB(folderInfoObject);
    //  let folderInfo = folderInfoObject.value;
    //  folderInfo.folderName = "";
    //}
    // We store the folder name in a JSON file owned by the server.
    if (!this.isServer) {
      let exqServer = safeGetJS(this.server, "EwsIncomingServer");
      if (exqServer.getDisplayName(this.URI) != nativeName)
        exqServer.setDisplayName(this.URI, nativeName);
      this.prettyName = nativeName;
    }

    // glue from native folder to mail folder
    this._nativeFolder.folderURI = this.URI;

    // correct the counts. Use pending counts for any difference between the
    //  reported folder count, and the local db-related count.

    // So how will I handle non-mail items here? Ultimately I want the counts to reflect
    // only mail items, since I do not display other items. But I also
    // want visible folder counts to change when all we have is folder info, but have not
    // downloaded the items. What to do?

    // I added the ability to display a generic item as a "message". Still need to fix the UI to
    // make sure that we don't act on it like a message though.

    let nativeUnreadCount = this._nativeFolder.unreadCount;
    let skinkUnreadCount = this.getNumUnread(false); // This includes pending
    if (skinkUnreadCount < 0)
      log.warn("mNumUnreadMessages not initialized");
    else if (nativeUnreadCount != skinkUnreadCount) {
      this.changeNumPendingUnread(nativeUnreadCount - skinkUnreadCount);
    }

    let nativeTotalCount = this._nativeFolder.totalCount;
    let skinkTotalCount = this.getTotalMessages(false); // This includes pending.
    if (skinkTotalCount < 0)
      log.warn("mNumPendingTotalMessages not initialized");
    else if (skinkTotalCount != nativeTotalCount) {
      this.changeNumPendingTotalMessages(nativeTotalCount - skinkTotalCount);
    }

    // Now we will go through all of the existing children of this mail folder,
    //  updating child from native if found, otherwise deleting the mail folder child.
    //  Then new mail children will be created for natives with no existing local
    //  folder.

    let mailbox = this.nativeMailbox;
    let folderIds = this._nativeFolder.subfolderIds;
    log.config("folder " + this._nativeFolder.displayName + " has " + folderIds.length + " native subfolders" +
              " and " + this._nativeFolder.totalCount + " total messages");
    let subfoldersEnum = this.subFolders;
    while (subfoldersEnum.hasMoreElements()) {
      let childSkinkFolder = subfoldersEnum.getNext()
                                           .QueryInterface(Ci.nsIMsgFolder);
      let childEwsMailFolder = safeGetJS(childSkinkFolder, "EwsMsgFolder");
      // ToDo: I need to store the needed folder info in the cache, so
      // that I do not have to open each folder db
      let dbIsOpen = childSkinkFolder.isOpen;
      // Don't check virtual folders
      if (childSkinkFolder.getFlag(Ci.nsMsgFolderFlags.Virtual)) {
        if (!dbIsOpen)
          childSkinkFolder.msgDatabase = null;
        continue;
      }
      let childLocalFolderId = childEwsMailFolder.distinguishedFolderId ||
                                 childEwsMailFolder.folderId;
      // If the folderId is still empty, then perhaps this is a special folder, and I need to
      //  match it with a particular distinguished folder. SpamSettings will create these.
      if (!childLocalFolderId)
      {
        if (childSkinkFolder.getFlag(Ci.nsMsgFolderFlags.Junk))
          childLocalFolderId = "junkemail";
      }

      // XXX ToDo: I really need to only get the native child if it exists, so that I
      //           don't create and cache a folder that I cannot use.
      let nativeChildFolder = mailbox.getNativeFolder(childLocalFolderId);
      // native child might be missing if native folder was deleted externally

      // If the native folder is not verified, then search through native folder
      //  space trying to find it.
      if (!nativeChildFolder.verifiedOnline)
      {
        log.warn("folder not verified online, trying to locate");
        let foundMatchingFolder = false;
        let length = 0;
        if (folderIds)
          length = folderIds.length;
        let testNativeFolder = null;
        let foundNativeFolder = null;
        let testFolderId = "";
        for (let j = 0; j < length; j++)
        {
          testFolderId = folderIds.getAt(j);
          testNativeFolder = mailbox.getNativeFolder(testFolderId);
          foundNativeFolder = testNativeFolder;
          let testMailFolder = childSkinkFolder;
          while (testMailFolder && testNativeFolder)
          {
            //log.debug("Comparing " + testMailFolder.name + " to " + testNativeFolder.displayName);
            // if both are the root, we are done
            //log.debug("isServer? " + testMailFolder.isServer +
            //           " native root? " + (testNativeFolder ? testNativeFolder.distinguishedFolderId == "msgfolderroot" : false));
            if (testMailFolder && testMailFolder.isServer &&
                testNativeFolder && testNativeFolder.distinguishedFolderId == "msgfolderroot") {
              foundMatchingFolder = true;
              break;
            }
            else {
              //log.debug("Not root folder");
            }
            if (testMailFolder.name != testNativeFolder.displayName) {
              //log.debug("names don't match");
              break;
            }
            // this must also be a verified folder
            if (!testNativeFolder.verifiedOnline) {
              //log.debug("not verified");
              break;
            }

            // also check the parents
            testMailFolder = testMailFolder.parent;
            if (testNativeFolder.parentFolderId)
              testNativeFolder = mailbox.getNativeFolder(testNativeFolder.parentFolderId);
            else {
              //log.debug("native has no parent");
              testNativeFolder = null;
            }
          }
          if (foundMatchingFolder)
            break;
        }
        if (!foundMatchingFolder || !foundNativeFolder) {
          log.warn("Did not find matching folder");
        }
        else
        {
          log.info("Found matching folder");
          nativeChildFolder = foundNativeFolder;
          childEwsMailFolder.folderId = nativeChildFolder.folderId;
        }
      }

      let childClass = nativeChildFolder.folderClass;
      let parentFolderId = nativeChildFolder.parentFolderId;

      // I'm going to show folder with empty class as well, since I proved earlier it
      //  is possible to create them!
      if ( (ewsFolderId == parentFolderId) &&
           !childClass.startsWith("IPF.Note.SocialConnector") && // News Feed
           !childClass.startsWith("IPF.Note.OutlookHomepage") && // RSS Feeds
           ( childClass.substring(0, 8) == "IPF.Note" ||
             childClass == "IPF.StickyNote" ||
             !childClass))
      {
        childEwsMailFolder.updateFromNative(nativeChildFolder);
        childSkinkFolder.updateSummaryTotals(false);
      }
      else
      {
        // Delete any folders that have no matching native.
        //
        // Occasionally I get a strange bug that deletes all folders. Then I cannot do
        //  an expand! So I'll never delete the inbox
        if (!childSkinkFolder.getFlag(Ci.nsMsgFolderFlags.Inbox))
        {
          log.config("local folder not found in native, deleting", childSkinkFolder.prettyName);
          try {
            this.propagateDelete(childSkinkFolder, true, null);
          }
          catch(e) {
            log.warn("subfolder delete failed for " + childSkinkFolder.prettyName + " " + e);
          }
        }
        else
          log.warn("Wanted to delete the inbox, but that can't be right!");
      }
      // close any dbs we opened
      if (!dbIsOpen)
        childSkinkFolder.msgDatabase = null;
    }

    // Now we are going to go through the native folder's children,
    //  creating and updating if needed from local

    if (folderIds)
    {
      for (let i = 0; i < folderIds.length; i++)
      {
        let childNativeFolder = mailbox.getNativeFolder(folderIds.getAt(i));
        let childMsgFolder = null;
        if (childNativeFolder.folderURI)
        {
          childMsgFolder = Utils.getExistingFolder(childNativeFolder.folderURI);
          if (!childMsgFolder)
            log.config("Did not find existing child folder with URL " + childNativeFolder.folderURI);
        }
        let childDisplayName = childNativeFolder.displayName
        let childClass = childNativeFolder.folderClass;
        if (!childMsgFolder &&
            this._useMail &&
            !childClass.startsWith("IPF.Note.SocialConnector") && // News Feed
            !childClass.startsWith("IPF.Note.OutlookHomepage") && // RSS Feeds
            ( childClass.substring(0, 8) == "IPF.Note" ||
              childClass =="IPF.StickyNote" ||
              !childClass)) // this folder not updated from locals
        {
          log.config("need to add child folder " + childDisplayName);
          let childMailFolder;
          try {
            try {
              childMailFolder = this.getChildNamed(childDisplayName);
            }
            catch (e) {
              let childLocalName = childDisplayName;
              // Certain folders need to have standard URIs to properly work
              //  with Skink. Adjust those names.
              let childDId = childNativeFolder.distinguishedFolderId;
              if (childDId) {
                log.config("Found folder with distinguishedId " + childDId + " name " + childDisplayName);
                if (childDId == "junkemail")
                    childLocalName = "Junk";
                else if (childDId == "deleteditems")
                    childLocalName = "Trash";
                else if (childDId == "drafts")
                    childLocalName = "Drafts";
                else if (childDId == "sentitems")
                    childLocalName = "Sent";
                else if (childDId == "inbox")
                    childLocalName = "Inbox";
                else if (childDId == "archivemsgfolderroot")
                    childLocalName = "Archives";
                else if (childDId == "outbox")
                    childLocalName = "Unsent Messages";
                else if (childDId == "notes")
                    childLocalName = "Notes";
                // EWS has no notion of a Templates folder
              }
              childMailFolder = this.addSubfolder(childLocalName);
              childMailFolder.prettyName = childDisplayName;
            }
          }
          catch (e) {
            log.config("AddSubfolder failed, folder name is " + childDisplayName);
          }
          if (childMailFolder)
          {
            if (!childMailFolder.getFlag(Ci.nsMsgFolderFlags.Virtual))
            {
              // GetSubFolders does some critical initialization. We will do a dummy call,
              // otherwise AddSubfolders ends up calling itself during that initialization.
              // This should really be cleaned up instead of doing this fragile kludge.
              let folderEnum = childMailFolder.subFolders;

              let childEwsMailFolder = safeGetJS(childMailFolder, "EwsMsgFolder");
              childEwsMailFolder.updateFromNative(childNativeFolder);
              childMailFolder.updateSummaryTotals(false);
            }

            // We don't want to leave lots of databases open
            if (childMailFolder.databaseOpen) {
              let database = childMailFolder.msgDatabase;
              if (database)
              {
                database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
                childMailFolder.msgDatabase = null;
                database = null;
              }
            }
          }
        }
        else if (childClass.substring(0, 15) == "IPF.Appointment")
        {
          // add this calendar if needed
          this._addCalendarFromNativeFolder(childNativeFolder);
        }
      }
    }
    else
      EWS_LOG_WARN("folderIds is missing");

  },

  /// resync the msgdb from the native db
  //void resyncFromNative(in bool aFixProblems, in nsIUrlListener aListener);
  async resyncFromNative(aFixProblems, urlListener) {
    let result;
    try {
      result = await (async() => {
        log.debug("this._resyncInProcess is " + this._resyncInProcess);
        log.debug("this._updateInProcess is " + this._updateInProcess);
        if (this._updateInProcess || this._resyncInProcess || this._repairInProcess)
          throw CE("Can't resync because competing process is already active", Cr.NS_ERROR_NOT_AVAILABLE);
        this._resyncInProcess = true;

        let server = this.server;
        let longFolderName = this.name + " (" + server.prettyName + ")" + ":";
        showStatusFeedbackString("resyncingFolder", longFolderName);
        log.debug("Started syncing folder " + longFolderName);
        let mailbox = this.nativeMailbox;
        let datastore = mailbox.datastore;
        let database = this.msgDatabase;

        // First, let's update the folder itself.
        {
          let listener = new PromiseUtils.MachineListener();
          mailbox.getFolder(this._nativeFolder, listener);
          let result = await listener.promise;
          if (result.status != Cr.NS_OK)
            throw CE("Failed to get folder");
        }

        let getIdsListener = new PromiseUtils.MachineListener();
        mailbox.getAllServerIds(this._nativeFolder, getIdsListener);
        let getIdsResult = await getIdsListener.promise;
        if (getIdsResult.status != Cr.NS_OK)
          throw CE("GetAllServerIds failed");

        let serverItems = getIdsResult.item;
        log.debug("Server itemIds length is " + serverItems.length);

        // Get list of items in db
        let getFolderIdsListener = new PromiseUtils.DatastoreListener();
        datastore.getIdsForFolder(this.folderId, getFolderIdsListener);
        let getFolderIdsResult = await getFolderIdsListener.promise;
        if (getFolderIdsResult.status != Cr.NS_OK)
          throw CE("getIdsForFolder failed");

        // compare the serverIds to the dbIds and changeKeys, and make sure that they match
        let dbMatchesCount = 0;
        let dbChangeKeyDiffersCount = 0;
        let dbMissingCount = 0;
        let dbExtraCount = 0;
        let morkIsReadDiffersCount = 0;
        let skinkDbCount = 0;
        let skinkUnreadCount = 0;

        let startTime = Date.now();

        // parallel arrays for each itemId from datastore
        let itemIds = getFolderIdsResult.data.wrappedJSObject.StringArray;
        let changeKeys = getFolderIdsResult.item.wrappedJSObject.StringArray;
        log.debug(`Found ${itemIds.length} items and ${changeKeys.length} changeKeys`);
        let itemResyncStatus = [];
        let isReads = [];

        // Items missing in native db but present on server, index into mServerItems
        let dbMissingIds = [];
        // ids existing in native db but not on server
        let extraIds = [];
        // Ids needing resync because of changeKey or missing issue
        let resyncIds = [];
        // Ids missing from Mork but present in db
        let missingIds = [];
        // hdrs existing in Mork with no valid native id
        let extraHdrs = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

        // map item ids to their array location in the various parallel arrays
        let dbIdsHash = new Map();

        // Use the following bits for the resync status;
        const RFN_SERVER_MISSING_ID = 0;
        const RFN_MORK_MATCHES_DB = 1;
        const RFN_SERVER_MATCHES_DB = 2;
        const RFN_SERVER_CHANGEKEY_DIFFERS = 3;
        const RFN_MORK_ISREAD_DIFFERS = 4;

        for (let i = 0; i < itemIds.length; i++ ) {
          itemResyncStatus.push(RFN_SERVER_MISSING_ID);
          isReads.push(true);
        }
        for (let i = 0; i < itemIds.length; i++) {
          dbIdsHash.set(itemIds.getAt(i), i);
        }

        // First, compare the server ids to the db ids
        for (let i = 0; i < serverItems.length; i++) {
          let serverItem = serverItems.getPropertyListAt(i);
          if (!serverItem) {
            log.warn("could not find server item");
            continue;
          }
          let itemId = serverItem.getAString("ItemId");
          let dbIndex = dbIdsHash.get(itemId);
          if (dbIndex !== undefined) {
            // compare change keys
            let serverChangeKey = serverItem.getAString("ChangeKey");
            if (serverChangeKey === changeKeys.getAt(dbIndex)) {
              itemResyncStatus[dbIndex] = RFN_SERVER_MATCHES_DB;
              dbMatchesCount++;
            }
            else {
              itemResyncStatus[dbIndex] = RFN_SERVER_CHANGEKEY_DIFFERS;
              dbChangeKeyDiffersCount++;
              // Change keys are generating way too many false redownloads, so disable resync
              //   on changeKey alone. The vast majority are unread->read anyway.
              //mResyncIds.AppendElement(itemId);
            }
            // compare isRead. We should really compare here the db to server IsRead,
            //  but with the current db that would require reading in the full PL.
            //  So for now just copy the server value here.
            if (!serverItem.getBoolean("IsRead"))
              isReads[dbIndex] = false;
          }
          else {
            dbMissingIds.push(i);
            dbMissingCount++;
          }
        }

        // Look for extra items in the database
        for (let i = 0; i < itemIds.length; i++) {
          if (itemResyncStatus[i] == RFN_SERVER_MISSING_ID) {
            dbExtraCount++;
            extraIds.push(itemIds.getAt(i));
          }
        }

        log.info(`Server to Db Resync stats: matches: ${dbMatchesCount} ` +
                 `dbMissing: ${dbMissingCount} dbExtra: ${dbExtraCount} ` +
                 `changeKeyDiffers: ${dbChangeKeyDiffersCount} ` +
                 `scanning ${itemIds.length} in ${Date.now() - startTime} milliseconds`);

        startTime = Date.now();
        let skinkEnum = database.EnumerateMessages();

        // Get all skink messages, and look for missing ews messages. Do in batches of 200
        while (skinkEnum.hasMoreElements()) {
          for (let count = 0; skinkEnum.hasMoreElements() && count < 200; count++) {
            let hdr = skinkEnum.getNext().QueryInterface(Ci.nsIMsgDBHdr);
            skinkDbCount++;
            if (!hdr.isRead)
              skinkUnreadCount++;
            let itemId = hdr.getProperty("ewsItemId");
            if (!itemId) {
              log.config("msg has blank itemId: " + hdr.mime2DecodedSubject);
              extraHdrs.appendElement(hdr, false);
              continue;
            }

            let itemIndex = itemIds.indexOf(itemId);
            if (!dbIdsHash.has(itemId)) {
              log.config("skink item has itemId without matching native: " + hdr.mime2DecodedSubject);
              extraHdrs.appendElement(hdr, false);
              continue;
            }

            // compare isRead from db and hdr
            if (hdr.isRead != isReads[itemIndex]) {
              log.config("Mork isRead differs, hdr is " + hdr.isRead + " server is " + isReads[itemIndex]);
              itemResyncStatus[itemIndex] = RFN_MORK_ISREAD_DIFFERS;
              morkIsReadDiffersCount++;
              resyncIds.push(itemId);
            }

            // Only note match if server, db, mork all match
            if (itemResyncStatus[itemIndex] === RFN_SERVER_MATCHES_DB)
              itemResyncStatus[itemIndex] = RFN_MORK_MATCHES_DB;
          }

          // We are at the end of the batch, yield to UI
          await new Promise( (resolve) => Services.tm.mainThread.dispatch(resolve, Ci.nsIThread.DISPATCH_NORMAL));
        } // end of while hasMoreElements

        // Now search the native db looking for missing items
        for (let i = 0; i < itemIds.length; i++) {
          if (itemResyncStatus[i] == RFN_SERVER_MATCHES_DB) {
            missingIds.push(itemIds.getAt(i));
          }
        }

        log.info(`Mork resync stats: found ${missingIds.length} missing items, ` +
                 `${extraHdrs.length} unmatched items, ${morkIsReadDiffersCount} unread mismatch, ` +
                 `scanning ${skinkDbCount} items in ${Date.now() - startTime} milliseconds`);
        if (!aFixProblems)
          return Cr.NS_OK;

        this.changeNumPendingUnread(this._nativeFolder.unreadCount - skinkUnreadCount - this.numPendingUnread);
        this.changeNumPendingTotalMessages(this._nativeFolder.totalCount - skinkDbCount - this.numPendingTotalMessages);

        // What to do with db items with not matching native? I guess we just delete
        //  them, like we do in folder repair.
        let notifier = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
                         .getService(Ci.nsIMsgFolderNotificationService)
        if (extraHdrs.length)
        {
          log.info("Message DB had messages with no corresponding server entry, deleting. Count: " + extraHdrs.length);
          notifier.notifyMsgsDeleted(/* COMPAT for TB 68 */database.deleteMessages.length == 3 ? extraHdrs : toArray(extraHdrs, Ci.nsIMsgDBHdr));
          for (let index = 0; index < extraHdrs.length; index++)
          {
            let hdr = extraHdrs.queryElementAt(index, Ci.nsIMsgDBHdr);
            database.DeleteHeader(hdr, null, false, true);
          }
          database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
        }

        // Missing items (missing in mork but present in db)
        if (missingIds.length)
          log.info("Adding items missing in mork, but present in native database");
        for (let i = 0; i < missingIds.length; i++) {
          let onDoneListener = new PromiseUtils.EwsEventListener("OnDone", null);
          mailbox.getItemAsync(missingIds[i], onDoneListener);
          let onDoneResult = await onDoneListener.promise;
          if (onDoneResult.status != Cr.NS_OK) {
            log.config("error getting item from database");
            continue;
          }

          let item = onDoneResult.item;
          let properties = item.properties;
          if (!properties || !properties.length) {
            log.config("Missing properties");
            continue;
          }

          if (item.flags & (item.AllLocally |
                            item.Dirty |
                            item.HasTempId)) {
            log.debug("Message with flags needing update, flags are (hex): " + item.flags.toString(16));
            continue;
          }

          item.raiseFlags(item.NewOnServerBit);
          this._reconcileItem(item, false);
          let putItemListener = new PromiseUtils.DatastoreListener();
          datastore.putItem(item, putItemListener);
          await putItemListener.promise;
        }

        database.summaryValid = true;
        database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);

        // At this point, we have updated Mork from the existing valid db
        //  info. For other issues, we will simply flag the item as needing
        //  resync, persist, and let the next update fix it.
        if (resyncIds.length)
          log.info("Raising and persisting items as NeedsResync during folder resync");
        for (let resyncId of resyncIds) {
          let onDoneListener = new PromiseUtils.EwsEventListener("OnDone", null);
          mailbox.getItemAsync(resyncId, onDoneListener);
          let result = await onDoneListener.promise;
          if ( (result.status != Cr.NS_OK) || !result.item) {
            log.warn("Could not get item, skipping resync");
            continue;
          }
          let item = result.item;
          item.raiseFlags(item.NeedsResync);
          let datastoreListener = new PromiseUtils.DatastoreListener;
          datastore.putItem(item, datastoreListener);
          await datastoreListener.promise;
        }

        // add any missing items to datastore with NeedsResync
        if (dbMissingIds.length)
          log.info("Adding and flagging items present on server but not in native datastore");
        for (let itemIndex of dbMissingIds) {
          let serverItem = serverItems.getPropertyListAt(itemIndex);
          let itemId = serverItem.getAString("ItemId");
          let itemClass = serverItem.getAString("ItemClass");
          let missingItem = mailbox.createItem(itemId, itemClass, this._nativeFolder);
          missingItem.raiseFlags(missingItem.NeedsResync);
          let putItemListener = new PromiseUtils.DatastoreListener();
          datastore.putItem(missingItem, putItemListener);
          await putItemListener.promise;
        }

        // delete any item in the native datastore without corresponding server item
        if (extraIds.length)
          log.info("Deleting items in native datastore that are not on server");
        for (let itemId of extraIds) {
          let deleteListener = new PromiseUtils.DatastoreListener();
          datastore.deleteItemById(itemId, deleteListener);
          await deleteListener.promise;
        }

        // Now that we have restored everything, clean up folder info
        let folderInfo = database.dBFolderInfo;
        folderInfo.imapTotalPendingMessages = 0;
        folderInfo.imapUnreadPendingMessages = 0;
        this.updateSummaryTotals(true);
        database.summaryValid = true;
        database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
        return Cr.NS_OK;
      })();
    } catch (ex) {
      this._resyncInProcess = false;
      let longFolderName = this.name + " (" + this.server.prettyName + ")" + ":";
      showStatusFeedbackString("doneResyncingFolder", longFolderName);
      log.info("Error in resyncFromNative: " + ex);
      if (urlListener) {
        executeSoon( () => urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE));
      }
      return;
    }
    this._resyncInProcess = false;
    let longFolderName = this.name + " (" + this.server.prettyName + ")" + ":";
    log.config("Done syncing folder " + longFolderName);
    showStatusFeedbackString("doneResyncingFolder", longFolderName);
    if (urlListener) {
      executeSoon( () => urlListener.OnStopRunningUrl(null, result));
    }
  },

  /// get the Skink key from an EWS itemId
  /// returns undefined if missing.
  keyFromId(aItemId) {
    return  this._itemIdKeyMap.get(aItemId);
  },

  /// get the itemId from the Skink key
  idFromKey(aKey) {
    let msgHdr = this.msgDatabase.GetMsgHdrForKey(aKey);
    return msgHdr.getProperty("ewsItemId");
  },

  removeKeyFromId(itemId) {
    this._itemIdKeyMap.delete(itemId);
  },

  clearKeyFromId() {
    this._itemIdKeyMap.clear();
  },

  putKeyFromId(key, itemId) {
    this._itemIdKeyMap.set(itemId, key);
  },

  /// number of new native messages that have not been reported to skink
  get numNewNativeMessages() { return this._numNewNativeMessages;},
  set numNewNativeMessages(a) { this._numNewNativeMessages = a;},

  /// reindex the skink database from the local datastore
  // void reindex(in nsIMsgWindow aWindow, in nsIUrlListener aListener);
  reindexExperiment(aWindow, urlListener) {
    log.config("msqEwsMailFolder reindex");
    if (!this._useMail)
      throw CE("mail not available", Cr.NS_ERROR_NOT_AVAILABLE);

    this.initNativeFolder();
    let nativeFolder = this._nativeFolder;
    let datastore = this.nativeMailbox.datastore;

    (async () => {
      let result;
      try {
        result = await (async () => {
          this._repairInProcess = true;
          this._updateInProcess = false;

          // Because folder update is relatively slow, we do not want to restart it if interrupted.
          if (this.getStringProperty("Exquilla-Reindexing") != "true") {
            log.debug("Exquilla-Reindexing is false, starting reindex");

            // setup a call to clear data
            log.info("Reindex folder is deleting datastore items in folder: " + this.prettyName);
            let deleteListener = new PromiseUtils.DatastoreListener();
            datastore.deleteDataFromFolder(nativeFolder.folderId, deleteListener);
            let deleteResult = await deleteListener.promise;

            if (deleteResult.status != Cr.NS_OK)
              throw CE("Failed to delete items from native datastore", deleteResult.status);

            // set the sync state to null since the native db is now deleted
            let setSyncListener = new PromiseUtils.DatastoreListener();
            datastore.setSyncState(nativeFolder, "", setSyncListener);
            let setSyncResult = await setSyncListener.promise;

            if (setSyncResult.status != Cr.NS_OK)
              throw CE("Failed to set sync state", setSyncResult.status);

            this.setStringProperty("Exquilla-Reindexing", "true");
          }

          // Use native methods to update the database.
          {
            let listener = new PromiseUtils.MachineListener();
            // xxx to do - what about attachments?
            this.nativeMailbox.getNewItems(nativeFolder, listener);
            let result = await listener.promise;
            if (result.status != Cr.NS_OK)
              throw CE("getNewItems failed during reindex");
          }

          // Now the native database should be valid, so resync to it.
          {
            this._repairInProcess = false;
            let resyncListener = new PromiseUtils.UrlListener()
            this.resyncFromNative(true, resyncListener);
            let resyncResult = await resyncListener.promise;
            if (resyncResult != Cr.NS_OK)
              throw CE("Failed to resync from native after reindex");
          }

          // do a final update to catch any items flagged as needing resync
          let listener = new PromiseUtils.UrlListener();
          this.updateFolderWithListener(null, listener);
          let updateResult = await listener.promise;
          if (updateResult != Cr.NS_OK)
            throw CE("Failed to update folder after reindex");
          return updateResult;

        })();
      } catch (ex) {
        ex.code = "error-reindex";
        log.error("Error in reindex", ex);
        this._repairInProcess = false;
        this.setStringProperty("Exquilla-Reindexing", "false");
        if (urlListener) {
          executeSoon( () => urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE));
        }
        return;
      }
      log.info("Reindex completed successfully");
      this._repairInProcess = false;
      this.setStringProperty("Exquilla-Reindexing", "false");
      if (urlListener) {
        executeSoon( () => urlListener.OnStopRunningUrl(null, result));
      }
    })();
  },

  reindex(aWindow, urlListener) {
    log.config("msqEwsMailFolder reindex folder " + this.name);

    if (!this._useMail)
      throw CE("mail not available", Cr.NS_ERROR_NOT_AVAILABLE);
    let database = this.msgDatabase;
    if (!database)
      throw CE("Could not get database");

    this.initNativeFolder();
    let mailbox = this.nativeMailbox;
    let datastore = mailbox.datastore;
    let server = this.server;
    let ewsServer = safeGetJS(server, "EwsIncomingServer");

    (async () => {
      let result;
      try {
        result = await (async () => {
          // missing password message
          if (!mailbox.password)
          {
            showStatusFeedback("PasswordMissing");
            ewsServer.promptPassword();
            return Cr.NS_OK;
          }

          // Here's the general plan.
          //
          // 1. Enumerate through all messages in the Skink db, and set REINDEX_FLAG
          // 2. Delete the local datastore, and get it again as new
          // 3. Lookup each native item in the list in Skink. If found, reset REINDEX_FLAG
          //    and update from the native item. If not found, add.
          // 4. Enumerate again all Skink messages, deleting any that are still marked REINDEX_FLAG.

          this._repairInProcess = true;
          this._updateInProcess = false;

          // Because folder update is relatively slow, we do not want to restart it if interrupted.
          //  But at the end, we have to purge messages that are not valid. So what we
          //  will do is to set summaryValid to true as soon as both the mork db and the native
          //  db are "in sync" by being empty, but continue the reindex process if a folder
          //  property is set.
          if (this.getStringProperty("Exquilla-Reindexing") != "true") {
            log.debug("Exquilla-Reindexing is false, starting reindex");
            database.summaryValid = false;
            this.setStringProperty("Exquilla-Reindexing", "true");
          }
          else
            log.debug("Exquilla-Reindexing is true, continuing reindex");

          let unreadExistingCount, totalExistingCount;
          if (!database.summaryValid)
          {
            // set expunge bit, and remap the id to keys.
            log.config("remapping in reindex");
            [unreadExistingCount, totalExistingCount] = this._remap(true);
          }

          // event Initial
          this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, false, false);
          let folderName = this.prettyName;

          // get the folder id
          do { // break when done or error
            if (this.folderId)
              break; // Success!
            log.warn("Empty folder id, trying to find from parent");
            let ewsParent = safeGetJS(this.parent, "EwsMsgFolder");
            if (!ewsParent)
              break;
            if (!ewsParent.folderId)
              break;
            let nativeParent = mailbox.getNativeFolder(ewsParent.folderId);
            if (!nativeParent)
              break;
            mailbox.updateSubfolderIds();
            let subfolderIds = nativeParent.subfolderIds;
            if (!subfolderIds)
              break;
            for (let i = 0; i < subfolderIds.length; i++)
            {
              let nativeFolder = mailbox.getNativeFolder(subfolderIds.getAt(i));
              if (!nativeFolder)
                continue;
              if (nativeFolder.displayName == folderName)
              {
                // success!
                this.folderId = nativeFolder.folderId;
                break;
              }
            }

          } while (false); // end of attempt to get folderId

          if (!this.folderId)
          {
            log.warn("Could not find folder id, reindex fails");
            return Cr.NS_ERROR_FAILURE;
          }
          let nativeFolder = mailbox.getNativeFolder(this.folderId);

          // Reindex can be recalled if interrupted. We use summaryValid to track
          //  whether we need to start over, and delete all data.
          if (!database.summaryValid)
          {
            // setup a call to clear data
            log.info("Reindex folder is setting resync flag on items in folder: " + folderName);
            let deleteListener = new PromiseUtils.DatastoreListener();
            datastore.deleteDataFromFolder(nativeFolder.folderId, deleteListener);
            let deleteResult = await deleteListener.promise;

            if (deleteResult.status != Cr.NS_OK)
              throw CE("Failed to delete items from native datastore", deleteResult.status);
          }
          // end Initial, begin WaitDeleteData

          if (!database.summaryValid)
          {
            // set the sync state to null since the native db is now all expunged
            let setSyncListener = new PromiseUtils.DatastoreListener();
            datastore.setSyncState(nativeFolder, "", setSyncListener);
            let setSyncResult = await setSyncListener.promise;

            if (setSyncResult.status != Cr.NS_OK)
              throw CE("Failed to set sync state", setSyncResult.status);

            // At this point, the skink message db and the native db are "in sync" by
            //  being empty or flagged. Make sure that counts agree.
            // Pending numbers are used to match the skink folder values to the native
            // folder values, so make sure that pending is set correctly.

            // First, let's update the folder itself.
            {
              let listener = new PromiseUtils.MachineListener();
              mailbox.getFolder(nativeFolder, listener);
              let result = await listener.promise;
              if (result.status != Cr.NS_OK)
                throw CE("Failed to get folder");
            }

            this.changeNumPendingUnread( nativeFolder.unreadCount - unreadExistingCount - this.numPendingUnread);
            this.changeNumPendingTotalMessages( nativeFolder.totalCount - totalExistingCount - this.numPendingTotalMessages);
            database.summaryValid = true;
            this.updateSummaryTotals(true); // set folder values from DB
            log.config("Pre-get counts: skink pending unread = " + this.numPendingUnread +
                      ", native unread = " + nativeFolder.unreadCount +
                      ", skink unread = " + this.getNumUnread(false) +
                      ", skink total pending = " + this.numPendingTotalMessages +
                      ", native total = " + nativeFolder.totalCount +
                      ", skink total = " + this.getTotalMessages(false));
          }

          // get all items. Accumulate datastore promises.
          let promises = [];
          let numChangedMessages = 0;
          let getNewListener = new PromiseUtils.MachineListener(
            (aItem, aEvent, aData, aResult) => {
              if (aEvent == "ItemChanged") 
              {
                let item = aData;
                if (!(item.processingFlags & item.DidNotChange)) {
                  this._reconcileItem(item, true);

                  // Store the change flags after reconcile. Hard to propagate
                  // an error here, so we will just report any issue.
                  let datastoreListener = new PromiseUtils.DatastoreListener();
                  mailbox.datastore.putItem(item, datastoreListener);
                  promises.push((async () => {
                    try {
                      let result = await datastoreListener.promise;
                      if (result.status != Cr.NS_OK)
                        log.warn("Error saving item in database");
                    } catch (ex)  {
                      log.warn("Error saving item in database: " + ex);
                    }
                  })());
                }
                mailbox.activityListener.onDownloadProgress(this, ++numChangedMessages, 0);
              }
            }
          );
          mailbox.getNewItems(nativeFolder, getNewListener);
          let result = await getNewListener.promise;

          if (result.status != Cr.NS_OK)
            throw CE("Failed to getNewItems in reindex", result.status);

          log.debug("Datastore accumulated " + promises.length + " promises");
          await Promise.all(promises);

          // state StopMachine after processing getNewItems
          // Now we will delete all messages that still have expunged status

          // I think that when I try to delete messages in the middle of
          //  an enumeration, it confuses the database. So what I will
          //  try is to save the keys, then delete by key after I
          //  have established a delete list. That's how IMAP does it.

          let keysToDelete = [];

          // ListAllKeys should work, but instead causes a Microsoft error complaining
          //  about the heap. So I will get the keys another way, through enumeration.
          let hdrs = database.EnumerateMessages();
          let hdrCount = 0;
          while (hdrs.hasMoreElements())
          {
            hdrCount++;
            let hdr = hdrs.getNext().QueryInterface(Ci.nsIMsgDBHdr);
            if (hdr.flags & REINDEX_FLAG)
            {
              // schedule this header to delete
              keysToDelete.push(hdr.messageKey);
              hdr.flags &= ~REINDEX_FLAG;
            }
          }

          // now delete the keys (borrowed from ImapFolder)
          log.debug("Database has " + hdrCount + " headers");
          log.debug("Need to delete " + keysToDelete.length + " headers");
          if (keysToDelete.length)
          {
            let unreadToDelete = 0;
            let hdrsToDelete = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
            for (let key of keysToDelete) {
              if (database.ContainsKey(key)) {
                let hdr = database.GetMsgHdrForKey(key);
                if (!hdr.isRead)
                  unreadToDelete++;
                hdrsToDelete.appendElement(hdr, false);
              }
            }

            // Notify nsIMsgFolderListeners of a mass delete, but only if we actually have headers
            if (hdrsToDelete.length)
            {
              // adjust the pending messages
              if (unreadToDelete)
                this.changeNumPendingUnread(unreadToDelete);
              this.changeNumPendingTotalMessages(hdrsToDelete.length);
              let notifier = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
                               .getService(Ci.nsIMsgFolderNotificationService);
              if (database.deleteMessages.length == 3) { /* COMPAT for TB 68 */
                notifier.notifyMsgsDeleted(hdrsToDelete);
                database.deleteMessages(keysToDelete.length, keysToDelete, null);
              } else { /* COMPAT for TB 68 */
                notifier.notifyMsgsDeleted(toArray(hdrsToDelete, Ci.nsIMsgDBHdr));
                database.deleteMessages(keysToDelete, null);
              } // COMPAT for TB 68
            }
          }

          database.dBFolderInfo.imapTotalPendingMessages = 0;
          database.dBFolderInfo.imapUnreadPendingMessages = 0;
          this.setStringProperty("Exquilla-Reindexing", "false");
          this.updateSummaryTotals(true);
          database.summaryValid = true;
          database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
          return Cr.NS_OK;

        })();
      } catch (ex) {
        ex.code = "error-reindex";
        log.error("Error in reindex", ex);
        log.debug("_repairInProcess now false");
        this._repairInProcess = false;
        this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, true, false);
        this._notifyFolderLoaded();
        if (urlListener) {
          executeSoon( () => urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE));
        }
        return;
      }
      this._repairInProcess = false;
      this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, true, false);
      this._notifyFolderLoaded();
      if (urlListener) {
        executeSoon( () => urlListener.OnStopRunningUrl(null, result));
      }
    })();
  },

/**/
  /// Delete local representation of messages (in nsIArray aMessages)
  deleteLocalMessages(messages)
  {
    log.config("msqEwsMailFolder.deleteLocalMessages length " + messages.length);
    if (!this._useMail)
      throw CE("mail not available", Cr.NS_ERROR_NOT_AVAILABLE);
    let database = this.msgDatabase;
    if (!database)
      throw CE("Could not get database");

    this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, false, true);
    let mailbox = this.nativeMailbox;
    if (!mailbox)
      throw CE("Missing mailbox");

    for (let i = 0; i < messages.length; ++i)
    {
      let message = messages.queryElementAt(i, Ci.nsIMsgDBHdr);
      let itemId = message.getProperty("ewsItemId");
      if (itemId)
      {
        this._itemIdKeyMap.delete(itemId);
        let nativeItem = mailbox.getItem(itemId);
        if (nativeItem)
        {
          nativeItem.deleted = true;
          // Since we are bringing the item into sync with the native store,
          //  we should clear the OnServer flags
          //nativeItem.clearFlags(nativeItem.AllOnServer);
        }
      }
      else
        log.warn("native item could not be found while deleting skink/ews message");
      log.debug("deleting message iwth key " + message.messageKey);
      database.DeleteHeader(message, null, false, true);
    }

    // we are the source folder here for a move or shift delete
    this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, true, true);
  },

  /// Copy local messages from one folder to this one
  copyLocalMessages(aSrcMessages, aDestMessages, aNewItems) {
    log.config("msqEwsMailFolder.copyLocalMessages");
    if (!this._useMail)
      throw CE("Mail not available", Cr.NS_ERROR_NOT_AVAILABLE);
    let database = this.msgDatabase;

    let mailbox = this.nativeMailbox;
    if (!mailbox)
      throw CE("Mailbox not found for folder");

    let messageCount = aSrcMessages.length;
    let itemCount = aNewItems.length;
    if (itemCount != messageCount)
    {
      log.error("CopyLocalMessages count mismatch");
      throw CE("CopyLocalMessages count mismatch");
    }

    this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, false, true);
    for (let i = 0; i < messageCount; ++i)
    {
      let message = aSrcMessages.queryElementAt(i, Ci.nsIMsgDBHdr);

      let nativeItem = aNewItems.queryElementAt(i, Ci.nsISupports).wrappedJSObject;
      if (!nativeItem)
      {
        log.error("Could not QI to nativeItem");
        continue;
      }
      let newId = nativeItem.itemId;
      // we can't have a duplicate by itemId
      if (newId)
      {
        if (this.keyFromId(newId))
        {
          log.warn("folder already has an item with this id");
          continue;
        }
      }
      // Get a new key, and make sure it is really new
      let key = ++this._highWater;
      while (database.ContainsKey(key))
        key = ++this._highWater;
      database.dBFolderInfo.highWater = key;

      let newHdr = database.CopyHdrFromExistingHdr(key, message, true);
      if (!newHdr)
      {
        log.config("Could not create copied header");
        continue;
      }
      newHdr.setProperty("ewsItemId", newId);
      this._itemIdKeyMap.set(newId, key);
      aDestMessages.appendElement(newHdr, false);

      // update native item flags
      nativeItem.clearFlags(nativeItem.AllOnServer);
    }
    this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, true, true);
  },

  // adapted from nsMsgLocalMailFolder::CopyFolderLocal
  // XXX converted without testing.
  copyFolderLocal(srcFolder, isMoveFolder, msgWindow, listener)
  {
    if (!this._useMail)
      throw CE("Mail not available", Ci.NS_ERROR_NOT_AVAILABLE);
    this._initialized = true;
    let safeFolderName = getSanitizedFolderName(srcFolder.name);
    // It's hard to believe this is going to actually work, as DBs will stay open
    // until GC.
    srcFolder.ForceDBClosed();

    let oldPath = srcFolder.filePath;
    let summaryFile = getSummaryFileLocation(oldPath);
    let newPath = this.filePath.clone();
    addDirectorySeparator(newPath);

    if (!newPath.exists())
    {
      newPath.create(Ci.nsIFile.DIRECTORY_TYPE, 0o700);
    }

    if (checkIfFolderExists(srcFolder.name, this)) {
      if (msgWindow)
        this.throwAlertMsg("folderExists", msgWindow);
      throw CE("Folder exists", Cr.NS_ERROR_FOLDER_EXISTS);
    }

    let origPath = oldPath.clone();
    log.config("Copying " + origPath.path + " to " + newPath.path);
    oldPath.copyTo(newPath, "");   //copying necessary for aborting.... if failure return
    //would fail and throw if a file by that name exists

    // Copy to dir can fail if filespec does not exist. If copy fails, we test
    // if the filespec exist or not, if it does not that's ok, we continue
    // without copying it. If it fails and filespec exist and is not zero sized
    // there is real problem
    summaryFile.copyTo(newPath, "");      // Copy the file to the new dir

    let folderLeafName = origPath.leafName;
    newPath.append(folderLeafName);
    let msgDBService = Cc["@mozilla.org/msgDatabase/msgDBService;1"]
                         .getService(Ci.nsIMsgDBService);
    let destDB;
    try {
      destDB = msgDBService.openMailDBFromFile(newPath, null, false, true);
    } catch (e) {
      if (e.result == Cr.NS_MSG_ERROR_FOLDER_SUMMARY_OUT_OF_DATE && destDB)
        destDB.summaryValid = true;
      else
        log.warn("Error opening database: " + e);
    }

    let newMsgFolder = this.addSubfolder(safeFolderName);
    newMsgFolder.flags = srcFolder.flags;
    newMsgFolder.prettyName = srcFolder.name;
    let changed = srcFolder.matchOrChangeFilterDestination(newMsgFolder, true);
    if (changed)
      srcFolder.alertFilterChanged(msgWindow);

    // Copy subfolders to the new location
    let enumerator = srcFolder.subFolders;
    let ewsNewFolder = safeGetJS(newMsgFolder, "EwsMsgFolder");
    {
      while (enumerator.hasMoreElements())
      {
        let item = enumerator.getNext().QueryInterface(Ci.nsIMsgFolder);
        // false needed to avoid un-necessary deletions
        ewsNewFolder.copyFolderLocal(folder, false, msgWindow, listener);
      }
    }

    if (isMoveFolder && ewsNewFolder)
    {
      ewsNewFolder.onCopyCompleted(srcFolder, Cr.NS_OK);
    }

    //notifying the "folder" that was dragged and dropped has been created.
    //no need to do this for its subfolders - isMoveFolder will be true for "folder"
    this.NotifyItemAdded(newMsgFolder);
    let msgParent = srcFolder.parent;
    srcFolder.parent = null;
    if (msgParent)
    {
      // The files have already been moved, so delete storage PR_FALSE
      // ???
      //msgParent.propagateDelete(srcFolder, false, msgWindow);
      //oldPath.remove(false);  // dummy file
      //srcFolder.Delete();
      msgParent.propagateDelete(srcFolder, true, msgWindow);


      //let parentPath = msgParent.filePath.clone();
      //addDirectorySeparator(parentPath);
      //let children = parentPath.directoryEntries;
      // checks if the directory is empty or not
      //if (children && children.hasMoreElements())
        //parentPath.remove(true);
    }
  },

  // srcSupport is either an nsIFile or nsIMsgFolder
  onCopyCompleted(src, aResult) {
    let srcSupports = src.QueryInterface(Ci.nsISupports);
    log.debug("ewsMsgFolderComponent onCopyCompleted");
    if (aResult != Cr.NS_OK) {
      log.error("Copy failed for folder " + this.prettyName);
    }

    // When the copy proceeds without async intermediary, then the base code crashes in nsMsgFilterService here:
    // for (PRUint32 msgIndex = 0; msgIndex < m_searchHits.Length(); msgIndex++)
    // (for base code that I added :(
    // prevent that by forcing async
    // copyService->NotifyCompletion(srcSupport, dstFolder, result);
    executeSoon( () => {
      //let dstFolder = this.QueryInterface(Ci.nsIMsgFolder);
      // the copy service does a direct compare of msgFolder, so we have
      // to pass the C++ delegator here
      MailServices.copy.NotifyCompletion(srcSupports, this.delegator, aResult);
    });
  },

    // nsIMsgFolder overrides

  get msgDatabase() {
    // JsAccount GetDatabase() set summaryValid as false?
    if (this._databaseInited)
      return this.cppBase.msgDatabase;

    // Initialization
    this._databaseInited = true;
    let database;
    try {
      database = this.cppBase.msgDatabase;
    } catch (ex) {
      if (![Cr.NS_OK, Cr.NS_MSG_ERROR_FOLDER_SUMMARY_OUT_OF_DATE].includes(ex.result)) {
        // database open error
        throw CE("Database open error ", ex.result);
      }
    }
    database.summaryValid = true;
    this._remap();
    return database;
  },

  set msgDatabase(a) {
    this.cppBase.msgDatabase = a;
  },

  get deletable() {
    // anything with a distinguished folder id is not deletable
    let isDeletable = true;
    if (this._nativeFolder && this._nativeFolder.distinguishedFolderId)
    {
       isDeletable = false;
    }
    return isDeletable;
  },

  createSubfolder(folderName, aMsgWindow) {
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);

    log.config("CreateSubfolder named " + folderName);
    let exqServer = safeGetJS(this.server, "EwsIncomingServer");
    exqServer.createSubfolder(this, folderName);
  },

  deleteSubFolders(folders, msgWindow) {
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);

    // xxx todo: support move on delete
    let folderIds = new StringArray();

    for (let i = 0; i < folders.length; i++)
    {
      let skinkFolder = folders.queryElementAt(i, Ci.nsIMsgFolder);
      log.config("deleteSubfolder " + skinkFolder.name);
      if (skinkFolder.getFlag(Ci.nsMsgFolderFlags.Virtual))
      {
        log.config("deleting virtual folder");
        skinkFolder.parent.propagateDelete(skinkFolder, true, msgWindow);
        continue;
      }

      let exqFolder = safeGetJS(skinkFolder, "EwsMsgFolder");
      folderIds.append(exqFolder.folderId);
    }
    if (!folderIds.length) {
      throw CE("No folders found to delete\n");
    }

    let exqServer = safeGetJS(this.server, "EwsIncomingServer");
    exqServer.deleteSubfolders(folderIds);
  },

  get subFolders() {
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);

    if (!this._initialized)
    {
      this._initialized = true; // need to set this flag here to avoid infinite recursion
      let path = this.filePath;
      log.debug("get subFolders() for path " + path.path);

      // host directory does not need .sbd tacked on
      if (!this.isServer)
        path.leafName = path.leafName + FOLDER_SUFFIX;

      if (!path.exists())
        path.create(Ci.nsIFile.DIRECTORY_TYPE, 0o700);

      let newFlags = Ci.nsMsgFolderFlags.Mail;
      if (path.isDirectory())
      {
        newFlags |= (Ci.nsMsgFolderFlags.Directory | Ci.nsMsgFolderFlags.Elided);
        if (!this.isServer)
          this.setFlag(newFlags);

        // now, "discover" those folders, which here means to create the nsIMsgDBFolder
        //  instance for each mail folder present in the local file tree.
        this._createSubFolders(path);

        // we need to create all the folders at start-up because if a folder having
        //   subfolders is closed then the datasource will not ask for subfolders.
        let subFoldersEnum = this.cppBase.subFolders;
        while (subFoldersEnum.hasMoreElements()) {
          let childSubs = subFoldersEnum.getNext()
                                        .QueryInterface(Ci.nsIMsgFolder)
                                        .subfolders;
        }
      }
      this.updateSummaryTotals(false);
    }

    return this.cppBase.subFolders;
  },

  get messages() {
    return this.msgDatabase.EnumerateMessages();
  },

  updateFolder(aMsgWindow) {
    this.updateFolderWithListener(aMsgWindow, null);
  },

  get folderURL() {
    let path = this.filePath;
    let fileurl = Services.io.newFileURI(this.filePath);
    if (Ci.nsIURIMutator) { // TB 60
      fileurl = fileurl.mutate().setScheme("ews-mailbox").finalize();
    } else {
      fileurl.scheme = "ews-mailbox";
    }
    return fileurl.spec;
  },

  getNewMessages(aWindow, urlListener) {
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);

    log.config("ewsMsgFolderComponent.getNewMessages");

    let rootFolder = this.rootFolder;

    (async () => {
      let result;
      try {
        result = await (async () => {
          let ewsServer = safeGetJS(this.server, "EwsIncomingServer");
          if (ewsServer.unavailable != ewsServer.AVAILABLE)
          {
            // We'll do a server expand instead, which contains the logic to check online.
            log.debug("GetNewMessages doing an expand due to serverUnavailable value");
            let listener = new PromiseUtils.UrlListener();
            ewsServer.performExpandAsync(aWindow, listener);
            let result = await listener.promise;
            return result;
          }

          let folders;
          // check for preference check_all_folders_for_new
          // let checkAll = this.server.getBoolValue("check_all_folders_for_new");
          // This is now handled using notifications
          let checkAll = false;
          if (checkAll)
          {
            folders = rootFolder.descendants;
          }
          else
          {
            let inbox = rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Inbox);
            if (inbox)
              inbox.setFlag(Ci.nsMsgFolderFlags.CheckNew);

            folders = rootFolder.getFoldersWithFlags(Ci.nsMsgFolderFlags.CheckNew);
          }

          if (!folders.length)
            log.debug("No folders found for GetNewMessages");

          if (urlListener)
            urlListener.OnStartRunningUrl(null);

          // Cripple point: don't proceed with invalid license
          if (!(await EnsureLicensed())) {
            let bundle = Services.strings.createBundle("chrome://exquilla/locale/settings.properties");
            throw CE(bundle.GetStringFromName("noLicenseFound"));
          }

          for (let folder of toArray(folders, Ci.nsIMsgFolder))
          {
            let ewsFolder = safeGetJS(folder, "EwsMsgFolder");

            let listener = new PromiseUtils.UrlListener();
            ewsFolder.updateFolderWithListener(aWindow, listener);
            let result = await listener.promise;
            if (!CS(result))
              log.warn("Error return for updateFolderWithListener for folder " + folder.name);
          }

          return Cr.NS_OK;
        })();
      } catch (ex) {
        ex.code = "error-get-new-messages";
        log.error("Error in getNewMessages", ex);
        if (urlListener) {
          executeSoon( () => urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE));
        }
        if (aWindow && aWindow.statusFeedback) {
          aWindow.statusFeedback.showStatusString(ex.message);
        }
        return;
      }
      if (urlListener) {
        executeSoon( () => urlListener.OnStopRunningUrl(null, result));
      }
    })();
  },

  downloadAllForOffline(urlListener, msgWindow) {
    log.config("downloadAllForOffline for folder " + this.name);
    if (this._updateInProgress) {
      this.throwAlertMessage("operationFailedFolderBusy", msgWindow);
    }
    this._updateInProgress = true;

    let database = null;
    try {
      database = this.msgDatabase;
    } catch (ex) {}
    if (!database)
    {
      log.warn("Failed to get message database when downloading all messages");
      throw CE("Failed to get message database when downloading all messages");
    }

    (async () => {
      try {
        let messagesEnum = database.EnumerateMessages();
        let mailbox = this.nativeMailbox;
        let messageCount = 0;
        this.initNativeFolder();
        if (mailbox.activityListener)
          mailbox.activityListener.onDownloadStarted(this._nativeFolder);

        while(messagesEnum.hasMoreElements()) {
          let currentMessage = messagesEnum.getNext().QueryInterface(Ci.nsIMsgDBHdr);
          log.debug("Checking need to download message " + currentMessage.mime2DecodedSubject);

          let itemId = currentMessage.getProperty("ewsItemId");
          if (!itemId) {
            log.warn("Could not get itemId from message header");
            continue;
          }

          let onDoneListener = new PromiseUtils.EwsEventListener("OnDone", null);
          mailbox.getItemAsync(itemId, onDoneListener);
          let onDoneResults = await onDoneListener.promise;
          if (!(CS(onDoneResults.status))) {
            log.warn("Failed to get item from datastore");
            continue;
          }
          let nativeItem = onDoneResults.item;

          // see if there is anything to do
          let getMessage = false;
          do {
            if (!(currentMessage.flags & Ci.nsMsgMessageFlags.Offline)) {
              getMessage = true;
              break;
            }

            // also check the native object
            if (!nativeItem.properties ||
                !nativeItem.properties.length ||
                !(nativeItem.flags & nativeItem.HasOfflineBody)) {
              getMessage = true;
              break;
            }

            // are all attachments downloaded?
            for (let index = 0; index < nativeItem.attachmentCount; index++) {
              let attachment = nativeItem.getAttachmentByIndex(index);
              if (!attachment) {
                log.warn("Could not get expected attachment");
                continue;
              }
              if (!attachment.downloaded) {
                getMessage = true;
                break;
              }
            }
          } while (false);

          if (getMessage) {
            let listener = new PromiseUtils.MachineListener();
            mailbox.getItemOffline(nativeItem, listener);
            let result = await listener.promise;
            currentMessage.OrFlags(Ci.nsMsgMessageFlags.Offline);
            database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
            if (mailbox.activityListener)
              mailbox.activityListener.onDownloadProgress(this._nativeFolder, ++messageCount, 0);
          }
        }

        // We are done
        this._updateInProgress = false;
        if (mailbox.activityListener)
          mailbox.activityListener.onDownloadCompleted(this._nativeFolder, messageCount);

      } catch (ex) {
        ex.code = "error-get-new-messages";
        log.error("Error in getNewMessages", ex);
        this._updateInProgress = false;
        if (urlListener) {
          executeSoon( () => urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE));
        }
      }
      if (urlListener) {
        executeSoon( () => urlListener.OnStopRunningUrl(null, Cr.NS_OK));
      }
    })();
  },

  addSubfolder(name) {
    let child;
    // Allow duplicate names
    let suffix = "";
    let success = false;
    for (let itrial = 1; itrial <= 5; itrial++) {
      try {
        log.debug("AddSubfolder with name " + name + suffix);
        child = this.cppBase.addSubfolder(name + suffix);
        success = true;
        break;
      } catch(e) {
        const NS_MSG_FOLDER_EXISTS = 0x80550013;
        if (e.result == NS_MSG_FOLDER_EXISTS) {
          log.config("Folder already exists in addSubfolder: " + name);
          suffix = "-" + itrial;
          continue;
        }
        e.code = "error-add-subfolder";
        e.parameters = name;
        log.error("Could not create subfolder " + name, e);
        // probably what happened is that RDF has loaded a bogus resource with the
        //  same url. What we have to do is to duplicate the URI-calculating stuff
        //  in AddFolder, and unregister the resource. So copy from AddFolder

        // I used to correct for this, but I think I have fixed the underlying issues.
        throw e;
      }
    }
    if (!success)
      throw CE("Could not create subfolder, too many duplicates");

    this._createDummyFile(child);
    child.updateSummaryTotals(true);

    // Virtual folder listeners are added from the account manager. Do not
    //  do this notification for them, as that way you get 2 listeners.
    if (!child.getFlag(Ci.nsMsgFolderFlags.Virtual))
      this.NotifyItemAdded(child);

    // Don't keep the child db open here, except the inbox
    if (!child.getFlag(Ci.nsMsgFolderFlags.Inbox))
      child.msgDatabase = null;
    return child;
  },

  // This deletes the local representation only.
  Delete() {
    log.config("Delete() called on folder " + this.name);
    let msgDBService = Cc["@mozilla.org/msgDatabase/msgDBService;1"]
                         .getService(Ci.nsIMsgDBService);
    let database = msgDBService.cachedDBForFolder(this);
    if (database) {
      database.ForceClosed();
      this.msgDatabase = null;
    }

    let pathFile = this.filePath;
    let summaryFile = getSummaryFileLocation(pathFile);

    // Remove summary file.
    summaryFile.remove(false);

    // Delete fake mailbox
    pathFile.remove(false);

    // Clean up .sbd folder if it exists.
    addDirectorySeparator(pathFile);
    if (pathFile.exists() && pathFile.isDirectory())
      pathFile.remove(true);

    // Make sure this is gone in RDF (though this may cause issues during destruction)
    let rdf = Cc["@mozilla.org/rdf/rdf-service;1"]
               .getService(Ci.nsIRDFService);
    rdf.UnregisterResource(this.cppBase.QueryInterface(Ci.nsIRDFResource));

    // null parent means an invalid folder.
    this.parent = null;
  },

  getDBFolderInfoAndDB(folderInfoObject)
  {
    let notOpen = !this.databaseOpen;
    let database = this.msgDatabase.QueryInterface(Ci.nsIDBChangeAnnouncer);
    if (notOpen)
      database.AddListener(this.delegator);
    folderInfoObject.value = database.dBFolderInfo;
    return database;
  },

  Shutdown(a) {
    this._initialized = false;
    this.cppBase.Shutdown(a);
  },

  onMessageClassified(aMsgURI, aClassification, aJunkPercent)
  {
    let spamSettings = this.server.spamSettings;
    let spamFolderURI = spamSettings.spamFolderURI;
    let spamKeysToMove = [];

    if (aMsgURI) // not end of batch
    {
      let msgHdr = getMsgDBHdrFromURI(aMsgURI);
      let processingFlags = this.getProcessingFlags(msgHdr.messageKey);

      // check if this message needs junk classification
      if (processingFlags & Ci.nsMsgProcessingFlags.ClassifyJunk)
      {
        this.cppBase.onMessageClassified(aMsgURI, aClassification, aJunkPercent);

        if (aClassification == Ci.nsIJunkMailPlugin.JUNK)
        {
          let willMoveMessage = false;

          // don't do the move when we are opening up
          // the junk mail folder or the trash folder
          // or when manually classifying messages in those folders
          if (!(this.flags & (Ci.nsMsgFolderFlags.Junk | Ci.nsMsgFolderFlags.Trash)))
          {
            if (spamSettings.moveOnSpam)
            {
              if (folder)
              {
                folder.setFlag(Ci.nsMsgFolderFlags.Junk);
                spamKeysToMove.push(msgHdr.messageKey);
                willMoveMessage = true;
              }
              else
              {
                // Previously we called GetOrCreateFolder, but we do not have direct
                // access to this. Let the spam settings try to do this.
                spamSettings.initialize(this.server);
              }
            }
          }
          spamSettings.logJunkHit(msgHdr, willMoveMessage);
        }

        if (!this._repairInProcess &&
            this.getFlag(Ci.nsMsgFolderFlags.Inbox) &&
            this.server.performingBiff &&
            (aClassification != CI.nsIJunkMailPlugin.JUNK))
        {
          this.biffState = Ci.nsIMsgFolder.nsMsgBiffState_NewMail;
        }
      }
    }
    else
    { // End batch

      // Parent will apply post bayes filters.
      this.cppBase.onMessageClassified(null, null, null);
      let messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      let folder = spamFolderURI ? getExistingFolder(spamFolderURI) : null;
      if (folder && spamKeysToMove.length)
      {
        for (let msgKey of spamKeysToMove)
        {
          // If an upstream filter moved this message, don't move it here.
          if (!(this.getProcessingFlags(msgKey) & Ci.nsMsgProcessingFlags.FilterToMove))
          {
            let mailHdr = this.GetMessageHeader(msgKey);
            if (mailHdr)
              messages.appendElement(mailHdr, false);
          }
          else
          {
            // We don't need the processing flag any more.
            this.andProcessingFlags(msgKey, ~Ci.nsMsgProcessingFlags.FilterToMove);
          }
        }

        if (messages.length)
        {
          MailServices.copy.CopyMessages(this.delegator, messages, folder, true,
            /*nsIMsgCopyServiceListener* listener*/ null, null, false /*allowUndo*/);
        }
      }
    }
  },

  addMessageDispositionState(aMessage, aDispositionFlag)
  {
    log.debug("ewsMsgFolder addMessageDispositionState flag=" + aDispositionFlag);
    this.cppBase.addMessageDispositionState(aMessage, aDispositionFlag);

    let flags = aMessage.flags;
    let key = aMessage.messageKey;
    let itemId = this.idFromKey(key);
    if (!itemId)
    {
      throw CE("Empty item id on message disposition change");
    }

    let isRepliedNative = false;
    let isForwardedNative = false;
    let item = this.nativeMailbox.getItem(itemId);
    let newProperties = item.properties.clone(null);

    let value = item.getExtendedProperty(PR_LAST_VERB_EXECUTED);
    if (value == EXCHIVERB_REPLYTOALL ||
        value == EXCHIVERB_REPLYTOSENDER)
      isRepliedNative = true;
    else if (value == EXCHIVERB_FORWARD)
      isForwardedNative = true;

    if (aDispositionFlag == Ci.nsIMsgFolder.nsMsgDispositionState_Replied)
    {
      if (isRepliedNative)
        return;
      item.setExtendedProperty(PR_LAST_VERB_EXECUTED,
                               "Integer",
                               EXCHIVERB_REPLYTOSENDER,
                               newProperties);
    }
    else if (aDispositionFlag == Ci.nsIMsgFolder.nsMsgDispositionState_Forwarded)
    {
      if (isForwardedNative)
        return;
      item.setExtendedProperty(PR_LAST_VERB_EXECUTED,
                               "Integer",
                               EXCHIVERB_FORWARD,
                               newProperties);
    }

    // null listener since this is supposed o be a sync method
    this.nativeMailbox.updateItemProperties(item, newProperties, null);
  },

  markMessagesRead(messages, markRead)
  {
    log.debug("ewsMsgFolder.markMessagesRead");

    // tell the base folder to do it, which will mark them read in the db.
    this.cppBase.markMessagesRead(messages, markRead);
    this._markServerMessagesRead(toArray(messages, Ci.nsIMsgDBHdr), markRead);
    this.msgDatabase.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
  },

  markAllMessagesRead(aMsgWindow)
  {
    let database = this.msgDatabase;

    this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, false, true );
    let thoseMarked;
    if (database.MarkAllRead) { /* COMPAT for TB 68 */
      let thoseMarkedObject = {};
      database.MarkAllRead({}, thoseMarkedObject);
      thoseMarked = thoseMarkedObject.value;
    } else { /* COMPAT for TB 68 */
      thoseMarked = database.markAllRead();
    } // COMPAT for TB 68
    this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, true, true);

    if (thoseMarked.length)
    {
      let messages = thoseMarked.map(key => database.GetMsgHdrForKey(key));
      this._markServerMessagesRead(messages, true);
      database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
    }
  },

  // I don't believe this is actually used in skink code
  markThreadRead(aThread)
  {
    log.debug("ewsMsgFolder.markThreadRead");
    let database = this.msgDatabase;

    let thoseMarkedObject = {}; // COMPAT for TB 68
    let thoseMarked = database.MarkThreadRead(aThread, null, /* COMPAT for TB 68 */{}, thoseMarkedObject) || thoseMarkedObject.value;

    if (thoseMarked.length)
    {
      let messages = thoseMarked.map(key => database.GetMsgHdrForKey(key));
      this._markServerMessagesRead(messages, true);
      database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
    }
  },

  markMessagesFlagged(messages, markRead) {
    log.debug("ewsMsgFolder.markMessagesFlagged");
    let database = this.msgDatabase;

    // tell the base folder to do it, which will mark them flagged in the db.
    this.cppBase.markMessagesFlagged(messages, markRead);
    this._markServerMessagesFlagged(toArray(messages, Ci.nsIMsgDBHdr), markRead);
    database.Commit(Ci.nsMsgDBCommitType.kLargeCommit);
  },

  setNumNewMessages(aNumNewMessages) {
    this.cppBase.setNumNewMessages(aNumNewMessages);

    // for some bizarre reason, the numNewMessages is notified as a string.
    // Also notify as an int so that the folder pane updates
    let oldNewMessages = this.cppBase.getNumNewMessages(false);
    if (oldNewMessages != aNumNewMessages) {
      this.NotifyIntPropertyChanged("NumNewBiffMessages", oldNewMessages, aNumNewMessages);
    }
  },

  fetchMsgPreviewText(aKeysToFetch, /* aNumKeysTB68,*/ aLocalOnly, aUrlListener)
  {
    const MAXIMUM_SNIPPET_LENGTH = 255;
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);

    let datastore = this.nativeMailbox.datastore;

    for (let key of aKeysToFetch)
    {
      let msgHdr = this.GetMessageHeader(key);
      // ignore messages that already have a preview body.
      let prevBody = msgHdr.getStringProperty("preview");
      if (prevBody.length > 2) {
        try {
          // Check whether it's valid UTF-8
          decodeURIComponent(escape(prevBody));
          continue;
        } catch (ex) {
          // cached preview is broken, fix it by continuing on below
        }
      }

      // Get the msg body
      let itemId = msgHdr.getProperty("ewsItemId");
      if (!itemId) {
        log.warn("Blank itemId for message header");
        continue;
      }
      let nativeItem = this.nativeMailbox.getItem(itemId);

      let body;
      if (nativeItem.processingFlags & nativeItem.HasBody)
      {
        body = nativeItem.body;
      }
      else if (nativeItem.flags & nativeItem.HasOfflineBody)
      {
        datastore.getBody(nativeItem, null);
        body = nativeItem.body;
      }

      // todo: allow async operation
      if (!body)
      {
        msgHdr.setStringProperty("preview", " ");
      }
      else
      {
        // now we've got a msg body. If it's html, convert it to plain text.
        if (nativeItem.flags & nativeItem.BodyIsHtml)
          body = this.cppBase.convertMsgSnippetToPlainText(body);

        // We want to remove any whitespace from the beginning and end of the string
        body = body.trim();

        // step 3, optionally remove quoted text from the snippet
        // not implemented
        //nsString compressedQuotesMsgStr;
        //compressQuotesInMsgSnippet(body, compressedQuotesMsgStr);

        // finally, truncate the string based on aMaxOutputLen
        body = body.substring(0, MAXIMUM_SNIPPET_LENGTH);
        msgHdr.setStringProperty("preview", unescape(encodeURIComponent(body)));
      }
    }
  },

  get canCompact() {
    return false;
  },

  compact(aWindow, aListener) {
    throw CE("Compact not support", Cr.NS_ERROR_NOT_AVAILABLE);
  },

  compactAll(aListener, aWIndow, aCompactOfflineAlso) {
    throw CE("Compact not support", Cr.NS_ERROR_NOT_AVAILABLE);
  },

  getMsgInputStream(aMsgHdr, aReusableObject)
  {
    try {
      aReusableObject.value = false;

      let itemId = aMsgHdr.getProperty("ewsItemId");
      if (!itemId)
        throw CE("Empty itemId");

      let item = this.nativeMailbox.getItem(itemId);

      if (!(item.processingFlags & item.HasBody) &&
          (item.flags & item.HasOfflineBody))
      {
        // need to read sync :( from the datastore
        this.nativeMailbox.datastore.getBody(item, null);
      }

      if (!(item.processingFlags & item.HasBody))
        throw CE("Cannot stream message since it has no body");

      let headersAndBody = "";

      // add headers
      let properties = item.properties;
      if (!properties || !properties.length)
        throw CE("Missing property list");

      let internetMessageHeaders = properties.getPropertyList("InternetMessageHeaders");
      if (!internetMessageHeaders || !internetMessageHeaders.length)
        throw CE("Missing InternetMessageHeaders");

      // append the headers to a String
      let headers = internetMessageHeaders.getPropertyLists("InternetMessageHeader");
      for (let internetMessageHeader of headers)
      {
        let headerName = internetMessageHeader.getAString("$attributes/HeaderName");
        if (!headerName)
        {
          log.info("Empty headerName");
          continue;
        }
        if (/content-type/i.test(headerName)) // we add our own
          continue;

        let headerValue = internetMessageHeader.getAString("$value");
        headersAndBody += headerName + ": " + headerValue + "\n";
      }

      if (item.flags & item.BodyIsHtml)
        headersAndBody += "Content-Type: text/html; charset=\"UTF-8\"\n\n";
      else
        headersAndBody += "Content-Type: text/plain; charset=\"UTF-8\"\n\n";

      headersAndBody += item.body;
      return stringLineStreamFactory(headersAndBody);
    }
    catch (e) { 
        log.warn(se("Could not create msgInputStream: " + e));
        throw e;
    }
  },

  async emptyTrash(msgWindow, urlListener)
  {
    let result;
    try {
      result = await (async() => {
        log.config("ewsMailFolder.emptyTrash");

        let trashFolder = this.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);
        if (!trashFolder)
          throw CE("Could not find trash folder");

        let database = trashFolder.msgDatabase;

        let messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
        let hdrs = database.EnumerateMessages();
        while (hdrs.hasMoreElements())
        {
          let hdr = hdrs.getNext().QueryInterface(Ci.nsIMsgDBHdr);
          messages.appendElement(hdr, false);
        }

        let folders = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
        let foldersEnum = trashFolder.subFolders;
        while (foldersEnum.hasMoreElements())
        {
          let folder = foldersEnum.getNext().QueryInterface(Ci.nsIMsgFolder);
          folders.appendElement(folder, false);
        }

        if (folders.length == 0 && messages.length == 0)
        {
          log.debug("No folders or messages found in trash");
          return Cr.NS_OK;
        }

        let havePromise = null;
        if (messages.length)
        {
          log.config("Deleting messages from trash, count is", messages.length);
          let deleteMessagesListener = new PromiseUtils.CopyListener();
          trashFolder.deleteMessages(messages,  msgWindow, true, false, deleteMessagesListener, false);
          havePromise = deleteMessagesListener.promise;
        }

        if (folders.length)
        {
          log.config("Deleting folders from trash, count is " + folders.length);
          trashFolder.deleteSubFolders(folders, msgWindow);
        }

        if (havePromise)
          return havePromise;
        else
          return Cr.NS_OK;

      })();
    } catch (ex) {
      ex.code = "error-empty-trash";
      log.error("Error in emptyTrash", ex);
      if (urlListener) {
        executeSoon( () => urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE));
      }
      return;
    }
    if (urlListener) {
      executeSoon( () => urlListener.OnStopRunningUrl(null, result));
    }
  },

  get canRename() {
    return false;
  },

  async createStorageIfMissing(urlListener) {
    let result;
    try {
      result = await (async () => {
        log.config("createStorageIfMissing name " + this.name);
        if (this.isServer) {
          log.debug("createStorageIfMissing assuming that root folder exists, but we should not really be calling for that");
          return Cr.NS_OK; //we must exist?
        }

        // Does storage already exist?
        if (this.verifiedAsOnlineFolder) {
          return Cr.NS_OK;
        }

        // If parent does not exist, then we were probably created by RDF and we need
        // to compute the parent.
        if (!this.parent) {
          log.config("Folder '" + this.name + "' has no parent");
          let folderURI = this.URI;
          let lastSlashIndex = folderURI.lastIndexOf("/");

          // have parent?
          if (lastSlashIndex <= 0)
            throw CE("createStorageIfMissing for folder with no URI or parent");

          let parentURI = folderURI.substring(0, lastSlashIndex);
          this.parent = MailServices.folderLookup.getFolderForURL(parentURI);
        }

        // Make sure that the parent also has storage
        {
          let urlListener = new PromiseUtils.UrlListener();
          this.parent.createStorageIfMissing(urlListener);
          let result = await urlListener.promise;
          if (!CS(result))
            throw CE("Failed to create storage for parent of " + this.name);
        }

        // At this point, parent exists, but we are unverified. But if the native
        // folder exists, we're lying, so fix the lie.
        if (this._nativeFolder && this._nativeFolder.verifiedOnline) {
          log.info("Folder '" + this.name + "' is unverified, but native folder exists. Verify");
          this.verifiedAsOnlineFolder = true;
          return Cr.NS_OK;
        }
        else
          log.debug("this._nativeFolder missing or unverified, this._nativeFolder is " + this._nativeFolder);

        // We do not. Ask the parent to create us.
        let ewsServer = safeGetJS(this.server, "EwsIncomingServer");
        {
          let urlListener = new PromiseUtils.UrlListener();
          ewsServer.createSubfolderWithListener(urlListener, this.parent, this.name);
          let result = await urlListener.promise;

          // native folder create throws NS_ERROR_FILE_ALREADY_EXISTS if the native folder
          // exists. We'll accept that as success.
          if ( (result != Cr.NS_ERROR_FILE_ALREADY_EXISTS) && !CS(result))
            throw CE("Failed to create storage for folder " + this.name);
          // If success, set as verified
          this.verifiedAsOnlineFolder = true;
        }

        // we should now be created, but check.
        if (!this.verifiedAsOnlineFolder)
          throw CE("Create storage succeeded, but still not verified as online?");

        return Cr.NS_OK;
      })();
    } catch (ex) {
      ex.code = "error-create-storage-if-missing";
      log.error("Error in createStorageIfMissing", ex);
      if (urlListener) {
        executeSoon( () => urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE));
      }
      return;
    }
    if (urlListener) {
      if (!CS(result))
        log.warn("Error return from createStorageIfMissing");
      executeSoon( () => urlListener.OnStopRunningUrl(null, result));
    }
  },

  get incomingServerType() { return "exquilla";},

  // So, how to deal with the listener? We're going to delegate handling of
  //   copyListener to other code implemented as Promises when completed.
  copyMessages(srcFolder, messages, isMove, msgWindow, copyServiceListener, isFolder, allowUndo) {
 
    // Use a specialized listener to manage completions, forwarding calls to
    // a parent copyServiceListener
    log.config("copyMessages from folder " + srcFolder.name + " to " + this.name);
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);
    this.initNativeFolder();
    let localListener = new DualListener(copyServiceListener);

    (async () => {
      let result;
      try {
        result = await (async () => {
          if (this.isServer) {
            this._finishCopy(srcFolder, isMove, Cr.NS_ERROR_FAILURE, messages, null);
            throw CE("Destination is the root folder. Cannot move/copy here");
          }
          if (!(this.flags & (Ci.nsMsgFolderFlags.Trash | Ci.nsMsgFolderFlags.Junk)))
            this._setMRUTime();

          // We special-case copies within the same EWS server, otherwise we need
          // to use a streaming copier.
          let myServerURI = this.server.serverURI;
          let srcServerURI = srcFolder.server.serverURI;
          log.config("Copy messages from server " + srcServerURI + " to " + myServerURI);

          // report copy status
          let activityListener = this.nativeMailbox.activityListener;
          activityListener.onCopyStarted(srcFolder, messages.length, isMove);
          localListener.OnStartCopy();
          if (srcServerURI == myServerURI) {
            this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, false, false);
            let result = await this._promiseCopyEwsMessages(srcFolder, messages, isMove);
            if (!CS(result))
              throw CE("Error return returned from promiseCopyEwsMessages: " + result);
          }
          else {
            let result = await this._promiseCopyAnyMessages(srcFolder, messages, isMove);
            if (!CS(result))
              throw CE("Error return from promiseCopyAnyMessages", result);
          }
          return Cr.NS_OK;

        })();
      } catch (ex) {
        ex.code = "error-copy-messages";
        log.error("Error in copyMessages", ex);
        localListener.OnStartCopy();
        if (!localListener._stopped)
          localListener.OnStopCopy(ex.result);
        this.onCopyCompleted(srcFolder, ex.result);
        return;
      }
      localListener.OnStartCopy();
      if (!localListener._stopped)
        localListener.OnStopCopy(result);
      this.onCopyCompleted(srcFolder, result);
      // Notifications?
    })();
  },

  copyFileMessage(file, msgToReplace, isDraft, newMsgFlags,
                  keywords, msgWindow, copyServiceListener) {
    log.debug("ewsMsgFolder.copyFileMessage() to " + this.folderURL);
    let srcSupports = file.QueryInterface(Ci.nsISupports);
    // Use a specialized listener to manage completions, forwarding calls to
    // a parent copyServiceListener
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);
    this.initNativeFolder();
    let localListener = new DualListener(copyServiceListener);

    (async () => {
      let result;
      try {
        result = await (async () => {
          if (this.isServer) {
            throw CE("Destination is the root folder. Cannot move/copy here");
          }
          if (!(this.flags & (Ci.nsMsgFolderFlags.Trash | Ci.nsMsgFolderFlags.Junk)))
            this._setMRUTime();

          let result = await this._promiseCopyFileMessage(file, msgToReplace,
            isDraft, newMsgFlags, keywords, msgWindow, localListener);
          return result;
        })();
      } catch (ex) {
        ex.code = "error-copy-file-message";
        log.error("Error in copyFileMessage", ex);
        localListener.OnStartCopy();
        if (!localListener._stopped)
          localListener.OnStopCopy(ex.result);
        this.onCopyCompleted(srcSupports, ex.result);
        return;
      }
      localListener.OnStartCopy();
      if (!localListener._stopped)
        localListener.OnStopCopy(result);
      this.onCopyCompleted(srcSupports, result);
    })();
  },

  copyFolder(srcFolder, isMoveFolder, msgWindow, copyServiceListener) {
    // We're going to do and report from the local copy, then
    // do the native move without listener.

    // We only support moves within the same server
    if (!isMoveFolder || this.server.serverURI != srcFolder.server.serverURI)
      throw CE("We only support folder moves within the same Exchange server", Cr.NS_ERROR_NOT_IMPLEMENTED);
    let localListener = new DualListener(copyServiceListener);

    (async () => {
      let result;
      try {
        result = await (async () => {
          // kickoff the native move
          localListener.OnStartCopy();
          let listener = new PromiseUtils.MachineListener();
          let folderIds = new StringArray();
          folderIds.append(safeGetJS(srcFolder, "EwsMsgFolder").folderId);
          this.nativeMailbox.moveSubfolders(folderIds, this._nativeFolder, listener);
          let result = await listener.promise;
          if (!CS(result.status))
            log.error("Failed to move folder " + srcFolder.name + " to " + this.name);
          // Do the skink move
          this.copyFolderLocal(srcFolder, isMoveFolder, msgWindow, null);

          return result.status;
        })();
      } catch (ex) {
        ex.code = "error-copy-folder";
        log.error("Error in copyFolder", ex);
        localListener.OnStartCopy();
        if (!localListener._stopped)
          localListener.OnStopCopy(ex.result);
        return;
      }
      localListener.OnStartCopy();
      if (!localListener._stopped)
        localListener.OnStopCopy(result);
    })();
  },

  deleteMessages(messages, msgWindow, deleteStorage, isMove, copyServiceListener, allowUndo) {
    log.config("deleteMessages for folder " + this.name);
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);

    let isTrashFolder = this.flags & Ci.nsMsgFolderFlags.Trash;
    let mailbox = this.nativeMailbox;
    let localListener = new DualListener(copyServiceListener);

    (async () => {
      let result;
      try {
        result = await (async () => {
          // Notify on delete from trash and shift-delete.
          let trashFolder = this.trashFolder
          if (!isMove && (deleteStorage || isTrashFolder)) {
            MailServices.mfn.notifyMsgsDeleted(/* COMPAT for TB 68 */this.msgDatabase.deleteMessages.length == 3 ? messages : toArray(messages, Ci.nsIMsgDBHdr));
          }

          if (trashFolder && !deleteStorage && !isTrashFolder) {
            // Set the deleted flag on messages so that any updates get skipped
            log.config("deleteMessages moving to trash folder");
            for (let i = 0; i < messages.length; i++) {
              let message = messages.queryElementAt(i, Ci.nsIMsgDBHdr);
              let itemId = message.getProperty("ewsItemId");
              if (itemId) {
                let item = mailbox.getItem(itemId);
                item.raiseFlags(item.DeletedBit);
              }
            }
            MailServices.copy.CopyMessages(this.delegator, messages, trashFolder, true, localListener, msgWindow, allowUndo);
            let result = await localListener.promise;
            return result;
          }

          // delete from the EWS server
          let itemIds = new StringArray();
          let deleteCount = 0;
          let unreadCount = 0;
          for (let i = 0; i < messages.length; i++) {
            let message = messages.queryElementAt(i, Ci.nsIMsgDBHdr);
            let itemId = message.getProperty("ewsItemId");
            if (!itemId) {
              log.warn("Could not delete messages because itemId is missing");
              continue;
            }
            itemIds.append(itemId);
            deleteCount++;
            if (!message.isRead)
              unreadCount++;
          }

          // View notifications in moves assume that the message is removed from the
          //  view immediately. So I can't just let the callbacks do the deletes :(
          log.config("deleteMessages deleting directly without a move");
          this.changeNumPendingTotalMessages(deleteCount);
          if (unreadCount)
            this.changeNumPendingUnread(unreadCount);
          this.updateSummaryTotals(true);
          this.deleteLocalMessages(messages);

          // we are the source folder here for a move or shift delete
          //enable notifications because that will close the file stream
          // we've been caching, mark the db as valid, and commit it.
          // *** kludge alert! nsImapMailFolder::CopyNextStreamMessage has a dependency
          //     on whether a folder is nsIMsgLocalMailFolder in whether it sends its
          //     mDeletedOrMoveMsgCompletedAtom. Yet it sets msgWindow to null, while the
          //     local folder moves sets the msgWindow. We will use this fact to
          //     distinguish whether we need the notification.
          // see also parallel kludge in msqCopyOtherMessageListener::OnEvent
          if (!isMove || !msgWindow)
            this.NotifyFolderEvent("DeleteOrMoveMsgCompleted");

          localListener.OnStartCopy();
          let deleteListener = new PromiseUtils.MachineListener();
          mailbox.deleteItems(itemIds, false, deleteListener);
          let result = await deleteListener.promise;
          if (CS(result.status)) {
            // Items on the server were pending in skink, so bringing server
            // into sync affects pending items.
            this.changeNumPendingTotalMessages(-deleteCount);
            this.changeNumPendingUnread(-unreadCount);
            this.updateSummaryTotals(true);
          }
          return result.status;
        })();
      } catch (ex) {
        ex.code = "error-delete-messages";
        log.error("Error in deleteMessages", ex);
        localListener.OnStartCopy();
        if (!localListener._stopped)
          localListener.OnStopCopy(ex.result);
        return;
      }
      localListener.OnStartCopy();
      if (!localListener._stopped)
        localListener.OnStopCopy(result);
    })();
  },

  async _promiseCopyFileMessage(aFile, aMsgToReplace, aIsDraft, aNewMsgFlags, aKeywords, aMsgWindow, aListener) {

    // read the file into a string
    let decoder = new TextDecoder();
    let array = await OS.File.read(aFile.path);

    let message = decoder.decode(array);
    let mimeContent = "";

      // Tweak the message into EWS-compatible MIME format.

    // Locate the end of header
    let EOH = message.search(/\n\n|\r\n\r\n|\r\r/);
    if (EOH < 0)
      throw CE("Message file is not a valid message");
    let headerLines = message.substring(0, EOH).split(/\r\n|\r|\n/);
    let foundReceived = false;
    for (let line of headerLines) {
      // Don't include MBOX first line or mozilla-specific headers
      if (/^From -|^X-Mozilla-Status|^X-UIDL/i.test(line))
        continue;
      // Exchange EWS has no direct way to set the received date of a message. Apparently
      //  what it does is infer it from Received headers. But certain classes of message, such
      //  as Sent message, have no received headers, so the received date gets reset to the date
      //  that the message was copied. To prevent this, if a message does not have any Received
      //  headers when the Date header is found, then we insert a dummy Received header to set
      //  the Received date.
      if (!foundReceived)
        foundReceived = /^Received:/i.test(line);

      // Is this a Date header without seeing any Received? If so,
      //   insert a dummy Received.
      let match = /^Date:(.*$)/.exec(line);
      if (match && match[1])
        mimeContent += "Received:" + match[1] + "\n";
      mimeContent += line + "\n";
    }

    // We are done with headers. Output the rest of the mimeContent.
    let beginningOfBody = message.substring(EOH).search(/[^\r\n]/);
    mimeContent += "\n" + message.substring(EOH + beginningOfBody);

    let properties = new PropertyList();
    let flags = 0;
    if (aNewMsgFlags & Ci.nsMsgMessageFlags.READ)
      flags |= MAPI_MSGFLAG_READ;
    if (aIsDraft)
      flags |= MAPI_MSGFLAG_UNSENT;
    if (flags) {
      // We need a dummy item to use to set extended properties. Need to fix that!
      let dummyItem = new EwsNativeItem();
      dummyItem.setExtendedProperty(PR_MESSAGE_FLAGS, "Integer", "" + flags, properties);
    }
    
    let machineListener = new PromiseUtils.MachineListener();
    this.nativeMailbox.createMessageFromString(mimeContent, this, properties, machineListener);
    let result = await machineListener.promise;
    if (!CS(result.status))
      throw CE("Failed to create native message from file", result.status);

    // Now update the destination folder
    log.debug("Update skink version of destination folder");
    let updateListener = new PromiseUtils.UrlListener();
    this.updateFolderWithListener(null, updateListener);
    let updateResult = await updateListener.promise;
    if (!CS(updateResult))
      throw CE("Failed to updated destination folder on copy", updateResult);
    log.debug("Successful return from _promiseCopyFileMessage");
    return Cr.NS_OK;
  },

  // fulfills a promise when complete, used for any kind of message
  async _promiseCopyAnyMessages(srcFolder, messages, isMove) {
      function PromiseStreamListener () {
        this._promise = new Promise((resolve, reject) => {
          this._resolve = resolve;
          this._reject = reject;
        });
        this._inHeader = true;
        this._header = "";
        this._message = "";
      }
      PromiseStreamListener.prototype = {
        QueryInterface: ChromeUtils.generateQI([Ci.nsIStreamListener, Ci.nsIRequestObserver]),
        onStartRequest(aRequest) {},
        onStopRequest(aRequest, aStatusCode) {
          if (CS(aStatusCode)) {
            this._resolve(Cr.NS_OK);
          }
          else
            this._reject(CE("StreamListener failed in message copy", aStatusCode));
        },
        onDataAvailable(aRequest, aInputStream, aOffset, aCount) {
          // This method takes a string from a saved Skink message, and processes
          // the headers to be compatible with an EWS mimeContent. See
          // nsImapMailFolder::CopyDataToOutputStreamForAppend for s similar Skink case.
          log.debug("onDataAvailable in _promiseCopyAnyMessages length " + aCount);
          let sis = Cc["@mozilla.org/scriptableinputstream;1"]
                      .createInstance(Ci.nsIScriptableInputStream);
          sis.init(aInputStream);
          if (!this._inHeader) {
            this._message += sis.read(aCount);
            return;
          }

          let fragment = sis.read(aCount);
          log.debug("fragment length is " + fragment.length);
          // Process lines to try to locate the end of the header.

          // If the new fragment begins with CR or LF then we have to
          // consider a possible split EOH character.
          let match = /(\r|\n)*$/.exec(this._header);
          let headerEOL = match ? match [0] : "";

          for (let position = 0; position < fragment.length; position++) {
            let c = fragment[position];
            if (c != "\r" && c != "\n") {
              // No end of header here!
              headerEOL = "";
              continue;
            }
            headerEOL += c;
            let foundEOH = false;
            switch (headerEOL) {
              case "\r":
              case "\n":
              case "\r\n":
              case "\r\n\r":
                // possible EOH in progress, continue search
                continue;

              case "\r\r":
              case "\n\n":
              case "\r\n\r\n":
                break;

              default:
                // This is not a legal sequence of EOL characters. Warn
                // but treat as end of headers.
                log.warn("Illegal sequence of EOL characters");
                break;
            }

            // We have found the end of the header! Make a full header, and
            // parse to begin the message stream. Header includes the
            // ending \r\n\r\n
            this._header += fragment.substring(0, position + 1);
            let foundReceived = false;
            let lines = this._header.split(/\r\n|\r|\n/);
            for (let line of lines) {
              // skip From -, or X-Mozilla-Status
              if (/^From -|^X-Mozilla-Status|^X-UIDL/i.test(line))
                continue;

              // Exchange EWS has no direct way to set the received date of a message. Apparently
              //  what it does is infer it from Received headers. But certain classes of message, such
              //  as Sent message, have no received headers, so the received date gets reset to the date
              //  that the message was copied. To prevent this, if a message does not have any Received
              //  headers when the Date header is found, then we insert a dummy Received header to set
              //  the Received date.
              if (!foundReceived)
                foundReceived = /^Received:/i.test(line);

              // Is this a Date header without seeing any Received? If so,
              //   insert a dummy Received.
              let match = /^Date:(.*$)/.exec(line);
              if (match && match[1])
                this._message += "Received:" + match[1] + "\n";
              this._message += line + "\n";
            }
            // We are done with headers. Output the rest of the fragment as part of
            // the body.
            this._message += "\n" + (fragment.length > position + 2) ?
                                      fragment.substring(position + 1) : "";
            break;
          }
        },
        get promise() { return this._promise;},
      };

      let keys = [];
      for (let i = 0; i < messages.length; i++) {
        keys.push(messages.queryElementAt(i, Ci.nsIMsgDBHdr).messageKey);
      }

      // sort in descending order of keys, we'll access by pop()
      keys.sort((a, b) => b - a);

      // Process messages one by one (use for to allow 0 key)
      let messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);
      for (let key = keys.pop(); key; key = keys.pop()) {
        let message = srcFolder.GetMessageHeader(key);
        let uri = srcFolder.getUriForMsg(message);
        let msgService = messenger.messageServiceFromURI(uri);
        let inputStream = new PromiseStreamListener();
        msgService.streamMessage(uri, inputStream, null, null, false, "");
        let result = await inputStream.promise;

        // We have the message mime content in inputStream._message
        let properties = new PropertyList();
        
        let flags = 0;
        if (message.isRead)
          flags |= MAPI_MSGFLAG_READ;
        if (srcFolder.getFlag(Ci.nsMsgFolderFlags.Drafts))
          flags |= MAPI_MSGFLAG_UNSENT;
        if (flags) {
          // We need a dummy item to use to set extended properties. Need to fix that!
          let dummyItem = new EwsNativeItem();
          dummyItem.setExtendedProperty(PR_MESSAGE_FLAGS, "Integer", "" + flags, properties);
        }

        // create the item on the server
        let createListener = new PromiseUtils.MachineListener();
        this.nativeMailbox.createMessageFromString(
          inputStream._message, this._nativeFolder, properties, createListener);
        let createResult = await createListener.promise;
        if (!CS(createResult.status))
          throw CE("Failed to create message on server", createResult.status);
      }
      log.debug("Done copying messages to native folder of source");

      // New messages are created on EWS server, now delete messages from source
      if (isMove) {
        log.debug("deleting moved messages from source folder");
        // Unfortunately the local folder does not properly give copy listener, so we have to
        // use folder events.
        let promiseDeleteDone = PromiseUtils.promiseFolderEvents(
          srcFolder, ["DeleteOrMoveMsgCompleted", "DeleteOrMoveMsgFailed"]);
        srcFolder.deleteMessages(messages, null, true, false, null, false);
        let deleteResult = await promiseDeleteDone;

        let status = (deleteResult == "DeleteOrMoveMsgCompleted") ? Cr.NS_OK : Cr.NS_ERROR_FAILURE;
        if (!CS(status))
          throw CE("Failed to delete messages on source server in copy", status);
      }

      // Now update the destination folder
      log.debug("Update skink version of destination folder");
      let updateListener = new PromiseUtils.UrlListener();
      this.updateFolderWithListener(null, updateListener);
      let updateResult = await updateListener.promise;
      if (!CS(updateResult))
        throw CE("Failed to updated destination folder on copy", updateResult);
      log.debug("Successful return from _promiseCopyAnyMessages");
      return Cr.NS_OK;
  },

  // fulfills a promise when complete, used for copies and moves on the same EWS server
  async _promiseCopyEwsMessages(srcFolder, messages, isMove) {
      // For testing purposes, I need to be able to detect the full end to this, but I call OnStopCopy early. So I will
      //  allow the listener to also QI to an ewsEventListener. (When I did not do this, I called OnStopCopy
      //  twice, which causes a crash due to double release of filter after the fact.)

      log.config("copyEwsMessages from " + srcFolder.name);

      let srcItemIds = new StringArray();
      let srcItems = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      let destMessages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
      let srcEwsFolder = safeGetJS(srcFolder, "EwsMsgFolder");
      let mailbox = srcEwsFolder.nativeMailbox;

      for (let i = 0; i < messages.length; i++) {
        let message = messages.queryElementAt(i, Ci.nsIMsgDBHdr);

        let itemId = message.getProperty("ewsItemId");
        if (!itemId) {
          log.warn("Empty itemId for message " + message.mime2DecodedSubject +
                   ", skipping copy/move");
          continue;
        }

        srcItemIds.append(itemId);
        let item = mailbox.getItem(itemId);
        srcItems.appendElement(item, false);
      }

      if (!messages.length)
        throw CE("Nothing to copy");

      // tell the server to copy
      let self = this;
      let machineListener = new PromiseUtils.MachineListener(
        // wrap to copy skink items
          function onEvent(aItem, aEvent, aData, aResult) {
            if (aEvent != "NewCopiedItems")
              return;
            log.debug("NewCopiedItems event in copyEwsMessages");
            let newItems = aData.QueryInterface(Ci.nsIArray);
            self.copyLocalMessages(messages, destMessages, newItems);
            self.hasNewMessages = true;
            if (isMove)
              srcEwsFolder.deleteLocalMessages(messages);
          }
        );
      mailbox.copyItems(this._nativeFolder, srcItemIds, isMove, machineListener);
      let result = await machineListener.promise;

      srcItems.clear();
      // duplicate of call from OnStopCopy
      this._finishCopy(srcFolder, isMove, result.status, messages, destMessages);
      if (result.status != Cr.NS_OK)
        throw CE("Server copy failed");
      log.debug("Copy on server completed");
      return Cr.NS_OK;
  },

  // Do folder notifications associated with copy completion
  _finishCopy(srcFolder, isMove, result, srcMessages, destMessages) { try {
    this.enableNotifications(Ci.nsIMsgFolder.allMessageCountNotifications, true, false);

    if (CS(result)) {
      this.updateSummaryTotals(false);
      // xxx todo - why are we doing a folder loaded here?
      this._notifyFolderLoaded();
      let isTB68 = this.msgDatabase.deleteMessages.length == 3; // COMPAT for TB 68
      MailServices.mfn.notifyMsgsMoveCopyCompleted(isMove, isTB68 ? srcMessages : toArray(srcMessages, Ci.nsIMsgDBHdr), this.delegator, isTB68 ? destMessages : toArray(destMessages, Ci.nsIMsgDBHdr));
      if (isMove)
        srcFolder.NotifyFolderEvent("DeleteOrMoveMsgCompleted");
    }
    else {
      log.info("Move/Copy failed");
      let activityListener = this.nativeMailbox.activityListener;
      if (activityListener)
        activityListener.showFailed();
      if (isMove)
        srcFolder.NotifyFolderEvent("DeleteOrMoveMsgFailed");
    }
    // xxx todo - does this need to point to the delegator?
    executeSoon(() => {
      MailServices.copy.NotifyCompletion(srcFolder, this.delegator, result);
    });
  } catch (e) { e.code = "error-finish-copy"; log.error("_finishCopy error", e);}},

  // These are needed because there is no way to set mBaseMessageURI in nsMsgDBFolder.cpp
  get baseMessageURI() {
    if (!this._baseMessageURI) {
      let uri = newParsingURI(this.URI);
      if (Ci.nsIURIMutator) { // TB 60 or later
        uri = uri.mutate().setScheme("exquilla-message").finalize();
      } else {
        uri.scheme = "exquilla-message";
      }
      this._baseMessageURI = uri.spec;
    }
    return this._baseMessageURI;
  },

  getUriForMsg(msgHdr) {
    return this.baseMessageURI + "#" + msgHdr.messageKey;
  },

  generateMessageURI(msgKey) {
    return this.baseMessageURI + "#" + msgKey;
  },

    // Local methods

  get trashFolder() {
    let trashFolder = null;
    try {
      trashFolder = this.rootFolder.getFolderWithFlags(Ci.nsMsgFolderFlags.Trash);
    } catch (e) {}
    return trashFolder;
  },

  _setMRUTime() {
    this.setStringProperty(MRU_TIME_PROPERTY, Date.now()/1000.);
  },

  _markServerMessagesRead(messages, markRead)
  {
    let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    let didChange = false;

    for (let message of messages)
    {
      let itemId = message.getProperty("ewsItemId");
      if (!itemId)
      {
        log.warn("Empty item id");
        continue;
      }

      let item = this.nativeMailbox.getItem(itemId);

      let properties = item.properties;
      if (!properties || !properties.length)
      {
        log.warn("missing properties");
        continue;
      }

      let newProperties = properties.clone(null);
      let isReadNative = properties.getBoolean("IsRead");
      if (isReadNative != markRead)
      {
        newProperties.setBoolean("IsRead", markRead);
        let result =  item.mergeChanges(newProperties);
        if (!Components.isSuccessCode(result))
        {
          log.warn("Error returned from MergeChanges");
          continue;
        }
        items.appendElement(item, false);
        didChange = true;
      }
    }

    if (didChange)
      this.nativeMailbox.updateManyItems(items, null);
    else
      log.debug("Nothing changed");
  },

  _markServerMessagesFlagged(messages, markFlagged)
  {
    let items = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    let didChange = false;

    for (let message of messages)
    {
      let itemId = message.getProperty("ewsItemId");
      if (!itemId)
      {
        log.warn("Empty item id");
        continue;
      }

      let item = this.nativeMailbox.getItem(itemId);

      let properties = item.properties;
      if (!properties || !properties.length)
      {
        log.warn("missing properties");
        continue;
      }


      let isFlaggedString = item.getExtendedProperty(PR_FLAG_STATUS);
      let isFlaggedNative = isFlaggedString == PR_FLAG_STATUS_FOLLOWUPFLAGGED;
      if (isFlaggedNative != markFlagged)
      {
        let newProperties = properties.clone(null);
        item.setExtendedProperty(PR_FLAG_STATUS,
                                 "Integer",
                                 markFlagged ? PR_FLAG_STATUS_FOLLOWUPFLAGGED : "",
                                 newProperties);
        item.setExtendedProperty(PR_FOLLOWUP_ICON,
                                 "Integer",
                                 markFlagged ? PR_FOLLOWUP_ICON_RED : "",
                                 newProperties);
        item.setExtendedProperty(PR_TODO_ITEM_FLAGS,
                                 "Integer",
                                 markFlagged ? PR_TODO_ITEM_FLAGS_FLAGGED : PR_TODO_ITEM_FLAGS_UNFLAGGED,
                                 newProperties);
        let result =  item.mergeChanges(newProperties);
        if (!Components.isSuccessCode(result))
        {
          log.warn("Error returned from MergeChanges while setting flagged");
          continue;
        }
        items.appendElement(item, false);
        didChange = true;
      }
    }

    if (didChange)
      this.nativeMailbox.updateManyItems(items, null);
    else
      log.debug("Nothing changed while setting flagged");
  },

  _createDummyFile(folder) {
    // need to make sure folder exists...
    let path = folder.filePath;
    if (!path.exists())
    {
      /*
       * The skink utility function GetSummaryFileLocation takes a folder file,
       *  then appends .msf to come up with the name of the database file. So
       *  we need a placeholder file with simply the folder name.
       */
       let stream = Cc["@mozilla.org/network/file-output-stream;1"]
                      .createInstance(Ci.nsIFileOutputStream);
       stream.init(path, -1, 0o600, 0);
       let headerLine = "This file is a placeholder for a folder.";
       stream.write(headerLine, headerLine.length);
       stream.close();
    }
  },

  _createSubFolders(path) {
    // first find out all the current subfolders and files, before using them while
    // creating new subfolders; we don't want to modify and iterate the same
    // directory at once.
    let currentDirEntries = [];

    // repair misnamed canonical folders, circa build 1192 (before 52.3)
    if (this.isServer) {
      try {
        let directoryEnumerator = path.directoryEntries;
        let renamedPaths = [];
        while (directoryEnumerator.hasMoreElements())
        {
          let currentFile = directoryEnumerator.getNext()
                                               .QueryInterface(Ci.nsIFile);
          let leafName = currentFile.leafName;
          if (leafName.endsWith(".rename")) {
            let names = leafName.split(".");
            if (names.length >= 3 ) {
              let newName = names[names.length - 2];
              let oldName = names[0];
              for (let i = 1; i < names.length - 2; i++)
                oldName += "." + names[i];
              log.config("oldName is " + oldName + " newName is " + newName);
              renamedPaths.push({oldPath: oldName, newPath: newName});
              // find and rename any errant files
              let subEnum = path.directoryEntries;
              while (subEnum.hasMoreElements()) {
                let theFile = subEnum.getNext()
                                     .QueryInterface(Ci.nsIFile);
                let theName = theFile.leafName;
                if (theName == oldName)
                  theFile.moveTo(theFile.parent, newName);
                else if (theName == oldName + ".msf")
                  theFile.moveTo(theFile.parent, newName + ".msf");
                else if (theName == oldName + ".sbd")
                  theFile.moveTo(theFile.parent, newName + ".sbd");
              }
            }
            currentFile.remove(false);
          }
        }
        if (renamedPaths.length) {
          // find any use of a renamed URI and update it
          let baseURI = this.server.serverURI + "/";
          log.config("updating URIs for server " + baseURI);
          for (let renamedPath of renamedPaths) {
            let oldURI = baseURI + renamedPath.oldPath;
            let newURI = baseURI + renamedPath.newPath;
            log.config("Updating " + oldURI + " to " + newURI);
            changeFilterURIs(oldURI, newURI);

            // For all identities, locate and replace any occurances of the old URI
            for (let identity of /* COMPAT for TB 68 */toArray(MailServices.accounts.allIdentities, Ci.nsIMsgIdentity)) {
              for (let attribute of ["draftFolder", "stationeryFolder", "archiveFolder", "fccFolder"]) {
                let folderURI = identity[attribute];
                log.config("Checking folderURI " + folderURI + " for identity attribute " + attribute);
                if (folderURI.includes(oldURI)) {
                  let newFolderURI = folderURI.replace(oldURI, newURI);
                  changeIdentityAttribute(identity, attribute, newFolderURI);
                  log.info("Fixing misnamed canonical URI: changed " + attribute +
                           " from " + folderURI + " to " + newFolderURI);
                }
                // For the particular case of Sent, fccFolder circa 52.2 defaulted to Sent Items.
                // If found, change to Sent.
                if (renamedPath.newPath == "Sent") {
                  let previousDefaultURI = baseURI + "Sent%20Items";
                  log.config("Checking if we need to rename Sent URI, comparing " + identity.fccFolder +
                             " to " + previousDefaultURI);
                  if (identity.fccFolder == previousDefaultURI) {
                    changeIdentityAttribute(identity, "fccFolder", baseURI + "Sent");
                    log.info("Renamed fccFolder to canonical " + identity.fccFolder);
                  }
                }
              }
            }
          }
        }
      } catch (ex) {
        log.warn("Failed to rename folder URIs to canonical values");
      }
    }

    // add the folders
    let directoryEnumerator = path.directoryEntries;
    while (directoryEnumerator.hasMoreElements())
    {
      let currentFile = directoryEnumerator.getNext()
                                           .QueryInterface(Ci.nsIFile);
      let leafName = currentFile.leafName;

      // folders are represented only by a summary database file
      if (!currentFile.leafName.endsWith(".msf"))
        continue;

      // truncate the .msf (delete last 4 character)
      leafName = currentFile.leafName.slice(0, -4);

      let subfolderEnum = this.cppBase.subFolders;
      let child = null;
      while (subfolderEnum.hasMoreElements())
      {
        let folder = subfolderEnum.getNext()
                                  .QueryInterface(Ci.nsIMsgFolder);
        if (folder.name.toLowerCase() == leafName.toLowerCase()) {
          child = folder;
          break;
        }
      }

      if (!child)
        child = this.addSubfolder(leafName);

      if (child)
      {
        child.updateSummaryTotals(false); // get cached folder flags
        // We store the folder name in a JSON file owned by the server.
        let exqServer = safeGetJS(child.server, "EwsIncomingServer");
        child.prettyName = exqServer.getDisplayName(child.URI);
      }
    }

  },
    
  get _useMail() {
    let exqServer = safeGetJS(this.server, "EwsIncomingServer");
    return exqServer.useMail;
  },

  _updateNativeFromSkink() {
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);
    if (!this._nativeFolder)
      throw CE("Ews Folder not initialized", Cr.NS_ERROR_NOT_INITIALIZED);

    let localFolderId = this.folderId;
    if (!localFolderId)
      throw CE("empty folderId", Cr.NS_ERROR_FAILURE);

    if (this._nativeFolder.folderId != localFolderId)
      this._nativeFolder.folderId = localFolderId;

    // also update distinguished folder id if present
    let dFolderId = this.distinguishedFolderId;
    if (dFolderId && dFolderId != this._nativeFolder.distinguishedFolderId)
      this._nativeFolder.distinguishedFolderId = dFolderId;

    // note which are email folders
    if (this.flags & Ci.nsMsgFolderFlags.Mail)
    {
      let folderClass = this._nativeFolder.folderClass;
      if (folderClass != "IPF.StickyNote" &&
          !folderClass.startsWith("IPF.Note"))
        this._nativeFolder.folderClass = "IPF.Note";
    }

    // correct the counts. Use pending counts for any difference between the
    //  reported folder count, and the local db-related count.
    this._nativeFolder.unreadCount = this.numUnread;
    this._nativeFolder.totalCount = this.totalMessages;

    // parent folder id
    let parent = this.parent;
    if (parent)
    {
      let ewsParent = safeGetJS(parent, "EwsMsgFolder");
      this._nativeFolder.parentFolderId = ewsParent.folderId;
    }
  },

  _updateItemFromNative(hdr, aDatabase, aItem, aNotify) {
    if (!this._useMail)
      throw CE("Mail not available", Cr.NS_ERROR_NOT_AVAILABLE);
    let skinkUnreadCount = this.getNumUnread(false);
    log.debug("updateItemFromNative, unreadCount " + skinkUnreadCount);
    let folderInfo = aDatabase.folderInfo;
    let properties = aItem.properties;
    hdr.setProperty("ewsItemId", aItem.itemId);
    let key = hdr.messageKey;
    let oldFlags = hdr.flags;
    let flags = oldFlags;

    // For stray items that show up in message folders, try to get some
    //  minimal information
    let subject;
    let itemClass = aItem.itemClass;
    if (itemClass.startsWith("IPM.Contact"))
      subject = properties.getAString("DisplayName");
    else
      subject = properties.getAString("Subject");
    let [modifiedSubject, didStrip] = stripRe(subject);
    if (didStrip)
      flags |= Ci.nsMsgMessageFlags.HasRe;
    else
      flags &= ~Ci.nsMsgMessageFlags.HasRe;

    // The subject will be decoded when displayed, so encode here.
    try {
      modifiedSubject = MailServices.mimeConverter
                         .encodeMimePartIIStr_UTF8(modifiedSubject, false, "UTF-8", 0, 999);
    } catch (e) { log.warn("Failed to encode subject " + modifiedSubject);}
    hdr.subject = modifiedSubject;

    let emailAddress = properties.getAString("From/Mailbox/EmailAddress");
    let name = properties.getAString("From/Mailbox/Name");
    try {
      name = MailServices.mimeConverter
                         .encodeMimePartIIStr_UTF8(name, false, "UTF-8", 0, 999);
    } catch (e) { log.warn("Failed to encode author " + name);}
    
    hdr.author = MailServices.headerParser.makeMimeAddress(name, emailAddress);

    hdr.setReferences(properties.getAString("References"));
    hdr.messageId = properties.getAString("InternetMessageId");
    hdr.messageSize = properties.getLong("Size");

    // dateTimeReceived. Javascript includes an iso datetime parser.
    //  nsIMsgHdr wants the date as seconds.
    let dateTimeReceived = properties.getAString("DateTimeReceived");
    if (!dateTimeReceived)
      dateTimeReceived = properties.getAString("DateTimeCreated");
    hdr.date = 1000 * Date.parse(dateTimeReceived);

    addressesToHeader(properties, "ToRecipients/Mailbox", hdr, "recipients");
    addressesToHeader(properties, "CcRecipients/Mailbox", hdr, "ccList");
    addressesToHeader(properties, "BccRecipients/Mailbox", hdr, "bccList");

    let isRead = true;
    // Boolean can't tell the difference between missing and false
    let readCount = properties.getCountForName("IsRead");
    if (readCount)
      isRead = properties.getBoolean("IsRead"); // defaulted above to true

    let hasAttachments = properties.getBoolean("HasAttachments");
    if (hasAttachments)
      flags |= Ci.nsMsgMessageFlags.Attachment;
    else
      flags &= ~Ci.nsMsgMessageFlags.Attachment;

    let isReplied = false;
    let isForwarded = false;
    let isFlagged = false;
    let extendedProperties = properties.getPropertyLists("ExtendedProperty");
    for (let pl of extendedProperties) {
      let propertyTag = pl.getAString("ExtendedFieldURI/$attributes/PropertyTag");
      if (propertyTag == PR_LAST_VERB_EXECUTED) {
        let value = pl.getAString("Value");
        if (value == EXCHIVERB_FORWARD)
          isForwarded = true;
        else if (value == EXCHIVERB_REPLYTOSENDER || value == EXCHIVERB_REPLYTOALL)
          isReplied = true;
      }
      else if (propertyTag == PR_FLAG_STATUS) {
        let value = pl.getAString("Value");
        if (value == PR_FLAG_STATUS_FOLLOWUPFLAGGED)
          isFlagged = true;
      }
    }

    flags = forceBit(flags, Ci.nsMsgMessageFlags.Replied, isReplied);
    flags = forceBit(flags, Ci.nsMsgMessageFlags.Forwarded, isForwarded);
    flags = forceBit(flags, Ci.nsMsgMessageFlags.Marked, isFlagged);

    // If we have a body, then we'll set the line count (used by search)
    if (!aItem.isBodyEmpty)
    {
      // should we be checking HasOfflineBody instead ???
      flags |= Ci.nsMsgMessageFlags.Offline;
      // XXX TODO this makes an unncessary copy of the message
      // body just to count lines.
      let lineCount = aItem.body.split(/\r\n|\r|\n/).length;

      // We also have to count the headers
      let internetMessageHeaders = properties.getPropertyList("InternetMessageHeaders");
      let headerCount = 0;
      if (internetMessageHeaders)
        headerCount = internetMessageHeaders.getCountForName("InternetMessageHeader");
      // search adds 3 to this for the From and x-mozilla headers, which we do not have, but it works fine to ignore that.
      // But add one more to account for the header/body separator.
      hdr.lineCount = (lineCount + headerCount + 1);

      // Whenever we process the message as char*, we will use UTF-8
      hdr.Charset = "UTF-8";
    }
    else
      flags &= ~Ci.nsMsgMessageFlags.Offline;

    hdr.flags = flags;
    if (aNotify)
    {
      // Isn't NotifyHdrChangedAll done in the DB?
      //aDatabase.QueryInterface(Ci.nsIDBChangeAnnouncer)
      //         .NotifyHdrChangeAll(hdr, oldFlags, flags, null);
      aDatabase.MarkRead(key, isRead, null);
    }
    else
      hdr.markRead(isRead);
  },

  _reconcileItem(aNativeItem, aMaybeNew)
  { try {
    //log.debug("reconcile native item with flags " + aNativeItem.flags);
    if (!this._useMail)
      throw CE("Mail is disabled", Cr.NS_ERROR_NOT_AVAILABLE);

    if (!aNativeItem.itemId)
    {
      log.warn("item id empty from change list");
      throw CE("item id empty from change list", Cr.NS_ERROR_NOT_INITIALIZED);
    }

    let hasKey = false;
    let key = this.keyFromId(aNativeItem.itemId);
    if (key)
    {
      hasKey = true;
    }

    let updatedOnServer = aNativeItem.updatedOnServer;
    if (!aNativeItem.newOnServer &&
        !aNativeItem.updatedOnServer &&
        !aNativeItem.deletedOnServer)
    {
      log.debug("msqEwsMailFolder::ReconcileItem no flags are set , treating as update for folder " + this.name);
      updatedOnServer = true;
    }

    let database = this.msgDatabase;
    let dbFolderInfo = database.dBFolderInfo;
    let hdr;
    let notifier = Cc["@mozilla.org/messenger/msgnotificationservice;1"]
                     .getService(Ci.nsIMsgFolderNotificationService)

    while (aNativeItem.newOnServer || updatedOnServer) // update will fall through to create if fails
    {
      if (hasKey)
      {
        // note that the database will return a hdr from the use cache even after deleted
        if (database.ContainsKey(key))
          hdr = database.GetMsgHdrForKey(key);
      }

      if (aNativeItem.newOnServer && hasKey && !this._repairInProcess)
        log.debug("newOnServer but found message. Treating as update, key=" + key);
      if (updatedOnServer || hasKey)
      {
        if (hdr)
        {
          let wasRead = hdr.isRead;
          //if (flags & nsMsgMessageFlags::Expunged)
          this._updateItemFromNative(hdr, database, aNativeItem, true);
          if (hdr.isRead != wasRead) {
            // change the pending totals
            this.changeNumPendingUnread( hdr.isRead ? +1 : -1);
            this.updateSummaryTotals(true);
          }
          if (hdr.flags & REINDEX_FLAG) // came from a reindex that is
          {
            // reset flag, and treat counts as if existing but dirty item
            log.debug("Resetting Expunged");
            hdr.AndFlags(~REINDEX_FLAG);
            hdr.setUint32Property("gloda-dirty", 1); // kMessageDirty
            // kick off gloda for the message. Shame on asuth for requiring this kludge!
            // XXX TODO investigate this, seeing if gloda works right on reconcileItem
            this.orProcessingFlags(key, Ci.nsMsgProcessingFlags.NotReportedClassified)

            // In core, we have notifyHdrsNotBeingClassified() but that is not accessible
            // via XPCOM. No matter, we know the key.
            let msgHdrsNotBeingClassified = [hdr];
            if (database.deleteMessages.length == 3) { /* COMPAT for TB 68 */
              msgHdrsNotBeingClassified =
                Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
              msgHdrsNotBeingClassified.appendElement(hdr, false);
            } /* COMPAT for TB 68 */
            notifier.notifyMsgsClassified(msgHdrsNotBeingClassified, false, false);
          }
          break;
        }
        else
        {
          // I seem to be getting here when folder has zero sync state. Should be an error or
          //  warning, but let's suppress to CONFIG for now
          log.config("Trying to update an item that does not exist");
          // fall through to create
        }
      }

      // Get a new key, and make sure it is really new
      key = ++this._highWater;
      while (database.ContainsKey(key))
        key = ++this._highWater;
      dbFolderInfo.highWater = key;

      log.config("creating new item with key ", key);
      hdr = database.CreateNewHdr(key);
      this._updateItemFromNative(hdr, database, aNativeItem, false);

      if (aNativeItem.newOnServer && aMaybeNew)
      {
        this._numNewNativeMessages++;
        if (!hdr.isRead)
          hdr.OrFlags(Ci.nsMsgMessageFlags.New);
      }

      // This will change folder counts, so we need to decrement from pending first.
      if (!hdr.isRead)
      {
        this.changeNumPendingUnread(-1);
      }
      this.changeNumPendingTotalMessages(-1);

      database.AddNewHdrToDB(hdr, true);
      this.updateSummaryTotals(true);

      this._itemIdKeyMap.set(aNativeItem.itemId, key);
      this.orProcessingFlags(key, Ci.nsMsgProcessingFlags.NotReportedClassified);

      // Run the Inbox filters on the message
      if (this._applyIncomingFilters && !this._repairInProcess)
      {
        log.debug("Applying filters to message, body.length is " + aNativeItem.body.length);
        let headers = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
        headers.appendElement(hdr, false);
        MailServices.filters.applyFilters(Ci.nsMsgFilterType.Inbox, headers,
                                          this.delegator, null, null);
      }
      notifier.notifyMsgAdded(hdr);
      break;
    }

    if (aNativeItem.deletedOnServer)
    {
      if (hasKey) {
        log.config("Deleting message from database");
        let hdr = database.GetMsgHdrForKey(key);
        if (hdr)
        {
          // This will change folder counts, so we need to adjust pending first.
          if (!hdr.isRead)
          {
            dbFolderInfo.imapUnreadPendingMessages++;
          }
          dbFolderInfo.imapTotalPendingMessages++;

          database.DeleteHeader(hdr, null, true, true);
        }
        else
          log.warn("Message to delete not found");
      }
      aNativeItem.deleted = true;
    }

    aNativeItem.clearFlags(aNativeItem.NewOnServerBit |
                           aNativeItem.UpdatedOnServerBit |
                           aNativeItem.NeedsResync);

    // not sure about this. Setting this caused the calendar item to persist
    //  in the datastore after being deleted.
    //aNativeItem.deletedOnServer = false;
  } catch (e) {log.warn("Error in _reconcileItem " + e);}},

  /// iterate through the db, remapping the native ids.
  ///   aReindex: if true, set REINDEX_FLAG in preparation for reindex.
  ///
  ///   returns: [unreadExistingCount, totalExistingCount]
  _remap(aReindex)
  {
    //log.debug("remap itemIds and keys for folder " + this.name);
    let database = this.msgDatabase;
    if (!database) throw CE("Missing database");

    // Create the in-memory mapping between item id and key from the mork database.
    //  The first key created will be key 1. Also corrects the message counts for the
    //  folder to match the DB
    this._itemIdKeyMap.clear();
    let highWater = 0;
    let messageCount = 0;
    let unreadCount = 0;
    let messages = database.EnumerateMessages();

    while (messages.hasMoreElements()) {
      let hdr = messages.getNext()
                        .QueryInterface(Ci.nsIMsgDBHdr);
      messageCount++;
      if (!hdr.isRead)
        unreadCount++;
      let key = hdr.messageKey;
      let oldHighWater = highWater;
      if (key > highWater)
        highWater = key;
      let itemId = hdr.getProperty("ewsItemId");
      if (itemId)
      {
        // check for duplicates. These should not exist, so if found
        //  we will just delete the hdr for the duplicate.
        let existingKey = this.keyFromId(itemId);
        if (existingKey && key != existingKey)
        {
          // This hdr is a duplicate, so delete
          messageCount--;
          if (!hdr.isRead)
            unreadCount--;
          highWater = oldHighWater
          database.DeleteHeader(hdr, this.delegator, false, false);
          log.warn("duplicate header deleted");
          continue;
        }
        this._itemIdKeyMap.set(itemId, key);
      }
      else
      {
        // Should I delete this header?
        messageCount--;
        if (!hdr.isRead)
          unreadCount--;
        highWater = oldHighWater;
        database.DeleteHeader(hdr, this.delegator, false, false);
        log.warn("Header has empty ewsItemId, deleted\n");
        continue;
      }
      if (aReindex)
      {
        hdr.OrFlags(REINDEX_FLAG);
      }
    }

    let dbFolderInfo = database.dBFolderInfo;
    this._highWater = dbFolderInfo.highWater;
    // When reindexing, also reset high water
    if (highWater > this._highWater || aReindex)
    {
      // Not available or incorrect in database, so set here
      this._highWater = highWater;
      dbFolderInfo.highWater = highWater;
    }

    // These should match the existing dbfolderinfo values.
    //log.debug("Unread by counting = " + unreadCount +
    //          " from dbFolderInfo = " + dbFolderInfo.numUnreadMessages);
    //log.debug("Total by counting = " + messageCount +
    //          " from dbFolderInfo = " + dbFolderInfo.numMessages); 

    // Correct the count.
    dbFolderInfo.numMessages = messageCount;
    dbFolderInfo.numUnreadMessages = unreadCount;
    this.updateSummaryTotals(true);
    return [unreadCount, messageCount];
  },

  _addCalendarFromNativeFolder(childNativeFolder) {
    log.debug("_addCalendarFromNativeFolder not implemented but returning OK");
  },

  _notifyFolderLoaded() {
    if (this._needFolderLoadedEvent)
    {
      this._needFolderLoadedEvent = false;
      log.debug("Raising event FolderLoaded soon on folder " + this.name);
      executeSoon(() => this.NotifyFolderEvent("FolderLoaded"));
    }
  },

}

// Constructor
function EwsMsgFolderConstructor() {
}

// Constructor prototype (not instance prototype).
EwsMsgFolderConstructor.prototype = {
  classID: EwsMsgFolder.Properties.classID,
  _xpcom_factory: JSAccountUtils.jaFactory(EwsMsgFolder.Properties, EwsMsgFolder),
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsMsgFolderConstructor]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
