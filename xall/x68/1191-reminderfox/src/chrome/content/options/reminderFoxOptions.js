
if (Cu === undefined)  var Cu = Components .utils;
if (Ci === undefined)  var Ci = Components .interfaces;
if (Cc === undefined)  var Cc = Components .classes;

Cu.import("resource://gre/modules/Services.jsm");

const rmFXfilterPrefs = reminderfox.string("rf.options.filepicker.filter.prefs");

var reminderFox_mPositionMax;

var eventsModified = false;
var rmFx_icsFileLocationCurrent= "";   // remember filename when open the 'Options..'
var rmFx_icsFileLocationNew= "";       // and check after closing 'Options..'

var rmFx_CalDAV_accounts = 0;
var rmFx_networkSync = false;


function reminderFox_loadOptions() {
//------------------------------------------------------------------------------
	var calDAVaccounts = reminderfox.calDAV.getAccounts();				//	reminderfox.calDAV.accounts   read  accounts from file

	if (window.arguments != null) {

		if (window.arguments[0].tab != null) {
			// load 'Options ..'  with preselected TAB
			var tabs = document.getElementById("tabbox").tabs;
			for(var i = 0; i < tabs.childElementCount; i++) {
				if(tabs.children[i].id == window.arguments[0].tab)
					document.getElementById("tabbox").tabs.selectedIndex = i;
			}
		}
		if (window.arguments[0].modified != null) {
			eventsModified = window.arguments[0].modified;
		}
	}

// reminderfox.util.FIREFOX_ID     = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
// reminderfox.util.SEAMONKEY_ID   = "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";
// reminderfox.util.THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";

	// Rename second tab and Status/Add-on bar
	var appType = "Firefox";
	if (reminderfox.util.appId() == reminderfox.util.FIREFOX_ID) {
		appType = "Firefox";
	}
	if (reminderfox.util.appId() == reminderfox.util.THUNDERBIRD_ID) {
		appType = "Thunderbird";
	}
	if (reminderfox.util.appId() == reminderfox.util.SEAMONKEY_ID) {
		appType = "Seamonkey";
	}

	var sLabel = reminderfox.string("rf.options.accessOS");
	document.getElementById('applicationBar').value = sLabel + " " +appType;


	var openTime = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERTSLIDER_OPEN_TIME, 5);
	var openGroup = document.getElementById("reminderFox-group-alert-remain-open");
	var alertOpenText = document.getElementById("reminderFox-text-alert-open-text");
	if(openTime <= 0) {
		openGroup.selectedIndex = 1;
		alertOpenText.setAttribute("value", 5);
		// default

	} else {
		openGroup.selectedIndex = 0;
		alertOpenText.setAttribute("value", openTime);
	}


	var statusLength = reminderfox.core.getPreferenceValue(reminderfox.consts.STATUS_TEXT_MAX_LENGTH,
		reminderfox.consts.STATUS_TEXT_MAX_LENGTH_DEFAULT);
	document.getElementById("reminderFox-status-length").setAttribute("value", statusLength);

	var showInTabs = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARMS_SHOW_IN_TABS, true);
	var reminderFoxShowInTabs = document.getElementById("reminderFox-showInTabs");
	if(showInTabs == true || showInTabs == "true") {
		reminderFoxShowInTabs.selectedIndex = 0;
	} else {
		reminderFoxShowInTabs.selectedIndex = 1;
	}

	var alertHeight = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERTSLIDER_MAX_HEIGHT, reminderfox.consts.ALERTSLIDER_MAX_HEIGHT_DEFAULT);
	document.getElementById("reminderFox-alertHeight").setAttribute("value", alertHeight);

	var use24HourTime = reminderfox.core.getPreferenceValue(reminderfox.consts.USE_24_HOUR_TIME, reminderfox.consts.USE_24_HOUR_TIME_DEFAULT);
	document.getElementById("reminderFox-use24Hour").setAttribute("checked", use24HourTime);

	var enableContextMenus = reminderfox.core.getPreferenceValue(reminderfox.consts.ENABLE_CONTEXT_MENUS, true);
	document.getElementById("reminderFox-enableContextMenu").setAttribute("checked", enableContextMenus);

	//var disableLegacyMenus = reminderfox.core.getPreferenceValue(reminderfox.consts.ISLEGACY, false);
	//document.getElementById("reminderFox-disableLegacy").setAttribute("checked", disableLegacyMenus);

	var disablePanelTabMenu = reminderfox.core.getPreferenceValue(reminderfox.consts.ONHOVER, false);
	document.getElementById("reminderFox-panelTabHover").setAttribute("checked", disablePanelTabMenu);

	var highlightToday = reminderfox.core.getPreferenceValue(reminderfox.consts.HIGHLIGHT_TODAYS_REMINDERS, reminderfox.consts.HIGHLIGHT_TODAYS_REMINDERS_DEFAULT);
	document.getElementById("reminderFox-highlightToday").setAttribute("checked", highlightToday);

	var reminderFoxhideCompleted = reminderfox.core.getPreferenceValue(reminderfox.consts.HIDE_COMPLETED_ITEMS, false);
	document.getElementById("reminderFox-hideCompleted").setAttribute("checked", reminderFoxhideCompleted);

	var showRemindersInTooltip = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_REMINDERS_IN_TOOLTIP, reminderfox.consts.SHOW_REMINDERS_IN_TOOLTIP_DEFAULT);
	document.getElementById("reminderFox-showRemindersTooltip").setAttribute("checked", showRemindersInTooltip);

	var showTodosInTooltip = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_TODOS_IN_TOOLTIP, reminderfox.consts.SHOW_TODOS_IN_TOOLTIP_DEFAULT);
	document.getElementById("reminderFox-showTodosTooltip").setAttribute("checked", showTodosInTooltip);

	var upcomingDays = reminderfox.core.getPreferenceValue(reminderfox.consts.UPCOMING_REMINDER_DAYS_PREF, reminderfox.consts.UPCOMING_REMINDER_DAYS_DEFAULT);
	document.getElementById("remindersUpcomingDays").setAttribute("value", upcomingDays);

	var defaultEditType = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_EDIT, reminderfox.consts.DEFAULT_EDIT_DEFAULT);
	var defaultEdit = document.getElementById("reminderFox-default-doubleclick");
	if(defaultEditType == "reminders") defaultEdit.selectedIndex = 0;
	if(defaultEditType == "todos") defaultEdit.selectedIndex = 1;
	if(defaultEditType == "previous") defaultEdit.selectedIndex = 2;


	var defaultCat = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_CATEGORY, "");
	var rfCat = document.getElementById("reminderFox-cat");
	rfCat.setAttribute("checked", false);
	if(defaultCat != null && defaultCat.length > 0) {
		document.getElementById("inputRmCategories").setAttribute("value", defaultCat);
		document.getElementById("inputRmCategories").removeAttribute("disabled");
	rfCat.setAttribute("checked", true);
	}

	var showInTooltipDefault = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_SHOW_IN_TOOLTIP, true);
	document.getElementById("reminderFox-showInTooltip").setAttribute("checked", showInTooltipDefault);

	// AB Card Format setting
	var abCardFormat = reminderfox.core.getPreferenceValue(reminderfox.consts.ABCARD, "US");
	if (abCardFormat == "US") {
		document.getElementById("reminderFox-abCardFormat").selectedIndex = 0;
	} else {
		document.getElementById("reminderFox-abCardFormat").selectedIndex = 1;
	}

	var printAgenda = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_PRINTAGENDA, false);
	document.getElementById("reminderFox-agendaOnStart").setAttribute("checked", printAgenda);

	var alertType = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_ALL);
	var showAlert = document.getElementById("reminderFox-showAlert");

	// if the user has set it to no alerts, the option should be disabled
	if(alertType == reminderfox.consts.ALERT_ENABLE_NONE) {
		showAlert.setAttribute("checked", "false");
	} else {
		showAlert.setAttribute("checked", "true");

		if(alertType == reminderfox.consts.ALERT_ENABLE_ALL) {
			document.getElementById("reminderFox-alertList").selectedIndex = 0;
		} else if(alertType == reminderfox.consts.ALERT_ENABLE_TODAY) {
			document.getElementById("reminderFox-alertList").selectedIndex = 1;
		} else if(alertType == reminderfox.consts.ALERT_ENABLE_UPCOMING) {
			document.getElementById("reminderFox-alertList").selectedIndex = 2;
		}
	}

	var alertTimeout = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_TIMEOUT, reminderfox.consts.ALERT_TIMEOUT_DEFAULT);
	document.getElementById("reminderFox-alertTimeout").setAttribute("value", alertTimeout);

	var upcomingLabel = reminderfox.core.getPreferenceValue(reminderfox.consts.UPCOMING_REMINDERS_LABEL, reminderfox.consts.UPCOMING_REMINDERS_LABEL_DEFAULT);
	document.getElementById("upcomingLabelOptions").setAttribute("value", upcomingLabel);

	var todaysLabel = reminderfox.core.getPreferenceValue(reminderfox.consts.TODAYS_REMINDERS_LABEL, reminderfox.consts.TODAYS_REMINDERS_LABEL_DEFAULT);
	document.getElementById("todaysLabelOptions").setAttribute("value", todaysLabel);

	var dateListLabel = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
	document.getElementById("dayAppearanceLabel").setAttribute("value", dateListLabel);
	document.getElementById("dayAppearanceLabel").setAttribute("tooltiptext", "Date format: " + dateListLabel);

	var defaultMoreLabel = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_MORE, reminderfox.consts.DEFAULT_MORE_DEFAULT_VALUE);
	document.getElementById("defaultMoreLabel").setAttribute("value", defaultMoreLabel);

	var defaultSnoozeTime = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SNOOZE_TIME_DEFAULT, 5);
	document.getElementById("reminderFox-snoozeTime").setAttribute("value", defaultSnoozeTime);

	var defaultSnoozeUnits = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SNOOZE_UNITS_DEFAULT, 0);
	document.getElementById("reminderFox-snoozealertTimeUnits").selectedIndex = defaultSnoozeUnits;

	var defaultSnoozeAction = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SNOOZE_ACTION_DEFAULT, 0);
	document.getElementById("reminderFox-alarm-action").selectedIndex = defaultSnoozeAction;


	// Alarm sound
	var playSound = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SOUND, true);
	document.getElementById("reminderFox-alarmSound").setAttribute("checked", playSound);

	// check if user has specified a specific file path for sound in their preferences
	var alarmSoundPath = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SOUND_PATH, "");     //  = "alarmSoundPath";
	document.getElementById("reminderFox-alarmSoundType-File").setAttribute("value", alarmSoundPath);

	var soundCustom = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SOUND_CUSTOM, false);  // = "alarmSoundCustom";
	var group = document.getElementById("reminderFox-alarmSoundType");
	if(soundCustom == true) {
		group.setAttribute("checked", "true");
	} else {
		group.removeAttribute("checked");
	}

	var alarmSoundInterval = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SOUND_INTERVAL, -1);
	if(alarmSoundInterval > 0) {
		document.getElementById("reminderFox-alarmSoundInterval-Time").value = alarmSoundInterval;
		document.getElementById("reminderFox-alarmSoundInterval").setAttribute("checked", true);
	} else {
		document.getElementById("reminderFox-alarmSoundInterval").setAttribute("checked", false);
		document.getElementById("reminderFox-alarmSoundInterval-Time").value = 5;  // default val to 5
	}

	// Alert Notification placement on screen
	var sliderTop = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERTSLIDER_TOP, false) == true;
	var sliderLeft = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERTSLIDER_LEFT, false) == true;

	group = document.getElementById("reminderFox-alertPosition-group");
	if ((sliderTop == true) && (sliderLeft == true)) group.selectedIndex = 0;
	if ((sliderTop == true) && (sliderLeft == false)) group.selectedIndex = 1;
	if ((sliderTop == false) && (sliderLeft == true)) group.selectedIndex = 2;
	if ((sliderTop == false) && (sliderLeft == false)) group.selectedIndex = 3;

	var playSoundAlert = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_SOUND, true);
	document.getElementById("reminderFox-alertSound").setAttribute("checked", playSoundAlert);

	// check if user has specified a specific file path for sound in their preferences
	var alertSoundPath = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_SOUND_PATH, "");
	document.getElementById("reminderFox-alertSoundType-File").setAttribute("value", alertSoundPath);

	soundCustom = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_SOUND_CUSTOM, reminderfox.consts.ALERT_SOUND_CUSTOM_DEFAULT);
	group = document.getElementById("reminderFox-alertSound-Type");
	if(soundCustom == true) {
		group.setAttribute("checked", "true");
	} else {
		group.removeAttribute("checked");
	}


	var calStartDay = reminderfox.core.getPreferenceValue(reminderfox.consts.CALENDAR_START_DAY, reminderfox.consts.CALENDAR_START_DAY_DEFAULT);
	document.getElementById("reminderFox-startDay").selectedIndex = calStartDay;

	var showWeekNums = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_WEEK_NUMS_PREF, 0);
	if((showWeekNums == 0) || (showWeekNums == null)) {
		document.getElementById("reminderFox-weekNumberList").selectedIndex = 0;
	}
	if(showWeekNums == 1) {
		document.getElementById("reminderFox-weekNumberList").selectedIndex = 1;
	}
	if(showWeekNums == 2) {
		document.getElementById("reminderFox-weekNumberList").selectedIndex = 2;
	}

	// check if user has specified a specific file path in their preferences
	var savefilePath = reminderfox.core.getICSfile().path;
	var defaultFilePath = reminderfox.util.getICSdefaultFilePath();

	// if not, then use default location in profile
	if(savefilePath == null || savefilePath == "" || defaultFilePath==savefilePath) {
		document.getElementById("reminderFox-use-default-file-location").setAttribute("checked", true);
	} else {
		document.getElementById("reminderFox-use-default-file-location").setAttribute("checked", false);
	}
	// get the 'current' file path for ICS data; that path is also used for .ics.dav file (CalDAV account details)
	// write the file/path name to Options tab:File
	reminderFox_icsFileLocationChanged();

	var repeatUpcoming = reminderfox.core.getPreferenceValue(reminderfox.consts.REPEAT_UPCOMING_OCCURRENCES, -1);
	var repeatGroup = document.getElementById("reminderFox-group-repeat-upcoming");
	var repeatPositionText = document.getElementById("reminderFox-text-repeat-upcoming");
	if(repeatUpcoming == -1) {
		repeatGroup.selectedIndex = 0;
	} else {
		repeatGroup.selectedIndex = 1;
		repeatPositionText.setAttribute("value", repeatUpcoming);
	}

	var repeatPrevious = reminderfox.core.getPreferenceValue(reminderfox.consts.REPEAT_PREVIOUS_OCCURRENCES, -1);
	repeatGroup = document.getElementById("reminderFox-group-repeat-previous");
	repeatPositionText = document.getElementById("reminderFox-text-repeat-previous");
	if(repeatPrevious == -1) {
		repeatGroup.selectedIndex = 0;
	} else {
		repeatGroup.selectedIndex = 1;
		repeatPositionText.setAttribute("value", repeatPrevious);
	}

	// check if user has specified a specific file path for sound in their preferences
	alarmSoundPath = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_SOUND_PATH, "");     //  = "alarmSoundPath";
	document.getElementById("reminderFox-alarmSoundType-File").setAttribute("value", alarmSoundPath);
	group = document.getElementById("reminderFox-alarmSoundType");
	if(alarmSoundPath == null || alarmSoundPath == "") {
		group.selectedIndex = 0;
	} else {
		group.selectedIndex = 1;
	}

	var allDay = document.getElementById("reminderFox-all-day");
	var allDayDefault = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_ALL_DAY, true);
	if(allDayDefault) {
		allDay.setAttribute("checked", true);
	} else {
		allDay.setAttribute("checked", false);
	}

	var defaultFilterReminderIndex = reminderfox.core.getPreferenceValue(reminderfox.consts.FILTER_EVENTS_DEFAULT, 0);
	var filterEvents = document.getElementById("rmFx-filters-events");
	filterEvents.selectedIndex = defaultFilterReminderIndex;

	defaultFilterReminderIndex = reminderfox.core.getPreferenceValue(reminderfox.consts.FILTER_LISTS_DEFAULT, 0);
	var filterLists = document.getElementById("rmFx-filters-lists");
	filterLists.selectedIndex = defaultFilterReminderIndex;

	var repeat = document.getElementById("reminderFox-repeat");
	var repeatList = document.getElementById("reminderFox-repeatList");
	var defaultRepeat = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_REPEAT, -1);
	if(defaultRepeat < 0) {
		repeat.setAttribute("checked", false);
	} else {
		repeat.setAttribute("checked", true);
		repeatList.selectedIndex = defaultRepeat;
	}

	showAlert = document.getElementById("reminderFox-alert");
	var alarmMinutes = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_TIME_DEFAULT, -1);
	if(alarmMinutes < 0) {
		showAlert.setAttribute("checked", false);
	} else {
		showAlert.setAttribute("checked", true);
		var alertTime = document.getElementById("reminderFox-alertTime");
		alertTime.label = alarmMinutes;
		var timeUnitsList = document.getElementById('reminderFox-alertTimeUnits');
		var alarmUnitsIndex;
		try {
			alarmUnitsIndex = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_UNITS_DEFAULT, 0);
		} catch(e) {
		}
		timeUnitsList.selectedIndex = alarmUnitsIndex;
	}

	var remindUntilComplete = document.getElementById("remindUntilComplete");
	var remindUntilCompleteDefault = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_REMIND_UNTIL_COMPLETED, false);
	remindUntilComplete.setAttribute("checked", remindUntilCompleteDefault);

