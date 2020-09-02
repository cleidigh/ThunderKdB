let messageMap = new Map();

browser.messageDisplayAction.onClicked.addListener((tab) => {
	const message = messageMap.get(tab.id)
	const spamLabel = browser.i18n.getMessage('labelReportSpam')
	browser.storage.local.get({ markAsJunk: true, moveToTrash: false, reported: [] }).then(settings => {
		browser.messageDisplayAction.getTitle({tabId : tab.id}).then(title => {
			if(title == spamLabel) {
				// Report as spam
				settings.reported.push(message.id);
				browser.storage.local.set({ reported: settings.reported });
				browser.messages.getRaw(message.id).then(messageContent => {
					let formData = new FormData();
					formData.append('message', messageContent);
					let fetchInfo = {
						method: "POST",
						mode: "cors",
						body: formData
					};
					fetch('https://europeanmx.eu/spamreport', fetchInfo).then(response => {
						response.json().then(data => {
							if(settings.markAsJunk) browser.messages.update(message.id, {junk: true});
							if(settings.moveToTrash) browser.messages.delete([message.id], false);
						});
					});
				});
				browser.messageDisplayAction.setTitle({tabId: tab.id, title: browser.i18n.getMessage('labelReportHam')});
			}
			else
			{
				// Report as ham
				let reportedIdx = settings.reported.indexOf(message.id);
				if(reportedIdx >= 0) settings.reported.splice(reportedIdx, 1);
				browser.storage.local.set({ reported: settings.reported });
				browser.messages.getRaw(message.id).then(messageContent => {
					let formData = new FormData();
					formData.append('message', messageContent);
					formData.append('ham', 1);
					let fetchInfo = {
						method: "POST",
						mode: "cors",
						body: formData
					};
					fetch('https://europeanmx.eu/spamreport', fetchInfo).then(response => {
						response.json().then(data => {
							browser.messages.update(message.id, {junk: false});
						});
					});
				});
				browser.messageDisplayAction.setTitle({tabId: tab.id, title: browser.i18n.getMessage('labelReportSpam')});
			}
		});
	});
});

browser.messageDisplay.onMessageDisplayed.addListener((tab, message) => {
	browser.messageDisplayAction.disable(tab.id);

	browser.storage.local.get({ reported: [] }).then(settings => {
		if(settings.reported.indexOf(message.id) < 0){
			messageFull = browser.messages.getFull(message.id).then(messageContent => {
				let filterClass = messageContent.headers['x-europeanmx-class'];
				if(filterClass){
					browser.messageDisplayAction.enable(tab.id);
					browser.messageDisplayAction.setTitle({tabId: tab.id, title: browser.i18n.getMessage('labelReportSpam')});
				}
			});
		} else {
			browser.messageDisplayAction.enable(tab.id);
			browser.messageDisplayAction.setTitle({tabId: tab.id, title: browser.i18n.getMessage('labelReportHam')});
		}
	});

	messageMap.set(tab.id, message);
});