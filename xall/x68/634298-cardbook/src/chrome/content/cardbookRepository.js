var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { AppConstants } = ChromeUtils.import("resource://gre/modules/AppConstants.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

var EXPORTED_SYMBOLS = ["cardbookRepository"];
var cardbookRepository = {
	cardbookDatabase : {},
	cardbookDatabaseVersion : "6",
	cardbookDatabaseName : "CardBook",
	cardbookActionsDatabase : {},
	cardbookActionsDatabaseVersion : "4",
	cardbookActionsDatabaseName : "CardBookUndo",

	extension : ExtensionParent.GlobalManager.getExtension("cardbook@vigneau.philippe"),
	
	windowParams : "chrome,titlebar,resizable,all,dialog=no",
	modalWindowParams : "modal,chrome,titlebar,resizable,minimizable=no",
	// Workaround for Bug 1151440 - the HTML color picker won't work
	// in linux when opened from modal dialog
	colorPickableDialogParams : (AppConstants.platform == 'Linux') ? "chrome,resizable,centerscreen" : "modal,chrome,resizable,centerscreen",
	colorPickableModalDialogParams : (AppConstants.platform == 'Linux') ? "chrome,titlebar,resizable,minimizable=no" : "modal,chrome,titlebar,resizable,minimizable=no",
	countriesList : ["ad","ae","af","ag","ai","al","am","ao","aq","ar","as","at","au","aw","az","ba","bb","bd","be","bf","bg",
						"bh","bi","bj","bl","bm","bn","bo","bq","br","bs","bt","bv","bw","by","bz","ca","cc","cd","cf","cg","ch",
						"ci","ck","cl","cm","cn","co","cp","cr","cu","cv","cw","cx","cy","cz","de","dg","dj","dk","dm","do","dz",
						"ec","ee","eg","eh","er","es","et","fi","fj","fk","fm","fo","fr","ga","gb","gd","ge","gf","gg","gh","gi",
						"gl","gm","gn","gp","gq","gr","gs","gt","gu","gw","gy","hk","hm","hn","hr","ht","hu","id","ie","il","im",
						"in","io","iq","ir","is","it","je","jm","jo","jp","ke","kg","kh","ki","km","kn","kp","kr","kw","ky","kz",
						"la","lb","lc","li","lk","lr","ls","lt","lu","lv","ly","ma","mc","md","me","mf","mg","mh","mk","ml","mm",
						"mn","mo","mp","mq","mr","ms","mt","mu","mv","mw","mx","my","mz","na","nc","ne","nf","ng","ni","nl","no",
						"np","nr","nu","nz","om","pa","pe","pf","pg","ph","pk","pl","pm","pn","pr","pt","pw","py","qa","qm","qs",
						"qu","qw","qx","qz","re","ro","rs","ru","rw","sa","sb","sc","sd","se","sg","sh","si","sk","sl","sm","sn",
						"so","sr","ss","st","sv","sx","sy","sz","tc","td","tf","tg","th","tj","tk","tl","tm","tn","to","tr","tt",
						"tv","tw","tz","ua","ug","us","uy","uz","va","vc","ve","vg","vi","vn","vu","wf","ws","xa","xb","xc","xd",
						"xe","xg","xh","xj","xk","xl","xm","xp","xq","xr","xs","xt","xu","xv","xw","ye","yt","za","zm","zw"],
	defaultCardImage : "chrome://cardbook/content/skin/contact-generic.svg",
	
	allColumns : { "display": ["fn"],
					"personal": ["prefixname", "firstname", "othername", "lastname", "suffixname", "nickname", "gender", "bday",
									"birthplace", "anniversary", "deathdate", "deathplace"],
					"org": ["org", "title", "role"],
					"categories": ["categories"],
					"arrayColumns": [ ["email", ["email"] ],
						["adr", ["postOffice", "extendedAddr", "street", "locality", "region", "postalCode", "country"] ],
						["impp", ["impp"] ],
						["tel", ["tel"] ],
						["url", ["url"] ] ],
					"note": ["note"],
					"calculated": ["age", "ABName"],
					"technical": ["version", "rev", "uid"],
					"technicalForTree": ["cardIcon", "name", "dirPrefId", "cbid", "class1", "etag", "geo", "mailer",
											"prodid", "tz", "sortstring", "kind"] },

	newFields : [ 'gender', 'birthplace', 'anniversary', 'deathdate', 'deathplace' ],
	dateFields : [ 'bday', 'anniversary', 'deathdate' ],
	multilineFields : [ 'email', 'tel', 'adr', 'impp', 'url' ],
	possibleNodes : [ 'categories', 'org' ],
	prefCSVPrefix : "*:",

	openedNodes : [],
	defaultDisplayedColumns : "cardIcon,fn,email.0.all,tel.0.all,bday,rev",
	defaultSortDirection : "fn",
	defaultSortResource : "ascending",
	defaultAutocompleteRestrictSearchFields : "firstname|lastname",
	defaultFnFormula : "({{1}} |)({{2}} |)({{3}} |)({{4}} |)({{5}} |)({{6}} |)({{7}}|)",
	defaultAdrFormula : "",
	defaultKindCustom : "X-ADDRESSBOOKSERVER-KIND",
	defaultMemberCustom : "X-ADDRESSBOOKSERVER-MEMBER",

	notAllowedCustoms : [ 'X-THUNDERBIRD-ETAG', 'X-ABDATE', 'X-ABLABEL', 'X-CATEGORIES' ],
	possibleCustomFields : { "X-CUSTOM1": {add: false}, "X-CUSTOM2": {add: false}, "X-CUSTOM3": {add: false}, "X-CUSTOM4": {add: false},
							"X-PHONETIC-FIRST-NAME": {add: false}, "X-PHONETIC-LAST-NAME": {add: false}, "X-BIRTHPLACE": {add: false},
							"X-ANNIVERSARY": {add: false}, "X-DEATHDATE": {add: false}, "X-DEATHPLACE": {add: false}, "X-GENDER": {add: false} },
					
	cardbookGenderLookup : { "F": "", "M": "", "N": "", "O": "", "U": "" },
	cardbookCoreTypes : { "GOOGLE": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
										"email" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
										"tel" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["celltype", "CELL"], ["faxtype", "FAX"], ["pagertype", "PAGER"], ["workfaxtype", "FAX,WORK"], ["homefaxtype", "FAX,HOME"] ],
										"url" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["blogtype", "BLOG", "PG"], ["homepagetype", "HOMEPAGE", "PG"], ["profiletype", "PROFILE", "PG"] ],
										"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
										"addnew" : true },
						"APPLE": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"email" : [ ["hometype", "HOME;HOME,INTERNET"], ["worktype", "WORK;WORK,INTERNET"], ["othertype", "OTHER;OTHER,INTERNET"] ],
									"tel" : [ ["hometype", "HOME;HOME,VOICE"], ["worktype", "WORK;WORK,VOICE"], ["celltype", "CELL;CELL,VOICE"], ["faxtype", "FAX;FAX,VOICE"], ["pagertype", "PAGER"],
												["workfaxtype", "FAX,WORK;FAX,WORK,VOICE"], ["homefaxtype", "FAX,HOME;FAX,HOME,VOICE"],
												["othertype", "OTHER;OTHER,VOICE"], ["maintype", "MAIN"], ["iphonetype", "CELL,IPHONE;CELL,IPHONE,VOICE"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : true },
						"YAHOO": { "adr" : [ ["hometype", "HOME;HOME,POSTAL,PARCEL,WORK"], ["worktype", "WORK;WORK,POSTAL,PARCEL"] ],
									"email" : [ ["hometype", "HOME;HOME,INTERNET"], ["worktype", "WORK;WORK,INTERNET"] ],
									"tel" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["faxtype", "FAX"], ["pagertype", "PAGER"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : false },
						"CARDDAV": { "adr" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"email" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"tel" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["celltype", "CELL;CELL,IPHONE"], ["faxtype", "FAX"], ["pagertype", "PAGER"], ["workfaxtype", "FAX,WORK"], ["homefaxtype", "FAX,HOME"],
												["othertype", "OTHER"], ["maintype", "MAIN"] ],
									"url" : [ ["hometype", "HOME"], ["worktype", "WORK"], ["othertype", "OTHER"] ],
									"impp" : [ ["hometype", "HOME"], ["worktype", "WORK"] ],
									"addnew" : true } },

	supportedVersion : ["3.0", "4.0"],

	logins: {},

	preferEmailPref : true,
	preferIMPPPref : true,
	
	addonVersion : "",
	userAgent : "",
	prodid : "",
	
	useColor : "",
	
	autocompleteRestrictSearch : false,
	autocompleteRestrictSearchFields : [],

	cardbookAccounts : [],
	cardbookAccountsCategories : {},
	cardbookAccountsNodes : {},
	cardbookNodeColors : {},
	cardbookCards : {},
	cardbookDisplayCards : {},
	cardbookCardLongSearch : {},
	cardbookCardShortSearch : {},
	cardbookCardEmails : {},
	cardbookFileCacheCards : {},
	cardbookComplexSearch : {},

	cardbookMailPopularityIndex : {},
	cardbookPreferDisplayNameIndex : {},
	cardbookDuplicateIndex : {},

	cardbookDirRequest : {},
	cardbookDirResponse : {},
	cardbookFileRequest : {},
	cardbookFileResponse : {},
	cardbookDBRequest : {},
	cardbookDBResponse : {},
	cardbookComplexSearchRequest : {},
	cardbookComplexSearchResponse : {},
	cardbookComplexSearchReloadRequest : {},
	cardbookComplexSearchReloadResponse : {},
	filesFromCacheDB : {},
	
	cardbookServerValidation : {},

	cardbookAccessTokenRequest : {},
	cardbookAccessTokenResponse : {},
	cardbookAccessTokenError : {},
	cardbookRefreshTokenRequest : {},
	cardbookRefreshTokenResponse : {},
	cardbookRefreshTokenError : {},
	cardbookServerDiscoveryRequest : {},
	cardbookServerDiscoveryResponse : {},
	cardbookServerDiscoveryError : {},
	cardbookServerSyncRequest : {},
	cardbookServerSyncResponse : {},
	cardbookServerSyncDone : {},
	cardbookServerSyncTotal : {},
	cardbookServerSyncError : {},
	cardbookServerSyncNotUpdated : {},
	cardbookServerSyncNewOnServer : {},
	cardbookServerSyncNewOnDisk : {},
	cardbookServerSyncUpdatedOnServer : {},
	cardbookServerSyncUpdatedOnDisk : {},
	cardbookServerSyncUpdatedOnBoth : {},
	cardbookServerSyncUpdatedOnDiskDeletedOnServer : {},
	cardbookServerSyncDeletedOnDisk : {},
	cardbookServerSyncDeletedOnDiskUpdatedOnServer : {},
	cardbookServerSyncDeletedOnServer : {},
	cardbookServerSyncAgain : {},
	cardbookServerSyncCompareWithCacheDone : {},
	cardbookServerSyncCompareWithCacheTotal : {},
	cardbookServerSyncHandleRemainingDone : {},
	cardbookServerSyncHandleRemainingTotal : {},
	cardbookServerGetRequest : {},
	cardbookServerGetResponse : {},
	cardbookServerGetError : {},
	cardbookServerGetForMergeRequest : {},
	cardbookServerGetForMergeResponse : {},
	cardbookServerGetForMergeError : {},
	cardbookServerMultiGetArray : {},
	cardbookServerMultiGetParams : {},
	cardbookServerMultiGetRequest : {},
	cardbookServerMultiGetResponse : {},
	cardbookServerMultiGetError : {},
	cardbookServerUpdatedRequest : {},
	cardbookServerUpdatedResponse : {},
	cardbookServerUpdatedError : {},
	cardbookServerCreatedRequest : {},
	cardbookServerCreatedResponse : {},
	cardbookServerCreatedError : {},
	cardbookServerDeletedRequest : {},
	cardbookServerDeletedResponse : {},
	cardbookServerDeletedError : {},
	cardbookImageGetRequest : {},
	cardbookImageGetResponse : {},
	cardbookImageGetError : {},
	cardbookSyncMode : {},
	cardbookServerNotPushed : {},
	
	cardbookServerChangedPwd : {},
	
	cardbookReorderMode : "NOREORDER",
	cardbookSearchMode : "NOSEARCH",
	cardbookSearchValue : "",
	cardbookComplexSearchMode : "NOSEARCH",
	cardbookComplexSearchPrefId : "",
	// used to copy and paste 
	currentCopiedEntry : [],
	currentCopiedEntryValue : "",
	currentCopiedEntryName : "",
	currentCopiedEntryLabel : "",

	autoSync : {},
	autoSyncInterval : {},
	autoSyncId : {},

	lTimerLoadCacheAll : {},
	lTimerDirAll : {},
	lTimerSyncAll : {},
	lTimerImportAll : {},
	lComplexSearchAll : {},
	lTimerNoSyncModeAll : {},
	lTimerNewRefreshTokenAll : {},
	
	// used to ensure that the initial load is done only once
	firstLoad: false,

	// used to remember the choice of overriding or not cards
	// while importing, dragging, copying or duplicating
	importConflictChoice : "",
	importConflictChoicePersist : false,

	// used to store the msgIdentityKey by window
	composeMsgIdentity : {},
	
	// used to remember the choice of name and dates format
	showNameAs : "",
	dateDisplayedFormat : "0",

	// used for discoveries
	gDiscoveryDescription : "Discovery module",

	cardbookUncategorizedCards : "",
	
	cardbookMailPopularityFile : "mailPopularityIndex.txt",
	cardbookPreferDisplayNameFile : "mailPreferDisplayName.txt",
	cardbookDuplicateFile : "duplicateIndex.txt",

	customFields : {},
									
	statusInformation : [],

	cardbookOAuthData : {"GOOGLE": {
							EMAIL_TYPE:                 "@gmail.com",
							VCARD_VERSIONS:             [ "3.0" ],
							CLIENT_ID:                  "779554755808-957jloa2c3c8n0rrm1a5304fkik7onf0.apps.googleusercontent.com",
							CLIENT_SECRET:              "h3NUkhofCKAW2E1X_NKSn4C_",
							REDIRECT_URI:               "urn:ietf:wg:oauth:2.0:oob",
							REDIRECT_TITLE:             "Success code=",
							RESPONSE_TYPE:              "code",
							SCOPE:                      "https://www.googleapis.com/auth/carddav",
							OAUTH_URL:                  "https://accounts.google.com/o/oauth2/auth",
							TOKEN_REQUEST_URL:          "https://accounts.google.com/o/oauth2/token",
							TOKEN_REQUEST_TYPE:         "POST",
							TOKEN_REQUEST_GRANT_TYPE:   "authorization_code",
							REFRESH_REQUEST_URL:        "https://accounts.google.com/o/oauth2/token",
							REFRESH_REQUEST_TYPE:       "POST",
							REFRESH_REQUEST_GRANT_TYPE: "refresh_token",
							ROOT_API:                   "https://www.googleapis.com"},
						"YAHOO": {
							EMAIL_TYPE:                 "@yahoo.com",
							VCARD_VERSIONS:             [ "3.0" ],
							CLIENT_ID:                  "dj0yJmk9eWRXYWc2QmNYWndYJmQ9WVdrOVZuVkdlazl3TXpZbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD0xOQ--",
							CLIENT_SECRET:              "a2d17e955c6c96e4d3ec08cff76f4c39fe084f78",
							REDIRECT_URI:               "oob",
							REDIRECT_TITLE:             "Sharing approval",
							RESPONSE_TYPE:              "code",
							LANGUAGE:                   "en-us",
							OAUTH_URL:                  "https://api.login.yahoo.com/oauth2/request_auth",
							TOKEN_REQUEST_URL:          "https://api.login.yahoo.com/oauth2/get_token",
							TOKEN_REQUEST_TYPE:         "POST",
							TOKEN_REQUEST_GRANT_TYPE:   "authorization_code",
							REFRESH_REQUEST_URL:        "https://api.login.yahoo.com/oauth2/get_token",
							REFRESH_REQUEST_TYPE:       "POST",
							REFRESH_REQUEST_GRANT_TYPE: "refresh_token",
							ROOT_API:                   "https://carddav.address.yahoo.com"}
						},

	APPLE_API : "https://contacts.icloud.com",
	APPLE_VCARD_VERSIONS : [ "3.0" ],
	
	cardbookBirthdayPopup : 0,

	// actions
	currentActionId : 0,
	currentAction : {},
	
	// undos
	currentUndoId : 0,

	loadCustoms: function () {
		// for file opened with version <= 19.6
		var typeList = [ 'Name', 'Org' ];
		var numberList = [ '1', '2' ];
		for (var i in typeList) {
			var myTargetNumber = 0;
			for (var j in numberList) {
				try {
					var mySourceField = "extensions.cardbook.customs.customField" + numberList[j] + typeList[i];
					var mySourceValue = cardbookRepository.cardbookPreferences.getStringPref(mySourceField);
					if (typeList[i] === "Name") {
						var myTargetType = "pers";
					} else {
						var myTargetType = "org";
					}
					if (mySourceValue != "") {
						cardbookRepository.cardbookPreferences.setCustomFields(myTargetType, myTargetNumber, mySourceValue);
						myTargetNumber++;
					}
					Services.prefs.deleteBranch(mySourceField);
				}
				catch (e) {}
			}
		}
		cardbookRepository.customFields = {};
		cardbookRepository.customFields = cardbookRepository.cardbookPreferences.getAllCustomFields();
		cardbookRepository.loadPossibleCustomFields();
	},

	loadPossibleCustomFields: function () {
		for (let myCode in cardbookRepository.possibleCustomFields) {
			cardbookRepository.possibleCustomFields[myCode].label = cardbookRepository.extension.localeData.localizeMessage(myCode.replace(/^X-/, "").replace(/-/g, "").toLowerCase() + "Label");
			let found = false;
			for (let j = 0; j < cardbookRepository.customFields.pers.length; j++) {
				if (cardbookRepository.customFields.pers[j][0] == myCode) {
					found = true;
					break;
				}
			}
			cardbookRepository.possibleCustomFields[myCode].added = found;
		}
	},

	writePossibleCustomFields: function () {
		let myCount = cardbookRepository.customFields.pers.length;
		for (let myCode in cardbookRepository.possibleCustomFields) {
			if (cardbookRepository.possibleCustomFields[myCode].add && !cardbookRepository.possibleCustomFields[myCode].added) {
				cardbookRepository.cardbookPreferences.setCustomFields('pers', myCount, myCode + ":" + cardbookRepository.possibleCustomFields[myCode].label);
				cardbookRepository.possibleCustomFields[myCode].added = true;
				myCount++;
			}
		}
		cardbookRepository.loadCustoms();
	},

    setDefaultImppTypes: function () {
		var myIMPPs = [];
		myIMPPs = cardbookRepository.cardbookPreferences.getAllIMPPs();
		if (myIMPPs.length == 0) {
			cardbookRepository.cardbookPreferences.insertIMPPsSeed();
		}
	},

	setGenderLookup: function() {
		for (var type in cardbookRepository.cardbookGenderLookup) {
			cardbookRepository.cardbookGenderLookup[type] = cardbookRepository.extension.localeData.localizeMessage("types.gender." + type.toLowerCase());
		}
	},

	getLang: function() {
		try {
			// Thunderbird 52
			let myLang = Services.prefs.getComplexValue("general.useragent.locale", Components.interfaces.nsIPrefLocalizedString).data;
			if (myLang != "") {
				return myLang;
			}
		}
		catch(e) {}
		try {
			// Thunderbird 60
			let myLangArray = Services.prefs.getComplexValue("intl.accept_languages", Components.interfaces.nsIPrefLocalizedString).data.split(',');
			if (myLangArray[0] != "") {
				return myLangArray[0];
			}
		}
		catch(e) {}
		return "en-US";
	},

	getDefaultRegion: function() {
		try {
			var myDefaultRegion = cardbookRepository.cardbookPreferences.getStringPref("browser.search.region");
			if (myDefaultRegion != "") {
				return myDefaultRegion;
			} else {
				var myLangArray = cardbookRepository.getLang().toUpperCase().split('-');
				if (myLangArray[1] && myLangArray[1] != "") {
					return myLangArray[1];
				} else {
					return myLangArray[0];
				}
			}
		}
		catch(e) {}
		return "US";
	},

	setDefaultRegion: function() {
		var defaultRegion = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.defaultRegion");
		if (defaultRegion == "NOTSET") {
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.defaultRegion", cardbookRepository.getDefaultRegion());
		}
	},

	getLocalDirectory: function() {
		let directoryService = Services.dirsvc;
		// this is a reference to the profile dir (ProfD) now.
		let localDir = directoryService.get("ProfD", Components.interfaces.nsIFile);
		
		localDir.append("cardbook");
		
		if (!localDir.exists() || !localDir.isDirectory()) {
			// read and write permissions to owner and group, read-only for others.
			localDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
		}
		return localDir;
	},

	arrayUnique: function (array) {
		var a = array.concat();
		for (var i=0; i<a.length; ++i) {
			for (var j=i+1; j<a.length; ++j) {
				if (a[i] == a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	},

	normalizeString: function (aString) {
		return aString.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	},

	makeSearchString: function (aString) {
		return this.normalizeString(aString.replace(/[\s+\-+\.+\,+\;+]/g, "").toUpperCase());
	},

	getLongSearchString: function(aCard) {
		var lResult = "";
		var sep = "|";
		lResult = lResult + aCard.lastname + sep;
		lResult = lResult + aCard.firstname + sep;
		lResult = lResult + aCard.othername + sep;
		lResult = lResult + aCard.prefixname + sep;
		lResult = lResult + aCard.suffixname + sep;
		lResult = lResult + aCard.fn + sep;
		lResult = lResult + aCard.nickname + sep;
		lResult = lResult + aCard.bday + sep;
		// lResult = lResult + aCard.categories.join();
		for (let i = 0; i < aCard.adr.length; i++) {
			lResult = lResult + aCard.adr[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.tel.length; i++) {
			lResult = lResult + aCard.tel[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.email.length; i++) {
			lResult = lResult + aCard.email[i][0].join() + sep;
		}
		lResult = lResult + aCard.title + sep;
		lResult = lResult + aCard.role + sep;
		lResult = lResult + aCard.org + sep;
		lResult = lResult + aCard.note + sep;
		for (let i = 0; i < aCard.url.length; i++) {
			lResult = lResult + aCard.url[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.impp.length; i++) {
			lResult = lResult + aCard.impp[i][0].join() + sep;
		}
		lResult = lResult.slice(0, -1);
		return cardbookRepository.makeSearchString(lResult);
	},

	getShortSearchString: function(aCard) {
		var lResult = "";
		var sep = "|";
		for (let i = 0; i < cardbookRepository.autocompleteRestrictSearchFields.length; i++) {
			lResult = lResult + cardbookRepository.cardbookUtils.getCardValueByField(aCard, cardbookRepository.autocompleteRestrictSearchFields[i], false).join() + sep;
		}
		lResult = lResult.slice(0, -1);
		return cardbookRepository.makeSearchString(lResult);
	},

	setEmptyContainer: function(aAccountId) {
		let node = cardbookRepository.cardbookPreferences.getNode(aAccountId);
		let nodes = cardbookRepository.cardbookAccountsCategories;
		if (node != "categories") {
			nodes = cardbookRepository.cardbookAccountsNodes;
		}
		if (nodes[aAccountId]) {
			if (nodes[aAccountId].length > 0) {
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[4] == aAccountId) {
						account[3] = false;
						return;
					}
				}
			} else {
				for (let account of cardbookRepository.cardbookAccounts) {
					if (account[4] == aAccountId) {
						account[3] = true;
						account[2] = false;
						return;
					}
				}
			}
		}
	},
	
	addAccountToRepository: function(aAccountId, aAccountName, aAccountType, aAccountUrl, aAccountUser, aColor, aEnabled, aExpanded, aVCard, aReadOnly, aUrnuuid,
										aDBcached, aAutoSyncEnabled, aAutoSyncInterval, aPrefInsertion) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (!cacheDir.exists() || !cacheDir.isDirectory()) {
			cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
			cacheDir.append("mediacache");
			cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
		}
		if (aPrefInsertion) {
			cardbookRepository.cardbookPreferences.setId(aAccountId, aAccountId);
			cardbookRepository.cardbookPreferences.setName(aAccountId, aAccountName);
			cardbookRepository.cardbookPreferences.setType(aAccountId, aAccountType);
			cardbookRepository.cardbookPreferences.setUrl(aAccountId, aAccountUrl);
			cardbookRepository.cardbookPreferences.setUser(aAccountId, aAccountUser);
			cardbookRepository.cardbookPreferences.setColor(aAccountId, aColor);
			cardbookRepository.cardbookPreferences.setEnabled(aAccountId, aEnabled);
			cardbookRepository.cardbookPreferences.setExpanded(aAccountId, aExpanded);
			cardbookRepository.cardbookPreferences.setVCardVersion(aAccountId, aVCard);
			cardbookRepository.cardbookPreferences.setReadOnly(aAccountId, aReadOnly);
			cardbookRepository.cardbookPreferences.setUrnuuid(aAccountId, aUrnuuid);
			cardbookRepository.cardbookPreferences.setDBCached(aAccountId, aDBcached);
			cardbookRepository.cardbookPreferences.setAutoSyncEnabled(aAccountId, aAutoSyncEnabled);
			cardbookRepository.cardbookPreferences.setAutoSyncInterval(aAccountId, aAutoSyncInterval);
		}
		
		cardbookRepository.cardbookAccounts.push([aAccountName, true, aExpanded, true, aAccountId, aEnabled, aAccountType, aReadOnly, aAccountId]);
		cardbookRepository.cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookAccounts,0,1);
		cardbookRepository.cardbookDisplayCards[aAccountId] = {modified: 0, cards: []};
		cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
		cardbookRepository.cardbookAccountsNodes[aAccountId] = [];
	},

	removeAccountFromRepository: function(aAccountId) {
		cardbookRepository.removeAccountFromCollected(aAccountId);
		cardbookRepository.removeAccountFromRestrictions(aAccountId);
		cardbookRepository.removeAccountFromVCards(aAccountId);
		cardbookRepository.removeAccountFromBirthday(aAccountId);
		cardbookRepository.removeAccountFromDiscovery(aAccountId);

		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (cacheDir.exists() && cacheDir.isDirectory()) {
			cacheDir.remove(true);
		}

		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			for (let category of cardbookRepository.cardbookAccountsCategories[aAccountId]) {
				var myAccountId = aAccountId+"::categories::"+category;
				delete cardbookRepository.cardbookDisplayCards[myAccountId];
			}
			delete cardbookRepository.cardbookAccountsCategories[aAccountId];
			delete cardbookRepository.cardbookDisplayCards[aAccountId];
		}

		function searchCard2(element) {
			return (element[4] != aAccountId);
		}
		cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard2, aAccountId);

		for (var key in cardbookRepository.cardbookCards) {
			if (cardbookRepository.cardbookCards.hasOwnProperty(key)) {
				if (key.startsWith(aAccountId)) {
					cardbookRepository.removeCardFromLongSearch(cardbookRepository.cardbookCards[key]);
					cardbookRepository.removeCardFromShortSearch(cardbookRepository.cardbookCards[key]);
					if (cardbookRepository.cardbookFileCacheCards[aAccountId] && cardbookRepository.cardbookFileCacheCards[aAccountId][cardbookRepository.cardbookCards[key].cacheuri]) {
						delete cardbookRepository.cardbookFileCacheCards[aAccountId][cardbookRepository.cardbookCards[key].cacheuri];
					}
					delete cardbookRepository.cardbookCards[key];
				}
			}
		}
	},
		
	removeComplexSearchFromRepository: function(aAccountId) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (cacheDir.exists() && cacheDir.isDirectory()) {
			cacheDir.remove(true);
		}

		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			for (let category of cardbookRepository.cardbookAccountsCategories[aAccountId]) {
				var myAccountId = aAccountId+"::categories::"+category;
				delete cardbookRepository.cardbookDisplayCards[myAccountId];
			}
			delete cardbookRepository.cardbookAccountsCategories[aAccountId];
			delete cardbookRepository.cardbookDisplayCards[aAccountId];
		}

		function searchCard2(element) {
			return (element[4] != aAccountId);
		}
		cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard2, aAccountId);

		delete cardbookRepository.cardbookComplexSearch[aAccountId];
	},
		
	emptyAccountFromRepository: function(aAccountId) {
		for (var account in cardbookRepository.cardbookDisplayCards) {
			if (account.startsWith(aAccountId+"::categories") || account.startsWith(aAccountId+"::org")) {
				delete cardbookRepository.cardbookDisplayCards[account];
			}
		}
		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
		}
		if (cardbookRepository.cardbookAccountsNodes[aAccountId]) {
			cardbookRepository.cardbookAccountsNodes[aAccountId] = [];
		}
		if (cardbookRepository.cardbookDisplayCards[aAccountId]) {
			cardbookRepository.cardbookDisplayCards[aAccountId] = {modified: 0, cards: []};
		}
		cardbookRepository.setEmptyContainer(aAccountId);

		for (var key in cardbookRepository.cardbookCards) {
			if (cardbookRepository.cardbookCards.hasOwnProperty(key)) {
				if (key.startsWith(aAccountId)) {
					cardbookRepository.removeCardFromLongSearch(cardbookRepository.cardbookCards[key]);
					cardbookRepository.removeCardFromShortSearch(cardbookRepository.cardbookCards[key]);
					if (cardbookRepository.cardbookFileCacheCards[aAccountId] && cardbookRepository.cardbookFileCacheCards[aAccountId][cardbookRepository.cardbookCards[key].cacheuri]) {
						delete cardbookRepository.cardbookFileCacheCards[aAccountId][cardbookRepository.cardbookCards[key].cacheuri];
					}
					delete cardbookRepository.cardbookCards[key];
				}
			}
		}
	},

	emptyComplexSearchFromRepository: function(aAccountId) {
		for (var account in cardbookRepository.cardbookDisplayCards) {
			if (account.startsWith(aAccountId+"::categories") || account.startsWith(aAccountId+"::org")) {
				delete cardbookRepository.cardbookDisplayCards[account];
			}
		}
		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
		}
		if (cardbookRepository.cardbookAccountsNodes[aAccountId]) {
			cardbookRepository.cardbookAccountsNodes[aAccountId] = [];
		}
		if (cardbookRepository.cardbookDisplayCards[aAccountId]) {
			cardbookRepository.cardbookDisplayCards[aAccountId] = {modified: 0, cards: []};
		}
		cardbookRepository.setEmptyContainer(aAccountId);
	},

	removeAccountFromComplexSearch: function (aDirPrefId) {
		if (cardbookRepository.cardbookDisplayCards[aDirPrefId]) {
			for (var i in cardbookRepository.cardbookComplexSearch) {
				if (cardbookRepository.cardbookDisplayCards[i].cards.length != 0) {
					for (let card of cardbookRepository.cardbookDisplayCards[aDirPrefId].cards) {
						cardbookRepository.removeCardFromDisplayAndCat(card, i);
					}
				}
			}
		}
	},

	removeAccountFromCollected: function (aDirPrefId) {
		var result = [];
		var allEmailsCollections = [];
		allEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
		result = allEmailsCollections.filter(child => child[2] != aDirPrefId);
		cardbookRepository.cardbookPreferences.delEmailsCollection();
		for (var i = 0; i < result.length; i++) {
			cardbookRepository.cardbookPreferences.setEmailsCollection(i.toString(), result[i].join("::"));
		}
	},

	// only used from the import of Thunderbird standard address books
	addAccountToCollected: function (aDirPrefId) {
		var allEmailsCollections = [];
		allEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
		var newId = allEmailsCollections.length + 1;
		cardbookRepository.cardbookPreferences.setEmailsCollection(newId.toString(), "true::allMailAccounts::" + aDirPrefId + "::");
	},

	enableOrDisableAccountFromCollected: function (aDirPrefId, aValue) {
		var result = [];
		var allEmailsCollections = [];
		allEmailsCollections = cardbookRepository.cardbookPreferences.getAllEmailsCollections();
		function filterAccount(element) {
			if (element[2] == aDirPrefId) {
				element[0] = aValue;
			}
			return true;
		}
		result = allEmailsCollections.filter(filterAccount);
		cardbookRepository.cardbookPreferences.delEmailsCollection();
		for (var i = 0; i < result.length; i++) {
			cardbookRepository.cardbookPreferences.setEmailsCollection(i.toString(), result[i].join("::"));
		}
	},

	removeAccountFromRestrictions: function (aDirPrefId) {
		var result = [];
		var allRestrictions = [];
		allRestrictions = cardbookRepository.cardbookPreferences.getAllRestrictions();
		function filterAccount(element) {
			return (element[3] != aDirPrefId);
		}
		result = allRestrictions.filter(filterAccount);
		cardbookRepository.cardbookPreferences.delRestrictions();
		for (var i = 0; i < result.length; i++) {
			cardbookRepository.cardbookPreferences.setRestriction(i.toString(), result[i].join("::"));
		}
	},

	enableOrDisableAccountFromRestrictions: function (aDirPrefId, aValue) {
		var result = [];
		var allRestrictions = [];
		allRestrictions = cardbookRepository.cardbookPreferences.getAllRestrictions();
		function filterAccount(element) {
			if (element[3] == aDirPrefId) {
				element[0] = aValue;
			}
			return true;
		}
		result = allRestrictions.filter(filterAccount);
		cardbookRepository.cardbookPreferences.delRestrictions();
		for (var i = 0; i < result.length; i++) {
			cardbookRepository.cardbookPreferences.setRestriction(i.toString(), result[i].join("::"));
		}
	},

	removeAccountFromVCards: function (aDirPrefId) {
		var result = [];
		var allVCards = [];
		allVCards = cardbookRepository.cardbookPreferences.getAllVCards();
		function filterAccount(element) {
			return (element[2] != aDirPrefId);
		}
		result = allVCards.filter(filterAccount);
		cardbookRepository.cardbookPreferences.delVCards();
		for (var i = 0; i < result.length; i++) {
			cardbookRepository.cardbookPreferences.setVCard(i.toString(), result[i].join("::"));
		}
	},

	removeAccountFromBirthday: function (aDirPrefId) {
		var addressBooks = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.addressBooksNameList");
		var addressBooksList = [];
		addressBooksList = addressBooks.split(',');
		function filterAccount(element) {
			return (element != aDirPrefId);
		}
		addressBooksList = addressBooksList.filter(filterAccount);
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.addressBooksNameList", addressBooksList.join(','));
	},

	removeAccountFromDiscovery: function (aDirPrefId) {
		var allDiscoveryAccounts = [];
		allDiscoveryAccounts = cardbookRepository.cardbookSynchronization.getAllURLsToDiscover();
		cardbookRepository.cardbookUtils.sortMultipleArrayByString(allDiscoveryAccounts,0,1);
		var withoutDiscoveryAccounts = [];
		withoutDiscoveryAccounts = cardbookRepository.cardbookSynchronization.getAllURLsToDiscover(aDirPrefId);
		if (allDiscoveryAccounts.length != withoutDiscoveryAccounts.length) {
			var addressBooks = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.discoveryAccountsNameList");
			var addressBooksList = [];
			addressBooksList = addressBooks.split(',');
			var myUser = cardbookRepository.cardbookPreferences.getUser(aDirPrefId);
			var myURL = cardbookRepository.cardbookSynchronization.getShortUrl(cardbookRepository.cardbookPreferences.getUrl(aDirPrefId));
			function filterAccount(element) {
				return (element != myUser + "::" + myURL);
			}
			addressBooksList = addressBooksList.filter(filterAccount);
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.discoveryAccountsNameList", addressBooksList.join(','));
		}
	},

	removeCardFromRepository: function (aCard, aCacheDeletion) {
		try {
			cardbookRepository.removeCardFromLongSearch(aCard);
			cardbookRepository.removeCardFromShortSearch(aCard);
			cardbookRepository.removeCardFromEmails(aCard);
			cardbookRepository.removeCardFromDisplayAndCat(aCard, aCard.dirPrefId);
			cardbookRepository.removeCardFromOrg(aCard, aCard.dirPrefId);
			for (var dirPrefId in cardbookRepository.cardbookComplexSearch) {
				if (cardbookRepository.cardbookPreferences.getEnabled(dirPrefId)) {
					cardbookRepository.removeCardFromDisplayAndCat(aCard, dirPrefId);
				}
			}
			if (aCacheDeletion) {
				cardbookRepository.removeCardFromCache(aCard);
			}
			cardbookRepository.removeCardFromList(aCard);
			aCard = null;
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.removeCardFromRepository error : " + e, "Error");
		}
	},

	addCardToRepository: function (aCard, aMode, aFileName) {
		try {
			cardbookRepository.addCardToEmails(aCard);
			cardbookRepository.addCardToLongSearch(aCard);
			cardbookRepository.addCardToShortSearch(aCard);
			cardbookRepository.addCardToList(aCard);
			cardbookRepository.addCardToCache(aCard, aMode, aFileName);
			cardbookRepository.addCardToDisplayAndCat(aCard, aCard.dirPrefId);
			cardbookRepository.addCardToOrg(aCard, aCard.dirPrefId);
			for (var i in cardbookRepository.cardbookComplexSearch) {
				if (cardbookRepository.isMyCardFound(aCard, i)) {
					cardbookRepository.addCardToDisplayAndCat(aCard, i);
				}
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.addCardToRepository error : " + e, "Error");
		}
	},

	addCardToList: function(aCard) {
		cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid] = aCard;
	},
		
	removeCardFromList: function(aCard) {
		delete cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
	},
		
	addCardToCache: function(aCard, aMode, aFileName) {
		try {
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);
			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId);
			var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(aCard.dirPrefId);
			var myDirPrefIdDBCached = cardbookRepository.cardbookPreferences.getDBCached(aCard.dirPrefId);

			cardbookRepository.cardbookUtils.cachePutMediaCard(aCard, "photo", myDirPrefIdType);
			cardbookRepository.cardbookUtils.cachePutMediaCard(aCard, "logo", myDirPrefIdType);
			cardbookRepository.cardbookUtils.cachePutMediaCard(aCard, "sound", myDirPrefIdType);

			if (myDirPrefIdType === "DIRECTORY") {
				aCard.cacheuri = aFileName;
				var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				myFile.initWithPath(myDirPrefIdUrl);
				myFile.append(aFileName);
				if (aMode === "INITIAL") {
					if (!myFile.exists()) {
						cardbookRepository.cardbookSynchronization.writeCardsToFile(myFile.path, [aCard], true);
						cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " written to directory");
					}
				} else {
					cardbookRepository.cardbookSynchronization.writeCardsToFile(myFile.path, [aCard], true);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " written to directory");
				}
			} else {
				aCard.cacheuri = aFileName;
				if (cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId]) {
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aFileName] = aCard;
				} else {
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId] = {};
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aFileName] = aCard;
				}
				if (myDirPrefIdDBCached) {
					if (aMode === "INITIAL") {
						cardbookIndexedDB.addCardIfMissing(myDirPrefIdName, aCard);
					} else {
						cardbookIndexedDB.addCard(myDirPrefIdName, aCard);
					}
				}
			}
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.addCardToCache error : " + e, "Error");
		}
	},

	removeCardFromCache: function(aCard) {
		try {
			cardbookRepository.cacheDeleteMediaCard(aCard);
			
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aCard.dirPrefId);
			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aCard.dirPrefId);
			var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(aCard.dirPrefId);
			var myDirPrefIdDBCached = cardbookRepository.cardbookPreferences.getDBCached(aCard.dirPrefId);

			if (myDirPrefIdType === "DIRECTORY") {
				var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				myFile.initWithPath(myDirPrefIdUrl);
				myFile.append(aCard.cacheuri);
				if (myFile.exists() && myFile.isFile()) {
					myFile.remove(true);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " deleted from directory");
				}
			} else {
				if (myDirPrefIdDBCached) {
					 cardbookIndexedDB.removeCard(myDirPrefIdName, aCard);
				}
				if (cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri]) {
					delete cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri];
				}
			}
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.removeCardFromCache error : " + e, "Error");
		}
	},

	cacheDeleteMediaCard: function(aCard) {
		try {
			var myPrefName = cardbookRepository.cardbookUtils.getPrefNameFromPrefId(aCard.dirPrefId);
			var mediaName = [ 'photo', 'logo', 'sound' ];

			for (var i in mediaName) {
				var cacheDir = cardbookRepository.cardbookUtils.getMediaCacheFile(aCard.uid, aCard.dirPrefId, aCard.etag, mediaName[i], aCard[mediaName[i]].extension);
				if (cacheDir.exists() && cacheDir.isFile()) {
					cacheDir.remove(true);
					cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2(myPrefName + " : Contact " + aCard.fn + " " + [mediaName[i]] + " deleted from cache");
				}
			}
		}
		catch(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.cacheDeleteMediaCard error : " + e, "Error");
		}
	},

	addCardToDisplayAndCat: function(aCard, aDirPrefId) {
		cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.push(aCard);
		cardbookRepository.addCardToDisplayModified(aCard, aDirPrefId);

		function addProcess(aId, aCategory) {
			let categoryExists = cardbookRepository.cardbookAccountsCategories[aDirPrefId].find(child => child == aCategory);
			if (!categoryExists) {
				cardbookRepository.cardbookAccountsCategories[aDirPrefId].push(aCategory);
				cardbookRepository.cardbookUtils.sortArrayByString(cardbookRepository.cardbookAccountsCategories[aDirPrefId],1);
			}
			if (!cardbookRepository.cardbookDisplayCards[aId]) {
				cardbookRepository.cardbookDisplayCards[aId] = {modified: 0, cards: []};
			}
			cardbookRepository.cardbookDisplayCards[aId].cards.push(aCard);
			cardbookRepository.addCardToDisplayModified(aCard, aId);
		}
		if (aCard.categories.length != 0) {
			for (var category of aCard.categories) {
				addProcess(aDirPrefId+"::categories::"+category, category);
			}
		} else {
			addProcess(aDirPrefId+"::categories::"+cardbookRepository.cardbookUncategorizedCards, cardbookRepository.cardbookUncategorizedCards);
		}
		if (cardbookRepository.cardbookSearchMode === "SEARCH") {
			if (cardbookRepository.getLongSearchString(aCard).indexOf(cardbookRepository.cardbookSearchValue) >= 0) {
				cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].cards.push(aCard);
				cardbookRepository.addCardToDisplayModified(aCard, cardbookRepository.cardbookSearchValue);
			}
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},
		
	removeCardFromDisplayAndCat: function(aCard, aDirPrefId) {
		if (cardbookRepository.cardbookDisplayCards[aDirPrefId]) {
			cardbookRepository.cardbookDisplayCards[aDirPrefId].cards = cardbookRepository.cardbookDisplayCards[aDirPrefId].cards.filter(child => child.dirPrefId + child.uid != aCard.dirPrefId + aCard.uid);
			cardbookRepository.removeCardFromDisplayModified(aCard, aDirPrefId);
			
			function deleteProcess(aId, aCategory) {
				if (cardbookRepository.cardbookDisplayCards[aId]) {
					cardbookRepository.cardbookDisplayCards[aId].cards = cardbookRepository.cardbookDisplayCards[aId].cards.filter(child => child.dirPrefId + child.uid != aCard.dirPrefId + aCard.uid);
					if (cardbookRepository.cardbookDisplayCards[aId].cards.length == 0) {
						delete cardbookRepository.cardbookDisplayCards[aId];
						cardbookRepository.cardbookAccountsCategories[aDirPrefId] = cardbookRepository.cardbookAccountsCategories[aDirPrefId].filter(child => child != aCategory);
					} else {
						cardbookRepository.removeCardFromDisplayModified(aCard, aId);
					}
				}
			}
			if (aCard.categories.length != 0) {
				for (var category of aCard.categories) {
					deleteProcess(aDirPrefId+"::categories::"+category, category);
				}
			} else {
				let uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
				deleteProcess(aDirPrefId+"::categories::"+uncategorizedCards, uncategorizedCards);
			}
		}
		if (cardbookRepository.cardbookSearchMode === "SEARCH") {
			function searchCard(element) {
				return (element.dirPrefId + element.uid != aDirPrefId + aCard.uid);
			}
			cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].cards = cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].cards.filter(searchCard);
			cardbookRepository.removeCardFromDisplayModified(aCard, cardbookRepository.cardbookSearchValue);
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},

	addCardToOrg: function(aCard, aDirPrefId) {
		if (cardbookRepository.cardbookPreferences.getNode(aDirPrefId) != "org") {
			return;
		}
		function addProcess(aId, aName, aParentId) {
			let orgExists = cardbookRepository.cardbookAccountsNodes[aDirPrefId].find(child => child.id == aId);
			if (!orgExists) {
				cardbookRepository.cardbookAccountsNodes[aDirPrefId].push({ data: aName, id: aId, children: []});
				cardbookRepository.cardbookUtils.sortMultipleArrayByString(cardbookRepository.cardbookAccountsNodes[aDirPrefId], "data", 1);
				cardbookRepository.cardbookDisplayCards[aId] = {modified: 0, cards: []};
			}
			cardbookRepository.cardbookDisplayCards[aId].cards.push(aCard);
			let parentNodeExists = cardbookRepository.cardbookAccountsNodes[aDirPrefId].find(child => child.id == aParentId);
			if (parentNodeExists && !parentNodeExists.children.includes(aName)) {
				parentNodeExists.children.push(aName);
				cardbookRepository.cardbookUtils.sortArrayByString(parentNodeExists.children, 1);
			}
		}
		let parent = aDirPrefId + "::org";
		if (aCard.org) {
			let orgArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(aCard.org).split(";"));
			for (let org of orgArray) {
				let id = parent + "::" + org;
				addProcess(id, org, parent);
				parent = id;
			}
		} else {
			let uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
			let id = parent + "::" + uncategorizedCards;
			addProcess(id, uncategorizedCards, parent);
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},
		
	removeCardFromOrg: function(aCard, aDirPrefId) {
		if (cardbookRepository.cardbookPreferences.getNode(aDirPrefId) != "org") {
			return;
		}
		function deleteProcess(aId, aName, aParentId) {
			if (cardbookRepository.cardbookDisplayCards[aId]) {
				cardbookRepository.cardbookDisplayCards[aId].cards = cardbookRepository.cardbookDisplayCards[aId].cards.filter(child => child.dirPrefId + child.uid != aCard.dirPrefId + aCard.uid);
				if (cardbookRepository.cardbookDisplayCards[aId].cards.length == 0) {
					delete cardbookRepository.cardbookDisplayCards[aId];
					cardbookRepository.cardbookAccountsNodes[aDirPrefId] = cardbookRepository.cardbookAccountsNodes[aDirPrefId].filter(child => child.id != aId);
					let upperNode = cardbookRepository.cardbookAccountsNodes[aDirPrefId].find(child => child.id == aParentId);
					if (upperNode) {
						upperNode.children = upperNode.children.filter(child => child != aName);
					}
				} else {
					cardbookRepository.removeCardFromDisplayModified(aCard, aId);
				}
			}
		}
		if (aCard.org) {
			let orgArray = cardbookRepository.cardbookUtils.unescapeArray(cardbookRepository.cardbookUtils.escapeString(aCard.org).split(";"));
			orgArray.splice(0, 0, aCard.dirPrefId, "org" );
			let id = orgArray.join("::");
			let parent = cardbookRepository.getParentOrg(id);
			for (var i = orgArray.length - 1; i >= 0; i--) {
				let data = orgArray[i];
				deleteProcess(id, data, parent);
				id = parent;
				parent = cardbookRepository.getParentOrg(id);
			}
		} else {
			let uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
			deleteProcess(aCard.dirPrefId + "::org::" + uncategorizedCards, uncategorizedCards, aCard.dirPrefId);
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},

	addCategoryToCard: function(aCard, aCategoryName) {
		aCard.categories.push(aCategoryName);
		aCard.categories = cardbookRepository.cardbookUtils.cleanCategories(aCard.categories);
	},

	removeCategoryFromCard: function(aCard, aCategoryName) {
		aCard.categories = aCard.categories.filter(child => child != aCategoryName);
	},

	renameCategoryFromCard: function(aCard, aOldCategoryName, aNewCategoryName) {
		cardbookRepository.removeCategoryFromCard(aCard, aOldCategoryName);
		cardbookRepository.addCategoryToCard(aCard, aNewCategoryName);
	},

	getParentOrg: function (aId) {
		let idArray = aId.split("::");
		idArray.pop();
		return idArray.join("::");
	},

	addOrgToCard: function(aCard, aNodeId) {
		let nodeArray = cardbookRepository.cardbookUtils.escapeStringSemiColon(aNodeId).split("::");
		nodeArray.shift();
		nodeArray.shift();
		aCard.org = cardbookRepository.cardbookUtils.unescapeStringSemiColon(nodeArray.join(";"));
	},

	removeOrgFromCard: function(aCard, aNodeId) {
		let orgArray = cardbookRepository.cardbookUtils.escapeString(aCard.org).split(";");
		let nodeIdArray = aNodeId.split("::");
		while (orgArray.length >= nodeIdArray.length - 2) {
			orgArray.pop();
		}
		aCard.org = cardbookRepository.cardbookUtils.unescapeStringSemiColon(orgArray.join(";"));
	},

	renameOrgFromCard: function(aCard, aNodeId, aNewNodeName) {
		let orgArray = cardbookRepository.cardbookUtils.escapeString(aCard.org).split(";");
		let nodeIdArray = aNodeId.split("::");
		orgArray[nodeIdArray.length - 3] = cardbookRepository.cardbookUtils.escapeStringSemiColon(aNewNodeName);
		aCard.org = cardbookRepository.cardbookUtils.unescapeStringSemiColon(orgArray.join(";"));
	},

	renameUncategorized: function(aOldCategoryName, aNewCategoryName) {
		for (let account of cardbookRepository.cardbookAccounts) {
			if (account[1] && account[5]) {
				let myDirPrefId = account[4];
				for (let category of cardbookRepository.cardbookAccountsCategories[myDirPrefId]) {
					if (category == aOldCategoryName) {
						category = aNewCategoryName;
					}
				}
				if (cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+aOldCategoryName]) {
					cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+aNewCategoryName] = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+aOldCategoryName]));
					delete cardbookRepository.cardbookDisplayCards[myDirPrefId+"::categories::"+aOldCategoryName];
				}
				if (cardbookRepository.cardbookDisplayCards[myDirPrefId+"::org::"+aOldCategoryName]) {
					cardbookRepository.cardbookDisplayCards[myDirPrefId+"::org::"+aNewCategoryName] = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[myDirPrefId+"::org::"+aOldCategoryName]));
					delete cardbookRepository.cardbookDisplayCards[myDirPrefId+"::org::"+aOldCategoryName];
				}
				let nodeExists = cardbookRepository.cardbookAccountsNodes[myDirPrefId].find(child => child.id == myDirPrefId + "::org::" + aOldCategoryName);
				if (nodeExists) {
					nodeExists.data = aNewCategoryName;
					nodeExists.id = myDirPrefId + "::org::" + aNewCategoryName;
				}
			}
		}
		cardbookRepository.cardbookUncategorizedCards = aNewCategoryName;
	},

	saveNodeColors: function() {
		cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.categoryColors", JSON.stringify(cardbookRepository.cardbookNodeColors));
	},

	addCardToDisplayModified: function(aCard, aAccountId) {
		if (aCard.updated || aCard.created) {
			cardbookRepository.cardbookDisplayCards[aAccountId].modified = cardbookRepository.cardbookDisplayCards[aAccountId].modified + 1;
		}
	},

	removeCardFromDisplayModified: function(aCard, aAccountId) {
		if (aCard.updated || aCard.created) {
			cardbookRepository.cardbookDisplayCards[aAccountId].modified = cardbookRepository.cardbookDisplayCards[aAccountId].modified - 1 ;
		}
	},

	addCardToEmails: function(aCard) {
		for (var i = 0; i < aCard.email.length; i++) {
			var myEmail = aCard.email[i][0][0].toLowerCase();
			if (myEmail) {
				if (!cardbookRepository.cardbookCardEmails[aCard.dirPrefId]) {
					cardbookRepository.cardbookCardEmails[aCard.dirPrefId] = {};
				}
				if (!cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail]) {
					cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail] = [];
				}
				cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].push(aCard);
			}
		}
	},
		
	removeCardFromEmails: function(aCard) {
		if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId]) {
			for (var i = 0; i < aCard.email.length; i++) {
				var myEmail = aCard.email[i][0][0].toLowerCase();
				if (myEmail) {
					if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail]) {
						if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].length == 1) {
							delete cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail];
						} else {
							function searchCard(element) {
								return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
							}
							cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail] = cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].filter(searchCard);
						}
					}
				}
			}
		}
	},

	isMyCardFoundInDirPrefId: function (aCard, aComplexSearchDirPrefId) {
		var myRegexp;
		var inverse;
		var myField = [];
		var result;
	
		function buildRegExp(aCard, aCase, aField, aTerm, aValue, aDiacritic) {
			myField = cardbookRepository.cardbookUtils.getCardValueByField(aCard, aField, false);
			if (aDiacritic && myField.length != 0) {
				for (var i = 0; i < myField.length; i++) {
					myField[i] = cardbookRepository.normalizeString(myField[i]);
				}
			}
			if (aTerm == "Contains") {
				myRegexp = new RegExp("(.*)" + aValue + "(.*)", aCase);
				inverse = false;
			} else if (aTerm == "DoesntContain") {
				myRegexp = new RegExp("(.*)" + aValue + "(.*)", aCase);
				inverse = true;
			} else if (aTerm == "Is") {
				myRegexp = new RegExp("^" + aValue + "$", aCase);
				inverse = false;
			} else if (aTerm == "Isnt") {
				myRegexp = new RegExp("^" + aValue + "$", aCase);
				inverse = true;
			} else if (aTerm == "BeginsWith") {
				myRegexp = new RegExp("^" + aValue + "(.*)", aCase);
				inverse = false;
			} else if (aTerm == "EndsWith") {
				myRegexp = new RegExp("(.*)" + aValue + "$", aCase);
				inverse = false;
			} else if (aTerm == "IsEmpty") {
				myRegexp = new RegExp("^$", aCase);
				inverse = false;
			} else if (aTerm == "IsntEmpty") {
				myRegexp = new RegExp("^$", aCase);
				inverse = true;
			}
		};

		for (var i = 0; i < cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules.length; i++) {
			var myCaseOperator = cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][0];
			if (myCaseOperator.startsWith("d")) {
				var myDiacritic = true;
				var myCaseOperator = cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][0].substr(1);
				var myValue = cardbookRepository.normalizeString(cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][3]);
			} else {
				var myDiacritic = false;
				var myCaseOperator = cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][0];
				var myValue = cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][3];
			}
		
			buildRegExp(aCard, myCaseOperator, cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][1],
								cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][2], myValue,
								myDiacritic);
			function searchArray(element) {
				return element.search(myRegexp) != -1;
			};
			if (myField.length == 0) {
				if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][2] == "IsEmpty") {
					var found = true;
				} else if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][2] == "IsntEmpty") {
					var found = true;
				} else {
					var found = false;
				}
			} else if (myField.find(searchArray) == undefined) {
				var found = false;
			} else {
				var found = true;
			}
			
			if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].matchAll) {
				result = true;
				if ((!found && !inverse) || (found && inverse)) {
					result = false;
					break;
				}
			} else {
				result = false;
				if ((found && !inverse) || (!found && inverse)) {
					result = true;
					break;
				}
			}
		}
		return result;
	},

	isMyCardFound: function (aCard, aComplexSearchDirPrefId) {
		if (!cardbookRepository.cardbookPreferences.getEnabled(aComplexSearchDirPrefId)) {
			return false;
		}
		if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId]) {
			if ((cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].searchAB == aCard.dirPrefId) || (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].searchAB === "allAddressBooks")) {
				return cardbookRepository.isMyCardFoundInDirPrefId(aCard, aComplexSearchDirPrefId);
			}
		}
		return false;
	},

	verifyABRestrictions: function (aDirPrefId, aSearchAB, aABExclRestrictions, aABInclRestrictions) {
		if (aABExclRestrictions[aDirPrefId]) {
			return false;
		}
		if (((aABInclRestrictions.length == 0) && ((aSearchAB == aDirPrefId) || (aSearchAB === "allAddressBooks"))) ||
			((aABInclRestrictions.length > 0) && ((aSearchAB == aDirPrefId) || ((aSearchAB === "allAddressBooks") && aABInclRestrictions[aDirPrefId])))) {
			return true;
		} else {
			return false;
		}
	},
	
	verifyCatRestrictions: function (aDirPrefId, aCategory, aSearchInput, aABExclRestrictions, aCatExclRestrictions, aCatInclRestrictions) {
		if (aABExclRestrictions[aDirPrefId]) {
			return false;
		}
		if (aCatExclRestrictions[aDirPrefId] && aCatExclRestrictions[aDirPrefId][aCategory]) {
			return false;
		}
		if (((!(aCatInclRestrictions[aDirPrefId])) && (aCategory.replace(/[\s+\-+\.+\,+\;+]/g, "").toUpperCase().indexOf(aSearchInput) >= 0 || aSearchInput == "")) ||
				((aCatInclRestrictions[aDirPrefId]) && (aCatInclRestrictions[aDirPrefId][aCategory]))) {
			return true;
		} else {
			return false;
		}
	},

	isEmailRegistered: function(aEmail, aIdentityKey) {
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
			if (!aIdentityKey) {
				ABInclRestrictions["length"] = 0;
				return;
			}
			for (var i = 0; i < result.length; i++) {
				var resultArray = result[i];
				if ((resultArray[0] == "true") && (resultArray[3] != "") && ((resultArray[2] == aIdentityKey) || (resultArray[2] == "allMailAccounts"))) {
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
		
		if (aEmail) {
			var myEmail = aEmail.toLowerCase();
			for (let account of cardbookRepository.cardbookAccounts) {
				if (account[1] && account[5] && (account[6] != "SEARCH")) {
					var myDirPrefId = account[4];
					if (cardbookRepository.verifyABRestrictions(myDirPrefId, "allAddressBooks", ABExclRestrictions, ABInclRestrictions)) {
						if (cardbookRepository.cardbookCardEmails[myDirPrefId]) {
							if (cardbookRepository.cardbookCardEmails[myDirPrefId][myEmail]) {
								for (let card of cardbookRepository.cardbookCardEmails[myDirPrefId][myEmail]) {
									if (catExclRestrictions[myDirPrefId]) {
										var add = true;
										for (var l in catExclRestrictions[myDirPrefId]) {
											if (card.categories.includes(l)) {
												add = false;
												break;
											}
										}
										if (!add) {
											continue;
										}
									}
									if (catInclRestrictions[myDirPrefId]) {
										var add = false;
										for (var l in catInclRestrictions[myDirPrefId]) {
											if (card.categories.includes(l)) {
												add = true;
												break;
											}
										}
										if (!add) {
											continue;
										}
									}
									return true;
								}
							}
						}
					}
				}
			}
		}
		return false;
	},

	// this function is only used by the CardBook filters
	// as mail account restrictions do not apply to filters
	isEmailInPrefIdRegistered: function(aDirPrefId, aEmail) {
		if (aEmail) {
			var myTestString = aEmail.toLowerCase();
			// search for a category
			var mySepPosition = aDirPrefId.indexOf("::",0);
			if (mySepPosition != -1) {
				var myCategory = aDirPrefId.substr(mySepPosition+2,aDirPrefId.length);
				aDirPrefId = aDirPrefId.substr(0,mySepPosition);
				if (cardbookRepository.cardbookCardEmails[aDirPrefId]) {
					if (cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString]) {
						for (let card of cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString]) {
							if (myCategory == cardbookRepository.cardbookUncategorizedCards) {
								if (card.categories == "") {
									return true;
								}
							} else {
								if (card.categories.includes(myCategory)) {
									return true;
								}
							}
						}
					}
				}
			} else {
				if (cardbookRepository.cardbookCardEmails[aDirPrefId]) {
					if (cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString]) {
						return true;
					}
				}
			}
		}
		return false;
	},
		
	addCardToLongSearch: function(aCard) {
		var myLongText = cardbookRepository.getLongSearchString(aCard);
		if (myLongText) {
			if (!cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId]) {
				cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId] = {};
			}
			if (!cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText]) {
				cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText] = [];
			}
			cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].push(aCard);
		}
	},
		
	removeCardFromLongSearch: function(aCard) {
		var myLongText = cardbookRepository.getLongSearchString(aCard);
		if (myLongText) {
			if (cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId] && cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText]) {
				if (cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].length == 1) {
					delete cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText];
				} else {
					function searchCard(element) {
						return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
					}
					cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText] = cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].filter(searchCard);
				}
			}
		}
	},

	addCardToShortSearch: function(aCard) {
		if (cardbookRepository.autocompleteRestrictSearch) {
			var myShortText = cardbookRepository.getShortSearchString(aCard);
			if (myShortText) {
				if (!cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId]) {
					cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId] = {};
				}
				if (!cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText]) {
					cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText] = [];
				}
				cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].push(aCard);
			}
		} else {
			cardbookRepository.cardbookCardShortSearch = {};
		}
	},
		
	removeCardFromShortSearch: function(aCard) {
		if (cardbookRepository.autocompleteRestrictSearch) {
			var myShortText = cardbookRepository.getShortSearchString(aCard);
			if (myShortText) {
				if (cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText]) {
					if (cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].length == 1) {
						delete cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText];
					} else {
						function searchCard(element) {
							return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
						}
						cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText] = cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].filter(searchCard);
					}
				}
			}
		}
	},

	saveCard: function(aOldCard, aNewCard, aActionId, aCheckCategory) {
		try {
			if (cardbookRepository.cardbookPreferences.getReadOnly(aNewCard.dirPrefId) || !cardbookRepository.cardbookPreferences.getEnabled(aNewCard.dirPrefId)) {
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].done++;
				}
				return;
			}

			var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aNewCard.dirPrefId);
			var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aNewCard.dirPrefId);
			var myDirPrefIdUrl = cardbookRepository.cardbookPreferences.getUrl(aNewCard.dirPrefId);

			var oldCats = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccountsCategories[aNewCard.dirPrefId]));
			if (aActionId && cardbookRepository.currentAction[aActionId]) {
				cardbookRepository.currentAction[aActionId].total++;
			}

			cardbookRepository.cardbookUtils.setCalculatedFields(aNewCard);
			// Existing card
			if (aOldCard.dirPrefId && cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid] && aOldCard.dirPrefId == aNewCard.dirPrefId) {
				var myCard = cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid];
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].oldCards.push(myCard);
				}
				if (myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					// if aOldCard and aNewCard have the same cached medias
					cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aNewCard);
					cardbookRepository.removeCardFromRepository(myCard, true);
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				} else if (myDirPrefIdType === "FILE") {
					// if aOldCard and aNewCard have the same cached medias
					cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aNewCard);
					cardbookRepository.removeCardFromRepository(myCard, true);
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW");
				} else {
					// if aOldCard and aNewCard have the same cached medias
					cardbookRepository.cardbookUtils.changeMediaFromFileToContent(aNewCard);
					if (!(cardbookRepository.cardbookUtils.searchTagCreated(aNewCard))) {
						cardbookRepository.cardbookUtils.addTagUpdated(aNewCard);
					}
					cardbookRepository.removeCardFromRepository(myCard, true);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardUpdated", [myDirPrefIdName, aNewCard.fn]);
			// Moved card
			} else if (aOldCard.dirPrefId && aOldCard.dirPrefId != "" && cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid] && aOldCard.dirPrefId != aNewCard.dirPrefId) {
				var myCard = cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid];
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].oldCards.push(myCard);
					cardbookRepository.currentAction[aActionId].files.push(myCard.dirPrefId);
				}
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myCard.dirPrefId);
				var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myCard.dirPrefId);
				if (myDirPrefIdType === "FILE") {
					cardbookRepository.removeCardFromRepository(myCard, false);
				} else if (myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					cardbookRepository.removeCardFromRepository(myCard, true);
				} else {
					if (cardbookRepository.cardbookUtils.searchTagCreated(myCard)) {
						cardbookRepository.removeCardFromRepository(myCard, true);
					} else {
						cardbookRepository.cardbookUtils.addTagDeleted(myCard);
						cardbookRepository.addCardToCache(myCard, "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(myCard));
						cardbookRepository.removeCardFromRepository(myCard, false);
					}
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardDeleted", [myDirPrefIdName, myCard.fn]);
				
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(aNewCard.dirPrefId);
				var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(aNewCard.dirPrefId);
				aNewCard.cardurl = "";
				if (myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				} else if (myDirPrefIdType === "FILE") {
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW");
				} else {
					cardbookRepository.cardbookUtils.addTagCreated(aNewCard);
					cardbookRepository.cardbookUtils.addEtag(aNewCard, "0");
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardCreated", [myDirPrefIdName, aNewCard.fn]);
			// New card
			} else {
				if (myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				} else if (myDirPrefIdType === "FILE") {
					cardbookRepository.cardbookUtils.nullifyTagModification(aNewCard);
					cardbookRepository.cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW");
				} else {
					cardbookRepository.cardbookUtils.addTagCreated(aNewCard);
					cardbookRepository.cardbookUtils.addEtag(aNewCard, "0");
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardCreated", [myDirPrefIdName, aNewCard.fn]);
			}
			
			if (aActionId && cardbookRepository.currentAction[aActionId]) {
				cardbookRepository.currentAction[aActionId].newCards.push(aNewCard);
				cardbookRepository.currentAction[aActionId].files.push(aNewCard.dirPrefId);
				cardbookRepository.currentAction[aActionId].done++;
			}

			// category creation or deletion
			if (aNewCard.categories) {
				for (var i = 0; i < aNewCard.categories.length; i++) {
					if (oldCats.indexOf(aNewCard.categories[i]) == -1) {
						cardbookRepository.cardbookUtils.formatStringForOutput("categoryCreated", [myDirPrefIdName, aNewCard.categories[i]]);
						if (aCheckCategory) {
							cardbookRepository.cardbookActions.addActivity("categoryCreated", [myDirPrefIdName, aNewCard.categories[i]], "addItem");
						}
					}
				}
			}
			if (aOldCard.categories) {
				for (var i = 0; i < aOldCard.categories.length; i++) {
					if (cardbookRepository.cardbookAccountsCategories[aNewCard.dirPrefId].indexOf(aOldCard.categories[i]) == -1) {
						cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeleted", [myDirPrefIdName, aOldCard.categories[i]]);
						if (aCheckCategory) {
							cardbookRepository.cardbookActions.addActivity("categoryDeleted", [myDirPrefIdName, aOldCard.categories[i]], "deleteMail");
						}
					}
				}
			}
			aOldCard = null;
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.saveCard error : " + e, "Error");
		}
	},

	deleteCards: function (aListOfCards, aActionId) {
		try {
			var length = aListOfCards.length;
			for (var i = 0; i < length; i++) {
				var myDirPrefId = aListOfCards[i].dirPrefId;
				if (cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId) || !cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
					if (aActionId && cardbookRepository.currentAction[aActionId]) {
						cardbookRepository.currentAction[aActionId].done++;
					}
					continue;
				}
				var myCardCategories = JSON.parse(JSON.stringify(aListOfCards[i].categories));
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].oldCards.push(aListOfCards[i]);
					cardbookRepository.currentAction[aActionId].files.push(myDirPrefId);
				}
				var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
				var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myDirPrefId);
				if (myDirPrefIdType === "FILE") {
					cardbookRepository.removeCardFromRepository(aListOfCards[i], false);
				} else if (myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					cardbookRepository.removeCardFromRepository(aListOfCards[i], true);
				} else {
					if (cardbookRepository.cardbookUtils.searchTagCreated(aListOfCards[i])) {
						cardbookRepository.removeCardFromRepository(aListOfCards[i], true);
					} else {
						cardbookRepository.cardbookUtils.addTagDeleted(aListOfCards[i]);
						cardbookRepository.addCardToCache(aListOfCards[i], "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(aListOfCards[i]));
						cardbookRepository.removeCardFromRepository(aListOfCards[i], false);
					}
				}
				cardbookRepository.cardbookUtils.formatStringForOutput("cardDeleted", [myDirPrefIdName, aListOfCards[i].fn]);
				for (var j = 0; j < myCardCategories.length; j++) {
					if (cardbookRepository.cardbookAccountsCategories[myDirPrefId].indexOf(myCardCategories[j]) == -1) {
						cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeleted", [myDirPrefIdName, myCardCategories[j]]);
						cardbookRepository.cardbookActions.addActivity("categoryDeleted", [myDirPrefIdName, myCardCategories[j]], "deleteMail");
					}
				}
				if (aActionId && cardbookRepository.currentAction[aActionId]) {
					cardbookRepository.currentAction[aActionId].done++;
				}
			}
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.deleteCards error : " + e, "Error");
		}
	},

	asyncDeleteCards: function (aListOfCards, aActionId) {
		try {
			Services.tm.currentThread.dispatch({ run: function() {
				var length = aListOfCards.length;
				for (var i = 0; i < length; i++) {
					var myDirPrefId = aListOfCards[i].dirPrefId;
					if (cardbookRepository.cardbookPreferences.getReadOnly(myDirPrefId) || !cardbookRepository.cardbookPreferences.getEnabled(myDirPrefId)) {
						if (aActionId && cardbookRepository.currentAction[aActionId]) {
							cardbookRepository.currentAction[aActionId].done++;
						}
						continue;
					}
					Services.tm.currentThread.dispatch({ run: function() {
						var myCardCategories = JSON.parse(JSON.stringify(aListOfCards[i].categories));
						if (aActionId && cardbookRepository.currentAction[aActionId]) {
							cardbookRepository.currentAction[aActionId].oldCards.push(aListOfCards[i]);
							cardbookRepository.currentAction[aActionId].files.push(myDirPrefId);
						}
						var myDirPrefIdName = cardbookRepository.cardbookPreferences.getName(myDirPrefId);
						var myDirPrefIdType = cardbookRepository.cardbookPreferences.getType(myDirPrefId);
						if (myDirPrefIdType === "FILE") {
							cardbookRepository.removeCardFromRepository(aListOfCards[i], false);
						} else if (myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
							cardbookRepository.removeCardFromRepository(aListOfCards[i], true);
						} else {
							if (cardbookRepository.cardbookUtils.searchTagCreated(aListOfCards[i])) {
								cardbookRepository.removeCardFromRepository(aListOfCards[i], true);
							} else {
								cardbookRepository.cardbookUtils.addTagDeleted(aListOfCards[i]);
								cardbookRepository.addCardToCache(aListOfCards[i], "WINDOW", cardbookRepository.cardbookUtils.getFileCacheNameFromCard(aListOfCards[i]));
								cardbookRepository.removeCardFromRepository(aListOfCards[i], false);
							}
						}
						cardbookRepository.cardbookUtils.formatStringForOutput("cardDeleted", [myDirPrefIdName, aListOfCards[i].fn]);
						for (var j = 0; j < myCardCategories.length; j++) {
							if (cardbookRepository.cardbookAccountsCategories[myDirPrefId].indexOf(myCardCategories[j]) == -1) {
								cardbookRepository.cardbookUtils.formatStringForOutput("categoryDeleted", [myDirPrefIdName, myCardCategories[j]]);
								cardbookRepository.cardbookActions.addActivity("categoryDeleted", [myDirPrefIdName, myCardCategories[j]], "deleteMail");
							}
						}
						if (aActionId && cardbookRepository.currentAction[aActionId]) {
							cardbookRepository.currentAction[aActionId].done++;
						}
					}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
				}
			}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
		}
		catch (e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("cardbookRepository.deleteCards error : " + e, "Error");
		}
	},

	isOutgoingMail: function(aMsgHdr) {
		if (!aMsgHdr) {
			return false;
		}
		let author = aMsgHdr.mime2DecodedAuthor;
		if (author) {
			let accounts = MailServices.accounts;
			for (let identity of accounts.allIdentities) {
				if (author.includes(identity.email)) {
					return true;
				}
			}
		}
		return false;
	},

	reWriteFiles: function (aListOfFiles) {
		let listOfFilesToRewrite = cardbookRepository.arrayUnique(aListOfFiles);
		for (var i = 0; i < listOfFilesToRewrite.length; i++) {
			if (cardbookRepository.cardbookPreferences.getType(listOfFilesToRewrite[i]) === "FILE" && !cardbookRepository.cardbookPreferences.getReadOnly(listOfFilesToRewrite[i])) {
				let myArray = JSON.parse(JSON.stringify(cardbookRepository.cardbookDisplayCards[listOfFilesToRewrite[i]].cards));
				cardbookRepository.cardbookUtils.sortCardsTreeArrayByString(myArray, "uid", 1);
				cardbookRepository.cardbookSynchronization.writeCardsToFile(cardbookRepository.cardbookPreferences.getUrl(listOfFilesToRewrite[i]), myArray, true);
			}
		}
	},

	getRuleFile: function (aPrefId) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aPrefId);
		cacheDir.append(aPrefId + ".rul");
		return cacheDir;
	},

	getTextColorFromBackgroundColor: function (aHexBackgroundColor) {
		function hexToRgb(aColor) {
			var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(aColor);
			return result ? {r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16)} : null;
		}

		var rgbColor = hexToRgb(aHexBackgroundColor);
		// http://www.w3.org/TR/AERT#color-contrast
		var o = Math.round(((parseInt(rgbColor.r) * 299) + (parseInt(rgbColor.g) * 587) + (parseInt(rgbColor.b) * 114)) / 1000);
		var fore = (o > 125) ? 'black' : 'white';
		return fore;
	},

	deleteCssAllRules: function (aStyleSheet) {
		// aStyleSheet.cssRules may not be available
		try {
			while(aStyleSheet.cssRules.length > 0) {
				aStyleSheet.deleteRule(0);
			}
		} catch(e) {}

	},

	createMarkerRule: function (aStyleSheet, aStyleSheetRuleName) {
		var ruleString = "." + aStyleSheetRuleName + " {}";
		var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
	},

	createCssAccountRules: function (aStyleSheet, aDirPrefId, aColor) {
		var ruleString = ".cardbookAccountTreeClass treechildren::-moz-tree-cell(accountColor color_" + aDirPrefId + ") {background-color: " + aColor + ";}";
		var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
	},

	createCssCategoryRules: function (aStyleSheet, aDirPrefId, aColor) {
		var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(aColor);
		var ruleString1 = ".cardbookCategoryClass[type=\"" + aDirPrefId + "\"] {background-color: " + aColor + ";}";
		var ruleIndex1 = aStyleSheet.insertRule(ruleString1, aStyleSheet.cssRules.length);
		var ruleString2 = ".cardbookCategoryClass[type=\"" + aDirPrefId + "\"] {border-color: " + aColor + ";}";
		var ruleIndex2 = aStyleSheet.insertRule(ruleString2, aStyleSheet.cssRules.length);
		var ruleString3 = ".cardbookCategoryClass[type=\"" + aDirPrefId + "\"] {color: " + oppositeColor + ";}";
		var ruleIndex3 = aStyleSheet.insertRule(ruleString3, aStyleSheet.cssRules.length);
		var ruleString4 = ".cardbookCategoryMenuClass[colorType=\"" + aDirPrefId + "\"] {color: " + aColor + ";}";
		var ruleIndex4 = aStyleSheet.insertRule(ruleString4, aStyleSheet.cssRules.length);
	},

	createCssCardRules: function (aStyleSheet, aDirPrefId, aColor) {
		var oppositeColor = cardbookRepository.getTextColorFromBackgroundColor(aColor);
		if (cardbookRepository.useColor == "text") {
			var ruleString1 = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH color_" + aDirPrefId + ") {color: " + aColor + " !important;}";
			var ruleIndex1 = aStyleSheet.insertRule(ruleString1, aStyleSheet.cssRules.length);

			var ruleString2 = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH color_" + aDirPrefId + ") {background-color: " + oppositeColor + " !important;}";
			var ruleIndex2 = aStyleSheet.insertRule(ruleString2, aStyleSheet.cssRules.length);
			
			var ruleString3 = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH color_" + aDirPrefId + ", selected, focus) {color: HighlightText !important;}";
			var ruleIndex3 = aStyleSheet.insertRule(ruleString3, aStyleSheet.cssRules.length);

			var ruleString4 = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH color_" + aDirPrefId + ", selected, focus) {background-color: Highlight !important;}";
			var ruleIndex4 = aStyleSheet.insertRule(ruleString4, aStyleSheet.cssRules.length);
		} else if (cardbookRepository.useColor == "background") {
			var ruleString1 = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH color_" + aDirPrefId + ") {background-color: " + aColor + " !important;}";
			var ruleIndex1 = aStyleSheet.insertRule(ruleString1, aStyleSheet.cssRules.length);

			var ruleString2 = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH color_" + aDirPrefId + ") {color: " + oppositeColor + " !important;}";
			var ruleIndex2 = aStyleSheet.insertRule(ruleString2, aStyleSheet.cssRules.length);

			var ruleString3 = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH color_" + aDirPrefId + ", selected, focus) {background-color: Highlight !important;}";
			var ruleIndex3 = aStyleSheet.insertRule(ruleString3, aStyleSheet.cssRules.length);

			var ruleString4 = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH color_" + aDirPrefId + ", selected, focus) {color: HighlightText !important;}";
			var ruleIndex4 = aStyleSheet.insertRule(ruleString4, aStyleSheet.cssRules.length);
		}
	},

	unregisterCss: function (aChromeUri) {
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var uri = Services.io.newURI(aChromeUri, null, null);
		if (sss.sheetRegistered(uri, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(uri, sss.AUTHOR_SHEET);
		}
	},

	reloadCss: function (aChromeUri) {
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var uri = Services.io.newURI(aChromeUri, null, null);
		if (sss.sheetRegistered(uri, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(uri, sss.AUTHOR_SHEET);
		}
		sss.loadAndRegisterSheet(uri, sss.AUTHOR_SHEET);
	},

	getDateFormat: function (aDirPrefId, aVersion) {
		var myType = cardbookRepository.cardbookPreferences.getType(aDirPrefId);
		if ( myType == 'GOOGLE' || myType == 'APPLE') {
			return "YYYY-MM-DD";
		} else {
			return aVersion;
		}
	},

	getABIconType: function (aType) {
		switch(aType) {
			case "DIRECTORY":
				return "directory";
				break;
			case "FILE":
				return "file";
				break;
			case "LOCALDB":
				return "localdb";
				break;
			case "APPLE":
			case "CARDDAV":
			case "GOOGLE":
			case "YAHOO":
				return "remote";
				break;
			case "SEARCH":
				return "search";
				break;
			case "ALL":
				return [ "directory", "file", "localdb", "remote", "search" ];
				break;
		};
		return aType.toLowerCase();
	},

	getABTypeFormat: function (aType) {
		switch(aType) {
			case "DIRECTORY":
			case "FILE":
			case "LOCALDB":
			case "CARDDAV":
			case "SEARCH":
				return "CARDDAV";
				break;
		};
		return aType;
	},

	getABStatusType: function (aDirPrefId) {
		if (cardbookRepository.cardbookUtils.isMyAccountSyncing(aDirPrefId)) {
				return "syncing";
		} else if (cardbookRepository.cardbookPreferences.getReadOnly(aDirPrefId)) {
			return "readonly";
		} else {
			return "readwrite";
		}
	}

};

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/preferences/cardbookPreferences.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookUtils.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronization.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronizationGoogle.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronizationYahoo.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookLog.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookPasswordManager.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookTypes.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookDiscovery.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookMailPopularity.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookPreferDisplayName.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookDates.jsm", cardbookRepository);
loader.loadSubScript("chrome://cardbook/content/cardbookIndexedDB.js", this); //doesn't work with cardbookRepository instead of this
