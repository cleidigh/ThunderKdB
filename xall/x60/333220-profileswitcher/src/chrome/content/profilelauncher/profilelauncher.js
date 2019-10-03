var profileLauncher = {

	PS_firefox : "chrome://browser/content/browser.xul",
	PS_thunderbird : "chrome://messenger/content/messenger.xul",
	PS_addressbook : "chrome://messenger/content/addressbook/addressbook.xul",
	prefs : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch),

	init: function() {
		window.removeEventListener("load", profileLauncher.init, false);
		profileLauncher.os = profileSwitcherUtils.os();
		profileLauncher.is13 = profileSwitcherUtils.is13();
		profileLauncher.setProfileIcon();
		profileLauncher.migratePrefs();
		profileLauncher.env = Components.classes["@mozilla.org/process/environment;1"]
	          .getService(Components.interfaces.nsIEnvironment);
		profileLauncher.str = Components.classes["@mozilla.org/supports-string;1"]
			.createInstance(Components.interfaces.nsISupportsString);
		if (profileLauncher.prefs.getBoolPref("extensions.profileswitcher.onload_reset_noremote"))
			profileLauncher.resetMozNoRemote();

		var PS_bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
			.getService(Components.interfaces.nsIStringBundleService);
		profileLauncher.bundle =  PS_bundleService.createBundle("chrome://profilelauncher/locale/profilelauncher.properties");
		profileLauncher.converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        		 .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		profileLauncher.converter.charset = "UTF-8";

		if (document.location.href == profileLauncher.PS_firefox) {
			profileLauncher.PS_appname_win = "firefox.exe";
			profileLauncher.PS_appname_mac = "firefox-bin";
			profileLauncher.PS_appname_linux = "firefox";
			profileLauncher.PS_appname_sh = "firefox.sh";
			profileLauncher.PS_appname_debian = "/usr/bin/iceweasel";
			profileLauncher.PS_appname_gnu = "icecat";
			profileLauncher.PS_isThunderbird = false;
			profileLauncher.PS_windowName = "navigator:browser";
			if (document.getElementById("profSwitcherLog"))
				document.getElementById("profSwitcherLog").collapsed = true;
			if (document.getElementById("profSwitcherLog2"))
				document.getElementById("profSwitcherLog2").collapsed = true;
			if (document.getElementById("profSwitcherLog3"))
				document.getElementById("profSwitcherLog3").collapsed = true;
			if (document.getElementById("profSwitcherLog4"))
				document.getElementById("profSwitcherLog4").collapsed = true;
			var keyset = document.getElementById("mainKeyset");
			if(gBrowser) 
				gBrowser.addEventListener("DOMContentLoaded", profileLauncher.setTitle, false);
		}
		else {
			profileLauncher.PS_appname_win = "thunderbird.exe";
			profileLauncher.PS_appname_mac = "thunderbird-bin";
			profileLauncher.PS_appname_linux = "thunderbird";
			profileLauncher.PS_appname_sh = "thunderbird.sh";
			profileLauncher.PS_appname_debian = "/usr/bin/icedove";
			profileLauncher.PS_isThunderbird = true;
			profileLauncher.PS_windowName = "mail:3pane";
			if (document.getElementById("folderTree")) 
				document.getElementById("folderTree").addEventListener("select", profileLauncher.setTitle, true);	
			window.addEventListener("DOMTitleChanged", function () {profileLauncher.setTitle()}, true);
			var keyset = document.getElementById("mailKeys");
		}
		if (! profileLauncher.PS_isThunderbird && ! document.getElementById("context-openlink"))
			document.getElementById("profContextMenu").setAttribute("hidden", "true");
		profileLauncher.saveprofileinuse();	
		var shortcut = profileLauncher.prefs.getCharPref("extensions.profileswitcher.profile_manager_shortcut");
		if (shortcut.length > 0) {
			var key = document.createElement("key");
			var keyPref = shortcut.split(" ");
			key.setAttribute("id", "profileSwitcherPMkey");
			key.setAttribute("key", keyPref.shift());
			key.setAttribute("modifiers", keyPref.toString());
			key.setAttribute("oncommand", "profileLauncher.runExec()");
			keyset.appendChild(key);
		}
	},

	getComplexPref : function(pref) {
		if (profileLauncher.prefs.getStringPref)
			return profileLauncher.prefs.getStringPref(pref);
		else
			return profileLauncher.prefs.getComplexValue(pref,Components.interfaces.nsISupportsString).data;
	},

	setComplexPref : function(pref,value) {
		if (profileLauncher.prefs.setStringPref)
			profileLauncher.prefs.setStringPref(pref,value);
		else {
			profileLauncher.str.data = value;
			profileLauncher.prefs.setComplexValue(pref,Components.interfaces.nsISupportsString,profileLauncher.str);
		}
	},

	runProfileButton : function(event,item) {
		if (event.target.nodeName == "toolbarbutton" || ((event.target.parentNode.id == "profileNameSBP" || event.target.id == "profileNameSBP") && event.button == 0)) {
			event.stopPropagation();
			var prof = profileLauncher.getComplexPref("extensions.profileswitcher.profile.button_launch");
			 if (prof && prof != "-") {
				item.setAttribute("profile",prof);			
				profileLauncher.runExec(item);
			}
		}
	},

	setProfileIcon : function() {
		var icon = "chrome://profilelauncher/content/button"+profileLauncher.prefs.getIntPref("extensions.profileswitcher.icon_color")+".png";
		var icon2 = "chrome://profilelauncher/content/user"+profileLauncher.prefs.getIntPref("extensions.profileswitcher.icon_color")+".png";
		if (document.getElementById("profileNameIcon"))
			document.getElementById("profileNameIcon").setAttribute("src", icon2);
		var rule1 = '#profSwitcherButton, #profSwitcherButtonTB  {list-style-image: url("'+icon+'") !important}';
		var rule2 = 'toolbar[iconsize="small"] #profSwitcherButton, toolbar[iconsize="small"] #profSwitcherButtonTB {list-style-image: url("'+icon2+'") !important}';
		document.styleSheets[0].insertRule(rule1, document.styleSheets[0].cssRules.length);		
		document.styleSheets[0].insertRule(rule2, document.styleSheets[0].cssRules.length);
	},

	openLink : function(el) {
		profileLauncher.linkUrl = gContextMenu.getLinkURL();
		profileLauncher.runExec(el);
	},

	migratePrefs : function() {
		if (profileLauncher.prefs.getPrefType("extensions.profileswitcher.onload_disable_noremote") > 0) {
			try {
				profileLauncher.prefs.deleteBranch("extensions.profileswitcher.onload_disable_noremote");
			}
			catch(e) {}
		}		
		if (profileLauncher.prefs.getPrefType("profileswitcher.close_before_launch") > 0) {
			try {
				profileLauncher.prefs.setIntPref("extensions.profileswitcher.close_before_launch", profileLauncher.prefs.getIntPref("profileswitcher.close_before_launch"));
				profileLauncher.prefs.deleteBranch("profileswitcher.close_before_launch");
				profileLauncher.prefs.setIntPref("extensions.profileswitcher.where_show_name", profileLauncher.prefs.getIntPref("profileswitcher.where_show_name"));
				profileLauncher.prefs.deleteBranch("profileswitcher.where_show_name");
				profileLauncher.prefs.setBoolPref("extensions.profileswitcher.load_current_page", profileLauncher.prefs.getBoolPref("profileswitcher.load_current_page"));
				profileLauncher.prefs.deleteBranch("profileswitcher.load_current_page");
				profileLauncher.prefs.setBoolPref("extensions.profileswitcher.use_onbeforeunload", profileLauncher.prefs.getBoolPref("profileswitcher.use_onbeforeunload"));
				profileLauncher.prefs.deleteBranch("profileswitcher.use_onbeforeunload");
				profileLauncher.prefs.setBoolPref("extensions.profileswitcher.hide_menus", profileLauncher.prefs.getBoolPref("profileswitcher.hide_menus"));
				profileLauncher.prefs.deleteBranch("profileswitcher.hide_menus");
				profileLauncher.prefs.deleteBranch("profileswitcher.profile.in_use_number");
			}
			catch(e) {}
		}
		if (profileLauncher.prefs.getIntPref("extensions.profileswitcher.where_show_name") == 0)
			profileLauncher.prefs.setBoolPref("extensions.profileswitcher.show_name_titlebar", true);
		else
			profileLauncher.prefs.setBoolPref("extensions.profileswitcher.show_name_titlebar", false);
	},

	quitPrompt : function(prof) {
		var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
		var position = profileLauncher.prefs.getIntPref("extensions.profileswitcher.prompt.buttons_position");
		if (profileSwitcherUtils.os().indexOf("win") > -1)
			position = (position == 0) ? 1 : 0;
		if (position == 0) {
			var flags=promptService.BUTTON_TITLE_YES * promptService.BUTTON_POS_0 +
	       	   	promptService.BUTTON_TITLE_CANCEL * promptService.BUTTON_POS_2 +
	          	promptService.BUTTON_TITLE_NO * promptService.BUTTON_POS_1;
		}
		else {
			var flags=promptService.BUTTON_TITLE_YES * promptService.BUTTON_POS_1 +
	       	   	promptService.BUTTON_TITLE_CANCEL * promptService.BUTTON_POS_2 +
	          	promptService.BUTTON_TITLE_NO * promptService.BUTTON_POS_0;			
		}
		if (prof && prof != "§") {
			var text = profileLauncher.bundle.GetStringFromName("quityesno");
			text = text.replace("%s", prof);
		}
		else			
			var text = profileLauncher.bundle.GetStringFromName("quityesno2");
		var quit  = promptService.confirmEx(window,profileLauncher.bundle.GetStringFromName("quittitle"),text , flags, null, null, null, null, {});
		if (position == 1 && quit == 0)
			quit = 1;
		else if (position == 1 && quit == 1) 
			quit = 0;
		return quit;
	},

	confirmSafeMode: function() {
		var go = confirm(profileLauncher.bundle.GetStringFromName("confirmSafeMode"));
		return go;
	},

	getExecFile : function() {
		var execFile;

		// Try first to load the custom path
		try {
			execFile = Components.classes["@mozilla.org/file/local;1"]
                    	     .createInstance(Components.interfaces.nsIFile);
			var customPath = profileLauncher.getComplexPref("extensions.profileswitcher.executable_custom_path");
			execFile.initWithPath(customPath);
			if (execFile && execFile.exists())
				return execFile;
				
		}
		catch(e) {
			execFile : null;
		}

		// 1st method of auto-detection of executable file
		try {
			execFile = Components.classes["@mozilla.org/file/directory_service;1"]
	 	             .getService(Components.interfaces.nsIProperties)
       		             .get("XREExeF", Components.interfaces.nsIFile);
			if (execFile && execFile.exists()) 
				return execFile;
		}		
		catch(e) {
			execFile : null;
		}
		
		// 2nd method of auto-detection of executable file
		execFile = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("CurProcD", Components.interfaces.nsIFile);
		var found = false;
		var tempFile;
		// In Firefox 21 or higher CurProcD points to the subdirectory "browser"
		if (! profileLauncher.PS_isThunderbird && typeof window.location.origin != "undefined") 
			execFile = execFile.parent;
		
		if (profileLauncher.os.indexOf("win") > -1) {
			execFile.append(profileLauncher.PS_appname_win);
		}
		else if (profileLauncher.os.indexOf("linux") > -1) {
			execFile.append(profileLauncher.PS_appname_linux);
			if (! execFile.exists()) {
				if (! profileLauncher.PS_isThunderbird) {
					tempFile = execFile.parent;
					tempFile.append(profileLauncher.PS_appname_gnu);
					if (tempFile.exists()) {
						execFile = tempFile;
						found = true;
					}
				}
				if (! found) {
					// Some distros (for ex. OpenSuse) uses "firefox.sh" instead "firefox"
					tempFile = execFile.parent;
					tempFile.append(profileLauncher.PS_appname_sh);
					if (tempFile.exists()) {
						execFile = tempFile;
						found = true;
					}
				}
				if (! found) {
					// Debian uses "iceweasel", but it is located in /usr/bin
					var debianFile = Components.classes["@mozilla.org/file/local;1"]
                    			     .createInstance(Components.interfaces.nsIFile);
					debianFile.initWithPath(profileLauncher.PS_appname_debian);
					if (debianFile.exists()) {
						execFile = debianFile;
						found = true;
					}			
				}
			}
		}
		else if (profileLauncher.os.indexOf("mac") > -1) {
			execFile.append(profileLauncher.PS_appname_mac);
		}
		else {
			execFile = null;
		}

		if (! execFile || ! execFile.exists()) {
			// No executable found...
			alert(profileLauncher.bundle.GetStringFromName("noexecfile"));
			return null;
		}

		return execFile;
	},

	runExec: function(item) {
		var execFile = profileLauncher.getExecFile();
		if (! execFile)
			return;
    		var option = profileLauncher.prefs.getIntPref("extensions.profileswitcher.close_before_launch");
		var loadCurrentPage = profileLauncher.prefs.getBoolPref("extensions.profileswitcher.load_current_page");
				
		if (! item || item.getAttribute("id").indexOf("profManager") == 0)
			var prof = "§";
		else {
			// Here it's used the native-charset profile's name, 
			// because the Unicode one will not work
			var prof = item.getAttribute("profile");
			// Remove the "#. " part of the label
			// prof = prof.replace(/\d+. /, "");
		}
	
		if (prof && profileLauncher.prefs.getCharPref("extensions.profileswitcher.arguments_charset"))
			prof = profileLauncher.convert(prof);
	
		if (item)
			var safemode = (item.getAttribute("id") == "profManagerSF" || item.getAttribute("id") == "profManagerSF2");
		else 
			var safemode = false;
		if (safemode) {
			if (! profileLauncher.confirmSafeMode())
				return;
			var quit = true;
		}
		else if (option == 2 && ! profileLauncher.linkUrl) {
			var button = profileLauncher.quitPrompt(prof);
			if (button == 2)
				return;
			else if (button == 0)
				var quit = true;
			else
				var quit = false;
		}
		else if (option == 1)
			var quit = true;
		else
			var quit = false;

		if (profileLauncher.linkUrl)
			quit = false;

		var args = new Array;		
		args.push("-P");
		args.push(prof);
		if (profileLauncher.is13 && profileLauncher.prefs.getBoolPref("extensions.profileswitcher.enable_new_instance"))
			args.push("-new-instance");
		else
			args.push("-no-remote");
		if (safemode)
			args.push("-safe-mode");
		if (prof != "" && profileLauncher.linkUrl)
			args.push(profileLauncher.linkUrl);
		else if (prof != "" && loadCurrentPage)
			args.push(window.content.location.href);
		profileLauncher.linkUrl = null;
		var process = Components.classes["@mozilla.org/process/util;1"]
			.createInstance(Components.interfaces.nsIProcess);
		process.init(execFile);
		
		if (quit) {
			var quitDelay = 1000;
			// I'm not sure at 100% that this will work also with very slow computer and
			// with very old Firefox/Thunderbird version, so there is a hidden preference
			// to allow the user to use the old (1.1 version and earlier) method
			if (profileLauncher.prefs.getBoolPref("extensions.profileswitcher.use_onbeforeunload") ) {
				quitDelay = 500;
				var mainWindow = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                   		.getInterface(Components.interfaces.nsIWebNavigation)
		                .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
                		.rootTreeItem
		                .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                		.getInterface(Components.interfaces.nsIDOMWindow);
				mainWindow.addEventListener("unload", function (evt) {
					process.run(false,args,args.length);
				});
			}
			else
				process.run(false,args,args.length);
			setTimeout(function() {goQuitApplication()}, quitDelay);
		}
		else 
			process.run(false,args,args.length);
	},

	convert : function(str) {
		var newstr;
		try {
			var uConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
				.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			uConv.charset = profileLauncher.prefs.getCharPref("extensions.profileswitcher.arguments_charset");
			newstr = uConv.ConvertFromUnicode(str);
		}
		catch(e) {
			newstr = str;
		}
		return newstr;
	},

	resetMozNoRemote : function() {
		if (profileLauncher.env.get("MOZ_NO_REMOTE")) 
			profileLauncher.env.set("MOZ_NO_REMOTE", "");
	},

	resetLog : function() {
		if (profileLauncher.env.get("NSPR_LOG_MODULES")) 
			profileLauncher.env.set("NSPR_LOG_MODULES", "");
		if (profileLauncher.env.get("NSPR_LOG_FILE")) 
			profileLauncher.env.set("NSPR_LOG_FILE", "");
	},

	restartWithLog : function() {
		var param = {};
		param.abort = true;
		openDialog("chrome://profilelauncher/content/logDialog.xul","", "chrome,modal,centerscreen", param);
		if (param.abort)
			return;
		var type = "";
		if (param.pop3)
			type += "POP3:5,";
		if (param.imap)
			type += "IMAP:5,";
		if (param.smtp)	
			type += "SMTP:5";
		profileLauncher.env.set("NSPR_LOG_MODULES", type);
		profileLauncher.env.set("NSPR_LOG_FILE", param.file);
		var appStartup = Components.classes["@mozilla.org/toolkit/app-startup;1"]
	                .getService(Components.interfaces.nsIAppStartup);
		setTimeout(function() {
			appStartup.quit(Components.interfaces.nsIAppStartup.eRestart | Components.interfaces.nsIAppStartup.eAttemptQuit);		
		}, 500);
	},

	file2array : function() {
		if (! profileLauncher.profilesINI)
			return null;
		var linesArr = [];
		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
	           .createInstance(Components.interfaces.nsIFileInputStream);
		istream.init(profileLauncher.profilesINI, 0x01, 0444, 0);
		istream.QueryInterface(Components.interfaces.nsILineInputStream);
		var line = {}, hasmore;
		do {
			hasmore = istream.readLine(line);
			linesArr.push(line.value);
		} while(hasmore);
		istream.close();
		return linesArr;
	},

	saveprofileinuse : function() {
		var str = Components.classes["@mozilla.org/supports-string;1"]
			.createInstance(Components.interfaces.nsISupportsString);
		var str8;
		if (profileLauncher.prefs.getPrefType("extensions.profileswitcher.profile.in_use") == 0) {
			profileLauncher.profilesINI = null;
			var numProf = 0;
			var currentProfNum = 0;
			var defaultProfNum = 0;
			var tempname = "";
			var ok = false;
			var isRelative = true;
			var profiles = new Array;
			var os = window.navigator.platform.toLowerCase();
			// This is the standard "root" directory where the profiles are 
			var filex = Components.classes["@mozilla.org/file/directory_service;1"]
        	             .getService(Components.interfaces.nsIProperties)
        	             .get("DefProfRt", Components.interfaces.nsIFile);
			// This is the directory of the profile in use
			var profdir = Components.classes["@mozilla.org/file/directory_service;1"]
        	             .getService(Components.interfaces.nsIProperties)
        	             .get("ProfD", Components.interfaces.nsIFile);
			// Name of the profile in use
			var profdirname = profdir.leafName;
			var profdirfullpath = profdir.path;
			// This regexp is used to test if the line finishes with the profdirname
			var profRegExp = new RegExp(profdirname+ "$"); 
			// Clone of the root profiles directory
			var filex2 = filex.clone();
			// First attempt to find the profiles.ini, in the root profiles directory (Linux style)
			filex2.append("profiles.ini");
			// If the file doesn't exist, we try with the parent directory (Windows, Mac OSX style)
			if (! filex2.exists()) {
				var file = filex.parent;
				file.append("profiles.ini");
			}
			else
				var file = filex2;
			if (file) {
				profileLauncher.profilesINI  = file;
				var lines = profileLauncher.file2array();
				for (var i=0;i<lines.length;i++) {			
					var myline = lines[i];
 					try {
						// I need the line both in native-charset and in Unicode:
						// the native-charset will be used to launch the command
						// and the Unicode one to match "profdirfullpath" var 
						var mylineUNICODE = profileLauncher.converter.ConvertToUnicode(myline);
					}
					catch(e) {
						var mylineUNICODE = myline;
					}
					
					// If we find a line beginning with Name= , we store the profile's name in a temp variable
					if (myline && myline.indexOf("Name=") == 0) {
						numProf = numProf+1;
						var tempname = myline.substring(5);
						// profiles.push(numProf+". "+tempname);
						profiles.push(tempname);
					}
					if (myline && myline.indexOf("IsRelative=0") > -1)
						isRelative = false;
					else if (myline && myline.indexOf("IsRelative=1") > -1)
						isRelative = true;
					if (myline.indexOf("Default=1")>-1)
						defaultProfNum = numProf;
					// On Mac the absolute paths are not in plain text, but encoded in base64 with lots of control chars
					// and other strange things ... why??? Who knows it!!!!
					if (os.indexOf("mac")  >-1 && myline && myline.indexOf("Path=") == 0 && ! isRelative )  {
						try {
							var encodedpath = mylineUNICODE.substring(5);
							// atob = base64 decoder function
							var decodedpath = atob(encodedpath);
							// To check in mac absoulte path, we create a regexp with the name of the
							// profile's directory followed by a control char, in this way we shoul avoid "fake positives"
							var regex = new RegExp(profdirname+"[\\x00-\\x1F]","gi");
							if (decodedpath && regex.test(decodedpath)) {
								ok = true;
							profileLauncher.setComplexPref("extensions.profileswitcher.profile.in_use",tempname);
								if (numProf == defaultProfNum)
									currentProfNum = -1;
								else
									currentProfNum = numProf;
							}
						}
						catch(e) {}
					}
					// Rule for absolute path on Win and Linux: note the here the match is with the full path
					// because otherwise it could fail
					else if (! isRelative && mylineUNICODE  == ("Path="+profdirfullpath) ) {
						ok = true;
						profileLauncher.setComplexPref("extensions.profileswitcher.profile.in_use",tempname);
						if (numProf == defaultProfNum)
							currentProfNum = -1;
						else
							currentProfNum = numProf;
					}
					// Normal case with relative path on every os
					// If the profile's directory is at the end of the line beginning with Path=, we've found the right name 
					else if (isRelative && myline && myline.indexOf("Path=") == 0 && profRegExp.test(mylineUNICODE)) {
						ok = true;
						profileLauncher.setComplexPref("extensions.profileswitcher.profile.in_use",tempname);
						if (numProf == defaultProfNum)
							currentProfNum = -1;
						else
							currentProfNum = numProf;
					}
					if (myline && myline.indexOf("Default=1") > -1) {
						profileLauncher.setComplexPref("extensions.profileswitcher.profile.in_use",tempname);
						// profileLauncher.prefs.setIntPref("extensions.profileswitcher.default_profile",  numProf);
					}
				} 
				// profileLauncher.prefs.setIntPref("extensions.profileswitcher.profile.in_use_number", currentProfNum);
			}
			
			if (! ok) 
				// We haven't found the name, set the pref to null... :-(
				profileLauncher.prefs.setCharPref("extensions.profileswitcher.profile.in_use", "");
			profileLauncher.setComplexPref("extensions.profileswitcher.profiles.list",profiles.join(",,,"));
		}
		if (document.location.href == profileLauncher.PS_firefox || document.location.href == profileLauncher.PS_thunderbird)
			profileLauncher.setLabel();
		else
			profileLauncher.setABLabel();
	},

	setLabel : function() {
		var whereShow = profileLauncher.prefs.getIntPref("extensions.profileswitcher.where_show_name");
		var sbp = profileLauncher.prefs.getBoolPref("extensions.profileswitcher.show_statusbar_panel");
		var used_prof = profileLauncher.getComplexPref("extensions.profileswitcher.profile.in_use");
		try {
			used_prof = profileLauncher.converter.ConvertToUnicode(used_prof);
		}
		catch(e) {}
		var text = profileLauncher.bundle.GetStringFromName("profileinuse")+": "+used_prof;
		try {
			document.getElementById("profSwitcherButton").setAttribute("tooltiptext", text);
		}
		catch(e) {}
		if (profileLauncher.PS_isThunderbird && whereShow == 0 && document.title.indexOf("["+ used_prof +"] ") < 0) 
				document.title = "["+ used_prof +"] " + document.title;
		if (! sbp)  
			document.getElementById("profileNameSBP").collapsed = true;
		else {
			document.getElementById("profileNameLabel").value =  used_prof;
			document.getElementById("profileNameSBP").collapsed = false;
			document.getElementById("status-bar").appendChild(document.getElementById("profileNameSBP"));
		}
		var hideMenus =  profileLauncher.prefs.getBoolPref("extensions.profileswitcher.hide_menus");
		document.getElementById("MFP_PSmenu1").collapsed = hideMenus;
		document.getElementById("MFP_PSmenu2").collapsed = hideMenus;
		document.getElementById("MFP_PSsep1").collapsed = hideMenus;
		document.getElementById("MFP_PSsep2").collapsed = hideMenus;
		if (document.getElementById("appmenuPrimaryPane")) {
			document.getElementById("MFP_PSsep3").collapsed = hideMenus;
			document.getElementById("MFP_PSmenu3").collapsed = hideMenus;
			document.getElementById("MFP_PSmenu4").collapsed = hideMenus;
		}
		profileLauncher.fillPopup();
	},
	
	fillPopup : function() {
		function insensitive(s1, s2) {
			var s1lower = s1.toLowerCase();
			var s2lower = s2.toLowerCase();
			return s1lower > s2lower? 1 : (s1lower < s2lower? -1 : 0);
		}
		var sortProfiles = profileLauncher.prefs.getBoolPref("extensions.profileswitcher.profiles_sort");
		var profilesListPref = profileLauncher.getComplexPref("extensions.profileswitcher.profiles.list");
		var profilesList = profilesListPref.split(",,,");
		if (sortProfiles)
			profilesList.sort(insensitive);	
		var popup = document.getElementById("profList");
		var popup2 = document.getElementById("profList2");
		var popup3 = document.getElementById("profList3");
		var popup4 = document.getElementById("profList4");
		var used_prof = profileLauncher.getComplexPref("extensions.profileswitcher.profile.in_use");
		// var regtest = new RegExp("\\d. "+used_prof+"$");
		var regtest = new RegExp("^"+used_prof+"$");
		var default_prof = profileLauncher.getComplexPref("extensions.profileswitcher.default_profile_name");
		var regtest2 = new RegExp("^"+default_prof+"$");
		for (i=0;i<profilesList.length;i++) {
			var item = document.createElement("menuitem");
			try  {
				var labelUTF8 = profileLauncher.converter.ConvertToUnicode(profilesList[i]);
			}
			catch(e) {
				var labelUTF8 = profilesList[i];
			}
			if (! sortProfiles)
				labelUTF8 = (i+1)+". "+labelUTF8;
			item.setAttribute("profile", profilesList[i]);
			item.setAttribute("oncommand", "profileLauncher.runExec(this)");
			if (profilesList[i].match(regtest)) {
				item.setAttribute("disabled", "true");
				item.setAttribute("label", labelUTF8 + " (" + profileLauncher.bundle.GetStringFromName("profileinuse") + ")");
				item.style.fontStyle = "italic";
			}
			else 
				item.setAttribute("label", labelUTF8);
			try {
				// if (i == profileLauncher.prefs.getIntPref("extensions.profileswitcher.default_profile")-1) {
				if (profilesList[i].match(regtest2)) {
					// item.setAttribute("tooltiptext", "Default");
					item.style.fontWeight = "bold";
				}
			}
			catch(e) {}
			profileLauncher.append(popup, item, false);
			profileLauncher.append(popup2, item, false);			
			profileLauncher.append(popup3, item, false);
			profileLauncher.append(popup4, item, false);
			if (! profileLauncher.PS_isThunderbird) {
				var popupContext = document.getElementById("profListContext");
				item.setAttribute("oncommand", "profileLauncher.openLink(this)");
				profileLauncher.append(popupContext, item, false);
			}
		}
		var last  = document.createElement("menuitem");
		last.setAttribute("label", profileLauncher.bundle.GetStringFromName("refresh"));			
		last.setAttribute("oncommand", "profileLauncher.refreshList()");
		profileLauncher.append(popup, last, true);
		profileLauncher.append(popup2, last, true);
		profileLauncher.append(popup3, last, true);
		profileLauncher.append(popup4, last, true);	
	},

	fillToolbarPopup : function(popup) {
		if (popup.childNodes.length == 0) {
			var existingPopup = document.getElementById("profList");
			for (var i=0;i<existingPopup.childNodes.length;i++)  
				profileLauncher.append(popup, existingPopup.childNodes[i], false);
		}
	},
	
	append : function(popup, node, separatorBefore) {
		if (popup) {
			var item;
			if (separatorBefore) {
				item = document.createElement("menuseparator");
				popup.appendChild(item);
			}
			item = node.cloneNode(true);
			popup.appendChild(item);
		}
	},

	refreshList : function() {
		profileLauncher.prefs.deleteBranch("extensions.profileswitcher.profile.in_use");
		profileLauncher.prefs.deleteBranch("extensions.profileswitcher.profiles.list");
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
		var enumerator = wm.getEnumerator(profileLauncher.PS_windowName);
		while(enumerator.hasMoreElements()) {
			var win = enumerator.getNext();
			for (var j=1;j<5;j++) {
				var popup = (j>1) ? win.document.getElementById("profList"+ j.toString()) : win.document.getElementById("profList");
				if (popup) {
					var items = popup.childNodes;
					for (var i=items.length;i>0;i--)
						popup.removeChild(items[i-1]);
				}
			}
			win.profileLauncher.saveprofileinuse();
		}
	},

	clean : function() {
		var WM = Components.classes['@mozilla.org/appshell/window-mediator;1']
			.getService(Components.interfaces.nsIWindowMediator);
		var wins = WM.getEnumerator(null);
		if (! wins.hasMoreElements()) {
			profileLauncher.prefs.deleteBranch("extensions.profileswitcher.profile.in_use");
			profileLauncher.prefs.deleteBranch("extensions.profileswitcher.profiles.list");
			// profileLauncher.prefs.deleteBranch("extensions.profileswitcher.profile.in_use_number");
			profileLauncher.prefs.deleteBranch("extensions.profileswitcher.moz_no_remote");
		}				
	},
	
	openOptions : function() {
		open("chrome://profilelauncher/content/profilelauncherOptions.xul","","chrome=yes,modal=yes,centerscreen=yes");
	},

	setTitle : function() {
		try {
			if (profileLauncher.prefs.getIntPref("extensions.profileswitcher.where_show_name") > 0)
				return;
			var profilename = profileLauncher.getComplexPref("extensions.profileswitcher.profile.in_use");
			try {
				profilename = profileLauncher.converter.ConvertToUnicode(profilename);
			}
			catch(e) {}
			if (profilename != "" ) {
				var titleappend = "["+ profilename +"] ";
				if (document.title.indexOf(titleappend) < 0)
					document.title =  titleappend + document.title;
			} 
		}
		catch(e) {}
	},

	ABinit : function() {
		window.removeEventListener("load", profileLauncher.ABinit, false);
		profileLauncher.migratePrefs();
		if (! profileLauncher.env)
			profileLauncher.env = Components.classes["@mozilla.org/process/environment;1"]
	        	  .getService(Components.interfaces.nsIEnvironment);
		if (profileLauncher.prefs.getBoolPref("extensions.profileswitcher.onload_reset_noremote"))
			profileLauncher.resetMozNoRemote();
		if (profileLauncher.prefs.getPrefType("extensions.profileswitcher.profile.in_use") == 0)
			profileLauncher.saveprofileinuse();	
		else
			profileLauncher.setABLabel();
	},

	setABLabel : function() {
		var sbp = profileLauncher.prefs.getBoolPref("extensions.profileswitcher.show_statusbar_panel");
		var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        		 .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		converter.charset = "UTF-8";
		var prof = profileLauncher.getComplexPref("extensions.profileswitcher.profile.in_use");
		prof = converter.ConvertToUnicode(prof);
		var whereShow = profileLauncher.prefs.getIntPref("extensions.profileswitcher.where_show_name");
		if (whereShow == 0) 
			document.title = "["+ prof +"] " + document.title;
		if (! sbp) 
			document.getElementById("ABprofileNameSBP").collapsed = true;
		else {
			document.getElementById("ABprofileNameLabel").value = prof;
			document.getElementById("ABprofileNameSBP").collapsed = false;
			document.getElementById("status-bar").appendChild(document.getElementById("ABprofileNameSBP"));
		}	
		var icon = "chrome://profilelauncher/content/user"+profileLauncher.prefs.getIntPref("extensions.profileswitcher.icon_color")+".png";
		document.getElementById("ABprofileNameSBPimg").src = icon;
	}
}

if (document.location.href != profileLauncher.PS_addressbook) 
	window.addEventListener("load", profileLauncher.init, false);
else
	window.addEventListener("load", profileLauncher.ABinit, false);
window.addEventListener("unload", profileLauncher.clean, false);

