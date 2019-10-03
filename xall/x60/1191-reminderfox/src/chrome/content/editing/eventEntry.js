if(undefined == reminderFoxBundle) {
	var reminderFoxBundle = document.getElementById("reminderFox-bundle");
}
var reminderFox_innerTimeClicked = false;
var endDateMinutesOffset = null;

function reminderFox_launchURL() {
	var urlText = document.getElementById("url");
	if(urlText.value != "") {
		reminderfox.util.openURL(urlText.value, "launchUrl");
	}
}

function reminderFox_launchLocation() {
	var urlText = document.getElementById("location");
	if(urlText != null && urlText.value != "") {
		var url = urlText.value;
		// if location starts with URL, use that
		if(url.indexOf("http") != 0) {
			// otherwise use google maps
			url = "http://maps.google.com/maps?q=" + url;
		}
		reminderfox.util.openURL(url, "launchLocation");
	}
}

function reminderFox_toggleNotes() {
	var notesToggleButton = document.getElementById("notesToggle");
	var notesText = document.getElementById("notesText");

	if(notesToggleButton.getAttribute("checked")) {
		notesText.setAttribute("hidden", "true");
		notesToggleButton.setAttribute("tooltiptext", reminderfox.string("rf.options.notes.tooltip.show"));
		notesToggleButton.removeAttribute("checked");
	} else {
		notesText.setAttribute("hidden", "false");
		notesToggleButton.setAttribute("tooltiptext", reminderfox.string("rf.options.notes.tooltip.hide"));
		notesToggleButton.setAttribute("checked", true);
	}
	sizeToContent();
}

function isDateEnabled() {
	var dateEnabled = true;
	var todoDateCheckbox = document.getElementById("todoDateCheckbox");
	if(todoDateCheckbox != null) {
		dateEnabled = todoDateCheckbox.getAttribute("checked");
	}
	if(dateEnabled == true || dateEnabled == "true") {
		return true;
	} else {
		return false;
	}
}


function addCustomRepeat() {
	var reminderEvent = window.arguments[0].reminder;
	if(reminderEvent == null) {
		reminderEvent = window.arguments[0].todo;
	}

	var currentSelectedDate = getDateFromUI(null);
	var newOptions = {
		reminderfoxEvent : reminderEvent,
		currentDate : currentSelectedDate
	};
	window.openDialog("chrome://reminderfox/content/editing/repeatDialog.xul", "repeatDialog", "chrome,resizable,modal", newOptions);

	reminderEvent.recurrence = newOptions.reminderfoxEvent.recurrence;
	loadEventRepeat(reminderEvent, true);
}

/**
 *  Called with datepicker to set date and time
 */
function rmFx_datePickerOK(today) {
	var selectedDate;
	if ((today != null) && (today == 'today')) {
		selectedDate = new Date();
	} else {
		var datepicker = document.getElementById('datePickerCurrent');
		var year = datepicker.year;
		var month = datepicker.month;
		var day = datepicker.date;
		selectedDate = new Date(year, month, day);
	}
	document.getElementById("rmFx-moz-datepicker").hidePopup();

	if(isDateEnabled()) {
		reminderFox_optionsSetNewReminderDate(selectedDate, true, reminderFox_endDateClicked, true);
		reminderFox_optionsPopulateYearList(selectedDate, reminderFox_endDateClicked);
		if(reminderFox_endDateClicked) {
			reminderFox_timeChanged(true);
		} else {
			updateRepeatingList(selectedDate);
			reminderFox_timeChanged(false);
		}
	}
	reminderFox_endDateClicked = false;
}

/**
 * Updates with "dateEntryHBox" and "endDateEntryHBox" on "eventEntryOverlay.xul"
 */
function reminderFox_optionsSetNewReminderDate(date, repopulateDays, isEndDate, dontSetEndTime) {
	var month = date.getMonth();
	var day = date.getDate() - 1;
	// account for 1-offset
	var monthlist = null;
	if(isEndDate) {
		monthlist = document.getElementById('endmonthlist');
	} else {
		monthlist = document.getElementById('monthlist');
	}
	if(monthlist != null) {
		var items = monthlist.firstChild.childNodes;
		monthlist.selectedItem = items[month];

		// if month or year has changed, we want to reseed the date drop-down list with the appropriate
		// number of days for that month
		if(repopulateDays) {
			reminderFox_optionsPopulateDateList(date, isEndDate);
		}

		var dayList;
		if(isEndDate) {
			dayList = document.getElementById('enddaylist');
		} else {
			dayList = document.getElementById('daylist');
		}
		items = dayList.firstChild.childNodes;
		dayList.selectedItem = items[day];

		//    // update end year...
		//    if ( isEndDate ) {
		//    	var yearlist = document.getElementById('endyearlist');
		//    }

		if(isEndDate) {
			var yearlist = document.getElementById('endyearlist');
			yearlist.label = date.getFullYear();

			if(dontSetEndTime) {
			} else {
				reminderFox_updateTime(date, true);
			}
		}

		updateDateDescriptionLabel();
	}
}

var reminderFox_endDateClicked;

/**
 * Open the datepicker to help selecting a required date
 * Note:  need to rebuild the complete 'datepicker' object or the firstdayofweek will fail with 'grid'
 * @param {object} event the mouse event
 * @param {boolean} isEnddate  == true:  indicates an 'endDate' calling
 */
function reminderfox_datePickerOpen(event, xthis, isEndDate) {//gWCalndr

	var pre = "";
	if(xthis.id == 'datepickerEndAnchor') {
		reminderFox_endDateClicked = true;
		pre ="end";
	}
	var dateEntryMonth = +document.getElementById(pre+"monthlist").value;	// dateEntryMonth.value  = [string] "4"
	var dateEntryDay = document.getElementById(pre+"daylist").label;	// dateEntryDay.label = [string] "26"
	var dateEntryYear = document.getElementById(pre+"yearlist").label;	// dateEntryYear.label = [string] "2012"

	var datepickerBox = document.getElementById("datepickerBox");

	// clear & rebuild the whole datepicker
	while(datepickerBox.hasChildNodes()) {
		datepickerBox.removeChild(datepickerBox.firstChild);
	}

	var datepicker = document.createElement("datepicker");
	datepicker.setAttribute('id', 'datePickerCurrent');
	datepicker.setAttribute('value', dateEntryYear + '-'+ reminderfox.date.num2(dateEntryMonth) + '-' + reminderfox.date.num2(dateEntryDay));
	datepicker.setAttribute('type', 'grid');
	datepicker.setAttribute('firstdayofweek', reminderfox.datePicker.StartingDayOfWeek());
	datepickerBox.appendChild(datepicker);

	document.getElementById("rmFx-moz-datepicker").showPopup(xthis, event.screenX, event.screenY, "bottomleft", "topleft");
}

function reminderFox_optionsPopulateDateList(currentDate, isEndDate) {
	var year = parseInt(currentDate.getFullYear());
	var daylist = null;
	if(isEndDate) {
		daylist = document.getElementById('enddaylist');
	} else {
		daylist = document.getElementById('daylist');
	}
	var items = daylist.firstChild.childNodes;
	// remove ending nodes that could possibly be different each month
	// (i.e. any date greater than 28)
	var length = daylist.firstChild.childNodes.length - 1;
	for(var j = length; j >= 28; j--) {
		daylist.firstChild.removeChild(items[j]);
	}

	// now add proper # of days for this month
	var dayArray;
	if(reminderfox.date.isLeapYear(parseInt(year))) {
		dayArray = reminderfox.consts.lDOMonth;
	} else {
		dayArray = reminderfox.consts.DOMonth;
	}

	var monthlist = null;
	if(isEndDate) {
		monthlist = document.getElementById('endmonthlist');
	} else {
		monthlist = document.getElementById('monthlist');
	}
	var currentMonth = monthlist.selectedIndex;

	var numOfDays = dayArray[currentMonth];
	for(var k = 29; k < numOfDays + 1; k++) {
		var newDay = document.createElement("menuitem");
		var str = k + "";
		newDay.setAttribute("label", str);
		daylist.firstChild.appendChild(newDay);
	}

	// now make sure the dateList is not showing a date greater than
	// the number of days in the selected month; if it is set the list
	// to show the last day of the month
	var dayname = parseInt(daylist.label);

	var numOfDaysInt = parseInt(numOfDays);
	if(dayname > numOfDaysInt) {
		daylist.selectedItem = daylist.firstChild.childNodes[numOfDaysInt - 1];
	}
}

