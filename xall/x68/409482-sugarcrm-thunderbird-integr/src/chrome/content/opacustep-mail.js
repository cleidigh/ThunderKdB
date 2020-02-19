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
/*global opacustep, opacusteprest, opacustepsearch, messenger, Components, opacustepAttachment, MsgHdrToMimeMessage*/
// Mail Object
function opacustepMail(){
    this.msgService         = '';
    this.msgHeader          = '';
    this.subject            = '';
    this.header             = '';
    this.message_id         = '';
    this.rawMessage         = '';
    this.rawBody            = '';
    this.recipients         = '';
    this.author             = '';
    this.authorName         = '';
    this.recipientName      = '';
    this.unixTime           = '';
    this.ccList             = '';
    this.bccList            = '';
    this.folderName         = '';
    this.displayRecipients  = '';
    this.searchSuggestion   = '';
    this.html               = '';
    this.origHtml           = '';
    this.plain              = '';
    this.files              = '';
    this.uri                = '';
    this.doAttachments      = '';
    this.worker             = '';
    this.mime_parts         = '';
    this.type               = '';
    this.direction          = '';
    this.archivedNames      = '';
    this.searchCalls        = 0;
    this.relationshipCalls  = 0;
    this.attachmentCalls    = 0;
    this.outboundAttachments= [];
    this.attachmentNames    = [];
    this.sugarObjects       = [];
    this.sugarNames         = [];
    this.bulk               = false;
    this.allowEdit          = false;
    this.email_id           = false;
    this.forceRearchive     = false;
    this.fieldsSet          = false;
    this.mimeReady          = false;
    this.usedForCreate      = false;
    this.mimeTimer          = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
}

opacustepMail.prototype.findRelatedRecords = function(){
    this.parseHeader();
    var worker = new opacusteprest();
    worker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
    worker.login();
    this.worker = worker;
    var search = new opacustepsearch();
    search.mail = this;
    search.check(search.findRelatedRecords,this.worker);
};


opacustepMail.prototype.inboundAutoArchive = function(header){
    if(header === false){
        this.parseHeader();
    }
    this.direction = 'inbound';
    this.auto = true;
    this.suggestSearch(this.displayRecipients);
    this.sugarObjects = [];
    opacustep.firstMessageHeader = this.msgHeader;
    var worker = new opacusteprest();
    worker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
    if(this.type != 'bulkauto'){
        worker.login();
    }
    this.worker = worker;
    this.doAttachments = opacustep.auto_archive_attachments;
    var searchObject = new opacustepsearch('','','');
    searchObject.mail = this;
    if(opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
        searchObject.check(searchObject.autoArchiveSearch,this.worker);
    }
};

opacustepMail.prototype.setEmailId = function(){
    if(opacustep.useStoredId){
        var standardId = this.msgHeader.getStringProperty('opacus-archived');
        var sentId = this.msgHeader.getStringProperty('x-opacus-archived');
        if (standardId != 'false' && standardId !== '' && standardId != 'onsend' && standardId != 'none') {
            this.email_id = standardId;
        } else if(this.displayRecipients && sentId.substring(0,8) != 'deferred' && sentId != 'none' && sentId != 'onsend' && sentId !== ''){
            this.email_id = sentId;
        }
    }
};


opacustepMail.prototype.outboundAutoArchive = function(composeWindow){
    this.direction = 'outbound';
    this.type = 'auto';
    if(this.populateFromCompose(composeWindow)){
        this.sugarObjects = [];
        var worker = new opacusteprest();
        worker.setCredentials(opacustep.sugarurl,opacustep.sugarcrm_username,opacustep.sugarcrm_password);
        worker.login();
        this.worker = worker;
        this.doAttachments = opacustep.auto_archive_attachments;
        var searchObject = new opacustepsearch('','','');
        searchObject.mail = this;
        if(opacustep.licence.check(opacustep.sugarurlOrig.toLowerCase(),opacustep.sugarcrm_username.toLowerCase())){
            searchObject.check(searchObject.autoArchiveSearch,this.worker);
        }
    }
};


