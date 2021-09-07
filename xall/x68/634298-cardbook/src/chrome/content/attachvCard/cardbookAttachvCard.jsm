if ("undefined" == typeof(cardbookAttachvCard)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var EXPORTED_SYMBOLS = ["cardbookAttachvCard"];
	var cardbookAttachvCard = {

		getvCards: async function (aIdentity) {
			let finalResult = [];
			let results = cardbookRepository.cardbookPreferences.getAllVCards();
			for (let result of results) {
				if (result[0] == "true") {
					if (result[1] == aIdentity || result[1] == "allMailAccounts") {
						let filename = result[4];
						if (cardbookRepository.cardbookCards[result[2]+"::"+result[3]]) {
							let card = cardbookRepository.cardbookCards[result[2]+"::"+result[3]];
							let vCard = await cardbookRepository.cardbookUtils.getvCardForEmail(card);
							finalResult.push({filename: filename, vCard: vCard});
						}
					}
				}
			}
			return finalResult;
		}
	};
};
