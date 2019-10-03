/*
 * Copyright Adam Pritchard 2015
 * MIT License : http://adampritchard.mit-license.org/
 */


;(function() {

"use strict";
/*global module:false, chrome:false, Components:false*/

if (typeof(Utils) === 'undefined' && typeof(Components) !== 'undefined') {
  var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                               .getService(Components.interfaces.mozIJSSubScriptLoader);
  scriptLoader.loadSubScript('resource://markdown_here_common/utils.js');
}

// Common defaults
var DEFAULTS = {
  'math-enabled': true,
  'math-value': '<img src="https://chart.googleapis.com/chart?cht=tx&chl={urlmathcode}" alt="{mathcode}">',
  'hotkey': { shiftKey: false, ctrlKey: true, altKey: true, key: 'M' },
  'forgot-to-render-check-enabled': false,
  'header-anchors-enabled': false,
  'gfm-line-breaks-enabled': true
};


/*
 * Mozilla preferences storage helper
 */

var MozillaOptionsStore = {

  get: function(callback) {
    var that = this;
    this._sendRequest({verb: 'get'}, function(prefsObj) {
      that._fillDefaults(prefsObj, callback);
    });
  },

  set: function(obj, callback) {
    this._sendRequest({verb: 'set', obj: obj}, callback);
  },

  remove: function(arrayOfKeys, callback) {
    this._sendRequest({verb: 'clear', obj: arrayOfKeys}, callback);
  },

  // The default values or URLs for our various options.
  defaults: {
    'local-first-run': true,
    'main-css': {'__defaultFromFile__': 'resource://markdown_here_common/default.css', '__mimeType__': 'text/css'},
    'syntax-css': {'__defaultFromFile__': 'resource://markdown_here_common/highlightjs/styles/github.css', '__mimeType__': 'text/css'},
    'math-enabled': DEFAULTS['math-enabled'],
    'math-value': DEFAULTS['math-value'],
    'hotkey': DEFAULTS['hotkey'],
    'forgot-to-render-check-enabled': DEFAULTS['forgot-to-render-check-enabled'],
    'header-anchors-enabled': DEFAULTS['header-anchors-enabled'],
    'gfm-line-breaks-enabled': DEFAULTS['gfm-line-breaks-enabled']
  },

  // This is called both from content and background scripts, and we need vastly
  // different code in those cases. When calling from a content script, we need
  // to make a request to a background service (found in firefox/chrome/content/background-services.js).
  // When called from a background script, we're going to access the browser prefs
  // directly. Unfortunately, this means duplicating some code from the background
  // service.
  _sendRequest: function(data, callback) { // analogue of chrome.runtime.sendMessage
    var privileged, prefsBranch, prefKeys, prefsObj, i;

    privileged = (typeof(Components) !== 'undefined' && typeof(Components.classes) !== 'undefined');
    if (!privileged) {
      // This means that this code is being called from a content script.
      // We need to send a request from this non-privileged context to the
      // privileged background script.
      data.action = 'prefs-access';
      Utils.makeRequestToPrivilegedScript(
        document,
        data,
        callback);

      return;
    }

    prefsBranch = Components.classes['@mozilla.org/preferences-service;1']
                            .getService(Components.interfaces.nsIPrefService)
                            .getBranch('extensions.markdown-here.');

    if (data.verb === 'get') {
      prefKeys = prefsBranch.getChildList('');
      prefsObj = {};

      for (i = 0; i < prefKeys.length; i++) {
        // All of our legitimate prefs should be strings, but issue #237 suggests
        // that things may sometimes get into a bad state. We will check and delete
        // and prefs that aren't strings.
        // https://github.com/adam-p/markdown-here/issues/237
        if (prefsBranch.getPrefType(prefKeys[i]) !== prefsBranch.PREF_STRING) {
          prefsBranch.clearUserPref(prefKeys[i]);
          continue;
        }

        prefsObj[prefKeys[i]] = Utils.getMozJsonPref(prefsBranch, prefKeys[i]);
      }

      callback(prefsObj);
      return;
    }
    else if (data.verb === 'set') {
      for (i in data.obj) {
        Utils.setMozJsonPref(prefsBranch, i, data.obj[i]);
      }

      if (callback) callback();
      return;
    }
    else if (data.verb === 'clear') {
      if (typeof(data.obj) === 'string') {
        data.obj = [data.obj];
      }

      for (i = 0; i < data.obj.length; i++) {
        prefsBranch.clearUserPref(data.obj[i]);
      }

      if (callback) return callback();
      return;
    }
  }
};




// Choose which OptionsStore engine we should use.
// (This if-structure is ugly to work around the preprocessor logic.)
// Thunderbird, Postbox, Icedove
if (!this.OptionsStore) {
  this.OptionsStore = MozillaOptionsStore;
}

this.OptionsStore._fillDefaults = function(prefsObj, callback) {
  var that = this;

  var key, allKeys = [];
  for (key in that.defaults) {
    if (that.defaults.hasOwnProperty(key)) {
      allKeys.push(key);
    }
  }

  doNextKey();

  function doNextKey() {
    if (allKeys.length === 0) {
      // All done.
      // Ensure this function is actually asynchronous.
      Utils.nextTick(function() {
        callback(prefsObj);
      });
      return;
    }

    // Keep processing keys (and recurse)
    doDefaultForKey(allKeys.pop(), doNextKey);
  }

  // This function may be asynchronous (if XHR occurs) or it may be a straight
  // recursion.
  function doDefaultForKey(key, callback) {
    // Only take action if the key doesn't already have a value set.
    if (typeof(prefsObj[key]) === 'undefined') {
      if (that.defaults[key].hasOwnProperty('__defaultFromFile__')) {
        var xhr = new window.XMLHttpRequest();

        if (that.defaults[key]['__mimeType__']) {
          xhr.overrideMimeType(that.defaults[key]['__mimeType__']);
        }

        // Get the default value from the indicated file.
        xhr.open('GET', that.defaults[key]['__defaultFromFile__']);

        xhr.onreadystatechange = function() {
          if (this.readyState === this.DONE) {
            // Assume 200 OK -- it's just a local call
            prefsObj[key] = this.responseText;

            callback();
            return;
          }
        };

        xhr.send();
      }
      else {
        // Set the default.
        prefsObj[key] = that.defaults[key];
        // Recurse
        callback();
        return;
      }
    }
    else {
      // Key already has a value -- skip it.
      callback();
      return;
    }
  }
};

var EXPORTED_SYMBOLS = ['OptionsStore'];
this.EXPORTED_SYMBOLS = EXPORTED_SYMBOLS;

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());
