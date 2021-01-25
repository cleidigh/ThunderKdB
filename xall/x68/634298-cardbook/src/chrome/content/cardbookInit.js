var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var cardbookInit = {

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
		prefs.setBoolPref("mailPopularityTabView", true);
		prefs.setBoolPref("technicalTabView", true);
		prefs.setBoolPref("vcardTabView", true);
		prefs.setBoolPref("keyTabView", true);
		
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
		
		prefs.setCharPref("fieldsNameList", "allFields");
		prefs.setBoolPref("autoComputeFn", true);

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
		
		// localized
		cardbookRepository.defaultAdrFormula = cardbookRepository.extension.localeData.localizeMessage("addressFormatFormula");
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
		prefs.setCharPref("eventEntryTitle", cardbookRepository.extension.localeData.localizeMessage("eventEntryTitleMessage"));
		prefs.setCharPref("calendarEntryCategories", cardbookRepository.extension.localeData.localizeMessage("anniversaryCategory"));
		prefs.setCharPref("eventEntryTime", "00:00");
		prefs.setBoolPref("repeatingEvent", true);
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
		prefs.setCharPref("addonVersion", "55.2");
		prefs.setCharPref("defaultRegion", "NOTSET");

		prefs.setBoolPref("localDataEncryption", false);

		// not UI accessible prefs
		prefs.setCharPref("maxUndoChanges", "100");
		prefs.setCharPref("currentUndoId", "0");

		// setting uncategorizedCards
		try {
			cardbookRepository.cardbookUncategorizedCards = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.uncategorizedCards");
			if (cardbookRepository.cardbookUncategorizedCards == "") {
				throw "CardBook no uncategorizedCards";
			}
		}
		catch (e) {
			cardbookRepository.cardbookUncategorizedCards = cardbookRepository.extension.localeData.localizeMessage("uncategorizedCards");
			cardbookRepository.cardbookPreferences.setStringPref("extensions.cardbook.uncategorizedCards", cardbookRepository.cardbookUncategorizedCards);
		}
		// setting preferEmailPref and preferIMPPPref for getting usefull emails and impps
		cardbookRepository.preferEmailPref = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.preferEmailPref");
		cardbookRepository.preferIMPPPref = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.preferIMPPPref");

		// setting addonVersion, userAgent and prodid
		cardbookRepository.addonVersion = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.addonVersion");
		cardbookRepository.userAgent = "Thunderbird CardBook/" + cardbookRepository.addonVersion;
		cardbookRepository.prodid = "-//Thunderbird.net/NONSGML Thunderbird CardBook V"+ cardbookRepository.addonVersion + "//" + cardbookRepository.getLang().toUpperCase();

		// setting autocompleteRestrictSearch and autocompleteRestrictSearchFields
		cardbookRepository.autocompleteRestrictSearch = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.autocompleteRestrictSearch");
		cardbookRepository.autocompleteRestrictSearchFields = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.autocompleteRestrictSearchFields").split('|');

		// setting useColor
		cardbookRepository.useColor = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.useColor");

		// setting some display preferences
		cardbookRepository.showNameAs = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.showNameAs");
		cardbookRepository.dateDisplayedFormat = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.dateDisplayedFormat");

		// setting some log preferences
		cardbookRepository.debugMode = cardbookRepository.cardbookPreferences.getBoolPref("extensions.cardbook.debugMode");
		cardbookRepository.statusInformationLineNumber = cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.statusInformationLineNumber");

		// setting cardbookGenderLookup for having lookups
		cardbookRepository.setGenderLookup();

		// setting the default region
		cardbookRepository.setDefaultRegion();

		// setting the default region
		cardbookRepository.setDefaultImppTypes();

		// migration functions (should be removed)
		cardbookRepository.loadCustoms();

		// load category colors
		try {
			cardbookRepository.cardbookNodeColors = JSON.parse(cardbookRepository.cardbookPreferences.getStringPref("extensions.cardbook.categoryColors"));
		}
		catch (e) {
			cardbookRepository.cardbookNodeColors = {};
		}
	}
};

function startup() {
	cardbookInit.initPrefs();
}

