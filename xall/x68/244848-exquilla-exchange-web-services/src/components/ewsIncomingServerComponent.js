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

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
ChromeUtils.defineModuleGetter(this, "OS", "resource://gre/modules/osfile.jsm");
ChromeUtils.defineModuleGetter(this, "Preferences",
  "resource://gre/modules/Preferences.jsm");
ChromeUtils.defineModuleGetter(this, "EwsNotification",
  "resource://exquilla/EwsNotification.jsm");
ChromeUtils.defineModuleGetter(this, "ewsActivityModule",
  "resource://exquilla/ewsActivity.js");

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("base");
  return _log;
});

ChromeUtils.defineModuleGetter(this, "EwsNativeService",
                               "resource://exquilla/EwsNativeService.jsm");


ChromeUtils.defineModuleGetter(this, "JSAccountUtils", "resource://exquilla/JSAccountUtils.jsm");
ChromeUtils.defineModuleGetter(this, "JaBaseIncomingServer",
                               "resource://exquilla/JaBaseIncomingServer.jsm");
ChromeUtils.defineModuleGetter(this, "PromiseUtils",
                               "resource://exquilla/PromiseUtils.jsm");

// Main class.
var global = this;
function EwsIncomingServer(aDelegator, aBaseInterfaces) {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);

  // Superclass constructor
  JaBaseIncomingServer.call(this, aDelegator, aBaseInterfaces);

  // instance variables
  this._mailbox = null;
  this._unavailable = this.UNCHECKED;
  this._checkOnlineListener = null;
  this._checkOnlineUrlListeners = [];
  // the EwsNotification object managing notifications.
  this._ewsNotification = null;
  this._nameMap = null; // Map of folder names to folderURI as JSON
}

// Extend the base properties.
EwsIncomingServer.Properties = {
  __proto__: JaBaseIncomingServer.Properties,

  contractID: "@mozilla.org/messenger/server;1?type=exquilla",
  classID: Components.ID("{D308E8D0-7D9A-4C87-9235-0471D4C2146C}"),

// Add an additional interface only needed by this custom class.
  extraInterfaces: [],
}

