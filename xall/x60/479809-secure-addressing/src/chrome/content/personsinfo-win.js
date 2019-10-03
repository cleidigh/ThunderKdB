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
Components.utils.import("chrome://secure-addressing/content/prefs.js");

function add(pos, atype, name, department, title, phone) {
    var list = document.getElementById("personslist");

    var row = list.getItemAtIndex(pos);
    if (row) {
        let cells = row.childNodes;
        for(let i = 0; i < cells.length; i++) {
            let id = cells[i].getAttribute("id");
            if (id == "atype") {
                cells[i].setAttribute('label', atype);
            }
            if (id == "name") {
                cells[i].setAttribute('label', name);
            }
            if (id == "department") {
                cells[i].setAttribute('label', department);
            }
            if (id == "title") {
                cells[i].setAttribute('label', title);
            }
            if (id == "phone") {
                cells[i].setAttribute('label', phone);
            }
        }
        return;
    }

    var row = document.createElement('listitem');
    var cell;

    cell = document.createElement('listcell');
    cell.setAttribute('label', atype);
    cell.setAttribute('id', "atype");
    row.appendChild(cell);

    cell = document.createElement('listcell');
    cell.setAttribute('label', name);
    cell.setAttribute('id', "name");
    row.appendChild(cell);

    cell = document.createElement('listcell');
    cell.setAttribute('label', department);
    cell.setAttribute('id', "department");
    row.appendChild(cell);

    cell = document.createElement('listcell');
    cell.setAttribute('label', title);
    cell.setAttribute('id', "title");
    row.appendChild(cell);

    cell = document.createElement('listcell');
    cell.setAttribute('label', phone);
    cell.setAttribute('id', "phone");
    row.appendChild(cell);

    list.appendChild(row);
}

let email_done = new Object;
let idx = 0;
function add_all(list, t) {
    if (!list) {
        return;
    }
    for (let i = 0; i < list.length; i++) {
        let email = list[i];
        if (!email) {
            continue;
        }
        if (email_done[email]) {
            continue;
        }
        email_done[email] = true;
        let added = false;
        var callback = function(n, data, error, hit) {
            added = true;
            if (data && data.name) {
                add(n, t, data.name, data.department, data.title, data.phone);
            } else {
                add(n, t, email, "", "", "");
            }
        };
        memcacheSearchForDisplay(email, callback, idx, 10);
        if (!added) {
                add(idx, t, email, "[searching...]", "", "");
        }
        idx++;
    }
}

function startup() {
    document.getElementById("personslist").removeItemAt(0);
    let email_from = window.arguments[0];
    let email_to = window.arguments[1];
    let email_cc = window.arguments[2];
    let email_body = window.arguments[3];

    let cols =  ["colname", "coldep", "coltitle", "colphone"];
    for(let i = 0; i < cols.length; i++) {
        let w = SaGetPrefInt("pi_width_" + cols[i]);
        if (!w) {
            continue;
        }
        let col = document.getElementById(cols[i]);
        col.setAttribute("flex", 0);
        col.setAttribute("width", w)
    }

    add_all(email_from, "From");
    add_all(email_to, "To");
    add_all(email_cc, "Cc");
    add_all(email_body, "Body");
    
}
