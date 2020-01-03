if (Cu === undefined)		var Cu = Components.utils;
if (Ci === undefined)		var Ci = Components.interfaces;
if (Cc === undefined)		var Cc = Components.classes;


if (!reminderfox)     var reminderfox = {};
if (!reminderfox.overlay)    reminderfox.overlay = {};
if (!reminderfox.overlay.consts)    reminderfox.overlay.consts = {};

if (!reminderfox.calDAV)    reminderfox.calDAV = {};

// constants
reminderfox.overlay.consts.TOOLTIP_LINE_LENGTH = 100;
reminderfox.overlay.consts.TOOLTIP_WITH_TODOS_LINE_LENGTH = 65;
reminderfox.overlay.consts.ALERT_TEXT_MAX_LENGTH = 100;
reminderfox.overlay.consts.MONTHLY_WILDCARD = "*";

// reminderfox.overlay.consts.HOUR_TIMEOUT = 1800000; // changed to half hour instead of 1 hour= 3600000  // dump: externalize this to a pref (read it first time only; then store it)
reminderfox.overlay.consts.HOUR_TIMEOUT = 60000; // changed to 2 min instead of 1 hour= 3600000
// // dump: externalize this to a pref (read it first time only; then store it)

// global vars
reminderfox.overlay.alarmList = new Array();
reminderfox.overlay._lastStatusBarClick = null;
reminderfox.overlay.reminderFox_initialized = false;
// reminderfox.consts.LAST_PROCESSED = "";
reminderfox.overlay.lastProcessed = "";
reminderfox.overlay.lastAlert = 0;


// Cache the last reminders
reminderfox.overlay.lastDay = null;
reminderfox.overlay._lastAlarmTime = null;


reminderfox.overlay.lastSuspendAlertTimeoutId = null;

reminderfox.overlay.timerObject = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
reminderfox.overlay.alertTimerObject = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);


reminderfox.overlay.start= function() {
// =====================================================
    rmFx_extractXPI("chrome/content/reminderfox/defaults/"); // unpack
   // run this later and let the window load.
    window.setTimeout(function() {reminderfox.overlay.start_postInit(); }, 100);
};

/**
 * Extracts dirs/files from xpi 'chrome' directory
 *   to ../Profile/{profile.default}/reminderfox
 * If a file already exsists it will be skipped/no overwrite
 *
 * @param  aZipDir     The source ZIP dir in xpi/add-on.
 */
function rmFx_extractXPI(aZipDir) {
//---------------------------------------------------------
  // aZipDir = "chrome/content/reminderfox/defaults/"

  var aZipDirLen = aZipDir.length;

    function getTargetFile(aDir, entry) {
      var target =reminderfox.util.ProfD_extend('reminderfox');
      entry.split("/").forEach(function(aPart) {
        target.append(aPart);
      });
      return target;
}

  var aDir =reminderfox.util.ProfD_extend('reminderfox');

  var pathToXpiToRead = reminderfox.util.ProfD_extend('extensions');
  pathToXpiToRead.append('{ada4b710-8346-4b82-8199-5de2b400a6ae}.xpi');

  var FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils
  var aZipFile = new FileUtils.File(pathToXpiToRead.path);

  var zipReader = Cc["@mozilla.org/libjar/zip-reader;1"]
    .createInstance(Ci.nsIZipReader);
  zipReader.open(aZipFile);

  try {
    // create directories first
    var entries = zipReader.findEntries(aZipDir + "*/");
    while (entries.hasMore()) {
      var entryName = entries.getNext();
      var target = getTargetFile(aDir, entryName.substring(aZipDirLen));
      if (!target.exists()) {
        try {
          target.create(Ci.nsIFile.DIRECTORY_TYPE,
          FileUtils.PERMS_DIRECTORY);
        }
        catch (e) {
          console.error("rmFx_extractXPI: failed to create target directory for extraction file = "
            + target.path + "\n");
        }
      }
    }

    // extract/copy files
    entries = zipReader.findEntries(aZipDir + "*");
    while (entries.hasMore()) {
      var entryName = entries.getNext();
      var target = getTargetFile(aDir, entryName.substring(aZipDirLen));
      if (target.exists() == false || (target.exists() && target.isFile())) {
        zipReader.extract(entryName, target);
        try {
          target.permissions |= FileUtils.PERMS_FILE;
        }
        catch (e) {
          console.error("rmFx_extractXPI: Failed to set permissions "
            + FileUtils.PERMS_FILE.toString(8) + " on " + target.path + " " + e + "\n");
        }
      }
    }
  } catch (ex) {
    reminderfox.util.Logger('Alert', ex, target)
  }
  finally {
  zipReader.close();
  }
};


reminderfox.overlay.consts.ALARM_DELAY = null; // make sure at least 500ms between each alarm, or mozilla creates a blank window

reminderfox.overlay.getAlarmDelay=function() {
    if (!reminderfox.overlay.consts.ALARM_DELAY) {
        reminderfox.overlay.consts.ALARM_DELAY = reminderfox.core.getPreferenceValue(reminderfox.consts.ALARM_DELAY, reminderfox.consts.ALARM_DELAY_DEFAULT);
    }
    return reminderfox.overlay.consts.ALARM_DELAY;
}

/**
 * Open the Reminderfox Add-Dialog with setting the [Add ] to 'reminders' or 'todos
 * Works with bow icon
 */
reminderfox.overlay.openDoubleClickDialog= function(event){
    if (event.button == 0) {
        var defaultEditType = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_EDIT, reminderfox.consts.DEFAULT_EDIT_DEFAULT);
        reminderfox.overlay.openMainDialog(true, defaultEditType);
    }
}

// Launches the 'Main' dialog, fills in reminders/todos list
reminderfox.overlay.openMainDialog= function(closeIfOpen, tab){
    var topWindow = reminderfox.util.getWindow("window:reminderFoxEdit");

    if (topWindow) {
        var currentClickTime = new Date().getTime();
        if (reminderfox.overlay._lastStatusBarClick != null &&
            ((currentClickTime - reminderfox.overlay._lastStatusBarClick) < 700)) {
            closeIfOpen = false;
        }
        if (closeIfOpen != null && closeIfOpen == true) {
            topWindow.close();
        }
        else {
            try {
                topWindow.focus();
            }
            catch (e) {
            }
        }
    }
    else {
        var newOptions = {
            callback: reminderfox.core.networkSynchronizeCallback,
            clearMailLabelCallback: reminderfox.overlay.clearMailLabelCallback
        };
        if (tab == null) tab = 'reminders';
        window.openDialog("chrome://reminderfox/content/addreminder-dialog.xul", "addreminder-dialog", "chrome,centerscreen,resizable,dialog=no", tab, newOptions);
    }
    reminderfox.overlay._lastStatusBarClick = new Date().getTime();
}


reminderfox.overlay.clearMailLabelCallback= function(messageID){
    try { // can't clear Label with non messenger !!
        reminderfox.mail.clearLabelByMessageID(messageID);
    }
    catch (ex) {
    }
}


reminderfox.overlay.openOptionsDialog= function(tab2use){

    var topWindow = reminderfox.util.getWindow("window:reminderFoxOptions");
    if (topWindow) {
        try {
            topWindow.focus();
            if (tab2use != null) {
                // load 'Options ..'  with preselected TAB
                var tabs = topWindow.document.getElementById("tabbox").tabs
                for(var i = 0; i < tabs.childElementCount; i++) {
                    if(tabs.children[i].id == tab2use)
                        topWindow.document.getElementById("tabbox").tabs.selectedIndex = i;
                }
            }
        }
        catch (e) {}
    }
    else {
        if (tab2use == null) tab2use = 'general'
        var options = {
            tab: tab2use,
            modified: reminderfox.core.remindersModified
        };
        window.openDialog('chrome://reminderFox/content/options/options.xul',
            'reminderFox-options', 'chrome', options);
    }
}


reminderfox.overlay.openQuickAlarmDialog= function(){
    window.openDialog('chrome://reminderFox/content/alarms/quickAlarmDialog.xul', 'quickAlarm', 'chrome,dialog=no');
}


reminderfox.overlay.processAlarm= function( recentReminderOrTodo, isReminder, listName ) {
var msg = "RmFX  overlay.processAlarm " + reminderfox.overlay.reminder_Infos(recentReminderOrTodo);
//reminderfox.core.logMessageLevel(msg, reminderfox.consts.LOG_LEVEL_SUPER_FINE);
    recentReminderOrTodo.currentInstance = recentReminderOrTodo.date

    var alarmInfo = null;
    var changed = false;
    var alarmTime = null;
    var lastSnoozeTime = null;

    var newDate = new Date( recentReminderOrTodo.date.getFullYear(), recentReminderOrTodo.date.getMonth(), recentReminderOrTodo.date.getDate(),
        recentReminderOrTodo.date.getHours(), recentReminderOrTodo.date.getMinutes() );
    if (recentReminderOrTodo.allDayEvent ) {
        newDate.setHours( 0, 0 );
    }
    var mins = 	newDate.getMinutes();
    var alarmMinutes = null;
    alarmMinutes = reminderfox.core.getAlarmInMinutes( recentReminderOrTodo, recentReminderOrTodo);

    // dump: if a RUC=2 reminder, and no snooze...  maybe just always alarm?
    if (alarmMinutes != null ) {
        newDate.setMinutes( mins - alarmMinutes );
        alarmTime = newDate.getTime();
        if (recentReminderOrTodo.snoozeTime != null ) { // if this alarm has been snoozed, then get its snooze time
            var snoozeAlarmTime = recentReminderOrTodo.snoozeTime;
            var index = snoozeAlarmTime.indexOf( ';' );
            if (index != -1 ) {
                lastSnoozeTime = snoozeAlarmTime.substring( index + 1);
                snoozeAlarmTime = snoozeAlarmTime.substring( 0, index );
                // separate out: -PT120M
                lastSnoozeTime = lastSnoozeTime.substring( 2, lastSnoozeTime.length-1);
            }
            //dump( "alarm: " + recentReminderOrTodo + ":" + snoozeAlarmTime + ": " + alarmTime );
            if (snoozeAlarmTime > alarmTime ) {
                alarmTime = snoozeAlarmTime;
            }
            else {
                // this is an old snooze time...  older than the current alarm, so it will never execute.  Clear it.
                //changed = true;
                // update: actually this will fail, for repeating reminders as upcoming occurrences would cause this
                // conditional to be hit and incorrectly clear the snooze time
                //recentReminderOrTodo.snoozeTime = null;
            }
        }
    }
    else { // if the alarm can not be retrieved properly, return (unless a snooze time is available)
        if (recentReminderOrTodo.snoozeTime != null ) {
            var snoozeAlarmTime = recentReminderOrTodo.snoozeTime;
            var index = snoozeAlarmTime.indexOf( ';' );
            if (index != -1 ) {
                lastSnoozeTime = snoozeAlarmTime.substring( index + 1);
                snoozeAlarmTime = snoozeAlarmTime.subSring( 0, index );
                // separate out: -PT120M
                lastSnoozeTime = lastSnoozeTime.substring( 2, lastSnoozeTime.length-1);
            }
            alarmTime = snoozeAlarmTime;
        }
        else {
            return changed;
        }
    }

    var currentTime = new Date().getTime();
    var missedAlarm = false;
    var timeDifference = alarmTime - currentTime;

    if (timeDifference < 0 ) {
        // check acknowledge
        var ackDate = new Date();
        ackDate.setTime( recentReminderOrTodo.alarmLastAcknowledge );  // TODO check

        var d2 = new Date();
        var alarmD = new Date();
        alarmD.setTime(alarmTime);

// TODO: tfm - changed to == null || ... in order to handle alarms where lastack was cleared
        if (recentReminderOrTodo.alarmLastAcknowledge == null ||  // don't check alarms of old-style reminders (i.e. they have no ack)
            recentReminderOrTodo.alarmLastAcknowledge < alarmTime ) {
            // this past alarm was never acknowledged; let's do it now
            timeDifference = 0;
            missedAlarm = true;
        }

//ALARM		reminderfox.core.logMessageLevel( "ackdate: "  + ackDate + " less than: " +alarmD , reminderfox.consts.LOG_LEVEL_SUPER_FINE);  //TODO
    }

    // allow for a minute time buffer
    if (timeDifference < 0 && timeDifference >= -60000 ) {
        timeDifference = 0;
    }
    // check if the time difference occurs in the next 60 minutes
    var timeDifferenceInMinutes = 0;
    if (timeDifference != 0 ) {
        timeDifferenceInMinutes = timeDifference/60000;
    }

    if (timeDifferenceInMinutes >= 0 && timeDifferenceInMinutes  <= 60 ) {
        var windowEnumerator =  reminderfox.core.getWindowEnumerator();
        if (windowEnumerator.hasMoreElements()) {
            var oldestWindow = windowEnumerator.getNext();

            // check alarm list
            var alarmReminderId = recentReminderOrTodo.id;
            // if good - add to alarm list
            var found = false;
            for (var i = 0; i < oldestWindow.reminderfox.overlay.alarmList.length && !found; i++ ) {
                var currentAlarmObject =  oldestWindow.reminderfox.overlay.alarmList[i];

                var currentAlarmId =currentAlarmObject .alarmId;
                if (currentAlarmId== alarmReminderId ) {
                    // found an existing alarm set for this reminder...


//					if (currentAlarmObject.snoozed ) {
//						// if it's been SNOOZED; then ignore as that snooze is going to go off no matter what
//						// update 10/03/2010 - disabling this; this was causing issues when there was an old snooze value,
//						// and a repeating daily reminder; the next day it would not alarm, because there was an old snooze value
//						//...  I believe this original logic is already handled; if the alarm is snoozed, it uses that as the snooze
//						// value.  If it's a repeating reminder, one alarm will be snoozed, and the next value will occur
//						found = true;
//						break;
//					}

                    var currentAlarmTime = currentAlarmObject.timeOfAlarm;
                    var alarmTimeDiff = alarmTime - currentAlarmTime;
                    if ((alarmTimeDiff < -60000 || alarmTimeDiff >  60000) && !missedAlarm) {
                        // times are different; delete old and add new (only if this is not a missed alarm - b/c we'll just show the upcoming alarm instead)
                        reminderfox.core.removeFromArray( oldestWindow.reminderfox.overlay.alarmList, i);
//ALARM						reminderfox.core.logMessageLevel( "alarm: Remove alarm" , reminderfox.consts.LOG_LEVEL_SUPER_FINE);  //TODO
                        //reminderfox.core.logMessageLevel( "alarm: Remove alarm1: " , reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO
                        break;
                    }
                    else {
                        // times are close enough (within a minute); we don't need to add to the list
                        found = true;
                    }
                }
            }
//ALARM			reminderfox.core.logMessageLevel( "alarm:1 FOUND: " + found, reminderfox.consts.LOG_LEVEL_SUPER_FINE);  //TODO

            if (!found ) {
                // add him

                // if this was a snoozed alarm (in the ICS file) then mark him as snoozed
                var isSnoozed = false;
                if (recentReminderOrTodo.snoozeTime != null ) {
                    isSnoozed = true;
                }
                //
                //reminderfox.core.logMessageLevel( "alarm: adding to list: " +recentReminderOrTodo.summary + "; alarmId: " + alarmReminderId + "; timeOfAlarm: " + alarmTime, reminderfox.consts.LOG_LEVEL_SUPER_FINE);  //TODO
                //reminderfox.core.logMessageLevel( "alarm: adding to list:  len= " + oldestWindow.reminderfox.overlay.alarmList.length + "; " +recentReminderOrTodo.summary + "; alarmId: " + alarmReminderId + "; timeOfAlarm: " + alarmTime, reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO

                oldestWindow.reminderfox.overlay.alarmList[oldestWindow.reminderfox.overlay.alarmList.length]  =
                { alarmId: alarmReminderId,  timeOfAlarm: alarmTime,  snoozed: isSnoozed };

                var missedAlarmString = "false";
                if (missedAlarm  ) {
                    missedAlarmString = "true";
                }
                var isReminderString = "true";
                if (!isReminder ) {
                    isReminderString = "false";
                }
                if (listName == null ){
                    listName = "";
                }
                var isTodo = false;
                if (isReminder != "true" && isReminder != true ) {
                    isTodo = true;
                }


                var newAlarm = {
                    alarmTabPanel: null,
                    alarmRecentReminder: recentReminderOrTodo,
                    alarmSnoozeTime: lastSnoozeTime,
                    alarmListName: listName,
                    alarmTimeString: alarmTime,
                    alarmIsReminder: isReminderString,
                    alarmIsTodo: isTodo,
                    alarmAlarmMissed: missedAlarmString,
                    synccallback: reminderfox.core.networkSynchronizeCallback,		//.overlay.processAlarm
                    clearLabelCallback: reminderfox.overlay.clearMailLabelCallback,
                    alarmCurrentAlarmId: alarmReminderId,
                    reminderTime: recentReminderOrTodo.date.getTime(),
                    reminderTimeDifference : timeDifference,
                    reminderInstanceDate : recentReminderOrTodo.currentInstance
                };


                if (timeDifference <= 0 || missedAlarm ) {
                    // do nothing; will return missed alarm
                    alarmInfo = newAlarm;

                }
                else {
                    var alarmInfoArray = new Array();
                    alarmInfoArray[0] = newAlarm;

                    //alert( "A1!: " + alarmInfoArray[0].alarmRecentReminder.id  + " --> alarm in minutes :" + (timeDifference/60/ 1000) );
                    oldestWindow.setTimeout(oldestWindow.reminderfox.overlay.showMissedAlarmsSnooze,
                        timeDifference,
                        alarmInfoArray[0].alarmSnoozeTime,
                        alarmInfoArray[0].alarmRecentReminder.id,
                        alarmInfoArray[0].alarmListName,
                        alarmInfoArray[0].alarmTimeString ,
                        alarmInfoArray[0].alarmIsReminder,
                        alarmInfoArray[0].alarmIsTodo,
                        alarmInfoArray[0].alarmAlarmMissed,
                        alarmInfoArray[0].reminderTime,
                        alarmInfoArray[0].reminderTimeDifference,
                        alarmInfoArray[0].recentReminderOrTodo );

                }
            } // endOf::  if (!found )



        }  // endOf:: if (windowEnumerator.hasMoreElements()) {
     }   // endOf::  timeDifferenceInMinutes >= 0 && timeDifferenceInMinutes  <= 60 )
    return alarmInfo;
}


