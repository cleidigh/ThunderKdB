var prefRoot = "extensions.purgeevents.";
var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(prefRoot);
var purgePlusDisabeled = false;
var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);

var purgeStringsBundle = sbs.createBundle("chrome://purgeevents/locale/purge.properties");

Components.utils.import("resource://gre/modules/AddonManager.jsm");
AddonManager.getAddonByID("{e2fda1a4-762b-4020-b5ad-a41df1933103}", function(lightning) {
	if(!lightning || !lightning.isActive){
		purgePlusDisabeled = true;
		setTimeout(function (){lightningWarn();}, 1000);
	}else{
		setTimeout(function (){autoPurge();}, 3000);
		setTimeout(function (){newCal();}, 3001);
	}
});

function lightningWarn(){
		AddonManager.getAddonByID("{2d686c2a-3eeb-4aa1-a8a4-aaf6214c79a6}", function(purgeplus) {
		purgeplus.userDisabled = true;
	});
	alert(purgeStringsBundle.GetStringFromName('lightningwarn'));
	var boot=Components.classes['@mozilla.org/toolkit/app-startup;1'].getService(Components.interfaces.nsIAppStartup);
	boot.quit(Components.interfaces.nsIAppStartup.eForceQuit|Components.interfaces.nsIAppStartup.eRestart);
}

function newCal(){
	const calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
	var calendars;
	var newCal = false;
	calendars = calendarManager.getCalendars({});
	for (var i = 0; i < calendars.length; i++) {
		try{
			JSON.parse(prefManager.getCharPref("cal" + calendars[i].id));
		} catch(e) {
			alert(purgeStringsBundle.GetStringFromName('NewCalFound').replace(/(%calendarname%)/, calendars[i].name ));
			newCal = true;
		}
	}
	if(newCal)
		openSettingDia();
}

function getSettings(calendarID) {  //get saved Preferences
	var set ={};
	try{
		set = JSON.parse(prefManager.getCharPref("cal" + calendarID));
		if(set.version==1){set.noUnlockWarn = false;}
	} catch(e) {
		set.unit = 2;
		set.num = 6;
		set.activ = false;
		set.noUnlockWarn = false;
		set.version = 2;
	}
	return set;
}

function openPurgeNowDia(){
	if(purgePlusDisabeled){
		lightningWarn();
		return;
	}
	openDialog("chrome://purgeevents/content/purgeeventsPurgeNow.xul", null ,"centerscreen, modal");
	return;
}

function openSettingDia(){
	if(purgePlusDisabeled){
		lightningWarn();
		return;
	}
	openDialog("chrome://purgeevents/content/purgeeventsSettings.xul", null ,"centerscreen, modal");
	return;
}

function autoPurge(){
	var now = new Date();
	if(prefManager.getIntPref("nextPurge")< now.getTime() / 1000){
		const calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
		var calendars = calendarManager.getCalendars({});
		for (calendar of calendars){
			var set = getSettings(calendar.id);
			if(set.activ == true){
				gatherAndDeleteEvents(calendar, getTime(set.num, set.unit))
			}
		}
		prefManager.setIntPref("nextPurge", now.getTime() / 1000 + 30*24*60*60);
	}
	setTimeout(function (){autoPurge();}, prefManager.getIntPref("nextPurge") * 1000 - now.getTime() + 1000);
	return;
}

function gatherAndDeleteEvents(aCalendar, time){	//manages cleanup for calender
	var readOnly = aCalendar.readOnly;
	var set = getSettings(aCalendar.id);
	if(readOnly && !set.noUnlockWarn){
		if(!confirm(purgeStringsBundle.GetStringFromName('GADReadOnlyQuestion').replace(/(%calendarname%)/, aCalendar.name)))
			return;
	}
	aCalendar.readOnly = false;
	var itemArray = [];
    var getListener = {
		onOperationComplete: function(aCalendar, aStatus, aOperationType, aId, aDetail)
		{
		var count = purgeEvents(itemArray, aCalendar, time);
		aCalendar.readOnly = readOnly;
			if(count >= 0){
				alert(purgeStringsBundle.GetStringFromName('GADcleanupInfo').replace(/(%calendarname%)/, aCalendar.name ).replace(/(%number%)/, count));
			}else{
				alert(purgeStringsBundle.GetStringFromName('GADerrorpurging').replace(/(%calendarname%)/, aCalendar.name));
			}
			return;
		},
		onGetResult: function(aCalendar, aStatus, aItemType, aDetail, aCount, aItems)
		{
			for (item of aItems) {
				itemArray.push(item);   
			}
		}
	};

	function getItemsFromCal(aCal) {
		aCal.getItems(Components.interfaces.calICalendar.ITEM_FILTER_ALL_ITEMS,0, null, null, getListener);
	}
	getItemsFromCal(aCalendar);
}

function purgeEvents(items, itemCalendar, time) {		//finally checks every event for deletion
	if(time < 0)
		return -1;
	var aDate = new Date(time);
	var count = 0;
	//var cd = Components.classes["@mozilla.org/calendar/datetime;1"].createInstance(Components.interfaces.calIDateTime);
	//alert(aDate.getFullYear()+'.'+aDate.getMonth()+'.'+aDate.getDate());
	var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
	loader.loadSubScript("chrome://calendar/content/calUtils.js");
	//cd.resetTo(aDate.getFullYear(),aDate.getMonth(),aDate.getDate(),0,0,0,DateUTC());
	//cd.isDate = true;
	//Move the items and set a property for the calendar they were deleted from
	for (item of items) {
		if(item.CAL_TODO_STATUS_COMPLETED != null){ //todos only
			if(item.completedDate!=null && item.completedDate.nativeTime < time*1000){
				itemCalendar.deleteItem(item, null);
				count++;
			}
		}else{ //calendar Event only
			if (item.endDate.nativeTime < time*1000) {
				if(item.recurrenceInfo == null){	//non recurring
					itemCalendar.deleteItem(item, null);
					count++;
				//}else if(item.recurrenceInfo.getNextOccurrence(cd)==null){
				//	itemCalendar.deleteItem(item, null);
				//	count++;
				}
			}
		}
	}
	return count;
}

function getTime(number, unit) { //return timestamp (in ms) from date before which to be deleted
	var now = new Date();
	var days = number;
	if(days < 0)
		unit = -1;
	switch (unit) {
		case 0:
			break;
		case 1: 
			days = days * 7;
			break;
		case 2:
			days = days * 30;
			break;
		case 3:
			days = days * 365;
			break;
		default:
			return -1;
	}
	return now - days * 1000*60*60*24;
}