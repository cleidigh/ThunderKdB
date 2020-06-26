function klickaktion() {
  browser.restartButtonApi.restartButton();
}
browser.browserAction.onClicked.addListener(klickaktion);