reminderfox.overlay.showMissedAlarmsSnooze= function( alarmSnoozeTime, alarmRecentReminderID, alarmListName,
                                                      alarmTimeString, alarmIsReminder, alarmIsTodo, alarmAlarmMissed, reminderTime,
                                                      reminderTimeDifference, recentReminderOrTodo ) {

//	alert( "INSIDE HERE: " + alarmSnoozeTime + ", " +  alarmRecentReminderID+ ", " +  alarmListName+ ", " +
//	alarmTimeString+ ", alarmisreminder: " + alarmIsReminder+ ", " + alarmIsTodo+ ", " + alarmAlarmMissed+ ", " +  reminderTime+ ", " +
//	reminderTimeDifference );

    var isReminder = false;
    if (alarmIsReminder == 1  || alarmIsReminder == true || alarmIsReminder == "true") {
        isReminder = true;
    }

    var isTodo = false;
    if (alarmIsTodo == 1  || alarmIsTodo == true || alarmIsTodo == "true") {
        isTodo = true;
    }

    var reminderOrTodo = null;
    if (isReminder == "true" || isReminder == true ) {
        reminderOrTodo =	reminderfox.core.getRemindersById( alarmRecentReminderID);
        //	alert( "FOUND IT: " + reminderOrTodo );
    }
    else {
        reminderOrTodo =	reminderfox.core.getSpecificTodoById( alarmRecentReminderID);
    }

    var alarmMissed = false;
    if (alarmAlarmMissed == 1 ) {
        alarmMissed = true;
    }

    var newAlarm = {
        quickAlarmText : null,
        alarmTabPanel: null,
        alarmRecentReminder: reminderOrTodo,
        alarmSnoozeTime: alarmSnoozeTime,
        alarmListName: alarmListName,
        alarmTimeString: alarmTimeString,
        alarmIsReminder: isReminder,
        alarmIsTodo: isTodo,
        alarmAlarmMissed: alarmMissed,
        synccallback: reminderfox.core.networkSynchronizeCallback,		//.overlay.showMissedAlarmsSnooze
        clearLabelCallback: reminderfox.overlay.clearMailLabelCallback,
        alarmCurrentAlarmId: alarmRecentReminderID,
        reminderTime: reminderTime,
        reminderTimeDifference : reminderTimeDifference,
        recentReminderOrTodo : recentReminderOrTodo
    };

    var alarmInfos = new Array();
    alarmInfos[0] = newAlarm;

    reminderfox.overlay.showMissedAlarms( alarmInfos );
}


reminderfox.overlay.showMissedAlarmsSnooze2= function( alarmSnoozeTime, alarmRecentReminderID, alarmListName,
                                                       alarmTimeString, alarmIsReminder, alarmIsTodo, alarmAlarmMissed, reminderTime,
                                                       reminderTimeDifference, recentReminderOrTodo ) {

    var reminderOrTodo = null;
    var isReminder = false;
    if (alarmIsReminder == 1 ) {
        isReminder = true;
    }

    var isTodo = false;
    if (alarmIsTodo == 1 ) {
        isTodo = true;
    }


    if (isReminder == "true" || isReminder == true ) {
        reminderOrTodo =	reminderfox.core.getRemindersById( alarmRecentReminderID);
    }
    else {
        reminderOrTodo =	reminderfox.core.getSpecificTodoById( alarmRecentReminderID);
    }

    var alarmMissed = false;
    if (alarmAlarmMissed == 1 ) {
        alarmMissed = true;
    }

    var newAlarm = {
        quickAlarmText : null,
        alarmTabPanel: null,
        alarmRecentReminder: reminderOrTodo,
        alarmSnoozeTime: alarmSnoozeTime,
        alarmListName: alarmListName,
        alarmTimeString: alarmTimeString,
        alarmIsReminder: isReminder,
        alarmIsTodo: isTodo,
        alarmAlarmMissed: alarmMissed,
        synccallback: reminderfox.core.networkSynchronizeCallback,		//.overlay.showMissedAlarmsSnooze2
        clearLabelCallback: reminderfox.overlay.clearMailLabelCallback,
        alarmCurrentAlarmId: alarmRecentReminderID,
        reminderTime: reminderTime,
        reminderTimeDifference : reminderTimeDifference,
        recentReminderOrTodo : recentReminderOrTodo
    };
    var alarmInfos = new Array();
    alarmInfos[0] = newAlarm;
    reminderfox.overlay.openAlarmWindow(alarmInfos);
}


reminderfox.overlay.showMissedAlarms= function( alarmInfos ) {
var msg = "RmFX  .overlay.showMissedAlarms    " + alarmInfos.length  + reminderfox.overlay.alarm_Infos(alarmInfos)
reminderfox.core.logMessageLevel (msg, reminderfox.consts.LOG_LEVEL_SUPER_FINE);

    var alarmArray = new Array();
    for (var k = 0; k < alarmInfos.length; k++) {
        var alarmInfo = alarmInfos[k];

        if (alarmInfo.quickAlarmText != null ) { // a quick alarm
            alarmArray[alarmArray.length] = alarmInfo;
            continue;
        }

        var reminderdateTime = alarmInfo.reminderTime;
        var alarmReminderId = alarmInfo.alarmCurrentAlarmId;
        var isReminder = alarmInfo.alarmIsReminder;
        var alarmTime = alarmInfo.alarmTimeString;
        var missedAlarm = alarmInfo.alarmAlarmMissed;

        // only show alarm if reminder still exists and it has not been marked complete
        //  (the user could have deleted/completed it since last setting the alarm timeout)
        var reminderOrTodo = alarmInfo.alarmRecentReminder;
        if (isReminder == "true" || isReminder == true ) {
            reminderOrTodo = reminderfox.core.getRemindersById(alarmReminderId);
        }
        else {
            reminderOrTodo = reminderfox.core.getSpecificTodoById(alarmReminderId);
        }

        if (reminderOrTodo != null) {
            var completed = false;
            if (isReminder == "true" || isReminder == true) {
                reminderOrTodo = reminderfox.core.cloneReminderFoxEvent(reminderOrTodo);
                reminderOrTodo.date.setTime(reminderdateTime);
                completed = reminderfox.core.isCompletedForDate(reminderOrTodo, reminderOrTodo.date);
            }
            else {
                reminderOrTodo = reminderfox.core.cloneReminderFoxTodo(reminderOrTodo);
                reminderOrTodo.date.setTime(reminderdateTime);
                completed = reminderfox.core.isCompletedForDate(reminderOrTodo, reminderOrTodo.date);
            }
            if (!completed) {
                // only show this reminder if it has not already been acknowledged
                var resultbool = (reminderOrTodo.alarmLastAcknowledge <= alarmTime);
//ALARM				reminderfox.core.logMessageLevel("alarm: last acknowlege: " + reminderOrTodo.alarmLastAcknowledge + " <=? " + alarmTime + " ; result = " + (reminderOrTodo.alarmLastAcknowledge <= alarmTime), reminderfox.consts.LOG_LEVEL_SUPER_FINE); //TODO

                if (reminderOrTodo.alarmLastAcknowledge == null || reminderOrTodo.alarmLastAcknowledge <= alarmTime) {
                    var windowEnumerator = reminderfox.core.getWindowEnumerator();
                    if (windowEnumerator.hasMoreElements()) {
                        var oldestWindow = windowEnumerator.getNext();
                        for (var i = 0; i < oldestWindow.reminderfox.overlay.alarmList.length; i++) {
                            var currentAlarmId = oldestWindow.reminderfox.overlay.alarmList[i].alarmId;
                            var snooze = false;
                            if (currentAlarmId == alarmReminderId) {
                                if (oldestWindow.reminderfox.overlay.alarmList[i].snoozed) {
                                    snooze = true;
                                }
                                var currentAlarmTime;
                                if (snooze) {
                                    var alarmTimeInt = parseInt(alarmTime);
                                    var actualCurrentTime = new Date().getTime();

                                    // if you snooze an alarm for a long value (like 28 days), mozilla calls the setTimeout immediately.  We need
                                    // to check against that (they probably have some bug when an int value gets too big)
                                    actualCurrentTime = actualCurrentTime + 2000; // add 2 seconds for a small buffer
                                    var diffcheck = actualCurrentTime < alarmTimeInt;
                                    if (actualCurrentTime < alarmTimeInt) {
//ALARM										reminderfox.core.logMessageLevel("alarm: current time is less than alarm time; not showing alarm.  Current time " + (actualCurrentTime - 2000) + "; alarm time set for: " + alarmTimeInt, reminderfox.consts.LOG_LEVEL_SUPER_FINE); //TODO
                                        continue;
                                    }

                                    currentAlarmTime = parseInt(alarmTime);
                                }
                                else {
                                    currentAlarmTime = oldestWindow.reminderfox.overlay.alarmList[i].timeOfAlarm;
                                }

                                var alarmTimeDiff = alarmTime - currentAlarmTime;
//ALARM								reminderfox.core.logMessageLevel("alarm: original alarm time: " + alarmTime + "; current alarm time: " + currentAlarmTime + ";  alarmTimeDiff: " + alarmTimeDiff, reminderfox.consts.LOG_LEVEL_SUPER_FINE); //TODO

                                // ensure that the current stored alarm time is the same as the alarm time this function was called with.
                                // This check is in case the user changed the alarm time after the first timeout had been issued.  You only
                                // want to show one alert at the last time the user selected
                                if (alarmTimeDiff >= -60000 && alarmTimeDiff <= 60000) {

                                    if (!snooze && missedAlarm == "false") { // don't check, if this is a past alarm (times won't match because it was set to go off not at current time, but a previous time)
                                        // secondary check - in case of FireFox setTimeout Bug;
                                        // check if the current time is about  when the alarm was set for
                                        var currentSystemTime = new Date().getTime();
                                        var alarmSystemTimeDiff = alarmTime - currentSystemTime;
                                        if (alarmSystemTimeDiff < -60000 || alarmSystemTimeDiff > 60000) {
//ALARM											reminderfox.core.logMessageLevel("alarm: system time diff failed check; returning: " + alarmSystemTimeDiff, reminderfox.consts.LOG_LEVEL_SUPER_FINE); //TODO
                                            continue;
                                        }
                                    }

                                    // Mozilla bug: it seems that if you open two alarm dialog windows at the same time, only one of the loadAlarm() functions gets called
                                    // from the new window.  So we introduce a small second delay between opening each alarm - so if you have several alarms set to go off
                                    // at the same time, you will always see them properly and not get a blank window in one of them
                                    var time = new Date().getTime();
//ALARM								reminderfox.core.logMessageLevel( "alarm: time: " + time + "; lastalarmtime" +reminderfox.overlay._lastAlarmTime + " ; " +  reminderfox.overlay.getAlarmDelay()    , reminderfox.consts.LOG_LEVEL_SUPER_FINE);  //TODO

                                    alarmInfo.alarmRecentReminder = reminderOrTodo;

                                    if (alarmInfos.length > 1   // if there's multiple reminders; continue in here.  Only if there is 1 reminder would we want to set the delay
                                        || (reminderfox.overlay._lastAlarmTime == null
                                        || (time > (reminderfox.overlay._lastAlarmTime + reminderfox.overlay.getAlarmDelay()) ) ) ) {
                                        reminderfox.overlay._lastAlarmTime = time;

                                        alarmArray[alarmArray.length] = alarmInfo;
                                    }
                                    else {
//ALARM										reminderfox.core.logMessageLevel( "alarm: Setting time out..."   , reminderfox.consts.LOG_LEVEL_SUPER_FINE);  //TODO

                                        oldestWindow.setTimeout(oldestWindow.reminderfox.overlay.showMissedAlarmsSnooze2,
                                            reminderfox.overlay.getAlarmDelay(),
                                            alarmInfo.alarmSnoozeTime,
                                            alarmInfo.alarmRecentReminder.id,
                                            alarmInfo.alarmListName,
                                            alarmInfo.alarmTimeString ,
                                            alarmInfo.alarmIsReminder,
                                            alarmInfo.alarmIsTodo,
                                            alarmInfo.alarmAlarmMissed,
                                            alarmInfo.reminderTime,
                                            alarmInfo.reminderTimeDifference,
                                            alarmInfo.recentReminderOrTodo );
                                    }

                                    break;
                                }
                            }
                        }
                    }
                }
                else {
                }
            }
        }
    }
    //alert( "IN ARRAY: " + alarmArray[0].alarmRecentReminder.summary + " :" + alarmArray[0].alarmRecentReminder.originalDate);

    reminderfox.overlay.openAlarmWindow( alarmArray, true );
}


