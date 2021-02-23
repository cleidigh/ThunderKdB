/*# -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Mozilla Communicator client code, released
# March 31, 1998.
#
# The Initial Developer of the Original Code is
# Netscape Communications Corporation.
# Portions created by the Initial Developer are Copyright (C) 1998-1999
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Joachim Herb <joachim.herb@gmx.de>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/

if (typeof org_mozdev_AutoSlide == "undefined") {
  var org_mozdev_AutoSlide = {};
};

org_mozdev_AutoSlide.slider = function() {
  var pub = {};

  Cu.import("resource://gre/modules/Services.jsm");

  var ASPrefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                                        .getService(Components.interfaces.nsIPrefService)
                                        .getBranch("extensions.AutoSlide.");
//  var aConsoleService = Components.classes["@mozilla.org/consoleservice;1"]
//                                           .getService(Components.interfaces.nsIConsoleService);
//
//  const { console } = Components.utils.import("resource://gre/modules/devtools/Console.jsm", {});


  var timerSlow;
  var timerFast;

  function debugLog(str) {
    if (ASPrefBranch.getBoolPref("debugLog")) {
//      aConsoleService.logStringMessage(Date() + " AS: " + str);
      Services.console.logStringMessage(Date() + " AS: " + str);
      //      console.log(Date() + " AS: " + str);
    }
  }

  pub.init = function () {
    debugLog("AS init start");

    function viewWrapperListener() {
      this.register();
    }

    viewWrapperListener.prototype = {
      /**
       * Things to do once all the messages that should show up in a folder have
       *  shown up.  For a real folder, this happens when the folder is entered.
       *  For a (multi-folder) virtual folder, this happens when the search
       *  completes.
       * You may get onMessagesLoaded called with aAll false immediately after
       * the view is opened. You will definitely get onMessagesLoaded(true)
       * when we've finished getting the headers for the view.
       */
      onMessagesLoaded: function(aAll) {
        debugLog("onMessagesLoaded slide");
        pub.delayedSlideSlow();
      },

      register: function() {
        var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"]
                                    .getService(Components.interfaces.nsIMsgMailSession);
        var nsIFolderListener = Components.interfaces.nsIFolderListener;
        mailSession.AddFolderListener(folderListener, nsIFolderListener.removed |
                                                      nsIFolderListener.added |
                                                      nsIFolderListener.event);

        document.defaultView.FolderDisplayListenerManager.registerListener(this);
      },
      unregister: function() {
        var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"]
                                    .getService(Components.interfaces.nsIMsgMailSession);
        var nsIFolderListener = Components.interfaces.nsIFolderListener;
        mailSession.RemoveFolderListener(folderListener, nsIFolderListener.removed |
                                                      nsIFolderListener.added |
                                                      nsIFolderListener.event);

        document.defaultView.FolderDisplayListenerManager.unregisterListener(this);
        debugLog("viewWrapperListener unregistered ");
      }
    };

    pub.viewWrapperListener = new viewWrapperListener();

    function myObserver()
    {
      this.register();
    }

    myObserver.prototype = {
      observe: function(subject, topic, data) {
        debugLog("msgObserver " + topic);
        debugLog("msgObserver slide");
        pub.delayedSlideFast();
      },
      register: function() {
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
                              .getService(Components.interfaces.nsIObserverService);
        observerService.addObserver(this, "MsgMsgDisplayed", false);
      },
      unregister: function() {
        var observerService = Components.classes["@mozilla.org/observer-service;1"]
                                .getService(Components.interfaces.nsIObserverService);
        observerService.removeObserver(this, "MsgMsgDisplayed");
        debugLog("msgObserver unregistered ");

      }
    }

		pub.msgObserver = new myObserver();

    pub.myPrefObserver.register();

    var threadPaneSplitter = document.getElementById("threadpane-splitter");
    var tpsPersist = threadPaneSplitter.getAttribute("persist");
    debugLog("tpsPersist "+tpsPersist);
    if (!tpsPersist || !(new RegExp('\\bautoslideoff\\b').test(tpsPersist))) {
      threadPaneSplitter.setAttribute("persist", tpsPersist + " autoslideoff ");
    }

    function onCollapseChange()
    {
      this.register();
    }

    onCollapseChange.prototype = {
      onCollapseChange: function() {
        debugLog("onCollapseChange ");
        pub.delayedSlideFast();
      },
      register: function() {

        var threadPaneSplitter = document.getElementById("threadpane-splitter");
        threadPaneSplitter.addEventListener("dblclick", pub.slideForce);
        threadPaneSplitter.addEventListener("contextmenu", pub.toggleSlide);

        var threadTree = document.getElementById("threadTree");
        threadTree.addEventListener("click", this.onCollapseChange);

        var multiMessage = document.getElementById("multimessage");
        if (multiMessage){
          debugLog("multimessage ...");
          multiMessage.contentDocument.addEventListener("load", this.onCollapseChange, true);
          debugLog("multimessage added");
        }

        let threadToggle = ["cmd_expandAllThreads", "cmd_collapseAllThreads"];

        for (let i = 0; i < threadToggle.length; i++) {
          let cmd = document.getElementById(threadToggle[i]);
          if (cmd) {
            cmd.addEventListener("command", this.onCollapseChange);
            debugLog("add command event: " + cmd.id);
          }
        }

        let mailKeys = document.getElementById("mailKeys");
        let keys = mailKeys.getElementsByAttribute("oncommand", "goDoCommand('cmd_expandAllThreads')");
        for (let i = 0; i < keys.length; i++) {
          if (keys[i]) {
            keys[i].addEventListener("command", this.onCollapseChange);
            debugLog("add key event: " + keys[i].id);
          }
        }
        keys = mailKeys.getElementsByAttribute("oncommand", "goDoCommand('cmd_collapseAllThreads')");
        for (let i = 0; i < keys.length; i++) {
          if (keys[i]) {
            keys[i].addEventListener("command", this.onCollapseChange);
            debugLog("add key event: " + keys[i].id);
          }
        }
      },
      unregister: function() {

        var threadPaneSplitter = document.getElementById("threadpane-splitter");
        threadPaneSplitter.removeEventListener("dblclick", pub.slideForce);
        threadPaneSplitter.removeEventListener("contextmenu", pub.toggleSlide);

        var threadTree = document.getElementById("threadTree");
        threadTree.removeEventListener("click", this.onCollapseChange);

        var multiMessage = document.getElementById("multimessage");
        if (multiMessage){
          debugLog("multimessage ...");
          multiMessage.contentDocument.removeEventListener("load", this.onCollapseChange);
          debugLog("multimessage remove");
        }

        let threadToggle = ["cmd_expandAllThreads", "cmd_collapseAllThreads"];

        for (let i = 0; i < threadToggle.length; i++) {
          let cmd = document.getElementById(threadToggle[i]);
          if (cmd) {
            cmd.removeEventListener("command", this.onCollapseChange);
            debugLog("remove command event: " + cmd.id);
          }
        }

        let mailKeys = document.getElementById("mailKeys");
        let keys = mailKeys.getElementsByAttribute("oncommand", "goDoCommand('cmd_expandAllThreads')");
        for (let i = 0; i < keys.length; i++) {
          if (keys[i]) {
            keys[i].removeEventListener("command", this.onCollapseChange);
            debugLog("remove key event: " + keys[i].id);
          }
        }
        keys = mailKeys.getElementsByAttribute("oncommand", "goDoCommand('cmd_collapseAllThreads')");
        for (let i = 0; i < keys.length; i++) {
          if (keys[i]) {
            keys[i].removeEventListener("command", this.onCollapseChange);
            debugLog("remove key event: " + keys[i].id);
          }
        }
      }
    }

    pub.onCollapseChange = new onCollapseChange();


    timerSlow = Components.classes["@mozilla.org/timer;1"]
                                   .createInstance(Components.interfaces.nsITimer);
    timerFast = Components.classes["@mozilla.org/timer;1"]
                                   .createInstance(Components.interfaces.nsITimer);
  };

  function onThreadTreeChange(event) {
    debugLog("onThreadTreeChange " + event.attrName);
  };

  var delayedSlideRequestSlow = false;
  var delayedSlideRequestFast = false;

  var eventSlow = {
    notify: function(timer) {
      debugLog("delayedSlideSlow start");
      pub.slide();
      delayedSlideRequestSlow = false;
      debugLog("delayedSlideSlow stop");
    }
  };

  var eventFast = {
      notify: function(timer) {
        debugLog("delayedSlideFast start");
        pub.slide();
        delayedSlideRequestFast = false;
        debugLog("delayedSlideFast stop");
      }
    };


  pub.delayedSlideSlow = function () {
    debugLog("delayedSlideSlow issued 1");
    if (!delayedSlideRequestSlow) {
      debugLog("delayedSlideSlow issued 2");
      delayedSlideRequestSlow = true;
      timerSlow.initWithCallback(eventSlow, 500, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
  }

  pub.delayedSlideFast = function () {
    debugLog("delayedSlideFast issued 1");
    if (!delayedSlideRequestFast) {
      debugLog("delayedSlideFast issued 2");
      delayedSlideRequestFast = true;
      timerFast.initWithCallback(eventFast, 50, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
    }
  }

  pub.toggleSlide = function () {
    debugLog("toggleSlide");
    var threadPaneSplitter = document.getElementById("threadpane-splitter");
    var slideState = threadPaneSplitter.getAttribute("autoslideoff");
    if (slideState) {
      threadPaneSplitter.removeAttribute("autoslideoff");
    }
    else {
      threadPaneSplitter.setAttribute("autoslideoff", "true");
    }
  }

  pub.slideForce = function() {
    pub.slide(true);
  }

  pub.slide = function(force) {
    var currentTabInfo = document.getElementById("tabmail").currentTabInfo;
    if ((currentTabInfo.mode.name != "folder") &&
        (currentTabInfo.mode.name != "glodaList")) {
      //debugLog("not in folder");
      return;
    }
    if (gDBView==null) {
      return;
    }

    //var test = gFolderDisplay.displayedFolder;
    //var test2 = gFolderDisplay.displayedFolder.URI;
    var tree = document.getElementById("threadTree");
    var treeBox = tree.getBoundingClientRect();
    var treeView = gDBView.QueryInterface(Components.interfaces.nsITreeView);

    var threadPaneSplitter = document.getElementById("threadpane-splitter");
    var threadPaneSplitterBox = threadPaneSplitter.getBoundingClientRect();

    if ((threadPaneSplitter.getAttribute("state") == "collapsed") ||
        ((threadPaneSplitter.getAttribute("autoslideoff")) &&
         (!force))) {
      return;
    }
    var messagePaneBox = document.getElementById("messagepaneboxwrapper");
    messagePaneBox.setAttribute("flex", "0");

    var treeView = gDBView.QueryInterface(Components.interfaces.nsITreeView);
    var count = treeView.rowCount;

    var minHeightPercent = ASPrefBranch.getIntPref("maxThreadPanePercentage");

    var requiredHeight = tree.rowHeight * count;
    var setHeight;

    var oldHeight = treeBox.height - document.getElementById("threadCols").getBoundingClientRect().height - 1;


    var threadBox = document.getElementById("displayDeck");

    if (!threadBox) {
      threadBox = document.getElementById("displayBox");
    }

    var oldthreadBoxHeight = threadBox.getBoundingClientRect().height;
    debugLog("treeBox: " + treeBox);
    debugLog("tree.getPageLength(): " + tree.getPageLength());
    debugLog("minHeightPercent: " + minHeightPercent);
    debugLog("tree.rowHeight: " + tree.rowHeight);
    debugLog("count: " + count);
    debugLog("oldHeight: " + oldHeight);
    debugLog("requiredHeight: " + requiredHeight);
    var deltaHeight = requiredHeight - oldHeight;

    var messagesBoxBox = document.getElementById("messagesBox").getBoundingClientRect();

    var newSplitterY = threadPaneSplitterBox.y +
                       deltaHeight;

    oldHeight = messagePaneBox.getBoundingClientRect().height;
    messagePaneBox.removeAttribute("height");

    var minSplitterY = messagesBoxBox.y +
                       messagesBoxBox.height * minHeightPercent/100.0;

    debugLog("threadPaneSplitterBox: " + threadPaneSplitterBox.y);
    debugLog("deltaHeight: " + deltaHeight);
    debugLog("deltaHeight: " + deltaHeight);
    debugLog("newSplitterY: " + newSplitterY);
    debugLog("messagesBoxBoxY: " + messagesBoxBox.y);
    debugLog("messagesBoxBoxHeight: " + messagesBoxBox.height);
    debugLog("minSplitterY: " + minSplitterY);
    debugLog("old delta: " + deltaHeight);

    if (newSplitterY > minSplitterY) {
      deltaHeight = deltaHeight + (minSplitterY - newSplitterY);
    }
    debugLog("new delta: "+deltaHeight);


    var anotherDelta = oldthreadBoxHeight + deltaHeight - threadBox.getAttribute("minheight");
    if (anotherDelta < 0) {
      deltaHeight = deltaHeight - anotherDelta;
    }

    var newHeight = oldHeight - deltaHeight;
    debugLog("old: "+oldHeight + " new: "+newHeight);

    messagePaneBox.setAttribute("height", newHeight);
    threadBox.setAttribute("height", threadBox.getBoundingClientRect().height);

    messagePaneBox.setAttribute("flex", "1");
    var messagePaneHBox = document.getElementById("messagepanehbox")
    if (messagePaneHBox) {
      messagePaneHBox.removeAttribute("height");
    }
  };

  var folderListener = {

    OnItemAdded: function(aParentItem, aItem) {
      var currentFolder = gFolderTreeView.getSelectedFolders()[0];
      if (aParentItem == currentFolder) {
        //debugLog("added " + aParentItem + " " + aItem);
        debugLog("OnItemAdded slide");
        pub.delayedSlideFast();
      }
    },
    OnItemRemoved: function(aParentItem, aItem) {
      var currentFolder = gFolderTreeView.getSelectedFolders()[0];
      if (aParentItem == currentFolder) {
        //debugLog("deleted" + aParentItem + " " + aItem);
        debugLog("OnItemRemoved slide");
        pub.delayedSlideFast();
      }
    },
    OnItemEvent: function(aItem, aEvent) {
      //debugLog("event " +" " + aEvent);
      debugLog("OnItemEvent slide");
      pub.delayedSlideFast();
    },

  };

  pub.myPrefObserver =
  {
    register: function()
    {
      // First we'll need the preference services to look for preferences.
      var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                  .getService(Components.interfaces.nsIPrefService);

      // For this._branch we ask that the preferences for extensions.myextension. and children
      this._branch = prefService.getBranch("extensions.AutoSlide.");

      // Now we queue the interface called nsIPrefBranch2. This interface is described as:
      // "nsIPrefBranch2 allows clients to observe changes to pref values."
      this._branch.QueryInterface(Components.interfaces.nsIPrefBranch);

      // Finally add the observer.
      this._branch.addObserver("", this, false);
    },

    unregister: function()
    {
      if(!this._branch) return;
      this._branch.removeObserver("", this);
      debugLog("myPrefObserver unregistered ");
    },

    observe: function(aSubject, aTopic, aData)
    {
      if(aTopic != "nsPref:changed") return;
      // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
      // aData is the name of the pref that's been changed (relative to aSubject)
      debugLog("myPrefObserver slide");
      pub.delayedSlideFast();
    }
  }

  return pub;
}();

