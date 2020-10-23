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