reminderfox.overlay.openAlarmWindow= function(alarmArray, ignoreCheck) {
var msg = "RmFX  .overlay.openAlarmWindow  "
reminderfox.core.logMessageLevel (msg, reminderfox.consts.LOG_LEVEL_SUPER_FINE);

	var calDAVaccounts = reminderfox.core.getReminderEvents();

    var showAlarmsInTabs= reminderfox.core.getPreferenceValue( reminderfox.consts.ALARMS_SHOW_IN_TABS, true);

    // go through all options
    if (alarmArray != null && alarmArray.length > 0 ) {
        var topWindow = reminderfox.util.getWindow("window:reminderFoxAlarmDialog");

        var time = new Date().getTime();

        if (alarmArray.length == 1 && alarmArray[0].quickAlarmText != null ) {   //qalarm and only 1
            var q_alarm = reminderfox.core.getQuickAlarm( alarmArray[0].quickAlarmText );
            //alert( "doing quick alarm check: " + q_alarm.text + "; time = " + time + " ; quick alarm time: " + q_alarm.alarmTime ); dump: remove  dump(): nls

            if (q_alarm != null && ((time  + 10000) <   q_alarm.alarmTime ) ) {    // check q_alarm.alarmTime
                // check if it's snooze time has yet occurred;
                // there is a bug where sometimes snoozing a reminder will automatically call the
                // setTimeout function and come back in here;  if we check the snooze time and it
                // is in the future (+/- 2 seconds or so) then just ignore it

                // let's set a new timeout and try again
                var windowEnumerator =  reminderfox.core.getWindowEnumerator();
                if (windowEnumerator.hasMoreElements()) {    // only process alarms  >  1 hour     //XXX  ???????????
                    var oldestWindow = windowEnumerator.getNext();
                    // alert( "A3! quick alarm: " +  alarmArray[0].quickAlarmText + " --- "  + (q_alarm.alarmTime + 2000)  + " -- " + (q_alarm.alarmTime - time) + " -- " + (q_alarm.alarmTime - time + 2000 ));

                    // if snooze greater than an hour; just let hourly process do it
                    if (((q_alarm.alarmTime - time) + 2000)  > 3600000 ) {
                        return;
                    }

                    oldestWindow.setTimeout(oldestWindow.reminderfox.overlay.showQuickAlarm,
                            (q_alarm.alarmTime - time) + 2000,
                        alarmArray[0].quickAlarmText,
                        alarmArray[0].alarmSnoozeTime );

                    return;
                }  // only process alarms  >  1 hour
            }  //  check q_alarm.alarmTime
        }  //qalarm and only 1
			//reminderfox.core.logMessageLevel( msg, reminderfox.consts.LOG_LEVEL_DEBUG);

        if (ignoreCheck || alarmArray.length > 1 ||  // if there's multiple reminders; continue in here.  Only if there is 1 reminder would we want to set the delay
               (reminderfox.overlay._lastAlarmTime == null ||
               (time > (reminderfox.overlay._lastAlarmTime + reminderfox.overlay.getAlarmDelay()) )) ) {  // ##1

            reminderfox.overlay._lastAlarmTime = time;

            if (showAlarmsInTabs && topWindow) {  // ##2   try
                try {
                    // close and reopen
                    var selectedIndex = topWindow.getRF_alarmIndex();
                    var existingAlarmArray = topWindow.getRF_AlarmArray();
                    // see if this quick alarm is already being shown...
                    for (var j = alarmArray.length-1; j >= 0; j-- ) {
                        if (alarmArray[j].quickAlarmText != null ) {
                            for (var k = 0; k < existingAlarmArray.length; k++ ) {
                                if (existingAlarmArray[k].quickAlarmText != null &&
                                    existingAlarmArray[k].quickAlarmText == alarmArray[j].quickAlarmText ) {
                                    // alarm already exists; remove from current list
                                    reminderfox.core.removeFromArray(alarmArray, j);
                                    break;
                                }
                            }
                        }
                        // see if this alarm is already being shown
                        else if (alarmArray[j].alarmRecentReminder != null ) {
                            for (var k = 0; k < existingAlarmArray.length; k++ ) {
                                if (existingAlarmArray[k].alarmRecentReminder != null &&
                                    existingAlarmArray[k].alarmRecentReminder.id == alarmArray[j].alarmRecentReminder.id ) {
                                    // alarm already exists; remove from current list

                                    // if this is a single repeating alarm that is going off, we want to alarm
                                    // with the latest version
                                    // (example: a daily "Take Pill" reminder - you want the alarm to go off every
                                    // day (re-sound the alarm), even if that reminder is already in the list
                                    if (ignoreCheck && alarmArray.length == 1) {
                                        // remove from old list
                                        reminderfox.core.removeFromArray(existingAlarmArray, k);
                                    }
                                    else {
                                        reminderfox.core.removeFromArray(alarmArray, j);
                                    }
                                    // see if the alarm is an old version...  if this is new alarm, let's reshow it
                                    break;
                                }
                                // dump() could add a check for alarm ack here?  need to know the current alarm time and last ack?

                            }
                        }
                    }
                    if (alarmArray.length > 0 ) {
                        // close/reopen
                        topWindow.reminderFox_reopeningWindow = true;
                        topWindow.close();
                        for (var j = 0; j < alarmArray.length; j++ ) {
                            existingAlarmArray[existingAlarmArray.length] = alarmArray[j];
                        }

                        var newOptions = {  alarmInfos: existingAlarmArray, showMissedAlarmsSnoozeCallback : reminderfox.overlay.showMissedAlarms,
                        	calDAVaccounts : calDAVaccounts}

                        window.openDialog("chrome://reminderfox/content/alarms/alarmDialog.xul",
                            "alarmOptionsDialog", "chrome,resizable,dialog=no", newOptions);
                        topWindow = reminderfox.util.getWindow("window:reminderFoxAlarmDialog");
                        if (topWindow != null ) {
                            topWindow.focus();
                        }
                    }
                }
                catch (e ) {
                }
            }   // ##2  try
            else {
                if (!showAlarmsInTabs ) {
                    // go through all alarms and open in separate windows
                    for (var i = 0; i < alarmArray.length; i++ ) {
                        var singleArray = new Array();
                        singleArray[0] = alarmArray[i];

                        var newOptions = {  alarmInfos: singleArray, showMissedAlarmsSnoozeCallback : reminderfox.overlay.showMissedAlarmsSnooze,
                        	calDAVaccounts : calDAVaccounts}

                        window.openDialog("chrome://reminderfox/content/alarms/alarmDialog.xul",
                                "alarmOptionsDialog"+new Date().getTime() + i, "chrome,resizable,dialog=no", newOptions);
                        topWindow = reminderfox.util.getWindow("window:reminderFoxAlarmDialog");
                        if (topWindow != null ) {
                            topWindow.focus();
                        }
                    }
                }
                else {

                    var newOptions = {  alarmInfos: alarmArray, showMissedAlarmsSnoozeCallback : reminderfox.overlay.showMissedAlarmsSnooze,
                     	calDAVaccounts : calDAVaccounts}

                    //we don't use alarmOptionsDialog + date =- sometimes showing a separate window
                    window.openDialog("chrome://reminderfox/content/alarms/alarmDialog.xul",
                        "alarmOptionsDialog", "chrome,resizable,dialog=no", newOptions);
                    topWindow = reminderfox.util.getWindow("window:reminderFoxAlarmDialog");
                    if (topWindow != null ) {
                        topWindow.focus();
                    }
                }
            }
        }     // ##1
        else {
            var windowEnumerator =  reminderfox.core.getWindowEnumerator();
            if (windowEnumerator.hasMoreElements()) {
                var oldestWindow = windowEnumerator.getNext();
                // sometimes called when 2 alarms are snoozed for same time immediately

                var alarmInfo = alarmArray[0];
                //reminderfox.core.logMessageLevel( "alarm: Setting time out..." + alarmInfo.quickAlarmText   , reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO
                if (alarmInfo.quickAlarmText != null ) {

                    // debug:
                    var q_alarm = reminderfox.core.getQuickAlarm( alarmArray[0].quickAlarmText );

                    var text = alarmInfo.quickAlarmText;
                    var sTime = alarmInfo.alarmSnoozeTime;
                    oldestWindow.setTimeout(function() { oldestWindow.reminderfox.overlay.showQuickAlarm(text,sTime) } , reminderfox.overlay.getAlarmDelay());
                }
                else {

                    /// dump:  - maybe here we should do a re-processing...

                    //
                    var st = alarmInfo.alarmSnoozeTime;
                    var id1 = alarmInfo.alarmCurrentAlarmId;

                    // dump test this
                    var nuller = null;
                    if (alarmInfo.alarmCurrentAlarmId != null )
                    nuller = alarmInfo.alarmCurrentAlarmId;

                    oldestWindow.setTimeout(oldestWindow.reminderfox.overlay.showMissedAlarmsSnooze2,
                        reminderfox.overlay.getAlarmDelay(),
                        st,
                        id1,
                        alarmInfo.alarmListName,
                        alarmInfo.alarmTimeString ,
                        alarmInfo.alarmIsReminder,
                        alarmInfo.alarmIsTodo,
                        alarmInfo.alarmAlarmMissed,
                        alarmInfo.reminderTime,
                        alarmInfo.reminderTimeDifference,
                        alarmArray.recentReminderOrTodo );
                }
            }
        }
    }  // go through all options
}


reminderfox.overlay.showQuickAlarm= function( lastAlarmText, lastSnoozeTime, lastQuickAlarmNotes) {
    // make sure quick alarm still exists and wasn't removed
    var q_alarm = reminderfox.core.getQuickAlarm( lastAlarmText );
    if (q_alarm != null ) {
        var newAlarm = {
            quickAlarmText : lastAlarmText,
            quickAlarmNotes : lastQuickAlarmNotes,
            alarmTabPanel: null,
            alarmRecentReminder: null,
            alarmSnoozeTime: lastSnoozeTime,
            alarmListName: null,
            alarmTimeString: null,
            alarmIsReminder: false,
            alarmIsTodo: false,
            alarmAlarmMissed: false,
            synccallback: reminderfox.core.networkSynchronizeCallback,		//.overlay.showQuickAlarm
            clearLabelCallback: reminderfox.overlay.clearMailLabelCallback,
            alarmCurrentAlarmId: null,
            reminderTime: null,
            reminderTimeDifference : null
        };

        var alarmArray = new Array();
        alarmArray[0]= newAlarm;
        reminderfox.overlay.openAlarmWindow(alarmArray);
    }
    else {
//ALARM		reminderfox.core.logMessageLevel( new Date()  + "INSIDE ShowQuickAlarm: Removed" , reminderfox.consts.LOG_LEVEL_SUPER_FINE);
    }
}


reminderfox.overlay.resumeAlerts= function( lastSnoozeTime) {
    var alertType = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_ALL);

    // if it's marked as suspended, change to original value
    var suspendedIndex = alertType.indexOf(reminderfox.consts.ALERT_SUSPEND);
    if (suspendedIndex != -1) {
        alertType = alertType.substring(suspendedIndex + reminderfox.consts.ALERT_SUSPEND.length);
        reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_ENABLE, alertType);
    }

    // call this to update the icon status (greys out status text when alerts are suspended)
    reminderfox.overlay.updateRemindersInWindow();


    if (reminderfox.overlay.lastSuspendAlertTimeoutId != null ) {
        window.clearTimeout(reminderfox.overlay.lastSuspendAlertTimeoutId);
    }
}


// Launches the 'edit reminder' dialog, fills in Reminders list
reminderfox.overlay.openAboutReminderFoxDialog= function() {
    window.openDialog("chrome://reminderfox/content/about.xul", "about", "chrome,centerscreen");
}


reminderfox.overlay.processRecentReminders= function(processQuickAlarms){
var msg = ("RmFX  overlay.processRecentReminders    " )
//reminderfox.core.logMessageLevel(msg, reminderfox.consts.LOG_LEVEL_SUPER_FINE);

    var changed = false;
    var alarmInfos = new Array();
    var NUM_OF_PAST_DAYS_TO_PROCESS = 90; // needs to be less than weekly reminder so Completed mark isn't cleared...
    // the real fix is to check if the reminder you are clearing occurs today as well; if so don't clear the mark
    // Update 11/24/09: I don't think this is true anymore; we don't clear completed mark - we set last completed date;
    // changing to look in the past 90(?) days for alarms, RUC, etc; that should be long enough
    var NUM_OF_DAYS_AHEAD_FOR_ALARM = 15; // let's look a couple weeks ahead in case an alarm is set to go off
    var i, j;

    var alarmsEnabled = true;
    var alertType = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_ALL);
    if (alertType.indexOf(reminderfox.consts.ALERT_SUSPEND) != -1) {
        alarmsEnabled = false;
    }


    var reminderEvents = reminderfox.core.getReminderEvents();
    var reminder;

    // set dates to search during the last week only
    var todaysDate = new Date();
    var startDate = new Date();
    var endDateAlarmCheck = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    endDateAlarmCheck.setDate(startDate.getDate() + NUM_OF_DAYS_AHEAD_FOR_ALARM);
    startDate.setDate(startDate.getDate() - NUM_OF_PAST_DAYS_TO_PROCESS);

    for (i = 0; i < reminderEvents.length; i++) {
        reminder = reminderEvents[i];

        // pass in false to not limit repeating instances returned; otherwise,
        // we only get first 8 weekly/daily instances - this causes an issue if we are looking back
        // 3 months behind; we would not get the current instances for alarms, etc
        var allReminders = reminderfox.core.getAllRemindersInDateRange(reminder, startDate, endDateAlarmCheck, false);
        if (allReminders.length == 0) {
            var dateCompare = reminderfox.core.compareDates(reminder.date, todaysDate);
            if (reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED && dateCompare == -1) {
                allReminders = new Array();
                allReminders[0] = reminder;
            }
        }


        for (j = 0; j < allReminders.length; j++) {
            var recentReminder = allReminders[j];
            var dateCompare = reminderfox.core.compareDates(recentReminder.date, todaysDate);
            // if a reminder is set to Remind Until Complete (and it's already happened) set to today's date to check for alarm
            if (recentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED && dateCompare == -1) {
                recentReminder = reminderfox.core.cloneReminderFoxEvent(recentReminder);
                recentReminder.originalDate = recentReminder.date;
                recentReminder.date = new Date(todaysDate.getFullYear(), todaysDate.getMonth(), todaysDate.getDate(), recentReminder.date.getHours(), recentReminder.date.getMinutes());
                //alert( "SETTING ORIG DATE:" + recentReminder.originalDate );
                dateCompare = 0; // set as today's date
            }
//ALARM			reminderfox.core.logMessageLevel("alarm: recent alarm" + j + ": " + recentReminder.summary + " -- " + recentReminder.alarm + " -- " + alarmsEnabled, reminderfox.consts.LOG_LEVEL_SUPER_FINE); //TODO

            // check the alert for future and past reminders (for missed alerts)
            if (recentReminder.alarm != null && alarmsEnabled && !reminderfox.core.isCompletedForDate(recentReminder, recentReminder.date)) {
                var missedAlarmInfo = reminderfox.overlay.processAlarm(recentReminder, true, null);  // soo here we might have an old one
                // showing in alarm, and then set a new one to go off the next hour...  how do I stop that?
                // when showing alarms, need to check existing list if it's the same reminder ID?  and don't show new one?
                // or remove old one...
                if (missedAlarmInfo != null) {
                    missedAlarmInfo.originalDate = recentReminder.originalDate;

                    alarmInfos[alarmInfos.length] = missedAlarmInfo;
                }
            }

            // if the reminder happened in the past, we want to see if it should be move to RemindUntilComplete
            if (dateCompare == -1) {
                // check for any RemindUntilComplete - if found, set it to be shown in today's list of reminders
                if (recentReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED) {
                    if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_ONETIME || recentReminder.lastModified != null) {
                        var modifiedDate = reminderfox.date.getDTZfromICSstring(recentReminder.lastModified);
                        // if you last modified this on or  before the reminder date, then set it as RUC;
                        // otherwise if you've modified this after the reminder date (such as setting it complete)
                        // then leave it alone and don't set it as RUC (unless it's a one-timer... then we'll just move it to RUC
                        // since that is probably what they intended)
                        if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_ONETIME ||
                            (reminderfox.core.compareDates(modifiedDate, recentReminder.date) != 1 &&
                                !reminderfox.core.isCompletedForDate(recentReminder, recentReminder.date))) { // don't change if it's Complete
                            reminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED;
                            changed = true;
                            reminder.lastModified = reminderfox.date.objDTtoStringICS(todaysDate);
                        }
                    }
                    else {
                        reminder.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED;
                        changed = true;
                        reminder.lastModified = reminderfox.date.objDTtoStringICS(todaysDate);
                    }
                }
            }
        }
    }


    // now process todos
    var allTodosHash = reminderfox.core.getAllTodosInDateRange(startDate, endDateAlarmCheck);
    for (var n in allTodosHash) {
        var allTodos = allTodosHash[n];
        for (i = 0; i < allTodos.length; i++) {
            var todo = allTodos[i];
            // check the alert for future and past reminders (for missed alerts)
            if (todo.alarm != null && alarmsEnabled && !reminderfox.core.isCompletedForDate(todo, todo.date)) {
                //				var snoozeCleared = reminderfox.overlay.processAlarm( todo, false, n);
                //				if (snoozeCleared ) {
                //					changed = true;
                //				}
                var missedAlarmInfo = reminderfox.overlay.processAlarm(todo, false, n);
                if (missedAlarmInfo != null) {
                    alarmInfos[alarmInfos.length] = missedAlarmInfo;
                }
            }

        }
    }
    if (processQuickAlarms ) {
        var quickAlarmArray = reminderfox.overlay.processQuickAlarms(true);
        for (var q = 0; q < quickAlarmArray.length; q++ ) {
            alarmInfos[alarmInfos.length] = quickAlarmArray[q];
        }
    }

    // for any alarms:
    if (alarmInfos != null && alarmInfos.length > 0) {
        reminderfox.overlay.showMissedAlarms(alarmInfos);
    }

    return changed;
}


