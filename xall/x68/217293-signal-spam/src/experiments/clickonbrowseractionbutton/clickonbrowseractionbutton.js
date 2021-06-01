
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


var clickonbrowseractionbutton = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        return {
            clickonbrowseractionbutton: {
                async click(buttonId, windowId) {
                    try {
                        let w = windowId ? Services.wm.getOuterWindowWithId(windowId) : Services.wm.getMostRecentWindow(null);``
                        if (!w || !w.document || typeof w.document.getElementById !== "function")
                            return false;
                        let b = w.document.querySelector(`toolbarbutton.webextension-action[data-extensionid="${buttonId}"]`);
                        if (b) {
                            if (!b.screenX && !b.screenY)
                                return false;
                            b.click();
                            return true;
                        } else return false;
                    } catch(e) {
                        return false;
                    }
                }
            }
        };
    }
};
