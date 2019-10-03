if (Cu === undefined)  var Cu = Components.utils;
if (Ci === undefined)  var Ci = Components.interfaces;
if (Cc === undefined)  var Cc = Components.classes;

Cu.import("resource://gre/modules/Services.jsm");


if (!reminderfox)     var reminderfox = {};
if (!reminderfox.date)    reminderfox.date = {};
if (!reminderfox.util)    reminderfox.util = {};
if (!reminderfox.calDAV)    reminderfox.calDAV = {};

reminderfox.calDAV.colorMap = [];
reminderfox.calDAV.pendingReminders = false;

if(!reminderfox.msgnr) reminderfox.msgnr = {};
if (!reminderfox.msgnr.name) reminderfox.msgnr.name = "";

// ***************** String handling ****************

if (!rmFXstrings)  var rmFXstrings = Services.strings.createBundle("chrome://reminderfox/locale/reminderfox.properties");

reminderfox.string= function(bString){
    try {
      return rmFXstrings.GetStringFromName(bString);
    } catch (e) {
        reminderfox.util.Logger('Alert', "RmFX string bundle error : " + bString + "\n" + e);
        return bString;
    }
};


// ***************** Reminderfox date functions    .date.  <<<<<<<<<<<<<<<<<<<<<
reminderfox.date.num2 = function(n){
	var s = "" + n;
	return(s[1] ? s : "0"+s[0]);
};


/**
 *   build different date/time formats used with normal mail messages
 *    @param [object]  Date
 *    @param [string]  "mailDate"   -->  Fri, 06 Jun 2008 23:47:53 +0200
 *                     "mailHeader" -->  Fri Jun 13 20:37:33 2008
 */
reminderfox.date.mailDateTime= function(thisdate, format){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var s;
	var sDaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	var sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var offset = thisdate.getTimezoneOffset();

	if (format == "mailDate") { //Fri, 06 Jun 2008 23:47:53 +0200
		s = sDaysOfWeek[thisdate.getDay()] + ", ";
		s += thisdate.getDate() + " ";
		s += sMonths[thisdate.getMonth()] + " ";
		s += thisdate.getFullYear() + " ";

		s += reminderfox.date.num2(thisdate.getHours()) + ":";
		s += reminderfox.date.num2(thisdate.getMinutes()) + ":";
		s += reminderfox.date.num2(thisdate.getSeconds()) + " ";
		if (offset < 0) {
			offset *= -1;
			s += "+";
		}
		else
			s += "-";

		s += reminderfox.date.num2(Math.floor(offset / 60));
		s += reminderfox.date.num2(Math.floor(offset % 60));
	}

	if (format == "mailHeader") { //Fri Jun 13 20:37:33 2008
		s = sDaysOfWeek[thisdate.getDay()] + " ";
		s += sMonths[thisdate.getMonth()] + " ";
		s += thisdate.getDate() + " ";

		s += reminderfox.date.num2(thisdate.getHours()) + ":";
		s += reminderfox.date.num2(thisdate.getMinutes()) + ":";
		s += reminderfox.date.num2(thisdate.getSeconds()) + " ";

		s += thisdate.getFullYear() + " ";
	}
	return s;
};


/**
 *   Format Time for ReminderFox based on Options setting
 * @param  [object]  date
 * @return [string]  time string based on reminderfox.consts.USE_24_HOUR_TIME)
  */
reminderfox.date.getTimeString= function (date){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var timeString = null;
	try {
		var hours = date.getHours();
		var AMorPM;
		var use24HourTime= reminderfox.core.getPreferenceValue(reminderfox.consts.USE_24_HOUR_TIME, false);

		if (use24HourTime) {
			AMorPM = "";
			if (hours < 10) {
				hours = "0" + hours;
			}
		}
		else {
			AMorPM = reminderfox.string("rf.add.time.PM");
			if (AMorPM !== "") {
				if (hours < 12) {
					AMorPM = reminderfox.string("rf.add.time.AM");
				}
				if (hours === 0) {
					hours = 12;
				}
				if (hours >= 13) {
					hours = hours - 12;
				}
			}
		}
		var minutes = date.getMinutes();
		if (minutes < 10) {
			minutes = "0" + minutes;
		}

		timeString = hours + reminderfox.string("rf.add.time.delimiter") + minutes;
		if (AMorPM !== "") {
			timeString = timeString + " " + AMorPM;
		}
	}
	catch (e) {
	}
	return timeString;
};


/**
 * Adjust a date/time string to local timezone
 * @param {Object} eventDateString
 * @param {Object} fullDateString
 * @param {Object} reminderDate
 */
reminderfox.date.adjustTimeZones= function (eventDateString, fullDateString, reminderDate){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// if event is stored in UTC time (20051208T224616Z), then take into account UTC offset for the
	// current time
	var tzOffset;
	if (eventDateString.length > 15 && eventDateString.charAt(15) == "Z") {
		tzOffset = new Date(reminderDate.getFullYear(), reminderDate.getMonth(), reminderDate.getDate()).getTimezoneOffset();
		reminderDate.setMinutes(reminderDate.getMinutes() - tzOffset);
	}
	else {
		// if date contains a Timezone in its specification, handle it :
		// DTSTART;TZID=US/Pacific:20071007T100000
		// With importing we have parsed from VTIMEZONE block and stored
		// the actual offset (with respect to Standard and Daylight settings).

		var timezoneIndex = fullDateString.indexOf(";TZID=");
		if (timezoneIndex != -1) {
			var endIndex = fullDateString.indexOf(':', timezoneIndex);
			var timezone = fullDateString.substring(timezoneIndex + ";TZID=".length, endIndex);
			timezone = reminderfox.util.trim(timezone.toUpperCase());
			var offset = reminderfox.core.reminderFox_timezones[timezone];

			// adjust for actual time
			// if don't have the 'timezone' stored before .. bad luck, do nothing.
			if (offset) {
				tzOffset = new Date().getTimezoneOffset();
				reminderDate.setMinutes(reminderDate.getMinutes() - (tzOffset + offset));
			}
		}
	}
};


 function offsetDST(t) { //t is the date object to check, returns true if daylight saving time is in effect.
	var jan = new Date(t.getFullYear(),0,1);
	var jul = new Date(t.getFullYear(),6,1);

	var offset = 0;
	if (Math.min(jan.getTimezoneOffset(),jul.getTimezoneOffset()) == t.getTimezoneOffset()) {
		offset = jan.getTimezoneOffset() - jul.getTimezoneOffset();
	}
	return offset;
}


/*
 *   ICS/ISO8601 dateTime string like with DTSTART  20180325, 20180325T030000 or 20180325T030000Z
 *   is converted to a locale new Date object with respect to timezone and DST
 *
 *   @param  string  ICS/ISO8601 string
 *   @param  string  optional current timezone
 *   @return object  local dateTime
 */
reminderfox.date.getDTZfromICSstring= function (eventDate, timezoneId){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var Z = '';
	if (eventDate.length > 0){
		Z = eventDate.charAt(eventDate.length-1) == 'Z' ? 'Z' : '';
	}

	var dtString = eventDate.substring(0, 4) +'-' + eventDate.substring(4, 6) +'-'+ eventDate.substring(6, 8);
	dtString += (eventDate.length > 8) ? ('T'+ eventDate.substring(9, 11) +':'+ eventDate.substring(11, 13)) : "";

	if (eventDate.length > 8) {
		var sec = eventDate.substring(13,15);
		dtString += ((sec == 'Z') || (sec == '')) ? ":00" : (":"+sec);
	}
	var tzOffset = "";
	if (timezoneId && reminderfox.core.reminderFox_timezones[timezoneId] ) {
		var dt0 = new Date(Date.parse(dtString + Z));
		tzOffset = (offsetDST(dt0) > 0) ?
			reminderfox.core.reminderFox_timezones[timezoneId]['daylightOffset'] :
			reminderfox.core.reminderFox_timezones[timezoneId]['standardOffset'];
	}
	dtString += tzOffset;

	var dt = (Date.parse(dtString + Z));
	return new Date(dt);
};


/**
 *  Set ICS/ISO date/time string from Date object
 *  @param   Date object, if null use current date (new Date)
 *  @return  {string}  ICS/ISO8601 string  (TZD = Z)
 */
reminderfox.date.objDTtoStringICS= function(currentDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Date.parse(new Date())   --> 1522404404000
	// new Date(Date.parse(new Date())).toISOString() --> "2018-03-30T10:06:29.000Z"

	if (!currentDate) currentDate = new Date();
	return new Date(Date.parse(currentDate)).toISOString().replace(/-/g,"").replace(/:/g,"").substring(0,15)+"Z";

//	if (typeof(currentDate) == "string") currentDate = +currentDate;
//	if (typeof(currentDate) == "number") currentDate = new Date(currentDate);
//	return currentDate.toISOString().replace(/-/g,"").replace(/:/g,"").substring(0,15)+"Z"
};


/**
 * Get a Date with valid day, if calling 'date' isn't valid, sets day to last
 * valid day.
 * @param {number} year
 * @param {number} month
 * @param {number} date
 * @return {object} Date
 */
reminderfox.date.getValidDateForMonth= function (year, month, date){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var lastValidDate = date;

	var lastDayOfMonth = reminderfox.date.getLastDayOfMonth(year, month);
	if (date > lastDayOfMonth) {
		lastValidDate = lastDayOfMonth;
	}
	return lastValidDate;
};


/**
 *   Calculate the last day of a month
 *   @param   [integer] year
 *   @param   [integer] month
 *   @return  [integer] day of month
 */
reminderfox.date.getLastDayOfMonth= function( year, month) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var pastLastDate = new Date( year, month, 32);
	return 32 - pastLastDate.getDate();
};


/**
 *   Check Leap year
 *   @param [integer]  year
 *   @return [boolean]	leap year == true
 */
reminderfox.date.isLeapYear= function (year){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)) ? true : false;
};


/**
 * Calculate the weeknumber for a given date
 * @param {Object} currentDate
 * @return {number} weeknumber (1 .. 4, -1) Week of Month !!
 */
reminderfox.date.getWeekNumber= function (currentDate){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var reminderDate = currentDate.getDate();
	var numberOfDay = reminderDate / 7;
	var intvalue = parseInt(numberOfDay, 10);
	if (reminderDate % 7 === 0) {
		intvalue--;
	}
	var weekNumber = intvalue + 1; // 0-based index
	if (weekNumber == 5) {
		weekNumber = -1; // set to last week of month
	}
	return weekNumber;
};


/**
 *   Calculate the date of specific day in a week
 *
 * @param {Object} currentDate
 * @param {Object} dayNumber
 * @param {Object} weekNumber
 * @return  {object}  date
 */
reminderfox.date.getDateForSpecifiedWeekNumber= function (currentDate, dayNumber, weekNumber){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var weekNumberCalculation;

	var firstDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
	var firstDayOfMonth = firstDate.getDay();

	// calculate the date that the first day-of-week falls on (using the day of the first of the month)
	var compareCurrentDay = dayNumber + 1;
	var compareFirstDay = firstDayOfMonth + 1;
	if (compareCurrentDay < compareFirstDay) {
		compareCurrentDay = compareCurrentDay + 7;
	}
	var firstWeekDateVal = (compareCurrentDay - compareFirstDay) + 1;
	var finalDate;

	// we have the date that the first day-of-week falls on.  Now let's calculate the Nth day of week
	if (weekNumber == -1) { // last day of week of the month
		weekNumberCalculation = 5 - 1;
		finalDate = firstWeekDateVal + (weekNumberCalculation * 7);
		var lastDayOfMonth = reminderfox.date.getLastDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
		if (finalDate > lastDayOfMonth) {
			finalDate = finalDate - 7; // previous (4th) week must be the last week of this month
		}
	}
	else {
		weekNumberCalculation = weekNumber - 1;
		finalDate = firstWeekDateVal + (weekNumberCalculation * 7);
	}
	return finalDate;
};

/**
 *   Get 'locale' month string
 *   @param {number}  0 ..11
 *   @return {string}  month string from 'locale' bundle
 */
reminderfox.date.getMonthAsText= function (integerValue){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return reminderfox.string("rf.options.month." + integerValue + ".name");
};


/**
 *  Format a date using the RF prefs: "extensions.reminderFox.listDateLabel"
 *
 *   @param {object}
 *     null: use current date/time
 *     number:  as with msgHdr
 *     string:  yyyymmddTHHMMSS  or UTC  (ex: 20051208T224616  or  20051208T224616Z = UTC)
 *     object:  Date
 *   @return  [string]
 */
reminderfox.date.parseDateTimes= function (pDate, noTime) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var thisDate = new Date();

	if (typeof(pDate) == "number") thisDate.setTime(pDate);
	if (typeof(pDate) == "object") thisDate = pDate;
	if (typeof(pDate) == "string") thisDate = reminderfox.date.getDTZfromICSstring(pDate);

	var timeString = "";
	if (!noTime) timeString =  "  " + reminderfox.date.getTimeString(thisDate);

	var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
	return reminderfox.date.getDateVariable( null, thisDate, _dateVariableString) +
			timeString;
};


reminderfox.date.getDateVariableString= function(reminder, date) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return reminderfox.date.getDateVariable(reminder, date,
		reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT));
};

reminderfox.date.getDateVariable= function(reminder, date, variableDateString){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var reminderLabel = variableDateString;

	// Replace the [variables]
	var startBracketIndex = reminderLabel.indexOf("[");
	while (startBracketIndex != -1) {
		var endBracketIndex = reminderLabel.indexOf("]", startBracketIndex);
		if (endBracketIndex != -1) {
			// Check for a fishy [
			if (endBracketIndex - startBracketIndex < 3) {
				startBracketIndex = reminderLabel.indexOf("[", ++startBracketIndex);
			}
			else {
				var variable = reminderLabel.substring(startBracketIndex + 1, endBracketIndex);
				var decodedVariable = reminderfox.overlay.decodeReminderLabelVariable(reminder, variable, date);
				var decodedVariableLength = decodedVariable.length;
				var startTrim = startBracketIndex;
				var endTrim = endBracketIndex;
				if (variable == "time" && decodedVariableLength === 0) {
					// trim the () from around time if the time is empty (all-day event)
					if (reminderLabel.charAt(startBracketIndex - 1) == "(" &&
					reminderLabel.charAt(endBracketIndex + 1) == ")") {
						startTrim = startTrim - 1;
						endTrim = endTrim + 1;
					}
				}
				reminderLabel = reminderLabel.substring(0, startTrim) + decodedVariable + reminderLabel.substring(endTrim + 1, reminderLabel.length);
				startBracketIndex = reminderLabel.indexOf("[", startBracketIndex + decodedVariableLength);
			}
		}
	}

	return reminderLabel;
};
// ***************** Reminderfox date functions    .date.  >>>>>>>>>>>>>>>>>>>>>

/**
 *   Get Alarm String form reminder with snooze if relevant;
 */
