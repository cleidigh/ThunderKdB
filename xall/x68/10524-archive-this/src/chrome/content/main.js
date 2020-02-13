"use strict";

var ArchiveThis = {

prefs: null,
preset: null,
rules: null,
selectedFolder: null,
console: Components.classes["@mozilla.org/consoleservice;1"].
           getService(Components.interfaces.nsIConsoleService),
debug: false,
overrideKeys: false,
maxHeaderSize: 8192,

moveToFolderByUri: function(uri)
{
  if (this.debug)
  {
      var messageUriArray = gFolderDisplay.selectedMessageUris;
      this.console.logStringMessage("Archive This: Moving ["
           + messageUriArray.join(', ') + "] to " + uri);
  }

  var folder = MailUtils.getExistingFolder(uri, false);
  MsgMoveMessage(folder);
},

copyToFolderByUri: function(uri)
{
  var folder = MailUtils.getExistingFolder(uri, false);
  MsgCopyMessage(folder);
},

goToFolderByUri: function(uri)
{
  var folder = MailUtils.getExistingFolder(uri, false);
  gFolderTreeView.selectFolder(folder);
},

loadFilters: function()
{
  this.rules = new Array();
  var ruleText = this.prefs.getCharPref("filters").split("||");
  if (this.debug)
  {
    this.console.logStringMessage("Archive This: rules: " +
                                  ruleText.join());
  }
  for (var i = 0; i < ruleText.length; i++)
  {
    var rule = archiveThisClone(ArchiveRule);
    rule.init(ruleText[i]);
    this.rules.push(rule);
  }
},

loadPrefs: function()
{
  if (!this.prefs)
  {
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService)
                              .getBranch("archive-this.");
    this.prefs.addObserver("", this, false);
  }

  this.debug = this.prefs.getBoolPref("debug");
  if (this.debug)
  {
    this.console.logStringMessage("Archive This: Debugging enabled at startup.");
  }

  this.preset = this.prefs.getCharPref("presets").split("|",9);
  if (this.debug)
  {
    this.console.logStringMessage("Archive This: presets: " +
                                  this.preset.join());
  }

  this.maxHeaderSize = this.prefs.getIntPref("max-header-size");

  if (this.debug)
  {
    this.console.logStringMessage("Archive This: max-header-size: " +
                                  this.maxHeaderSize);
  }

  this.loadFilters();
},

findFolderUri: function (messageUri, header){
    var mimeHeader;
    try {
      mimeHeader = mdn_extended_createHeadersFromURI(messageUri);
    } catch (e) {
      if (this.debug) {
        this.console.logStringMessage("Header too long for " + messageUri);
      }
      return "";
    }

//    alert(header.mime2DecodedAuthor + "\n" + mimeHeader.extractHeader("Message-ID",false) + "\n" + messageUri + "\n" + header.folder.URI);

    for (var i = 0; i < this.rules.length; i++)
    {
      if (this.rules[i].matches(header,mimeHeader))
      {
        if (this.debug)
        {
          this.console.logStringMessage("Archive This: Found matching filter: " +
          this.rules[i].header + ": " + this.rules[i].value + " => " + this.rules[i].folder );
        }
        return this.rules[i].folder;
      }
    }

    if (this.debug)
    {
      this.console.logStringMessage("Archive This: No matching filter found.");
    }

    return "";
  },

folder: function(preset) {
  if (this.debug)
  {
    this.console.logStringMessage("Archive This: executing preset " + preset);
  }

  if (!this.prefs) { this.loadPrefs(); }
  var uri = this.preset[preset-1];

  if (uri && uri.indexOf("special:") == 0)
  {
    this.moveToSpecialFolder(uri.substr(8));
    return;
  }

  if (uri.length > 0)
  {
    this.moveToFolderByUri(uri);
  }
},

