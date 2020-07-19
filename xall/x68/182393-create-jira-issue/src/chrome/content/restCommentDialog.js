/*
 * Thunderbird Plugin: Create Jira Issue
 *
 * This Plugin is able to create Jira-Issues out of an email. Furthermore the
 * content of an email can be added to an issue as a comment.
 *
 * Requirements: - Jira 4.x and above with enabled REST-API - Thunderbird 68+
 *
 * Author: catworkx® GmbH, Hamburg
 *
 */
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
var selectedIssueKey = null;
var selectedProjectKey = null;
var jsonSearchResults = new Object();
var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
		.getService(Components.interfaces.nsIConsoleService);
// consoleService.logStringMessage(msg);
var prefs = Components.classes["@mozilla.org/preferences-service;1"]
		.getService(Components.interfaces.nsIPrefService)
		.getBranch("extensions.createjiraissue.");
var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Components.interfaces.nsIPromptService);
// promptService.alert(window, msg);
var initDone = false;
var jiraurl = null;
var username = null;
var password = null;
var credentials = null;
var selectedFilterId = null;
var jql = "";
var timerid;
var strbundle = Services.strings.createBundle("chrome://createjiraissue/locale/createjiraissue.properties");
var renameAttachmentId = null;
// EPOQ CHANGES START
var contactEmails = [];
var lastSearchFn = null;
Components.utils.import("chrome://createjiraissue/content/epoq/request-fixes.js");
Components.utils.import("chrome://createjiraissue/content/epoq/htmltable2jiratext.js");

function getOrigHdr(origURI) {
	var msgHdr = getMessenger().messageServiceFromURI(origURI)
			.messageURIToMsgHdr(origURI);
	return msgHdr;
}
// EPOQ CHANGES END

function showHelp() {
	openUrl("https://documentation.catworkx.com/x/I4BiAQ");
}

function setupInitialParameters() {
	var addheader = prefs.getBoolPref("addheader");
	var addheadertype = prefs.getCharPref("addheadertype");
	var selHeaderPlain = document.getElementById("sel_header_plain");
	var selHeaderWiki = document.getElementById("sel_header_wiki");
	var selHeaderList = document.getElementById("sel_header");
	// Setup globals
	jiraurl = window.arguments[0].jiraurl;
	username = window.arguments[0].username;
	password = window.arguments[0].password;
	credentials = btoa(username + ":" + password);
	document.getElementById("fld_comment").value = window.arguments[0].issueDescription;
	selHeaderPlain.setAttribute("value",
			window.arguments[0].issueDescriptionPrefix);
	selHeaderWiki.setAttribute("value",
			window.arguments[0].issueDescriptionPrefixWiki);
	if ( addheader == true ) {
		if ( addheadertype == "plain" ) {
			selHeaderList.selectedItem = selHeaderPlain;
		} else {
			selHeaderList.selectedItem = selHeaderWiki;
		}
	}
	var rightstatus = document.getElementById("rightstatus");
	var progressstatus = document.getElementById("progressstatus");
	var searchtabbox = document.getElementById("searchtabbox");
	// consoleService.logStringMessage("setupInitialParameters: searchtabbox " + searchtabbox);
	if (searchtabbox != null) {
		// consoleService.logStringMessage("setupInitialParameters: selectedIndex " + searchtabbox.selectedIndex);
		try {
			// consoleService.logStringMessage("setupInitialParameters: preferredcommenttab " + prefs.getIntPref("preferredcommenttab"));
			var lastcommenttab = prefs.getIntPref("lastcommenttab");
			var preferredcommenttab = prefs.getIntPref("preferredcommenttab");
			if ( preferredcommenttab == -1 ) {
				searchtabbox.selectedIndex = lastcommenttab;
			} else {
				searchtabbox.selectedIndex = preferredcommenttab;
			}
		} catch (e) {
			searchtabbox.selectedIndex = 0; // fallback
		}
		// consoleService.logStringMessage("setupInitialParameters: selectedIndex " + searchtabbox.selectedIndex);
	}
	var jqlField = document.getElementById("jqlField");
	if ( jqlField != null ) {
		try {
			jqlField.value = prefs.getStringPref("lastcommentjql");
		} catch (e) {
			consoleService.logStringMessage("setupInitialParameters: retreiving lastcommentjql from preferences yields an exception: " + e);
		}
	}

	// EPOQ CHANGES START
  initHideClosedCheckbox();
	// EPOQ CHANGES END

	var extra1 = document.getElementById('commentWizard').getButton("extra1");
	extra1.setAttribute("hidden",false);
	extra1.setAttribute("icon","help");
	extra1.setAttribute("label",strbundle.GetStringFromName("wizard.button.help"));
	extra1.addEventListener('command', showHelp, true);

	var next = document.getElementById('commentWizard').getButton("next");
	next.default = false;
	next.setAttribute("default", false);

	initDone = true;
}

function resetFilters() {
	var menuList = document.getElementById("jirafilterlist");
	menuList.setAttribute("disabled", "true");
	menuList.removeAllItems();
	var projectMenu = document.createElement("menupopup");
	projectMenu.setAttribute("id", "jirafiltermenupopup");
	menuList.appendChild(projectMenu);
	selectedFilterId = null;
	document.getElementById('commentWizard').canAdvance = false;
}

