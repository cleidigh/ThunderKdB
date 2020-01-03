browser.menus.create({
    id: "open-URL-in-tab",
    title: browser.i18n.getMessage("openNewTab"),
    contexts: ["link"],
    targetUrlPatterns: ["*://*/*"],
});
browser.menus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "open-URL-in-tab") {
      if (info.linkUrl.startsWith("http://") || info.linkUrl.startsWith("https://")){
        browser.tabs.create({url:info.linkUrl});
      }
    }
});
