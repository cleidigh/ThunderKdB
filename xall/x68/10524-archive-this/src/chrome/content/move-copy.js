"use strict";

// NOTE: The console logging in this is active only if the debug
// configuration option was active when Thunderbird was started.
// We're not going to bother processing configuration callbacks
// here just for debugging state.

var ArchiveThisMoveCopy =
{
  folders : new Array(),
  longFolderNames : new Array(),
  matchedIndices : new Array(),
  maxFolderNameLength : 0,
  mode : "move",
  archiveThis : null,
  currAccount : "",
  currCandidate : 0,
  dbConn : null,
  dbSelect: null,
  dbResults: null,
  dbQueryComplete: false,
  dbMaxPriority: 5,
  dbRowCount: 0,
  console: Components.classes["@mozilla.org/consoleservice;1"].
             getService(Components.interfaces.nsIConsoleService),
  debug: false,
  prefs: null,
  fragment: null,
  moved: null,

  sortFolders : function sortFolders (a, b)
  {
    // Prefer folders in the same account as the selected message
    if (   (a.server.prettyName == ArchiveThisMoveCopy.currAccount)
        && (b.server.prettyName != ArchiveThisMoveCopy.currAccount))
        { return -1; }

    if (   (a.server.prettyName != ArchiveThisMoveCopy.currAccount)
        && (b.server.prettyName == ArchiveThisMoveCopy.currAccount))
        { return 1; }

    if (a.URI < b.URI) { return -1; }
    if (a.URI > b.URI) { return 1; }
    return 0;
  },

  onLoad: function onLoad()
  {
    if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }

    document.addEventListener("dialogaccept",
      ArchiveThisMoveCopy.onAccept.bind(this));

    if (!this.prefs)
    {
      this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
        getService(Components.interfaces.nsIPrefService).getBranch("archive-this.");
//      this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);
    }

    this.debug = this.prefs.getBoolPref("debug");


    if (this.dbConn === null)
    {
      if (this.debug)
      {
        this.console.logStringMessage("Archive This: opening folder history database");
      }

      Components.utils.import("resource://gre/modules/Services.jsm");
      Components.utils.import("resource://gre/modules/FileUtils.jsm");

      var file = FileUtils.getFile("ProfD", ["archive_this.sqlite"]);
      this.dbConn = Services.storage.openDatabase(file);

      try
      {
        // Create the table for mapping string fragments to preferred folders
        this.dbConn.executeSimpleSQL("CREATE TABLE IF NOT EXISTS stringmap (fragment TEXT, fraglen INTEGER, folder TEXT, priority INTEGER, timestamp INTEGER)");
      }
      catch (e)
      {
        if (this.debug)
        {
          this.console.logStringMessage("Archive This: Error creating table: " + e);
        }
      }

      this.dbSelect = this.dbConn.createStatement("SELECT * FROM stringmap WHERE fragment LIKE :frag ORDER BY fraglen, priority");
    }

    this.archiveThis = window.arguments[0];
    var headers = window.arguments[1];
    this.mode = window.arguments[2];

    this.archiveThis.selectedFolder = null;

    //////////////////////////////////////////////////////////////////////
    // Set up the window according to the selected mode
    var description = document.getElementById("archive-this-mode")
    var dialog = document.getElementById("archive-this-move-copy");
    switch (this.mode)
    {
      case 'move':
        description.value=this.s.getString("moveToString")+": ";
        dialog.setAttribute("title", this.s.getString("moveTitleString"));
        break;

      case 'copy':
        description.value=this.s.getString("copyToString")+": ";
        dialog.setAttribute("title", this.s.getString("copyTitleString"));
        break;

      case 'go':
        document.getElementById("archive-this-header-grid").hidden = true;
        document.getElementById("archive-this-header-sep").hidden = true;
        description.value=this.s.getString("goToString")+": ";
        dialog.setAttribute("title", this.s.getString("goToTitleString"));
        break;

      default:
        description.value=this.s.getString("moveToString")+": ";
        dialog.setAttribute("title", this.s.getString("moveTitleString"));
        this.mode = 'move';
    }

    //////////////////////////////////////////////////////////////////////
    // Populate the header fields
    var subject = "";
    var from = "";
    var to = "";
    var account = "";

    for (var i in headers)
    {
      if (subject.length == 0) { subject = headers[i].mime2DecodedSubject; }
      if (from.length == 0) { from = headers[i].mime2DecodedAuthor; }
      if (to.length == 0) { to = headers[i].mime2DecodedRecipients; }
      if (account.length == 0) { account = headers[i].folder.server.prettyName; }

      if (subject != headers[i].mime2DecodedSubject) { subject = '<'+this.s.getString("severalString")+'>'; }
      if (from != headers[i].mime2DecodedAuthor) { from = '<'+this.s.getString("severalString")+'>'; }
      if (to != headers[i].mime2DecodedRecipients) { to ='<'+this.s.getString("severalString")+'>'; }
      if (account != headers[i].folder.server.prettyName) { account = '<'+this.s.getString("severalString")+'>'; }
    }

    document.getElementById("archive-this-subject").setAttribute("value",subject);
    document.getElementById("archive-this-from").setAttribute("value",from);
    document.getElementById("archive-this-to").setAttribute("value",to);
    document.getElementById("archive-this-account").setAttribute("value",account);
    this.currAccount = account;

    //////////////////////////////////////////////////////////////////////
    // Gather all the folders into an array
    var accountManager;
    var servers;
    var numServers;
    try {
      accountManager = Components.classes ["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
      servers = accountManager.allServers;
      numServers = servers.length;
    } catch (e) {
      if (this.debug)
      {
        this.console.logStringMessage("Archive This: Error opening account manager: " + e);
        return;
      }
    }

    if (this.debug) {
      this.console.logStringMessage("Archive This: Found " + numServers + " servers to select from");
    }

    //////////////////////////////////////////////////////////////////////
    // If we're changing folders (instead of moving or copying), then
    // we want the smart mailboxes to appear in the list. In fact, we
    // want them to appear first so they're easy to get to.
    var unifiedFolders = new Array();
    if (this.mode == 'go' ) { try {
      var smartServer = accountManager.FindServer("nobody", "smart mailboxes", "none");
      var rootFolder;
      if (smartServer)
      {
        rootFolder = smartServer.QueryInterface(Components.interfaces.nsIMsgIncomingServer).rootFolder;
      }

      if (rootFolder)
      {
        var allFolders = rootFolder.descendants;
        var numFolders = allFolders.length;
        for (var folderIndex = 0; folderIndex < numFolders; folderIndex++)
        {
          var cf = allFolders.queryElementAt(folderIndex, Components.interfaces.nsIMsgFolder, null);
          unifiedFolders.push(cf);
        }
      }
    } catch (ex) {
      if (this.debug) {
        this.console.logStringMessage("Archive This: Exception processing unified folders: " + ex);
      }
    }}

    if (this.debug) {
      this.console.logStringMessage("Archive This: Found " + unifiedFolders.length + " unified folders");
    }

    unifiedFolders.sort(this.sortFolders);

    //////////////////////////////////////////////////////////////////////
    // For the remainder of the servers, we simply iterate through the
    // servers and add each of their folders to the list.
    for (var i = 0; i <numServers; i++)
    {
      var rootFolder = servers.queryElementAt(i,Components.interfaces.nsIMsgIncomingServer,null).rootFolder;

      if (rootFolder)
      {
        var allFolders = rootFolder.descendants;
        var numFolders = allFolders.length;
        for (var folderIndex = 0; folderIndex < numFolders; folderIndex++)
        {
          var cf = allFolders.queryElementAt(folderIndex,Components.interfaces.nsIMsgFolder,null);
          // TODO - if this.mode is not 'go', exclude folders we can't
          // file into
          this.folders.push(cf);
        }
      }

    }

    this.folders.sort(this.sortFolders);
    this.folders = unifiedFolders.concat(this.folders);

    if (this.debug) {
      this.console.logStringMessage("Archive This: Found " + this.folders.length + " total folders");
    }

    //////////////////////////////////////////////////////////////////////
    // Make full, long names for each folder
    for (var i in this.folders)
    {
      var label = this.folders[i].prettiestName || this.folders[i].prettyName;
      var p = this.folders[i].parent;
      while (p && p.parent)
      {
        label = p.name+'/'+label;
        p = p.parent;
      }
      label = this.folders[i].server.prettyName + "/" + label;
      this.longFolderNames[i] = label;

      if (label.length > this.maxFolderNameLength)
      {
        this.maxFolderNameLength = label.length;
      }
    }

    dialog.setAttribute("minwidth",this.maxFolderNameLength * 9);

    // TODO -- This doesn't work, for some reason.
    dialog.setAttribute("maxwidth", screen.width);

    this.setCandidate(0);
    this.selectMostRecentFolder();
    this.hideFolderList();
  },

  updateList: function updateList()
  {
    var list = document.getElementById('archive-this-folder-list');

    //////////////////////////////////////////////////////////////////////
    // Clear the folder list
    while(list.hasChildNodes()){
      list.removeChild(list.firstChild);
    }
    this.matchedIndices = new Array();

    //////////////////////////////////////////////////////////////////////
    // Populate the folder list popup
    var searchText = document.getElementById("archive-this-search").value;
    var bestFound = false;

    for (var i in this.folders)
    {
      if (this.longFolderNames[i].toLowerCase().indexOf(searchText.toLowerCase()) > -1)
      {
        let newNode = document.createElement("richlistitem");
        newNode.value = i;
        let newLabel = document.createElement("label");
        newLabel.value = this.longFolderNames[i];
        newNode.appendChild(newLabel);
        list.appendChild(newNode);
        //list.appendItem(this.longFolderNames[i],i);
        this.matchedIndices.push(i);

        if (!bestFound)
        {
          bestFound = true;
          this.setCandidate(i);
        }
      }
    }

    if (!bestFound)
    {
      this.setCandidate(this.currCandidate);
    }

    // Launch SQL query to find "best" matches from user history
    var f = this.fragment?this.fragment:document.getElementById("archive-this-search").value;
    this.dbResults = new Array();
    this.dbQueryComplete = false;
    this.dbRowCount = 0;
    this.moved = {};
    if (f.length)
    {
      this.dbSelect.params.frag = f + "%";
      this.dbSelect.executeAsync({
        handleResult: function (resultSet)
        {
          var row;
          while (row = resultSet.getNextRow())
          {
            ArchiveThisMoveCopy.handleRow(row);
          }
        },
        handleError: function (error)
        {
          ArchiveThisMoveCopy.debug && ArchiveThisMoveCopy.console.logStringMessage("Archive This: SELECT error: " + aError.message);
        },
        handleCompletion: function (reason)
        {
          // Mark set as complete so we know it's safe to store
          if (reason == Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED)
          {
            ArchiveThisMoveCopy.dbQueryComplete = true;
          }
          else
          {
            ArchiveThisMoveCopy.debug && ArchiveThisMoveCopy.console.logStringMessage("Archive This: SELECT Failed, reason = " + reason);
          }
        }
      });
    }
  },

  selectMostRecentFolder : function selectMostRecentFolder ()
  {
    var select = this.dbConn.createStatement("SELECT * FROM stringmap ORDER BY timestamp DESC LIMIT 1");
    select.executeAsync({
      handleResult: function (resultSet)
      {
        var row = resultSet.getNextRow();
        if (row)
        {
          var folder = row.getResultByName("folder");
          for (var i in ArchiveThisMoveCopy.folders)
          {
            if (ArchiveThisMoveCopy.folders[i].URI == folder)
            {
              ArchiveThisMoveCopy.debug &&
                ArchiveThisMoveCopy.console.logStringMessage(
                  "Archive This: Setting initial value to " + folder);
              ArchiveThisMoveCopy.setCandidate(i);
              return;
            }
          }
        }
      },
      handleError: function (error) { },
      handleCompletion: function (reason) { }
    });
  },

  handleRow : function handleRow  (row)
  {
    var f = this.fragment?this.fragment:document.getElementById("archive-this-search").value;
    var record =
    {
      fragment : row.getResultByName("fragment"),
      fraglen : row.getResultByName("fraglen"),
      folder : row.getResultByName("folder"),
      priority : row.getResultByName("priority"),
      timestamp : row.getResultByName("timestamp")
    };
    //this.debug && this.console.logStringMessage("Row match:\n" + this.dump(record));

    if (record['fragment'] == f)
    {
      this.dbResults.push(record);
    }

    if (this.moved[record.folder])
    {
      this.debug && this.console.logStringMessage("Archive This: already moved "+ record.folder +"; ignoring entry.");
    }
    else
    {
      var list = document.getElementById('archive-this-folder-list');

      // Find entry and move it to the top of the list
      for (var i = 0; i < list.getRowCount(); i++)
      {
        var folder = this.folders[this.matchedIndices[i]].URI;
        if (folder == record.folder && i != this.dbRowCount)
        {
          var folderIndex = this.matchedIndices[i];
          this.debug && this.console.logStringMessage("Archive This: Moving item " + i +
            " ("+this.longFolderNames[folderIndex]+") to " + this.dbRowCount);

          let entry = list.getItemAtIndex(i);
          entry.remove();
          let refNode = list.getItemAtIndex(this.dbRowCount);
          refNode.parentNode.insertBefore(entry, refNode);

          this.matchedIndices.splice(i,1);
          this.matchedIndices.splice(this.dbRowCount,0,folderIndex);

        }
      }
      this.moved[record.folder] = true;
    }

    this.setCandidate(this.matchedIndices[0]);
    this.dbRowCount++;
  },

  onSearchKeyPress : function onSearchKeyPress (event)
  {
    var list = document.getElementById('archive-this-folder-list');
    var panel = document.getElementById("archive-this-folder-panel");
    var offset = 0;

    // see https://developer.mozilla.org/en/DOM/Event/UIEvent/KeyEvent
    switch (event.keyCode)
    {
      case event.DOM_VK_DOWN:      offset = 1; break;
      case event.DOM_VK_UP:        offset = -1; break;
      case event.DOM_VK_PAGE_DOWN: offset = list.getNumberOfVisibleRows(); break;
      case event.DOM_VK_PAGE_UP:   offset = -(list.getNumberOfVisibleRows()); break;

      case event.DOM_VK_ENTER:
      case event.DOM_VK_RETURN:
      case event.DOM_VK_TAB:
        this.hideFolderList();
        return true;
        break;

      case event.DOM_VK_ESCAPE:
        var stateChanged = this.hideFolderList();
        if (stateChanged) { return false; }
        return true;
        break;
    }

    this.showFolderList();

    if (offset != 0)
    {
      if (!this.fragment)
      {
        this.fragment = document.getElementById("archive-this-search").value;

        if (this.debug)
        {
          this.console.logStringMessage("Archive This: saving typed fragment (kb) = " + this.fragment);
        }
      }

      if (list.selectedItem == null)
      {
        list.selectedIndex = 0;
      }
      list.moveByOffset(offset, true, false);
      return false;
    }
    else if (event.keyCode == 0)
    {
      if (0 && this.debug)
      {
        this.console.logStringMessage("Archive This: resetting saved fragment: " + event.keyCode);
      }
      this.fragment = null;
    }

    return true;
  },

  onSearchBlur : function onSearchBlur ()
  {
    this.hideFolderList();
  },

  hideFolderList : function hideFolderList ()
  {
    var stateChanged = false;

    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                  .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    if(versionChecker.compare(appInfo.version, "3.0b3") >= 0)
    {
      var panel = document.getElementById("archive-this-folder-panel");
      if (panel.state == "open") { stateChanged = true; }
      panel.hidePopup();
    }
    else
    {
      var panel = document.getElementById("archive-this-folder-panel");
      if (!panel.hidden) { stateChanged = true; }
      panel.hidden=true;
      window.sizeToContent();
    }

    return stateChanged;
  },

  showFolderList : function showFolderList ()
  {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                  .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    if(versionChecker.compare(appInfo.version, "3.0b3") >= 0)
    {
      var panel = document.getElementById("archive-this-folder-panel");
      var search = document.getElementById("archive-this-search");
      panel.openPopup(search,'after_start');
    }
    else
    {
      var panel = document.getElementById("archive-this-folder-panel");
      panel.hidden=false;
      window.sizeToContent();
    }

  },

  onFolderListShowing : function onFolderListShowing ()
  {
    var panel = document.getElementById("archive-this-folder-panel");
    var search = document.getElementById("archive-this-search");
    panel.sizeTo(search.clientWidth, search.clientHeight*10);

    //panel.moveTo(search.clientLeft,search.clientTop+search.clientHeight);

    this.updateList();
  },

  onFolderListShown : function onFolderListShown ()
  {
  },

  onFolderListSelect : function onFolderListSelect ()
  {
    var list = document.getElementById('archive-this-folder-list');
    var search = document.getElementById("archive-this-search");

    if (!this.fragment)
    {
      this.fragment = search.value;

      if (this.debug)
      {
        this.console.logStringMessage("Archive This: saving typed fragment = " + this.fragment);
      }
    }

    if (list.getSelectedItem(0) != null)
    {
      search.value = list.getSelectedItem(0).label;
      this.setCandidate(list.getSelectedItem(0).value);
      search.select();
    }

  },

  updateStringmap: function updateStringmap(fragment, folder)
  {
    if (fragment.length == 0) { return; }
    if (this.debug)
    {
      this.console.logStringMessage("Archive This: Associating fragment " +
        fragment + " with folder " + folder);
    }

    // Update stringmap table
    if (ArchiveThisMoveCopy.dbQueryComplete)
    {
      if (this.dbResults.length == 0)
      {
        // No matches in the set -- simply insert a new record
        this.dbResults.push({
          fragment : fragment,
          fraglen : fragment.length,
          folder : folder,
          priority : 1,
          timestamp : new Date().getTime()
        });
      }
      else if (this.dbResults.length > 1 && this.dbResults[1].folder == folder)
      {
        // already 2nd -- swap 1st and 2nd element
        var tmp = this.dbResults[1];
        this.dbResults[1] = this.dbResults[0];
        this.dbResults[0] = tmp;
        this.dbResults[0].timestamp = new Date().getTime();
      }
      else if (this.dbResults.length > 0 && this.dbResults[0].folder == folder)
      {
        // Already in first place, no need to change record priorities. Update date.
        this.dbResults[0].timestamp = new Date().getTime();
      }
      else
      {
        // Need to put in 2nd place.

        var moved = false;
        // Iterate over array and figure out if already in array;
        // if so, promote to 2nd place
        for (var i = 2; i < this.dbResults.length && !moved; i++)
        {
          if (this.dbResults[i]['folder'] == folder)
          {
            var temp = this.dbResults[i];
            this.dbResults.splice(i,1);
            this.dbResults.splice(1,0,temp);
            moved = true;
          }
        }

        // If not present in array. Put in 2nd place, knock off 5th
        // place entry (if present)
        if (!moved)
        {
          var temp = {
            fragment : fragment,
            fraglen : fragment.length,
            folder : folder,
            priority : 2,
            timestamp : new Date().getTime()
          };
          this.dbResults.splice(1,0,temp);
        }

      }

      // Remove any duplicates that snuck in
      for (i = 0; i < this.dbResults.length; i++)
      {
        for (var j = i + 1; j < this.dbResults.length; j++)
        {
          if (this.dbResults[i].folder === this.dbResults[j].folder)
          {
            this.debug && this.console.logStringMessage("Archive This: removing duplicate folder from fragment set: " + this.dbResults[i].folder);
            this.dbResults.splice(j,1);
          }
        }
      }

      // Trim off priorities that are too high
      if (this.dbResults.length > this.dbMaxPriority)
      {
        this.dbResults.length = this.dbMaxPriority;
      }


      // Renumber priorities
      // (it's easier to reorder records and then renumber the priorities
      // once they're in the right order).
      for (i = 0; i < this.dbResults.length; i++)
      {
        this.dbResults[i]['priority'] = i+1;
      }

      // Delete existing entries
      var del = this.dbConn.createStatement("DELETE FROM stringmap WHERE fragment = :frag");
      del.params.frag = fragment;
      // Synchronous execution -- no results, so it will go quickly.
      // This must complete before the inserts are fired off.
      del.executeStep();

      // Insert new entries
      var ins = this.dbConn.createStatement("INSERT INTO stringmap VALUES (:fragment, :fraglen, :folder, :priority, :timestamp)");
      for (var i = 0; i < this.dbResults.length; i++)
      {
        ins.params.fragment = this.dbResults[i].fragment;
        ins.params.fraglen = this.dbResults[i].fraglen;
        ins.params.folder = this.dbResults[i].folder;
        ins.params.priority = this.dbResults[i].priority;
        ins.params.timestamp = this.dbResults[i].timestamp;
        // this.debug && this.console.logStringMessage("Archive This: Inserting fragment record:\n" + this.dump(this.dbResults[i]));
        ins.executeAsync({handleCompletion: function(r){}});
      }
    }
    else if (this.debug)
    {
      this.console.logStringMessage("Archive This: Not saving string fragment: query incomplete");
    }
  },

  onAccept: function onAccept()
  {
    var candidate = document.getElementById('archive-this-candidate');
    this.archiveThis.selectedFolder = candidate.tooltipText;
    this.debug && this.console.logStringMessage("Archive This: Selected folder = "
      + candidate.tooltipText);

    // Store the fragment-to-folder binding in the database
    var f = this.fragment?this.fragment:document.getElementById("archive-this-search").value;

    this.updateStringmap(f, candidate.tooltipText);

    return true;
  },

  setCandidate : function setCandidate (index)
  {
    this.currCandidate = index;
    var candidate = document.getElementById('archive-this-candidate');

    // Reset the contents of the candidate field
    candidate.removeAttribute("value");
    while(candidate.hasChildNodes()){
      candidate.removeChild(candidate.firstChild);
    }

    // Generate the new value, with the matched string highlighted
    var searchText = document.getElementById("archive-this-search").value;
    var folderName = this.longFolderNames[index];
    var matchStart = this.longFolderNames[index].toLowerCase().
                       indexOf(searchText.toLowerCase());
    var matchEnd = matchStart + searchText.length;

    if (matchStart >= 0)
    {
      var matchSpan = document.createElement('box');
      matchSpan.setAttribute('class','match-string');
      matchSpan.appendChild(document.createTextNode(folderName.substring(matchStart,matchEnd).replace(' ','\u00A0','g')));

      candidate.appendChild(document.createTextNode(folderName.substring(0,matchStart)));
      candidate.appendChild(matchSpan);
      candidate.appendChild(document.createTextNode(folderName.substring(matchEnd)));
    }
    else
    {
      candidate.appendChild(document.createTextNode(folderName));
    }

    candidate.tooltipText = this.folders[index].URI;
  },

  shutdown : function shutdown ()
  {
    this.debug && this.console.logStringMessage("Archive This: closing database");
    this.dbConn.asyncClose();
    this.dbConn = null;
  },

  dump : function dump  (o)
  {
    var str = "";
    for (var f in o)
    {
      str += "  " + f + ": " + o[f] + "\n";
    }
    return str;
  }

}