reminderfox.overlay.createToolTip= function(todayRemindersArr, upcomingRemindersArr){
    var j;
    var currentNode;
    var todayDescription;
    var upcomingDescription;
    var spacer;
    var todoDescription;

    try {
        var hideGayPaw = reminderfox.core.getPreferenceValue(reminderfox.consts.HIDE_FOX_PAW, false);
        if (hideGayPaw) {
            document.getElementById('foxpaw').setAttribute("hidden", "true");
        }
    } catch (ex) {}

/*------------
    // we'll set the icon depending on if there's current, upcoming,
    // or no reminders
    var icon = document.getElementById('reminderFox-statusLabel');
    icon.setAttribute("status", "noReminders");
-------------- */

    var todosArr = reminderfox.overlay.getVisibleTodos();

    // clear old tooltips
    var todayBox = document.getElementById("reminderfox-todaysRemindersBox");
    if (todayBox != null) {
        while (todayBox.hasChildNodes()) {
            todayBox.removeChild(todayBox.firstChild);
        }
    }

    var upcomingBox = document.getElementById("reminderfox-upcomingRemindersBox");
    if (upcomingBox != null) {
        while (upcomingBox.hasChildNodes()) {
            upcomingBox.removeChild(upcomingBox.firstChild);
        }
    }

    var todoBox = document.getElementById("reminderfox-todosBox");
    if (todoBox != null) {
        while (todoBox.hasChildNodes()) {
            todoBox.removeChild(todoBox.firstChild);
        }
    }


    // remove old tooltip box
    var tooltipChildren = document.getElementById("reminderfox-todosTooltip");
    if (tooltipChildren != null) {
        while (tooltipChildren.hasChildNodes()) {
            tooltipChildren.removeChild(tooltipChildren.firstChild);
        }
    }

    // remove old reminders box
    var tooltipChildrenReminders = document.getElementById("reminderfox-tooltipChildrenReminders");
    if (tooltipChildrenReminders != null) {
        while (tooltipChildrenReminders.hasChildNodes()) {
            tooltipChildrenReminders.removeChild(tooltipChildrenReminders.firstChild);
        }
    }
    if (tooltipChildrenReminders == null) {
        reminderfox.util.Logger('ALERT', 'tooltipChildrenReminders == null');		//XXX  trace to understand the err
    }
    var showReminders = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_REMINDERS_IN_TOOLTIP, reminderfox.consts.SHOW_REMINDERS_IN_TOOLTIP_DEFAULT);
    var showTooltips = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_TODOS_IN_TOOLTIP, reminderfox.consts.SHOW_TODOS_IN_TOOLTIP_DEFAULT);

    var tooltipWrapLength;

    if (todosArr != null && showReminders && showTooltips) {
        tooltipWrapLength = reminderfox.overlay.consts.TOOLTIP_WITH_TODOS_LINE_LENGTH;
    }
    else {
        tooltipWrapLength = reminderfox.overlay.consts.TOOLTIP_LINE_LENGTH;
    }

    if (showReminders && tooltipChildrenReminders != null ) { // sometimes intermittently the tooltip tooltipChildrenReminders is null
        todayDescription = document.createElement("description");
        todayDescription.setAttribute("id", "reminderfox-todayRemindersDescription");
        todayDescription.setAttribute("value", reminderfox.string("rf.main.tooltip.todaysReminders.title"));
        todayDescription.setAttribute("style", "font-weight:bold;");
        tooltipChildrenReminders.appendChild(todayDescription);

        var todayVbox = document.createElement("vbox");
        todayVbox.setAttribute("id", "reminderfox-todaysRemindersBox");
        tooltipChildrenReminders.appendChild(todayVbox);

        spacer = document.createElement("spacer");
        spacer.setAttribute("id", "reminderfox-reminderSpacer");
        spacer.setAttribute("height", "4px");
        tooltipChildrenReminders.appendChild(spacer);

        upcomingDescription = document.createElement("description");
        upcomingDescription.setAttribute("id", "reminderfox-upcomingRemindersDescription");
        upcomingDescription.setAttribute("value", reminderfox.string("rf.main.tooltip.upcomingReminders.title"));
        upcomingDescription.setAttribute("style", "font-weight:bold;");
        tooltipChildrenReminders.appendChild(upcomingDescription);

        var upcomingVbox = document.createElement("vbox");
        upcomingVbox.setAttribute("id", "reminderfox-upcomingRemindersBox");
        tooltipChildrenReminders.appendChild(upcomingVbox);

        reminderfox.overlay.populateTodayToolTip(todayRemindersArr, tooltipWrapLength);
        reminderfox.overlay.populateUpcomingToolTip(upcomingRemindersArr, tooltipWrapLength);
    }


    if (showTooltips && todosArr != null && tooltipChildrenReminders != null ) {  // sometimes intermittently the tooltip tooltipChildrenReminders is null
        // make sure ToDo's are at the start of the list
        var todos = todosArr[reminderfox.consts.DEFAULT_TODOS_CATEGORY];
        if (todos != null && todos.length > 0) {
            reminderfox.overlay.populateTodoToolTip(todos, (tooltipWrapLength - 13), reminderfox.string("rf.main.tooltip.todos.title"));
        }

        // iterate over all of the ToDo lists in the order that the user defined in the preferences
        var todoLists = reminderfox.core.getPreferenceValue(reminderfox.consts.TODO_LISTS, "");
        if (todoLists != null && todoLists.length > 0) {
            var subscriptions = reminderfox.core.getSubscriptions();
            var todoListsArray = todoLists.split(",");
            for (var j = 0; j < todoListsArray.length; j++) {
                var n = todoListsArray[j]; // name
                var todos = todosArr[n];
                if (todos != null && todos.length > 0) {
                    if (subscriptions[n] == null) { // ignore subscriptions
                        reminderfox.overlay.populateTodoToolTip(todos, (tooltipWrapLength - 13), n);
                    }
                }
            }
        }
    }
}



reminderfox.overlay.populateTodayToolTip= function(remindersArr, tooltipWrapLength){
    var lblparent = document.getElementById("reminderfox-todaysRemindersBox");
    // Get the template from the user preference
    var template = reminderfox.core.getPreferenceValue(reminderfox.consts.TODAYS_REMINDERS_LABEL, reminderfox.consts.TODAYS_REMINDERS_LABEL_DEFAULT);
    reminderfox.overlay.populateToolTip(remindersArr, tooltipWrapLength, lblparent, template);
}


reminderfox.overlay.populateUpcomingToolTip= function(remindersArr, tooltipWrapLength){
    var lblparent = document.getElementById("reminderfox-upcomingRemindersBox");
    // Get the template from the user preference
    var template = reminderfox.core.getPreferenceValue(reminderfox.consts.UPCOMING_REMINDERS_LABEL,reminderfox.consts.UPCOMING_REMINDERS_LABEL_DEFAULT);
    reminderfox.overlay.populateToolTip(remindersArr, tooltipWrapLength, lblparent, template);
}


reminderfox.overlay.populateToolTip= function(remindersArr, tooltipWrapLength, lblparent, template){
    var j;
    var remLabel;
    if (remindersArr.length > 0) {
        var lineWrappedIndent = 5;
        for (var i = 0; i < remindersArr.length; i++) {
            var startIndex = 0;
            var completeRemainingString = reminderfox.overlay.populateReminderLabel(remindersArr[i], template, remindersArr[i].date);
            var stringSeparatedByNewlines = completeRemainingString.split("\\n");
            for (var z = 0; z < stringSeparatedByNewlines.length; z++) {
                var remainingString = stringSeparatedByNewlines[z];
                var afterFirst = false;
                while (remainingString.length > tooltipWrapLength) {
                    // go back to last whitespace
                    var lastIndex = remainingString.lastIndexOf(' ', tooltipWrapLength);
                    var forceLineBreak = false;
                    if (lastIndex == -1) {
                        forceLineBreak = true;
                        lastIndex = tooltipWrapLength + 1;
                    }
                    if (lastIndex != -1) {
                        var curStr = remainingString.substring(0, lastIndex);
                        // after the first line, for any extra lines we will indent some.This makes
                        // the entry look nice when wrapping to the following lines
                        if (afterFirst) {
                            j = 0;
                            while (j < lineWrappedIndent) {
                                curStr = " " + curStr;
                                j++;
                            }
                        }

                        remLabel = document.createElement("description");
                        remLabel.setAttribute("value", curStr);
                        if (remindersArr[i].priority == reminderfox.consts.PRIORITY_IMPORTANT) {
                            remLabel.setAttribute("style", "color: red;");
                        }
                        else {
                            remLabel.removeAttribute("style");
                        }
                        lblparent.appendChild(remLabel);
                        afterFirst = true;
                    }

                    if (forceLineBreak) {
                        startIndex = lastIndex;
                    }
                    else {
                        startIndex = lastIndex + 1;
                    }
                    remainingString = remainingString.substring(startIndex);
                }
                if (afterFirst) {
                    j = 0;
                    while (j < lineWrappedIndent) {
                        remainingString = " " + remainingString;
                        j++;
                    }
                }
                reminderfox.overlay.addItemToTooltip(remindersArr[i], true, remainingString, lblparent);
            }
        }
    }
    else {
        var noneLabel = document.createElement("description");
        noneLabel.setAttribute("value", reminderfox.string("rf.main.tooltip.reminders.none"));
        lblparent.appendChild(noneLabel);
    }
}


reminderfox.overlay.addItemToTooltip= function(reminderOrTodo, isReminder, labelText, parentElement){
    var hasNotes = reminderOrTodo.notes != null && reminderOrTodo.notes != "";
    var isRUC = false;
    var remLabel;
    if (isReminder) {
        isRUC = reminderOrTodo.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED;
    }
    if (!hasNotes && !isRUC) { // no image needed
        remLabel = document.createElement("description");
        remLabel.setAttribute("value", labelText);
        if (reminderOrTodo.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
            remLabel.setAttribute("style", "color: red;");
        }
        else {
            remLabel.removeAttribute("style");
        }
        parentElement.appendChild(remLabel);
    }
    else {
        // create image box
        var hbox = document.createElement("hbox");
        remLabel = document.createElement("description");
        var image1;
        var vbox = document.createElement("vbox");
        var spacer = document.createElement("spacer");
        spacer.setAttribute("flex", "1")
        vbox.appendChild(spacer);

        if (!(isRUC && hasNotes)) {
            // if only 1 image  (remindUntilCompleted / notes )
            if (hasNotes) {
                image1 = document.createElement("image");
                image1.setAttribute("src", reminderfox.consts.NOTES_IMAGE);
                vbox.appendChild(image1);
            }
            else {
                image1 = document.createElement("image");
                image1.setAttribute("src", reminderfox.consts.REMIND_UNTIL_COMPLETED_IMAGE);
                vbox.appendChild(image1);
            }
        }
        else {
            // if multi image
            var imagehbox = document.createElement("hbox");
            image1 = document.createElement("image");
            image1.setAttribute("src", reminderfox.consts.NOTES_IMAGE);
            imagehbox.appendChild(image1);

            var image2 = document.createElement("image");
            image2.setAttribute("src", reminderfox.consts.REMIND_UNTIL_COMPLETED_IMAGE);
            imagehbox.appendChild(image2);

            vbox.appendChild(imagehbox);
        }


        // end multi
        vbox.appendChild(spacer);

        remLabel.setAttribute("value", labelText);

        if (reminderOrTodo.priority == reminderfox.consts.PRIORITY_IMPORTANT) {
            remLabel.setAttribute("style", "color: red;");
        }
        else {
            remLabel.removeAttribute("style");
        }
        hbox.appendChild(remLabel);
        hbox.appendChild(vbox);

        parentElement.appendChild(hbox);
    }
}


reminderfox.overlay.populateTodoToolTip= function(todosArr, tooltipWrapLength, listName){
    var containerVbox = document.getElementById("reminderfox-todosTooltip");

    var tooltipVbox = document.createElement("vbox");
    var todoDescription = document.createElement("description");
    todoDescription.setAttribute("id", "todoDescription");
    todoDescription.setAttribute("value", listName);
    todoDescription.setAttribute("style", "font-weight:bold;");
    tooltipVbox.appendChild(todoDescription);

    var todosBox = document.createElement("vbox");
    todosBox.setAttribute("id", "todosBox");
    tooltipVbox.appendChild(todosBox);

    var spacer = document.createElement("spacer");
    spacer.setAttribute("height", "4px");
    tooltipVbox.appendChild(spacer);

    containerVbox.appendChild(tooltipVbox);

    var j;
    var remLabel;
    var template = reminderfox.core.getPreferenceValue(reminderfox.consts.UPCOMING_REMINDERS_LABEL, reminderfox.consts.UPCOMING_REMINDERS_LABEL_DEFAULT);
    if (todosArr.length > 0) {
        for (var i = 0; i < todosArr.length; i++) {
            var lineWrappedIndent = 5;
            var startIndex = 0;
            var completeRemainingString = null;
            if (todosArr[i].date != null) {
                completeRemainingString = reminderfox.overlay.populateReminderLabel(todosArr[i], template, todosArr[i].date);
            }
            else {
                completeRemainingString = todosArr[i].summary;
            }

            var stringSeparatedByNewlines = completeRemainingString.split("\\n");
            for (var z = 0; z < stringSeparatedByNewlines.length; z++) {
                var remainingString = stringSeparatedByNewlines[z];
                var afterFirst = false;
                while (remainingString.length > tooltipWrapLength) {
                    // go back to last whitespace
                    var lastIndex = remainingString.lastIndexOf(' ', tooltipWrapLength);
                    var forceLineBreak = false;
                    if (lastIndex == -1) {
                        forceLineBreak = true;
                        lastIndex = tooltipWrapLength + 1;
                    }
                    if (lastIndex != -1) {
                        var curStr = remainingString.substring(0, lastIndex);
                        // after the first line, for any extra lines we will indent some.  This makes
                        // the entry look nice when wrapping to the following lines
                        if (afterFirst) {
                            j = 0;
                            while (j < lineWrappedIndent) {
                                curStr = " " + curStr;
                                j++;
                            }
                        }

                        remLabel = document.createElement("description");
                        remLabel.setAttribute("value", curStr);
                        if (todosArr[i].priority == reminderfox.consts.PRIORITY_IMPORTANT) {
                            remLabel.setAttribute("style", "color: red;");
                        }
                        else {
                            remLabel.removeAttribute("style");
                        }
                        todosBox.appendChild(remLabel);
                        afterFirst = true;
                    }

                    if (forceLineBreak) {
                        startIndex = lastIndex;
                    }
                    else {
                        startIndex = lastIndex + 1;
                    }
                    remainingString = remainingString.substring(startIndex);
                }
                if (afterFirst) {
                    j = 0;
                    while (j < lineWrappedIndent) {
                        remainingString = " " + remainingString;
                        j++;
                    }
                }
                reminderfox.overlay.addItemToTooltip(todosArr[i], false, remainingString, todosBox);
            }
        }
    }
    else {
        var noneLabel = document.createElement("description");
        noneLabel.setAttribute("value", reminderfox.string("rf.main.tooltip.reminders.none"));
        todosBox.appendChild(noneLabel);
    }
}



