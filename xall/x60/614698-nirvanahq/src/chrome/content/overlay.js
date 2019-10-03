var nirvanahq = {
/* Simple debugging to the error console */
enableDebug: false,
debug: function (aMessage) {
	if(nirvanahq.enableDebug) {
		let consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
		consoleService.logStringMessage("nirvanahq: " + aMessage);
	}
},


onLoad: function() {
    // initialisation code:
 	// If the completeInstall flag is true, the button has already been installed
	try{
		nirvanahq.debug("start");
		let installButton = true;
		let prefBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		prefBranch.deleteBranch("extensions.nirvanahq@bram.einstallComplete");

		prefBranch = prefBranch.getBranch("extensions.nirvanahq@bram.e.");
		if (prefBranch && prefBranch.getPrefType("installComplete") == prefBranch.PREF_BOOL){
			installButton = !prefBranch.getBoolPref("installComplete");
		}
		nirvanahq.debug("installComplete is " + !installButton);

		if (installButton) {
			nirvanahq.debug("installing button");
			// Find the navigation bar and append the CloseAllTabs button
			prefBranch.setBoolPref("installComplete", true);
			let mainNavBar = document.getElementById("mail-bar3");

			if(!mainNavBar || !mainNavBar.currentSet) {
				nirvanahq.debug("Error installing button: toolbar not present.");
				return;
			}

			let curSet = mainNavBar.currentSet;
			if (curSet.indexOf("nirvanahq-toolbar-button") == -1) {
				let insertPos = curSet.indexOf("button-address");
				if (insertPos > -1) {
					// Insert the button after the address book button:
					insertPos += 14; // "button-address".length
					curSet = curSet.substring(0,insertPos) + ",nirvanahq-toolbar-button"+ curSet.substring(insertPos);
				} else {
					curSet = curSet + ",nirvanahq-toolbar-button";
				}

				nirvanahq.debug("curSet: " + curSet);

				// Tutorial says that we have to perform the following steps
				mainNavBar.setAttribute("currentset", curSet);
				mainNavBar.currentSet = curSet;
				document.persist("mail-bar3", "currentset");
				try {
					BrowserToolboxCustomizeDone(true);
				} catch (e) { }
				nirvanahq.debug("button successfully installed");
			}
		}
	} catch(e) { alert("Error installing nirvanahq: " + e); }
},

onToolbarButtonCommand: function(e) {
	// Open a new tab with NirvanaHQ
    let mailPane = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane");
    mailPane.document.getElementById("tabmail").openTab("contentTab", {contentPage: "https://www.nirvanahq.com/login", type: "nirvanahq"});
}
};

window.addEventListener("load", nirvanahq.onLoad, false);
