var gMarkSubfolders = {};

// Original function
gMarkSubfolders.oldFunc_fillFolderPaneContextMenu = null;


//----------------------------------------------------------
// mark all read subfolders (root)
gMarkSubfolders._msgMarkAllRead_Subfolders_3orLater = function()	// for TB3.0 or later
{
    //dump("msgMarkAllRead_Subfolders(TB30) called\n");

    var folders = gFolderTreeView.getSelectedFolders();
    for (var i = 0; i < folders.length; i++) {
        this.markAllMessagesRead(null, folders[i]);
        if (folders[i].hasSubFolders)
          { this.repeatMark(null, folders[i]); }
    }
};
gMarkSubfolders._msgMarkAllRead_Subfolders_2orEarlier = function()	// for TB2.0 or earlier
{
    //dump("msgMarkAllRead_Subfolders(TB20) called\n");

    var compositeDataSource = GetCompositeDataSource("MarkAllMessagesRead");
    var rootFolder = GetMsgFolderFromUri(GetSelectedFolderURI(), true);

    this.markAllMessagesRead(compositeDataSource, rootFolder);
    if (rootFolder.hasSubFolders)
      { this.repeatMark(compositeDataSource, rootFolder); }
};


//----------------------------------------------------------
// Wrapper for markAllMessageRead
gMarkSubfolders._markAllMessagesRead_3orLater = function(compositeDataSource, folder)	// for TB3.0 or later
{
    folder.markAllMessagesRead(msgWindow);
};
gMarkSubfolders._markAllMessagesRead_2orEarlier = function(compositeDataSource, folder)	// for TB2.0 or earlier
{
    MarkAllMessagesRead(compositeDataSource, folder);
};


//----------------------------------------------------------
// Wrapper for Get enumerator
gMarkSubfolders._getFolderEnumerator_3orLater = function(folder)	// for TB3.0 or later
{
    return folder.subFolders;
};
gMarkSubfolders._getFolderEnumerator_2orEarlier = function(folder)	// for TB2.0 or earlier
{
    return folder.GetSubFolders();
};

//----------------------------------------------------------
// Wrapper for Get Folder Instance
gMarkSubfolders._getFolderInstance_3orLater = function(simEnumerator)	// for TB3.0 or later
{
    if (simEnumerator.hasMoreElements()) {
        return simEnumerator.getNext().
                 QueryInterface(Components.interfaces.nsIMsgFolder);
    }
    return null;
};
gMarkSubfolders._getFolderInstance_2orEarlier = function(enumerator)	// for TB2.0 or earlier
{
  try {
    var folder = enumerator.currentItem().
                   QueryInterface(Components.interfaces.nsIMsgFolder);
   try {
    enumerator.next();
   } catch(ex) { }
    return folder;
  } catch(ex) {
    return null;
  }
};



//----------------------------------------------------------
// mark all read subfolders(sub)
gMarkSubfolders.repeatMark = function(compositeDataSource, folder)
{
    var subFolderEnumerator = this.getFolderEnumerator(folder);
    var subFolder;

    while((subFolder = this.getFolderInstance(subFolderEnumerator))) {
        if (!(subFolder.flags & this.folderFlagsVirtual)) {
            //dump("  " + subFolder.name + " is not virtual(search) folder\n");

            this.markAllMessagesRead(compositeDataSource, subFolder);
            if (subFolder.hasSubFolders) {
                //dump("nested\n");
                this.repeatMark(compositeDataSource, subFolder);
            }
        }
        //dump("  get next folder\n");
    }
    //dump("  done\n");
};


//----------------------------------------------------------
// control 'mark all read' popup hidden or not.
gMarkSubfolders.fillFolderPaneContextMenu = function()
{
    // menu item showing or not.
    function isMenuItemShowing(menuID)
    {
        var item = document.getElementById(menuID);
        if (item)
          { return item.hidden !== true; }
        return false;
    }

    if (!this.oldFunc_fillFolderPaneContextMenu())
      { return false; }
    ShowMenuItem("folderPaneContext-markMailSubfolderAllRead",
                 isMenuItemShowing("folderPaneContext-markMailFolderAllRead"));
    return true;
};


//----------------------------------------------------------
// Initialize
gMarkSubfolders.init = function()
{
    var version = Components.classes["@mozilla.org/xre/app-info;1"].
                    getService(Components.interfaces.nsIXULAppInfo).version;
    var appVer3Orlater = parseInt(version.substring(0,version.indexOf(".")), 10) > 3;

    // for backword compatibility
    if (appVer3Orlater) {
        gMarkSubfolders.folderFlagsVirtual  = Components.interfaces.nsMsgFolderFlags.Virtual;
        gMarkSubfolders.getFolderInstance   = this._getFolderInstance_3orLater;
        gMarkSubfolders.getFolderEnumerator = this._getFolderEnumerator_3orLater;
        gMarkSubfolders.markAllMessagesRead = this._markAllMessagesRead_3orLater;
        gMarkSubfolders.msgMarkAllRead_Subfolders = this._msgMarkAllRead_Subfolders_3orLater;
    } else {
        gMarkSubfolders.folderFlagsVirtual  = MSG_FOLDER_FLAG_VIRTUAL;
        gMarkSubfolders.getFolderInstance   = this._getFolderInstance_2orEarlier;
        gMarkSubfolders.getFolderEnumerator = this._getFolderEnumerator_2orEarlier;
        gMarkSubfolders.markAllMessagesRead = this._markAllMessagesRead_2orEarlier;
        gMarkSubfolders.msgMarkAllRead_Subfolders = this._msgMarkAllRead_Subfolders_2orEarlier;
    }

    // Hook the original function
    this.oldFunc_fillFolderPaneContextMenu = fillFolderPaneContextMenu;
    fillFolderPaneContextMenu = function(){ return gMarkSubfolders.fillFolderPaneContextMenu(); };
};

gMarkSubfolders.init();


// CHANGE HISTORY
// 0.0.1 2007/5/13 1st release
// 0.0.2 2007/6/3
//       a) Refine code.
// 1.0.0 2009/10/12
//       a) Support Thunderbird3.0beta4, and rewrite code.
// 1.0.2 2010/06/05
//       Support Thunderbird 3.1 and rewrite code.
// 1.0.3 2012/05/16
//       Support Thunderbird 4 and later