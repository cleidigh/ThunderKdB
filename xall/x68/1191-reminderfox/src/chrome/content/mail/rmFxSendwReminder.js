// if(!reminderfox) var reminderfox = {};
if(!reminderfox.sendPlus) reminderfox.sendPlus = {};



/**
 * Send++    add a 'reminder' with sending a message <br>
 *
 *   @since  2008-08-04	Send++  FCC version with Listener to catch the msgId and write to Reminder
 *   @see  reminderfox.util.JS.dispatch('sendPlus');
 */
reminderfox.sendPlus.reminder = function () {
// -----------------------------------------------------------
	reminderfox.util.JS.dispatch('sendPlus');

	// clear reminders from memory
	reminderfox.core.clearRemindersAndTodos();
	var reminders = reminderfox.core.getReminderEvents();

	// --- setup an Listener so we can catch the messageId
	var msgIdentity = document.getElementById("msgIdentity").label;
	var identity = reminderfox.msgnr.getIdentity(msgIdentity);
	reminderfox.mail.FCC = identity.fccFolder;	// remember 'send folder' for account

var msg = "  sendPlus : " +  identity.fccFolder + "   key:" + identity.key;
reminderfox.util.Logger('FolderListener', msg);

	reminderfox.mail.setFolderListener("add");

	// --- generate Reminder for message
	var newDate = new Date();
	newDate.setDate(newDate.getDate() + 1);	// default to using tomorrow's date for reminder
	var rmFx_SwRm_Reference = reminderfox.core.generateUniqueReminderId(newDate);

	reminderfox.core.lastReminderID = rmFx_SwRm_Reference;   //gW2015-01-22

	var org_References = gMsgCompose.compFields.references;
	if (gMsgCompose.compFields.references == null || gMsgCompose.compFields.references == "") {
		gMsgCompose.compFields.references  =  "<" + rmFx_SwRm_Reference + reminderfox.mail.ReferenceID +">";
	} else {
		gMsgCompose.compFields.references += " <" + rmFx_SwRm_Reference + reminderfox.mail.ReferenceID +">";
	}

	var mailIdentifierString = "[" + reminderfox.string("rf.sendw.label") + "++]";

	var _subject = GetMsgSubjectElement().value;
	var newReminderToBeAdded = new reminderfox.core.ReminderFoxEvent
		( rmFx_SwRm_Reference, newDate, mailIdentifierString + " " +_subject); //+ gMsgSubjectElement.value );

	var msgCompFields = gMsgCompose.compFields;
	Recipients2CompFields(msgCompFields);

	newReminderToBeAdded.notes  = reminderfox.string("rf.add.mail.message.sender") +
		": " + identity.email  +  "\n";
	newReminderToBeAdded.notes +=	reminderfox.string("rf.add.mail.message.recipients") +
		": " + msgCompFields.to +  "\n";

	if (msgCompFields.cc != "") {
		newReminderToBeAdded.notes += "    CC:" + msgCompFields.cc + "\n";
	}
	if (msgCompFields.bcc != "") {
		newReminderToBeAdded.notes += "   BCC:" + msgCompFields.bcc + "\n";
	}

	newReminderToBeAdded.notes += reminderfox.string("rf.add.mail.message.date") +
		": " + reminderfox.date.parseDateTimes() +  "\n";

	// TB PRIORITY definition converted for RmFx
	// the value is not language dependant!!  but the label="&highestPriorityCmd.label;"
	// = [string] "Highest"	= [string] "High"		===>> RmFx 'Important'=1
	// = [string] "Normal"
	// = [string] "Low"		= [string] "Lowest"

	if ((msgCompFields.priority == "Highest") || (msgCompFields.priority == "High")) {
			newReminderToBeAdded.priority = 1;		// set RmFx 'Important'=1
	}

	var added = reminderfox.core.addReminderHeadlessly(newReminderToBeAdded);

	if (added == false) {	// [CANCEL] NOT 'added' --> reset the 'References' and don't send
			gMsgCompose.compFields.references = org_References;
	} else {

		reminderfox.core.lastSendReminder = reminderfox.core.lastEvent;

		// now send the msg
		// msgID will be reset  with nsIMsgCompDeliverMode.Now and .Later
		// using .Later will store the msg to the FCC Folder
		// before finally sending catch the msgId from for the reminder using Listener

		GenericSendMessage(nsIMsgCompDeliverMode.Now);

		// for msgs with forward/reply etc add a tag 'Followup'
		var aUri = window.gMsgCompose.originalMsgURI;

		if (aUri != '') {
			var messageService = gMessenger.messageServiceFromURI(aUri);
			var orgMsgHdr = gMessenger.messageServiceFromURI(aUri).messageURIToMsgHdr(aUri);

			reminderfox.tagging.msg('Followup', true, '#009900', orgMsgHdr);
		}

		msg = "  GenericSend   done   aUri  >>" + aUri + "<<";
		reminderfox.util.Logger('send++',msg);
	}
};