reminderfox.overlay.getTodaysAndUpcomingReminders= function(){
    var i, j, x;
    var reminder, todayReminder, upcomingReminder, allReminders;
    var endIndex, index;
    var reminderEvents = reminderfox.core.getReminderEvents();
    var todaysReminders = new Array();
    var upcomingReminders = new Array();

    var upcomingReminderDays = reminderfox.core.getPreferenceValue(reminderfox.consts.UPCOMING_REMINDER_DAYS_PREF, 15);
    if (upcomingReminderDays > 364) {
        upcomingReminderDays = 364;
    }
    var todaysDate = new Date();
    var REPEAT_UPCOMING_OCCURRENCES = reminderfox.core.getPreferenceValue(reminderfox.consts.REPEAT_UPCOMING_OCCURRENCES, -1);

    var endDate = new Date(todaysDate.getFullYear(), todaysDate.getMonth(), todaysDate.getDate());
    endDate.setDate(endDate.getDate() + upcomingReminderDays);
    for (i = 0; i < reminderEvents.length; i++) {
        todayReminder = null;
        reminder = reminderEvents[i];

        // handle reminders marked Remind Until Complete as today reminders
        if (reminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
            todayReminder = reminderfox.core.cloneReminderFoxEvent(reminder);
            todayReminder.date = new Date(todaysDate.getFullYear(), todaysDate.getMonth(), todaysDate.getDate(), todayReminder.date.getHours(), todayReminder.date.getMinutes());

            if (!reminderfox.core.isCompletedForDate(todayReminder, todayReminder.date)) {
                todayReminder = reminderfox.core.processReminderDescription(todayReminder, todayReminder.date.getFullYear(), false);
                index = reminderfox.core.getSortNewUpcomingReminderIndex(todaysReminders, todayReminder);
                reminderfox.core.insertIntoArray(todaysReminders, todayReminder, index);
            }
        }


        // for performance reasons, sort all the yearly items first, which should generally be in order; then do the repeating ones afterwards,
        // as they will need to be inserted all over the arrays
        if (reminder.recurrence.type == reminderfox.consts.RECURRENCE_YEARLY ||
            reminder.recurrence.type == reminderfox.consts.RECURRENCE_ONETIME) {
            allReminders = reminderfox.core.getAllRemindersInDateRange(reminder, todaysDate, endDate, true);
            endIndex = 0;
            if (allReminders.length > 0) {
                endIndex = allReminders.length;
            }

            // have to have a check for -1 --> show all occurrences
            if (allReminders.length > 0) {
                if (!(allReminders.length == 1 && REPEAT_UPCOMING_OCCURRENCES >= 1)) {
                    for (x = 0; x < allReminders.length; x++) {
                        if (reminderfox.core.compareDates(allReminders[x].date, todaysDate) != -1) {
                            break;
                        }
                    }
                    if (REPEAT_UPCOMING_OCCURRENCES == -1) {
                        endIndex = allReminders.length;
                    }
                    else {
                        endIndex = x + REPEAT_UPCOMING_OCCURRENCES;
                        if (endIndex > allReminders.length) {
                            endIndex = allReminders.length;
                        }
                    }
                }
            }

            for (j = 0; j < endIndex; j++) {
                upcomingReminder = allReminders[j];

                if (j == 0) { // special checking for first reminder
                    if (reminderfox.core.isCompletedForDate(upcomingReminder, upcomingReminder.date)) {
                        continue; //ignore first complete
                    }

                    // if it's marked as RUC and the date is not in the future, than we've already handled this as Today; skip it
                    if (upcomingReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
                        if (reminderfox.core.compareDates(upcomingReminder.date, todaysDate) != 1) {
                            continue;
                        }
                    }
                    else {
                        // handle today's reminders
                        if (reminderfox.core.compareDates(upcomingReminder.date, todaysDate) == 0) {
                            todayReminder = reminderfox.core.cloneReminderFoxEvent(upcomingReminder);
                            todayReminder = reminderfox.core.processReminderDescription(todayReminder, todayReminder.date.getFullYear(), false);
                            index = reminderfox.core.getSortNewUpcomingReminderIndex(todaysReminders, todayReminder);
                            reminderfox.core.insertIntoArray(todaysReminders, todayReminder, index);
                            continue;
                        }
                    }
                }

                upcomingReminder = reminderfox.core.processReminderDescription(upcomingReminder, upcomingReminder.date.getFullYear(), false);
                index = reminderfox.core.getSortNewUpcomingReminderIndex(upcomingReminders, upcomingReminder);
                reminderfox.core.insertIntoArray(upcomingReminders, upcomingReminder, index);
            }
        }
    }

    // now sort repeating items...
    for (i = 0; i < reminderEvents.length; i++) {
        todayReminder = null;
        reminder = reminderEvents[i];
        if (reminder.recurrence.type != reminderfox.consts.RECURRENCE_YEARLY &&
            reminder.recurrence.type != reminderfox.consts.RECURRENCE_ONETIME) {
            allReminders = reminderfox.core.getAllRemindersInDateRange(reminder, todaysDate, endDate, true);
            // do the filtering here...
            endIndex = 0;
            if (allReminders.length > 0) {
                endIndex = allReminders.length;
            }

            // have to have a check for -1 --> show all occurrences
            if (allReminders.length > 0) {
                if (!(allReminders.length == 1 && REPEAT_UPCOMING_OCCURRENCES >= 1)) {
                    for (x = 0; x < allReminders.length; x++) {
                        if (reminderfox.core.compareDates(allReminders[x].date, todaysDate) != -1) {
                            break;
                        }
                    }
                    if (REPEAT_UPCOMING_OCCURRENCES == -1) {
                        endIndex = allReminders.length;
                    }
                    else {
                        endIndex = x + REPEAT_UPCOMING_OCCURRENCES;
                        if (endIndex > allReminders.length) {
                            endIndex = allReminders.length;
                        }
                    }
                }
            }

            for (j = 0; j < endIndex; j++) {
                upcomingReminder = allReminders[j];

                if (j == 0) { // special checking for first reminder
                    if (reminderfox.core.isCompletedForDate(upcomingReminder, upcomingReminder.date)) {
                        continue; //ignore first complete
                    }

                    // if it's marked as RUC and the date is not in the future, than we've already handled this as Today; skip it
                    if (upcomingReminder.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED) {
                        if (reminderfox.core.compareDates(upcomingReminder.date, todaysDate) != 1) {
                            continue;
                        }
                    }
                    else {
                        // handle today's reminders
                        if (reminderfox.core.compareDates(upcomingReminder.date, todaysDate) == 0) {
                            todayReminder = reminderfox.core.cloneReminderFoxEvent(upcomingReminder);
                            todayReminder = reminderfox.core.processReminderDescription(todayReminder, todayReminder.date.getFullYear(), false);
                            index = reminderfox.core.getSortNewUpcomingReminderIndex(todaysReminders, todayReminder);
                            reminderfox.core.insertIntoArray(todaysReminders, todayReminder, index);
                            continue;
                        }
                    }
                }

                // add upcoming reminder
                upcomingReminder = reminderfox.core.processReminderDescription(upcomingReminder, upcomingReminder.date.getFullYear(), false);

                index = reminderfox.core.getSortNewUpcomingReminderIndex(upcomingReminders, upcomingReminder);
                reminderfox.core.insertIntoArray(upcomingReminders, upcomingReminder, index);
            }
        }
    }

    return {
        today: todaysReminders,
        upcoming: upcomingReminders
    };
}


reminderfox.overlay.getVisibleTodos= function(){
    var todosArr = reminderfox.core.getReminderTodos(); //  iterate over  ALL  todos
    var visibleTodosHashMap = {};
    var sortMap;

    var upcomingReminderDays = reminderfox.core.getPreferenceValue(reminderfox.consts.UPCOMING_REMINDER_DAYS_PREF, 15);
    if (upcomingReminderDays > 364) {
        upcomingReminderDays = 364;
    }
    var endDate = new Date();
    endDate.setDate(endDate.getDate() + upcomingReminderDays);
    var todaysDate = new Date();
    for (var n in todosArr) {
        var todos = todosArr[n];

        if (todos != null) {
            if (visibleTodosHashMap[n] == null) {
                visibleTodosHashMap[n] = new Array();
            }
            if (sortMap == null) {
                sortMap = new Array();
                var sortColumnsStr = reminderfox.core.getPreferenceValue(reminderfox.consts.SORT_COLUMNS_PREF, "");
                if (sortColumnsStr != null && sortColumnsStr != "") {
                    var sortColumnsStrArray = sortColumnsStr.split(",");
                    for (var i = 0; i < sortColumnsStrArray.length; i++) {
                        var listName = sortColumnsStrArray[i];
                        i++;
                        var sortCol = sortColumnsStrArray[i];
                        i++;
                        var sortDir = parseInt(sortColumnsStrArray[i]);
                        sortMap[listName] = {
                            sortColumn: sortCol,
                            sortDirection: sortDir
                        };
                    }
                }
            }
            var currentTodosList = visibleTodosHashMap[n];
            for (var i = 0; i < todos.length; i++) {
                // only show if the todo has not been completed and the user wants to show it in the tooltip
                if (!todos[i].showInTooltip || reminderfox.core.isCompletedForDate(todos[i], todos[i].date)) {
                    continue;
                }
                else
                if (todos[i].date != null && reminderfox.core.compareDates(todos[i].date, endDate) == 1) {
                    // only show if the date is less than the user's Number of Upcoming Days
                    continue;
                }

                var validTodo = reminderfox.core.processReminderDescription(todos[i], todaysDate.getFullYear(), true);
                currentTodosList[currentTodosList.length] = validTodo;
            }


            if (sortMap[n] != null) {

                var sortedArray = new Array(currentTodosList.length);
                for (var i = 0; i < currentTodosList.length; i++) {
                    sortedArray[i] = currentTodosList[i];
                    sortedArray[i].originalIndex = i;
                }
                reminderfox.core.quick_sort(sortedArray, sortMap[n].sortColumn, sortMap[n].sortDirection);
                visibleTodosHashMap[n] = sortedArray;
            }
        }
    }

    return visibleTodosHashMap;
}


reminderfox.overlay.storeTimeOfLastUpdate= function(){
    // output the last time of update for debugging, but only if the
    // preference already exists
    try {
        reminderfox.core.getPreferenceValue(reminderfox.consts.LAST_UPDATE, 0);

        var currentDate = new Date();
        var hours = currentDate.getHours();
        var mins = currentDate.getMinutes();
        var secs = currentDate.getSeconds();

        var readableMins = mins;
        if (mins < 10) {
            readableMins = "0" + readableMins;
        }
        var readableSecs = secs;
        if (secs < 10) {
            readableSecs = "0" + readableSecs;
        }
        reminderfox.core.setPreferenceValue(reminderfox.consts.LAST_UPDATE, hours + ":" + readableMins + ":" + readableSecs);
    }
    catch (e) {
        // pref doesn't exist.  Do nothing.
    }
}


reminderfox.overlay.storeTimeOfLastProcessed= function(){
    // output the last time of update for debugging, but only if the
    // preference already exists
    var currentDate = new Date();
    var time = currentDate.getTime() + "";  // make sure it's set as STRING
 //XXX   reminderfox.core.setPreferenceValue(reminderfox.consts.LAST_PROCESSED, time);
    reminderfox.overlay.lastProcessed = time;

}


reminderfox.overlay.updateForRemoteChange= function(statustxtString, actionID){
    if (actionID == 1 || // completed successfully (remote and local are equal, or were uploaded)
        actionID == 2 ||     // reminders were downloaded,  need to refresh reminders
        actionID == -1 )     // connection error - in this case we still need to proces reminders in case enough time has elapsed
    {
        var changed = reminderfox.overlay.processRecentReminders();
        if (changed) {
            // write stuff out
            reminderfox.core.writeOutRemindersAndTodos(false);		// calls syncWrittenChangesToRemote  and   updates windows
            reminderfox.core.syncWrittenChangesToRemote();
        }

        var windowEnumerator = reminderfox.core.getWindowEnumerator();
        if (windowEnumerator.hasMoreElements()) {
            var oldestWindow = windowEnumerator.getNext();
            oldestWindow.reminderfox.overlay.updateRemindersInWindow();

            oldestWindow.reminderfox.core.clearRemindersAndTodos();
            while (windowEnumerator.hasMoreElements()) {
                var currentWindow = windowEnumerator.getNext();
                currentWindow.reminderfox.overlay.updateRemindersInWindow();
                currentWindow.reminderfox.core.clearRemindersAndTodos();
            }
        }
    }
}


reminderfox.overlay.ensureRemoteRemindersSynchronized= function(headless){

    var waitForResponse = false;

    // sync 'em up
    var networkSync = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.SYNCHRONIZE, reminderfox.consts.NETWORK.SYNCHRONIZE_DEFAULT);
    if (networkSync) {
        reminderfox.util.JS.dispatch('network');
        if (headless) {
            waitForResponse = true;
            reminderfox.network.download.reminderFox_download_Startup_headless(reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS,
                reminderfox.overlay.updateForRemoteChange);
        }
        else {
            reminderfox.core.downloadReminders(); // this open the Cancel dialog shown during networking
        }
    }
    return waitForResponse;
}


