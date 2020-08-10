async function startup() {
  if (await browser.manifestLoader.needsRestart("exquilla")) {
    console.log("You need to restart Thunderbird before the changes will take effect.");
    return;
  }

  // Load chrome.manifest
  await browser.manifestLoader.registerResourceMapping("exquilla", "modules/");

  await browser.manifestLoader.registerComponent("{AB68A3B5-2971-40d3-89FA-0AE1D9611224}", "@mozilla.org/autocomplete/search;1?name=exquilla-ab", "components/ewsAbAutocomplete.js");

  await browser.manifestLoader.registerComponent("{4D08B157-4381-48a8-8E9C-8833315F2B29}", "@mozilla.org/accountmanager/extension;1?name=exquillaserver", "components/am-ewsServerComponent.js");
  await browser.manifestLoader.registerCategory("mailnews-accountmanager-extensions", "ExquillaAccountManagerServer", "@mozilla.org/accountmanager/extension;1?name=exquillaserver");

  await browser.manifestLoader.registerComponent("{A91EBE7F-DD10-428d-AE1D-988DD1F84492}", "@mozilla.org/calendar/calendar;1?type=exquilla", "components/calComponents.js");

  // == JsAccount-based components. ==
  // JS URL
  await browser.manifestLoader.registerComponent("{86D28AF0-73F0-4728-8377-A9D4836B7BC3}", "@mesquilla.com/ewsurl;1", "components/ewsUrlComponent.js");

  // JS AB Directory
  await browser.manifestLoader.registerComponent("{62EC44B5-D647-4023-96D6-EAE7A17DCD79}", "@mozilla.org/addressbook/directory;1?type=exquilla-directory", "components/ewsAbDirectoryComponent.js");
  await browser.manifestLoader.registerComponent("{BDE94D3E-5A66-4027-AADA-13CE8FE762E6}", "@mozilla.org/addressbook/directory-factory;1?name=exquilla-directory", "components/ewsAbDirectoryComponent.js");

  // JS Service implementation
  await browser.manifestLoader.registerComponent("{909A8F4E-F966-47f1-A65D-5A9C186A8790}", "@mozilla.org/messenger/messageservice;1?type=exquilla", "components/ewsServiceComponent.js");
  await browser.manifestLoader.registerComponent("{909A8F4E-F966-47f1-A65D-5A9C186A8790}", "@mozilla.org/network/protocol;1?name=exquilla");
  await browser.manifestLoader.registerComponent("{909A8F4E-F966-47f1-A65D-5A9C186A8790}", "@mozilla.org/network/protocol;1?name=exquilla-message");
  await browser.manifestLoader.registerComponent("{909A8F4E-F966-47f1-A65D-5A9C186A8790}", "@mozilla.org/messenger/messageservice;1?type=exquilla-message");
  await browser.manifestLoader.registerComponent("{909A8F4E-F966-47f1-A65D-5A9C186A8790}", "@mozilla.org/messenger/protocol/info;1?type=exquilla");
  await browser.manifestLoader.registerComponent("{909A8F4E-F966-47f1-A65D-5A9C186A8790}", "@mozilla.org/messenger/protocol/info;1?type=exquilla-message");

  // JS Protocol implementation
  await browser.manifestLoader.registerComponent("{27554DDD-EB22-45fd-B836-F8B8F5E9D61B}", "@mesquilla.com/ewsprotocol;1", "components/ewsProtocolComponent.js");

  // JS IncomingServer implementation
  await browser.manifestLoader.registerComponent("{D308E8D0-7D9A-4C87-9235-0471D4C2146C}", "@mozilla.org/messenger/server;1?type=exquilla", "components/ewsIncomingServerComponent.js");

  // JS MsgFolder implementation
  await browser.manifestLoader.registerComponent("{CF5ABC99-F459-42E8-85A1-10B4D6590D33}", "@mesquilla.com/ewsmailfolder;1", "components/ewsMsgFolderComponent.js");
  await browser.manifestLoader.registerComponent("{CF5ABC99-F459-42E8-85A1-10B4D6590D33}", "@mozilla.org/mail/folder-factory;1?name=exquilla");
  await browser.manifestLoader.registerComponent("{CF5ABC99-F459-42E8-85A1-10B4D6590D33}", "@mozilla.org/rdf/resource-factory;1?name=exquilla"); // COMPAT for TB 68

  // JS Compose implementation
  await browser.manifestLoader.registerComponent("{E5724CCB-9CC2-4030-88FC-37813137B8BA}", "@mozilla.org/messengercompose/compose;1", "components/ewsComposeComponent.js");
  // override the standard skink compose component with our own super class
  await browser.manifestLoader.registerComponent("{E5724CCB-9CC2-4030-88FC-37813137B8BA}", "@mesquilla.com/ewscompose;1");

  // JS Send implementation
  await browser.manifestLoader.registerComponent("{DBF0D7B6-C52A-4323-8B22-E4F892B4F3EE}", "@mesquilla.com/ewssend;1", "components/ewsSendComponent.js");

  // Register default preferences
  await browser.manifestLoader.registerPreference("network.protocol-handler.expose.exquilla", true);
  // New Log.jsm logging prefs
  await browser.manifestLoader.registerPreference("extensions.exquilla.log.level", "Config");
  await browser.manifestLoader.registerPreference("extensions.exquilla.log.dump", true);
  await browser.manifestLoader.registerPreference("extensions.exquilla.log.file", true);

  // scheme used in creating ab directory uri, blank for default
  await browser.manifestLoader.registerPreference("extensions.exquilla.abScheme", "exquilla-directory-new");
  await browser.manifestLoader.registerPreference("extensions.exquilla.disableCalendar", true);
  await browser.manifestLoader.registerPreference("extensions.exquilla.firstRun", true);
  await browser.manifestLoader.registerPreference("extensions.exquilla.useGAL", true);
  await browser.manifestLoader.registerPreference("extensions.exquilla.doAbAutocomplete", true);
  await browser.manifestLoader.registerPreference("extensions.exquilla.doAbGALAutocomplete", true);
  // Shall we always download message bodies?
  await browser.manifestLoader.registerPreference("extensions.exquilla.getAllBodies", true);
  await browser.manifestLoader.registerPreference("extensions.exquilla.postExQuilla19", false);
  // useragent string for call, "default" means use the default useragent
  await browser.manifestLoader.registerPreference("extensions.exquilla.useragent", "default");
  // default and saved value of save password in password prompt
  await browser.manifestLoader.registerPreference("extensions.exquilla.savepassword", true);
  // should we fix skink database from native database
  await browser.manifestLoader.registerPreference("extensions.exquilla.fixskinkdb", true);
  // Maximum items per call in folder resync
  await browser.manifestLoader.registerPreference("extensions.exquilla.resyncItemsMax", 500);
  // Largest message count for folders to do automatic resync once per session
  await browser.manifestLoader.registerPreference("extensions.exquilla.resyncFolderSizeMax", 10000);
  // timeout (in milliseconds) for xhr requests (35 minute)
  await browser.manifestLoader.registerPreference("extensions.exquilla.xhrtimeout", 210000);
  // Allow attachments from archived messages of type IPM.Note.EAS
  await browser.manifestLoader.registerPreference("extensions.exquilla.allowEASattachment", false);
  // Limit of open requests to server per mailbox
  await browser.manifestLoader.registerPreference("extensions.exquilla.connectionLimit", 5);
  // Disable collapsed FBA, for testing or special needs
  await browser.manifestLoader.registerPreference("extensions.exquilla.tryFbaCollapsed", true);
  // Shall we log bodies (and subject)? Defaults to false for security reasons.
  await browser.manifestLoader.registerPreference("extensions.exquilla.logBodies", false);
  // the root URI for exquilla address book directories
  await browser.manifestLoader.registerPreference("extensions.exquilla.abScheme", "exquilla-directory");
  // use notifications
  await browser.manifestLoader.registerPreference("extensions.exquilla.useNotifications", true);

  // Load chrome.manifest
  await browser.manifestLoader.loadChromeManifest();

  // Register overlays
  await browser.manifestLoader.registerOverlay("about:accountsettings", "chrome://exquilla/content/AccountManagerOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/addressbook/addressbook.xhtml", "chrome://exquilla/content/addressbookOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/am-identity-edit.xhtml", "chrome://exquilla/content/am-identityOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/am-main.xhtml", "chrome://exquilla/content/am-mainOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/folderProps.xhtml", "chrome://exquilla/content/folderPropsOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messenger.xhtml", "chrome://exquilla/content/messengerOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messageWindow.xhtml", "chrome://exquilla/content/mwoOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messenger.xhtml", "chrome://exquilla/content/mwoOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://exquilla/content/messengerComposeOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/msgAccountCentral.xhtml", "chrome://exquilla/content/msgAccountCentralOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messageWindow.xhtml", "chrome://exquilla/content/msgHVOoverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messenger.xhtml", "chrome://exquilla/content/msgHVOoverlay.xul");
  /* COMPAT for TB 68 */
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/AccountManager.xul", "chrome://exquilla/content/AccountManagerOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/addressbook/addressbook.xul", "chrome://exquilla/content/addressbookOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/am-identity-edit.xul", "chrome://exquilla/content/am-identityOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/am-main.xul", "chrome://exquilla/content/am-mainOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/folderProps.xul", "chrome://exquilla/content/folderPropsOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messenger.xul", "chrome://exquilla/content/messengerOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messageWindow.xul", "chrome://exquilla/content/mwoOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messenger.xul", "chrome://exquilla/content/mwoOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messengercompose/messengercompose.xul", "chrome://exquilla/content/messengerComposeOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/msgAccountCentral.xul", "chrome://exquilla/content/msgAccountCentralOverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messageWindow.xul", "chrome://exquilla/content/msgHVOoverlay.xul");
  await browser.manifestLoader.registerOverlay("chrome://messenger/content/messenger.xul", "chrome://exquilla/content/msgHVOoverlay.xul");
  /* COMPAT for TB 68 */
  await browser.manifestLoader.registerOverlay("about:preferences", "chrome://exquilla/content/preferencesOverlay.xul");

}

startup().catch(console.error);
