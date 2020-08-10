/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010, 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

//#filter substitution
//#include @INCLUDEDIR@/msqEwsCID.h

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
try { // COMPAT for TB 68
  Object.defineProperties(ChromeUtils.import("resource:///modules/AddrBookManager.jsm").AddrBookManager.prototype, Object.getOwnPropertyDescriptors(ChromeUtils.import("resource://exquilla/AddrBookManager.jsm").AddrBookManager.prototype));
  MailServices.ab = MailServices.ab.wrappedJSObject;
  Services.obs.notifyObservers(null, "addrbook-reload", null);
} catch (ex) { // COMPAT for TB 68
} // COMPAT for TB 68

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("base");
  return _log;
});

const ATTACHMENT_QUERY = "part=1.";

const MSQ_HTTPS_DEFAULT_PORT = 443;

// local utility functions
function prepareEwsUrl(aSrcMsgURI,   // string spec
                       aUrlListener, // nsIUrlListener
                       msgWindow)    // nsIMsgWindow
{
  //
  // OK I've gone back and forth on this, and it seems like skink feeds me
  //  protocol://server/folder#key but the #key part really doesn't play well with
  //  necko. So I will follow the lead of skink, and revert to converting this.
  //
  // So exquilla-message://server/folder#123 becomes exquilla://server/folder?number=123
  //

  // we setup all of the required attributes for the message url, including looking
  //  up the item id from the skink message key

  let uri = Cc["@mesquilla.com/ewsurl;1"].createInstance(Ci.nsIURI);
  uri instanceof Ci.nsIMsgMailNewsUrl;
  uri instanceof Ci.nsIMsgMessageUrl;
  let ewsUrl = safeGetJS(uri, "EwsUrl");

  let [folderURIBase, key, queryStr] = Utils.parseMessageURI(aSrcMsgURI);
  let folderURI = folderURIBase;
  ewsUrl.messageKey = key;

  // Now reassemble as a folder URI with query for key
  if (queryStr) {
    // add a number?
    folderURI += "?" + queryStr;
    if (queryStr.indexOf("number=") == -1)
      folderURI += "&number=" + key;
  }
  else {
    folderURI += "?number=" + key;
  }
  if (Ci.msgIJaUrl) {
    uri.QueryInterface(Ci.msgIJaUrl).setSpec(folderURI);
  } else {
    uri.spec = folderURI;
  }

  // set the original message uri
  uri.uri = aSrcMsgURI;

  // set up the url listener
  if (aUrlListener)
    uri.RegisterListener(aUrlListener);

  uri.msgWindow = msgWindow;

  let fls = Cc["@mozilla.org/mail/folder-lookup;1"]
              .getService(Ci.nsIFolderLookupService);
  let skinkFolder = fls.getFolderForURL(folderURIBase);
  uri.folder = skinkFolder;

  if (key != -1)
  {
    let ewsFolder = safeGetJS(skinkFolder);
    let itemId = ewsFolder.idFromKey(key);
    // Clearing the message pane seems to try to get the URI of the message after it is deleted.
    // So I ignore this, but warn.
    //if (itemId.IsEmpty())
    //  EWS_LOG_WARN("Empty id. This seems to be normal when clearing the message pane after a delete");
    ewsUrl.itemId = itemId;
  }
  return uri;
}

// Given a message URI, return [nsIMsgFolder, messageKey]
function decomposeMessageURI(aMessageURI)
{
  let [folderURIBase, key, queryStr] = Utils.parseMessageURI(aMessageURI);
  let fls = Cc["@mozilla.org/mail/folder-lookup;1"]
              .getService(Ci.nsIFolderLookupService);
  let skinkFolder = fls.getFolderForURL(folderURIBase);
  return [skinkFolder, key];
}

// Note this is not a JsAccount class

var global = this;
function EwsService() {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
}

