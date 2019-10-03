var reminderFox_snoozed = false;
var reminderFox_okayed = false;

var reminderFox_reopeningWindow = false;
/*--------  moved to reminderFox.Core.js
const REMINDERFOX_ACTION_TYPE = {
	ACKNOWLEDGE : 0,
	COMPLETE : 1,
	DELETE : 2,
	OPEN : 3,
	SNOOZE : 4
};
------*/

const MAX_TAB_TITLE_LENGTH = 30;
var reminderAlarmArray = new Array();
var reminderFox_QAcalendarOpened = false;

function updateTimeUntil() {
	//dump( "FOCUSE" );
	// after FIRST focus; see if focus lost happens within a second...
	// or on WINDOW load start a timer - then see if onFocusLeave happens quickly.  If so probably need to re-alert in
	// X-minutes.  As part of re-alert, maybe re-open the window to retrieve focus again?
	var tabList = document.getElementById("tabList");
	if(tabList != null) {
		var index = tabList.selectedIndex;

		if(index < reminderAlarmArray.length) {
			var recentReminder = reminderAlarmArray[index].alarmRecentReminder;

			if(getChildElementByIdForCurrentTab("timeUntilHBox") != null) {

				if(getChildElementByIdForCurrentTab("timeUntilHBox").getAttribute("hidden") != "true" && getChildElementByIdForCurrentTab("timeUntilHBox").getAttribute("hidden") != true) {
					if(recentReminder != null) {
						var timeUntil = reminderfox.overlay.getTimeUntilDate(recentReminder.date, recentReminder);

						if(timeUntil != null && timeUntil != "") {
							getChildElementByIdForCurrentTab("timeUntilText").setAttribute("value", timeUntil);
						} else {
							// the time has passed:  remove TimeUntil:
							// note: setting hidden property did some strange redrawing of elements; instead
							// let's just clear the text from the labels
							//getChildElementByIdForCurrentTab("timeUntilHBox").setAttribute("hidden", "true");
							getChildElementByIdForCurrentTab("timeUntilLabel").setAttribute("value", "");
							getChildElementByIdForCurrentTab("timeUntilText").setAttribute("value", "");
						}
					} else {
						// a quickalarm - remove TimeUntil:
						getChildElementByIdForCurrentTab("timeUntilLabel").setAttribute("value", "");
						getChildElementByIdForCurrentTab("timeUntilText").setAttribute("value", "");
					}
				}
				reminderFox_updateSnoozeTimeDate();
			}
		}
	}
}

function loadAlarm() {
	reminderFox_reopeningWindow = false;
	reminderAlarmArray = window.arguments[0].alarmInfos;

	var msg = "loadAlarm    no of alarms: " + reminderAlarmArray.length;

	calDAVaccounts = window.arguments[0].calDAVaccounts;

	var panels = document.getElementById("tabPanelID");
	var tabList = document.getElementById("tabList");

	// see if any notes...
	var hasNotes = false;
	for(var i = 0; i < reminderAlarmArray.length; i++) {
		if( (reminderAlarmArray[i].alarmRecentReminder != null && reminderAlarmArray[i].alarmRecentReminder.notes != null ) ||
			reminderFox_nullCheck(reminderAlarmArray[i].quickAlarmNotes)) {
			hasNotes = true;
		}
	}

	for(var i = 0; i < reminderAlarmArray.length; i++) {
		var tabTitle = null;
		if(reminderAlarmArray[i].alarmRecentReminder != null) {
			reminderAlarmArray[i].alarmRecentReminder = reminderfox.core.processReminderDescription(reminderAlarmArray[i].alarmRecentReminder, new Date().getFullYear(), reminderAlarmArray[i].alarmIsTodo);
			tabTitle = reminderAlarmArray[i].alarmRecentReminder.summary;
		} else {
			tabTitle = reminderAlarmArray[i].quickAlarmText;
		}

		if(tabTitle != null && tabTitle.length > MAX_TAB_TITLE_LENGTH) {
			tabTitle = tabTitle.substring(0, MAX_TAB_TITLE_LENGTH);
		}

		var tabPanel = null;
		if(i == 0) {
			tabPanel = panels.childNodes[0];
			var tab = tabList.childNodes[0];
			tab.setAttribute("label", tabTitle);
			reminderAlarmArray[i].alarmTabPanel = tabPanel;
		} else {
			var remindersTab = panels.childNodes[0];
			var newTabList = document.createElement("tab");
			newTabList.setAttribute("id", "reminderFoxList:1");
			newTabList.setAttribute("label", tabTitle);
			tabList.appendChild(newTabList);

			var newtabpanel = remindersTab.cloneNode(true);
			newtabpanel.setAttribute("id", "reminderFoxListPanel:1");
			panels.appendChild(newtabpanel);
			reminderAlarmArray[i].alarmTabPanel = newtabpanel;
			tabList.selectedIndex = tabList.childNodes.length - 1;
		}

		var tabbox = document.getElementById("tabbox");
		tabbox.selectedPanel = reminderAlarmArray[i].alarmTabPanel;

		initializeAlarm(reminderAlarmArray[i], hasNotes, i == 0);

	}

	playAlarmSound();
	selectAlarmTab();

	// ensure last tab is selected and visible
	var arrowscrollbox = document.getElementById("arrowscrollbox");
	var lasttab = tabList.childNodes[tabList.childNodes.length - 1];
	arrowscrollbox.scrollByIndex(tabList.childNodes.length - 1);
	arrowscrollbox.ensureElementIsVisible(lasttab);
	arrowscrollbox.scrollByPixels(100);
}

function getChildElementById(parentNode, elementId) {
	for(var i = 0; i < parentNode.childNodes.length; i++) {
		var node = parentNode.childNodes[i];
		if(node.id == elementId) {
			return node;
		} else {
			var foundNode = getChildElementById(node, elementId);
			if(foundNode != null) {
				return foundNode;
			}
		}
	}
	return null;
}

function getChildElementByIdForCurrentTab(elementId) {
	var tabbox = document.getElementById("tabbox");
	if(tabbox == null) {
		return document.getElementById(elementId);
	}
	var parentNode = tabbox.selectedPanel;
	var node = getChildElementById(parentNode, elementId);
	if(node != null) {
		return node;
	} else {
		return document.getElementById(elementId);
	}

}

// truncate the link text that is displayed to 80 chars;
// otherwise the alarm window widens to accomodate it
// and it can get out of hand
function reminderFox_getLinkDisplayText(linkurl) {
	if(linkurl.length > 80) {
		return linkurl.substring(0, 80) + "...";
	} else {
		return linkurl;
	}
}

