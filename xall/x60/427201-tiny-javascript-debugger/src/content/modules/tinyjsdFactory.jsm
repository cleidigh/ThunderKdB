/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global Components: false, dump: false */
/* eslint no-invalid-this: 0 */

"use strict";

var EXPORTED_SYMBOLS = ["TinyjsdFactory"];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm"); /* global XPCOMUtils: false */
Components.utils.import("chrome://tinyJsd/content/modules/tinyjsdCommon.jsm"); /* global TinyjsdCommon: false */
Components.utils.import("resource://gre/modules/Services.jsm"); /* global Services: false */

const TinyjsdProtocolHandler_CID = Components.ID("{830e9d02-9dd2-4913-a596-a43a347acd49}");
const TinyjsdProtocolHandler_CONTRACTID = "@mozilla.org/network/protocol;1?name=tinyjsd";
const NS_TINYJSD_CLINE_SERVICE_CID = Components.ID("{7854d457-a141-4bf7-9bbc-f65b5f94f566}");

const NS_SIMPLEURI_CONTRACTID = "@mozilla.org/network/simple-uri;1";
const NS_STRING_INPUT_STREAM_CONTRACTID = "@mozilla.org/io/string-input-stream;1";
const NS_INPUT_STREAM_CHNL_CONTRACTID = "@mozilla.org/network/input-stream-channel;1";
const NS_IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";
const NS_CLINE_SERVICE_CONTRACTID = "@mozilla.org/commandlinehandler/general-startup;1?type=tinyjsd";

const {
  classes: Cc,
  interfaces: Ci,
  manager: Cm,
  results: Cr,
  utils: Cu,
  Constructor: CC
} = Components;
Cm.QueryInterface(Ci.nsIComponentRegistrar);

function DEBUG_LOG(str) {
  //  dump("tinyjsd-service.js: " + str + "\n");
}

function dispatch(callbackFunction, sleepTimeMs) {
  DEBUG_LOG("dispatch: " + sleepTimeMs);
  var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  timer.initWithCallback(callbackFunction, sleepTimeMs, Ci.nsITimer.TYPE_ONE_SHOT);
  return timer;
}

function dispatchEvent(callbackFunction, sleepTimeMs) {
  DEBUG_LOG("dispatchEvent: f=" + callbackFunction.name + "\n");

  // object for dispatching callback back to main thread
  var mainEvent = function(cbFunc, sleepTime) {
    this.cbFunction = cbFunc;
    this.sleepTime = sleepTime;
  };

  mainEvent.prototype = {
    QueryInterface: function(iid) {
      if (iid.equals(Ci.nsIRunnable) ||
        iid.equals(Ci.nsISupports)) {
        return this;
      }
      throw Components.results.NS_ERROR_NO_INTERFACE;
    },

    run: function() {
      DEBUG_LOG("dispatchEvent running mainEvent\n");
      if (this.sleepTime) {
        dispatch(this.cbFunction, this.sleepTime);
      }
      else
        this.cbFunction();
    },

    notify: function() {
      DEBUG_LOG("dispatchEvent got notified\n");
      if (this.sleepTime) {
        dispatch(this.cbFunction, this.sleepTime);
      }
      else
        this.cbFunction();
    }

  };

  var event = new mainEvent(callbackFunction, sleepTimeMs);
  var tm = Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager);

  // dispatch the event to the main thread
  tm.mainThread.dispatch(event, Ci.nsIThread.DISPATCH_NORMAL);

  return event;
}

function TinyjsdProtocolHandler() {}

