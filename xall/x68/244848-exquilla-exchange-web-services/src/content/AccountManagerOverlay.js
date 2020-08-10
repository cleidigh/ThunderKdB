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

exquilla.overrideAccountManager = function _overrideAccountManager()
{
  // bug 750781 introduces a regression that stops account manager from working for
  //            new account types. I have to intercept this at the new function
  //            checkDirectoryIsAllowed to fix.
  if (typeof checkDirectoryIsAllowed != "undefined")
  {
    exquilla.oldCheckDirectoryIsAllowed = checkDirectoryIsAllowed;
    checkDirectoryIsAllowed = function _checkDirectoryIsAllowed(aLocalPath)
    {
      if (/exquilla/i.test(aLocalPath.path))
        return true;
      return exquilla.oldCheckDirectoryIsAllowed(aLocalPath);
    }
  }

  // override the account tree to allow us to revise the panels
  gAccountTree.exquilla_oldbuild = gAccountTree._build;
  gAccountTree._build = function exquilla_atBuild()
  {
    gAccountTree.exquilla_oldbuild();
    let mainTreeChildren = document.getElementById("account-tree-children").childNodes;
    for (let i = 0; i < mainTreeChildren.length; i++)
    {
      let node = mainTreeChildren[i];
      try {
        if (node._account && node._account.incomingServer.type == 'exquilla')
        {
          // remove unwanted panes, swap ews server for server
          let treeChildrenNode = node.getElementsByTagName("treechildren")[0];
          let nodeChildren = treeChildrenNode.childNodes;
          let ewsServerNode = null
          //  scan backwards to find the ewsServerNode first
          for (let j = nodeChildren.length - 1; j >= 0; j--)
          {
            let row = nodeChildren[j];
            let pageTag = row.getAttribute('PageTag');
            if (pageTag == 'am-exquillaserver.xhtml'/* COMPAT for TB 68 */ || pageTag == 'am-exquillaserver.xul')
            {
              ewsServerNode = row;
            }
            else if (pageTag == 'am-server.xhtml'/* COMPAT for TB 68 */ || pageTag == 'am-server.xul')
            {
              if (ewsServerNode)
              {
                treeChildrenNode.replaceChild(ewsServerNode, row);
              }
            }
            else if (pageTag == 'am-offline.xhtml' ||
                     pageTag == 'am-offline.xul' || // COMPAT for TB 68
                     //pageTag == 'am-junk.xhtml' ||
                     //pageTag == 'am-junk.xul' || // COMPAT for TB 68
                     pageTag == 'am-mdn.xhtml' ||
                     pageTag == 'am-mdn.xul' || // COMPAT for TB 68
                     pageTag == 'am-e2e.xhtml' ||
                     pageTag == 'am-smime.xul') // COMPAT for TB 68
            {
              treeChildrenNode.removeChild(row);
            }
          }
        }
      } catch (e) {Components.utils.reportError(e);}
    }
  }
  gAccountTree._build();
}

exquilla.addExchangeAccount = function _addExchangeAccount()
{
  setTimeout(function() { exquilla.msgOpenAccountWizard(); }, 0);
}

window.addEventListener("load", function(e) { exquilla.overrideAccountManager(e); }, false);

/**
 * Open the Old Mail Account Wizard, or focus it if it's already open.
 *
 * @param wizardCallback if the wizard is run, callback when it is done.
 * @see msgNewMailAccount below for the new implementation.
 */

exquilla.msgOpenAccountWizard = function _msgOpenAccountWizard()
{
  gNewAccountToLoad = null;

  ChromeUtils.import("resource://exquilla/ewsUtils.jsm").Utils.openAccountWizard();

  // If we started with no servers at all and "smtp servers" list selected,
  // refresh display somehow. Bug 58506.
  // TODO Better fix: select newly created account (in all cases)
  if (typeof(getCurrentAccount) == "function" && // in AccountManager, not menu
      !getCurrentAccount())
    selectServer(null, null);
}
