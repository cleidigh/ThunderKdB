"use strict";

var ArchiveThisContext =
{
  s : null,

  initOverlay : function()
  {
    this.s = document.getElementById("archive-this-string-bundle");
    var menu = document.getElementById("archive-this-context-menu");
    if (menu)
    {
      menu.addEventListener("popupshowing", this.setMenu.bind(this), false);
    }
  },

  setMenu : function ()
  {
    if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService)
                              .getBranch("archive-this.");
//    prefs.QueryInterface(Components.interfaces.nsIPrefBranch);

    var preset = prefs.getCharPref("presets").split("|",9);

    var menu = document.getElementById("archive-this-context-menu");
    for (var i = 1; i <= 9; i++)
    {
      var item = document.getElementById("archive-this-move-preset-"+i);
      var name = this.getPrettyName(preset[i-1]);
      if (name)
      {
        //item.label = "Move to " + name;
        item.label = this.s.getFormattedString("moveToFolderString",[name]);
        item.hidden = false;
      }
      else
      {
        item.hidden = true;
      }
    }
  },

  getPrettyName : function(folderUri)
  {
    if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }

    var msgfolder;
    try
    {
      msgfolder = MailUtils.getExistingFolder(folderUri, true);
    }
    catch (err)
    {
      return null;
    }

    var folderName;
    if (msgfolder)
    {
      folderName = msgfolder.name;
      var p = msgfolder.parent;
      while (p && p.parent)
      {
        folderName = p.name+'/'+folderName;
        p = p.parent;
      }

      if (msgfolder.server.prettyName)
      {
        //folderName = '"' + folderName + '" on ' + msgfolder.server.prettyName;
        folderName = this.s.getFormattedString("prettyNameString",
                     [folderName, msgfolder.server.prettyName]);
      }
    }
    else
    {
      return null;
    }

    return folderName;

  }
}

window.addEventListener("load",
  ArchiveThisContext.initOverlay.bind(ArchiveThisContext), false);