opacustepMail.prototype.parseContacts = function(contacts){
    var recips = contacts.split(',');
    for(var i=0;i<recips.length;i++){
        if(/<[^>]+>/.test(recips[i])){
            recips[i] = recips[i].match(/<[^>]+>/);
        }
    }
    var addrs = recips.join(';');
    return addrs.replace(/>/g,'').replace(/</g,'').replace(/ /g,'');
};

    
opacustepMail.prototype.parseAuthor = function(){
    if(/<[^>]+>/.test(this.author)){
        this.authorName = this.author.replace(/<[^>]+>.*/,'').replace(/^\s\s*/,'').replace(/\s\s*$/,'');
        this.authorName = this.authorName.replace(/^"/,'').replace(/"$/,'');
        this.author = this.author.match(/<[^>]+>/).join();
        this.author = this.author.replace(/>/,'').replace(/</,'').replace(/ /g,'');
    } else if(/\([^\)]+\)/.test(this.author)) {
        this.authorName = this.author.match(/\(([^\)]+)\)/)[1];
        this.author = this.author.replace(/\s?\([^\)]+\)/,'');
    } else {
        this.authorName = '';
    }
};


opacustepMail.prototype.suggestSearch = function(displayRecipients){
    if(displayRecipients){
        this.searchSuggestion = (this.ccList === '')? this.recipients.toString() : this.recipients.toString() + ';' + this.ccList.toString();
        if(opacustep.addBcc){
            this.searchSuggestion = (this.bccList === '')? this.searchSuggestion : this.searchSuggestion + ';' + this.bccList.toString();
        }
    } else {
        this.searchSuggestion = this.author.toString();
    }
};


opacustepMail.prototype.parseHeader = function(){
    this.msgService = messenger.messageServiceFromURI(this.uri);
    this.msgHeader = this.msgService.messageURIToMsgHdr(this.uri);
    this.displayRecipients = this.msgHeader.folder.displayRecipients;
    this.subject = this.msgHeader.mime2DecodedSubject !== '' ? this.msgHeader.mime2DecodedSubject : this.msgHeader.subject;
    const MsgFlagHasRe = 0x0010; // MSG_FLAG_HAS_RE
    if(this.msgHeader.flags & MsgFlagHasRe){
        this.subject = opacustep.strings.GetStringFromName('re') + ' ' + this.subject;
    }
    this.recipients = this.msgHeader.mime2DecodedRecipients !== '' ? this.msgHeader.mime2DecodedRecipients : this.msgHeader.recipients;
    if(/^\w\w+\s+\w\w+\s+</.test(this.recipients)){
        this.recipientName = this.recipients.match(/^\w\w+\s+\w\w+/);
    }
    this.author = this.msgHeader.mime2DecodedAuthor !== '' ? this.msgHeader.mime2DecodedAuthor : this.msgHeader.author;
    this.ccList = this.msgHeader.ccList;
    this.bccList = this.msgHeader.bccList;
    this.unixTime = this.msgHeader.dateInSeconds;
    this.folderName = this.msgHeader.folder.prettiestName;
    this.recipients = this.parseContacts(this.recipients);
    this.ccList = this.parseContacts(this.ccList);
    this.bccList = this.parseContacts(this.bccList);
    this.message_id = '<'+this.msgHeader.messageId+'>';
    this.parseAuthor();
    this.setEmailId();

    MsgHdrToMimeMessage(this.msgHeader,this,
        function(aMsgHdr,aMimeMsg){
            this.mimeCallback(aMimeMsg,aMsgHdr,this);
        },
        true,
        {examineEncryptedParts:true, partsOnDemand:false}
    );
};


opacustepMail.prototype.mimeCallback = function(aMimeMsg,aMsgHdr,mailObject){
    mailObject.html = mailObject.getBodyParts(aMimeMsg.parts,/html/);
    mailObject.plain = mailObject.getBodyParts(aMimeMsg.parts,/plain/);
    mailObject.mime_parts = aMimeMsg.parts;
    mailObject.fieldsSet = true;
    mailObject.mimeReady = true;
    if(mailObject.allowEdit){
        mailObject.getAttachmentNames(mailObject.mime_parts);
    }
    // If we're allowing edit and the searchWindow exists   
    if(mailObject.allowEdit && opacustep.searchObject.ready){
        opacustep.searchObject.searchWindow.document.getElementById('opacusSearchTabs').hidden = false;
        opacustep.searchObject.setEditFields(mailObject);
    }
    if(mailObject.usedForCreate){
        if(mailObject.plain === ''){
            var scriptableUnescapeHTML = Components.classes["@mozilla.org/feed-unescapehtml;1"]
                             .getService(Components.interfaces.nsIScriptableUnescapeHTML);
            mailObject.createWindow.document.getElementById('description').value = scriptableUnescapeHTML.unescape(mailObject.html);
        }
        mailObject.createWindow.document.getElementById('description').value = mailObject.plain;
    }
};

