var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	
var cardbookeditlists = {};
var blankColumn = "";
var nIntervId = "";

function getTemplate (aFieldList) {
	var myFieldArray = aFieldList.split('|');
	var result = [];
	for (var i = 0; i < myFieldArray.length; i++) {
		result.push([myFieldArray[i], getTranslatedField(myFieldArray[i])]);
	}
	return result;
};

function translateFields (aFieldList) {
	var myFieldArray = aFieldList.split('|');
	var result = [];
	for (var i = 0; i < myFieldArray.length; i++) {
		result.push(getTranslatedField(myFieldArray[i]));
	}
	return cardbookRepository.cardbookUtils.cleanArray(result).join('|');
};

function getTranslatedField (aField, aLocale) {
	for (var i in cardbookRepository.allColumns) {
		for (var j = 0; j < cardbookRepository.allColumns[i].length; j++) {
			if (i != "arrayColumns" && i != "categories") {
				if (cardbookRepository.allColumns[i][j] == aField) {
					return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label");
				}
			} else if (i == "categories") {
				if (cardbookRepository.allColumns[i][j] + ".0.array" == aField) {
					return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns[i][j] + "Label");
				}
			}
		}
	}
	for (var i in cardbookRepository.customFields) {
		for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
			if (cardbookRepository.customFields[i][j][0] == aField) {
				return cardbookRepository.customFields[i][j][1];
			}
		}
	}
	for (var i = 0; i < cardbookRepository.allColumns.arrayColumns.length; i++) {
		for (var k = 0; k < cardbookRepository.allColumns.arrayColumns[i][1].length; k++) {
			if (cardbookRepository.allColumns.arrayColumns[i][0] + "." + k + ".all" == aField) {
				return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label");
			} else if (cardbookRepository.allColumns.arrayColumns[i][0] + "." + k + ".notype" == aField) {
				return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label") + " (" + cardbookRepository.extension.localeData.localizeMessage("importNoTypeLabel") + ")";
			}
		}
	}
	for (var i = 0; i < cardbookRepository.allColumns.arrayColumns.length; i++) {
		var myPrefTypes = cardbookRepository.cardbookTypes.getTypesFromDirPrefId(cardbookRepository.allColumns.arrayColumns[i][0]);
		cardbookRepository.cardbookUtils.sortMultipleArrayByString(myPrefTypes,0,1)
		for (var j = 0; j < myPrefTypes.length; j++) {
			for (var k = 0; k < cardbookRepository.allColumns.arrayColumns[i][1].length; k++) {
				if (cardbookRepository.allColumns.arrayColumns[i][0] + "." + k + "." + myPrefTypes[j][1] == aField) {
					return cardbookRepository.extension.localeData.localizeMessage(cardbookRepository.allColumns.arrayColumns[i][1][k] + "Label") + " (" + myPrefTypes[j][0] + ")";
				}
			}
		}
	}
	if ("blank" == aField) {
		return cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "blankColumn");
	}
	return "";
};

function getSelectedLines (aTreeName) {
	var myTree = document.getElementById(aTreeName + 'Tree');
	var listOfSelected = {};
	var numRanges = myTree.view.selection.getRangeCount();
	var start = new Object();
	var end = new Object();
	var count = 0;
	for (var i = 0; i < numRanges; i++) {
		myTree.view.selection.getRangeAt(i,start,end);
		for (var j = start.value; j <= end.value; j++){
			listOfSelected[j] = true;
			count++;
		}
	}
	return {lines: listOfSelected, total: count};
};

function upColumns () {
	var myTreeName = "addedColumns";
	var myTree = document.getElementById(myTreeName + 'Tree');
	var listOfSelected = {};
	listOfSelected = getSelectedLines(myTreeName);
	var first = true;
	var found = false;
	for (var i = 0; i < cardbookeditlists[myTreeName].length; i++) {
		if (listOfSelected.lines[i]) {
			if (!first) {
				var temp = cardbookeditlists[myTreeName][i-1];
				cardbookeditlists[myTreeName][i-1] = cardbookeditlists[myTreeName][i];
				cardbookeditlists[myTreeName][i] = temp;
				found = true;
			}
		} else {
			first = false;
		}
	}
	displayListTrees(myTreeName);
	for (var i = 0; i < cardbookeditlists[myTreeName].length; i++) {
		if (!found && listOfSelected.lines[i]) {
			myTree.view.selection.rangedSelect(i,i,true);
		} else {
			if (listOfSelected.lines[i] && i == 0) {
				myTree.view.selection.rangedSelect(i,i,true);
			} else if (listOfSelected.lines[i]) {
				myTree.view.selection.rangedSelect(i-1,i-1,true);
			}
		}
	}
};

