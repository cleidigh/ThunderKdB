var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const ehb = "expandedHeadersBottomBox";
const eh2 = "expandedHeaders2";
const win = Services.wm.getMostRecentWindow("mail:3pane");

var dispmuaApi = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
      return {
        dispmuaApi: {
            async insertBefore(basePath, iconPath, iconText, id, target) {
                console.log("iconText: " + iconText);
                let elm = win.document.getElementById(target);
                const compact = "compact";
                let iconSize = 48, marginTop = 0;
                if (win.document.getElementById(eh2).getAttribute(compact) == compact) {
                    iconSize = 32, marginTop = -16;
                }
                let dispMUA = win.document.getElementById(id);
                if (dispMUA) {
                    //dispMUA.setAttribute("src", basePath + iconPath);   //img
                    //dispMUA.setAttribute("title", iconText);    //img
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
                    //let dispMUA = win.document.createElement("img");
                    let dispMUA = win.document.createXULElement("toolbarbutton");
                    dispMUA.id = id;
                    //dispMUA.setAttribute("src", basePath + iconPath); //img
                    //dispMUA.setAttribute("title", iconText);    //img
                    dispMUA.setAttribute("image", basePath + iconPath);
                    dispMUA.setAttribute("tooltiptext", iconText);
                    dispMUA.setAttribute("style", "flex-shrink: 0; padding: 0; margin:" + marginTop + "px 2px 0 2px");
                    dispMUA.addEventListener("click", () => {
                        win.document.getElementById("displaymailuseragent-t_toshi_-messageDisplayAction-toolbarbutton").click();
                    }, false);
                    win.document.getElementById(ehb).insertBefore(dispMUA, elm);
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
            async move(id, target) {
                let dispMUA = win.document.getElementById(id);
                let elm = win.document.getElementById(target);
                win.document.getElementById(ehb).insertBefore(dispMUA, elm);
            },
            async remove(id) {
                if (win.document.getElementById(id)) win.document.getElementById(id).remove();
            }
        }
      }
    }
};