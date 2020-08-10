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

// Implements the functionality of the former nsHTTPSOAPTransport.cpp from webservices

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
Cu.importGlobalProperties(["DOMParser", "XMLSerializer"]);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("soap");
  return _log;
});

ChromeUtils.defineModuleGetter(this, "EwsFBA",
  "resource://exquilla/EwsFBA.jsm");
ChromeUtils.defineModuleGetter(this, "MonitoredRequest",
  "resource://exquilla/MonitoredRequest.jsm");

var EXPORTED_SYMBOLS = ["SoapTransport"];

//TESTING - simulate 503 errors for first 4 calls
//const TEST_503 = true;
//let count_503 = 0;
//const TEST_503_LIMIT = 3;

var global = this;

// We cache servers that reject our basic authentication call
var bypassBasic = {};

// Is this tb31 or later? Unfortunately appinfo does not seem to
//   work here in xpcshell tests, so I will check for the presence
//   of an interface that was added in Gecko 31
var gTB31orLater = true;

var oSerializer = new XMLSerializer();

function SoapTransport()
{
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
  try {

  // module variables
  this.mAccessToken = null;
  this.mPassword = null;
  this.mUser = null;
  this.mDomain = null;
  this.mCompletion = null;
  this.mUseragent = null;
  this.authCount = 0; // number of times we are asked for authorization
} catch(e) {dump('error creating httpSoapTransport: ' + e +'\n'); throw e;}}

const SoapTransportInterfaces = [Ci.nsISupports, Ci.nsIClassInfo, Ci.nsIAuthPrompt2,
                                     Ci.nsIBadCertListener2, Ci.nsIInterfaceRequestor];
