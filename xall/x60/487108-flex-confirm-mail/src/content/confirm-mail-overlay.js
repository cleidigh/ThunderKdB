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

(function() {

var override = function() {

//overlay
//C:\Program Files\Mozilla Thunderbird\chrome\messenger\content\messenger\messengercompose\MsgComposeCommands.js
var originalSendMessage = window.SendMessage;
window.SendMessage = function SendMessage() {
	if(!ConfirmMail.checkAddress()){
		return;
	}
originalSendMessage.apply(this, arguments);
};

//overlay
//C:\Program Files\Mozilla Thunderbird\chrome\messenger\content\messenger\messengercompose\MsgComposeCommands.js
var originalSendMessageWithCheck = window.SendMessageWithCheck;
window.SendMessageWithCheck = function SendMessageWithCheck() {
	if(!ConfirmMail.checkAddress()){
		return;
	}
	originalSendMessageWithCheck.apply(this, arguments);
}

//overlay
//C:\Program Files\Mozilla Thunderbird\chrome\messenger\content\messenger\messengercompose\MsgComposeCommands.js
var originalSendMessageLater = window.SendMessageLater;
window.SendMessageLater = function SendMessageLater() {
	if(!ConfirmMail.checkAddress()){
		return;
	}
	originalSendMessageLater.apply(this, arguments);
}

};

const delay = ConfirmMail.prefs.getPref(CA_CONST.OVERRIDE_DELAY, 0);
let toBeDelayedTimes = ConfirmMail.prefs.getPref(CA_CONST.OVERRIDE_DELAY_TIMES, 0);

const tryOverride = function() {
	if (toBeDelayedTimes > 0) {
		toBeDelayedTimes--;
		setTimeout(tryOverride, delay);
		return;
	}

	if (delay <= 0)
		override();
	else
		setTimeout(override, delay);
};
tryOverride();


var stateListener = {
	NotifyComposeFieldsReady: function() {
		ConfirmMail.prepare();
	},
	NotifyComposeBodyReady: function() {},
	ComposeProcessDone: function(result) {},
	SaveInFolderDone: function(folderURI) {}
};

window.addEventListener("load", function init() {
	ConfirmMail.prepare();
	if (gMsgCompose) gMsgCompose.RegisterStateListener(stateListener);
	window.removeEventListener("load", init, false);
	//document.getElementById("msgcomposeWindow").addEventListener("compose-window-reopen", init, false);
}, false);

})();
