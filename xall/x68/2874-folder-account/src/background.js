messenger.WindowListener.registerChromeUrl([
  ["content", "folderaccount", "chrome/content/"]
]);

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xhtml",
  "chrome://folderaccount/content/folderAccount.js"
);

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messengercompose/messengercompose.xhtml",
  "chrome://folderaccount/content/folderAccount_compose.js"
);

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/folderProps.xhtml",
  "chrome://folderaccount/content/folderAccount_props.js"
);

messenger.WindowListener.startListening();

messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
  switch (info.command) {
    case "getComposeDetails":
      return await messenger.compose.getComposeDetails(info.tabId);
      break;
    case "setComposeDetails":
      return await messenger.compose.setComposeDetails(info.tabId, info.details);
      break;
    case "listAccounts":
      return await messenger.accounts.list(false);
      break;
  }
});