// Extend the base class methods.
EwsIncomingServer.prototype = {
  AVAILABLE: 0,
  UNLICENSED: 1,
  OFFLINE: 2,
  UNCHECKED: 3,
  // Typical boilerplate to include in all implementations.
  __proto__: JaBaseIncomingServer.prototype,

  // Used to identify this as an EwsIncomingServer
  get EwsIncomingServer() {
    return this;
  },

  // InterfaceRequestor override, needed if extraInterfaces.
  getInterface: function(iid) {
    for (let iface of EwsIncomingServer.Properties.extraInterfaces) {
      if (iid.equals(iface)) {
        return this;
      }
    }
    return this.QueryInterface(iid);
  },

  // nsIMsgIncomingServer overrides.
  get localStoreType() { return "exquilla"; },
  get localDatabaseType() { return "mailbox"; },
  get type() { return "exquilla"; },

  // override root folder to cleanup if miscreated
  get rootFolder() {
    let rootFolder = null;
    try {
      rootFolder = this.cppBase.rootFolder;
    } catch (e) { log.error(e);}

    /* COMPAT for TB 68 */
    if (!rootFolder && "@mozilla.org/rdf/rdf-service;1" in Cc) {
      log.warn("Error creating root folder, removing for serverURI " + this.serverURI);
      let rdf = Cc["@mozilla.org/rdf/rdf-service;1"]
                  .getService(Ci.nsIRDFService);
      let serverResource = rdf.GetResource(this.serverURI);
      // Maybe this is a bogus item, created before ExQuilla loaded. Remove the resource
      //  and try again.
      rdf.UnregisterResource(serverResource);
      rootFolder = this.cppBase.rootFolder;
    }
    /* COMPAT for TB 68 */
    if (!rootFolder)
      throw CE("Could not create root folder", Cr.NS_ERROR_FAILURE);
    return rootFolder;
  /**/
  },

  get canBeDefaultServer() {
    return this.useMail;
  },

  onUserOrHostNameChanged(oldName, newName, hostnameChanged) {
    this.cppBase.onUserOrHostNameChanged(oldName, newName, hostnameChanged);
    let mailbox = this.nativeMailbox;
    if (mailbox) {
      mailbox.username = this.realUsername;
      mailbox.domain = this.domain;
      mailbox.ewsURL = this.ewsURL;
    }
  },

  get serverURI() {
    // I don't really understand how normal servers work, since the username part
    //  will not escape the "." in a server name, while with a standard URL it will.
    // So I am going to force a server URI which is consistent with a standard URL;
    let skinkURI = this.cppBase.serverURI;

    // now run this through a standard URL to let it escape it.
    let url = newParsingURI(skinkURI);
    let result = url.spec;
    // standard URL may be adding a slash at the end, which we do not want.
    if (result.endsWith("/"))
      result = result.substr(0, result.length - 1);
    return result;
  },

  // Because the mailbox knows how to lookup passwords from the password
  //  manager, we defer password management to it.
  get password() {
    if (this._mailbox)
      return this._mailbox.password;
    // but also use from server for initialization
    return this.cppBase.password;
  },
  set password(a) {
    if (this._mailbox)
      this._mailbox.password = a;
    this.cppBase.password = a;
  },
  get passwordPromptRequired() {
    return !this.password;
  },

  set username(a) {
    this.cppBase.username = a;
    // As usual, having get() create is a bad idea, so don't
    if (this._mailbox)
      this._mailbox.username = a;
  },

  get canCompactFoldersOnServer() { return false;},
  get canSearchMessages() { return this.useMail;},

  // This should really be fixed in the main code. You can't manually move junk messages
  //  until you have set the automatic move folder.
  get spamSettings() {
    let spamActionTargetAccount = this.getCharValue("spamActionTargetAccount");
    if (!spamActionTargetAccount)
    {
      this.setCharValue("spamActionTargetAccount", this.serverURI);
    }
    return this.cppBase.spamSettings;
  },

  set key(a) {
    this.cppBase.key = a;
    let seconds = this.getIntValue("secondsToLeaveUnavailable");
    if (seconds == 0) {
      // set to a default value of 30 days (2592000 seconds)
      log.config("Setting secondsToLeaveAvailable to default value");
      this.setIntValue("secondsToLeaveUnavailable", 2592000);
    }
  },

  // The normal performBiff does not have any notification when it is complete.
  // I'll add a notification using an observer, with aSubject as the server, and
  // aData a string with "success" or "failure", topic "exquilla.performBiff"
  async performBiff(aMsgWindow) {
    if (!this.useMail) {
      log.info("Can't do Biff while while is disabled");
      return;
    }

    if (this.performingBiff) {
      log.info("Tried to perform Biff while already performing Biff");
      return;
    }

    try {
      let server = this;
      log.info("Ews server starting Biff");
      server.serverBusy = true;
      server.performingBiff = true;

      let promiseNewMessages = new PromiseUtils.UrlListener(
        { OnStopRunningUrl(aUri, aExitCode) {
            server.serverBusy = false;
            server.performingBiff = false;
          }
        });

      server.rootFolder.getNewMessages(aMsgWindow, promiseNewMessages);
      let newMessagesResult = await promiseNewMessages.promise;

      if (newMessagesResult != Cr.NS_OK) {
        log.warn("Error return from getNewMessages in Biff: " + newMessagesResult);
        throw CE("Biff failed for server " + server.prettyName);
      }
    } catch (ex) {
      this.serverBusy = false;
      this.performingBiff = false;
      log.warn("Failure return from Biff for server: " + this.prettyName + " : " + ex);
      Services.obs.notifyObservers(this, "exquilla.performBiff", "failure: " + ex);
      return;
    }
    this.serverBusy = false;
    this.performingBiff = false;
    log.config("Biff completed for server " + this.prettyName);
    Services.obs.notifyObservers(this, "exquilla.performBiff", "success");
  },

    // EwsIncomingServer implementation

  /// get the message body
  //nsIURI fetchMessage(in EwsNativeItem aItem,
  //                    in nsISupports aDisplayConsumer,
  //                    in nsIUrlListener aUrlListener);
  fetchMessage(a, b, c) {
    throw CE("This method should have no callers", Cr.NS_ERROR_NOT_IMPLEMENTED); },

  get nativeMailbox() {
    if (!this._mailbox)
    {
      let nativeService = new EwsNativeService();

      this._mailbox = nativeService.getNativeMailbox(this.serverURI);

      // reconcile username, domain, and password
      this._mailbox.username = this.realUsername ;
      this._mailbox.domain = this.domain;
      this._mailbox.password = this.cppBase.password;
      this._mailbox.authMethod = this.cppBase.authMethod;
      log.config("msqEwsIncomingServer::GetNativeMailbox username is " + this.realUsername);
      log.config("msqEwsIncomingServer::GetNativeMailbox domain is " + this.domain);

      // setup request logging if enabled;
     this.setupSoapLogging(this._mailbox);

      // attach an activity listener
      this._mailbox.activityListener = ewsActivityModule;

      // listen for possible username changes
      // XXX TODO reconcile if we need the interface requestor version
      this._mailbox.addListener(this.wrappedJSObject);
    }

    // ensure that the database is opened
    if (!this._mailbox.datastore)
    {
      // set the datastore directory to open the database
      this._mailbox.datastoreDirectory = this.rootFolder.filePath;
    }

    // make sure that the url is set
    if (!this._mailbox.ewsURL)
      this._mailbox.ewsURL = this.ewsURL;

    return this._mailbox;
  },

  get ewsURL()  { return this.getCharValue('ewsURL');},
  set ewsURL(a) { this.setCharValue('ewsURL', a);},

  // These 3 use ... attributes are only needed to work cleanly with the account wizard and manager
  /// is the address book used with this server
  // attribute boolean useAB;
  get useAB()  { return this.getBoolValue('useAB');},
  set useAB(a) { this.setBoolValue('useAB', a);},

  /// is the calendar used with this server
  // attribute boolean useCalendar;
  get useCalendar()  { return this.getBoolValue('useCalendar');},
  set useCalendar(a) { this.setBoolValue('useCalendar', a);},

  /// is the mail used with this server
  //attribute boolean useMail;
  get useMail()  { return this.getBoolValue('useMail');},
  set useMail(a) { this.setBoolValue('useMail', a);},

  /// is the domain used to login to server (if any)
  //attribute ACString domain;
  get domain()  { return this.getCharValue('domain');},
  set domain(a) { this.setCharValue('domain', a);},

  getDisplayName(aFolderURI) {
    // read nameMap from file if first call
    if (!this._nameMap) {
      let namesFile = this.localPath.clone();
      namesFile.append("folderNames.json");
      if (namesFile.exists()) {
        try {
          let stream = Cc["@mozilla.org/network/file-input-stream;1"]
                         .createInstance(Ci.nsIFileInputStream);
          stream.init(namesFile, -1, 0, 0);
          let converterInputStream = Cc["@mozilla.org/intl/converter-input-stream;1"]
                                       .createInstance(Ci.nsIConverterInputStream);
          converterInputStream.init(stream, 'UTF-8', 0, 0);
          let stringObject = {};
          converterInputStream.readString(-1, stringObject);
          this._nameMap = JSON.parse(stringObject.value);
          converterInputStream.close();
        } catch (ex) {
          // Just delete the corrupt file; folder discovery will repopulate it,
          // although some folders might need to be rebuilt.
          namesFile.remove(false);
        }
      }
    }
      
    if (this._nameMap && (aFolderURI in this._nameMap))
      return this._nameMap[aFolderURI];

    // default to folderURI leaf name
    let lastSlashIndex = aFolderURI.lastIndexOf("/");
    let defaultName = (lastSlashIndex == -1) ? aFolderURI :
                                               aFolderURI.substr(lastSlashIndex + 1);
    return decodeURIComponent(defaultName);
  },
  setDisplayName(aFolderURI, aName) {
    let existingName = this.getDisplayName(aFolderURI);
    if (existingName == aName)
      return; // nothing changed
    if (!this._nameMap)
      this._nameMap = {};
    this._nameMap[aFolderURI] = aName;

    // update JSON file
    let namesFile = this.localPath.clone();
    namesFile.append("folderNames.json");
    let stream = Cc["@mozilla.org/network/file-output-stream;1"]
                    .createInstance(Ci.nsIFileOutputStream);
    stream.init(namesFile, -1, 0o600, 0);
    utfStringToStream(JSON.stringify(this._nameMap), stream);
    stream.close();
  },

  get email() {
    let account = MailServices.accounts.FindAccountForServer(this.delegator);
    if (account)
      return account.defaultIdentity.email;
    return null;
  },

  getNativeFolder(aMailFolder) {
    let folderId = aMailFolder.folderId || aMailFolder.distinguishedFolderId;
    return this.nativeMailbox.getNativeFolder(folderId);
  },

  reconcileFolders() {
    log.config("Reconcile folders for server " + this.prettyName);
    let ewsRootMailFolder = safeGetJS(this.rootFolder);

    // XXX TODO I should really reset the verified online in case this is
    //          called in the middle of an active session instead of at startup.

    // get the root native folder
    let ewsRootNativeFolder = this.nativeMailbox
                                  .getDistinguishedNativeFolder("msgfolderroot");

    // First, go through all of the existing folders, and mark as verified
    // (creating if needed) all children that are present in the native server.
    ewsRootMailFolder.updateFromNative(ewsRootNativeFolder);
    this.rootFolder.updateSummaryTotals(true);
  },

  // this was a non-XPCOM method in nsMsgIncomingServer
  getPasswordWithoutUI() {
    // This sets m_password if we find a password in the pw mgr.

    // Get the current server URI
    let currServerUri = this.localStoreType + "://" + this.hostName;

    // Login manager can produce valid fails, e.g. NS_ERROR_ABORT when a user
    // cancels the master password dialog. Therefore handle that here, but don't
    // warn about it.
    try {
      var logins = Services.logins.findLogins(currServerUri, null, currServerUri);
    } catch (e) {}

    // Don't abort here, if we didn't find any or failed, then we'll just have
    // to prompt.
    for (let loginInfo of logins)
    {
      if (loginInfo.username == this.username) {
        log.info("Found login for username " + loginInfo.username);
        this.password = loginInfo.password;
        break;
      }
      else {
        log.debug("Not using loging for username " + loginInfo.username);
      }
    }
  },

  // this was in skinkglue server, but now I'll use the mailbox version.
  promptPassword() {
    if (!this.password)
    {
      // let's see if we have the password in the password manager and
      // can avoid this prompting thing. This makes it easier to get embedders
      // to get up and running w/o a password prompting UI.
      try {
        this.getPasswordWithoutUI();
      } catch (e) {
        // If GetPasswordWithoutUI returns NS_ERROR_ABORT, the most likely case
        // is the user canceled getting the master password, so just return
        // straight away, as they won't want to get prompted again.
        throw CE("Error from get password, did user abort? ", Cr.NS_MSG_PASSWORD_PROMPT_CANCELLED);
      }
    }
    if (this.password)
      return this.password;

    let aOK = this.nativeMailbox.promptUsernameAndPassword(Services.wm.getMostRecentWindow(null));
    if (aOK)
      this.password = this.nativeMailbox.password;
  },
  processFault(aItem, aEvent, aData, aResult) {
    if (aEvent == "MachineError") {
      // we will only process selected messages. The machine already reported to
      //  the error console. The message code is transmitted in aData as an nsISupportString
      try {
        var responseCode = aData.QueryInterface(Ci.nsISupportsString)
                                .data;
      } catch(e) {}
      switch (responseCode)
      {
        case "HtmlStatus401":
        case "HtmlStatus1401":
        {
          showStatusFeedback("ExchangeAuthorizationFailed");
          this.forgetPassword();
          this.promptPassword("");
          break;
        }
        case "PasswordMissing":
        {
          showStatusFeedback("PasswordMissing");
          this.promptPassword("");
          break;
        }
        case "HtmlStatus0":
        case "HtmlStatus1000":
        {
          showStatusFeedback("ServerUnavailable");
          break;
        }
        case "Offline":
        {
          showStatusFeedback("InvalidWhenOffline");
          break;
        }
        default:
        {
          // clear any existing message
          showStatusFeedback("");
        }
      }
    }
  },

  setupSoapLogging(aMailbox) {
    if (this.getBoolValue("logEws"))
      aMailbox.soapLogFile = this.soapLogFile;
    else
      aMailbox.soapLogFile = null;
  },

  get soapLogFile() {
    let file= this.localPath.clone();
    file.append("soaprequests.log");
    return file;
  },

  get unavailable()  { return this._unavailable;},
  set unavailable(a) { this._unavailable = a;},

  performExpand(aMsgWindow) {
    this.performExpandAsync(aMsgWindow, null);
  },

  performExpandAsync(aMsgWindow, aUrlListener) {
    log.config("msqEwsIncomingServer::PerformExpandAsync");

    if (this.unavailable != this.AVAILABLE)
    {
      log.config("checking online with unavailable = " + this.unavailable);
      // only one check allowed active, else just queue the listener
      if (aUrlListener)
        this._checkOnlineUrlListeners.push(aUrlListener);
      if (this._checkOnlineUrlListeners.length > 1)
      {
        log.debug("Adding another listener for check online");
        return;
      }
      ewsCheckOnlineListener(this);
      return;
    }

    // We shall redo folder discovery when the server is expanded.
    log.config("discovering mailbox folders");
    this.nativeMailbox.needFolderDiscovery = true;
    ewsDiscoverFoldersListener(this, aUrlListener);
    return;
  },

  createSubfolder(parentMsgFolder, name) {
    this.createSubfolderWithListener(null, parentMsgFolder, name);
  },

  async createSubfolderWithListener(urlListener, parentMsgFolder, name)
  {
    try {
      log.config("createSubfolderWithListener name " + name);

      if (!this.useMail)
        throw CE("Mail is set to be unavailable", Cr.NS_ERROR_NOT_AVAILABLE);
      let processFault = (aItem, aEvent, aData, aResult) => {
          this.processFault(aItem, aEvent, aData, aResult);
      }

      let mailbox = this.nativeMailbox;
      let parentEwsFolder = safeGetJS(parentMsgFolder, "EwsMsgFolder");

      // I really hate to do this kludge, but nsSpamSettings::UpdateJunkFolderState is calling through my version of
      //  nsMsgUtils, and asking to create a junk folder. In that case it will have the folder name "Junk".
      //  If so, skip the creation of the folder, and hook it to the standard EWS junk folder.

      let isJunkFolder = parentMsgFolder.isServer && (name == "Junk");
      let childNativeFolder = mailbox.getNativeFolder(isJunkFolder ? "junkemail" : "");
      if (!isJunkFolder) // We'll leave the junk with the default EWS name
        childNativeFolder.displayName = name;

      // create child and glue to the skink folder

      // This is used in some cases where the child already exists, but addSubFolder hates
      // that. Detect and use existing folder if possible.
      let childMsgFolder;
      if (parentMsgFolder.containsChildNamed(name))
        childMsgFolder = parentMsgFolder.getChildNamed(name);
      else
        childMsgFolder = parentMsgFolder.addSubfolder(name);

      let childEwsFolder = safeGetJS(childMsgFolder, "EwsMsgFolder");
      childNativeFolder.folderURI = childMsgFolder.URI;

      if (!isJunkFolder)
      {
        let parentNativeFolder = this.getNativeFolder(parentEwsFolder);
        let listener = new PromiseUtils.MachineListener(processFault);
        mailbox.createSubfolder(parentNativeFolder, childNativeFolder, listener);
        let createResult = await listener.promise;

        if (createResult.status != Cr.NS_OK) {
          parentMsgFolder.NotifyFolderEvent("FolderCreateFailed");
          throw CE("Folder create failed", createResult.status);
        }
      }
      childEwsFolder.updateFromNative(childNativeFolder);
      childMsgFolder.NotifyFolderEvent("FolderCreateCompleted");
      MailServices.mfn.notifyFolderAdded(childMsgFolder);
    } catch (ex) {
      ex.code = "error-create-subfolder";
      log.error("Error in EwsCreateSubfolderListener", ex);
      if (urlListener)
        urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE);
      return;
    }
    if (urlListener)
      urlListener.OnStopRunningUrl(null, Cr.NS_OK);
  },

  async getAllAttachments(aMessage, aHeaderSink) {
    try {
      function reportAttachment(aAttachment, aMessageURI)
      {
        log.config("ews server reportAttachment fileSpec is " + aAttachment.fileURL);
        aHeaderSink.handleAttachment(aAttachment.contentType,
                                     aAttachment.fileURL,
                                     aAttachment.name,
                                     aMessageURI,
                                     false);
      }

      let processFault = (aItem, aEvent, aData, aResult) => {
          this.processFault(aItem, aEvent, aData, aResult);
      }

      let ewsFolder = safeGetJS(aMessage.folder, "EwsMsgFolder");
      let itemId = ewsFolder.idFromKey(aMessage.messageKey);
      let mailbox = this.nativeMailbox;
      let nativeItem = mailbox.getItem(itemId);
      log.debug("msqEwsIncomingServer::GetAllAttachments nativeItem.attachmentCount is " + nativeItem.attachmentCount);
      let messageURI = aMessage.folder.getUriForMsg(aMessage);
      let properties = nativeItem.properties;

      // This is largely copied from ewsEwsProtocol.cpp,
      //  we should refactor to prevent duplication

      let hasAttachments = properties.getBoolean("HasAttachments");
      let length = nativeItem.attachmentCount;

      for (let attachmentIndex = 0; hasAttachments && attachmentIndex < length; attachmentIndex++)
      {
        let attachment = nativeItem.getAttachmentByIndex(attachmentIndex);

        // If the attachment has already been downloaded, then we can use the cached copy
        if (attachment.downloaded)
        {
          reportAttachment(attachment, messageURI);
          continue; // try the next attachment
        }

        if (!attachment.isFileAttachment)
        {
          log.warn("This is not a file attachment, and we only support file attachments");
          reportAttachment(attachment, messageURI);
          continue;
        }

        // the soap request will create a unique file if needed
        let promiseAttachment = new PromiseUtils.MachineListener(processFault);
        mailbox.getAttachmentContent(attachment, promiseAttachment);
        let attachmentResult = await promiseAttachment.promise;
        if (attachmentResult.status != Cr.NS_OK) {
          log.warn("Could not get attachment content for message " + messageURI);
          continue;
        }
        reportAttachment(attachment, messageURI);
      }
    } catch (ex)  {
      ex.code = "error-get-all-attachments";
      log.error("Error return while getting attachments", ex);
    } finally {
      aHeaderSink.onEndAllAttachments();
    }
  },

  // This has no callback-based signal for end of completion, instead relying on the
  // NotifyItemRemoved folder notification in PropagateDelete. But note that this
  // notification occurs before the Delete() virtual function call which would
  // actually do the storage delete, so it is of limited value in testing
  // for completed delete. For that reason, we add a notification through the
  // observer service.
  async deleteSubfolders(aFolderIds)
  {
    log.config("server deleteSubfolders count is " + aFolderIds.length);
    let folderURIs = [];
    try {
      let processFault = (aItem, aEvent, aData, aResult) => {
          this.processFault(aItem, aEvent, aData, aResult);
      }

      for (let i = 0; i < aFolderIds.length; i++)
      {
        const nativeFolder = this.nativeMailbox.getNativeFolder(aFolderIds.getAt(i));
        let folderURI = nativeFolder.folderURI;
        if (folderURI)
          log.info("deleting folder with folderURI=" + folderURI);
        else
          log.warn("Blank folderURI for native folderID:" + aFolderIds.getAt(i));

        folderURIs.push(folderURI);
      }
      let promiseDelete = new PromiseUtils.MachineListener(processFault);
      this.nativeMailbox.deleteSubfolders(aFolderIds, promiseDelete, true);
      let deleteResult = await promiseDelete.promise;

      if (deleteResult.status != Cr.NS_OK)
        throw CE("Failed to delete folder(s)");
    } catch (ex) {
      ex.code = "error-delete-subfolders";
      log.error("Failed to delete folders", ex);
      Services.obs.notifyObservers(aFolderIds, "exquilla.folderDeleted", "failure");
      return;
    }
    log.debug("done deleting EWS folders, now deleting skink folders");
    // Also delete the skink folders.
    for (let folderURI of folderURIs)
    {
      if (folderURI) {
        let skinkFolder = getExistingFolder(folderURI);
        skinkFolder.parent.propagateDelete(skinkFolder, true, null);
      }
    }
    Services.obs.notifyObservers(aFolderIds, "exquilla.folderDeleted", "success");
  },

  async saveAttachment(aContentType, aURL, aDisplayName, aMessageUri, aIsExternalAttachment) {
    log.config("EwsIncomingServer.saveAttachment with url " + aURL + " aDisplayName " + aDisplayName);
    // open external attachments inside our message pane which in turn should trigger the
    // helper app dialog...
    if (aIsExternalAttachment)
      throw CE("We do not support external attachments", Cr.NS_ERROR_NOT_IMPLEMENTED);

    let skinkService = Cc["@mozilla.org/messenger/messageservice;1?type=exquilla"]
                         .getService(Ci.nsIMsgMessageService);
    let uriOut = {};
    skinkService.GetUrlForUri(aURL, uriOut, null);
    let uri = uriOut.value;
    let ewsUrl = safeGetJS(uri, "EwsUrl");

    if (!ewsUrl.isAttachment)
      throw CE("This is not an attachment URL: " + uri.spec);

    let itemId = ewsUrl.itemId;
    let item = this.nativeMailbox.getItem(itemId);
    let filePicker = Cc["@mozilla.org/filepicker;1"]
                       .createInstance(Ci.nsIFilePicker);
    let defaultDisplayName = getSanitizedFolderName(aDisplayName);
    let saveAttachmentStr = this._getString("SaveAttachment");
    let domWindow = Services.ww.activeWindow;
    let lastSaveDirectory = null;
    try {
      lastSaveDirectory = Services.prefs.getComplexValue("messenger.save.dir",
                            Ci.nsIFile);
    } catch (ex) {
      // This can fail if not inititialized.
    }

    filePicker.init(domWindow, saveAttachmentStr, Ci.nsIFilePicker.modeSave);
    filePicker.defaultString = defaultDisplayName;
    filePicker.appendFilters(Ci.nsIFilePicker.filterAll);
    if (lastSaveDirectory)
      filePicker.displayDirectory = lastSaveDirectory;

    let dialogResult = await new Promise(resolve => filePicker.open(resolve));
    if (dialogResult != Ci.nsIFilePicker.returnOK)
      return;

    log.config("Save attachment to file " + filePicker.file.path);

    { // set last save directory

      // if the file is a directory, just use it for the last dir chosen
      // otherwise, use the parent of the file as the last dir chosen.
      let isDirectory = false;
      try {
        isDirectory = filePicker.file.isDirectory();
      } catch(ex) {
        // IsDirectory() will return error on saving a file, as the
        // file doesn't exist yet.
      }
      Services.prefs.setComplexValue("messenger.save.dir", Ci.nsIFile,
        isDirectory ? filePicker.file : filePicker.file.parent);
    }

    try {
      // Process SMIME messages through libmime with the raw mime content
      if (item.itemClass.startsWith("IPM.Note.SMIME"))
      {
        log.config("saveAttachment for a SMIME message");
        let ewsHandler = skinkService.QueryInterface(Ci.nsIProtocolHandler);
        let ewsChannel = ewsHandler.newChannel(uri);
        let requestObserverWrap = {
          onStartRequest(aRequest) {
            const PR_WRONLY = 0x02;
            const PR_CREATE_FILE = 0x08;
            this._fileStream = Cc["@mozilla.org/network/file-output-stream;1"]
                                 .createInstance(Ci.nsIFileOutputStream);
            this._fileStream.init(this._saveToFile, PR_WRONLY | PR_CREATE_FILE, 0o600, 0);
          },

          onDataAvailable(aRequest, aInputStream, aOffset, aCount) {
            log.debug("SaveChannelToFileListener.onDataAvailable count=" + aCount);
            let writeCount = this._fileStream.writeFrom(aInputStream, aCount);
            if (writeCount != aCount) {
              log.warn("Not all characters written to output file, expected=" + aCount +
                       " written=" + writeCount);
            }
          },

          onStopRequest(aRequest, aStatusCode) {
            if (this._fileStream)
              this._fileStream.close();
            this._fileStream = null;
          },
        };

        let requestObserver = new PromiseUtils.RequestObserver(requestObserverWrap);
        await requestObserver.promise;
      }
      else {  // Normal save
        log.config("Saving attachment URL " + aURL + " to file " + filePicker.file.path);
        let attachmentNumber = ewsUrl.attachmentSequence;
        let attachment = item.getAttachmentByIndex(attachmentNumber);
        // save the attachment in the local attachment directory
        let listener = new PromiseUtils.MachineListener();
        this.nativeMailbox.getAttachmentContent(attachment, listener);
        let result = await listener.promise;
        if (!CS(result.status))
          throw CE("Failed to get attachment content");

        // copy the attachment to the desired destination
        // (might as well use OS.File now)
        let uri = Services.io.newURI(attachment.fileURL, null, null);
        let attachmentPath = uri.QueryInterface(Ci.nsIFileURL).file.path;
        log.debug("Copying attachment file from " + attachmentPath + " to " + filePicker.file.path);
        await OS.File.copy(attachmentPath, filePicker.file.path);
      }
      log.config("Attachment successfully saved");
      // It seems like there should be SOME notification when complete!
    } catch(ex) {
      ex.code = "error-save-attachment";
      log.error("Attachment save failed", ex);
    }
  },

