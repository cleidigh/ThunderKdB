if ("undefined" == typeof(wdw_addressbooksAdd)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
	var { ConversionHelper } = ChromeUtils.import("chrome://cardbook/content/api/ConversionHelper/ConversionHelper.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

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
		lTimerDiscoveryAll : {},
		
		initSearchDefinition: function () {
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId] && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].searchAB) {
				wdw_addressbooksAdd.gSearchDefinition['searchAB'] = cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].searchAB;
			} else {
				wdw_addressbooksAdd.gSearchDefinition['searchAB'] = true;
			}
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId] && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].matchAll) {
				wdw_addressbooksAdd.gSearchDefinition['matchAll'] = cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].matchAll;
			} else {
				wdw_addressbooksAdd.gSearchDefinition['matchAll'] = 'and';
			}
			if (window.arguments[0].dirPrefId && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId] && cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].rules) {
				wdw_addressbooksAdd.gSearchDefinition['rules'] = JSON.parse(JSON.stringify(cardbookRepository.cardbookComplexSearch[window.arguments[0].dirPrefId].rules));
			} else {
				wdw_addressbooksAdd.gSearchDefinition['rules'] = [["","","",""]];
			}
		},
		
		initWizardEvents: function () {
			document.addEventListener("wizardfinish", wdw_addressbooksAdd.closeWizard);
			document.addEventListener("wizardcancel", wdw_addressbooksAdd.cancelWizard);

			let welcomePage = document.getElementById("welcomePage");
			welcomePage.addEventListener("pageshow", wdw_addressbooksAdd.welcomePageShow);
			welcomePage.addEventListener("pageadvanced", wdw_addressbooksAdd.loadStandardAddressBooks);
			let initialPage = document.getElementById("initialPage");
			initialPage.addEventListener("pageshow", wdw_addressbooksAdd.initialPageShow);
			initialPage.addEventListener("pageadvanced", wdw_addressbooksAdd.initialPageAdvance);
			let localPage = document.getElementById("localPage");
			localPage.addEventListener("pageshow", wdw_addressbooksAdd.checkRequired);
			localPage.addEventListener("pageadvanced", wdw_addressbooksAdd.localPageAdvance);
			let remotePage = document.getElementById("remotePage");
			remotePage.addEventListener("pageshow", wdw_addressbooksAdd.remotePageShow);
			remotePage.addEventListener("pageadvanced", wdw_addressbooksAdd.remotePageAdvance);
			let searchPage = document.getElementById("searchPage");
			searchPage.addEventListener("pageshow", wdw_addressbooksAdd.checkSearch);
			searchPage.addEventListener("pageadvanced", wdw_addressbooksAdd.searchPageAdvance);
			let searchNamePage = document.getElementById("searchNamePage");
			searchNamePage.addEventListener("pageshow", wdw_addressbooksAdd.loadSearchName);
			searchNamePage.addEventListener("pageadvanced", wdw_addressbooksAdd.prepareSearchAddressbook);
			let findPage = document.getElementById("findPage");
			findPage.addEventListener("pageshow", wdw_addressbooksAdd.loadFinds);
			findPage.addEventListener("pageadvanced", wdw_addressbooksAdd.findAdvance);
			let namesPage = document.getElementById("namesPage");
			namesPage.addEventListener("pageshow", wdw_addressbooksAdd.loadNames);
			namesPage.addEventListener("pageadvanced", wdw_addressbooksAdd.namesAdvance);
			let finishFirstPage = document.getElementById("finishFirstPage");
			finishFirstPage.addEventListener("pageshow", wdw_addressbooksAdd.finishFirstPageShow);
			let finishPage = document.getElementById("finishPage");
			finishPage.addEventListener("pageshow", wdw_addressbooksAdd.finishPageShow);
		},
		
		loadWizard: function () {
			wdw_addressbooksAdd.initWizardEvents();

			if (window.arguments[0].action == "first") {
				if (!cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
					document.getElementById('addressbook-wizard').goTo("welcomePage");
				} else {
					document.getElementById('addressbook-wizard').goTo("findPage");
				}
			} else if (window.arguments[0].action == "search") {
				wdw_addressbooksAdd.initSearchDefinition();
				document.getElementById('addressbook-wizard').goTo("searchPage");
			} else if (window.arguments[0].action == "discovery") {
				wdw_addressbooksAdd.gAccountsFound = window.arguments[0].accountsToAdd;
				document.getElementById('addressbook-wizard').goTo("namesPage");
			} else {
				document.getElementById('addressbook-wizard').goTo("initialPage");
			}
		},

		loadStandardAddressBooks: function () {
			var contactManager = MailServices.ab;
			var contacts = contactManager.directories;
			while ( contacts.hasMoreElements() ) {
				var contact = contacts.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
				if (contact.dirPrefId == "ldap_2.servers.history") {
					wdw_addressbooksAdd.gAccountsFound.push(["STANDARD", "", "", contact.dirName, cardbookRepository.supportedVersion, "", contact.dirPrefId, true]);
				} else {
					wdw_addressbooksAdd.gAccountsFound.push(["STANDARD", "", "", contact.dirName, cardbookRepository.supportedVersion, "", contact.dirPrefId, false]);
				}
			}
		},

		checkRequired: function () {
			var canAdvance = true;
			var curPage = document.getElementById('addressbook-wizard').currentPage;
			if (curPage) {
				let eList = curPage.getElementsByAttribute('required', 'true');
				for (let i = 0; i < eList.length && canAdvance; ++i) {
					canAdvance = (eList[i].value != "");
				}
				document.getElementById('addressbook-wizard').canAdvance = canAdvance;
			}
		},

		checkFindLinesRequired: function () {
			var canAdvance = false;
			var i = 0;
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
			document.getElementById('addressbook-wizard').canAdvance = canAdvance;
		},

		checkNamesLinesRequired: function () {
			var canAdvance = true;
			var oneChecked = false;
			var i = 0;
			while (true) {
				if (document.getElementById('namesCheckbox' + i)) {
					var aCheckbox = document.getElementById('namesCheckbox' + i);
					var aAddressbookName = document.getElementById('namesTextbox' + i);
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
			document.getElementById('addressbook-wizard').canAdvance = (canAdvance && oneChecked);
		},

		welcomePageShow: function () {
			document.getElementById('addressbook-wizard').canAdvance = true;
		},

		initialPageShow: function () {
			wdw_addressbooksAdd.gAccountsFound = [];
			wdw_addressbooksAdd.checkRequired();
		},

		initialPageAdvance: function () {
			var type = document.getElementById('addressbookType').value;
			var page = document.getElementsByAttribute('pageid', 'initialPage')[0];
			if (type == 'local') {
				page.next = 'localPage';
			} else if (type == 'remote') {
				page.next = 'remotePage';
			} else if (type == 'standard') {
				wdw_addressbooksAdd.loadStandardAddressBooks();
				page.next = 'namesPage';
			} else if (type == 'find') {
				page.next = 'findPage';
			} else if (type == 'search') {
				wdw_addressbooksAdd.initSearchDefinition();
				page.next = 'searchPage';
			}
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
			var canValidate = true;
			var curPage = document.getElementById('addressbook-wizard').currentPage;
			if (curPage) {
				if (wdw_addressbooksAdd.gValidateURL) {
					document.getElementById('addressbook-wizard').canAdvance = wdw_addressbooksAdd.gValidateURL;
					document.getElementById('validateButton').disabled = !wdw_addressbooksAdd.gValidateURL;
				} else {
					document.getElementById('addressbook-wizard').canAdvance = wdw_addressbooksAdd.gValidateURL;
					let eList = curPage.getElementsByAttribute('required', 'true');
					for (let i = 0; i < eList.length && canValidate; ++i) {
						canValidate = (eList[i].value != "");
					}
					document.getElementById('validateButton').disabled = !canValidate;
				}
			}
		},

		remotePageSelect: function () {
			wdw_addressbooksAdd.gValidateURL = false;
			document.getElementById('remotePageURI').value = "";
			document.getElementById('remotePageUsername').value = "";
			document.getElementById('remotePagePassword').value = "";
			
			var type = document.getElementById('remotePageType').value;
			if (type == 'GOOGLE' || type == 'YAHOO') {
				document.getElementById('remotePageUriLabel').disabled=true;
				document.getElementById('remotePageURI').disabled=true;
				document.getElementById('remotePageURI').setAttribute('required', 'false');
				document.getElementById('remotePagePasswordLabel').disabled=true;
				document.getElementById('remotePagePassword').disabled=true;
				document.getElementById('remotePagePassword').setAttribute('required', 'false');
				document.getElementById('remotePagePasswordCheckbox').disabled=true;
				document.getElementById('rememberPasswordCheckbox').disabled=true;
			} else if (type == 'APPLE') {
				document.getElementById('remotePageUriLabel').disabled=true;
				document.getElementById('remotePageURI').disabled=true;
				document.getElementById('remotePageURI').setAttribute('required', 'false');
				document.getElementById('remotePagePasswordLabel').disabled=false;
				document.getElementById('remotePagePassword').disabled=false;
				document.getElementById('remotePagePassword').setAttribute('required', 'true');
				document.getElementById('remotePagePasswordCheckbox').disabled=false;
				document.getElementById('rememberPasswordCheckbox').disabled=false;
			} else {
				document.getElementById('remotePageUriLabel').disabled=false;
				document.getElementById('remotePageURI').disabled=false;
				document.getElementById('remotePageURI').setAttribute('required', 'true');
				document.getElementById('remotePagePasswordLabel').disabled=false;
				document.getElementById('remotePagePassword').disabled=false;
				document.getElementById('remotePagePassword').setAttribute('required', 'true');
				document.getElementById('remotePagePasswordCheckbox').disabled=false;
				document.getElementById('rememberPasswordCheckbox').disabled=false;
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
			var pwdMgrBundle = Services.strings.createBundle("chrome://passwordmgr/locale/passwordmgr.properties");
			document.getElementById('rememberPasswordCheckbox').setAttribute('label', pwdMgrBundle.GetStringFromName("rememberPassword"));
			wdw_addressbooksAdd.checklocationNetwork();
		},

		remotePageAdvance: function () {
			let myType = document.getElementById('remotePageType').value;
			// APPLE or CARDDAV have already been added to gAccountsFound
			if (myType == "GOOGLE" || myType == "YAHOO") {
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
			document.getElementById('addressbook-wizard').canAdvance = false;
			function checkTerms() {
				if (cardbookComplexSearch.getSearch() != "") {
					document.getElementById('addressbook-wizard').canAdvance = true;
				} else {
					document.getElementById('addressbook-wizard').canAdvance = false;
				}
			};
			checkTerms();
			document.getElementById('searchTerms').addEventListener("input", checkTerms, false);
			document.getElementById('searchTerms').addEventListener("command", checkTerms, false);
			document.getElementById('searchTerms').addEventListener("click", checkTerms, false);
		},

		searchPageAdvance: function () {
			let mySearch = cardbookComplexSearch.getSearch();

			var relative = mySearch.match("^searchAB:([^:]*):searchAll:([^:]*)(.*)");
			wdw_addressbooksAdd.gSearchDefinition.searchAB = relative[1];
			if (relative[2] == "true") {
				wdw_addressbooksAdd.gSearchDefinition.matchAll = true;
			} else {
				wdw_addressbooksAdd.gSearchDefinition.matchAll = false;
			}
			var tmpRuleArray = relative[3].split(/:case:/);
			wdw_addressbooksAdd.gSearchDefinition.rules = [];
			for (let tmpRule of tmpRuleArray) {
				var relative = tmpRule.match("([^:]*):field:([^:]*):term:([^:]*):value:([^:]*)");
				wdw_addressbooksAdd.gSearchDefinition.rules.push([relative[1], relative[2], relative[3], relative[4]]);
			}
		},

		showPassword: function (aCheckBox) {
			var myPasswordTextbox = document.getElementById(aCheckBox.id.replace(/Checkbox$/, ''));
			if (myPasswordTextbox.type != "password") {
				myPasswordTextbox.setAttribute('type', 'password');
			} else {
				myPasswordTextbox.removeAttribute('type');
			}
		},

		validateURL: function () {
			document.getElementById('addressbook-wizard').canAdvance = false;
			document.getElementById('remotePageURI').value = cardbookRepository.cardbookUtils.decodeURL(document.getElementById('remotePageURI').value.trim());
			document.getElementById('validateButton').disabled = true;

			var type = document.getElementById('remotePageType').value;
			var username = document.getElementById('remotePageUsername').value;
			var password = document.getElementById('remotePagePassword').value;
			if (type == 'GOOGLE') {
				var url = cardbookRepository.cardbookOAuthData.GOOGLE.ROOT_API;
			} else if (type == 'YAHOO') {
				var url = cardbookRepository.cardbookOAuthData.YAHOO.ROOT_API;
			} else if (type == 'APPLE') {
				var url = cardbookRepository.APPLE_API;
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getSlashedUrl(url), true]); // [url, discovery]
			} else {
				var url = document.getElementById('remotePageURI').value;
				if (cardbookRepository.cardbookSynchronization.getRootUrl(url) == "") {
					cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidatingURLFailedLabel");
					return;
				}
				wdw_addressbooksAdd.gCardDAVURLs.push([url, false]); // [url, discovery]
				wdw_addressbooksAdd.gCardDAVURLs.push([cardbookRepository.cardbookSynchronization.getWellKnownUrl(url), true]);
				var carddavURL = cardbookRepository.cardbookSynchronization.getCardDAVUrl(url, username);
				if (carddavURL != "") {
					wdw_addressbooksAdd.gCardDAVURLs.push([carddavURL, false]);
				}
			}
			
			var dirPrefId = cardbookRepository.cardbookUtils.getUUID();
			if (type == 'GOOGLE') {
				cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "Validating1Label", [url], "PRIORITY_INFO_MEDIUM");
				cardbookRepository.cardbookSynchronization.initMultipleOperations(dirPrefId);
				cardbookRepository.cardbookServerSyncRequest[dirPrefId]++;
				var connection = {connUser: username, connPrefId: dirPrefId, connDescription: wdw_addressbooksAdd.gValidateDescription};
				cardbookRepository.cardbookSynchronizationGoogle.requestNewRefreshTokenForGoogle(connection, null, type, null);
				wdw_addressbooksAdd.waitForRefreshTokenFinished(dirPrefId, url);
			} else if (type == 'YAHOO') {
				cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "Validating1Label", [url], "PRIORITY_INFO_MEDIUM");
				cardbookRepository.cardbookSynchronization.initMultipleOperations(dirPrefId);
				cardbookRepository.cardbookServerSyncRequest[dirPrefId]++;
				var connection = {connUser: username, connPrefId: dirPrefId, connDescription: wdw_addressbooksAdd.gValidateDescription};
				cardbookRepository.cardbookSynchronizationYahoo.requestNewRefreshTokenForYahoo(connection, null, type, null);
				wdw_addressbooksAdd.waitForRefreshTokenFinished(dirPrefId, url);
			} else {
				cardbookRepository.cardbookSynchronization.initDiscoveryOperations(dirPrefId);
				wdw_addressbooksAdd.validateCardDAVURL(dirPrefId, username, password, type);
			}
		},

		validateCardDAVURL: function (aDirPrefId, aUsername, aPassword, aType) {
			cardbookRepository.cardbookPreferences.setId(aDirPrefId, aDirPrefId);
			cardbookRepository.cardbookPreferences.setUrl(aDirPrefId, wdw_addressbooksAdd.gCardDAVURLs[0][0]);
			wdw_addressbooksAdd.gRunningDirPrefId.push(aDirPrefId);
			cardbookRepository.cardbookRepository.cardbookPasswordManager.rememberPassword(aUsername, wdw_addressbooksAdd.gCardDAVURLs[0][0], aPassword, document.getElementById("rememberPasswordCheckbox").checked);
			
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

			if (myType == 'GOOGLE') {
				cardbookRepository.cardbookSynchronization.initMultipleOperations(dirPrefId);
				cardbookRepository.cardbookServerSyncRequest[dirPrefId]++;
				var connection = {connUser: myUsername, connPrefId: dirPrefId, connDescription: wdw_addressbooksAdd.gValidateDescription};
				cardbookRepository.cardbookSynchronizationGoogle.requestNewRefreshTokenForGoogle(connection, null, myType, null);
				wdw_addressbooksAdd.waitForFindRefreshTokenFinished(aRowId, dirPrefId, myURL);
			} else if (myType == 'YAHOO') {
				cardbookRepository.cardbookSynchronization.initMultipleOperations(dirPrefId);
				cardbookRepository.cardbookServerSyncRequest[dirPrefId]++;
				var connection = {connUser: myUsername, connPrefId: dirPrefId, connDescription: wdw_addressbooksAdd.gValidateDescription};
				cardbookRepository.cardbookSynchronizationYahoo.requestNewRefreshTokenForYahoo(connection, null, myType, null);
				wdw_addressbooksAdd.waitForFindRefreshTokenFinished(aRowId, dirPrefId, myURL);
			} else {
				var myPassword = document.getElementById('findPasswordTextbox' + aRowId).value;
				cardbookRepository.cardbookSynchronization.initDiscoveryOperations(dirPrefId);
				cardbookRepository.cardbookPreferences.setId(dirPrefId, dirPrefId);
				cardbookRepository.cardbookPreferences.setUrl(dirPrefId, myURL);
				wdw_addressbooksAdd.gRunningDirPrefId.push(dirPrefId);
				cardbookRepository.cardbookRepository.cardbookPasswordManager.rememberPassword(myUsername, myURL, myPassword, document.getElementById("rememberPasswordCheckbox").checked);
				
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
							myButton.setAttribute('label', ConversionHelper.i18n.getMessage("ValidationFailedLabel"));
							wdw_addressbooksAdd.checkFindLinesRequired();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
							lTimerDiscovery.cancel();
						} else if (cardbookRepository.cardbookServerDiscoveryRequest[aDirPrefId] !== cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] || cardbookRepository.cardbookServerDiscoveryResponse[aDirPrefId] === 0) {
							myButton.setAttribute('label', ConversionHelper.i18n.getMessage("Validating2Label"));
						} else {
							myButton.setAttribute('validated', 'true');
							myButton.setAttribute('label', ConversionHelper.i18n.getMessage("ValidationOKLabel"));
							wdw_addressbooksAdd.checkFindLinesRequired();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aDirPrefId);
							lTimerDiscovery.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		waitForRefreshTokenFinished: function (aPrefId, aUrl) {
			wdw_addressbooksAdd.lTimerRefreshTokenAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerRefreshToken = wdw_addressbooksAdd.lTimerRefreshTokenAll[aPrefId];
			lTimerRefreshToken.initWithCallback({ notify: function(lTimerRefreshToken) {
						if (cardbookRepository.cardbookRefreshTokenError[aPrefId] >= 1) {
							cardbookNotifications.setNotification(ABAddNotification.resultNotifications, "ValidationFailedLabel");
							wdw_addressbooksAdd.gValidateURL = false;
							wdw_addressbooksAdd.checklocationNetwork();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aPrefId);
							lTimerRefreshToken.cancel();
						} else if (cardbookRepository.cardbookRefreshTokenResponse[aPrefId] !== 1) {
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

		waitForFindRefreshTokenFinished: function (aRowId, aPrefId, aUrl) {
			wdw_addressbooksAdd.lTimerRefreshTokenAll[aPrefId] = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			var lTimerRefreshToken = wdw_addressbooksAdd.lTimerRefreshTokenAll[aPrefId];
			lTimerRefreshToken.initWithCallback({ notify: function(lTimerRefreshToken) {
						var myButton = document.getElementById('findPageValidateButton' + aRowId);
						if (cardbookRepository.cardbookRefreshTokenError[aPrefId] >= 1) {
							myButton.setAttribute('validated', 'false');
							myButton.setAttribute('label', ConversionHelper.i18n.getMessage("ValidationFailedLabel"));
							wdw_addressbooksAdd.checkFindLinesRequired();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aPrefId);
							lTimerRefreshToken.cancel();
						} else if (cardbookRepository.cardbookRefreshTokenResponse[aPrefId] !== 1) {
							myButton.setAttribute('label', ConversionHelper.i18n.getMessage("Validating2Label"));
						} else {
							myButton.setAttribute('validated', 'true');
							myButton.setAttribute('label', ConversionHelper.i18n.getMessage("ValidationOKLabel"));
							wdw_addressbooksAdd.checkFindLinesRequired();
							cardbookRepository.cardbookSynchronization.finishMultipleOperations(aPrefId);
							lTimerRefreshToken.cancel();
						}
					}
					}, 1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
		},

		onSuccessfulAuthentication: function (aResponse) {
			var username = document.getElementById('remotePageUsername').value;
			cardbookRepository.cardbookRepository.cardbookPasswordManager.rememberPassword(username, "", aResponse.refresh_token, document.getElementById("rememberPasswordCheckbox").checked);
			var wizard = document.getElementById("addressbook-wizard");
			wizard.canAdvance = true;
			wizard.advance();
		},

		loadSearchName: function () {
			if (window.arguments[0].dirPrefId) {
				document.getElementById('searchNamePageName').value = cardbookRepository.cardbookPreferences.getName(window.arguments[0].dirPrefId);
			}
			wdw_addressbooksAdd.checkRequired();
		},

		deleteBoxes: function (aRowName, aHeaderRowName) {
			var aListRows = document.getElementById(aRowName);
			var childNodes = aListRows.childNodes;
			var toDelete = [];
			for (var i = 0; i < childNodes.length; i++) {
				var child = childNodes[i];
				if (child.getAttribute('id') != aHeaderRowName) {
					toDelete.push(child);
				}
			}
			for (var i = 0; i < toDelete.length; i++) {
				var oldChild = aListRows.removeChild(toDelete[i]);
			}
		},

		createBoxesForNames: function (aType, aURL, aName, aVersionList, aUsername, aActionType, aSourceDirPrefId, aSourceCollected) {
			var aListRows = document.getElementById('namesRows');
			var aId = aListRows.childNodes.length - 1;
			var aRow = document.createXULElement('row');
			aListRows.appendChild(aRow);
			aRow.setAttribute('id', 'namesRow' + aId);
			aRow.setAttribute('flex', '1');

			var aCheckbox = document.createXULElement('checkbox');
			aRow.appendChild(aCheckbox);
			aCheckbox.setAttribute('checked', true);
			aCheckbox.setAttribute('id', 'namesCheckbox' + aId);
			aCheckbox.setAttribute('validationType', aType);
			aCheckbox.setAttribute('username', aUsername);
			aCheckbox.setAttribute('actionType', aActionType);
			aCheckbox.setAttribute('sourceDirPrefId', aSourceDirPrefId);
			aCheckbox.setAttribute('sourceCollected', aSourceCollected.toString());
			aCheckbox.setAttribute("aria-labelledby", "namesPageSelectedLabel");
			aCheckbox.addEventListener("command", function() {
					var aTextBox = document.getElementById('namesTextbox' + this.id.replace("namesCheckbox",""));
					if (this.checked) {
						aTextBox.setAttribute('required', true);
					} else {
						aTextBox.setAttribute('required', false);
					}
					wdw_addressbooksAdd.checkNamesLinesRequired();
				}, false);

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'namesTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "namesPageNameLabel");
			aTextbox.setAttribute('required', true);
			aTextbox.value = aName;
			aTextbox.addEventListener("input", function() {
					wdw_addressbooksAdd.checkNamesLinesRequired();
				}, false);

			var aColorbox =  document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aColorbox);
			aColorbox.setAttribute('id', 'serverColorInput' + aId);
			aColorbox.setAttribute("aria-labelledby", "namesPageColorLabel");
			aColorbox.setAttribute('palettename', "standard");
			aColorbox.setAttribute('type', "color");
			aColorbox.value = cardbookRepository.cardbookUtils.randomColor(100);
			
			var aMenuList = document.createXULElement('menulist');
			aRow.appendChild(aMenuList);
			aMenuList.setAttribute('id', 'vCardVersionPageName' + aId);
			aMenuList.setAttribute("aria-labelledby", "namesPageVCardVersionLabel");
			var aMenuPopup = document.createXULElement('menupopup');
			aMenuList.appendChild(aMenuPopup);
			aMenuPopup.setAttribute('id', 'vCardVersionPageNameMenupopup' + aId);
			cardbookElementTools.loadVCardVersions(aMenuPopup.id, aMenuList.id, aVersionList);

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'URLTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "namesPageURLLabel");
			aTextbox.setAttribute('hidden', 'true');
			aTextbox.value = aURL;

			var aCheckbox1 = document.createXULElement('checkbox');
			aRow.appendChild(aCheckbox1);
			aCheckbox1.setAttribute('checked', true);
			aCheckbox1.setAttribute('id', 'DBCachedCheckbox' + aId);
			aCheckbox1.setAttribute("aria-labelledby", "namesPageDBCachedLabel");
			if (aType == "CARDDAV") {
				aCheckbox1.setAttribute('disabled', false);
			} else {
				aCheckbox1.setAttribute('disabled', true);
			}
			var aCheckbox2 = document.createXULElement('checkbox');
			aRow.appendChild(aCheckbox2);                                              
			aCheckbox2.setAttribute('checked', false);
			aCheckbox2.setAttribute('id', 'urnuuidCheckbox' + aId);
			aCheckbox2.setAttribute("aria-labelledby", "namesPageUrnuuidLabel");
		},

		loadNames: function () {
			wdw_addressbooksAdd.deleteBoxes('namesRows', 'namesHeadersRow');
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
			var page = document.getElementsByAttribute('pageid', 'namesPage')[0];
			wdw_addressbooksAdd.prepareAddressbook();
			if (window.arguments[0].action == "first" && !wdw_addressbooksAdd.gFirstFirstStepDone) {
				page.next = 'finishFirstPage';
			} else {
				page.next = 'finishPage';
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
			var aListRows = document.getElementById('findRows');
			var aId = aListRows.childNodes.length - 1;
			var aRow = document.createXULElement('row');
			aListRows.appendChild(aRow);
			aRow.setAttribute('id', 'findRows' + aId);
			aRow.setAttribute('flex', '1');
			
			var aButton = document.createXULElement('button');
			aRow.appendChild(aButton);
			aButton.setAttribute('id', 'findPageValidateButton' + aId);
			aButton.setAttribute("aria-labelledby", "findPageValidateLabel");
			aButton.setAttribute('flex', '1');
			aButton.setAttribute('validationType', aType);
			aButton.setAttribute('validated', 'false');
			aButton.setAttribute('label', ConversionHelper.i18n.getMessage("noValidatedEntryTooltip"));
			aButton.addEventListener("command", function() {
					var myId = this.id.replace("findPageValidateButton","");
					wdw_addressbooksAdd.validateFindLine(myId);
				}, false);

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'findUsernameTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "findPageUserLabel");
			aTextbox.setAttribute('required', true);
			aTextbox.setAttribute('disabled', true);
			aTextbox.value = aUsername;

			if (aPassword != null) {
				var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
				aRow.appendChild(aTextbox);
				aTextbox.setAttribute('id', 'findPasswordTextbox' + aId);
				aTextbox.setAttribute("aria-labelledby", "findPagePasswordLabel");
				aTextbox.setAttribute('type', 'password');
				aTextbox.setAttribute('required', true);
				aTextbox.value = aPassword;

				var aCheckbox = document.createXULElement('checkbox');
				aRow.appendChild(aCheckbox);
				aCheckbox.setAttribute('id', 'findPasswordTextbox' + aId + 'Checkbox');
				aCheckbox.setAttribute("aria-labelledby", "findPagePasswordShowLabel");
				aCheckbox.addEventListener("command", function() {
						wdw_addressbooksAdd.showPassword(this);
					}, false);
			} else {
				var aHbox = document.createXULElement('hbox');
				aRow.appendChild(aHbox);
				aHbox.setAttribute('align', 'center');
				aHbox.setAttribute('flex', '1');
			}

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'findPageVCardVersionsTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "findPageVCardVersionsLabel");
			aTextbox.setAttribute('hidden', 'true');
			aTextbox.value = aVCardVersion;

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'findPageURLTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "findPageURLLabel");
			aTextbox.setAttribute('hidden', 'true');
			aTextbox.value = aUrl;

			var aTextbox = document.createElementNS("http://www.w3.org/1999/xhtml","html:input");
			aRow.appendChild(aTextbox);
			aTextbox.setAttribute('id', 'findPageABNameTextbox' + aId);
			aTextbox.setAttribute("aria-labelledby", "findPageABNameLabel");
			aTextbox.setAttribute('hidden', 'true');
			aTextbox.value = aABName;

			var found = false;
			for (var i = 0; i < aListRows.childNodes.length; i++) {
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
			wdw_addressbooksAdd.deleteBoxes('findRows', 'findHeadersRow');
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
					if (email.endsWith(cardbookRepository.cardbookOAuthData[j].EMAIL_TYPE)) {
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
			if (document.getElementById('findRows').childNodes.length == 1) {
				document.getElementById('findHeadersRow').setAttribute('hidden', 'true');
				document.getElementById('findPageName1Description').removeAttribute('hidden');
				document.getElementById('findPageName2Description').setAttribute('hidden', 'true');
				document.getElementById('findPageName3Description').setAttribute('hidden', 'true');
			} else if (document.getElementById('findRows').childNodes.length == 2) {
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
			var myName = ConversionHelper.i18n.getMessage("allContacts");
			wdw_addressbooksAdd.gFinishParams.push({type: "SEARCH", searchDef:"searchAB:allAddressBooks:searchAll:true:case:dig:field:version:term:IsntEmpty:value:",
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
			wdw_addressbooksAdd.gFinishParams.push({type: "SEARCH", searchDef: cardbookComplexSearch.getSearch(), name: name, username: "", color: "", vcard: "", enabled: enabled,
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
						var aAddressbookUrnuuid = document.getElementById('urnuuidCheckbox' + i).checked;
						var aAddressbookUsername = aCheckbox.getAttribute('username');
						var aAddressbookValidationType = aCheckbox.getAttribute('validationType');
						var aAddressbookActionType = aCheckbox.getAttribute('actionType');
						var aAddressbookSourceDirPrefId = aCheckbox.getAttribute('sourceDirPrefId');
						var aAddressbookSourceCollected = (aCheckbox.getAttribute('sourceCollected') == 'true');
						if (cardbookRepository.cardbookUtils.isMyAccountRemote(myType)) {
							// the discover should be redone at every sync
							if (myType == 'APPLE') {
								aAddressbookURL = cardbookRepository.APPLE_API;
							}
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, url: aAddressbookURL, name: aAddressbookName, username: aAddressbookUsername, color: aAddressbookColor,
																	vcard: aAddressbookVCard, readonly: false, dirPrefId: aAddressbookId,
																	urnuuid: aAddressbookUrnuuid, DBcached: aAddressbookDBCached, firstAction: false});
						} else if (myType == "LOCALDB") {
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, name: aAddressbookName, username: "", color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false, dirPrefId: aAddressbookId,
																		urnuuid: aAddressbookUrnuuid, DBcached: true, firstAction: false});
						} else if (myType == "FILE" || myType == "DIRECTORY") {
							wdw_addressbooksAdd.gFinishParams.push({type: aAddressbookValidationType, actionType: aAddressbookActionType, file: wdw_addressbooksAdd.gFile, name: aAddressbookName, username: "",
																	color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false, dirPrefId: aAddressbookId, urnuuid: aAddressbookUrnuuid, DBcached: false, firstAction: false});
						} else if (myType == "STANDARD") {
							if (window.arguments[0].action == "first") {
								var aFirstAction = true;
							} else {
								var aFirstAction = false;
							}
							wdw_addressbooksAdd.gFinishParams.push({type: "STANDARD", sourceDirPrefId: aAddressbookSourceDirPrefId,
																name: aAddressbookName, username: "", color: aAddressbookColor, vcard: aAddressbookVCard, readonly: false,
																dirPrefId: aAddressbookId, collected: aAddressbookSourceCollected,
																urnuuid: aAddressbookUrnuuid, DBcached: true, firstAction: aFirstAction});
						}
					}
					i++;
				} else {
					break;
				}
			}
		},

		setCanRewindFalse: function () {
			document.getElementById('addressbook-wizard').canRewind = false;
		},

		createAddressbook: function () {
			for (var i = 0; i < wdw_addressbooksAdd.gFinishParams.length; i++) {
				var myAccount = wdw_addressbooksAdd.gFinishParams[i];
				if (window.arguments[0].action == "search" && window.arguments[0].dirPrefId) {
					wdw_cardbook.modifySearchAddressbook(myAccount.dirPrefId, myAccount.name, myAccount.color, myAccount.vcard, myAccount.readonly,
													myAccount.urnuuid, myAccount.searchDef);
				} else {
					if (myAccount.type === "SEARCH") {
						var myFile = cardbookRepository.getRuleFile(myAccount.dirPrefId);
						if (myFile.exists()) {
							myFile.remove(true);
						}
						myFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
						cardbookRepository.cardbookUtils.writeContentToFile(myFile.path, myAccount.searchDef, "UTF8");
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myFile.path, myAccount.username, myAccount.color,
																	myAccount.enabled, true, myAccount.vcard, false, myAccount.urnuuid,
																	myAccount.DBcached, false, "0", true);
						cardbookRepository.cardbookSynchronization.loadComplexSearchAccount(myAccount.dirPrefId, true, "WINDOW");
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
																	true, true, myAccount.vcard, myAccount.readonly, myAccount.urnuuid,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myAccount.dirPrefId);
						cardbookRepository.cardbookDirRequest[myAccount.dirPrefId]++;
						var myMode = "WINDOW";
						wdw_migrate.importCards(myAccount.sourceDirPrefId, myAccount.dirPrefId, myAccount.name, myAccount.vcard, myMode);
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, myMode, false, true);
						// if the first proposed import of standard address books is finished OK
						// then set CardBook as exclusive
						if (myAccount.firstAction) {
							cardbookRepository.cardbookPreferences.setBoolPref("extensions.cardbook.exclusive", true);
						}
					} else if (myAccount.type === "LOCALDB") {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, "", myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, myAccount.urnuuid,
																	myAccount.DBcached, true, "60", true);
					} else if (myAccount.type === "FILE") {
						cardbookRepository.addAccountToRepository(myAccount.dirPrefId, myAccount.name, myAccount.type, myAccount.file.path, myAccount.username, myAccount.color,
																	true, true, myAccount.vcard, myAccount.readonly, myAccount.urnuuid,
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
						var myMode = "WINDOW";
						cardbookRepository.cardbookSynchronization.loadFile(myFile, myAccount.dirPrefId, myAccount.dirPrefId, myMode, "NOIMPORTFILE", "");
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, myMode, false, true);
					} else if (myAccount.type === "DIRECTORY") {
						var myDir = myAccount.file;
						if (myAccount.actionType === "CREATEDIRECTORY") {
							if (myDir.exists()) {
								var aListOfFileName = [];
								aListOfFileName = cardbookRepository.cardbookSynchronization.getFilesFromDir(myDir.path);
								if (aListOfFileName.length > 0) {
									var confirmTitle = ConversionHelper.i18n.getMessage("confirmTitle");
									var confirmMsg = ConversionHelper.i18n.getMessage("directoryDeletionConfirmMessage", [myDir.leafName]);
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
																	true, true, myAccount.vcard, myAccount.readonly, myAccount.urnuuid,
																	myAccount.DBcached, true, "60", true);
						cardbookRepository.cardbookSynchronization.initMultipleOperations(myAccount.dirPrefId);
						cardbookRepository.cardbookDirRequest[myAccount.dirPrefId]++;
						var myMode = "WINDOW";
						cardbookRepository.cardbookSynchronization.loadDir(myDir, myAccount.dirPrefId, myAccount.dirPrefId, myMode, "NOIMPORTDIR", "");
						cardbookRepository.cardbookSynchronization.waitForLoadFinished(myAccount.dirPrefId, myAccount.name, myMode, false, true);
					}
					cardbookRepository.cardbookUtils.formatStringForOutput("addressbookCreated", [myAccount.name]);
					cardbookActions.addActivity("addressbookCreated", [myAccount.name], "addItem");
					cardbookRepository.cardbookUtils.notifyObservers("addressbookCreated", myAccount.dirPrefId);
				}
			}
		},

		cancelWizard: function () {
			for (var dirPrefId of wdw_addressbooksAdd.gRunningDirPrefId) {
				cardbookRepository.cardbookPreferences.delBranch(dirPrefId);
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
			document.getElementById('addressbook-wizard').canAdvance = false;
		},

		closeWizard: function () {
			wdw_addressbooksAdd.cancelWizard();
			wdw_addressbooksAdd.createAddressbook();
		}

	};

};

// translations
window.addEventListener("DOMContentLoaded", function(e) {
	cardbookLocales.updateDocument();
}, false);