///////////////////// -- open messages with  reminder reference -- /////////////
/**
 * Open a reminder with the "Edit Reminder" dialog using the
 *	 msgHdr "References" entry to check the "reminder-ID'.  <br>
 *	 a) for search with 'References'  <br>
 *	 b) for search of 'reminder.id'  <br>
 *
 *	 "Send with Reminder" adds an item 'References' to the message header
 *	 'reference-ID' :	"(string)@reminderfox"  <br>
 *	  - (string) build with reminderfox functions using time and random number,
 *		  this (string) will also being used for reminders UID  <br>
 *
 *	 A normal reply to such a msg will hold that header item value.    <br>
 *	 This function will check for this reference-ID and use any such entry for
 *	 a search and found-&-open of the initial reminder.  <br>
 *	 If multiple references are found a dialog with those reminder references
 *	 are displayed for selection.
 **/
reminderfox.sendPlus.openMail = function (){

	var msgHdr = gDBView.hdrForFirstSelectedMessage;

	var rmRef=reminderfox.sendPlus.getRmRef(msgHdr); // for matched 'References' and 'message-Id' in reminder list
	if (rmRef.length == -1) {return;}

	var activeReminders = reminderfox.core.getReminderEvents();

	if (rmRef.length == 1) {
			reminderfox.sendPlus.openReminder(rmRef[0], msgHdr.messageId);
	} else { // multiple 'References' entries in a msg found, display them for selection
		var remOptions = { rmReferences : rmRef, msgHdr: msgHdr};
		window.openDialog("chrome://reminderfox/content/mail/rmFxSendwReminderList.xul",
			"rmFxReminder4mailList", "chrome,centerscreen,resizable,dialog=no", remOptions);
	}
};


/**
 *   go4it
 */
reminderfox.sendPlus.go4it = function () {
	var curMsg = document.getElementById('rmFx_ReferencesListbox');

	//  WINxP and LINUX have different behavior accessing the seletion
	//    WINxp  uses curMsg.currentIndex
	//    LINUX  uses curMsg.selectedIndex
	var currentIndex = -1;
	if (curMsg.currentIndex != null) {
		currentIndex = curMsg.currentIndex;
	} else {
		currentIndex = curMsg.selectedIndex;
	}
	if (currentIndex == -1) {
		window.close(); // no item selected
		return;
	}

	var selcReminder = window.arguments[0].rmReferences[currentIndex];
	reminderfox.sendPlus.openReminder(selcReminder);
};


/**
 * Open Reminder/Todo, used with Send++ to open associated reminder from
 * Thunderbird message list
 *
 * @param {Object} selected Reminder
 */
