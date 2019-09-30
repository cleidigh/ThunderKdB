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
	
	a plugin to add Calendar Tabs in month calendar view into Lightning calendar plugin for Mozilla Thunderbird
	(c) 2012, Jiri Lysek
	
	jlx@seznam.cz
*/

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var preferences = [
	{ id: "extensions.lightningcalendartabs.tabs.months.enabled", type: "bool" },
	{ id: "extensions.lightningcalendartabs.tabs.multiweeks.enabled", type: "bool" },
	{ id: "extensions.lightningcalendartabs.tabs.weeks.enabled", type: "bool" },
	{ id: "extensions.lightningcalendartabs.tabs.days.enabled", type: "bool" },

	{ id: "extensions.lightningcalendartabs.tabs.months.past", type: "int" },
	{ id: "extensions.lightningcalendartabs.tabs.months.future", type: "int" },
	{ id: "extensions.lightningcalendartabs.tabs.multiweeks.past", type: "int" },
	{ id: "extensions.lightningcalendartabs.tabs.multiweeks.future", type: "int" },
	{ id: "extensions.lightningcalendartabs.tabs.weeks.past", type: "int" },
	{ id: "extensions.lightningcalendartabs.tabs.weeks.future", type: "int" },
	{ id: "extensions.lightningcalendartabs.tabs.days.past", type: "int" },
	{ id: "extensions.lightningcalendartabs.tabs.days.future", type: "int" },

	{ id: "extensions.lightningcalendartabs.tabs.text_color_current", type: "string" },
	{ id: "extensions.lightningcalendartabs.tabs.text_color_past", type: "string" },
	{ id: "extensions.lightningcalendartabs.tabs.text_color_future", type: "string" },
	{ id: "extensions.lightningcalendartabs.tabs.text_color_new_period", type: "string" },

	{ id: "extensions.lightningcalendartabs.tabs.show_other_tab", type: "bool" },
];

var branchName = 'extensions.lightningcalendartabs.';
var branchNameLength = branchName.length;
var branch = Services.prefs.getBranch(branchName);

function load() {
	for (let pref of preferences) {
		let element = document.getElementById(pref.id);
		let prefName = pref.id.substring(branchNameLength);
		// if instant apply is wanted, add event handler for change/input
		// element.addEventListener("change", function(e) { console.log("change: " + e.currentTarget.value); } );

		switch (pref.type) {
			case "int":
				element.value = branch.getIntPref(prefName);
				break;

			case "bool":
				element.setAttribute("checked", branch.getBoolPref(prefName) ? "true" : "false");
				break;

			case "string":
				element.value = branch.getCharPref(prefName);
				break;
		}
	}
	document.addEventListener("dialogaccept", save);
}

function save() {
	for (let pref of preferences) {
		let element = document.getElementById(pref.id);
		let prefName = pref.id.substring(branchNameLength);

		switch (pref.type) {
			case "int":
				branch.setIntPref(prefName, element.value);
				break;

			case "bool":
				branch.setBoolPref(prefName, element.getAttribute("checked") == "true");
				break;

			case "string":
				branch.setCharPref(prefName, element.value);
				break;
		}
	}
}
