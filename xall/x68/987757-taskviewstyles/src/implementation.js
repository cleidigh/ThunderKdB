var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("TaskviewStyles@Sungho.Hwang");

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
  extension.callOnClose(this)
    return {
      myapi: {
        setOne: function(description, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var description = window.document.getElementById("calendar-task-details-description");
            description.style.setProperty(property, value);
          }
        },
        setTwo: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var convertToMessage = window.document.getElementById("calendar-context-converttomessage");
            convertToMessage.click(true);
                    }
                }
            }
        }
    }
    close() {
          let windows = Services.wm.getEnumerator("mail:3pane");
         while (windows.hasMoreElements()) {
         let window = windows.getNext();
         window.document.getElementById('calendar-task-details-description').style.setProperty('background-color', 'white');
         window.document.getElementById('calendar-task-details-description').style.setProperty('color', 'black');
         window.document.getElementById('calendar-task-details-description').style.setProperty('font-family', 'serif');
         window.document.getElementById('calendar-task-details-description').style.setProperty('font-weight', 'normal');
         window.document.getElementById('calendar-task-details-description').style.setProperty('font-style', 'normal');
         window.document.getElementById('calendar-task-details-description').style.setProperty('font-size', 'medium');
         window.document.getElementById('calendar-task-details-description').style.setProperty('text-align', 'inherit');
         window.document.getElementById('calendar-task-details-description').style.setProperty('text-align-last', 'inherit');
         window.document.getElementById('calendar-task-details-description').style.setProperty('white-space', 'pre-line');
         window.document.getElementById('calendar-task-details-description').style.setProperty('text-align-last', 'inherit');
         window.document.getElementById('calendar-task-details-description').style.setProperty('white-justify', 'inter-character');
}
        Services.obs.notifyObservers(null, "startupcache-invalidate", null); 
    }
};