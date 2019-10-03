"use strict";

/**
 * Работа с настройками Thunderbird.
 */

const EXPORTED_SYMBOLS = ["EsignPref"];

const Cc = Components.classes;
const Ci = Components.interfaces;

const ESIGN_PREFS_ROOT = "extensions.esign.";

const p = {
	service: null,
	branch: null,
	root: null
};

/**
 * Инициализация настроек
 */
function initPrefService() {
	try {
		p.service = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
		p.root = p.service.getBranch(null);
		p.branch = p.service.getBranch(ESIGN_PREFS_ROOT);
	}
	catch (ex) {
	}
}

/**
 * Класс для работы с настройками
 */
const EsignPref = {

	getPrefRoot: function() {
		if (!p.branch) {
			initPrefService();
		}

		return p.root;
	},

	getPrefBranch: function() {
		if (!p.branch) {
			initPrefService();
		}

		return p.branch;
	},

	getPref: function(prefName) {
		if (!p.branch) {
			initPrefService();
		}

		var prefValue = null;

		try {
			var prefType = p.branch.getPrefType(prefName);

			// Get pref value
			switch (prefType) {
				case p.branch.PREF_BOOL:
					prefValue = p.branch.getBoolPref(prefName);
					break;
				case p.branch.PREF_INT:
					prefValue = p.branch.getIntPref(prefName);
					break;
				case p.branch.PREF_STRING:
					prefValue = p.branch.getCharPref(prefName);
					break;
				default:
					prefValue = undefined;
					break;
			}
		}
		catch (ex) {
		}

		return prefValue;
	},

	/**
	 * Установка пользовательских настроек.
	 *
	 * @param  String  prefName  Машинное имя.
	 * @param  any     value     Значение. Допустимые типы: Boolean OR Integer OR String.
	 *
	 * @return Boolean Успешно ли установлено значение?
	 */
	setPref: function(prefName, value) {
		if (!p.branch) {
			initPrefService();
		}

		var prefType;
		prefType = p.branch.getPrefType(prefName);
		if (prefType === 0) {
			switch (typeof value) {
				case "boolean":
					prefType = p.branch.PREF_BOOL;
					break;
				case "number":
					prefType = p.branch.PREF_INT;
					break;
				case "string":
					prefType = p.branch.PREF_STRING;
					break;
				default:
					prefType = 0;
					break;
			}
		}
		var retVal = false;

		switch (prefType) {
			case p.branch.PREF_BOOL:
				p.branch.setBoolPref(prefName, value);
				retVal = true;
				break;

			case p.branch.PREF_INT:
				p.branch.setIntPref(prefName, value);
				retVal = true;
				break;

			case p.branch.PREF_STRING:
				p.branch.setCharPref(prefName, value);
				retVal = true;
				break;

			default:
				break;
		}

		return retVal;
	},

	/**
	 * Сохранение файла настроек Mozilla (prefs.js)
	 */
	savePrefs: function() {
		try {
			p.service.savePrefFile(null);
		}
		catch (ex) {}
	},

	/**
	 * Компиляция всех настроек в объект
	 */
	getAllPrefs: function() {
		var retObj = {
			value: 0
		};
		var branch = this.getPrefBranch();
		var allPrefs = branch.getChildList("", retObj);
		var prefObj = {};
		var nsIPB = Ci.nsIPrefBranch;

		for (var q in allPrefs) {
			var name = allPrefs[q];

			/*
			 * agentPath is system-depend, configuredVersion build-depend and
			 * advancedUser must be set in order to save the profile.
			 */
			if (name == "agentPath" || name == "configuredVersion") {
				continue;
			}

			switch (branch.getPrefType(name)) {
				case nsIPB.PREF_STRING:
					prefObj[name] = branch.getCharPref(name);
					break;
				case nsIPB.PREF_INT:
					prefObj[name] = branch.getIntPref(name);
					break;
				case nsIPB.PREF_BOOL:
					prefObj[name] = branch.getBoolPref(name);
					break;
			}
		}

		return prefObj;
	}
};
