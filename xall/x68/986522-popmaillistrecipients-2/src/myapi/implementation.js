myServices = ChromeUtils.import("resource://gre/modules/Services.jsm");
Services = myServices.Services;
var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      myapi : {
        async myExpandRecipients(name) {
          var win = Services.wm.getMostRecentWindow("msgcompose");
          var gCompose = win["gMsgCompose"];
          win.Recipients2CompFields(gCompose.compFields);
          win.expandRecipients()
          win.CompFields2Recipients(gCompose.compFields);
       	}
      }
    }
  }
};