//gW Network sync moved behind CalDAV .. to allow 'disable' if CalDAV acitve

	// todo lists
	var reminderFox_todoLists_listbox = document.getElementById("reminderFox_todoLists_listbox");
	// clear existing list items
	while(reminderFox_todoLists_listbox.hasChildNodes()) {
		reminderFox_todoLists_listbox.removeChild(reminderFox_todoLists_listbox.firstChild);
	}

	var todoListsArray = reminderfox.core.getAllCustomTodoLists();

	for(var i = 0; i < todoListsArray.length; i++) {
		var rlItem = document.createElement("richlistitem");
		var labelItem = document.createElement("label");
		labelItem.setAttribute("value", todoListsArray[i]);
		labelItem.setAttribute("label", todoListsArray[i]);
		rlItem.appendChild(labelItem);
		reminderFox_todoLists_listbox.appendChild(rlItem);
	}

	reminderFox_alertTimeOpenChanged();

	reminderFox_alertChanged();
	reminderFox_alertNotificationChanged();
	reminderFox_repeatChanged();


	reminderFox_alarmSoundChanged();

	reminderFox_icsFileLocationChanged();
//	reminderFox_ValidateSynchronization();
	reminderFox_repeatPreviousChanged();
//	reminderFox_alertTimeOpenChanged();
	reminderFox_repeatUpcomingChanged();

	// disable file location change/selection with events pending
	if(eventsModified) {

		var text = reminderfox.string("rf.options.file.note.label") +
			": " + reminderfox.string("rf.options.file.note.unsaved");

		document.getElementById("reminderFox-status-text").textContent = text;
		document.getElementById("reminderFox-status").removeAttribute("hidden");

		document.getElementById("reminderFox-storeFileGroup").setAttribute("class", "reminderfox_TextDisabled");
		document.getElementById("reminderFox-storeFileOps").setAttribute("class", "reminderfox_TextDisabled");

		document.getElementById("reminderFox-use-default-file-location").setAttribute("disabled", "true");
		document.getElementById("reminderFox-file-location").setAttribute("disabled", "true");
		document.getElementById("reminderFox_file_location_browse").setAttribute("disabled", "true");

		document.getElementById("reminderFox_fileExImport").setAttribute("disabled", "true");
	}

	// set default textSize
	document.getElementById("reminderFox-defaultTextsize-value")
		.setAttribute("value",
		reminderfox.core.getPreferenceValue (reminderfox.consts.DEFAULT_TEXTSIZE, reminderfox.consts.DEFAULT_TEXTSIZE_DEFAULT));

	// get the number of month displayed from prefs
	var numMonths = reminderfox.core.getPreferenceValue (reminderfox.consts.CALENDAR_MONTHS,
		reminderfox.consts.CALENDAR_MONTHS_DEFAULT);
	// set default number of months
	document.getElementById("reminderFox-default-month").setAttribute("value", numMonths);

	// --- calDAV accounts setup  ----
	// remove all current calDAV accounts from dialog
	var calDAVdialog = document.getElementById("calDAV_calendars");
	while (calDAVdialog.hasChildNodes()) {
		if (calDAVdialog.firstChild.id == "rmFx-CalDAV-addNew") break;
			calDAVdialog.removeChild(calDAVdialog.firstChild);
	}

	// read CalDAV accounts
	calDAVaccounts = rmFx_calDAV_AddNew(calDAVaccounts);

	// set the 'default' CalDAV account
	var calDAV_defaultSyncAccount = reminderfox.core.getPreferenceValue (reminderfox.consts.CALDAV_DEFAULT_ACCOUNT, "--");
	rmFx_CalDAV_accountDefault_Selecting(calDAV_defaultSyncAccount);

	// add the supported CalDAV server to Options -->tab:sync
	var urlList = [];
	urlList[0] = "https://fruux.com/";
	urlList[1] = "https://www.google.com/calendar/";
	urlList[2] = "http://owncloud.org/";
	rmFx_CalDAV_testedServer (urlList, "testedCalDAVservers");

	// load settings of remote server synchronization
	var proto = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.PROTOCOL, reminderfox.consts.NETWORK.PROTOCOL_DEFAULT);
	var protoMenu = document.getElementById("reminderFox-proto");
	if(proto == "ftp") {
		protoMenu.selectedIndex = 0;
	} else if(proto == "http") {
		protoMenu.selectedIndex = 1;
	} else {
		protoMenu.selectedIndex = 2;
	}

	var address = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.ADDRESS, "");
	document.getElementById("reminderFox-text-address").setAttribute("value", address);

	var _username = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.USERNAME, "");
	document.getElementById("reminderFox-text-username").setAttribute("value", _username);

	var loginData = {
		ljURL : proto + "://" + address,
		username : _username,
		password : ""
	};
	loginData = reminderFox_getPassword(loginData);
	if(loginData != null) {
		document.getElementById("reminderFox-text-password").setAttribute("value", loginData.password);
	}


	// disable server/ Network Sync  if CalDAV active
	rmFx_networkSync = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.SYNCHRONIZE, reminderfox.consts.NETWORK.SYNCHRONIZE_DEFAULT);
	document.getElementById("reminderFox-network-sync").setAttribute("checked", rmFx_networkSync);

	reminderFox_networkServerEnable(calDAVaccounts.active);

	// if any active CalDAV account change the tab order and disable Remote Server details
	rmFx_calDAV_syncTABreorder(calDAVaccounts, rmFx_networkSync);



	//smartFoxy
	var aSmartFoxy = +reminderfox.core.getPreferenceValue(reminderfox.consts.SMARTFOXY, reminderfox.consts.SMARTFOXY_DEFAULT);

	if(aSmartFoxy == null) aSmartFoxy = 1;
	document.getElementById("reminderFox-smartfoxy-menu").selectedIndex = aSmartFoxy;

	var windowEnumerator = reminderfox.core.getWindowEnumerator();
	var win = windowEnumerator.getNext();

	var rmFXbutton = win.document.querySelector("#reminderFox_openButton");
	var smartFoxyChecked = (rmFXbutton && rmFXbutton.parentElement) ? true : false;
	document.getElementById("reminderFox-smartfoxy-control").checked = smartFoxyChecked;

	if (smartFoxyChecked && aSmartFoxy==3) {
		document.getElementById("reminderFox-status-length").removeAttribute("disabled");
	}else{
		document.getElementById("reminderFox-status-length").setAttribute('disabled',true);
	}


	// rmFX_setPrefsPanel()
	var prefsPanelStatus = reminderfox.core.getPreferenceValue(reminderfox.consts.PREFSPANEL, false);
	if (prefsPanelStatus == false) {
		document.getElementById("prefsTab").setAttribute("hidden", true);
		document.getElementById("prefsPanel").setAttribute("hidden", true);
	}else{
		document.getElementById("prefsTab").removeAttribute("hidden");
		document.getElementById("prefsPanel").removeAttribute("hidden");
	}
}