function reminderFox_optionsPopulateYearList(currentDate, isEndDate) {
	var todaysDate = new Date();
	// start with last year , in case they want to create a repeating reminder
	// from a previous month
	var year = parseInt(todaysDate.getFullYear()) - 1;

	var yearlist = document.getElementById('yearlist');
	if(isEndDate) {
		yearlist = document.getElementById('endyearlist');
	}
	while(yearlist.firstChild.hasChildNodes()) {
		yearlist.firstChild.removeChild(yearlist.firstChild.firstChild);
	}

	for(var k = 0; k < 5; k++) {
		var newYear = document.createElement("menuitem");
		var yearVal = year + k;
		newYear.setAttribute("label", yearVal);
		yearlist.firstChild.appendChild(newYear);
	}

	yearlist.label = currentDate.getFullYear();
}

function optionsDateChanged(repopulateDays, isEndDate) {
	var monthlist = document.getElementById('monthlist');
	var daylist = document.getElementById('daylist');
	var yearlist = document.getElementById('yearlist');

	if(isEndDate) {
		monthlist = document.getElementById('endmonthlist');
		daylist = document.getElementById('enddaylist');
		yearlist = document.getElementById('endyearlist');

	}
	var month = monthlist.selectedIndex;
	var day = daylist.label;
	var year = yearlist.label;

	// date  check --- if day is less than month; then set it to proper value
	day = reminderfox.date.getValidDateForMonth(year, month, day);

	var date = new Date(year, month, day);
	reminderFox_optionsSetNewReminderDate(date, repopulateDays, isEndDate, true);

	if(isEndDate) {
		// set new end date offset
		calculateEndTimeOffset();
	} else {
		// start date has changed; set new end date based on offset
		updateEndDateWithOffset();

		updateRepeatingList(date);
	}
}

function reminderFox_allDayChanged() {
	var allDay = document.getElementById("reminderFox-all-day");
	var allDayVal = allDay.getAttribute("checked");
	if(allDayVal == true || allDayVal == "true") {
		document.getElementById("reminderFox-timeList").setAttribute("disabled", "true");
		document.getElementById("reminderFox-endTimeList").setAttribute("disabled", "true");

		calculateEndTimeOffset();
	} else {
		document.getElementById("reminderFox-timeList").removeAttribute("disabled");
		document.getElementById("reminderFox-endTimeList").removeAttribute("disabled");

		calculateEndTimeOffset();
	}
}

function reminderFox_alertChanged() {
	var showAlert = document.getElementById("reminderFox-alert");
	var alertVal = showAlert.getAttribute("checked");
	if(alertVal == false || alertVal == "false") {
		document.getElementById("reminderFox-alertTime").setAttribute("disabled", "true");
		document.getElementById("reminderFox-alertInfo").setAttribute("disabled", "true");
		document.getElementById("reminderFox-alertTimeUnits").setAttribute("disabled", "true");
	} else {
		document.getElementById("reminderFox-alertTime").removeAttribute("disabled");
		document.getElementById("reminderFox-alertInfo").removeAttribute("disabled");
		document.getElementById("reminderFox-alertTimeUnits").removeAttribute("disabled");
	}
}

function showMoreOptionsPane(forceShow, personsON) {
	var morePanel = document.getElementById("moreOptionsVbox");

	if(forceShow || morePanel.getAttribute('hidden') == "true") {
		morePanel.setAttribute('hidden', 'false');
		document.getElementById('moreReminderItems').setAttribute('label', reminderfox.string("rf.reminderoptions.less.button.label"));
	} else {
		morePanel.setAttribute('hidden', 'true');
		document.getElementById('moreReminderItems').setAttribute('label', reminderfox.string("rf.reminderoptions.more.button.label"));
	}

	// gW added to process 'Scheduled Persons'  +++++  +++++  +++++
	if(personsON) {
		var invitBox = document.getElementById("moreOptionsInvitationBox");
		invitBox.setAttribute('hidden', 'false');
	}

	// If calling this in response to the MORE> button event, resize window
	if(!forceShow) {
		sizeToContent();
	}
}


/**
 * called from Edit Reminder dialog with mail icon
 * @since 2013-06-28  not closing the Edit dialog
 */
function showMailIcon() {
	var reminderFoxEvent = window.arguments[0].reminder;
	if(reminderFoxEvent == null) {
		reminderFoxEvent = window.arguments[0].todo;
	}
	var displayMailButton = document.getElementById("displayMail");
	displayMailButton.setAttribute("checked", false);
	if(reminderFoxEvent.messageID != null) {
		reminderfox.mail.openByMessageID(reminderFoxEvent);
	} else if(reminderfox.core.isGMailEvent(reminderFoxEvent)) {
		reminderFox_launchURL();
		reminderfox.core.focusBrowser();
	}
}

function moveElementToMore(elementName, morePanel) {
	var item = document.getElementById(elementName);
	if(item != null) {
		var clonedItem = item.cloneNode(true);
		item.parentNode.removeChild(item);
		morePanel.appendChild(clonedItem);
	}
}

function loadMoreOptions(event) {
	var morePanel = document.getElementById("moreOptionsVbox");
	var defaultMoreItemString = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_MORE, reminderfox.consts.DEFAULT_MORE_DEFAULT_VALUE);

	// showInTooltip,repeat,url,category,location,important,remindUntilComplete,alarm,endDate
	var defaultMoreItems = defaultMoreItemString.split(",");
	for(var i = 0; i < defaultMoreItems.length; i++) {
		var moreItem = defaultMoreItems[i];
		moreItem = reminderfox.util.trim(moreItem);
		if(moreItem == "location") {
			moveElementToMore('locationHbox', morePanel);
		} else if(moreItem == "url") {
			moveElementToMore('urlHbox', morePanel);
		} else if(moreItem == "category") {
			moveElementToMore('catHbox', morePanel);
		} else if(moreItem == "repeat") {
			moveElementToMore('repeatHboxOverlay', morePanel);
		} else if(moreItem == "alarm") {
			moveElementToMore('alertEntry', morePanel);
		} else if(moreItem == "important") {
			moveElementToMore('important', morePanel);
		} else if(moreItem == "remindUntilComplete") {
			moveElementToMore('remindUntilComplete', morePanel);
		} else if(moreItem == "showInTooltip") {
			moveElementToMore('showInTooltip', morePanel);
		} else if(moreItem == "endDate") {
			var endDateHbox = document.createElement("hbox");
			endDateHbox.setAttribute("align", "center");
			moveElementToMore('dateEndLabel', endDateHbox);
			moveElementToMore('endDateEntryHBox', endDateHbox);
			moveElementToMore('endTimeEntry', endDateHbox);
			morePanel.appendChild(endDateHbox);
		}
	}

	// gW added to process 'Scheduled Persons'
	var schedulePersons = reminderfox.iSchedule.persons(event);
	if(schedulePersons) {
		// move the scheduling support to the end of the MORE> list
		moveElementToMore('moreOptionsInvitationBox', morePanel);
	}

	// TODO: have a pref to decide whether to initially show the More options or not...
	// would have to scan through morePref list to see which ones
	// to check for
	// TODO: also handle showing the two footer lines with no contents between

	if((event.location != null && event.location.length > 0 ) || (event.url != null && event.url.length > 0) || schedulePersons) {
		showMoreOptionsPane(true, schedulePersons);
	}
}

function saveMoreOptions(event) {
	var locationText = document.getElementById("location");
	if(locationText.value != "") {
		event.location = locationText.value;
	} else {
		event.location = null;
	}

	var urlText = document.getElementById("url");
	if(urlText.value != "") {
		event.url = urlText.value;
	} else {
		event.url = null;
	}
}

function reminderFox_repeatChanged() {
	var repeat = document.getElementById("reminderFox-repeat");
	var repeatVal = repeat.getAttribute("checked");
	if(repeatVal == false || repeatVal == "false") {
		document.getElementById("reminderFox-repeatList").setAttribute("disabled", "true");
	} else {
		document.getElementById("reminderFox-repeatList").removeAttribute("disabled");

		// repeat has been enabled - update repeat list to make sure it reflects current date
		var monthlist = document.getElementById('monthlist');
		var month = monthlist.selectedIndex;

		var daylist = document.getElementById('daylist');
		var day = daylist.label;
		// date  check --- if day is less than month; then set it to proper value
		var yearlist = document.getElementById('yearlist');
		var year = yearlist.label;
		day = reminderfox.date.getValidDateForMonth(year, month, day);

		var date = new Date(year, month, day);
		updateRepeatingList(date);
	}
}

