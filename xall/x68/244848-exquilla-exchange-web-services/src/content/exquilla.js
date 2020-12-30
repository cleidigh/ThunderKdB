/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

if (typeof(Services) == 'undefined')
  var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
if (typeof(MailServices) == 'undefined')
  var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

var exquilla = Object.create(
(function _exquilla()
{
  let pub = {};

  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const Cr = Components.results;

  if (typeof (pub.Utils) == "undefined")
    Object.assign(pub, ChromeUtils.import("resource://exquilla/ewsUtils.jsm"));
  Object.assign(pub, ChromeUtils.import("resource://exquilla/ewsAbService.jsm"));
  Object.assign(pub, ChromeUtils.import("resource://exquilla/PromiseUtils.jsm", pub));
  // local shorthands
  let re = pub.Utils.re;
  let dl = pub.Utils.dl;
  let log = pub.Utils.ewsLog;
  let safeGetJS = pub.Utils.safeGetJS;
  let getExtensionVersion = pub.Utils.getExtensionVersion;
  let PromiseUtils = pub.PromiseUtils;

  const exquillaStrings = Cc["@mozilla.org/intl/stringbundle;1"]
                                .getService(Ci.nsIStringBundleService)
                                .createBundle("chrome://exquilla/locale/exquilla.properties");

  let serverListener = {
    onServerLoaded: function onServerLoaded(aServer) {
      if (safeGetJS(aServer, "EwsIncomingServer"))
      {
        log.config('onServerLoaded()');
        try {
          exquilla.EwsAbService.loadEwsServers();
        } catch (e) {}
      }
    },
    onServerUnloaded: function onServerUnloaded(aServer) {
      if (safeGetJS(aServer, "EwsIncomingServer"))
      {
        log.config('onServerUnloaded()');
        try {
          exquilla.EwsAbService.loadEwsServers();
        } catch (e) {}
      }
    },
    onServerChanged: function onServerChanged(aServer) {
    },
  };

  function onLoad()
  {
    // Log basic info into log file
    let appVersion = Services.appinfo.version;
    let OS = Services.appinfo.OS;
    log.config('exquilla onLoad() AppVersion: ' + appVersion + " OS: " + OS);
    (async () => log.config("ExQuilla version is " + await getExtensionVersion()))();

    // With the removal of Thunderbird from the rapid release cycle, multirelease binaries
    //  need to support the old ESR version, was well as current versions. I'm not yet sure
    //  how to pull this off exactly, but the min/max versions for addons do not properly
    //  support the possibilities, so it is possible that the user is running a version of TB
    //  between min and max for which I did not ship binaries. Detect this and warn.
    let ewsServer = null;
    try {
      ewsServer  = Cc["@mozilla.org/messenger/server;1?type=exquilla"].createInstance(Ci.nsIMsgIncomingServer);
    } catch (e) {}

    if (ewsServer)
      log.debug("ewsServer component is loading properly");
    else
      log.warn("ewsServer component is not loading!");
    ewsServer = null;

    let rootBranch = Cc["@mozilla.org/preferences-service;1"]
                          .getService(Ci.nsIPrefBranch);
    let mailAccountBranch = Cc["@mozilla.org/preferences-service;1"]
                              .getService(Ci.nsIPrefService)
                              .getBranch("mail.account.");
    let exAccountBranch = Cc["@mozilla.org/preferences-service;1"]
                            .getService(Ci.nsIPrefService)
                            .getBranch("extensions.exquilla.mail.account.");

    let children = exAccountBranch.getChildList("", {});
    var testEx = new Error();
    testEx.code = "startup";
    log.error("Test error logging", testEx);
    function showAccounts(text) {
      log.debug("Accounts at " + text + ": " + rootBranch.getCharPref("mail.accountmanager.accounts"));
    }
    showAccounts("onLoad");
    let loadedAccount = false;
    let loadedAccounts = rootBranch.getCharPref("mail.accountmanager.accounts").split(",");
    let newServers = []; // new missing servers that are loaded by ExQuilla
    function findLoadedServer(aUsername, aHostname)
    {
      for (let server of newServers)
      { try {
          log.debug("Checking new server " + server);
          if ( (aHostname == rootBranch.getCharPref("mail.server." + server + ".hostname") ) &&
               (aUsername == rootBranch.getCharPref("mail.server." + server + ".userName") ) &&
               ("exquilla" == rootBranch.getCharPref("mail.server." + server + ".type") ) )
            return true;
        } catch (e) {}
      }

      // Sometimes servers don't load even when they should. So double check for loaded server
      // First check preferences
      for (let accountKey of loadedAccounts)
      { try {
          let server = rootBranch.getCharPref("mail.account." + accountKey + ".server");

          if ( (aHostname == rootBranch.getCharPref("mail.server." + server + ".hostname") ) &&
               (aUsername == rootBranch.getCharPref("mail.server." + server + ".userName") ) &&
               ("exquilla" == rootBranch.getCharPref("mail.server." + server + ".type") ) )
          {
            let account = MailServices.accounts.getAccount(accountKey);
            if (account && safeGetJS(account.incomingServer, "EwsIncomingServer"))
              return true;
          }
        } catch (e) {}
      }
      return false;
    }

    for (let pref of children)
    {
      // Is this account already loaded?
      try {
        let accountKey = /^account\d+/.exec(pref)[0];
        log.debug("Do we need to load account " + accountKey + "?");
        // don't load if this already exists
        let account = MailServices.accounts.getAccount(accountKey);
        if (account && account.incomingServer)
          continue; // already loaded

        // look for a server and check if it exists and is ews. We allow both "exquilla" and
        //   "exquillax" with the latter used only for testing.
        let serverKey = exAccountBranch.getCharPref(accountKey + ".server");
        let serverType = "notFound";
        try {
          serverType = rootBranch.getCharPref('mail.server.' + serverKey + '.type');
        } catch (e) {}
        log.debug("Checking server of type " + serverType);
        if (serverType != 'exquilla' && serverType != 'exquillax')
        {
          log.config("Deleting backup account info for non-exquilla account " + accountKey);
          try {
            exAccountBranch.clearUserPref(pref);
          } catch (e) {}
          continue;
        }

        let userName = rootBranch.getCharPref('mail.server.' + serverKey + '.userName');
        let hostname = rootBranch.getCharPref('mail.server.' + serverKey + '.hostname');

        log.debug('checking userName: ' + userName + ' hostname: ' + hostname + " to see if we can reload it");
        // I'm having a lot of issues with MailServices.accounts.FindServer reporting that the exquilla
        //  server exists when it does not, so what I will do is to scan loaded accounts myself.

        if (findLoadedServer(userName, hostname))
        {
          log.info("not adding server because it already seems to be loaded");
          // This server is already loaded, but not from this account. This is probably
          //  an old deleted account, so delete it now.
          log.config("Deleting backup account info for duplicate exquilla account " + accountKey);
          try {
            exAccountBranch.clearUserPref(pref);
          } catch (e) {}
          continue;
        }

        log.info("Adding pre-existing exquilla account " + accountKey);
        newServers.push(serverKey);
        if (!loadedAccount)
        {
          loadedAccount = true;
          gFolderTreeView.unload("folderTree.json");
        }

        // reset the account type so that it will really load for test accounts
        log.debug("Server to load has type " + serverType);
        if (serverType == "exquillax")
          rootBranch.setCharPref('mail.server.' + serverKey + '.type', "exquilla");

        if (!account)
        {
          // For some reason, users are seeing failures on update, which looks like
          //  mail.accountmanager.accounts has lost the exquilla accounts.

          // Set the account prefs from the stored exquilla copy
          mailAccountBranch.setCharPref(accountKey + ".server", serverKey);
          mailAccountBranch.setCharPref(accountKey + ".identities", exAccountBranch.getCharPref(accountKey + ".identities"));

          //  I have to create an exquilla account with a specific account number, which
          //  is not supported in core. But I can fake it by manipulating the "lastKey"
          //  preference which is used to set the new account number.
          let lastKey = 0;
          try {
            lastKey = rootBranch.getIntPref("mail.account.lastKey");
          } catch (e) {}
          let accountKeyInt = parseInt(/^account(\d+)/.exec(accountKey)[1], 10);
          rootBranch.setIntPref("mail.account.lastKey", accountKeyInt - 1);
          account = MailServices.accounts.createAccount();
          let newAccountKeyInt = parseInt(/^account(\d+)/.exec(account.key)[1], 10);
          log.config("Created account with int key " + newAccountKeyInt + " wanted int key " + accountKeyInt);
          // reset lastKey to original value
          if (newAccountKeyInt <= lastKey)
            rootBranch.setIntPref("mail.account.lastKey", lastKey);
          // add the new account to the account list
          let existingAccounts = rootBranch.getCharPref("mail.accountmanager.accounts");
          if (existingAccounts.split(",").indexOf(account.key) < 0)
            rootBranch.setCharPref("mail.accountmanager.accounts", existingAccounts + "," + account.key);
        }
        try {
          account.incomingServer = MailServices.accounts.getIncomingServer(serverKey);
        } catch (e) {log.warning("failed to create server with error " + e);}
        log.debug("account.incomingServer is type " + account.incomingServer.type);
      } catch(e) {log.debug('skipping pref ' + pref + ' with error: ' + e); continue;}
    }

    if (loadedAccount)
    {
      gFolderTreeView.load(document.getElementById("folderTree"), "folderTree.json");
      showAccounts("loadedAcount");
    }

    // Make a backup copy of server and identity for all loaded exquilla accounts
    let allAccounts = MailServices.accounts.accounts;
    for (let account of /* COMPAT for TB 68 */exquilla.Utils.toArray(allAccounts, Ci.nsIMsgAccount))
    {
      if (safeGetJS(account.incomingServer, "EwsIncomingServer"))
      { try {
          let serverKey = mailAccountBranch.getCharPref(account.key + ".server");
          let identities = mailAccountBranch.getCharPref(account.key + ".identities");
          exAccountBranch.setCharPref(account.key + ".server", serverKey);
          exAccountBranch.setCharPref(account.key + ".identities", identities);
          log.debug("Backing up server for " + account.key + " as " + serverKey);

          // make sure that we allow ntlm for all ews servers
          exquilla.Utils.manageNtlmUri(
            safeGetJS(account.incomingServer, "EwsIncomingServer").ewsURL, true);
        } catch (e) {log.debug("Error copying accounts: " + e);}
      }
    }

    // Prior to ExQuilla 18, the draft and fcc folders were always the appropriate
    //  server folders, regardless of how the options are set. After that, the
    //  set option matters - but most users will prefer the standard folders. Since
    //  for some reason earlier server frequently defaulted to the Local Folders,
    //  reset any existing old accounts to use the default locations to preserve the
    //  existing behaviour.
    children = mailAccountBranch.getChildList("", {});
    for (let pref of children)
    {
      try {
        let accountKey = /^account\d+/.exec(pref)[0];
        let account = MailServices.accounts.getAccount(accountKey);
        // look for a server and check if it exists and is ews
        let server = account.incomingServer;
        if (server.type != 'exquilla') continue;
        log.config("Found ews server with accountKey " + accountKey);
        /*
        if (!server.getBoolValue("postExquilla17"))
        {
          // We need to set to defaults
          let identity = account.defaultIdentity;
          let baseURI = server.serverURI + "/";
          identity.fccFolder = baseURI + encodeURIComponent("Sent");
          identity.draftFolder = baseURI + "Drafts";
          log.info("Reset the URI of fcc and drafts folder to default for server " + server.realHostName);
          server.setBoolValue("postExquilla17", true);
        }
        if (!server.getBoolValue("postExquilla19"))
        {
          // prior to ExQuilla 20, the outgoing server was set to "Default" which was interpreted
          //  as a request to use the Exchange server. Set those to explicitly refer to the
          //  ExQuilla incoming server, so that "Default" can really mean the default SMTP server.
          let identity = account.defaultIdentity;
          if (!identity.smtpServerKey)
          {
            log.info("Resetting smtp server to use Exchange server for server " + server.serverURI);
            identity.smtpServerKey = server.key;
          }
          server.setBoolValue("postExquilla19", true);
        }
        */
      } catch (e) {}
    }

    // Prior to ExQuilla 20, we were creating a Templates and Archives .msf file, and then
    //  nsMsgBrkMBoxStore::DiscoverSubFolders on shutdown would create a directory of the same
    //  name (which is bogus behavior, see bug 841900.)
    // This causes archives to local folders to fail. Detect these bogus directories, and
    //  if found delete them.

    // Local function to recursively cleanup missing .sbd directory extensions
    function addMissingSbd(directory)
    {
      // If the directory name does not end in ".sbd" then
      //  we have a problem, so rename it to a name that will not show as a folder (just in
      //  case there is some valid data in there, though there is not supposed to be)
      //  and create the correct non-directory entry
      if (directory.leafName.endsWith(".sbd"))
        return;
      log.warn("Fixing invalid directory created by an earlier version of ExQuilla with name " + directory.leafName);

      try {

        // Cleanup missing sbd for any subdirectories
        let validFile = directory.clone();
        validFile.leafName = directory.leafName + ".sbd";
        if (validFile.exists() && validFile.isDirectory())
        {
          let entries = validFile.directoryEntries;
          while (entries && entries.hasMoreElements())
          {
            let file = entries.getNext().QueryInterface(Ci.nsIFile);
            if (file.isDirectory())
              addMissingSbd(file);
          }
        }

        // Now rename the invalid directory, and create a correct non-directory mbox file
        let renamed = directory.clone();
        renamed.moveTo(null, directory.leafName + ".exquilla_invalid.sbd");
        directory.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
      } catch (e) {dl(e);}
    }

    try {
      if (!rootBranch.getBoolPref('extensions.exquilla.postExQuilla19'))
      {
        log.info("Locate and fix possible bogus Archives and Templates file directories");
        rootBranch.setBoolPref('extensions.exquilla.postExQuilla19', true);
        let localServerPath = getLocalMailServer().localPath;
        for (let name of ["Archives", "Templates"])
        {
          let bogus = localServerPath.clone();
          bogus.append(name);
          if (bogus.exists() && bogus.isDirectory())
            addMissingSbd(bogus);
        }
      }
    } catch (e) {log.warn("Error fixing bogus Archives and Templates directories " + e);}

    // track any additional changes
    rootBranch.addObserver("mail.account.", this, false);
    MailServices.accounts.addIncomingServerListener(serverListener);

    // although the worst account-deleting offenses in Thunderbird have been purged, in
    //  nsMsgIdentity::getFolderPref the folder pref is reset to local if the account
    //  does not exist, hence this messes with the Copies and Folder settings of
    //  ExQuilla accounts if the extension is unloaded. Reset these changes,
    //  and track any new ones.

    let exIdentBranch = Services.prefs.getBranch("extensions.exquilla.mail.identity.");
    let mailIdentBranch = Services.prefs.getBranch("mail.identity.");
    let identChildren = mailIdentBranch.getChildList("", {});
    for (let child of identChildren)
    {
      if (/^default/.test(child))
        continue;
      // check if this is folder pref
      if (/archive_folder$/.test(child)    ||
          /draft_folder$/.test(child)      ||
          /stationery_folder$/.test(child) ||
          /fcc_folder$/.test(child)         )
      {
        // This is one of the folder prefs that is reset
        let exvalue = "";
        try { exvalue = exIdentBranch.getCharPref(child);} catch (e) {}
        if (exvalue.length)
        {
          // If this folder URI starts with exquilla restore it
          if (/^exquilla/.test(exvalue))
          {
            log.debug("exquilla restoring ident value for " + child + " to " + exvalue);
            mailIdentBranch.setCharPref(child, exvalue);
          }
        }
        exIdentBranch.setCharPref(child, mailIdentBranch.getCharPref(child));
      }
    }

    // track additional changes
    rootBranch.addObserver("mail.identity.", this, false);

    try {
      let windowTitle = Services.strings.createBundle("chrome://exquilla/locale/settings.properties").GetStringFromName(AppConstants.XP_UNIX ? "windowTitle" : "windowTitleWin") + "…";
      document.getElementById("exquilla.openSettingsTab").setAttribute("label", windowTitle);
      document.getElementById("appmenu_exquilla_openSettingsTab").setAttribute("label", windowTitle);
      // email context menu
      let emailContextMenu = document.getElementById("emailAddressPopup");
      emailContextMenu.addEventListener("popupshowing", this.onEmailAddressPopup, false);
    } catch (e) { log.error(e); }

    // We communicate the status text label to the ewsActivity module
    try  {
      let { ewwActivityModule } = ChromeUtils.import("resource://exquilla/ewsActivity.js");
      ewsActivityModule.statusTextElement = document.getElementById("statusText");
    } catch (e) {}

    // listen for account changes
    let session = Cc["@mozilla.org/messenger/services/session;1"]
                     .getService(Ci.nsIMsgMailSession);
    session.AddFolderListener(this, Ci.nsIFolderListener.removed);

    // override server selection to all us to probe for subfolders
    exquilla.oldFolderDisplay_showServer = gFolderDisplay._showServer;
    gFolderDisplay._showServer = function _showServer()
    {
      exquilla.oldFolderDisplay_showServer();
      if (gFolderDisplay._nonViewFolder instanceof Ci.nsIMsgFolder)
      {
        let server = gFolderDisplay._nonViewFolder.server;
        if (server.type == 'exquilla')
          server.performExpand(msgWindow);
      }
    }

    // override gFolderTreeView._sortedAccounts to hide the ExQuilla account when mail is disabled
    exquilla.oldSortedAccounts = gFolderTreeView._sortedAccounts;
    gFolderTreeView._sortedAccounts = function _ewsSortedAccounts()
    {
      return exquilla.oldSortedAccounts().filter(
        function ewsUsesMail(a)
        {
          let ewsServer = safeGetJS(a.incomingServer, "EwsIncomingServer");
          if (ewsServer && !ewsServer.useMail)
            return false;
          return true;
        });
    }
    if (gFolderTreeView._treeElement) {
      gFolderTreeView._rebuild(); // so that we get the override to apply at startup
    }

    // capture isSendUnsentMsgsEnabled() so that it will allow sending from EWS
    let oldIsSendUnsentMsgsEnabled = IsSendUnsentMsgsEnabled;
    IsSendUnsentMsgsEnabled = function _ewsIsSendUnsentMsgsEnabled(unsentMsgsFolder)
    {
      // check for EWS outbox and allow
      do {
        try {
          let folders = gFolderTreeView.getSelectedFolders();
          if (!folders.length)
            break;
          if (!(folders[0].flags & Ci.nsMsgFolderFlags.Queue))
            break;
          if (!(safeGetJS(folders[0], "EwsMsgFolder")))
            break;
          return oldIsSendUnsentMsgsEnabled(folders[0]);
        } catch (e) {log.info(e);}
      } while (false);
      return oldIsSendUnsentMsgsEnabled(unsentMsgsFolder);
    }

    // override SendUnsentMessages() so that it will process the EWS outbox
    let oldSendUnsentMessages = SendUnsentMessages;
    SendUnsentMessages = function ()
    {
      try {
        let folders = gFolderTreeView.getSelectedFolders();
        if (folders.length &&
            safeGetJS(folders[0], "EwsMsgFolder") &&
            folders[0].flags & Ci.nsMsgFolderFlags.Queue)
        {
          log.config("Sending messages from exquilla outbox");
          return ewsSendUnsentMessages(folders[0]);
        }
      } catch (e) {log.info(e);}
      log.debug("Using default sendUnsentMessages");
      return oldSendUnsentMessages();
    }

    function ewsSendUnsentMessages(aFolder)
    {
      log.config("ewsSendUnsentMessages for folder " + aFolder.name);
      // Get the fcc destination for this folder from the identity
      let identity = MailServices.accounts.getFirstIdentityForServer(aFolder.server);
      let fccFolderURI = "";
      let doServerFcc = false;
      let fccNativeFolderId = "";
      let ewsFolder = safeGetJS(aFolder, "EwsMsgFolder");
      if (identity.doFcc)
      {
        fccFolderURI = identity.fccFolder;
        // see if this folder is on the same server
        let itemServerURI = ewsFolder.nativeMailbox.serverURI;
        let fccMsgFolder = MailUtils.getFolderForURI(fccFolderURI);
        if (fccMsgFolder.server.serverURI == itemServerURI)
        {
          doServerFcc = true;
          fccNativeFolderId = ewsFolder.folderId;
          log.debug("Saving sent message on same ews server");
        }
      }

      async function ewsSendUnsentMessages_coroutine()
      {
        let machineListener = new exquilla.Utils.MachineListener(asyncDriver);
        let machineResult = {result: Cr.NS_ERROR_FAILURE};
        let dbEnum = aFolder.msgDatabase.EnumerateMessages();
        let messageArray = [];
        while (dbEnum.hasMoreElements())
          messageArray.push(dbEnum.getNext().QueryInterface(Ci.nsIMsgDBHdr));
        for (let message of messageArray)
        {
          let itemId = message.getProperty("ewsItemId");
          if (!itemId || !itemId.length)
          {
            log.warn("Missing itemId for outgoing message with subject " + message.mime2DecodedSubject);
            continue;
          }
          let itemToSend = ewsFolder.nativeMailbox.getItem(itemId);

          // If we have a foreign server fcc, then we have to create a file copy
          //  of this message before it is sent, as sending will delete it from the server.
          let tempfile = null;
          if (identity.doFcc && !doServerFcc)
          {
             tempfile = Services.dirsvc.get("TmpD", Ci.nsIFile);
             tempfile.append("exquillaMessage.eml");
             tempfile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
             let ewsService = Cc["@mozilla.org/messenger/messageservice;1?type=exquilla"].getService(Ci.nsIMsgMessageService);
             let messageURI = aFolder.generateMessageURI(message.messageKey);
             let outURI = {};
             log.debug("temp file path is " + tempfile.path);
             let urlListener = new PromiseUtils.UrlListener();
             ewsService.SaveMessageToDisk(messageURI, tempfile, false,
                                          urlListener, outURI, false, null);
             let urlResult = await urlListener.promise;
             if (urlResult.result != Cr.NS_OK)
             {
               log.error("failed to create temp message file copy for fcc");
               continue;
             }
          }
          let machineListener = new PromiseUtils.MachineListener();
          ewsFolder.nativeMailbox.sendItem(itemToSend, doServerFcc, fccNativeFolderId, machineListener);
          machineResult = await machineListener.promise;

          if (machineResult.result == Cr.NS_OK)
          {
            let messages = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
            messages.appendElement(message, false);
            ewsFolder.deleteLocalMessages(messages);
            // Do any needed foreign server copy
            if (identity.doFcc && !doServerFcc)
            {
              let dstFolder = MailUtils.getFolderForURI(identity.fccFolder, true);
              let copyServiceListener = new PromiseUtils.CopyListener();
              tempfile = tempfile.clone(); // Otherwise the size seems to be zero
              MailServices.copy.CopyFileMessage(tempfile, dstFolder, null, false, Ci.nsMsgFolderFlags.Read, "", copyServiceListener, null);
              let copyResult = await copyServiceListener.promise;
              if (copyResult.result != Cr.NS_OK)
                log.error("Failed to copy message to fcc folder, status is " + copyResult.result);
              tempfile.remove(false);
            }
          }
        }
      }
      ewsSendUnsentMessages_coroutine();
    }

    // first run display of help tab
    if (rootBranch.getBoolPref('extensions.exquilla.firstRun'))
    {
      rootBranch.setBoolPref('extensions.exquilla.firstRun', false);
      openHelpTab();
    }

    // This (optional) debug code does logging of message selection for display
    /*
    {
      exquilla.ThreadPaneSelectionChanged = ThreadPaneSelectionChanged;
      ThreadPaneSelectionChanged = function _exquillaThreadPaneSelectionChanged()
      { try {
        let view = GetThreadTree().view;
        view instanceof Ci.nsIMsgDBView;
        log.debug('URI of selected message: ' + view.URIForFirstSelectedMessage);
        } catch (e) {}
        exquilla.ThreadPaneSelectionChanged();
      }
    }
    */

    // gloda only indexes local and imap mail folders (though I hope to fix that in
    // bug 781650). We have to override shouldIndexFolder to get around this.
    try { // COMPAT for TB 68
      Object.assign(exquilla, ChromeUtils.import("resource:///modules/gloda/IndexMsg.jsm"));
      Object.assign(exquilla, ChromeUtils.import("resource:///modules/gloda/GlodaDatastore.jsm"));
    } catch (ex) { /* COMPAT for TB 68 */
      Object.assign(exquilla, ChromeUtils.import("resource:///modules/gloda/index_msg.js"));
      Object.assign(exquilla, ChromeUtils.import("resource:///modules/gloda/datastore.js"));
    } /* COMPAT for TB 68 */

    function ewsShouldIndexFolder(aMsgFolder)
    {
      let ewsFolder = safeGetJS(aMsgFolder, "EwsMsgFolder");
      if (!ewsFolder)
        return exquilla.oldShouldIndexFolder(aMsgFolder);

      // override
      let folderFlags = aMsgFolder.flags;
      // Completely ignore non-mail and virtual folders.  They should never even
      //  get to be GlodaFolder instances.
      if (!(folderFlags & Ci.nsMsgFolderFlags.Mail) ||
          (folderFlags & Ci.nsMsgFolderFlags.Virtual))
        return false;

      // Some folders do not really exist; we can detect this by getStringProperty
      //  exploding when we call it.  This is primarily a concern because
      //  _mapFolder calls said exploding method, but we also don't want to
      //  even think about indexing folders that don't exist.  (Such folders are
      //  likely the result of a messed up profile.)
      try {
        // flags is used because it should always be in the cache avoiding a miss
        //  which would compel an msf open.
        aMsgFolder.getStringProperty("flags");
      } catch (ex) {
        return false;
      }

      // Now see what our gloda folder information has to say about the folder.
      let glodaFolder = exquilla.GlodaDatastore._mapFolder(aMsgFolder);
      return glodaFolder.indexingPriority != glodaFolder.kIndexingNeverPriority;
    }

    // dbview ApplyCommandToIndices has an explicit check for IMAP folder type that
    //  is used to perform needed server calls. We have to capture any commands
    //  that might use that so we can do our own server calls.
    exquilla.folderDisplayDoCommand = gFolderDisplay.doCommand;
    gFolderDisplay.doCommand = function _doCommand(aCommandName)
    {
      let folder = gFolderDisplay.displayedFolder;
      if (safeGetJS(folder, "EwsMsgFolder"))
      {
        switch (aCommandName)
        {
          case Ci.nsMsgViewCommandType.markThreadRead:
          {
            log.debug("markThreadRead on an ExQuilla folder");
            // Use MarkMessagesRead, that is what the user thinks he is actually doing,
            //  and this uses a proper folder command.
            return exquilla.folderDisplayDoCommand.call(gFolderDisplay, Ci.nsMsgViewCommandType.markMessagesRead);
          }
          // todo: other commands like junk, unjunk, and undelete
        }
      }
      return exquilla.folderDisplayDoCommand.call(gFolderDisplay, aCommandName);
    }

    exquilla.oldShouldIndexFolder = exquilla.GlodaMsgIndexer.shouldIndexFolder;
    exquilla.GlodaMsgIndexer.shouldIndexFolder = ewsShouldIndexFolder;

    // We want to detect requests to rebuild folder, and force those to reindex.
    MailServices.mfn.addListener(this, Ci.nsIMsgFolderNotificationService.itemEvent);

    if (SessionStoreManager._restored) {
      exquilla.EwsAbService.loadEwsServers();
    } else {
      Services.obs.addObserver(this, "mail-tabs-session-restored", false);
    }
  }

  function openSettingsTab()
  {
    exquilla.Utils.openContentTab("chrome://exquilla/content/settings/settings.html");
  }

  function openHelpTab()
  {
    let handlerRegExp = "^https://www\.(exquilla|beonex)\.com(/.*|$)";
    exquilla.Utils.openContentTab("https://www.exquilla.com/firstrun", handlerRegExp, 1000);
  }

  function openLog()
  {
    // open a shared rotating log file appender
    let file = Services.dirsvc.get("ProfD", Ci.nsIFile);
    file.append("exquillalog.txt");
    if (file instanceof Ci.nsIFile)
      file.launch();
  }

  function onUnload()
  {
    // email context menu
    let emailContextMenu = document.getElementById("emailAddressPopup");
    emailContextMenu.removeEventListener("popupshowing", this.onEmailAddressPopup, false);
    let rootBranch = Cc["@mozilla.org/preferences-service;1"]
                          .getService(Ci.nsIPrefBranch);
    rootBranch.removeObserver("mail.identity.", this);
    rootBranch.removeObserver("mail.account.", this);
    let session = Cc["@mozilla.org/messenger/services/session;1"]
                     .getService(Ci.nsIMsgMailSession);
    session.RemoveFolderListener(this);
    MailServices.accounts.removeIncomingServerListener(serverListener);
    MailServices.mfn.removeListener(this);
  }

  function observe(aSubject, aTopic, aData)
  {
    if (aTopic == "nsPref:changed")
    {
      // Our goal is to keep a copy of any ews accounts in our extension preferences,
      // to allow us to reload any accounts that disappear when the user disables
      // this extension.
      let rootBranch = Cc["@mozilla.org/preferences-service;1"]
                         .getService(Ci.nsIPrefBranch);
      let exBranch = Cc["@mozilla.org/preferences-service;1"]
                         .getService(Ci.nsIPrefService)
                         .getBranch("extensions.exquilla.");
      try {
      log.debug("Saving preference change: " + aData + " new value: " + rootBranch.getCharPref(aData));
      } catch (e) {}
      // save changes
      copyPref(rootBranch, exBranch, aData);
    }
    else if (aTopic == "mail-tabs-session-restored")
    {
      log.debug('observed mail-tabs-session-restored');
      exquilla.EwsAbService.loadEwsServers();
    }
  }

  // Force a reindex when folder rebuild is selected.
  function itemEvent(aFolder, aEvent, aData)
  {
    let ewsFolder = safeGetJS(aFolder);
    if ( (aEvent != "FolderReindexTriggered") || !ewsFolder)
      return;
    let nativeMailbox = ewsFolder.nativeMailbox;
    let nativeFolder = nativeMailbox.getNativeFolderFromCache(ewsFolder.folderId);
    if (nativeFolder)
    {
      nativeMailbox.datastore.setSyncState(nativeFolder, "", null);
      log.warn("Reindexing folder " + nativeFolder.displayName);
    }
  }

  function onEmailAddressPopup(event)
  {
    let emailAddress = findEmailNodeFromPopupNode(document.popupNode, 'emailAddressPopup')
                         .getAttribute("emailAddress");
    let emailContextMenu = document.getElementById("emailAddressPopup");

    // add a context menu for each ews root contact folder
    let directories = MailServices.ab.directories;
    while (directories.hasMoreElements())
    {
      let directory = directories.getNext();
      if (directory instanceof Ci.msgIOverride)
      {
        let jsDirectory;
        try {
          jsDirectory = safeGetJS(directory);
        } catch (e) {}
        if (jsDirectory)
        {
          // only add root contacts folder for now
          if ( (jsDirectory.distinguishedFolderId == 'contacts'))
          {
            directory instanceof Ci.nsIAbDirectory;
            let id = 'exquilla.addToAb.' + directory.URI;
            let abItem = document.getElementById(id);
              // only show an add if the address does not exist
            directory instanceof Ci.nsIAbCollection;
            let existingCard = directory.cardForEmailAddress(emailAddress);

            if (!abItem && !existingCard)
            {
              abItem = document.createXULElement('menuitem');
              abItem.setAttribute('id', id);
              let addToAddressBook = exquillaStrings.GetStringFromName('addToAddressBook');
              abItem.setAttribute('label', addToAddressBook + ' ' + directory.dirName);
              abItem.addEventListener("command", function (e) {
                exquilla.addContact(findEmailNodeFromPopupNode(document.popupNode, 'emailAddressPopup'), directory.URI)
              });
              emailContextMenu.appendChild(abItem);
            }
            else if (abItem && existingCard)
              abItem.parentNode.removeChild(abItem);
          }
        }
      }
    }
  }

  function addContact(emailNode, URI)
  {
    let emailAddress = emailNode.getAttribute("emailAddress");
    let directory = Cc["@mozilla.org/abmanager;1"].getService(Ci.nsIAbManager)
                                                  .getDirectory(URI);
    directory instanceof Ci.nsIAbCollection;
    if (directory.cardForEmailAddress(emailAddress))
    {
      Cu.reportError("Address book already has the email address " + emailAddress);
      return;
    }
    let newCard = Cc['@mozilla.org/addressbook/cardproperty;1']
                    .createInstance(Ci.nsIAbCard);
    newCard.primaryEmail = emailAddress;
    let displayName = emailNode.getAttribute('displayName');
    let firstName = displayName;
    let lastName = '';

    // get first and last name from the display name
    let commaIndex = displayName.indexOf(',');
    if (commaIndex != -1) // Looks like last, first
    {
      lastName = displayName.substring(0, commaIndex);
      firstName = displayName(commaIndex + 1);
      // strip leading spaces
      while (firstName.charAt(0) == ' ')
        firstName = firstName.substring(1);
    }
    else // maybe first last?
    {
      let spaceIndex = displayName.indexOf(' ');
      if (spaceIndex != -1)
      {
        firstName = displayName.substring(0, spaceIndex);
        lastName = displayName.substring(spaceIndex + 1);
        // strip leading spaces
        while (lastName.charAt(0) == ' ')
          lastName = lastName.substring(1);
      }
    }

    newCard.firstName = firstName;
    newCard.lastName = lastName;
    newCard.displayName = displayName;

    // add the card to the directory
    directory.addCard(newCard);
  }

  function OnItemRemoved(aParentItem, folder)
  {
    // When an account is removed, also remove any corresponding calendars

    // should be a root ews folder
    if (!(folder instanceof Ci.nsIMsgFolder) ||
        !(folder.isServer) ||
        !(folder.server.type == 'exquilla'))
      return;

    let serverURI = folder.server.serverURI;
    //dl('need to remove calendars with server URI ' + serverURI);
    let calendarManager;
    try {
      calendarManager = Cc["@mozilla.org/calendar/manager;1"]
                          .getService(Ci.calICalendarManager);
    } catch (e) {}
    if (!calendarManager)
      return;

    let calendars = calendarManager.getCalendars({});
    // we'll remove the calendar if it has a matching URI
    // TODO: support subcalendar folders
    for (let calendar of calendars)
    {
      //dl('calendar spec is ' + calendar.uri.spec);
      if (calendar.uri.spec.indexOf(serverURI) != -1)
      {
        //dl('removing calendar');
        calendarManager.unregisterCalendar(calendar);
      }
    }
  }

  // site click handler: I need a custom version of this to enable js on the help tab
  // modelled after Web Application Tabs addon
  function siteClickHandler(aEvent, aSiteRegExp) { try {
    let hRef = hRefForClickEvent(aEvent, true);
    if (hRef)
    {
      let uri = makeURI(hRef);
      if (uri.schemeIs("javascript")) {

        // 2019-04-23 Ben
        // This loads JS from the website.
        // Too dangerous. Disable this.
        return;
        //document.getElementById('tabmail')
        //        .currentTabInfo
        //        .browser
        //        .loadURI(uri.spec);
      }
    }
    specialTabs.siteClickHandler(aEvent, aSiteRegExp);
  } catch(e) {re(e);}}

  // local functions

  function getLocalMailServer()
  {
    let localMailServer = null;
    try {
      localMailServer = MailServices.accounts.localFoldersServer;
    }
    catch (ex) {}

    if (!localMailServer)
    {
      try {
        MailServices.accounts.createLocalMailAccount();
        localMailServer = MailServices.accounts.localFoldersServer;
      }
      catch (ex) {}
    }
    return localMailServer;
  }

  // Copies a preference from one branch to another
  function copyPref(srcBranch, destBranch, aData)
  {
    // save account changes that we see
    let type = srcBranch.getPrefType(aData);
    let value;
    switch (type)
    {
      case Ci.nsIPrefBranch.PREF_INVALID:
        destBranch.clearUserPref(aData);
        break;
      case  Ci.nsIPrefBranch.PREF_STRING:
        value = srcBranch.getCharPref(aData);
        destBranch.setCharPref(aData, value);
        break;
      case Ci.nsIPrefBranch.PREF_INT:
        value = srcBranch.getIntPref(aData);
        destBranch.setIntPref(aData, value);
        break;
      case Ci.nsIPrefBranch.PREF_BOOL:
        value = srcBranch.getBoolPref(aData);
        destBranch.setBoolPref(aData, value);
        break;
    }
  }

  // publically accessible items
  pub.onLoad = onLoad;
  pub.onUnload = onUnload;
  pub.observe = observe;
  pub.onEmailAddressPopup = onEmailAddressPopup;
  pub.addContact = addContact;
  pub.OnItemRemoved = OnItemRemoved;
  pub.siteClickHandler = siteClickHandler;
  pub.openSettingsTab = openSettingsTab;
  pub.openHelpTab = openHelpTab;
  pub.msgOpenAccountWizard = msgOpenAccountWizard;
  pub.openLog = openLog;
  pub.itemEvent = itemEvent;

  return pub;

})());

window.addEventListener("load", function(e) { exquilla.onLoad(e); }, false);
window.addEventListener("unload", function(e) { exquilla.onUnload(e); }, false);