function rmFX_calDAVsetup(){
	// --- calDAV accounts setup  ----
	// remove all current calDAV accounts from dialog
	var calDAVdialog = document.getElementById("calDAV_calendars");
	while (calDAVdialog.hasChildNodes()) {
		if (calDAVdialog.firstChild.id == "rmFx-CalDAV-addNew") break;
			calDAVdialog.removeChild(calDAVdialog.firstChild);
	}

	// read CalDAV accounts
	var calDAVaccounts = rmFx_calDAV_AddNew(calDAVaccounts);

	// set the 'default' CalDAV account
	var calDAV_defaultSyncAccount = reminderfox.core.getPreferenceValue (reminderfox.consts.CALDAV_DEFAULT_ACCOUNT, "--");
	rmFx_CalDAV_accountDefault_Selecting(calDAV_defaultSyncAccount);
}


/*
 * Export reminderFox prefs as JS data
 */
function reminderFox_exportPrefs(prefsList, all) {
	var NL = "\n";
	var prefString = "// " + reminderfox.string("rf.options.prefs.file.header") + NL;
	var prefName, prefType, prefValue;
	var prefsAll = false;

	var prefBranch = Services.prefs.getBranch(reminderfox.consts.REMINDER_FOX_PREF + ".");
	if (prefsList == null) {
	// export all 'reminderFox' prefs
		prefsList = prefBranch.getChildList("");
		prefsAll = true;
	}
	for (var aPrefs in prefsList) {
		if (prefsAll) {
			prefName = prefsList[aPrefs];
			prefType = reminderfox._prefsBRANCH.getPrefType(prefName);
			prefValue = reminderfox.core.getPreferenceValue(prefsList[aPrefs]);
			prefUserValue = prefsList[aPrefs].prefUserValue;
		} else {
			prefName = prefsList[aPrefs].prefName;
			prefType = prefsList[aPrefs].prefType;
			prefValue = prefsList[aPrefs].prefValue;
			prefUserValue = prefsList[aPrefs].prefUserValue;
		}

		if (all != null) {
			prefString += prefName + ', ' + prefType + ', ' +
			(((prefType == 'string') || (prefType == 32))? ("'" + prefValue + "'"): prefValue) + ', ' + prefUserValue;
		} else {
			prefString += 'pref("' + reminderfox.consts.REMINDER_FOX_PREF + "." + prefName;

			if ((prefType == 'string') || (prefType == 32)){
				prefString += '", "' + prefValue + '");';
			}
			if ((prefType == 'bool') || (prefType == 128)){
				prefString += '", ' + prefValue + ");";
			}
			if ((prefType == 'integer') || (prefType == 64)){
				prefString += '", ' + prefValue + ");";
			}
		}
		prefString += NL;
	}

	// save current prefs to a file first, so we get all current settings
	reminderFox_saveOptions();

	var details= {};
	var date = new Date();
	var dateString = reminderfox.date.objDTtoStringICS (date);
	var fName = "rmFXprefs_" + dateString + ".js";

	details.defaultString = fName;
	details.title        = reminderfox.string("rf.options.prefs.filepicker.title");

	details.filterName   = "Preferences (*.js)";
	details.extensions   = '*.js';

	details.mode         = 'exportPreferences';

	details.fileMode     = 'modeSave';

	reminderfox.util.filePick(window, details,
		function(file, details) {
			if(!file)
				return;

			if(file.exists() == false) {
				file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 420);
			}

			reminderfox.core.writeStringToFile(prefString, file, true);

			// show success message
			var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Ci.nsIPromptService);
			promptService.alert(window, reminderfox.string("rf.options.export.success.title"),
				reminderfox.string("rf.options.export.prefs.success.description"));
		});
}

function reminderFox_importPrefs() {
	var details= {};
	details.title        = reminderfox.string("rf.options.prefs.filepicker.title");

	details.filterName   = "Preferences (*.js)";
	details.extensions   = '*.js';
	details.mode         = 'importPreferences';

	details.fileMode     = 'modeOpen';

	reminderfox.util.filePick(window, details,
		function(file, details) {
			if(!file)
				return;

			var contentsArray = reminderFox_splitOnAllNewlines(reminderfox.core.readInFileContents(file));

			var prefSet = false;
			for(var i = 0; i < contentsArray.length; i++) {
				var line = contentsArray[i];
				if(line != null && reminderfox.util.trim(line).length > 1) {
					//var index = line.indexOf( 'pref("');
					var index = 'pref("'.length;
					var endIndex = line.indexOf('", ');
					if(index != -1) {
						var prefName = line.substring(index, endIndex);
						// remove initial reminderfox id
						var rfPrefix = reminderfox.consts.REMINDER_FOX_PREF + ".";

						var rfIndex = prefName.indexOf(rfPrefix);
						if(rfIndex == 0) {
							prefName = prefName.substring(rfPrefix.length);
							var prefVal;
							line = line.substring(endIndex + '", '.length);

							var stringIndex = line.indexOf('"');
							var isString = stringIndex == 0;
							if(isString) {
								index = 1;
								endIndex = line.indexOf('");');
								prefVal = line.substring(index, endIndex);
							} else {
								index = 0;
								endIndex = line.indexOf(');');
								prefVal = line.substring(index, endIndex);
							}
							if(endIndex != -1) {
								reminderfox.core.setPreferenceValue(prefName, prefVal);
								prefSet = true;
							}
						}
					}
				}
			}

			var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);
			if(prefSet) {
				// only show success msg if actually succeeded...  that is if ANY pref was set.
				promptService.alert(window, reminderfox.string("rf.options.export.success.title"), reminderfox.string("rf.options.import.prefs.success.description"));

				// reload imported options so they now show in the options page
				reminderFox_loadOptions();
			} else {
				promptService.alert(window, reminderfox.string("rf.options.import.failure.title"), reminderfox.string("rf.options.import.prefs.failure.description"));
			}
		});
}


function reminderFox_todoListsRemove() {
	var reminderFox_todoLists_listbox = document.getElementById("reminderFox_todoLists_listbox");
	var index = reminderFox_todoLists_listbox.selectedIndex;

	var child = reminderFox_todoLists_listbox.childNodes[index];

	// remove all reminders belonging to this list.  Ask for confirmation
	var currentListName = child.children[0].value;
	var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].getService(Ci.nsIPromptService);

	var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 + promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1;
	var msg = reminderfox.string("rf.options.customlist.delete.confirmation.text1") + " " + currentListName + "?" + "  " + reminderfox.string("rf.options.customlist.delete.confirmation.text2");

	var buttonPressed = promptService.confirmEx(window, reminderfox.string("rf.options.customlist.delete.button.title"), msg, flags, reminderfox.string("rf.options.customlist.delete.button.title"), reminderfox.string("rf.button.cancel"), null, null, {});

	// cancel pressed
	if(buttonPressed == 1) {
		return;
	}

	// clear subscription if this list had one
	var subscriptions = reminderfox.core.getSubscriptions();
	if(subscriptions[currentListName] != null) {
		subscriptions[currentListName] = null;
		reminderfox.core.writeSubscriptions(subscriptions);
	}

	var _todosArray = reminderfox.core.getReminderTodos();
	_todosArray[currentListName] = new Array();
	reminderfox.core.writeOutRemindersAndTodos(false);				// nothing w networking

	// remove from list UI
	reminderFox_todoLists_listbox.removeChild(child);
}


