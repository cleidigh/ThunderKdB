var PS_converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        		 .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
PS_converter.charset = "UTF-8";
var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
var mynewbundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
			.getService(Components.interfaces.nsIStringBundleService);
var mybundle = mynewbundle.createBundle("chrome://profilelauncher/locale/profilelauncher.properties");
var newInstance;
var isTB;
var sstr = Components.classes["@mozilla.org/supports-string;1"]
			.createInstance(Components.interfaces.nsISupportsString);

function getComplexPref(pref) {
	if (prefs.getStringPref)
		return prefs.getStringPref(pref);
	else
		return prefs.getComplexValue(pref,Components.interfaces.nsISupportsString).data;
}

function setComplexPref(pref,value) {
	if (prefs.setStringPref)
		prefs.setStringPref(pref,value);
	else {
		sstr.data = value;
		prefs.setComplexValue(pref,Components.interfaces.nsISupportsString,sstr);
	}
}

function convToUnicode(str) {
	try {
		str = PS_converter.ConvertToUnicode(str);
	}
	catch(e) {}
	return str;
}
 
function insensitive(s1, s2) {
	var s1lower = s1.toLowerCase();
	var s2lower = s2.toLowerCase();
	return s1lower > s2lower? 1 : (s1lower < s2lower? -1 : 0);
}

function initPanel() {
	isTB = navigator.userAgent.indexOf("Thunderbird") > -1;
	if (isTB) {
		document.getElementById("otherOptions").childNodes[1].collapsed = true;
		document.getElementById("otherOptions").childNodes[2].collapsed = true;	
	}
	if (document.getElementById("titlebar"))
		document.getElementById("titlebar").label = mybundle.GetStringFromName("titleBar");
	var where = prefs.getIntPref("extensions.profileswitcher.where_show_name");
	if (where == 1)
		 document.getElementById("titlebar").checked = false;
	else
		 document.getElementById("titlebar").checked = true;	

	var defProf = getComplexPref("extensions.profileswitcher.default_profile_name");
	document.getElementById("currDefProfName").value =  convToUnicode(defProf);

	var profile_in_use = getComplexPref("extensions.profileswitcher.profile.in_use");
	var profilesListPref = getComplexPref("extensions.profileswitcher.profiles.list");
	var profileButtonLaunch = getComplexPref("extensions.profileswitcher.profile.button_launch");
	var profilesList = profilesListPref.split(",,,");
	profilesList.sort(insensitive);
	var profilePopup = document.getElementById("profiles");
	var sel = null;
	for (var i=0;i<profilesList.length;i++) {
		var el = profilePopup.appendItem(convToUnicode(profilesList[i]), profilesList[i]);
		if (profile_in_use == profilesList[i])
			el.setAttribute("disabled", "true");
		else if (profileButtonLaunch == profilesList[i])
			sel = el;
	}
	if (sel)
		profilePopup.selectedItem = sel;
	else if (profileButtonLaunch == "§")
		profilePopup.selectedItem = document.getElementById("pbpm");
	else
		profilePopup.selectedItem = profilePopup.firstChild;
	
	document.getElementById("actionlist").selectedIndex = prefs.getIntPref("extensions.profileswitcher.close_before_launch");
	document.getElementById("sbpan").checked = prefs.getBoolPref("extensions.profileswitcher.show_statusbar_panel");
	document.getElementById("loadCurrentPage").checked = prefs.getBoolPref("extensions.profileswitcher.load_current_page");
	document.getElementById("hideMenus").checked = prefs.getBoolPref("extensions.profileswitcher.hide_menus");
	document.getElementById("promptpos").selectedIndex = prefs.getIntPref("extensions.profileswitcher.prompt.buttons_position");
	document.getElementById("no_remote").checked = prefs.getBoolPref("extensions.profileswitcher.onload_reset_noremote");
	document.getElementById("colors").selectedIndex = prefs.getIntPref("extensions.profileswitcher.icon_color");
	document.getElementById("sortProfiles").checked = prefs.getBoolPref("extensions.profileswitcher.profiles_sort");	

	var shortcut = prefs.getCharPref("extensions.profileswitcher.profile_manager_shortcut");
	if (shortcut.length > 0) {
		var keyPref = shortcut.split(" ");
		document.getElementById("PMkey").value = keyPref.shift();
		var modifiers = keyPref.toString();
		if (modifiers.indexOf("shift") > -1)
			document.getElementById("PMshift").checked = true;
		if (modifiers.indexOf("shift") > -1)
			document.getElementById("PMshift").checked = true;
		if (modifiers.indexOf("accel") > -1)
			document.getElementById("PMcontrol").checked = true;
		if (modifiers.indexOf("alt") > -1)
			document.getElementById("PMalt").checked = true;
	}

	try {
		document.getElementById("execpath").value = getComplexPref("extensions.profileswitcher.executable_custom_path");
	}
	catch(e) {}

	if (profileSwitcherUtils.os().indexOf("win") > -1 || ! profileSwitcherUtils.is13()) {
		newInstance = false;
		document.getElementById("new_instance").setAttribute("hidden", "true");
	}
	else {
		newInstance = true;
		document.getElementById("new_instance").checked = prefs.getBoolPref("extensions.profileswitcher.enable_new_instance");
	}
}

function pickFile(el) {
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"]
		.createInstance(nsIFilePicker);
	fp.init(window, "", nsIFilePicker.modeOpen);
	fp.appendFilters(nsIFilePicker.filterAll);
	if (fp.show)
		var res = fp.show();
	else
		var res = profileSwitcherUtils.openFPsync(fp);
 	if (res == nsIFilePicker.returnOK) {
		var box = el.previousSibling;
		box.value = fp.file.path;
	}
}

