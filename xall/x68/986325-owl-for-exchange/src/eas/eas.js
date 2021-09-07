const kFolderSyncKeyError = "9";

/**
 * Structure that holds the data required by the ActiveSync Ping command.
 */
class ListenData {
  /**
   * @param aId    {String} The folder's server id
   * @param aClass {String} The type of folder: Email, Contacts, Calendar, Tasks
   */
  constructor(aId, aClass) {
    this.Id = aId;
    this.Class = aClass;
  }
}

/**
 * {Map serverId {String} -> account {EASAccount}}
 */
var gEASAccounts = new Map();

class EASAccount extends OwlAccount {

/**
 * async
 */
constructor(aServerID) {
  super(aServerID);

  /**
   * This value is a Promise that will be settled when the startup for that
   * hostname completes. This protects us against simultaneous startups.
   * Because starting up is asynchronous and requires listeners, the caller to
   * EnsureStartup receives a Promise on which it awaits for startup to complete.
   * Conveniently, any number of callers waiting for the same hostname to be
   * started up can wait on the same Promise object. Thus if there is a Promise
   * in this variable already then there is already a startup in progress and
   * EnsureStartup can simply allow its caller to await on it directly.
   *
   * {Promise} Startup completed
   */
  this.startedUp = null;

  /**
   * This value is a Promise that will be settled when the outstanding call
   * that updates the folder sync key updates. This protects us against
   * simultaneous uses of the folder sync key.
   *
   * Conveniently, any number of callers waiting for the sync key can wait
   * on the same Promise object. Thus if there is a Promise in this variable
   * then there is an outstanding call in progress to be awaited for.
   *
   * {Promise} Sync key busy
   */
  this.syncKeyBusy = null;

  /**
   * Time in seconds that the server should monitor for in a single ping.
   * The server will update this value if it doesn't like it.
   */
  this.heartbeat = 60;
  /**
   * Maximum number of folders in a single ping.
   * The server will update this value if it doesn't like it.
   */
  this.maxFolders = 100;
  /**
   * Folders to listen to. {Array[ListenData]}
   */
  this.listenFolders = [];

  /**
   * Cache of local storage containing data used to
   * reconcile changes with the server.
   */
  this.storage = null;
  /**
   * Contacts part of the cache for convenient access.
   */
  this.contacts = null;
  /**
   * Mailing lists part of the cache for convenient access.
   */
  this.mailingLists = null;

  return this.load();
}

/**
 * Internal function. Called as part of ctor.
 */
async load() {
  this.serverURL = await this.getURL();
  this.username = await browser.incomingServer.getUsername(this.serverID);
  this.authMethod = await browser.incomingServer.getNumberValue(this.serverID, "authMethod");
  if (this.authMethod == kOAuth2) {
    this.oAuth2Login = new OAuth2Login(this);
  }
  /// This value is a promise that settles to the policy key.
  this.policyKey = browser.incomingServer.getStringValue(this.serverID, "policy_key");
  return this;
}

/**
 * Internal function. Part of load().
 */
async getURL() {
  let url = await browser.incomingServer.getStringValue(this.serverID, "eas_url");
  if (url) {
    return url;
  }
  let hostname = await browser.incomingServer.getHostName(this.serverID);
  url = "https://" + hostname + "/Microsoft-Server-ActiveSync";
  browser.incomingServer.setStringValue(this.serverID, "eas_url", url);
  return url;
}

/**
 * Invoke a generic action using the EAS API.
 *
 * @param aMsgWindow {Integer?} The identifier used to prompt for a password
 * @param aCommand   {String}   The ActiveSync command name
 * @param aData      {Object}   JSON encoded request data
 * @returns          {Object}   The response in JSON format
 */
async CallService(aMsgWindow, aCommand, aData) {
  let canProvision = aCommand != "Provision";
  while (true) {
    let url = new URL(this.serverURL);
    url.searchParams.append("Cmd", aCommand);
    url.searchParams.append("User", this.username);
    url.searchParams.append("DeviceId", await EASAccount.GetDeviceID());
    url.searchParams.append("DeviceType", "UniversalOutlook");
    // XXX TODO work out how to do this using Fetch
    let xhr = new XMLHttpRequest();
    if (this.authMethod == kOAuth2) {
      let accessToken = await this.oAuth2Login.getAccessToken(aMsgWindow);
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
    } else {
      let password = await browser.incomingServer.getPassword(this.serverID, aMsgWindow);
      xhr.open("POST", url, true, this.username, password);
    }
    xhr.setRequestHeader("Content-Type", "application/vnd.ms-sync.wbxml");
    xhr.setRequestHeader("MS-ASProtocolVersion", "14.1");
    if (aCommand != "Provision" && await this.policyKey) {
      xhr.setRequestHeader("X-MS-PolicyKey", await this.policyKey);
    }
    xhr.responseType = "arraybuffer";
    await new Promise((resolve, reject) => {
      xhr.onloadend = resolve;
      xhr.send(JSON2WBXML(aData));
    });
    if (xhr.status == 401) {
      if (this.authMethod == kOAuth2) {
        // The access token expired. Loop around so that we get a new one.
        // If we can't get a new one, e.g. user cancelled,
        // `getAccessToken()` will reject (throws from await).
        this.oAuth2Login.clearAccessToken();
        continue;
      } else if (await browser.incomingServer.promptLoginFailed(this.serverID, aMsgWindow)) {
        // The user wants to retry.
        continue;
      }
      throw new OwlError("password-wrong", xhr.statusText);
    }
    if (xhr.status != 200) {
      throw new EASError(xhr, aCommand, aData);
    }
    // Sync requests with no changes or errors return an empty response.
    if (!xhr.response.byteLength) {
      return null;
    }
    let response = WBXML2JSON(new Uint8Array(xhr.response));
    // The top-level Status code is optional, but code 1 means success,
    // except for Ping, which needs special processing.
    if (!response.Status || response.Status == "1" || aCommand == "Ping") {
      return response;
    }
    // Status codes 141 to 144 mean that we need to (re-)provision.
    if (!canProvision || response.Status < 141 || response.Status > 144) {
      throw new EASError(xhr, aCommand, aData, response.Status);
    }
    // Don't try to provision repeatedly.
    canProvision = false;
    // We will await this value on our next loop.
    this.policyKey = this.Provision(aMsgWindow);
  }
}

/**
 * Perform the provisioning sequence to obtain security policy settings.
 *
 * Note: Not all servers require provisioning. Under older ActiveSync protocol
 * versions, servers requiring provisioning will generate an HTTP error 449.
 * Newer ActiveSync protocol versions replace this with a WBXML result
 * containing a status code of between 141 to 144 inclusive.
 */
async Provision(aMsgWindow) {
  let request = {
    Provision: {
      DeviceInformation: {
        Set: {
          Model: "Computer",
        },
      },
      Policies: {
        Policy: {
          PolicyType: "MS-EAS-Provisioning-WBXML",
        },
      },
    },
  };
  let policy = await this.CallService(aMsgWindow, "Provision", request);
  if (policy.Policies.Policy.Status != "1") {
    throw new EASError(null, "Provision", request, policy.Provision.Policies.Policy.Status);
  }
  delete request.DeviceInformation;
  request.Provision.Policies.Policy.PolicyKey = policy.Policies.Policy.PolicyKey;
  request.Provision.Policies.Policy.Status = "1";
  let response = await this.CallService(aMsgWindow, "Provision", request);
  if (policy.Policies.Policy.Status != "1") {
    throw new EASError(null, "Provision", request, policy.Provision.Policies.Policy.Status);
  }
  let policyKey = response.Policies.Policy.PolicyKey;
  await browser.incomingServer.setStringValue(this.serverID, "policy_key", policyKey);
  return policyKey;
}

/**
 * Check whether the user has logged on in this session yet.
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 */
async EnsureStartup(aMsgWindow) {
  if (this.startedUp) {
    return this.startedUp;
  }
  let promise = new Promise(async (resolve, reject) => {
    try {
      // First, ensure that all of the folder counts are up-to-date.
      await this.StartupAfterLogin(aMsgWindow);
      resolve();
    } catch (ex) {
      this.startedUp = null;
      reject(ex);
    }
  });
  this.startedUp = promise;
  return promise;
}

/**
 * Perform one-time per-login tasks.
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 *
 * This is called by EnsureStartup above.
 */
async StartupAfterLogin(aMsgWindow) {
  // First, ensure that all of the folder counts are up-to-date.
  await this.CheckFolders(aMsgWindow, true);
  // Register this account's calendar with Lightning, if it is installed.
  browser.calendarProvider.registerCalendar(this.serverID);
  // Download the contacts in the background.
  noAwait(this.ResyncAddressBooks(aMsgWindow), logError); // contacts.js
}

/**
 * Add a folder to the list of folders being pinged.
 *
 * @param aFolder {String} The server id of the folder to ping
 * @param aClass  {String} The type of folder: Email, Contacts, Calendar.
 *
 * If the folder was already being pinged then its recency is still bumped.
 */
ListenToFolder(aFolder, aClass) {
  let isNew = !this.GetListenData(aFolder);
  this.RemoveFolderListener(aFolder);
  this.listenFolders.push(new ListenData(aFolder, aClass));
  this.TrimListenFolders();
  if (isNew) {
    // Notify any existing listener that it should stop listening.
    this.listenFolders = [...this.listenFolders];
    noAwait(this.StartListening(), logError);
  }
}

/**
 * Stop pinging a folder.
 *
 * @param aFolderId {String} The server id of the folder
 */
RemoveFolderListener(aFolder) {
  let listen = this.GetListenData(aFolder);
  if (listen) {
    // This will also silence notifications for this folder in the current ping.
    this.listenFolders.splice(this.listenFolders.indexOf(listen), 1);
  }
}

/**
 * Find the class of a folder being pinged.
 *
 * @param aFolder {String} The server id of the folder
 * @returns       {Object?}
 *   Id           {String} The server id of the folder
 *   Class        {String} The type of folder
 *
 * The Id and Class are stored this way to match the EAS Ping command.
 */
GetListenData(aFolder) {
  return this.listenFolders.find(listen => listen.Id == aFolder);
}

/**
 * Ping the EAS server to determine whether any folders have changed.
 *
 * Stops pinging when the list of ping folders changed. When this happens,
 * a new ping with the new folders is started, and the server closes the
 * current ping (but with a status of 1, so we have to check at our end).
 */
async StartListening() {
  let listenFolders = this.listenFolders;
  while (listenFolders == this.listenFolders) {
    let ping = {
      Ping: {
        HeartbeatInterval: String(this.heartbeat),
        Folders: {
          Folder: listenFolders,
        },
      },
    };
    let response = await this.CallService(null, "Ping", ping);
    switch (response.Status) {
    case "1":
      continue;
    case "2":
      for (let folder of ensureArray(response.Folders.Folder)) {
        await this.ProcessFolderPing(folder);
      }
      continue;
    case "5":
      this.heartbeat = Number(response.HeartbeatInterval);
      continue;
    case "6":
      this.maxFolders = Number(response.MaxFolders);
      this.TrimListenFolders();
      continue;
    default:
      throw new EASError(null, "Ping", ping, response.Status);
    }
  }
}

/**
 * Remove email folders from the list of folders to ping
 * to bring the count down to the server-imposed maximum.
 */
TrimListenFolders() {
  while (this.listenFolders.length > this.maxFolders) {
    this.listenFolders.splice(this.listenFolders.findIndex(listen => listen.Class == "Email"), 1);
  }
}

/**
 * Notify the relevant sync provider that a folder has changed.
 *
 * @param aFolder    {String} The folder's server id
 */
async ProcessFolderPing(aFolder) {
  // The folder may have been deleted since we started pinging.
  let listen = this.GetListenData(aFolder);
  if (!listen) {
    return;
  }
  switch (listen.Class) {
  case "Email":
    await browser.incomingServer.notifyFolderResync(this.serverID, listen.Id);
    break;
  case "Contacts":
    await this.ResyncContacts(null);
    break;
  case "Calendar":
  case "Tasks":
    await browser.calendarProvider.notifyFolderResync(this.serverID, listen.Class, listen.Id);
    break;
  }
}

/**
 * Update the local tree with the latest folder counts.
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @param aForLogin  {Boolean} Whether this is the initial update for login
 */
CheckFolders(aMsgWindow, aForLogin) {
  if (aForLogin) {
    // Record the time so we don't check the folders twice on first login.
    this.lastLogin = Date.now();
  } else if (Date.now() - this.lastLogin < EASAccount.kMinCheckAfterLogin) {
    // This is a first login duplicated check, ignore it.
    return;
  }

  return this.waitForSyncKey(async syncKey => {
    let request = {
      FolderSync: {
        SyncKey: syncKey || "0",
      },
    };
    let response;
    try {
      response = await this.CallService(aMsgWindow, "FolderSync", request);
    } catch (ex) {
      if (ex.code != kFolderSyncKeyError) {
        throw ex;
      }
      syncKey = "";
      request.FolderSync.SyncKey = "0";
      response = await this.CallService(aMsgWindow, "FolderSync", request);
    }
    if (!syncKey) {
      let tasks = response.Changes.Add.find(entry => entry.Type == EASAccount.kTasks);
      await browser.incomingServer.setStringValue(this.serverID, "tasks_serverid", tasks.ServerId);
      let calendar = response.Changes.Add.find(entry => entry.Type == EASAccount.kCalendar);
      await browser.incomingServer.setStringValue(this.serverID, "calendar_serverid", calendar.ServerId);
      let contacts = response.Changes.Add.find(entry => entry.Type == EASAccount.kContacts);
      await browser.incomingServer.setStringValue(this.serverID, "contacts_serverid", contacts.ServerId);
      await browser.incomingServer.setStringValue(this.serverID, "contacts_name", contacts.DisplayName);
      await browser.incomingServer.sendFolderTree(this.serverID, EASAccount.ConvertFolderList(response.Changes.Add));
    } else if (response.Changes) {
      for (let addition of ensureArray(response.Changes.Add)) {
        let type = EASAccount.kFolderTypes[addition.Type];
        if (typeof type == "string") {
          await browser.incomingServer.notifyFolderCreated(this.serverID, addition.ParentId, addition.ServerId, addition.DisplayName, type);
        }
      }
      for (let update of ensureArray(response.Changes.Update)) {
        await browser.incomingServer.notifyFolderMoved(this.serverID, update.ServerId, update.ServerId, update.ParentId);
        await browser.incomingServer.notifyFolderModified(this.serverID, update.ServerId, update.DisplayName);
      }
      for (let deletion of ensureArray(response.Changes.Delete)) {
        await browser.incomingServer.notifyFolderDeleted(this.serverID, deletion.ServerId);
      }
    }
    await browser.incomingServer.setStringValue(this.serverID, "sync_key", response.SyncKey);
  });
}

/**
 * Serialises access to the folder sync key to avoid duplicate updates.
 *
 * @param aCallback {Function(String)} The function to call when ready
 *
 * Returns the value or exception from the callback.
 */
async waitForSyncKey(aCallback) {
  while (this.syncKeyBusy) {
    await this.syncKeyBusy;
  }
  let result;
  this.syncKeyBusy = new Promise(async resolve => {
    try {
      let syncKey = await browser.incomingServer.getStringValue(this.serverID, "sync_key");
      result = await aCallback(syncKey);
    } catch (ex) {
      result = Promise.reject(ex);
    } finally {
      this.syncKeyBusy = null;
      resolve();
    }
  });
  await this.syncKeyBusy;
  return result;
}

/**
 * Performs an EAS operation to verify the user's credentials.
 *
 * @returns         {Object} An object providing the status of the operation
 *   If success, returns an empty object with no properties.
 *   If error, returns an object with:
 *   message        {String} The text of any exception
 *   code           {String} An internal error identifier
 *
 * - "password-wrong"
 *   This means that the test request failed with a 401 HTTP response
 * - "server-refused"
 *   The server complained, e.g. our request was missing parameters.
 * - "server-fail"
 *   5xx error, i.e. server broken, not our fault
 * - "network-fail"
 *   We could not reach the server, e.g. network down, host not found etc.
 * - "auth-method-failed"
 *   There was an exception
 * - "auth-method-unknown"
 *   This means that the authentication method was not recognised.
 */
async VerifyLogin() {
  try {
    // XXX TODO work out how to do this using Fetch
    let xhr = new XMLHttpRequest();
    switch (this.authMethod) {
    case kPassword:
      let password = await browser.incomingServer.getPassword(this.serverID, null);
      xhr.open("OPTIONS", this.serverURL, true, this.username, password);
      break;
    case kLaxPassword:
      throw new OwlError("auth-method-failed");
    case kOAuth2:
      await this.oAuth2Login.logout();
      let authCode = await this.oAuth2Login.loginWithOAuthInPopup();
      let { accessToken } = await this.oAuth2Login.getAccessTokenFromAuthCode(authCode);
      xhr.open("OPTIONS", this.serverURL);
      xhr.setRequestHeader("Authorization", "Bearer " + accessToken);
      break;
    default:
      throw new OwlError("auth-method-unknown");
    }
    await new Promise((resolve, reject) => {
      xhr.onloadend = resolve;
      xhr.send(null);
    });
    if (xhr.status != 200) {
      if (xhr.status == 401) {
        throw new OwlError("password-wrong", xhr.statusText);
      }
      throw new EASError(xhr);
    }
    let versions = (xhr.getResponseHeader("MS-ASProtocolVersions") || "").split(",");
    if (!versions.includes("14.1")) {
      switch (xhr.getResponseHeader("MS-Server-ActiveSync")) {
      case "2.5":
        throw new ExchangeVersionError(2003);
      case "12":
      case "12.1":
        throw new ExchangeVersionError(2007);
      case "14.0":
        throw new ExchangeVersionError(2010);
      default:
        throw new ExchangeVersionError();
      }
    }
    let error = new Error("VerifyLogin succeeded for logging purposes");
    error.code = "auth-method-succeeded";
    await logErrorToServer(error);
    return {};
  } catch (ex) {
    // await, so that errorLog has the username before the temp account gets deleted.
    await logErrorToServer(ex);
    return { message: ex.message, code: ex.code || "auth-method-failed" };
  }
}

} // class EAS