function reminderFox_icsFileLocationChanged() {
	var icsFileNotDefault = "true";
	try {
		icsFileNotDefault = document.getElementById("reminderFox-use-default-file-location").getAttribute("checked");
	} catch(e) {
	}

	var currentfilePath;
	if(icsFileNotDefault == false || icsFileNotDefault == "false") {
		document.getElementById("reminderFox-file-location").removeAttribute("disabled");
		document.getElementById("reminderFox_file_location_browse").removeAttribute("disabled");
		currentfilePath = reminderfox.core.getICSfile().path;
	} else {
		document.getElementById("reminderFox-file-location").setAttribute("disabled", "true");
		document.getElementById("reminderFox_file_location_browse").disabled = true;
		currentfilePath = reminderfox.util.getICSdefaultFilePath();
	}
	document.getElementById("reminderFox-file-location").setAttribute("value", currentfilePath);
}


function reminderFox_updateOptions() {
	var sFile;
	var icsFileNotDefault = rmFXelementIsTrue("reminderFox-use-default-file-location");
	if(icsFileNotDefault == false) {
		sFile = document.getElementById("reminderFox-file-location").value;
		var fs = reminderfox.util.fileCheck(sFile);
		if(fs < 0) { // -1 for file -2 for dir
			alert(reminderfox.string("rf.options.isfilelocation.valid"));
			return;
		}
	}
	reminderfox.core.setICSfile(sFile);

	var currentCalDAVaccounts = reminderfox.calDAV.accounts;

	var calDAVaccounts = reminderfox.calDAV.getAccounts();

	var statusLength = +(document.getElementById("reminderFox-status-length").value);
	if (statusLength > reminderfox.consts.STATUS_TEXT_MAX_LENGTH_DEFAULT) statusLength = reminderfox.consts.STATUS_TEXT_MAX_LENGTH_DEFAULT;
	reminderfox.core.setPreferenceValue(reminderfox.consts.STATUS_TEXT_MAX_LENGTH, statusLength);

	var alertHeight = document.getElementById("reminderFox-alertHeight").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALERTSLIDER_MAX_HEIGHT, +alertHeight);

	reminderfox.core.setPreferenceValue(reminderfox.consts.USE_24_HOUR_TIME,
		rmFXelementIsTrue("reminderFox-use24Hour"));

	// reminder for web page and email
	reminderfox.core.setPreferenceValue(reminderfox.consts.ENABLE_CONTEXT_MENUS,
		rmFXelementIsTrue("reminderFox-enableContextMenu"));


	//var disableLegacyMenus = document.getElementById("reminderFox-disableLegacy").getAttribute("checked");
	//reminderfox.core.setPreferenceValue(reminderfox.consts.ISLEGACY, disableLegacyMenus);

	var disablePanelTabMenu = document.getElementById("reminderFox-panelTabHover").getAttribute("checked");
	reminderfox.core.setPreferenceValue(reminderfox.consts.ONHOVER, disablePanelTabMenu);

	var highlightToday = true;
	try {
		highlightToday = document.getElementById("reminderFox-highlightToday").getAttribute("checked");
	} catch(e) {
	}

	try {
		if(highlightToday == true) {
			reminderfox.core.setPreferenceValue(reminderfox.consts.HIGHLIGHT_TODAYS_REMINDERS, false);
		} else {
			reminderfox.core.setPreferenceValue(reminderfox.consts.HIGHLIGHT_TODAYS_REMINDERS, true);
		}
	} catch(e) {
	}


	reminderfox.core.setPreferenceValue(reminderfox.consts.HIDE_COMPLETED_ITEMS,
		rmFXelementIsTrue("reminderFox-hideCompleted"));

	reminderfox.core.setPreferenceValue(reminderfox.consts.SHOW_REMINDERS_IN_TOOLTIP,
		rmFXelementIsTrue("reminderFox-showRemindersTooltip"));

	// default show in tooltip
	reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_SHOW_IN_TOOLTIP,
		rmFXelementIsTrue("reminderFox-showInTooltip"));

	// AB Card Format setting
	var abCardFormat = document.getElementById("reminderFox-abCardFormat");
	if (+abCardFormat.value == 1) {
		reminderfox.core.setPreferenceValue(reminderfox.consts.ABCARD, "EU");
	} else {
		reminderfox.core.setPreferenceValue(reminderfox.consts.ABCARD, "US");
	}

	// Agenda/Printing  on start
	reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_PRINTAGENDA,
		rmFXelementIsTrue("reminderFox-agendaOnStart"));


	// Remote Servers
	reminderfox.core.setPreferenceValue(reminderfox.consts.NETWORK.SYNCHRONIZE,
		rmFXelementIsTrue("reminderFox-network-sync"));

	reminderfox.core.setPreferenceValue(reminderfox.consts.SHOW_TODOS_IN_TOOLTIP,
		rmFXelementIsTrue("reminderFox-showTodosTooltip"));


	var upcomingDays = reminderfox.consts.UPCOMING_REMINDER_DAYS_DEFAULT;
	try {
		upcomingDays = document.getElementById("remindersUpcomingDays").value;
	} catch(e) {
	}
	reminderfox.core.setPreferenceValue(reminderfox.consts.UPCOMING_REMINDER_DAYS_PREF, +upcomingDays);


	var defaultSnoozeUnits = 0;
	try {
		defaultSnoozeUnits = document.getElementById("reminderFox-snoozealertTimeUnits").selectedIndex;
	} catch(e) {
	}
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_SNOOZE_UNITS_DEFAULT, +defaultSnoozeUnits);

	var defaultSnoozeAction = 0;
	try {
		defaultSnoozeAction = document.getElementById("reminderFox-alarm-action").selectedIndex;
	} catch(e) {
	}
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_SNOOZE_ACTION_DEFAULT, defaultSnoozeAction);

	reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_SNOOZE_TIME_DEFAULT,
		/*defaultSnoozeTime*/ rmFXelementSet("reminderFox-snoozeTime", +0));

	reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_TEXTSIZE,
		rmFXelementSet("reminderFox-defaultTextsize-value",
		reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_TEXTSIZE, reminderfox.consts.DEFAULT_TEXTSIZE_DEFAULT)));

	var defaultMonths = document.getElementById("reminderFox-default-month").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.CALENDAR_MONTHS,
		defaultMonths || reminderfox.consts.CALENDAR_MONTHS_DEFAULT);


	var defaultEditIndex = document.getElementById("reminderFox-default-doubleclick").selectedIndex || 0;
	if(defaultEditIndex == 0) reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_EDIT, "reminders");
	if(defaultEditIndex == 1) reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_EDIT, "todos");
	if(defaultEditIndex == 2) reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_EDIT, "previous");

	var showInTabs = document.getElementById("reminderFox-showInTabs").selectedIndex;
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALARMS_SHOW_IN_TABS, (showInTabs == 0));

	var showAlertValue = true;
	try {
		var showAlert = document.getElementById("reminderFox-showAlert");
		showAlertValue = showAlert.getAttribute("checked");
	} catch(e) {
	}

	//Alert Notification
	var customFileLocation = document.getElementById("reminderFox-alertSoundType-File").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_SOUND_PATH, customFileLocation);

	reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_SOUND,
		rmFXelementIsTrue("reminderFox-alertSound"));

	reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_SOUND_CUSTOM,
		rmFXelementIsTrue("reminderFox-alertSound-Type"));


	var positionIndex = document.getElementById("reminderFox-alertPosition-group");
	var len = positionIndex._radioChildren.length;
	var pos;
	for (var i = 0; i < len; i++) {
		if (positionIndex._radioChildren[i].getAttribute("selected")== "true") pos = i;
	}
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALERTSLIDER_TOP, ((pos == 0) || (pos == 1)));
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALERTSLIDER_LEFT, ((pos == 0) || (pos == 2)));

	//Alarm Sound
	customFileLocation = document.getElementById("reminderFox-alarmSoundType-File").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_SOUND_PATH, customFileLocation);

	reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_SOUND,
		rmFXelementIsTrue("reminderFox-alarmSound"));


	// update alarm repeat interval
	var alarmInterval = rmFXelementIsTrue("reminderFox-alarmSoundInterval");
	if(alarmInterval) {
		var interval = document.getElementById("reminderFox-alarmSoundInterval-Time").value;
		reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_SOUND_INTERVAL, interval);
	} else {
		reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_SOUND_INTERVAL, -1);
	}

	// update alarm custom
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_SOUND_CUSTOM,
		rmFXelementIsTrue("reminderFox-alarmSoundType"));


	var rfCat = document.getElementById("reminderFox-cat");
	var catChecked = rfCat.getAttribute("checked");

	if(catChecked == false || catChecked == "false") {
		reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_CATEGORY, "");
	} else {
		var cat = document.getElementById("inputRmCategories").value;
		reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_CATEGORY, cat);
	}

	if(showAlertValue == false || showAlertValue == "false") {
		reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_NONE);
	} else {
		var alertIndex = 0;
		try {
			alertIndex = document.getElementById("reminderFox-alertList").selectedIndex;
		} catch(e) {
		}
		try {
			if(alertIndex == 0) {
				reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_ALL);
			}
			if(alertIndex == 1) {
				reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_TODAY);
			}
			if(alertIndex == 2) {
				reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_UPCOMING);
			}
		} catch( e ) {
		}

	}

	var selectedIndex;
	var calStartDay = document.getElementById("reminderFox-startDay").selectedIndex;
	reminderfox.core.setPreferenceValue(reminderfox.consts.CALENDAR_START_DAY,
		calStartDay || reminderfox.consts.CALENDAR_START_DAY_DEFAULT);

	selectedIndex = document.getElementById("reminderFox-weekNumberList").selectedIndex;
	reminderfox.core.setPreferenceValue(reminderfox.consts.SHOW_WEEK_NUMS_PREF, selectedIndex);


	var oldAlertTimeout= reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_TIMEOUT, "");

	var alertTimeout = document.getElementById("reminderFox-alertTimeout").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_TIMEOUT,
		alertTimeout || reminderfox.consts.ALERT_TIMEOUT_DEFAULT);

	if(oldAlertTimeout != alertTimeout) {
		// need to clear the last alert in the case where alert timeout preference was changed
		reminderfox.overlay.lastAlert = 0;
	}


	var newLabel = document.getElementById("upcomingLabelOptions").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.UPCOMING_REMINDERS_LABEL, newLabel);

	newLabel = document.getElementById("todaysLabelOptions").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.TODAYS_REMINDERS_LABEL, newLabel);

	newLabel = document.getElementById("dayAppearanceLabel").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, newLabel);

	newLabel = document.getElementById("defaultMoreLabel").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_MORE, newLabel);


	var repeatNumber = -1;
	try {
		repeatNumber = document.getElementById("reminderFox-group-repeat-upcoming");
	} catch(e) {
	}
	var repeatPosition;
	try {
		if(parseInt(repeatNumber.selectedItem.value) == -1)
			reminderfox.core.setPreferenceValue(reminderfox.consts.REPEAT_UPCOMING_OCCURRENCES, -1);
		else {
			repeatPosition = document.getElementById("reminderFox-text-repeat-upcoming");
			if(repeatPosition.value < 0) {
				reminderfox.core.setPreferenceValue(reminderfox.consts.REPEAT_UPCOMING_OCCURRENCES, -1);
			} else {
				reminderfox.core.setPreferenceValue(reminderfox.consts.REPEAT_UPCOMING_OCCURRENCES, repeatPosition.value);
			}
		}
	} catch(e) {
	}
	repeatNumber = -1;
	try {
		repeatNumber = document.getElementById("reminderFox-group-repeat-previous");
	} catch(e) {
	}
	try {
		if(parseInt(repeatNumber.selectedItem.value) == -1)
			reminderfox.core.setPreferenceValue(reminderfox.consts.REPEAT_PREVIOUS_OCCURRENCES, -1);
		else {
			repeatPosition = document.getElementById("reminderFox-text-repeat-previous");
			if(repeatPosition.value < 0) {
				reminderfox.core.setPreferenceValue(reminderfox.consts.REPEAT_PREVIOUS_OCCURRENCES, -1);
			} else {
				reminderfox.core.setPreferenceValue(reminderfox.consts.REPEAT_PREVIOUS_OCCURRENCES, repeatPosition.value);
			}
		}
	} catch(e) {
	}

	// remain open time
	var remainOpenGroup = null;
	try {
		remainOpenGroup = document.getElementById("reminderFox-group-alert-remain-open");
	} catch(e) {
	}
	try {
		if(parseInt(remainOpenGroup.selectedItem.value) == 1)
			reminderfox.core.setPreferenceValue(reminderfox.consts.ALERTSLIDER_OPEN_TIME, 0);
		else {
			repeatPosition = document.getElementById("reminderFox-text-alert-open-text");
			reminderfox.core.setPreferenceValue(reminderfox.consts.ALERTSLIDER_OPEN_TIME, repeatPosition.value);
		}
	} catch(e) {
	}

	// default filters
	var filterEvents = document.getElementById("rmFx-filters-events");
	reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_EVENTS_DEFAULT, filterEvents.selectedIndex);

	var filterLists = document.getElementById("rmFx-filters-lists");
	reminderfox.core.setPreferenceValue(reminderfox.consts.FILTER_LISTS_DEFAULT, filterLists.selectedIndex);

	reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_ALL_DAY,
		rmFXelementIsTrue("reminderFox-all-day"));


	var repeat = document.getElementById("reminderFox-repeat");
	if(repeat.getAttribute("checked") == false || repeat.getAttribute("checked") == "false") {
		reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_REPEAT, -1);
	} else {
		var repeatList = document.getElementById("reminderFox-repeatList");
		selectedIndex = repeatList.selectedIndex;
		reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_REPEAT, selectedIndex);
	}


	var showAlarm = document.getElementById("reminderFox-alert");
	var alarmValue = showAlarm.getAttribute("checked");
	if(alarmValue == true || alarmValue == "true") {
		var alertTime = document.getElementById("reminderFox-alertTime");
		var alarmTimeVal = alertTime.label;

		if(reminderfox.util.isInteger(alarmTimeVal)) {
			reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_TIME_DEFAULT, alarmTimeVal);
			var timeUnitsList = document.getElementById('reminderFox-alertTimeUnits');
			var timeSelected = timeUnitsList.selectedIndex;
			reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_UNITS_DEFAULT, timeSelected);
		}
	} else {
		reminderfox.core.setPreferenceValue(reminderfox.consts.ALARM_TIME_DEFAULT, -1);
	}

	var remindUntilComplete = document.getElementById("remindUntilComplete");
	var remindUntilCompleteVal = remindUntilComplete.getAttribute("checked");
	reminderfox.core.setPreferenceValue(reminderfox.consts.DEFAULT_REMIND_UNTIL_COMPLETED,
		(remindUntilCompleteVal == true || remindUntilCompleteVal == "true"));

	var reminderFox_todoLists_listbox = document.getElementById("reminderFox_todoLists_listbox");
	var todoListsArray = new Array();
	for(var i = 0; i < reminderFox_todoLists_listbox.childNodes.length; i++) {
		todoListsArray[i] = reminderFox_todoLists_listbox.childNodes[i].label;   // richlistbox
	}
	reminderfox.core.setPreferenceValue(reminderfox.consts.TODO_LISTS, todoListsArray);


	// save CalDAVaccounts from tab:'Sync'
	var calDAV_calendars = document.getElementById("calDAV_calendars");
	rmFx_CalDAV_accounts = calDAV_calendars.children.length -1;

	for (var i=0; i < rmFx_CalDAV_accounts; i++) {
		var elem = calDAV_calendars.children[i];
		var ID   = elem.querySelector("#calDAV_ID").value;

		// remove account/object from the accounts if 'toDelete' flag set
		// OR if the 'ID' is equal '?'
		if ((elem.getAttribute('toDelete') == 'true') || (ID == '?')){
			reminderfox.calDAV.accounts = reminderfox.util.removeObjectFromObject(reminderfox.calDAV.getAccounts(), ID);
		} else {

			// if this is a new account make new and set CTag
			if (!reminderfox.calDAV.accounts[ID]) {
				reminderfox.calDAV.accounts[ID] = {};
				reminderfox.calDAV.accounts[ID].CTag = 0;
			}

			var query = elem.querySelector(".calDAV_Name");
			if ( query != null ) {
				reminderfox.calDAV.accounts[ID].Name   = query.value;

	//			var x = elem.querySelector(".calDAV_Name").getAttribute('color');
				var x = elem.querySelector("#calDAV_COLOR").getAttribute('calendarColor');
				reminderfox.calDAV.accounts[ID].calendarColor  = (x == null) ? "" : x;

				reminderfox.calDAV.accounts[ID].ID     = ID;
				reminderfox.calDAV.accounts[ID].Typ    = elem.querySelector(".calDAV_Active").getAttribute('typ');
				reminderfox.calDAV.accounts[ID].Active = elem.querySelector(".calDAV_Active").checked;

				reminderfox.calDAV.accounts[ID].Url    = elem.querySelector(".calDAV_Url").value;
				reminderfox.calDAV.accounts[ID].Login  = elem.querySelector(".calDAV_Login").value;
			}
		}
	}


	// set the CalDAV Default Account
	var mIndex = document.getElementById("rmFx_CalDAV_syncDefaultAccount").selectedIndex;
	if (mIndex == 0) reminderfox.core.setPreferenceValue (reminderfox.consts.CALDAV_DEFAULT_ACCOUNT, "--");
	else
		reminderfox.core.setPreferenceValue (reminderfox.consts.CALDAV_DEFAULT_ACCOUNT,
			document.getElementById("rmFx_CalDAV_syncDefaultAccount").label );

	// save of remote file options
	reminderFox_saveNetworkOptions();

	// disable server/ Network Sync  if CalDAV active
	// need the corrected number of remote calendars, could be removed, see above 'toDelete'
	var calDAVstatus = rmFx_calDAVstatus(reminderfox.calDAV.getAccounts());
	reminderFox_networkServerEnable(calDAVstatus.active);

	rmFx_networkSync = document.getElementById("reminderFox-network-sync").getAttribute("checked");
	reminderfox.core.setPreferenceValue(reminderfox.consts.NETWORK.SYNCHRONIZE, rmFx_networkSync);

	reminderFox_saveSmartFoxy();
	reminderfox._prefs.savePrefFile(null);
}



