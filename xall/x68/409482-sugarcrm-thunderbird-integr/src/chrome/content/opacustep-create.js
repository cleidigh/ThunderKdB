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
 * Portions created by Opacus are Copyright (C) 2010 Mathew Bland, Jonathan Cutting
 * Opacus Ltd.
 * All Rights Reserved.
 ********************************************************************************/                  
// New Sugar Object
function opacustepCreate(){
    this.custom = false;
    this.chosenModule   = 'Contacts';
    this.action         = 'create';
    this.id             = '';
    this.type           = '';
    this.window         = '';
    this.localizedType  = '';
    this.account_id = '';
    this.mail   =   '';
    this.fields = {};
    this.worker = '';
    this.first_name = '';
    this.last_name = '';
    this.lead_source = '';
    this.resolution = '';
    this.account_name = '';
    this.phone_office = '';
    this.phone_mobile = '';
    this.title = '';
    this.email1 = '';
    this.description = '';
    this.module = '';
    this.account_id = '';
    this.contact_id = '';
    this.name = '';
    this.status = '';
    this.priority = '';
    this.amount = '';
    this.case_type = '';
    this.date_closed = '';
    this.moduleFieldsObject = {};
    this.opportunityProbability = [];
    this.loginTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
    this.syncTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
    this.moduleFields = {
        'Opportunity'   : new Array('assigned_user_id','name','sales_stage','name','amount','date_closed','description'),
        'Case'          : new Array('assigned_user_id','name','status','priority','type','description','resolution'),
        'Account'       : new Array('assigned_user_id','name','account_type','email1','phone_office','description'),
        'Contact'       : new Array('assigned_user_id','salutation','first_name','last_name','phone_work','title','phone_mobile','email1','account_name','account_id','description'),
        'Lead'          : new Array('assigned_user_id','salutation','first_name','last_name','phone_work','title','phone_mobile','email1','account_name','lead_source','description'),
        'Task'          : new Array('assigned_user_id','name','start_date','description'),
        'Bug'           : new Array('assigned_user_id','name','status', 'priority', 'type', 'work_log', 'resolution', 'description'),
    };
}


