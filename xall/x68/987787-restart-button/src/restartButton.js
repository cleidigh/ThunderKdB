function handleClick() {
  browser.restartButtonApi.restartButton();
};

browser.browserAction.onClicked.addListener(handleClick);

browser.restartButtonApi.loadButton();
