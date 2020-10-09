var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

const fileName = "messenger.css";

function onLoad(activatedWhileWindowOpen) {
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/" + fileName);

  if (Services.appinfo.OS == "WINNT") {
    WL.injectCSS("chrome://PhoenityIconsOverlay/content/aero/" + fileName);
  } else if (Services.appinfo.OS == "Linux") {
    WL.injectCSS("chrome://PhoenityIconsOverlay/content/linux/" + fileName);
  } else if (Services.appinfo.OS == "Darwin") {
    WL.injectCSS("chrome://PhoenityIconsOverlay/content/darwin/" + fileName);
  }

  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/primaryToolbar.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/folderPane.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/folderMenus.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/chat.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/calendar/calendar.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/messageIcons.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/quickFilterBar.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/searchBox.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/mailWindow1.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/messengercompose/messengercompose.css");
  WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/addressbook/addressbook.css");

  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/primaryToolbar.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/chat.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/quickFilterBar.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/accountCentral.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/folderPane.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/messageHeader.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/messageIcons.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/messenger.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/quickFilterBar.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/numberinput.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/richlistbox.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/addressbook/abContactsPanel.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/addressbook/abResultsPane.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/addressbook/cardDialog.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/smime/msgCompSMIMEOverlay.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/smime/msgHdrViewSMIMEOverlay.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/smime/msgReadSMIMEOverlay.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/calendar/calendar.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/mailredirect/mailredirect.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/QuickFolders/QuickFolders.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/uBlockOrigin/uBlockOrigin.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/gContactSync/gContactSync.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/pswitcher2/pswitcher2.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/cardbook/cardbook.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/paranoia/paranoia.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/phoenityButtons/phoenityButtons.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content/skin/toggleQuotes/toggleQuotes.css");

  //WL.injectCSS("chrome://PhoenityIconsOverlay/content-OS/skin/phoenityIcons.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content-OS/skin/messageHeader.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content-OS/skin/messageIcons.css");
  //WL.injectCSS("chrome://PhoenityIconsOverlay/content-OS/skin/messenger.css");
}

function onUnload(deactivatedWhileWindowOpen) {
}
