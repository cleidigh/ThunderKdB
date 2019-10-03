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

var EXPORTED_SYMBOLS = ["SaGetPref", "SaGetPrefAry", "SaSetPref", "SaSetPrefAry",
                        "SaGetPrefGlobal", "SaGetPrefBool", "SaSetPrefBool",
                        "SaSetPrefGlobalBool", "SaGetPrefGlobalBool",
                        "SaSetPrefInt", "SaGetPrefInt"];

Components.utils.import("chrome://secure-addressing/content/log.js");

/*
try {
    const loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        .getService(Components.interfaces.mozIJSSubScriptLoader);
    loader.loadSubScript("chrome://global/content/nsUserSettings.js");
} catch(e) {
    Components.utils.reportError(e);
}
*/

/* 
Thanks to sayamda@qiita for uploading a nice substitution of nsPreferences!
http://qiita.com/sayamada/items/d6d26a3c2e9613854019
*/
var customPrefs = {
    orgPrefs: Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefBranch),

    copyUnicharPref:function(key, defaultVal){

        if(defaultVal === undefined){
            defaultVal = "";
        }
        var val = undefined;
        try{
            //val = this.orgPrefs.getComplexValue(key, Components.interfaces.nsISupportsString).data;
            val = this.orgPrefs.getStringPref(key);
        }catch(e){  
            //err("Reading " + key + " " + e);
        }
        if(val !== undefined && val !== ""){
            return val;
        }else{
            return defaultVal;
        }
    },

    setUnicharPref: function(key,val){
        /*
        var str = Components.classes["@mozilla.org/supports-string;1"]
                    .createInstance(Components.interfaces.nsISupportsString);
        str.data = val;
        this.orgPrefs.setComplexValue(key, Components.interfaces.nsISupportsString, str);
        */
        this.orgPrefs.setStringPref(key, val);
    },

    getBoolPref: function(key, defaultVal){
        try{
            var tmpVal = this.orgPrefs.getBoolPref(key);
            if(tmpVal || tmpVal === "true"){
                return true;
            }else{
                return false;
            }
        }catch(e){
            return defaultVal;
        }
    },

    setBoolPref: function(key,val){
        if(val || val === "true"){
            this.orgPrefs.setBoolPref(key, true);
        }else{
            this.orgPrefs.setBoolPref(key, false);
        }
    },

    getIntPref: function(key, defaultVal){
        try{
            return this.orgPrefs.getIntPref(key);
        }catch(e){
            return defaultVal;
        }
    },

    setIntPref: function(key, val){
        this.orgPrefs.setIntPref(key, val);
    },
};


var prefix = "extension.secure-addressing.";

var prefs = {
    internal_domain:          function() {return "@";},
    ab_internal:              function() {return getAddressBooks(2);},
    ab_external:              function() {return getAddressBooks(0);},
    ab_internal_ac:           function() {return getAddressBooks(1);},
    ab_external_ac:           function() {return getAddressBooks(0);},
    strip_display_name:       function() {return true;},
    collect_address:          function() {
                                  return customPrefs.getBoolPref("mail.collect_email_address_outgoing");
                              },
    collect_addressbook:      function() {
                                  return customPrefs.copyUnicharPref("mail.collect_addressbook");
                              },
    autocomplete_max:         function() {return 1;},
    name_format_dc:           function() {return "@N [@D, @C]";},
    name_format_d:            function() {return "@N [@D]";},
    name_format_c:            function() {return "@N [@C]";},
    pi_width_colname:         function() {return 0;},
    pi_width_coldep:          function() {return 0;},
    pi_width_coltitle:        function() {return 0;},
    pi_width_colphone:        function() {return 0;},
    ca_width_colemail:        function() {return 0;},
    ca_width_colname:         function() {return 0;},
    ca_width_collast:         function() {return 0;},
    custom_autocompletion:    function() {return true;},
    confirmation_window:      function() {return true;},
    nowin_internal:           function() {return false;},
    default_checked:          function() {return "none";},
    infobtn_added:            function() {return false;},
    ab_search_target:         function() {return "PrimaryEmail,DisplayName,Department";},
    debug:                    function() {return false;},
    version:                  function() {return "unknown";},
};

