/*
* "The contents of this file are subject to the Mozilla Public Licenske
* Version 1.1 (the "License"); you may not use this file except in
* compliance with the License. You may obtain a copy of the License at
* http://www.mozilla.org/MPL/
*
* Software distributed under the License is distributed on an "AS IS"
* basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
* License for the specific language governing rights and limitations
* under the License.
*
* The Original Code is confirm-address.
*
* The Initial Developers of the Original Code are kentaro.matsumae and Meatian.
* Portions created by Initial Developers are
* Copyright (C) 2007-2011 the Initial Developer.All Rights Reserved.
*
* Contributor(s): tanabec
*/
var ConfirmMail = {
  get prefs() {
	delete this.prefs;
	let { prefs } = Components.utils.import('resource://confirm-mail-modules/lib/prefs.js', {});
	return this.prefs = prefs;
  },
  getPref: function(name, defaultValue) {
    var value = this.prefs.getPref(name);
    return value === null ? defaultValue : value;
  },


  get recipientsModified() {
	return this.originalRecipients != JSON.stringify(this.getRecipients());
  },

  prepare: function() {
	this.originalRecipients = JSON.stringify(this.getRecipients());
  },

  getRecipients: function() {
  	var msgCompFields = gMsgCompose.compFields;

  	var toList = [];
  	var ccList = [];
  	var bccList = [];
  	this.collectAddress(msgCompFields, toList, ccList, bccList)
  	//dump("[TO] "+ toList + "\n");
  	//dump("[CC] "+ ccList + "\n");
  	//dump("[BCC] "+ bccList + "\n");
  	return {
		to:  toList,
		cc:  ccList,
		bcc: bccList
	};
  },


  checkAddress: function(){
try { // DEBUG
  	var msgCompFields = gMsgCompose.compFields;
  	Recipients2CompFields(msgCompFields);
	if (typeof gMsgCompose.expandMailingLists == 'function') // Thunderbird 31 or later
		gMsgCompose.expandMailingLists();
	else if (typeof gMsgCompose.checkAndPopulateRecipients == 'function') // Thunderbird 24 -30
		gMsgCompose.checkAndPopulateRecipients(true, false, {});
	else
		throw new Error('gMsgCompose has no method to expand mailing lists!\n' +
			'expandMailingLists: '+gMsgCompose.expandMailingLists+'\n'+
			'checkAndPopulateRecipients: '+gMsgCompose.checkAndPopulateRecipients);

	var recipients = this.getRecipients();
  	var toList = recipients.to;
  	var ccList = recipients.cc;
  	var bccList = recipients.bcc;

	var domainList = this.getDomainList();
  	//dump("[DOMAINLIST] "+ domainList + "\n");

  	var internalList = [];
  	var externalList = [];
  	this.judge(toList, domainList, internalList, externalList);
  	this.judge(ccList, domainList, internalList, externalList);
  	this.judge(bccList, domainList, internalList, externalList);
  	//dump("[INTERNAL] "+ internalList + "\n");
  	//dump("[EXTERNAL] "+ externalList + "\n");

	var fileNamesList = [];
	this.collectFileName(msgCompFields,fileNamesList);
	//dump("[FILENAME]" + fileNamesList + "\n");

  	var enableConfirmationMode = this.getPref(CA_CONST.ENABLE_CONFIRMATION, 1);
  	var allowSkipConfirmation = this.getPref(CA_CONST.ALLOW_SKIP_CONFIRMATION, false);
  	var minConfimationCount = this.getPref(CA_CONST.MIN_RECIPIENTS_COUNT, 0);

  	var enableConfirmation = enableConfirmationMode == 1 || (enableConfirmationMode == 2 && this.recipientsModified);
  	if (!enableConfirmation ||
  		(allowSkipConfirmation &&
  			externalList.length == 0 &&
  			internalList.length > 0) ||
  		(minConfimationCount > 0 &&
  			(externalList.length + internalList.length <= minConfimationCount))){
  		return this.showCountDownDialog();
  	}else{
		window.confmail_confirmOK = false;
		let sizeAndPosition = ",centerscreen";
		if (this.getPref(CA_CONST.ALWAYS_LARGE_DIALOG)) {
			let w = parseInt(screen.availWidth * 0.9);
			let h = parseInt(screen.availHeight * 0.9);
			let minW = this.getPref(CA_CONST.ALWAYS_LARGE_DIALOG_MIN_WIDTH, 0);
			w = Math.max(minW, Math.ceil(w / 2));
			let x = parseInt((screen.availWidth - w) / 2);
			let y = parseInt((screen.availHeight - h) / 2);
			sizeAndPosition = ",width=" + w + ",height=" + h + ",screenX=" + x + ",screenY=" + y;
		}
		window.openDialog("chrome://confirm-mail/content/confirm-mail-dialog.xul",
			"ConfirmAddressDialog",
			"resizable,chrome,modal,titlebar" + sizeAndPosition,
			window,
			internalList, externalList, fileNamesList,
			this.getBody(),
			this.showCountDownDialog.bind(this));
	}
	
  	if(window.confmail_confirmOK){
  		return true;
  	}else{
  		return false;
  	}
} catch(error) { alert(error+'\n'+error.stack); } // DEBUG
  },

  showCountDownDialog: function(aOpenerWindow){
	var enableCountDown = this.getPref(CA_CONST.ENABLE_COUNTDOWN, false);
	if(!enableCountDown)
		return true;

	var countDownTime = this.getPref(CA_CONST.COUNT_DOWN_TIME);
	var oldCountDownTime = this.getPref(CA_CONST.COUNT_DOWN_TIME_OLD);
	if (oldCountDownTime) {
		countDownTime = oldCountDownTime;
		this.prefs.clearPref(CA_CONST.COUNT_DOWN_TIME_OLD);
	}
	var countDownComplete = { value : false };
	var allowSkip = this.getPref(CA_CONST.COUNT_DOWN_ALLOW_SKIP);

	var opener = aOpenerWindow || window;
	opener.openDialog("chrome://confirm-mail/content/countdown.xul", "CountDown Dialog",
	"resizable,chrome,modal,titlebar,centerscreen", countDownTime, allowSkip, countDownComplete);

	if (countDownComplete.value){
		return true;
	}else{
		//dump("cancel");
		return false;
	}
  },

  splitRecipients: function(addressesSource, type){
	var gMimeHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
	var addresses = {};
	var names = {};
	var fullNames = {};
	var numAddresses = gMimeHeaderParser.parseHeadersWithArray(
						 addressesSource, addresses, names, fullNames);
	var recipients = [];
	for (let i = 0; i < numAddresses; i++) {
		recipients.push({
			address:  addresses.value[i],
			name:	 names.value[i],
			fullName: fullNames.value[i],
			type:	 type
		});
	}
	return recipients;
  },

  collectAddress : function(msgCompFields, toList, ccList, bccList){
	if (msgCompFields == null){
		return;
	}
	this.splitRecipients(msgCompFields.to, "To").forEach(function(recipient) {
		toList.push(recipient);
	});
	this.splitRecipients(msgCompFields.cc, "Cc").forEach(function(recipient) {
		ccList.push(recipient);
	});
	this.splitRecipients(msgCompFields.bcc, "Bcc").forEach(function(recipient) {
		bccList.push(recipient);
	});
  },

collectFileName: function(msgCompFields,fileNamesList) {

	if (msgCompFields == null) {
		return;
	}

	try {
		var attachmentList = document.getElementById('attachmentBucket');
		for (var i = 0; i < attachmentList.getRowCount(); i++) {
			var attachmentItem = attachmentList.childNodes[i];
			var fileName = attachmentItem.getAttribute("label") || attachmentItem.getAttribute("name");
			fileNamesList.push(fileName);
		}	
	} catch (e) {
		//ignore
		//dump(e);
	}
		
},
	
/**
 * recipientsに含まれるアドレスを判定し、組織外、組織内に振り分けます
 */
judge : function(recipients, domainList, yourDomainRecipients, otherDomainRecipients){
  	//dump("[JUDGE] "+JSON.stringify(recipients)+"\n");
  	
  	//if domainList is empty, all recipients are external.
  	if(domainList.length == 0){
  		for(var i = 0; i < recipients.length; i++){
  			otherDomainRecipients.push(recipients[i]);
  		}
  		return;
  	}
  	
  	//compare recipients with registered domain lists.
  	for(var i = 0; i < recipients.length; i++){
  		var recipient = recipients[i];
  		var address = recipient;
  		if (recipient && typeof recipient != "string")
  			address = recipient.address;
  		if(address.length == 0){
  			continue;
  		}
		
		var domain = address.substring(1+address.indexOf("@")).toLowerCase();
		var match = false;

		 if(domain.search(/>$/)!=-1){
			//address end with ">"
			domain = domain.substring(0,domain.length-1);
		}

  		for(var j = 0; j < domainList.length; j++){
  			var insiderDomain = domainList[j].toLowerCase();
  			if(domain == insiderDomain){
				match = true;
  			}
  		}
		
		if(match){
  			yourDomainRecipients.push(recipient);
		}else{
 			otherDomainRecipients.push(recipient);
		}
  	}

  },

  getDomainList : function(){
  	var domains = this.getPref(CA_CONST.INTERNAL_DOMAINS);
  	if(domains == null || domains.length == 0){
  		return new Array();
  	}
  	return domains.split(",");
  },

  getBody : function(){
  	var holderNode = gMsgCompose.editor.document.body ||
  	             gMsgCompose.editor.document.documentElement;
  	var range = document.createRange();
  	range.selectNodeContents(holderNode);
  	var contents = range.cloneContents();
  	range.detach();
  	return contents;
  }
}

