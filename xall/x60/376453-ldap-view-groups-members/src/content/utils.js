var LDAPGroupsUtils = {
	logIt: function (msg){
		//let tmpMsg = Array.join(arguments, " ");
		//Cu.reportError(tmpMsg);
	},

	getProxyForMainThread: function (obj, iface){
		var ThreadManager = Components.classes["@mozilla.org/thread-manager;1"]
								  .getService(Components.interfaces.nsIThreadManager);
		var ProxyObjectManager = Components.classes["@mozilla.org/xpcomproxy;1"]
									   .getService(Components.interfaces.nsIProxyObjectManager);
		var flags = Components.interfaces.nsIProxyObjectManager.FORCE_PROXY_CREATION | Components.interfaces.nsIProxyObjectManager.INVOKE_SYNC;
		return ProxyObjectManager.getProxyForObject(ThreadManager.mainThread, iface, obj, flags);
	},
	
	jsdump: function (str) {
		/* Components.classes['@mozilla.org/consoleservice;1']
			.getService(Components.interfaces.nsIConsoleService)
            .logStringMessage(str);*/
	},

	processPendingEvents: function () {
		var thread = Components.classes["@mozilla.org/thread-manager;1"]
							.getService(Components.interfaces.nsIThreadManager)
							.mainThread;
		var pendingEvents = thread.hasPendingEvents();
		while (pendingEvents) {
			thread.processNextEvent(true);
			pendingEvents = thread.hasPendingEvents();
		}
	},

	// Localization
	$S: function (msg, args){ //get localized message
		try {
				var STRS = Components.classes['@mozilla.org/intl/stringbundle;1']
						 .getService(Components.interfaces.nsIStringBundleService)
						 .createBundle('chrome://ldap-groups/locale/ldap-groups.properties');
				if (args) {
					args = Array.prototype.slice.call(arguments, 1);
					return STRS.formatStringFromName(msg,args,args.length);
				}
				return STRS.GetStringFromName(msg);
		} catch(e) {return msg;}
	},

	getPasswordForServer: function (serverUrl, login, force, realm) {
		var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		if ("@mozilla.org/login-manager;1" in Components.classes) {
			var passwordManager = Components.classes["@mozilla.org/login-manager;1"]
									.getService(Components.interfaces.nsILoginManager);
			// Authentication info
			username = {value:login};
			password = {value:''};
			check = {value:false};
			var oldLoginInfo;
			try {		
				// Find users for the given parameters
				var logins = passwordManager.findLogins({}, serverUrl, null, realm);			
				// Find user from returned array of nsILoginInfo objects
				var foundCredentials = false;
				for (var i = 0; i < logins.length; i++) {
					if (  (logins[i].username == username.value)
						|| 
							((logins[i].username == '') && (serverUrl.indexOf('ldap') > -1))
						) {
								password.value = logins[i].password;
								foundCredentials = true;
								oldLoginInfo = logins[i];
								break;
						}
				}
				if(foundCredentials & (!force)) {
					return {login:username.value, password:password.value};
				}
			} catch(e) {}
		
			// TODO labeliser dans les DTD!
			okorcancel = prompts.promptUsernameAndPassword(window, $S('authWindow.title'), 
							$S('authWindow.text', [serverUrl]), 
							username, 
							password, 
							$S('authWindow.save'), 
							check);
			if(! okorcancel) {
				return;
			}
			if(check.value) {
				var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                             Components.interfaces.nsILoginInfo,
                                             "init");	 
			
				var usernameValue = username.value;
				if(serverUrl.indexOf('ldap') != -1)
					usernameValue = '';
			
				var loginInfo = new nsLoginInfo(serverUrl, null, realm, usernameValue, password.value,"", "");
				try {		
					if(oldLoginInfo) {
					passwordManager.modifyLogin(oldLoginInfo, loginInfo);
					} else {
					passwordManager.addLogin(loginInfo);
					}
				} catch(e){}
			}	
		}
		return {login:username.value, password:password.value};
	},

	containsIgnoreCase: function (a,b) {
		var isIn = false;
		for(i=0; i < a.length; i++) {
			a[i] = a[i].toLowerCase();
		}
		b.forEach(function(o) {
			if(a.indexOf(o.toLowerCase()) != -1)
				isIn = true;
		});
		return isIn;
	},

	//prepares an object for easy comparison against another. for strings, lowercases them
	prepareForComparison: function (o) {
		if (typeof o == "string") {
			return o.toLowerCase();
		}
		return o;
	},
	
	getSelectedItem: function (tree) {
		var start = new Object();
		var end = new Object();
		var numRanges = tree.view.selection.getRangeCount();

		var res = [];
		for (var t=0; t<numRanges; t++){
			tree.view.selection.getRangeAt(t,start,end);
			for (var v=start.value; v<=end.value; v++){
				res.push(v);
			}
		}
		return res;
	}
}