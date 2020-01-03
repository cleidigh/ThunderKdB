
if (!reminderfox)	var reminderfox = {};
if (!reminderfox.datePicker)	reminderfox.datePicker = {};


/** The original starting date and currently selected date */
reminderfox.datePicker.gSelectedDate = null;

/* selected items */
reminderfox.datePicker.gTodaysDate = new Date();
reminderfox.datePicker.gStartingDayOfWeek = 0; // 0 for Sunday, 1 for Monday, etc

reminderfox.datePicker.isDatePicker = false;

/**
 *   Reads the starting day of week from prefs/options,
 *   if not set in prefs, set to default
 */
reminderfox.datePicker.StartingDayOfWeek = function () { // 0 for Sunday, 1 for Monday, etcwee
	reminderfox.datePicker.gStartingDayOfWeek = 
	reminderfox.core.getPreferenceValue(reminderfox.consts.CALENDAR_START_DAY, reminderfox.consts.CALENDAR_START_DAY_DEFAULT);
	return reminderfox.datePicker.gStartingDayOfWeek;
};



/**
 * Open the datepicker to help selecting a required date
 * Note:  need to rebuild the complete 'datepicker' object or the firstdayofweek will fail with 'grid'
 * @param event {object} the mouse event
 * @param datepickerAnchor {string} where to display the picker
 * @param isTime {} isEnddate  == true:  indicates an 'endDate' calling
 * @param type {}
 */
reminderfox.datePicker.datePickerOpen= function (event, datepickerAnchor, isTime, type) {

	if (event.button == 2) { // right mouse click
		reminderfox.calendar.ui.selectDay ('today');

	} else {
		if(datepickerAnchor.id == 'datepickerEndAnchor')
			reminderFox_endDateClicked = true;
	
		var datepickerBox = document.getElementById("datepickerBox");
	
		// clear & rebuild the whole datepicker
		while(datepickerBox.hasChildNodes())
			datepickerBox.removeChild(datepickerBox.firstChild);
	
		var datepicker = document.createElement("datepicker");
		datepicker.setAttribute('id', 'datePickerCurrent');
		
		var _type = (type != null) ? type : 'grid';
		datepicker.setAttribute('type', _type);
		datepicker.setAttribute('firstdayofweek', reminderfox.datePicker.StartingDayOfWeek());
		datepickerBox.appendChild(datepicker);
	
		document.getElementById("rmFx-moz-datepicker").showPopup(datepickerAnchor, event.screenX, event.screenY, "bottomleft", "topleft");
	}
}

/**
 *  Called with mozDatepicker to set date and time
 */
reminderfox.datePicker.datePickerGoto= function (element) {
	reminderfox.datePicker.gSelectedDate = new Date();
	if (element != 'today') {
		var datepicker = document.getElementById('datePickerCurrent');
		var year = datepicker.year;
		var month = datepicker.month;
		var day = datepicker.date;
		reminderfox.datePicker.gSelectedDate = new Date(year, month, day)
	}
	document.getElementById("rmFx-moz-datepicker").hidePopup();

	// redraw the calendar
	var numDate = reminderfox.date.convertDate(reminderfox.datePicker.gSelectedDate);
	reminderfox.calendar.ui.selectDay (numDate);
};
