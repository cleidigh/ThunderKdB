
/*--    gW_refactor   ??????????
var reminderfox_myATTENDEEmail;
--*/

if(!reminderfox.iSchedule) reminderfox.iSchedule = {}; 

	
reminderfox.iSchedule.persons = function (event)	{ // rev.2007-11-27
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// if  'extraInfo' is passed with no ORGANIZER, just return.
	// Note: SCHEDULE means there is at least a ORGANIZER
	//	RFC 2446 defines this as METHOD:PUBLISH
	if (event == null || event.extraInfo == null || event.extraInfo.indexOf("ORGANIZER") == -1 ){
		return false;
	}

	var reminderFox_currentORGANIZERmail;
/* -------- 'Scheduled Persons'
				this adds the ORGANIZER/ATTENDEE data as Iconized display to XUL
*/
	var timeString = reminderfox.date.getTimeString( event.date );
	var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
	var schDTStart =reminderfox.date.getDateVariable( null, event.date, _dateVariableString ) + "  " + timeString;

	var noAttendees=0;

	//	up to here long lines of 'event.extraInfo' are NOT merged !!!!
	//	So it's done here
	var cExtra = event.extraInfo.replace(new RegExp(/\\n /g),"");

	if ( (cExtra.indexOf("ORGANIZER") > -1)
		|| (cExtra.indexOf("ATTENDEE")  > -1) ) {

		var myMailAccounts = reminderfox.msgnr.myMailIDs("from schedule.js") + ",";

		if (myMailAccounts == "" || myMailAccounts == null) {
			myMailAccounts = reminderfox.util.mailAppSetup() + ",";}

		var schDtstamp ="";   var schSequence ="";    var schStatus ="";
		var schMail="";       var schClass="";
		var nAcc="";

		var extraInfoArray = cExtra.split("\\n");
		
		// first get ORGANIZER ... not to add it also as ATTENDEE later
		for ( var index = 0; index < extraInfoArray.length; index++ ) {
			var extraInfo = extraInfoArray[index];

			if ( extraInfo.indexOf( "ORGANIZER" ) != -1 ) {
				var organizerInfo = reminderfox.iSchedule.parsePerson(extraInfoArray[index], "ORGANIZER");
			//	alert ("ORGANIZER: " + organizerInfo.CNAME);
			document.getElementById("organzierName")
				.setAttribute("value", organizerInfo.CNAME + "<"+ organizerInfo.MAIL +">");
				reminderFox_currentORGANIZERmail = 	organizerInfo.MAIL;
			}
		}
		// get the other items now
		for ( var index = 0; index < extraInfoArray.length; index++ ) {
			var extraInfo = extraInfoArray[index];

			// my parameters
			//id=schMyRole" 		src tooltiptext	ROLE:       roleString,
			//id="schMyRsvp" 		src tooltiptext   RSVP: 		rsvpString,
			//id="schMyPartStat" src tooltiptext	PARTSTAT:   pstatString,
			//id="schMyName"     value

			// 'X-MICROSOFT-CDO-...' items cause erroneous processing	
			// 	.. and we don't need them here, so skip it!!
			if ( extraInfo.indexOf( "X-MICROSOFT-CDO-" ) == -1 ) {

			if ( extraInfo.indexOf( "ATTENDEE" ) != -1 ) {
				var attendeeInfo = reminderfox.iSchedule.parsePerson(extraInfoArray[index], "ATTENDEE");

				// check if attendee is 'myMailAccounts'
				var mPos =	myMailAccounts.toLowerCase().indexOf(attendeeInfo.MAIL.toLowerCase());
				// don't add if it's the ORGANIZER
				if (reminderFox_currentORGANIZERmail != attendeeInfo.MAIL) {
					if (mPos > -1) {  // it'a TRUE:  this mail-adr is part of "myAccounts"

						var iNeedAction = reminderfox.iSchedule.elementAttendees('schMeBox',attendeeInfo);

						// if iNeedAction (my & RSVP)  then colorize the element 
						document.getElementById("scheduleMe").setAttribute("hidden", false);
						if (iNeedAction == true) {
							var schText = document.getElementById("scheduleMeText")
							schText.style.fontWeight= "bold";
							schText.style.color= "blue";

							document.getElementById("rf-iCal-my-Reply-Accept").setAttribute("hidden", false);
							document.getElementById("rf-iCal-my-Reply-Decline").setAttribute("hidden", false);
						}
					}
					else {  // more Attendee(s)
						document.getElementById("schMoreAttendees")
							.setAttribute("hidden", false);
						reminderfox.iSchedule.elementAttendees('schAttendeesBox',attendeeInfo);
						noAttendees ++;
						document.getElementById("attendees")
							.setAttribute("label", "+ " + noAttendees);
					}
				}
			}

		//	reading from "extraInfo" string
			if ( extraInfo.indexOf( "DTSTAMP" ) != -1 ) {
				var colonIndex = extraInfo.indexOf( ":" );
				schDtstamp = reminderfox.date.parseDateTimes(extraInfo.substring(colonIndex +1));
			}
			if ( extraInfo.indexOf( "SEQUENCE" ) != -1 ) {
				var colonIndex = extraInfo.indexOf( ":" );
				schSequence =  extraInfo.substring(colonIndex +1);
			}
			if ( extraInfo.indexOf( "STATUS" ) != -1 ) {
				var colonIndex = extraInfo.indexOf( ":" );
				schStatus =  extraInfo.substring(colonIndex +1);
			}
			if ( extraInfo.indexOf( "DTEND" ) != -1 ) {
				var colonIndex = extraInfo.indexOf( ":" );
				var schDTEnd = reminderfox.date.parseDateTimes(extraInfo.substring(colonIndex +1));
			}
			if ( extraInfo.indexOf( "CLASS" ) != -1 ) {
				var colonIndex = extraInfo.indexOf( ":" );
				var schClass = extraInfo.substring(colonIndex +1);
			}
			} // X-MICROSOFT-CDO-
		}

		// schedule  as of sequence status	etc ..
		var statusText = reminderfox.string("rf.schedule.asof") + schDtstamp + "	[# " + schSequence + "]";

		if (schStatus != "" ) {statusText += "  [" + schStatus +"]"};
		if (schClass  != "" ) {statusText += "  [" + schClass  +"]"};

		document.getElementById("scheduleInfos1")
			.setAttribute("value", "  " + statusText);

		if (schDTEnd != null ) {
			document.getElementById("scheduleInfos2")
				.setAttribute("value",
					reminderfox.string("rf.schedule.begin") + ": " + schDTStart +  "	"
				 + reminderfox.string("rf.schedule.end")   + ": " + schDTEnd);
			document.getElementById("scheduleInfos2Box")
				.setAttribute("hidden","false");
		}
		return true;
	} else
		return false;
};


