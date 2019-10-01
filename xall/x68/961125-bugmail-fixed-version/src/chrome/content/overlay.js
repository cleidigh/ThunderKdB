/*
bugmail extension for Thunderbird

    Copyright (C) 2008  Fabrice Desré

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Initial author is Fabrice Desré - fabrice.desre@gmail.com
*/
// Apparently already defined in the caller??
// const {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');
// Cu.importGlobalProperties(["DOMParser"]);

var _cacheStorage = null;
function get_cache_strorage() {
  if (_cacheStorage)
    return _cacheStorage;

  let svc = Cc["@mozilla.org/netwerk/cache-storage-service;1"]
              .getService(Ci.nsICacheStorageService);
  _cacheStorage = svc.memoryCacheStorage(Services.loadContextInfo.default);

  return _cacheStorage;
}

var bugmail = {
  loading : false,
  req: null,
  engines : [],

  addEngine: function(engine) {
    bugmail.engines.push(engine);
  },

  getFromCache: function(uri, successcb, failcb) {
    var cacheStorage = get_cache_strorage();

    try {
      cacheStorage.asyncOpenURI(makeURI(uri), "", Ci.nsICacheStorage.OPEN_READONLY, {
        onCacheEntryAvailable: function(aEntry, isNew, appCache, aStatus) {
          if (!aEntry)
            return failcb();
          var input = aEntry.openInputStream(0);
          var cache = new Object();
          cache.doc = null;
          cache.text = null;
          var parser = new DOMParser();
          try {
            var xml = parser.parseFromStream(input, "utf-8", input.available(), "text/xml");
            cache.doc = xml;
            successcb(cache);
          } catch(e) {
            cacheStorage.asyncOpenURI(makeURI(uri), "", Ci.nsICacheStorage.OPEN_READONLY, {
              onCacheEntryAvailable: function(aEntry, isNew, appCache, aStatus) {
                if (!aEntry)
                  return failcb();
                cache.text = aEntry.data.data;
                successcb(cache);
              },
              onCacheEntryCheck: function(cacheEntry, appCache) {
                return Ci.nsICacheEntryOpenCallback.ENTRY_WANTED;
              },
              onCacheEntryDoomed: function(aStatus) {
                failcb();
              }
            }, true);
          }
        },
        onCacheEntryCheck: function(cacheEntry, appCache) {
          return Ci.nsICacheEntryOpenCallback.ENTRY_WANTED;
        },
        onCacheEntryDoomed: function(aStatus) {
          failcb();
        }
      }, true);
    } catch(e) {
      failcb();
    }
  },

  storeInCache: function(uri, doc, text) {
    var cacheStorage = get_cache_strorage();
    if (doc) {
      cacheStorage.asyncOpenURI(makeURI(uri), "", Ci.nsICacheStorage.OPEN_NORMALLY, {
        onCacheEntryAvailable: function(aEntry, isNew, appCache, aStatus) {
          if (!aEntry)
            return;
          var output = aEntry.openOutputStream(0, -1);
          var ser = new XMLSerializer();
          ser.serializeToStream(doc, output, "utf-8");
          aEntry.markValid();
        },
        onCacheEntryCheck: function(cacheEntry, appCache) {
          return Ci.nsICacheEntryOpenCallback.ENTRY_WANTED;
        }
      }, true);
    }
    else {
      cacheStorage.asyncOpenURI(makeURI(uri), "", Ci.nsICacheStorage.OPEN_NORMALLY, {
        onCacheEntryAvailable: function(aEntry, isNew, appCache, aStatus) {
          if (!aEntry)
            return;
          var wrapper = Cc["@mozilla.org/supports-cstring;1"].createInstance(Ci.nsISupportsCString);
          wrapper.data = text;
          aEntry.cacheElement = wrapper;
          aEntry.markValid();
        },
        onCacheEntryCheck: function(cacheEntry, appCache) {
          return Ci.nsICacheEntryOpenCallback.ENTRY_WANTED;
        }
      }, true);
    }
  },

  update: function(bypassCache, mailURI, headers) {
    var engine = null;
    var uri = null;
    try {
      for (var i = 0; i < bugmail.engines.length; i++) {
        if (bugmail.engines[i].isBug(mailURI, headers)) {
          uri = bugmail.engines[i].getBugURI(mailURI, headers);
          if (uri) {
            engine = bugmail.engines[i];
            break;
          }
        }
      }
    } catch (e) {
      Services.console.logStringMessage("Bugmail: Error processing engine "+(i+1)+" for "+mailURI);
      Components.utils.reportError(e);
    }

    if (engine) {
      document.getElementById("bugmail-logo").setAttribute("src", engine.iconURL);

      if (bugmail.loading) {
        bugmail.req.abort();
                bugmail.loading = false;
      }

      var download_bug_info = function() {
        bugmail.req = new XMLHttpRequest();
        bugmail.req.open("GET", uri);
        bugmail.req.onload = function() {
          bugmail.loading = false;
          document.getElementById("bugmail-throbber").setAttribute("collapsed", "true");
          bugmail.storeInCache(uri, this.responseXML, this.responseText);
          engine.updateUI(this.responseXML, this.responseText);
        }
        bugmail.req.onerror = function() {
          bugmail.loading = false;
          document.getElementById("bugmail-throbber").setAttribute("collapsed", "true");
        }
        var content = document.getElementById("bugmail-info");
        while (content.lastChild) {
          content.removeChild(content.lastChild);
        }
        document.getElementById("bugmail-details").setAttribute("collapsed", "true");
        document.getElementById("bugmail-box").removeAttribute("collapsed");
        document.getElementById("bugmail-throbber").removeAttribute("collapsed");
        bugmail.loading = true;
        bugmail.req.send(null);
      }

      if (!bypassCache) {
        bugmail.getFromCache(uri, function(data) {
          document.getElementById("bugmail-box").removeAttribute("collapsed");
          var content = document.getElementById("bugmail-info");
          while (content.lastChild) {
            content.removeChild(content.lastChild);
          }
          engine.updateUI(data.doc, data.text);
        }, download_bug_info);
      } else {
        download_bug_info();
      }
    }
    else {
      document.getElementById("bugmail-box").setAttribute("collapsed", "true");
    }
  },

  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "MsgMsgDisplayed") {
      var messenger =  Cc["@mozilla.org/messenger;1"].
      createInstance().QueryInterface(Ci.nsIMessenger);
      var msgService = messenger.messageServiceFromURI(aData);
      bugmailStreamListener.uri = aData;
      bugmailStreamListener.bypassCache = false;
      try {
        msgService.streamMessage(aData, bugmailStreamListener, null,
                                 null, false, "", null);
       } catch(e) {
       }
    }
  },

  forceUpdate: function() {
    var messenger =  Cc["@mozilla.org/messenger;1"]
                       .createInstance().QueryInterface(Ci.nsIMessenger);
    var msgService = messenger.messageServiceFromURI(bugmailStreamListener.uri);
    bugmailStreamListener.bypassCache = true;
    try {
      msgService.streamMessage(bugmailStreamListener.uri, bugmailStreamListener, null,
                               null, false, "", null);
    } catch(e) {
    }
  },

  loadHiddenIFrame: function(text) {
    var content = document.getElementById("bugmail-iframe").contentDocument;
    var range = content.createRange();
    var root = content.getElementById("root");
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }
    range.selectNode(root);
    var frag = range.createContextualFragment(text);
    root.appendChild(frag);
    return content;
  }
};

