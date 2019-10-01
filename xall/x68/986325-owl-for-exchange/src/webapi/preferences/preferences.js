var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

function getBooleanValue (aPrefName) {
  return Services.prefs.getBranch(this.branch).getBoolPref(aPrefName, false);
}
function getNumberValue (aPrefName) {
  return Services.prefs.getBranch(this.branch).getIntPref(aPrefName, 0);
}
function getStringValue (aPrefName) {
  return Services.prefs.getBranch(this.branch).getStringPref(aPrefName, "");
}
function setBooleanValue (aPrefName, aValue) {
  Services.prefs.getBranch(this.branch).setBoolPref(aPrefName, aValue);
}
function setNumberValue (aPrefName, aValue) {
  Services.prefs.getBranch(this.branch).setIntPref(aPrefName, aValue);
}
function setStringValue (aPrefName, aValue) {
  Services.prefs.getBranch(this.branch).setStringPref(aPrefName, aValue);
}
function resetValue (aPrefName) {
  Services.prefs.getBranch(this.branch).clearUserPref(aPrefName);
}

this.preferences = class extends ExtensionAPI {
  getAPI(context) {
    return {
      globalPrefs: {
        branch: "",
        getBooleanValue,
        getNumberValue,
        getStringValue,
        setBooleanValue,
        setNumberValue,
        setStringValue,
        resetValue,
      },
      extPrefs: {
        branch: "extensions." + context.extension.id.slice(0, context.extension.id.indexOf("@")) + ".",
        getBooleanValue,
        getNumberValue,
        getStringValue,
        setBooleanValue,
        setNumberValue,
        setStringValue,
        resetValue,
      },
    };
  }
};