//reminderfox.overlay.initializeReminderFoxHourlyTimer = {
reminderfox.overlay.initializeReminderFoxUpdatingTimer = {
    notify: function (timer) {

        var msg =  "  Timer Fired!    [.initializeReminderFoxUpdatingTimer] ";
        reminderfox.core.logMessageLevel(msg, reminderfox.consts.LOG_LEVEL_INFO);

        reminderfox.overlay.initializeReminderFox(true);
        //do stuff here, this stuff will finish and then timer will start countdown of myTimerInterval.
        //This is nice because if used TYPE_REPEATING_PRECISE will trigger this call back every myTimerInterval.
        // TYPE_REPEATING_PRECISE_SKIP will trigger this call back every myTimerInterval, but if myTimerInterval
        // is up and the callback from last time myTimerInterval went off is still running, it will skip
        // running this call back.
        //TYPE_REPEATING_SLACK i don't trust because on MDN they said "note that this is not guaranteed:
        //  the timer can fire at any time." so I go with TYPE_ONE_SHOT.

        var timeout = reminderfox.core.getPreferenceValue(reminderfox.consts.INTERVAL_TIMER,
        	reminderfox.consts.INTERVAL_TIMER_INKREMENT);
        timer.initWithCallback(reminderfox.overlay.initializeReminderFoxUpdatingTimer,  // was  .initializeReminderFoxHourlyTimer,
            timeout /*reminderfox.overlay.consts.HOUR_TIMEOUT*/, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
}


// this runs every hour and updates all of the windows with the latest reminders
//reminderfox.overlay.initializeReminderFoxHourly= function(){
reminderfox.overlay.initializeReminderFoxUpdating= function(){
//------------------------------------------------------------------------------
    reminderfox.overlay.initializeReminderFox(true);
}


// this runs every hour and updates all of the windows with the latest reminders
reminderfox.overlay.initializeReminderFox= function(clearReminders){
//------------------------------------------------------------------------------
    var windowEnumerator = reminderfox.core.getWindowEnumerator();
    var currentDate;
    if (windowEnumerator.hasMoreElements()) {
        var oldestWindow = windowEnumerator.getNext();
        // if this is the very first (oldest) window opened, then let's process the reminders
        if (window == oldestWindow) {
            // verify that the correct amount of time has elapsed since last update.   Sometimes due to
            // what appears to be a FireFox bug, sometimes a large number of  timeouts are called.  This
            // ensures that we only process once after the proper amount of time
            var lastTime = reminderfox.overlay.lastProcessed;
            if (!reminderfox.overlay.reminderFox_initialized) {
                // the very first time, clear out the last time so that we always run when you start Firefox
                lastTime = "";
                reminderfox.overlay.reminderFox_initialized = true;
            }

            currentDate = new Date();
            var currentTime = currentDate.getTime();
            var lastTimeElapsed = null;

            var timeout = reminderfox.core.getPreferenceValue(reminderfox.consts.INTERVAL_TIMER,
               reminderfox.consts.INTERVAL_TIMER_INKREMENT);

            if (lastTime != null && lastTime != "") {
         //       lastTimeElapsed = parseInt(lastTime) + reminderfox.overlay.consts.HOUR_TIMEOUT;
                lastTimeElapsed = parseInt(lastTime) + timeout;
            }
       var msg = "RmFX  Check ReminderFoxTimer - should Initialize: " + (lastTime == null || lastTime == "" || (currentTime + 1500) >= lastTimeElapsed) + " ==  lastTime "
                + lastTime + " -- currentTime: " + currentTime
                + " -- lastTimeElapsed: " + lastTimeElapsed
                + " - Difference (currentTime+1500) - lastTimeElapsed:" + ((currentTime + 1500) - lastTimeElapsed)
                + " - Inkrement timer: " + timeout;
       reminderfox.core.logMessageLevel(msg, reminderfox.consts.LOG_LEVEL_SUPER_FINE)

            // make sure that the HOURLY_TIMEOUT has passed before we continue.
            // Also add a 1.5 second buffer, as it seems sometimes Mozilla doesn't call the setTimeout at the
            // exact time, but sometimes ~800ms early or late.
            //if (lastTime == null || lastTime == "" || (currentTime + 1500) >= lastTimeElapsed) {

            var updateWindows = false;
            var fileChanged = reminderfox.core.timeStampHasChanged();
            if (fileChanged != -1) {
                reminderfox.core.storeTimeStamp(fileChanged);
            }

            var waitForResponse = reminderfox.overlay.ensureRemoteRemindersSynchronized(true);

            var changed = false;
            try {
                if (!waitForResponse) {
                    changed = reminderfox.overlay.processRecentReminders(true);
                }
            }
            catch (e) {
            }
            if (changed) {
                updateWindows = true;
                // write stuff out
                reminderfox.core.writeOutRemindersAndTodos(false);			// goes 4:  syncWrittenChangesToRemote
                reminderfox.core.syncWrittenChangesToRemote();
            }

            if (fileChanged) {
                updateWindows = true;
            }
            currentDate = new Date();
            var day = currentDate.getDate();
            if (reminderfox.overlay.lastDay != day) {
                updateWindows = true;
            }

            reminderfox.core.logMessageLevel("  [.initializeReminderFox] " + updateWindows
                + ";  icsFile change: " + (fileChanged == true)
                + ",  reminders: " + changed
                + ",  day: " + (reminderfox.overlay.lastDay != day)
                + "\n  Network: waitForResponse:  " + waitForResponse,
                reminderfox.consts.LOG_LEVEL_INFO);

            if (updateWindows) {
                oldestWindow.reminderfox.overlay.updateRemindersInWindow();
                if (clearReminders) {
                    // clear reminders from memory
                    reminderfox.core.clearRemindersAndTodos();
                }
                while (windowEnumerator.hasMoreElements()) {
                    var currentWindow = windowEnumerator.getNext();
                    currentWindow.reminderfox.overlay.updateRemindersInWindow();
                    if (clearReminders) {
                        // clear reminders from memory
                        currentWindow.reminderfox.core.clearRemindersAndTodos();
                    }
                }
            }


            if (clearReminders) {
                // clear reminders from memory
                reminderfox.core.clearRemindersAndTodos();
            }
            reminderfox.overlay.lastDay = day;

            reminderfox.core.logMessageLevel("  Setting  .intervalTimer!", reminderfox.consts.LOG_LEVEL_FINE);

            reminderfox.overlay.storeTimeOfLastProcessed();
        }
    }

   //gW 2015-10-13 -- CalDAV Update all active Remote Calendars
   reminderfox.online.status();

}


reminderfox.overlay.updateRemindersInWindow= function(){
//------------------------------------------------------------------------------
        var reminderString = "";

        var todaysAndUpcomingReminders = reminderfox.overlay.getTodaysAndUpcomingReminders();
        var todayReminders = todaysAndUpcomingReminders.today;
        var important = false;
        for (var i = 0; i < todayReminders.length; i++) {
            reminderString = reminderString + todayReminders[i].summary;
            if (i < todayReminders.length - 1) {
                reminderString = reminderString + ", ";
            }
            if (todayReminders[i].priority == reminderfox.consts.PRIORITY_IMPORTANT) {
                important = true;
            }
        }

        // get preference for how many chars to make this
        var statusTextMaxLen = reminderfox.core.getPreferenceValue(reminderfox.consts.STATUS_TEXT_MAX_LENGTH,
                  reminderfox.consts.STATUS_TEXT_MAX_LENGTH_DEFAULT);

        // don't want text on status bar too long; truncate it after it gets big
        if (reminderString.length > statusTextMaxLen) {
            reminderString = reminderString.substring(0, statusTextMaxLen) + "...";
        }
        if (statusTextMaxLen == 0) reminderString = "";

        //smartFoxy button change color if todays reminders
        reminderfox.core.foxyStatus(todayReminders, important, todaysAndUpcomingReminders.upcoming, reminderString)
        reminderfox.overlay.createToolTip(todayReminders, todaysAndUpcomingReminders.upcoming);
}


reminderfox.overlay.quickAlarmTooltip= function(){
    var quickAlarmTooltipBox = document.getElementById("quickAlarmTooltipBox");
    if (quickAlarmTooltipBox != null) {
        while (quickAlarmTooltipBox.hasChildNodes()) {
            quickAlarmTooltipBox.removeChild(quickAlarmTooltipBox.firstChild);
        }
    }

    var currentAlarms = reminderfox.core.getQuickAlarms();
    // sort array
    reminderfox.core.quick_sort_QuickArray(currentAlarms, 0);

    if (currentAlarms != null) {

        for (var i = 0; i < currentAlarms.length; i++) {
            var currentAlarm = currentAlarms[i];
            var text = currentAlarm.text;
            var snoozeTime = currentAlarm.snoozeTime;
            var alarmTime = currentAlarm.alarmTime;

            var currentTime = new Date().getTime();
            var actualAlarmTime = parseInt(snoozeTime) - currentTime;

            var newDate = new Date(parseInt(alarmTime));

            var todaysDate = new Date();
            var dateVar = null;
            if (newDate.getMonth() != todaysDate.getMonth() || newDate.getDate() != todaysDate.getDate()) {
                var dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
                var dateString = reminderfox.date.getDateVariable(null, newDate, dateVariableString);
                dateVar = dateString + ", " + reminderfox.date.getTimeString(newDate);
            }
            else {
                dateVar = reminderfox.date.getTimeString(newDate);
            }

            var remLabel = document.createElement("description");
            remLabel.setAttribute("value", text + " (" + dateVar + ")");
            quickAlarmTooltipBox.appendChild(remLabel);
        }
    }
}


reminderfox.overlay.activateOptionsContext= function(event) {
    // dynamically handle the Show Alerts menu item
    var alertType = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_ALL);

    var suspendAlerts = document.getElementById("reminderfox-options-contextmenu-suspendAlerts");
    if (suspendAlerts != null ) {
        // if alerts are suspended, the option is unchecked
        if (alertType.indexOf( reminderfox.consts.ALERT_SUSPEND ) != -1 ) {
            suspendAlerts.setAttribute( "label",  reminderfox.string("rf.alarm.resume.text")  );	// Resume alerts and alarms
        }
        // otherwise, in normal case the option is checked
        else {
            suspendAlerts.setAttribute( "label", reminderfox.string("rf.alarm.suspend.text") );		// Suspend alerts and alarms...
        }
    }
    reminderfox.core.setPreferenceValue(reminderfox.consts.ALERT_ENABLE, alertType);

    reminderfox.overlay.activateQuickAlarmContextMenu(event, false);
}


reminderfox.overlay.activateQuickAlarmContextMenu= function(event, isToolbar) {
    // check if any current quick alarms, and show/hide the menu item list as appropriate
    var currentAlarms = reminderfox.core.getQuickAlarms();

    // sort array
    reminderfox.core.quick_sort_QuickArray( currentAlarms, 0 );

    var quickAlarmsList = null;
    if (isToolbar ) {
        quickAlarmsList = document.getElementById("reminderfox-options-contextmenu-quickAlarms-list-toolbar");
    }
    else {
        quickAlarmsList = document.getElementById("reminderfox-options-contextmenu-quickAlarms-list");
    }

    if (currentAlarms == null || currentAlarms.length == 0) {
        quickAlarmsList.setAttribute("hidden", "true");
    }
    else {
        quickAlarmsList.removeAttribute( "hidden");

        // show current lists...
        var moveToList = null;
        if (isToolbar ) {
            moveToList = document.getElementById("reminderfox-options-contextmenu-quickAlarms-list-toolbar-popup");
        }
        else {
            moveToList = document.getElementById("reminderfox-options-contextmenu-quickAlarms-list-popup");
        }

        while (moveToList.hasChildNodes()) {
            moveToList.removeChild(moveToList.firstChild);
        }

        if (currentAlarms != null ) {

            for (var i = 0; i < currentAlarms.length; i++ )  {
                var currentAlarm = currentAlarms[i];
                var text = currentAlarm.text;
                var notes = (currentAlarm.notes != null) ? currentAlarm.notes : "";
                var snoozeTime = currentAlarm.snoozeTime;
                var alarmTime = currentAlarm.alarmTime;

                var currentTime = new Date().getTime();
                var actualAlarmTime = parseInt( snoozeTime ) - currentTime;

                var newDate = new Date( parseInt( alarmTime ) );

                var todaysDate = new Date();
                var dateVar = null;
                if (newDate.getMonth() != todaysDate.getMonth() || newDate.getDate() != todaysDate.getDate() ) {
                    var dateVariableString = reminderfox.core.getPreferenceValue(reminderfox.consts.LIST_DATE_LABEL, reminderfox.consts.LIST_DATE_LABEL_DEFAULT);
                    var dateString =reminderfox.date.getDateVariable( null, newDate, dateVariableString );
                    dateVar = dateString + ", " + 	reminderfox.date.getTimeString( newDate );
                }
                else {
                    dateVar = reminderfox.date.getTimeString( newDate );
                }

                // add new menu item
                var menuItem = document.createElement("menuitem");
                var quickAlarmLabel = text + " (" + dateVar + ")" ;
                menuItem.setAttribute( "id", text );
                menuItem.setAttribute( "label", quickAlarmLabel);
                menuItem.setAttribute("notes", notes);
                menuItem.addEventListener( "click", function() {reminderfox.overlay.promptRemoveQuickAlarm(this)},false);
                moveToList.appendChild(menuItem);
            }
        }
    }
}


reminderfox.overlay.promptRemoveQuickAlarm= function(xthis){
    // get Notes text if available
    var notes = xthis.getAttribute('notes');
    if (notes != null && notes.length > 0) {
        // replace new line characters with actual newline
        var notesText = notes.replace(new RegExp(/\\n/g), "\n");
        xthis.label += "\n\n" + notesText;
    }

    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

    var flags = promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0 +
        promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1;
    var msg = xthis.label;
    var buttonPressed = promptService.confirmEx(window, reminderfox.string("rf.alarm.quickalarms.label") + " " + xthis.id, msg, flags, reminderfox.string("rf.alarm.quickalarms.remove.label"), reminderfox.string("rf.button.ok"), null, null, {});

    // cancel pressed
    if (buttonPressed == 0) {
        reminderfox.core.removeQuickAlarm(xthis.id);
    }
}


reminderfox.overlay.toggleShowAlert= function(){
    var alertType = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_ALL);

    // if it's marked as suspended, change to original value
    var suspendedIndex = alertType.indexOf(reminderfox.consts.ALERT_SUSPEND);
    if (suspendedIndex != -1) {
        reminderfox.overlay.resumeAlerts();
    }
    // otherwise, suspend the alert
    else {
        window.openDialog('chrome://reminderFox/content/alarms/suspendAlerts.xul', 'suspendAlerts', 'chrome,dialog=no');
    }
}


reminderfox.overlay.showAlertSlider= function(){
    var i;
    var remindersArray;
    var windowEnumerator = reminderfox.core.getWindowEnumerator();

    if (windowEnumerator.hasMoreElements()) {
        var oldestWindow = windowEnumerator.getNext();
        // Only show the alert  for the oldest window (the first browser you opened).
        // We don't want each new window to have its own timeout to respond to, because we only
        // need to show one alert for all browser windows
        if (window == oldestWindow) {
            // don't show if the user has showReminders deselected in tooltip...  in that case, there is no todayReminder label to copy for alert so it would fail
            var showReminders = reminderfox.core.getPreferenceValue(reminderfox.consts.SHOW_REMINDERS_IN_TOOLTIP, true);

            // Reshow alert after ALERT_TIMEOUT minutes.  -- (note: options dialog - needs to clear out lastAlert pref when changed)
            var alert_timeout = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_TIMEOUT, 0);

            if (showReminders && alert_timeout > 0) {
                // convert from minutes to milliseconds
                alert_timeout = alert_timeout * 60000;

                // verify that the correct amount of time has elapsed since last alert slider.   Sometimes due to
                // what appears to be a FireFox bug, sometimes a large number of alert timeouts are called.  This
                // ensures that only the correct one will display the alert slider after the proper amount of time
                var lastTime = reminderfox.overlay.lastAlert;

                var lastTimeElapsed = null;
                if (lastTime != null && lastTime != 0) {
                    lastTimeElapsed = parseInt(lastTime) + alert_timeout;
                }
                var currentDate = new Date();
                var currentTime = currentDate.getTime();

                reminderfox.core.logMessageLevel("  Show AlertSlider ... "
                   + "'lastTime' " + lastTime
                   + " + 'alert_timeout' " + alert_timeout
                   + " = 'elapsed time' : " + lastTimeElapsed,
                   reminderfox.consts.LOG_LEVEL_INFO);

                var alertType = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_ENABLE, reminderfox.consts.ALERT_ENABLE_ALL);

                if (alertType == reminderfox.consts.ALERT_ENABLE_NONE) {
                    return;
                }
                reminderfox.core.ensureRemindersSynchronized();
                //var remoteChanged = reminderfox.overlay.ensureRemoteRemindersSynchronized(true);   // do we want  alarm sync too?

                // check for empty today/upcoming - if both empty then ignore - check if today equals none string; if so, then check if upcoming == none string
                var todaysReminders = document.getElementById("reminderfox-todaysRemindersBox").cloneNode(true);
                var upcomingReminders = document.getElementById("reminderfox-upcomingRemindersBox").cloneNode(true);

                var children = null;
                var children2 = null;
                var todayPref = false;
                var upcomingPref = false;

                if (alertType == reminderfox.consts.ALERT_ENABLE_TODAY || alertType == reminderfox.consts.ALERT_ENABLE_ALL) {
                    children = todaysReminders.childNodes;
                    todayPref = true;
                }
                if (alertType == reminderfox.consts.ALERT_ENABLE_UPCOMING || alertType == reminderfox.consts.ALERT_ENABLE_ALL) {
                    children2 = upcomingReminders.childNodes;
                    upcomingPref = true;
                }
                var noToday = (children == null || children.length == 0 || (children.length == 1 && children[0].getAttribute("value") == reminderfox.string("rf.main.tooltip.reminders.none")));
                var noUpcoming = (children2 == null || children2.length == 0 || (children2.length == 1 && children2[0].getAttribute("value") == reminderfox.string("rf.main.tooltip.reminders.none")));
                var ignoreAlert = noToday && noUpcoming;

                if (!ignoreAlert) {
                    if (!todayPref) {
                        todaysReminders = null;
                    }
                    if (!upcomingPref) {
                        upcomingReminders = null;
                    }

                    var newOptions = {
                        todaysReminders: todaysReminders,
                        upcomingReminders: upcomingReminders,
                        alertTypeToShow: alertType,
                        hideGayPaw:reminderfox.core.getPreferenceValue(reminderfox.consts.HIDE_FOX_PAW, false)
                    };
                    window.openDialog("chrome://reminderfox/content/newAlert/newAlert.xul",
                       "window:alert", "chrome,dialog=yes,titlebar=no,popup=yes", newOptions);
                    if (reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_SOUND,
                        reminderfox.consts.ALERT_SOUND_DEFAULT)){
                            reminderfox.core.playSound('alert');
                    }
                }
                //reminderfox.core.logMessageLevel("  AlertSlider ! ", reminderfox.consts.LOG_LEVEL_INFO);
                // output the last time of update for debugging
                var currentDate = new Date();
                var time = currentDate.getTime();
                reminderfox.overlay.lastAlert = time;
            }
        }
    }
}


