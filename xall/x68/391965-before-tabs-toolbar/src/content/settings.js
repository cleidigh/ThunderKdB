Preferences.addAll([
  { id: "extensions.btt.styleButton", type: "bool" },
]);

var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                      .getService(Components.interfaces.nsIPrefBranch);

function onLoad() {
  document.getElementById("blueButton").checked = prefs.getBoolPref("extensions.btt.styleButton");
}
