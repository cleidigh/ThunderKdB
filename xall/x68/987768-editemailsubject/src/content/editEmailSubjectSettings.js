var extSettings = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
var prefServiceBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");

var editEmailSubjectPrefs = {

  loadSettings: function() {
    document.addEventListener("dialogaccept", function() {editEmailSubjectPrefs.saveSettings()});
    document.getElementById("localOnly").checked = extSettings.getBoolPref("extensions.editEmailSubject.localOnly");
  },

  saveSettings: function() {
    extSettings.setBoolPref("extensions.editEmailSubject.localOnly",document.getElementById("localOnly").checked);
  }
}