function downColumns () {
	var myTreeName = "addedColumns";
	var myTree = document.getElementById(myTreeName + 'Tree');
	var listOfSelected = {};
	listOfSelected = getSelectedLines(myTreeName);
	var first = true;
	var found = false;
	for (var i = cardbookeditlists[myTreeName].length-1; i >= 0; i--) {
		if (listOfSelected.lines[i]) {
			if (!first) {
				var temp = cardbookeditlists[myTreeName][i+1];
				cardbookeditlists[myTreeName][i+1] = cardbookeditlists[myTreeName][i];
				cardbookeditlists[myTreeName][i] = temp;
				found = true;
			}
		} else {
			first = false;
		}
	}
	displayListTrees(myTreeName);
	for (var i = 0; i < cardbookeditlists[myTreeName].length; i++) {
		if (!found && listOfSelected.lines[i]) {
			myTree.view.selection.rangedSelect(i,i,true);
		} else {
			if (listOfSelected.lines[i] && i == cardbookeditlists[myTreeName].length-1) {
				myTree.view.selection.rangedSelect(i,i,true);
			} else if (listOfSelected.lines[i]) {
				myTree.view.selection.rangedSelect(i+1,i+1,true);
			}
		}
	}
};

function displayListTrees (aTreeName) {
	var columnsTreeView = {
		get rowCount() { return cardbookeditlists[aTreeName].length; },
		isContainer: function(idx) { return false },
		canDrop: function(idx) { return true },
		cycleHeader: function(idx) { return false },
		isEditable: function(idx, column) { return false },
		getCellText: function(idx, column) {
			if (column.id == aTreeName + "Id") {
				if (cardbookeditlists[aTreeName][idx]) return cardbookeditlists[aTreeName][idx][0];
			}
			else if (column.id == aTreeName + "Name") {
				if (cardbookeditlists[aTreeName][idx]) return cardbookeditlists[aTreeName][idx][1];
			}
		}
	}
	document.getElementById(aTreeName + 'Tree').view = columnsTreeView;
};

function getSelectedColumnsForList (aTree) {
	var myTreeName = aTree.id.replace("Tree", "");
	var listOfUid = [];
	var numRanges = aTree.view.selection.getRangeCount();
	var start = new Object();
	var end = new Object();
	for (var i = 0; i < numRanges; i++) {
		aTree.view.selection.getRangeAt(i,start,end);
		for (var j = start.value; j <= end.value; j++){
			listOfUid.push([aTree.view.getCellText(j, aTree.columns.getNamedColumn(myTreeName + 'Id')), aTree.view.getCellText(j, aTree.columns.getNamedColumn(myTreeName + 'Name')), j]);
		}
	}
	return listOfUid;
};

function modifyLists (aMenuOrTree) {
	switch (aMenuOrTree.id) {
		case "availableColumnsTreeChildren":
			var myAction = "appendlistavailableColumnsTree";
			break;
		case "addedColumnsTreeChildren":
			var myAction = "deletelistaddedColumnsTree";
			break;
		default:
			var myAction = aMenuOrTree.id.replace("Button", "");
			break;
	}
	var myAvailableColumnsTree = document.getElementById('availableColumnsTree');
	var myAddedColumnsTree = document.getElementById('addedColumnsTree');
	var myAvailableColumns = getSelectedColumnsForList(myAvailableColumnsTree);
	var myAddedColumns = getSelectedColumnsForList(myAddedColumnsTree);
	switch (myAction) {
		case "appendlistavailableColumnsTree":
			for (var i = 0; i < myAvailableColumns.length; i++) {
				cardbookeditlists.addedColumns.push([myAvailableColumns[i][0], myAvailableColumns[i][1]]);
			}
			break;
		case "deletelistaddedColumnsTree":
			for (var i = myAddedColumns.length-1; i >= 0; i--) {
				cardbookeditlists.addedColumns.splice(myAddedColumns[i][2], 1);
			}
			break;
		default:
			break;
	}
	displayListTrees("addedColumns");
};

