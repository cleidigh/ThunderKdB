/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

if (typeof(exquilla) == 'undefined')
  var exquilla = {};

exquilla.abOverlay = (function _abOverlay()
{
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const Cr = Components.results;
  Object.assign(exquilla, ChromeUtils.import("resource://exquilla/ewsUtils.jsm"));
  Object.assign(exquilla, ChromeUtils.import("resource:///modules/MailServices.jsm"));
  let pub = {};

  // Variable renamed in TB 54
  if ((typeof getSelectedDirectoryURI) == 'undefined')
    var getSelectedDirectoryURI = GetSelectedDirectory;

  function dl(text)
  { 
    dump(text + '\n');
  }
  //dl('exquilla.abOverlay');

  let abController =
  {
    supportsCommand: function(command)
    {
      switch (command)
      {
        case 'cmd_exquillaRebuild':
          return true;
        default:
          return false;
      }
    },

    isCommandEnabled: function(command)
    {
      let selectedDir;
      switch (command)
      {
        case 'cmd_exquillaRebuild':
          selectedDir = getSelectedDirectoryURI();
          return (selectedDir.indexOf('exquilla-directory://') != -1) ? true : false;
        default:
          return false;
      }
    },

    doCommand: function(command)
    {
      switch (command)
      {
        case 'cmd_exquillaRebuild':
        {
          let directory = exquilla.MailServices.ab.getDirectory(getSelectedDirectoryURI());
          if (!(directory instanceof Ci.msgIOverride))
            throw "Rebuilding a directory is only supported for EWS";
          let ewsDirectory = safeGetJS(directory);
          ewsDirectory.rebuild();
          break;
        }
      }
    },

   onEvent: function(event)
   {}
  }

  function onLoad()
  {
    let dirTree = GetDirTree();
    dirTree.controllers.appendController(exquilla.abOverlay.abController);

    // The standard command controller does not have any provision to disable
    //  the delete command from an extension. So I will replace that command.
    let oldDirPaneControllerEnabled = DirPaneController.isCommandEnabled;
    DirPaneController.isCommandEnabled = function exquilla_IsCommandEnabled(command)
    {
      switch (command)
      {
        case "cmd_delete":
        case "button_delete":
          var selectedDir = getSelectedDirectoryURI();
          // if this is an ews directory, disable delete
          if (selectedDir.lastIndexOf("exquilla-directory://", 0) == 0)
            return false;
          // fall through to default
      }
      return oldDirPaneControllerEnabled(command);
    }
  }

  function updateCommands()
  {
    goUpdateCommand('cmd_exquillaRebuild');
  }

  // publically available symbols
  pub.abController = abController;
  pub.onLoad = onLoad;
  pub.updateCommands = updateCommands;

  return pub;
})();

window.addEventListener("load", function() {exquilla.abOverlay.onLoad();}, false);
