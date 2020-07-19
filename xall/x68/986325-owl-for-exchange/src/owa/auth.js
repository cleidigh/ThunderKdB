const kPassword = 3;
const kLaxPassword = 20;
const kOAuth2 = 10; // from MailNewsTypes2.idl
const kVersionLogURL = "https://www.beonex.com/log/exchange?version=";
const kHotmailServer = "outlook.live.com";

/**
 * Look up the CANARY cookie for the server,
 * which is a prerequisite for most OWA calls.
 */
OWAAccount.prototype.getCanary = async function() {
  let cookies = await browser.cookies.getAll({ domain: this.serverURL.hostname, secure: true, name: this.cookieName });
  cookies = cookies.filter(cookie => this.serverURL.pathname.startsWith(cookie.path));
  return cookies.length ? cookies[0].value : null;
}

/**
 * Delete all cookies for a given server.
 */
OWAAccount.prototype.ClearCookies = async function() {
  let cookies = await browser.cookies.getAll({ domain: this.serverURL.hostname, secure: true });
  return Promise.all(cookies.map(cookie => browser.cookies.remove({ name: cookie.name, url: this.serverURL.origin + "/" + cookie.path })));
}

/**
 * Check that cookies are enabled.
 */
OWAAccount.prototype.CheckCookiePreferences = async function() {
  // cookieBehaviour is 0 for accept all cookies (including third party)
  // lifetimePolicy is 0 for accept until they expire (not session only)
  let cookieBehaviour = await browser.globalPrefs.getNumberValue("network.cookie.cookieBehavior");
  let lifetimePolicy = await browser.globalPrefs.getNumberValue("network.cookie.lifetimePolicy");
  if (cookieBehaviour != 0 || lifetimePolicy != 0) {
    throw new OwlError("cookie-preferences");
  }
  // Also check whether cookies have been blocked for this server.
  let value = Math.random().toFixed(18);
  await browser.cookies.set({ url: this.serverURL.href, secure: true, name: "X-OWL-TEST", value: value });
  let cookies = await browser.cookies.getAll({ domain: this.serverURL.hostname, secure: true, name: "X-OWL-TEST" });
  if (!cookies.some(cookie => cookie.path == this.serverURL.pathname && cookie.value == value)) {
    throw new OwlError("cookie-preferences");
  }
  await browser.cookies.remove({ url: this.serverURL.href, name: "X-OWL-TEST" });
}

/**
 * Attempt a login, but does not perform post-login tasks.
 *
 * @returns          {Object}  An object providing the status of the operation
 *   If success, returns an empty object with no properties.
 *   If error, returns an object with:
 *   message         {String}  The text of any exception
 *   code            {String?} An internal error identifier
 *
 * - "duplicate-server"
 *   This means that an OWL account already exists with that server.
 * - "cookies-disabled"
 *   This means that cookies are not enabled or are blocked for that server.
 * - "password-wrong"
 *   This means that the login form was found
 *   but submitting it failed to set the X-OWA-CANARY cookie.
 * - "password-form-not-detected"
 *   This means that password authentication was configured
 *   but the login form detection failed.
 * - "server-refused"
 *   The server complained, e.g. our request was missing parameters.
 * - "server-fail"
 *   5xx error, i.e. server broken, not our fault
 * - "network-fail"
 *   We could not reach the server, e.g. network down, host not found etc.
 * - "auth-browser-closed"
 *   The user closed the login window or tab during OAuth2 authentication
 * - "auth-method-failed"
 *   There was an exception
 * - "auth-method-unknown"
 *   This means that the authentication method was not recognised.
 */
