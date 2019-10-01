/* Thunderbird Plugin: Create Jira Issue
 *
 * This Plugin is able to create Jira-Issues out of an email.
 * Furthermore the content of an email can be added to an issue
 * as a comment.
 *
 * Requirements:
 * - Jira 4.x and above with enabled REST-API
 * - Thunderbird 68+
 *
 * Author: catworkx® GmbH, Hamburg
 *
 */
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
var projectId = null;
var issueTypeId = null;
var projects = null;
var issueTypes = null;
var selectedProject = null;
var selectedProjectId = null;
var selectedIssueType = null;
var selectedIssueTypeId = null;
var allFields = new Array();
var requiredFields = new Array();
var allSelections = new Array();
var requiredSelections = new Array();
var json = new Object();
var jsonSearchResults = new Object(); // for the ldap addressbook: CWXTP-44
var createmeta = null; // filled upon entering page 2 required upon leaving page 2 when deciding what to do with the fields
var doResetFields = true;
var doResetProjects = true;
var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
//consoleService.logStringMessage(msg);
var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.createjiraissue.");
var renameAttachmentId = null;
var tempoAllowedValues = new Array();
var currentTempoAccountField = null;
var currentTempoAccountID = null;
var strbundle = Services.strings.createBundle("chrome://createjiraissue/locale/createjiraissue.properties");

function resetIssueTypes(){
	var menuList = document.getElementById("jiraissuetypemenulist");
	menuList.setAttribute("disabled","true");
	menuList.setAttribute("wait-cursor","true");
	menuList.removeAllItems();
	var issuetypeMenu = document.createElement("menupopup");
	issuetypeMenu.setAttribute("id","jiraissuetypemenupopup");
	menuList.appendChild(issuetypeMenu);
	issueTypeId = null;
}

function resetProjects(){
	var menuList = document.getElementById("jiraprojectsmenulist");
	menuList.setAttribute("disabled","true");
	menuList.removeAllItems();
	var projectMenu = document.createElement("menupopup");
	projectMenu.setAttribute("id","jiraprojectsmenupopup");
	menuList.appendChild(projectMenu);
	projectId = null;
}

function resetRows(){
	var jiraissuegrid = document.getElementById("jiraissuegrid");
	while ( jiraissuegrid.hasChildNodes() ) {
		jiraissuegrid.removeChild(jiraissuegrid.firstChild);
	}
	var columns = document.createElement("columns");
	var column = document.createElement("column");
	column.setAttribute("flex","0");
	columns.appendChild(column);
	column = document.createElement("column");
	column.setAttribute("flex","1");
	columns.appendChild(column);
	jiraissuegrid.appendChild(columns);
	var rows = document.createElement("rows");
	rows.setAttribute("id","jiraissuerows");
	jiraissuegrid.appendChild(rows);
	allFields = new Array();
	requiredFields = new Array();
	allSelections = new Array();
	requiredSelections = new Array();
	json = new Object();
	document.getElementById('createWizard').canAdvance = false;
}

function forceLoadData(){
	consoleService.logStringMessage("forceLoadData");
	doResetProjects = true;
	loadData();
	document.getElementById('createWizard').goTo("basedata");
}

function showHelp() {
	openUrl("https://documentation.catworkx.com/x/4oBRAQ");
}

function loadData(){
	consoleService.logStringMessage("loadData");

	var extra1 = document.getElementById('createWizard').getButton("extra1");
	extra1.setAttribute("hidden",false);
	extra1.setAttribute("icon","refresh"); // does nothing?
	extra1.setAttribute("image","chrome://createjiraissue/skin/Refresh.png");
	extra1.setAttribute("label",strbundle.GetStringFromName("wizard.button.reload.projects"));
	extra1.addEventListener('command', forceLoadData, true);

	var extra2 = document.getElementById('createWizard').getButton("extra2");
	extra2.setAttribute("hidden",false);
	extra2.setAttribute("icon","help");
	extra2.setAttribute("label",strbundle.GetStringFromName("wizard.button.help"));
	extra2.addEventListener('command', showHelp, true);

	var next = document.getElementById('createWizard').getButton("next");
	next.default = false; 
	next.setAttribute("default", false);
	
	if ( doResetProjects == false ) {
		selectionChanged();
		return;
	}
	document.getElementById('createWizard').canAdvance = false;
	var rightstatus = document.getElementById("rightstatus");
	rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.resetProjects"));
	resetProjects();
	rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.resetIssueTypes"));
	resetIssueTypes();
	loadProjects();
	doResetFields = true;
	doResetProjects = false;
}

function loadProjects(){
	var rightstatus = document.getElementById("rightstatus");
	var progressstatus = document.getElementById("progressstatus");
	rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.loadProjects"));
	progressstatus.setAttribute("mode","undetermined");
	progressstatus.removeAttribute("value");
	var xmlhttp = new XMLHttpRequest();
	var jiraurl = window.arguments[0].jiraurl;
	var username = window.arguments[0].username;
	var password = window.arguments[0].password;
	var url = jiraurl + "/rest/api/latest/project";
	var credentials = btoa(username + ":" + password);
	xmlhttp.open("GET", url, true, username, password);
	xmlhttp.setRequestHeader("Authorization","Basic " + credentials);
	xmlhttp.send(null);
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4) {
			if ( xmlhttp.status == 200) {
				projects = JSON.parse(xmlhttp.responseText);
				var menuList = document.getElementById("jiraprojectsmenulist");
				var projectMenu = document.getElementById("jiraprojectsmenupopup");
				var selectedproject = window.arguments[0].selectedproject;
				if ( projects != null ) {
					var selectProjectFound = false;
					var tempItem = document.createElement("menuitem");
					tempItem.setAttribute("label", "");
					tempItem.setAttribute("value", -1);
					tempItem.setAttribute("projKey", -1);
					tempItem.setAttribute("projId", -1);
					projectMenu.appendChild(tempItem);
					for (var i = 0; i < projects.length; i++) {
						var project = projects[i];
						tempItem = document.createElement("menuitem");
						// set project name and key as label
						tempItem.setAttribute("label", project.name + " (" + project.key + ")");
						// add project ID as value attribute
						tempItem.setAttribute("value", i);
						tempItem.setAttribute("projKey", project.key);
						tempItem.setAttribute("projId", project.id);
						tempItem.setAttribute("image",project.avatarUrls["16x16"]);
						projectMenu.appendChild(tempItem);
						// set the default based on mapping
						if (selectedproject == project.key) {
							menuList.selectedIndex = i;
							selectProjectFound = true;
						}
					}
					if (!selectProjectFound) {
						menuList.selectedIndex = 0;
					}
					menuList.setAttribute("disabled","false");
					menuList.removeAttribute("wait-cursor");
					menuList.focus();
				}
			} else {
				alert("URL: " + url +" Error ->" + xmlhttp.status + " " + xmlhttp.statusText);
			}
		}
		rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.done"));
		progressstatus.setAttribute("mode","determined");
		progressstatus.setAttribute("value","100");
	};
}

