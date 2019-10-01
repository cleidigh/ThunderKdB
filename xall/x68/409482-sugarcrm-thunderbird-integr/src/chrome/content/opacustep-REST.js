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
/*global opacustep, Components, dump*/

function opacusteprest(){   
    this.webservice_url = '';
    this.user_name = '';
    this.password = '';
    this.waitingForLogin = false;
}

opacusteprest.prototype.setCredentials = function(ws_url,ws_username,ws_password){
    this.webservice_url = ws_url + '/service/v4/rest.php';
    this.user_name = ws_username;
    this.password = ws_password;
};

opacusteprest.prototype.get_server_info = function(extraData){
    var rest_data = {};
    this.makeRequest('get_server_info',rest_data,extraData);
};

opacusteprest.prototype.login = function(){
    this.waitingForLogin = true;
    if(opacustep.session_id === ''){
        if(opacustep.started === false){
            this.full_login('default');
            opacustep.started = true;
            return;
        }
        this.waitingForLogin = false;
        return;
    } else if(opacustep.lastLogin > (+new Date() - opacustep.loginTimeout)){
        this.waitingForLogin = false;
        return;
    } else {
        var rest_data = opacustep.session_id;
        this.callback = this.login_callback;
        this.makeRequest('seamless_login',rest_data,'');
    }
};

opacusteprest.prototype.login_callback = function(response, extraData){
    if (response !== 1) {
        this.full_login('default');
    } else {
        opacustep.lastLogin = +new Date();
        this.waitingForLogin = false;
    }
};

opacusteprest.prototype.full_login = function(type){
    var rest_data = {
        user_auth : {
            user_name : this.user_name,
            password : this.password
        },
        application_name : 'opacustep',
        name_value_list : []
        //name_value_list : [{'name':'notifyonsave','value':true}]
    };
    this.callback = this.full_login_callback;
    this.makeRequest('login',rest_data,type);
};

opacusteprest.prototype.full_login_callback = function(response, extraData){
    this.waitingForLogin = false;
    if(response.name != 'Invalid Login'){
        opacustep.lastLogin = +new Date();
        opacustep.session_id = response.id;
        opacustep.user_id = response.name_value_list.user_id.value;
        if (typeof(opacustep.server_info.flavor) !== 'undefined' && opacustep.server_info.flavor == 'PRO'){
            opacustep.user_default_team_id = response.name_value_list.user_default_team_id.value;
        }
        if (extraData == 'test' || extraData == 'silenttest'){
            opacustep.successfulConnection = true;
            if (extraData == 'test') {
                opacustep.notifyUser('prompt',opacustep.strings.getString('settingsSuccess'));
            } else {
                opacustep.prefsObject.silentActivate();
            }
        }
    } else {
        if(opacustep.debug){dump("opacusteprest full login callback response failure on line 88. Response: " + JSON.stringify(response) + "\n");}
        // Hide status message as something's gone wrong
        opacustep.setStatus('hidden');
        if(extraData == 'test'){
            opacustep.notifyUser('prompt',opacustep.strings.getString('notifyNoLogin'));
        } else if (extraData != 'silenttest') {
            opacustep.notifyUser('critical',opacustep.strings.getString('notifyNoLogin'));
        }
    }
    opacustep.suppressLicenseErrors = false;
};

