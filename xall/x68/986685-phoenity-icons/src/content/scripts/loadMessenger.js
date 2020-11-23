var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const fileName = "messenger.css";

function onLoad(activatedWhileWindowOpen) {
  WL.injectCSS("chrome://PhoenityIcons/content/skin/" + fileName);

  if (Services.appinfo.OS == "WINNT") {
    WL.injectCSS("chrome://PhoenityIcons/content/aero/" + fileName);
  } else if (Services.appinfo.OS == "Linux") {
    WL.injectCSS("chrome://PhoenityIcons/content/linux/" + fileName);
  } else if (Services.appinfo.OS == "Darwin") {
    WL.injectCSS("chrome://PhoenityIcons/content/darwin/" + fileName);
  }

  WL.injectCSS("chrome://PhoenityIcons/content/skin/primaryToolbar.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/folderPane.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/folderMenus.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/chat.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/calendar/calendar.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/messageIcons.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/quickFilterBar.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/mailWindow1.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/activity/activity.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/searchBox.css");

  WL.injectCSS("chrome://PhoenityIcons/content/skin/messengercompose/messengercompose.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/addressbook/addressbook.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/addressbook/abContactsPanel.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/addressbook/abResultsPane.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/addressbook/cardDialog.css");

  WL.injectCSS("chrome://PhoenityIcons/content/skin/uBlockOrigin/uBlockOrigin.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/cardbook/cardbook.css");
  WL.injectCSS("chrome://PhoenityIcons/content/skin/mailredirect/mailredirect.css");
}

function onUnload(deactivatedWhileWindowOpen) {
}
