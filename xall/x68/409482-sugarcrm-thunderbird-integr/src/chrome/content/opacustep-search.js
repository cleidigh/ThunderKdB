/*********************************************************************************
 * The contents of this file are subject to the Opacus Licence, available at
 * http://www.opacus.co.uk/licence or available on request.
 * By installing or using this file, You have unconditionally agreed to the
 * terms and conditions of the License, and You may not use this file except in
 * compliance with the License.  Under the terms of the license, You shall not,
 * among other things: 1) sublicense, resell, rent, lease, redistribute, assign
 * or otherwise transfer Your rights to the Software. Use of the Software
 * may be subject to applicable fees and any use of the Software without first
 * paying applicable fees is strictly prohibited.  You do not have the right to
 * remove Opacus copyrights from the source code.
 *
 * The software is provided "as is", without warranty of any kind, express or
 * implied, including but not limited to the warranties of merchantability,
 * fitness for a particular purpose and noninfringement. In no event shall the
 * authors or copyright holders be liable for any claim, damages or other
 * liability, whether in an action of contract, tort or otherwise, arising from,
 * out of or in connection with the software or the use or other dealings in
 * the software.
 *
 * Portions created by Opacus are Copyright (C) 2011 Mathew Bland, Jonathan Cutting
 * Opacus Ltd.
 * All Rights Reserved.
 ********************************************************************************/
function opacustepsearch(parent,searchSuggestion,subject){
	this.max_results = 5;
	this.parent = parent;
	this.searchSuggestion = searchSuggestion;
	this.searchString = '';
	this.subject = subject;
	this.searchWindow;
	this.selectedModules;
	this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
         .getService(Components.interfaces.nsIPrefService)
         .getBranch("extensions.opacustep.");
    this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
    var macro = this.prefs.getCharPref('casePrefix');
    macro = macro.replace(/[^\w]/, '.');
    var caseRegexString = opacustep.strings.GetStringFromName('caseRegex').replace('MACRO', macro);
    this.caseRegex = new RegExp(caseRegexString,'i');
	this.loginTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.allowEdit = false;
	this.ready = false;
	this.noClosedCases = false;
	this.noClosedOpps = false;
	this.myRelatedItemsOnly = false;
}

