// JavaScript

"use strict";


const Cc = Components.classes;
const Ci = Components.interfaces;
// const Cu = Components.utils;
const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.grammarchecker.");


var oDialogControl = {
	load: function () {
		try {
			// center window
			document.getElementById('grammalecte-spelloptions-window').centerWindowOnScreen();
			// Graphspell dictionaries
			document.getElementById('personal_dic').checked = prefs.getBoolPref('bPersonalDictionary');
			// Hunspell dictionaries
			//document.getElementById('fr-FR-modern').checked = prefs.getBoolPref('bDictModern');
			//document.getElementById('fr-FR-classic').checked = prefs.getBoolPref('bDictClassic');
			//document.getElementById('fr-FR-reform').checked = prefs.getBoolPref('bDictReform');
			//document.getElementById('fr-FR-classic-reform').checked = prefs.getBoolPref('bDictClassicReform');
		}
		catch (e) {
			console.error(e);
			// Cu.reportError(e);
		}
	},
	setDictionaries: function () {
		oSpellControl.init();
		this._setGraphspellDictionaries();
		this._setHunspellDictionary('fr-FR-modern', 'bDictModern');
		this._setHunspellDictionary('fr-FR-classic', 'bDictClassic');
		this._setHunspellDictionary('fr-FR-reform', 'bDictReform');
		this._setHunspellDictionary('fr-FR-classic-reform', 'bDictClassicReform');
	},
	_setHunspellDictionary: function (sDicName, sOptName) {
		try {
			let bActivate = document.getElementById(sDicName).checked;
			oSpellControl.setExtensionDictFolder(sDicName, bActivate);
			prefs.setBoolPref(sOptName, bActivate);
		}
		catch (e) {
			console.error(e);
			// Cu.reportError(e);
		}
	},
	_setGraphspellDictionaries: function () {
		let bActivate = document.getElementById('personal_dic').checked;
		prefs.setBoolPref("bPersonalDictionary", bActivate);
	}
};