OWAAccount.prototype.VerifyLogin = async function() {
  try {
    await this.CheckCookiePreferences();
    let hostname = await browser.incomingServer.getHostName(this.serverID);
    let servers = await browser.incomingServer.getServersOfTypes(["owl"]);
    for (let otherServerID of servers) {
      if (otherServerID != this.serverID) {
        if (hostname == await browser.incomingServer.getHostName(otherServerID)) {
          throw new OwlError("duplicate-hostname");
        }
      }
    }
    await this.CheckLoginPage();
    await this.ClearCookies();
    switch (await browser.incomingServer.getNumberValue(this.serverID, "authMethod")) {
    case kPassword:
      await this.LoginWithPassword(null);
      break;
    case kLaxPassword:
      await this.LaxLoginWithPassword(null);
      break;
    case kOAuth2:
      await this.LoginWithOAuthInPopup();
      break;
    default:
      throw new OwlError("auth-method-unknown");
    }
    await this.ClearCookies();

    let error = new Error("VerifyLogin succeded for logging purposes");
    error.code = "auth-method-succeeded";
    await logErrorToServer(error);
    return {};
  } catch (ex) {
    console.error(ex);
    // await, so that errorLog has the username before the temp accounts gets deleted.
    await logErrorToServer(ex);
    return { message: ex.message, code: ex.code || "auth-method-failed" };
  }
}

/**
 * Checks whether the specified Exchange version is supported or not.
 *
 * An attempt to detect the version is made by looking at the login page
 * favicon. If the version is not supported, an ExchangeVersionEror is thrown.
 */
OWAAccount.prototype.CheckLoginPage = async function() {
  let response = await this.TaggedFetch(this.serverURL);
  if (!response.ok) {
    if (response.status == 404 ||
        response.status >= 500 && response.status < 600) {
      // This site doesn't seem to be working.
      throw new OWAError(response);
    }
    // Let the user see this error in the OAuth browser.
    return;
  }
  if (new URL(response.url).origin != this.serverURL.origin) {
    return; // Need login page from original server for version detection
  }
  let text = await response.text();
  let dom = new DOMParser().parseFromString(text, "text/html");
  for (let link of dom.getElementsByTagName("link")) {
    if (link.rel && link.href &&
         (link.relList.contains("icon") || link.relList.contains("stylesheet"))) {
      let href = link.href.toLowerCase();
      // 2016: <link rel="shortcut icon" href="/owa/auth/15.1.1713/themes/resources/favicon.ico">
      // 2013: <link rel="shortcut icon" href="/owa/auth/15.0.1395/themes/resources/favicon.ico">
      // 2007: <link rel="stylesheet" href="/owa/8.1.240.5/themes/base/logon.css">
      if (href.includes("/owa/") &&
          (href.endsWith("/themes/resources/favicon.ico") ||
           href.endsWith("/themes/base/logon.css"))) {
        let dirs = href.split("/");
        let versionStr = dirs[dirs.length - 4];
        console.log("Exchange server version " + versionStr);
        fetch(kVersionLogURL + versionStr);
        let versionNumbers = versionStr.split(".");
        let majorVersion = parseInt(versionNumbers[0]);
        let minorVersion = parseInt(versionNumbers[1]);
        if (isNaN(majorVersion) || isNaN(minorVersion)) {
          continue;
        }
        switch (majorVersion) {
        case 16: // future
          return 2019;
        case 15:
          switch (minorVersion) {
          case 0:
            return 2013;
          case 1:
            return 2016;
          case 2:
            return 2019;
          default: // future
            return 2019;
          }
        case 14:
          if (minorVersion == 0) {
            throw new ExchangeVersionError(2010);
          }
          return 2010;
        case 8:
          throw new ExchangeVersionError(2007);
        case 6:
          throw new ExchangeVersionError(2003);
        default:
          throw new ExchangeVersionError(majorVersion);
        }
      }
    }
  }
  return 2013; // assume supported and just try, unless we know otherwise
}

/**
 * Ensures that OWA is logged in before invoking the callback.
 *
 * @param aMsgWindow {Integer}  The indentifier used to prompt for a password
 * @param aCallback  {Function} The function to invoke once logged in
 *
 * If the call encounters a login expired error, the login is tried again,
 * and, if successful, the callback is called a second time.
 * Returns the callback's return value if either was successful.
 */