opacustepCreate.prototype.init = function(){

    if(!opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
        opacustep.notifyUser('critical',opacustep.strings.GetStringFromName('notifyNoLicence'));
        return;
    }

    this.worker = new opacusteprest();
    this.worker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
    this.worker.login();
    this.localizedType = opacustep.strings.GetStringFromName(this.type);
    this.window = window.openDialog("chrome://opacustep/content/opacustep-create.xul","","chrome,dialog=no,resizable=yes,titlebar,centerscreen",opacustep.windows,this);
    this.window.controller = this;
    this.module = this.type + 's';
    var setFields = function(){
        this.controller.check(this.controller.setAssignedUser);
        this.controller.feedback = this.document.getElementById('feedback');
        switch(this.controller.type){
        case 'Lead':
            this.controller.setToShow(this.controller,'persondetails');
            this.controller.setToShow(this.controller,'phonedetails');
            this.controller.setToShow(this.controller,'emaildetails');
            this.controller.setToShow(this.controller,'leaddetails');
            this.controller.setToShow(this.controller,'accountdetails');
            this.document.getElementById('account_name').hidden=false;
            this.document.getElementById('first_name').focus();
            this.controller.moduleFieldsObject.module = 'Leads';
            this.controller.moduleFieldsObject.fields = new Array('salutation','lead_source');
            break;
        case 'Contact':
            this.controller.setToShow(this.controller,'persondetails');
            this.controller.setToShow(this.controller,'phonedetails');
            this.controller.setToShow(this.controller,'emaildetails');
            this.controller.setToShow(this.controller,'accountdetails');
            this.document.getElementById('account_search_button').hidden = false;
            this.document.getElementById('account_add_button').hidden = false;
            this.document.getElementById('account_menulist').hidden = false;
            this.document.getElementById('first_name').focus();
            this.controller.moduleFieldsObject.module = 'Contacts';
            this.controller.moduleFieldsObject.fields = new Array('salutation');
            break;
        case 'Case':
            this.controller.setToShow(this.controller,'issuedetails');
            this.controller.setToShow(this.controller,'defaultdetails');
            this.controller.setToShow(this.controller,'contactdetails');
            this.document.getElementById('opacusModuleChooserAccount').hidden = false;
            this.document.getElementById('account_search_button').hidden = false;
            this.document.getElementById('account_add_button').hidden = false;
            this.document.getElementById('account_menulist').hidden = false;
            this.document.getElementById('description').style.height = '5em';
            this.document.getElementById('issueresolution').style.height = '5em';
            this.document.getElementById('name').focus();
            this.controller.moduleFieldsObject.module = 'Cases';
            this.controller.moduleFieldsObject.fields = new Array('status','priority','type');
            break;
        case 'Bug':
            this.controller.setToShow(this.controller,'issuedetails');
            this.controller.setToShow(this.controller,'bugdetails');
            this.controller.setToShow(this.controller,'defaultdetails');
            this.controller.setToShow(this.controller,'contactdetails');
            this.document.getElementById('opacusModuleChooserAccount').hidden = false;
            this.document.getElementById('account_search_button').hidden = false;
            this.document.getElementById('account_add_button').hidden = false;
            this.document.getElementById('account_menulist').hidden = false;
            this.document.getElementById('description').style.height = '5em';
            this.document.getElementById('issueresolution').style.height = '5em';
            this.document.getElementById('name').focus();
            this.document.getElementById('issueresolution_label').value = opacustep.strings.GetStringFromName('workLog');
            this.controller.moduleFieldsObject.module = 'Bugs';
            this.controller.moduleFieldsObject.fields = new Array('status','priority','type', 'resolution');
            break;
        case 'Task':
            this.controller.setToShow(this.controller,'taskdetails');
            this.controller.setToShow(this.controller,'defaultdetails');
            this.controller.setToShow(this.controller,'contactdetails');
            this.document.getElementById('account_search_button').hidden = false;
            this.document.getElementById('account_menulist').hidden = false;
            this.document.getElementById('account_add_button').hidden = false;
            this.document.getElementById('opacusModuleChooserAccount').hidden = false;
            this.document.getElementById('description').style.height = '8em';
            this.document.getElementById('name').focus();
            this.document.getElementById('taskduetime').hour=10;
            this.document.getElementById('taskduetime').minute=30;
            this.document.getElementById('taskstarttime').minute=30;
            this.document.getElementById('taskstarttime').hour=9;
            this.controller.moduleFieldsObject.module = 'Tasks';
            this.controller.moduleFieldsObject.fields = new Array('status','priority');
            break;
        case 'Opportunity':
            this.controller.setToShow(this.controller,'opportunitydetails');
            this.controller.setToShow(this.controller,'defaultdetails');
            this.controller.setToShow(this.controller,'contactdetails');
            this.document.getElementById('opacusModuleChooserAccount').hidden = false;
            this.document.getElementById('account_search_button').hidden = false;
            this.document.getElementById('account_add_button').hidden = false;
            this.document.getElementById('account_menulist').hidden = false;
            this.document.getElementById('description').style.height = '8em';
            this.document.getElementById('name').focus();
            this.controller.module = 'Opportunities';
            this.controller.moduleFieldsObject.module = 'Opportunities';
            this.controller.moduleFieldsObject.fields = new Array('sales_stage');
            break;
        case 'Account':
            this.controller.setToShow(this.controller,'accounttypedetails');
            this.controller.setToShow(this.controller,'defaultdetails');
            this.controller.setToShow(this.controller,'phonedetails');
            this.controller.setToShow(this.controller,'emaildetails');
            this.controller.setToShow(this.controller,'accountdetails');
            this.document.getElementById('opacus_account_search').value = opacustep.strings.GetStringFromName('memberOf');
            this.document.getElementById('account_search_button').hidden = false;
            this.document.getElementById('account_menulist').hidden = false;
            this.document.getElementById('description').style.height = '8em';
            this.document.getElementById('name').focus();
            this.controller.moduleFieldsObject.module = 'Accounts';
            this.controller.moduleFieldsObject.fields = new Array('account_type');
            break;
        default:
        }
        if(this.controller.custom){
            this.controller.customSetFields(this);
        }
        if(this.controller.action == 'createFromEmail'){
            this.controller.populateWindow(this.controller);
            this.document.title += " "+ this.controller.localizedType;
        } else if(this.controller.action == 'create'){
            this.document.title += " "+ this.controller.localizedType;
        } else if(this.controller.action == 'edit'){
            if(this.controller.type != 'Lead'){
                this.controller.setToHide(this.controller,'accountdetails');
            }
            this.controller.setToHide(this.controller,'contactdetails');
            this.controller.feedback.hidden=false;
            this.controller.feedback.setAttribute('mode','undetermined');
            this.document.title = "Opacus "+ this.controller.localizedType;
            this.document.getElementById('create_button').label = opacustep.strings.GetStringFromName('save');
        }
    };
    this.window.addEventListener('load', setFields, false);
};


