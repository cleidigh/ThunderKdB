if (Cu === undefined)  var Cu = Components.utils;
if (Ci === undefined)  var Ci = Components.interfaces;
if (Cc === undefined)  var Cc = Components.classes;


/**
 *  Control the different menu-popups for Thunderbird/Mailapp
 *  for References, Reminders and ICS-attachements
 *
 *  @param thisId	indicates the 'source' or the id of the menu called from:
 *
 *     'List'   - attachmentListContext
 *     'Thread' - threadPaneContext
 *     'Msg'    - messagePaneContext
 */
reminderfox.util.popupCheck = function (thisId){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var mailRm_AddReminder = document.getElementById("reminderfox-mail-AddReminder");
	var mailRm_Open_Msg = document.getElementById("reminderfox-mail-Open_Msg");
	var mailRm_ICS_Msg = document.getElementById("reminderfox-mail-ICS_Msg");
	var mailRm_Open_Thread = document.getElementById("reminderfox-mail-Open_Thread");
	var mailRm_thread_AddReminder = document.getElementById("reminderfox-mail-thread_AddReminder");
	var mailRm_ICS_List = document.getElementById("reminderfox-mail-ICS_List");
	var mailRm_ICS_Item = document.getElementById("reminderfox-mail-ICS_Item");
	var mailRm_addContact = document.getElementById("reminderfox-mail-addContact");
	var mailRm_copyContact = document.getElementById("reminderfox-mail-copyContact");
	var mailRM_sep1 = document.getElementById("reminderfox-mail-sep1");
	var mailRM_sep2 = document.getElementById("reminderfox-mail-sep2");
	var mailRM_sep3 = document.getElementById("reminderfox-mail-sep3");


	var mailRm_backDocu = document.getElementById("reminderfox-mail-backDocu");
	var contextMenusEnabled = reminderfox.core.getPreferenceValue(reminderfox.consts.ENABLE_CONTEXT_MENUS, true);

	// user doesn't want context menus; hide them
	if (!contextMenusEnabled) {
		if (mailRm_AddReminder != null) mailRm_AddReminder.hidden = true;
		if (mailRm_Open_Msg != null) mailRm_Open_Msg.hidden = true;
		if (mailRm_ICS_Msg != null) mailRm_ICS_Msg.hidden = true;
		if (mailRm_Open_Thread != null) mailRm_Open_Thread.hidden = true;
		if (mailRm_thread_AddReminder != null) mailRm_thread_AddReminder.hidden = true;
		if (mailRm_ICS_List != null) mailRm_ICS_List.hidden = true;
		if (mailRm_ICS_Item != null) mailRm_ICS_Item.hidden = true;
		if (mailRm_addContact != null) mailRm_addContact.hidden = true;
		if (mailRm_copyContact != null) mailRm_copyContact.hidden = true;
		if (mailRM_sep1 != null) mailRM_sep1.hidden = true;
		if (mailRM_sep2 != null) mailRM_sep2.hidden = true;
		if (mailRM_sep3 != null) mailRM_sep3.hidden = true;
		return;
	}

	if (mailRm_AddReminder != null) mailRm_AddReminder.hidden = false;
	if (mailRm_Open_Msg != null) mailRm_Open_Msg.hidden = false;
	if (mailRm_ICS_Msg != null) mailRm_ICS_Msg.hidden = false;
	if (mailRm_Open_Thread != null) mailRm_Open_Thread.hidden = false;
	if (mailRm_thread_AddReminder != null) mailRm_thread_AddReminder.hidden = false;
	if (mailRm_ICS_List != null) mailRm_ICS_List.hidden = false;
	if (mailRm_ICS_Item != null) mailRm_ICS_Item.hidden = false;
	if (mailRm_addContact != null) mailRm_addContact.hidden = false;
	if (mailRm_copyContact != null) mailRm_copyContact.hidden = false;
	if (mailRM_sep1 != null) mailRM_sep1.hidden = false;
	if (mailRM_sep2 != null) mailRM_sep2.hidden = false;
	if (mailRM_sep3 != null) mailRM_sep3.hidden = false;

	var dMode = true;
	var xulId = "";

	if (thisId.originalTarget.id == "threadPaneContext") 		xulId = "Thread";

	if (thisId.originalTarget.id == "messagePaneContext") 	xulId = "Msg";
	if (thisId.originalTarget.id == "mailContext") 				xulId = "Msg";		// for TB3/SM2

	if (thisId.originalTarget.id == "attachmentListContext")	xulId = "List";
	if (thisId.originalTarget.id == "attachmentItemContext")	xulId = "Item";


	// ----  check 'attachment(s)' for ICS reminders  ----
	if ((xulId == "Msg") || (xulId == "List") || (xulId == "Item")) {

		if ((reminderfox.util.appId() == reminderfox.util.SEAMONKEY_ID) ||
			(reminderfox.util.appId() == reminderfox.util.THUNDERBIRD_ID)) {

			// context menu item 'Back' for tab type 'contentTab' with 'reminderfox' docu pages
			var tabmail = document.getElementById("tabmail");
			if (tabmail) {

			// tabmail.selectTabByMode('contentTab')
				var tIndex = tabmail.tabContainer.selectedIndex;
				var tType = tabmail.tabContainer.selectedItem.getAttribute('type');		// = [string] "folder"
				if (tType == "contentTab") {
					var contentTab = tabmail.tabInfo[tIndex].browser.contentDocument;
					var contentHistory = contentTab.ownerGlobal.history;
					if (contentHistory.length > 1) {
						var currentPage = contentTab.ownerGlobal.history.current;
						if (currentPage.indexOf('http://www.reminderfox.org/') == 0 ) {
							document.getElementById("reminderfox-mail-backDocu").removeAttribute("hidden");
						}
					}
					return;
				}
			}

			reminderfox.util.JS.dispatch('iCalMail');
			Cu.import("resource:///modules/gloda/mimemsg.js");

			if (gDBView.numSelected > 0) {
				var msgHdr = gDBView.hdrForFirstSelectedMessage;

				MsgHdrToMimeMessage(msgHdr, null,
					function(aMsgHdr, aMimeMsg){
					var currentAttachments = aMimeMsg.allUserAttachments || aMimeMsg.allAttachments;

					if (currentAttachments.length > 0) {
						var i = 0;
						while (i < currentAttachments.length) {
							var xx = currentAttachments[i].name;
							if (xx.toLowerCase().search(".ics") > -1) dMode = false;
							xx = currentAttachments[i].contentType.toLowerCase();
							if ((xx == "text/calendar") /* 'normal apps */ ||
								(xx == "application/ics") /* Google Calendar */) {
								dMode = false;
							}

					//	 0001: currentAttachments[1].contentType = [string] "application/octet-stream"
					//	 0001: currentAttachments[1].displayName = [string] "c124447.ics"

							if ((xx == "application/octet-stream") &&
								(currentAttachments[i].displayName.toLowerCase().search(".ics") > -1)) {
									dMode = false;
							}
							i++;
						}
					}
					if (dMode == false) {
						document.getElementById("reminderfox-mail-ICS_" + xulId).removeAttribute("disabled");
					}
					else {
						document.getElementById("reminderfox-mail-ICS_" + xulId).setAttribute("disabled", "true");
					}
				});

				var msgBody = reminderfox.iCal.getMessageBody(msgHdr);
				if((msgBody.indexOf("BEGIN:VCALENDAR") != -1) &&
						((msgBody.indexOf("VEVENT") != -1) || (msgBody.indexOf("VTODO") != -1))){
					document.getElementById("reminderfox-mail-ICS_" + xulId).removeAttribute("disabled");
				}
			}
		}


		// ---- check message for 'References' and/or 'reminder.Id'  -----
		if ((xulId == "Thread") || (xulId == "Msg")) {
			reminderfox.util.JS.dispatch('tagging');  // dispatches 'tagging' and 'sendPlus'
			if (reminderfox.sendPlus.getRmRef().length > 0) {
				document.getElementById("reminderfox-mail-Open_" + xulId).removeAttribute("disabled");
				reminderfox.tagging.msg("Reminderfox", true, "#993399");
			}
			else {
				document.getElementById("reminderfox-mail-Open_" + xulId).setAttribute("disabled", "true");
			}
		}
	}
};