OWAAccount.prototype.EnsureLoggedIn = async function(aMsgWindow, aCallback) {
  // If we think we're logged in, this returns immediately
  await this.LoginLock(aMsgWindow);
  try {
    return await aCallback();
  } catch (ex) {
    // This could be an OwlError or a ParameterError, see owa.js and owl.js
    if (ex.code == "login-expired" || ex.type == "login-expired") {
      // If our local login data has been expired by the server, try a complete login.
      // If this fails, give up. Do *not* try 3 times here.
      await this.LoginLock(aMsgWindow);
      return await aCallback();
    }
    throw ex;
  }
}

/**
 * To avoid multiple UI requests triggering simultaneous logins,
 * each new login creates a PendingLogin object which is kept in a map.
 * Additional requests simply wait for the existing login to complete.
 * This is done before checking the canary as folder resync has to wait until
 * folder discovery has finished during which the canary is already available.
 *
 * Get or create the pending login for the given server.
 * This has the effect of queuing logins.
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @return {Promise} The pending login
 *
 * If a new pending login is created it is deleted when it finishes.
 */
OWAAccount.prototype.LoginLock = function(aMsgWindow)
{
  if (!this.pendingLogin) {
    this.pendingLogin = (async () => {
      try {
        await this.Login(aMsgWindow);
      } finally {
        this.pendingLogin = null;
      }
    })();
  }
  return this.pendingLogin;
}

/**
 * Try to log in to OWA. This should only run once per server.
 *
 * We do nothing if we appear to be already logged in,
 * but the check has to be here because it's asynchronous.
 *
 * Internal function. This is not queued. Call `LoginLock()` or `EnsureLoggedIn()` instead.
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @throws           {Error}   If the user could not be logged in
 */
OWAAccount.prototype.Login = async function(aMsgWindow) {
  // If we have a cookie, then we're logged in.
  if (await this.getCanary()) {
    if (!this.startedUp) {
      await this.StartupAfterLogin(aMsgWindow); // owa.js
      this.startedUp = true;
    }
    return;
  }
  let authMethod = await browser.incomingServer.getNumberValue(this.serverID, "authMethod");
  switch (authMethod) {
  case kPassword:
    await this.LoginWithPassword(aMsgWindow);
    break;
  case kLaxPassword:
    await this.LaxLoginWithPassword(aMsgWindow);
    break;
  case kOAuth2:
    await this.LoginWithOAuthInTab(aMsgWindow);
    break;
  default:
    try {
      await this.LoginWithPassword(aMsgWindow);
    } catch (ex) {
      switch (ex.code) {
      case "password-form-not-detected":
      case "server-refused":
        try {
          await this.LaxLoginWithPassword(aMsgWindow);
        } catch (ex) {
          switch (ex.code) {
          case "password-form-not-detected":
          case "server-refused":
            await this.LoginWithOAuthInTab(aMsgWindow);
            break;
          default:
            throw ex;
          }
        }
        break;
      default:
        throw ex;
      }
    }
    break;
  }
  await this.StartupAfterLogin(aMsgWindow); // owa.js
  this.startedUp = true;
}

/**
 * Performs password-based login with prompting for incorrect password.
 *
 * @param aMsgWindow {Integer?} The identifier used to prompt for a password
 * @throws           {Error}    If the login failed
 */
OWAAccount.prototype.LoginWithPassword = async function(aMsgWindow)
{
  let elements = await this.FindLoginElementsStrict();
  if (!elements) {
    throw new OwlError("password-form-not-detected");
  }
  let response;
  do {
    response = await this.SubmitLoginForm(elements, aMsgWindow);
    if (await this.CheckLoginFinished()) {
      return "";
    }
  } while (await browser.incomingServer.promptLoginFailed(this.serverID, aMsgWindow));
  let formURL = new URL(elements.url);
  let responseURL = new URL(response.url);
  if (responseURL.origin == formURL.origin && responseURL.pathname == formURL.pathname && responseURL.searchParams.get("reason") == "2") {
    throw new OwlError("password-wrong");
  } else {
    throw new OwlError("auth-method-failed");
  }
}

