var prefs = [];
async function openNewTab() {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  let active = prefs["openInActive"];
  if (tabs.length > 0 && tabs[0].mailTab) {
    browser.newTabButtonApi.openNewTab(prefs["openInActive"]);
  }
}

async function init() {
  let result = await browser.storage.local.get("openInActive");
  prefs["openInActive"] = result.openInActive ? true : false;

  browser.storage.onChanged.addListener((changes, area) => {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      prefs[item] = changes[item].newValue;
    }
  });

  browser.browserAction.onClicked.addListener(() => {
    openNewTab();
  });

  browser.messageDisplayAction.onClicked.addListener(() => {
    openNewTab();
  });

  let menuStr = await browser.i18n.getMessage("ntbMenuOpenLink");
  browser.menus.create({
    contexts: ["link"],
    id: "ntb_openlink",
    title: menuStr,
    targetUrlPatterns: ["*://*/*"],
    onclick: (info, tab) => {
      browser.tabs.create({
        active: prefs["openInActive"],
        url: info.linkUrl
      });
    }
  });
}

init();
