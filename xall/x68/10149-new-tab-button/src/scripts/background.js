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

browser.browserAction.onClicked.addListener(() => {
  openNewTab();
});

browser.messageDisplayAction.onClicked.addListener(() => {
  openNewTab();
});


async function init() {
  let result = await browser.storage.local.get("openInActive");
  prefs["openInActive"] = result.openInActive ? true : false;

  browser.storage.onChanged.addListener((changes, area) => {
    let changedItems = Object.keys(changes);
    for (let item of changedItems) {
      prefs[item] = changes[item].newValue;
    }
  });
}

init();