function loadIssueTypes(){
	//consoleService.logStringMessage("loadIssueTypes");
	resetIssueTypes();
	var xmlhttp = new XMLHttpRequest();
	var jiraurl = window.arguments[0].jiraurl;
	var username = window.arguments[0].username;
	var password = window.arguments[0].password;
	//consoleService.logStringMessage("jiraprojectsmenulist '" + document.getElementById("jiraprojectsmenulist").selectedItem + "'");
	var value = "";

	if ( document.getElementById("jiraprojectsmenulist").selectedItem == null && ( value == null || value == "" ) ) {
		return;
	}
	var projectKey = "";
	//consoleService.logStringMessage("searching for projectKey");
	/*
	var projectId = document.getElementById("jiraprojectsmenulist").selectedItem.getAttribute("projId");
	if ( projectId == null || projectId == -1 ) {
		return;
	}
	*/
	if ( value != null && value != "" ) {
		// our values are supposed to contain the key at the end in ()
		var idx = value.lastIndexOf("(");
		projectKey = value.substr(idx);
		projectKey = projectKey.replace("(","");
		projectKey = projectKey.replace(")","");
		//consoleService.logStringMessage("value: " + value + " idx: " + idx + " projectKey: " + projectKey);
	} else {
		projectKey = document.getElementById("jiraprojectsmenulist").selectedItem.getAttribute("projKey");
		if ( projectKey == null || projectKey == -1 ) {
			return;
		}
	}
	//consoleService.logStringMessage("projectKey '" + projectKey + "'");

	var rightstatus = document.getElementById("rightstatus");
	var progressstatus = document.getElementById("progressstatus");
	rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.loadIssueTypes"));
	progressstatus.setAttribute("mode","undetermined");
	progressstatus.removeAttribute("value");
	//var url = jiraurl + "/rest/api/latest/issuetype";
	//var url = jiraurl + "/rest/api/latest/project/" + projectId + "?expand"; // does not work with 6.0.4 and latest
	var url = jiraurl + "/rest/api/latest/project/" + projectKey + "?expand";
	var credentials = btoa(username + ":" + password);
	xmlhttp.open("GET", url, true, username, password);
	xmlhttp.setRequestHeader("Authorization","Basic " + credentials);
	xmlhttp.send(null);
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4) {
			if ( xmlhttp.status == 200) {
				var data = JSON.parse(xmlhttp.responseText);
				projectId = data.id;
				selectedProject = projectKey;
				selectedProjectId = data.id;
				issueTypes = data.issueTypes;
				var menuList = document.getElementById("jiraprojectsmenulist");
				var issuetypeMenu = document.getElementById("jiraissuetypemenupopup");
				if (issueTypes != null) {
					var tempItem = document.createElement("menuitem");
					tempItem.setAttribute("label", "");
					tempItem.setAttribute("value", -1);
					tempItem.selected = true;
					issuetypeMenu.appendChild(tempItem);
					for (var i = 0; i < issueTypes.length; i++) {
						var issueType = issueTypes[i];
						tempItem = document.createElement("menuitem");
						// set issue type name as label
						tempItem.setAttribute("label", issueType.name);
						// add issue type ID as value attribute
						tempItem.setAttribute("value", issueType.id);
						// add an icon & description
						tempItem.setAttribute("image",issueType.iconUrl);
						tempItem.setAttribute("description",issueType.description);
						issuetypeMenu.appendChild(tempItem);
					}
					// select first item
					document.getElementById("jiraissuetypemenulist").selectedIndex = 0;
					document.getElementById("jiraissuetypemenulist").disabled = false;
				}
				menuList.setAttribute("disabled","false");
				menuList.focus();
			} else {
				alert("URL: " + url +" Error ->" + xmlhttp.status + " " + xmlhttp.statusText);
			}
		}
		rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.done"));
		progressstatus.setAttribute("mode","determined");
		progressstatus.setAttribute("value","100");
	};
}

function selectionChanged(){
	// FIXME: this needs testing
	try {
		// projectId = document.getElementById("jiraprojectsmenulist").selectedItem.getAttribute("projId");
		issueTypeId = document.getElementById("jiraissuetypemenulist").selectedItem.getAttribute("value");
	} catch (e) {
		document.getElementById('createWizard').canAdvance = false;
		return;
	}
	//consoleService.logStringMessage("projectId " + projectId + " issueTypeId " + issueTypeId);
	selectedIssueType = document.getElementById("jiraissuetypemenulist").selectedItem.getAttribute("label");
	selectedIssueTypeId = document.getElementById("jiraissuetypemenulist").selectedItem.getAttribute("value");
	/*
	selectedProject = document.getElementById("jiraprojectsmenulist").selectedItem.getAttribute("projKey");
	selectedProjectId = document.getElementById("jiraprojectsmenulist").selectedItem.getAttribute("projId");
	*/
	//consoleService.logStringMessage("selectedProject " + selectedProject + " selectedIssueType " + selectedIssueType);
	if ( projectId != null && projectId != -1 && issueTypeId != null && issueTypeId != -1 ) {
		var addOnTempoSupport = prefs.getBoolPref("addOnTempoSupport");
		if ( addOnTempoSupport ) {
			_getCreatemeta();
		}
		document.getElementById('createWizard').canAdvance = true;
	} else {
		document.getElementById('createWizard').canAdvance = false;
	}
}

function _addProjectInfoRow(startTyping, jiraissuerows) {
	var tempRow = document.createElement("row");
	var tempLabel = document.createElement("label");
	var tempHbox = document.createElement("hbox");
	var tempField = document.createElement("textbox");
	var tempImg = document.createElement("image");
	var tempSpacer = document.createElement("space");
	var tempVbox = document.createElement("vbox");
	// ---- Row 1: project info
	tempLabel.setAttribute("class","header");
	try {
		tempLabel.setAttribute("value",createmeta["projects"][0]["issuetypes"][0]["fields"]["project"]["name"]);
	} catch (e) {
		// if createmeta["projects"][0] is unavailable, add a standard error message
		consoleService.logStringMessage("_addProjectInfoRow: unable to access project info " + e);
		var failureText = strbundle.GetStringFromName("wizard.rest.fieldinfo.failure");
		tempLabel.setAttribute("flex","1");
		tempLabel.setAttribute("value",failureText);
		tempRow.appendChild(tempLabel);
		jiraissuerows.appendChild(tempRow);
		return;
	}
	tempRow.appendChild(tempLabel);
	tempField.setAttribute("readonly","true");
	tempField.setAttribute("flex","1");
	tempField.setAttribute("value",createmeta.projects[0].name);
	tempField.setAttribute("name","project");
	tempField.setAttribute("id","project");
	allFields.push("project");
	requiredFields.push("project");
	//tempField.setAttribute("image", createmeta.projects[0].avatarUrls["16x16"]);
	tempHbox.appendChild(tempField);
	tempHbox.appendChild(tempImg);
	//consoleService.logStringMessage("_addProjectInfoRow url " + createmeta.projects[0].avatarUrls["48x48"]);
	tempImg.setAttribute("src",createmeta.projects[0].avatarUrls["48x48"]);
	tempImg.setAttribute("width","48");
	tempImg.setAttribute("height","48");
	tempRow.appendChild(tempHbox);
	jiraissuerows.appendChild(tempRow);
	// ---- Row 2: issue type info
	tempRow = document.createElement("row");
	tempLabel = document.createElement("label");
	tempLabel.setAttribute("class","header");
	tempLabel.setAttribute("value",createmeta["projects"][0]["issuetypes"][0]["fields"]["issuetype"]["name"]);
	tempRow.appendChild(tempLabel);
	tempHbox = document.createElement("hbox");
	tempField = document.createElement("textbox");
	tempField.setAttribute("readonly","true");
	tempField.setAttribute("flex","1");
	//tempField.setAttribute("image",createmeta.projects[0].issuetypes[0].iconUrl);
	tempField.setAttribute("value",createmeta.projects[0].issuetypes[0].name);
	tempField.setAttribute("name","issuetype");
	tempField.setAttribute("id","issuetype");
	allFields.push("issuetype");
	requiredFields.push("issuetype");
	tempHbox.appendChild(tempField);
	tempImg = document.createElement("image");
	//consoleService.logStringMessage("url " + createmeta.projects[0].issuetypes[0].iconUrl);
	tempImg.setAttribute("src",createmeta.projects[0].issuetypes[0].iconUrl);
	tempImg.setAttribute("width","16");
	tempImg.setAttribute("height","16");
	/*
    tempSpacer.setAttribute("flex","1");
    tempHbox.appendChild(tempSpacer);
	 */
	tempVbox.appendChild(tempImg);
	tempSpacer = document.createElement("space");
	tempSpacer.setAttribute("flex","1");
	tempVbox.appendChild(tempSpacer);
	tempHbox.appendChild(tempVbox);
	tempRow.appendChild(tempHbox);
	jiraissuerows.appendChild(tempRow);
}