opacustepMail.prototype.populateFromCompose = function(composeWindow) {
    var i, bucket, attachments, totalAddresses;
    this.recipientName = '';
    this.author = composeWindow.document.getElementById('msgIdentity').label;
    this.subject = composeWindow.document.getElementById('msgSubject').value;
    this.html = composeWindow.document.getElementById("content-frame").contentDocument.lastChild.lastChild.innerHTML;
    //this.plain = composeWindow.document.getElementById("content-frame").contentDocument.lastChild.lastChild.textContent;
    totalAddresses = composeWindow.document.getElementsByClassName('addressingWidgetItem').length;
    bucket = composeWindow.document.getElementById("attachmentBucket");
    attachments = bucket.childNodes;
    for(i=0;i<attachments.length;i++){
        var details = {
            url:attachments[i].attachment.url,
            name:attachments[i].attachment.name
        };
        this.outboundAttachments.push(details);
        this.attachmentNames.push(attachments[i].attachment.name);
    }
    var to_addr = [];
    var cc_addr = [];
    var bcc_addr = [];
    for(i=0;i < totalAddresses;i++){
        var j = i+1;
        var addrType = composeWindow.document.getElementById('addressCol1#' + j).value;
        var addrValue = composeWindow.document.getElementById('addressCol2#' + j).value.replace(',','');
        if(addrValue !== ''){
            switch(addrType) {
            case 'addr_to':
                to_addr.push(addrValue);
                break;
            case 'addr_cc':
                cc_addr.push(addrValue);
                break;
            case 'addr_reply':
                break;
            case 'addr_bcc':
                bcc_addr.push(addrValue);
                break;
            default:
            }
        }
    }
    if(to_addr.length < 1){
        composeWindow.document.getElementById('opacustep-send-archive').disabled = false;
        return false;
    }
    if(/^\w\w+\s+\w\w+\s+</.test(to_addr[0])){
        this.recipientName = to_addr[0].match(/^\w\w+\s+\w\w+/);
    }
    this.recipients = this.parseContacts(to_addr.join(','));
    this.ccList = this.parseContacts(cc_addr.join(','));
    this.bccList = this.parseContacts(bcc_addr.join(','));
    this.parseAuthor();
    this.searchSuggestion = (this.ccList === '')? this.recipients.replace(',',';') : this.recipients.replace(',',';') + ';' + this.ccList.replace(',',';');
    if(opacustep.addBcc){
        this.searchSuggestion = (this.bccList === '')? this.searchSuggestion : this.searchSuggestion + ';' + this.bccList.replace(',',';');
    }
    this.fieldsSet = true;
    return true;
};

opacustepMail.prototype.archiveMail = function(){
    var updateSugar = false;
    if(this.allowEdit === false){
        this.parseHeader();
    } else {
        if(opacustep.searchObject.searchWindow.document.getElementById('opacusSearchTabs').hidden === false){
            var newPlain = opacustep.searchObject.searchWindow.document.getElementById('opacusEditPlainmail').value;
            var newHtml = opacustep.searchObject.searchWindow.document.getElementById('opacusEditmail').contentDocument.documentElement.innerHTML;
            var newSubject = opacustep.searchObject.searchWindow.document.getElementById('opacusEditSubject').value;
            if(this.html === ''){
                if(this.plain != newPlain){
                    updateSugar = true;
                    this.plain = newPlain;
                }
            } else {
                if(this.origHtml != newHtml){
                    updateSugar = true;
                    this.html = newHtml;
                    // if we've modified the html the plain is going to be out of sync. Set to empty.
                    this.plain = '';
                }
            }
            if(this.subject != newSubject){
                updateSugar = true;
                this.subject = newSubject;
            }
            var attList = opacustep.searchObject.searchWindow.document.getElementById('allattachments');
            var selectedAttachments = attList.selectedItems; 
            if (selectedAttachments !== null) {
                this.attachmentsNames = [];
                for (var j in selectedAttachments) {
                    if (selectedAttachments[j].value) {
                        this.attachmentNames.push(selectedAttachments[j].value);
                    }
                }
            }
        }
    }
    opacustep.mailsToTag.appendElement(this.msgHeader, false);

    // Archive message and attachments (if present)
    if(this.email_id === false || updateSugar || this.forceRearchive){
        if(updateSugar && this.forceRearchive === false && this.email_id !== false){
            // If we're running an update don't re-archive attachments
            this.doAttachments = false;
        }
        this.checkMimeReady(this);
    } else {
        // It's been archived before and there are no changes, invoke callback function with original id
        var dummyResponse = {
            'id' : this.email_id
        };
        this.doAttachments = false;
        this.archive_callback(dummyResponse,this);
    }
};

