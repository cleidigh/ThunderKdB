/*
 *	Original code thanks to Axel Grude: https://addons.mozilla.org/en-us/thunderbird/addon/quickfolders-tabbed-folders/
 *
 * */
"use strict";

let EXPORTED_SYMBOLS = ["miczLightningColorRemindersPrefsUtils"];

var miczLightningColorRemindersPrefsUtils = {
	service: Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),
	pref_base:'extensions.LightningColorReminders.',

	/*get isDebug() {
		return this.getBoolPref_CR("debug");
	},*/

	get colorThickness() {
		return this.getIntPref_CR('Thickness');
	},

	get colorPosition() {
		return this.getCharPref_CR('Position');
	},

	existsCharPref: function existsCharPref(pref) {
		try {
			if(this.service.prefHasUserValue(pref))
				return true;
			if (this.service.getCharPref(pref))
				return true;
		}
		catch (e) {return false; }
		return false;
	},

	existsBoolPref: function existsBoolPref(pref) {
		try {
			if(this.service.prefHasUserValue(pref))
				return true;
			if (this.service.getBoolPref(pref))
				return true;
		}
		catch (e) {return false; }
		return false;
	},

	getBoolPref_CR: function getBoolPref_CR(p) {
	  let ans;
	  try {
	    ans = this.service.getBoolPref(this.pref_base + p);
		}
		catch(ex) {
		  //QuickFolders.Util.logException("getBoolPref("  + p +") failed\n", ex);
		  throw(ex);
		}
		return ans;
	},

	getBoolPref: function getBoolPref(p) {
	  let ans;
	  try {
	    ans = this.service.getBoolPref(p);
		}
		catch(ex) {
		  //QuickFolders.Util.logException("getBoolPref("  + p +") failed\n", ex);
		  throw(ex);
		}
		return ans;
	},

	setBoolPref_CR: function setBoolPref_CR(p, v) {
		return this.service.setBoolPref(this.pref_base + p, v);
	},

	setBoolPref: function setBoolPref(p, v) {
		return this.service.setBoolPref(p, v);
	},

	getCharPref_CR: function getCharPref_CR(p) {
		return this.service.getCharPref(this.pref_base + p);
	},

	getCharPref: function getCharPref(p) {
		return this.service.getCharPref(p);
	},

	setCharPref_CR: function setCharPref_CR(p, v) {
		return this.service.setCharPref(this.pref_base + p, v);
	},

	setCharPref: function setCharPref(p, v) {
		return this.service.setCharPref(p, v);
	},

	getIntPref_CR: function getIntPref_CR(p) {
		return this.service.getIntPref(this.pref_base + p);
	},

	getIntPref: function getIntPref(p) {
		return this.service.getIntPref(p);
	},

	setIntPref_CR: function setIntPref_CR(p, v) {
		return this.service.setIntPref(this.pref_base + p, v);
	},

	setIntPref: function setIntPref(p, v) {
		return this.service.setIntPref(p, v);
	},

}