TinyjsdProtocolHandler.prototype = {

  classDescription: "TinyJSD Protocol Handler",
  classID: TinyjsdProtocolHandler_CID,
  contractID: TinyjsdProtocolHandler_CONTRACTID,
  scheme: "tinyjsd",
  defaultPort: -1,
  protocolFlags: Ci.nsIProtocolHandler.URI_INHERITS_SECURITY_CONTEXT |
    Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE |
    Ci.nsIProtocolHandler.URI_NORELATIVE |
    Ci.nsIProtocolHandler.URI_NOAUTH |
    Ci.nsIProtocolHandler.URI_OPENING_EXECUTES_SCRIPT,

  QueryInterface: XPCOMUtils.generateQI(["nsIProtocolHandler"]),

  loadCssFile: function() {
    var ioServ = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    if (!ioServ)
      throw Components.results.NS_ERROR_FAILURE;

    var chromeRegistry = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
      .getService(Components.interfaces.nsIChromeRegistry);

    var chromeURI = ioServ.newURI("chrome://tinyjsd/skin/sourceCodeContent.css", "utf-8", null);
    var fileUri = chromeRegistry.convertChromeURL(chromeURI);
    var fileChannel = ioServ.newChannelFromURI(chromeURI);

    var rawInStream = fileChannel.open();

    var scriptableInStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
    scriptableInStream.init(rawInStream);
    var available = scriptableInStream.available();
    var fileContents = scriptableInStream.read(available);
    scriptableInStream.close();

    return fileContents;
  },

  newURI: function(aSpec, originCharset, aBaseURI) {
    DEBUG_LOG("newURI(): " + aSpec);

    if (!aSpec.startsWith("tinyjsd:")) {
      throw Components.results.NS_ERROR_FAILURE;
    }

    var uri = Cc[NS_SIMPLEURI_CONTRACTID].createInstance(Ci.nsIURI);
    try {
      // Gecko < 57
      uri.spec = aSpec;
    }
    catch (x) {
      aSpec = aSpec.substr(8);
      let i = aSpec.indexOf("?");
      try {
        // Gecko < 60
        uri.scheme = "tinyjsd";
        if (i >= 0) {
          uri.query = aSpec.substr(i + 1);
          uri.pathQueryRef = aSpec.substr(0, i);
        }
        else {
          uri.pathQueryRef = aSpec;
        }
      }
      catch (ex) {
        // Gecko >= 60
        uri = uri.mutate().setScheme("tinyjsd").finalize();
        if (i >= 0) {
          uri = uri.mutate().setQuery(aSpec.substr(i + 1)).finalize();
          uri = uri.mutate().setPathQueryRef(aSpec.substr(0, i)).finalize();
        }
        else {
          uri = uri.mutate().setPathQueryRef(aSpec).finalize();
        }
      }
    }

    return uri;
  },

  repeatChar: function(char, count) {
    count = Math.max(count || 0, 0);
    return new Array(count + 1).join(char);
  },

  padding: function(str, count, char) {
    if (Math.abs(count) <= str.length) {
      return str;
    }
    var m = Math.max((Math.abs(count) - str.length) || 0, 0);
    var pad = Array(m + 1).join(String(char || ' ').charAt(0));
    return (count < 0) ? pad + str : str + pad;
  },

  escapeHtml: function _escapeHtml(str) {
    // HTML sanitizing following
    // https://developer.mozilla.org/en-US/docs/XUL/School_tutorial/DOM_Building_and_HTML_Insertion#innerHTML_with_HTML_Escaping

    return str.replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  },

  newStringChannel: function(uriPath, contentType, contentCharset) {
    try {
      let url = unescape(uriPath);

      let ioServ = Cc[NS_IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);
      let channel = ioServ.newChannel(url, null, null);
      let origStream = channel.open();
      let targetURI = ioServ.newURI(unescape(uriPath), null, null);

      let sci = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
      sci.init(origStream);
      let data = sci.read(origStream.available());
      sci.close();

      DEBUG_LOG("data count: " + data.length);

      let srcHtml = '<html><head><style>\n';
      srcHtml += this.loadCssFile() + '\n';
      srcHtml += '</style></head>\n';
      srcHtml += '<body>\n<source-listing id="source-listing">\n';

      let srcLines = data.split(/\r?\n/);
      let padChars = String(srcLines.length).length;
      let i;

      for (i = 0; i < srcLines.length; i++) {
        srcHtml += '<line id="l' + (i + 1) + '"';
        srcHtml += '><margin x="f">   </margin><num>' + this.escapeHtml(this.padding((i + 1).toString(), padChars, ' ')) + '</num> ' + this.escapeHtml(srcLines[i]) + '</line>\n';
      }

      srcHtml += '</source-listing></body></html>\n';

      let inputStream = Cc[NS_STRING_INPUT_STREAM_CONTRACTID].createInstance(Ci.nsIStringInputStream);
      inputStream.setData(srcHtml, srcHtml.length);

      if (!contentCharset || contentCharset.length == 0) {
        let netUtil = ioServ.QueryInterface(Ci.nsINetUtil);
        let newCharset = {};
        let hadCharset = {};
        let mimeType;
        try {
          // Gecko >= 43
          mimeType = netUtil.parseResponseContentType(contentType, newCharset, hadCharset);
        }
        catch (ex) {
          // Gecko < 43
          mimeType = netUtil.parseContentType(contentType, newCharset, hadCharset);
        }

        contentCharset = newCharset.value;
      }


      let isc = Cc[NS_INPUT_STREAM_CHNL_CONTRACTID].createInstance(Ci.nsIInputStreamChannel);
      isc.setURI(targetURI);
      isc.contentStream = inputStream;


      let chan = isc.QueryInterface(Ci.nsIChannel);
      if (contentType && contentType.length > 0) chan.contentType = contentType;
      if (contentCharset && contentCharset.length > 0) chan.contentCharset = contentCharset;

      TinyjsdCommon.setLines(srcLines.length);

      return chan;
    }
    catch (ex) {
      DEBUG_LOG("ERROR in newStringChannel: " + ex);

      let ioServ = Cc[NS_IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);

      let targetURI = ioServ.newURI(unescape(uriPath), null, null);
      let srcHtml = '<html><head><link title="defaultstyle" rel="stylesheet" type="text/css"';
      srcHtml += ' href="chrome://tinyjsd/skin/tinyJsd.css"/></head>\n';
      srcHtml += '<body><pre>loading failed:\n' + ex.toString() + '\n';
      srcHtml += 'URI: ' + this.escapeHtml(unescape(uriPath));
      srcHtml += '</pre></body></html>\n';
      let isis = Cc[NS_STRING_INPUT_STREAM_CONTRACTID].createInstance(Ci.nsIStringInputStream);
      isis.setData(srcHtml, srcHtml.length);

      let isc = Cc[NS_INPUT_STREAM_CHNL_CONTRACTID].createInstance(Ci.nsIInputStreamChannel);
      isc.setURI(targetURI);
      isc.contentStream = isis;

      let chan = isc.QueryInterface(Ci.nsIChannel);
      chan.contentType = "text/html";
      chan.contentCharset = "UTF-8";
      return chan;
    }

  },

  newChannel: function(aURI) {
    let path = unescape(aURI.path ? aURI.path : aURI.filePath);
    DEBUG_LOG("newChannel: path: " + path);


    path = escape(TinyjsdCommon.resolveJetpackPath(path));
    DEBUG_LOG("newChannel: path 2: " + path);

    if (aURI.scheme == "tinyjsd") {
      var channel = this.newStringChannel(path, "text/html", "UTF-8");

      DEBUG_LOG("newChannel: " + channel);
      return channel;
    }


    throw Components.results.NS_ERROR_FAILURE;
  },

  allowPort: function(port, scheme) {
    // non-standard ports are not allowed
    return false;
  },

  startupCompleted: function() {}
};


