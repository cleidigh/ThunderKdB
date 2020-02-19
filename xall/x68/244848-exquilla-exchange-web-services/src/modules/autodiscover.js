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
 
// provides exchange autodiscover of ews server url

const EXPORTED_SYMBOLS = ["EwsAutoDiscover"];
var EwsAutoDiscover = {};

let Cu = Components.utils;
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var QIUtils = ChromeUtils.generateQI ? ChromeUtils : XPCOMUtils; // COMPAT for TB 60
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
var { EwsFBA } = ChromeUtils.import("resource://exquilla/EwsFBA.jsm");
Cu.importGlobalProperties(["fetch", "XMLHttpRequest"]);
if ("@mozilla.org/xmlextras/domparser;1" in Cc) {
  this.DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1", Ci.nsIDOMParser); // COMPAT for TB 60
} else {
  Cu.importGlobalProperties(["DOMParser"]);
}
if (Ci.nsIDOMElement) {
  this.Element = {
    isInstance: function(aElement) { // COMPAT for TB 60
      return aElement instanceof Ci.nsIDOMElement;
    },
  };
} else {
  Cu.importGlobalProperties(["Element"]);
}
Utils.importLocally(this);

var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("autodiscover");
  return _log;
});

function doAutodiscover(aEmail, aUsername, aDomain, aPassword, aSavePassword, aListener, aWindow, aSiteCallback)
{
  async function coroutine()
  {
    let status = 0;
    let displayName = "";
    let urls = [];

    // Bug 799234 added a check that the upload channel is rewound, but it does not appear
    //  to be and I am hitting an assertion. I believe there is a core bug that is causing
    //  this. Capture the moment, and rewind the uploadStream to stop this.
    // See also bug 977736 with patch to prevent
    let observer = {
      observe: function autodiscover_observer(aSubject, aTopic, aData) {
        switch (aTopic) {
          case "http-on-modify-request":
            let uploadChannel = aSubject;
            if (uploadChannel instanceof Ci.nsIUploadChannel)
            {
              let stream = uploadChannel.uploadStream;
              if (stream instanceof Ci.nsISeekableStream)
              {
                let existingOffset = stream.tell();
                if (existingOffset)
                {
                  log.debug("resetting stream.tell() since value is " + existingOffset);
                  stream.seek(Ci.nsISeekableStream.NS_SEEK_SET, 0);
                }
              }
            }
            else
              log.debug("channel is not an upload channel");
          }
        }
      }
    Services.obs.addObserver(observer, "http-on-modify-request", false);
    // bug 
    try
    {
      let host = (/@(.*)/.exec(aEmail))[1];

      // Because we support invalid SSL certificates (with confirmation), I want
      //  to change the order for autodiscover options to minimize the chance
      //  of being asked for confirmation of an invalid certificate.

      // First, look for a SRV entry using the mesquilla external service
      // (bug 14328 prevents this being done using Mozilla core code)
      let adServerFromSRV = "";
      let promiseGetSrv = new Promise(resolve => {
        EwsAutoDiscover.getSrv(host, function(status, adServer) {
          if (status == 200)
          {
            adServerFromSRV = adServer;
            log.debug("getSrv returned " + adServer);
          }
          resolve();
        });
      });
      await promiseGetSrv;

      if (adServerFromSRV.length)
        urls.push("https://" + adServerFromSRV);
      
      // next, see if we have a DNS entry with the autodiscover prefix
      let dnsService = Cc["@mozilla.org/network/dns-service;1"]
                         .getService(Ci.nsIDNSService);
      let prefixedURL = "autodiscover." + host;
      let flags = Ci.nsIDNSService.RESOLVE_CANONICAL_NAME;
      let record;
      log.debug('calling asyncResolve for hostname ' + prefixedURL);
      // use the example from extensions/irc/js/lib/dcc.js
      let th = Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager).currentThread;
      let promiseDnsResolve = new Promise(resolve => {
        dnsService.asyncResolve(prefixedURL, flags,
          { onLookupComplete: function onLookupComplete(aRequest, aRecord, aStatus)
            { log.debug('onLookupComplete: status is ' + CN(aStatus));
              record = aRecord;
              status = aStatus;
              resolve();
            }
          }, th);
      });
      await promiseDnsResolve;

      log.config('DNS status for autodiscover prefix is ' + CN(status) +
                  ' address is ' + (record ? record.getNextAddrAsString() : ""));
      if (status == 0)
      {
        // try to use the autodiscover prefixed url. Use the http: version first to look for a redirect,
        //  so that we don't ask for a certificate if we're just going to redirect anyway.
        urls.push("http://" + prefixedURL);
        urls.push("https://" + prefixedURL);
      }
      urls.push("https://" + host);
      let urlIndex = 0;
      for (let urlbase of urls)
      { try {
        // outer loop to try each url in urls
        let urlv2 = urlbase + '/autodiscover/autodiscover.json/v1.0/';
        log.config('try autodiscover to url ' + urlv2);
        if (aSiteCallback) aSiteCallback(urlv2); // just to show the url in UI
        try {
          let response = await fetch(urlv2 + aEmail + '?Protocol=Ews');
          status = response.status;
          if (status == 200) {
            let json = await response.json();
            if (/\/Exchange\.asmx$/i.test(json.Url)) {
              eventListener.mFoundAutodiscover = true;
              eventListener.mEwsUrl = json.Url;
              eventListener.mAuthMethod = Ci.nsMsgAuthMethod.anything; // we can't readily distinguish personal and Office 365 accounts using the API
            }
          }
        } catch (ex) {
          log.warn(ex);
        }

        let url = urlbase + '/autodiscover/autodiscover.xml';
        let originalUrl = url;

        // For some reason default redirect did not work reliably, so I manage it myself
        for (let redirectCount = 0; redirectCount < 6; redirectCount++)
        { // inner loop of redirects
          eventListener.mUrl = url;
          // if the url is a simple http: we are just looking for redirect, so shorten the timeout
          let shortTimeout = (originalUrl.indexOf("http:") == 0);
          if (shortTimeout)
            eventListener.mTimeout /= 2;
          const promiseRequest = new Promise(resolve => {
            eventListener.sendRequest(resolve);
          });
          log.config('try autodiscover to url ' + url);
          if (aSiteCallback) aSiteCallback(url); // just to show the url in UI
          await promiseRequest;

          eventListener.cancelTimeout();
          if (shortTimeout)
            eventListener.mTimeout *= 2;
          status = eventListener.mStatus;

          if ( ((status == 301 ||  status == 302 || status == 303 || status == 307) ||
               (eventListener.mChannelStatus == Cr.NS_ERROR_REDIRECT_LOOP)))
          {
            url = eventListener.mLocation;
            if (url && url.length)
            {
              // If we are redirecting from an original http: url, then this is probably
              //  not FBA so switch the original to this new url.
              if (originalUrl.indexOf("http:") == 0)
                originalUrl = url;
              log.config("redirecting to " + url + " originalUrl is now " + originalUrl);
              continue; // try redirect
            }
            else
            {
              log.warn("Missing Location response header during redirect");
              break; // try a new url
            }
          }

          if (eventListener.mCertError)
          {
            if (informUserOfCertError(url, aWindow))
            {
              // resend the request
              log.config('resending request after cert error');
              continue;
            }
          }

          if (status == 200)
          {
            log.config("request succeeded, ews url length=" + eventListener.mEwsUrl.length +
                      " contentType " + eventListener.mRequest.channel.contentType);
            // if parsed, show what we got
            //if (eventListener.mRequest.responseXML)
            //  log.debug("responseXML is \n" + stringXMLResponse(eventListener.mRequest.responseXML));
            // did the request return html? Maybe this is FBA
            if (!eventListener.mEwsUrl.length && eventListener.mRequest.channel.contentType == 'text/html')
            {
              log.config("autodiscover failed, returning text/html, trying FBA");
              // Let's try the FBA form with username and password fields
              const promiseFba = new Promise(resolve => {
                EwsFBA.doFba(aUsername, aPassword, url,
                  function _doFbaCallback(aStatus)
                  {
                    resolve(aStatus == EwsFBA.FBA_SUCCEEDED);
                  });
              });
              const gotXml = await promiseFba;

              if (gotXml)
              {
                // try the request again
                log.config("Retrying autodiscover after possible FBA to url " + originalUrl);
                url = originalUrl;
                continue;
              }
              else
              {
                log.warn("FBA failed, maybe we need to add a popup browser to let the user try");
                break;
              }
            }

            displayName = eventListener.mDisplayName;
            break;
          }
          // This url did not succeed, try a new one.
          log.debug("Try a new url");
          break;
        } // end of redirect loop

        if (eventListener.mEwsUrl.length)
        {
          log.config('successful autodiscovery to url ' + url + ' with result ' + eventListener.mEwsUrl);
          break;
        }
      } catch (e) { log.warn("autodiscovery inner error " + se(e));}}
    }
    catch (e) { log.warn("autodiscovery outer error " + se(e));}
    finally {
      Services.obs.removeObserver(observer, "http-on-modify-request");
      let result = {};
      result.mInternalEwsUrl = eventListener.mInternalEwsUrl;
      result.mEwsUrl = eventListener.mEwsUrl;
      result.mEwsOWAGuessUrl = eventListener.mEwsOWAGuessUrl;
      result.mAuthMethod = eventListener.mAuthMethod;
      result.mPassword = eventListener.mPassword;
      aListener.handleAutodiscover(status, result, displayName, eventListener.mFoundAutodiscover);
    }
  }

  log.config('doAutodiscover email is ' + aEmail + ' username is ' + aUsername + ' domain is ' + aDomain);
  // Clear HTTP authentication session in case we configure 2 accounts on the same server
  Cc['@mozilla.org/network/http-auth-manager;1'].getService(Ci.nsIHttpAuthManager).clearAll();
  var eventListener = new EventListener(aEmail, aUsername, aDomain, aPassword, aSavePassword);

  coroutine();
}

