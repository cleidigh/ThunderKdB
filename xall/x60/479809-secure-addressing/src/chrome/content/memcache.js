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


var EXPORTED_SYMBOLS = ["memcacheSearch", "memcacheInvalidate",
                        "memcacheSearchForDisplay", 
                        "createDisplayString", "extractEmailName", "extractEmails",
                        "isInDomain"];

Components.utils.import("chrome://secure-addressing/content/prefs.js");
Components.utils.import("chrome://secure-addressing/content/ablib.js");
Components.utils.import("chrome://secure-addressing/content/log.js");

var msgHeaderParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
        .getService(Components.interfaces.nsIMsgHeaderParser);
var objs = new Object();

function getCacheObj(name) {
    if (name in objs) {
        return objs[name];
    } else {
        return null;
    }
}

function memCache(name, ablist) {
    
    this.cache_data = new Object();

    this.invalidate = function(email) {
        if (email) {
            delete this.cache_data[email];
        } else {
            this.cache_data = new Object();
        }
    };

    this.search = function(email, callback, arg, timeout) {
        let obj = this;
        let cdata = this.cache_data[email];
        if (cdata) {
            if (cdata.name) {
                callback(arg, cdata, true);
            } else {
                callback(arg, null, true);
            }
            return;
        }

        if (ablist.length == 0) {
            callback(arg, null, true);
            return;
        }

        let alldata = new Array();
        let done = 0;
        let recv = new Array();
        let cb = function(idx, data) {
            recv[idx] = true;
            if (data.length) {
                alldata[idx] = data[0];
            }
            done++;
            for(let j = 0; j < ablist.length; j++) {
                if (!recv[j]) {
                    break;
                }
                if (alldata[j]) {
                    obj.cache_data[email] = alldata[j];
                    callback(arg, alldata[j], false);
                    break;
                }
            }
            if (ablist.length == done) {
                for(let j = 0; j < done; j++) {
                    if (alldata[j]) {
                        return;
                    }
                }
                let dummy = {
                    email: email,
                    name: ""
                };
                obj.cache_data[email] = dummy;
                callback(arg, null, false);
            }
        };
        for(let i = 0; i < ablist.length; i++) {
            let query = [[{key: "PrimaryEmail", op: "=", value: email}]];
            getAbEnt(ablist[i], query, cb, i, timeout);
        }
    };
    objs[name] = this;
}

function memcacheInvalidate(email) {
    for(let c in objs) {
        if (email) {
            objs[c].invalidate(email);
        } else {
            delete objs[c];
        }
    }
}

function memcacheSearch(email, display, maxstage, internal, callback, arg, timeout) {
    let ablist;
    let cacheObj = new Array();
    if (display) {
        if (internal) {
            cacheObj[0] = getCacheObj("DPInt0");
            ablist = SaGetPrefAry("ab_internal");
        } else {
            cacheObj[0] = getCacheObj("DPExt0");
            ablist = SaGetPrefAry("ab_external");
        }
    } else {
        if (internal) {
            cacheObj[0] = getCacheObj("ACInt0");
            cacheObj[1] = getCacheObj("ACInt1");
            ablist = SaGetPrefAry("ab_internal_ac");
        } else {
            cacheObj[0] = getCacheObj("ACExt0");
            cacheObj[1] = getCacheObj("ACExt1");
            ablist = SaGetPrefAry("ab_external_ac");
        }
    }
    if (!cacheObj[0]) {
        let f = new Array();
        let s = new Array();
        let first = true;
        for(let i = 0; i < ablist.length; i++) {
            if (ablist[i] == "+") {
                first = false;
                continue;
            }
            if (first) {
                f.push(ablist[i]);
            } else {
                s.push(ablist[i]);
            }
        }
        if (display) {
            if (internal) {
                cacheObj[0] = new memCache("DPInt0", f);
            } else {
                cacheObj[0] = new memCache("DPExt0", f);
            }
        } else {
            if (internal) {
                cacheObj[0] = new memCache("ACInt0", f);
                cacheObj[1] = new memCache("ACInt1", s);
            } else {
                cacheObj[0] = new memCache("ACExt0", f);
                cacheObj[1] = new memCache("ACExt1", s);
            }
        }
    }   
    let done = 0;
    let alldata = new Array();
    let allhit = true;
    let cb = function(idx, ret, hit) {
        alldata[idx] = ret;
        done++;
        if (!hit) {
            allhit = false;
        }
        if (done == maxstage) {
            for(let j = 0; j < done; j++) {
                if (alldata[j]) {
                    callback(arg, alldata[j], 0, allhit);
                    return;
                }
            }
            callback(arg, null, 1, allhit);
        }
    };
    for(let i = 0; i < maxstage; i++) {
        let data = cacheObj[i].search(email, cb, i, timeout);
    }    
}

