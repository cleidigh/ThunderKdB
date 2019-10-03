function rmFx_datePickerQAClosed(element) {
	// we'll calculate the difference between now and the selected date
	// and set the snooze to that number of minutes
	var datepicker = document.getElementById("datePickerCurrent");
	var timepicker = document.getElementById("timePickerCurrent");
	document.getElementById("rmFx-moz-datepicker").hidePopup();

	var currentDate = new Date();
	currentDate.setSeconds(0);
	currentDate.setMilliseconds(0);
	var currentDateTime = currentDate.getTime();

	var selectedDate = datepicker.dateValue;
	selectedDate.setSeconds(0);
	selectedDate.setMilliseconds(0);

	selectedDate.setHours(timepicker.hour);
	selectedDate.setMinutes(timepicker.minute);

	var selectedTime = selectedDate.getTime();

	if (selectedTime == currentDateTime) return;

	if(selectedTime > currentDateTime) {
		var timeDiff = selectedTime - currentDateTime;
		var minutesDiff = timeDiff / 1000 / 60;
		var snoozeTimeList = document.getElementById("reminderFox-alertTime");
		// quick alarm

		if(snoozeTimeList == null) {
			snoozeTimeList = document.getElementById("reminderFox-snoozeTime");
			// alarm
		}

		var snoozeTimeInt = Math.round(parseInt(minutesDiff));

		var timeUnitsList = document.getElementById('reminderFox-alertTimeUnits');
		if(reminderfox.util.mod(snoozeTimeInt, (60 * 24)) == 0) {
			// days
			snoozeTimeList.label = (snoozeTimeInt / (60 * 24) );
			timeUnitsList.selectedIndex = 2;
		} else if(reminderfox.util.mod(snoozeTimeInt, 60) == 0) {
			// hours
			snoozeTimeList.label = (snoozeTimeInt / 60);
			timeUnitsList.selectedIndex = 1;
		} else {
			// minutes
			snoozeTimeList.label = snoozeTimeInt;

			timeUnitsList.selectedIndex = 0;
		}
		reminderFox_snoozeTimeChanged();
	} else {
		if(selectedDate.getHours() > 0 || selectedDate.getMinutes() > 0) {// if any time was set other than default
			alert(reminderfox.string("rf.add.time.button.calendar.date.select.invalid"));
		}
	}
}

/*
 * Opens a panel with date and time picker, those let set the alarm delay
 *
 * Reads the user selection of min/h/days and the pre-entered value and
 * calculates a new date and time.
 * The new date sets the datepicker  (that works with format value="2007-03-26"!) and
 *    datepicker.setAttribute('value', dateEntryYear + '-'+ dateEntryMonth + '-' + dateEntryDay);
 *
 * The time needs .value (string type)  or .dateValue (date type!) with
 *    timepicker.dateValue = currentDateTime;
 * The 24h format can be changed but needs some XUL additions   ;)
 *
 * 	References:
 * 	https://developer.mozilla.org/en/XUL/datepicker
 * 	https://developer.mozilla.org/en/XUL/timepicker
 *
 * Closing the panel with [OK] will pass the selected date/time to the XUL
 *   see:  rmFx_datePickerQAClosed(element)
 */
function rmFx_datePickerQA(event) {
	var currentDateTime = new Date();

	switch (document.getElementById("reminderFox-alertTimeUnits").value) {
		case "minutes" : {
			currentDateTime.setMinutes( +document.getElementById("reminderFox-alertTime").value +
				(+currentDateTime.getMinutes()));
			break;
		}
		case "hours"	: {
			currentDateTime.setHours( +document.getElementById("reminderFox-alertTime").value +
				(+currentDateTime.getHours()));
			break;
		}
		case "days" : {
			currentDateTime.setDate( +document.getElementById("reminderFox-alertTime").value +
					(+currentDateTime.getDate()));
			break;
		}
	}

//	reminderfox.util.Logger('qalarm', " rmFx_datePickerQA   alarmDateTime: " + currentDateTime);
	var dateEntryYear = currentDateTime.getFullYear();
	var dateEntryMonth = currentDateTime.getMonth()+1;			//gWXXX  is a simple inkrement working for end of year ??
	var dateEntryDay = currentDateTime.getDate();

	var datepickerAnchor = document.getElementById("datepickerAnchor");
	var datepickerBox = document.getElementById("datepickerBox");

	// clear & rebuild the whole datepicker
	while(datepickerBox.hasChildNodes())
	datepickerBox.removeChild(datepickerBox.firstChild);

	var datepicker = document.createElement("datepicker");
	datepicker.setAttribute('id', 'datePickerCurrent');
	datepicker.setAttribute('value', dateEntryYear + '-'+ reminderfox.date.num2(dateEntryMonth) + '-' + reminderfox.date.num2(dateEntryDay));
	datepicker.setAttribute('type', 'grid');
	datepicker.setAttribute('firstdayofweek', reminderfox.datePicker.StartingDayOfWeek());
	datepickerBox.appendChild(datepicker);

	var timepicker = document.getElementById("timePickerCurrent");
	timepicker.value = currentDateTime.getHours() + ":" + currentDateTime.getMinutes();

	datepicker = document.getElementById("rmFx-moz-datepicker");
	datepicker.showPopup(datepickerAnchor, event.screenX, event.screenY, "bottomleft", "topleft");
}


