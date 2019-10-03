"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.provider) tpec_org.xtc.tp.provider = {};

tpec_org.xtc.tp.provider = function(){
  function pub(){};
  
  var account;
  var settings;
  var tpecRealName;
  var emailAddress;
  
  var typeOfIncoming = new Array("imap","pop3");
  
  var pecProviders = {
    "aruba":{
      "type":"imap",
      "tpecIncomingServer":"imaps.pec.aruba.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"smtps.pec.aruba.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "actalis":{
      "type":"imap",
      "tpecIncomingServer":"imap.pec.actalis.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"smtp.pec.actalis.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "legalmail":{
      "type":"imap",
      "tpecIncomingServer":"mbox.cert.legalmail.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"sendm.cert.legalmail.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "poste":{
      "type":"imap",
      "tpecIncomingServer":"mail.postecert.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"mail.postecert.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "telecomitalia":{
      "type":"imap",
      "tpecIncomingServer":"mail.telecompost.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"smtp.telecompost.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "vodafone":{
      "type":"imap",
      "tpecIncomingServer":"imap.postacert.vodafone.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"postacert.vodafone.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "postacertificat@":{
      "type":"imap",
      "tpecIncomingServer":"mail.postacertificata.gov.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"mail.postacertificata.gov.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "sicurezzapostale":{
      "type":"imap",
      "tpecIncomingServer":"imaps.sicurezzapostale.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"smtps.sicurezzapostale.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "register":{
      "type":"imap",
      "tpecIncomingServer":"server.pec-email.com",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"server.pec-email.com",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "libero":{
      "type":"imap",
      "tpecIncomingServer":"mail.postacert.it.net",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"mail.postacert.it.net",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "pec.istruzione.it":{
      "type":"imap",
      "tpecIncomingServer":"imap.pec.istruzione.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"smtp.pec.istruzione.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "pec.notariato.it":{
      "type":"imap",
      "tpecIncomingServer":"imap.pec.notariato.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"smtp.pec.notariato.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "postacertificata.notariato.it":{
      "type":"imap",
      "tpecIncomingServer":"imap.postacertificata.notariato.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"smtp.postacertificata.notariato.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "basilicatanet":{
      "type":"imap",
      "tpecIncomingServer":"imaps.pec.basilicatanet.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"smtps.pec.basilicatanet.it",
      "tpecOutgoingPort":"465",
      "tpecOutgoing02":"1",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
/*      
    "keypec.com":{
      "type":"imap",
      "tpecIncomingServer":"imap.kpnqwest.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"pec.kpnqwest.it",
      "tpecOutgoingPort":"25",
      "tpecOutgoing02":"3",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
    "kmailer.it":{
      "type":"imap",
      "tpecIncomingServer":"imap.kpnqwest.it",
      "tpecIncomingPort":"993",
      "tpecIncomingSSL":"1",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"pec.kpnqwest.it",
      "tpecOutgoingPort":"25",
      "tpecOutgoing02":"3",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      },
*/
    "altro":{
      "type":"",
      "tpecIncomingServer":"",
      "tpecIncomingPort":"",
      "tpecIncomingSSL":"",
      "tpecIncomingUser":"",
      "tpecIncomingPwd":"",
      "tpecOutgoingServer":"",
      "tpecOutgoingPort":"",
      "tpecOutgoing02":"",
      "tpecOutgoingUser":"",
      "tpecOutgoingPwd":""
      }
  };

  var steps = {
    "aruba":"incredential,last",
    "actalis":"incredential,last",
    "legalmail":"incredential,last",
    "poste":"incredential,last",
    "telecomitalia":"incredential,last",
    "vodafone":"incredential,last",
    "postacertificat@":"incredential,last",
    "sicurezzapostale":"incredential,last",
    "keypec.com":"incredential,last",
    "kmailer.it":"incredential,last",
    "register":"incredential,last",
    "libero":"incredential,last",
    "pec.istruzione.it":"incredential,last",
    "pec.notariato.it":"incredential,last",
    "postacertificata.notariato.it":"incredential,last",
    "basilicatanet":"incredential,last",
    "altro":"type,incoming,incredential,outgoing,outcredential,last"
  };

  pub.getProviders = function(){
    return pecProviders;
  }

  pub.selectProvider = function(p){
    account = p;
    settings = pecProviders[p];
  }
  
  pub.getSteps = function(){
    return steps[account];
  }

//  getters

  pub.getRealName = function(){
    return tpecRealName;
  }
  pub.getEmailAddress = function(){
    return emailAddress;
  }
  pub.getIncomingType = function(){
    return settings["type"];
  }
  pub.getIncomingUser = function(){
    return settings["tpecIncomingUser"];
  }
  pub.getIncomingPwd = function(){
    return settings["tpecIncomingPwd"];
  }
  pub.getIncomingServer = function(){
    return settings["tpecIncomingServer"];
  }
  pub.getIncomingPort = function(){
    return settings["tpecIncomingPort"];
  }
  pub.getIncomingSSL = function(){
    return settings["tpecIncomingSSL"];
  }
  pub.getOutgoingUser = function(){
    return settings["tpecOutgoingUser"];
  }
  pub.getOutgoingPwd = function(){
    return settings["tpecOutgoingPwd"];
  }
  pub.getOutgoingServer = function(){
    return settings["tpecOutgoingServer"];
  }
  pub.getOutgoingPort = function(){
    return settings["tpecOutgoingPort"];
  }
  pub.getOutgoingSSL = function(){
    return settings["tpecOutgoing02"];
  }

//setters
  pub.setRealName = function(s){
    tpecRealName = s;
  }
  pub.setEmailAddress = function(s){
    emailAddress = s;
    if(account=="aruba" || account=="actalis" ||account=="poste" || account=="postacertificat@" || account=="sicurezzapostale" || account=="keypec.com" || account=="kmailer.it" || account=="register" || account=="libero"){
      settings["tpecIncomingUser"] = s;
      settings["tpecOutgoingUser"] = s;
    }
    if(account=="pec.istruzione.it" || account=="pec.notariato.it" ||account=="postacertificata.notariato.it" ){
      settings["tpecIncomingUser"] = s;
      settings["tpecOutgoingUser"] = s;
    }
    if(account=="basilicatanet" ){
      settings["tpecIncomingUser"] = s;
      settings["tpecOutgoingUser"] = s;
    }
  }
  pub.setIncomingType = function(s){
    settings["type"] = s;
  }
  pub.setIncomingUser = function(s){
    settings["tpecIncomingUser"] = s;
    settings["tpecOutgoingUser"] = s;
  }
  pub.setIncomingPwd = function(s){
    settings["tpecIncomingPwd"] = s;
    settings["tpecOutgoingPwd"] = s;
  }
  pub.setIncomingServer = function(s){
    settings["tpecIncomingServer"] = s;
  }
  pub.setIncomingPort = function(s){
    settings["tpecIncomingPort"] = s;
  }
  pub.setIncomingSSL = function(s){
    settings["tpecIncomingSSL"] = s;
  }
  pub.setOutgoingUser = function(s){
    settings["tpecOutgoingUser"] = s;
  }
  pub.setOutgoingPwd = function(s){
    settings["tpecOutgoingPwd"] = s;
  }
  pub.setOutgoingServer = function(s){
    settings["tpecOutgoingServer"] = s;
  }
  pub.setOutgoingPort = function(s){
    settings["tpecOutgoingPort"] = s;
  }
  pub.setOutgoingSSL = function(s){
    settings["tpecOutgoing02"] = s;
  }

  return pub;
}();
  