// EwsEventListener implementation
  onEvent(aItem, aEvent, aData, result)
  {
    if ( (aEvent == "CredentialsChange") && this._mailbox)
    {
      // We don't support changing of hostname
     if (this._mailbox.domain != this.domain)
       this.domain = this._mailbox.domain;
     if (this._mailbox.username != this.realUsername)
       this.realUsername = this._mailbox.username; // Will call OnUserOrHostNameChanged
    }
  },

  // from skinkglue
  _getString(aStringName) {
    if (!this._stringBundle) {
      this._stringBundle = 
        Services.strings.createBundle("chrome://messenger/locale/messenger.properties");
    }
    return this._stringBundle.GetStringFromName(aStringName);
  },

}

// listeners

async function ewsDiscoverFoldersListener(aServer, aUrlListener) {
  let onSuccess = (result) => {
    if (aUrlListener)
      aUrlListener.OnStopRunningUrl(null, Cr.NS_OK);
  }
  let onError = (ex) => {
    ex.code = "error-discover-folders";
    log.error("Error in EwsDiscoverFoldersListener", ex);
    if (aUrlListener)
      aUrlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE);
  }

  try {
    let processFault = (aItem, aEvent, aData, aResult) => {
        aServer.processFault(aItem, aEvent, aData, aResult);
    };

    if (aServer.unavailable == aServer.AVAILABLE)
      showStatusFeedback("UpdatingSubfolders");
    let mailbox = aServer.nativeMailbox;
    let promiseDiscover = new PromiseUtils.MachineListener(processFault);
    mailbox.discoverFolders(promiseDiscover);
    let discoverResult = await promiseDiscover.promise;

    // remove the "Updating subfolders" status text
    if (aServer.unavailable == aServer.AVAILABLE)
      showStatusFeedback("");

    if (discoverResult.status != Cr.NS_OK) {
      log.info("discover folders failed, are we offline?");
    }

    mailbox.updateSubfolderIds();
    if (!mailbox.needFolderDiscovery)
      aServer.reconcileFolders();

    // We'll update the address books after discovery. We do this even if
    //  the initial result failed, as that probably just means we
    //  are offline.

    // We will loop though all ab directories, and look for ones that has a server URI matching this
    let ewsDirectories = [];
    let directoriesEnum = MailServices.ab.directories;
    while (directoriesEnum.hasMoreElements()) {
      let directory = directoriesEnum.getNext()
                                     .QueryInterface(Ci.nsIAbDirectory);
      let ewsDirectory = safeGetJS(directory, "EwsAbDirectory");
      if (!ewsDirectory)
        continue;

      let nativeFolder = ewsDirectory.nativeFolder;
      if ( !ewsDirectory.isGAL &&
            (!ewsDirectory.serverURI ||
             !(nativeFolder.folderId || nativeFolder.distinguishedFolderId) ||
             nativeFolder.hidden ||
             !nativeFolder.folderClass.startsWith("IPF.Contact")))
      {
        log.debug("ewsDirectory.serverURI: " + ewsDirectory.serverURI);
        log.debug("nativeFolder.folderId: " + nativeFolder.folderId);
        log.debug("nativeFolder.distinguishedFolderId: " + nativeFolder.distinguishedFolderId);
        log.debug("nativeFolder.hidden: " + nativeFolder.hidden);
        log.debug("nativeFolder.folderClass: " + nativeFolder.folderClass);
        // This is some sort of earlier problem. Just delete it locally, it will
        // reappear if it is real.
        log.config("Deleting address book that is hidden or with missing serverURI or folderId: " + directory.URI);
        MailServices.ab.deleteAddressBook(directory.URI);
        continue;
      }
      if (aServer.serverURI == ewsDirectory.serverURI)
        ewsDirectories.push(directory);
    }

    // We'll update the address books after discovery. We do this even if
    //  the initial result failed, as that probably just means we
    //  are offline.
    for (let directory of ewsDirectories) {
      let ewsDirectory = safeGetJS(directory, "EwsAbDirectory");
      log.config("Updating address book directory " + directory.URI);
      let promiseUpdateAb = new PromiseUtils.MachineListener(processFault);
      ewsDirectory.updateDirectory(promiseUpdateAb);
      let updateAbResult = await promiseUpdateAb.promise;

      if (updateAbResult.status != Cr.NS_OK)
        log.warn("Failed to update directory " + directory.URI);
    }

    // Start folder notifications.
    let useNotifications = Preferences.get("extensions.exquilla.useNotifications", false);
    if (mailbox.serverVersion == "2007sp1") {
      useNotifications = false;
      log.info("Streaming notifications not supported in EWS 2007");
    }
    if (useNotifications && !aServer._ewsNotification) {
      log.config("Starting notifications for server " + aServer.serverURI);
      aServer._ewsNotification = new EwsNotification(aServer);
      aServer._ewsNotification.startNotifications();
    }
  } catch (ex) {
    ex.code = "error-discover-folders";
    log.error("Error in ewsDiscoverFoldersListener", ex);
    if (aUrlListener)
      aUrlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE);
    return;
  }
  if (aUrlListener)
    aUrlListener.OnStopRunningUrl(null, Cr.NS_OK);
}

