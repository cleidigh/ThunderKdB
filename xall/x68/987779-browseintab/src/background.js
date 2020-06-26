"use strict";

/* globals browser */

var init = async () => {
  // First, init notifyLocaleMessages and notifyStorageLocal, serially.
  browser.browseintab.notifyLocaleMessages();
  await browser.storage.local.get().then(storageLocalData => {
    browser.browseintab.notifyStorageLocal(storageLocalData, true);
  });

  // Then, inject the main script.
  browser.browseintab.injectScriptIntoChromeDocument(
    "content/browseintab.js",
    "mail:3pane"
  );

  // Handle sendMessage() notifications to onMessage() listener.
  const handleMessage = (request, sender, response) => {
    // console.debug("Message from content script: request:sender:response - ");
    // console.dir(request);
    // console.dir(sender);
    // console.dir(response);
    if (request.storageLocalData) {
      // Get options changes and notify chrome code.
      browser.browseintab.notifyStorageLocal(request.storageLocalData, false);
      response({ response: "notifyStorageLocal sent" });
    }
  };

  browser.runtime.onMessage.addListener(handleMessage);
};

init();

console.info(browser.i18n.getMessage("extensionName"));
