/**
  * rmFxIcalMail.js
  *
  *	SEND:
  *	  Reminderfox events stored in the users list can be send using the TB/mail facility.
  *	  Sending modes are:
  *	  - just send one or more events from the list to another
  *				user, this is the METHOD:PUBLISH.
  *	  - send one event as "Invitation" or "Schedule", this is
  *				based on RFC2446 (iTIP)
  *	  Current implementation supports:
  *	  -- METHOD: PUBLISH, REQUEST, REPLY
  *
  *	RECEIVE:
  *	  ICS-file with RFC2445 (iCalendar) data is read and added
  *			to the Reminderfox.ics file.
  *	  The ICS-data can be part of the body or attached as an ICS file.
  *	  The data is interpreted in conformance to RFC2446 and supports:
  *		-- METHOD: PUBLISH, REQUEST, REPLY, CANCEL
  *
  *	NOTE:
  *		Both RFC's are not covered in all aspects, for actual implementation
  *			please refer to  'RmFx_iCal_iTIP_Implementation.pdf'
  *
  *	@since 2008-04-14
  *	  - messageID added to event. This enables to call msg from reminder
  *				and reminder from msg;
  *	  - msg tagging with iCal METHOD;
  *	  - D&D added;
  *	  - Attendee can process CANCEL send by Organizer;
  *	  - supports reminderfox.util.PromptAlert(msg) instead of plain 'alert';
  *
  *	@since 2009-03 D&D:  moved to  'utils/rmFxUserIO.js'
  *
  *	@see  'RmFx_iCal_iTIP_Implementation.pdf'
  **/
if(!reminderfox)		var	reminderfox = {};
if(!reminderfox.iCal)		reminderfox.iCal = {};
if(!reminderfox.util)		reminderfox.util ={};


reminderfox.iCal.fromMailadr = null;
//  reminderfox.iCal.method;  ==> .core.
reminderfox.iCal.attendees = null;
reminderfox.iCal.organizer = null;
reminderfox.iCal.messageId = null;
reminderfox.iCal.lastEvent = null;
reminderfox.iCal.selectedReminders = null;

//Components.utils.import("resource:///modules/Services.jsm");
try{
    Components.utils.import("resource://gre/modules/Services.jsm");
}catch(e){}
try{
    Components.utils.import("resource:///modules/MailServices.js")
}catch(e){}


/**
 *  Get the selected attachments if messagePane id open
 *
 * 	@return  {object}  thisAttachments  or null
 */
reminderfox.iCal.getAttachments= function () {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var attachmentList = document.getElementById("attachmentList")

	var attachments = ""
	if ((!attachmentList.parentNode.collapsed) && (attachmentList.selectedCount > 0)) {
		for (var n = 0; n <  (attachmentList.selectedCount); n++) {
			attachments += attachmentList.selectedItems[n].attachment.name + ";"
		}
	}
	return attachments;
}


/**
 *  'Add/Subscribe' or 'Import iCal/ICS' for *selected* message/attachment(s)
 *  Works with context menu (on message or attachment) or
 *  with drag&drop of message from messagePane or attachment from message.
 *
 *  Build '[Mail] reminder' if NO iCal/ICS data found
 *
 *  iCal/ICS data on body or attachment will do an 'Import'.
 *
 * Context Menu on reminderFoxOverlay.xul
 *   'Add/Subscribe'    "reminderfox-mail-AddReminder"
 *   'Import iCal/ICS'  on mailContext:    reminderfox-mail-ICS_Msg
 *                      on attachmentList: reminderfox-mail-ICS_List
 *                      on attachmentItem: reminderfox-mail-ICS_Item
 *
 * Drag&Drop  to SmartFoxy of FX/TB
 *  from messagePane     reminderfox-mail-ICS_Msg
 *  from attachments     reminderfox-mail-ICS_Item
 *
 * @param {Object} event  (with event.id)
 */
reminderfox.iCal.addReminder4Message= function (event) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var msgHdr = gDBView.hdrForFirstSelectedMessage;
	var uri = msgHdr.folder.getUriForMsg(msgHdr);

	var msgDetails =reminderfox.util.selectionDetails(msgHdr, "");


Components.utils.import("resource:///modules/gloda/mimemsg.js");

	reminderfox.core.method = "";
	try {
		document.getElementById('threadPaneContext').hidePopup();
	} catch (e) {}
	try {
	document.getElementById('messagePaneContext').hidePopup();
	} catch (e) {}

	var msgHdr = gDBView.hdrForFirstSelectedMessage;
	var msgDetails = reminderfox.util.selectionDetails(msgHdr);
	var thisAttachments = reminderfox.iCal.getAttachments();

//	try {
	//gWXXX  TODO  this will fail with "news://"		Fehler: aMimeMsg is null
	MsgHdrToMimeMessage(msgHdr, null, function (aMsgHdr, aMimeMsg) {
		aAttachments = aMimeMsg.allUserAttachments || aMimeMsg.allAttachments;
		var numAttachments = aAttachments.length

		var msgDetails = reminderfox.util.selectionDetails(msgHdr);
		var hasICSattachment = false

		if (event.id.indexOf('reminderfox-mail-ICS') /*contextMode*/ != -1) { // go for attachment
		var aNum = 0;
		while (aNum < numAttachments) {

			var _contentType;
			var url;

			_contentType = aAttachments[aNum].contentType.toLowerCase();
			_attachmentName = aAttachments[aNum].name

			if ((thisAttachments != "") && (thisAttachments.indexOf(_attachmentName + ';') != -1)
				|| (thisAttachments == "") && (_attachmentName != ""))
			if ( (_contentType == "text/calendar")                   /* 'normal' apps */
				|| (_contentType == "text/plain")                     /* ?? as with DB Reservations */
				|| (_contentType == "application/ics")                /*  Google Calendar */
				|| (_contentType == "application/octet-stream")) {    /* some calendars do not identify as calendar type */

				var iOService = Cc["@mozilla.org/network/io-service;1"]
                                    .getService(Ci.nsIIOService);

				var uri = iOService.newURI(aAttachments[aNum].url, null, null);
				var channel = iOService.newChannelFromURI2(uri,
                                     null,
                                     Services.scriptSecurityManager.getSystemPrincipal(),
                                     null,
                                     Ci.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
                                     Ci.nsIContentPolicy.TYPE_OTHER);

				var chunks = [];
				var data = "";
				var listener = {
					setMimeHeaders: function () {
					},

					onStartRequest: function (/* nsIRequest */ aRequest, /* nsISupports */ aContext) {
					},

					onStopRequest: function (/* nsIRequest */ aRequest, /* nsISupports */ aContext, /* int */ aStatusCode) {
						var aData = data;

						// check for iCal/ICS -- if true process as 'Add Reminder'
						if((aData.indexOf("BEGIN:VCALENDAR") != -1) &&
								((aData.indexOf("VEVENT") != -1) || (aData.indexOf("VTODO") != -1))){

							hasICSattachment = true
							setTimeout(function () {
								reminderfox.iCal.getICS(aData, msgDetails, _attachmentName)
							},10);
						};
					},

					onDataAvailable: function (/* nsIRequest */ aRequest, /* nsISupports */ aContext,
						/* nsIInputStream */ aStream, /* int */ aOffset, /* int */ aCount) {
						var scriptableStream = Cc["@mozilla.org/scriptableinputstream;1"]
								.createInstance(Ci.nsIScriptableInputStream);
						scriptableStream.init(aStream);
						data = scriptableStream.read(scriptableStream.available());

					}
				}; // listener

				channel.asyncOpen(listener, null);
			} // check for iCal attachment content
			aNum++;
		}; // while numAttachments
		} // check for body/attachment

		var bodyHasICS = false
		if (event.id.indexOf('-mail-ICS_Item') /*contextMode*/ == -1 ) { // go for body
			var msgBody = reminderfox.iCal.getMessageBody(msgHdr);
			if((msgBody.indexOf("BEGIN:VCALENDAR") != -1) &&
					((msgBody.indexOf("VEVENT") != -1) || (msgBody.indexOf("VTODO") != -1))){

				var ainfo = " 'Import iCal data' received with a message containing iCal data ";

				bodyHasICS = reminderfox.iCal.getiCalFromString(msgBody, msgBody.summary, ainfo);
			}

			if (!bodyHasICS && !hasICSattachment){ // if body has ics data the !hasICS prevents to open "Add" dialog
				var newDate = new Date();
				newDate.setDate( newDate.getDate() + 1 );  // default to using tomorrow's date for reminder
				var reminderId =reminderfox.core.generateUniqueReminderId( newDate );

				var newReminderToBeAdded = new reminderfox.core.ReminderFoxEvent(reminderId, newDate, msgDetails.infos.subject );
				newReminderToBeAdded.messageID = msgDetails.infos.messageId;
				newReminderToBeAdded.priority = msgDetails.infos.priority;
				newReminderToBeAdded.notes = msgDetails.infos.notes;

				reminderfox.iCal.tagging(reminderfox.core.addReminderHeadlessly(newReminderToBeAdded), "", false);
			} // ics data
		}// go for body
	}); // MsgHdrToMimeMessage
