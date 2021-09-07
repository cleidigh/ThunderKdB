// var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

// var EXPORTED_SYMBOLS = ["cardbookComplexSearch"];
var cardbookComplexSearch = {
	
	loadMatchAll: function (aValue) {
		if (aValue == true) {
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
				myResult.push({case: mySearchCase, field: mySearchObj, term: mySearchTerm, value: mySearchValue});
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
		
		var aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox, {class: "input-container"});

		cardbookElementTools.addMenuCaselist(aHBox, aType, aIndex, aArray.case, {flex: "1"});
		cardbookElementTools.addMenuObjlist(aHBox, aType, aIndex, aArray.field, {flex: "1"});
		cardbookElementTools.addMenuTermlist(aHBox, aType, aIndex, aArray.term, {flex: "1"});
		cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', aArray.value, {}, aIndex);

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
			cardbookComplexSearch.loadDynamicTypes(aType, myNextIndex, {case: "", field: "", term: "", value: ""});
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
			cardbookComplexSearch.loadDynamicTypes(aType, 0, {case: "", field: "", term: "", value: ""});
		}
	},

	getSearch: function () {
		let result = {};
		result.searchAB = document.getElementById('addressbookMenulist').value;
		result.matchAll = document.getElementById('booleanAndGroup').selectedIndex == 0 ? true : false;

		result.rules = [];
		let found = false;
		let allRules = cardbookComplexSearch.getAllArray("searchTerms");
		for (let rule of allRules) {
			if (rule.term == "IsEmpty" || rule.term == "IsntEmpty" || rule.value) {
				result.rules.push({ case: rule.case, field: rule.field, term: rule.term, value: rule.value });
			}
		}
		return result;
	}

};
