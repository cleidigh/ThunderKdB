"use strict";

/* globals browser */

var init = async () => {
  // Notify chrome observer with storage.local data.
  const notifyStorageLocal = async startup => {
    await browser.storage.local.get().then(storageLocalData => {
      browser.browseintab.notifyStorageLocal(storageLocalData, startup);
    });
  };

  // Listener for storage.local changes to notify chrome observer, post startup.
  const storageChanged = async (changes, area) => {
    // console.debug(changes);
    // console.debug(area);
    if (area == "local") {
      await notifyStorageLocal(false);
    }
  };

  // First, notifyLocaleMessages and notifyStorageLocal, serially.
  browser.browseintab.notifyLocaleMessages();
  await notifyStorageLocal(true);
  // Then, inject the main script.
  browser.browseintab.injectScriptIntoChromeDocument(
    "content/browseintab.js",
    "mail:3pane"
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
