"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.select) tpec_org.xtc.tp.select = {};


tpec_org.xtc.tp.select = function(){
  function pub(){};

  var prefTP = null;
  var pecAccounts = null;
  
  pub.jsdump = function(str){
    if(prefTP.getDebug()){
      Components.classes['@mozilla.org/consoleservice;1']
                .getService(Components.interfaces.nsIConsoleService)
                .logStringMessage("ThunderPEC: "+str);
      //prefTP.log(tmpDir,"searchTP: "+str+"\n");
      }
  }

  pub.init = function(){
    prefTP = new ThunderPecPrefs();
    prefTP.init();
    
    pecAccounts =  prefTP.getAccounts().split(",");
    var idx;
    tpec_org.xtc.tp.select.jsdump("SELECT TP Accounts "+prefTP.getAccounts()+" "+pecAccounts.length);

    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager); 
    var accounts = acctMgr.accounts;  
    var tpecAccountList = document.getElementById('tpecAccountList');
    var accNum = (accounts.Count?accounts.Count():accounts.length);
    var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
    for (var i = 0; i < accNum; i++) {  
      var account = query(i, Components.interfaces.nsIMsgAccount);
      tpec_org.xtc.tp.select.jsdump("SELECT TP "+account.incomingServer.type+" "+account.incomingServer.rootFolder.name);
      if(account.defaultIdentity){
        var newRow = document.createElement("checkbox");
        newRow.setAttribute('label',account.defaultIdentity.email);
        newRow.setAttribute('id',account.defaultIdentity.email);
        newRow.setAttribute('checked',prefTP.exists(account.defaultIdentity.email));
        var newSpacer = document.createElement("spacer");
        tpecAccountList.appendChild(newRow);
        tpecAccountList.appendChild(newSpacer);
        for (var j = 0; j < pecAccounts.length; j++) {
          if(account.defaultIdentity.email==pecAccounts[j])pecAccounts[j] = "";
        }
      }
    }
    for (var i = 0; i < pecAccounts.length; i++) {
        tpec_org.xtc.tp.select.jsdump("SELECT TP adding to list "+pecAccounts[i]);
        if(pecAccounts[i]!=""){
          var newRow = document.createElement("checkbox");
          newRow.setAttribute('label',pecAccounts[i]);
          newRow.setAttribute('id',pecAccounts[i]);
          newRow.setAttribute('checked',true);
          var newSpacer = document.createElement("spacer");
          tpecAccountList.appendChild(newRow);
          tpecAccountList.appendChild(newSpacer);
        }
    }  
    
  }

  pub.cancel = function(){
    window.close();
    }

  pub.ok = function(){
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager); 
    var accounts = acctMgr.accounts;  
    var tpecAccountList = document.getElementById('tpecAccountList');
    prefTP.clear();
    var accNum = (accounts.Count?accounts.Count():accounts.length);
    var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
    for (var i = 0; i < accNum; i++) {  
      var account = query(i, Components.interfaces.nsIMsgAccount);
      if(account.defaultIdentity){
        var checkbox = document.getElementById(account.defaultIdentity.email);
        if(checkbox.checked)prefTP.addAccount(account.defaultIdentity.email);
      }
    }
    for (var i = 0; i < pecAccounts.length; i++) {
        if(pecAccounts[i]!=""){
          tpec_org.xtc.tp.select.jsdump("SELECT TP adding "+pecAccounts[i]);
          var checkbox = document.getElementById(pecAccounts[i]);
          if(checkbox.checked)prefTP.addAccount(pecAccounts[i]);
        }
    }  

    window.close();
  }

  return pub;
}();