async function ewsCheckOnlineListener(aServer)
{
  try {
    let processFault = function(aItem, aEvent, aData, aResult) {
      aServer.processFault(aItem, aEvent, aData, aResult);
    };

    let mailbox = aServer.nativeMailbox;
    if (!mailbox.email)
      mailbox.email = aServer.email;

    let promiseOnline = new PromiseUtils.MachineListener(processFault);
    mailbox.checkOnline(promiseOnline);
    let rOnline = await promiseOnline.promise;

    if (rOnline.status != Cr.NS_OK) {
      log.config("check online failed, setting offline");
      aServer.unavailable = aServer.OFFLINE;
      throw CE("Failure from checkOnline", rOnline.status);
    }

    // Tell the server that we are confirmed available
    log.config("Confirming EWS Server with email " + aServer.email);

    // Confirm the server time;
    let nowSeconds = Date.now()/1000.;
    aServer.setIntValue("exquillaP2", nowSeconds);

    // We at least online, make sure at least that much is clear.
    aServer.unavailable = aServer.AVAILABLE;
    let promiseExpand = new PromiseUtils.UrlListener();
    aServer.performExpandAsync(null, promiseExpand);
    let exitCode = await promiseExpand.promise;
    if (exitCode != Cr.NS_OK)
      throw CE("performExpandAsync failed", exitCode);
  } catch (ex) {
    // unsuccessful check, error callback to listeners
    log.info("Error checking online: " + ex + " Stack: " + ex.stack);
    for (let urlListener of aServer._checkOnlineUrlListeners) {
      urlListener.OnStopRunningUrl(null, ex.result || Cr.NS_ERROR_FAILURE);
    }
    aServer._checkOnlineUrlListeners.length = 0;
    return;
  }
  log.debug("Calling OnStopRunningUrl with success");
  // successful check, success callback to listeners
  for (let urlListener of aServer._checkOnlineUrlListeners) {
    urlListener.OnStopRunningUrl(null, Cr.NS_OK);
  }
  aServer._checkOnlineUrlListeners.length = 0;
}

// Constructor
function EwsIncomingServerConstructor() {
}

// Constructor prototype (not instance prototype).
EwsIncomingServerConstructor.prototype = {
  classID: EwsIncomingServer.Properties.classID,
  _xpcom_factory: JSAccountUtils.jaFactory(EwsIncomingServer.Properties, EwsIncomingServer),
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsIncomingServerConstructor]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
