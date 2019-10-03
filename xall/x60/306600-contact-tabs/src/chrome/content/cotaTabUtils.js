var EXPORTED_SYMBOLS = ["TabUtils"];

var TabUtils = new function() {
  var self = this;
  var pub = {};

  pub.findMainWindow = function(window) {
    return window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
          .getInterface(Components.interfaces.nsIWebNavigation)
          .QueryInterface(Components.interfaces.nsIDocShellTreeItem)
          .rootTreeItem
          .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
          .getInterface(Components.interfaces.nsIDOMWindow);
  }

  pub.findTabBar = function(window) {
    var mainWindow = pub.findMainWindow(window);

    return mainWindow.document.getElementById('tabmail');
  }

  pub.getLocalStorageId = function(doc, window) {
    var cardViewBox = doc.getElementById("CardViewBox");
    var localStorageId = null;
    if(cardViewBox) {
      localStorageId = cardViewBox.getAttribute("LocalStorageId");
    }

    if(localStorageId == null) {
      var tabBar = pub.findTabBar(window);
      var browser = tabBar.getBrowserForSelectedTab();
      localStorageId = browser.getUserData("LocalStorageId");
    }

    return localStorageId;
  }

  pub.getPrimaryEmail = function(doc, window) {
    var cardViewBox = doc.getElementById("CardViewBox");
    var primaryEmail = null;
    if(cardViewBox) {
      primaryEmail = cardViewBox.getAttribute("PrimaryEmail");
    }

    if(primaryEmail == null) {
      var tabBar = pub.findTabBar(window);
      var browser = tabBar.getBrowserForSelectedTab();
      primaryEmail = browser.getUserData("PrimaryEmail");
    }

    return primaryEmail;
  }

  return pub;
}
