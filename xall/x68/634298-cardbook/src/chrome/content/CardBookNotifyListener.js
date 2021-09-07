notifyTools.enable();

let id = notifyTools.registerListener(async (message) => {
	switch (message.query) {
		case "simpleMailRedirection.version":
		case "version":
			return simpleMailRedirection.version();
			break;
		case "simpleMailRedirection.lists":
		case "lists":
			return simpleMailRedirection.lists(message.id);  //all lists if exists, else emails of list with id
			break;
		case "simpleMailRedirection.contacts":
		case "contacts":
			return simpleMailRedirection.contacts(message.search);
			break;
		case "simpleMailRedirection.openBook":
		case "openBook":
			let m3p = Services.wm.getMostRecentWindow("mail:3pane");
			if (m3p) {
				let tabmail = m3p.document.getElementById("tabmail");
				if (tabmail) {
					//m3p.focus();
					tabmail.openTab("cardbook", { title: cardbookRepository.extension.localeData.localizeMessage("cardbookTitle") });
				}
			}
			break;
		case "cardbook.addToCollected":
			cardbookRepository.cardbookCollection.addCollectedContact(message.identityId, message.address);
			break;
		case "cardbook.addToPopularity":
			cardbookRepository.updateMailPop(message.address);
			break;
		case "cardbook.getvCards":
			let vCards = await cardbookRepository.cardbookAttachvCard.getvCards(message.identityId);
			console.debug(vCards)
			return vCards;
			break;
		case "cardbook.identityChanged":
			cardbookRepository.cardbookUtils.notifyObservers("identityChanged", message.windowId);
			break;
		}
	});