function _getAutodetectField(field, key, type, tempRow, username, startTyping) {
	//consoleService.logStringMessage("adding key " + key);
	//consoleService.logStringMessage("field " + field + "\nfield.name " + field.name + "\nfield.schema.type " + field.schema.type);
	var required = false;
	var selectField = false;
	var tempLabel = document.createElement("label");
	var tempField = document.createElement("textbox");
	tempLabel.setAttribute("class","header");
	if ( field.required ) {
		required = true;
		tempLabel.setAttribute("value",field.name + " *");
		//tempLabel.setAttribute("color","#ff0000");
	} else {
		tempLabel.setAttribute("value",field.name);
	}
	tempRow.appendChild(tempLabel);
	// FIXME: implement missing fields
	if ( type == "string" && _saveAccess(field.schema, "custom") == "de.catworkx.jira.plugins.ldap.LDAPAdressbookToJira:ldap-search-field" ) {
		tempField = _getLDAPAddressbookField(field, key, type);
	} else if ( ( type == "string" && _saveAccess(field.schema, "custom") != "com.atlassian.jira.plugin.system.customfieldtypes:select" && _saveAccess(field.schema, "custom") != "com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons" ) ||
			key == "labels" ||
			( key == "parent" && type == "issuelink" && _saveAccess(field.schema, "system") == "parent" ) ) {
		tempField = _getStringField(field, key, type, false);
	} else if ( type == "number" ) {
		tempField = _getNumberField(field, key, type);
	} else  if ( type == "date" ) {
		// disabled due to CWXTP-145 / AMSTTOJ-37
		// the date picker seems to have disappeared from XUL
		tempField = _getDateField(field, key, type);
		//tempField.setAttribute("placeholder",strbundle.GetStringFromName("wizard.datepicker.obey.format"));
	} else if ( type == "user" ) {
		tempField = _getUserField(field, key, type, username, startTyping);
	} else if ( type == "group" ) {
		tempField = _getGroupField(field, key, type, startTyping);
	} else if ( type == "securitylevel" || type == "priority" || type == "array" || _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:select" || _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons" ) {
		tempField = _getArrayField(field, key, type);
		selectField = true;
	} else if ( type == "account" && _saveAccess(field.schema, "custom") == "com.tempoplugin.tempo-accounts:accounts.customfield" ) {
		var addOnTempoSupport = prefs.getBoolPref("addOnTempoSupport");
		if (addOnTempoSupport) {
			tempField = _getSingleSelectField(field, key, type, tempoAllowedValues);
		} else {
			tempField = _getStringField(field, key, type, false);
		}
	} else { // securitylevel || priority || array
		tempField = _getUnsupportedField(field, key, type);
	}
	tempField = _addFieldKey(key, tempField);
	if ( selectField == true ) {
		allSelections.push(key);
		if ( required == true ) {
			requiredSelections.push(key);
			tempField.addEventListener("select", issueFieldsChanged, true);
		}
	} else {
		allFields.push(key);
		if ( required == true ) {
			requiredFields.push(key);
			tempField.addEventListener("keyup", issueFieldsChanged, true);
			tempField.addEventListener("blur", issueFieldsChanged, true);
		}
	}
	return tempField;
}

/**
 * @param key
 * @param tempField
 */
function _addFieldKey(key,tempField){
	tempField.setAttribute("name",key);
	tempField.setAttribute("id",key);
	return tempField;
}

function loadFields(){
	//consoleService.logStringMessage("loadFields");
	document.getElementById('createWizard').getButton("extra1").setAttribute("hidden",true);
	//consoleService.logStringMessage("loadFields");

	if ( doResetFields == false ) {
		return;
	}

	resetRows(); // do not do this when returning from the results page
	var rightstatus = document.getElementById("rightstatus");
	var progressstatus = document.getElementById("progressstatus");
	rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.loadFields"));
	progressstatus.setAttribute("mode","undetermined");
	progressstatus.removeAttribute("value");
	var xmlhttp = new XMLHttpRequest();
	var jiraurl = window.arguments[0].jiraurl;
	var username = window.arguments[0].username;
	var password = window.arguments[0].password;
	// ORIGINAL with names var url = jiraurl + "/rest/api/latest/issue/createmeta?projectKeys=" + selectedProject + "&issuetypeNames=" + selectedIssueType + "&expand=projects.issuetypes.fields";
	var url = jiraurl + "/rest/api/latest/issue/createmeta?projectIds=" + selectedProjectId + "&issuetypeIds=" + selectedIssueTypeId + "&expand=projects.issuetypes.fields";
	//consoleService.logStringMessage(url);
	/*
  try {
    consoleService.logStringMessage("selectedProject=" + selectedProject + " selectedProjectId=" + selectedProjectId + " selectedIssueType=" + selectedIssueType + " selectedIssueTypeId=" + selectedIssueTypeId);
  } catch (e){}
	 */
	// FIXME: move into _getCreatemeta() and add trigger for _getTempoaAccountFields
	var credentials = btoa(username + ":" + password);
	xmlhttp.open("GET", url, true, username, password);
	xmlhttp.setRequestHeader("Authorization","Basic " + credentials);
	xmlhttp.send(null);
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4) {
			if ( xmlhttp.status == 200) {
				var startTyping = strbundle.GetStringFromName("wizard.start.typing");
				var jiraissuerows = document.getElementById("jiraissuerows");
				createmeta = JSON.parse(xmlhttp.responseText);
				// ---- Row 1 & 2: project info & issue type info
				_addProjectInfoRow(startTyping, jiraissuerows);
				// ---- Row 3-n: issue fields
				var keys = Object.keys(createmeta["projects"][0]["issuetypes"][0]["fields"]);
				//consoleService.logStringMessage("keys " + keys);
				for ( var i = 0; i < keys.length; i++ ) {
					var key = keys[i];
					var field = createmeta["projects"][0]["issuetypes"][0]["fields"][key];
					var type = _saveAccess(field.schema, "type");
					var tempField = null;
					var tempRow = document.createElement("row");
					//consoleService.logStringMessage("[loadFields]: key " + key + " type " + type);
					if ( key == "project" || key == "issuetype" || key == "timetracking" || key == "attachment" ) {
						try {
							if ( key == "timetracking" ) {
								if ( field.required ) {
									requiredFields.push(key);
								}
								allFields.push(key); // will be handled seperately in submitFields
								// -----------------
								//consoleService.logStringMessage("[loadFields]: timetracking #1");
								var tempLabel = document.createElement("label");
								tempLabel.setAttribute("class","header");
								tempRow.appendChild(tempLabel);
								tempField = _getStringField(field, "timetracking_originalestimate", type, false);
								tempField = _addFieldKey("timetracking_originalestimate", tempField);
								//consoleService.logStringMessage("[loadFields]: timetracking #2");
								if ( field.required ) {
									tempLabel.setAttribute("value", strbundle.GetStringFromName("dialog.field.original.estimate.label") + " *");
									tempField.addEventListener("keyup", issueFieldsChanged, true);
									tempField.addEventListener("blur", issueFieldsChanged, true);
								} else {
									tempLabel.setAttribute("value", strbundle.GetStringFromName("dialog.field.original.estimate.label"));
								}
								tempRow.appendChild(tempField);
								jiraissuerows.appendChild(tempRow);
								// -----------------
								//consoleService.logStringMessage("[loadFields]: timetracking #3");
								tempRow = document.createElement("row");
								tempLabel = document.createElement("label");
								tempLabel.setAttribute("class","header");
								tempRow.appendChild(tempLabel);
								tempField = _getStringField(field, "timetracking_remainingestimate", type, false);
								tempField = _addFieldKey("timetracking_remainingestimate", tempField);
								//consoleService.logStringMessage("[loadFields]: timetracking #4");
								if ( field.required ) {
									tempLabel.setAttribute("value", strbundle.GetStringFromName("dialog.field.remaining.estimate.label") + " *");
									tempField.addEventListener("keyup", issueFieldsChanged, true);
									tempField.addEventListener("blur", issueFieldsChanged, true);
								} else {
									tempLabel.setAttribute("value", strbundle.GetStringFromName("dialog.field.remaining.estimate.label"));
								}
								tempRow.appendChild(tempField);
								jiraissuerows.appendChild(tempRow);
								// -----------------
								//consoleService.logStringMessage("[loadFields]: timetracking #5");
							}
						} catch (e) {
							alert("Error -> " + e);
						}
						continue;
					}

					// FIXES: CWXTP-45
					if ( _saveAccess(field.schema, "custom") == "de.catworkx.jira.plugins.customfields.mail_to_customfield:mail_to_cf_type" ) {
						continue;
					}

					tempField = _getAutodetectField(field, key, type, tempRow, username, startTyping);

					tempRow.appendChild(tempField);
					jiraissuerows.appendChild(tempRow);
				}
				issueFieldsChanged();
			} else {
				alert("URL: " + url +" Error ->" + xmlhttp.status + " " + xmlhttp.statusText);
			}
		}
		// ------
		_selectDefaultType();
		// ------
		rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.done"));
		progressstatus.setAttribute("mode","determined");
		progressstatus.setAttribute("value","100");
	};

	_showAttachments();
}

function removeAllItems(myListBox){
    var count = myListBox.itemCount;
    while(count-- > 0){
        myListBox.removeItemAt(0);
    }
}