function initializeAlarm(reminderAlarmOptions, hasNotes, firstTab) {
	var icon, currentDate;

	var snoozeUnitsIndex, defaultActionIndex;

	var tabPanel = reminderAlarmOptions.alarmTabPanel;
	var recentReminder = reminderAlarmOptions.alarmRecentReminder;

//current instance
	var recentReminderInstance = reminderAlarmOptions.recentReminderOrTodo;
	var quickAlarmText = reminderAlarmOptions.quickAlarmText;
	var snoozeTime = reminderAlarmOptions.alarmSnoozeTime;
	var alarmListName = reminderAlarmOptions.alarmListName;
	var isTodo = reminderAlarmOptions.alarmIsTodo;
	var isReminder = reminderAlarmOptions.alarmIsReminder;
	var alarmMissed = reminderAlarmOptions.alarmAlarmMissed;
	var snoozeTimeList = getChildElementById(tabPanel, "reminderFox-snoozeTime");
	var timeUnitsList = getChildElementById(tabPanel, 'reminderFox-alertTimeUnits');
	var actionList = getChildElementByIdForCurrentTab("reminderFox-alarm-action");
	if(snoozeTime != null && reminderfox.util.isInteger(snoozeTime)) {
		var snoozeTimeInt = parseInt(snoozeTime);
		if(snoozeTimeInt == 0) {
			snoozeTimeList.label = snoozeTime;
			timeUnitsList.selectedIndex = 0;
		} else if(reminderfox.util.mod(snoozeTimeInt, (60 * 24)) == 0) {
			// days
			snoozeTimeList.label = (snoozeTimeInt / (60 * 24));
			timeUnitsList.selectedIndex = 2;
		} else if(reminderfox.util.mod(snoozeTimeInt, 60) == 0) {
			// hours
			snoozeTimeList.label = (snoozeTimeInt / 60);
			timeUnitsList.selectedIndex = 1;
		} else {
			// minutes
			snoozeTimeList.label = snoozeTime;
			timeUnitsList.selectedIndex = 0;
		}
	} else {
		// set initial snooze values from defaults
		snoozeTime = 5;
		snoozeUnitsIndex = 0;
		defaultActionIndex = 0;
		try {
			snoozeTime = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SNOOZE_TIME_DEFAULT, 5);
			if(snoozeTime != null && reminderfox.util.isInteger(snoozeTime)) {
				snoozeTimeList.label = snoozeTime;
			}
			snoozeUnitsIndex = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SNOOZE_UNITS_DEFAULT, 0);
			if(snoozeUnitsIndex != null && reminderfox.util.isInteger(snoozeUnitsIndex)) {
				timeUnitsList.selectedIndex = snoozeUnitsIndex;
			}

		} catch ( e) {
		}
	}
	defaultActionIndex = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SNOOZE_ACTION_DEFAULT, 0);
	if(defaultActionIndex != null && reminderfox.util.isInteger(defaultActionIndex)) {
		actionList.selectedIndex = defaultActionIndex;
	}

	if(quickAlarmText != null) {
		getChildElementById(tabPanel, "reminderDescriptionText").setAttribute("value", quickAlarmText);
		recentReminder = null;  // don't process for recent reminder now
	} else {
		recentReminder = reminderfox.core.processReminderDescription(recentReminder, new Date().getFullYear(), isTodo);
		var reminderString = recentReminder.summary;

		getChildElementById(tabPanel, "reminderDescriptionText").setAttribute("value", reminderString);

		var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
		var dateString = reminderfox.date.getDateVariable(null, recentReminder.date, _dateVariableString);

		document.title = reminderFox_alarmListNameCheck(alarmListName) + " " + reminderfox.string("rf.alarm.title");  // 'Reminderfox'

		// if this is a past reminder, indicate that in the title
		if(alarmMissed == "true") {
			// only show missed if the event itself has been missed...
			currentDate = new Date();
			var compare = 0;
			if(recentReminder.allDayEvent) {
				// compare dates
				compare = reminderfox.core.compareDates(currentDate, recentReminder.date);
			} else {
				// compare dates and times
				compare = reminderFox_compareAlarmTimes(currentDate, recentReminder.date);
			}

			if(compare == 1) {
				// compare Dates: recentReminder.date, currentDate.
				// if current date is after reminder date, show 'missed'
				document.title = " (" + reminderfox.string("rf.alarm.missedalarm.title") + ") " + document.title;
			}
		}

		document.title = reminderString + " " + document.title;
		getChildElementById(tabPanel, "reminderDateText").setAttribute("value", dateString);

		var timeString = reminderfox.overlay.getTimeString(recentReminder, recentReminder.date);
		if(timeString == null) {
			timeString = reminderfox.string("rf.add.time.allday");
		}

		getChildElementById(tabPanel, "reminderTimeText").setAttribute("value", timeString);

		var timeUntil = reminderfox.overlay.getTimeUntilDate(recentReminder.date, recentReminder);
		if(timeUntil != null && timeUntil != "") {
			getChildElementById(tabPanel, "timeUntilHBox").removeAttribute("hidden");
			getChildElementById(tabPanel, "timeUntilText").setAttribute("value", timeUntil);
		} else {
			getChildElementById(tabPanel, "timeUntilHBox").setAttribute("hidden", true);
			getChildElementById(tabPanel, "timeUntilText").setAttribute("value", "");
		}

	}

	if(recentReminder != null) {
		getChildElementById(tabPanel, "reminderFox-alarm-action").removeAttribute("hidden");
	} else {
		getChildElementById(tabPanel, "reminderFox-alarm-action").setAttribute("hidden", true);
	}

	if(recentReminder != null && recentReminder.date != null) {
		getChildElementById(tabPanel, "reminderDateText").removeAttribute("hidden");
		getChildElementById(tabPanel, "reminderDateLabel").removeAttribute("hidden");
		//getChildElementById(tabPanel, "timeDescLabel").removeAttribute("hidden");
		getChildElementById(tabPanel, "reminderTimeText").removeAttribute("hidden");

	} else {
		getChildElementById(tabPanel, "reminderDateLabel").setAttribute("hidden", true);
		getChildElementById(tabPanel, "reminderDateText").setAttribute("hidden", true);
		getChildElementById(tabPanel, "reminderTimeText").setAttribute("hidden", true);
	}

	var tabbox = document.getElementById("tabbox");
	var selectedPanel = tabbox.selectedPanel;

	// *** for attributeIcons  check current reminder for some attributes ***
	var icons = {};
	icons.Important = false;
	icons.Location = false;
	icons.Url = false;
	icons.Notes = false;
	icons.Mail = false;

	icons.CalDAV = false;
	icons.Categories = false;

	icons.showTTT = false;


	if (recentReminder != null){ // process Alarm (not QuickAlarm)
		// icons.Important = (recentReminder.priority == reminderfox.consts.PRIORITY_IMPORTANT);
		if(recentReminder.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
			icons.Important = true;
		}

		// needs to check against to current  Date
		var cDate = new Date();
		icons.Completed = reminderfox.core.isCompletedForDate(recentReminder, cDate);  // reminder.date));

		icons.Location = (recentReminder.location !== null) ? true: false;
		icons.Url = (recentReminder.url !== null) ? true: false;
		icons.Notes = ( recentReminder.notes !== null) ? true: false;

		icons.Mail = (recentReminder.messageID !== null) ? true: false;

		icons.CalDAV = ((recentReminder.calDAVid != null) && (recentReminder.calDAVid != "")) ? true: false;
		icons.Categories = (recentReminder.categories != null) && (recentReminder.categories != "") ? true: false;

		var showTTT = recentReminder.showInTooltip;
		if (showTTT != null) icons.showInTooltip =  !!(+showTTT == 1);


		var summaryStyle = "font-weight:bold; ";
		if (icons.Important) summaryStyle += " color: red;";
		if (icons.Completed) summaryStyle += " text-decoration: line-through;";
	}

	var attributeIcons = getChildElementById(tabPanel, "attributeIcons");
	while (attributeIcons.hasChildNodes()) {
		attributeIcons.removeChild(attributeIcons.lastChild);
	}

	var spacer1 = document.createElement("spacer");
	attributeIcons.appendChild(spacer1);
		spacer1.setAttribute("width", "10px");
		spacer1.setAttribute("height", "18px");

	//gWCalDAV
	if (icons.CalDAV == true) { // isCalDAV
		var calDAVTTT = "";
		var account = reminderfox.calDAV.getAccounts()[recentReminder.calDAVid];
		if (account != null) {
			calDAVTTT = reminderfox.string("rf.caldav.calendar.account") + ' [' +recentReminder.calDAVid + '] ' + account.Name;
			icon = document.createElement("toolbarbutton");
			icon.setAttribute("class", "rmFx-calDAV-share");
	//		icon.setAttribute("idValue", n);
	//		icon.setAttribute("numDate", numDate);
			icon.setAttribute("tooltiptext", calDAVTTT);
			attributeIcons.appendChild(icon);
		}
	}

	if (icons.Mail == true) { // isMail    displayMail
		icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayMail");
		icon.setAttribute("type", "checkbox");
		icon.addEventListener("click", function() {rmFXshowMailInAlarm(recentReminder);},false);
		icon.setAttribute("tooltiptext", reminderfox.string("rf.add.mail.message.open"));
		attributeIcons.appendChild(icon);
	}

	if (icons.Categories == true) { // isCategories
		icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayCategory");
	//	icon.setAttribute("type", "checkbox");
		icon.setAttribute("tooltiptext", reminderfox.string("rf.add.reminders.tooltip.categories")+ ': ' +recentReminder.categories);
		attributeIcons.appendChild(icon);
	}

	if (recentReminder != null && recentReminder.remindUntilCompleted != null) { // reminder
		icon = document.createElement("toolbarbutton");
		if (recentReminder.remindUntilCompleted == "1") icon.setAttribute("class", "remindUntilCompleted1");
		if (recentReminder.remindUntilCompleted == "2") icon.setAttribute("class", "remindUntilCompleted2");
	//	icon.setAttribute("type", "checkbox");
		var statusText = (recentReminder.remindUntilCompleted == 2) ?
			reminderfox.string("rf.calendar.overdue.isoverdue") :
			reminderfox.string("rf.calendar.overdue.remindoverdue");	  //$$$_locale
		icon.setAttribute("tooltiptext", statusText);

		attributeIcons.appendChild(icon);
	}

	if (recentReminder != null && recentReminder.recurrence.type != null) {
		icon = document.createElement("toolbarbutton");
		icon.setAttribute("class", "displayRecurrence");
	//	icon.setAttribute("type", "checkbox");
	//	icon.setAttribute("numDate", numDate);
		currentDate =  new Date();
		var s = reminderfox.core.writeOutRecurrence(recentReminder, currentDate, ", ", "");  // (reminder, currentDate, separator, newline)

		// dayBox TTT
		icon.setAttribute("tooltiptext", reminderfox.date.recurrenceString(recentReminder, currentDate));
		attributeIcons.appendChild(icon);
	}


	if(recentReminder != null && recentReminder.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
		getChildElementById(tabPanel, "reminderDescriptionText").setAttribute("style", "color: red;");
	} else {
		getChildElementById(tabPanel, "reminderDescriptionText").setAttribute("style", "");
	}



