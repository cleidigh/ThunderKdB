"use strict";
Components.utils.import("resource://gre/modules/Preferences.jsm");
/*
    This file is part of Lightning Calendar Tabs extension.

    Lightning Calendar Tabs is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Lightning Calendar Tabs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Lightning Calendar Tabs.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
	Lightning Calendar Tabs

	a plugin to add tabs in calendar view into Lightning calendar plugin for Mozilla Thunderbird
	(c) 2012, Jiri Lysek

	jlx@seznam.cz
*/

var LightningCalendarTabs = LightningCalendarTabs || {};

(function() {

	LightningCalendarTabs.multiWeekTabs = function(pastCount, futureCount, otherDateTabEnabled) {
		LightningCalendarTabs.tabs.call(this, otherDateTabEnabled);
		this.periodType = LightningCalendarTabs.tabUtils.PERIOD_MULTIWEEK;
		this.pastTabs = pastCount;
		this.futureTabs = futureCount;
	};
	
	LightningCalendarTabs.multiWeekTabs.prototype = Object.create(LightningCalendarTabs.tabs.prototype);
	LightningCalendarTabs.multiWeekTabs.prototype.constructor = LightningCalendarTabs.multiWeekTabs;

	LightningCalendarTabs.multiWeekTabs.prototype.show = function(tabs) {
		LightningCalendarTabs.tabs.prototype.show.call(this);
		
		var weekPrev = Preferences.get("calendar.previousweeks.inview", 1);

		var calendarToday = LightningCalendarTabs.tabUtils.getCalendarToday();
		if(calendarToday) {
			var date = LightningCalendarTabs.tabUtils.resetDateToWeekStart(calendarToday);
			date.day-= weekPrev * 7;

			for(var i = - this.pastTabs; i <= this.futureTabs; i++) {
				var dateStart = date.clone();
				dateStart.day+= i * 7;

				var dateRealStart = dateStart.clone();
				dateRealStart.day+= weekPrev * 7;

				var tab = document.createXULElement("tab");
				this.makeTabLabel(tab, dateStart);

				LightningCalendarTabs.tabUtils.prepareTabVisual(tab, i, dateStart, this.periodType);

				tab.addEventListener("click", (function(self, date) {
					return function() {
						self.selectWeeks(date);
					};
				})(this, dateRealStart), false);
				tabs.appendChild(tab);

				this.tabs.push({
					"tab" : tab,
					"date" : dateStart
				});
			}
		}
	};

	LightningCalendarTabs.multiWeekTabs.prototype.highlightCurrent = function(tabs) {
		var dateStart = LightningCalendarTabs.tabUtils.getCalendarStartDate();
		if(dateStart) {
			var jsDateStart = LightningCalendarTabs.tabUtils.resetDateToWeekStart(dateStart);
			this.updateTabsState(tabs, jsDateStart);
		}
	};

	LightningCalendarTabs.multiWeekTabs.prototype.selectWeeks = function(date) {
		currentView().goToDay(date);
	};

	LightningCalendarTabs.multiWeekTabs.prototype.dateEqual = function(a, b) {
		return a.day == b.day && a.month == b.month && a.year == b.year;
	};
	
	LightningCalendarTabs.multiWeekTabs.prototype.makeTabLabel = function(tab, dateStart) {
		var weekCount = Preferences.get("calendar.weeks.inview", 4);
		var dateEnd = dateStart.clone();
		dateEnd.day+= ((weekCount - 1) * 7) + 6;
		dateStart.isDate = true;
		dateEnd.isDate = true;
		tab.setAttribute("label", this.formatter.formatInterval(dateStart, dateEnd));
	};

})();