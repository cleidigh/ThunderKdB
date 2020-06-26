function klickaktion() {
  browser.configButtonApi.configButton();
}
browser.browserAction.onClicked.addListener(klickaktion);
