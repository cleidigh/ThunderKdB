if ("undefined" == typeof(wdw_templateEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
		
	var wdw_templateEdition = {
		
		saveTemplate: function () {
			if (wdw_cardEdition.validate()) {
				cardbookWindowUtils.callFilePicker("fileCreationTPLTitle", "SAVE", "TPL", "", "", wdw_templateEdition.saveTemplateNext);
			}
		},

		saveTemplateNext: async function (aFile) {
			try {
				if (!(aFile.exists())) {
					aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
				}

				var myOutCard = new cardbookCardParser();
				wdw_cardEdition.calculateResult(myOutCard);

				cardbookRepository.cardbookUtils.writeContentToFile(aFile.path, await cardbookRepository.cardbookUtils.getvCardForEmail(myOutCard), "UTF8");
			} catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("saveTemplateNext error : " + e, "Error");
			}
		},

		loadTemplate: function () {
			cardbookWindowUtils.callFilePicker("fileSelectionTPLTitle", "OPEN", "TPL", "", "", wdw_templateEdition.loadTemplateNext);
		},

		loadTemplateNext: function (aFile) {
			try {
				if (aFile) {
					cardbookRepository.cardbookSynchronization.getFileDataAsync(aFile.path, wdw_templateEdition.loadTemplateNext2, {});
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("loadTemplateNext error : " + e, "Error");
			}
		},

		loadTemplateNext2: function (aContent) {
			if (aContent) {
 				let re = /[\n\u0085\u2028\u2029]|\r\n?/;
				let fileContentArray = cardbookRepository.cardbookUtils.cleanArrayWithoutTrim(aContent.split(re));
				let fileContentArrayLength = fileContentArray.length
				let cardContent = "";
				for (let i = 0; i < fileContentArrayLength; i++) {
					if (fileContentArray[i].toUpperCase().startsWith("BEGIN:VCARD")) {
						cardContent = fileContentArray[i];
					} else if (fileContentArray[i].toUpperCase().startsWith("END:VCARD")) {
						cardContent = cardContent + "\r\n" + fileContentArray[i];
						let myTemplateCard = new cardbookCardParser(cardContent, "", "", wdw_cardEdition.workingCard.dirPrefId);
						if (myTemplateCard.isAList != wdw_cardEdition.workingCard.isAList || wdw_cardEdition.workingCard.isAList) {
							return;
						}

						let myTempCard = new cardbookCardParser();
						wdw_cardEdition.calculateResult(myTempCard);
						let listFields = ["prefixname", "firstname", "othername", "lastname", "suffixname", "nickname", "org", "title", "role"]
						for (let field of listFields) {
							if (myTempCard[field] == "" && myTemplateCard[field] != "") {
								myTempCard[field] = myTemplateCard[field];
							}
						}
						myTempCard.categories = myTempCard.categories.concat(myTemplateCard.categories);
						myTempCard.categories = cardbookRepository.cardbookUtils.cleanCategories(myTempCard.categories);

						let myOrg = [wdw_cardEdition.getOrg(false),
										wdw_cardEdition.workingCard.title, wdw_cardEdition.workingCard.role];
						let myN = [wdw_cardEdition.workingCard.prefixname, wdw_cardEdition.workingCard.firstname,
									wdw_cardEdition.workingCard.othername, wdw_cardEdition.workingCard.lastname,
									wdw_cardEdition.workingCard.suffixname, wdw_cardEdition.workingCard.nickname];
						let data = cardbookRepository.cardbookUtils.getFnDataForFormula(myN, myOrg);
						
						for (let type of cardbookRepository.multilineFields) {
							if (type == "adr") {
								for (let entryLine of myTemplateCard[type]) {
									myTempCard[type].push(entryLine);
								}
							} else {
								for (let entryLine of myTemplateCard[type]) {
									entryLine[0][0] = cardbookRepository.cardbookUtils.getStringFromFormula(entryLine[0][0], data);
									myTempCard[type].push(entryLine);
								}
							}
						}

						if (myTempCard.note == "" && myTemplateCard.note != "") {
							myTempCard.note = cardbookRepository.cardbookUtils.getStringFromFormula(myTemplateCard.note, data);
						}

						let dateFormat = cardbookRepository.getDateFormat(myTempCard.dirPrefId, myTempCard.version);
						let myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(myTemplateCard.note.split("\n"), myTemplateCard.others);
						let myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(myTempCard);
						for (let entryLine of myEvents.result) {
							entryLine[1] = cardbookRepository.cardbookUtils.getStringFromFormula(entryLine[1], data);
						}
						cardbookRepository.cardbookUtils.addEventstoCard(myTempCard, myEvents.result, myPGNextNumber, dateFormat);

						for (let type of ["personal", "org"]) {
							for (let custom of cardbookRepository.customFields[type]) {
								let tempCustomValue = cardbookRepository.cardbookUtils.getCardValueByField(myTempCard, custom[0], false);
								let templateCustomValue = cardbookRepository.cardbookUtils.getCardValueByField(myTemplateCard, custom[0], false);
								if (tempCustomValue.length == 0 && templateCustomValue.length != 0) {
									let value = cardbookRepository.cardbookUtils.getStringFromFormula(templateCustomValue[0], data);
									cardbookRepository.cardbookUtils.setCardValueByField(myTempCard, custom[0], value);
								}
							}
						}

						wdw_cardEdition.cloneCard(myTempCard, wdw_cardEdition.workingCard);
						wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
						myTempCard = null;
						
						// first vCard shown
						return;
					} else if (fileContentArray[i] == "") {
						continue;
					} else {
						cardContent = cardContent + "\r\n" + fileContentArray[i];
					}
				}
			}
		},
	};
};