function loadFilters() {
	resetFilters();
	var rightstatus = document.getElementById("rightstatus");
	var progressstatus = document.getElementById("progressstatus");
	rightstatus.setAttribute("label", strbundle.GetStringFromName("wizard.status.loadFilters"));
	progressstatus.setAttribute("mode", "undetermined");
	progressstatus.removeAttribute("value");
	var xmlhttp = new XMLHttpRequest();
	var url = jiraurl + "/rest/api/latest/filter/favourite";
	var menuList = document.getElementById("jirafilterlist");
	menuList.setAttribute("wait-cursor", "true");
	xmlhttp.open("GET", url, true, username, password);
	// EPOQ CHANGES START
	applyRequestFixes(xmlhttp);
	// EPOQ CHANGES END
	xmlhttp.setRequestHeader("Authorization", "Basic " + credentials);
	xmlhttp.send(null);
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4) {
			if (xmlhttp.status == 200) {
				var filters = JSON.parse(xmlhttp.responseText);
				var filterMenu = document.getElementById("jirafiltermenupopup");
				if (filters != null) {
					var tempItem = document.createElement("menuitem");
					tempItem.setAttribute("label", "");
					tempItem.setAttribute("value", -1);
					tempItem.setAttribute("jql", "");
					filterMenu.appendChild(tempItem);
					for (var i = 0; i < filters.length; i++) {
						var filter = filters[i];
						tempItem = document.createElement("menuitem");
						tempItem.setAttribute("label", filter.name);
						tempItem.setAttribute("value", filter.id);
						tempItem.setAttribute("jql", filter.jql);
						// tempItem.setAttribute("image",filter.owner.avatarUrls["16x16"]);
						filterMenu.appendChild(tempItem);
					}
				}
				menuList.selectedIndex = 0;
				menuList.setAttribute("disabled", "false");
				menuList.focus();
			} else {
				alert("URL: " + url + " Error ->" + xmlhttp.status + " "
						+ xmlhttp.statusText);
			}
			menuList.removeAttribute("wait-cursor");
			rightstatus.setAttribute("label", strbundle.GetStringFromName("wizard.status.done"));
			progressstatus.setAttribute("mode", "determined");
			progressstatus.setAttribute("value", "100");
		}
	};
}

function searchByFilter() {
	if (document.getElementById("jirafilterlist").selectedItem == null) {
		return;
	}
	selectedFilterId = document.getElementById("jirafilterlist").selectedItem
			.getAttribute("id");
	if (selectedFilterId == null || selectedFilterId == -1) {
		return;
	}
	jql = document.getElementById("jirafilterlist").selectedItem
			.getAttribute("jql");
	if (jql == null || jql == "") {
		return;
	}
	var jqlField = document.getElementById("jqlField");
	jqlField.setAttribute("value", jql);
	jqlField.value = jql;
	_search(false);
}

function jqlSearch() {
	// EPOQ CHANGES START
	lastSearchFn = jqlSearch;
	// EPOQ CHANGES END
	var field = document.getElementById("jqlField");
	jql = field.value;
	// consoleService.logStringMessage("jqlSearch: jql " + jql);
	_search(false);
}

function fulltextSearch() {
	// EPOQ CHANGES START
	lastSearchFn = fulltextSearch;
	// EPOQ CHANGES END
	var field = document.getElementById("fulltextField");
	var value = field.value;
	jql = 'text ~ "' + value + '"';
	var jqlField = document.getElementById("jqlField");
	jqlField.setAttribute("value", jql);
	jqlField.value = jql;
	// consoleService.logStringMessage("fulltextSearch: jql " + jql);
	_search(false);
}

function issuekeySearch() {
	// EPOQ CHANGES START
	lastSearchFn = issuekeySearch;
	// EPOQ CHANGES END
	var field = document.getElementById("issuekeyField");
	var value = field.value;
	jql = 'issuekey = ' + value;
	var jqlField = document.getElementById("jqlField");
	jqlField.setAttribute("value", jql);
	jqlField.value = jql;
	// consoleService.logStringMessage("issuekeySearch: jql " + jql);
	_search(true);
}

function historySearch() {
	// EPOQ CHANGES START
	lastSearchFn = historySearch;
	// EPOQ CHANGES END
	try {
		var lastissues = _cleanupHistoryIssues();
		prefs.setCharPref("lastissues", lastissues);
		// EPOQ CHANGES START
		// TODO: Find cause of this. Empty issue key was added?
		lastissues = lastissues.replace(/,$/, '');
		// EPOQ CHANGES END
		if (lastissues != null && lastissues != "" && lastissues != ",") {
			jql = "issuekey in (" + lastissues + ")";
			var jqlField = document.getElementById("jqlField");
			jqlField.setAttribute("value", jql);
			jqlField.value = jql;
			//consoleService.logStringMessage("historySearch: jql " + jql);
			_search(true);
		}
	} catch (e) {
		consoleService.logStringMessage("historySearch: e " + e);
	}
}

/*
 * Safely fetches the lastissues from the preferences and cleans them from any delimiter garbage.
 * Returns at least an empty String in case nothing was stored in the history.
 */
function _cleanupHistoryIssues() {
	var lastissues = prefs.getCharPref("lastissues");
	var rx = /,{2,}/g;
	//consoleService.logStringMessage("lastissues: " + lastissues);
	lastissues = lastissues.replace(rx, ",");
	//consoleService.logStringMessage("lastissues: " + lastissues);
	lastissues = lastissues.trim();
	//consoleService.logStringMessage("lastissues: " + lastissues);
	while(lastissues.endsWith(",")) {
		lastissues = lastissues.substring(0,lastissues.length-1);
		//consoleService.logStringMessage("lastissues: " + lastissues);
	}
	while(lastissues.startsWith(",")){
		lastissues = lastissues.substring(1,lastissues.length);
		//consoleService.logStringMessage("lastissues: " + lastissues);
	}
	if (lastissues == null || lastissues == "" || lastissues == ",") {
		//consoleService.logStringMessage("lastissues: is empty");
		return "";
	}
	//consoleService.logStringMessage("lastissues: " + lastissues);
	return lastissues;
}

