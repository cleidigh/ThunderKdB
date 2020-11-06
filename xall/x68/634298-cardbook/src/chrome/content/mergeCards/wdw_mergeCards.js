if ("undefined" == typeof(wdw_mergeCards)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_mergeCards = {
		arrayField: {},
		version: "",
		mode: "CONTACT",
		
		createCheckBox1: function (aRow, aName, aValue) {
			var aCheckbox = document.createXULElement('checkbox');
			aRow.appendChild(aCheckbox);
			aCheckbox.setAttribute('id', aName);
			aCheckbox.setAttribute('checked', aValue);
			aCheckbox.setAttribute('flex', '1');
			aCheckbox.addEventListener("command", function() {
				var field = this.id.replace(/Checkbox.*/,"");
				var number = this.id.replace(/.*Checkbox/,"");
				if (this.checked) {
					for (let j = 0; j < window.arguments[0].cardsIn.length; j++) {
						if (j != number) {
							if (document.getElementById(field + 'Checkbox' + j)) {
								var aCheckbox = document.getElementById(field + 'Checkbox' + j);
								aCheckbox.setAttribute('checked', false);
							}
						}
					}
				}
				for (let j = 0; j < window.arguments[0].cardsIn.length; j++) {
					if (document.getElementById(field + 'Textbox' + j)) {
						var aTextbox = document.getElementById(field + 'Textbox' + j);
						if (j != number) {
							aTextbox.setAttribute('mergeSelected', 'false');
							aTextbox.setAttribute('readonly', 'true');
						} else {
							if (this.checked) {
								aTextbox.setAttribute('mergeSelected', 'true');
								aTextbox.removeAttribute('readonly');
							} else {
								aTextbox.setAttribute('mergeSelected', 'false');
								aTextbox.setAttribute('readonly', 'true');
							}
						}
					}
				}
			}, false);
		},

		createCheckBox2: function (aRow, aName, aValue) {
			var aCheckbox = document.createXULElement('checkbox');
			aRow.appendChild(aCheckbox);
			aCheckbox.setAttribute('id', aName);
			aCheckbox.setAttribute('checked', aValue);
			aCheckbox.setAttribute('flex', '1');
			aCheckbox.addEventListener("command", function() {
				var field = this.id.replace(/Checkbox.*/,"");
				if (document.getElementById(field + 'Textbox0')) {
					var aTextbox = document.getElementById(field + 'Textbox0');
					if (this.checked) {
						aTextbox.setAttribute('mergeSelected', 'true');
					} else {
						aTextbox.setAttribute('mergeSelected', 'false');
					}
				}
				if (document.getElementById(field + 'Textbox1')) {
					var aTextbox = document.getElementById(field + 'Textbox1');
					if (this.checked) {
						aTextbox.setAttribute('mergeSelected', 'true');
					} else {
						aTextbox.setAttribute('mergeSelected', 'false');
					}
				}
			}, false);
		},

		createCheckBox3: function (aRow, aName, aValue) {
			var aCheckbox = document.createXULElement('checkbox');
			aRow.appendChild(aCheckbox);
			aCheckbox.setAttribute('id', aName);
			aCheckbox.setAttribute('checked', aValue);
			aCheckbox.setAttribute('flex', '1');
			aCheckbox.addEventListener("command", function() {
				var field = this.id.replace(/Checkbox.*/,"");
				var number = this.id.replace(/.*Checkbox/,"");
				if (this.checked) {
					for (let j = 0; j < window.arguments[0].cardsIn.length; j++) {
						if (j != number) {
							if (document.getElementById(field + 'Checkbox' + j)) {
								var aCheckbox = document.getElementById(field + 'Checkbox' + j);
								aCheckbox.setAttribute('checked', false);
							}
						}
					}
				}
				for (let j = 0; j < window.arguments[0].cardsIn.length; j++) {
					if (document.getElementById(field + 'Textbox' + j)) {
						var aTextbox = document.getElementById(field + 'Textbox' + j);
						if (j != number) {
							aTextbox.setAttribute('mergeSelected', 'false');
							aTextbox.setAttribute('readonly', 'true');
						} else {
							if (this.checked) {
								aTextbox.setAttribute('mergeSelected', 'true');
								aTextbox.removeAttribute('readonly');
							} else {
								aTextbox.setAttribute('mergeSelected', 'false');
								aTextbox.setAttribute('readonly', 'true');
							}
						}
					}
				}
				wdw_mergeCards.setAddressBookProperties(window.arguments[0].cardsIn[number][field]);
			}, false);
		},

		createTextBox: function (aRow, aName, aValue, aSelected, aDisabled, aArrayValue) {
			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', aName);
			aTextbox.setAttribute('value', aValue);
			aTextbox.setAttribute('flex', '1');
			if (aArrayValue) {
				var field = aName.replace(/Textbox.*/,"");
				wdw_mergeCards.arrayField[field] = aArrayValue;
			}
			aTextbox.setAttribute('mergeSelected', aSelected);
			if (aSelected) {
				if (aDisabled) {
					aTextbox.setAttribute('readonly', 'true');
				} else {
					aTextbox.removeAttribute('readonly');
				}
			} else {
				aTextbox.setAttribute('readonly', 'true');
			}
		},

		createMultilineTextBox: function (aRow, aName, aValue, aSelected, aDisabled, aLength) {
			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:textarea");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('multiline', true);
			aTextbox.setAttribute('wrap', 'virtual');
			aTextbox.setAttribute('id', aName);
			aTextbox.value = aValue;
			aTextbox.setAttribute('flex', '1');
			aTextbox.setAttribute('mergeSelected', aSelected);
			if (aSelected) {
				if (aDisabled) {
					aTextbox.setAttribute('readonly', 'true');
				} else {
					aTextbox.removeAttribute('readonly');
				}
			} else {
				aTextbox.setAttribute('readonly', 'true');
			}
			aTextbox.setAttribute('rows', aLength);
		},

		createImageBox: function (aRow, aName, aValue, aSelected) {
			var aVbox = wdw_mergeCards.createVbox(aRow);
			aVbox.setAttribute("width", "170px");
			var aHbox = wdw_mergeCards.createHbox(aVbox);
			aHbox.setAttribute("height", "170px");
			var aImageForSizing =  document.createElementNS("http://www.w3.org/1999/xhtml","img");
			aHbox.appendChild(aImageForSizing);
			aImageForSizing.setAttribute('id', aName + "ForSizing");
			aImageForSizing.setAttribute('hidden', "true");
			var aImage = document.createXULElement('image');
			aHbox.appendChild(aImage);
			aImage.setAttribute('id', aName + "Displayed");
			wdw_mergeCards.arrayField[aName] = aValue;

			aImage.src = "";
			aImageForSizing.src = "";
			aImageForSizing.addEventListener("load", function() {
				var myImageWidth = 170;
				var myImageHeight = 170;
				if (this.width >= this.height) {
					widthFound = myImageWidth + "px" ;
					heightFound = Math.round(this.height * myImageWidth / this.width) + "px" ;
				} else {
					widthFound = Math.round(this.width * myImageHeight / this.height) + "px" ;
					heightFound = myImageHeight + "px" ;
				}
				var field = this.id.replace(/ForSizing.*/,"");
				var myImage = document.getElementById(field + "Displayed");
				myImage.setAttribute("width", widthFound);
				myImage.setAttribute("height", heightFound);
				myImage.setAttribute("src", this.src);
			}, false);
			aImageForSizing.src = aValue;
		},

		createLabel: function (aRow, aName, aValue) {
			var aLabel = document.createXULElement('label');
			aRow.appendChild(aLabel);
			aLabel.setAttribute('id', aName);
			aLabel.setAttribute('value', cardbookRepository.extension.localeData.localizeMessage(aValue));
		},

		createCustomLabel: function (aRow, aName, aValue) {
			var aLabel = document.createXULElement('label');
			aRow.appendChild(aLabel);
			aLabel.setAttribute('id', aName);
			aLabel.setAttribute('value', aValue);
		},

		createRow: function (aParent, aName) {
			var aRow = document.createXULElement('row');
			aParent.appendChild(aRow);
			aRow.setAttribute('id', aName);
			aRow.setAttribute('align', 'center');
			aRow.setAttribute('flex', '1');
			return aRow
		},

		createHbox: function (aParent) {
			var aHbox = document.createXULElement('hbox');
			aParent.appendChild(aHbox);
			aHbox.setAttribute('align', 'center');
			aHbox.setAttribute('flex', '1');
			return aHbox
		},

		createVbox: function (aParent) {
			var aHbox = document.createXULElement('vbox');
			aParent.appendChild(aHbox);
			aHbox.setAttribute('align', 'center');
			aHbox.setAttribute('flex', '1');
			return aHbox
		},

		createAddressbook: function (aParent, aListOfCards) {
			var dirPrefId = "";
			var multiples = false;
			for (let i = 0; i < aListOfCards.length; i++) {
				if (dirPrefId == "") {
					dirPrefId = aListOfCards[i].dirPrefId;
				} else if (dirPrefId != aListOfCards[i].dirPrefId) {
					multiples = true;
					break;
				}
			}
			if (multiples) {
				var aRow = document.createXULElement('row');
				aParent.appendChild(aRow);
				wdw_mergeCards.createLabel(aRow, 'ABNameLabel', 'ABNameLabel');
				var selected = true;
				for (let j = 0; j < listOfCards.length; j++) {
					wdw_mergeCards.createCheckBox3(aRow, 'dirPrefId' + 'Checkbox' + j, selected);
					wdw_mergeCards.createTextBox(aRow, 'dirPrefId' + 'Textbox' + j, cardbookRepository.cardbookUtils.getPrefNameFromPrefId(listOfCards[j]['dirPrefId']), selected, true);
					if (selected) {
						wdw_mergeCards.setAddressBookProperties(listOfCards[j]['dirPrefId']);
					}
					selected = false;
				}
			} else {
				wdw_mergeCards.setAddressBookProperties(dirPrefId);
			}
		},

		setAddressBookProperties: function (aDirPrefId) {
			wdw_mergeCards.setReadOnlyMode(aDirPrefId);
			wdw_mergeCards.setVersion(aDirPrefId);
		},

		setReadOnlyMode: function (aDirPrefId) {
			if (cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
				document.getElementById('viewResultEditionLabel').disabled=true;
				document.getElementById('createEditionLabel').disabled=true;
				document.getElementById('createAndReplaceEditionLabel').disabled=true;
			} else {
				document.getElementById('viewResultEditionLabel').disabled=false;
				document.getElementById('createEditionLabel').disabled=false;
				document.getElementById('createAndReplaceEditionLabel').disabled=false;
			}
		},

		setHideCreate: function () {
			if (window.arguments[0].hideCreate) {
				document.getElementById('createEditionLabel').hidden=true;
			} else {
				document.getElementById('createEditionLabel').hidden=false;
			}
		},

		setContactOrList: function () {
			if (window.arguments[0].cardsIn[0].isAList) {
				wdw_mergeCards.mode="LIST";
			} else {
				wdw_mergeCards.mode="CONTACT";
			}
		},

		setVersion: function (aDirPrefId) {
			wdw_mergeCards.version = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
		},

		addRowFromArray: function (aListOfCards, aField) {
			for (let i = 0; i < aListOfCards.length; i++) {
				if (aListOfCards[i][aField].length != 0) {
					return true;
				}
			}
			return false;
		},

		addRowCustomFromArray: function (aListOfCards, aField) {
			for (let i = 0; i < aListOfCards.length; i++) {
				for (let j = 0; j < aListOfCards[i].others.length; j++) {
					var othersTempArray = aListOfCards[i].others[j].split(":");
					if (aField == othersTempArray[0]) {
						return true;
					}
				}
			}
			return false;
		},

		addRowFromPhoto: function (aListOfCards, aField) {
			for (let i = 0; i < aListOfCards.length; i++) {
				if (aListOfCards[i][aField].localURI != "") {
					return true;
				}
			}
			return false;
		},
		
		load: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_mergeCards.setHideCreate();
			wdw_mergeCards.setContactOrList();
			
			listOfCards = window.arguments[0].cardsIn;
			var aListRows = document.getElementById('fieldsVbox');
			wdw_mergeCards.createAddressbook(aListRows, listOfCards);
			for (let i of [ 'photo' ]) {
				if (wdw_mergeCards.addRowFromPhoto(listOfCards, i)) {
					var aRow = wdw_mergeCards.createRow(aListRows, i + 'Row');
					wdw_mergeCards.createLabel(aRow, i + 'Label', i + 'Label');
					var selected = true;
					for (let j = 0; j < listOfCards.length; j++) {
						if (listOfCards[j][i].localURI != "") {
							wdw_mergeCards.createCheckBox1(aRow, i + 'Checkbox' + j, selected);
							wdw_mergeCards.createImageBox(aRow, i + 'Textbox' + j, listOfCards[j][i].localURI, selected, false);
							selected = false;
						} else {
							wdw_mergeCards.createHbox(aRow);
							wdw_mergeCards.createHbox(aRow);
						}
					}
				}
			}
			var fields = cardbookRepository.allColumns.display.concat(cardbookRepository.allColumns.personal);
			fields = fields.concat(cardbookRepository.allColumns.org);
			for (let i of fields) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, i)) {
					var aRow = wdw_mergeCards.createRow(aListRows, i + 'Row');
					wdw_mergeCards.createLabel(aRow, i + 'Label', i + 'Label');
					var selected = true;
					for (let j = 0; j < listOfCards.length; j++) {
						if (listOfCards[j][i]) {
							wdw_mergeCards.createCheckBox1(aRow, i + 'Checkbox' + j, selected);
							wdw_mergeCards.createTextBox(aRow, i + 'Textbox' + j, listOfCards[j][i], selected, false);
							selected = false;
						} else {
							wdw_mergeCards.createHbox(aRow);
							wdw_mergeCards.createHbox(aRow);
						}
					}
				}
			}
			for (let i in cardbookRepository.customFields) {
				for (let j = 0; j < cardbookRepository.customFields[i].length; j++) {
					if (wdw_mergeCards.addRowCustomFromArray(listOfCards, cardbookRepository.customFields[i][j][0])) {
						var prefixRow = i + cardbookRepository.customFields[i][j][2];
						var aRow = wdw_mergeCards.createRow(aListRows, prefixRow + 'Row');
						wdw_mergeCards.createCustomLabel(aRow, prefixRow + 'Label', cardbookRepository.customFields[i][j][1]);
						var selected = true;
						for (let k = 0; k < listOfCards.length; k++) {
							var customValue = cardbookRepository.cardbookUtils.getCardValueByField(listOfCards[k], cardbookRepository.customFields[i][j][0], false);
							if (customValue != "") {
								wdw_mergeCards.createCheckBox1(aRow, prefixRow + 'Checkbox' + k, selected);
								wdw_mergeCards.createTextBox(aRow, prefixRow + 'Textbox' + k, customValue, selected, false);
								selected = false;
							} else {
								wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createHbox(aRow);
							}
						}
					}
				}
			}
			for (let i of cardbookRepository.allColumns.categories) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, i)) {
					var length = 0
					for (let j = 0; j < listOfCards.length; j++) {
						if (length < listOfCards[j][i].length) {
							length = listOfCards[j][i].length;
						}
					}
					var arrayOfValues = [];
					for (let j = 0; j < length; j++) {
						var aRow = wdw_mergeCards.createRow(aListRows, i + 'Row' + j);
						wdw_mergeCards.createLabel(aRow, i + 'Label' + j, i + 'Label');
						for (let k = 0; k < listOfCards.length; k++) {
							if (listOfCards[k][i][j]) {
								arrayOfValues.push(listOfCards[k][i][j]);
								var length1 = arrayOfValues.length;
								arrayOfValues = cardbookRepository.arrayUnique(arrayOfValues);
								var length2 = arrayOfValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, i + '_' + j + '_' + k + '_Checkbox0', selected);
								wdw_mergeCards.createTextBox(aRow, i + '_' + j + '_' + k + '_Textbox0', listOfCards[k][i][j], selected, true, listOfCards[k][i][j]);
							} else {
								wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createHbox(aRow);
							}
						}
					}
				}
			}
			if (wdw_mergeCards.mode == "CONTACT") {
				for (let i of cardbookRepository.multilineFields) {
					if (wdw_mergeCards.addRowFromArray(listOfCards, i)) {
						var length = 0
						for (let j = 0; j < listOfCards.length; j++) {
							if (length < listOfCards[j][i].length) {
								length = listOfCards[j][i].length;
							}
						}
						var arrayOfValues = [];
						for (let j = 0; j < length; j++) {
							var aRow = wdw_mergeCards.createRow(aListRows, i + 'Row' + j);
							wdw_mergeCards.createLabel(aRow, i + 'Label' + j, i + 'Label');
							for (let k = 0; k < listOfCards.length; k++) {
								if (listOfCards[k][i][j]) {
									if (i == "tel") {
										arrayOfValues.push(cardbookRepository.cardbookUtils.formatTelForSearching(listOfCards[k][i][j][0][0]));
									} else {
										arrayOfValues.push(listOfCards[k][i][j][0].join(","));
									}
									var length1 = arrayOfValues.length;
									arrayOfValues = cardbookRepository.arrayUnique(arrayOfValues);
									var length2 = arrayOfValues.length;
									if (length1 != length2) {
										var selected = false;
									} else {
										var selected = true;
									}
									wdw_mergeCards.createCheckBox2(aRow, i + '_' + j + '_' + k + '_Checkbox0', selected);
									var aHbox = wdw_mergeCards.createHbox(aRow);
									
									var aCardValue = listOfCards[k][i][j][0];
									var aInputTypes = listOfCards[k][i][j][1];
									var aPgType = listOfCards[k][i][j][3];
									var aPgName = listOfCards[k][i][j][2];
									var myInputTypes = [];
									myInputTypes = cardbookRepository.cardbookUtils.getOnlyTypesFromTypes(aInputTypes);
									var aPrefImage = document.createXULElement('image');
									aHbox.appendChild(aPrefImage);
									aPrefImage.setAttribute('id', i + '_' + j + '_' + k + '_PrefImage');
									if (cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(aInputTypes)) {
										aPrefImage.setAttribute('class', 'cardbookPrefStarClass');
										aPrefImage.setAttribute('haspref', 'true');
									} else {
										aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
										aPrefImage.removeAttribute('haspref');
									}
									var myDisplayedTypes = [];
									if (aPgType.length != 0 && aPgName != "") {
										let found = false;
										for (let l = 0; l < aPgType.length; l++) {
											let tmpArray = aPgType[l].split(":");
											if (tmpArray[0] == "X-ABLABEL") {
												myDisplayedTypes.push(tmpArray[1]);
												found = true;
												break;
											}
										}
										if (!found) {
											myDisplayedTypes.push(cardbookRepository.cardbookTypes.whichLabelTypeShouldBeChecked(i, listOfCards[k].dirPrefId, myInputTypes));
										}
									} else {
										myDisplayedTypes.push(cardbookRepository.cardbookTypes.whichLabelTypeShouldBeChecked(i, listOfCards[k].dirPrefId, myInputTypes));
									}
									if (i == "impp") {
										var serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aInputTypes);
										var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aCardValue);
										var myValue = aCardValue.join(" ");
										if (serviceCode != "") {
											var serviceLine = [];
											serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
											if (serviceLine[0]) {
												myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
												wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
												var myRegexp = new RegExp("^" + serviceLine[2] + ":");
												myValue = myValue.replace(myRegexp, "");
												wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][i][j]);
											} else {
												myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
												wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
												wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][i][j]);
											}
										} else if (serviceProtocol != "") {
											var serviceLine = [];
											serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
											if (serviceLine[0]) {
												myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
												wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
												var myRegexp = new RegExp("^" + serviceLine[2] + ":");
												myValue = myValue.replace(myRegexp, "");
												wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][i][j]);
											} else {
												myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
												wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
												wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][i][j]);
											}
										} else {
											wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
											wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][i][j]);
										}
									} else {
										wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
										if (i == "adr") {
											var re = /[\n\u0085\u2028\u2029]|\r\n?/;
											var myAdrResult = cardbookRepository.cardbookUtils.formatAddress(aCardValue);
											var myAdrResultArray = myAdrResult.split(re);
											wdw_mergeCards.createMultilineTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox1', myAdrResult, selected, true, myAdrResultArray.length);
										} else {
											wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox1', cardbookRepository.cardbookUtils.cleanArray(aCardValue).join(" "), selected, true);
										}
									}
								} else {
									wdw_mergeCards.createHbox(aRow);
									wdw_mergeCards.createHbox(aRow);
								}
							}
						}
					}
				}
				for (let i of [ 'event' ]) {
					var length = 0
					var arrayOfValues = [];
					var processedValues = [];
					for (let card of listOfCards) {
						var myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(card.note.split("\n"), card.others);
						if (length < myEvents.result.length) {
							length = myEvents.result.length;
						}
						arrayOfValues.push(myEvents.result);
					}
					for (let j = 0; j < length; j++) {
						var aRow = wdw_mergeCards.createRow(aListRows, i + 'Row' + j);
						wdw_mergeCards.createLabel(aRow, i + 'Label' + j, i + 'Label');
						for (let k = 0; k < listOfCards.length; k++) {
							if (arrayOfValues[k][j]) {
								processedValues.push(arrayOfValues[k][j].join(","));
								var length1 = processedValues.length;
								processedValues = cardbookRepository.arrayUnique(processedValues);
								var length2 = processedValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, i + '_' + j + '_' + k + '_Checkbox0', selected);
								var aHbox = wdw_mergeCards.createHbox(aRow);
								var aPrefImage = document.createXULElement('image');
								aHbox.appendChild(aPrefImage);
								aPrefImage.setAttribute('id', i + '_' + j + '_' + k + '_PrefImage');
								if (arrayOfValues[k][j][2] && cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(arrayOfValues[k][j][2].split(";"))) {
									aPrefImage.setAttribute('class', 'cardbookPrefStarClass');
									aPrefImage.setAttribute('haspref', 'true');
								} else {
									aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
									aPrefImage.removeAttribute('haspref');
								}
								wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', arrayOfValues[k][j][0], selected, true);
								wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox1', arrayOfValues[k][j][1], selected, true);
							} else {
								wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createHbox(aRow);
							}
						}
					}
				}
			} else {
				for (let i of [ 'email' ]) {
					var length = 0
					var arrayOfValues = [];
					var processedValues = [];
					for (let card of listOfCards) {
						var myMails = cardbookRepository.cardbookUtils.getMembersFromCard(card).mails;
						if (length < myMails.length) {
							length = myMails.length;
						}
						arrayOfValues.push(myMails);
					}
					for (let j = 0; j < length; j++) {
						var aRow = wdw_mergeCards.createRow(aListRows, i + 'Row' + j);
						wdw_mergeCards.createLabel(aRow, i + 'Label' + j, i + 'Label');
						for (let k = 0; k < listOfCards.length; k++) {
							if (arrayOfValues[k][j]) {
								processedValues.push(arrayOfValues[k][j]);
								var length1 = processedValues.length;
								processedValues = cardbookRepository.arrayUnique(processedValues);
								var length2 = processedValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, i + '_' + j + '_' + k + '_Checkbox0', selected);
								var aHbox = wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', arrayOfValues[k][j], selected, true);
							} else {
								wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createHbox(aRow);
							}
						}
					}
				}
				for (let i of [ 'contact' ]) {
					var length = 0
					var arrayOfValues = [];
					var processedValues = [];
					for (let card of listOfCards) {
						var myContacts = cardbookRepository.cardbookUtils.getMembersFromCard(card).uids;
						if (length < myContacts.length) {
							length = myContacts.length;
						}
						arrayOfValues.push(myContacts);
					}
					for (let j = 0; j < length; j++) {
						var aRow = wdw_mergeCards.createRow(aListRows, i + 'Row' + j);
						wdw_mergeCards.createLabel(aRow, i + 'Label' + j, i + 'Label');
						for (let k = 0; k < listOfCards.length; k++) {
							if (arrayOfValues[k][j]) {
								processedValues.push(arrayOfValues[k][j].cbid);
								var length1 = processedValues.length;
								processedValues = cardbookRepository.arrayUnique(processedValues);
								var length2 = processedValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, i + '_' + j + '_' + k + '_Checkbox0', selected);
								var aHbox = wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createTextBox(aHbox, i + '_' + j + '_' + k + '_Textbox0', arrayOfValues[k][j].fn, selected, true);
							} else {
								wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createHbox(aRow);
							}
						}
					}
				}
			}
			for (let i of cardbookRepository.allColumns.note) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, i)) {
					var aRow = wdw_mergeCards.createRow(aListRows);
					wdw_mergeCards.createLabel(aRow, i + 'Label', i + 'Label');
					var selected = true;
					for (let j = 0; j < listOfCards.length; j++) {
						if (listOfCards[j][i]) {
							wdw_mergeCards.createCheckBox1(aRow, i + 'Checkbox' + j, selected);
							var re = /[\n\u0085\u2028\u2029]|\r\n?/;
							var myNoteResultArray = listOfCards[j][i].split(re);
							wdw_mergeCards.createMultilineTextBox(aRow, i + 'Textbox' + j, listOfCards[j][i], selected, true, myNoteResultArray.length);
							selected = false;
						} else {
							wdw_mergeCards.createHbox(aRow);
							wdw_mergeCards.createHbox(aRow);
						}
					}
				}
			}
		},

		calculateResult: function (aCard) {
			listOfCards = window.arguments[0].cardsIn;
			aCard.version = wdw_mergeCards.version;
			aCard.dirPrefId = listOfCards[0].dirPrefId;
			for (let i of [ 'dirPrefId' ]) {
				for (let j = 0; j < listOfCards.length; j++) {
					if (document.getElementById(i + 'Checkbox' + j)) {
						var myCheckBox = document.getElementById(i + 'Checkbox' + j);
						if (myCheckBox.checked) {
							aCard[i] = listOfCards[j][i];
						}
					}
				}
			}
			var fields = cardbookRepository.allColumns.display.concat(cardbookRepository.allColumns.personal);
			fields = fields.concat(cardbookRepository.allColumns.org);
			fields = fields.concat(cardbookRepository.allColumns.note);
			for (let i of fields) {
				for (let j = 0; j < listOfCards.length; j++) {
					if ((wdw_mergeCards.version == "4.0" && cardbookRepository.newFields.includes(i)) || (!cardbookRepository.newFields.includes(i))){
						if (document.getElementById(i + 'Checkbox' + j)) {
							var myCheckBox = document.getElementById(i + 'Checkbox' + j);
							if (myCheckBox.checked) {
								aCard[i] = document.getElementById(i + 'Textbox' + j).value;
							}
						}
					}
				}
			}
			for (let i in cardbookRepository.customFields) {
				for (let j = 0; j < cardbookRepository.customFields[i].length; j++) {
					var prefixRow = i + cardbookRepository.customFields[i][j][2];
					for (let k = 0; k < listOfCards.length; k++) {
						if (document.getElementById(prefixRow + 'Checkbox' + k)) {
							var myCheckBox = document.getElementById(prefixRow + 'Checkbox' + k);
							if (myCheckBox.checked) {
								aCard.others.push(cardbookRepository.customFields[i][j][0] + ":" + document.getElementById(prefixRow + 'Textbox' + k).value);
							}
						}
					}
				}
			}
			if (wdw_mergeCards.mode == "CONTACT") {
				var multilineFields = cardbookRepository.multilineFields.concat(cardbookRepository.allColumns.categories);
				for (let i of multilineFields) {
					var length = 0
					for (let j = 0; j < listOfCards.length; j++) {
						if (length < listOfCards[j][i].length) {
							length = listOfCards[j][i].length;
						}
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(i + '_' + j + '_' + k + '_Checkbox0')) {
								var myCheckBox = document.getElementById(i + '_' + j + '_' + k + '_Checkbox0');
								if (myCheckBox.checked) {
									aCard[i].push(listOfCards[k][i][j]);
								}
							}
						}
					}
					aCard[i] = cardbookRepository.arrayUnique(aCard[i]);
				}
				var dateFormat = cardbookRepository.getDateFormat(aCard.dirPrefId, aCard.version);
				for (let i of [ 'event' ]) {
					var length = 0
					var arrayOfValues = [];
					for (let card of listOfCards) {
						var myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(card.note.split("\n"), card.others);
						if (length < myEvents.result.length) {
							length = myEvents.result.length;
						}
						arrayOfValues.push(myEvents.result);
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(i + '_' + j + '_' + k + '_Checkbox0')) {
								var myCheckBox = document.getElementById(i + '_' + j + '_' + k + '_Checkbox0');
								if (myCheckBox.checked) {
									var myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(aCard);
									cardbookRepository.cardbookUtils.addEventstoCard(aCard, [arrayOfValues[k][j]], myPGNextNumber, dateFormat);
								}
							}
						}
					}
				}
			} else {
				aCard.isAList = true;
				let myMembers = [];
				for (let i of [ 'email' ]) {
					var length = 0
					var arrayOfValues = [];
					for (let card of listOfCards) {
						var myMails = cardbookRepository.cardbookUtils.getMembersFromCard(card).mails;
						if (length < myMails.length) {
							length = myMails.length;
						}
						arrayOfValues.push(myMails);
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(i + '_' + j + '_' + k + '_Checkbox0')) {
								var myCheckBox = document.getElementById(i + '_' + j + '_' + k + '_Checkbox0');
								if (myCheckBox.checked) {
									myMembers.push("mailto:" + arrayOfValues[k][j]);
								}
							}
						}
					}
				}
				for (let i of [ 'contact' ]) {
					var length = 0
					var arrayOfValues = [];
					for (let card of listOfCards) {
						var myContacts = cardbookRepository.cardbookUtils.getMembersFromCard(card).uids;
						if (length < myContacts.length) {
							length = myContacts.length;
						}
						arrayOfValues.push(myContacts);
					}
					for (let j = 0; j < length; j++) {
						for (let k = 0; k < listOfCards.length; k++) {
							if (document.getElementById(i + '_' + j + '_' + k + '_Checkbox0')) {
								var myCheckBox = document.getElementById(i + '_' + j + '_' + k + '_Checkbox0');
								if (myCheckBox.checked) {
									myMembers.push("urn:uuid:" + arrayOfValues[k][j].uid);
								}
							}
						}
					}
				}
				cardbookRepository.cardbookUtils.addMemberstoCard(aCard, myMembers);
			}
			for (let i of [ 'photo' ]) {
				for (let j = 0; j < listOfCards.length; j++) {
					if (document.getElementById(i + 'Checkbox' + j)) {
						var myCheckBox = document.getElementById(i + 'Checkbox' + j);
						if (myCheckBox.checked) {
							aCard[i].localURI = wdw_mergeCards.arrayField[i + 'Textbox' + j];
							aCard[i].extension = cardbookRepository.cardbookUtils.getFileNameExtension(aCard[i].localURI);
						}
					}
				}
			}
		},

		viewResult: function () {
			var myOutCard = new cardbookCardParser();
			wdw_mergeCards.calculateResult(myOutCard);
			if (window.arguments[0].hideCreate) {
				var myViewResultArgs = {cardIn: myOutCard, cardOut: {}, editionMode: "ViewResultHideCreate", cardEditionAction: ""};
			} else {
				var myViewResultArgs = {cardIn: myOutCard, cardOut: {}, editionMode: "ViewResult", cardEditionAction: ""};
			}
			var myWindow = Services.wm.getMostRecentWindow("mail:3pane").openDialog("chrome://cardbook/content/cardEdition/wdw_cardEdition.xhtml", "", cardbookRepository.modalWindowParams, myViewResultArgs);
			if (myViewResultArgs.cardEditionAction == "CREATE" || myViewResultArgs.cardEditionAction == "CREATEANDREPLACE") {
				window.arguments[0].action = myViewResultArgs.cardEditionAction;
				window.arguments[0].cardsOut = [myViewResultArgs.cardOut];
				close();
			}
		},

		create: function () {
			window.arguments[0].action = "CREATE";
			wdw_mergeCards.save();
		},

		createAndReplace: function () {
			window.arguments[0].action = "CREATEANDREPLACE";
			wdw_mergeCards.save();
		},

		save: function () {
			var myOutCard = new cardbookCardParser();
			wdw_mergeCards.calculateResult(myOutCard);
			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myOutCard.dirPrefId);
			cardbookRepository.cardbookUtils.cachePutMediaCard(myOutCard, "photo", myDirPrefIdType);
			window.arguments[0].cardsOut = [myOutCard];
			close();
		},

		cancel: function () {
			window.arguments[0].action = "CANCEL";
			close();
		}

	};

};
