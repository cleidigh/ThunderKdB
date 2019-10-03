/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Contacts Sidebar.
 *
 * The Initial Developer of the Original Code is Jeroen Peters.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Jeroen Peters <jpeters@coldmail.nl>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
(function() {
	var project = com.namespace("com.github.shimamu.asbcustom.prefs");

	function initPrefs() {
		var prefElements = document.getElementsByAttribute("prefstring", "*");
		for (var i = 0; i < prefElements.length; i++ ) {
			var prefstring    = prefElements[i].getAttribute( "prefstring" );
			var prefid        = prefElements[i].getAttribute( "id" );
			var preftype      = prefElements[i].getAttribute( "preftype" );
			var prefdefval    = prefElements[i].getAttribute( "prefdefval" );
			var prefattribute = prefElements[i].getAttribute( "prefattribute" );
			var elt           = prefElements[i].localName;

			if (!preftype) {
				preftype = getPreftype(elt);
			}
			if (preftype == "int") {
				prefdefval = parseInt(prefdefval, 10);
			}
			if (!prefattribute) {
				prefattribute = getPrefattribute(elt);
			}

			var prefvalue;
			switch (preftype) {
				case "bool":
					prefvalue = com.github.shimamu.asbcustom.customPrefs.prefs.getBoolPref(
					prefstring, prefdefval);
				break;
				case "int":
					prefvalue = com.github.shimamu.asbcustom.customPrefs.prefs.getIntPref(
					prefstring, prefdefval);
				break;
				default:
					prefvalue = com.github.shimamu.asbcustom.customPrefs.prefs.copyUnicharPref(
					prefstring, prefdefval);
				break;
			}
			if (elt == "radiogroup") {
				document.getElementById(prefid).selectedIndex = prefvalue
			} else {
				prefElements[i].setAttribute(prefattribute, prefvalue);
			}
		}
	}

	function savePrefs() {
		var prefElements = document.getElementsByAttribute("prefstring", "*");
		for (var i = 0; i < prefElements.length; i++ ) {
			var prefstring    = prefElements[i].getAttribute( "prefstring" );
			var prefid        = prefElements[i].getAttribute( "id" );
			var preftype      = prefElements[i].getAttribute( "preftype" );
			var prefattribute = prefElements[i].getAttribute( "prefattribute" );
			var elt           = prefElements[i].localName;

			if (!preftype) {
				preftype = getPreftype(elt);
			}
			if (!prefattribute) {
				prefattribute = getPrefattribute(elt);
			}

			if (elt == "radiogroup") {
				var prefvalue = document.getElementById(prefid).selectedIndex;
			} else if (elt == "textbox") {
				var prefvalue = document.getElementById(prefid).value;
			} else {
				var prefvalue = prefElements[i].getAttribute(prefattribute);
			}

			if (preftype == "bool") {
				prefvalue = prefvalue == "true" ? true : false;
			}

			switch (preftype) {
				case "bool":
					com.github.shimamu.asbcustom.customPrefs.prefs.setBoolPref(prefstring, prefvalue);
				break;
				case "int":
					com.github.shimamu.asbcustom.customPrefs.prefs.setIntPref(prefstring, prefvalue);
				break;
				default:
					com.github.shimamu.asbcustom.customPrefs.prefs.setUnicharPref(prefstring, prefvalue);
				break;
			}
		}
	}

	function getPreftype(elem) {
		var result = "";

		if (elem == "textbox") {
			result = "string";
		} else if (elem == "checkbox" || elem == "listitem" || elem == "button") {
			result = "bool";
		} else if (elem == "radiogroup" || elem == "menulist") {
			result = "int";
		}

		return result;
	}

	function getPrefattribute(elem) {
		var result = "";

		if (elem == "radiogroup") {
			result = "selectedIndex";
		} else if (elem == "textbox" || elem == "menulist") {
			result = "value";
		} else if (elem == "checkbox" || elem == "listitem") {
			result = "checked";
		} else if (elem == "button") {
			result = "disabled";
		}

		return result;
	}

	project.initPrefs = initPrefs;
	project.savePrefs = savePrefs;
}());
