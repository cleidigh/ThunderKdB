/*
 * description: preference handling
 */
'use strict';

var {ThunderHTMLedit} = ChromeUtils.import('resource://thunderHTMLedit/content/thunderHTMLedit.jsm');
var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');

var EXPORTED_SYMBOLS = [];

ThunderHTMLedit.getPref = function(name) { return getPref(name, valuesBranch); }
ThunderHTMLedit.setPref = function(name, value) { setPref(name, value, valuesBranch); }
ThunderHTMLedit.definePreference = function(prefName, v) { dp(prefName, v); }

let valuesBranch = Services.prefs.getBranch('extensions.thunderHTMLedit.');
let defaultsBranch = Services.prefs.getDefaultBranch('extensions.thunderHTMLedit.');

//main structure to hold preference descriptors
let prefs = {};

const PT_STRING = 1;
const PT_INT = 2;
const PT_BOOL = 3;
const PT_UNICODE = 4;
const PT_JSON = 5;

ThunderHTMLedit.RegisterXPCOM('nsISupportsString', '@mozilla.org/supports-string;1', Components.interfaces.nsISupportsString);

function isValidPrefType(name, preference, branch) {
  let existingPrefType = branch.getPrefType(name);
  if (existingPrefType == branch.PREF_INVALID) return true;
  if (preference.type == PT_BOOL) return existingPrefType = branch.PREF_BOOL;
  if (preference.type == PT_INT) return existingPrefType = branch.PREF_INT;
  return existingPrefType == branch.PREF_STRING;
}

function getPref(name, branch) {
  try {
    let preference = { type: PT_JSON, defaultValue: null };
    if (name in prefs) preference = prefs[name];

    if (!isValidPrefType(name, preference, branch)) branch.clearUserPref(name);

    if (branch.getPrefType(name) != branch.PREF_INVALID)
      switch (preference.type) {
        case PT_STRING: return branch.getCharPref(name);
        case PT_INT: return branch.getIntPref(name);
        case PT_BOOL: return branch.getBoolPref(name);
        case PT_UNICODE: return branch.getComplexValue(name, Components.interfaces.nsISupportsString).data;
        case PT_JSON: return JSON.parse(branch.getCharPref(name));
      }
    //else return default value
    switch (preference.type) {
      case PT_JSON:
        return JSON.parse(JSON.stringify(preference.defaultValue));
      default:
        return preference.defaultValue;
    }
  } catch (e) { ThunderHTMLedit.handleException(e); }
  return null;
}

let encode_regex = /[^\u0000-\u007F]/g;
let encode_replacement = function(c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); };
function setPref(name, value, branch) {
  try {
    let preference = { type: PT_JSON, defaultValue: null };
    if (name in prefs) preference = prefs[name];
    if (!isValidPrefType(name, preference, branch)) branch.clearUserPref(name);

    switch (preference.type) {
      case PT_STRING: branch.setCharPref(name, value); break;
      case PT_INT: branch.setIntPref(name, value); break;
      case PT_BOOL: branch.setBoolPref(name, value); break;
      case PT_JSON:
        branch.setCharPref(name, JSON.stringify(value).replace(encode_regex, encode_replacement));
        break;
      case PT_UNICODE:
        let s = ThunderHTMLedit.XPCOM('nsISupportsString');
        s.data = value;
        branch.setComplexValue(name, Components.interfaces.nsISupportsString, s);
        break;
    }
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

function dp(prefName, v) {
  let preference = { type: PT_JSON, defaultValue: null };
  if ('type' in v) {
    if (v['type'].toLowerCase() == 'string') preference.type = PT_STRING;
    if (v['type'].toLowerCase() == 'int') preference.type = PT_INT;
    if (v['type'].toLowerCase() == 'bool') preference.type = PT_BOOL;
    if (v['type'].toLowerCase() == 'unicode') preference.type = PT_UNICODE;
    if (v['type'].toLowerCase() == 'json') preference.type = PT_JSON;
  }

  if ('default' in v) {
    if (preference.type == PT_JSON)
      preference.defaultValue = JSON.parse(JSON.stringify(v['default']));
    else
      preference.defaultValue = v['default'];
  }
  prefs[prefName] = preference;

  if ('default' in v)
    setPref(prefName, preference.defaultValue, defaultsBranch);
}