EwsService.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },
  //classID: Components.ID("@MSQ_EWSSERVICE_CID2@"),
  classID: Components.ID("{909A8F4E-F966-47f1-A65D-5A9C186A8790}"),
  QueryInterface: ChromeUtils.generateQI([Ci.nsIMsgProtocolInfo,
                                          Ci.nsIMsgMessageService,
                                          Ci.nsIMsgProtocolHandler,
                                          Ci.nsIProtocolHandler]/* COMPAT for TB 68 */.filter(i => i)),

  // local methods
  _fetchMessage(aMessageURI,
               aDisplayConsumer, // nsISupports
               aMsgWindow,       // nsIMsgWindow
               aUrlListener,     //nsIUrlListener
               aFileName,        // string, only used by open attachment
               aCharsetOverride, // string
               aType,            // int, eg nsIMsgMailNewsUrl::eMove
               aLocalOnly)       // boolean
  {
    // returns nsIURI aURL
    log.config("fetchMessage for uri " + aMessageURI);

    let uri = prepareEwsUrl(aMessageURI, aUrlListener, aMsgWindow);
    let ewsUrl = safeGetJS(uri, "EwsUrl");
    ewsUrl.setUrlType(aType);
    {
      // debug
      log.debug("ewsService fetchMessage preparedURL is " + uri.spec);
    }

    // fail if aLocalOnly and no body
    if (aLocalOnly)
    {
      if (!ewsUrl.mailbox ||
          !ewsUrl.itemId ||
          !(ewsUrl.mailbox.getItem(ewsUrl.itemId).flags & ewsUrl.mailbox.getItem(ewsUrl.itemId).HasOfflineBody))
      {
        throw CE("Need a body for offline operation, flags=" + ewsUrl.mailbox.getItem(ewsUrl.itemId).flags);
      }
    }

    if (aDisplayConsumer instanceof Ci.nsIDocShell) {
      uri.loadURI(aDisplayConsumer, Ci.nsIWebNavigation.LOAD_FLAGS_NONE);
      return uri;
    }

    // Some things (like forwarding a message) give us a stream listener instead
    //  of a doc shell. Handle that.
    if (aDisplayConsumer instanceof Ci.nsIStreamListener) {
      if (aMsgWindow)
        uri.msgWindow = aMsgWindow;
      try {
        var loadGroup = uri.loadGroup;
      } catch (e) {
        dl("Missing load group, expected in tests with null msgWindow");
      }

      let channel = this.newChannel(uri);

      // we need a load group to hold onto the channel. When the request is finished,
      // it'll get removed from the load group, and the channel will go away,
      // which will free the load group.
      if (!loadGroup)
        var loadGroup = Cc["@mozilla.org/network/load-group;1"]
                      .createInstance(Ci.nsILoadGroup);

      channel.loadGroup = loadGroup;

      //  now try to open the channel passing in our display consumer as the listener
      channel.asyncOpen(aDisplayConsumer, uri);
      return uri;
    }
    throw CE("display consumer not valid type", Cr.NS_ERROR_UNEXPECTED);
  },

  get messages2006() { return "http://schemas.microsoft.com/exchange/services/2006/messages";},
  get types2006() { return "http://schemas.microsoft.com/exchange/services/2006/types";},

  // If the folder is the root folder, treat this as a request to
  // add the global address book.
  addAbFromNativeContactFolder(aNativeFolder)
  {
    let isDeleted = aNativeFolder.isDeleted;
    let nativeMailbox = aNativeFolder.mailbox;
    let serverURI = nativeMailbox.serverURI;

    // XXX todo Do we need the server at all? Only for UseAB?
    // We don't need or want a full exquilla URI here, as all the AM does is
    // parse out text fields.
    let uri = newParsingURI(serverURI);
    let server;
    try {
      server = MailServices.accounts.findServerByURI(uri, false);
    } catch (e) {
      log.warn("Could not get server for native mailbox: " + e);
    }

    let folderId = aNativeFolder.folderId;
    let dfolderId = aNativeFolder.distinguishedFolderId;

    // Skink does not support AB subdirectories. So generate an extended
    //  display name that includes the full path.
    let displayName = "";

    if (dfolderId == "msgfolderroot")
    {
      // preference "extensions.exquilla.useGAL" governs whether GAL is used
      let useGAL = Services.prefs.getBoolPref("extensions.exquilla.useGAL");
      isDeleted = !useGAL;
      displayName = "GAL";
      log.config("msqEwsService.addAbFromNativeContactFolder for the GAL");
    }
    else
    {
      displayName = aNativeFolder.displayName;
      log.config("msqEwsService.addAbFromNativeContactFolder name:" + displayName);
    }

    // path will be similar, but will not use the email address in the root
    let [extendedDisplayName, path] = Utils.extendDisplayName(displayName, aNativeFolder);
    displayName = extendedDisplayName;

    let matchingDirectory;
    let directories = MailServices.ab.directories;
    while (directories.hasMoreElements())
    {
      let directory = directories.getNext().QueryInterface(Ci.nsIAbDirectory);
      let directoryFolderId = directory.getStringValue("folderId", "");
      if (directoryFolderId == folderId)
      {
        matchingDirectory = directory;
        break;
      }
    }

    let useAB = server ? server.getBoolValue("useAB") : true;
    if (!useAB)
      log.config("Address book is disabled");

    if (!matchingDirectory && (!isDeleted) && useAB)
    {
      // add an address book for this directory
      // find the beginning of the server name
      let postSlashes = serverURI.indexOf("://") + 3;
      let serverPath = serverURI.substring(postSlashes);

      let escapedPath = Services.netUtils.escapeString(path, Ci.nsINetUtil.ESCAPE_URL_PATH);

      // For testing purposes, we allow the uri to be set in preferences.
      // preference extensions.exquilla.abScheme
      let uri = Services.prefs.getCharPref("extensions.exquilla.abScheme") +
                  "://" + serverPath + "/" + escapedPath;
      log.info("New Address Book with URI " + uri);

      const MAPIDirectory = 3;
      let dirPref = "ldap_2.servers.ews://";

      // the list of servers in prefs will break on "." so we must escape periods
      //  for the pref path
      serverPath+= "/" + path;
      let escapedPrefPath = 
        Services.netUtils.escapeURL(serverPath, Ci.nsINetUtil.ESCAPE_URL_FILE_EXTENSION);

      dirPref+= escapedPrefPath;
      let returnedURI = MailServices.ab.newAddressBook(displayName, uri, MAPIDirectory, dirPref);

      matchingDirectory = MailServices.ab.getDirectory(uri);
      let ewsDirectory = safeGetJS(matchingDirectory);

      // glue between the native folder and the ab directory
      ewsDirectory.folderId = folderId;
      if (aNativeFolder.distinguishedFolderId)
        ewsDirectory.distinguishedFolderId = aNativeFolder.distinguishedFolderId;
    }

    else if (matchingDirectory && (isDeleted || !useAB))
    {
      // deleted from the address book manager
      MailServices.ab.deleteAddressBook(matchingDirectory.URI);
    }

    // This will also update the dirName if the server changed the name
    if (!isDeleted && useAB) {
      matchingDirectory.dirName = displayName;
    }

    if (dfolderId == "msgfolderroot") {
      return matchingDirectory;
    }

    // recursively loop through all subfolders
    let subfolderIds = aNativeFolder.subfolderIds;
    if (subfolderIds)
    {
      for (let ii = 0; ii < subfolderIds.length; ii++)
      {
        let subfolderId = subfolderIds.getAt(ii);
        let subNativeFolder = nativeMailbox.getNativeFolder(subfolderId);
        this.addAbFromNativeContactFolder(subNativeFolder);
      }
    }
    return matchingDirectory;
  },