reminderfox.sendPlus.openReminder = function (selcReminder) {   //, messageId){
	// search in 'reminder' list
	var activeReminders = reminderfox.core.getReminderEvents();
	for ( var i = 0; i < activeReminders.length; i++ ) {
		if (activeReminders[i].id == selcReminder.id) {
			activeReminders[i].messageID = selcReminder.messageID; // '<' + messageId + '>';

			reminderfox.overlay.openMainDialog();
			setTimeout(function(){goEdit(activeReminders[i], activeReminders[i].messageID);}, 500);
			return;
		}
	}

	// search in 'todo' lists
	var _todosArray =  reminderfox.core.getReminderTodos();
	for ( var n in _todosArray ) {
		var todoList = _todosArray[n];

		for ( var m in todoList ) {
			if (todoList[m].id == selcReminder.id) {

				reminderfox.overlay.openMainDialog(null, 'todos');
				selectReminderById(todoList[m].id, 'todos');
				setTimeout( function(){goEdit(todoList[m].id);}, 500);
			return;
			}
		}
	}

	function goEdit (reminder, messageId) {
		var topWindow = reminderfox.util.getWindow("window:reminderFoxEdit");
		if (topWindow != null) {
			topWindow.selectReminderById(reminder.id);
			topWindow.reminderOrTodoEdit (reminder,null, messageId);
		}
	}

	alert (reminderfox.string("rf.sendw.reminder.error"));
};


/**
 * Called from  rmFxSendwReminderList.xul to give access to multiple reminders
 * related to the one selected message
 */
reminderfox.sendPlus.reminder4mailList = function () {
	var msgHdr = window.arguments[0].msgHdr;

	document.getElementById('idSubject')
		.setAttribute("value", reminderfox.string("rf.add.mail.message.subject") + ": " + msgHdr.subject);

	document.getElementById('idFrom')
		.setAttribute("value", reminderfox.string("rf.add.mail.message.from") + ": " + msgHdr.author);

	document.getElementById('idDate')
		.setAttribute("value", reminderfox.string("rf.add.mail.message.date") + ": " +
		reminderfox.date.parseDateTimes (msgHdr.date/1000));

	var reminders = window.arguments[0].rmReferences;
	var remNo = window.arguments[0].rmReferences.length;

	for (var n=0; n < remNo; n++) {
		reminderListaddItem(n,
			reminders[n].id,		reminders[n].summary,
			reminders[n].date,	reminders[n].notes);
	}

		/**
		 * this generate the list entries in form of:
		 * 	<richlistitem id="rmFxRefList" value="3333356789-1233"
		 * 				style="border-bottom: 1px dotted sienna;">
		 * 		<vbox>
		 * 			<label value="Reminder's subjectXXXXX" style="font-weight: bold"/>
		 * 			<hbox><spacer width="20px"/><label value="Do 05.02.2008 13:30"/></hbox>
		 * 			<hbox><spacer width="20px"/><label value="Notes: xxxxxxxxxxxx"/></hbox>
		 * 		</vbox>
		 * 	</richlistitem>
		 **/
		function reminderListaddItem  (n, msgId, subject, dateStr, notes) {
				var spacer1, bText, labelD;
				var rlBox = document.getElementById('rmFx_ReferencesListbox');		// richlistbox
				var rlItem = document.createElement("richlistitem");
				rlBox.appendChild(rlItem);
					rlItem.setAttribute("id" , "rlItem" + n);
					rlItem.setAttribute("value" , msgId);
					rlItem.setAttribute("style" , "border-bottom: 1px dotted sienna;");

					var vbox0 = document.createElement("vbox");
					rlItem.appendChild(vbox0);
						vbox0.setAttribute("id" , "vbox0" + n);
						if (n == 1) {
							vbox0.setAttribute("selected" , "true" );
						}

				// RmFx subject
						var labelS = document.createElement("label");
						vbox0.appendChild(labelS);
							labelS.setAttribute("value",  subject);
							labelS.setAttribute("style" , "font-weight: bold");
				// RmFx date
						var hboxD = document.createElement("hbox");
						vbox0.appendChild(hboxD);
							spacer1 = document.createElement("spacer");
							hboxD.appendChild(spacer1);
							spacer1.setAttribute("width" , "20px");

							labelD = document.createElement("label");
							bText= reminderfox.string("rf.add.mail.message.date");
							hboxD.appendChild(labelD);
							labelD.setAttribute("value" , bText + ": " + reminderfox.date.parseDateTimes(dateStr));
				// RmFx notes
						if (notes != null ) {
						var hboxN = document.createElement("hbox");
						vbox0.appendChild(hboxN);
							spacer1 = document.createElement("spacer");
							hboxN.appendChild(spacer1);
							spacer1.setAttribute("width" , "20px");
							var labelN = document.createElement("label");
							hboxN.appendChild(labelN);
							bText= reminderfox.string("rf.add.mail.message.notes");
							labelN.setAttribute("value" , bText + ": " );

							var notesArr = notes.split("\n");
							try { // just show the first three lines here
								for (i=0; i< 3; i++){
									hboxN = document.createElement("hbox");
									vbox0.appendChild(hboxN);
									spacer1 = document.createElement("spacer");
									hboxN.appendChild(spacer1);
									spacer1.setAttribute("width" , "30px");

									labelN = document.createElement("label");
									hboxN.appendChild(labelN);
									labelN.setAttribute("value" , notesArr[i]);
								}
							} catch (e) {}
						}
		}
};