opacustepCreate.prototype.chooseModule = function(el,createObject){
    if(el.id == 'opacusModuleChooserAccount'){
        createObject.chosenModule = 'Contacts';
        createObject.setToShow(createObject,'contactdetails');
        createObject.setToHide(createObject,'accountdetails');
    } else {
        createObject.chosenModule = 'Accounts';
        createObject.setToHide(createObject,'contactdetails');
        createObject.setToShow(createObject,'accountdetails');  
    }
};




opacustepCreate.prototype.setAssignedUser = function(createObject){
    if(opacustep.users.length === 0){
        createObject.worker.callback=createObject.setAssignedUser_callback;
        createObject.worker.get_entry_list('Users',"users.status='Active' and users.is_group=0",'first_name',0, ['id','first_name','last_name'], [],500,0,createObject);
    } else {
        createObject.updateAssignedUserField(createObject);
    }
};

opacustepCreate.prototype.setAssignedUser_callback = function(response,createObject){
    var user = {};
    var fn,ln;
    if(typeof(response.entry_list) !== 'undefined' && response.result_count > 0){
        opacustep.users = [];
        for(var i in response.entry_list){
            fn = response.entry_list[i].name_value_list.first_name.value;
            ln = response.entry_list[i].name_value_list.last_name.value;
            user.name = response.entry_list[i].id;
            user.value = (fn === '') ? ln : fn + ' ' + ln;
            opacustep.users.push(user);
            user = {};
        }
    }
    opacustep.users.sort(function (a, b) {
          return a.value.localeCompare(b.value);
    });
    createObject.updateAssignedUserField(createObject);
};

opacustepCreate.prototype.updateAssignedUserField = function(createObject){
    createObject.populateDropdown('assUser',opacustep.users);
    if(createObject.action != 'edit'){
        createObject.window.document.getElementById('assUser').value = opacustep.user_id;
    }
    createObject.setModuleFields(createObject);
};



opacustepCreate.prototype.setModuleFields = function(createObject){
    createObject.worker.callback=createObject.get_module_fields_callback;
    createObject.worker.get_module_fields(createObject.moduleFieldsObject.module,createObject.moduleFieldsObject.fields,createObject);
};

opacustepCreate.prototype.send = function(){
    // Send to sugar
    this.feedback.hidden=false;
    this.feedback.setAttribute('mode','undetermined');
    this.populateFromWindow();
    var notifyType = this.checkForm();
    if(notifyType){
        opacustep.notifyUser('error',opacustep.strings.GetStringFromName(notifyType));
    } else {
        this.window.document.getElementById('create_button').disabled=true;
        if(this.action != 'edit'){
            this.window.document.getElementById('create_button').label = opacustep.strings.GetStringFromName('creating');
        } else {
            this.window.document.getElementById('create_button').label = opacustep.strings.GetStringFromName('saving');
        }
        this.worker.login();
        this.check(this.process);
    }
};

opacustepCreate.prototype.checkForm = function(){
    switch(this.type){
        case 'Contact':
        case 'Lead':
            if(this.fields.last_name === ''){
                return 'nosurname';
            }
            break;
        case 'Account':
        case 'Case':
        case 'Bug':
            if(this.fields.name === ''){
                return 'noname';
            }
            break;
        case 'Opportunity':
            if(this.fields.name === '' || this.fields.sales_stage === ''){
                return 'noopp';
            }
            break;
        default:
    }
    // Find out if the relate field has been left blank
    if (this.action != 'edit') {
        if (this.type != 'Account' && this.type != 'Lead') {
            if (this.fields.contact_id === '' && this.fields.account_id === '' && this.fields.parent_id === '') {
                return 'norel';
            }
        }
    }
    return false;
}


opacustepCreate.prototype.setToShow = function(createObject,className){
    var objects = createObject.window.document.getElementsByClassName(className);
    for(var i in objects){
        objects[i].hidden=false;
    }
};


opacustepCreate.prototype.setToHide = function(createObject,className){
    var objects = createObject.window.document.getElementsByClassName(className);
    for(var i in objects){
        objects[i].hidden=true;
    }
};

opacustepCreate.prototype.process = function(createObject){
    createObject.worker.callback = createObject.createObject_callback;
    createObject.worker.createObject(createObject);
};


opacustepCreate.prototype.createObject_callback = function(data,createObject){
    createObject.id = data.id;
    if(createObject.module !== 'Leads' && (createObject.account_id !== '' || createObject.contact_id !== '')){
        if(createObject.contact_id !== ''){
            createObject.worker.callback = createObject.createContactRelationship_callback;
            createObject.worker.createRelationship('Contacts',createObject.contact_id,createObject.module.toLowerCase(),data.id,createObject);      
        } else {
            createObject.worker.callback = createObject.createAccountRelationship_callback;
            createObject.worker.createRelationship('Accounts',createObject.account_id,createObject.module.toLowerCase(),data.id,createObject);
        }
    } else {
        createObject.wrapUp(createObject);
    }
};

