/// Delays the restart prompt.
/// {nsITimer}
var gRestartPromptTimer = null;

/**
 * Prompts to restart Thunderbird as a result of a root folder lock.
 *
 * @param aServer {nsIMsgIncomingServer} The server with the locked folder.
 */
async function PromptRestart(aServer) {
  let title = await CallExtension(aServer, "GetString", { bundleName: "owl", id: "promptRestartTitle" });
  let message = await CallExtension(aServer, "GetString", { bundleName: "owl", id: "promptRestartMessage" });
  let ok = await CallExtension(aServer, "GetString", { bundleName: "owl", id: "promptRestartNow" });
  let cancel = await CallExtension(aServer, "GetString", { bundleName: "owl", id: "promptRestartLater" });
  let flags = Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING +
              Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_IS_STRING +
              Services.prompt.BUTTON_POS_0_DEFAULT;
  // Delay a second to give Thunderbird time to finish starting up.
  // This also protects us against multiple prompts.
  if (!gRestartPromptTimer) {
    gRestartPromptTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    await new Promise(resolve => gRestartPromptTimer.initWithCallback(resolve, 1000, Ci.nsITimer.TYPE_ONE_SHOT));
    if (Services.prompt.confirmEx(null, title, message, flags, ok, cancel, null, null, {}) == 0) {
      Services.startup.quit(Services.startup.eForceQuit | Services.startup.eRestart);
    }
  }
}

/// Object used by the jsaccount mechanism to create the component factory.
var gServerProperties = {
  baseContractID: "@mozilla.org/jacppincomingserverdelegator;1",
  baseInterfaces: [
    Ci.nsISupportsWeakReference,
    Ci.nsIMsgIncomingServer,
    Ci.nsIInterfaceRequestor,
    Ci.msgIOverride,
  ],
  contractID: "@mozilla.org/messenger/server;1?type=",
  classDescription: "Incoming Server",
  classID: Components.ID("{f1d6d90f-d13b-4866-ada3-c180845d2427}"),
};

function Server(aDelegator, aBaseInterfaces, aDiscoveredSubFolders = false) {
  /**
   * The master C++ object. Used when we would normally pass "this".
   */
  this.delegator = Cu.getWeakReference(aDelegator);
  /**
   * The helper C++ object that allows us to call the actual C++ methods.
   */
  this.cppBase = aDelegator.cppBase;
  for (let i of aBaseInterfaces) {
    this.cppBase instanceof i;
  }
  /**
   * Flag to determins whether to scan the local directory for .msf files.
   * This allows us to show the folder tree as it was when we last connected.
   */
  this._discoveredSubFolders = aDiscoveredSubFolders;
  // XXX TODO
}

Server.prototype = {
  _JsPrototypeToDelegate: true,
  /// nsISupports
  QueryInterface: QIUtils.generateQI(gServerProperties.baseInterfaces),
  /// nsMsgIncomingServer overrides
  get localStoreType() {
    return this.cppBase.type;
  },
  get localDatabaseType() {
    return "imap";
  },
  get rootFolder() {
    try {
      let rootFolder = this.cppBase.rootFolder;
      if (!this._discoveredSubFolders && this.cppBase.getCharValue("storeContractID") && rootFolder.filePath.path) {
        this._discoveredSubFolders = true;
        // If the TB account manager loads before us and goes through the accounts,
        // it finds that there are no components for this account type, and
        // deletes our accounts. This pref delays that.
        // Code could be moved to account setup.
        this.cppBase.setIntValue("secondsToLeaveUnavailable", 365 * 24 * 60 * 60);
        this.cppBase.msgStore.discoverSubFolders(rootFolder, true);
      }
      return rootFolder;
    } catch (ex) {
      if (ex.result == Cr.NS_NOINTERFACE) {
        // If the root folder does not have the requested interface,
        // this means that Thunderbird attempted to access it before we were
        // able to register our components. Unfortunately the bogus folder is
        // stuck in the RDF cache which can only be cleared by a restart.
        PromptRestart(this.cppBase);
      }
      throw ex;
    }
  },
  /**
   * Checks whether the stored password is correct.
   * @param aUrlListener {nsIUrlListener} A callback object
   * @param aMsgWindow   {nsIMsgWindow}   Unused
   * @returns            {nsIURI}         An nsIMsgMailNewsUrl object
   */
  verifyLogon: function(aUrlListener, aMsgWindow) {
    // Just create a dummy URI, all the caller wants to do is to clear its
    // msgWindow property anyway.
    let uri = Services.io.newURI(this.cppBase.serverURI);
    // We need to return the uri synchronously but actually do the work async...
    (async () => {
      try {
        aUrlListener.OnStartRunningUrl(uri);
        let error = await CallExtension(this.cppBase, "VerifyLogin", null, null);
        try {
          uri.errorCode = error.code || "login-error-unknown";
          uri.errorMessage = error.message || error.toString();
        } catch (ex) {
          // COMPAT TB 60 Property does not exist in TB 60
        }
        try {
          aUrlListener.OnStopRunningUrl(uri, error.message ? Cr.NS_ERROR_FAILURE : Cr.NS_OK);
        } catch (ex) { // don't report OnStopRunningUrl error to itself
          ReportException(ex, aMsgWindow);
        }
      } catch (ex) {
        ReportException(ex, aMsgWindow);
        aUrlListener.OnStopRunningUrl(uri, ex.result || Cr.NS_ERROR_FAILURE);
      }
    })();
    return uri;
  },
  performBiff: function(aMsgWindow) {
    this.cppBase.performingBiff = true;
    this.cppBase.rootFolder.getNewMessages(aMsgWindow, null);
    this.cppBase.performingBiff = false;
  },
  get isSecure() {
    return true;
  },
  clearAllValues: function() {
    noAwait(CallExtension(this.cppBase, "ClearAllValues", null, null), logError);
    this.cppBase.clearAllValues();
  },
  get canBeDefaultServer() {
    return true;
  },
  get canSearchMessages() {
    return true; // white lie to fool junk folder picker
  },
  get supportsDiskSpace() {
    return false; // until we support offline
  },
  // XXX TODO
};

gServerProperties.factory = JSAccountUtils.jaFactory(gServerProperties, Server);
gModules.push(gServerProperties);