//	} catch (ex) {}
};


reminderfox.iCal.getICS= function (_content, msgDetails, _attachmentName) {  // msgDetails, _attachmentName
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var _reminderEvents = new Array();
	var _todosArray = { };
	reminderfox.core.readInRemindersAndTodosICSFromString(_reminderEvents, _todosArray, _content, true, true /*makeNewUID*/);

	if( _reminderEvents.length ==1) {
		var method = reminderfox.core.method;
		reminderfox.iCal.tagging(reminderfox.iCal.getEvents(msgDetails.infos.subject, _reminderEvents, _todosArray, "" /*info*/), method, "" /*info*/);
		return;
	}

	msgDetails.url = _attachmentName
	msgDetails.summary = _attachmentName

	var xulData = {
		reminders      : _reminderEvents,
		todos          : _todosArray ,
		details        : msgDetails
	}
	window.setCursor('auto')
	window.openDialog('chrome://reminderFox/content/utils/rmFxImportHandling.xul',
		'reminderFox-importSubscribeReminders', 'modal, centerscreen', xulData);
}



/**
 * Read the message body to a stream
 *
 * @param {msgHdr} aMessageHeader
 */
reminderfox.iCal.getMessageBody= function (aMessageHeader){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var messenger = Cc["@mozilla.org/messenger;1"]
		.createInstance(Ci.nsIMessenger);
	var listener = Cc["@mozilla.org/network/sync-stream-listener;1"]
		.createInstance(Ci.nsISyncStreamListener);
	var uri = aMessageHeader.folder.getUriForMsg(aMessageHeader);

	messenger.messageServiceFromURI(uri)
		.streamMessage(uri, listener, null, null, false, "");

	var folder = aMessageHeader.folder;
	return folder.getMsgTextFromStream(listener.inputStream,
		aMessageHeader.Charset,
		65536,
		32768,
		false,
		true,
		{ });
};


/**
 *  Reads iCal/ICS from a string and converts to event and todo arrays
 *    @param  {string}  _content
 *    @param  {string}  mInvitation
 *    @param  {string}  info  about caller/function
 *    @return {boolean} rv =  true with sucess
 */
reminderfox.iCal.getiCalFromString= function (_content, mInvitation, info) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// if no iCAL/ICS data return with 'false'
	if (!((_content.indexOf("BEGIN:VCALENDAR") != -1) &&
			((_content.indexOf("VEVENT") != -1) || (_content.indexOf("VTODO") != -1)))){
		return false;
	}

	var _reminderEvents = new Array();
	var _todosArray = { };
	reminderfox.core.readInRemindersAndTodosICSFromString(_reminderEvents, _todosArray, _content, true, true /*makeNewUID*/);

	// need to remember 'METHOD' from the string to tag the message correctly!
	var method = reminderfox.core.method;

	reminderfox.iCal.tagging(reminderfox.iCal.getEvents(mInvitation, _reminderEvents, _todosArray, info), method, info);
	return true;
};


/**
 * 	Tag a message
 *
 * @param {Boolean} rv
 * @param {object}  tag  null --> 'Reminderfox <br>
 *                  string --> iCal-(string); eg. iCal-Reply
 * @param {string} info
 */
reminderfox.iCal.tagging= function (rv, tag, info) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.util.JS.dispatch('tagging');

	if (reminderfox.util.messenger()) {
		if ((tag == null) && (rv == true)){
			reminderfox.tagging.msg('Reminderfox', true, '#3333FF');
			return;
		}
		if ((tag != "") && (rv == true)){
			reminderfox.tagging.msg('iCal-' + tag, true, '#3333FF');
		}
	}
};


/**
 *  Get all Events/Todos from
 *
 *    @param  {string}  mInvitation
 *    @param  {array}   _reminderEventsArg
 *    @param  {array}   _todosArrayArg
 *    @param  {string}  info  about caller/function
 *    @return {boolean} rv =  should be true if added to list, so tag the msg
 */
