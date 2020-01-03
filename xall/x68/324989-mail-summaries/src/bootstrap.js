const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/MailServices.jsm");

// ***** Prefs used for modifying the "remember selected message" setting *****

const firstrun_pref = "extensions.mailsummaries.firstrun";
const remember_selected_pref = "mailnews.remember_selected_message";
const original_remember_selected_pref =
  "extensions.mailsummaries.original_remember_selected_message";


// ***** First up, the overrides *****

// Override _showAccountCentral to show the account summary.
function showAccountCentral(window) {
  let accountBox = window.document.getElementById("accountCentralBox");
  window.document.getElementById("displayDeck").selectedPanel = accountBox;

  let url;
  let server = window.gFolderDisplay.displayedFolder ?
               window.gFolderDisplay.displayedFolder.server :
               MailServices.accounts.defaultAccount.incomingServer;
  if (server) {
    if (server.type == "nntp" || server.type == "rss")
      url = "chrome://mailsummaries/content/newsAccountSummary.xhtml";
    else
      url = "chrome://mailsummaries/content/mailAccountSummary.xhtml";
    url += "?serverKey=" + server.key;
  }
  else {
    url = "chrome://mailsummaries/content/emptyAccountSummary.xhtml";
  }

  window.frames["accountCentralPane"].location.href = url;
};

// Override summarizeFolder to show our new folder summary.
function summarizeFolder(window, messageDisplay) {
  const summaryURL = "chrome://mailsummaries/content/folderSummary.xhtml";

  let folder = messageDisplay.folderDisplay.displayedFolder;
  if (!folder) { // A search tab, for example.
    window.gSummaryFrameManager.clear();
    return;
  }

  messageDisplay.singleMessageDisplay = false;
  window.gSummaryFrameManager.loadAndCallback(summaryURL, function() {
    let childWindow = window.gSummaryFrameManager.iframe.contentWindow;
    childWindow.gFolderSummary.summarize(folder);
  });
}

// We need to listen for when all messages in the folder are marked as read, so
// that we can stop listening to that folder temporarily. This is pretty hacky,
// but there's no way around it for now.
function MsgMarkAllRead(window, oldMsgMarkAllRead) {
  let folders = window.gFolderTreeView.getSelectedFolders();
  let arr = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
  for (let i of folders)
    arr.appendElement(i, false);

  Services.obs.notifyObservers(arr, "mailsummaries:markAllReadStarted", null);
  oldMsgMarkAllRead();
  Services.obs.notifyObservers(arr, "mailsummaries:markAllReadFinished", null);
}

// ***** Now, all-new functions *****

// We want to reload the folder summary when we click again on the currently-
// selected folder. This requires keeping track of what the current folder was
// during mousedown and then comparing to that once the click is finished.
function FolderPaneClickHandler(window) {
  this._window = window;
}

FolderPaneClickHandler.prototype = {
  _lastSelectedFolder: null,

  load: function() {
    this._listen(true);
  },

  unload: function() {
    this._listen(false);
  },

  handleEvent: function(event) {
    if (event.button != 0)
      return;

    let folderDisplay = this._window.gFolderDisplay;
    if (event.type == "mousedown") {
      this._lastSelectedFolder = folderDisplay.displayedFolder;
    }
    else if (event.type == "click") {
      let folderTree = this._window.document.getElementById("folderTree");
      let {row, childElt} = folderTree.getCellAt(event.clientX, event.clientY);

      if (row != -1 && childElt && childElt != "twisty") {
        if (this._lastSelectedFolder == folderDisplay.displayedFolder)
          folderDisplay.clearSelection();
      }
    }
  },

  _listen: function(add) {
    let method = add ? "addEventListener" : "removeEventListener";
    let folderTree = this._window.document.getElementById("folderTree");
    folderTree[method]("click", this, true);
    folderTree[method]("mousedown", this, true);
  },
};

