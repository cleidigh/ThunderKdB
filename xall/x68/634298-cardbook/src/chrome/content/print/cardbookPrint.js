if ("undefined" == typeof(cardbookPrint)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/lists/cardbookListConversion.js", this);

	var cardbookPrint = {
		result: "",
		indentation: "",

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

		openTag: function (aTag, aParameters, aValue) {
			cardbookPrint.indentation = cardbookPrint.indentation + "   ";
			cardbookPrint.result = cardbookPrint.result + "\r\n";
			if (aParameters == "") {
				cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + "<" + aTag + ">" + aValue;
			} else {
				cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + "<" + aTag + " " + aParameters + ">" + aValue;
			}
		},

		closeTag: function (aTag, aCarriageReturn) {
			if (aCarriageReturn) {
				cardbookPrint.result = cardbookPrint.result + "\r\n" + cardbookPrint.indentation + "</" + aTag + ">";
			} else {
				cardbookPrint.result = cardbookPrint.result + "</" + aTag + ">";
			}
			cardbookPrint.indentation = cardbookPrint.indentation.replace("   ", "");
		},

		buildHTML: function (aListOfCards, aTitle, aColumnChoice) {
			let dirPrefIds = Array.from(aListOfCards, card => card.dirPrefId);
			dirPrefIds = cardbookRepository.arrayUnique(dirPrefIds);
   			cardbookPrint.result = '<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">';
   			cardbookPrint.openTag("html", 'xmlns="http://www.w3.org/1999/xhtml"', "");
   			cardbookPrint.openTag("head", '', "");
   			cardbookPrint.openTag("title", '', aTitle);
   			cardbookPrint.closeTag("title", false);
   			cardbookPrint.openTag("meta", 'http-equiv="Content-Type" content="text/html; charset=UTF-8"', aTitle);
   			cardbookPrint.closeTag("meta", false);
   			cardbookPrint.addStyle(dirPrefIds);
   			cardbookPrint.closeTag("head", true);
   			cardbookPrint.openTag("body", '', "");
			for (let card of aListOfCards) {
				cardbookPrint.openTag("div", 'class="vCard"', "");
				cardbookPrint.openTag("table", 'class="table"', "");
				let dateFormat = cardbookRepository.getDateFormat(card.dirPrefId, card.version);
				for (var j in cardbookRepository.allColumns) {
					if (j == "technical" || j == "technicalForTree" || j == "calculated") {
						continue;
					} else if (j == "display" && aColumnChoice["display"]) {
						var myField = cardbookRepository.allColumns[j][0];
						if (card[myField] != "") {
							let fieldClass = "cardTitle_" + card.dirPrefId;
							cardbookPrint.openTag("tr", '', "");
							cardbookPrint.openTag("td", 'colspan="8" class="' + fieldClass + '"', card[myField]);
							cardbookPrint.closeTag("td", false);
							cardbookPrint.closeTag("tr", true);
						}
					} else if (j == "note" && aColumnChoice["note"]) {
						var myField = cardbookRepository.allColumns[j][0];
						if (card[myField] != "") {
							if (aColumnChoice.headers) {
								cardbookPrint.openTag("tr", '', "");
								if (aColumnChoice.fieldNames) {
									cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(j + 'GroupboxLabel'));
								} else {
									cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
								}
								cardbookPrint.closeTag("td", false);
								cardbookPrint.closeTag("tr", true);
								cardbookPrint.openTag("tr", '', "");
								cardbookPrint.openTag("td", 'class="dummyvalue"', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", '', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", '', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", 'class="datavalue"', card[myField]);
								cardbookPrint.closeTag("td", false);
								cardbookPrint.closeTag("tr", true);
							} else {
								cardbookPrint.openTag("tr", '', "");
								if (aColumnChoice.fieldNames) {
									cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(j + 'GroupboxLabel'));
								} else {
									cardbookPrint.openTag("td", 'class="titlevalue"', "");
								}
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", '', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", '', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", 'class="datavalue"', card[myField]);
								cardbookPrint.closeTag("td", false);
								cardbookPrint.closeTag("tr", true);
							}
						}
					} else if (j == "categories" && aColumnChoice["categories"]) {
						var myField = cardbookRepository.allColumns[j][0];
						var categories = cardbookRepository.cardbookUtils.sortArrayByString(card[myField], 1).map(category => '<span class="print_preview_category print_preview_category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category) + '">' + category.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>').join(' ');
						if (card[myField] != "") {
							if (aColumnChoice.headers) {
								cardbookPrint.openTag("tr", '', "");
								if (aColumnChoice.fieldNames) {
									cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(j + 'Header'));
								} else {
									cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
								}
								cardbookPrint.closeTag("td", false);
								cardbookPrint.closeTag("tr", true);
								cardbookPrint.openTag("tr", '', "");
								cardbookPrint.openTag("td", 'class="dummyvalue"', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", '', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", '', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", 'class="datavalue"', categories);
								cardbookPrint.closeTag("td", false);
								cardbookPrint.closeTag("tr", true);
							} else {
								cardbookPrint.openTag("tr", '', "");
								if (aColumnChoice.fieldNames) {
									cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(j + 'Header'));
								} else {
									cardbookPrint.openTag("td", 'class="titlevalue"', "");
								}
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", '', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", '', "");
								cardbookPrint.closeTag("td", false);
								cardbookPrint.openTag("td", 'class="datavalue"', categories);
								cardbookPrint.closeTag("td", false);
								cardbookPrint.closeTag("tr", true);
							}
						}
					} else if (j == "personal") {
						if (aColumnChoice[j]) {
							var found = false;
							for (var k = 0; k < cardbookRepository.allColumns[j].length; k++) {
								var myField = cardbookRepository.allColumns[j][k];
								if (card[myField] != "") {
									if (aColumnChoice.headers) {
										if (!found) {
											cardbookPrint.openTag("tr", '', "");
											if (aColumnChoice.fieldNames) {
												cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(j + 'GroupboxLabel'));
											} else {
												cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
											}
											cardbookPrint.closeTag("td", false);
											cardbookPrint.closeTag("tr", true);
											found = true;
										}
										cardbookPrint.openTag("tr", '', "");
										cardbookPrint.openTag("td", 'class="dummyvalue"', "");
										cardbookPrint.closeTag("td", false);
										if (aColumnChoice.fieldNames) {
											cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + "Label"));
										} else {
											cardbookPrint.openTag("td", 'class="titlevalue"', "");
										}
										cardbookPrint.closeTag("td", false);
										cardbookPrint.openTag("td", '', "");
										cardbookPrint.closeTag("td", false);
									} else {
										cardbookPrint.openTag("tr", '', "");
										if (aColumnChoice.fieldNames) {
											cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + "Label"));
										} else {
											cardbookPrint.openTag("td", 'class="titlevalue"', "");
										}
										cardbookPrint.closeTag("td", false);
										cardbookPrint.openTag("td", '', "");
										cardbookPrint.closeTag("td", false);
										cardbookPrint.openTag("td", '', "");
										cardbookPrint.closeTag("td", false);
									}
									if (cardbookRepository.dateFields.includes(myField)) {
										let myFormattedDate = cardbookRepository.cardbookDates.getFormattedDateForDateString(card[myField], dateFormat, cardbookRepository.dateDisplayedFormat);
										cardbookPrint.openTag("td", 'class="datavalue"', myFormattedDate);
									} else {
										cardbookPrint.openTag("td", 'class="datavalue"', card[myField]);
									}
									cardbookPrint.closeTag("td", false);
									cardbookPrint.closeTag("tr", true);
								}
								// custom fields
								if (k == cardbookRepository.allColumns[j].length - 1 && aColumnChoice.custom) {
									for (var l= 0; l < cardbookRepository.customFields[j].length; l++) {
										let customValue = cardbookRepository.cardbookUtils.getCardValueByField(card, cardbookRepository.customFields[j][l][0], false);
										if (customValue.length) {
											if (aColumnChoice.headers) {
												cardbookPrint.openTag("tr", '', "");
												cardbookPrint.openTag("td", 'class="dummyvalue"', "");
												cardbookPrint.closeTag("td", false);
												if (aColumnChoice.fieldNames) {
													cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.customFields[j][l][1]);
												} else {
													cardbookPrint.openTag("td", 'class="titlevalue"', "");
												}
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
											} else {
												cardbookPrint.openTag("tr", '', "");
												if (aColumnChoice.fieldNames) {
													cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.customFields[j][l][1]);
												} else {
													cardbookPrint.openTag("td", 'class="titlevalue"', "");
												}
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
											}
											cardbookPrint.openTag("td", 'class="datavalue"', customValue);
											cardbookPrint.closeTag("td", false);
											cardbookPrint.closeTag("tr", true);
										}
									}
								}
							}
						}
					} else if (j == "org") {
						if (aColumnChoice[j]) {
							var found = false;
							for (var k = 0; k < cardbookRepository.allColumns[j].length; k++) {
								var myField = cardbookRepository.allColumns[j][k];
								if (card[myField] != "") {
									if (myField == 'org') {
										let orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
										if (orgStructure) {
											let myOrgStructure = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
											let myOrgValue = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(card[myField]).split(";"));
											for (var l = 0; l < myOrgValue.length; l++) {
												let label = myOrgStructure[l];
												let value = myOrgValue[l];
												if (value) {
													if (aColumnChoice.headers) {
														if (!found) {
															cardbookPrint.openTag("tr", '', "");
															if (aColumnChoice.fieldNames) {
																cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(j + 'GroupboxLabel'));
															} else {
																cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
															}
															cardbookPrint.closeTag("td", false);
															cardbookPrint.closeTag("tr", true);
															found = true;
														}
														cardbookPrint.openTag("tr", '', "");
														cardbookPrint.openTag("td", 'class="dummyvalue"', "");
														cardbookPrint.closeTag("td", false);
														if (aColumnChoice.fieldNames) {
															cardbookPrint.openTag("td", 'class="titlevalue"', label);
														} else {
															cardbookPrint.openTag("td", 'class="titlevalue"', "");
														}
														cardbookPrint.closeTag("td", false);
														cardbookPrint.openTag("td", '', "");
														cardbookPrint.closeTag("td", false);
													} else {
														cardbookPrint.openTag("tr", '', "");
														if (aColumnChoice.fieldNames) {
															cardbookPrint.openTag("td", 'class="titlevalue"', label);
														} else {
															cardbookPrint.openTag("td", 'class="titlevalue"', "");
														}
														cardbookPrint.closeTag("td", false);
														cardbookPrint.openTag("td", '', "");
														cardbookPrint.closeTag("td", false);
														cardbookPrint.openTag("td", '', "");
														cardbookPrint.closeTag("td", false);
													}
													cardbookPrint.openTag("td", 'class="datavalue"', value);
													cardbookPrint.closeTag("td", false);
													cardbookPrint.closeTag("tr", true);
												}
											}
										} else {
											if (aColumnChoice.headers) {
												if (!found) {
													cardbookPrint.openTag("tr", '', "");
													if (aColumnChoice.fieldNames) {
														cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(j + 'GroupboxLabel'));
													} else {
														cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
													}
													cardbookPrint.closeTag("td", false);
													cardbookPrint.closeTag("tr", true);
													found = true;
												}
												cardbookPrint.openTag("tr", '', "");
												cardbookPrint.openTag("td", 'class="dummyvalue"', "");
												cardbookPrint.closeTag("td", false);
												if (aColumnChoice.fieldNames) {
													cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + "Label"));
												} else {
													cardbookPrint.openTag("td", 'class="titlevalue"', "");
												}
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
											} else {
												cardbookPrint.openTag("tr", '', "");
												if (aColumnChoice.fieldNames) {
													cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + "Label"));
												} else {
													cardbookPrint.openTag("td", 'class="titlevalue"', "");
												}
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
											}
											cardbookPrint.openTag("td", 'class="datavalue"', card[myField]);
											cardbookPrint.closeTag("td", false);
											cardbookPrint.closeTag("tr", true);
										}
									} else {
										if (aColumnChoice.headers) {
											if (!found) {
												cardbookPrint.openTag("tr", '', "");
												if (aColumnChoice.fieldNames) {
													cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(j + 'GroupboxLabel'));
												} else {
													cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
												}
												cardbookPrint.closeTag("td", false);
												cardbookPrint.closeTag("tr", true);
												found = true;
											}
											cardbookPrint.openTag("tr", '', "");
											cardbookPrint.openTag("td", 'class="dummyvalue"', "");
											cardbookPrint.closeTag("td", false);
											if (aColumnChoice.fieldNames) {
												cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + "Label"));
											} else {
												cardbookPrint.openTag("td", 'class="titlevalue"', "");
											}
											cardbookPrint.closeTag("td", false);
											cardbookPrint.openTag("td", '', "");
											cardbookPrint.closeTag("td", false);
										} else {
											cardbookPrint.openTag("tr", '', "");
											if (aColumnChoice.fieldNames) {
												cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + "Label"));
											} else {
												cardbookPrint.openTag("td", 'class="titlevalue"', "");
											}
											cardbookPrint.closeTag("td", false);
											cardbookPrint.openTag("td", '', "");
											cardbookPrint.closeTag("td", false);
											cardbookPrint.openTag("td", '', "");
											cardbookPrint.closeTag("td", false);
										}
										cardbookPrint.openTag("td", 'class="datavalue"', card[myField]);
										cardbookPrint.closeTag("td", false);
										cardbookPrint.closeTag("tr", true);
									}
									cardbookPrint.closeTag("td", false);
									cardbookPrint.closeTag("tr", true);
								}
								// custom fields
								if (k == cardbookRepository.allColumns[j].length - 1 && aColumnChoice.custom) {
									for (var l= 0; l < cardbookRepository.customFields[j].length; l++) {
										let customValue = cardbookRepository.cardbookUtils.getCardValueByField(card, cardbookRepository.customFields[j][l][0], false);
										if (customValue.length) {
											if (aColumnChoice.headers) {
												cardbookPrint.openTag("tr", '', "");
												cardbookPrint.openTag("td", 'class="dummyvalue"', "");
												cardbookPrint.closeTag("td", false);
												if (aColumnChoice.fieldNames) {
													cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.customFields[j][l][1]);
												} else {
													cardbookPrint.openTag("td", 'class="titlevalue"', "");
												}
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
											} else {
												cardbookPrint.openTag("tr", '', "");
												if (aColumnChoice.fieldNames) {
													cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.customFields[j][l][1]);
												} else {
													cardbookPrint.openTag("td", 'class="titlevalue"', "");
												}
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
												cardbookPrint.openTag("td", '', "");
												cardbookPrint.closeTag("td", false);
											}
											cardbookPrint.openTag("td", 'class="datavalue"', customValue);
											cardbookPrint.closeTag("td", false);
											cardbookPrint.closeTag("tr", true);
										}
									}
								}
							}
						}
					} else if (j == "arrayColumns" && !card.isAList) {
						for (var l = 0; l < cardbookRepository.allColumns.arrayColumns.length; l++) {
							var found = false;
							var myField = cardbookRepository.allColumns.arrayColumns[l][0];
							if (aColumnChoice[myField]) {
								for (var m = 0; m < card[myField].length; m++) {
									if (card[myField][m][0].join(" ").trim() != "") {
										if (aColumnChoice.headers) {
											if (!found) {
												cardbookPrint.openTag("tr", '', "");
												if (aColumnChoice.fieldNames) {
													cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + 'GroupboxLabel'));
												} else {
													cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
												}
												cardbookPrint.closeTag("td", false);
												cardbookPrint.closeTag("tr", true);
												found = true;
											}
											cardbookPrint.openTag("td", 'class="dummyvalue"', "");
											cardbookPrint.closeTag("td", false);
										} else {
											if (aColumnChoice.fieldNames) {
												cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + 'Label'));
											} else {
												cardbookPrint.openTag("td", 'class="titlevalue"', "");
											}
											cardbookPrint.closeTag("td", false);
										}
										if (cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(card[myField][m][1]) && aColumnChoice.types) {
											var myCheck = "★";
										} else {
											var myCheck = "";
										}
										cardbookPrint.openTag("td", 'class="typevalue"', myCheck);
										cardbookPrint.closeTag("td", false);
										if (aColumnChoice.types) {
											cardbookPrint.openTag("td", 'class="typevalue"', cardbookPrint.getTypes(card.dirPrefId, myField, card[myField][m][1], card[myField][m][3], card[myField][m][2], card[myField][m][0][0]).join(" "));
										} else {
											cardbookPrint.openTag("td", 'class="typevalue"', "");
										}
										cardbookPrint.closeTag("td", false);
										if (myField == "adr") {
											cardbookPrint.openTag("td", 'class="datavalue"', cardbookRepository.cardbookUtils.formatAddress(card[myField][m][0]));
										} else {
											cardbookPrint.openTag("td", 'class="datavalue"', card[myField][m][0][0].trim());
										}
										cardbookPrint.closeTag("td", false);
										cardbookPrint.closeTag("tr", true);
									}
								}
							}
						}
					}
				}
				// Events
				var myField = "event";
				if (aColumnChoice[myField] && !card.isAList) {
					let myEvents = cardbookRepository.cardbookUtils.getEventsFromCard(card.note.split("\n"), card.others);
					let found = false;
					for (let eventLine of myEvents.result) {
						if (aColumnChoice.headers) {
							if (!found) {
								cardbookPrint.openTag("tr", '', "");
								if (aColumnChoice.fieldNames) {
									cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + 'GroupboxLabel'));
								} else {
									cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
								}
								cardbookPrint.closeTag("td", false);
								cardbookPrint.closeTag("tr", true);
								found = true;
							}
							cardbookPrint.openTag("td", 'class="dummyvalue"', "");
							cardbookPrint.closeTag("td", false);
						} else {
							if (aColumnChoice.fieldNames) {
								cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage(myField + 'Label'));
							} else {
								cardbookPrint.openTag("td", 'class="titlevalue"', "");
							}
							cardbookPrint.closeTag("td", false);
						}
						if (eventLine[2] && cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(eventLine[2].split(";")) && aColumnChoice.types) {
							var myCheck = "★";
						} else {
							var myCheck = "";
						}
						cardbookPrint.openTag("td", 'class="typevalue"', myCheck);
						cardbookPrint.closeTag("td", false);
						let myFormattedDate = cardbookRepository.cardbookDates.getFormattedDateForDateString(eventLine[0], dateFormat, cardbookRepository.dateDisplayedFormat);
						cardbookPrint.openTag("td", 'class="typevalue"', myFormattedDate);
						cardbookPrint.closeTag("td", false);
						cardbookPrint.openTag("td", 'class="datavalue"', eventLine[1]);
						cardbookPrint.closeTag("td", false);
						cardbookPrint.closeTag("tr", true);
					}
				}
				// members for lists
				if (card.isAList) {
					let myConversion = new cardbookListConversion(card.fn + " <" + card.fn + ">");
					let found = false;
					for (let email of myConversion.emailResult) {
						let addresses = MailServices.headerParser.parseEncodedHeaderW(email);
						for (let address of addresses) {
							if (aColumnChoice.headers) {
								if (!found) {
									cardbookPrint.openTag("tr", '', "");
									if (aColumnChoice.fieldNames) {
										cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage('addedCardsGroupboxLabel'));
									} else {
										cardbookPrint.openTag("td", 'colspan="8" class="titlevalue"', "");
									}
									cardbookPrint.closeTag("td", false);
									cardbookPrint.closeTag("tr", true);
									found = true;
								}
								cardbookPrint.openTag("td", 'class="dummyvalue"', "");
								cardbookPrint.closeTag("td", false);
							} else {
								if (aColumnChoice.fieldNames) {
									cardbookPrint.openTag("td", 'class="titlevalue"', cardbookRepository.extension.localeData.localizeMessage('memberCustomLabel'));
								} else {
									cardbookPrint.openTag("td", 'class="titlevalue"', "");
								}
								cardbookPrint.closeTag("td", false);
							}
							cardbookPrint.openTag("td", 'class="typevalue"', "");
							cardbookPrint.closeTag("td", false);
							cardbookPrint.openTag("td", 'class="typevalue"', "");
							cardbookPrint.closeTag("td", false);
							cardbookPrint.openTag("td", 'class="datavalue"', address.email);
							cardbookPrint.closeTag("td", false);
							cardbookPrint.closeTag("tr", true);
						}
					}
				}
				cardbookPrint.closeTag("table", true);
				cardbookPrint.closeTag("div", true);
			}
			cardbookPrint.closeTag("body", true);
			cardbookPrint.closeTag("html", true);
			return cardbookPrint.result;
		}
	};
};
