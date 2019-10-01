/*
 * description: Main file of ThunderHTMLedit.
 * example: Components.utils.import('resource://thunderHTMLedit/content/thunderHTMLedit.jsm');
 */
'use strict';

var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');
var {XPCOMUtils} = ChromeUtils.import('resource://gre/modules/XPCOMUtils.jsm');

var EXPORTED_SYMBOLS = ['ThunderHTMLedit'];

var ThunderHTMLedit = {};

//for modules
ThunderHTMLedit.modules = {};

//general exception handler.
ThunderHTMLedit.handleException = function(e, alertMessage) {
  try {
    let message;
    if (typeof e == 'string') message = e; else message = e.message;

    let sourceName = '';
    let sourceLine = '';
    let lineNumber = 0;
    let columnNumber = 0;

    if(e.QueryInterface) {
      if(e.QueryInterface(Components.interfaces.nsIException)) {
        sourceName = e.filename;
        if(e.location) sourceLine = e.location.sourceLine;
        lineNumber = e.lineNumber;
        columnNumber = e.columnNumber;
      }
    } else {
      if(e.stack) sourceLine = e.stack;
      if(e.sourceName) sourceName = e.stack;
      if(e.fileName) sourceName = e.fileName;
      if(e.lineNumber) lineNumber = e.lineNumber;
    }

    let errorObject = ThunderHTMLedit.XPCOM('nsIScriptError');
    errorObject.init('ThunderHTMLedit: ' + message, sourceName, sourceLine, lineNumber, columnNumber, errorObject.errorFlag, 'ThunderHTMLedit');
    Services.console.logMessage(errorObject);

    //debug only
    let prefsBranch = Services.prefs.getBranch('extensions.thunderHTMLedit.debug.');
    if ((prefsBranch.getPrefType('alertOnException') == prefsBranch.PREF_BOOL) && prefsBranch.getBoolPref('alertOnException'))
      Services.prompt.alert(null, 'ThunderHTMLedit exception [DEBUG]', 'Exception type: ' + typeof(e) + ', ' + e.toString() + "\n\n" + message);

  } catch(e2){
    //unlikelly, but happen while component is loaded...
    Components.utils.reportError("WARNING! ThunderHTMLedit.handleException() failed!\nError messages:\n" + e2.message + "\nOriginal exception:\n" + e.message);
  }
  if (alertMessage)
    Services.prompt.alert(null, 'ThunderHTMLedit exception', alertMessage);
}

ThunderHTMLedit.alert = function(message) {
  Services.prompt.alert(null, 'ThunderHTMLedit alert', message);
}

/////////////////////////////////////////////////////////////////////////////////////
//code to create component instances
let xpcomComponents = {};

ThunderHTMLedit.RegisterXPCOM = function(interfaceName, componentString, interfaceType) {
  xpcomComponents[interfaceName] = {comStr: componentString, iface: interfaceType };
}

//returns new XPCOM instance
ThunderHTMLedit.XPCOM = function(interfaceName) {
  let o = xpcomComponents[interfaceName];
  if (!o) throw Components.Exception('ThunderHTMLedit.XPCOM() >> unregistred component: "' + interfaceName + '"!');
  return Components.classes[o.comStr].createInstance(o.iface);
}

// common XPCOM components
let ci = Components.interfaces;
ThunderHTMLedit.RegisterXPCOM('nsIScriptError', '@mozilla.org/scripterror;1', ci.nsIScriptError);
ThunderHTMLedit.RegisterXPCOM('nsITimer', '@mozilla.org/timer;1', ci.nsITimer);

//services not imported from TB modules
XPCOMUtils.defineLazyServiceGetter(ThunderHTMLedit, "fontEnumerator", "@mozilla.org/gfx/fontenumerator;1", "nsIFontEnumerator");
XPCOMUtils.defineLazyServiceGetter(ThunderHTMLedit, "accounts", "@mozilla.org/messenger/account-manager;1", "nsIMsgAccountManager");