reminderfox.iCal.getEvents= function(mInvitation, _reminderEventsArg, _todosArrayArg, info) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//  First we need to know the METHOD of the event
	//	 with "send"     it's set by processing before
	//	 with "receive"  it's written to "reminderfox.core.method;"
	var method = reminderfox.core.method;


	// now iterate over each VEVENT, for Invitations
	// get infos into reminder.notes ... depended of "METHOD"
	var numEvents = _reminderEventsArg.length;
	for ( var i = 0; i < numEvents; i++ ) {
		var reminder = _reminderEventsArg[i];

		// prevent to import reminders without UID .. as they may come from Outlook
		if (reminder.id == null) {
			reminder.id = reminderfox.core.generateUniqueReminderId() ;
		}
		var result = reminderfox.iCal.processExtraScheduleInfo(reminder, mInvitation, method );
		if (result != "") {
			reminderfox.util.PromptAlert(result);
			return false;
		}
	}
	// count the VTODOs
	var numTodos = 0;
	for ( var list in _todosArrayArg ) {
		var cList = _todosArrayArg[list];
		for (var next in cList) {
			numTodos++;
		}
	}
	var multipleEventsOrTodo =  ((numEvents > 1) || (numTodos > 0)) ? true : false;

	// #1	handle multiple VEVENT  OR  VTODO -->>  import them all with normal import

	if (multipleEventsOrTodo) {
		// check [Revert] status
		// import with tagging the 'CATEGORIES' item, ask user / get prefs

		var params = { mode: 'CANCEL',
			categories:"importICS",
			numEvents:numEvents,
			numTodos:numTodos,
			info: "## " + info };

		window.openDialog("chrome://reminderfox/content/categories/rmFxImportWithCategory.xul",
		"rmFx_ReminderImportwCategory", "chrome,resizable,modal", params);
		// mode :  CANCEL or OK
		if (params.mode == 'CANCEL'){ return 'CANCEL'} //  false;}

		// ...  add CATEGORY item for import
		var categoryItem = params.categories;

		for ( var i = 0; i < _reminderEventsArg.length; i++ ) {
			reminder = reminderfox.util.addCategory4Import (_reminderEventsArg[i], categoryItem);
		}
		for ( var list in _todosArrayArg ) {
			var cList = _todosArrayArg[list];
			for (var next in cList) {
				reminderfox.util.addCategory4Import (cList[next], categoryItem);
			}
		}

		var rv = reminderfox.util.addMultipleEvents(_reminderEventsArg, _todosArrayArg);
		return rv;
	} // multipleEventsOrTodo

	// #2a  single Event/Schedule.
	//		 Check for Reminders passed. None --> return false;
	var reminder = _reminderEventsArg[0];	// the 'read' reminder
	if (reminder == null) return false;	 // no Reminders, return

	reminderfox.iCal.lastEvent = reminder;

	// #2b	loop with all reminders in list and check if already in reminder.ics
	//		 known:  return false
	//		 new:    call the "Add Reminder" dialog, return "true" if finally added,
	//		           "false" if user suspend adding

	var statusMessage="";
	reminder.messageID = reminderfox.iCal.messageId;

	var newExtra = reminderfox.core.extraInfoArray(reminder);  // the 'extraInfo' items

	reminderfox.core.reminderFoxEvents = null;
	var activeReminders = reminderfox.core.getReminderEvents();

	for (var nR =0; nR < activeReminders.length; nR++) {
		if (reminder.id == activeReminders[nR].id ) {
			// reminder already known, check for details and alert it.

			var oldExtra = reminderfox.core.extraInfoArray(activeReminders[nR]);
			var same  = (reminderfox.core.extraInfo(newExtra,"DTSTAMP"))
						== (reminderfox.core.extraInfo(oldExtra,"DTSTAMP"))
						&& (reminderfox.core.extraInfo(newExtra,"SEQUENCE"))
						== (reminderfox.core.extraInfo(oldExtra,"SEQUENCE")) ;	  //++++2do  ++++2do  ++++2do  ++++2do  ++++2do
																		//  check for oldSEQ > newSEQ  ==> ERR
			var older = (reminderfox.core.extraInfo(newExtra,"DTSTAMP"))
						<= (reminderfox.core.extraInfo(oldExtra,"DTSTAMP"))
						|| (reminderfox.core.extraInfo(newExtra,"SEQUENCE"))
						 < (reminderfox.core.extraInfo(oldExtra,"SEQUENCE")) ;	  //++++2do  ++++2do  ++++2do  ++++2do  ++++2do
																	//		  for oldDTSTAMP > new ==> ERR

			switch (method) {

				case "CANCEL":  {
					// check if msg/cancel was already processed
					if  (same == true) {
						statusMessage = mInvitation
										+ "\n\n[CANCEL] " + ' "' + activeReminders[nR].summary + '"   '
										+  "\n\n" + reminderfox.string("rf.schedule.attendee.processed");
						reminderfox.util.PromptAlert(statusMessage);
						return false;
					}
					if  (older == true) {
						statusMessage = mInvitation
										+ "\n\n[CANCEL] " + ' "' + activeReminders[nR].summary  + '" '
										+  "\n\n" + reminderfox.string("rf.schedule.older1.processed")
										+  "\n"   + reminderfox.string("rf.schedule.older2.processed") ;
						reminderfox.util.PromptAlert(statusMessage);
						return false;
					}
					// save all event-items {reminder.xx} if not included
					// in CANCEL-msg {activeReminders[nR].xx}
					//	 reminder.categories, reminder.location, reminder.url, reminder.priority,
					// also set Description to [iCal CANCEL] ....
					//
					if (reminder.categories == null) {reminder.categories = activeReminders[nR].categories};
					if (reminder.location == null) {reminder.location = activeReminders[nR].location};
					if (reminder.url == null) {reminder.url = activeReminders[nR].url};
					if (reminder.priority == null) {reminder.priority = activeReminders[nR].priority};
					reminder.notes = reminder.notes +'\n\n' +  activeReminders[nR].notes;

					break;
				}

				case "REQUEST":  {
					// check if msg/reply was already processed
					if (same == true) {
						statusMessage = mInvitation
									+ "\n\n[REQUEST] " + ' "' + activeReminders[nR].summary + '"   '
									+ "\n\n" + reminderfox.string("rf.schedule.attendee.processed");
						reminderfox.util.PromptAlert(statusMessage);
						return false;
					}
					if (older == true) {
						statusMessage =  mInvitation
									+ "\n\n[REQUEST] " + '" ' + activeReminders[nR].summary + '"   '
									+ "\n\n" + reminderfox.string("rf.schedule.older1.processed")
									+ "\n" + reminderfox.string("rf.schedule.older2.processed");
						reminderfox.util.PromptAlert(statusMessage);
						return false;
					}
					break;
				}

				case "REPLY":  {
					// check if msg/reply was already processed.
					// result on 'same' only doesn't say if the current
					// processed msg was already processed.
					// So we check if a TAG 'iCal-Reply' is added to the msg.

					// this.currentHeaderData.tags.headerValue
					var msgHdr = gDBView.hdrForFirstSelectedMessage;
					var msgKeys = msgHdr.getStringProperty("keywords");
					if	((same == true) && (msgKeys.indexOf("iCal-REPLY") > -1)) {

						var msg = mInvitation
									+ "\n\n[REPLY] " + ' "' + activeReminders[nR].summary + '"   '
									+ "\n\n" + reminderfox.string("rf.schedule.attendee.processed");
						if (confirm(msg + "\n\n" + reminderfox.string("rf.schedule.processReply")) == false) {
							return false;
						}
					}

					var attNo;

					reminderfox.iCal.fromMailadr = msgHdr.mime2DecodedAuthor;

					var fromAttendee = reminderfox.iCal.fromMailadr.substring(
								reminderfox.iCal.fromMailadr.indexOf( "<" ) + 1,
								reminderfox.iCal.fromMailadr.indexOf( ">" ));
					var fromATT = fromAttendee.toUpperCase();

					for ( var i = 0; i < reminderfox.iCal.attendees.length; i++ ) {
						if (reminderfox.iCal.attendees[i].toUpperCase().indexOf(fromATT) > -1) attNo=i;
					}
					// is the "from" address == the ATTENDEE ??,
					// if NOT  --> unknown CU ( + a "Party Crasher") ...
					//  So we have to ask the user which ATTENDEE has to be taken here
					if (reminderfox.iCal.attendees[attNo] == null) {

						var results = { attendees:reminderfox.iCal.attendees };
						window.openDialog("chrome://reminderfox/content/mail/rmFxReplyAttendees.xul",
						"rmFx-set-getReplyAttendee", "chrome,resizable,modal", results);
						// CANCEL and not seleteced ==  -1
						// OK and selected == #
						if (results.attendeeNo == -1){
							return false;}

						var xx= reminderfox.iCal.attendees[results.attendeeNo];

						var fndIndex = xx.toUpperCase().lastIndexOf( "MAILTO:" );
						if (fndIndex == -1) { return false};
							var fromATT =  xx.substring( fndIndex + 7).toUpperCase();
					}
					// clone the stored event and update some items from
					// newEvent [REPLY] to oldEvent [the stored]
					//  - save the .notes
					var replyReminderNotes = reminder.notes;

					//  - ATTENDEE  grap the new
					for ( var i = 0; i < newExtra.length; i++ ) {
						if (newExtra[i].toUpperCase().indexOf(fromATT) > -1) var iNew=i;
					}
					for ( var i = 0; i < oldExtra.length; i++ ) {
						if (oldExtra[i].toUpperCase().indexOf(fromATT) > -1) var iOld=i;
					}
					oldExtra[iOld] = newExtra[iNew];

					// rebuild the extraInfo string
					for ( var i = 0; i < oldExtra.length; i++ ) {
						if (i==0) {activeReminders[nR].extraInfo = oldExtra[i];
						} else {
						activeReminders[nR].extraInfo += "\\n" + oldExtra[i];}
					}

					reminder = activeReminders[nR];
					reminder.notes = replyReminderNotes
						+ "\n _._._._._._._ " + reminderfox.string("rf.schedule.previous") + " _._._._._._._\n"
						+ activeReminders[nR].notes;
					break;
				}  //METHOD:REPLY

				default: {//METHOD: ... all other (for the moment)
					  //  get info from reminder 'in the list'

					var rSEQ = reminderfox.core.extraInfo(oldExtra,'sequence')
					var rDTSTAMPz = reminderfox.core.extraInfo(oldExtra,'dtstamp');

					var rDTSTAMP = "";
					if (rDTSTAMPz != null ) {
							 rDTSTAMP= reminderfox.date.parseDateTimes(rDTSTAMPz) ;
					}
					//  get info from 'new' reminder
					var nSEQ = reminderfox.core.extraInfo(newExtra,'sequence');
					var nDTSTAMPz = reminderfox.core.extraInfo(newExtra,'dtstamp');

					var nDTSTAMP = "";
					if ( nDTSTAMPz != null ) {
							 nDTSTAMP =  reminderfox.date.parseDateTimes(nDTSTAMPz) ;
					}
					var newStr = reminderfox.string("rf.schedule.new");
					var oldStr = reminderfox.string("rf.schedule.old");

					var info1 = reminderfox.string("rf.reminder") + " [ " + activeReminders[nR].summary + " ] \n"
						+reminderfox.string("rf.schedule.check.summary")+ nR + "\n\n";

					var info2 =  "\n\nSEQUENCE\n	 "+ newStr +":  [#"	  + nSEQ		+ "]	  "+ oldStr +": [#" + rSEQ
						+	"]\nDTSTAMP \n	  "+ newStr +":  [" + nDTSTAMP + "]	  "+ oldStr +":  [" + rDTSTAMP + "]";

					if ((+nSEQ) > (+rSEQ)) { // new SEQUENCE should be greater
						statusMessage = reminderfox.string("rf.schedule.new") + " '" + reminderfox_Method + "' "
										+ " SEQUENCE" + " #" + nSEQ ;
				//	alert (info1  + statusMessage +  info2) ;
					} else {
						if (nDTSTAMPz  <= rDTSTAMPz  ) {
							statusMessage = "SEQUENCE / DTSTAMP " + reminderfox.string("rf.schedule.notValid");
							reminderfox.util.PromptAlert(info1  + statusMessage +  info2) ;
							return false;

						} else {
							statusMessage = reminderfox.string("rf.schedule.newDate") + "  [" + nDTSTAMP + "]";
							//				  alert (info1  + statusMessage +  info2) ;
						}
					}

					if (statusMessage != ""  && activeReminders[nR].notes != null)  {
						reminder.notes += "\n _._._._._._._ "
											+ reminderfox.string("rf.schedule.previous")
											  +  " _._._._._._._\n" +
						activeReminders[nR].notes
					}
				} // METHOD  ... all other
			} // switch
		} // reminder already known
	} //#2a	-- loop with all reminders in  list

	var rv = reminderfox.core.addReminderHeadlessly(reminder);
	return rv;  // should be true if added to list, so tag the msg
};

