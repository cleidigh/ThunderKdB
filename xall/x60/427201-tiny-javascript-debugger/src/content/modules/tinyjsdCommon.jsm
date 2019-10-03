/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global Components: false */

'use strict';

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const CC = Components.Constructor;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/jsdebugger.jsm");

var EXPORTED_SYMBOLS = ["TinyjsdCommon", "JsdConsole"];

// addDebuggerToGlobal only allows adding the Debugger object to a global. The
// this object is not guaranteed to be a global (in particular on B2G, due to
// compartment sharing), so add the Debugger object to a sandbox instead.
var sandbox = Cu.Sandbox(CC('@mozilla.org/systemprincipal;1', 'nsIPrincipal')());
Cu.evalInSandbox(
  "Components.utils.import('resource://gre/modules/jsdebugger.jsm');" +
  "addDebuggerToGlobal(this);",
  sandbox
);

// hold the Debugger object for TinyJSD.
var dbg = sandbox.Debugger();

const NS_SCRIPTABLEINPUTSTREAM_CONTRACTID = "@mozilla.org/scriptableinputstream;1";
const NS_IOSERVICE_CONTRACTID = "@mozilla.org/network/io-service;1";

var gConsoleCallback = null;
var gRegistrationCompleted = false;

var JsdConsole = {
  log: function(str) {
    if (gConsoleCallback)
      gConsoleCallback.log(str);
    return "";
  },

  clear: function(str) {
    if (gConsoleCallback)
      gConsoleCallback.clear();
    return "";
  },

  getJsd: function() {
    if (gConsoleCallback)
      return gConsoleCallback.tinyjsd;
    return undefined;
  },

  /**
   * open new window
   * @param url      - String: url to open in new window
   * @param name     - String: window name
   * @param features - String: window features
   * @param args     - Array of String and/or number: window.arguments
   */
  openWindow: function(url, name, features, args) {
    let wwatch = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);

    let ma = null;
    let sup = null;
    if (args) {
      ma = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);

      if (typeof args === "string") {
        sup = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
        sup.data = args;
        ma.appendElement(sup, false);
      }
      else if (Array.isArray(args)) {
        for (let i = 0; i < args.length; i++) {
          sup = null;
          switch (typeof args[i]) {
            case "string":
              sup = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
              break;
            case "number":
              if (Math.floor(args[i]) == args[i]) {
                sup = Cc["@mozilla.org/supports-PRInt64;1"].createInstance(Ci.nsISupportsPRInt64);
              }
              else {
                sup = Cc["@mozilla.org/supports-float;1"].createInstance(Ci.nsISupportsFloat);
              }
              break;
          }
          if (sup) {
            sup.data = args[i];
            ma.appendElement(sup, false);
          }
        }
      }
    }

    wwatch.openWindow(null, url, name, features, ma);
  }
};

