const kAuthClientId = "da09cb10-3857-48ae-bcd3-b9fa82b1721b";
const kAuthScope = "offline_access EWS.AccessAsUser.All";
const kAuthDone = "https://login.microsoftonline.com/common/oauth2/nativeclient";
// There are common versions of these pages, but the access tokens don't work.
const kAuthPage = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize";
const kTokenURL = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token";
const kLogoutURL = "https://login.microsoftonline.com/organizations/oauth2/logout";


///////////////////////////
// OAuth2 class

class OAuth2Login {
  /**
   * @param account {OwlAccount}
   */
  constructor(aAccount) {
    this.serverID = aAccount.serverID;
    this.username = aAccount.username;
    this._accessToken = null;
    this._promiseAccessToken = null;
  }

  ///////////////////////////
  // Public API

  /**
   * Returns an OAuth2 access token.
   *
   * If one is stored in memory, return that.
   * Otherwise, get one from the server.
   * If necessary, this may open an interactive login in a tab,
   * and wait for the user to log in.
   *
   * Attention: This function can be very fast (from RAM) or very slow
   * (interactive, i.e. minutes). Please code accordingly.
   *
   * This function makes sure that there's only one active login at a time.
   *
   * If you (the caller) find that the accessToken does not work,
   * you must call clearAccessToken().
   * After that, you can call this function again to get a fresh token.
   *
   * @param aMsgWindow {Integer} The identifier used to prompt for a password
   * @returns           {String} The access token, if successful
   * @throws    {ParameterError} If the authorisation failed or was cancelled
   */
  async getAccessToken(aMsgWindow) {
    if (this._accessToken) {
      return this._accessToken;
    }

    if (!this._promiseAccessToken) {
      this._promiseAccessToken = (async () => {
        try {
          this._accessToken = await this.getNewAccessToken(aMsgWindow);
          return this._accessToken;
        } finally {
          this._promiseAccessToken = null;
        }
      })();
    }
    return this._promiseAccessToken;
  }

  clearAccessToken() {
    this._accessToken = null;
  }

  /**
   * Logs out of Microsoft Online, so you can get an authorisation code
   * for a different Office 365 account.
   */
  async logout() {
    await TaggedFetch(kLogoutURL, {
      credentials: "include",
    });
  }

  ///////////////////////////////
  // OAuth2 implementation

  /**
   * Tries to obtain an OAuth access token.
   *
   * @param aMsgWindow {Integer} The identifier used to prompt for a password
   * @returns           {String} The access token, if successful
   * @throws    {ParameterError} If the authorisation failed or was cancelled
   *
   * If a refresh token exists, it is used to acquire the access token.
   * Otherwise the access token is acquired using an authorisation code.
   */
  async getNewAccessToken(aMsgWindow) {
    let accessToken = null;
    let refreshToken = await this.getRefreshTokenFromStorage();
    if (refreshToken) {
      try {
        ({ accessToken, refreshToken } = await this.getAccessTokenFromRefreshToken(refreshToken));
      } catch (ex) {
        // This refresh token is probably invalid, so clear it.
        this.deleteRefreshTokenFromStorage();
      }
    }
    if (!accessToken) {
      let authCode = await this.loginWithOAuthInTab(aMsgWindow);
      ({ accessToken, refreshToken } = await this.getAccessTokenFromAuthCode(authCode));
    }
    if (refreshToken) {
      this.storeRefreshToken(refreshToken);
    }
    return accessToken;
  }

  /**
   * Gets a new access token from the OAuth2 server,
   * using a refresh token.
   *
   * @param aRefreshToken {String}
   * @returns             {Object}
   *   accessToken        {String} OAuth2 access token
   *   refreshToken       {String} refreshed/new OAuth2 refresh token
   *
   * Both may be null, if the refresh token was not accepted
   */
  async getAccessTokenFromRefreshToken(aRefreshToken) {
    return await this._getAccessTokenFromParams({
      grant_type: "refresh_token",
      refresh_token: aRefreshToken,
    });
  }

