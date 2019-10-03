// ********   .calendar ******************************************** //gWCalndr
// *****************************************************************************

if (!reminderfox)     var reminderfox = {};
if (!reminderfox.calendar)    reminderfox.calendar = {};
if (!reminderfox.calendar.ui)    reminderfox.calendar.ui = {};
if (!reminderfox.calendar.ttt)    reminderfox.calendar.ttt = {};
if (!reminderfox.calendar.grid)    reminderfox.calendar.grid = {};
if (!reminderfox.calendar.dateArray)    reminderfox.calendar.dateArray = {};
if (!reminderfox.calendar.store)    reminderfox.calendar.store = {};
if (!reminderfox.calendar.layout)    reminderfox.calendar.layout = {};
if (!reminderfox.calendar.filter)    reminderfox.calendar.filter = {};



reminderfox.calendar.numDateMonths = [];       // array containing numDays for the .first and .last day of displayed months on the grid
reminderfox.calendar.numDateFirstMonth = null; // day one of first month on the grid
reminderfox.calendar.numDateStart = null;      // start day for .calendar.numDateMonths
reminderfox.calendar.numDateEnd = null;        // day day for .calendar.numDateMonths
reminderfox.calendar.numMonth = reminderfox.consts.CALENDAR_MONTHS_DEFAULT;    // how many month shown -- default value
reminderfox.calendar.daysCarryOver = 10;       // config/pref?  expands date # days back for carry over multi day events

//  '.selectedEvents' [object] holding events at '.selectedDate'
//  '.selectedDate' {integer/numDate}  will be set with all day-popups on the calendar widget
reminderfox.calendar.selectedEvents = [];
reminderfox.calendar.selectedDate = null;

// used as flag to prevend 'onselect' from List tree,
// see 'calendarWidget.js, addReminderDialog.js, reminderSelected()/todoSelected()
reminderfox.calendar.drawList = true;


// Calendar :           id="rmFx_layout0"
// List and Calendar :  id="rmFx_layout1"
// List :               id="rmFx_layout2"
reminderfox.calendar.layout.status = 0;				// current layout


/**
 * On open mainDialog, save the current persit values to SMALL_ or WIDE_ set
 * based on 'layout'
 *	persist="screenX screenY width height
 *		tab layout textSize textSizeList
 *		SMALL_width SMALL_height SMALL_screenX SMALL_screenY
 *		WIDE_width WIDE_height WIDE_screenX WIDE_screenY lxX lxY">
 *
 *   layout -1 = Calendar Widget (call with icon on apps main toolbar),
 *           0 = Calendar only, 1 = Calendar + List, 2 = List only
 */
reminderfox.calendar.layout.Setup= function () {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var layout = document.documentElement.attributes.layout.value;

	if (layout == -1 || layout > 2 || layout == "" || !layout) {
		layout = 1;
		document.documentElement.attributes.layout.value = 1;
	}

	document.getElementById("reminderfox-calendar-box-widget").setAttribute('style', 'font-size:' +
		document.documentElement.attributes.textSize.value + 'px');

	document.getElementById("rmFx-MainDialog-List-Calendar").setAttribute('style', 'font-size:' +
		document.documentElement.attributes.textSizeList.value + 'px');

	reminderfox.calendar.layout.status = layout;
	reminderfox.calendar.layout.menuChange(layout);
	reminderfox.calendar.layout.menuSelect();

	// remember persistant values for 'small' and 'wide' layout
	var id = "WIDE";
	if (layout == 0) id = "SMALL";

	document.documentElement.attributes[id+"_width"].value = document.documentElement.attributes.width.value;
	document.documentElement.attributes[id+"_height"].value = document.documentElement.attributes.height.value;

	reminderfox.calendar.layout.XY();

	reminderfox.calendar.setDay();
};


/*
 * 	Set persistant values for 'small' and 'wide' layout
 */
reminderfox.calendar.layout.Set= function (layout) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if (reminderfox.calendar.layout.status == layout) return;

	var id = "WIDE";
	if (+layout == 0) id = "SMALL";

	window.outerWidth = +document.documentElement.attributes[id+"_width"].value;
	window.outerHeight = +document.documentElement.attributes[id+"_height"].value;

	document.documentElement.attributes.layout.value = layout;
	reminderfox.calendar.layout.status = +layout;
};



reminderfox.calendar.layout.XY= function () { // used only for debugging
//------------------------------------------------------------------------------
	var docu = document.documentElement;

	var logMsg = "   Layout:" + docu.attributes.layout.value +
		"\n   width:" + docu.attributes.width.value + "  height:" + docu.attributes.height.value +
		"\n   SMALL_width:" + docu.attributes.SMALL_width.value + "  WIDE_width:" + docu.attributes.WIDE_width.value +
		"\n   screenX:" + docu.attributes.screenX.value + "   screenY:" + docu.attributes.screenY.value +
		"\n   SMALL_screenX:" + docu.attributes.SMALL_screenX.value + "  SMALL_screenY:" + docu.attributes.SMALL_screenY.value +
		"\n   WIDE_screenX:" + docu.attributes.WIDE_screenX.value + "  WIDE_screenY:" + docu.attributes.WIDE_screenY.value +
		"\n   mozInnerScreenY:" +window.mozInnerScreenY + "  screenY" + window.screenY;
	reminderfox.util.Logger('calndrGrid', logMsg);
};


reminderfox.calendar.layout.Save= function (layout) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var id = "WIDE";
	if (+layout == 0) id = "SMALL";

	document.documentElement.attributes[id+"_width"].value = window.outerWidth;
	document.documentElement.attributes[id+"_height"].value = window.outerHeight;
/*---
	docu.attributes[id+"_screenX"].value = window.screenX;
	docu.attributes[id+"_screenY"].value = window.screenY;

	docu.attributes.screenX.value = window.screenX;
	docu.attributes.screenY.value = window.screenY;

	// HACK  to get correct poisitioning with Xubuntu
	if (navigator.userAgent.search('Linux') > 0) {
	//	docu.attributes.lxX.value = window.mozInnerScreenX - window.screenX;
	//	docu.attributes.lxY.value = window.mozInnerScreenY - window.screenY;
	}
----*/
//reminderfox.util.Logger('calndrLayout', '.calendar.layout.SAVE   ' + '\n    layout : '+ layout);
};


/**
 *   Change 'layout'
 *     'Calendar' only  -- default/open
 *     'Calendar and List'
 *     'List'
 */
reminderfox.calendar.layout.change= function (newLayout) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.calendar.ui.panelClose();

	// tfm: Aug 14, 2012: seems like the panelClose only works when called via
	// a setTimeout.
	// gW: this is because we need to return value to be able to kill a pending
	// function
	reminderfox.calendar.popupID = setTimeout(function () {
			reminderfox.calendar.ui.panelClose();}, 1);

	// get it from persit of window and save it
	var layout = +document.documentElement.attributes.layout.value;
	reminderfox.calendar.layout.Save(layout);

	if (newLayout == null) {
		layout++;
		if (layout == 3) layout = 0;
	} else {
		layout = newLayout;
	}
	reminderfox.calendar.filter.close();
	setTimeout(function () {
		reminderfox.calendar.layout.Set(layout);
		reminderfox.calendar.ui.selectDay(); // hold the grid
		reminderfox.calendar.layout.menuChange(layout);
	}, 10);
};


/*
 *   Change mainMenu buttons based on 'layout'
 *     'Calendar only'
 *     'Calendar and List' or 'List'
 */
reminderfox.calendar.layout.menuChange= function (layout) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.calendar.layout.updateFoxy(layout);

	var addIcon = document.getElementById("reminderfox-calendar-add-event");
	var revertIcon = document.getElementById("reminderfox-calendar-events-revert");
	var saveIcon = document.getElementById("reminderfox-calendar-events-save");

	if (+reminderfox.calendar.layout.status == 0) {
		addIcon.setAttribute('icon', 'true');
		addIcon.setAttribute('label', '');
		revertIcon.setAttribute('icon', 'true');
		revertIcon.setAttribute('label', '');
		saveIcon.setAttribute('icon', 'true');
		saveIcon.setAttribute('label', '');
	} else {
		addIcon.setAttribute('icon', 'false');
		addIcon.setAttribute('label', reminderfox.string("rf.button.add"));
		revertIcon.setAttribute('icon', 'false');
		revertIcon.setAttribute('label', reminderfox.string("rf.add.revert.button.revert.title"));
		saveIcon.setAttribute('icon', 'false');
		saveIcon.setAttribute('label',  reminderfox.string("rf.button.save"));
	}

	reminderfox.calendar.filter.close();
	if (reminderfox.search.showFilters == true) {
		reminderfox.calendar.filter.build();
		reminderfox.search.searchTextSpyglass (reminderfox.search.textSearchType);
	}
	reminderfox.view.setFilterTitel();
};


/*
 * Set the actual tic mark for the selected Layout
 */
reminderfox.calendar.layout.menuSelect= function () {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var layout = reminderfox.calendar.layout.status;

	if (layout == -1 || layout > 2 || layout == "" || !layout) {
		layout = 1;
		document.documentElement.attributes.layout.value = 1;
	}
	reminderfox.calendar.layout.status = layout;

	var len = document.getElementById("calendar-layout-popup").children.length;
	for (var i=0; i < len; i++) {
		document.getElementById("rmFx_layout" + i).removeAttribute("checked");
	}
	document.getElementById("rmFx_layout" + layout).setAttribute("checked", true);
};


reminderfox.calendar.layout.updateFoxy = function(layout) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// if switching to calendar, we never want foxy as space is at a premium
	if ( layout == 0 ) { // cal-only
		document.getElementById('reminderfox-y-calendar').setAttribute("hidden", "true");
		document.getElementById('reminderfox-y-spacer').setAttribute("hidden", "true");
		document.getElementById('reminderfox-y-box').setAttribute("hidden", "true");
	}
	// for list views, honor the user preference
	else {
		document.getElementById('reminderfox-y-spacer').removeAttribute("hidden");
		document.getElementById('reminderfox-y-box').removeAttribute("hidden");
		var hideFoxy = reminderfox.core.getPreferenceValue(reminderfox.consts.HIDE_FOX_PAW, false);
		if (hideFoxy) {
			document.getElementById('reminderfox-y-calendar').setAttribute("hidden", "true");
		}
		else {
			document.getElementById('reminderfox-y-calendar').removeAttribute("hidden");
		}
	}
};


// **************** calendar.ui. ***********************************************


reminderfox.calendar.ui.exportOrSend= function (event) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.iCal.exportOrSend(null, 'info', 'reminder', reminderfox.calendar.selectedEvents);
};


/**
 * 'onclick' on an event/reminder for the "selected" day --> "Edit" it
 *  Context menu on  dayEvent using the TTT/panel
 */
reminderfox.calendar.ui.eventMenus= function(xThis, xEvent, numDate){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var _reminder = reminderfox.calendar.ui.event4Day(xThis, numDate);
	if (_reminder == null) return;

//	var instanceDate = reminderfox.date.getDateObject(xThis.getAttribute('numDate'));
	var instanceDate = reminderfox.date.getDateObject(numDate);

	var layout = reminderfox.calendar.layout.status;

	if (xEvent.button == 2) { // was context menu ..

		// first make sure the _reminder is the 'selected' on List
		reminderfox.calendar.drawList =  false;

		if (layout > 0) {	// need to have List enabled !

			if (reminderfox_isReminderTabSelected()) selectReminderById(_reminder.id);
			if (!reminderfox_isReminderTabSelected()) selectReminderById(_reminder.id, reminderfox.tabInfo.tabName);
		}

		reminderfox.calendar.ui.selectDay(instanceDate);

		// save the 'current' _reminder for later processing
		// opens the panel/menu for some ops .. goes with 'ui.eventContext'
		document.getElementById('reminderfox-calendar-menu-Event').label = _reminder.summary;

		var contextMenuImportant = document.getElementById("reminderfox-calendar-menu-important");
		if (+_reminder.priority != reminderfox.consts.PRIORITY_IMPORTANT) {
			contextMenuImportant.setAttribute("checked", false);
		}
		else {
			contextMenuImportant.setAttribute("checked", true);
		}

		var contextMenuComplete = document.getElementById("reminderfox-calendar-menu-markAsComplete");
		if (_reminder.completedDate == null) {
			contextMenuComplete.setAttribute("checked", "false");
		}
		else {
			if (reminderfox.core.isCompletedForDate(_reminder, instanceDate)) {
				contextMenuComplete.setAttribute("checked", "true");
			}
			else {
				contextMenuComplete.setAttribute("checked", "false");
			}
		}

		var contextMenuRUC = document.getElementById("reminderfox-calendar-menu-remindUntilComplete");
		var contextMenuShowTT = document.getElementById("reminderfox-calendar-menu-showInTooltip");

		if (reminderfox_isReminderTabSelected()) { // Reminders or UserList
			contextMenuRUC.setAttribute("hidden", false);
			contextMenuRUC.setAttribute("checked", (+_reminder.remindUntilCompleted != 0));

			contextMenuShowTT.setAttribute("hidden", true);
			contextMenuShowTT.setAttribute("checked", false);

		} else { // we are in Todo/List
			contextMenuRUC.setAttribute("hidden", true);
			contextMenuRUC.setAttribute("checked", false);

			contextMenuShowTT.setAttribute("hidden", false);
			contextMenuShowTT.setAttribute("checked", (+_reminder.showInTooltip != 0));
		}

		reminderfox.calendar.ui.panelOpen (xEvent, 'reminderfox-calendar-contextEvent');
		return;
	} // was context menu ..

	reminderfox.calendar.ui.eventContext ('Edit', null, instanceDate);
};