function _showAttachments(){
	// var attachments = window.arguments[0].attachments;
	var attachments = window.opener.createjiraissue.attachments;
	//consoleService.logStringMessage("[_showAttachments]: attachments: " + attachments);
	var theList = document.getElementById('attachmentList');
	removeAllItems(theList);

	try {
		if ( attachments ) {
			for (var i = 0; i < attachments.length; i++) {
		        var row = document.createElement('listitem');
		        row.setAttribute("id","attachmentId_"+i);

		        var cell = document.createElement('listcell');
		        cell.setAttribute('label', i);
		        row.appendChild(cell);

		        cell = document.createElement('listcell');
		        cell.setAttribute('label', attachments[i].name );
		        row.appendChild(cell);

		        // rename cell
		        cell = document.createElement('listcell');
		        cell.setAttribute('label', attachments[i].name );
		        row.appendChild(cell);

		        cell = document.createElement('listcell');
		        cell.setAttribute('label', attachments[i].size );
		        row.appendChild(cell);

		        cell = document.createElement('listcell');
		        cell.setAttribute('label', attachments[i].contentType );
		        row.appendChild(cell);

		        theList.appendChild(row);
		    }
			var menu = document.getElementById('attachmentsContextMenu');
			menu.addEventListener("popupshowing", function(event) {
				var target = event.target.triggerNode;
				while (target && target.localName != "listitem")
					target = target.parentNode;
				if (!target)
					return event.preventDefault(); // Don't show context menu without a list item
				renameAttachmentId = target.getAttribute("id");
				//consoleService.logStringMessage("[_showAttachments][popupshowing]: id " + renameAttachmentId);
			}, false);
		}
	} catch (e) {
		alert(e);
	}
}

function renameDialog(event){
	//consoleService.logStringMessage("[renameDialog]: start, renameAttachmentId = " + renameAttachmentId);
	if ( renameAttachmentId != null ) {
		var row = document.getElementById(renameAttachmentId);
		//consoleService.logStringMessage("[originalName]: row: " + row);
		if ( row.hasChildNodes() ){
			var children = row.getElementsByTagName("listcell");
			//consoleService.logStringMessage("[originalName]: children: " + children);
			if ( children && children.length > 3 ) {
				var value = children[2].getAttribute('label');
				//consoleService.logStringMessage("[originalName]: value: " + value);
				var response = prompt(strbundle.GetStringFromName("wizard.button.reload.projects"), value);
				//consoleService.logStringMessage("[originalName]: response: " + response);
				if ( response ) {
					children[2].setAttribute('label', response);
				}
			}
		}
	}
}

function originalName(event){
	//consoleService.logStringMessage("[originalName]: start, renameAttachmentId = " + renameAttachmentId);
	if ( renameAttachmentId != null ) {
		var row = document.getElementById(renameAttachmentId);
		//consoleService.logStringMessage("[originalName]: row: " + row);
		if ( row.hasChildNodes() ){
			var children = row.getElementsByTagName("listcell");
			//consoleService.logStringMessage("[originalName]: children: " + children);
			if ( children && children.length > 3 ) {
				children[2].setAttribute('label', children[1].getAttribute('label'));
			}
		}
	}
}

function _selectDefaultType(){
	var addheader = prefs.getBoolPref("addheader");
	var addheadertype = prefs.getCharPref("addheadertype");
	var menuList = document.getElementById("_pfx_description");
	if ( addheader == true ) {
		var defaultType = document.getElementById("_description_" + addheadertype);
		if ( defaultType != null ) {
			menuList.selectedItem = defaultType;
		}
	}
}

function issueFieldsChanged(){
	var canAdvance = true;
	var element = null;
	var value = null;
	var id = null;
	var i = 0;
	try {
		for (i = 0; i < requiredFields.length; i++) {
			id = requiredFields[i];
			if (id == "timetracking") {
				var originalEstimate = "";
				var remainingEstimate = "";
				element = document
						.getElementById("timetracking_originalestimate");
				value = element.value;
				if (value != null && value != "") {
					originalEstimate = value;
				}
				element = document
						.getElementById("timetracking_remainingestimate");
				value = element.value;
				if (value != null && value != "") {
					remainingEstimate = value;
				}
				if (originalEstimate == null || originalEstimate == "") {
					canAdvance = false;
					break;
				}
				if (remainingEstimate == null || remainingEstimate == "") {
					canAdvance = false;
					break;
				}
			} else {
				element = document.getElementById(id);
				value = element.value;
				//consoleService.logStringMessage("required field " + id + " is set to " + value);
				if (value == null || value == "") {
					canAdvance = false;
					break;
				}
			}
		}
		element = null;
		value = null;
		id = null;
		i = 0;
		if (canAdvance == true) {
			for (i = 0; i < requiredSelections.length; i++) {
				id = requiredSelections[i];
				element = document.getElementById(id);
				item = element.selectedItem;
				if (item != null) {
					var value = item.value;
					//consoleService.logStringMessage("required field " + id + " is set to " + value);
					if (value == null || value == "") {
						canAdvance = false;
						break;
					}
				} else {
					canAdvance = false;
					break;
				}
			}
		}
	} catch (e) {
		var msg = "Failure checking for required field: " + id + " error was: " + e;
		alert(msg);
	}
	//consoleService.logStringMessage("canAdvance " + canAdvance);
	document.getElementById('createWizard').canAdvance = canAdvance;
	return canAdvance;
}

