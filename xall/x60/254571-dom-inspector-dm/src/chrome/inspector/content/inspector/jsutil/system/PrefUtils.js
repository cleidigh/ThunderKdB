/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/***************************************************************
* PrefUtils -------------------------------------------------
*  Utility for easily using the Mozilla preferences system.
* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
* REQUIRED IMPORTS:
****************************************************************/
Components.utils.import("resource://gre/modules/Services.jsm");

//////////// global variables ////////////////////

//////////// global constants ////////////////////
const nsIPrefBranch = Components.interfaces.nsIPrefBranch;

////////////////////////////////////////////////////////////////////////////
//// class PrefUtils

var PrefUtils =
{
  mPrefs: null,

  init: function()
  {
    var prefService = XPCU.getService("@mozilla.org/preferences-service;1", "nsIPrefService");
    this.mPrefs = prefService.getBranch(null);
  },

  addObserver: function addObserver(aDomain, aFunction)
  {
    if (!this.mPrefs) this.init();

    var pbi = XPCU.QI(this.mPrefs, "nsIPrefBranch");
    if (pbi)
      pbi.addObserver(aDomain, aFunction, false);
  },

  removeObserver: function removeObserver(aDomain, aFunction)
  {
    if (!this.mPrefs) this.init();

    var pbi = XPCU.QI(this.mPrefs, "nsIPrefBranch");
    if (pbi)
      pbi.removeObserver(aDomain, aFunction);
  },

  setPref: function(aName, aValue)
  {
    if (!this.mPrefs) this.init();

    var type = this.mPrefs.getPrefType(aName);
    try {
      if (type == nsIPrefBranch.PREF_STRING) {
        if (Services.vc.compare(Services.appinfo.platformVersion, "58.0a1") >= 0) {  // MDN: setStringPref needs Gecko 58
          this.mPrefs.setStringPref(aName, aValue);
        } else {
          var str = Components.classes["@mozilla.org/supports-string;1"]
                              .createInstance(Components.interfaces.nsISupportsString);
          str.data = aValue;
          this.mPrefs.setComplexValue(aName, Components.interfaces.nsISupportsString, str);
        }
      } else if (type == nsIPrefBranch.PREF_BOOL) {
        this.mPrefs.setBoolPref(aName, aValue);
      } else if (type == nsIPrefBranch.PREF_INT) {
        this.mPrefs.setIntPref(aName, aValue);
      }else{
		  console.log("Pref undefined, PLEASE set it manually (choosing the right type)!:  "+aName+"="+aValue);
	  }
    } catch(ex) {
      debug("ERROR: Unable to write pref \"" + aName + "\".\n");
    }
  },

  getPref: function(aName)
  {
    if (!this.mPrefs) this.init();

    var type = this.mPrefs.getPrefType(aName);
    try {
      if (type == nsIPrefBranch.PREF_STRING) {
        if (Services.vc.compare(Services.appinfo.platformVersion, "58.0a1") >= 0) {
          return this.mPrefs.getStringPref(aName);
        }
        return this.mPrefs.getComplexValue(aName, Components.interfaces.nsISupportsString).data;
      } else if (type == nsIPrefBranch.PREF_BOOL) {
        return this.mPrefs.getBoolPref(aName);
      } else if (type == nsIPrefBranch.PREF_INT) {
        return this.mPrefs.getIntPref(aName);
      }else{
		  console.log("Pref undefined, PLEASE set it manually (choosing the right type)!:  "+aName);
	  }
    } catch(ex) {
      debug("ERROR: Unable to read pref \"" + aName + "\".\n");
    }
    return null;
  }
};
