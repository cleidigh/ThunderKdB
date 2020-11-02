//Get various part of the web extensiion framewrork that we need.
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
//var {Log4Moz} = ChromeUtils.import("resource:///modules/gloda/log4moz.js");
var extension = ExtensionParent.GlobalManager.getExtension("FolderPaneSwitcher@kamens.us");

var { fpvsUtils } = ChromeUtils.import(extension.rootURI.resolve("chrome/content/utils.js"));
let main_window = Services.wm.getMostRecentWindow("mail:3pane");
var windowState="";

var btnimg1;
var btnimg2;

var fpvs_api = class extends ExtensionCommon.ExtensionAPI{



  onShutdown(isAppShutdown) {
    if (isAppShutdown) return;

    // invalidate the startup cache, such that after updating the addon the old
    // version is no longer cached
    unloadFromWindow(main_window);

    console.log("webextension:shutdown");
  }


  getAPI(context)
        {
            return{
          fpvs_api: {
            on_start:  async function() {
            btnimg1=context.extension.rootURI.resolve("left_arrow.png");
            btnimg2=context.extension.rootURI.resolve("right_arrow.png");
            for (let window of Services.wm.getEnumerator("mail:3pane")) {
            if (window.document.readyState != "complete") {
            FolderPaneSwitcher.logger.debug("forEachOpenWindow skip, readyState=" +
            window.document.readyState);
            continue;
            }
            return true;
            }
},


unLoad:async function(){
  try
    {
      unloadFromWindow(main_window);
    }
  catch(err)
   {
    console.error(err)
   }
},

loadIntoWindow: async function(){
Services.obs.addObserver(WindowObserver, "mail-startup-done", false);
//await FolderPaneSwitcher.loadWindow();
/*
while (windowState!="Complete")
{
   for (let window of Services.wm.getEnumerator("mail:3pane"))
  {
    //if (window.document.readyState != "complete") {
     // FolderPaneSwitcher.logger.debug("forEachOpenWindow skip, readyState=" + window.document.readyState);
     //                                 console.log(window.document.readyState);

    if (window.document.readyState == "loading")
      {
        windowState="loading";

                        console.log(window.document.readyState);
      }
     else if(window.document.readyState == "interactive")
     {
       windowState="interactive";

                      console.log(window.document.readyState);
      }
    else if (window.document.readyState == "complete")
      {
        windowState="complete";
        FolderPaneSwitcher._loadWindow();
        }
  }



  if (windowState=="complete") break;

}

*/
 },
 onLoad: async function(window) {
 FolderPaneSwitcher.loadWindow();
 FolderPaneSwitcher.onLoad();
},

observe: async function(aSubject, aTopic, aData) {
  aSubject==""? aSubject=fpvsUtils.viewsBranch:aSubject;
  var gFolderTreeView = main_window.gFolderTreeView;
  var match = /^(\d+)\.(.*_enabled)$/.exec(aData);
  if (! match) return;
  var viewNum = match[1];
  var which = match[2];
  var enabled = aSubject.getBoolPref(aData);
  var name = await fpvsUtils.getStringPref(fpvsUtils.viewsBranch,
                                     viewNum + ".name");
  var view = FolderPaneSwitcher.views[name];
  view[which] = enabled;
  if (which != 'menu_enabled') return;
  if (enabled && !gFolderTreeView._modes[name] ) {
    gFolderTreeView.registerFolderTreeMode(name, view['handler'],
                                           view['display_name']);
  } else if (!enabled && gFolderTreeView._modes[name] ) {
    view['handler'] = gFolderTreeView._modes[name];
    gFolderTreeView.unregisterFolderTreeMode(name);
  }
}
          }
        };
    }

  }