function submitFields(){
//	consoleService.logStringMessage("submitFields called: json " + json);
	json.fields = new Object();
//	consoleService.logStringMessage("submitFields called: json.fields " + json.fields);
//	consoleService.logStringMessage("submitFields allFields ");
//	consoleService.logStringMessage(JSON.stringify(allFields, null, 4));
//	consoleService.logStringMessage("submitFields allFields.length " + allFields.length);
	var id = null;
	var value = null;
	var fieldObj = null;
	var name = null;
	var field = null;
	var type = null;
	var i = 0;
	try {
		//consoleService.logStringMessage("projectId " + projectId + " issueTypeId " + issueTypeId);
		for (i = 0; i < allFields.length; i++) {
			id = allFields[i];
			if ( id == "timetracking" ) {
				/*
				"timetracking": {
			            "originalEstimate": "10",
			            "remainingEstimate": "5"
			        },
				 */
				var originalEstimate = "";
				var remainingEstimate = "";
				fieldObj = document.getElementById("timetracking_originalestimate");
				value = fieldObj.value;
				if (value != null && value != "") {
					originalEstimate = value;
				}
				fieldObj = document.getElementById("timetracking_remainingestimate");
				value = fieldObj.value;
				if (value != null && value != "") {
					remainingEstimate = value;
				}
				json.fields[id] = new Object();
				json.fields[id].originalEstimate = originalEstimate;
				json.fields[id].remainingEstimate = remainingEstimate;
			} else {
				fieldObj = document.getElementById(id);
				value = fieldObj.value;
				name = fieldObj.id;
				//consoleService.logStringMessage("submitFields allFields field " + field + "\nid: " + id + "\nname: " + name + "\nvalue: " + value);
				if (name == "description") {
					value = " "; // fake value, will be changed below
				}
				//consoleService.logStringMessage("submitFields pre format field.id: " + name + "\nfield.value: " + value + "\ntypeof: " + typeof value + "\ninstanceof String: " + (value instanceof String) + "\ninstanceof Array: " + (value instanceof Array) + "\ninstanceof Object: " + (value instanceof Object));
				// FIXME: probably breaks new description field ?
				if (value != null && ((((value instanceof String) || typeof value == "string") && value != "") || ((value instanceof Array) && value.length > 0 && (value[0] != null || value[0] != "")) || ((value instanceof Object) && value["name"] && value["name"] != null && value["name"] != ""))) {
					field = createmeta["projects"][0]["issuetypes"][0]["fields"][id]; // FIXME: we accidentially re-use this "field" refer to line 755
					type = _saveAccess(field.schema, "type");
					//consoleService.logStringMessage("submitFields allFields field.id: " + name + "\nfield.type: " + type);
					if (name == "project" || name == "issuetype" || name == "reporter" || name == "assignee" || (name == "parent" && type == "issuelink" && _saveAccess(field.schema, "system") == "parent")) {
						var origVal = value;
						value = new Object();
						value.name = new String(origVal).toUpperCase(); // ensure only uppercase letters (default for JIRA)
						if (name == "project") {
							value.id = projectId;
						} else if (name == "issuetype") {
							value.id = issueTypeId;
						} else if (name == "parent" && type == "issuelink" && _saveAccess(field.schema, "system") == "parent") {
							// FIXME: we might need to fetch the id for "id":"10234" instead
							value = new Object();
							value.key = origVal;
						}
					} else if (type == "date" && name != "duedate") {
						// no need to do anything as of now
					} else if (type == "number") {
						//consoleService.logStringMessage("submitFields got number:" + value);
						value = value.toString();
						//consoleService.logStringMessage("submitFields string repr:" + value);
						//value = value.replace(".",prefs.getCharPref("decimalsep"));
						value = new Number(value);
						//consoleService.logStringMessage("submitFields number repr:" + value);
					} else if ((_saveAccess(field.schema, "custom") == "is.origo.jira.tempo-plugin:billingKeys") || (type == "account" && _saveAccess(field.schema, "custom") == "com.tempoplugin.tempo-accounts:accounts.customfield")) {
						//consoleService.logStringMessage("submitFields fieldObj.selectedItem:" + fieldObj.selectedItem);
						if ( fieldObj.selectedItem != null ) {
							value = fieldObj.selectedItem.value;
							//consoleService.logStringMessage("submitFields fieldObj.selectedItem.value:" + fieldObj.selectedItem.value);
						}
						//consoleService.logStringMessage("submitFields got tempo value:" + value);
						value = value.toString();
						//consoleService.logStringMessage("submitFields tempo string repr:" + value);
						//value = value.replace(".",prefs.getCharPref("decimalsep"));
						value = new Number(value);
						currentTempoAccountField = name;
						currentTempoAccountID = value;
						//consoleService.logStringMessage("submitFields tempo number repr:" + value);
					} else if (name == "description") {
						field = document.getElementById("_pfx_" + id);
						value = field.value;
						var selItem = field.selectedItem;
						var fmt = "";
						if (selItem.id == "_description_wiki") {
							// if wiki header selected, implicitly add noformat tags around it
							fmt = "\n{noformat}\n";
						}
						field = document.getElementById("_" + id);
						value = value + fmt + field.value + fmt;
					} else if (name == "labels") { // probably only below
						value = value.toString().split(" ");
					} else if (type == "securitylevel" || type == "priority" || type == "array") {
						// TBD: keep format if not null?
						if (value != null && value.name != null && value.name == "") {
							//consoleService.logStringMessage("submitFields allFields name: " + name + " has no name content: " + value.name);
							value = null;
						} else if (value != null && value.id != null && value.id == "") {
							//consoleService.logStringMessage("submitFields allFields name: " + name + " has no id content: " + value.id);
							value = null;
						}
					}
					// FIXME: finish
					//consoleService.logStringMessage("submitFields allFields post format field.id: " + id + "\njson value: " + value);
					if (value != null && value != "") {
						json.fields[id] = value;
					}
				}
			}
		}
	} catch (e) {
		consoleService.logStringMessage("submitFields(allFields) caught an exception for field.id: " + id + "\ne: " + e);
		alert(e);
	}
	id = null;
	value = null;
	fieldObj = null;
	name = null;
	field = null;
	type = null;
	i = 0;
	//consoleService.logStringMessage("submitFields allSelections " + allSelections);
	//consoleService.logStringMessage("submitFields allSelections.length " + allSelections.length);
	try {
		for (i = 0; i < allSelections.length; i++) {
			id = allSelections[i];
			fieldObj = document.getElementById(id);
			//consoleService.logStringMessage("submitFields allSelections field " + fieldObj + "\nid: " + id);
			var item = fieldObj.selectedItem;
			if (item != null) {
				value = item.value;
				name = fieldObj.id;
				//consoleService.logStringMessage("submitFields allSelections field.id: " + name + "\nfield.value: " + value);
				if (value != null || value != "") {
					field = createmeta["projects"][0]["issuetypes"][0]["fields"][id];
					type = _saveAccess(field.schema, "type");
					//consoleService.logStringMessage("submitFields allSelections field.id: " + name + "\nfield.type: " + type);
					if (type == "securitylevel" || type == "priority" || type == "array"|| _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:select" || _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons") {
						// TBD: keep format if not null?
						if (value != null && value.name != null && value.name == "") {
							//consoleService.logStringMessage("submitFields allSelections name: " + name + " has no name content: " + value.name);
							value = null;
						}
						if (value != null && value.id != null && value.id == "") {
							//consoleService.logStringMessage("submitFields allSelections name: " + name + " has no id content: " + value.id);
							value = null;
						}
						if (value != null) {
							if (type == "securitylevel" || type == "priority" || name == "versions" || name == "fixVersions" || name == "components"|| _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:multiselect" || _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes") {
								// TBD: does this work?
								var values = fieldObj.selectedItems;
							    //consoleService.logStringMessage("submitFields allSelections name: " + name + " is a multi select field, values: " + values + "\n" + 								"tagName: " + fieldObj.tagName + " selType: " + fieldObj.selType);
								if (values != null && value.length > 0) {
									value = new Array();
									for (var k = 0; k < values.length; k++) {
										var obj = new Object();
										obj.id = values[k].value;
										value.push(obj);
									}
								} else if (name == "labels") {
									value = value.toString().split(" ");
								} else {
									value = null; // FIXME: cf selections in arrays / objects
								}
							}
						}
					}
					//consoleService.logStringMessage("submitFields allSelections post format field.id: " + id + "\njson value: " + value);
					if (value != null && value != "") {
						//json.fields[id] = new Object();
						//json.fields[id].name = value; // FIXME: which to set ?
						//json.fields[id].id = value;
						if ( _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:select" || _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons" ) {
							json.fields[id] = new Object();
							json.fields[id].id = value;
						} else {
							json.fields[id] = value;
						}
					}
				}
			}
		}
	} catch (e) {
		consoleService.logStringMessage("submitFields(allSelections) caught an exception for field.id: " + id + "\ne: " + e);
		alert(e);
	}
//	consoleService.logStringMessage("submitFields done: json= ");
//	consoleService.logStringMessage(JSON.stringify(json, null, 4));
//	consoleService.logStringMessage("submitFields done: json.fields= ");
//	consoleService.logStringMessage(JSON.stringify(json.fields, null, 4));
	return issueFieldsChanged();
}

function createIssue(){
	var createResult = document.getElementById("createResult");
	while ( createResult.hasChildNodes() ) {
		createResult.removeChild(createResult.firstChild);
	}

	consoleService.logStringMessage("createIssue called: json " + json);
	doResetFields = false;
	var rightstatus = document.getElementById("rightstatus");
	var progressstatus = document.getElementById("progressstatus");
	rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.createIssue"));
	progressstatus.setAttribute("mode","undetermined");
	progressstatus.removeAttribute("value");
	var xmlhttp = new XMLHttpRequest();
	var jiraurl = window.arguments[0].jiraurl;
	var username = window.arguments[0].username;
	var password = window.arguments[0].password;
	var url = jiraurl + "/rest/api/latest/issue";
	var credentials = btoa(username + ":" + password);
	xmlhttp.open("POST", url, true, username, password);
	xmlhttp.setRequestHeader('Content-Type', 'application/json');
	xmlhttp.setRequestHeader("Authorization","Basic " + credentials);
	xmlhttp.setRequestHeader("User-Agent","");
	// FIXME: prepare JSON data
	// --- debug ---
	var text = JSON.stringify(json);
	//consoleService.logStringMessage("createIssue json: " + text);
	//_addDebugJSON(text);
	// --- debug ---
	// return;  // FIXME: STOP here for now
	xmlhttp.send(text);
	xmlhttp.onreadystatechange = function() {
		var element = document.getElementById("createResult");
		if (xmlhttp.readyState == 4) {
			consoleService.logStringMessage("createIssue xmlhttp.status: " + xmlhttp.status);
			consoleService.logStringMessage("createIssue xmlhttp.responseText: " + xmlhttp.responseText || null);
			if ( xmlhttp.status == 201 ) {
				var response = JSON.parse(xmlhttp.responseText);
				//consoleService.logStringMessage("createIssue response.key "+response.key);
				var message = strbundle.formatStringFromName("wizard.create.success",[response.key],1);
				var label = document.createElement("description");
				label.setAttribute("class","header");
				label.setAttribute("style","font-size: 16px;");
				document.getElementById("createResult").appendChild(label);
				var messageNode = document.createTextNode(message);
				label.appendChild(messageNode);
				var button = document.createElement("button");
				button.setAttribute("flex", "1");
				button.setAttribute("label",strbundle.GetStringFromName("wizard.success.open.issue"));
				button.addEventListener("click", function(e){openIssue(response.key);window.close();}, true);
				document.getElementById("createResult").appendChild(button);
				button = document.createElement("button");
				button.setAttribute("flex", "1");
				button.setAttribute("label",strbundle.GetStringFromName("wizard.success.answer.mail"));
				button.addEventListener("click", function(e){respondMail(response.key);window.close();}, true);
				document.getElementById("createResult").appendChild(button);
				button = document.createElement("button");
				button.setAttribute("flex", "1");
				button.setAttribute("label",strbundle.GetStringFromName("wizard.success.open.and.answer"));
				button.addEventListener("click", function(e){openIssue(response.key);respondMail(response.key);window.close();}, true);
				document.getElementById("createResult").appendChild(button);
				button = document.createElement("button");
				button.setAttribute("flex", "1");
				button.setAttribute("label",strbundle.GetStringFromName("wizard.success.setup.email"));
				button.addEventListener("click", function(e){window.openDialog("chrome://createjiraissue/content/options.xul", "chrome, titlebar, toolbar, dialog=yes, resizable=yes","paneSettingsReply");}, true);
				document.getElementById("createResult").appendChild(button);
				_updateHistoryIssues(response.key);
				if ( currentTempoAccountID != null && currentTempoAccountField != null ) {
					// TODO: call JIRA again to update the Account ID
					var updateData = '{"update":{"'+currentTempoAccountField+'":[{"set":"'+currentTempoAccountID+'"}]}}'
					updateTempoAccountID(response.self,updateData);
				}
				attachFiles(response.key);
			} else {
				if ( xmlhttp.status == 400 ) {
					consoleService.logStringMessage("createIssue got a 400 ");
					var response = JSON.parse(xmlhttp.responseText);
					var errorMessages = response.errorMessages;
					var errorMessage = "";
					var sep = "";
					if ( errorMessages != null ) {
						for ( var i = 0 ; i < errorMessages.length; i++ ) {
							errorMessage = errorMessage + sep + errorMessages[i];
							sep = "\n";
						}
					}
					var errors = response.errors;
					if ( errors != null ) {
						for ( var field in errors ) {
							errorMessage = field + " : " + errors[field];
						}
					}
					var message = strbundle.formatStringFromName("wizard.create.failure",[errorMessage],1);
					var textbox = document.createElement("textbox");
					textbox.setAttribute("multiline","true");
					textbox.setAttribute("value",message);
					textbox.setAttribute("readonly","true");
					textbox.setAttribute("rows","10");
					textbox.setAttribute("cols","30");
					element.appendChild(textbox);
				} else {
					alert("URL: " + url +" Error ->" + xmlhttp.status + " " + xmlhttp.statusText);
				}
			}
		}
		rightstatus.setAttribute("label",strbundle.GetStringFromName("wizard.status.done"));
		progressstatus.setAttribute("mode","determined");
		progressstatus.setAttribute("value","100");
	};
}