function CmdLineHandler() {}

CmdLineHandler.prototype = {
  classDescription: "TinyJSD CommandLine Service",
  classID: NS_TINYJSD_CLINE_SERVICE_CID,
  contractID: NS_CLINE_SERVICE_CONTRACTID,
  flags: Components.interfaces.nsIClassInfo.SINGLETON,
  _xpcom_categories: [{
    category: "profile-after-change",
    entry: "aaa-tinyjsd"
  }, {
    category: "command-line-handler",
    entry: "c-tinyjsd"
  }],
  QueryInterface: XPCOMUtils.generateQI(["nsICommandLineHandler", "nsIFactory"]),

  // nsICommandLineHandler
  handle: function(cmdLine) {
    if (cmdLine.handleFlag("tinyjsd", false)) {
      cmdLine.preventDefault = false; // allow to open main app window

      DEBUG_LOG("opening Debugger\n");

      try {
        DEBUG_LOG("CmdHandler: opening main window");
        TinyjsdCommon.setStartupPhase();
        var wwatch = Cc["@mozilla.org/embedcomp/window-watcher;1"]
          .getService(Ci.nsIWindowWatcher);
        wwatch.openWindow(null, "chrome://tinyjsd/content/tinyjsd-main.xul", "_blank",
          "chrome,resizable,all", null);
        let insp = Cc["@mozilla.org/jsinspector;1"].getService(Ci.nsIJSInspector);
        insp.enterNestedEventLoop({
          value: 1
        });
      }
      catch (ex) {
        DEBUG_LOG("CmdHandler: caught exception");
      }
    }
  },

  helpInfo: "  -tinyjsd         Open the TinyJSD debugger window.\n",

  observe: function() {
    DEBUG_LOG("nothing to do\n");
  },

  lockFactory: function(lock) {}
};


var TinyjsdFactory = {
  startup: function(reason) {
    this.factories = [];

    DEBUG_LOG("Tinyjsd startup\n");

    this.factories.push(new Factory(CmdLineHandler));

    let catMan = Cc["@mozilla.org/categorymanager;1"].getService(Ci.nsICategoryManager);
    catMan.addCategoryEntry("command-line-handler", "c-tinyjsd", NS_CLINE_SERVICE_CONTRACTID,
      false, true);

    this.factories.push(new Factory(TinyjsdProtocolHandler));
  },

  shutdown: function(reason) {
    if (this.factories) {
      for (let fct of this.factories) {
        fct.unregister();
      }
    }
  }
};


class Factory {
  constructor(component) {
    this.component = component;
    this.register();
    Object.freeze(this);
  }

  createInstance(outer, iid) {
    if (outer) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return new this.component();
  }

  register() {
    Cm.registerFactory(this.component.prototype.classID,
      this.component.prototype.classDescription,
      this.component.prototype.contractID,
      this);
  }

  unregister() {
    Cm.unregisterFactory(this.component.prototype.classID, this);
  }
}
