"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.about) tpec_org.xtc.tp.about = {};


tpec_org.xtc.tp.about = function(){
  function pub(){};
  
  var prefTP;

  pub.init = function(){
    prefTP = new ThunderPecPrefs();
    prefTP.init();
    var ver = document.getElementById("tpecVersion");
    ver.value = prefTP.getVersion();
  }


  pub.ok = function(){
    window.close();
  }

  return pub;
}();
