(async () => {

    messenger.WindowListener.registerDefaultPrefs("defaults/preferences/tbdialout.js");
    
    messenger.WindowListener.registerChromeUrl([
        ["content", "tbdialout",  "chrome/content/"],
        ["resource",  "tbdialout",  "chrome/"]
    ]);
    
    messenger.WindowListener.registerOptionsPage("chrome://tbdialout/content/options.xhtml");
    
    messenger.WindowListener.registerWindow(
        "chrome://messenger/content/addressbook/addressbook.xhtml", 
        "chrome://tbdialout/content/scripts/addressbook.js");
    messenger.WindowListener.registerWindow(
        "chrome://messenger/content/customizeToolbar.xhtml", 
        "chrome://tbdialout/content/scripts/toolbar.js");
    
    //messenger.WindowListener.registerShutdownScript("chrome://tbdialout/content/scripts/shutdown.js");
    
    messenger.WindowListener.startListening();

})()