/**
 *   Reads the '.extraInfo' of a reminder to prepare the reminder.notes
 *   which reflects the schedule items,
 *   on error situations return message string
 *
 *    @param  {array}  reminder:     current reminder
 *    @param  {string} mInvitation   string
 *    @param  {string} aMethod:  REPLY, REQUEST, CANCEL, COUNTER, DECLINECOUNTER
 */
reminderfox.iCal.processExtraScheduleInfo= function (reminder, mInvitation, aMethod ) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var msgReturn="";

	if ( reminder.extraInfo == null ) return msgReturn;

//  here we need to know the METHOD of the event
//    it's written to "this.reminderfox_Method"
//     eg.  REPLY, REQUEST, CANCEL, COUNTER, DECLINECOUNTER

	//var this.method = this.reminderfox_Method;

	var addPerson = "";
	var addOption="";  var iSchComment = null;  var iSchStatus = null;
	var nDTSTAMP;      var iSchStart;           var iSchEnd;
	var option ="";
	var ret = "\n";

	var extraInfos =  reminderfox.core.extraInfoArray(reminder);

	var nDTSTAMPz = reminderfox.core.extraInfo(extraInfos,"DTSTAMP");
	if (nDTSTAMPz != "" ) {
		nDTSTAMP  =  reminderfox.date.parseDateTimes(nDTSTAMPz);
	}
	var nSEQ = reminderfox.core.extraInfo(extraInfos,"SEQUENCE");

	option = reminderfox.core.extraInfo(extraInfos,"COMMENT");
	if (option != "") iSchComment = option + ret;

	// next items go with  'addOption' to Notes
			function addOptItem (option, optText) {
				// var option = reminderfox.core.extraInfo(extraInfos,"PRIORITY");
				return ((option == null) || (option == ""))
					? ""
					: "	 " + optText + " [" + option +  "]";
			}
	addOption += addOptItem (reminderfox.core.extraInfo(extraInfos,"PRIORITY"), "Priority");
	addOption += addOptItem (reminderfox.core.extraInfo(extraInfos,"CLASS"), "Class");
	addOption += addOptItem (reminderfox.core.extraInfo(extraInfos,"CUTYPE"), "CuType");
	addOption += addOptItem (reminderfox.core.extraInfo(extraInfos,"TRANSP"), "TRANSP");

	// ---->>  process PERSONS infos  ------
	var myMailAccounts = reminderfox.msgnr.myMailIDs();

	reminderfox.iCal.organizer = reminderfox.core.extraInfo(extraInfos,"ORGANIZER", ";");

	// check if ORGANIZER is part of my accounts,
	//	 if METHOD:REPLY  it has to be! Else ERROR, don't add to reminder.ics
	if (aMethod == "REPLY") {
		var fndIndex = reminderfox.iCal.organizer.toUpperCase().lastIndexOf( "MAILTO:" );
			if (fndIndex != -1) {
			var fndString = "<" + reminderfox.iCal.organizer.substring( fndIndex + 7) + ">";
			if (myMailAccounts.indexOf(fndString) == -1 ) {
				msgReturn = "[REPLY] " +reminderfox.string("rf.schedule.replyWrongOrganizer")
					+  ": \n" + fndString;
				return msgReturn;
			}
		}
	}

	// get PARTSTAT for myAccount
	var _Attendees = reminderfox.core.extraInfo(extraInfos,"ATTENDEE", ";", true);  // true==read multiple entries
	var attPart ="";

	reminderfox.iCal.attendees = _Attendees.split("\n");

	if (reminderfox.iCal.attendees.length > 0  || nSEQ != null){
		for (var n=0; n<reminderfox.iCal.attendees.length; n++){
			reminderfox.iCal.attendees[n] = reminderfox.iCal.attendees[n].toUpperCase();
			var fnd =  reminderfox.iCal.attendees[n].lastIndexOf("MAILTO:");
			if (fnd != -1) {
				var address = reminderfox.iCal.attendees[n].substring(fnd+7);
				if (address.indexOf(myMailAccounts)) {

					fnd =  reminderfox.iCal.attendees[n].indexOf("PARTSTAT=");
					if (fnd != -1) {
						var attPart = reminderfox.iCal.attendees[n].substring(fnd+9);
						fnd = attPart.indexOf(";");
						if (fnd == -1) {attPart.indexOf(":")};
						var attPart = attPart.substring(0,fnd);
					}
				}
			}
		}
	}
	var aPART ="";
	if (aMethod != "REQUEST") { aPART = "  " + attPart; }

	var extraInfoSchedule = mInvitation + "\n\n[iCal] " + aMethod + aPART + ": "
			+ reminderfox.string("rf.schedule") ;
	if (nDTSTAMP != null && nDTSTAMP.length > 0 ) {
		extraInfoSchedule += " "
			+ reminderfox.string("rf.schedule.asof") + "  " + nDTSTAMP;
	}
	if ( nSEQ != null ) {
		extraInfoSchedule += " [# " + nSEQ + "]" + ret ;
	}
	// <<<----  process PERSONS infos  ------


	switch (aMethod) {
		case "REQUEST":
		case "PUBLISH": { // this is send to ATTENDEE(s), can be
											// - new
											// - revised

			// ICS containing "ATTENDEE" is an invitation !
			var anInvitation = ((reminder.extraInfo.indexOf("ATTENDEE:") > -1 )
				|| (reminder.extraInfo.indexOf("ATTENDEE;") > -1)) ? true : false;

			if (anInvitation) { // check for invitation
						// ++++++++++++ Google Calendar Special  ++++++++++++
						if ( reminder.notes != null && reminder.notes.length > 0 ) {
							var iGMail = reminder.notes.toLowerCase().indexOf("http://www.google.com/calendar/event?action=view");
							if ( iGMail != -1) {
								var iGMail1 = reminder.notes.toLowerCase().indexOf(" ",iGMail);
								var httpGMail = reminder.notes.substring(iGMail,iGMail1);
								reminder.url = httpGMail;
							}
						}
						// ++++++++++++ Google Calendar Special  ++++++++++++

				if (addOption != "" )
					extraInfoSchedule += "*" +reminderfox.string("rf.schedule.options") +
					"* ______________________" + ret + addOption + ret;

				if (iSchComment != null )
					extraInfoSchedule += "*" +reminderfox.string("rf.schedule.comment") +
					"* ______________________" + ret + iSchComment + ret;

				if (reminder.notes != null && reminder.notes.length > 0 ) {
					reminder.notes = "> " + reminder.notes.replace(new RegExp(/\n/g),"\n>");
				}

				if (reminder.notes != null ) {
					extraInfoSchedule +=  "*" +reminderfox.string("rf.schedule.description") +
					"*  ______________________" + ret
					+  reminder.notes + ret;
				}
				reminder.notes = extraInfoSchedule;

				// add 'Category' item signifying that this is an invitation
				var categoryItem = reminderfox.string("rf.mail.ical.send.subject.invitation"); //	"invitation";
				reminder = reminderfox.util.addCategory4Import (reminder, categoryItem);

				return msgReturn;

			} else {  // this is NOT an invitation
			}
			break;

		} //case:REQUEST" & "PUBLISH"

		case "REPLY": {	// this is send back to ORGANIZER

			reminder.notes = extraInfoSchedule;
			return msgReturn;
			break;
		}  //case "REPLY"

		case "CANCEL": {  // this 'cancel's the local event/invitation

			reminder.notes = extraInfoSchedule;
			return msgReturn;
			break;
		}  //case "CANCEL"

	}  // switch (aMethod)
	return msgReturn;
};


