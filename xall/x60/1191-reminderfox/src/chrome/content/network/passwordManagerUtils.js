if(!reminderfox)
	var reminderfox = {};
if(!reminderfox.network)
	reminderfox.network = {};
if(!reminderfox.network.password)
	reminderfox.network.password = {};

var REMINDERFOX_PASSWORD_CID = "@mozilla.org/passwordmanager;1";

var gReminderFox_PasswordManager;
var gReminderFox_PasswordManagerInternal;

function reminderFox_getPasswordManager() {
	if(!gReminderFox_PasswordManager) {
		try {
			gReminderFox_PasswordManager = Components.classes[REMINDERFOX_PASSWORD_CID].getService();
			gReminderFox_PasswordManager = gReminderFox_PasswordManager.QueryInterface(Components.interfaces.nsIPasswordManager);
		} catch (e) {
			reminderfox.core.logMessageLevel("RmFX   getPasswordManager() failed: " + e.name + " -- " + e.message, reminderfox.consts.LOG_LEVEL_INFO);

		}
	}
	return gReminderFox_PasswordManager;
}

function reminderFox_getPasswordManagerInternal() {
	try {
		gReminderFox_PasswordManagerInternal = Components.classes[REMINDERFOX_PASSWORD_CID].getService();
		gReminderFox_PasswordManagerInternal = gReminderFox_PasswordManagerInternal.QueryInterface(Components.interfaces.nsIPasswordManagerInternal);
	} catch (e) {
		reminderfox.core.logMessageLevel("RmFX   getPasswordManagerInternal() failed: " + e.name + " -- " + e.message, reminderfox.consts.LOG_LEVEL_INFO);
	}

	return gReminderFox_PasswordManagerInternal;
}

function reminderFox_getPassword(loginData) {
	if(!loginData) {
		return null;
	}

	if("@mozilla.org/passwordmanager;1" in Components.classes) {
		var pmInternal = reminderFox_getPasswordManagerInternal();
		if(!pmInternal) {
			return null;
		}

		var host = {
			value : ''
		};
		var user = {
			value : ''
		};
		var password = {
			value : ''
		};

		try {
			pmInternal.findPasswordEntry(loginData.ljURL, '', '', host, user, password);
			loginData.username = user.value;
			loginData.password = password.value;
			return loginData;
		} catch(e) {
			reminderfox.core.logMessageLevel("RmFX  findPasswordEntry() failed: " + e.name + " -- " + e.message, reminderfox.consts.LOG_LEVEL_INFO);
		}


	} else if("@mozilla.org/login-manager;1" in Components.classes) {
		// Login Manager exists so this is Firefox 3
		// Login Manager code
		try {
			// Get Login Manager
			var myLoginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);

			// Find users for the given parameters
			// var logins = myLoginManager.findLogins({}, hostname, formSubmitURL, httprealm);

			// Find users for the given parameters
			if (loginData.httpRealm != null) {
				var logins = myLoginManager.findLogins({}, loginData.ljURL, null, loginData.httpRealm);
			} else {
				var logins = myLoginManager.findLogins({}, loginData.ljURL, "User login", null);
			}

			// Find user from returned array of nsILoginInfo objects
			for(var i = 0; i < logins.length; i++) {
				if(logins[i].username == loginData.username) {
					loginData.password = logins[i].password;
					return loginData;
				}
			}
		} catch(ex) {
			// This will only happen if there is no nsILoginManager component class
		}

	}
	return null;
}

function reminderFox_savePassword(loginData) {
	if(!loginData || !loginData.ljURL || !loginData.username)
		return false;

	if("@mozilla.org/passwordmanager;1" in Components.classes) {
		// Password Manager exists so this is not Firefox 3 (could be Firefox 2, Netscape, SeaMonkey, etc).
		// Password Manager code
		var pm = reminderFox_getPasswordManager();

		if(!pm)
			return false;

		try {
			pm.removeUser(loginData.ljURL, loginData.username);
		} catch(e) {
			reminderfox.core.logMessageLevel("RmFX  removeUser() failed: " + e.name + " -- " + e.message, reminderfox.consts.LOG_LEVEL_INFO);
		}

		if(loginData.savePassword) {
			try {
				pm.addUser(loginData.ljURL, loginData.username, loginData.password);
			} catch(e) {
				reminderfox.core.logMessageLevel("RmFX  addUser failed: " + e.name + " -- " + e.message, reminderfox.consts.LOG_LEVEL_INFO);
			}
			return true;
		}
	} else if("@mozilla.org/login-manager;1" in Components.classes) {
		// Login Manager exists so this is Firefox 3
		// Login Manager code

		// Get Login Manager
		var myLoginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);

		var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");

		// remove existing user
		// Find users for this extension
		var logins = myLoginManager.findLogins({}, loginData.ljURL, "User login", null);
		// Find user from returned array of nsILoginInfo objects
		for(var i = 0; i < logins.length; i++) {
			if(logins[i].username == loginData.username) {
				myLoginManager.removeLogin(logins[i]);
				break;
			}
		}
		if(loginData.savePassword) {
			if(loginData.password != null && loginData.password.length > 0) {// check: can't save null/empty password
				var login_info = new nsLoginInfo(loginData.ljURL, "User login", null, loginData.username, loginData.password, "", "");
				myLoginManager.addLogin(login_info);
			}
		}
	}

	return false;
}

function reminderFox_deleteAccount(loginData) {
	if(!loginData || !loginData.ljURL || !loginData.username)
		return false;

	try {
		// Get Login Manager
		var passwordManager = Components.classes["@mozilla.org/login-manager;1"].
				getService(Components.interfaces.nsILoginManager);

		// Find users for this extension
		var logins = passwordManager.findLogins({}, loginData.ljURL,  "User login" /*formSubmitURL*/, null /*httprealm*/);

		for (var i = 0; i < logins.length; i++) {
			if (logins[i].username == loginData.username) {
				passwordManager.removeLogin(logins[i]);
				break;
			}
		}
	}
	catch(ex) {
		// This will only happen if there is no nsILoginManager component class
	}
};