if (Cu === undefined)  var Cu = Components.utils;
if (Ci === undefined)  var Ci = Components.interfaces;
if (Cc === undefined)  var Cc = Components.classes;

/**
 * rmFxMail.js
 *
 * @since
 * @since 2009-12-17  EndOfSupport for TB1.x
 * @since 2008-08-04  Open Msg with msgID also with FX (non-mail apps)
 * @since 2008-04-14	tagging	- add/delete 'ical-*' tags for messages containing iCal data
 * @since 2008-01-19	add TB-priority handling
 * @since 2006-11-11	mod for TB1.5/label and TB2.0/tag

 * @see
 *  MessageID-Finder for Mozilla 'messageidfinder-2.0.0.xpi' by markushossner_AT_gmx_DOT_de and
 *	'reminderfox-0.9.6.xpi' by Daniel Lee, Tom Mutdosch
 */


// reminderfox = reminderfox || {};
reminderfox.mail = reminderfox.mail || {};

reminderfox.mail.currentSummary = null;
reminderfox.mail.ReferenceID = "@" + "reminderfox";
reminderfox.mail.FCC ="";
reminderfox.mail.cmdID = null;
reminderfox.mail.cmdString = "";
reminderfox.mail.deleteSendFileOnCompletion = true;



/**
* GetSelectedMessages for different TB/SM/PB versions
*/
reminderfox.mail.getSelectedMessages = function() {
	reminderfox.msgnr.whichMessenger();
	var rv;

	if ((reminderfox.msgnr.name == "TB3") || (reminderfox.msgnr.name == "SM")) {
		var mailWindow = reminderfox.util.getWindow("mail:3pane");
		if (mailWindow) {
			rv = mailWindow.gFolderDisplay.selectedMessageUris;
		}
	} else {	// valid for all other versions
		rv = GetSelectedMessages();
	}
	return rv;
}

///////// startup TB/SM/PB with different operations   /////////////////////////
/**
  *  Work with rmFx_cmdLineHandler to support starting 'messenger' (TB/SM/PB)
  *  with start option:
  *
  *	@call  'messenger' -reminderFox {remoteId}:{remoteOp} -msgString {string}
  *
  *	@call  'messenger' -reminderFox UID:{refID}             -msgString {file path}
  *	@call  'messenger' -reminderFox COMPOSE:{reminderID}    -msgString {file path of attachment}
  *	@call  'messenger' -reminderFox msgID:{finalMessageId}  -msgString:{finalMessageId}
  */
reminderfox.mail.startupwMsgId = function() {
//------------------------------------------------------------------------------
	var startMsg = window.arguments[0].split("|.|");
	reminderfox.mail.cmdID	= startMsg[0];
	reminderfox.mail.cmdString = startMsg[1];

	//gWTEST Darwin	---------<<< ---------------

	var logString = (" startupwMsgId 'remote start': "
			+ "\n reminderfox.mail.cmdID: " + reminderfox.mail.cmdID
			+ "\n reminderfox.mail.cmdString: " + reminderfox.mail.cmdString);

	var loggedAt = "[[" + Components.stack.caller.filename + "  # " +
		Components.stack.caller.lineNumber + "]]";

	var consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
	consoleService.logStringMessage("ReminderFox  clh  {startupwMsgId: " + logString + "}\n" + loggedAt);
	//gWTEST   ------------>>> ----------------

	var cDate = new Date();
	var msgLog = " ** Remote access **  " + reminderfox.mail.cmdID + " at: " + cDate;
	reminderfox.util.Logger('remote',msgLog)
	reminderfox.msgnr.whichMessenger();

	// -reminderFox UID:refID -msgString mailFile.path
	if (reminderfox.mail.cmdID.indexOf('UID:') > -1) {
		document.title = "Remote send message";	// reminderfox.string("rf.mail.remote.sendmsg");

		document.getElementById('rmFx_msg1').setAttribute("value", reminderfox.mail.cmdID);
		document.getElementById('rmFx_msg2').setAttribute("value", "");
		// setTimeout( reminderfox.msgnr.sendwUIDgo, 5000 );
		setTimeout(function() {reminderfox.msgnr.sendwUIDgo()}, 5000 );

	// -reminderFox COMPOSE:subject -msgString {compose parameters}
	} else  if (reminderfox.mail.cmdID.indexOf('COMPOSE:') > -1) {
		document.title = "Remote compose message";  // reminderfox.string("rf.mail.remote.composemsg");

		var msgString = unescape(reminderfox.mail.cmdString).split(";\n;");
		var subject	= msgString[0].substring(8);

		document.getElementById('rmFx_msg1').setAttribute("value", "Subject: " + subject);
		document.getElementById('rmFx_msg2').setAttribute("value", "");
		setTimeout(function() {reminderfox.msgnr.composeMSGgo() } , 5000);

	// -reminderFox msgID:finalMessageId -msgString {subject info}
	} else  if (reminderfox.mail.cmdID.indexOf('msgID:') > -1) {
		document.title = "Remote open message";	//	reminderfox.string("rf.mail.remote.openmsg");

		document.getElementById('rmFx_msg1').setAttribute("value", unescape(reminderfox.mail.cmdString));
		document.getElementById('rmFx_msg2').setAttribute("value", reminderfox.mail.cmdID);
		setTimeout(function() {reminderfox.mail.retryMsgIdDelayed() } , 5000);

	} else {
		var loggedAt = "[[" + Components.stack.caller.filename + "  # "
			+ Components.stack.caller.lineNumber + "]]";
		alert ("ReminderFox call error: " +loggedAt)
		return;
	}
}

/**
 *  find message with MsgID ////////////////////////////
 *
 */
reminderfox.mail.retryMsgIdDelayed = function () {
	var msgHdr = reminderfox.messenger.idFinder(reminderfox.mail.cmdID.substring(6));
	if (msgHdr) {
		window.close();
	} else  { // 'reminderfox.messenger.idFinder' with TB startup will fail because
	//  folder structure not build already
	//  if it fails  -->>  aks for 'retry'
		document.getElementById('msgIDnotFound').setAttribute("hidden", "false");
		document.getElementById('retryMsgId').setAttribute("disabled", "false");
		sizeToContent();
		window.focus();
	}
}

reminderfox.mail.retryMsgId = function () {

	if (reminderfox.mail.cmdID.indexOf('UID:') > -1) {
		reminderfox.msgnr.sendwUIDgo();
		window.close();
	} else {
		var msgHdr = reminderfox.messenger.idFinder(reminderfox.mail.cmdID);
		if (msgHdr) {
			window.close();
		}
	}
}


reminderfox.mail.doShowMail = function () {
	var currentReminder = getReminderForSelectedItem( );
	if (currentReminder.messageID != null) {
		reminderfox.mail.openByMessageID(currentReminder);
	}
	else if ( currentReminder.url != null) {
		if (reminderfox.core.isGMailEvent(currentReminder)) {
			reminderfox.util.openURL(currentReminder.url);
			reminderfox.core.focusBrowser();
		}
	}
};


