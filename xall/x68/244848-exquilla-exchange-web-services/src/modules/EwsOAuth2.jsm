/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2019 Beonex
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

const EXPORTED_SYMBOLS = ["OAuth2Login", "kOAuth2Password"];

var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);
Cu.importGlobalProperties(["fetch", "URL", "URLSearchParams"]);
ChromeUtils.defineModuleGetter(this, "Services",
                               "resource://gre/modules/Services.jsm");

// OAuth2 for Office365
const kExQuillaOAuthClientId = "7778c31f-71db-4645-9752-f536a326262f";
// offline_access: https://stackoverflow.com/questions/30637984/what-does-offline-access-in-oauth-mean
const kExQuillaOAuthScope = "offline_access EWS.AccessAsUser.All";
const kAuthDone = "https://login.microsoftonline.com/common/oauth2/nativeclient";
// There are common versions of these pages, but the access tokens don't work.
const kAuthPage = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize";
const kTokenURL = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token";
const kLogoutURL = "https://login.microsoftonline.com/organizations/oauth2/logout";
// Internal authentication type
const kOAuth2Password = 25;
// Known errors we get when attempting password grant
const kErrorMFARequired = 50076;
const kErrorConsentRequired = 65001;
const kErrorPasswordInvalid = 50126;

class OAuth2Error extends Error {
  /**
   * Construct an exception from an OAuth2 error response.
   *
   * @param aData {Object} The error object from the OAuth2 response.
   */
  constructor(aData) {
    let { error, error_codes, error_description, suberror } = aData;
    let message = "Unknown OAuth error";
    let type = "oauth2";
    if (error) {
      type = type + "-" + error;
    }
    if (suberror) {
      type = type + "-" + suberror;
    }
    if (error_description) {
      type = type + error_description.split(":")[0];
      message = error_description.split(/[\r\n]/)[0].replace(/^\w+: /, "");
    }
    super(message);
    this.name = "OAuth2Error";
    this.type = type;
    this.result = Cr.NS_ERROR_FAILURE;
    if (error_codes) {
      this.code = error_codes[0];
    }
  }
}

class OAuth2MFARequired extends OAuth2Error {}

class OAuth2ConsentRequired extends OAuth2Error {}

class OAuth2PasswordInvalid extends OAuth2Error {
  constructor(aData) {
    super(aData);
    // This error triggers a password retry in the EwsNativeMachine.
    this.type = "PasswordMissing";
  }
}

/**
 * Implements OAuth2 login.
 *
 * Call `getAccessToken()`.
 *
 * For now, Office365 only.
 */
class OAuth2Login {
  /**
   * @param account {EwsNativeMailbox}
   */
  constructor(account) {
    this.account = account; // only to get username, password and server URLs
    this._accessToken = ""; // cache, for getAccessToken() only
    this._promiseAccessToken = null; // for getAccessToken() only
  }

  ///////////////////////////
  // Public API

  /**
   * Returns an OAuth2 access token.
   *
   * If one is stored in memory, return that.
   * Otherwise, get one from the server.
   * If necessary, this may open an interactive login in a window,
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
   * @returns {string} accessToken
   *   (in a Promise), i.e. effectively an `async function`
   */
  getAccessToken() {
    if (this._accessToken) {
      return (async () => this._accessToken)(); // return _accessToken in a Promise
    }

    if (!this._promiseAccessToken) {
      this._promiseAccessToken = (async () => {
        try {
          this._accessToken = await this.getNewAccessToken();
          return this._accessToken;
        } finally {
          this._promiseAccessToken = null;
        }
      })();
    }
    return this._promiseAccessToken;
  }

  clearAccessToken() {
    this._accessToken = "";
  }

  /**
   * Logs out of Microsoft Online, so you can get an authorization_code
   * for a different Office 365 account.
   */
  async logout() {
    await fetch(kLogoutURL, {
      credentials: "include",
    });
  }

  /**
   * Find the best authentication method.
   * Tries various OAuth2 methods.
   * Detect whether MFA is enabled for this account.
   */
  async detectAuthMethod() {
    // See whether this is even an Office 365 URL.
    if (!this.account.ewsURL.startsWith("https://outlook.office365.com/")) {
      return Ci.nsMsgAuthMethod.passwordCleartext;
    }
    try {
      let accessToken = await this.getAccessTokenFromPassword();
      return kOAuth2Password;
    } catch (ex) {
      if (ex instanceof OAuth2ConsentRequired) {
        // End user needs to interactively approve our application once
        let authCode = await this.openLoginWindow();
        // no exception, so it worked, but double-check that non-interactive OAuth2 password login really works now
        await this.getAccessTokenFromPassword();
        // no exception, so it worked
        return kOAuth2Password;
      } else if (ex instanceof OAuth2MFARequired) {
        // End user needs to interactively login in every time
        let authCode = await this.openLoginWindow();
        // no exception, so it worked
        return Ci.nsMsgAuthMethod.OAuth2;
      } else {
        throw ex;
      }
    }
  }

