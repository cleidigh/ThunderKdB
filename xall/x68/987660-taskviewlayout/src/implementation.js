var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var taskContainer = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('calendar-task-details-container');

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      myapi: {
          setOne: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.width = value;
          }
          },
          setTwo: function(id, property, taskContainer) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            let taskContainer = window.document.getElementById('calendar-task-details-container');
            let taskTree = window.document.getElementById('calendar-task-tree');
            element.appendChild(taskContainer);
          }
          },
          setThree: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.display = value;
          }
          },
          setFour: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id).childNodes[0];
            element.style.height = value;
          }
          },
          setFive: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id).childNodes[1];
            element.style.flex = value;
          }
          },
          setSix: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.flexWrap = value;
          }
          },
          setSeven: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.height = value;
          }
          },
          setEight: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.flex = value;
          }
          },
          setNine: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.resize = value;
          }
          },
          setTen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.overflow = value;
          }
          },
          setEleven: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.style.flexDirection = value;
          }
          },
          setTwelve: function(id, property, taskTree) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            let taskContainer = window.document.getElementById('calendar-task-details-container');
            let taskTree = window.document.getElementById('calendar-task-tree');
            element.appendChild(taskTree);
          }
          },
          setThirteen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id).childNodes[0];
            element.display = value;
          }
          },
          setFourteen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.refresh(value);
          }
          }
}
  }
}
};