function updateRepeatingList(currentDate, reminder, ignoreCustomTag) {
	var repeat = document.getElementById("reminderFox-repeat");
	if(repeat != null) {
		if(repeat.getAttribute("checked") != true && repeat.getAttribute("checked") != "true") {
			return;
			// exit - no repeating option is selected
		}
	}
	var monthlist = document.getElementById('monthlist');
	var daylist = document.getElementById('daylist');
	var startingParens = "    (";
	var closingParens = ")";

	var repeatList = document.getElementById("reminderFox-repeatList");
	var items = repeatList.firstChild.childNodes;
	var reminderDay = currentDate.getDay();
	var weekNumber = reminderfox.date.getWeekNumber(currentDate);
	var repeatingSelectedIndex = repeatList.selectedIndex;
	var val, index;
	var CUSTOM = reminderfox.string("rf.options.repeat.custom.name");

	if(reminder == null) {
		if(window.arguments[0].reminder != null) {
			reminder = window.arguments[0].reminder;
			if(reminder == null) {
				reminder = window.arguments[0].todo;
			}
		} else {
			if(window.arguments[0].todo != null) {
				reminder = window.arguments[0].todo;
			}
		}
	}

	// yearly
	val = items[0].getAttribute("label");
	index = val.indexOf(startingParens);
	if(index != -1) {
		val = val.substring(0, index);
	}
	if(reminder != null && !ignoreCustomTag
			&& reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY
			&& (reminder.recurrence.byDay != null
			|| (reminder.recurrence.interval != null && reminder.recurrence.interval > 1)
			|| reminder.recurrence.endDate != null )) {
		val = val + startingParens + CUSTOM + closingParens;
	}
	items[0].label = val;
	if(repeatingSelectedIndex == 0) {
		repeatList.selectedItem = items[6];
		repeatList.selectedItem = items[0];
	}

	// daily
	val = items[6].getAttribute("label");
	index = val.indexOf(startingParens);
	if(index != -1) {
		val = val.substring(0, index);
	}
	if(reminder != null && !ignoreCustomTag
			&& reminder.recurrence.type == reminderfox.consts.RECURRENCE_DAILY
			&& (reminder.recurrence.byDay != null
			|| (reminder.recurrence.interval != null && reminder.recurrence.interval > 1)
			|| reminder.recurrence.endDate != null )) {
		val = val + startingParens + CUSTOM + closingParens;
	}
	items[6].label = val;
	if(repeatingSelectedIndex == 5) {
		repeatList.selectedItem = items[0];
		repeatList.selectedItem = items[6];
	}

	// yearly by day
	val = items[1].getAttribute("label");
	index = val.indexOf(startingParens);
	if(index != -1) {
		val = val.substring(0, index);
	}

	if(reminder != null && !ignoreCustomTag
			&& reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY_DAY
			&& (reminder.recurrence.byDay != null
			|| (reminder.recurrence.interval != null && reminder.recurrence.interval > 1)
			|| reminder.recurrence.endDate != null )) {
		val = val + startingParens + CUSTOM + ": " + getWeekName(weekNumber) + " " + getDayName(reminderDay) + " " + reminderfox.string("rf.options.weekof.name") + " " + monthlist.selectedItem.label + closingParens;
	} else {
		val = val + startingParens + getWeekName(weekNumber) + " " + getDayName(reminderDay) + " " + reminderfox.string("rf.options.weekof.name") + " " + monthlist.selectedItem.label + closingParens;
	}
	items[1].label = val;
	if(repeatingSelectedIndex == 1) {
		repeatList.selectedItem = items[0];
		repeatList.selectedItem = items[1];
	}

	// monthly by date
	val = items[2].getAttribute("label");
	index = val.indexOf(startingParens);
	if(index != -1) {
		val = val.substring(0, index);
	}
	var dateStr = reminderfox.string("rf.options.dateshort." + currentDate.getDate() + ".name");
	if(reminder != null && !ignoreCustomTag
			&& reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE
			&& (reminder.recurrence.byDay != null
			|| (reminder.recurrence.interval != null
			&& reminder.recurrence.interval > 1)
			|| reminder.recurrence.endDate != null )) {
		val = val + startingParens + CUSTOM + ": " + dateStr + " " + reminderfox.string("rf.options.weekofmonth.name") + closingParens;
	} else {
		val = val + startingParens + dateStr + " " + reminderfox.string("rf.options.weekofmonth.name") + closingParens;
	}
	items[2].label = val;
	if(repeatingSelectedIndex == 2) {
		repeatList.selectedItem = items[0];
		repeatList.selectedItem = items[2];
	}

	// monthly by day
	val = items[3].getAttribute("label");
	index = val.indexOf(startingParens);
	if(index != -1) {
		val = val.substring(0, index);
	}
	if(reminder != null && !ignoreCustomTag
			&& reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY
			&& (reminder.recurrence.byDay != null
			|| (reminder.recurrence.interval != null
			&& reminder.recurrence.interval > 1)
			|| reminder.recurrence.endDate != null )) {
		val = val + startingParens + CUSTOM + ": " + getWeekName(weekNumber) + " " + getDayName(reminderDay) + " " + reminderfox.string("rf.options.weekofmonth.name") + closingParens;
	} else {
		val = val + startingParens + getWeekName(weekNumber) + " " + getDayName(reminderDay) + " " + reminderfox.string("rf.options.weekofmonth.name") + closingParens;
	}
	items[3].label = val;
	if(repeatingSelectedIndex == 3) {
		repeatList.selectedItem = items[0];
		repeatList.selectedItem = items[3];
	}

	// weekly
	val = items[4].getAttribute("label");
	index = val.indexOf(startingParens);
	if(index != -1) {
		val = val.substring(0, index);
	}

	if(reminder != null && !ignoreCustomTag
			&& reminder.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY
			&& reminder.recurrence.interval != 2) {// only change label to Custom if it's not a bi-weekly
		if((reminder.recurrence.byDay != null
			|| (reminder.recurrence.interval != null
			&& reminder.recurrence.interval > 2)
			|| reminder.recurrence.endDate != null )) {
				if(reminder.recurrence.byDay == null) {
					val = val + startingParens + CUSTOM + ": " + reminderfox.string("rf.options.everyweek.name") + " " + getDayName(reminderDay) + closingParens;
				} else {
					val = val + startingParens + CUSTOM + closingParens;
				}
		} else {
			val = val + startingParens + reminderfox.string("rf.options.everyweek.name") + " " + getDayName(reminderDay) + closingParens;
		}
	} else {
		val = val + startingParens + reminderfox.string("rf.options.everyweek.name") + " " + getDayName(reminderDay) + closingParens;
	}
	items[4].label = val;
	if(repeatingSelectedIndex == 4) {
		repeatList.selectedItem = items[0];
		repeatList.selectedItem = items[4];
	}

	// bi-weekly
	val = items[5].getAttribute("label");
	index = val.indexOf(startingParens);
	if(index != -1) {
		val = val.substring(0, index);
	}

	if(reminder != null && !ignoreCustomTag
			&& reminder.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY
			&& reminder.recurrence.interval == 2) {// only change label if the recurrence is set to 2 (bi-weekly)
				if(reminder.recurrence.byDay != null
				|| reminder.recurrence.endDate != null) {
					if(reminder.recurrence.byDay == null) {
						val = val + startingParens + CUSTOM + ": " + reminderfox.string("rf.options.everyweek.name") + " " + getDayName(reminderDay) + closingParens;
					} else {
						val = val + startingParens + CUSTOM + closingParens;
					}
					} else {
						val = val + startingParens + reminderfox.string("rf.options.everyotherweek.name") + " " + getDayName(reminderDay) + closingParens;
					}
	} else {
		val = val + startingParens + reminderfox.string("rf.options.everyotherweek.name") + " " + getDayName(reminderDay) + closingParens;
	}
	items[5].label = val;
	if(repeatingSelectedIndex == 5) {
		repeatList.selectedItem = items[0];
		repeatList.selectedItem = items[5];
	}
}


function getDayName(dayNum) {
	return reminderfox.string("rf.options.day." + dayNum + ".name");
}

function getWeekName(weekNum) {
	if(weekNum == -1) {
		return reminderfox.string("rf.options.week.occurrence.5.name");
	} else {
		return reminderfox.string("rf.options.week.occurrence." + weekNum + ".name");
	}
}

