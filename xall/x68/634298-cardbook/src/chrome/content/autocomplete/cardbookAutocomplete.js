if ("undefined" == typeof(cardbookAutocomplete)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var cardbookAutocomplete = {
		
		iconRuleStrings: {},
		celltextRuleStrings: {},
		textRuleStrings: {},
		
		createCssMsgBaseRules: function (aStyleSheet, aStyle, aOSName) {
			cardbookAutocomplete.celltextRuleStrings["LINUX"] = "treechildren::-moz-tree-cell-text(" + aStyle + ") {\
				}";
			cardbookAutocomplete.celltextRuleStrings["WIN"] = "treechildren::-moz-tree-cell-text(" + aStyle + ") {\
				}";
			cardbookAutocomplete.celltextRuleStrings["OSX"] = "treechildren::-moz-tree-cell-text(" + aStyle + ") {\
				margin-top: 2px;\
				margin-bottom: 2px;\
				margin-inline-start: 15px;\
				margin-inline-end: -3px;\
				border: none;\
				}";
			var ruleIndex = aStyleSheet.insertRule(cardbookAutocomplete.celltextRuleStrings[aOSName], aStyleSheet.cssRules.length);
		},

		createCssMsgAccountRules: function (aStyleSheet, aStyle, aColor, aOSName, aTreeCellProperty, aColorProperty) {
			cardbookAutocomplete.textRuleStrings["LINUX"] = "treechildren::" + aTreeCellProperty + "(" + aStyle + ") {\
				" + aColorProperty + ": " + aColor + ";\
				}";
			cardbookAutocomplete.textRuleStrings["WIN"] = "treechildren::" + aTreeCellProperty + "(" + aStyle + ") {\
				" + aColorProperty + ": " + aColor + ";\
				}";
			cardbookAutocomplete.textRuleStrings["OSX"] = "treechildren::" + aTreeCellProperty + "(" + aStyle + ") {\
				" + aColorProperty + ": " + aColor + ";\
				}";
			var ruleIndex = aStyleSheet.insertRule(cardbookAutocomplete.textRuleStrings[aOSName], aStyleSheet.cssRules.length);
		},

		createCssMsgAccountRules60: function (aStyleSheet, aStyle, aColor, aOSName, aColorProperty) {
			cardbookAutocomplete.textRuleStrings["LINUX"] = ".autocomplete-richlistitem[type=\"" + aStyle + "\"]{\
				" + aColorProperty + ": " + aColor + ";\
				}";
			cardbookAutocomplete.textRuleStrings["WIN"] = ".autocomplete-richlistitem[type=\"" + aStyle + "\"]{\
				" + aColorProperty + ": " + aColor + ";\
				}";
			cardbookAutocomplete.textRuleStrings["OSX"] = ".autocomplete-richlistitem[type=\"" + aStyle + "\"]{\
				" + aColorProperty + ": " + aColor + ";\
				}";
			var ruleIndex = aStyleSheet.insertRule(cardbookAutocomplete.textRuleStrings[aOSName], aStyleSheet.cssRules.length);
		},

		createCssMsgAccountSelectedRules60: function (aStyleSheet, aStyle, aColor, aOSName, aColorProperty) {
			cardbookAutocomplete.textRuleStrings["LINUX"] = ".autocomplete-richlistitem[type=\"" + aStyle + "\"][selected=\"true\"]{\
				" + aColorProperty + ": " + aColor + ";\
				}";
			cardbookAutocomplete.textRuleStrings["WIN"] = ".autocomplete-richlistitem[type=\"" + aStyle + "\"][selected=\"true\"]{\
				" + aColorProperty + ": " + aColor + ";\
				}";
			cardbookAutocomplete.textRuleStrings["OSX"] = ".autocomplete-richlistitem[type=\"" + aStyle + "\"][selected=\"true\"]{\
				" + aColorProperty + ": " + aColor + ";\
				}";
			var ruleIndex = aStyleSheet.insertRule(cardbookAutocomplete.textRuleStrings[aOSName], aStyleSheet.cssRules.length);
		},

		loadCssRules: function () {
			try {
				if (navigator.appVersion.includes("Win")) {
					var OSName="WIN";
				} else if (navigator.appVersion.includes("Mac")) {
					var OSName="OSX";
				} else {
					var OSName="LINUX";
				}
				var autocompleteWithColor = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.autocompleteWithColor");
				var myStyleSheet = "chrome://cardbook/content/skin/cardbookAutocomplete.css";
				var myStyleSheetRuleName = "cardbookAutocomplete";
				for (let styleSheet of InspectorUtils.getAllStyleSheets(window.document, false)) {
					for (let rule of styleSheet.cssRules) {
						// difficult to find as the sheet as no href 
						if (rule.cssText.includes(myStyleSheetRuleName)) {
							cardbookRepository.deleteCssAllRules(styleSheet);
							cardbookRepository.createMarkerRule(styleSheet, myStyleSheetRuleName);
							for (let account of cardbookRepository.cardbookAccounts) {
								if (account[1] && account[5] && account[6] != "SEARCH") {
									var dirPrefId = account[4];
									var myColor = cardbookRepository.cardbookPreferences.getColor(dirPrefId)
									var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(myColor);
									var myStyle = cardbookRepository.getABIconType(account[6]) + "_color_" + dirPrefId + "-abook";
									if (cardbookRepository.useColor == "text" && autocompleteWithColor) {
										cardbookAutocomplete.createCssMsgAccountRules60(styleSheet, myStyle, myColor, OSName, "color");
										cardbookAutocomplete.createCssMsgAccountRules60(styleSheet, myStyle, oppositeColor, OSName, "background-color");
										cardbookAutocomplete.createCssMsgAccountSelectedRules60(styleSheet, myStyle, "HighlightText", OSName, "color");
										cardbookAutocomplete.createCssMsgAccountSelectedRules60(styleSheet, myStyle, "Highlight", OSName, "background-color");
									} else if (cardbookRepository.useColor == "background" && autocompleteWithColor) {
										cardbookAutocomplete.createCssMsgAccountRules60(styleSheet, myStyle, myColor, OSName, "background-color");
										cardbookAutocomplete.createCssMsgAccountRules60(styleSheet, myStyle, oppositeColor, OSName, "color");
										cardbookAutocomplete.createCssMsgAccountSelectedRules60(styleSheet, myStyle, "Highlight", OSName, "background-color");
										cardbookAutocomplete.createCssMsgAccountSelectedRules60(styleSheet, myStyle, "HighlightText", OSName, "color");
									}
								}
							}
							for (let category in cardbookRepository.cardbookNodeColors) {
								var color = cardbookRepository.cardbookNodeColors[category];
								var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(color);
								for (type of cardbookRepository.getABIconType("ALL")) {
									var myStyle =  type + "_color_category_" + cardbookRepository.cardbookUtils.formatCategoryForCss(category) + "-abook";
									if (cardbookRepository.useColor == "text" && autocompleteWithColor) {
										cardbookAutocomplete.createCssMsgAccountRules60(styleSheet, myStyle, color, OSName, "color");
										cardbookAutocomplete.createCssMsgAccountRules60(styleSheet, myStyle, oppositeColor, OSName, "background-color");
										cardbookAutocomplete.createCssMsgAccountSelectedRules60(styleSheet, myStyle, "HighlightText", OSName, "color");
										cardbookAutocomplete.createCssMsgAccountSelectedRules60(styleSheet, myStyle, "Highlight", OSName, "background-color");
									} else if (cardbookRepository.useColor == "background" && autocompleteWithColor) {
										cardbookAutocomplete.createCssMsgAccountRules60(styleSheet, myStyle, color, OSName, "background-color");
										cardbookAutocomplete.createCssMsgAccountRules60(styleSheet, myStyle, oppositeColor, OSName, "color");
										cardbookAutocomplete.createCssMsgAccountSelectedRules60(styleSheet, myStyle, "Highlight", OSName, "background-color");
										cardbookAutocomplete.createCssMsgAccountSelectedRules60(styleSheet, myStyle, "HighlightText", OSName, "color");
									}
								}
							}
							cardbookRepository.reloadCss(myStyleSheet);
							return;
						}
					}
				}
			}
			catch (e) {}
		},

		setCompletion: function(aWindow, aIsLightning) {
			try {
				var nodes = aWindow.querySelectorAll("input");
				for (let node of nodes) {
					if (node.getAttribute('autocompletesearch')) {
						if (aIsLightning) {
							node.addEventListener("change", function() {
									cardbookAutocomplete.setLightningCompletion();
								}, false);
						}
						let attrArray = node.getAttribute('autocompletesearch').split(" ");
						if (cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.autocompletion")) {
							let index1 = attrArray.indexOf('addrbook');
							if (index1 > -1) {
								attrArray.splice(index1, 1);
							}
							let index2 = attrArray.indexOf('ldap');
							if (index2 > -1) {
								attrArray.splice(index2, 1);
							}
							if (attrArray.indexOf('addrbook-cardbook') == -1) {
								attrArray.push('addrbook-cardbook');
							}
							let resultArray = cardbookRepository.cardbookUtils.cleanArray(attrArray);
							node.setAttribute('autocompletesearch', resultArray.join(' '));
						} else {
							let index1 = attrArray.indexOf('addrbook-cardbook');
							if (index1 > -1) {
								attrArray.splice(index1, 1);
							}
							if (attrArray.indexOf('addrbook') == -1) {
								attrArray.push('addrbook');
							}
							if (attrArray.indexOf('ldap') == -1) {
								attrArray.push('ldap');
							}
							let resultArray = cardbookRepository.cardbookUtils.cleanArray(attrArray);
							node.setAttribute('autocompletesearch', resultArray.join(' '));
						}
					}
				}
			} catch(e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookAutocomplete.setCompletion error : " + e, "Error");
			};
		},

		setLightningCompletion: function() {
			cardbookAutocomplete.setCompletion(document.getElementById("calendar-event-dialog-attendees-v2"), true);
		},

		setMsgCompletion: function() {
			cardbookAutocomplete.setCompletion(document.getElementById("msgcomposeWindow"), false);
		}

	};
};
