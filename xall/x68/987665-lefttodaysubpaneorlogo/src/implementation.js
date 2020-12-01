var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("OppositeTodaySubpane@Sungho.Hwang");

var myapi = class extends ExtensionCommon.ExtensionAPI {
  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
        return;
    }
    const Cu = Components.utils;
    const rootURI = this.extension.rootURI.spec;
    for (let module of Cu.loadedModules) {
        if (module.startsWith(rootURI)) {
            Cu.unload(module);
            };
    }
    const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
    Services.obs.notifyObservers(null, "startupcache-invalidate", null);
    }
  getAPI(context) {
  extension.callOnClose(this)
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
          setSix: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var sidebar = window.document.getElementById("ltnSidebar");
            var querySix = window.document.querySelectorAll("#ltnSidebar>#mini-day-box")[0];
            if (querySix.length = 1) { sidebar.removeChild(querySix); };
              }
          },
          setSeven: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var folderpaneBox = window.document.getElementById("folderPaneBox");
            var querySeven = window.document.querySelectorAll("#folderPaneBox>#mini-day-box")[0];
            if (querySeven.length = 1) { folderpaneBox.removeChild(querySeven); };
              }
          },
          setEight: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var sidebar = window.document.getElementById("ltnSidebar");
            var sidebarLastChild = window.document.getElementById("ltnSidebar").lastChild;
            var queryEightOne = window.document.querySelectorAll("#ltnSidebar>#mini-day-box")[0];
            var queryEightTwo = window.document.querySelectorAll("#ltnSidebar>#mini-day-box")[1];
            if (queryEightTwo == null) { sidebar.removeChild(queryEightOne); } else {sidebar.removeChild(queryEightTwo);};
              }
          },
          setNine: function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var folderpaneBox = window.document.getElementById("folderPaneBox");
            var folderpaneBoxLastChild = window.document.getElementById("folderPaneBox").lastChild;
            var queryNineOne = window.document.querySelectorAll("#folderPaneBox>#mini-day-box")[0];
            var queryNineTwo = window.document.querySelectorAll("#folderPaneBox>#mini-day-box")[1];
            if (queryNineTwo == null) { folderpaneBox.removeChild(queryNineOne); } else {folderpaneBox.removeChild(queryNineTwo);};
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
                element.appendChild(imageTb4);
              }
          },
          setThirteen: function() {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                var folderpaneBox = window.document.getElementById("folderPaneBox");
                var queryThirteen = window.document.querySelector("#folderPaneBox>image");
           if (queryThirteen.length = 1) {folderpaneBox.removeChild(queryThirteen); };
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
          setFifteen: function() {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                var sidebar = window.document.getElementById("ltnSidebar");
                var queryFifteen = window.document.querySelector("#ltnSidebar>image");
           if (queryFifteen.length = 1) {sidebar.removeChild(queryFifteen); };
                    }
                },
          setSixteen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                window.document.getElementById("folderPaneBox").style.backgroundColor = 'white';
              }
          },
          setSeventeen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                window.document.getElementById("folderPaneBox").style.backgroundColor = '#fff';
              }
          },
          setEighteen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                window.document.getElementById("folderPaneBox").style.backgroundColor = '#38383D';
              }
          },
          setNineteen: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                window.document.getElementById("folderPaneBox").style.backgroundColor = '#303030';
              }
          },
          setTwenty: function(id, property, value) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                window.document.getElementById("folderPaneBox").style.backgroundColor = 'black';
                   }
                }
            }
        }
    }
    close() {
                    let windows = Services.wm.getEnumerator("mail:3pane");
                    while (windows.hasMoreElements()) {
                        let window = windows.getNext();
                   var sidebarQueryTwo = window.document.querySelectorAll("#ltnSidebar>#mini-day-box")[0];
                   var folderQueryTwo = window.document.querySelectorAll("#folderPaneBox>#mini-day-box")[0];
                   var folderpaneBox = window.document.getElementById("folderPaneBox");
                   var sidebar = window.document.getElementById("ltnSidebar");
                   var folderQueryOne= window.document.querySelector("#folderPaneBox>image");
                   var sidebarQueryOne = window.document.querySelector("#ltnSidebar>image");
                   if (folderQueryTwo.length = 2) {folderpaneBox.removeChild(folderQueryTwo)[0]} else if (folderQueryTwo.length = 1) {folderpaneBox.removeChild(folderQueryTwo)[0]};
                   if (sidebarQueryTwo.length = 2) {sidebar.removeChild(sidebarQueryTwo)[0]; } else if (sidebarQueryTwo.length = 1) {sidebar.removeChild(sidebarQueryTwo)[0]; };
                   var folderQueryThree = window.document.querySelectorAll("#folderPaneBox>#mini-day-box")[0];
                   var sidebarQueryThree = window.document.querySelectorAll("#ltnSidebar>#mini-day-box")[0];
                   if (folderQueryOne == null) {folderpaneBox.removeChild(folderQueryThree)} else  {folderpaneBox.removeChild(folderQueryOne)};
                   if (sidebarQueryOne == null) {sidebar.removeChild(sidebarQueryThree); } else {sidebar.removeChild(sidebarQueryOne); };
                   }
        Services.obs.notifyObservers(null, "startupcache-invalidate", null); 
    }
};