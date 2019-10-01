/**
 * A class representing an OWA operation error
 *
 * @param aResponse {Response} The GlobalFetch Response object
 * @param aBody     {Object}   The response JSON, if available
 * @param aAction   {String}   The OWA action that was attempted
 * @param aData     {Object}   The action-specific JSON data
 */
class OWAError extends ParameterError {
  constructor(aResponse, aBody, aAction, aData) {
    // Delete any outgoing email data in the request.
    if (aData && aData.Body) {
      delete aData.Body.Items;
      delete aData.Body.Attachments;
    }
    let parameters = { action: aAction, data: aData, status: aResponse.status, statusText: aResponse.statusText };
    let message = aResponse.statusText;
    let type = 'HTTP ' + aResponse.status;
    if (aResponse.status == 401 || aResponse.status == 440) {
      type = "login-expired";
      message = gStringBundle.get("error." + type);
    } else if (aResponse.status >= 400 && aResponse.status < 500) {
      message = gStringBundle.get("error.server-refused");
    } else if (aResponse.status >= 500 && aResponse.status < 600) {
      message = gStringBundle.get("error.server-fail");
    }
    if (aBody) {
      if (aBody.Body) {
        aBody = aBody.Body;
      }
      if (aBody.FaultMessage) {
        message = aBody.FaultMessage;
        type = aBody.ExceptionName;
      }
      if (aBody.ResponseMessages && aBody.ResponseMessage.Items && aBody.ResponseMessages.Items[0]) {
        aBody = aBody.ResponseMessages.Items[0];
      }
      if (aBody.MessageText) {
        message = aBody.MessageText;
        type = aBody.ResponseCode;
      } else if (type == "OwaServiceFaultException" && aBody.ResponseCode) {
        type = aBody.ResponseCode;
      }
      if (aBody.FaultMessage || aBody.ResponseMessages || aBody.MessageText) {
        parameters.error = aBody;
      }
    }
    super(type, message, parameters);
  }
}

/**
 * {Map serverId {String} -> account {OWAAccount}}
 */
var gOWAAccounts = new Map();

class OWAAccount extends OwlAccount {