function getMainWindow() {
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
	if (isTB)
		var win = wm.getMostRecentWindow("mail:3pane");
	else
		var win = wm.getMostRecentWindowr("navigator:browser");
	return win;
}

function savePrefs() {
	var str = Components.classes["@mozilla.org/supports-string;1"]
			.createInstance(Components.interfaces.nsISupportsString);	
	if (newInstance)
		prefs.setBoolPref("extensions.profileswitcher.enable_new_instance", document.getElementById("new_instance").checked);
	prefs.setBoolPref("extensions.profileswitcher.onload_reset_noremote", document.getElementById("no_remote").checked);
	prefs.setIntPref("extensions.profileswitcher.close_before_launch", document.getElementById("actionlist").selectedIndex);
	var whereValue = document.getElementById("titlebar").checked;
	if (whereValue)
		prefs.setIntPref("extensions.profileswitcher.where_show_name", 0);
	else
		prefs.setIntPref("extensions.profileswitcher.where_show_name", 1);
	 
	prefs.setBoolPref("extensions.profileswitcher.show_statusbar_panel", document.getElementById("sbpan").checked);
	prefs.setBoolPref("extensions.profileswitcher.profiles_sort", document.getElementById("sortProfiles").checked);

	if (isTB)
		prefs.setBoolPref("extensions.profileswitcher.load_current_page", false);
	else
		prefs.setBoolPref("extensions.profileswitcher.load_current_page", document.getElementById("loadCurrentPage").checked);
	
	var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                   .getService(Components.interfaces.nsIWindowMediator);
	if (isTB)
		var enumerator = wm.getEnumerator("mail:3pane");
	else
		var enumerator = wm.getEnumerator("navigator:browser");
	
	prefs.setIntPref("extensions.profileswitcher.icon_color", document.getElementById("colors").selectedItem.value);
	prefs.setIntPref("extensions.profileswitcher.prompt.buttons_position", document.getElementById("promptpos").selectedItem.value);

	if (document.getElementById("execpath").value.length > 2)
		setComplexPref("extensions.profileswitcher.executable_custom_path",document.getElementById("execpath").value);		
	else
		prefs.deleteBranch("extensions.profileswitcher.executable_custom_path");

	
	var shortcut = document.getElementById("PMkey").value;
	if (shortcut.length > 0) {
		if (document.getElementById("PMshift").checked)
			shortcut  = shortcut  + " shift";
		if (document.getElementById("PMalt").checked)
			shortcut  = shortcut  + " alt";
		if (document.getElementById("PMcontrol").checked)
			shortcut  = shortcut  + " accel";	
		prefs.setCharPref("extensions.profileswitcher.profile_manager_shortcut", shortcut);
	}
	else
		prefs.setCharPref("extensions.profileswitcher.profile_manager_shortcut", "");

	setComplexPref("extensions.profileswitcher.profile.button_launch",document.getElementById("profiles").selectedItem.value);	

	var hideMenus =  document.getElementById("hideMenus").checked;
	prefs.setBoolPref("extensions.profileswitcher.hide_menus", hideMenus);
	while(enumerator.hasMoreElements()) {
		var win = enumerator.getNext();
		if (shortcut.length > 0) {
			var keyPref = shortcut.split(" ");
			if (win.document.getElementById("profileSwitcherPMkey")) 
				win.document.getElementById("profileSwitcherPMkey").parentNode.removeChild(win.document.getElementById("profileSwitcherPMkey"));
			
			if (win.document.getElementById("mailKeys"))
				var keyset = win.document.getElementById("mailKeys");
			else
				var keyset = win.document.getElementById("mainKeyset");
			var key = win.document.createElement("key");
			var keyPref = shortcut.split(" ");
			key.setAttribute("id", "profileSwitcherPMkey");
			key.setAttribute("key", keyPref.shift());
			key.setAttribute("modifiers", keyPref.toString());
			key.setAttribute("oncommand", "profileLauncher.runScript()");
			keyset.appendChild(key);
		}
		win.document.getElementById("MFP_PSmenu1").collapsed = hideMenus;
		win.document.getElementById("MFP_PSmenu2").collapsed = hideMenus;
		win.document.getElementById("MFP_PSsep1").collapsed = hideMenus;
		win.document.getElementById("MFP_PSsep2").collapsed = hideMenus;
		if (win.document.getElementById("appmenuPrimaryPane")) {
			win.document.getElementById("MFP_PSsep3").collapsed = hideMenus;
			win.document.getElementById("MFP_PSmenu3").collapsed = hideMenus;
			win.document.getElementById("MFP_PSmenu4").collapsed = hideMenus;
		}
		if (isTB)
			var statusbar = win.document.getElementById("statusText");
		else if (win.document.getElementById("addon-bar"))
			var statusbar = win.document.getElementById("addon-bar");
		else
			var statusbar = win.document.getElementById("statusbar-display");
		var profilename = getComplexPref("extensions.profileswitcher.profile.in_use");
		if (! document.getElementById("sbpan").checked) 
			win.document.getElementById("profileNameSBP").collapsed = true;
		else {
			win.document.getElementById("profileNameLabel").value =  convToUnicode(profilename);
			win.document.getElementById("profileNameSBP").collapsed = false;
			win.document.getElementById("status-bar").appendChild(win.document.getElementById("profileNameSBP"));
		}		
	}
}
