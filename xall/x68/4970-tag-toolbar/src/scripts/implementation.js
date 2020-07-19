var {
  ExtensionCommon
} = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm");

var {
  ExtensionSupport
} = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");

var {
  TagUtils
} = ChromeUtils.import("resource:///modules/TagUtils.jsm");

//Define API
var tagPopupApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      tagPopupApi: {
        onTagsChange: async function () {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            rw.OnTagsChange();
          }
        },

        showAdditionalTagsInMsgHdrView: async function (tags) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            let elem = rw.document.getElementById("expandedtagsBox");
            let notag = rw.document.getElementById("expandedtagsRow").hidden;
            if (notag) rw.document.getElementById("expandedtagsRow").hidden = false;
            //remove existing additional labels
            for (let i = elem.childNodes.length - 1; i >= 0; i--) {
              let label = elem.childNodes[i];
              //if expandedtagsRow is collapsed, the tags previously shown are remain. so it needs to be deleted.
              if (notag || label.getAttribute("additional")) {
                elem.removeChild(label);
              }
            }

            for (let i = 0; i < tags.length; i++) {
              let tag = tags[i];
              let label = rw.document.createXULElement("label");
              label.setAttribute("class", "tagvalue");
              label.setAttribute("value", tag.tag);
              let textColor = tag.fgRGB ? "rgb(" + tag.fgRGB + ")" : tag.color;
              label.style.color = textColor;
              label.style.backgroundColor = "#FFFFFF";
              label.style.borderColor = tag.color;
              label.style.borderWidth = "1px";
              label.setAttribute("additional", "true");
              label.hidden = false;
              elem.appendChild(label);
            }
          }
        },

        getSelectorForKey: async function (key) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          let selector = null;
          if (rw) {
            let tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
              .getService(Components.interfaces.nsIMsgTagService);
            selector = tagService.getSelectorForKey(key);
          }
          return selector;
        },

        isColorContrastEnough: async function (color) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          let ret = true;
          if (rw) {
            ret = TagUtils.isColorContrastEnough(color);
          }

          return ret;
        },

        insertCSS: async function (css) {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            TTBCSSManager.registerCSS(css);
          }
        },
        
        removeCSS: async function () {
          let rw = Services.wm.getMostRecentWindow("mail:3pane");
          if (rw) {
            TTBCSSManager.unregisterCSS();
          }
        },

        onClick: new ExtensionCommon.EventManager({
          context,
          name: "tagPopupApi.onClick",
          // In this function we add listeners for any events we want to listen to, and return a
          // function that removes those listeners. To have the event fire in your extension,
          // call fire.async.
          register(fire) {
            function callback(event, tagKey, additional, x, y) {
              return fire.async(tagKey, additional, x, y);
            }

            tagPopupWindowListener.add(callback);
            return function () {
              tagPopupWindowListener.remove(callback);
            };
          },
        }).api()
      }
    };
  }
};

var tagPopupWindowListener = new class extends ExtensionCommon.EventEmitter {
  constructor() {
    super();
    this.callbackCount = 0;
  }

  handleEvent(event) {
    let label = event.originalTarget;

    if (event.which != 1) return; //left-click only
    
    if (label.getAttribute("class") == "tagvalue") {
      let tagService = Components.classes["@mozilla.org/messenger/tagservice;1"]
        .getService(Components.interfaces.nsIMsgTagService);
      let tagArray = tagService.getAllTags({});

      for (let i = 0; i < tagArray.length; ++i) {
        let taginfo = tagArray[i];
        if (taginfo.tag == label.value) {
          let addtitional = label.getAttribute("additional") == "true";
          tagPopupWindowListener.emit("tpup-clicked", taginfo.key, addtitional, event.clientX, event.clientY);
          break;
        }
      }
    }
  }

  add(callback) {
    this.on("tpup-clicked", callback);
    this.callbackCount++;

    if (this.callbackCount == 1) {
      ExtensionSupport.registerWindowListener("tpup_experimentListener", {
        chromeURLs: [
          "chrome://messenger/content/messenger.xhtml",
          "chrome://messenger/content/messenger.xul",
        ],
        onLoadWindow: function (window) {
          let elem = window.document.getElementById("expandedtagsBox");
          elem.addEventListener("click", tagPopupWindowListener.handleEvent);
        }
      });
    }
  }

  remove(callback) {
    this.off("tpup-clicked", callback);
    this.callbackCount--;

    if (this.callbackCount == 0) {
      for (let window of ExtensionSupport.openWindows) {
        if ([
          "chrome://messenger/content/messenger.xhtml",
          "chrome://messenger/content/messenger.xul",
        ].includes(window.location.href)) {
          let elem = window.document.getElementById("expandedtagsBox");
          elem.removeEventListener("click", this.handleEvent);
        }
      }
      ExtensionSupport.unregisterWindowListener("tpup_experimentListener");
    }
  }
};

//CSS Manager
var TTBCSSManager = {
  cssURI: null,
  sss: Components.classes["@mozilla.org/content/style-sheet-service;1"]
    .getService(Components.interfaces.nsIStyleSheetService),
  ios: Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService),

  registerCSS: function (css) {
    this.unregisterCSS();
    this.cssURI = this.ios.newURI(css);
    this.sss.loadAndRegisterSheet(this.cssURI, this.sss.USER_SHEET);
  },

  unregisterCSS: function () {
    if (this.cssURI && this.sss.sheetRegistered(this.cssURI, this.sss.USER_SHEET)) {
      this.sss.unregisterSheet(this.cssURI, this.sss.USER_SHEET);
    }
  }
};
