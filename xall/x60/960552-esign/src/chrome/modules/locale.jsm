"use strict";

var EXPORTED_SYMBOLS = ["EsignLocale"];

const Cc = Components.classes;
const Ci = Components.interfaces;

var esignStringBundle = null;

const LOCALE_SVC_CONTRACTID = "@mozilla.org/intl/nslocaleservice;1";

const EsignLocale = {
	get: function() {
		return Cc[LOCALE_SVC_CONTRACTID].getService(Ci.nsILocaleService).getApplicationLocale();
	},

	// retrieves a localized string from the esign.properties stringbundle
	getString: function(aStr, subPhrases) {
		if (!esignStringBundle) {
			try {
				var strBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService();
				strBundleService = strBundleService.QueryInterface(Ci.nsIStringBundleService);
				esignStringBundle = strBundleService.createBundle("chrome://esign/locale/esign.properties");
			}
			catch (ex) {
			}
		}

		if (esignStringBundle) {
			try {
				if (subPhrases) {
					if (typeof(subPhrases) == "string") {
						return esignStringBundle.formatStringFromName(aStr, [subPhrases], 1);
					}
					else {
						return esignStringBundle.formatStringFromName(aStr, subPhrases, subPhrases.length);
					}
				}
				else {
					return esignStringBundle.GetStringFromName(aStr);
				}
			}
			catch (ex) {
			}
		}
		return aStr;
	}
};
