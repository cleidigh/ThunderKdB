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
// New Sugar Object
function opacustepPrefs(optionsWindow){
	this.applyWindow = null;
	this.cryptpassword = '';
	this.ldap = '';
	this.password = '';
	this.sugarurl = '';
	this.username = '';
	this.identifier = '';
	this.allModules = [];
	this.prefdoc			= typeof(optionsWindow) !== 'undefined'? optionsWindow.document : null;
	this.loginTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.checkTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.worker = '';
	this.customModules = JSON.parse(opacustep.prefs.getCharPref('sugarcrm_custom_modules'));
    if (this.prefdoc !== null) {
	    this.refreshCustomModules(this.customModules);
    }
}

opacustepPrefs.prototype.checkLicence = function(optionsDoc){
	if(opacustep.keyFlag){
		return;
	}
	opacustep.keyFlag = true;
	this.checkTimer.cancel();
	var timerEvent = { notify: function(timer) {
		opacustep.keyFlag = false;
		opacustep.licence_key = optionsDoc.getElementById("textopacus_licence_key").value
            .replace(/^\s\s*/,'').replace(/\s\s*$/,'');
		var url = optionsDoc.getElementById("textsugarcrm_url").value.replace(/\/$/,'').toLowerCase();
		var username = optionsDoc.getElementById("textsugarcrm_username").value.toLowerCase();
		var text = opacustep.strings.getString('licenceExpired');
		if(opacustep.licence.check(url,username)) {
			var year = opacustep.expDate.toString().substring(0,4);
			var month = opacustep.expDate.toString().substring(4,6);
			var day = opacustep.expDate.toString().substring(6,8);
			text = opacustep.strings.getString('licenceValid') + " " + year + "-" + month + "-" + day;
		}
		if(username === '' || url === ''){
			text = opacustep.strings.getString('licenceWarning');
		}
		var label = optionsDoc.getElementById('licence_feedback');
		try{
			label.removeChild(label.firstChild);
		}
		catch(ex){}
		var textString = optionsDoc.createTextNode(text);
		label.appendChild(textString);
	}};
	this.checkTimer.initWithCallback(timerEvent,500,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
};


opacustepPrefs.prototype.initCheck = function() {
    this.testConnectionSettings('silenttest');
};


opacustepPrefs.prototype.setIdentifier = function(optionsDoc){
	var url = optionsDoc.getElementById("textsugarcrm_url").value
        .replace('http://','').replace('https://','').replace(/\/$/,'').toLowerCase();
	this.identifier = opacustep.licence.generateId(url);
};

opacustepPrefs.prototype.requestTrial = function(optionsWindow){
	if(opacustep.successfulConnection){
		this.setIdentifier(optionsWindow.document);
		this.applyWindow = optionsWindow.openDialog(
                "chrome://opacustep/content/opacustep-trial.xul",
                "",
                "chrome,resizable=yes,titlebar,centerscreen"
                );
		var setFields = function(){
			this.sizeToContent();
			var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
				.getService(Components.interfaces.nsIMsgAccountManager);
            var account = acctMgr.defaultAccount;
            if(typeof(account.defaultIdentity.email) !== 'undefined' && account.defaultIdentity.email !== ''){
                this.document.getElementById('opacus_applicant_name').value = account.defaultIdentity.fullName;
                this.document.getElementById('opacus_applicant_email').value = account.defaultIdentity.email;
            }
		};
		this.applyWindow.addEventListener('load', setFields, false);
	} else {
		opacustep.notifyUser('prompt',opacustep.strings.getString('testSettingsWarning'));
	}
};

opacustepPrefs.prototype.trialApply = function(trialWindow){
	var name = trialWindow.document.getElementById('opacus_applicant_name').value;
	var email = trialWindow.document.getElementById('opacus_applicant_email').value;
	var user_name = this.prefdoc.getElementById("textsugarcrm_username").value.toLowerCase();
	// Set up ajax call to opacus to trigger trial
	var post_data = {
		"client":"Thunderbird62",
		"full_name":name,
		"email_address":email,
		"user_name":user_name,
		"identifier":this.identifier
	};
	this.makeRequest('trial',post_data);
};

opacustepPrefs.prototype.activate = function(optionsWindow){
	if(opacustep.successfulConnection){
		var label = this.prefdoc.getElementById('activation_feedback');
		try{
			label.removeChild(label.firstChild);
		}
		catch(ex){}
		var textString = this.prefdoc.createTextNode(opacustep.strings.getString('activating'));
		label.appendChild(textString);
		this.setIdentifier(optionsWindow.document);
		var activationKey = optionsWindow.document.getElementById("textopacus_activation_key").value;
		var user_name = optionsWindow.document.getElementById("textsugarcrm_username").value.toLowerCase();
		var post_data = {
			"client":"Thunderbird62",
			"activation_key":activationKey,
			"identifier":this.identifier,
			"user_name":user_name,
		};
		this.makeRequest('activate',post_data);
	} else {
		opacustep.notifyUser('prompt',opacustep.strings.getString('testSettingsWarning'));
	}
};

opacustepPrefs.prototype.silentActivate = function(){
    opacustep.suppressLicenseErrors = false;
	if(opacustep.successfulConnection){
        var activationKey = opacustep.prefs.getCharPref('opacus_activation_key');
		var user_name = opacustep.prefs.getCharPref("sugarcrm_username");
	    var url = opacustep.prefs.getCharPref("sugarcrm_url")
            .replace('http://','').replace('https://','').replace(/\/$/,'').toLowerCase();
	    var identifier = opacustep.licence.generateId(url);
		var post_data = {
			"client":"Thunderbird62",
			"activation_key":activationKey,
			"identifier":identifier,
			"user_name":user_name,
		};
		this.makeRequest('silentactivate', post_data);
	}
};

opacustepPrefs.prototype.makeRequest = function(method, post_data){

    if (typeof(XMLHttpRequest) !== 'undefined') {
        var client = new XMLHttpRequest();
    } else {
        var client = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                        .createInstance(Components.interfaces.nsIXMLHttpRequest);
    }

	post_data = JSON.stringify(post_data);
	post_data = post_data.replace(new RegExp('(&|&amp;)quot;','g'),'\\"');
    post_data = encodeURIComponent(post_data);
	post_data = post_data.replace(new RegExp('\\+','g'),'%2B');
	post_data = post_data.replace(new RegExp('%20','g'),'+');
	
	var params = 'method=' + method + '&post_data=' + post_data;
	var server = 'http://crm.opacus.co.uk/external/api.php';

	client.params = params;
	client.open("POST", server, true);
	client.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	client.setRequestHeader("Content-length", params.length);
	client.setRequestHeader("Connection", "close");

	client.prefsObject = this;
	client.prefsObject.method = method;

	client.onerror = function(){
		client.prefsObject.handleResponse('ERROR',client.prefsObject);
	};


	client.onreadystatechange = function(){
		if(client.readyState == 4) {
			if(client.status == 200){
					try{
						var parsed = JSON.parse(client.responseText);
						client.prefsObject.handleResponse(parsed,client.prefsObject);
					}
					catch(ex){
						client.prefsObject.handleResponse('ERROR',client.prefsObject);
					}
			} else {
				client.prefsObject.handleResponse('ERROR',client.prefsObject);
			}
		}
	};
	client.send(params);
};

opacustepPrefs.prototype.handleResponse = function(data, prefsObject){
    var label;
	if(typeof(data) === 'undefined' || data == 'ERROR') {
	    if(prefsObject.method != 'silentactivate') {
                label = prefsObject.prefdoc.getElementById('activation_feedback');
            try{
                label.removeChild(label.firstChild);
            }
            catch(ex){}
            opacustep.notifyUser('prompt',opacustep.strings.getString('noLicenceConnect'));
        }
	} else {
		if(prefsObject.method == 'trial'){
			if(data.trial_sent == 'true'){
				opacustep.notifyUser('prompt',opacustep.strings.getString('trialSent'));
			} else if(data.trial_sent == 'already'){
				opacustep.notifyUser('prompt',opacustep.strings.getString('alreadyTried'));
			}
			prefsObject.applyWindow.close();
		}
		if(prefsObject.method == 'activate'){
			var text;
			if(data.activated == 'true'){
				// Set the licence and call check licence to update the message beneath. Set pref implicitly too.
				prefsObject.prefdoc.getElementById('textopacus_licence_key').value = data.licence_key;
				opacustep.prefs.setCharPref("opacus_licence_key",data.licence_key);
				prefsObject.checkLicence(prefsObject.prefdoc);
				text = opacustep.strings.getString('activationSuccess') +
				"\n" + data.keys_remaining + " " + opacustep.strings.getString('keysRemaining');
			} else if(data.activated == 'false'){
				text = opacustep.strings.getString('activationFailed');
			} else {
				text = opacustep.strings.getString('noKeyFound');
			}
			label = prefsObject.prefdoc.getElementById('activation_feedback');
			try{
				label.removeChild(label.firstChild);
			}
			catch(ex){}
			var textString = prefsObject.prefdoc.createTextNode(text);
			label.appendChild(textString);
		}
		if(prefsObject.method == 'silentactivate'){
			if(data.activated == 'true'){
                opacustep.licence_key = data.licence_key;
				opacustep.prefs.setCharPref("opacus_licence_key",data.licence_key);
            } else {
                // Okay we failed to silent activate an expired license. Tell user.
                opacustep.notifyUser('critical',opacustep.strings.getString('notifyNoLicence'));
            }
		}
	}
};


opacustepPrefs.prototype.testConnectionSettings = function(type){
    var testtype = type || 'test';
	opacustep.suppressLicenseErrors = true;
	this.setUpWorker(testtype);
	opacustep.session_id = '';
	opacustep.started = false;
    // If silent test we go on to try a silent activate
	this.worker.full_login(testtype);
};

opacustepPrefs.prototype.setUpWorker = function(type){
    this.worker = new opacusteprest();
    if (type == 'test') {
	    this.saveSettings();
        this.worker.setCredentials(this.sugarurl.replace(/\/$/,''),this.username,this.cryptpassword);
    } else {
        this.worker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
    }
};


opacustepPrefs.prototype.getCustomModules = function(){
	this.setUpWorker();
	this.worker.login();
	this.check(this.getCustomModulesProcess);
};


opacustepPrefs.prototype.getCustomModulesProcess = function(prefsObject){
	var modList = prefsObject.prefdoc.getElementById('modulesList');
	while(modList.childNodes.length > 0){
		modList.removeChild( modList.lastChild );
	}
	prefsObject.worker.callback = prefsObject.getCustomModules_callback;
	prefsObject.worker.get_module_list(prefsObject);
};


opacustepPrefs.prototype.checkBlacklist = function(event){
	if(event.keyCode == 32 || event.keyCode == 9 || event.keyCode == 59 || event.keyCode == 188){
		return false;
	}
	return true;
};


opacustepPrefs.prototype.getCustomModules_callback = function(response,prefsObject){
	if(typeof(response.modules) !== 'undefined'){
		prefsObject.allModules = response.modules;
		prefsObject.worker.callback = prefsObject.getCustomModulesNew_callback;
		prefsObject.worker.get_module_fields('Emails',[],prefsObject);
	}
};


opacustepPrefs.prototype.getCustomModulesNew_callback = function(response,prefsObject){
	if(typeof(response.link_fields) !== 'undefined'){
		prefsObject.customModules = JSON.parse(opacustep.prefs.getCharPref('sugarcrm_custom_modules'));
		var found, custom = [], customFiltered = [];
		for (var i in response.link_fields){
			if(response.link_fields[i].name.indexOf('_activities_emails') != -1) {
                found = {
                    module: response.link_fields[i].name.substr(0,(response.link_fields[i].name.length - 18)),
                    link: response.link_fields[i].name
                };
				custom.push(found);
			}
			if(response.link_fields[i].name.indexOf('_activities_1_emails') != -1) {
                found = {
                    module: response.link_fields[i].name.substr(0,(response.link_fields[i].name.length - 20)),
                    link: response.link_fields[i].name
                };
				custom.push(found);
			}
		}
		for (var k in custom){
			var matchFound = false;
			for (var l in prefsObject.customModules){
                if (prefsObject.customModules[l].module.toLowerCase() == custom[k].module) {
                    customFiltered.push(prefsObject.customModules[l]);
					matchFound = true;
				}
			}
			if(!matchFound){
				for(var j in prefsObject.allModules){
					if(custom[k].module == prefsObject.allModules[j].module_key.toLowerCase()){
						customFiltered.push(
                            {
                                module:  prefsObject.allModules[j].module_key,
                                link:    custom[k].link,
                                label:   prefsObject.allModules[j].module_label,
                                checked: false
                            }
                        );
					}
				}
			}
		}
		prefsObject.refreshCustomModules(customFiltered);
	}
};



opacustepPrefs.prototype.refreshCustomModules = function(moduleArray){
	var modList = this.prefdoc.getElementById('modulesList');
	for(var i in moduleArray){
		var row = document.createElement('richlistitem');
		var cell = document.createElement('listcell');
		var cell2 = document.createElement('listcell');
		var textbox	= document.createElement('textbox');
		var checkbox = document.createElement('checkbox');
		checkbox.setAttribute('label',moduleArray[i].module);
		if(moduleArray[i].checked == true){
			checkbox.setAttribute('checked',true);
		}
        checkbox.id = moduleArray[i].link;
		row.setAttribute('allowevents','true');
		cell.setAttribute('flex','3');
		cell.style.overflow = 'hidden';
		checkbox.setAttribute('flex','1');
		textbox.setAttribute('size','12');
		cell2.setAttribute('flex','2');
		cell.appendChild(checkbox);
		cell2.appendChild(textbox);
		row.appendChild(cell);
		row.appendChild(cell2);
		modList.appendChild(row);
		textbox.value = moduleArray[i].label;
	}
};


opacustepPrefs.prototype.storeCustomModules = function(){	
	var rows = this.prefdoc.getElementById('modulesList').getElementsByTagName('richlistitem');
	var return_array = new Array();
	for(var i in rows){
		try{
			var checkbox = rows[i].firstChild.firstChild;
			var module = checkbox.getAttribute('label');
			var link = checkbox.id;
			var customLabel = rows[i].firstChild.nextSibling.firstChild.inputField.value;
			return_array.push({
                module: module,
                link: link,
                label: customLabel,
                checked: checkbox.checked
            });
		}
		catch(ex){}
	}
	return return_array;
};

opacustepPrefs.prototype.saveSettings = function(){
	this.password = this.prefdoc.getElementById('passwordsugarcrm_password').value;
	this.sugarurl = this.prefdoc.getElementById('textsugarcrm_url').value;
	this.username = this.prefdoc.getElementById('textsugarcrm_username').value;
	this.ldap = this.prefdoc.getElementById('checkopacus_ldap').checked;
	var crypt = new opacustepcrypt();
	if(this.ldap){
		this.cryptpassword = crypt.ldapEncrypt(this.password,this.prefdoc.getElementById('textldap_key').value);
	} else {
		this.cryptpassword = crypt.encrypt(this.password);
	}
	if(this.prefdoc.getElementById('sugarcrmwins').selected == true){
		opacustep.prefs.setBoolPref('sugarcrmwins',true);
	} else {
		opacustep.prefs.setBoolPref('sugarcrmwins',false);
	}
	opacustep.prefs.setCharPref('sugarcrm_custom_modules',JSON.stringify(this.storeCustomModules()));
};


opacustepPrefs.prototype.check = function(returnFunc){
	function checkSession(){
		if(opacustep.session_id=='' || onceMore == true || prefsObject.worker.waitingForLogin == true){
			prefsObject.loginTimer.cancel();
			if(opacustep.session_id != ''){
				onceMore = false;
			}
			var loginEvent = { notify: function(timer) {
				counter++;
				if(counter < 100){
					checkSession();
				} else {
					opacustep.notifyUser('critical',opacustep.strings.getString('notifyNoLogin'));
					return;
				}
			}}
			prefsObject.loginTimer.initWithCallback(loginEvent,100,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
			return;
		}
		returnFunc(prefsObject);
	};
	var onceMore = true;
	var prefsObject = this;
	var counter = 0;
	checkSession();
};