/**
 *   Get the event on '.selectedDay' at position of calendar day selection
 */
reminderfox.calendar.ui.event4Day= function (xThis, dayBoxNum) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.calendar.selectedEvents = [];
	var event = null;

	if (xThis) {
		// var dayBoxNum = xThis.getAttribute('numDate');

		if (dayBoxNum != "undefined") {
			var n = xThis.getAttribute('idValue');
			if (n == "") return event;

			event = reminderfox.calendar.numDaysArray[dayBoxNum][n];
			event.date = event.orgStartDate;
			event.endDate = event.orgEndDate;
			event.summary = event.orgSummary;
			event.numDate = dayBoxNum;
			reminderfox.calendar.selectedEvents[0] = event;
		}
	}
	return event;
};


/**
 * Add a new event/reminder for the day shown with ttt.popup
 * Using left mouse on the day header TTT
 * Select reminder/todo/list with header selector
 */
reminderfox.calendar.ui.eventAdd= function(xThis, xEvent){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// add a new event for the selected day
	var a = xEvent.currentTarget.id.lastIndexOf('-');
	var selectedDateNum = xEvent.currentTarget.id.substring(a+1);

	var selectedDate = reminderfox.date.getDateObject(selectedDateNum);
	reminderfox.calendar.ui.eventContext ('Add', null, selectedDate);
};


reminderfox.calendar.ui.eventAdd2= function(xThis, xEvent){
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//alert('dblclick on month day:' + selectedDay)
	var selectedDay = xThis.getAttribute('gridDayNum');

	var thisDate =reminderfox.date.getDateObject(selectedDay);
	reminderfox.calendar.ui.eventContext ('Add', null, thisDate);
};


/**
 * Context menu functions for activated events:
 *  'Edit','Copy','Delete','Important','Complete','RUC','Export','ABcard'
 * @param mode {string} function to execute
 * @param xThis
 */
reminderfox.calendar.ui.eventContext= function (mode, xThis, selectedDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	//  with any event handling directly change the 'selected' day on the calendar
	reminderfox.calendar.ui.selectDay(selectedDate);

	var selectedEventDate = reminderfox.date.getDateObject(reminderfox.datePicker.gSelectedDate);

	var isTodo = !reminderfox_isReminderTabSelected();

	var noStore = (reminderfox.calendar.layout.status == -1) ? false : true;  // layout.status -1  is from FX/TB Main Menu icon all

	if ((reminderfox.calendar.selectedEvents != null) && (reminderfox.calendar.selectedEvents[0] != null))
		reminderfox.calendar.selectedEvents[0].instanceDate = selectedEventDate;


	switch (mode) {

		case 'Delete':
			reminderfox.datePicker.gSelectedDate = reminderfox.calendar.selectedEvents[0].date;
			userDeleteReminder(reminderfox.calendar.selectedEvents);
			return;

		case 'Add':
			if (reminderfox_isReminderTabSelected()) {
				reminderfox.core.addReminder(null, selectedDate);
			}
			else {
				reminderfox.core.addTodo(null, selectedDate);
			}
			break;

		case 'Edit':
			reminderOrTodoEdit (reminderfox.calendar.selectedEvents[0], isTodo);
			break;

		case 'Copy':
			var newCopyOfReminder = reminderFox_copyReminder(reminderfox.calendar.selectedEvents[0], isTodo);
			reminderfox.core.addReminderHeadlessly(newCopyOfReminder, true /*edit*/, isTodo /* isTodo*/,  noStore /*noStore*/);
			break;

		case 'Important':
			if (!isTodo) toggleImportantFlag(reminderfox.calendar.selectedEvents);  //need array
			if (isTodo) toggleImportantFlagTodo(reminderfox.calendar.selectedEvents);
			reminderfox.core.lastEvent = reminderfox.calendar.selectedEvents[0];
			reminderfox.core.updateMainDialog(reminderfox.core.lastEvent);
			break;

		case 'Complete':
			if (!isTodo) toggleMarkAsComplete(reminderfox.calendar.selectedEvents[0], reminderfox.calendar.selectedDate);
			if (isTodo) toggleMarkAsCompleteTodo(reminderfox.calendar.selectedEvents[0], reminderfox.calendar.selectedDate);
			reminderfox.core.lastEvent = reminderfox.calendar.selectedEvents[0];
			reminderfox.core.updateMainDialog(reminderfox.core.lastEvent);
			break;

		case 'RUC':
			toggleRemindUntilCompleted(reminderfox.calendar.selectedEvents[0], reminderfox.calendar.selectedDate);
			reminderfox.core.lastEvent = reminderfox.calendar.selectedEvents[0];
			reminderfox.core.updateMainDialog(reminderfox.core.lastEvent);
			break;

		case 'ShowInTooltip':
			toggleShowInTooltipTodo(reminderfox.calendar.selectedEvents[0], reminderfox.calendar.selectedDate);
			reminderfox.core.lastEvent = reminderfox.calendar.selectedEvents[0];
			reminderfox.core.updateMainDialog(reminderfox.core.lastEvent);
			break;

		case 'Export':
			reminderfox.util.JS.dispatch('iCalMail');
			if (!isTodo) reminderfox.iCal.exportOrSend(null, null, 'reminder', reminderfox.calendar.selectedEvents);
			if (isTodo) {
				var _todos = {};
				_todos[0] = reminderfox.calendar.selectedEvents;
				reminderfox.iCal.exportOrSend(null, null, 'todo', _todos);
			}
			return;

		default:
			var msgErr = ("Event method '" + mode +"' not implemented!"+
				"\n   " + reminderfox.calendar.selectedEvents[0].summary);
			reminderfox.util.PromptAlert (msgErr);
	}

	reminderfox.core.storeOrUpdate(reminderfox.core.lastEvent);
};



/**
 *   Select a day in month array with cursor/mouse
 *   (also called with opening the ReminderFox Dialog)
 *
 *   @param changeToDate {Date || numDate || string || null} goes to date;  null: hold the month grid!
 *   @param widget {string} flag for calling from app menu/toolbar icon
 *  */
reminderfox.calendar.ui.selectDay= function(changeToDate, widget) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var newDayBox;

	if (widget != null) {
		reminderfox.calendar.layout.status = -1;  // layout.status -1  is from FX/TB Main Menu icon all
	}
	var layout = +reminderfox.calendar.layout.status;

	if (reminderfox.datePicker.gSelectedDate == null) reminderfox.datePicker.gSelectedDate = new Date();

	var oldDateNum = reminderfox.date.getDateNum(reminderfox.datePicker.gSelectedDate);
	var oldDayBox = document.getElementById('reminderfox-calendar-month-day-' + oldDateNum);

	//try to fetch the first day in months-grid NOT to change the displayed months
	// need to go to first day + 7 because otherwise could get a day of the previous month
	var holdGrid = false;
	if ((reminderfox.calendar.numDateMonths.first != null) && (changeToDate == null)) {
		changeToDate = reminderfox.date.getDateObject(reminderfox.calendar.numDateMonths.first +7);
		holdGrid = true;
	}

	if ((changeToDate == 'today') || (changeToDate == null)) changeToDate = new Date();
	reminderfox.datePicker.gSelectedDate = changeToDate;

	var selectedDateNum = reminderfox.date.getDateNum(changeToDate);
	var newDayBox = document.getElementById('reminderfox-calendar-month-day-' + selectedDateNum);

	var logMsg = (' .ui.selectDay   .drawList: '     + reminderfox.calendar.drawList  +
		" layout: " + layout + " holdGrid: " + holdGrid +
		"\n  1 >>> old: " + oldDateNum      + "  " + reminderfox.date.getDateObject(oldDateNum) +
		"\n  1 >>> new: " + selectedDateNum + "  " + reminderfox.date.getDateObject(changeToDate));
//reminderfox.util.Logger('calndrGrid', logMsg)

	reminderfox.calendar.ui.panelClose();
	reminderfox.datePicker.StartingDayOfWeek();
	reminderfox.calendar.setDay(changeToDate);
	reminderfox.calendar.ui.redrawCalendarGrid (changeToDate);

	if (holdGrid) selectedDateNum = oldDateNum;

	if (layout == 0) { // call with calendar expanded ================

		// set new day box
		newDayBox = document.getElementById('reminderfox-calendar-month-day-' + selectedDateNum);
		var newColumn = +newDayBox.attributes.gridColumn.value +
			(+(reminderfox.calendar.prefsGetShowWeeks()) == true);	//if week#, first column is weekno, so increase coladdress

		// reset the expanded row of the old date/day and set for new date/day row
		if (oldDayBox != null) oldDayBox.parentElement.setAttribute("flex","0");
		newDayBox.parentElement.setAttribute("flex","1");

		//set the column for weekHeader and all displayed month grids
		var dayColumnFlex = 7;
		document.getElementById('weekCol-'+ newColumn).setAttribute('flex', dayColumnFlex);
		document.getElementById('monthCol-'+ newColumn).setAttribute('flex', dayColumnFlex);
		document.getElementById("reminderfox-calendar-box").setAttribute('flex',1);

		while (newDayBox.hasChildNodes())
			newDayBox.removeChild(newDayBox.firstChild);

		newDayBox.className="";
		var thisDayEvents = reminderfox.calendar.ttt.dayEvents (newDayBox, selectedDateNum, 'selectedDay');


		document.getElementById("reminderfox-calendar-box").hidden = false;
		document.getElementById("reminderfox-list-box").hidden = true;
	}


	if (layout > 0) { // refill List only if List is shown
		selectCalendarSync = false;
		// remove all of the calendar items and re-add them
		removeAllListItems(true, true);
		calendarReminderArray = null;
		calendarTodoArray = null;

	var logMsg = (' .ui.selectDay  refill List if layout >0   layout: ' + layout);
reminderfox.util.Logger('calndrGrid', logMsg);

		fillList(true, true);

		selectCalendarSync = true;
		reminderfox.core.statusSet("");

		reminderfox.calendar.drawList = false; // do not redraw with 'onselect' on tree
	}


	if (layout == 1) { // List + Calendar
		document.getElementById("reminderfox-calendar-box").hidden = false;
		document.getElementById("reminderfox-list-box").hidden = false;
	}
	if (layout == 2) { // List  only
		document.getElementById("reminderfox-calendar-box").hidden = true;
		document.getElementById("reminderfox-list-box").hidden = false;
	}

	reminderfox.datePicker.gSelectedDate = reminderfox.date.getDateObject(selectedDateNum);

	reminderfox.calendar.ui.selectedDayChange (oldDateNum, selectedDateNum);
};


reminderfox.calendar.ui.selectedDayChange= function (clearDateNum, setDayNum) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var clearNum = document.getElementById('reminderfox-calendar-month-day-' + clearDateNum);
	if (clearNum != null) clearNum.setAttribute('selectedReminder', false);

	var setNum = document.getElementById('reminderfox-calendar-month-day-' + setDayNum);
	if (setNum != null) setNum.setAttribute('selectedReminder', true);

	reminderfox.datePicker.gSelectedDate = reminderfox.date.getDateObject(setDayNum);

	reminderfox.calendar.drawGrid = false;
	reminderfox.calendar.drawList = false;
	reminderfox.calendar.redrawYear();


	setTimeout(function() {
		reminderfox.calendar.drawList = true;
		reminderfox.calendar.drawGrid = true;
	}, 500);
};

reminderfox.calendar.drawGrid = true;


/**
 * Mouse event on a day in calendar-grid
 *  @param  xEvent {mouse Event} if contextMenu, go to 'Add'
 *  @param  selectedDateNum {integer} day to mouse event has been fired
 */
