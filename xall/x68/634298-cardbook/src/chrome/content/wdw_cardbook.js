if ("undefined" == typeof(wdw_cardbook)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { PluralForm } = ChromeUtils.import("resource://gre/modules/PluralForm.jsm");
	var { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_cardbook = {
		
		nIntervId : 0,
		currentType : "",
		currentIndex : "",
		currentValue : "",
		currentFirstVisibleRow : 0,
		currentLastVisibleRow : 0,
		currentAccountId : "",
		cutAndPaste : "",
		cardbookrefresh : false,
		writeButtonFired : false,

		setAppMenu: function (remove) {
			if (document.getElementById('cardbookToolbarThMenuButton')) {
				const addOrRemoveListener = remove ? "removeEventListener" : "addEventListener";
				const button = document.getElementById('cardbookToolbarThMenuButton');
				button[addOrRemoveListener]("mousedown", PanelUI);
				button[addOrRemoveListener]("keypress", PanelUI);
			}
		},

		setToolbarCustom: function () {
			var toolbox = document.getElementById("cardbook-toolbox");
			if (toolbox) {
				toolbox.customizeDone = function(aEvent) {
					MailToolboxCustomizeDone(aEvent, "CustomizeCardBookToolbar");
					wdw_cardbook.setAccountsTreeMenulist();
				};
				toolbox.setAttribute('toolbarHighlight','true');
			}
		},

   	showCorrectTabs: function () {
		document.getElementById('mailPopularityTab').setAttribute("collapsed", !cardbookPreferences.getBoolPref("extensions.cardbook.mailPopularityTabView"));
		document.getElementById('technicalTab').setAttribute("collapsed", !cardbookPreferences.getBoolPref("extensions.cardbook.technicalTabView"));
		document.getElementById('vcardTab').setAttribute("collapsed", !cardbookPreferences.getBoolPref("extensions.cardbook.vcardTabView"));
		document.getElementById('cardbookTabbox').selectedTab = document.getElementById("generalTab");
	},

		addTreeColumns: function () {
			if (cardbookRepository.cardbookReorderMode == "NOREORDER") {
				cardbookRepository.cardbookReorderMode = "REORDER";

				var myColumns = cardbookUtils.getAllAvailableColumns("cardstree");
				var myTreecols = document.getElementById('cardsTreecols');
				cardbookElementTools.deleteTreecols(myTreecols);

				var orgStructure = cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
				if (orgStructure != "") {
					var orgArray = cardbookUtils.unescapeArray(cardbookUtils.escapeString(orgStructure).split(";"));
					for (var i = 0; i < orgArray.length; i++) {
						myColumns.push(["org." + i, orgArray[i]]);
					}
				}

				cardbookUtils.sortMultipleArrayByString(myColumns,1,1);
				var myOrdinal = 0;
				for (var i = 0; i < myColumns.length; i++) {
					var myCode = myColumns[i][0];
					var myLabel = myColumns[i][1];
					cardbookElementTools.addTreeSplitter(myTreecols, {ordinal: myOrdinal++});
					if (myCode == "cardIcon") {
						cardbookElementTools.addTreecol(myTreecols, myCode, myLabel, {fixed: 'true', persist: 'width ordinal hidden', style: 'text-align:left', hidden: 'true',
														class: 'treecol-image cardIconHeader', ordinal: myOrdinal++, closemenu: 'none'});
					} else {
						cardbookElementTools.addTreecol(myTreecols, myCode, myLabel, {flex: '1', persist: 'width ordinal hidden', style: 'text-align:left', hidden: 'true',
														class: 'sortDirectionIndicator', sortDirection: 'ascending', ordinal: myOrdinal++, closemenu: 'none'});
					}
				}
			}
			cardbookRepository.cardbookReorderMode = "NOREORDER";
		},

		setAccountsTreeMenulist: function () {
			var accountsShown = cardbookPreferences.getStringPref("extensions.cardbook.accountsShown");
			cardbookElementTools.loadAccountsOrCatsTreeMenu("accountsOrCatsTreeMenupopup", "accountsOrCatsTreeMenulist", accountsShown);
		},

		loadFirstWindow: function () {
			cardBookWindowObserver.register();
			cardBookWindowPrefObserver.register();
			cardBookWindowMutationObserver.register();
			wdw_cardbook.setSyncControl();
			wdw_cardbook.setAppMenu(false);
			wdw_cardbook.setToolbarCustom();
			wdw_cardbook.setNoSearchMode();
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.setAccountsTreeMenulist();
			wdw_cardbook.showCorrectTabs();
			// for the standalone window
			ovl_cardbookLayout.orientPanes();
			ovl_cardbookLayout.resizePanes();
			// in case of opening a new window without having a reload
			wdw_cardbook.loadCssRules();
			wdw_cardbook.addTreeColumns();
			wdw_cardbook.refreshAccountsInDirTree();
			var accountShown = cardbookPreferences.getStringPref("extensions.cardbook.accountShown");
			cardbookTreeUtils.setColumnsStateForAccount(accountShown);
			cardbookTreeUtils.setSelectedAccount(accountShown, wdw_cardbook.currentFirstVisibleRow, wdw_cardbook.currentLastVisibleRow);
			wdw_cardbook.selectAccountOrCatInNoSearch(true);
			// init for undo/redo
			cardbookActions.setUndoAndRedoMenuAndButton();
			wdw_cardbook.refreshWindow();
		},

		syncAccountFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				cardbookSynchronization.syncAccount(myPrefId);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.syncAccountFromAccountsOrCats error : " + e, "Error");
			}
		},

		canDropOnContactBox: function (aEvent) {
			if (cardbookRepository.cardbookSearchMode != "SEARCH" && cardbookRepository.cardbookComplexSearchMode != "SEARCH") {
				var myDirPrefId = cardbookUtils.getAccountId(wdw_cardbook.currentAccountId);
				if (cardbookPreferences.getEnabled(myDirPrefId) && !cardbookPreferences.getReadOnly(myDirPrefId)) {
					aEvent.preventDefault();
				}
			}
		},

		displayAccountOrCat: function (aCardList) {
			var accountsOrCatsTreeView = {
				get rowCount() { return aCardList.length; },
				isContainer: function(row) { return false },
				cycleHeader: function(row) { return false },
				getRowProperties: function(row) {
					var myStyleArray = [];
					if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
						myStyleArray.push("SEARCH");
						if (cardbookRepository.useColor != "nothing") {
							if (aCardList[row].categories.length > 0) {
								var myStyle = "color_" + aCardList[row].dirPrefId;
								for (let category in cardbookRepository.cardbookNodeColors) {
									if (aCardList[row].categories.includes(category)) {
										myStyle = "color_category_" + cardbookUtils.formatCategoryForCss(category);
										break;
									}
								}
								myStyleArray.push(myStyle);
							} else {
								if (cardbookRepository.cardbookNodeColors[cardbookRepository.cardbookUncategorizedCards]) {
									myStyleArray.push("color_category_" + cardbookUtils.formatCategoryForCss(cardbookRepository.cardbookUncategorizedCards));
								} else {
									myStyleArray.push("color_" + aCardList[row].dirPrefId);
								}
							}
						}
					}
					if (aCardList[row].updated || aCardList[row].created) {
						myStyleArray.push("Changed");
					}
					if (aCardList[row].isAList) {
						myStyleArray.push("MailList");
					}
					return myStyleArray.join(" ");
				},
				getCellProperties: function(row, column) {
					return this.getRowProperties(row);
				},
				getCellText: function(row, column){
					if (column.id == "cardIcon") return "";
					else if (column.id == "name") return cardbookUtils.getName(aCardList[row]);
					else if (column.id == "gender") return cardbookRepository.cardbookGenderLookup[aCardList[row].gender];
					else if (column.id == "bday") return cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else if (column.id == "anniversary") return cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else if (column.id == "deathdate") return cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else if (column.id == "rev") return cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else return cardbookUtils.getCardValueByField(aCardList[row], column.id, false);
				}
			}
			document.getElementById('cardsTree').view = accountsOrCatsTreeView;
		},

		setSearchRemoteHbox: function (aDirPrefId) {
			var show = false;
			if (aDirPrefId != "") {
				show = cardbookUtils.isMyAccountRemote(cardbookPreferences.getType(aDirPrefId)) 
							&& !cardbookPreferences.getDBCached(aDirPrefId)
							&& cardbookPreferences.getEnabled(aDirPrefId);
			}
			if (show) {
				document.getElementById('searchRemoteHbox').hidden = false;
				if (cardbookUtils.getAccountId(wdw_cardbook.currentAccountId) != aDirPrefId) {
					if (cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.length != 0) {
						document.getElementById('searchRemoteTextbox').value = cardbookPreferences.getLastSearch(aDirPrefId);
					} else {
						document.getElementById('searchRemoteTextbox').value = "";
						cardbookPreferences.setLastSearch(aDirPrefId, "");
					}
				}
			} else {
				document.getElementById('searchRemoteHbox').hidden = true;
			}
		},
		
		setSearchRemoteHboxOnSyncFinished: function (aDirPrefId) {
			var myTree = document.getElementById('accountsOrCatsTree');
			var mySelectedIndex = myTree.currentIndex;
			if (mySelectedIndex != -1) {
				var mySelectedDirPrefId = myTree.view.getCellText(mySelectedIndex, myTree.columns.getNamedColumn('accountRoot'));
			} else {
				return;
			}
			if (mySelectedDirPrefId == aDirPrefId) {
				if (cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.length != 0) {
					document.getElementById('searchRemoteTextbox').value = cardbookPreferences.getLastSearch(aDirPrefId);
				}
			}
		},
		
		clearCard: function () {
			cardbookWindowUtils.clearCard();
			cardbookElementTools.deleteRowsAllTypes();
			cardbookElementTools.deleteRows('categoriesclassicalRow');
			cardbookElementTools.deleteRows('categoriesmodernRow');
			cardbookWindowUtils.adjustFields();
		},
		
		displayCard: function (aCard) {
			wdw_cardbook.clearCard();
			cardbookWindowUtils.displayCard(aCard, true, true);
			document.getElementById('vcardTextBox').value = cardbookUtils.cardToVcardData(aCard, false);
			document.getElementById('vcardTextBox').setAttribute('readonly', 'true');
			cardbookElementTools.addCategoriesRow(cardbookUtils.sortArrayByString(aCard.categories,1));
			cardbookWindowUtils.adjustFields();
		},
		
		selectAccountOrCatInNoSearch: function (aForceRefresh) {
			wdw_cardbook.setNoSearchMode();
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.setSearchRemoteHbox("");
				return;
			}
			var myTree = document.getElementById('accountsOrCatsTree');
			var mySelectedIndex = myTree.currentIndex;
			if (mySelectedIndex != -1) {
				var myAccountId = myTree.view.getCellText(mySelectedIndex, myTree.columns.getNamedColumn('accountId'));
				var myDirPrefId = myTree.view.getCellText(mySelectedIndex, myTree.columns.getNamedColumn('accountRoot'));
			} else {
				var myAccountId = myTree.view.getCellText(0, myTree.columns.getNamedColumn('accountId'));
				var myDirPrefId = myTree.view.getCellText(0, myTree.columns.getNamedColumn('accountRoot'));
			}
			if (!aForceRefresh) {
				if (wdw_cardbook.currentAccountId == myAccountId) {
					return;
				}
			}
			wdw_cardbook.setSearchRemoteHbox(myDirPrefId);
			wdw_cardbook.currentAccountId = myAccountId;
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.clearCard();
			cardbookPreferences.setStringPref("extensions.cardbook.accountShown", myDirPrefId);
			cardbookTreeUtils.setColumnsStateForAccount(myDirPrefId);
			wdw_cardbook.refreshWindow(myAccountId);
		},

		selectAccountOrCat: function (aAccountOrCat, aListOfCards) {
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.clearAccountOrCat();
				return;
			}
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				wdw_cardbook.startSearch(aListOfCards);
				return;
			}

			// for the colors
			var myCurrentDirPrefId = cardbookUtils.getAccountId(aAccountOrCat);
			wdw_cardbook.setNoComplexSearchMode();
			if (cardbookPreferences.getType(myCurrentDirPrefId) == "SEARCH" && cardbookPreferences.getEnabled(myCurrentDirPrefId)) {
				wdw_cardbook.setComplexSearchMode(myCurrentDirPrefId);
			}
			
			cardbookTreeUtils.setSelectedAccount(aAccountOrCat, wdw_cardbook.currentFirstVisibleRow, wdw_cardbook.currentLastVisibleRow);

			// for the columns
			if (wdw_cardbook.currentAccountId == aAccountOrCat) {
				return;
			}
			wdw_cardbook.currentAccountId = aAccountOrCat;
			cardbookPreferences.setStringPref("extensions.cardbook.accountShown", myCurrentDirPrefId);
			cardbookTreeUtils.setColumnsStateForAccount(myCurrentDirPrefId);
		},

		displaySearch: function (aListOfCards) {
			var myTree = document.getElementById('cardsTree');
			var mySelectedAccount = cardbookRepository.cardbookSearchValue;
			if (cardbookRepository.cardbookDisplayCards[mySelectedAccount]) {
				wdw_cardbook.sortCardsTreeCol();
				if (cardbookRepository.cardbookDisplayCards[mySelectedAccount].cards.length == 1) {
					wdw_cardbook.displayCard(cardbookRepository.cardbookCards[cardbookRepository.cardbookDisplayCards[mySelectedAccount].cards[0].cbid]);
					if (myTree.currentIndex != 0) {
						myTree.view.selection.select(0);
					}
				} else {
					if (aListOfCards) {
						cardbookWindowUtils.setSelectedCards(aListOfCards, myTree.getFirstVisibleRow(), myTree.getLastVisibleRow());
						if (aListOfCards.length == 1) {
							if (cardbookRepository.cardbookCards[aListOfCards[0].cbid]) {
								wdw_cardbook.displayCard(aListOfCards[0]);
							}
						}
					}
				}
			}
		},

		selectCard: function (aEvent) {
			var myTree = document.getElementById('cardsTree');
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			var numberOfSelectedCard = 0;
			var positionOfSelectedCard = 0;
			for (let i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (let k = start.value; k <= end.value; k++) {
					numberOfSelectedCard++;
					positionOfSelectedCard = k;
				}
			}
			if ( numberOfSelectedCard != 1 ) {
				wdw_cardbook.clearCard();
			} else {
				var mySelectedCard = myTree.view.getCellText(positionOfSelectedCard, myTree.columns.getNamedColumn("cbid"));
				if (cardbookRepository.cardbookCards[mySelectedCard]) {
					wdw_cardbook.displayCard(cardbookRepository.cardbookCards[mySelectedCard]);
				} else {
					wdw_cardbook.clearCard();
				}
			}
			if (aEvent) {
				aEvent.stopPropagation();
			}
		},

		changeAddressbookTreeMenu: function () {
			cardbookPreferences.setStringPref("extensions.cardbook.accountsShown", document.getElementById('accountsOrCatsTreeMenulist').value);
			wdw_cardbook.refreshAccountsInDirTree();
			var found = false;
			for (account of cardbookDirTree.visibleData) {
				if (account[4] == wdw_cardbook.currentAccountId) {
					found = true;
					break;
				}
			}
			if (!found) {
				wdw_cardbook.clearAccountOrCat();
				wdw_cardbook.clearCard();
				wdw_cardbook.setSearchRemoteHbox("");
			} else {
				wdw_cardbook.selectAccountOrCatInNoSearch(true);
			}
		},

		clearAccountOrCat: function () {
			wdw_cardbook.displayAccountOrCat([]);
			var myTree = document.getElementById('accountsOrCatsTree');
			myTree.view.selection.clearSelection();
			wdw_cardbook.updateStatusInformation();
		},

		refreshAccountsInDirTree: function() {
			try {
				if (document.getElementById('accountsOrCatsTree')) {
					var myTree = document.getElementById('accountsOrCatsTree');
					wdw_cardbook.currentFirstVisibleRow = myTree.getFirstVisibleRow();
					wdw_cardbook.currentLastVisibleRow = myTree.getLastVisibleRow();
					
					cardbookDirTree.visibleData = cardbookDirTreeUtils.filterTree();
					cardbookDirTreeUtils.expandVisible();
					myTree.view = cardbookDirTree;
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.refreshAccountsInDirTree error : " + e, "Error");
			}
		},

		cancelCard: function () {
			wdw_cardbook.selectCard();
		},

		createContact: function () {
			var myNewCard = new cardbookCardParser();
			wdw_cardbook.createCard(myNewCard, "CreateContact");
		},

		createList: function () {
			var myNewCard = new cardbookCardParser();
			myNewCard.isAList = true;
			wdw_cardbook.createCard(myNewCard, "CreateList");
		},

		createCard: function (aCard, aEditionMode) {
			let myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				let myId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				// to be sure that this accountId is defined : in search mode, it's possible to have weird results
				if (myId != "false") {
					aCard.dirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					let myType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
					let myName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
					if (myName != cardbookRepository.cardbookUncategorizedCards) {
						if (myType == "categories") {
							cardbookRepository.addCategoryToCard(aCard, myName);
						} else if (myType == "org") {
							cardbookRepository.addOrgToCard(aCard, myId);
						}
					}
				} else {
					for (let account of cardbookRepository.cardbookAccounts) {
						if (account[1] && account[5] && account[6] != "SEARCH" && !account[7]) {
							aCard.dirPrefId = account[4];
							break;
						}
					}
				}
			} else {
				return;
			}
			cardbookWindowUtils.openEditionWindow(aCard, aEditionMode);
		},

		editCard: function () {
			var listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			if (listOfSelectedCard.length == 1) {
				var myCard = cardbookWindowUtils.getCardsFromCards()[0];
				var myOutCard = new cardbookCardParser();
				cardbookUtils.cloneCard(myCard, myOutCard);
				if (myOutCard.isAList) {
					var myType = "List";
				} else {
					var myType = "Contact";
				}
				if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					cardbookWindowUtils.openEditionWindow(myOutCard, "View" + myType);
				} else {
					cardbookWindowUtils.openEditionWindow(myOutCard, "Edit" + myType);
				}
			}
		},

		editCardFromCard: function (aCard) {
			if (aCard) {
				var myOutCard = new cardbookCardParser();
				cardbookUtils.cloneCard(aCard, myOutCard);
				if (myOutCard.isAList) {
					var myType = "List";
				} else {
					var myType = "Contact";
				}
				if (cardbookPreferences.getReadOnly(aCard.dirPrefId)) {
					cardbookWindowUtils.openEditionWindow(myOutCard, "View" + myType);
				} else {
					cardbookWindowUtils.openEditionWindow(myOutCard, "Edit" + myType);
				}
			}
		},

		editCardFromList: function () {
			var myCardToDisplay = cardbookRepository.cardbookCards[wdw_cardbook.currentIndex];
			wdw_cardbook.editCardFromCard(myCardToDisplay)
		},

		mergeCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();

				var myArgs = {cardsIn: listOfSelectedCard, cardsOut: [], hideCreate: false, action: ""};
				var myWindow = window.openDialog("chrome://cardbook/content/mergeCards/wdw_mergeCards.xul", "", cardbookRepository.modalWindowParams, myArgs);
				var myTopic = "cardsMerged";
				var myActionId = cardbookActions.startAction(myTopic);
				switch (myArgs.action) {
					case "CREATEANDREPLACE":
						cardbookRepository.deleteCards(myArgs.cardsIn, myActionId);
					case "CREATE":
						cardbookRepository.saveCard({}, myArgs.cardsOut[0], myActionId, true);
						break;
				}
				cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.mergeCards error : " + e, "Error");
			}
		},

		duplicateCards: function () {
			var myTopic = "cardsDuplicated";
			var myActionId = cardbookActions.startAction(myTopic);
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			for (var i = 0; i < listOfSelectedCard.length; i++) {
				var myCard = listOfSelectedCard[i];
				if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					continue;
				}
				var myOutCard = new cardbookCardParser();
				cardbookUtils.cloneCard(myCard, myOutCard);
				myOutCard.fn = myOutCard.fn + " " + cardbookRepository.strBundle.GetStringFromName("fnDuplicatedMessage");
				myOutCard.cardurl = "";
				cardbookUtils.setCardUUID(myOutCard);
				cardbookRepository.saveCard({}, myOutCard, myActionId, false);
			}
			cardbookActions.endAction(myActionId);
		},

		findDuplicatesFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					wdw_cardbook.findDuplicates(myDirPrefId);
				} else {
					return;
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.findDuplicatesFromAccountsOrCats error : " + e, "Error");
			}
		},

		findDuplicates: function (aDirPrefId) {
			try {
				var myArgs = {dirPrefId: aDirPrefId};
				var myWindow = window.openDialog("chrome://cardbook/content/findDuplicates/wdw_findDuplicates.xul", "", cardbookRepository.modalWindowParams, myArgs);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.findDuplicates error : " + e, "Error");
			}
		},

		generateFnFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myAccountId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
					wdw_cardbook.generateFn(myAccountId);
				} else {
					return;
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.findDuplicatesFromAccountsOrCats error : " + e, "Error");
			}
		},

		generateFn: function (aAccountId) {
			try {
				var myDirPrefId = cardbookUtils.getAccountId(aAccountId);
				if (cardbookPreferences.getReadOnly(myDirPrefId)) {
					return;
				}
				var myTargetName = cardbookPreferences.getName(myDirPrefId);
				var myTopic = "displayNameGenerated";
				var myActionId = cardbookActions.startAction(myTopic);
				var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aAccountId].cards));
				var counter = 0;
				for (var i = 0; i < myCards.length; i++) {
					var myCard = myCards[i];
					var myOutCard = new cardbookCardParser();
					cardbookUtils.cloneCard(myCard, myOutCard);
					var myFn = myOutCard.fn;
					cardbookUtils.getDisplayedName(myOutCard, myOutCard.dirPrefId,
														[myOutCard.prefixname, myOutCard.firstname, myOutCard.othername, myOutCard.lastname, myOutCard.suffixname, myOutCard.nickname],
														[myOutCard.org, myOutCard.title, myOutCard.role]);
					if (myFn != myOutCard.fn && myOutCard.fn != "") {
						cardbookRepository.saveCard(myCard, myOutCard, myActionId, false);
						counter++;
					}
				}
				cardbookUtils.formatStringForOutput(myTopic, [myTargetName, counter]);
				cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.generateFn error : " + e, "Error");
			}
		},

		deleteCardsAndValidate: function (aCardList, aMessage) {
			try {
				var confirmTitle = cardbookRepository.strBundle.GetStringFromName("confirmTitle");
				if (aCardList && aCardList.constructor === Array) {
					var listOfSelectedCard = aCardList;
				} else {
					var listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				}
				var cardsCount = listOfSelectedCard.length;
				if (aMessage) {
					var confirmMsg = aMessage;
				} else {
					var confirmMsg = PluralForm.get(cardsCount, cardbookRepository.strBundle.GetStringFromName("selectedCardsDeletionConfirmMessagePF"));
					confirmMsg = confirmMsg.replace("%1", cardsCount);
				}
				if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
					var myTopic = "cardsDeleted";
					var myActionId = cardbookActions.startAction(myTopic, listOfSelectedCard);
					cardbookRepository.currentAction[myActionId].total = listOfSelectedCard.length;
					cardbookRepository.asyncDeleteCards(listOfSelectedCard, myActionId);
					cardbookActions.endAsyncAction(myActionId);
					return true;
				} else {
					return false;
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.deleteCardsAndValidate error : " + e, "Error");
			}
		},

		exportCardsFromAccountsOrCats: function (aMenu) {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
				if (aMenu.id == "cardbookAccountMenuExportToFile" || aMenu.id == "exportCardsToFileFromAccountsOrCats") {
					if (cardbookRepository.cardbookSearchMode === "SEARCH") {
						var defaultFileName = cardbookRepository.cardbookSearchValue + ".vcf";
					} else {
						var myTree = document.getElementById('accountsOrCatsTree');
						var defaultFileName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName')) + ".vcf";
					}
					wdw_cardbook.exportCardsToFile(listOfSelectedCard, defaultFileName);
				} else if (aMenu.id == "cardbookAccountMenuExportToDir" || aMenu.id == "exportCardsToDirFromAccountsOrCats") {
					wdw_cardbook.exportCardsToDir(listOfSelectedCard);
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		exportCardsFromCards: function (aMenu) {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				if (aMenu.id == "exportCardsToFileFromCards" || aMenu.id == "cardbookContactsMenuExportCardsToFile") {
					if (listOfSelectedCard.length == 1) {
						var myTree = document.getElementById('cardsTree');
						var defaultFileName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('fn')) + ".vcf";
					} else {
						var defaultFileName = "export.vcf";
					}
					wdw_cardbook.exportCardsToFile(listOfSelectedCard, defaultFileName);
				} else if (aMenu.id == "exportCardsToDirFromCards" || aMenu.id == "cardbookContactsMenuExportCardsToDir") {
					wdw_cardbook.exportCardsToDir(listOfSelectedCard);
				}
					
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsFromCards error : " + e, "Error");
			}
		},

		exportCardsToFile: function (aListOfSelectedCard, aDefaultFileName) {
			try {
				cardbookWindowUtils.callFilePicker("fileSaveTitle", "SAVE", "EXPORTFILE", aDefaultFileName, "", wdw_cardbook.exportCardsToFileNext, aListOfSelectedCard);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToFile error : " + e, "Error");
			}
		},

		exportCardsToFileNext: function (aFile, aListOfSelectedCard) {
			try {
				if (!(aFile.exists())) {
					aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
				}

				if (cardbookUtils.isFileAlreadyOpen(aFile.path)) {
					cardbookUtils.formatStringForOutput("fileAlreadyOpen", [aFile.leafName]);
					return;
				}

				if (cardbookUtils.getFileNameExtension(aFile.leafName).toLowerCase() == "csv") {
					cardbookSynchronization.writeCardsToCSVFile(aFile.path, aFile.leafName, aListOfSelectedCard);
				} else {
					cardbookSynchronization.writeCardsToFile(aFile.path, aListOfSelectedCard, true);
					if (aListOfSelectedCard.length > 1) {
						cardbookUtils.formatStringForOutput("exportsOKIntoFile", [aFile.leafName]);
					} else {
						cardbookUtils.formatStringForOutput("exportOKIntoFile", [aFile.leafName]);
					}
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToFileNext error : " + e, "Error");
			}
		},

		exportCardsToDir: function (aListOfSelectedCard) {
			try {
				cardbookWindowUtils.callDirPicker("dirSaveTitle", wdw_cardbook.exportCardsToDirNext, aListOfSelectedCard);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToDir error : " + e, "Error");
			}
		},

		exportCardsToDirNext: function (aDirectory, aListOfSelectedCard) {
			try {
				if (aDirectory) {
					if (aDirectory.exists() == false){
						aDirectory.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
					}
	
					if (cardbookUtils.isDirectoryAlreadyOpen(aDirectory.path)) {
						cardbookUtils.formatStringForOutput("directoryAlreadyOpen", [aDirectory.leafName]);
						return;
					}
	
					cardbookSynchronization.writeCardsToDir(aDirectory.path, aListOfSelectedCard, true);

					if (aListOfSelectedCard.length > 1) {
						cardbookUtils.formatStringForOutput("exportsOKIntoDir", [aDirectory.leafName]);
					} else {
						cardbookUtils.formatStringForOutput("exportOKIntoDir", [aDirectory.leafName]);
					}
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.exportCardsToDirNext error : " + e, "Error");
			}
		},

		importCardsFromFile: function () {
			try {
				cardbookWindowUtils.callFilePicker("fileImportTitle", "OPEN", "EXPORTFILE", "", "", wdw_cardbook.importCardsFromFileNext);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromFile error : " + e, "Error");
			}
		},

		importCardsFromFileNext: function (aFile) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myTarget = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				var myDirPrefId = cardbookUtils.getAccountId(myTarget);
				var myDirPrefIdUrl = cardbookPreferences.getUrl(myDirPrefId);
				var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);

				// search if file is already open
				if (aFile.path == myDirPrefIdUrl) {
					cardbookUtils.formatStringForOutput("importNotIntoSameFile");
					return;
				}
				cardbookSynchronization.initMultipleOperations(myDirPrefId);
				cardbookRepository.cardbookFileRequest[myDirPrefId]++;
				wdw_cardbook.bulkOperation();
				var myTopic = "cardsImportedFromFile";
				var myActionId = cardbookActions.startAction(myTopic, [aFile.leafName]);
				var myDirPrefId = cardbookUtils.getAccountId(myTarget);
				if (cardbookUtils.getFileNameExtension(aFile.leafName).toLowerCase() == "csv") {
					cardbookSynchronization.loadCSVFile(aFile, myDirPrefId, myTarget, "WINDOW", "IMPORTFILE", myActionId);
				} else {
					cardbookSynchronization.loadFile(aFile, myDirPrefId, myTarget, "WINDOW", "IMPORTFILE", myActionId);
				}
				cardbookSynchronization.waitForImportFinished(myDirPrefId, myDirPrefIdName);
				cardbookActions.endAsyncAction(myActionId);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromFileNext error : " + e, "Error");
			}
		},

		importCardsFromDir: function () {
			try {
				cardbookWindowUtils.callDirPicker("dirImportTitle", wdw_cardbook.importCardsFromDirNext);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromDir error : " + e, "Error");
			}
		},

		importCardsFromDirNext: function (aDirectory) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myTarget = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				var myDirPrefId = cardbookUtils.getAccountId(myTarget);
				var myDirPrefIdUrl = cardbookPreferences.getUrl(myDirPrefId);
				var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);

				// search if dir is already open
				if (aDirectory.path == myDirPrefIdUrl) {
					cardbookUtils.formatStringForOutput("importNotIntoSameDir");
					return;
				}
				cardbookSynchronization.initMultipleOperations(myDirPrefId);
				cardbookRepository.cardbookDirRequest[myDirPrefId]++;
				wdw_cardbook.bulkOperation();
				var myTopic = "cardsImportedFromDir";
				var myActionId = cardbookActions.startAction(myTopic, [aDirectory.leafName]);
				var myDirPrefId = cardbookUtils.getAccountId(myTarget);
				cardbookSynchronization.loadDir(aDirectory, myDirPrefId, myTarget, "WINDOW", "IMPORTDIR", myActionId);
				cardbookSynchronization.waitForImportFinished(myDirPrefId, myDirPrefIdName);
				cardbookActions.endAsyncAction(myActionId);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.importCardsFromDirNext error : " + e, "Error");
			}
		},

		cutCardsFromAccountsOrCats: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
				wdw_cardbook.copyCards(listOfSelectedCard, "CUT");
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.cutCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		copyCardsFromAccountsOrCats: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
				wdw_cardbook.copyCards(listOfSelectedCard, "COPY");
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.copyCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		cutCardsFromCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				wdw_cardbook.copyCards(listOfSelectedCard, "CUT");
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.cutCardsFromCards error : " + e, "Error");
			}
		},

		copyCardsFromCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				wdw_cardbook.copyCards(listOfSelectedCard, "COPY");
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.copyCardsFromCards error : " + e, "Error");
			}
		},

		copyCards: function (aListOfSelectedCard, aMode) {
			try {
				var listOfSelectedUid = [];
				for (var i = 0; i < aListOfSelectedCard.length; i++) {
					listOfSelectedUid.push(aListOfSelectedCard[i].cbid);
				}
				var myText = listOfSelectedUid.join("@@@@@");
				if (myText) {
					if (listOfSelectedUid.length > 1) {
						var myMessage = cardbookRepository.strBundle.GetStringFromName("contactsCopied");
					} else {
						var myMessage = cardbookRepository.strBundle.GetStringFromName("contactCopied");
					}
					cardbookClipboard.clipboardSetText('text/x-moz-cardbook-id', myText, myMessage);
					if (aMode == "CUT") {
						wdw_cardbook.cutAndPaste = "CUT";
					} else {
						wdw_cardbook.cutAndPaste = "";
					}
					cardbookLog.updateStatusProgressInformation(myMessage);
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.copyCards error : " + e, "Error");
			}
		},

		pasteCards: function () {
			try {
				var myType = "CARDS";
				if (cardbookClipboard.clipboardCanPaste(myType)) {
					var data = cardbookClipboard.clipboardGetData(myType);
					if (data.flavor === "text/x-moz-cardbook-id") {
					var myText = data.data.QueryInterface(Components.interfaces.nsISupportsString).data;

					var myTree = document.getElementById('accountsOrCatsTree');
					var myTarget = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
					var nodeArray = cardbookUtils.escapeStringSemiColon(myTarget).split("::");
					var myDirPrefId = nodeArray[0];
					var myNodeType = nodeArray[1];
					var myNodeName = nodeArray[nodeArray.length-1];
					nodeArray.shift();
					nodeArray.shift();
					var orgNode = cardbookUtils.unescapeStringSemiColon(nodeArray.join(";"));
					var myDirPrefIdType = cardbookPreferences.getType(myDirPrefId);
					var myDirPrefIdEnabled = cardbookPreferences.getEnabled(myDirPrefId);
					var myDirPrefIdReadOnly = cardbookPreferences.getReadOnly(myDirPrefId);
					var myDirPrefIdVCardVersion = cardbookPreferences.getVCardVersion(myDirPrefId);
					var myDirPrefIdDateFormat = cardbookRepository.getDateFormat(myDirPrefId, myDirPrefIdVCardVersion);

					if (myDirPrefIdType !== "SEARCH") {
							if (myDirPrefIdEnabled) {
								if (!myDirPrefIdReadOnly) {
									cardbookRepository.importConflictChoicePersist = false;
									cardbookRepository.importConflictChoice = "overwrite";
									var dataArray = myText.split("@@@@@");
									if (dataArray.length) {
										var myTopic = "cardsPasted";
										var myActionId = cardbookActions.startAction(myTopic);
										var dataLength = dataArray.length
										for (var i = 0; i < dataLength; i++) {
											if (cardbookRepository.cardbookCards[dataArray[i]]) {
												var myCard = cardbookRepository.cardbookCards[dataArray[i]];
												if (cardbookRepository.cardbookSearchMode === "SEARCH") {
													var myTarget = myCard.dirPrefId;
													var myDirPrefId = myCard.dirPrefId;
												}
												if (myDirPrefId == myCard.dirPrefId) {
													if (myNodeType == "categories" && myCard.categories.includes(myNodeName)) {
														cardbookRepository.importConflictChoice = "duplicate";
														var askUser = false;
													} else if (myNodeType == "org" && orgNode == myCard.org) {
														cardbookRepository.importConflictChoice = "duplicate";
														var askUser = false;
													} else if (!cardbookRepository.possibleNodes.includes(myNodeType)) {
														cardbookRepository.importConflictChoice = "duplicate";
														var askUser = false;
													} else {
														cardbookRepository.importConflictChoice = "update";
														var askUser = false;
													}
												} else {
													var askUser = true;
												}
												var mySourceDateFormat = cardbookRepository.getDateFormat(myCard.dirPrefId, myCard.version);
												Services.tm.currentThread.dispatch({ run: function() {
													cardbookSynchronization.importCard(myCard, myTarget, askUser, myDirPrefIdVCardVersion, mySourceDateFormat, myDirPrefIdDateFormat,
														myActionId);
													if (myDirPrefId != myCard.dirPrefId) {
														if (wdw_cardbook.cutAndPaste != "") {
															cardbookRepository.currentAction[myActionId].total++;
															cardbookRepository.asyncDeleteCards([myCard], myActionId);
														}
													}
												}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
											} else {
												cardbookUtils.formatStringForOutput("clipboardWrong");
											}
										}
										wdw_cardbook.cutAndPaste = "";
										cardbookActions.endAsyncAction(myActionId);
									} else {
										cardbookUtils.formatStringForOutput("clipboardEmpty");
									}
								} else {
									var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);
									cardbookUtils.formatStringForOutput("addressbookReadOnly", [myDirPrefIdName]);
								}
							} else {
								var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);
								cardbookUtils.formatStringForOutput("addressbookDisabled", [myDirPrefIdName]);
							}
						}
					}
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.pasteCards error : " + e, "Error");
			}
		},

		bulkOperation: function () {
			var myArgs = {};
			openDialog("chrome://cardbook/content/wdw_bulkOperation.xul", "", cardbookRepository.windowParams, myArgs);
		},

		chooseActionTreeForClick: function (aEvent) {
			wdw_cardbook.setCurrentTypeFromEvent(aEvent);
			// only left click
			if (aEvent.button == 0) {
				if (wdw_cardbook.currentType == "email") {
					wdw_cardbook.emailCardFromTree("to");
				} else if (wdw_cardbook.currentType == "url") {
					wdw_cardbook.openURLFromTree();
				} else if (wdw_cardbook.currentType == "adr") {
					wdw_cardbook.localizeCardFromTree();
				} else if (wdw_cardbook.currentType == "impp") {
					wdw_cardbook.openIMPPFromTree();
				} else if (wdw_cardbook.currentType == "tel") {
					wdw_cardbook.openTelFromTree();
				} else if (wdw_cardbook.currentType == "fn") {
					wdw_cardbook.editCardFromList();
				}
			}
			aEvent.stopPropagation();
		},
		
		chooseActionForKey: function (aEvent) {
			if (aEvent.ctrlKey && !aEvent.shiftKey) {
				switch(aEvent.key) {
					case "k":
					case "K":
						wdw_cardbook.editComplexSearch();
						aEvent.stopPropagation();
						break;
				}
			} else {
				if (aEvent.key == "Enter") {
					wdw_cardbook.returnKey();
					aEvent.stopPropagation();
				}
			}
		},
		
		emailCardFromTree: function (aAction) {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			wdw_cardbook.emailCards(null, [myCard.fn.replace(/,/g, " ").replace(/;/g, " "), wdw_cardbook.currentValue], aAction);
		},
		
		findEmailsFromTree: function () {
			ovl_cardbookFindEmails.findEmails(null, [wdw_cardbook.currentValue]);
		},
		
		findEventsFromTree: function () {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			var myEmail = myCard.email[wdw_cardbook.currentIndex][0][0]
			ovl_cardbookFindEvents.findEvents(null, [myEmail], myEmail, "mailto:" + myEmail, myCard.fn);
		},

		localizeCardFromTree: function () {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			wdw_cardbook.localizeCards(null, [myCard.adr[wdw_cardbook.currentIndex][0]]);
		},

		openURLFromTree: function () {
			wdw_cardbook.openURLCards(null, [wdw_cardbook.currentValue]);
		},

		openIMPPFromTree: function () {
			if (document.getElementById('impp_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
				var myResult = myCard[wdw_cardbook.currentType][wdw_cardbook.currentIndex];
				cardbookWindowUtils.openIMPP(myResult);
			}
		},

		openTelFromTree: function () {
			if (document.getElementById('tel_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				cardbookWindowUtils.openTel(wdw_cardbook.currentValue);
			}
		},

		doubleClickCardsTree: function (aEvent) {
			var myTree = document.getElementById('cardsTree');
			var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
			if (cell.row != -1) {
				wdw_cardbook.chooseActionCardsTree();
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (!cardbookPreferences.getReadOnly(myDirPrefId) && cardbookPreferences.getEnabled(myDirPrefId)) {
					if (cardbookUtils.getAvailableAccountNumber() !== 0) {
						wdw_cardbook.createContact();
					}
				}
			}
		},

		chooseActionCardsTree: function () {
			var preferEmailEdition = cardbookPreferences.getBoolPref("extensions.cardbook.preferEmailEdition");
			if (preferEmailEdition) {
				wdw_cardbook.editCard();
			} else {
				wdw_cardbook.emailCardsFromCards("to");
			}
		},

		// when choosing a menu entry, the command action is also fired
		// so this function is intended not to have two emails sent
		emailCardsFromWriteButton: function (aSource, aAction) {
			var listOfSelectedCard = [];
			if (aSource == "1") {
				wdw_cardbook.writeButtonFired = true;
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
			} else {
				if (wdw_cardbook.writeButtonFired) {
					wdw_cardbook.writeButtonFired = false;
					return;
				}
				listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
				wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
			}
		},

		emailCardsFromAccountsOrCats: function (aAction) {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
			wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
		},

		emailCardsFromCards: function (aAction) {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
		},

		shareCardsByEmailFromAccountsOrCats: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
			wdw_cardbook.shareCardsByEmail(listOfSelectedCard);
		},

		shareCardsByEmailFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			wdw_cardbook.shareCardsByEmail(listOfSelectedCard);
		},

		openURLFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			wdw_cardbook.openURLCards(listOfSelectedCard, null);
		},

		print: function () {
			if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
				var myTree = document.getElementById('cardsTree');
				if (myTree.currentIndex != -1) {
					wdw_cardbook.printFromCards();
				}
			} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					wdw_cardbook.printFromAccountsOrCats();
				}
			}
		},

		printFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			var defaultTitle = "";
			if (listOfSelectedCard.length == 1) {
				defaultTitle = listOfSelectedCard[0].fn;
			}
			wdw_cardbook.openPrintEdition(listOfSelectedCard, defaultTitle);
		},

		printFromAccountsOrCats: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromAccountsOrCats();
			var myTree = document.getElementById('accountsOrCatsTree');
			var defaultTitle = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
			wdw_cardbook.openPrintEdition(listOfSelectedCard, defaultTitle);
		},

		findEmailsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			ovl_cardbookFindEmails.findEmails(listOfSelectedCard, null);
		},

		findEventsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			var myCard = listOfSelectedCard[0];
			ovl_cardbookFindEvents.findEvents([myCard], null, myCard.fn, "mailto:" + myCard.emails[0], myCard.fn);
		},

		localizeCardsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			wdw_cardbook.localizeCards(listOfSelectedCard, null);
		},

		warnEmptyEmailContacts: function(aListOfEmptyFn, aListOfNotEmptyEmails) {
			var result = true;
			if (cardbookPreferences.getBoolPref("extensions.cardbook.warnEmptyEmails")) {
				var warningTitle = cardbookRepository.strBundle.GetStringFromName("warningTitle");
				if (aListOfEmptyFn.length > 1) {
					var warningMsg = cardbookRepository.strBundle.formatStringFromName("emptyEmailsCardsConfirmMessage", [aListOfEmptyFn.join(', ')], 1);
				} else {
					var warningMsg = cardbookRepository.strBundle.formatStringFromName("emptyEmailsCardConfirmMessage", [aListOfEmptyFn.join(', ')], 1);
				}
				var rememberFlag = {value: false};
				var rememberMsg = cardbookRepository.strBundle.GetStringFromName("doNotShowAnymore");
				var result = false;
				if (aListOfNotEmptyEmails.length == 0) {
					var flags = Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_CANCEL;
					var returnButton = Services.prompt.confirmEx(window, warningTitle, warningMsg, flags, "", "", "", rememberMsg, rememberFlag);
				} else {
					var flags = Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING + Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_CANCEL;
					var sendButtonLabel = cardbookRepository.strBundle.GetStringFromName("sendButtonLabel");
					var returnButton = Services.prompt.confirmEx(window, warningTitle, warningMsg, flags, sendButtonLabel, "", "", rememberMsg, rememberFlag);
					if (returnButton == 0) {
						var result = true;
					}
				}
				if (rememberFlag.value) {
					cardbookPreferences.setBoolPref("extensions.cardbook.warnEmptyEmails", false);
				}
			}
			return result;
		},

		emailCards: function (aListOfSelectedCard, aListOfSelectedMails, aMsgField) {
			var useOnlyEmail = cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			var result = {};
			if (aListOfSelectedCard && aListOfSelectedCard.length != 0) {
				result = cardbookUtils.getMimeEmailsFromCardsAndLists(aListOfSelectedCard, useOnlyEmail);
			} else if (aListOfSelectedMails && aListOfSelectedMails.length != 0) {
				result.emptyResults = [];
				result.notEmptyResults = [];
				if (useOnlyEmail) {
					result.notEmptyResults.push(aListOfSelectedMails[1]);
				} else {
					result.notEmptyResults.push(MailServices.headerParser.makeMimeAddress(aListOfSelectedMails[0], aListOfSelectedMails[1]));
				}
			// possbility to send email to nobody for the write button
			} else {
				var msgComposeType = Components.interfaces.nsIMsgCompType;
				var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
				var msgComposeService = MailServices.compose;
				var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
				msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);
				if (params) {
					params.type = msgComposeType.New;
					params.format = msgComposFormat.Default;
					var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
					if (composeFields) {
						params.composeFields = composeFields;
						msgComposeService.OpenComposeWindowWithParams(null, params);
					}
				}
				return;
			}

			var warnCheck = true;
			if (result.emptyResults.length != 0) {
				warnCheck = wdw_cardbook.warnEmptyEmailContacts(result.emptyResults, result.notEmptyResults);
			}
			
			if (result.notEmptyResults.length != 0 && warnCheck) {
				var msgComposeType = Components.interfaces.nsIMsgCompType;
				var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
				var msgComposeService = MailServices.compose;
				var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
				msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);
				if (params) {
					params.type = msgComposeType.New;
					params.format = msgComposFormat.Default;
					var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
					if (composeFields) {
						composeFields[aMsgField] = result.notEmptyResults.join(" , ");
						params.composeFields = composeFields;
						msgComposeService.OpenComposeWindowWithParams(null, params);
					}
				}
			}
		},

		shareCardsByEmail: function (aListOfSelectedCard) {
			if (aListOfSelectedCard.length != 0) {
				var msgComposeType = Components.interfaces.nsIMsgCompType;
				var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
				var msgComposeService = MailServices.compose;
				var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
				msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);
				if (params) {
					params.type = msgComposeType.New;
					params.format = msgComposFormat.Default;
					var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
					if (composeFields) {
						// purge temporary files used :
						// for sharing contacts
						// for attaching vCard files
						var myTmpDir = cardbookUtils.getTempFile();
						myTmpDir.append("cardbook-send-messages");
						if (myTmpDir.exists() && myTmpDir.isDirectory()) {
							myTmpDir.remove(true);
						}
						for (var i = 0; i < aListOfSelectedCard.length; i++) {
							var myCard = aListOfSelectedCard[i];
							var myTempFileName = cardbookUtils.getFreeFileName(myTmpDir.path, myCard.fn, myCard.uid.replace(/^urn:uuid:/i, ""), ".vcf");
							var myTempFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myTempFile.initWithPath(myTmpDir.path);
							myTempFile.append(myTempFileName);
							var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"].createInstance(Components.interfaces.nsIMsgAttachment);
							attachment.contentType = "text/vcard";
							attachment.name = myTempFileName;
							cardbookSynchronization.writeContentToFile(myTempFile.path, cardbookUtils.getvCardForEmail(myCard), "UTF8");
							if (myTempFile.exists() && myTempFile.isFile()) {
								attachment.url = "file:///" + myTempFile.path;
								composeFields.addAttachment(attachment);
							} else {
								cardbookUtils.formatStringForOutput("errorAttachingFile", [myTempFile.path], "Error");
							}
						}
						params.composeFields = composeFields;
						msgComposeService.OpenComposeWindowWithParams(null, params);
					}
				}
			}
		},

		localizeCards: function (aListOfSelectedCard, aListOfSelectedAddresses) {
			var listOfAddresses = [];
			if (aListOfSelectedCard) {
				listOfAddresses = cardbookUtils.getAddressesFromCards(aListOfSelectedCard);
			} else if (aListOfSelectedAddresses) {
				listOfAddresses = JSON.parse(JSON.stringify(aListOfSelectedAddresses));
			}
			
			var localizeEngine = cardbookPreferences.getStringPref("extensions.cardbook.localizeEngine");
			var urlEngine = "";
			if (localizeEngine === "GoogleMaps") {
				urlEngine = "https://www.google.com/maps?q=";
			} else if (localizeEngine === "OpenStreetMap") {
				urlEngine = "https://www.openstreetmap.org/search?query=";
			} else if (localizeEngine === "BingMaps") {
				urlEngine = "https://www.bing.com/maps/?q=";
			} else {
				return;
			}

			for (var i = 0; i < listOfAddresses.length; i++) {
				var url = urlEngine + cardbookUtils.undefinedToBlank(listOfAddresses[i][2]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookUtils.undefinedToBlank(listOfAddresses[i][3]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookUtils.undefinedToBlank(listOfAddresses[i][4]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookUtils.undefinedToBlank(listOfAddresses[i][5]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookUtils.undefinedToBlank(listOfAddresses[i][6]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+");
				cardbookWindowUtils.openURL(url);
			}
		},

		openURLCards: function (aListOfSelectedCard, aListOfSelectedURLs) {
			var listOfURLs = [];
			if (aListOfSelectedCard) {
				listOfURLs = cardbookUtils.getURLsFromCards(aListOfSelectedCard);
			} else if (aListOfSelectedURLs) {
				listOfURLs = JSON.parse(JSON.stringify(aListOfSelectedURLs));
			}
			
			for (var i = 0; i < listOfURLs.length; i++) {
				cardbookWindowUtils.openURL(listOfURLs[i]);
			}
		},

		sortTrees: function (aEvent) {
			if (aEvent.button != 0) {
				return;
			}
			var target = aEvent.originalTarget;
			if (target.localName == "treecol") {
				wdw_cardbook.sortCardsTreeCol(target);
			} else {
				wdw_cardbook.selectCard(aEvent);
			}
		},

		sortCardsTreeCol: function (aColumn) {
			var myTree = document.getElementById('cardsTree');
			var myFirstVisibleRow = myTree.getFirstVisibleRow();
			var myLastVisibleRow = myTree.getLastVisibleRow();

			// get selected cards
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();

			var columnName;
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
			
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				var mySelectedAccount = cardbookRepository.cardbookSearchValue;
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var mySelectedAccount = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn("accountId"));
				} else {
					return;
				}
			}
			if (cardbookRepository.cardbookDisplayCards[mySelectedAccount]) {
				cardbookUtils.sortCardsTreeArrayByString(cardbookRepository.cardbookDisplayCards[mySelectedAccount].cards, columnName, order);
			} else {
				return;
			}

			//setting these will make the sort option persist
			var myTree = document.getElementById('cardsTree');
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);
			
			wdw_cardbook.displayAccountOrCat(cardbookRepository.cardbookDisplayCards[mySelectedAccount].cards);
			
			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");

			// select Cards back
			cardbookUtils.sortCardsTreeArrayByString(listOfSelectedCard, columnName, order);
			cardbookWindowUtils.setSelectedCards(listOfSelectedCard, myFirstVisibleRow, myLastVisibleRow);
		},

		startDrag: function (aEvent) {
			function CardBookDataProvider() {}
			CardBookDataProvider.prototype = {
				QueryInterface: ChromeUtils.generateQI([Components.interfaces.nsIFlavorDataProvider]),
			
				getFlavorData: function(aTransferable, aFlavor, aData, aDataLen) {
					//don't know why, this function is never called 
					// if (aFlavor == 'application/x-moz-file-promise') {
					// 	var primitive = {};
					// 	aTransferable.getTransferData("text/vcard", primitive, {});
					// 	var vCard = primitive.value.QueryInterface(Components.interfaces.nsISupportsString);
					// 	aTransferable.getTransferData("application/x-moz-file-promise-dest-filename", primitive, {});
					// 	var leafName = primitive.value.QueryInterface(Components.interfaces.nsISupportsString).data;
					// 	aTransferable.getTransferData("application/x-moz-file-promise-dir", primitive, {});
					// 	var localFile = primitive.value.QueryInterface(Components.interfaces.nsIFile).clone();
					// 	localFile.append(leafName);
					// 	var ofStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
					// 	ofStream.init(localFile, -1, -1, 0);
					// 	var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
					// 	converter.init(ofStream, null);
					// 	converter.writeString(vCard);
					// 	converter.close();
					// 	// cardbookSynchronization.writeContentToFile(localFile.path, vCard, "UTF8");
					// }
				}
			};
			
			var aTreeChildren = aEvent.target;
			var listOfUid = [];
			var myCount = 0;
			var useOnlyEmail = cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			if (aTreeChildren.id == "cardsTreeChildren") {
				var myTree = document.getElementById('cardsTree');
				var numRanges = myTree.view.selection.getRangeCount();
				var start = new Object();
				var end = new Object();
				for (var i = 0; i < numRanges; i++) {
					myTree.view.selection.getRangeAt(i,start,end);
					for (var j = start.value; j <= end.value; j++){
						var myId = myTree.view.getCellText(j, myTree.columns.getNamedColumn('cbid'));
						listOfUid.push(myId);
						var myCard = cardbookRepository.cardbookCards[myId];
						var vCard = encodeURIComponent(cardbookUtils.getvCardForEmail(myCard));
						var emails = cardbookUtils.getMimeEmailsFromCardsAndLists([myCard], useOnlyEmail);
						aEvent.dataTransfer.mozSetDataAt("text/vcard", vCard, myCount);
						aEvent.dataTransfer.mozSetDataAt("text/unicode", emails.notEmptyResults.join(" , "), myCount);
						aEvent.dataTransfer.mozSetDataAt("text/x-moz-address", emails.notEmptyResults.join(" , "), myCount);
						aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", myId, myCount);
						aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-dest-filename", myCard.fn + ".vcf", myCount);
						aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-url","data:text/vcard," + vCard, myCount);
						aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise", new CardBookDataProvider(), myCount);
						myCount++;
					}
				}
			} else if (aTreeChildren.id == "accountsOrCatsTreeChildren") {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookRepository.cardbookSearchMode === "SEARCH") {
					var myAccountPrefId = cardbookRepository.cardbookSearchValue;
				} else {
					var myAccountPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				}
				for (let card of cardbookRepository.cardbookDisplayCards[myAccountPrefId].cards) {
					var myId = card.cbid;
					listOfUid.push(myId);
					var vCard = encodeURIComponent(cardbookUtils.getvCardForEmail(card));
					var emails = cardbookUtils.getMimeEmailsFromCardsAndLists([card], useOnlyEmail);
					aEvent.dataTransfer.mozSetDataAt("text/vcard", vCard, myCount);
					aEvent.dataTransfer.mozSetDataAt("text/unicode", emails.notEmptyResults.join(" , "), myCount);
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-address", emails.notEmptyResults.join(" , "), myCount);
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", myId, myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-dest-filename", card.fn + ".vcf", myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-url","data:text/vcard," + vCard, myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise", new CardBookDataProvider(), myCount);
					myCount++;
				}
			}
			
			// add a little image
			var myCanvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			var myContext = myCanvas.getContext('2d');
			var myImage = new Image();
			var myIconMaxSize = 26;
			var myIconMaxNumber = 5;
			myCanvas.id = 'dragCanvas';
			myCanvas.height = myIconMaxSize;
			// need to know the canvas size before
			if (listOfUid.length >= myIconMaxNumber) {
				var myLength = myIconMaxNumber;
			} else {
				var myLength = listOfUid.length;
			}
			myCanvas.width = (myLength + 1) * myIconMaxSize;
			// concatenate images
			for (var i = 0; i < myLength; i++) {
				var myId = listOfUid[i];
				var myPhoto = cardbookRepository.cardbookCards[myId].photo.localURI;
				if (myPhoto) {
					myImage.src = myPhoto;
				} else {
					myImage.src = "chrome://cardbook/skin/missing_photo_200_214.png";
				}
				myContext.drawImage(myImage, i*myIconMaxSize, 0, myIconMaxSize, myIconMaxSize);
			}
			if (listOfUid.length > myIconMaxNumber) {
				// Concatenate a triangle
				var path=new Path2D();
				path.moveTo(myIconMaxSize*myIconMaxNumber,0);
				path.lineTo(myIconMaxSize*(myIconMaxNumber+1),myIconMaxSize/2);
				path.lineTo(myIconMaxSize*myIconMaxNumber,myIconMaxSize);
				myContext.fill(path);
			}
			aEvent.dataTransfer.setDragImage(myCanvas, 0, 0);
		},
		
		dragCards: function (aEvent) {
			var aTargetObject = aEvent.target;
			if (aTargetObject.id == "cardsTreeChildren" || aTargetObject.id == "rightPaneUpHbox") {
				var myTarget = wdw_cardbook.currentAccountId;
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
				var myTarget = myTree.view.getCellText(cell.row, myTree.columns.getNamedColumn('accountId'));
				// outside the address books
				if (myTarget == "false") {
					return;
				}
			}
			var nodeArray = cardbookUtils.escapeStringSemiColon(myTarget).split("::");
			var myDirPrefId = nodeArray[0];
			var myNodeType = nodeArray[1];
			var myNodeName = nodeArray[nodeArray.length-1];
			nodeArray.shift();
			nodeArray.shift();
			var orgNode = cardbookUtils.unescapeStringSemiColon(nodeArray.join(";"));

			var myDirPrefIdVCardVersion = cardbookPreferences.getVCardVersion(myDirPrefId);
			var myDirPrefIdDateFormat = cardbookRepository.getDateFormat(myDirPrefId, myDirPrefIdVCardVersion);
			cardbookRepository.importConflictChoicePersist = false;
			cardbookRepository.importConflictChoice = "overwrite";
			aEvent.preventDefault();
			var myTopic = "cardsDragged";
			var myActionId = cardbookActions.startAction(myTopic);
			for (var i = 0; i < aEvent.dataTransfer.mozItemCount; i++) {
				var types = aEvent.dataTransfer.mozTypesAt(i);
				for (var j = 0; j < types.length; j++) {
					if (types[j] == "text/x-moz-cardbook-id") {
						var myId = aEvent.dataTransfer.mozGetDataAt("text/x-moz-cardbook-id", i);
						var myCard = cardbookRepository.cardbookCards[myId];
						if (myDirPrefId == myCard.dirPrefId) {
							if (myNodeType == "categories" && myCard.categories.includes(myNodeName)) {
								continue;
							} else if (myNodeType == "org" && orgNode == myCard.org) {
								continue;
							} else if (!cardbookRepository.possibleNodes.includes(myNodeType)) {
								continue;
							} else {
								cardbookRepository.importConflictChoice = "update";
								var askUser = false;
							}
						} else {
							var askUser = true;
						}
						var mySourceDateFormat = cardbookRepository.getDateFormat(myCard.dirPrefId, myCard.version);
						Services.tm.currentThread.dispatch({ run: function() {
							cardbookSynchronization.importCard(myCard, myTarget, askUser, myDirPrefIdVCardVersion, mySourceDateFormat, myDirPrefIdDateFormat,
																myActionId);
							if (myDirPrefId != myCard.dirPrefId) {
								if (!aEvent.ctrlKey) {
									cardbookRepository.currentAction[myActionId].total++;
									cardbookRepository.asyncDeleteCards([myCard], myActionId);
								}
							}
						}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
					} else if (types[j] == "application/x-moz-file") {
						var myFile1 = aEvent.dataTransfer.mozGetDataAt("application/x-moz-file", i);
						var myFile = myFile1.QueryInterface(Components.interfaces.nsIFile);
						if (cardbookUtils.getFileExtension(myFile.path).toLowerCase() == "vcf" ) {
							var myDirPrefId = cardbookUtils.getAccountId(myTarget);
							cardbookSynchronization.loadFile(myFile, myDirPrefId, myTarget, "WINDOW", "IMPORTFILE", myActionId);
						}
					}
				}
			}
			cardbookActions.endAsyncAction(myActionId);
			aEvent.stopPropagation();
		},

		editComplexSearch: function () {
			wdw_cardbook.addAddressbook("search");
		},

		searchRemote: function () {
			try {
				var myValue = document.getElementById('searchRemoteTextbox').value;
				if (myValue == "") {
					return;
				}
				var myTree = document.getElementById('accountsOrCatsTree');
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
					return;
				}
				cardbookPreferences.setLastSearch(myPrefId, myValue);
				cardbookSynchronization.searchRemote(myPrefId, myValue);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.searchRemote error : " + e, "Error");
			}
		},

		startSearch: function (aListOfCards) {
			wdw_cardbook.setSearchRemoteHbox("");
			wdw_cardbook.setSearchMode();
			var listOfSelectedCard = [];
			if (!(aListOfCards)) {
				listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			} else {
				listOfSelectedCard = aListOfCards;
			}
			
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.clearCard();
			cardbookRepository.cardbookSearchValue = cardbookRepository.makeSearchString(document.getElementById('cardbookSearchInput').value);

			var myRegexp = new RegExp(cardbookRepository.cardbookSearchValue.replace("*", "(.*)"), "i");
			cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue] = {modified: 0, cards: []};
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && account[6] != "SEARCH") {
					var myDirPrefId = account[4];
					for (var j in cardbookRepository.cardbookCardLongSearch[myDirPrefId]) {
						if (cardbookRepository.cardbookSearchValue == "" || j.search(myRegexp) != -1) {
							for (let card of cardbookRepository.cardbookCardLongSearch[myDirPrefId][j]) {
								cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].cards.push(card);
								cardbookRepository.addCardToDisplayModified(card, cardbookRepository.cardbookSearchValue);
							}
						}
					}
				}
			}
			// need to verify that the selected cards are always found
			var myListOfSelectedCards = [];
			for (var i = 0; i < listOfSelectedCard.length; i++) {
				// selected cards may have been deleted
				if (cardbookRepository.cardbookCards[listOfSelectedCard[i].cbid]) {
					var myCard = listOfSelectedCard[i];
					if (cardbookRepository.getLongSearchString(myCard).indexOf(cardbookRepository.cardbookSearchValue) >= 0) {
						myListOfSelectedCards.push(myCard);
					}
				}
			}
			wdw_cardbook.displaySearch(myListOfSelectedCards);
		},

		displayBirthdayList: function() {
			if (cardbookRepository.cardbookBirthdayPopup == 0) {
				cardbookRepository.cardbookBirthdayPopup++;
				var MyWindows = window.openDialog("chrome://cardbook/content/birthdays/wdw_birthdayList.xul", "", cardbookRepository.modalWindowParams);
				cardbookRepository.cardbookBirthdayPopup--;
			}
		},
	
		displaySyncList: function() {
			var MyWindows = window.openDialog("chrome://cardbook/content/birthdays/wdw_birthdaySync.xul", "", cardbookRepository.modalWindowParams);
		},

		setSyncControl: function () {
			if (wdw_cardbook.nIntervId == 0) {
				
				wdw_cardbook.nIntervId = setInterval(() => {
                    wdw_cardbook.windowControlShowing();
                }, 1000);
			}
		},

		setComplexSearchMode: function (aDirPrefId) {
			wdw_cardbook.setNoSearchMode();
			cardbookRepository.cardbookComplexSearchMode = "SEARCH";
			cardbookRepository.cardbookComplexSearchPrefId = aDirPrefId;
		},

		setSearchMode: function () {
			// for the navigation
			document.getElementById('cardbookSearchInput').setAttribute('tabindex', '1');
			document.getElementById('cardsTree').setAttribute('tabindex', '2');
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.currentAccountId = "";
			cardbookRepository.cardbookSearchMode = "SEARCH";
		},

		setNoComplexSearchMode: function () {
			cardbookRepository.cardbookComplexSearchMode = "NOSEARCH";
			cardbookRepository.cardbookComplexSearchPrefId = "";
		},

		setNoSearchMode: function () {
			// in search mode the next field after the search textbox is cardsTree
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').removeAttribute('tabindex');
			}
			document.getElementById('cardsTree').removeAttribute('tabindex');
			cardbookRepository.cardbookSearchMode = "NOSEARCH";
			cardbookRepository.cardbookSearchValue = "";
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').value = "";
				document.getElementById('cardbookSearchInput').placeholder = cardbookRepository.strBundle.GetStringFromName("cardbookSearchInputDefault");
			}
		},

		openLogEdition: function () {
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				var windowsList = Services.wm.getEnumerator("CardBook:logEditionWindow");
				var found = false;
				while (windowsList.hasMoreElements()) {
					var myWindow = windowsList.getNext();
					myWindow.focus();
					found = true;
					break;
				}
				if (!found) {
					var myWindow = window.openDialog("chrome://cardbook/content/wdw_logEdition.xul", "", cardbookRepository.windowParams);
				}
			}
		},

		openPrintEdition: function (aListOfCards, aTitle) {
			var statusFeedback = Components.classes["@mozilla.org/messenger/statusfeedback;1"].createInstance();
			statusFeedback = statusFeedback.QueryInterface(Components.interfaces.nsIMsgStatusFeedback);
			var myArgs = {listOfCards: aListOfCards, title: aTitle, feedback: statusFeedback, doPrintPreview: true};
			var printEngineWindow = window.openDialog("chrome://cardbook/content/print/wdw_cardbookPrint.xul", "", cardbookRepository.windowParams, myArgs);
		},

		addAddressbook: function (aAction, aDirPrefId) {
			var myArgs = {action: aAction, dirPrefId: aDirPrefId, rootWindow: window};
			var myWindow = window.openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_addressbooksAdd.xul", "", cardbookRepository.windowParams, myArgs);
		},
		
		editAddressbook: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				var myPrefIdType = cardbookPreferences.getType(myPrefId);
				if (myPrefIdType === "SEARCH") {
					wdw_cardbook.addAddressbook("search", myPrefId);
				} else {
					if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
						return;
					}
					cardbookSynchronization.initMultipleOperations(myPrefId);
					var myArgs = {dirPrefId: myPrefId, serverCallback: wdw_cardbook.modifyAddressbook};
					var myWindow = window.openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_addressbooksEdit.xul", "",
													   cardbookRepository.colorPickableDialogParams, myArgs);
				}
			}
		},

		modifyAddressbook: function (aChoice, aDirPrefId, aName, aReadOnly) {
			if (aChoice == "SAVE") {
				wdw_cardbook.loadCssRules();
				var changed = false;
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[4] === aDirPrefId) {
						if (aName != account[0]) {
							cardbookPreferences.setName(aDirPrefId, aName);
							account[0] = aName;
							changed = true;
						}
						if (aReadOnly != account[7]) {
							cardbookPreferences.setReadOnly(aDirPrefId, aReadOnly);
							account[7] = aReadOnly;
							changed = true;
						}
						if (changed) {
							cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookAccounts,0,1);
							cardbookUtils.formatStringForOutput("addressbookModified", [aName]);
							cardbookActions.addActivity("addressbookModified", [aName], "editItem");
							cardbookUtils.notifyObservers("addressbookModified", aDirPrefId);
						}
						break;
					}
				}
			}
			cardbookSynchronization.finishMultipleOperations(aDirPrefId);
		},

		modifySearchAddressbook: function (aDirPrefId, aName, aColor, aVCard, aReadOnly, aUrnuuid, aSearchDef) {
			cardbookPreferences.setName(aDirPrefId, aName);
			cardbookPreferences.setColor(aDirPrefId, aColor);
			cardbookPreferences.setVCardVersion(aDirPrefId, aVCard);
			cardbookPreferences.setReadOnly(aDirPrefId, aReadOnly);
			cardbookPreferences.setUrnuuid(aDirPrefId, aUrnuuid);
			wdw_cardbook.loadCssRules();
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[4] === aDirPrefId) {
					account[0] = aName;
					account[7] = aReadOnly;
					break;
				}
			}
			var myFile = cardbookRepository.getRuleFile(aDirPrefId);
			if (myFile.exists()) {
				myFile.remove(true);
			}
			myFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
			cardbookSynchronization.writeContentToFile(myFile.path, aSearchDef, "UTF8");
			cardbookUtils.formatStringForOutput("addressbookModified", [aName]);
			cardbookActions.addActivity("addressbookModified", [aName], "editItem");
			cardbookUtils.notifyObservers("addressbookModified", aDirPrefId);

			cardbookRepository.emptyComplexSearchFromRepository(aDirPrefId);
			cardbookComplexSearch.loadComplexSearchAccount(aDirPrefId, true, "WINDOW");
		},

		removeAddressbook: function () {
			try {
				if (cardbookDirTree.visibleData.length != 0) {
					var myTree = document.getElementById('accountsOrCatsTree');
					if (myTree.currentIndex != -1) {
						var myParentIndex = myTree.view.getParentIndex(myTree.currentIndex);
						if (myParentIndex == -1) {
							var myParentAccountId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
							var myParentAccountName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
							var myParentAccountType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
						} else {
							var myParentAccountId = myTree.view.getCellText(myParentIndex, myTree.columns.getNamedColumn('accountId'));
							var myParentAccountName = myTree.view.getCellText(myParentIndex, myTree.columns.getNamedColumn('accountName'));
							var myParentAccountType = myTree.view.getCellText(myParentIndex, myTree.columns.getNamedColumn('accountType'));
						}
		
						if (cardbookUtils.isMyAccountSyncing(myParentAccountId)) {
							return;
						}
						cardbookSynchronization.initMultipleOperations(myParentAccountId);
						var myPrefUrl = cardbookPreferences.getUrl(myParentAccountId);
						
						var confirmTitle = cardbookRepository.strBundle.GetStringFromName("confirmTitle");
						var confirmMsg = cardbookRepository.strBundle.formatStringFromName("accountDeletionConfirmMessage", [myParentAccountName], 1);
						var returnFlag = false;
						var deleteContentFlag = {value: false};
						
						if (myParentAccountType === "FILE") {
							var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myFile.initWithPath(myPrefUrl);
							var deleteContentMsg = cardbookRepository.strBundle.formatStringFromName("accountDeletiondeleteContentFileMessage", [myFile.leafName], 1);
							returnFlag = Services.prompt.confirmCheck(window, confirmTitle, confirmMsg, deleteContentMsg, deleteContentFlag);
						} else if (myParentAccountType === "DIRECTORY") {
							var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myFile.initWithPath(myPrefUrl);
							var deleteContentMsg = cardbookRepository.strBundle.formatStringFromName("accountDeletiondeleteContentDirMessage", [myFile.leafName], 1);
							returnFlag = Services.prompt.confirmCheck(window, confirmTitle, confirmMsg, deleteContentMsg, deleteContentFlag);
						} else {
							returnFlag = Services.prompt.confirm(window, confirmTitle, confirmMsg);
						}
						if (returnFlag) {
							wdw_cardbook.setNoComplexSearchMode();
							wdw_cardbook.setNoSearchMode();
							if (myParentAccountType !== "SEARCH") {
								cardbookSynchronization.removePeriodicSync(myParentAccountId);
								cardbookRepository.removeAccountFromComplexSearch(myParentAccountId);
								cardbookRepository.removeAccountFromRepository(myParentAccountId);
								// cannot be launched from cardbookRepository
								cardbookIndexedDB.removeAccount(myParentAccountId, myParentAccountName);
							} else {
								cardbookRepository.removeComplexSearchFromRepository(myParentAccountId);
							}
							cardbookPreferences.delBranch(myParentAccountId);
							wdw_cardbook.loadCssRules();
							cardbookUtils.formatStringForOutput("addressbookDeleted", [myParentAccountName]);
							cardbookActions.addActivity("addressbookDeleted", [myParentAccountName], "deleteMail");
							cardbookUtils.notifyObservers("addressbookDeleted");
							if (myFile && deleteContentFlag.value) {
								cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : deleting : " + myFile.path);
								myFile.remove(true);
							}
						}
					}
					cardbookSynchronization.finishMultipleOperations(myParentAccountId);
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.removeAddressbook error : " + e, "Error");
			}
		},

		enableOrDisableAddressbook: function (aDirPrefId, aValue) {
			if (!aDirPrefId) {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					aDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					var aValue = !cardbookPreferences.getEnabled(aDirPrefId);
				} else {
					return;
				}
			}
			if (cardbookUtils.isMyAccountSyncing(aDirPrefId)) {
				return;
			}
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.setNoSearchMode();
			if (!aValue) {
				cardbookSynchronization.removePeriodicSync(aDirPrefId);
				cardbookRepository.enableOrDisableAccountFromCollected(aDirPrefId, !aValue);
				cardbookRepository.enableOrDisableAccountFromRestrictions(aDirPrefId, !aValue);
				cardbookRepository.removeAccountFromVCards(aDirPrefId);
				cardbookRepository.removeAccountFromBirthday(aDirPrefId);
				cardbookRepository.removeAccountFromDiscovery(aDirPrefId);
			} else {
				cardbookRepository.enableOrDisableAccountFromCollected(aDirPrefId, aValue);
				cardbookRepository.enableOrDisableAccountFromRestrictions(aDirPrefId, aValue);
			}
			var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
			var myDirPrefIdType = cardbookPreferences.getType(aDirPrefId);
			cardbookPreferences.setEnabled(aDirPrefId, aValue);
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[4] === aDirPrefId) {
					account[5] = aValue;
					break;
				}
			}
			wdw_cardbook.clearCard();
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.setNoSearchMode();
			wdw_cardbook.loadCssRules();
			if (aValue) {
				if (myDirPrefIdType == "SEARCH") {
					cardbookComplexSearch.loadComplexSearchAccount(aDirPrefId, true, "WINDOW");
				} else {
					cardbookSynchronization.loadAccount(aDirPrefId, true, false, "INITIAL");
				}
				cardbookUtils.formatStringForOutput("addressbookEnabled", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookEnabled", [myDirPrefIdName], "editItem");
			} else {
				cardbookSynchronization.initMultipleOperations(aDirPrefId);
				if (myDirPrefIdType != "SEARCH") {
					cardbookRepository.removeAccountFromComplexSearch(aDirPrefId);
					cardbookRepository.emptyAccountFromRepository(aDirPrefId);
				} else {
					cardbookRepository.emptyComplexSearchFromRepository(aDirPrefId);
				}
				cardbookUtils.formatStringForOutput("addressbookDisabled", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookDisabled", [myDirPrefIdName], "editItem");
				cardbookSynchronization.finishMultipleOperations(aDirPrefId);
			}
			cardbookUtils.notifyObservers("addressbookModified", aDirPrefId);
		},

		readOnlyOrReadWriteAddressbook: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);
				var myValue = !cardbookPreferences.getReadOnly(myDirPrefId);
			} else {
				return;
			}
			if (cardbookUtils.isMyAccountSyncing(myDirPrefId)) {
				return;
			}
			cardbookSynchronization.initMultipleOperations(myDirPrefId);
			if (myValue) {
				cardbookRepository.removeAccountFromCollected(myDirPrefId);
			}
			cardbookPreferences.setReadOnly(myDirPrefId, myValue);
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[4] === myDirPrefId) {
					account[7] = myValue;
					break;
				}
			}
			wdw_cardbook.loadCssRules();
			if (myValue) {
				cardbookUtils.formatStringForOutput("addressbookReadOnly", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookReadOnly", [myDirPrefIdName], "editItem");
			} else {
				cardbookUtils.formatStringForOutput("addressbookReadWrite", [myDirPrefIdName]);
				cardbookActions.addActivity("addressbookReadWrite", [myDirPrefIdName], "editItem");
			}
			cardbookUtils.notifyObservers("addressbookModified", myDirPrefId);
			cardbookSynchronization.finishMultipleOperations(myDirPrefId);
		},

		expandOrContractAddressbook: function (aDirPrefId, aValue) {
			cardbookPreferences.setExpanded(aDirPrefId, aValue);
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[4] == aDirPrefId) {
					account[2] = aValue;
				}
			}
		},

		returnKey: function () {
			if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
				wdw_cardbook.chooseActionCardsTree();
			} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					if (myTree.view.isContainer(myTree.currentIndex)) {
						wdw_cardbook.editAddressbook();
					} else {
						var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						var myNodeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
						var myNodeId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
						var myNodeType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
						wdw_cardbook.renameNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
		},

		newKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (!cardbookPreferences.getReadOnly(myDirPrefId) && cardbookPreferences.getEnabled(myDirPrefId)) {
					wdw_cardbook.createContact();
				}
			}
		},

		deleteKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				var myNodeId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
				var myNodeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
				var myNodeType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					if (cardbookPreferences.getEnabled(myDirPrefId)) {
						if (!cardbookPreferences.getReadOnly(myDirPrefId)) {
							wdw_cardbook.deleteCardsAndValidate();
						}
					}
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					if (myTree.view.isContainer(myTree.currentIndex)) {
						wdw_cardbook.removeAddressbook();
					} else {
						wdw_cardbook.removeNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
		},

		selectAllKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myCardsTree = document.getElementById('cardsTree');
				myCardsTree.view.selection.selectAll();
			}
		},

		F9Key: function () {
			if (document.getElementById('cardbook-menupopup')) {
				document.getElementById('cardbook-menupopup').openPopup(document.getElementById('cardbook-menupopup'), "after_start", 0, 0, false, false);
			}
		},

		copyKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					wdw_cardbook.copyCardsFromCards();
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					wdw_cardbook.copyCardsFromAccountsOrCats();
				}
			}
		},

		pasteKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				wdw_cardbook.pasteCards();
			}
		},

		cutKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					wdw_cardbook.cutCardsFromCards();
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					wdw_cardbook.cutCardsFromAccountsOrCats();
				}
			}
		},

		findKey: function () {
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').focus();
				wdw_cardbook.startSearch();
			}
		},

		doubleClickAccountOrCat: function (aEvent) {
			var myTree = document.getElementById('accountsOrCatsTree');
			var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
			var myTarget = myTree.view.getCellText(cell.row, myTree.columns.getNamedColumn('accountId'));
			var myDirPrefId = myTree.view.getCellText(cell.row, myTree.columns.getNamedColumn('accountRoot'));
			if (myTarget == "false") {
				wdw_cardbook.addAddressbook();
			} else if (myTarget == myDirPrefId) {
				wdw_cardbook.editAddressbook();
			} else {
				wdw_cardbook.selectNodeToAction('EDIT');
			}
		},

		loadCssRules: function () {
			for (var prop in document.styleSheets) {
				var styleSheet = document.styleSheets[prop];
				if (styleSheet.href == "chrome://cardbook/skin/cardbookEmpty.css") {
					cardbookRepository.deleteCssAllRules(styleSheet);
					for (let account of cardbookRepository.cardbookAccounts) {
						if (account[1]) {
							var dirPrefId = account[4];
							var color = cardbookPreferences.getColor(dirPrefId)
							cardbookRepository.createCssAccountRules(styleSheet, dirPrefId, color);
							if (account[5]) {
								cardbookRepository.createCssCardRules(styleSheet, dirPrefId, color);
							}
						}
					}
					for (let category in cardbookRepository.cardbookNodeColors) {
						var color = cardbookRepository.cardbookNodeColors[category];
						var categoryCleanName = cardbookUtils.formatCategoryForCss(category);
						cardbookRepository.createCssAccountRules(styleSheet, 'category_' + categoryCleanName, color);
						cardbookRepository.createCssCategoryRules(styleSheet, 'category_' + categoryCleanName, color);
						cardbookRepository.createCssCardRules(styleSheet, 'category_' + categoryCleanName, color);
					}
					cardbookRepository.reloadCss(styleSheet.href);
				}
			}
		},

		addCategory: function () {
			var selectedId = cardbookWindowUtils.getSelectedCardsId();
			if (selectedId.length != 0) {
				var myFirstCard = cardbookRepository.cardbookCards[selectedId[0]];
				var myValidationList = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccountsCategories[myFirstCard.dirPrefId]));
				var onSaved = () => {
					if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
						if (myArgs.color) {
							cardbookRepository.cardbookNodeColors[myArgs.type] = myArgs.color;
							cardbookRepository.saveNodeColors();
						}
						wdw_cardbook.addCategoryToSelectedCards(myArgs.type, true);
					}
				};
				var myArgs = {type: "", context: "AddCat", typeAction: "", validationList: myValidationList, color: "", onSaved};
				var myWindow = window.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xul", "", cardbookRepository.colorPickableModalDialogParams, myArgs);
			}
		},

		addCategoryToSelectedCards: function (aCategory, aCategorySelect) {
			var selectedId = cardbookWindowUtils.getSelectedCardsId();
			if (aCategorySelect) { 
				var myTopic = "categoryCreated";
			} else {
				var myTopic = "categorySelected";
			}
			var myActionId = cardbookActions.startAction(myTopic, [aCategory]);
			for (var id of selectedId) {
				if (cardbookRepository.cardbookCards[id]) {
					var myCard = cardbookRepository.cardbookCards[id];
					if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					var myOutCard = new cardbookCardParser();
					cardbookUtils.cloneCard(myCard, myOutCard);
					cardbookRepository.addCategoryToCard(myOutCard, aCategory);
					cardbookRepository.saveCard(myCard, myOutCard, myActionId, false);
				}
			}
			cardbookActions.endAction(myActionId);
			wdw_cardbook.loadCssRules();
		},

		removeCategoryFromSelectedCards: function (aCategory) {
			var selectedId = cardbookWindowUtils.getSelectedCardsId();
			var myTopic = "categoryUnselected";
			var myActionId = cardbookActions.startAction(myTopic, [aCategory]);
			for (var id of selectedId) {
				if (cardbookRepository.cardbookCards[id]) {
					var myCard = cardbookRepository.cardbookCards[id];
					if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					var myOutCard = new cardbookCardParser();
					cardbookUtils.cloneCard(myCard, myOutCard);
					myOutCard.categories = myOutCard.categories.filter(child => child != aCategory);
					cardbookRepository.saveCard(myCard, myOutCard, myActionId, true);
				}
			}
			cardbookActions.endAction(myActionId);
		},

		renameNode: function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				var uncategorized = (aNodeName == cardbookRepository.cardbookUncategorizedCards) ? true : false;
				if (cardbookPreferences.getReadOnly(aDirPrefId) && !uncategorized) {
					return;
				}
				if (aNodeType == "categories") {
					var myValidationList = Array.from(cardbookRepository.cardbookAccountsCategories[aDirPrefId]).filter(child => child != aNodeName);
					var myContext = "EditCat";
				} else {
					var myParentList = cardbookRepository.cardbookAccountsNodes[aDirPrefId].filter(child => cardbookRepository.getParentOrg(child.id) == cardbookRepository.getParentOrg(aNodeId));
					var myValidationList = myParentList.map(child => child.data).filter(child => child != aNodeName);
					var myContext = "EditNode";
				}
				var onSaved = () => {
					var nameChanged = myArgs.type != aNodeName;
					var colorChanged = myArgs.color != myArgs.oldColor;
					if (myArgs.typeAction != "SAVE" || myArgs.type == "" || (!nameChanged && !colorChanged)) {
						return;
					}

					var myTopic = aNodeType != "categories" ? "nodeRenamed" : "categoryRenamed";
					var myNewNodeName = myArgs.type;
					var myActionId = cardbookActions.startAction(myTopic, [aNodeName], aDirPrefId+"::"+myNewNodeName);
					if (nameChanged) {
						if (uncategorized) {
							cardbookPreferences.setStringPref("extensions.cardbook.uncategorizedCards", myNewNodeName);
							cardbookRepository.renameUncategorized(aNodeName, myNewNodeName);
							cardbookUtils.notifyObservers(myTopic, "force::"+aDirPrefId+"::"+myNewNodeName);
						} else {
							var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
							var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aNodeId].cards));
							var length = myCards.length;
							for (var i = 0; i < length; i++) {
								var myCard = myCards[i];
								// as it is possible to rename a category from a virtual folder
								// should avoid to modify cards belonging to a read-only address book
								if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
									continue;
								}
								var myOutCard = new cardbookCardParser();
								cardbookUtils.cloneCard(myCard, myOutCard);
								if (aNodeType == "categories") {
									cardbookRepository.renameCategoryFromCard(myOutCard, aNodeName, myNewNodeName);
								} else if (aNodeType == "org") {
									cardbookRepository.renameOrgFromCard(myOutCard, aNodeId, myNewNodeName);
								}
								cardbookRepository.saveCard(myCard, myOutCard, myActionId, false);
							}
						}
						if (aNodeName in cardbookRepository.cardbookNodeColors) {
							cardbookRepository.cardbookNodeColors[myNewNodeName] = cardbookRepository.cardbookNodeColors[aNodeName];
							delete cardbookRepository.cardbookNodeColors[aNodeName];
							cardbookRepository.saveNodeColors();
							wdw_cardbook.loadCssRules();
						}
					}
					if (colorChanged) {
						if (nameChanged) {
							delete cardbookRepository.cardbookNodeColors[aNodeName];
						}
						if (myArgs.color) {
							cardbookRepository.cardbookNodeColors[myArgs.type] = myArgs.color;
						} else {
							delete cardbookRepository.cardbookNodeColors[myArgs.type];
						}
						cardbookRepository.saveNodeColors();
						wdw_cardbook.loadCssRules();
					}
					cardbookActions.endAction(myActionId, true);
				};
				var myArgs = {type: aNodeName, id: aNodeId, context: myContext, typeAction: "", validationList: myValidationList, 
								color: cardbookRepository.cardbookNodeColors[aNodeName], oldColor: cardbookRepository.cardbookNodeColors[aNodeName],
								onSaved};
				var myWindow = window.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xul", "", cardbookRepository.colorPickableModalDialogParams, myArgs);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.renameNode error : " + e, "Error");
			}
		},

		removeNode: function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if ((aNodeId == aDirPrefId + "::" + cardbookRepository.cardbookUncategorizedCards) ||
					cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var confirmTitle = cardbookRepository.strBundle.GetStringFromName("confirmTitle");
				var cardsCount = cardbookRepository.cardbookDisplayCards[aNodeId].cards.length;
				var message = aNodeType != "categories" ? "nodeDeletionsConfirmMessagePF" : "catDeletionsConfirmMessagePF";
				var confirmMsg = PluralForm.get(cardsCount, cardbookRepository.strBundle.GetStringFromName(message));
				confirmMsg = confirmMsg.replace("%1", cardsCount).replace("%2", aNodeName);

				if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
					var myTopic = aNodeType != "categories" ? "nodeDeleted" : "categoryDeleted";
					var myActionId = cardbookActions.startAction(myTopic, [aNodeName], aDirPrefId);
					var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
					
					var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aNodeId].cards));
					var length = myCards.length;
					for (var i = 0; i < length; i++) {
						var myCard = myCards[i];
						// as it is possible to remove a category from a virtual folder
						// should avoid to modify cards belonging to a read-only address book
						if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
							continue;
						}
						var myOutCard = new cardbookCardParser();
						cardbookUtils.cloneCard(myCard, myOutCard);
						if (aNodeType == "categories") {
							cardbookRepository.removeCategoryFromCard(myOutCard, aNodeName);
						} else if (aNodeType == "org") {
							cardbookRepository.removeOrgFromCard(myOutCard, aNodeId);
						}
						cardbookRepository.saveCard(myCard, myOutCard, myActionId, false);
					}
					cardbookActions.endAction(myActionId);
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.removeNode error : " + e, "Error");
			}
		},

		selectNodeToAction: function (aAction) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
				if (!cardbookRepository.possibleNodes.includes(myType)) {
					return;
				} else {
					var myDirPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					var myNodeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
					var myNodeId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
					var myNodeType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
					if (aAction == "REMOVE") {
						wdw_cardbook.removeNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					} else if (aAction == "CONVERT") {
						if (myNodeType == "org") {
							wdw_cardbook.createListFromNode(myDirPrefId, myNodeId, myNodeName, myNodeType);
						} else {
							wdw_cardbook.convertNodeToList(myDirPrefId, myNodeId, myNodeName, myNodeType);
						}
					} else if (aAction == "EDIT") {
						wdw_cardbook.renameNode(myDirPrefId, myNodeId, myNodeName, myNodeType, true);
					}
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.selectNodeToAction error : " + e, "Error");
			}
		},

		createListFromNode: function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if ((aNodeId == aDirPrefId + "::" + cardbookRepository.cardbookUncategorizedCards) ||
					cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var myDirPrefIds = {};
				var listOfUids = [];
				var myTopic = "listCreatedFromNode";
				var myActionId = cardbookActions.startAction(myTopic, [aNodeName]);
				for (let card of cardbookRepository.cardbookDisplayCards[aNodeId].cards) {
					if (!myDirPrefIds[aDirPrefId]) {
						var myNewList = new cardbookCardParser();
						myNewList.dirPrefId = aDirPrefId;
						cardbookUtils.setCardUUID(myNewList);
						myNewList.version = cardbookPreferences.getVCardVersion(aDirPrefId);
						myNewList.fn = aNodeName;
						cardbookRepository.addOrgToCard(myNewList, aNodeId);
						myDirPrefIds[aDirPrefId] = {};
						myDirPrefIds[aDirPrefId].list = myNewList;
						myDirPrefIds[aDirPrefId].members = [];
					}
					if (card.isAList) {
						listOfUids = cardbookUtils.getUidsFromList(card);
						for (let uid of listOfUids) {
							myDirPrefIds[aDirPrefId].members.push("urn:uuid:" + uid);
						}
					} else {
						myDirPrefIds[aDirPrefId].members.push("urn:uuid:" + card.uid);
					}
				}

				for (var i in myDirPrefIds) {
					cardbookUtils.parseLists(myDirPrefIds[i].list, myDirPrefIds[i].members, "group");
					cardbookRepository.saveCard({}, myDirPrefIds[i].list, myActionId, true);
				}
				cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.createListFromNode error : " + e, "Error");
			}
		},

		convertNodeToList: function (aDirPrefId, aNodeId, aNodeName, aNodeType, aNodeSelect) {
			try {
				if ((aNodeId == aDirPrefId + "::" + cardbookRepository.cardbookUncategorizedCards) ||
					cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var myCards = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[aNodeId].cards));
				var myDirPrefIds = {};
				var myTopic = aNodeType != "categories" ? "listCreatedFromNode" : "categoryConvertedToList";
				var myActionId = cardbookActions.startAction(myTopic, [aNodeName]);
				for (var i = 0; i < myCards.length; i++) {
					var myCard = myCards[i];
					// as it is possible to remove a category from a virtual folder
					// should avoid to modify cards belonging to a read-only address book
					if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					if (!myDirPrefIds[myCard.dirPrefId]) {
						var myNewList = new cardbookCardParser();
						myNewList.dirPrefId = myCard.dirPrefId;
						cardbookUtils.setCardUUID(myNewList);
						myNewList.version = cardbookPreferences.getVCardVersion(myCard.dirPrefId);
						myNewList.fn = aNodeName;
						myDirPrefIds[myCard.dirPrefId] = {};
						myDirPrefIds[myCard.dirPrefId].list = myNewList;
						myDirPrefIds[myCard.dirPrefId].members = [];
					}
					myDirPrefIds[myCard.dirPrefId].members.push("urn:uuid:" + myCard.uid);

					var myOutCard = new cardbookCardParser();
					cardbookUtils.cloneCard(myCard, myOutCard);
					if (aNodeType == "categories") {
						cardbookRepository.removeCategoryFromCard(myOutCard, aNodeName);
					}
					cardbookRepository.saveCard(myCard, myOutCard, myActionId, true);
				}
				for (var i in myDirPrefIds) {
					cardbookUtils.parseLists(myDirPrefIds[i].list, myDirPrefIds[i].members, "group");
					cardbookRepository.saveCard({}, myDirPrefIds[i].list, myActionId, true);
				}
				cardbookActions.endAction(myActionId);
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.convertNodeToList error : " + e, "Error");
			}
		},

		convertListToCategory: function () {
			try {
				var myDirPrefId = document.getElementById('dirPrefIdTextBox').value;
				var myCard = cardbookRepository.cardbookCards[myDirPrefId+"::"+document.getElementById('uidTextBox').value];
				if (!myCard.isAList || cardbookPreferences.getReadOnly(myDirPrefId)) {
					return;
				} else {
					var myTopic = "listConvertedToCategory";
					var myActionId = cardbookActions.startAction(myTopic, [myCard.fn]);
					var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);
					var myDirPrefIdType = cardbookPreferences.getType(myDirPrefId);
					var myCategoryName = myCard.fn;
					if (myCard.version == "4.0") {
						for (var k = 0; k < myCard.member.length; k++) {
							var uid = myCard.member[k].replace("urn:uuid:", "");
							if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid]) {
								var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid];
								var myOutCard = new cardbookCardParser();
								cardbookUtils.cloneCard(myTargetCard, myOutCard);
								cardbookRepository.addCategoryToCard(myOutCard, myCategoryName);
								cardbookRepository.saveCard(myTargetCard, myOutCard, myActionId, true);
								cardbookUtils.formatStringForOutput("cardAddedToCategory", [myDirPrefIdName, myOutCard.fn, myCategoryName]);
							}
						}
					} else if (myCard.version == "3.0") {
						var memberCustom = cardbookPreferences.getStringPref("extensions.cardbook.memberCustom");
						for (var k = 0; k < myCard.others.length; k++) {
							var localDelim1 = myCard.others[k].indexOf(":",0);
							if (localDelim1 >= 0) {
								var header = myCard.others[k].substr(0,localDelim1);
								var trailer = myCard.others[k].substr(localDelim1+1,myCard.others[k].length);
								if (header == memberCustom) {
									if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")]) {
										var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")];
										var myOutCard = new cardbookCardParser();
										cardbookUtils.cloneCard(myTargetCard, myOutCard);
										cardbookRepository.addCategoryToCard(myOutCard, myCategoryName);
										cardbookRepository.saveCard(myTargetCard, myOutCard, myActionId, true);
										cardbookUtils.formatStringForOutput("cardAddedToCategory", [myDirPrefIdName, myOutCard.fn, myCategoryName]);
									}
								}
							}
						}
					}
					cardbookRepository.deleteCards([myCard], myActionId);
					cardbookActions.endAction(myActionId);
				}
			}
			catch (e) {
				cardbookLog.updateStatusProgressInformation("wdw_cardbook.convertListToCategory error : " + e, "Error");
			}
		},

		copyEntryFromTree: function () {
			var label = cardbookRepository.strBundle.GetStringFromName(wdw_cardbook.currentType + "Label");
			wdw_cardbook.copyFieldValue(wdw_cardbook.currentType, label, wdw_cardbook.currentIndex, wdw_cardbook.currentValue);
		},

		copyFieldValue: function (aFieldName, aFieldLabel, aFieldIndex, aFieldValue, aFieldAllValue) {
			var card = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			var dateFormat = cardbookPreferences.getDateFormat(card.dirPrefId, card.version);
			cardbookRepository.currentCopiedEntryName = aFieldName;
			cardbookRepository.currentCopiedEntryLabel = aFieldLabel;
			// events 
			if (aFieldName == "event") {
				cardbookRepository.currentCopiedEntryValue = aFieldValue;
			// multilines fields
			} else if (cardbookRepository.multilineFields.includes(aFieldName)) {
				cardbookRepository.currentCopiedEntryValue = JSON.stringify(card[aFieldName][aFieldIndex]);
			// date fields
			} else if (cardbookRepository.dateFields.includes(aFieldName)) {
				var newDate = cardbookDates.convertDateStringToDate(card[aFieldName], dateFormat);
				cardbookRepository.currentCopiedEntryValue = cardbookDates.convertDateToDateString(newDate, "4.0");
			// structured org
			} else if (aFieldName.startsWith("org.")) {
				cardbookRepository.currentCopiedEntryValue = aFieldAllValue.trim();
			// custom fields and org
			} else if (aFieldValue != "") {
				cardbookRepository.currentCopiedEntryValue = JSON.stringify(aFieldValue.trim());
			// others
			} else {
				cardbookRepository.currentCopiedEntryValue = JSON.stringify(card[aFieldName].trim());
			}

			var result = "";
			// addresses
			if (aFieldName == "adr") {
				result = card.fn + "\n" + cardbookUtils.formatAddress(card[aFieldName][aFieldIndex][0]);
			// date fields
			} else if (cardbookRepository.dateFields.includes(aFieldName)) {
				result = cardbookDates.getFormattedDateForDateString(card[aFieldName], dateFormat, cardbookRepository.dateDisplayedFormat);
			// events 
			} else if (aFieldName == "event") {
				var event = aFieldValue.split("::");
				var formattedDate = cardbookDates.getFormattedDateForDateString(event[0], dateFormat, cardbookRepository.dateDisplayedFormat);
				result = formattedDate + " " + event[1];
			// others multilines fields
			} else if (cardbookRepository.multilineFields.includes(aFieldName)) {
				result = card[aFieldName][aFieldIndex][0][0];
			// custom fields and org
			} else if (aFieldValue != "") {
				result = aFieldValue.trim();
			// others
			} else {
				result = card[aFieldName].trim();
			}
			var message = cardbookRepository.strBundle.GetStringFromName("lineCopied");
			cardbookClipboard.clipboardSetText('text/unicode', result, message);
		},

		pasteFieldValue: function () {
			var myTopic = "linePasted";
			var myActionId = cardbookActions.startAction(myTopic);
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getCardsFromCards();
			if (cardbookRepository.currentCopiedEntryName == "" || cardbookRepository.currentCopiedEntryValue == "") {
				cardbookUtils.formatStringForOutput("clipboardEmpty");
				return;
			}

			for (var i = 0; i < listOfSelectedCard.length; i++) {
				var myCard = listOfSelectedCard[i];
				if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					continue;
				}
				var myOutCard = new cardbookCardParser();
				cardbookUtils.cloneCard(myCard, myOutCard);
				if (cardbookRepository.multilineFields.includes(cardbookRepository.currentCopiedEntryName)) {
					myOutCard[cardbookRepository.currentCopiedEntryName].push(JSON.parse(cardbookRepository.currentCopiedEntryValue));
				} else if (cardbookRepository.dateFields.includes(cardbookRepository.currentCopiedEntryName)) {
					var newDate = cardbookDates.convertDateStringToDate(cardbookRepository.currentCopiedEntryValue, "4.0");
					var dateFormat = cardbookRepository.getDateFormat(myOutCard.dirPrefId, myOutCard.version);
					myOutCard[cardbookRepository.currentCopiedEntryName] = cardbookDates.convertDateToDateString(newDate, dateFormat);
				} else if (cardbookRepository.newFields.includes(cardbookRepository.currentCopiedEntryName)) {
					if (myOutCard.version == "4.0") {
						myOutCard[cardbookRepository.currentCopiedEntryName] = JSON.parse(cardbookRepository.currentCopiedEntryValue);
					} else {
						continue;
					}
				} else if (cardbookRepository.currentCopiedEntryName.startsWith("X-")) {
					var migratedItems = Array.from(cardbookRepository.newFields, item => 'X-' + item.toUpperCase());
					if (migratedItems.includes(cardbookRepository.currentCopiedEntryName)) {
						if (myOutCard.version == "3.0") {
							myOutCard.others.push(cardbookRepository.currentCopiedEntryName + ":" + JSON.parse(cardbookRepository.currentCopiedEntryValue));
						} else {
							var field = cardbookRepository.currentCopiedEntryName.replace(/^X\-/, "").toLowerCase();
							myOutCard[field] = JSON.parse(cardbookRepository.currentCopiedEntryValue);
						}
					} else {
						myOutCard.others.push(cardbookRepository.currentCopiedEntryName + ":" + JSON.parse(cardbookRepository.currentCopiedEntryValue));
					}
				} else if (cardbookRepository.currentCopiedEntryName == 'org') {
					myOutCard[cardbookRepository.currentCopiedEntryName] = JSON.parse(cardbookRepository.currentCopiedEntryValue);
				} else if (cardbookRepository.currentCopiedEntryName == 'event') {
					var tmpArray = cardbookRepository.currentCopiedEntryValue.split("::");
					var newDate = cardbookDates.convertDateStringToDate(tmpArray[0], "4.0");
					var dateFormat = cardbookRepository.getDateFormat(myOutCard.dirPrefId, myOutCard.version);
					var dateString = cardbookDates.convertDateToDateString(newDate, dateFormat);
					var dateLabel = tmpArray[1];
					var datePref = (tmpArray[2] == "true");
					var myPGNextNumber = cardbookTypes.rebuildAllPGs(myOutCard);
					cardbookUtils.addEventstoCard(myOutCard, [ [ dateString, dateLabel, datePref ] ], myPGNextNumber, dateFormat);
				} else if (cardbookRepository.currentCopiedEntryName.startsWith("org.")) {
					var myIndex = cardbookRepository.currentCopiedEntryName.split('.')[1];
					var node = "org::org";
					let orgArray = cardbookUtils.escapeString(cardbookRepository.currentCopiedEntryValue).split("::");
					for (var i = 0; i <= myIndex; i++) {
						node = node + "::" + orgArray[i];
					}
					cardbookRepository.addOrgToCard(myOutCard, node);
				} else {
					myOutCard[cardbookRepository.currentCopiedEntryName] = JSON.parse(cardbookRepository.currentCopiedEntryValue);
				}
				
				cardbookTypes.rebuildAllPGs(myOutCard);
				cardbookRepository.saveCard(myCard, myOutCard, myActionId, false);
				cardbookLog.updateStatusProgressInformation(cardbookRepository.strBundle.formatStringFromName("linePastedToCard", [myOutCard.fn], 1));
			}
			cardbookActions.endAction(myActionId);
		},

		setCurrentTypeFromEvent: function (aEvent) {
			var myElement = document.elementFromPoint(aEvent.clientX, aEvent.clientY);
			var myTempArray = myElement.id.split('_');
			wdw_cardbook.currentType = myTempArray[0];
			wdw_cardbook.currentIndex = myTempArray[1];
			if (myElement.getAttribute('fieldValue')) {
				wdw_cardbook.currentValue = myElement.getAttribute('fieldValue');
			} else {
				wdw_cardbook.currentValue = myElement.value;
			}
		},

		cardListContextShowing: function (aEvent) {
			wdw_cardbook.setCurrentTypeFromEvent(aEvent);
		},

		setElementAttribute: function (aElement, aAttribute, aValue) {
			if (document.getElementById(aElement)) {
				document.getElementById(aElement).setAttribute(aAttribute, aValue);
			}
		},

		removeElementAttribute: function (aElement, aAttribute) {
			if (document.getElementById(aElement)) {
				document.getElementById(aElement).removeAttribute(aAttribute);
			}
		},

		enableOrDisableElement: function (aArray, aValue) {
			for (var i = 0; i < aArray.length; i++) {
				if (document.getElementById(aArray[i])) {
					document.getElementById(aArray[i]).disabled=aValue;
				}
			}
		},

		setElementIdLabelWithBundleArray: function (aElementId, aValue, aArray) {
			wdw_cardbook.setElementIdLabel(aElementId, cardbookRepository.strBundle.formatStringFromName(aValue, aArray, aArray.length));
		},

		setElementIdLabelWithBundle: function (aElementId, aValue) {
			wdw_cardbook.setElementIdLabel(aElementId, cardbookRepository.strBundle.GetStringFromName(aValue));
		},

		setElementIdLabel: function (aElementId, aValue) {
			if (document.getElementById(aElementId)) {
				wdw_cardbook.setElementLabel(document.getElementById(aElementId), aValue);
			}
		},

		setElementLabel: function (aElement, aValue) {
			if (aElement) {
				aElement.label=aValue;
			}
		},

		cardbookAccountMenuContextShowing: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
													'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuPrint',
													'cardbookAccountMenuExportToFile', 'cardbookAccountMenuImportFromFile',
													'cardbookAccountMenuExportToDir', 'cardbookAccountMenuImportFromDir'], true);
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
			} else if (myTree.currentIndex != -1) {
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook', 'cardbookAccountMenuReadOnlyOrReadWriteAddressbook'], false);
				if (cardbookPreferences.getEnabled(myPrefId)) {
					var myType = cardbookPreferences.getType(myPrefId);
					if (cardbookUtils.isMyAccountLocal(myType)) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], false);
					}
					wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], true);
					wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "enableFromAccountsOrCats");
				}
				if (cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
				} else {
					wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readOnlyFromAccountsOrCats");
				}
				if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
															'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync'], true);
				}

				if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], true);
					if (document.getElementById('cardsTree').view.rowCount == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], true);
					} else if (document.getElementById('cardsTree').view.rowCount == 1) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], false);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], false);
					}
				} else if (cardbookPreferences.getEnabled(myPrefId)) {
					if (cardbookPreferences.getReadOnly(myPrefId)) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], false);
					}
					if (document.getElementById('cardsTree').view.rowCount == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], true);
					} else if (document.getElementById('cardsTree').view.rowCount == 1) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], false);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], false);
					}
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuImportFromFile',
															'cardbookAccountMenuExportToDir', 'cardbookAccountMenuImportFromDir'], true);
				}
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
														'cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir', ''], false);
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], true);
				}
			} else {
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
													'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuPrint', 
													'cardbookAccountMenuExportToFile', 'cardbookAccountMenuImportFromFile',
													'cardbookAccountMenuExportToDir', 'cardbookAccountMenuImportFromDir'], true);
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				wdw_cardbook.setElementIdLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
			}
		},
	
		cardbookContactsMenuContextShowing: function () {
			cardbookWindowUtils.addCardsToCategoryMenuSubMenu('cardbookContactsMenuCategoriesMenuPopup');
			wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEvents'], true);
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
													'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
													'cardbookContactsMenuPrint', 'cardbookContactsMenuExportCardsToFile',
													'cardbookContactsMenuExportCardsToDir', 'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], true);
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookWindowUtils.getSelectedCardsCount() == 0) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExportCardsToFile',
														'cardbookContactsMenuExportCardsToDir', 'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], true);
				} else if (cardbookWindowUtils.getSelectedCardsCount() == 1) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExportCardsToFile',
														'cardbookContactsMenuExportCardsToDir', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], false);
					if (cardbookRepository.currentCopiedEntryLabel) {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], false);
						wdw_cardbook.setElementIdLabelWithBundleArray('cardbookContactsMenuPasteEntry', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], true);
					}
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuMergeCards'], true);
					AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID).then(addon => {
						wdw_cardbook.cardbookContactsMenuLightningContextShowing(addon);
					});
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExportCardsToFile',
														'cardbookContactsMenuExportCardsToDir', 'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], false);
					if (cardbookRepository.currentCopiedEntryLabel) {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], false);
						wdw_cardbook.setElementIdLabelWithBundleArray('cardbookContactsMenuPasteEntry', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], true);
					}
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEmails'], true);
				}
				if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards'], true);
				} else {
					if (myTree.currentIndex != -1) {
						var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						if (cardbookPreferences.getEnabled(myPrefId)) {
							if (cardbookPreferences.getReadOnly(myPrefId)) {
								wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry', 'cardbookContactsMenuCategories'], true);
							} else {
								wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuCategories'], false);
								if (cardbookRepository.currentCopiedEntryLabel) {
									wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], false);
									wdw_cardbook.setElementIdLabelWithBundleArray('cardbookContactsMenuPasteEntry', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
								} else {
									wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteEntry'], true);
								}
							}
						} else {
							wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry', 'cardbookContactsMenuCategories'], true);
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry', 'cardbookContactsMenuCategories'], true);
					}
				}
				if (!cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled")) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEmails'], true);
				}
			}
		},

		cardbookContactsMenuLightningContextShowing: function (addon) {
			if (addon && addon.isActive) {
				document.getElementById("cardbookContactsMenuFindEvents").disabled = false;
			}
		},

		cardbookToolsMenuSyncLightning: function(addon) {
			if (addon && addon.isActive) {
				wdw_cardbook.enableOrDisableElement(['cardbookToolsSyncLightning'], false);
			} else {
				wdw_cardbook.enableOrDisableElement(['cardbookToolsSyncLightning'], true);
			}
		},

		cardbookToolsMenuContextShowing: function () {
			AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID).then(addon => {
				wdw_cardbook.cardbookToolsMenuSyncLightning(addon);
			});
		},

		accountsOrCatsTreeContextShowing: function () {
			wdw_cardbook.setElementIdLabelWithBundle('removeNodeFromAccountsOrCats', "removeCategoryFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('editNodeFromAccountsOrCats', "editCategoryFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('convertNodeFromAccountsOrCats', "convertCategoryFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('enableOrDisableFromAccountsOrCats', "disableFromAccountsOrCats");
			wdw_cardbook.setElementIdLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readOnlyFromAccountsOrCats");
			var myTree = document.getElementById('accountsOrCatsTree');
			if (cardbookDirTree.visibleData.length != 0 && myTree.currentIndex != -1) {
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (cardbookPreferences.getEnabled(myPrefId)) {
					if (cardbookPreferences.getReadOnly(myPrefId)) {
						wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats', 'importCardsFromDirFromAccountsOrCats'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats', 'importCardsFromDirFromAccountsOrCats'], false);
					}
					wdw_cardbook.setElementIdLabelWithBundle('enableOrDisableFromAccountsOrCats', "disableFromAccountsOrCats");
					var myType = cardbookPreferences.getType(myPrefId);
					if (cardbookUtils.isMyAccountLocal(myType)) {
						wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], true);
					} else {
						if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], false);
						}
					}
				} else {
					wdw_cardbook.setElementIdLabelWithBundle('enableOrDisableFromAccountsOrCats', "enableFromAccountsOrCats");
					wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats', 'importCardsFromDirFromAccountsOrCats', 'syncAccountFromAccountsOrCats'], true);
				}

				var myType = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountType'));
				if (!cardbookRepository.possibleNodes.includes(myType)) {
					wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats', 'editNodeFromAccountsOrCats', 'convertNodeFromAccountsOrCats'], true);
				} else {
					if (myType != "categories") {
						wdw_cardbook.setElementIdLabelWithBundle('removeNodeFromAccountsOrCats', "removeNodeFromAccountsOrCats");
						wdw_cardbook.setElementIdLabelWithBundle('editNodeFromAccountsOrCats', "editNodeFromAccountsOrCats");
						wdw_cardbook.setElementIdLabelWithBundle('convertNodeFromAccountsOrCats', "convertNodeFromAccountsOrCats");
					}
					var myNodeName = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountName'));
					if (myNodeName == cardbookRepository.cardbookUncategorizedCards) {
						wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats'], true);
						wdw_cardbook.enableOrDisableElement(['editNodeFromAccountsOrCats'], false);
						wdw_cardbook.enableOrDisableElement(['convertNodeFromAccountsOrCats'], false);
					} else {
						var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						if (cardbookPreferences.getReadOnly(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats'], true);
							wdw_cardbook.enableOrDisableElement(['editNodeFromAccountsOrCats'], true);
							wdw_cardbook.enableOrDisableElement(['convertNodeFromAccountsOrCats'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['removeNodeFromAccountsOrCats'], false);
							wdw_cardbook.enableOrDisableElement(['editNodeFromAccountsOrCats'], false);
							wdw_cardbook.enableOrDisableElement(['convertNodeFromAccountsOrCats'], false);
						}
					}
				}

				if (cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['generateFnFromAccountsOrCats'], true);
					wdw_cardbook.enableOrDisableElement(['cutCardsFromAccountsOrCats'], true);
					wdw_cardbook.setElementIdLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readWriteFromAccountsOrCats");
				} else {
					wdw_cardbook.enableOrDisableElement(['generateFnFromAccountsOrCats'], false);
					wdw_cardbook.enableOrDisableElement(['cutCardsFromAccountsOrCats'], false);
					wdw_cardbook.setElementIdLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readOnlyFromAccountsOrCats");
				}
				if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats',
															'readOnlyOrReadWriteFromAccountsOrCats'], true);
				} else {
					wdw_cardbook.enableOrDisableElement(['editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats'], false);
					if (myType == "SEARCH") {
						wdw_cardbook.enableOrDisableElement(['readOnlyOrReadWriteFromAccountsOrCats'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['readOnlyOrReadWriteFromAccountsOrCats'], false);
					}
				}
				wdw_cardbook.enableOrDisableElement(['addAccountFromAccountsOrCats'], false);
				if (document.getElementById('cardsTree').view.rowCount == 0) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats', 'generateFnFromAccountsOrCats',
														'findDuplicatesFromAccountsOrCats', 'editNodeFromAccountsOrCats', 'removeNodeFromAccountsOrCats', 'convertNodeFromAccountsOrCats', 'printFromAccountsOrCats'], true);
				} else if (document.getElementById('cardsTree').view.rowCount == 1) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats',
														'printFromAccountsOrCats'], false);
				} else {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats',
														'printFromAccountsOrCats'], false);
				}
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats',
														'addAccountFromAccountsOrCats', 'editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats',
														'printFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats'], false);
					wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats', 'importCardsFromDirFromAccountsOrCats',
														'readOnlyOrReadWriteFromAccountsOrCats', 'syncAccountFromAccountsOrCats', 'generateFnFromAccountsOrCats'], true);
				}
			} else {
				wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
													'copyCardsFromAccountsOrCats', 'pasteCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats',
													'importCardsFromDirFromAccountsOrCats', 'editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats',
													'editNodeFromAccountsOrCats', 'removeNodeFromAccountsOrCats', 'convertNodeFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats', 'readOnlyOrReadWriteFromAccountsOrCats',
													'syncAccountFromAccountsOrCats', 'generateFnFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats', 'printFromAccountsOrCats'], true);
			}
		},
	
		cardsTreeContextShowing: function (aEvent) {
			if (cardbookWindowUtils.displayColumnsPicker()) {
				wdw_cardbook.selectCard(aEvent);
				wdw_cardbook.cardsTreeContextShowingNext();
				return true;
			} else {
				return false;
			}
		},

		cardsTreeContextShowingNext: function () {
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
													'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'pasteEntryFromCards', 'exportCardsToFileFromCards',
													'exportCardsToDirFromCards', 'mergeCardsFromCards', 'duplicateCardsFromCards', 'convertListToCategoryFromCards', 'categoriesFromCards', 'printFromCards'], true);
			} else {
				cardbookWindowUtils.addCardsToCategoryMenuSubMenu('categoriesFromCardsMenuPopup');
				wdw_cardbook.enableOrDisableElement(['findEventsFromCards'], true);
				if (cardbookWindowUtils.getSelectedCardsCount() == 0) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
														'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'pasteEntryFromCards', 'exportCardsToFileFromCards',
														'exportCardsToDirFromCards', 'mergeCardsFromCards', 'duplicateCardsFromCards', 'convertListToCategoryFromCards',
														'categoriesFromCards', 'printFromCards'], true);
				} else if (cardbookWindowUtils.getSelectedCardsCount() == 1) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
														'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'exportCardsToFileFromCards',
														'exportCardsToDirFromCards', 'duplicateCardsFromCards', 'categoriesFromCards', 'printFromCards'], false);
					if (cardbookRepository.currentCopiedEntryLabel) {
						wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], false);
						wdw_cardbook.setElementIdLabelWithBundleArray('pasteEntryFromCards', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], true);
					}
					wdw_cardbook.enableOrDisableElement(['mergeCardsFromCards'], true);
					var myDirPrefId = document.getElementById('dirPrefIdTextBox').value;
					var myCard = cardbookRepository.cardbookCards[myDirPrefId+"::"+document.getElementById('uidTextBox').value];
					if (myCard) {
						if (!myCard.isAList || cardbookPreferences.getReadOnly(myDirPrefId)) {
							wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], false);
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], false);
					}
					AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID).then(addon => {
						wdw_cardbook.cardsTreeLightningContextShowing(addon);
					});
				} else {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'shareCardsByEmailFromCards', 'localizeCardsFromCards',
														'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'exportCardsToFileFromCards',
														'exportCardsToDirFromCards', 'mergeCardsFromCards', 'duplicateCardsFromCards', 'printFromCards'], false);
					wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards', 'findEmailsFromCards', 'findEventsFromCards'], true);
					if (cardbookRepository.currentCopiedEntryLabel) {
						wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], false);
						wdw_cardbook.setElementIdLabelWithBundleArray('pasteEntryFromCards', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], true);
					}
				}
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
					if (cardbookPreferences.getEnabled(myPrefId)) {
						if (cardbookPreferences.getReadOnly(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards', 'categoriesFromCards'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'categoriesFromCards'], false);
							if (cardbookRepository.currentCopiedEntryLabel) {
								wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], false);
								wdw_cardbook.setElementIdLabelWithBundleArray('pasteEntryFromCards', 'pasteFieldValue', [ cardbookRepository.currentCopiedEntryLabel ] );
							} else {
								wdw_cardbook.enableOrDisableElement(['pasteEntryFromCards'], true);
							}
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards', 'categoriesFromCards'], true);
					}
				} else {
					wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards', 'categoriesFromCards'], true);
				}
				if (!cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled")) {
					wdw_cardbook.enableOrDisableElement(['findEmailsFromCards', 'findEventsFromCards'], true);
				}
			}
		},
	
		cardsTreeLightningContextShowing: function (addon) {
			if (addon && addon.isActive) {
				document.getElementById("findEventsFromCards").disabled = false;
			}
		},

		setCopyLabel: function (type) {
			var label = cardbookRepository.strBundle.GetStringFromName(type + 'Label');
			wdw_cardbook.setElementIdLabelWithBundleArray('copy' + type + 'Tree', 'copyFieldValue', [ label ] );
		},

		adrTreeContextShowing: function (aEvent) {
			wdw_cardbook.setCopyLabel('adr');
			aEvent.stopImmediatePropagation();
		},

		telTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('tel');
			if (document.getElementById('tel_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				wdw_cardbook.enableOrDisableElement(['connecttelTree'], false);
			} else {
				wdw_cardbook.enableOrDisableElement(['connecttelTree'], true);
			}
		},

		emailTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('email');
			wdw_cardbook.enableOrDisableElement(['findemailemailTree'], !cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled"));
			document.getElementById("findeventemailTree").setAttribute("hidden", true);
			AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID).then(addon => {
				wdw_cardbook.emailTreeLightningContextShowing(addon);
			});
		},

		emailTreeLightningContextShowing: function (addon) {
			if (addon && addon.isActive) {
				document.getElementById("findeventemailTree").removeAttribute("hidden");
			}
		},

		imppTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('impp');
			if (document.getElementById('impp_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				wdw_cardbook.enableOrDisableElement(['connectimppTree'], false);
			} else {
				wdw_cardbook.enableOrDisableElement(['connectimppTree'], true);
			}
		},

		urlTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('url');
		},

		eventTreeContextShowing: function () {
			wdw_cardbook.setCopyLabel('event');
		},

		enableCardIM: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarChatButton', 'cardbookContactsMenuIMPPCards', 'IMPPCardFromCards'], false);
			var selectedId = cardbookWindowUtils.getSelectedCardsId();
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedId], 'IMPPCardFromCardsMenuPopup')
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedId], 'cardbookContactsMenuIMPPCardsMenuPopup')
			wdw_cardbook.setElementAttribute('cardbookToolbarChatButton', 'type', 'menu-button');
			cardbookWindowUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedId], 'cardbookToolbarChatButtonMenuPopup')
		},
	
		enableCardDeletion: function () {
			if (cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.disableCardDeletion();
			} else {
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarRemoveButton', 'cardbookContactsMenuRemoveCard', 'removeCardFromCards'], false);
			}
		},
	
		enableCardCreation: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddContactButton', 'cardbookToolbarAddListButton', 'cardbookContactsMenuAddContact', 'cardbookContactsMenuAddList',
													'addContactFromCards', 'addListFromCards', 'cardbookContactsMenuDuplicateCards', 'duplicateCardsFromCards'], false);
		},
	
		enableCardModification: function () {
			if (cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.disableCardModification();
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
				if (cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.setElementIdLabelWithBundle('cardbookToolbarEditButton', "viewCardButtonLabel");
					wdw_cardbook.setElementIdLabelWithBundle('cardbookContactsMenuEditContact', "viewCardButtonLabel");
					wdw_cardbook.setElementIdLabelWithBundle('editCardFromCards', "viewCardButtonLabel");
				} else {
					wdw_cardbook.setElementIdLabelWithBundle('cardbookToolbarEditButton', "editCardButtonLabel");
					wdw_cardbook.setElementIdLabelWithBundle('cardbookContactsMenuEditContact', "editCardButtonLabel");
					wdw_cardbook.setElementIdLabelWithBundle('editCardFromCards', "editCardButtonLabel");
				}
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarEditButton', 'cardbookContactsMenuEditContact', 'editCardFromCards'], false);
			}
		},
	
		disableCardIM: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarChatButton', 'cardbookContactsMenuIMPPCards', 'IMPPCardFromCards'], true);
			wdw_cardbook.removeElementAttribute('cardbookToolbarChatButton', 'type');
		},
		
		disableCardDeletion: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarRemoveButton', 'cardbookContactsMenuRemoveCard', 'removeCardFromCards'], true);
		},
		
		disableCardCreation: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddContactButton', 'cardbookToolbarAddListButton', 'cardbookContactsMenuAddContact', 'cardbookContactsMenuAddList', 'addContactFromCards',
													'addListFromCards', 'cardbookContactsMenuDuplicateCards', 'duplicateCardsFromCards'], true);
		},
		
		disableCardModification: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarEditButton', 'cardbookContactsMenuEditContact', 'editCardFromCards'], true);
		},

		onViewToolbarsPopupShowing: function (aEvent, aToolboxArray) {
			var result = [];
			for (var i = 0; i < aToolboxArray.length; i++) {
				if (document.getElementById(aToolboxArray[i])) {
					if (aToolboxArray[i] == "cardbook-toolbox") {
						document.getElementById(aToolboxArray[i]).externalToolbars = [document.getElementById("cardbookFolderPaneToolbar")];
					}
					result.push(aToolboxArray[i]);
				}
			}
			onViewToolbarsPopupShowing(aEvent, result);
		},

		updateStatusProgressInformationField: function() {
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				if (cardbookUtils.getAvailableAccountNumber() === 0) {
					wdw_cardbook.setElementIdLabel('totalMessageCount', "");
				} else {
					if (cardbookRepository.statusInformation.length == 0) {
						wdw_cardbook.setElementIdLabel('totalMessageCount', '');
					} else if (cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0] == cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0].substr(0,50)) {
						wdw_cardbook.setElementIdLabel('totalMessageCount', cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0]);
					} else {
						wdw_cardbook.setElementIdLabel('totalMessageCount', cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0].substr(0,47) + "…");
	
					}
				}
				document.getElementById("totalMessageCount").hidden=false;
			}
		},
	
		updateStatusInformation: function() {
			if (cardbookWindowUtils.getBroadcasterOnCardBook()) {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookRepository.cardbookSearchMode === "SEARCH") {
					var myAccountId = cardbookRepository.cardbookSearchValue;
					if (cardbookRepository.cardbookDisplayCards[myAccountId]) {
						if (cardbookRepository.cardbookDisplayCards[myAccountId].modified > 0) {
							var myMessage = cardbookRepository.strBundle.formatStringFromName("numberContactsFoundModified", [cardbookRepository.cardbookDisplayCards[myAccountId].cards.length, cardbookRepository.cardbookDisplayCards[myAccountId].modified], 2);
						} else {
							var myMessage = cardbookRepository.strBundle.formatStringFromName("numberContactsFound", [cardbookRepository.cardbookDisplayCards[myAccountId].cards.length], 1);
						}
					} else {
						var myMessage = "";
					}
				} else {
					try {
						var myAccountId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountId'));
						if (cardbookRepository.cardbookDisplayCards[myAccountId].modified > 0) {
							var myMessage = cardbookRepository.strBundle.formatStringFromName("numberContactsModified", [cardbookRepository.cardbookDisplayCards[myAccountId].cards.length, cardbookRepository.cardbookDisplayCards[myAccountId].modified], 2);
						} else {
							var myMessage = cardbookRepository.strBundle.formatStringFromName("numberContacts", [cardbookRepository.cardbookDisplayCards[myAccountId].cards.length], 1);
						}
					}
					catch(e) {
						var myMessage = "";
					}
				}
				document.getElementById("statusText").hidden=false;
				document.getElementById("unreadMessageCount").hidden=true;
				wdw_cardbook.setElementIdLabel('statusText', myMessage);
			}
		},
	
		windowControlShowing: function () {
			if (cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], true);
				wdw_cardbook.disableCardCreation();
				wdw_cardbook.disableCardModification();
				wdw_cardbook.disableCardDeletion();
				wdw_cardbook.disableCardIM();
			} else {
				if (cardbookDirTree.visibleData.length == 0) {
					wdw_cardbook.disableCardCreation();
					wdw_cardbook.disableCardModification();
					wdw_cardbook.disableCardDeletion();
					wdw_cardbook.disableCardIM();
				} else if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableCardCreation();
					if (cardbookWindowUtils.getSelectedCardsCount() >= 2 || cardbookWindowUtils.getSelectedCardsCount() == 0) {
						wdw_cardbook.disableCardModification();
						wdw_cardbook.disableCardIM();
					} else {
						wdw_cardbook.enableCardModification();
						wdw_cardbook.enableCardIM();
					}
					if (cardbookWindowUtils.getSelectedCardsCount() == 0) {
						wdw_cardbook.disableCardDeletion();
					} else {
						wdw_cardbook.enableCardDeletion();
					}
					wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], !cardbookUtils.isThereNetworkAccountToSync());
				} else {
					var myTree = document.getElementById('accountsOrCatsTree');
					if (myTree.currentIndex != -1) {
						var myPrefId = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn('accountRoot'));
						if (cardbookPreferences.getEnabled(myPrefId)) {
							if (cardbookPreferences.getReadOnly(myPrefId)) {
								wdw_cardbook.disableCardCreation();
								wdw_cardbook.disableCardDeletion();
							} else {
								wdw_cardbook.enableCardCreation();
								if (cardbookWindowUtils.getSelectedCardsCount() == 0) {
									wdw_cardbook.disableCardDeletion();
								} else {
									wdw_cardbook.enableCardDeletion();
								}
							}
							if (cardbookWindowUtils.getSelectedCardsCount() >= 2 || cardbookWindowUtils.getSelectedCardsCount() == 0) {
								wdw_cardbook.disableCardModification();
								wdw_cardbook.disableCardIM();
							} else {
								wdw_cardbook.enableCardModification();
								wdw_cardbook.enableCardIM();
							}
						} else {
							wdw_cardbook.disableCardCreation();
							wdw_cardbook.disableCardModification();
							wdw_cardbook.disableCardDeletion();
							wdw_cardbook.disableCardIM();
						}
					} else {
						wdw_cardbook.disableCardCreation();
						wdw_cardbook.disableCardModification();
						wdw_cardbook.disableCardDeletion();
						wdw_cardbook.disableCardIM();
					}
					wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], !cardbookUtils.isThereNetworkAccountToSync());
				}
			}

			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddServerButton', 'cardbookToolbarConfigurationButton', 'cardbookToolbarWriteButton', 'accountsOrCatsTreeContextMenu', 'cardsTreeContextMenu',
												'cardbookAccountMenu', 'cardbookContactsMenu', 'cardbookToolsMenu', 'cardbookToolbarComplexSearch', 'cardbookToolbarPrintButton'], false);
			wdw_cardbook.updateStatusInformation();
			wdw_cardbook.updateStatusProgressInformationField();
		},

		refreshWindow: function (aParams) {
			// no need to refresh cards for others syncing dirprefid
			if (cardbookRepository.cardbookSearchMode == "SEARCH") {
				var mySyncCondition = false;
			} else if (cardbookRepository.cardbookComplexSearchMode == "SEARCH") {
				var mySyncCondition = true;
			} else {
				if (aParams) {
					if (aParams.startsWith("force::")) {
						var mySyncCondition = true;
					} else {
						var myDirPredId = cardbookUtils.getAccountId(aParams);
						var myCurrentDirPredId = cardbookUtils.getAccountId(wdw_cardbook.currentAccountId);
						var mySyncCondition = (myCurrentDirPredId == myDirPredId);
					}
				} else {
					var mySyncCondition = true;
				}
			}

			// get selected account
			var myAccountId = "";
			if (cardbookRepository.cardbookSearchMode == "SEARCH") {
				myAccountId = "";
			} else if (aParams && aParams.startsWith("force::")) {
				myAccountId = aParams.replace("force::", "");
			} else {
				myAccountId = wdw_cardbook.currentAccountId;

				// if it does not exist anymore, take the previous one
				if (!(cardbookRepository.cardbookDisplayCards[myAccountId])) {
					if (cardbookDirTree.visibleData.length != 0) {
						var myTree = document.getElementById('accountsOrCatsTree');
						if (myTree.currentIndex > 1) {
							myAccountId = myTree.view.getCellText(myTree.currentIndex - 1, myTree.columns.getNamedColumn('accountId'));
						} else if (myTree.currentIndex == 0) {
							myAccountId = myTree.view.getCellText(0, myTree.columns.getNamedColumn('accountId'));
						} else {
							myAccountId = "";
						}
					} else {
						myAccountId = "";
					}
				}
			}

			// get selected cards
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookWindowUtils.getSelectedCards();
			wdw_cardbook.refreshAccountsInDirTree();
			
			// select account back
			wdw_cardbook.selectAccountOrCat(myAccountId, listOfSelectedCard);

			// for search mode the reselection is done inside their functions
			if (mySyncCondition) {
				wdw_cardbook.clearCard();
				wdw_cardbook.sortCardsTreeCol();

				// select cards back
				if (listOfSelectedCard.length == 1) {
					if (cardbookRepository.cardbookCards[listOfSelectedCard[0].cbid]) {
						wdw_cardbook.displayCard(listOfSelectedCard[0]);
					}
				}
			}
		}

	};
};
