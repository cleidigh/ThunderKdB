var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var taskContainer = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('calendar-task-details-container');
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("TaskviewLayout@Sungho.Hwang");

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
  extension.callOnClose(this)
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
          },
          setFifteen: function(id, property, taskContainer, taskAdditionBox) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            let taskContainer = window.document.getElementById('calendar-task-details-container');
            let taskAdditionBox = window.document.getElementById('task-addition-box');
            element.insertBefore(taskContainer, taskAdditionBox);
           }
           },
          setSixteen: function() {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let taskAdditionBox = window.document.getElementById('task-addition-box');
            if (taskAdditionBox.hidden == true) { taskAdditionBox.hidden = false; };
                    }
                }
            }
        }
    }
    close() {
          let windows = Services.wm.getEnumerator("mail:3pane");
         while (windows.hasMoreElements()) {
         let window = windows.getNext();
          var calendarContent = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('calendarContent');
          var calendarDisplayDeck = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('calendarDisplayDeck');
          var taskAdditionBox = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('task-addition-box');
          var calendarTaskBox = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('calendar-task-box');
          var calendarTaskTree = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('calendar-task-tree');
          var calendarTaskDetailsContainer = Services.wm.getMostRecentWindow('mail:3pane').document.getElementById('calendar-task-details-container');
          taskAddtionBox.hidden = 'false';
          calendarDisplayDeck.style.width = '50%';
          calendarContent.appendChild(window.document.getElementById('calendar-task-details-container'));
          calendarTaskBox.style.display = 'flex';
          calendarTaskTree.childNodes[0].style.height = '3%';
          calendarTaskTree.childNodes[1].style.flex = '1';
          calendarTaskBox.style.flexWrap = 'none';
          taskAdditionBox.style.width = '100%';
          taskAdditionBox.style.height = '5%';
          calendarTaskDetailsContainer.style.height = '15%';
          calendarTaskTree.style.height = '55%';
          calendarTaskTree.style.flex = '1';
          calendarTaskDetailsContainer.style.flex = '1';
          calendarTaskBox.appendChild(window.document.getElementById('calendar-task-details-container'));
          calendarTaskTree.style.resize = 'vertical';
          calendarTaskTree.style.overflow = 'auto'; 
          calendarTaskBox.style.flexDirection = 'column';
          calendarDisplayDeck.style.width = '';
          calendarTaskBox.style.display = '';
          calendarTaskTree.childNodes[0].style.height = '';
          calendarTaskTree.childNodes[1].style.flex = '';
          calendarTaskBox.style.flexWrap = '';
          taskAdditionBox.style.width = '';
          taskAdditionBox.style.height = '';
          calendarTaskDetailsContainer.style.height = '';
          calendarTaskTree.style.height = '';
          calendarTaskTree.style.flex = '';
          calendarTaskDetailsContainer.style.flex = '';
          calendarTaskTree.style.resize = 'vertical';
          calendarTaskTree.style.overflow = 'auto'; 
          calendarTaskBox.style.flexDirection = '';
          calendarTaskTree.refresh();

}
        Services.obs.notifyObservers(null, "startupcache-invalidate", null); 
    }
};