  /**
   * async
   */
  constructor(serverID) {
    super(serverID);

    this.cookieName = "X-OWA-CANARY";

    /**
     * {Array of {Promise}}
     */
    this.connections = [];

    /**
     * Maximum number of server calls that we can do in parallel.
     *
     * Set by MaxConcurrency(), as called in load().
     * {Number}
     */
    this.connectionsLimit = OWAAccount.kMaxParallelFetches;

    /**
      * Last login time
      * {Number} like Date.now()
      */
    this.lastLogin = Date.now();

    /**
     * A Promise that will be settled when the login for that hostname completes.
     *
     * This protects us against simultaneous logins.
     * Because logging in is asynchronous and requires listeners, the caller to
     * EnsureLoggedIn receives a Promise on which it awaits for login to complete.
     * Conveniently, any number of callers waiting for the same hostname to be
     * logged in can wait on the same Promise object. Thus if there is a Promise
     * in this map already then there is already a login in progress and
     * EnsureLoggedIn can simply allow its caller to await on it directly.
     *
     * {Promise} Login completed
     */
    this.pendingLogin = null;

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
  * Must be called after ctor
  */
async load() {
  this.serverURL = await this.getURL();
  await this.MaxConcurrency();
  return this;
}

/**
 * Internal function. Part of load().
 */
async getURL() {
  let owaURL = await browser.incomingServer.getStringValue(this.serverID, "owa_url");
  if (!owaURL) {
    let hostname = await browser.incomingServer.getHostName(this.serverID);
    owaURL = "https://" + hostname + "/owa/";
    browser.incomingServer.setStringValue(this.serverID, "owa_url", owaURL);
  }
  owaURL = new URL(owaURL);
  if (owaURL.hostname == "outlook.office365.com") {
    // https://outlook.office365.com/ often 301 redirects to outlook.office.com
    // which means that's the hostname where the X-OWA-COOKIE actually gets set.
    // Generically detecting the redirect complicates the code, so instead we
    // just anticipate the redirect here.
    owaURL.hostname = "outlook.office.com";
  }
  return owaURL;
}

/**
 * Invoke a generic action using the service.svc API entrypoint.
 *
 * This will queue the call to ensure that the connection limit is not exceeded.
 *
 * @param aAction   {String} The OWA action to invoke
 * @param aData     {Object} Action-specific JSON data
 * @returns         {Object} The JSON response message
 */
async CallService(aAction, aData) {
  // Enforce max connections limit
  while (this.connections.length >= this.connectionsLimit) {
    try {
      await Promise.race(this.connections);
    } catch (ex) {
      // Some other server call failed. Nothing to do with us.
      // We're only interested that the call finished.
    }
  }
  let thisFetch = this.CallServiceUnqueued(aAction, aData);
  this.connections.push(thisFetch);
  let concurrent = this.connections.length;
  try {
    return await thisFetch;
  } catch (ex) {
    if (ex instanceof TooManyRequestsServerError) {
      concurrent--; // That was too much
      if (concurrent >= OWAAccount.kMinParallelFetches) {
        this.SetMaxConcurrency(concurrent, "measured");
      }
    }
    throw ex;
  } finally {
    this.connections.splice(this.connections.indexOf(thisFetch), 1);
  }
}

/**
 * Invoke a generic action using the service.svc API entrypoint.
 *
 * Internal function. This is not queued. Call `CallService()` instead.
 *
 * @param aAction   {String} The OWA action to invoke
 * @param aData     {Object} Action-specific JSON data
 * @returns         {Object} The JSON response message
 */
async CallServiceUnqueued(aAction, aData) {
  let url = this.serverURL + "service.svc";
  let response = await fetch(url, {
    method: "POST",
    headers: {
      Action: aAction,
      "Content-Type": "application/json",
      "X-OWA-CANARY": await this.getCanary(), // auth.js
    },
    body: JSON.stringify(aData), // unlike fetchhttp.js it doesn't support JSON
    credentials: "include",
  });
  let result = await this.CheckJSONResponse(response, url, aAction, aData);
  // Look for the real result in a couple of standard places.
  if (result.Body) {
    result = result.Body;
  }
  if (result.ResponseMessages) {
    // TODO this removes all but the first result, even for success cases.
    // Compare EWSAccount.CheckResponse()
    result = result.ResponseMessages.Items[0];
  }
  // Check for this specific error in case we want to retry the operation.
  if (result.ResponseCode == "ErrorTooManyObjectsOpened") {
    throw new TooManyRequestsServerError(result.MessageText);
  }
  // If the call failed, it returns a human-readable error string.
  if (result.MessageText) {
    throw new OWAError(response, result, aAction, aData);
  }
  return result;
}

/**
 * Checks a response to see whether it failed or logged out.
 * If the status was 440, also delete the X-OWA-CANARY cookie.
 *
 * @param aResponse {Response} The response from the Fetch request
 * @param aAction   {String}   The OWA action that was attempted
 * @param aData     {Object}   The action-specific data object
 * @throws          {OWAError} If the response failed
 */
async CheckResponse(aResponse, aAction, aData) {
  // Most exchange servers return error 440 if the X-OWA-CANARY cookie expires
  // however outlook.office.com seems to be able to return 401 instead.
  if (aResponse.status == 401 || aResponse.status == 440) {
    await this.ClearCookies(); // auth.js
  }
  if (!aResponse.ok) {
    let result = null;
    try {
      // Get a more detailed error message from the server
      result = await aResponse.json();
    } catch (ex) {
      // The response wasn't JSON, so we can't extract an error message.
    }
    let error = new OWAError(aResponse, result, aAction, aData);
    // Special-case an OverBudgetException as ParallelFetch expects that error.
    if (error.type == "OverBudgetException") {
      // TODO #348 Check whether we get the value from the JSON error object.
      let match = error.message.match(/'MaxConcurrency'.*'(\d+)'.*'Owa'/);
      if (match) {
        let maxConcurrency = parseInt(match[1]);
        this.SetMaxConcurrency(maxConcurrency, "server");
      }
      throw new TooManyRequestsServerError(error.message);
    } else if (error.type == "ErrorExceededConnectionCount") {
      throw new TooManyRequestsServerError(error.message);
    }
    throw error;
  }
}

/**
 * Checks a response to see whether it contains JSON.
 *
 * @param aResponse    {Response} The response from the Fetch request
 * @param aOriginalURL {String}   The URL that was fetched
 * @param aAction      {String}   The OWA action that was attempted
 * @param aData        {Object}   The action-specific data object
 * @returns            {Object}   The JSON result object
 * @throws             {OWAError} If the response looks like a login page
 *
 * First, check whether it failed completely using `CheckResponse()`.
 * If it looks like a redirect to a login page, throw a login-expired error.
 * May still throw other errors if the call to `.json()` fails.
 */
async CheckJSONResponse(aResponse, aOriginalURL, aAction, aData) {
  await this.CheckResponse(aResponse, aAction, aData);
  try {
    return await aResponse.json();
  } catch (ex) {
    if (aResponse.url != aOriginalURL &&
        aResponse.headers.get("Content-Type").toLowerCase().split(";")[0].trim() == "text/html") {
      await this.ClearCookies(); // auth.js
      throw new OwlError("login-expired");
    }
    throw ex;
  }
}

/**
 * How many parallel server calls we can make to this particular server.
 */
async MaxConcurrency() {
  if (this.connectionsLimit) {
    return this.connectionsLimit;
  }

  this.connectionsLimit =
      await browser.incomingServer.getNumberValue(this.serverID, "max_concurrency_server")
      || await browser.incomingServer.getNumberValue(this.serverID, "max_concurrency_measured")
      || OWAAccount.kMaxParallelFetches;

  return this.connectionsLimit;
}

/**
 * How many parallel server calls we can make to this particular server.
 *
 * @param maxConcurrency {Integer}   How many concurrent connections are allowed, total
 * @param type {string-enum}
 *   - "server" = Server told us this max
 *   - "measured" = We managed to get this many concurrent connection in practice.
 */
async SetMaxConcurrency(maxConcurrency, type) {
  // deliberably not constructing prefname from type, to allow global search for pref name.
  let prefname;
  if (type == "server") {
    prefname = "max_concurrency_server";
  } else if (type == "measured") {
    prefname = "max_concurrency_measured";
  } else { // input check
    throw new Exception("Unknown type " + type);
  }

  await browser.incomingServer.setNumberValue(this.serverID, prefname, maxConcurrency);

  this.connectionsLimit = undefined; // clear and re-calculate
  this.MaxConcurrency();
}

/**
 * Perform one-time per-login tasks.
 */
async StartupAfterLogin()
{
  // First, ensure that all of the folder counts are up-to-date.
  await this.CheckFolders(true);
  // Download the contacts in the background.
  noAwait(this.ResyncAddressBooks(), logError); // contacts.js
}

/**
 * Update the local tree with the latest folder counts.
 *
 * @param aForLogin {Boolean} Whether this is the initial update for login
 */
async CheckFolders(aForLogin)
{
  if (aForLogin) {
    // Record the time so we don't check the folders twice on first login.
    this.lastLogin = Date.now();
  } else if (Date.now() - this.lastLogin < OWAAccount.kMinCheckAfterLogin) {
    // This is a first login duplicated check, ignore it.
    return;
  }

  let folderTree = await this.FindFolders(); // emails.js
  await browser.incomingServer.sendFolderTree(this.serverID, folderTree);
}

} // class OWAAccount

// Constants

OWAAccount.kMinCheckAfterLogin = 10 * 1000; // 10 seconds
/**
* The maximum number of messages to fetch in a single call to GetMessages.
* This is just the default and can be overridden by the server error message.
* Common limit seems to be 20.
*/
OWAAccount.kMaxParallelFetches = 20;
/**
* When measuring, consider anything less than this to be an error of another sort.
*/
OWAAccount.kMinParallelFetches = 5;


/**
 * Factory function
 * @returns {OwlAccount} new account object for a configured account
 */
async function getAccountObject(aServerId) {
  let subtype = await browser.incomingServer.getStringValue(aServerId, "subtype");
  if (!subtype) {
    let account = await new OWAAccount(aServerId);
    let exchangeVersion = await account.CheckLoginPage();
    subtype = "owa";
    if (exchangeVersion == 2010) {
      account = await new OWA2010Account(aServerId);
      subtype = "owa2010";
    }
    await browser.incomingServer.setStringValue(aServerId, "subtype", subtype)
    return account;
  }

  switch (subtype) {
  case "owa2010":
    return await new OWA2010Account(aServerId);
  case "owa":
    return await new OWAAccount(aServerId);
  case "ews":
    // TODO merge dispatchers
    throw new Error("Wrong code place for EWS subtype");
  default:
    throw new Error("Account subtype " + subtype + " unknown");
  }
}

/**
 * Dispatches a request from the backend.
 *
 * @param aServerId   {String} The account's server key
 * @param aOperation  {String} The requested operation
 * @param aParmaeters {Object} Operation-specific parameters
 * @returns           {Any?}   Operation-dependent return value
 */
OWAAccount.DispatchOperation = async function(aServerId, aOperation, aParameters, aMsgWindow) {
  switch (aOperation) {
  case "GetString":
    return GetString(aParameters.bundleName, aParameters.id); // owl.js
  case "GetExtensionURL":
    return GetExtensionURL(); // owl.js
  case "ClearAllValues":
    gOWAAccounts.delete(aServerId);
    return;
  case "VerifyLogin":
    let tempAccount = await getAccountObject(aServerId);
    return tempAccount.VerifyLogin(); // auth.js
  }

  var account = gOWAAccounts.get(aServerId);
  if (!account) {
    account = await getAccountObject(aServerId);
    gOWAAccounts.set(aServerId, account);
  }

  return account.EnsureLoggedIn(aMsgWindow, async () => { // auth.js
    await EnsureLicensed(aServerId); // license.js
    return account.ProcessOperation(aOperation, aParameters, aMsgWindow); // emails.js
    throw new Error("Not Implemented");
  });
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
    return await OWAAccount.DispatchOperation(aServerId, aOperation, aParameters, aMsgWindow);
  } catch (ex) {
    // serialise the exception properties, because only .message and .stack survive the boundary,
    // but we need all the Error properties, like code/type, parameters etc..
    // CallExtension() on the other side will de-serialise it again and reconstruct the object.
    throw serialiseError(ex); // owl.js
  }
}, "owl");

browser.webAccount.setSchemeOptions("owl", {
  authMethods: [3, 20, 10],
  sentFolder: "SentMail",
});