reminderfox.calendar.ui.mouseDayOnGrid= function(xThis, xEvent) {
//------------------------------------------------------------------------------
	window.clearTimeout(reminderfox.calendar.popupID);

	if (reminderfox.calendar.drawGrid == false) return;

	var layout = +reminderfox.calendar.layout.status;
	var a = xThis.id.lastIndexOf('-');
	var selectedDateNum = xThis.id.substring(a+1);

	var aDate = reminderfox.datePicker.gSelectedDate|| new Date();

	var oldDateNum = reminderfox.date.getDateNum(aDate);
	var selectedDate = reminderfox.date.getDateObject(selectedDateNum);

	if (xEvent != null)  // check for context menu ..
	if (xEvent.button == 2) { // was context menu ..
		//for 'Add Event'  ... should be replaced with 'dblclick' on event

		if (selectedDateNum) {
			var vevents =reminderfox.calendar.numDaysArray[selectedDateNum];
			if (vevents != null) return;
		}
		reminderfox.calendar.ui.eventContext('Add', null, selectedDate);
		return;
	}


	var logMsg = (' .ui.mouseDayOnGrid   .drawList: ' + reminderfox.calendar.drawList +
		" layout: " + layout +
		"\n   2 >>>   oldDate: " + oldDateNum + "  " + reminderfox.datePicker.gSelectedDate +
		"\n   2 >>>   newDate: " + selectedDateNum + "  " + selectedDate);
//reminderfox.util.Logger('calndrGrid', logMsg)

	if (layout != 0) { // called with calendar collapsed ==================

		// remove 'selected' day CSS in case we don't redraw month/year grid
		var oldDayElem = document.getElementById('reminderfox-calendar-month-day-' + oldDateNum);
		if (oldDayElem != null) oldDayElem.setAttribute('selectedReminder', false);

		var newDayElem = document.getElementById('reminderfox-calendar-month-day-' + selectedDateNum);
		if (newDayElem != null) newDayElem.setAttribute('selectedReminder', true);

		reminderfox.datePicker.gSelectedDate = reminderfox.date.getDateObject(selectedDateNum);

		reminderfox.calendar.drawList = false;
		if (layout != -1){
			highlightClosestUpcomingReminder(reminderfox.datePicker.gSelectedDate, 'mouseDayOnGrid');
		}
	}


	if (layout == 0) { // call with calendar expanded ================

		// clear old day box
		var oldDayBox = document.getElementById('reminderfox-calendar-month-day-' + oldDateNum);
		if (oldDayBox != null) { // reset the previous selected day to be normal (non-expanded)
			oldDayBox.setAttribute('selectedReminder', false);
			oldDayBox.setAttribute("class", "reminderfox-calendar-month-day-box-class");
			oldDayBox.setAttribute("nonheader", true);
		}
		var oldColumn = +oldDayBox.attributes.gridColumn.value +
		(+(reminderfox.calendar.prefsGetShowWeeks()) == true);	//if week#, first column is weekno, so increase coladdress

		document.getElementById('weekCol-'+ oldColumn).setAttribute('flex', 0);
		document.getElementById('monthCol-'+ oldColumn).setAttribute('flex', 0);

		while (oldDayBox.hasChildNodes())
			oldDayBox.removeChild(oldDayBox.firstChild);

				var alabel = document.createElement("label");
				alabel.setAttribute("value", reminderfox.datePicker.gSelectedDate.getDate());
				alabel.setAttribute("class","reminderfox-calendar-month-day-number-class");
		oldDayBox.appendChild(alabel);

		// set new day box
		var newDayBox = document.getElementById('reminderfox-calendar-month-day-' + selectedDateNum);
		var newColumn = +newDayBox.attributes.gridColumn.value +
			(+(reminderfox.calendar.prefsGetShowWeeks()) == true);	//if week#, first column is weekno, so increase coladdress

		// (calendar only) reset the expanded row of the old date/day
		oldDayBox.parentElement.setAttribute("flex","0");
		newDayBox.parentElement.setAttribute("flex","1");

		//set the column width/flex
		var dayColumnFlex = 7;
		document.getElementById('weekCol-'+ newColumn).setAttribute('flex', dayColumnFlex);
		document.getElementById('monthCol-'+ newColumn).setAttribute('flex', dayColumnFlex);
		document.getElementById("reminderfox-calendar-box").setAttribute('flex',1);

		while (newDayBox.hasChildNodes())
			newDayBox.removeChild(newDayBox.firstChild);

		newDayBox.className="";
		var thisDayEvents = reminderfox.calendar.ttt.dayEvents (newDayBox, selectedDateNum, 'selectedDay');
	}
	reminderfox.calendar.ui.selectedDayChange (oldDateNum /*clear*/, selectedDateNum /*set*/);
};

/* JSHint */

/**
 * Called by 'reminderSelected'/'todoSelected' with changing a main List row
 * to select the day on the calendar months-grid
 * @param selectedDate {date}  day to be selected  on calendar months-grid
 */
reminderfox.calendar.ui.selectDayOnCalndr= function(selectedDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var layout = +reminderfox.calendar.layout.status;

	var oldDateNum = reminderfox.date.getDateNum(reminderfox.datePicker.gSelectedDate);
	var selectedDateNum = reminderfox.date.getDateNum(selectedDate);

	var logMsg =(' .ui.selectDayOnCalndr   .drawList: ' + reminderfox.calendar.drawList +
		" layout: " + layout +
		"\n   3 >>>   oldDate: " +oldDateNum + "  " + reminderfox.datePicker.gSelectedDate +
		"\n   3 >>>   newDate: " + selectedDateNum + "  " + reminderfox.date.getDateObject(selectedDate));
//reminderfox.util.Logger('calndrGrid', logMsg)


	// if the new selected Date day is on the months-grid reload the grid
	if (!reminderfox.calendar.grid.monthInGrid(reminderfox.date.getDateNum(selectedDate))) {
		reminderfox.calendar.ui.redrawCalendarGrid (selectedDate);
		// set new 'seleceted' CSS
		var newDayBox = document.getElementById('reminderfox-calendar-month-day-' + selectedDateNum);
		if (newDayBox != null) newDayBox.setAttribute('selectedReminder', true);
//		return;
	}

	// remove 'selected' day CSS
	var oldDayElem = document.getElementById('reminderfox-calendar-month-day-' + oldDateNum);
	if (oldDayElem != null) oldDayElem.setAttribute('selectedReminder', false);

	// set new 'seleceted' CSS
	var newDayBox = document.getElementById('reminderfox-calendar-month-day-' + selectedDateNum);
	if (newDayBox != null) newDayBox.setAttribute('selectedReminder', true);

	if (layout == 0) { //  calendar expanded ================
		// clear old day box
		var oldDayBox = document.getElementById('reminderfox-calendar-month-day-' + oldDateNum);

		if (oldDayBox != null) { // reset the previous selected day to be normal (non-expanded)
			oldDayBox.setAttribute('selectedReminder', false);
			oldDayBox.setAttribute("class", "reminderfox-calendar-month-day-box-class");
			oldDayBox.setAttribute("nonheader", true);
		}
		var oldColumn = +oldDayBox.attributes.gridColumn.value +
			(+(reminderfox.calendar.prefsGetShowWeeks()) == true);	//if week#, first column is weekno, so increase coladdress

		document.getElementById('weekCol-'+ oldColumn).setAttribute('flex', 0);
		document.getElementById('monthCol-'+ oldColumn).setAttribute('flex', 0);

		// clear childs and reset day label
		while (oldDayBox.hasChildNodes())
			oldDayBox.removeChild(oldDayBox.firstChild);

				var alabel = document.createElement("label");
				alabel.setAttribute("value", reminderfox.datePicker.gSelectedDate.getDate());
				alabel.setAttribute("class","reminderfox-calendar-month-day-number-class");
		oldDayBox.appendChild(alabel);

		// set new day box
		var newDayBox = document.getElementById('reminderfox-calendar-month-day-' + selectedDateNum);
		var newColumn = +newDayBox.attributes.gridColumn.value +
			(+(reminderfox.calendar.prefsGetShowWeeks()) == true);	//if week#, first column is weekno, so increase coladdress

		//set the column width/flex
		dayColumnFlex = 7;
		document.getElementById('weekCol-'+ newColumn).setAttribute('flex', dayColumnFlex);
		document.getElementById('monthCol-'+ newColumn).setAttribute('flex', dayColumnFlex);

		while (newDayBox.hasChildNodes())
			newDayBox.removeChild(newDayBox.firstChild);

		newDayBox.className="";
		var thisDayEvents = reminderfox.calendar.ttt.dayEvents (newDayBox, selectedDateNum, 'selectedDay');
	}

	reminderfox.datePicker.gSelectedDate = reminderfox.date.getDateObject(selectedDateNum);
	reminderfox.calendar.redrawYear();

	reminderfox.calendar.ui.selectedDayChange (oldDateNum, selectedDateNum);
};


/**
 * Redraw the months-grid with year header, doesn't sets the 'selected' day !
 * Number of months read from pref or =3 for display from menu icon
 *
 * @param  changeToDate {integer} numDate format; if null: don't change the grid
 */
reminderfox.calendar.ui.redrawCalendarGrid= function (changeToDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var layout = reminderfox.calendar.layout.status;

	if (changeToDate == null) changeToDate = reminderfox.calendar.numDateFirstMonth;

	// get the number of month displayed from prefs
	var numMonths = reminderfox.core.getPreferenceValue (reminderfox.consts.CALENDAR_MONTHS,
		reminderfox.calendar.numMonth);
	if (numMonths < 1) numMonths = 1;
	reminderfox.core.setPreferenceValue (reminderfox.consts.CALENDAR_MONTHS, numMonths);

	// if called from widget, preset number of month and flag for next call for 'widget'
	if ((layout == -1) || (document.getElementById("reminderfox-calendar-box").getAttribute('widget'))) {
		numMonths = 3;
		document.getElementById("reminderfox-calendar-box").setAttribute('widget', 'true');
	}

	reminderfox.calendar.redrawDays(changeToDate, numMonths);
	reminderfox.calendar.redrawYear();
};


/**
 *   Select a month to be the first in calendar widget, go to same week day;
 *   if the first month in the Months Box, go one month back,
 *   @param xEvent {object} 'event' of caller
 *   @param change  {integer} =1 or =-1  in/decrements month; 0= go to today
 **/
reminderfox.calendar.ui.selectMonth= function(xEvent, change) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if ((xEvent != null) && (xEvent.button == 2)) { // was context menu ..
		return;
	}

	// get the current first month-grid to read actual parameters (year, month)
	var firstMonth = document.getElementById('reminderfox-calendar-month0');
	var yearNum = +firstMonth.attributes.numYear.value;
	var monthNum = +firstMonth.attributes.numMonth.value;

	var currentDate = reminderfox.datePicker.gSelectedDate;
	var currentDateNum = reminderfox.date.getDateNum(currentDate);
	var currentDay = currentDate.getDate();

	var nextDate = new Date(yearNum, monthNum + change, currentDay);
	var nextDateNum = reminderfox.date.getDateNum(nextDate);

	// redraw Calendar
	reminderfox.calendar.ui.selectDay (nextDate);
	// reset to 'oldDate' if on months-grid
	if (reminderfox.calendar.grid.monthInGrid(currentDate))
		reminderfox.calendar.ui.selectDayOnCalndr (currentDate);
};


reminderfox.calendar.ui.yearChange= function(inkrement) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var selectedDate = reminderfox.datePicker.gSelectedDate;
	if (selectedDate == null) selectedDate = new Date();
	var currentYear = selectedDate.getFullYear();
	var currentMonth = selectedDate.getMonth();
	var currentDate = selectedDate.getDate();

	reminderfox.datePicker.gSelectedDate = new Date (currentYear + inkrement, currentMonth, currentDate);
	var newYearDateNum = reminderfox.date.convertDate(reminderfox.datePicker.gSelectedDate);

	// redraw the year and the days
	reminderfox.calendar.ui.selectDay (newYearDateNum);
};


/**
 * Open a WEB page
 */
reminderfox.calendar.ui.openUrl= function(xThis){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.util.launchLink(xThis.value);
};


/**
 * Open a message, used with Messenger (TB/SM/..)
 */
reminderfox.calendar.ui.openByMessageID= function (xThis) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var n = +xThis.attributes.idValue;
	var numDate = xThis.attributes.numDate.value;

	reminderfox.mail.openByMessageID (reminderfox.calendar.numDaysArray[numDate][n]);
};


/**
 * Toggles a panel with the ReminderFox Search/Filters&Views
 * handle 'wide' and 'small' layout differently
 *
 *  @param mode {boolean} indicats to open/close the searchText/Filter box
 * 		mode == null --> toggle;  == true --> open  == false --> close
 */