// Sometimes, an onSelectedMessagesChanged isn't fired when we select a new
// folder, so kick off a summary here too.
function FolderDisplayListener(window) {
  this._window = window;
}

FolderDisplayListener.prototype = {
  onDisplayingFolder: function() {
    this._window.gFolderDisplay.messageDisplay.onSelectedMessagesChanged();
  },
};

var startPageController = {
  supportsCommand: function(aCommand) {
    return aCommand == "cmd_goStartPage";
  },

  isCommandEnabled: function(aCommand) {
    return true;
  },

  doCommand: function(aCommand) {
    let startpage = Services.urlFormatter.formatURLPref(
      "mailnews.start_page.url"
    );
    if (startpage) {
      try {
        let uri = Services.uriFixup.createFixupURI(startpage, 0);
        openContentTab(uri.spec);
      }
      catch(e) {
        Components.utils.reportError(e);
      }
    }
  },
};

function setupWindow(window) {
  let folderPaneClickHandler = new FolderPaneClickHandler(window);
  let folderDisplayListener = new FolderDisplayListener(window);

  let data = {
    showAccountCentral: window.FolderDisplayWidget.prototype
                              ._showAccountCentral,
    summarizeFolder: window.summarizeFolder,
    MsgMarkAllRead: window.MsgMarkAllRead,
    folderDisplayListener: folderDisplayListener,
    folderPaneClickHandler: folderPaneClickHandler,
  };

  window.FolderDisplayWidget.prototype._showAccountCentral =
    showAccountCentral.bind(null, window);
  window.summarizeFolder = summarizeFolder.bind(null, window);
  window.MsgMarkAllRead = MsgMarkAllRead.bind(
    null, window, data.MsgMarkAllRead
  );

  window.FolderDisplayListenerManager.registerListener(folderDisplayListener);
  folderPaneClickHandler.load();
  window.controllers.insertControllerAt(0, startPageController);

  return data;
}

function cleanupWindow(window, data) {
  window.FolderDisplayWidget.prototype._showAccountCentral =
    data.showAccountCentral;
  window.summarizeFolder = data.summarizeFolder;
  window.MsgMarkAllRead = data.MsgMarkAllRead;

  window.FolderDisplayListenerManager.unregisterListener(
    data.folderDisplayListener
  );
  data.folderPaneClickHandler.unload();
  window.controllers.removeController(startPageController);
}

var injector;

function startup(data, reason) {
  Cu.import("chrome://mailsummaries/content/windowUtils.jsm");
  Cu.import("chrome://mailsummaries/content/defaultPrefs.jsm");

  // Load the default prefs.
  Services.scriptloader.loadSubScript(
    "chrome://mailsummaries/content/prefs.js", {pref: setDefaultPref}
  );

  if (reason === ADDON_INSTALL) {
    if (Services.prefs.getBoolPref(firstrun_pref)) {
      Services.prefs.setBoolPref(firstrun_pref, false);
      Services.prefs.setBoolPref(
        original_remember_selected_pref,
        Services.prefs.getBoolPref(remember_selected_pref)
      );
      Services.prefs.setBoolPref(remember_selected_pref, false);
    }
  }

  injector = new WindowInjector("mail:3pane", setupWindow, cleanupWindow);
  injector.start();
}

function shutdown(data, reason) {
  // Don't bother doing anything when the application is exiting.
  if (reason === APP_SHUTDOWN)
    return;

  injector.stop();
}

function install(data, reason) {}

function uninstall(data, reason) {
  if (reason !== ADDON_UNINSTALL)
    return;

  let old = Services.prefs.getBoolPref(original_remember_selected_pref);
  let current = Services.prefs.getBoolPref(remember_selected_pref);
  if (!current)
    Services.prefs.setBoolPref(remember_selected_pref, old);
  Services.prefs.clearUserPref(original_remember_selected_pref);
  Services.prefs.clearUserPref(firstrun_pref);
}
