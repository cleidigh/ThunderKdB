browser.browserAction.onClicked.addListener(async () => {
  browser.tabs.create({ active : true, url: "https://www.evernote.com/Home.action" });
});