function loadEventRepeat(calendarEvent, editing) {
	var repeat = document.getElementById("reminderFox-repeat");
	var repeatList = document.getElementById("reminderFox-repeatList");
	if(!editing) {
		var defaultRepeat= reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_REPEAT, -1);
		if(defaultRepeat < 0) {
			repeat.removeAttribute("checked");
		} else {
			repeat.setAttribute("checked", true);
			repeatList.selectedIndex = defaultRepeat;
		}
	} else {
		if(calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY) {
			repeatList.selectedIndex = 0;
			repeat.setAttribute("checked", true);
		} else if(calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY_DAY) {
			repeatList.selectedIndex = 1;
			repeat.setAttribute("checked", true);
		} else if(calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE) {
			repeatList.selectedIndex = 2;
			repeat.setAttribute("checked", true);
		} else if(calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY) {
			repeatList.selectedIndex = 3;
			repeat.setAttribute("checked", true);
		} else if(calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY) {
			repeatList.selectedIndex = 4;

			// check for bi-weekly
			if(calendarEvent.recurrence.interval == 2) {
				repeatList.selectedIndex = 5;
			}

			repeat.setAttribute("checked", true);
		} else if(calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_DAILY) {
			repeatList.selectedIndex = 6;
			repeat.setAttribute("checked", true);
		} else {
			repeat.setAttribute("checked", false);
		}
	}
	reminderFox_repeatChanged();
}

function saveEventRepeat(calendarEvent) {
	var repeat = document.getElementById("reminderFox-repeat");
	if(repeat != null && repeat.getAttribute("checked") == false || repeat.getAttribute("checked") == "false") {
		calendarEvent.recurrence.type = reminderfox.consts.RECURRENCE_ONETIME;
	} else {
		var repeatList = document.getElementById("reminderFox-repeatList");
		var selectedIndex = repeatList.selectedIndex;
		if(selectedIndex == 0) {
			calendarEvent.recurrence.type = reminderfox.consts.RECURRENCE_YEARLY;
		} else if(selectedIndex == 1) {
			calendarEvent.recurrence.type = reminderfox.consts.RECURRENCE_YEARLY_DAY;
		} else if(selectedIndex == 2) {
			calendarEvent.recurrence.type = reminderfox.consts.RECURRENCE_MONTHLY_DATE;
		} else if(selectedIndex == 3) {
			calendarEvent.recurrence.type = reminderfox.consts.RECURRENCE_MONTHLY_DAY;
			var reminderDay = calendarEvent.date.getDay();
			var reminderDate = calendarEvent.date.getDate();
			var numberOfDay = reminderDate / 7;
			var intvalue = parseInt(numberOfDay);
			if(reminderDate % 7 == 0) {
				intvalue--;
			}

			var weekNumber = intvalue + 1;
			// 0-based index
			if(weekNumber == 5) {
				weekNumber = -1;
				// set to last week of month
			}
		} else if(selectedIndex == 4 || selectedIndex == 5) {
			calendarEvent.recurrence.type = reminderfox.consts.RECURRENCE_WEEKLY;
			if(selectedIndex == 5) {
				// bi-weekly
				calendarEvent.recurrence.interval = 2;
			}
		} else if(selectedIndex == 6) {
			calendarEvent.recurrence.type = reminderfox.consts.RECURRENCE_DAILY;
		}
	}

/*--------------
reminderfox.consts.RECURRENCE_ONETIME = null; // default
reminderfox.consts.RECURRENCE_YEARLY = 0;
reminderfox.consts.RECURRENCE_MONTHLY_DATE = 1;
reminderfox.consts.RECURRENCE_MONTHLY_DAY = 3;
reminderfox.consts.RECURRENCE_WEEKLY = 4;
reminderfox.consts.RECURRENCE_YEARLY_DAY = 6;
reminderfox.consts.RECURRENCE_DAILY = 7;
-------*/
var repDays = ((calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY) || (calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY_DAY)) ? 365 : 0;
repDays = ((calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE) || (calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY)) ? 30 : repDays;
repDays = (calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY) ? 7 : repDays;
repDays =(calendarEvent.recurrence.type == reminderfox.consts.RECURRENCE_DAILY) ? 1 : repDays;

var daysNOK = ((parseInt((calendarEvent.endDate - calendarEvent.date)/ 86400000)) > repDays)
		&& (calendarEvent.recurrence.type != reminderfox.consts.RECURRENCE_ONETIME);

return daysNOK;
}


function addLeadingZeroTo24HourTime(timeList) {
	var lastChild = timeList.firstChild;
	var items = timeList.firstChild.childNodes;
	for(var i = 0; i < 24; i++) {
		var time = "";
		if(i < 10) {
			time = "0";
		}
		items[i].setAttribute("label", time + i + ":" + "00");
	}
}


/**
 * set the UI elements into the More>> box based on user preference
 */
function loadEvent(reminderFoxEvent, editing) {
	var _alarmMins, alertTime, timeUnitsList;

	loadMoreOptions(reminderFoxEvent);

	var use24HourTime = reminderfox.core.getPreferenceValue(reminderfox.consts.USE_24_HOUR_TIME, false);
	if(use24HourTime) {
		addLeadingZeroTo24HourTime(document.getElementById("reminderFox-timeList"));
		addLeadingZeroTo24HourTime(document.getElementById("reminderFox-endTimeList"));
	}

	var desc = document.getElementById("newReminderText");
	desc.value = reminderFoxEvent.summary;

	var notesToggleButton = document.getElementById("notesToggle");
	var notesText = document.getElementById("notesText");
	if(reminderFoxEvent.notes != null) {
		notesText.setAttribute("hidden", "false");
		notesToggleButton.setAttribute("checked", true);
		notesText.value = reminderFoxEvent.notes;
		notesToggleButton.setAttribute("tooltiptext", reminderfox.string("rf.options.notes.tooltip.hide"));
	} else {
		notesText.setAttribute("hidden", "true");
		notesToggleButton.removeAttribute("checked");
		notesToggleButton.setAttribute("tooltiptext", reminderfox.string("rf.options.notes.tooltip.show"));
	}


//reminderfox.util.Logger('ALERT', "reminderfox.core.isMailEvent(reminderFoxEvent)  : " + reminderfox.core.isMailEvent(reminderFoxEvent))
	if(reminderfox.core.isMailEvent(reminderFoxEvent)) {
		var displayMailButton = document.getElementById("displayMail");
		displayMailButton.setAttribute('style', 'visibility: visible');
		displayMailButton.setAttribute('disabled', 'false');
	}

	//  import with Category should set as passed!
	var catText = document.getElementById("inputRmCategories");
	if(editing) {
		if(reminderFoxEvent.categories != null && reminderFoxEvent.categories.length > 0) {
			catText.setAttribute('value', reminderfox.category.Clean(reminderFoxEvent.categories));
		}
	} else {// if adding a new event, use default category if user has specified it
		var defaultCategory = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_CATEGORY, "");
		if(defaultCategory != null && defaultCategory.length > 0) {
			catText.setAttribute('value', defaultCategory);
		}
	}

	var important = document.getElementById("important");
	important.setAttribute("checked", (reminderFoxEvent.priority == reminderfox.consts.PRIORITY_IMPORTANT));

	try {
		var showInTooltip = document.getElementById("showInTooltip");
		var showInTooltipDefault =  reminderfox.core.getPreferenceValue( reminderfox.consts.DEFAULT_SHOW_IN_TOOLTIP, true);
		if (editing) {
			showInTooltip.setAttribute( "checked", showInTooltipDefault );
		}
		else {
			showInTooltip.setAttribute( "checked", (+reminderFoxEvent.showInTooltip == 1));
		}
	} catch(e) {}

	var allDay = document.getElementById("reminderFox-all-day");
	var allDayDefault =  reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_ALL_DAY, true);
	if (editing) {
		allDay.setAttribute("checked", reminderFoxEvent.allDayEvent);
	} else {
		allDay.setAttribute("checked", allDayDefault);
	}

	// Start date...
	var noCurrentDate = false;
	var todoDateCheckbox = document.getElementById("todoDateCheckbox");
	if(reminderFoxEvent.date == null) {
		reminderFoxEvent.date = new Date();
		noCurrentDate = true;
		if(todoDateCheckbox != null) {
			todoDateCheckbox.setAttribute("checked", false);
		}
	} else {
		if(todoDateCheckbox != null) {
			todoDateCheckbox.setAttribute("checked", true);
		}
	}
	reminderFox_optionsSetNewReminderDate(reminderFoxEvent.date, true /*repopulateDays*/);
	reminderFox_optionsPopulateYearList(reminderFoxEvent.date);
	reminderFox_updateTime(reminderFoxEvent.date, false);

	// End Date...
	if (reminderFoxEvent.endDate == null) {
		reminderFoxEvent.endDate = new Date(reminderFoxEvent.date.getFullYear(),
			reminderFoxEvent.date.getMonth(),
			reminderFoxEvent.date.getDate(),
			reminderFoxEvent.date.getHours() + 1, reminderFoxEvent.date.getMinutes());
	}
	var updatedEndDate = reminderFoxEvent.endDate;

	var allDayVal =  allDay.getAttribute("checked" );
	if ( allDayVal == true || allDayVal == "true") {
		var startDate = new Date(reminderFoxEvent.date.getFullYear(), reminderFoxEvent.date.getMonth(), reminderFoxEvent.date.getDate() );
		var endDate = new Date(reminderFoxEvent.endDate.getFullYear(), reminderFoxEvent.endDate.getMonth(), reminderFoxEvent.endDate.getDate() );
		// if endDate less startDay...  then subtract one day
		if (reminderfox.core.compareDates(startDate, endDate) == -1) {
			updatedEndDate.setDate( endDate.getDate() - 1 );
		}
	}
	reminderFox_optionsSetNewReminderDate(updatedEndDate, true /*repopulateDays*/, true /*isEndDate*/);
	reminderFox_optionsPopulateYearList(updatedEndDate, true);
	reminderFox_updateTime( reminderFoxEvent.endDate, true);

	if(noCurrentDate) {
		reminderFoxEvent.date = null;
		reminderFoxEvent.endDate = null;
	}

	calculateEndTimeOffset();

	loadEventRepeat(reminderFoxEvent, editing);
	var showAlert = document.getElementById("reminderFox-alert");


