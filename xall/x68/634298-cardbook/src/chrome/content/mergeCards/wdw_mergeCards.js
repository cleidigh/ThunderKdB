if ("undefined" == typeof(wdw_mergeCards)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_mergeCards = {
		arrayField: {},
		version: "",
		
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
					for (var j = 0; j < window.arguments[0].cardsIn.length; j++) {
						if (j != number) {
							if (document.getElementById(field + 'Checkbox' + j)) {
								var aCheckbox = document.getElementById(field + 'Checkbox' + j);
								aCheckbox.setAttribute('checked', false);
							}
						}
					}
				}
				for (var j = 0; j < window.arguments[0].cardsIn.length; j++) {
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
					for (var j = 0; j < window.arguments[0].cardsIn.length; j++) {
						if (j != number) {
							if (document.getElementById(field + 'Checkbox' + j)) {
								var aCheckbox = document.getElementById(field + 'Checkbox' + j);
								aCheckbox.setAttribute('checked', false);
							}
						}
					}
				}
				for (var j = 0; j < window.arguments[0].cardsIn.length; j++) {
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

		createMultilineTextBox: function (aRow, aName, aValue, aSelected, aLength) {
			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('multiline', true);
			aTextbox.setAttribute('wrap', 'virtual');
			aTextbox.setAttribute('id', aName);
			aTextbox.setAttribute('value', aValue);
			aTextbox.setAttribute('flex', '1');
			aTextbox.setAttribute('mergeSelected', aSelected);
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
			aLabel.setAttribute('value', ConversionHelper.i18n.getMessage(aValue));
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
			for (var i = 0; i < aListOfCards.length; i++) {
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
				for (var j = 0; j < listOfCards.length; j++) {
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

		setVersion: function (aDirPrefId) {
			wdw_mergeCards.version = cardbookRepository.cardbookPreferences.getVCardVersion(aDirPrefId);
		},

		addRowFromArray: function (aListOfCards, aField) {
			for (var i = 0; i < aListOfCards.length; i++) {
				if (aListOfCards[i][aField].length != 0) {
					return true;
				}
			}
			return false;
		},

		addRowCustomFromArray: function (aListOfCards, aField) {
			for (var i = 0; i < aListOfCards.length; i++) {
				for (var j = 0; j < aListOfCards[i].others.length; j++) {
					var othersTempArray = aListOfCards[i].others[j].split(":");
					if (aField == othersTempArray[0]) {
						return true;
					}
				}
			}
			return false;
		},

		addRowFromPhoto: function (aListOfCards, aField) {
			for (var i = 0; i < aListOfCards.length; i++) {
				if (aListOfCards[i][aField].localURI != "") {
					return true;
				}
			}
			return false;
		},
		
		load: function () {
			wdw_mergeCards.setHideCreate();
			
			listOfCards = window.arguments[0].cardsIn;
			var aListRows = document.getElementById('fieldsVbox');
			wdw_mergeCards.createAddressbook(aListRows, listOfCards);
			listOfFields = [ 'photo' ];
			for (var i in listOfFields) {
				if (wdw_mergeCards.addRowFromPhoto(listOfCards, listOfFields[i])) {
					var aRow = wdw_mergeCards.createRow(aListRows, listOfFields[i] + 'Row');
					wdw_mergeCards.createLabel(aRow, listOfFields[i] + 'Label', listOfFields[i] + 'Label');
					var selected = true;
					for (var j = 0; j < listOfCards.length; j++) {
						if (listOfCards[j][listOfFields[i]].localURI != "") {
							wdw_mergeCards.createCheckBox1(aRow, listOfFields[i] + 'Checkbox' + j, selected);
							wdw_mergeCards.createImageBox(aRow, listOfFields[i] + 'Textbox' + j, listOfCards[j][listOfFields[i]].localURI, selected, false);
							selected = false;
						} else {
							wdw_mergeCards.createHbox(aRow);
							wdw_mergeCards.createHbox(aRow);
						}
					}
				}
			}
			listOfFields = [ 'fn', 'lastname', 'firstname', 'othername', 'prefixname', 'suffixname', 'nickname', 'bday', 'org', 'title', 'role', 'gender' ];
			for (var i in listOfFields) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, listOfFields[i])) {
					var aRow = wdw_mergeCards.createRow(aListRows, listOfFields[i] + 'Row');
					wdw_mergeCards.createLabel(aRow, listOfFields[i] + 'Label', listOfFields[i] + 'Label');
					var selected = true;
					for (var j = 0; j < listOfCards.length; j++) {
						if (listOfCards[j][listOfFields[i]]) {
							wdw_mergeCards.createCheckBox1(aRow, listOfFields[i] + 'Checkbox' + j, selected);
							wdw_mergeCards.createTextBox(aRow, listOfFields[i] + 'Textbox' + j, listOfCards[j][listOfFields[i]], selected, false);
							selected = false;
						} else {
							wdw_mergeCards.createHbox(aRow);
							wdw_mergeCards.createHbox(aRow);
						}
					}
				}
			}
			for (var i in cardbookRepository.customFields) {
				for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
					if (wdw_mergeCards.addRowCustomFromArray(listOfCards, cardbookRepository.customFields[i][j][0])) {
						var prefixRow = i + cardbookRepository.customFields[i][j][2];
						var aRow = wdw_mergeCards.createRow(aListRows, prefixRow + 'Row');
						wdw_mergeCards.createCustomLabel(aRow, prefixRow + 'Label', cardbookRepository.customFields[i][j][1]);
						var selected = true;
						for (var k = 0; k < listOfCards.length; k++) {
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
			listOfFields = [ 'categories' ];
			for (var i in listOfFields) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, listOfFields[i])) {
					var length = 0
					for (var j = 0; j < listOfCards.length; j++) {
						if (length < listOfCards[j][listOfFields[i]].length) {
							length = listOfCards[j][listOfFields[i]].length;
						}
					}
					var arrayOfValues = [];
					for (var j = 0; j < length; j++) {
						var aRow = wdw_mergeCards.createRow(aListRows, listOfFields[i] + 'Row' + j);
						wdw_mergeCards.createLabel(aRow, listOfFields[i] + 'Label' + j, listOfFields[i] + 'Label');
						for (var k = 0; k < listOfCards.length; k++) {
							if (listOfCards[k][listOfFields[i]][j]) {
								arrayOfValues.push(listOfCards[k][listOfFields[i]][j]);
								var length1 = arrayOfValues.length;
								arrayOfValues = cardbookRepository.arrayUnique(arrayOfValues);
								var length2 = arrayOfValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, listOfFields[i] + '_' + j + '_' + k + '_Checkbox0', selected);
								wdw_mergeCards.createTextBox(aRow, listOfFields[i] + '_' + j + '_' + k + '_Textbox0', listOfCards[k][listOfFields[i]][j], selected, true, listOfCards[k][listOfFields[i]][j]);
							} else {
								wdw_mergeCards.createHbox(aRow);
								wdw_mergeCards.createHbox(aRow);
							}
						}
					}
				}
			}
			listOfFields = [ 'email' , 'adr', 'tel', 'impp', 'url' ];
			for (var i in listOfFields) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, listOfFields[i])) {
					var length = 0
					for (var j = 0; j < listOfCards.length; j++) {
						if (length < listOfCards[j][listOfFields[i]].length) {
							length = listOfCards[j][listOfFields[i]].length;
						}
					}
					var arrayOfValues = [];
					for (var j = 0; j < length; j++) {
						var aRow = wdw_mergeCards.createRow(aListRows, listOfFields[i] + 'Row' + j);
						wdw_mergeCards.createLabel(aRow, listOfFields[i] + 'Label' + j, listOfFields[i] + 'Label');
						for (var k = 0; k < listOfCards.length; k++) {
							if (listOfCards[k][listOfFields[i]][j]) {
								if (listOfFields[i] == "tel") {
									arrayOfValues.push(cardbookRepository.cardbookUtils.formatTelForSearching(listOfCards[k][listOfFields[i]][j][0][0]));
								} else {
									arrayOfValues.push(listOfCards[k][listOfFields[i]][j][0].join(","));
								}
								var length1 = arrayOfValues.length;
								arrayOfValues = cardbookRepository.arrayUnique(arrayOfValues);
								var length2 = arrayOfValues.length;
								if (length1 != length2) {
									var selected = false;
								} else {
									var selected = true;
								}
								wdw_mergeCards.createCheckBox2(aRow, listOfFields[i] + '_' + j + '_' + k + '_Checkbox0', selected);
								var aHbox = wdw_mergeCards.createHbox(aRow);
								
								var aCardValue = listOfCards[k][listOfFields[i]][j][0];
								var aInputTypes = listOfCards[k][listOfFields[i]][j][1];
								var aPgType = listOfCards[k][listOfFields[i]][j][3];
								var aPgName = listOfCards[k][listOfFields[i]][j][2];
								var myInputTypes = [];
								myInputTypes = cardbookRepository.cardbookUtils.getOnlyTypesFromTypes(aInputTypes);
								var aPrefImage = document.createXULElement('image');
								aHbox.appendChild(aPrefImage);
								aPrefImage.setAttribute('id', listOfFields[i] + '_' + j + '_' + k + '_PrefImage');
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
									for (var l = 0; l < aPgType.length; l++) {
										let tmpArray = aPgType[l].split(":");
										if (tmpArray[0] == "X-ABLABEL") {
											myDisplayedTypes.push(tmpArray[1]);
											found = true;
											break;
										}
									}
									if (!found) {
										myDisplayedTypes.push(cardbookRepository.cardbookTypes.whichLabelTypeShouldBeChecked(listOfFields[i], listOfCards[k].dirPrefId, myInputTypes));
									}
								} else {
									myDisplayedTypes.push(cardbookRepository.cardbookTypes.whichLabelTypeShouldBeChecked(listOfFields[i], listOfCards[k].dirPrefId, myInputTypes));
								}
								if (listOfFields[i] == "impp") {
									var serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aInputTypes);
									var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aCardValue);
									var myValue = aCardValue.join(" ");
									if (serviceCode != "") {
										var serviceLine = [];
										serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
										if (serviceLine[0]) {
											myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
											wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
											var myRegexp = new RegExp("^" + serviceLine[2] + ":");
											myValue = myValue.replace(myRegexp, "");
											wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][listOfFields[i]][j]);
										} else {
											myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
											wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
											wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][listOfFields[i]][j]);
										}
									} else if (serviceProtocol != "") {
										var serviceLine = [];
										serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
										if (serviceLine[0]) {
											myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
											wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
											var myRegexp = new RegExp("^" + serviceLine[2] + ":");
											myValue = myValue.replace(myRegexp, "");
											wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][listOfFields[i]][j]);
										} else {
											myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
											wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
											wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][listOfFields[i]][j]);
										}
									} else {
										wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
										wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox1', myValue, selected, true, listOfCards[k][listOfFields[i]][j]);
									}
								} else {
									wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox0', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), selected, true);
									if (listOfFields[i] == "adr") {
										var re = /[\n\u0085\u2028\u2029]|\r\n?/;
										var myAdrResult = cardbookRepository.cardbookUtils.formatAddress(aCardValue);
										var myAdrResultArray = myAdrResult.split(re);
										wdw_mergeCards.createMultilineTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox1', myAdrResult, selected, myAdrResultArray.length);
									} else {
										wdw_mergeCards.createTextBox(aHbox, listOfFields[i] + '_' + j + '_' + k + '_Textbox1', cardbookRepository.cardbookUtils.cleanArray(aCardValue).join(" "), selected, true, listOfCards[k][listOfFields[i]][j]);
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
			listOfFields = [ 'note' ];
			for (var i in listOfFields) {
				if (wdw_mergeCards.addRowFromArray(listOfCards, listOfFields[i])) {
					var aRow = wdw_mergeCards.createRow(aListRows);
					wdw_mergeCards.createLabel(aRow, listOfFields[i] + 'Label', listOfFields[i] + 'Label');
					var selected = true;
					for (var j = 0; j < listOfCards.length; j++) {
						if (listOfCards[j][listOfFields[i]]) {
							wdw_mergeCards.createCheckBox1(aRow, listOfFields[i] + 'Checkbox' + j, selected);
							var re = /[\n\u0085\u2028\u2029]|\r\n?/;
							var myNoteResultArray = listOfCards[j][listOfFields[i]].split(re);
							wdw_mergeCards.createMultilineTextBox(aRow, listOfFields[i] + 'Textbox' + j, listOfCards[j][listOfFields[i]], selected, myNoteResultArray.length);
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
			listOfFields = [ 'dirPrefId' ];
			for (var i in listOfFields) {
				for (var j = 0; j < listOfCards.length; j++) {
					if (document.getElementById(listOfFields[i] + 'Checkbox' + j)) {
						var myCheckBox = document.getElementById(listOfFields[i] + 'Checkbox' + j);
						if (myCheckBox.checked) {
							aCard[listOfFields[i]] = listOfCards[j][listOfFields[i]];
						}
					}
				}
			}
			listOfFields = [ 'fn', 'lastname', 'firstname', 'othername', 'prefixname', 'suffixname', 'nickname', 'bday', 'org', 'title', 'role', 'note' ];
			for (var i in listOfFields) {
				for (var j = 0; j < listOfCards.length; j++) {
					if (document.getElementById(listOfFields[i] + 'Checkbox' + j)) {
						var myCheckBox = document.getElementById(listOfFields[i] + 'Checkbox' + j);
						if (myCheckBox.checked) {
							aCard[listOfFields[i]] = document.getElementById(listOfFields[i] + 'Textbox' + j).value;
						}
					}
				}
			}
			listOfFields = [ 'gender' ];
			if (wdw_mergeCards.version == "4.0") {
				for (var i in listOfFields) {
					for (var j = 0; j < listOfCards.length; j++) {
						if (document.getElementById(listOfFields[i] + 'Checkbox' + j)) {
							var myCheckBox = document.getElementById(listOfFields[i] + 'Checkbox' + j);
							if (myCheckBox.checked) {
								aCard[listOfFields[i]] = document.getElementById(listOfFields[i] + 'Textbox' + j).value;
							}
						}
					}
				}
			}
			for (var i in cardbookRepository.customFields) {
				for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
					var prefixRow = i + cardbookRepository.customFields[i][j][2];
					for (var k = 0; k < listOfCards.length; k++) {
						if (document.getElementById(prefixRow + 'Checkbox' + k)) {
							var myCheckBox = document.getElementById(prefixRow + 'Checkbox' + k);
							if (myCheckBox.checked) {
								aCard.others.push(cardbookRepository.customFields[i][j][0] + ":" + document.getElementById(prefixRow + 'Textbox' + k).value);
							}
						}
					}
				}
			}
			listOfFields = [ 'categories', 'email' , 'tel', 'adr', 'impp', 'url' ];
			for (var i in listOfFields) {
				var length = 0
				for (var j = 0; j < listOfCards.length; j++) {
					if (length < listOfCards[j][listOfFields[i]].length) {
						length = listOfCards[j][listOfFields[i]].length;
					}
				}
				for (var j = 0; j < length; j++) {
					for (var k = 0; k < listOfCards.length; k++) {
						if (document.getElementById(listOfFields[i] + '_' + j + '_' + k + '_Checkbox0')) {
							var myCheckBox = document.getElementById(listOfFields[i] + '_' + j + '_' + k + '_Checkbox0');
							if (myCheckBox.checked) {
								aCard[listOfFields[i]].push(listOfCards[k][listOfFields[i]][j]);
							}
						}
					}
				}
				aCard[listOfFields[i]] = cardbookRepository.arrayUnique(aCard[listOfFields[i]]);
			}
			listOfFields = [ 'photo' ];
			for (var i in listOfFields) {
				for (var j = 0; j < listOfCards.length; j++) {
					if (document.getElementById(listOfFields[i] + 'Checkbox' + j)) {
						var myCheckBox = document.getElementById(listOfFields[i] + 'Checkbox' + j);
						if (myCheckBox.checked) {
							aCard[listOfFields[i]].localURI = wdw_mergeCards.arrayField[listOfFields[i] + 'Textbox' + j];
							aCard[listOfFields[i]].extension = cardbookRepository.cardbookUtils.getFileNameExtension(aCard[listOfFields[i]].localURI);
						}
					}
				}
			}
			cardbookRepository.cardbookUtils.setCalculatedFields(aCard);
		},

		viewResult: function () {
			var myOutCard = new cardbookCardParser();
			wdw_mergeCards.calculateResult(myOutCard);
			if (window.arguments[0].hideCreate) {
				var myViewResultArgs = {cardIn: myOutCard, cardOut: {}, editionMode: "ViewResultHideCreate", cardEditionAction: ""};
			} else {
				var myViewResultArgs = {cardIn: myOutCard, cardOut: {}, editionMode: "ViewResult", cardEditionAction: ""};
			}
			var myWindow = window.openDialog("chrome://cardbook/content/cardEdition/wdw_cardEdition.xhtml", "", cardbookRepository.modalWindowParams, myViewResultArgs);
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

// translations
window.addEventListener("DOMContentLoaded", function(e) {
	cardbookLocales.updateDocument();
}, false);
