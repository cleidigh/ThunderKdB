
/**
 * {Map serverId {String} -> account {EWSAccount}}
 */
var gEWSAccounts = new Map();

class EWSAccount extends OwlAccount {

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
   * Last login time
   * {Number} like Date.now()
   */
  this.lastLogin = Date.now();

  /**
   * EWS request version
   * {EnumValue} kExchangeUnknown, kExchange2010_SP1 or kExchange2013
   */
  this.requestVersion = kExchangeUnknown;

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
  return this;
}

/**
 * Internal function. Part of load().
 */
async getURL() {
  let url = await browser.incomingServer.getStringValue(this.serverID, "ews_url");
  if (url) {
    return url;
  }
  let hostname = await browser.incomingServer.getHostName(this.serverID);
  url = "https://" + hostname + "/EWS/Exchange.asmx";
  browser.incomingServer.setStringValue(this.serverID, "ews_url", url);
  return url;
}

/**
 * Checks a response to see whether it failed.
 *
 * @param aXHR      {XMLHttpRequest} The response from EWS
 * @param aRequest  {Object}         The original JSON encoded EWS request
 * @returns         {Object}         The response in JSON format
 *    If there are several responses:
 *    result value: {Array[Object]}  Success and error objects
 *      succeeded   {Boolean}        Whether the item was successful
 *      item        {Object}         The item result in JSON format (if succeded == true)
 *      ex          {EWSItemError}   The item error object (if succeded == false)
 *    result.error  {Array[EWSItemError]} Just the error objects
 * @throws          {EWSError}       If the response failed
 */
CheckResponse(aXHR, aRequest) {
  let responseXML = aXHR.responseXML;
  if (!responseXML) {
    if (!aXHR.getResponseHeader("Content-Type").toLowerCase().trim().startsWith("text/xml")) {
      // No XML response
      throw new EWSError(aXHR, aRequest);
    }
    // Reparse in case of invalid character entities.
    responseXML = this.parseXML(aXHR.responseText);
  }
  if (this.requestVersion == kExchangeUnknown) {
    let version = responseXML.querySelector("ServerVersionInfo");
    if (version) {
      this.requestVersion = version.getAttribute("Version").includes("2010_") ? kExchange2010_SP1 : kExchange2013;
    }
  }
  // Free/Busy is a special snowflake and has its own element.
  let freebusy = responseXML.querySelector("FreeBusyResponseArray");
  if (freebusy) {
    freebusy = EWSAccount.GetItem(XML2JSON(freebusy));
    for (let response of ensureArray(freebusy)) {
      if (response.ResponseMessage.ResponseClass != "Success") {
        throw new EWSError(aXHR, aRequest);
      }
    }
    return freebusy;
  }
  let messages = responseXML.querySelector("ResponseMessages");
  if (!messages) {
    throw new EWSError(aXHR, aRequest);
  }
  messages = EWSAccount.GetItem(XML2JSON(messages));

  var messagesArray = ensureArray(messages);
  if (messagesArray.length == 1) { // simple single response
    // Check for this specific error so that we can retry the operation.
    if (messages.ResponseCode == "ErrorInvalidSyncStateData") {
      throw new InvalidSyncStateServerError(messages.MessageText);
    }
    if (messages.ResponseClass == "Error") {
      throw new EWSItemError(messages, aRequest);
    }
    return messages;
  }
  let results = messagesArray.filter(message => message.ResponseClass != "Error");
  // Array of multiple respones, both successes and errors.
  results.all = messagesArray.map(message =>
    message.ResponseClass == "Error"
      ? {
          succeeded: false,
          ex: new EWSItemError(message, aRequest),
        }
      : {
          succeeded: true,
          item: message,
        }
  );
  results.errors = results.all.filter(result => !result.succeeded).map(result => result.ex);
  return results;
}

/**
 * Parses XML from a string after cleaning it of illegal entities.
 *
 * @param aXMLasText {String}         The XML string to parse
 * @returns     {Document}       The XML response document
 * @throws      {ParameterError} If the XML failed to parse
 */