reminderfox.mail.doShowMailTodo = function () {
	var currentTodo = getTodoForSelectedItem();
	if ( currentTodo.messageID != null) {
		reminderfox.mail.openByMessageID(currentTodo);
	}
	else if  ( currentTodo.url != null) {
		if (reminderfox.core.isGMailEvent(currentTodo)) {
			reminderfox.util.openURL(currentTodo.url);
			reminderfox.core.focusBrowser();
		}
	}
};

reminderfox.mail.doShowMailShortcut = function () {
	if (reminderfox_isReminderTabSelected()) {
		reminderfox.mail.doShowMail();
	}
	else {
		reminderfox.mail.doShowMailTodo();
	}
};

/**
 * open/displayMail
 *  retrieve and display this reminder's associated email in Thunderbird
 */
reminderfox.mail.openByMessageID = function (currentReminder){
	var finalMessageId = reminderfox.mail.finalMessageId(currentReminder.messageID);

	reminderfox.mail.currentSummary = currentReminder.summary;

	// if using Firefox, this starts (Thunderbird) Messenger App ...
	// using a specific 'commandLine' Handler

	if(!("@mozilla.org/messenger;1" in Cc)) {

		var mailApp = reminderfox.util.messengerApp();
		if ((mailApp == null) || (mailApp == ""))  {
			reminderfox.util.PromptAlert(reminderfox.string("rf.messenger.notfound"));
				return;
		}

		var args = new Array();
		args [0] = "-reminderFox";
		args [1] = "msgID:" + finalMessageId;
		args [2] = "-msgString";
		args [3] = escape(reminderfox.mail.currentSummary);			// currentReminder.summary;

		var go4Process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);

		try {
			go4Process.init(mailApp);
		} catch (ex) {}
		go4Process.run(false, args, args.length);

		return;		// FX schedules TB with msgID:messageID -msgString reminderfox.mail.currentSummary
	}

	if (finalMessageId !="" ) {
		var msg = reminderfox.messenger.idFinder(finalMessageId);

		if (!msg) {
			var strMsgIdNotFound = reminderfox.string("rf.add.mail.messageIdNotFound.message") +
					"\n" + reminderfox.mail.currentSummary  +
					"\n(Message-ID: " + finalMessageId +")";
			reminderfox.util.PromptAlert(strMsgIdNotFound);
			window.setCursor("auto");
		}
	}
}

reminderfox.mail.finalMessageId = function (messageId){
	var midleft = (messageId.toLowerCase()).search("<");
	var finalMessageId;
	if (midleft == -1)
			finalMessageId = "";
	else {
		var midRight = (messageId.substring(midleft)).search(">");
		finalMessageId =  messageId.substring(midleft + 1, midRight );
	}
	return finalMessageId;
};


	/**
	* Clear the 'Reminder' tag from a message
	*
	* @note	this function only works in messenger/ThunderBird
	* @param messageId
	*/
reminderfox.mail.clearLabelByMessageID = function (messageId){

	var finalMessageId = reminderfox.mail.finalMessageId(messageId)
	if (finalMessageId != "" )  reminderfox.messenger.openMessageById( finalMessageId,
			false /*msgOpen*/, 0 /*labelTag*/, false /*opTag*/);
};


///////////////////// .mail. ////////////////////////////////////////////////


//  ------------- GET TODO(s) ------------------------------
/**
 *   Get all user selected Todos on a displayed ReminderFox List
 *   @return  {object} todoArrayArray
 */
reminderfox.mail.getSelectedTodos = function () {

	var tabLabel = reminderfox.tabInfo.tabName;
	var tabIndex = reminderfox.tabInfo.tabIndex;
	var todosToBeSend = getAllSelectedTodos();

	if (todosToBeSend.length == 0) return null;

	//  todosToBeSend[0].extraInfo
	for (var i = 0; i < todosToBeSend.length; i++) {
		if (tabIndex == 1) tabLabel = "ToDo's";
		if (tabIndex > 0) {
			if (todosToBeSend[i].extraInfo == null) {
				todosToBeSend[i].extraInfo = reminderfox.consts.REMINDER_FOX_EXTENDED + "LISTID:" + tabLabel;
			} else {
				if (todosToBeSend[i].extraInfo.indexOf(reminderfox.consts.REMINDER_FOX_EXTENDED + "LISTID") == -1) {
					todosToBeSend[i].extraInfo += "\\n" + reminderfox.consts.REMINDER_FOX_EXTENDED + "LISTID:" + tabLabel;
				}
			}
		}
	}
	var todoArrayArray = new Array();
	todoArrayArray[tabLabel] = todosToBeSend;

	return todoArrayArray;
};



//  ------------- SEND / EXPORT  iCal ------------------------------
/**
 *  Send/export one or more 'reminder(s)' as they are
 *
 * @param selcReminders
 * @param organizer
 * @param mode				if 'xExport' stores reminders to file
 * @param reminderTyp		'reminder' | 'todo'
 *
 */
reminderfox.mail.sendAsItIs = function (selcReminders, organizer, mode, reminderTyp) {
	var methodTyp = "ICS";
	var attendees = null;

	if (mode == 'xExport') {	// generate an ICS file here

		var nReminders = selcReminders.length;
		if (reminderTyp == 'todo') {
				var iCalString = reminderfox.core.constructReminderOutput( "", selcReminders, true, true, "PUBLISH" );
				var nReminders = 1 /*selcReminders[0].length*/;
		} else {
				var iCalString = reminderfox.core.constructReminderOutput( selcReminders, "", true, true, "PUBLISH" );
				var nReminders = selcReminders.length;
		}

		var exportFile = reminderfox.util.eventsExportFile("reminderfoxEvents.ics");
		var iCalToEmailFile = reminderfox.util.makeMsgFile (reminderfox.util.encodeUTF8(iCalString), exportFile);

		if (iCalToEmailFile == null) {
				reminderfox.util.PromptAlert("Export failed. File '" + exportFile + "' path not valid!");
		}  else {
			// write status
			reminderfox.core.statusSet(reminderTyp + " " + "exported: " + nReminders + " to file: " + exportFile)
		}
		return;
	}
	reminderfox.mail.sendEventNow(selcReminders, "", 'ICS' /*methodTyp*/, organizer, attendees, reminderTyp);
};


/**
 * Preparing the message content and passing to the send or compose mail function
 *
 * @param reminderToBeSend passed as array!!
 * @param todosToBeSend	passed as array!!
 * @param methodTyp		'PUBLISH' | 'REQUEST' | 'REPLY' | 'ICS' (for sending 'view')
 * @param fromAddress
 * @param attendees
 * @param selectedTyp		'invite' = send one event as invitation | 'info' = send one/more event
 * @return
 */