reminderfox.iSchedule.parsePerson = function(person, personTyp) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var optString="";  var iIndex;     var semkiIndex;      var colnIndex;

	var _mailto = "";  var _cn    =""; 
	var _role   = "";  var _pstat =""; var _rsvp="";  var _cutyp="";

	var optString =  person.substring( personTyp.length +1 );

	var iIndex = optString.toUpperCase().lastIndexOf( "MAILTO:");
	if (iIndex != -1) {
		_mailto = optString.substring( iIndex + 7);
		colnIndex = _mailto.indexOf(":");
		semkiIndex = _mailto.indexOf(";");

		iIndex = (Math.min(semkiIndex,colnIndex) == -1 )? Math.max(semkiIndex,colnIndex) : Math.min(semkiIndex,colnIndex)
		if (iIndex != -1) _mailto =  _mailto.substring( 0, iIndex);
	}

	iIndex = optString.toUpperCase().indexOf( "CN=" );
	if (iIndex != -1) {
		_cn = optString.substring( iIndex + 3);
		colnIndex = _cn.indexOf(":");
		semkiIndex = _cn.indexOf(";");

		iIndex = (Math.min(semkiIndex,colnIndex) == -1 )? Math.max(semkiIndex,colnIndex) : Math.min(semkiIndex,colnIndex)
		if (iIndex != -1) _cn = _cn.substring( 0, iIndex);
	}


	if (optString.toUpperCase().indexOf( "ROLE=" ) != -1) {
		if (optString.toUpperCase().indexOf("ROLE=CHAIR") != -1)
			_role =  "CHAIR";
		if (optString.toUpperCase().indexOf("ROLE=REQ") != -1)	// "REQ-PARTICIPANT"
			_role =  "REQUIRED-PARTICIPANT";
		if (optString.toUpperCase().indexOf("ROLE=OPT") != -1)  // "OPT-PARTICIPANT"
			_role =  "OPTIONAL-PARTICIPANT";
		if (optString.toUpperCase().indexOf("ROLE=NON") != -1)	// "NON-PARTICIPANT"
			_role =  "NON-PARTICIPANT";
	}

	if (optString.toUpperCase().indexOf( "PARTSTAT=" ) != -1) {
		if (optString.toUpperCase().indexOf("PARTSTAT=NEEDS-ACTION") != -1) //"NEEDS-ACTION"
			_pstat =  "NEEDS-ACTION";
		if (optString.toUpperCase().indexOf("PARTSTAT=ACCEPTED") != -1)	//"ACCEPTED"
			_pstat =  "Status-ACCEPTED";
		if (optString.toUpperCase().indexOf("PARTSTAT=TENTATIVE") != -1)	//"TENTATIVE"
			_pstat = "Status-TENTATIVE";
		if (optString.toUpperCase().indexOf("PARTSTAT=DECLINED") != -1)	//"DECLINED"
			_pstat = "Status-DECLINED";
	}

	if (optString.toUpperCase().indexOf( "RSVP=" ) != -1) {
		if (optString.toUpperCase().indexOf("RSVP=TRUE") != -1)
			_rsvp = "RSVP";
	}

	if (optString.toUpperCase().indexOf( "CUTYPE=" ) != -1) {
		if (optString.toUpperCase().indexOf("CUTYPE=INDIVIDUAL") != -1)
			_cutyp = "INDIVIDUAL";
		if (optString.toUpperCase().indexOf("CUTYPE=GROUP") != -1)
			_cutyp = "GROUP";
		if (optString.toUpperCase().indexOf("CUTYPE=RESOURCE") != -1)
			_cutyp = "RESOURCE";
		if (optString.toUpperCase().indexOf("CUTYPE=ROOM") != -1)
			_cutyp = "ROOM";
		if (optString.toUpperCase().indexOf("CUTYPE=UNKNOWN") != -1)
			_cutyp = "UNKNOWN";
	}

	return  { CNAME: _cn,    MAIL:     _mailto,
			     ROLE:  _role,  PARTSTAT: _pstat,
			     RSVP:  _rsvp,  CUTYP:    _cutyp
	};
};


