// -*- js-indent-level: 2 -*-
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
// Copyright 2019 Jonathan Kamens.

const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");

// We can't import this here because when this JavaScript file is initially
// parsed chrome://FolderPaneSwitcher/content/utils.jsm isn't resolvable yet.
// So we declare the global variable here and load it in onLoad.
var fpvsUtils;

// Rules:
// 
// Enter title bar:
//   Start timer
// Exit title bar:
//   Cancel timer
// Drag over:
//   Record current folder for movecopycompleted listener.
// Timer expires:
//   Cache old folder view
//   Switch to all folders view
//   Initiate the recurring watch timer
// Drag finished:
//   Cancel timer
//   Switch to cached folder view, if any
// Watch timer:
//   Is there a cached view? Yes:
//     Is there no current drag session? Yes:
//       Pretend drag finished
//   Is there a cached view? No:
//     Cancel watch timer

var FolderPaneSwitcher = {
  addRemoveButtonsObserver: {
    observe: function(document) {
      var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
      var should_be_hidden =
          !prefBranch.getBoolPref("extensions.FolderPaneSwitcher.arrows");
      var is_hidden =
          !!document.getElementById(
            "FolderPaneSwitcher-back-arrow-button").hidden;
      if (should_be_hidden != is_hidden) {
        document.getElementById("FolderPaneSwitcher-back-arrow-button").
          hidden = should_be_hidden;
        document.getElementById("FolderPaneSwitcher-forward-arrow-button").
          hidden = should_be_hidden;
      }
    }
  },

  goBackView: function(window) {
    var gFolderTreeView = window.gFolderTreeView;
    var currentMode = gFolderTreeView.mode;
    var prevMode = null;
    var modes = Object.keys(gFolderTreeView._modes)
    for (var i in modes) {
      m = modes[i];
      if (m == currentMode) {
        if (prevMode) {
          gFolderTreeView.mode = prevMode;
          return;
        }
      }
      if (!FolderPaneSwitcher.views[m] ||
          (FolderPaneSwitcher.views[m]['menu_enabled'] &&
           FolderPaneSwitcher.views[m]['arrows_enabled'])) {
        prevMode = m;
      }
    }
    if (prevMode) {
      gFolderTreeView.mode = prevMode;
    }
  },
    
  goForwardView: function(window) {
    var gFolderTreeView = window.gFolderTreeView;
    var currentMode = gFolderTreeView.mode;
    var prevMode = null;
    var modes = Object.keys(gFolderTreeView._modes).reverse()
    for (var i in modes) {
      m = modes[i];
      if (m == currentMode) {
        if (prevMode) {
          gFolderTreeView.mode = prevMode;
          return;
        }
      }
      if (!FolderPaneSwitcher.views[m] ||
          (FolderPaneSwitcher.views[m]['menu_enabled'] &&
           FolderPaneSwitcher.views[m]['arrows_enabled'])) {
        prevMode = m;
      }
    }
    if (prevMode) {
      gFolderTreeView.mode = prevMode;
    }
  },

  views: null,

  viewsObserver: {
    register: function(window, logger, views) {
      this.window = window;
      this.logger = logger;
      this.views = views;
      fpvsUtils.addObserver(fpvsUtils.viewsBranch, "", this);
      for (var name in views) {
        view = views[name];
        if (! view['menu_enabled']) {
          this.observe(fpvsUtils.viewsBranch, "",
                       view['number'] + '.menu_enabled');
        }
      }
    },

    observe: function(aSubject, aTopic, aData) {
      var gFolderTreeView = this.window.gFolderTreeView;
      var match = /^(\d+)\.(.*_enabled)$/.exec(aData);
      if (! match) return;
      var viewNum = match[1];
      var which = match[2];
      var enabled = aSubject.getBoolPref(aData);
      var name = fpvsUtils.getStringPref(fpvsUtils.viewsBranch,
                                         viewNum + ".name");
      var view = this.views[name];
      view[which] = enabled;
      if (which != 'menu_enabled') return;
      if (enabled) {
        gFolderTreeView.registerFolderTreeMode(name, view['handler'],
                                               view['display_name']);
      } else {
        view['handler'] = gFolderTreeView._modes[name];
        gFolderTreeView.unregisterFolderTreeMode(name);
      }
    }
  },

  onLoad: function(window) {
    var gFolderTreeView = window.gFolderTreeView;
    var document = window.document;
    var {DefaultPreferencesLoader} = ChromeUtils.import(
      "chrome://FolderPaneSwitcher/content/defaultPreferencesLoader.jsm");
    var loader = new DefaultPreferencesLoader();
    loader.parseUri("chrome://FolderPaneSwitcher/content/prefs.js");

    fpvsUtils.init();

    if (! FolderPaneSwitcher.logger) {
      FolderPaneSwitcher.logger = Log4Moz.getConfiguredLogger(
        "extensions.FolderPaneSwitcher",
	Log4Moz.Level.Trace,
	Log4Moz.Level.Info,
	Log4Moz.Level.Debug);
    }

    var me = FolderPaneSwitcher;
    var title = document.getElementById("folderPane-toolbar");
    fpvsUtils.updateViews(gFolderTreeView);
    FolderPaneSwitcher.views = fpvsUtils.getViews(true);
    FolderPaneSwitcher.viewsObserver.register(
      window, FolderPaneSwitcher.logger, FolderPaneSwitcher.views);

    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);

    title.addEventListener("dragexit", me.onDragExit, false);
    title.addEventListener("drop", me.onDragDrop, false);
    title.addEventListener("dragenter", me.onDragEnter, false);
    title.collapsed = false;
    FolderPaneSwitcher.addRemoveButtonsObserver.observe(document);
    var observer = {
      observe: function() {
        FolderPaneSwitcher.addRemoveButtonsObserver.observe(document);
      }
    }
    fpvsUtils.addObserver(prefBranch, "extensions.FolderPaneSwitcher.arrows",
                          observer, false);

    var folderTree = document.getElementById("folderTree");
    folderTree.addEventListener("dragover", me.onDragOver, false);
    // Dragexit and dragdrop don't actually get sent when the user
    // drops a message into a folder. This is arguably a bug in
    // Thunderbird (see bz#674807). To work around it, I register a
    // folder listener to detect when a move or copy is
    // completed. This is gross, but appears to work well enough.
    var ns =
      Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
      .getService(Components.interfaces.nsIMsgFolderNotificationService);

    // Disable this because the watcher serves the same function now,
    // by automatically reverting to the cached view within a half
    // second at most of when the drop finishes, and leaving this
    // active cdauses the view to revert if some other message happens
    // to be deposited into a folder while the drag is in progress.
    // I'm keeping the code, inactive, in case I determine later that
    // it needs to be reactivated, e.g., if we can get rid of the
    // watcher because the drag&drop infrastructure has improved to
    // the point where the watcher is no longer needed.

//    ns.addListener(me.folderListener, ns.msgsMoveCopyCompleted|
//		   ns.folderMoveCopyCompleted);
  },

  onUnload: function() {
    fpvsUtils.uninit();
  },

  folderListener: {
    msgsMoveCopyCompleted: function(aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
      FolderPaneSwitcher.logger.debug("msgsMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
	// Still remotely possible that someone else could be copying
	// into the same folder at the same time as us, but this is
	// the best we can do until they fix the event bug.
	FolderPaneSwitcher.onDragDrop({type:"msgsMoveCopyCompleted"});
      }
      else {
	FolderPaneSwitcher.logger.debug("msgsMoveCopyCompleted: non-matching folder");
      }
    },
    folderMoveCopyCompleted: function(aMove, aSrcFolder, aDestFolder) {
      FolderPaneSwitcher.logger.debug("folderMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
	// Still remotely possible that someone else could be copying
	// into the same folder at the same time as us, but this is
	// the best we can do until they fix the event bug.
	FolderPaneSwitcher.onDragDrop({type:"folderMoveCopyCompleted"});
      }
      else {
	FolderPaneSwitcher.logger.debug("folderMoveCopyCompleted: non-matching folder");
      }
    }
  },

  onDragEnter: function(aEvent) {
    FolderPaneSwitcher.logger.debug("onDragEnter");
    if (FolderPaneSwitcher.cachedView) {
      FolderPaneSwitcher.logger.debug("onDragEnter: switch already in progress");
    }
    else {
      FolderPaneSwitcher.setTimer(aEvent.view);
    }
  },

  onDragExit: function(aEvent) {
    FolderPaneSwitcher.logger.debug("onDragExit("+aEvent.type+")");
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
      FolderPaneSwitcher.timer = null;
    }
  },

  onDragOver: function(aEvent) {
    FolderPaneSwitcher.logger.trace("onDragOver"); // too verbose for debug
    FolderPaneSwitcher.currentFolder = aEvent.view.
      gFolderTreeView.getFolderAtCoords(aEvent.clientX, aEvent.clientY);
  },

  onDragDrop: function(aEvent) {
    FolderPaneSwitcher.logger.debug("onDragDrop("+aEvent.type+")");
    if (FolderPaneSwitcher.cachedView) {
      aEvent.view.gFolderTreeView.mode = FolderPaneSwitcher.cachedView;
      FolderPaneSwitcher.cachedView = null;
      FolderPaneSwitcher.currentFolder = null;
    }
  },
  
  timer: null,

  setTimer: function(window) {
    if (FolderPaneSwitcher.timer) {
      FolderPaneSwitcher.timer.cancel();
    }
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    var delay = prefBranch.getIntPref("extensions.FolderPaneSwitcher.delay");
    var t = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
    t.initWithCallback(new timerCallback(window), delay,
		       Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    FolderPaneSwitcher.timer = t;
  },

  watchTimer: null
};

