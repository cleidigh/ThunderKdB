"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.account) tpec_org.xtc.tp.account = {};


tpec_org.xtc.tp.account = function(){
  function pub(){};
  
  var tpec = "";
  var pecClass = "";
  var pecProvider = "";
  
  var account = "";
  var tpecAccountName = "";
  var tpecRealName = "";
  var tpecAccountEmail = "";
  var incomingType = "";
  var tpecIncomingUser = "";
  var tpecIncomingPwd = "";
  var tpecIncomingServer = "";
  var tpecIncomingPort = "";
  var tpecIncomingSSL = "";
  var tpecOutgoingUser = "";
  var tpecOutgoingPwd = "";
  var tpecOutgoingServer = "";
  var tpecOutgoingPort = "";
  var tpecOutgoing02 = "";
  
  var numExp = /^(\d*)$/;
  var prefTP;

  pub.init = function() {
    pecClass = tpec_org.xtc.tp.provider;
    prefTP = new ThunderPecPrefs();
    prefTP.init();
  };
  
 
  pub.appendElement = function(parentId,nodeName,attribs){
    var elem = document.getElementById(parentId);
    var node = document.createElement(nodeName);
    for (var attrib in attribs) {
      node.setAttribute(attrib, attribs[attrib]);
    } 		
    elem.appendChild(node);
  };

  pub.chooseShow = function() {
    var i;
    var providers = pecClass.getProviders();
    for(var provider in providers){
      this.appendElement('tpecChooseMenu','menuitem',{'label':provider.toUpperCase(),'id':provider});
    }
    document.getElementById('tpecChoose01').setAttribute("style","visibility: hidden");;
  };

  pub.chooseNext = function() {
    var sel = document.getElementById('tpecAccountList').selectedItem;
    if(sel){
      account = sel.label;
      pecClass.selectProvider(account.toLowerCase());
      incomingType = pecClass.getIncomingType();
      tpecIncomingUser = pecClass.getIncomingUser();
      tpecIncomingPwd = pecClass.getIncomingPwd();
      tpecIncomingServer = pecClass.getIncomingServer();
      tpecIncomingPort = pecClass.getIncomingPort();
      tpecIncomingSSL = pecClass.getIncomingSSL();
      tpecOutgoingUser = pecClass.getOutgoingUser();
      tpecOutgoingPwd = pecClass.getOutgoingPwd();
      tpecOutgoingServer = pecClass.getOutgoingServer();
      tpecOutgoingPort = pecClass.getOutgoingPort();
      tpecOutgoing02 = pecClass.getOutgoingSSL();


      var steps = pecClass.getSteps();
      var step = steps.split(",");
      var wizard = document.getElementById('tpecAccountWizard');
      for(var i=1;i<step.length;i++){
        wizard.getPageById(step[i-1]).next = step[i];
      }
      wizard.getPageById("email").next = step[0];


    } else {
      document.getElementById('tpecChoose01').setAttribute("style","visibility: visible");;
      document.getElementById('choose').setAttribute('next','choose');
    } 
    return true;
  };

  pub.nameShow = function() {
    document.getElementById('tpecAccountName').value = account;
    document.getElementById('tpecName01').setAttribute("style","visibility: hidden");;
  };

  pub.nameNext = function() {
    var value = document.getElementById('tpecAccountName').value;
    if(value!=""){
      tpecAccountName = value;
    } else {
      document.getElementById('tpecName01').setAttribute("style","visibility: visible");;
      document.getElementById('name').setAttribute('next','name');
    } 
    return true;
  };

  pub.realnameShow = function() {
    document.getElementById('tpecRealName01').setAttribute("style","visibility: hidden");;
  };

  pub.realnameNext = function() {
    var value = document.getElementById('tpecRealName').value;
    if(value!=""){
      pecClass.setRealName(value);
    } else {
      document.getElementById('tpecRealName01').setAttribute("style","visibility: visible");;
      document.getElementById('realname').setAttribute('next','realname');
    } 
    return true;
  };

  pub.emailShow = function() {
    document.getElementById('tpecEmail01').setAttribute("style","visibility: hidden");;
  };

  pub.emailNext = function() {
    var value = document.getElementById('tpecAccountEmail').value;
    var filter = /^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/;
    if(value!="" && filter.test(value)){
      pecClass.setEmailAddress(value);
    } else {
      document.getElementById('tpecEmail01').setAttribute("style","visibility: visible");;
      document.getElementById('email').setAttribute('next','email');
    } 
    return true;
  };


  pub.typeShow = function() {
    document.getElementById('tpecType01').setAttribute("style","visibility: hidden");
    //ver 1.5.2 start
    //document.getElementById('tpecAccountType') = pecClass.getIncomingType();
    document.getElementById('tpecAccountType').selectedItem = (pecClass.getIncomingType()=="imap"?0:1);
    //ver 1.5.2 stop    
  };

  pub.typeNext = function() {
    var sel = document.getElementById('tpecAccountType').selectedItem;
    if(sel){
      pecClass.setIncomingType(sel.label.toLowerCase());
    } else {
      document.getElementById('tpecType01').setAttribute("style","visibility: visible");;
      document.getElementById('type').setAttribute('next','type');
    } 
    return true;
  };

  pub.inserverShow = function() {
    document.getElementById('tpecIncoming01').setAttribute("style","visibility: hidden");;
    document.getElementById('tpecIncoming02').setAttribute("style","visibility: hidden");;
    document.getElementById('tpecIncomingServer').value = pecClass.getIncomingServer();
    document.getElementById('tpecIncomingPort').value = pecClass.getIncomingPort();
    document.getElementById('tpecIncomingSSL').checked = (pecClass.getIncomingSSL()=="1");
  };

   pub.inserverNext = function() {
    var value01 = document.getElementById('tpecIncomingServer').value;
    var value02 = document.getElementById('tpecIncomingPort').value;
    var value03 = document.getElementById('tpecIncomingSSL').checked;
    if(value01!="" && value02!="" && value02.match(numExp)){
      pecClass.setIncomingServer(value01);
      pecClass.setIncomingPort(value02);
      pecClass.setIncomingSSL((value03?"1":"0"));
    } else {
      if(value01==""){
        document.getElementById('tpecIncoming01').setAttribute("style","visibility: visible");;
      }
      if(value02=="" || !value02.match(numExp)){
        document.getElementById('tpecIncoming02').setAttribute("style","visibility: visible");;
      }
      document.getElementById('inserver').setAttribute('next','inserver');
    } 
    return true;
  };

  pub.inuserShow = function() {
    document.getElementById('tpecInuser01').setAttribute("style","visibility: hidden");;
    document.getElementById('tpecInuser02').setAttribute("style","visibility: hidden");;
    document.getElementById('tpecIncomingUser').value = pecClass.getIncomingUser();
    document.getElementById('tpecIncomingPwd').value = pecClass.getIncomingPwd();
  };

   pub.inuserNext = function() {
    var value01 = document.getElementById('tpecIncomingUser').value;
    var value02 = document.getElementById('tpecIncomingPwd').value;
    if(value01!="" && value02!=""){
      pecClass.setIncomingUser(value01);
      pecClass.setIncomingPwd(value02);
    } else {
      if(value01==""){
        document.getElementById('tpecInuser01').setAttribute("style","visibility: visible");;
      }
      if(value02==""){
        document.getElementById('tpecInuser02').setAttribute("style","visibility: visible");;
      }
      document.getElementById('inuser').setAttribute('next','inuser');
    } 
    return true;
  };

  pub.outserverShow = function() {
    document.getElementById('tpecOutgoing01').setAttribute("style","visibility: hidden");;
    document.getElementById('tpecOutgoing02').setAttribute("style","visibility: hidden");;
    document.getElementById('tpecOutgoingServer').value = pecClass.getOutgoingServer();
    document.getElementById('tpecOutgoingPort').value = pecClass.getOutgoingPort();
    document.getElementById('tpecOutgoing02').checked = (pecClass.getOutgoingSSL()=="1");
  };

  pub.outserverNext = function() {
    var value01 = document.getElementById('tpecOutgoingServer').value;
    var value02 = document.getElementById('tpecOutgoingPort').value;
    var value03 = document.getElementById('tpecOutgoing02').checked;
    if(value01!="" && value02!=""){
      pecClass.setOutgoingServer(value01);
      pecClass.setOutgoingPort(value02);
      pecClass.setOutgoingSSL((value03?"1":"0"));
    } else {
      if(value01==""){
        document.getElementById('tpecOutgoing01').setAttribute("style","visibility: visible");;
      }
      if(value02=="" || !value02.match(numExp)){
        document.getElementById('tpecOutgoing02').setAttribute("style","visibility: visible");;
      }
      document.getElementById('outserver').setAttribute('next','outserver');
    } 
    return true;
  };

  pub.outuserShow = function() {
    document.getElementById('tpecOutuser01').setAttribute("style","visibility: hidden");;
    document.getElementById('tpecOutuser02').setAttribute("style","visibility: hidden");;
    document.getElementById('tpecOutgoingUser').value = pecClass.getOutgoingUser();
    document.getElementById('tpecOutgoingPwd').value = pecClass.getOutgoingPwd();
  };

   pub.outuserNext = function() {
    var value01 = document.getElementById('tpecOutgoingUser').value;
    var value02 = document.getElementById('tpecOutgoingPwd').value;
    if(value01!="" && value02!=""){
      pecClass.setOutgoingUser(value01);
      pecClass.setOutgoingPwd(value02);
    } else {
      if(value01==""){
        document.getElementById('tpecOutuser01').setAttribute("style","visibility: visible");;
      }
      if(value02==""){
        document.getElementById('tpecOutuser02').setAttribute("style","visibility: visible");;
      }
      document.getElementById('inuser').setAttribute('next','inuser');
    } 
    return true;
  };

  pub.lastShow = function() {
  };

  pub.lastNext = function() {
    var account = new AccountConfig();
    account.incoming.type = pecClass.getIncomingType()
    account.incoming.hostname = pecClass.getIncomingServer();
    account.incoming.port = pecClass.getIncomingPort();
    account.incoming.username = pecClass.getIncomingUser();
    account.incoming.password = pecClass.getIncomingPwd();
    if(pecClass.getIncomingSSL()=="1"){
      account.incoming.socketType = 2;  
    } else if(pecClass.getIncomingSSL()=="3"){
      account.incoming.socketType = 3;  
    } else {
      account.incoming.socketType = 1;  
    }
    //account.incoming.socketType = (pecClass.getIncomingSSL()=="1"?2:1);
    account.incoming.auth = 3;
    account.outgoing.hostname = pecClass.getOutgoingServer();
    account.outgoing.port = pecClass.getOutgoingPort();
    account.outgoing.username = pecClass.getOutgoingUser();
    account.outgoing.password = pecClass.getOutgoingPwd();
    if(pecClass.getOutgoingSSL()=="1"){
      account.outgoing.socketType = 2;  
    } else if(pecClass.getOutgoingSSL()=="3"){
      account.outgoing.socketType = 3;  
    } else {
      account.outgoing.socketType = 1;  
    }
    //account.outgoing.socketType = (pecClass.getOutgoingSSL()=="1"?2:1);
    account.outgoing.auth = 3;
    account.rememberPassword = true;
    account.identity.realname = pecClass.getRealName();
    account.identity.emailAddress = pecClass.getEmailAddress();
    
    createAccountInBackend(account);

    pecClass.setIncomingUser("");
    pecClass.setIncomingPwd("");
    pecClass.setOutgoingUser("");
    pecClass.setOutgoingPwd("");
    
    prefTP.addAccount(account.identity.emailAddress);
    
    
    
    return true;
  };
   
  return pub;
}();
