function handleClick() {
  browser.configButtonApi.configButton();
};

browser.browserAction.onClicked.addListener(handleClick);

browser.configButtonApi.loadButton();