  /**
   * After receiving an "authorization code" from the
   * interactive login, use this to get an OAuth2 access token
   * and refresh token.
   *
   * @param aAuthCode  {String} Authorization code
   *      This is the result of the HTML login sequence.
   * @returns {Object}
   *   accessToken     {String} OAuth2 access token
   *   refreshToken    {String} OAuth2 refresh token
   * @throws, if the authorization code was not accepted
   */
  async getAccessTokenFromAuthCode(aAuthCode) {
    return await this._getAccessTokenFromParams({
      grant_type: "authorization_code",
      code: aAuthCode,
      redirect_uri: kAuthDone,
    });
  }

  /**
   * Shared code to request an access token using a set of token parameters.
   */
  async _getAccessTokenFromParams(aParams) {
    aParams.client_id = kAuthClientId;
    aParams.scope = kAuthScope;
    let options = {
      method: "POST",
      body: new URLSearchParams(aParams),
    };
    let response = await TaggedFetch(kTokenURL, options);
    let data = await response.json();
    if (!data.access_token) {
      throw new OAuth2Error(data);
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  }

  /////////////////////
  // Store the OAuth refresh token for this account

  /**
   * @returns {String} refresh token
   *      or null (or empty string), if not found
   */
  async getRefreshTokenFromStorage() {
    return await browser.incomingServer.getStringValue(this.serverID, "refresh_token");
  }

  deleteRefreshTokenFromStorage() {
    this.storeRefreshToken("");
  }

  storeRefreshToken(refreshToken) {
    browser.incomingServer.setStringValue(this.serverID, "refresh_token", refreshToken);
  }

  /**
   * Attempts to obtain an OAuth authorisation code
   *
   * @returns {String}         The authorisation code, if successful
   * @throws  {ParameterError} If the authorisation failed or was cancelled
   *
   * This version opens a popup window, so it's suitable for VerifyLogin.
   */
  loginWithOAuthInPopup() {
    let state = Math.random().toString().slice(2);
    let url = this.getAuthURL(state);
    let browsingHistory = [];
    return OpenPopup({ url,
      onCommitted(currentURL) {
        browsingHistory.push(stripLongQueryValues(currentURL));
        let parameters = extractParameters(currentURL, state);
        if (parameters) {
          if (parameters.code) {
            return parameters.code;
          } else {
            throw new OAuth2Error(parameters);
          }
        }
      },
      onCompleted: async executeScript => {
        // Try to fill in the login form automatically.
        let code = await autoFillLoginPage(this.serverID, null);
        let [ status ] = await executeScript(code);
        if (status && status.passwordErrorMessage) {
          throw new ParameterError("password-wrong", status.passwordErrorMessage, { setup: true });
        }
      },
      onClosed() {
        throw new ParameterError("auth-browser-closed", null, {
          setup: true, // VerifyLogin()
          url,
          browsingHistory,
        });
      },
    });
  }

  /**
   * Attempts to obtain an OAuth authorisation code
   *
   * @param aMsgWindow {Integer} The identifier used to prompt for a password
   * @returns           {String} The authorisation code, if successful
   * @throws    {ParameterError} If the authorisation failed or was cancelled
   */
  loginWithOAuthInTab(aMsgWindow) {
    let state = Math.random().toString().slice(2);
    let url = this.getAuthURL(state);
    let hadPasswordError = false;
    return OpenMailBrowser({ url,
      onCommitted(currentURL) {
        let parameters = extractParameters(currentURL, state);
        if (parameters) {
          if (parameters.code) {
            return parameters.code;
          }
          throw new OAuth2Error(parameters);
        }
      },
      onCompleted: async executeScript => {
        // Try to fill in the login form automatically.
        let code = await autoFillLoginPage(this.serverID, aMsgWindow);
        let [ status ] = await executeScript(code);
        if (status && status.passwordErrorMessage) {
          if (await browser.incomingServer.promptLoginFailed(this.serverID, aMsgWindow, status.passwordErrorMessage)) {
            code = await autoFillPassword(this.serverID, aMsgWindow);
            await browser.tabs.executeScript(tabId, { code });
          } else {
            hadPasswordError = true;
          }
        }
      },
      onClosed() {
        throw new ParameterError(hadPasswordError ? "password-wrong" : "auth-browser-closed");
      },
    });
  }

  /**
   * Builds the URL for consent and 2FA authentication
   *
   * @param aState {String} A pseudorandom value for CSRF prevention
   * @returns      {String} The authentication page
   */
  getAuthURL(aState) {
    return kAuthPage + "?" + new URLSearchParams({
      client_id: kAuthClientId,
      response_type: "code",
      redirect_uri: kAuthDone,
      response_mode: "query",
      scope: kAuthScope,
      state: aState,
    });
  }
}


//////////////////////////////////////////////
// Generic API for browser windows

/**
 * COMPAT for TB 68
 * Opens a popup window.
 *
 * @param        {Object}
 *   url         {String}    The initial URL to load in the popup.
 *   onClosed    {Function?} A callback when the popup is closed.
 *   onCommitted {Function?} A callback when the popup's page location changes.
 *     @param currentURL {String}
 *   onCompleted {Function?} A callback when the popup's page loads.
 *     @param executeScript {Function}
 *   onCookie    {Function?} A callback when any cookie is set.
 *     @param details {Cookie}
 * @return {any} callback return value
 * @throws {Error} callback exception
 *
 * If any of the callbacks return a truthy value,
 * the popup is closed and that value is returned.
 * If any of the callbacks throw an exception,
 * the popup is closed and the exception is thrown.
 */
async function OpenPopup(params) {
  let info = await browser.runtime.getBrowserInfo();
  if (parseInt(info.version) < 78) {
    return OpenBrowserRequest(params);
  } else {
    return OpenMailBrowser(params, true);
  }
}

async function OpenBrowserRequest({url, onClosed, onCommitted, onCompleted, onCookie}) {
  return new Promise(async (resolve, reject) => {
    let alreadyCleanedUp = false;

    function cleanup(aClosed) {
      if (alreadyCleanedUp) {
        return;
      }
      alreadyCleanedUp = true;
      browser.request.onClosed.removeListener(onClosed);
      browser.request.onCommitted.removeListener(onCommitted);
      browser.request.onCompleted.removeListener(onCompleted);
      browser.cookies.onChanged.removeListener(onCookie);
      if (!aClosed) {
        browser.request.close(url);
      }
    }

    function safeListener(aListener, aClosed) {
      return async function(...args) {
        try {
          let result = aListener && await aListener(...args);
          if (result) {
            resolve(result);
            cleanup(aClosed);
          }
        } catch (ex) {
          reject(ex);
          cleanup(aClosed);
        }
      }
    }

    function wrapRequestListener(aListener) {
      return (aURL, ...args) => aURL == url && aListener(...args, code => browser.request.executeScript(url, code));
    }

    onClosed = wrapRequestListener(safeListener(onClosed, true));
    onCommitted = wrapRequestListener(safeListener(onCommitted));
    onCompleted = wrapRequestListener(safeListener(onCompleted));
    onCookie = safeListener(onCookie);
    browser.request.open(url);
    browser.request.onClosed.addListener(onClosed);
    browser.request.onCommitted.addListener(onCommitted);
    browser.request.onCompleted.addListener(onCompleted);
    browser.cookies.onChanged.addListener(onCookie);
  });
}
/* COMPAT for TB 68 */

/**
 * Opens a browser, usually in a tab, but can be in a window (TB 78 or later).
 *
 * @param        {Object}
 *   url         {String}    The initial URL to load in the tab.
 *   onClosed    {Function?} A callback when the tab is closed.
 *   onCommitted {Function?} A callback when the tab's page location changes.
 *     @param currentURL {String}
 *   onCompleted {Function?} A callback when the tab's page loads.
 *     @param executeScript {Function}
 *   onCookie    {Function?} A callback when any cookie is set.
 *     @param details {Cookie}
 * @param        {Boolean?}  Whether to open a popup window.
 * @return {any} callback return value
 * @throws {Error} callback exception
 *
 * If any of the callbacks return a truthy value,
 * the tab is closed and that value is returned.
 * If any of the callbacks throw an exception,
 * the tab is closed and the exception is thrown.
 */
async function OpenMailBrowser({url, onClosed, onCommitted, onCompleted, onCookie}, aIsWindow) {
  return new Promise(async (resolve, reject) => {
    let tab, window;
    let alreadyCleanedUp = false;

    function cleanup(aClosed) {
      if (alreadyCleanedUp) {
        return;
      }
      alreadyCleanedUp = true;
      if (aIsWindow) {
        browser.windows.onRemoved.removeListener(onClosed);
      } else {
        browser.tabs.onRemoved.removeListener(onClosed);
      }
      browser.webNavigation.onCommitted.removeListener(onCommitted);
      browser.webNavigation.onCompleted.removeListener(onCompleted);
      browser.cookies.onChanged.removeListener(onCookie);
      if (!aClosed) {
        if (aIsWindow) {
          browser.windows.remove(window.id);
        } else {
          browser.tabs.remove(tab.id);
        }
      }
    }

    function safeListener(aListener, aClosed) {
      return async function(...args) {
        try {
          let result = aListener && await aListener(...args);
          if (result) {
            resolve(result);
            cleanup(aClosed);
          }
        } catch (ex) {
          reject(ex);
          cleanup(aClosed);
        }
      }
    }

    function wrapWindowListener(aListener) {
      return windowId => windowId == window.id && aListener();
    }

    function wrapTabsListener(aListener) {
      return tabId => tabId == tab.id && aListener();
    }

    function wrapCommittedListener(aListener) {
      return details => details.tabId == tab.id && details.frameId == 0 && aListener(details.url);
    }

    function wrapCompletedListener(aListener) {
      return details => details.tabId == tab.id && details.frameId == 0 && aListener(code => browser.tabs.executeScript(tab.id, { code }));
    }
    onCommitted = wrapCommittedListener(safeListener(onCommitted));
    onCompleted = wrapCompletedListener(safeListener(onCompleted));
    onCookie = safeListener(onCookie);
    if (aIsWindow) {
      onClosed = wrapWindowListener(safeListener(onClosed, true));
      window = await browser.windows.create({ height: 600, width: 980, type: "popup", url });
      tab = window.tabs[0];
      browser.windows.onRemoved.addListener(onClosed);
    } else {
      try {
        await browser.uiTweaks.ensureCalendarTodayPaneViews();
      } catch (ex) {
        logError(ex);
      }
      onClosed = wrapTabsListener(safeListener(onClosed, true));
      tab = await browser.tabs.create({ url });
      browser.tabs.onRemoved.addListener(onClosed);
    }
    browser.webNavigation.onCommitted.addListener(onCommitted);
    browser.webNavigation.onCompleted.addListener(onCompleted);
    browser.cookies.onChanged.addListener(onCookie);
  });
}



///////////////////////////////////////
// Helper functions

class OAuth2Error extends ParameterError {
  constructor(aParameters) {
    // We only want the first line without the error code.
    let message = aParameters.error_description && aParameters.error_description.split(/[\r\n]/)[0].replace(/^\w+: /, "");
    super("auth-method-failed", message, aParameters);
  }
}

/**
 * Performs a fetch() but tags any exception with the code "network-fail".
 *
 * @param aUrl     {String}    The resource to be fetched
 * @param aOptions {FetchInit} Options for the fetch request
 * @throws         {TypeError} If there was a network error
 */
async function TaggedFetch(aUrl, aOptions) {
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
 * Extracts the parameters from the completion URL
 *
 * @param aURL   {String} The current URL which may not be a completion URL
 * @param aState {String} The CSRF state that validates the URL
 * @returns      {Object} The parameters encoded into the query string
 */
function extractParameters(aURL, aState) {
  let url = new URL(aURL);
  let parameters = Object.fromEntries(url.searchParams);
  url.hash = url.search = "";
  if (url.href == kAuthDone && parameters.state == aState) {
    return parameters;
  }
  return null;
}

/**
 * Generates code to automatically fill the login page in the tab or popup
 *
 * @param aServerId  {String}  The account's server key
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @returns          {String}  The content script to be executed
 */
async function autoFillLoginPage(aServerId, aMsgWindow) {
  let username = JSON.stringify(await browser.incomingServer.getUsername(aServerId));
  let password = JSON.stringify(await browser.incomingServer.getPassword(aServerId, aMsgWindow));
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
 * @param aServerId  {String}  The account's server key
 * @param aMsgWindow {Integer} The identifier used to prompt for a password
 * @returns          {String}  The content script to be executed
 */
async function autoFillPassword(aServerId, aMsgWindow) {
  let password = JSON.stringify(await browser.incomingServer.getPassword(aServerId, aMsgWindow));
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