/**
 *    With the selected Reminder/Todo's   <br>
 *   'Export to file' or  'Send a Mail' as an INVITATION/SCHEDULE
 *
 * @param  event   has '.id' for selected ReminderTyp, if 'null' called from function
 * @param  _selectedTyp    // 'invite'   | 'info'
 * @param  _reminderTyp    // 'reminder' | 'todo'
 * @param  _Reminders      //
 *
 * @return
 */
reminderfox.iCal.exportOrSend= function (event, _selectedTyp, _reminderTyp, _Reminders) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var methodTyp = "PUBLISH";  // default=PUBLISH ... other METHOD:PUBLISH, REQUEST, REPLY
	var attendees = null;
	var organizer = null;
	var selectedTyp;  // 'invite'   | 'info'
	var reminderTyp;  // 'reminder' | 'todo'
	var eventLength;  // use to show # of events in XUL title

	// function call (eg. from 'View')
	if (event == null) {
		selectedTyp = (_selectedTyp != null) ? _selectedTyp : 'invite';
		reminderTyp = (_reminderTyp != null) ? _reminderTyp : 'reminder';
		reminderfox.iCal.selectedReminders = _Reminders;

		if (reminderTyp == 'reminder') eventLength = reminderfox.iCal.selectedReminders.length;
		if (reminderTyp == 'todo')     eventLength = reminderfox.iCal.selectedReminders.length;

	} else {

		// called from ReminderList popup menu
		if (event.currentTarget.id == "treechildren-contextmenu-sendReminder")  {
			selectedTyp = 'invite';
			reminderTyp = 'reminder';

			reminderfox.iCal.selectedReminders = getAllSelectedReminders();
			var eventLength = reminderfox.iCal.selectedReminders.length;
			if (eventLength == 0) return;  // no reminders selected!

			if (reminderfox.iCal.selectedReminders.length > 1)  {
				selectedTyp = 'info';	// only 'single' events can be send as invitation
			}
		}

		if (event.currentTarget.id == "treechildren-contextmenu-sendTodos") {	// reminderfox-calendar-menu-sendReminder
			selectedTyp = 'info';
			reminderTyp = 'todo';

			reminderfox.iCal.selectedReminders = reminderfox.mail.getSelectedTodos();

			if (reminderfox.iCal.selectedReminders == null) {
				reminderfox.core.statusSet (reminderfox.string("rf.schedule.resendwithDialog")) // ("No Todo's selected!");
				return;
			}

			var eventLength = 1 //reminderfox.iCal.selectedReminders[0].length;
		}
	 }


	reminderfox.util.Logger('userIO',"iCal.exportOrSend  eventLength: " + eventLength
		+ "  selectedTyp: " + selectedTyp + "  reminderTyp: " + reminderTyp);


	 if (selectedTyp == 'invite') {

		/*  have to check if the selected "Reminder" was already send as invitation/schedule;
		 *  that's the case if ORGANIZER is already included in "this.selectedReminders"
		 */
		if (reminderfox.iCal.selectedReminders[0].extraInfo != null) {
			if (reminderfox.iCal.selectedReminders[0].extraInfo.indexOf("ORGANIZER") != -1) {

				var title = reminderfox.string("rf.schedule.wasSend");
				var msg = reminderfox.string("rf.schedule.wasSend")
					+ "\n"	+ reminderfox.string("rf.schedule.resendwithDialog")
					+ "\n\n" + reminderfox.string("rf.schedule.sendAsEvent")
					+ "\n" + "[Delete] To cancel previous schedule." // reminderfox.string("rf.schedule.sendAsEvent");
				var key0 = reminderfox.string("rf.button.ok")
				var key1 = reminderfox.string("rf.button.cancel");
				var key2 = "Delete";// reminderfox.string("rf.schedule.okDelete");
				var mode = reminderfox.util.ConfirmEx(title, msg, key0, key1, key2);

				if (mode == 1) return;

				if (mode == 2) {  // this is the 'delete schedule' part
					var extraInfoArrayInv = reminderfox.core.extraInfoArray(reminderfox.iCal.selectedReminders[0]);
					var extraInfoArray = new Array ();  var j=0;

					for (var i=0; i < extraInfoArrayInv.length; i++) {
						if (extraInfoArrayInv[i].indexOf("ORGANIZER")> -1 ||
							extraInfoArrayInv[i].indexOf("ATTENDEE")  > -1 ||
					/*		extraInfoArrayInv[i].indexOf("DTSTAMP")   > -1 ||    do not erase this!!  */
							extraInfoArrayInv[i].indexOf("STATUS")    > -1 ||
							extraInfoArrayInv[i].indexOf("CLASS")     > -1 ||
							extraInfoArrayInv[i].indexOf("COMMENT")   > -1 ||
							extraInfoArrayInv[i].indexOf("SEQUENCE")  > -1 )
							{
							} else {
							extraInfoArray[j] = extraInfoArrayInv[i]; j++;
						}
					}
					// delete the 'invitation' category also
					var xCategories = reminderfox.iCal.selectedReminders[0].categories;

					var categoryItem = reminderfox.string("rf.mail.ical.send.subject.invitation"); //	"invitation";
					if ((xCategories != null) && (xCategories.indexOf(categoryItem) > -1)) {
						reminderfox.iCal.selectedReminders[0].categories = xCategories.replace(categoryItem, '');
					}

					// write the selectedReminder back to currentReminder without 'extra' strings
					reminderfox.iCal.selectedReminders[0].extraInfo= extraInfoArray.join("\n");
					var reminderTodos = null;
					reminderfox.util.addMultipleEvents(reminderfox.iCal.selectedReminders, reminderTodos)

					reminderfox.util.PromptAlert(reminderfox.string("rf.schedule.hasDeleted")
						  + "\n\n" + reminderfox.string("rf.schedule.checkDeleted"));

					return;
				}
				selectedTyp ='info';  // was already send, don't allow to send as 'invite'
			}
		}
	} // if invite


	// Dialog   'Send' or 'Export'  Reminder(s)
	var results = {	organizer: null,
					attendees: null,
					mode: null,
					selectedTyp: selectedTyp,
					reminderTyp: reminderTyp,
					eventLength: eventLength,
					schComment: ""};
	window.openDialog("chrome://reminderfox/content/mail/invitation.xul",
					"reminderFox-set-invitationmailAppString", "chrome,resizable,modal", results);

	// if 'CANCEL' or 'close window' pressed -->> terminate
	if (results.mode == 'CANCEL') return;

	if (results.mode == 'xExport') {			// export to ICS file

//reminderfox.util.Logger('calndr',"iCal.exportOrSend  sendAsItIs: " + reminderfox.iCal.selectedReminders
//		+ "  results.organizer: " + results.organizer  + " results.mode: " + results.mode + "  reminderTyp: " + reminderTyp);

					reminderfox.mail.sendAsItIs (reminderfox.iCal.selectedReminders, results.organizer, results.mode, reminderTyp);
		return;
	}


	// send "as-it-is" ===> PUBLISH
	if (results.selectedTyp == 'info') {

		var attendees = null;
		if (reminderTyp == 'reminder') {
		// this.selectedReminders[0].url $[1] = [string] "mailto:abc@xyz.de"
			if ((reminderfox.iCal.selectedReminders.length == 1) && (!!reminderfox.iCal.selectedReminders[0].url)){
				 if (reminderfox.iCal.selectedReminders[0].url.indexOf('mailto:') == 0)
					  attendees = reminderfox.iCal.selectedReminders[0].url.substring(7);
			}
			reminderfox.mail.sendEventNow(reminderfox.iCal.selectedReminders, "", 'ICS' /*methodTyp*/, results.organizer, results.attendees, reminderTyp);
		}

		if (reminderTyp == 'todo') {
		// this.selectedReminders[0][0].url $[1] = [string] "mailto:abc@xyz.de"
			if ((reminderfox.iCal.selectedReminders[0].length == 1) && (!!reminderfox.iCal.selectedReminders[0][0].url)){
				 if (reminderfox.iCal.selectedReminders[0][0].url.indexOf('mailto:') == 0)
					  attendees = reminderfox.iCal.selectedReminders[0][0].url.substring(7);
			}
			reminderfox.mail.sendEventNow("", reminderfox.iCal.selectedReminders,  'ICS' /*methodTyp*/, results.organizer, results.attendees, reminderTyp);
		}
		return;
	}

	// send  INVITATION/SCHEDULE  ===> REQUEST
	if (results.selectedTyp == 'invite') {methodTyp = 'REQUEST';}

	organizer = results.organizer;
	if (organizer == "") {
		reminderfox.util.PromptAlert(reminderfox.string("rf.schedule.organizer.required")
		+ "\n" + reminderfox.string("rf.schedule.organizer.mailAdr"));
		return;
	}

	if (results.attendees != null && results.attendees != "") {
		methodTyp = "REQUEST";	  // attendee(s) --> REQUEST
		} else {
		methodTyp = "PUBLISH";
	}
	//  add invitation info to 'extraInfo' item
	var originalReminder = reminderfox.iCal.selectedReminders[0];
	var updatedReminder = reminderfox.core.cloneReminderFoxEvent(reminderfox.iCal.selectedReminders[0] );


	updatedReminder.extraInfoArray = reminderfox.core.extraInfoArray (updatedReminder);
	if (updatedReminder.extraInfoArray == null) updatedReminder.extraInfoArray = new Array();

	// replace DTSTAMP (current date/time in 'Z')
	var currentDate = new Date();
	var tzOffset = new Date().getTimezoneOffset();
	currentDate.setMinutes( currentDate.getMinutes() + tzOffset );
	var dtStamp = reminderfox.date.objDTtoStringICS(currentDate);	//gWTZID
	reminderfox.core.extraInfoAdd (updatedReminder.extraInfoArray, "DTSTAMP", dtStamp);
	// add SEQUENCE=1
	reminderfox.core.extraInfoAdd (updatedReminder.extraInfoArray, "SEQUENCE", 1);

	/*----------
	var organizerName = reminderfox.util.trim(organizer.split("<")[0]);
	var organizerMail = reminderfox.util.trim(organizer.split("<")[1]);

	if (organizerMail == null) {
			organizerMail = organizerName;
			organizerName ="";
	}
	if (organizerMail.charAt(organizerMail.length-1) == ">") {
		organizerMail = organizerMail.substring(0,organizerMail.length-1)
	}
	------------*/
	var address = getMailAddress(organizer)

	//ORGANIZER;CN="Sally Example":mailto:sally@example.com
	//ORGANIZER:mailto:jdoe@example.com

	var itemValue = (address.name != "") ?  ('CN="' + address.name +'"') : ""
	var itemAttributes = "MAILTO:" + address.mail
	reminderfox.core.extraInfoAdd (updatedReminder.extraInfoArray, "ORGANIZER", itemAttributes, itemValue);


