function filter_click() {
  browser.ffb_api.filter_folders();
}
browser.browserAction.onClicked.addListener(filter_click); 