function _search(hideError) {
	// EPOQ CHANGES START
	var jqlField = document.getElementById("jqlField");
	if(prefs.prefHasUserValue('hideclosedissues') && prefs.getBoolPref('hideclosedissues')) {
		jql = 'status != closed AND status != resolved AND status != completed AND status != accepted AND status != done AND ' + jql;
		jqlField.setAttribute("value", jql);
		jqlField.value = jql;
	}
	// EPOQ CHANGES END
	//consoleService.logStringMessage("_search: jql " + jql);
	if ( jql == undefined || jql == null || jql == "" || jql == "issuekey = ") {
		return;
	}
	document.getElementById('commentWizard').canAdvance = false;
	var searchtabbox = document.getElementById("searchtabbox");
	if ( searchtabbox != null ) {
		prefs.setIntPref("lastcommenttab",searchtabbox.selectedIndex);
	}
	try {
		prefs.setStringPref("lastcommentjql", jql);
	} catch (e) {
		consoleService.logStringMessage("_search: storing lastcommentjql in preferences yields an exception: " + e);
	}
	var rightstatus = document.getElementById("rightstatus");
	var progressstatus = document.getElementById("progressstatus");
	rightstatus.setAttribute("label", strbundle.GetStringFromName("wizard.status.searching"));
	progressstatus.setAttribute("mode", "undetermined");
	progressstatus.removeAttribute("value");
	var xmlhttp = new XMLHttpRequest();
	var url = jiraurl + "/rest/api/latest/search?jql="
			+ encodeURIComponent(jql); // TBD: maybe use escape
	// &startAt&maxResults&validateQuery&fields&expand
	//consoleService.logStringMessage("_search: url " + url);
	xmlhttp.open("GET", url, true, username, password);
	xmlhttp.setRequestHeader("Authorization", "Basic " + credentials);
	try {
		xmlhttp.send(null);
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					//consoleService.logStringMessage("_search: response " + xmlhttp.responseText);
					jsonSearchResults = JSON.parse(xmlhttp.responseText);
					_fillTree();
					rightstatus.setAttribute("label", strbundle.GetStringFromName("wizard.status.done"));
				} else {
					consoleService.logStringMessage("_search: response " + xmlhttp.responseText);
					try {
						jsonSearchResults = JSON.parse(xmlhttp.responseText);
						if (jsonSearchResults["errorMessages"] != null) {
							//if (hideError == false) {
								//alert(jsonSearchResults["errorMessages"]);
							//}
							rightstatus.setAttribute("label", jsonSearchResults["errorMessages"]);
						} else {
							//alert("URL: " + url + " Error ->" + xmlhttp.status + " " + xmlhttp.statusText);
							rightstatus.setAttribute("label", "URL: " + url + " Error ->" + xmlhttp.status + " " + xmlhttp.statusText);
						}
					} catch (e) {
						consoleService.logStringMessage("_search: parsing json response exception " + e);
					}
				}

				progressstatus.setAttribute("mode", "determined");
				progressstatus.setAttribute("value", "100");
			}
		};
	} catch (e) {
		consoleService.logStringMessage("_search: exception " + e);
		alert(e);
	}
}

function searchTreeSelected(source) {
	var tree = document.getElementById("searchresultstree");
	var roTree = document.getElementById("selectedissuetree");
	var idx = tree.currentIndex;
	//consoleService.logStringMessage("searchTreeSelected idx: " + idx);
	var col = 1;
	var val = tree.view.getCellText(idx, tree.columns.getColumnAt(col));
	selectedIssueKey = val;
	selectedProjectKey = jsonSearchResults.issues[idx].fields.project.key;
	/*
	consoleService.logStringMessage("searchTreeSelected issue key: " + selectedIssueKey);
	consoleService.logStringMessage("searchTreeSelected issue key (direct): " + jsonSearchResults.issues[idx].key);
	consoleService.logStringMessage("searchTreeSelected project key: " + selectedProjectKey);
	*/
	var keys = new Array("key", "issuetype", "summary", "status");
	for (var i = 0; i < keys.length; ++i) {
		val = tree.view.getCellText(idx, tree.columns.getColumnAt(i));
		// consoleService.logStringMessage("searchTreeSelected val at " + i + "
		// : " + val);
		roTree.view.setCellText(0, roTree.columns.getColumnAt(i), val);
	}
	document.getElementById('commentWizard').canAdvance = true;
}

function _fillTree() {
	// consoleService.logStringMessage("_fillTree start json " +
	// jsonSearchResults);
	var tree = document.getElementById("searchresultstree");
	var treeView = {
		QueryInterface : ChromeUtils.generateQI([
				Components.interfaces.nsIRequestObserver,
				Components.interfaces.nssIStreamListener,
				Components.interfaces.nsIStreamConverter, ]),
		rowCount : jsonSearchResults.total,
		getCellText : function(row, column) {
			// consoleService.logStringMessage("getCellText: row, column id " +
			// row + " " + column + " " + column.id);
			var result = "";
			if (jsonSearchResults != null && jsonSearchResults.issues != null) {
							if (column.id == "key") {
				result = jsonSearchResults.issues[row].key;
			} else if (column.id == "issuetype" || column.id == "status") {
				result = jsonSearchResults.issues[row].fields[column.id].name;
			} else {
				result = jsonSearchResults.issues[row].fields[column.id];
			}
			}
			// consoleService.logStringMessage("getCellText: result " + result);
			return result;
		},
		getCellValue : function(row, column) {
			// consoleService.logStringMessage("getCellValue: row, column id " +
			// row + " " + column + " " + column.id);
			return getCellText(row, column);
		},
		setTree : function(treebox) {
			this.treebox = treebox;
		},
		isContainer : function(row) {
			return false;
		},
		isSeparator : function(row) {
			return false;
		},
		isSorted : function() {
			return false;
		},
		isEditable : function(row, column) {
			return false;
		},
		getLevel : function(row) {
			return 0;
		},
		getImageSrc : function(row, col) {
			return null;
		},
		getRowProperties : function(row) {
			return "";
		},
		getCellProperties : function(row, col) {
			return "";
		},
		getColumnProperties : function(colid, col) {
			return "";
		},
		setCellText : function(row, column, value) {
		},
		setCellValue : function(row, column, value) {
		}
	};
	tree.view = treeView;
	if ( jsonSearchResults.total != null && jsonSearchResults.total == 1 ) {
		tree.view.selection.select(0);
	}
	tree.focus();
	// consoleService.logStringMessage("_fillTree end");
}

