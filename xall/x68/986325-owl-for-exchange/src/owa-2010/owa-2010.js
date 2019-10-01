
/**
 * {Map serverId {String} -> account {OWA2010Account}}
 */
var gOWA2010Accounts = new Map();

class OWA2010Account extends EWSAccount {

/**
 * Internal function. Called as part of ctor.
 */
async load() {
  this.cookieName = "cadata";
  this.requestVersion = kExchange2010_SP1;
  return super.load();
}

/**
 * Internal function. Used only by CallService().
 *
 * Translates an EWS request to a SOAP/XML document.
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
  JSON2XML(aRequest, envelope, envelopeNS, "s:Body");
  return xml;
}

/**
 * Invoke a generic action using the EWS API.
 *
 * @param aMsgWindow {any} dummy parameter. Not used.
 * @param aRequest   {Object}  The JSON encoded request
 * @returns          {Object}  The response messages in JSON format
 */
async CallService(aMsgWindow, aRequest) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", this.serverURL + "ev.owa?ns=EwsProxy&ev=Proxy");
  xhr.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
  let onloadend = new Promise((resolve, reject) => {
    xhr.onloadend = resolve;
  });
  xhr.send(this.request2XML(aRequest));
  await onloadend;
  if (xhr.status == 200) {
    return this.CheckResponse(xhr, aRequest);
  }
  if (xhr.status == 440) {
    this.ClearCookies(); // auth.js
    throw new OwlError("login-expired");
  }
  throw new EWSError(xhr, aRequest);
}

/**
 * Checks whether the specified Exchange version is supported or not.
 *
 * An attempt to detect the version is made by looking at the login page
 * favicon. If the version is not supported, an ExchangeVersionEror is thrown.
 */
async CheckLoginPage() {
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
        if (majorVersion != 14 || !minorVersion) {
          throw new ExchangeVersionError();
        }
      }
    }
  }
}

} // class OWA2010Account

// We want to "inherit" these from OWAAccount rather than EWSAccount.
for (authFn of ["getURL", "getCanary", "ClearCookies", "VerifyLogin", "EnsureLoggedIn",
    "LoginLock", "Login", "LoginWithPassword", "FindLoginElementsStrict",
    "LaxLoginWithPassword", "FindLoginElementsLax", "SubmitLoginForm",
    "TaggedFetch", "LoginWithOAuthInTab", "LoginWithOAuthInPopup"]) {
  OWA2010Account.prototype[authFn] = OWAAccount.prototype[authFn];
}
