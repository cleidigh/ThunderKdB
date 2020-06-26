function klickaktion() {
  browser.toggleMessagePaneApi.toggleMessagePane();
}
browser.browserAction.onClicked.addListener(klickaktion);
