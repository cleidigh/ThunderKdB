Components.utils.import("resource://gre/modules/Services.jsm");

UseBccInsteadC.UseBccInsteadCUtil =
{ 
  NOTHING: -1,
  TO: 0,
  CC: 1,
  BCC: 2,
  stringBundle: null,
  tbVersion: Components.classes["@mozilla.org/xre/app-info;1"].createInstance(Components.interfaces.nsIXULAppInfo).version,
  prefs: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
  consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),

  getArrayCount: function(array)
  {
    if(array instanceof Components.interfaces.nsIArray)
    {
      return array.length;
    }

    if(array instanceof Components.interfaces.nsISupportsArray)
    {
      return array.Count();
    }

    // this means it is an array type we don't handle
    return -1;
  },

  getArrayElement: function(array, index, uuid)
  {
    if(array instanceof Components.interfaces.nsIArray)
    {
      return array.queryElementAt(index, uuid);
    }

    if(array instanceof Components.interfaces.nsISupportsArray)
    {
      return array.GetElementAt(index).QueryInterface(uuid);
    }

    return null;
  },

  getOsType: function()
  {
    // Returns "WINNT" on Windows Vista, XP, 2000, and NT systems;
    // "Linux" on GNU/Linux; and "Darwin" on Mac OS X.
    return Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
  },

  logToConsole: function(source, message)
  {
    var msg = "UseBccInsteadC." + source + "():\n\   " + message;
    this.consoleService.logStringMessage(msg);
    msg = null;
  },

  setIntPref: function(prefName, value)
  {
    this.prefs.setIntPref(prefName, value);
  },

  getIntPref: function(prefName, defaultValue)
  {
    var result = defaultValue;

    if (this.prefs.getPrefType(prefName) == this.prefs.PREF_INT)
    {
      result = this.prefs.getIntPref(prefName);
    }

    return result;
  },

  setBoolPref: function(prefName, value)
  {
    this.prefs.setBoolPref(prefName, value);
  },

  getBoolPref: function(prefName, defaultValue)
  {
    var result = defaultValue;

    if (this.prefs.getPrefType(prefName) == this.prefs.PREF_BOOL)
    {
      result = this.prefs.getBoolPref(prefName);
    }

    return result;
  },

  getCharPref: function(prefName, defaultValue)
  {
    var result = defaultValue;

    if (this.prefs.getPrefType(prefName) == this.prefs.PREF_STRING)
    {
      result = this.prefs.getCharPref(prefName);
    }

    return result;
  },

  isTB2: function()
  {
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
    return (versionChecker.compare(this.tbVersion, "3.0") < 0);
  },

  isTB3_3: function()
  {
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
    return (versionChecker.compare(this.tbVersion, "3.3") >= 0);
  },

  isTB31: function()
  {
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
    return (versionChecker.compare(this.tbVersion, "31") >= 0);
  },

  isTB24: function()
  {
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
    return (versionChecker.compare(this.tbVersion, "24") >= 0);
  },


  trim: function(stringToTrim)
  {
    return stringToTrim.replace(/^\s+|\s+$/g,"");
  },

  getLocalizedString: function(arg)
  {
    var stringBundleService;
    var result = arg;

    try
    {
      if(!this.stringBundle)
      {
// Changed for TB 63
//        stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService().QueryInterface(Components.interfaces.nsIStringBundleService);
//        this.stringBundle = stringBundleService.createBundle ("chrome://usebccinsteadC/locale/prefs.properties");
        this.stringBundle =  Services.strings.createBundle("chrome://usebccinsteadC/locale/prefs.properties");
      }

      if(this.stringBundle)
      {
        result = this.stringBundle.GetStringFromName(arg);
      }
    }
    finally
    {
      return result;
    }
  }
}