function reminderFox_saveSmartFoxy() {
	var aSmartFoxy = document.getElementById("reminderFox-smartfoxy-menu").selectedIndex;
	reminderfox.core.setPreferenceValue(reminderfox.consts.SMARTFOXY, aSmartFoxy);
}


function reminderFox_saveNetworkOptions() {
	var protoIndex = 0;
	var proto = '';
	try {
		protoIndex = document.getElementById("reminderFox-proto").selectedIndex;
	} catch(e) {
	}
	if(protoIndex == 0) {
		reminderfox.core.setPreferenceValue(reminderfox.consts.NETWORK.PROTOCOL, "ftp");
		proto = "ftp://";
	} else if(protoIndex == 1) {
		reminderfox.core.setPreferenceValue(reminderfox.consts.NETWORK.PROTOCOL, "http");
		proto = "http://";
	} else {
		reminderfox.core.setPreferenceValue(reminderfox.consts.NETWORK.PROTOCOL, "https");
		proto = "https://";
	}

	var address = "";
	try {
		address = document.getElementById("reminderFox-text-address").value;
		if(address != null) {
			// trim protocol from address (it is specified in the dropdown instead)
			if(address.indexOf("https://") == 0) {
				address = address.substring("https://".length);
			} else if(address.indexOf("http://") == 0) {
				address = address.substring("http://".length);
			} else if(address.indexOf("ftp://") == 0) {
				address = address.substring("ftp://".length);
			}
		}
	} catch(e) {
	}

	reminderfox.core.setPreferenceValue(reminderfox.consts.NETWORK.ADDRESS, address);

	var _username = document.getElementById("reminderFox-text-username").value;
	reminderfox.core.setPreferenceValue(reminderfox.consts.NETWORK.USERNAME, _username || "");

	var _password = document.getElementById("reminderFox-text-password").value || "";

	//	if (_password != '') {  // we *do* want to allow the user to 'null' out their password and clear it
	var loginData = {
		ljURL : proto + address,
		username : _username,
		password : _password,
		savePassword : true
	};
	reminderFox_savePassword(loginData);
	//	}
}