reminderfox.date.alarmInfo= function(reminder){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var dateString, timeString;

	var tooltipText = "";
	if (reminder.snoozeTime) {
		var snoozeAlarmTime = reminder.snoozeTime;
		var index = snoozeAlarmTime.indexOf(';');
		if (index != -1) {
			snoozeAlarmTime = snoozeAlarmTime.substring(0, index);
		}
		var snoozedate = new Date(parseInt(snoozeAlarmTime, 10));
		dateString = reminderFox_getDateVariableString(reminder, snoozedate);
		timeString = reminderfox.date.getTimeString(snoozedate);

		tooltipText =  reminderfox.string("rf.alarm.list.tooltip.snooze") +
			" " + dateString + ", " + timeString + "\n";
	}
	else {
		// otherwise show when the next alarm is scheduled for...

		var newDate = new Date(reminder.date.getFullYear(), reminder.date.getMonth(),
			reminder.date.getDate(), reminder.date.getHours(), reminder.date.getMinutes());
		if (reminder.allDayEvent) {
			newDate.setHours(0, 0);
		}
		var mins = newDate.getMinutes();
		var alarmMinutes = reminderfox.core.getAlarmInMinutes(reminder, reminder.date);
		if (alarmMinutes) {
			newDate.setMinutes(mins - alarmMinutes);

			dateString = reminderFox_getDateVariableString(reminder, newDate);
			timeString = reminderfox.date.getTimeString(newDate);
			tooltipText =  reminderfox.string("rf.alarm.tooltip.text") +
					" " + dateString + ", " + timeString + "\n";
		}
	}
	if (reminder.alarm.charAt(reminder.alarm.length-1) != "Z")  {
		tooltipText += getAlarmTooltipText(reminder.alarm);
	}
	return tooltipText;
};


/**
 *   Get RRule String for reminder instance
 */
reminderfox.date.recurrenceString= function (reminder, currentDate) {
	var repeat = document.getElementById("reminderFox-repeat");
	if(repeat) {
		if(repeat.getAttribute("checked") !== true && repeat.getAttribute("checked") != "true") {
			return; // exit - no repeating option is selected
		}
	}

	var startingParens = "    (";
	var closingParens = ")";

	var reminderDay = reminder.date.getDay();
	var weekNumber = reminderfox.date.getWeekNumber(reminder.date);

	var val = "";

	// yearly
	if(reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY &&
			(reminder.recurrence.byDay ||
			(reminder.recurrence.interval && reminder.recurrence.interval > 0) ||
			reminder.recurrence.endDate)) {
		val = "Yearly";
		if (reminder.recurrence.interval > 1) val = startingParens + "Repeat every " + reminder.recurrence.interval + " year" + closingParens;
	}


	// yearly by day
	if(reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY_DAY &&
			(reminder.recurrence.byDay ||
			(reminder.recurrence.interval  && reminder.recurrence.interval > 0) ||
			reminder.recurrence.endDate)) {
		val = "Yearly";
		if (reminder.recurrence.interval > 1) val = "Repeat every " + reminder.recurrence.interval + " years";

		val += startingParens + getWeekName(weekNumber) +
			" " + getDayNames(reminder.recurrence.byDay, reminderDay) + " " + reminderfox.string("rf.options.weekof.name") +
			" " + reminderfox.string("rf.options.month."+ reminder.date.getMonth() + ".name") + closingParens;
	}


	// monthly by date
	var dateStr = reminderfox.string("rf.options.dateshort." + reminder.date.getDate() + ".name");

	if( reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE &&
			(reminder.recurrence.byDay ||
			(reminder.recurrence.interval  && reminder.recurrence.interval > 0) ||
			reminder.recurrence.endDate)) {
		val = "Monthly";
		if (reminder.recurrence.interval > 1) {
			val = "Repeat every " + reminder.recurrence.interval + " months";
			val += startingParens + dateStr + " " + reminderfox.string("rf.options.weekofmonth.name") + closingParens;
		}
	}


	// monthly by day
	if(reminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY &&			 (reminder.recurrence.byDay ||
			(reminder.recurrence.interval && reminder.recurrence.interval > 0) ||
			reminder.recurrence.endDate)) {
		val = "Monthly";
		if (reminder.recurrence.interval > 1) val = "Repeat every " + reminder.recurrence.interval + " months";

		val +=  startingParens + getWeekName(weekNumber) +
			" " + getDayNames(reminder.recurrence.byDay, reminderDay) +
			" " + reminderfox.string("rf.options.weekofmonth.name") + closingParens;
	}


	// weekly
	if(reminder.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY &&
			reminder.recurrence.interval) {// change label if it's a bi-weekly
		val = "Weekly";
		if (reminder.recurrence.interval > 2) val = "Repeat every " + reminder.recurrence.interval + " weeks";
		if (reminder.recurrence.interval == 2) val = "Bi-weekly";

		val += startingParens + ("On ") + " " + getDayNames(reminder.recurrence.byDay, reminderDay) + closingParens;
	}


	// daily
	if(reminder.recurrence.type == reminderfox.consts.RECURRENCE_DAILY &&
			(reminder.recurrence.byDay ||
			(reminder.recurrence.interval  && reminder.recurrence.interval > 1) ||
			reminder.recurrence.endDate)) {
		val = "Daily";
		if (reminder.recurrence.interval > 1) val = startingParens + " On " + reminder.recurrence.interval + " day" + closingParens;
	}


	if (reminder.recurrence.endDate) val += "\nRepeat until: " + reminder.recurrence.endDate.toLocaleDateString();	//$$$_locale
	if (reminder.recurrence.count)   val += "\nRepeat occurrences: " + reminder.recurrence.count;		//$$$_locale
	return val;


		function getDayNames(byday, dayNum) {
			if (!byday) return reminderfox.string("rf.options.day." + dayNum + ".name");

			var days = "";
			var sDay = "";
			var rfcWeekdays   = "SUMOTUWETHFRSA";

			var aByDay = byday.split(",");
			for (var n=0; n < aByDay.length; n++){
				var pos = rfcWeekdays.indexOf(aByDay[n]);
				if (pos === 0) {
					sDay = reminderfox.string("rf.options.day.0.name.Mmm");
				} else {
					sDay = reminderfox.string("rf.options.day." + (pos/2) + ".name.Mmm");
				}
				if (days === "") days = sDay;
				else
					days += ", " + sDay;
			}
			return days;
		}

		function getWeekName(weekNum) {
			if(weekNum == -1) {
				return reminderfox.string("rf.options.week.occurrence.5.name");
			} else {
				return reminderfox.string("rf.options.week.occurrence." + weekNum + ".name");
			}
		}
};



// *****************************************************************************
// ****************** Reminderfox Utilities    .util.    ***********************


/**
 * Remove an object2 from an object1 by name of object1
 * @param {object}  object1 .. the initial object
 * @param {string}  the name of the object to be removed
 * @return {object}
 */
reminderfox.util.removeObjectFromObject= function (allObjects, objName){
	var newObj = {};
	for (var obj in allObjects) {
		if (obj !== objName) {
			newObj[obj] = {};
			newObj[obj] =  allObjects[obj];
		}
	}
	return newObj;
};


/**
 * replace escaped commas with regular commas:
 * "Raleigh\, NC" --> "Raleigh, NC"
 */
reminderfox.util.unEscapeCommas= function(stringValue){
	return stringValue.replace(/\\,/g, ",");
};

/**
 * escape commas
 */
reminderfox.util.escapeCommas= function (stringValue){
	return (!stringValue) ? null : stringValue.replace(/,/g, "\\,");
};

reminderfox.util.escapeSemi= function (stringValue){
	return (!stringValue) ? null : stringValue.replace(/;/g, "\\;");
};


/**
 *   break for long lines   RFC 2445 sec 4.1
 */
reminderfox.util.foldLines= function(line, newline){
	// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var result = null;
	var LINE_LENGTH = 75;
	if (line.length <= LINE_LENGTH) {
		result = line + newline;
	}
	else {
		result = line.substring(0, LINE_LENGTH) + newline;
		var index = LINE_LENGTH;
		while ((index + LINE_LENGTH) < line.length) {
			result = result + " " + line.substring(index, index + LINE_LENGTH - 1) + newline; // -1, to account for prepended space
			index = index + LINE_LENGTH - 1;
		}
		result = result + " " + line.substring(index, line.length) + newline;
	}
	return result;
};


/**
 *  Pattern for folded lines: start with a whitespace character
 */
reminderfox.util.FOLDED = /^\s(.*)$/;


/**
 *  ICS lines are split so the max length is no more than 75.
 *  Splitted lines start with a whitespace character.
 *    @param   [string]  content the original ICS lines
 *    @return  [string]  the restored ICS data  (include 'null' lines !)
 */
reminderfox.util.unfoldLines= function (xcontent) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var lines = xcontent.replace(/\r\n/g, '\n').split('\n');
	var len = lines.length;
	for (var i = len - 1; i > 0; i--) {
		var matches = reminderfox.util.FOLDED.exec(lines[i]);
		if (matches) {
			lines[i - 1] += matches[1];
			lines[i] = '';
		}
	}
	return lines;
};


/**
 *   Remove blank lines from string array
 */
reminderfox.util.noBlankLines= function (s) {	// Remove blank lines
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var r = [];
	var l = s.length;
	for(var i=0;i<l;i++)
	if (s[i] !== "") {r.push(s[i]);}
	return r;
};


/**
 *   Split a string at newlines:   \n (Mac, *nix) or \r\n  (windows)
 *   and unfold lines for no loanger than 75 chars
 */
reminderfox.util.splitOnAllNewlinesAndUnfoldLines= function(input){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var uLines = reminderfox.util.unfoldLines(input);
	return reminderfox.util.noBlankLines(uLines);
};


reminderfox.util.findParentById= function (node, name1, name2){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var parentNode = node;
	while (parentNode) {
		if (parentNode.id == name1 || parentNode.id == name2) {
			return parentNode;
		}

		parentNode = parentNode.parentNode;
	}
	return parentNode;
};


// http://surf11.com/entry/157/javascript-isinteger-function
reminderfox.util.isInteger= function (s){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return (s.toString().search(/^-?[0-9]+$/) === 0);
};
reminderfox.util.isUnsignedInteger= function (s){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return (s.toString().search(/^[0-9]+$/) === 0);
};


reminderfox.util.mod= function (divisee, base){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return Math.round(divisee - (Math.floor(divisee / base) * base));
};

/**
 *   Trim functions:
 *    .trim      delete leading/trailing white spaces
 *    .trimAll   delete also multiple spaces in string
 */
reminderfox.util.trim= function (s){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return (!s) ? "" : (s.replace(/\s+$/,"").replace(/^\s+/,""));
};
reminderfox.util.trimAll= function (s){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return (!s) ? "" : (s.replace(/\s+/g," ").replace(/\s+$/,"").replace(/^\s+/,""));
};

/**
 *   Trim string to delete leading/trailing LF,
 *   replace other LF and white space with space
 */
reminderfox.util.cleanString= function (aString) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return aString.replace(/\n+$/,"").replace(/^\n+/,"").replace(/\xA0|\n/g, ' ');
};


/**
 * Convert a URL to a file path string
 *
 *  @param  {string}  url
 *  @return {string}  path for url
 */
reminderfox.util.urlToPath= function (aPath) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var rv = null;
	if (!aPath || !/^file:/.test(aPath))
		return rv;
	var ph = Cc["@mozilla.org/network/protocol;1?name=file"]
		.createInstance(Ci.nsIFileProtocolHandler);
	rv = ph.getFileFromURLSpec(aPath).path;
	return rv;
};


reminderfox.util.escapeHtml= function(s) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/'/g, '&#039;')
		.replace(/"/g, '&quot;')
		.replace(/\n/g, '<br />');
};

reminderfox.util.unEscapeHtml= function(s) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return s
		.replace(/&amp;/g, '&')
		/*--------------------------
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/'/g, '&#039;')
		.replace(/"/g, '&quot;')
		.replace(/\n/g, '<br />')
		----------*/
		;
};


/**
 *   Get the most recent window by it's 'id'
 *  @param {string}  getThisWindow
 *  @return {object} the window
 */
reminderfox.util.getWindow= function(getThisWindow){
	var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
	var windowManagerInterface = windowManager.QueryInterface(Ci.nsIWindowMediator);
	return windowManagerInterface.getMostRecentWindow(getThisWindow);
};


/**
 *    Lunches a URL link
 *    if not valid link then go with Google maps
 */
reminderfox.util.launchLink= function(urlText) {
	if (urlText  && urlText.value !== "") {
		var url = urlText;
		// if urlText starts with URL, use that
		if (url.indexOf( "http") !== 0)  {
			// otherwise use google maps
			url =  "http://maps.google.com/maps?q=" + url;
		}
		reminderfox.util.openURL(url);
	}
};


/*
 * Firefox           {ec8030f7-c20a-464f-9b0e-13a3a9e97384}
 * SeaMonkey         {92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}
 * Thunderbird       {3550f703-e582-4d05-9a08-453d09bdfdc6}
 *
 * Sunbird           {718e30fb-e89b-41dd-9da7-e25a45638b28}
 *
 * Nvu               {136c295a-4a5a-41cf-bf24-5cee526720d5}
 * Mozilla Suite     {86c18b42-e466-45a9-ae7a-9b95ba6f5640}
 * Netscape Browser  {3db10fab-e461-4c80-8b97-957ad5f8ea47}
 * Flock Browser     {a463f10c-3994-11da-9945-000d60ca027b}
 */
reminderfox.util.FIREFOX_ID     = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
reminderfox.util.SEAMONKEY_ID   = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
reminderfox.util.THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
reminderfox.util.SUNBIRD_ID     = "{718e30fb-e89b-41dd-9da7-e25a45638b28}";
reminderfox.util.LIGHTNING_ID   = "{e2fda1a4-762b-4020-b5ad-a41df1933103}";

/**
 *   Get the nsIXULAppInfo of the underlaying application
 *  @return {string}  appId
 */
reminderfox.util.appId= function(){
	var aID;
	if ("@mozilla.org/xre/app-info;1" in Cc) {
		// running under Mozilla 1.8 or later
		aID = Cc["@mozilla.org/xre/app-info;1"]
				.getService(Ci.nsIXULAppInfo).ID;
	}
	else {
		try {
			aID = Cc["@mozilla.org/preferences-service;1"]
					.getService(Ci.nsIPrefBranch).getCharPref("app.id");
		}
		catch (e) {
		}
	}
	return aID;
};


/**
 *   Check if a 'messenger' is the underlaying application
 *   @return {Boolean}
 */
reminderfox.util.messenger= function(){
	return (Cc["@mozilla.org/messenger/account-manager;1"]);
};


/**
 *   "Browse" for 'mail app' path and set in DOM
 *
 **/
reminderfox.util.mailAppStringBrowse= function(){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//	reminderfox.core.setPreferenceValue(reminderfox.consts.MAIL_PATH, "");
//	document.getElementById('mailApp.location.input').value = reminderfox.util.messengerApp().path;
	reminderfox.util.messengerApp();
	document.getElementById('mailApp.location.input').value = reminderfox.core.getPreferenceValue(reminderfox.consts.MAIL_PATH, "");
};


// --------- functions for TB,SM ... and 'non' mail (like FX)  ---------
/**
 * Get the  messenger apps location   <br>
 *  - first check prefs if already set   <br>
 *  - if host app isn't a messenger (TB/PB/SM) like FX
 *    lets the user browse for a valid messenger app
 *
 *    @return  [object]  file for location of 'messenger' application
 */
