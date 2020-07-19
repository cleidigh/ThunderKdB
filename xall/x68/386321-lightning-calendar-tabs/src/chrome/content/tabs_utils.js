"use strict";
var { Preferences } = ChromeUtils.import("resource://gre/modules/Preferences.jsm");

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

	LightningCalendarTabs.tabUtils = LightningCalendarTabs.tabUtils || {};

	LightningCalendarTabs.tabUtils.PERIOD_WEEK = "week";
	LightningCalendarTabs.tabUtils.PERIOD_MULTIWEEK = "multiweek";
	LightningCalendarTabs.tabUtils.PERIOD_MONTH = "month";
	LightningCalendarTabs.tabUtils.PERIOD_DAY = "day";

	LightningCalendarTabs.tabUtils.prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);
	
	LightningCalendarTabs.tabUtils.prepareTabVisual = function(tab, i, date, periodType) {
		var prefs = LightningCalendarTabs.tabUtils.prefs;
		var classNames = "";

		//color for the previous, current and past tab
		if(i == 0) {
			classNames = "current";
			tab.style.color = prefs.getCharPref("extensions.lightningcalendartabs.tabs.text_color_current");
		} else if(i < 0) {
			classNames = "past";
			tab.style.color = prefs.getCharPref("extensions.lightningcalendartabs.tabs.text_color_past");
		} else if(i > 0) {
			classNames = "future";
			tab.style.color = prefs.getCharPref("extensions.lightningcalendartabs.tabs.text_color_future");
		}

		//color for new period tab
		var newPeriodColor = prefs.getCharPref("extensions.lightningcalendartabs.tabs.text_color_new_period");
		var tmp = date.clone();
		switch(periodType) {
			case this.PERIOD_WEEK: {
				//contains first day of month
				tmp.day+= 7;
				if(date.month != tmp.month || date.day == 1) {
					tab.style.color = newPeriodColor;
				}
			} break;
			case this.PERIOD_MULTIWEEK: {
				//contains new year
				var weekCount = Preferences.get("calendar.weeks.inview", 4);
				tmp.day+= ((weekCount - 1) * 7) + 6;
				if(date.year != tmp.year || (date.month == 0 && date.day == 1)) {
					tab.style.color = newPeriodColor;
				}
			} break;
			case this.PERIOD_MONTH: {
				//first month of year
				if(date.month == 0) {
					tab.style.color = newPeriodColor;
				}
			} break;
			case this.PERIOD_DAY: {
				//first day of week
				var weekStartDay = Preferences.get("calendar.week.start", 0);
				if(date.weekday == weekStartDay) {
					tab.style.color = newPeriodColor;
				}
			} break;
		}

		tab.setAttribute("class", classNames);
	};

	LightningCalendarTabs.tabUtils.getCalendarToday = function() {
		return LightningCalendarTabs.win.currentView().today();
	}

	LightningCalendarTabs.tabUtils.getCalendarStartDate = function() {
		return LightningCalendarTabs.win.currentView().rangeStartDate;
	}
	
	LightningCalendarTabs.tabUtils.resetDateToWeekStart = function(date) {
		var weekStartDay = Preferences.get("calendar.week.start", 0);
		var tmp = date.clone();
		tmp.day-= (tmp.weekday - weekStartDay + 7) % 7;
		return tmp;
	};


})();