function informUserOfCertError(targetSite, aWindow)
{
  var params = { exceptionAdded : false,
                 prefetchCert : true,
                 location : targetSite,
               };
  // get a window and open dialog (Warning: skink dependency in native method)
  let window = aWindow || Services.ww.activeWindow;
  window.openDialog("chrome://pippki/content/exceptionDialog.xul",
                    "","chrome,centerscreen,modal", params);
  return params.exceptionAdded;
}

function EventListener(aEmail, aUsername, aDomain, aPassword, aSavePassword)
{
  this.mRequest = null;
  this.mUrl = null;
  this.mEmail = aEmail;
  this.mUsername = aUsername;
  this.mDomain = aDomain;
  this.mPassword = aPassword;
  this.mCertError = false; // Are we handling an error ourself?
  this.mEwsUrl = ''; // the external EWS url
  this.mInternalEwsUrl = ''; // the internal EWS url
  this.mEwsOWAGuessUrl = ''; // ews url guess from OWA
  this.mAuthMethod = Ci.nsMsgAuthMethod.passwordCleartext;
  this.mDisplayName = '';
  this.mFoundAutodiscover = false;
  this.mCallback = null;
  this.mSavePassword = aSavePassword;
  this.mStatus = 0;
  this.mChannelStatus = 0;
  this.mLocation = "";
  this.mTimeout = 15000; // 15 seconds
  this.mTimeoutTimer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);

  // I cannot figure out why I am getting called multiple times, so do not repeat
  // dialog if a set of credentials have already been used. Store them here.
  this.history = [];
}