function loadAlarmOptions() {
	var alarmText = null;
	var snoozeTime = null;
	var alertGroup = document.getElementById('alertGroup');
	var snoozeGroup = document.getElementById('snoozeGroup');
	var alertButtonGroup = document.getElementById('alertButtonGroup');

	var desc = document.getElementById("newAlarmText");
	// set alert time to first non-zero time
	var alertTimesList = document.getElementById('reminderFox-alertTime');
	var snoozeTimeList = document.getElementById('reminderFox-snoozeTime');

	// otherwise, this is the initial window used for input
	snoozeGroup.setAttribute("hidden", true);
	alertGroup.removeAttribute("hidden");
	desc.focus();

	var notesText = document.getElementById("notesText");
	var notesToggleButton = document.getElementById("notesToggle");

	//		if ( reminderFoxEvent.notes != null ) {
	//			notesText.setAttribute("hidden", "false");
	//			notesToggleButton.setAttribute( "checked", true );
	//			notesText.value = reminderFoxEvent.notes;
	//			notesToggleButton.setAttribute("tooltiptext", reminderfox.string("rf.options.notes.tooltip.hide"));
	//		}
	//		else {
	notesText.setAttribute("hidden", "true");
	notesToggleButton.removeAttribute("checked");
	notesToggleButton.setAttribute("tooltiptext", reminderfox.string("rf.options.notes.tooltip.show"));
	//}

	reminderFox_updateSnoozeTimeDate();
}


/**
 * Called when the QuickAalarm dialog is closed with
 *   [OK]  or the Return/Enter key
 */
function setAlarm() {
	var desc = document.getElementById("newAlarmText");
	var alertTimesList = document.getElementById("reminderFox-alertTime");
	var snoozeTimeList = document.getElementById('reminderFox-snoozeTime');

	rmFx_datePickerQAClosed();		// to ensure the timepicker is respected

	var snoozeTime;
	var timeUnitsList;
	snoozeTime = alertTimesList.label;
	timeUnitsList = document.getElementById('reminderFox-alertTimeUnits');

	if(reminderfox.util.isInteger(snoozeTime)) {
		if(timeUnitsList != null) {
			var timeSelected = timeUnitsList.selectedIndex;
			if(timeSelected == 1) {
				snoozeTime = snoozeTime * 60;
			} else if(timeSelected == 2) {
				snoozeTime = snoozeTime * 60 * 24;
			}
		}

		var windowEnumerator = reminderfox.core.getWindowEnumerator();
		if(windowEnumerator.hasMoreElements()) {
			var notesText = document.getElementById("notesText");
			var notes = notesText.value;
			if(notes != null) {
				notes = reminderfox.util.trim(notes);
				notes = notes.replace(new RegExp(/\n/g), "\\n");
			}

			var oldestWindow = windowEnumerator.getNext();
			var val = desc.value;

			// if snooze greater than an hour, just let hourly process handle it then;
			// if it's within the hour, then set the alarm now
			if((parseInt(snoozeTime) * 60000) < 3600000) {
				oldestWindow.setTimeout(function() {
					oldestWindow.reminderfox.overlay.showQuickAlarm(val, snoozeTime, notes);
				}, snoozeTime * 60000);
			}

			reminderFox_updateQuickAlarms(desc.value, snoozeTime, notes);
		}
	}

	close();
}

function reminderFox_updateQuickAlarms(quickAlarmText, snoozeTime, notesText) {
	var currentTime = new Date().getTime();
	currentTime = currentTime + (snoozeTime * 60000);

	var newQuickAlarm = new reminderfox.core.ReminderFoxQuickAlarm(quickAlarmText, notesText, currentTime, snoozeTime);

	reminderfox.core.updateQuickAlarm(newQuickAlarm);
}

function playAlarmSound() {
	// play a sound for notification (if the user elects to)
	try {
		var playSound = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SOUND, true);
		if(playSound) {
			reminderfox.core.playSound();
		} // end if
	} catch ( e ) {
	}
}

function reminderFox_snoozeTimeChanged() {
	document.getElementById("snoozeButton").setAttribute("default", true);
	document.getElementById("okButton").setAttribute("default", false);

	reminderFox_updateSnoozeTimeDate();
}

function reminderFox_updateSnoozeTimeDate() {
	var snoozeTimeList2 = null;
	var timeUnitsList2 = null;
	var snoozeUntilText = null;
	snoozeTimeList2 = document.getElementById("reminderFox-alertTime");
	timeUnitsList2 = document.getElementById('reminderFox-alertTimeUnits');
	snoozeUntilText = document.getElementById("alarmAtTime");
	var snoozeTime2 = snoozeTimeList2.label;
	if(reminderfox.util.isInteger(snoozeTime2)) {
		if(timeUnitsList2 != null) {
			var timeSelected2 = timeUnitsList2.selectedIndex;
			if(timeSelected2 == 1) {
				snoozeTime2 = snoozeTime2 * 60;
			} else if(timeSelected2 == 2) {
				snoozeTime2 = snoozeTime2 * 60 * 24;
			}
		}

		var currentTimeDate = new Date();
		var currentTime2 = currentTimeDate.getTime();
		var alarmTime2 = currentTime2 + (snoozeTime2 * 60000);
		var snoozeDate2 = new Date();
		snoozeDate2.setTime(alarmTime2);

		var snoozeString = "";
		if(snoozeDate2.getMonth() != currentTimeDate.getMonth() || snoozeDate2.getDate() != currentTimeDate.getDate()) {
			var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
			snoozeString = reminderfox.date.getDateVariable(null, snoozeDate2, _dateVariableString) + ", ";
		}
		snoozeString += reminderfox.date.getTimeString(snoozeDate2);
		snoozeUntilText.setAttribute("value", snoozeString);
	}
}

function reminderFox_getDateVariableString(reminder, date) {
	var _dateVariableString = reminderfox.core.getPreferenceValue( reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
	return reminderfox.date.getDateVariable(reminder, date, _dateVariableString);
}

function reminderFox_closeAlarm() {
	window.close();
}