/**
 * Tries to determine whether this is a standard OWA login page.
 *
 * @returns         {Object?} The DOM elements that make up the standard form
 *   url            {String}           The URL of the page containing the form
 *   form           {HTMLFormElement}  The login form DOM element
 *   username       {HTMLInputElement} The form's username field
 *   password       {HTMLInputElement} The form's password field
 */
OWAAccount.prototype.FindLoginElementsStrict = async function() {
  let response = await this.TaggedFetch(this.serverURL);
  if (!response.ok) {
    return null;
  }
  let url = response.url;
  let text = await response.text();
  let dom = new DOMParser().parseFromString(text, "text/html");
  let elements = null;
  for (let form of dom.forms) {
    // Check to see if the action is in a form we expect.
    // If not, this form is probably protected by a captcha.
    if (!/^\//.test(form.getAttribute("action"))) {
      continue;
    }
    let username = null;
    let password = null;
    for (let element of form.elements) {
      // Ignore invisible fields e.g. "Show password".
      if (element.style.display == "none") {
        continue;
      }
      // Ensure that the form has exactly 1 username field.
      if (element.type == "text" || element.type == "email") {
        if (username) {
          username = null;
          break;
        }
        username = element;
      }
      // Ensure that the form has exactly 1 password field.
      if (element.type == "password") {
        if (password) {
          password = null;
          break;
        }
        password = element;
      }
    }
    if (username && password) {
      // Ensure that there is exactly one form with a username and password.
      if (elements) {
        return null;
      }
      elements = { url, form, username, password };
    }
  }
  return elements;
}

/**
 * Performs lax password-based login with prompting for incorrect password.
 *
 * @param aMsgWindow {Integer?} The identifier used to prompt for a password
 * @throws           {Error}    If the login failed
 */
OWAAccount.prototype.LaxLoginWithPassword = async function(aMsgWindow) {
  let elements = await this.FindLoginElementsLax();
  if (!elements) {
    throw new OwlError("password-form-not-detected");
  }
  do {
    await this.SubmitLoginForm(elements, aMsgWindow);
    if (await this.CheckLoginFinished()) {
      return "";
    }
  } while (await browser.incomingServer.promptLoginFailed(this.serverID, aMsgWindow));
  throw new OwlError("auth-method-failed");
}

/**
 * Tries to guess whether this is any sort of login page at all.
 *
 * @returns         {Object?} The DOM elements that make up the login form
 *   url            {String}           The URL of the page containing the form
 *   form           {HTMLFormElement}  The login form DOM element
 *   username       {HTMLInputElement} The form's username field
 *   password       {HTMLInputElement} The form's password field
 */
OWAAccount.prototype.FindLoginElementsLax = async function() {
  let response = await this.TaggedFetch(this.serverURL);
  if (!response.ok) {
    return null;
  }
  let url = response.url;
  let text = await response.text();
  let dom = new DOMParser().parseFromString(text, "text/html");
  for (let form of dom.forms) {
    // If this form doesn't have an ection, it's probably not a login form.
    if (!form.getAttribute("action")) {
      continue;
    }
    let username = null;
    for (let element of form.elements) {
      // Ignore invisible fields e.g. "Show password".
      if (element.style.display == "none") {
        continue;
      }
      // Ensure that the form has a username field.
      if (element.type == "text" || element.type == "email") {
        username = element;
      }
      // Ensure that the form has a password field.
      if (element.type == "password" && username) {
        return { url: url, form: form, username: username, password: element };
      }
    }
  }
  return null;
}