// Constants

EASAccount.kTasks = "7";
EASAccount.kCalendar = "8";
EASAccount.kContacts = "9";
EASAccount.kFolderTypes = [
  , // no zeroth entry
  "", // generic
  "Inbox",
  "Drafts",
  "Trash",
  "SentMail",
  "Queue",
  , // tasks
  , // calendar
  , // contacts
  , // notes
  , // journal
  "", // generic mail
];

// Static functions

/**
 * Helper function for getting a unique ID for each profile.
 *
 * @returns {Promise<String>}
 */
EASAccount.GetDeviceID = function() {
  if (!EASAccount.deviceID) {
    EASAccount.deviceID = (async () => {
      let deviceID = await browser.extPrefs.getStringValue("device_id");
      if (deviceID) {
        return deviceID;
      }
      let array = new Uint32Array(4);
      window.crypto.getRandomValues(array);
      deviceID = Array.from(array, value => value.toString(16).padStart(8, "0")).join("");
      await browser.extPrefs.setStringValue("device_id", deviceID);
      return deviceID;
    })();
  }
  return EASAccount.deviceID;
}

/**
 * Helper function for getting a unique ID for each sync add request.
 *
 * @returns {Promise<String>}
 */
EASAccount.NextClientId = async function() {
  let clientId = await browser.extPrefs.getNumberValue("eas_client_id");
  await browser.extPrefs.setNumberValue("eas_client_id", ++clientId);
  return String(clientId);
}