/////////////////////////////////////////////////////////////////////////////////////
//Do any per-window initializations/deinitialization
ThunderHTMLedit.onLoadWindow = function(event) {
  try {
    //event.target for 'load' is XULDocument, it's defaultView is same as global JS "window" object
    let win = event.target.defaultView;
    //loop over modules, calling its windowLoaded(win) function
      for (let key in ThunderHTMLedit.modules)
        if ('windowLoaded' in ThunderHTMLedit.modules[key])
           try {
            ThunderHTMLedit.modules[key].windowLoaded(win);
          } catch (e) {ThunderHTMLedit.handleException(e); }
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

ThunderHTMLedit.onUnloadWindow = function(event) {
  try {
    //event.target for 'unload' is XULDocument, it's defaultView, is same as global JS "window" object
    let win = event.target.defaultView;
    //release references, for garbage collector
    delete win.ThunderHTMLedit_;
    // delete win.ThunderHTMLedit;
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

// Called from thunderHTMLedit.js.
ThunderHTMLedit.initWindow = function(win) {

  //make single object to hold all our variables related to window.
  //use one object to avoid polluting window namespace.
  win.ThunderHTMLedit_ = {};

  //onload initializations
  win.addEventListener('load', ThunderHTMLedit.onLoadWindow, false);
  //ensure uninitialize on window close
  win.addEventListener('unload', ThunderHTMLedit.onUnloadWindow, false);

  //loop over modules, calling its initWindow(win) function
  for (let key in ThunderHTMLedit.modules)
    if ('initWindow' in ThunderHTMLedit.modules[key])
      try {
        ThunderHTMLedit.modules[key].initWindow(win);
      } catch (e) { ThunderHTMLedit.handleException(e); }
}

/////////////////////////////////////////////////////////////////////////////////////
//l10n
let l10n = Services.strings.createBundle("chrome://thunderHTMLedit/locale/thunderHTMLedit.properties");
ThunderHTMLedit.getl10nString = function(string) { try {
  return l10n.GetStringFromName(string);
} catch(e) { ThunderHTMLedit.handleException(e, string); return string; } }

/////////////////////////////////////////////////////////////////////////////////////
// timer
ThunderHTMLedit.makeTimer = function() {
  return {
    nsITimer: ThunderHTMLedit.XPCOM('nsITimer'),
    code: null,

    notify: function(aTimer) {
      if (typeof this.code == 'function')
        try {
          let code = this.code;
          if (this.nsITimer.type == this.nsITimer.TYPE_ONE_SHOT) this.code = null;
          code();
        } catch (e) {ThunderHTMLedit.handleException(e); }
    },

    QueryInterface: function(aIID) {
      if (aIID.equals(Components.interfaces.nsITimerCallback) || aIID.equals(Components.interfaces.nsISupports)) return this;
      throw Components.results.NS_ERROR_NO_INTERFACE;
    },

    startInterval: function(code, millisec) {
      this.nsITimer.cancel();
      this.code = code;
      this.nsITimer.initWithCallback(this, millisec, this.nsITimer.TYPE_REPEATING_SLACK);
    },

    startTimeout: function(code, millisec) {
      this.nsITimer.cancel();
      this.code = code;
      this.nsITimer.initWithCallback(this, millisec, this.nsITimer.TYPE_ONE_SHOT);
    },

    cancel: function(code, millisec) {
      this.nsITimer.cancel();
      this.code = null;
    },
  };
}

/////////////////////////////////////////////////////////////////////////////////////
// window  helpers

ThunderHTMLedit.isWindow = function(win) {
  return (typeof win == 'object') && ('document' in win);
}

ThunderHTMLedit.getWindowType = function(win) {
  if (!ThunderHTMLedit.isWindow(win) || !win.document.documentElement.hasAttribute('windowtype')) return false;
  return win.document.documentElement.getAttribute('windowtype');
}

ThunderHTMLedit.isComposerWindow = function(win) { return ThunderHTMLedit.getWindowType(win) == 'msgcompose' }
ThunderHTMLedit.isSourceEditorWindow = function(win) { return ThunderHTMLedit.getWindowType(win) == 'editor:source' }

//load other modules
Components.utils.import('resource://thunderHTMLedit/content/prefs.jsm');
Components.utils.import('resource://thunderHTMLedit/content/composer_utils.jsm');
Components.utils.import('resource://thunderHTMLedit/content/source-editor.jsm');
