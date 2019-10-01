var autozoomer = {

  read_prefs_and_listen: function(){
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                    .getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.autozoomer.");
    
    this.disp_zoom=prefs.getIntPref("displayzoom");
    this.comp_zoom=prefs.getIntPref("composerzoom");

    window.addEventListener("load", function zoomerloaddisp(event){
      window.removeEventListener("load", zoomerloaddisp, false);
      autozoomer.init(true);
    },false);
    
    window.addEventListener("compose-window-init", function zoomerloadcomp(){
      window.removeEventListener("compose-window-init", zoomerloadcomp, true);
      autozoomer.init(false);
    }, true);
  },

  //log_console: function(message) {
  //  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
  //                      .getService(Components.interfaces.nsIConsoleService);
  //  consoleService.logStringMessage(message);
  //},  

  init: function(mess_wnd){
    var messagepane=null;
    var composer=null;
    var i=0;
    
    if(mess_wnd){
      messagepane = document.getElementById("messagepane");
      if(messagepane){
        //autozoomer.log_console("messagepane");
        messagepane.addEventListener("load", function zoomerfirstdisplay(event){
          messagepane.removeEventListener("load", zoomerfirstdisplay, true);
          for(i=0;i<autozoomer.disp_zoom;i++){
            goDoCommand("cmd_fullZoomEnlarge");
          }
        }, true);
      }
    }else{
      composer=document.getElementById("msgcomposeWindow");
      if(composer){
        //autozoomer.log_console("composer");
        composer.addEventListener("load", function zoomerfirstcomp(event){
          composer.removeEventListener("load", zoomerfirstcomp, true);
          for(i=0;i<autozoomer.comp_zoom;i++){
            goDoCommand("cmd_fullZoomEnlarge");
          }
        }, true);
      }
    }
  }
};

autozoomer.read_prefs_and_listen();
