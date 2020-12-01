var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("TaskviewStyles@Sungho.Hwang");

var SetStyle = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
  extension.callOnClose(this)
    return {
      SetStyle: {
        set: function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.setProperty(property, value);
          }
        },
        setTwo: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            window.document.getElementById('calendar-newevent-button').click(true);
          }
        },
        setThree: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            window.document.getElementById('task-newtask-button').click(true);
                    }
                },
        setFour: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            window.document.getElementById('task-actions-category').open = true;
                    }
                },
        setFive: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            window.document.getElementById('task-actions-markcompleted').open = true;
                    }
                },
        setSix: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            window.document.getElementById('task-actions-priority').open = true;
                    }
                },
        setSeven: function() {
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
}
        Services.obs.notifyObservers(null, "startupcache-invalidate", null); 
    }
};