/*
* save CalDAVaccounts from tab:'Sync'
*/
function reminderFox_calDAVsave() {

	// set the CalDAV Default Account
	var mIndex = document.getElementById("rmFx_CalDAV_syncDefaultAccount").selectedIndex;
	if (mIndex == 0) reminderfox.core.setPreferenceValue (reminderfox.consts.CALDAV_DEFAULT_ACCOUNT, "--");
	else
		reminderfox.core.setPreferenceValue (reminderfox.consts.CALDAV_DEFAULT_ACCOUNT,
			document.getElementById("rmFx_CalDAV_syncDefaultAccount").label );

	var calDAV_calendars = document.getElementById("calDAV_calendars");
	rmFx_CalDAV_accounts = calDAV_calendars.children.length -1;

	for (var i=0; i < rmFx_CalDAV_accounts; i++) {
		var elem = calDAV_calendars.children[i];
		var ID   = elem.querySelector("#calDAV_ID").value;

		// remove account/object from the accounts if 'toDelete' flag set
		// OR if the 'ID' is equal '?'
		if ((elem.getAttribute('toDelete') == 'true') || (ID == '?')){
			reminderfox.calDAV.accounts = reminderfox.util.removeObjectFromObject(reminderfox.calDAV.getAccounts(), ID);
		} else {

			// if this is a new account make new and set CTag
			if (!reminderfox.calDAV.accounts[ID]) {
				reminderfox.calDAV.accounts[ID] = {};
				reminderfox.calDAV.accounts[ID].CTag = 0;
			}

			var query = elem.querySelector(".calDAV_Name");
			if ( query != null ) {
				reminderfox.calDAV.accounts[ID].Name   = elem.querySelector(".calDAV_Name").value;

				var x = elem.querySelector("#calDAV_COLOR").getAttribute('calendarColor');
				reminderfox.calDAV.accounts[ID].calendarColor  = (x == null) ? "" : x;

				reminderfox.calDAV.accounts[ID].ID     = ID;
				reminderfox.calDAV.accounts[ID].Typ    = elem.querySelector(".calDAV_Active").getAttribute('typ');
				reminderfox.calDAV.accounts[ID].Active = elem.querySelector(".calDAV_Active").checked;

				reminderfox.calDAV.accounts[ID].Url    = elem.querySelector(".calDAV_Url").value;
				reminderfox.calDAV.accounts[ID].Login  = elem.querySelector(".calDAV_Login").value;
			}
		}
	}
}



/**
 *   [Apply] was used, store all 'Options' entries to prefs
 *   NO STORAGE to file or network
 *   @return   clears the [Apply] button
 */
function reminderFox_saveOptions() {

	if (rmFx_calDAVfileCheckAndSave() == -2) return;  // directory error
	if(document.getElementById("reminderFox-apply").disabled == false) {
		reminderFox_updateOptions();
		reminderFox_updateWindows();
	}
	document.getElementById("reminderFox-apply").disabled = true;
}


/**
 *   [OK]  was used, this saves all 'Options' entries to prefs and closes the 'Options'
 *   AND STORES to files and network: events/todos '.ics' and CalDAV accounts details '.ics.dav'
 *   AND --if open -- reloads the Main Dialog with all changes to the Options applied.
 */
function reminderFox_saveOptionsAndClose() {

	if (rmFx_calDAVfileCheckAndSave() == -2) return;  // directory error
	reminderFox_updateOptions();
	window.close();
	reminderFox_updateWindows();

	var updateWindow = reminderfox.util.getWindow("window:rmFxCaldavUpdate");
	if (updateWindow) updateWindow.close();

	// reload the main dialog, if unsaved events getting an alert to save and Cntrl R
	var topWindow = reminderfox.util.getWindow("window:reminderFoxEdit");
	if(topWindow) {
		topWindow.rmFx_mainDialogLoadReload();
	}
}


function rmFx_calDAVfileCheckAndSave() {
	reminderFox_calDAVsave();
	// Storage of the Remote Calendar/CalDAV Account Definition
	// the definition is read tab:Sync to an {object} "reminderfox.calDAV.accounts"
	// "rmFx_CalDAV_accounts"  has the number of defined accounts
	// That array is stored to a file with the same name as the "reminderfox.ics" with
	// an extension or ".dav", that is : "reminderfox.ics.dav"
	// Write the accounts to 'current' file location
	var old_CalDAV_accounts = reminderfox.calDAV.accountsWrite (reminderfox.calDAV.getAccounts());

	// With changing the ICS file location another ".dav" has to be used also.

	// "rmFx_icsFileLocationCurrent"  is the file/path when "Options.." XUL was opened
	// "rmFx_icsFileLocationNew"                       as defined on "Options.." File
	var rmFx_icsFileLocationNew = document.getElementById("reminderFox-file-location").value;

	//2014-07-18  need to check directory and file name!

	var cStatus = reminderfox.util.fileCheck (rmFx_icsFileLocationNew);

	if (cStatus == -2) {
		reminderfox.util.Logger('calDAV', "  dir/file check: " + cStatus + " dir/f: " + rmFx_icsFileLocationNew);
		alert("The 'directory' for the ICS file isn't valid!");
		return -2;
	}
	var rmFx_calDAVaccountsFileLocationNew = rmFx_icsFileLocationNew + ".dav";

	if (rmFx_icsFileLocationNew != rmFx_icsFileLocationCurrent) {
		// CHANGE of .ics file --> need to load/update the .dav file

		// check if Remote Calendar/CalDAV accounts are already defined for
		// the 'new' file selection, if so, readin
		if (reminderfox.util.fileCheck(rmFx_calDAVaccountsFileLocationNew) > 0) {
			reminderfox.calDAV.getAccounts(rmFx_icsFileLocationNew);
		}

		else { // NO .dav file, ask user how to
				 // handle the current Options:Sync Remote Calendar/CalDAV Account Def

			if (old_CalDAV_accounts != 0) { // if old ICS data has Remote Calendar/CalDAV
				// acounts, ask to use that also for the new ICS data file

				var xulStrings = {
					newFile : rmFx_icsFileLocationNew,
					title   : reminderfox.string("rf.options.icsFileLocation.title"), // "'Remote Calendar' Account Definition Handling",
					text1   : reminderfox.string("rf.options.icsFileLocation.text1"), // "Reminders/Todos storage location has been changed to another/new location:",
					text2   : reminderfox.string("rf.options.icsFileLocation.text2"), // "How to handle the 'Remote Calendar' Account Definitions for the new Reminder file ?",

					msg01    : reminderfox.string("rf.options.icsFileLocation.msg01"), // "Use the current 'Remote Calendar' Account Definitions for the new Reminder file also. "
					msg02    : '('+ reminderfox.string("rf.options.icsFileLocation.msg02") + ')', // "(This will make copies of the 'old' accounts and events to the 'new' Reminder file!)",

					msg11    : reminderfox.string("rf.options.icsFileLocation.msg11"), // "Define new 'Remote Calendar' Accounts for the new Reminder file. "
					msg12    : '(' + reminderfox.string("rf.options.icsFileLocation.msg12") + ')', // "(All 'old' accounts or events are discarded!)",

					key0    : reminderfox.string("rf.options.icsFileLocation.use"), // "Use",
					key1    : reminderfox.string("rf.options.icsFileLocation.new"), // "New",

					whichKey: 'keyX'		// preset
				};
				window.openDialog('chrome://reminderFox/content/options/calDAVaccountsHandling.xul',
					'reminderFox-calDAVaccounts', 'modal, centerscreen', xulStrings);
				// keyX will be returned if the user closes the window using the close button in the titlebar!

				if (/* Use */ 'key0' == xulStrings.whichKey ) {
					// use the accounts definition on Options:Sync but clear all reminder details
					// so we only have the accounts with ID,Name, Active, url/login .. only!
					reminderfox.calDAV.accounts = reminderfox.calDAV.accountsClearReminderDetails(reminderfox.calDAV.accounts);

					// need to write to NEW .ics.dav  file!
					reminderfox.calDAV.accountsWrite (reminderfox.calDAV.getAccounts(), rmFx_icsFileLocationNew);
				}

				if ( /* New */ 'key1' == xulStrings.whichKey) {
					reminderfox.calDAV.accountsWrite (null, rmFx_icsFileLocationNew);
					reminderfox.calDAV.accounts = {};
				}

				if ( /* X */ 'keyX' == xulStrings.whichKey) {
					return;
				}
			}
		}
		rmFx_icsFileLocationCurrent = rmFx_icsFileLocationNew;
		// if Options.xul is open, then build the Sync Remote Calendars from 'calDAVaccounts'
		if (!document.getElementById("calDAV_calendars")) return;

		rmFx_calDAVsetup();
	}
}


/*
 *
 */
function rmFx_calDAVsetup() {
	// --- calDAV accounts setup  ----
	// remove all current calDAV accounts from dialog
	var calDAVdialog = document.getElementById("calDAV_calendars");
	while (calDAVdialog.hasChildNodes()) {
		if (calDAVdialog.firstChild.id == "rmFx-CalDAV-addNew") break;
			calDAVdialog.removeChild(calDAVdialog.firstChild);
	}

	// read CalDAV accounts
	reminderfox.calDAV.getAccounts(rmFx_icsFileLocationCurrent);

	var calDAVaccounts = rmFx_calDAV_AddNew(reminderfox.calDAV.getAccounts());

	// set the 'default' CalDAV account
	var calDAV_defaultSyncAccount = reminderfox.core.getPreferenceValue (reminderfox.consts.CALDAV_DEFAULT_ACCOUNT, 'Reminders');
	rmFx_CalDAV_accountDefault_Selecting(calDAV_defaultSyncAccount);

	// if any active CalDAV account change the tab order and disable Remote Server details
	rmFx_calDAV_syncTABreorder(calDAVaccounts, rmFx_networkSync);
}


function rmFx_calDAVstatus(calDAVaccounts) {
	var calDAV = [];
	calDAV.active = false;
	calDAV.count = 0;
	for (var account in calDAVaccounts) {
		if (calDAVaccounts[account].Active == true) calDAV.active = true;
		calDAV.count ++;
	}
	return calDAV;
}


function reminderFox_updateWindows() {
	try {
		// update all of the browsers
		var windowEnumerator = reminderfox.core.getWindowEnumerator();
		while(windowEnumerator.hasMoreElements()) {
			var currentWindow = windowEnumerator.getNext();
			// handle smartFoxy toolbar icon
			var control = document.getElementById("reminderFox-smartfoxy-control");
			var smartFoxyEnabled = control.getAttribute("checked");
			currentWindow.reminderfox.core.smartFoxySwitch(smartFoxyEnabled);

			currentWindow.reminderfox.overlay.updateRemindersInWindow();
			currentWindow.reminderfox.core.clearRemindersAndTodos();
		}
	} catch( e ) {
	}
}


function reminderFox_updateButtons(aEvent) {
	// don't enable the apply button for button presses
	if(aEvent) {
		if((aEvent.originalTarget.localName == "button") || (aEvent.originalTarget.getAttribute("type") == "prof")) {
			return;
		}
	}
	document.getElementById("reminderFox-apply").disabled = false;
}


//		<checkbox id="reminderFox-smartfoxy-control" oncommand="reminderFox_smartFoxyChanged()"
function reminderFox_smartFoxyChanged() {
	var aSmartFoxy = document.getElementById("reminderFox-smartfoxy-menu").value;
	var smartFoxyChecked = document.getElementById("reminderFox-smartfoxy-control").getAttribute("checked");
	if (smartFoxyChecked) {
		document.getElementById("reminderFox-smartfoxy-menu").removeAttribute("disabled");
		if (aSmartFoxy==3) {
			document.getElementById("reminderFox-status-length").removeAttribute("disabled");
		}
	}else{
		document.getElementById("reminderFox-smartfoxy-menu").setAttribute('disabled',true);
		document.getElementById("reminderFox-status-length").setAttribute('disabled',true);
	}
}


