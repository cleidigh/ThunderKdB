//export {fpvsUtils};

var EXPORTED_SYMBOLS = ['fpvsUtils','tupdateViews'];

var fpvsPrefRoot = "extensions.FolderPaneSwitcher.";
  var gviews={};
  var Views=null;
  var fpvsUtils = {
    initialized: false,
    event_handlers: [],
    pref_observers: [],
    Views:null,
    fupdate:false,

    init: async function() {
        if (this.initialized) return;
        this.initialized = true;
        this.prefService = Components
           .classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefService);
        this.prefBranch = this.prefService.getBranch(fpvsPrefRoot);
        this.viewsBranch = this.prefService.getBranch(fpvsPrefRoot + "views.");

    },
    getIntPref:  function(pref)
    {
          return this.prefBranch.getIntPref(pref);
    },
    uninit: function() {
        for (var args of this.event_handlers) {
            args[0].removeEventListener(args[1], args[2], args[3]);
        }
        for (var args of this.pref_observers) {
            args[0].removeObserver(args[1], args[2]);
        }
    },
    addEventListener: function(target, type, listener, useCapture) {
        try{
      //  target.addEventListener(type, listener, useCapture);
        this.event_handlers.push([target, type, listener, useCapture]);
        }
        catch(e){
          alert(e)
        }
    },
   addObserver: function(branch, pref, observer, holdWeak) {
        branch.addObserver(pref, observer, holdWeak);
       this.pref_observers.push([branch, pref, observer]);
    },
    getStringPref: function(branch, prefName) {
        return branch.getStringPref(prefName);
    },
    get_IntPref: function(branch, prefName) {
        return branch.getIntPref(prefName);
    },
    setStringPref: function(branch, prefName, value) {
        return branch.setStringPref(prefName, value);
    },
    getViews: function(byName) {
        var views = {};
        var obj = {};
        var children = this.viewsBranch.getChildList("", obj);
        var regex = /^(\d+)\./;
        for (var child of children) {
            var match = regex.exec(child);
            var num = match[1];
            if (num in views) {
                continue;
            }
            try {
                var display_name = this.getStringPref(this.viewsBranch,
                                                      num + ".display_name");
            }
            catch (ex) {
                continue;
            }
            var view = {
                display_name: display_name,
                menu_enabled: this.viewsBranch.getBoolPref(
                    num + ".menu_enabled"),
                arrows_enabled: this.viewsBranch.getBoolPref(
                    num + ".arrows_enabled")
            };
            var name = this.getStringPref(this.viewsBranch, num + ".name");
            // The All Folders view can't be completely disabled.
            if (name == "all") {
                view['menu_enabled'] = true;
            }
            if (byName) {
                view['number'] = num;
                views[name] = view;
            }
            else {
                view['name'] = name;
                views[num] = view;
            }
        }
        Views=views;
        return views;
    },
    getViewDisplayName: function(treeView, commonName) {
        if (commonName in treeView._modeDisplayNames) {
            return treeView._modeDisplayNames[commonName];
        }
        var key = "folderPaneModeHeader_" + commonName;
        return treeView.messengerBundle.getString(key);
    },
    updateViews: async function(treeView) {
        tupdateViews(treeView)
    }
}
 function  tupdateViews(treeView)
{
    try {
        var storedViews=  fpvsUtils.getViews();
        for (var commonName of treeView._modeNames) {
            var found = false;
            for (var viewNum in storedViews) {
                if (storedViews[viewNum]['name'] == commonName) {
                    found = true;
                    storedViews[viewNum]['found'] = true;
                    var displayName = fpvsUtils.getViewDisplayName(
                        treeView, commonName);
                    if (fpvsUtils.getStringPref(fpvsUtils.viewsBranch,
                                           viewNum + ".display_name")
                        != displayName) {
                            fpvsUtils.setStringPref(
                                fpvsUtils.viewsBranch, viewNum + ".display_name",
                            displayName);
                    }
                }
                continue;
            }
            if (found) continue;
            var i;
            for (i = 0; String(i) in storedViews; i++) ;
            fpvsUtils.setStringPref(fpvsUtils.viewsBranch, i + ".name", commonName);
            fpvsUtils.setStringPref(fpvsUtils.viewsBranch, i + ".display_name",
                               fpvsUtils.getViewDisplayName(treeView, commonName));
            fpvsUtils.viewsBranch.setBoolPref(i + ".menu_enabled", true);
            fpvsUtils.viewsBranch.setBoolPref(i + ".arrows_enabled", true);
            // So we don't reuse the same number.
            storedViews[i] = {name: 'dontworryaboutit', found: true};
        }
        for (var viewNum in storedViews) {
            if (! storedViews[viewNum]['found']) {
                fpvsUtils.viewsBranch.deleteBranch(viewNum + ".");
            }
        }
        }
    catch(err){
    console.error(err)}
}