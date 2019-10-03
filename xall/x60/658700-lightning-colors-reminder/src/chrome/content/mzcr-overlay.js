"use strict";
Components.utils.import("chrome://ltngcolrem/content/mzcr-prefsutils.jsm");

var miczLightningColorReminders = {

	onLoad:function(){
		window.removeEventListener("load", miczLightningColorReminders.onLoad, false);

		miczLightningColorReminders.refreshAlertsColor();

		let alarmService = Components.classes["@mozilla.org/calendar/alarm-service;1"].getService(Components.interfaces.calIAlarmService);
		alarmService.addObserver(miczLightningColorReminders.alarmEventObserver);
	},

	refreshAlertsColor:function(){
		const XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		let alarmRichlist = document.getElementById("alarm-richlist");
		let parentItems = {};

		 // Make a copy of the child nodes as they get modified live
		 for (let node of Array.slice(alarmRichlist.childNodes)){
			miczLightningColorReminders.addCalendarColor(node,XUL);
		 }
	},

	addCalendarColor:function(node,XUL){
		//dump('>>>>>>> node: '+JSON.stringify(node)+'\r\n');
		//dump('>>>>>>> calendar name: '+JSON.stringify(node.item.calendar.name)+'\r\n');
		//dump('>>>>>>> calendar id: '+JSON.stringify(node.item.calendar.id)+'\r\n');
		//dump('>>>>>>> calendar color: '+JSON.stringify(node.item.calendar.getProperty("color"))+'\r\n');
		let cal_color=node.item.calendar.getProperty("color")||'a8c2e1';
		node.setAttribute('style','border-'+miczLightningColorRemindersPrefsUtils.colorPosition+':'+miczLightningColorRemindersPrefsUtils.colorThickness+'px solid '+cal_color+';');
	},

};

miczLightningColorReminders.alarmEventObserver = {
	onAlarm: function(item,alarm){
		//dump('>>>>>>> [observer] calendar name: '+JSON.stringify(item.calendar.name)+'\r\n');
		//setTimeout(miczLightningColorReminders.refreshAlertsColor,10);
		miczLightningColorReminders.refreshAlertsColor();
	},

	onRemoveAlarmsByItem:function(aItem){},
	onRemoveAlarmsByCalendar:function(aCalendar){},
	onAlarmsLoaded:function(aCalendar){}
};

window.addEventListener("load", miczLightningColorReminders.onLoad, false);
