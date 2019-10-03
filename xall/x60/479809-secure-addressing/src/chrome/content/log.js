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

var EXPORTED_SYMBOLS = ["log", "err", "dbg"];

Components.utils.import("chrome://secure-addressing/content/prefs.js");


var seq = 1;
function err(aMessage) {
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                          .getService(Components.interfaces.nsIConsoleService);
    consoleService.logStringMessage("SA[" + seq + "]: " + aMessage);
    dump("SA[" + seq + "]: " + aMessage + "\n");
    seq++;
}

function log(aMessage) {
    return;
}

function dbg(aMessage) {
    let debug = SaGetPrefBool("debug");
    if (!debug) {
        return;
    }
    err(aMessage);
}

