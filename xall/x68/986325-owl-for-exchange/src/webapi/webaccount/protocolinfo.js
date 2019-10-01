/// Properties used when creating the component factory.
var gProtocolInfoProperties = {
  contractID: "@mozilla.org/messenger/protocol/info;1?type=",
  classDescription: "Protocol Info",
  classID: Components.ID("{dbc990ef-78c4-40ae-ad95-dffb915204f4}"),
};

function ProtocolInfo() {
}

ProtocolInfo.prototype = {
  QueryInterface: QIUtils.generateQI([Ci.nsIMsgProtocolInfo]),
  // nsIMsgProtocolInfo
  get defaultLocalPath() {
    try {
      // Emulate nsIRelativeFilePref because it's no longer scriptable.
      let pref = Services.prefs.getCharPref("mail.root.webaccount-rel");
      if (pref[0] == "[") {
        let pos = pref.indexOf("]");
        let parent = Services.dirsvc.get(pref.slice(1, pos), Ci.nsIFile);
        let val = Components.classes["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        val.setRelativeDescriptor(parent, pref.slice(pos + 1));
        if (val.exists()) {
          return val;
        }
      }
    } catch (e) {
    }
    try {
      let val = Services.prefs.getComplexValue("mail.root.webaccount", Ci.nsIFile);
      if (val.exists()) {
        return val;
      }
    } catch (e) {
    }
    let val = Services.dirsvc.get("ProfD", Ci.nsIFile);
    val.append("webaccountMail");
    this.defaultLocalPath = val;
    return val;
  },
  set defaultLocalPath(val) {
    Services.prefs.setComplexValue("mail.root.webaccount", Ci.nsIFile, val);
    try {
      let parent = Services.dirsvc.get("ProfD", Ci.nsIFile);
      Services.prefs.setCharPref("mail.root.webaccount-rel", "[ProfD]" + val.getRelativeDescriptor(parent));
    } catch (e) {
      Services.prefs.clearUserPref("mail.root.webaccount-rel");
    }
  },
  serverIID: Ci.nsIMsgIncomingServer,
  requiresUsername: true,
  preflightPrettyNameWithEmailAddress: true,
  canDelete: true,
  canLoginAtStartUp: true,
  canDuplicate: true,
  getDefaultServerPort: function(isSecure) {
    return 443;
  },
  canGetMessages: true,
  canGetIncomingMessages: true,
  defaultDoBiff: true,
  showComposeMsgLink: true,
  foldersCreatedAsync: true,
};

gProtocolInfoProperties.factory = XPCOMUtils._getFactory(ProtocolInfo);
gModules.push(gProtocolInfoProperties);
