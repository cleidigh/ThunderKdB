"use strict";

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

(function () {

	//var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
	//Services.console.logStringMessage("LCT: start");

	LightningCalendarTabs.tabsController = function () {
		this.arrowscrollbox = null;
		this.tabBox = null;
		this.tabs = null;

		this.monthTabs = null;
		this.multiWeekTabs = null;
		this.weekTabs = null;
		this.dayTabs = null;

		this.prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch);

		this.currentTabs = null;
		this.startupInProgress = false;

		this.visible = false;
	};

	/**
	 * attach events
	 *
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.startup = function () {
		this.startupInProgress = true;
		var self = this;
		var viewTabs = LightningCalendarTabs.win.document.getElementById("view-tabs");

		if (viewTabs) {
			LightningCalendarTabs.win.getViewBox().addEventListener("viewloaded", function (event) {
				self.decideTabsVisibility();
			}, false);
			LightningCalendarTabs.win.getViewBox().addEventListener("dayselect", function () {
				self.updateTabs();
			}, false);
			//attach to lightning's tabs select event to switch tab type
			viewTabs.addEventListener("select", function () {
				self.decideTabsVisibility();
			});
			this.createTabBox();

			this.initializeTabControllers();
		} else {
			setTimeout(function () {
				self.startup();
			}, 1000);
		}
		this.startupInProgress = false;
	};

	LightningCalendarTabs.tabsController.prototype.shutdown = function () {
		var calendar = LightningCalendarTabs.win.document.getElementById("calendar-view-box");
		calendar.removeChild(this.arrowscrollbox);
	};

	LightningCalendarTabs.tabsController.prototype.initializeTabControllers = function () {
		this.monthsEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.months.enabled");
		this.multiWeeksEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.multiweeks.enabled");
		this.weeksEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.weeks.enabled");
		this.daysEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.days.enabled");
		this.otherDateTabEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.show_other_tab");

		if (this.monthsEnabled) {
			this.pastMonths = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.months.past"));
			this.futureMonths = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.months.future"));

			this.monthTabs = new LightningCalendarTabs.monthTabs(this.pastMonths, this.futureMonths, this.otherDateTabEnabled);
		} else {
			this.monthTabs = null;
		}

		if (this.multiWeeksEnabled) {
			this.pastMultiWeeks = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.multiweeks.past"));
			this.futureMultiWeeks = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.multiweeks.future"));

			this.multiWeekTabs = new LightningCalendarTabs.multiWeekTabs(this.pastMultiWeeks, this.futureMultiWeeks, this.otherDateTabEnabled);
		} else {
			this.multiWeekTabs = null;
		}

		if (this.weeksEnabled) {
			this.pastWeeks = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.weeks.past"));
			this.futureWeeks = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.weeks.future"));

			this.weekTabs = new LightningCalendarTabs.weekTabs(this.pastWeeks, this.futureWeeks, this.otherDateTabEnabled);
		} else {
			this.weekTabs = null;
		}

		if (this.daysEnabled) {
			this.pastDays = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.days.past"));
			this.futureDays = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.days.future"));

			this.dayTabs = new LightningCalendarTabs.dayTabs(this.pastDays, this.futureDays, this.otherDateTabEnabled);
		} else {
			this.dayTabs = null;
		}
	};

	/**
	 * hide or show tabs depending on what user view user selected and if this tabs are enabled in options
	 *
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.decideTabsVisibility = function () {
		this.selectCurrentController();
		if (this.currentTabs !== null) {
			this.showTabBox();
		} else {
			this.hideTabBox();
		}
	};

	/**
	 * select controller depending on user selection
	 *
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.selectCurrentController = function () {
		var buttMonth = LightningCalendarTabs.win.document.getElementById("calendar-month-view-button");
		var buttWeek = LightningCalendarTabs.win.document.getElementById("calendar-week-view-button");
		var buttDay = LightningCalendarTabs.win.document.getElementById("calendar-day-view-button");
		var buttMultiWeek = LightningCalendarTabs.win.document.getElementById("calendar-multiweek-view-button");

		if (!buttMonth || !buttWeek || !buttDay || !buttMultiWeek) {
			var self = this;
			setTimeout(function () {
				self.selectCurrentController();
			}, 1000);
		} else {
			var newTabs = null;

			if (buttMonth.getAttribute("selected")) {
				newTabs = this.monthTabs;
			}
			if (buttMultiWeek.getAttribute("selected")) {
				newTabs = this.multiWeekTabs;
			}
			if (buttWeek.getAttribute("selected")) {
				newTabs = this.weekTabs;
			}
			if (buttDay.getAttribute("selected")) {
				newTabs = this.dayTabs;
			}

			if (newTabs != this.currentTabs) {
				this.hideTabBox();
				this.currentTabs = newTabs;
			}
		}
	};

	/**
	 * create tabs container in the area between calendar and view switching tabs
	 */
	LightningCalendarTabs.tabsController.prototype.createTabBox = function () {
		this.arrowscrollbox = LightningCalendarTabs.win.document.createXULElement("arrowscrollbox");
		this.arrowscrollbox.setAttribute("orient", "horizontal");
		this.arrowscrollbox.setAttribute("class", "lightning-calendar-tabs-tabs-container");

		this.tabBox = LightningCalendarTabs.win.document.createXULElement("tabbox");

		this.tabs = LightningCalendarTabs.win.document.createXULElement("tabs");

		var calendar = LightningCalendarTabs.win.document.getElementById("calendar-view-box");
		var viewDeck = LightningCalendarTabs.win.document.getElementById("view-box");

		calendar.insertBefore(this.arrowscrollbox, viewDeck);

		this.arrowscrollbox.appendChild(this.tabBox);
		this.tabBox.appendChild(this.tabs);
	};

	LightningCalendarTabs.tabsController.prototype.showTabBox = function () {
		if (!this.visible && this.currentTabs !== null && this.tabBox && this.tabs) {
			this.currentTabs.show(this.tabs);
			this.currentTabs.update(this.tabs);
			this.visible = true;
			this.tabBox.style.display = "block";
		}
	};

	LightningCalendarTabs.tabsController.prototype.hideTabBox = function () {
		if (this.visible) {
			this.clearTabBoxContent();
			this.visible = false;
		}
	};

	LightningCalendarTabs.tabsController.prototype.clearTabBoxContent = function () {
		var elementsToRemove = this.tabs.getElementsByTagName('tab');
		while (elementsToRemove.length) {
			this.tabs.removeChild(elementsToRemove[0]);
		}
		this.tabBox.style.display = "none";
	};

	/**
	 * select actual tab on day selection in calendar
	 *
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.updateTabs = function () {
		if (this.currentTabs !== null && this.tabs) {
			this.currentTabs.update(this.tabs);
		}
	};

	//--------------------------------------------------------------------------

	/**
	 * callback for options update
	 *
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.updatePrefs = function () {
		if (this.startupInProgress)
			return;
		this.initializeTabControllers();
		this.hideTabBox();
		this.selectCurrentController();
		this.showTabBox();
	};

	//--------------------------------------------------------------------------

	LightningCalendarTabs.tabs = function (otherDateTabEnabled) {
		this.tabs = [];
		this.otherDateTabEnabled = otherDateTabEnabled;
		this.otherTab = null;
		this.formatter = LightningCalendarTabs.win.cal.dtz.formatter;
	};

	LightningCalendarTabs.tabs.prototype.show = function () {
		if (this.otherDateTabEnabled) {
			this.otherTab = LightningCalendarTabs.win.document.createXULElement('tab');
			this.otherTab.collapse = true;
		}
	};

	LightningCalendarTabs.tabs.prototype.update = function (tabs) {
		this.highlightCurrent(tabs);
	};

	LightningCalendarTabs.tabs.prototype.highlightCurrent = function (tabs) {
		var dateStart = LightningCalendarTabs.tabUtils.getCalendarStartDate();
		if (dateStart) {
			this.updateTabsState(tabs, dateStart);
		}
	};

	LightningCalendarTabs.tabs.prototype.updateTabsState = function (tabs, date) {
		for (var i = 0; i < this.tabs.length; i++) {
			if (this.dateEqual(date, this.tabs[i].date)) {
				this.hideOtherTab(tabs);
				tabs.selectedIndex = i;
				return;
			}
		}
		this.updateOtherTab(tabs, date);
	};

	LightningCalendarTabs.tabs.prototype.updateOtherTab = function (tabs, date) {
		if (this.otherDateTabEnabled && this.tabs.length > 0) {
			if (date.nativeTime < this.tabs[0].date.nativeTime) {
				tabs.insertBefore(this.otherTab, tabs.firstChild);
				tabs.selectedIndex = 0;
			} else {
				tabs.appendChild(this.otherTab);
				tabs.selectedIndex = tabs.itemCount - 1;
			}
			this.makeTabLabel(this.otherTab, date);
			this.otherTab.collapsed = false;
			LightningCalendarTabs.tabUtils.prepareTabVisual(this.otherTab, tabs.selectedIndex == 0 ? -1 : 1, date, this.periodType);
		}
	};

	LightningCalendarTabs.tabs.prototype.hideOtherTab = function (tabs) {
		if (this.otherDateTabEnabled && this.otherTab.parentNode) {
			tabs.removeChild(this.otherTab);
		}
	};

})();