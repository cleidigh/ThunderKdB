if ("undefined" == typeof(ovl_synchro)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetter(this, "cardbookRepository", "chrome://cardbook/content/cardbookRepository.js", "cardbookRepository");

	var ovl_synchro = {

		lTimerSync: null,
		
		initPrefs: function () {
			if (cardbookRepository.firstLoad) {
				return;
			}
			var prefs = Services.prefs.getDefaultBranch("extensions.cardbook.");
			
			prefs.setBoolPref("autocompletion", true);
			prefs.setBoolPref("autocompleteSortByPopularity", true);
			prefs.setBoolPref("proposeConcatEmails", false);
			prefs.setBoolPref("autocompleteShowAddressbook", false);
			prefs.setBoolPref("autocompleteWithColor", true);
			prefs.setBoolPref("autocompleteRestrictSearch", false);
			prefs.setCharPref("autocompleteRestrictSearchFields", cardbookRepository.defaultAutocompleteRestrictSearchFields);
			prefs.setCharPref("useColor", "background");
			prefs.setBoolPref("exclusive", false);
			prefs.setCharPref("requestsTimeout", "120");
			prefs.setCharPref("statusInformationLineNumber", "250");
			prefs.setBoolPref("debugMode", false);
			
			prefs.setBoolPref("preferEmailEdition", true);
			prefs.setBoolPref("mailPopularityTabView", false);
			prefs.setBoolPref("technicalTabView", false);
			prefs.setBoolPref("vcardTabView", false);
			prefs.setBoolPref("advancedTabView", false);
			
			prefs.setCharPref("panesView", "modern");
			prefs.setBoolPref("syncAfterChange", true);
			prefs.setBoolPref("initialSync", true);
			prefs.setCharPref("initialSyncDelay", "0");
			prefs.setCharPref("solveConflicts", "User");
			prefs.setCharPref("discoveryAccountsNameList", "");
			prefs.setCharPref("multiget", "40");
			prefs.setCharPref("maxModifsPushed", "40");
			prefs.setBoolPref("decodeReport", true);
			
			prefs.setBoolPref("preferEmailPref", true);
			prefs.setBoolPref("preferIMPPPref", true);
			prefs.setBoolPref("warnEmptyEmails", true);
			prefs.setBoolPref("useOnlyEmail", false);
			
			prefs.setBoolPref("usePreferenceValue", false);
			prefs.setCharPref("preferenceValueLabel", "");
			
			prefs.setBoolPref("firstRun", true);
			
			prefs.setCharPref("kindCustom", "X-ADDRESSBOOKSERVER-KIND");
			prefs.setCharPref("memberCustom", "X-ADDRESSBOOKSERVER-MEMBER");
			
			prefs.setCharPref("orgStructure", "");
			
			prefs.setCharPref("localizeEngine", "OpenStreetMap");
			prefs.setCharPref("localizeTarget", "out");
			var lastnamefirst = Services.prefs.getIntPref("mail.addr_book.lastnamefirst");
			if (lastnamefirst == 0) {
				prefs.setCharPref("showNameAs", "DSP");
			} else if (lastnamefirst == 1) {
				prefs.setCharPref("showNameAs", "LFCOMMA");
			} else if (lastnamefirst == 2) {
				prefs.setCharPref("showNameAs", "FL");
			}
			prefs.setBoolPref("fnFormulaMigrated", false);
			
			// localized
			cardbookRepository.defaultAdrFormula = cardbookRepository.strBundle.GetStringFromName("addressFormatFormula");
			prefs.setCharPref("adrFormula", cardbookRepository.defaultAdrFormula);
			prefs.setCharPref("dateDisplayedFormat", "0");
			
			prefs.setCharPref("addressBooksNameList", "allAddressBooks");
			prefs.setBoolPref("birthday.bday", true);
			prefs.setBoolPref("birthday.anniversary", true);
			prefs.setBoolPref("birthday.deathdate", true);
			prefs.setBoolPref("birthday.events", true);
			prefs.setCharPref("calendarsNameList", "");
			prefs.setCharPref("numberOfDaysForSearching", "30");
			prefs.setBoolPref("showPopupOnStartup", false);
			prefs.setBoolPref("showPeriodicPopup", false);
			prefs.setCharPref("periodicPopupIime", "08:00");
			prefs.setBoolPref("showPopupEvenIfNoBirthday", true);
			prefs.setBoolPref("syncWithLightningOnStartup", false);
			prefs.setCharPref("numberOfDaysForWriting", "366");
			// localized
			prefs.setCharPref("eventEntryTitle", cardbookRepository.strBundle.GetStringFromName("eventEntryTitleMessage"));
			prefs.setBoolPref("eventEntryTitleMigrated", false);
			prefs.setCharPref("eventEntryTime", "00:00");
			prefs.setBoolPref("eventEntryWholeDay", false);
			prefs.setCharPref("calendarEntryAlarm", "168");
			prefs.setBoolPref("calendarEntryAlarmMigrated", false);
			prefs.setCharPref("calendarEntryCategories", "");
			
			prefs.setBoolPref("viewABPane", true);
			prefs.setBoolPref("viewABContact", true);
			
			prefs.setCharPref("accountsShown", "all");
			prefs.setCharPref("accountShown", "");
			prefs.setCharPref("uncategorizedCards", "");
			prefs.setCharPref("categoryColors", "");
			prefs.setCharPref("addonVersion", "44.8");
			prefs.setCharPref("defaultRegion", "NOTSET");

			prefs.setBoolPref("localDataEncryption", false);

			// not UI accessible prefs
			prefs.setCharPref("maxUndoChanges", "100");
			prefs.setCharPref("currentUndoId", "0");
		},

		lEventTimerSync : { notify: function(lTimerSync) {
			if (!cardbookRepository.firstLoad) {
				// setting uncategorizedCards
				try {
					cardbookRepository.cardbookUncategorizedCards = cardbookPreferences.getStringPref("extensions.cardbook.uncategorizedCards");
					if (cardbookRepository.cardbookUncategorizedCards == "") {
						throw "CardBook no uncategorizedCards";
					}
				}
				catch (e) {
					cardbookRepository.cardbookUncategorizedCards = cardbookRepository.strBundle.GetStringFromName("uncategorizedCards");
					cardbookPreferences.setStringPref("extensions.cardbook.uncategorizedCards", cardbookRepository.cardbookUncategorizedCards);
				}
				// setting preferEmailPref and preferIMPPPref for getting usefull emails and impps
				cardbookRepository.preferEmailPref = cardbookPreferences.getBoolPref("extensions.cardbook.preferEmailPref");
				cardbookRepository.preferIMPPPref = cardbookPreferences.getBoolPref("extensions.cardbook.preferIMPPPref");

				// setting addonVersion, userAgent and prodid
				cardbookRepository.addonVersion = cardbookPreferences.getStringPref("extensions.cardbook.addonVersion");
				cardbookRepository.userAgent = "Thunderbird CardBook/" + cardbookRepository.addonVersion;
				cardbookRepository.prodid = "-//Thunderbird.net/NONSGML Thunderbird CardBook V"+ cardbookRepository.addonVersion + "//" + cardbookRepository.getLang().toUpperCase();

				// setting autocompleteRestrictSearch and autocompleteRestrictSearchFields
				cardbookRepository.autocompleteRestrictSearch = cardbookPreferences.getBoolPref("extensions.cardbook.autocompleteRestrictSearch");
				cardbookRepository.autocompleteRestrictSearchFields = cardbookPreferences.getStringPref("extensions.cardbook.autocompleteRestrictSearchFields").split('|');

				// setting useColor
				cardbookRepository.useColor = cardbookPreferences.getStringPref("extensions.cardbook.useColor");

				// setting some display preferences
				cardbookRepository.showNameAs = cardbookPreferences.getStringPref("extensions.cardbook.showNameAs");
				cardbookRepository.dateDisplayedFormat = cardbookPreferences.getStringPref("extensions.cardbook.dateDisplayedFormat");

				// setting some log preferences
				cardbookRepository.debugMode = cardbookPreferences.getBoolPref("extensions.cardbook.debugMode");
				cardbookRepository.statusInformationLineNumber = cardbookPreferences.getStringPref("extensions.cardbook.statusInformationLineNumber");

				// setting cardbookGenderLookup for having lookups
				cardbookRepository.setGenderLookup();

				// setting the default region
				cardbookRepository.setDefaultRegion();

				// migration functions (should be removed)
				// removed : cardbookRepository.setSolveConflicts();
				cardbookRepository.setCollected();
				cardbookRepository.loadCustoms();
				cardbookRepository.setCalendarEntryAlarm();
				cardbookRepository.setEventEntryTitle();
				cardbookRepository.migrateFnFormula();

				// load category colors
				try {
					cardbookRepository.cardbookNodeColors = JSON.parse(cardbookPreferences.getStringPref("extensions.cardbook.categoryColors"));
				}
				catch (e) {
					cardbookRepository.cardbookNodeColors = {};
				}

				// observers are needed not only UI but also for synchro
				// there is no unregister launched
				cardBookObserver.register();
				
				// add Cardbook into taskbar
				ovl_winTaskBar.add();
				
				// once openDB is finished, it will fire an event
				// and then load the cache and maybe sync the accounts
				cardbookIndexedDB.openDB();

				// query for some undos
				cardbookIndexedDB.openUndoDB();
				
				cardbookRepository.firstLoad = true;
			}
			}
		},
		
		runBackgroundSync: function () {
			ovl_synchro.lTimerSync = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			ovl_synchro.lTimerSync.initWithCallback(ovl_synchro.lEventTimerSync, 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
		}
	};

	// otherwise indexedDB cannot be opened
	let cookieBehavior = Services.prefs.getIntPref("network.cookie.cookieBehavior", 2);
	if (cookieBehavior == 2) {
		Services.prefs.setIntPref("network.cookie.cookieBehavior", 1);
	}

	// need to launch it a bit later
	ovl_synchro.initPrefs();

	cardbookMailPopularity.loadMailPopularity();

	ovl_synchro.runBackgroundSync();

};
