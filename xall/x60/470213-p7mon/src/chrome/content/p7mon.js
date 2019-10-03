if(!org) var org = {};
if(!org.xtc) org.xtc = {};
if(!org.xtc.p7mon) org.xtc.p7mon = {};

org.xtc.p7mon = function(){
  
  function pub(){};
  
  pub.init = function() {
    var prefsTP = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefService);
    
    var p7mPref;

    try {
      p7mPref = prefsTP.getBoolPref("mailnews.p7m_external");
    } catch (e){
      prefsTP.setBoolPref("mailnews.p7m_external", true);
      prefService.savePrefFile(null);
    }
  };
  
  pub.p7mMenu = function(){
    var prefsTP = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
    var p7m = prefsTP.getBoolPref("mailnews.p7m_external");
    
    var menuC = document.getElementById("P7M_On");
    var menuB = document.getElementById("P7M_Off");
    
    menuC.setAttribute("checked", false);
    menuB.setAttribute("checked", false);
    
    if(p7m==true)menuC.setAttribute("checked", true);
    if(p7m==false)menuB.setAttribute("checked", true);
  };

  pub.setP7MStatus = function(r){
    var prefsTP = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
    var prefService = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefService);
    
    prefsTP.setBoolPref("mailnews.p7m_external", r);
    prefService.savePrefFile(null);
  };
  
  
  return pub;
}();