/**
 * Tries to fill in and submit a standard OWA login form.
 *
 * @param aElements  {Object}  The standard OWA login form
 *   url             {String}           The URL of the page containing the form
 *   form            {HTMLFormElement}  The login form DOM element
 *   username        {HTMLInputElement} The form's username field
 *   password        {HTMLInputElement} The form's password field
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @throws           {Error}   If there was a network or server error
 */
OWAAccount.prototype.SubmitLoginForm = async function(aElements, aMsgWindow) {
  aElements.username.value = await browser.incomingServer.getUsername(this.serverID);
  aElements.password.value = await browser.incomingServer.getPassword(this.serverID, aMsgWindow);
  // Try to use the light version to reduce bandwidth
  if (aElements.form.elements.flags) {
    aElements.form.elements.flags.value |= 1;
  }
  // Try to enable the private computer option
  if (aMsgWindow && aElements.form.elements.trusted) {
    aElements.form.elements.trusted.checked = true;
  }
  let url = new URL(aElements.form.getAttribute("action"), aElements.url);
  if (this.cookieName == "cadata") {
    await browser.cookies.set({
      name: "PBack",
      path: "/",
      secure: true,
      url: url.toString(),
      value: "0",
    });
  }
  let body = new URLSearchParams(new FormData(aElements.form));
  let response = await this.TaggedFetch(url, {
    method: "POST",
    body: body,
    credentials: "include",
  });
  if (!response.ok) {
    if (response.status == 401) {
      throw new OwlError("password-wrong", response.statusText);
    }
    if (response.status >= 400 && response.status < 500) {
      throw new OwlError("server-refused", response.statusText);
    }
    if (response.status >= 500 && response.status < 600) {
      throw new OwlError("server-fail", response.statusText);
    }
    throw new Error(response.statusText + " (HTTP " + response.status + ")");
  }
  return response;
}

/**
 * Performs a fetch() but tags any exception with the code "network-fail".
 *
 * @param aUrl     {String}    The resource to be fetched
 * @param aOptions {FetchInit} Options for the fetch request
 * @throws         {TypeError} If there was a network error
 */
OWAAccount.prototype.TaggedFetch = async function(aUrl, aOptions) {
  try {
    return await fetch(aUrl, aOptions);
  } catch (ex) {
    logError(ex);
    ex.code = "network-fail";
    try {
      ex.message = gStringBundle.get("error.network-fail") +
        // Ignore useless MSG_FETCH_FAILED msg from Errors.msg, otherwise append
        (ex.message.startsWith("NetworkError ") ? "" : " (" + ex.message + ")");
    } catch (exTranslation) {
      logError(exTranslation);
    }
    throw ex;
  }
}

/**
 * Prompts the user to log in by opening a tab
 * with the provider login webpage.
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @throws           {Error}   If the login tab was closed
 */
