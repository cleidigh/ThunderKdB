var myServices = ChromeUtils.import("resource://gre/modules/Services.jsm");
var Services = myServices.Services
const Cc = Components.classes;
const Ci = Components.interfaces

var oldPrefs = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return  {
      oldPrefs : {
        async getOldPrefs(preference,addon,typePref) {
          const PREF_BRANCH = "extensions." + addon + ".";
          const PREFS = {
            domain: ""};
          const myPrefsService = Cc["@mozilla.org/preferences-service;1"]
            .getService(Ci.nsIPrefService)
            .getBranch("extensions." + addon + ".");
          var prefs = Services.prefs.getBranch(PREF_BRANCH);
          var PrefValue;
          prefs = prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
          switch (typePref) {
            case "string":
              try {
               PrefValue = myPrefsService.getStringPref(preference);
              } catch(ex) {
                try {
                PrefValue = prefs.getCharPref(preference);
                } catch (ex){
                PrefValue = "";
                }
              }
              return PrefValue;
              break;
            case "boolean":
            try {
             PrefValue = myPrefsService.getBoolPref(preference);
            } catch(ex) {
              PrefValue = "";
            }
            return PrefValue;
              break;
          }
        }
      }
    }
  }
}