//  nsIMsgProtocolInfo implementation

  get defaultLocalPath() {
    dl("get defaultLocalPath");
    if (this._defaultLocalPath)
      return this._defaultLocalPath;
    // Setup a default location, "ExQuilla" directory in profile.
    const NS_APP_USER_PROFILE_50_DIR = "ProfD";
    let typedir = Services.dirsvc.get(NS_APP_USER_PROFILE_50_DIR, Ci.nsIFile);
    typedir.append("ExQuilla");
    if (!typedir.exists())
      typedir.create(Ci.nsIFile.DIRECTORY_TYPE, 0o700);
    this._defaultLocalPath = typedir;
    return typedir;
  },
  set defaultLocalPath(defaultLocalPath) {
    this._defaultLocalPath = defaultLocalPath;
  },
  get serverIID() { return Ci.nsIMsgIncomingServer; },
  get requiresUsername() { return true; },
  get preflightPrettyNameWithEmailAddress() { return false; },
  get canDelete() { return true; },
  get canLoginAtStartUp() { return false; },
  get canDuplicate() { return false; },
  getDefaultServerPort(isSecure) { return MSQ_HTTPS_DEFAULT_PORT; },
  get canGetMessages() { return true; },
  get canGetIncomingMessages() { return true; },
  get defaultDoBiff() { return false; },
  get showComposeMsgLink() { return true; },
  get foldersCreatedAsync() { return true; },