OWAAccount.prototype.LoginWithOAuthInTab = async function(aMsgWindow) {
  try {
    await browser.uiTweaks.ensureCalendarTodayPaneViews();
  } catch (ex) {
    logError(ex);
  }
  // We want to skip the landing page for personal Microsoft accounts.
  let isHotmail = this.serverURL.hostname == kHotmailServer;
  let url = isHotmail ? this.serverURL + "?nlp=1" : this.serverURL.href;
  let hadPasswordError = false;
  let alreadyClosed = false;
  return new Promise(async (resolve, reject) => {
    var tab;
    async function open() {
      tab = await browser.tabs.create({ url });
      browser.cookies.onChanged.addListener(cookiesListener);
      browser.tabs.onRemoved.addListener(tabsListener);
      browser.webNavigation.onCompleted.addListener(loadListener);
    }
    async function close(closeTab) {
      if (alreadyClosed) {
        return;
      }
      alreadyClosed = true;
      browser.webNavigation.onCompleted.removeListener(loadListener);
      browser.tabs.onRemoved.removeListener(tabsListener);
      browser.cookies.onChanged.removeListener(cookiesListener);
      if (closeTab) {
        await browser.tabs.remove(tab.id);
      }
    }

    // Listen for the page to load.
    var loadListener = async details => {
      if (details.tabId == tab.id && details.frameId == 0) {
        // If the login didn't finish when the canary was set, but we're logged in now, then finish
        if (await this.CheckLoginFinished()) {
          await close(true);
          resolve();
          return;
        }

        // Try to fill in the login form automatically.
        let code = await this.autoFillLoginPage(aMsgWindow);
        let [ status ] = await browser.tabs.executeScript(tab.id, { code });
        if (status && status.passwordErrorMessage) {
          if (await browser.incomingServer.promptLoginFailed(this.serverID, aMsgWindow, status.passwordErrorMessage)) {
            code = await this.autoFillPassword(aMsgWindow);
            await browser.tabs.executeScript(tab.id, { code });
          } else {
            hadPasswordError = true;
          }
        }
      }
    };
    // Listen in case the tab is closed.
    var tabsListener = async tabId => {
      if (tabId == tab.id) {
        await close(false);
        reject(new ParameterError(hadPasswordError ? "password-wrong" : "auth-browser-closed"));
      }
    };

    var cookiesListener = async details => {
      // For Hotmail, check the path to the CANARY cookie.
      if (isHotmail &&
          details.cookie.domain == kHotmailServer &&
          details.cookie.name == this.cookieName &&
          details.cookie.path.startsWith("/owa/")) {
        // Hotmail also sets cookies for /owa/0/, /mail/0/, /calendar/0/ etc.,
        // but we can use only the /owa/0/ cookie.
        // We also need to use that URL for the service request.
        // This needs to happen before CheckLoginFinished().
        this.serverURL.pathname = details.cookie.path;
      }

      // If we receive the canary cookie, check whether we're logged in
      if (details.cookie.name == this.cookieName &&
          details.cookie.domain == this.serverURL.hostname) {
        if (await this.CheckLoginFinished()) {
          await close(true);
          resolve();
          return;
        }
      }
    };

    await open();
  });
}

/**
 * Prompts the user to log in by opening a browser request popup
 * with the provider login webpage.
 *
 * @throws          {Error}  If the login window was closed
 */