reminderfox.util.messengerApp= function(){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var fileValid = true;
	var mFile = null;

	reminderfox.core.setPreferenceValue(reminderfox.consts.MAIL_PATH, "");

	var mFileServ = Cc["@mozilla.org/file/directory_service;1"]
		.getService(Ci.nsIProperties);

	var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	// sets the default location for messenger app
	var appNameX = Cc["@mozilla.org/xre/app-info;1"];
	var appName = appNameX.getService(Ci.nsIXULAppInfo).name;
	var appID = appNameX.getService(Ci.nsIXULAppInfo).ID;

	var osInfo = reminderfox.core.opSystemInfo();

	if (reminderfox.util.messenger().valid) {
		mFile = mFileServ.get("CurProcD", Ci.nsIFile);

		if (osInfo.indexOf("WINNT") != -1) {
			mFile.append(appName + ".exe");
		}
		if (osInfo.indexOf("Linux") != -1) {
			mFile.append(appName.toLowerCase());
		}
		if (osInfo.indexOf("Darwin") != -1) {
			mFile = mFileServ.get("LocApp", Ci.nsIFile);
			mFile.append(appName + ".app");
		}
		mailApp= mFile.path;
	}

	fileValid= reminderfox.util.fileCheck(mailApp);

	if (fileValid != 1) { //1 = valid fileName  // mailApp / OS not valid, ask user
		//gW appPicker	2009-10-03  +++2do  change for application menu (see FX --> Options --> Applications)

		var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		var winTitle = "Select Mail/Messenger Application"; // this._prefsBundle.getString("fpTitleChooseApp");
		fp.init(window, winTitle, Ci.nsIFilePicker.modeOpen);
		fp.appendFilters(Ci.nsIFilePicker.filterApps);

		// Prompt the user to pick an app.  If picked a valid selection,
		// then set it for 'mailto' / 'messenger'

		if (fp.show() == Ci.nsIFilePicker.returnOK &&
			fp.file && reminderfox.util.isValidHandlerExecutable(fp.file)) {
			var handlerApp = reminderfox.util.getLocalHandlerApp(fp.file);
		}
		else {
			reminderfox.core.setPreferenceValue(reminderfox.consts.MAIL_PATH, "");
			return ""; // return file object
		}

		mailApp = fp.file.path;
		reminderfox.core.setPreferenceValue(reminderfox.consts.MAIL_PATH, mailApp);
		file.initWithPath(mailApp);
	}

	if (osInfo.indexOf("Darwin") != -1) {

		if (mailApp.toLowerCase().indexOf("-bin") == -1) {
			file.initWithPath(mailApp);

			file.append("Contents");
			file.append("MacOS");

			if (mailApp.toLowerCase().indexOf("thunderbird") != -1)
				file.append("thunderbird-bin");
			if (mailApp.toLowerCase().indexOf("seamonkey") != -1)
				file.append("seamonkey-bin");
			fileValid = true;
		}
	}

	reminderfox.core.setPreferenceValue(reminderfox.consts.MAIL_PATH, mailApp);
	return file; // return file object
};


/**
 *    setup 'mail-app' and 'myAccounts' ---- (for NON msngr app  -- like FX) ----
 **/
reminderfox.util.mailAppSetup= function(){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var results = {
		organizer: null,
		attendees: null,
		mode: 'mailApp',
		selectedTyp: 'info',
		schComment: ''
	};
	window.openDialog("chrome://reminderfox/content/mail/invitation.xul", "reminderFox-set-invitationmailAppString", "chrome,resizable,modal", results);

	if (results.mode == 'CANCEL') {
		return 'CANCEL';
	} // user pressed 'CANCEL'
	return reminderfox.core.getPreferenceValue(reminderfox.consts.MAIL_SENDER, "");
};



//SM / browser: document.documentURI $[2] = [string] "chrome://navigator/content/navigator.xul"
//SM / messngr: document.documentURI $[1] = [string] "chrome://messenger/content/messenger.xul"
//TB            document.documentURI $[1] = [string] "chrome://messenger/content/messenger.xul"
//FX            document.documentURI $[1] = [string] "chrome://browser/content/browser.xul"


/**
 *   Collect details from selection (text, or in msngr from header)       <br>
 *
 * @param {Object}   (only with messenger!) msgHdr; if in msngr builds return object with msgHeader data
 * @return {Object}  collected info as object; if non-msngr just builds object
 */
reminderfox.util.selectionDetails= function (msgHdr) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var rv    = {};
	rv.url    = null;
	rv.infos  = {};
	var selectedText = "";

	// browser or naviagtor
	if (document.documentURI != "chrome://messenger/content/messenger.xul") {

		rv.url  = gBrowser.currentURI.spec;
		rv.summary = gBrowser.selectedTab.label;
		rv.infos.subject = rv.summary;

		// get text without leading / trailing LF chars
		var selection = document.commandDispatcher.focusedWindow.getSelection();
		rv.infos.text       = reminderfox.util.cleanString(selection.toString());

		var nodes = document.popupNode;
		if (nodes) {
			for (var i=0; i < nodes.children.length; i++) {
				if (nodes.children[i].href != null) {
					rv.url = nodes.children[i].href;
					break;
				}
			}
		}

		if (gContextMenu) {
			if (gContextMenu.onLink) {
				rv.url= gContextMenu.link.href;
			}
		}
		return rv;
	}


	// messenger
	try {   // needed: if no message selected ==> would fail !!!
	if (document.documentURI == "chrome://messenger/content/messenger.xul") {
			// --- get msgHeader Infos ------
			msgHdr  = (msgHdr) ? msgHdr : gDBView.hdrForFirstSelectedMessage;

			rv.infos.fromMailadr	= msgHdr.mime2DecodedAuthor;	// need for processing eg REPLY

			var recipients = "";
			if (msgHdr.mime2DecodedRecipients)		// mime2DecodedRecipients will be removed with TB25
				recipients	= msgHdr.mime2DecodedRecipients;

			if (msgHdr.mime2DecodedTo) recipients  += msgHdr.mime2DecodedTo;
			if (msgHdr.mime2DecodedCC) recipients  += msgHdr.mime2DecodedCC;
			if (msgHdr.mime2DecodedBCC) recipients += msgHdr.mime2DecodedBCC;

			// PRIORITY definition for  RmFx and  TB
			// reminderfox.consts.PRIORITY_NORMAL = null;  // default
			// reminderfox.consts.PRIORITY_IMPORTANT = 1;
			// TB header.priority:  6= very high;  5=high;  1=normal;  3=low;  2=very low

			if (msgHdr.priority >= 5) {		// for TB 'very high' and 'high'
				rv.infos.priority = 1;	// set RmFx 'Important'
			}

			rv.infos.subject = reminderfox.string("rf.add.mail.message.mail.identifier") + " " + msgHdr.mime2DecodedSubject;
			rv.infos.date =      "    " + reminderfox.string("rf.add.mail.message.date") + ": " + reminderfox.date.parseDateTimes(msgHdr.date/1000);
			rv.infos.author =    "    " + reminderfox.string("rf.add.mail.message.sender") + ": " + msgHdr.mime2DecodedAuthor;
			rv.infos.recipients ="    " + reminderfox.string("rf.add.mail.message.recipients") + ": " + recipients;
			rv.infos.messageId = "<" + msgHdr.messageId.replace(new RegExp(/\"/g),"") + ">";

			// preformat message header for the Notes section
			rv.infos.notes = rv.infos.date +
				"\n" + rv.infos.author +
				"\n" + rv.infos.recipients +
				"\n" + "    " + rv.infos.messageId;

			// if url(s) found, use the first to add to reminders URL
			var nodes = document.popupNode;
			if (nodes) {
				for (var i=0; i < nodes.children.length; i++) {
					if (nodes.children[i].href != null) {
						rv.url = nodes.children[i].href;
						break;
					}
				}
				if (nodes.href) rv.url = nodes.href;
			}

			// if text selected add it to reminders Notes
			var selection = document.commandDispatcher.focusedWindow.getSelection();
			selectedText  = reminderfox.util.cleanString(selection.toString());

			if (selectedText.length > 0) {
				selectedText = "\n\n" + reminderfox.string("rf.add.mail.message.details") + "\n" + selectedText;
			}
			rv.infos.text = rv.infos.notes + selectedText;
	}
	} catch (ex) {}
	return rv;
};


/**
 *   Convert a character stream from Unicode to UTF8 and replace CR --> CRLF
 *   @param  {string}  aSource  source stream
 *   @return {string}  resulting UTF8 string
 */
reminderfox.util.encodeUTF8= function(aSource){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return reminderfox.util.convertFromUnicode("UTF-8", aSource).replace(/(\r\n)|\n/g, "\r\n");
};


/**
 *   Convert a character stream from Unicode to other based on definition
 *   @param {string}  aCharset  character set name to convert to
 *   @param {string}  aSource  source stream
 */
reminderfox.util.convertFromUnicode= function(aCharset, aSource){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var unicodeConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Ci.nsIScriptableUnicodeConverter);
	unicodeConverter.charset = aCharset;
	return unicodeConverter.ConvertFromUnicode(aSource);
};


reminderfox.util.getIOService= function(){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if (reminderfox.util.getIOService.mObject === undefined) {
		reminderfox.util.getIOService.mObject = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService2);
	}
	return reminderfox.util.getIOService.mObject;
};


/**
 * Check if fileName is a valid file, not a directory
 * @param {string | object}  filepath or nsIFile object
 * @return {integer}  1 = valid fileName;
 *                    0 = file doesn't exist
 *                   -1 = directory
 *                   -2 = parent directory isn't valid
 */
reminderfox.util.fileCheck= function (filepath) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var sfile;
	if (typeof(filepath) == "string") {
		sfile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	}
	try {
		sfile.initWithPath(filepath);
	} catch (ex){
		return -2; // serious error with filepath, ev. wrong dir from old profile!
	}

	if (sfile.exists() === false) {
		// check if parent directory exists
		var sdir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
		sdir.initWithPath(sfile.parent.path);
		try {
			sdir.isDirectory();
			// dir is OK but file isn't
			return 0;
		}
		catch (e) {
			return -2;
		}
	}
	if (sfile.isDirectory() === true) return -1;
	return 1;
};

/**
 * FilePicker   2017-12-01
 * Changed to not use fp.show but fp.open which is async code
 * (required for mozilla57)
 */
reminderfox.util.filePick = function (aWindow, details, callback) {
//--------------------------------------------------------------------------
   var nsIFilePicker = Ci.nsIFilePicker;
   var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

   fp.init(aWindow, details.title, nsIFilePicker[details.fileMode]);
   fp.appendFilters(nsIFilePicker.filterAll);
   fp.appendFilter(details.filterName, details.extensions);
   fp.filterIndex = 1;

   if (details.cDir && details.cDir.parent) fp.displayDirectory = details.cDir.parent;
   if (details.defaultString) fp.defaultString= details.defaultString;

   return new Promise(resolve => {
      //show the window
      fp.open(rv => {
         if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
            callback(fp.file, details);
         }
      });
   });
};


//--- Import/Export ICS data ------------------------------------
/**
 *  Set the file for  'export' of reminders/todos
 *  .. and set prefs for it
 */
reminderfox.util.getExportFile= function () {
//---------------------------------------------------------------
	var details= {};

	var fName = document.getElementById("exportFile").value;
	details.defaultString = fName;
	details.title        = reminderfox.string("rf.export.send.title");	// "Set / Select file to export reminder(s)";
	details.mode         = 'exportICSfile';

	details.filterName   = "Event File (ICS)";
	details.extensions   = '*.ics';

	details.fileMode     = 'modeSave';

	reminderfox.util.filePick(window, details,
		function(file, details) {
			if (file != null) {
				reminderfox.core.setPreferenceValue(reminderfox.consts.EXPORT_EVENTS, file.path);
				document.getElementById("exportFile").setAttribute("value", file.path);
	 		}
		});
};

reminderfox.util.eventsExportFile= function (fName) {
//---------------------------------------------------------------
	var exportFile = reminderfox.core.getPreferenceValue(reminderfox.consts.EXPORT_EVENTS, "");
	if (exportFile == "" || exportFile == null){

		var defaultFile = Cc["@mozilla.org/file/directory_service;1"]
			.getService(Ci.nsIProperties)
			.get("Desk", Ci.nsIFile);
		defaultFile.append(fName);
		exportFile = defaultFile.path;
		reminderfox.core.setPreferenceValue(reminderfox.consts.EXPORT_EVENTS, exportFile);
	}
	return exportFile;
};


/*
 * Export (Backup) the current reminders/events
 * @param {object} backup - if passed store to file with date/time stamp
 */
reminderfox.util.exportReminders= function (backup) {
//---------------------------------------------------------------
	var details = {};

	// get current store file name
	var fName = reminderfox.core.getICSfile();
	details.cDir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	details.cDir.initWithPath(fName.path);

	// set store file name for ics
	fName = fName.leafName;

	if (backup) {
		var icsFile = fName.replace(".ics", "");

		var date = new Date();
		var dateString = reminderfox.date.objDTtoStringICS(date);
		fName = icsFile + "_" + dateString + ".ics";
	}
	details.defaultString = fName;

	details.outputStr   = reminderfox.core.constructReminderOutput(
		reminderfox.core.getReminderEvents(),
		reminderfox.core.getReminderTodos(),
		true);

	details.title       = 'Export iCal/ICS reminders';
	details.mode        = 'exportICS';

	details.filterName  = "Reminder Data (" + details.extensions + ")";
	details.extensions  = '*.ics';
	details.fileMode    = 'modeSave';

	reminderfox.util.filePick(window, details,
		function (file, details){
			if(!file)
				return;

			if(file.exists() == false) {
				file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 420);
			}
			reminderfox.core.writeStringToFile(details.outputStr, file, true);

			// show success message
			var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
			promptService.alert(window, reminderfox.string("rf.options.export.success.title"), reminderfox.string("rf.options.export.success.description"));
		});
};


reminderfox.util.browseICSfile= function () {
	var details = {};
	details.extensions = '*.ics';
	details.title = 'Browse for iCal/ICS Default Location';
	details.mode = 'browse_file_location';

	reminderfox.util.pickFileICSfile(details);
};

reminderfox.util.recoverICSfile= function () {
	var details = {};
	details.extensions = '*.ics; *.bak?';
	details.title = 'Recover iCal/ICS reminders';
	details.mode = 'recover_reminders';

	reminderfox.util.pickFileICSfile(details);
};

/**
 * Pick an ICS file from fileManger and pass filePath to "Add/Subscribe" dialog
 * with disabled 'Subscribe'
 */
reminderfox.util.importICSreminders= function () {
	var details = {};
	details.extensions = '*.ics';
	details.title = 'Import iCal/ICS reminders';
	details.mode = 'userIO.readICSfile';

	reminderfox.util.pickFileICSfile(details);
};

/**
 * Pick a ICS data file location for >open<  and
 * -- Set the Default Location (Options)  :: browse_file_location
 * -- Import reminders (Options Import/Export button)  :: userIO.readICSfile
 * -- Restore reminders from a file location (Options) :: recover_reminders
 * -- Restore from file (Main dialog - foxy menu)      :: recover_reminders
 */