/**
 * Takes a list of folders from EAS and converts it into a tree.
 *
 * @param aFolders      {Array[Object]} A list of EAS folders
 * @returns             {Array[Object]} A tree of folders
 *
 * Note: If the parent of a folder cannot be found,
 *       it will be added as a child of the root instead.
 *       A numeric suffix will be added in the UI
 *       if the name would otherwise conflict.
 *       The name on the server is not changed.
 */
EASAccount.ConvertFolderList = function(aAdditions) {
  let rootFolder = {
    id: "0",
    children: [],
  };
  let orphans = [];
  /// A map of folder IDs to the array that will hold child folders.
  let folderMap = {
    "0": rootFolder.children,
  };
  for (let addition of ensureArray(aAdditions)) {
    let type = EASAccount.kFolderTypes[addition.Type];
    if (typeof type == "string") {
      let id = addition.ServerId;
      // Add the current folder's child array to the map.
      folderMap[id] = [];
      // Add the folder details to the parent's child array.
      // If the parent isn't found then add it as an orphan instead.
      (folderMap[addition.ParentId] || orphans).push({
        id: id,
        name: addition.DisplayName,
        type: type,
        children: folderMap[id],
      });
    }
  }
  // The server gets to adopt any orphans.
  for (let orphan of orphans) {
    let name = orphan.name;
    let count = 0;
    // If the name duplicates an existing folder, add suffix -1 (or -2 etc.)
    while (rootFolder.children.find(folder => folder.name == orphan.name)) {
      orphan.name = name + --count;
    }
    rootFolder.children.push(orphan);
  }
  return rootFolder;
}

