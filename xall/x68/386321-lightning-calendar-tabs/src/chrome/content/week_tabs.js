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

	LightningCalendarTabs.weekTabs = function(pastCount, futureCount, otherDateTabEnabled) {
		LightningCalendarTabs.tabs.call(this, otherDateTabEnabled);
		this.periodType = LightningCalendarTabs.tabUtils.PERIOD_WEEK;

		this.pastWeeks = pastCount;
		this.futureWeeks = futureCount;
	};
	
	LightningCalendarTabs.weekTabs.prototype = Object.create(LightningCalendarTabs.tabs.prototype);
	LightningCalendarTabs.weekTabs.prototype.constructor = LightningCalendarTabs.weekTabs;

	LightningCalendarTabs.weekTabs.prototype.show = function(tabs) {
		LightningCalendarTabs.tabs.prototype.show.call(this);
		
		var calendarToday = LightningCalendarTabs.tabUtils.getCalendarToday();
		if (calendarToday) {
			var date = LightningCalendarTabs.tabUtils.resetDateToWeekStart(calendarToday);

			for(var i = - this.pastWeeks; i <= this.futureWeeks; i++) {
				var dateStart = date.clone();
				dateStart.day+= i * 7;

				var tab = document.createXULElement("tab");
				this.makeTabLabel(tab, dateStart);

				LightningCalendarTabs.tabUtils.prepareTabVisual(tab, i, dateStart, this.periodType);

				tab.addEventListener("click", (function(self, date) {
					return function() {
						self.selectWeek(date);
					};
				})(this, dateStart), false);
				tabs.appendChild(tab);

				this.tabs.push({
					"tab" : tab,
					"date" : dateStart
				});
			}
		}
	};

	LightningCalendarTabs.weekTabs.prototype.highlightCurrent = function(tabs) {
		var dateStart = LightningCalendarTabs.tabUtils.getCalendarStartDate();
		if (dateStart) {
			var jsDateStart = LightningCalendarTabs.tabUtils.resetDateToWeekStart(dateStart);
			this.updateTabsState(tabs, jsDateStart);
		}
	};

	LightningCalendarTabs.weekTabs.prototype.selectWeek = function(date) {
		currentView().goToDay(date);
	};

	LightningCalendarTabs.weekTabs.prototype.dateEqual = function(a, b) {
		return a.day == b.day && a.month == b.month && a.year == b.year;
	};
	
	LightningCalendarTabs.weekTabs.prototype.makeTabLabel = function(tab, dateStart) {
		var dateEnd = dateStart.clone();
		dateEnd.day+= 6;
		dateStart.isDate = true;
		dateEnd.isDate = true;
		tab.setAttribute("label", this.formatter.formatInterval(dateStart, dateEnd));
	};

})();