  ///////////////////////////////
  // OAuth2 implementation

  /**
   * Ensures that an OAuth2 access token exists.
   *
   * Might use a refresh token or password login.
   * This is the entry point for OAuth2 login.
   *
   * In OAuth2, the access token is the short lived ticket used to
   * authenticate to the service, the refresh token is the long-lived
   * login ticket and the authorization code is a one-time code
   * obtained via a web page login that verifies the user's consent.
   *
   * Overall sequence is:
   * 1. Login webpage URL
   * 2. HTML login, user interactively enters username, password, 2FA
   * 3. At the end of the HTML login, we get an "authorization code".
   * 4. With this authorization code, go to OAuth2 server and get an refresh token
   * 5. With the refresh token, get an access token, from the OAuth 2 server.
   * 6. With the access token, authenticate to the actual service endpoint.
   *
   * We cache the access token in memory, and the refresh token in the
   * password storage.
   */
  async getNewAccessToken() {
    let refreshToken = this.getRefreshTokenFromStorage();
    let accessToken = null;
    if (refreshToken) {
      try {
        ({ accessToken, refreshToken } = await this.getAccessTokenFromRefreshToken(refreshToken));
      } catch (e) {
        // This refresh token is probably invalid, so clear it.
        this.deleteRefreshTokenFromStorage();
      }
    }
    if (!accessToken) {
      if (this.account.authMethod == kOAuth2Password) {
        try {
          ({ accessToken, refreshToken } = await this.getAccessTokenFromPassword());
        } catch (ex) {
          if (ex instanceof OAuth2ConsentRequired) {
            // End user needs to interactively approve again
            let authCode = await this.openLoginWindow();
            ({ accessToken, refreshToken } = await this.getAccessTokenFromPassword());
          } else {
            throw ex;
          }
        }
      } else {
        let authCode = await this.openLoginWindow();
        ({ accessToken, refreshToken } = await this.getAccessTokenFromAuthCode(authCode));
      }
      // if (!accessToken), then the above already threw
    }
    if (refreshToken) {
      this.storeRefreshToken(refreshToken);
    }
    return accessToken;
  }

  /**
   * Gets a new access token from the OAuth2 server,
   * using an refresh token.
   *
   * @returns {
   *   accessToken, {string} OAuth2 access token
   *   refreshToken, {string} refreshed/new OAuth2 refresh token
   * }
   * Both may be null, if the refresh token was not accepted
   */
  async getAccessTokenFromRefreshToken(refreshToken) {
    return this._getAccessTokenFromParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
  }

