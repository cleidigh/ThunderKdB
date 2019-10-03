"use strict";

this.EXPORTED_SYMBOLS = ["Accounts"];

var onmessage = function(event){
  Application.console.log("tpecdata command: "+event.data[0]);
  if(event.data[0]=="account")Accounts(event.data[1]);
};


function Accounts(acctMgr){
  //var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
  var accounts = acctMgr.accounts;
  for (var i = 0; i < accounts.length; i++) {
    var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
    var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
    Application.console.log("tpecdata account root: "+rootFolder.prettiestName);
    if (rootFolder.hasSubFolders) {
      var subFolders = rootFolder.subFolders; // nsIMsgFolder
      while(subFolders.hasMoreElements()) {
        var folder = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
        Application.console.log("tpecdata account folder: "+folder.prettiestName);
      }
    }
  }
};