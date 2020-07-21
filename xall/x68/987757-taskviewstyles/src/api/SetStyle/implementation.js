var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var SetStyle = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      SetStyle: {
        set: function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.setProperty(property, value);
          }
        }
      }
    }
  }
};