function validateImportColumns () {
	if (cardbookeditlists.foundColumns.length != cardbookeditlists.addedColumns.length) {
		var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
		var confirmMsg = cardbookRepository.extension.localeData.localizeMessage("missingColumnsConfirmMessage");
		if (!Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
			return false;
		}
		var missing = cardbookeditlists.foundColumns.length - cardbookeditlists.addedColumns.length;
		for (var i = 0; i < missing; i++) {
			cardbookeditlists.addedColumns.push(["blank", blankColumn]);
		}
		var more = cardbookeditlists.addedColumns.length - cardbookeditlists.foundColumns.length;
		for (var i = 0; i < more; i++) {
			cardbookeditlists.addedColumns.slice(cardbookeditlists.addedColumns.length, 1);
		}
	}
	return true;
};

function loadFoundColumns () {
	cardbookeditlists.foundColumns = [];
	var mySep = document.getElementById('fieldDelimiterTextBox').value;
	if (mySep == "") {
		mySep = ";";
	}
	var myTempArray = window.arguments[0].headers.split(mySep);
	for (var i = 0; i < myTempArray.length; i++) {
		cardbookeditlists.foundColumns.push([i, myTempArray[i]]);
	}
	displayListTrees("foundColumns");
};

function startDrag (aEvent, aTreeChildren) {
	try {
		var listOfUid = [];
		if (aTreeChildren.id == "availableColumnsTreeChildren") {
			var myTree = document.getElementById('availableColumnsTree');
		} else if (aTreeChildren.id == "addedColumnsTreeChildren") {
			var myTree = document.getElementById('addedColumnsTree');
		} else {
			return;
		}
		var numRanges = myTree.view.selection.getRangeCount();
		var start = new Object();
		var end = new Object();
		for (var i = 0; i < numRanges; i++) {
			myTree.view.selection.getRangeAt(i,start,end);
			for (var j = start.value; j <= end.value; j++){
				var myId = myTree.view.getCellText(j, myTree.columns.getNamedColumn(myTree.id.replace('Tree', '') + 'Id'));
				listOfUid.push(j+"::"+myId);
			}
		}
		aEvent.dataTransfer.setData("text/plain", listOfUid.join("@@@@@"));
	}
	catch (e) {
		cardbookRepository.cardbookLog.updateStatusProgressInformation("startDrag error : " + e, "Error");
	}
};

function dragCards (aEvent, aTreeName) {
	var myData = aEvent.dataTransfer.getData("text/plain");
	var myColumns = myData.split("@@@@@");

	if (aTreeName == "availableColumnsTree") {
		for (var i = myColumns.length-1; i >= 0; i--) {
			var myTempArray = myColumns[i].split("::");
			cardbookeditlists.addedColumns.splice(myTempArray[0], 1);
		}
	} else if (aTreeName == "addedColumnsTree") {
		var myTree = document.getElementById('addedColumnsTree');
		var myTarget = myTree.getRowAt(aEvent.clientX, aEvent.clientY);
			
		for (var i = 0; i < myColumns.length; i++) {
			var myTempArray = myColumns[i].split("::");
			var myValue = myTempArray[1];
			if (myTarget == -1) {
				cardbookeditlists.addedColumns.push([myValue, getTranslatedField(myValue)]);
			} else {
				cardbookeditlists.addedColumns.splice(myTarget, 0, [myValue, getTranslatedField(myValue)]);
				myTarget++;
			}
		}
	}
	displayListTrees("addedColumns");
};

function windowControlShowing () {
	var myTreeName = "addedColumns";
	var listOfSelected = {};
	listOfSelected = getSelectedLines("addedColumns");
	if (listOfSelected.total > 0) {
		document.getElementById('upAddedColumnsTreeButton').disabled = false;
		document.getElementById('downAddedColumnsTreeButton').disabled = false;
	} else {
		document.getElementById('upAddedColumnsTreeButton').disabled = true;
		document.getElementById('downAddedColumnsTreeButton').disabled = true;
	}
};