reminderfox.util.pickFileICSfile= function (details) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//?????	if(xthis && xthis.disabled) return;
	details.filterName= "Reminder Data (" + details.extensions + ")";

	// if we're in options dialog, get current file value
	var fName = reminderfox.core.getICSfile().path || document.getElementById("reminderFox-file-location").value;
	details.cDir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	details.cDir.initWithPath(fName);

	details.fileMode = 'modeOpen';

	reminderfox.util.filePick(window, details,
		function (file, details) {
			if (details.mode == 'browse_file_location') {
				document.getElementById("reminderFox-file-location").value = file.path;
				document.getElementById("reminderFox-apply").removeAttribute("disabled");
			}

			if (details.mode == "recover_reminders") {
				var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Ci.nsIPromptService);

				reminderfox.core.logMessageLevel("  filebrowse ", reminderfox.consts.LOG_LEVEL_INFO);
				// make sure they REAAAAALY want to overwrite
				var msg = reminderfox.string("rf.options.import.overwrite.description") +
					"\n\n File to restore: " + file.path;		//$$$_locale

				var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 +
					promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1 +
					promptService.BUTTON_POS_1_DEFAULT;	//  set default button;

				var buttonPressed = promptService.confirmEx(window, reminderfox.string("rf.options.import.overwrite.title"),
					msg, flags,
					reminderfox.string("rf.options.import.overwritebutton.title"),
					reminderfox.string("rf.button.cancel"), null, null, {});

				if(buttonPressed == 1) return;	// cancel pressed

				var reminderEvents = new Array();
				var reminderTodos = new Array();
				reminderfox.core.readInRemindersAndTodosICSFromFile(reminderEvents, reminderTodos, file, false /*ignoreExtraInfo IfImportingAdditionalEvents*/);

				// With CalDAV enabled, each event/todo connected to a CalDAV account will
				// be traced in  'reminderfox.calDAV.accounts'
				reminderfox.calDAV.getAccounts();

				// check if we've successfully imported any reminders or todo events				var importedSuccess = reminderEvents.length !== 0;
				var numTodos = 0;
				for(var n in reminderTodos) {
					var importedTodos = reminderTodos[n];
					if(importedTodos.length > 0) {
						importedSuccess = true;
						numTodos += importedTodos.length;
						//break;
					}
				}
				var numEvents = reminderEvents.length; /*numEvents*/;

				reminderfox.util.PromptAlert("Imported  Reminders: " + numEvents  +  "  ToDo's:" + numTodos);

				reminderfox.core.reminderFoxEvents = reminderEvents;
				reminderfox.core.reminderFoxTodosArray = reminderTodos;
				reminderfox.core.importRemindersUpdateAll(false, null);
			}

			if (details.mode == 'userIO.readICSfile') {
				if(!file) return;  // // cancel pressed -- no file selected
				var localFile = file.path;

				var call = {};
				call.details = {};
				call.details.url         = localFile;
				call.details.summary     = 'Import from iCal/ICS file : ' + localFile;
				call.details.noSubscribe = true;

				var icsData = reminderfox.util.readInFileContents(localFile);
				reminderfox.userIO.readICSdata (icsData, call);
			}
		});
};
//^^^ Import/Export ICS data ~~~~~~~~~~~~~~~~~~~~~


/**
 *   Build a temporary file using the ICS UID name
 *   @param  {string}  rmFx_UID
 *   @return {string}  tmp file path in OS tmp dir
 */
reminderfox.util.buildUIDFile= function(rmFx_UID){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var tempDir = Cc["@mozilla.org/file/directory_service;1"]
		.getService(Ci.nsIProperties).get("TmpD", Ci.nsIFile);

	tempDir.append("tempMsg" + rmFx_UID);

	return tempDir.path;
};


/**
 *  Create file.path for a file located in same dir as the current
 *  ReminderFox ICS file location
 *  @param   {string}  fileName
 *  @return  {string}  file path
 */
reminderfox.util.filePath4storePath= function(fileName){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// set 'path' to same dir as 'reminderfox.ics' file
	var sfile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);

	sfile.initWithPath(reminderfox.core.getICSfile().parent.path);
	sfile.append(fileName);

	return sfile.path;
};

reminderfox.util.ProfD_extend= function(dirName){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		var xFile = Cc["@mozilla.org/file/directory_service;1"]
			.getService(Ci.nsIProperties)
			.get("ProfD", Ci.nsIFile);
		xFile.append(dirName);
		return xFile;
};

reminderfox.util.getICSdefaultFilePath= function() {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    var defaultFile = reminderfox.util.ProfD_extend("reminderfox");
    defaultFile.append("reminderfox.ics");
    return defaultFile.path;
}


/**
 *   Read character file and convert to UTF8 string
 *   @param  {string}  file name
 *    @return {string}  UTF8 character string
 */
reminderfox.util.readInFileContents= function(tmpFile){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var sfile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	sfile.initWithPath(tmpFile);

	var is = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	try {
		is.init(sfile, 0x01, 00004, null);
	}
	catch (e) {
		reminderfox.util.PromptAlert("Could not read reminder file: "+ tmpFile +"\n" + e.name + " -- " + e.message);
		return null;
	}

	// Now, read from the stream
	var scriptableStream = Cc["@mozilla.org/scriptableinputstream;1"]
		.createInstance(Ci.nsIScriptableInputStream);
	scriptableStream.init(is);

	var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Ci.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8"; // The character encoding you want, using UTF-8 here
	var chunk = scriptableStream.read(scriptableStream.available());
	scriptableStream.close();
	var input = null;
	try {
		input = converter.ConvertToUnicode(chunk);
	}
	catch (e) {
		input = chunk;
	}
	return input;
};


reminderfox.util.makeMsgFile= function(xcontent, tempFile){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var sfile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	try {
		sfile.initWithPath(tempFile);
	}
	catch (ex) {
		return null;
	}
	if (sfile.exists()) {
		sfile.remove(true);
	}
	sfile.create(sfile.NORMAL_FILE_TYPE, 0600);
	var outputStream = Cc['@mozilla.org/network/file-output-stream;1']
		.createInstance(Ci.nsIFileOutputStream);
	outputStream.init(sfile, 2, 0x200, false); // open as "write only"
	outputStream.write(xcontent, xcontent.length);
	outputStream.close();
	return sfile;
};


reminderfox.util.makeFile8= function(outputStr, file){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//ZZZ
// console.error("rmFX  .util.makeFile8 ", new Date().toISOString(), ">>"+ outputStr +"<<", file);
try {
	var sfile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	sfile.initWithPath(file);

	var outputStream = Cc["@mozilla.org/network/file-output-stream;1"]
		.createInstance(Ci.nsIFileOutputStream);
	outputStream.init(sfile, 0x04 | 0x08 | 0x20, 420, 0);
} catch (ex){
	console.error("rmFX  .util.makeFile8   ERROR nsIFileOutputStream .init", ex);
}

	var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
		.createInstance(Ci.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";

	var chunk = null;
	try {
		chunk = converter.ConvertFromUnicode(outputStr);
	}
	catch (e) {
		chunk = outputStr;
	}
	outputStream.write(chunk, chunk.length);

	var fin = converter.Finish();
	if (fin.length > 0)
		outputStream.write(fin, fin.length);
	outputStream.close();
	return sfile;
};


/**
 *     Debugging support, prompts an Alert and writes it to console
 */
reminderfox.util.PromptAlert= function(msgErr, noAlert){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Ci.nsIPromptService);

	promptService.alert(window, "ReminderFox Alert : \n\n", msgErr);
	if (noAlert) {
		console.error(msgErr);
	}
};


reminderfox.util.PromptUser= function (msg, title, button0, button1, defaultButton){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
		.getService(Ci.nsIPromptService);

	var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 +
		promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1 + defaultButton;

	return promptService.confirmEx(window, title, msg, flags, button0, button1, null, null, {});
};


/**
 * Returns a string describing the current js-stack with filename and line
 * numbers.
 *
 * @param aDepth (optional) The number of frames to include. Defaults to 10.
 */
reminderfox.util.STACK= function (aDepth) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var depth = aDepth || 10;

	var frame = Components.stack.caller.caller;
	var stack = "\n  0: " + frame.filename + "#" + frame.lineNumber + "\n";
	var frame = Components.stack.caller.caller.caller;
	if (aDepth === 0) return stack;

	for (var i = 1; i <= depth && frame; i++) {

		var x = (frame.filename != null) ? frame.filename : ""
		if (x.search("reminderfox") == -1) break;
		stack += ("  " + i + ": " + frame.filename + "#" +
			frame.lineNumber + " [" + frame.name + "]\n");
		if (!frame.filename) break;
		frame = frame.caller;
	}
	return stack;
};


/**
 * Logs passes a message string  to console output.
 * Optional the stack and filename/line number can be appended.
 *
 * Prefs is used to configure the output:      "extensions.reminderFox.loggers"
 * it's a JSON string with  {"Reminderfox": level, SubLogger : level},
 * multiple Subloggers can be defined.
 *
 * 'Reminderfox' is the root name with a user selected "level".
 * SubLoggers are defined also with pair of  "name":"level":
 *   Examples:
 *    {"Reminderfox":"Error","calDAV":"Info"}
 *    {"Reminderfox":"Trace","calDAV":"Info"}
 *
 * "level" values can be any of
 *    'Fatal', 'Error', 'Warn', 'Info', 'Config', 'Debug', 'Trace', 'All'.
 *    (Fatal is highest, All is lowest level).
 *
 * Logger will send to console if 'SubLogger' has same or higher "level" than
 * 'Reminderfox'.
 *     ad Examples above:  first   will NOT send the message,
 *                         second  will send.
 *
 * To use the Logger a function call has to be added to the JS code:
 *   reminderfox.util.Logger('calDAV', msg);

 * Call to Logger will not send anything to the console with
 *  -- prefs string 'loggers' not defined
 *  -- prefs string  'loggers' without 'Reminderfox' and 'level'
 *  -- call with unknown 'level' for 'subLogger'
 *
 * Using a call for the Logger with 'Alert' will write to console indepened
 * of 'Reminderfox' settings!
 *
 * Additional console output
 *   -- for 'Fatal', 'Error', 'Warn': the calling STACK will be appended to the normal log message
 *   -- with 'Info' or lower: the calling filename and line number is appended.
 *
 * @param {string}  'Log' name
 * @param {string}  'msg' message
*/
reminderfox.util.Logger = function (Log, msg) {
//------------------------------------------------------------------------------
	var logMsg;

	var _LogLevel = {
		FATAL:  70,
		ERROR:  60,
		WARN:   50,
		INFO:   40,
		CONFIG: 30,
		DEBUG:  20,
		TRACE:  10,
		ALL:    0
		};

	if (Log.toLowerCase().search('alert') > -1){
		console.error ("Reminderfox  ** Alert **    " + reminderfox.util.logDate() + "\n" + msg);
		return;
	}

	var prefLoggers ;
	try {
		var _prefs = Cc["@mozilla.org/preferences-service;1"]
			.getService(Ci.nsIPrefBranch);
		prefLoggers = JSON.parse(_prefs.getCharPref("extensions.reminderFox.loggers").toUpperCase());
	} catch (ex) {}
	if (!prefLoggers) return;

	// if prefs don't have a 'Reminderfox' logger, do nothing .. just return
	var rootID = prefLoggers['REMINDERFOX'];
	var rootNum = _LogLevel[rootID];
	var logId   = prefLoggers[Log.toUpperCase()];
	var logNum  = _LogLevel[logId] || 0;

	// if the requested 'Log' is unknown or rootLog is higher than 'Log' just return;
	if ((!rootNum) || (!logNum)) return;
	if (logNum < rootNum) return;

	console.error("Reminderfox Logger: "+ rootID + "  [" + Log + ": " + logId + "]   " + reminderfox.util.logDate() + "\n" + msg);  //XXXdebug
};

//  console.log(), console.info(), console.warn(), console.error()


reminderfox.util.logDate = function (date) {
//------------------------------------------------------------------------------
	if (!date){
		date = new Date();
	}
	let tzOffset = date.getTimezoneOffset()
	return (new Date(date.setMinutes(date.getMinutes() - tzOffset))).toISOString().substring(0,19) + "  >" + +date + "<";
};

/**
 *    Generic function to copy the data to Clipboard
 */
reminderfox.util.copytoClipboard= function(data){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// Generic function to copy the data to Clipboard
	var clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"];
	clipboard = clipboard.getService(Ci.nsIClipboardHelper);
	clipboard.copyString("");	// make it's empty !
	clipboard.copyString(data);
};


/**
 *    Generic function to get the text from Clipboard
 */
reminderfox.util.copyTextfromClipboard= function(){ //gW_AddEvent
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var clip = Cc["@mozilla.org/widget/clipboard;1"]
		.getService(Ci.nsIClipboard);
	if (!clip) return null;

	var trans = Cc["@mozilla.org/widget/transferable;1"]
		.createInstance(Ci.nsITransferable);
	if (!trans) return null;

	// init() was added to nsITransferable in FF16 for Private Browsing Mode
	// see https://bugzilla.mozilla.org/show_bug.cgi?id=722872 for more info
	if ('init' in trans) {
		var privacyContext = document.commandDispatcher.focusedWindow.
			QueryInterface(Ci.nsIInterfaceRequestor).
			getInterface(Ci.nsIWebNavigation).
			QueryInterface(Ci.nsILoadContext);
		trans.init(privacyContext);
	}

	trans.addDataFlavor("text/unicode");

	clip.getData(trans, clip.kGlobalClipboard);

	var str = new Object();
	var strLength = new Object();
	var pastetext;

	try { // 'try' to prevent error with empty or non-text clipboard content
		trans.getTransferData("text/unicode", str, strLength);
		if (str)
			str = str.value.QueryInterface(Ci.nsISupportsString);
		if (str)
			pastetext = str.data.substring(0, strLength.value / 2);

		if (pastetext !== "")
			return pastetext;
	}
	catch (ex) {
	}
	return null;
};


/**
 *   rmFxUtil Dialog Confirm Service to support 2 or 3 key choice
 *
 *      [key0] [key1]
 *       or   [key0] [key2] [key1]
 *
 *   @param	title, the headline of dialog
 *   @param	msg, typically a question
 *   @param	key0
 *   @param	key1
 *   @param	key2, optional, decides if 2 or 3 buttons
 *    @return  index of button pressed;  returns 1 if the user closes the window using the close button in the titlebar
 */
reminderfox.util.ConfirmEx= function(title, msg, key0, key1, key2){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);

	var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 +
	promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1; // flags = [integer] 32639
	if (!!key2) {
		flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 +
		promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1 +
		promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_2; // flags = [integer] 8355711
	}
	return promptService.confirmEx(window, title, msg, flags, key0, key1, key2, null, {});
};


// Utilities  from \mail\components\preferences\applications.js

reminderfox.util.getDisplayNameForFile= function(aFile){ // +++2do gW_OSspecfic ???
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//@line 85 "e:\buildbot\win32_build\build\mail\components\preferences\applications.js"
	if (aFile instanceof Ci.nsILocalFileWin) {
		try {
			return aFile.getVersionInfoField("FileDescription");
		}
		catch (ex) { // fall through to the file name
		}
	}
	return aFile.leafName;
};


reminderfox.util.getLocalHandlerApp= function(aFile){ // +++2do gW_OSspecfic ???
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var localHandlerApp = Cc["@mozilla.org/uriloader/local-handler-app;1"].createInstance(Ci.nsILocalHandlerApp);
	localHandlerApp.name = reminderfox.util.getDisplayNameForFile(aFile);
	localHandlerApp.executable = aFile;
	return localHandlerApp;
};


reminderfox.util.isValidHandlerExecutable= function(aExecutable){ // +++2do gW_OSspecfic ???
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	return aExecutable &&
	aExecutable.exists() &&
	aExecutable.isExecutable() &&
	//@line 905 "e:\buildbot\win32_build\build\mail\components\preferences\applications.js"
	aExecutable.leafName != ".exe";
	//@line 913 "e:\buildbot\win32_build\build\mail\components\preferences\applications.js"
};


/**
 *    Add CATEGORIES item to reminder, no dups
 */
reminderfox.util.addCategory4Import= function(reminder, categoryItem){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var categoryItemLC = categoryItem.toLowerCase(); //   "invitation";
	if (reminder.categories  && reminder.categories.length > 0) {
		if (reminder.categories.toLowerCase().indexOf(categoryItemLC) == -1) {
			reminder.categories = reminder.categories + ", " + categoryItem;
		}
	}
	else {
		reminder.categories = categoryItem;
	}
	return reminder;
};


/**
 *    Add Events/Todos to existed and write result to ReminderFox 'statusline'
 *   @param {object} newEvents
 *   @param {object} newTodos
 */