/**
 * checkMimeReady - since adding in the email body and subject editing
 * capabilities, we had to parse the mime body before or during display
 * of the search window. Due to the async nature of
 * MsgHdrToMimeMessage's callback we need to confirm we've got the body
 * to archive before sending it off to SugarCRM.
 */
opacustepMail.prototype.checkMimeReady = function(mailObject){
    function checkMime(mailObject){
        if(mailObject.mimeReady === false){
            mailObject.mimeTimer.cancel();
            var event = { notify: function(timer) {
                counter++;
                if(counter < 1000){
                    checkMime(mailObject);
                } else {
                    mailObject.archive_callback('ERROR');
                    return;
                }
            }};
            mailObject.mimeTimer.initWithCallback(event,200,Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            return;
        }
        mailObject.worker.callback = mailObject.archive_callback;
        mailObject.worker.archive(mailObject);
    }
    var counter = 0;
    checkMime(mailObject);
};


opacustepMail.prototype.archive_callback = function(response,mailObject){
    if(typeof(response.id) !== 'undefined'){
        mailObject.email_id = response.id;
        if(mailObject.doAttachments){
            if(mailObject.direction == 'outbound'){
                mailObject.getOutboundAttachments(response.id);
            } else {
                mailObject.getAttachments(response.id,mailObject.mime_parts);
            }
        }
        if(mailObject.direction == 'outbound'){
            opacustep.sendAndArchiveStatus = response.id;
            try{
                mailObject.composeWindow.document.getElementById('button-send').doCommand();
            }
            catch(ex){
                mailObject.composeWindow.GenericSendMessage.apply();
            }
            opacustep.sendAndArchiveStatus = 'unknown';
        }
        if(mailObject.sugarObjects === false){
            if(!mailObject.doAttachments || mailObject.attachmentCalls === 0){
                opacustep.wrapUp(mailObject);
            }
        } else {
            for(var i=0; i < mailObject.sugarObjects.length; i++){
                mailObject.relationshipCalls++;
                var sugarObjectArray = mailObject.sugarObjects[i].split(':');
                mailObject.worker.callback = mailObject.createRelationship_callback;
                var link_module = sugarObjectArray[0];
                for (var j in opacustep.custom_modules) {
                    if (opacustep.custom_modules[j].module.toLowerCase() == link_module.toLowerCase()) {
                        link_module = opacustep.custom_modules[j].link;
                        break;
                    }
                }
                mailObject.worker.createRelationship('Emails',response.id,link_module,sugarObjectArray[1],mailObject);
            }
        }
    } else if(typeof(mailObject.subject) !== 'undefined') {
        opacustep.totalMails--;
        opacustep.bulkNoArchived++;
        if(opacustep.bulkNoArchived == opacustep.mails.length){
            opacustep.setStatus('hidden');
        }
        opacustep.console.logStringMessage("OpacusSTP received no email id. Response: "+JSON.stringify(response));
        opacustep.notifyUser('error',opacustep.strings.GetStringFromName('notifyNoArchive') + ' ' + mailObject.subject);
    }
};


opacustepMail.prototype.createRelationship_callback = function(response,mailObject){
    mailObject.relationshipCalls--;
    if(mailObject.relationshipCalls === 0){
        if(!mailObject.doAttachments){
            opacustep.wrapUp(mailObject);
        } else {
            if(mailObject.attachmentCalls === 0){
                opacustep.wrapUp(mailObject);
            }
        }
    }
};

opacustepMail.prototype.getOutboundAttachments = function(email_id){
    if(this.outboundAttachments.length === 0){
        return;
    }
    this.attachmentCalls = this.outboundAttachments.length;
    for(var i=0;i<this.outboundAttachments.length;i++){
        if(this.attachmentNames.indexOf(this.outboundAttachments[i].name) != -1){
            var osa = new opacustepAttachment();
            osa.type = 'outbound';
            osa.removeAfterSend = false;
            osa.filename = this.outboundAttachments[i].name;
            osa.email_id = email_id;
            osa.mailObject = this;
            var protocolhandler = Components.classes["@mozilla.org/network/protocol;1?name=file"].
                createInstance(Components.interfaces.nsIFileProtocolHandler);
            osa.nsiFileHandle = protocolhandler.getFileFromURLSpec(this.outboundAttachments[i].url);
            osa.encode();
        } else {
            this.attachmentCalls--;
        }
    }
};




opacustepMail.prototype.getAttachmentNames = function(mime_parts){
    if(typeof(mime_parts) !== 'undefined'){
        for(var i=0;i<mime_parts.length;i++){
            if(typeof(mime_parts[i].url) !== 'undefined'){
                this.attachmentNames.push(mime_parts[i].name);
            }
            if(typeof(mime_parts[i].parts) !== 'undefined'){
                this.getAttachmentNames(mime_parts[i].parts);
            }
        }
    }
};



opacustepMail.prototype.getAttachments = function(email_id,mime_parts){
    var mailObject = this;
    var Olistener = {
        OnStartRunningUrl: function(url){
            // Empty function to avoid exception
        },
        OnStopRunningUrl: function(url){
            try{
                // Some attachments are email parts and don't match regex (they get archived
                // as part of the plain body) so bail at this point into catch.
                var filename = url.spec.match(/.+filename=(.+)$/)[1];
                var savedFile = Components.classes["@mozilla.org/file/directory_service;1"]
                    .getService(Components.interfaces.nsIProperties)
                    .get("TmpD", Components.interfaces.nsIFile);
                savedFile.append(email_id + filename);
                var osa = new opacustepAttachment();
                osa.filename = decodeURIComponent(filename);
                osa.email_id = email_id;
                osa.removeAfterSend = true;
                osa.mailObject = mailObject;
                osa.nsiFileHandle = savedFile;
                if(osa.nsiFileHandle.fileSize > 0){
                    osa.encode();
                } else {
                    try{
                        osa.nsiFileHandle.remove(false);
                    }
                    catch(ex){
                        dump("Failed to remove file\n");
                    }
                    mailObject.attachmentCalls--;
                    if(mailObject.relationshipCalls === 0 && mailObject.attachmentCalls === 0){
                        opacustep.wrapUp(mailObject);
                    }
                }
            }
            catch(ex){
                mailObject.attachmentCalls--;
                if(mailObject.relationshipCalls === 0 && mailObject.attachmentCalls === 0){
                    opacustep.wrapUp(mailObject);
                }
            }
        },
    };
    if(typeof(mime_parts) !== 'undefined'){
        for(var i=0;i<mime_parts.length;i++){
            if(typeof(mime_parts[i].url) !== 'undefined'){
                // if we're allowing edit of the mail, check that we've not deselected the attachment
                if(this.allowEdit === false || this.attachmentNames.indexOf(mime_parts[i].name) != -1){
                    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                        .getService(Components.interfaces.nsIProperties)
                        .get("TmpD", Components.interfaces.nsIFile);

                    file.append(email_id + encodeURIComponent(mime_parts[i].name).replace(new RegExp(/\(/g),'%28').replace(new RegExp(/\)/g),'%29').replace(new RegExp("'",'g'),"%27").replace(new RegExp("!",'g'),"%21"));
                    file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
                    this.attachmentCalls++;
                    messenger.saveAttachmentToFile(
                        file,
                        mime_parts[i].url,
                        this.uri,
                        mime_parts[i].contentType,
                        Olistener
                    );
                }
            }
            if(typeof(mime_parts[i].parts) !== 'undefined'){
                this.getAttachments(email_id,mime_parts[i].parts);
            }
        }
    }
};



opacustepMail.prototype.getBodyParts = function(mimeMsgParts,ContentTypeRegex){
    var mimeBody = '';
    if(typeof(mimeMsgParts) != 'undefined'){
        for(var i=0;i<mimeMsgParts.length;i++){
            if (ContentTypeRegex.test(mimeMsgParts[i].contentType)){
                if(typeof(mimeMsgParts[i].body) != 'undefined'){
                    mimeBody += mimeMsgParts[i].body;
                }
            }
            if(typeof(mimeMsgParts[i].parts) != 'undefined'){
                mimeBody += this.getBodyParts(mimeMsgParts[i].parts,ContentTypeRegex);
            }
        }
    }
    return mimeBody;
};


opacustepMail.prototype.formatDate =function(timestamp){
    var d = new Date();
    timestamp = parseInt(timestamp,10) * 1000;
    d.setTime(timestamp);
    function pad(n){return n<10 ? '0'+n : n;}
    return d.getUTCFullYear()+'-'+
      pad(d.getUTCMonth()+1)+'-'+
      pad(d.getUTCDate())+' '+
      pad(d.getUTCHours())+':'+
      pad(d.getUTCMinutes())+':'+
      pad(d.getUTCSeconds());
};

