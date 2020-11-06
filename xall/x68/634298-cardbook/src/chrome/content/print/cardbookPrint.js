if ("undefined" == typeof(cardbookPrint)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

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

		addStyle: function () {
			cardbookPrint.openTag("style", 'type="text/css" id="sheet"', "");
			cardbookPrint.result = cardbookPrint.result + "\r\n";
			cardbookPrint.indentation = cardbookPrint.indentation + "   ";
			var styles = [];
			for (let category in cardbookRepository.cardbookNodeColors) {
				var categoryCleanName = cardbookRepository.cardbookUtils.formatCategoryForCss(category);
				var color = cardbookRepository.cardbookNodeColors[category];
				if (!color) {
					continue;
				}
				var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(color);
				cardbookPrint.result = cardbookPrint.result + cardbookPrint.indentation + ".print_preview_category_" + categoryCleanName + "{ color: " + oppositeColor + "; background-color: " + color + "}";
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
   			cardbookPrint.result = '<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">';
   			cardbookPrint.openTag("html", 'xmlns="http://www.w3.org/1999/xhtml"', "");
   			cardbookPrint.openTag("head", '', "");
   			cardbookPrint.openTag("title", '', aTitle);
   			cardbookPrint.closeTag("title", false);
   			cardbookPrint.openTag("meta", 'http-equiv="Content-Type" content="text/html; charset=UTF-8"', aTitle);
   			cardbookPrint.closeTag("meta", false);
   			cardbookPrint.addStyle();
   			cardbookPrint.closeTag("head", true);
   			cardbookPrint.openTag("body", '', "");
			for (var i = 0; i < aListOfCards.length; i++) {
				cardbookPrint.openTag("div", 'class="vCard"', "");
				cardbookPrint.openTag("table", 'class="table"', "");
				for (var j in cardbookRepository.allColumns) {
					if (j == "technical") {
						continue;
					} else if ((j == "note" && aColumnChoice["note"]) || (j == "display" && aColumnChoice["display"])) {
						var myField = cardbookRepository.allColumns[j][0];
						if (aListOfCards[i][myField] != "") {
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
								cardbookPrint.openTag("td", 'class="datavalue"', aListOfCards[i][myField]);
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
								cardbookPrint.openTag("td", 'class="datavalue"', aListOfCards[i][myField]);
								cardbookPrint.closeTag("td", false);
								cardbookPrint.closeTag("tr", true);
							}
						}
					} else if (j == "categories" && aColumnChoice["categories"]) {
						var myField = cardbookRepository.allColumns[j][0];
						var categories = cardbookRepository.cardbookUtils.sortArrayByString(aListOfCards[i][myField], 1).map(category => '<span class="print_preview_category print_preview_category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category) + '">' + category.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span>').join(' ');
						if (aListOfCards[i][myField] != "") {
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
					} else if (j != "arrayColumns") {
						if (aColumnChoice[j]) {
							var found = false;
							for (var k = 0; k < cardbookRepository.allColumns[j].length; k++) {
								var myField = cardbookRepository.allColumns[j][k];
								if (aListOfCards[i][myField] != "") {
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
									cardbookPrint.openTag("td", 'class="datavalue"', aListOfCards[i][myField]);
									cardbookPrint.closeTag("td", false);
									cardbookPrint.closeTag("tr", true);
								}
							}
						}
					} else {
						for (var l = 0; l < cardbookRepository.allColumns.arrayColumns.length; l++) {
							var found = false;
							var myField = cardbookRepository.allColumns.arrayColumns[l][0];
							if (aColumnChoice[myField]) {
								for (var m = 0; m < aListOfCards[i][myField].length; m++) {
									if (aListOfCards[i][myField][m][0].join(" ").trim() != "") {
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
										if (cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(aListOfCards[i][myField][m][1]) && aColumnChoice.types) {
											var myCheck = "★";
										} else {
											var myCheck = "";
										}
										cardbookPrint.openTag("td", 'class="typevalue"', myCheck);
										cardbookPrint.closeTag("td", false);
										if (aColumnChoice.types) {
											cardbookPrint.openTag("td", 'class="typevalue"', cardbookPrint.getTypes(aListOfCards[i].dirPrefId, myField, aListOfCards[i][myField][m][1], aListOfCards[i][myField][m][3], aListOfCards[i][myField][m][2], aListOfCards[i][myField][m][0][0]).join(" "));
										} else {
											cardbookPrint.openTag("td", 'class="typevalue"', "");
										}
										cardbookPrint.closeTag("td", false);
										if (myField == "adr") {
											cardbookPrint.openTag("td", 'class="datavalue"', cardbookRepository.cardbookUtils.formatAddress(aListOfCards[i][myField][m][0]));
										} else {
											cardbookPrint.openTag("td", 'class="datavalue"', aListOfCards[i][myField][m][0][0].trim());
										}
										cardbookPrint.closeTag("td", false);
										cardbookPrint.closeTag("tr", true);
									}
								}
							}
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