SoapTransport.prototype =
{
  /**
  * nsIClassInfo
  */
  getInterfaces: function _getInterfaces(aCount)
  {
    let interfaces = SoapTransportInterfaces;
    aCount.value = interfaces.length;
    return interfaces;
  },
  getHelperForLanguage: function _getHelperForLanguage(aLang) {
    return null;
  },
  contractID:       "@mesquilla.com/xmlextras/soap/transport;1?protocol=http",
  classDescription: "http transport for SOAP messages",
  classID:          Components.ID("{F2F908D5-3B7F-4a17-A33C-36949CDC2D59}"),
  flags:            0,
  QueryInterface:   ChromeUtils.generateQI(SoapTransportInterfaces),

  // SOAPTransport implementation

  /**
   * Send the specified message to the specified destination.
   * This will fail if synchronous calls are not supported or if there is any
   * failure in the actual message exchange.  Failure of the call itself will be
   * contained in the response.
   *
   * @param aCall Actual message to be sent.
   *
   * @param aResponse Message to be received.  Calling synchronously assumes that
   *   exactly one response is expected.
   */
  syncCall: function _syncCall(aCall, aResponse)
  {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  /**
   * Send the specified message to the specified destination synchronously waiting
   * for completion and any response.
   * This will fail if there is any failure in the setup of the message exchange.
   * Later errors will only be known through the response listener.  Failures of the
   * call itself will be contained in the response passed to the response listener.
   *
   * @param aCall (SOAPCall): Actual message to be sent.
   *
   * @param aListener (SOAPResponseListener) Handler to be invoked (single threaded) as each response is
   *  received and finally with null.  If specified as null, no responses are returned.
   *
   * @param response (SOAPResponse) Message to receive response and be handled by listener.  May be
   *   null if listener is null.
   */

  asyncCall: function _asyncCall(aCall, aListener, aResponse)
  { try {
    log.config('asyncCall uri ' + aCall.transportURI + ' user ' + this.mUser + ' domain ' + this.mDomain);
    // we do not support an action URI
    //if (aCall.actionURI.length)
    //  throw Cr.NS_ERROR_NOT_IMPLEMENTED;

    //let request =new XMLHttpRequest();
    this.mMonitoredRequest = new MonitoredRequest();
    let request = this.mMonitoredRequest.request;
    let completion = new httpSoapTransportCompletion(aCall, aResponse, request, aListener, this);
    this.mCompletion = completion;
    //request.addEventListener("load", completion, false);
    //request.addEventListener("error", completion, false);
    //request.addEventListener("abort", completion, false);
    this.mMonitoredRequest.completion = completion;
    request.mozBackgroundRequest = true;
    let transportURI = aCall.transportURI;
    if (!this.mAccessToken) {
      // Override the transportURI to insert the user. This is needed to make sure that
      //  we can detect changes in user when we fix connection caching
      let uri = Services.io.newURI(transportURI);
      let userdomain = this.mDomain && this.mDomain.length ?
                           this.mDomain + "\\" + this.mUser :
                           this.mUser;
      if (uri.scheme != 'file') { // used in testing
        if (Ci.nsIURIMutator) { // tb 60
          uri = uri.mutate().setUsername(encodeURIComponent(userdomain))
                            .setPassword(encodeURIComponent(this.mPassword))
                            .finalize();
        } else {
          uri.username = encodeURIComponent(userdomain);
          uri.password = encodeURIComponent(this.mPassword);
        }
        transportURI = uri.spec;
      }
    }
    request.open('POST', transportURI, true);
    if (this.mAccessToken) {
      // We don't want Gecko to try to fall back to basic authentication.
      request.channel.loadFlags = Ci.nsIChannel.LOAD_ANONYMOUS |
                                  Ci.nsIChannel.LOAD_BYPASS_CACHE |
                                  Ci.nsIChannel.INHIBIT_CACHING;
      request.setRequestHeader("Authorization", "Bearer " + this.mAccessToken);
    }
    // noParse eliminates bogus error messages on failed authentication
    if (aCall.noParse)
      request.overrideMimeType("text/plain");
    else
      request.overrideMimeType("application/xml");
    request.setRequestHeader("Content-Type", "text/xml; charset=UTF-8");
    request.setRequestHeader("Connection", "keep-alive"); // needed for NTLM connections
    if (this.mUseragent)
      request.setRequestHeader("User-Agent", this.mUseragent);
    request.channel.notificationCallbacks = this;
    // should we bypass basic authentication for this server?
    if (bypassBasic[aCall.transportURI] ||
        request.channel.URI.scheme != "https" ||
        gTB31orLater)
      this.authCount++;
    if (this.authCount == 0)
    {
      // try basic authentication
      request.channel.loadFlags = Ci.nsIChannel.LOAD_ANONYMOUS | // don't send authorization
                                  Ci.nsIChannel.LOAD_BYPASS_CACHE |
                                  Ci.nsIChannel.INHIBIT_CACHING;

      // I am going to try basic authentication, since I can use that with multiple logins
      //  to the same server.
      //log.debug("userdomain used in Basic authentication header is " + userdomain);
      request.setRequestHeader('Authorization', 'Basic ' + btoaUTF(userdomain + ':' + this.password));
    }
    // I now allow message strings so that I don't have to make a DOM element out of
    //  of the XML text in the js case
    let messageString = null;
    try {
      messageString = aCall.messageString;
    } catch (e) {}
    if (messageString && messageString.length)
      this.mMonitoredRequest.sendMonitored(messageString);
    else if (aCall.message)
      this.mMonitoredRequest.sendMonitored(oSerializer.serializeToString(aCall.message));
    else
      this.mMonitoredRequest.sendMonitored();
    return completion;
  } catch (e) {re(e);}},

  /**
   *  user (optional) A username for authentication if necessary.
   *                  The default value is the empty string
   */
  get user()      { return this.mUser;},
  set user(aUser) { this.mUser = aUser;},

  // domain
  get domain()    { return this.mDomain;},
  set domain(a)   { this.mDomain = a;},

  // optional useragent string
  get useragent()      { return this.mUseragent;},
  set useragent(aUseragent) { this.mUseragent = aUseragent;},

  /**
   *  password (optional) A password for authentication if necessary.
   *                     The default value is the empty string
   */
  get password()          { return this.mPassword;},
  set password(aPassword) { this.mPassword = aPassword;},

  get accessToken()             { return this.mAccessToken; },
  set accessToken(aAccessToken) { this.mAccessToken = aAccessToken; },

  // Give the user a chance to save the certificate easily
  notifyCertProblem: function(socketInfo, status, targetSite)
  { try {
    log.config('notifyCertProblem' + (status.isDomainMismatch? " isDomainMismatch " : "") + (status.isUntrusted? " isUntrusted " : "") );
    if (!status)
      return true;

    this.mCertError = true;
    if (!this.timer)
      this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    let completion = this.mCompletion;
    this.timer.initWithCallback(function _informUserOfCertError()
                                { completion.informUserOfCertError(socketInfo, targetSite);}
                                , 0, Ci.nsITimer.TYPE_ONE_SHOT);
    return true;
  } catch (e) {re(e);}},

  asyncPromptAuth: function _asyncPromptAuth(aChannel, aCallback, aContext, level, authInfo)
  { try {
    log.config("asyncPromptAuth type " + authInfo.authenticationScheme + " needsDomain: " + !!(authInfo.flags & Ci.nsIAuthInformation.NEED_DOMAIN));
    log.config('asyncPromptAuth count ' + this.authCount + ' username ' + this.mUser + ' domain ' + this.mDomain);
    //if (this.authCount++ < 5)
    if (this.authCount++ < 2)
    {
      // use the existing password first time. Clear logins after. Cancel the call eventually.
      authInfo.username = this.mUser;
      authInfo.password = this.mPassword;
      if (this.mDomain && this.mDomain.length)
      {
        if (authInfo.flags & Ci.nsIAuthInformation.NEED_DOMAIN)
        {
          authInfo.domain = this.mDomain;
        }
        else if (authInfo.authenticationScheme != "basic")
        {
          // We don't do this for basic because we tried this already, and it failed
          authInfo.username = this.mDomain + "\\" + this.mUser;
        }
      }

      // Clear the anonymous request flag. The allows domain and NTLM authentication to
      //  work, but will cause problems if there are multiple users on the same server
      aChannel.loadFlags = Ci.nsIChannel.LOAD_BYPASS_CACHE |
                           Ci.nsIChannel.INHIBIT_CACHING;
      if ((typeof this.timer) == 'undefined')
        this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      this.timer.initWithCallback( function() { aCallback.onAuthAvailable(aContext, authInfo)},
                                   0, Ci.nsITimer.TYPE_ONE_SHOT);
    }
    else
    {
      if ((typeof this.timer) == 'undefined')
        this.timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
      this.timer.initWithCallback( function() { aCallback.onAuthCancelled(aContext, false)},
                                   0, Ci.nsITimer.TYPE_ONE_SHOT);
    }
    return null;
  } catch(e) {re(e);}},

  promptAuth: function promptAuth(aChannel, level, authInfo)
  {
    // we never want non-async prompts
    //log.debug('promptAuth');
    return false;
  },

  getInterface: function _getInterface(iid)
  {
    //log.debug("getInterface " + iid);
    return this.QueryInterface(iid);
  },
}

// 503 retry count and delays in milliseconds
const retryLimit = 5;
let retryDelays = [500, 1000, 2000, 4000, 8000];
function httpSoapTransportCompletion(call, response, request, listener, transport)
{
  this.mCall = call;
  this.mResponse = response;
  this.mResponse.xhr = request;
  this.mRequest = request;
  this.mListener = listener;
  this.mCertError = false;
  this.mTransport = transport;
  this.mTriedFBA = false;
  this.mRetryCount = 0;
  this.mStartTime = null; // set by MonitoredRequest as new Date()
  //this.mXhrTimeout = null; // set by MonitoredRequest default 120000 (2 minute)
  this.mProcessedLength = 0;

  this.usedProgress = false; // If we get progress events, those handled the response.

}

httpSoapTransportCompletion.prototype =
{
  get call() { return this.mCall; },
  get response() { return this.mResponse; },
  get listener() { return this.mListener; },
  get isComplete() { return (!this.mRequest); },
  abort: function _abort()
  { try {
    log.config('soap request aborted');
    if (this.mRequest)
    {
      this.mRequest.abort();
      this.mRequest = null;
    }
    else
    {
      log.error('missing request during abort');
    }
  } catch(e) {re(e);}},


  informUserOfCertError: function _informUserOfCertError(socketInfo, targetSite)
  {
    this.mCertError = true;
    log.info('httpSoapTransport informUserOfCertError site ' + targetSite);
    var params = { exceptionAdded : false,
                   prefetchCert : true,
                   location : targetSite,
                 };
    // get a window and open dialog
    let domWindow = Services.ww.activeWindow;
    if (!domWindow) {
      log.warn("Could not get an active window to inform of certificate error");
      let msgWindow = MailServices.mailSession.topmostMsgWindow;
      if (msgWindow) {
        domWindow = msgWindow.domWindow;
      }
      else {
        log.warn("Could not get a topmostMsgWindow, either!");
      }
      if (!domWindow) {
        log.warn("Could not get a dom window from the mail session, either");
      }
    }
        
    domWindow.openDialog("chrome://pippki/content/exceptionDialog.xul",
                  "","chrome,centerscreen,modal", params);
    // processing continues while we wait, in particular we get the "error" event.
    // Handle error or retry ourself after dialog returns
    log.config("return from exception dialog, exceptionAdded is " + params.exceptionAdded);
    if (params.exceptionAdded)
    {
      this.mCertError = false;
      log.debug("Trying call again after user accepted certificate");
      this.mTransport.asyncCall(this.mCall, this.mListener, this.mResponse);
    }
    else
    {
      log.config("User did not accept certificate, callback with error");
      if (this.mListener)
        this.mListener.handleResponse(this.mResponse, this.mCall, Cr.NS_ERROR_FAILURE, true);
    }

  },

  // nsIDOMEventListener implementation
  handleEvent: function _handleEvent(evt)
  { try {
    if (evt.type != "progress")
      log.debug('httpSoapTransportCompletion handleEvent type ' + evt.type + ' username ' + decodeURIComponent(this.mRequest.channel.URI.username));
    let request = evt.target;
    switch (evt.type)
    {
      case 'progress':
      {
        this.usedProgress = true;

        // update the xhr timer
        // This does not work in TB52, as it there is no timer
        // clear called after the last progress event :(
        //this.mRequest.timeout = (Date.now() - this.mStartTime) + this.mXhrTimeout;
        //log.info("Resetting timeout on progress to " + this.mRequest.timeout);

        let length = this.mRequest.responseText.length;
        //log.debug('progress event length is ' + length);
        this.mResponse.messageString = this.mRequest.responseText.substr(this.mProcessedLength);
        //log.debug(this.mResponse.messageString);
        this.mProcessedLength = length;

        this.doHandle(evt);
        return;
      }
      case 'load':
      {
        if (!this.mCall || !this.mRequest) {
          log.warn("load event but incomplete setup");
          if (this.mListener)
            this.mListener.handleResponse(this.mResponse, this.mCall, Cr.NS_ERROR_FAILURE, true);
          return;
        }
        log.config('transferComplete to URL: ' + this.mCall.transportURI);
        log.debug('contentType: ' + this.mRequest.channel.contentType +
                  ' status: ' + request.status +
                  ' statusText: ' + request.statusText +
                  ' authCount: ' + this.mTransport.authCount);
        let status = request.status;

        // status handling testing
        //if (status == 200 && TEST_503 && count_503++ < TEST_503_LIMIT)
        //  status = 503;

        if (status < 200 || status >= 300)
        {
          if (status == 301 || status == 302 || status == 307)
          {
            // redirect
            let location = this.mRequest.getResponseHeader("Location");
            if (location && location.length)
            {
              log.config("Redirecting to url " + location);
              this.mCall.transportURI = location;
              return this.mTransport.asyncCall(this.mCall, this.mListener, this.mResponse);
            }
          }

          if (status == 401 && this.mTransport.authCount++ == 0)
          {
            log.debug("Trying call again, this time not forcing basic");
            // basic authentication failed, retry without
            return this.mTransport.asyncCall(this.mCall, this.mListener, this.mResponse);
          }
          else if (status == 401)
          {
            // We used to set to false here to retry basic. But this messes
            // up FBA cookies. So now, we assume that if basic succeeds we'll
            // never reach here. If we do, basic failed and we should no longer
            // try it.
            bypassBasic[this.mCall.transportURI] = true;
          }
          else if (status == 503 && this.mRetryCount < retryLimit)
          {
            // Exchange gives this when busy. Try again with exponential delays
            this.mRetryCount++;
            log.info("Retrying request after 503 error");
            callLater( function _retryAsyncCall() {
              this.mTransport.asyncCall(this.mCall, this.mListener, this.mResponse);
            }.bind(this), retryDelays[this.mRetryCount]);
            return;
          }
        }
        else if (this.mTransport.authCount > 0)
        {
          if (!bypassBasic[this.mCall.transportURI])
          {
            // a successful non-Basic authentication, don't try basic in the future
            log.config("We won't try basic authentication for " + this.mCall.transportURI);
            bypassBasic[this.mCall.transportURI] = true;
          }
        }

        // If we use progress, then the response was processed as text in progress.
        if (!this.usedProgress) {
          let contentType = this.mRequest.channel.contentType;
          if (contentType == 'text/plain')
          {
            log.debug("request returned text \r\n" + request.responseText.substr(0, 1200) +
              ((request.responseText.length < 1200) ? "" : " ...truncated"));
          }

          // My test server returns a content type of application/xml but returns a login web page.
          //  Detect and switch to text/html
          let re = new RegExp("^<!DOCTYPE HTML", "i");
          if (re.test(request.responseText))
            contentType = 'text/html';

          if (contentType == "text/plain")
          {
            re = new RegExp("^<html><head>");
            if (re.test(request.responseText))
              contentType = 'text/html';
          }

          if (!this.mTriedFBA && (contentType == 'text/html'))
          {
            this.mTriedFBA = true;
            // The spec usually has a username, but FBA does not want that.
            log.config("request failed, returning html, trying FBA to url " + this.mCall.transportURI);
            // Let's try the FBA form with username and password fields
            let username = this.mTransport.domain && this.mTransport.domain.length ?
                             this.mTransport.domain + "\\" + this.mTransport.user :
                             this.mTransport.user;
            let self = this;

            EwsFBA.doFba(username, this.mTransport.password, this.mCall.transportURI,
              function _doFbaCallback(aStatus)
              {
                log.config("doFba returned status " + aStatus);
                if (aStatus == EwsFBA.FBA_SUCCEEDED)
                {
                  bypassBasic[self.mCall.transportURI] = true;
                  return self.mTransport.asyncCall(self.mCall, self.mListener, self.mResponse);
                }
                else
                {
                  // Assign some phony HTML errors for different results
                  if (self.mResponse)
                  {
                    if (aStatus == EwsFBA.FBA_AUTHERROR)
                      self.mResponse.htmlStatus = 1401;
                    else
                      self.mResponse.htmlStatus = 1000 + status;
                  }
                  if (self.mListener)
                    self.mListener.handleResponse(self.mResponse, self.mCall, Cr.NS_ERROR_FAILURE, true);
                }
              });
            return;
          }
        }

        this.doHandle(evt);
        break;
      }
      case 'error':
      case 'abort':
      case 'timeout':
      {
        let request = evt.target;
        if (request && this.mCall) {
          if (evt.type == 'timeout')
            log.debug('http request error type ' + evt.type +
                      ' to URL <' + this.mCall.transportURI +
                      '> status=' + request.status +
                      ' statusText: ' + request.statusText);
          else
            log.config('http request error type ' + evt.type +
                      ' to URL <' + this.mCall.transportURI +
                      '> status=' + request.status +
                      ' statusText: ' + request.statusText);
        }
        else
          log.warn('http request error, request or call is missing');
        if (this.mCall && request && request.status && evt.type != 'timeout')
          log.debug('call envelope:\n' + stringXMLResponse(this.mCall.envelope));
        if (this.mCertError)
        {
          // we will handle the response after returning from the certificate dialog
          return;
        }
        if (this.mResponse && request)
        {
          this.mResponse.message = request.responseXML;
          this.mResponse.htmlStatus = request.status;
          this.mResponse.htmlText = request.statusText;
        }

        if (this.mListener)
        {
          let result = Cr.NS_ERROR_FAILURE;
          if (evt.type == "abort")
            result = Cr.NS_ERROR_ABORT;
          else if (evt.type == "timeout")
            result = Cr.NS_ERROR_NET_TIMEOUT;
          this.mListener.handleResponse(this.mResponse, this.mCall, result, true);
        }
        break;
      }
      default:
      {
        log.error('unhandled SoapTransport event ' + evt.type);
        return;
      }
    }

    this.mCall = null;
    this.mListener = null;
    this.mResponse = null;
  } catch(e) {re(e);}},

  // send the response back to the caller
  doHandle(evt) {
    let request = evt.target;
    let type = evt.type;
    let done = type != "progress";
    if (done) {
      this.mResponse.message = request.responseXML;
      this.mResponse.htmlStatus = request.status;
      this.mResponse.htmlText = request.statusText;
      this.mRequest = null;
    }

    // Detect parser error and try to reparse
    try {
      let needReparse = this.mCall.noParse && !this.usedProgress;
      let xmlDocument = request.responseXML;
      if (xmlDocument && xmlDocument.documentElement.tagName == "parsererror")
      {
        needReparse = true;
        log.warn("Error parsing response, we'll try to purge invalid XML characters and reparse");
      }
      if (needReparse)
      {
        let data = request.responseText;
        if (!this.mCall.noParse) // Don't log for the expected GetOnline call
          log.debug("responseText is:\n" + data);

        // Try to purge bad characters from the raw text
        data = data.replace(/&\#x(?:[0-8BCEF]|(?:1[0-9A-F])|(?:FFF[EF]));/gi, "");

        // now reparse
        let parser = new DOMParser();
        if (this.mResponse)
          this.mResponse.message = parser.parseFromString(data, "application/xml");
      }
    } catch (e) { log.warn("Error while trying to reparse: " + e);}

    if (this.mListener)
      this.mListener.handleResponse(this.mResponse, this.mCall, Cr.NS_OK, done);
    else
      log.error('missing listener');
  }
}