/*

// nsIMsgMessageService implementation

*/
  CopyMessage(aSrcURI, aCopyListener, aMoveMessage,
              aUrlListener, aMsgWindow, uriObject)
  {
    let modifiedURL = aSrcURI;
    // add a headers string if none is present and this is not an attachment
    let findIndex = modifiedURL.indexOf(ATTACHMENT_QUERY);
    if (findIndex == -1)
    {
      findIndex = modifiedURL.indexOf("header=");
      if (findIndex == -1) {
        let hasQuery = (modifiedURL.indexOf("?") != -1);
        modifiedURL += (hasQuery) ? "&header=src" : "?header=src";
      }
    }
    let uri = this._fetchMessage(modifiedURL, aCopyListener,
                               aMsgWindow, aUrlListener, null, null,
                               (aMoveMessage ? Ci.nsIMsgMailNewsUrl.eMove : Ci.nsIMsgMailNewsUrl.eCopy),
                               false);
    uriObject.value = uri;
    return;
  },

  DisplayMessage(aMessageURI, aDisplayConsumer,
                 aMsgWindow, aUrlListener,
                 aCharsetOverride, uriObject)
  {
    log.config("DisplayMessage for uri " + aMessageURI);

    // Append appropriate query
    let modifiedURL = (aMessageURI);
    // add a headers string if none is present and this is not an attachment
    let findIndex = modifiedURL.indexOf(ATTACHMENT_QUERY);
    if (findIndex == -1)
    {
      findIndex = modifiedURL.indexOf("header=");
      if (findIndex == -1) {
       let hasQuery = (modifiedURL.indexOf("?") != -1);
       modifiedURL += hasQuery ? "&header=all" : "?header=all";
      }
    }

    findIndex = modifiedURL.indexOf("fetchCompleteMessage=true");
    if (findIndex != -1)
    {
      // We handle forward_inline and forward_as_attachment differently,
      //   but both put that fetchCompleteMessage=true
      //   query item. Look at the mime converter to figure out what this is
      let converter = safeQueryInterface(aDisplayConsumer, Ci.nsIMimeStreamConverter);
      if (converter)
      {
        if (converter.forwardInline)
          log.debug("This is forward inline");
        else
        {
          log.debug("fetchCompleteMessage=true but not forwardInline");
          modifiedURL += "&fetchEwsMessage=true";
        }
      }
    }

    // How do we tell if this is a view source in protocol? viewsource does not come through here,
    //  so add the message display type if missing
    let typeIndex = modifiedURL.indexOf("&type=application/x-message-display");
    if (typeIndex == -1)
      typeIndex = modifiedURL.indexOf("&type=application/exquilla-message-display");
    if (typeIndex == -1)
      modifiedURL += ("&type=application/exquilla-message-display");

    let uri = this._fetchMessage(modifiedURL, aDisplayConsumer,
                              aMsgWindow, aUrlListener, null,
                              aCharsetOverride, Ci.nsIMsgMailNewsUrl.eDisplay, false);
    uriObject.value = uri;
    return;
  },

  openAttachment(aContentType, aFileName, aUrl, aMessageURI, aDisplayConsumer, aMsgWindow, aUrlListener)
  {
    // returns nsIURI aURL
    log.config("openAttachment for uri " + aUrl + " aMessageURI " + aMessageURI);

    let uri = prepareEwsUrl(aUrl, aUrlListener, aMsgWindow);
    // set the original message uri
    uri instanceof Ci.nsIMsgMessageUrl;
    uri.uri = aMessageURI;

    if (aDisplayConsumer instanceof Ci.nsIDocShell) {
      uri.loadURI(aDisplayConsumer, Ci.nsIWebNavigation.LOAD_FLAGS_IS_LINK);
      return;
    }
    throw CE("openAttachment only support doc shells", Cr.NS_ERROR_UNEXPECTED);
  },

  SaveMessageToDisk(aMessageURI, aFile, aGenerateDummyEnvelope, aUrlListener, aURL, aCanonicalLineEnding, aMsgWindow)
  {
    log.config("SaveMessageToDisk with uri " + aMessageURI);
    let uri = prepareEwsUrl(aMessageURI, aUrlListener, aMsgWindow);
    uri instanceof Ci.nsIMsgMessageUrl;
    uri.messageFile = (aFile);
    uri.canonicalLineEnding = (aCanonicalLineEnding);

    // kick off the save
    let channel = this.newChannel(uri);
    channel.asyncOpen(null, null);
    aURL.value = uri;
  },

  GetUrlForUri(aMessageURI, aURL, aMsgWindow)
  {
    let uri = prepareEwsUrl(aMessageURI, null, aMsgWindow);
    aURL.value = uri;
  },

  DisplayMessageForPrinting(aMessageURI, aDisplayConsumer, aMsgWindow, aUrlListener, aURL)
  {
    // Append appropriate query
    let modifiedURL = aMessageURI + "?header=print";

    let uri = this._fetchMessage(modifiedURL, aDisplayConsumer, aMsgWindow, aUrlListener, null,
                                 null, Ci.nsIMsgMailNewsUrl.eDisplay, false);
    aURL.value = uri;
  },

  streamMessage(aMessageURI,
                aConsumer,
                aMsgWindow,
                aUrlListener,
                aConvertData,
                aAdditionalHeader,
                aLocalOnly)
  {
    // The protocol object will look for "header=filter" or
    // "header=attach" to decide if it wants to convert the data instead of
    // using aConvertData. It turns out to be way too hard to pass aConvertData
    // all the way over to the mailbox protocol object.

    let URIString = aMessageURI;
    if (aAdditionalHeader)
    {
      if (URIString.indexOf('?') == -1)
        URIString += "?"
      else
        URIString += "&";
      URIString += "header=";
      URIString += aAdditionalHeader;
    }

    return this._fetchMessage(URIString, aConsumer, aMsgWindow, aUrlListener,
                              null, null, -1, aLocalOnly);
  },

  messageURIToMsgHdr(uri)
  {
    let [msgFolder, msgKey] = decomposeMessageURI(uri);
    return msgFolder.GetMessageHeader(msgKey);
  },