OWAAccount.prototype.LoginWithOAuthInPopup = async function() {
  // We want to skip the landing page for personal Microsoft accounts.
  let isHotmail = this.serverURL.hostname == kHotmailServer;
  let url = isHotmail ? this.serverURL + "?nlp=1" : this.serverURL.href;
  let alreadyClosed = false;
  return new Promise(async (resolve, reject) => {
    async function open() {
      browser.request.onCompleted.addListener(loadListener);
      browser.request.onClosed.addListener(requestListener);
      browser.cookies.onChanged.addListener(cookiesListener);
      await browser.request.open(url);
    }
    async function close(closeWindow) {
      if (alreadyClosed) {
        return;
      }
      alreadyClosed = true;
      browser.request.onCompleted.removeListener(loadListener);
      browser.request.onClosed.removeListener(requestListener);
      browser.cookies.onChanged.removeListener(cookiesListener);
      if (closeWindow) {
        await browser.request.close(url);
      }
    }

    // Listen for the page to load.
    var loadListener = async originalURL => {
      if (originalURL == url) {
        // If the login didn't finish when the canary was set, but we're logged in now, then finish
        if (await this.CheckLoginFinished()) {
          await close(true);
          resolve();
          return;
        }

        // Try to fill in the login form automatically.
        let code = await this.autoFillLoginPage(null);
        let [ status ] = await browser.request.executeScript(url, code);
        if (status && status.passwordErrorMessage) {
          await close(true);
          reject(new ParameterError("password-wrong", status.passwordErrorMessage, { setup: true }));
        }
      }
    };
    // Listen in case the window is closed.
    var requestListener = async (originalURL, currentURL, browsingHistory) => {
      if (originalURL == url) {
        await close(false);
        currentURL = stripLongQueryValues(currentURL);
        browsingHistory = browsingHistory.map(stripLongQueryValues);
        let cookies = await browser.cookies.getAll({ domain: this.serverURL.hostname, secure: true });
        cookies = cookies.map(cookie => cookie.name);
        reject(new ParameterError("auth-browser-closed", null, {
          setup: true, // VerifyLogin()
          originalURL,
          currentURL,
          browsingHistory,
          cookies,
        }));
      }
    };
    var cookiesListener = async details => {
      // For Hotmail, check the path to the CANARY cookie.
      if (isHotmail &&
        details.cookie.domain == kHotmailServer &&
        details.cookie.name == this.cookieName &&
        details.cookie.path.startsWith("/owa/")) {
        // Hotmail also sets cookies for /owa/0/, /mail/0/, /calendar/0/ etc.,
        // but we can use only the /owa/0/ cookie.
        // We also need to use that URL for the service request.
        // This needs to happen before CheckLoginFinished().
        this.serverURL.pathname = details.cookie.path;
      }

      // If we receive the canary cookie, check whether we're logged in
      if (details.cookie.name == this.cookieName &&
          details.cookie.domain == this.serverURL.hostname) {
        if (await this.CheckLoginFinished()) {
          await close(true);
          resolve();
          return;
        }
      }
    };

    await open();
  });
}

/**
 * If we have the CANARY cookie, then access the session data.
 * This is one of the calls OWA performs as it logs in.
 *
 * @returns {Boolean} Whether the session data could be accessed.
 */
OWAAccount.prototype.CheckLoginFinished = async function() {
  try {
    if (!await this.getCanary()) {
      return false;
    }

    let url = this.serverURL + "sessiondata.ashx";
    let response = await fetch(url, {
      method: "POST",
      credentials: "include",
    });
    await this.CheckJSONResponse(response, url); // owa.js
    return true;
  } catch (ex) {
    logError(ex);
    return false;
  }
}

/**
 * Generates code to automatically fill the login page in the tab or popup
 *
 * @returns {String} The context script to be executed
 */