function setSyncControl () {
	nIntervId = setInterval(windowControlShowing, 500);
};

function clearSyncControl () {
	clearInterval(nIntervId);
};

function guess () {
	var oneFound = false;
	var result = [];
	// search with current locale
	for (var i = 0; i < cardbookeditlists.foundColumns.length; i++) {
		var myFoundColumn = cardbookeditlists.foundColumns[i][1].replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
		var found = false;
		for (var j = 0; j < cardbookeditlists.availableColumns.length; j++) {
			if (cardbookeditlists.availableColumns[j][1].toLowerCase() == myFoundColumn.toLowerCase()) {
				result.push([cardbookeditlists.availableColumns[j][0], cardbookeditlists.availableColumns[j][1]]);
				found = true;
				oneFound = true;
				break;
			}
		}
		if (!found) {
			result.push(["blank", blankColumn]);
		}
	}
	if (!oneFound) {
		result = [];
		// search with en-US locale
		for (var i = 0; i < cardbookeditlists.foundColumns.length; i++) {
			var myFoundColumn = cardbookeditlists.foundColumns[i][1].replace(/^\"|\"$/g, "").replace(/^\'|\'$/g, "");
			var found = false;
			for (var j = 0; j < cardbookeditlists.availableColumns.length; j++) {
				var myTranslatedColumn = getTranslatedField(cardbookeditlists.availableColumns[j][0], "locale-US");
				if (myTranslatedColumn.toLowerCase() == myFoundColumn.toLowerCase()) {
					result.push([cardbookeditlists.availableColumns[j][0], cardbookeditlists.availableColumns[j][1]]);
					found = true;
					oneFound = true;
					break;
				}
			}
			if (!found) {
				result.push(["blank", blankColumn]);
			}
		}
	}
	if (oneFound) {
		cardbookeditlists.addedColumns = result;
		displayListTrees("addedColumns");
	}
};

function onLoadDialog () {
	i18n.updateDocument({ extension: cardbookRepository.extension });
	setSyncControl();

	document.title = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "MappingTitle");
	document.querySelector("dialog").getButton("extra1").label = cardbookRepository.extension.localeData.localizeMessage("saveTemplateLabel");
	document.querySelector("dialog").getButton("extra2").label = cardbookRepository.extension.localeData.localizeMessage("loadTemplateLabel");
	document.getElementById('availableColumnsGroupboxLabel').value = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "availableColumnsGroupboxLabel");
	document.getElementById('addedColumnsGroupboxLabel').value = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "addedColumnsGroupboxLabel");
	
	cardbookeditlists.availableColumns = [];
	cardbookeditlists.addedColumns = [];
	
	document.getElementById('fieldDelimiterLabel').value = cardbookRepository.extension.localeData.localizeMessage("fieldDelimiterLabel");
	document.getElementById('includePrefLabel').value = cardbookRepository.extension.localeData.localizeMessage("includePrefLabel");
	document.getElementById('lineHeaderLabel').value = cardbookRepository.extension.localeData.localizeMessage("lineHeaderLabel");

	if (window.arguments[0].mode == "choice") {
		document.getElementById('foundColumnsVBox').hidden = true;
		document.getElementById('fieldDelimiterLabel').hidden = true;
		document.getElementById('fieldDelimiterTextBox').hidden = true;
		document.getElementById('includePrefLabel').hidden = true;
		document.getElementById('includePrefCheckBox').hidden = true;
		document.getElementById('lineHeaderLabel').hidden = true;
		document.getElementById('lineHeaderCheckBox').hidden = true;
		document.querySelector("dialog").getButton("extra1").hidden = true;
		document.querySelector("dialog").getButton("extra2").hidden = true;
		document.getElementById('guesslistavailableColumnsTreeButton').hidden = true;
	} else if (window.arguments[0].mode == "export") {
		document.getElementById('foundColumnsVBox').hidden = true;
		document.getElementById('lineHeaderLabel').hidden = true;
		document.getElementById('lineHeaderCheckBox').hidden = true;
		document.getElementById('fieldDelimiterTextBox').value = window.arguments[0].columnSeparator;
		document.getElementById('guesslistavailableColumnsTreeButton').hidden = true;
	} else if (window.arguments[0].mode == "import") {
		document.getElementById('foundColumnsGroupboxLabel').value = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "foundColumnsGroupboxLabel");
		document.getElementById('includePrefLabel').hidden = true;
		document.getElementById('includePrefCheckBox').hidden = true;
		document.getElementById('lineHeaderCheckBox').setAttribute('checked', true);
		document.getElementById('fieldDelimiterTextBox').value = window.arguments[0].columnSeparator;
		blankColumn = cardbookRepository.extension.localeData.localizeMessage(window.arguments[0].mode + "blankColumn");
		cardbookeditlists.availableColumns.push(["blank", blankColumn]);
	}
	
	cardbookeditlists.addedColumns = window.arguments[0].template;
	displayListTrees("addedColumns");

	cardbookeditlists.availableColumns = cardbookeditlists.availableColumns.concat(cardbookRepository.cardbookUtils.getAllAvailableColumns(window.arguments[0].mode));
	displayListTrees("availableColumns");

	if (window.arguments[0].mode == "import") {
		loadFoundColumns();
	}
};