// --------- this adds the persons (icons, tooltip & mail) to 'element' hbox 
reminderfox.iSchedule.elementAttendees = function (element, personsData) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var aList = document.getElementById(element);
	var hbox = document.createElement("hbox");
	var iNeedAction= false;

	var e = document.createElement("image");				//		RSVP
			if (personsData.RSVP !="") {
				if ( element == 'schMeBox') {
					iNeedAction = true;
					e.setAttribute("id", "myRSVP");
					e.setAttribute("tooltiptext", personsData.RSVP 
							+ reminderfox.string("rf.schedule.selectResponse"));
					reminderfox.iCal.attendeeMyMail = personsData.MAIL;
					}
				else {
					e.setAttribute("id", "schRSVP");
					e.setAttribute("tooltiptext", personsData.RSVP); }
			} else {
				e.setAttribute("id", "persons"); }
	hbox.appendChild(e);


	var e = document.createElement("image");				//		ROLE
			if (personsData.ROLE !="") {

				e.setAttribute("tooltiptext", personsData.ROLE);
				e.setAttribute("id", personsData.ROLE);
//				e.setAttribute("onclick", "reminderfox.iCal.attendeeStatus(this);");		// ROLE changeable

			} else {
				e.setAttribute("id", "persons");
			}

	hbox.appendChild(e);

	var e = document.createElement("image");				//		PARTIZIPATION
			if (personsData.PARTSTAT !="") {
				e.setAttribute("id", personsData.PARTSTAT);
				if ( (element == "schMeBox") &&
						((personsData.PARTSTAT == "Status-ACCEPTED")
					|| (personsData.PARTSTAT == "Status-DECLINED")) ) { // for mySchedule w. AVV or DECL  make it selectable
					e.setAttribute("tooltiptext", personsData.PARTSTAT
						+ ";  " +reminderfox.string("rf.schedule.changeStatus"));
					e.addEventListener("click", function() {reminderfox.iSchedule.partizipation(this);},false);
				} else {
					e.setAttribute("tooltiptext", personsData.PARTSTAT );
				}
			} else {
				e.setAttribute("id", "persons"); }
	hbox.appendChild(e);

