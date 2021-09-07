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
          setOne: async function(id, property, value, argument) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var cloneThree = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('mini-day-box').cloneNode(3);
                 cloneThree.style.setProperty('color', '#F1F1F1', 'important');
                 cloneThree.style.setProperty('border', '1px solid #F1F1F1', 'important');
            var rainbow = function() { window.setInterval(function() {
            var date = new Date();
            var sec = date.getSeconds();
            if (sec > 0 && sec < 9) { cloneThree.style.backgroundColor = "DarkRed"; };
            if (sec > 10 && sec < 19) { cloneThree.style.backgroundColor = "DarkOrange"; };
            if (sec > 20 && sec < 29) { cloneThree.style.backgroundColor = "DarkKhaki"; };
            if (sec > 30 && sec < 39) { cloneThree.style.backgroundColor = "DarkGreen"; };
            if (sec > 40 && sec < 49) { cloneThree.style.backgroundColor = "DarkCyan"; };
            if (sec > 50 && sec < 59) { cloneThree.style.backgroundColor = "DarkViolet"; };
            }); };
            rainbow();
            var todayPane = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('minimonth-pane');
            element.insertBefore(cloneThree, todayPane);
              }
          },
          setTwo: async function(id, property, value, argument) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var cloneFour = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('mini-day-box').cloneNode(4);
                 cloneFour.style.setProperty('color', '#F1F1F1', 'important');
                 cloneFour.style.setProperty('border', '1px solid #F1F1F1', 'important');
            var rainbow = function() { window.setInterval(function() {
            var date = new Date();
            var sec = date.getSeconds();
            if (sec > 0 && sec < 9) { cloneFour.style.backgroundColor = "DarkRed"; };
            if (sec > 10 && sec < 19) { cloneFour.style.backgroundColor = "DarkOrange"; };
            if (sec > 20 && sec < 29) { cloneFour.style.backgroundColor = "DarkKhaki"; };
            if (sec > 30 && sec < 39) { cloneFour.style.backgroundColor = "DarkGreen"; };
            if (sec > 40 && sec < 49) { cloneFour.style.backgroundColor = "DarkCyan"; };
            if (sec > 50 && sec < 59) { cloneFour.style.backgroundColor = "DarkViolet"; };
            }); };
            rainbow();
            var todayTree = Services.wm.getMostRecentWindow("mail:3pane").document.getElementById('folderTree');
            element.insertBefore(cloneFour, todayTree);
              }
          },
          setThree: async function(id, property, argument) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var timeOne = window.document.createXULElement("box");
            var funcTime = window.setInterval(function() {
            var date = new Date();
            var hr = date.getHours();
            var min = date.getMinutes();
            var sec = date.getSeconds();
            var day = "AM";
            if (hr == 12) { day = "PM"; };
            if (hr > 12) { day = "PM"; hr = hr-12; };
            if (hr < 10) { hr = "0" + hr; };
            if (hr == 0) { hr = 12; };
            if (sec < 10) { sec = "0" + sec; };
            if (min < 10) { min = "0" + min; };
            timeOne.textContent = " " + day + hr + ":" + min + ":" + sec + " "; 
            });
            timeOne.append(funcTime);
            timeOne.setAttribute('id', 'timeOne');
            timeOne.style.setProperty('font-size', '20px');
            timeOne.style.setProperty('font-weight', 'bold');
            timeOne.style.textAlign = "center";
            timeOne.margin = "auto";
            timeOne.style.padding = "15px";
            timeOne.style.setProperty('background-color', '#303030');
            timeOne.style.setProperty('color', '#F1F1F1');
            timeOne.style.setProperty('border', '1px solid #F1F1F1');
            timeOne.style.width = "auto";
            timeOne.style.height = "30px";
            element.appendChild(timeOne);
            var rainbow = function() { window.setInterval(function() {
            var date = new Date();
            var sec = date.getSeconds();
            if (sec > 0 && sec < 9) { timeOne.style.backgroundColor = "DarkRed"; };
            if (sec > 10 && sec < 19) { timeOne.style.backgroundColor = "DarkOrange"; };
            if (sec > 20 && sec < 29) { timeOne.style.backgroundColor = "DarkKhaki"; };
            if (sec > 30 && sec < 39) { timeOne.style.backgroundColor = "DarkGreen"; };
            if (sec > 40 && sec < 49) { timeOne.style.backgroundColor = "DarkCyan"; };
            if (sec > 50 && sec < 59) { timeOne.style.backgroundColor = "DarkViolet"; };
            }); };
            rainbow();
             }
         },
          setFour: async function(id, property, argument) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            var timeTwo = window.document.createXULElement("box");
            var funcTime = window.setInterval(function() {
            var date = new Date();
            var hr = date.getHours();
            var min = date.getMinutes();
            var sec = date.getSeconds();
            var day = "AM";
            if (hr == 12) { day = "PM"; };
            if (hr > 12) { day = "PM"; hr = hr-12; };
            if (hr < 10) { hr = "0" + hr; };
            if (hr == 0) { hr = 12; };
            if (sec < 10) { sec = "0" + sec; };
            if (min < 10) { min = "0" + min; };
            timeTwo.textContent = " " + day + hr + ":" + min + ":" + sec + " "; 
            });
            timeTwo.append(funcTime);
            timeTwo.setAttribute('id', 'timeTwo');
            timeTwo.style.setProperty('font-size', '20px');
            timeTwo.style.setProperty('font-weight', 'bold');
            timeTwo.style.textAlign = "center";
            timeTwo.margin = "auto";
            timeTwo.style.padding = "15px";
            timeTwo.style.setProperty('background-color', '#303030');
            timeTwo.style.setProperty('color', '#F1F1F1');
            timeTwo.style.setProperty('border', '1px solid #F1F1F1');
            timeTwo.style.width = "auto";
            timeTwo.style.height = "30px";
            element.appendChild(timeTwo);
            var rainbow = function() { window.setInterval(function() {
            var date = new Date();
            var sec = date.getSeconds();
            if (sec > 0 && sec < 9) { timeTwo.style.backgroundColor = "DarkRed"; };
            if (sec > 10 && sec < 19) { timeTwo.style.backgroundColor = "DarkOrange"; };
            if (sec > 20 && sec < 29) { timeTwo.style.backgroundColor = "DarkKhaki"; };
            if (sec > 30 && sec < 39) { timeTwo.style.backgroundColor = "DarkGreen"; };
            if (sec > 40 && sec < 49) { timeTwo.style.backgroundColor = "DarkCyan"; };
            if (sec > 50 && sec < 59) { timeTwo.style.backgroundColor = "DarkViolet"; };
            }); };
            rainbow();
              }
          },
          setFive: async function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.allowEvent = value;
              }
          },
          setSix: async function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var sidebar = window.document.getElementById("calSidebar");
            var sidebarMini = window.document.querySelector("#calSidebar>#mini-day-box");
            sidebar.removeChild(sidebarMini);
              }
          },
          setSeven: async function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var folderpaneBox = window.document.getElementById("folderPaneBox");
            var folderMini = window.document.querySelector("#folderPaneBox>#mini-day-box");
            folderpaneBox.removeChild(folderMini);
              }
          },
          setEight: async function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var sidebar = window.document.getElementById("calSidebar");
            var timeTwo = window.document.getElementById("timeTwo"); 
            var timeOne = window.document.getElementById("timeOne"); 
            sidebar.removeChild(timeOne);
              }
          },
          setNine: async function() {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            var folderpaneBox = window.document.getElementById("folderPaneBox");
            var timeOne = window.document.getElementById("timeOne");
            var timeTwo = window.document.getElementById("timeTwo"); 
            folderpaneBox.removeChild(timeTwo);
              }
          },
          setTen: async function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.width = value;
              }
          },
          setEleven: async function(id, property, value) {
          let windows = Services.wm.getEnumerator("mail:3pane");
          while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
            element.height = value;
              }
          },
          setTwelve: async function(id, property, value) {
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
          setThirteen: async function() {
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
          setFourteen: async function(id, property, value) {
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
          setFifteen: async function() {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                var sidebar = window.document.getElementById("calSidebar");
                var queryFifteen = window.document.querySelector("#calSidebar>image");
           if (queryFifteen.length = 1) {sidebar.removeChild(queryFifteen); };
                    }
                },
          setSixteen: async function(id, property, getCurrentBackgroundColorSixteen) {
            let windows = Services.wm.getEnumerator("mail:3pane");
            while (windows.hasMoreElements()) {
            let window = windows.getNext();
            let element = window.document.getElementById(id);
                var imageTb4 = window.document.createXULElement("image");
                var Tb4 = extension.getURL("Tb4.png");
                imageTb4.src = Tb4;
                imageTb4.height = "200px";
                window.document.getElementById("folderPaneBox").style.backgroundColor = getCurrentBackgroundColorSixteen;
                    }
                }
            }
        }
    }
    close() {
                    let windows = Services.wm.getEnumerator("mail:3pane");
                    while (windows.hasMoreElements()) {
                        let window = windows.getNext();
                        var folderpaneBox = window.document.getElementById("folderPaneBox");
                        var sidebar = window.document.getElementById("calSidebar");
                        var sidebarMini = window.document.querySelector("#calSidebar>#mini-day-box");
                        var folderMini = window.document.querySelector("#folderPaneBox>#mini-day-box");
                        var folderImage = window.document.querySelector("#folderPaneBox>image");
                        var sidebarImage = window.document.querySelector("#calSidebar>image");
                        var timeOne = window.document.getElementById("timeOne");
                        var timeTwo = window.document.getElementById("timeTwo");
                        if (folderMini !==null) { folderpaneBox.removeChild(folderMini); };
                        if (folderImage !==null) { folderpaneBox.removeChild(folderImage); };
                        if (timeOne !==null) { folderpaneBox.removeChild(timeTwo); };
                        if (sidebarMini !==null) { sidebar.removeChild(sidebarMini); };
                        if (sidebarImage !==null) { sidebar.removeChild(sidebarImage); };
                        if (timeTwo !==null) { sidebar.removeChild(timeOne); };                  
                   }
        Services.obs.notifyObservers(null, "startupcache-invalidate", null); 
    }
};