opacustepCreate.prototype.createAccountRelationship_callback = function(data,createObject){
    createObject.wrapUp(createObject);
};

opacustepCreate.prototype.createContactRelationship_callback = function(data,createObject){
    if(createObject.account_id !== ''){
        createObject.worker.callback = createObject.createAccountRelationship_callback;
        createObject.worker.createRelationship('Accounts',createObject.account_id,createObject.module.toLowerCase(),createObject.id,createObject);
    } else {
        createObject.wrapUp(createObject);
    }
};


opacustepCreate.prototype.get_module_fields_callback = function(data,createObject){
    switch(data.module_name){
        case 'Contacts':
            createObject.populateDropdown('salutation',data.module_fields.salutation.options);
            break;
        case 'Leads':
            createObject.populateDropdown('lead_source',data.module_fields.lead_source.options);
            createObject.populateDropdown('salutation',data.module_fields.salutation.options);
            break;
        case 'Bugs':
            createObject.populateDropdown('bugresolution',data.module_fields.resolution.options);
        case 'Cases':
            createObject.populateDropdown('issuestatus',data.module_fields.status.options);
            createObject.populateDropdown('issuepriority',data.module_fields.priority.options);
            createObject.populateDropdown('issuetype',data.module_fields.type.options);
            break;
        case 'Tasks':
            createObject.populateDropdown('taskstatus',data.module_fields.status.options);
            createObject.populateDropdown('taskpriority',data.module_fields.priority.options);
            break;
        case 'Accounts':
            createObject.populateDropdown('accounttype',data.module_fields.account_type.options);
            break;
        case 'Opportunities':
            createObject.populateDropdown('opportunitysalesstage',data.module_fields.sales_stage.options);
            break;
        default:
    }
    if(createObject.custom){
        createObject.customget_module_fields_callback(data,createObject);
    }
    if(createObject.action == 'edit'){
        createObject.populateFromSugar(createObject);
    }
};

