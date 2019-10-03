var EXPORTED_SYMBOLS = [ 'preference' ];

Components.utils.import("resource://redthunderminebird/common.js");

var Preference = function() {
	logger.debug('Preference constractor');

	var klass = Cc["@mozilla.org/preferences-service;1"];
	var service = klass.getService(Ci.nsIPrefService);
	var suffix = DEBUG ? '_develop' : '';
	var branch = service.getBranch("extensions.redthunderminebird" + suffix + ".");

	this.getInt = function(key) {
		logger.debug('getInt:', key);
		return branch.getIntPref(key);
	};

	this.setInt = function(key, value) {
		logger.debug('setInt:', key);
		return branch.setIntPref(key, value);
	};

	this.getBool = function(key) {
		logger.debug('getBool:', key);
		return branch.getBoolPref(key);
	};

	this.setBool = function(key, value) {
		logger.debug('setBool:', key);
		return branch.setBoolPref(key, value);
	};

	this.getString = function(key) {
		logger.debug('getString:', key);
		return decodeURI(branch.getCharPref(key));
	};

	this.setString = function(key, value) {
		logger.debug('setString:', key);
		return branch.setCharPref(key, encodeURI(value));
	};

	this.getObject = function(key) {
		logger.debug('getObject:', key);
		return JSON.parse(this.getString(key));
	};

	this.setObject = function(key, value) {
		logger.debug('setObject:', key);
		return this.setString(key, JSON.stringify(value));
	};

	this.reset = function(key) {
		logger.debug('reset:', key);
		if (branch.prefHasUserValue(key))
			branch.clearUserPref(key);
	};
};

var preference = new Preference();
