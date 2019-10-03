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


Components.utils.import("chrome://secure-addressing/content/memcache.js");
Components.utils.import("chrome://secure-addressing/content/log.js");

SecureAddressing.AdditionalCols = function() {
    
    let getCellTextCommon = function(row, col) {
        let rcpt = gDBView.cellTextForColumn(row, "recipient");
        let external = gDBView.cellTextForColumn(row, "sender");

        /* group header */
        if ((external == "") && (rcpt == "")) {
            return "";
        }

        let hdr = gDBView.getMsgHdrAt(row);
        let en = extractEmailName(hdr.author);
        let email = en[0];

        let cacheHit = false;
        let cached;
        let flag = 0;
        let updateName = function(dummy, data, error, hit) {
            if (hit) {
                cacheHit = true;
                cached = data;
            } else {
                GetThreadTree().boxObject.invalidateCell(row, col);
            }
        };
        /* misterious code: if memcacheSearchForDisplay finds data in memory cache
           it will invoke the callback above IN THIS THREAD. In this case
           variable cacheHit will set to true */
        memcacheSearchForDisplay(email, updateName, 0, 10);
        if (cacheHit) {
            if (cached) { // positive hit
                if (col.id == "displayname") {
                    return cached.name;
                }
                if (col.id == "company") {
                    return cached.company;
                }
                if (col.id == "department") {
                    return cached.department;
                }
                if (col.id == "title") {
                    return cached.title;
                }
                return "";
            } else { // nagative hit
                if (col.id == "displayname") {
                    return external;
                } else {
                    return "";
                }
            }
        } else {
            //return "";
            if (col.id == "displayname") {
                return external;
            } else {
                return "";
            }
        }
    }
    
    let displaynameColumnHandler = {
        getCellText: function(row, col) {return getCellTextCommon(row, col); },
        getSortStringForRow: function(hdr) {
            let en = extractEmailName(hdr.author);
            let email = en[0];
            return email;
        },
        isEditable:          function() {return false;},
        cycleCell:           function(row, col) {},
        isString:            function() {return true;},
        getCellProperties:   function(row, col, props){},
        getImageSrc:         function(row, col) {return null;},
        getRowProperties:    function(row,props){},
        getColumnProperties: function(colid,col,props){},
        getSortLongForRow:   function(hdr) {return null;},
    }

    let otherColumnHandler = {
        getCellText: function(row, col) {return getCellTextCommon(row, col); },
        getSortStringForRow: function(hdr) {return ""; },
        isEditable:          function() {return false;},
        cycleCell:           function(row, col) {},
        isString:            function() {return true;},
        getCellProperties:   function(row, col, props){},
        getImageSrc:         function(row, col) {return null;},
        getRowProperties:    function(row,props){},
        getColumnProperties: function(colid,col,props){},
        getSortLongForRow:   function(hdr) {return null;},
    }

    let CreateDbObserver = {
        observe: function(aMsgFolder, aTopic, aData) {
            gDBView.addColumnHandler("displayname", displaynameColumnHandler);
            gDBView.addColumnHandler("company", otherColumnHandler);
            gDBView.addColumnHandler("department", otherColumnHandler);
            gDBView.addColumnHandler("title", otherColumnHandler);
        }
    }
    
    let ObserverService = Components.classes["@mozilla.org/observer-service;1"]
                              .getService(Components.interfaces.nsIObserverService);
    ObserverService.addObserver(CreateDbObserver, "MsgCreateDBView", false);

    try{
        Components.utils.import("resource://gre/modules/AddonManager.jsm");
        AddonManager.getAddonByID("secure-addressing@matsuba.net", function(addon) {
            let sa_version = addon.version;
            SaSetPref("version", sa_version);
        });
    } catch(e) {
        dbg(e);
    }

};

window.addEventListener("load", SecureAddressing.AdditionalCols, false);