opacustepCreate.prototype.populateDropdown = function(elId,data){
    for(var i in data){
        var selectItem = this.window.document.createElement('menuitem');
        // Handle updates to dropdowns that allow blank values
        if (data[i].name == '') {
            data[i].name = '{{blank}}';
        }
        selectItem.setAttribute('value',data[i].name);
        selectItem.setAttribute('label', data[i].value.replace(/&#039;/g,"'").replace(/&quot;/g,'"'));
        this.window.document.getElementById('mp' + elId).appendChild(selectItem);
    }
};

opacustepCreate.prototype.populateMultiEnum = function(elId,data){
    for(var i in data){
        var listItem = this.window.document.createElement('listitem');
        var listCell = this.window.document.createElement('listcell');
        listItem.setAttribute('id',elId + ':' + data[i].name);
        listCell.setAttribute('label', data[i].value.replace(/&#039;/g,"'").replace(/&quot;/g,'"'));
        listItem.appendChild(listCell);
        this.window.document.getElementById(elId).appendChild(listItem);
    }
};


opacustepCreate.prototype.wrapUp = function(createObject){
    createObject.feedback.hidden=true;
    createObject.feedback.setAttribute('mode','determined');
    createObject.window.close();
    var objectName = createObject.name;
    var searchString = createObject.email1;
    switch(createObject.type){
        case 'Lead':
            objectName = createObject.first_name + ' ' + createObject.last_name;
            break;
        case 'Contact':
            objectName = createObject.first_name + ' ' + createObject.last_name;
            var event = { notify: function(timer) {
                    opacustep.contactSync();
                }
            };
            createObject.syncTimer.initWithCallback(event,1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            break;
        case 'Opportunity':
        case 'Case':
        case 'Bug':
            break;
        default:
            searchString = createObject.name;
    }


    if(createObject.action == 'createFromEmail' || createObject.action == 'create'){
        opacustep.notifyUser('',opacustep.strings.GetStringFromName('newObject') + ' ' + createObject.type.toLowerCase() + "\n" + objectName);
        /* Let's not bother doing this any more. It's really bloody annoying when it's not required, and only mildly helpful when it is.
        try{
            opacustep.searchObject.searchWindow.document.getElementById('searchField').value = searchString;
            opacustep.searchObject.performSearch();
        }
        catch(ex){}*/
    } else if(createObject.action == 'edit'){
        opacustep.notifyUser('',opacustep.strings.GetStringFromName('updated') + ' ' + createObject.type.toLowerCase() + "\n" + objectName);
    }
};
    

opacustepCreate.prototype.populateFromSugar = function(createObject){
    createObject.check(createObject.retrieveSugarRecord);
};


opacustepCreate.prototype.retrieveSugarRecord = function(createObject){
    var sugarRecordWorker = new opacusteprest();
    sugarRecordWorker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
    sugarRecordWorker.callback = createObject.retrieveSugarRecord_callback;
    // module, id, select fields, extraData (object)
    sugarRecordWorker.get_entry(createObject.module,createObject.id,createObject.moduleFields[createObject.type],createObject);
};

opacustepCreate.prototype.setDropdownValue = function(elid, value) {
    var field = this.window.document.getElementById(elid);
    if (value == '') {
        value = '{{blank}}';
    }
    field.value = value;
};

opacustepCreate.prototype.retrieveSugarRecord_callback = function(data,createObject){
    createObject.feedback.hidden=true;
    createObject.feedback.setAttribute('mode','determined');
    if(typeof(data.entry_list) !== 'undefined' && typeof(data.entry_list[0]) !== 'undefined'){
        var resultSet = data.entry_list[0].name_value_list;
        var module = data.entry_list[0].module_name;
        createObject.id = data.entry_list[0].id;
        createObject.window.document.getElementById('assUser').value = resultSet.assigned_user_id.value;
        createObject.window.document.getElementById('description').value = resultSet.description.value.replace(/&#039;/g,"'");
        switch(module){
            case 'Leads':
            case 'Contacts':
                createObject.window.document.getElementById('first_name').value = resultSet.first_name.value.replace(/&#039;/g,"'");
                createObject.window.document.getElementById('last_name').value = resultSet.last_name.value.replace(/&#039;/g,"'");
                createObject.window.document.getElementById('phone_work').value = resultSet.phone_work.value.replace(/&#039;/g,"'");
                createObject.window.document.getElementById('phone_mobile').value = resultSet.phone_mobile.value.replace(/&#039;/g,"'");
                createObject.window.document.getElementById('title').value = resultSet.title.value.replace(/&#039;/g,"'");
                createObject.window.document.getElementById('email_address').value = resultSet.email1.value.replace(/&#039;/g,"'");
                if(module == 'Leads'){
                    createObject.window.document.getElementById('account_name').value = resultSet.account_name.value.replace(/&#039;/g,"'");
                    createObject.setDropdownValue('lead_source', resultSet.lead_source.value);
                }
                createObject.setDropdownValue('salutation', resultSet.salutation.value);
                break;
            case 'Accounts':
                createObject.window.document.getElementById('name').value = resultSet.name.value.replace(/&#039;/g,"'");
                createObject.window.document.getElementById('email_address').value = resultSet.email1.value.replace(/&#039;/g,"'");
                createObject.setDropdownValue('accounttype', resultSet.account_type.value);
                createObject.window.document.getElementById('phone_work').value = resultSet.phone_office.value.replace(/&#039;/g,"'");
                break;
            case 'Cases':
            case 'Bugs':
                createObject.window.document.getElementById('name').value = resultSet.name.value.replace(/&#039;/g,"'");
                createObject.setDropdownValue('issuestatus', resultSet.status.value);
                createObject.setDropdownValue('issuepriority', resultSet.priority.value);
                createObject.setDropdownValue('issuetype', resultSet.type.value);
                if (module == 'Bugs') {
                    createObject.window.document.getElementById('issueresolution').value = resultSet.work_log.value.replace(/&#039;/g,"'");
                    createObject.setDropdownValue('bugresolution', resultSet.resolution.value);
                } else {
                    createObject.window.document.getElementById('issueresolution').value = resultSet.resolution.value.replace(/&#039;/g,"'");
                }
                break;
            case 'Opportunities':
                createObject.window.document.getElementById('name').value = resultSet.name.value.replace(/&#039;/g,"'");
                createObject.setDropdownValue('opportunitysalesstage', resultSet.sales_stage.value);
                createObject.window.document.getElementById('opportunityamount').value = resultSet.amount.value;
                createObject.window.document.getElementById('opportunityclosedate').value = resultSet.date_closed.value;
                break;
            default:
        }
        if(createObject.custom){
            createObject.customRetrieveSugarRecord_callback(data,createObject);
        }
    }
};

opacustepCreate.prototype.populateWindow = function(createObject){
    var accountName = '';
    var firstName = '';
    var surName = '';
    var fullname = '';
    var emailAddress = '';

    if(createObject.action == 'createFromEmail'){
        if(typeof(opacustep.mails) == 'object' && opacustep.mails.length == 1 && opacustep.mails[0].direction == 'outbound'){
            createObject.mail =  opacustep.mails[0];
            createObject.mail.suggestSearch(createObject.mail.displayRecipients);
        } else if(gFolderDisplay.selectedMessageUris !== null){
            var selectedMails = gFolderDisplay.selectedMessageUris;
            createObject.mail = new opacustepMail();
            createObject.mail.uri = selectedMails[0];
            createObject.mail.parseHeader();
            createObject.mail.displayRecipients = createObject.mail.msgHeader.folder.displayRecipients;
            createObject.mail.suggestSearch(createObject.mail.displayRecipients);
        } else {
            return;
        }
    }
    if(createObject.type == 'Task' || createObject.type == 'Case' || createObject.type == 'Bug'){
        createObject.mail.usedForCreate = true;
        createObject.mail.createWindow = createObject.window;
        if(createObject.mail.plain !== ''){
            createObject.window.document.getElementById('description').value = createObject.mail.plain;
        }
    }
    if(!createObject.mail.displayRecipients){
        fullname = createObject.mail.authorName;
    } else {
        fullname = createObject.mail.recipientName.toString();
    }
    emailAddress = createObject.mail.searchSuggestion.split(';')[0];
    var nameParts = fullname.split(' ');
    if(nameParts.length == 1){
        accountName = fullname;
    } else {
        firstName = nameParts[0];
        nameParts.splice(0,1);
        surName = nameParts.join(' ');
    }
    createObject.window.document.getElementById('first_name').value = firstName;
    createObject.window.document.getElementById('last_name').value = surName;
    createObject.window.document.getElementById('email_address').value = emailAddress;
    createObject.window.document.getElementById('contact_menulist').value = emailAddress;
    createObject.window.document.getElementById('account_name').value = accountName;
    if(createObject.type == 'Account'){
        createObject.window.document.getElementById('name').value = accountName;
    } else {
        createObject.window.document.getElementById('name').value = createObject.mail.subject;
    }
};

opacustepCreate.prototype.populateFromWindow = function(){
    if(this.custom){
        this.customPopulateFromWindow();
    }
    if(this.action == 'edit'){
        this.fields.id = this.id;
    }
    this.fields.assigned_user_id = this.window.document.getElementById('assUser').value;
    this.fields.salutation = this.window.document.getElementById('salutation').selectedItem.value;
    this.fields.first_name = this.window.document.getElementById('first_name').value;
    this.fields.last_name = this.window.document.getElementById('last_name').value; 
    this.fields.phone_work = this.window.document.getElementById('phone_work').value;
    this.fields.phone_office = this.window.document.getElementById('phone_work').value;
    this.fields.phone_mobile = this.window.document.getElementById('phone_mobile').value;
    this.fields.title = this.window.document.getElementById('title').value;
    this.fields.email1 = this.window.document.getElementById('email_address').value;
    this.fields.account_name = this.window.document.getElementById('account_name').value;
    this.fields.name = this.window.document.getElementById('name').value;
    this.fields.description = this.window.document.getElementById('description').value;
    switch(this.type){
        case 'Lead':
            this.fields.lead_source = this.window.document.getElementById('lead_source').selectedItem.value;
            break;
        case 'Contact':
            try{
                this.fields.account_id = this.window.document.getElementById('account_menulist').selectedItem.getAttribute('data-id');
            }
            catch(ex){}
            break;
        case 'Case':
        case 'Bug':
            this.fields.status = this.window.document.getElementById('issuestatus').selectedItem.value;
            this.fields.priority = this.window.document.getElementById('issuepriority').selectedItem.value;
            this.fields.type = this.window.document.getElementById('issuetype').selectedItem.value;
            if (this.type == 'Bug') {
                this.fields.work_log = this.window.document.getElementById('issueresolution').value;
                this.fields.resolution = this.window.document.getElementById('bugresolution').selectedItem.value;
            } else {
                this.fields.resolution = this.window.document.getElementById('issueresolution').value;
            }
            if(this.chosenModule == 'Contacts'){
                try{
                    this.fields.contact_id = this.window.document.getElementById('contact_menulist').selectedItem.getAttribute('data-id');
                    this.fields.account_id = this.window.document.getElementById('contact_menulist').selectedItem.getAttribute('data-account_id');
                }
                catch(ex){}
            } else {
                try{
                    this.fields.account_id = this.window.document.getElementById('account_menulist').selectedItem.getAttribute('data-id');
                }
                catch(ex){}
            }
            break;
        case 'Task':
            this.fields.status = this.window.document.getElementById('taskstatus').selectedItem.value;
            this.fields.priority = this.window.document.getElementById('taskpriority').selectedItem.value;
            this.fields.date_start = this.getDbDateTime(this.window.document.getElementById('taskstartdate').value +
                ' ' + this.window.document.getElementById('taskstarttime').value);
            this.fields.date_due = this.getDbDateTime(this.window.document.getElementById('taskduedate').value +
                ' ' + this.window.document.getElementById('taskduetime').value);
            if(this.chosenModule == 'Contacts'){
                try{
                    this.fields.contact_id = this.window.document.getElementById('contact_menulist').selectedItem.getAttribute('data-id');
                    this.fields.parent_id = this.window.document.getElementById('contact_menulist').selectedItem.getAttribute('data-account_id');
                    this.fields.parent_type = 'Accounts';
                }
                catch(ex){}
            } else {
                try{
                    this.fields.parent_id = this.window.document.getElementById('account_menulist').selectedItem.getAttribute('data-id');
                    this.fields.parent_type = 'Accounts';
                }
                catch(ex){}
            }
            break;
        case 'Opportunity':
            this.fields.date_closed = this.window.document.getElementById('opportunityclosedate').value;
            this.fields.amount = this.window.document.getElementById('opportunityamount').value;
            this.fields.sales_stage = this.window.document.getElementById('opportunitysalesstage').selectedItem.value;
            if(this.chosenModule == 'Contacts'){
                try{
                    this.fields.contact_id = this.window.document.getElementById('contact_menulist').selectedItem.getAttribute('data-id');
                    this.fields.account_id = this.window.document.getElementById('contact_menulist').selectedItem.getAttribute('data-account_id');
                }
                catch(ex){}
            } else {
                try{
                    this.fields.account_id = this.window.document.getElementById('account_menulist').selectedItem.getAttribute('data-id');
                }
                catch(ex){}
            }
            break;
        case 'Account':
            this.fields.account_type = this.window.document.getElementById('accounttype').selectedItem.value;
            try{
                this.fields.parent_id = this.window.document.getElementById('account_menulist').selectedItem.getAttribute('data-id');
            }
            catch(ex){}
            break;
        default:
    }
};

opacustepCreate.prototype.searchContact = function(createObject){
    if(createObject.window.document.getElementById('contact_menulist').value !== ''){
        createObject.window.document.getElementById('contact_search_button').disabled = true;
        createObject.worker.login();
        createObject.check(createObject.searchSugarContact);
    }
};

opacustepCreate.prototype.searchSugarContact = function(createObject){
    var searchString = createObject.window.document.getElementById('contact_menulist').value.replace(/'/g,"\\'");
    var searchArray = [];
    searchArray = searchString.split(' ');
    var query = '';
    if(!searchArray[1]){
        query = "contacts.first_name LIKE '" + searchString.replace(/^\s+|\s+$/g,"") + "%' OR " +
            "contacts.last_name LIKE '" + searchString.replace(/^\s+|\s+$/g,"") + "%' OR contacts"+
            ".id in (select eabr.bean_id from email_addr_bean_rel eabr"+
            " join email_addresses ea on eabr.email_address_id = ea.id where eabr.bean_module = 'Contacts'"+
            " and ea.email_address LIKE '"+searchString+"' and ea.deleted='0' and eabr.deleted='0')";
    } else {
        query = "contacts.last_name LIKE '"+searchArray[1].replace(/^\s+|\s+$/g,"") +"%' AND contacts" +
            ".first_name LIKE '"+searchArray[0].replace(/^\s+|\s+$/g,"")+"%'";
    }                   
    createObject.worker.callback = createObject.searchSugarContact_callback;
    createObject.worker.get_entry_list('Contacts',query,'last_name',0,['first_name','last_name','account_id'],[],6,0,createObject);
};


opacustepCreate.prototype.searchSugarContact_callback = function(data,createObject){
    createObject.window.document.getElementById('contact_search_button').disabled = false;
    createObject.clearMenuList('contact_menulist',createObject);
    createObject.addToMenuList('contact_menulist',data);
};


opacustepCreate.prototype.searchAccount = function(createObject){
    if(createObject.window.document.getElementById('account_menulist').value !== ''){
        createObject.window.document.getElementById('account_search_button').disabled = true;
        createObject.worker.login();
        createObject.check(createObject.searchSugarAccount);
    }
};


opacustepCreate.prototype.searchSugarAccount = function(createObject){
    var query = "accounts.name LIKE '" + createObject.window.document.getElementById('account_menulist').value.replace(/'/g,"\\'") + "%'";
    createObject.worker.callback = createObject.searchSugarAccount_callback;
    createObject.worker.get_entry_list('Accounts',query,'name',0,['name'],[],6,0,createObject);
};

opacustepCreate.prototype.searchSugarAccount_callback = function(data,createObject){
    createObject.window.document.getElementById('account_search_button').disabled = false;
    createObject.clearMenuList('account_menulist',createObject);
    createObject.addToMenuList('account_menulist',data);
};


opacustepCreate.prototype.addToMenuList = function(elId,data){
    var selectItem, module, i, id, account_id='', name='', first_name;
    if(typeof(data.entry_list[0]) !== 'undefined' && typeof(data.entry_list) !== 'undefined'){
        module = data.entry_list[0].module_name;    
        for(i in data.entry_list){
            id = data.entry_list[i].id;
            if(typeof(data.entry_list[i].name_value_list.account_id) !== 'undefined'){
                account_id = data.entry_list[i].name_value_list.account_id.value;
            }
            switch(module) {
                case 'Contacts':
                case 'Leads':
                    first_name = (data.entry_list[i].name_value_list.first_name.value) ? data.entry_list[i].name_value_list.first_name.value + ' ' : '(...) ';
                    name = first_name + data.entry_list[i].name_value_list.last_name.value;
                    break;
                case 'Bugs':
                case 'Cases':
                    name = data.entry_list[i].name_value_list.case_number.value + ' ' + data.entry_list[i].name_value_list.name.value;
                    break;
                default:
                    name = data.entry_list[i].name_value_list.name.value;
            }
            selectItem = this.window.document.createElement('menuitem');
            selectItem.setAttribute('data-id',id);
            selectItem.setAttribute('label', name.replace(/&#039;/g,"'").replace(/&quot;/g,'"'));
            selectItem.setAttribute('value', name.replace(/&#039;/g,"'").replace(/&quot;/g,'"'));
            selectItem.setAttribute('data-account_id',account_id);
            this.window.document.getElementById('mp' + elId).appendChild(selectItem);       
        }
        this.window.document.getElementById(elId).open = true;
    } else {
        selectItem = this.window.document.createElement('menuitem');
        selectItem.setAttribute('label', opacustep.strings.GetStringFromName('noresults'));
        this.window.document.getElementById('mp' + elId).appendChild(selectItem);
        this.window.document.getElementById(elId).open = true;
        var createObject = this;
        var event = { notify: function(timer) {
                createObject.window.document.getElementById(elId).open = false;
                createObject.clearMenuList(elId,createObject);
            }
        };
        this.loginTimer.initWithCallback(event,1000,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
};


opacustepCreate.prototype.clearMenuList = function(elId,createObject){
    var menuList = createObject.window.document.getElementById('mp' + elId);
    while(menuList.childNodes.length > 0){
        menuList.removeChild( menuList.lastChild );
    }
};

opacustepCreate.prototype.getDbDateTime = function(sqlDate){
    // Convert to timestamp and back returns db time
    var regex = /^([0-9]{2,4})-([0-1][0-9])-([0-3][0-9]) (?:([0-2]?[0-9]):([0-5]?[0-9]):([0-5][0-9]))?$/;
    var parts = sqlDate.replace(regex,"$1 $2 $3 $4 $5 $6").split(' ');
    var outStamp = new Date(parts[0],parts[1]-1,parts[2],parts[3],parts[4],parts[5]).getTime();
    var d = new Date();
    d.setTime(outStamp);
    function pad(n){return n<10 ? '0'+n : n;}
    return d.getUTCFullYear()+'-'+
        pad(d.getUTCMonth()+1)+'-'+
        pad(d.getUTCDate())+' '+
        pad(d.getUTCHours())+':'+
        pad(d.getUTCMinutes())+':'+
        pad(d.getUTCSeconds());
};


opacustepCreate.prototype.check = function(returnFunc){
    function checkSession(){
        if(opacustep.session_id==='' || onceMore === true || createObject.worker.waitingForLogin === true){
            createObject.loginTimer.cancel();
            if(opacustep.session_id !== ''){
                onceMore = false;
            }
            var event = { notify: function(timer) {
                    counter++;
                    if(counter < 100){
                        checkSession();
                    } else {
                        opacustep.notifyUser('critical',opacustep.strings.GetStringFromName('notifyNoLogin'));
                        return;
                    }
                }
            };
            createObject.loginTimer.initWithCallback(event,100,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            return;
        }
        returnFunc(createObject);
    }
    var onceMore = true;
    var createObject = this;
    var counter = 0;
    checkSession();
};
