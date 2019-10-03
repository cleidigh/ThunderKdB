var prefRoot = "extensions.purgeevents.";
var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(prefRoot);
var sbs = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
var purgeStringsBundle = sbs.createBundle("chrome://purgeevents/locale/purge.properties");

function initDialogGlobal() {		//Initialisation for all Dialogs
	//purgeStringsBundle = document.getElementById("string-bundle-purge");
	{ //load calendar list
		const calendarManager = Components.classes["@mozilla.org/calendar/manager;1"].getService(Components.interfaces.calICalendarManager);
		var listbox = document.getElementById("calendar-list");
		var calendars;
		
		calendars = calendarManager.getCalendars({});
		
		//calendars = sortCalendarArray(calendars);

		for (var i = 0; i < calendars.length; i++) {
			var calendar = calendars[i];
			var listItem = document.createElement("listitem");

			var colorCell = document.createElement("listcell");
			try {
				var calColor = calendar.getProperty('color');
				colorCell.style.background = calColor || "#a8c2e1";
			} catch(e) {} 
			listItem.appendChild(colorCell);

			var nameCell = document.createElement("listcell");
			nameCell.setAttribute("label", calendar.name);
			listItem.appendChild(nameCell);

			listItem.calendar = calendar;
			listbox.appendChild(listItem);
			listItem.setAttribute("flex","1");
			
		}
		if (calendars.length) {
			listbox.selectedIndex = 0;
		} else {
			document.documentElement.getButton("action").setAttribute("disabled", "true");
		}
	}
	if(document.getElementById("inputActiv") != null)
		document.getElementById("inputActiv").addEventListener('CheckboxStateChange', updateChecked, false);
	updateElements();
	return;
}

function updateChecked() {	//disable/enable inputs when autopurge checked/unchecked in settings
	if(document.getElementById("inputActiv") != null){
		if(document.getElementById("inputActiv").checked){
			document.getElementById("inputUnit").disabled = false;
			document.getElementById("inputNumber").disabled = false;
			document.getElementById("noUnlockWarn").disabled = false;
		}else{
			document.getElementById("inputUnit").disabled = true;
			document.getElementById("inputNumber").disabled = true;
			document.getElementById("noUnlockWarn").disabled = true;
			
			document.getElementById("noUnlockWarn").checked = false;
		}
	}
}

function updateElements() {	//updates elements on dialog when new calendar is selected in dialog
	var set = getSettings(document.getElementById("calendar-list").selectedItem.calendar.id);
	document.getElementById("inputUnit").selectedIndex = set.unit;
	document.getElementById("inputNumber").value = set.num;
	if(document.getElementById("inputActiv") != null){
		document.getElementById("inputActiv").checked = set.activ;
		document.getElementById("noUnlockWarn").checked = set.noUnlockWarn;
	}
	updateChecked();
	return;
}

function purgeNow() {  //action for cleanup button
	if(document.getElementById("calendar-list").selectedIndex < 0){
		alert(purgeStringsBundle.GetStringFromName('PNnoCal'));
		return
	}
	var calendar = document.getElementById("calendar-list").selectedItem.calendar;
	var time = getTime(parseInt(document.getElementById("inputNumber").value), parseInt(document.getElementById("inputUnit").value));
	gatherAndDeleteEvents(calendar, time);
	return;
}

function applySettings() {  //saves enterd values to Preferences
	var set = {};
	var calendarID = document.getElementById("calendar-list").selectedItem.calendar.id;
	if(document.getElementById("inputActiv")==null){
		set = getSettings(calendarID);
	}else{
		set.activ = document.getElementById("inputActiv").checked;
		set.noUnlockWarn = document.getElementById("noUnlockWarn").checked;
	}
	set.num = parseInt(document.getElementById("inputNumber").value);
	set.unit = parseInt(document.getElementById("inputUnit").value);
	set.version = 2;
	prefManager.setCharPref("cal" + calendarID, JSON.stringify(set));
	if(document.getElementById("inputActiv") != null && document.getElementById("inputActiv").checked)
		alert(purgeStringsBundle.GetStringFromName('AutoPurgeWarning'));
	return;
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
	loader.loadSubScript("chrome://calendar/content/calApplicationUtils.js");
	//cd.resetTo(aDate.getFullYear(),aDate.getMonth(),aDate.getDate(),0,0,0,itemCalendar.getTimeZone());
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