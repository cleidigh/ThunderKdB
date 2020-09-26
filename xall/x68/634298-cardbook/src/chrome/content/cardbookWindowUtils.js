if ("undefined" == typeof(cardbookWindowUtils)) {
	var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var cardbookWindowUtils = {
		
		getBroadcasterOnCardBook: function () {
			if (document.getElementById('cardboookModeBroadcasterTab')) {
				if (document.getElementById('cardboookModeBroadcasterTab').getAttribute('mode') == 'cardbook') {
					return true;
				}
			} else if (document.getElementById('cardboookModeBroadcasterWindow')) {
				if (document.getElementById('cardboookModeBroadcasterWindow').getAttribute('mode') == 'cardbook') {
					return true;
				}
			}
			return false;
		},

		callFilePicker: function (aTitle, aMode, aType, aDefaultFileName, aDefaultDir, aCallback, aCallbackParam) {
			try {
				var myWindowTitle = ConversionHelper.i18n.getMessage(aTitle);
				var nsIFilePicker = Components.interfaces.nsIFilePicker;
				var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
				if (aMode === "SAVE") {
					fp.init(window, myWindowTitle, nsIFilePicker.modeSave);
				} else if (aMode === "OPEN") {
					fp.init(window, myWindowTitle, nsIFilePicker.modeOpen);
				}
				if (aType === "VCF") {
					fp.appendFilter("VCF File","*.vcf");
				} else if (aType === "TPL") {
					fp.appendFilter("TPL File","*.tpl");
				} else if (aType === "EXPORTFILE") {
					//bug 545091 on linux and macosx
					fp.defaultExtension = "vcf";
					fp.appendFilter("VCF File","*.vcf");
					fp.appendFilter("CSV File","*.csv");
				} else if (aType === "IMAGES") {
					fp.appendFilters(nsIFilePicker.filterImages);
				}
				fp.appendFilters(fp.filterAll);
				if (aDefaultFileName) {
					fp.defaultString = aDefaultFileName;
				}
				if (aDefaultDir) {
					fp.displayDirectory = aDefaultDir;
				}
				fp.open(rv => {
					if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
						aCallback(fp.file, aCallbackParam);
					}
				});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.callFilePicker error : " + e, "Error");
			}
		},

		callDirPicker: function (aTitle, aCallback, aCallbackParam) {
			try {
				var myWindowTitle = ConversionHelper.i18n.getMessage(aTitle);
				var nsIFilePicker = Components.interfaces.nsIFilePicker;
				var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
				fp.init(window, myWindowTitle, nsIFilePicker.modeGetFolder);
				fp.open(rv => {
					if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
						aCallback(fp.file, aCallbackParam);
					}
				});
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.callDirPicker error : " + e, "Error");
			}
		},

		getSelectedCards: function () {
			var myTree = document.getElementById('cardsTree');
			var listOfSelectedCard = [];
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			for (var i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (var j = start.value; j <= end.value; j++){
					var myId = myTree.view.getCellText(j, myTree.columns.getNamedColumn('cbid'));
					if (cardbookRepository.cardbookCards[myId]) {
						listOfSelectedCard.push(cardbookRepository.cardbookCards[myId]);
					}
				}
			}
			return listOfSelectedCard;
		},

		getSelectedCardsCount: function () {
			var listOfUid = [];
			listOfUid = cardbookWindowUtils.getSelectedCards();
			return listOfUid.length;
		},

		setSelectedCards: function (aListOfCard, aFirstVisibleRow, aLastVisibleRow) {
			var myList = JSON.parse(JSON.stringify(aListOfCard));
			if (myList.length == 0) {
				return;
			}
			var foundIndex = 0;
			var myTree = document.getElementById('cardsTree');
			myTree.view.selection.clearSelection();
			// the list of Cards should be ordered
			var treeLength = myTree.view.rowCount;
			for (var j = 0; j < treeLength; j++) {
				if (myList.length == 0) {
					break;
				}
				if (myTree.view.getCellText(j, myTree.columns.getNamedColumn('cbid')) == myList[0].cbid) {
					myTree.view.selection.rangedSelect(j,j,true);
					myList.shift();
					if (foundIndex == 0) {
						foundIndex = j;
					}
				}
				if (j == treeLength -1) {
					break;
				}
			}
			if (foundIndex < aFirstVisibleRow || foundIndex > aLastVisibleRow) {
				myTree.scrollToRow(foundIndex);
			} else {
				myTree.scrollToRow(aFirstVisibleRow);
			}
		},

		getSelectedCardsDirPrefId: function () {
			var myTree = document.getElementById('cardsTree');
			var listOfUid = [];
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			for (var i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (var j = start.value; j <= end.value; j++){
					listOfUid.push(myTree.view.getCellText(j, myTree.columns.getNamedColumn('dirPrefId')));
				}
			}
			return cardbookRepository.arrayUnique(listOfUid);
		},

		getSelectedCardsId: function () {
			var myTree = document.getElementById('cardsTree');
			var listOfId = [];
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			for (var i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (var j = start.value; j <= end.value; j++){
					listOfId.push(myTree.view.getCellText(j, myTree.columns.getNamedColumn('cbid')));
				}
			}
			return listOfId;
		},

		getCardsFromAccountsOrCats: function () {
			try {
				var listOfSelectedCard = [];
				var myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookRepository.cardbookSearchMode === "SEARCH") {
					var myAccountPrefId = cardbookRepository.cardbookSearchValue;
				} else {
					var myAccountPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				}
				for (let card of cardbookRepository.cardbookDisplayCards[myAccountPrefId].cards) {
					listOfSelectedCard.push(card);
				}
				return listOfSelectedCard;
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.getCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		getCardsFromCards: function () {
			try {
				var listOfSelectedCard = [];
				var myTree = document.getElementById('cardsTree');
				var numRanges = myTree.view.selection.getRangeCount();
				var start = new Object();
				var end = new Object();
				for (var i = 0; i < numRanges; i++) {
					myTree.view.selection.getRangeAt(i,start,end);
					for (var j = start.value; j <= end.value; j++){
						listOfSelectedCard.push(cardbookRepository.cardbookCards[myTree.view.getCellText(j, myTree.columns.getNamedColumn('cbid'))]);
					}
				}
				return listOfSelectedCard;
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.getCardsFromCards error : " + e, "Error");
			}
		},

		openConfigurationWindow: function() {
			try {
				openTab("contentTab", {contentPage: "chrome://cardbook/content/configuration/wdw_cardbookConfiguration.xhtml",
										onLoad(aEvent, aBrowser) {
											document.getElementById('contentTabToolbox' + aBrowser.id.replace('contentTabBrowser','')).hidden = true;
										}
										}, "tab");
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.openConfigurationWindow error : " + e, "Error");
			}
		},

		openEditionWindow: function(aCard, aMode) {
			try {
				var windowsList = Services.wm.getEnumerator("CardBook:contactEditionWindow");
				var found = false;
				while (windowsList.hasMoreElements()) {
					var myWindow = windowsList.getNext();
					if (myWindow.arguments[0] && myWindow.arguments[0].cardIn && myWindow.arguments[0].cardIn.cbid == aCard.cbid) {
						myWindow.focus();
						found = true;
						break;
					}
				}
				if (!found) {
					var myArgs = {cardIn: aCard, cardOut: {}, editionMode: aMode, cardEditionAction: "", editionCallback: cardbookWindowUtils.openEditionWindowSave};
					var myWindow = window.openDialog("chrome://cardbook/content/cardEdition/wdw_cardEdition.xhtml", "", cardbookRepository.windowParams, myArgs);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.openEditionWindow error : " + e, "Error");
			}
		},

		openEditionWindowSave: function(aOrigCard, aOutCard, aMode) {
			try {
				switch (aMode) {
					// case "EditList":
					// case "EditContact":
					// case "CreateContact":
					// case "CreateList":
					// case "AddEmail":
					case "ViewList":
					case "ViewContact":
						return;
						break;
				}
				if (cardbookRepository.cardbookCards[aOutCard.dirPrefId+"::"+aOutCard.uid]) {
					var myTopic = "cardModified";
				} else {
					var myTopic = "cardCreated";
				}
				var myActionId = cardbookActions.startAction(myTopic, [aOutCard.fn]);
				cardbookRepository.saveCard(aOrigCard, aOutCard, myActionId, true);
				cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookWindowUtils.openEditionWindowSave error : " + e, "Error");
			}
		},

		openURL: function (aUrl) {
			try {
				var uri = Services.io.newURI(aUrl, null, null);
			}
			catch(e) {
				cardbookRepository.cardbookUtils.formatStringForOutput("invalidURL", [aUrl], "Error");
				return;
			}
			var localizeTarget = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.localizeTarget");
			if (localizeTarget === "in") {
				let tabmail = document.getElementById("tabmail");
				if (!tabmail) {
					// Try opening new tabs in an existing 3pane window
					let mail3PaneWindow = Services.wm.getMostRecentWindow("mail:3pane");
					if (mail3PaneWindow) {
						tabmail = mail3PaneWindow.document.getElementById("tabmail");
						mail3PaneWindow.focus();
					}
				}
				if (tabmail) {
					tabmail.openTab("contentTab", {contentPage: aUrl});
				} else {
					window.openDialog("chrome://messenger/content/", "_blank","chrome,dialog=no,all", null,
					{ tabType: "contentTab", tabParams: {contentPage: aUrl} });
				}
			} else if (localizeTarget === "out") {
				cardbookRepository.cardbookUtils.openExternalURL(aUrl);
			}
		},

		openIMPP: function (aIMPPRow) {
			var serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aIMPPRow[1]);
			var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aIMPPRow[0]);
			if (serviceCode != "") {
				var serviceLine = [];
				serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
				if (serviceLine[0]) {
					var myValue = aIMPPRow[0].join(" ");
					var myRegexp = new RegExp("^" + serviceLine[2] + ":");
					var myAddress = aIMPPRow[0][0].replace(myRegexp, "");
					cardbookRepository.cardbookUtils.openExternalURL(cardbookRepository.cardbookUtils.formatIMPPForOpenning(serviceLine[2] + ":" + myAddress));
				}
			} else if (serviceProtocol != "") {
				var serviceLine = [];
				serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
				if (serviceLine[0]) {
					var myRegexp = new RegExp("^" + serviceLine[2] + ":");
					var myAddress = aIMPPRow[0][0].replace(myRegexp, "");
					cardbookRepository.cardbookUtils.openExternalURL(cardbookRepository.cardbookUtils.formatIMPPForOpenning(serviceLine[2] + ":" + myAddress));
				}
			}
		},

		openTel: function (aValue) {
			var telProtocolLine = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.tels.0");
			var telProtocolLineArray = telProtocolLine.split(':');
			if (telProtocolLineArray[2]) {
				var telProtocol = telProtocolLineArray[2];
			} else {
				var telProtocol = "callto";
			}
			var myValue = cardbookRepository.cardbookUtils.formatTelForOpenning(aValue);
			if (telProtocol != "url") {
				var myResult = telProtocol + ":" + myValue;
				cardbookRepository.cardbookUtils.openExternalURL(myResult);
			} else {
				var myUrl = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.URLPhoneURL").replace("$1", myValue);
				var myBackground = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.URLPhoneBackground");
				if (myBackground) {
					var myUser = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.URLPhoneUser");
					var myPassword = cardbookRepository.cardbookRepository.cardbookPasswordManager.getPassword(myUser, myUrl);
					var req = CardbookHttpRequest(myUrl, myUser);
					req.withCredentials = true;					
					req.open('GET', myUrl, true, myUser, myPassword);
					req.send(null);
				} else {
					cardbookRepository.cardbookUtils.openExternalURL(myUrl);
				}
			}
		},

		panelMenupopupHiding: function (aEvent, aType, aMenupopupName) {
			cardbookWindowUtils.updateComplexMenulist(aType, aMenupopupName);
			if (aType === "type") {
				return true;
			} else {
				return aEvent.explicitOriginalTarget.localName != "menuitem";
			}
		},

		panelMenulistKeydown: function (aEvent, aType, aMenupopupName) {
			let myMenupopup = document.getElementById(aMenupopupName);
			let myTextbox = document.getElementById(aMenupopupName.replace("Menupopup", "Textbox"));
			switch (aEvent.key) {
				case "ArrowDown":
				case "ArrowUp":
					myMenupopup.openPopup(myMenupopup, "after_start", 0, 0, false, false);
					setTimeout(function() {
							myTextbox.focus();
						}, 0);
					aEvent.preventDefault();
					return;
				default:
					return;
			}
		},

		panelMenulistKeyup: function (aEvent, aType, aMenupopupName) {
			let myMenupopup = document.getElementById(aMenupopupName);
			let myMenulist = document.getElementById(aMenupopupName.replace("Menupopup", "Menulist"));
			var myLabel = myMenulist.getAttribute('label');
			if (aType == "category") {
				if (myLabel == ConversionHelper.i18n.getMessage("multipleCategories")) {
					return;
				}
			} else if (aType == "type") {
				if (myLabel == ConversionHelper.i18n.getMessage("multipleTypes")) {
					return;
				}
			}
			for (var i = 0; i < myMenupopup.childNodes.length; i++) {
				var child = myMenupopup.childNodes[i];
				if (child.getAttribute('label') == myLabel) {
					child.setAttribute("checked", "true");
				} else {
					child.removeAttribute("checked");
				}
			}
		},

		panelTextboxKeydown: function (aEvent, aType, aMenupopupName) {
			let itemValue = aEvent.target.value;
			let myMenupopup = document.getElementById(aMenupopupName);
			let myMenulist = document.getElementById(aMenupopupName.replace("Menupopup", "Menulist"));
			switch (aEvent.key) {
				case "Escape":
					if (itemValue) {
						aEvent.target.value = "";
					} else {
						myMenupopup.hidePopup();
					}
					setTimeout(function() {
							myMenulist.focus();
						}, 0);
					aEvent.preventDefault();
					return;
				case "Enter":
					itemValue = itemValue.trim();
					if (itemValue != "") {
						break;
					}
					return;
				default:
					return;
			}
			aEvent.preventDefault();

			let itemList = myMenupopup.querySelectorAll("menuitem.cardbook-item");
			let items = Array.from(itemList, item => item.getAttribute("label"));
			
			let newIndex = items.indexOf(itemValue);
			if (newIndex > -1) {
				itemList[newIndex].setAttribute("checked", true);
			} else {
				items.push(itemValue);
				cardbookRepository.cardbookUtils.sortArrayByString(items,1);
				newIndex = items.indexOf(itemValue);
				
				let item = document.createXULElement("menuitem");
				item.setAttribute("class", "menuitem-iconic cardbook-item");
				item.setAttribute("label", itemValue);
				item.setAttribute("value", itemValue);
				if (aType == "type") {
					item.setAttribute("type", "radio");
				} else {
					item.setAttribute("type", "checkbox");
				}
				item.setAttribute("checked", true);
				myMenupopup.insertBefore(item, itemList[newIndex]);
			}
			
			aEvent.target.value = "";
			// By pushing this to the end of the event loop, the other checked items in the list
			// are cleared, where only one category is allowed.
			setTimeout(function() {
					cardbookWindowUtils.updateComplexMenulist(aType, aMenupopupName);
				}, 0);
		},

		updateComplexMenulist: function (aType, aMenupopupName) {
			let myMenupopup = document.getElementById(aMenupopupName);
			let myMenulist = document.getElementById(aMenupopupName.replace("Menupopup", "Menulist"));

			let label = "";
			let itemsList = myMenupopup.querySelectorAll("menuitem.cardbook-item[checked]");
			if (aType == "fields") {
				label = ConversionHelper.i18n.getMessage("editionGroupboxLabel");
			} else if (itemsList.length > 1) {
				if (aType == "category") {
					label = ConversionHelper.i18n.getMessage("multipleCategories");
				} else if (aType == "type") {
					label = ConversionHelper.i18n.getMessage("multipleTypes");
				}
			} else if (itemsList.length == 1) {
				label = itemsList[0].getAttribute("label");
			} else {
				if (aType == "category") {
					label = ConversionHelper.i18n.getMessage("none");
				} else if (aType == "type") {
					// label = ConversionHelper.i18n.getMessage("noType");
					// better empty
					label = "";
				}
			}
			myMenulist.setAttribute("label", label);
		},

		addToCardBookMenuSubMenu: function(aMenuName, aIdentityKey, aCallback) {
			try {
				var ABInclRestrictions = {};
				var ABExclRestrictions = {};
				var catInclRestrictions = {};
				var catExclRestrictions = {};

				function _loadRestrictions(aIdentityKey) {
					var result = [];
					result = cardbookRepository.cardbookPreferences.getAllRestrictions();
					ABInclRestrictions = {};
					ABExclRestrictions = {};
					catInclRestrictions = {};
					catExclRestrictions = {};
					if (aIdentityKey == "") {
						ABInclRestrictions["length"] = 0;
						return;
					}
					for (var i = 0; i < result.length; i++) {
						var resultArray = result[i];
						if ((resultArray[0] == "true") && ((resultArray[2] == aIdentityKey) || (resultArray[2] == "allMailAccounts"))) {
							if (resultArray[1] == "include") {
								ABInclRestrictions[resultArray[3]] = 1;
								if (resultArray[4]) {
									if (!(catInclRestrictions[resultArray[3]])) {
										catInclRestrictions[resultArray[3]] = {};
									}
									catInclRestrictions[resultArray[3]][resultArray[4]] = 1;
								}
							} else {
								if (resultArray[4]) {
									if (!(catExclRestrictions[resultArray[3]])) {
										catExclRestrictions[resultArray[3]] = {};
									}
									catExclRestrictions[resultArray[3]][resultArray[4]] = 1;
								} else {
									ABExclRestrictions[resultArray[3]] = 1;
								}
							}
						}
					}
					ABInclRestrictions["length"] = cardbookRepository.cardbookUtils.sumElements(ABInclRestrictions);
				};

				_loadRestrictions(aIdentityKey);

				var myPopup = document.getElementById(aMenuName);
				while (myPopup.hasChildNodes()) {
					myPopup.lastChild.remove();
				}
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[1] && account[5] && !account[7] && (account[6] != "SEARCH")) {
						var myDirPrefId = account[4];
						if (cardbookRepository.verifyABRestrictions(myDirPrefId, "allAddressBooks", ABExclRestrictions, ABInclRestrictions)) {
							var menuItem = document.createXULElement("menuitem");
							menuItem.setAttribute("id", account[4]);
							menuItem.addEventListener("command", function(aEvent) {
									aCallback(this.id);
									aEvent.stopPropagation();
								}, false);
							menuItem.setAttribute("label", account[0]);
							myPopup.appendChild(menuItem);
						}
					}
				}
			}
			catch (e) {
				var errorTitle = "addToCardBookMenuSubMenu";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		adjustFields: function () {
			var nullableFields = {fn: [ 'fn' ],
									pers: [ 'lastname', 'firstname', 'othername', 'prefixname', 'suffixname', 'nickname', 'bday', 'gender', 'birthplace', 'anniversary', 'deathdate', 'deathplace' ],
									categories: [ 'categories' ],
									note: [ 'note' ],
									misc: [ 'mailer', 'geo', 'sortstring', 'class1', 'tz', 'agent', 'key', 'photolocalURI', 'photoURI', 'logolocalURI', 'logoURI', 'soundlocalURI', 'soundURI' ],
									tech: [ 'dirPrefId', 'version', 'prodid', 'uid', 'cardurl', 'rev', 'etag' ],
									others: [ 'others' ],
									vcard: [ 'vcard' ],
									};
			for (var i in nullableFields) {
				var found = false;
				var found1 = false;
				var found2 = false;
				for (var j = 0; j < nullableFields[i].length; j++) {
					var row = document.getElementById(nullableFields[i][j] + 'Row');
					var textbox = document.getElementById(nullableFields[i][j] + 'TextBox');
					var textbox1 = document.getElementById(nullableFields[i][j] + 'classicalTextBox');
					var textbox2 = document.getElementById(nullableFields[i][j] + 'modernTextBox');
					var label = document.getElementById(nullableFields[i][j] + 'Label');
					if (textbox) {
						var myTestValue = "";
						if (textbox.value) {
							myTestValue = textbox.value;
						} else {
							myTestValue = textbox.getAttribute('value');
						}
						if (myTestValue) {
							if (row) {
								row.removeAttribute('hidden');
							}
							if (textbox) {
								textbox.removeAttribute('hidden');
							}
							if (label) {
								label.removeAttribute('hidden');
							}
							found = true;
						} else {
							if (row) {
								row.setAttribute('hidden', 'true');
							}
							if (textbox) {
								textbox.setAttribute('hidden', 'true');
							}
							if (label) {
								label.setAttribute('hidden', 'true');
							}
						}
					}
					if (textbox1) {
						var myTestValue = "";
						if (textbox1.value) {
							myTestValue = textbox1.value;
						} else {
							myTestValue = textbox1.getAttribute('value');
						}
						if (myTestValue) {
							if (row) {
								row.removeAttribute('hidden');
							}
							if (textbox1) {
								textbox1.removeAttribute('hidden');
							}
							if (label) {
								label.removeAttribute('hidden');
							}
							found1 = true;
						} else {
							if (row) {
								row.setAttribute('hidden', 'true');
							}
							if (textbox1) {
								textbox1.setAttribute('hidden', 'true');
							}
							if (label) {
								label.setAttribute('hidden', 'true');
							}
						}
					}
					if (textbox2) {
						var myTestValue = "";
						if (textbox2.value) {
							myTestValue = textbox2.value;
						} else {
							myTestValue = textbox2.getAttribute('value');
						}
						if (myTestValue) {
							if (row) {
								row.removeAttribute('hidden');
							}
							if (textbox2) {
								textbox2.removeAttribute('hidden');
							}
							if (label) {
								label.removeAttribute('hidden');
							}
							found2 = true;
						} else {
							if (row) {
								row.setAttribute('hidden', 'true');
							}
							if (textbox2) {
								textbox2.setAttribute('hidden', 'true');
							}
							if (label) {
								label.setAttribute('hidden', 'true');
							}
						}
					}
				}
				if (cardbookRepository.customFields[i]) {
					for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
						if (document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox')) {
							if (document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox').value != "") {
								found = true;
							}
						}
					}
				}
				var groupbox = document.getElementById(i + 'Groupbox');
				if (groupbox) {
					if (found) {
						groupbox.removeAttribute('hidden');
					} else {
						groupbox.setAttribute('hidden', 'true');
					}
				}
				var groupbox1 = document.getElementById(i + 'classicalGroupbox');
				if (groupbox1) {
					if (found1) {
						groupbox1.removeAttribute('hidden');
					} else {
						groupbox1.setAttribute('hidden', 'true');
					}
				}
				var groupbox2 = document.getElementById(i + 'modernGroupbox');
				if (groupbox2) {
					if (found2) {
						groupbox2.removeAttribute('hidden');
					} else {
						groupbox2.setAttribute('hidden', 'true');
					}
				}
			}
			
			if (document.getElementById('categoriesclassicalRow')) {
				var groupbox = document.getElementById('categoriesclassicalGroupbox');
				if (document.getElementById('categoriesclassicalRow').childElementCount != "0") {
					groupbox.removeAttribute('hidden');
				} else {
					groupbox.setAttribute('hidden', 'true');
				}
			}
			if (document.getElementById('categoriesmodernGroupbox')) {
				var groupbox = document.getElementById('categoriesmodernGroupbox');
				if (document.getElementById('categoriesmodernRow').childElementCount != "0") {
					groupbox.removeAttribute('hidden');
				} else {
					groupbox.setAttribute('hidden', 'true');
				}
			}
			var groupbox = document.getElementById('orgGroupbox');
			if (document.getElementById('orgRows').childElementCount != "0") {
				groupbox.removeAttribute('hidden');
			} else {
				groupbox.setAttribute('hidden', 'true');
			}
		},

		displayCard: function (aCard, aReadOnly, aFollowLink) {
			var fieldArray = [ "fn", "lastname", "firstname", "othername", "prefixname", "suffixname", "nickname",
								"birthplace", "deathplace", "mailer", "geo", "sortstring",
								"class1", "tz", "agent", "key", "prodid", "uid", "version", "dirPrefId", "cardurl", "etag" ];
			for (var field of fieldArray) {
				if (document.getElementById(field + 'TextBox') && aCard[field]) {
					document.getElementById(field + 'TextBox').value = aCard[field];
					if (aReadOnly) {
						document.getElementById(field + 'TextBox').setAttribute('readonly', 'true');
						document.getElementById(field + 'TextBox').addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
					} else {
						document.getElementById(field + 'TextBox').removeAttribute('readonly');
					}
				}
			}
			var fieldArray = [ "bday", "anniversary", "deathdate", "rev" ];
			for (var field of fieldArray) {
				if (document.getElementById(field + 'TextBox') && aCard[field]) {
					if (aReadOnly) {
						document.getElementById(field + 'TextBox').value = cardbookRepository.cardbookDates.getFormattedDateForCard(aCard, field);
						document.getElementById(field + 'TextBox').setAttribute('readonly', 'true');
						document.getElementById(field + 'TextBox').addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
					}
				}
			}
			if (aCard.gender != "") {
				document.getElementById('genderTextBox').value = cardbookRepository.cardbookGenderLookup[aCard.gender];
				if (aReadOnly) {
					document.getElementById('genderTextBox').setAttribute('readonly', 'true');
					document.getElementById('genderTextBox').addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
				} else {
					document.getElementById('genderTextBox').removeAttribute('readonly');
				}
			}

			var myRemainingOthers = [];
			myRemainingOthers = cardbookWindowUtils.constructCustom(aReadOnly, 'pers', aCard.others);
			
			cardbookWindowUtils.constructOrg(aReadOnly, aCard.org, aCard.title, aCard.role);
			myRemainingOthers = cardbookWindowUtils.constructCustom(aReadOnly, 'org', myRemainingOthers);
            
			var fieldArray = [ [ "photo", "localURI" ] , [ "photo", "URI" ], [ "logo", "localURI" ] , [ "logo", "URI" ], [ "sound", "localURI" ] , [ "sound", "URI" ] ];
			for (var field of fieldArray) {
				if (document.getElementById(field[0] + field[1] + 'TextBox')) {
					document.getElementById(field[0] + field[1] + 'TextBox').value = aCard[field[0]][field[1]];
					if (aReadOnly) {
						document.getElementById(field[0] + field[1] + 'TextBox').setAttribute('readonly', 'true');
					} else {
						document.getElementById(field[0] + field[1] + 'TextBox').removeAttribute('readonly');
					}
				}
			}
			
			wdw_imageEdition.displayImageCard(aCard, !aReadOnly);
			cardbookWindowUtils.display40(aCard.version, aReadOnly);
			cardbookWindowUtils.displayDates(aCard.version, aReadOnly);

			var myNoteArray = aCard.note.split("\n");
			var myEvents = cardbookRepository.cardbookUtils.getCardEvents(myNoteArray, myRemainingOthers);
			if (aCard.isAList) {
				if (aReadOnly) {
					cardbookWindowUtils.loadStaticList(aCard, aFollowLink);
				} else {
					wdw_cardEdition.displayLists(aCard);
				}
			} else {
				cardbookElementTools.deleteRowsAllTypes();
				for (var i in cardbookRepository.multilineFields) {
					let myType = cardbookRepository.multilineFields[i];
					if (aReadOnly) {
						if (aCard[myType].length > 0) {
							cardbookWindowUtils.constructStaticRows(aCard.dirPrefId, myType, aCard[myType], aCard.version, aFollowLink);
						}
					} else {
						if (myType == "impp") {
							cardbookRepository.cardbookTypes.loadIMPPs(aCard[myType]);
							cardbookRepository.cardbookUtils.sortMultipleArrayByString(aCard[myType],1,1);
						}
						cardbookWindowUtils.constructDynamicRows(myType, aCard[myType], aCard.version);
					}
				}
				if (aReadOnly) {
					cardbookWindowUtils.constructStaticEventsRows(aCard.dirPrefId, myEvents.result, aCard.version);
				} else {
					cardbookWindowUtils.constructDynamicEventsRows(aCard.dirPrefId, "event", myEvents.result, aCard.version);
				}
			}
			
			document.getElementById('othersTextBox').value = myEvents.remainingOthers.join("\n");
			if (document.getElementById('othersTextBox')) {
				if (aReadOnly) {
					document.getElementById('othersTextBox').setAttribute('readonly', 'true');
				} else {
					document.getElementById('othersTextBox').removeAttribute('readonly');
				}
			}
			if (aReadOnly) {
				var panesView = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.panesView");
				if (document.getElementById('note' + panesView + 'TextBox')) {
					var myNoteBox = document.getElementById('note' + panesView + 'TextBox');
				} else if (document.getElementById('noteTextBox')) {
					var myNoteBox = document.getElementById('noteTextBox');
				}
				if (myNoteBox) {
					myNoteBox.value = myEvents.remainingNote.join("\n");
					myNoteBox.setAttribute('readonly', 'true');
					var re = /[\n\u0085\u2028\u2029]|\r\n?/;
					var noteArray = myEvents.remainingNote.join("\n").split(re);
					myNoteBox.setAttribute('rows', noteArray.length);
				}
			} else {
				document.getElementById('noteTextBox').value = myEvents.remainingNote.join("\n");
				if (aReadOnly) {
					document.getElementById('noteTextBox').setAttribute('readonly', 'true');
				} else {
					document.getElementById('noteTextBox').removeAttribute('readonly');
				}
			}
			cardbookWindowUtils.loadMailPopularity(aCard, aReadOnly);
		},

		clearCard: function () {
			var fieldArray = [ "fn", "lastname", "firstname", "othername", "prefixname", "suffixname", "nickname", "gender",
								"bday", "birthplace", "anniversary", "deathdate", "deathplace", "mailer", "geo", "sortstring", "class1", "tz",
								"agent", "key", "prodid", "uid", "version", "dirPrefId", "cardurl", "rev", "etag", "others", "vcard",
								"photolocalURI", "logolocalURI", "soundlocalURI", "photoURI", "logoURI", "soundURI" ];
			for (var i = 0; i < fieldArray.length; i++) {
				if (document.getElementById(fieldArray[i] + 'TextBox')) {
					document.getElementById(fieldArray[i] + 'TextBox').value = "";
				}
			}
			var fieldArray = [ "note" ];
			for (var i = 0; i < fieldArray.length; i++) {
				if (document.getElementById(fieldArray[i] + 'modernTextBox')) {
					document.getElementById(fieldArray[i] + 'modernTextBox').value = "";
				}
				if (document.getElementById(fieldArray[i] + 'classicalTextBox')) {
					document.getElementById(fieldArray[i] + 'classicalTextBox').value = "";
				}
			}

			cardbookElementTools.deleteRows('orgRows');
			
			// need to remove the Custom from Pers
			// for the Org, everything is cleared out
			var aListRows = document.getElementById('persRows');
			var j = aListRows.childNodes.length;
			for (var i = 0; i < j; i++) {
				if (document.getElementById('customField' + i + 'persRow')) {
					aListRows.removeChild(document.getElementById('customField' + i + 'persRow'));
				}
			}

			wdw_imageEdition.clearImageCard();
			cardbookElementTools.deleteRows('addedCardsGroupbox');
			cardbookElementTools.deleteRows('mailPopularityGroupbox');
		},

		constructCustom: function (aReadOnly, aType, aOtherValue) {
			var aOrigBox = document.getElementById(aType + 'Rows');

			var othersTemp = JSON.parse(JSON.stringify(aOtherValue));
			var result = [];
			result = cardbookRepository.customFields[aType];
			for (let i = 0; i < result.length; i++) {
				var myCode = result[i][0];
				var myLabel = result[i][1];
				var myField = 'customField' + i + aType;
				var myValue = '';
				for (var j = 0; j < othersTemp.length; j++) {
					var localDelim1 = othersTemp[j].indexOf(":",0);
					var myTestCode = othersTemp[j].substr(0,localDelim1);
					if (myCode == myTestCode) {
						myValue = othersTemp[j].substr(localDelim1+1,othersTemp[j].length);
						break;
					}
				}
				var dummy = othersTemp.splice(j,1);
				j--;
				if (aReadOnly) {
					if (myValue != "") {
						currentRow = cardbookElementTools.addGridRow(aOrigBox, myField + 'Row', {align: 'center'});
						cardbookElementTools.addLabel(currentRow, myField + 'Label', myLabel, myField + 'TextBox', {class: 'header'});
						var myTextbox = cardbookElementTools.addTextbox(currentRow, myField + 'TextBox', myValue, {readonly: 'true', fieldName: myCode, fieldLabel: myLabel});
						myTextbox.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
					}
				} else {
					currentRow = cardbookElementTools.addGridRow(aOrigBox, myField + 'Row', {align: 'center'});
					cardbookElementTools.addLabel(currentRow, myField + 'Label', myLabel, myField + 'TextBox', {class: 'header'});
					cardbookElementTools.addTextbox(currentRow, myField + 'TextBox', myValue, {});
				}
			}
			return othersTemp;
		},

		constructOrg: function (aReadOnly, aOrgValue, aTitleValue, aRoleValue) {
			var aOrigBox = document.getElementById('orgRows');
			var orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
			var currentRow;
			if (orgStructure != "") {
				var myOrgStructure = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
				var myOrgValue = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(aOrgValue).split(";"));
				for (var i = 0; i < myOrgStructure.length; i++) {
					var myValue = "";
					if (myOrgValue[i]) {
						myValue = myOrgValue[i];
					}
					if (aReadOnly) {
						if (myValue != "") {
							currentRow = cardbookElementTools.addGridRow(aOrigBox, 'orgRow_' + i, {align: 'center'});
							cardbookElementTools.addLabel(currentRow, 'orgLabel_' + i, myOrgStructure[i], 'orgTextBox_' + i, {class: 'header'});
							var myTextbox = cardbookElementTools.addTextbox(currentRow, 'orgTextBox_' + i, myValue, {readonly: 'true', fieldName: 'org.' + i, fieldLabel: myOrgStructure[i], allValue: myOrgValue.join("::")});
							myTextbox.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
						}
					} else {
						currentRow = cardbookElementTools.addGridRow(aOrigBox, 'orgRow_' + i, {align: 'center'});
						cardbookElementTools.addLabel(currentRow, 'orgLabel_' + i, myOrgStructure[i], 'orgTextBox_' + i, {class: 'header'});
						var myTextBox = cardbookElementTools.addTextbox(currentRow, 'orgTextBox_' + i, myValue, {type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'orgTextBox_' + i, class:'padded'});
						myTextBox.addEventListener("input", wdw_cardEdition.setDisplayName, false);
					}
				}
			} else {
				var myOrgValue = cardbookRepository.cardbookUtils.unescapeString(cardbookRepository.cardbookUtils.escapeString(aOrgValue));
				if (aReadOnly) {
					if (myOrgValue != "") {
						currentRow = cardbookElementTools.addGridRow(aOrigBox, 'orgRow_0', {align: 'center'});
						var myLabel = ConversionHelper.i18n.getMessage("orgLabel");
						cardbookElementTools.addLabel(currentRow, 'orgLabel', myLabel, 'orgTextBox_0', {class: 'header'});
						var myTextbox = cardbookElementTools.addTextbox(currentRow, 'orgTextBox_0', myOrgValue, {readonly: 'true', fieldName: 'org', fieldLabel: myLabel});
						myTextbox.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
					}
				} else {
					currentRow = cardbookElementTools.addGridRow(aOrigBox, 'orgRow_0', {align: 'center'});
					cardbookElementTools.addLabel(currentRow, 'orgLabel', ConversionHelper.i18n.getMessage("orgLabel"), 'orgTextBox_0', {class: 'header'});
					var myTextBox = cardbookElementTools.addTextbox(currentRow, 'orgTextBox_0', myOrgValue, {type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'orgTextBox_0', class:'padded'});
					myTextBox.addEventListener("input", wdw_cardEdition.setDisplayName, false);
				}
			}
			if (aReadOnly) {
				if (aTitleValue != "") {
					currentRow = cardbookElementTools.addGridRow(aOrigBox, 'titleRow', {align: 'center'});
					var myLabel1 = ConversionHelper.i18n.getMessage("titleLabel");
					cardbookElementTools.addLabel(currentRow, 'titleLabel', myLabel1, 'titleTextBox', {class: 'header'});
					var myTextbox1 = cardbookElementTools.addTextbox(currentRow, 'titleTextBox', aTitleValue, {readonly: 'true', fieldName: 'title', fieldLabel: myLabel1});
					myTextbox1.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
				}
				if (aRoleValue != "") {
					currentRow = cardbookElementTools.addGridRow(aOrigBox, 'roleRow', {align: 'center'});
					var myLabel2 = ConversionHelper.i18n.getMessage("roleLabel");
					cardbookElementTools.addLabel(currentRow, 'roleLabel', myLabel2, 'roleTextBox', {class: 'header'});
					var myTextbox2 = cardbookElementTools.addTextbox(currentRow, 'roleTextBox', aRoleValue, {readonly: 'true', fieldName: 'role', fieldLabel: myLabel2});
					myTextbox2.addEventListener("contextmenu", cardbookRichContext.fireBasicFieldContext, true);
				}
			} else {
				currentRow = cardbookElementTools.addGridRow(aOrigBox, 'titleRow', {align: 'center'});
				cardbookElementTools.addLabel(currentRow, 'titleLabel', ConversionHelper.i18n.getMessage("titleLabel"), 'titleTextBox', {class: 'header'});
				var myTextBox = cardbookElementTools.addTextbox(currentRow, 'titleTextBox', aTitleValue, {type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'titleTextBox', class:'padded'});
				myTextBox.addEventListener("input", wdw_cardEdition.setDisplayName, false);
				currentRow = cardbookElementTools.addGridRow(aOrigBox, 'roleRow', {align: 'center'});
				cardbookElementTools.addLabel(currentRow, 'roleLabel', ConversionHelper.i18n.getMessage("roleLabel"), 'roleTextBox', {class: 'header'});
				var myTextBox = cardbookElementTools.addTextbox(currentRow, 'roleTextBox', aRoleValue, {type: 'autocomplete', autocompletesearch: 'form-history', autocompletesearchparam: 'roleTextBox', class:'padded'});
				myTextBox.addEventListener("input", wdw_cardEdition.setDisplayName, false);
			}
		},

		getTypeForLine: function (aType, aIndex) {
			var myLineResult = [];
			var myLineTypeResult = [];
			
			var myPrefButton = document.getElementById(aType + '_' + aIndex + '_PrefImage');
			if (document.getElementById('versionTextBox').value === "4.0") {
				if (myPrefButton.getAttribute('haspref')) {
					var aPrefWeightBoxValue = document.getElementById(aType + '_' + aIndex + '_prefWeightBox').value;
					if (aPrefWeightBoxValue) {
						myLineTypeResult.push("PREF=" + aPrefWeightBoxValue);
					} else {
						myLineTypeResult.push("PREF=1");
					}
				}
			} else {
				if (myPrefButton.getAttribute('haspref')) {
					myLineTypeResult.push("TYPE=PREF");
				}
			}

			var myLineOtherType = document.getElementById(aType + '_' + aIndex + '_othersTypesBox').value;
			if (myLineOtherType) {
				myLineTypeResult = myLineTypeResult.concat(myLineOtherType.split(','));
			}
			
			var myLineTypeType = [];

			var itemsListbox = document.getElementById(aType + '_' + aIndex + '_MenulistType');
			var myTypes = [];
			if (itemsListbox) {
				var item = itemsListbox.querySelectorAll("menuitem.cardbook-item[checked]");
				if (item[0]) {
					var myValue = item[0].getAttribute('value').trim();
					myTypes = [myValue, "PG"];
					var ABType = cardbookRepository.cardbookPreferences.getType(wdw_cardEdition.workingCard.dirPrefId);
					var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
					for (var i = 0; i < cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType].length; i++) {
						if (myValue == cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][0]) {
							var prefPossibility = cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][1].split(";")[0];
							if (cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][2] && cardbookRepository.cardbookCoreTypes[ABTypeFormat][aType][i][2] == "PG") {
								myTypes = [prefPossibility, "PG"];
							} else {
								myTypes = [prefPossibility, "NOPG"];
							}
						}
					}
				} else {
					myTypes = [];
				}
			}
			var myOutputPg = [];
			var myPgName = "";
			if (myTypes.length != 0) {
				if (myTypes[1] == "PG") {
					myOutputPg = [ "X-ABLABEL:" + myTypes[0] ];
					myPgName = "ITEM1";
				} else {
					myLineTypeType.push("TYPE=" + myTypes[0]);
				}
			}

			if (myLineTypeType.length > 0) {
				myLineTypeResult = myLineTypeResult.concat(myLineTypeType);
				myLineTypeResult = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.formatTypes(cardbookRepository.cardbookUtils.escapeArray(myLineTypeResult)));
			}
			
			if (aType == "adr") {
				var j = 0;
				var myLineTypeValue = [];
				while (true) {
					if (document.getElementById(aType + '_' + aIndex + '_valueBox_' + j)) {
						var myTypeValue = document.getElementById(aType + '_' + aIndex + '_valueBox_' + j).value.replace(/\\n/g, "\n").trim();
						myLineTypeValue.push(myTypeValue);
						j++;
					} else {
						break;
					}
				}
			} else {
				var myLineTypeValue = [document.getElementById(aType + '_' + aIndex + '_valueBox').value.trim()];
			}
			
			if (aType == "impp" && document.getElementById(aType + '_' + aIndex + '_menulistIMPP').selectedItem) {
				return [myLineTypeValue, myLineTypeResult, myPgName, myOutputPg, document.getElementById(aType + '_' + aIndex + '_menulistIMPP').value];
			} else {
				return [myLineTypeValue, myLineTypeResult, myPgName, myOutputPg, ""];
			}
		},

		getIMPPTypes: function () {
			var i = 0;
			var myResult = [];
			while (true) {
				if (document.getElementById('impp_' + i + '_hbox')) {
					var lineResult = cardbookWindowUtils.getTypeForLine('impp', i);
					if (lineResult[0].join("") != "") {
						function removeServiceType(element) {
							return (element == element.replace(/^X-SERVICE-TYPE=/i, ""));
						}
						lineResult[1] = lineResult[1].filter(removeServiceType);
						lineResult[1].push("X-SERVICE-TYPE=" + lineResult[4]);

						var myValue = lineResult[0].join(" ");
						serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(lineResult[4])
						if (serviceLine[0]) {
							var myRegexp = new RegExp("^" + serviceLine[2] + ":");
							myValue = myValue.replace(myRegexp, "");
							myValue = serviceLine[2] + ":" + myValue;
						}
						myResult.push([[myValue], lineResult[1], "", []]);
					}
					i++;
				} else {
					break;
				}
			}
			return myResult;
		},

		getAllTypes: function (aType, aRemoveNull) {
			var i = 0;
			var myResult = [];
			while (true) {
				if (document.getElementById(aType + '_' + i + '_hbox')) {
					var lineResult = cardbookWindowUtils.getTypeForLine(aType, i);
					if (lineResult[0].join("") != "" || !aRemoveNull) {
						myResult.push(lineResult);
					}
					i++;
				} else {
					break;
				}
			}
			return myResult;
		},

		getAllEvents: function (aRemoveNull) {
			var myType = "event";
			var i = 0;
			var myResult = [];
			while (true) {
				if (document.getElementById(myType + '_' + i + '_hbox')) {
					var myPrefButton = document.getElementById(myType + '_' + i + '_PrefImage');
					var dateResult = document.getElementById(myType + '_' + i + '_valueDateBox').value;
					var nameResult = document.getElementById(myType + '_' + i + '_valueBox').value;
					if ((nameResult != "" && dateResult != "") || !aRemoveNull) {
						myResult.push([dateResult, nameResult, myPrefButton.getAttribute('haspref')]);
					}
					i++;
				} else {
					break;
				}
			}
			return myResult;
		},

		openAdrPanel: function (aAdrLine, aIdArray) {
			wdw_cardEdition.currentAdrId = JSON.parse(JSON.stringify(aIdArray));
			document.getElementById('adrPostOfficeTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][0]);
			document.getElementById('adrExtendedAddrTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][1]);
			document.getElementById('adrStreetTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][2]);
			document.getElementById('adrLocalityTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][3]);
			document.getElementById('adrRegionTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][4]);
			document.getElementById('adrPostalCodeTextBox').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][5]);
			document.getElementById('adrCountryMenulist').value = cardbookRepository.cardbookUtils.undefinedToBlank(aAdrLine[0][6]);
			if (document.getElementById('adrCountryMenulist').value == "") {
				var regionStrBundle = Services.strings.createBundle("resource://gre/localization/" + cardbookRepository.getLang() + "/toolkit/intl/regionNames.ftl")
				var country = cardbookRepository.cardbookUtils.getCardRegion(wdw_cardEdition.workingCard);
				if (country != "") {
					var lcRegionCode = country.toLowerCase();
					document.getElementById('adrCountryMenulist').value = regionStrBundle.GetStringFromName("region-name-" + lcRegionCode);
				} else {
					document.getElementById('adrCountryMenulist').value = "";
				}
			}
			document.getElementById('adrPanel').openPopup(document.getElementById(wdw_cardEdition.currentAdrId.join("_")), 'after_start', 0, 0, false, false);
		},

		closeAdrPanel: function () {
			document.getElementById('adrPanel').hidePopup();
			wdw_cardEdition.cardRegion = cardbookRepository.cardbookUtils.getCardRegion(wdw_cardEdition.workingCard);
		},

		validateAdrPanel: function () {
			var myId = wdw_cardEdition.currentAdrId.join("_");
			document.getElementById(myId + '_' + '0').value = document.getElementById('adrPostOfficeTextBox').value.trim();
			document.getElementById(myId + '_' + '1').value = document.getElementById('adrExtendedAddrTextBox').value.trim();
			document.getElementById(myId + '_' + '2').value = document.getElementById('adrStreetTextBox').value.replace(/\n/g, "\\n").trim();
			document.getElementById(myId + '_' + '3').value = document.getElementById('adrLocalityTextBox').value.trim();
			document.getElementById(myId + '_' + '4').value = document.getElementById('adrRegionTextBox').value.trim();
			document.getElementById(myId + '_' + '5').value = document.getElementById('adrPostalCodeTextBox').value.trim();
			document.getElementById(myId + '_' + '6').value = document.getElementById('adrCountryMenulist').value.trim();

			var myTmpArray = [];
			for (var i = 0; i < 7; i++) {
				if (document.getElementById(myId + '_' + i).value != "") {
					myTmpArray.push(document.getElementById(myId + '_' + i).value.replace(/\\n/g, " ").trim());
				}
			}
			document.getElementById(myId).value = myTmpArray.join(" ").trim();
		},

		cancelAdrPanel: function () {
			cardbookWindowUtils.disableButtons(wdw_cardEdition.currentAdrId[0], wdw_cardEdition.currentAdrId[1]);
		},

		disableButtons: function (aType, aIndex) {
			if (aIndex == 0) {
				if (document.getElementById(aType + '_' + aIndex + '_valueBox').value == "") {
					document.getElementById(aType + '_' + aIndex + '_removeButton').disabled = true;
					document.getElementById(aType + '_' + aIndex + '_addButton').disabled = true;
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

		findNextLine: function (aType) {
			var i = 0;
			while (true) {
				if (document.getElementById(aType + '_' + i + '_hbox') || document.getElementById(aType + '_' + i + '_row')) {
					i++;
				} else {
					return i;
				}
			}
		},

		constructDynamicRows: function (aType, aArray, aVersion) {
			var start = cardbookWindowUtils.findNextLine(aType);
			for (var i = 0; i < aArray.length; i++) {
				cardbookWindowUtils.loadDynamicTypes(aType, i+start, aArray[i][1], aArray[i][2], aArray[i][3], aArray[i][0], aVersion);
			}
			if (aArray.length == 0) {
				cardbookWindowUtils.loadDynamicTypes(aType, start, [], "", [], [""], aVersion);
			}
		},

		constructDynamicEventsRows: function (aDirPrefId, aType, aEventType, aVersion) {
			var start = cardbookWindowUtils.findNextLine(aType);
			for (var i = 0; i < aEventType.length; i++) {
				cardbookWindowUtils.loadDynamicEventsTypes(aDirPrefId, aType, i+start, aEventType[i], aVersion);
			}
			if (aEventType.length == 0) {
				cardbookWindowUtils.loadDynamicEventsTypes(aDirPrefId, aType, start, ["", ""], aVersion);
			}
		},

		constructStaticRows: function (aDirPrefId, aType, aArray, aVersion, aFollowLink) {
			for (var i = 0; i < aArray.length; i++) {
				cardbookWindowUtils.loadStaticTypes(aDirPrefId, aType, i, aArray[i][1], aArray[i][2], aArray[i][3], aArray[i][0], aVersion, aFollowLink);
			}
		},

		constructStaticEventsRows: function (aDirPrefId, aEventType, aVersion) {
			for (var i = 0; i < aEventType.length; i++) {
				cardbookWindowUtils.loadStaticEventsTypes(aDirPrefId, "event", i, aEventType[i], aVersion);
			}
		},

		display40: function (aCardVersion, aReadOnly) {
			function isElementInPref(element) {
				return (wdw_cardEdition.editionFields.includes(element) || wdw_cardEdition.editionFields[0] == "allFields");
			}
			if (aCardVersion == "4.0") {
				if (aReadOnly) {
					document.getElementById('birthplaceRow').removeAttribute('hidden');
					document.getElementById('deathplaceRow').removeAttribute('hidden');
					if (document.getElementById('genderRow1')) {
						document.getElementById('genderRow1').setAttribute('hidden', 'true');
						if (document.getElementById('genderTextBox').value) {
							document.getElementById('genderRow2').removeAttribute('hidden');
							document.getElementById('genderTextBox').setAttribute('readonly', 'true');
						} else {
							document.getElementById('genderRow2').setAttribute('hidden', 'true');
						}
					} else if (document.getElementById('genderRow')) {
						document.getElementById('genderTextBox').setAttribute('readonly', 'true');
					}
					document.getElementById('birthplaceTextBox').setAttribute('readonly', 'true');
					document.getElementById('deathplaceTextBox').setAttribute('readonly', 'true');
				} else {
					// edition
					if (document.getElementById('genderRow1')) {
						if (isElementInPref('gender') || wdw_cardEdition.workingCard.gender) {
							document.getElementById('genderRow1').removeAttribute('hidden');
						} else {
							document.getElementById('genderRow1').setAttribute('hidden', 'true');
						}
						document.getElementById('genderRow2').setAttribute('hidden', 'true');
					} else if (document.getElementById('genderRow')) {
						document.getElementById('genderTextBox').setAttribute('readonly', 'true');
					}
					if (isElementInPref('birthplace') || wdw_cardEdition.workingCard.birthplace) {
						document.getElementById('birthplaceRow').removeAttribute('hidden');
						document.getElementById('birthplaceTextBox').removeAttribute('readonly');
					} else {
						document.getElementById('birthplaceRow').setAttribute('hidden', 'true');
					}
					if (isElementInPref('deathplace') || wdw_cardEdition.workingCard.deathplace) {
						document.getElementById('deathplaceRow').removeAttribute('hidden');
						document.getElementById('deathplaceTextBox').removeAttribute('readonly');
					} else {
						document.getElementById('deathplaceRow').setAttribute('hidden', 'true');
					}
				}
			} else {
				if (document.getElementById('genderRow1')) {
					document.getElementById('genderRow1').setAttribute('hidden', 'true');
					document.getElementById('genderRow2').setAttribute('hidden', 'true');
				} else if (document.getElementById('genderRow')) {
					document.getElementById('genderRow').setAttribute('hidden', 'true');
				}
				document.getElementById('birthplaceRow').setAttribute('hidden', 'true');
				document.getElementById('deathplaceRow').setAttribute('hidden', 'true');
			}
		},

		displayDates: function (aCardVersion, aReadOnly) {
			function isElementInPref(element) {
				return (wdw_cardEdition.editionFields.includes(element) || wdw_cardEdition.editionFields[0] == "allFields");
			}
			if (aCardVersion == "4.0") {
				if (aReadOnly) {
					if (document.getElementById('bdayRow1')) {
						document.getElementById('bdayRow1').setAttribute('hidden', 'true');
						document.getElementById('anniversaryRow1').setAttribute('hidden', 'true');
						document.getElementById('deathdateRow1').setAttribute('hidden', 'true');
						if (document.getElementById('bdayTextBox').value) {
							document.getElementById('bdayRow2').removeAttribute('hidden');
							document.getElementById('bdayTextBox').setAttribute('readonly', 'true');
						} else {
							document.getElementById('bdayRow2').setAttribute('hidden', 'true');
						}
						if (document.getElementById('anniversaryTextBox').value) {
							document.getElementById('anniversaryRow2').removeAttribute('hidden');
							document.getElementById('anniversaryTextBox').setAttribute('readonly', 'true');
						} else {
							document.getElementById('anniversaryRow2').setAttribute('hidden', 'true');
						}
						if (document.getElementById('deathdateTextBox').value) {
							document.getElementById('deathdateRow2').removeAttribute('hidden');
							document.getElementById('deathdateTextBox').setAttribute('readonly', 'true');
						} else {
							document.getElementById('deathdateRow2').setAttribute('hidden', 'true');
						}
					} else if (document.getElementById('bdayRow')) {
						document.getElementById('bdayTextBox').setAttribute('readonly', 'true');
						document.getElementById('anniversaryTextBox').setAttribute('readonly', 'true');
						document.getElementById('deathdateTextBox').setAttribute('readonly', 'true');
					}
				} else {
					// edition
					if (document.getElementById('bdayRow1')) {
						for (var field of cardbookRepository.dateFields) {
							if (isElementInPref(field) || wdw_cardEdition.workingCard[field]) {
								document.getElementById(field + 'Row1').removeAttribute('hidden');
							} else {
								document.getElementById(field + 'Row1').setAttribute('hidden', 'true');
							}
							document.getElementById(field + 'Row2').setAttribute('hidden', 'true');
						}
					} else if (document.getElementById('bdayRow')) {
						for (var field of cardbookRepository.dateFields) {
							document.getElementById(field + 'TextBox').setAttribute('readonly', 'true');
						}
					}
				}
			} else {
				if (document.getElementById('bdayRow1')) {
					if (!aReadOnly) {
						if (isElementInPref('bday') || wdw_cardEdition.workingCard.bday) {
							document.getElementById('bdayRow1').removeAttribute('hidden');
						} else {
							document.getElementById('bdayRow1').setAttribute('hidden', 'true');
						}
						document.getElementById('bdayRow2').setAttribute('hidden', 'true');
					} else {
						document.getElementById('bdayRow1').setAttribute('hidden', 'true');
						document.getElementById('bdayRow2').removeAttribute('hidden');
					}
				} else if (document.getElementById('bdayRow')) {
					document.getElementById('bdayRow').removeAttribute('hidden');
				}
				if (document.getElementById('anniversaryRow1')) {
					document.getElementById('anniversaryRow1').setAttribute('hidden', 'true');
					document.getElementById('anniversaryRow2').setAttribute('hidden', 'true');
				} else if (document.getElementById('anniversaryRow')) {
					document.getElementById('anniversaryRow').setAttribute('hidden', 'true');
				}
				if (document.getElementById('deathdateRow1')) {
					document.getElementById('deathdateRow1').setAttribute('hidden', 'true');
					document.getElementById('deathdateRow2').setAttribute('hidden', 'true');
				} else if (document.getElementById('deathdateRow')) {
					document.getElementById('deathdateRow').setAttribute('hidden', 'true');
				}
			}
		},

		displayPref: function (aVersion) {
			var usePreferenceValue = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.usePreferenceValue");
			for (var i in cardbookRepository.multilineFields) {
				let myType = cardbookRepository.multilineFields[i];
				if (document.getElementById(myType + 'Groupbox')) {
					var j = 0;
					while (true) {
						if (document.getElementById(myType + '_' + j + '_prefWeightBox')) {
							var myPrefWeightBoxLabel = document.getElementById(myType + '_' + j + '_prefWeightBoxLabel');
							var myPrefWeightBox = document.getElementById(myType + '_' + j + '_prefWeightBox');
							if (aVersion === "4.0" && usePreferenceValue) {
								myPrefWeightBoxLabel.removeAttribute('hidden');
								myPrefWeightBox.removeAttribute('hidden');
							} else {
								myPrefWeightBoxLabel.setAttribute('hidden', 'true');
								myPrefWeightBox.setAttribute('hidden', 'true');
							}
							if (document.getElementById(myType + '_' + j + '_PrefImage').getAttribute('haspref')) {
								myPrefWeightBoxLabel.removeAttribute('readonly');
							} else {
								myPrefWeightBoxLabel.setAttribute('readonly', 'true');
							}
							j++;
						} else {
							break;
						}
					}
				}
			}
		},

		loadDynamicTypes: function (aType, aIndex, aInputTypes, aPgName, aPgType, aCardValue, aVersion) {
			var aOrigBox = document.getElementById(aType + 'Groupbox');
			
			if (aIndex == 0) {
				cardbookElementTools.addCaption(aType, aOrigBox);
			}
			
			var aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox, {class: "input-container"});

			var myInputTypes = [];
			myInputTypes = cardbookRepository.cardbookUtils.getOnlyTypesFromTypes(aInputTypes);
			var myOthersTypes = cardbookRepository.cardbookUtils.getNotTypesFromTypes(aInputTypes);
			
			var aPrefButton = cardbookElementTools.addPrefStar(aHBox, aType, aIndex, cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(aInputTypes))
			
			cardbookElementTools.addLabel(aHBox, aType + '_' + aIndex + '_prefWeightBoxLabel', cardbookRepository.cardbookPreferences.getPrefValueLabel(), aType + '_' + aIndex + '_prefWeightBox', {tooltip: ConversionHelper.i18n.getMessage("prefWeightTooltip")});
			cardbookElementTools.addTextbox(aHBox, aType + '_' + aIndex + '_prefWeightBox', cardbookRepository.cardbookUtils.getPrefValueFromTypes(aInputTypes, document.getElementById('versionTextBox').value), {size: "5"});
			if (aPrefButton.getAttribute('haspref')) {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBoxLabel').disabled = false;
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').disabled = false;
			} else {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBoxLabel').disabled = true;
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').disabled = true;
			}

			var usePreferenceValue = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.usePreferenceValue");
			if (document.getElementById('versionTextBox').value === "4.0" && usePreferenceValue) {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBoxLabel').removeAttribute('hidden');
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').removeAttribute('hidden');
			} else {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBoxLabel').setAttribute('hidden', 'true');
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'true');
			}

			cardbookElementTools.addTextbox(aHBox, aType + '_' + aIndex + '_othersTypesBox', myOthersTypes, {hidden: "true"});

			if (aType != "impp") {
				var myCheckedArrayTypes = [];
				if (aPgType.length != 0 && aPgName != "") {
					let found = false;
					for (var j = 0; j < aPgType.length; j++) {
						let tmpArray = aPgType[j].split(":");
						if (tmpArray[0] == "X-ABLABEL") {
							cardbookElementTools.addMenuTypelist(aHBox, aType, aIndex, [tmpArray[1]]);
							myCheckedArrayTypes.push(tmpArray[1]);
							found = true;
							break;
						}
					}
					if (!found) {
						for (var j = 0; j < myInputTypes.length; j++) {
							myCheckedArrayTypes.push(myInputTypes[j]);
						}
						cardbookElementTools.addMenuTypelist(aHBox, aType, aIndex, myCheckedArrayTypes);
					}
				} else {
					for (var j = 0; j < myInputTypes.length; j++) {
						myCheckedArrayTypes.push(myInputTypes[j]);
					}
					cardbookElementTools.addMenuTypelist(aHBox, aType, aIndex, myCheckedArrayTypes);
				}
			}

			if (aType == "impp") {
				var serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aInputTypes);
				var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aCardValue);
				cardbookElementTools.addMenuIMPPlist(aHBox, aType, aIndex, cardbookRepository.cardbookTypes.allIMPPs, serviceCode, serviceProtocol);
				var myValue = aCardValue.join(" ");
				if (serviceCode != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
					if (serviceLine[0]) {
						var myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myValue = myValue.replace(myRegexp, "");
					}
				} else if (serviceProtocol != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
					if (serviceLine[0]) {
						var myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myValue = myValue.replace(myRegexp, "");
					}
				}
				cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', myValue, {}, aIndex);
			} else if (aType == "adr") {
				var myTmpArray = [];
				for (var i = 0; i < aCardValue.length; i++) {
					if (aCardValue[i] != "") {
						myTmpArray.push(aCardValue[i].replace(/\n/g, " "));
					}
				}
				cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', myTmpArray.join(" "), {}, aIndex);
			} else {
				cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', cardbookRepository.cardbookUtils.cleanArray(aCardValue).join(" "), {}, aIndex);
			}

			if (aType == "adr") {
				function fireEditAdrOnClick(aEvent) {
					if (aEvent.button == 0) {
						var myIdArray = this.id.split('_');
						var myTempResult = cardbookWindowUtils.getTypeForLine(aType, aIndex);
						if (myTempResult.length == 0) {
							var adrLine = [ ["", "", "", "", "", "", ""], [""], "", [""] ];
						} else {
							var adrLine = myTempResult;
						}
						cardbookWindowUtils.openAdrPanel(adrLine, myIdArray);
					}
				};
				document.getElementById(aType + '_' + aIndex + '_valueBox').addEventListener("click", fireEditAdrOnClick, false);
				function fireEditAdrOnInput() {
					var myIdArray = this.id.split('_');
					var myTempResult = cardbookWindowUtils.getTypeForLine(aType, aIndex);
					if (myTempResult.length == 0) {
						var adrLine = [ ["", "", "", "", "", "", ""], [""], "", [""] ];
					} else {
						var adrLine = myTempResult;
					}
					cardbookWindowUtils.openAdrPanel(adrLine, myIdArray);
				};
				document.getElementById(aType + '_' + aIndex + '_valueBox').addEventListener("keydown", fireEditAdrOnInput, false);

				let i = 0;
				while ( i < 7 ) {
					if (aCardValue[i]) {
						cardbookElementTools.addTextbox(aHBox, aType + '_' + aIndex + '_valueBox_' + i, aCardValue[i].replace(/\n/g, "\\n"), {hidden: "true"});
					} else {
						cardbookElementTools.addTextbox(aHBox, aType + '_' + aIndex + '_valueBox_' + i, "", {hidden: "true"});
					}
					i++;
				}
			} else if (aType == "tel") {
				function fireInputTel(event) {
					var myValidationButton = document.getElementById(aType + '_' + aIndex + '_validateButton');
					var tel = PhoneNumber.Parse(this.value, wdw_cardEdition.cardRegion);
					if (tel && tel.internationalFormat && this.value == tel.internationalFormat) {
						myValidationButton.setAttribute('label', '✔');
						myValidationButton.setAttribute('tooltiptext', ConversionHelper.i18n.getMessage("validatedEntryTooltip"));
					} else {
						myValidationButton.setAttribute('label', '!');
						myValidationButton.setAttribute('tooltiptext', ConversionHelper.i18n.getMessage("notValidatedEntryTooltip"));
					}
				};
				document.getElementById(aType + '_' + aIndex + '_valueBox').addEventListener("input", fireInputTel, false);
			}
		
			if (aType == "tel") {
				function fireValidateTelButton(event) {
					if (document.getElementById(this.id).disabled) {
						return;
					}
					var myIdArray = this.id.split('_');
					var myTelTextBox = document.getElementById(aType + '_' + aIndex + '_valueBox');
					var tel = PhoneNumber.Parse(myTelTextBox.value, wdw_cardEdition.cardRegion);
					if (tel && tel.internationalFormat) {
						myTelTextBox.value = tel.internationalFormat;
						this.setAttribute('label', '✔');
						this.setAttribute('tooltiptext', ConversionHelper.i18n.getMessage("validatedEntryTooltip"));
					} else {
						this.setAttribute('label', '!');
						this.setAttribute('tooltiptext', ConversionHelper.i18n.getMessage("notValidatedEntryTooltip"));
					}
				};
				var myTelTextBoxValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				if (myTelTextBoxValue == "") {
					cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'noValidated', 'validate', fireValidateTelButton);
				} else {
					var tel = PhoneNumber.Parse(myTelTextBoxValue, wdw_cardEdition.cardRegion);
					if (tel && tel.internationalFormat) {
						cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'validated', 'validate', fireValidateTelButton);
					} else {
						cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'notValidated', 'validate', fireValidateTelButton);
					}
				}
			} else if (aType == "url") {
				function fireValidateUrlButton(event) {
					if (document.getElementById(this.id).disabled) {
						return;
					}
					function assignUrlButton(aFile, aField) {
						aField.value = "file://" + aFile.path;
					};
					var myUrlTextBox = document.getElementById(aType + '_' + aIndex + '_valueBox');
					try {
						var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
						myFile.initWithPath(myUrlTextBox.value.replace("file://", ""));
						cardbookWindowUtils.callFilePicker("fileSelectionTitle", "OPEN", "", "", myFile.parent, assignUrlButton, myUrlTextBox);
					} catch(e) {
						cardbookWindowUtils.callFilePicker("fileSelectionTitle", "OPEN", "", "", "", assignUrlButton, myUrlTextBox);
					}
				};
				cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'link', 'link', fireValidateUrlButton);
			}
			
			function fireUpButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTypes(aType, false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1-1];
				myAllValuesArray[aIndex*1-1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicRows(aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'up', 'up', fireUpButton);
			
			function fireDownButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTypes(aType, false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1+1];
				myAllValuesArray[aIndex*1+1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicRows(aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'down', 'down', fireDownButton);

			function fireRemoveButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllTypes(aType, false);
				cardbookElementTools.deleteRowsType(aType);
				if (myAllValuesArray.length == 0) {
					cardbookWindowUtils.constructDynamicRows(aType, myAllValuesArray, aVersion);
				} else {
					var removed = myAllValuesArray.splice(aIndex, 1);
					cardbookWindowUtils.constructDynamicRows(aType, myAllValuesArray, aVersion);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'remove', 'remove', fireRemoveButton);
			
			function fireAddButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				if (myValue == "") {                                                                                       
					return;
				}
				var myNextIndex = 1+ 1*aIndex;
				cardbookWindowUtils.loadDynamicTypes(aType, myNextIndex, [], "", [], [""], aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'add', 'add', fireAddButton);

			cardbookWindowUtils.disableButtons(aType, aIndex);
		},

		loadDynamicEventsTypes: function (aDirPrefId, aType, aIndex, aEventType, aVersion) {
			var aOrigBox = document.getElementById(aType + 'Groupbox');
			
			if (aIndex == 0) {
				cardbookElementTools.addCaption(aType, aOrigBox);
			}
			
			var aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox, {class: "input-container"});

			var aPrefButton = cardbookElementTools.addPrefStar(aHBox, aType, aIndex, aEventType[2])

			let myDateFormat = cardbookRepository.getDateFormat(aDirPrefId, aVersion);
			cardbookElementTools.addDatepicker(aHBox, aType + '_' + aIndex + '_valueDateBox', cardbookRepository.cardbookDates.getDateStringFromVCardDate(aEventType[0], myDateFormat), {});
			cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', aEventType[1], {}, aIndex);

			function fireUpButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllEvents(false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1-1];
				myAllValuesArray[aIndex*1-1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'up', 'up', fireUpButton);
			
			function fireDownButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllEvents(false);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[aIndex*1+1];
				myAllValuesArray[aIndex*1+1] = myAllValuesArray[aIndex];
				myAllValuesArray[aIndex] = temp;
				cardbookElementTools.deleteRowsType(aType);
				cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'down', 'down', fireDownButton);

			function fireRemoveButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myAllValuesArray = cardbookWindowUtils.getAllEvents(false);
				cardbookElementTools.deleteRowsType(aType);
				if (myAllValuesArray.length == 0) {
					cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
				} else {
					var removed = myAllValuesArray.splice(aIndex, 1);
					cardbookWindowUtils.constructDynamicEventsRows(aDirPrefId, aType, myAllValuesArray, aVersion);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'remove', 'remove', fireRemoveButton);
			
			function fireAddButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myValue = document.getElementById(aType + '_' + aIndex + '_valueBox').value;
				if (myValue == "") {                                                                                       
					return;
				}
				var myNextIndex = 1+ 1*aIndex;
				cardbookWindowUtils.loadDynamicEventsTypes(aDirPrefId, aType, myNextIndex, ["", ""], aVersion);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, 'add', 'add', fireAddButton);

			cardbookWindowUtils.disableButtons(aType, aIndex);
		},

		loadStaticTypes: function (aDirPrefId, aType, aIndex, aInputTypes, aPgName, aPgType, aCardValue, aVersion, aFollowLink) {
			if (aCardValue.join(" ") == "") {
				return;
			}

			if (aIndex == 0) {
				var aOrigBox = cardbookElementTools.addGroupbox(aType);
				cardbookElementTools.addCaption(aType, aOrigBox);
			} else {
				var panesView = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.panesView");
				var aOrigBox = document.getElementById(aType + panesView + 'Groupbox');
			}
			
			var aRow = cardbookElementTools.addGridRow(aOrigBox, aType + '_' + aIndex + '_gridRow', {align: 'start'});

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
			
			var aPrefImage = document.createXULElement('image');
			aRow.appendChild(aPrefImage);
			aPrefImage.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			if (cardbookRepository.cardbookUtils.getPrefBooleanFromTypes(aInputTypes)) {
				aPrefImage.setAttribute('class', 'cardbookPrefStarClass');
				aPrefImage.setAttribute('haspref', 'true');
			} else {
				aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
				aPrefImage.removeAttribute('haspref');
			}

			cardbookElementTools.addTextbox(aRow, aType + '_' + aIndex + '_prefWeightBox', cardbookRepository.cardbookUtils.getPrefValueFromTypes(aInputTypes, document.getElementById('versionTextBox').value),
										{readonly: 'true'});
			if (document.getElementById('versionTextBox').value === "4.0") {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'false');
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('width', '3');
			} else {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'true');
			}

			var myValueTextbox;
			if (aType == "impp") {
				var serviceCode = cardbookRepository.cardbookTypes.getIMPPCode(aInputTypes);
				var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol(aCardValue);
				var myValue = aCardValue.join(" ");
				if (serviceCode != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForCode(serviceCode)
					if (serviceLine[0]) {
						myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
						cardbookElementTools.addTextbox(aRow, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), {readonly: 'true'});
						var myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myValue = myValue.replace(myRegexp, "");
						myValueTextbox = cardbookElementTools.addLabel(aRow, aType + '_' + aIndex + '_valueBox', myValue, null, {});
						myValueTextbox.setAttribute('link', 'true');
					} else {
						myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
						cardbookElementTools.addTextbox(aRow, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), {readonly: 'true'});
						myValueTextbox = cardbookElementTools.addLabel(aRow, aType + '_' + aIndex + '_valueBox', myValue, null, {});
						myValueTextbox.setAttribute('readonly', 'true');
					}
				} else if (serviceProtocol != "") {
					var serviceLine = [];
					serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
					if (serviceLine[0]) {
						myDisplayedTypes = myDisplayedTypes.concat(serviceLine[1]);
						cardbookElementTools.addTextbox(aRow, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), {readonly: 'true'});
						var myRegexp = new RegExp("^" + serviceLine[2] + ":");
						myValue = myValue.replace(myRegexp, "");
						myValueTextbox = cardbookElementTools.addLabel(aRow, aType + '_' + aIndex + '_valueBox', myValue, null, {});
						myValueTextbox.setAttribute('link', 'true');
					} else {
						myDisplayedTypes = myDisplayedTypes.concat(serviceCode);
						cardbookElementTools.addTextbox(aRow, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), {readonly: 'true'});
						myValueTextbox = cardbookElementTools.addLabel(aRow, aType + '_' + aIndex + '_valueBox', myValue, null, {});
						myValueTextbox.setAttribute('readonly', 'true');
					}
				} else {
					cardbookElementTools.addTextbox(aRow, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), {readonly: 'true'});
					myValueTextbox = cardbookElementTools.addLabel(aRow, aType + '_' + aIndex + '_valueBox', myValue, null, {});
					myValueTextbox.setAttribute('readonly', 'true');
				}
			} else {
				cardbookElementTools.addTextbox(aRow, aType + '_' + aIndex + '_typeBox', cardbookRepository.cardbookUtils.formatTypesForDisplay(myDisplayedTypes), {readonly: 'true'});
	
				if (aType == "adr") {
					var re = /[\n\u0085\u2028\u2029]|\r\n?/;
					var myAdrResult = cardbookRepository.cardbookUtils.formatAddress(aCardValue);
					var myAdrResultArray = myAdrResult.split(re);
					myValueTextbox = cardbookElementTools.addTextarea(aRow, aType + '_' + aIndex + '_valueBox', myAdrResult, {rows: myAdrResultArray.length});
				} else {
					myValueTextbox = cardbookElementTools.addLabel(aRow, aType + '_' + aIndex + '_valueBox', cardbookRepository.cardbookUtils.cleanArray(aCardValue).join(" "), null, {});
				}
				
				if (aType == "adr") {
					myValueTextbox.setAttribute('link', 'true');
				} else if (aType == "url" || aType == "email") {
					myValueTextbox.setAttribute('class', 'text-link');
				} else if (aType == "tel") {
					var telProtocol = "";
					try {
						var telProtocol = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.tels.0");
						myValueTextbox.setAttribute('class', 'text-link');
					}
					catch(e) {
						myValueTextbox.setAttribute('readonly', 'true');
					}
				}
			}
			
			myValueTextbox.addEventListener("contextmenu", cardbookRichContext.fireTypeContext, false);
				
			function fireClick(event) {
				if (wdw_cardbook) {
					wdw_cardbook.chooseActionTreeForClick(event)
				}
			};
			myValueTextbox.addEventListener("click", fireClick, false);
		},

		loadStaticEventsTypes: function (aDirPrefId, aType, aIndex, aEventType, aVersion) {
			if (aIndex == 0) {
				var aOrigBox = cardbookElementTools.addGroupbox(aType);
				cardbookElementTools.addCaption(aType, aOrigBox);
			} else {
				var panesView = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.panesView");
				var aOrigBox = document.getElementById(aType + panesView + 'Groupbox');
			}
			
			var aRow = cardbookElementTools.addGridRow(aOrigBox, aType + '_' + aIndex + '_gridRow', {align: 'start'});

			var aPrefImage = document.createXULElement('image');
			aRow.appendChild(aPrefImage);
			aPrefImage.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			if (aEventType[2]) {
				aPrefImage.setAttribute('class', 'cardbookPrefStarClass');
				aPrefImage.setAttribute('haspref', 'true');
			} else {
				aPrefImage.setAttribute('class', 'cardbookNoPrefStarClass');
				aPrefImage.removeAttribute('haspref');
			}

			cardbookElementTools.addTextbox(aRow, aType + '_' + aIndex + '_prefWeightBox', '', {readonly: 'true'});
			if (aVersion === "4.0") {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'false');
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('width', '3');
			} else {
				document.getElementById(aType + '_' + aIndex + '_prefWeightBox').setAttribute('hidden', 'true');
			}
			
			var dateFormat = cardbookRepository.getDateFormat(aDirPrefId, aVersion);
			var myFormattedDate = cardbookRepository.cardbookDates.getFormattedDateForDateString(aEventType[0], dateFormat, cardbookRepository.dateDisplayedFormat);
			var myDate = cardbookRepository.cardbookDates.convertDateStringToDate(aEventType[0], dateFormat);
			var myDateString = cardbookRepository.cardbookDates.convertDateToDateString(myDate, "4.0");
			var myValueTextbox1 = cardbookElementTools.addLabel(aRow, aType + '_' + aIndex + '_typeBox', myFormattedDate, null, {readonly: 'true',
												fieldValue: myDateString + "::" + aEventType[1] + "::" + aEventType[2]});
	
			var myValueTextbox2 = cardbookElementTools.addLabel(aRow, aType + '_' + aIndex + '_valueBox', aEventType[1], null,
											{readonly: 'true', flex: '1',
												fieldValue: myDateString + "::" + aEventType[1] + "::" + aEventType[2]});

			myValueTextbox1.addEventListener("contextmenu", cardbookRichContext.fireTypeContext, false);
			myValueTextbox2.addEventListener("contextmenu", cardbookRichContext.fireTypeContext, false);
			
			function fireClick(event) {
				if (wdw_cardbook) {
					wdw_cardbook.chooseActionTreeForClick(event)
				}
			};
			aRow.addEventListener("click", fireClick, false);
		},

		loadMailPopularity: function (aCard, aReadOnly) {
			var myEmails = [];
			if (aCard.isAList) {
				myEmails.push(aCard.fn.toLowerCase());
			} else {
				for (var i = 0; i < aCard.email.length; i++) {
					myEmails.push(aCard.email[i][0][0].toLowerCase());
				}
			}

			for (var i = 0; i < myEmails.length; i++) {
				var aOrigBox = document.getElementById('mailPopularityGroupbox');

				if (i == 0) {
					cardbookElementTools.addCaption('mailPopularity', aOrigBox);
				}

				var aRow = document.createXULElement('row');
				aOrigBox.appendChild(aRow);
				aRow.setAttribute('id', 'mailPopularity_' + i + '_row');
				aRow.setAttribute('flex', '1');
				aRow.setAttribute('align', 'center');

				if (aReadOnly) {
					var aImage = document.createXULElement('image');
					aRow.appendChild(aImage);
					aImage.setAttribute('id', 'dummyMailPopularityPrefBox_' + i);
					aImage.setAttribute('class', 'cardbookNoPrefStarClass');
				}

				if (cardbookRepository.cardbookMailPopularityIndex[myEmails[i]]) {
					var mailPopularityValue = cardbookRepository.cardbookMailPopularityIndex[myEmails[i]];
				} else {
					var mailPopularityValue = "";
				}
				if (aReadOnly) {
					cardbookElementTools.addTextbox(aRow, 'popularity_' + i + '_Textbox', mailPopularityValue, {readonly: 'true'});
					cardbookElementTools.addTextbox(aRow, 'email_' + i + '_Textbox', myEmails[i], {readonly: 'true'});
				} else {
					cardbookElementTools.addTextbox(aRow, 'popularity_' + i + '_Textbox', mailPopularityValue, {});
					cardbookElementTools.addTextbox(aRow, 'email_' + i + '_Textbox', myEmails[i], {});
				}
			}
		},

		loadStaticList: function (aCard, aFollowLink) {
			var addedCards = [];
			if (aCard.version == "4.0") {
				for (var i = 0; i < aCard.member.length; i++) {
					if (aCard.member[i].startsWith("mailto:")) {
						var email = aCard.member[i].replace("mailto:", "");
						addedCards.push(["", [email.toLowerCase()], ""]);
					} else {
						var uid = aCard.member[i].replace("urn:uuid:", "");
						if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+uid]) {
							var cardFound = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+uid];
							if (cardFound.isAList) {
								addedCards.push([cardbookRepository.cardbookUtils.getName(cardFound), [""], cardFound.dirPrefId+"::"+cardFound.uid]);
							} else {
								addedCards.push([cardbookRepository.cardbookUtils.getName(cardFound), cardFound.emails, cardFound.dirPrefId+"::"+cardFound.uid]);
							}
						}
					}
				}
			} else if (aCard.version == "3.0") {
				var kindCustom = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.kindCustom");
				var memberCustom = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.memberCustom");
				for (var i = 0; i < aCard.others.length; i++) {
					var localDelim1 = aCard.others[i].indexOf(":",0);
					if (localDelim1 >= 0) {
						var header = aCard.others[i].substr(0,localDelim1);
						var trailer = aCard.others[i].substr(localDelim1+1,aCard.others[i].length);
						if (header == memberCustom) {
							if (trailer.startsWith("mailto:")) {
								var email = trailer.replace("mailto:", "");
								addedCards.push(["", [email.toLowerCase()], ""]);
							} else {
								if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")]) {
									var cardFound = cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")];
									if (cardFound.isAList) {
										addedCards.push([cardbookRepository.cardbookUtils.getName(cardFound), [""], cardFound.dirPrefId+"::"+cardFound.uid]);
									} else {
										addedCards.push([cardbookRepository.cardbookUtils.getName(cardFound), cardFound.emails, cardFound.dirPrefId+"::"+cardFound.uid]);
									}
								}
							}
						}
					}
				}
			}

			for (var i = 0; i < addedCards.length; i++) {
				var aOrigBox = document.getElementById('addedCardsGroupbox');

				if (i == 0) {
					cardbookElementTools.addCaption('addedCards', aOrigBox);
				}

				var aRow = document.createXULElement('row');
				aOrigBox.appendChild(aRow);
				aRow.setAttribute('id', 'addedCards_' + i + '_row');
				aRow.setAttribute('flex', '1');
				aRow.setAttribute('align', 'center');

				var aImage = document.createXULElement('image');
				aRow.appendChild(aImage);
				aImage.setAttribute('id', 'dummyListPrefBox_' + i);
				aImage.setAttribute('class', 'cardbookNoPrefStarClass');

				cardbookElementTools.addLabel(aRow, 'email_' + addedCards[i][2] + '_valueBox', addedCards[i][1].join(" "), null, {readonly: 'true'});

				var myCardTextbox = cardbookElementTools.addLabel(aRow, 'fn_' + addedCards[i][2] + '_valueBox', addedCards[i][0], null, {readonly: 'true'});

				myCardTextbox.addEventListener("contextmenu", cardbookRichContext.fireListContext, false);
				
				if (aFollowLink) {
					myCardTextbox.setAttribute('class', 'text-link');
					function fireClick(event) {
						if (wdw_cardbook) {
							wdw_cardbook.chooseActionTreeForClick(event)
						}
					};
					myCardTextbox.addEventListener("click", fireClick, false);
				}

			}
		},

		connectCardsFromChatButton: function(aButton) {
			try {
				var myPopup = document.getElementById(aButton.id + "MenuPopup");
				if (myPopup.childNodes.length == 0) {
					return;
				} else if (myPopup.childNodes.length == 1) {
					myPopup.lastChild.doCommand();
				} else {
					myPopup.openPopup(aButton, 'after_start', 0, 0, false, false);
				}
			}
			catch (e) {
				var errorTitle = "connectCardsFromChatButton";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		addCardToIMPPMenuSubMenu: function(aCard, aMenuName) {
			try {
				if (!document.getElementById(aMenuName)) {
					return;
				}
				var myPopup = document.getElementById(aMenuName);
				var myMenu = document.getElementById(aMenuName.replace("MenuPopup", ""));
				while (myPopup.hasChildNodes()) {
					myPopup.lastChild.remove();
				}
				
				myMenu.disabled = true;
				if (aCard) {
					var telProtocolLine = "";
					try {
						var telProtocolLine = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.tels.0");
					}
					catch(e) {
					}
					var rowNumber = 0;
					if (telProtocolLine != "") {
						var telProtocolLineArray = telProtocolLine.split(':');
						var telLabel = telProtocolLineArray[1];
						var telProtocol = telProtocolLineArray[2];
						var myTels = cardbookRepository.cardbookUtils.getPrefAddressFromCard(aCard, "tel", cardbookRepository.preferIMPPPref);
						for (var i = 0; i < myTels.length; i++) {
							var menuItem = document.createXULElement("menuitem");
							var myRegexp = new RegExp("^" + telProtocol + ":");
							var myAddress = myTels[i].replace(myRegexp, "");
							menuItem.setAttribute("id", rowNumber);
							menuItem.addEventListener("command", function(aEvent) {
									cardbookWindowUtils.openTel(this.value);
									aEvent.stopPropagation();
								}, false);
							menuItem.setAttribute("label", telLabel + ": " + myAddress);
							menuItem.setAttribute("value", myAddress);
							myPopup.appendChild(menuItem);
							rowNumber++;
							myMenu.disabled = false;
						}
					}
					var myIMPPs = cardbookRepository.cardbookUtils.getPrefAddressFromCard(aCard, "impp", cardbookRepository.preferIMPPPref);
					for (var i = 0; i < myIMPPs.length; i++) {
						var serviceProtocol = cardbookRepository.cardbookTypes.getIMPPProtocol([myIMPPs[i]]);
						var serviceLine = [];
						serviceLine = cardbookRepository.cardbookTypes.getIMPPLineForProtocol(serviceProtocol)
						if (serviceLine[0]) {
							var menuItem = document.createXULElement("menuitem");
							var myRegexp = new RegExp("^" + serviceLine[2] + ":");
							var myAddress = myIMPPs[i].replace(myRegexp, "");
							menuItem.setAttribute("id", rowNumber);
							menuItem.addEventListener("command", function(aEvent) {
									cardbookRepository.cardbookUtils.openExternalURL(cardbookRepository.cardbookUtils.formatIMPPForOpenning(this.value));
									aEvent.stopPropagation();
								}, false);
							menuItem.setAttribute("label", serviceLine[1] + ": " + myAddress);
							menuItem.setAttribute("value", serviceLine[2] + ":" + myAddress);
							myPopup.appendChild(menuItem);
							rowNumber++;
							myMenu.disabled = false;
						}
					}
				}
				if (!myPopup.hasChildNodes()) {
					myMenu.disabled=true;
				}
			}
			catch (e) {
				var errorTitle = "addCardToIMPPMenuSubMenu";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		addCardsToCategoryMenuSubMenu: function(aMenuName) {
			try {
				var myPopup = document.getElementById(aMenuName);
				var myMenu = document.getElementById(aMenuName.replace("MenuPopup", ""));
				for (let i = myPopup.childNodes.length; i > 2; --i) {
					myPopup.lastChild.remove();
				}

				var listOfDirPrefId = cardbookWindowUtils.getSelectedCardsDirPrefId();
				var selectedId = cardbookWindowUtils.getSelectedCardsId();
				if (selectedId.length > 0) {
					var myCategoryList = [];
					for (let dirPrefId of listOfDirPrefId) {
						myCategoryList = myCategoryList.concat(cardbookRepository.cardbookAccountsCategories[dirPrefId]);
					}
					myCategoryList = cardbookRepository.cardbookUtils.cleanCategories(myCategoryList);
					cardbookRepository.cardbookUtils.sortArrayByString(myCategoryList,1);
					for (let category of myCategoryList) {
						var item = document.createXULElement("menuitem");
						item.setAttribute("id", category);
						item.setAttribute("type", "checkbox");
						item.setAttribute("class", "menuitem-iconic cardbookCategoryMenuClass");
						if (category in cardbookRepository.cardbookNodeColors && cardbookRepository.useColor != "nothing") {
							item.setAttribute("colorType", 'category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category));
						}
						item.addEventListener("command", function(aEvent) {
								if (this.getAttribute("checked") == "true") {
									wdw_cardbook.addCategoryToSelectedCards(this.id, false);
								} else {
									wdw_cardbook.removeCategoryFromSelectedCards(this.id);
								}
								aEvent.stopPropagation();
							}, false);
						item.setAttribute("label", category);
						var categoryCount = 0;
						for (let id of selectedId) {
							var myCard = cardbookRepository.cardbookCards[id];
							if (myCard.categories.includes(category)) {
								categoryCount++;
							}
						}
						if (categoryCount == 0) {
							item.setAttribute("checked", "false");
							item.setAttribute("disabled", "false");
						} else if (categoryCount == selectedId.length) {
							item.setAttribute("checked", "true");
							item.setAttribute("disabled", "false");
						} else {
							item.setAttribute("checked", "false");
							item.setAttribute("disabled", "true");
						}						
						myPopup.appendChild(item);
					}
				}
			}
			catch (e) {
				var errorTitle = "addCardToCategoryMenuSubMenu";
				Services.prompt.alert(null, errorTitle, e);
			}
		},

		displayColumnsPicker: function () {
			if (document && document.popupNode) {
				var target = document.popupNode;
				// for persistence, save the custom columns state
				if (target.localName == "treecol") {
					let treecols = target.parentNode;
					let nodeList = document.getAnonymousNodes(treecols);
					let treeColPicker;
					for (let i = 0; i < nodeList.length; i++) {
						if (nodeList.item(i).localName == "treecolpicker") {
							treeColPicker = nodeList.item(i);
							break;
						}
					}
					let popup = document.getAnonymousElementByAttribute(treeColPicker, "anonid", "popup");
					treeColPicker.buildPopup(popup);
					popup.openPopup(target, "after_start", 0, 0, true);
					return false;
				}
			}
			return true;
		},

	};
};
