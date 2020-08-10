if ("undefined" == typeof(wdw_addressbooksEdit)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var wdw_addressbooksEdit = {
		
		initialVCardVersion: "",
		initialDateFormat: "",
		initialNodeType: "",

		convertNodes: function () {
			if (document.getElementById("nodeRadiogroup").value == "categories") {
				cardbookRepository.cardbookAccountsNodes[window.arguments[0].dirPrefId] = [];
			} else {
				Services.tm.currentThread.dispatch({ run: function() {
					for (let card of cardbookRepository.cardbookDisplayCards[window.arguments[0].dirPrefId].cards) {
						cardbookRepository.addCardToOrg(card, window.arguments[0].dirPrefId);
					}
				}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
			}
		},

		convertVCards: function () {
			Services.tm.currentThread.dispatch({ run: function() {
				let myTopic = "cardsConverted";
				let myActionId = cardbookActions.startAction(myTopic);
				let myTargetVersion = cardbookRepository.cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId);
				let myTargetName = cardbookRepository.cardbookPreferences.getName(window.arguments[0].dirPrefId);
				// the date format is no longer stored
				let myNewDateFormat = cardbookRepository.getDateFormat(window.arguments[0].dirPrefId, wdw_addressbooksEdit.initialVCardVersion);
				let counter = 0;

				for (let card of cardbookRepository.cardbookDisplayCards[window.arguments[0].dirPrefId].cards) {
					let myTempCard = new cardbookCardParser();
					cardbookRepository.cardbookUtils.cloneCard(card, myTempCard);
					if (cardbookRepository.cardbookUtils.convertVCard(myTempCard, myTargetName, myTargetVersion, wdw_addressbooksEdit.initialDateFormat, myNewDateFormat)) {
						cardbookRepository.saveCard(card, myTempCard, myActionId, false);
						counter++;
					}
				}

				cardbookRepository.writePossibleCustomFields();
				wdw_addressbooksEdit.deleteOldDateFormat();
				document.getElementById("convertVCardsLabel").setAttribute('hidden', 'true');
				cardbookRepository.cardbookUtils.formatStringForOutput(myTopic, [myTargetName, myTargetVersion, counter]);
				cardbookActions.endAction(myActionId);
			}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
		},
		
		loadFnFormula: function () {
			document.getElementById("fnFormulaTextBox").value = cardbookRepository.cardbookPreferences.getFnFormula(window.arguments[0].dirPrefId);
			var orgStructure = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
			if (orgStructure != "") {
				var allOrg = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(orgStructure).split(";"));
			} else {
				var allOrg = [];
			}
			var myLabel = [];
			myLabel.push("{{1}} : " + ConversionHelper.i18n.getMessage("prefixnameLabel"));
			myLabel.push("{{2}} : " + ConversionHelper.i18n.getMessage("firstnameLabel"));
			myLabel.push("{{3}} : " + ConversionHelper.i18n.getMessage("othernameLabel"));
			myLabel.push("{{4}} : " + ConversionHelper.i18n.getMessage("lastnameLabel"));
			myLabel.push("{{5}} : " + ConversionHelper.i18n.getMessage("suffixnameLabel"));
			myLabel.push("{{6}} : " + ConversionHelper.i18n.getMessage("nicknameLabel"));
			document.getElementById('fnFormula7').value = myLabel.join("    ");
			myLabel = [];
			var count = 7;
			if (allOrg.length === 0) {
				myLabel.push("{{" + count + "}} : " + ConversionHelper.i18n.getMessage("orgLabel"));
				count++;
			} else {
				for (let org of allOrg) {
					myLabel.push("{{" + count + "}} : " + org);
					count++;
				}
			}
			myLabel.push("{{" + count + "}} : " + ConversionHelper.i18n.getMessage("titleLabel"));
			count++;
			myLabel.push("{{" + count + "}} : " + ConversionHelper.i18n.getMessage("roleLabel"));
			document.getElementById('fnFormula8').value = myLabel.join("    ");
		},

		populateApplyToAB: function () {
			let applyToABMenupopup = document.getElementById('applyToABMenupopup');
			let applyToABButton = document.getElementById('applyToABButton');
			cardbookElementTools.loadAddressBooks(applyToABMenupopup, applyToABButton, "", true, true, true, false, true);
		},

		applyApplyToAB: function (aEvent) {
			if (aEvent.target && aEvent.target.value) {
				let myDirPrefId = aEvent.target.value;
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[1]) {
						if ((account[4] == myDirPrefId) || ("allAddressBooks" == myDirPrefId)) {
							cardbookRepository.cardbookPreferences.setFnFormula(account[4], document.getElementById('fnFormulaTextBox').value);
						}
					}
				}
			}
		},

		resetFnFormula: function () {
			document.getElementById('fnFormulaTextBox').value = cardbookRepository.defaultFnFormula;
		},

		showAutoSyncInterval: function () {
			if (document.getElementById('autoSyncCheckBox').checked) {
				document.getElementById('autoSyncInterval').disabled = false;
				document.getElementById('autoSyncIntervalTextBox').disabled = false;
			} else {
				document.getElementById('autoSyncInterval').disabled = true;
				document.getElementById('autoSyncIntervalTextBox').disabled = true;
			}
		},

		load: function () {
			wdw_addressbooksEdit.initialVCardVersion = cardbookRepository.cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId)
			wdw_addressbooksEdit.initialDateFormat = cardbookRepository.cardbookPreferences.getDateFormat(window.arguments[0].dirPrefId, wdw_addressbooksEdit.initialVCardVersion);
			wdw_addressbooksEdit.initialNodeType = cardbookRepository.cardbookPreferences.getNode(window.arguments[0].dirPrefId);

			document.getElementById("nameTextBox").value = cardbookRepository.cardbookPreferences.getName(window.arguments[0].dirPrefId);
			document.getElementById("nodeRadiogroup").value = wdw_addressbooksEdit.initialNodeType;
			document.getElementById("colorInput").value = cardbookRepository.cardbookPreferences.getColor(window.arguments[0].dirPrefId);
			document.getElementById("typeTextBox").value = cardbookRepository.cardbookPreferences.getType(window.arguments[0].dirPrefId);
			
			document.getElementById("urlTextBox").value = cardbookRepository.cardbookPreferences.getUrl(window.arguments[0].dirPrefId);
			document.getElementById("usernameTextBox").value = cardbookRepository.cardbookPreferences.getUser(window.arguments[0].dirPrefId);
			document.getElementById("readonlyCheckBox").setAttribute('checked', cardbookRepository.cardbookPreferences.getReadOnly(window.arguments[0].dirPrefId));
			document.getElementById("vCardVersionTextBox").value = wdw_addressbooksEdit.initialVCardVersion;

			document.getElementById("urnuuidCheckBox").setAttribute('checked', cardbookRepository.cardbookPreferences.getUrnuuid(window.arguments[0].dirPrefId));
			document.getElementById("DBCachedCheckBox").setAttribute('checked', cardbookRepository.cardbookPreferences.getDBCached(window.arguments[0].dirPrefId));

			if (cardbookRepository.cardbookUtils.isMyAccountRemote(document.getElementById("typeTextBox").value) && cardbookRepository.cardbookPreferences.getDBCached(window.arguments[0].dirPrefId)) {
				document.getElementById('syncTab').setAttribute("collapsed", false);
				document.getElementById("autoSyncCheckBox").setAttribute('checked', cardbookRepository.cardbookPreferences.getAutoSyncEnabled(window.arguments[0].dirPrefId));
				document.getElementById("autoSyncIntervalTextBox").value = cardbookRepository.cardbookPreferences.getAutoSyncInterval(window.arguments[0].dirPrefId);
				wdw_addressbooksEdit.showAutoSyncInterval();
			} else {
				document.getElementById('syncTab').setAttribute("collapsed", true);
			}
			
			wdw_addressbooksEdit.loadFnFormula();
			wdw_addressbooksEdit.searchForWrongCards();
			wdw_addressbooksEdit.populateApplyToAB();
		},

		deleteOldDateFormat: function () {
			try {
				Services.prefs.deleteBranch(cardbookRepository.cardbookPreferences.prefCardBookData + window.arguments[0].dirPrefId + "." + "dateFormat");
			}
			catch(e) {}
		},

		searchForWrongCards: function () {
			Services.tm.currentThread.dispatch({ run: function() {
				// the date format is no longer stored
				let myNewDateFormat = cardbookRepository.getDateFormat(window.arguments[0].dirPrefId, wdw_addressbooksEdit.initialVCardVersion);
				if (wdw_addressbooksEdit.initialDateFormat != myNewDateFormat) {
					document.getElementById("convertVCardsLabel").removeAttribute('hidden');
				} else {
					let myVersion = cardbookRepository.cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId);
					for (let card of cardbookRepository.cardbookDisplayCards[window.arguments[0].dirPrefId].cards) {
						if (card.version != myVersion) {
							document.getElementById("convertVCardsLabel").removeAttribute('hidden');
							break;
						}
					}
					wdw_addressbooksEdit.deleteOldDateFormat();
				}
			}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
		},

		save: function () {
			var myDirPrefId = window.arguments[0].dirPrefId;
			cardbookRepository.cardbookPreferences.setColor(myDirPrefId, document.getElementById('colorInput').value);
			cardbookRepository.cardbookPreferences.setAutoSyncEnabled(myDirPrefId, document.getElementById('autoSyncCheckBox').checked);
			cardbookRepository.cardbookPreferences.setAutoSyncInterval(myDirPrefId, document.getElementById('autoSyncIntervalTextBox').value);
			cardbookRepository.cardbookPreferences.setFnFormula(myDirPrefId, document.getElementById('fnFormulaTextBox').value);

			if (document.getElementById('autoSyncCheckBox').checked) {
				cardbookRepository.cardbookSynchronization.removePeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value);
				cardbookRepository.cardbookSynchronization.addPeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value, document.getElementById('autoSyncIntervalTextBox').value);
			} else {
				cardbookRepository.cardbookSynchronization.removePeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value);
			}

			if (wdw_addressbooksEdit.initialNodeType != document.getElementById('nodeRadiogroup').value) {
				cardbookRepository.cardbookPreferences.setNode(window.arguments[0].dirPrefId, document.getElementById("nodeRadiogroup").value);
				wdw_addressbooksEdit.convertNodes();
			}

			window.arguments[0].serverCallback("SAVE", myDirPrefId, document.getElementById('nameTextBox').value,
												document.getElementById('readonlyCheckBox').checked);
			close();
		},

		cancel: function () {
			window.arguments[0].serverCallback("CANCEL", window.arguments[0].dirPrefId);
			close();
		}

	};

};

// translations
window.addEventListener("DOMContentLoaded", function(e) {
	cardbookLocales.updateDocument();
}, false);
