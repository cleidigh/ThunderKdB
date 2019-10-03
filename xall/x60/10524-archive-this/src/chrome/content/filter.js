"use strict";

Components.utils.import("resource:///modules/MailUtils.js");
Components.utils.import("resource://gre/modules/Services.jsm");

var ArchiveThisFilter =
{
  header: null,
  mimeHeader: null,
  s : null,
  console: Components.classes["@mozilla.org/consoleservice;1"].
             getService(Components.interfaces.nsIConsoleService),

  SetPickerElement : function(pickerID,uri)
  {
    if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }
    var picker = document.getElementById(pickerID);
    if (!picker)
      return;

    if (uri)
    {
      var msgfolder = MailUtils.getFolderForURI(uri, true);
      if (msgfolder && msgfolder.canFileMessages)
      {
        picker.menupopup.selectFolder(msgfolder);
        picker.setAttribute("uri",uri);
        return;
      }
    }

    picker.setAttribute("uri",null);
    picker.setAttribute("label","-");
  },

  onFolderPicked : function(selection, pickerID)
  {
    var selectedUri = selection.getAttribute('id');
    // For some reason, the folder picker returns multiple
    // events when you use "select this folder"
    if (selectedUri.length == 0) { return; }

    this.SetPickerElement(pickerID,selectedUri);
  },

  setComparitor: function(enumValue)
  {
    var menu = document.getElementById('archive-this-comparitor');
    menu.selectedIndex = enumValue;
  },

  setHeaderName: function(headerName)
  {
    var menu = document.getElementById('archive-this-header-name');
    var selections = menu.firstChild.childNodes;

    for (var i=0; i<selections.length; i++)
    {
      if (selections[i].getAttribute("label") == headerName)
      {
        menu.selectedIndex = i;
        return;
      }
    }
    menu.selectedIndex = -1;
  },

  onLoad: function()
  {
    this.setHeaderName(window.arguments[0]);
    this.setComparitor(window.arguments[1]);
    document.getElementById('archive-this-header-value').setAttribute("value",window.arguments[2]);
    this.SetPickerElement("filterFolder",window.arguments[3]);

    this.header = window.arguments[5];
    this.mimeHeader = window.arguments[6];

    if (this.header != null && this.mimeHeader != null)
    {
      this.findBestCandidate();
    }
  },

  findBestCandidate: function()
  {
    var candidates = [ "List-Id", "MailingList", "Mailing-List",
                       "X-ML-Name", "X-List", "X-List-Name",
                       "X-MailingList", "X-ReviewGroup"];
    var val;
    for (var i in candidates)
    {
      val = this.mimeHeader.extractHeader(candidates[i],true);
      if (val)
      {
        this.setHeaderName(candidates[i]);
        document.getElementById('archive-this-header-value').
          setAttribute("value",this.trimToAngleBrackets(val));
        this.guessFolder();
        return;
      }
    }

    // If we haven't found a match yet, we punt and use "From" as
    // our best guess.
    this.setHeaderName("From");
    document.getElementById('archive-this-header-value').
      setAttribute("value",
                   this.trimToAngleBrackets(this.header.mime2DecodedAuthor));
    this.guessFolder();
  },

  guessFolder: function()
  {
    var matchString = document.getElementById('archive-this-header-value').
                        getAttribute("value");
    var guess;

    // For "resource@authority" strings, look for the resource (only)
    var re = new RegExp("^<?([^\\@]*)\\@.*$");
    if (re.test(matchString))
    {
      guess = matchString.replace(re, "$1");
    }

    // For "listname.authority" strings, look for the resource (only)
    if (!guess)
    {
      re = new RegExp("^<?([^\\.]*)\\..*$");
      if (re.test(matchString))
      {
        guess = matchString.replace(re, "$1");
      }
    }

    // Finally, if nothing else seems to match, just use the string itself
    if (!guess)
    {
      guess = matchString;
    }

    guess = guess.replace(/[^a-zA-Z0-9]/,".");


    re = new RegExp("\/"+guess+"$","i");

    var accountManager =
      Components.classes["@mozilla.org/messenger/account-manager;1"].
        getService(Components.interfaces.nsIMsgAccountManager);
    var servers = accountManager.allServers;
    var numServers = servers.length;


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

          if (re.test(cf.URI))
          {
            // We found a plausible folder match. Set the picker.
            this.SetPickerElement("filterFolder",cf.URI);
            return;
          }
        }
      }
    }


  },

  // In most cases, if there is something in angle brackets,
  // then the stuff inside the brackets is important, and the
  // rest of it is not.
  trimToAngleBrackets: function(headerValue)
  {
    var pattern = new RegExp("<.*>");
    if (pattern.test(headerValue))
    {
      return pattern.exec(headerValue);
    }
    return headerValue;
  },

  // If a new header has been selected and we're operating in
  // "create filter from message" mode, update the value from
  // the message header
  headerNameChanged: function()
  {
    if (this.header == null || this.mimeHeader == null)
    {
      return;
    }

    var headerName = document.getElementById('archive-this-header-name').selectedItem.getAttribute("label");
    var headerValue;
    switch (headerName)
    {
      case 'From':
        headerValue = this.header.mime2DecodedAuthor;
        break;
      case 'To':
      case 'To or Cc':
        headerValue = this.header.mime2DecodedRecipients;
        break;
      case 'Subject':
        headerValue = this.header.mime2DecodedSubject;
        break;
      case 'Cc':
        headerValue = this.header.ccList;
        break;
      case 'Message-ID':
        headerValue = this.header.messageId;
        break;
      default:
        headerValue = this.mimeHeader.extractHeader(headerName,true);
    }

    if (headerValue != null)
    {
      document.getElementById('archive-this-header-value').setAttribute("value",this.trimToAngleBrackets(headerValue));
    }

    this.guessFolder();
  },

  onAccept: function()
  {
    if (this.s == null) { this.s = document.getElementById("archive-this-string-bundle"); }
    var headerName = document.getElementById('archive-this-header-name').selectedItem.getAttribute("label");
    var comparitor = document.getElementById('archive-this-comparitor').selectedIndex;
    var headerValue = document.getElementById('archive-this-header-value').value;
    var folder = document.getElementById('filterFolder').getAttribute("uri");

    if (headerValue.length < 1)
    {
      window.alert(this.s.getString("pleaseEnterValueString"));
      return false;
    }

    var msgfolder = MailUtils.getFolderForURI(folder, true);
    if (!msgfolder)
    {
      window.alert(this.s.getString("pleaseSelectFolderString"));
      return false;
    }

    window.arguments[4](headerName,comparitor,headerValue,folder);
    return true;
  }
}