function smartFoxyMenuSet() {
	var aSmartFoxy = document.getElementById("reminderFox-smartfoxy-menu").value;
	if (aSmartFoxy==3) {
		document.getElementById("reminderFox-status-length").removeAttribute("disabled");
	}else{
		document.getElementById("reminderFox-status-length").setAttribute('disabled',true);
	}
}


function reminderFox_repeatChanged() {
	var repeat = document.getElementById("reminderFox-repeat");
	var repeatVal = repeat.getAttribute("checked");
	if(repeatVal == false || repeatVal == "false") {
		document.getElementById("reminderFox-repeatList").setAttribute("disabled", "true");
	} else {
		document.getElementById("reminderFox-repeatList").removeAttribute("disabled");
	}
}


function rmFXtoggleGroup(control, elements) {
	var sx = elements.split(",");
	for (var i in sx) {
		var d = document.getElementById(sx[i]);
		try {
			if(control == false || control == "false") {
				d.setAttribute("disabled", "true");
			}
			else {
				d.removeAttribute("disabled");
			}
		} catch(ex){
			//console.log("RmFX   [rmFXtoggleGroup]   >>"+sx[i]+"<< NOT found!")
		}
	}
}
function rmFXelementIsTrue(elem) {
	return document.getElementById(elem).getAttribute("checked")=="true";
}

function rmFXelementSet(elem, defaultValue) {
	var el= document.getElementById(elem);
	if (el && el.value){
		return el.value;
	} else {
		return defaultValue;
	}
}



// ------- Alert handling --------------- begin

function reminderFox_alertChanged() {
	var checkedAlert = rmFXelementIsTrue("reminderFox-showAlert");

	rmFXtoggleGroup(checkedAlert,
		"reminderFox-alertSound,reminderFox-alertList,reminderFox-alertTimeout," +
		"reminderFox-showAlert1,reminderFox-showAlert2," +
		"reminderFox-group-alert-until,reminderFox-group-alert-for,reminderFox-text-alert-open-text," +
		"reminderFox-alertPosition-top,reminderFox-alertPosition-top1,reminderFox-alertPosition-top2," +
		"reminderFox-alertPosition-bottom,reminderFox-alertPosition-bottom1,reminderFox-alertPosition-bottom2," +
		"reminderFox-alertHeight," +
		"reminderFox-alertSound-Type,reminderFox-alarmSoundType-File,reminderFox-alertSoundType-browse");


	var checkedAlertSound = rmFXelementIsTrue("reminderFox-alertSound");
	rmFXtoggleGroup(checkedAlert && checkedAlertSound,
		"reminderFox-alertSound-Type");

	var checkedAlertSoundType = rmFXelementIsTrue("reminderFox-alertSound-Type");
	rmFXtoggleGroup(checkedAlert && checkedAlertSound && checkedAlertSoundType,
		"reminderFox-alertSoundType-File,reminderFox-alertSoundType-browse");
}


function reminderFox_alertSoundChanged() {
	var checkedAlert = rmFXelementIsTrue("reminderFox-showAlert");
	var checkedSound = rmFXelementIsTrue("reminderFox-alertSound");

	rmFXtoggleGroup(checkedAlert && checkedSound,
		"reminderFox-alertSound-Type");

	var checkedSoundType = rmFXelementIsTrue("reminderFox-alertSound-Type");
	rmFXtoggleGroup(checkedAlert && checkedSound && checkedSoundType,
		"reminderFox-alertSoundType-File,reminderFox-alertSoundType-browse");
}


function reminderFox_alertSoundType() {
	rmFXtoggleGroup(rmFXelementIsTrue("reminderFox-alertSound-Type"),
		"reminderFox-alertSoundType-File,reminderFox-alertSoundType-browse");
}


function reminderFox_alertNotificationChanged() {
	rmFXtoggleGroup(rmFXelementIsTrue("reminderFox-alert"),
		"reminderFox-alertTime,reminderFox-alertTimeUnits");
}


function reminderFox_alertTimeOpenChanged() {
	var text = document.getElementById("reminderFox-text-alert-open-text");
	var alertFor = document.getElementById("reminderFox-group-alert-for");

	if (alertFor.getAttribute("selected") != "true"){
		text.setAttribute("disabled", "true");
	} else {
		text.removeAttribute("disabled");
	}
}
// ------- Alert handling ---------------end


// --------Alarm handling ---------- begin
function reminderFox_alarmSoundChanged() {
	var checkedSound = rmFXelementIsTrue("reminderFox-alarmSound");

	rmFXtoggleGroup(checkedSound,
		"reminderFox-alarmSoundInterval,reminderFox-alarmSoundType");

	rmFXtoggleGroup(checkedSound && rmFXelementIsTrue("reminderFox-alarmSoundInterval"),
		"reminderFox-alarmSoundInterval-Time,reminderFox-alarmInterval-Label");

	rmFXtoggleGroup(checkedSound && rmFXelementIsTrue("reminderFox-alarmSoundType") /*control*/,
		"reminderFox-alarmSoundType-File,reminderFox-alarmSoundType-browse");
}


function reminderFox_alarmSoundInterval_Change() {
	rmFXtoggleGroup(rmFXelementIsTrue("reminderFox-alarmSoundInterval"),
		"reminderFox-alarmSoundInterval-Time,reminderFox-alarmInterval-Label");
}


function reminderFox_alarmSoundType() {
	rmFXtoggleGroup(rmFXelementIsTrue("reminderFox-alarmSoundType"),
		"reminderFox-alarmSoundType-File,reminderFox-alarmSoundType-browse");
}
// ----------- alarm handling ---------- end


function reminderFox_repeatPreviousChanged() {
	var text = document.getElementById("reminderFox-text-repeat-previous");
	var group = document.getElementById("reminderFox-group-repeat-previous");

	if(group.selectedIndex == 0) {
		text.setAttribute("disabled", "true");
	} else {
		text.removeAttribute("disabled");
	}
}

function reminderFox_repeatUpcomingChanged() {
	var text = document.getElementById("reminderFox-text-repeat-upcoming");
	var group = document.getElementById("reminderFox-group-repeat-upcoming");

	if(group.selectedIndex == 0) {
		text.setAttribute("disabled", "true");
	} else {
		text.removeAttribute("disabled");
	}
}


function downloadReminders() {
	reminderFox_saveNetworkOptions();
	var options = {
		forceDownload : true
	};
	window.openDialog('chrome://reminderFox/content/network/download.xul', 'reminderFox-download', 'modal, centerscreen', options);
}

function uploadReminders() {
	reminderFox_saveNetworkOptions();
	window.openDialog('chrome://reminderFox/content/network/upload.xul', 'reminderFox-upload', 'modal,centerscreen');
}


// split a string at newlines:   \n (Mac, *nix) or \r\n  (windows)
function reminderFox_splitOnAllNewlines(input) {
	// just use common newline to read in lines - check for strings that end in \r (to handle windows \r\n)
	var newline = "\n";
	var returnLine = "\r";

	var remindersArray = input.split(newline);
	for ( var index = 0; index < remindersArray.length; index++ ) {
		var readIn = remindersArray[index];
		if (readIn.length > 0 &&  readIn.lastIndexOf(returnLine) == readIn.length -1 ) {
			readIn = readIn.substring(0, readIn.length -1 );
			remindersArray[index] = readIn;
		}
	}
	return remindersArray;
}


// file picker --------------------------------------------------
function reminderFox_pickSoundFile(type) {
	var typeEl;
	if (type == 'alarm')
		typeEl = document.getElementById("reminderFox-alarmSoundType-File");
	if (type == 'alert')
		typeEl = document.getElementById("reminderFox-alertSoundType-File");

	var nsIFilePicker = Ci.nsIFilePicker;
	var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

	fp.init(window, reminderfox.string("rf.options.sound.filepicker.title"),
			nsIFilePicker.modeOpen);

	fp.appendFilter("Audio Files (*.wav, *.ogg)","*.wav; *.ogg");

	fp.open(res => {   //sound
	     if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
	    	 typeEl.value = fp.file.path;
	    	 reminderfox.core.playSound ('test' /*mode*/, typeEl.value);
	     }
	  });
}
//^^^ file picker ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~



function reminderFox_concat(c1, c2) {
	// Concats two collections into an array.
	var c3 = new Array(c1.length + c2.length);
	var x, y = 0;

	for( x = 0; x < c1.length; x++)
	c3[y++] = c1[x];

	for( x = 0; x < c2.length; x++)
	c3[y++] = c2[x];

	return c3;
}


function reminderFox_networkServerEnable(disable) {
//reminderfox.util.Logger('Alert',"   reminderFox_networkServerEnable   disable : " + disable)

	reminderFox_ValidateSynchronization(disable);

	if (!disable) {
		document.getElementById("reminderFox-text-address").removeAttribute("disabled");
	} else {
		document.getElementById("reminderFox-text-address").setAttribute("disabled", true);
	}
}


function reminderFox_ValidateSynchronization(disable) {
//reminderfox.util.Logger('Alert',"   reminderFox_ValidateSynchronization    disable : " + disable)

	var text = document.getElementById("reminderFox-text-address");
	if (text.value == null || text.value == "" || disable){
		document.getElementById("reminderFox_network_import_settings").setAttribute("disabled", "true");
		document.getElementById("reminderFox_network_export_settings").setAttribute("disabled", "true");
		document.getElementById("reminderFox-network-auto-desc").setAttribute("disabled", "true");
		document.getElementById("reminderFox-text-username").setAttribute("disabled", "true");
		document.getElementById("reminderFox-text-password").setAttribute("disabled", "true");
		document.getElementById("reminderFox-network-sync").setAttribute("disabled", "true");
		document.getElementById("reminderFox-network-sync").setAttribute("checked","false");

	} else {
		document.getElementById("reminderFox_network_import_settings").removeAttribute("disabled");
		document.getElementById("reminderFox_network_export_settings").removeAttribute("disabled");
		document.getElementById("reminderFox-network-auto-desc").removeAttribute("disabled");
		document.getElementById("reminderFox-text-username").removeAttribute("disabled");
		document.getElementById("reminderFox-text-password").removeAttribute("disabled");
		document.getElementById("reminderFox-network-sync").removeAttribute("disabled", "true");
	}
}