function isInDomain(email) {
    let domains = SaGetPrefAry("internal_domain");
    for(let i = 0; i < domains.length; i++) {
        let regex = new RegExp(domains[i], "i");
        if (regex.test(email)) {
            return true;
        }
    }
    return false;
}

function stripDisplayName(email) {
    var strippedAddresses = {};
    var fullNames = {};
    var names = {};
    var numAddresses =  0;
    try {
        msgHeaderParser.parseHeadersWithArray(email, strippedAddresses,
                                              names, fullNames, numAddresses);
    } catch(e) {
        err("header parse error = " + e + "\n");
        return "";
    }
    return strippedAddresses.value.join(",");
}

function memcacheSearchForDisplay(email, callback, arg, timeout) {
    email = stripDisplayName(email);
    if ((email.search(/\s/) != -1) ||
        (email.search(/@/) == -1)) {
        callback(arg, null, 2);
        //dbg("not looking up email = " + email + "\n");
        return;
    }
    //dbg("searching = " + email + "\n");
    if (isInDomain(email)) {
        memcacheSearch(email, true, 1, true, callback, arg, timeout);
    } else {
        memcacheSearch(email, true, 1, false, callback, arg, timeout);
    }
}

function myMakeFullAddress(name, email) {
    let mboxobj = msgHeaderParser.makeMailboxObject(name, email);
    return mboxobj.toString();
}


function createDisplayString(data) {
    let s;
    let f = msgHeaderParser.makeFullAddress;
    if (!f) {
        f = myMakeFullAddress;
    }
    let nameFormat;

    if (data.name && data.department && data.company) {
        nameFormat = SaGetPref("name_format_dc");
        let name = nameFormat.replace(/@D/, data.department).
                              replace(/@C/, data.company).
                              replace(/@N/, data.name);
        s = f(name, data.email);
    } else if (data.name && data.department) {
        nameFormat = SaGetPref("name_format_d");
        let name = nameFormat.replace(/@D/, data.department).
                              replace(/@N/, data.name);
        s = f(name, data.email);
    } else if (data.name && data.company) {
        nameFormat = SaGetPref("name_format_c");
        let name = nameFormat.replace(/@C/, data.company).
                              replace(/@N/, data.name);
        s = f(name, data.email);
    } else if (data.name) {
        s = f(data.name, data.email);
    } else {
        s = data.email;
    }
    return s;
}

function extractEmailName(str) {
    let ret = [];
    try{
        let addresses = [];
        let names = [];
        let fullnames = [];
        let count = [];
        msgHeaderParser.parseHeadersWithArray(str, addresses, names, fullnames, count);
        if (names.value[0] == null) {
            ret[1] = "";
        } else {
            ret[1] = names.value[0];
        }
        ret[0] = addresses.value[0];
    } catch(e) {
        err(e + "\n");
    }
    return ret;
}


function extractEmails(str) {
    let ret = "";
    try{
        let addresses = [];
        let names = [];
        let fullnames = [];
        let count = [];
        msgHeaderParser.parseHeadersWithArray(str, addresses, names, fullnames, count);
        ret = addresses.value.join(", ");
    } catch(e) {
        err(e + "\n");
    }
    return ret;
}
