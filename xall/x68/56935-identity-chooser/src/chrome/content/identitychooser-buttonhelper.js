if(!org) var org={};
if(!org.janek) org.janek={};

Components.utils.import("resource:///modules/iteratorUtils.jsm");

org.janek.identitychooser_buttonhelper = function() {
  var self = this;
  self.prefsHelper = org.janek.identitychooser_prefshelper();
  self.identitiesHelper = org.janek.identitychooser_identitieshelper();

  var pub = {};

  pub.removeMessageChildrenFromNode = function(node, hideableIds) {
    for(var i = node.childNodes.length - 1; i >= 0; i--)
      {
        var child = node.childNodes.item(i)

        // Hide menuitems which open compose windows:
        // - menuitems with ids in hideableIds
        if(hideableIds.indexOf(child.id) >= 0)
          {
            child.hidden = true;
          }

        // Remove menuitems created by identitychooser (child.value
        //   starts with "identitychooser-" or
        if((child.hasAttribute("value") &&
            child.getAttribute("value").indexOf("identitychooser-") > -1))
          {
            node.removeChild(child);
          }
      }

    return node;
  }

  pub.createIdentitiesPopup2 = function(popupId, hideableIds, itemCommand) {
    var identitiesPopup = document.getElementById(popupId);

    pub.removeMessageChildrenFromNode(identitiesPopup, hideableIds);

    var insertBeforeNode = null;
    if(identitiesPopup.hasChildNodes())
      {
        var firstChild = identitiesPopup.childNodes[0];
        var separator = document.createElement("menuseparator");
        separator.setAttribute('value', 'identitychooser-separator');
        identitiesPopup.insertBefore(separator, firstChild);

        insertBeforeNode = separator;
      }

    pub.addIdentitiesToPopup2(identitiesPopup,
                              insertBeforeNode,
                              itemCommand);
  }

  pub.addIdentitiesToPopup2 = function(identitiesPopup,
                                      insertBeforeNode,
                                      itemCommand) {
    var allIdentities =
      self.identitiesHelper.getIdentitiesAccountListUserSorted();

    var highlightCurrentAccountIdentities =
      self.prefsHelper.getBoolPref('highlightCurrentAccountIdentities');

    var currentAccount = null;
    if((typeof(gFolderDisplay) != "undefined") &&
       gFolderDisplay.displayedFolder != null) {
      currentAccount = self.findAccountFromFolder(gFolderDisplay.displayedFolder);
    }

    for(var i = 0; i < allIdentities.length; i++)
      {
        var identity = allIdentities[i].identity;
        var includeInMenu = self.prefsHelper.getPrefIncludeInMenu(identity);
        if(!includeInMenu)
          {
            continue;
          }

        var identityMenuItem = document.createElement("menuitem");
        identityMenuItem.setAttribute(
          "label",
          self.identitiesHelper.identityToString(identity));
        identityMenuItem.setAttribute("value",
                                      "identitychooser-" + identity.key);
        identityMenuItem.addEventListener("command",
                                          itemCommand,
                                         false);

        if(currentAccount != null &&
           highlightCurrentAccountIdentities == true &&
           currentAccount.key == allIdentities[i].account.key) {
          identityMenuItem.setAttribute('class', 'highlighted-identity');
        }

        // Make sure our menuitems are first in line
        if(insertBeforeNode == null)
          {
            identitiesPopup.appendChild(identityMenuItem);
          }
        else
          {
            identitiesPopup.insertBefore(identityMenuItem, insertBeforeNode);
          }
      }

  }

  self.findAccountFromFolder = function(theFolder) {
    if (!theFolder)
      return null;
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
      .getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = toArray(fixIterator(acctMgr.accounts,
                                       Components.interfaces.nsIMsgAccount));
    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder

      if(theFolder.isServer &&
         theFolder == rootFolder) {
        return account.QueryInterface(Components.interfaces.nsIMsgAccount);
      }

      if (rootFolder.hasSubFolders) {
	var subFolders = rootFolder.subFolders; // nsIMsgFolder
	while(subFolders.hasMoreElements()) {
	  if (theFolder == subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder))
	    return account.QueryInterface(Components.interfaces.nsIMsgAccount);
	}
      }
    }
    return null;
  }

  pub.extendButton = function(buttonId, popupId, onPopupShowing)
  {
    // Locate the message button, save its oncommand attribute value
    // and remove that attribute from the node
    var button = document.getElementById(buttonId);

    var onCommand = null;
    if(button)
      {
        onCommand = button.getAttribute("oncommand");
        button.removeAttribute("oncommand");

        // Turn the button into a menu and add the popup menu.
        button.setAttribute("type", "menu");
        var identityPopup = document.getElementById(popupId);

        if(!identityPopup)
          {
            identityPopup  = document.createElement("menupopup");
            identityPopup.setAttribute("id", popupId);
            button.appendChild(identityPopup);
          }

        identityPopup.addEventListener("popupshowing",
                                       onPopupShowing,
                                       false);
      }

    return onCommand;
  }

  return pub;
};
