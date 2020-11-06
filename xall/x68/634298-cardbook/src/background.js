// init WindowListener
messenger.WindowListener.registerChromeUrl([ ["content", "cardbook", "chrome/content/"] ]);

// register a script which is called upon add-on unload (to unload any JSM loaded via overlays)
messenger.WindowListener.registerShutdownScript("chrome://cardbook/content/scripts/unload.js");

// master password
messenger.WindowListener.waitForMasterPassword();

// preferences
messenger.WindowListener.registerOptionsPage("chrome://cardbook/content/configuration/wdw_cardbookConfiguration.xhtml");

// startup
messenger.WindowListener.registerStartupScript("chrome://cardbook/content/cardbookInit.js");

// support for customizing toolbars
messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xhtml", "chrome://cardbook/content/customizeToolbar/wl_customizeToolbar.js");

// support for CardBook, yellow stars, creation from emails, formatting email fields
messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome://cardbook/content/wl_cardbookMessenger.js");

// support for the message window
messenger.WindowListener.registerWindow("chrome://messenger/content/messageWindow.xhtml", "chrome://cardbook/content/wl_cardbookMessageWindow.js");

// support for Lightning attendees
messenger.WindowListener.registerWindow("chrome://calendar/content/calendar-event-dialog-attendees.xhtml", "chrome://cardbook/content/lightning/wl_lightningAttendees.js");

// support for Contacts sidebar
// support for attaching a vCard
// support for attaching lists
// support for CardBook menu in composition window
messenger.WindowListener.registerWindow("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://cardbook/content/composeMsg/wl_composeMsg.js");

// // support for filter messages
// await messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome://cardbook/content/filters/ovl_filters.xhtml");
// await messenger.WindowListener.registerWindow("chrome://messenger/content/FilterEditor.xhtml", "chrome://cardbook/content/filters/ovl_filterEditor.xhtml");
// await messenger.WindowListener.registerWindow("chrome://messenger/content/SearchDialog.xhtml", "chrome://cardbook/content/filters/ovl_filterEditor.xhtml");
// await messenger.WindowListener.registerWindow("chrome://messenger/content/mailViewSetup.xhtml", "chrome://cardbook/content/filters/ovl_filterEditor.xhtml");
// await messenger.WindowListener.registerWindow("chrome://messenger/content/virtualFolderProperties.xhtml", "chrome://cardbook/content/filters/ovl_filterEditor.xhtml");


messenger.WindowListener.startListening();
