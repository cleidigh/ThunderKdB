/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

try {
  if (typeof Cc === "undefined") var Cc = Components.classes;
  if (typeof Ci === "undefined") var Ci = Components.interfaces;
  if (typeof Cr === "undefined") var Cr = Components.results;
} catch (e) {}
 
var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

try {
  if (typeof aec_versionChecker === "undefined") var aec_versionChecker = Services.vc;
  if (typeof aec_currentVersion === "undefined") var aec_currentVersion = Services.appinfo.platformVersion;  
} catch (e) {}

var aedebug = false;
var aedebugFile = null;
try {
  aedebug = Cc["@mozilla.org/preferences-service;1"].
  getService(Ci.nsIPrefBranch).getBoolPref(
    "extensions.attachextract_cont.debug");
  if (aedebug) {
    aedebug = Cc['@mozilla.org/network/file-output-stream;1'].
    createInstance(Ci.nsIFileOutputStream);
    aedebugFile = Cc["@mozilla.org/file/directory_service;1"].
    getService(Ci.nsIProperties).get("ProfD", Components
      .interfaces.nsIFile);
    aedebugFile.append('aec_debug.txt');
  }
} catch (e) {}

var argexpand = (aedebug) ? function(args) {
  var str = "";
  for (let i = 0; i < args.length; i++) {
    if (i > 0) str += ",";
    str += args[i] + "";
  }
  return str;
} : function() {
  return "";
};

var aedump = (aedebug) ? function() {
  var loglevel = 4;
  var errorlevel = (arguments.length > 1) ? arguments[1] : 0;
  if (errorlevel <= loglevel) {
    try {
      var str = (arguments[0] + "").replace(/\n/g, "\r\n");
      aedebug.init(aedebugFile, 0x02 | 0x10, 0664, 0);
      aedebug.write(str, str.length);
      aedebug.close();
    } catch (e) {
      dump("!NOT LOGGED: ");
    }
    dump(arguments[0]);
  }
} : function() {};

/* shortcut object to get & set ae's preferences.*/
function AEPrefs() {
  this.aeBranch = Cc["@mozilla.org/preferences-service;1"].
  getService(Ci.nsIPrefService).getBranch(
    "extensions.attachextract_cont.");
  this.prefService = Cc["@mozilla.org/preferences-service;1"]
    .getService(Ci.nsIPrefService);
  this.get = function get(pref, branch) {
    var ps = (typeof branch === "undefined") ? this.aeBranch : this.prefService
      .getBranch(branch);
    var type = ps.getPrefType(pref);
    if (type === ps.PREF_BOOL) return ps.getBoolPref(pref);
    if (type === ps.PREF_INT) return ps.getIntPref(pref);
    if (type === ps.PREF_STRING) return ps.getCharPref(pref);
    return null;
  };
  this.getComplex = function getComplex(pref, branch) {
    return ((typeof branch === "undefined") ? this.aeBranch : this.prefService
      .getBranch(branch)).getStringPref(pref);
  };
  this.getFile = function getFile(pref, branch) {
    return this.getComplex(pref, branch);
  };
  this.getRelFile = function getRelFile(pref, branch) {
    return this.getComplex(pref, branch).file;
  };
  this.getRelFileKey = function getRelFile(pref, branch) {
    return this.getComplex(pref, branch).relativeToKey;
  };
  this.set = function set(pref, value, branch) {
    var ps = (typeof branch === "undefined") ? this.aeBranch : this.prefService
      .getBranch(branch);
    var type = ps.getPrefType(pref);
    if (type === ps.PREF_BOOL) return ps.setBoolPref(pref, value);
    if (type === ps.PREF_INT) return ps.setIntPref(pref, value);
    if (type === ps.PREF_STRING) return ps.setCharPref(pref, value);
    return null;
  };
  this.setComplex = function setComplex(pref, value, branch) {
    return ((typeof branch === "undefined") ? this.aeBranch : this.prefService
      .getBranch(branch)).setStringPref(pref, value);
  };
  this.setFile = function setFile(pref, value, branch) {
    return this.setComplex(pref, value, branch);
  }
  this.setRelFile = function setRelFile(pref, value, key, branch) {
    var relFile = Cc["@mozilla.org/pref-relativefile;1"]
      .createInstance(Ci.nsIRelativeFilePref);
    var oldValue = (this.hasUserValue(pref, branch)) ? this.getComplex(pref,
      branch) : null;
    relFile.relativeToKey = key ? key : oldValue.relativeToKey;
    relFile.file = value ? value : oldValue.file;
    return this.setComplex(pref, relFile, branch);
  };
  this.hasUserValue = function hasUserValue(pref, branch) {
    return ((typeof branch === "undefined") ? this.aeBranch : this.prefService
      .getBranch(branch)).prefHasUserValue(pref);
  };
  this.clearUserPref = function clearUserPref(pref, branch) {
    return ((typeof branch === "undefined") ? this.aeBranch : this.prefService
      .getBranch(branch)).clearUserPref(pref);
  };
};