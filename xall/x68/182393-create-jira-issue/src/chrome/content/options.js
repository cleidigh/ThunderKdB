Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.createjiraissue.");
var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
const nsIFilePicker = Components.interfaces.nsIFilePicker;
var strbundle = Services.strings.createBundle("chrome://createjiraissue/locale/options.properties");
// EPOQ CHANGES START
Components.utils.import("chrome://createjiraissue/content/epoq/request-fixes.js");
// EPOQ CHANGES END

function showHelp() {
	var index = document.getElementById("settingsTabs").selectedIndex;
	switch(index) {
		case 0:
			showHelpPaneUrl();
			break;
		case 1:
			showHelpPaneMapping();
			break;
		case 2:
			showHelpPaneOther();
			break;
		case 3:
			showHelpPaneLanguage();
			break;
		case 4:
			showHelpPaneReply();
			break;
		case 5:
			showHelpPaneSplash();
			break;
		case 6:
			showHelpPaneHelp();
			break;
		default:
			showGeneralHelp();
	}
}

function showGeneralHelp() {
	openUrl("https://documentation.catworkx.com/x/vIBRAQ");
}

function showHelpPaneUrl() {
	openUrl("https://documentation.catworkx.com/x/8oNiAQ");
}

function showHelpPaneMapping() {
	openUrl("https://documentation.catworkx.com/x/E4FRAQ");
}

function showHelpPaneOther() {
	openUrl("https://documentation.catworkx.com/x/FYFRAQ");
}

function showHelpPaneReply() {
	openUrl("https://documentation.catworkx.com/x/GYFRAQ");
}

function showHelpPaneLanguage() {
	openUrl("https://documentation.catworkx.com/x/F4FRAQ");
}

function showHelpPaneSplash() {
	openUrl("https://documentation.catworkx.com/x/G4FRAQ");
}

function showHelpPaneHelp() {
	openUrl("https://documentation.catworkx.com/x/HYFRAQ");
}

function onLoad(event) {
	//consoleService.logStringMessage("onLoad called");
	try {
		// Mac OS X does not display the button "Accept"
		var settingsNode = document.getElementById("createjiraissue_settings");
		try {
		    var button = settingsNode.getButton('accept');
		    button.hidden = false;
		    button.disabled = false;
		    button.default = true;
		    button.setAttribute("hidden",false);
		    button.setAttribute("disabled",false);
		    button.setAttribute("default",true);
		    button.addEventListener("click", function(event) {
				  event.preventDefault();
				  savePrefs();
				});
		    button.addEventListener("keypress", function(event) {
				  event.preventDefault();
				  savePrefs();
				});
		    button.addEventListener("command", function(event) {
				  event.preventDefault();
				  savePrefs();
				});
		    button = settingsNode.getButton('cancel');
		    button.hidden = true;
		    button.disabled = true;
		    button.setAttribute("hidden",true);
		    button.setAttribute("disabled",true);
		    button = settingsNode.getButton("help");
		    button.hidden = false;
		    button.disabled = false;
		    button.setAttribute("hidden",false);
		    button.setAttribute("disabled",false);
		    button.addEventListener("click", function(event) {
				  event.preventDefault();
				  showHelp();
				});
		    button.addEventListener("keypress", function(event) {
				  event.preventDefault();
				  showHelp();
				});
		    button.addEventListener("command", function(event) {
				  event.preventDefault();
				  showHelp();
				});
		} catch (e) {
			consoleService.logStringMessage(e);
		}
		/*
	    // create an observer instance
	    var observer = new MutationObserver(function(mutations) {
	    	mutations.forEach(function(mutation) {
	    		try {
		    		var value = mutation.target.getAttribute(mutation.attributeName);
		    		if (value != "false") {
		    			consoleService.logStringMessage("resetting to: false");
		    			mutation.target.setAttribute("hidden",false);
		    		}
				} catch (e) {
					consoleService.logStringMessage(e);
				}
	    	});
	    });

	    // configuration of the observer:
	    var config = { attributes: true };

	    // pass in the target node, as well as the observer options
	    observer.observe(settingsNode, config);
	    */
	} catch (e) {
		consoleService.logStringMessage(e);
	}
	onPaneUrlLoad(event);
	onPaneMappingLoad(event);
	onPaneOtherLoad(event);
	onPaneLanguageLoad(event);
	onPaneReplyLoad(event);
	onPaneSplashLoad(event);
	onPaneHelpLoad(event);
	document.addEventListener("dialogaccept", function(event) {
		  event.preventDefault();
		  savePrefs();
		});
	document.addEventListener("dialoghelp", function(event) {
		  event.preventDefault();
		  showHelp();
		});
	//consoleService.logStringMessage("onLoad done");
}