reminderfox.util.addMultipleEvents= function (newEvents, newTodos) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// merge
	var existingEvents = reminderfox.core.getReminderEvents();
	var existingTodos = reminderfox.core.getReminderTodos();  //  ALL  todos
	var rvEvent = reminderfox.core.mergeEvents(existingEvents, newEvents);
	var rvTodo = reminderfox.core.mergeTodos( existingTodos, newTodos);

	reminderfox.core.reminderFoxEvents = existingEvents;
	reminderfox.core.reminderFoxTodosArray = existingTodos;

	reminderfox.core.importRemindersUpdateAll(false, null);// (isNetworkImport, lastModifiedTime)

	// write to status !!
	var xEvents= reminderfox.string("rf.html.heading.reminders");
	var xToDos = reminderfox.string("rf.html.heading.todos");
	var xImported  = reminderfox.string("rf.reminders.imported");	//"imported";
	var xExists  = reminderfox.string("rf.reminders.exists");		//"already exists";

	var msgText =  xEvents + " : " + rvEvent.importNo + " " + xImported
			+ ",  " + rvEvent.existNo + " " + xExists +"."
			+ "\n" + xToDos + " : " + rvTodo.importNo  + " " + xImported
			+ ",  " + rvTodo.existNo + " " + xExists + "." ;

	reminderfox.core.statusSet (msgText, false);
	return true;
};


// *****************************************************************************
reminderfox.util.openURL= function(UrlToGoTo, pageIdentifier){
//------------------------------------------------------------------------------
	if ("@mozilla.org/messenger;1" in Cc) {
		var messenger = Cc["@mozilla.org/messenger;1"].createInstance()
			.QueryInterface(Ci.nsIMessenger);
		var url = reminderfox.util.encodeUTF8 (UrlToGoTo);

		try {
			messenger.launchExternalURL(url);
		} catch (ex) {
			var msgString = "Check Messenger settings for opening web pages."
				+ "\n (Called: " + url;
			reminderfox.util.PromptAlert (msgString);
		}
	}
	else {  // --- Firefox part ---
		// display on browser tab, if it's known reuse it
		if ( pageIdentifier == null ) {
			pageIdentifier = 'reminderfox_infoPage';
		}
		reminderfox.util.openAndReuseOneTabPerAttribute(pageIdentifier, UrlToGoTo);
	}
};


//rf.faqURL= http://www.reminderfox.org/documentation
//rf.printingUser=http://www.reminderfox.org/printing/

//rf.faqURL=http://www.reminderfox.org/documentation-german/
//rf.printingUser=http://www.reminderfox.org/printing-de/


reminderfox.util.launchHelp= function(whichHelp){

	if ((whichHelp === "") || (!whichHelp)) {
		reminderfox.util.docRmFX(reminderfox.string("rf.faqURL"));
	} else {
		reminderfox.util.docRmFX(reminderfox.string(whichHelp));
	}
};

reminderfox.util.launchForum= function(whichHelp){

}


reminderfox.util.docRmFX= function(UrlToGoTo){
//------------------------------------------------------------------------------
//reminderfox.util.Logger('ALERT', "  .util.docRmFX  UrlToGoTo  >" + UrlToGoTo + "<");

	if ((UrlToGoTo === "") || (!UrlToGoTo)) {
		UrlToGoTo = (reminderfox.consts.REMINDER_FOX_PAGE_URL + "/");
	}

	if (UrlToGoTo == "forum") {
		UrlToGoTo = "https://groups.google.com/forum/#!forum/reminderfox"
	} else {
	if (UrlToGoTo.indexOf(reminderfox.consts.REMINDER_FOX_PAGE_URL) == -1)
		UrlToGoTo = reminderfox.consts.REMINDER_FOX_PAGE_URL +"/" + UrlToGoTo;
	}

	if ("@mozilla.org/messenger;1" in Cc) {

	//	var url = reminderfox.util.encodeUTF8 (UrlToGoTo);
		var url = (UrlToGoTo);

		var tabmail = document.getElementById("tabmail");
		if (!tabmail) {
			// Try opening new tabs in an existing 3pane window
			var mail3PaneWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
					.getService(Ci.nsIWindowMediator)
					.getMostRecentWindow("mail:3pane");
			if (mail3PaneWindow) {
				tabmail = mail3PaneWindow.document.getElementById("tabmail");
				mail3PaneWindow.focus();
			}
		}

		if (tabmail) {
			// because we want the "reuse" the same tab, but tabmail hasn't (???)
			// a reuse mode, the 'contentTab' will be closed before open with the new url
			tabmail.selectTabByMode('contentTab');
			var tIndex = tabmail.tabContainer.selectedIndex;
			var tType = tabmail.tabContainer.selectedItem.getAttribute('type');		// = [string] "folder"

			if (tType != "contentTab")
				tabmail.openTab("contentTab", {contentPage: url, clickHandler: "http://www.reminderfox.org/"});

			else {
				var aTab = tabmail.tabInfo[tIndex].browser.contentDocument.location;
				aTab.href = url;
			}
		}
		else {
			window.openDialog("chrome://messenger/content/", "_blank", "chrome,dialog=no,all", null,
				{ tabType: "contentTab", tabParams: {contentPage: url} });
		}
		return;
	}
	else {  // --- Firefox part ---
		// display on browser tab, if it's known reuse it
		reminderfox.util.openAndReuseOneTabPerAttribute('reminderfox_infoPage', UrlToGoTo);
	}
};

reminderfox.util.openAndReuseOneTabPerAttribute= function(attrName, url) {
//------------------------------------------------------------------------------
	var tabbrowser;

	var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
					.getService(Ci.nsIWindowMediator);
	for (var found = false, index = 0, tabbrowser = wm.getEnumerator('navigator:browser').getNext().gBrowser;
		index < tabbrowser.tabContainer.childNodes.length && !found;
		index++) {

		// Get the next tab
		var currentTab = tabbrowser.tabContainer.childNodes[index];

		// Does this tab contain our custom attribute?
		if (currentTab.hasAttribute(attrName)) {

		// Yes--select and focus it.
			tabbrowser.selectedTab = currentTab;

			// Focus *this* browser window in case another one is currently focused
			tabbrowser.ownerDocument.defaultView.focus();
			tabbrowser.ownerDocument.defaultView.openUILink(url);
			found = true;
		}
	}

	if (!found) {
		var browserEnumerator = wm.getEnumerator("navigator:browser");
		tabbrowser = browserEnumerator.getNext().gBrowser;

		// Create tab
		var newTab = tabbrowser.addTab(url);
		newTab.setAttribute(attrName, "xyz");

		// Focus tab
		tabbrowser.selectedTab = newTab;

		// Focus *this* browser window in case another one is currently focused
		tabbrowser.ownerDocument.defaultView.focus();
	}
};


// *****************************************************************************
/**
 * Dispatcher
 * Used as 'chrome' Loader for specific usecases.
 * Loading will only executed if the '.JS' isn't loaded already,
 * checked with an object expected to be loaded with .JS file;
 * ex "reminderfox.iCal"  defined in "rmFxIcalMail.js"
 *
 * @param  id    name of a package with one or more 'chrome' files and
 *  (optional a function to be called after loading; this is added to
 *   simplify definition in XUL)
 * @param  arg   argument(s) to be passed to the optional call
 *
 */
reminderfox.util.JS = {
// *****************************************************************************
	mail:      "chrome://reminderfox/content/mail/rmFxMail.js",
	iCal:      "chrome://reminderfox/content/mail/rmFxIcalMail.js",
	iSchedule: "chrome://reminderfox/content/mail/schedule.js",
	abCard:    "chrome://reminderfox/content/mail/addContact2Reminder.js",
	sendPlus:  "chrome://reminderfox/content/mail/rmFxSendwReminder.js",
	tagging:   "chrome://reminderfox/content/mail/rmFxMsgTagging.js",
	userIO:    "chrome://reminderfox/content/utils/rmFxUserIO.js",
	addDialog: "chrome://reminderfox/content/addReminderDialog.js",
	http:      "chrome://reminderfox/content/utils/HTTP.js",


	"network.download":  "chrome://reminderfox/content/network/download.js",
	"network.upload":    "chrome://reminderfox/content/network/upload.js",
	"network.services":  "chrome://reminderfox/content/network/networkService.js",
	"network.password":  "chrome://reminderfox/content/network/passwordManagerUtils.js",


	dispatcher: function(object){
		var status = true;

		// for multi-package (network.upload), check if first segment is defined; if so,
		// check for second segment as well
		if( object.indexOf( ".") != -1) {
			var index = object.indexOf( ".");
			var segment1 = object.substring( 0, index);
			var segment2 = object.substring( index + 1);
			status = typeof reminderfox[segment1] == 'undefined';
			if ( !status) {
				status = typeof reminderfox[segment1][segment2] == 'undefined';
			}
		}
		else {
			status = typeof reminderfox[object] == 'undefined';
		}
		if (status) {
			Cc["@mozilla.org/moz/jssubscript-loader;1"]
			.getService(Ci.mozIJSSubScriptLoader)
			.loadSubScript(this[object]);
		}

		var consoleService = Cc["@mozilla.org/consoleservice;1"]
			.getService(Ci.nsIConsoleService);

		var msg = ("ReminderFox   {dispatch: " + object + "=" + status + "}\n" + this.loggedAt);
		consoleService.logStringMessage(msg);

console.log("//gW ####  Dispatcher  #### \n", msg);
console.trace();
	},


	/**
	 *  for multi-package (like 'jcalendar,jquery,icalendar'), check if a package is defined
	 *  for the first string (eg: 'jcalendar'),    <br>
	 *  -- if so return, do nothing;   <br>
	 *  -- if NOT, load  all packages without further checking
	 *
	 * @param {string} object
	 */
	dispatcher2: function(packages){
		var status = null;
		var allPackages = packages.split(",");

		var pLength = allPackages.length;
		var aPackage = reminderfox.util.trim(allPackages[0]);

		status = typeof reminderfox[aPackage] == 'undefined';
		this.loader (aPackage, status);

		if (status) {   // if first has been loaded go for the rest
			for (var i= 1; i < pLength; i++) {
				aPackage = reminderfox.util.trim(allPackages[i]);
				this.loader (aPackage, "force");
			}
		}
	},


	loader : function (object, status) {

		var consoleService = Cc["@mozilla.org/consoleservice;1"]
			.getService(Ci.nsIConsoleService);

		consoleService.logStringMessage("ReminderFox     {dispatch: " +
		object + "=" + status + "}\n" + this.loggedAt);

		if (status == true) {
			Cc["@mozilla.org/moz/jssubscript-loader;1"]
			.getService(Ci.mozIJSSubScriptLoader)
			.loadSubScript(this[object]);
		}
	},


	loggedAt: '',

	dispatch: function(id, arg){
		var msg = "[[" + Components.stack.caller.filename + "  # " +
		Components.stack.caller.lineNumber + "]]";
		this.loggedAt = msg;

		console.log("//gW ####  dispatch  id:", id, "\n   caller: \n");
		console.trace();

		switch (id) {
			// *** XUL calls for dispachting and optional  fct call ***

			case 'addReminder4Contact':{
				this.dispatcher('abCard');
				this.dispatcher('mail');
				reminderfox.abCard.addReminder4Contact(arg);
				break;
			}

			case 'userIO':{
				this.dispatcher('userIO');
				reminderfox.userIO.go(arg);
				break;
			}

			case 'msgSendwReminder':{
				this.dispatcher('sendPlus');
				this.dispatcher('calDAV');
				reminderfox.sendPlus.reminder();
				break;
			}


			// *** just loading ****

			case 'mail':{
				this.dispatcher('mail');
				this.dispatcher('tagging');
				break;
			}
			case 'iCalMail':{
				this.dispatcher('mail');
				this.dispatcher('iCal');
				break;
			}
			case 'sendPlus':{
				this.dispatcher('sendPlus');
				this.dispatcher('tagging');
				this.dispatcher('mail');
				this.dispatcher('calDAV');
				break;
			}
			case 'tagging':{
				this.dispatcher('tagging');
				this.dispatcher('sendPlus');
				break;
			}
			case 'tag':{
				this.dispatcher('tagging');
				break;
			}

			case 'network':{
				this.dispatcher('network.upload');
				this.dispatcher('network.download');
				this.dispatcher('network.services');
				this.dispatcher('network.password');
				break;
			}

			case 'addDialog':{
				this.dispatcher('addDialog');
				this.dispatcher('iCal');
				break;
			}

			case 'addDialog0':{
				this.dispatcher('addDialog');
				break;
			}

			case 'http':{
				this.dispatcher('http');
				break;
			}
		}
	}
};


// ***************** .date.  based on 1.1.1900 *********************************
// *****************************************************************************

	/**
	 *  calculate Date Object from numDays
	 *     @param	numDays  (number as with Excel, starting with 1.Jan.1900)
	 *     @return	Date() object
	 */
	reminderfox.date.getDate= function(numDays) {
	//--------------------------------------------------------------------------
		return new Date(1900, 0, numDays - 1);
	};

	reminderfox.date.m1900 = Date.UTC(1899, 11, 30) / 86400000; /*
														 * 'Day one' -1 for
														 * calculations
														 */
	reminderfox.date.m1900Day = 1;  /* this a Monday */


	/**
	 *  Convert a Date Object to numDays
	 *     @param   Date()
	 *     @return	numDay  (number as with Excel, but starting with 1.1.1900)
	 *        null if not a valid date
	 */
	reminderfox.date.getDate1900= function(aDate) {
	//--------------------------------------------------------------------------
	//	var m1900 = Date.UTC(1899, 11, 30) / 86400000; /*
	//													 * 'Day one' -1 for
	//													 * calculations
	//													 */
		// 86400000 // 24 * 60 * 60 * 1000 = 1 day in ms
		if (!aDate)
			reminderfox.util.Logger('ALERT', " ****  aDate is NULL !  *****");		//§§§

		var numDay = Date.UTC(aDate.getFullYear(), aDate.getMonth(), aDate
				.getDate())
				/ 86400000 - reminderfox.date.m1900;
		return numDay;
	};


	/**
	 * Converts a date object to numDays (based on 1900) and vice versa
	 *    @param {integer} | {date object}
	 *    @return {date object} | {integer}
	 */
	reminderfox.date.convertDate= function (xDate) {
	var aDate;

	if (!xDate) reminderfox.util.Logger('ALERT'," reminderfox.date.convertDate  is null ");

		if (typeof(xDate) == "object") {
			aDate = this.getDate1900(xDate);
		} else {
			aDate = this.getDate(xDate);
		}
		return aDate;
	};

	reminderfox.date.getDateObject= function (xDate) {
		if (typeof(xDate) == "object") return xDate;
		return reminderfox.date.getDate(xDate);
	};

	reminderfox.date.getDateNum= function (xDate) {
		if (typeof(xDate) != "object") return xDate;
		return reminderfox.date.getDate1900(xDate);
	};


	/**  Get week number of Year for a Date Object or numDate1900
	 *     @param {Date() || integer}
	 *     @param {integer} start od week day; Sunday = 0;
	 */
