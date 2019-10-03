"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.ppecqr) tpec_org.xtc.tp.ppecqr = {};


tpec_org.xtc.tp.ppecqr = function(){
  function pub(){};

  var prefTP = null;
  var pec;

  var discover ={
    "aruba.it":"01",
    "actalis.it":"02",
    "legalmail.it":"03",
    "postecert.it":"04",
    "telecompost.it":"05",
    "vodafone.it":"06",
    "gov.it":"07",
    "sicurezzapostale.it":"08",
    "pec-email.it":"10",
    "postacert.it.net":"11",

    "pec.istruzione.it":"15",
    "pec.notariato.it":"14",
    "postacertificata.notariato.it":"13",
    
    "basilicatanet.it":"16",
    
  };

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

    if("arguments" in window && window.arguments.length > 0) {
      pec = window.arguments[0].address;
      tpec_org.xtc.tp.ppecqr.jsdump("QR PEC: "+pec);
    }

    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager); 
    var accounts = acctMgr.accounts;  
    var tpecAccountList = document.getElementById('tpecAccountListPopup');
    var accNum = (accounts.Count?accounts.Count():accounts.length);
    var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
    var idx = -1;
    var jdx = -1
    for (var i = 0; i < accNum; i++) {  
      var account = query(i, Components.interfaces.nsIMsgAccount);
      if(account.defaultIdentity && prefTP.check(account.defaultIdentity.email)){
        idx++;
        var tempItem = document.createElement("menuitem");
        tempItem.setAttribute("label", account.defaultIdentity.email);
        tempItem.setAttribute("value",account.defaultIdentity.email);
        tpecAccountList.appendChild(tempItem);
        if(account.defaultIdentity.email==pec)jdx = idx;
        tpec_org.xtc.tp.ppecqr.jsdump("QR: "+idx+" "+account.defaultIdentity.email);
      }
    }
    tpec_org.xtc.tp.ppecqr.jsdump("QR INDEX: "+jdx);
    document.getElementById('tpecAccountList').selectedIndex = jdx;
    //document.getElementById('tpecAccountList').value = pec;
    //document.getElementById('tpecSamePwd').setAttribute('checked',true);
    //document.getElementById('tpecOutgoingPwd').setAttribute("disabled", true);
    
  }

  pub.cancel = function(){
    window.close();
    }

  pub.ok = function(){
  
    var acc =  document.getElementById('tpecAccountList').value;
    var pwd = document.getElementById('tpecIncomingPwd').value;

    var stringBundle = document.getElementById("tpecStringBundle");
    
    if(acc.length==0){
      alert(stringBundle.getString('tpec.ppecqr.emptyaccount'));
      return;
    }
    if(pwd.length==0){
      alert(stringBundle.getString('tpec.ppecqr.emptypwd'));
      return;
    }

    var textData = "";
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager); 
    var accounts = acctMgr.accounts;  
    var accNum = (accounts.Count?accounts.Count():accounts.length);
    var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
    for (var i = 0; i < accNum; i++) {  
      var account = query(i, Components.interfaces.nsIMsgAccount);
      if(account.defaultIdentity){
        if(acc==account.defaultIdentity.email) {
          textData += "00="+account.incomingServer.prettyName+";;";
          textData += "01="+account.defaultIdentity.fullName+";;";
          if(account.incomingServer.username!=account.defaultIdentity.email){
            textData += "02="+account.incomingServer.username+";;";
          }
          var srv = "00";
          var suffix;
          var hostn = account.incomingServer.realHostName;
          tpec_org.xtc.tp.ppecqr.jsdump("Hostname: "+hostn);
          for(var k in discover){
            if(hostn.indexOf(k,hostn.length-k.length)!==-1){
              srv =  discover[k];
            }
          }
          textData += "05="+srv+";;";
        
        }
      }
    }
    textData += "03="+acc+";;";
    textData += "04="+pwd+";;";
    
    
    tpec_org.xtc.tp.ppecqr.jsdump("textData: "+textData);
    
    var qr = new JSQR();

    var code = new qr.Code();
    code.encodeMode = code.ENCODE_MODE.UTF8_SIGNATURE;
    code.version = code.DEFAULT;
    code.errorCorrection = code.ERROR_CORRECTION.H;
    
    var input = new qr.Input();
    input.dataType = input.DATA_TYPE.TEXT;
    input.data = {
         "text": textData
    };
    
    var matrix = new qr.Matrix(input, code);
    
    var canvas = document.getElementById('tpecPPECQRCanvas');
    canvas.setAttribute('width', matrix.pixelWidth);
    canvas.setAttribute('height', matrix.pixelWidth);
    canvas.getContext('2d').fillStyle = 'rgb(0,0,0)';
    matrix.draw(canvas, 0, 0);
  }
  
  //pub.changeSame = function(){
  //  tpec_org.xtc.tp.ppecqr.jsdump("cc"+document.getElementById('tpecSamePwd').checked);
  //}


  return pub;
}();