parseXML(aXMLasText) {
  // Exchange simply encodes illegal characters, rather than filtering
  // them out, so we have to manually filter out their entities here.
  // https://www.w3.org/TR/2006/REC-xml-20060816/Overview.html#charsets
  // XML 1.0 character legality (both literal and as entities):
  // &#x0; (NUL) - &#x8; (BS) are illegal
  // &#x9; (TAB) - &#xA; (LF) are legal
  // &#xB; (VT) - &#xC; (FF) are illegal
  // &#xD; (CR) is legal
  // &#xE; (SO) - &#x1F; (S7) are illegal
  // &#x20; (SPACE) - &#xD7FF; are legal
  // &#xD800; - &#xDFFF; are illegal
  // &#xE000; - &#xFFFD; are legal
  // &#xFFFE; - &#xFFFF; are illegal
  // &#x10000; - &#x10FFFF; are legal
  let cleanText = aXMLasText.replace(/&#x([0-8BCEF]|1[0-9A-F]|D[89A-F][0-9A-F][0-9A-F]|FFF[EF]);/gi, "");
  let document = new DOMParser().parseFromString(cleanText, "text/xml");
  if (document.documentElement.namespaceURI == "http://www.mozilla.org/newlayout/xml/parsererror.xml") {
    let errorMessage = document.documentElement.textContent;
    throw new ParameterError("xml-parsing-error", errorMessage.split("\n")[0], { errorMessage });
  }
  return document;
}

/**
 * Internal function. Used only by CallService().
 *
 * Translates an EWS request to a SOAP/XML document.
 *
 * Implementation limitations:
 * The time zone is currently hardcoded as UTC, although
 * appointments and events are given time zone overrides.
 *
 * @param aRequest {Object} The request to translate.
 * @returns        {String} The XML source.
 */
request2XML(aRequest) {
  const envelopeNS = "http://schemas.xmlsoap.org/soap/envelope/";
  const messagesNS = "http://schemas.microsoft.com/exchange/services/2006/messages";
  const typesNS = "http://schemas.microsoft.com/exchange/services/2006/types";
  const w3cNS = "http://www.w3.org/2000/xmlns/";
  let xml = document.implementation.createDocument(envelopeNS, "s:Envelope");
  let envelope = xml.documentElement;
  envelope.setAttributeNS(w3cNS, "xmlns:s", envelopeNS);
  envelope.setAttributeNS(w3cNS, "xmlns:m", messagesNS);
  envelope.setAttributeNS(w3cNS, "xmlns:t", typesNS);
  JSON2XML({
    t$RequestServerVersion: {
      Version: String(this.requestVersion) || "Exchange2010_SP1",
    },
    t$TimeZoneContext: {
      t$TimeZoneDefinition: {
        Id: "UTC",
      },
    },
  }, envelope, envelopeNS, "s:Header");
  JSON2XML(aRequest, envelope, envelopeNS, "s:Body");
  return xml;
}

/**
 * Invoke a generic action using the EWS API.
 *
 * @param aMsgWindow {Integer?} The identifier used to prompt for a password
 * @param aRequest   {Object}   The JSON encoded request
 * @returns          {Object}   The response messages in JSON format
 */
async CallService(aMsgWindow, aRequest) {
  let xhr;
  do {
    let password = await browser.incomingServer.getPassword(this.serverID, aMsgWindow);
    // XXX TODO work out how to do this using Fetch
    xhr = new XMLHttpRequest();
    xhr.open("POST", this.serverURL, true, this.username, password);
    xhr.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
    let onloadend = new Promise((resolve, reject) => {
      xhr.onloadend = resolve;
    });
    xhr.send(this.request2XML(aRequest));
    await onloadend;
    if (xhr.status == 200) {
      return this.CheckResponse(xhr, aRequest);
    }
    if (xhr.status != 401) {
      let error = new EWSError(xhr, aRequest);
      if (error.type == "ErrorInvalidServerVersion") {
        throw new ExchangeVersionError(null, error.message);
      }
      throw error;
    }
  } while (await browser.incomingServer.promptLoginFailed(this.serverID, aMsgWindow));
  throw new OwlError("password-wrong", xhr.statusText);
}

/**
 * Listens to streaming notifications.
 *
 * @param aMsgWindow  {Integer?} The identifier used to prompt for a password
 * @param aRequestXML {Document} The JSON encoded request
 * @param responseCallback {function(message {XML})} Called each time that the server
 *      gives us a new XML snipplet.
 */
async CallStream(aMsgWindow, aRequestXML, responseCallback) {
  let xhr = new XMLHttpRequest();
  // Exchange streams multiple XML documents, so we have to parse manually.
  xhr.overrideMimeType("text/plain");
  let responseLength = 0;
  xhr.onprogress = async event => {
    try {
      let responseText = xhr.responseText;
      let responseXML = this.parseXML(responseText.slice(responseLength));
      responseLength = responseText.length;
      let message = responseXML.querySelector("GetStreamingEventsResponseMessage");
      message = XML2JSON(message);
      if (message.ResponseClass == "Error") {
        throw new EWSItemError(message, aRequest);
      }
      if (message.ConnectionStatus == "Closed") {
        // Exchange wants us to start a new stream.
        this.CallStream(aMsgWindow, aRequestXML, responseCallback);
      }
      responseCallback(message);
    } catch (ex) {
      logError(ex);
    }
  };
  let password = await browser.incomingServer.getPassword(this.serverID, aMsgWindow);
  xhr.open("POST", this.serverURL, true, this.username, password);
  xhr.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
  xhr.send(aRequestXML);
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
 * In EWS mode this is called by EnsureStartup above.
 * In OWA 2010 mode, this is called by OWAAccount.Login(),
 * which is called by EnsureLoggedIn() in DispatchOperation().
 */
async StartupAfterLogin(aMsgWindow) {
  // First, ensure that all of the folder counts are up-to-date.
  await this.CheckFolders(aMsgWindow, true);
  // Register this account's calendar with Lightning, if it is installed.
  browser.calendarProvider.registerCalendar(this.serverID);
  // Download the contacts in the background.
  noAwait(this.ResyncAddressBooks(aMsgWindow), logError); // contacts.js
  await this.SubscribeToNotifications(aMsgWindow);
}

/**
 * Subscribe to streaming notifications, i.e. push mail.
 *
 * This allows the server to tell us when something changed
 * on the server side.
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 */
async SubscribeToNotifications(aMsgWindow) {
  let subscribe = {
    m$Subscribe: {
      m$StreamingSubscriptionRequest: {
        t$EventTypes: {
          t$EventType: [
            "CopiedEvent",
            "CreatedEvent",
            "DeletedEvent",
            "ModifiedEvent",
            "MovedEvent",
            "NewMailEvent",
          ],
        },
        SubscribeToAllFolders: true,
      },
    },
  };
  let response = await this.CallService(aMsgWindow, subscribe);
  let streamRequest = {
    m$GetStreamingEvents: {
      m$SubscriptionIds: {
        t$SubscriptionId: response.SubscriptionId,
      },
      // Maximum number of minutes to keep a stream open.
      // In minutes, between 1 and 30, inclusive.
      m$ConnectionTimeout: 29, // minutes
    },
  };
  this.CallStream(aMsgWindow, this.request2XML(streamRequest), async message => {
    for (let notification of ensureArray(message.Notifications && message.Notifications.Notification)) {
      try {
        await this.ProcessStreamEvents(notification);
      } catch (ex) {
        logError(ex);
      }
    }
  });
}

/**
 * Process the events in an EWS streaming notification.
 *
 * @param aNotification {Notification} The EWS notification object.
 *
 * This object has one or more of the following properties:
 * CopiedEvent   {MoveCopyEvent} Indicates a message or folder was copied
 * CreatedEvent  {BaseEvent}     Indicates a message or folder was created
 * DeletedEvent  {BaseEvent}     Indicates a message or folder was deleted
 * ModifiedEvent {BaseEvent}     Indicates a message or folder was modified
 * MovedEvent    {MoveCopyEvent} Indicates a message or folder was moved
 * NewMailEvent  {BaseEvent}     Indicates that a new message was received
 */
async ProcessStreamEvents(aNotification) {
  for (let copiedEvent of ensureArray(aNotification.CopiedEvent)) {
    if (copiedEvent.ItemId) {
      let oldItem = copiedEvent.OldItemId.Id;
      let newItem = copiedEvent.ItemId.Id;
      let oldFolder = copiedEvent.OldParentFolderId.Id;
      let newFolder = copiedEvent.ParentFolderId.Id;
      browser.incomingServer.notifyMessageCopied(this.serverID, oldItem, oldFolder, newItem, newFolder);
    } else if (copiedEvent.FolderId) {
      let oldFolder = copiedEvent.OldFolderId.Id;
      let newFolder = copiedEvent.FolderId.Id;
      let oldParent = copiedEvent.OldParentFolderId.Id;
      let newParent = copiedEvent.ParentFolderId.Id;
      browser.incomingServer.notifyFolderCopied(this.serverID, oldFolder, oldParent, newFolder, newParent);
    } else {
      throw new Error("CopiedEvent did not conform to schema");
    }
  }
  for (let createdEvent of ensureArray(aNotification.CreatedEvent)) {
    if (createdEvent.ItemId) {
      let newItem = createdEvent.ItemId.Id;
      let folder = createdEvent.ParentFolderId.Id;
      browser.incomingServer.notifyMessageCreated(this.serverID, newItem, folder);
    } else if (createdEvent.FolderId) {
      let parent = createdEvent.ParentFolderId.Id;
      let {id, name, total, unread} = await this.GetFolder(null, createdEvent.FolderId.Id);
      browser.incomingServer.notifyFolderCreated(this.serverID, parent, id, name, total, unread);
    } else {
      throw new Error("CreatedEvent did not conform to schema");
    }
  }
  for (let deletedEvent of ensureArray(aNotification.DeletedEvent)) {
    if (deletedEvent.ItemId) {
      let oldItem = deletedEvent.ItemId.Id;
      let folder = deletedEvent.ParentFolderId.Id;
      browser.incomingServer.notifyMessageDeleted(this.serverID, oldItem, folder);
    } else if (deletedEvent.FolderId) {
      let folder = deletedEvent.FolderId.Id;
      let parent = deletedEvent.ParentFolderId.Id;
      browser.incomingServer.notifyFolderDeleted(this.serverID, folder, parent);
    } else {
      throw new Error("DeletedEvent did not conform to schema");
    }
  }
  for (let modifiedEvent of ensureArray(aNotification.ModifiedEvent)) {
    if (modifiedEvent.ItemId) {
      let item = modifiedEvent.ItemId.Id;
      let folder = modifiedEvent.ParentFolderId.Id;
      browser.incomingServer.notifyMessageModified(this.serverID, item, folder);
    } else if (modifiedEvent.FolderId) {
      let {id, name, total, unread} = await this.GetFolder(null, modifiedEvent.FolderId.Id);
      browser.incomingServer.notifyFolderModified(this.serverID, id, name, total, unread);
    } else {
      throw new Error("ModifiedEvent did not conform to schema");
    }
  }
  for (let movedEvent of ensureArray(aNotification.MovedEvent)) {
    if (movedEvent.ItemId) {
      let oldItem = movedEvent.OldItemId.Id;
      let newItem = movedEvent.ItemId.Id;
      let oldFolder = movedEvent.OldParentFolderId.Id;
      let newFolder = movedEvent.ParentFolderId.Id;
      browser.incomingServer.notifyMessageMoved(this.serverID, oldItem, oldFolder, newItem, newFolder);
    } else if (movedEvent.FolderId) {
      let oldFolder = movedEvent.OldFolderId.Id;
      let newFolder = movedEvent.FolderId.Id;
      let oldParent = movedEvent.OldParentFolderId.Id;
      let newParent = movedEvent.ParentFolderId.Id;
      browser.incomingServer.notifyFolderMoved(this.serverID, oldFolder, oldParent, newFolder, newParent);
    } else {
      throw new Error("MovedEvent did not conform to schema");
    }
  }
  for (let newMailEvent of ensureArray(aNotification.NewMailEvent)) {
    let newItem = newMailEvent.ItemId.Id;
    let folder = newMailEvent.ParentFolderId.Id;
    browser.incomingServer.notifyMessageCreated(this.serverID, newItem, folder);
  }
}

/**
 * Update the local tree with the latest folder counts.
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @param aForLogin  {Boolean} Whether this is the initial update for login
 */
async CheckFolders(aMsgWindow, aForLogin) {
  if (aForLogin) {
    // Record the time so we don't check the folders twice on first login.
    this.lastLogin = Date.now();
  } else if (Date.now() - this.lastLogin < EWSAccount.kMinCheckAfterLogin) {
    // This is a first login duplicated check, ignore it.
    return;
  }

  let folderTree = await this.FindFolders(aMsgWindow); // emails.js
  await browser.incomingServer.sendFolderTree(this.serverID, folderTree);
}

/**
 * Performs an EWS operation to verify the user's credentials.
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
  let authMethod = await browser.incomingServer.getNumberValue(this.serverID, "authMethod");
  if (authMethod != kPassword) {
    let error = new OwlError("auth-method-unknown");
    await logErrorToServer(error);
    return { message: error.message, code: "auth-method-unknown" };
  }
  let request = {
    m$GetFolder: {
      m$FolderShape: {
        t$BaseShape: "IdOnly",
      },
      m$FolderIds: {
        t$DistinguishedFolderId: [{
          Id: "msgfolderroot",
        }],
      },
    },
  };
  try {
    await this.CallService(null, request);
    let error = new Error("VerifyLogin succeded for logging purposes");
    error.code = "auth-method-succeeded";
    await logErrorToServer(error);
    return {};
  } catch (ex) {
    // await, so that errorLog has the username before the temp accounts gets deleted.
    await logErrorToServer(ex);
    return { message: ex.message, code: ex.code || "auth-method-failed" };
  }
}

} // class EWS

// Constants

EWSAccount.kMinCheckAfterLogin = 10 * 1000; // 10 seconds

/**
 * The maximum number of messages to fetch in a single call to GetMessages.
 */
EWSAccount.kMaxGetItemIds = 50;

/**
 * The maximum number of calendar items to fetch in a single call to SyncItems.
 * (This value cannot exceed the server limit of 512.)
 */
EWSAccount.kMaxSyncChanges = 500;

// Static functions

/**
 * Helper function for getting items of unspecified types.
 *
 * @param aParent {Object} The container of the item
 * @returns       {Object} The item
 *
 * In some cases, the tag EWS returns depends on the item type.
 * In the cases that matter to us, there is only one child item,
 * so we simply return the first available value.
 */
EWSAccount.GetItem = function(aParent) {
  return Object.values(aParent)[0];
}

/**
 * Dispatches a request from the backend.
 *
 * @param aServerId   {String} The account's server key
 * @param aOperation  {String} The requested operation
 * @param aParmaeters {Object} Operation-specific parameters
 * @returns           {Any?}   Operation-dependent return value
 */
EWSAccount.DispatchOperation = async function(aServerId, aOperation, aParameters, aMsgWindow) {
  switch (aOperation) {
  case "GetString":
    // Special case authMethod3 = Password?
    return GetString(aParameters.bundleName, aParameters.id); // owl.js
  case "GetExtensionURL":
    return GetExtensionURL(); // owl.js
  case "ClearAllValues":
    gEWSAccounts.delete(aServerId);
    return;
  case "VerifyLogin":
    let tempAccount = await new EWSAccount(aServerId);
    return tempAccount.VerifyLogin(); // auth.js
  }
  var account = gEWSAccounts.get(aServerId);
  if (!account) {
    account = await new EWSAccount(aServerId);
    gEWSAccounts.set(aServerId, account);
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
    return await EWSAccount.DispatchOperation(aServerId, aOperation, aParameters, aMsgWindow);
  } catch (ex) {
    // serialise the exception properties, because only .message and .stack survive the boundary,
    // but we need all the Error properties, like code/type, parameters etc..
    // CallExtension() on the other side will de-serialise it again and reconstruct the object.
    throw serialiseError(ex); // owl.js
  }
}, "owl-ews");

browser.webAccount.setSchemeOptions("owl-ews", {
  authMethods: [3],
  sentFolder: "SameServer",
});
