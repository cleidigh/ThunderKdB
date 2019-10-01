var EXPORTED_SYMBOLS = ['fpvsUtils'];

var fpvsPrefRoot = "extensions.FolderPaneSwitcher.";

var fpvsUtils = {
    initialized: false,
    event_handlers: [],
    pref_observers: [],

    init: function() {
        if (this.initialized) return;
        this.initialized = true;
        this.prefService = Components
            .classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService);
        this.prefBranch = this.prefService.getBranch(fpvsPrefRoot);
        this.viewsBranch = this.prefService.getBranch(fpvsPrefRoot + "views.");
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
        target.addEventListener(type, listener, useCapture);
        this.event_handlers.push([target, type, listener, useCapture]);
    },

    addObserver: function(branch, pref, observer, holdWeak) {
        branch.addObserver(pref, observer, holdWeak);
        this.pref_observers.push([branch, pref, observer]);
    },

    getStringPref: function(branch, prefName) {
        return branch.getStringPref(prefName);
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
        return views;
    },

    getViewDisplayName: function(treeView, commonName) {
        if (commonName in treeView._modeDisplayNames) {
            return treeView._modeDisplayNames[commonName];
        }
        var key = "folderPaneModeHeader_" + commonName;
        return treeView.messengerBundle.getString(key);
    },

    updateViews: function(treeView) {
        var storedViews = this.getViews();
        for (var commonName of treeView._modeNames) {
            var found = false;
            for (var viewNum in storedViews) {
                if (storedViews[viewNum]['name'] == commonName) {
                    found = true;
                    storedViews[viewNum]['found'] = true;
                    var displayName = this.getViewDisplayName(
                        treeView, commonName);
                    if (this.getStringPref(this.viewsBranch,
                                           viewNum + ".display_name")
                        != displayName) {
                        this.setStringPref(
                            this.viewsBranch, viewNum + ".display_name",
                            displayName);
                    }
                }
                continue;
            }
            if (found) continue;
            var i;
            for (i = 0; String(i) in storedViews; i++) ;
            this.setStringPref(this.viewsBranch, i + ".name", commonName);
            this.setStringPref(this.viewsBranch, i + ".display_name",
                               this.getViewDisplayName(treeView, commonName));
            this.viewsBranch.setBoolPref(i + ".menu_enabled", true);
            this.viewsBranch.setBoolPref(i + ".arrows_enabled", true);
            // So we don't reuse the same number.
            storedViews[i] = {name: 'dontworryaboutit', found: true};
        }
        for (var viewNum in storedViews) {
            if (! storedViews[viewNum]['found']) {
                this.viewsBranch.deleteBranch(viewNum + ".");
            }
        }
    }
}