reminderfox.calendar.filter.toggle= function(mode) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//reminderfox.util.Logger('filtering', '.calendar.filter    mode: ' + mode);
	reminderfox.calendar.ui.panelClose();
	var spyglass = document.getElementById("rmFx-search-spyglass");
	var spyglassStatus = spyglass.getAttribute('status');

	var mode4Open;
	if ((mode == null) && (spyglassStatus == 'closed')) mode = 'open';
	if ((mode == null) && (spyglassStatus == 'open')) mode = 'close';

	if (mode == true) mode = 'open';
	if (mode == false) mode = 'close';

	if (mode == 'open'){
		reminderfox.search.showFilters = true;
		reminderfox.calendar.filter.build();
		reminderfox.search.searchTextSpyglass (reminderfox.search.textSearchType);
	}
	if (mode == 'close'){
		reminderfox.search.showFilters = false;
		reminderfox.search.searchTextSpyglass (reminderfox.search.textSearchType);
		reminderfox.calendar.filter.close();
	}
	reminderfox.core.setPreferenceValue(reminderfox.consts.SHOW_FILTERS, reminderfox.search.showFilters);
	reminderfox.view.setFilterTitel();
};


reminderfox.calendar.filter.close= function () {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//reminderfox.util.Logger('filtering', '.calendar.filter.close    ');
	var spyglass = document.getElementById("rmFx-search-spyglass");
	var searchAndFilterWide = document.getElementById("rmFx-SearchAndFilter-Wide");
	var searchAndFilterSmall = document.getElementById("rmFx-SearchAndFilter-Small");

	var searchAndFilterBox = document.getElementById("rmFx-SearchTextAndFilter-Box");

	if (searchAndFilterWide.childElementCount != 0) searchAndFilterWide.removeChild(searchAndFilterBox);
	if (searchAndFilterSmall.childElementCount != 0) searchAndFilterSmall.removeChild(searchAndFilterBox);

	spyglass.setAttribute('status', 'closed');
};


reminderfox.calendar.filter.build= function () {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//reminderfox.util.Logger('filtering', '.calendar.filter.build     ');
	var wideOsmall = (+reminderfox.calendar.layout.status == 0) ? "Small" : "Wide";

	var spyglass = document.getElementById("rmFx-search-spyglass");
	var searchAndFilter = document.getElementById("rmFx-SearchAndFilter-"+ wideOsmall);
	var searchLabels = document.getElementById("rmFx-filters-labels");

	var t = (reminderfox_isReminderTabSelected() == true ? 0 : 7);		// index to access the right Filters/Views menulabel

	// build rmFx-SearchTextAndFilter-Box  =============
	var sfBox = document.createElement("hbox");
		sfBox.setAttribute("id", "rmFx-SearchTextAndFilter-Box");
	searchAndFilter.appendChild(sfBox);

	// build the "textSearch Box"
	var sBox = document.createElement("hbox");
	sBox.setAttribute("id", "rmFx-searchText-box");
	sBox.setAttribute("width", "200px"); // set larger width on search text field so doesn't look as constricted

	sBox.addEventListener("keydown", function(event) {reminderfox.search.onSearchKeyPress(event);}, false);
	sBox.addEventListener("keyup", function(event) {reminderfox.search.onSearchKeyUp(event);}, false);
	sBox.addEventListener("focus", function(event) {reminderfox.search.onSearchFocus(event);}, false);

	sBox.setAttribute("tooltiptext", reminderfox.string("rf.search.textitems.title"));

	var sText = document.createElement("text");
	sText.setAttribute("id", "rmFx-searchText");
	sBox.appendChild(sText);
	sfBox.appendChild(sBox);

	// build the "Filters/Views Box"
	var fBox = document.createElement("hbox");
		fBox.setAttribute("id", "rmFx-filters-box");
	sfBox.appendChild(fBox);

//		<menulist id="rmFx-filters-type" oncommand="reminderfox.search.filtersTypeChanged();" tooltiptext="">
	var elem = document.createElement("menulist");
		elem.setAttribute("id", "rmFx-filters-type");
		elem.addEventListener("command", function () {reminderfox.search.filtersTypeChanged();}, false);
		elem.setAttribute("tooltiptext", reminderfox.string("rf.calendar.filter.select"));
	fBox.appendChild(elem);

	var elem1 = document.createElement("menupopup");
		elem1.setAttribute("id", "filterViewMenu");
	elem.appendChild(elem1);

//				<menuitem label="&rf.options.list.reminder.filters.allreminders.label;" />
	var elem2 = document.createElement("menuitem");
		elem2.setAttribute("label", searchLabels.attributes[1 +t].value);
	elem1.appendChild(elem2);
	elem2 = document.createElement("menuitem");
		elem2.setAttribute("label", searchLabels.attributes[2 +t].value);
	elem1.appendChild(elem2);
	elem2 = document.createElement("menuitem");
		elem2.setAttribute("label", searchLabels.attributes[3 +t].value);
	elem1.appendChild(elem2);
	elem2 = document.createElement("menuitem");
		elem2.setAttribute("label", searchLabels.attributes[4 +t].value);
	elem1.appendChild(elem2);
	elem2 = document.createElement("menuitem");
		elem2.setAttribute("label", searchLabels.attributes[5 +t].value);
	elem1.appendChild(elem2);
	elem2 = document.createElement("menuitem");
		elem2.setAttribute("label", searchLabels.attributes[6 +t].value);
	elem1.appendChild(elem2);
	elem2 = document.createElement("menuitem");
		elem2.setAttribute("label", searchLabels.attributes[7 +t].value);
	elem1.appendChild(elem2);

	// if we have Views, add them with separator
	reminderfox.view.prefViewsLoad();

	if (reminderfox.view.views.Label[0] != null) {

		var m1 = document.createElement("menuseparator");
		m1.setAttribute("id", "filtersViewsLast");
		elem1.appendChild(m1);

		var j = 0;
		while (reminderfox.view.views.Label[j] != null) {
			if (reminderfox.view.views.Label[j].length > 0) {

				m1 = document.createElement("menuitem");
		//		m1.setAttribute("type", "checkbox");
		//		m1.setAttribute("autocheck", "false");
		//		m1.addEventListener("command", function() {reminderfox.view.Set(this);},false);

				m1.setAttribute("label", reminderfox.view.views.Label[j]);
				m1.setAttribute("value", reminderfox.view.views.Items[j]);

				// tooltiptext  displays the 'value' of this 'View'
				// need to change from 'general' to 'local' Criteria
				m1.setAttribute("tooltiptext", reminderfox.view.CriteriaExchange(reminderfox.view.views.Items[j]));

//		reminderfox.util.Logger('Views', "reminderfox.calendar.filter.build ::" +
//		"   View :" + j + " value:" + reminderfox.view.views.Label[j]);

				elem1.appendChild(m1);
			}
			j++;
		}

	}
	var m2 = document.createElement("menuseparator");
		m2.setAttribute("id", "viewsManageSeparator");
	elem1.appendChild(m2);

	// add the 'View Editor'
	var m3 = document.createElement("menuitem");
		m3.addEventListener("command", function() {
			reminderfox.view.Manage(this);
		},false);

		m3.setAttribute("label", reminderfox.view.tttEditor);
		m3.setAttribute("value", "vEditor");
		m3.setAttribute("tooltiptext", reminderfox.view.tttEdit);
	elem1.appendChild(m3);

	searchAndFilter.appendChild(sfBox);

	spyglass.setAttribute('status', 'open');
	reminderfox.search.filtersTypeGet();
};


/**
 * Open a Calendar Widget panel
 */
reminderfox.calendar.ui.panelOpen= function (xEvent, panel) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	document.getElementById(panel).openPopup(null, "", xEvent.clientX, xEvent.clientY, false, false);
};


reminderfox.calendar.ui.panelTabOpen= function (xThis, xEvent, action) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if ((action == 'mouse') && (reminderfox.core.getPreferenceValue (reminderfox.consts.ONHOVER, false) == false)) return;

	var thisPanel = document.getElementById('calendar-reminderfox-y-panel');
	if (thisPanel != null) thisPanel.hidePopup();

	var xpos = xThis.boxObject.x + xThis.boxObject.width * (0.3);
	var ypos =  xThis.boxObject.height * (0.9);
	document.getElementById('rmFx-tabList').openPopup(null, "", xpos, ypos, false, false);
};


reminderfox.calendar.ui.panelClose= function () {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var thisPanel = document.getElementById('rmFx-tabList');
	if (thisPanel != null) thisPanel.hidePopup();
};

reminderfox.calendar.ui.panelLeave= function (xThis) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if (xThis.id == "reminderfox-calendar-dayPanel") {
		var thisPanel = document.getElementById("reminderfox-calendar-dayPanel");
		if (thisPanel != null) thisPanel.hidePopup();
	}
};


reminderfox.calendar.ui.tabListChange= function (listNo, xthis) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
//reminderfox.util.Logger('filtering', '.calendar.ui.tabListChange    listNo: ' + listNo);

	if (xthis != null) {
		reminderfox.tabInfo.tabName	= xthis.attributes.value.value;		// = [string] "Hibiscus"
		reminderfox.tabInfo.tabID		= xthis.attributes.id.value;  			// = [string] "reminderFoxList:Hibiscus"

		if ((reminderfox.tabInfo.tabID.indexOf('reminderFoxList:') == 0) ||
			(reminderfox.tabInfo.tabID == "Xtodo")){
			reminderfox.tabInfo.tabTyp = "VTODO";
		} else {
			reminderfox.tabInfo.tabTyp = "VEVENT";
		}

		var listNum 						= +xthis.attributes.tabListNo.value; 	// = [string] "4"
		reminderfox.tabInfo.tabIndex 	= +listNum;

	} else {
		var listNum = 0;
		var tabN = document.getElementById("rmFx-tabList").childElementCount -2;
		if (listNo > tabN)
			listNum =0;
		else
			listNum = listNo;
		var tab = document.getElementById("rmFx-tabList").children[+listNo];

		if (tab.attributes.value == null) {
			var tab = document.getElementById("rmFx-tabList").children[0];
			listNum = 0;
		}
		reminderfox.tabInfo.tabName	= tab.attributes.value.value; // tab.value;
		reminderfox.tabInfo.tabID		= tab.attributes.id.value;
		reminderfox.tabInfo.tabIndex	= +listNum;
	}
	document.documentElement.attributes.tab.value = reminderfox.tabInfo.tabIndex; 	// "tab"  goes to 'persit' for XUL


	reminderfox.calendar.ui.panelClose();

	//set the tabName
	document.getElementById('rmFx-tabName').setAttribute('value', reminderfox.tabInfo.tabName);
	document.getElementById('rmFx-tabName').setAttribute('ID',    reminderfox.tabInfo.tabID);
	document.getElementById('rmFx-allLists').setAttribute('tabListIndex', reminderfox.tabInfo.tabIndex);

	reminderfox.calendar.filter.close();
	if (reminderfox.search.showFilters == true) {
		reminderfox.calendar.filter.build();
		reminderfox.search.searchTextSpyglass (reminderfox.search.textSearchType);
	}
	reminderfox.view.setFilterTitel();
	selectTab();
};


/**
 * test to scale the calendar widget -- instead of 'small', 'normal', 'large'
 */
reminderfox.calendar.ui.textScale= function (size) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var defaultSize = reminderfox.core.getPreferenceValue (reminderfox.consts.DEFAULT_TEXTSIZE,
		reminderfox.consts.DEFAULT_TEXTSIZE_DEFAULT);
	reminderfox.core.setPreferenceValue (reminderfox.consts.DEFAULT_TEXTSIZE, defaultSize);

	var elem = document.getElementById("reminderfox-calendar-box-widget");

	var aSize = +elem.style.fontSize.replace('px','');
	var nSize = (aSize ? aSize : defaultSize) + (+size);

	if (+size == 0) {
		elem.setAttribute('style', 'font-size:'+ defaultSize + 'px');
		document.documentElement.attributes.textSize.value = defaultSize;
	} else {
		elem.setAttribute('style', 'font-size:' + nSize + 'px');
		document.documentElement.attributes.textSize.value = nSize;
	}
};


reminderfox.calendar.ui.textListScale= function (size) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var defaultSize = reminderfox.core.getPreferenceValue (reminderfox.consts.DEFAULT_TEXTSIZE,
		reminderfox.consts.DEFAULT_TEXTSIZE_DEFAULT);
	reminderfox.core.setPreferenceValue (reminderfox.consts.DEFAULT_TEXTSIZE, defaultSize);

	var elem = document.getElementById("rmFx-MainDialog-List-Calendar");

	var aSize = +elem.style.fontSize.replace('px','');
	var nSize = (aSize ? aSize : defaultSize) + (+size);

	if (+size == 0) {
		elem.setAttribute('style', 'font-size:'+ defaultSize + 'px');
		document.documentElement.attributes.textSizeList.value = defaultSize;
	} else {
		elem.setAttribute('style', 'font-size:' + nSize + 'px');
		document.documentElement.attributes.textSizeList.value = nSize;
	}
};

