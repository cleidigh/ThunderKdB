"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

function load(win) {
	
	this.win = win;
	
	let element = win.document.getElementById("menu-item-send-now");
	
	let menuitem = win.document.createXULElement("menuitem");
	menuitem.setAttribute("id", "mailmerge-menuitem");
	menuitem.setAttribute("label", "Mail Merge");
	menuitem.setAttribute("oncommand", "mailmerge.init();");
	menuitem.setAttribute("class", "menuitem-iconic");
	menuitem.setAttribute("image", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAvklEQVQ4jc3RIU4DQRTG8R8XaIKjqeQA1U1IOAMn4ABV7DHwlegSJAcgJLvU1GBxkJU0VRgQFME02bSz+7auX/LEzJv3n/nm41+nWGET1DcuZDTpMbyt4vgB6+TzJHewTU3ALW7w2+M1VQ5Q4OEAS6HO8Wr/DxZbQBXccI+rLsBbAFjqTskZnlqazxhGgBeMMNtp3CX/jxFgg3eMk78PTHGJT9QdgFJj8YVrDBLoJ+3XuWiainIOAWUAmHcN/wEJuKU38uCNMgAAAABJRU5ErkJggg==");
	element.parentNode.insertBefore(menuitem, element);
	
	let menuseparator = win.document.createXULElement("menuseparator");
	menuseparator.setAttribute("id", "mailmerge-menuseparator");
	element.parentNode.insertBefore(menuseparator, element);
	
	win.addEventListener("compose-send-message", win.mailmerge.check, true);
	
}

function unload(win) {
	
	win.document.getElementById("mailmerge-menuitem").remove();
	win.document.getElementById("mailmerge-menuseparator").remove();
	
	win.removeEventListener("compose-send-message", win.mailmerge.check, true);
	
}

function init() {
	
	/* addressinvalid start */
	try {
		
		win.Recipients2CompFields(win.gMsgCompose.compFields);
		if(win.gMsgCompose.compFields.to == "") {
			
			let bundle = win.document.getElementById("bundle_composeMsgs");
			Services.prompt.alert(win, bundle.getString("addressInvalidTitle"), bundle.getString("noRecipients"));
			return;
			
		}
		
	} catch(e) { console.warn(e); }
	/* addressinvalid end */
	
	/* subjectempty start */
	try {
		
		let subject = win.document.getElementById("msgSubject").value;
		if(subject == "") {
			
			let bundle = win.document.getElementById("bundle_composeMsgs");
			let flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
			
			if(Services.prompt.confirmEx(
				win,
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
		
		if(win.gManualAttachmentReminder || (Services.prefs.getBoolPref("mail.compose.attachment_reminder_aggressive") && win.gComposeNotification.getNotificationWithValue("attachmentReminder"))) {
			
			let bundle = win.document.getElementById("bundle_composeMsgs");
			let flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
			
			if(Services.prompt.confirmEx(
				win,
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
			
			win.SetMsgBodyFrameFocus();
			
			win.cancelSendMessage = false;
			win.openDialog("chrome://messenger/content/messengercompose/EdSpellCheck.xhtml", "_blank", "dialog,close,titlebar,modal,resizable", true, true, false);
			if(win.cancelSendMessage) { return; }
			
		}
		
	} catch(e) { console.warn(e); }
	/* spellcheck end */
	
	/* template start */
	win.SaveAsTemplate();
	/* template end */
	
	win.setTimeout(function() { win.mailmerge.dialog(); }, 50);
	
}

function dialog() {
	
	if(win.gSendOperationInProgress || win.gSaveOperationInProgress) { win.setTimeout(function() { win.mailmerge.dialog(); }, 50); return; }
	
	/* mailinglists start */
	win.expandRecipients();
	/* mailinglists end */
	
	/* subject start */
	win.gMsgCompose.compFields.subject = win.document.getElementById("msgSubject").value;
	/* subject end */
	
	/* body start */
	win.gMsgCompose.compFields.body = win.gMsgCompose.editor.outputToString("text/html", 4);
	/* body end */
	
	/* template start */
	win.mailmergeutils.template();
	/* template end */
	
	/* dialog start */
	let params = { accept: false }
	win.openDialog("chrome://mailmerge/content/dialog.xhtml", "_blank", "chrome,dialog,modal,centerscreen", params);
	if(params.accept) {
		
		win.openDialog("chrome://mailmerge/content/progress.xhtml", "_blank", "chrome,dialog,modal,centerscreen", null);
		win.close();
		
	}
	/* dialog end */
	
}

function check(event) {
	
	let msgtype = win.document.getElementById("msgcomposeWindow").getAttribute("msgtype");
	if(msgtype != Ci.nsIMsgCompDeliverMode.Now && msgtype != Ci.nsIMsgCompDeliverMode.Later) { return; }
	
	let prefs = Services.prefs.getBranch("extensions.mailmerge.");
	
	/* recipientsreminder start */
	if(prefs.getBoolPref("recipientsreminder")) {
		
		let recipients = win.gMsgCompose.compFields.splitRecipients(win.gMsgCompose.compFields.to, false, {});
		if(recipients.length > prefs.getIntPref("recipients")) {
			
			let flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
			let check = { value : false };
			
			switch(Services.prompt.confirmEx(
				win,
				win.mailmerge.i18n.localizeMessage("mailmerge.recipientsreminder.title"),
				win.mailmerge.i18n.localizeMessage("mailmerge.recipientsreminder.message"),
				flags,
				win.mailmerge.i18n.localizeMessage("mailmerge.recipientsreminder.send"),
				win.mailmerge.i18n.localizeMessage("mailmerge.recipientsreminder.cancel"),
				null,
				win.mailmerge.i18n.localizeMessage("mailmerge.recipientsreminder.dontaskagain"),
				check))
			{
				
				case 0:
					
					prefs.setBoolPref("recipientsreminder", !check.value);
					break;
					
				case 1:
					
					event.preventDefault();
					event.stopPropagation();
					prefs.setBoolPref("recipientsreminder", !check.value);
					return;
					
				default:;
				
			}
			
		}
		
	}
	/* recipientsreminder end */
	
	/* variablesreminder start */
	if(prefs.getBoolPref("variablesreminder")) {
		
		if(
			win.gMsgCompose.compFields.from.includes("{{") && win.gMsgCompose.compFields.from.includes("}}") ||
			win.gMsgCompose.compFields.to.includes("{{") && win.gMsgCompose.compFields.to.includes("}}") ||
			win.gMsgCompose.compFields.cc.includes("{{") && win.gMsgCompose.compFields.cc.includes("}}") ||
			win.gMsgCompose.compFields.bcc.includes("{{") && win.gMsgCompose.compFields.bcc.includes("}}") ||
			win.gMsgCompose.compFields.replyTo.includes("{{") && win.gMsgCompose.compFields.replyTo.includes("}}") ||
			win.gMsgCompose.compFields.subject.includes("{{") && win.gMsgCompose.compFields.subject.includes("}}") ||
			win.gMsgCompose.editor.outputToString("text/html", 4).includes("{{") && win.gMsgCompose.editor.outputToString("text/html", 4).includes("}}")
		) {
			
			let flags = (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_0) + (Services.prompt.BUTTON_TITLE_IS_STRING * Services.prompt.BUTTON_POS_1);
			let check = { value : false };
			
			switch(Services.prompt.confirmEx(
				win,
				win.mailmerge.i18n.localizeMessage("mailmerge.variablesreminder.title"),
				win.mailmerge.i18n.localizeMessage("mailmerge.variablesreminder.message"),
				flags,
				win.mailmerge.i18n.localizeMessage("mailmerge.variablesreminder.send"),
				win.mailmerge.i18n.localizeMessage("mailmerge.variablesreminder.cancel"),
				null,
				win.mailmerge.i18n.localizeMessage("mailmerge.variablesreminder.dontaskagain"),
				check))
			{
				
				case 0:
					
					prefs.setBoolPref("variablesreminder", !check.value);
					break;
					
				case 1:
					
					event.preventDefault();
					event.stopPropagation();
					prefs.setBoolPref("variablesreminder", !check.value);
					return;
					
				default:;
				
			}
			
		}
		
	}
	/* variablesreminder end */
	
}
