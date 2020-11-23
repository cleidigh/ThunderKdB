var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("OppositeTodaySubpane@Sungho.Hwang");


var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      myapi: {
          setOne: function(id, property, cloneThree, todayPane) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var cloneThree = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('mini-day-box').cloneNode(3);
                 cloneThree.style.setProperty('background-color', '#303030', 'important');
                 cloneThree.style.setProperty('color', '#F1F1F1', 'important');
                 cloneThree.style.setProperty('border', '1px solid #F1F1F1', 'important');
            var todayPane = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('minimonth-pane');
            element.insertBefore(cloneThree, todayPane);
          }
          },
          setTwo: function(id, property, cloneFour, todayTree) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var cloneFour = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('mini-day-box').cloneNode(4);
                 cloneFour.style.setProperty('background-color', '#303030', 'important');
                 cloneFour.style.setProperty('color', '#F1F1F1', 'important');
                 cloneFour.style.setProperty('border', '1px solid #F1F1F1', 'important');
            var todayTree = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('folderTree');
            element.insertBefore(cloneFour, todayTree);
          }
          },
          setThree: function(id, property, cloneOne) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var cloneOne = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('mini-day-box').cloneNode(1);
                 cloneOne.style.setProperty('background-color', '#303030', 'important');
                 cloneOne.style.setProperty('color', '#F1F1F1', 'important');
                 cloneOne.style.setProperty('border', '1px solid #F1F1F1', 'important');
            element.appendChild(cloneOne);
}
  },
          setFour: function(id, property, cloneTwo) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var cloneTwo = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('mini-day-box').cloneNode(2);
                 cloneTwo.style.setProperty('background-color', '#303030', 'important');
                 cloneTwo.style.setProperty('color', '#F1F1F1', 'important');
                 cloneTwo.style.setProperty('border', '1px solid #F1F1F1', 'important');
            element.appendChild(cloneTwo);
}
  },
          setFive: function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.allowEvent = value;
          }
          },
          setSix: function(id, property, childOne) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var childOne = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('ltnSidebar').firstChild;
            element.removeChild(childOne);
}
  },
          setSeven: function(id, property, childTwo) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var childTwo = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('folderPaneBox').childNodes[1];
            element.removeChild(childTwo);
}
  },
          setEight: function(id, property, childThree) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var childThree = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('ltnSidebar').lastChild;
            element.removeChild(childThree);
}
  },
          setNine: function(id, property, childFour) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var childFour = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('folderPaneBox').lastChild;
            element.removeChild(childFour);
}
  },
          setTen: function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.width = value;
}
  },
          setEleven: function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.height = value;
}
  },
          setTwelve: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
           window.document.getElementById("folderPaneBox").style.backgroundColor = "currentColor";
           element.appendChild(imageTb4);
          }
        },
          setThirteen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                var LastChildOne = window.document.getElementById("folderPaneBox").lastChild;
           element.removeChild(LastChildOne);
          }
        },
          setFourteen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
           element.appendChild(imageTb4);
          }
        },
          setFifteen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                var LastChildTwo = window.document.getElementById("ltnSidebar").lastChild;
           element.removeChild(LastChildTwo);
          }
        }
}
}
}
}