opacusteprest.prototype.makeRequest = function(method,rest_data,extraData){

    var orest = this;
    if (typeof(XMLHttpRequest) !== 'undefined') {
        var client = new XMLHttpRequest();
    } else {
        var client = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
                        .createInstance(Components.interfaces.nsIXMLHttpRequest);
    }

    if(!opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
        if(method != 'login' && extraData != 'test' && extraData != 'silenttest'){
            return;
        }
    }

    var input_type = 'JSON';
    rest_data = JSON.stringify(rest_data);
    rest_data = rest_data.replace(new RegExp('(&|&amp;)quot;','g'),'\\"');
    rest_data = encodeURIComponent(rest_data);
    rest_data = rest_data.replace(new RegExp('\\+','g'),'%2B');
    rest_data = rest_data.replace(new RegExp('%20','g'),'+');
    
    var params = 'method=' + method + '&input_type='+input_type+'&response_type=JSON&rest_data=' + rest_data;
    var server = this.webservice_url;


    client.params = params;
    client.open("POST", server, true);
    client.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    client.setRequestHeader("Content-length", params.length);
    client.setRequestHeader("Connection", "close");

    client.onerror = function(){
        opacustep.console.logStringMessage("OpacusSTP rest call failed: " + method);
        orest.callback("ERROR", extraData);
    };

    client.onreadystatechange = function(){
        if(client.readyState == 4) {
            if(client.status == 200){
                // If we meet a redirect to https, transparently change the server url
                if(client.channel.URI.spec.indexOf('https://') === 0 && opacustep.sugarurl.indexOf('http://') === 0){
                    opacustep.sugarurl = opacustep.sugarurl.replace('http://','https://');
                    orest.webservice_url = client.channel.URI.spec;
                    orest.get_server_info(false,'');
                } else {
                    try{
                        var parsed = JSON.parse(client.responseText);
                        if(parsed.name == 'Invalid Session ID'){
                            opacustep.console.logStringMessage("OpacusSTP received Invalid Session ID from last call: " + params);
                        }
                        if(parsed.name == "Access Denied"){
                            opacustep.console.logStringMessage("OpacusSTP received access denied, please check your export privileges");
                        }
                        orest.callback(parsed, extraData);
                    }
                    catch(ex){
                        // Check for failure on name lookup for custom modules
                        if(method == 'get_entry_list' && params.indexOf('.name+LIKE') != -1){
                            params = params.replace('.name+LIKE','.last_name+LIKE');
                            client.open("POST", server, true);
                            client.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                            client.setRequestHeader("Content-length", params.length);
                            client.setRequestHeader("Connection", "close");
                            client.send(params);
                        } else {
                            opacustep.console.logStringMessage("OpacusSTP unable to parse response: " + client.responseText);
                            if(opacustep.debug){
                                dump("Unable to parse response: " + client.responseText + "\n\n");
                            }
                            orest.callback("ERROR", extraData);
                            opacustep.notifyUser('critical',opacustep.strings.getString('notifyNoArchive'));
                            return;
                        }
                    }
                }
            } else {
                if(opacustep.debug){
                    dump("Bailing on client.status: "+client.status+"\n");
                }
                opacustep.console.logStringMessage("OpacusSTP bailing on client status: "+client.status);
                try{
                    opacustep.console.logStringMessage("OpacusSTP http request error message: "+client.responseText);
                }
                catch(ex){
                    opacustep.console.logStringMessage("OpacusSTP http call returned no error message");
                }
                opacustep.notifyUser('critical',opacustep.strings.getString('notifyNoConnect'));
            }
        }
    };
    client.send(params);
};


opacusteprest.prototype.get_module_fields = function(module,fields,extraData){

    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name" : module,
        "fields"        : fields,
    };
    this.makeRequest('get_module_fields',rest_data,extraData);
};

opacusteprest.prototype.get_module_list = function(extraData){
    var rest_data = {
        "session"   : opacustep.session_id,
        "modules"   : 'all'
    };
    this.makeRequest('get_available_modules', rest_data, extraData);
};

opacusteprest.prototype.get_entry_list = function(module,query,order_by,offset,select_fields,links,max_results,deleted,extraData){

    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : module,
        "query"     : query,
        "order_by"  : order_by,
        "offset"    : offset,
        "select_fields" : select_fields,
        "link_name_to_fields_array" : links,
        "max_results"   : max_results,
        "deleted"   : deleted,
        "favorites" : false,
    };
    this.makeRequest('get_entry_list',rest_data,extraData);
};


opacusteprest.prototype.search_by_module = function(search_string,modules,offset,max_results,assigned_user_id,select_fields,extraData){

    var rest_data = {
        "session"   : opacustep.session_id,
        "search_string" : search_string,
        "modules"   : modules,
        "offset"    : offset,
        "max_results"   : max_results,
        "assigned_user_id" : assigned_user_id,
        "select_fields" : select_fields,
        "unified_search_only" : false,
        "favorites" : false 
    };
    this.makeRequest('search_by_module',rest_data,extraData);
};


opacusteprest.prototype.get_entry = function(module,id,select_fields,extraData){
    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : module,
        "id"        : id,
        "select_fields": select_fields,
        "link_name_to_fields_array" : []
    };
    this.makeRequest('get_entry',rest_data,extraData);
};

opacusteprest.prototype.archive = function(mailObject){
    // Send off worker to find message_id
    if (
            typeof(opacustep.checkMessageId) === 'undefined' &&
            mailObject.message_id !== '' &&
            mailObject.message_id !== null
    ) {
        var messageIdChecker = new opacusteprest();
        messageIdChecker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
        messageIdChecker.callback = messageIdChecker.checkMessageIdCallback;
        messageIdChecker.get_entry_list(
                'Emails',
                '(message_id = "' + mailObject.message_id + '")',
                'date_modified DESC',
                0,
                ["id"],
                [],
                1,
                0,
                {mailObject: mailObject, archiveWorker: this}
        );
    } else {
        this.fullArchive(mailObject);
    }
};

opacusteprest.prototype.checkMessageIdCallback = function(response, callbackData){
    if (response.result_count == 1) {
        callbackData.mailObject.email_id = response.entry_list[0].id;
        callbackData.mailObject.doAttachments = false;
    }
    callbackData.archiveWorker.fullArchive(callbackData.mailObject);
};