function onTempDirDefaultSelected(value){
	var disable = (value == "true");
	document.getElementById("tempDirAlternate").disabled = disable;
	document.getElementById("chooseDirButton").disabled = disable;
}

function savePrefs(){
	try {
		var projectmapping = document.getElementById("projectmapping").value;
		prefs.setCharPref("projectmapping", projectmapping);
		languageSelected();

		var username = document.getElementById("username").value;
		var password = document.getElementById("password").value;

		var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
		if (username != null && username != 'undefined' && username != "" && password != null && password != 'undefined' && password != "") {
			var extLoginInfo = new nsLoginInfo("chrome://createjiraissue", null, "Jira Login", username, password, "username", "password");
		} else {
			window.close();
			return;
		}

		// Find existing passwords
		var logins = loginManager.findLogins("chrome://createjiraissue", null, "Jira Login");
		// Find user from returned array of nsILoginInfo objects
		if (logins.length > 0) {
			loginManager.modifyLogin(logins[0], extLoginInfo);
		} else {
			loginManager.addLogin(extLoginInfo);
		}
		window.close();
		return;
	} catch (e){
		consoleService.logStringMessage(e);
	}
}

function onPaneUrlLoad(event){
	try {
		var logins = loginManager.findLogins("chrome://createjiraissue", null, "Jira Login");
		if (logins.length > 0) {
			document.getElementById("username").value = logins[0].username;
			document.getElementById("password").value = logins[0].password;
		}
	} catch (e) {
		consoleService.logStringMessage(e);
	}
}

function onPaneMappingLoad(event){
	// Empty
}

function onPaneOtherLoad(event){
	try {
		onTempDirDefaultSelected(document.getElementById("tempDirDefaultRadio").selectedItem.value);
	} catch (e) {
		consoleService.logStringMessage("onPaneOtherLoad exception: " + e);
	}
}

function onPaneReplyLoad(event){
	// Empty
}

function onPaneLanguageLoad(event){
	try {
		var language = prefs.getCharPref("language");
		if ( language != undefined && language != null ) {
			var languageElement = document.getElementById("language");
			consoleService.logStringMessage(language);
			languageElement.value = language;
			//consoleService.logStringMessage("language set");
		}
		validateMonths();
	} catch (e) {
		consoleService.logStringMessage(e);
	}
}

function onPaneHelpLoad(event){
	// Empty
}

function onPaneSplashLoad(event){
	// Empty
}

