if(!org) var org={};
if(!org.janek) org.janek={};

org.janek.identitychooser_prefshelper = function() {
  var self = this;
  var pub = {};

  self.prefsBranchName = "extensions.org.janek.IdentityChooser."
  self.prefs =
    Components.classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefService)
              .getBranch(self.prefsBranchName);

  pub.getDeprecatedPrefsBranch = function() {
    var deprPrefsBranchName = "org.janek.IdentityChooser."
    var deprPrefs =
      Components.classes["@mozilla.org/preferences-service;1"]
              .getService(Components.interfaces.nsIPrefService)
              .getBranch(deprPrefsBranchName);

    return deprPrefs;
  }

  pub.getPrefsBranch = function() {
    return self.prefs;
  }

  self.createDefaultColor = function(identity) {
    var defaultColors = [ "#FFCCCC",
                          "#FFCC99",
                          "#FFFF99",
                          "#DBFAB8",
                          "#99FF99",
                          "#CCCCFF",
                          "#FFCCFF",
                          "#FF6666",
                          "#FF9966",
                          "#CC9933",
                          "#CC9933" ];

    return defaultColors[Math.round(Math.random() * defaultColors.length)];
  }

  pub.getFullColorPrefKey = function(identity) {
    return self.prefsBranchName + self.getColorPrefKey(identity);
  }

  self.getColorPrefKey = function(identity) {
    return identity.key + ".color";
  }

  self.getColorizeIdentityPrefKey = function(identity) {
    return identity.key + ".colorizeIdentity";
  }

  pub.getFullIncludeInMenuPrefKey = function(identity) {
    return self.prefsBranchName + self.getIncludeInMenuPrefKey(identity);
  }

  pub.getFullWarnIfUsedPrefKey = function(identity) {
    return self.prefsBranchName + self.getWarnIfUsedPrefKey(identity);
  }

  self.getIncludeInMenuPrefKey = function(identity) {
    return identity.key + ".includeInMenu";
  }

  self.getMenuPositionPrefKey = function(identity) {
    return identity.key + ".menuPosition";
  }

  pub.getBoolPref = function(key) {
    return self.prefs.getBoolPref(key);
  }

  pub.setBoolPref = function(key, value) {
    return self.prefs.setBoolPref(key, value);
  }

  pub.getMenuPosition = function(identity) {
    return self.prefs.getCharPref(self.getMenuPositionPrefKey(identity));
  }

  pub.hasMenuPosition = function(identity) {
    return self.prefs.prefHasUserValue(self.getMenuPositionPrefKey(identity))
  }

  pub.setMenuPosition = function(identity, position) {
    self.prefs.setCharPref(self.getMenuPositionPrefKey(identity),
                           position);
  }

  pub.getPrefColor = function(identity) {
    self.storeColorPrefIfNone(identity);

    return self.prefs.getCharPref(self.getColorPrefKey(identity))
  }

  pub.getPrefColorizeIdentity = function(identity) {
    self.storeColorizeIdentityPrefIfNone(identity);

    return self.prefs.getBoolPref(self.getColorizeIdentityPrefKey(identity))
  }

  pub.setPrefColorizeIdentity = function(identity, enabled) {
    self.prefs.setBoolPref(self.getColorizeIdentityPrefKey(identity),
                           enabled);
  }

  pub.setPrefColor = function(identity, color) {
    self.prefs.setCharPref(self.getColorPrefKey(identity),
                           color);
  }

  pub.setPrefWarnIfUsedMode = function(identity, warnIfUsedMode) {
    self.prefs.setCharPref(self.getWarnIfUsedModePrefKey(identity),
                           warnIfUsedMode);
  }

  //
  // Stores an initial color for the identity in the prefs
  // if there is none.
  //
  // Does nothing if a color pref for the identity already exists.
  //
  self.storeColorPrefIfNone = function(identity) {
    var colorPrefKey = self.getColorPrefKey(identity);
    if(self.prefs.prefHasUserValue(colorPrefKey) == false)
      {
        self.prefs.setCharPref(colorPrefKey,
                               self.createDefaultColor(identity));
      }
  }

  self.storeColorizeIdentityPrefIfNone = function(identity) {
    var colorizeIdentityPrefKey = self.getColorizeIdentityPrefKey(identity);
    if(self.prefs.prefHasUserValue(colorizeIdentityPrefKey) == false)
      {
        self.prefs.setBoolPref(colorizeIdentityPrefKey,
                               true);
      }
  }

  pub.getPrefIncludeInMenu = function(identity) {
    self.storeIncludeInMenuPrefIfNone(identity);

    return self.prefs.getBoolPref(self.getIncludeInMenuPrefKey(identity))
  }

  //
  // Stores the initial value for the include-in-menu pref if it does
  // not exist yet.
  //
  // Does nothing if the pref for the identity already exists.
  //
  self.storeIncludeInMenuPrefIfNone = function(identity) {
    var includeInMenuPrefKey = self.getIncludeInMenuPrefKey(identity);
    if(self.prefs.prefHasUserValue(includeInMenuPrefKey) == false)
      {
        self.prefs.setBoolPref(includeInMenuPrefKey,
                               true);
      }
  }

  pub.setPrefIncludeInMenu = function(identity, enabled) {
    self.prefs.setBoolPref(self.getIncludeInMenuPrefKey(identity),
                           enabled);
  }

  pub.getPrefWarnIfUsed = function(identity) {
    self.storePrefWarnIfUsedPrefIfNone(identity);

    return self.prefs.getBoolPref(self.getWarnIfUsedPrefKey(identity))
  }

  pub.getPrefWarnIfUsedMode = function(identity) {
    self.storePrefWarnIfUsedModePrefIfNone(identity);

    return self.prefs.getCharPref(self.getWarnIfUsedModePrefKey(identity))
  }

  self.storePrefWarnIfUsedPrefIfNone = function(identity) {
    var warnIfUsedPrefKey = self.getWarnIfUsedPrefKey(identity);
    if(self.prefs.prefHasUserValue(warnIfUsedPrefKey) == false)
      {
        self.prefs.setBoolPref(warnIfUsedPrefKey,
                               false);
      }
  }

  self.storePrefWarnIfUsedModePrefIfNone = function(identity) {
    var warnIfUsedModePrefKey = self.getWarnIfUsedModePrefKey(identity);
    if(self.prefs.prefHasUserValue(warnIfUsedModePrefKey) == false)
      {
        self.prefs.setCharPref(warnIfUsedModePrefKey,
                               "always");
      }
  }

  self.getWarnIfUsedPrefKey = function(identity) {
    return identity.key + ".warnIfUsed";
  }

  self.getWarnIfUsedModePrefKey = function(identity) {
    return identity.key + ".warnIfUsedMode";
  }

  return pub;
};
