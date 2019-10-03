/**
 *
 *  Secure Addressing
 *
 *  Copyright (C) 2014 Hiroya Matsuba
 *
 *   This file is part of Secure Addressing
 *
 *   Secure Addressing is free software: you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, either version 3 of the License, or
 *   (at your option) any later version.
 *
 *   Secure Addressing is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *   You should have received a copy of the GNU General Public License
 *   along with Foobar.  If not, see <http://www.gnu.org/licenses/>.
 *
**/


/* 
  part of this file is derived from Custom Address Sidebar by arumamis
  https://addons.mozilla.org/en-US/thunderbird/addon/custom-address-sidebar/
*/

Components.utils.import("chrome://secure-addressing/content/log.js");
Components.utils.import("chrome://secure-addressing/content/memcache.js");
Components.utils.import("chrome://secure-addressing/content/ablib.js");
Components.utils.import("chrome://secure-addressing/content/prefs.js");

SecureAddressing.customContactsBar = {

    initCustom: function() {
        let tree = document.getElementById("abResultsTree");
        let treecols = tree.childNodes[0];
        SecureAddressing.customContactsBar.addField(treecols);
    },

    addField: function(treecols) {
        let field = new Array(
                          new Array("_AimScreenName", gLocalString._AimScreenName),
                          new Array("Company"       , gLocalString.Company       ),
                          new Array("NickName"      , gLocalString.NickName      ),
                          new Array("SecondEmail"   , gLocalString.SecondEmail   ),
                          new Array("Department"    , gLocalString.Department    ),
                          new Array("JobTitle"      , gLocalString.JobTitle      ),
                          new Array("CellularNumber", gLocalString.CellularNumber),
                          new Array("PagerNumber"   , gLocalString.PagerNumber   ),
                          new Array("FaxNumber"     , gLocalString.FaxNumber     ),
                          new Array("HomePhone"     , gLocalString.HomePhone     ),
                          new Array("WorkPhone"     , gLocalString.WorkPhone     )
                          );
        const F_ID    = 0;
        const F_LABEL = 1;
    
        for (let i = 0; i < field.length; i++) {
            let splitter = document.createElement("splitter");
            splitter.setAttribute("class", "tree-splitter");
        
            let treecol = document.createElement("treecol");
            treecol.setAttribute("id"     , field[i][F_ID]                      );
            treecol.setAttribute("class"  , "sortDirectionIndicator"            );
            treecol.setAttribute("persist", "hidden ordinal width sortDirection");
            treecol.setAttribute("hidden" , "true"                              );
            treecol.setAttribute("flex"   , "1"                                 );
            treecol.setAttribute("label"  , field[i][F_LABEL]                   );
        
            treecols.appendChild(splitter);
            treecols.appendChild(treecol);
        }
    },

    addSelectedAddresses2: function(recipientType) {
        let cards = GetSelectedAbCards();
        let count = cards.length;
    
        for(let i = 0; i < count; i++) {
            let data = makeDataFromCard(cards[i]);
            if (!data) {
                continue;
            }
            let str = createDisplayString(data);
            if (!str) {
                continue;
            }
            parent.AddRecipient(recipientType, str);
        }
    },

    onEnterInSearchBar2: function() {
        let searchURI = GetSelectedDirectory();
        let searchInput = document.getElementById("peopleSearchInput");
        let targets = SaGetPrefAry("ab_search_target");
    
        let qstring = "";
        if (searchInput.value != "") {
            qstring = "?(and(PrimaryEmail,c,@)";
            let sitems = searchInput.value.split(/\s+/);
            for(let i = 0; i < sitems.length; i++) {
                if (sitems[i] != "") {
                    let q = "(or";
                    for(let j = 0; j < targets.length; j++) {
                        q += "(" + targets[j] + ",c,@V)";
                    }
                    q += ")";
                    qstring += q.replace(/@V/g, encodeURIComponent(sitems[i]));
                }
            }
            qstring += ")";
        }
        //dbg("qstring = " + qstring + "\n");
        SetAbView(searchURI + qstring);
    },

    contactsListOnClick2: function(event) {
        // we only care about button 0 (left click) events
        if (event.button != 0)
            return;
    
        let target = event.originalTarget;
        if (target.localName == "treecol") {
            let sortDirection = target.getAttribute("sortDirection") == kDefaultDescending ?
                                        kDefaultAscending : kDefaultDescending;
            SortAndUpdateIndicators(target.id, sortDirection);
        } else if (target.localName == "treechildren" && event.detail == 2) {
            let contactsTree = document.getElementById("abResultsTree");
            let row = contactsTree.treeBoxObject.getRowAt(event.clientX, event.clientY);
            if (row == -1 || row > contactsTree.view.rowCount-1) {
                // double clicking on a non valid row should not add any entry
                return;
            }
            // ok, go ahead and add the entry
            SecureAddressing.customContactsBar.addSelectedAddresses2('addr_to');
        } 
    },
};

SecureAddressing.customContactsBar.initCustom();