var bugmailStreamListener = {

  message: "",
  uri: null,
  bypassCache: false,

  QueryInterface: function(aIId, instance) {
    if (aIId.equals(Ci.nsIStreamListener) ||
        aIId.equals(Ci.nsISupports))
      return this;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  onStartRequest: function(request) {
  },

  onStopRequest: function(request, status, errorMsg) {
    try {
      var headers = this.message.split(/\n\n|\r\n\r\n|\r\r/)[0];
      var mimeHeaders = Cc["@mozilla.org/messenger/mimeheaders;1"]
                          .createInstance(Ci.nsIMimeHeaders);
      mimeHeaders.initialize(headers, headers.length);
      this.message = "";
      bugmail.update(this.bypassCache, this.uri, mimeHeaders);
    }
    catch (ex) {
      return;
    }
  },

  onDataAvailable: function(request, inputStream, offset, count) {
    try {
      var inStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
      inStream.init(inputStream);

      // It is necessary to read in data from the input stream
      var inData = inStream.read(count);

      // Also ignore stuff after the first 25K or so
      // should be enough to get headers...
      if (this.message && this.message.length > 25000)
        return 0;

      this.message += inData;
      return 0;
    }
    catch (ex) {
      return 0;
    }
  }
};


function cleanup() {
  //alert("Bugmail cleanup");
  var ObserverService = Cc["@mozilla.org/observer-service;1"]
                          .getService(Ci.nsIObserverService);
  ObserverService.removeObserver(bugmail, "MsgMsgDisplayed");
}

var ObserverService = Cc["@mozilla.org/observer-service;1"]
                        .getService(Ci.nsIObserverService);
ObserverService.addObserver(bugmail, "MsgMsgDisplayed", false);
