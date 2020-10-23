messenger.WindowListener.registerChromeUrl([ 
    ["content", "clipboard",           "chrome/content/"],
    ["locale",  "clipboard", "en-US",  "chrome/locale/en-US/"],
    ["locale",  "clipboard", "de-DE",     "chrome/locale/de-DE/"]
]);
messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messengercompose/messengercompose.xhtml", 
    "chrome://clipboard/content/messengercompose.js");
messenger.WindowListener.registerShutdownScript("chrome://clipboard/content/shutdown.js");
messenger.WindowListener.startListening();