function reminderFox_openCustomizeUpcomingLabelWindow() {
	var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
	var windowManagerInterface = windowManager.QueryInterface(Ci.nsIWindowMediator);
	var topWindow = windowManagerInterface.getMostRecentWindow("window:upcomingLabelOptions");

	if(topWindow) {
		topWindow.focus();
	} else {
		var newOptions = {
			variableString : document.getElementById("upcomingLabelOptions").value
		};
		window.openDialog("chrome://reminderfox/content/options/upcomingLabelOptions.xul", "upcomingLabelOptions", "chrome,resizable,modal", newOptions);
		document.getElementById("upcomingLabelOptions").value = newOptions.variableString;

		var upcomingLabelPref = reminderfox.core.getPreferenceValue(reminderfox.consts.UPCOMING_REMINDERS_LABEL, reminderfox.consts.UPCOMING_REMINDERS_LABEL_DEFAULT);
		if(upcomingLabelPref != newOptions.variableString)
			document.getElementById("reminderFox-apply").removeAttribute("disabled");
	}
}

function reminderFox_openCustomizeTodayLabelWindow() {
	var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
	var windowManagerInterface = windowManager.QueryInterface(Ci.nsIWindowMediator);
	var topWindow = windowManagerInterface.getMostRecentWindow("window:upcomingLabelOptions");

	if(topWindow) {
		topWindow.focus();
	} else {
		var newOptions = {
			variableString : document.getElementById("todaysLabelOptions").value
		};
		window.openDialog("chrome://reminderfox/content/options/upcomingLabelOptions.xul", "todaysLabelOptions", "chrome,resizable,modal", newOptions);
		document.getElementById("todaysLabelOptions").value = newOptions.variableString;
		var upcomingLabelPref = reminderfox.core.getPreferenceValue(reminderfox.consts.TODAYS_REMINDERS_LABEL, reminderfox.consts.TODAYS_REMINDERS_LABEL_DEFAULT);
		if(upcomingLabelPref != newOptions.variableString)
			document.getElementById("reminderFox-apply").removeAttribute("disabled");
	}
}

function reminderFox_loadCustomizeUpcomingLabelWindow() {
	var upcomingLabel = window.arguments[0].variableString;
	document.getElementById("upcomingLabelText").setAttribute("value", upcomingLabel);
}

function reminderFox_saveCustomizeUpcomingLabel() {
	var upcomingLabel = document.getElementById("upcomingLabelText").value;
	window.arguments[0].variableString = upcomingLabel;
	window.close();
}

function reminderFox_openCustomizeReminderListDateWindow() {
	var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
	var windowManagerInterface = windowManager.QueryInterface(Ci.nsIWindowMediator);
	var topWindow = windowManagerInterface.getMostRecentWindow("window:reminderListDateOptions");

	if(topWindow) {
		topWindow.focus();
	} else {
		var newOptions = {
			variableString : document.getElementById("dayAppearanceLabel").value
		};
		window.openDialog("chrome://reminderfox/content/options/listDateLabelOptions.xul", "listDateLabelOptions", "chrome,resizable,modal", newOptions);
		document.getElementById("dayAppearanceLabel").value = newOptions.variableString;
		var dayAppearanceLabelPref = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
		if(dayAppearanceLabelPref != newOptions.variableString)
			document.getElementById("reminderFox-apply").removeAttribute("disabled");
	}
}

function reminderFox_loadDefaultMoreWindow() {
	var upcomingLabel = window.arguments[0].variableString;
	document.getElementById("defaultMoreText").setAttribute("value", upcomingLabel);
}

function reminderFox_saveDefaultMoreLabel() {
	var upcomingLabel = document.getElementById("defaultMoreText").value;
	window.arguments[0].variableString = upcomingLabel;
	window.close();
}

function reminderFox_openCustomizeDefaultMoreWindow() {
	var windowManager = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
	var windowManagerInterface = windowManager.QueryInterface(Ci.nsIWindowMediator);
	var topWindow = windowManagerInterface.getMostRecentWindow("window:reminderListDefaultMoreOptions");

	if(topWindow) {
		topWindow.focus();
	} else {
		var newOptions = {
			variableString : document.getElementById("defaultMoreLabel").value
		};
		window.openDialog("chrome://reminderfox/content/options/defaultMoreOptions.xul", "defaultMoreOptions", "chrome,modal,resizable", newOptions);
		document.getElementById("defaultMoreLabel").value = newOptions.variableString;
		var dayAppearanceLabelPref = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_MORE);
		if(dayAppearanceLabelPref != newOptions.variableString)
			document.getElementById("reminderFox-apply").removeAttribute("disabled");
	}
}

function reminderFox_addOrEditListItem(addOrEditMode) {
	var catCurList, selCatItem;

	var currentListName = null;
	var url = null;
	var subscriptions = reminderfox.core.getSubscriptions();
	if(addOrEditMode == 1) {// edit
		catCurList = document.getElementById('reminderFox_todoLists_listbox');
		selCatItem = catCurList.currentIndex;

		if(selCatItem == -1) {
			return;
		}/* no item selecetd */
		currentListName = catCurList.childNodes[selCatItem].children[0].value;
		url = subscriptions[currentListName];
	}

	var originalListName = currentListName;
	var callOptions = {
		added : false,
		addEvent : addOrEditMode,
		currentItem : currentListName,
		subscription : url
	};
	window.openDialog("chrome://reminderfox/content/options/addCustomList.xul",
		"reminderFox-editAdd-categories", "chrome,resizable,modal", callOptions);

	if(callOptions.added == true) {
		if(addOrEditMode == 0) {// add a new list
			var reminderFox_todoLists_listbox = document.getElementById("reminderFox_todoLists_listbox");
			var newItem = document.createElement("richlistitem");   // richlistbox   richlistitem - OK
			var newListName = callOptions.currentItem;
			var newListLabel = document.createElement("label");
			newListLabel.setAttribute("value", newListName);
			newItem.appendChild(newListLabel);
			reminderFox_todoLists_listbox.appendChild(newItem);
		} else { // change list name
			if(originalListName != callOptions.currentItem) {
				catCurList.childNodes[selCatItem].children[0].setAttribute('value',callOptions.currentItem);

				var _todosArray = reminderfox.core.getReminderTodos();
				var reminderTodos = _todosArray[originalListName];
				if(reminderTodos != null && reminderTodos.length > 0) {
					_todosArray[callOptions.currentItem] = reminderTodos;
					_todosArray[originalListName] = new Array();

					reminderfox.core.writeOutRemindersAndTodos(false);			// nothing with networking
				}
			}
		}

		// if subscription has changed (added/edited/removed), then update the preference
		if(subscriptions[callOptions.currentItem] != callOptions.subscription) {
			subscriptions[callOptions.currentItem] = callOptions.subscription;
			reminderfox.core.writeSubscriptions(subscriptions);
		}
	}
}



// *********** Bow/Text button **********
/**
 * Creates the menuitems for the toolbar selector.
 */
function  reminderFox_populateBars()  {
	var win = reminderFox_getWindow();
	var toolbars = win.document.getElementsByTagName("toolbar");

	var menubars = win.document.getElementsByTagName("menubar");
	var popup = document.getElementById("reminderFox-popup-bars");
	var x, bar, item, val, list;

	// first remove the toolbars already there...
	while(popup.hasChildNodes())
	popup.removeChild(popup.firstChild);

	toolbars = reminderFox_concat(toolbars, menubars);
	for( x = 0; x < toolbars.length; x++) {
		bar = toolbars[x];

		//do not include find toolbar
		if(bar.getAttribute("id") == "FindToolbar")
			continue;
		item = document.createElement("menuitem");
		item.setAttribute("id", bar.getAttribute("id"));
		item.value = bar.getAttribute("id");
		if(bar.hasAttribute("toolbarname"))
			item.setAttribute("label", bar.getAttribute("toolbarname"));
		else
			item.setAttribute("label", bar.getAttribute("id"));
		if ((bar.children.length > 0) && ((bar.getAttribute("id") != "") || (bar.getAttribute("toolbarname") != "")))
			popup.appendChild(item);
	}

	// add "None" category (can be used to hide status bar ribbon icon)
	item = document.createElement("menuitem");
	item.setAttribute("id", "none");
	item.value = "none";
	item.setAttribute("label", "none");
	popup.appendChild(item);

	reminderFox_setElement("reminderFox-list-bars", "Char", "reminderFox-popup-bars");
}


function  reminderFox_getWindow()  {
	//XXX may need to change this code if main window of a supported app is not "navigator:browser"
	var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
	var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"].getService(Ci.nsIWindowWatcher);
	var top = wm.getMostRecentWindow("navigator:browser");


	if ( !top ) {
	 	top = wm.getMostRecentWindow("mail:3pane");
	}
	if ( !top ) {
		top = wm.getMostRecentWindow("mail:messageWindow");
	}
	if ( !top ) {
		top = wm.getMostRecentWindow("calendarMainWindow");
	}

	if (!top) {
		var guid;
		try {
			var app = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
			guid = app.ID;
		} catch(e) {
			var appBranch = reminderfox._prefs.getBranch(null);
			try {
				guid = appBranch.getCharPref("app.id");
			} catch(e) {
				guid = "{86c18b42-e466-45a9-ae7a-9b95ba6f5640}";
			}
		}

		switch (guid) {
			case "{86c18b42-e466-45a9-ae7a-9b95ba6f5640}":		// Mozilla Suite
			case "{3db10fab-e461-4c80-8b97-957ad5f8ea47}":		// Netscape Browser
				top = ww.openWindow(null, "chrome://navigator/content/navigator.xul", "_blank", "chrome,all,dialog=no", "about:blank");
			break;

			case reminderfox.util.FIREFOX_ID:
				top = ww.openWindow(null, "chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", "about:blank");
			break;

			case reminderfox.util.THUNDERBIRD_ID:
				top = ww.openWindow(null, "chrome://browser/content/messenger.xul", "_blank", "chrome,all,dialog=no", "about:blank");
			break;

			case reminderfox.util.SEAMONKEY_ID:
				top = ww.openWindow(null, "chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", "about:blank");
			break;


			default:
				top = ww.openWindow(null, "chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", "about:blank");
			break;
		}
	}
	return top;
}



function reminderFox_setElement(aName, aType, aGroup) {
	var x, el, els, val;
	el = document.getElementById(aName);
	val = reminderfox.core.getPreferenceValue(reminderfox.consts.TOOLBAR, 'none');
	switch (el.localName) {
		case "checkbox":
			el.checked = val;
			break;
		case "textbox":
			el.value = val;
			break;
		case "menulist":
			els = document.getElementById(aGroup).childNodes;
			for( x = 0; x < els.length; x++) {
				if(((aType == "Int") ? parseInt(els[x].value) : els[x].value) == val) {
					el.selectedItem = els[x];
					break;
				}
			}
			break;
		case "radiogroup":
			els = document.getElementsByAttribute("group", aGroup);
			for( x = 0; x < els.length; x++) {
				if(((aType == "Int") ? parseInt(els[x].value) : els[x].value) == val) {
					el.selectedItem = els[x];
					break;
				}
			}
			break;
	}
}
