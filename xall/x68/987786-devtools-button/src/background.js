function klickaktion() {
  browser.devToolsButtonApi.devToolsButton();
}
browser.browserAction.onClicked.addListener(klickaktion);