//reminderFox_nullCheck
/*-----
	if(  (recentReminder != null && recentReminder.notes != null )
	  || (reminderAlarmOptions.quickAlarmNotes != null
	        && reminderAlarmOptions.quickAlarmNotes.length > 0
	        && reminderAlarmOptions.quickAlarmNotes != "null")) {

		if(reminderAlarmOptions.quickAlarmNotes != null
			&& reminderAlarmOptions.quickAlarmNotes.length > 0
			&& reminderAlarmOptions.quickAlarmNotes != "null") {
---------*/
	if( (recentReminder != null && recentReminder.notes != null ) || reminderFox_nullCheck(reminderAlarmOptions.quickAlarmNotes)) {
		if (reminderFox_nullCheck(reminderAlarmOptions.quickAlarmNotes)) {

			// to replace \n char with actual newlines:
			reminderAlarmOptions.quickAlarmNotes = reminderAlarmOptions.quickAlarmNotes.replace(new RegExp(/\\n/g), "\n");
			getChildElementById(tabPanel, "notesText").setAttribute("value", reminderAlarmOptions.quickAlarmNotes);
		} else {
			getChildElementById(tabPanel, "notesText").setAttribute("value", recentReminder.notes);
		}
		getChildElementById(tabPanel, "notesText").removeAttribute("hidden");
		getChildElementById(tabPanel, "notesHbox").removeAttribute("hidden");
	} else {
		getChildElementById(tabPanel, "notesText").setAttribute("value", null);

		if(hasNotes && firstTab) {
			// if this is the first tab and one of the tabs has notes on it, then
			// make sure the notes is visible (for sizing) since this tab is the one
			// that will be cloned
			getChildElementById(tabPanel, "notesHbox").removeAttribute("hidden");
			getChildElementById(tabPanel, "notesText").removeAttribute("hidden");
		} else {
			getChildElementById(tabPanel, "notesHbox").setAttribute("hidden", true);
			getChildElementById(tabPanel, "notesText").setAttribute("hidden", true);
		}
	}

	if(recentReminder != null && recentReminder.location != null && recentReminder.location.length > 0) {
		getChildElementById(tabPanel, "locationText").setAttribute("value", recentReminder.location);
		getChildElementById(tabPanel, "locationHboxX").removeAttribute("hidden");
	} else {
		getChildElementById(tabPanel, "locationText").setAttribute("value", null);
		getChildElementById(tabPanel, "locationHboxX").setAttribute("hidden", true);
	}


	if(recentReminder != null && recentReminder.url != null && recentReminder.url.length > 0) {
		getChildElementById(tabPanel, "urlText").setAttribute("value", reminderFox_getLinkDisplayText(recentReminder.url));
		getChildElementById(tabPanel, "urlText").setAttribute("reminderHref", recentReminder.url);
		getChildElementById(tabPanel, "urlText").setAttribute("tooltiptext", recentReminder.url);
		getChildElementById(tabPanel, "urlhbox").removeAttribute("hidden");
	} else {
		getChildElementById(tabPanel, "urlText").setAttribute("value", null);
		getChildElementById(tabPanel, "urlText").setAttribute("reminderHref", null);
		getChildElementById(tabPanel, "urlText").setAttribute("tooltiptext", null);
		getChildElementById(tabPanel, "urlhbox").setAttribute("hidden", true);
	}

	// get preference for how many minutes to re-sound the alarm
	var soundInterval = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SOUND_INTERVAL, -1);
	if(soundInterval > 0) {
		setInterval(playAlarmSound, (soundInterval * 1000 * 60));
	}
}