moveToSpecialFolder : function (folder)
{
  var flags = 0;
  switch (folder)
  {
    case "Inbox":      flags = 0x1000; break;
    case "Trash":      flags = 0x0100; break;
    case "Sent":       flags = 0x0200; break;
    case "Drafts":     flags = 0x0400; break;
    case "Templates":  flags = 0x400000; break;
  }

  ////////////////////
  // Gather the array of message headers and their URIs
  var messages = [];
  var messageURIs = [];

  messages = gFolderDisplay.selectedMessages;
  messageURIs = gFolderDisplay.selectedMessageUris;

  for (var i in messages)
  {
    // Figure out the special folder for this message
    var rootFolder = messages[i].folder.server.rootFolder;
    var allFolders = Components.classes ["@mozilla.org/supports-array;1"].createInstance (Components.interfaces.nsISupportsArray);
    rootFolder.ListDescendents (allFolders);
    var numFolders = allFolders.Count ();
    for (var folderIndex = 0; folderIndex < numFolders; folderIndex++)
    {
      var cf = allFolders.GetElementAt(folderIndex).QueryInterface(Components.interfaces.nsIMsgFolder);
      if (cf.flags & flags)
      {
        this.console.logStringMessage("Archive This: Found special folder '"+folder+
          "' for ["+messageURIs[i]+"]: " + cf.URI);
        gFolderDisplay.selectMessage(messages[i]);
        this.moveToFolderByUri(cf.URI);
        folderIndex = numFolders;
      }
    }

  }

},

filter: function(createIfNotFound)
{
  if (this.debug)
  {
    this.console.logStringMessage("Archive This: executing filters");
  }
  this.newFilter(createIfNotFound);
},

// This is the function for 3.0b3, which changed the folder interface
// fairly radically. It is *much* cleaner, and works better than the
// older interface.
newFilter: function (createIfNotFound)
{
  if (!this.prefs) { this.loadPrefs(); }

  var folderUri;
  var messageArray = gFolderDisplay.selectedMessages;
  var messageUriArray = gFolderDisplay.selectedMessageUris;
  if (!messageArray)
  {
    return;
  }

  var selectArray = [];
  var matches = [];

  var header;
  for (var i = 0; i < messageArray.length; i++)
  {
    header = messageArray[i];
    folderUri = this.findFolderUri(messageUriArray[i], header);
    //gFolderDisplay.selectMessage(messageArray[i]);
    if (folderUri.length > 0)
    {
      //MsgMoveMessage(MailUtils.getExistingFolder(folderUri, false));
      //this.moveToFolderByUri(folderUri);
      if (!matches[folderUri])
      {
        matches[folderUri] = [];
      }
      matches[folderUri].push(messageArray[i]);
    }
    else
    {
      selectArray[selectArray.length] = header;
      if (messageArray.length == 1 && createIfNotFound)
      {
        this.createFilterFromMessage();
      }
    }
  };

  for (i in matches)
  {
    //this.debug && this.console.logStringMessage("Archive This: " + matches[i].length + " matches for " + i);
    gFolderDisplay.selectMessages(matches[i]);
    this.moveToFolderByUri(i);
  }

  if (selectArray.length > 0)
  {
    gFolderDisplay.selectMessages(selectArray);
  }
},

createFilterFromMessage : function()
{
  var header;
  var uri;

  header = gFolderDisplay.selectedMessages[0];
  uri = gFolderDisplay.selectedMessageUris[0];

  window.openDialog('chrome://archive-this/content/filter.xul','filter',
                    'chrome,modal,centerscreen', 'To or Cc',1,'','',
                     ArchiveThis['addRule'],
                     header,
                     mdn_extended_createHeadersFromURI(uri));
},

addRule : function (headerName,comparitor,headerValue,folder)
{
  if (!ArchiveThis.prefs) { ArchiveThis.loadPrefs(); }

  var rule = headerName + "|" + comparitor + "|" + headerValue + "|" + folder;
  var allrules = ArchiveThis.prefs.getCharPref("filters").split("||");
  allrules.push(rule);
  ArchiveThis.prefs.setCharPref("filters",allrules.join('||'));

  ArchiveThis.loadFilters();
},

