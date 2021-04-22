if ("undefined" == typeof(wdw_cardEdition)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { FormHistory } = ChromeUtils.import("resource://gre/modules/FormHistory.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	XPCOMUtils.defineLazyModuleGetter(this, "PhoneNumber", "chrome://cardbook/content/formautofill/phonenumberutils/PhoneNumber.jsm");

	var cardEditionNotification = {};
	XPCOMUtils.defineLazyGetter(cardEditionNotification, "errorNotifications", () => {
		return new MozElements.NotificationBox(element => {
			element.setAttribute("flex", "1");
			document.getElementById("errorNotificationsHbox").append(element);
		});
	});

	var wdw_cardEdition = {

		contactNotLoaded: true,
		editionFields: [],
		currentAdrId: [],
		emailToAdd: [],
		cardbookeditlists: {},
		workingCard: {},
		cardRegion: "",

		getEmails: function () {
			let emails = [];
			let cardEmails = cardbookWindowUtils.getAllTypes("email", true);
			for (let cardRow of cardEmails) {
				emails.push(cardRow[0][0]);
			}
			return emails;
		},

		searchForOnlineKeyEdit: function () {
			let emails = wdw_cardEdition.getEmails();
			if (emails.length) {
				cardbookEnigmail.searchForOnlineKeyEdit(emails);
			}
		},

		searchForThKeyEdit: function () {
			let emails = wdw_cardEdition.getEmails();
			if (emails.length) {
				cardbookEnigmail.searchForThKeyEdit(emails);
			}
		},

		searchForLocalKeyEdit: function () {
			cardbookWindowUtils.callFilePicker("fileSelectionGPGTitle", "OPEN", "GPG", "", "", wdw_cardEdition.searchForLocalKeyEditNext);
		},

		searchForLocalKeyEditNext: function (aFile) {
			try {
				if (aFile) {
					var params = {};
					params["showError"] = true;
					cardbookRepository.cardbookSynchronization.getFileDataAsync(aFile.path, wdw_cardEdition.searchForLocalKeyEditNext2, params);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("searchForLocalKeyEditNext error : " + e, "Error");
			}
		},

		searchForLocalKeyEditNext2: function (aContent, aParam) {
			try {
				if (aContent) {
					wdw_cardEdition.addKeyToEdit(aContent);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("searchForLocalKeyEditNext2 error : " + e, "Error");
			}
		},
	
		addKeyToEdit: function (aKey) {
			let type = "key";
			let re = /[\n\u0085\u2028\u2029]|\r\n?/g;
			aKey = aKey.replace(/-----(BEGIN|END) PGP PUBLIC KEY BLOCK-----/g, "").trim().replace(re, "\\r\\n");
			let allKeyArray = cardbookWindowUtils.getAllKeys(false);
			allKeyArray = allKeyArray.filter(child => (child.value != "" || child.URI != ""));
			allKeyArray.push({types: [], value: aKey, localURI: "", URI: "", extension: ""});
			cardbookElementTools.deleteRows(type + "ReadWriteGroupbox");
			cardbookWindowUtils.constructDynamicKeysRows(wdw_cardEdition.workingCard.dirPrefId, type, allKeyArray, wdw_cardEdition.workingCard.version);
		},

		displayListTrees: function (aTreeName) {
			var cardsTreeView = {
				get rowCount() { return wdw_cardEdition.cardbookeditlists[aTreeName].length; },
				isContainer: function(idx) { return false },
				canDrop: function(idx) { return true },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					if (column.id == aTreeName + "Uid") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][0];
					}
					else if (column.id == aTreeName + "Name") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][4];
					}
					else if (column.id == aTreeName + "Fn") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][1];
					}
					else if (column.id == aTreeName + "Firstname") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][3];
					}
					else if (column.id == aTreeName + "Lastname") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx][2];
					}
				}
			}
			document.getElementById(aTreeName + 'Tree').view = cardsTreeView;
		},

		displayLists: function (aCard) {
			document.getElementById('searchAvailableCardsInput').value = "";
			document.getElementById('kindTextBox').value = "";
			wdw_cardEdition.cardbookeditlists.availableCards = [];
			wdw_cardEdition.cardbookeditlists.addedCards = [];

			var myMembers = cardbookRepository.cardbookUtils.getMembersFromCard(aCard);
			document.getElementById('kindTextBox').value = myMembers.kind;
			for (let email of myMembers.mails) {
				wdw_cardEdition.addEmailToAdded(email.toLowerCase());
			}
			for (let card of myMembers.uids) {
				wdw_cardEdition.addUidToAdded(card.uid);
			}

			wdw_cardEdition.sortCardsTreeCol('addedCards', null, null);
			wdw_cardEdition.searchAvailableCards();
		},

		sortTrees: function (aEvent, aTreeName) {
			if (aEvent.button != 0) {
				return;
			}
			var target = aEvent.originalTarget;
			if (target.localName == "treecol") {
				wdw_cardEdition.sortCardsTreeCol(aTreeName, target);
			}
		},

		sortCardsTreeCol: function (aTreeName, aColumn, aSelectedList) {
			var myTree = document.getElementById(aTreeName + 'Tree');
			
			// get selected cards
			var listOfUid = {};
			if (!aSelectedList) {
				listOfUid[aTreeName] = wdw_cardEdition.getSelectedCardsForList(myTree);
			} else {
				listOfUid[aTreeName] = aSelectedList;
			}

			var columnName;
			var columnArray;
			var order = myTree.getAttribute("sortDirection") == "ascending" ? 1 : -1;
			
			// if the column is passed and it's already sorted by that column, reverse sort
			if (aColumn) {
				columnName = aColumn.id;
				if (myTree.getAttribute("sortResource") == columnName) {
					order *= -1;
				}
			} else {
				columnName = myTree.getAttribute("sortResource");
			}
			
			switch(columnName) {
				case "availableCardsName":
				case "addedCardsName":
					columnArray=4;
					break;
				case "availableCardsUid":
				case "addedCardsUid":
					columnArray=0;
					break;
				case "availableCardsFn":
				case "addedCardsFn":
					columnArray=1;
					break;
				case "availableCardsLastname":
				case "addedCardsLastname":
					columnArray=2;
					break;
				case "availableCardsFirstname":
				case "addedCardsFirstname":
					columnArray=3;
					break;
			}
			if (wdw_cardEdition.cardbookeditlists[aTreeName]) {
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(wdw_cardEdition.cardbookeditlists[aTreeName], columnArray, order);
			} else {
				return;
			}

			//setting these will make the sort option persist
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);

			wdw_cardEdition.displayListTrees(aTreeName);

			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");

			// select Cards back
			wdw_cardEdition.setSelectedCardsForList(myTree, listOfUid[aTreeName]);
		},

		addUidToAdded: function (aCardUid) {
			var found = false;
			for (var j = 0; j < wdw_cardEdition.cardbookeditlists.addedCards.length; j++) {
				if (wdw_cardEdition.cardbookeditlists.addedCards[j][0] == aCardUid) {
					found = true;
					break;
				}
			}
			if (!found && cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+aCardUid]) {
				var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+aCardUid];
				wdw_cardEdition.cardbookeditlists.addedCards.splice(0, 0, [myCard.uid, myCard.fn, myCard.lastname, myCard.firstname, cardbookRepository.cardbookUtils.getName(myCard), "CARD"]);
			}
		},

		addEmailToAdded: function (aEmail) {
			var found = false;
			for (var j = 0; j < wdw_cardEdition.cardbookeditlists.addedCards.length; j++) {
				if (wdw_cardEdition.cardbookeditlists.addedCards[j][1] == aEmail && wdw_cardEdition.cardbookeditlists.addedCards[j][5] == "EMAIL") {
					found = true;
					break;
				}
			}
			if (!found) {
				var myCard = {};
				cardbookRepository.cardbookUtils.setCardUUID(myCard);
				myCard.fn = aEmail;
				myCard.lastname = "";
				myCard.firstname = "";
				wdw_cardEdition.cardbookeditlists.addedCards.splice(0, 0, [myCard.uid, myCard.fn, myCard.lastname, myCard.firstname, cardbookRepository.cardbookUtils.getName(myCard), "EMAIL"]);
			}
		},

		removeUidFromAdded: function (aCardUid) {
			function removeCardList(element) {
				return (element[0] != aCardUid);
			}
			wdw_cardEdition.cardbookeditlists.addedCards = wdw_cardEdition.cardbookeditlists.addedCards.filter(removeCardList);
		},

		getSelectedCardsForList: function (aTree) {
			var myTreeName = aTree.id.replace("Tree", "");
			var listOfUid = [];
			var numRanges = aTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			for (var i = 0; i < numRanges; i++) {
				aTree.view.selection.getRangeAt(i,start,end);
				for (var j = start.value; j <= end.value; j++){
					listOfUid.push(aTree.view.getCellText(j, aTree.columns.getNamedColumn(myTreeName + 'Uid')));
				}
			}
			return listOfUid;
		},

		setSelectedCardsForList: function (aTree, aListOfUid) {
			var myTreeName = aTree.id.replace("Tree", "");
			for (let i = 0; i < aTree.view.rowCount; i++) {
				for (let j = 0; j < aListOfUid.length; j++) {
					if (aTree.view.getCellText(i, aTree.columns.getNamedColumn(myTreeName + 'Uid')) == aListOfUid[j]) {
						aTree.view.selection.rangedSelect(i,i,true);
						break;
					}
				}
			}
		},

		modifyLists: function (aMenuOrTree) {
			switch (aMenuOrTree.id) {
				case "availableCardsTreeChildren":
					var myAction = "appendlistavailableCardsTree";
					break;
				case "addedCardsTreeChildren":
					var myAction = "deletelistaddedCardsTree";
					break;
				default:
					var myAction = aMenuOrTree.id.replace("Menu", "").replace("Button", "");
					break;
			}
			var myAvailableCardsTree = document.getElementById('availableCardsTree');
			var myAddedCardsTree = document.getElementById('addedCardsTree');
			var myAvailableCards = wdw_cardEdition.getSelectedCardsForList(myAvailableCardsTree);
			var myAddedCards = wdw_cardEdition.getSelectedCardsForList(myAddedCardsTree);
			var emailAction = false;
			switch (myAction) {
				case "appendlistavailableCardsTree":
					var myEmails = document.getElementById('addEmailGroupboxInput').value;
					if (myEmails) {
						emailAction = true;
						let addresses = MailServices.headerParser.parseEncodedHeaderW(myEmails);
						for (let address of addresses) {
							if (address.email.includes("@")) {
								wdw_cardEdition.addEmailToAdded(address.email.toLowerCase());
							}
						}
					} else {
						for (var i = 0; i < myAvailableCards.length; i++) {
							wdw_cardEdition.addUidToAdded(myAvailableCards[i]);
						}
					}
					break;
				case "deletelistaddedCardsTree":
					for (var i = 0; i < myAddedCards.length; i++) {
						wdw_cardEdition.removeUidFromAdded(myAddedCards[i]);
					}
					break;
				default:
					break;
			}
			wdw_cardEdition.sortCardsTreeCol('addedCards', null, myAddedCards);
			if (emailAction) {
				document.getElementById('addEmailGroupboxInput').value = "";
			} else {
				wdw_cardEdition.searchAvailableCards(myAvailableCards);
			}
		},

		searchAvailableCards: function (aSelectedList) {
			function addCardFromLongSearch(aCard) {
				for (let added of wdw_cardEdition.cardbookeditlists.addedCards) {
					if (added[0] == aCard.uid) {
						return;
					}
				}
				if (aCard.uid != document.getElementById('uidTextBox').value) {
					wdw_cardEdition.cardbookeditlists.availableCards.push([aCard.uid, aCard.fn, aCard.lastname, aCard.firstname, cardbookRepository.cardbookUtils.getName(aCard), "CARD"]);
				}
			}
			function addCardFromCategories(aCard) {
				for (let available of wdw_cardEdition.cardbookeditlists.availableCards) {
					if (available[0] == aCard.uid) {
						return;
					}
				}
				for (let added of wdw_cardEdition.cardbookeditlists.addedCards) {
					if (added[0] == aCard.uid) {
						return;
					}
				}
				if (aCard.uid != document.getElementById('uidTextBox').value) {
					wdw_cardEdition.cardbookeditlists.availableCards.push([aCard.uid, aCard.fn, aCard.lastname, aCard.firstname, cardbookRepository.cardbookUtils.getName(aCard), "CARD"]);
				}
			}
			var listOfUid = [];
			if (!aSelectedList) {
				var myTree = document.getElementById('availableCardsTree');
				listOfUid = wdw_cardEdition.getSelectedCardsForList(myTree);
			} else {
				listOfUid = aSelectedList;
			}
			var searchValue = cardbookRepository.makeSearchString(document.getElementById('searchAvailableCardsInput').value);
			wdw_cardEdition.cardbookeditlists.availableCards = [];
			var myCurrentDirPrefId = document.getElementById('dirPrefIdTextBox').value;
			if (myCurrentDirPrefId != "") {
				for (var i in cardbookRepository.cardbookCardLongSearch[myCurrentDirPrefId]) {
					// cards
					if (i.includes(searchValue) || searchValue == "") {
						for (let card of cardbookRepository.cardbookCardLongSearch[myCurrentDirPrefId][i]) {
							addCardFromLongSearch(card);
						}
					}
					// categories
					if (searchValue) {
						for (let category of cardbookRepository.cardbookAccountsCategories[myCurrentDirPrefId]) {
							if (category.toUpperCase().includes(searchValue)) {
								for (let card of cardbookRepository.cardbookDisplayCards[myCurrentDirPrefId+"::categories::"+category].cards) {
									addCardFromCategories(card);
								}
							}
						}
					}
				}
			}
			wdw_cardEdition.sortCardsTreeCol('availableCards', null, listOfUid);
		},

		availableCardsTreeContextShowing: function (aEvent) {
			if (cardbookWindowUtils.displayColumnsPicker()) {
				var myTree = document.getElementById('availableCardsTree');
				var myAvailableCards = wdw_cardEdition.getSelectedCardsForList(myTree);
				if (myAvailableCards.length > 1) {
					return;
				}
				var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
				var myUid = myTree.view.getCellText(cell.row, myTree.columns.getNamedColumn('availableCardsUid'));
				// clean up
				var myPopup = document.getElementById("availableCardsTreeContextMenu");
				var i = 0;
				while (true) {
					if (document.getElementById('appendEmail' + i)) {
						myPopup.removeChild(document.getElementById('appendEmail' + i));
						i++;
					} else {
						break;
					}
				}
				// then add
				if (cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+myUid]) {
					var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+myUid];
					for (var i = 0; i < myCard.email.length; i++) {
						var menuItem = document.createXULElement("menuitem");
						menuItem.setAttribute("id", 'appendEmail' + i);
						menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("appendEmailLabel", [myCard.email[i][0][0]]));
						menuItem.setAttribute("value", myCard.email[i][0][0]);
						menuItem.addEventListener("command", function(aEvent) {
								wdw_cardEdition.addEmailToAdded(this.value.toLowerCase());
								wdw_cardEdition.sortCardsTreeCol('addedCards', null, null);
								aEvent.stopPropagation();
							}, false);
						myPopup.appendChild(menuItem);
					}
				}
			}
		},

		loadCategories: function (aCategoryChecked) {
			let categoryList = cardbookRepository.cardbookAccountsCategories[wdw_cardEdition.workingCard.dirPrefId].concat(aCategoryChecked);
			categoryList = cardbookRepository.cardbookUtils.cleanCategories(categoryList);
			cardbookRepository.cardbookUtils.sortArrayByString(categoryList,1);

			let listRows = document.getElementById('categoriesMenupopup');
			for (let i = listRows.childNodes.length -1; i >= 0; i--) {
				let child = listRows.childNodes[i];
				if (child.tagName != "html:input" && child.tagName != "menuseparator") {
					listRows.removeChild(child);
				}
			}

			for (let category of categoryList) {
				let item = document.createXULElement("menuitem");
				item.setAttribute("class", "menuitem-iconic cardbook-item cardbookCategoryMenuClass");
				item.setAttribute("label", category);
				item.setAttribute("value", category);
				item.setAttribute("type", "checkbox");
				if (category in cardbookRepository.cardbookNodeColors && cardbookRepository.useColor != "nothing") {
					item.setAttribute("colorType", 'category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category));
				}
				if (aCategoryChecked.includes(category)) {
					item.setAttribute("checked", "true");
				}
				listRows.appendChild(item);
			}

			cardbookWindowUtils.updateComplexMenulist('category', 'categoriesMenupopup');
		},

		getCategories: function () {
			let categoryList = document.getElementById("categoriesMenupopup").querySelectorAll("menuitem.cardbook-item[checked]");
			return Array.from(categoryList, cat => cat.getAttribute("value"));
		},

		loadEditionMode: function () {
			document.title = cardbookRepository.extension.localeData.localizeMessage("wdw_cardEdition" + window.arguments[0].editionMode + "Title");
			if (window.arguments[0].editionMode == "ViewResult") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addToAddressbook");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "ViewResultHideCreate") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonDown').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonUp').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "ViewContact" || window.arguments[0].editionMode == "ViewList") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('addressbookMenulistReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookHeader').value = cardbookRepository.extension.localeData.localizeMessage("addressbookHeader");
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('fnTextBox').setAttribute('class', 'indent');
				document.getElementById('categoriesReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('categoriesReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('listReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadOnlyHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteToolsVbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('defaultCardImage').removeAttribute('context');
				document.getElementById('defaultCardImage').removeAttribute('ondblclick');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonDown').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonUp').setAttribute('hidden', 'true');
				var panesView = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.panesView");
				if (panesView == "classical") {
					document.getElementById('modernRows').setAttribute('hidden', 'true');
				} else {
					document.getElementById('classicalRows').setAttribute('hidden', 'true');
				}
				document.getElementById('readWriteTypesVbox').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "EditContact" || window.arguments[0].editionMode == "EditList") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addressbookHeader");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "CreateContact" || window.arguments[0].editionMode == "CreateList") {
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addToAddressbook");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "AddEmail") {
				wdw_cardEdition.emailToAdd = wdw_cardEdition.workingCard.email[0];
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').value = cardbookRepository.extension.localeData.localizeMessage("addToAddressbook");
				document.getElementById('addressbookMenulistReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').removeAttribute('hidden');
				document.getElementById('contactMenulist').removeAttribute('hidden');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('keyReadOnlyHbox').setAttribute('hidden', 'true');
				document.getElementById('keyReadWriteHbox').removeAttribute('hidden');
				document.getElementById('keyReadWriteToolsVbox').removeAttribute('hidden');
				document.getElementById('PreferMailFormatReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('PreferMailFormatReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('classicalRows').setAttribute('hidden', 'true');
				document.getElementById('modernRows').setAttribute('hidden', 'true');
			}
			if (window.arguments[0].cardIn.isAList) {
				document.getElementById('contactGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listGroupbox').removeAttribute('hidden');
				wdw_cardEdition.expandButton(document.getElementById('expandPersImage'), false);
				wdw_cardEdition.expandButton(document.getElementById('expandOrgImage'), false);
				document.getElementById('firstTabSpacer').setAttribute('hidden', 'true');
				document.getElementById('preferDisplayNameCheckBox').setAttribute('hidden', 'true');
			} else {
				document.getElementById('contactGroupbox').removeAttribute('hidden');
				document.getElementById('listGroupbox').setAttribute('hidden', 'true');
				wdw_cardEdition.expandButton(document.getElementById('expandPersImage'), true);
				wdw_cardEdition.expandButton(document.getElementById('expandOrgImage'), true);
				document.getElementById('firstTabSpacer').removeAttribute('hidden');
				document.getElementById('preferDisplayNameCheckBox').removeAttribute('hidden');
			}
			document.getElementById('lastnameTextBox').focus();
			document.getElementById('addressbookMenulistLabel').scrollIntoView();
			wdw_cardEdition.autoComputeFn(document.getElementById('autoComputeFnButton'), cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.autoComputeFn"));
		},

		setFieldsAsDefault: function () {
			let tmpArray = [];
			for (var i = 0; i < wdw_cardEdition.editionFields.length; i++) {
				tmpArray.push(cardbookRepository.cardbookUtils.escapeStringSemiColon(wdw_cardEdition.editionFields[i]));
			}
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.fieldsNameList", cardbookRepository.cardbookUtils.unescapeStringSemiColon(tmpArray.join(";")));
			document.getElementById('fieldsMenupopup').hidePopup();
		},

		loadFieldSelector: function () {
			let fieldList = [];
			fieldList = cardbookRepository.cardbookUtils.getEditionFields();

			cardbookElementTools.deleteRows('fieldsMenupopup');

			let listRows = document.getElementById('fieldsMenupopup');
			for (let field of fieldList) {
				let item = document.createXULElement("menuitem");
				item.setAttribute("class", "menuitem-iconic cardbook-item");
				item.setAttribute("label", field[0]);
				item.setAttribute("value", field[1]);
				item.setAttribute("type", "checkbox");
				if (wdw_cardEdition.editionFields.includes(field[1]) || wdw_cardEdition.editionFields[0] == "allFields") {
					item.setAttribute("checked", "true");
				}
				listRows.appendChild(item);
			}
			let menuseparator = document.createXULElement("menuseparator");
			listRows.appendChild(menuseparator);
			let fieldsButton = document.createXULElement("menuitem");
			fieldsButton.setAttribute("class", "menuitem-iconic");
			fieldsButton.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("fieldsButtonLabel"));
			fieldsButton.addEventListener("command", wdw_cardEdition.setFieldsAsDefault, false);
			listRows.appendChild(fieldsButton);

			cardbookWindowUtils.updateComplexMenulist('fields', 'fieldsMenupopup');
		},

		changeEditionFields: function () {
			wdw_cardEdition.editionFields = [];
			let myMenupopup = document.getElementById('fieldsMenupopup');
			let itemsList = myMenupopup.querySelectorAll("menuitem.cardbook-item[checked]");

			let listRows = document.getElementById('fieldsMenupopup');
			for (let item of itemsList) {
				wdw_cardEdition.editionFields.push(item.getAttribute("value"));
			}
			let readonly = cardbookRepository.cardbookPreferences.getReadOnly(wdw_cardEdition.workingCard.dirPrefId);
			cardbookWindowUtils.display40(wdw_cardEdition.workingCard.version, readonly);
			cardbookWindowUtils.displayDates(wdw_cardEdition.workingCard.version, readonly);
			wdw_cardEdition.loadEditionFields();
		},

		loadEditionFields: function () {
			switch(window.arguments[0].editionMode) {
				case "ViewResult":
				case "ViewResultHideCreate":
				case "ViewContact":
				case "ViewList":
					return;
			}

			function isElementInPref(element) {
				return (wdw_cardEdition.editionFields.includes(element) || wdw_cardEdition.editionFields[0] == "allFields");
			}
			if (isElementInPref("addressbook")) {
				document.getElementById('addressbookMenulistReadWriteGroupbox').removeAttribute('hidden');
			} else {
				document.getElementById('addressbookMenulistReadWriteGroupbox').setAttribute('hidden', 'true');
			}
			if (isElementInPref("categories") || wdw_cardEdition.workingCard.categories.length != 0) {
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
			} else {
				document.getElementById('categoriesReadWriteGroupbox').setAttribute('hidden', 'true');
			}
			if (isElementInPref("note") || wdw_cardEdition.workingCard.note) {
				document.getElementById('noteTab').setAttribute("collapsed", false);
			} else {
				document.getElementById('noteTab').setAttribute("collapsed", true);
			}
			if (isElementInPref("list")) {
				document.getElementById('listTab').setAttribute("collapsed", false);
			} else {
				document.getElementById('listTab').setAttribute("collapsed", true);
			}
			if (isElementInPref("key")) {
				document.getElementById('keyTab').setAttribute("collapsed", false);
			} else {
				document.getElementById('keyTab').setAttribute("collapsed", true);
			}
			if (isElementInPref("fn") || wdw_cardEdition.workingCard.fn) {
				document.getElementById('fnGroupbox').removeAttribute('hidden');
			} else {
				document.getElementById('fnGroupbox').setAttribute('hidden', 'true');
			}

			for (let field of cardbookRepository.allColumns.personal) {
				if (cardbookRepository.dateFields.includes(field) || cardbookRepository.newFields.includes(field)) {
					// already done
					continue;
				}
				if (isElementInPref(field) || wdw_cardEdition.workingCard[field]) {
					document.getElementById(field + 'Row').removeAttribute('hidden');
				} else {
					document.getElementById(field + 'Row').setAttribute('hidden', 'true');
				}
			}
			if (document.getElementById("firstnameRow").hasAttribute('hidden') ||
				document.getElementById("firstnameTextBox").hasAttribute('hidden') ||
				document.getElementById("lastnameRow").hasAttribute('hidden') ||
				document.getElementById("lastnameTextBox").hasAttribute('hidden'))	{
				document.getElementById('cardbookSwitchButtonUp').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonDown').setAttribute('hidden', 'true');
			} else {
				document.getElementById('cardbookSwitchButtonUp').removeAttribute('hidden');
				document.getElementById('cardbookSwitchButtonDown').removeAttribute('hidden');
			}
			if (!wdw_cardEdition.workingCard.isAList) {
				for (let field of cardbookRepository.multilineFields) {
					if (isElementInPref(field) || document.getElementById(field + '_0_valueBox').value) {
						document.getElementById(field + 'Groupbox').removeAttribute('hidden');
					} else {
						document.getElementById(field + 'Groupbox').setAttribute('hidden', 'true');
					}
				}
				for (let field of ['event']) {
					if (isElementInPref(field) || document.getElementById(field + '_0_valueBox').value || document.getElementById(field + '_0_valueDateBox').value) {
						document.getElementById(field + 'Groupbox').removeAttribute('hidden');
					} else {
						document.getElementById(field + 'Groupbox').setAttribute('hidden', 'true');
					}
				}
			}
			for (let type of ['personal', 'org']) {
				for (let i = 0; i < cardbookRepository.customFields[type].length; i++) {
					if (isElementInPref(cardbookRepository.customFields[type][i][0]) || document.getElementById('customField' + i + type + 'TextBox').value) {
						document.getElementById('customField' + i + type + 'Row').removeAttribute('hidden');
					} else {
						document.getElementById('customField' + i + type + 'Row').setAttribute('hidden', 'true');
					}
				}
			}
			var orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
			if (orgStructure) {
				let myOrgStructure = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
				for (let i = 0; i < myOrgStructure.length; i++) {
					if (isElementInPref('org.' + myOrgStructure[i]) || document.getElementById('orgTextBox_' + i).value) {
						document.getElementById('orgRow_' + i).removeAttribute('hidden');
					} else {
						document.getElementById('orgRow_' + i).setAttribute('hidden', 'true');
					}
				}
			} else {
				if (isElementInPref('org') || document.getElementById('orgTextBox_0').value) {
					document.getElementById('orgRow_0').removeAttribute('hidden');
				} else {
					document.getElementById('orgRow_0').setAttribute('hidden', 'true');
				}
			}
			for (let field of ['title', 'role']) {
				if (isElementInPref(field) || wdw_cardEdition.workingCard[field]) {
					document.getElementById(field + 'Row').removeAttribute('hidden');
				} else {
					document.getElementById(field + 'Row').setAttribute('hidden', 'true');
				}
			}
			
			cardbookWindowUtils.updateComplexMenulist('fields', 'fieldsMenupopup');
		},

		setEditionFields: function () {
			let fields = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.fieldsNameList");
			if (fields) {
				wdw_cardEdition.editionFields = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(fields).split(";"));
			} else {
				wdw_cardEdition.editionFields = ["allFields"];
			}
		},

		loadDefaultVersion: function () {
			if (wdw_cardEdition.workingCard.version == "") {
				var myDirPrefId = document.getElementById('addressbookMenulist').value;
				document.getElementById("versionTextBox").value = cardbookRepository.cardbookPreferences.getVCardVersion(myDirPrefId);
				wdw_cardEdition.workingCard.version = document.getElementById("versionTextBox").value;
			} else {
				document.getElementById("versionTextBox").value = wdw_cardEdition.workingCard.version;
			}
		},

		removeContacts: function () {
			document.getElementById('contactMenulist').selectedIndex = 0;
			cardbookElementTools.deleteRows('contactMenupopup');
			wdw_cardEdition.contactNotLoaded = true;
		},

		loadContacts: function () {
			if (wdw_cardEdition.contactNotLoaded) {
				var myPopup = document.getElementById("contactMenupopup");
				var myAddressBookId = document.getElementById('addressbookMenulist').value;
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", "");
				menuItem.setAttribute("value", "");
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				document.getElementById('contactMenulist').selectedIndex = 0;
				var mySortedContacts = [];
				for (let card of cardbookRepository.cardbookDisplayCards[myAddressBookId].cards) {
					if (!card.isAList) {
						mySortedContacts.push([card.fn, card.uid]);
					}
				}
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(mySortedContacts,0,1);
				for (var i = 0; i < mySortedContacts.length; i++) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", mySortedContacts[i][0]);
					menuItem.setAttribute("value", mySortedContacts[i][1]);
					menuItem.setAttribute("class", "menuitem-iconic");
					menuItem.setAttribute("type", "radio");
					myPopup.appendChild(menuItem);
				}
				wdw_cardEdition.contactNotLoaded = false;
			}
		},

		changeAddressbook: function () {
			wdw_cardEdition.removeContacts();
			document.getElementById('dirPrefIdTextBox').value = document.getElementById('addressbookMenulist').value;
			if (window.arguments[0].editionMode == "AddEmail") {
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.workingCard = new cardbookCardParser();
				wdw_cardEdition.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);
			}
			wdw_cardEdition.loadDefaultVersion();

			// keep the current changes
			var myOutCard = new cardbookCardParser();
			wdw_cardEdition.calculateResult(myOutCard);
			// convertion if AB changed
			var myTargetName = cardbookRepository.cardbookPreferences.getName(myOutCard.dirPrefId);
			var myTargetVersion = cardbookRepository.cardbookPreferences.getVCardVersion(myOutCard.dirPrefId);
			var mySourceDateFormat = cardbookRepository.getDateFormat(wdw_cardEdition.workingCard.dirPrefId, cardbookRepository.cardbookPreferences.getVCardVersion(wdw_cardEdition.workingCard.dirPrefId));
			var myTargetDateFormat = cardbookRepository.getDateFormat(myOutCard.dirPrefId, myTargetVersion);
			if (cardbookRepository.cardbookUtils.convertVCard(myOutCard, myTargetName, myTargetVersion, mySourceDateFormat, myTargetDateFormat)) {
				cardbookRepository.writePossibleCustomFields();
			}
			
			wdw_cardEdition.cloneCard(myOutCard, wdw_cardEdition.workingCard);
			myOutCard = null;
			wdw_cardEdition.workingCard.dirPrefId = document.getElementById('addressbookMenulist').value;

			wdw_cardEdition.loadDateFormatLabels();
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
		},

		changeContact: function () {
			var myDirPrefId = document.getElementById('addressbookMenulist').value;
			var myUid = document.getElementById('contactMenulist').value;
			if (myUid) {
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.workingCard = new cardbookCardParser();
				wdw_cardEdition.cloneCard(cardbookRepository.cardbookCards[myDirPrefId+"::"+myUid], wdw_cardEdition.workingCard);
				if (window.arguments[0].editionMode == "AddEmail" ) {
					wdw_cardEdition.workingCard.email.push(wdw_cardEdition.emailToAdd);
				}
			} else {
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.workingCard = new cardbookCardParser();
				wdw_cardEdition.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);
			}
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
		},

		switchLastnameAndFirstname: function () {
			var tmpValue = document.getElementById('lastnameTextBox').value;
			document.getElementById('lastnameTextBox').value = document.getElementById('firstnameTextBox').value;
			document.getElementById('firstnameTextBox').value = tmpValue;
			document.getElementById('lastnameTextBox').focus();
			document.getElementById('lastnameTextBox').dispatchEvent(new Event('input'));
		},

		autoComputeFn: function (aButton, aForce) {
			if ("undefined" == typeof(aForce)) {
				if (!aButton.hasAttribute('autoComputeFn')) {
					aButton.setAttribute('autoComputeFn', 'true');
					aButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("dontAutoComputeFn"));
				} else {
					aButton.removeAttribute('autoComputeFn');
					aButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("autoComputeFn"));
				}
				cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.autoComputeFn", !cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.autoComputeFn"));
			} else {
				if (aForce == true) {
					aButton.setAttribute('autoComputeFn', 'true');
					aButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("dontAutoComputeFn"));
				} else {
					aButton.removeAttribute('autoComputeFn');
					aButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("autoComputeFn"));
				}
			}
		},

		expandButton: function (aButton, aForce) {
			var myGrid = document.getElementById(aButton.id.replace(/^expand/, "").replace(/Image$/, "").toLowerCase() + "Grid");
			if ("undefined" == typeof(aForce)) {
				if (!aButton.getAttribute('expanded')) {
					myGrid.removeAttribute('hidden');
					aButton.setAttribute('expanded', 'true');
				} else {
					myGrid.setAttribute('hidden', 'true');
					aButton.removeAttribute('expanded');
				}
			} else {
				if (aForce == true) {
					myGrid.removeAttribute('hidden');
					aButton.setAttribute('expanded', 'true');
				} else {
					myGrid.setAttribute('hidden', 'true');
					aButton.removeAttribute('expanded');
				}
			}				
		},

		copyAdr: function () {
			var myTempArray = document.popupNode.parentNode.parentNode.id.split('_');
			var myIndex = myTempArray[1];
			var myAdr = cardbookWindowUtils.getTypeForLine("adr", myIndex);
			
			var myResult = cardbookRepository.cardbookUtils.formatAddress(myAdr[0]);
			myResult = document.getElementById('fnTextBox').value + "\n" + myResult;
			cardbookRepository.currentCopiedEntry = [];
			cardbookRepository.currentCopiedEntry.push(["adr", myAdr]);
			var myMessage = cardbookRepository.extension.localeData.localizeMessage("lineCopied");
			cardbookClipboard.clipboardSetText('text/unicode', myResult, myMessage);
		},

		pasteAdr: function () {
			if (cardbookRepository.currentCopiedEntry.length == 0) {
				cardbookRepository.cardbookUtils.formatStringForOutput("clipboardEmpty");
				return;
			}
			var myId = document.popupNode.parentNode.parentNode.id;
			document.getElementById(myId + '_' + '0').value = cardbookRepository.currentCopiedEntry[0][1][0][0].trim();
			document.getElementById(myId + '_' + '1').value = cardbookRepository.currentCopiedEntry[0][1][0][1].trim();
			document.getElementById(myId + '_' + '2').value = cardbookRepository.currentCopiedEntry[0][1][0][2].replace(/\n/g, "\\n").trim();
			document.getElementById(myId + '_' + '3').value = cardbookRepository.currentCopiedEntry[0][1][0][3].trim();
			document.getElementById(myId + '_' + '4').value = cardbookRepository.currentCopiedEntry[0][1][0][4].trim();
			document.getElementById(myId + '_' + '5').value = cardbookRepository.currentCopiedEntry[0][1][0][5].trim();
			document.getElementById(myId + '_' + '6').value = cardbookRepository.currentCopiedEntry[0][1][0][6].trim();
			var myTempArray = document.popupNode.parentNode.parentNode.id.split('_');
			var myIndex = myTempArray[1];
			var myAdr = cardbookWindowUtils.getTypeForLine("adr", myIndex);
			cardbookWindowUtils.openAdrPanel(myAdr, myTempArray);
		},

		unsetWrongValidation: function () {
			cardbookNotifications.setNotification(cardEditionNotification.errorNotifications, "OK");
		},

		validateMailPopularity: function () {
			var limit = 100000;
			var i = 0;
			while (true) {
				if (document.getElementById('mailPopularity_' + i + '_row')) {
					var field = cardbookRepository.extension.localeData.localizeMessage("popularityLabel");
					var data = document.getElementById('popularity_' + i + '_Textbox').value.trim() * 1;
					if (data == "") {
						i++;
						continue;
					} else if (data >=1 && data <= limit) {
						i++;
						continue;
					}
					cardbookNotifications.setNotification(cardEditionNotification.errorNotifications, "validateIntegerMsg", [field, limit, data]);
					return false;
				} else {
					break;
				}
			}
			return true;
		},

		validateDateFields: function () {
			var dateFormat = cardbookRepository.getDateFormat(wdw_cardEdition.workingCard.dirPrefId, wdw_cardEdition.workingCard.version);
			for (var field of cardbookRepository.dateFields) {
				var myValue = document.getElementById(field + 'Datepicker').value.trim();
				if (myValue.length > 0) {
					var isDate = cardbookRepository.cardbookDates.convertDateStringToDate(myValue, dateFormat);
					if (isDate == "WRONGDATE") {
						cardbookNotifications.setNotification(cardEditionNotification.errorNotifications, "dateEntry2Wrong", [myValue, dateFormat]);
						return false;
					}
				}
			}
			var i = 0;
			while (true) {
				if (document.getElementById('event_' + i + '_hbox')) {
					var myEventDate = document.getElementById('event_' + i + '_valueDateBox').value.trim();
					if (myEventDate != "") {
						var isDate = cardbookRepository.cardbookDates.convertDateStringToDate(myEventDate, dateFormat);
						if (isDate == "WRONGDATE") {
							cardbookNotifications.setNotification(cardEditionNotification.errorNotifications, "dateEntry2Wrong", [myEventDate, dateFormat]);
							return false;
						}
					}
					i++;
				} else {
					break;
				}
			}
			return true;
		},

		validateEvents: function () {
			var i = 0;
			while (true) {
				if (document.getElementById('event_' + i + '_hbox')) {
					var myEventDate = document.getElementById('event_' + i + '_valueDateBox').value.trim();
					var myEventName = document.getElementById('event_' + i + '_valueBox').value.trim();
					if (myEventDate != "" && myEventName != "") {
						i++;
						continue;
					} else if (myEventDate == "" && myEventName == "") {
						i++;
						continue;
					} else if (myEventDate == "") {
						cardbookNotifications.setNotification(cardEditionNotification.errorNotifications, "eventDateNull", []);
						return false;
					} else if (myEventName == "") {
						cardbookNotifications.setNotification(cardEditionNotification.errorNotifications, "eventNameNull", []);
						return false;
					}
				} else {
					break;
				}
			}
			return true;
		},

		displayCard: function (aCard) {
			wdw_cardEdition.clearCard();
			var aReadOnly = cardbookRepository.cardbookPreferences.getReadOnly(aCard.dirPrefId);
			cardbookWindowUtils.displayCard(aCard, aReadOnly);
			
			// specific
			document.getElementById('addressbookTextBox').value = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);
			document.getElementById('categoriesTextBox').value = cardbookRepository.cardbookUtils.formatCategories(aCard.categories);
			document.getElementById('photoExtensionTextBox').value = aCard.photo.extension;
			if (!aReadOnly) {
				wdw_cardEdition.loadCategories(aCard.categories);
				cardbookElementTools.loadGender("genderMenupopup", "genderMenulist", wdw_cardEdition.workingCard.gender);
				cardbookWindowUtils.displayPref(aCard.version);
				var dateFormat = cardbookRepository.getDateFormat(wdw_cardEdition.workingCard.dirPrefId, wdw_cardEdition.workingCard.version);
				for (var field of cardbookRepository.dateFields) {
					document.getElementById(field + 'Datepicker').value = cardbookRepository.cardbookDates.getDateStringFromVCardDate(aCard[field], dateFormat);
				}
			} else {
				cardbookWindowUtils.adjustFields();
				document.getElementById('dirPrefIdTextBox').setAttribute('hidden', 'true');
				document.getElementById('uidTextBox').setAttribute('hidden', 'true');
				document.getElementById('versionTextBox').setAttribute('hidden', 'true');
				document.getElementById('othersTextBox').setAttribute('hidden', 'true');
				document.getElementById('photolocalURITextBox').setAttribute('hidden', 'true');
				document.getElementById('photoURITextBox').setAttribute('hidden', 'true');
				document.getElementById('photoExtensionTextBox').setAttribute('hidden', 'true');
			}
			for (let email of wdw_cardEdition.workingCard.emails) {
				if (cardbookRepository.cardbookPreferDisplayNameIndex[email]) {
					document.getElementById('preferDisplayNameCheckBox').setAttribute('checked', 'false');
					break;
				}
			}
		},

		clearCard: function () {
			cardbookWindowUtils.clearCard();
			for (let type of cardbookRepository.multilineFields) {
				cardbookElementTools.deleteRows(type + 'Groupbox');
			}
			cardbookElementTools.deleteRows('eventGroupbox');
			document.getElementById('genderMenulist').selectedIndex = 0;
			wdw_cardEdition.loadCategories([]);
		},

		getOrg: function (aTrimArray) {
			var myOrg = [];
			var result = "";
			var aListRows = document.getElementById('orgRows');
			var i = 0;
			while (true) {
				if (document.getElementById('orgRow_' + i)) {
					myOrg.push(cardbookRepository.cardbookUtils.escapeStringSemiColon(document.getElementById('orgTextBox_' + i).value.trim()));
					i++;
				} else {
					break;
				}
			}
			if (aTrimArray) {
				// trim the array
				for (var i = myOrg.length-1; i >= 0; i--) {
					if (myOrg[i] == "") {
						myOrg.pop();
					} else {
						break;
					}
				}
			}
			result = cardbookRepository.cardbookUtils.unescapeStringSemiColon(myOrg.join(";"));
			return result;
		},

		setDisplayName: function () {
			if (document.getElementById('autoComputeFnButton').hasAttribute('autoComputeFn')) {
				var myNewOrg = wdw_cardEdition.getOrg(false);
				var myNewFn = cardbookRepository.cardbookUtils.getDisplayedNameFromFormula(document.getElementById('dirPrefIdTextBox').value, [document.getElementById('prefixnameTextBox').value.trim(),
																	document.getElementById('firstnameTextBox').value.trim(),
																	document.getElementById('othernameTextBox').value.trim(),
																	document.getElementById('lastnameTextBox').value.trim(),
																	document.getElementById('suffixnameTextBox').value.trim(),
																	document.getElementById('nicknameTextBox').value.trim()],
																	[myNewOrg,
																	document.getElementById('titleTextBox').value.trim(),
																	document.getElementById('roleTextBox').value.trim()]);
				document.getElementById('fnTextBox').value = myNewFn;
				wdw_cardEdition.workingCard.lastname = document.getElementById('lastnameTextBox').value.trim();
				wdw_cardEdition.workingCard.firstname = document.getElementById('firstnameTextBox').value.trim();
				wdw_cardEdition.workingCard.othername = document.getElementById('othernameTextBox').value.trim();
				wdw_cardEdition.workingCard.suffixname = document.getElementById('suffixnameTextBox').value.trim();
				wdw_cardEdition.workingCard.prefixname = document.getElementById('prefixnameTextBox').value.trim();
				wdw_cardEdition.workingCard.nickname = document.getElementById('nicknameTextBox').value.trim();
				wdw_cardEdition.workingCard.org = myNewOrg;
				wdw_cardEdition.workingCard.fn = myNewFn;
			}
		},

		loadDateFormatLabels: function () {
			var dateFormat = cardbookRepository.cardbookDates.getDateFormatLabel(wdw_cardEdition.workingCard.dirPrefId, wdw_cardEdition.workingCard.version);
			myD = cardbookRepository.extension.localeData.localizeMessage("dateFormatsDLabel");
			myM = cardbookRepository.extension.localeData.localizeMessage("dateFormatsMLabel");
			myY = cardbookRepository.extension.localeData.localizeMessage("dateFormatsYLabel");
			for (var field of cardbookRepository.dateFields) {
				if (document.getElementById(field + 'DatepickerLabel')) {
					document.getElementById(field + 'DatepickerLabel').value = cardbookRepository.extension.localeData.localizeMessage(field + "Label") + " (" + dateFormat.replace(/D/g, myD).replace(/M/g, myM).replace(/Y/g, myY) + ")";
				}
			}
		},

		loadCountries: function () {
			var countryList = document.getElementById('adrCountryMenulist');
			var countryPopup = document.getElementById('adrCountryMenupopup');
			cardbookElementTools.loadCountries(countryPopup, countryList, countryList.value, true, false);
		},

		cloneCard: function (aSourceCard, aTargetCard) {
			// we need to keep the list flag as the normal cloneCard function may not find this information
			// for new cards
			cardbookRepository.cardbookUtils.cloneCard(aSourceCard, aTargetCard);
			aTargetCard.isAList = aSourceCard.isAList;
		},

		startDrag: function (aEvent, aTreeChildren) {
			try {
				if (aTreeChildren.id == "availableCardsTreeChildren") {
					var myTree = document.getElementById('availableCardsTree');
				} else if (aTreeChildren.id == "addedCardsTreeChildren") {
					var myTree = document.getElementById('addedCardsTree');
				} else {
					return;
				}
				var myUids = wdw_cardEdition.getSelectedCardsForList(myTree);
				for (var i = 0; i < myUids.length; i++) {
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", myUids[i], i);
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardEdition.startDrag error : " + e, "Error");
			}
		},

		dragCards: function (aEvent, aTreeName) {
			try {
				aEvent.preventDefault();
				for (var i = 0; i < aEvent.dataTransfer.mozItemCount; i++) {
					var types = aEvent.dataTransfer.mozTypesAt(i);
					for (var j = 0; j < types.length; j++) {
						if (types[j] == "text/x-moz-cardbook-id") {
							var myId = aEvent.dataTransfer.mozGetDataAt("text/x-moz-cardbook-id", i);
							if (aTreeName == "availableCardsTree") {
								wdw_cardEdition.removeUidFromAdded(myId);
							} else if (aTreeName == "addedCardsTree") {
								wdw_cardEdition.addUidToAdded(myId);
							} else {
								return;
							}
						}
					}
				}
				wdw_cardEdition.sortCardsTreeCol('addedCards', null, null);
				wdw_cardEdition.searchAvailableCards();
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardEdition.dragCards error : " + e, "Error");
			}
		},

		loadCssRules: function () {
			var myStyleSheet = "chrome://cardbook/content/skin/cardbookEmpty.css";
			var myStyleSheetRuleName = "cardbookEmpty";
			for (let styleSheet of InspectorUtils.getAllStyleSheets(window.document, false)) {
				for (let rule of styleSheet.cssRules) {
					// difficult to find as the sheet as no href 
					if (rule.cssText.includes(myStyleSheetRuleName)) {
						cardbookRepository.deleteCssAllRules(styleSheet);
						cardbookRepository.createMarkerRule(styleSheet, myStyleSheetRuleName);
						for (let category in cardbookRepository.cardbookNodeColors) {
							var color = cardbookRepository.cardbookNodeColors[category];
							cardbookRepository.createCssCategoryRules(styleSheet, 'category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category), color);
						}
						cardbookRepository.reloadCss(myStyleSheet);
						return;
					}
				}
			}
		},

		load: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			cardBookEditionObserver.register();
			cardBookEditionPrefObserver.register();

			wdw_cardEdition.workingCard = new cardbookCardParser();
			wdw_cardEdition.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);

			wdw_cardEdition.loadEditionMode();
			wdw_cardEdition.setEditionFields();
			wdw_cardEdition.changePreviousNext();

			var ABList = document.getElementById('addressbookMenulist');
			var ABPopup = document.getElementById('addressbookMenupopup');
			cardbookElementTools.loadAddressBooks(ABPopup, ABList, wdw_cardEdition.workingCard.dirPrefId, true, false,
													(window.arguments[0].editionMode == "ViewContact" || window.arguments[0].editionMode == "ViewList"), false, false);
			// the dirPrefId may be different from the one loaded in case of a complex search
			wdw_cardEdition.workingCard.dirPrefId = document.getElementById('addressbookMenulist').value;
			
			wdw_cardEdition.loadCssRules();
			wdw_cardEdition.loadDefaultVersion();
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
			wdw_cardEdition.loadDateFormatLabels();
			wdw_cardEdition.loadEditionFields();
			wdw_cardEdition.loadFieldSelector();
			
			wdw_cardEdition.cardRegion = cardbookRepository.cardbookUtils.getCardRegion(wdw_cardEdition.workingCard);
			
			// address panel behaviour
			function firePopupShownAdr(event) {
				//to avoid this would be fired by autocomplete popups
				if (event.target.id == 'adrPanel') {
					document.getElementById('adrStreetTextBox').focus();
				}
			};
			document.getElementById('adrPanel').addEventListener("popupshown", firePopupShownAdr, false);
			// save the information in case of a hiding (especially when another window opens up)
			function firePopupHidingAdr() {
				cardbookWindowUtils.validateAdrPanel();
				cardbookWindowUtils.cancelAdrPanel();
			};
			document.getElementById('adrPanel').addEventListener("popuphiding", firePopupHidingAdr, false);
			function firePopupHiddenAdr(event) {
				//to avoid this would be fired by autocomplete popups
				if (event.target.id == 'adrPanel') {
					var myId = wdw_cardEdition.currentAdrId.join("_");
					document.getElementById(myId).focus();
				}
			};
			document.getElementById('adrPanel').addEventListener("popuphidden", firePopupHiddenAdr, false);
			
			// for temporary photo
			var editionWindow = Services.wm.getMostRecentWindow("CardBook:contactEditionWindow");
			wdw_imageEdition.windowId = editionWindow.windowUtils.outerWindowID;
		},

		saveMailPopularity: function () {
			var i = 0;
			while (true) {
				if (document.getElementById('mailPopularity_' + i + '_row')) {
					var email = document.getElementById('email_' + i + '_Textbox').value.toLowerCase();
					var emailValue = parseInt(document.getElementById('popularity_' + i + '_Textbox').value) || 0;
					cardbookIDBMailPop.updateMailPop(email, emailValue);
					i++;
				} else {
					break;
				}
			}
		},

		savePreferDisplayName: function () {
			var i = 0;
			var save = false;
			while (true) {
				if (document.getElementById('mailPopularity_' + i + '_row')) {
					var email = document.getElementById('email_' + i + '_Textbox').value;
					if (document.getElementById("preferDisplayNameCheckBox").getAttribute("checked") == "true") {
						if (cardbookRepository.cardbookPreferDisplayNameIndex[email]) {
							delete cardbookRepository.cardbookPreferDisplayNameIndex[email];
							save = true;
						}
					} else {
						cardbookRepository.cardbookPreferDisplayNameIndex[email] = 1;
						save = true;
					}
					i++;
				} else {
					break;
				}
			}
			if (save) {
				cardbookRepository.cardbookPreferDisplayName.writePreferDisplayName();
			}
		},

		updateFormHistory: function (aField) {
			var myValue = document.getElementById(aField).value;
			if (myValue == "") {
				return;
			}
			if (FormHistory.enabled) {
				FormHistory.update({
					op: "bump",
					fieldname: aField,
					value: myValue
				}, {handleError(aError) {
						Components.utils.reportError("Saving find to form history failed: " + aError.message);
					}
				});
			}
		},

		updateFormFields: function () {
			// first static fields
			var fieldHistorized = [ 'adrLocality', 'adrRegion', 'adrPostalCode', 'title', 'role' ];
			for (var i in fieldHistorized) {
				wdw_cardEdition.updateFormHistory(fieldHistorized[i] + 'TextBox');
			}
			// then dynamic fields
			var i = 0;
			while (true) {
				if (document.getElementById('orgTextBox_' + i)) {
					wdw_cardEdition.updateFormHistory('orgTextBox_' + i);
					i++;
				} else {
					break;
				}
			}
		},

		calculateResult: function (aCard) {
			wdw_cardEdition.cloneCard(wdw_cardEdition.workingCard, aCard);
			aCard.dirPrefId = document.getElementById('addressbookMenulist').value;

			aCard.version = document.getElementById("versionTextBox").value;
			aCard.categories = wdw_cardEdition.getCategories();
			
			aCard.org = wdw_cardEdition.getOrg(true);
			aCard.title = document.getElementById('titleTextBox').value.trim();
			aCard.role = document.getElementById('roleTextBox').value.trim();

			aCard.fn = document.getElementById('fnTextBox').value.trim();
			
			aCard.lastname = document.getElementById('lastnameTextBox').value.trim();
			aCard.firstname = document.getElementById('firstnameTextBox').value.trim();
			aCard.othername = document.getElementById('othernameTextBox').value.trim();
			aCard.suffixname = document.getElementById('suffixnameTextBox').value.trim();
			aCard.prefixname = document.getElementById('prefixnameTextBox').value.trim();
			aCard.nickname = document.getElementById('nicknameTextBox').value.trim();
			aCard.gender = document.getElementById('genderMenulist').value.trim();

			var dateFormat = cardbookRepository.getDateFormat(document.getElementById('dirPrefIdTextBox').value, document.getElementById('versionTextBox').value);
			for (var field of cardbookRepository.dateFields) {
				aCard[field] = cardbookRepository.cardbookDates.getVCardDateFromDateString(document.getElementById(field + 'Datepicker').value, dateFormat);
			}

			aCard.birthplace = document.getElementById('birthplaceTextBox').value.trim();
			aCard.deathplace = document.getElementById('deathplaceTextBox').value.trim();
			
			aCard.note = document.getElementById('noteTextBox').value.trim();

			aCard.photo = {};
			aCard.photo.types = [];
			aCard.photo.value = "";
			aCard.photo.URI = document.getElementById('photoURITextBox').value;
			aCard.photo.localURI = document.getElementById('photolocalURITextBox').value;
			aCard.photo.extension = document.getElementById('photoExtensionTextBox').value;

			var typesList = [ 'email', 'tel', 'url', 'adr' ];
			for (var type of typesList) {
				aCard[type] = cardbookWindowUtils.getAllTypes(type, true);
			}
			aCard.impp = cardbookWindowUtils.getIMPPTypes();

			var keys = cardbookWindowUtils.getAllKeys(type, true);
			var re = /[\n\u0085\u2028\u2029]|\r\n?/g;
			keys = keys.map(key => {
				key.value = key.value.replace(/-----(BEGIN|END) PGP PUBLIC KEY BLOCK-----/g, "").trim().replace(re, "\\r\\n"); //key.value.replaceAll("\n", "\\n").replaceAll("\r", "\\r");
				return key;
			});
			aCard.key = keys;

			var othersTemp1 = [];
			for (var i in cardbookRepository.customFields) {
				for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
					if (document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox')) {
						var customValue = document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox').value.trim();
						if (customValue) {
							othersTemp1.push(cardbookRepository.customFields[i][j][0] + ":" + customValue);
						}
					}
				}
			}
			var re = /[\n\u0085\u2028\u2029]|\r\n?/;
			var othersTemp3 = [];
			var othersTemp2 = document.getElementById('othersTextBox').value;
			if (othersTemp2) {
				othersTemp3 = othersTemp2.split(re);
			}
			aCard.others = othersTemp1.concat(othersTemp3);

			aCard.others = aCard.others.filter(element => !element.toUpperCase().startsWith(cardbookRepository.defaultEmailFormat));
			if (document.getElementById('PreferMailFormatPopup').value == "1") {
				aCard.others.push(cardbookRepository.defaultEmailFormat + ":FALSE");
			} else if (document.getElementById('PreferMailFormatPopup').value == "2") {
				aCard.others.push(cardbookRepository.defaultEmailFormat + ":TRUE");
			}

			var myPGNextNumber = cardbookRepository.cardbookTypes.rebuildAllPGs(aCard);
			var myEvents = cardbookWindowUtils.getAllEvents(true);
			cardbookRepository.cardbookUtils.addEventstoCard(aCard, myEvents, myPGNextNumber, dateFormat);

			// trying desesperately to find a Fn
			if (aCard.fn == "") {
				cardbookRepository.cardbookUtils.getDisplayedName(aCard, document.getElementById('dirPrefIdTextBox').value, [document.getElementById('prefixnameTextBox').value.trim(),
																document.getElementById('firstnameTextBox').value.trim(),
																document.getElementById('othernameTextBox').value.trim(),
																document.getElementById('lastnameTextBox').value.trim(),
																document.getElementById('suffixnameTextBox').value.trim(),
																document.getElementById('nicknameTextBox').value.trim()],
																[wdw_cardEdition.getOrg(false),
																document.getElementById('titleTextBox').value.trim(),
																document.getElementById('roleTextBox').value.trim()]);
			}
					
			if (aCard.isAList) {
				var myMembers = [];
				for (var i = 0; i < wdw_cardEdition.cardbookeditlists.addedCards.length; i++) {
					if (wdw_cardEdition.cardbookeditlists.addedCards[i][5] == "EMAIL") {
						myMembers.push("mailto:" + wdw_cardEdition.cardbookeditlists.addedCards[i][1]);
					} else {
						myMembers.push("urn:uuid:" + wdw_cardEdition.cardbookeditlists.addedCards[i][0]);
					}
				}
				cardbookRepository.cardbookUtils.addMemberstoCard(aCard, myMembers, document.getElementById('kindTextBox').value.trim());
			}
		},

		getCurrentAccountId: function () {
			if (cardbookRepository.cardbookSearchMode == "SEARCH") {
				return cardbookRepository.cardbookSearchValue;
			} else {
				return cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.accountShown");
			}
		},

		cancelPreviousNext: function () {
			document.getElementById('previousEditionLabel').setAttribute('hidden', 'true');
			document.getElementById('nextEditionLabel').setAttribute('hidden', 'true');
		},

		changePreviousNext: function () {
			var myCurrentAccountId = wdw_cardEdition.getCurrentAccountId();
			wdw_cardEdition.cancelPreviousNext();
			switch(window.arguments[0].editionMode) {
				case "ViewResult":
				case "ViewResultHideCreate":
				case "CreateContact":
				case "CreateList":
				case "AddEmail":
					return;
			}
			for (var i = 0; i < cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards.length; i++) {
				let card = cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards[i];
				if (card.cbid == window.arguments[0].cardIn.cbid) {
					if (i == 0 && i != cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards.length - 1) {
						document.getElementById('previousEditionLabel').setAttribute('hidden', 'true');
						document.getElementById('nextEditionLabel').removeAttribute('hidden');
					} else if (i == 0 && i == cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards.length - 1) {
						wdw_cardEdition.cancelPreviousNext();
					} else if (i == cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards.length - 1) {
						document.getElementById('previousEditionLabel').removeAttribute('hidden');
						document.getElementById('nextEditionLabel').setAttribute('hidden', 'true');
					} else {
						document.getElementById('previousEditionLabel').removeAttribute('hidden');
						document.getElementById('nextEditionLabel').removeAttribute('hidden');
					}
					break;
				};
			}
		},

		changeContact: function (aOrder) {
			var myCurrentAccountId = wdw_cardEdition.getCurrentAccountId();
			window.arguments[0].cardEditionAction = "SAVE";
			wdw_cardEdition.saveFinal(false);
			window.arguments[0].cardEditionAction = "";
			for (var i = 0; i < cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards.length; i++) {
				let card = cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards[i];
				if (card.cbid == window.arguments[0].cardIn.cbid) {
					if (aOrder == "next") {
						window.arguments[0].cardIn = cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards[i+1];
					} else {
						window.arguments[0].cardIn = cardbookRepository.cardbookDisplayCards[myCurrentAccountId].cards[i-1];
					}
					break;
				};
			}
			if (window.arguments[0].cardIn.isAList) {
				var myType = "List";
			} else {
				var myType = "Contact";
			}
			if (cardbookRepository.cardbookPreferences.getReadOnly(window.arguments[0].cardIn.dirPrefId)) {
				window.arguments[0].editionMode = "View" + myType;
			} else {
				window.arguments[0].editionMode = "Edit" + myType;
			}
			window.arguments[0].cardOut = {};
			wdw_cardEdition.load();
		},

		validate: function () {
			if (wdw_cardEdition.validateMailPopularity() &&
				wdw_cardEdition.validateDateFields() &&
				wdw_cardEdition.validateEvents() &&
				window.arguments[0].editionMode != "ViewContact" && 
				window.arguments[0].editionMode != "ViewList") {
				wdw_cardEdition.unsetWrongValidation();
				return true;
			} else {
				return false;
			}
		},

		saveFinal: function (aClose = true) {
			if (wdw_cardEdition.validate()) {
				var myOutCard = new cardbookCardParser();
				wdw_cardEdition.calculateResult(myOutCard);

				wdw_cardEdition.saveMailPopularity();
				wdw_cardEdition.savePreferDisplayName();

				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.updateFormFields();

				// no change, no save
				if (window.arguments[0].editionMode != "ViewResult" && window.arguments[0].editionMode != "ViewResultHideCreate") {
					var cardin = cardbookRepository.cardbookUtils.cardToVcardData(window.arguments[0].cardIn, true);
					var cardout = cardbookRepository.cardbookUtils.cardToVcardData(myOutCard, true);
					if (cardin == cardout) {
						if (aClose) {
							wdw_cardEdition.cancel();
						} else {
							return;
						}
					}
				}

				myOutCard.uid = myOutCard.uid.replace(/^urn:uuid:/i, "");
				if (cardbookRepository.cardbookPreferences.getUrnuuid(myOutCard.dirPrefId)) {
					myOutCard.uid = "urn:uuid:" + myOutCard.uid;
				}
				window.arguments[0].cardOut = myOutCard;
				
				if (window.arguments[0].editionMode == "AddEmail") {
					wdw_cardEdition.cloneCard(window.arguments[0].cardOut, window.arguments[0].cardIn);
				}

				if (window.arguments[0].editionCallback) {
					window.arguments[0].editionCallback(window.arguments[0].cardIn, window.arguments[0].cardOut, window.arguments[0].editionMode);
				}
				cardBookEditionObserver.unregister();
				cardBookEditionPrefObserver.unregister();
				wdw_imageEdition.purgeEditionPhotoTempFile();
				if (aClose) {
					wdw_cardEdition.closeWindow();
				}
			}
		},

		create: function () {
			window.arguments[0].cardEditionAction = "CREATE";
			wdw_cardEdition.saveFinal();
		},

		createAndReplace: function () {
			window.arguments[0].cardEditionAction = "CREATEANDREPLACE";
			wdw_cardEdition.saveFinal();
		},

		save: function () {
			window.arguments[0].cardEditionAction = "SAVE";
			wdw_cardEdition.saveFinal();
		},

		returnKey: function () {
			if (window.arguments[0].editionMode == "ViewResult" || window.arguments[0].editionMode == "ViewResultHideCreate") {
				return;
			} else if (document.getElementById('adrPanel').state == 'open') {
				cardbookWindowUtils.validateAdrPanel();
				return;
			}
			wdw_cardEdition.save();
		},

		cancel: function () {
			window.arguments[0].cardEditionAction = "CANCEL";
			cardBookEditionObserver.unregister();
			cardBookEditionPrefObserver.unregister();
			wdw_cardEdition.closeWindow();
		},

		closeWindow: function () {
			wdw_imageEdition.purgeEditionPhotoTempFile();
			close();
		}

	};

};
