"use strict";

/* globals browser */

var init = async () => {
  // First, init notifyLocaleMessages and notifyStorageLocal, serially.
  browser.messagepreview.notifyLocaleMessages();
  await browser.storage.local.get().then(storageLocalData => {
    browser.messagepreview.notifyStorageLocal(storageLocalData, true);
  });

  // Then, inject the main script.
  browser.messagepreview.injectScriptIntoChromeDocument(
    "content/messagePreview.js",
    "mail:3pane"
  );

  // Get options changes and notify chrome code.
  const handleMessage = (request, sender, response) => {
    browser.messagepreview.notifyStorageLocal(request.storageLocalData, false);
    response({ response: "notifyStorageLocal sent" });
  };

  browser.runtime.onMessage.addListener(handleMessage);
};

init();

console.info(browser.i18n.getMessage("extensionName"));
