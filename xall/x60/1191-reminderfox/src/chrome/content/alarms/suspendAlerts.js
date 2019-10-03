
function loadAlarmOptions() {
		reminderFox_updateSnoozeTimeDate();
}



function reminderFox_snoozeTimeChanged() {
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
		if ( reminderfox.util.isInteger( snoozeTime2 ) ) {
			if ( timeUnitsList2 != null ) {
				var timeSelected2 = timeUnitsList2.selectedIndex;
				if ( timeSelected2 == 1 ) {
					snoozeTime2 = snoozeTime2 * 60;
				}
				else if ( timeSelected2== 2 ) {
					snoozeTime2 = snoozeTime2 * 60 * 24;
				}
			}

			var currentTimeDate = new Date();
			var currentTime2 = currentTimeDate.getTime();
			var alarmTime2 = currentTime2 + (snoozeTime2*60000);
			var snoozeDate2 = new Date();
			snoozeDate2.setTime( alarmTime2 );

			var snoozeString = "";
			if ( snoozeDate2.getMonth() != currentTimeDate.getMonth() ||
				snoozeDate2.getDate() != currentTimeDate.getDate() ) {
				var _dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
				snoozeString=  reminderfox.date.getDateVariable( null , snoozeDate2, _dateVariableString ) + ", ";
			}
			snoozeString += reminderfox.date.getTimeString(snoozeDate2);
			snoozeUntilText.setAttribute( "value", snoozeString);
		}
}


function reminderFox_alertChanged() {
	var showAlert = document.getElementById("reminderFox-alert");
	var alertVal =  showAlert.getAttribute("checked" );
	if ( alertVal == false || alertVal == "false") {
			document.getElementById("reminderFox-alertTime").setAttribute("disabled", "true");
			document.getElementById("reminderFox-alertTimeUnits").setAttribute("disabled", "true");
	}
	else {
			document.getElementById("reminderFox-alertTime").removeAttribute("disabled" );
			document.getElementById("reminderFox-alertTimeUnits").removeAttribute("disabled" );
	}
}

function setAlarm() {
	var windowEnumerator, oldestWindow;
	var alertType = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_ALL);

	// if it's marked as suspended, change to original value
	var suspendedIndex = alertType.indexOf(reminderfox.consts.ALERT_SUSPEND);
	if (suspendedIndex != -1) {
		alertType = alertType.substring(suspendedIndex + reminderfox.consts.ALERT_SUSPEND.length);
	}
	// otherwise, suspend the alert
	else {
		alertType = reminderfox.consts.ALERT_SUSPEND + alertType;
	}
	reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_ENABLE, alertType);

	// if user chose to automatically resume alerts at some time, process that
	var showAlert = document.getElementById("reminderFox-alert");
	var alertVal =  showAlert.getAttribute("checked" );
	if ( alertVal == true || alertVal == "true") {
		var alertTimesList = document.getElementById("reminderFox-alertTime");

		var snoozeTime;
		var timeUnitsList;
		snoozeTime = alertTimesList.label;
		timeUnitsList = document.getElementById('reminderFox-alertTimeUnits');

		if ( reminderfox.util.isInteger( snoozeTime ) ) {
			if ( timeUnitsList != null ) {
				var timeSelected = timeUnitsList.selectedIndex;
				if ( timeSelected == 1 ) {
					snoozeTime = snoozeTime * 60;
				}
				else if ( timeSelected == 2 ) {
					snoozeTime = snoozeTime * 60 * 24;
				}
			}

			windowEnumerator =  reminderfox.core.getWindowEnumerator();
			if (windowEnumerator.hasMoreElements()) {
				oldestWindow = windowEnumerator.getNext();

				// if snooze greater than an hour, just let hourly process handle it then;
				// if it's within the hour, then set the alarm now
				//if ((parseInt(snoozeTime) * 60000) < 3600000 ) {
				oldestWindow.reminderfox.overlay.lastSuspendAlertTimeoutId = oldestWindow.setTimeout(function(){
					oldestWindow.reminderfox.overlay.resumeAlerts(snoozeTime);}, snoozeTime*60000);
				//}
			}
		}
	}

	// call this to update the icon status (greys out status text when alerts are suspended)
	windowEnumerator =  reminderfox.core.getWindowEnumerator();
	if (windowEnumerator.hasMoreElements()) {
		oldestWindow = windowEnumerator.getNext();
		oldestWindow.reminderfox.overlay.updateRemindersInWindow();
	}

	close();
}