//	<spacer  width="5px" />
	var e = document.createElement("spacer");
			e.setAttribute("width", "5px");
	hbox.appendChild(e);

	var e = document.createElement("text");
		if ( element == "schMeBox") {
			e.setAttribute("id", "myDataMAIL");
		} else {
			e.setAttribute("id", "personsDataMAIL");
		}
			e.setAttribute("value", personsData.CNAME + "<" + personsData.MAIL +">");
	hbox.appendChild(e);

	aList.appendChild(hbox);

	return iNeedAction;
};

// ---- for 'attendee'  change the status ----
//coming in with eg.: aStatus.id = "Status-ACCEPTED"
reminderfox.iSchedule.attendeeStatus = function (aStatus) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   switch  (aStatus.id) {
      case ("REQUIRED-PARTICIPANT"): {
         aStatus.id = "OPTIONAL-PARTICIPANT";
         aStatus.tooltipText = reminderfox.string("rf.schedule.roleOPT"); break;}
      case ("OPTIONAL-PARTICIPANT"): {
         aStatus.id = "NON-PARTICIPANT";
         aStatus.tooltipText = reminderfox.string("rf.schedule.roleNON"); break;}
      case ("NON-PARTICIPANT"): {
         aStatus.id = "REQUIRED-PARTICIPANT";
         aStatus.tooltipText = reminderfox.string("rf.schedule.roleREQ"); break;}
   }
};