//ALARM
	if(!editing) {
		var alarmMinutes = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_TIME_DEFAULT, 0);
		if(alarmMinutes < 0) {
			showAlert.setAttribute("checked", false);
		} else {
			showAlert.setAttribute("checked", true);
			alertTime = document.getElementById("reminderFox-alertTime");
			alertTime.label = alarmMinutes;
			timeUnitsList = document.getElementById('reminderFox-alertTimeUnits');
			var alarmUnitsIndex = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_UNITS_DEFAULT, 0);
			timeUnitsList.selectedIndex = alarmUnitsIndex;
		}
	} else {
		if(reminderFoxEvent.alarm == null) {
			showAlert.setAttribute("checked", false);
		} else {
			showAlert.setAttribute("checked", true);
			alertTime = document.getElementById("reminderFox-alertTime");

			alarmTime = reminderFoxEvent.alarm;
			var result;
			timeUnitsList = document.getElementById('reminderFox-alertTimeUnits');
			var timeItems = timeUnitsList.firstChild.childNodes;

		// TRIGGER/ALARM can be relative (in RmFx normally) or absolute (like with GCal)
		// trigabs::   TRIGGER;VALUE=DATE-TIME:20130505T143000Z
			// absolute ALARM convert it to relative minutes for RmFx compatibilty
			if (reminderFoxEvent.alarm.charAt(reminderFoxEvent.alarm.length-1) == "Z")  {
				_alarmMins = reminderFoxEvent.date - reminderfox.date.getDTZfromICSstring(reminderFoxEvent.alarm);
				_alarmMins = _alarmMins/60/1000;
				alarmTime = "-PT" + _alarmMins + "M";
			} else {
		// trigrel::   TRIGGER:-PT5M		(may contain TRIGGER;RELATED=END:PT5M .. ignored that for the moment )
				_alarmMins = reminderfox.core.getDurationAsMinutes(alarmTime);
				alarmTime = ("-PT") + _alarmMins + "M";
			}

			// display the biggest possible integer value of the alarmTime, fractions will be lost (GCal!)
			alertTime.label = _alarmMins; timeUnitsList.selectedItem = timeItems[0];
			var _hours = parseInt(_alarmMins/60);
			if (_hours > 0) {alertTime.label = _hours; timeUnitsList.selectedItem = timeItems[1];}

			var _days = parseInt(_alarmMins/60/24);
			if (_days > 0) {alertTime.label = _days; timeUnitsList.selectedItem = timeItems[2];}
		}
	}

	reminderFox_alertChanged();

	reminderFox_allDayChanged();
	reminderFox_handleTodoDate();
	var monthlist = document.getElementById('monthlist');
	var month = monthlist.selectedIndex;

	var daylist = document.getElementById('daylist');
	var day = daylist.label;
	// date  check --- if day is less than month; then set it to proper value
	var yearlist = document.getElementById('yearlist');
	var year = yearlist.label;
	day = reminderfox.date.getValidDateForMonth(year, month, day);

	var date = new Date(year, month, day);
	updateRepeatingList(date, reminderFoxEvent);

	if(reminderFoxEvent.location != null) {
		var locationText = document.getElementById("location");
		locationText.setAttribute('value', reminderFoxEvent.location);
	}

	if(reminderFoxEvent.url != null) {
		var urlText = document.getElementById("url");
		urlText.setAttribute('value', reminderFoxEvent.url);
	}

	// set focus - have to do in settimeout so onload finishes first
	setTimeout(function() {
		document.getElementById('newReminderText').focus();
	}, 0);
}

function calculateEndTimeOffset() {
	var startDate = getStartDate();
	var endDate = getEndDate();

	var endDateTime = endDate.getTime();
	var startDateTime = startDate.getTime();
	if(endDateTime < startDateTime) {
		endDateTime = startDateTime;
	}

	var endDateTimeOffset = endDateTime - startDateTime;

	// get minutes from milliseconds:   1000 ms / 60 seconds = mins
	endDateMinutesOffset = endDateTimeOffset / (1000 * 60);
}

function reminderFox_updateTime(date, isEndDate) {
	var hours = date.getHours();
	var AMorPM = reminderfox.string("rf.add.time.PM");

	var use24HourTime = reminderfox.core.getPreferenceValue(reminderfox.consts.USE_24_HOUR_TIME, false);
	if(use24HourTime) {
		AMorPM = "";
		if(hours < 10) {
			hours = "0" + hours;
		}
	}

	if(AMorPM != "") {
		if(hours < 12) {
			AMorPM = reminderfox.string("rf.add.time.AM");
		}
		if(hours == 0) {
			hours = 12;
		}
		if(hours >= 13) {
			hours = hours - 12;
		}
	}

	var minutes = date.getMinutes();
	if(minutes < 10) {
		minutes = "0" + minutes;
	}
	var timeList = null;
	if(isEndDate) {
		timeList = document.getElementById("reminderFox-endTimeList");
	} else {
		timeList = document.getElementById("reminderFox-timeList");
	}

	var timeString = hours + reminderfox.string("rf.add.time.delimiter") + minutes;
	if(AMorPM != "") {
		timeString = timeString + " " + AMorPM;
	}
	timeList.label = timeString;
}

function markFieldsReadonly() {
	var windowParent = document.getElementById("moreOptionsVbox").parentNode;
	recurseDisable(windowParent);

	document.getElementById("moreReminderItems").removeAttribute("disabled");
	// you can open the More>> items
	document.getElementById("rf-event-cancel").removeAttribute("disabled");
	// you can cancel
	document.getElementById("launchUrlButton").removeAttribute("disabled");
	// and launch location button
	document.getElementById("launchLocationButton").removeAttribute("disabled");
	// and launch url button

	// for description, notes, location, and url - remove disabled and set to read-only so you can copy the text
	document.getElementById("newReminderText").removeAttribute("disabled");
	document.getElementById("notesText").removeAttribute("disabled");
	document.getElementById("url").removeAttribute("disabled");
	document.getElementById("location").removeAttribute("disabled");

	document.getElementById("newReminderText").setAttribute("readonly", true);
	document.getElementById("notesText").setAttribute("readonly", true);
	document.getElementById("url").setAttribute("readonly", true);
	document.getElementById("location").setAttribute("readonly", true);
}

function recurseDisable(node) {
	for(var i = 0; i < node.childNodes.length; i++) {
		var child = node.childNodes[i];
		if(child != null) {
			try {
				// ignore labels
				if(child.nodeName != "label") {
					child.setAttribute("disabled", true);
					recurseDisable(child);
				}
			} catch ( e ) {
			}
		}
	}
}

