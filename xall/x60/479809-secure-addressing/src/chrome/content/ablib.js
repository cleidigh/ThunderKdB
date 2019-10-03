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


var EXPORTED_SYMBOLS = ["getAbEnt", "makeDataFromCard"];
var ttldb = 3 * 24 * 3600;

Components.utils.import("resource://gre/modules/Timer.jsm");
Components.utils.import("chrome://secure-addressing/content/log.js");
Components.utils.import("chrome://secure-addressing/content/memcache.js");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

var ldapHandler = new Object();
var abManager = Components.classes["@mozilla.org/abmanager;1"]
                  .getService(Components.interfaces.nsIAbManager);

function makeDataFromCard(card) {
    if (!card) {
        return null;
    }
    let ret;
    try {
        ret = {
            email: card.primaryEmail,
            name: card.displayName,
            company:    card.getProperty("Company", "") ,
            department: card.getProperty("Department", "") ,
            title:      card.getProperty("JobTitle", ""),
            phone:      card.getProperty("WorkPhone", ""),
            address:    card.getProperty("WorkAddress", ""),
        };
    } catch (e) {
        err("error in making data from card: " + e + "\n");
        ret = null;
    }
    return ret;
}

var abListener = {
    onItemAdded: function(parentdir, item) {
        //dbg("item added\n");
        if (!(item instanceof Components.interfaces.nsIAbCard)) {
            return;
        }
        if (!(parentdir instanceof Components.interfaces.nsIAbDirectory)) {
            return;
        }
        let email = item.primaryEmail;
        let name = item.displayName;
        //dbg("got: " + email + " = " + name + "\n");
        let uri = parentdir.URI;
        let obj;
        if (uri in ldapHandler) {
            obj = ldapHandler[uri];
        } else {
        }
        let data = makeDataFromCard(item);
        if (obj && data) {
            obj.ldap_handler(data);
        } else {
            //dbg("no handler\n");
            if (!parentdir.isRemote) {
                memcacheInvalidate(email);
            }
        }
    },

    onItemRemoved: function(parentdir, item) {
        if (!(parentdir instanceof Components.interfaces.nsIAbDirectory)) {
            return;
        }
        if (!(item instanceof Components.interfaces.nsIAbCard)) {
            return;
        }
        if (!parentdir.isRemote) {
            memcacheInvalidate(item.primaryEmail);
        }
    },

    onItemPropertyChanged: function(item, aProperty, aOldValue, aNewValue) {
        if (!(item instanceof Components.interfaces.nsIAbCard)) {
            return;
        }
        memcacheInvalidate(item.primaryEmail);
    }
};
abManager.addAddressBookListener(abListener, Components.interfaces.nsIAbListener.all);

var dbs = new Object();
var queries = new Object();