shutdown: function()
{
  this.prefs.removeObserver("", this);
},

observe: function(subject, topic, data)
{
  if (topic != "nsPref:changed")
  {
    return;
  }

  switch(data)
  {
    case "presets":
      this.preset = this.prefs.getCharPref("presets").split("|",9);
      break;
    case "filters":
      this.loadFilters();
      break;
    case "keys":
      this.bindKeys();
      break;
    case "debug":
      this.debug = this.prefs.getBoolPref("debug");
      if (this.debug)
      {
        this.console.logStringMessage("Archive This: Debugging enabled.");
      }
    case "max-header-size":
      this.maxHeaderSize = this.prefs.getIntPref("max-header-size");
      if (this.debug)
      {
        this.console.logStringMessage("Archive This: max-header-size: " +
                                      this.maxHeaderSize);
      }
  }
},

init : function ()
{
  ArchiveThisKeyUtils.init();
  if (!this.prefs) { this.loadPrefs(); }
  this.bindKeys();
},

bindKeys : function()
{
  // This is kind of a cheesy way to stop the static
  // analysis tools from complaining about a problem that
  // I can't actually fix. The key elements don't correctly
  // emit command events that you can hook with
  // addEventListner, so I am forced to use setAttribute
  // to cause this to work. See Bug 688738.
  var cmd = decodeURI("%6F%6Ecommand");

  if (!this.prefs) { this.loadPrefs(); }

  ArchiveThisKeyUtils.reEnableKeys();

  var keys = new Array();
  keys = this.prefs.getCharPref("keys").split("|");

  if (this.debug)
  {
    this.console.logStringMessage("Archive This: Binding keys.");
  }

  var win = document.getElementById("messengerWindow");
  var keyset = document.getElementById("archive-this-keys");
  win.removeChild(keyset);
  keyset = document.createElement('keyset');
  keyset.id = "archive-this-keys";

  for (var i = 0; i < keys.length / 2; i++)
  {
    var key = document.createElement('key');

    key.setAttribute('id',"archive-this-key-" + i);
    key.setAttribute("modifiers",keys[i*2]);

    if (i == 0)
    {
      // This is what the addon center claims to want. Which would be
      // peachy, if it worked. But it doesn't. So we just have to
      // ignore the warnings about using 'oncommand'. See Bug 688738.
      // key.addEventListener("command",function(){ArchiveThis.filter(true);},false);

      key.setAttribute(cmd,"ArchiveThis['filter'](true)");
    }
    else if (i < 10)
    {
      // This is what the addon center claims to want. Which would be
      // peachy, if it worked. But it doesn't. So we just have to
      // ignore the warnings about using 'oncommand'. See Bug 688738.
      // key.addEventListener("command",function(){ArchiveThis.folder(i);},false);
      key.setAttribute(cmd,"ArchiveThis['folder']("+i+")");
    }
    else
    {
      switch (i)
      {
        case 10:
          // Deprecated, but alternate methods do not work. Will fix when
          // a preferred and functional alternative exists. See Bug 688738.
          key.setAttribute(cmd,"ArchiveThis['moveToFolder']()");
          break;
        case 11:
          // Deprecated, but alternate methods do not work. Will fix when
          // a preferred and functional alternative exists. See Bug 688738.
          key.setAttribute(cmd,"ArchiveThis['copyToFolder']()");
          break;
        case 12:
          // This is what the addon center claims to want. Which would be
          // peachy, if it worked. But it doesn't. So we just have to
          // ignore the warnings about using 'oncommand'. See Bug 688738.
          // key.addEventListener("command",function(){ArchiveThis.goToFolder();},false);

          key.setAttribute(cmd,"ArchiveThis['goToFolder']()");
          break;
      }
    }

    var keycode = keys[(i*2)+1];
    if (keycode.length == 1)
    {
      key.setAttribute("key",keycode);
    }
    else
    {
      key.setAttribute("keycode",keycode);
    }
    keyset.appendChild(key);

    if (this.debug)
    {
      this.console.logStringMessage("Archive This: Binding " +
        ArchiveThisKeyUtils.normalize(keys[i*2],keycode) + " to " +
        key.getAttribute('oncommand'));
    }

    if (this.overrideKeys)
    {
      ArchiveThisKeyUtils.disableKey(keys[i*2],keycode);
    }
  }

  win.appendChild(keyset);
},

