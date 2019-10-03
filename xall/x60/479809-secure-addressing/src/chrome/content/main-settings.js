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

var selectedItem;

function startup(){
    document.getElementById("addBtn").addEventListener('command', addDomain, true);
    document.getElementById("removeBtn").addEventListener('command', removeDomain, true);
    let domainlist = document.getElementById("domain-list");
    let domains = SaGetPrefAry("internal_domain");
    domainlist.removeItemAt(0);
    for(let i = 0; i < domains.length; i++){
        let listitem = document.createElement("listitem");
        let s = domains[i].replace(/\s+/, "");
        listitem.setAttribute("label", s);
        listitem.setAttribute("id", Math.random());
        domainlist.appendChild(listitem);
    }

    let confirmwin = SaGetPrefBool("confirmation_window");
    document.getElementById("cbconfirm").checked = confirmwin;
    let nowininternal = SaGetPrefBool("nowin_internal");
    document.getElementById("cbnowin").checked = nowininternal;

    let defchecked_val = SaGetPref("default_checked");
    let defchecked = document.getElementById("defchecked");
    for(let i = 0; i < defchecked.itemCount; i++) {
        let item = defchecked.getItemAtIndex(i);
        if (item.value == defchecked_val) {
            defchecked.selectedItem = item;
        }
    }
    cbConfirmOnClick();

    let csauto_on = SaGetPrefBool("custom_autocompletion");
    document.getElementById("cbcsauto").checked = csauto_on;
    csautoOnClick();

    let strip = SaGetPrefBool("strip_display_name");
    let collectaddr = SaGetPrefBool("collect_address");
    let collectab = SaGetPref("collect_addressbook");
    if (!collectab) {
        collectab = SaGetPrefGlobal("mail.collect_addressbook");
    }

    let abManager = Components.classes["@mozilla.org/abmanager;1"]
        .getService(Components.interfaces.nsIAbManager);
    let allAddressBooks = abManager.directories; 
    let collectList = document.getElementById("collectab");
    let idx = -1;
    let i = 0;
    while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext()
            .QueryInterface(Components.interfaces.nsIAbDirectory);
        if (addressBook instanceof Components.interfaces.nsIAbDirectory) {
            if (!addressBook.isRemote) {
                collectList.appendItem(addressBook.dirName, addressBook.URI);
                if (addressBook.URI == collectab) {
                    idx = i;
                }
                i++;
            }
        }
    }
    collectList.selectedIndex = idx;
    let c = document.getElementById("cbstrip");
    let d = document.getElementById("cbcollect");
    c.checked = strip;
    d.checked = collectaddr;
    updateBoxes(c, d);

    let acmax = SaGetPrefInt("autocomplete_max");
    document.getElementById("acmax").value = acmax;

    let abfields = SaGetPrefAry("ab_search_target");
    let items = document.getElementsByClassName('abfield');
    for(i = 0; i < items.length; i++) {
        let item = items.item(i);
        let v = item.id.substring(3);
        if (abfields.indexOf(v) != -1) {
            item.checked = true;
        }
    }
}

function cbConfirmOnClick() {
    let disable = !document.getElementById("cbconfirm").checked;
    let items = document.getElementsByClassName('confirmwin');
    for(let i = 0; i < items.length; i++) {
        items[i].disabled = disable;
    } 
}

function csautoOnClick() {
    let disable = !document.getElementById("cbcsauto").checked;
    let items = document.getElementsByClassName('csauto');    
    for(let i = 0; i < items.length; i++) {
        items[i].disabled = disable;
    } 
}


function updateBoxes(c, d) {
    document.getElementById("cbcollect").disabled = !c.checked;
    document.getElementById("collectab").disabled = !c.checked;
    document.getElementById("lbcollect").disabled = !c.checked;
    document.getElementById("ablabel").disabled = !c.checked || !d.checked;
    document.getElementById("collectab").disabled = !c.checked || !d.checked;
}

function stripOnClick() {
    let c = document.getElementById("cbstrip");
    let d = document.getElementById("cbcollect");
    d.checked = c.checked;
    updateBoxes(c, d);
}

function collectOnClick() {
    let c = document.getElementById("cbstrip");
    let d = document.getElementById("cbcollect");
    updateBoxes(c, d);
}


function addDomain(event){
    let textbox = document.getElementById("domainToAdd");
    let val = textbox.value;
    if (val.length == 0) {
        return;
    }
    let domainlist = document.getElementById("domain-list");
    let listitem = document.createElement("listitem");
    listitem.setAttribute("label", val);
    listitem.setAttribute("id", Math.random());
    domainlist.appendChild(listitem);
    textbox.value = "";
}

function removeDomain(event){
    let domainlist = document.getElementById("domain-list");
    domainlist.removeChild(selectedItem);
}

function selectList(item){
    selectedItem = item;
}

function showSelection(abtype, caption) {
    var params = {type: abtype, title: caption};
    window.openDialog("chrome://secure-addressing/content/address-book-selection.xul",
                      "Addressbook Selection", 
                      "resizable,chrome,modal,titlebar,centerscreen",
                      params);
}

function doOK(){
    let domains = new Array();
    let domainlist = document.getElementById("domain-list");
    let nodes = domainlist.childNodes;
    for(let i = 0; i < nodes.length; i++){
        if(nodes[i].nodeName == "listitem"){
            domains.push(nodes[i].label);
        }
    }
    SaSetPref("internal_domain", domains.join(","));

    let confirmwin = document.getElementById("cbconfirm").checked;
    SaSetPrefBool("confirmation_window", confirmwin);
    let nowininternal = document.getElementById("cbnowin").checked;
    SaSetPrefBool("nowin_internal", nowininternal);
    let defchecked = document.getElementById("defchecked").selectedItem.value;
    dbg("selected = " + defchecked);   
    SaSetPref("default_checked", defchecked);

    let csauto_on = document.getElementById("cbcsauto").checked;
    SaSetPrefBool("custom_autocompletion", csauto_on);

    let c = document.getElementById("cbstrip");
    let d = document.getElementById("cbcollect");
    SaSetPrefBool("strip_display_name", c.checked);
    SaSetPrefBool("collect_address", d.checked);
    let collectList = document.getElementById("collectab");
    let e = collectList.selectedItem.value;
    SaSetPref("collect_addressbook", e);

    let acmax = Number(document.getElementById("acmax").value);
    if (!acmax) {
        acmax = 0;
    }
    SaSetPrefInt("autocomplete_max", acmax);

    let abfields = [];
    let items = document.getElementsByClassName('abfield');
    for(i = 0; i < items.length; i++) {
        let item = items.item(i);
        let v = item.id.substring(3);
        if (item.checked) {
            abfields.push(v);
        }
    }
    SaSetPrefAry("ab_search_target", abfields);

    memcacheInvalidate();
    return true;
}

function doCancel(){
    return true;
}

