function updateRepeatLength() {
	var repeatIndex = document.getElementById("repeatLength").selectedIndex;

	if ( repeatIndex == 1 ) {
		var dateItem = document.getElementById("monthlist");
		dateItem.removeAttribute("disabled");

		dateItem = document.getElementById("daylist");
		dateItem.removeAttribute("disabled")

		dateItem = document.getElementById("yearlist");
		dateItem.removeAttribute("disabled")

		document.getElementById("rrule-count").setAttribute("disabled", "true");
	}
	if (( repeatIndex == 0) || ( repeatIndex == 2)) {
		var dateItem = document.getElementById("monthlist");
		dateItem.setAttribute("disabled", "true");

		dateItem = document.getElementById("daylist");
		dateItem.setAttribute("disabled", "true");

		dateItem = document.getElementById("yearlist");
		dateItem.setAttribute("disabled", "true");

		document.getElementById("rrule-count").setAttribute("disabled", "true");
	}
	if (repeatIndex == 2) {
		document.getElementById("rrule-count").removeAttribute("disabled");
	}
}


function loadRepeat( ) {
	var reminderEvent = window.arguments[0].reminderfoxEvent;
	var currentDate = window.arguments[0].currentDate;
	if ( currentDate == null ) {
		currentDate = reminderEvent.date;
	}
	if ( reminderEvent.recurrence.endDate != null ) {
		document.getElementById("repeatLength").selectedIndex = 1;
		reminderFox_optionsSetNewReminderDate( reminderEvent.recurrence.endDate, true );
		reminderFox_optionsPopulateYearList(reminderEvent.recurrence.endDate  );
	}
	else {
		document.getElementById("repeatLength").selectedIndex = 0;
		var endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1 );	
		reminderFox_optionsSetNewReminderDate( endDate, true );
		reminderFox_optionsPopulateYearList(endDate);
	}
	if ( reminderEvent.recurrence.count != null ) {
		document.getElementById("repeatLength").selectedIndex = 2;
		document.getElementById("rrule-count").value = reminderEvent.recurrence.count;
	}

	updateRepeatingList(currentDate, reminderEvent, true);		// in eventEntry.js
	updateRepeatLength();
	
	// set recurrence interval
		var repeatList = document.getElementById("reminderFox-repeatList");	
		if ( reminderEvent.recurrence.type  == reminderfox.consts.RECURRENCE_YEARLY ) {
				repeatList.selectedIndex = 0;
				if ( reminderEvent.recurrence.interval != null ) {
					 document.getElementById("yearsText").setAttribute( "value", reminderEvent.recurrence.interval);
				}	
				
			}
			else if ( reminderEvent.recurrence.type  == reminderfox.consts.RECURRENCE_YEARLY_DAY ) {
				repeatList.selectedIndex = 1;
				if ( reminderEvent.recurrence.interval != null ) {
					 document.getElementById("yearsText").setAttribute( "value", reminderEvent.recurrence.interval);
				}	
			}		
			else 	if ( reminderEvent.recurrence.type  == reminderfox.consts.RECURRENCE_MONTHLY_DATE ) {
				repeatList.selectedIndex = 2;
				if ( reminderEvent.recurrence.interval != null ) {
					 document.getElementById("monthsText").setAttribute( "value", reminderEvent.recurrence.interval);
				}	
			}
			else if ( reminderEvent.recurrence.type  == reminderfox.consts.RECURRENCE_MONTHLY_DAY ) {
				repeatList.selectedIndex = 3;
				if ( reminderEvent.recurrence.interval != null ) {
					 document.getElementById("monthsText").setAttribute( "value", reminderEvent.recurrence.interval);
				}	
			}
			else	if ( reminderEvent.recurrence.type  == reminderfox.consts.RECURRENCE_WEEKLY ) {		
				repeatList.selectedIndex = 4;
				if ( reminderEvent.recurrence.interval != null ) {
					 if ( reminderEvent.recurrence.interval == 2 ) { // bi-weekly
					 	repeatList.selectedIndex = 5;
					 }
					 document.getElementById("weeksText").setAttribute( "value", reminderEvent.recurrence.interval);
				}					
			}			
			else	if ( reminderEvent.recurrence.type  == reminderfox.consts.RECURRENCE_DAILY ) {		
				repeatList.selectedIndex = 6;
				if ( reminderEvent.recurrence.interval != null ) {
					 document.getElementById("daysText").setAttribute( "value", reminderEvent.recurrence.interval);
				}	
			}
			else { 
				// default - for usability, when adding new reminder set the Default Custom view to weekly, 
				// as that is the most oft-requested repeat options ("How do I set up a weekday repeating event?") 
				repeatList.selectedIndex = 4;
			}
			
			
			// check the initial day of week 
			var byday =  reminderEvent.recurrence.byDay;
			if (byday == null || byday.length == 0 ) {
				byday = reminderfox.consts.weekday[currentDate.getDay()] 
			}
			if ( byday.indexOf( "SU" ) != -1 ) {
				document.getElementById("weekly-sun").setAttribute("checked", true);
			}
			if ( byday.indexOf( "MO" ) != -1 ) {
				document.getElementById("weekly-mon").setAttribute("checked", true);
			}
			if ( byday.indexOf( "TU" ) != -1 ) {
				document.getElementById("weekly-tue").setAttribute("checked", true);
			}
			if ( byday.indexOf( "WE" ) != -1 ) {
				document.getElementById("weekly-wed").setAttribute("checked", true);
			}
			if ( byday.indexOf( "TH" ) != -1 ) {
				document.getElementById("weekly-thu").setAttribute("checked", true);
			}
			if ( byday.indexOf( "FR" ) != -1 ) {
				document.getElementById("weekly-fri").setAttribute("checked", true);
			}
			if ( byday.indexOf( "SA" ) != -1 ) {
				document.getElementById("weekly-sat").setAttribute("checked", true);
			}
			
	
	repeatChanged();
	
	// remove 'custom' item
	document.getElementById("repeat-sep").setAttribute( "hidden", true );
	document.getElementById("repeat-custom").setAttribute( "hidden", true );
}