function dbQuery(dbname) {
    let mDBConn;
    try {
        let file = FileUtils.getFile("ProfD", ["ldapcache.sqlite"]);
        mDBConn = Services.storage.openDatabase(file);
        mDBConn.executeSimpleSQL("CREATE TABLE IF NOT EXISTS " + dbname +
                             " (email TEXT PRIMARY KEY, name TEXT, " +
                             "company TEXT, department TEXT, title TEXT, " +
                             "phone TEXT, address TEXT, lastupdate INTEGER)");
    } catch(e) {
        err("create table error " + e + "\n");
    }

    let obj = this;

    this.dbconn = mDBConn;

    this.add_data = function(data) {
        if (!data) {
            return;
        }
        let st = this.dbconn.createAsyncStatement("INSERT INTO " + dbname + 
                                         " VALUES(:email, :name, " +
                                         ":company, :department, :title, :phone, " +
                                         ":address, :lastupdate)");
        //st.params.dbname = dbname;
        st.params.email = data.email;
        st.params.name = data.name;
        st.params.company = data.company;
        st.params.department = data.department;
        st.params.title = data.title;
        st.params.phone = data.phone;
        st.params.address = data.address;
        st.params.lastupdate = 0;
        let asyncHandler = {
            handleResult : function(result) {},
            handleError : function(err) {},
            handleCompletion : function(reason) {
                let st2 = obj.dbconn.createAsyncStatement("UPDATE " + dbname +
                                         " SET lastupdate = " +
                                         ":lastupdate WHERE email = :email");
                //st2.params.dbname = dbname;
                st2.params.email = data.email;
                st2.params.lastupdate = Date.now();
                st2.executeAsync({handleResult: function(){return;},
                                  handleError:  function(){return;},
                                  handleCompletion: function(){return;}});
            }
        };
        st.executeAsync(asyncHandler);      
    };

    this.search = function(email, callback, param) {
        let st;
        try {
            st = mDBConn.createAsyncStatement("SELECT * FROM " + dbname + " WHERE email = :email");
            st.params.email = email;
        } catch(e) {
            err("db error " + e + "\n");
        }
        let all_results = new Array();
        var asyncHndler = {
            handleResult: function(results) {
                for(let row = results.getNextRow(); row; row = results.getNextRow()) {
                    try {
                        var ret = {
                            email: row.getResultByName("email"),
                            name: row.getResultByName("name"),
                            company: row.getResultByName("company"),
                            department: row.getResultByName("department"),
                            title: row.getResultByName("title"),
                            phone: row.getResultByName("phone"),
                            address: row.getResultByName("address"),
                            lastupdate: row.getResultByName("lastupdate"),
                        };
                        all_results.push(ret);
                    } catch(e) {
                        err("error in receiving DB: " + e + "\n");
                    }
                }
            },
            handleError: function(aError) {
                err("callback error " + aError.message + " " + aError.result + "\n");
            },
            handleCompletion: function(aReason) {
                if (!callback) {
                    return;
                }
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    callback(param, null, 3);
                    return;
                }
                if ((all_results.length > 0) &&
                    (Date.now() - all_results[0].lastupdate < ttldb * 1000)) {
                    callback(param, all_results[0], 0);
                } else {
                    callback(param, null, 4);
                }
                return;
            },
        };
        st.executeAsync(asyncHndler);
        return;
    };
}

function getDB(dbname) {
    if (dbname in dbs) {
        return dbs[dbname];
    } else {
        let n = new dbQuery(dbname);
        dbs[dbname] = n;
        return n;
    }
}