function _updateHistoryIssues(issueKey) {
	var lastissues = prefs.getCharPref("lastissues");
	var lastissuesArray = lastissues.split(",");
	if (lastissuesArray.indexOf(issueKey) == -1) {
		if (lastissuesArray.length >= 20) {
			lastissuesArray = lastissuesArray.slice(0, 19);
		}
		lastissuesArray.unshift(issueKey);
	}
	lastissues = lastissuesArray.join(",");
	if (lastissues.charAt(0) == ",") {
		lastissues = lastissues.substring(1); // leave out 2nd param to get
		// all chars up to the end
	}
	prefs.setCharPref("lastissues", lastissues);
}

function startSearchTimer(func, timeout) {
	clearTimeout(timerid);
	timerid = setTimeout(func, timeout); // FIXME: move the timeout value
											// into
	// the preferences window

}

function loadFields() {
	_addRoles2Visibilty();
	_addGroups2Visibilty();
	_showAttachments();
}

function removeAllItems(myListBox){
    var count = myListBox.itemCount;
    while(count-- > 0){
			//EPOQ CHANGE START
        myListBox.getItemAtIndex(0).remove();
			//EPOQ CHANGE END
    }
}

function _showAttachments(){
	// var attachments = window.arguments[0].attachments;
	var attachments = window.opener.createjiraissue.attachments;
	consoleService.logStringMessage("[_showAttachments]: attachments: " + attachments);
	var theList = document.getElementById('attachmentList');
	removeAllItems(theList);
	//EPOQ CHANGE START
	try {
		if ( attachments ) {
			for (var i = 0; i < attachments.length; i++) {
		        //var row = document.createElement('listitem');
				var row = document.createElement('richlistitem');
		        row.setAttribute("id","attachmentId_"+i);

		        var cell = document.createElement('label');
		        cell.setAttribute('value', i);
		        cell.setAttribute('width', 20);
		        cell.setAttribute('flex', 1);
		        cell.setAttribute("id","attachmentOrig_"+i);
		        row.appendChild(cell);

		        cell = document.createElement('label');
		        cell.setAttribute('value', attachments[i].name );
		        cell.setAttribute('width', 200);
		        cell.setAttribute('flex', 1);
		        cell.setAttribute("id","attachmentNew_"+i);
		        row.appendChild(cell);

		        // rename cell
		        cell = document.createElement('label');
		        cell.setAttribute('value', attachments[i].name );
		        cell.setAttribute('width', 200);
		        cell.setAttribute('flex', 1);
		        row.appendChild(cell);

		        cell = document.createElement('label');
		        cell.setAttribute('value', attachments[i].size );
		        cell.setAttribute('width', 100);
		        cell.setAttribute('flex', 1);
		        row.appendChild(cell);

		        cell = document.createElement('label');
		        cell.setAttribute('value', attachments[i].contentType );
		        cell.setAttribute('width', 150);
		        cell.setAttribute('flex', 1);
		        row.appendChild(cell);

		        theList.appendChild(row);
		    }
			var menu = document.getElementById('attachmentsContextMenu');
			menu.addEventListener("popupshowing", function(event) {
				var target = event.target.triggerNode;
				while (target && target.localName != "richlistitem")
					target = target.parentNode;
				if (!target)
					return event.preventDefault(); // Don't show context menu without a list item
				renameAttachmentId = target.getAttribute("id");
				consoleService.logStringMessage("[_showAttachments][popupshowing]: id " + renameAttachmentId);
			}, false);
		}
	} catch (e) {
		alert(e);
	}
	var menuitem = document.getElementById('menuitemAttachmentRenameDialog');
	menuitem.addEventListener("click", renameDialog);
	menuitem = document.getElementById('menuitemAttachmentPrefixFilename');
	menuitem.addEventListener("click", prefixFilename);
	menuitem = document.getElementById('menuitemAttachmentOriginalName');
	menuitem.addEventListener("click", originalName);
}
//EPOQ CHANGE END

function renameDialog(event){
	event.preventDefault();
	consoleService.logStringMessage("[renameDialog]: start, renameAttachmentId = " + renameAttachmentId);
	if ( renameAttachmentId != null ) {
		var row = document.getElementById(renameAttachmentId);
		consoleService.logStringMessage("[renameDialog]: row: " + row);
		if ( row.hasChildNodes() ){
			var children = row.getElementsByTagName("label");
			consoleService.logStringMessage("[renameDialog]: children: " + children);
			consoleService.logStringMessage("[renameDialog]: children.length: " + children.length);
			if ( children && children.length >= 3 ) {
				var value = children[2].getAttribute('value');
				consoleService.logStringMessage("[renameDialog]: value: " + value);
				var response = prompt(strbundle.GetStringFromName("wizard.button.reload.projects"), value);
				consoleService.logStringMessage("[renameDialog]: response: " + response);
				if ( response ) {
					consoleService.logStringMessage("[prefixFilename]: value: " + children[2].getAttribute('value'));
					children[2].setAttribute('value', response);
					consoleService.logStringMessage("[prefixFilename]: value: " + children[2].getAttribute('value'));
				}
			}
		}
	}
}