/**
 *  Control the different menu-popups for 'addReminder list' for Contacts
 *  @since TB3/SM2 and it's TB/AB rework
 *
 *  @param thisId	indicates the 'source' or the id of the menu called from
 *
 *  need delay for todo/lists for disabling menu item -- to wait the list is loaded
 **/
reminderfox.util.popupCheckMenus = function (event){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	setTimeout(function () {

		var pMode = false;
		document.getElementById("treechildren-contextmenu-reminder-openABcard").setAttribute("hidden", "true");
		document.getElementById("treechildren-contextmenu-todo-openABcard").setAttribute("hidden", "true");

		var selectedEvents = null;
		if (event.originalTarget.id == "treechildren-contextmenu") {
			selectedEvents = getAllSelectedReminders(); // from 'reminder list' context menu
		}
		if (event.originalTarget.id == "todo-treechildren-contextmenu") {
			selectedEvents = getAllSelectedTodos(); // from 'reminder list' context menu
		}

		if (selectedEvents != null) {
			if (selectedEvents.length == 1 && selectedEvents[0] != null) {
				if (selectedEvents[0].extraInfo != null) {
					if (selectedEvents[0].extraInfo.indexOf("X-REMINDERFOX-CONTACT:") != -1) pMode = true;
					if ((pMode == true) && (typeof Ci.nsIAbItem == "object")) {
						document.getElementById("treechildren-contextmenu-reminder-openABcard").removeAttribute("hidden");
						document.getElementById("treechildren-contextmenu-todo-openABcard").removeAttribute("hidden");
					}
				}
			}
		}

		// ---- for migration of UserLists to ToDo's -----------
		var tabList = document.getElementById("rmFx-tabList");
		var tabIndex = tabList.selectedIndex;

		if (tabIndex > 1) {
			if (document.getElementById("migrateTodos-Separator") != null) {
				document.getElementById("migrateTodos-Separator").removeAttribute("hidden");
			}
			if (document.getElementById("migrateTodos-Info") != null) {
				document.getElementById("migrateTodos-Info").removeAttribute("hidden");
			}
			if (document.getElementById("migrateTodos") != null) {
				document.getElementById("migrateTodos").removeAttribute("hidden");
			}
		}

	}, 300);
};