function updateTempoAccountID(url,text){
	var xmlhttp = new XMLHttpRequest();
	var username = window.arguments[0].username;
	var password = window.arguments[0].password;
	var credentials = btoa(username + ":" + password);
	xmlhttp.open("PUT", url, true, username, password);
	xmlhttp.setRequestHeader('Content-Type', 'application/json');
	xmlhttp.setRequestHeader("Authorization","Basic " + credentials);
	xmlhttp.setRequestHeader("User-Agent","");
	//consoleService.logStringMessage("createIssue json: " + text);
	// _addDebugJSON(text);
	xmlhttp.send(text);
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4) {
			//consoleService.logStringMessage("updateTempoAccountID xmlhttp.status: " + xmlhttp.status);
			//consoleService.logStringMessage("updateTempoAccountID xmlhttp.responseText: " + xmlhttp.responseText);
			if ( xmlhttp.status == 201 ) {
				var response = JSON.parse(xmlhttp.responseText);
				consoleService.logStringMessage("updateTempoAccountID response "+response);
			} else if ( xmlhttp.status == 204 ) {
				consoleService.logStringMessage("updateTempoAccountID update succeeded ");
			} else {
				if ( xmlhttp.status == 400 ) {
					consoleService.logStringMessage("updateTempoAccountID got a 400 ");
					var response = JSON.parse(xmlhttp.responseText);
					var errorMessages = response.errorMessages;
					var errorMessage = "";
					var sep = "";
					if ( errorMessages != null ) {
						for ( var i = 0 ; i < errorMessages.length; i++ ) {
							errorMessage = errorMessage + sep + errorMessages[i];
							sep = "\n";
						}
					}
					var errors = response.errors;
					if ( errors != null ) {
						for ( var field in errors ) {
							errorMessage = field + " : " + errors[field];
						}
					}
					var message = strbundle.formatStringFromName("wizard.create.failure",[errorMessage],1);
					var textbox = document.createElement("textbox");
					textbox.setAttribute("multiline","true");
					textbox.setAttribute("value",message);
					textbox.setAttribute("readonly","true");
					textbox.setAttribute("rows","10");
					textbox.setAttribute("cols","30");
					element.appendChild(textbox);
				} else {
					alert("URL: " + url +" Error ->" + xmlhttp.status + " " + xmlhttp.statusText);
				}
			}
		}
	}
}

function _getStringField(field, key, type, multiline){
//	consoleService.logStringMessage("_getStringField start field: " +  field + " key: " + key + " type: " + type + " multine: " + multiline);
	if ( key == "description" || key == "environment" || _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:textarea" || multiline == true ) {
		return _getMultiLineStringField(field, key, type);
	} else {

		return _getSingleLineStringField(field, key, type);
	}
}

function _getMultiLineStringField(field, key, type) {
//	consoleService.logStringMessage("_getMultiLineStringField start field: " +  field + " key: " + key + " type: " + type);
	var tempField = document.createElementNS("http://www.w3.org/1999/xhtml","html:textarea");
	tempField.value = "";
	tempField.setAttribute("spellcheck","true");
	tempField.setAttribute("rows","8");
	tempField.setAttribute("newlines","pasteintact");
	if ( key == "description" ) {
		var tmpVbox = document.createElement("vbox");
		tmpVbox.setAttribute("flex","true");
		var tmpHbox = document.createElement("hbox");
		tmpHbox.setAttribute("flex","true");
		var tmpLabel = document.createElement("label");
		tmpLabel.setAttribute("value",strbundle.GetStringFromName("wizard.add.email.header.option"));
		tmpHbox.appendChild(tmpLabel);
		var tmpMenulist = document.createElement("menulist");
		tmpMenulist.setAttribute("name","_pfx_"+key);
		tmpMenulist.setAttribute("id","_pfx_"+key);
		var tmpMenupopup = document.createElement("menupopup");
		var options = {"none":"","plain":window.arguments[0].issueDescriptionPrefix,"wiki":window.arguments[0].issueDescriptionPrefixWiki};
		for (var okey in options){
			var tmpMenuitem = document.createElement("menuitem");
			tmpMenuitem.setAttribute("label",strbundle.GetStringFromName("wizard.add.email.header.option."+okey));
			tmpMenuitem.setAttribute("value",options[okey]);
			tmpMenuitem.setAttribute("id","_"+key+"_"+okey);
			tmpMenupopup.appendChild(tmpMenuitem);
		}
		tmpMenulist.appendChild(tmpMenupopup);
		tmpHbox.appendChild(tmpMenulist);
		tempField.value = window.arguments[0].issueDescription;
		tempField.setAttribute("rows","10");
		tempField.setAttribute("name","_"+key);
		tempField.setAttribute("id","_"+key);
		tmpVbox.appendChild(tmpHbox);
		tmpVbox.appendChild(tempField);
		tempField = tmpVbox;
	}
//	consoleService.logStringMessage("_getMultiLineStringField start tempField: " +  tempField);
	return tempField;
}

function _getSingleLineStringField(field, key, type) {
//	consoleService.logStringMessage("_getSingleLineStringField start field: " +  field + " key: " + key + " type: " + type);
	var tempField = document.createElement("textbox");
	tempField.setAttribute("value","");
	tempField.setAttribute("spellcheck","true");
	// this is a hack, dunno how to present the values for tempo
	if (( _saveAccess(field.schema, "custom") == "is.origo.jira.tempo-plugin:billingKeys" ) || (type == "account" && _saveAccess(field.schema, "custom") == "com.tempoplugin.tempo-accounts:accounts.customfield")) {
		tempField.setAttribute("spellcheck","false");
		var tempoUnsupported = strbundle.GetStringFromName("wizard.unsupported.tempo.fields");
		tempField.setAttribute("emptytext",tempoUnsupported);
		tempField.setAttribute("placeholder",tempoUnsupported);
	} else {
		if ( key == "summary" ) {
			//consoleService.logStringMessage("_getStringField @ summary " +  window.arguments[0].issueSubject);
			tempField.setAttribute("value",window.arguments[0].issueSubject);
		} else if ( key == "parent" && type == "issuelink" && _saveAccess(field.schema, "system") == "parent" ){
			// FIXME: we might write an autocomplete component here
			tempField.setAttribute("spellcheck","false");
			var enterIssueKey = strbundle.GetStringFromName("wizard.enter.issue.key");
			tempField.setAttribute("autocompletesearch","basic-autocomplete-issue");
			tempField.setAttribute("type","autocomplete");
			tempField.setAttribute("emptytext",enterIssueKey);
			tempField.setAttribute("placeholder",enterIssueKey);
		}
	}
//	consoleService.logStringMessage("_getSingleLineStringField start tempField: " +  tempField);
	return tempField;
}