/**
 * Get an array with reminders with an UID to be part of the 'References'
 * entry in the message header data.
 * If no param passed, take the msgHdr from the first selected message

 *  @param:  {object} msgHdr
 **/
reminderfox.sendPlus.getRmRef = function (msgHdr) {
	reminderfox.util.JS.dispatch('mail');

	if ((msgHdr == "") || (msgHdr == null)) {
		msgHdr = gDBView.hdrForFirstSelectedMessage;
	}
	//	build 'References' string for reminder.id search
	var rmReferences = new Array();
	var refString="";

	if ((msgHdr.numReferences > 0)) {
		for (var n=0; n< msgHdr.numReferences; n++) {
 		//	msgHdr.getStringReference(n) = "1202409095568-924858015@reminderfox"
			if (msgHdr.getStringReference(n).indexOf(reminderfox.mail.ReferenceID) > -1) {
					refString += msgHdr.getStringReference(n)
						.substring(0,msgHdr.getStringReference(n).indexOf("@"))+",";
			}
		}
	}
	//  check 'reminder.id'
	// strip out quotes as the extractHeader method returns some
	// message-id's with extraneous quotes
	// like: "000c01c6941b$6ddb3c30$7be040"@foo.com
	var messageId = "<" +  msgHdr.messageId.replace(new RegExp(/\"/g),"") + ">";

	// check 'reminders'
	var j=0;
	reminderfox.core.reminderFoxEvents = null;  //gW SM addition ??
	var _reminderEvents = reminderfox.core.getReminderEvents();
	for ( var i = 0; i < _reminderEvents.length; i++ ) {
		if ((_reminderEvents[i].messageID ==  messageId ) ||
			(refString.indexOf(_reminderEvents[i].id) > -1)){
			rmReferences[j] = _reminderEvents[i];
			rmReferences[j].messageID = messageId;
			j++;
		}
	}

	// check 'todos'
	var _todosArray =  reminderfox.core.getReminderTodos();
	for ( var n in _todosArray ) {
		var todoList = _todosArray[n];

		for ( var m in todoList ) {
			if ((todoList[m].messageID == messageId)
					|| (refString.indexOf(todoList[m].id) > -1)){
				rmReferences[j] = todoList[m];
				rmReferences[j].messageID = messageId;
				j++;
			}
		}
	}

	return rmReferences;    // return an array of all matching reminders and todos
}
