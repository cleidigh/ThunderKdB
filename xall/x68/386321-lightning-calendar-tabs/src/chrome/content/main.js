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

    var lct, prefListener, prefListenerWeekStart;

	/**
	 * initialize addon
	 */
    LightningCalendarTabs.init = function (win) {
        LightningCalendarTabs.win = win;
        lct = new LightningCalendarTabs.tabsController();
        lct.startup();

        prefListener = new LightningCalendarTabs.prefObserver("extensions.lightningcalendartabs.tabs.",
            function (branch, name) {
                lct.updatePrefs();
            }
        );
        prefListener.register();
        prefListenerWeekStart = new LightningCalendarTabs.prefObserver("calendar.week.start",
            function (branch, name) {
                lct.updatePrefs();
            }
        );
        prefListenerWeekStart.register();
    };

    /**
     * remove addon from GUI
     */
    LightningCalendarTabs.cleanup = function () {
        prefListenerWeekStart.unregister();
        prefListener.unregister();
        lct.shutdown();
    };

})();