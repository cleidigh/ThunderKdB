"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { console } = ChromeUtils.import("resource://gre/modules/Console.jsm");
var { jsmime } = ChromeUtils.import("resource:///modules/jsmime.jsm");

Services.scriptloader.loadSubScript("chrome://mailmerge/content/utils.js");

window.addEventListener("load", function(event) { mailmerge.load(event); }, true);
window.addEventListener("unload", function(event) { mailmerge.unload(event); }, true);

window.addEventListener("compose-send-message", function(event) { mailmerge.check(event); }, true);

var mailmerge = {
	
	load: function(event) {
		
		window.isValidAddress = function(aAddress) {
			
			return (aAddress.includes("@") || (aAddress.includes("{{") && aAddress.includes("}}")));
			
		}
		
	},
	
	unload: function(event) {
		
	},
	
	init: function(event) {
		
		event.stopPropagation();
		
		/* addressinvalid start */
		try {
			
			Recipients2CompFields(gMsgCompose.compFields);
			if(gMsgCompose.compFields.to == "") {
				
				var bundle = document.getElementById("bundle_composeMsgs");
				Services.prompt.alert(window, bundle.getString("addressInvalidTitle"), bundle.getString("noRecipients"));
				return;
				
			}
			
		} catch(e) { console.warn(e); }
		/* addressinvalid end */
		
		/* subjectempty start */
		try {
			
			var subject = GetMsgSubjectElement().value;
			if(subject == "") {
				
				var bundle = document.getElementById("bundle_composeMsgs");
				var flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
				
				if(Services.prompt.confirmEx(
					window,
					bundle.getString("subjectEmptyTitle"),
					bundle.getString("subjectEmptyMessage"),
					flags,
					bundle.getString("sendWithEmptySubjectButton"),
					bundle.getString("cancelSendingButton"),
					null, null, {value:0}) == 1)
				{
					return;
				}
				
			}
			
		} catch(e) { console.warn(e); }
		/* subjectempty end */
		
		/* attachmentreminder start */
		try {
			
			if(window.gManualAttachmentReminder || (Services.prefs.getBoolPref("mail.compose.attachment_reminder_aggressive") && window.gNotification.notificationbox.getNotificationWithValue("attachmentReminder"))) {
				
				var bundle = document.getElementById("bundle_composeMsgs");
				var flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
				
				if(Services.prompt.confirmEx(
					window,
					bundle.getString("attachmentReminderTitle"),
					bundle.getString("attachmentReminderMsg"),
					flags,
					bundle.getString("attachmentReminderFalseAlarm"),
					bundle.getString("attachmentReminderYesIForgot"),
					null, null, {value:0}) == 1)
				{
					return;
				}
				
			}
			
		} catch(e) { console.warn(e); }
		/* attachmentreminder end */
		
		/* spellcheck start */
		try {
			
			if(Services.prefs.getBoolPref("mail.SpellCheckBeforeSend")) {
				
				SetMsgBodyFrameFocus();
				
				window.cancelSendMessage = false;
				window.openDialog("chrome://editor/content/EdSpellCheck.xul", "_blank", "dialog,close,titlebar,modal,resizable", true, true, false);
				if(window.cancelSendMessage) { return; }
				
			}
			
		} catch(e) { console.warn(e); }
		/* spellcheck end */
		
		/* enigmail start */
		if(window.Enigmail) {
			
			var identity = getCurrentIdentity();
			var autoencryptdrafts = identity.getBoolAttribute("autoEncryptDrafts");
			
			identity.setBoolAttribute("autoEncryptDrafts", false);
			SaveAsTemplate();
			identity.setBoolAttribute("autoEncryptDrafts", autoencryptdrafts);
			
		}
		else {
			
			SaveAsTemplate();
			
		}
		/* enigmail end */
		
		window.setTimeout(function() { mailmerge.dialog(); }, 50);
		
	},
	
	dialog: function() {
		
		if(gSendOperationInProgress || gSaveOperationInProgress) { window.setTimeout(function() { mailmerge.dialog(); }, 50); return; }
		
		/* mailinglists start */
		window.expandRecipients();
		/* mailinglists end */
		
		/* body start */
		gMsgCompose.compFields.body = gMsgCompose.editor.outputToString("text/html", 4);
		/* body end */
		
		/* template start */
		mailmergeutils.template();
		/* template end */
		
		/* dialog start */
		var params = { accept: false }
		window.openDialog("chrome://mailmerge/content/dialog.xul", "_blank", "chrome,dialog,modal,centerscreen", params);
		if(params.accept) {
			
			/* debug start */
			var prefs = Services.prefs.getBranch("extensions.mailmerge.");
			if(prefs.getBoolPref("debug")) {
				
				var msg = "";
				
				msg += "Mail Merge: Preferences" + "\n";
				msg += "source" + " " + mailmergeutils.prefs.source + "\n";
				msg += "delivermode" + " " + mailmergeutils.prefs.delivermode + "\n";
				msg += "attachments" + " " + mailmergeutils.prefs.attachments + "\n";
				msg += "cardbook" + " " + mailmergeutils.prefs.cardbook + "\n";
				msg += "addressbook" + " " + mailmergeutils.prefs.addressbook + "\n";
				msg += "csv" + " " + mailmergeutils.prefs.csv + "\n";
				msg += "characterset" + " " + mailmergeutils.prefs.characterset + "\n";
				msg += "fielddelimiter" + " " + mailmergeutils.prefs.fielddelimiter + "\n";
				msg += "textdelimiter" + " " + mailmergeutils.prefs.textdelimiter + "\n";
				msg += "json" + " " + mailmergeutils.prefs.json + "\n";
				msg += "xlsx" + " " + mailmergeutils.prefs.xlsx + "\n";
				msg += "sheetname" + " " + mailmergeutils.prefs.sheetname + "\n";
				msg += "start" + " " + mailmergeutils.prefs.start + "\n";
				msg += "stop" + " " + mailmergeutils.prefs.stop + "\n";
				msg += "pause" + " " + mailmergeutils.prefs.pause + "\n";
				msg += "at" + " " + mailmergeutils.prefs.at + "\n";
				msg += "recur" + " " + mailmergeutils.prefs.recur + "\n";
				msg += "every" + " " + mailmergeutils.prefs.every + "\n";
				msg += "between" + " " + mailmergeutils.prefs.between + "\n";
				msg += "only" + " " + mailmergeutils.prefs.only + "\n";
				msg += "\n";
				
				msg += "Mail Merge: From" + "\n";
				msg += mailmergeutils.template.from + "\n";
				msg += "\n";
				
				msg += "Mail Merge: To" + "\n";
				msg += mailmergeutils.template.to + "\n";
				msg += "\n";
				
				msg += "Mail Merge: Cc" + "\n";
				msg += mailmergeutils.template.cc + "\n";
				msg += "\n";
				
				msg += "Mail Merge: Bcc" + "\n"
				msg += mailmergeutils.template.bcc + "\n";
				msg += "\n";
				
				msg += "Mail Merge: Reply" + "\n";
				msg += mailmergeutils.template.reply + "\n";
				msg += "\n";
				
				msg += "Mail Merge: Subject" + "\n";
				msg += mailmergeutils.template.subject + "\n";
				msg += "\n";
				
				msg += "Mail Merge: Body" + "\n";
				msg += mailmergeutils.template.body + "\n";
				msg += "\n";
				
				msg += "Mail Merge: Attachments" + "\n";
				var attachments = gMsgCompose.compFields.attachments;
				while(attachments.hasMoreElements()) {
					
					try {
						
						var attachment = attachments.getNext();
						attachment.QueryInterface(Ci.nsIMsgAttachment);
						
						msg += attachment.url.trim().replace(/^file\:\/\//g, '') + "\n";
						
					} catch(e) { console.warn(e); }
					
				}
				msg += "\n";
				
				console.log(msg);
				
			}
			/* debug end */
			
			window.openDialog("chrome://mailmerge/content/progress.xul", "_blank", "chrome,dialog,modal,centerscreen", null);
			window.close();
			
		}
		/* dialog end */
		
	},
	
	check: function(event) {
		
		var msgtype = document.getElementById("msgcomposeWindow").getAttribute("msgtype");
		if(msgtype != Ci.nsIMsgCompDeliverMode.Now && msgtype != Ci.nsIMsgCompDeliverMode.Later) { return; }
		
		/* recipientsreminder start */
		var prefs = Services.prefs.getBranch("extensions.mailmerge.");
		if(prefs.getBoolPref("recipientsreminder")) {
			
			var recipients = gMsgCompose.compFields.splitRecipients(gMsgCompose.compFields.to, false, {});
			if(recipients.length > prefs.getIntPref("recipients")) {
				
				var bundle = document.getElementById("mailmerge-stringbundle");
				var flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
				var check = { value : false };
				
				switch(Services.prompt.confirmEx(
					window,
					bundle.getString("mailmerge.overlay.recipientsreminder.title"),
					bundle.getString("mailmerge.overlay.recipientsreminder.message"),
					flags,
					bundle.getString("mailmerge.overlay.recipientsreminder.send"),
					bundle.getString("mailmerge.overlay.recipientsreminder.cancel"),
					null,
					bundle.getString("mailmerge.overlay.recipientsreminder.dontaskagain"),
					check))
				{
					
					case 0:
						
						prefs.setBoolPref("recipientsreminder", !check.value);
						break;
						
					case 1:
						
						prefs.setBoolPref("recipientsreminder", !check.value);
						event.stopPropagation();
						event.preventDefault();
						return;
						
					default:;
					
				}
				
			}
			
		}
		/* recipientsreminder end */
		
		/* variablesreminder start */
		var prefs = Services.prefs.getBranch("extensions.mailmerge.");
		if(prefs.getBoolPref("variablesreminder")) {
			
			if(
				gMsgCompose.compFields.from.includes("{{") && gMsgCompose.compFields.from.includes("}}") ||
				gMsgCompose.compFields.to.includes("{{") && gMsgCompose.compFields.to.includes("}}") ||
				gMsgCompose.compFields.cc.includes("{{") && gMsgCompose.compFields.cc.includes("}}") ||
				gMsgCompose.compFields.bcc.includes("{{") && gMsgCompose.compFields.bcc.includes("}}") ||
				gMsgCompose.compFields.replyTo.includes("{{") && gMsgCompose.compFields.replyTo.includes("}}") ||
				gMsgCompose.compFields.subject.includes("{{") && gMsgCompose.compFields.subject.includes("}}") ||
				gMsgCompose.editor.outputToString("text/html", 4).includes("{{") && gMsgCompose.editor.outputToString("text/html", 4).includes("}}")
			) {
				
				var bundle = document.getElementById("mailmerge-stringbundle");
				var flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
				var check = { value : false };
				
				switch(Services.prompt.confirmEx(
					window,
					bundle.getString("mailmerge.overlay.variablesreminder.title"),
					bundle.getString("mailmerge.overlay.variablesreminder.message"),
					flags,
					bundle.getString("mailmerge.overlay.variablesreminder.send"),
					bundle.getString("mailmerge.overlay.variablesreminder.cancel"),
					null,
					bundle.getString("mailmerge.overlay.variablesreminder.dontaskagain"),
					check))
				{
					
					case 0:
						
						prefs.setBoolPref("variablesreminder", !check.value);
						break;
						
					case 1:
						
						prefs.setBoolPref("variablesreminder", !check.value);
						event.stopPropagation();
						event.preventDefault();
						return;
						
					default:;
					
				}
				
			}
			
		}
		/* variablesreminder end */
		
	}
	
}