// =============================================================================


/**
 * For the selected date set ....
 * - reminderfox.date.numToday
 * - reminderfox.datePicker.gSelectedDate
 * -
 * @param {selectedDate}  date || numDate || null || 'today'; 'null' goes to .gSelectedDate
 * @return {date object}
 */
reminderfox.calendar.setDay= function(selectedDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var todayDate = reminderfox.datePicker.gTodaysDate = new Date();
	reminderfox.date.numToday = reminderfox.date.convertDate(todayDate);

	if (reminderfox.datePicker.gSelectedDate == null) selectedDate = todayDate;

	if (selectedDate == 'today') selectedDate = todayDate;
	if (selectedDate == null) selectedDate = reminderfox.datePicker.gSelectedDate;

	reminderfox.datePicker.gSelectedDate = reminderfox.date.getDateObject(selectedDate);
};


/**
 * Set the 'Year' to Calendar header based on the selected date
 * @param {date}
 */
reminderfox.calendar.redrawYear= function() {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var yearTitleItem = document
			.getElementById("reminderfox-calendar-year-title");
	yearTitleItem.setAttribute("value", reminderfox.datePicker.gSelectedDate.getFullYear());
};


/**
 * Draw a n-month grid with 7*5 days each and fill-in events
 * number of month is set by : reminderfox.calendar.numMonth
 *
 * @param aSelectedDate {date} date the months grid is based on
 * @param numMonths {integer} number of month in grid
 */
reminderfox.calendar.redrawDays= function (aSelectedDate, numMonths) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if (numMonths == null) numMonths = reminderfox.calendar.numMonth;

	reminderfox.calendar.numDateMonths = [];

	aSelectedDate = reminderfox.date.getDateObject(aSelectedDate);
	var aSelectedNumDate = reminderfox.date.getDateNum(aSelectedDate);
	var aSelectedMonth = aSelectedDate.getMonth();
	var aSelectedYear = aSelectedDate.getFullYear();


	// *** STEP1 ***  clear the whole year / week header and all month grids content
	var weekHeaderBox = document.getElementById("reminderfox-calendar-week-header-box");  // hbox
	while (weekHeaderBox.hasChildNodes())
		weekHeaderBox.removeChild(weekHeaderBox.firstChild);

	var monthsGrid = document.getElementById("reminderfox-calendar-month-grid-box");  // arrowscrollbox
	while (monthsGrid.hasChildNodes())
		monthsGrid.removeChild(monthsGrid.firstChild);


	// *** STEP 2 ***  build the grid only
	var calndrGrid = reminderfox.calendar.grid.monthCalendar(weekHeaderBox, monthsGrid);


	// *** STEP 3 ***  months-grid based on aSelectedDate -- months-grid only,
	// each month-grid has month-header/title and week rows with days;

	reminderfox.calendar.numDateFirstMonth = reminderfox.date.getDateNum(new Date (aSelectedYear, aSelectedMonth, 1));

	for (var month=0; month < numMonths; month++) {
		var newMonthDate = new Date (aSelectedYear, aSelectedMonth + month, 1);
		reminderfox.calendar.numDateEnd = reminderfox.calendar.grid.Month (calndrGrid, newMonthDate, month, numMonths);
	}

	// mark special days on grid and collaps Calendar columns
	reminderfox.calendar.dateArray.DayAttributes(reminderfox.date.numToday, ['today']);
	document.getElementById("reminderfox-calendar-box").setAttribute('flex',0);


	// *** STEP 4 ***  build the grid with all events/todos for given dateRange
	reminderfox.calendar.numDateStart = reminderfox.date.convertDate(aSelectedDate) -35 - reminderfox.calendar.daysCarryOver;

	reminderfox.calendar.numDateArray = reminderfox.calendar.dateArray.Events();

	reminderfox.calendar.redrawYear();  // XXX redrawYear
};


/**
 *   Build Array with all reminders (events or todos) into a reminderfox.calendar.numDaysArray for display on grid
 *   The data has been read from ICS file to 'reminderfox.core.numDaysEvents'/'.numDaysTodos'
 *   dateBegin {integer} and  dateEnd {integer} are passed with global parameters
 *   @return reminderfox.calendar.numDaysArray   has "all" VEVENTS or VTODOS, RRULE reminders are resolved
 */
reminderfox.calendar.dateArray.Events= function() {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.calendar.numDaysArray = {};

	// XXX POTENTIAL PERFORMANCE ISSUE !
	// begin and end dates have BIG influence on PERFORMANCE!
	// some users have "Birthday" definitions with enddate != begindate instead
	// having the Birthday as a ONE DAY EVENT!
	// to prevent performance issues extra check is made for dateBegin and dateEnd
	// see below

	var calendarBeginDate = reminderfox.date.convertDate(reminderfox.calendar.numDateStart);
	var calendarEndDate = reminderfox.date.convertDate(reminderfox.calendar.numDateEnd);

	var todaysDate = new Date();

	var isReminder = reminderfox_isReminderTabSelected() ? true : false;
	var numDays = isReminder ? 'numDaysEvents' : 'numDaysTodos';

	// test the array; if empty recheck to be sure (eg. for Calendar Widget on app toolbar
	reminderfox.core.getReminderEvents();
	for(var day in reminderfox.core[numDays]) {
		var len = reminderfox.core[numDays][day].length;
		for(var j = 0; j < len; j++) {

			var baseEvent = reminderfox.core[numDays][day][j];

			if (!isReminder) { // check for ToDo's and User Lists
				if (!  /* invert following result */
					((reminderfox.tabInfo.tabID == "Xtodo") && (baseEvent["X-listID"] == undefined) || /* check for ToDo's */
					(reminderfox.tabInfo.tabName == baseEvent["X-listID"]) /* check for User List */
					)) continue;  /* skip this baseEvent .. don't add to the cal-grid */
			}

			var rangeEvents = reminderfox.core.getAllRemindersInDateRange(baseEvent,
				calendarBeginDate, calendarEndDate, false);

			// ignore used to only move the oldest occurrence of RUC to TODAY
			// XXX   oldest  should be the REAL oldest NOT only the oldest in the date span on
			// the Calendar!
			var ignore = false;

			var rLen = rangeEvents.length;
			for(var i = 0; i < rLen; i++) {
				try {
					if(!rmFx_checkFiltered(rangeEvents[i]))
						continue;
				} catch (ex) {
				}

				var event = isReminder ?
					// go for EVENTS
					  reminderfox.core.cloneReminderFoxEvent (rangeEvents[i])
					// go for TODOS
					: reminderfox.core.cloneReminderFoxTodo (rangeEvents[i]);

				// preserve the original values
				event.orgStartDate = baseEvent.date;
				if (baseEvent.endDate == null) baseEvent.endDate = baseEvent.date;
				event.orgEndDate = baseEvent.endDate;
				event.orgSummary = baseEvent.summary;

				var orgStartDateNum = reminderfox.date.convertDate(baseEvent.date);
				var orgEndDateNum = reminderfox.date.convertDate(baseEvent.endDate);

				var days = orgEndDateNum - orgStartDateNum;
				var eventStartDateNum = reminderfox.date.convertDate(event.date);
				var eventEndDateNum = eventStartDateNum + days;

				event.endDate = reminderfox.date.convertDate(eventEndDateNum);
				event.endDate.setHours(baseEvent.endDate.getHours());
				event.endDate.setMinutes(baseEvent.endDate.getMinutes());

				event = reminderfox.core.processReminderDescription(event); // change variables in .summary

				if //  marked as RemindUntilComplete
					((ignore == false) &&
						(event.remindUntilCompleted &&
						(event.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED /* 2 */))) {
					var ignore = true;
					// if the date is after TODAY, then just show it.
					// Otherwise, go ahead and show it as Today's date.
					if(reminderfox.core.compareDates(event.date, todaysDate) == -1) {//  = if dateOne < dateTwo
						if(reminderfox.core.compareDates(event.completedDate, event.date) == -1) {

							var origDate = reminderfox.date.getDateVariableString(event, event.date);

							event.date = new Date(todaysDate.getFullYear(), todaysDate.getMonth(),
								todaysDate.getDate(), event.date.getHours(), event.date.getMinutes());

							event.endDate = new Date(todaysDate.getFullYear(), todaysDate.getMonth(),
								todaysDate.getDate() + days, event.endDate.getHours(), event.endDate.getMinutes());

							// for reminders that are passed due, show original date in summary.
							// Some users prefer the date that the event was set for to show
							// in the list; this is a reasonable compromise
							event.summary = event.summary + "  [" + origDate + "]";
						}
					}
				} // marked as RemindUntilComplete

				reminderfox.calendar.dateArray.EventAdd(event, reminderfox.calendar.numDaysArray);

				if(event.durationTime != null) {
					var beginDateNum = reminderfox.date.convertDate(event.date);
					var endDateNum = reminderfox.date.convertDate(event.endDate) -1;

					endDateNum = (endDateNum > reminderfox.calendar.numDateEnd) ? reminderfox.calendar.numDateEnd : endDateNum; //perf??  ensure only process for visable days in Calendar

					if(event.allDayEvent) {// handle allDay events

						if // oneDay allDay event
							(beginDateNum == endDateNum)  {
							//		do nothing, because already added, see above !
							//	reminderfox.calendar.dateArray.EventAdd(event, reminderfox.calendar.numDaysArray, event.date);
						}
						else { // multipleDays allDay event

							endDateNum = (endDateNum > reminderfox.calendar.numDateEnd) ? reminderfox.calendar.numDateEnd : endDateNum; //perf??  ensure only process for visable days in Calendar

							while (beginDateNum < endDateNum) {
								beginDateNum++;
								var setToDate = reminderfox.date.convertDate(beginDateNum);
								reminderfox.calendar.dateArray.EventAdd(event, reminderfox.calendar.numDaysArray, setToDate);
							}
						}

					} else {// handle days with time

							var reminderInstanceDate = event.date;
							var reminderInstanceEndDate = new Date(reminderInstanceDate.getTime() + event.durationTime);

							if(reminderInstanceEndDate.getMonth() == reminderInstanceDate.getMonth() &&
								reminderInstanceEndDate.getDate() == reminderInstanceDate.getDate()) {
								// same days..  do nothing

							} else {// multiple days   need to go for multiple days with duration less 24H !!!
									var nthDay = event.date.getDate();
									var getDurationTimeFirstDay = reminderInstanceDate.getHours()*60*60*1000 + reminderInstanceDate.getMinutes()*60*1000;
									var durationTimeRest = event.durationTime - (86400000 - getDurationTimeFirstDay);

//perf??

									while(durationTimeRest > 0) {

										durationTimeRest = durationTimeRest - 86400000;
										nthDay++;

										setToDate = new Date(event.date.getFullYear(), event.date.getMonth(), nthDay);
										reminderfox.calendar.dateArray.EventAdd(event, reminderfox.calendar.numDaysArray, setToDate);
									} // while
							} // multiple days
					} // days with time

				} //duration.time
			} // add days with event
		}
	}
};


reminderfox.calendar.prefsGetShowWeeks= function () {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var weekNumShow = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_WEEK_NUMS_PREF, 0);
			// Week Numbering:
			// 0 (none),
			// 1 (default),
			// 2 (ISO 8601)
	return (weekNumShow != null && weekNumShow == 1 || weekNumShow == 2);
};


// =============================================================================
/**
 *  Build calendar layout for week header and month grid with columns and rows
 *  Rows is added as elements only, the year/month headers and week rows for the
 * months are added later.
 *
 * @param {object} XUL 'hbox' element holding week header
 * @param {object} XUL 'rows' element holding the row for month title and
 * 	the week days
 * @param {integer}  aStartingDayOfWeek (SO = 0  .. SA= 7)
 *
 * @return {object} 'rows' with all months added
 */