function selectAlarmTab(xThis) {
	reminderFox_QAcalendarOpened = false;

	//sizeToContent();
	updateTimeUntil();

	//update window title
	var tabList = document.getElementById("tabList");
	var index = tabList.selectedIndex;
	var alarmListName = reminderAlarmArray[index].alarmListName;

	if ((!alarmListName) && (reminderAlarmArray[index].quickAlarmText)) {
		alarmListName = reminderfox.string("rf.alarm.quickalarms.label").replace(":","");  // "Quick Alarm"
	}

	var alarmMissed = reminderAlarmArray[index].alarmAlarmMissed;
	var recentReminder = reminderAlarmArray[index].alarmRecentReminder;

	var tabbox = document.getElementById("tabbox");
	var tabPanel = tabbox.selectedPanel;

	if((recentReminder != null && recentReminder.notes != null) ||
		reminderFox_nullCheck(reminderAlarmArray[index].quickAlarmNotes)) {
		if(reminderFox_nullCheck(reminderAlarmArray[index].quickAlarmNotes)) {
			getChildElementById(tabPanel, "notesText").setAttribute("value", reminderAlarmArray[index].quickAlarmNotes);

		} else {
			getChildElementById(tabPanel, "notesText").setAttribute("value", recentReminder.notes);
		}
		getChildElementById(tabPanel, "notesText").removeAttribute("hidden");
		getChildElementById(tabPanel, "notesHbox").removeAttribute("hidden");
	} else {
		getChildElementById(tabPanel, "notesText").setAttribute("value", null);
		getChildElementById(tabPanel, "notesHbox").setAttribute("hidden", true);
		getChildElementById(tabPanel, "notesText").setAttribute("hidden", true);
	}

	document.title = reminderFox_alarmListNameCheck(alarmListName) + " - " + reminderfox.string("rf.alarm.title");

	// if this is a past reminder, indicate that in the title
	if(alarmMissed != null && alarmMissed == "true") {
		// only show missed if the event itself has been missed...
		var currentDate = new Date();
		var compare = 0;
		if(recentReminder.allDayEvent) {
			// compare dates
			compare = reminderfox.core.compareDates(currentDate, recentReminder.date);
		} else {
			// compare dates and times
			compare = reminderFox_compareAlarmTimes(currentDate, recentReminder.date);
		}

		if(compare == 1) {
			// compare Dates: recentReminder.date, currentDate.
			// if current date is after reminder date, show 'missed'
			document.title = " (" + reminderfox.string("rf.alarm.missedalarm.title") + ") " + document.title;
		}
	}

	var title;
	if(recentReminder != null) {
		title = recentReminder.summary;
	} else {
		title = reminderAlarmArray[index].quickAlarmText;
	}

	document.title += (reminderfox.util.appId() == "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}")? " [FX]":"";
	document.title += (reminderfox.util.appId() == "{3550f703-e582-4d05-9a08-453d09bdfdc6}")? " [TB]":"";
	document.title += (reminderfox.util.appId() == "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}")? " [SM]":"";

	document.title = title + " " + document.title;
}

function reminderFox_nullCheck (elem) {
	return (elem != null && elem.length > 0 && elem != "null");
}

function reminderFox_alarmListNameCheck (alarmListName) {

	if(reminderFox_nullCheck(alarmListName)) {
		var localEvents= reminderfox.string("rf.html.heading.reminders");
		var localToDos = reminderfox.string("rf.html.heading.todos");
		if (alarmListName == reminderfox.consts.DEFAULT_REMINDERS_CATEGORY) alarmListName =  localEvents;
		if (alarmListName == reminderfox.consts.DEFAULT_TODOS_CATEGORY) alarmListName =localToDos;
		alarmListName = " [" + alarmListName + "] ";
	}
	return alarmListName;
}


function reminderFox_updateSnoozeTimeDate() {
	var tabList = document.getElementById("tabList");
	var index = tabList.selectedIndex;

	var recentReminder = reminderAlarmArray[index].alarmRecentReminder;
	var snoozeTimeList2 = getChildElementByIdForCurrentTab("reminderFox-snoozeTime");
	var snoozeTime2 = snoozeTimeList2.label;
	if(reminderfox.util.isInteger(snoozeTime2)) {
		var timeUnitsList2 = getChildElementByIdForCurrentTab('reminderFox-alertTimeUnits');
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
			if(recentReminder == null) {
				snoozeString = reminderFox_getDateVariableStringAlarm(null, snoozeDate2) + ", ";
			} else {
				snoozeString = reminderFox_getDateVariableStringAlarm(recentReminder, snoozeDate2) + ", ";
			}
		}
		snoozeString += reminderfox.date.getTimeString(snoozeDate2);

		getChildElementByIdForCurrentTab("snoozeUntilTime").setAttribute("value", snoozeString);
	}
}

function reminderFox_getDateVariableStringAlarm(reminder, date) {
	var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
	return reminderfox.date.getDateVariable(reminder, date, _dateVariableString);
}

function reminderFox_compareAlarmTimes(dateOne, dateTwo) {
	var compare = reminderfox.core.compareDates(dateOne, dateTwo);
	if(compare == 0) {
		if(dateOne.getHours() < dateTwo.getHours()) {
			return -1;
		} else if(dateOne.getHours() > dateTwo.getHours()) {
			return 1;
		} else {
			var diff = Math.abs(dateOne.getMinutes() - dateTwo.getMinutes());
			if(diff <= 2) {// within 2 minutes
				return 0;
			}

			if(dateOne.getMinutes() < dateTwo.getMinutes()) {
				return -1;
			} else if(dateOne.getMinutes() > dateTwo.getMinutes()) {
				return 1;
			} else {
				return 0; // identical times
			}
		}
	}
	return compare;
}

function reminderFox_launchAlarmURL() {
	var urlText = getChildElementByIdForCurrentTab("urlText");
	if(urlText.getAttribute("reminderHref") != "") {
		reminderfox.util.openURL(urlText.getAttribute("reminderHref"));
	}
}

function rmFXshowMailInAlarm(recentReminder) {
	//var displayMailButton = getChildElementByIdForCurrentTab("displayMail");
	//displayMailButton.setAttribute("checked", false);

	//var tabList = document.getElementById("tabList");
	//var index = tabList.selectedIndex;
	//var recentReminder = reminderAlarmArray[index].alarmRecentReminder;
	reminderfox.mail.openByMessageID(recentReminder);
}

function playAlarmSound() {
	// play a sound for notification (if the user elects to)
	try {
		var playSound = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SOUND, true);
		if(playSound) {
			reminderfox.core.playSound();
			window.focus();
			// TODO: could select the appropriate tab ?  Or that might be annoying
		}
	} catch ( e ) {
	}
}


function reminderFox_editReminderFromAlarm() {
	var tabList = document.getElementById("tabList");
	var index = tabList.selectedIndex;
	var reminderID = reminderAlarmArray[index].alarmCurrentAlarmId;

	var isReminder = reminderAlarmArray[index].alarmIsReminder;
	var isReminderType = (isReminder == "true" || isReminder == true );

	var alarmReminder;
	if (isReminderType) reminderOrTodoEdit (reminderfox.core.getRemindersById(reminderID), false /*isTodo*/);
	if (!isReminderType) reminderOrTodoEdit(reminderfox.core.getSpecificTodoById(reminderID), true);

	// successful edit will set the .lastEvent -- so we can update the Alarm dialog
	if (reminderfox.core.lastEvent) {
		var returnedSummary = reminderfox.core.lastEvent.summary;

		tabList.children[index].label=returnedSummary;
		document.getElementById('reminderDescriptionText').value = returnedSummary;

		document.title = returnedSummary;
		document.title += " - " + reminderfox.string("rf.alarm.title");
	}
}


/**
 * On Alarm dialog/tab the [OK] was used
 */
function reminderFox_alarmDone() {
	reminderFox_okayed = true;
	var actionList = getChildElementByIdForCurrentTab("reminderFox-alarm-action");
	var actionIndex = actionList.selectedIndex;

	// if quickalarm
	var tabList = document.getElementById("tabList");
	var index = tabList.selectedIndex;
	var quickAlarmText = reminderAlarmArray[index].quickAlarmText;
	if(quickAlarmText != null) {
		reminderfox.core.removeQuickAlarm(quickAlarmText);
		reminderFox_closeAlarmTab();
	} else {
		reminderFox_performAlarmAction(actionIndex);
	}
}

/**
 * This function is called when closing the window with ESC or 'X'.  It will not ACKNOWLEDGE
 * the reminder alarm; only dismiss it.  You will be alerted the next time the alarms get
 * processed.
 */
