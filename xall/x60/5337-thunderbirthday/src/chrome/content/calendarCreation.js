"use strict";

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
 * The Original Code is Thunderbirthday Provider code.
 *
 * The Initial Developer of the Original Code is
 *  Ingo Mueller (thunderbirthday at ingomueller dot net)
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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

/**
 * Load locales
 */
var cTBD_sbs = Components.classes["@mozilla.org/intl/stringbundle;1"]
                .getService(Components.interfaces.nsIStringBundleService);
var cTBD_locale = cTBD_sbs.createBundle("chrome://thunderbirthday/locale/" + 
                                        "calendarCreation.properties");

var cTBD_savedCalendarUri = "";
var cTBD_savedCalendarFormat = "";


/**
 * cTBD_loadCalendarCreation
 * Modifies the calendarCreation dialog to the suits of ThunderBirthDays
 */
function cTBD_loadCalendarCreation() {
    // Show cTBD_locationPageLocal instead of skipping the location
    // page for local calendars
    var initialPage = document.getElementsByAttribute("pageid", "initialPage")[0];
    initialPage.setAttribute("onpageadvanced","cTBD_onInitialAdvance()");
    
    // Enable automatic name proposition for the new calender when
    // choosing thunderbird format
    var customizePage = document.getElementsByAttribute("pageid", "customizePage")[0];
    customizePage.setAttribute("onpageshow",
                "cTBD_initName(); " + customizePage.getAttribute("onpageshow"));
    
    // Fill Dropdownbox with adressbooks
    cTBD_fillDropDownBox();
}


/**
 * cTBD_fillDropDownBox
 * Fills the dropdownbox on the cTBD_locationPageLocal page with the names
 * of the adresbooks
 */
function cTBD_fillDropDownBox() {
    var listbox = document.getElementsByAttribute("id", "cTBD-abook-uri-popup")[0];
    
    // "All adressbooks" item
    var menuitem = document.createElement("menuitem");
    menuitem.setAttribute("label",cTBD_locale.GetStringFromName("menuAllAddressbooks"));
    menuitem.setAttribute("value","moz-abdirectory://");
    
    listbox.appendChild(menuitem);
    
    // Get addressbook enumerator
    var abManager = Components.classes["@mozilla.org/abmanager;1"]
                              .getService(Components.interfaces.nsIAbManager);
    var abDirs = abManager.directories
                          .QueryInterface(Components.interfaces
                                                    .nsISimpleEnumerator);

    // List of adressbooks
    while (abDirs.hasMoreElements()) {
        var abDir = abDirs.getNext()
                          .QueryInterface(Components.interfaces
                                                    .nsIAbDirectory);
        
        var menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label",abDir.dirName);
        menuitem.setAttribute("value",abDir.URI);
        
        listbox.appendChild(menuitem);
    }
}


/**
 * cTBD_onInitialAdvance
 * Replaces the onInitialAdvance() function. Therefore, it has to have (most of)
 * the functionality of the replaced function: It changes the next page after
 * the initial page according to the selected radio button. Also saves the state
 * of the wizard before leaving the initial page.
 */
function cTBD_onInitialAdvance() {
    // Save values, that are eventually to be overwritten
    cTBD_savedCalendarUri = document.getElementById("calendar-uri").value;
    cTBD_savedCalendarFormat = document.getElementById("calendar-format").selectedItem.value;
    
    // Set next page
    var type = document.getElementById("calendar-type").selectedItem.value;
    var page = document.getElementsByAttribute("pageid", "initialPage")[0];
    if (type == "local") {
        // Note: prepareCreateCalendar is called in cTBD_onLocalPageAdvanced
        page.next = "cTBD_locationPageLocal";
    } else {
        page.next = "locationPage";
    }
}


/**
 * cTBD_onChangeFormatSelection
 * Hides/Unhides the textbox for the abook-path according to whether the
 * thunderbird radio button is selected or not.
 */
function cTBD_onChangeFormatSelection() {
    if (document.getElementsByAttribute("id", "cTBD-calendar-format")[0]
                .selectedItem.value == "thunderbirthday") {
        document.getElementsByAttribute("id", "cTBD-abook-uri")[0]
                .setAttribute("hidden","false");
    } else {
        document.getElementsByAttribute("id", "cTBD-abook-uri")[0]
                .setAttribute("hidden","true");
    }
    
    cTBD_checkRequiredLocal();
}


/**
 * cTBD_checkRequiredLocal
 * Checks if either default format is selected or cTBD-abook-uri
 * is a valid uri ending with /abook.mab and enables forwarding if so.
 */
function cTBD_checkRequiredLocal() {
    var canAdvance = false;
    
    if (document.getElementsByAttribute("id", "cTBD-calendar-format")[0]
                .selectedItem.value != "thunderbirthday" ||
        document.getElementsByAttribute("id", "cTBD-abook-uri")[0]
                .selectedItem != null) {
        canAdvance = true;
    }
    
    document.getElementById("calendar-wizard").canAdvance = canAdvance;
}


/** cTBD_onLocalPageAdvanced
 * Modifies the form accordingly to the input of the user, i.e. sets
 * the calendar format to "thunderbirthday" and the uri to the address
 * book uri, if a TBD calendar is to be created. Also
 * prepareCreateCalendar is called.
 */
function cTBD_onLocalPageAdvanced() {
    if (document.getElementById("cTBD-calendar-format")
                .selectedItem.value == "thunderbirthday") {
        // Set values accordingly
        document.getElementById("calendar-uri").value = 
                    document.getElementsByAttribute("id", "cTBD-abook-uri")[0].value;
        document.getElementById("calendar-type").selectedItem.value = "remote";
        document.getElementById("calendar-format").selectedItem.value = "thunderbirthday";
    } else {
        document.getElementById("calendar-type").selectedItem.value = "local";
    }
    
    return prepareCreateCalendar();
}


/**
 * cTBD_onLocalPageRewound
 * Restores the state previously saved when the initial page was left.
 * The state consist of the calendar format and uri eventually chosen
 * in the remote part of the wizard.
 */
function cTBD_onLocalPageRewound() {
    // Restore values overwritten previously
    document.getElementById("calendar-uri").value = cTBD_savedCalendarUri;
    document.getElementById("calendar-type").selectedItem.value = "local";
    document.getElementById("calendar-format").selectedItem.value = cTBD_savedCalendarFormat;
}


/**
 * cTBD_initName
 * Fills the textbox on the customizePage with a proposition, if
 * thunderbird has been choosen as calender format
 */
function cTBD_initName() {
    var nameField = document.getElementById("calendar-name");
    if (document.getElementsByAttribute("id", "cTBD-calendar-format")[0]
                .selectedItem.value != "thunderbirthday" ||
        nameField.value) {
        return;
    }
    
    nameField.value = cTBD_locale.GetStringFromName("calendarNameProposition");
}


/**
 * cTBD_makeURL
 * Takes a string and returns an nsIURI
 *
 * @param aUriString  the string of the address to for the spec of the nsIURI
 *
 * @returns  an nsIURI whose spec is aUriString
 */
function cTBD_makeURL(aUriString) {
    var ioSvc = Components.classes["@mozilla.org/network/io-service;1"].
                getService(Components.interfaces.nsIIOService);
    return ioSvc.newURI(aUriString, null, null);
}