function reminderFox_handleTodoDate() {
	if(isDateEnabled()) {
		document.getElementById("monthlist").removeAttribute("disabled");
		document.getElementById("daylist").removeAttribute("disabled");
		document.getElementById("yearlist").removeAttribute("disabled");
		document.getElementById("reminderFox-timeList").removeAttribute("disabled");
		document.getElementById("endmonthlist").removeAttribute("disabled");
		document.getElementById("enddaylist").removeAttribute("disabled");
		document.getElementById("endyearlist").removeAttribute("disabled");
		document.getElementById("reminderFox-endTimeList").removeAttribute("disabled");
		document.getElementById("reminderFox-all-day").removeAttribute("disabled");
		document.getElementById("reminderFox-alert").removeAttribute("disabled");
		document.getElementById("reminderFox-alertTime").removeAttribute("disabled");
		document.getElementById('reminderFox-alertTimeUnits').removeAttribute("disabled");
		document.getElementById('reminderFox-alertInfo').removeAttribute("disabled");
		document.getElementById('datepickerAnchor').removeAttribute("disabled");
		document.getElementById('datepickerEndAnchor').removeAttribute("disabled");
		document.getElementById('reminderFox-repeatList').removeAttribute("disabled");
		document.getElementById('reminderFox-repeat').removeAttribute("disabled");

		reminderFox_allDayChanged();
		reminderFox_alertChanged();
		reminderFox_repeatChanged();
	} else {
		document.getElementById("monthlist").setAttribute("disabled", "true");
		document.getElementById("daylist").setAttribute("disabled", "true");
		document.getElementById("yearlist").setAttribute("disabled", "true");
		document.getElementById("reminderFox-timeList").setAttribute("disabled", "true");
		document.getElementById("endmonthlist").setAttribute("disabled", "true");
		document.getElementById("enddaylist").setAttribute("disabled", "true");
		document.getElementById("endyearlist").setAttribute("disabled", "true");
		document.getElementById("reminderFox-endTimeList").setAttribute("disabled", "true");
		document.getElementById("reminderFox-all-day").setAttribute("disabled", "true");
		document.getElementById("reminderFox-alert").setAttribute("disabled", "true");
		document.getElementById("reminderFox-alertTime").setAttribute("disabled", "true");
		document.getElementById('reminderFox-alertTimeUnits').setAttribute("disabled", "true");
		document.getElementById('reminderFox-alertInfo').setAttribute("disabled", "true");
		document.getElementById('datepickerAnchor').setAttribute("disabled", "true");
		document.getElementById('datepickerEndAnchor').setAttribute("disabled", "true");
		document.getElementById('reminderFox-repeatList').setAttribute("disabled", "true");
		document.getElementById('reminderFox-repeat').setAttribute("disabled", "true");
	}
	updateDateDescriptionLabel();
}

function saveEvent(reminderfoxEvent) {
	if(isDateEnabled()) {
		var success = reminderFox_saveDates(reminderfoxEvent);
		if(!success) {
			return false;
		}
	}

	var desc = document.getElementById("newReminderText");
	reminderfoxEvent.summary = desc.value;

	var important = document.getElementById("important");
	var importantVal = important.getAttribute("checked");
	if(importantVal == true || importantVal == "true") {
		reminderfoxEvent.priority = reminderfox.consts.PRIORITY_IMPORTANT;
	} else {
		reminderfoxEvent.priority = reminderfox.consts.PRIORITY_NORMAL;
	}

	var notesText = document.getElementById("notesText");
	var notes = notesText.value;
	if(notes != null) {
		notes = reminderfox.util.trim(notes);
		if(notes != "") {
			reminderfoxEvent.notes = notes;
		} else {
			reminderfoxEvent.notes = null;
		}
	}

	var cats = document.getElementById("inputRmCategories");
	if(desc.value != "") {
		reminderfoxEvent.categories = reminderfox.category.Clean(cats.value);
	} else {
		reminderfoxEvent.categories = null;
	}

//gWEditing
	var showInTooltip = document.getElementById("showInTooltip");
	if (showInTooltip != null)
	if(showInTooltip.getAttribute( "checked") == true) {
		reminderFoxEvent.showInTooltip = true;
	}

	saveMoreOptions(reminderfoxEvent);

	if(isDateEnabled()) {
		//		var success = reminderFox_saveDates(reminderfoxEvent);
		//		if ( !success ) {
		//			return false;
		//		}

		// Check if the date span (end-start date) is greater the repeat interval
		if (saveEventRepeat(reminderfoxEvent)) {

			var msg = reminderfox.string("rf.add.datespan.overlapping");
			reminderfox.util.PromptAlert (msg);
		//	return false
		}

		var showAlert = document.getElementById("reminderFox-alert");
		var alertVal = showAlert.getAttribute("checked");
		if(alertVal == true || alertVal == "true") {
			var alertTime = document.getElementById("reminderFox-alertTime");
			var alertTimeVal = alertTime.label;

			if(reminderfox.util.isInteger(alertTimeVal)) {
				var timeUnitsList = document.getElementById('reminderFox-alertTimeUnits');
				var timeSelected = timeUnitsList.selectedIndex;
				if(timeSelected == 0) {
					reminderfoxEvent.alarm = "-PT" + alertTimeVal + "M";
				} else if(timeSelected == 1) {
					reminderfoxEvent.alarm = "-PT" + alertTimeVal + "H";
				} else if(timeSelected == 2) {
					reminderfoxEvent.alarm = "-P" + alertTimeVal + "D";
				}
			}
		} else {
			reminderfoxEvent.alarm = null;
		}
	} else {
		reminderfoxEvent.date = null;
		reminderfoxEvent.endDate = null;
		reminderfoxEvent.alarm = null;
		reminderfoxEvent.recurrence.type = null;
	}

//calDAV
	var reminderListChooser= document.getElementById("reminderListChooser");
//console.log("//gW ####    reminderListChooser   ++++++ check for ListID/ List Name");

	if (reminderListChooser != null) {
		if (reminderListChooser.selectedItem.attributes['ID'].value != ""){
			reminderfoxEvent.calDAVid = reminderListChooser.selectedItem.attributes['ID'].value;  // $[1] = [string] "R"
		}
		reminderfoxEvent['List-ID'] = reminderListChooser.selectedItem.id;
	}
	return true;
}


function getDateFromUI(date) {
	var monthlist = document.getElementById('monthlist');
	var currentMonth = monthlist.selectedIndex;
	var daylist = document.getElementById('daylist');
	var currentDay = daylist.label;
	var yearlist = document.getElementById('yearlist');
	var currentYear = yearlist.label;

	if(date == null) {
		date = new Date(currentYear, currentMonth, currentDay);
	} else {
		if(date.getFullYear() != currentYear || date.getMonth() != currentMonth || date.getDate() != currentDay) {

			if(!reminderfox.util.isInteger(currentDay)) {
				currentDay = date.getDate();
			}
			if(!reminderfox.util.isInteger(currentYear)) {
				currentYear = date.getFullYear();
			}
			date = new Date(currentYear, currentMonth, currentDay);
		}
	}
	return date;
}

function rmFx_notesAddDateNtime(op) {
	var notesText = document.getElementById("notesText");
	if(notesText.getAttribute("focused") != "true") {
		return;
	}

	// OK the 'Notes' has focus ... go to add d/t
	var start = notesText.selectionStart;
	var end = notesText.textLength;
	var thisDT = reminderfox.date.parseDateTimes();

	notesText.value = notesText.value.substring(0, start) + "[" + thisDT + "]  " + notesText.value.substring(start, end);
	notesText.setSelectionRange(start + thisDT.length +3, start + thisDT.length + 4);
}

function innerClicked(timeEntry) {
	reminderFox_innerTimeClicked = true;
	var timeLabel = timeEntry.getAttribute("label");

	var timeList = timeEntry.parentNode.parentNode.parentNode.parentNode;
	//var timeList = document.getElementById("reminderFox-timeList");
	timeList.label = timeLabel;

	if(timeList.getAttribute("id") == "reminderFox-endTimeList") {
		reminderFox_timeChanged(true);
	} else {
		reminderFox_timeChanged(false);
	}

	reminderFox_updateDateFromTimeClick();

}

function reminderFox_updateDateFromTimeClick() {
	if(reminderfox.datePicker.gSelectedDate != null) {
		var timeList = document.getElementById("reminderFox-timeList");
		var time = timeList.label;
		var startindex = time.indexOf(reminderfox.string("rf.add.time.delimiter"));
		// look for some other common delimiters...
		if(startindex == -1) {
			startindex = time.indexOf(":");
			if(startindex == -1) {
				startindex = time.indexOf(".");
				if(startindex == -1) {
					startindex = time.indexOf("h");
				}
			}
		}
		if(startindex != -1) {
			try {
				var hoursString = time.substring(0, startindex);
				if(hoursString.length == 2 && hoursString.indexOf("0") == 0) {
					hoursString = hoursString.substring(1);
				}
				var hours = parseInt(hoursString);
				var minutes = time.substring(startindex + 1, startindex + 3);
				// now trim remainder
				var remainder = time.substring(startindex + 3, time.length);
				if(remainder != "") {
					remainder = reminderfox.util.trim(remainder);
					var AMorPM = remainder;
					if(AMorPM.toUpperCase() == reminderfox.string("rf.add.time.PM").toUpperCase()) {
						if(hours != 12) {
							hours = hours + 12;
						}
					} else {
						if(hours == 12) {
							hours = 0;
						}
					}
				}
				if(reminderfox.util.isInteger(hours + "") && reminderfox.util.isInteger(minutes)) {
					reminderfox.datePicker.gSelectedDate.setHours(hours, minutes);
					reminderFox_updateSnoozeTimeDate();
				}
			} catch( e ) {
			}
		}
	}
}