function reminderFox_alarmClosed(closeAll) {
	// clear the alarm ID from the list, so that it will get processed the next time
	// (unless the alarm was snoozed or okayed; in that case we don't want to call this function)
	// TODO: need to remove all alarms...
	var tabList = document.getElementById("tabList");
	var index = tabList.selectedIndex;

	//reminderfox.core.logMessageLevel( "alarm closed...", reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO
	var windowEnumerator = reminderfox.core.getWindowEnumerator();
	if(windowEnumerator.hasMoreElements()) {
		var oldestWindow = windowEnumerator.getNext();
		if(!reminderFox_snoozed && !reminderFox_okayed && !reminderFox_reopeningWindow) {
			for(var j = 0; j < reminderAlarmArray.length; j++) {
				if(closeAll || j == index) {

					if(reminderAlarmArray[j].quickAlarmText != null) {
						//reminderfox.core.removeQuickAlarm( reminderAlarmArray[j].quickAlarmText );
					} else {
						var myAlarmId = reminderAlarmArray[j].alarmCurrentAlarmId;
						//reminderfox.core.logMessageLevel( "removing num = "+ oldestWindow.reminderfox.overlay.alarmList.length , reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO

						for(var i = 0; i < oldestWindow.reminderfox.overlay.alarmList.length; i++) {
							var currentAlarmId = oldestWindow.reminderfox.overlay.alarmList[i].alarmId;
							if(currentAlarmId == myAlarmId) {
								reminderfox.core.removeFromArray(oldestWindow.reminderfox.overlay.alarmList, i);
								//reminderfox.core.logMessageLevel( "remove element from alarm list: " +  currentAlarmId, reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO
							}
						}
					}
				}
			}
		}
		//reminderfox.core.logMessageLevel( "Final list len: " +  oldestWindow.reminderfox.overlay.alarmList.length, reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO

	}
	reminderFox_okayed = false;
	reminderFox_snoozed = false;
	if(!closeAll) {
		reminderFox_closeAlarmTab();
		selectAlarmTab();
	}

	//reminderFox_performAlarmAction( REMINDERFOX_ACTION_TYPE.ACKNOWLEDGE );  // default action - acknowledge
}

function reminderFox_closeAlarmTab() {
	// close a tab
	var tabList = document.getElementById("tabList");
	var selectedIndex = tabList.selectedIndex;
	var tabbox = document.getElementById("tabbox");
	var panel = tabbox.selectedPanel;
	var tabPanels = document.getElementById("tabPanelID");

	if(tabList.childNodes.length > 1) {
		tabList.removeItemAt(selectedIndex);
		tabPanels.removeChild(panel);
		if(selectedIndex >= tabList.childNodes.length - 1) {
			tabList.selectedIndex = tabList.childNodes.length - 1;
		} else {
			tabList.selectedIndex = selectedIndex;
		}
		reminderfox.core.removeFromArray(reminderAlarmArray, selectedIndex);
		reminderFox_snoozed = false;
		reminderFox_okayed = false;

		selectAlarmTab();
	} else {
		window.close();
	}

}

