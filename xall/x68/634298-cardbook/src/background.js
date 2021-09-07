async function main() {
	// init WindowListener
	messenger.WindowListener.registerChromeUrl([ ["content", "cardbook", "chrome/content/"] ]);
	
	// register a script which is called upon add-on unload (to unload any JSM loaded via overlays)
	messenger.WindowListener.registerShutdownScript("chrome://cardbook/content/scripts/unload.js");
	
	// master password
	await messenger.WindowListener.waitForMasterPassword();
	
	// preferences
	messenger.WindowListener.registerOptionsPage("chrome://cardbook/content/configuration/wdw_cardbookConfiguration.xhtml");
	
	// startup
	messenger.WindowListener.registerStartupScript("chrome://cardbook/content/cardbookInit.js");
	
	// support for customizing toolbars
	messenger.WindowListener.registerWindow("chrome://messenger/content/customizeToolbar.xhtml", "chrome://cardbook/content/customizeToolbar/wl_customizeToolbar.js");
	
	// support for CardBook, yellow stars, creation from emails, formatting email fields
	messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome://cardbook/content/wl_cardbookMessenger.js");
	
	// support for the message window
	messenger.WindowListener.registerWindow("chrome://messenger/content/messageWindow.xhtml", "chrome://cardbook/content/wl_cardbookMessenger.js");
	
	// support for Lightning attendees
	messenger.WindowListener.registerWindow("chrome://calendar/content/calendar-event-dialog-attendees.xhtml", "chrome://cardbook/content/lightning/wl_lightningAttendees.js");
	
	// support for Contacts sidebar
	// support for attaching a vCard
	// support for attaching lists
	// support for CardBook menu in composition window
	messenger.WindowListener.registerWindow("chrome://messenger/content/messengercompose/messengercompose.xhtml", "chrome://cardbook/content/composeMsg/wl_composeMsg.js");
	
	// // support for filter messages
	messenger.WindowListener.registerWindow("chrome://messenger/content/FilterEditor.xhtml", "chrome://cardbook/content/filters/wl_cardbookFilterAction.js");
	messenger.WindowListener.registerWindow("chrome://messenger/content/SearchDialog.xhtml", "chrome://cardbook/content/filters/wl_cardbookFilterAction.js");
	messenger.WindowListener.registerWindow("chrome://messenger/content/mailViewSetup.xhtml", "chrome://cardbook/content/filters/wl_cardbookFilterAction.js");
	messenger.WindowListener.registerWindow("chrome://messenger/content/virtualFolderProperties.xhtml", "chrome://cardbook/content/filters/wl_cardbookFilterAction.js");

	messenger.WindowListener.startListening();

	/* SimpleMailRedirection */
	async function externalListener(message, sender, sendResponse) {
		// sender.id='simplemailredirection@ggbs.de'
		if (message?.query) {
			let data = await messenger.NotifyTools.notifyExperiment(message);
			return data;
		}
		return {};
	}
	messenger.runtime.onMessageExternal.addListener(externalListener);

	messenger.NotifyTools.onNotifyBackground.addListener(async (info) => {
		switch (info.query) {
			case "cardbook.sharevCards":
				let tab1 = await messenger.compose.beginNew();
				for (let vCard of info.vCards) {
					let blob = new Blob([vCard.vCard], {type: "text;charset=utf-8"});
					let file = new File([blob], vCard.filename);
					await messenger.compose.addAttachment(tab1.id, {file: file, name: vCard.filename});
				}
				break;
			case "cardbook.emailCards":
				let tab2 = await messenger.compose.beginNew();
				let composeDetails = {};
				for (let compField of info.compFields) {
					composeDetails[compField.field] = compField.value;
				}
				messenger.compose.setComposeDetails(tab2.id, composeDetails);
				break;
		}
	});

	messenger.compose.onBeforeSend.addListener(async (tab, details) => {
		for (let field of ["to", "cc", "bcc"]) {
			if (details[field].length) {
				for (let address of details[field]) {
					messenger.NotifyTools.notifyExperiment({query: "cardbook.addToCollected", identityId: details.identityId, address: address});
					messenger.NotifyTools.notifyExperiment({query: "cardbook.addToPopularity", address: address});
				}
			}
		}

		await messenger.NotifyTools.notifyExperiment({query: "cardbook.getvCards", identityId: details.identityId})
			.then( async (vCards) => {
				if (vCards) {
					for (let vCard of vCards) {
						let blob = new Blob([vCard.vCard], {type: "text;charset=utf-8"});
						let file = new File([blob], vCard.filename);
						await messenger.compose.addAttachment(tab.id, {file: file, name: vCard.filename});
					}
				}
			});
	});

	messenger.compose.onIdentityChanged.addListener(async (tab, identityId) => {
		messenger.NotifyTools.notifyExperiment({query: "cardbook.identityChanged", windowId: tab.windowId, identityId: identityId});
	});

	// messenger.windows.onCreated.addListener(async (window) => {
	// 	if (window.type == "messageCompose") {
	// 		let infos = {populate: true};
	// 		let windowInfo = await messenger.windows.get(window.id, infos);
	// 		let composeDetail = await messenger.compose.getComposeDetails(windowInfo.tabs[0].id)
	// 		messenger.NotifyTools.notifyExperiment({query: "cardbook.identitySet", windowId: window.id, identityId: composeDetail.identityId});
	// 	}
	// });
};

main();