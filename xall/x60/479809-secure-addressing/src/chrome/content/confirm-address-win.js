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


Components.utils.import("chrome://secure-addressing/content/log.js");
Components.utils.import("chrome://secure-addressing/content/prefs.js");
Components.utils.import("chrome://secure-addressing/content/memcache.js");

var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
        .getService(Components.interfaces.nsIMsgHeaderParser);
var abManager = Components.classes["@mozilla.org/abmanager;1"]
        .getService(Components.interfaces.nsIAbManager);


function getLastSent(email) {
    let collect = SaGetPrefBool("collect_address");
    if (!collect) {
        return "UNKNOWN";
    }
    try {
        let abURI = SaGetPref("collect_addressbook");
        let q = "?(or(PrimaryEmail,=," + email + "))";
        let qab = abManager.getDirectory(abURI + q);
        let results = qab.childCards;
        while (results.hasMoreElements()) {
            let card = results.getNext();
            if (card instanceof Components.interfaces.nsIAbCard) {
                let ret = card.getProperty("Custom4", "");
                if (ret) {
                    return ret;
                } else {
                    return "UNKNOWN";
                }
            }
        }
        return "";
    } catch(e) {
        return "UNKNOWN";
    }
}

function check_all() {
    let list = document.getElementById("addrlist");
    let checkboxes = list.getElementsByTagName("checkbox");
    let complete = true;
    for(let i = 0; i < checkboxes.length; i++){
        checkboxes[i].checked = true;
        checkboxes[i].setAttribute("checked", true);
    }
    check_all_done();
 }

function check_all_done() {
    let list = document.getElementById("addrlist");
    let checkboxes = list.getElementsByTagName("checkbox");
    let complete = true;
    for(let i = 0; i < checkboxes.length; i++){
        dbg("checked[" + i + "] = " + checkboxes[i].checked + ", " + checkboxes[i].hasAttribute("checked") + ", " + checkboxes[i].getAttribute("checked"));
        //if (!checkboxes[i].checked) {
        //if (!checkboxes[i].hasAttribute("checked") || !checkboxes[i].getAttribute("checked")) {
        if (checkboxes[i].getAttribute("checked") == "false") {
            complete = false;
            break;
        }
    }
    let acheck = document.getElementById("acheck");
    if (!acheck.checked) {
    //if (!acheck.hasAttribute("checked") || !acheck.getAttribute("checked")) {
    //if (acheck.getAttribute("checked") == "false") {
        complete = false;
    }

    if (complete) {
        document.documentElement.getButton("accept").disabled = false;
    } else {
        document.documentElement.getButton("accept").disabled = true;
    }
}

function add(data) {
    let addr = data.email;
    let addrType = data.type;
    var list = document.getElementById("addrlist");
    var row = document.createElement('listitem');
    var cell;
    let ne = extractEmailName(addr);
    let email = ne[0];
    let name = ne[1];
    if (email == name) {
        name = "";
    }

    let defchecked = false;
    let defstatus = SaGetPref("default_checked");
    switch (defstatus) {
    case "all":
        defchecked = true;
        break;
    case "internal":
        if (isInDomain(email)) {
           defchecked = true;
        }
        break;
    case "reply":
        if (data.safe) {
            defchecked = true;
        }
        break;
    case "replyinternal":
        if (isInDomain(email) && data.safe) {
            defchecked = true;
        }
        break;
    }

    cell = document.createElement('listcell');
    var checkbox = document.createElement("checkbox");
    checkbox.setAttribute("style", "margin-left:7px;");
    checkbox.setAttribute("checked", defchecked);
    cell.appendChild(checkbox);
    row.appendChild(cell);
    row.checkbox = checkbox;
    row.onclick = function(event){
        if (event.detail == 3) {
            check_all();
            return;
        }
        var chekced = this.checkbox.checked;
        this.checkbox.setAttribute("checked", !chekced);
        check_all_done();
    };

    cell = document.createElement('listcell');
    cell.setAttribute('label', addrType);
    row.appendChild(cell);

    cell = document.createElement('listcell');
    cell.setAttribute('label', email);
    row.appendChild(cell);

    cell = document.createElement('listcell');
    cell.setAttribute('label', name);
    row.appendChild(cell);

    cell = document.createElement('listcell');
    let ls = getLastSent(email);
    if (ls == "UNKNOWN") {
        cell.setAttribute('label', "");
    } else if(ls) {
        let dobj = new Date(ls);
        let diff = Date.now() - dobj.getTime();
        let oneday = 24 * 60 * 60 * 1000;
        let s;
        let stringsBundle = document.getElementById("secure-addressing-sb-caw");
        try{
            if (diff < oneday) {
                s = stringsBundle.getFormattedString('hoursString', ["24"]);
            } else if (diff < 2 * oneday) {
                s = stringsBundle.getFormattedString('hoursString', ["48"]);
            } else if (diff < 7 * oneday) {
                let days = Math.floor(diff / oneday);
                s = stringsBundle.getFormattedString('daysString', [days]);
            } else {
                s = dobj.toLocaleDateString();
            }
            if (diff > 30 * oneday) {
                cell.setAttribute('label', s);
                cell.setAttribute('style', 'color: red;');
                checkbox.setAttribute("checked", false);
            } else {
                cell.setAttribute('label', s);
            }
        } catch(e) {
            err("making last sent stinrg: " + e);
        }
    } else {
        //row.setAttribute('style', 'color: red;');
        cell.setAttribute('style', 'color: red;');
        cell.setAttribute('label', "(FIRST TIME)");
        checkbox.setAttribute("checked", false);
    }
    row.appendChild(cell);

    list.appendChild(row);
    
    //row.checkbox.setAttribute("checked", defchekced);
}


function startup() {
    /* tweak to supress odd stretch of listbox */
    document.getElementById("addrlist").removeItemAt(0);
    document.documentElement.getButton("accept").disabled = true;
    
    let cols =  ["colemail", "colname", "collast"];
    for(let i = 0; i < cols.length; i++) {
        let w = SaGetPrefInt("ca_width_" + cols[i]);
        if (!w) {
            continue;
        }
        let col = document.getElementById(cols[i]);
        col.setAttribute("flex", 0);
        col.setAttribute("width", w)
    }
    
    let list = window.arguments[1];
    for (let i = 0; i < list.length; i++) {
        try{
            add(list[i]);
        } catch(e) {
            err("confirm win: error in adding items " + e);
        }
    } 
    let bucket = window.arguments[2];
    let nattach = bucket.getRowCount();
    let acheck = document.getElementById("acheck");
    let openall = document.getElementById("openall");
    let stringsBundle = document.getElementById("secure-addressing-sb-caw");
    if (nattach == 0) {
        acheck.label = stringsBundle.getString('noattachmentString');
        acheck.checked = true;
        acheck.setAttribute("checked", true);
        acheck.disabled = true;
        openall.disabled = true;
    } else {
        acheck.label = stringsBundle.getFormattedString('attachmentString', [nattach]);
    }

    check_all_done();
}

function onOK() {
    window.arguments[0].out = true;
    return true;
}

function onCancel() {
    window.arguments[0].out = false;
    return true;
}