var TinyjsdCommon = {
  _cb: null,
  _tmpLog: "",
  _jsUnit: null,
  _scriptHook: null,
  _newObjectListener: null,
  _startupPhase: false,
  scriptStack: [],

  URL_OK: RegExp("^(file|chrome|resource|jar):", "i"),

  setTimeout: function(callbackFunction, sleepTimeMs) {
    var timer = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
    timer.initWithCallback(callbackFunction, sleepTimeMs, Ci.nsITimer.TYPE_ONE_SHOT);
    return timer;
  },


  setLines: function(count) {
    var cb = this._cb;
    this.setTimeout(function __cb() {
      cb(count, false);
    }, 0);
  },

  // register callback that gets called after a script has finished loading
  registerCb: function(func) {
    this._cb = func;
  },

  logData: function(str) {
    if (gConsoleCallback) {
      gConsoleCallback.log(str);
    }
    else {
      this._tmpLog += str;
    }
  },

  registerLogging: function(obj) {
    gConsoleCallback = obj;
    this.logData(this._tmpLog);
  },

  // activate tracking of creation of new global objects
  enableDebugger: function() {
    if (gRegistrationCompleted) return;
    var self = this;
    let oArr = dbg.findAllGlobals();

    for (let i in oArr) {
      try {
        dbg.addDebuggee(oArr[i]);
      }
      catch (ex) {}
    }

    gRegistrationCompleted = true;

    dbg.onNewGlobalObject = function(o) {
      this.addDebuggee(o);

      if (self._newObjectListener) {
        self._newObjectListener(o);
      }
    };
  },

  addNewObjectListener: function(func) {
    this._newObjectListener = func;
  },

  removeNewObjectListener: function() {
    this._newObjectListener = null;
  },

  stopDebugging: function() {
    this.removeNewObjectListener();
    gConsoleCallback = null;
    dbg.onError = undefined;
    dbg.onExceptionUnwind = undefined;
    dbg.onEnterFrame = undefined;
    dbg.onDebuggerStatement = undefined;
    dbg.uncaughtExceptionHook = null;
    dbg.onNewScript = undefined;
  },

  enableJsUnit: function(scriptFile) {
    this._jsUnit = scriptFile;
  },

  jsUnitEnabled: function() {
    return this._jsUnit ? true : false;
  },

  getJsUnitMainFile: function() {
    return this._jsUnit;
  },

  resolveJetpackPath: function(uriPath) {

    function getJarPath(aPath) {
      if (aPath.toLowerCase().search(/\.(jar|xpi)!/) > 0) {
        if (aPath.search(/^([a-z]+:\/|jar:)/) < 0) aPath = "jar:/" + aPath;
      }

      return aPath;
    }

    let path = uriPath;

    // detect SDK Addons
    let i = path.indexOf(" -> ");
    if (i > 0) {
      path = path.substr(i + 4);

      if (path.search(TinyjsdCommon.URL_OK) == 0 || path.startsWith("/")) {
        return getJarPath(path);
      }
    }

    return getJarPath(uriPath);
  },

  readFile: function(filePath) {
    // filePath: URL (String)

    var ioServ = Cc[NS_IOSERVICE_CONTRACTID].getService(Ci.nsIIOService);
    if (!ioServ)
      throw Components.results.NS_ERROR_FAILURE;

    var fileChannel = ioServ.newChannel(filePath, "UTF-8", null);

    var rawInStream = fileChannel.open();

    var scriptableInStream = Cc[NS_SCRIPTABLEINPUTSTREAM_CONTRACTID].createInstance(Ci.nsIScriptableInputStream);
    scriptableInStream.init(rawInStream);
    var available = scriptableInStream.available();
    var fileContents = scriptableInStream.read(available);
    scriptableInStream.close();
    return fileContents;
  },


  getConditionalBp: function(funcname, funcbody) {
    return "var " + funcname + " = function _jsdEval (callCount, recursionDepth) {" + funcbody + "}\n";
  },

  compileConditionalBp: function(funcname, funcbody) {
    let fnc = this.getConditionalBp(funcname, funcbody);
    return eval(fnc);
  },

  getDebugger: function() {
    return dbg;
  },

  getProperty: function(aObj, aKey) {
    let root = aObj;
    try {
      do {
        if (typeof(aObj.getOwnPropertyDescriptor) == "function") {
          const desc = aObj.getOwnPropertyDescriptor(aKey);
          if (desc) {
            if ("value" in desc) {
              return desc.value;
            }
            // Call the getter if it's safe.
            return this.hasSafeGetter(desc) ? desc.get.call(root).return : undefined;
          }
        }
        aObj = aObj.proto;
      } while (aObj);
    }
    catch (e) {
      // If anything goes wrong report the error and return undefined.
      return "Exception: " + e.toString();
    }
    return undefined;
  },

  hasSafeGetter: function(aDesc) {
    let fn = aDesc.get;
    return fn && fn.callable && fn.class == "Function" && fn.script === undefined;
  },

  setStartupPhase: function() {
    this._startupPhase = true;
  },

  startupCompleted: function() {
    if (this._startupPhase) {
      this._startupPhase = false;
      let insp = Cc["@mozilla.org/jsinspector;1"].getService(Ci.nsIJSInspector);
      insp.exitNestedEventLoop();
    }
  }

};
