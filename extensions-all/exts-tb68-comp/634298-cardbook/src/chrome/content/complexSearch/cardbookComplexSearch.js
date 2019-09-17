if ("undefined" == typeof(cardbookComplexSearch)) {
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	if ("undefined" == typeof(cardbookPreferences)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookPreferences", "chrome://cardbook/content/preferences/cardbookPreferences.js");
	}
	if ("undefined" == typeof(cardbookSynchronization)) {
		XPCOMUtils.defineLazyModuleGetter(this, "cardbookSynchronization", "chrome://cardbook/content/cardbookSynchronization.js");
	}

	var EXPORTED_SYMBOLS = ["cardbookComplexSearch"];
	var cardbookComplexSearch = {
		
		loadMatchAll: function (aDefaultValue) {
			if (aDefaultValue) {
				document.getElementById("booleanAndGroup").selectedIndex = 0;
			} else {
				document.getElementById("booleanAndGroup").selectedIndex = 1;
			}
		},

		getAllArray: function (aType) {
			var i = 0;
			var myResult = [];
			while (true) {
				if (document.getElementById(aType + '_' + i + '_hbox')) {
					var mySearchCase = document.getElementById(aType + '_' + i + '_menulistCase').value;
					var mySearchObj = document.getElementById(aType + '_' + i + '_menulistObj').value;
					var mySearchTerm = document.getElementById(aType + '_' + i + '_menulistTerm').value;
					var mySearchValue = document.getElementById(aType + '_' + i + '_valueBox').value;
					myResult.push([mySearchCase, mySearchObj, mySearchTerm, mySearchValue]);
					i++;
				} else {
					break;
				}
			}
			return myResult;
		},

		disableButtons: function (aType, aIndex) {
			if (aIndex == 0) {
				if (document.getElementById(aType + '_' + aIndex + '_valueBox').value == "") {
					if (document.getElementById(aType + '_' + aIndex + '_menulistTerm').value == "IsntEmpty" ||
							document.getElementById(aType + '_' + aIndex + '_menulistTerm').value == "IsEmpty") {
						document.getElementById(aType + '_' + aIndex + '_addButton').disabled = false;
						document.getElementById(aType + '_' + aIndex + '_removeButton').disabled = false;
					} else {
						document.getElementById(aType + '_' + aIndex + '_addButton').disabled = true;
						document.getElementById(aType + '_' + aIndex + '_removeButton').disabled = true;
					}
				} else {
					document.getElementById(aType + '_' + aIndex + '_addButton').disabled = false;
					document.getElementById(aType + '_' + aIndex + '_removeButton').disabled = false;
				}
			} else {
				document.getElementById(aType + '_0_removeButton').disabled = false;
				for (var i = 0; i < aIndex; i++) {
					document.getElementById(aType + '_' + i + '_addButton').disabled = true;
					document.getElementById(aType + '_' + i + '_downButton').disabled = false;
				}
			}
			document.getElementById(aType + '_' + aIndex + '_downButton').disabled = true;
			document.getElementById(aType + '_0_upButton').disabled = true;
		},

		showOrHideForEmpty: function (aId) {
			var myIdArray = aId.split('_');
			if (document.getElementById(aId).value == "IsEmpty" || document.getElementById(aId).value == "IsntEmpty") {
				document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_valueBox').hidden = true;
				document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_menulistCase').hidden = true;
			} else {
				document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_valueBox').hidden = false;
				document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_menulistCase').hidden = false;
			}
		},

		loadDynamicTypes: function (aType, aIndex, aArray) {
			var aOrigBox = document.getElementById(aType + 'Groupbox');
			
			if (aIndex == 0) {
				cardbookElementTools.addCaption(aType, aOrigBox);
			}
			
			var aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox);

			cardbookElementTools.addMenuCaselist(aHBox, aType, aIndex, aArray[0], {flex: "1"});
			cardbookElementTools.addMenuObjlist(aHBox, aType, aIndex, aArray[1], {flex: "1"});
			cardbookElementTools.addMenuTermlist(aHBox, aType, aIndex, aArray[2], {flex: "1"});
			cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', aArray[3], {flex: "1"}, aIndex);

			function fireUpButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookComplexSearch.getAllArray(aType);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1-1];
				myAllValuesArray[aIndex*1-1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookComplexSearch.constructDynamicRows(aType, myAllValuesArray);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'up', 'up', fireUpButton);
			
			function fireDownButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookComplexSearch.getAllArray(aType);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1+1];
				myAllValuesArray[aIndex*1+1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookComplexSearch.constructDynamicRows(aType, myAllValuesArray);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'down', 'down', fireDownButton);

			function fireRemoveButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookComplexSearch.getAllArray(aType);
				cardbookElementTools.deleteRowsType(aType);
				if (myAllValuesArray.length == 0) {
					cardbookComplexSearch.constructDynamicRows(aType, myAllValuesArray);
				} else {
					var removed = myAllValuesArray.splice(aIndex, 1);
					cardbookComplexSearch.constructDynamicRows(aType, myAllValuesArray);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'remove', 'remove', fireRemoveButton);
			
			function fireAddButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				var myTerm = document.getElementById(aType + '_' + aIndex + '_menulistTerm').value;
				if (myValue == "" && myTerm !== "IsEmpty" && myTerm !== "IsntEmpty") {
					return;
				}
				var myNextIndex = 1+ 1*aIndex;
				cardbookComplexSearch.loadDynamicTypes(aType, myNextIndex, ["","","",""]);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'add', 'add', fireAddButton);

			cardbookComplexSearch.showOrHideForEmpty(aType + '_' + aIndex + '_menulistTerm');
			cardbookComplexSearch.disableButtons(aType, aIndex);
		},

		constructDynamicRows: function (aType, aArray) {
			cardbookElementTools.deleteRowsType(aType);
			for (var i = 0; i < aArray.length; i++) {
				cardbookComplexSearch.loadDynamicTypes(aType, i, aArray[i]);
			}
			if (aArray.length == 0) {
				cardbookComplexSearch.loadDynamicTypes(aType, 0, ["","","",""]);
			}
		},

		loadCards: function (aComplexSearchDirPrefId) {
			if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId]) {
				for (j in cardbookRepository.cardbookCards) {
					let myCard = cardbookRepository.cardbookCards[j];
					if (cardbookRepository.isMyCardFound(myCard, aComplexSearchDirPrefId)) {
						cardbookRepository.addCardToDisplayAndCat(myCard, aComplexSearchDirPrefId);
					}
				}
			}
			cardbookRepository.cardbookComplexSearchReloadResponse[aComplexSearchDirPrefId]++;
		},

		parseRule: function (aData, aDirPrefId) {
			if (aData) {
				cardbookRepository.cardbookComplexSearch[aDirPrefId] = {}
				var relative = aData.match("^searchAB:([^:]*):searchAll:([^:]*)(.*)");
				if (!relative) {
					return;
				}
				cardbookRepository.cardbookComplexSearch[aDirPrefId].searchAB = relative[1];
				if (relative[2] == "true") {
					cardbookRepository.cardbookComplexSearch[aDirPrefId].matchAll = true;
				} else {
					cardbookRepository.cardbookComplexSearch[aDirPrefId].matchAll = false;
				}
				var tmpRuleArray = relative[3].split(/:case:/);
				cardbookRepository.cardbookComplexSearch[aDirPrefId].rules = [];
				for (var i = 1; i < tmpRuleArray.length; i++) {
					var relative = tmpRuleArray[i].match("([^:]*):field:([^:]*):term:([^:]*):value:([^:]*)");
					cardbookRepository.cardbookComplexSearch[aDirPrefId].rules.push([relative[1], relative[2], relative[3], relative[4]]);
				}
			}
		},

		loadComplexSearchAccountFinished: function (aData, aParams) {
			cardbookComplexSearch.parseRule(aData, aParams.aDirPrefId);
			cardbookRepository.cardbookComplexSearchResponse[aParams.aDirPrefId]++;
			if (aParams.aReload) {
				cardbookComplexSearch.loadCards(aParams.aDirPrefId);
			}
		},
		
		loadComplexSearchAccount: function (aDirPrefId, aReload, aMode) {
			cardbookSynchronization.initMultipleOperations(aDirPrefId);
			var myFile = cardbookRepository.getRuleFile(aDirPrefId);
			cardbookRepository.cardbookComplexSearchRequest[aDirPrefId]++;
			if (myFile.exists() && myFile.isFile()) {
				if (aReload) {
					cardbookRepository.cardbookComplexSearchReloadRequest[aDirPrefId]++;
				}
				var params = {};
				params["showError"] = true;
				params["aDirPrefId"] = aDirPrefId;
				params["aReload"] = aReload;
				cardbookSynchronization.getFileDataAsync(myFile.path, cardbookComplexSearch.loadComplexSearchAccountFinished, params);
			} else {
				cardbookRepository.cardbookComplexSearchResponse[aDirPrefId]++;
			}
			var myPrefName = cardbookPreferences.getName(aDirPrefId);
			cardbookSynchronization.waitForComplexSearchFinished(aDirPrefId, myPrefName, aMode);
		},
		
		getSearch: function () {
			var result = "searchAB:" + document.getElementById('addressbookMenulist').value;
			var searchAll = document.getElementById('booleanAndGroup').value == "and" ? "true" : "false";
			result = result + ":searchAll:" + searchAll;
			var found = false;
			var allRules = cardbookComplexSearch.getAllArray("searchTerms");
			for (var i = 0; i < allRules.length; i++) {
				if (allRules[i][2] == "IsEmpty") {
					found = true;
				} else if (allRules[i][2] == "IsntEmpty") {
					found = true;
				} else if (allRules[i][3] != "") {
					found = true;
				}
				if (found) {
					result = result + ":case:" + allRules[i][0] + ":field:" + allRules[i][1] + ":term:" + allRules[i][2] + ":value:" + allRules[i][3];
				}
			}
			if (found) {
				return result;
			} else {
				return "";
			}
		}

	};
};