reminderfox.calendar.grid.monthCalendar= function (weekHeaderBox, monthsGrid) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var weeksShow = reminderfox.calendar.prefsGetShowWeeks();
	var aStartingDayOfWeek = reminderfox.datePicker.StartingDayOfWeek();

	weekHeaderBox.setAttribute("fdweek", aStartingDayOfWeek);

	var nCols = (weeksShow != 0) ? 9 : 8;
	for (var n = 1; n < nCols; n++) {  // 7 *col / 8 cols with week
		var hbox = document.createElement("hbox");
		// add '#'  for weekNo
		if ((n==1) && (weeksShow != 0)) {
			hbox.setAttribute("flex", "1");
			hbox.setAttribute("class", "reminderfox-calendar-week-number-box-class");

				var alabel = document.createElement("label");
				alabel.setAttribute("class", "reminderfox-calendar-week-day-number");
				alabel.setAttribute("value", "#");
			hbox.appendChild(alabel);
		}

		else { // add boxes for day header (Mo .. So)
			var x = (n -2) + aStartingDayOfWeek + (weeksShow ? 0 :1);
			x = (x >6) ? x -7 : x;

			hbox.setAttribute("id", "reminderfox-calendar-week-header-"+ n);

			hbox.setAttribute("class", "reminderfox-calendar-month-day-box-class");
			hbox.setAttribute("selectedDay", x);
			//hbox.addEventListener("click", function() {reminderfox.calendar.ui.firstDayOfWeek(this);},false);

			var alabel = document.createElement("label");
			alabel.setAttribute("id", "calDay" + x);

			alabel.setAttribute("class", "reminderfox-calendar-week-day-number");
			if (x==0) alabel.setAttribute("sunday", "true");

			alabel.setAttribute("value",
				reminderfox.string("rf.options.day."+ x + ".name.MMM"));

			hbox.appendChild(alabel);

			weekHeaderBox.appendChild(hbox);
		}
		hbox.setAttribute("id", "weekCol-"+n);
		weekHeaderBox.appendChild(hbox);
	}

	var mGrid = document.createElement("grid");
		mGrid.setAttribute("id", "reminderfox-calendar-month-grid");
		mGrid.setAttribute("flex", "1");

		var nCol = (weeksShow != 0) ? 9 : 8;
		var monthCols = document.createElement("columns"); {
			for (var n = 1; n < nCol; n++) {  // 7 *col / 8 cols with week
				var gridCol = document.createElement("column");
					if ((n==1) && (weeksShow != 0)) {
						gridCol.setAttribute("flex", "1");
					} else {
						gridCol.setAttribute("class", "reminderfox-calendar-month-day-box-class");
						gridCol.setAttribute("nonheader", true);
					}
					gridCol.setAttribute("id", "monthCol-"+n);
					monthCols.appendChild(gridCol);
			}
		}
		mGrid.appendChild(monthCols);
		var monthRows = document.createElement("rows");
		mGrid.appendChild(monthRows);

	monthsGrid.appendChild(mGrid);

	return monthRows;
};


/**
 * Build month grid for one month based on 'currentDate' in numDate format
 * like with most spreadsheet/calc progs.
 * The day counting is based on the the first day =  31.12.1899 == 1;
 *    example: Aug 17, 2011 == 40772
 * @param calndrGrid {object} holding the year/week headers and all month-Grids
 * @param currentdate {date} the date a month-grid will be build for
 * @param nMonth {integer} the month-grid number (0 ..n)
 * @param numMonths {integer} total number of month-grids
 */
reminderfox.calendar.grid.Month= function(calndrGrid, currentDate, nMonth, numMonths){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var weeksShow = reminderfox.calendar.prefsGetShowWeeks();
	var weekStartDay = reminderfox.datePicker.StartingDayOfWeek();	// So=0, Mo=1

	if (currentDate instanceof Date) {
		var currentYear = currentDate.getFullYear();
		var currentMonth = currentDate.getMonth();
		var currentDate_1 = new Date(currentYear, currentMonth, 1);
		var currentDateFirstDay = currentDate_1.getDay();
		var currentDateDay1900 = reminderfox.date.convertDate(currentDate_1);  // numDate1900
		var gridDayNum = currentDateDay1900 - currentDateFirstDay + weekStartDay;
	} else
	{ // 'currentDate' passed as numDate for first day in grid
		var gridDayNum = currentDate;
		currentDate = reminderfox.date.convertDate(currentDate);
		var currentYear = currentDate.getFullYear();
		var currentMonth = currentDate.getMonth();
	}

	if (currentDateFirstDay < weekStartDay) gridDayNum = gridDayNum -7;

	// save the first day of the months-grid
	if(reminderfox.calendar.numDateMonths.first == null) reminderfox.calendar.numDateMonths.first = gridDayNum;

	var currentMonthLastDate = new Date(currentYear, currentMonth,
		reminderfox.date.getLastDayOfMonth (currentYear, currentMonth));
	var numCurrentMonthLastDate = reminderfox.date.convertDate(currentMonthLastDate);


	var monthTitleBox0 = document.createElement("hbox");
		monthTitleBox0.setAttribute("id", "reminderfox-calendar-month" + nMonth);
		monthTitleBox0.addEventListener("mouseover", function () {reminderfox.calendar.ui.panelClose();}, false);

		monthTitleBox0.setAttribute("class", "reminderfox-calendar-title-box");

		monthTitleBox0.setAttribute("numMonth", currentMonth);
		monthTitleBox0.setAttribute("numYear", currentYear);
		monthTitleBox0.setAttribute("nMonth", nMonth); // the month position in the month-grid
		monthTitleBox0.setAttribute("numMonths", numMonths); // total number of months

	if (numMonths == 1) {
			var monthTitleImageL = document.createElement("image");
			monthTitleImageL.setAttribute("class", "reminderfox-calendar-button-up");
			monthTitleImageL.addEventListener("click", function (event) {reminderfox.calendar.ui.selectMonth(event, -1);}, false);

			monthTitleImageL.setAttribute("tooltiptext",reminderfox.string("rf.calendar.selectmonth.previous"));
		monthTitleBox0.appendChild(monthTitleImageL);
	}
			var spacer0 = document.createElement("spacer");
			spacer0.setAttribute("flex", "1");
			spacer0.setAttribute("id", "spacer0");
		monthTitleBox0.appendChild(spacer0);

	var monthTitle = document.createElement("hbox");
		monthTitle.setAttribute("id", "reminderfox-calendar-month" + nMonth);

	var monthTitleBox = document.createElement("text");
		monthTitleBox.setAttribute("id", "reminderfox-calendar-month-title-" + currentMonth);
		monthTitleBox.setAttribute("class", "reminderfox-calendar-title");

		var mTitle =reminderfox.string("rf.options.month." + currentMonth + ".name");
		monthTitleBox.setAttribute("value",  mTitle);
	monthTitleBox0.appendChild(monthTitleBox);

		var spacer1 = document.createElement("spacer");
			spacer1.setAttribute("flex", "1");
			spacer1.setAttribute("id", "spacer1");
	monthTitleBox0.appendChild(spacer1);

	if ((nMonth == 0) && (numMonths != 1)) {
			var monthTitleImageL = document.createElement("image");
			monthTitleImageL.setAttribute("class", "reminderfox-calendar-button-up");
			monthTitleImageL.addEventListener("click", function (event) {reminderfox.calendar.ui.selectMonth(event, -1);},false);
			monthTitleImageL.setAttribute("tooltiptext",reminderfox.string("rf.calendar.selectmonth.previous"));
		monthTitleBox0.appendChild(monthTitleImageL);
	}

	if (nMonth == (numMonths-1)) {
			var monthTitleImageR = document.createElement("image");
			monthTitleImageR.setAttribute("class", "reminderfox-calendar-button-down");
			monthTitleImageR.addEventListener("click", function (event) {reminderfox.calendar.ui.selectMonth(event, 1);}, false);
			monthTitleImageR.setAttribute("tooltiptext",reminderfox.string("rf.calendar.selectmonth.next"));
		monthTitleBox0.appendChild(monthTitleImageR);
	}
	calndrGrid.appendChild(monthTitleBox0);


	// week rows of month
	for (var m = 0; m < 6; m++) {  // 5 or 6 rows for each 7 cells
		var weekRow = document.createElement("row");
		weekRow.setAttribute("id", "reminderfox-calendar-month-day-box-" + currentMonth + "-" + m);
		weekRow.setAttribute("class", "reminderfox-calendar-month-week");

		if (weeksShow != 0) {
				var weekOfYear = reminderfox.date.getWeekOfYear(gridDayNum, weekStartDay);
				var weekno = document.createElement("vbox");
				weekno.setAttribute("gridDayNum", gridDayNum);
				weekno.setAttribute("class", "reminderfox-calendar-week-number-box-class");
				weekno.setAttribute("id", "reminderfox-calendar-week-box-" + currentMonth + "-" + m);
				weekno.addEventListener("mouseover", function () {reminderfox.calendar.dayPanel (this,'weekNo');}, false);

				var alabel = document.createElement("label");
				alabel.setAttribute("class", "reminderfox-calendar-week-day-number");
				alabel.setAttribute("value", weekOfYear);
			weekno.appendChild(alabel);
			weekRow.appendChild(weekno);
		}

		// fill-in the day numbering
		for (var n = 1; n < 8; n++) {  // 7* cells
				var gDate = reminderfox.date.convertDate(gridDayNum);
				var vbox = document.createElement("vbox");
					vbox.setAttribute("class", "reminderfox-calendar-month-day-box-class");
 					vbox.setAttribute("nonheader", true);
					// label (show the month day)
					var alabel = document.createElement("label");
					alabel.setAttribute("class", "reminderfox-calendar-month-day-number-class");
					alabel.setAttribute("value", gDate.getDate());

					vbox.setAttribute("gridDayNum", gridDayNum);

					if (currentMonth == gDate.getMonth()) {
						alabel.setAttribute("id", "reminderfox-calendar-month-day-text-" + gridDayNum);

						vbox.setAttribute("id", "reminderfox-calendar-month-day-" + gridDayNum);
						vbox.setAttribute("gridColumn", n);

						vbox.addEventListener("dblclick", function (event) {if (event.button == 0) reminderfox.calendar.ui.eventAdd2(this, event);},false);
						vbox.addEventListener("click", function (event) {reminderfox.calendar.ui.mouseDayOnGrid(this, event);},false);

						vbox.addEventListener("mouseenter", function(event) {reminderfox.calendar.dayPanel (this, 'over', event);},false);
						vbox.addEventListener("mouseleave", function(event) {reminderfox.calendar.clearPanel ();},false);

					} else {
						vbox.addEventListener("mouseover", function(event) {reminderfox.calendar.dayPanel (this, 'wMonth', event);},false);
						vbox.addEventListener("mouseleave", function() {reminderfox.calendar.clearPanel();},false);
						vbox.setAttribute("gridColumn", n);
						alabel.setAttribute("notMonth", "true");
					}
					vbox.appendChild(alabel);

					gridDayNum++;
				weekRow.appendChild(vbox);
		}
		calndrGrid.appendChild(weekRow);
		if (gridDayNum > numCurrentMonthLastDate) break;
	}
	return gridDayNum;
};


/**
 * Check if requested Date is on displayed months-grid
 * @param requestedDate {date}
 * @return true||false
 */
reminderfox.calendar.grid.monthInGrid= function(requestedDate) {
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	if (document.getElementById('reminderfox-calendar-month0') == null) return 0;

	var N = document.getElementById('reminderfox-calendar-month0').getAttribute("numMonths")-1;
	var nMonth = document.getElementById('reminderfox-calendar-month0').getAttribute("nMonth");


	var date0 = document.getElementById('reminderfox-calendar-month0').getAttribute("numYear") +
		"_" +  reminderfox.date.num2(document.getElementById('reminderfox-calendar-month0').getAttribute("numMonth"));

	var dateN = document.getElementById('reminderfox-calendar-month' + N).getAttribute("numYear") +
		"_" +  reminderfox.date.num2(document.getElementById('reminderfox-calendar-month' + N).getAttribute("numMonth"));

	var dateX = reminderfox.date.getDateObject(requestedDate).getFullYear() +
		"_" + reminderfox.date.num2(reminderfox.date.getDateObject(requestedDate).getMonth());
	return ((dateX >= date0) && (dateX <= dateN)) ? true : false;
};



/**
 *  Store event to numDates based array
 *   @param {object} event
 *   @param {object} array to hold the reminders
 *   @param {date} optional: set event to another date as with reminder.date
 */
