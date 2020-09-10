var myServices = ChromeUtils.import("resource://gre/modules/Services.jsm");
var myMailServices = ChromeUtils.import("resource:///modules/MailServices.jsm");
var Services = myServices.Services;
var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      myapi : {
        SetVersionHeader(Version) {
          var win = Services.wm.getMostRecentWindow("msgcompose");
          var gCompose = win["gMsgCompose"];
          gCompose.compFields.setHeader("Version",Version);
          console.log("Tried to set header with " + Version);
        }
       	},
      }
    }
  };