reminderfox.mail.sendEventNow = function (reminderToBeSend, todosToBeSend, methodTyp, fromAddress, attendees, selectedTyp) {
		// setup for different invitation items ....
			function addBody (option, optText) {
				return ((option == null) || (option == ""))
					? ""
					: "\n" + optText + option;
			}

	var statusMsg = "";
	if ((fromAddress != "") && (fromAddress != null)) {
		statusMsg += reminderfox.string("rf.mail.ical.sendby")
					+ " " + fromAddress;
	}  else {
		statusMsg += reminderfox.string("rf.mail.ical.send")  + " ";		// "Sending"
	}
	statusMsg += " " + reminderfox.string("rf.mail.ical.sending");
	reminderfox.core.statusSet (statusMsg);

	var footer =  "______________________________________________________\n"
						+ reminderfox.string("rf.mail.ical.send.body");

	// --- setup parameters for message -----------------
	var eMailSubject ="";

	if (methodTyp == "ICS") {
		eMailSubject = "[ics]  ";
	}
	if (methodTyp == "PUBLISH") {
		eMailSubject = "[iCal]  " + methodTyp + ": ";	// $$$_locale  iCal PUBLISH
	}

	if ((reminderToBeSend != null) && (reminderToBeSend != "")) {
		var uid = reminderToBeSend[0].id;
		var extraInfo = reminderfox.core.extraInfoArray(reminderToBeSend[0]);

		if (selectedTyp == 'reminder') { methodTyp = "PUBLISH"; }
		var iCalString = reminderfox.core.constructReminderOutput( reminderToBeSend, "", true, true, methodTyp );
	}

	if ((todosToBeSend != null) && (todosToBeSend != "")) {
		var uid = todosToBeSend[0][0].id;
		var extraInfo = "";
		if (selectedTyp == 'todo') { methodTyp = "PUBLISH"; }
		var iCalString = reminderfox.core.constructReminderOutput( "", todosToBeSend, true, true, methodTyp );
	}


	if (methodTyp == 'REQUEST' ) {
		eMailSubject = "[iCal]  " + methodTyp + ": ";  //locale  iCal eg. REQUEST
		selectedTyp = 'invite';
	}
	if (methodTyp == 'REPLY') {
		eMailSubject = "[iCal]  ";
		selectedTyp = 'invite';

		var xAtt =reminderfox.core.extraInfoArray(reminderToBeSend[0]);
		var Item = "ATTENDEE";
		var attPart="";
		if (xAtt != null) {
			if (xAtt.length > -1) {
				for (var n =0; n < xAtt.length; n++) {
					if (xAtt[n].indexOf( Item )  == 0) {
						var fnd =  xAtt[n].indexOf("PARTSTAT=");
						if (fnd != -1) {
							var attPart = xAtt[n].substring(fnd+9);
							fnd = attPart.indexOf(";");
							if (fnd == -1) {attPart.indexOf(":")};
							var attPart = attPart.substring(0,fnd);
						}
					}
				}
			}
		}
		eMailSubject +=  attPart  + ": ";		//locale	iCal eg. ACCEPTED / DECLINED
	}

	////////////////// 'invite' was selected ////////////////////////////////////
	// sending without extra compose
	if (selectedTyp == 'invite') {
		eMailSubject += reminderToBeSend[0].summary
				+ " / " + reminderfox.string("rf.schedule.statusOf")
				+ " " + reminderfox.date.parseDateTimes(reminderfox.core.extraInfo(extraInfo,"DTSTAMP"))
				+ " [#" + reminderfox.core.extraInfo(extraInfo,"SEQUENCE") +"]";


		var body  = "*" + reminderfox.string("rf.mail.ical.send.subject.invitation")
			+ '*  "' + reminderToBeSend[0].summary  + '"'
			+ "\n" + reminderfox.string("rf.mail.ical.send.sentBy") + "  " + fromAddress + "\n";

		var priority = reminderToBeSend[0].priority;
		var priorityStr = (priority == 1)
			? reminderfox.string("rf.add.mail.message.priority")
			: "";

		body += addBody (priorityStr, "*" + reminderfox.string("rf.add.mail.message.priority.label")+ "*  ");
		body += addBody (reminderToBeSend[0].location, "*" + reminderfox.string("rf.mail.ical.send.location") + "* ");
		body += addBody (reminderToBeSend[0].url, "*" + reminderfox.string("rf.add.reminders.tooltip.url") + "* ");
		body += addBody (reminderToBeSend[0].notes, "\n*" + reminderfox.string("rf.add.mail.message.notes")
										+"* ___________________________ \n");

		/** ---------- sending without extra compose --------------------------**/
		var tmpMsgFile =  reminderfox.msgnr.FileCreate(
										eMailSubject,
										fromAddress,
										attendees,
										priority,
										body,
										footer,
										uid,
										iCalString, methodTyp);

		reminderfox.msgnr.FileSend (eMailSubject,
								fromAddress,
								attendees,
								priority,
								tmpMsgFile,
								uid);

		reminderfox.core.statusSet (reminderfox.string("rf.mail.ical.sendby") + " " + fromAddress);		//  "Send by"
		return;
	}


	/////////// 'reminder' or 'todo' has been selected /////////////
	//  go for compose
	//	one event: just take the reminder.summary as 'subject'
	//	no ATTENDEES (toAddress) ... have to add with 'composemessage'

	// prepare 'body' and 'subject' of message

	var body  = reminderfox.string("rf.add.mail.message.body") + "\n";

	if ((fromAddress != "") && (fromAddress != null)) {
		body  +=  reminderfox.string("rf.mail.ical.send.sentBy")
				+ "  " + fromAddress +"\n";
	}

	var _subject = "";
	if (selectedTyp == 'todo') {
		if (todosToBeSend[0].length == 0) {
			statusMsg = reminderfox.string("rf.mail.ical.noitems");
			reminderfox.core.statusSet (statusMsg);
			return;  // no todo's selected
		}
		if (todosToBeSend[0].length == 1) {
			_subject = todosToBeSend[0][0].summary
		} else {
			_subject = todosToBeSend[0].length;
		}
	}
	if (selectedTyp == 'reminder') {
		if (reminderToBeSend.length == 0) {
			statusMsg = reminderfox.string("rf.mail.ical.noitems"); //"No items to be send."
			reminderfox.core.statusSet (statusMsg);
			return;} // no events selected
		if (reminderToBeSend.length == 1) {
			_subject = reminderToBeSend[0].summary
		} else {
			_subject = reminderToBeSend.length;
		}
	}
	var msgInfo = reminderfox.string("rf.schedule.event.send." + selectedTyp)
			+ " :  " + _subject;

	// var viewLabel;
	// (rmFxViewLabel != "")
	//		? viewLabel=(" [" + reminderfox.string("rf.views.name") + ": " + rmFxViewLabel + "] : ")
	//		: viewLabel=(" : ");
	// body  += selectedTyp.toUpperCase() + viewLabel + _subject + "\n\n";
	body  += msgInfo + "\n\n";

	eMailSubject += msgInfo;


	// ---------- compose ------------------------------------------------
	var iCalFile =	reminderfox.core.getICSfile();
	iCalFile.leafName = "reminderfoxEvents.ics";

	var iCalToEmailFile = reminderfox.util.makeMsgFile (reminderfox.util.encodeUTF8(iCalString), iCalFile.path);
	if (iCalToEmailFile == null) {
		reminderfox.util.PromptAlert("Compose failed. File '" + iCalFile.path + "' path not valid!");
		return;
	}

	reminderfox.msgnr.Compose(eMailSubject, fromAddress,  attendees,
		priority, body, footer, uid, iCalToEmailFile, methodTyp);

	reminderfox.core.statusSet (reminderfox.string("rf.add.mail.message.compose")) /*"Compose message"*/
};


