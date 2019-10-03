"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.help) tpec_org.xtc.tp.help = {};


tpec_org.xtc.tp.help = function(){
  function pub(){};


  pub.init = function(){
    var m = document.getElementById("tpecHelpML");
    m.selectedIndex = 0;
    document.getElementById('tpecHelpViewer').setAttribute('src', "help/intro.html");
  }

  pub.changepage = function(){
    var m = document.getElementById("tpecHelpML");
    var ml = m.selectedItem;
    if (ml!=null) {
      document.getElementById('tpecHelpViewer').setAttribute('src', ml.value);
    }
  }

  pub.ok = function(){
    window.close();
  }

  return pub;
}();