reminderfox.date.getWeekOfYear= function(aDate, dowOffset) {
	//--------------------------------------------------------------------------
	if (typeof(aDate) != "object") {
		aDate = this.getDate(aDate);
	}
	var weekNumShow = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_WEEK_NUMS_PREF, 0);
			// Week Numbering:
			// 0 (none),
			// 1 (default),
			// 2 (ISO 8601)

		var newYear = new Date(aDate.getFullYear(), 0, 1);
		var day = newYear.getDay() - dowOffset; // the day of week the year begins on
		day = (day >= 0 ? day : day + 7);
		var daynum = Math
				.floor((aDate.getTime() - newYear.getTime() - (aDate
						.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
		var weeknum = Math.floor((daynum + day - 1) / 7);
		var useISO = weekNumShow == 2;
		if (!useISO || day < 4) { // if using ISO standard, first week w/ day starting after Wed are 0-week;
			weeknum = weeknum + 1; // otherwise, weeks start at 1
		}
		return weeknum;
	};


	/**
	 * Calculate number of days for a given month; correct for leap years
	 * @param {integer} month
	 * @param {integer} year
	 * @return {integer} no.of days
	 */
	reminderfox.date.getDaysInMonth= function(month, year) {
	//--------------------------------------------------------------------------
		var daysInMonth = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
		if ((month == 1) && (year % 4 === 0)
				&& ((year % 100 !== 0) || (year % 400 === 0))) {
			return 29;
		} else {
			return daysInMonth[month];
		}
	};



// *****************************************************************************
reminderfox.about= function() {
//--------------------------------------------------------------------------
	document.getElementById('rmFx_Version').setAttribute( "value",
		reminderfox.consts.MIGRATED_PREF_VERSION
			+ "     " + reminderfox.core.getPreferenceValue(reminderfox.consts.VERSION_STAMP));
	reminderfox.aboutXPI();
};



reminderfox.promiseRequest= {
//--------------------------------------------------------------------------
	get : function (url) {
		return new Promise(function(resolve, reject) {
			var req = new XMLHttpRequest();

			req.responseType = 'text';

			req.open('GET', url);

			req.onloadend = function() {
				if (req.status == 200) {
				// Resolve the promise with the response text
					resolve(req.responseText);
				}
				else {
					reject(Error(req.statusText));
				}
			};
			// Handle network errors
			req.onerror = function() {
				reject(Error("Network Error"));
			};
			// Make the request
			req.send();
		});
	}
}


/**
 * Query file with version details
 *
 * Typical File content:
 *    Reminderfox  [2.1.6] release
 *       as of:    Tue, 20 Feb 2018 13:47:42 +0100 (CET)
 *    'reminderfox_2.1.6_release_20180220_1347.xpi'   <'20180220_1347'>
 */
reminderfox.aboutXPI= function () {
//--------------------------------------------------------------------------
		var msg = "ReminderFox  [" + reminderfox.consts.MIGRATED_PREF_VERSION + "]     "
				+ reminderfox.core.getPreferenceValue(reminderfox.consts.VERSION_STAMP, "")
				+ "\n  Profile directory: "
				+ reminderfox.util.ProfD_extend('extensions').parent.path
				+ "\n  " + navigator.userAgent + " (" + navigator.language + ")";

		console.log("RmFX  [.aboutXPI] " + (new Date()) + "\n" + msg);
		reminderfox.util.copytoClipboard(msg);

		if (document.getElementById('logoText')) {
			document.getElementById('logoText').setAttribute( "tooltiptext", msg);

			document.getElementById('supportPage').setAttribute('value', reminderfox.consts.SUPPORT);
			sizeToContent();
		}
};



/**
 * Get the file object for the colorMap
 * read it from ProfD/reminder/calDAVmap.css
 * if not exsist, copy a default definition from extDir
 * return {object}  calDAVmap.css
 */
if (!reminderfox.colorMap)   reminderfox.colorMap = {};
//------ reminderfox.calDAV.colorMap Handling -------------------------- begin


reminderfox.colorMap.cssFileGet= function(){
//-------------------------------------------------------------
	var cssFile = reminderfox.util.ProfD_extend("reminderfox");
	cssFile.append("preferences");
	cssFile.append("calDAVmap.css");

	if (cssFile.exists() === false) {
		console.error("reminderfox.colorMap.cssFileGet::  Failed to find  'calDAVmap.css' ");
		return null;
	}
	return cssFile;
};


/**
 * Read the calDAV account color map
 */
reminderfox.colorMap.cssFileRead= function() {
//-------------------------------------------------------------
	var cssFile  = reminderfox.colorMap.cssFileGet();
	if (cssFile == null) {
		console.error("reminderfox.colorMap.cssFileRead::  Missing 'calDAV colorMap' file!");
		return
	}

	var cssString = reminderfox.core.readInFileContents (cssFile);
	var colorCode;
	var pos = 0;
	var num = 0;
	reminderfox.calDAV.colorMap = [];
	var saturation = reminderfox.core.getPreferenceValue(reminderfox.consts.CALDAV_SATURATION, reminderfox.consts.CALDAV_SATURATION_DEFAULT);
	if (saturation < 5) saturation = 5;
	var msg = "sat:" + saturation;

	while (num != 999) {
		pos = cssString.indexOf('caldav', pos + 6);
		if (pos == -1) break;
		num = +cssString.charAt(pos + 6);

		//treechildren::-moz-tree-row(caldav0) {background-color:#F9AFFA !important;} /* HSL(299,30,98) */
		var colorPos = cssString.indexOf('#',pos + 7) + 1;
		var colorCode0 = cssString.substring(colorPos, colorPos + 6);

		var HSL = reminderfox.colorUtil.getHsvByRgbCode(colorCode0);

		if (!reminderfox.calDAV.colorMap[num]) {
			reminderfox.calDAV.colorMap[num] = {};
			colorCode = reminderfox.colorUtil.getRgbCodeByHsv(HSL.hue, saturation, 98 /*B*/);
			reminderfox.calDAV.colorMap[num][0] = colorCode;
		} else {
			colorCode = reminderfox.colorUtil.getRgbCodeByHsv(HSL.hue, saturation, 40 /*B*/);
			reminderfox.calDAV.colorMap[num][1] = colorCode;
		}
		msg += '\n' + num + ':' + colorCode0 + ',' + colorCode;
	}

	reminderfox.colorMap.cssFileWrite();
};


reminderfox.colorMap.cssFileWrite= function () {
//-----------------------------------------------------
	var out = '/*-- tree color selectors --*/\n';

	var colorMapLength = reminderfox.calDAV.colorMap.length;

	for (var n = 0; n < colorMapLength; n++) {
		var colorCode = reminderfox.calDAV.colorMap[n][0];
		var HSL = reminderfox.colorUtil.getHsvByRgbCode(colorCode);
//treechildren::-moz-tree-row(caldav0) {background-color:#F4C8FA !important;} /* HSL(292,20,98) */
		out += 'treechildren::-moz-tree-row(caldav' + n + ') {background-color:#';
		out +=  colorCode + ' !important;}';
		out += ' /* HSL(';
		out +=       parseInt(HSL.hue, 10);
		out += ',' + parseInt(HSL.saturation*100, 10);
		out += ',' + parseInt(HSL.brightness*100, 10);
		out += ') */\n';

//treechildren::-moz-tree-row(caldav0, selected) {background-color:#635266 !important;}
		out += 'treechildren::-moz-tree-row(caldav' + n + ', selected) {background-color:#';
		out +=  reminderfox.calDAV.colorMap[n][1] + ' !important;}\n';
	}

// add the "spectrum" bar definition,
//   saturation is set with prefs, brightness is fixed = 98
	out +=  '\n#rmFx-calDAV-color-selector-hue {';
	out +=  '\nwidth:256px; height: 20px;';
	out +=  '\nbackground-image: -moz-linear-gradient(left center,';

	out +=  '#' + hsl(0)   + ' 1%,';     //'#ff0000 1%,'
	out +=  '#' + hsl(328) + ' 8%,';     //'#ff0088 8%,'
	out +=  '#' + hsl(300) + ' 16%,';     //'#ff00ff 16%,'
	out +=  '#' + hsl(272) + ' 24%,';     //'#8800ff 24%,'
	out +=  '#' + hsl(240) + ' 32%,';     //'#0000ff 32%,'
	out +=  '#' + hsl(208) + ' 40%,';     //'#0088ff 40%,'
	out +=  '#' + hsl(180) + ' 48%,';     //'#00ffff 48%,'
	out +=  '#' + hsl(152) + ' 56%,';     //'#00ff88 56%,'
	out +=  '#' + hsl(120) + ' 64%,';     //'#00ff00 64%,'
	out +=  '#' + hsl(88)  + ' 72%,';     //'#88ff00 72%,'
	out +=  '#' + hsl(60)  + ' 80%,';     //'#ffff00 80%,'
	out +=  '#' + hsl(32)  + ' 88%,';     //'#ff8800 88%,'
	out +=  '#' + hsl(0)   + ' 99%';     //'#ff0000 99%'
	out +=  ');\n}\n';

// add some links for CSS supporting
	out +=  '\n/* http://indeziner.com/design/css/how-to-create-a-color-spectrum-with-css3-gradients/ */';
	out +=  '\n/* http://www.colorpicker.com */';
	out +=  '\ncolorpicker {color: #626262;}';

	var cssFile = reminderfox.colorMap.cssFileGet();
	if (cssFile == null) {
		console.error("reminderfox.colorMap.cssFileWrite::  Missing 'calDAV colorMap' file!")
		return
	}
	reminderfox.util.makeFile8(out, cssFile.path)

		function hsl(colorHue) {
			var saturation = reminderfox.core.getPreferenceValue(reminderfox.consts.CALDAV_SATURATION, reminderfox.consts.CALDAV_SATURATION_DEFAULT);
			return reminderfox.colorUtil.getRgbCodeByHsv(colorHue, saturation, 98 /*B*/);
		}
};


/*
* load calDAVcolorMap and set the CSS file to respect prefs saturation  --------
*/
reminderfox.colorMap.setup= function () {
//-----------------------------------------------------
	reminderfox.colorMap.cssFileRead();

	var cssFile  = reminderfox.colorMap.cssFileGet();
	if (cssFile == null) {
		console.error("reminderfox.colorMap.setup::  Missing 'calDAV cssMap' file!")
		return
	}

	var sss = Cc["@mozilla.org/content/style-sheet-service;1"]
						.getService(Ci.nsIStyleSheetService);
	var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

	var uri = ios.newURI("file:" + cssFile.path, null, null);
	try {
		sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
	} catch (ex) {
		Cu.reportError(ex);
	}
};


/**
 *  Check reminderfox.calDAV.accounts. If accounts found, just return, if not read
 *  from file stored parallel to the current 'reminderfox.ics' with extension .ics.dav
 *  @param {string}  ics fileName
 */
reminderfox.calDAV.getAccounts = function () {
//-----------------------------------------------------
	var calDAVfile;
	var icsFile = reminderfox.core.getICSfile().path;

	var msg = "  ....  calDAV.getAccounts  "

	// no calDAV accounts? Or a file is given? --> read file
	if ((reminderfox.calDAV.accounts != null) && (Object.keys(reminderfox.calDAV.accounts ).length === 0)){

		calDAVfile = reminderfox.calDAV.accountsFile(icsFile);
		reminderfox.calDAV.accounts = JSON.parse(reminderfox.core.readInFileContents (calDAVfile));

		if (reminderfox.calDAV.accounts == null){
		// need to write an empty accounts file
			reminderfox.calDAV.accounts = {};
			reminderfox.calDAV.accountsWrite (reminderfox.calDAV.accounts);
		}

		var calDAVstatus = reminderfox.calDAV.accountsStatus()
	}
	return reminderfox.calDAV.accounts
}


reminderfox.calDAV.accountsStatus = function (calDAVaccounts) {
//-----------------------------------------------------
	if (calDAVaccounts == null) {
		calDAVaccounts = reminderfox.calDAV.accounts
	}
	var calDAVstatus = [];

	calDAVstatus.count = 0;
	calDAVstatus.active = 0;
	calDAVstatus.snap=""

	for (var account in calDAVaccounts) {
		if (calDAVaccounts[account].Active === true) calDAVstatus.active++;
		calDAVstatus.snap += "\n["+calDAVaccounts[account].ID + "] "
		calDAVstatus.snap += calDAVaccounts[account].Name + "  " + calDAVaccounts[account].calendarColor
		calDAVstatus.snap += " CTag:" + calDAVaccounts[account].CTag + " active:" + calDAVaccounts[account].Active;
		calDAVstatus.count++;
	}

	var sCalDAVaccounts = JSON.stringify (calDAVaccounts);

	calDAVstatus.pendingReminders = false
	if ((sCalDAVaccounts.search('"status":"0"') != -1) 			//Add
		|| (sCalDAVaccounts.search('"status":"-1"') != -1)		//Delete
		|| (sCalDAVaccounts.search('"status":"-2"') != -1)){	//Edit/Update
		calDAVstatus.pendingReminders = true;
	}

	return calDAVstatus;
};


/**
 *  Write the reminderfox.calDAV.accounts to 'reminderfox.ics.dav'
 *  in same dir as 'reminderfox.ics'
 *  @param {object} the CalDAVaccounts definition objects
 */
reminderfox.calDAV.accountsWrite= function (calDAVaccounts) {
//-------------------------------------------------------------
	var calDAVstatus = reminderfox.calDAV.accountsStatus (calDAVaccounts)

	if (!calDAVaccounts) calDAVaccounts = {};

	var xulWin =
			"window:reminderFoxEdit,window:reminderFoxOptions"
		+ ",window:reminderFoxAlarmDialog,window:reminderFoxReminderOptionsDialog"
		+ ",window:rmFxCaldavUpdate,navigator:browser"
		+ ",mail:3pane,mail:messageWindow"
		//+ ",calendarMainWindow"
	var xWin = xulWin.split(",")

	var windowManager = Cc["@mozilla.org/appshell/window-mediator;1"].getService();
	var windowManagerInterface = windowManager.QueryInterface(Ci.nsIWindowMediator);

	for (var aWin in xWin) {
		var windowEnumerator = windowManagerInterface.getEnumerator(xWin[aWin]);
		while (windowEnumerator.hasMoreElements()) {

			var currentWindow = windowEnumerator.getNext();
			currentWindow.reminderfox.calDAV.accounts = calDAVaccounts
		}
	}

	var calDAVaccountsNo = 0;
	for (var account in calDAVaccounts) {
		calDAVaccountsNo++;
	}

	var outputStr = JSON.stringify (calDAVaccounts);
	var file = reminderfox.calDAV.accountsFile();

	var mssg = " CalDAV accounts in: " + file.path
		+ " calDAVaccounts: " + calDAVstatus.count + calDAVstatus.snap;
	reminderfox.util.Logger('calDAV',  mssg);

	reminderfox.util.makeFile8(outputStr, file.path);
	return calDAVaccountsNo;
};


/**
 * Build file for CalDAV accounts in same location as 'reminderfox.ics' with
 * extension .dav
 * accounts file for 'reminderfox.ics' will be 'reminderfox.ics.dav'
 */
reminderfox.calDAV.accountsFile= function (currentFilePath) {
//-------------------------------------------------------------
	if (!currentFilePath) {
		currentFilePath = reminderfox.core.getICSfile().path;
	}
	var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	file.initWithPath(currentFilePath + ".dav");

	if (reminderfox.util.fileCheck(file.path) == 0) {
		console.log("RmFX  new .calDAV.accountsFile defined.");
		reminderfox.util.makeFile8("{}", file.path);
	}
	return file;
};


/**
 *  Clear all reminder details from all accounts in "reminderfox.calDAV.accounts"
 *  @param  {object} calDAVaccouts objects with all accouts and it's definitios and reminder relations
 */
reminderfox.calDAV.accountsClearReminderDetails= function (calDAVaccounts) {
//-------------------------------------------------------------
	// make a new accounts list
	var newAccounts = {};
	for (var account in calDAVaccounts) {

		newAccounts[account] = {};
		for (var name in calDAVaccounts[account]) {
			switch (name) {
				case 'ID'     : newAccounts[account][name] = calDAVaccounts[account][name]; break;
				case 'Typ'    : newAccounts[account][name] = calDAVaccounts[account][name]; break;
				case 'Active' : newAccounts[account][name] = calDAVaccounts[account][name]; break;
				case 'Name'   : newAccounts[account][name] = calDAVaccounts[account][name]; break;
				case 'Url'    : newAccounts[account][name] = calDAVaccounts[account][name]; break;
				case 'Login'  : newAccounts[account][name] = calDAVaccounts[account][name]; break;
				case 'Ctag'   : newAccounts[account][name] = calDAVaccounts[account][name]; break;
				case 'Color'  : newAccounts[account][name] = calDAVaccounts[account][name]; break;
			}
		}
	}
	return newAccounts;
};


/*
 *  Tree-row coloring
 *    see alsoo  https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Styling_a_Tree
 *
 *  @call  getStyle(cssStyleSheetName, rule)     @returns {string}
 *  @call  insertStyle(cssStyleSheetName, rule)  insert a new rule at index 0, an old rule will be removed
 *  @call  deleteStyle(cssStyleSheetName, rule)  @return  --
*
*   Examples:
*    reminderfox.styleUtil.insertStyle('caldav.css', "treechildren::-moz-tree-row(caldavI) {background-color:red !important;}")
*    reminderfox.styleUtil.deleteStyle('caldav.css', 'treechildren::-moz-tree-row(caldavI)');
*/
reminderfox.styleUtil = {
//-------------------------------------------------------------
	getStyle: function(styleSheet, rule) {
		let detail = "";
		this._findSheet(styleSheet);

		if (this._styleSheetNo != -1) {
			var r = this._findRule(rule);
			if (r != -1) {
				let classes = document.styleSheets[this._styleSheetNo].rules || document.styleSheets[this._styleSheetNo].cssRules;
				detail = (classes[r].cssText) ? (classes[r].cssText) : (classes[r].style.cssText);
	//			console.log("rmFX  rule", rule, detail);
			}
		}
		return detail;
	},

	deleteStyle: function(styleSheet, rule) {
		this._findSheet(styleSheet);
		if (this._styleSheetNo != -1) {
			let r = this._findRule(rule);
			if (r != -1) {
				document.styleSheets[this._styleSheetNo].deleteRule(r)
			}
		}
	},

	insertStyle: function(styleSheet, rule){
		this._findSheet(styleSheet);
		if (this._styleSheetNo != -1) {
			// delete a previous set rule
			this.deleteStyle(styleSheet, rule.split(' ')[0]);
			document.styleSheets[this._styleSheetNo].insertRule(rule, 0);
		}
	},

	_styleSheetNo : -1,

	_findSheet: function(styleSheet) {
		for (var x = 0; x < document.styleSheets.length; x++) {
			if (document.styleSheets[x].href.search(styleSheet) > -1) {
				this._styleSheetNo = x;
				break;
			}
		}
	},

	_findRule: function(rule){
		let classes = document.styleSheets[this._styleSheetNo].rules || document.styleSheets[this._styleSheetNo].cssRules;
		for (var x = 0; x < classes.length; x++) {
			if (classes[x].selectorText == rule) {
				return x;
			}
		}
		return -1;
	},
}


/**
 * This color util is based on colorpicker.com JS routines
 */
reminderfox.colorUtil = {
//--------------------------------------------------------------------
		/*
		 *  Color converted  rgb(red,green,blue) using Opacity to rgba(red,green,blue, opacity)
		 *   @param  {string}  rgbColor    ex:"#E6E0B8"
		 *   @return {string}  ex: rgba(113,26,118,0.15)
		 */
		convertRgb2RgbA : function(rgbColor) {

			var hsv = reminderfox.colorUtil.getHsvByRgbCode(rgbColor);
				//	hsv.hue
				//	hsv.saturation
				//	hsv.brightness

			var opacity = reminderfox.core.getPreferenceValue(reminderfox.consts.CALDAV_OPACITY,
				reminderfox.consts.CALDAV_OPACITY_DEFAULT);
			reminderfox.core.setPreferenceValue(reminderfox.consts.CALDAV_OPACITY, opacity);

			var rgb = reminderfox.colorUtil.getRgbColorsByHsv(hsv.hue, hsv.saturation, hsv.brightness)
			var rgba = "rgba(" + rgb.red + "," + rgb.green +"," + rgb.blue +"," + opacity/100 + ")"
			return rgba;
		},

		getRgbCodeByRgbColors : function(red, green, blue) {
			red = parseInt(red, 10).toString(16);
			green =  parseInt(green, 10).toString(16);
			blue =  parseInt(blue, 10).toString(16);
			red = red + "";
			green = green + "";
			blue = blue + "";
			while(red.length < 2) {
				red = "0" + red;
			}
			while(green.length < 2) {
				green = "0" + green;
			}
			while(blue.length < 2) {
				blue = "0" + "" + blue;
			}
			var rgbColor = red + "" + green + "" + blue;
			return rgbColor.toUpperCase();
		},

		getRgbColorsByHsv : function(hue, saturation, valueBrightness) {
			var Hi = Math.floor(hue / 60);
			var red; var green; var blue;
			if(hue == 360)
				hue = 0;
			var f = hue / 60 - Hi;
			if(saturation > 1)
				saturation /= 100;
			if(valueBrightness > 1)
				valueBrightness /= 100;
			var p = (valueBrightness * (1 - saturation));
			var q = (valueBrightness * (1 - (f * saturation)));
			var t = (valueBrightness * (1 - ((1 - f) * saturation)));
			switch(Hi) {
				case 0:
					red = valueBrightness;
					green = t;
					blue = p;
					break;
				case 1:
					red = q;
					green = valueBrightness;
					blue = p;
					break;
				case 2:
					red = p;
					green = valueBrightness;
					blue = t;
					break;
				case 3:
					red = p;
					green = q;
					blue = valueBrightness;
					break;
				case 4:
					red = t;
					green = p;
					blue = valueBrightness;
					break;
				default:
					red = valueBrightness;
					green = p;
					blue = q;
					break;
			}
			if(saturation === 0) {
				red = valueBrightness;
				green = valueBrightness;
				blue = valueBrightness;
			}
			red *= 255;
			green *= 255;
			blue *= 255;
			red = Math.round(red);
			green = Math.round(green);
			blue = Math.round(blue);
			return {
				red : red,
				green : green,
				blue : blue
			};
		},

		getRgbCodeByHsv : function(hue, saturation, valueBrightness) {
			while(hue >= 360)
			hue -= 360;
			var colors = this.getRgbColorsByHsv(hue, saturation, valueBrightness);
			return this.getRgbCodeByRgbColors(colors.red, colors.green, colors.blue);
		},

		getHsvByRgbCode : function(rgbColor) {
			rgbColor = rgbColor.replace('#', '');
			var red = this.baseConverter(rgbColor.substr(0, 2), 16, 10);
			var green = this.baseConverter(rgbColor.substr(2, 2), 16, 10);
			var blue = this.baseConverter(rgbColor.substr(4, 2), 16, 10);
			if(red === 0 && green === 0 && blue === 0) {
				var returnArray = {};
				returnArray.hue = 0;
				returnArray.saturation = 0;
				returnArray.brightness = 0;
				return returnArray;
			}
			red = red / 255;
			green = green / 255;
			blue = blue / 255;
			var maxValue = Math.max(red, green, blue);
			var minValue = Math.min(red, green, blue);
			var hue = 0;
			var saturation = 0;
			if(maxValue == minValue) {
				hue = 0;
			} else {
				if(red == maxValue) {
					hue = (green - blue) / (maxValue - minValue) / 1;
				} else if(green == maxValue) {
					hue = 2 + (blue - red) / 1 / (maxValue - minValue) / 1;
				} else if(blue == maxValue) {
					hue = 4 + (red - green) / (maxValue - minValue) / 1;
				}
				saturation = (maxValue - minValue) / maxValue;
			}
			hue = hue * 60;
			var valueBrightness = maxValue;
			if(hue < 0)
				hue += 360;
			var returnArray = {};
			returnArray.hue = hue;
			returnArray.saturation = saturation;
			returnArray.brightness = valueBrightness;
			return returnArray;
		},

		baseConverter : function(numberToConvert, oldBase, newBase) {
			if(newBase == 10) {
				return parseInt(numberToConvert, 16);
			}
			if(newBase == 16) {
				return parseInt(numberToConvert, 10).toString(16);
			}
			numberToConvert = numberToConvert + "";
			numberToConvert = numberToConvert.toUpperCase();
			var listOfCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
			var dec = 0;
			for(var i = 0; i <= numberToConvert.length; i++) {
				dec += (listOfCharacters.indexOf(numberToConvert.charAt(i))) * (Math.pow(oldBase, (numberToConvert.length - i - 1)));
			}
			numberToConvert = "";
			var magnitude = Math.floor((Math.log(dec)) / (Math.log(newBase)));
			for(var i = magnitude; i >= 0; i--) {
				var amount = Math.floor(dec / Math.pow(newBase, i));
				numberToConvert = numberToConvert + listOfCharacters.charAt(amount);
				dec -= amount * (Math.pow(newBase, i));
			}
			if(numberToConvert.length === 0)
				numberToConvertToConvert = 0;
			if(!numberToConvert)
				numberToConvert = 0;
			return numberToConvert;
		},
	};


function reminderfox_isReminderTabSelected(){
	var isReminder = false;
	if (reminderfox.tabInfo.tabIndex === 0) {
		isReminder = true;
	}
	else {
		if (reminderfox_isSubscribedCalendarTabSelected()) {
			isReminder = true;
		}
	}
	return isReminder;
}


reminderfox.util.layoutStatus= function () {
//-----------------------------------------
	var status = -1;
	var mainDialog  = reminderfox.util.getWindow("window:reminderFoxEdit");
	if (mainDialog) {
		mainDialog.focus();
		status = +mainDialog.reminderfox.calendar.layout.status;
	}
	return status;
};


/*
 * Open a panel with a picture with hovering over a image/thumb picture.
 * The image DOM definition 'tooltipText' and 'src' are used for title and real picture name.
 * 'src' for the thumb picture has '.thumb.' in the name, for the real picture name that is stripped off.
 * example:
 *   <image class="rmFx_pic" id="rmFx_pic0" tooltiptext="Google Authorisation Request -- Requires [Accept]"
 *    src='https://dl.dropboxusercontent.com/u/35444930/rmFXxpiPictures/gCal_AuthPermission.thumb.png'
 *    onmouseover="reminderfox.util.picturePanel(this)" />
 *
 * @param  'anchor'  dom element
 *  */
reminderfox.util.picturePanel = function showPicture(anchor) {
//-----------------------------------------
	var srcName = anchor.src.replace(".thumb.",".");
	document.getElementById("rmFx_picture_src").src = srcName;
	document.getElementById("rmFx_picture_label").value = anchor.tooltipText;

	var picPanel = document.getElementById("rmFx_pic_panel");
	picPanel.hidePopup();
	picPanel.removeAttribute('hidden');
	picPanel.openPopup(anchor, 'end_before', -1, -1);
};


/**
 * Check if the current tab is a Subscription List
 * @return {boolean}
 */
function reminderfox_isSubscribedCalendarTabSelected(){
	var subscribedCalendarTabSelected = false;

	try {
		var subscriptions = reminderfox.core.getSubscriptions();
		var url = subscriptions[reminderfox.tabInfo.tabName];
		if (url  && url.length > 0) {
			subscribedCalendarTabSelected = true;
		}
	} catch (ex) {}
	return subscribedCalendarTabSelected;
}


/**
 * Reorder the 'Sync' Option tabs for Remote / CalDAV,
 * if CalDAV accounts are defined, set the CalDAV tab as first.
 */
function rmFx_calDAV_syncTABreorder(calDAVaccounts, networkSync) {
//-------------------------------------------
//	reminderfox.util.Logger('Alert', "  _syncTABreorder  calDAVaccounts.active, networkSync : "
//		+ calDAVaccounts.active +"|" + networkSync)

	if (calDAVaccounts.active) {
		reorder(1,2,0);		// changing the tab order: CalDAV, Remote, About
	} else  if (networkSync){
		reorder(2,1,0);		// changing the tab order: Remote, CalDAV, About
	} else {
		reorder(0,1,2);		// changing the tab order: About, CalDAV, Remote
	}

	function reorder (sOrder1, sOrder2, sOrder3) {
		var sLabel = [reminderfox.string("rf.caldav.sync.about"),
						reminderfox.string("rf.caldav.calendars"),
						document.getElementById("rServer").getAttribute("value1")];

		var sLink  = ['infoPanel', 'calDAV_calendars', 'reminderFoxVbox4'];

		var panel1 = document.getElementById("panel1");
		var panel2 = document.getElementById("panel2");
		var panel3 = document.getElementById("panel3");

		panel1.setAttribute('label', sLabel[sOrder1]);
		panel1.setAttribute('linkedpanel', sLink[sOrder1]);

		panel2.setAttribute('label', sLabel[sOrder2]);
		panel2.setAttribute('linkedpanel', sLink[sOrder2]);

		panel3.setAttribute('label', sLabel[sOrder3]);
		panel3.setAttribute('linkedpanel', sLink[sOrder3]);

		var tabbox = document.getElementById('content-tabs');
		tabbox.selectedIndex = tabbox.selectedIndex;
	}
}


/**
 * Query a remote system (Mozilla)  to check on/offline
 */
reminderfox.online = {
//--------------------------------------------------------------------------
	status : function () {
		var foxy = document.getElementById("rmFx-foxy-icon-small");
		var msg = "  System status"

		if (navigator.onLine) {
			if (foxy != null)
				foxy.setAttribute('mode', 'online');

			msg += " +++ ONLINE +++"
			rmFx_CalDAV_updatePending();

		} else {
			if (foxy != null)
				foxy.setAttribute('mode', 'offline');

			msg += " --- OFFINE ---"
			reminderfox.util.Logger('calDAV',msg)
			reminderfox.core.statusSet(msg, true)

		}
	}
};


/**
 * Support "Reminderfox NEWS"
 */
if (!reminderfox.go4news)    reminderfox.go4news = {};

// in /defaults/preferences/reminderfox.js
//pref("extensions.reminderFox.news", true);   // last news status, set after reading to false
//pref("extensions.reminderFox.newsStamp", "[2015-10-01]" );   // last news date
//pref("extensions.reminderFox.newsLink", "https://neandr.github.io/reminderfox/rmFXnews");

// in reminderFoxCore.js
//reminderfox.consts.NEWS
//reminderfox.consts.NEWSSTAMP
//reminderfox.consts.NEWSLINK


reminderfox.go4news = {
//------------------------------------------------------------------------------
	currentNewsDate : "",
	currentNews : "--",
	urlNews: "https://neandr.github.io/reminderfox/rmFXnews",


	/**
	 * Called at startup of reminderfox to check for new News
	 */
	status : function () {  // this run *only* at FX/TB startup !
		this.get('go4_news',
		this.urlNews,
		'statusUpdate')
	},
	statusUpdate : function () {
		var newsStatus = reminderfox.core.getPreferenceValue(reminderfox.consts.NEWS, false);
		var newsStamp = reminderfox.core.getPreferenceValue(reminderfox.consts.NEWSSTAMP, "");
		var newsLink = reminderfox.core.getPreferenceValue(reminderfox.consts.NEWSLINK, this.urlNews);
		var msg;

		// update items to show button [Reminderfox News] on MainDialog
		if ((newsLink != "") && (this.currentNewsDate > newsStamp)){
			msg = "Reminderfox NEWS   available: " + this.currentNewsDate;
			reminderfox.core.setPreferenceValue(reminderfox.consts.NEWSSTAMP, this.currentNewsDate);
			reminderfox.core.setPreferenceValue(reminderfox.consts.NEWS, true);
		}
		else {
			msg = "Reminderfox NEWS   Not new:  " + this.currentNewsDate;
			reminderfox.core.getPreferenceValue(reminderfox.consts.NEWS, false);
		}
		console.log(msg);
		return
	},

	/**
	 *  Read&Display RmFX News, called from Main Menu
	 */
	callNews: function () {
		this.get('go4_news',
			this.urlNews,
		 	'openNews')
	},
	openNews : function () {
		// Open news and hide button so a News is only presented once
		// With Main Menu item user can always open News directely
	//	reminderfox.util.PromptAlert(this.currentNews);
		var url = this.urlNews + this.currentNewsDate + ".html";
		reminderfox.util.openURL(url, 'rmFXnews');

		reminderfox.core.setPreferenceValue(reminderfox.consts.NEWS, false)
		document.getElementById('reminderfox-News-box').setAttribute( "hidden", true);
	},

	get : function (callback, url, callnext) {
			this.method       = 'GET';
			this.urlstr       = url;

			this.body         = '';
			this.contentType  = 'text/xml';
			this.headers      = null;

			this.username     = "";
			this.password     = "";

			this.timeout      = 30;

			this.callback     = callback;
			this.onError      = callback;
			this.callnext     = callnext

		reminderfox.HTTP.request(this);
	},

	/**
	 *   Reads the actual newsDate from remote
	 */
	go4_news : function (status, xml, text, headers, statusText, call) {
		if (status === 0 || (status >= 200 && status < 300)) {
			var parser = new DOMParser();
			var aText = parser.parseFromString(text, "text/html");

			this.currentNews = aText.body.textContent.replace(/\n /g,'\n').replace(/\n \n/g,'\n').replace(/n\n/g,'\n').replace(/\n\n\n/g,'\n');

			var nLines = this.currentNews;
			var n1 = nLines.search('\\[');
			var n2 = nLines.search('\\]') +1;
			this.currentNewsDate = nLines.substring(n1,n2);

			if (call.callnext != null) {
				call[call.callnext]()
			}

		} else {  // ERROR Handling
			console.log("Reminderfox  NEWS missing: Check News address ");
		}
	},

	/**
	 * Called with opening the Main Dialog to show the button [Reminderfox News]
	 * pending on prefs setting (hidden or display)
	 */
	setButton : function () {
		var newsStatus = reminderfox.core.getPreferenceValue(reminderfox.consts.NEWS, false)
		if (newsStatus == true) {
			document.getElementById('reminderfox-News-box').removeAttribute("hidden");
		}
		if (newsStatus == false) {
			document.getElementById('reminderfox-News-box').setAttribute( "hidden", true);
		}
	}
};



//===== Supporting prefs    gW: 2017-12-20 ==========
/*
 * Supporting prefs
 * This may not be necessary, but added in the case m-c or c-c would disable supporting
 * prefs for 'classic' addon types.
 *
 * Table Support is using
 *    https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Sorting_and_filtering_a_custom_tree_view
 *
 * A tab:Prefs is shown with prefs:prefsPanel == true
 * Use about:config to change status
 * Key functions (with tab:Prefs enabled):
 *   Cntrl p    Editing of a specific, selected prefs
 *   Cntrl q    Disable tab.Prefs (see below)
 *
 */

if (!rmFXprefsService) var rmFXprefsService = {};

rmFXprefsService.table = null;
rmFXprefsService.data = null;
rmFXprefsService.prefTree;
rmFXprefsService.filterText = "";
rmFXprefsService.selectedRow;
rmFXprefsService.itemEdited = null;

// Check it tab:Prefs is selected
rmFXprefsService.isPrefsPanel= function(){
    var tabs = document.getElementById("optionsTabs");
    return (tabs._selectedPanel.id == "prefsPanel");
}

/*
 * Disable the tab:Prefs
 * After closing Options, the tab:Prefs not be shown,
 * reenable with using about:config for 'prefsPanel' set to true
 */
rmFXprefsService.prefsPanelClose= function(){
    if (rmFXprefsService.isPrefsPanel()) {
        reminderfox.core.setPreferenceValue('prefsPanel' , false);
    }
};

// get all 'reminderFox' prefs
rmFXprefsService.getPrefs= function(){
    var prefBranch = Services.prefs.getBranch(reminderfox.consts.REMINDER_FOX_PREF + ".");
    var jPrefs = prefBranch.getChildList("");

    var pValue, uValue, pType, ptype;
    rmFXprefsService.data = [];
    for (var aPrefs in jPrefs) {

        ptype = prefBranch.getPrefType(jPrefs[aPrefs]);
        if (ptype == 128) {
            pType = 'bool';
            pValue = prefBranch.getBoolPref(jPrefs[aPrefs]);
        } else if  (ptype == 64){
            pType = 'integer';
            pValue = prefBranch.getIntPref(jPrefs[aPrefs]);
        } else if  (ptype == 32){
            pType = 'string';
            pValue = prefBranch.getCharPref(jPrefs[aPrefs]);
        }

        uValue = (prefBranch.prefHasUserValue(jPrefs[aPrefs]) == false) ? 'default' : 'user set'

        rmFXprefsService.data.push({
            prefName: jPrefs[aPrefs],
            prefValue: pValue,
            prefType: pType,
            prefUserValue: uValue
        });
    }
};

rmFXprefsService.init= function (filterClear) {
    if (filterClear == true){
        rmFXprefsService.filterText = "";
        document.getElementById("rmFXprefsService.filter").value ="";
    }
    rmFXprefsService.prefTree = document.getElementById("prefTree");
    rmFXprefsService.loadTable(filterClear);
}

//this function is called every time the tree is sorted, filtered, or reloaded
rmFXprefsService.loadTable= function(filterClear) {
    //remember scroll position. this is useful if this is an editable table
    //to prevent the user from losing the row they edited
    var topVisibleRow = null;
    if (rmFXprefsService.table) {
        topVisibleRow = rmFXprefsService.getTopVisibleRow();
    }
    rmFXprefsService.getPrefs();

    if (rmFXprefsService.filterText == "" && (filterClear == true)) {
        //show all of them
        rmFXprefsService.table = rmFXprefsService.data;
    } else {
        //filter out the ones we want to display
        rmFXprefsService.table = [];
        rmFXprefsService.data.forEach(function(element) {
            //we'll match on every property which is a 'string'
            for (var i in element) {
                if (typeof element[i] == "string") {
                    if (rmFXprefsService.prepareForComparison(element[i])
                        .indexOf(rmFXprefsService.filterText.toLowerCase()) != -1) {
                        rmFXprefsService.table.push(element);
                        break;
                    }
                }
                if (typeof element[i] == "number") {
                    if (element[i] == +rmFXprefsService.filterText) {
                        rmFXprefsService.table.push(element);
                        break;
                    }
                }
            }
        });
    }

    rmFXprefsService.sort();
    //restore scroll position
    if (topVisibleRow) {
        rmFXprefsService.setTopVisibleRow(topVisibleRow);
    }
    rmFXprefsService.selectedRow= null;
}

//   Enable table row selection to get access of selected row details
rmFXprefsService.treeOp= function(xtable) {
    rmFXprefsService.selectedRow = rmFXprefsService.table[xtable.currentIndex]
}

rmFXprefsService.treeRow= function(mode){
    var d= "";
    if (!rmFXprefsService.selectedRow) return;
    if (mode == 'all') {
        d = rmFXprefsService.selectedRow.prefName
            +"; " + rmFXprefsService.selectedRow.prefValue
            +"; " + rmFXprefsService.selectedRow.prefType
            +"; " + rmFXprefsService.selectedRow.prefUserValue;
    }
    if (mode == 'name'){
        d= rmFXprefsService.selectedRow.prefName;
    }
    if (mode == 'value'){
        d= rmFXprefsService.selectedRow.prefValue;
    }
    if (mode == 'edit'){
        d = {"name":rmFXprefsService.selectedRow.prefName,
             "type": rmFXprefsService.selectedRow.prefType,
             "value":rmFXprefsService.selectedRow.prefValue,
             "user":rmFXprefsService.selectedRow.prefUserValue}
    }

    var fileChanged = reminderfox.core.timeStampHasChanged();
    reminderfox.util.copytoClipboard(d)
    return d;
};


// Edit prefs item via options.xul
rmFXprefsService.prefsEdit= function(mode){
    if (rmFXprefsService.isPrefsPanel() == false) return;

    rmFXprefsService.itemEdited = rmFXprefsService.treeRow(mode);

    document.getElementById("prefsEditLabel").label = "Edit Preference item '" + rmFXprefsService.itemEdited.name + "'";
    document.getElementById("prefsEditBool").setAttribute("hidden","true");
    document.getElementById("prefsEditString").setAttribute("hidden","true");

    switch (rmFXprefsService.itemEdited.type) {
        case "bool" :
            document.getElementById("prefsEditBool").removeAttribute("hidden");
            document.getElementById("prefsBoolToggle").label = rmFXprefsService.itemEdited.value;
            break;
        case "string" :
        case "integer" :
            document.getElementById("prefsEditString").removeAttribute("hidden");
            document.getElementById("prefsEditStringBox").value = rmFXprefsService.itemEdited.value;
            break;
    }

    var anchor = document.getElementById("prefsLoad");
    var panel  = document.getElementById("editPrefsPanel");
    panel.removeAttribute('hidden');
    panel.openPopup(anchor, 'bottomleft topright', -1, -1);
}

rmFXprefsService.editBool= function(xthis){
    xthis.label = (xthis.label == "true") ? false : true;
    rmFXprefsService.itemEdited.value = xthis.label;
    rmFXprefsService.editSetItem();
};

rmFXprefsService.editApply= function(){
    if(rmFXprefsService.itemEdited.type == "bool"){
        rmFXprefsService.itemEdited.value= (document.getElementById("prefsBoolToggle").label =='false') ? false : true;
    } else {
        rmFXprefsService.itemEdited.value= document.getElementById("prefsEditStringBox").value;
    }
    rmFXprefsService.editSetItem ();
    rmFXprefsService.loadTable(false);
    rmFXprefsService.panelClose();
}

rmFXprefsService.editSetItem= function(){
    var type = rmFXprefsService.itemEdited.type;
    type = (type == "bool"? ('setBoolPref') : ((type=="integer") ? ('setIntPref') : 'setCharPref'));
    reminderfox._prefsBRANCH[type](rmFXprefsService.itemEdited.name,  rmFXprefsService.itemEdited.value);
};

rmFXprefsService.panelClose= function(){
    document.getElementById("editPrefsPanel").setAttribute("hidden", "true");
    rmFXprefsService.itemEdited = null;
};


rmFXprefsService.exportTable= function() {
    reminderFox_exportPrefs(rmFXprefsService.table, true);
}


//generic custom prefTree view stuff
prefsTreeView= function(table) {
    this.rowCount = table.length;
    this.getCellText = function(row, col) {
        return table[row][col.id];
    };
    this.getCellValue = function(row, col) {
        return table[row][col.id];
    };
    this.setTree = function(treebox) {
        this.treebox = treebox;
    };
    this.isEditable = function(row, col) {
        return col.editable;
    };
    this.isContainer = function(row){ return false; };
    this.isSeparator = function(row){ return false; };
    this.isSorted = function(){ return false; };
    this.getLevel = function(row){ return 0; };
    this.getImageSrc = function(row,col){ return null; };
    this.getRowProperties = function(row,props){};
    this.getCellProperties = function(row,col,props){};
    this.getColumnProperties = function(colid,col,props){};
    this.cycleHeader = function(col, elem) {};
}

rmFXprefsService.sort= function(column) {
    document.getElementById("rmFXprefsService.length").value = rmFXprefsService.table.length;

    var columnName;
    var order = rmFXprefsService.prefTree.getAttribute("sortDirection") == "ascending" ? 1 : -1;
    //if the column is passed and it's already sorted by that column, reverse sort
    if (column) {
        columnName = column.id;
        if (rmFXprefsService.prefTree.getAttribute("sortResource") == columnName) {
            order *= -1;
        }
    } else {
        columnName = rmFXprefsService.prefTree.getAttribute("sortResource");
    }

    function columnSort(a, b) {
        if (rmFXprefsService.prepareForComparison(a[columnName]) > rmFXprefsService.prepareForComparison(b[columnName])) return 1 * order;
        if (rmFXprefsService.prepareForComparison(a[columnName]) < rmFXprefsService.prepareForComparison(b[columnName])) return -1 * order;
        //tie breaker: name ascending is the second level sort
        if (columnName != "name") {
            if (rmFXprefsService.prepareForComparison(a["name"]) > rmFXprefsService.prepareForComparison(b["name"])) return 1;
            if (rmFXprefsService.prepareForComparison(a["name"]) < rmFXprefsService.prepareForComparison(b["name"])) return -1;
        }
        return 0;
    }
    rmFXprefsService.table.sort(columnSort);
    //setting these will make the sort option persist
    rmFXprefsService.prefTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
    rmFXprefsService.prefTree.setAttribute("sortResource", columnName);
    rmFXprefsService.prefTree.view = new prefsTreeView(rmFXprefsService.table);
    //set the appropriate attributes to show to indicator
    var cols = rmFXprefsService.prefTree.getElementsByTagName("treecol");
    for (var i = 0; i < cols.length; i++) {
        cols[i].removeAttribute("sortDirection");
    }
    if (document.getElementById(columnName) != null) {
       document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
    }
}

//prepares an object for easy comparison against another. for strings, lowercases them
rmFXprefsService.prepareForComparison= function(o) {
    if (typeof o == "string") {
        return o.toLowerCase();
    }
    return o;
}

rmFXprefsService.getTopVisibleRow= function() {
    return rmFXprefsService.prefTree.treeBoxObject.getFirstVisibleRow();
}

rmFXprefsService.setTopVisibleRow= function(topVisibleRow) {
    return rmFXprefsService.prefTree.treeBoxObject.scrollToRow(topVisibleRow);
}


rmFXprefsService.inputFilter= function(event) {
    //do this now rather than doing it at every comparison
    var value = rmFXprefsService.prepareForComparison(event.target.value);
    rmFXprefsService.setFilter(value);
    document.getElementById("clearFilter").disabled = value.length == 0;
}

rmFXprefsService.clearFilter= function() {
    document.getElementById("clearFilter").disabled = true;
    var filterElement = document.getElementById("rmFXprefsService.filter");
    filterElement.focus();
    filterElement.value = "";
    rmFXprefsService.setFilter("");
}

rmFXprefsService.setFilter= function () {
    rmFXprefsService.filterText = document.getElementById("rmFXprefsService.filter").value;
    rmFXprefsService.loadTable();
}

/* Fix to show the menulist-dropmarker under newer GTK3 versions */
//menulist[editable="true"] > .menulist-dropmarker {
//  min-width: 2em;
//}


/* https://stackoverflow.com/questions/1774009/os-specific-css
reminderfox.util.changeStyle= function() {
	var ret = false;

	var css = document.createElement('link');
	css.rel="stylesheet";
	css.type = 'text/css';

	if (navigator.userAgent.search('Linux')!=-1){ //* IF is Linux
		css.href = '/chrome/skin/reminderfox/unix/gtk3linux.css';
		document.getElementsByTagName("head")[0].appendChild(css);
		ret = true;
	}
	return ret;
}
*/


reminderfox.util.listItemMoveUp=function(_list) {
	var _box = document.getElementById(_list);
	var _index = _box.selectedIndex;

	if(_index > 0) {
		_box.insertBefore(_box.removeChild(_box.childNodes[_index]),_box.childNodes[_index - 1]);
		_box.selectedIndex = _index - 1;
	}
};

reminderfox.util.listItemMoveDown=function(_list) {
	var  _box = document.getElementById(_list);
	var _index = _box.selectedIndex;

	if (_index ==  _box.childNodes.length - 2 ) {
		_box.appendChild(_box.removeChild(_box.childNodes[_index]));
		_box.selectedIndex =  _box.childNodes.length - 1;;
	}
	else if (_index < _box.childNodes.length - 1 ) {
		_box.insertBefore(_box.removeChild(_box.childNodes[_index+1]), _box.childNodes[_index] );
		_box.selectedIndex = _index + 1;
	}
}

reminderfox.util.testing=function(){

	console.log("******* entry for testing ********");

	var x =0;

	console.log("******* testing done ********");

};
