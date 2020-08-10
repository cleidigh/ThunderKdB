async function main() {
	// init ConversionHelper
	await browser.ConversionHelper.registerChromeUrl([ ["content", "cardbook", "chrome/content/"] ]);
	await browser.ConversionHelper.registerApiFolder("chrome://cardbook/content/api/ConversionHelper/");
	
	// register a script which is called upon add-on unload (to unload any JSM loaded via overlays)
	await browser.ConversionHelper.registerUnloadScript("chrome://cardbook/content/scripts/unload.js");
	
	// register and activate overlays
	await browser.ConversionHelper.setOverlayVerbosity(9);
	
	// support for customizing toolbars
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/customizeToolbar.xhtml", "chrome://cardbook/content/customizeToolbar/ovl_customizeToolbar.xhtml");
	
	// support for CardBook, yellow stars, creation from emails, formatting email fields
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/messenger.xhtml", "chrome://cardbook/content/ovl_cardbook.xhtml");
	
	// support for filter messages
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/messenger.xhtml", "chrome://cardbook/content/filters/ovl_filters.xhtml");
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/FilterEditor.xhtml", "chrome://cardbook/content/filters/ovl_filterEditor.xhtml");
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/SearchDialog.xhtml", "chrome://cardbook/content/filters/ovl_filterEditor.xhtml");
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/mailViewSetup.xhtml", "chrome://cardbook/content/filters/ovl_filterEditor.xhtml");
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/virtualFolderProperties.xhtml", "chrome://cardbook/content/filters/ovl_filterEditor.xhtml");
	
	// support for Lightning attendees
	await browser.ConversionHelper.registerOverlay("chrome://calendar/content/calendar-event-dialog-attendees.xhtml", "chrome://cardbook/content/lightning/ovl_lightningAttendees.xhtml");
	
	// support for Contacts sidebar
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://cardbook/content/contactsSidebar/ovl_cardbookContactsSidebarMain.xhtml");
	
	// support for attaching a vCard
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://cardbook/content/attachvCard/ovl_attachvCard.xhtml");
	
	// support for CardBook menu in composition window
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://cardbook/content/ovl_cardbookComposeMsg.xhtml");
	
	// support for collected mail
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://cardbook/content/collected/ovl_collected.xhtml");
	
	// support for expanding list
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://cardbook/content/lists/ovl_list.xhtml");
	
	// support for the message window
	await browser.ConversionHelper.registerOverlay("chrome://messenger/content/messageWindow.xhtml", "chrome://cardbook/content/ovl_cardbookContexts.xhtml");
	
	await browser.ConversionHelper.activateOverlays();
	
	// startup completed
	await messenger.ConversionHelper.notifyStartupCompleted();
}

main();
