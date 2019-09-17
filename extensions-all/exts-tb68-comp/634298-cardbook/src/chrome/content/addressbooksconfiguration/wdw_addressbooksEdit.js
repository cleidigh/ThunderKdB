if ("undefined" == typeof(wdw_addressbooksEdit)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
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
				let myTargetVersion = cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId);
				let myTargetName = cardbookPreferences.getName(window.arguments[0].dirPrefId);
				// the date format is no longer stored
				let myNewDateFormat = cardbookRepository.getDateFormat(window.arguments[0].dirPrefId, wdw_addressbooksEdit.initialVCardVersion);
				let counter = 0;

				for (let card of cardbookRepository.cardbookDisplayCards[window.arguments[0].dirPrefId].cards) {
					let myTempCard = new cardbookCardParser();
					cardbookUtils.cloneCard(card, myTempCard);
					if (cardbookUtils.convertVCard(myTempCard, myTargetName, myTargetVersion, wdw_addressbooksEdit.initialDateFormat, myNewDateFormat)) {
						cardbookRepository.saveCard(card, myTempCard, myActionId, false);
						counter++;
					}
				}

				cardbookRepository.writePossibleCustomFields();
				wdw_addressbooksEdit.deleteOldDateFormat();
				document.getElementById("convertVCardsLabel").setAttribute('hidden', 'true');
				cardbookUtils.formatStringForOutput(myTopic, [myTargetName, myTargetVersion, counter]);
				cardbookActions.endAction(myActionId);
			}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
		},
		
		loadFnFormula: function () {
			document.getElementById("fnFormulaTextBox").value = cardbookPreferences.getFnFormula(window.arguments[0].dirPrefId);
			var orgStructure = cardbookPreferences.getStringPref("extensions.cardbook.orgStructure");
			if (orgStructure != "") {
				var allOrg = cardbookUtils.unescapeArray(cardbookUtils.escapeString(orgStructure).split(";"));
			} else {
				var allOrg = [];
			}
			var myLabel = [];
			myLabel.push("{{1}} : " + cardbookRepository.strBundle.GetStringFromName("prefixnameLabel"));
			myLabel.push("{{2}} : " + cardbookRepository.strBundle.GetStringFromName("firstnameLabel"));
			myLabel.push("{{3}} : " + cardbookRepository.strBundle.GetStringFromName("othernameLabel"));
			myLabel.push("{{4}} : " + cardbookRepository.strBundle.GetStringFromName("lastnameLabel"));
			myLabel.push("{{5}} : " + cardbookRepository.strBundle.GetStringFromName("suffixnameLabel"));
			myLabel.push("{{6}} : " + cardbookRepository.strBundle.GetStringFromName("nicknameLabel"));
			document.getElementById('fnFormula7').value = myLabel.join("    ");
			myLabel = [];
			var count = 7;
			if (allOrg.length === 0) {
				myLabel.push("{{" + count + "}} : " + cardbookRepository.strBundle.GetStringFromName("orgLabel"));
				count++;
			} else {
				for (let org of allOrg) {
					myLabel.push("{{" + count + "}} : " + org);
					count++;
				}
			}
			myLabel.push("{{" + count + "}} : " + cardbookRepository.strBundle.GetStringFromName("titleLabel"));
			count++;
			myLabel.push("{{" + count + "}} : " + cardbookRepository.strBundle.GetStringFromName("roleLabel"));
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
							cardbookPreferences.setFnFormula(account[4], document.getElementById('fnFormulaTextBox').value);
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
			wdw_addressbooksEdit.initialVCardVersion = cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId)
			wdw_addressbooksEdit.initialDateFormat = cardbookPreferences.getDateFormat(window.arguments[0].dirPrefId, wdw_addressbooksEdit.initialVCardVersion);
			wdw_addressbooksEdit.initialNodeType = cardbookPreferences.getNode(window.arguments[0].dirPrefId);

			document.getElementById("nameTextBox").value = cardbookPreferences.getName(window.arguments[0].dirPrefId);
			document.getElementById("nodeRadiogroup").value = wdw_addressbooksEdit.initialNodeType;
			document.getElementById("colorInput").value = cardbookPreferences.getColor(window.arguments[0].dirPrefId);
			document.getElementById("typeTextBox").value = cardbookPreferences.getType(window.arguments[0].dirPrefId);
			
			document.getElementById("urlTextBox").value = cardbookPreferences.getUrl(window.arguments[0].dirPrefId);
			document.getElementById("usernameTextBox").value = cardbookPreferences.getUser(window.arguments[0].dirPrefId);
			document.getElementById("readonlyCheckBox").setAttribute('checked', cardbookPreferences.getReadOnly(window.arguments[0].dirPrefId));
			document.getElementById("vCardVersionTextBox").value = wdw_addressbooksEdit.initialVCardVersion;

			document.getElementById("urnuuidCheckBox").setAttribute('checked', cardbookPreferences.getUrnuuid(window.arguments[0].dirPrefId));
			document.getElementById("DBCachedCheckBox").setAttribute('checked', cardbookPreferences.getDBCached(window.arguments[0].dirPrefId));

			if (cardbookUtils.isMyAccountRemote(document.getElementById("typeTextBox").value) && cardbookPreferences.getDBCached(window.arguments[0].dirPrefId)) {
				document.getElementById('syncTab').setAttribute("collapsed", false);
				document.getElementById("autoSyncCheckBox").setAttribute('checked', cardbookPreferences.getAutoSyncEnabled(window.arguments[0].dirPrefId));
				document.getElementById("autoSyncIntervalTextBox").value = cardbookPreferences.getAutoSyncInterval(window.arguments[0].dirPrefId);
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
				Services.prefs.deleteBranch(cardbookPreferences.prefCardBookData + window.arguments[0].dirPrefId + "." + "dateFormat");
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
					let myVersion = cardbookPreferences.getVCardVersion(window.arguments[0].dirPrefId);
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
			cardbookPreferences.setColor(myDirPrefId, document.getElementById('colorInput').value);
			cardbookPreferences.setAutoSyncEnabled(myDirPrefId, document.getElementById('autoSyncCheckBox').checked);
			cardbookPreferences.setAutoSyncInterval(myDirPrefId, document.getElementById('autoSyncIntervalTextBox').value);
			cardbookPreferences.setFnFormula(myDirPrefId, document.getElementById('fnFormulaTextBox').value);

			if (document.getElementById('autoSyncCheckBox').checked) {
				cardbookSynchronization.removePeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value);
				cardbookSynchronization.addPeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value, document.getElementById('autoSyncIntervalTextBox').value);
			} else {
				cardbookSynchronization.removePeriodicSync(myDirPrefId, document.getElementById('nameTextBox').value);
			}

			if (wdw_addressbooksEdit.initialNodeType != document.getElementById('nodeRadiogroup').value) {
				cardbookPreferences.setNode(window.arguments[0].dirPrefId, document.getElementById("nodeRadiogroup").value);
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