function getMailAddress(address) {
	//	.replace(/(\ )/g, '')		// remove all spaces
		var addressArray = []
		addressArray.name = ""
		addressArray.mail = ""

		var attendeeX = address.split("<");
		if (attendeeX.length == 1) {  // only mailAdr
			addressArray.mail = attendeeX[0].replace(/(^\s+)|(\s+$)/g, '').replace(">", '');
		} else {					 // mailName and adr
			addressArray.name = attendeeX[0].replace(/(^\s+)|(\s+$)/g, '');
			addressArray.mail = attendeeX[1].replace(/(^\s+)|(\s+$)/g, '').replace(">", '');
		}
	return addressArray
}


	if (methodTyp == "REQUEST") {
		attendees = results.attendees.replace(/(^\s+)|(\s+$)/g, '');	// clear leading/trailing spc

		// ATTENDEE;RSVP=TRUE:MAILTO:abcde@fghi.xx
		// ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=TENTATIVE;CN=Henry Cabot:mailto:hcabot@example.com
		// ATTENDEE;CN=Rasagee Pillay;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;ROLE=REQ-PARTICIPANT:MAILTO:xxxx@xxxx.net

		var attendeeArray = attendees.split(",");
		for ( var i = 0; i < attendeeArray.length; i++  ) {
			var address = getMailAddress(attendeeArray[i])

			if ((address.name == "") && (address.mail == "")) {break;}

			var itemValue = (address.name != "") ?  ('CN="' + address.name + '";') : ""
			itemValue += "RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT"
			var itemAttributes = "MAILTO:" + address.mail

			reminderfox.core.extraInfoAdd (updatedReminder.extraInfoArray, "ATTENDEE", itemAttributes, itemValue);
		}
	}


	// add 'comment'  from invitation.xul dialog
	if (results.schComment != "") {
		/// updatedReminder.extraInfo += "\\nCOMMENT:" + results.schComment;

		reminderfox.core.extraInfoAdd (updatedReminder.extraInfoArray, "COMMENT", results.schComment);
	}

	// build new extraItem string from updatedReminder.extraInfoArray
	updatedReminder.extraInfo = updatedReminder.extraInfoArray.join("\\n");



	// add other items
	reminderfox.iCal.processExtraScheduleInfo(updatedReminder, "", methodTyp );

	// add category
	var categoryItem = reminderfox.string("rf.mail.ical.send.subject.invitation"); //	"invitation";
	 updatedReminder = reminderfox.util.addCategory4Import (updatedReminder, categoryItem);

	//  REPLACE the current entry
	removeUIListItemReminder(originalReminder);
	// remove from model list
	var reminders = reminderfox.core.getReminderEvents();
	for( var i = 0; i < reminders.length; i++) {
		if ( reminders[i].id == originalReminder.id ) {
			reminderfox.core.removeFromArray(reminders, i);
			break;
		}
	}

	// add reminder in sorted order...
	reminders = reminderfox.core.getReminderEvents();
	if ( updatedReminder.remindUntilCompleted != reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE ) {
		updatedReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED;
	}
	var sortedIndex = reminderfox.core.getSortedIndexOfNewReminder( reminders, updatedReminder, false );
	reminderfox.core.insertIntoArray( reminders, updatedReminder, sortedIndex );

	updatedReminder.snoozeTime = null;
	createUIListItemReminder(updatedReminder);

	var currentDate = reminderfox.datePicker.gSelectedDate;
	if ( currentDate == null ) {
		currentDate = new Date();
	}

	var newDate = new Date();
	if ( updatedReminder.alarm != null ) {
		updatedReminder.alarmLastAcknowledge = newDate.getTime();
		// if there's a snooze... and lastack > snooze, erase snooze...
		// this means...  well it should be if date changed at all, then need to clear snooze...
	}
	updatedReminder.lastModified = reminderfox.date.objDTtoStringICS(newDate );	//gWTZID

	var reminder = reminderfox.core.processReminderDescription(updatedReminder,  currentDate.getFullYear(), false);
	updateInListReminder( reminder );
	sortReminderIfNeccessary( updatedReminder.id);

	refreshCalendar();
	modifiedReminders();

	reminderfox.iCal.selectedReminders[0] = updatedReminder; // need array
	reminderfox.mail.sendEventNow(reminderfox.iCal.selectedReminders, "", methodTyp, organizer, attendees, selectedTyp);
};