function openTBtab(tempURL) {
	// taken from tz-push
	// ---------------------------------------------------------
	// Thunderbird
	var browserWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
			.getService(Components.interfaces.nsIWindowMediator)
			.getMostRecentWindow("mail:3pane");
	if (browserWindow) {
		try {
			var tabmail = browserWindow.document.getElementById("tabmail");
			browserWindow.focus();
			tabmail.openTab("contentTab", {
				contentPage : tempURL
			});
			// Object.keys(Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane").document.getElementById("tabmail").tabModes)
			// 3pane,calendar,tasks
			return true;
		} catch (e) {
			consoleService.logStringMessage("openUrl, tabmail.openTab failed: url " + url + " e " + e);
		}
	}
	// Seamonkey
	browserWindow = Components.classes['@mozilla.org/appshell/window-mediator;1']
			.getService(Components.interfaces.nsIWindowMediator)
			.getMostRecentWindow('navigator:browser');
	if (browserWindow) {
		browserWindow.focus();
		try {
			browserWindow.openNewTabWith(tempURL);
		} catch (e) {
			consoleService.logStringMessage("openUrl, browserWindow.openNewTabWith failed: url " + url + " e " + e);
			try {
				browserWindow.gBrowser.addTab(tempURL);
			} catch (e) {
				consoleService.logStringMessage("openUrl, browserWindow.gBrowser.addTab failed: url " + url + " e " + e);
				try {
					browserWindow.open(tempURL);
				} catch (e) {
					consoleService.logStringMessage("openUrl, browserWindow.open failed: url " + url + " e " + e);
					throw (e);
				}
			}
		}
		return true;
	}

	return false;

	/*
	 * from thunderbrowse tburlclk.js:606 var ioservice =
	 * Ccl["@mozilla.org/network/io-service;1"].getService(Cil.nsIIOService);
	 * var uriToOpen = ioservice.newURI(urlcaptured, null, null); var extps =
	 * Ccl["@mozilla.org/uriloader/external-protocol-service;1"].getService(Cil.nsIExternalProtocolService);
	 * extps.loadURI(uriToOpen, null);
	 */
}

function openUrl(url){
	try {
		openTBtab(url);
	} catch (e) {
		consoleService.logStringMessage("openUrl: url " + url + " e " + e);
	}
}

function testConnection() {
	var xmlhttp = new XMLHttpRequest();
	var jiraurl = document.getElementById("jiraurl").value;
	var username = document.getElementById("username").value;
	var password = document.getElementById("password").value;
	var url = jiraurl + "/rest/api/latest/serverInfo";
	var credentials = btoa(username + ":" + password);
	xmlhttp.open("GET", url, true, username, password);
	// EPOQ CHANGES START
	applyRequestFixes(xmlhttp);
	// EPOQ CHANGES END
	xmlhttp.setRequestHeader("Authorization","Basic " + credentials);
	xmlhttp.send(null);
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4) {
			if ( xmlhttp.status == 200) {
				var resp = JSON.parse(xmlhttp.responseText);
				document.getElementById("serverinfo.version").value = resp.version;
				document.getElementById("serverinfo.title").value = resp.serverTitle;
			} else {
				alert("URL: " + url +" Error ->" + xmlhttp.status + " " + xmlhttp.statusText);
			}
		}
	};
	var xmlhttp2 = new XMLHttpRequest();
	var url2 = jiraurl + "/rest/api/latest/user?username="+username;
	xmlhttp2.open("GET", url2, true, username, password);
	// EPOQ CHANGES START
	applyRequestFixes(xmlhttp2);
	// EPOQ CHANGES END
	xmlhttp2.setRequestHeader("Authorization","Basic " + credentials);
	xmlhttp2.send(null);
	xmlhttp2.onreadystatechange = function() {
		if (xmlhttp2.readyState == 4) {
			if ( xmlhttp2.status == 200) {
				var resp = JSON.parse(xmlhttp2.responseText);
				document.getElementById("userinfo.name").value = resp.displayName;
				document.getElementById("userinfo.tz").value = resp.timeZone;
				document.getElementById("userinfo.avatar").src = resp.avatarUrls['48x48'];
			} else {
				alert("URL: " + url +" Error ->" + xmlhttp2.status + " " + xmlhttp2.statusText);
			}
		}
	};
}

function validateMonths(){
	// Empty
}

function languageSelected() {
	var language = document.getElementById("language").value;
	if ( language != undefined && language != null ) {
		//consoleService.logStringMessage(language);
		prefs.setCharPref("language", language);
		//consoleService.logStringMessage("language saved");
	}

}

function chooseDir(){
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "Dialog Title", nsIFilePicker.modeGetFolder);
	var rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
		var path = fp.file.path;
		var tempDirAlternate = document.getElementById("tempDirAlternate");
		tempDirAlternate.value = path;
	}
}