reminderfox.calendar.dateArray.EventAdd= function(event, daysArray, setToDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// noComplete     yellow       no complete date
// completed      gray         has complete date
// overdue        light-red

	var numDate = reminderfox.date.convertDate(event.date);
	if (setToDate != null) numDate = reminderfox.date.convertDate(setToDate)
		else setToDate = event.date;

	if (daysArray[numDate] == null) {
		daysArray[numDate] = [];
	}
	var numDate1 = daysArray[numDate].length;
	daysArray[numDate][numDate1] = event;
	var todaysDate = new Date();

	// add attributes for current instance -- important for repeat/ruc events!
	var attributes = [];
	attributes.push('reminder');

	if (event.priority != null) attributes.push('important');

	if (event.remindUntilCompleted && (event.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE /*null*/)) {
		if (event.completedDate != null) {
			if (reminderfox.core.isCompletedForDate(event, setToDate)) {
				attributes.push('completed');
			} else {
				//('notCompletedReminder');
			}
		}
	}

	if (event.completedDate != null) {
		if (reminderfox.core.isCompletedForDate(event, setToDate)) { /*if event.datecompleted is less selectedDate*/
				attributes.push('completed')
		}
		else {
				//('notCompletedReminder');
		}
	}

	if (event.remindUntilCompleted && (event.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED /*"2"*/)) {
		if (event.completedDate == null) attributes.push('overdue')

		if (event.completedDate != null) {
			if ((reminderfox.core.compareDates(event.completedDate, setToDate) == -1)
				&& (reminderfox.core.compareDates(setToDate, event.completedDate) == 1)
				&& (reminderfox.core.compareDates((new Date()), setToDate) == 1)
				) {  /*if event.date is equal or bigger*/
					attributes.push('overdue')
			}
		}
	}

	reminderfox.calendar.dateArray.DayAttributes(numDate, attributes, event.summary);
};


/**
 *  Update event in numDates based array called from addReminderDialog with
 *  updateInList after 'toggleRemindUntilCompleted' or 'toggleMarkAsComplete'
 *   @param {date}  set calendar focus to this date
 */
reminderfox.calendar.dateArray.EventUpdate= function(setToDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	reminderfox.calendar.numMonth = reminderfox.core.getPreferenceValue (reminderfox.consts.CALENDAR_MONTHS, reminderfox.consts.CALENDAR_MONTHS_DEFAULT)
	reminderfox.calendar.redrawDays (setToDate, reminderfox.calendar.numMonth)
	reminderfox.calendar.dateArray.DayAttributes (setToDate,['selectedReminder'])
};


/**
 *   Mark 'numDate'-date in new calendar with 'attribute' true, see CSS definitions
 *   @param {numDate} days numDate1900
 */
reminderfox.calendar.dateArray.DayAttributes= function (numDay, attributes, eventSummary) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var reminder    = "--"
	var completed   = "--"
	var overdue     = "--"
	var all         = ""

	numDay = reminderfox.date.getDateNum(numDay)
	var currentDay = document.getElementById('reminderfox-calendar-month-day-' + numDay)

	if (currentDay == null) {
		// reminderfox.util.Logger('Alert', ".dateArray.DayAttributes : " + numDay + "  " + reminderfox.date.getDateObject(numDay));
		return
	}
	if ((attributes == null) || (attributes.length == 0)) return;

	var len = attributes.length;
	for (var i=0; i < len; i++){
		currentDay.setAttribute(attributes[i], true);

		all        += attributes[i] + "; "
		reminder    = currentDay.getAttribute('reminder')
		completed   = currentDay.getAttribute('completed')
		overdue     = currentDay.getAttribute('overdue')
	}

//	var msg = ".dateArray.DayAttributes   " + numDay + "\n " +eventSummary +" :: "+ all
//		+ "\n  reminder|completed|overdue :   |r." + reminder + " |c." +  completed + " |o." + overdue
//reminderfox.util.Logger('ALERT', msg)
};


/**
 * Calculates based "reminderfox.datePicker.gSelectedDate" the weeknumber
 * of the first week in the calendar widget
 * ISO setting is respected
 * @return  {integer}  weekNo
 *
 */
reminderfox.calendar.aMonthFirstWeek= function() {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var showWeekNum = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_WEEK_NUMS_PREF, 0);
	// Week Numbering:  0 (none), 1 (default), 2 (ISO 8601)

	// get week number for .gSelectedDate
	var startOfThisMonthDate = new Date(reminderfox.datePicker.gSelectedDate.getFullYear(),
		reminderfox.datePicker.gSelectedDate.getMonth(), 1);

	var dowOffset = reminderfox.datePicker.StartingDayOfWeek();

	var newYear = new Date(startOfThisMonthDate.getFullYear(), 0, 1);
	var day = newYear.getDay() - dowOffset;

	//the day of week the year begins on
	day = (day >= 0 ? day : day + 7);
	var daynum = Math.floor((startOfThisMonthDate.getTime() - newYear.getTime()
		- (startOfThisMonthDate.getTimezoneOffset()
		- newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;

	var weeknum = Math.floor((daynum + day - 1) / 7);
	var useISO = showWeekNum == 2;
	if(!useISO || day < 4) {// if using ISO standard, first week w/ day starting after Wed are 0-week;
		weeknum = weeknum + 1;
		// otherwise, weeks start at 1
	}

	return weeknum;
};


// ======================= .calendar widget ===============================
reminderfox.calendar.dayPanelStatus = null;
reminderfox.calendar.popupID = null;
reminderfox.calendar.popupDay = null;

reminderfox.calendar.clearPanel= function(){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	window.clearTimeout(reminderfox.calendar.popupID);
}

/**
 *   With (onmouseover) hovering the cursor over a day in the Calendar month grid
 *   a panel opens and shows the day box with it's events;
 *   if there is a previous day box popup its closed;
 *   pending popups will be killed;
 *   @param {object} anchor - location at where the tooltip is shown
 *   @param {numDate} days numDate1900
 *   @param {string}  'over' = construct TTT and open it
 *                    ('out' needs to select position outside of TTT)
 */
reminderfox.calendar.dayPanel= function(anchor, mode, xEvent){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var numDate = anchor.getAttribute('gridDayNum')

	//var msg = 'calendar.dayPanel  mode>' + mode + "<  numDate:" + numDate
	//	+ "\n  reminderfox.datePicker.gSelectedDate  " + reminderfox.datePicker.gSelectedDate
	//	+ "  " + reminderfox.date.convertDate(numDate).toLocaleString();
	// reminderfox.util.Logger('ALERT', msg);

	// before poping the daybox panel, close all other panels
	window.clearTimeout(reminderfox.calendar.popupID);
	reminderfox.calendar.ui.panelClose();

	if (reminderfox.calendar.dayPanelStatus != null)
			reminderfox.calendar.dayPanelStatus.hidePopup();

	if (reminderfox.calendar.numDaysArray == null) return;
	if (reminderfox.calendar.numDaysArray[numDate] == null) return;

	if (reminderfox.datePicker.gSelectedDate == null) reminderfox.datePicker.gSelectedDate = numDate

	// with Calendar only and having the selected day in focus dont popup
	// the day panel
	if ((reminderfox.calendar.layout.status == 0)
		&& (reminderfox.date.getDateNum(reminderfox.datePicker.gSelectedDate) == numDate)) return;


	if (mode == 'over') {
		// if there are previous popup for same day do nothing
		//if (reminderfox.calendar.popupDay == numDate) return;
		if(typeof reminderfox.calendar.popupID == "number") {
			window.clearTimeout(reminderfox.calendar.popupID);
			reminderfox.calendar.popupID = null;
			reminderfox.calendar.popupDay = null;
		}
		reminderfox.calendar.popupDay = numDate;

		var popupDelayInMS=reminderfox.core.CALENDAR_DAYPOPUP_DELAY;
		reminderfox.calendar.popupID = setTimeout(function () {
			reminderfox.calendar.dayPanel2 (anchor, numDate, xEvent)}, popupDelayInMS)
	};
};


reminderfox.calendar.dayPanel2= function(anchor, numDate, xEvent){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		var dayPanel = document.getElementById("reminderfox-calendar-dayPanel");
		var calendarBox = document.getElementById("reminderfox-calendar-box");

		reminderfox.calendar.popupDay = null;

		var xpos = anchor.boxObject.x + anchor.boxObject.width * .5;

		while (dayPanel.hasChildNodes()) {
			dayPanel.removeChild(dayPanel.firstChild);}

		dayPanel.setAttribute("numDate", numDate);

		var numDates = 'numDaysArray';

		reminderfox.calendar.selectedDate = numDate;
		reminderfox.calendar.ttt.addDay (dayPanel, numDate);
		reminderfox.calendar.dayBox (dayPanel, numDate);

		var xpos = anchor.boxObject.x + anchor.boxObject.width * .2;

		var aheight =  anchor.boxObject.height;  // height of the DayBox
		var a = anchor.boxObject.screenY;

		var editWindow = document.getElementById('editRemindersWindow');
		if (editWindow != null) {
			var w = editWindow.boxObject.screenY
			var ypos = +a - w + aheight/2;
		} else {
			var w = calendarBox.boxObject.screenY
			var ypos = +a - w + aheight*1.7
		}
/*---
	var aX = anchor.boxObject.x
	var aY =anchor.boxObject.y

 var msg = '.calendar.dayPanel2   editWindow:'+ editWindow + '\n  ypos: '+ ypos
		+ "\n   anchor.boxObject.screenY  a: " + a + " aheight : " + aheight
		+ "\n   editWindow.boxObject.screenY w: " + w
		+ "\n screen  X:" + xEvent.screenX + " | " + xEvent.screenY
		+ "\n box     X:" + anchor.boxObject.x + " | " + anchor.boxObject.y  + " boxheight : " +  anchor.boxObject.height;
 reminderfox.util.Logger('calndrDayPanel', msg);
----*/
		reminderfox.calendar.dayPanelStatus = dayPanel;
		reminderfox.calendar.dayPanelStatus.removeAttribute('hidden');
		reminderfox.calendar.dayPanelStatus.openPopup(null, "", xpos, ypos, false, false);
};


reminderfox.calendar.dayBox= function(anchor, numDate){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	if (reminderfox.calendar.numDaysArray != null) {
		if (reminderfox.calendar.numDaysArray[numDate] != null) { // reminders on day
				var len = reminderfox.calendar.numDaysArray[numDate].length
				for (var n=0; n < len; n++) {
					reminderfox.calendar.numDaysArray[numDate][n].dateRef = reminderfox.calendar.numDaysArray[numDate][n].date.getTime();
				}

				reminderfox.calendar.numDaysArray[numDate].sort(function (a,b) {
					if (a.dateRef > b.dateRef) return  1;
					if (a.dateRef < b.dateRef) return -1;
					return 0;
				});
			var len = reminderfox.calendar.numDaysArray[numDate].length
			for (var n=0; n < len; n++) {
				var reminder = reminderfox.calendar.numDaysArray[numDate][n];
				var isCompleted = reminderfox.core.isCompletedForDate(reminder, reminder.date);
				reminderfox.calendar.ttt.addReminder(anchor, reminder, n, 'dayPanelOpen', numDate);
			};

			var flexDrawer = document.createElement("spacer");
				flexDrawer.setAttribute("flex", "1");
			anchor.appendChild(flexDrawer);

		};
	}
};


// ======================= .calendar.ttt =======================================

/**
 * For the 'selected' day add day-header and all events to day box
 */
reminderfox.calendar.ttt.dayEvents= function(dayBox, numDate){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	dayBox.setAttribute("flex", "1");
	dayBox.setAttribute("gridDateNum", numDate);

	reminderfox.calendar.ttt.addDay (dayBox, numDate);
	reminderfox.calendar.dayBox (dayBox, numDate);

	return dayBox;
};


/**
 *
 */
reminderfox.calendar.ttt.addDay= function(dayPanel, numDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var aDate = reminderfox.date.getDate (numDate);
	var wDay = aDate.getDay();
	var aDateDay = reminderfox.string("rf.options.day."+ wDay + ".name.MMM");

	var dayString = aDateDay + " " + reminderfox.date.parseDateTimes
		(reminderfox.date.getDate (numDate), false /*noTimeString*/)
	//	+ "   [" + numDate + "]" //   noNumDate
	;

	var dayBox = document.createElement("hbox");
	dayBox.setAttribute("id", "rmFx_dayPanelDayBox-" + numDate);
	dayBox.setAttribute("class", "rmFx_dayPanelDayBox");
	dayBox.setAttribute("flex", "0");

	//  add link (numDate or reminder.id)
	var reminderID = "date:" + numDate;
	dayBox.addEventListener("click", function(event) {reminderfox.calendar.ui.eventAdd(this, event);},false)

	dayBox.setAttribute("idValue", reminderID);
	dayBox.setAttribute("numDate", numDate);
	dayBox.setAttribute("cursor", "pointer");

	var title = document.createElement("label");
	title.setAttribute("value", dayString);
	title.setAttribute("style", "font-weight:bold");
	title.setAttribute("crop", "end");
	title.setAttribute("flex", "1");
	dayBox.appendChild(title);

	dayPanel.appendChild(dayBox);
};


reminderfox.calendar.ttt.addReminder= function(dayPanel, reminder, nEvent, mode, numDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var _add2Date = reminderfox.date.getDate(numDate);

	var eventDrawer = document.createElement("vbox");
		eventDrawer.setAttribute("class", "rmFx_dayPanelEvent");
		eventDrawer.setAttribute("flex", "0");


	// eventBox
	var eventBox = document.createElement("vbox");
		eventBox.addEventListener("click", function(event) {reminderfox.calendar.ui.eventMenus(this, event, numDate);},false);
		eventBox.setAttribute("idValue", nEvent);

	eventDrawer.appendChild(eventBox);

	// *** check current reminder for some attributes ***
	var icons = {};
	icons.Important = (reminder.priority == reminderfox.consts.PRIORITY_IMPORTANT);

	// needs to check against to current addressed numDate
	icons.Completed = reminderfox.core.isCompletedForDate(reminder, _add2Date);  // reminder.date));

	icons.Location = (reminder.location !== null) ? true: false;
	icons.Url = (reminder.url !== null) ? true: false;
	icons.Notes = ( reminder.notes !== null) ? true: false;

	icons.Mail = (reminder.messageID !== null) ? true: false;

	icons.CalDAV = ((reminder.calDAVid != null) && (reminder.calDAVid != "")) ? true: false;
	icons.Categories = (reminder.categories != null) && (reminder.categories != "") ? true: false;

	var showTTT = reminder.showInTooltip
	if (showTTT != null) icons.showInTooltip =  !!(+showTTT == 1);

	var summaryStyle = "font-weight:bold; ";
	if (icons.Important) summaryStyle += " color: red;"
	if (icons.Completed) summaryStyle += " text-decoration: line-through;"


	// *** handle date &time ***
	var dateString = "";
	var reminderDateNum = "";
	var reminderEndDateNum = "";

	if (reminder.date != null) { //build begin date and time
		reminderDateNum = reminderfox.date.convertDate(reminder.date);
		reminderEndDateNum = reminderfox.date.convertDate(reminder.endDate);

		var beginDateStr = reminderfox.date.getDateVariableString(reminder, reminder.date);
		var beginTimeStr = reminderfox.date.getTimeString(reminder.date);
		var endDateStr = reminderfox.date.getDateVariableString(reminder, reminder.endDate);
		var endTimeStr = reminderfox.date.getTimeString(reminder.endDate);
		var endDate = new Date(parseInt(reminder.endDate.getTime()));

		var end1Date = reminderfox.date.convertDate(reminderEndDateNum -1);
		var endDate1Str = reminderfox.date.getDateVariableString(reminder, end1Date);

		var logMsg =  '.ttt.addReminder   summary:' + reminder.summary + '  allDay:' + reminder.allDayEvent
		   + '\n    reminder.date   :' + reminderfox.date.convertDate(reminder.date) + "  " + reminder.date
		   + '\n    reminder.endDate:' + reminderfox.date.convertDate(reminder.endDate) + "  " + reminder.endDate
//reminderfox.util.Logger('calndrGrid', logMsg)

		if (reminder.allDayEvent) {	// all Day event
			if (reminderDateNum == (reminderEndDateNum -1)) { // not for oneDay event
			} else {
						dateString = beginDateStr + ' -- ' + endDate1Str;
			}

		} else { // event has 'time' value(s)

			if // // one day..
				(reminderDateNum == reminderEndDateNum) {
				dateString =  beginTimeStr + ' -- ' + endTimeStr;
			}
			else { // multiple days
				dateString = beginDateStr + ', ' + beginTimeStr +' -- ' + endDateStr + ', ' + endTimeStr;
			}
		}

		if (dateString != "") dateString += "    ";
	}

	//  TTT first line w date/time and summary
	if (dateString != "") {
		reminderfox.calendar.ttt.addLabel(eventBox, 'summary',
			dateString, summaryStyle, "", nEvent, reminderDateNum, mode);
	}

	//  TTT  attribute-icons and summary
	reminderfox.calendar.ttt.addLabel(eventBox, 'summary',
		reminder.summary, summaryStyle, "", nEvent, reminderDateNum, mode, reminder.id);

	if (reminder.completedDate != null) {
		var completedDate = reminderfox.date.getDateVariableString(
				reminder, reminder.completedDate);
		reminderfox.calendar.ttt.addLabel(eventBox, null,
			completedDate, "", reminderfox.string("rf.add.reminders.tooltip.dateCompleted"), nEvent, reminderDateNum, mode);
	}

	if (icons.Location) {
		reminderfox.calendar.ttt.addUrlLine(eventDrawer, reminder.location,
			reminderfox.string("rf.add.reminders.tooltip.locaton"), reminderDateNum);
	}

	if (icons.Url) {
		reminderfox.calendar.ttt.addUrlLine(eventDrawer, reminder.url,
			reminderfox.string("rf.add.reminders.tooltip.url"), reminderDateNum);
	}
	reminderfox.calendar.ttt.addIconLine(eventDrawer, icons, summaryStyle, reminder, nEvent, reminderDateNum, mode);

	// spacer
	var spacer = document.createElement("hbox");
	spacer.setAttribute("class", "reminderFox-footer2");
	spacer.setAttribute("align", "center");
	eventDrawer.appendChild(spacer);

	dayPanel.appendChild(eventDrawer);
};


reminderfox.calendar.ttt.addLabel= function(dayPanel,
	columnId, value, sStyle, labelText, idValue, numDate, mode, rmID) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var eventbox = document.createElement("hbox");
		eventbox.setAttribute("flex", "1");

	var columnLabel;
	if (columnId == null) { columnLabel = labelText;
	} else {
		if (columnId != 'summary') columnLabel = getLabelForColumn(columnId)
	}

	// add link
	if (idValue != null) {
		eventbox.setAttribute("idValue", idValue);

		eventbox.setAttribute("numDate", numDate);
		eventbox.setAttribute("mode", mode);
	}

	if ((columnLabel != null) && (columnId != 'summary')) {
		var title = document.createElement("description");
		title.setAttribute("value", columnLabel + "  ");
		title.setAttribute("style", "font-weight:bold;");
		title.setAttribute("flex", "1");
		title.setAttribute("crop", "end");
		title.setAttribute("numDate", numDate);
		if (rmID != null) title.setAttribute("rmID", rmID);

		eventbox.appendChild(title);
	}

	var tooltipValue = document.createElement("description");
	tooltipValue.setAttribute("value", value);
	tooltipValue.setAttribute("class", "rmFx_dayPanelEventTitel");
	tooltipValue.setAttribute("style", sStyle);
	tooltipValue.setAttribute("crop", "end");
	tooltipValue.setAttribute("flex", "1");

	tooltipValue.setAttribute("tooltiptext", value);

	tooltipValue.setAttribute("numDate", numDate);
	tooltipValue.setAttribute("idValue", idValue);
	eventbox.appendChild(tooltipValue);

	dayPanel.appendChild(eventbox);
};


reminderfox.calendar.ttt.addUrlLine= function (eventDrawer, reminderUrl, labelText, numDate) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var eventbox = document.createElement("hbox");

	var urlLabel = document.createElement("description");
	urlLabel.setAttribute("value", labelText + "   ");
	urlLabel.setAttribute("style", "font-weight:bold");
	eventbox.appendChild(urlLabel);

	var urlLink = document.createElement("description");
	urlLink.setAttribute("id", "urlLink");
	urlLink.setAttribute("style","max-width: 300px; text-decoration: underline; color: blue; cursor: pointer;");
	urlLink.addEventListener("click", function() {reminderfox.calendar.ui.openUrl(this);},false);
	urlLink.setAttribute("value", reminderUrl);
	urlLink.setAttribute("crop", "end");
	urlLink.setAttribute("flex", "1");
	urlLink.setAttribute("numDate", numDate);
	eventbox.appendChild(urlLink);

	eventDrawer.appendChild(eventbox);
};