function reminderFox_timeChanged(isEndDate) {
	if(isEndDate) {
		// set new end date offset
		calculateEndTimeOffset();
	} else {
		// start date has changed; set new end date based on offset
		updateEndDateWithOffset();
	}
}

function reminderFox_timeClicked(timeEntry) {
	if(!reminderFox_innerTimeClicked) {
		var id = timeEntry.getAttribute("id");
		var timeLabel = timeEntry.getAttribute("label");

		var timeList = timeEntry.parentNode.parentNode;
		timeList.label = timeLabel;

		var popup = timeEntry.parentNode;
		popup.hidePopup();

		if(timeList.getAttribute("id") == "reminderFox-endTimeList") {
			// set new end date offset
			calculateEndTimeOffset();
		} else {
			// start date has changed; set new end date based on offset
			updateEndDateWithOffset();
		}

		reminderFox_updateDateFromTimeClick();
	} else {
		reminderFox_innerTimeClicked = false;
	}
}

function onTimePopupOpen(menupopup) {
	var timeParentMenu = menupopup.parentNode;
	var originalTime = timeParentMenu.getAttribute("label");

	if(menupopup.hasChildNodes()) {
		// nodes have already been populated
		return;
	}

	// add sub context menu times
	// the first is the current default
	var menuItem = document.createElement("menuitem");
	menuItem.setAttribute("label", originalTime);
//fx	menuItem.setAttribute("onclick", "innerClicked(this);");
	menuItem.addEventListener("click", function() {innerClicked(this);},false);
	menupopup.appendChild(menuItem);

	// now look for last "00" and replace with 15, 30, 45 increments
	var zeroIndex = originalTime.lastIndexOf("00");
	var timeIncrement = originalTime.substring(0, zeroIndex) + "15" + originalTime.substring(zeroIndex + "00".length, originalTime.length);
	menuItem = document.createElement("menuitem");
	menuItem.setAttribute("label", timeIncrement);
//fx	menuItem.setAttribute("onclick", "innerClicked(this);");
	menuItem.addEventListener("click", function() {innerClicked(this);},false);

	menupopup.appendChild(menuItem);
	timeIncrement = originalTime.substring(0, zeroIndex) + "30" + originalTime.substring(zeroIndex + "00".length, originalTime.length);
	menuItem = document.createElement("menuitem");
	menuItem.setAttribute("label", timeIncrement);
//fx	menuItem.setAttribute("onclick", "innerClicked(this);");
	menuItem.addEventListener("click", function() {innerClicked(this);},false);

	menupopup.appendChild(menuItem);
	timeIncrement = originalTime.substring(0, zeroIndex) + "45" + originalTime.substring(zeroIndex + "00".length, originalTime.length);
	menuItem = document.createElement("menuitem");
	menuItem.setAttribute("label", timeIncrement);
//fx	menuItem.setAttribute("onclick", "innerClicked(this);");
	menuItem.addEventListener("click", function() {innerClicked(this);},false);

	menupopup.appendChild(menuItem);
}

function reminderFox_saveDates(reminderfoxEvent) {

	var ret_Success = true;
	// start date
	var monthlist = document.getElementById('monthlist');
	var currentMonth = monthlist.selectedIndex;
	var daylist = document.getElementById('daylist');
	var currentDay = daylist.label;
	var yearlist = document.getElementById('yearlist');
	var currentYear = yearlist.label;
	if(reminderfoxEvent.date == null) {
		reminderfoxEvent.date = new Date(currentYear, currentMonth, currentDay);
	} else {
		if(reminderfoxEvent.date.getFullYear() != currentYear || reminderfoxEvent.date.getMonth() != currentMonth || reminderfoxEvent.date.getDate() != currentDay) {

			if(!reminderfox.util.isInteger(currentDay)) {
				currentDay = reminderfoxEvent.date.getDate();
			}
			if(!reminderfox.util.isInteger(currentYear)) {
				currentYear = reminderfoxEvent.date.getFullYear();
			}
			reminderfoxEvent.date = new Date(currentYear, currentMonth, currentDay);
		}
	}

	// end date
	monthlist = document.getElementById('endmonthlist');
	currentMonth = monthlist.selectedIndex;
	daylist = document.getElementById('enddaylist');
	currentDay = daylist.label;
	yearlist = document.getElementById('endyearlist');
	currentYear = yearlist.label;

	if(reminderfoxEvent.endDate == null) {
		reminderfoxEvent.endDate = new Date(currentYear, currentMonth, currentDay);
	} else {
		if(reminderfoxEvent.endDate.getFullYear() != currentYear || reminderfoxEvent.endDate.getMonth() != currentMonth || reminderfoxEvent.endDate.getDate() != currentDay) {

			if(!reminderfox.util.isInteger(currentDay)) {
				currentDay = reminderfoxEvent.endDate.getDate();
			}
			if(!reminderfox.util.isInteger(currentYear)) {
				currentYear = reminderfoxEvent.endDate.getFullYear();
			}
			reminderfoxEvent.endDate = new Date(currentYear, currentMonth, currentDay);
		}
	}

	var allDay = document.getElementById("reminderFox-all-day");
	if(allDay.getAttribute("checked") == false || allDay.getAttribute("checked") == "false") {
		try {
			var timeList = document.getElementById("reminderFox-timeList");
			var time = timeList.label;
			var startindex = time.indexOf(reminderfox.string("rf.add.time.delimiter"));
			// look for some other common delimiters...
			if(startindex == -1) {
				startindex = time.indexOf(":");
				if(startindex == -1) {
					startindex = time.indexOf(".");
					if(startindex == -1) {
						startindex = time.indexOf("h");
					}
				}
			}
			if(startindex != -1) {
				try {
					var hoursString = time.substring(0, startindex);
					if(hoursString.length == 2 && hoursString.indexOf("0") == 0) {
						hoursString = hoursString.substring(1);
					}
					var hours = parseInt(hoursString);
					var minutes = time.substring(startindex + 1, startindex + 3);
					// now trim remainder
					var remainder = time.substring(startindex + 3, time.length);
					if(remainder != "") {
						remainder = reminderfox.util.trim(remainder);
						var AMorPM = remainder;
						if(AMorPM.toUpperCase() == reminderfox.string("rf.add.time.PM").toUpperCase()) {
							if(hours != 12) {
								hours = hours + 12;
							}
						} else {
							if(hours == 12) {
								hours = 0;
							}
						}
					}
					if(reminderfox.util.isInteger(hours + "") && reminderfox.util.isInteger(minutes)) {
						reminderfoxEvent.date.setHours(hours, minutes);
					}
				} catch ( e ) {
				}
			}

			// end date
			timeList = document.getElementById("reminderFox-endTimeList");
			time = timeList.label;
			startindex = time.indexOf(reminderfox.string("rf.add.time.delimiter"));
			// look for some other common delimiters...
			if(startindex == -1) {
				startindex = time.indexOf(":");
				if(startindex == -1) {
					startindex = time.indexOf(".");
					if(startindex == -1) {
						startindex = time.indexOf("h");
					}
				}
			}
			if(startindex != -1) {
				try {
					var hoursString = time.substring(0, startindex);
					if(hoursString.length == 2 && hoursString.indexOf("0") == 0) {
						hoursString = hoursString.substring(1);
					}
					var hours = parseInt(hoursString);
					var minutes = time.substring(startindex + 1, startindex + 3);
					// now trim remainder
					var remainder = time.substring(startindex + 3, time.length);
					if(remainder != "") {
						remainder = reminderfox.util.trim(remainder);
						var AMorPM = remainder;
						if(AMorPM.toUpperCase() == reminderfox.string("rf.add.time.PM").toUpperCase()) {
							if(hours != 12) {
								hours = hours + 12;
							}
						} else {
							if(hours == 12) {
								hours = 0;
							}
						}
					}
					if(reminderfox.util.isInteger(hours + "") && reminderfox.util.isInteger(minutes)) {
						reminderfoxEvent.endDate.setHours(hours, minutes);
					}
				} catch ( e ) {
				}
			}
			// end enddate

			reminderfoxEvent.allDayEvent = false;
		} catch( e ) {
		}

		// clear seconds to calculate duration
		reminderfoxEvent.date.setSeconds(0);
		reminderfoxEvent.endDate.setSeconds(0);
		reminderfoxEvent.date.setMilliseconds(0);
		reminderfoxEvent.endDate.setMilliseconds(0);
	} else {
		reminderfoxEvent.allDayEvent = true;

		// clear hours for all day events to calculate duration
		reminderfoxEvent.date.setHours(0);
		reminderfoxEvent.date.setMinutes(0);
		reminderfoxEvent.date.setSeconds(0);
		reminderfoxEvent.date.setMilliseconds(0);
		reminderfoxEvent.endDate.setHours(0);
		reminderfoxEvent.endDate.setMinutes(0);
		reminderfoxEvent.endDate.setSeconds(0);
		reminderfoxEvent.endDate.setMilliseconds(0);

		var endDate0 = reminderfoxEvent.endDate.getTime() + 1000;

		//  all day...  then add one day
		reminderfoxEvent.endDate.setDate(reminderfoxEvent.endDate.getDate() + 1);
	}

	reminderfoxEvent.durationTime = reminderfoxEvent.endDate.getTime() - reminderfoxEvent.date.getTime();

	var compare0 = ((endDate0 + 1000) < reminderfoxEvent.date.getTime());
	var compare1 = ((reminderfoxEvent.endDate.getTime() + 1000) < reminderfoxEvent.date.getTime());

	var compare = reminderfoxEvent.allDayEvent ? compare0 : compare1;
	// if end date is greater than start date, clear it
//	if((reminderfoxEvent.endDate.getTime() + 1000) < reminderfoxEvent.date.getTime()) {
	if(compare) {
	//	alert(reminderfox.string("rf.options.validation.endDate"));
		ret_Success = false;
		reminderfoxEvent.endDate = null;
		reminderfoxEvent.durationTime = null;
	}

	return ret_Success;

}