//  --- reminderfox.mail.folderListener  ----------------------------------------------- ---
/**
 *  folder listener used with	SEND++
 */
reminderfox.mail.folderListener = {
		OnItemEvent: function(aFolder, event) {
		},
		OnItemAdded: function(parentItem, item) {

			var lastReminder = reminderfox.core.lastSendReminder;
			var folderURI  = reminderfox.mail.FCC;
			var folderAdr  = reminderfox.mail.FCC.substring();
			var messageId = null;
			var referenceFound = false;

			var msg = "   FolderListener: OnItemAdded: "
				+ "\n   parentItem: " + parentItem
				+ "\n         item: " + item
				+ "\n   folder.URI: " + folderURI;
	//	reminderfox.util.Logger('FolderListener', msg)


			if ((item instanceof Ci.nsIMsgDBHdr) ) {

				var msg = "OnItemAdded  item: " + item.folder.getUriForMsg(item) + " added to: " + item.folder.folderURL;
				reminderfox.util.Logger('FolderListener', msg)

				var msgUri = item.folder.getUriForMsg(item)

				var messenger = Cc["@mozilla.org/messenger;1"].createInstance(Ci.nsIMessenger);

				var messageService = messenger.messageServiceFromURI(msgUri);
				var msgHeader = messageService.messageURIToMsgHdr(msgUri);

				messageId =  msgHeader.messageId;

				setTimeout(function () {
					reminderfox.tagging.msg( 'Reminderfox' /*tagName*/, true /*addKey*/,  "#993399", msgHeader);
				},100);
				referenceFound = true
			}


			if (referenceFound == true) {
				// now update the "lastReminder"  with the ".messageID"
				var activeReminders = reminderfox.core.getReminderEvents();

				for ( var i = 0; i < activeReminders.length; i++ ) {
					if (activeReminders[i].id == reminderfox.core.lastReminderID) {
						msg =  (" === found === : " + activeReminders[i].summary + " msgID: " + reminderfox.core.lastReminderID);
		//				reminderfox.util.Logger('FolderListener', msg);

						lastReminder.messageID ="<" + messageId.replace(new RegExp(/\"/g),"") + ">";

						reminderfox.core.removeFromArray(activeReminders, i);
						reminderfox.core.insertIntoArray(activeReminders, lastReminder, i);
						reminderfox.core.writeOutRemindersAndTodos(false); // (isExport)

						Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound)
							.playEventSound(Ci.nsISound.EVENT_NEW_MAIL_RECEIVED);
					}
				} // for activeReminders

				// reset the 'send folder' and Listener to process only once
				reminderfox.mail.FCC = "";
				reminderfox.mail.setFolderListener("remove");
				reminderfox.core.lastSendEvent = null

			} // referenceFound


		},
		OnItemIntPropertyChanged: function(aFolder, aProperty, aOldValue, aNewValue) {

		}  // OnItemIntPropertyChanged
}


reminderfox.mail.setFolderListener = function (mode) {
	const mailSessionContractID = "@mozilla.org/messenger/services/session;1";
	const nsIMsgMailSession = Ci.nsIMsgMailSession;
	var mailSession = Cc[mailSessionContractID].getService(nsIMsgMailSession);
	var nsIFolderListener = Ci.nsIFolderListener;

	if (mode == "add") {
		mailSession.AddFolderListener(reminderfox.mail.folderListener,
			nsIFolderListener.added);
	//		|  nsIFolderListener.intPropertyChanged);		//replaced with .added

	}
	if (mode == "remove") {
		mailSession.RemoveFolderListener(reminderfox.mail.folderListener);
	}
}


reminderfox.mail.address= function (address) {
	var _address = {};

	if (address != "") {
		address = address.replace(new RegExp(/>/g),"");

		_address.name = reminderfox.util.trim(address.split("<")[0]);
		_address.email = reminderfox.util.trim(address.split("<")[1]);
		if (_address.email == "") {
				_address.email = _address.name;
				_address.name ="";
		}
	}
	return _address;
};

///////////////////// .mail. \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\



/**
 * Messenger  features
 * based on: MessageID-Finder for Mozilla by
 *
 * Markus Hossner - markushossner@gmx.de
 */

if(!reminderfox.messenger) reminderfox.messenger = {

	pmpB : 0,		//Boolean
	pmpN : 1,		//Integer
	pmpS : 2,		//Char

	prefRead : false,
	accountURIs : new Array(),
	msgWindow : null,


	idFinder : function (strmessageid) {

		strmessageid = this.extractID(strmessageid);

		var msgHdr = this.openMessageById(strmessageid,true);
		return msgHdr;
	},


	getMsgWindow : function () {
		if ( this.msgWindow == null ) {
			this.msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(Ci.nsIMsgWindow);
		}
		return this.msgWindow;
	},


	extractID : function (strmessageid) {
		var midParts = strmessageid.replace(/^<|>$/g, "").split(":");

		switch (midParts.length) {
			case 1:
					strmessageid = strmessageid;
					break;

			case 2:
					if (midParts[0] == "news" || midParts[0] == "nntp") {
						strmessageid = midParts[1].replace(/^\/\/.*?\// ,"");
					} else if (midParts[0] == "mailto") {
						strmessageid = midParts[1];
					}
					break;

			case 3:
					strmessageid = midParts[2].replace(/^.+?\// ,"");
					break;

			default:
					strmessageid = "";
					break;
		}
		return strmessageid;
	},


	/**
	* Message with matching 'messageid' will be processed with tag 'labelTag'
	* based on option 'msgOpen'.
	* If 'msgOpen' true the message will be opened.
	*
	*   Message is labeled/tagged with optional parameter 'labelTag'
	*		TB1.5
	*			labelTag = 0 noLabel	=1 ... =5  see Label Options with Pull-Down Menue
	*			opTag = not used
	*
	*		TB2 / TB3 / SM / PB
	*			labelTag = string eg:ReminderFox
	*			opTag = true: add Tag;  false: remove Tag
	*
	*  @since 2009-04 :
	*	messages in Template and Draft folders are not opened, but
	*	the folder is selected
	*
	* @note
	*	TB3/SM need to select message row in folder
	*
	*	@param messageId
	*	@param msgOpen - true: opens in new window
	*	@param labelTag -
	*	@param opTag - true: adds, false: deletes the tag
	*/
	openMessageById : function (messageId, msgOpen, labelTag, opTag) {

		reminderfox.msgnr.whichMessenger();
		this.addNewsServers();
		window.setCursor("wait");

		var msgHdr = this.searchMessageLocally(messageId);

		window.setCursor("auto");

		if (msgHdr) {
			var folder = msgHdr.folder;
			var folderUri = folder.URI;
			var messageUri = folder.getUriForMsg(msgHdr);

			var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
			var mail3pane = windowManager.getMostRecentWindow("mail:3pane");

			if (reminderfox.msgnr.name == "SM") {

				var aTabShowFolderPane  = 1 << 0;
				var aTabShowMessagePane = 1 << 1;
				var aTabShowThreadPane  = 1 << 2;

				var aTabModeFolder = aTabShowMessagePane;

				if (!mail3pane) {	// if messenger is closed
					mail3pane = window.openDialog("chrome://messenger/content/", "","all,dialog=no");
					setTimeout (function()
						{
						mail3pane.document.getElementById('tabmail').openTab("3pane", aTabModeFolder, folderUri, msgHdr);
						mail3pane.document.getElementById('tabmail').mTabContainer.selectedIndex= 1;
						},1000);
				} else {		// use open messenger
					var tabs = mail3pane.document.getElementById('tabmail').mTabs.length
					mail3pane.focus();
					mail3pane.document.getElementById('tabmail').openTab("3pane", aTabModeFolder, folderUri, msgHdr);
					mail3pane.document.getElementById('tabmail').mTabContainer.selectedIndex= tabs;
				}
			}	// SM


			if (reminderfox.msgnr.name.search("TB") > -1 ) {	//TB
				mail3pane.focus();

				var tabmail = mail3pane.document.getElementById('tabmail');

				tabmail.openTab("folder",
					{folder: msgHdr.folder, msgHdr:msgHdr, messagePaneVisible:true } );
			}	// TB
		}	// msgHdr


		// extract the tag keys from the msgHdr
		if (msgHdr != null && labelTag != null ) {
			reminderfox.tagging.msg("Reminderfox", opTag, "#993399" );

			// delete all iCal-xxxx tags eg: PUBLISH, REQUEST, REPLY, CANCEL, ICS
			var msgKeyArray = msgHdr.getStringProperty("keywords").split(" ");

			if ((opTag == false) && (msgKeyArray.length > 0))  {
				for (var n= 0; n< msgKeyArray.length; n++  ) {

					if (msgKeyArray[n].indexOf("ical") == 0) {
					try {
						ToggleMessageTag(msgKeyArray[n], false /*tagOp*/, "", false)  //4th param for PB
					} catch (ex) {}
					}
				}
			}
		}
		window.setCursor("auto");
		return msgHdr;
	},


	/**
	 * Search for messageid in local folders
	 */
	searchMessageLocally : function (messageId) {
		var msgHdr = null;
		var folder = null;
		for(var x = 0; x < this.accountURIs.length && !msgHdr; x++) {
			try {
	//reminderfox.util.Logger('mailAccounts', "searchAccounts  accountURIs[x]:" + this.accountURIs[x]);

				folder = this.getMsgFolderFromUri(this.accountURIs[x]).rootFolder;
				msgHdr = this.searchInSubFolder(folder, messageId);
			} catch (ex) {
			}
		}
		return msgHdr;
	},


	/**
	 * Searchs in subfolder
	 */
	searchInSubFolder : function (sFolder, messageId) {

		var subfolder = null;
		var msgHdr = null;
		var msgDB = null;
		var currentFolderURI = "";
		var done = false;

		if (sFolder.hasSubFolders) {
			var subfolders = sFolder.subFolders;
			while (subfolders.hasMoreElements()) {
				var subfolder = subfolders.getNext().QueryInterface(Ci.nsIMsgFolder);
			//	if (currentFolderURI.substring(1,7) != "news://") {
					msgHdr = this.searchInSubFolder(subfolder, messageId);
			//	}
				if (!msgHdr) {
					try {
						var msgDB = subfolder.msgDatabase;
					} catch (ex) {}

					if ( msgDB != null ) msgHdr = msgDB.getMsgHdrForMessageID(messageId);
				}
				if (msgHdr) return msgHdr;
				try {
					subfolders.next();
				} catch(e) {
					done = true;
				}
			} //while
		} //if (sFolder.hasSubFolders)
		return null;

	},


	/**
	* Searchs all availible newsserver
	*/
	addNewsServers : function () {
		if (this.prefRead == false) {
			var accounts = this.pmpReadPref("mail.accountmanager.accounts",this.pmpS);
			if (accounts) {
					var accountsArray = accounts.split(",");

					for (var x = 0; x < accountsArray.length; x++) {
						this.addNewsServerMenuItem(accountsArray[x]);
					}
					this.accountURIs.sort(this.sortAccountUris);
			}
			this.prefRead = true;
		}
	},


	/**
	* Sortfunction for this.accountURIs Array Local Folder to the rear
	*
	* @param a and b
	* @return  1:	;	-1:
	*/
	sortAccountUris : function (a, b) {

		if (a.search(/Local%20Folders/) != -1) {
			return 1;
		} else if (b.search(/Local%20Folders/) != -1) {
			return -1;
		} else if (a < b) {
			return -1;
		} else if (a > b) {
			return 1;
		} else {
			return 0;
		}
	},


	/**
	* Adds newsserver to the context menu
	*/
	addNewsServerMenuItem : function (account) {
		var server	= this.pmpReadPref("mail.account." + account + ".server",this.pmpS);
		var servertyp = this.pmpReadPref("mail.server."  + server +  ".type",this.pmpS);
		var hostname  = this.pmpReadPref("mail.server."  + server +  ".hostname",this.pmpS);
		var username  = this.pmpReadPref("mail.server."  + server +  ".userName",this.pmpS);

		var accountURI = "";

		if (servertyp == "nntp") {
			var servername = this.pmpReadPref("mail.server." + server + ".name",this.pmpS);
			var serverport = this.pmpReadPref("mail.server." + server + ".port", this.pmpN);
			// var newsservermenuitem;

			if (servername == null) servername = hostname;
			if (serverport == null) serverport = 119;

			accountURI = "news://" + escape(hostname);
		} else if (servertyp == "imap") {
			accountURI = "imap://" + escape(username) + "@" + escape(hostname);
		} else {
			accountURI = "mailbox://" + escape(username) + "@" + escape(hostname);
		}

		if (hostname != null) this.accountURIs.push(accountURI);
	},


	/**
		* Reads the value of pmpName out of the mozilla preferences
		*
		* @param	pmpName
		* @param	pmpType	Bool,Integer or Char
		*
		* @return	pmpValue
		*/
	pmpReadPref : function (pmpName, pmpType) {
		var nsIPrefBranch = Ci.nsIPrefBranch;
		var pref = Cc["@mozilla.org/preferences-service;1"].getService(nsIPrefBranch);
		var pmpValue = null;

		if (pref.prefHasUserValue(pmpName)) {
			switch (pmpType) {
					case this.pmpB:
						pmpValue = pref.getBoolPref(pmpName);
						break;
					case this.pmpN:
						pmpValue = pref.getIntPref(pmpName);
						break;
					case this.pmpS:
						pmpValue = pref.getCharPref(pmpName);
						break;
					default:
						break;
			}
		}
		return pmpValue;
	},


	/**
		* Get msgfolder from Uri
		*
		* @param	uri
		* @return	null or msgfolder
		*/
	getMsgFolderFromUri : function (uri) {
		var msgfolder = null;

		//gW  replace nsIRDFService with MailUtils

		if (reminderfox.msgnr.whichMessenger () != "" ) {
			Cu.import("resource:///modules/MailUtils.js"); // for getFolderForURI
		}
		try {
			var resource =MailUtils.getFolderForURI(uri);

			if (resource instanceof Ci.nsIMsgFolder && (resource.parent || resource.isServer)){
				msgfolder = resource;
			}
		} catch (ex) {}

		return msgfolder;
	}

}; // reminderfox.messenger.  'MessageID' //////////////////////////////////////


///////////////// .msngr. /////Utilities for Messages  ////////////////////////

if(!reminderfox) var reminderfox={};
if(!reminderfox.msgnr) reminderfox.msgnr={};


	reminderfox.msgnr.Compose = function (subject, fromAddress,  toAddresses,
				priority, body, footer, refID, iCalToEmailFile, methodTyp) {
	// =========================================================================

				function exHtml(xString){
					return xString.replace(new RegExp(/</g),"&lt;").replace(new RegExp(/>/g),"&gt;")
				}

		if (reminderfox.util.messenger()) {
			var fromId = reminderfox.msgnr.getIdentity (fromAddress);

			if (iCalToEmailFile != null) {
				var msgAttachment= Cc["@mozilla.org/messengercompose/attachment;1"].createInstance(Ci.nsIMsgAttachment);
				msgAttachment.temporary = true;
				msgAttachment.name = iCalToEmailFile.leafName;
				msgAttachment.contentType = "text/calendar;"
				msgAttachment.contentTypeParam = "method=" + methodTyp + "; charset=UTF-8";
	//gW Darwin			msgAttachment.url = "file://" + iCalToEmailFile.persistentDescriptor;
				msgAttachment.url = "file://" + iCalToEmailFile.path;
			}

			// mail header
			var composeFields = Cc["@mozilla.org/messengercompose/composefields;1"].createInstance(Ci.nsIMsgCompFields);
			composeFields.useMultipartAlternative = true;

			composeFields.characterSet = "UTF-8";
			composeFields.from  = fromId.identityName;
			composeFields.replyTo = fromId.identityName;

			toAddresses = (toAddresses == "null") ? "" : toAddresses;
			composeFields.to = toAddresses;
			composeFields.subject = subject;
			composeFields.body = exHtml(body + footer);
			composeFields.priority = priority;

			if (iCalToEmailFile != null) {
				composeFields.addAttachment(msgAttachment);
			}
			// message compose paramaters
			var msgComposeParams= Cc["@mozilla.org/messengercompose/composeparams;1"].createInstance(Ci.nsIMsgComposeParams);
			msgComposeParams.composeFields 	= composeFields;
			msgComposeParams.identity= fromId;
			msgComposeParams.format= Ci.nsIMsgCompFormat.Default;
			msgComposeParams.type= Ci.nsIMsgCompType.New;

			// open a composer window
			var messengerCompose = Cc["@mozilla.org/messengercompose;1"].getService().QueryInterface(Ci.nsIMsgComposeService);
			messengerCompose.OpenComposeWindowWithParams(null, msgComposeParams);

			try { // with Remote send this will fail, as we don't have dialog open to place the status info
				reminderfox.core.statusSet ("Send message by " + fromId.identityName + " pending.");
			} catch (ex) {}
		} else {

			/** -- NO 'messenger' .. (like FX) ----------------------------------- **/
			/*	calling TB -reminderFox COMPOSE:{info about what to compose}	*/

			//messageString definition
			var seperator = ";\n;";

			var msgString = "Subject:"      + subject
					+ seperator + "From:"     + fromAddress
					+ seperator + "To:"       + toAddresses
					+ seperator + "Body:"     + body
					+ seperator + "Footer:"   + footer
					+ seperator + "priority:" + priority
					+ seperator + "refID:"    + refID;


			if (iCalToEmailFile != null) {
					msgString += seperator + "mailFile:" + iCalToEmailFile.path;
			}

			msgString = escape(msgString);

			var mailApp = reminderfox.util.messengerApp();
			if ((mailApp == null) || (mailApp == ""))  {
				reminderfox.util.PromptAlert(reminderfox.string("rf.messenger.notfound"));
				return;
			}

			var args = new Array();
			args [0] = "-reminderFox";
			args [1] = "COMPOSE:" + subject;
			args [2] = "-msgString";
			args [3] = msgString;		// compose items to be passed

			var go4Process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);

			try {
				go4Process.init(mailApp);
			} catch (ex) {}
			go4Process.run(false, args, args.length);

			return;		// FX schedules TB with COMPOSE:subject -msgString msgString
		}
	}


	/**
	* Send File
	*
	* @see
	*  http://mxr.mozilla.org/comm-central/source/mailnews/compose/public/nsIMsgSend.idl
	*  http://mxr.mozilla.org/comm-central/source/mailnews/compose/public/nsIMsgCompFields.idl
	*
	* @param subject		the 'subject' the mail comes with
	* @param fromAddress	the 'FROM' address sending the msg
	* @param toAddresses	the 'TO' addresses to receive the msg (csv)
	* @param body			any message 'body' to be send
	* @param tmpFile		file object containing the message
	*/
	reminderfox.msgnr.FileSend = function ( subject, fromAddress, toAddresses,
												priority, mailFile, refID) {
	// =========================================================================
		if ( reminderfox.util.messenger()) {			// 'in 'messenger' ??

			var fromId = reminderfox.msgnr.getIdentity (fromAddress);

			var composeFields = Cc["@mozilla.org/messengercompose/composefields;1"].createInstance(Ci.nsIMsgCompFields);
			composeFields.characterSet = "UTF-8";
			composeFields.to     = toAddresses;
			composeFields.from   = fromId.identityName;
			composeFields.replyTo= fromId.identityName;

			composeFields.priority= reminderfox.msgnr.setPriorityString (priority);

			var sendLater = (Services.io.offline ? Components.interfaces.nsIMsgSend.nsMsgQueueForLater
				: Components.interfaces.nsIMsgSend.nsMsgDeliverNow);

			var messengerSend = Cc["@mozilla.org/messengercompose/send;1"].createInstance(Ci.nsIMsgSend);
			messengerSend.sendMessageFile(
						fromId,				/* nsIMsgIdentity */
						fromId.key,			/* nsIMsgCompFields */
						composeFields,		/* nsIMsgCompFields */
						mailFile,			/* nsFileSpec */
						reminderfox.mail.deleteSendFileOnCompletion,
						false,				/* digest_p */
											/* nsMsgDeliverMode */
						sendLater,
						null,		/* nsIMsgDBHdr msgToReplace */
						null,		/* nsIMsgSendListener aListener */
						null,		/* nsIMsgStatusFeedback aStatusFeedback */
						"");		/* password */

		} else { // if the above fails .. in 'NON messenger'

			reminderfox.msgnr.sendwUID (refID, mailFile.path);
		}
	}

	/**
	* File Creation for message
	*
	*  FX:  encodes the whole 'content' string with .encodeUTF8
	*  TB:  NO encodes the whole 'content'
	*/
	reminderfox.msgnr.FileCreate = function (subject, fromAddress, toAddresses, priority,
										body, footer,
										refID, iCalString, methodTyp) {
	//=====================================================================
		var thisdate = new Date();

		// add app info  .. will be added to the 'footer'
		var osInfo = reminderfox.core.opSystemInfo();
		var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
		var appDetails = "\n  " + appInfo.name + " " + appInfo.version
							+ " (" + appInfo.platformBuildID + ") -- " + osInfo;

		var fContent = "MIME-version: 1.0\r\n";
		fContent += "To: " + toAddresses + "\r\n";

		if ( reminderfox.util.messenger()) {
			var contentS = "Subject: " + reminderfox.msgnr.encodeMimeHeader(subject) + "\r\n";
			contentS += "From: " + reminderfox.msgnr.getIdentity (fromAddress).identityName + "\r\n";
		} else {
			var contentS = "Subject: " + subject + "\r\n";
			contentS += "From: " + fromAddress + "\r\n";
		}
		fContent += contentS;

		fContent += "Date :" + reminderfox.date.mailDateTime(thisdate, "mailDate") + "\r\n";
		fContent += reminderfox.msgnr.setPriorityString(priority) + "\r\n";
		fContent += "Content-class: urn:content-classes:reminderfox\r\n";

		var newDate = new Date();
		var msgId = reminderfox.core.generateUniqueReminderId( newDate );

		if (refID != "") {
			fContent
			+= "Reference-ID: <" + refID + reminderfox.mail.ReferenceID + ">\r\n"
			+ "In-Reply-To: <" + refID + reminderfox.mail.ReferenceID + ">\r\n";
			+ "Message-Id: <" + msgId + reminderfox.mail.ReferenceID + ">\r\n";
		//gw_messageID/In-Reply-To w send/reply invitation
		}

		// if 'iCalString' and 'methodTyp'  send with iCal attachment
		if (!!iCalString && !!methodTyp) {
			fContent
			+= ("Content-type: multipart/mixed; boundary=\"anhang_1234567890_0987654321\"\r\n"
			+		"\r\n\r\n"
			+		"--anhang_1234567890_0987654321\r\n"
			+		"Content-type: multipart/alternative;\r\n"
			+		" boundary=\"anhang_0987654321_1234567890\"\r\n"
			+		"\r\n\r\n"

			+		"--anhang_0987654321_1234567890\r\n"
			+		"Content-type: text/plain; charset=UTF-8\r\n"
			+		"Content-transfer-encoding: 8BIT\r\n"
			+		"\r\n"

			+		body

			+ "\n-- "  /* footer delimiter line !!! do not delete !
							this notation will cut the following part from plain-text-reply !*/
			+  "\n" + footer
			+  "\n______________________________________________________"

			+  "\n  " + reminderfox.consts.REMINDER_FOX_PAGE_URL
			+  "\n  " + navigator.userAgent + " (" + navigator.language + ")"
			+	"\n\r\n\r\n\r\n"
			+	"--anhang_0987654321_1234567890\r\n"
			+		"Content-type: text/calendar; method=" + methodTyp + "; charset=UTF-8\r\n"
			+		"Content-transfer-encoding: 8BIT\r\n"
			+		"\r\n"

			+		iCalString
			+		"\r\n\r\n"
			+	"--anhang_0987654321_1234567890--\r\n\r\n"

			+	"--anhang_1234567890_0987654321\r\n"
			+		"Content-type: application/ics; name=invite.ics\r\n"
			+		"Content-transfer-encoding: 8BIT\r\n"
			+		"Content-disposition: attachment; filename=invite.ics\r\n"
			+		"\r\n"	/* need an extra line to separate header !! */

			+		iCalString
			+		"\r\n\r\n"
			+	"--anhang_1234567890_0987654321--\r\n");

		} else {	// send message with inline text

			fContent
			+= "Content-type: text/plain; charset=UTF-8\r\n"
			+  "Content-transfer-encoding: 8bit\r\n\r\n"
			+  body

			+  "\n-- "  /* footer delimiter line !!! do not delete !
								this notation will cut the following part from plain-text-reply !*/
			+  "\n" + footer
			+  "\n______________________________________________________"
			+  "\n  " + reminderfox.consts.REMINDER_FOX_PAGE_URL
			+  "\n  " + navigator.userAgent + " (" + navigator.language + ")"
			+	"\n"
		}

		if ( !reminderfox.util.messenger()) {
			fContent = reminderfox.util.encodeUTF8(fContent);
		}

		// ------ write TMP file ---------------
		return  reminderfox.util.makeFile8 (fContent, reminderfox.util.buildUIDFile(refID));
	}



	reminderfox.msgnr.setPriorityString = function (priority) {
	// =========================================================================
		var cPriority = "";
		switch (priority) {
		case "1": cPriority		= "X-Priority: 1 (Highest)"; break;
		case "2": cPriority		= "X-Priority: 2 (High)";	break;
		case "3": cPriority		= "X-Priority: 3 (Normal)";  break;
		case "4": cPriority		= "X-Priority: 4 (Low)";	break;
		case "5": cPriority		= "X-Priority: 5 (Lowest)";  break;
		default:  cPriority		= "X-Priority: 3 (Normal)";  break;
		}
		return cPriority;
	}


/////////////////// 'SendFILE' for "NON" messenger	///////////////////////////
	/**
	*	use a specific 'commandLine' Handler ... this is the NON 'messenger' part
	*/
	reminderfox.msgnr.sendwUID = function (reminderID, msgString) {
	// =========================================================================
		var mailApp = reminderfox.util.messengerApp();
		if ((mailApp == null) || (mailApp == ""))  {
			reminderfox.util.PromptAlert(reminderfox.string("rf.messenger.notfound"));
			return;
		}

		var osInfo = reminderfox.core.opSystemInfo();

		var args = new Array();
		args [0] = "-reminderFox";
		args [1] = "UID:"+ (reminderID);
		args [2] = "-msgString";

		var tmpD = Cc["@mozilla.org/file/directory_service;1"]
				.getService(Ci.nsIProperties)
				.get("TmpD", Ci.nsIFile);


/*----------//§§		check with Windows/OSX
		if(osInfo.indexOf("Darwin") != -1) {
			args [3] = tmpD;
		} else {
			args [3] = tmpD.path.substring(3);
		}
---------- */
		args [3] = msgString

		var cDate = new Date();
		var msgLog = " ** Send with **	UID:" + reminderID + " at: " + cDate;
		reminderfox.core.statusSet(msgLog);
		reminderfox.util.Logger('remote',msgLog)

		var go4Process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);

		try {
			go4Process.init(mailApp);
			} catch (ex) {}
		go4Process.run(false, args, args.length);

		return;		// scheduled TB with UID:reminderID -msgString mailFile.path
	}

	/**
	*  called from 'commandLine' Handler ... this is the 'messenger' part
	*/
	reminderfox.msgnr.sendwUIDgo = function () {
	// ========================================================================
		if (!(reminderfox.mail.cmdID.indexOf('UID:') > -1)) { // check transfered code and validity
			return;	// not valid!! Terminate
		}
		window.close();

		var icsFile = reminderfox.util.buildUIDFile(reminderfox.mail.cmdID.substring(4))

		var icsData = reminderfox.util.readInFileContents(icsFile)
						.replace(/(\r\n)/g,"\n");

		if (icsData.indexOf (reminderfox.mail.cmdID+"\n") == -1) {
			var msgError = "*** Transfered ICS data has error: -1 ***"
					+ "\n	data >>" +  reminderfox.mail.cmdID + "<<";
			reminderfox.util.Logger('remote', msgError);
			return;	// not valid!! Terminate
		}

		var msgString = reminderfox.mail.cmdString.split(";\n;");

		// retrieve msg infos from 'ics file'
		var msgLines = icsData.split("\n");

		var toAddresses	= msgLines[1].substring(4);
		var subject			= msgLines[2].substring(9);
		var fromAddress	= msgLines[3].substring(6);
		var priority		= msgLines[5].substring(12,13);

		reminderfox.util.makeMsgFile (msgLines.join("\n"), icsFile);

		var mailFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
		mailFile.initWithPath(icsFile);

		reminderfox.msgnr.FileSend(
					subject,
					fromAddress,
					toAddresses,
					priority,
					mailFile);
	}

//////////////////// 'COMPOSE' for NON 'messenger'	///////////////////////////

	/**
	*	use a specific 'commandLine' Handler ... this is the NON 'messenger' part
	*
	**/
	reminderfox.msgnr.composeMSG = function (reminderID, msgString) {
	// =========================================================================
		var mailApp = reminderfox.util.messengerApp();
		if ((mailApp == null) || (mailApp == ""))  {
			reminderfox.util.PromptAlert(reminderfox.string("rf.messenger.notfound"));
		return;
		}

		var args = new Array();
		args [0] = "-reminderFox";
		args [1] = "COMPOSE:"+ (reminderID);
		args [2] = "-msgString";
		args [3] = msgString;

		var go4Process = Cc["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);

		try {
			go4Process.init(mailApp);
		} catch (ex) {}
		go4Process.run(false, args, args.length);
		return;		// FX schedules TB with COMPOSE:reminderID -msgString msgString
	}

/**
  *  called from 'commandLine' Handler ... this is the 'messenger' part
  */
	reminderfox.msgnr.composeMSGgo = function () {
	// =========================================================================
		if (!(reminderfox.mail.cmdID.indexOf('COMPOSE:') > -1)) { // check transfered code and validity
			return;	// not valid!! Terminate
		}
		window.close();

		// retrieve msg infos from passed window parameters
		var msgString = unescape(reminderfox.mail.cmdString).split(";\n;");

		var subject		= msgString[0].substring(8);
		var fromAddress	= msgString[1].substring(5);
		var toAddresses	= msgString[2].substring(3);
		var body			= msgString[3].substring(5);
		var footer		= msgString[4].substring(7);
		var priority		= msgString[5].substring(9);
		var refID			= msgString[6].substring(6);

		var mailFile = null;
		if (msgString[7] != null) {
			var icsFile		= msgString[7].substring(9);
			mailFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
			mailFile.initWithPath(icsFile);
		};

	// var toAddresses	= "";
	var methodTyp	= "PUBLISH";

	reminderfox.msgnr.Compose (subject, fromAddress,  toAddresses,
		priority, body, footer, refID, mailFile, methodTyp);
	}

//////////////////// utilities 'messenger' /////////////////////////////////////


	reminderfox.msgnr.getAccountMngr = function () {
	// =========================================================================
		return Cc["@mozilla.org/messenger/account-manager;1"]
				.getService().QueryInterface(Ci.nsIMsgAccountManager);
	}

	reminderfox.msgnr.encodeMimeHeader = function (header) {
	// =========================================================================
		var mimeConverter = Cc["@mozilla.org/messenger/mimeconverter;1"]
				.createInstance(Ci.nsIMimeConverter);
		return mimeConverter.encodeMimePartIIStr_UTF8(header, false,
				"UTF-8", header.indexOf(":") + 2, 72);
	}

	/**
	*	'messenger'		use mail.accountmanager.accounts and identities
	*	NON 'messenger'	prefs = extensions.reminderFox.mail.sender
	*/
	reminderfox.msgnr.myMailIDs = function () {
	// =========================================================================
		if (reminderfox.util.messenger()) { // OK: if we are in 'mail' system (TB, SM)

			reminderfox.msgnr.getIdentity ("");
			mailIds = reminderfox.msgnr.mailIdentities;

		} else { // 'NON messenger' .. eg.FX etc ...
			var mailIds = reminderfox.core.getPreferenceValue(reminderfox.consts.MAIL_SENDER, "");
		}
		return mailIds;
	}

reminderfox.msgnr.mailIdentities = "";

	/**
	* Checks for valid 'address' in nsIMsgIdentity
	* @returns {object} 'identity' of valid 'address' or from the 'defaultIdentity'
	*/
	reminderfox.msgnr.getIdentity = function (address) {
	// =========================================================================
		Cu.import("resource:///modules/iteratorUtils.jsm");
		Cu.import("resource:///modules/mailServices.js"); // needed for MailServices.compose etc.
	//	Cu.import("resource://gre/modules/Services.jsm");

		reminderfox.msgnr.mailIdentities = "";

		var identity = null;

      // see bug https://bugzilla.mozilla.org/show_bug.cgi?id=1113097    2015-04-23 gW
      // Bug 1340947 - Remove legacy generator from fixIterator and use for-of in consumers.  2017-08 gW
      for (var account of fixIterator(MailServices.accounts.accounts, Ci.nsIMsgAccount)) {
         for (var id of fixIterator(account.identities, Ci.nsIMsgIdentity)) {
				// We're only interested in identities that have a real email.
				if (id.email != null)
					reminderfox.msgnr.mailIdentities += id.identityName + ',';

				if (id.email == reminderfox.mail.address(address).email) {
					identity = id;
				}
			}
		}
		if (reminderfox.msgnr.mailIdentities == "")
			reminderfox.msgnr.mailIdentities = reminderfox.msgnr.getAccountMngr().defaultAccount.defaultIdentity
		if (reminderfox.msgnr.mailIdentities.charAt(reminderfox.msgnr.mailIdentities.length-1) == ',')
			reminderfox.msgnr.mailIdentities = reminderfox.msgnr.mailIdentities.substring(0,reminderfox.msgnr.mailIdentities.length-2)

		if (identity == null) reminderfox.msgnr.getAccountMngr().defaultAccount.defaultIdentity;
		return identity;
	};


	/**
	* Checks for the messenger version (TB, SM, PB)
	* and sets the global parameter 'reminderfox.msgnr.name'
	*
	* If in Firefox returns empty string
	*
	* @return  [string]  reminderfox.msgnr.name
	*/
	reminderfox.msgnr.whichMessenger = function () {
	// =========================================================================
		if (reminderfox.msgnr.name == "") {

			var idName = "";

			// https://developer.mozilla.org/en/Using_nsIXULAppInfo
			var id;
			if("@mozilla.org/xre/app-info;1" in Cc) {
			// running under Mozilla 1.8 or later
				id = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).ID;
			} else {
				try {
					id = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch)
						.getCharPref("app.id");
				} catch(e) {}
			}

			var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
			switch (id) {
				case (reminderfox.util.SEAMONKEY_ID) : idName = "SM"; break;
				case (reminderfox.util.THUNDERBIRD_ID) :  idName = "TB3"; break;
			}
			reminderfox.msgnr.name = idName;

			var ab3 = (typeof Ci.nsIAbItem == "object") ? true :false;

//var msg = "reminderfox.msgnr.name: " + reminderfox.msgnr.name + "  TB ab3: " + ab3;
//reminderfox.util.Logger('OSinfo', msg);
		}
		return reminderfox.msgnr.name;
	}
