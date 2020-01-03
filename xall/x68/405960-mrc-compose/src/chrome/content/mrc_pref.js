
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
 * The Original Code is MRC Compose
 *
 * The Initial Developer of the Original Code is
 * Michel Renon (renon@mrc-consultant.net)
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
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



/*
 *
 * Javascript code for mrc_compose preference pane
 *
 *
 *
 *
 *
 */



var mrcTools = ChromeUtils.import("chrome://mrc_compose/content/mrc_tools.js");


function mrcOnPrefLoaded() {

    mrcTools.mrcLog("mrcOnPrefLoaded()");
    buildABList();

    window.addEventListener("activate", mrcOnPrefActivate); 
}



function onSaveWhiteList() {
    /**
     * Propagate changes to the whitelist menu list back to
     * our hidden wsm element.
     */
    var wList = document.getElementById("search_ab_URI_list");
    var wlArray = [];
    // mrcTools.mrcLog("onSaveWhiteList() : wList.getRowCount()="+wList.getRowCount());

    for (var i = 0; i < wList.getRowCount(); i++) {
        var wlNode = wList.getItemAtIndex(i);
        // mrcTools.mrcLog("onSaveWhiteList() : wlNode="+wlNode);
        var checkbox = wlNode.getElementsByClassName("check")[0];
        // mrcTools.mrcLog("onSaveWhiteList() : checkbox="+checkbox);
        // mrcTools.mrcLog("onSaveWhiteList() : checkbox.checked="+checkbox.checked);
        if (checkbox.checked) {
            let abURI = wlNode.getAttribute("value");
            // mrcTools.mrcLog("onSaveWhiteList() : abURI="+abURI);
            wlArray.push(abURI);
        }
    }
    var wlValue = wlArray.join(";;;");
    mrcTools.mrcLog("onSaveWhiteList() : wlValue="+wlValue);
    var elt = document.getElementById("search_ab_URI");
    elt.setAttribute("value", wlValue);
    elt.value = wlValue;

    // bug : doesn't propagate the pref value...
    // we force an event
    var dummyEvent = document.createEvent('Event');
    dummyEvent.initEvent('input', true, false);
    elt.dispatchEvent(dummyEvent);
}


function mrcOnPrefUnloaded(){
    mrcTools.mrcLog("mrcOnPrefUnloaded()");

}

function mrcToggleCheckAB(element) {
    mrcTools.mrcLog("mrcToggleChekAB() : "+element.label+";"+element.value);
    onSaveWhiteList();
}









function mrcDefaultLineHeight(event) {
    /*
     * callback to put default values for fields 'first_line_height'
     * and 'line_height'
     *
     */


    v = getLineHeight();
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    prefs.setIntPref("extensions.mrccompose.first_line_height", v["first"]);
    prefs.setIntPref("extensions.mrccompose.line_height", v["line"]);
}

function mrcEditDirectories() {

    window.openDialog("chrome://messenger/content/addressbook/pref-editdirectories.xul",
                  "editDirectories", "chrome,modal=yes,resizable=no", null);
}



function mrcOnPrefActivate() {

    mrcTools.mrcLog("mrcOnPrefActivate()");
    // force rebuild of addressbooks list
    buildABList();
}

/*
 *
 * Internals
 *
 */

function buildABList() {

    mrcTools.mrcLog("buildABList()");

    let prefs = Components.classes["@mozilla.org/preferences-service;1"]
                         .getService(Components.interfaces.nsIPrefService)
                         .getBranch("extensions.mrccompose.");

    let first_load_done = prefs.getBoolPref("first_load_done");

    let currentArray = [];
    currentArray = document.getElementById("search_ab_URI").value.split(";;;");
    // mrcTools.mrcLog("currentArray : "+currentArray);


    // set up the whitelist UI
    let wList = document.getElementById("search_ab_URI_list");

    // Ensure the whitelist is empty
    while (wList.lastChild)
        wList.removeChild(wList.lastChild);

    // Populate the listbox with address books
    let abItems = [];
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
    let allAddressBooks = abManager.directories;
    while (allAddressBooks.hasMoreElements()) {
        let ab = allAddressBooks.getNext();
        if ( !(ab instanceof Components.interfaces.nsIAbDirectory))
            continue;

        ab_type = "?";
        if (ab instanceof Components.interfaces.nsIAbDirectory && !ab.isRemote) {
            ab_type = "Thunderbird";
        } else {
            if (ab instanceof Components.interfaces.nsIAbLDAPDirectory) {
                ab_type = "LDAP";
            }
        }

        if (!first_load_done)
            // we force all ab
            checked = true;
        else
            checked = currentArray.indexOf(ab.URI) != -1;

        abItem = createABItemList(checked, ab.dirName, ab.URI, ab_type);
        abItems.push(abItem);
    }

    if (mrcTools.mrcCommons.cardbookRepository) {
        // build items for Cardbook ABs
        for (let account of mrcTools.mrcCommons.cardbookRepository.cardbookAccounts) {
            mrcTools.mrcLog("test du CB : "+account);
            if (account[1] && account[5] && account[6] != "SEARCH") {
                let myDirName = account[0];
                let myDirPrefId = account[4];

                checked = currentArray.indexOf(myDirPrefId) != -1;
                ab_type = "CardBook (" + account[6].toLowerCase() + ")";

                abItem = createABItemList(checked, myDirName, myDirPrefId, ab_type);
                abItems.push(abItem);
            }
        }
    }

    // Sort the list
    function sortFunc(a, b) {
        return a.getAttribute("sort_label").toLowerCase()
           > b.getAttribute("sort_label").toLowerCase();
    }

    abItems.sort(sortFunc);

    // And then append each item to the listbox
    for (let i = 0; i < abItems.length; i++)
        wList.appendChild(abItems[i]);

    if (!first_load_done) {
        prefs.setBoolPref("first_load_done", true);
        onSaveWhiteList();
    }

}

function createABItemList(ab_check, ab_name, ab_uri, ab_type) {


    let abItem = document.createElement("richlistitem");

    let abHboxItem = document.createElement("hbox");
    abHboxItem.setAttribute("flex", "1");

    let newCheck = document.createElement("checkbox");
    newCheck.setAttribute("class", "check");
    newCheck.setAttribute("checked", ab_check);
    newCheck.addEventListener("click", mrcToggleCheckAB, false);
    abHboxItem.appendChild(newCheck);

    let newLabel = document.createElement("label");
    newLabel.setAttribute("flex", "1");
    newLabel.value = ab_name;
    // debug
    // newLabel.value += " ("+ab_uri+")";
    abHboxItem.appendChild(newLabel);

    let newLabelType = document.createElement("label");
    newLabelType.value = ab_type;
    newLabelType.setAttribute("style", "color: gray");
    abHboxItem.appendChild(newLabelType);

    abItem.appendChild(abHboxItem);
    abItem.setAttribute("sort_label", ab_name);
    abItem.setAttribute("value", ab_uri);

    return abItem;
}

function getLineHeight() {

    // std textbox is
    // ubuntu :  28px for first line, then 17px for others
    // windows : 20px and 13px
    // mac :     20px and 14 px

    let osString = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS;
    switch (osString) {
        case "Linux":
            v = {'first':28, 'line':17};
            break;
        case "Darwin":
            v = {'first':20, 'line':14};
            break;
        case "WINNT":
            v = {'first':20, 'line':13};
            break;

        default:
            v = {'first':20, 'line':13};
            break;
    }
    return v;
}

function mrcOnPrefComposeLoaded() {

    mrcLog("mrcOnPrefComposeLoaded");
}