var FolderPaneSwitcher = {
    // This is replaced with Log4Moz when we're initialized, but we need to be
    // able to log before it's initialized.
    logger: {
      trace(msg) {
        console.log("extensions.FolderPaneSwitcher TRACE " + msg);
      },
  
      debug(msg) {
        console.log("extensions.FolderPaneSwitcher DEBUG " + msg);
      }
    },
    loadWindow:async function(){
      let folder = null;
      let enumerator = Services.wm.getEnumerator("mail:3pane");
      while (!folder && enumerator.hasMoreElements()) {
        let win = enumerator.getNext();
        var toolbar = win.document.getElementById("folderPane-toolbar");

      }
      let recentWindow = Services.wm.getMostRecentWindow("mail:3pane");
      let button = recentWindow.document.createXULElement("button");
      if(!toolbar) return;
      if (recentWindow.document.getElementById("FolderPaneSwitcher-back-arrow-button")) return;
        button.setAttribute("id","FolderPaneSwitcher-back-arrow-button");
        button.setAttribute("image",btnimg1);
     button.setAttribute("style", "min-height: 4ex;max-height: 4ex;max-width:7ex;min-width:7px;margin-inline-end:0;margin-inline:0;margin:0;");
     var listener = function() { FolderPaneSwitcher.goBackView(recentWindow); }
     button.addEventListener("command", listener);
     toolbar.appendChild(button);
     button = recentWindow.document.createXULElement("button");
     button.setAttribute("id", "FolderPaneSwitcher-forward-arrow-button");
     toolbar.setAttribute("align", "stretch");
     button.setAttribute("image",btnimg2);
     button.setAttribute("style", "min-height: 4ex;max-height: 4ex;max-width:7ex;min-width:7px;margin-inline-start:0;margin-inline:0;margin:0;");
     var listener = function() { FolderPaneSwitcher.goForwardView(recentWindow); }
     button.addEventListener("command", listener);
     toolbar.appendChild(button);
    },
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
      goBackView: async function(window) {

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

      goForwardView:async function(window) {
        var gFolderTreeView = window.gFolderTreeView;
        var currentMode = gFolderTreeView.mode;
        var prevMode = null;
        var modes = Object.keys(gFolderTreeView._modes).reverse()
        for (var i in modes) {
         let m = modes[i];
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
        register:  function(window, logger, views) {
          this.window = window;
          this.logger = logger;
          this.views = views;
// by passsing this code due to the reason is, not accessible observer from utils, need to check why is that.
         // fpvsUtils.addObserver(fpvsUtils.viewsBranch, "", this);
          var fpvsPrefRoot = "extensions.FolderPaneSwitcher.";
          var prefService = Components
          .classes["@mozilla.org/preferences-service;1"]
          .getService(Components.interfaces.nsIPrefService);
            prefBranch = prefService.getBranch(fpvsPrefRoot);
            viewsBranch = prefService.getBranch(fpvsPrefRoot + "views.");
            viewsBranch.addObserver("", this, false);

          for (var name in views) {
            view = views[name];
            if (! view['menu_enabled']) {
              this.observe(fpvsUtils.viewsBranch, "",
              view['number'] + '.menu_enabled');
            }
          }
        },


        add_Observer: function(branch, pref, observer, holdWeak) {
         // branch.addObserver(pref, observer, holdWeak);
        // this.pref_observers.push([branch, pref, observer]);
      },





    observe: async function(aSubject, aTopic, aData) {
        var gFolderTreeView = main_window.gFolderTreeView;
        var match = /^(\d+)\.(.*_enabled)$/.exec(aData);
        if (! match) return;
        var viewNum = match[1];
        var which = match[2];
        var enabled = aSubject.getBoolPref(aData);
        var name = await fpvsUtils.getStringPref(fpvsUtils.viewsBranch,
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


    onLoad:async function(window) {
       //  this.logger.debug("onLoad, readyState=" + main_window.document.readyState);
       var gFolderTreeView = main_window.gFolderTreeView;
       var document = main_window.document;
       var {DefaultPreferencesLoader} = ChromeUtils.import(extension.rootURI.resolve("chrome/content/defaultPreferencesLoader.js"));
       var loader = new DefaultPreferencesLoader();
       loader.parseUri(extension.rootURI.resolve("chrome/content/prefs.js"));

       fpvsUtils.init();

         // need to find an alternative for this log4Moz

        //  FolderPaneSwitcher.logger = Log4Moz.getConfiguredLogger(
        //    "extensions.FolderPaneSwitcher",
        // Log4Moz.Level.Trace,
        // Log4Moz.Level.Info,
        // Log4Moz.Level.Debug);

       var me = FolderPaneSwitcher;
       var title = main_window.document.getElementById("folderPane-toolbar");
       FolderPaneSwitcher.logger.debug("title=" + title);
      fpvsUtils.updateViews(gFolderTreeView);
       FolderPaneSwitcher.views =fpvsUtils.getViews(true);

      // need to modify this area and bypassing just for now.
       FolderPaneSwitcher.viewsObserver.register(
       main_window, FolderPaneSwitcher.logger, FolderPaneSwitcher.views);
       var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
           .getService(Components.interfaces.nsIPrefBranch);
       // need to check what modification have to be done here ..


       //need to transfer this code at the browseraction
       title.addEventListener("dragexit", me.onDragExit, false);
       title.addEventListener("drop", me.onDragDrop, false);
       title.addEventListener("dragenter", me.onDragEnter, false);
       title.collapsed = false;
       FolderPaneSwitcher.logger.debug("title.collapsed=" + title.collapsed);
       // This is really gross. There appears to be some sort of race condition
       // in TB68 which causes it occasionally to be not finished initializing the
       // window when this functiong gets called, such that shortly after this
       // function sets collapsed to false, TB sets it back to true. Ugh! So we
       // try to catch that and fix it here.
       this.raceIntervalsRemaining = 5
       this.raceInterval = main_window.setInterval(() => {
         this.raceIntervalsRemaining--;
         if (title.collapsed) {
           tFolderPaneSwitcherhis.logger.warn("title.collapsed changed, flipping it back!");
           title.collapsed = false;
           this.raceIntervalsRemaining = 0;
         }
         else {
           FolderPaneSwitcher.logger.debug("title.collapsed is still false, will keep " +
                             "checking for " + this.raceIntervalsRemaining +
                           " more seconds");
         }
         if (! this.raceIntervalsRemaining) {
           FolderPaneSwitcher.logger.debug("Clearing this.raceInterval");
           main_window.clearInterval(this.raceInterval);
         }
       }, 1000);
       FolderPaneSwitcher.addRemoveButtonsObserver.observe(main_window.document);
       var observer = {
         observe: function() {
           FolderPaneSwitcher.addRemoveButtonsObserver.observe(main_window.document);
         }
       }
         //  need to check another single menthod to handle this , i wondering why the function is not accessible, so  adding inline observer

   //    FolderPaneSwitcher.add_Observer(prefBranch, "extensions.FolderPaneSwitcher.arrows",
    //                         observer, false);
        prefBranch.addObserver('extensions.FolderPaneSwitcher.arrows',observer,false);

       var folderTree = main_window.document.getElementById("folderTree");
       folderTree.addEventListener("dragover", me.onDragOver, false);
       // Dragexit and dragdrop don't actually get sent when the user
       // drops a message into a folder. This is arguably a bug in
       // Thunderbird (see bz#674807). To work around it, I register a
       // folder listener to detect when a move or copy is
       // completed. This is gross, but appears to work well enough.
       // Disable this because the watcher serves the same function now,
       // by automatically reverting to the cached view within a half
       // second at most of when the drop finishes, and leaving this
       // active cdauses the view to revert if some other message happens
       // to be deposited into a folder while the drag is in progress.
       // I'm keeping the code, inactive, in case I determine later that
       // it needs to be reactivated, e.g., if we can get rid of the
       // watcher because the drag&drop infrastructure has improved to
       // the point where the watcher is no longer needed.
     //    var ns =
     //      Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
     //      .getService(Components.interfaces.nsIMsgFolderNotificationService);
     //
     //    ns.addListener(me.folderListener, ns.msgsMoveCopyCompleted|
     //		   ns.folderMoveCopyCompleted);
      },


      onUnload: function() {
        fpvsUtils.uninit();
      },



  folderListener: {
    msgsMoveCopyCompleted: function(aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
      FolderPaneSwitcher.logger.trace("msgsMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
    // Still remotely possible that someone else could be copying
    // into the same folder at the same time as us, but this is
    // the best we can do until they fix the event bug.
    FolderPaneSwitcher.onDragDrop({type:"msgsMoveCopyCompleted"});
      }
      else {
    FolderPaneSwitcher.logger.debug(
          "msgsMoveCopyCompleted: non-matching folder");
      }
    },
    folderMoveCopyCompleted: function(aMove, aSrcFolder, aDestFolder) {
      FolderPaneSwitcher.logger.trace("folderMoveCopyCompleted");
      if (aDestFolder == FolderPaneSwitcher.currentFolder) {
    // Still remotely possible that someone else could be copying
    // into the same folder at the same time as us, but this is
    // the best we can do until they fix the event bug.
    FolderPaneSwitcher.onDragDrop({type:"folderMoveCopyCompleted"});
      }
      else {
    FolderPaneSwitcher.logger.debug(
          "folderMoveCopyCompleted: non-matching folder");
      }
    }
  },


  onDragEnter: function(aEvent) {
    FolderPaneSwitcher.logger.trace("onDragEnter");
    if (FolderPaneSwitcher.cachedView) {
      FolderPaneSwitcher.logger.debug(
        "onDragEnter: switch already in progress");
    }
    else {
      FolderPaneSwitcher.setTimer(aEvent.view);
    }
  },

  cachedView:null,
  onDragExit: function(aEvent) {
    FolderPaneSwitcher.logger.trace("onDragExit("+aEvent.type+")");
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
    FolderPaneSwitcher.logger.trace("onDragDrop("+aEvent.type+")");
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
    var delay = prefBranch.getStringPref("extensions.FolderPaneSwitcher.delay");
    var t = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
    t.initWithCallback(new timerCallback(window), delay,
               Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    FolderPaneSwitcher.timer = t;
  },

  watchTimer: null
};


function timerCallback(window) {
    FolderPaneSwitcher.logger.trace("timerCallback");
    this.window = main_window;
  }


  timerCallback.prototype = {
    notify: function() {
      FolderPaneSwitcher.logger.trace("timerCallback.notify");
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
    FolderPaneSwitcher.logger.trace("watchTimerCallback");
    this.window = window;
  }

  watchTimerCallback.prototype = {
    notify: function() {
      FolderPaneSwitcher.logger.trace("watchTimerCallback.notify");
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
    FolderPaneSwitcher.logger.trace("forEachOpenWindow");
    for (let window of Services.wm.getEnumerator("mail:3pane")) {
      if (window.document.readyState != "complete") {
        FolderPaneSwitcher.logger.debug("forEachOpenWindow skip, readyState=" +
                                        window.document.readyState);
        continue;
      }
      todo(window);
    }
  }
function unloadFromWindow(window) {
    FolderPaneSwitcher.logger.trace("unloadFromWindow");
    var document = main_window.document;
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
        FolderPaneSwitcher.logger.trace("WindowObserver.observe");
        var window = aSubject;
        var document = window.document;
        if (document.documentElement.getAttribute("windowtype") ==
            "mail:3pane") {
              console.log("called from the observer");
              FolderPaneSwitcher.loadWindow();
               FolderPaneSwitcher.onLoad();
        }
    },
};