// nsIProtocolHandler methods

  get defaultPort() { return MSQ_HTTPS_DEFAULT_PORT;},

  newURI(aSpec, aOriginCharset, aBaseURI)
  {
    //log.debug("newURI for aSpec <" + aSpec + "> and aBaseURI <" + (aBaseURI ? aBaseURI.spec : "") + ">");
    // I don't understand why I am getting the spec in the baseURI, but if I do accept
    // it.
    
    let fullSpec = aSpec ? ( (aBaseURI) ? aBaseURI.resolve(aSpec) : aSpec) :
                            aBaseURI.spec;
    return prepareEwsUrl(fullSpec, null,  null);
  },

  newChannel(aURI, aLoadInfo)
  {
    let protocol = Cc["@mesquilla.com/ewsprotocol;1"]
                     .createInstance(Ci.nsIChannel).wrappedJSObject;
    protocol.setURI(aURI);
    protocol.loadInfo = aLoadInfo;

    return protocol;
  },

  get scheme() { throw Cr.NS_ERROR_NOT_IMPLEMENTED;},
  allowPort(port, scheme) { throw Cr.NS_ERROR_NOT_IMPLEMENTED;},
  get protocolFlags() {
    return Ci.nsIProtocolHandler.URI_STD |
           Ci.nsIProtocolHandler.URI_FORBIDS_AUTOMATIC_DOCUMENT_REPLACEMENT |
           Ci.nsIProtocolHandler.URI_DANGEROUS_TO_LOAD |
           Ci.nsIProtocolHandler.ALLOWS_PROXY;
  },

}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsService]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
