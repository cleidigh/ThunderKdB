messenger.WindowListener.registerChromeUrl([
    ["content",  "PhoenityIcons", "content/"]
]);

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/addressbook/addressbook.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/addressbook/abContactsPanel.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messengercompose/messengercompose.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messenger.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messageWindow.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/customizeToolbar.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/activity.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/subscribe.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/SearchDialog.xhtml",
    "chrome://PhoenityIcons/content/scripts/loadMessenger.js");

//messenger.WindowListener.registerWindow(
    //"chrome://cardbook/content/contactsSidebar/wdw_cardbookContactsSidebar.xhtml",
    //"chrome://PhoenityIcons/content/scripts/loadMessenger.js");

messenger.WindowListener.startListening();
