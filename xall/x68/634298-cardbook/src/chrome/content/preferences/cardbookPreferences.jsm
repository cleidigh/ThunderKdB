var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ["cardbookPreferences"];
var cardbookPreferences = {

	prefCardBookRoot: "extensions.cardbook.",
	prefCardBookData: "extensions.cardbook.data.",
	prefCardBookTels: "extensions.cardbook.tels.",
	prefCardBookIMPPs: "extensions.cardbook.impps.",
	prefCardBookCustomFields: "extensions.cardbook.customFields.",
	prefCardBookAccountVCards: "extensions.cardbook.vcards.",
	prefCardBookAccountRestrictions: "extensions.cardbook.accountsRestrictions.",
	prefCardBookEmailsCollection: "extensions.cardbook.emailsCollection.",
	prefCardBookCustomTypes: "extensions.cardbook.customTypes.",

	_arrayUnique: function (array) {
		var a = array.concat();
		for(var i=0; i<a.length; ++i) {
			for(var j=i+1; j<a.length; ++j) {
				if(a[i] === a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	},

	getBoolPref: function (prefName, aDefaultValue) {
		try {
			return Services.prefs.getBoolPref(prefName);
		}
		catch(e) {
			return aDefaultValue;
		}
	},

	setBoolPref: function (prefName, value) {
		try {
			Services.prefs.setBoolPref(prefName, value);
		}
		catch(e) {
			dump("cardbookPreferences.setBoolPref : failed to set" + prefName + "\n" + e + "\n");
		}
	},

	getStringPref: function (prefName) {
		try {
			return Services.prefs.getStringPref(prefName);
		}
		catch(e) {
			return "";
		}
	},

	setStringPref: function (prefName, value) {
		try {
			Services.prefs.setStringPref(prefName, value);
		}
		catch(e) {
			dump("cardbookPreferences.setStringPref : failed to set" + prefName + "\n" + e + "\n");
		}
	},

	insertIMPPsSeed: function () {
		this.setIMPPs(0,"skype:" + cardbookRepository.extension.localeData.localizeMessage("impp.skype") + ":skype");
		this.setIMPPs(1,"jabber:" + cardbookRepository.extension.localeData.localizeMessage("impp.jabber") + ":xmpp");
		this.setIMPPs(2,"googletalk:" + cardbookRepository.extension.localeData.localizeMessage("impp.googletalk") + ":gtalk");
		this.setIMPPs(3,"qq:" + cardbookRepository.extension.localeData.localizeMessage("impp.qq") + ":qq");
	},

	sortArrayByNumber: function (aArray, aIndex, aInvert) {
		function compare1(a, b) { return (a[aIndex] - b[aIndex])*aInvert; };
		function compare2(a, b) { return (a - b)*aInvert; };
		if (aIndex != -1) {
			return aArray.sort(compare1);
		} else {
			return aArray.sort(compare2);
		}
	},

	getAllCustomFieldsByType: function (aType) {
		try {
			var count = {};
			var finalResult = [];
			var result = Services.prefs.getChildList(this.prefCardBookCustomFields + aType + ".", count);
			
			for (let i = 0; i < result.length; i++) {
				var prefName = result[i].replace(this.prefCardBookCustomFields, "");
				var prefNumber = prefName.replace(aType + '.', '');
				var prefValue = this.getCustomFields(prefName);
				var tmpArray = prefValue.split(":");
				finalResult.push([tmpArray[0], tmpArray[1], parseInt(prefNumber)]);
			}
			cardbookPreferences.sortArrayByNumber(finalResult,2,1);
			return finalResult;
		}
		catch(e) {
			dump("cardbookPreferences.getAllCustomFieldsByType error : " + e + "\n");
		}
	},

	getAllCustomFields: function () {
		try {
			let finalResult = {};
			// to delete pers
			for (let type of [ 'pers', 'personal', 'org' ]) {
				finalResult[type] = [];
				let result = this.getAllCustomFieldsByType(type);
				if (result.length) {
					finalResult[type] = result;
				}
			}
			return finalResult;
		}
		catch(e) {
			dump("cardbookPreferences.getAllCustomFields error : " + e + "\n");
		}
	},

	getDiscoveryAccounts: function () {
		try {
			var finalResult = [];
			var tmpResult1 = [];
			var tmpResult2 = [];
			var tmpValue = this.getStringPref(this.prefCardBookRoot + "discoveryAccountsNameList");
			if (tmpValue != "") {
				tmpResult1 = tmpValue.split(",");
				for (var i = 0; i < tmpResult1.length; i++) {
					tmpResult2 = tmpResult1[i].split("::");
					finalResult.push([tmpResult2[1],tmpResult2[0]]);
				}
			}
			return finalResult;
		}
		catch(e) {
			dump("cardbookPreferences.getDiscoveryAccounts error : " + e + "\n");
		}
	},

	getAllTels: function () {
		try {
			var count = {};
			var finalResult = [];
			var finalResult1 = [];
			var result = Services.prefs.getChildList(this.prefCardBookTels, count);
			
			for (let i = 0; i < result.length; i++) {
				var prefName = result[i].replace(this.prefCardBookTels, "");
				finalResult.push(this.getTels(prefName));
			}
			finalResult = this._arrayUnique(finalResult);
			for (let i = 0; i < finalResult.length; i++) {
				var tmpArray = finalResult[i].split(":");
				finalResult1.push([tmpArray[0], tmpArray[1], tmpArray[2], i]);
			}
			return finalResult1;
		}
		catch(e) {
			dump("cardbookPreferences.getAllTels error : " + e + "\n");
		}
	},

	getAllComplexSearchIds: function () {
		try {
			let count = {};
			let finalResult = [];
			let result = Services.prefs.getChildList(this.prefCardBookData, count);
			for (let i = 0; i < result.length; i++) {
				result[i] = result[i].replace(this.prefCardBookData,"");
				var myTmpArray = result[i].split('.');
				if (myTmpArray[1] == 'type') {
					var value = this.getStringPref(this.prefCardBookData + myTmpArray[0] + '.' + myTmpArray[1]);
					if (value == 'SEARCH') {
						finalResult.push(myTmpArray[0]);
					}
				}
			}
			return finalResult;
		}
		catch(e) {
			dump("cardbookPreferences.getAllPrefIds error : " + e + "\n");
		}
	},

	getAllPrefIds: function () {
		try {
			let count = {};
			let finalResult = [];
			let result = Services.prefs.getChildList(this.prefCardBookData, count);
			for (let i = 0; i < result.length; i++) {
				result[i] = result[i].replace(this.prefCardBookData,"");
				var myTmpArray = result[i].split('.');
				if (myTmpArray[1] == 'id') {
					finalResult.push(myTmpArray[0]);
				}
			}
			return finalResult;
		}
		catch(e) {
			dump("cardbookPreferences.getAllPrefIds error : " + e + "\n");
		}
	},

	getAllRestrictions: function () {
		try {
			let count = {};
			let finalResult = [];
			let result = Services.prefs.getChildList(this.prefCardBookAccountRestrictions, count);
			for (let i = 0; i < result.length; i++) {
				finalResult.push(this.getStringPref(result[i]).split("::"));
			}
			return finalResult;
		}
		catch(e) {
			return [];
		}
	},

	delRestrictions: function (aRestrictionId) {
		try {
			if (aRestrictionId) {
				Services.prefs.deleteBranch(this.prefCardBookAccountRestrictions + aRestrictionId);
			} else {
				Services.prefs.deleteBranch(this.prefCardBookAccountRestrictions);
			}
		}
		catch(e) {
			dump("cardbookPreferences.delRestrictions : failed to delete" + this.prefCardBookAccountRestrictions + "\n" + e + "\n");
		}
	},

	setRestriction: function (aRestrictionId, aRestrictionValue) {
		try {
			this.setStringPref(this.prefCardBookAccountRestrictions + aRestrictionId, aRestrictionValue);
		}
		catch(e) {
			dump("cardbookPreferences.setRestriction : failed to set" + this.prefCardBookAccountRestrictions + aRestrictionId + "\n" + e + "\n");
		}
	},

	getAllVCards: function () {
		try {
			let count = {};
			let finalResult = [];
			let result = Services.prefs.getChildList(this.prefCardBookAccountVCards, count);
			for (let i = 0; i < result.length; i++) {
				finalResult.push(this.getStringPref(result[i]).split("::"));
			}
			return finalResult;
		}
		catch(e) {
			return [];
		}
	},

	delVCards: function (aVCardId) {
		try {
			if (aVCardId) {
				Services.prefs.deleteBranch(this.prefCardBookAccountVCards + aVCardId);
			} else {
				Services.prefs.deleteBranch(this.prefCardBookAccountVCards);
			}
		}
		catch(e) {
			dump("cardbookPreferences.delVCards : failed to delete" + this.prefCardBookAccountVCards + "\n" + e + "\n");
		}
	},

	setVCard: function (aVCardId, aVCardValue) {
		try {
			this.setStringPref(this.prefCardBookAccountVCards + aVCardId, aVCardValue);
		}
		catch(e) {
			dump("cardbookPreferences.setVCard : failed to set" + this.prefCardBookAccountVCards + aVCardId + "\n" + e + "\n");
		}
	},

	getAllEmailsCollections: function () {
		try {
			let count = {};
			let finalResult = [];
			let result = Services.prefs.getChildList(this.prefCardBookEmailsCollection, count);
			for (let i = 0; i < result.length; i++) {
				finalResult.push(this.getStringPref(result[i]).split("::"));
			}
			return finalResult;
		}
		catch(e) {
			return [];
		}
	},

	delEmailsCollection: function (aRestrictionId) {
		try {
			if (aRestrictionId) {
				Services.prefs.deleteBranch(this.prefCardBookEmailsCollection + aRestrictionId);
			} else {
				Services.prefs.deleteBranch(this.prefCardBookEmailsCollection);
			}
		}
		catch(e) {
			dump("cardbookPreferences.delEmailsCollection : failed to delete" + this.prefCardBookEmailsCollection + "\n" + e + "\n");
		}
	},

	setEmailsCollection: function (aRestrictionId, aRestrictionValue) {
		try {
			this.setStringPref(this.prefCardBookEmailsCollection + aRestrictionId, aRestrictionValue);
		}
		catch(e) {
			dump("cardbookPreferences.setEmailsCollection : failed to set" + this.prefCardBookEmailsCollection + aRestrictionId + "\n" + e + "\n");
		}
	},

	getAllIMPPs: function () {
		try {
			var count = {};
			var finalResult = [];
			var finalResult1 = [];
			var result = Services.prefs.getChildList(this.prefCardBookIMPPs, count);
			for (let i = 0; i < result.length; i++) {
				var prefName = result[i].replace(this.prefCardBookIMPPs, "");
				finalResult.push(this.getIMPPs(prefName));
			}
			finalResult = this._arrayUnique(finalResult);
			for (let i = 0; i < finalResult.length; i++) {
				var tmpArray = finalResult[i].split(":");
				finalResult1.push([tmpArray[0], tmpArray[1], tmpArray[2], i]);
			}
			return finalResult1;
		}
		catch(e) {
			dump("cardbookPreferences.getAllIMPPs error : " + e + "\n");
		}
	},

	getIMPPs: function (prefName) {
		try {
			let value = this.getStringPref(this.prefCardBookIMPPs + prefName);
			return value;
		}
		catch(e) {
			dump("cardbookPreferences.getIMPPs : failed to get" + this.prefCardBookIMPPs + prefName + "\n" + e + "\n");
		}
	},

	setIMPPs: function (prefName, value) {
		try {
			this.setStringPref(this.prefCardBookIMPPs + prefName, value);
		}
		catch(e) {
			dump("cardbookPreferences.setIMPPs : failed to set" + this.prefCardBookIMPPs + prefName + "\n" + e + "\n");
		}
	},

	delIMPPs: function () {
		try {
			Services.prefs.deleteBranch(this.prefCardBookIMPPs);
		}
		catch(e) {
			dump("cardbookPreferences.delIMPPs : failed to delete" + this.prefCardBookIMPPs + "\n" + e + "\n");
		}
	},

	getCustomFields: function (prefName) {
		try {
			let value = this.getStringPref(this.prefCardBookCustomFields + prefName);
			return value;
		}
		catch(e) {
			dump("cardbookPreferences.getCustomFields : failed to get" + this.prefCardBookCustomFields + prefName + "\n" + e + "\n");
		}
	},

	setCustomFields: function (aType, prefName, value) {
		try {
			this.setStringPref(this.prefCardBookCustomFields + aType + "." + prefName, value);
		}
		catch(e) {
			dump("cardbookPreferences.setCustomFields : failed to set" + this.prefCardBookCustomFields + aType + "." + prefName + "\n" + e + "\n");
		}
	},

	delCustomFields: function (aType) {
		try {
			if (aType) {
				Services.prefs.deleteBranch(this.prefCardBookCustomFields + aType);
			} else {
				Services.prefs.deleteBranch(this.prefCardBookCustomFields);
			}
		}
		catch(e) {
			dump("cardbookPreferences.delCustomFields : failed to delete" + this.prefCardBookCustomFields + aType + "\n" + e + "\n");
		}
	},

	getTels: function (prefName) {
		try {
			let value = this.getStringPref(this.prefCardBookTels + prefName);
			return value;
		}
		catch(e) {
			dump("cardbookPreferences.getTels : failed to get" + this.prefCardBookTels + prefName + "\n" + e + "\n");
		}
	},

	setTels: function (prefName, value) {
		try {
			this.setStringPref(this.prefCardBookTels + prefName, value);
		}
		catch(e) {
			dump("cardbookPreferences.setTels : failed to set" + this.prefCardBookTels + prefName + "\n" + e + "\n");
		}
	},

	delTels: function () {
		try {
			Services.prefs.deleteBranch(this.prefCardBookTels);
		}
		catch(e) {
			dump("cardbookPreferences.delTels : failed to delete" + this.prefCardBookTels + "\n" + e + "\n");
		}
	},

	getPrefValueLabel: function () {
		let prefValueLabel = this.getStringPref(this.prefCardBookRoot + "preferenceValueLabel");
		if (prefValueLabel) {
			return prefValueLabel;
		} else {
			return cardbookRepository.extension.localeData.localizeMessage("prefValueLabel");
		}
	},

	getId: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "id");
	},

	setId: function (aDirPrefId, id) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "id", id);
	},

	getName: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "name");
	},

	setName: function (aDirPrefId, name) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "name", name);
	},

	getUrl: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "url");
	},

	setUrl: function (aDirPrefId, url) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "url", url);
	},

	getUser: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "user");
	},

	setUser: function (aDirPrefId, user) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "user", user);
	},

	getType: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "type");
	},

	setType: function (aDirPrefId, type) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "type", type);
	},

	getNode: function (aDirPrefId) {
		let node = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "node");
		if (node) {
			return node;
		} else {
			return "categories";
		}
	},

	setNode: function (aDirPrefId, type) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "node", type);
	},

	getEnabled: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "enabled", true);
	},

	setEnabled: function (aDirPrefId, enabled) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "enabled", enabled);
	},

	getReadOnly: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "readonly", false);
	},

	setReadOnly: function (aDirPrefId, readonly) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "readonly", readonly);
	},

	getExpanded: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "expanded", true);
	},

	setExpanded: function (aDirPrefId, expanded) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "expanded", expanded);
	},

   getColor: function (aDirPrefId) {
		let color = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "color");
		if (color) {
			return color;
		} else {
			return "#A8C2E1";
		}
	},

	setColor: function (aDirPrefId, color) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "color", color);
	},

	getDBCached: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "DBcached", false);
	},

	setDBCached: function (aDirPrefId, DBcached) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "DBcached", DBcached);
	},

	getVCardVersion: function (aDirPrefId) {
		let vCard = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "vCard");
		if (vCard) {
			return vCard;
		} else {
			return "3.0";
		}
	},

	setVCardVersion: function (aDirPrefId, aVCard) {
		if (aVCard) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "vCard", aVCard);
		}
	},

	getLastSearch: function (aDirPrefId) {
		return this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "lastSearch");
	},

	setLastSearch: function (aDirPrefId, name) {
		this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "lastSearch", name);
	},

	getUrnuuid: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "urnuuid", false);
	},

	setUrnuuid: function (aDirPrefId, aUrnuuid) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "urnuuid", aUrnuuid);
	},

	getAutoSyncEnabled: function (aDirPrefId) {
		return this.getBoolPref(this.prefCardBookData + aDirPrefId + "." + "autoSyncEnabled", true);
	},

	setAutoSyncEnabled: function (aDirPrefId, aAutoSyncEnabled) {
		this.setBoolPref(this.prefCardBookData + aDirPrefId + "." + "autoSyncEnabled", aAutoSyncEnabled);
	},

	getAutoSyncInterval: function (aDirPrefId) {
		let autoSyncInterval = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "autoSyncInterval");
		if (autoSyncInterval) {
			return autoSyncInterval;
		} else {
			return "60";
		}
	},

	setAutoSyncInterval: function (aDirPrefId, aAutoSyncInterval) {
		if (aAutoSyncInterval) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "autoSyncInterval", aAutoSyncInterval);
		}
	},

	getFnFormula: function (aDirPrefId) {
		if (aDirPrefId) {
			let fnFormula = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "fnFormula");
			if (fnFormula) {
				return fnFormula;
			} else {
				return cardbookRepository.defaultFnFormula;
			}
		} else {
			return cardbookRepository.defaultFnFormula;
		}
	},

	setFnFormula: function (aDirPrefId, aFnFormula) {
		if (aFnFormula) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "fnFormula", aFnFormula);
		}
	},

	getSortDirection: function (aDirPrefId) {
		if (aDirPrefId) {
			let sortDirection = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "sortDirection");
			if (sortDirection) {
				return sortDirection;
			} else {
				return cardbookRepository.defaultSortDirection;
			}
		} else {
			return cardbookRepository.defaultSortDirection;
		}
	},

	setSortDirection: function (aDirPrefId, aSortDirection) {
		if (aSortDirection) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "sortDirection", aSortDirection);
		}
	},

	getSortResource: function (aDirPrefId) {
		if (aDirPrefId) {
			let sortResource = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "sortResource");
			if (sortResource) {
				return sortResource;
			} else {
				return cardbookRepository.defaultSortResource;
			}
		} else {
			return cardbookRepository.defaultSortResource;
		}
	},

	setSortResource: function (aDirPrefId, aSortResource) {
		if (aSortResource) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "sortResource", aSortResource);
		}
	},

	getDisplayedColumns: function (aDirPrefId) {
		if (aDirPrefId) {
			let displayedColumns = this.getStringPref(this.prefCardBookData + aDirPrefId + "." + "displayedColumns");
			if (displayedColumns) {
				return displayedColumns;
			} else {
				return cardbookRepository.defaultDisplayedColumns;
			}
		} else {
			return cardbookRepository.defaultDisplayedColumns;
		}
	},

	setDisplayedColumns: function (aDirPrefId, aDisplayedColumns) {
		if (aDisplayedColumns) {
			this.setStringPref(this.prefCardBookData + aDirPrefId + "." + "displayedColumns", aDisplayedColumns);
		}
	},

	getMaxModifsPushed: function () {
		let maxModifsPushed = this.getStringPref(this.prefCardBookRoot + "maxModifsPushed");
		if (maxModifsPushed) {
			return maxModifsPushed;
		} else {
			return "60";
		}
	},

	delBranch: function (aDirPrefId) {
		try {
			Services.prefs.deleteBranch(this.prefCardBookData + aDirPrefId);
		}
		catch(e) {
			dump("cardbookPreferences.delBranch : failed to delete" + this.prefCardBookData + aDirPrefId + "\n" + e + "\n");
		}
	}
};