function reminderFox_performAlarmAction(actionIndex, snoozeTime, alarmTime, keepOpen) {
	var i, n, index, windowEnumerator;
	var _reminders, _todosArray;
	var completed, removeChild;

	var tabList = document.getElementById("tabList");
	index = tabList.selectedIndex;
	var myAlarmId = reminderAlarmArray[index].alarmCurrentAlarmId;
	var alarmListName = reminderAlarmArray[index].alarmListName;

	if(reminderFox_snoozed && actionIndex != REMINDERFOX_ACTION_TYPE.SNOOZE) {// if the alarm is snoozed, we'll do nothing
		return;
	}

	if(actionIndex == REMINDERFOX_ACTION_TYPE.OPEN) {
		// reset to Acknowledge after opened...
		var actionList = getChildElementByIdForCurrentTab("reminderFox-alarm-action");
		actionList.selectedIndex = REMINDERFOX_ACTION_TYPE.ACKNOWLEDGE;

		reminderFox_editReminderFromAlarm();

		return;
	}

	var isReminder = reminderAlarmArray[index].alarmIsReminder;
	var reminder;

	// need to clear my reminders/todos from memory (as they may have changed in edit window)
	// and refresh them
	reminderfox.core.clearRemindersAndTodos();
	if(isReminder == "true" || isReminder == true) {
		reminder = reminderfox.core.getRemindersById(myAlarmId);
	} else {
		reminder = reminderfox.core.getSpecificTodoById(myAlarmId);
	}

	// mark reminder's last-acknowleged  (unless snooze was pressed)
	if(reminder != null) {
		var msgText = "  reminderFox_performAlarmAction    reminder: " + reminder.summary + "  alarmAction: " + actionIndex;
		reminderfox.util.Logger('checkData', msgText);

		removed = false;
		completed = false;

		if(actionIndex == REMINDERFOX_ACTION_TYPE.SNOOZE) {
			reminder.snoozeTime = alarmTime + ";PT" + snoozeTime + "M";
		} else {
			reminder.alarmLastAcknowledge = new Date().getTime();
			reminderfox.core.logMessageLevel("  Setting acknowledge for alarm: " + reminder.alarmLastAcknowledge, reminderfox.consts.LOG_LEVEL_SUPER_FINE);
			//TODO //dump()

			reminder.snoozeTime = null;
			// clear snooze time
		}
		reminderfox.core.reminderFox_lastModifiedTime = reminderfox.core.getPreferenceValue(reminderfox.consts.LAST_MODIFIED) + "";

		if(actionIndex == REMINDERFOX_ACTION_TYPE.COMPLETE) {
			reminder.completedDate = new Date();

			// if reminder is marked as Remind Until Complete, clear it (if one-time, clear the RUC completely;
			// if a repeating reminder, simply change back to RUC-marked)  and update the reminder
			//  in the list (as the current reminder instance may be removed)
			if(reminder.recurrence.type == reminderfox.consts.RECURRENCE_ONETIME && (reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED || reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED)) {
				reminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE;

			} else if((isReminder == "true" || isReminder == true ) && reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
				reminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED;
			}
			completed = true;

		} else if(actionIndex == REMINDERFOX_ACTION_TYPE.DELETE) {
			// remove from model list
			if(isReminder == "true" || isReminder == true) {
				var reminders = reminderfox.core.getReminderEvents();

				var currentReminder = reminderAlarmArray[index].alarmRecentReminder;
				var messageID = currentReminder.messageID;

				if(currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DATE ||
					currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_MONTHLY_DAY ||
					currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_WEEKLY ||
					currentReminder.recurrence.type == reminderfox.consts.RECURRENCE_DAILY) {

					// prompt user...
					var deleteRecurrenceOnly = true;
					var deleteDate = new Date(currentReminder.date.getFullYear(), currentReminder.date.getMonth(), currentReminder.date.getDate(), currentReminder.date.getHours(), currentReminder.date.getMinutes());
					var dateLabel = reminderFox_getDateVariableString(currentReminder, deleteDate);

					var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
					var deleteDescription = reminderfox.string("rf.add.deleteReminderInstance.description") + "\n";
					deleteDescription += dateLabel + ": " + currentReminder.summary + "\n";
					var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 +
						promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1 +
						promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_2 +
						promptService.BUTTON_POS_0_DEFAULT;	//  set default button
					var msg = deleteDescription;
					var buttonPressed = promptService.confirmEx(window, reminderfox.string("rf.add.deleteReminder.title"),
						msg, flags,
						reminderfox.string("rf.add.deleteReminderInstance.currentInstance.button"),
						reminderfox.string("rf.button.cancel"),
						reminderfox.string("rf.add.deleteReminderInstance.all.button"), null, {});

					// cancel pressed
					if(buttonPressed == 1) {
						return;
					}

					// curent instances pressed
					if(buttonPressed == 0) {
						if(deleteDate != null) {
							deleteDate.setDate(deleteDate.getDate() + 1);
							var instanceReminder = reminderfox.core.getFirstReminderOccurrenceAfterStartDate(currentReminder, deleteDate);
							var newReminderDate = instanceReminder.date;
							var newReminder = reminderfox.core.cloneReminderFoxEvent(currentReminder);
							newReminder.date = newReminderDate;

							// if the date has changed, treat as a new reminder.  This is because
							// We want to re-add in the proper sorted order into the list of reminders
							reminders = reminderfox.core.getReminderEvents();
							for(i = 0; i < reminders.length; i++) {
								if(reminders[i].id == currentReminder.id) {
									reminderfox.core.removeFromArray(reminders, i);
									removed = true;
									break;
								}
							}

							// add reminder in sorted order...
							reminders = reminderfox.core.getReminderEvents();
							if(newReminder.remindUntilCompleted != reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE) {
								newReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED;
							}

							var sortedIndex = reminderfox.core.getSortedIndexOfNewReminder(reminders, newReminder, false);
							reminderfox.core.insertIntoArray(reminders, newReminder, sortedIndex);
						}
					} else {
						// delete all instances pressed
						for(i = 0; i < reminders.length; i++) {
							if(reminders[i].id == reminder.id) {
								reminderfox.core.removeFromArray(reminders, i);
								removed = true;
								break;
							}
						}
					}
				} else {
					// for non-repeat (and yearly) just delete
					_reminders = reminderfox.core.getReminderEvents();
					for(i = 0; i < _reminders.length; i++) {
						if(_reminders[i].id == reminder.id) {
							reminderfox.core.removeFromArray(_reminders, i);
							removed = true;
							break;
						}
					}
				}
			} else {
				_todosArray = reminderfox.core.getReminderTodos();
				for(var n in _todosArray) {
					var reminderTodos = _todosArray[n];
					for( i = 0; i < reminderTodos.length; i++) {
						if(reminderTodos[i].id == reminder.id) {
							reminderfox.core.removeFromArray(reminderTodos, i);
							removed = true;
							break;
						}
					}
				}
			}
		}

		if(actionIndex == REMINDERFOX_ACTION_TYPE.COMPLETE ||
			actionIndex == REMINDERFOX_ACTION_TYPE.DELETE ||
			actionIndex == REMINDERFOX_ACTION_TYPE.SNOOZE) {// we want to write out the file and mark it changed - and sync w/ network

			reminderfox.core.writeOutRemindersAndTodos(false);			// sync with alarm actions

			var recentReminder = reminderAlarmArray[index].alarmRecentReminder;

			//sync with remote server
			// this callback syncs the written changes to remote and does it in the background on the calling
			// window (otherwise we have to keep this window open until the network function callback returns)
			var tabList1 = document.getElementById("tabList");
			var index1 = tabList1.selectedIndex;
			var syncCallback = reminderAlarmArray[index1].synccallback;
			if(syncCallback != null) {
				var networkSync = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK_SYNCHRONIZE, reminderfox.consts.NETWORK.SYNCHRONIZE_DEFAULT);

				if(networkSync) {
					reminderfox.util.JS.dispatch('network');
					syncCallback();
				}
			}

		} else {
			// if we just acknowledged the reminder, don't do anything.
			reminderfox.core.writeOutRemindersAndTodos(false);		// if we just acknowledged the reminder, don't do anything.   ??
		}

		//reminderfox.core.logMessageLevel("  Alarm action'd; looking to remove from alarm list: " + myAlarmId   , reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO //dump()
		// if snoozing for more than 60 minutes, can just remove this from list of
		// alarms, since the hourly processing thread will pick this up
		if(((actionIndex == REMINDERFOX_ACTION_TYPE.SNOOZE && (snoozeTime != null && snoozeTime > 60 )) || actionIndex != REMINDERFOX_ACTION_TYPE.SNOOZE) && !reminderFox_reopeningWindow) {
			windowEnumerator = reminderfox.core.getWindowEnumerator();
			if(windowEnumerator.hasMoreElements()) {
				var oldestWindow = windowEnumerator.getNext();
				for(i = 0; i < oldestWindow.reminderfox.overlay.alarmList.length; i++) {
					var currentAlarmId = oldestWindow.reminderfox.overlay.alarmList[i].alarmId;
					if(currentAlarmId == myAlarmId) {
						reminderfox.core.logMessageLevel("  Removing....", reminderfox.consts.LOG_LEVEL_DEBUG);
						//TODO //dump()

						reminderfox.core.removeFromArray(oldestWindow.reminderfox.overlay.alarmList, i);
						reminderfox.core.logMessageLevel("  Removed....", reminderfox.consts.LOG_LEVEL_DEBUG);
						//TODO //dump()
					}
				}
			}
		}

		// if the edit window is open and we Acknowledge this alarm, we need to set the lastAck  for this reminder instnace
		// in the editWindow as well, or it will still have the old value and overwrite the correct one when the edit
		// window is closed...
		var topWindow = reminderfox.util.getWindow("window:reminderFoxEdit");  // this is the MainDialog
		if(topWindow) {
			var editWindowReminder = null;
			if(isReminder == "true" || isReminder == true) {
				editWindowReminder = topWindow.reminderfox.core.getRemindersById(myAlarmId);
			} else {
				var arrName = alarmListName;
				if(arrName == null || arrName == "") {
					arrName = reminderfox.consts.DEFAULT_TODOS_CATEGORY;
				}

				var todosArr = topWindow.reminderfox.core.getReminderTodos();
				var todos = todosArr[arrName];
				if(todos == null) {
					todos = new Array();
				}
				editWindowReminder = topWindow.reminderfox.core.getTodosById(myAlarmId, todos);
			}

			// if an event/todo found for 'myAlarmId' update on MainList
			if(editWindowReminder != null) {
				if(actionIndex != REMINDERFOX_ACTION_TYPE.SNOOZE && reminder.alarmLastAcknowledge != null) {
					editWindowReminder.alarmLastAcknowledge = reminder.alarmLastAcknowledge;
				}

				if(actionIndex == REMINDERFOX_ACTION_TYPE.COMPLETE) {
					editWindowReminder.completedDate = new Date();
					// if reminder is marked as Remind Until Complete, clear it (if one-time, clear the RUC completely;
					// if a repeating reminder, simply change back to RUC-marked)  and update the reminder
					//  in the list (as the current reminder instance may be removed)
					if(editWindowReminder.recurrence.type == reminderfox.consts.RECURRENCE_ONETIME && (editWindowReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED || editWindowReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED)) {
						editWindowReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE;
					} else if(editWindowReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
						editWindowReminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED;
					}

					if(isReminder == "true" || isReminder == true) {
						topWindow.updateInListReminder(editWindowReminder);
					} else {
						topWindow.updateInListTodo(editWindowReminder);
					}
					topWindow.modifiedReminders();

				} else if(actionIndex == REMINDERFOX_ACTION_TYPE.SNOOZE) {
					editWindowReminder.snoozeTime = reminder.snoozeTime;
					if(isReminder == "true" || isReminder == true) {
						topWindow.updateInListReminder(editWindowReminder);
					} else {
						topWindow.updateInListTodo(editWindowReminder);
					}
					topWindow.modifiedReminders();

				} else if(actionIndex == REMINDERFOX_ACTION_TYPE.DELETE) {
					if(isReminder == "true" || isReminder == true) {
						// remove from UI list
						topWindow.removeUIListItemReminder(editWindowReminder);

						// remove from model list
						_reminders = topWindow.reminderfox.core.getReminderEvents();
						for(i = 0; i < _reminders.length; i++) {
							if(_reminders[i].id == editWindowReminder.id) {
								topWindow.reminderfox.core.removeFromArray(_reminders, i);
								break;
							}
						}
					} else {
						// remove from UI list
						topWindow.removeTodoListItem(editWindowReminder);

						// remove from model list -- search in all todo/user lists
						_todosArray = topWindow.reminderfox.core.getReminderTodos();
						for(n in _todosArray) {
							var _reminderTodos = _todosArray[n];
							for(i = 0; i < _reminderTodos.length; i++) {
								if(_reminderTodos[i].id == editWindowReminder.id) {
									topWindow.reminderfox.core.removeFromArray(_reminderTodos, i);
									break;
								}
							}
						}
					}
					topWindow.modifiedReminders();
				}
			}
		}

		//	if (completed || removed) {
		if(true) {// 02/10/11 - changed to if (true) b/c acknowleging wasn't setting this flag and would cause a duplicate reminder when the hourly processing ran
			reminderfox.core.clearRemindersAndTodos();
			// update all of the browsers
			windowEnumerator = reminderfox.core.getWindowEnumerator();
			while(windowEnumerator.hasMoreElements()) {
				var currentWindow = windowEnumerator.getNext();
				currentWindow.reminderfox.core.reminderFoxEvents = reminderfox.core.reminderFoxEvents;
				currentWindow.reminderfox.core.reminderFoxTodosArray = reminderfox.core.reminderFoxTodosArray;

				currentWindow.reminderfox.overlay.updateRemindersInWindow();
				currentWindow.reminderfox.core.clearRemindersAndTodos();
			}
		}
	}

	if(!keepOpen) {
		reminderFox_closeAlarmTab();
	}

	//sync with remote calendar
	if(reminder.calDAVid != null) {
		if (completed) reminder.completedDate = new Date();

		reminderfox.core.CalDAVaction (reminder, actionIndex);
	}
}

