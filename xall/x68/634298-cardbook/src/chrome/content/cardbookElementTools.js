if ("undefined" == typeof(cardbookElementTools)) {
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var cardbookElementTools = {
		
		deleteRowsAllTypes: function () {
			cardbookElementTools.deleteRows('modernRows');
			cardbookElementTools.deleteRows('classicalRows');
		},

		deleteRowsType: function (aType) {
			cardbookElementTools.deleteRows(aType + 'Groupbox');
		},

		deleteRows: function (aObjectName) {
			// for anonid this does not work
			try {
				var aListRows = document.getElementById(aObjectName);
				while (aListRows.hasChildNodes()) {
					aListRows.lastChild.remove();
				}
			} catch (e) {}
		},

		deleteTreecols: function (aTreecol) {
			try {
				for (let i = aTreecol.childNodes.length -1; i >= 0; i--) {
					let child = aTreecol.childNodes[i];
					if (child.tagName != "treecolpicker") {
						aTreecol.removeChild(child);
					}
				}
			} catch (e) {}
		},

		addCategoriesRow: function (aCategories) {
			var panesView = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.panesView");
			var aParent = document.getElementById('categories' + panesView + 'Row');

			for (category of aCategories) {
				var aBox = document.createXULElement('box');
				aParent.appendChild(aBox);
				aBox.setAttribute('flex', '1');
				var aLabel = document.createXULElement('label');
				aBox.appendChild(aLabel);
				aLabel.setAttribute('id', category + 'Label');
				aLabel.setAttribute('value', category);
				aLabel.setAttribute('class', 'tagvalue cardbookCategoryClass');
				aLabel.setAttribute('type', 'category_' + cardbookRepository.cardbookUtils.formatCategoryForCss(category));
			}
		},

		addGroupbox: function (aType) {
			var panesView = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.panesView");
			var aParent = document.getElementById(panesView + 'Rows');

			var aGroupbox = document.createXULElement('groupbox');
			aParent.appendChild(aGroupbox);
			aGroupbox.setAttribute('id', aType + panesView + 'Groupbox');
			aGroupbox.setAttribute('flex', '1');
			return aGroupbox;
		},
		
		addCaption: function (aType, aParent) {
			var aCaption = document.createXULElement('label');
			aParent.appendChild(aCaption);
			aCaption.setAttribute('id', aType + '_caption');
			aCaption.setAttribute('value', cardbookRepository.extension.localeData.localizeMessage(aType + "GroupboxLabel"));
			aCaption.setAttribute('class', 'header');
		},
		
		addTreeSplitter: function (aParent, aParameters) {
			var aSplitter = document.createXULElement('splitter');
			aParent.appendChild(aSplitter);
			aSplitter.setAttribute('class', 'tree-splitter');

			for (var prop in aParameters) {
				aSplitter.setAttribute(prop, aParameters[prop]);
			}
		},
		
		addTreecol: function (aParent, aId, aLabel, aParameters) {
			var aTreecol = document.createXULElement('treecol');
			aParent.appendChild(aTreecol);
			aTreecol.setAttribute('id', aId);
			aTreecol.setAttribute('label', aLabel);

			for (var prop in aParameters) {
				aTreecol.setAttribute(prop, aParameters[prop]);
			}
		},

		addProgressmeter: function (aParent, aId, aParameters) {
			var aProgressmeter =  document.createElementNS("http://www.w3.org/1999/xhtml","progress");
			aParent.appendChild(aProgressmeter);
			aProgressmeter.setAttribute('id', aId);
			aProgressmeter.setAttribute('max', "100");

			for (var prop in aParameters) {
				aProgressmeter.setAttribute(prop, aParameters[prop]);
			}
		},

		addHBox: function (aType, aIndex, aParent, aParameters) {
			var aHBox = document.createXULElement('hbox');
			aParent.appendChild(aHBox);
			aHBox.setAttribute('id', aType + '_' + aIndex + '_hbox');
			aHBox.setAttribute('flex', '1');
			aHBox.setAttribute('align', 'center');
			// dirty hack to have the lines not shrinked on Linux only with blue.css
			aHBox.setAttribute('style', 'min-height:36px;');

			for (var prop in aParameters) {
				aHBox.setAttribute(prop, aParameters[prop]);
			}
			return aHBox;
		},
		
		addGridRow: function (aParent, aId, aParameters) {
			var aGridRow = document.createXULElement('row');
			aParent.appendChild(aGridRow);
			aGridRow.setAttribute('id', aId);

			for (var prop in aParameters) {
				aGridRow.setAttribute(prop, aParameters[prop]);
			}
			return aGridRow;
		},

		addLabel: function (aOrigBox, aId, aValue, aControl, aParameters) {
			var aLabel = document.createXULElement('label');
			aOrigBox.appendChild(aLabel);
			aLabel.setAttribute('id', aId);
			aLabel.setAttribute('value', aValue);
			aLabel.setAttribute('control', aControl);
			for (var prop in aParameters) {
				aLabel.setAttribute(prop, aParameters[prop]);
			}
			return aLabel;
		},

		addKeyTextbox: function (aParent, aId, aValue, aParameters, aIndex) {
			var aKeyTextBox = cardbookElementTools.addTextbox(aParent, aId, aValue, aParameters);

			if (aIndex == 0) {
				function checkKeyTextBox(event) {
					var myIdArray = this.id.split('_');
					if (!document.getElementById(myIdArray[0] + '_1_addButton')) {
						if (this.value == "") {
							document.getElementById(myIdArray[0] + '_0_addButton').disabled = true;
							document.getElementById(myIdArray[0] + '_0_removeButton').disabled = true;
						} else {
							document.getElementById(myIdArray[0] + '_0_addButton').disabled = false;
							document.getElementById(myIdArray[0] + '_0_removeButton').disabled = false;
						}
					}
				};
				aKeyTextBox.addEventListener("input", checkKeyTextBox, false);
			}
			return aKeyTextBox;
		},

		addTextbox: function (aParent, aId, aValue, aParameters) {
			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aParent.appendChild(aTextbox);
			aTextbox.setAttribute('id', aId);
			aTextbox.setAttribute('value', aValue);

			for (var prop in aParameters) {
				aTextbox.setAttribute(prop, aParameters[prop]);
			}
			return aTextbox;
		},

		addDatepicker: function (aParent, aId, aValue, aParameters) {
			var aDatepicker = document.createXULElement('cardbookdatepicker');
			aParent.appendChild(aDatepicker);
			aDatepicker.setAttribute('id', aId);
			aDatepicker.setAttribute('value', aValue);

			for (var prop in aParameters) {
				aDatepicker.setAttribute(prop, aParameters[prop]);
			}
			return aDatepicker;
		},

		addTextarea: function (aParent, aId, aValue, aParameters) {
			var aTextarea = document.createElementNS("http://www.w3.org/1999/xhtml","html:textarea");
			aParent.appendChild(aTextarea);
			aTextarea.setAttribute('id', aId);
			aTextarea.value = aValue;

			for (var prop in aParameters) {
				aTextarea.setAttribute(prop, aParameters[prop]);
			}
			return aTextarea;
		},

		loadCountries: function (aPopup, aMenu, aDefaultValue, aAddEmptyCountries, aUseCodeValues) {
			const loc = new Localization(["toolkit/intl/regionNames.ftl"], true);
			var myResult = [];
			for (let code of cardbookRepository.countriesList) {
				let country = loc.formatValueSync("region-name-" + code);
				if (aUseCodeValues) {
					myResult.push([code.toUpperCase(), country]);
				} else {
					myResult.push([country, country]);
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(myResult,1,1);
			cardbookElementTools.deleteRows(aPopup.id);
			var defaultIndex = 0;
			var j = 0;
			if (aAddEmptyCountries) {
				var menuItem = aMenu.appendItem("", "");
				j++;
			}
			var found = false;
			for (var i = 0; i < myResult.length; i++) {
				var menuItem = aMenu.appendItem(myResult[i][1], myResult[i][0]);
				aPopup.appendChild(menuItem);
				if (!found && aDefaultValue != "" && myResult[i][0].toUpperCase() == aDefaultValue.toUpperCase()) {
					defaultIndex=j;
					found=true;
				}
				j++;
			}
			if (found) {
				aMenu.selectedIndex = defaultIndex;
			}
		},

		loadAccountsOrCatsTreeMenu: function (aPopupName, aMenuName, aDefaultId) {
			if (document.getElementById(aMenuName)) {
				var myPopup = document.getElementById(aPopupName);
				cardbookElementTools.deleteRows(aPopupName);
				var defaultIndex = 0;
				var j = 0;
				var typeName = [ 'all', 'enabled', 'disabled', 'local', 'remote', 'search' ];
				for (var i = 0; i < typeName.length; i++) {
					var menuItem = document.getElementById(aMenuName).appendItem(cardbookRepository.extension.localeData.localizeMessage(typeName[i] + "AccountsLabel"), typeName[i]);
					menuItem.setAttribute("type", "radio");
					menuItem.setAttribute("checked", "false");
					myPopup.appendChild(menuItem);
					if (typeName[i] == aDefaultId) {
						defaultIndex=j;
						menuItem.setAttribute("checked", "true");
					}
					j++;
				}
				document.getElementById(aMenuName).selectedIndex = defaultIndex;
			}
		},

		loadInclExcl: function (aPopupName, aMenuName, aDefaultId) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			var typeName = [ 'include', 'exclude' ];
			for (var i = 0; i < typeName.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage(typeName[i] + "Label"));
				menuItem.setAttribute("value", typeName[i]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				if (typeName[i] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
			document.getElementById(aMenuName).selectedItem.setAttribute("checked", "true");
		},

		loadGender: function (aPopupName, aMenuName, aDefaultId) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			var myResult = [["", ""]];
			for (var type in cardbookRepository.cardbookGenderLookup) {
				myResult.push([type, cardbookRepository.cardbookGenderLookup[type]]);
			}
			for (var i = 0; i < myResult.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", myResult[i][1]);
				menuItem.setAttribute("value", myResult[i][0]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				if (myResult[i][0] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
			document.getElementById(aMenuName).selectedItem.setAttribute("checked", "true");
		},

		loadMailAccounts: function (aPopupName, aMenuName, aDefaultId, aAddAllMailAccounts) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			if (aAddAllMailAccounts) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("allMailAccounts"));
				menuItem.setAttribute("value", "allMailAccounts");
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				if ("allMailAccounts" == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			var sortedEmailAccounts = [];
			for (let account of MailServices.accounts.accounts) {
				for (let identity of account.identities) {
					if (account.incomingServer.type == "pop3" || account.incomingServer.type == "imap") {
						sortedEmailAccounts.push([identity.email, identity.key]);
					}
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedEmailAccounts,0,1);
			for (var i = 0; i < sortedEmailAccounts.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", sortedEmailAccounts[i][0]);
				menuItem.setAttribute("value", sortedEmailAccounts[i][1]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				if (sortedEmailAccounts[i][1] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
			document.getElementById(aMenuName).selectedItem.setAttribute("checked", "true");
		},

		loadAddressBooks: function (aPopup, aMenu, aDefaultId, aExclusive, aAddAllABs, aIncludeReadOnly, aIncludeSearch, aIncludeDisabled,
										aInclRestrictionList, aExclRestrictionList) {
			cardbookElementTools.deleteRows(aPopup.id);
			var defaultIndex = 0;
			var j = 0;
			if (aAddAllABs) {
				var ABStrBundle = Services.strings.createBundle("chrome://messenger/locale/addressbook/addressBook.properties");
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", ABStrBundle.GetStringFromName("allAddressBooks"));
				menuItem.setAttribute("value", "allAddressBooks");
				menuItem.setAttribute("class", "menuitem-iconic");
				aPopup.appendChild(menuItem);
				if ("allAddressBooks" == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			var sortedAddressBooks = [];
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && (aIncludeDisabled || account[5])
						&& (aIncludeReadOnly || !account[7])
						&& (aIncludeSearch || (account[6] !== "SEARCH"))) {
					if (aExclRestrictionList && aExclRestrictionList[account[4]]) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList.length > 0) {
						if (aInclRestrictionList[account[4]]) {
							sortedAddressBooks.push([account[0], account[4], cardbookRepository.getABIconType(account[6])]);
						}
					} else {
						sortedAddressBooks.push([account[0], account[4], cardbookRepository.getABIconType(account[6])]);
					}
				}
			}
			if (!aExclusive) {
				var contactManager = MailServices.ab;
				var contacts = contactManager.directories;
				while ( contacts.hasMoreElements() ) {
					var contact = contacts.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
					// remote LDAP directory
					if (contact.isRemote && contact.dirType === 0) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList.length > 0) {
						if (aInclRestrictionList[contact.dirPrefId]) {
							sortedAddressBooks.push([contact.dirName, contact.dirPrefId, "standard-abook"]);
						}
					} else {
						sortedAddressBooks.push([contact.dirName, contact.dirPrefId, "standard-abook"]);
					}
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedAddressBooks,0,1);
			for (var i = 0; i < sortedAddressBooks.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", sortedAddressBooks[i][0]);
				menuItem.setAttribute("value", sortedAddressBooks[i][1]);
				menuItem.setAttribute("ABtype", sortedAddressBooks[i][2]);
				menuItem.setAttribute("class", "menuitem-iconic");
				aPopup.appendChild(menuItem);
				if (sortedAddressBooks[i][1] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			aMenu.selectedIndex = defaultIndex;
		},

		loadSyncAddressBooks: function (aPopup) {
			cardbookElementTools.deleteRows(aPopup.id);
			var sortedAddressBooks = [];
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && cardbookRepository.cardbookUtils.isMyAccountRemote(account[6])) {
					sortedAddressBooks.push([account[0], account[4], cardbookRepository.getABIconType(account[6])]);
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedAddressBooks,0,1);
			for (var i = 0; i < sortedAddressBooks.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", sortedAddressBooks[i][0]);
				menuItem.setAttribute("value", sortedAddressBooks[i][1]);
				menuItem.setAttribute("ABtype", sortedAddressBooks[i][2]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.addEventListener("command", function(aEvent) {
					cardbookRepository.cardbookSynchronization.syncAccount(this.value);
					aEvent.stopPropagation();
				}, false);
				aPopup.appendChild(menuItem);
			}
		},

		loadCategories: function (aPopupName, aMenuName, aDefaultPrefId, aDefaultCatId, aAddAllCats, aAddOnlyCats, aAddNoCats, aAddEmptyCats, aInclRestrictionList, aExclRestrictionList) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			if (aAddEmptyCats) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", "");
				menuItem.setAttribute("value", "");
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				j++;
			}
			if (!(aInclRestrictionList && aInclRestrictionList[aDefaultPrefId])) {
				if (aAddAllCats) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("allCategories"));
					menuItem.setAttribute("value", "allCategories");
					menuItem.setAttribute("class", "menuitem-iconic");
					menuItem.setAttribute("type", "radio");
					myPopup.appendChild(menuItem);
					if ("allCategories" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
				if (aAddOnlyCats) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("onlyCategories"));
					menuItem.setAttribute("value", "onlyCategories");
					menuItem.setAttribute("class", "menuitem-iconic");
					menuItem.setAttribute("type", "radio");
					myPopup.appendChild(menuItem);
					if ("onlyCategories" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
				if (aAddNoCats) {
					var menuItem = document.createXULElement("menuitem");
					menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage("noCategory"));
					menuItem.setAttribute("value", "noCategory");
					menuItem.setAttribute("class", "menuitem-iconic");
					menuItem.setAttribute("type", "radio");
					myPopup.appendChild(menuItem);
					if ("noCategory" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
			}
			var sortedCategories = [];
			if (cardbookRepository.cardbookAccountsCategories[aDefaultPrefId]) {
				for (let category of cardbookRepository.cardbookAccountsCategories[aDefaultPrefId]) {
					if (aExclRestrictionList && aExclRestrictionList[aDefaultPrefId] && aExclRestrictionList[aDefaultPrefId][category]) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList[aDefaultPrefId]) {
						if (aInclRestrictionList[aDefaultPrefId][category]) {
							sortedCategories.push([category, aDefaultPrefId+"::categories::"+category]);
						}
					} else {
						sortedCategories.push([category, aDefaultPrefId+"::categories::"+category]);
					}
				}
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedCategories,0,1);
			for (var i = 0; i < sortedCategories.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", sortedCategories[i][0]);
				menuItem.setAttribute("value", sortedCategories[i][1]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				if (sortedCategories[i][1] == aDefaultCatId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
			document.getElementById(aMenuName).selectedItem.setAttribute("checked", "true");
		},

		loadContacts: function (aPopupName, aMenuName, aDirPrefId, aDefaultId) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			var sortedContacts = [];
			for (let card of cardbookRepository.cardbookDisplayCards[aDirPrefId].cards) {
				sortedContacts.push([card.fn, card.uid, card.isAList]);
			}
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sortedContacts,0,1);
			for (var i = 0; i < sortedContacts.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", sortedContacts[i][0]);
				menuItem.setAttribute("value", sortedContacts[i][1]);
				menuItem.setAttribute("isAList", sortedContacts[i][2].toString());
				menuItem.setAttribute("class", "menuitem-iconic");
				myPopup.appendChild(menuItem);
				if (sortedContacts[i][1] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		loadVCardVersions: function (aPopupName, aMenuName, aDefaultList) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			if (aDefaultList && aDefaultList.length && aDefaultList.length > 0) {
				var versions = aDefaultList;
			} else {
				var versions = cardbookRepository.supportedVersion;
			}
			if (versions.includes("3.0")) {
				var defaultValue = "3.0";
			} else {
				var defaultValue = "4.0";
			}

			var defaultIndex = 0;
			for (var i = 0; i < versions.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute("label", versions[i]);
				menuItem.setAttribute("value", versions[i]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				myPopup.appendChild(menuItem);
				if (versions[i] == defaultValue) {
					defaultIndex = i;
				}
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
			document.getElementById(aMenuName).selectedItem.setAttribute("checked", "true");
		},

		addMenuIMPPlist: function (aParent, aType, aIndex, aArray, aCode, aProtocol) {
			var aMenulist = document.createXULElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistIMPP');
			aMenulist.setAttribute('sizetopopup', 'none');
			var aMenupopup = document.createXULElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupIMPP');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var found = false;
			for (var i = 0; i < aArray.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemIMPP_' + i);
				menuItem.setAttribute("label", aArray[i][1]);
				menuItem.setAttribute("value", aArray[i][0]);
				aMenupopup.appendChild(menuItem);
				if (aCode != "") {
					if (aArray[i][0].toLowerCase() == aCode.toLowerCase()) {
						aMenulist.selectedIndex = i;
						found = true;
					}
				} else if (aProtocol != "") {
					if (aArray[i][2].toLowerCase() == aProtocol.toLowerCase()) {
						aMenulist.selectedIndex = i;
						found = true;
					}
				}
			}
			if (!found) {
				aMenulist.selectedIndex = 0;
			}
			return found;
		},

		addPrefStar: function (aParent, aType, aIndex, aValue) {
			var aPrefButton = document.createXULElement('button');
			aParent.appendChild(aPrefButton);
			aPrefButton.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			aPrefButton.setAttribute('class', 'small-button cardbookPrefStarClass');
			if (aValue) {
				aPrefButton.setAttribute('haspref', 'true');
			} else {
				aPrefButton.removeAttribute('haspref');
			}
			aPrefButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("prefLabel"));

			function firePrefCheckBox(event) {
				var myIdArray = this.id.split('_');
				if (document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBoxLabel') &&
					document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBox')) { 
					var myPrefWeightBoxLabel = document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBoxLabel');
					var myPrefWeightBox = document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBox');
					if (this.getAttribute('haspref')) {
						myPrefWeightBoxLabel.disabled = true;
						myPrefWeightBox.disabled = true;
					} else {
						myPrefWeightBoxLabel.disabled = false;
						myPrefWeightBox.disabled = false;
					}
					myPrefWeightBox.value = "";
				}
				if (this.getAttribute('haspref')) {
					this.removeAttribute('haspref');
				} else {
					this.setAttribute('haspref', 'true');
				}
			};
			aPrefButton.addEventListener("command", firePrefCheckBox, false);
			return aPrefButton;
		},

		addMenuTypelist: function (aParent, aType, aIndex, aCheckedArray) {
			var aMenulist = document.createXULElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_MenulistType');
			aMenulist.setAttribute('sizetopopup', 'none');
			aMenulist.addEventListener("keydown", function(aEvent) {
				cardbookWindowUtils.panelMenulistKeydown(aEvent, 'type', aType + '_' + aIndex + '_MenupopupType');
			}, false);
			aMenulist.addEventListener("keyup", function(aEvent) {
				cardbookWindowUtils.panelMenulistKeyup(aEvent, 'type', aType + '_' + aIndex + '_MenupopupType');
			}, false);

			var aMenupopup = document.createXULElement('menupopup');
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_MenupopupType');
			aMenupopup.setAttribute('ignorekeys', 'true');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.addEventListener("popuphiding", function(aEvent) {
				cardbookWindowUtils.panelMenupopupHiding(aEvent, aType, this.id);
			}, false);

			cardbookElementTools.deleteRows(aType + '_' + aIndex + '_MenupopupType');
			var myDirPrefId = wdw_cardEdition.workingCard.dirPrefId;
			var ABType = cardbookRepository.cardbookPreferences.getType(myDirPrefId);
			var ABTypeFormat = cardbookRepository.getABTypeFormat(ABType);
			if (cardbookRepository.cardbookCoreTypes[ABTypeFormat].addnew == true) {
				var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
				aTextbox.setAttribute('id', aType + '_' + aIndex + '_TextboxType');
				aTextbox.setAttribute('placeholder', cardbookRepository.extension.localeData.localizeMessage("typeAddNew"));
				aMenupopup.appendChild(aTextbox);
				aTextbox.addEventListener("keydown", function(aEvent) {
					cardbookWindowUtils.panelTextboxKeydown(aEvent, 'type', aType + '_' + aIndex + '_MenupopupType');
				}, false);
			}
			var aMenuseparator = document.createXULElement('menuseparator');
			aMenupopup.appendChild(aMenuseparator);
			
			var sourceList = cardbookRepository.cardbookTypes.getTypesFromDirPrefId(aType, myDirPrefId);
			cardbookRepository.cardbookUtils.sortMultipleArrayByString(sourceList,0,1)
			var checkedCode = cardbookRepository.cardbookTypes.whichCodeTypeShouldBeChecked(aType, myDirPrefId, aCheckedArray, sourceList);
			if (checkedCode.isAPg && !checkedCode.isAlreadyThere) {
				sourceList.push([checkedCode.result, checkedCode.result]);
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(sourceList,0,1);
			}
			var myCheckedLabel = "";
			for (let type of sourceList) {
				let item = document.createXULElement("menuitem");
				item.setAttribute("class", "menuitem-iconic cardbook-item");
				item.setAttribute("label", type[0]);
				item.setAttribute("value", type[1]);
				item.setAttribute("type", "radio");
				if (checkedCode.result == type[1]) {
					item.setAttribute("checked", "true");
					myCheckedLabel = type[0];
				}
				aMenupopup.appendChild(item);
			}
			setTimeout(function() {
					cardbookWindowUtils.updateComplexMenulist('type', aMenupopup.id);
				}, 0);
		},

		addMenuCaselist: function (aParent, aType, aIndex, aValue, aParameters) {
			var aMenulist = document.createXULElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistCase');
			aMenulist.setAttribute('sizetopopup', 'none');
			for (var prop in aParameters) {
				aMenulist.setAttribute(prop, aParameters[prop]);
			}
			
			var aMenupopup = document.createXULElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupCase');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var defaultIndex = 0;
			var caseOperators = [['dig', 'ignoreCaseIgnoreDiacriticLabel'], ['ig', 'ignoreCaseMatchDiacriticLabel'],
									['dg', 'matchCaseIgnoreDiacriticLabel'], ['g', 'matchCaseMatchDiacriticLabel']]
			for (var i = 0; i < caseOperators.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemCase_' + i);
				menuItem.setAttribute("label", cardbookRepository.extension.localeData.localizeMessage(caseOperators[i][1]));
				menuItem.setAttribute("value", caseOperators[i][0]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				aMenupopup.appendChild(menuItem);
				if (aValue == caseOperators[i][0]) {
					defaultIndex = i;
				}
			}
			aMenulist.selectedIndex = defaultIndex;
			aMenulist.selectedItem.setAttribute("checked", "true");
		},

		addMenuObjlist: function (aParent, aType, aIndex, aValue, aParameters) {
			var aMenulist = document.createXULElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistObj');
			aMenulist.setAttribute('sizetopopup', 'none');
			for (var prop in aParameters) {
				aMenulist.setAttribute(prop, aParameters[prop]);
			}
			
			var aMenupopup = document.createXULElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupObj');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var defaultIndex = 0;
			var myColumns = cardbookRepository.cardbookUtils.getAllAvailableColumns("search");
			for (var i = 0; i < myColumns.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemObj_' + i);
				menuItem.setAttribute("label", myColumns[i][1]);
				menuItem.setAttribute("value", myColumns[i][0]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				aMenupopup.appendChild(menuItem);
				if (aValue == myColumns[i][0]) {
					defaultIndex = i;
				}
			}
			aMenulist.selectedIndex = defaultIndex;
			aMenulist.selectedItem.setAttribute("checked", "true");
		},

		addMenuTermlist: function (aParent, aType, aIndex, aValue, aParameters) {
			var aMenulist = document.createXULElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistTerm');
			for (var prop in aParameters) {
				aMenulist.setAttribute(prop, aParameters[prop]);
			}
			
			var aMenupopup = document.createXULElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupTerm');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var defaultIndex = 0;
			var operatorsStrBundle = Services.strings.createBundle("chrome://messenger/locale/search-operators.properties");
			var operators = ['Contains', 'DoesntContain', 'Is', 'Isnt', 'BeginsWith', 'EndsWith', 'IsEmpty', 'IsntEmpty']
			for (var i = 0; i < operators.length; i++) {
				var menuItem = document.createXULElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemTerm_' + i);
				menuItem.setAttribute("label", operatorsStrBundle.GetStringFromName(Components.interfaces.nsMsgSearchOp[operators[i]]));
				menuItem.setAttribute("value", operators[i]);
				menuItem.setAttribute("class", "menuitem-iconic");
				menuItem.setAttribute("type", "radio");
				aMenupopup.appendChild(menuItem);
				if (aValue == operators[i]) {
					defaultIndex = i;
				}
			}
			aMenulist.selectedIndex = defaultIndex;
			aMenulist.selectedItem.setAttribute("checked", "true");

			function fireMenuTerm(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				cardbookComplexSearch.showOrHideForEmpty(this.id);
				var myIdArray = this.id.split('_');
				cardbookComplexSearch.disableButtons(myIdArray[0], myIdArray[1]);
			};
			aMenulist.addEventListener("command", fireMenuTerm, false);
		},

		addEditButton: function (aParent, aType, aIndex, aButtonType, aButtonName, aFunction) {
			var aEditButton = document.createXULElement('button');
			aParent.appendChild(aEditButton);
			aEditButton.setAttribute('id', aType + '_' + aIndex + '_' + aButtonName + 'Button');
			if (aButtonType == "add") {
				aEditButton.setAttribute('label', '+');
			} else if (aButtonType == "remove") {
				aEditButton.setAttribute('label', '-');
			} else if (aButtonType == "up") {
				aEditButton.setAttribute('label', '↑');
			} else if (aButtonType == "down") {
				aEditButton.setAttribute('label', '↓');
			} else if (aButtonType == "validated") {
				aEditButton.setAttribute('label', '✔');
			} else if (aButtonType == "notValidated") {
				aEditButton.setAttribute('label', '!');
			} else if (aButtonType == "noValidated") {
				aEditButton.setAttribute('label', '?');
			} else if (aButtonType == "link") {
				aEditButton.setAttribute('label', '↔');
			}
			aEditButton.setAttribute('class', 'small-button');
			aEditButton.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage(aButtonType + "EntryTooltip"));
			// aEditButton.addEventListener("click", aFunction, false);
			aEditButton.addEventListener("command", aFunction, false);
		}
	};

};