opacustepsearch.prototype.check = function(returnFunc,worker){
	function checkSession(onceMore){
		if(opacustep.session_id=='' || onceMore == true || worker.waitingForLogin == true){
			searchObject.loginTimer.cancel();
			if(opacustep.session_id != ''){
				onceMore = false;
			}
			var event = { notify: function(timer) {
				counter++;
				if(counter < 1000){
					checkSession(onceMore);
				} else {
					if(opacustep.debug){dump("opacustepsearch check function failure on line 48\n");}
					// Hide the status message as something's gone wrong
					opacustep.setStatus('hidden');
					opacustep.notifyUser('critical',opacustep.strings.GetStringFromName('notifyNoLogin'));
					return;
				}
			}}
			searchObject.loginTimer.initWithCallback(event,200,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
			return;
		}
		returnFunc(searchObject);
	};
	var onceMore = true;
	var searchObject = this;
	var counter = 0;
	checkSession(onceMore);
};


opacustepsearch.prototype.search = function(){
	this.searchWindow = window.openDialog("chrome://opacustep/content/opacustep-search.xul","","chrome,height=530,width=600,resizable=yes,dialog=no,titlebar,centerscreen");
	this.searchWindow.addEventListener('load', this.updateSearchField, false);
	this.searchWindow.searchObject = this;
};


opacustepsearch.prototype.onRearchive = function(cb) {
    if (cb.checked) {
        cb.ownerDocument.defaultView.searchObject.toggleAttachments('on');
    } else {
        cb.ownerDocument.defaultView.searchObject.toggleAttachments();
    }
};
        
opacustepsearch.prototype.toggleAttachments = function(direction) {
    direction = direction || 'off';
    if (opacustep.mails.length > 1) {
        direction = 'off';
    }
	var singleMail = opacustep.mails[0];
    if (direction == 'on') {
        if (singleMail.attachmentNames.length > 0) {
            this.searchWindow.document.getElementById('attachmentBox').hidden = false;
            this.searchWindow.document.getElementById('allattachments').selectAll();
            return;
        }
    }
    this.searchWindow.document.getElementById('allattachments').clearSelection();
    this.searchWindow.document.getElementById('attachmentBox').hidden = true;
};


opacustepsearch.prototype.autoArchiveSearch = function(searchObject){
	var mailObject = searchObject.mail;
	var select_fields;
	var searchString;
	var searchStringArray = mailObject.searchSuggestion.split(';');
	mailObject.worker.callback = searchObject.autoArchiveSearch_callback;
	mailObject.searchCalls = 0;
	if(opacustep.opacus_cases){
		try{
			var caseNumber = mailObject.subject.match(searchObject.caseRegex)[1];
			select_fields = new Array('id','case_number','name');
			mailObject.searchCalls++;
			mailObject.worker.search_by_module(caseNumber,new Array('Cases'),0,1,'',select_fields,mailObject);
		}
		catch(ex){}
	}
	
	select_fields = new Array("id","first_name","last_name","account_name","account_id");
	for(var j in searchStringArray){
		searchString = searchStringArray[j].toLowerCase().replace(/'/g,"\\'");
		if(opacustep.allowAddress(searchString)){
			mailObject.searchCalls++;
			mailObject.worker.search_by_module(searchString,new Array('Leads','Contacts'),0,1,'',select_fields,mailObject);
		}
	}

	if(mailObject.searchCalls == 0){
		searchObject.autoArchiveSearch_callback('',mailObject);
	}
};





opacustepsearch.prototype.autoArchiveSearch_callback = function(data,mailObject){
	var name,id,module,records,account_id,account_name;
	var peopleRecords = {};
	var contactFound = false;
	var personFound = false;
	if(typeof(data.entry_list) !== 'undefined' && typeof(data.entry_list[0]) !== 'undefined'){
		if(data.entry_list[0].name == 'Cases'){
			if(data.entry_list[0].records.length > 0){
				name = data.entry_list[0].records[0].case_number.value + ' '+
					data.entry_list[0].records[0].name.value;
				id = data.entry_list[0].records[0].id.value;
				if(mailObject.sugarObjects.indexOf('Cases:' + id) == -1){
					mailObject.sugarObjects.push('Cases:' + id);
					if(mailObject.sugarNames.indexOf(name) == -1){
						mailObject.sugarNames.push(name);
					}
				}
			}
		} else {
			personFound = false;
			contactFound = false;
			peopleRecords = {};
			for(var h in data.entry_list){
				module = data.entry_list[h].name;
				records = data.entry_list[h].records;
				if(records.length > 0){
					personFound = true;
					if(module == 'Contacts'){
						contactFound = true;
					}
					peopleRecords[module] = records[0];
				}
			}
			if(personFound){
				if(contactFound){
					module = 'Contacts';
				} else {
					module = 'Leads';
				}
				if(typeof(peopleRecords[module].first_name) !== 'undefined' && typeof(peopleRecords[module].last_name) !== 'undefined'){
					first_name = peopleRecords[module].first_name.value;
					last_name = peopleRecords[module].last_name.value;
					name = (first_name == '')? last_name : first_name + ' ' + last_name;
				} else if(typeof(peopleRecords[module].name) !== 'undefined'){
					name = peopleRecords[module].name.value;
				} else {
					name = '*****';
				}
				id = module + ':' + peopleRecords[module].id.value;
				if(mailObject.sugarObjects.indexOf(id) == -1){
					mailObject.sugarObjects.push(id);
					if(mailObject.sugarNames.indexOf(name) == -1){
						mailObject.sugarNames.push(name);
					}
				}
				if(module == 'Contacts'){
					if(typeof(peopleRecords[module].account_id) !== 'undefined'){
						account_id = peopleRecords[module].account_id.value;
						account_name = peopleRecords[module].account_name.value;
						if(account_id != ''){
							if(mailObject.sugarObjects.indexOf('Accounts:' + account_id) == -1){
								mailObject.sugarObjects.push('Accounts:' + account_id);
								if(mailObject.sugarNames.indexOf(account_name) == -1){
									mailObject.sugarNames.push(account_name);
								}
							}
						}
					}
				}
			}
		}
	}
	if(mailObject.searchCalls != 0){
		mailObject.searchCalls--;
	}
	if(mailObject.searchCalls == 0){
		if(mailObject.type == 'bulkauto'){
			opacustep.searchesReturned++;
			if(opacustep.searchesReturned == opacustep.totalBulkMails){
				opacustep.setStatus(opacustep.strings.GetStringFromName('autoArchiving') + " " + (opacustep.totalBulkMails - opacustep.totalMails) + "/"  + opacustep.totalBulkMails);
			} else {
				opacustep.setStatus(opacustep.strings.GetStringFromName('searching') + " " + opacustep.searchesReturned + "/"  + opacustep.totalBulkMails);
			}
		}
		if(mailObject.sugarObjects.length > 0){
			if(mailObject.direction == 'inbound'){
				mailObject.archiveMail();
			} else {
				mailObject.composeWindow.document.getElementById('opacustep-send-archive').disabled = false;
				mailObject.unixTime = Math.round(new Date().getTime() / 1000);
				mailObject.worker.callback = mailObject.archive_callback;
				mailObject.worker.archive(mailObject);
			}
			if(mailObject.type != 'bulkauto'){
				opacustep.setStatus('hidden');
				opacustep.notifyUser('auto',mailObject.subject + opacustep.strings.GetStringFromName('archivedTo') + mailObject.sugarNames.join("\n").replace(/&#039;/g,"'"));
				opacustep.wrapUp(mailObject);
			}
		} else {
			if(mailObject.type == 'auto' && mailObject.direction == 'inbound'){
				if(opacustep.opacus_notify && mailObject.displayRecipients === false){
					opacustep.notifyUser('newmail',mailObject.subject + "\n" + mailObject.author);
				}
				opacustep.setStatus('hidden');
			}
			if(mailObject.type == 'auto' && mailObject.direction == 'outbound'){
				opacustep.setStatus('hidden');
				opacustep.sendAndArchiveStatus = 'unknown';
				opacustep.notifyUser('notify',opacustep.strings.GetStringFromName('noAuto') + mailObject.searchSuggestion.replace(/&#039;/g,"'"));
				mailObject.composeWindow.document.getElementById('opacustep-send-archive').disabled = false;
				mailObject.composeWindow.GenericSendMessage.apply();
			}
			if(mailObject.type == 'bulkauto'){
				opacustep.totalMails--;
				opacustep.bulkNoArchived++;
				if(opacustep.bulkNoArchived == opacustep.mails.length){
					opacustep.setStatus('hidden');
				}
			}
		}
	}
};


opacustepsearch.prototype.updateSearchField = function(){
	this.document.getElementById('searchField').value = this.searchObject.searchSuggestion;
	this.document.getElementById('searchField').focus();
	this.searchObject.updateFields();
	if(opacustep.searchOnOpen){
		this.document.getElementById('searchButton').click();
	}
	if(opacustep.windows){
		this.document.getElementById('opacusSearchButtons').className = 'opacusBoxReverse';
	}
};

opacustepsearch.prototype.setPreference = function(name,value){
	this.prefs.setCharPref(name, JSON.stringify(value));
};

opacustepsearch.prototype.searchWindowClose = function(){
	this.setPreference("sugarcrm_selectedmodules",this.getSelectedModules());
	this.searchWindow.close();
	return true;
};

opacustepsearch.prototype.updateFields = function(){
	this.ready = true;
	try
	{
		this.selectedModules = JSON.parse(this.prefs.getCharPref("sugarcrm_selectedmodules"));
	}
	catch(ex){
	}

    
    var moduleList = this.searchWindow.document.getElementById('moduleList');
	for(var i in opacustep.searchableModules)
	{
		var row = document.createElement('richlistitem');
        row.value = opacustep.searchableModules[i];

        var label = document.createElement('label');
        label.value = opacustep.moduleLabels[opacustep.searchableModules[i]];

		moduleList.appendChild(row);
        row.appendChild(label);
		for(var j in this.selectedModules){
			if(this.selectedModules[j] == opacustep.searchableModules[i]){
                moduleList.addItemToSelection(row);
			}
		}
	}
	var singleMail = opacustep.mails[0];
	if(this.allowEdit){
		// If we're allowing edit and the mail has it's html/plain body (if not we'll set it in the mime callback)
		if(singleMail.fieldsSet){
			this.searchWindow.document.getElementById('opacusSearchTabs').hidden = false;
			this.setEditFields(singleMail);
		}
	} else {
		this.searchWindow.document.getElementById('doAttachments').hidden = false;
	}
	if(singleMail.email_id !== false){
		this.searchWindow.document.getElementById('forceRearchive').hidden = false;
        this.toggleAttachments('off');
	}
	if(this.searchWindow.document.getElementById('advancedSettings').hidden === false){
		this.searchWindow.document.getElementById('advancedToggle').value = opacustep.strings.GetStringFromName('hideAdvanced');
	}
};


opacustepsearch.prototype.setEditFields = function(singleMail){	
	var editor = this.searchWindow.document.getElementById('opacusEditmail');
	var plainEditor = this.searchWindow.document.getElementById('opacusEditPlainmail');
	var list = this.searchWindow.document.getElementById('allattachments');
	this.searchWindow.document.getElementById('opacusEditSubject').value = singleMail.subject;
	if(singleMail.html == ''){
		editor.hidden = true;
		plainEditor.hidden = false;
		plainEditor.value = singleMail.plain;
	} else {
		var heditor = editor.getHTMLEditor(editor.contentWindow);
		heditor.insertHTML(singleMail.html);
		singleMail.origHtml = editor.contentDocument.documentElement.innerHTML;
	}
	for (var i in singleMail.attachmentNames) {
		var row = document.createElement('richlistitem');
        var label = document.createElement('label');
        label.value = singleMail.attachmentNames[i];
        row.value = singleMail.attachmentNames[i];
		list.appendChild(row);
		row.appendChild(label);
	}
    list.selectAll();
    this.toggleAttachments('on');
};

opacustepsearch.prototype.getSelectedModules = function(){	
	var items = this.searchWindow.document.getElementById('moduleList').selectedItems;
	var return_array = [];
    if (items !== null) {
        for(var i in items){
            if (items[i].value) {
                return_array.push(items[i].value);
            }
        }
    }
	return return_array;
};


opacustepsearch.prototype.performSearch = function(){
	this.check(this.runSearch,opacustep.webservice);
};

opacustepsearch.prototype.runSearch = function(searchObject){
	// init
	opacustep.searchObject.searchWindow.document.getElementById('accSearch').hidden = true;
	opacustep.searchChildren=0;
	var enhancedSearchByNumber;
	var defaultSearchByNumber;
	var default_query;
	var enhanced_query;
	var selectedModules = searchObject.getSelectedModules();
	searchObject.max_results = 5;
	var select_fields = new Array("id","first_name","last_name","account_name","name","case_number","account_id","converted");
	var link_fields = new Array("id","name","date_modified","status","account_name","sales_stage","assigned_user_id","case_number");
	var order_by = 'date_modified DESC';
	var ea_query;

	// Advanced filter settings
	searchObject.noClosedCases = searchObject.searchWindow.document.getElementById('noClosedCases').checked;
	searchObject.noClosedOpps = searchObject.searchWindow.document.getElementById('noClosedOpps').checked;
	searchObject.myRelatedItemsOnly = searchObject.searchWindow.document.getElementById('myrelateditemsonly').checked;

	// Get search and settings from xul doc
	searchObject.searchString = searchObject.searchWindow.document.getElementById('searchField').value;
	searchObject.searchWindow.document.getElementById('feedback').removeAttribute('hidden');
	searchObject.searchWindow.document.getElementById('searchButton').setAttribute('label',opacustep.strings.GetStringFromName('searching'));
	searchObject.searchString = searchObject.searchString.toLowerCase().replace(/'/g,"\\'");

	// Clear results from prior searches
	var resultList = searchObject.searchWindow.document.getElementById('resultList');
	while(resultList.childNodes.length >= 1){
        	resultList.removeChild( resultList.lastChild );
	}

	var searchStrings = searchObject.searchString.split(';');
	searchObject.max_results = Math.floor(searchObject.max_results / searchStrings.length) + 1;

	var sbmModules = new Array();
	if(selectedModules.indexOf('Leads') != -1){
		sbmModules.push('Leads');
	}
	if(selectedModules.indexOf('Contacts') != -1){
		sbmModules.push('Contacts');
	}
	if(selectedModules.indexOf('Accounts') != -1){
		sbmModules.push('Accounts');
	}

	opacustep.webservice.callback = searchObject.displayResults;

	for(var i in searchStrings){
		contact_link_modules = new Array();
		lead_link_modules = new Array();
		getEntryListQueries = {};
		if(/^[A-Z0-9._%+\\'-]+@[%A-Z0-9.-]+$/i.test(searchStrings[i])){
			if(sbmModules.length > 0){
				opacustep.searchChildren++;
				opacustep.webservice.search_by_module(searchStrings[i],sbmModules,0,searchObject.max_results,'',select_fields,'search_by_module');
			}
			for(var j in selectedModules){
				if(selectedModules[j] != 'Contacts' && selectedModules[j] != 'Leads' && selectedModules[j] != 'Accounts'){
					var module = selectedModules[j];
					var link_name = module.toLowerCase();
					if(opacustep.contactLinks.indexOf(link_name) != -1){
						contact_link_modules.push({"name":link_name,"value":link_fields});
					}
					if(opacustep.leadLinks.indexOf(link_name) != -1){
						lead_link_modules.push({"name":link_name,"value":link_fields});
					}
				}
				// Handle case where project tasks are being searched for but not projects
				if(selectedModules[j].toLowerCase() == 'projecttask' && selectedModules.indexOf('Project') == -1){
					contact_link_modules.push({"name":"project","value":link_fields});
				}
				if (selectedModules[j].toLowerCase() == 'cases') {
					if (opacustep.opacus_cases) {
						try {
							var caseNumber = searchObject.subject.match(searchObject.caseRegex)[1];
                            if (caseNumber) {
                                opacustep.searchChildren++;
                                opacustep.webservice.get_entry_list(
                                    'Cases',
                                    "cases.case_number='" + caseNumber + "'",
                                    order_by,
                                    "0",
                                    select_fields,
                                    new Array(),
                                    1,
                                    "0",
                                    'get_entry_list_simple'
                                );
                            }
						}
						catch(ex){}
					}
				}
			}
			if(contact_link_modules.length > 0){
				ea_query = "contacts.id in (select eabr.bean_id from email_addr_bean_rel eabr"+
							" inner join email_addresses ea on eabr.email_address_id = ea.id where eabr.bean_module = 'Contacts'"+
							" and ea.email_address_caps = '"+searchStrings[i].toUpperCase() +"' and eabr.deleted='0' and ea.deleted='0')";
				opacustep.searchChildren++;
				opacustep.webservice.get_entry_list("Contacts",ea_query,order_by,"0",select_fields,contact_link_modules,searchObject.max_results,"0",'get_entry_list_complex');
			}
			if(lead_link_modules.length > 0){
				ea_query = "leads.id in (select eabr.bean_id from email_addr_bean_rel eabr"+
							" inner join email_addresses ea on eabr.email_address_id = ea.id where eabr.bean_module = 'Leads'"+
							" and ea.email_address_caps = '"+searchStrings[i].toUpperCase()+"' and eabr.deleted='0' and ea.deleted='0')";
				opacustep.searchChildren++;
				opacustep.webservice.get_entry_list("Leads",ea_query,order_by,"0",select_fields,lead_link_modules,searchObject.max_results,"0",'get_entry_list_complex');
			}
		} else {
			for(var k in selectedModules){
				module = selectedModules[k];
				module_lowercase = selectedModules[k].toLowerCase();
				if(module_lowercase =='projecttask'){
					module_lowercase = 'project_task';
				}
				var searchArray = searchStrings[i].split(' ');
				if(!searchArray[1]){
					if(module == 'Contacts' || module == 'Leads'){
						default_query = module_lowercase + ".first_name LIKE '" + searchStrings[i].replace(/^\s+|\s+$/g,"") + "%' OR " +
							module_lowercase + ".last_name LIKE '" + searchStrings[i].replace(/^\s+|\s+$/g,"") + "%'";
					} else {
						default_query = module_lowercase+".name LIKE '"+searchStrings[i].replace(/^\s+|\s+$/g,"") +"%'";
					}
				} else {
					switch(module_lowercase){
						case 'contacts':
						case 'leads':
							default_query = module_lowercase+".last_name LIKE '"+searchArray[1].replace(/^\s+|\s+$/g,"") +"%' AND "+module_lowercase+
							".first_name LIKE '"+searchArray[0].replace(/^\s+|\s+$/g,"")+"%'";
							break;
						default:
							default_query = module_lowercase+".name LIKE '"+searchStrings[i].replace(/^\s+|\s+$/g,"") +"%'";
					}
				}
				if(module == 'Cases') {
					if(opacustep.opacus_cases){
						try{
							var caseNumber = searchObject.subject.match(searchObject.caseRegex)[1];
							default_query += " OR (cases.case_number = '" + caseNumber + "')";
						}
						catch(ex){
                            opacustep.console.logStringMessage(ex);
							default_query += " OR (cases.case_number LIKE '" + searchStrings[i] + "%')";
						}
					} else {
						default_query += " OR (cases.case_number LIKE '" + searchStrings[i] + "%')";
					}
				}
				// Advanced filters
				if(searchObject.myRelatedItemsOnly && module != 'Contacts' && module != 'Leads' && module != 'Accounts'){
					default_query = "(" + default_query;
					default_query += ") AND "+module_lowercase+".assigned_user_id='"+opacustep.user_id+"'";
				}
				if(searchObject.noClosedCases && module == 'Cases'){
					default_query = "(" + default_query;
					default_query += ") AND "+module_lowercase+".status NOT LIKE 'closed%'";
				}
				if(searchObject.noClosedOpps && module == 'Opportunities'){
					default_query = "(" + default_query;
					default_query += ") AND "+module_lowercase+".sales_stage NOT LIKE 'closed%'";
				}
				if(opacustep.ignoreConverted && module == 'Leads'){
					default_query = "(" + default_query + ") AND leads.converted='0'";
				}
				opacustep.searchChildren++;
				opacustep.webservice.get_entry_list(module,default_query,order_by,"0",select_fields,new Array(),searchObject.max_results,"0",'get_entry_list_simple');
			}
		}
	}
	if(opacustep.searchChildren == 0){
		opacustep.searchChildren++;
		searchObject.displayResults('','');
	}
};


opacustepsearch.prototype.handleProjectTasks = function(records){
	var select_fields = new Array("id","name");
	var ids = new Array();
	for(var i in records){
		ids.push(records[i].link_value.id.value);
	}
	var query = "project_task.project_id IN ('" + ids.join("','") + "')";
	opacustep.searchChildren++;
	opacustep.webservice.callback = opacustep.searchObject.displayResults;
	opacustep.webservice.get_entry_list('ProjectTask',query,'date_modified DESC',"0",select_fields,new Array(),opacustep.searchObject.max_results,"0",'get_entry_list_simple');
}

opacustepsearch.prototype.accountSearch = function(searchObject){
	var select_fields = new Array("id","name","date_modified","status","account_name","sales_stage","assigned_user_id","case_number");
	var acId = searchObject.searchWindow.document.getElementById('openInSugar').firstChild.id;
	var acIdArr = acId.split(':');
	var accountId = acIdArr[1];
	opacustep.searchChildren=0;
	var selectedModules = searchObject.getSelectedModules();
	searchObject.max_results = 6;
	var order_by = 'date_modified DESC';
	var module, link_name, query;
	var account_link_modules = new Array();

	// Advanced filter settings
	searchObject.noClosedCases = searchObject.searchWindow.document.getElementById('noClosedCases').checked;
	searchObject.noClosedOpps = searchObject.searchWindow.document.getElementById('noClosedOpps').checked;
	searchObject.myRelatedItemsOnly = searchObject.searchWindow.document.getElementById('myrelateditemsonly').checked;

	searchObject.searchWindow.document.getElementById('feedback').removeAttribute('hidden');
	searchObject.searchWindow.document.getElementById('searchButton').disabled=true;
	searchObject.searchWindow.document.getElementById('searchButton').setAttribute('label',opacustep.strings.GetStringFromName('searching'));
	var resultList = searchObject.searchWindow.document.getElementById('resultList');

	for(var j in selectedModules){
		if(selectedModules[j] != 'Leads' && selectedModules[j] != 'Accounts'){
			module = selectedModules[j];
			link_name = module.toLowerCase();
			if(link_name == 'projecttask'){
				link_name = 'project_task';
			}
			if(opacustep.accountLinks.indexOf(link_name) != -1){
				account_link_modules.push({"name":link_name,"value":select_fields});
			}
			// Handle case where project tasks are being searched for but not projects
			if(selectedModules[j].toLowerCase() == 'projecttask' && selectedModules.indexOf('Project') == -1){
				account_link_modules.push({"name":"project","value":select_fields});
			}
		}
	}
	if(account_link_modules.length > 0){
		query = "accounts.id = '"+accountId +"'";
		opacustep.webservice.callback = searchObject.displayResults;
		opacustep.searchChildren++;
		opacustep.webservice.get_entry_list("Accounts",query,order_by,"0",new Array('id'),account_link_modules,searchObject.max_results,"0",'get_entry_list_complex');
	}
};

opacustepsearch.prototype.displayResults = function(data,callType){
	var selectedModules = opacustep.searchObject.getSelectedModules();
	var module, records, extraAc, link, record, resultArray;
	if(opacustep.searchObject.searchWindow.document == null){
		return;
	}

	opacustep.searchChildren--;
	if(opacustep.searchChildren == 0){
			opacustep.searchObject.searchWindow.document.getElementById('feedback').setAttribute('hidden','true');
			opacustep.searchObject.searchWindow.document.getElementById('searchButton').disabled=false;
			opacustep.searchObject.searchWindow.document.getElementById('searchButton').setAttribute('label',opacustep.strings.GetStringFromName('search'));
			opacustep.searchObject.searchWindow.document.getElementById('accSearch').hidden = false;

	}
	if(typeof(data.entry_list) !== 'undefined' && typeof(data.entry_list[0]) !== 'undefined'){
		var resultList = opacustep.searchObject.searchWindow.document.getElementById('resultList');
		switch(callType){
			case "get_entry_list_simple":
				if(data.entry_list.length > 0){
					module = data.entry_list[0].module_name;
					opacustep.searchObject.createParentListNode(resultList,module);
					data.entry_list.reverse();
					for(var i = 0; i < data.entry_list.length; i++){
						opacustep.searchObject.createListNode(resultList,module,data.entry_list[i].name_value_list);
					}
				}
				break;
			case "search_by_module":
				for(var h in data.entry_list){
					extraAc = new Array();
					resultArray = new Array();
					module = data.entry_list[h].name;
					records = data.entry_list[h].records;
					for(var d in records){
						if(module == 'Leads' && opacustep.ignoreConverted){
							if(typeof(records[d].converted) !== 'undefined' && records[d].converted.value == '1'){
								continue;
							}
						}
						if(module == 'Contacts' && typeof(records[d].account_id) !== 'undefined' && records[d].account_id.value != '' && typeof(records[d].account_name) !== 'undefined'){
							extraAc.push({"name":{"value":records[d].account_name.value},"id":{"value":records[d].account_id.value}});
						}
						resultArray.push(records[d]);
					}		
					if(resultArray.length > 0){	
						opacustep.searchObject.createParentListNode(resultList,module);
					}
					for(var i in resultArray){				
						opacustep.searchObject.createListNode(resultList,module,resultArray[i]);
					}
					if(extraAc.length > 0 && selectedModules.indexOf('Accounts') != -1){
						opacustep.searchObject.createParentListNode(resultList,'Accounts');
						for(var j in extraAc){
							opacustep.searchObject.createListNode(resultList,'Accounts',extraAc[j]);
						}
					}
				}
			case "get_entry_list_complex":
				if(typeof(data.relationship_list) !== 'undefined' && typeof(data.relationship_list[0].link_list) !== 'undefined'){
					var convDate = function(sqlDate){
						var sqlA = sqlDate.split(' ');
						var dateA = sqlA[0].split('-');
						if(sqlA.length > 1){
							var timeA = sqlA[1].split(':');
						} else {
							var timeA = new Array('00','00','00');
						}
						var datum = new Date(dateA[0],dateA[1]-1,dateA[2],timeA[0],timeA[1],timeA[2]);
						return datum.getTime();
					}
					var compDate = function(a,b){
						if(a.timestamp > b.timestamp){
							return -1;
						} else if(a.timestamp < b.timestamp){
							return 1;
						}
						return 0;
					}


					for(var k in data.relationship_list[0].link_list){
						resultArray = new Array();
						link = data.relationship_list[0].link_list[k].name;
						module = link.charAt(0).toUpperCase() + link.slice(1);
						records = data.relationship_list[0].link_list[k].records;
						if(records.length > 0){
							if(link == 'project' && selectedModules.indexOf('ProjectTask') != -1){
								opacustep.searchObject.handleProjectTasks(records);
							}
							if(module == 'Project' && selectedModules.indexOf('Project') == -1){
								continue;
							}
							for(var m in records){
								record = records[m].link_value;
								if(opacustep.searchObject.noClosedCases && module == 'Cases' && record.status.value == 'Closed'){
									continue;
								}
								if(opacustep.searchObject.myRelatedItemsOnly && record.assigned_user_id.value != opacustep.user_id){
									continue;
								}
								if(opacustep.searchObject.noClosedOpps && module == 'Opportunities' && record.sales_stage.value.indexOf('Closed') != -1){
									continue;
								}
								record.timestamp = convDate(record.date_modified.value)/1000;
								resultArray.push(record);
							}
							resultArray.sort(compDate);
							resultArray.splice(opacustep.searchObject.max_results);
							resultArray.reverse();
							if(resultArray.length > 0){
								opacustep.searchObject.createParentListNode(resultList,module);
								for(var n in resultArray){
									opacustep.searchObject.createListNode(resultList,module,resultArray[n]);
								}
							}
						}
					}
				}
			default:
		}
	}
};

opacustepsearch.prototype.createParentListNode = function(resultBox,module)
{
	var module_lowercase = module.toLowerCase();
	var id = module_lowercase+"ParentNode";
	if(opacustep.searchObject.searchWindow.document.getElementById(id) == null ){
		var labelText = opacustep.moduleLabels[module];
		var row = document.createElement('richlistitem');
        row.style.padding = '4px';
        row.style.borderBottom = '1px solid #BBB';
		var label = document.createElement('label');
        label.setAttribute('value', labelText);
		row.setAttribute('id',id);
        var span = document.createElement('html:span');
        span.className = 'moduleIcon moduleIcon' + module;
        span.appendChild(document.createTextNode(module.slice(0,2)));
        row.appendChild(span);
		row.appendChild(label);
		resultBox.appendChild(row);
        row.disabled = true;
	}
	return false
};

opacustepsearch.prototype.createListNode = function(resultBox,module,record)
{
	var id = record.id.value;
	if(opacustep.searchObject.searchWindow.document.getElementById(module + ':' + id) == null ){
		var tooltiptext = '';
		var module_lowercase = module.toLowerCase();
		var label = '';
		if(typeof(record.account_name) !== 'undefined'){
			tooltiptext = record.account_name.value.replace(/^\s\s*/,'').replace(/\s\s*$/,'').substring(0,100);
		}
		if(typeof(record.name) !== 'undefined'){
			label = record.name.value;
		// If we've not got a name we'll have a last_name ergo person object
		} else if(typeof(record.last_name) !== 'undefined'){
			var first_name = (record.first_name.value !='') ? record.first_name.value + ' ' : '(...) ';
			label = first_name + record.last_name.value;
		// and if we've not got either we must be in a parallel universe so reward user with 5 stars
		} else {
			label = '*****';
		}
		if(module == 'Cases'){
			if(typeof(record.case_number) !== 'undefined'){
				label = record.case_number.value + " " + label;
			}
		}
		var row = document.createElement('richlistitem');
        var icon = document.createElement('image', {'src':'chrome://opacustep/content/images/edit_inline.png'});
        var recordName = document.createElement('label');
		recordName.value = '  ' + label.replace(/^\s\s*/,'').replace(/\s\s*$/,'').replace(/&#039;/g,"'").replace(/&quot;/g,'"');
		row.setAttribute('allowevents','true');
		row.setAttribute('tooltiptext',tooltiptext);
        row.id = module + ':' + id;
		var onCellEvent = function(event){opacustep.quickEdit(this.id + ":searchResults");};
		switch(module){
			case 'Accounts':
				row.setAttribute('context','accSearch');
                icon.addEventListener('click', onCellEvent);
				break;
			case 'Leads':
			case 'Contacts':
			case 'Bugs':
			case 'Cases':
			case 'Opportunities':
				row.setAttribute('context','quickEdit');
                icon.addEventListener('click', onCellEvent);
				break;
			default:
				row.setAttribute('context','openInSugar');
		}
		var onRowEvent = function(event){if(event.button == 2 || (typeof(event.keyCode) !== 'undefined' && event.keyCode == 93)){opacustep.searchObject.searchWindow.document.getElementById("openInSugar").firstChild.id = this.id + ":searchResults";}};
		row.addEventListener('click',onRowEvent);
		row.addEventListener('keydown',onRowEvent);

		row.appendChild(recordName);
		row.appendChild(icon);
		if(opacustep.searchObject.searchWindow.document.getElementById(module_lowercase + 'ParentNode').nextSibling == null){
			resultBox.appendChild(row);
		} else {
			resultBox.insertBefore(row,opacustep.searchObject.searchWindow.document.getElementById(module_lowercase+'ParentNode').nextSibling)
		}
	}
	return false;
};