function _getNumberField(field, key, type){
	var tempField = document.createElement("textbox");
	tempField.setAttribute("value","");
	tempField.setAttribute("type","number");
	if ( _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:float" ) {
		tempField.setAttribute("decimalplaces","5");
		tempField.setAttribute("decimalsymbol",prefs.getCharPref("decimalsep")); // does not really work, breaks the UI
		//consoleService.logStringMessage("field.name " + field.name + " is of type float " + tempField.getAttribute("decimalplaces") + " " + tempField.getAttribute("decimalsymbol"));
	}
	return tempField;
}

function _getDateField(field, key, type) {
	var tempField = document.createElement("datepicker");
	tempField.setAttribute("type","popup");
	return tempField;
}

function _getUserField(field, key, type, username, startTyping) {
	var tempField = document.createElement("textbox");
	tempField.setAttribute("autocompletesearch","rest-autocomplete-user");
	tempField.setAttribute("type","autocomplete");
	tempField.setAttribute("emptytext",startTyping);
	tempField.setAttribute("placeholder",startTyping);
	// field.autoCompleteUrl => /rest/api/latest/user/search?username=...
	if ( key == "reporter" ) {
		//consoleService.logStringMessage("key " + key + " username " + username);
		tempField.setAttribute("value",username);
	}
	return tempField;
}

function _getGroupField(field, key, type, startTyping) {
	// field.autoCompleteUrl => /rest/api/latest/groups/picker?query=...
	var tempField = document.createElement("textbox");
	tempField.setAttribute("autocompletesearch","rest-autocomplete-group");
	tempField.setAttribute("type","autocomplete");
	tempField.setAttribute("emptytext",startTyping);
	tempField.setAttribute("placeholder",startTyping);
	return tempField;
}

function _getArrayField(field, key, type) {
	var tempField = null;
	var allowedValues = field.allowedValues;
	//consoleService.logStringMessage("allowedValues " + allowedValues);
	// FIXME: array(com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes)
	if ( key == "versions" || key == "fixVersions" || key == "components" || _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:multiselect" || _saveAccess(field.schema, "custom") == "com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes" ) {
		tempField = _getMultiSelectField(field, key, type, allowedValues);
	} else { // ! versions || fixVersions || components
		tempField = _getSingleSelectField(field, key, type, allowedValues);
	}
	return tempField;
}

function _getSingleSelectField(field, key, type, allowedValues) {
	var tempField = null;

	// FIXME: string(com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons)
	tempField = document.createElement("menulist");
	var tempPopup = document.createElement("menupopup");
	var tempMenuItem = document.createElement("menuitem");
	tempMenuItem.setAttribute("label","");
	tempMenuItem.setAttribute("value","");
	tempPopup.appendChild(tempMenuItem);
	/*
	if ( type == "account" ) {
		consoleService.logStringMessage("allowedValue.length=" + allowedValues.length);
	}
	*/
	if ( allowedValues != null ) {
		for ( var j = 0; j < allowedValues.length; j++ ) {
			var allowedValue = allowedValues[j];
			//consoleService.logStringMessage("allowedValue (" + key + ") name: " + allowedValue.name + " value: " + allowedValue.value + " id: " + allowedValue.id);
			tempMenuItem = document.createElement("menuitem");
			if ( allowedValue.name != undefined ) {
				tempMenuItem.setAttribute("label",allowedValue.name);
			} else {
				tempMenuItem.setAttribute("label",allowedValue.value);
			}
			tempMenuItem.setAttribute("value",allowedValue.id);
			if ( allowedValue.description != null ) {
				tempMenuItem.setAttribute("description",allowedValue.description);
			}
			if ( allowedValue.iconUrl != null && allowedValue.iconUrl != "" ) {
				tempMenuItem.setAttribute("image",allowedValue.iconUrl);
			}
			tempPopup.appendChild(tempMenuItem);
		}
		tempField.setAttribute("editable","true");
	}
	tempField.appendChild(tempPopup);
	return tempField;
}

function _getMultiSelectField(field, key, type, allowedValues) {
	var tempField = null;
	if ( allowedValues != null && allowedValues.length > 0 ) {
		//consoleService.logStringMessage("creating listbox: allowedValues " + allowedValues);
		tempField = document.createElement("listbox");
		if ( allowedValues.length >= 5 ) {
			tempField.setAttribute("rows","5");
		} else {
			tempField.setAttribute("rows",allowedValues.length);
		}
		tempField.setAttribute("seltype","multiple");
		for (var j = 0; j < allowedValues.length; j++) {
			var allowedValue = allowedValues[j];
			var item = document.createElement("listitem");
			if ( allowedValue.name != undefined ) {
				item.setAttribute("label",allowedValue.name);
			} else {
				item.setAttribute("label",allowedValue.value);
			}
			item.setAttribute("value", allowedValue.id);
			if ( allowedValue.description != null ) {
				item.setAttribute("description",allowedValue.description);
			}
			if ( allowedValue.iconUrl != null && allowedValue.iconUrl != "" ) {
				item.setAttribute("image", allowedValue.iconUrl);
			}
			tempField.appendChild(item);
		}
	} else { // ! allowedValues.length = 0
		tempField = document.createElement("textbox");
		tempField.setAttribute("readonly","true");
	}
	return tempField;
}

function _getUnsupportedField(field, key, type){
	var tempField = document.createElement("textbox");
	tempField.setAttribute("readonly","true");
	return tempField;
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
	openUrl(url);
}

function respondMail(key){
	var url = window.arguments[0].jiraurl + "/browse/" + key;
	var from = window.arguments[0].from;

	try {
		var replyHeaderCreate = prefs.getCharPref("replyHeaderCreate");
		var replyBodyCreate = prefs.getCharPref("replyBodyCreate");
		var replyCC = prefs.getCharPref("replyCC");

		var subject = key + " " + window.arguments[0].issueSubject;
		if ( replyHeaderCreate != null && replyHeaderCreate != "" ) {
			replyHeaderCreate = replyHeaderCreate.replace(/\$key/g,key);
			replyHeaderCreate = replyHeaderCreate.replace(/\$url/g,url);
			replyHeaderCreate = replyHeaderCreate.replace(/\$subject/g,window.arguments[0].issueSubject);
			subject = escape(replyHeaderCreate);
		}
		var body = url;
		if ( replyBodyCreate != null && replyBodyCreate != "" ) {
			replyBodyCreate = replyBodyCreate.replace(/\$key/g,key);
			replyBodyCreate = replyBodyCreate.replace(/\$url/g,url);
			body = escape(replyBodyCreate);
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

function _getLDAPAddressbookField(field, key, type) {
	var vbox = document.createElement("vbox");
	var panel = document.createElement("panel");
	panel.setAttribute("id","_panel_" + key);
	panel.setAttribute("height","120px");
	panel.setAttribute("width","300px");
	vbox.appendChild(panel);
	var tree = document.createElement("tree");
	tree.setAttribute("id","_tree_" + key);
	tree.setAttribute("flex","1");
	tree.setAttribute("onselect","searchTreeSelected(event.target);");
	tree.setAttribute("treelines","false");
	tree.setAttribute("editable","false");
	tree.setAttribute("seltype","single");
	var treecols = document.createElement("treecols");
	var treecol = document.createElement("treecol");
	treecol.setAttribute("id","label");
	treecol.setAttribute("flex","1");
	treecol.setAttribute("primary","true");
	treecol.setAttribute("label",strbundle.GetStringFromName("wizard.ldap.search.result"));
	treecols.appendChild(treecol);
	tree.appendChild(treecols);
	var treechildren = document.createElement("treechildren");
	tree.appendChild(treechildren);
	panel.appendChild(tree);
	var textbox = document.createElement("textbox");
	textbox.setAttribute("id","_textbox_"+key); // FIXME: htmlquote key ?
	textbox.setAttribute("type","search");
	textbox.setAttribute("timeout","500");
	textbox.setAttribute("_key",key)
	textbox.addEventListener("command", _searchLDAPAdressbook );
	textbox.setAttribute("emptytext",strbundle.GetStringFromName("wizard.start.typing"));
	vbox.appendChild(textbox);

	return vbox;
}

/**
 * for the ldap addressbook: CWXTP-44
 */
function _searchLDAPAdressbook(event){
	var key = event.target.getAttribute("_key");
	var xmlhttp = new XMLHttpRequest();
	var jiraurl = window.arguments[0].jiraurl;
	var username = window.arguments[0].username;
	var password = window.arguments[0].password;
	var url = jiraurl + "/rest/ldap/1.0/search/" + event.target.getAttribute("_key") + "?query=" + event.target.value;
	var credentials = btoa(username + ":" + password);
	try {
		xmlhttp.open("GET", url, true, username, password);
		xmlhttp.setRequestHeader("Authorization", "Basic " + credentials);
		xmlhttp.setRequestHeader("Accept", "application/json");
		xmlhttp.setRequestHeader("Content-Type", "application/json; charset=utf-8");
		xmlhttp.send(null);
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					jsonSearchResults = JSON.parse(xmlhttp.responseText);
					_fillTree(event,key);
				} else {
					if (xmlhttp.status == 400) {
						var response = JSON.parse(xmlhttp.responseText);
						consoleService.logStringMessage("_searchLDAPAdressbook got a 400: "
										+ response);
					} else {
						alert("URL: " + url + " Error ->" + xmlhttp.status
								+ " " + xmlhttp.statusText);
					}
				}
			}
		};
	} catch (e) {
		alert("URL: " + url + " Error ->" + e);
	}
}