opacusteprest.prototype.fullArchive = function(mailObject){
    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : 'Emails',
        "name_value_list" : {
            "id" : mailObject.email_id,
            "message_id" : mailObject.message_id,
            "assigned_user_id" : opacustep.user_id,
            "status" : "archived",
            "name"      : mailObject.subject,
            "description"       : mailObject.plain,
            "description_html"  : mailObject.html,
            "to_addrs"  : mailObject.recipients,
            "cc_addrs"  : mailObject.ccList,
            "bcc_addrs" : mailObject.bccList,
            "from_addr" : mailObject.author,
            "from_addr_name" : mailObject.authorName,
            "parent_id" : mailObject.parent_id,
            "parent_type" : mailObject.parent_type,
            "date_sent" : mailObject.formatDate(mailObject.unixTime)
        }
    };
    if (opacustep.user_default_team_id !== '') {
        rest_data.name_value_list.team_id = opacustep.user_default_team_id;
        rest_data.name_value_list.team_set_id = opacustep.user_default_team_id;
    }
    this.makeRequest('set_entry',rest_data,mailObject);
};


opacusteprest.prototype.createObject = function(newObject){
    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : newObject.module,
        "name_value_list" : {}
    };
    // Name value list
    for(var i in newObject.fields){
        if(newObject.fields[i] !== ''){
            // Handle updates to dropdowns that allow blank values
            if (newObject.fields[i] == '{{blank}}') {
                rest_data.name_value_list[i] = '';
            } else {
                rest_data.name_value_list[i] = newObject.fields[i];
            }
        }
    }
    if (opacustep.user_default_team_id !== '') {
        rest_data.name_value_list.team_id = opacustep.user_default_team_id;
        rest_data.name_value_list.team_set_id = opacustep.user_default_team_id;
    }
    this.makeRequest('set_entry',rest_data,newObject);
};

opacusteprest.prototype.set_entries = function(data,module,extraData){
    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : module,
        "name_value_lists" : data
    };
    this.makeRequest('set_entries',rest_data,extraData);
};

opacusteprest.prototype.createRelationship = function(moduleName,moduleId,linkModule,linkObjectId,extraData){   
    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : moduleName,
        "module_id" : moduleId,
        "link_field_name"       : linkModule.toLowerCase(),
        "related_ids"       : [ linkObjectId ],
        "name_value_list"   : [],
        "deleted" : 0
    };
    this.makeRequest('set_relationship',rest_data,extraData);
};


opacusteprest.prototype.createNote = function(osa) {
    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : 'Notes',
        "name_value_list" : {
            "name"             : osa.filename,
            "assigned_user_id" : opacustep.user_id,
        }
    };
    if (opacustep.user_default_team_id !== '') {
        rest_data.name_value_list.team_id = opacustep.user_default_team_id;
        rest_data.name_value_list.team_set_id = opacustep.user_default_team_id;
    }
    if (parseInt(opacustep.server_info.version.substring(0, 1)) >= 8) {
        rest_data.name_value_list.email_id = osa.email_id;
        rest_data.name_value_list.email_type = 'Emails';
    } else {
        rest_data.name_value_list.parent_id = osa.email_id;
        rest_data.name_value_list.parent_type = 'Emails';
    }
    this.makeRequest('set_entry', rest_data, osa);
};


opacusteprest.prototype.setAttachment = function(note_id,osa){
    var rest_data = {
        "session":opacustep.session_id,
        "note": {
            "filename":osa.filename,
            "file":osa.contents,
            "id":note_id
        }
    };
    this.makeRequest('set_note_attachment',rest_data,osa);
};

opacusteprest.prototype.get_relationships = function(module,id,related_module,query,fields,deleted,extraData){
    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : module,
        "id"        : id,
        "link_field_name"       : related_module.toLowerCase(),
        "related_module_query"  : query,
        "related_fields"    : fields,
        "related_module_link_name_to_fields_array" : [],
        "deleted"   : deleted,
        "order_by" : "date_modified"
    };
    this.makeRequest('get_relationships',rest_data,extraData);
};

// This function does not provide the data we require. Left here just in case (was used in opacustep-ab.js for sync to outlook)
opacusteprest.prototype.get_modified_relationships = function(module,related_module,from_date,to_date,offset,max_results,deleted,user_id,select_fields,relationship_name,deletion_date,extraData){
    var rest_data = {
        "session"   : opacustep.session_id,
        "module_name"   : module,
        "related_module": related_module,
        "from_date"     : from_date,
        "to_date"       : to_date,
        "offset"        : offset,
        "max_results"   : max_results,
        "deleted"       : deleted,
        "module_user_id": user_id,
        "select_fields" : select_fields,
        "relationship_name":relationship_name,
        "deletion_date" : deletion_date,
    };
    this.makeRequest('get_modified_relationships',rest_data,extraData);
};


