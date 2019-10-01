pref("network.protocol-handler.expose.exquilla", true);
// New Log.jsm logging prefs
pref("extensions.exquilla.log.level", "Config");
pref("extensions.exquilla.log.dump", true);
pref("extensions.exquilla.log.file", true);

// scheme used in creating ab directory uri, blank for default
pref("extensions.exquilla.abScheme", "exquilla-directory-new");
pref("extensions.exquilla.disableCalendar", true);
pref("extensions.exquilla.firstRun", true);
pref("extensions.exquilla.useGAL", true);
pref("extensions.exquilla.doAbAutocomplete", true);
pref("extensions.exquilla.doAbGALAutocomplete", true);
// Shall we always download message bodies?
pref("extensions.exquilla.getAllBodies", true);
pref("extensions.exquilla.postExQuilla19", false);
// useragent string for call, "default" means use the default useragent
pref("extensions.exquilla.useragent", "default");
// default and saved value of save password in password prompt
pref("extensions.exquilla.savepassword", true);
// should we fix skink database from native database
pref("extensions.exquilla.fixskinkdb", true);
// Maximum items per call in folder resync
pref("extensions.exquilla.resyncItemsMax", 500);
// Largest message count for folders to do automatic resync once per session
pref("extensions.exquilla.resyncFolderSizeMax", 10000);
// timeout (in milliseconds) for xhr requests (35 minute)
pref("extensions.exquilla.xhrtimeout", 210000);
// Allow attachments from archived messages of type IPM.Note.EAS
pref("extensions.exquilla.allowEASattachment", false);
// Limit of open requests to server per mailbox
pref("extensions.exquilla.connectionLimit", 5);
// Disable collapsed FBA, for testing or special needs
pref("extensions.exquilla.tryFbaCollapsed", true);
// Shall we log bodies (and subject)? Defaults to false for security reasons.
pref("extensions.exquilla.logBodies", false);
// the root URI for exquilla address book directories
pref("extensions.exquilla.abScheme", "exquilla-directory");
// use notifications
pref("extensions.exquilla.useNotifications", true);