  /**
   * After receiving an "authorization code" from the
   * interactive login, use this to get an OAuth2 access token
   * and refresh token.
   *
   * @param {string} authorization code
   *      This is the result of the HTML login sequence.
   * @returns {
   *   accessToken, {string} OAuth2 access token
   *   refreshToken, {string} OAuth2 refresh token
   * }
   * @throws, if the authorization code was not accepted
   */
  async getAccessTokenFromAuthCode(authCode) {
    return this._getAccessTokenFromParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: kAuthDone,
    });
  }

  /**
   * If the user doesn't have MFA and they gave their consent,
   * we can get an access token using their password.
   */
  async getAccessTokenFromPassword() {
    if (!this.account.password &&
        !this.account.promptUsernameAndPassword()) {
      throw CE("Password prompt cancelled by user", Cr.NS_ERROR_ABORT);
    }
    return this._getAccessTokenFromParams({
      grant_type: "password",
      username: this.account.username,
      password: this.account.password,
    });
  }

  /**
   * Shared code to request an access token using a set of token parameters.
   */
  async _getAccessTokenFromParams(aParams) {
    aParams.client_id = kExQuillaOAuthClientId;
    aParams.scope = kExQuillaOAuthScope;
    let options = {
      method: "POST",
      body: new URLSearchParams(aParams),
    };
    let response = await fetch(kTokenURL, options);
    let data = await response.json();
    if (data.error_codes && data.error_codes.includes(kErrorMFARequired)) {
      throw new OAuth2MFARequired(data);
    }
    if (data.error_codes && data.error_codes.includes(kErrorConsentRequired)) {
      throw new OAuth2ConsentRequired(data); // End user has to approve this application once
    }
    if (data.error_codes && data.error_codes.includes(kErrorPasswordInvalid)) {
      throw new OAuth2PasswordInvalid(data);
    }
    if (!data.access_token) {
      throw new OAuth2Error(data);
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  }

  /////////////////////
  // Store the OAuth refresh token for this account
  // in the password manager.

  /**
   * @returns {string} refresh token
   *      or null, if not found
   */
  getRefreshTokenFromStorage() {
    let login = this._findLoginForRefreshToken();
    return login ? login.password : null;
  }

  deleteRefreshTokenFromStorage() {
    let login = this._findLoginForRefreshToken();
    if (login) {
      Services.logins.removeLogin(login);
    }
  }

  storeRefreshToken(refreshToken) {
    this.deleteRefreshTokenFromStorage();
    let login = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
    let loginURI = this._getLoginURI();
    login.init(loginURI, null, loginURI, this.account.username, refreshToken, "", "");
    Services.logins.addLogin(login);
  }

  /**
   * Internal helper function
   *
   * @returns {Login}  The entry in the password manager
   *      for this account.
   */
   _findLoginForRefreshToken() {
    let loginURI = this._getLoginURI();
    let foundLogins = Services.logins.findLogins(loginURI, null, loginURI);
    for (let login of foundLogins) {
      if (login.username == this.account.username) {
        return login;
      }
    }
    return null;
  }

  _getLoginURI() {
    // Here, we're storing the refresh token as `password`.
    // In `EwsNativeMailbox.password`, we also store the actual password,
    // so use a different URL here.
    return "oauth://" + newParsingURI(this.account.serverURI).host;
  }

  //////////////////////////////
  // HTML login window

  /**
   * Opens a browser window with the login HTML pages.
   * Lets the user log in interactively.
   * Prefills username and password, if possible.
   *
   * For now, Office365 only. There's no standard way of finding the
   * authorisation server for a given endpoint, so we have to hardcode it.
   *
   * @returns {string} authorization code that the OAuth2 server accepts
   * @throws Error message from the login server
   * @throws Error "Authentication window was closed too early"
   */
  async openLoginWindow() {
    // In case we're logged in with another user, log out,
    // so that we're not automatically logged in with that other user,
    // which would mean we'd get the wrong mail and mess everything up.
    // OAuth2 access tokens stay valid for that other user.
    await this.logout();

    let hostname = newParsingURI(this.account.serverURI).host;
    let username = this.account.username;
    let password = null;
    let triedPassword = false;
    try {
      password = this.account.password;
    } catch (e) {
      console.error(e);
    }
    let newPassword = null;
    let state = Math.random().toString().slice(2);
    let params = {
      client_id: kExQuillaOAuthClientId,
      response_type: "code",
      redirect_uri: kAuthDone,
      response_mode: "query",
      scope: kExQuillaOAuthScope,
      state: state,
      login_hint: username,
    };
    let startURL = kAuthPage + "?" + new URLSearchParams(params);

    let authCode = await openBrowserWindow({
      startURL,
      onPageChange : function(url, close) {
        let parameters = Object.fromEntries(url.searchParams);
        url.hash = url.search = "";
        // Wait for end page
        // The end page URL contains the login result as query string,
        // most importantly the authorization code, which we extracted
        // from the searchParams above.
        if (url.href == kAuthDone && parameters.state == state) {
          if (parameters.code) {
            if (newPassword && newPassword != password) {
              promptPasswordChanged(hostname, username, password, newPassword);
            }
            close(parameters.code);
          } else {
            throw new OAuth2Error(parameters);
          }
        }
      },
      onPageLoaded : function(window, close) {
        // Fill in password
        var document = window.document;
        function passwordPrefill() {
          let inputs = [...document.querySelectorAll("input")];
          let pass = inputs.filter(input => input.type == "password");
          let submit = inputs.filter(input => input.type == "submit");
          if (pass.length == 1 && submit.length == 1) {
            if (password && !triedPassword) {
              // We recognised the fields. Fill in and submit the form.
              pass[0].value = password;
              pass[0].dispatchEvent(new window.Event("change"));
              submit[0].focus();
              submit[0].click();
              triedPassword = true;
            } else {
              pass[0].addEventListener("change", () => {
                newPassword = pass[0].value;
              });
            }
          }
        }
        passwordPrefill();
        // The Microsoft OAuth login page creates the login form dynamically.
        // We have to give this a chance to happen before trying to submit it.
        let observer = new window.MutationObserver(function(mutations) {
          for (let record of mutations) {
            for (let node of record.addedNodes) {
              if (node instanceof window.HTMLInputElement) {
                // Some form fields were added. See if we recognise them.
                observer.disconnect();
                callLater(passwordPrefill, 100);
                return;
              }
            }
          }
        });
        observer.observe(document.body, { subtree: true, childList: true });
      },
    });
    return authCode;
  }
}

