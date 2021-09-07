"use strict";

/* globals browser */

var init = async () => {
  // Listener for storage.local changes to notify chrome observer.
  const storageChanged = (changes, area) => {
    if (area != "local") {
      return;
    }
    for (let [key, value] of Object.entries(changes)) {
      // console.debug(key);
      // console.debug(value);
      if (
        "oldValue" in value &&
        !("newValue" in value && value.newValue === value.oldValue)
      ) {
        // console.debug("background.js: got a change, key - " + key);
        let storageLocalData = {};
        storageLocalData[key] = value;
        browser.browseintab.notifyStorageLocalChanged(storageLocalData);
      }
    }
  };

  // Inject the main script.
  browser.browseintab.injectScriptIntoChromeDocument(
    "content/browseintab.js",
    "mail:3pane",
    false
  );

  // Add storage change listener.
  browser.storage.onChanged.addListener(storageChanged);
};

init();

console.info(
  browser.i18n.getMessage("extensionName") +
    " " +
    browser.runtime.getManifest().version
);