EventListener.prototype = 
{
  // return a blank histories credential object
  loginAttempt: function (aUsername, aDomain, aPassword, aHostname) {
    let obj = { username: aUsername,
                domain: aDomain,
                password: aPassword,
                hostname: aHostname
              };
    return obj;
  },

  sendRequest: function sendRequest(aCallback)
  {
    this.mCallback = aCallback;
    this.mCertError = false; // if we resend
    this.mRequest = new XMLHttpRequest();

    // if the url does not begin with http, then add https://
    if (!/^https?:\/\//.test(this.mUrl))
      this.mUrl = "https://" + this.mUrl;
    
    this.mRequest.addEventListener("load", this, false);
    this.mRequest.addEventListener("error", this, false);
    this.mRequest.addEventListener("abort", this, false);
    this.mRequest.open("POST", this.mUrl, true);

    let ns = 'http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006';
    let schema = 'http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a';
    let body = 
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<Autodiscover xmlns="' + ns + '">' +
        '<Request>' + 
          '<EMailAddress>' + encodeURI(this.mEmail) + '</EMailAddress>' +
          '<AcceptableResponseSchema>' + schema + '</AcceptableResponseSchema>' +
        '</Request>' +
      '</Autodiscover>';
 
    //this.mRequest.overrideMimeType('text/xml');
    this.mRequest.setRequestHeader("Content-Type", "text/xml");
    this.mRequest.channel.notificationCallbacks = this;
    this.mRequest.channel instanceof Ci.nsIHttpChannel;
    this.mRequest.channel.redirectionLimit = 0;

    // we only used http for possible redirect, so do not send credentials
    if (this.mRequest.channel.URI.scheme != "https")
      this.mRequest.channel.loadFlags = Ci.nsIChannel.LOAD_ANONYMOUS;

    // Look for custom useragent
    try {
      let useragent = Services.prefs.getCharPref("extensions.exquilla.useragent");
      if (useragent && useragent.length && useragent != "default")
        this.mRequest.setRequestHeader("User-Agent", useragent);
    } catch (e) {}

    this.startTimeout();
    this.mRequest.send(body);
  },

  notifyCertProblem: function(socketInfo, status, targetSite)
  {
    log.info('autodiscover notifyCertProblem targetSite ' + targetSite + ' status ' +
               (status.isDomainMismatch? " isDomainMismatch " : "") + (status.isUntrusted? " isUntrusted " : ""));
    this.mCertError = true;
    return true;
  },

  handleEvent: function handleEvent(event)
  {
    log.debug('autodiscover handle event ' + event.type + ' readyState is ' + this.mRequest.readyState);
    try {
      if ((this.mChannelStatus = this.mRequest.channel.status))
        log.debug("Channel status is " + CN(this.mChannelStatus));
    } catch (e) {}

    try {
      if (event.type == "load" || event.type == "error" || event.type == "abort" || event.type == "timeout")
      {
        this.cancelTimeout();
        this.mStatus = this.mRequest.status;
        log.info('autodiscover request status: ' + this.mRequest.status + ' channel status ' + CN(this.mRequest.channel.status));
        
        if (this.mRequest.status == 200)
        { try {

          let xml = this.mRequest.responseXML;
          // for some reason, contentType is sometimes text/html and not text/xml
          let contentType = this.mRequest.channel.contentType;
          if (!xml)
          { try {
            // Some sites seem to return a text/html content type, even when the content
            //  is xml. So try manually parsing xml.
            let parser = new DOMParser();
            xml = parser.parseFromString(this.mRequest.responseText, "text/xml");
          } catch (e) {log.config("xml parse error: " + e);}}
            
          log.debug('contentType is ' + contentType);
          log.debug('response text:\n' +  this.mRequest.responseText);

          let mainElement = xml ? xml.getElementsByTagName("Autodiscover") : null;
          let protocols;
          if (mainElement && mainElement.length)
          {
            this.mFoundAutodiscover = true;
            this.mDisplayName = xml.getElementsByTagName("DisplayName")[0].textContent;
            protocols = xml.getElementsByTagName("Protocol");
          }
          else
          {
            log.info("We found a site at that URL, but it is not autodiscover.");
          }
          for (let i = 0; protocols && i < protocols.length; i++)
          { try {
            let protocol = protocols[i];
            let type = '';
            let children = protocol.children;
            for (let j = 0; j < children.length; j++)
            {
              let child = children[j];
              if ( Element.isInstance(child) &&
                   (child.tagName == "Type") )
              {
                type = child.textContent
                break;
              }
            }
            if (type == "EXPR" || type == "EXCH")
            {
              let url = protocol.getElementsByTagName("ASUrl")[0].textContent;
              if (!this.mEwsUrl.length && type == "EXPR")
                this.mEwsUrl = url;
              if (!this.mInternalEwsUrl.length && type == "EXCH")
                this.mInternalEwsUrl = url;
            }
            if (!this.mEwsOWAGuessUrl.length && type == "WEB")
            {
              // get the OWA URL and use it to guess an EWS url
              let owaUrl = protocol.getElementsByTagName("External")[0]
                                   .getElementsByTagName("OWAUrl")[0]
                                   .textContent;
              this.mEwsOWAGuessUrl = owaUrl.replace(/\/owa\//i, "/EWS/") + 'Exchange.asmx';
              this.mAuthMethod = owaUrl.startsWith("https://outlook.office365.com/owa/") ?
                Ci.nsMsgAuthMethod.anything : Ci.nsMsgAuthMethod.passwordCleartext;
            }
          } catch (e) {log.config("protocol parse error " + e); continue;}}

          log.config("ewsURL is " + this.mEwsUrl);
          log.debug("internalEwsURL is " + this.mInternalEwsUrl);
          log.debug("mEwsOWAGuessUrl is " + this.mEwsOWAGuessUrl);
          if (this.mSavePassword)
          {
            if (this.mEwsUrl.length)
            {
              log.config("Saving password for external EWS server as well");
              let uri = newParsingURI(this.mEwsUrl);
              savePassword(uri.prePath, this.mUsername, this.mDomain, this.mPassword);
            }
            if (this.mInternalEwsUrl.length)
            {
              log.config("Saving password for internal EWS server as well");
              let uri = newParsingURI(this.mInternalEwsUrl);
              savePassword(uri.prePath, this.mUsername, this.mDomain, this.mPassword);
            }
          }
        } catch (e) {log.config("Error handling response: " + e);}}
        else if ((this.mRequest.status == 301) || (this.mRequest.status == 302) ||
                 (this.mChannelStatus == Cr.NS_ERROR_REDIRECT_LOOP))
        {
          this.mLocation = this.mRequest.getResponseHeader("Location");
          log.config("Redirect received to location " + this.mLocation);
        }
        this.mCallback();
      }
  } catch (e) {re(e);this.mCallback()}},

  asyncPromptAuth: function _asyncPromptAuth(aChannel, aCallback, aContext, aLevel, aAuthInfo)
  {
    let scheme = aChannel.URI.scheme;
    let hostname = scheme + "://" + aChannel.URI.host;

    // If the URI explicitly specified a port, only include it when
    // it's not the default. (We never want "http://foo.com:80")
    let port = aChannel.URI.port;
    if (port != -1) {
        let handler = Services.io.getProtocolHandler(scheme);
        if (port != handler.defaultPort)
            hostname += ":" + port;
    }

    return this.asyncPromptAuth2(this.mUsername, this.mDomain,
       aAuthInfo.password, hostname, aCallback, aContext, aAuthInfo);
  },

  asyncPromptAuth2: function _asyncPromptAuth2
      (aUsername, aDomain, aPassword, aHostname, aCallback, aContext, aAuthInfo)
  { try {
    this.cancelTimeout();
    // Have we already tried this?
    let triedAlready = false;
    for (let loginAttempt of this.history) {
      if (loginAttempt.username == aUsername &&
          loginAttempt.domain == aDomain &&
          loginAttempt.password == aPassword &&
          loginAttempt.hostname == aHostname) {
        triedAlready = true;
        break;
      }
    }

    // Only add this login to the attempts if a previous
    // attempt failed. I can't figure out who keeps calling this, hence this
    // kludge.
    if (aAuthInfo.flags & Ci.nsIAuthInformation.PREVIOUS_FAILED) {
      if (triedAlready) {
        log.debug("We already tried this!");
        executeSoon( () => aCallback.onAuthCancelled(aContext, false));
        return;
      }
      else
        this.history.push(this.loginAttempt(aUsername, aDomain, aPassword, aHostname));
    }
    else
      log.debug("No previous attempt failed");
      
    log.config("asyncPromptAuth2 aUsername " + aUsername + " Domain " + aDomain + ' aHostname ' + aHostname);
    let domainAndUser = aDomain && aDomain.length ? aDomain + "\\" + aUsername : aUsername;

    // I am going to assume that the password is not being looked up prior to this call, so I will do it.
    let localPassword = "";

    // On the first attempt, use the passed in password if given
    if (!(aAuthInfo.flags & Ci.nsIAuthInformation.PREVIOUS_FAILED) && this.mPassword && this.mPassword.length)
    {
      log.debug('Using password passed in during account setup');
      localPassword = this.mPassword;
    }
    else
    {
      log.debug('Looking for a password in the password manager');
      let foundLogins;
      if (Services.logins.findLogins.length == 4) { // COMPAT for TB 60
        foundLogins = Services.logins.findLogins({}, aHostname, null, aHostname);
      } else {
        foundLogins = Services.logins.findLogins(aHostname, null, aHostname);
      }
      log.debug('Looking for login with effective user name ' + domainAndUser);
      for (let login of foundLogins)
      {
        log.debug('found login for user ' + login.username);
        if (login.username == domainAndUser)
        {
          log.config('found password in login manager');
          localPassword = login.password;
          //dl('password is ' + login.password); // not written to log file!
        }
      }
      // if lookup failed,  then use the passed-in password
      if (!localPassword.length)
      {
        localPassword = this.mPassword;
        log.debug('no password found in the login manager, using the passed in password instead');
      }
    }

    // setup authInfo to support domain
    if (aDomain && aDomain.length)
    {
      aAuthInfo.domain = aDomain;
      // Why was this here?
      //aAuthInfo.flags |= Ci.nsIAuthInformation.NEED_DOMAIN;
    }
    aAuthInfo.username = aUsername;
    aAuthInfo.password = localPassword;

    let cancelable = _newAsyncPromptConsumer(aCallback, aContext);

    // If this is the first attempt, then just pass the credentials
    if (!(aAuthInfo.flags & Ci.nsIAuthInformation.PREVIOUS_FAILED) &&
          localPassword.length)
    {
      this.startTimeout();
      this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      this.timer.initWithCallback(function _onAuthAvailable() 
                                  { aCallback.onAuthAvailable(aContext, aAuthInfo);}
                                  , 0, Ci.nsITimer.TYPE_ONE_SHOT);
      log.debug('first attempt, returning credentials without prompt');
      return cancelable;
    }

    if (this.mFoundAutodiscover) {
      executeSoon(() => aCallback.onAuthCancelled(aContext, false));
      log.debug("found EWS URL via JSON, don't prompt for XML password");
      return null;
    }

    let bundleSvc = Cc["@mozilla.org/intl/stringbundle;1"]
                      .getService(Ci.nsIStringBundleService);
    let cdBundle = bundleSvc.createBundle("chrome://global/locale/commonDialogs.properties");
    let pmBundle = bundleSvc.createBundle("chrome://passwordmgr/locale/passwordmgr.properties");
    let authenticationRequired = cdBundle.GetStringFromName("PromptPassword2");
    let enterPasswordFor = cdBundle.formatStringFromName("EnterPasswordFor", [domainAndUser, aHostname], 2);
    let rememberPassword = pmBundle.GetStringFromName("rememberPassword");

    let args = {
      promptType: "promptPassword",
      user: aUsername,
      pass: localPassword,
      domain: aDomain,
      hostname: aHostname,
      text: enterPasswordFor,
      title: authenticationRequired,
      checkLabel: rememberPassword,
      checked: true,
      cancelable: cancelable,
      authInfo: aAuthInfo,
      ok: false
    }
    let propBag = objectToPropBag(args);
    let dialog = Services.ww.openWindow(Services.ww.activeWindow, "chrome://global/content/commonDialog.xul",
                           "_blank", "centerscreen,chrome,titlebar", propBag);
    let self = this;
    dialog.addEventListener("unload", function onUnload(event) {self.onCommonDialogUnload(event);}, false);
    return cancelable;
    
  } catch (e) {re(e);}},

  onCommonDialogUnload: function _onCommonDialogUnload(event)
  { try {
    let args = event.currentTarget.wrappedJSObject.args;
    if (!args) // this is not the right target - there must be a more general way to do this!
      return;

    this.startTimeout();
    if (args.ok)
    {
      this.mPassword = args.pass;
      if (args.checked)
      {
        savePassword(args.hostname, args.user, args.domain, args.pass);
        this.mSavePassword = true;
      }
      else
        log.config('using credentials, but not adding to login manager');
      let authInfo = args.authInfo.QueryInterface(Ci.nsIAuthInformation);
      authInfo.username = args.user;
      authInfo.domain = args.domain;
      authInfo.password = args.pass;
      args.cancelable.callback.onAuthAvailable(args.cancelable.context, authInfo);
    }
    else
    {
      log.config('get password cancelled, not using credentials');
      args.cancelable.callback.onAuthCancelled(args.cancelable.context, true);
    }
  } catch(e) {re(e);}},

  promptAuth: function _promptAuth(aChannel, level, authInfo)
  {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  getInterface: function _getInterface(iid)
  {
    //let iface = Components.interfacesByID[iid];
    //log.debug("autodiscover getInterface " + (iface ? iface : iid));
    return this.QueryInterface(iid);
  },

  // nsISupports
  QueryInterface: function(iid) {
    if (!iid.equals(Ci.nsIBadCertListener2) &&
        !iid.equals(Ci.nsIAuthPrompt2) &&
        !iid.equals(Ci.nsIInterfaceRequestor) &&
        !iid.equals(Ci.nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },

  startTimeout: function _startTimeout() {
    let self = this;
    this.mTimeoutTimer.initWithCallback(
        function _onTimeout() { log.config("request timed out"); self.mRequest.abort();},
        this.mTimeout, Ci.nsITimer.TYPE_ONE_SHOT);
  },

  cancelTimeout: function _cancelTimeout() { this.mTimeoutTimer.cancel();},
};

// Async manager to manage inquiries to Mesquilla's DNS SRV lookup service
function DnsEventListener(aHost, aCallback)
{
  this.mRequest = null;
  this.mHost = aHost;
  this.mStatus = 0;
  this.mCallback = aCallback;
}

DnsEventListener.prototype = 
{
  sendRequest: function sendRequest()
  {
    this.mRequest = new XMLHttpRequest();
    // Create the URL
    let url = "http://node.mesquilla.com/srv?host=" + this.mHost;
    
    this.mRequest.addEventListener("load", this, false);
    this.mRequest.addEventListener("error", this, false);
    this.mRequest.addEventListener("abort", this, false);
    this.mRequest.addEventListener("timeout", this, false);
    this.mRequest.open("GET", url, true);

    this.mRequest.channel.notificationCallbacks = this;
    this.mRequest.setRequestHeader("Accept", "application/json");
    this.mRequest.timeout = 5000; // In case my node goes down
    this.mRequest.send();
  },

  handleEvent: function handleEvent(event)
  {
    log.debug('dnssrv handle event ' + event.type + ' readyState is ' + this.mRequest.readyState);
    try {
      if (event.type == "load" || event.type == "error" || event.type == "abort" || event.type == "timeout")
      {
        this.mStatus = this.mRequest.status;
        log.debug('dnssrv request status: ' + this.mRequest.status + ' channel status ' + CN(this.mRequest.channel.status));
      }
    }
    catch (e) {re(e);}
    finally {this.mCallback();}
  },

  getInterface: function _getInterface(iid)
  {
    return this.QueryInterface(iid);
  },

  // nsISupports
  QueryInterface: function(iid) {
    if (!iid.equals(Ci.nsIInterfaceRequestor) &&
        !iid.equals(Ci.nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },
};

// use an external service to get a SRV record
function getSrv(aHost, aCallback)
{
  async function coroutine()
  {
    let adServer = "";
    let dnsEventListener;
    try {
      let promiseDnsEvent = new Promise(resolve => {
        dnsEventListener = new DnsEventListener(aHost, resolve);
        dnsEventListener.sendRequest();
        log.debug("get SRV record for " + aHost);
      });
      await promiseDnsEvent;

      // Parse the result into a single server
      if (dnsEventListener.mStatus == 200)
      try {
        let addresses = JSON.parse(dnsEventListener.mRequest.responseText);
        if (addresses && addresses.length)
        {
          adServer = addresses[0].name;
          log.info("DNS SRV found an autodiscover server at " + adServer);
        }
      } catch(e) {re(e);}
    }
    catch (e) { log.warn("dnssrv error " + e);}
    finally {aCallback(dnsEventListener.mStatus, adServer);}
  }
  coroutine();
}

// publically accessible items
EwsAutoDiscover.doAutodiscover = doAutodiscover;
EwsAutoDiscover.getSrv = getSrv;

// helper functions
function hostFromSpec(aSpec)
{
  // if the url does not begin with http, then add https://
  let prefix = "https://";
  if (/^https?:\/\//.test(aSpec))
    prefix = "";
  let uri = newParsingURI(prefix + aSpec);
  return uri.host;
}

function _newAsyncPromptConsumer(aCallback, aContext)
{
  let obj = 
  {
    QueryInterface: QIUtils.generateQI([Ci.nsICancelable]),
    callback: aCallback,
    context: aContext,
    cancel: function() {
      this.callback.onAuthCancelled(this.context, false);
      this.callback = null;
      this.context = null;
    }
  };

  return obj;
}

function objectToPropBag(obj) {
  let bag = Cc["@mozilla.org/hash-property-bag;1"]
              .createInstance(Ci.nsIWritablePropertyBag2);
  bag.QueryInterface(Ci.nsIWritablePropertyBag);

  for (let propName in obj)
    bag.setProperty(propName, obj[propName]);

  return bag;
}

function savePassword(aHostname, aUser, aDomain, aPassword)
{
  log.config('commonDialogClone adding credentials to login manager for user <' + aUser + '> domain <' + aDomain + '> hostname ' + aHostname);
  // delete existing logins
  let foundLogins;
  if (Services.logins.findLogins.length == 4) { // COMPAT for TB 60
    foundLogins = Services.logins.findLogins({}, aHostname, null, aHostname);
  } else {
    foundLogins = Services.logins.findLogins(aHostname, null, aHostname);
  }
  let domainAndUser = (aDomain && aDomain.length ? aDomain + "\\" : "") + aUser;
  let newLogin = Cc["@mozilla.org/login-manager/loginInfo;1"]
                   .createInstance(Ci.nsILoginInfo);
  newLogin.init(aHostname, null, aHostname, domainAndUser, aPassword, "", "");
  if (foundLogins && foundLogins.length)
  {
    for (let login of foundLogins)
    {
      if (login.matches(newLogin, true))
        Services.logins.removeLogin(login);
    }
  }
  Services.logins.addLogin(newLogin);
}