function reminderFox_alarmChooseDone() {
	reminderFox_okayed = true;
	if(getChildElementByIdForCurrentTab("snoozeButton").getAttribute("default") == true || getChildElementByIdForCurrentTab("snoozeButton").getAttribute("default") == "true") {
		reminderFox_snooze();
	} else {
		reminderFox_alarmDone();
	}
}

function rmFx_datePickerQAclose(element) {//gWCalndr
	var datepicker = document.getElementById("datePickerCurrent");
	var timepicker = document.getElementById("timePickerCurrent");
	document.getElementById("rmFx-moz-datepicker").hidePopup();

	// we'll calculate the difference between now and the selected date
	// and set the snooze to that number of minutes
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

	var time = currentDateTime;
	if(selectedTime > currentDateTime) {
		var timeDiff = selectedTime - currentDateTime;
		var minutesDiff = timeDiff / 1000 / 60;
		var snoozeTimeList = getChildElementByIdForCurrentTab("reminderFox-snoozeTime");
		// alarm
		var snoozeTimeInt = Math.round(parseInt(minutesDiff));

		var timeUnitsList = getChildElementByIdForCurrentTab('reminderFox-alertTimeUnits');
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

		// need to call the alarm dialog snooze stuff now...
		reminderFox_snoozeTimeChanged();
	} else {
		if(selectedDate.getHours() > 0 || selectedDate.getMinutes() > 0) {// if any time was set other than default
			alert(reminderfox.string("rf.add.time.button.calendar.date.select.invalid"));
		}
	}
}

function reminderFox_snoozeTimeChanged() {
	getChildElementByIdForCurrentTab("snoozeButton").setAttribute("default", true);
	getChildElementByIdForCurrentTab("okButton").setAttribute("default", false);

	reminderFox_updateSnoozeTimeDate();
}

function getRF_alarmIndex() {
	var tabList = document.getElementById("tabList");
	var selectedIndex = tabList.selectedIndex;
	return selectedIndex;
}

function getRF_AlarmArray() {
	var tabList = document.getElementById("tabList");
	var selectedIndex = tabList.selectedIndex;
	return window.arguments[0].alarmInfos;
}

