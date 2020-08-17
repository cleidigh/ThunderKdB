var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const ehb = "expandedHeadersBottomBox";
const eh2 = "expandedHeaders2";
const win = Services.wm.getMostRecentWindow("mail:3pane");
const win2 = Services.wm.getMostRecentWindow("mail:messageWindow");
//const win = Services.wm.getMostRecentWindow(document.documentElement.getAttribute("windowtype"));

var dispmuaApi = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
      context.callOnClose(this);
      return {
        dispmuaApi: {
            insert(wd, basePath, iconPath, iconText, id, target) {
                let elm = wd.document.getElementById(target);
                const compact = "compact";
                let iconSize = 48, marginTop = 0;
                if (wd.document.getElementById(eh2).getAttribute(compact) == compact) {
                    iconSize = 32, marginTop = -16;
                }
                let dispMUA = wd.document.getElementById(id);
                if (dispMUA) {
                    dispMUA.setAttribute("image", basePath + iconPath);
                    dispMUA.setAttribute("tooltiptext", iconText);
                    dispMUA.setAttribute("style", "flex-shrink: 0; padding: 0; margin:" + marginTop + "px 2px 0 2px");
                    for (let elm of dispMUA.children) {
                        if (elm.nodeName == "image") {
                            elm.width = iconSize;
                            elm.height = iconSize;
                            elm.setAttribute("style", "margin: 0 2px 0 2px");
                            break;
                        }
                    }
                } else {
                    let dispMUA = wd.document.createXULElement("toolbarbutton");
                    dispMUA.id = id;
                    dispMUA.setAttribute("image", basePath + iconPath);
                    dispMUA.setAttribute("tooltiptext", iconText);
                    dispMUA.setAttribute("style", "flex-shrink: 0; padding: 0; margin:" + marginTop + "px 2px 0 2px");
                    dispMUA.addEventListener("click", () => {
                        wd.document.getElementById("displaymailuseragent-t_toshi_-messageDisplayAction-toolbarbutton").click();
                    }, false);
                    wd.document.getElementById(ehb).insertBefore(dispMUA, elm);
                    for (let elm of dispMUA.children) {
                        if (elm.nodeName == "image") {
                            elm.width = iconSize;
                            elm.height = iconSize;
                            elm.setAttribute("style", "margin: 0 2px 0 2px");
                            break;
                        }
                    }
                }
            },
            mv(wd, id, target) {
                let dispMUA = wd.document.getElementById(id);
                let elm = wd.document.getElementById(target);
                wd.document.getElementById(ehb).insertBefore(dispMUA, elm);
            },
            rm(wd, id) {
                if (wd.document.getElementById(id)) wd.document.getElementById(id).remove();
            },
            async insertBefore(basePath, iconPath, iconText, id, target) {
                console.log(win);
                console.log(win.window.document.documentElement.getAttribute("windowtype"));
                this.insert(win, basePath, iconPath, iconText, id, target);
                if (win2) {
                    console.log(win2.window.document.documentElement.getAttribute("windowtype"));
                    this.insert(win2, basePath, iconPath, iconText, id, target);
                }
            },
            async move(id, target) {
                this.mv(win, id, target);
                if (win2) this.mv(win2, id, target);
            },
            async remove(id) {
                this.rm(win, id);
                if (win2) this.rm(win2, id);
            }
        }
      }
    }
    close() {
        let id = "dispMUAicon";
        if (win.document.getElementById(id)) win.document.getElementById(id).remove();
    }
};