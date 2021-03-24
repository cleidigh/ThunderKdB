var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var taskContainer = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('calendar-task-details-container');
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("FrameWhite@Sungho.Hwang");

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
  extension.callOnClose(this)
    return {
      myapi: {
        addFrame: function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.backgroundColor = value;
                    }
                }
            }
        }
    }
    close() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            window.document.getElementById("unifinder-searchBox").style.backgroundColor = "initial";
            window.document.getElementById("task-addition-box").style.backgroundColor = "initial";
                   }
        Services.obs.notifyObservers(null, "startupcache-invalidate", null); 
    }
};