/**
 *  Parse   ORGANIZER;CN=name:MAILTO:mailadr@abc.xx
 *
 *  @returns  name<mailadr@abc.xx>
 */
 reminderfox.iCal.getMailAddress= function (icsString) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var persName="";
	var persMail="";
	var fndIndex = icsString.toUpperCase().lastIndexOf( "MAILTO:");
	if (fndIndex != -1) {
		persMail = icsString.substring( fndIndex + 7);
	} else {
		var colnIndex = icsString.lastIndexOf(":");
		if (colnIndex != -1) {
			if (icsString.substring( colnIndex).indexOf("@") != -1) {
				persMail = icsString.substring( colnIndex + 1);  }
		}
	}
	var fndIndex = icsString.toUpperCase().indexOf( "CN=" );
	if (fndIndex != -1) {
		var fndString = icsString.substring( fndIndex + 3);
		var colnIndex = fndString.indexOf(":");
		var semkiIndex = fndString.indexOf(";");

		if ((semkiIndex != -1) && (semkiIndex < colnIndex))  {
			persName = fndString.substring( 0, semkiIndex);
		} else { persName = fndString.substring( 0, colnIndex);  }
	}

	if (persName == "") { return '<' + persMail + '>';}

	return persName + '<' + persMail +'>';
};



/**
 *   RmFx reschedule an event
 *
 *   @see  http://tools.ietf.org/html/rfc2446#section-3.2.2.1 Rescheduling an Event
 */
