if ("undefined" == typeof(wdw_addressbooksAdd)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

	var ABAddNotification = {};
	XPCOMUtils.defineLazyGetter(ABAddNotification, "localPageURINotifications", () => {
		return new MozElements.NotificationBox(element => {
			element.setAttribute("flex", "1");
			document.getElementById("localPageURINotificationsHbox").append(element);
		});
	});
	XPCOMUtils.defineLazyGetter(ABAddNotification, "resultNotifications", () => {
		return new MozElements.NotificationBox(element => {
			element.setAttribute("flex", "1");
			document.getElementById("resultNotificationsHbox").append(element);
		});
	});

	var wdw_addressbooksAdd = {

		gRunningDirPrefId: [],
		gFile: {},
		gCardDAVURLs: [],
		// [ [ AB type, URL, username, AB name, vCard version, AB type action, source id, collected true|false] ]
		gAccountsFound: [],
		gFinishParams: [],
		gValidateURL: false,
		gValidateDescription: "Validation module",
		gAutoconfigURL: "https://gitlab.com/CardBook/CardBook/raw/master/autoconfig/",
		gSearchDefinition: {},
		gFirstFirstStepDone: false,
		
		lTimerRefreshTokenAll : {},
		lTimerDiscoveryAll: {},

		initSearchDefinition: function () {
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId]) {
				wdw_addressbooksAdd.gSearchDefinition.searchAB = cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].searchAB;
			} else {
				wdw_addressbooksAdd.gSearchDefinition.searchAB = true;
			}
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId]) {
				wdw_addressbooksAdd.gSearchDefinition.matchAll = cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].matchAll;
			} else {
				wdw_addressbooksAdd.gSearchDefinition.matchAll = true;
			}
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId]) {
				wdw_addressbooksAdd.gSearchDefinition.rules = JSON.parse(JSON.stringify(cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].rules));
			} else {
				wdw_addressbooksAdd.gSearchDefinition.rules = [{case: "", field: "", term: "", value: ""}];
			}
		},
		
		initWizardEvents: function () {
			document.addEventListener("cancel", wdw_addressbooksAdd.cancelWizard);
			document.addEventListener("dialogextra2", wdw_addressbooksAdd.showPreviousPage);
			document.addEventListener("dialogaccept", wdw_addressbooksAdd.showNextPage);
		},
		
		loadWizard: function () {
			i18n.updateDocument({ extension: cardbookRepository.extension });
			wdw_addressbooksAdd.initWizardEvents();

			if (window.arguments[0].action == "first") {
				wdw_addressbooksAdd.showPage("welcomePage");
			} else if (window.arguments[0].action == "search") {
				wdw_addressbooksAdd.initSearchDefinition();
				wdw_addressbooksAdd.showPage("searchPage");
			} else if (window.arguments[0].action == "discovery") {
				wdw_addressbooksAdd.gAccountsFound = window.arguments[0].accountsToAdd;
				wdw_addressbooksAdd.showPage("namesPage");
			} else {
				wdw_addressbooksAdd.showPage("initialPage");
			}
		},

		loadStandardAddressBooks: function () {
			for (let addrbook of MailServices.ab.directories) {
				if (addrbook.dirPrefId == "ldap_2.servers.history") {
					wdw_addressbooksAdd.gAccountsFound.push(["STANDARD", "", "", addrbook.dirName, cardbookRepository.supportedVersion, "", addrbook.dirPrefId, true]);
				} else {
					wdw_addressbooksAdd.gAccountsFound.push(["STANDARD", "", "", addrbook.dirName, cardbookRepository.supportedVersion, "", addrbook.dirPrefId, false]);
				}
			}
		},

		getCurrentPage: function () {
			let page = document.getElementById("addressbook-creation-dialog").querySelector(".cardbook-page:not([hidden])");
			return page.id;
		},

		getRequiredElements: function (aPageID) {
			let elements = document.getElementById(aPageID).querySelectorAll("[required]:not([disabled]");
			return elements;
		},

		showPreviousPage: function (aEvent) {
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			if (pageMap[currentPage]["previousAction"]) {
				pageMap[currentPage]["previousAction"].apply();
			}
			aEvent.preventDefault();
			aEvent.stopPropagation();
			if (pageMap[currentPage]["extra2Page"] != "null") {
				let previousPage = pageMap[currentPage]["extra2Page"];
				wdw_addressbooksAdd.showPage(previousPage);
			}
		},

		showNextPage: function (aEvent) {
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			if (pageMap[currentPage]["nextAction"]) {
				pageMap[currentPage]["nextAction"].apply();
			}
			aEvent.preventDefault();
			aEvent.stopPropagation();
			if (pageMap[currentPage]["acceptPage"] != "null") {
				let nextPage = pageMap[currentPage]["acceptPage"];
				pageMap[nextPage]["extra2Page"] = currentPage;
				wdw_addressbooksAdd.showPage(nextPage);
			}
		},

		showPage: function (pageID) {
			if (!pageID) {
				return;
			}
			let page = document.getElementById(pageID);
			if (!page) {
				return;
			}
			// show correct node
			let nodes = document.getElementById("addressbook-creation-dialog").querySelectorAll(".cardbook-page");
			for (let node of nodes) {
				if (node.id == pageID) {
					node.hidden = false;
				} else {
					node.hidden = true;
				}
			}
			// update buttons
			for (let buttonName in pageHandlers) {
				// labels
				let dialog = document.getElementById("addressbook-creation-dialog");
				let button = dialog.getButton(buttonName);
				if (pageMap[pageID][buttonName + "Page"]) {
					let label = page.getAttribute("buttonlabel" + buttonName);
					button.setAttribute("label", label);
					button.hidden = false;
				} else {
					button.hidden = true;
				}
			}
			// action
			if (pageMap[pageID].onpageshow) {
				pageMap[pageID].onpageshow.apply();
			}
		},

		checkRequired: function () {
			let canAdvance = true;
			let dialog = document.getElementById("addressbook-creation-dialog");
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			if (currentPage) {
				let eList = wdw_addressbooksAdd.getRequiredElements(currentPage);
				for (let i = 0; i < eList.length && canAdvance; ++i) {
					canAdvance = (eList[i].value != "");
				}
				if (canAdvance) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
			}
		},

		checkFindLinesRequired: function () {
			let canAdvance = false;
			let i = 0;
			while (true) {
				if (document.getElementById('findPageValidateButton' + i)) {
					if (document.getElementById('findPageValidateButton' + i).getAttribute('validated') == "true") {
						canAdvance = true;
						break;
					}
					i++;
				} else {
					break;
				}
			}
			let dialog = document.getElementById("addressbook-creation-dialog");
			if (canAdvance) {
				dialog.removeAttribute("buttondisabledaccept");
			} else {
				dialog.setAttribute("buttondisabledaccept", "true");
			}
		},

		checkNamesLinesRequired: function () {
			let dialog = document.getElementById("addressbook-creation-dialog");
			let canAdvance = true;
			let oneChecked = false;
			let i = 0;
			while (true) {
				if (document.getElementById('namesCheckbox' + i)) {
					let aCheckbox = document.getElementById('namesCheckbox' + i);
					let aAddressbookName = document.getElementById('namesTextbox' + i);
					if (aCheckbox.checked) {
						oneChecked = true;
						 if (aAddressbookName.value == "") {
						 	 canAdvance = false;
						 	 break;
						 }
					}
					i++;
				} else {
					break;
				}
			}
			if (window.arguments[0].action == "first") {
				if ((canAdvance && oneChecked) || !oneChecked) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
			} else {
				if (canAdvance && oneChecked) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
			}
		},

		welcomePageShow: function () {
			wdw_addressbooksAdd.checkRequired();
		},

		initialPageShow: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			wdw_addressbooksAdd.checkRequired();
		},

		initialPageAdvance: function () {
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			let type = document.getElementById('addressbookType').value;
			let nextPage = "";
			if (type == 'local') {
				nextPage = 'localPage';
			} else if (type == 'remote') {
				nextPage = 'remotePage';
			} else if (type == 'standard') {
				wdw_addressbooksAdd.loadStandardAddressBooks();
				nextPage = 'namesPage';
			} else if (type == 'find') {
				nextPage = 'findPage';
			} else if (type == 'search') {
				wdw_addressbooksAdd.initSearchDefinition();
				nextPage = 'searchPage';
			}
			pageMap[currentPage]["acceptPage"] = nextPage;
		},

		localPageSelect: function () {
			document.getElementById('localPageURI').value = "";
			var type = document.getElementById('localPageType').value;
			if (type == "createDB") {
				document.getElementById('localPageURI').setAttribute('required', 'false');
				document.getElementById('localPageURILabel').setAttribute('disabled', 'true');
				document.getElementById('localPageURI').setAttribute('disabled', 'true');
				document.getElementById('localPageURIButton').setAttribute('disabled', 'true');
			} else {
				document.getElementById('localPageURI').setAttribute('required', 'true');
				document.getElementById('localPageURILabel').setAttribute('disabled', 'false');
				document.getElementById('localPageURI').setAttribute('disabled', 'false');
				document.getElementById('localPageURIButton').setAttribute('disabled', 'false');
			}
			wdw_addressbooksAdd.checkRequired();
		},

		localPageAdvance: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			var type = document.getElementById('localPageType').value;
			switch(type) {
				case "createDB":
					wdw_addressbooksAdd.gAccountsFound.push(["LOCALDB",
																"",
																"",
																"",
																cardbookRepository.supportedVersion,
																"",
																"",
																false]);
					break;
				case "createDirectory":
					wdw_addressbooksAdd.gAccountsFound.push(["DIRECTORY",
																"",
																"",
																wdw_addressbooksAdd.gFile.leafName,
																cardbookRepository.supportedVersion,
																"CREATEDIRECTORY",
																"",
																false]);
					break;
				case "createFile":
					wdw_addressbooksAdd.gAccountsFound.push(["FILE",
																"",
																"",
																wdw_addressbooksAdd.gFile.leafName,
																cardbookRepository.supportedVersion,
																"CREATEFILE",
																"",
																false]);
					break;
				case "openDirectory":
					wdw_addressbooksAdd.gAccountsFound.push(["DIRECTORY",
																"",
																"",
																wdw_addressbooksAdd.gFile.leafName,
																cardbookRepository.supportedVersion,
																"OPENDIRECTORY",
																"",
																false]);
					break;
				case "openFile":
					wdw_addressbooksAdd.gAccountsFound.push(["FILE",
																"",
																"",
																wdw_addressbooksAdd.gFile.leafName,
																cardbookRepository.supportedVersion,
																"OPENFILE",
																"",
																false]);
					break;
			}
		},

		searchFile: function () {
			cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "OK");
			var type = document.getElementById('localPageType').value;
			switch(type) {
				case "createDirectory":
				case "openDirectory":
				case "standard":
					cardbookWindowUtils.callDirPicker("dirChooseTitle", wdw_addressbooksAdd.checkFile);
					break;
				case "createFile":
					cardbookWindowUtils.callFilePicker("fileCreationVCFTitle", "SAVE", "VCF", "", "", wdw_addressbooksAdd.checkFile);
					break;
				case "openFile":
					cardbookWindowUtils.callFilePicker("fileSelectionVCFTitle", "OPEN", "VCF", "", "", wdw_addressbooksAdd.checkFile);
					break;
			}
		},

		checkFile: function (aFile) {
			var myTextbox = document.getElementById('localPageURI');
			var type = document.getElementById('localPageType').value;
			if (aFile) {
				if (type == 'openFile' || type == 'createFile') {
					if (cardbookRepository.cardbookUtils.isFileAlreadyOpen(aFile.path)) {
						cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "fileAlreadyOpen", [aFile.path]);
					} else {
						myTextbox.value = aFile.path;
						wdw_addressbooksAdd.gFile = aFile;
					}
				} else {
					if (cardbookRepository.cardbookUtils.isDirectoryAlreadyOpen(aFile.path)) {
						cardbookNotifications.setNotification(ABAddNotification.localPageURINotifications, "directoryAlreadyOpen", [aFile.path]);
					} else {
						myTextbox.value = aFile.path;
						wdw_addressbooksAdd.gFile = aFile;
					}
				}
			}
			wdw_addressbooksAdd.checkRequired();
		},

		checklocationNetwork: function () {
			let dialog = document.getElementById("addressbook-creation-dialog");
			let canValidate = true;
			let currentPage = wdw_addressbooksAdd.getCurrentPage();
			if (currentPage) {
				if (wdw_addressbooksAdd.gValidateURL) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
				if (wdw_addressbooksAdd.gValidateURL) {
					document.getElementById('validateButton').disabled = !wdw_addressbooksAdd.gValidateURL;
				} else {
					canValidate = wdw_addressbooksAdd.validateEmail();
					let eList = wdw_addressbooksAdd.getRequiredElements(currentPage);
					for (let i = 0; i < eList.length && canValidate; ++i) {
						canValidate = (eList[i].value != "");
					}
					document.getElementById('validateButton').disabled = !canValidate;
				}
			}
		},

		isValidAddress: function (aEmail) {
			return aEmail.includes("@", 1) && !aEmail.endsWith("@");;
		},

		validateEmail: function () {
			let canValidate = true;
			let type = document.getElementById('remotePageType').value;
			let username = document.getElementById('remotePageUsername').value;
			let myRemotePageUsernameInfo = document.getElementById("remotePageUsernameInfo");
			if (type == 'GOOGLE2' || type == 'GOOGLE3') {
				canValidate = wdw_addressbooksAdd.isValidAddress(username);
				if (canValidate) {
					myRemotePageUsernameInfo.src="";
					myRemotePageUsernameInfo.removeAttribute('tooltiptext');
				} else {
					myRemotePageUsernameInfo.src="chrome://global/skin/icons/warning.svg";
					myRemotePageUsernameInfo.setAttribute('tooltiptext', cardbookRepository.extension.localeData.localizeMessage("ValidatingEmailFailedLabel"));
				}
			}
			return canValidate;
		},

		remotePageSelect: function () {
			wdw_addressbooksAdd.gValidateURL = false;
			document.getElementById('remotePageURI').value = "";
			document.getElementById('remotePageUsername').value = "";
			document.getElementById("remotePageUsernameInfo").classList.remove("icon-warning");
			document.getElementById("remotePageUsernameInfo").removeAttribute('tooltiptext');
			document.getElementById('remotePagePassword').value = "";
			
			var type = document.getElementById('remotePageType').value;
			if (type == 'GOOGLE2' || type == 'GOOGLE3') {
				document.getElementById('remotePageUriLabel').disabled=true;
				document.getElementById('remotePageURI').disabled=true;
				document.getElementById('remotePageURI').setAttribute('required', 'false');
				document.getElementById('remotePagePasswordLabel').disabled=true;
				document.getElementById('remotePagePassword').disabled=true;
				document.getElementById('remotePagePassword').setAttribute('required', 'false');
				document.getElementById('rememberPasswordCheckbox').disabled=true;
				document.getElementById('validateButton').hidden=true;
				document.getElementById('validateGoogleButton').hidden=false;
			} else if (type == 'APPLE' || type == 'YAHOO') {
				document.getElementById('remotePageUriLabel').disabled=true;
				document.getElementById('remotePageURI').disabled=true;
				document.getElementById('remotePageURI').setAttribute('required', 'false');
				document.getElementById('remotePagePasswordLabel').disabled=false;
				document.getElementById('remotePagePassword').disabled=false;
				document.getElementById('remotePagePassword').setAttribute('required', 'true');
				document.getElementById('rememberPasswordCheckbox').disabled=false;
				document.getElementById('validateButton').hidden=false;
				document.getElementById('validateGoogleButton').hidden=true;
			} else {
				document.getElementById('remotePageUriLabel').disabled=false;
				document.getElementById('remotePageURI').disabled=false;
				document.getElementById('remotePageURI').setAttribute('required', 'true');
				document.getElementById('remotePagePasswordLabel').disabled=false;
				document.getElementById('remotePagePassword').disabled=false;
				document.getElementById('remotePagePassword').setAttribute('required', 'true');
				document.getElementById('rememberPasswordCheckbox').disabled=false;
				document.getElementById('validateButton').hidden=false;
				document.getElementById('validateGoogleButton').hidden=true;
			}
			wdw_addressbooksAdd.checklocationNetwork();
			cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "OK");
		},

		remotePageTextboxInput: function () {
			wdw_addressbooksAdd.gValidateURL = false;
			wdw_addressbooksAdd.checklocationNetwork();
			cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "OK");
		},

		remotePageShow: function () {
			wdw_addressbooksAdd.checklocationNetwork();
			wdw_addressbooksAdd.validateEmail();
			wdw_addressbooksAdd.remotePageSelect();
		},

		remotePageAdvance: function () {
			let myType = document.getElementById('remotePageType').value;
			// APPLE, YAHOO or CARDDAV have already been added to gAccountsFound
			if (myType == "GOOGLE2" || myType == "GOOGLE3") {
				wdw_addressbooksAdd.gAccountsFound = [];
				wdw_addressbooksAdd.gAccountsFound.push([myType,
															cardbookRepository.cardbookOAuthData[myType].ROOT_API,
															document.getElementById('remotePageUsername').value,
															document.getElementById('remotePageUsername').value,
															cardbookRepository.cardbookOAuthData[myType].VCARD_VERSIONS,
															"",
															"",
															false]);
			}
		},

		constructComplexSearch: function () {
			var ABList = document.getElementById('addressbookMenulist');
			var ABPopup = document.getElementById('addressbookMenupopup');
			cardbookElementTools.loadAddressBooks(ABPopup, ABList, wdw_addressbooksAdd.gSearchDefinition.searchAB, true, true, true, false, false);
			cardbookComplexSearch.loadMatchAll(wdw_addressbooksAdd.gSearchDefinition.matchAll);
			cardbookComplexSearch.constructDynamicRows("searchTerms", wdw_addressbooksAdd.gSearchDefinition.rules, "3.0");
			document.getElementById('searchTerms_0_valueBox').focus();
		},

		checkSearch: function () {
			wdw_addressbooksAdd.constructComplexSearch();
			let dialog = document.getElementById("addressbook-creation-dialog");
			dialog.setAttribute("buttondisabledaccept", "true");
			function checkTerms() {
				if (cardbookComplexSearch.getSearch().rules.length) {
					dialog.removeAttribute("buttondisabledaccept");
				} else {
					dialog.setAttribute("buttondisabledaccept", "true");
				}
			};
			checkTerms();
			document.getElementById('searchTerms').addEventListener("input", checkTerms, false);
			document.getElementById('searchTerms').addEventListener("command", checkTerms, false);
			document.getElementById('searchTerms').addEventListener("click", checkTerms, false);
		},

		searchPageAdvance: function () {
			let mySearch = cardbookComplexSearch.getSearch();
			wdw_addressbooksAdd.gSearchDefinition.searchAB = mySearch.searchAB;
			wdw_addressbooksAdd.gSearchDefinition.matchAll = mySearch.matchAll;
			wdw_addressbooksAdd.gSearchDefinition.rules = JSON.parse(JSON.stringify(mySearch.rules));
		},

		showPassword: function () {
			let myPasswordTextbox = document.getElementById("remotePagePassword");
			if (!myPasswordTextbox.value) {
				return;
			}

			let myPasswordTextboxInfo = document.getElementById("remotePagePasswordInfo");
			if (myPasswordTextbox.type == "password") {
				myPasswordTextbox.type = "text";
				myPasswordTextboxInfo.src = "chrome://messenger/skin/icons/visible.svg";
			} else {
				myPasswordTextbox.type = "password";
				myPasswordTextboxInfo.src = "chrome://messenger/skin/icons/hidden.svg";
			}
		},

		validateURL: function () {
			let dialog = document.getElementById("addressbook-creation-dialog");
			dialog.setAttribute("buttondisabledaccept", "true");
			document.getElementById('remotePageURI').value = cardbookRepository.cardbookUtils.decodeURL(document.getElementById('remotePageURI').value.trim());
			document.getElementById('validateButton').disabled = true;

			let type = document.getElementById('remotePageType').value;
			let username = document.getElementById('remotePageUsername').value;
			let password = document.getElementById('remotePagePassword').value;
			let url;
			if (type == 'GOOGLE2' || type == 'GOOGLE3') {
				url = cardbookRepository.cardbookOAuthData[type].ROOT_API;
			} else if (type == 'YAHOO') {
				url = cardbookRepository.YAHOO_API;
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getSlashedUrl(url), true]); // [url, discovery]
			} else if (type == 'APPLE') {
				url = cardbookRepository.APPLE_API;
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getSlashedUrl(url), true]); // [url, discovery]
			} else {
				url = document.getElementById('remotePageURI').value;
				if (cardbookRepository.cardbookSynchronization.getRootUrl(url) == "") {
					cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidatingURLFailedLabel");
					return;
				}
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getSlashedUrl(url), false]); // [url, discovery]
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getSlashedUrl(url), true]);
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getWellKnownUrl(url), true]);
			}
			
			let dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			if (type == 'GOOGLE2' || type == 'GOOGLE3') {
				cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "Validating1Label", [url], "PRIORITY_INFO_MEDIUM");
				cardbookRepository.cardbookSynchronization.initMultipleOperations(dirPrefId);
				cardbookRepository.cardbookServerSyncRequest[dirPrefId]++;
				let connection = {connUser: username, connPrefId: dirPrefId, connType: type, connDescription: wdw_addressbooksAdd.gValidateDescription};
				cardbookRepository.cardbookSynchronizationGoogle2.requestNewRefreshTokenForGooglePeople(connection, null, type, null);
				wdw_addressbooksAdd.waitForRefreshTokenFinished(dirPrefId, url, type, username);
			} else {
				cardbookRepository.cardbookSynchronization.initDiscoveryOperations(dirPrefId);
				wdw_addressbooksAdd.validateCardDAVURL(dirPrefId, username, password, type);
			}
		},

		validateCardDAVURL: function (aDirPrefId, aUsername, aPassword, aType) {
			cardbookRepository.cardbookPreferences.setId(aDirPrefId, aDirPrefId);
			cardbookRepository.cardbookPreferences.setUrl(aDirPrefId, wdw_addressbooksAdd.gCardDAVURLs[0][0]);
			wdw_addressbooksAdd.gRunningDirPrefId.push(aDirPrefId);
			cardbookRepository.cardbookPasswordManager.rememberPassword(aUsername, wdw_addressbooksAdd.gCardDAVURLs[0][0], aPassword, document.getElementById("rememberPasswordCheckbox").checked);
			
			if (wdw_addressbooksAdd.gCardDAVURLs.length > 0) {
				cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "Validating1Label", [wdw_addressbooksAdd.gCardDAVURLs[0][0]], "PRIORITY_INFO_MEDIUM");
				cardbookRepository.cardbookSynchronization.initMultipleOperations(aDirPrefId);
				cardbookRepository.cardbookServerValidation[aDirPrefId] = {length: 0, user: aUsername};
				cardbookRepository.cardbookServerSyncRequest[aDirPrefId]++;
				var connection = {connUser: aUsername, connPrefId: aDirPrefId, connUrl: wdw_addressbooksAdd.gCardDAVURLs[0][0], connDescription: wdw_addressbooksAdd.gValidateDescription};
				var params = {aPrefIdType: aType};
				if (wdw_addressbooksAdd.gCardDAVURLs[0][1]) {
					cardbookRepository.cardbookSynchronization.discoverPhase1(connection, "GETDISPLAYNAME", params);
				} else {
					cardbookRepository.cardbookSynchronization.validateWithoutDiscovery(connection, "GETDISPLAYNAME", params);
				}
				wdw_addressbooksAdd.waitForDiscoveryFinished(aDirPrefId, aUsername, aPassword, aType);
			}
		},

		validateFindLine: function (aRowId) {
			if (document.getElementById('findPageValidateButton' + aRowId).getAttribute('validated') == "true") {
				return;
			}
			var dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			document.getElementById('findPageValidateButton' + aRowId).setAttribute('dirPrefId', dirPrefId);
			
			var myType = document.getElementById('findPageValidateButton' + aRowId).getAttribute('validationType');
			var myURL = document.getElementById('findPageURLTextbox' + aRowId).value;
			var myUsername = document.getElementById('findUsernameTextbox' + aRowId).value;

			if (myType == 'GOOGLE2' || myType == 'GOOGLE3') {
				cardbookRepository.cardbookSynchronization.initMultipleOperations(dirPrefId);
				cardbookRepository.cardbookServerSyncRequest[dirPrefId]++;
				var connection = {connUser: myUsername, connPrefId: dirPrefId, connType: myType, connDescription: wdw_addressbooksAdd.gValidateDescription};
				cardbookRepository.cardbookSynchronizationGoogle2.requestNewRefreshTokenForGooglePeople(connection, null, myType, null);
				wdw_addressbooksAdd.waitForFindRefreshTokenFinished(aRowId, dirPrefId, myURL, myType, myUsername);
			} else {
				var myPassword = document.getElementById('findPasswordTextbox' + aRowId).value;
				cardbookRepository.cardbookSynchronization.initDiscoveryOperations(dirPrefId);
				cardbookRepository.cardbookPreferences.setId(dirPrefId, dirPrefId);
				cardbookRepository.cardbookPreferences.setUrl(dirPrefId, myURL);
				wdw_addressbooksAdd.gRunningDirPrefId.push(dirPrefId);
				cardbookRepository.cardbookPasswordManager.rememberPassword(myUsername, myURL, myPassword, document.getElementById("rememberPasswordCheckbox").checked);
				
				cardbookRepository.cardbookSynchronization.initMultipleOperations(dirPrefId);
				cardbookRepository.cardbookServerValidation[dirPrefId] = {length: 0, user: myUsername};
				cardbookRepository.cardbookServerSyncRequest[dirPrefId]++;
				var connection = {connUser: myUsername, connPrefId: dirPrefId, connUrl: myURL, connDescription: wdw_addressbooksAdd.gValidateDescription};
				var params = {aPrefIdType: myType};
				if (myURL.endsWith(".well-known/carddav")) {
					cardbookRepository.cardbookSynchronization.discoverPhase1(connection, "GETDISPLAYNAME", params);
				} else {
					cardbookRepository.cardbookSynchronization.validateWithoutDiscovery(connection, "GETDISPLAYNAME", params);
				}
				wdw_addressbooksAdd.waitForFindDiscoveryFinished(aRowId, dirPrefId, myUsername, myPassword, myType);
			}
		},

		waitForDiscoveryFinished: function (aDirPrefId, aUsername, aPassword, aType) {
			wdw_addressbooksAdd.lTimerDiscoveryAll[aDirPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerDiscovery = wdw_addressbooksAdd.lTimerDiscoveryAll[aDirPrefId];
			lTimerDiscovery.initWithCallback({ notify: function(lTimerDiscovery) {
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryError : ", cardbookRepository.cardbookServerDiscoveryError[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerValidation : ", cardbookRepository.cardbookServerValidation[aDirPrefId]);
						if (cardbookRepository.cardbookServerDiscoveryError[aDirPrefId] >= 1) {
							wdw_addressbooksAdd.gCardDAVURLs.shift();
							if (cardbookRepository.cardbookServerValidation[aDirPrefId] && cardbookRepository.cardbookServerValidation[aDirPrefId].length == 0) {
								cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
								if (wdw_addressbooksAdd.gCardDAVURLs.length == 0) {
									cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidationFailedLabel");
									wdw_addressbooksAdd.gValidateURL = false;
									wdw_addressbooksAdd.checklocationNetwork();
									lTimerDiscovery.cancel();
								} else {
									document.getElementById('validateButton').disabled = true;
									lTimerDiscovery.cancel();
									wdw_addressbooksAdd.validateCardDAVURL(aDirPrefId, aUsername, aPassword, aType);
								}
							} else {
								cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
								cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidationFailedLabel");
								wdw_addressbooksAdd.gValidateURL = false;
								wdw_addressbooksAdd.checklocationNetwork();
								lTimerDiscovery.cancel();
							}
						} else if (cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId] !== cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] || cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] === 0) {
							cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "Validating1Label", [wdw_addressbooksAdd.gCardDAVURLs[0][0]], "PRIORITY_INFO_MEDIUM");
						} else {
							wdw_addressbooksAdd.gCardDAVURLs.shift();
							if (cardbookRepository.cardbookServerValidation[aDirPrefId] && cardbookRepository.cardbookServerValidation[aDirPrefId].length == 0) {
								cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
								if (wdw_addressbooksAdd.gCardDAVURLs.length == 0) {
									cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidationFailedLabel");
									wdw_addressbooksAdd.gValidateURL = false;
									wdw_addressbooksAdd.checklocationNetwork();
									lTimerDiscovery.cancel();
								} else {
									document.getElementById('validateButton').disabled = true;
									lTimerDiscovery.cancel();
									wdw_addressbooksAdd.validateCardDAVURL(aDirPrefId, aUsername, aPassword, aType);
								}
							} else {
								wdw_addressbooksAdd.gCardDAVURLs = [];
								cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "OK");
								wdw_addressbooksAdd.gValidateURL = true;
								wdw_addressbooksAdd.checklocationNetwork();
								wdw_addressbooksAdd.gAccountsFound = cardbookRepository.cardbookUtils.fromValidationToArray(aDirPrefId, aType);
								cardbookRepository.cardbookSynchronization.stopDiscoveryOperations(aDirPrefId);
								cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
								lTimerDiscovery.cancel();
							}
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		waitForFindDiscoveryFinished: function (aRowId, aDirPrefId, aUsername, aPassword, aType) {
			wdw_addressbooksAdd.lTimerDiscoveryAll[aDirPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerDiscovery = wdw_addressbooksAdd.lTimerDiscoveryAll[aDirPrefId];
			lTimerDiscovery.initWithCallback({ notify: function(lTimerDiscovery) {
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryRequest : ", cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryResponse : ", cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerDiscoveryError : ", cardbookRepository.cardbookServerDiscoveryError[aDirPrefId]);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : cardbookRepository.cardbookServerValidation : ", cardbookRepository.cardbookServerValidation[aDirPrefId]);
						var myButton = document.getElementById('findPageValidateButton' + aRowId);
						if (cardbookRepository.cardbookServerDiscoveryError[aDirPrefId] >= 1) {
							myButton.setAttribute('validated', 'false');
							myButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("ValidationFailedLabel"));
							wdw_addressbooksAdd.checkFindLinesRequired();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
							lTimerDiscovery.cancel();
						} else if (cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId] !== cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] || cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] === 0) {
							myButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("Validating2Label"));
						} else {
							myButton.setAttribute('validated', 'true');
							myButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("ValidationOKLabel"));
							wdw_addressbooksAdd.checkFindLinesRequired();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
							lTimerDiscovery.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		waitForRefreshTokenFinished: function (aPrefId, aUrl, aType, aUsername) {
			wdw_addressbooksAdd.lTimerRefreshTokenAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			let lTimerRefreshToken = wdw_addressbooksAdd.lTimerRefreshTokenAll[aPrefId];
			lTimerRefreshToken.initWithCallback({ notify: function(lTimerRefreshToken) {
						if (cardbookRepository.cardbookRefreshTokenError[aPrefId] >= 1) {
							cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidationFailedLabel");
							wdw_addressbooksAdd.gValidateURL = false;
							wdw_addressbooksAdd.checklocationNetwork();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aPrefId);
							lTimerRefreshToken.cancel();
						} else if (cardbookRepository.cardbookRefreshTokenResponse[aPrefId] !== cardbookRepository.cardbookRefreshTokenRequest[aPrefId]) {
							cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "Validating1Label", [aUrl], "PRIORITY_INFO_MEDIUM");
						} else {
							cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "OK");
							wdw_addressbooksAdd.gValidateURL = true;
							wdw_addressbooksAdd.checklocationNetwork();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aPrefId);
							lTimerRefreshToken.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		waitForFindRefreshTokenFinished: function (aRowId, aPrefId, aUrl, aType, aUsername) {
			wdw_addressbooksAdd.lTimerRefreshTokenAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			let lTimerRefreshToken = wdw_addressbooksAdd.lTimerRefreshTokenAll[aPrefId];
			lTimerRefreshToken.initWithCallback({ notify: function(lTimerRefreshToken) {
						var myButton = document.getElementById('findPageValidateButton' + aRowId);
						if (cardbookRepository.cardbookRefreshTokenError[aPrefId] >= 1) {
							myButton.setAttribute('validated', 'false');
							myButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("ValidationFailedLabel"));
							wdw_addressbooksAdd.checkFindLinesRequired();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aPrefId);
							lTimerRefreshToken.cancel();
						} else if (cardbookRepository.cardbookRefreshTokenResponse[aPrefId] !== cardbookRepository.cardbookRefreshTokenRequest[aPrefId]) {
							myButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("Validating2Label"));
						} else {
							myButton.setAttribute('validated', 'true');
							myButton.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("ValidationOKLabel"));
							wdw_addressbooksAdd.checkFindLinesRequired();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aPrefId);
							lTimerRefreshToken.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		loadSearchName: function () {
			if (window.arguments[0].dirPrefId) {
				document.getElementById('searchNamePageName').value = cardbookRepository.cardbookPreferences.getName(window.arguments[0].dirPrefId);
			}
			wdw_addressbooksAdd.checkRequired();
		},

		createBoxesForNames: function (aType, aURL, aName, aVersionList, aUsername, aActionType, aSourceDirPrefId, aSourceCollected) {
			let table = document.getElementById('namesTable');
			let aId = table.rows.length - 1;
			let aRow = cardbookElementTools.addTableRow(table, 'namesRow' + aId);

			let checkboxData = cardbookElementTools.addTableData(aRow, 'namesTableData.' + aId + '.1');
			let checkbox = document.createXULElement('checkbox');
			checkboxData.appendChild(checkbox);
			checkbox.setAttribute('checked', true);
			checkbox.setAttribute('id', 'namesCheckbox' + aId);
			checkbox.setAttribute('validationType', aType);
			checkbox.setAttribute('username', aUsername);
			checkbox.setAttribute('actionType', aActionType);
			checkbox.setAttribute('sourceDirPrefId', aSourceDirPrefId);
			checkbox.setAttribute('sourceCollected', aSourceCollected.toString());
			checkbox.setAttribute("aria-labelledby", "namesPageSelectedLabel");
			checkbox.addEventListener("command", function() {
					let textbox = document.getElementById('namesTextbox' + this.id.replace("namesCheckbox",""));
					if (this.checked) {
						textbox.setAttribute('required', true);
					} else {
						textbox.setAttribute('required', false);
					}
					wdw_addressbooksAdd.checkNamesLinesRequired();
				}, false);

			let nameData = cardbookElementTools.addTableData(aRow, 'namesTableData.' + aId + '.2');
			let nameTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			nameData.appendChild(nameTextbox);
			nameTextbox.setAttribute('id', 'namesTextbox' + aId);
			nameTextbox.setAttribute("aria-labelledby", "namesPageNameLabel");
			nameTextbox.setAttribute('required', true);
			nameTextbox.value = aName;
			nameTextbox.addEventListener("input", function() {
					wdw_addressbooksAdd.checkNamesLinesRequired();
				}, false);

			let colorData = cardbookElementTools.addTableData(aRow, 'namesTableData.' + aId + '.3');
			let colorbox =  document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			colorData.appendChild(colorbox);
			colorbox.setAttribute('id', 'serverColorInput' + aId);
			colorbox.setAttribute("aria-labelledby", "namesPageColorLabel");
			colorbox.setAttribute('palettename', "standard");
			colorbox.setAttribute('type', "color");
			colorbox.value = cardbookRepository.cardbookUtils.randomColor(100);
			
			let menuData = cardbookElementTools.addTableData(aRow, 'namesTableData.' + aId + '.4');
			let menuList = document.createXULElement('menulist');
			menuData.appendChild(menuList);
			menuList.setAttribute('id', 'vCardVersionPageName' + aId);
			menuList.setAttribute("aria-labelledby", "namesPageVCardVersionLabel");
			let menuPopup = document.createXULElement('menupopup');
			menuList.appendChild(menuPopup);
			menuPopup.setAttribute('id', 'vCardVersionPageNameMenupopup' + aId);
			cardbookElementTools.loadVCardVersions(menuPopup.id, menuList.id, aVersionList);

			let URLData = cardbookElementTools.addTableData(aRow, 'namesTableData.' + aId + '.5');
			let URLTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			URLData.appendChild(URLTextbox);
			URLTextbox.setAttribute('id', 'URLTextbox' + aId);
			URLTextbox.setAttribute("aria-labelledby", "namesPageURLLabel");
			URLTextbox.setAttribute('hidden', 'true');
			URLTextbox.value = aURL;

			let checkbox1Data = cardbookElementTools.addTableData(aRow, 'namesTableData.' + aId + '.6');
			let checkbox1 = document.createXULElement('checkbox');
			checkbox1Data.appendChild(checkbox1);
			checkbox1.setAttribute('checked', true);
			checkbox1.setAttribute('id', 'DBCachedCheckbox' + aId);
			checkbox1.setAttribute("aria-labelledby", "namesPageDBCachedLabel");
			if (aType == "CARDDAV") {
				checkbox1.setAttribute('disabled', false);
			} else {
				checkbox1.setAttribute('disabled', true);
			}
		},

		loadNames: function () {
			cardbookElementTools.deleteTableRows('namesTable', 'namesTableRow');
			if (window.arguments[0].action == "discovery") {
				wdw_addressbooksAdd.setCanRewindFalse();
			}
			if (wdw_addressbooksAdd.gAccountsFound.length > 1) {
				document.getElementById('namesPageDescription').hidden = false;
			} else {
				document.getElementById('namesPageDescription').hidden = true;
			}
			for (var myAccountFound of wdw_addressbooksAdd.gAccountsFound) {
				if (myAccountFound[4].length > 0) {
					wdw_addressbooksAdd.createBoxesForNames(myAccountFound[0], myAccountFound[1], myAccountFound[3],
													myAccountFound[4], myAccountFound[2], myAccountFound[5], myAccountFound[6], myAccountFound[7]);
				} else {
					wdw_addressbooksAdd.createBoxesForNames(myAccountFound[0], myAccountFound[1], myAccountFound[3],
													[ "3.0", "4.0" ], myAccountFound[2], myAccountFound[5], myAccountFound[6], myAccountFound[7]);
				}
			}
			wdw_addressbooksAdd.checkNamesLinesRequired();
		},

		namesAdvance: function () {
			wdw_addressbooksAdd.prepareAddressbook();
			if (window.arguments[0].action == "first" && !wdw_addressbooksAdd.gFirstFirstStepDone) {
				pageMap["namesPage"]["acceptPage"] = 'finishFirstPage';
			} else {
				pageMap["namesPage"]["acceptPage"] = 'finishPage';
			}
		},

		sendRequestForFinds: function (aEmail, aDomain) {
			let request = CardbookHttpRequest(wdw_addressbooksAdd.gAutoconfigURL + aDomain, "");
			request.open('GET', wdw_addressbooksAdd.gAutoconfigURL + aDomain, true);
			request.onreadystatechange = function() {
				if (request.readyState == 4) {
					if (request.status > 199 && request.status < 400) {
						try {
							let xmlParser = new DOMParser();
							xmlParser.forceEnableXULXBL();
							let responseXML = xmlParser.parseFromString(request.responseText, "text/xml");
							let responseJSON = new XMLToJSONParser(responseXML);
							if (responseJSON && responseJSON.clientConfig && responseJSON.clientConfig[0] && responseJSON.clientConfig[0].carddavProvider
								 && responseJSON.clientConfig[0].carddavProvider[0]) {
								let infos = responseJSON.clientConfig[0].carddavProvider[0];
								if (!infos.carddavURL[0]) {
									return;
								}
								let url = infos.carddavURL[0].replace("%EMAILADDRESS%", aEmail);
								let password = "";
								let domain = aEmail.split("@")[1];
								let foundLogins = Services.logins.findLogins("smtp://smtp." + domain, "", "");
								if (foundLogins.length > 0) {
									password = foundLogins[0].password;
								}
								let vCardVersion = "";
								if (infos.vCardVersion && infos.vCardVersion[0]) {
									vCardVersion = infos.vCardVersion[0];
								}
								wdw_addressbooksAdd.createBoxesForFinds("CARDDAV", aEmail, password, vCardVersion, url, aEmail);
								wdw_addressbooksAdd.setFindLinesHeader();
							}
						} catch(e) {}
					} else {
						// if file fastmail.fr is not found let's check for file fastmail 
						let domain = aDomain.split(".")[0];
						if (domain != aDomain) {
							wdw_addressbooksAdd.sendRequestForFinds(aEmail, domain);
						}
					}
				}
			};
			request.send(null);
		},

		createBoxesForFinds: function (aType, aUsername, aPassword, aVCardVersion, aUrl, aABName) {
			let table = document.getElementById('findTable');
			let aId = table.rows.length - 1;
			let aRow = cardbookElementTools.addTableRow(table, 'findTable.' + aId);
			
			let buttonData = cardbookElementTools.addTableData(aRow, 'findTableData.' + aId + '.1');
			let button = document.createXULElement('button');
			buttonData.appendChild(button);
			button.setAttribute('id', 'findPageValidateButton' + aId);
			button.setAttribute("aria-labelledby", "findPageValidateLabel");
			button.setAttribute('flex', '1');
			button.setAttribute('validationType', aType);
			button.setAttribute('validated', 'false');
			button.setAttribute('label', cardbookRepository.extension.localeData.localizeMessage("noValidatedEntryTooltip"));
			button.addEventListener("command", function() {
					var myId = this.id.replace("findPageValidateButton","");
					wdw_addressbooksAdd.validateFindLine(myId);
				}, false);

			let usernameData = cardbookElementTools.addTableData(aRow, 'findTableData.' + aId + '.2');
			let usernameTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			usernameData.appendChild(usernameTextbox);
			usernameTextbox.setAttribute('id', 'findUsernameTextbox' + aId);
			usernameTextbox.setAttribute("aria-labelledby", "findPageUserLabel");
			usernameTextbox.setAttribute('required', true);
			usernameTextbox.setAttribute('disabled', true);
			usernameTextbox.setAttribute('class', 'cardbook-large-column');
			usernameTextbox.value = aUsername;

			let paswordData = cardbookElementTools.addTableData(aRow, 'findTableData.' + aId + '.3');
			let checkboxData = cardbookElementTools.addTableData(aRow, 'findTableData.' + aId + '.4');
			if (aPassword != null) {
				let passwordTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
				paswordData.appendChild(passwordTextbox);
				passwordTextbox.setAttribute('id', 'findPasswordTextbox' + aId);
				passwordTextbox.setAttribute("aria-labelledby", "findPagePasswordLabel");
				passwordTextbox.setAttribute('type', 'password');
				passwordTextbox.setAttribute('required', true);
				passwordTextbox.value = aPassword;

				let passwordCheckbox = document.createXULElement('checkbox');
				checkboxData.appendChild(passwordCheckbox);
				passwordCheckbox.setAttribute('id', 'findPasswordTextbox' + aId + 'Checkbox');
				passwordCheckbox.setAttribute("aria-labelledby", "findPagePasswordShowLabel");
				passwordCheckbox.addEventListener("command", function() {
						wdw_addressbooksAdd.showPassword(this);
					}, false);
			}

			let versionData = cardbookElementTools.addTableData(aRow, 'findTableData.' + aId + '.5');
			let versionTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			versionData.appendChild(versionTextbox);
			versionTextbox.setAttribute('id', 'findPageVCardVersionsTextbox' + aId);
			versionTextbox.setAttribute("aria-labelledby", "findPageVCardVersionsLabel");
			versionTextbox.setAttribute('hidden', 'true');
			versionTextbox.value = aVCardVersion;

			let URLData = cardbookElementTools.addTableData(aRow, 'findTableData.' + aId + '.6');
			let URLTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			URLData.appendChild(URLTextbox);
			URLTextbox.setAttribute('id', 'findPageURLTextbox' + aId);
			URLTextbox.setAttribute("aria-labelledby", "findPageURLLabel");
			URLTextbox.setAttribute('hidden', 'true');
			URLTextbox.value = aUrl;

			let ABNameData = cardbookElementTools.addTableData(aRow, 'findTableData.' + aId + '.7');
			let ABNameTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			ABNameData.appendChild(ABNameTextbox);
			ABNameTextbox.setAttribute('id', 'findPageABNameTextbox' + aId);
			ABNameTextbox.setAttribute("aria-labelledby", "findPageABNameLabel");
			ABNameTextbox.setAttribute('hidden', 'true');
			ABNameTextbox.value = aABName;

			var found = false;
			for (var i = 0; i < table.rows.length; i++) {
				if (document.getElementById('findPasswordTextbox' + i)) {
					found = true;
					break;
				}
			}
			if (found) {
				document.getElementById('findPagePasswordLabel').removeAttribute('hidden');
				document.getElementById('findPagePasswordShowLabel').removeAttribute('hidden');
			} else {
				document.getElementById('findPagePasswordLabel').setAttribute('hidden', 'true');
				document.getElementById('findPagePasswordShowLabel').setAttribute('hidden', 'true');
			}
		},

		loadFinds: function () {
			cardbookElementTools.deleteTableRows('findTable', 'findHeadersRow');
			if (window.arguments[0].action == "first") {
				wdw_addressbooksAdd.setCanRewindFalse();
			}

			// possibility at first use to set carddav accounts from the preferences
			var setupCardDAVAccounts = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.setupCardDAVAccounts");
			if (setupCardDAVAccounts != "") {
				var setupCardDAVAccountsArray = setupCardDAVAccounts.split(',');
				for (account of setupCardDAVAccountsArray) {
					var accountValue = account.split('::');
					var vCardVersion = accountValue[2] ? accountValue[2] : "";
					wdw_addressbooksAdd.createBoxesForFinds("CARDDAV", accountValue[0], "", vCardVersion, accountValue[1], "");
				}
			}
			var sortedEmailAccounts = [];
			for (let account of MailServices.accounts.accounts) {
				for (let identity of account.identities) {
					if (account.incomingServer.type == "pop3" || account.incomingServer.type == "imap") {
						sortedEmailAccounts.push(identity.email.toLowerCase());
					}
				}
			}
			cardbookRepository.cardbookUtils.sortArrayByString(sortedEmailAccounts,1);
			sortedEmailAccounts = cardbookRepository.arrayUnique(sortedEmailAccounts);
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug1(wdw_addressbooksAdd.gValidateDescription + " : debug mode : sortedEmailAccounts : ", sortedEmailAccounts);

			for (let email of sortedEmailAccounts) {
				let found = false;
				// first OAuth 
				for (var j in cardbookRepository.cardbookOAuthData) {
					if (j == "GOOGLE" || j == "GOOGLE3"){
						continue;
					}
					if (cardbookRepository.cardbookOAuthData[j].EMAIL_TYPE && email.endsWith(cardbookRepository.cardbookOAuthData[j].EMAIL_TYPE)) {
						wdw_addressbooksAdd.createBoxesForFinds(j, email, null, cardbookRepository.cardbookOAuthData[j].VCARD_VERSIONS.toString(),
																	cardbookRepository.cardbookOAuthData[j].ROOT_API, email);
						found = true;
						break;
					}
				}
				// then CARDDAV
				if (!found) {
					let domain = email.split("@")[1];
					wdw_addressbooksAdd.sendRequestForFinds(email, domain);
				}
			}
			wdw_addressbooksAdd.setFindLinesHeader();
			wdw_addressbooksAdd.checkFindLinesRequired();
		},

		setFindLinesHeader: function () {
			if (document.getElementById('findTable').rows.length == 1) {
				document.getElementById('findHeadersRow').setAttribute('hidden', 'true');
				document.getElementById('findPageName1Description').removeAttribute('hidden');
				document.getElementById('findPageName2Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName3Description').setAttribute('hidden', 'true');
			} else if (document.getElementById('findTable').rows.length == 2) {
				document.getElementById('findHeadersRow').removeAttribute('hidden');
				document.getElementById('findPageName1Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName2Description').removeAttribute('hidden');
				document.getElementById('findPageName3Description').setAttribute('hidden', 'true');
			} else {
				document.getElementById('findHeadersRow').removeAttribute('hidden');
				document.getElementById('findPageName1Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName2Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName3Description').removeAttribute('hidden');
			}
		},

		findAdvance: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			var i = 0;
			while (true) {
				if (document.getElementById('findPageValidateButton' + i)) {
					if (document.getElementById('findPageValidateButton' + i).getAttribute('validated') == "true") {
						var type = document.getElementById('findPageValidateButton' + i).getAttribute('validationType');
						var dirPrefId = document.getElementById('findPageValidateButton' + i).getAttribute('dirPrefId');
						var vCard = document.getElementById('findPageVCardVersionsTextbox' + i).value.split(",");
						var name = document.getElementById('findPageABNameTextbox' + i).value;
						if (type == "CARDDAV") {
							var result = cardbookRepository.cardbookUtils.fromValidationToArray(dirPrefId, type);
							for (var j = 0; j < result.length; j++) {
								if (name != "") {
									result[j][3] = name;
								}
								if (vCard != "") {
									result[j][4] = vCard;
								}
								wdw_addressbooksAdd.gAccountsFound.push(result[j]);
							}
						} else {
							wdw_addressbooksAdd.gAccountsFound.push([type,
																	document.getElementById('findPageURLTextbox' + i).value,
																	document.getElementById('findUsernameTextbox' + i).value,
																	name,
																	vCard,
																	"",
																	"",
																	false]);
						}
					}
					i++
				} else {
					break;
				}
			}
		},

		finishFirstPageShow: function () {
			wdw_addressbooksAdd.prepareSearchAllContactsAddressbook();
			wdw_addressbooksAdd.createAddressbook();
			wdw_addressbooksAdd.gFirstFirstStepDone = true;
			wdw_addressbooksAdd.setCanRewindFalse();
			if (wdw_addressbooksAdd.gFinishParams.length > 1) {
				document.getElementById('finishFirstPage1Description').setAttribute('hidden', 'true');
				document.getElementById('finishFirstPage2Description').removeAttribute('hidden');
			} else {
				document.getElementById('finishFirstPage1Description').removeAttribute('hidden');
				document.getElementById('finishFirstPage2Description').setAttribute('hidden', 'true');
			}
		},

		finishPageShow: function () {
			wdw_addressbooksAdd.setCanRewindFalse();
			if (wdw_addressbooksAdd.gFinishParams.length > 1) {
				document.getElementById('finishPage1Description').setAttribute('hidden', 'true');
				document.getElementById('finishPage2Description').removeAttribute('hidden');
			} else {
				document.getElementById('finishPage1Description').removeAttribute('hidden');
				document.getElementById('finishPage2Description').setAttribute('hidden', 'true');
			}
		},

		prepareSearchAllContactsAddressbook: function () {
			var dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			var myName = cardbookRepository.extension.localeData.localizeMessage("allContacts");
			wdw_addressbooksAdd.gFinishParams.push({type: "SEARCH", search: { searchAB: "allAddressBooks", matchAll: true, rules: [ { case: "dig", field: "version", term: "IsntEmpty", value: "" } ] },
														name: myName, username: "", color: "", vcard: "", enabled: true,
														dirPrefId: dirPrefId, DBcached: false, firstAction: false});
		},

		prepareSearchAddressbook: function () {
			var name = document.getElementById('searchNamePageName').value;
			if (window.arguments[0].dirPrefId) {
				var dirPrefId = window.arguments[0].dirPrefId;
				var enabled = cardbookRepository.cardbookPreferences.getEnabled(window.arguments[0].dirPrefId);
			} else {
				var dirPrefId = cardbookRepository.cardbookUtils.getUUID();
				var enabled = true;
			}
			wdw_addressbooksAdd.gFinishParams.push({type: "SEARCH", search: cardbookComplexSearch.getSearch(), name: name, username: "", color: "", vcard: "", enabled: enabled,
														dirPrefId: dirPrefId, DBcached: false, firstAction: false});
		},

		prepareAddressbook: function () {
			wdw_addressbooksAdd.gFinishParams = [];
			var i = 0;
			while (true) {
				if (document.getElementById('namesCheckbox' + i)) {
					var aCheckbox = document.getElementById('namesCheckbox' + i);
					if (aCheckbox.checked) {
						var myType = aCheckbox.getAttribute('validationType');
						var aAddressbookId = cardbookRepository.cardbookUtils.getUUID();
						var aAddressbookName = document.getElementById('namesTextbox' + i).value;
						var aAddressbookColor = document.getElementById('serverColorInput' + i).value;
						var aAddressbookVCard = document.getElementById('vCardVersionPageName' + i).value;
						var aAddressbookDBCached = document.getElementById('DBCachedCheckbox' + i).checked;
						var aAddressbookURL = document.getElementById('URLTextbox' + i).value;
						var aAddressbookUsername = aCheckbox.getAttribute('username');
						var aAddressbookValidationType = aCheckbox.getAttribute('validationType');
						var aAddressbookActionType = aCheckbox.getAttribute('actionType');
						var aAddressbookSourceDirPrefId = aCheckbox.getAttribute('sourceDirPrefId');
						var aAddressbookSourceCollected = (aCheckbox.getAttribute('sourceCollected') == 'true');
						if (cardbookRepository.cardbookUtils.isMyAccountRemote(myType)) {
							// the discover should be redone at every sync
							if (myType == 'APPLE') {
								aAddressbookURL = cardbookRepository.APPLE_API;
							} else if (myType == 'YAHOO') {
								aAddressbookURL = cardbookRepository.YAHOO_API;
							}
							let aReadonly = false;
							if (myType == 'GOOGLE3') {
								aReadonly = true;
							}
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, url: aAddressbookURL, name: aAddressbookName, username: aAddressbookUsername, color: aAddressbookColor,
																	vcard: aAddressbookVCard, readonly: aReadonly, dirPrefId: aAddressbookId,
																	DBcached: aAddressbookDBCached, firstAction: false});
						} else if (myType == "LOCALDB") {
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, name: aAddressbookName, username: "", color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false, dirPrefId: aAddressbookId,
																		DBcached: true, firstAction: false});
						} else if (myType == "FILE" || myType == "DIRECTORY") {
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, actionType: aAddressbookActionType, file: wdw_addressbooksAdd.gFile, name: aAddressbookName, username: "",
																	color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false, dirPrefId: aAddressbookId, DBcached: false, firstAction: false});
						} else if (myType == "STANDARD") {
							if (window.arguments[0].action == "first") {
								var aFirstAction = true;
							} else {
								var aFirstAction = false;
							}
							wdw_addressbooksAdd.gFinishParams.push({type: "STANDARD", sourceDirPrefId: aAddressbookSourceDirPrefId,
																name: aAddressbookName, username: "", color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false,
																dirPrefId: aAddressbookId, collected: aAddressbookSourceCollected,
																DBcached: true, firstAction: aFirstAction});
						}
					}
					i++;
				} else {
					break;
				}
			}
		},

		setCanRewindFalse: function () {
			let dialog = document.getElementById("addressbook-creation-dialog");
			let button = dialog.getButton("extra2");
			button.hidden = true;
		},

		createAddressbook: function () {
			for (var i = 0; i < wdw_addressbooksAdd.gFinishParams.length; i++) {
				var myAccount = wdw_addressbooksAdd.gFinishParams[i];
				if (window.arguments[0].action == "search" && window.arguments[0].dirPrefId) {
					wdw_cardbook.modifySearchAddressbook(myAccount.dirPrefId, myAccount.name, myAccount.color, myAccount.vcard, myAccount.readonly,
													false, myAccount.search);
				} else {
					if (myAccount.type === "SEARCH") {
						myAccount.search.dirPrefId = myAccount.dirPrefId;
						cardbookRepository.addSearch(myAccount.search);
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, "", myAccount.username, myAccount.color,
																	myAccount.enabled, true, myAccount.vcard, false, false,
																	myAccount.DBcached, false, "0", true);
						cardbookRepository.cardbookSynchronization.loadComplexSearchAccount(myAccount.dirPrefId, myAccount.search);
					} else  if (cardbookRepository.cardbookUtils.isMyAccountRemote(myAccount.type)) {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myAccount.url, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, myAccount.urnuuid,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.syncAccount(myAccount.dirPrefId);
					} else if (myAccount.type === "STANDARD") {
						if (myAccount.collected) {
							cardbookRepository.addAccountToCollected(myAccount.dirPrefId);
						}
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, "LOCALDB", "", myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myAccount.dirPrefId);
						cardbookRepository.cardbookDBCardRequest[myAccount.dirPrefId]++;
						cardbookRepository.cardbookMigrate.importCards(myAccount.sourceDirPrefId, myAccount.dirPrefId, myAccount.name, myAccount.vcard);
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, false, true);
						// if the first proposed import of standard address books is finished OK
						// then set CardBook as exclusive
						if (myAccount.firstAction) {
							cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.exclusive", true);
						}
					} else if (myAccount.type === "LOCALDB") {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, "", myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	myAccount.DBcached, true, "60", true);
					} else if (myAccount.type === "FILE") {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myAccount.file.path, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myAccount.dirPrefId);
						cardbookRepository.cardbookFileRequest[myAccount.dirPrefId]++;
						var myFile = myAccount.file;
						if (myAccount.actionType === "CREATEFILE") {
							if (myFile.exists()) {
								myFile.remove(true);
							}
							myFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
						}
						cardbookRepository.cardbookSynchronization.loadFile(myFile, myAccount.dirPrefId, myAccount.dirPrefId, "NOIMPORTFILE", "");
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, false, true);
					} else if (myAccount.type === "DIRECTORY") {
						var myDir = myAccount.file;
						if (myAccount.actionType === "CREATEDIRECTORY") {
							if (myDir.exists()) {
								var aListOfFileName = [];
								aListOfFileName = cardbookRepository.cardbookSynchronization.getFilesFromDir(myDir.path);
								if (aListOfFileName.length > 0) {
									var confirmTitle = cardbookRepository.extension.localeData.localizeMessage("confirmTitle");
									var confirmMsg = cardbookRepository.extension.localeData.localizeMessage("directoryDeletionConfirmMessage", [myDir.leafName]);
									if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
										myDir.remove(true);
										try {
											myDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
										}
										catch (e) {
											cardbookRepository.cardbookLog.updateStatusProgressInformation("cannot create directory : " + myDir.path + " : error : " + e, "Error");
											return;
										}
									} else {
										return;
									}
								}
							} else {
								try {
									myDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
								}
								catch (e) {
									cardbookRepository.cardbookLog.updateStatusProgressInformation("cannot create directory : " + myDir.path + " : error : " + e, "Error");
									return;
								}
							}
						}
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myDir.path, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, false,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myAccount.dirPrefId);
						cardbookRepository.cardbookDirRequest[myAccount.dirPrefId]++;
						cardbookRepository.cardbookSynchronization.loadDir(myDir, myAccount.dirPrefId, myAccount.dirPrefId, "NOIMPORTDIR", "");
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, false, true);
					}
					cardbookRepository.cardbookUtils.formatStringForOutput("addressbookCreated", [myAccount.name]);
					cardbookActions.addActivity("addressbookCreated", [myAccount.name], "addItem");
					cardbookRepository.cardbookUtils.notifyObservers("addressbookCreated", myAccount.dirPrefId);
				}
			}
		},

		cancelWizard: function () {
			for (var dirPrefId of wdw_addressbooksAdd.gRunningDirPrefId) {
				cardbookRepository.cardbookPreferences.delAccount(dirPrefId);
				cardbookRepository.cardbookSynchronization.finishMultipleOperations(dirPrefId);
				cardbookRepository.cardbookSynchronization.stopDiscoveryOperations(dirPrefId);
			}
			for (var dirPrefId in wdw_addressbooksAdd.lTimerRefreshTokenAll) {
				try {
					wdw_addressbooksAdd.lTimerRefreshTokenAll[dirPrefId].cancel();
				} catch(e) {}
			}
			for (var dirPrefId in wdw_addressbooksAdd.lTimerDiscoveryAll) {
				try {
					wdw_addressbooksAdd.lTimerDiscoveryAll[dirPrefId].cancel();
				} catch(e) {}
			}
			let dialog = document.getElementById("addressbook-creation-dialog");
			dialog.setAttribute("buttondisabledaccept", "true");
			window.close();
		},

		closeWizard: function () {
			wdw_addressbooksAdd.cancelWizard();
			wdw_addressbooksAdd.createAddressbook();
		}

	};

	// initial --> local --> names --> finish
	// initial --> remote --> names --> finish
	// initial --> names --> finish (import standard AB)
	// initial --> search --> searchName --> finish
	// initial --> find --> names --> finish
	// search --> searchName --> finish
	// welcome --> names --> finishFirst --> find --> names --> finish
	// names --> finish (discovery)
	var pageMap = { "welcomePage": {"extra2Page": null, "acceptPage": "namesPage", 
						onpageshow: wdw_addressbooksAdd.welcomePageShow,
						nextAction: wdw_addressbooksAdd.loadStandardAddressBooks},
					"initialPage": {"extra2Page": null, "acceptPage": "localPage",
						onpageshow: wdw_addressbooksAdd.initialPageShow,
						nextAction: wdw_addressbooksAdd.initialPageAdvance},
					"localPage": {"extra2Page": null, "acceptPage": "namesPage",
						onpageshow: wdw_addressbooksAdd.checkRequired,
						nextAction: wdw_addressbooksAdd.localPageAdvance},
					"remotePage": {"extra2Page": null, "acceptPage": "namesPage",
						onpageshow: wdw_addressbooksAdd.remotePageShow,
						nextAction: wdw_addressbooksAdd.remotePageAdvance},
					"searchPage": {"extra2Page": null, "acceptPage": "searchNamePage",
						onpageshow: wdw_addressbooksAdd.checkSearch,
						nextAction: wdw_addressbooksAdd.searchPageAdvance},
					"searchNamePage": {"extra2Page": null, "acceptPage": "finishPage",
						onpageshow: wdw_addressbooksAdd.loadSearchName,
						nextAction: wdw_addressbooksAdd.prepareSearchAddressbook},
					"findPage": {"extra2Page": null, "acceptPage": "namesPage",
						onpageshow: wdw_addressbooksAdd.loadFinds,
						nextAction: wdw_addressbooksAdd.findAdvance},
					"namesPage": {"extra2Page": null, "acceptPage": "finishPage",
						onpageshow: wdw_addressbooksAdd.loadNames,
						nextAction: wdw_addressbooksAdd.namesAdvance},
					"finishFirstPage": {"extra2Page": null, "acceptPage": "findPage",
						onpageshow: wdw_addressbooksAdd.finishFirstPageShow},
					"finishPage": {"extra2Page": null, "acceptPage": "null",
						onpageshow: wdw_addressbooksAdd.finishPageShow,
						nextAction: wdw_addressbooksAdd.closeWizard}};
	var pageHandlers = {"extra2": null, "accept": null};
};
