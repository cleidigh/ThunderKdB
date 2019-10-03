// Overwriting original atStartupRestoreTabs function
myAtStartupRestoreTabs = function (aDontRestoreFirstTab) {
	return false;
};

function DontRestoreTabsToggle(target) {
	var dontRestoreTabs = ! Services.prefs.getBoolPref("extensions.dontrestoretabs.enable");
	Services.prefs.setBoolPref("extensions.dontrestoretabs.enable", dontRestoreTabs)
	target.setAttribute("checked", dontRestoreTabs ? "true" : "false");
}

function DontRestoreTabsMenu() {
	var dontRestoreTabs = ! Services.prefs.getBoolPref("extensions.dontrestoretabs.enable");
	document.getElementById("DontRestoreTabsMenuItem").setAttribute("checked",  dontRestoreTabs ? "true" : "false");
}

window.addEventListener("load", function() { 
	if (Services.prefs.getBoolPref("extensions.dontrestoretabs.enable"))
		atStartupRestoreTabs = myAtStartupRestoreTabs;
	if (Services.prefs.getBoolPref("extensions.dontrestoretabs.nomenu"))
		document.getElementById("DontRestoreTabsMenuItem").setAttribute("hidden", "true");
	else
		document.getElementById("menu_View_Popup").addEventListener("popupshowing",  DontRestoreTabsMenu);}
, false);

