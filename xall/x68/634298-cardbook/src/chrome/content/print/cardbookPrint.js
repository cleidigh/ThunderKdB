if ("undefined" == typeof(cardbookPrint)) {
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/lists/cardbookListConversion.js", this);

	var cardbookPrint = {
		options: {},

		getTypes: function (aDirPrefId, aType, aInputTypes, aPgType, aPgName, aCardValue) {
			var myInputTypes = [];
			myInputTypes = cardbookRepository.cardbookUtils.getOnlyTypesFromTypes(aInputTypes);
			var myDisplayedTypes = [];
			if (aPgType.length != 0 && aPgName != "") {
				let found = false;
				for (var j = 0; j < aPgType.length; j++) {
					let tmpArray = aPgType[j].split(":");
					if (tmpArray[0] == "X-ABLABEL") {
						myDisplayedTypes.push(tmpArray[1]);
						found = true;
						break;
					}
				}
				if (!found) {
					myDisplayedTypes.push(cardbookRepository.cardbookTypes.whichLabelTypeShouldBeChecked(aType, aDirPrefId, myInputTypes));
				}
			} else {
				myDisplayedTypes.push(cardbookRepository.cardbookTypes.whichLabelTypeShouldBeChecked(aType, aDirPrefId, myInputTypes));
			}
			if (aType == "impp") {
				var serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aInputTypes);
				var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aCardValue);
				if (serviceCode != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
					if (serviceLine[0]) {
						myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
					} else {
						myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
					}
				} else if (serviceProtocol != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
					if (serviceLine[0]) {
						myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
					} else {
						myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
					}
				}
			}
			return myDisplayedTypes;
		},

		addStyle: function (aAllDirPrefId) {
			cardbookPrint.openTag("style", 'type="text/css" id="sheet"', "");
			cardbookPrint.result = cardbookPrint.result + "\r\n";
			cardbookPrint.indentation = cardbookPrint.indentation + "   ";
			cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".vCard { border: 1px solid black; box-shadow: 3px 3px 3px grey; margin-bottom: 10px; padding: 0; }";
			for (let dirPrefId of aAllDirPrefId) {
				cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".cardTitle_" + dirPrefId + " { padding-left: 10%; background: " + cardbookRepository.cardbookPreferences.getColor(dirPrefId) + "; font-weight: bold; }";
			}
			cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".table { text-align: left; word-wrap: break-word; vertical-align: top; }";
			cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".datavalue { width: 100%; white-space: pre-wrap; word-wrap: break-word; }";
			cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".typevalue { white-space: nowrap; }";
			cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".dummyvalue { min-width: 10px; }";
			cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".titlevalue { white-space: nowrap; font-weight: bold; }";
			cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".print_preview_category { border: thin solid; display: inline; padding: 0 0.25em; }";
			var styles = [];
			for (let category in cardbookRepository.cardbookNodeColors) {
				var categoryCleanName = cardbookRepository.cardbookUtils.formatCategoryForCss(category);
				var color = cardbookRepository.cardbookNodeColors[category];
				if (!color) {
					continue;
				}
				var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(color);
				cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".print_preview_category_" + categoryCleanName + "{ color: " + oppositeColor + "; background-color: " + color + "; }";
			}
			cardbookPrint.indentation = cardbookPrint.indentation.replace("   ", "");
			cardbookPrint.closeTag("style", true);
		},

		attachHeaderNode: function (document, child, headerNode, headerKey) {
			if (child.querySelector(".keyheader") || child.querySelector(".key") || child.querySelector(".value")) {
				if (headerNode && cardbookPrint.options.headers && cardbookPrint.options.fieldNames) {
					let templateHeader = document.getElementById("list-item-header");
					let itemHeaderNode = templateHeader.content.cloneNode(true);
					let prefix = cardbookRepository.extension.localeData.localizeMessage(headerKey);
					itemHeaderNode.querySelector(".keyheader").textContent = prefix;
					headerNode.appendChild(itemHeaderNode);
				}
			} else {
				if (headerNode) {
					headerNode.remove();
				}
				child.remove();
			}
		},

		setupLabelPrefPropertyRow: function (document, itemNode, propValue, propType, propPref, propKey) {
			let templateProperty = document.getElementById("list-item-labelprefproperties");
			let itemPropertyNode = templateProperty.content.cloneNode(true);
			if (propValue) {
				if (propKey) {
					itemPropertyNode.querySelector(".key").textContent = propKey;
				}
				if (propPref) {
					// test to change 
					// itemPropertyNode.querySelector(".pref").classlist.add("pref");
					itemPropertyNode.querySelector(".pref").textContent = "★";
				}
				if (propType) {
					itemPropertyNode.querySelector(".type").textContent = propType;
				}
				itemPropertyNode.querySelector(".value").textContent = propValue;
				itemNode.appendChild(itemPropertyNode);
			}
		},

		setupPrefPropertyRow: function (document, itemNode, propValue, propType, propPref) {
			let templateProperty = document.getElementById("list-item-prefproperties");
			let itemPropertyNode = templateProperty.content.cloneNode(true);
			if (propValue) {
				if (propPref) {
					// test to change 
					// itemPropertyNode.querySelector(".pref").classList.add("pref");
					itemPropertyNode.querySelector(".pref").textContent = "★";
				}
				if (propType) {
					itemPropertyNode.querySelector(".type").textContent = propType;
				}
				itemPropertyNode.querySelector(".value").textContent = propValue;
				itemNode.appendChild(itemPropertyNode);
			}
		},

		setupPropertyRow: function (document, itemNode, propValue, propLabel) {
			let templateProperty = document.getElementById("list-item-properties");
			let itemPropertyNode = templateProperty.content.cloneNode(true);
			if (propValue) {
				if (propLabel && cardbookPrint.options.fieldNames) {
					itemPropertyNode.querySelector(".key").textContent = propLabel;
				} else {
					let key = itemPropertyNode.querySelector(".key");
					key.remove();
				}
				itemPropertyNode.querySelector(".value").textContent = propValue;
				itemNode.appendChild(itemPropertyNode);
			}
		},

		buildHTML: function (document, cards, options) {
			for (let option in options) {
				cardbookPrint.options[option] = options[option];
			}

			let listContainer = document.getElementById("list-container");
			while (listContainer.lastChild) {
				listContainer.lastChild.remove();
			}

			let template = document.getElementById("list-item-template");

			let listOfSelectedCard = cards.split(",");
			let dirPrefIds = Array.from(listOfSelectedCard, card => card.dirPrefId);
			dirPrefIds = cardbookRepository.arrayUnique(dirPrefIds);
   			cardbookPrint.result = '';

		   for (let cardId of listOfSelectedCard) {
				let itemNode = template.content.firstElementChild.cloneNode(true);
				let card = cardbookRepository.cardbookCards[cardId];
				let dateFormat = cardbookRepository.getDateFormat(card.dirPrefId, card.version);

				// display name
				if (cardbookPrint.options.fn) {
					let titleNode = itemNode.querySelector(".titlerow");
					cardbookPrint.setupPropertyRow(document, titleNode, card.fn, "");
					cardbookPrint.attachHeaderNode(document, titleNode);
				}

				// categories
				if (cardbookPrint.options.categories) {
					let categoriesNode = itemNode.querySelector(".categoriesrow");
					for (let category of card.categories) {
						let categoryLabel = "";
						if (!cardbookPrint.options.headers) {
							categoryLabel = cardbookRepository.extension.localeData.localizeMessage("categoriesLabel");
						}
						cardbookPrint.setupPropertyRow(document, categoriesNode, category, categoryLabel);
					}
					let categoriesHeaderNode = itemNode.querySelector(".categoriesheaderrow");
					cardbookPrint.attachHeaderNode(document, categoriesNode, categoriesHeaderNode, "categoriesHeader");
				}

				// personal fields
				if (cardbookPrint.options.personal) {
					let personalNode = itemNode.querySelector(".personalrow");
					for (let field of cardbookRepository.allColumns["personal"]) {
						let value = card[field];
						if (cardbookRepository.dateFields.includes(field)) {
							value = cardbookRepository.cardbookDates.getFormattedDateForDateString(card[field], dateFormat, cardbookRepository.dateDisplayedFormat);
						}
						let label = cardbookRepository.extension.localeData.localizeMessage(`${field}Label`)
						cardbookPrint.setupPropertyRow(document, personalNode, value, label);
					}
					if (cardbookPrint.options.custom) {
						for (let customField of cardbookRepository.customFields["personal"]) {
							let customValue = cardbookRepository.cardbookUtils.getCardValueByField(card, customField[0], false)[0];
							let customLabel = customField[1];
							cardbookPrint.setupPropertyRow(document, personalNode, customValue, customLabel);
						}
					}
					let personalHeaderNode = itemNode.querySelector(".personalheaderrow");
					cardbookPrint.attachHeaderNode(document, personalNode, personalHeaderNode, "personalGroupboxLabel");
				}

				if (cardbookPrint.options.org) {
					// org fields
					let orgNode = itemNode.querySelector(".orgrow");
					let orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
					if (orgStructure) {
						let orgStructureArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
						let orgValueArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(card.org).split(";"));
						for (var l = 0; l < orgValueArray.length; l++) {
							let label = orgStructureArray[l];
							let value = orgValueArray[l];
							cardbookPrint.setupPropertyRow(document, orgNode, value, label);
						}
						cardbookPrint.setupPropertyRow(document, orgNode, card.title, cardbookRepository.extension.localeData.localizeMessage("titleLabel"));
						cardbookPrint.setupPropertyRow(document, orgNode, card.role, cardbookRepository.extension.localeData.localizeMessage("roleLabel"));
					} else {
						for (let field of cardbookRepository.allColumns["org"]) {
							let value = card[field];
							let label = cardbookRepository.extension.localeData.localizeMessage(`${field}Label`)
							cardbookPrint.setupPropertyRow(document, orgNode, value, label);
						}
					}
					if (cardbookPrint.options.custom) {
						for (let customField of cardbookRepository.customFields["org"]) {
							let customValue = cardbookRepository.cardbookUtils.getCardValueByField(card, customField[0], false)[0];
							let customLabel = customField[1];
							cardbookPrint.setupPropertyRow(document, orgNode, customValue, customLabel);
						}
					}
					let orgHeaderNode = itemNode.querySelector(".orgheaderrow");
					cardbookPrint.attachHeaderNode(document, orgNode, orgHeaderNode, "orgGroupboxLabel");
				}

				// multine line fields
				if (!card.isAList) {
					for (let field of cardbookRepository.multilineFields) {
						if (cardbookPrint.options[field] == true) {
							let fieldNode = itemNode.querySelector(`.${field}row`);
							for (let line of card[field]) {
								let value = line[0];
								let pref = cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(line[1]);
								let type = cardbookPrint.getTypes(card.dirPrefId, field, line[1], line[3], line[2], line[0][0]).join(" ");
								if (field == "adr") {
									value = cardbookRepository.cardbookUtils.formatAddress(line[0]);
								}
								if (!cardbookPrint.options.headers) {
									let initField = field[0].toUpperCase() + field.slice(1);
									let label = cardbookRepository.extension.localeData.localizeMessage(`typesCategory${initField}Label`);
									cardbookPrint.setupLabelPrefPropertyRow(document, fieldNode, value, type, pref, label);
								} else {
									cardbookPrint.setupPrefPropertyRow(document, fieldNode, value, type, pref);
								}
							}
							let fieldHeaderNode = itemNode.querySelector(`.${field}headerrow`);
							cardbookPrint.attachHeaderNode(document, fieldNode, fieldHeaderNode, `${field}GroupboxLabel`);
						}
					}
				}

				// events
				if (!card.isAList) {
					if (cardbookPrint.options.event) {
						let eventNode = itemNode.querySelector(".eventrow");
						let events = cardbookRepository.cardbookUtils.getEventsFromCard(card.note.split("\n"), card.others);
						for (let event of events.result) {
							let pref = (event[2] && cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(event[2].split(";")));
							let type = cardbookRepository.cardbookDates.getFormattedDateForDateString(event[0], dateFormat, cardbookRepository.dateDisplayedFormat);
							let value = event[1];
							if (!cardbookPrint.options.headers) {
								let label = cardbookRepository.extension.localeData.localizeMessage("eventLabel");
								cardbookPrint.setupLabelPrefPropertyRow(document, eventNode, value, type, pref, label);
							} else {
								cardbookPrint.setupPrefPropertyRow(document, eventNode, value, type, pref);
							}
						}
						let eventHeaderNode = itemNode.querySelector(".eventheaderrow");
						cardbookPrint.attachHeaderNode(document, eventNode, eventHeaderNode, "eventGroupboxLabel");
					}
				}

				// list
				if (card.isAList) {
					let listNode = itemNode.querySelector(".listrow");
					let list = new cardbookListConversion(`${card.fn} <${card.fn}>`);
					for (let email of list.emailResult) {
						let addresses = MailServices.headerParser.parseEncodedHeaderW(email);
						for (let address of addresses) {
							cardbookPrint.setupPropertyRow(document, listNode, address.email, "");
						}
					}
					let listHeaderNode = itemNode.querySelector(".eventheaderrow");
					cardbookPrint.attachHeaderNode(document, listNode, listHeaderNode, "addedCardsGroupboxLabel");
				}
			
				// note
				if (cardbookPrint.options.note) {
					let noteNode = itemNode.querySelector(".noterow");
					if (!cardbookPrint.options.headers) {
						let label = cardbookRepository.extension.localeData.localizeMessage("noteLabel");
						cardbookPrint.setupPropertyRow(document, noteNode, card.note, label);
					} else {
						cardbookPrint.setupPropertyRow(document, noteNode, card.note);
					}
					let noteHeaderNode = itemNode.querySelector(".noteheaderrow");
					cardbookPrint.attachHeaderNode(document, noteNode, noteHeaderNode, "noteGroupboxLabel");
				}

				listContainer.appendChild(itemNode);
			}
		}
	};
};