function getAddressBooks(op) {
    let localab = [];
    let remoteab = [];
    let abManager = Components.classes["@mozilla.org/abmanager;1"]
            .getService(Components.interfaces.nsIAbManager);
    let allAddressBooks = abManager.directories;
    while (allAddressBooks.hasMoreElements()) {
        let addressBook = allAddressBooks.getNext()
            .QueryInterface(Components.interfaces.nsIAbDirectory);
        if (addressBook instanceof Components.interfaces.nsIAbDirectory) {
            if (addressBook.isRemote) {
                remoteab.push(addressBook.URI);
            } else {
                localab.push(addressBook.URI);
            }
        }
    }
    let ret = "";
    if (op == 0) {
        ret = localab.join(",");
    }
    if (op == 1) {
        ret = localab.join(",");
        /*
        if (remoteab.length > 0) {
            ret = ret + ",+," + remoteab.join(",");
        }
        */
    }
    if (op == 2) {
        /*
        if (remoteab.length > 0) {
            ret = remoteab.join(",") + ",";
        }
        */
        ret = ret + localab.join(",");
    }
    return ret;
}

function SaGetPrefGlobal(name) {
    return customPrefs.copyUnicharPref(name);
}

function SaSetPrefGlobalBool(name, value) {
    return customPrefs.setBoolPref(name, value);
}

function SaGetPrefGlobalBool(name) {
    return customPrefs.getBoolPref(name);
}

function SaGetPref(name) {
    if (prefs[name] === undefined) {
        err("no preference: " + name + "\n");
        return null;
    }
    let str = customPrefs.copyUnicharPref(prefix + name);
    if (str) {
        return str;
    }
    str = prefs[name]();
    return str;
}

function SaGetPrefBool(name) {
    if (prefs[name] === undefined) {
        err("no preference: " + name + "\n");
        return null;
    }
    let ret = customPrefs.getBoolPref(prefix + name);
    if ((ret != true) && (ret != false)) {
        return prefs[name]();
    } else {
        return ret;
    }
}

function SaGetPrefInt(name) {
    if (prefs[name] === undefined) {
        err("no preference: " + name + "\n");
        return null;
    }
    let n = customPrefs.getIntPref(prefix + name);
    if (n == undefined) {
        return prefs[name]();
    } else {
        return n;
    }
}

function SaGetPrefAry(name) {
    if (prefs[name] === undefined) {
        err("no preference: " + name + "\n");
        return null;
    }
    let str = customPrefs.copyUnicharPref(prefix + name);
    if (!str || str.length == 0) {
        str = prefs[name]();
    }
    let ret = new Array();
    if (!str || str.length == 0) {
        return ret;
    }
    let ary = str.split(",");
    for(let i = 0; i < ary.length; i++) {
        if (ary[i]) {
            ret.push(ary[i]);
        }
    }
    return ret;
}

function SaSetPref(name, str) {
    if (prefs[name] === undefined) {
        err("no preference: " + name + "\n");
        return;
    }
    customPrefs.setUnicharPref(prefix + name, str);
}

function SaSetPrefBool(name, value) {
    if (prefs[name] === undefined) {
        err("no preference: " + name + "\n");
        return null;
    }
    customPrefs.setBoolPref(prefix + name, value);
}

function SaSetPrefInt(name, value) {
    if (prefs[name] === undefined) {
        err("no preference: " + name + "\n");
        return null;
    }
    customPrefs.setIntPref(prefix + name, value);
}

function SaSetPrefAry(name, ary) {
    if (ary) {
        let s = ary.join(",");
        SaSetPref(name, s);
    }
}
