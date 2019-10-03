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
Components.utils.import("chrome://secure-addressing/content/prefs.js");
Components.utils.import("chrome://secure-addressing/content/log.js");

function getUsedURIs(abType) {
    return SaGetPref(abType);
}

function setUsedURIs(abType, abs) {
    let ab_str = abs.join(",");
    SaSetPref(abType, ab_str);
}

function startup(){
    let abManager = Components.classes["@mozilla.org/abmanager;1"]
        .getService(Components.interfaces.nsIAbManager);
    let allAddressBooks = abManager.directories; 
    let params = window.arguments[0];
    let absetType = params.type;
    let usedlist = document.getElementById("usedlist");
    let unusedlist = document.getElementById("unusedlist");
    let plusused = false;
    let usedURIlist = SaGetPrefAry(absetType);
    document.title = params.title;

    for(let i = 0; i < usedURIlist.length; i++) {
        if (usedURIlist[i] == "+") {
            usedlist.appendItem("+", "+");
            plusused = true;
            continue;
        }
        let ab = abManager.getDirectory(usedURIlist[i]);
        if (ab instanceof Components.interfaces.nsIAbDirectory) {
            if (ab.dirName) {
                usedlist.appendItem(ab.dirName, ab.URI);
            }
        }
    }

    while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext()
            .QueryInterface(Components.interfaces.nsIAbDirectory);
        if (addressBook instanceof Components.interfaces.nsIAbDirectory) {
            if (usedURIlist.indexOf(addressBook.URI) == -1) {
                unusedlist.appendItem(addressBook.dirName, addressBook.URI);
            }
        }
    }

    if ((absetType == 'ab_internal_ac') && (!plusused)) {
        unusedlist.appendItem("+", "+");
    }

}

function up() {
    let list = document.getElementById("usedlist");
    let idx = list.selectedIndex;
    if (idx > 0) {
        let item = list.selectedItem;
        let label = item.label;
        let value = item.value;
        list.removeItemAt(idx);
        let newitem = list.insertItemAt(idx - 1, label, value);
        list.selectItem(newitem); 
    }
}

function down() {
    let list = document.getElementById("usedlist");
    let idx = list.selectedIndex;
    if ((idx >= 0) && (idx != list.getRowCount() - 1)) {
        let item = list.selectedItem;
        let label = item.label;
        let value = item.value;
        list.removeItemAt(idx);
        let newitem = list.insertItemAt(idx + 1, label, value);
        list.selectItem(newitem); 
    }
}

function del() {
    let list = document.getElementById("usedlist");
    let idx = list.selectedIndex;
    if (idx >= 0) {
        let item = list.selectedItem;
        let label = item.label;
        let value = item.value;
        let dstlist = document.getElementById("unusedlist");
        list.removeItemAt(idx);
        let newitem = dstlist.appendItem(label, value);
        dstlist.selectItem(newitem);
    }
}

function add() {
    let list = document.getElementById("unusedlist");
    let idx = list.selectedIndex;
    if (idx >= 0) {
        let item = list.selectedItem;
        let label = item.label;
        let value = item.value;
        let dstlist = document.getElementById("usedlist");
        list.removeItemAt(idx);
        let newitem = dstlist.appendItem(label, value);
        dstlist.selectItem(newitem);
    }
}

function doOK(){
    let params = window.arguments[0];
    let absetType = params.type;
    let abs = new Array();
    let list =  document.getElementById("usedlist");
    let nodes = list.childNodes;
    for(let i = 0; i < nodes.length; i++){
        if(nodes[i].nodeName == "listitem"){
            abs.push(nodes[i].value);
        }
    }
    SaSetPrefAry(absetType, abs);
    memcacheInvalidate();
    return true;
}

function doCancel(){
    return true;
}

