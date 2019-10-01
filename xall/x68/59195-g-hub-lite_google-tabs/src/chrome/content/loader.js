function open_ghub_launcher() {
  browser.tabs.create({
    url: "chrome/content/G-Hub_Lite_Launcher.html"
  });
}

browser.browserAction.onClicked.addListener(open_ghub_launcher);