/**
 * for the ldap addressbook: CWXTP-44
 */
function _fillTree(event,key) {
	var panel = document.getElementById("_panel_" + key);
	var textbox = document.getElementById("_textbox_" + key);
	var vbox = document.getElementById(key);
	panel.openPopup(textbox, "after_start",0,0,false,false,event);
	panel.width = vbox.clientWidth - 8;
	var tree = document.getElementById("_tree_" + key);
	var treeView = {
		rowCount : jsonSearchResults.length,
		getCellText : function(row, column) {
			var result = "";
			if (column.id == "label") {
				result = jsonSearchResults[row].label;
			} else {
				result = jsonSearchResults[row].value[column.id];
			}
			return result;
		},
		getCellValue : function(row, column) {
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
}

/**
 * for the ldap addressbook: CWXTP-44
 */
function searchTreeSelected(target) {
	var _id = target.id;
	_id = _id.replace(/_tree_/,"");
	var tree = document.getElementById("_tree_" + _id);
	var panel = document.getElementById("_panel_" + _id);
	var textbox = document.getElementById("_textbox_" + _id);
	var idx = tree.currentIndex;
	var autocompleteFields = jsonSearchResults[idx].value;
	for (var fieldId in autocompleteFields) {
		var field = document.getElementById(fieldId);
		if (field != null && field != undefined){
			field.value = autocompleteFields[fieldId];
		}
	}
	panel.hidePopup();
	textbox.value = "";
}

function _getCreatemeta(){
	_getTempoAccountFieldValues();
}

function _getTempoAccountFieldValues(){
	//consoleService.logStringMessage("_getTempoAccountField start");
	// we need to fake allowedValue.name and allowedValue.id with the label and the value in order for the _getSingleSelectField function "to do the right thing" (tm)
	// so first fetch them from Tempo:
	/*
	 * Fetch project specific account types
	 */
	tempoAllowedValues = new Array(); // always reset values
	var xmlhttp = new XMLHttpRequest();
	var jiraurl = window.arguments[0].jiraurl;
	var username = window.arguments[0].username;
	var password = window.arguments[0].password;
	var url = jiraurl + "/rest/tempo-accounts/1/account/project/" + selectedProjectId;
	var credentials = btoa(username + ":" + password);
	try {
		xmlhttp.open("GET", url, true, username, password);
		xmlhttp.setRequestHeader("Authorization", "Basic " + credentials);
		xmlhttp.send(null);
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					var response = JSON.parse(xmlhttp.responseText);
					if (response != null) {
	 					for (var i = 0; i < response.length; i++) {
	 						var item = response[i];
	 						if ( item.global == false && item.status === "OPEN" ) {
	 							//consoleService.logStringMessage("_getTempoAccountField item " + item.name + " (" + item.key + ") " + item.id + " " + item.global + " " + item.status);
								var account = new Object();
								account.id = item.id;
								account.name = item.name + " (" + item.key + ")";
								tempoAllowedValues.push(account);
	 						}
						}
 					}
				} else {
					if (xmlhttp.status == 400) {
						var response = JSON.parse(xmlhttp.responseText);
						consoleService.logStringMessage("_getTempoAccountField got a 400: "
										+ response);
					} else {
						alert("URL: " + url + " Error ->" + xmlhttp.status
								+ " " + xmlhttp.statusText);
					}
				}
				_getTempoGlobalAccountFieldValues();
			}
		};
	} catch (e) {
		alert("URL: " + url + " Error ->" + e);
	}
	//consoleService.logStringMessage("_getTempoAccountField end");
}

function _getTempoGlobalAccountFieldValues(){
	//consoleService.logStringMessage("_getTempoGlobalAccountFieldValues start");
	var xmlhttp = new XMLHttpRequest();
	var jiraurl = window.arguments[0].jiraurl;
	var username = window.arguments[0].username;
	var password = window.arguments[0].password;
	var credentials = btoa(username + ":" + password);
	var url = jiraurl + "/rest/tempo-accounts/1/account";
	try {
		xmlhttp.open("GET", url, true, username, password);
		xmlhttp.setRequestHeader("Authorization", "Basic " + credentials);
		xmlhttp.send(null);
		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
				if (xmlhttp.status == 200) {
					var response = JSON.parse(xmlhttp.responseText);
					if (response != null) {
	 					for (var i = 0; i < response.length; i++) {
	 						var item = response[i];
	 						if ( item.global == true && item.status === "OPEN" ) {
	 							//consoleService.logStringMessage("_getTempoGlobalAccountFieldValues item " + item.name + " (" + item.key + ") " + item.id + " " + item.global + " " + item.status);
								var account = new Object();
								account.id = item.id;
								account.name = item.name + " (" + item.key + ")";
								tempoAllowedValues.push(account);
	 						}
						}
 					}
				} else {
					if (xmlhttp.status == 400) {
						var response = JSON.parse(xmlhttp.responseText);
						consoleService.logStringMessage("_getTempoAccountField got a 400: "
										+ response);
					} else {
						alert("URL: " + url + " Error ->" + xmlhttp.status
								+ " " + xmlhttp.statusText);
					}
				}
			}
			document.getElementById('createWizard').canAdvance = true;
		};
	} catch (e) {
		alert("URL: " + url + " Error ->" + e);
	}
	//consoleService.logStringMessage("_getTempoGlobalAccountFieldValues end");
}

/**
 * For debugging purposes only
 * @param text the JSON string to be printed
 */
function _addDebugJSON(text){
	var statusField = document.createElement("textbox");
	statusField.setAttribute("multiline","true");
	statusField.setAttribute("cols","80");
	statusField.setAttribute("rows","22");
	document.getElementById("createResult").appendChild(statusField);
	statusField.setAttribute("value",text);
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
		for (i=0;i<max;i++){
			item = selectedAttachments[i];
			//alert("item " + item);
			//alert("hasChildNodes " + item.hasChildNodes());
			var cells = item.getElementsByTagName("listcell");
			//alert("cells " + cells);
			selectedIds.push(cells[0].getAttribute("label"));
			names.push(cells[2].getAttribute("label"));
			mimeTypes.push(cells[4].getAttribute("label"));
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

/**
 * safely access an objects attribute
 *
 * @param object to check
 * @param attribute to check
 * @returns the value of the attribute if it exists; null otherwise
 */
function _saveAccess(object, attribute) {
	if ( object.hasOwnProperty(attribute) ) {
		return object[attribute];
	}
	return null;
}

function initWizard() {
//	consoleService.logStringMessage("initWizard: start");
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
	var wizard = document.getElementById("createWizard");
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
	loadData();
//	consoleService.logStringMessage("showPage1: end");
}

function showPage2() {
//	consoleService.logStringMessage("showPage2: start");
	loadFields();
//	consoleService.logStringMessage("showPage2: end");
}

function showPage3() {
//	consoleService.logStringMessage("showPage3: start");
	submitFields();
	createIssue();
//	consoleService.logStringMessage("showPage3: end");
}