function prefixFilename(event){
	event.preventDefault();
	consoleService.logStringMessage("[prefixFilename]: start, renameAttachmentId = " + renameAttachmentId);
	if ( renameAttachmentId != null ) {
		var row = document.getElementById(renameAttachmentId);
		consoleService.logStringMessage("[prefixFilename]: row: " + row);
		if ( row.hasChildNodes() ){
			var children = row.getElementsByTagName("label");
			consoleService.logStringMessage("[prefixFilename]: children: " + children);
			consoleService.logStringMessage("[renameDialog]: children.length: " + children.length);
			if ( children && children.length >= 3 ) {
				var value = children[2].getAttribute('value');
				consoleService.logStringMessage("[prefixFilename]: value: " + value);
				var today = new Date();
				var response = today.getFullYear() + '-' + (today.getMonth()+1) + '-' + today.getDate() + '-' + today.getHours() + ":" + today.getMinutes() + '-' + value;
				consoleService.logStringMessage("[prefixFilename]: response: " + response);
				if ( response ) {
					consoleService.logStringMessage("[prefixFilename]: value: " + children[2].getAttribute('value'));
					children[2].setAttribute('value', response);
					consoleService.logStringMessage("[prefixFilename]: value: " + children[2].getAttribute('value'));
				}
			}
		}
	}
}

function originalName(event){
	event.preventDefault();
	consoleService.logStringMessage("[originalName]: start, renameAttachmentId = " + renameAttachmentId);
	if ( renameAttachmentId != null ) {
		var row = document.getElementById(renameAttachmentId);
		consoleService.logStringMessage("[originalName]: row: " + row);
		if ( row.hasChildNodes() ){
			var children = row.getElementsByTagName("label");
			consoleService.logStringMessage("[originalName]: children: " + children);
			consoleService.logStringMessage("[originalName]: children.length: " + children.length);
			if ( children && children.length >= 3 ) {
				children[2].setAttribute('value', children[1].getAttribute('value'));
			}
		}
	}
}

