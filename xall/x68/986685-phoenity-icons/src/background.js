messenger.WindowListener.registerChromeUrl([
    ["content",  "PhoenityIconsOverlay", "content/"]
]);

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/addressbook/addressbook.xhtml",
    "chrome://PhoenityIconsOverlay/content/scripts/loadAddressbook.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/addressbook/abContactsPanel.xhtml",
    "chrome://PhoenityIconsOverlay/content/scripts/loadAddressbook.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messengercompose/messengercompose.xhtml",
    "chrome://PhoenityIconsOverlay/content/scripts/loadCompose.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messenger.xhtml",
    "chrome://PhoenityIconsOverlay/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messageWindow.xhtml",
    "chrome://PhoenityIconsOverlay/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/customizeToolbar.xhtml",
    "chrome://PhoenityIconsOverlay/content/scripts/loadMessenger.js");

messenger.WindowListener.startListening();
