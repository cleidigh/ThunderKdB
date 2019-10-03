"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.preferences) tpec_org.xtc.tp.preferences = {};


tpec_org.xtc.tp.preferences = function(){
  function pub(){};
  
  var prefTP;
  var stringBundle;

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
    
    stringBundle = document.getElementById("tpecStringBundle");

    tpec_org.xtc.tp.preferences.receiptMenu();
    tpec_org.xtc.tp.preferences.depreceiptMenu();
    tpec_org.xtc.tp.preferences.p7mMenu();
    tpec_org.xtc.tp.preferences.emlMenu();    
    tpec_org.xtc.tp.preferences.znameMenu();
    tpec_org.xtc.tp.preferences.debugMenu();
    tpec_org.xtc.tp.preferences.peccolMenu();
    tpec_org.xtc.tp.preferences.autoarchiveMenu();
    tpec_org.xtc.tp.preferences.defaultpecMenu();
    tpec_org.xtc.tp.preferences.showDefaultButtonMenu();
    tpec_org.xtc.tp.preferences.showShareDataMenu();
    tpec_org.xtc.tp.preferences.cosMenu();    
  }

  pub.receiptMenu = function(){
    var receipt = prefTP.getReceipt();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecComplete");
    var menuB = document.getElementById("tpecBrief");
    var menuS = document.getElementById("tpecSynth");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    menuS.setAttribute("selected", false);
    
    if(receipt=="completa")menuC.setAttribute("selected", true);
    if(receipt=="breve")menuB.setAttribute("selected", true);
    if(receipt=="sintetica")menuS.setAttribute("selected", true);
  };

  //v175pre1 start
  pub.depreceiptMenu = function(){
    var receipt = prefTP.getDepReceipt();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecDepComplete");
    var menuB = document.getElementById("tpecDepBrief");
    var menuS = document.getElementById("tpecDepSynth");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    menuS.setAttribute("selected", false);
    
    if(receipt=="completa")menuC.setAttribute("selected", true);
    if(receipt=="breve")menuB.setAttribute("selected", true);
    if(receipt=="sintetica")menuS.setAttribute("selected", true);
  };

  pub.setDepReceiptType = function(r){
    prefTP.setDepReceipt(r);
  };
  //v175pre1 stop

  pub.setReceiptType = function(r){
    prefTP.setReceipt(r);
  };
  
  pub.setP7MStatus = function(r){
    prefTP.setP7M(r);
  };

  pub.p7mMenu = function(){
    var p7m = prefTP.getP7M();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+p7m); 
    var menuC = document.getElementById("tpecP7MOn");
    var menuB = document.getElementById("tpecP7MOff");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(p7m=="on")menuC.setAttribute("selected", true);
    if(p7m=="off")menuB.setAttribute("selected", true);
  };

   pub.emlMenu = function(){
    var receipt = prefTP.getOnlyEML();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecEMLYes");
    var menuB = document.getElementById("tpecEMLNo");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(receipt=="on")menuC.setAttribute("selected", true);
    if(receipt=="off")menuB.setAttribute("selected", true);
  };

  pub.setEML = function(r){
    prefTP.setOnlyEML(r);
  };

  pub.cosMenu = function(){
    var receipt = prefTP.getCloseOnSave();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecCOSYes");
    var menuB = document.getElementById("tpecCOSNo");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(receipt=="on")menuC.setAttribute("selected", true);
    if(receipt=="off")menuB.setAttribute("selected", true);
  };

  pub.setCOS = function(r){
    prefTP.setCloseOnSave(r);
  };

  pub.peccolMenu = function(){
    var receipt = prefTP.getPecCol();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecPecColYes");
    var menuB = document.getElementById("tpecPecColNo");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(receipt=="on")menuC.setAttribute("selected", true);
    if(receipt=="off")menuB.setAttribute("selected", true);
  };
  pub.setPecCol = function(r){
    prefTP.setPecCol(r);
  };

  pub.autoarchiveMenu = function(){
    var receipt = prefTP.getAutoArchive();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecAutoArchiveYes");
    var menuB = document.getElementById("tpecAutoArchiveNo");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(receipt=="on")menuC.setAttribute("selected", true);
    if(receipt=="off")menuB.setAttribute("selected", true);
    
    document.getElementById('tpecArchiveDir').value = prefTP.getArchiveDir();
  };
  
  pub.setAutoArchive = function(r){
    prefTP.setAutoArchive(r);
    if(r=='on' && prefTP.getArchiveDir()==''){
      tpec_org.xtc.tp.preferences.aafolder();
    }
  };

  pub.aafolder = function(){
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, stringBundle.getString('tpec.aa.folder'), nsIFilePicker.modeGetFolder);
    /*
    var res = fp.show();
    if (res != nsIFilePicker.returnCancel){
      var thefile = fp.file;
      tpec_org.xtc.tp.preferences.jsdump("AA FOLDER: "+thefile.path);
      prefTP.setArchiveDir(thefile.path);
      document.getElementById('tpecArchiveDir').value = thefile.path;
    } else {
      if(prefTP.getArchiveDir()==''){
        prefTP.setAutoArchive('off');
        tpec_org.xtc.tp.preferences.autoarchiveMenu();
      }
    }
    */
    fp.open(rv => {
      if (rv != nsIFilePicker.returnOK || !fp.file) {
        if(prefTP.getArchiveDir()==''){
          prefTP.setAutoArchive('off');
          tpec_org.xtc.tp.preferences.autoarchiveMenu();
        }
        return;
      }
      var thefile = fp.file;
      tpec_org.xtc.tp.preferences.jsdump("AA FOLDER: "+thefile.path);
      prefTP.setArchiveDir(thefile.path);
      document.getElementById('tpecArchiveDir').value = thefile.path;
    });
    
  };

  pub.defaultpecMenu = function(){
    document.getElementById('tpecDefaultPec').value = prefTP.getDefaultPec();
  };
  
  pub.defaultpec = function(){
    var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    var items = prefTP.pecAccounts.split(",");
    for(var i=0;i<items.length;i++){
      if(items[i].length==0){
         items.splice(i, 1);
      }
    }
    var selected = {};
    var result = prompts.select(null, stringBundle.getString('tpec.dp.value'), "", items.length, items, selected);
    if(result){
      tpec_org.xtc.tp.preferences.jsdump("DEFAULT PEC: "+items[selected.value]);
      prefTP.setDefaultPec(items[selected.value]);
      document.getElementById('tpecDefaultPec').value = items[selected.value];
    }    
  }

   pub.znameMenu = function(){
    var receipt = prefTP.getZName();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecZNameSubject");
    var menuB = document.getElementById("tpecZNameTimestamp");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(receipt=="subject")menuC.setAttribute("selected", true);
    if(receipt=="timestamp")menuB.setAttribute("selected", true);
  };

  pub.setZName = function(r){
    prefTP.setZName(r);
  };

  pub.debugMenu = function(){
    var receipt = prefTP.getDebugV();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecDebugYes");
    var menuB = document.getElementById("tpecDebugNo");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(receipt=='on')menuC.setAttribute("selected", true);
    if(receipt=='off')menuB.setAttribute("selected", true);
  };

  pub.setDebug = function(r){
    prefTP.setDebug(r);
  };

  pub.showDefaultButtonMenu = function(){
    var receipt = prefTP.getShowSendButton();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecShowSendButtonYes");
    var menuB = document.getElementById("tpecShowSendButtonNo");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(receipt=='on')menuC.setAttribute("selected", true);
    if(receipt=='off')menuB.setAttribute("selected", true);
  };

  pub.setShowDefaultButton = function(r){
    prefTP.setShowSendButton(r);
  };

  pub.showShareDataMenu = function(){
    var receipt = prefTP.getShareData();
    tpec_org.xtc.tp.preferences.jsdump("PREFERENCES: "+receipt); 
    var menuC = document.getElementById("tpecShareDataButtonYes");
    var menuB = document.getElementById("tpecShareDataButtonNo");
    
    menuC.setAttribute("selected", false);
    menuB.setAttribute("selected", false);
    
    if(receipt=='on')menuC.setAttribute("selected", true);
    if(receipt=='off')menuB.setAttribute("selected", true);
  };

  pub.setShareDataButton = function(r){
    prefTP.setShareData(r);
  };
  
  pub.ok = function(){
    if(prefTP.getAutoArchive()=='on' && prefTP.getArchiveDir()==''){
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      prompts.alert(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.aa.error')); 
    } else {
      window.close();
    }
  }

  return pub;
}();
