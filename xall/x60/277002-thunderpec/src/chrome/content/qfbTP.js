"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.qfb) tpec_org.xtc.tp.qfb = {};

Components.utils.import("resource:///modules/searchSpec.js");
Components.utils.import("resource:///modules/quickFilterManager.js");


tpec_org.xtc.tp.qfb = function(){
  function pub(){};

  var qfb_listener = {
    _init: function(){
      FolderDisplayListenerManager.registerListener(this);
    },
    onMakeActive: function(aFolderDisplay) {
      var folder = gFolderDisplay.displayedFolder;
      tpec_org.xtc.tp.qfb.jsdump("QFB: folder: "+folder.name); 
      var account = tpec_org.xtc.tp.qfb.findAccountFromFolder(folder);
      if(account) {
        var mbxName = "     ";
        if(account.defaultIdentity){
          mbxName = account.defaultIdentity.email;
        }
//      if(folder){
//        while(folder.parent!=null){
//          folder = folder.parent;
//        }
//        var mbxName = folder.name;
        tpec_org.xtc.tp.qfb.jsdump("QFB: mbxname: "+mbxName);      
        if(prefTP.exists(mbxName)){
          tpec_org.xtc.tp.qfb.jsdump("QFB: activate toolbar");      
          document.getElementById("tpec-qfb-messages").setAttribute("disabled", "false");
          document.getElementById("tpec-qfb-notifications").setAttribute("disabled", "false");
          document.getElementById("tpec-qfb-53").setAttribute("disabled", "false");
        } else {
          tpec_org.xtc.tp.qfb.jsdump("QFB: deactivate toolbar");      
          document.getElementById("tpec-qfb-messages").setAttribute("disabled", "true");
          document.getElementById("tpec-qfb-notifications").setAttribute("disabled", "true");
          document.getElementById("tpec-qfb-53").setAttribute("disabled", "true");
        }
      } else {
        tpec_org.xtc.tp.qfb.jsdump("QFB: account not found; deactivate toolbar");      
        document.getElementById("tpec-qfb-messages").setAttribute("disabled", "true");
        document.getElementById("tpec-qfb-notifications").setAttribute("disabled", "true");
        document.getElementById("tpec-qfb-53").setAttribute("disabled", "false");
      }
    }   
  };
  
  var prefTP;

  pub.jsdump = function(str){
    if(prefTP.getDebug()){
      Components.classes['@mozilla.org/consoleservice;1']
                .getService(Components.interfaces.nsIConsoleService)
                .logStringMessage("ThunderPEC: "+str);
                }
  };

  pub.init = function(){
    prefTP = new ThunderPecPrefs();
    prefTP.init();
    QuickFilterManager.defineFilter({
      name: "pecmessages",
      domId: "tpec-qfb-messages",
      appendTerms: function(aTermCreator, aTerms, aFilterValue) {
        var term, value;
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "POSTA CERTIFICATA";
        term.value = value;
        term.op = nsMsgSearchOp.BeginsWith;
        term.booleanAnd = false;
        aTerms.push(term);
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "ANOMALIA MESSAGGIO";
        term.value = value;
        term.op = nsMsgSearchOp.BeginsWith;
        term.booleanAnd = false;
        aTerms.push(term);
      },
    });

    QuickFilterManager.defineFilter({
      name: "pecnotifications",
      domId: "tpec-qfb-notifications",
      appendTerms: function(aTermCreator, aTerms, aFilterValue) {
        var term, value;
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "POSTA CERTIFICATA";
        term.value = value;
        term.op = nsMsgSearchOp.DoesntContain;
        term.booleanAnd = true;
        aTerms.push(term);
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "ANOMALIA MESSAGGIO";
        term.value = value;
        term.op = nsMsgSearchOp.DoesntContain;
        term.booleanAnd = true;
        aTerms.push(term);
      },
    });
    QuickFilterManager.defineFilter({
      name: "pec53",
      domId: "tpec-qfb-53",
      appendTerms: function(aTermCreator, aTerms, aFilterValue) {
        var term, value;
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "POSTA CERTIFICATA";
        term.value = value;
        term.op = nsMsgSearchOp.BeginsWith;
        term.booleanAnd = true;
        aTerms.push(term);
        
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "notificazione";  
        term.value = value;
        term.op = nsMsgSearchOp.Contains ;
        term.booleanAnd = true;
        aTerms.push(term);

        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "ai";  
        term.value = value;
        term.op = nsMsgSearchOp.Contains ;
        term.booleanAnd = true;
        aTerms.push(term);
        
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "sensi";  
        term.value = value;
        term.op = nsMsgSearchOp.Contains ;
        term.booleanAnd = true;
        aTerms.push(term);
        
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "della";  
        term.value = value;
        term.op = nsMsgSearchOp.Contains ;
        term.booleanAnd = true;
        aTerms.push(term);
        
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "legge";  
        term.value = value;
        term.op = nsMsgSearchOp.Contains ;
        term.booleanAnd = true;
        aTerms.push(term);
        
        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "53";  
        term.value = value;
        term.op = nsMsgSearchOp.Contains ;
        term.booleanAnd = true;
        aTerms.push(term);

        term = aTermCreator.createTerm();
        term.attrib = nsMsgSearchAttrib.Subject;
        value = term.value;
        value.str = "1994";  
        term.value = value;
        term.op = nsMsgSearchOp.Contains ;
        term.booleanAnd = true;
        aTerms.push(term);
        
      },
    });
    document.getElementById("tpec-qfb-messages").setAttribute("checked", "false");
    document.getElementById("tpec-qfb-notifications").setAttribute("checked", "false");
    document.getElementById("tpec-qfb-53").setAttribute("checked", "false");
    //to solve a problem in tb on linux
    //document.getElementById("quick-filter-bar-collapsible-buttons").setAttribute("shrink", "false");
    qfb_listener._init();
  }

  pub.selectMessages = function(){
      var aNode = document.getElementById("tpec-qfb-messages");    
      var bNode = document.getElementById("tpec-qfb-notifications");    
      var cNode = document.getElementById("tpec-qfb-53");    
      bNode.checked = false;
      cNode.checked = false;
      try {
        var postValue = aNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pecmessages", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
      try {
        var postValue = bNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pecnotifications", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
      try {
        var postValue = cNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pec53", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
  }

  pub.selectNotifications = function(){
      var aNode = document.getElementById("tpec-qfb-notifications");    
      var bNode = document.getElementById("tpec-qfb-messages");    
      var cNode = document.getElementById("tpec-qfb-53");    
      bNode.checked = false;
      cNode.checked = false;
      try {
        var postValue = aNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pecnotifications", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
      try {
        var postValue = bNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pecmessages", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
      try {
        var postValue = cNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pec53", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
  }
  
  pub.select53 = function(){
      var aNode = document.getElementById("tpec-qfb-notifications");    
      var bNode = document.getElementById("tpec-qfb-messages");    
      var cNode = document.getElementById("tpec-qfb-53");    
      bNode.checked = false;
      aNode.checked = false;
      try {
        var postValue = aNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pecnotifications", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
      try {
        var postValue = bNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pecmessages", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
      try {
        var postValue = cNode.checked ? true : null;
        QuickFilterBarMuxer.activeFilterer.setFilterValue(
          "pec53", postValue);
        QuickFilterBarMuxer.deferredUpdateSearch();
      }
      catch (ex) {
        logException(ex);
      }
  }
  
  pub.findAccountFromFolder = function(theFolder) {
      if (!theFolder)
          return null;
      var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
          .getService(Components.interfaces.nsIMsgAccountManager);
      var accounts = acctMgr.accounts;
      var accNum = (accounts.Count?accounts.Count():accounts.length);
      var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
      for (var i = 0; i < accNum; i++) {  
          var account = query(i, Components.interfaces.nsIMsgAccount);
          var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder
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
  return pub;
}();