function timerCallback(window) {
  this.window = window;
}

timerCallback.prototype = {
  notify: function() {
    FolderPaneSwitcher.logger.debug("timerCallback.notify");
    FolderPaneSwitcher.cachedView = this.window.gFolderTreeView.mode;
    this.window.gFolderTreeView.mode = "all";

    FolderPaneSwitcher.timer = null;

    var t = Components.classes["@mozilla.org/timer;1"].
	createInstance(Components.interfaces.nsITimer);
    t.initWithCallback(new watchTimerCallback(this.window), 250,
		       Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    FolderPaneSwitcher.watchTimer = t;
  }
};

function watchTimerCallback(window) {
  this.window = window;
}

watchTimerCallback.prototype = {
  notify: function() {
    if (FolderPaneSwitcher.cachedView) {
      var dragService = Components
	  .classes["@mozilla.org/widget/dragservice;1"]
	  .getService(Components.interfaces.nsIDragService);
      var dragSession = dragService.getCurrentSession();
      if (! dragSession) {
	FolderPaneSwitcher.onDragDrop({type: "watchTimer", view: this.window});
      }
    }
    if (! FolderPaneSwitcher.cachedView) {
      // It's null either because we just called onDragDrop or
      // because something else finished the drop.
      FolderPaneSwitcher.watchTimer.cancel();
      FolderPaneSwitcher.watchTimer = null;
    }
  }
};

function forEachOpenWindow(todo) { // Apply a function to all open windows
  for (let window of Services.wm.getEnumerator("mail:3pane")) {
    if (window.document.readyState != "complete") continue;
    todo(window);
  }
}

function loadIntoWindow(window) {
    var document = window.document;

    var toolbar = document.getElementById("folderPane-toolbar");
    if (! toolbar) return;

    if (document.getElementById("FolderPaneSwitcher-back-arrow-button")) return;

    var button = document.createXULElement("toolbarbutton");
    button.setAttribute("id", "FolderPaneSwitcher-back-arrow-button");
    button.setAttribute(
      "image", "chrome://FolderPaneSwitcher/content/left-arrow.png");
    listener = function() { FolderPaneSwitcher.goBackView(window); }
    button.addEventListener("command", listener);
    toolbar.appendChild(button);

    button = document.createXULElement("toolbarbutton");
    button.setAttribute("id", "FolderPaneSwitcher-forward-arrow-button");
    button.setAttribute(
        "image", "chrome://FolderPaneSwitcher/content/right-arrow.png");
    listener = function() { FolderPaneSwitcher.goForwardView(window); }
    button.addEventListener("command", listener);
    toolbar.appendChild(button);

    FolderPaneSwitcher.onLoad(window);
}

function unloadFromWindow(window) {
  var document = window.document;
  var toolbar = document.getElementById("folderPane-toolbar");
  if (! toolbar) return;
  var button = document.getElementById("FolderPaneSwitcher-back-arrow-button");
  if (! button) return;
  toolbar.removeChild(button);
  button = document.getElementById("FolderPaneSwitcher-forward-arrow-button");
  toolbar.removeChild(button);
}

var WindowObserver = {
    observe: function(aSubject, aTopic, aData) {
        var window = aSubject;
        var document = window.document;
        if (document.documentElement.getAttribute("windowtype") ==
            "mail:3pane") {
            loadIntoWindow(window);
        }
    },
};

// https://developer.mozilla.org/en-US/docs/Extensions/bootstrap.js
// Also, lots of code here cribbed from
// https://developer.mozilla.org/en-US/Add-ons/How_to_convert_an_overlay_extension_to_restartless

function startup(data, reason) {
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    ///   string id
    ///   string version
    ///   nsIFile installPath
    ///   nsIURI resourceURI
    /// 
    /// Reason types:
    ///   APP_STARTUP
    ///   ADDON_ENABLE
    ///   ADDON_INSTALL
    ///   ADDON_UPGRADE
    ///   ADDON_DOWNGRADE
    fpvsUtils = ChromeUtils.import("chrome://FolderPaneSwitcher/content/utils.jsm").fpvsUtils;
    Services.obs.addObserver(WindowObserver, "mail-startup-done", false);
    forEachOpenWindow(loadIntoWindow);
}

function shutdown(data, reason) {
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    ///   string id
    ///   string version
    ///   nsIFile installPath
    ///   nsIURI resourceURI
    /// 
    /// Reason types:
    ///   APP_SHUTDOWN
    ///   ADDON_DISABLE
    ///   ADDON_UNINSTALL
    ///   ADDON_UPGRADE
    ///   ADDON_DOWNGRADE
    if (reason == APP_SHUTDOWN)
        return;

    forEachOpenWindow(unloadFromWindow);
    Services.obs.removeObserver(WindowObserver, "mail-startup-done");
    FolderPaneSwitcher.onUnload();
}

function install(data, reason) {
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    ///   string id
    ///   string version
    ///   nsIFile installPath
    ///   nsIURI resourceURI
    /// 
    /// Reason types:
    ///   ADDON_INSTALL
    ///   ADDON_UPGRADE
    ///   ADDON_DOWNGRADE
}

function uninstall(data, reason) {
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    ///   string id
    ///   string version
    ///   nsIFile installPath
    ///   nsIURI resourceURI
    /// 
    /// Reason types:
    ///   ADDON_UNINSTALL
    ///   ADDON_UPGRADE
    ///   ADDON_DOWNGRADE
}
