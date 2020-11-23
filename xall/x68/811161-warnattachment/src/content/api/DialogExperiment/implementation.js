// A basic UI for blocking dialogs
//
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


var DialogExperiment = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      DialogExperiment: {
        async getWarningDialog(title, text, checkboxhint){
            var check = {value: false};
            Services.prompt.alertCheck(null, title, text, checkboxhint, check);
            return check.value;
        },
        async getBlockingDialog(title, text){
            Services.prompt.alert(null, title, text)
        }
      }
    };
  }
};
