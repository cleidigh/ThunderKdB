if ("undefined" == typeof(wdw_cardbookContactsSidebar)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	
	var CardBookResultsPaneObserver = {
		onDragStart: function (aEvent) {
			let listOfEmails = wdw_cardbookContactsSidebar.getSelectedEmails().join(", ");
			aEvent.dataTransfer.setData("moz/abcard", listOfEmails);
			aEvent.dataTransfer.setData("moz/abcard", listOfEmails);
			aEvent.dataTransfer.setData("text/x-moz-address", listOfEmails);
			aEvent.dataTransfer.setData("text/unicode", listOfEmails);
			aEvent.dataTransfer.effectAllowed = "copyMove";
			aEvent.dataTransfer.addElement(event.originalTarget);
			aEvent.stopPropagation();
		}
	};
	
	var wdw_cardbookContactsSidebar = {
		mutationObs: null,
		searchResults: [],
		ABInclRestrictions: {},
		ABExclRestrictions: {},
		catInclRestrictions: {},
		catExclRestrictions: {},

		sortTrees: function (aEvent) {
			if (aEvent.button != 0) {
				return;
			}
			var target = aEvent.originalTarget;
			if (target.localName == "treecol") {
				wdw_cardbookContactsSidebar.sortCardsTreeCol(target, "abResultsTree");
			}
		},

		sortCardsTreeCol: function (aColumn, aTreeName) {
			var myTree = document.getElementById(aTreeName);
			if (aColumn) {
				var listOfUid = [];
				var numRanges = myTree.view.selection.getRangeCount();
				var start = new Object();
				var end = new Object();
				for (var i = 0; i < numRanges; i++) {
					myTree.view.selection.getRangeAt(i,start,end);
					for (var j = start.value; j <= end.value; j++){
						listOfUid.push(myTree.view.getCellText(j, myTree.columns.getNamedColumn(aColumn.id)));
					}
				}
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
				case "GeneratedName":
					columnArray=0;
					break;
				case "AB":
					columnArray=1;
					break;
				case "Emails":
					columnArray=2;
					break;
			}
			var myData = wdw_cardbookContactsSidebar.searchResults;

			if (myData && myData.length) {
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(myData,columnArray,order);
			}

			//setting these will make the sort option persist
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);
			
			wdw_cardbookContactsSidebar.displaySearchResults();
			
			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");

			// select back
			if (aColumn) {
				for (var i = 0; i < listOfUid.length; i++) {
					for (var j = 0; j < myTree.view.rowCount; j++) {
						if (myTree.view.getCellText(j, myTree.columns.getNamedColumn(aColumn.id)) == listOfUid[i]) {
							myTree.view.selection.rangedSelect(j,j,true);
							break;
						}
					}
				}
			}
		},

		displaySearchResults: function () {
			var abResultsTreeView = {
				get rowCount() { return wdw_cardbookContactsSidebar.searchResults.length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					if (column.id == "GeneratedName") return wdw_cardbookContactsSidebar.searchResults[idx][0];
					else if (column.id == "AB") return wdw_cardbookContactsSidebar.searchResults[idx][1];
					else if (column.id == "Emails") return wdw_cardbookContactsSidebar.searchResults[idx][2];
				},
				getRowProperties: function(idx) {
					if (wdw_cardbookContactsSidebar.searchResults[idx] && wdw_cardbookContactsSidebar.searchResults[idx][3]) {
						return "MailList";
					}
				},
				getColumnProperties: function(column) { return column.id },
				getCellProperties: function(idx, column) { return this.getRowProperties(idx) + " " +  this.getColumnProperties(column)}
			}
			document.getElementById('abResultsTree').view = abResultsTreeView;
		},
		
		isMyCardRestricted: function (aDirPrefId, aCard) {
			if (wdw_cardbookContactsSidebar.catExclRestrictions[aDirPrefId]) {
				var add = true;
				for (var l in wdw_cardbookContactsSidebar.catExclRestrictions[aDirPrefId]) {
					if (aCard.categories.includes(l)) {
						add = false;
						break;
					}
				}
				if (!add) {
					return true;
				}
			}
			if (wdw_cardbookContactsSidebar.catInclRestrictions[aDirPrefId]) {
				var add = false;
				for (var l in wdw_cardbookContactsSidebar.catInclRestrictions[aDirPrefId]) {
					if (aCard.categories.includes(l)) {
						add = true;
						break;
					}
				}
				if (!add) {
					return true;
				}
			}
			return false;
		},
		
		search: function () {
			if (document.getElementById('cardbookpeopleSearchInput').value == "") {
				document.getElementById('cardbookpeopleSearchInput').placeholder = cardbookRepository.extension.localeData.localizeMessage("cardbookSearchInputDefault");
			}
			wdw_cardbookContactsSidebar.searchResults = [];
			var searchAB = document.getElementById('CardBookABMenulist').value;
			var searchCategory = document.getElementById('categoriesMenulist').value;
			var searchInput = cardbookRepository.makeSearchString(document.getElementById('cardbookpeopleSearchInput').value);
			var useOnlyEmail = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5]) {
					var myDirPrefId = account[4];
					if (account[6] != "SEARCH") {
						if (cardbookRepository.verifyABRestrictions(myDirPrefId, searchAB, wdw_cardbookContactsSidebar.ABExclRestrictions, wdw_cardbookContactsSidebar.ABInclRestrictions)) {
							var myDirPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(myDirPrefId);
							// All No Only categories
							if ((searchCategory === "allCategories") || (searchCategory === "noCategory") || (searchCategory === "onlyCategories")) {
								if (searchCategory !== "onlyCategories") {
									for (var j in cardbookRepository.cardbookCardLongSearch[myDirPrefId]) {
										if (j.includes(searchInput) || searchInput == "") {
											for (let card of cardbookRepository.cardbookCardLongSearch[myDirPrefId][j]) {
												if (wdw_cardbookContactsSidebar.isMyCardRestricted(myDirPrefId, card)) {
													continue;
												}
												if (card.isAList) {
													wdw_cardbookContactsSidebar.searchResults.push([cardbookRepository.cardbookUtils.getName(card), myDirPrefName,"", true, "LISTCARDBOOK", card, MailServices.headerParser.makeMimeAddress(card.fn, card.fn), '']);
												} else {
													if (card.emails != "") {
														var myFormattedEmails = [];
														myFormattedEmails = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([card], useOnlyEmail);
														wdw_cardbookContactsSidebar.searchResults.push([cardbookRepository.cardbookUtils.getName(card), myDirPrefName, card.emails.join(', '), false, "CARDCARDBOOK", card, myFormattedEmails.join('@@@@@'), '']);
													}
												}
											}
										}
									}
								}
								if (searchCategory !== "noCategory") {
									for (let category of cardbookRepository.cardbookAccountsCategories[myDirPrefId]) {
										if (cardbookRepository.verifyCatRestrictions(myDirPrefId, category, searchInput, wdw_cardbookContactsSidebar.ABExclRestrictions,
																					wdw_cardbookContactsSidebar.catExclRestrictions, wdw_cardbookContactsSidebar.catInclRestrictions)) {
											var myEmails = [] ;
											var myFormattedEmails = [];
											for (let card of cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+category].cards) {
												if (card.isAList) {
													myEmails.push(card.fn);
													myFormattedEmails.push(MailServices.headerParser.makeMimeAddress(card.fn, card.fn));
												} else {
													myEmails = myEmails.concat(card.emails);
													myFormattedEmails = myFormattedEmails.concat(cardbookRepository.cardbookUtils.getMimeEmailsFromCards([card], useOnlyEmail));
												}
											}
											if (myEmails != "") {
												wdw_cardbookContactsSidebar.searchResults.push([category, myDirPrefName, myEmails.join(', '), true, "CATCARDBOOK", myDirPrefId+"::categories::"+category, myFormattedEmails.join('@@@@@'), '']);
											}
										}
									}
								}
							// One category
							} else {
								var myCategory = cardbookRepository.cardbookUtils.getNodeName(searchCategory);
								function searchArray(element) {
									return element == myCategory;
								};
								for (var j in cardbookRepository.cardbookCardLongSearch[myDirPrefId]) {
									if (j.includes(searchInput) || searchInput == "") {
										for (let card of cardbookRepository.cardbookCardLongSearch[myDirPrefId][j]) {
											if (((card.categories.find(searchArray) != undefined) && (cardbookRepository.cardbookUncategorizedCards != myCategory))
												|| ((card.categories.length == 0) && (cardbookRepository.cardbookUncategorizedCards == myCategory))) {
												if (wdw_cardbookContactsSidebar.catExclRestrictions[myDirPrefId]) {
													var add = true;
													for (var l in wdw_cardbookContactsSidebar.catExclRestrictions[myDirPrefId]) {
														if (card.categories.includes(l)) {
															add = false;
															break;
														}
													}
													if (!add) {
														continue;
													}
												}
												if (card.isAList) {
													wdw_cardbookContactsSidebar.searchResults.push([cardbookRepository.cardbookUtils.getName(card), myDirPrefName,"", true, "LISTCARDBOOK", card, MailServices.headerParser.makeMimeAddress(card.fn, card.fn), '']);
												} else {
													if (card.emails != "") {
														var myFormattedEmails = [];
														myFormattedEmails = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([card], useOnlyEmail);
														wdw_cardbookContactsSidebar.searchResults.push([cardbookRepository.cardbookUtils.getName(card), myDirPrefName, card.emails.join(', '), false, "CARDCARDBOOK", card, myFormattedEmails.join('@@@@@'), '']);
													}
												}
											}
										}
									}
								}
								if (cardbookRepository.makeSearchString(myCategory).includes(searchInput) || searchInput == "") {
									var myEmails = [] ;
									var myFormattedEmails = [];
									for (let card of cardbookRepository.cardbookDisplayCards[searchCategory].cards) {
										if (wdw_cardbookContactsSidebar.catExclRestrictions[myDirPrefId]) {
											var add = true;
											for (var l in wdw_cardbookContactsSidebar.catExclRestrictions[myDirPrefId]) {
												if (card.categories.includes(l)) {
													add = false;
													break;
												}
											}
											if (!add) {
												continue;
											}
										}
										if (card.isAList) {
											myEmails.push(card.fn);
											myFormattedEmails.push(MailServices.headerParser.makeMimeAddress(card.fn, card.fn));
										} else {
											myEmails = myEmails.concat(card.emails);
											myFormattedEmails = myFormattedEmails.concat(cardbookRepository.cardbookUtils.getMimeEmailsFromCards([card], useOnlyEmail));
										}
									}
									if (myEmails != "") {
										wdw_cardbookContactsSidebar.searchResults.push([myCategory, myDirPrefName, myEmails.join(', '), true, "CATCARDBOOK", searchCategory, myFormattedEmails.join('@@@@@'), '']);
									}
								}
							}
						}
					// complex searches
					} else if ((account[6] === "SEARCH") && ((searchAB == myDirPrefId))) {
						if (cardbookRepository.verifyABRestrictions(myDirPrefId, searchAB, wdw_cardbookContactsSidebar.ABExclRestrictions, wdw_cardbookContactsSidebar.ABInclRestrictions)) {
							// first add cards
							if ((searchCategory === "allCategories") || (searchCategory === "noCategory") || (searchCategory === "onlyCategories")) {
								for (let card of cardbookRepository.cardbookDisplayCards[myDirPrefId].cards) {
									// All No categories
									if (searchCategory !== "onlyCategories") {
										var myDirPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(card.dirPrefId);
										if (cardbookRepository.getLongSearchString(card).includes(searchInput) || searchInput == "") {
											if (wdw_cardbookContactsSidebar.iscardRestricted(myDirPrefId, card)) {
												continue;
											}
											if (card.isAList) {
												wdw_cardbookContactsSidebar.searchResults.push([cardbookRepository.cardbookUtils.getName(card), myDirPrefName,"", true, "LISTCARDBOOK", card, MailServices.headerParser.makeMimeAddress(card.fn, card.fn), '']);
											} else {
												if (card.emails != "") {
													var myFormattedEmails = [];
													myFormattedEmails = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([card], useOnlyEmail);
													wdw_cardbookContactsSidebar.searchResults.push([cardbookRepository.cardbookUtils.getName(card), myDirPrefName, card.emails.join(', '), false, "CARDCARDBOOK", card, myFormattedEmails.join('@@@@@'), '']);
												}
											}
										}
									}
								}
							// one category
							} else {
								var myCategory = cardbookRepository.cardbookUtils.getNodeName(searchCategory);
								for (let card of cardbookRepository.cardbookDisplayCards[myDirPrefId+'::categories::'+myCategory].cards) {
									var myDirPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(card.dirPrefId);
									// All No categories
									if (searchCategory !== "onlyCategories") {
										if (cardbookRepository.getLongSearchString(card).includes(searchInput) || searchInput == "") {
											if (wdw_cardbookContactsSidebar.iscardRestricted(myDirPrefId, card)) {
												continue;
											}
											if (card.isAList) {
												wdw_cardbookContactsSidebar.searchResults.push([cardbookRepository.cardbookUtils.getName(card), myDirPrefName,"", true, "LISTCARDBOOK", card, MailServices.headerParser.makeMimeAddress(card.fn, card.fn), '']);
											} else {
												if (card.emails != "") {
													var myFormattedEmails = [];
													myFormattedEmails = cardbookRepository.cardbookUtils.getMimeEmailsFromCards([card], useOnlyEmail);
													wdw_cardbookContactsSidebar.searchResults.push([cardbookRepository.cardbookUtils.getName(card), myDirPrefName, card.emails.join(', '), false, "CARDCARDBOOK", card, myFormattedEmails.join('@@@@@'), '']);
												}
											}
										}
									}
								}
							}
						}
						// then add categories
						if (searchCategory !== "noCategory") {
							for (let category of cardbookRepository.cardbookAccountsCategories[myDirPrefId]) {
								if (cardbookRepository.verifyCatRestrictions(myDirPrefId, category, searchInput, wdw_cardbookContactsSidebar.ABExclRestrictions,
																			wdw_cardbookContactsSidebar.catExclRestrictions, wdw_cardbookContactsSidebar.catInclRestrictions)) {
									if ((searchCategory !== "allCategories") && (searchCategory !== "noCategory") && (searchCategory !== "onlyCategories")) {
										if (myDirPrefId+'::categories::'+category != searchCategory) {
											continue;
										}
									}
									var myEmails = [] ;
									var myFormattedEmails = [];
									for (let card of cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+category].cards) {
										if (card.isAList) {
											myEmails.push(card.fn);
											myFormattedEmails.push(MailServices.headerParser.makeMimeAddress(card.fn, card.fn));
										} else {
											myEmails = myEmails.concat(card.emails);
											myFormattedEmails = myFormattedEmails.concat(cardbookRepository.cardbookUtils.getMimeEmailsFromCards([card], useOnlyEmail));
										}
									}
									if (myEmails != "") {
										wdw_cardbookContactsSidebar.searchResults.push([category, myDirPrefName, myEmails.join(', '), true, "CATCARDBOOK", myDirPrefId+"::categories::"+category, myFormattedEmails.join('@@@@@'), '']);
									}
								}
							}
						}
						break;
					}
				}
			}
			if (!cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
				var lastnamefirst = Services.prefs.getIntPref("mail.addr_book.lastnamefirst");
				for (let addrbook of MailServices.ab.directories) {
					if (cardbookRepository.verifyABRestrictions(addrbook.dirPrefId, searchAB, wdw_cardbookContactsSidebar.ABExclRestrictions, wdw_cardbookContactsSidebar.ABInclRestrictions)) {
						for (let myABCard of addrbook.childCards) {					
							var myEmails = myABCard.getProperty("PrimaryEmail","");
							var myDisplayName = myABCard.generateName(lastnamefirst);
							if (!myABCard.isMailList) {
								if (myEmails != "") {
									var lSearchString = myABCard.getProperty("FirstName","") + myABCard.getProperty("LastName","") + myDisplayName + myABCard.getProperty("NickName","") + myEmails;
									lSearchString = cardbookRepository.makeSearchString(lSearchString);
									if (lSearchString.includes(searchInput) || searchInput == "") {
										if (myDisplayName == "") {
											var delim = myEmails.indexOf("@",0);
											myDisplayName = myEmails.substr(0,delim);
										}
										if (useOnlyEmail) {
											wdw_cardbookContactsSidebar.searchResults.push([myDisplayName, addrbook.dirName, myEmails, false, "CARDCORE", myABCard, myEmails, addrbook.dirPrefId]);
										} else {
											wdw_cardbookContactsSidebar.searchResults.push([myDisplayName, addrbook.dirName, myEmails, false, "CARDCORE", myABCard, MailServices.headerParser.makeMimeAddress(myDisplayName, myEmails), addrbook.dirPrefId]);
										}
									}
								}
							} else {
								var myABList = MailServices.ab.getDirectory(myABCard.mailListURI);
								var lSearchString = myDisplayName + myABList.listNickName + myABList.description;
								lSearchString = cardbookRepository.makeSearchString(lSearchString);
								if (lSearchString.includes(searchInput) || searchInput == "") {
										wdw_cardbookContactsSidebar.searchResults.push([myDisplayName, addrbook.dirName, "", true, "LISTCORE", myABCard, MailServices.headerParser.makeMimeAddress(myDisplayName, myDisplayName), addrbook.dirPrefId]);
								}
							}
						}
					}
				}
			}
			wdw_cardbookContactsSidebar.sortCardsTreeCol(null, "abResultsTree");
		},

		addEmails: function (aType) {
			var listOfEmails = wdw_cardbookContactsSidebar.getSelectedEmails();
			parent.awAddRecipientsArray(aType, listOfEmails);
		},

		startDrag: function (aEvent) {
			try {
				var listOfEmails = wdw_cardbookContactsSidebar.getSelectedEmails();
				for (var i = 0; i < listOfEmails.length; i++) {
					aEvent.dataTransfer.mozSetDataAt("text/plain", listOfEmails[i], i);
				}
				// aEvent.dataTransfer.setData("text/plain", listOfEmails);
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_cardbookContactsSidebar.startDrag error : " + e, "Error");
			}
		},

		getSelectedEmails: function () {
			var myTree = document.getElementById('abResultsTree');
			var listOfEmails = [];
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			for (var i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (var j = start.value; j <= end.value; j++){
					var allEmails = [];
					allEmails = wdw_cardbookContactsSidebar.searchResults[j][6].split('@@@@@');
					for (var k = 0; k < allEmails.length; k++) {
						listOfEmails.push(allEmails[k]);
					}
				}
			}
			return listOfEmails;
		},

		getSelectedCards: function () {
			var myTree = document.getElementById('abResultsTree');
			var listOfUid = [];
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			for (var i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (var j = start.value; j <= end.value; j++){
					listOfUid.push([wdw_cardbookContactsSidebar.searchResults[j][4], wdw_cardbookContactsSidebar.searchResults[j][5], wdw_cardbookContactsSidebar.searchResults[j][7]]);
				}
			}
			return listOfUid;
		},

		doubleClickCardsTree: function (aEvent) {
			var myTree = document.getElementById('abResultsTree');
			if (myTree.currentIndex != -1) {
				var cell = myTree.getCellAt(aEvent.clientX, aEvent.clientY);
				if (cell.row != -1) {
					wdw_cardbookContactsSidebar.addEmails('addr_to');
				}
			}
		},

		deleteCard: function () {
			var listOfUid = wdw_cardbookContactsSidebar.getSelectedCards();
			var AB =  MailServices.ab.getDirectoryFromId(listOfUid[0][2]);
			for (var i = 0; i < listOfUid.length; i++) {
				if (listOfUid[i][0] === "CARDCARDBOOK" || listOfUid[i][0] === "LISTCARDBOOK") {
					wdw_cardbook.deleteCardsAndValidate([listOfUid[i][1]]);
				} else if (listOfUid[i][0] === "CATCARDBOOK") {
					var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(listOfUid[i][1]);
					var myCategory = cardbookRepository.cardbookUtils.getNodeName(listOfUid[i][1]);
					wdw_cardbook.removeNode(myDirPrefId, listOfUid[i][1], myCategory, "categories", false);
				} else if (listOfUid[i][0] === "LISTCORE") {
					gAddressBookBundle = document.getElementById("bundle_addressBook");
					var myCard = listOfUid[i][1];
					AbDeleteDirectory(myCard.mailListURI);
				} else if (listOfUid[i][0] === "CARDCORE") {
					gAddressBookBundle = document.getElementById("bundle_addressBook");
					var myCard = listOfUid[i][1];
					try {
						var confirmDeleteMessage = gAddressBookBundle.getString("confirmDeleteContact");
						var confirmDeleteTitle = null;
					}
					// for new Thunderbird versions
					catch (e) {
						var confirmDeleteMessage = gAddressBookBundle.getString("confirmDeleteThisContact");
						confirmDeleteMessage = confirmDeleteMessage.replace("#1", myCard.displayName);
						var confirmDeleteTitle = gAddressBookBundle.getString("confirmDeleteThisContactTitle");
					}
					if (Services.prompt.confirm(window, confirmDeleteTitle, confirmDeleteMessage)) {
						let cardArray = Components.classes["@mozilla.org/array;1"].createInstance(Components.interfaces.nsIMutableArray);
						cardArray.appendElement(myCard, false);
						AB.deleteCards(cardArray);
					}
				}
			}
			wdw_cardbookContactsSidebar.search();
		},

		editCard: function () {
			var listOfUid = wdw_cardbookContactsSidebar.getSelectedCards();
			if (listOfUid[0][0] === "CARDCARDBOOK" || listOfUid[0][0] === "LISTCARDBOOK") {
				var myCard = listOfUid[0][1];
				var myOutCard = new cardbookCardParser();
				cardbookRepository.cardbookUtils.cloneCard(myCard, myOutCard);
				if (myOutCard.isAList) {
					var myType = "List";
				} else {
					var myType = "Contact";
				}
				if (cardbookRepository.cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					cardbookWindowUtils.openEditionWindow(myOutCard, "View" + myType);
				} else {
					cardbookWindowUtils.openEditionWindow(myOutCard, "Edit" + myType);
				}
			} else if (listOfUid[0][0] === "CARDCORE") {
				var AB =  MailServices.ab.getDirectoryFromId(listOfUid[0][2]);
				var myCard = listOfUid[0][1];
				goEditCardDialog(AB.URI, myCard);
			} else if (listOfUid[0][0] === "LISTCORE") {
				var myCard = listOfUid[0][1];
				try {
					goEditListDialog(myCard, myCard.mailListURI);
				}
				catch (e) {
				}
			} else if (listOfUid[0][0] === "CATCARDBOOK") {
				var myTmpArray = listOfUid[0][1].split("::");
				var myDirPrefId = myTmpArray[0];
				var myNodeName = myTmpArray[myTmpArray.length - 1];
				var myNodeType = myTmpArray[1];
				wdw_cardbook.renameNode(myDirPrefId, listOfUid[0][1], myNodeName, myNodeType, true);
			}
			wdw_cardbookContactsSidebar.search();
		},

		newCard: function () {
			var myNewCard = new cardbookCardParser();
			myNewCard.dirPrefId = document.getElementById('CardBookABMenulist').value
			cardbookWindowUtils.openEditionWindow(myNewCard, "CreateContact");
		},

		newList: function () {
			var myNewCard = new cardbookCardParser();
			myNewCard.isAList = true;
			myNewCard.dirPrefId = document.getElementById('CardBookABMenulist').value
			cardbookWindowUtils.openEditionWindow(myNewCard, "CreateList");
		},

		selectAllKey: function () {
			var myTree = document.getElementById('abResultsTree');
			myTree.view.selection.selectAll();
		},

		cardPropertiesMenuContextShowing: function () {
			if (cardbookWindowUtils.displayColumnsPicker()) {
				wdw_cardbookContactsSidebar.cardPropertiesMenuContextShowingNext();
				return true;
			} else {
				return false;
			}
		},

		cardPropertiesMenuContextShowingNext: function () {
			var listOfUid = wdw_cardbookContactsSidebar.getSelectedCards();
			if (listOfUid.length != 0) {
				if (listOfUid.length != 1) {
					document.getElementById("editCard").disabled=true;
				} else {
					if (listOfUid[0][0] == "CATCARDBOOK") {
						var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(listOfUid[0][1]);
						if (cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
							wdw_cardbookContactsSidebar.disableCardModification();
						} else if (listOfUid[0][1] == myDirPrefId + "::categories::" + cardbookRepository.cardbookUncategorizedCards) {
							wdw_cardbookContactsSidebar.disableCardDeletion();
						} else {
							wdw_cardbookContactsSidebar.enableCardModification();
						}
					} else if (listOfUid[0][0] == "CARDCARDBOOK" || listOfUid[0][0] == "LISTCARDBOOK") {
						var myDirPrefId = listOfUid[0][1].dirPrefId;
						if (cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId)) {
							wdw_cardbookContactsSidebar.disableCardModification();
						} else {
							wdw_cardbookContactsSidebar.enableCardModification();
						}
					} else {
						wdw_cardbookContactsSidebar.enableCardModification();
					}
				}
				document.getElementById("toEmail").disabled=false;
				document.getElementById("ccEmail").disabled=false;
				document.getElementById("bccEmail").disabled=false;
				document.getElementById("replytoEmail").disabled=false;
			} else {
				document.getElementById("toEmail").disabled=true;
				document.getElementById("ccEmail").disabled=true;
				document.getElementById("bccEmail").disabled=true;
				document.getElementById("replytoEmail").disabled=true;
				wdw_cardbookContactsSidebar.disableCardModification();
			}
		},

		disableCardDeletion: function () {
			document.getElementById("editCard").disabled=false;
			document.getElementById("deleteCard").disabled=true;
		},
		
		disableCardModification: function () {
			document.getElementById("editCard").disabled=true;
			document.getElementById("deleteCard").disabled=true;
		},
		
		enableCardModification: function () {
			document.getElementById("editCard").disabled=false;
			document.getElementById("deleteCard").disabled=false;
		},
		
		loadPanel: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			if (location.search == "?focus") {
				document.getElementById("cardbookpeopleSearchInput").focus();
			}
			document.getElementById("abContextMenuButton").hidden=false;
			cardBookSideBarObserver.register();
			cardBookSideBarPrefObserver.register();
			document.title = parent.document.getElementById("sidebar-title").value;
			wdw_cardbookContactsSidebar.loadAB();
		},
		
		unloadPanel: function () {
			cardBookSideBarObserver.unregister();
			cardBookSideBarPrefObserver.unregister();
		},
		
		loadRestrictions: async function () {
			let result = [];
			let composeWindow = Services.wm.getMostRecentWindow("msgcompose");
			let identityId = composeWindow.document.getElementById("msgIdentity").selectedItem.getAttribute("identitykey");
			result = cardbookRepository.cardbookPreferences.getAllRestrictions();
			wdw_cardbookContactsSidebar.ABInclRestrictions = {};
			wdw_cardbookContactsSidebar.ABExclRestrictions = {};
			wdw_cardbookContactsSidebar.catInclRestrictions = {};
			wdw_cardbookContactsSidebar.catExclRestrictions = {};
			for (var i = 0; i < result.length; i++) {
				var resultArray = result[i];
				if ((resultArray[0] == "true") && (resultArray[3] != "") && ((resultArray[2] == identityId) || (resultArray[2] == "allMailAccounts"))) {
					if (resultArray[1] == "include") {
						wdw_cardbookContactsSidebar.ABInclRestrictions[resultArray[3]] = 1;
						if (resultArray[4]) {
							if (!(wdw_cardbookContactsSidebar.catInclRestrictions[resultArray[3]])) {
								wdw_cardbookContactsSidebar.catInclRestrictions[resultArray[3]] = {};
							}
							wdw_cardbookContactsSidebar.catInclRestrictions[resultArray[3]][resultArray[4]] = 1;
						}
					} else {
						if (resultArray[4]) {
							if (!(wdw_cardbookContactsSidebar.catExclRestrictions[resultArray[3]])) {
								wdw_cardbookContactsSidebar.catExclRestrictions[resultArray[3]] = {};
							}
							wdw_cardbookContactsSidebar.catExclRestrictions[resultArray[3]][resultArray[4]] = 1;
						} else {
							wdw_cardbookContactsSidebar.ABExclRestrictions[resultArray[3]] = 1;
						}
					}
				}
			}
			wdw_cardbookContactsSidebar.ABInclRestrictions["length"] = cardbookRepository.cardbookUtils.sumElements(wdw_cardbookContactsSidebar.ABInclRestrictions);
		},
		
		loadAB: function () {
			wdw_cardbookContactsSidebar.loadRestrictions();
			var ABList = document.getElementById('CardBookABMenulist');
			var ABPopup = document.getElementById('CardBookABMenupopup');
			if (ABList.value) {
				var ABDefaultValue = ABList.value;
			} else {
				var ABDefaultValue = 0;
			}
			cardbookElementTools.loadAddressBooks(ABPopup, ABList, ABDefaultValue, cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive"), true, true, true, false,
													wdw_cardbookContactsSidebar.ABInclRestrictions, wdw_cardbookContactsSidebar.ABExclRestrictions);
			wdw_cardbookContactsSidebar.onABChange();
			
			document.getElementById('cardbookpeopleSearchInput').placeholder = cardbookRepository.extension.localeData.localizeMessage("cardbookSearchInputDefault");
		},
		
		onABChange: function (aParams) {
			// no need to refresh cards for others syncing dirprefid
			if (aParams) {
				var myABValue = document.getElementById('CardBookABMenulist').value;
				var myDirPrefId = cardbookRepository.cardbookUtils.getAccountId(aParams);
				var mySyncCondition = (myABValue == myDirPrefId || myABValue == "allAddressBooks");
			} else {
				var mySyncCondition = true;
			}
			if (mySyncCondition) {
				var addrbookColumn = document.getElementById("AB");
				if (document.getElementById('CardBookABMenulist').value != "allAddressBooks" && document.getElementById('CardBookABMenulist').selectedItem.getAttribute("ABtype") != "search") {
					addrbookColumn.setAttribute('hidden', 'true');
					addrbookColumn.setAttribute('ignoreincolumnpicker', "true");
				} else {
					addrbookColumn.removeAttribute('hidden');
					addrbookColumn.removeAttribute('ignoreincolumnpicker');
				}
	
				var ABList = document.getElementById('CardBookABMenulist');
				if (ABList.value) {
					var ABDefaultValue = ABList.value;
				} else {
					var ABDefaultValue = 0;
				}
				var categoryList = document.getElementById('categoriesMenulist');
				if (categoryList.value) {
					var categoryDefaultValue = categoryList.value;
				} else {
					var categoryDefaultValue = 0;
				}
				cardbookElementTools.loadCategories("categoriesMenupopup", "categoriesMenulist", ABDefaultValue, categoryDefaultValue, true, true, true, false,
													wdw_cardbookContactsSidebar.catInclRestrictions, wdw_cardbookContactsSidebar.catExclRestrictions);
				
				if (document.getElementById('categoriesMenulist').itemCount == 3) {
					document.getElementById('categoriesPickerLabel').setAttribute('hidden', 'true');
					document.getElementById('categoriesMenulist').setAttribute('hidden', 'true');
				} else {
					document.getElementById('categoriesPickerLabel').removeAttribute('hidden');
					document.getElementById('categoriesMenulist').removeAttribute('hidden');
				}
			
				wdw_cardbookContactsSidebar.search();
			}
		},

		onSearchEntered: function () {
			var myABValue = document.getElementById('CardBookABMenulist').value;
			if (myABValue != "allAddressBooks") {
				if (document.getElementById('CardBookABMenulist').selectedItem.getAttribute('ABtype') == "standard-abook") {
					wdw_cardbookContactsSidebar.search();
				} else {
					if (!cardbookRepository.cardbookPreferences.getDBCached(myABValue) && cardbookRepository.cardbookUtils.isMyAccountRemote(cardbookRepository.cardbookPreferences.getType(myABValue))) {
						var mySearchValue = document.getElementById('cardbookpeopleSearchInput').value;
						if (cardbookRepository.cardbookUtils.isMyAccountSyncing(myABValue) || mySearchValue == "") {
							return;
						}
						cardbookRepository.cardbookPreferences.setLastSearch(myABValue, mySearchValue);
						cardbookRepository.cardbookSynchronization.searchRemote(myABValue, mySearchValue);
					} else {
						wdw_cardbookContactsSidebar.search();
					}
				}
			} else {
				wdw_cardbookContactsSidebar.search();
			}
		},

		// works only when the restrictions are changed
		onRestrictionsChanged: function () {
			wdw_cardbookContactsSidebar.loadAB();
		},

		onIdentityChanged: function () {
			wdw_cardbookContactsSidebar.loadAB();
		},

		onCategoryChange: function () {
			wdw_cardbookContactsSidebar.search();
		}

	}
};
