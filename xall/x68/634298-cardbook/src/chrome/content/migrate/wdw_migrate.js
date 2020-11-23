if ("undefined" == typeof(wdw_migrate)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	try {
		// import categories
		let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
		loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");
	} catch (e) {}
	Services.scriptloader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js", this);

	var wdw_migrate = {

		allLists : {},

		translateStandardCards: function (aDirPrefIdTarget, aDirPrefIdTargetName, aABCard, aVersion, aDateFormat) {
			try {
				var myCard = new cardbookCardParser();
				myCard.dirPrefId = aDirPrefIdTarget;
				myCard.version = aVersion;
				var myMap = [ ["FirstName", "firstname"], ["LastName", "lastname"], ["DisplayName", "fn"], ["NickName", "nickname"], ["JobTitle", "title"], ["Notes", "note"] ];
				for (let i = 0; i < myMap.length; i++) {
					var myMapData = aABCard.getProperty(myMap[i][0],"");
					myCard[myMap[i][1]] = myMapData;
				}
				let listOfChangedFields = [ ["Custom1", "X-CUSTOM1"], ["Custom2", "X-CUSTOM2"], ["Custom3", "X-CUSTOM3"], ["Custom4", "X-CUSTOM4"],
											["PhoneticFirstName", "X-PHONETIC-FIRST-NAME"], ["PhoneticLastName", "X-PHONETIC-LAST-NAME"] ];
				for (let i = 0; i < listOfChangedFields.length; i++) {
					let myField = listOfChangedFields[i][0];
					let myNewField = listOfChangedFields[i][1];
					var myMapData = aABCard.getProperty(myField ,"");
					if (myMapData != "") {
						myCard.others.push(myNewField + ":" + myMapData);
						if (!cardbookRepository.possibleCustomFields[myNewField].add && !cardbookRepository.possibleCustomFields[myNewField].added) {
							cardbookRepository.possibleCustomFields[myNewField].add = true;
						}
					}
				}
								
				var myDep = aABCard.getProperty("Department","");
				var myOrg = aABCard.getProperty("Company","");
				if (myDep != "") {
					if (myOrg != "") {
						myCard.org = myDep + " - " + myOrg;
					} else {
						myCard.org = myDep;
					}
				} else {
					if (myOrg != "") {
						myCard.org = myOrg;
					}
				}
				
				var myListMap = [ ["PrimaryEmail", ["TYPE=PREF" , "TYPE=HOME"] , "email"], ["SecondEmail", ["TYPE=HOME"], "email"], ["WorkPhone", ["TYPE=WORK"], "tel"], ["HomePhone", ["TYPE=HOME"], "tel"],
								  ["FaxNumber", ["TYPE=FAX"], "tel"], ["PagerNumber", ["TYPE=PAGER"], "tel"], ["CellularNumber", ["TYPE=CELL"], "tel"], ["WebPage1", ["TYPE=WORK"], "url"],
								  ["WebPage2", ["TYPE=HOME"], "url"] ];
				for (var i = 0; i < myListMap.length; i++) {
					var myMapData = aABCard.getProperty(myListMap[i][0],"");
					var myPreferDisplayName = aABCard.getProperty("PreferDisplayName","1");
					if (myMapData != "") {
						myCard[myListMap[i][2]].push([[myMapData], myListMap[i][1], "", []]);
						if (myListMap[i][2] == "email" && myPreferDisplayName == "0") {
							cardbookRepository.cardbookPreferDisplayNameIndex[myMapData.toLowerCase()] = 1
						}
					}
				}

				var myAdrMap = [ [ [ ["HomeAddress", "HomeAddress2"], "HomeCity", "HomeState", "HomeZipCode", "HomeCountry"], ["TYPE=HOME"] ],
								 [ [ ["WorkAddress", "WorkAddress2"], "WorkCity", "WorkState", "WorkZipCode", "WorkCountry"], ["TYPE=WORK"] ] ];
				for (var i = 0; i < myAdrMap.length; i++) {
					var lString = "";
					var myAdr = ["", ""];
					for (var j = 0; j < myAdrMap[i][0][0].length; j++) {
						var myProp = aABCard.getProperty(myAdrMap[i][0][0][j],"");
						if (myProp != "") {
							if (lString != "") {
								lString = lString + "\n" + myProp;
							} else {
								lString = myProp;
							}
						}
					}
					myAdr.push(lString);
					for (var j = 1; j < myAdrMap[i][0].length; j++) {
						myAdr.push(aABCard.getProperty(myAdrMap[i][0][j],""));
					}
					if (cardbookRepository.cardbookUtils.notNull(myAdr, "") != "") {
						myCard.adr.push([myAdr, myAdrMap[i][1], "", []]);
					}
				}
				
				var day = aABCard.getProperty("BirthDay", "");
				var month = aABCard.getProperty("BirthMonth", "");
				var year = aABCard.getProperty("BirthYear", "");
				if (day != "" || month != "" || year != "" ) {
					myCard.bday = cardbookRepository.cardbookDates.convertDateStringToDateString(day, month, year, aDateFormat)
				}

				var photoURI = aABCard.getProperty("PhotoURI", "");
				var photoType = aABCard.getProperty("PhotoType", "");
				if (photoType == "file") {
					var myFileURI = Services.io.newURI(photoURI, null, null);
					myCard.photo.extension = cardbookRepository.cardbookUtils.getFileExtension(photoURI);
					myCard.photo.value = cardbookRepository.cardbookUtils.getFileBinary(myFileURI);
				} else if (photoType == "web") {
					myCard.photo.extension = cardbookRepository.cardbookUtils.getFileExtension(photoURI);
					myCard.photo.URI = photoURI;
				}
				wdw_migrate.getNotNullFn(myCard, aABCard);
				
				// import categories
				try {
					let catsArray = [];
					catsArray = jbCatMan.getCategoriesfromCard(aABCard);
					let finalcatArray = [];
					for (let cat of catsArray) {
						finalcatArray = finalcatArray.concat(cat.split(" / "));
					}
					cardbookRepository.cardbookUtils.sortArrayByString(finalcatArray,1);
					finalcatArray = cardbookRepository.arrayUnique(finalcatArray);
					myCard.categories = JSON.parse(JSON.stringify(finalcatArray));
				} catch (e) {}
				
				cardbookRepository.saveCard({}, myCard, "", true);

				var email = aABCard.getProperty("PrimaryEmail", "");
				var emailValue = aABCard.getProperty("PopularityIndex", "0");
				if (email != "" && emailValue != "0" && emailValue != " ") {
					cardbookRepository.cardbookMailPopularityIndex[email] = emailValue;
				}

				cardbookRepository.cardbookServerSyncDone[aDirPrefIdTarget]++;
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_migrate.translateStandardCards error : " + e, "Error");
				cardbookRepository.cardbookServerSyncError[aDirPrefIdTarget]++;
				cardbookRepository.cardbookServerSyncDone[aDirPrefIdTarget]++;
			}
		},

		getSolvedListNumber: function () {
			var result = 0;
			for (let i in wdw_migrate.allLists) {
				if (wdw_migrate.allLists[i].solved) {
					result++;
				}
			}
			return result;
		},

		mayTheListBeResolved: function (aABList) {
			try {
				for (let card of aABList.childCards) {
					var myABCard = card.QueryInterface(Components.interfaces.nsIAbCard);
					var myEmail = myABCard.primaryEmail;
					var myName = myABCard.getProperty("DisplayName","");
					if ((myName == myEmail) && wdw_migrate.allLists[myName]) {
						if (!wdw_migrate.allLists[myName].solved) {
							return false;
						}
					}
				}
				return true
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_migrate.mayTheListBeResolved error : " + e, "Error");
				return false;
			}
		},

		translateStandardLists: function (aDirPrefIdTarget, aDirPrefIdTargetName, aVersion) {
			try {
				var myBeforeNumber = wdw_migrate.getSolvedListNumber();
				var myAfterNumber = 0;
				var myCondition = true;
				// loop until all lists may be solved
				while (myCondition) {
					for (listName in wdw_migrate.allLists) {
						if (!wdw_migrate.allLists[listName].solved && wdw_migrate.mayTheListBeResolved(wdw_migrate.allLists[listName].list)) {
							var myList = wdw_migrate.allLists[listName].list;
							var myCard = new cardbookCardParser();
							myCard.dirPrefId = aDirPrefIdTarget;
							myCard.version = aVersion;
							var myMap = [ ["dirName", "fn"], ["listNickName", "nickname"], ["description", "note"] ];
							for (var i = 0; i < myMap.length; i++) {
								myCard[myMap[i][1]] = myList[myMap[i][0]];
							}
							var myTargetMembers = [];
							for (let card of myList.childCards) {
								var myABCard = card.QueryInterface(Components.interfaces.nsIAbCard);
								var myEmail = myABCard.primaryEmail;
								var myLowerEmail = myEmail.toLowerCase();
								var myName = myABCard.getProperty("DisplayName","");
								try {
									// within a standard list all members are simple cards… weird…
									if ((myName == myEmail) && wdw_migrate.allLists[myName] && wdw_migrate.allLists[myName].solved) {
										myTargetMembers.push("urn:uuid:" + wdw_migrate.allLists[myName].uid);
									} else if (cardbookRepository.cardbookCardEmails[aDirPrefIdTarget][myLowerEmail]) {
										var myTargetCard = cardbookRepository.cardbookCardEmails[aDirPrefIdTarget][myLowerEmail][0];
										myTargetMembers.push("urn:uuid:" + myTargetCard.uid);
									}
								}
								catch (e) {}
							}

							cardbookRepository.cardbookUtils.addMemberstoCard(myCard, myTargetMembers, "group");
							
							cardbookRepository.saveCard({}, myCard, "", true);
							cardbookRepository.cardbookServerSyncDone[aDirPrefIdTarget]++;

							wdw_migrate.allLists[listName].solved = true;
							wdw_migrate.allLists[listName].uid = myCard.uid;
						}
					}
					myAfterNumber = wdw_migrate.getSolvedListNumber();
					myCondition = (myBeforeNumber != myAfterNumber);
					myBeforeNumber = myAfterNumber;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_migrate.translateStandardLists error : " + e, "Error");
				cardbookRepository.cardbookServerSyncError[aDirPrefIdTarget]++;
				cardbookRepository.cardbookServerSyncDone[aDirPrefIdTarget]++;
			}
		},

		getNotNullFn: function (aCard, aABCard) {
			try {
				if (aCard.fn != "") {
					return;
				}
				if (aCard.org != "") {
					aCard.fn = aCard.org;
					return;
				}
				if (aCard.lastname != "") {
					aCard.fn = aCard.lastname;
					return;
				}
				if (aCard.firstname != "") {
					aCard.fn = aCard.firstname;
					return;
				}
				var myEmail = aABCard.getProperty("PrimaryEmail", "");
				if (myEmail != "") {
					var myTmpArray = myEmail.split("@");
					aCard.fn = myTmpArray[0].replace(/\./g, " ");
					return;
				}
			}
			catch (e) {
				cardbookRepository.cardbookLog.updateStatusProgressInformation("wdw_migrate.getNotNullFn error : " + e, "Error");
			}
		},

		importCards: function (aDirPrefIdSource, aDirPrefIdTarget, aDirPrefIdTargetName, aVersion) {
			for (let book of MailServices.ab.directories) {
				if (book.dirPrefId == aDirPrefIdSource) {
					var abCardsEnumerator = book.childCards;
					while (abCardsEnumerator.hasMoreElements()) {
						var myABCard = abCardsEnumerator.getNext();
						myABCard = myABCard.QueryInterface(Components.interfaces.nsIAbCard);
						if (!myABCard.isMailList) {
							cardbookRepository.cardbookServerSyncTotal[aDirPrefIdTarget]++;
							let myDateFormat = cardbookRepository.getDateFormat(aDirPrefIdTarget, aVersion);
							Services.tm.currentThread.dispatch({ run: function() {
								wdw_migrate.translateStandardCards(aDirPrefIdTarget, aDirPrefIdTargetName, myABCard, aVersion, myDateFormat);
							}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
						}
					}
    				var abCardsEnumerator = book.childCards;
					while (abCardsEnumerator.hasMoreElements()) {
						var myABCard = abCardsEnumerator.getNext();
						myABCard = myABCard.QueryInterface(Components.interfaces.nsIAbCard);
						if (myABCard.isMailList) {
							var myABList = MailServices.ab.getDirectory(myABCard.mailListURI);
							wdw_migrate.allLists[myABList.dirName] = {};
							wdw_migrate.allLists[myABList.dirName].solved = false;
							wdw_migrate.allLists[myABList.dirName].list = myABList;
							cardbookRepository.cardbookServerSyncTotal[aDirPrefIdTarget]++;
						}
					}
					wdw_migrate.translateStandardLists(aDirPrefIdTarget, aDirPrefIdTargetName, aVersion);
					break;
				}
			}
			cardbookRepository.cardbookMailPopularity.writeMailPopularity();
			cardbookRepository.cardbookPreferDisplayName.writePreferDisplayName();
			cardbookRepository.writePossibleCustomFields();
			cardbookRepository.cardbookDirResponse[aDirPrefIdTarget]++;
		}
		
	};

};
