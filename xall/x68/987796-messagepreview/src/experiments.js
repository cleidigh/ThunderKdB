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
         * Notify observer with locale messages. The observer will notfiy us
         * when ready to accept the data.
         *
         * @implements {nsIObserver}
         */
        notifyLocaleMessages() {
          let getLocaleMessageMap = async () => {
            let locale = Services.locale.appLocaleAsBCP47;
            let locales = await extension.promiseLocales();
            locale = locales.get(locale) || extension.defaultLocale;
            let localeMessagesMap = extension.localeData.messages.get(locale);
            // console.dir(localeMessagesMap);
            return JSON.stringify([...localeMessagesMap]);
          };

          let observerTopic = `extension:${extension.id}:ready`;
          let notificationTopic = `extension:${extension.id}:locale-messages`;
          let Observer = {
            async observe(subject, topic, data) {
              if (topic == observerTopic) {
                // console.debug("notifyLocaleMessages.Observer: " + topic);
                Services.obs.removeObserver(Observer, observerTopic);
                let dataStr = await getLocaleMessageMap();
                Services.obs.notifyObservers(null, notificationTopic, dataStr);
              }
            },
          };
          // console.debug("notifyLocaleMessages: START - " + notificationTopic);
          Services.obs.addObserver(Observer, observerTopic);
        },

        /*
         * Notify observer with local storage key-value object. The object is
         * obtained from our local storage via browser.storage.local.get() in
         * background.js, as |browser| is not available (maybe) here.
         * The observer will notfiy us when ready to accept the data, on
         * startup. Otherwise send the data.
         *
         * @param {Object} storageLocalData - The key-value object.
         * @param {Boolean} startup         - If true, wait for notification
         *                                    from chrome code before sending
         *                                    data; otherwise do it now.
         * @implements {nsIObserver}
         */
        notifyStorageLocal(storageLocalData, startup) {
          let getStorageLocalMap = () => {
            let storageLocalMap = new Map();
            Object.entries(storageLocalData).forEach(([key, value]) =>
              storageLocalMap.set(key, value)
            );
            // console.dir(storageLocalMap);
            return JSON.stringify([...storageLocalMap]);
          };

          let observerTopic = `extension:${extension.id}:ready`;
          let notificationTopic = `extension:${extension.id}:storage-local`;
          let dataStr = getStorageLocalMap();
          let Observer = {
            observe(subject, topic, data) {
              if (topic == observerTopic) {
                // console.debug("notifyStorageLocal.Observer: " + topic);
                Services.obs.removeObserver(Observer, observerTopic);
                Services.obs.notifyObservers(null, notificationTopic, dataStr);
              }
            },
          };
          // console.debug("notifyStorageLocal: START - " + notificationTopic);
          if (startup) {
            Services.obs.addObserver(Observer, observerTopic);
          } else {
            Services.obs.notifyObservers(null, notificationTopic, dataStr);
          }

          // let storageLocalMap = await browser.storage.local.get();
          // console.dir(storageLocalMap);
        },

        /*
         * Inject chrome script into a window context. Wait for notificaton
         * before injecting, in startup case.
         * XXX: this could also be unparameterized, injecting the user_scripts
         * registered api_script in the main (mail:3pane) window.
         *
         * @param {String} scriptFile  - The script relative path name.
         * @param {String} windowType  - The windowType name for the window.
         * @implements {nsIObserver}
         */
        injectScriptIntoChromeDocument(scriptFile, windowType) {
          let injectScript = async () => {
            let context = window.document.defaultView;
            try {
              let scriptURL = extension.rootURI.resolve(scriptFile);
              // let scriptURL = extension.manifest.user_scripts.api_script;
              let script = await ChromeUtils.compileScript(scriptURL);
              script.executeInGlobal(context);
              // console.dir(script);
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
