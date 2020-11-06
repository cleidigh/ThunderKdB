var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ["cardbookPasswordManager"];
var cardbookPasswordManager = {

	oauthPrefix: "chrome://cardbook/oauth",

	getRootUrl: function (aUrl) {
		try {
			var urlArray1 = aUrl.split("://");
			var urlArray2 = urlArray1[1].split("/");
			if (urlArray1[0] != "http" && urlArray1[0] != "https") {
				return "";
			}
			return urlArray1[0] + "://" + urlArray2[0];
		}
		catch (e) {
			return "";
		}
	},

	getNotNullPassword: function (aUsername, aPrefId, aUrl) {
		var myUrl = cardbookRepository.cardbookPreferences.getUrl(aPrefId);
		if (myUrl == "") {
			myUrl = aUrl;
		}
		var result = cardbookPasswordManager.getPassword(aUsername, myUrl);
		if (result == "") {
			var myTitle = cardbookRepository.extension.localeData.localizeMessage("wdw_passwordMissingTitle");
			var commonStrBundle = Services.strings.createBundle("chrome://global/locale/commonDialogs.properties");
			var myText = commonStrBundle.formatStringFromName("EnterPasswordFor", [aUsername, myUrl], 2);
			var myPassword = {value: ""};
			var pwdMgrBundle = Services.strings.createBundle("chrome://passwordmgr/locale/passwordmgr.properties");
			var myRememberText = pwdMgrBundle.GetStringFromName("rememberPassword");
			var check = {value: false};
			var prompter = Services.ww.getNewPrompter(null);
			if (prompter.promptPassword(myTitle, myText, myPassword, myRememberText, check)) {
				cardbookPasswordManager.rememberPassword(aUsername, myUrl, myPassword.value, check.value);
				return myPassword.value;
			}
		}
		return result;
	},

	getChangedPassword: function (aUsername, aPrefId) {
		var myUrl = cardbookRepository.cardbookPreferences.getUrl(aPrefId);
		var myTitle = cardbookRepository.extension.localeData.localizeMessage("wdw_passwordWrongTitle");
		var commonStrBundle = Services.strings.createBundle("chrome://global/locale/commonDialogs.properties");
		var myText = commonStrBundle.formatStringFromName("EnterPasswordFor", [aUsername, myUrl], 2);
		var myPassword = {value: ""};
		var pwdMgrBundle = Services.strings.createBundle("chrome://passwordmgr/locale/passwordmgr.properties");
		var myRememberText = pwdMgrBundle.GetStringFromName("rememberPassword");
		var check = {value: false};
		var prompter = Services.ww.getNewPrompter(null);
		if (prompter.promptPassword(myTitle, myText, myPassword, myRememberText, check)) {
			cardbookPasswordManager.rememberPassword(aUsername, myUrl, myPassword.value, check.value);
			return myPassword.value;
		}
		return "";
	},

	getPassword: function (aUsername, aUrl) {
		var myRootUrl = cardbookPasswordManager.getRootUrl(aUrl);
		if (cardbookRepository.logins[aUsername] && cardbookRepository.logins[aUsername][myRootUrl]) {
			return cardbookRepository.logins[aUsername][myRootUrl];
		} else {
			if (aUrl.startsWith(cardbookRepository.cardbookOAuthData.GOOGLE.ROOT_API) || aUrl.startsWith(cardbookRepository.cardbookOAuthData.YAHOO.ROOT_API)) {
				var logins = Services.logins.findLogins(this.oauthPrefix, "User Refresh Token", null);
			} else {
				var logins = Services.logins.findLogins(cardbookPasswordManager.getRootUrl(aUrl), "User login", null);
			}
			for (var i = 0; i < logins.length; i++) {
				if (logins[i].username == aUsername) {
					return logins[i].password;
				}
			}
		}
		return "";
	},

	addPassword: function (aUsername, aUrl, aPassword) {
		var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
		if (aUrl) {
			var login_info = new nsLoginInfo(cardbookPasswordManager.getRootUrl(aUrl), "User login", null, aUsername, aPassword, "", "");
		} else {
			// google and yahoo cases
			var login_info = new nsLoginInfo(this.oauthPrefix, "User Refresh Token", null, aUsername, aPassword, "", "");
		}
		Services.logins.addLogin(login_info);
		return true;
	},

	removePassword: function (aUsername, aUrl) {
		if (aUrl) {
			var logins = Services.logins.findLogins(cardbookPasswordManager.getRootUrl(aUrl), "User login", null);
		} else {
			// google and yahoo cases
			var logins = Services.logins.findLogins(this.oauthPrefix, "User Refresh Token", null);
		}
		for (var i = 0; i < logins.length; i++) {
			if (logins[i].username == aUsername) {
				Services.logins.removeLogin(logins[i]);
				return true;
			}
		}
		return false;
	},

	rememberPassword: function (aUsername, aUrl, aPassword, aSave) {
		if (aSave) {
			cardbookPasswordManager.removePassword(aUsername, aUrl);
			cardbookPasswordManager.addPassword(aUsername, aUrl, aPassword);
		} else {
			cardbookRepository.logins[aUsername] = {};
			cardbookRepository.logins[aUsername][cardbookPasswordManager.getRootUrl(aUrl)] = aPassword;
		}
	}

};