function _addRoles2Visibilty() {
	var xmlhttp = new XMLHttpRequest();
	var url = jiraurl + "/rest/api/2/project/" + selectedProjectKey + "/role";
	xmlhttp.open("GET", url, true, username, password);
	// EPOQ CHANGES START
	applyRequestFixes(xmlhttp);
	// EPOQ CHANGES END
	xmlhttp.setRequestHeader("Authorization", "Basic " + credentials);
	try {
		xmlhttp.send(null);
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					jsonSearchResults = JSON.parse(xmlhttp.responseText);
					var menuPopup = document.getElementById("sel_visibility_popup");
					var tmpMenuItem = document.createElement("menuseparator") ;
					menuPopup.appendChild(tmpMenuItem);
					/*
					tmpMenu = document.createElement("menu");
					tmpMenu.setAttribute("label", "Roles");
					tmpMenu.setAttribute("style", "menuitem-iconic");
					tmpMenu.setAttribute("image", "chrome://createjiraissue/skin/user_suit.png");
					menuPopup.appendChild(tmpMenu);
					menuPopup = document.createElement("menupopup");
					tmpMenu.appendChild(menuPopup);
					*/
					for (var role in jsonSearchResults) {
						tmpMenuItem = document.createElement("menuitem");
						tmpMenuItem.setAttribute("value", "role:"+role);
						tmpMenuItem.setAttribute("label", role);
						tmpMenuItem.setAttribute("class", "menuitem-iconic");
						tmpMenuItem.setAttribute("style", "-moz-image-region: rect(0px, 64px, 16px, 48px); list-style-image: url('chrome://createjiraissue/skin/lock.png');");
						tmpMenuItem.setAttribute("image", "chrome://createjiraissue/skin/lock.png");
						menuPopup.appendChild(tmpMenuItem);
					}
				} else {
					try {
						consoleService.logStringMessage("_addRoles2Visibilty: response " + xmlhttp.responseText);
						jsonSearchResults = JSON.parse(xmlhttp.responseText);
						if (jsonSearchResults["errorMessages"] != null) {
							if (hideError == true) {
								consoleService.logStringMessage("_addRoles2Visibilty: error messages " + jsonSearchResults["errorMessages"]);
							}
						} else {
							consoleService.logStringMessage("_addRoles2Visibilty: URL: " + url + " Error ->" + xmlhttp.status + " "
									+ xmlhttp.statusText);
						}
					} catch (e) {
						consoleService.logStringMessage("_addRoles2Visibilty: URL: " + url + " Error ->" + xmlhttp.status + " "
								+ xmlhttp.statusText);
					}
				}
				var rightstatus = document.getElementById("rightstatus");
				var progressstatus = document.getElementById("progressstatus");
				rightstatus.setAttribute("label", strbundle.GetStringFromName("wizard.status.done"));
				progressstatus.setAttribute("mode", "determined");
				progressstatus.setAttribute("value", "100");
			}
		};
	} catch (e) {
		consoleService.logStringMessage("_addRoles2Visibilty: exception " + e);
		alert(e);
	}
}
function _addGroups2Visibilty() {
	var xmlhttp = new XMLHttpRequest();
	var url = jiraurl + "/rest/api/latest/groups/picker";
	xmlhttp.open("GET", url, true, username, password);
	// EPOQ CHANGES START
	applyRequestFixes(xmlhttp);
	// EPOQ CHANGES END
	xmlhttp.setRequestHeader("Authorization", "Basic " + credentials);
	try {
		xmlhttp.send(null);
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					jsonSearchResults = JSON.parse(xmlhttp.responseText);
					//consoleService.logStringMessage("_addGroups2Visibilty jsonSearchResults " + jsonSearchResults);
					var menuPopup = document.getElementById("sel_visibility_popup");
					var tmpMenuItem = document.createElement("menuseparator") ;
					menuPopup.appendChild(tmpMenuItem);
					/*
					tmpMenu = document.createElement("menu");
					tmpMenu.setAttribute("label", "Groups");
					tmpMenu.setAttribute("style", "menuitem-iconic");
					tmpMenu.setAttribute("image", "chrome://createjiraissue/skin/group.png");
					menuPopup.appendChild(tmpMenu);
					menuPopup = document.createElement("menupopup");
					tmpMenu.appendChild(menuPopup);
					*/
					for (var group in jsonSearchResults.groups) {
						//consoleService.logStringMessage("_addGroups2Visibilty group " + group);
						var tmpMenuItem = document.createElement("menuitem");
						tmpMenuItem.setAttribute("value", "group:" + jsonSearchResults.groups[group].name);
						tmpMenuItem.setAttribute("label", jsonSearchResults.groups[group].name);
						tmpMenuItem.setAttribute("class", "menuitem-iconic");
						tmpMenuItem.setAttribute("style", "-moz-image-region: rect(0px, 64px, 16px, 48px); list-style-image: url('chrome://createjiraissue/skin/lock.png');");
						tmpMenuItem.setAttribute("image", "chrome://createjiraissue/skin/lock.png");
						menuPopup.appendChild(tmpMenuItem);
					}
				} else {
					try {
						consoleService.logStringMessage("_addGroups2Visibilty: response " + xmlhttp.responseText);
						jsonSearchResults = JSON.parse(xmlhttp.responseText);
						if (jsonSearchResults["errorMessages"] != null) {
							if (hideError == true) {
								consoleService.logStringMessage("_addGroups2Visibilty: error messages " + jsonSearchResults["errorMessages"]);
							}
						} else {
							consoleService.logStringMessage("_addGroups2Visibilty: URL: " + url + " Error ->" + xmlhttp.status + " "
									+ xmlhttp.statusText);
						}
					} catch (e) {
						consoleService.logStringMessage("_addGroups2Visibilty: URL: " + url + " Error ->" + xmlhttp.status + " "
								+ xmlhttp.statusText);
					}
				}
				var rightstatus = document.getElementById("rightstatus");
				var progressstatus = document.getElementById("progressstatus");
				rightstatus.setAttribute("label", strbundle.GetStringFromName("wizard.status.done"));
				progressstatus.setAttribute("mode", "determined");
				progressstatus.setAttribute("value", "100");
			}
		};
	} catch (e) {
		consoleService.logStringMessage("_addGroups2Visibilty: exception " + e);
		alert(e);
	}
}