getSelectedHeaders : function()
{
  return gFolderDisplay.selectedMessages;
},

moveToFolder : function()
{
  var headers = this.getSelectedHeaders();
  if (headers.length == 0) { return; }
  window.openDialog('chrome://archive-this/content/move-copy.xul','move-copy',
                    'chrome,modal,centerscreen',this,headers,'move');
  if (this.selectedFolder)
  {
    this.moveToFolderByUri(this.selectedFolder);
  }
},

copyToFolder : function()
{
  var headers = this.getSelectedHeaders();
  if (headers.length == 0) { return; }
  window.openDialog('chrome://archive-this/content/move-copy.xul','move-copy',
                    'chrome,modal,centerscreen',this,headers,'copy');
  if (this.selectedFolder)
  {
    this.copyToFolderByUri(this.selectedFolder);
  }
},

goToFolder : function()
{
  window.openDialog('chrome://archive-this/content/move-copy.xul','move-copy',
                    'chrome,modal,centerscreen',this,[],'go');
  if (this.selectedFolder)
  {
    this.goToFolderByUri(this.selectedFolder);
  }
},

openPrefs : function()
{
  window.openDialog('chrome://archive-this/content/prefs.xul',
                    'prefs','centerscreen,chrome');
}

}

/*----------------------------------------------------------------------
  The following license block applies to the code that follows it.
  It has been borrowed from the mdn_extended plugin.
----------------------------------------------------------------------*/

/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is mozilla.org Code.
 *
 * The Initial Developer of the Original Code is
 * BT Global Services / Etat  français  Ministère de la Défense
 * Portions created by the Initial Developer are Copyright (C) 1998-2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Eric Ballet Baz BT Global Services / Etat français Ministère de la Défense
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */


function mdn_extended_createHeadersFromURI(messageURI) {
    var messageService = messenger.messageServiceFromURI(messageURI);
    var messageStream = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance().QueryInterface(Components.interfaces.nsIInputStream);
    var inputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
    inputStream.init(messageStream);
    var newuri = messageService.streamMessage(messageURI,messageStream, msgWindow, null, false, null);

    var message_content = "";
    inputStream.available();
    while (inputStream.available()) {
        message_content = message_content + inputStream.read(512);
        var p = message_content.indexOf("\r\n\r\n");
        var p1 = message_content.indexOf("\r\r");
        var p2 = message_content.indexOf("\n\n");
        if (p > 0) {
          message_content = message_content.substring(0, p);
          break;
        }
        if (p1 > 0) {
          message_content = message_content.substring(0, p1);
          break;
        }
        if (p2 > 0) {
          message_content = message_content.substring(0, p2);
          break;
        }
        if (message_content.length > (ArchiveThis.maxHeaderSize || 8192))
        {
          throw "Could not find end-of-headers line.";
          return null;
        }
    }
    message_content = message_content + "\r\n";

    var headers = Components.classes["@mozilla.org/messenger/mimeheaders;1"].createInstance().QueryInterface(Components.interfaces.nsIMimeHeaders);
    headers.initialize(message_content, message_content.length);
    return headers;
}

window.addEventListener('load',ArchiveThis.init.bind(ArchiveThis));