function onAcceptDialog () {
	window.arguments[0].template = cardbookeditlists.addedColumns;
	window.arguments[0].columnSeparator = document.getElementById('fieldDelimiterTextBox').value;
	window.arguments[0].includePref = document.getElementById('includePrefCheckBox').checked;
	window.arguments[0].lineHeader = document.getElementById('lineHeaderCheckBox').checked;
	if (window.arguments[0].columnSeparator == "") {
		window.arguments[0].columnSeparator = ";";
	}
	window.arguments[0].action = "SAVE";
	if (window.arguments[0].mode == "import") {
		if (!validateImportColumns()) {
			return;
		}
	}
	clearSyncControl();
	close();
};

function getDefaultTemplateName () {
	if (window.arguments[0].filename.endsWith(".csv")) {
		var defaultTemplateName = window.arguments[0].filename.replace(/\.csv$/, ".tpl");
	} else if (window.arguments[0].filename.includes(".")) {
		var tmpArray = window.arguments[0].filename.split(".");
		tmpArray.pop();
		var defaultTemplateName = tmpArray.join(".") + ".tpl";
	} else {
		var defaultTemplateName = window.arguments[0].filename + ".tpl";
	}
	return defaultTemplateName;
};

function loadTemplate () {
	cardbookWindowUtils.callFilePicker("fileSelectionTPLTitle", "OPEN", "TPL", getDefaultTemplateName(), "", loadTemplateNext);
};

function loadTemplateNext (aFile) {
	try {
		if (aFile) {
			cardbookRepository.cardbookSynchronization.getFileDataAsync(aFile.path, loadTemplateNext2, {});
		}
	}
	catch (e) {
		cardbookRepository.cardbookLog.updateStatusProgressInformation("loadTemplateNext error : " + e, "Error");
	}
};

function loadTemplateNext2 (aContent, aParams) {
	try {
		if (aContent) {
			cardbookeditlists.addedColumns = getTemplate(aContent);
			displayListTrees("addedColumns");
		}
	}
	catch (e) {
		cardbookRepository.cardbookLog.updateStatusProgressInformation("loadTemplateNext2 error : " + e, "Error");
	}
};

function saveTemplate () {
	cardbookWindowUtils.callFilePicker("fileCreationTPLTitle", "SAVE", "TPL", getDefaultTemplateName(), "", saveTemplateNext);
};

function saveTemplateNext (aFile) {
	try {
		if (!(aFile.exists())) {
			aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
		}

		var result = [];
		for (var i = 0; i < cardbookeditlists.addedColumns.length; i++) {
			result.push(cardbookeditlists.addedColumns[i][0]);
		}

		cardbookRepository.cardbookUtils.writeContentToFile(aFile.path, result.join('|'), "UTF8");
	}
	catch (e) {
		cardbookRepository.cardbookLog.updateStatusProgressInformation("saveTemplateNext error : " + e, "Error");
	}
};

function onCancelDialog () {
	window.arguments[0].action = "CANCEL";
	clearSyncControl();
	close();
};

document.addEventListener("dialogaccept", onAcceptDialog);
document.addEventListener("dialogcancel", onCancelDialog);
document.addEventListener("dialogextra1", saveTemplate);
document.addEventListener("dialogextra2", loadTemplate);
