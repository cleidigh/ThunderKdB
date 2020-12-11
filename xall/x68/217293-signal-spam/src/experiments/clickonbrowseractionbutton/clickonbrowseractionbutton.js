
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");


var clickonbrowseractionbutton = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        return {
            clickonbrowseractionbutton: {
                async click(buttonId, windowId) {
                    console ? void 0 : void 0;
                    try {
                        let w = windowId ? Services.wm.getOuterWindowWithId(windowId) : Services.wm.getMostRecentWindow(null);``
                        if (!w || !w.document || typeof w.document.getElementById !== "function")
                            return (console ? void 0 : void 0);
                        let b = w.document.querySelector(`toolbarbutton.webextension-action[data-extensionid="${buttonId}"]`);
                        if (b)
                            b.click();
                        else (console ? void 0 : void 0);
                    } catch(e) {
                        console ? void 0 : void 0;
                        return;
                    }
                }
            }
        };
    }
};