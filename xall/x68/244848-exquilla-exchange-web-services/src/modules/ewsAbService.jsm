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
 
var EXPORTED_SYMBOLS = ["EwsAbService"];

var Cu = Components.utils;
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);

// Ews-related address book methods.

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");

let gActiveLoadServerListener = null; // to own ourselves
let gValidEwsServers = null; // list of servers to load
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("addressbook");
  return _log;
});

function serverFromSpec(spec)
{
  let allServers = MailServices.accounts.allServers;
  for (let server of /* COMPAT for TB 68 */toArray(allServers, Ci.nsIMsgIncomingServer))
  {
    if (server.serverURI == spec)
      return server;
  }
  return null;
}

function LoadServerListener(aEwsServer, aEventListener)
{
  this.server = aEwsServer;
  this.exqServer = safeGetJS(this.server);
  this.eventListener = aEventListener;
}

LoadServerListener.prototype =
{
  OnStartRunningUrl: function onStartRunningUrl(aUri) {},
  OnStopRunningUrl: function onStopRunningUrl(aUri, aResult)
  { try {
    log.debug("LoadServiceListener onStopRunningUrl() result is " + aResult);
    if (aResult)
      log.info("Address book load failed for server " + this.server ? this.server.prettyName : "Unknown");
    else
    {
      // Now that we have all of the folders, make sure that we have a skink AB for each
      //  relevant native folder.
      let folderIds = new StringArray();
      let mailbox = this.exqServer.nativeMailbox;
      let contactsFolder = mailbox.getDistinguishedNativeFolder("contacts");
      let ewsService = Cc["@mozilla.org/messenger/messageservice;1?type=exquilla"]
                         .getService().wrappedJSObject;
      ewsService.addAbFromNativeContactFolder(contactsFolder);
      // also add the GAL
      let rootFolder = mailbox.getDistinguishedNativeFolder("msgfolderroot");
      ewsService.addAbFromNativeContactFolder(rootFolder);

      let directories = MailServices.ab.directories;
      let serverURI = this.server.serverURI;
      for (let directory of /* COMPAT for TB 68 */toArray(directories, Ci.nsIAbDirectory))
      {
        log.debug("Should we load directory " + directory.URI + " name " + directory.dirName);
        let jsDirectory;
        try {
          jsDirectory = safeGetJS(directory);
        } catch (e) {}
        if (jsDirectory && jsDirectory.serverURI == serverURI)
          jsDirectory.loadDirectoryCards(null);
      }
    }

    // restart another server
    let serverURI= gValidEwsServers.shift();
    if (serverURI)
    {
      this.server = serverFromSpec(serverURI);
      this.exqServer = safeGetJS(this.server);
      let msgWindow = null;
      try {
        msgWindow =  MailServices.mailSession.topmostMsgWindow;
      } catch (e) {}
      return this.exqServer.performExpandAsync(msgWindow, gActiveLoadServerListener);
    }

    gActiveLoadServerListener = null;
    this.server = null;
    this.exqServer = null;
    if (this.eventListener)
      this.eventListener.onEvent(null, "StopOperation", null, aResult);
  } catch (e) {re(e);}}
}

var EwsAbService =
{
  loadEwsServers: function loadEwsServers(aEventListener)
  { try {
    log.config("loadEwsServers() aEventListener is " + aEventListener);
    if (gActiveLoadServerListener)
    {
      log.warn("loadEwsServers already active");
      return;
      //throw CE("loadEwsServers already active");
    }
    let allServers = MailServices.accounts.allServers;
    let msgWindow = null;
    gValidEwsServers = [];
    try {
      msgWindow =  MailServices.mailSession.topmostMsgWindow;
    } catch (e) {}

    for (let server of /* COMPAT for TB 68 */toArray(allServers, Ci.nsIMsgIncomingServer))
    {
      if (server.localStoreType == "exquilla")
      {
        log.config("Loading EWS server " + server.serverURI);
        gValidEwsServers.push(server.serverURI);
      }
    }

    // now go through all existing EWS ab directories, and remove any that do not have a valid
    //  serverURI, or whose native folder is flagged as hidden.
    let directories = MailServices.ab.directories;
    while (directories.hasMoreElements())
    {
      let directory = directories.getNext();
      let jsDirectory = safeGetJS(directory);
      if (jsDirectory)
      {
        let hidden = true;
        try {
          hidden = jsDirectory.nativeFolder.hidden;
        } catch (e) {}
        if (hidden || gValidEwsServers.indexOf(jsDirectory.serverURI) == -1)
        {
          directory instanceof Ci.nsIAbDirectory;
          log.info("found ews address book, but hidden or no valid server, deleting ab with URI "
                   + directory.URI);
          MailServices.ab.deleteAddressBook(directory.URI);
        }
      }
    }

    // expand servers to add needed address books
    if (gValidEwsServers.length)
    {
      let server = serverFromSpec(gValidEwsServers.shift());
      let exqServer =  safeGetJS(server);
      gActiveLoadServerListener = new LoadServerListener(server, aEventListener ? aEventListener : null);
      exqServer.performExpandAsync(msgWindow, gActiveLoadServerListener);
    }
  } catch (e) {re(e);}},
}
