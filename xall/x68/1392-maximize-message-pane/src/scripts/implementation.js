var {
  ExtensionCommon
} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var {
  ExtensionSupport
} = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

var collapseList = []; //collapsed or not

//Define API
var maxMsgPaneApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);

    return {
      maxMsgPaneApi: {
        setFocusThreadPane: async function () {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            let folderTree = rw.document.getElementById("folderTree");
            if (rw.gFolderDisplay.focusedPane == folderTree) rw.SetFocusThreadPane();
          }
        },

        collapse: async function (elementID, collapse) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          let ret = false; //state was changed or not
          if (rw) {
            let elem = rw.document.getElementById(elementID);
            if (elem) {
              let org = elem.collapsed ? true : false;
              if (collapse) {
                elem.collapsed = true;
              } else {
                elem.collapsed = false;
              }
              collapseList[elementID] = collapse;
              ret = (org != elem.collapsed);
            }
            //sync Lightning's elements
            if (elementID == "today-pane-panel") {
              let ltnToday = rw.document.getElementById("today-pane-panel");
              let ltnTodaySplit = rw.document.getElementById("today-splitter");
              if (ltnToday) {
                if (ltnToday.collapsed) {
                  if (ltnTodaySplit) ltnTodaySplit.setAttribute("state", "collapsed");
                } else {
                  if (ltnTodaySplit) ltnTodaySplit.removeAttribute("state");
                }
              }
            }
          }
          return ret;
        },

        isCollapsed: async function (elementID) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          let ret = false;
          if (rw) {
            let elem = rw.document.getElementById(elementID);
            if (elem && elem.collapsed) {
              ret = true;
            } else {
              ret = false;
            }
          }

          return ret;
        },

        setFlex: async function (elementID, flex) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            let elem = rw.document.getElementById(elementID);
            if (elem) {
              elem.flex = flex;
            }
          }
        },

        onDblClick: new ExtensionCommon.EventManager({
          context,
          name: "maxMsgPaneApi.onDblClick",
          // In this function we add listeners for any events we want to listen to, and return a
          // function that removes those listeners. To have the event fire in your extension,
          // call fire.async.
          register(fire) {
            function callback(event, id, x, y) {
              return fire.async(id, x, y);
            }

            maxMsgPaneWindowListener.add(callback);
            return function () {
              maxMsgPaneWindowListener.remove(callback);
            };
          },
        }).api()
      }
    };
  }

  close() {
    let rw = Services.wm.getMostRecentWindow("mail:3pane");
    if (rw) {
      for (let id in collapseList) {
        if (collapseList[id]) {
          rw.document.getElementById(id).collapsed = false;
          if (id == "folderPaneBox") {
            rw.MsgToggleFolderPane(); //it won't work. why?
          } else if (id == "today-pane-panel") {
            rw.document.getElementById("today-splitter").removeAttribute("state");
          }
        }
      }
      rw.document.getElementById("messagepanebox").flex = 1;
      rw.document.getElementById("mailContent").flex = 1;
    }
  }
};

var maxMsgPaneWindowListener = new class extends ExtensionCommon.EventEmitter {
  constructor() {
    super();
    this.callbackCount = 0;
  }

  handleEvent(event) {
    let splitter = event.target.closest("splitter");
    let hbox = event.target.closest("hbox.main-header-area");
    if (splitter) {
      maxMsgPaneWindowListener.emit("mmp-dblclicked", splitter.id, event.clientX, event.clientY);
    } else if (hbox && hbox.id == "msgHeaderView") {
      maxMsgPaneWindowListener.emit("mmp-dblclicked", hbox.id, event.clientX, event.clientY);
    } else {
      console.log("unknown event");
    }
  }

  add(callback) {
    this.on("mmp-dblclicked", callback);
    this.callbackCount++;

    if (this.callbackCount == 1) {
      ExtensionSupport.registerWindowListener("maxmsgpane_experimentListener", {
        chromeURLs: [
          "chrome://messenger/content/messenger.xhtml",
          "chrome://messenger/content/messenger.xul",
        ],
        onLoadWindow: function(window) {
          let elem = window.document.getElementById("folderpane_splitter");
          elem.addEventListener("dblclick", maxMsgPaneWindowListener.handleEvent);
          
          elem = window.document.getElementById("threadpane-splitter");
          elem.addEventListener("dblclick", maxMsgPaneWindowListener.handleEvent);
          
          elem = window.document.getElementById("msgHeaderView");
          elem.addEventListener("dblclick", maxMsgPaneWindowListener.handleEvent);
        },
      });
    }
  }

  remove(callback) {
    this.off("mmp-dblclicked", callback);
    this.callbackCount--;

    if (this.callbackCount == 0) {
      for (let window of ExtensionSupport.openWindows) {
        if ([
          "chrome://messenger/content/messenger.xhtml",
          "chrome://messenger/content/messenger.xul",
        ].includes(window.location.href)) {
          let elem = window.document.getElementById("folderpane_splitter");
          elem.removeEventListener("dblclick", this.handleEvent);
          
          elem = window.document.getElementById("threadpane-splitter");
          elem.removeEventListener("dblclick", this.handleEvent);
          
          elem = window.document.getElementById("msgHeaderView");
          elem.removeEventListener("dblclick", maxMsgPaneWindowListener.handleEvent);
        }
      }
      ExtensionSupport.unregisterWindowListener("maxmsgpane_experimentListener");
    }
  }
};