reminderfox.iCal.reschedule= function(originalReminder, currentReminder) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if (originalReminder.extraInfo == null) return;

	var extraInfoOrginal = reminderfox.core.extraInfoArray (originalReminder);
	var extraInfoCurrent = reminderfox.core.extraInfoArray (currentReminder);

	var currentATT = reminderfox.core.extraInfo( extraInfoOrginal,"ATTENDEE");
	if (currentATT == null || currentATT.length == 0)  { return;}

	// OK  it's a Invitation/Schedule .. rescheduling requirements:
	//   1. is the ORGANIZER one of my accounts?  Maybe hard with FX!!
	//   2. A rescheduled event involves time or recurrence intervals
	//      and possibly the location or description

	// ad 1.  check ORGANIZER
	//   currentORG = "ORGANIZER;CN=name:MAILTO:mailadr@abc.xx"
	//   myAccounts = "name<mailadr@xyz.xx>,name2<mailadr2@mmm.zz>"

	var currentORG = reminderfox.core.extraInfo( extraInfoOrginal,"ORGANIZER", ";");
	if (currentORG.length == 0)  { return;}  // no ORGANIZER
	var fndIndex = currentORG.toUpperCase().lastIndexOf("MAILTO:");

	if (reminderfox.msgnr.myMailIDs().toUpperCase().indexOf(currentORG
		.substring( fndIndex + 7).toUpperCase()) == -1 ) {return;} // not the ORGANIZER -- no Invitation/Schedule

	// ORGANIZER ok
	var fromAddress = reminderfox.iCal.getMailAddress(currentORG);

  // ad 2. check if parameters changed

	if (currentReminder.endDate == null  && originalReminder.endDate != null) {
		currentReminder.endDate = originalReminder.endDate;
	}

	var dateChange =
			originalReminder.date.toGMTString()    != currentReminder.date.toGMTString()
		|| originalReminder.endDate.toGMTString() != currentReminder.endDate.toGMTString();

	var recurChange = (
			originalReminder.recurrence.byDay      != currentReminder.recurrence.byDay
		|| originalReminder.recurrence.endDate    != currentReminder.recurrence.endDate
		|| originalReminder.recurrence.interval   != currentReminder.recurrence.interval
		|| originalReminder.recurrence.type       != currentReminder.recurrence.type);

	var sumChange  = originalReminder.summary != currentReminder.summary;

	var locChange  = originalReminder.location != currentReminder.location;

	if ( !(dateChange || recurChange || sumChange|| locChange ) ) {return;}  // no Change

  //  ORGANIZER 'rescheduled' the event
  // read ORGANIZER   from reminder and set it to 'fromAddress'
  // read ATTENDEE(s) from reminder and set it to 'attendees'
  // parameter to be updated:
  //   - DTSTAMP
  //   - SEQUENCE
  //   - SUMMARY/DESCRIPTION
  //   - LASTMODIFIED ????


	var aExtraInfo  = reminderfox.core.extraInfoArray(currentReminder);

	// for ATTENDEE(s) have to build the to=mailString and all ATT need to called RSVP!!
	var attendeeString =""; // for iCal ATTENDEE:
	var attendees ="";      // for mail compose to=

	for (var i=0; i< aExtraInfo.length; i++) {
		if (aExtraInfo[i].indexOf("ATTENDEE") == 0) {

			var attendeeName="";
			var attendeeMail="";
			var fndIndex = aExtraInfo[i].toUpperCase().lastIndexOf( "MAILTO:");
			  if (fndIndex != -1) {
					attendeeMail = aExtraInfo[i].substring( fndIndex + 7);
			  } else {
				var colnIndex = aExtraInfo[i].lastIndexOf(":");
				if (colnIndex != -1) {
					if (aExtraInfo[i].substring( colnIndex).indexOf("@") != -1) {
						attendeeMail = aExtraInfo[i].substring( colnIndex + 1);  }
				}
			}
			  var fndIndex = aExtraInfo[i].toUpperCase().indexOf( "CN=" );
			  if (fndIndex != -1) {
				var fndString = aExtraInfo[i].substring( fndIndex + 3);
				var colnIndex = fndString.indexOf(":");
				var semkiIndex = fndString.indexOf(";");

				if ((semkiIndex != -1) && (semkiIndex < colnIndex))  {
					attendeeName = fndString.substring( 0, semkiIndex);
				} else {attendeeName = fndString.substring( 0, colnIndex);  }
			  }
			if (attendeeName == "") {attendees +=  '<' + attendeeMail +'>,';
				} else {
				attendees += attendeeName + '<' + attendeeMail +'>,';
			}

			var attendeeString ="ATTENDEE";
			if (attendeeName != "") {attendeeString += ";CN=" + attendeeName}
			if (attendeeMail != "") {attendeeString += ";RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:MAILTO:" + attendeeMail}
			aExtraInfo[i] = attendeeString;
		}
	}
	reminderfox.core.extraInfoReplace (aExtraInfo, "SEQUENCE", reminderfox.core.extraInfo(aExtraInfo, "SEQUENCE")*1 + 1);
	reminderfox.core.extraInfoReplace (aExtraInfo, "DTSTAMP", reminderfox.date.objDTtoStringICS());
	reminderfox.core.extraInfoReplace (aExtraInfo, "COMMENT", "");	  // erase old

	currentReminder.extraInfo = aExtraInfo.join("\\n");
	// delete double 'CR'
	currentReminder.extraInfo = currentReminder.extraInfo.replace(new RegExp(/\\n\\n/g),"\\n");

	var chText =  (dateChange  ? " '" + reminderfox.string("rf.add.mail.message.datetime")   + "' "  : "")
					+ (recurChange ? " '" + reminderfox.string("rf.add.mail.message.reccurance") + "' "  : "")
					+ (sumChange   ? " '" + reminderfox.string("rf.schedule.description")        + "' "  : "")
					+ (locChange   ? " '" + reminderfox.string("rf.mail.ical.send.location")     + "' "  : "");

	var methodTyp = "REQUEST";
	var newNotes = "[iCal] " + methodTyp + ": " + reminderfox.string("rf.schedule.statusOf")
		+ ": " + reminderfox.date.parseDateTimes(reminderfox.core.extraInfo(aExtraInfo,"DTSTAMP"))
		+ " [#" + reminderfox.core.extraInfo(aExtraInfo,"SEQUENCE") +"]\n"
		+ "*" + reminderfox.string("rf.schedule.statusChanged")+"*  " + chText +"\n\n";
	currentReminder.notes = newNotes + currentReminder.notes
	var reminders = new Array();
	reminders[0] = currentReminder;
	var iCalInvite = true;
	reminderfox.mail.sendEventNow(reminders, "", methodTyp, fromAddress, attendees, iCalInvite);
};


/**
 * Update "Edit Reminder" dialog for iCal invitation
 *
 * @param {Object} currentReminder
 */
reminderfox.iCal.inviteStatus= function (currentReminder) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// var extraInfoOrginal = reminderfox.core.extraInfoArray (currentReminder);

	var currentORG = reminderfox.core.extraInfo( reminderfox.core.extraInfoArray (currentReminder),"ORGANIZER");
	if (currentORG.length == 0)  { return;}  // no ORGANIZER

	var currentORGStr = currentORG.toUpperCase()+",";
	var mailIDsStr = reminderfox.msgnr.myMailIDs();
		mailIDsStr = mailIDsStr.toUpperCase() + ",";
	var fndIndex = currentORGStr.lastIndexOf( "MAILTO:" );
	if (mailIDsStr.indexOf(currentORGStr.substring(fndIndex + 7)) == -1) {

			document.getElementById("newReminderText").setAttribute("disabled", "true");

			document.getElementById("reminderFox-all-day").setAttribute("disabled", "true");

			document.getElementById("reminderFox-timeList").setAttribute("disabled", "true");
			document.getElementById("yearlist").setAttribute("disabled", "true");
			document.getElementById("monthlist").setAttribute("disabled", "true");
			document.getElementById("daylist").setAttribute("disabled", "true");

			document.getElementById("reminderFox-endTimeList").setAttribute("disabled", "true");
			document.getElementById("endyearlist").setAttribute("disabled", "true");
			document.getElementById("endmonthlist").setAttribute("disabled", "true");
			document.getElementById("enddaylist").setAttribute("disabled", "true");

			document.getElementById("datepickerAnchor").setAttribute("disabled", "true");
			document.getElementById("datepickerEndAnchor").setAttribute("disabled", "true");

			document.getElementById("location").setAttribute("disabled", "true");
			document.getElementById("reminderFox-repeat").setAttribute("disabled", "true");
	}
};



// reminderfox.iCal.test   NOT TESTED after REFRACTOR !!!   gW
/**
 *  reminderfox.iCal.test
 *  test purpose only:  copy a BEGIN:CALENDAR ... END:CALENDAR
 *   to clipboard and call this function to process /simulate
 *   an 'iCal import form email'
 */
reminderfox.iCal.test= function (){
// ------------- --------------------- --------------------- ---------------- -
	var clip = Cc["@mozilla.org/widget/clipboard;1"].
	getService(Ci.nsIClipboard);
	if (!clip) return false;

	var trans = Cc["@mozilla.org/widget/transferable;1"].
		createInstance(Ci.nsITransferable);
	if (!trans) return false;
	trans.addDataFlavor("text/unicode");

	clip.getData(trans,clip.kGlobalClipboard);
	var str = new Object();
	var strLength = new Object();
	trans.getTransferData("text/unicode",str,strLength);

	if (str) str = str.value.QueryInterface(Ci.nsISupportsString);
	if (str) pastetext = str.data.substring(0,strLength.value / 2);

	var mInvitation = "[iCal] Schedule copied from Clipboard";
	this.reminderfox_Method ="CLIPBOARD";

	this.tagging(this.getiCalFromString(pastetext, mInvitation));
	return true;
};