OWAAccount.prototype.autoFillLoginPage = async function(aMsgWindow) {
  let username = JSON.stringify(await browser.incomingServer.getUsername(this.serverID));
  let password = JSON.stringify(await browser.incomingServer.getPassword(this.serverID, aMsgWindow));
  return `
    let observer = new MutationObserver(function(mutations) {
      // Check whether script manipulated the user/password form.
      for (let record of mutations) {
        for (let node of record.addedNodes) {
          if (node instanceof HTMLInputElement) {
            observer.disconnect();
            // Wait for mutations to finish before rechecking for widgets.
            setTimeout(checkForWidgets, 100);
            return;
          }
        }
      }
    });

    function waitForInput() {
      observer.observe(document.body, { subtree: true, childList: true });
    }

    function checkForWidgets() {
      let inputs = [...document.querySelectorAll("input")];
      let user = inputs.filter(input => input.type == "text" || input.type == "email");
      let pass = inputs.filter(input => input.type == "password");
      let submit = inputs.filter(input => input.type == "submit");
      let button = inputs.filter(input => input.type == "button");

      switch (sessionStorage.getItem("OwlAutoLoginStep")) {
      // New login attempt, no step saved yet.
      case null:
        // Maybe we're trying to sign in to a personal account.
        for (let link of document.links) {
          if (link.dataset.m) {
            try {
              if (JSON.parse(link.dataset.m).cN == "SIGNIN") {
                sessionStorage.setItem("OwlAutoLoginStep", "OtherUser");
                link.click();
                return;
              }
            } catch (ex) {
              console.error(ex);
            }
          }
        }
        // No sign in link? Fall through to try the "Other User" element.

      case "OtherUser":
        let otherTile = document.getElementById("otherTile");
        if (otherTile) {
          sessionStorage.setItem("OwlAutoLoginStep", "Username");
          otherTile.click();
          // This click doesn't load a new page. Instead,
          // the form to input the user name is created by script.
          waitForInput();
          return;
        }
        // No "Other User" element? Fall through to try the username.

      case "Username":
        if (user.length == 1 && pass.length == 1 && submit.length == 1 &&
            document.activeElement == user[0]) {
          // The page is prompting us for the email address.
          sessionStorage.setItem("OwlAutoLoginStep", "Password");
          user[0].value = ${username};
          user[0].dispatchEvent(new Event("change"));
          pass[0].value = ${password};
          pass[0].dispatchEvent(new Event("change"));
          submit[0].focus();
          submit[0].click();
          // This click doesn't load a new page. Instead,
          // the form to input the password is manipulated by script.
          waitForInput();
          return;
        }

      // Try the password
      case "Password":
        if (user.length == 1 && pass.length == 1 && submit.length == 1 &&
            document.activeElement == pass[0]) {
          // The page is prompting us for the password.
          sessionStorage.setItem("OwlAutoLoginStep", "CheckPassword");
          // Hotmail: "[x] Keep me signed in"
          let keep = inputs.filter(input => input.type == "checkbox");
          if (keep.length == 1 && keep[0].name == "KMSI" && !keep[0].checked) {
            keep[0].click();
          }
          pass[0].value = ${password};
          pass[0].dispatchEvent(new Event("change"));
          submit[0].focus();
          submit[0].click();
          return;
        }

      case "CheckPassword":
        let passwordError = document.getElementById("passwordError");
        let passwordErrorMessage = passwordError && passwordError.textContent.trim();
        if (passwordErrorMessage) {
          sessionStorage.setItem("OwlAutoLoginStep", "PasswordError");
          return { passwordErrorMessage };
        } else {
          sessionStorage.setItem("OwlAutoLoginStep", "StaySignedIn");
        }

      // Try the "Stay signed in" prompt
      case "StaySignedIn":
        if (user.length == 0 && pass.length == 0 && submit.length == 1 &&
            button.length == 1 && button[0].value) {
          // The page is prompting us to stay logged in.
          sessionStorage.setItem("OwlAutoLoginStep", "Complete");
          // submit = yes, button = no
          submit[0].focus();
          submit[0].click();
          return;
        }
        break;

      case "PasswordError":
        return; // Mute. Let user handle it.

      case "Complete":
        break; // nothing to do here
      }
    };

    checkForWidgets();
  `;
}

/**
 * Generates code to automatically fill the password in the tab
 *
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @returns          {String}  The content script to be executed
 */
OWAAccount.prototype.autoFillPassword = async function(aMsgWindow) {
  let password = JSON.stringify(await browser.incomingServer.getPassword(this.serverID, aMsgWindow));
  return `
    function retryPassword() {
      let inputs = [...document.querySelectorAll("input")];
      let user = inputs.filter(input => input.type == "text" || input.type == "email");
      let pass = inputs.filter(input => input.type == "password");
      let submit = inputs.filter(input => input.type == "submit");
      if (user.length == 1 && pass.length == 1 && submit.length == 1 &&
          document.activeElement == pass[0]) {
        sessionStorage.setItem("OwlAutoLoginStep", "CheckPassword");
        // Hotmail: "[x] Keep me signed in"
        let keep = inputs.filter(input => input.type == "checkbox");
        if (keep.length == 1 && keep[0].name == "KMSI" && !keep[0].checked) {
          keep[0].click();
        }
        pass[0].value = ${password};
        pass[0].dispatchEvent(new Event("change"));
        submit[0].focus();
        submit[0].click();
      }
    }

    retryPassword();
  `;
}