function createComment() {
	var tree = document.getElementById("selectedissuetree");
	var selectedIssueKey = tree.view
			.getCellText(0, tree.columns.getColumnAt(0));
	var comment = document.getElementById("fld_comment").value;
	var header = document.getElementById("sel_header").value;
	var headertype = document.getElementById("sel_header").selectedIndex;
	if (headertype > 0) {
		// 0 = none; 1 = plain; 2 = wiki
		if (headertype == 1) {
			comment = header + "\n\n" + comment;
		} else {
			comment = header + "\n{noformat}\n" + comment + "\n{noformat}\n";
		}
	}
	var json = new Object();
	json.body = comment;
	var visibility = document.getElementById("sel_visibility").value;
	if ( visibility != null && visibility != "" ) {
		json.visibility = new Object();
		if ( visibility.indexOf("role:") == 0 ) {
			// a role
			json.visibility.type = visibility.split(":")[0];
			json.visibility.value = visibility.split(":")[1];
		} else if ( visibility.indexOf("group:") == 0 ) {
			// a group
			json.visibility.type = visibility.split(":")[0];
			json.visibility.value = visibility.split(":")[1];
		} else {
			consoleService.logStringMessage("createComment: unkown visibility found: " + visibility);
		}
	}
	var text = JSON.stringify(json);
	var xmlhttp = new XMLHttpRequest();
	var url = jiraurl + "/rest/api/2/issue/" + selectedIssueKey
			+ "/comment?expand";
	// consoleService.logStringMessage("createComment url " + url + " text " +
	// text);
	xmlhttp.open("POST", url, true, username, password);
	// EPOQ CHANGES START
	applyRequestFixes(xmlhttp);
	// EPOQ CHANGES END
	xmlhttp.setRequestHeader("Authorization", "Basic " + credentials);
	xmlhttp.setRequestHeader('Content-Type', 'application/json');
	xmlhttp.setRequestHeader("User-Agent","");
	xmlhttp.send(text);
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4) {
			if (xmlhttp.status == 201) {
				// var response = JSON.parse(xmlhttp.responseText);
				var message = strbundle.formatStringFromName("wizard.comment.success", [selectedIssueKey], 1);
				var label = document.createElement("description");
				label.setAttribute("class","header");
				label.setAttribute("style","font-size: 16px;");
				document.getElementById("createResult").appendChild(label);
				var messageNode = document.createTextNode(message);
				label.appendChild(messageNode);
				var button = document.createElement("button");
				button.setAttribute("flex", "1");
				button.setAttribute("label",strbundle.GetStringFromName("wizard.success.open.issue"));
				button.addEventListener("click", function(e){openIssue(selectedIssueKey);window.close();}, true);
				document.getElementById("createResult").appendChild(button);
				button = document.createElement("button");
				button.setAttribute("flex", "1");
				button.setAttribute("label",strbundle.GetStringFromName("wizard.success.answer.mail"));
				button.addEventListener("click", function(e){respondMail(selectedIssueKey);window.close();}, true);
				document.getElementById("createResult").appendChild(button);
				button = document.createElement("button");
				button.setAttribute("flex", "1");
				button.setAttribute("label",strbundle.GetStringFromName("wizard.success.open.and.answer"));
				button.addEventListener("click", function(e){openIssue(selectedIssueKey);respondMail(selectedIssueKey);window.close();}, true);
				document.getElementById("createResult").appendChild(button);
				button = document.createElement("button");
				button.setAttribute("flex", "1");
				button.setAttribute("label",strbundle.GetStringFromName("wizard.success.setup.email"));
				button.addEventListener("click", function(e){window.openDialog("chrome://createjiraissue/content/options.xul", "createjiraissuePreferences", "chrome, titlebar, toolbar, dialog=yes, resizable=yes","paneSettingsReply");}, true);
				document.getElementById("createResult").appendChild(button);
				_updateHistoryIssues(selectedIssueKey);
				attachFiles(selectedIssueKey);
			} else {
				if (xmlhttp.status == 400) {
					consoleService.logStringMessage("createIssue got a 400 ");
					var response = JSON.parse(xmlhttp.responseText);
					var errorMessages = response.errorMessages;
					var errorMessage = "";
					var sep = "";
					if (errorMessages != null) {
						for (var i = 0; i < errorMessages.length; i++) {
							errorMessage = errorMessage + sep
									+ errorMessages[i];
							sep = "\n";
						}
					}
					var errors = response.errors;
					if (errors != null) {
						for (var field in errors) {
							errorMessage = field + " : " + errors[field];
						}
					}
					var message = strbundle.formatStringFromName("wizard.create.failure", [errorMessage], 1);
					var textbox = document.createElement("textbox");
					textbox.setAttribute("multiline", "true");
					textbox.setAttribute("value", message);
					textbox.setAttribute("readonly", "true");
					textbox.setAttribute("rows", "10");
					textbox.setAttribute("cols", "30");
					element.appendChild(textbox);
				} else {
					alert("URL: " + url + " Error ->" + xmlhttp.status + " "
							+ xmlhttp.statusText);
				}
			}
		}
	};
}

function openTBtab (tempURL) {
	// taken from tz-push
	//---------------------------------------------------------
	// Thunderbird
	var browserWindow =
		Components.classes["@mozilla.org/appshell/window-mediator;1"]
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

	/*         from thunderbrowse tburlclk.js:606
     var ioservice = Ccl["@mozilla.org/network/io-service;1"].getService(Cil.nsIIOService);
     var uriToOpen = ioservice.newURI(urlcaptured, null, null);
     var extps = Ccl["@mozilla.org/uriloader/external-protocol-service;1"].getService(Cil.nsIExternalProtocolService);
     extps.loadURI(uriToOpen, null);
	 */
}

function openUrl(url) {
	try {
		openTBtab(url);
	} catch (e) {
		consoleService.logStringMessage("openUrl: url " + url + " e " + e);
	}
}

function openIssue(key){
	var url = window.arguments[0].jiraurl + "/browse/" + key;
	//EPOQ CHANGE START
  //openUrl(url);
  let uri = url;
  if (!(uri instanceof Components.interfaces.nsIURI))
    uri = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService)
                    .newURI(url, null, null);

  Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
            .getService(Components.interfaces.nsIExternalProtocolService)
            .loadURI(uri);
  //EPOQ CHANGE END
}

function respondMail(key){
	var url = window.arguments[0].jiraurl + "/browse/" + key;
	var from = window.arguments[0].from;

	try {
		var replyHeaderComment = prefs.getCharPref("replyHeaderComment");
		var replyBodyComment = prefs.getCharPref("replyBodyComment");
		var replyCC = prefs.getCharPref("replyCC");

		var subject = key + " " + window.arguments[0].issueSubject;
		if ( replyHeaderComment != null && replyHeaderComment != "" ) {
			replyHeaderComment = replyHeaderComment.replace(/\$key/g,key);
			replyHeaderComment = replyHeaderComment.replace(/\$url/g,url);
			replyHeaderComment = replyHeaderComment.replace(/\$subject/g,window.arguments[0].issueSubject);
			subject = escape(replyHeaderComment);
		}
		var body = url;
		if ( replyBodyComment != null && replyBodyComment != "" ) {
			replyBodyComment = replyBodyComment.replace(/\$key/g,key);
			replyBodyComment = replyBodyComment.replace(/\$url/g,url);
			body = escape(replyBodyComment);
		}
		var sURL="mailto:"+from+"?subject="+subject+"&body="+body;
		if ( replyCC != null && replyCC != "" ) {
			sURL = sURL + "&cc="+escape(replyCC);
		}
		//consoleService.logStringMessage("respondMail: sURL " + sURL);
		var msgComposeService= Components.classes["@mozilla.org/messengercompose;1"].getService(Components.interfaces.nsIMsgComposeService);

		// make the URI
		var ioService =	Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

		var aURI = ioService.newURI(sURL, null, null);

		// open new message
		msgComposeService.OpenComposeWindowWithURI (null, aURI);

	} catch (e) {
		consoleService.logStringMessage("openUrl: call " + "mailto:?subject="+key+"&to="+from+"&body="+url + " e " + e);
	}
}