function saQuery(ab, baseuri, cache, email) {
    let dbname = baseuri.replace("://", "_").replace(/-/g, "_").replace(/\./g, "_");
    let mDBConn = null;
    this.dbquery = getDB(dbname);

    let obj = this;
    this.cache = cache;
    this.dbconn = mDBConn;
    this.queryURI = ab.URI;
    this.addressBook = ab;
    this.dbname = dbname;
    this.handlers = new Array();
    this.tohandlers = new Array();

    this.register_handler = function(func, param) {
        /* call now for already known addresses */
        for(let i = 0; i < this.cards.length; i++) {
            func(param, this.cards[i], true);
        }
        let item = {func: func, param: param};
        this.handlers.push(item);
        return;
    };

    this.register_tohandler = function(func) {
        if (func) {
            this.tohandlers.push(func);
        }
    };

    this.call_handler = function(data) {
        for(let i = 0; i < this.handlers.length; i++) {
            let func = this.handlers[i].func;
            let param = this.handlers[i].param;
            func(param, data, true);
        }
    };

    this.cards = new Array();

    this.ldap_handler = function(data) {
        if (obj.dbquery) {
            obj.dbquery.add_data(data);
        }
        obj.cards.push(data);
        obj.call_handler([data]);
        //dbg("found card: data = " + data.name + "\n");
        if (obj.timeout2) {
            try {
                clearTimeout(obj.timerID);
                obj.timerID = setTimeout(function() {obj.timer_expired();}, 
                                         obj.timeout2 * 1000);
            } catch(e) {
                err("error " + e + "\n");
            }
        }
    };

    this.ldapsearch = function() {
        ldapHandler[this.queryURI] = this;
        let cards = obj.addressBook.childCards;
        while (cards.hasMoreElements()) {
            let card = cards.getNext();
            if (card instanceof Components.interfaces.nsIAbCard) {
                err("chid card found in LDAP dir\n");
            }
        }
    };

    this.timerID = -1;
    this.nexpire = 0;
    this.timer_expired = function() {
        //dbg("timer expired: " + obj.nexpire + "\n");
        obj.nexpire++;
        if (obj.cards.length == 0) {
            obj.call_handler([]);
            if (cache) {
                let adddata = {
                    email: email, name: "", company: "", department: "",
                    title: "", phone: "", address: "",
                };
                //obj.dbquery.add_data(adddata);
            }
        }
        if (obj.queryURI in ldapHandler) {
            delete ldapHandler[obj.queryURI];
        }
        if (obj.queryURI in queries) {
            delete queries[obj.queryURI];
        }
        for(let i = 0; i < obj.tohandlers.length; i++) {
            let func = obj.tohandlers[i];
            func();
        }
        obj.handlers = null;
        obj.tohandlers = null;
    };

    this.issued = false;

    this.search = function(func, arg, timeo, timeo2, tohndl) {
        let obj = this;
        if (!timeo) {
            timeo = 10 * 1000;
        } else {
            timeo = timeo * 1000;
        }
        if (this.timerID >= 0) {
            clearTimeout(this.timerID);
        }
        this.timeout2 = timeo2;
        this.timerID = setTimeout(function() {obj.timer_expired();}, timeo);
        this.register_handler(func, arg);
        this.register_tohandler(tohndl);
        if (this.issued) {
            return;
        }
        this.issued = true;
        if (cache) {
            let cachecb = function(dummy, data, error) {
                if (data) {
                    obj.cards.push(data);
                    obj.call_handler([data]);
                } else {
                    try{
                        obj.ldapsearch();
                    } catch(e) {
                        err(e);
                    }
                }  
                return;
            };
            this.dbquery.search(email, cachecb, 0);
        } else {
            this.ldapsearch();
        }
        return;
    };
}

function getQuery(ab, baseuri, cache, email) {
    let quri = ab.URI;
    if (quri in queries) {
        return queries[quri];
    } else {
        let n = new saQuery(ab, baseuri, cache, email);
        queries[quri] = n;
        return n;
    }
}

function analyzeQuery(condition) {
    let uc = true;
    let email;
    let total = 0;
    let str = "?(and";
    for(let i = 0; i < condition.length; i++) {
        let ci = condition[i];
        let substr = "(or";
        for(let j = 0; j < ci.length; j++) {
            if ((total != 0) || 
                (ci[j].key != "PrimaryEmail") ||
                (ci[j].op != "=")) {
                uc = false;
            }
            let subsubstr = "(" + ci[j].key + "," + ci[j].op + "," +
                            encodeURIComponent(ci[j].value) + ")";
            substr += subsubstr;
            email = ci[j].value;
            total++;
        }
        substr += ")";
        str += substr;
    }
    str += ")";
    //dbg("query = " + str + ", cache = " + uc + "\n");
    if (!uc) {
        email = "";
    }
    return {str: str, cache: uc, email:email};
}


function getAbEnt(uri, query, func, arg, timeo, timeo2, tohndl) {

    let q = analyzeQuery(query);
    let abURI = uri + q.str;
    let ab;
    try {
        ab = abManager.getDirectory(abURI);
    } catch(e) {
        func(arg, [], false);
        return;
    }
    if (ab.isRemote) {
        //dbg("abent remote: " + abURI);
        let rq = getQuery(ab, uri, q.cache, q.email);
        rq.search(func, arg, timeo, timeo2, tohndl);
        return 0;
    }
    
    let cards = ab.childCards;
    let cary = new Array();
    while (cards.hasMoreElements()) {
        let card = cards.getNext();
        if (card instanceof Components.interfaces.nsIAbCard) {
            let c = makeDataFromCard(card);
            cary.push(c);
        }
    }
    func(arg, cary, false);
    return 0;
}

