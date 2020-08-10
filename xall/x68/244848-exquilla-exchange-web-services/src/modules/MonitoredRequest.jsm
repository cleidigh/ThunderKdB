/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2013 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

// This file monitors connections to possible NTLM-authenticated items, trying to solve the
//  NTLM mixed up connection issue of bug 698730
//
// For this to work, all requests to an NTLM host must go through this method.
// It works by only sending requests when no other requests are active, and
// resetting both the connection and the authentication when the username changes.
//

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;
const CE = Components.Exception;
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Cu.importGlobalProperties(["Node", "XMLHttpRequest", "XMLSerializer"]);
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("soap");
  return _log;
});

var EXPORTED_SYMBOLS = ["MonitoredRequest"];

let rexNegotiate = /^negotiate/i;

function AuthObserver(aChannel)
{
  // This object adds an observer that manipulates the WWW-Authenticate header.
  // nsHttpChannelAuthProvider::GetCredentialsForChallenge will only get
  // authentication credentials from the uri on the first challenge, so if
  // that first challenge is a doomed-to-fail negotiate, then ntlm will not
  // use the uri, instead using the cache which is wrong for servers with
  // multiple users each requiring separate connections.
  //
  this.channel = aChannel;
  //Utils.ewsLog.debug("new authObserver");
}

AuthObserver.prototype = {
  observe: function observe(aSubject, aTopic, aData) {
    switch (aTopic) {
      case "http-on-examine-response":
      let channel = aSubject;
      if ( (channel instanceof Ci.nsIHttpChannel) &&
           (channel === this.channel) )
      {
        let header = null;
        try {
          header = channel.getResponseHeader("WWW-Authenticate");
        } catch (e) {}
        if (header)
        {
          let lines = header.split("\n");
          let purgedLines = "";
          let changed = false;
          for (let index = 0; index < lines.length; index++)
          {
            //Utils.ewsLog.debug("WWW-Authenticate #" + index + " is " + lines[index]);
            if (!rexNegotiate.test(lines[index]))
              purgedLines += lines[index] + "\n";
            else
              changed = true;
          }
          if (changed)
            channel.setResponseHeader("WWW-Authenticate", purgedLines, false);
        }
      }
    }
  }
}

// Although a DOM document is a legitimate argument for send, it generates
// the junk warning inputEncoding deprecated (bug 966385). Serialize to
//  string to get rid of this.
    
var oSerializer = new XMLSerializer();

// bind this to a monitoredRequest instance
function completionListener(event)
{
  // callback to original event listener
  if (this.completion)
  {
    if (this.completion.handleEvent)
      this.completion.handleEvent(event);
    else
      this.completion(event);
    if (event.type == "progress")
      return;
  }

  Services.obs.removeObserver(this.authObserver, "http-on-examine-response");
}
  
function sendNow(aMonitoredRequest)
{
  let request = aMonitoredRequest.request;
  let uri = request.channel.URI;
  aMonitoredRequest.completion.mStartTime = Date.now();
  aMonitoredRequest.completion.mXhrTimeout = aMonitoredRequest.xhrtimeout;

  request.addEventListener("load", completionListener.bind(aMonitoredRequest), false);
  request.addEventListener("error", completionListener.bind(aMonitoredRequest), false);
  request.addEventListener("abort", completionListener.bind(aMonitoredRequest), false);
  request.addEventListener("timeout", completionListener.bind(aMonitoredRequest), false);
  if (aMonitoredRequest.useProgress)
    request.addEventListener("progress", completionListener.bind(aMonitoredRequest), false);
  if (Node.isInstance(aMonitoredRequest.message))
    request.send(oSerializer.serializeToString(aMonitoredRequest.message));
  else
    request.send(aMonitoredRequest.message);
}

function MonitoredRequest()
{
  this.request = new XMLHttpRequest();
  
  this.xhrtimeout = 210000;
  try {
    this.xhrtimeout = Services.prefs.getIntPref("extensions.exquilla.xhrtimeout");
  } catch (e) {}

  this.request.timeout = this.xhrtimeout;
  this.completion = null; // callback when request is done
  this.message = null;
  this.authObserver = null;
  this.useProgress = false;
}

// substitute for send() that resets connection if user changes
MonitoredRequest.prototype.sendMonitored = function sendMonitored(aMessage)
{
  let request = this.request;
  let uri = request.channel.URI;
  this.useProgress = this.completion.call.useProgress;

  this.authObserver = new AuthObserver(request.channel);
  Services.obs.addObserver(this.authObserver, "http-on-examine-response", false);
  this.message = aMessage;

  return sendNow(this);
}
