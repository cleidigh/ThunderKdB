"use strict";

/* globals ExtensionCommon */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Implements the functions defined in the experiments section of schema.json.
var messagepreview = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    let { extension } = context;
    // console.debug(extension);
    return {
      messagepreview: {
        /*
         * Notify observer with local storage key-value object. The object is
         * obtained from our storage.onChanged listener in background.js.
         *
         * @param {Object} storageLocalData - The key-value object.
         */
        notifyStorageLocalChanged(storageLocalData) {
          let notificationTopic = `extension:${extension.id}:storage-local-changed`;
          let dataStr = JSON.stringify(storageLocalData);
          // console.debug("notifyStorageLocal: storageLocalData ->");
          // console.debug("notifyStorageLocal: dataStr - " + dataStr);
          Services.obs.notifyObservers(null, notificationTopic, dataStr);
        },

        /*
         * Inject chrome script into a window context. Wait for notificaton
         * before injecting, in startup case.
         * XXX: this could also be unparameterized, injecting the user_scripts
         * registered api_script in the main (mail:3pane) window.
         *
         * @param {String} scriptFile  - The script relative path name.
         * @param {String} windowType  - The windowType name for the window.
         * @param {Boolean} loadSync   - If true, use loadSubScript(), else use
         *                               async compileScript().
         * @implements {nsIObserver}
         */
        injectScriptIntoChromeDocument(scriptFile, windowType, loadSync) {
          let injectScript = async () => {
            let context = window.document.defaultView;
            try {
              // console.debug("injectScript: START");
              let scriptURL = extension.rootURI.resolve(scriptFile);
              // let scriptURL = extension.manifest.user_scripts.api_script;
              if (loadSync) {
                Services.scriptloader.loadSubScript(scriptURL, context);
              } else {
                let script = await ChromeUtils.compileScript(scriptURL);
                script.executeInGlobal(context);
              }
              // console.debug("injectScript: DONE");
            } catch (ex) {
              console.error("injectScriptIntoChromeDocument: " + ex);
            }
          };

          // console.debug("injectScriptIntoChromeDocument: START - " +
          //               windowType + ":" + scriptFile);
          let window = Services.wm.getMostRecentWindow(windowType);
          if (window) {
            injectScript();
          }
        },
      },
    };
  }
};