reminderfox.iSchedule.rsvp = function (myAction) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var reminderEvent = window.arguments[0].reminder;
	var saveNotes = reminderEvent.notes;			// don't loose the 'invitation' notes

	// now change entry for myATTENDEE
	// from [ACCEPT] [DECLINE]  entry  or  with changing the status
	var sender = document.getElementById("myDataMAIL").attributes[1].value
		// 		== "name<aaaa.bbbb@ccc.dd>"

	var len1 = sender.indexOf( "<" );
	var len2 = sender.indexOf( ">" );
	var sendMail = sender.substring(len1+1, len2);

	var extraInfo0 = reminderEvent.extraInfo.replace(new RegExp(/\\n /g),"");
	var extraInfoArray = extraInfo0.split("\\n");		

	//  build  extraInfo array for local use
	var localExtraInfoArray = new Array();
	var localExtraInfo;

	for ( var index = 0; index < extraInfoArray.length; index++ ) {
		var extraInfo = extraInfoArray[index];
		localExtraInfoArray[index] = extraInfo;

		if ( extraInfo.indexOf( "COMMENT" ) != -1 ) {
			extraInfoArray[index] = "";				// erase the ORGANIZER's 'COMMENT'
			//	localExtraInfoArray[index] = "";
		}

		if ( extraInfo.indexOf( "DTSTAMP" ) != -1 )	{
			var colonIndex = extraInfo.indexOf( ":" );
			var nDTSTAMP  =  reminderfox.date.parseDateTimes(extraInfo.substring(colonIndex +1)) ;
			
			var extraInfoSchedule = "[iCal] " + myAction + ": " + reminderfox.string("rf.schedule") ;
			if ( nDTSTAMP != null && nDTSTAMP.length > 0 ) {
				extraInfoSchedule += " " + reminderfox.string("rf.schedule.asof") + " " + nDTSTAMP;
			}
		}
		if ( extraInfo.indexOf( "SEQUENCE" ) != -1 ) {
			var colonIndex = extraInfo.indexOf( ":" );
			var nSEQ =  extraInfo.substring(colonIndex +1);
			if ( nSEQ != null ) {
				var extraInfoSEQ = "	[# " + nSEQ + "]" ;
			}
		}
		if ( extraInfo.indexOf( "ORGANIZER" ) != -1 ) {
			var attendeeInfo = reminderfox.iSchedule.parsePerson(extraInfoArray[index], "ORGANIZER");
			var mailToOrganizer = attendeeInfo.MAIL
		}
		
		
		if ( extraInfo.indexOf( "ATTENDEE" ) != -1 ) {
			var attendeeInfo = reminderfox.iSchedule.parsePerson(extraInfoArray[index], "ATTENDEE");
			
			// check if attendee is 'myMailAccounts'
			if ((reminderfox.msgnr.myMailIDs().toLowerCase().indexOf( attendeeInfo.MAIL.toLowerCase()) > -1)
				&& (attendeeInfo.MAIL  == sendMail)){

				if (attendeeInfo.CNAME != "") {
					var newAtt = "ATTENDEE;CN="+ attendeeInfo.CNAME +";PARTSTAT=" + myAction;
				} else {
					var newAtt = "ATTENDEE;PARTSTAT=" + myAction;
				}
				var iIndex = extraInfo.toUpperCase().indexOf( "ROLE=" );
				if (iIndex != -1) {
					var _role="";
					if (extraInfo.toUpperCase().indexOf("ROLE=CHAIR") != -1)
						_role =  "CHAIR";
					if (extraInfo.toUpperCase().indexOf("ROLE=REQ") != -1)	// "REQ-PARTICIPANT"
						_role =  "REQ-PARTICIPANT";
					if (extraInfo.toUpperCase().indexOf("ROLE=OPT") != -1)  // "OPT-PARTICIPANT"
						_role =  "OPT-PARTICIPANT";
					if (extraInfo.toUpperCase().indexOf("ROLE=NON") != -1)	// "NON-PARTICIPANT"
						_role =  "NON-PARTICIPANT";
					if (_role != "") {
						newAtt += ";ROLE="+ _role;
					}
				}

				newAtt += ":MAILTO:" + attendeeInfo.MAIL;
				extraInfoArray[index] = newAtt;
				localExtraInfoArray[index] = newAtt;

			} else {
				extraInfoArray[index] = "";
			}
		}	
	}

	for ( var index = 0; index < extraInfoArray.length; index++ ) {
		if (extraInfoArray[index] != "") {  // only add non-empty lines
			if (index == 0) {
				extraInfo = extraInfoArray[index];
			} else {
				extraInfo += "\\n" + extraInfoArray[index];
			}
		}
		if (localExtraInfoArray[index] != "") {  // only add non-empty lines
			if (index == 0) {
				localExtraInfo = localExtraInfoArray[index];
			} else {
				localExtraInfo += "\\n" + localExtraInfoArray[index];
			}
		}
	}

	// now set this to '.notes'
	extraInfoSchedule += extraInfoSEQ ;
	document.getElementById("notesText").value = extraInfoSchedule + "\n\n" + saveNotes;

	// now we can send the RSVP-response to the ORGAINZER by mail 
	// with "METHOD:REPLY"
	var sendArray = new Array();
	sendArray[0] = reminderEvent;
	sendArray[0].extraInfo = extraInfo;
	sendArray[0].notes = extraInfoSchedule;		// only send 'reply' notes
	reminderfox.mail.sendEventNow(sendArray, "", "REPLY", sender, mailToOrganizer);


	// store the local
	reminderEvent.extraInfo = localExtraInfo;
	reminderFox_saveReminderOptions( reminderEvent );

	window.arguments[0].addReminder = true;
	reminderFox_AddEditDialog_Enter(false);	// don't go for 'reschedule'					//gWXXX gWaddNew
};


reminderfox.iSchedule.showAttendees = function () {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var boxStatus = document.getElementById("schAttendeesBox0").getAttribute("hidden");

	if (boxStatus == "false") {
		document.getElementById("schAttendeesBox0").setAttribute("hidden", true);
	} else {
		document.getElementById("schAttendeesBox0").setAttribute("hidden", false);
	}
	sizeToContent();
};

// ---- for 'myPartizipation'  change the status ----
//   coming in with eg.: status.id = "Status-ACCEPTED"
reminderfox.iSchedule.partizipation = function (status) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var myID = status.parentNode.childNodes[4].attributes[0].value;

	if (status.id.indexOf("ACCEPTED") == -1) {
		newPartStat = "ACCEPTED";
	} else {
		newPartStat = "DECLINED";
	}
	check = confirm(reminderfox.string("rf.schedule.changePartStatus") 
		+ ": '" + newPartStat +"'");

	if (check == true) {
	// myACTION =  "ACCEPTED"  or  "DECLINED"
		reminderfox.iSchedule.rsvp(newPartStat);
	} else {
		// alert("canceled");
	}
};