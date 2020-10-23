/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["LDAPAbCardFormatter"];

var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var parser = MailServices.headerParser;

var LDAPAbCardFormatter = {
	nameFormatFromBook: function nameFormatFromBook(aBook) {
		return this._getStringValueFromBook("autoComplete.nameFormat",
											aBook,
											"[cn]");
	},

	addressFormatFromBook: function addressFormatFromBook(aBook) {
		return this._getStringValueFromBook("autoComplete.addressFormat",
											aBook,
											"{mail}");
	},

	commentFormatFromBook: function commentFormatFromBook(aBook) {
		return this._getStringValueFromBook("autoComplete.commentFormat",
											aBook,
											"[o]");
	},

	requiredPropertiesFromBook: function requiredAttributesFromBook(aBook) {
		var nameFormat = this.nameFormatFromBook(aBook);
		var addressFormat = this.addressFormatFromBook(aBook);
		var commentFormat = this.commentFormatFromBook(aBook);
		var attrNames = this._LDAPAttrNamesFromFormat(nameFormat)
							.concat(this._LDAPAttrNamesFromFormat(addressFormat))
							.concat(this._LDAPAttrNamesFromFormat(commentFormat));
		var properties = [];
		attrNames.forEach(function(aAttrName) {
			let property = this._propertyNameFromLDAPAttrName(aAttrName, aBook);
			if (property) {
				properties.push(property);
			}
		}, this);
		return properties;
	},

	_LDAPAttrNamesFromFormat: function LDAPAttrNamesFromFormat(aFormat) {
		var placeHolders = aFormat.match(/\[[^\]]+\]|\{[^\}]+\}/g);
		var attributes = Array.from(placeHolders).map(function(aPlaceHolder) {
				return aPlaceHolder.slice(1, -1);
		});
		return attributes;
	},

	_propertyNameFromLDAPAttrName: function propertyNameFromLDAPAttrName(aAttrName, aBook) {
		var base = "ldap_2.servers.default.attrmap.";
		var foundChildren = {};
		var possibleChildren = [];
		var actualChildren = [];
		Services.prefs.getChildList(base, {}).sort().forEach(function(aPrefstring) {
			var name = aPrefstring.replace(base, '');
			if (name.charAt(0) == '.') {
				name = name.substring(1);
			}
			if (name.indexOf('.') < 0) {
				if (!(aPrefstring in foundChildren)) {
					actualChildren.push(aPrefstring);
					foundChildren[aPrefstring] = true;
				}
			} else {
				let possibleChildKey = base + name.split('.')[0];
				if (possibleChildKey && !(possibleChildKey in foundChildren)) {
					possibleChildren.push(possibleChildKey);
					foundChildren[possibleChildKey] = true;
				}
			}
		});
		var keys = possibleChildren.concat(actualChildren).sort();
		for (let i = 0, maxi = keys.length; i < maxi; i++) {
			let key = keys[i];
			let property = key.replace(base, "");
			let ldapAttrNames = this._getStringValueFromBook("attrmap." + property, aBook).trim().split(/\s*,\s*/);
			if (ldapAttrNames.indexOf(aAttrName) > -1) {
				return property;
			}
		}
		return null;
	},

	valueFromCard: function labelFromCard(aCard, aBook, aDefaultValue) {
		try {
			var nameFormat = this.nameFormatFromBook(aBook);
			var name = this._resolveFormat(nameFormat, aCard, aBook);
			var addressFormat = this.addressFormatFromBook(aBook);
			var address = this._resolveFormat(addressFormat, aCard, aBook);
			if (address) {
				return parser.makeMailboxObject(name, address).toString();
			}
		} catch(error) {
			Components.utils.reportError(error);
		}
		return aDefaultValue;
	},

	commentFromCard: function commentFromCard(aCard, aBook, aDefaultValue) {
		try {
			var format = this.commentFormatFromBook(aBook);
			return this._resolveFormat(format, aCard, aBook, aDefaultValue);
		} catch(error) {
			Components.utils.reportError(error);
		}
		return aDefaultValue;
	},

	_resolveFormat: function resolveFormat(aFormat, aCard, aBook, aDefaultValue) {
		try {
			var formatted = aFormat;

			formatted = formatted.replace(/\{mail\}/g, aCard.primaryEmail);

			// test var placeHolders = aFormat.match(/\[[^\]]+\]/g);
			// test if (placeHolders) {
			// test 	Array.forEach(placeHolders, function(aPlaceHolder) {
			// test 		var matcher = new RegExp(aPlaceHolder.replace(/([\[\]])/g, '\\$1'));
			// test 		var attrName = aPlaceHolder.slice(1, -1);
			// test 		var value = this._getCardPropertyFromLDAPAttrName(attrName, aCard, aBook);
			// test 		formatted = formatted.replace(matcher, value);
			// test 	}, this);
			// test }
			for (let placeHolder of placeHolders) {
				var matcher = new RegExp(placeHolder.replace(/([\[\]])/g, '\\$1'));
				var attrName = placeHolder.slice(1, -1);
				var value = this._getCardPropertyFromLDAPAttrName(attrName, aCard, aBook);
				formatted = formatted.replace(matcher, value);
			}
			return formatted;
		} catch(error) {
			Components.utils.reportError(error);
		}
		return aDefaultValue;
	},

	_getCardPropertyFromLDAPAttrName: function getCardPropertyFromLDAPAttrName(aAttrName, aCard, aBook) {
		try {
			var properties = aCard.properties;
			while (properties.hasMoreElements()) {
				let property = properties.getNext().QueryInterface(Components.interfaces.nsIProperty);
				let ldapAttrNames = this._getStringValueFromBook("attrmap." + property.name, aBook).trim().split(/\s*,\s*/);
				if (ldapAttrNames.indexOf(aAttrName) > -1) {
					return property.value;
				}
			}
		} catch(error) {
			Components.utils.reportError(error);
		}
		return "";
	},

	_getStringValueFromBook: function getStringValueFromBook(aKey, aBook, aDefaultValue) {
		var globalValue;
		try {
			globalValue = Services.prefs.getCharPref("ldap_2.servers.default." + aKey);
		} catch(error) {}
		var utf8value = aBook.getStringValue(aKey, globalValue || aDefaultValue || "");
		var unicodeValue = decodeURIComponent(escape(utf8value));
		return unicodeValue;
	}
};
