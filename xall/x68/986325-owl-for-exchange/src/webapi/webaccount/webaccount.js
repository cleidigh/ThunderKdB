var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
try {
var {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");
} catch (ex) {
var {MailServices} = ChromeUtils.import("resource:///modules/mailServices.js"); // COMPAT for TB 60
}
var {jsmime} = ChromeUtils.import("resource:///modules/jsmime.jsm");
var {JSAccountUtils} = ChromeUtils.import("resource:///modules/jsaccount/JSAccountUtils.jsm");

Cu.importGlobalProperties(["btoa", "File", "FileReader"]);

const NS_MSG_FOLDER_EXISTS = 0x80550013; // NS_MSG_* codes don't appear in Cr
const kScriptFiles = [
  "folder.js",
  "messageservice.js",
  "protocolhandler.js",
  "protocolinfo.js",
  "server.js",
  "send.js",
  "uiOverlay.js",
  "errorLog.js",
];

/// A map of webextensions to the listeners registered with the dispatcher.
var gDispatchListeners = new Map();
/// A map of webextensions to additional options that affect their behaviour.
var gSchemeOptions = new Map();
/// An array of modules that need to be registered with the component manager.
var gModules = [];
var {ExtensionError} = ExtensionUtils;
var QIUtils = ChromeUtils.generateQI ? ChromeUtils : XPCOMUtils; // COMPAT for TB 60
var gComponentRegistrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
var RDF = Cc["@mozilla.org/rdf/rdf-service;1"].getService(Ci.nsIRDFService);
var gContentSecManager = Cc["@mozilla.org/contentsecuritymanager;1"].getService(Ci.nsIContentSecurityManager);

/**
 * COMPAT for TB 60
 * In Thunderbird trunk, an nsISimpleEnumerator is already an Iterator.
 * @param aXPCOMEnumerator {nsISimpleEnumerator}
 * @param aInterface       {nsIIDRef}
 * @returns                {Iterator}
 */
function iterateEnumerator(aXPCOMEnumerator, aInterface)
{
  return XPCOMUtils.IterSimpleEnumerator ? XPCOMUtils.IterSimpleEnumerator(aXPCOMEnumerator, aInterface) : aXPCOMEnumerator;
}

/**
 * Reports an exception.
 *
 * @param ex {Error}        The exception to report
 * @param aMsgWindow {nsIMsgWindow} The window to report the message to
 */
function ReportException(ex, aMsgWindow) {
  logError(ex);
  if (aMsgWindow && aMsgWindow.statusFeedback) {
    aMsgWindow.statusFeedback.showStatusString(ex.message);
  }
}

/**
 * Sanitises an exception so that it can be thrown back to the extension.
 *
 * @param ex {Error}          The exception to sanitise
 * @returns  {ExtensionError} The sanitised exception
 */
function SanitiseException(ex) {
  if (ex instanceof ExtensionError) {
    return ex;
  } else {
    return new ExtensionError(ex.message);
  }
}

/**
 * Runs a function after a small delay.
 *
 * @param aFunction      {Function} The function to call
 * @param aErrorCallback {Function} The function to log errors to
 * @param aDelay         {Integer}  The delay in milliseconds
 *
 * To insert a delay into an async function, use
 * await new Promise((resolve, reject) => runLater(resolve, reject, delay));
 */
function runLater(aFunction, aErrorCallback, aDelay)
{
  let timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback(function() {
    try {
      aFunction();
    } catch (ex) {
      aErrorCallback(ex);
    }
  }, aDelay, Ci.nsITimer.TYPE_ONE_SHOT);
}

/**
 * Dispatches a function to the C++ event loop to execute soon.
 *
 * @param aFunction      {Function} The function to call
 * @param aErrorCallback {Function} The function to log errors to
 *
 * To drain the event loop from an async function, use
 * await new Promise(runAsync);
 */
function runAsync(aFunction, aErrorCallback)
{
  Services.tm.mainThread.dispatch(function() {
    try {
      aFunction();
    } catch (ex) {
      aErrorCallback(ex);
    }
  }, Ci.nsIThread.DISPATCH_NORMAL);
}

/**
 * Used to explicitly run an async function in the background.
 *
 * @param aPromise {Promise} The promise that the caller doesn't want to await
 * @param aErrorCallback {Function} A function to call if the promise rejects
 * @param aMsgWindow {nsIMsgWindow} The second parameter to the error callback
 */
async function noAwait(aPromise, aErrorCallback)
{
  try {
    await aPromise;
  } catch (ex) {
    aErrorCallback(ex);
  }
}

function readFileAsync(aFile) {
  return new Promise(async (resolve, reject) => {
    try {
      let file = await File.createFromNsIFile(aFile);
      let reader = new FileReader();
      reader.onloadend = function() {
        if (reader.error) {
          reject(reader.error);
        } else {
          resolve(reader.result);
        }
      };
      reader.readAsBinaryString(file);
    } catch (ex) {
      reject(ex);
    }
  });
}

function getIncomingServer(key)
{
  try {
    return MailServices.accounts.getIncomingServer(key);
  } catch (ex) {
    logError(ex);
    throw new ExtensionError("Invalid server key");
  }
}

var gMsgWindowList = [null];

var CallExtension = // COMPAT for TB 60
async function CallExtension(aServer, aOperation, aData, aMsgWindow)
{
  let msgWindowHandle = 0;
  if (aMsgWindow) {
    let weak = aMsgWindow.QueryInterface(Ci.nsISupportsWeakReference).GetWeakReference();
    msgWindowHandle = gMsgWindowList.indexOf(weak);
    if (msgWindowHandle < 0) {
      msgWindowHandle = gMsgWindowList.length;
      gMsgWindowList.push(weak);
    }
  }
  let error = new Error(); // must capture stack before async call
  try {
    // Calls the function passed to browser.webAccount.dispatcher.addListener() in owa.js/ews.js
    return await gDispatchListeners.get(aServer.type).async(aServer.key, aOperation, aData, msgWindowHandle);
  } catch (ex) {
    if (ex instanceof Error || ex instanceof Ci.nsIException) {
      // This is a real exception.
      throw ex;
    }
    // Turn the serialised exception back into an error object.
    try {
      if (ex.message[0] == "{") {
        let exJSON = JSON.parse(ex.message);
        Object.assign(ex, exJSON);
      }
    } catch (exWhileParsingError) {
      console.error(exWhileParsingError);
    }
    // Add our stack to the extension stack
    ex.stack += error.stack;
    Object.assign(error, ex);
    throw error;
  }
}
; // COMPAT for TB 60

function folderExists(aFolderURI)
{
  return RDF.GetResource(aFolderURI).QueryInterface(Ci.nsIMsgFolder).parent != null;
}

/**
 * Given a special folder, update any invalid prefs.
 * @param aServer {nsIMsgIncomingServer} The account's incoming server
 * @param aType   {String}               A supported folder type
 * @param aURI    {String}               The URI of the special folder
 */
function CheckSpecialFolder(aServer, aType, aURI)
{
  let identity = MailServices.accounts.getFirstIdentityForServer(aServer);
  switch (aType) {
  case "SentMail":
    if (!folderExists(identity.fccFolder)) {
      identity.fccFolder = aURI;
      identity.fccFolderPickerMode = "1";
    }
    break;
  case "Drafts":
    if (!folderExists(identity.draftFolder)) {
      identity.draftFolder = aURI;
      identity.draftsFolderPickerMode = "1";
    }
    break;
  case "Archives":
    if (!folderExists(identity.archivesFolder)) {
      identity.archivesFolder = aURI;
      identity.archivesFolderPickerMode = "1";
    }
    break;
  case "Templates":
    if (!folderExists(identity.templatesFolder)) {
      identity.templatesFolder = aURI;
      identity.tmplFolderPickerMode = "1";
    }
    break;
  case "Junk":
    let spamSettings = aServer.spamSettings;
    if (!folderExists(spamSettings.spamFolderURI)) {
      spamSettings.spamFolderURI = aURI;
      spamSettings.moveTargetMode = Ci.nsISpamSettings.MOVE_TARGET_MODE_FOLDER;
      aServer.setCharValue("spamActionTargetFolder", aURI);
      aServer.setIntValue("moveTargetMode", Ci.nsISpamSettings.MOVE_TARGET_MODE_FOLDER);
      try {
        // Work around bug whereby fixing the spam settings causes an exception
        // to be thrown when the account manager tries to reinitialise them.
        spamSettings.initialize(aServer);
      } catch (ex) {
      }
    }
    break;
  case "Trash":
    if (!folderExists(aServer.serverURI + "/" + aServer.getCharValue("trash_folder_name"))) {
      aServer.setCharValue("trash_folder_name", Services.io.newURI(aURI).pathQueryRef.slice(1));
    }
    break;
  }
}

function UpdateFolderTree(aServer, aFolderTree)
{
  // Get the current list of folders so we can delete non-existent ones.
  let folders = [];
  let folderArray = aServer.rootFolder.descendants;
  for (let i = 0; i < folderArray.length; i++) {
    let folder = folderArray.queryElementAt(i, Ci.nsIMsgFolder);
    if (!(folder.flags & Ci.nsMsgFolderFlags.Virtual)) {
      folders.push(folder);
    }
  }
  let processFolderTree = (parentFolder, children) => {
    for (let child of children) {
      // Get or create the local child folder.
      let msgFolder;
      if (parentFolder.containsChildNamed(child.name)) {
        msgFolder = parentFolder.getChildNamed(child.name);
        folders.splice(folders.indexOf(msgFolder), 1);
      } else {
        try {
          msgFolder = CreateSubfolder(aServer, parentFolder, child.name); // folder.js
        } catch (ex) {
          if (ex.result == NS_MSG_FOLDER_EXISTS && !folderArray.length) {
            // We don't appear to have any existing folders at all,
            // not even the Inbox. We want to try very hard to create
            // these initial folders, but something's stopping us.
            // Let's just start afresh.
            aServer.rootFolder.filePath.remove(true);
            msgFolder = CreateSubfolder(aServer, parentFolder, child.name);
            ex.type = "localstore-recreated";
            try {
              if (!ex.parameters) {
                ex.parameters = GetFolderInfo(parentFolder, true);
                ex.parameters.subFolderName = child.name;
              }
              ex.parameters.folderTree = aFolderTree;
            } catch (ex) {
              console.error(ex);
            }
            logError(ex);
          } else {
            // Either an error we don't recognise, or we have some
            // folders already, so just keep going for now, rather
            // than breaking the user experience.
            ex.type = "localstore-broken";
            try {
              if (!ex.parameters) {
                ex.parameters = GetFolderInfo(parentFolder, true);
                ex.parameters.subFolderName = child.name;
              }
              ex.parameters.folderTree = aFolderTree;
            } catch (ex) {
              console.error(ex);
            }
            logError(ex);
            continue;
          }
        }
      }
      // The FolderId is an extension-provided string that we pass back
      // to the extension whenever we want to refer to a specific folder.
      // Save it as a string property so that we can easily retrieve it.
      msgFolder.setStringProperty("FolderId", child.id);
      msgFolder.setStringProperty("FolderType", child.type);
      // Update the counts on the folder.
      msgFolder.changeNumPendingTotalMessages(child.total - msgFolder.getTotalMessages(false));
      msgFolder.changeNumPendingUnread(child.unread - msgFolder.getNumUnread(false));
      // Update the flags on the folder.
      if (child.type in Ci.nsMsgFolderFlags) {
        msgFolder.setFlag(Ci.nsMsgFolderFlags[child.type]);
        CheckSpecialFolder(aServer, child.type, msgFolder.URI);
      }
      // Recursively update child folders.
      processFolderTree(msgFolder, child.children);
    }
  }
  processFolderTree(aServer.rootFolder, aFolderTree);
  // Delete any remaining folders.
  for (let folder of folders) {
    if (folder.parent) { // parent may have already been deleted
      folder.parent.propagateDelete(folder, true, null);
    }
  }
}

/**
 * Update a server and its folders after a reinstallation.
 *
 * @param aServer {nsIMsgIncomingServer} The server to update
 *
 * After a reinstallation, existing jsAccount servers and their folders
 * will have delegates from the previous installation's copy of this
 * web experiment. We need to transplant new delegates in their place.
 */
function HeartTransplant(aServer)
{
  if (aServer instanceof Ci.msgIOverride) {
    // Tell this server that its folders have already been discovered.
    aServer.jsDelegate = new Server(aServer, gServerProperties.baseInterfaces, true);
    let folder = aServer.rootFolder;
    if (folder instanceof Ci.msgIOverride) {
      folder.jsDelegate = new Folder(folder, gFolderProperties.baseInterfaces);
      let descendants = folder.descendants;
      for (let i = 0; i < descendants.length; i++) {
        let folder = descendants.queryElementAt(i, Ci.nsIMsgFolder);
        if (folder instanceof Ci.msgIOverride) {
          folder.jsDelegate = new Folder(folder, gFolderProperties.baseInterfaces);
        }
      }
    }
  }
}

/**
 * Given a module, register its factory, replacing any existing factory.
 *
 * @param aModule     {Object} The jsAccount or other module.
 *   classID          {String}     The ID of the class
 *   contractID       {String}     The contract ID to be registered
 *   classDescription {String}     The description of the class
 *   factory          {nsIFactory} The factory to be registered
 * @param aContract   {Boolean}    whether to register the contract ID
 *
 * Modules whose contractIDs end in '=' typically won't reigster their
 * contract ID here, instead they are registered when their scheme is known.
 */
function RegisterFactory(aModule, aUseContract)
{
  // First try to unregister the factory in case this is a reinstallation.
  try {
    let oldFactory = gComponentRegistrar.getClassObject(aModule.classID, Ci.nsIFactory);
    gComponentRegistrar.unregisterFactory(aModule.classID, oldFactory);
  } catch (ex) {
    if (ex.result != Cr.NS_ERROR_FACTORY_NOT_REGISTERED) {
      throw ex;
    }
  }
  let contractID = aUseContract ? aModule.contractID : null;
  gComponentRegistrar.registerFactory(aModule.classID, aModule.classDescription, contractID, aModule.factory);
}

function loadScripts() {
  let extBaseURL = extensions.modules.get("webAccount").url;
  extBaseURL = extBaseURL.slice(0, extBaseURL.lastIndexOf("/") + 1);

  for (let file of kScriptFiles) {
    Services.scriptloader.loadSubScript(extBaseURL + file);
  }

  for (let module of gModules) {
    RegisterFactory(module, false);
  }
}
loadScripts();

this.webAccount = class extends ExtensionAPI {
  getAPI(context) {
    return {
      incomingServer: {
        /**
         * Gets the overall primary identity in Thunderbird.
         * I.e. gets the primary identity of the primary account,
         * or the first identity, or the OS user info.
         */
        getGlobalPrimaryIdentity: function() {
          try {
            let { email, fullName } = MailServices.accounts.defaultAccount.defaultIdentity;
            if (email) {
              return { email, fullName };
            }
          } catch (ex) {
            logExpectedError(ex);
          }
          try {
            let identities = MailServices.accounts.allIdentities;
            for (let i = 0; i < identities.length; i++) {
              let { email, fullName } = identities.queryElementAt(i, Ci.nsIMsgIdentity);
              if (email) {
                return { email, fullName };
              }
            }
          } catch (ex) {
            logExpectedError(ex);
          }
          let email = "", fullName = "";
          if ("@mozilla.org/userinfo;1" in Cc) {
            let userInfo = Cc["@mozilla.org/userinfo;1"].getService(Ci.nsIUserInfo);
            try {
              email = userInfo.emailAddress;
            } catch (ex) {
              logExpectedError(ex);
            }
            try {
              fullName = userInfo.fullname;
            } catch (ex) {
              logExpectedError(ex);
            }
          }
          return { email, fullName };
        },
        /**
         * Gets the primary/default identity for this account/server
         */
        getIdentity: function(key) {
          let server = getIncomingServer(key);
          try {
            let account = MailServices.accounts.FindAccountForServer(server);
            let { email, fullName } = account.defaultIdentity;
            if (email) {
              return { email, fullName };
            }
          } catch (ex) {
            logError(ex);
          }
          try {
            let identities = MailServices.accounts.getIdentitiesForServer(server);
            for (let i = 0; i < identities.length; i++) {
              let { email, fullName } = identities.queryElementAt(i, Ci.nsIMsgIdentity);
              if (email) {
                return { email, fullName };
              }
            }
          } catch (ex) {
            logError(ex);
          }
          let email = "", fullName = "";
          if ("@mozilla.org/userinfo;1" in Cc) {
            let userInfo = Cc["@mozilla.org/userinfo;1"].getService(Ci.nsIUserInfo);
            try {
              email = userInfo.emailAddress;
            } catch (ex) {
              logError(ex);
            }
            try {
              fullName = userInfo.fullname;
            } catch (ex) {
              logError(ex);
            }
          }
          return { email, fullName };
        },
        /**
         * Gets all identities for this account/server
         */
        getIdentities: function(key) {
          let server = getIncomingServer(key);
          try {
            let identities = MailServices.accounts.getIdentitiesForServer(server);
            let result = [];
            for (let i = 0; i < identities.length; i++) {
              let { email, fullName } = identities.queryElementAt(i, Ci.nsIMsgIdentity);
              result.push({ email, fullName });
            }
            return result;
          } catch (ex) {
            logError(ex);
            throw SanitiseException(ex);
          }
        },
        getHostName: function(key) {
          return getIncomingServer(key).realHostName;
        },
        getUsername: function(key) {
          return getIncomingServer(key).realUsername;
        },
        getPassword: function(key, msgWindowHandle) {
          let server = getIncomingServer(key);
          if (server.password) {
            return server.password;
          }
          let msgWindow = null;
          try {
            msgWindow = gMsgWindowList[msgWindowHandle].QueryReferent(Ci.nsIMsgWindow);
          } catch (e) {
          }
          try {
            let bundle = Services.strings.createBundle("chrome://messenger/locale/imapMsgs.properties");
            let passwordPrompt = bundle.formatStringFromName("imapEnterServerPasswordPrompt", [server.realUsername, server.realHostName], 2);
            let passwordTitle = bundle.GetStringFromName("imapEnterPasswordPromptTitle");
            // getPasswordWithUI() checks the password manager and fulfills the request from there,
            // without prompting, if possible. For that, it doesn't even need a msgWindow.
            if (!server.getPasswordWithUI(passwordPrompt, passwordTitle, msgWindow)) {
              throw new ExtensionError("Password prompt cancelled");
            }
            return server.password;
          } catch (ex) {
            logError(ex);
            throw SanitiseException(ex);
          }
        },
        promptLoginFailed: function(key, msgWindowHandle, passwordErrorMessage) {
          let server = getIncomingServer(key);
          try {
            let dialog = null;
            try {
              let msgWindow = gMsgWindowList[msgWindowHandle].QueryReferent(Ci.nsIMsgWindow);
              dialog = msgWindow.promptDialog;
            } catch (e) {
              return false;
            }
            let bundle = Services.strings.createBundle("chrome://messenger/locale/messenger.properties");
            let message = bundle.formatStringFromName("mailServerLoginFailed2", [server.realHostName, server.realUsername], 2);
            let title = bundle.formatStringFromName("mailServerLoginFailedTitleWithAccount", [server.prettyName], 1);
            let retry = bundle.GetStringFromName("mailServerLoginFailedRetryButton");
            let enter = bundle.GetStringFromName("mailServerLoginFailedEnterNewPasswordButton");
            if (passwordErrorMessage) {
              message = passwordErrorMessage + "\n" + message;
            }
            let result = dialog.confirmEx(title, message, Ci.nsIPrompt.BUTTON_TITLE_IS_STRING * Ci.nsIPrompt.BUTTON_POS_0 + Ci.nsIPrompt.BUTTON_TITLE_CANCEL * Ci.nsIPrompt.BUTTON_POS_1 + Ci.nsIPrompt.BUTTON_TITLE_IS_STRING * Ci.nsIPrompt.BUTTON_POS_2, retry, null, enter, null, {});
            if (result == 2) {
              server.forgetPassword();
            }
            return result != 1;
          } catch (ex) {
            logError(ex);
            throw SanitiseException(ex);
          }
        },
        getBooleanValue: function(key, property) {
          return getIncomingServer(key).getBoolValue(property);
        },
        getNumberValue: function(key, property) {
          return getIncomingServer(key).getIntValue(property);
        },
        getStringValue: function(key, property) {
          return getIncomingServer(key).getUnicharValue(property);
        },
        setBooleanValue: function(key, property, value) {
          getIncomingServer(key).setBoolValue(property, value);
        },
        setNumberValue: function(key, property, value) {
          getIncomingServer(key).setIntValue(property, value);
        },
        setStringValue: function(key, property, value) {
          getIncomingServer(key).setUnicharValue(property, value);
        },
        sendFolderTree: function(key, folderTree) {
          try {
            UpdateFolderTree(getIncomingServer(key), folderTree);
          } catch (ex) {
            logError(ex);
            throw SanitiseException(ex);
          }
        },
        getServersOfTypes: function(types) {
          try {
            let keys = [];
            let allServers = MailServices.accounts.allServers;
            for (let i = 0; i < allServers.length; i++) {
              let server = allServers.queryElementAt(i, Ci.nsIMsgIncomingServer);
              if (types.includes(server.type)) {
                keys.push(server.key);
              }
            }
            return keys;
          } catch (ex) {
            logError(ex);
            throw SanitiseException(ex);
          }
        },
      },
      webAccount: {
        wizard: function() {
          let mail3pane = Services.wm.getMostRecentWindow("mail:3pane");
          mail3pane.NewMailAccount(mail3pane.msgWindow);
        },
        verifyLogin: async function(aScheme, aHostname, aAuthMethod, aUsername, aPassword) {
          let server = null;
          try {
            server = MailServices.accounts.createIncomingServer(aUsername, aHostname, aScheme);
            server.valid = true;
            server.authMethod = aAuthMethod;
            server.password = aPassword;
            return await CallExtension(server, "VerifyLogin", null, null);
          } catch (ex) {
            logError(ex);
            if (ex instanceof Ci.nsIException) { // TODO catch more specifically
              throw new ExtensionError("Server already exists");
            } else {
              throw new ExtensionError(ex.message);
            }
          } finally {
            if (server) {
              MailServices.accounts.removeIncomingServer(server, true);
            }
          }
        },
        createAccount: function(aScheme, aFullName, aEmail, aHostname, aAuthMethod, aUsername, aPassword) {
          let server = null, identity = null, account = null;
          try {
            server = MailServices.accounts.createIncomingServer(aUsername, aHostname, aScheme);
            server.valid = true;
            server.authMethod = aAuthMethod;
            server.password = aPassword;
            server.prettyName = aEmail;
            identity = MailServices.accounts.createIdentity();
            identity.fullName = aFullName;
            identity.email = aEmail;
            identity.valid = true;
            account = MailServices.accounts.createAccount();
            account.addIdentity(identity);
            account.incomingServer = server;
            try {
              let url = aScheme + "://" + aHostname;
              let login = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
              login.init(url, null, url, aUsername, aPassword, "", "");
              Services.logins.addLogin(login);
            } catch (ex) {
              logError(ex);
            }
            try {
              MailServices.accounts.localFoldersServer;
            } catch (ex) {
              try {
                MailServices.accounts.createLocalMailAccount();
                MailServices.accounts.localFoldersServer;
              } catch (ex) {
                logError(ex);
              }
            }
            server.performBiff(null);
            return server.key;
          } catch (ex) {
            if (account) {
              MailServices.accounts.removeAccount(account, true);
            } else {
              if (identity) {
                identity.clearAllValues();
              }
              if (server) {
                MailServices.accounts.removeIncomingServer(server, true);
              }
            }
            logError(ex);
            if (ex instanceof Ci.nsIException) { // TODO catch more specifically
              throw new ExtensionError("Unable to create account");
            } else {
              throw new ExtensionError(ex.message);
            }
          }
        },
        setSchemeOptions: function(aScheme, aOptions) {
          gSchemeOptions.set(aScheme, aOptions);
        },
        dispatcher: new ExtensionCommon.EventManager(context, "webAccount.dispatcher", (listener, scheme) => {
          try {
            for (let module of gModules) {
              gComponentRegistrar.registerFactory(module.classID, null, module.contractID + scheme, null);
            }
            if (scheme.length > 3) { // COMPAT for TB 60 (bug 1492905)
              gComponentRegistrar.registerFactory(gMessageServiceProperties.classID, null, gMessageServiceProperties.contractID + scheme.slice(0, 4) + "-message" + scheme.slice(4), null);
            }
            gDispatchListeners.set(scheme, listener);
            if (!gSchemeOptions.has(scheme)) {
              gSchemeOptions.set(scheme, {});
            }
            // If this is a reinstall then the server may already be active.
            let allServers = MailServices.accounts.allServers;
            for (let i = 0; i < allServers.length; i++) {
              let server = allServers.queryElementAt(i, Ci.nsIMsgIncomingServer);
              if (server.type == scheme) {
                HeartTransplant(server);
              }
            }
            MailServices.accounts.ReactivateAccounts();
            return () => {
              // XXX can't unregister contracts
              gDispatchListeners.delete(scheme);
              gSchemeOptions.delete(scheme);
            };
          } catch (ex) {
            logError(ex);
            throw SanitiseException(ex);
          }
        }).api(),
      }
    };
  }
};