function updateEndDateWithOffset() {
	if(endDateMinutesOffset != null && endDateMinutesOffset >= 0) {
		var newEndDate = getStartDate();
		newEndDate.setMinutes(newEndDate.getMinutes() + endDateMinutesOffset);
		var allDay = document.getElementById("reminderFox-all-day");
		var allDayVal = allDay.getAttribute("checked");
		if(allDayVal == true || allDayVal == "true") {
			// if it's all day...  then subtract one day
			newEndDate.setDate(newEndDate.getDate() - 1);
		}

		reminderFox_optionsSetNewReminderDate(newEndDate, true, true);
	}
}

function getStartDate() {
	// start date
	var monthlist = document.getElementById('monthlist');
	var currentMonth = monthlist.selectedIndex;
	var daylist = document.getElementById('daylist');
	var currentDay = daylist.label;
	var yearlist = document.getElementById('yearlist');
	var currentYear = yearlist.label;
	var startDate = new Date(currentYear, currentMonth, currentDay);

	var allDay = document.getElementById("reminderFox-all-day");
	if(allDay.getAttribute("checked") == false || allDay.getAttribute("checked") == "false") {
		try {
			var timeList = document.getElementById("reminderFox-timeList");
			var time = timeList.label;
			var startindex = time.indexOf(reminderfox.string("rf.add.time.delimiter"));
			// look for some other common delimiters...
			if(startindex == -1) {
				startindex = time.indexOf(":");
				if(startindex == -1) {
					startindex = time.indexOf(".");
					if(startindex == -1) {
						startindex = time.indexOf("h");
					}
				}
			}
			if(startindex != -1) {
				try {
					var hoursString = time.substring(0, startindex);
					if(hoursString.length == 2 && hoursString.indexOf("0") == 0) {
						hoursString = hoursString.substring(1);
					}
					var hours = parseInt(hoursString);
					var minutes = time.substring(startindex + 1, startindex + 3);
					// now trim remainder
					var remainder = time.substring(startindex + 3, time.length);
					if(remainder != "") {
						remainder = reminderfox.util.trim(remainder);
						var AMorPM = remainder;
						if(AMorPM.toUpperCase() == reminderfox.string("rf.add.time.PM").toUpperCase()) {
							if(hours != 12) {
								hours = hours + 12;
							}
						} else {
							if(hours == 12) {
								hours = 0;
							}
						}
					}
					if(reminderfox.util.isInteger(hours + "") && reminderfox.util.isInteger(minutes)) {
						startDate.setHours(hours, minutes);
					}
				} catch ( e ) {
				}
			}
		} catch( e ) {
		}
	}
	return startDate;
}

function getEndDate() {
	// end date
	var monthlist = document.getElementById('endmonthlist');
	var currentMonth = monthlist.selectedIndex;
	var daylist = document.getElementById('enddaylist');
	var currentDay = daylist.label;
	var yearlist = document.getElementById('endyearlist');
	var currentYear = yearlist.label;
	var endDate = new Date(currentYear, currentMonth, currentDay);

	var allDay = document.getElementById("reminderFox-all-day");
	if(allDay.getAttribute("checked") == false || allDay.getAttribute("checked") == "false") {
		try {
			var timeList = document.getElementById("reminderFox-timeList");
			var time = timeList.label;
			var startindex = time.indexOf(reminderfox.string("rf.add.time.delimiter"));

			// end date
			var timeList = document.getElementById("reminderFox-endTimeList");
			var time = timeList.label;
			var startindex = time.indexOf(reminderfox.string("rf.add.time.delimiter"));
			// look for some other common delimiters...
			if(startindex == -1) {
				startindex = time.indexOf(":");
				if(startindex == -1) {
					startindex = time.indexOf(".");
					if(startindex == -1) {
						startindex = time.indexOf("h");
					}
				}
			}
			if(startindex != -1) {
				try {
					var hoursString = time.substring(0, startindex);
					if(hoursString.length == 2 && hoursString.indexOf("0") == 0) {
						hoursString = hoursString.substring(1);
					}
					var hours = parseInt(hoursString);
					var minutes = time.substring(startindex + 1, startindex + 3);
					// now trim remainder
					var remainder = time.substring(startindex + 3, time.length);
					if(remainder != "") {
						remainder = reminderfox.util.trim(remainder);
						var AMorPM = remainder;
						if(AMorPM.toUpperCase() == reminderfox.string("rf.add.time.PM").toUpperCase()) {
							if(hours != 12) {
								hours = hours + 12;
							}
						} else {
							if(hours == 12) {
								hours = 0;
							}
						}
					}
					if(reminderfox.util.isInteger(hours + "") && reminderfox.util.isInteger(minutes)) {
						endDate.setHours(hours, minutes);
					}
				} catch ( e ) {
				}
			}
			// end enddate
		} catch( e ) {
		}
	} else {
		//  all day...  then add one day
		endDate.setDate(endDate.getDate() + 1);
	}
	return endDate;
}

function dateToolTip(tooltipItem, isEnd) {
	while(tooltipItem.hasChildNodes()) {
		tooltipItem.removeChild(tooltipItem.firstChild);
	}

	var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
	if(_dateVariableString.indexOf("longDay" == -1 && _dateVariableString.indexOf("shortDay") == -1)) {
		_dateVariableString = "[longDay], " + _dateVariableString;
	}
	var date = null;
	if(isEnd) {
		date = getEndDate();

		var allDay = document.getElementById("reminderFox-all-day");
		var allDayVal = allDay.getAttribute("checked");
		if(allDayVal == true || allDayVal == "true") {
			// if it's all day...  then subtract one day for end date
			date.setDate(date.getDate() - 1);
		}
	} else {
		date = getStartDate();
	}
	var dateString = reminderfox.date.getDateVariable(null, date, _dateVariableString);
	var title = document.createElement("description");
	title.setAttribute("value", dateString);
	tooltipItem.appendChild(title);

	return true;
}

function updateDateDescriptionLabel() {
	var reminderDateDesc = document.getElementById("reminderDateDesc");
	if(reminderDateDesc != null) {
		// if a ToDo with date disabled... then show an empty string
		var todoDateCheckbox = document.getElementById("todoDateCheckbox");
		if(todoDateCheckbox != null) {
			var dateEnabled = todoDateCheckbox.getAttribute("checked");
			if(dateEnabled != true && dateEnabled != "true") {
				reminderDateDesc.setAttribute("value", "");
				return;
			}
		}

		var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
		if(_dateVariableString.indexOf("longDay") == -1 && _dateVariableString.indexOf("shortDay") == -1) {
			_dateVariableString = "[longDay], " + _dateVariableString;
		}
		var date = getStartDate();
		var dateString = reminderfox.date.getDateVariable(null, date, _dateVariableString);
		reminderDateDesc.setAttribute("value", dateString);
	}
}