function reminderFox_snooze() {
	var oldestWindow;
	var setSnoozeTime;

	var tabList = document.getElementById("tabList");
	var selectedIndex = tabList.selectedIndex;

	var tabbox = document.getElementById("tabbox");
	var panel = tabbox.selectedPanel;
	var tabPanels = document.getElementById("tabPanelID");
	reminderFox_snoozed = true;

	var index = tabList.selectedIndex;
	var currentAlarmId = reminderAlarmArray[index].alarmCurrentAlarmId;
	var recentReminder = reminderAlarmArray[index].alarmRecentReminder;
	var isReminder = reminderAlarmArray[index].alarmIsReminder;
	var alarmListName = reminderAlarmArray[index].alarmListName;
	var quickAlarmText = reminderAlarmArray[index].quickAlarmText;

	var snoozeTimeList = getChildElementByIdForCurrentTab("reminderFox-snoozeTime");
	var snoozeTime = snoozeTimeList.label;
	if(reminderfox.util.isInteger(snoozeTime)) {
		var timeUnitsList = getChildElementByIdForCurrentTab('reminderFox-alertTimeUnits');
		if(timeUnitsList != null) {
			var timeSelected = timeUnitsList.selectedIndex;
			if(timeSelected == 1) {
				snoozeTime = snoozeTime * 60;
			} else if(timeSelected == 2) {
				snoozeTime = snoozeTime * 60 * 24;
			}
		}

		var currentTime = new Date().getTime();
		var alarmTime = currentTime + (snoozeTime * 60000);

		windowEnumerator = reminderfox.core.getWindowEnumerator();

		if(quickAlarmText != null) {
			if(windowEnumerator.hasMoreElements()) {
				oldestWindow = windowEnumerator.getNext();

				setSnoozeTime = snoozeTime * 60000;
				if(setSnoozeTime == 0) {
					setSnoozeTime = 1000;
				}

				if(setSnoozeTime <= 3600000) {// if snooze greater than an hour, ignore this; just let hourly process handle it
					var notes = null;
					if(reminderFox_nullCheck(reminderAlarmArray[index].quickAlarmNotes)) {
						notes = reminderAlarmArray[index].quickAlarmNotes.replace(new RegExp(/\n/g), "\\n");

						reminderfox.core.logMessageLevel("    alarm: Setting showAlarm timeout1: " + quickAlarmText + "--" + snoozeTime + " --> " + (snoozeTime * 60000) + "--" + setSnoozeTime, reminderfox.consts.LOG_LEVEL_SUPER_FINE);
						//TODO
						oldestWindow.setTimeout(function() {
							oldestWindow.reminderfox.overlay.showQuickAlarm(quickAlarmText, snoozeTime, notes);
						}, setSnoozeTime);
					} else {
						reminderfox.core.logMessageLevel("    alarm: Setting showAlarm timeout2: " + quickAlarmText + "--" + snoozeTime + " --> " + (snoozeTime * 60000) + "--" + setSnoozeTime, reminderfox.consts.LOG_LEVEL_SUPER_FINE);
						//TODO
						oldestWindow.setTimeout(function() {
							oldestWindow.reminderfox.overlay.showQuickAlarm(quickAlarmText, snoozeTime);
						}, setSnoozeTime);
					}
				}

				reminderFox_updateQuickAlarms(quickAlarmText, snoozeTime, notes);
			}
		} else {
			if(windowEnumerator.hasMoreElements()) {
				oldestWindow = windowEnumerator.getNext();

				// update existing entry from alarm list with snooze set and updated alarmTime
				for(var i = 0; i < oldestWindow.reminderfox.overlay.alarmList.length; i++) {
					var myAlarmId = oldestWindow.reminderfox.overlay.alarmList[i].alarmId;
					if(currentAlarmId == myAlarmId) {
						oldestWindow.reminderfox.overlay.alarmList[i].snoozed = true;
						oldestWindow.reminderfox.overlay.alarmList[i].timeOfAlarm = alarmTime;
					}
				}
				if(alarmListName == null) {
					alarmListName = "";
				}

				reminderFox_performAlarmAction(REMINDERFOX_ACTION_TYPE.SNOOZE, snoozeTime, alarmTime, true);

				reminderfox.core.logMessageLevel("  alarm: Setting showAlarm timeout: " + snoozeTime + " --> " + (snoozeTime * 60000), reminderfox.consts.LOG_LEVEL_SUPER_FINE);
				//TODO
				var alarmArray = new Array();
				alarmArray[alarmArray.length] = reminderAlarmArray[index];

				var isAlarmMissed = "false";
				if(reminderAlarmArray[index].alarmAlarmMissed == "true" || reminderAlarmArray[index].alarmAlarmMissed == true) {
					isAlarmMissed = "true";
				}

				setSnoozeTime = snoozeTime * 60000;
				if(setSnoozeTime == 0) {
					setSnoozeTime = 1000;
				}
				reminderfox.core.logMessageLevel( "  alarm: Setting reminderfox.overlay.showMissedAlarmsSnooze timeout3: " + reminderAlarmArray[index].alarmRecentReminder.id + "--" + setSnoozeTime, reminderfox.consts.LOG_LEVEL_SUPER_FINE);
				//TODO

				// if snooze time is > minutes * 60 *24 * 24 (60mins*24hrs*24 days) then don't set the timeout
				// here we go:
				// http://stackoverflow.com/questions/3468607/why-does-settimeout-break-for-large-millisecond-delay-values
				//Timeout values too big to fit into a signed 32-bit integer may cause overflow in FF, Safari, and Chrome, resulting in the timeout being scheduled immediately. It makes more sense simply not to schedule these timeouts, since 24.8 days is beyond a reasonable expectation for the browser to stay open.
				// ACTUALLY (update 02/26/2010): if larger than 60 minutes it is unneccessary, as hourly
				// processing thread will pick this up and set the alarm then
				if(setSnoozeTime <= 3600000) {// if snooze greater than an hour; just let hourly process do it
					oldestWindow.setTimeout(oldestWindow.reminderfox.overlay.showMissedAlarmsSnooze, setSnoozeTime, snoozeTime, reminderAlarmArray[index].alarmRecentReminder.id, reminderAlarmArray[index].alarmListName, reminderAlarmArray[index].alarmTimeString, reminderAlarmArray[index].alarmIsReminder, reminderAlarmArray[index].alarmIsTodo, reminderAlarmArray[index].alarmAlarmMissed, reminderAlarmArray[index].reminderTime, reminderAlarmArray[index].reminderTimeDifference);

				}
			}
		}
	}

	// close the tab if there is multiple tabs...
	reminderFox_closeAlarmTab();
}

function reminderFox_updateQuickAlarms(quickAlarmText, snoozeTime, notesText) {
	var currentTime = new Date().getTime();
	currentTime = currentTime + (snoozeTime * 60000);

	var newQuickAlarm = new reminderfox.core.ReminderFoxQuickAlarm(quickAlarmText, notesText, currentTime, snoozeTime);
	reminderfox.core.updateQuickAlarm(newQuickAlarm);
}

/*---------
function reminderFox_cloneAlarmInfo(originalAlarm) {			//XXX not used ???

	var clonedAlarm = {
		alarmTabPanel : originalAlarm.alarmTabPanel,
		alarmRecentReminder : reminderfox.core.cloneReminderFoxTodo(originalAlarm.alarmRecentReminder),
		alarmSnoozeTime : originalAlarm.alarmSnoozeTime,
		alarmListName : originalAlarm.alarmListName,
		reminderTime : originalAlarm.reminderTime,
		alarmTimeString : originalAlarm.alarmTimeString,
		alarmIsTodo : originalAlarm.alarmIsTodo,
		alarmIsReminder : originalAlarm.alarmIsReminder,
		alarmAlarmMissed : originalAlarm.alarmAlarmMissed,
		alarmCurrentAlarmId : originalAlarm.alarmCurrentAlarmId,
		synccallback : originalAlarm.synccallback,
		clearLabelCallback : originalAlarm.clearLabelCallback
	}

	return clonedAlarm;
}
----------*/


function reminderFox_actionChanged() {
	var actionList = getChildElementByIdForCurrentTab("reminderFox-alarm-action");
	var actionIndex = actionList.selectedIndex;
	// if the user has selected OPEN... open the reminder now
	if(actionIndex == REMINDERFOX_ACTION_TYPE.OPEN) {
		reminderFox_performAlarmAction(actionIndex);
	}
}

function rmFx_datePickerQAopen(event, xThis) {
reminderfox.util.Logger('qalarm', "rmFx_datePickerQA: " + xThis.id);
	var snoozeDate2;

	var reminderDate = new Date();
	reminderDate.setHours(0);
	reminderDate.setMinutes(0);
	reminderDate.setSeconds(0);

	var snoozeTimeList2 = getChildElementByIdForCurrentTab("reminderFox-snoozeTime");
	var snoozeTime2 = snoozeTimeList2.label;
	if(reminderfox.util.isInteger(snoozeTime2)) {
		var timeUnitsList2 = getChildElementByIdForCurrentTab('reminderFox-alertTimeUnits');
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
		snoozeDate2 = new Date();
		snoozeDate2.setTime(alarmTime2);
		reminderDate = snoozeDate2;

		// clear the time since it can not be properly set  (user can't directly edit the time field to say 12:37 for instance)
	//	reminderDate.setHours(0);
	//	reminderDate.setMinutes(0);
	//	reminderDate.setSeconds(0);
	}

	var datepickerAnchor = document.getElementById("datepickerAnchor");
	var datepickerBox = document.getElementById("datepickerBox");

	// clear & rebuild the whole datepicker
	while(datepickerBox.hasChildNodes())
	datepickerBox.removeChild(datepickerBox.firstChild);

	var datepicker = document.createElement("datepicker");
	datepicker.setAttribute('id', 'datePickerCurrent');
	datepicker.setAttribute('type', 'grid');
	datepicker.setAttribute('firstdayofweek', reminderfox.datePicker.StartingDayOfWeek());
	datepickerBox.appendChild(datepicker);


	// set the new time values
	var timepicker = document.getElementById("timePickerCurrent");
	timepicker.setAttribute('is24HourClock', "false");			//gWis24HourClock //gWXXX  use Option setting

	timepicker.value = snoozeDate2.getHours() + ":" + snoozeDate2.getMinutes();


	document.getElementById("rmFx-moz-datepicker").showPopup(datepickerAnchor, event.screenX, event.screenY, "bottomleft", "topleft");
	reminderFox_QAcalendarOpened = true;

}

function popupOk(element) {
	var popup = reminderfox.util.findParentById(element, "reminderfox-calendar-popup", "reminderfox-calendar-popup-end");
	popup.hidePopup();
}