/**
 * Dispatches a request from the backend.
 *
 * @param aServerId   {String} The account's server key
 * @param aOperation  {String} The requested operation
 * @param aParmaeters {Object} Operation-specific parameters
 * @returns           {Any?}   Operation-dependent return value
 */
EASAccount.DispatchOperation = async function(aServerId, aOperation, aParameters, aMsgWindow) {
  switch (aOperation) {
  case "GetString":
    // Special case authMethod3 = Password?
    return GetString(aParameters.bundleName, aParameters.id); // owl.js
  case "GetExtensionURL":
    return GetExtensionURL(); // owl.js
  case "ClearAllValues":
    gEASAccounts.delete(aServerId);
    return;
  case "VerifyLogin":
    let tempAccount = await new EASAccount(aServerId);
    return tempAccount.VerifyLogin(); // auth.js
  }
  var account = gEASAccounts.get(aServerId);
  if (!account) {
    account = await new EASAccount(aServerId);
    gEASAccounts.set(aServerId, account);
  }
  await account.EnsureStartup(aMsgWindow);
  await EnsureLicensed(aServerId); // license.js
  return account.ProcessOperation(aOperation, aParameters, aMsgWindow); // emails.js
}

/**
 * Listens for requests from the backend.
 *
 * This is the central function switchboard to allow callbacks from the
 * webAccount API web experiement, JsAccount, or the Thunderbird backend
 * into our code.
 *
 * Called by webaccount.js::CallExtension().
 *
 * @param aServerId   {String} The account's server key
 * @param aOperation  {String} The requested operation
 * @param aParmaeters {Object} Operation-specific parameters
 * @returns           {Any?}   Operation-dependent return value
 */
browser.webAccount.dispatcher.addListener(async function(aServerId, aOperation, aParameters, aMsgWindow) {
  try {
    return await EASAccount.DispatchOperation(aServerId, aOperation, aParameters, aMsgWindow);
  } catch (ex) {
    // serialise the exception properties, because only .message and .stack survive the boundary,
    // but we need all the Error properties, like code/type, parameters etc..
    // CallExtension() on the other side will de-serialise it again and reconstruct the object.
    throw serialiseError(ex); // owl.js
  }
}, "owl-eas");

browser.webAccount.setSchemeOptions("owl-eas", {
  authMethods: [3, 10],
  sentFolderSelection: "SentMail",
});