reminderfox.calendar.ttt.addIconLine= function (eventDrawer, icons, summaryStyle, reminder, nEvent, numDate, mode) {
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	// icons List:  .Completed, .Mail, .Categories, .Notes;

	var iconbox = document.createElement("hbox");

	var spacer1 = document.createElement("spacer");
	iconbox.appendChild(spacer1);
		spacer1.setAttribute("width", "10px");


//gWCalDAV
	if (icons.CalDAV == true) { // isCalDAV
		var calDAVTTT = "";
		var account = reminderfox.calDAV.getAccounts()[reminder.calDAVid];
		if (account != null) {
			calDAVTTT = reminderfox.string("rf.caldav.calendar.account") + " [ " +reminder.calDAVid + " ] " + account.Name;
			var icon = document.createElement("toolbarbutton");
			icon.setAttribute("class", "rmFx-calDAV-share");
			icon.setAttribute("numDate", numDate);
			icon.setAttribute("tooltiptext", calDAVTTT);
			iconbox.appendChild(icon);
		}
	};

	if (icons.Mail == true) { // isMail
		var icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayMail");
		icon.setAttribute("type", "checkbox");
		icon.setAttribute("idValue", nEvent);
		icon.setAttribute("numDate", numDate);
		icon.addEventListener("click", function() {reminderfox.calendar.ui.openByMessageID(this);},false);
		icon.setAttribute("tooltiptext", reminderfox.string("rf.add.mail.message.open"));
		iconbox.appendChild(icon);
	};

	if (icons.Categories == true) { // isCategories
		var icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayCategory");
		icon.setAttribute("tooltiptext", reminderfox.string("rf.add.reminders.tooltip.categories")+ ": " +reminder.categories);
		iconbox.appendChild(icon);
	};

	if (icons.Notes == true) { // isNotes
		var icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayNotes");
		icon.setAttribute("tooltiptext", reminder.notes);
		iconbox.appendChild(icon);
	};

	if (reminder.remindUntilCompleted != null) { // reminder
		var icon = document.createElement("toolbarbutton");
		if (reminder.remindUntilCompleted == "1") icon.setAttribute("class", "remindUntilCompleted1");
		if (reminder.remindUntilCompleted == "2") icon.setAttribute("class", "remindUntilCompleted2");
		var statusText = (reminder.remindUntilCompleted == 2)
			? reminderfox.string("rf.calendar.overdue.isoverdue")
			: reminderfox.string("rf.calendar.overdue.remindoverdue");		//§§§§  missing string    //$$$_locale
		icon.setAttribute("tooltiptext", statusText);

		iconbox.appendChild(icon);
	};

	if (reminder.recurrence.type != null) {
		var icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayRecurrence");
		icon.setAttribute("numDate", numDate);
		var currentDate =  new Date()
		var s = reminderfox.core.writeOutRecurrence(reminder, currentDate, ", ", "");  // (reminder, currentDate, separator, newline)

		// dayBox TTT   -- delete first line for release
	//	icon.setAttribute("tooltiptext", s + "\n" + reminderfox.date.recurrenceString(reminder, currentDate, s));
		icon.setAttribute("tooltiptext", reminderfox.date.recurrenceString(reminder, currentDate));
		iconbox.appendChild(icon);		//gWUIstrings
	};

	if (reminder.alarm != null) {
		var icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayAlarm");
		icon.setAttribute("numDate", numDate);
		icon.setAttribute("tooltiptext", reminderfox.date.alarmInfo(reminder)); 	//gWUIstrings
		iconbox.appendChild(icon);
	};

	if (icons.showInTooltip && (icons.showInTooltip == true)) { //
		var icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayShowInTooltip");
		icon.setAttribute("tooltiptext", reminderfox.string("rf.calendar.tooltip.showInTooltip"));
		iconbox.appendChild(icon);
	};

	eventDrawer.appendChild(iconbox);
};


/**
 * Add Foxy to the Calendar -- switchable
 */
reminderfox.calendar.activateCalendarFoxyContext = function(event){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var hideFoxy = reminderfox.core.getPreferenceValue(reminderfox.consts.HIDE_FOX_PAW, false);
	if (hideFoxy) {
		document.getElementById('reminderfox-y-hide-menu').setAttribute("hidden", "true");
		document.getElementById('reminderfox-y-show-menu').removeAttribute("hidden");
	}
	else {
		document.getElementById('reminderfox-y-show-menu').setAttribute("hidden", "true");
		document.getElementById('reminderfox-y-hide-menu').removeAttribute("hidden");
	}
};


reminderfox.calendar.toggleFoxy = function(){
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	var hideFoxy = reminderfox.core.getPreferenceValue(reminderfox.consts.HIDE_FOX_PAW, false);

	hideFoxy = !hideFoxy; // toggle the pref
	reminderfox.core.setPreferenceValue(reminderfox.consts.HIDE_FOX_PAW, hideFoxy);

	if (hideFoxy) {
		document.getElementById('reminderfox-y-calendar').setAttribute("hidden", "true");
	}
	else {
		document.getElementById('reminderfox-y-calendar').removeAttribute("hidden");
	}
}