/**
  * Opens a browser window and allows to track it.
  *
  * This is a generic browser window and not limited to login.
  *
  * @param startURL {string} Which page to load into the window.
  * @param onPageChange {function(url {URL}, close {function(result)} )}
  *      Called when a new URL starts to load.
  *      You may throw from the listener, which will close the dialog and
  *      throw the same exception to the caller of `openBrowserWindow()`.
  *      You may call `close(result)` to finish normally, see below.
  * @param onPageLoaded {function(window {DOMWindow}, close {function(result)} )}
  *      Called when a new URL finished to load.
  *      Ditto as above.
  *
  * `close {function(result)}` Call this when you want to close the browser window.
  *      @param result {any} This will be returned as result to the caller of `openBrowserWindow()`.
  *
  * @returns {any} what you passed to `close(result)`.
  *     Wrapped in a `Promise`, i.e. this is an `async function`.
  *
  * @throws Error "Authentication window was closed too early"
  *     Thrown, if the window was closed by the user.
  *     Will not be thrown, if `close()` was called by your code.
  */
function openBrowserWindow(options) {
  let { startURL, onPageChange, onPageLoaded, onClosedByUser } = options;
  return new Promise((resolve, reject) => {
    function closeCallback(result) {
      browserWindow.close();
      resolve(result);
    }
    let browserWindow = Services.ww.openWindow(Services.ww.activeWindow, "chrome://exquilla/content/moreinfo.xhtml", "", "centerscreen,chrome,location,width=980,height=750", null);
    browserWindow.addEventListener("load", e => {
      let notificationbox = new browserWindow.MozElements.NotificationBox(element => {
        browserWindow.document.documentElement.insertBefore(element, browserWindow.document.getElementById("maincontent"));
      });
      let browser = browserWindow.document.getElementById("maincontent");
      let label = new URL(startURL);
      label.hash = label.search = "";
      let notification = notificationbox.appendNotification(label, "", "chrome://exquilla/skin/letter-x-icon-16.png", notificationbox.PRIORITY_INFO_LOW);
      // Not sure why triggeringPrincipal isn't being picked up automatically
      browser.loadURI(startURL, { triggeringPrincipal: browser.nodePrincipal });
      // This is a property of the window because we don't want it to be
      // garbage collected until the window closes.
      browserWindow.progressListener = {
        onLocationChange(progress, request, location, flags) {
          if (!progress.isTopLevel) {
            return;
          }
          let label = new URL(location.spec);
          label.hash = label.search = "";
          notification.label = label;
          try {
            onPageChange(new URL(location.spec), closeCallback);
          } catch (ex) {
            browserWindow.close();
            reject(ex);
          }
        },
        onStateChange(aWebProgress, aRequest, aFlag, aStatus) {
          if (aWebProgress && aWebProgress.isTopLevel && aFlag & Ci.nsIWebProgressListener.STATE_STOP) {
            let window = browserWindow.content;
            try {
              onPageLoaded(window, closeCallback);
            } catch (ex) {
              browserWindow.close();
              reject(ex);
            }
          }
        },
        QueryInterface: ChromeUtils.generateQI([Ci.nsIWebProgressListener, Ci.nsISupportsWeakReference]),
      };
      browser.addProgressListener(browserWindow.progressListener, Ci.nsIWebProgress.NOTIFY_LOCATION | Ci.nsIWebProgress.NOTIFY_STATE_NETWORK);
    });
    browserWindow.addEventListener("close", e => {
      // HACK message should be specific, but not be here
      reject(CE("Authentication window was closed too early", Cr.NS_ERROR_ABORT));
    });
  });
}

/**
 * Prompts the user to save or update a password.
 *
 * @param aHostname    {String} The hostname of the account
 * @param aUsername    {String} The account's username
 * @param aHadOldPassword {Boolean} We already had a password for this account
 * @param aNewPassword {String} The password to be saved
 */
function promptPasswordChanged(aHostname, aUsername, aHadOldPassword, aNewPassword) {
  let bundle = Services.strings.createBundle("chrome://passwordmgr/locale/passwordmgr.properties");
  let message = bundle.formatStringFromName(aHadOldPassword ? "updatePasswordMsg" : "rememberPasswordMsg", [aUsername, aHostname], 2);
  let title = bundle.GetStringFromName(aHadOldPassword ? "passwordChangeTitle" : "savePasswordTitle");
  if (Services.prompt.confirmEx(Services.ww.activeWindow, title, message, Ci.nsIPrompt.STD_YES_NO_BUTTONS, null, null, null, null, {}) != 0) {
    return;
  }

  // search for existing logins, and remove them if found
  let loginURI = "https://" + aHostname;
  let logins = Services.logins.findLogins(loginURI, "", loginURI);
  for (let login of logins) {
    if (login.username == aUsername) {
      Services.logins.removeLogin(login);
    }
  }

  let login = Cc["@mozilla.org/login-manager/loginInfo;1"].createInstance(Ci.nsILoginInfo);
  login.init(loginURI, null, loginURI, aUsername, aNewPassword, "", "");
  Services.logins.addLogin(login);
}
