if ("undefined" == typeof(wdw_templateEdition)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
		
	var wdw_templateEdition = {
		
		createTemplate: function () {
			let myCard = new cardbookCardParser();
			myCard.dirPrefId = wdw_cardEdition.workingCard.dirPrefId;
			myCard.fn = cardbookRepository.cardbookPreferences.getFnFormula(wdw_cardEdition.workingCard.dirPrefId);
			cardbookWindowUtils.openEditionWindow(myCard, "EditTemplate");
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
					} else if (fileContentArray[i].toUpperCase() == "FN:") {
						cardContent = cardContent + "\r\n" + "FN:" + cardbookRepository.cardbookPreferences.getFnFormula(wdw_cardEdition.workingCard.dirPrefId);
					} else if (fileContentArray[i].toUpperCase().startsWith("END:VCARD")) {
						cardContent = cardContent + "\r\n" + fileContentArray[i];
						let myTemplateCard = new cardbookCardParser(cardContent, "", "", wdw_cardEdition.workingCard.dirPrefId);
						if (myTemplateCard.isAList != wdw_cardEdition.workingCard.isAList || wdw_cardEdition.workingCard.isAList) {
							return;
						}
						myTemplateCard.dirPrefId = wdw_cardEdition.workingCard.dirPrefId;
						cardbookWindowUtils.openEditionWindow(myTemplateCard, "EditTemplate");
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

		saveTemplate: function (aCardIn, aCardOut, aMode) {
			cardbookWindowUtils.callFilePicker("fileCreationTPLTitle", "SAVE", "TPL", "", "", wdw_templateEdition.saveTemplateNext, aCardOut);
		},

		saveTemplateNext: async function (aFile, aCardOut) {
			try {
				if (!(aFile.exists())) {
					aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
				}

				let content = await cardbookRepository.cardbookUtils.getvCardForEmail(aCardOut);
				cardbookRepository.cardbookUtils.writeContentToFile(aFile.path, content, "UTF8");
			} catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("saveTemplateNext error : " + e, "Error");
			}
		},

		applyTemplate: function () {
			cardbookWindowUtils.callFilePicker("fileSelectionTPLTitle", "OPEN", "TPL", "", "", wdw_templateEdition.applyTemplateNext);
		},

		applyTemplateNext: function (aFile) {
			try {
				if (aFile) {
					cardbookRepository.cardbookSynchronization.getFileDataAsync(aFile.path, wdw_templateEdition.applyTemplateNext2, {});
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("applyTemplateNext error : " + e, "Error");
			}
		},

		applyTemplateNext2: function (aContent) {
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
						let myTempCard = new cardbookCardParser();
						wdw_cardEdition.calculateResult(myTempCard);

						let myTemplateCard = new cardbookCardParser(cardContent, "", "", myTempCard.dirPrefId);
						if (myTemplateCard.isAList != myTempCard.isAList || myTempCard.isAList) {
							return;
						}

						let listFields = ["prefixname", "firstname", "othername", "lastname", "suffixname", "nickname", "org", "title", "role"]
						for (let field of listFields) {
							if (myTempCard[field] == "" && myTemplateCard[field] != "") {
								myTempCard[field] = myTemplateCard[field];
							}
						}
						myTempCard.categories = myTempCard.categories.concat(myTemplateCard.categories);
						myTempCard.categories = cardbookRepository.cardbookUtils.cleanCategories(myTempCard.categories);

						let myOrg = [wdw_cardEdition.getOrg(false), myTempCard.title, myTempCard.role];
						let myN = [myTempCard.prefixname, myTempCard.firstname, myTempCard.othername, myTempCard.lastname,
									myTempCard.suffixname, myTempCard.nickname];
						let data = cardbookRepository.cardbookUtils.getFnDataForFormula(myN, myOrg);

						if (myTemplateCard.fn.includes("{{")) {
							myTempCard.fn = cardbookRepository.cardbookUtils.getStringFromFormula(myTemplateCard.fn, data);
						} else {
							let myFnFormula = cardbookRepository.cardbookPreferences.getFnFormula(aDirPrefId);
							myTempCard.fn = cardbookRepository.cardbookUtils.getStringFromFormula(myFnFormula, data);
						}

						function stringify(aEntryLine) {
							return aEntryLine[0].join(",");
						};
						function addIfMissing(aEntryLine, aEntryLines) {
							let lineToAdd = stringify(aEntryLine);
							for (let entryLine of aEntryLines) {
								if (stringify(entryLine) == lineToAdd) {
									return;
								}
							}
							aEntryLines.push(aEntryLine);
						};
						for (let type of cardbookRepository.multilineFields) {
							if (type == "adr") {
								for (let entryLine of myTemplateCard[type]) {
									addIfMissing(entryLine, myTempCard[type])
								}
							} else {
								for (let entryLine of myTemplateCard[type]) {
									entryLine[0][0] = cardbookRepository.cardbookUtils.getStringFromFormula(entryLine[0][0], data).toLowerCase();
									addIfMissing(entryLine, myTempCard[type])
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