// called if the user clicks cancel
function doCancel() {
	return true;
}

function attachFiles(issueKey) {
	// attaches the globally available attachments
	// createjiraissue.selectedAttachments and createjiraissue.attachments are used
	//alert("selectedAttachments " + createjiraissue.selectedAttachments);
	//alert("attachments " + createjiraissue.attachments);
	//alert("issueKey " + issueKey);
	var selectedIds = new Array();
	var names = new Array();
	var mimeTypes = new Array();
	var selectedAttachments = document.getElementById("attachmentList").selectedItems;
	var attachments = window.opener.createjiraissue.attachments; //window.arguments[0].attachments;
	if ( selectedAttachments && selectedAttachments.length > 0 ) {
		var i, item;
		var max = selectedAttachments.length;
		//EPOQ CHANGE START
		for (i=0;i<max;i++){
			item = selectedAttachments[i];
			var cells = item.getElementsByTagName("label");
			selectedIds.push(cells[0].getAttribute("value"));
			names.push(cells[2].getAttribute("value"));
			mimeTypes.push(cells[4].getAttribute("value"));
			//EPOQ CHANGE END
			/*
                     if ( cells ) {
                             var j, cell;
                             var maxcells = cells.length;
                             for (j=0;j<maxcells;j++){
                                     cell = cells[j];
                                     alert("cell " + cell);
                                     alert("label " + cell.label);
                                     alert("getAttribute label " + cell.getAttribute("label"));
                             }
                     }
			 */
		}
		/*
	     alert("selectedIds: " + selectedIds);
	     var i;
	     for(i=0;i<selectedIds.length;i++) {
	             alert(createjiraissue.attachments[selectedIds[i]]);
	     }
		 */
//		consoleService.logStringMessage("[attachFiles]: selectedIds: " + selectedIds);
//		consoleService.logStringMessage("[attachFiles]: attachments: " + attachments);
//		consoleService.logStringMessage("[attachFiles]: names: " + names);
//		consoleService.logStringMessage("[attachFiles]: mimeTypes: " + mimeTypes);

		var params = {
				jiraurl: window.arguments[0].jiraurl,
				username: window.arguments[0].username,
				password: window.arguments[0].password,
				prefs: prefs,
				selectedIds: selectedIds,
				attachments: attachments,
				issueKey: issueKey,
				names: names,
				mimeTypes: mimeTypes,
				messageURI: window.arguments[0].messageURI
		};
		window.openDialog("chrome://createjiraissue/content/attachFiles.xul", "Attachments", "chrome, dialog, resizable=yes", params).focus();
	}
	return;
}

// EPOQ CHANGES START
function initHideClosedCheckbox() {
	if(prefs.prefHasUserValue('hideclosedissues')) {
		document.getElementById("hide-closed-issues").checked = prefs.getBoolPref('hideclosedissues');
	}
}

function initTable2JiraCheckbox() {
  if(prefs.prefHasUserValue('table2jira')) {
    document.getElementById("table-2-jira").checked = prefs.getBoolPref('table2jira');
  }
}

function onHideClosedChanged(ele) {
	prefs.setBoolPref('hideclosedissues', ele.checked);
	if(lastSearchFn != null) {
		lastSearchFn();
	} else {
		LOG("lastSearchFn is null");
	}
}
function onTable2JiraChanged(ele) {
  prefs.setBoolPref('table2jira', ele.checked);
  //console.log("###click");
  //console.log(prefs.getBoolPref("table2jira"));
  if (prefs.getBoolPref("table2jira")) {
  document.getElementById("fld_comment").value = window.arguments[0].issueDescriptionJiraTable;
	//console.log("true");
  } else {
  document.getElementById("fld_comment").value = window.arguments[0].issueDescription;
	//console.log("false");
};
}
// EPOQ CHANGES END

function initWizard() {
//	consoleService.logStringMessage("initWizard: start");
	setupInitialParameters();
	initWizardPages();
	showPage1();
//	consoleService.logStringMessage("initWizard: end");
}

function initWizardPages() {
//	consoleService.logStringMessage("initWizardPages: start");
	var page = document.getElementById("wiz_page_basedata");
	page.addEventListener("pageshow", showPage1);
	page = document.getElementById("wiz_page_fielddata");
	page.addEventListener("pageshow", showPage2);
	page = document.getElementById("wiz_page_result");
	page.addEventListener("pageshow", showPage3);
//	consoleService.logStringMessage("initWizardPages: end");
}

function initWizardButtons() {
//	consoleService.logStringMessage("initWizardButtons: start");
	var wizard = document.getElementById("commentWizard");
	var button = wizard.getButton('next');
	button.addEventListener("mouseup", showPage);
	button.addEventListener("keyup", showPage);
	button = wizard.getButton('back');
	button.addEventListener("mouseup", showPage);
	button.addEventListener("keyup", showPage);
//	consoleService.logStringMessage("initWizardButtons: end");
}

function showPage1() {
//	consoleService.logStringMessage("showPage1: start");
	if (!initDone) {
		setupInitialParameters();
	}
	loadFilters();
//	consoleService.logStringMessage("showPage1: end");
}

function showPage2() {
//	consoleService.logStringMessage("showPage2: start");
	loadFields();
//	consoleService.logStringMessage("showPage2: end");
}

function showPage3() {
//	consoleService.logStringMessage("showPage3: start");
	createComment();
//	consoleService.logStringMessage("showPage3: end");
}