//repeat count can't less than 1
function reminderfox_checkCount(xthis) {
	if (document.getElementById("rrule-count").value < 1) document.getElementById("rrule-count").value = 1;
}


function reminderFox_saveRepeat() {
	var reminderEvent = window.arguments[0].reminderfoxEvent;
	
	var repeatIndex = document.getElementById("repeatLength").selectedIndex;
	if ( repeatIndex == 1 ) {
	
		var monthlist = document.getElementById('monthlist');
		var month =monthlist.selectedIndex;
		var daylist = document.getElementById('daylist');
		var day =daylist.label;
		// date  check --- if day is less than month; then set it to proper value
		var yearlist = document.getElementById('yearlist');
		var year = yearlist.label;
		day = reminderfox.date.getValidDateForMonth( year, month, day );
		var date = new Date( year, month, day );	
		reminderEvent.recurrence.endDate = date;
	}
	if ( repeatIndex == 0 ) {
		reminderEvent.recurrence.endDate = null;
	}

	if ( repeatIndex == 2 ) {
		reminderEvent.recurrence.endDate = null;
		reminderEvent.recurrence.count = document.getElementById("rrule-count").value;
	}


	reminderEvent.recurrence.byDay =  null;
	// set recurrence interval
	var repeatList = document.getElementById("reminderFox-repeatList");		
	var repeatingSelectedIndex = repeatList.selectedIndex;
	var recurrenceNum = 0;
	if ( repeatingSelectedIndex == 0 || repeatingSelectedIndex == 1 ) {
		recurrenceNum = document.getElementById("yearsText").value;
	}
	else if ( repeatingSelectedIndex == 2 || repeatingSelectedIndex == 3 ) {		
		recurrenceNum = document.getElementById("monthsText").value;
	}
	else if ( repeatingSelectedIndex == 4 || repeatingSelectedIndex == 5 ) {		
		recurrenceNum = document.getElementById("weeksText").value;
		reminderEvent.recurrence.byDay = "";
		var checked =   document.getElementById("weekly-sun").getAttribute("checked");
		if ( checked == true || checked == "true") {
			if ( reminderEvent.recurrence.byDay != null &&  reminderEvent.recurrence.byDay.length > 0 ) {
				reminderEvent.recurrence.byDay += ",";
			}
			reminderEvent.recurrence.byDay += "SU";
		}		
		checked =   document.getElementById("weekly-mon").getAttribute("checked");
		if ( checked == true || checked == "true") {
			if ( reminderEvent.recurrence.byDay != null &&  reminderEvent.recurrence.byDay.length > 0 ) {
				reminderEvent.recurrence.byDay += ",";
			}
			reminderEvent.recurrence.byDay += "MO";
		}
		checked =   document.getElementById("weekly-tue").getAttribute("checked");
		if ( checked == true || checked == "true") {
			if ( reminderEvent.recurrence.byDay != null &&  reminderEvent.recurrence.byDay.length > 0 ) {
				reminderEvent.recurrence.byDay += ",";
			}
			reminderEvent.recurrence.byDay += "TU";
		}
		checked =   document.getElementById("weekly-wed").getAttribute("checked");
		if ( checked == true || checked == "true") {
			if ( reminderEvent.recurrence.byDay != null &&  reminderEvent.recurrence.byDay.length > 0 ) {
				reminderEvent.recurrence.byDay += ",";
			}
			reminderEvent.recurrence.byDay += "WE";
		}
		checked =   document.getElementById("weekly-thu").getAttribute("checked");
		if ( checked == true || checked == "true") {
			if ( reminderEvent.recurrence.byDay != null &&  reminderEvent.recurrence.byDay.length > 0 ) {
				reminderEvent.recurrence.byDay += ",";
			}
			reminderEvent.recurrence.byDay += "TH";
		}
		checked =   document.getElementById("weekly-fri").getAttribute("checked");
		if ( checked == true || checked == "true") {
			if ( reminderEvent.recurrence.byDay != null &&  reminderEvent.recurrence.byDay.length > 0 ) {
				reminderEvent.recurrence.byDay += ",";
			}
			reminderEvent.recurrence.byDay += "FR";
		}
		checked =   document.getElementById("weekly-sat").getAttribute("checked");
		if ( checked == true || checked == "true") {
			if ( reminderEvent.recurrence.byDay != null &&  reminderEvent.recurrence.byDay.length > 0 ) {
				reminderEvent.recurrence.byDay += ",";
			}
			reminderEvent.recurrence.byDay += "SA";
		}
	}
	else if ( repeatingSelectedIndex == 6 ) {		
		recurrenceNum = document.getElementById("daysText").value;
	}
	
	try {
		var intervalNum = parseInt(recurrenceNum);
		// only set if more than 1 (we don't care about single occurrences; they are the default)
		if ( intervalNum > 1 ) {
			reminderEvent.recurrence.interval = intervalNum;
		}
		else {
			reminderEvent.recurrence.interval = null;
		}
		
	}
	catch ( e ) {		
	}
	
	var repeatList = document.getElementById("reminderFox-repeatList");
	var selectedIndex = repeatList.selectedIndex;	
	if ( selectedIndex == 0 ) {
		reminderEvent.recurrence.type  = reminderfox.consts.RECURRENCE_YEARLY;
	}
	else 	if ( selectedIndex == 1 ) {
		reminderEvent.recurrence.type  = reminderfox.consts.RECURRENCE_YEARLY_DAY;
	}			
	else 	if ( selectedIndex == 2 ) {
		reminderEvent.recurrence.type  = reminderfox.consts.RECURRENCE_MONTHLY_DATE;
	}
	else 	if ( selectedIndex == 3 ) {
		reminderEvent.recurrence.type  = reminderfox.consts.RECURRENCE_MONTHLY_DAY;			
	}
	else 	if ( selectedIndex == 4 || selectedIndex == 5 ) {
		reminderEvent.recurrence.type  = reminderfox.consts.RECURRENCE_WEEKLY;
	}		
	else 	if ( selectedIndex == 6 ) {
		reminderEvent.recurrence.type  = reminderfox.consts.RECURRENCE_DAILY;
	}		
	
	window.close();
}


function repeatChanged() {
	var repeatList = document.getElementById("reminderFox-repeatList");		
	var repeatingSelectedIndex = repeatList.selectedIndex;
	
	if ( repeatingSelectedIndex == 0 || repeatingSelectedIndex == 1 ) {
		document.getElementById("repeatdeck").selectedIndex = 0;
	}
	else if ( repeatingSelectedIndex == 2 || repeatingSelectedIndex == 3 ) {		
		document.getElementById("repeatdeck").selectedIndex = 1;	
	}
	else if ( repeatingSelectedIndex == 4 || repeatingSelectedIndex == 5 ) {		
		document.getElementById("repeatdeck").selectedIndex = 2;	
	}
	else if ( repeatingSelectedIndex == 6 ) {		
		document.getElementById("repeatdeck").selectedIndex = 3;	
	}
	
}