
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

ChromeUtils.import("chrome://mrc_compose/content/mrc_tools.js");


function mrcOnPrefLoaded() {

    mrcLog("mrcOnPrefLoaded()");
    buildABList();
    // mrcLoadHelp(); no need anymore with with help through tooltips.

    window.addEventListener("activate", mrcOnPrefActivate); 
}


function mrcTooltip() {
    /*
     * Defines content of default tooltip in pref window.
     *
     * 'this' is the tooltip object
     * 'document.tooltipNode' is the element being hovered.
     *
     */
    mrcLog("tooltip="+document.tooltipNode.id+"\n");
    let div = document.getElementById("helptip");
    if (div) {
        let hid = document.tooltipNode.id;
        if (hid == "")
            hid = document.tooltipNode.control;
        let txt = "no help";
        try {
            txt = getContents("chrome://mrc_compose/locale/help_"+hid+".txt");
        } catch(e) {
            mrcLogError("getContents() ="+e);
            txt = hid;
        }
        mrcLog("hid="+hid+"\n");
        mrcLog("txt="+txt+"\n");

        //clear the HTML div element of any prior shown custom HTML 
        while(div.firstChild)
            div.removeChild(div.firstChild);

        let injectHTML = Components.classes["@mozilla.org/feed-unescapehtml;1"]
        .getService(Components.interfaces.nsIScriptableUnescapeHTML) 
        .parseFragment(txt, false, null, div);

        //attach the DOM object to the HTML div element 
        div.appendChild(injectHTML);
    }
}
function onSaveWhiteList() {
    /**
     * Propagate changes to the whitelist menu list back to
     * our hidden wsm element.
     */
    var wList = document.getElementById("search_ab_URI_list");
    var wlArray = [];

    for (var i = 0; i < wList.getRowCount(); i++) {
        var wlNode = wList.getItemAtIndex(i);
        if (wlNode.checked) {
            let abURI = wlNode.getAttribute("value");
            wlArray.push(abURI);
        }
    }
    var wlValue = wlArray.join(";;;");
    mrcLog("onSaveWhiteList() : wlValue="+wlValue);
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
    mrcLog("mrcOnPrefUnloaded()");

}

function mrcToggleCheckAB(element) {
    mrcLog("mrcToggleChekAB() : "+element.label+";"+element.value);
    onSaveWhiteList();
}









function mrcDefaultLineHeight(event) {
    /*
     * callback to put default values for fields 'first_line_height'
     * and 'line_height'
     *
     */


    v = getLineHeight();
    /*
    tb1 = document.getElementById('first_line_height');
    tb1.value = v['first'];
    tb2 = document.getElementById('line_height');
    tb2.value = v['line'];
    */
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    prefs.setIntPref("extensions.mrccompose.first_line_height", v["first"]);
    prefs.setIntPref("extensions.mrccompose.line_height", v["line"]);



}

function mrcEditDirectories() {

    window.openDialog("chrome://messenger/content/addressbook/pref-editdirectories.xul",
                  "editDirectories", "chrome,modal=yes,resizable=no", null);
}



function mrcOnPrefActivate() {

    mrcLog("mrcOnPrefActivate()");
    // force rebuild of addressbooks list
    buildABList();
}

/*
 *
 * Internals
 *
 */

function buildABList() {

    mrcLog("buildABList()");

    let prefs = Components.classes["@mozilla.org/preferences-service;1"]
                         .getService(Components.interfaces.nsIPrefService)
                         .getBranch("extensions.mrccompose.");

    let first_load_done = prefs.getBoolPref("first_load_done");

    let currentArray = [];
    currentArray = document.getElementById("search_ab_URI").value.split(";;;");

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

        let abItem = document.createElement("listitem");
        abItem.setAttribute("type", "checkbox");
        abItem.setAttribute("class", "listitem-iconic");
        abItem.setAttribute("label", ab.dirName);
        abItem.setAttribute("value", ab.URI);

        abItem.addEventListener("click", mrcToggleCheckAB, false);

        // Due to bug 448582, we have to use setAttribute to set the
        // checked value of the listitem.
        if (!first_load_done)
            // we force all ab
            abItem.setAttribute("checked", true);
        else
            abItem.setAttribute("checked", (currentArray.indexOf(ab.URI) != -1));

        abItems.push(abItem);
    }

    // Sort the list
    function sortFunc(a, b) {
        return a.getAttribute("label").toLowerCase()
           > b.getAttribute("label").toLowerCase();
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



function getContents(aURL){
    /*
     * Read a file from a chrome path.
     * from http://forums.mozillazine.org/viewtopic.php?p=921150
     *
     */
  var ioService=Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var scriptableStream=Components
    .classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);

  var channel=ioService.newChannel(aURL,null,null);
  // var channel=ioService.newChannel2(aURL,null,null, null, document, document, null, null);
  var input=channel.open();
  scriptableStream.init(input);
  var str=scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();
  return str;
}


function mrcLoadHelp() {
    /*
     * Obsolete.
     */

    for (let i = 1 ; i <= 4 ; i++) {
        let hid = "help"+i;
        let div = document.getElementById(hid);
        if (div) {
            let txt = "";
            try {
                txt = getContents("chrome://mrc_compose/locale/"+hid+".txt");
            } catch(e) {}

            //clear the HTML div element of any prior shown custom HTML
            while(div.firstChild) 
                div.removeChild(div.firstChild);

            //safely convert HTML string to a simple DOM object, striping it of javascript and more complex tags
            var parserUtils = Components.classes["@mozilla.org/parserutils;1"]
                  .getService(Components.interfaces.nsIParserUtils);
            let injectHTML = "";
            // special : Gecko 13 does not have 'parseFragment()'
            if (parserUtils.parseFragment)
                injectHTML = parserUtils.parseFragment(txt, 0, false, null, div);
            else {
                // Old API to parse html, xml, svg.
                var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                            .createInstance(Components.interfaces.nsIDOMParser);
                var htmlDoc = parser.parseFromString(txt, "text/html");
                injectHTML = htmlDoc.firstChild;
            }

            //attach the DOM object to the HTML div element 
            div.appendChild(injectHTML); 
        }
    }
}





function mrcOnPrefComposeLoaded() {

    mrcLog("mrcOnPrefComposeLoaded");
}
