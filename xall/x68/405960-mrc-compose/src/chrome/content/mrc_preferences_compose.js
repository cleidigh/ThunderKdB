
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

var mrcTools = ChromeUtils.import("chrome://mrc_compose/content/mrc_tools.js");


/*
 *
 * Javascript code for preference pane override
 *
 *
 *
 *
 *
 */
function getString(key) {
    /*
     * wrapper for localization
     *
     * params :
     *   key : the name of the property
     * return :
     *   the value of property in the current language
     */
    /* old version
    mrcLog("getString");
    let bundle = document.getElementById("mrcComposePrefStringBundle");
    mrcLog("getString bundle="+bundle);
    if (bundle)
        return bundle.getString(key);
    else
        return key;
     */

    /*
     * Alternate way
     *
     */
    // mrcLog("getString");
    let bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
    let bundle = bundleService.createBundle("chrome://mrc_compose/locale/mrc_compose.properties");
    // mrcLog("getString bundle="+bundle);
    let str = key;
    if (bundle)
        str = bundle.GetStringFromName(key);
    return str;
}

function mrcLabelClick(event) {
    if (event.button == 0) {
        window.openDialog('chrome://mrc_compose/content/options.xul',' My Option Dialog','chrome,toolbar');
    }
}


window.addEventListener("load", function(e) {
        // dump("DEBUG : load compose window\n");
        // mrcLog("load preferences compose window()");
        /*
        chercher le checkbox d'id 'autocompleteLDAP' dans la fenetre id 'MailPreferences'
        remonter au parent (hbox)
        puis y ajouter à la fin le label/texte d'info
        */
        let text = getString('autocomplete');
        let text2 = getString('autocomplete2');
        // mrcTools.mrcLog("text="+text+"     text2="+text2);

        let src = document.getElementById('emailCollectionOutgoing');
        // mrcTools.mrcLog("src="+src.nodeName);
        let tab = src.parentNode.parentNode;
        // mrcTools.mrcLog("tab="+tab.nodeName);
        let groupbox = tab.childNodes[0];
        let description = groupbox.childNodes[1];
        // mrcTools.mrcLog("description="+description.value);
        description.value = text;
        // mrcTools.mrcLog("description apres="+description.value);

        var hbox = document.createElement("hbox");

        var label = document.createElement("label");
        label.setAttribute("class", "text-link");
        label.addEventListener("click", mrcLabelClick, false);
        label.setAttribute("value", text2);
        hbox.appendChild(label);

        var spacer = document.createElement("spacer");
        spacer.setAttribute("flex", "1");
        hbox.appendChild(spacer);

        groupbox.appendChild(hbox);

        /*
            <label id="downloadDictionaries" class="text-link"
                 onclick="if (event.button == 0) { openDictionaryList('tab'); }"
                 value="&downloadDictionaries.label;"/>
            <spacer flex="1"/>
         */

    }, false);

// mrcTools.mrcLog("window.addEventListener()");