// Automatically save reminders to backup files on FireFox startup
// Files:
//    reminders.ics.bak1  <-- always write to this on startup
//    reminders.ics.bak2   <--- check this...  if exists and > 24 hours since bak1, copy bak2 to bak3 and copy bak1 to bak2
//    reminders.ics.bak3
reminderfox.overlay.saveReminders= function(){
//------------------------------------------------------------------------------

    // algo notes:
    /*
     * on startup and every 24 hours (in the inithourly, i think there's a daily check:
     *   [ see this file:  --> search for: if (reminderfox.overlay.lastDay != day) {  ]
     * run this...
     *  see if already backed up for today date;
     *           if not,
     *              ...
     *              find last backup (maybe store this in a preference?; no just sort the
     *              backupdirectory names and find the last one)
     *              and do a checksum; only if it differs to we save:
     *                  then create directory and save file
     *           if have,
     *              first do checksum;
     *           if differs then maybe write out a second one?  Or just save to bak1/bak2 in that case
     *
     * on startup mode only, have a check where it will check backup.numdays pref and
     *   then sort directories, and delete anything older than the last  n entries
     *
     * always save last 2 versions (bak1/bak2) if dont' write anything out
     */

    try {
        // initialize backup files
        var file;
        var baseFilePath= reminderfox.core.getICSfile().path;

        var filePath1 = baseFilePath + ".bak1";
        var filePath2 = baseFilePath + ".bak2";
        var filePath3 = baseFilePath + ".bak3";

        var origFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
        origFile.initWithPath(baseFilePath);

        var file2 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
        file2.initWithPath(filePath2);

        var file1 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
        file1.initWithPath(filePath1);

        // only write backup file if it differs from current file
        if (!file1.exists() || file1.lastModifiedTime != origFile.lastModifiedTime) {
            // no file2 - create it
            if (!file2.exists()) {
                // bak2 doesn't exist.  Let's just write out to it
                var leafName = file2.leafName;
                var parentDir = file2.parent;
                if (file1.exists()) {
                    // copy bak1 to bak2
                    var parentDir = file2.parent;
                    var leafName = file2.leafName;
                    file1.copyTo(parentDir, leafName);
                }
            }
            else
            if (file1.exists() && file1.lastModifiedTime != file2.lastModifiedTime) { // and only write out if backup2  file is actually different than backup1
                var timeDifference = file1.lastModifiedTime - file2.lastModifiedTime;

                // only copy bak1 to bak2 if it is over a day old
                if (timeDifference > reminderfox.consts.ONE_DAY) { // greater than a day old; update
                    // copy bak2 to bak3
                    var file3 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                    file3.initWithPath(filePath3);
                    var leafName = file3.leafName;
                    if (file3.exists()) {
                        file3.remove(true);
                    }
                    var parentDir = file2.parent;
                    file2.copyTo(parentDir, leafName);

                    // copy bak1 to bak2
                    var parentDir = file2.parent;
                    var leafName = file2.leafName;
                    if (file2.exists()) {
                        file2.remove(true);
                    }
                    file1.copyTo(parentDir, leafName);
                }
            }

            // write out current state to bak1
            if (file1.exists()) {
                file1.remove(true);
            }
            var leafName = file1.leafName;
            var parentDir = file1.parent;
            origFile.copyTo(parentDir, leafName);
        }
    }
    catch (e) {
        reminderfox.core.logMessageLevel("  Failed saving backup file: " + baseFilePath
            + "\n" + e.name + ": " + e.description + ": " + e.number + ": " + e.message
            + "\ncaller : " + reminderfox.util.STACK(0), reminderfox.consts.LOG_LEVEL_INFO);
    }
}


reminderfox.overlay.processQuickAlarms= function(returnMissed){
    var alarmInfos = new Array();

    var delay = 1;
    var quickAlarms = reminderfox.core.getQuickAlarms();
    for (var i = 0; i < quickAlarms.length; i++) {
        var alarmText = quickAlarms[i].text;
        var alarmTime = quickAlarms[i].alarmTime;
        var snoozeTime = quickAlarms[i].snoozeTime;
        var notesText = null;
        if (quickAlarms[i].notes != null && quickAlarms[i].notes.length > 0) {
            notesText = quickAlarms[i].notes;
        }

        var currentTime = new Date().getTime();
        var actualAlarmTime = parseInt(alarmTime) - currentTime;

        var processed = false;
        if (returnMissed) {
            if (actualAlarmTime < 0) {
                var newAlarm = {
                    quickAlarmText: alarmText,
                    quickAlarmNotes: notesText,
                    alarmTabPanel: null,
                    alarmRecentReminder: null,
                    alarmSnoozeTime: snoozeTime,
                    alarmListName: null,
                    alarmTimeString: null,
                    alarmIsReminder: false,
                    alarmIsTodo: false,
                    alarmAlarmMissed: false,
                    synccallback: reminderfox.core.networkSynchronizeCallback,		//.overlay.processQuickAlarms
                    clearLabelCallback: reminderfox.overlay.clearMailLabelCallback,
                    alarmCurrentAlarmId: null,
                    reminderTime: null,
                    reminderTimeDifference: null
                };

                alarmInfos[alarmInfos.length] = newAlarm;
                processed = true;
            }
        }

        if (!processed) {
            if (actualAlarmTime < 0) {
                actualAlarmTime = 0 + (reminderfox.overlay.getAlarmDelay() * delay);
                delay++;
            }


            var windowEnumerator = reminderfox.core.getWindowEnumerator();
            if (windowEnumerator.hasMoreElements()) {
                //alert( "IN HERE yo: " + alarmText  + " -- " + actualAlarmTime);
                var oldestWindow = windowEnumerator.getNext();

                //alert( "alarm 7!" );
                // dump: here's another place to check that it is not more than 24 days in the future
                if (actualAlarmTime > 3600000) {
                }
                else {
                    oldestWindow.setTimeout(oldestWindow.reminderfox.overlay.showQuickAlarm, actualAlarmTime,
                         alarmText, snoozeTime, notesText);

                    reminderfox.core.logMessageLevel("  Setting quickalarm for : " + alarmText + " -- snoozeTime: "
                      + snoozeTime + " -- actualAlarmTime: " + actualAlarmTime, reminderfox.consts.LOG_LEVEL_FINE);
                }
            }
        }
    }
    return alarmInfos;
}



reminderfox.overlay.bindKeys= function() {
    var keyset = document.getElementById("reminderFox_keyset");
    var openRF = reminderfox.core.getPreferenceValue(reminderfox.consts.KEY_SHORTCUT_OPEN, reminderfox.consts.KEY_SHORTCUT_OPEN_DEFAULT);
    var addRF = reminderfox.core.getPreferenceValue(reminderfox.consts.KEY_SHORTCUT_ADD, reminderfox.consts.KEY_SHORTCUT_ADD_DEFAULT);
    var valid = {
        accel: "accel",
        ctrl: "control",
        control: "control",
        shift: "shift",
        alt: "alt",
        meta: "meta"
    };

    if (openRF != null && openRF.length > 0 ) {
        var value = openRF;
        var parts = value.split(/\s+/);
        var modifiers = [];
        var keychar = null;
        var keycode = null;
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].toLowerCase() in valid)
                modifiers.push(parts[i].toLowerCase());
            else if (parts[i].length == 1)
                keychar = parts[i];
            else if ("DOM_VK_" + parts[i].toUpperCase() in Components.interfaces.nsIDOMKeyEvent)
                keycode = "VK_" + parts[i].toUpperCase();
        }
        if (keychar || keycode) {
            var element = document.createElement("key");
            element.addEventListener("command", function() {reminderfox.overlay.openMainDialog(true);},false);
            if (keychar)
                element.setAttribute("key", keychar);
            else
                element.setAttribute("keycode", keycode);
            element.setAttribute("modifiers", modifiers.join(","));
            if (keyset != null ) {
                keyset.appendChild(element);
            }
        }
    }

    if (addRF != null && addRF.length > 0 ) {
        var value = addRF;
        var parts = value.split(/\s+/);
        var modifiers = [];
        var keychar = null;
        var keycode = null;
        for (var i = 0; i < parts.length; i++) {
            if (parts[i].toLowerCase() in valid)
                modifiers.push(parts[i].toLowerCase());
            else if (parts[i].length == 1)
                keychar = parts[i];
            else if ("DOM_VK_" + parts[i].toUpperCase() in Components.interfaces.nsIDOMKeyEvent)
                keycode = "VK_" + parts[i].toUpperCase();
        }

        if (keychar || keycode) {
            var element = document.createElement("key");
            element.addEventListener("command", function() {reminderfox.overlay.quickAddReminder();},false);
            if (keychar)
                element.setAttribute("key", keychar);
            else
                element.setAttribute("keycode", keycode);
            element.setAttribute("modifiers", modifiers.join(","));
            if (keyset != null ) {
                keyset.appendChild(element);
            }
        }
    }
}


reminderfox.overlay.runDebug= function() {
    reminderfox.core.logMessageLevel( "\n\nRmFX  DEBUG REPORT " , reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO
    var windowEnumerator = reminderfox.core.getWindowEnumerator();
    if (windowEnumerator.hasMoreElements()) {
        var oldestWindow = windowEnumerator.getNext();

        reminderfox.core.logMessageLevel( "Total alarmlist length = "+ oldestWindow.reminderfox.overlay.alarmList.length , reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO

        for (var i = 0; i < oldestWindow.reminderfox.overlay.alarmList.length; i++) {
            var currentAlarm = oldestWindow.reminderfox.overlay.alarmList[i];
            var reminderOrTodo =	reminderfox.core.getRemindersById( currentAlarm.alarmId);
            reminderfox.core.logMessageLevel( i + ". " + currentAlarm.alarmId + "; timeOfAlarm = " + currentAlarm.timeOfAlarm  +
                " ;snoozed = "  + currentAlarm.snoozed + "; reminder objecdt= " + reminderOrTodo, reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO
            if (reminderOrTodo == null ) {
                reminderOrTodo =	reminderfox.core.getSpecificTodoById( currentAlarm.alarmId);
            }

            if (reminderOrTodo != null ) {
                reminderfox.core.logMessageLevel( "Reminder: " + reminderOrTodo.summary + " -- " + reminderOrTodo.date, reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO
                var ackDate = new Date();
                ackDate.setTime( currentAlarm.timeOfAlarm );  // TODO check
                reminderfox.core.logMessageLevel( "alarm date: : " + ackDate + "\n***\n", reminderfox.consts.LOG_LEVEL_DEBUG);  //TODO
            }
        }
    }
}


reminderfox.overlay.start_postInit= function() {
//===================================================================
    // the very first time we install reminderfox, we do not need to show the alert slider.
    // This is because all we have is the "Welcome" reminder which does not make sense to
    // surface
    var ignoreFirstRun = false;
    var oldVersionNumber = reminderfox.core.getPreferenceValue(reminderfox.consts.MIGRATED_PREF, "");
    if (oldVersionNumber == null || oldVersionNumber == "") {
        ignoreFirstRun = true;
    }

    // load the default preferences (only the very first time that reminderfox is started; not each new window)
    var windowEnumerator =  reminderfox.core.getWindowEnumerator();
    if (windowEnumerator.hasMoreElements()) {
        var oldestWindow = windowEnumerator.getNext();

        if (window == oldestWindow ) {
            reminderfox.core.loadDefaultPreferences();  // only call the first time

            // do keybindings
            reminderfox.overlay.bindKeys();
        }
    }

    var menu = document.getElementById("contentAreaContextMenu");
    if (menu != null ) {
        menu.addEventListener("popupshowing", reminderfox.overlay.ContextMenuPopup, false);
    }

    // 2009-02-25  TB3.x  add for popupshowing handling
    var msgContext = document.getElementById("mailContext");
    if (msgContext != null)
        msgContext.addEventListener("popupshowing", reminderfox.util.popupCheck, false);

    //gW TB3 2008-05-05  add for popupshowing handling
    var msgContext = document.getElementById("messagePaneContext");
    if (msgContext != null)
        msgContext.addEventListener("popupshowing", reminderfox.util.popupCheck, false);

    var thContext = document.getElementById("threadPaneContext");
    if (thContext != null)
        thContext.addEventListener("popupshowing", reminderfox.util.popupCheck, false);

    var attContext = document.getElementById("attachmentListContext");
    if (attContext != null)
        attContext.addEventListener("popupshowing", reminderfox.util.popupCheck, false);

    var attContext = document.getElementById("attachmentItemContext");
    if (attContext != null)
        attContext.addEventListener("popupshowing", reminderfox.util.popupCheck, false);

    // initialize  Alert Slider  Timer
    reminderfox.overlay.initializeReminderFoxUpdatingTimer.notify(reminderfox.overlay.timerObject);

    // initialize rmFX News
    reminderfox.go4news.status();

    // Initialize reminder fox for the browser window
    var windowEnumerator =  reminderfox.core.getWindowEnumerator();
    if (windowEnumerator.hasMoreElements()) {
        var oldestWindow = windowEnumerator.getNext();
        if (window != oldestWindow ) {
            //  it's just a new window, we'll load it (tooltips, status bar)
            reminderfox.overlay.updateRemindersInWindow();
        }
        else {
            // if this is the first run, do not save reminders...  do not show alert slider
            if (!ignoreFirstRun ) {
                // if this is the very first window, save out the reminders to backup file(s)
                reminderfox.overlay.saveReminders();

                // open the Agenda once after starting appl
                // .... call the Agenda if user has set it in Options
                var printAgenda = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_PRINTAGENDA, false);
                if (printAgenda) { // only go if user has set it on Options/Tooltip page
                    var template = {}
                    template.value = "Agenda.xsl";
                    setTimeout(function () {rmFX_agenda.xmlPrint(template, 'XPI')}, 3000)
                }
                reminderfox.overlay.processQuickAlarms();

                // check for online --> update all known&active user/accounts
                setTimeout(function(){ reminderfox.online.status()},1000)
            }
            reminderfox.overlay.showAlertSliderTimingFunction.notify(reminderfox.overlay.alertTimerObject); //this is how we start the timer, we start off by running the callback, then from there every X specified minutes it will call
        }
    }
}


reminderfox.overlay.showAlertSliderTimingFunction = {
    notify: function (timer) {
        reminderfox.overlay.showAlertSlider();

        var alert_timeout = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERT_TIMEOUT, 0);
        if (alert_timeout > 0) {
            // convert from minutes to milliseconds
            alert_timeout = alert_timeout * 60000;

            // do stuff here, this stuff will finish and then timer will start countdown of myTimerInterval.
            // This is nice because if used TYPE_REPEATING_PRECISE will trigger this call back every myTimerInterval.
            // TYPE_REPEATING_PRECISE_SKIP will trigger this call back every myTimerInterval, but if myTimerInterval
            // is up and the callback from last time myTimerInterval went off is still running, it will skip running
            // this call back.
            // TYPE_REPEATING_SLACK i don't trust because on MDN they said
            // "note that this is not guaranteed: the timer can fire at any time."
            // so I go with TYPE_ONE_SHOT.
            timer.initWithCallback(reminderfox.overlay.showAlertSliderTimingFunction,
                alert_timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
        }
    }
}


reminderfox.overlay.getTimeString= function( reminder, date ) {
    var timeString = null;
    var reminderDate = date;
    if (reminder != null && date == null ) {
        reminderDate = reminder.date;
    }
    if (reminder == null || !reminder.allDayEvent ) {
        try {
            var hours = reminderDate.getHours();
            var AMorPM;
            var use24HourTime = reminderfox.core.getPreferenceValue(reminderfox.consts.USE_24_HOUR_TIME, false);

            if (use24HourTime ) {
                AMorPM = "";
                if (hours < 10 ) {
                    hours = "0" + hours;
                }
            }
            else {
                AMorPM  =reminderfox.string("rf.add.time.PM");
                if (AMorPM != "" ) {
                    if (hours < 12 ) {
                        AMorPM = reminderfox.string("rf.add.time.AM");
                    }
                    if (hours == 0 ) {
                        hours = 12;
                    }
                    if (hours >= 13 ) {
                        hours = hours -12;
                    }
                }
            }

            var minutes = reminderDate.getMinutes();
            if (minutes < 10) {
                minutes = "0" + minutes;
            }

            timeString = hours + reminderfox.string("rf.add.time.delimiter") + minutes;
            if (AMorPM != "" ) {
                timeString = timeString + " " + AMorPM;
            }
        }
        catch (e ) {
        }
    }
    return timeString;
}

reminderfox.overlay.populateReminderLabel= function( reminder , template, date) {
    var reminderLabel = template;

    // Replace the [variables]
    var startBracketIndex =reminderLabel.indexOf("[");
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
                if (variable == "time" && decodedVariableLength == 0 ) {
                    // trim the () from around time if the time is empty (all-day event)
                    if (reminderLabel.charAt( startBracketIndex - 1 ) == "(" &&
                        reminderLabel.charAt( endBracketIndex + 1 ) == ")"  ) {
                        startTrim = startTrim - 1;
                        endTrim = endTrim + 1;
                    }
                }
                reminderLabel = reminderLabel.substring(0, startTrim) + decodedVariable + reminderLabel.substring(endTrim + 1, reminderLabel.length);
                startBracketIndex = reminderLabel.indexOf("[", startBracketIndex + decodedVariableLength);
            }
        }
        else {
            // no ending bracket....  break out.
            startBracketIndex = -1;
        }
    }
    return reminderLabel;
}

