async function execute(theme) { 

var theme = await browser.theme.getCurrent();

var getCurrentBackgroundColorSixteen = theme.colors.sidebar;

browser.myapi.setSixteen("folderPaneBox", "backgroundColor", getCurrentBackgroundColorSixteen);
};
execute();
browser.theme.onUpdated.addListener(execute);