reminderfox.overlay.getDaysUntilDate= function( targetDate ) {
    var currentDate = new Date();
    var date = new Date( targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() );
    date.setHours( 0, 0, 0 );
    currentDate.setHours( 0, 0, 0 );

    // The number of milliseconds in one day
    var ONE_DAY = 1000 * 60 * 60 * 24

    // Convert both dates to milliseconds
    var date1_ms = date.getTime()
    var date2_ms = currentDate.getTime()

    // Calculate the difference in milliseconds
    var difference_ms = Math.abs(date1_ms - date2_ms)

    // Convert back to days and return
    return Math.round(difference_ms/ONE_DAY)
}

reminderfox.overlay.decodeReminderLabelVariable= function(reminder, variable, date) {
    var decodedVariable = "";

    function dVal(n) {
        return (n < 10) ? ("0" + n) : n;
    }

    switch (variable) {
        case "reminderDesc":
            decodedVariable = reminder.summary;
            break;
        case "longDay":
            if (date != null ) {
                decodedVariable = reminderfox.overlay.integerToLongDay(date.getDay());
            }
            break;
        case "shortDay":
            if (date != null ) {
                decodedVariable = reminderfox.overlay.integerToShortDay(date.getDay());
            }
            break;
        case "longMonth":
            if (date != null ) {
                decodedVariable = reminderfox.overlay.integerToLongMonth(date.getMonth());
            }
            break;
        case "shortMonth":
            if (date != null ) {
                decodedVariable = reminderfox.overlay.integerToShortMonth(date.getMonth());
            }
            break;
        case "numMonth":
            if (date != null ) {
                decodedVariable = (date.getMonth() +1)  + "";
            }
            break;
        case "numMonth2":
            if (date != null ) {
                decodedVariable = dVal(date.getMonth() +1) + "";
            }
            break;
        case "date":
            if (date != null ) {
                decodedVariable = (date.getDate()) + "";
            }
            break;
        case "date2":
            if (date != null ) {
                decodedVariable = dVal(date.getDate()) + "";
            }
            break;
        case "longYear":
            if (date != null ) {
                decodedVariable = date.getFullYear() + "";
            }
            break;
        case "shortYear":
            if (date != null ) {
                var fullYear = date.getFullYear() + "";
                decodedVariable = fullYear.substring(2);
            }
            break;
        case "time":
            if (date != null ) {
                if (reminder != null ) {
                    if (reminder.allDayEvent)
                        decodedVariable = "";
                    else
                        decodedVariable = reminderfox.overlay.getTimeString(reminder, date);
                }
                else {
                    decodedVariable = "";
                }
            }
            break;
        case "daysUntil":
            if (date != null ) {
                decodedVariable = reminderfox.overlay.getDaysUntilDate( date );
            }
            break;
        case "timeUntil":
            if (date != null ) {
                decodedVariable = reminderfox.overlay.getTimeUntilDate( date, reminder );
            }
            break;
        case "category":
            if (reminder.categories != null ) {
                decodedVariable = reminder.categories;
            }
            break;
        case "location":
            if (reminder.location != null ) {
                decodedVariable = reminder.location;
            }
            break;
        default:
            decodedVariable = "[" + variable + "]";
            break;
    }
    return decodedVariable;
}


reminderfox.overlay.getTimeUntilDate= function(targetDate, reminder){
    var currentDate = new Date();
    var date = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), targetDate.getHours(), targetDate.getMinutes());

    var ONE_DAY = 1000 * 60 * 60 * 24

    // Convert both dates to milliseconds
    var date1_ms = date.getTime()
    var date2_ms = currentDate.getTime()

    // Calculate the difference in milliseconds
    var difference_ms = date1_ms - date2_ms;
    if (difference_ms < 0) {
        return ""; // this time has already passed
    }
    var days = (difference_ms / ONE_DAY)
    var returnval = "";

    if (days > 1) {
        var daysUntil = reminderfox.overlay.getDaysUntilDate(targetDate);
        if (daysUntil == 1) {
            return daysUntil + " " + reminderfox.string("rf.reminderoptions.notify.day.label");
        }
        else {
            return daysUntil + " " + reminderfox.string("rf.reminderoptions.notify.days.label");
        }
    }
    else {
        // it's an all-day reminder.  Say '1 day' as smallest increment
        if (reminder != null && reminder.allDayEvent) {
            return "1" + " " + reminderfox.string("rf.reminderoptions.notify.day.label");
        }

        //It's less than a day, try hours
        var ONE_HOUR = 1000 * 60 * 60
        var hours = (difference_ms / ONE_HOUR)
        if (hours > 1) {
            if (Math.round(hours) == 1)
                returnval = Math.round(hours) + " " + reminderfox.string("rf.reminderoptions.notify.hour.label");
            else
                returnval = Math.round(hours) + " " + reminderfox.string("rf.reminderoptions.notify.hours.label");
        }
        else {
            //It's less than an hour, showm minutes
            var ONE_MINUTE = 1000 * 60
            var minutes = (difference_ms / ONE_MINUTE);
            if (Math.round(minutes) == 1)
                returnval = Math.round(minutes) + " " + reminderfox.string("rf.reminderoptions.notify.minute.label");
            else
                returnval = Math.round(minutes) + " " + reminderfox.string("rf.reminderoptions.notify.minutes.label");
        }
    }
    return returnval
}


reminderfox.overlay.integerToShortDay= function(dayOfWeek){
    return ((dayOfWeek > -1) && (dayOfWeek <7)) ? reminderfox.string("rf.options.day." + dayOfWeek +".name.Mmm") : "";
}

reminderfox.overlay.integerToLongDay= function(dayOfWeek){
    return ((dayOfWeek > -1) && (dayOfWeek <7)) ? reminderfox.string("rf.options.day." + dayOfWeek +".name") : "";
}

reminderfox.overlay.integerToLongMonth= function(monthOfYear){
    return ((monthOfYear > -1) && (monthOfYear <13)) ? reminderfox.string("rf.options.month." + monthOfYear +".name") : "";
}

reminderfox.overlay.integerToShortMonth= function(monthOfYear){
    return ((monthOfYear > -1) && (monthOfYear <13)) ? reminderfox.string("rf.options.month." + monthOfYear +".Mmm") : "";
}

/**
 * Add Reminder with [bow] on main menu bar of app (FX/TB)
 * Clipboard may contain VEVENT or VTODO data; only the first element
 * will be added to the "Add Event/Todo" dialog.
 */
reminderfox.overlay.quickAddReminder= function(){

    var newEventToBeAdded = null;
    var isTodo = false; //gWAddEvent via Clipboard  2010-08-27

    var clipboardData = reminderfox.util.copyTextfromClipboard();
    if (clipboardData != null) {
        if (clipboardData.indexOf("BEGIN:VEVENT") != -1 ||
            clipboardData.indexOf("BEGIN:VTODO") != -1) {
            var reminderEvents = new Array();
            var reminderTodosArr = new Array();

            reminderfox.core.readInRemindersAndTodosICSFromString(reminderEvents, reminderTodosArr, clipboardData, false /*ignoreExtraInfo*/);
            if (reminderEvents[0] != null) {
                newEventToBeAdded = reminderEvents[0];
            }
            else {
                // get VTODO - the first only
                for (var list in reminderTodosArr) {
                    newEventToBeAdded = reminderTodosArr[list][0];
                    isTodo = true;
                    break;
                }
            }
        }
    }

    if (newEventToBeAdded == null) {
        var newDate = new Date();
        var reminderId = reminderfox.core.generateUniqueReminderId(newDate);
        newEventToBeAdded = new reminderfox.core.ReminderFoxEvent(reminderId, newDate, null);
        reminderfox.core.addReminderHeadlessly(newEventToBeAdded);
    }
    else {
        // addding from clipboard
        reminderfox.core.addReminderHeadlessly(newEventToBeAdded, true /*isEdit*/, isTodo);
    }
}

/**
 * hide context menu if user set it with Options
 */
reminderfox.overlay.popupCheckAddSubscribe = function(){
    var addReminderMenuItem = document.getElementById("reminderfox_addReminder");
    var contextMenusEnabled = reminderfox.core.getPreferenceValue(reminderfox.consts.ENABLE_CONTEXT_MENUS, true);

    addReminderMenuItem.hidden = contextMenusEnabled;

    var details = reminderfox.util.selectionDetails()
    //if (details.url == null) addReminderMenuItem.disabled = true
}


/**
 * Open calendar widget from TB main menu button
 */
reminderfox.overlay.showCalendarWidget= function(event, element){
    var calendar = document.getElementById("reminderfox-calendar-popup");
    calendar.showPopup(element, event.screenX, event.screenY, "bottomleft", "topleft");
}

/**
 * Opens the Calendar Widget with focus to 'today'
 */
reminderfox.overlay.showCalendar= function(event){

// prevent double loading of "chrome://reminderfox/content/addReminderDialog.js"
    reminderfox.util.JS.dispatch('addDialog0');


    var show = false;
    if (event == null) {
        show = true;
    }
    else {
        var target = event.target.getAttribute("id");
        if (target == "reminderfox-calendar-popup") {
            // if the target is not the popup (it could be a tooltip) we ignore it
            show = true;
        }
    }
    if (show) {
        var topWindow = reminderfox.util.getWindow("window:reminderFoxEdit");

        // make sure to fetch data from open RmFx dialog
        if ((topWindow != null) && (topWindow.reminderfox.core.reminderFoxEvents != null)) {
            reminderfox.core.reminderFoxEvents = topWindow.reminderfox.core.reminderFoxEvents;
            reminderfox.core.reminderFoxTodosArray = topWindow.reminderfox.core.reminderFoxTodosArray;

            reminderfox.core.numDaysEvents = topWindow.reminderfox.core.numDaysEvents;
            reminderfox.core.numDaysTodos = topWindow.reminderfox.core.numDaysTodos;
        } else {
            reminderfox.core.getReminderEvents(true /*clear*/);
        }

        reminderfox.calendar.ui.selectDay('today', true /* widget*/);
    }
}


reminderfox.overlay.ContextMenuPopup= function(){
    var addReminderMenuItem = document.getElementById("reminderfox_addReminder");
    var subscribeReminderMenuItem = document.getElementById("reminderfox_subscribeReminder");

    var contextMenusEnabled = reminderfox.core.getPreferenceValue(reminderfox.consts.ENABLE_CONTEXT_MENUS, true);

    // user doesn't want context menus; hide them
    if (!contextMenusEnabled) {
        addReminderMenuItem.hidden = true;
        subscribeReminderMenuItem.hidden = true;
        return;
    }

    addReminderMenuItem.hidden = false;
    subscribeReminderMenuItem.hidden = false;


    if (gContextMenu.onLink) {
        addReminderMenuItem.hidden = true;
        subscribeReminderMenuItem.hidden = true;

        // show subscribe context item if a calendar-type link
        var currentLink = gContextMenu.link.href;
        if (currentLink != null) {
            if (currentLink.indexOf("webcal") != -1 ||
                currentLink.indexOf("ical") != -1 ||
                currentLink.indexOf("ics") != -1) {
                subscribeReminderMenuItem.hidden = false;
            }
        }
    }
    else {
        addReminderMenuItem.hidden = false;
        subscribeReminderMenuItem.hidden = true;
    }
}



reminderfox.overlay.alarm_Infos = function(alarmInfos) {
	var infos = "";
	try {
		for (var k = 0; k < alarmInfos.length; k++) {
			cInfo = alarmInfos[k];
			infos += "\n  ## >" + cInfo.alarmRecentReminder.summary + "< "
			infos += "  date >" + rmFXtDate(cInfo.alarmRecentReminder.date) + "<"
			infos += "  alarm:" + (cInfo.alarmRecentReminder.alarm)
			infos += "  alarmLastAck:" + rmFXtDate(cInfo.alarmRecentReminder.alarmLastAcknowledge)
			infos += "  lastMod:" + (cInfo.alarmRecentReminder.lastModified)
			infos += "  completedDate:" + rmFXtDate(cInfo.alarmRecentReminder.completedDate)
			infos += "  snoozeTime:" + (cInfo.alarmRecentReminder.snoozeTime)
			infos += "  ruc:" + (cInfo.alarmRecentReminder.remindUntilCompleted)
			infos += "  reminderTime:" + rmFXtDate(cInfo.reminderTime)
			infos += "  reminderTimeDiff:" + (cInfo.reminderTimeDifference)
			infos += "\n current  instance reminder -->" + rmFXtDate(cInfo.alarmRecentReminder.currentInstance) + "<---"
			infos += "\n reminder Instance Date     -->" + rmFXtDate(cInfo.reminderInstanceDate) + "<---"

			infos += "\n"
		}
	} catch (e) {}
	return infos
}

reminderfox.overlay.reminder_Infos = function(iReminder) {
	var infos = "";
	try {
		infos += iReminder.summary
		infos += " - " + rmFXtDate(iReminder.date)
		infos += "  alarm:" + (iReminder.alarm)
		infos += "  alarmLastAck:" + rmFXtDate(iReminder.alarmLastAcknowledge)
		infos += "  lastModified:" + (iReminder.lastModified)
		infos += "  completedDate:" + rmFXtDate(iReminder.completedDate)
		infos += "  snoozeTime:" + (iReminder.snoozeTime)
		infos += "  ruc:" + (iReminder.remindUntilCompleted)
		infos += "\n"
	} catch (e) {}
	return infos
}


function rmFXtDate(i) {
   if (i == null) return new Date().toLocaleString()
	return new Date(+i).toLocaleString()
}
