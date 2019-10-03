Components.utils.import("chrome://thunderpec/content/globalsTP.jsm");

function ThunderPecPrefs(){
  this.prefsTP = null;
  this.prefService = null;
  this.pecAccounts = "";
  this.pecReceipt = "";
  this.p7m = "";
  this.bug243833 = false;
  this.debug = "";
  this.pecArray = null;
  this.version ="1.9.1";
  
  this.wn = false;
  
  this.onlyeml = "";
  this.zname = "";
  this.peccol = "";

  this.autoarchive = "";
  this.archivedir = "";
  
  this.defaultpec = "";
  
  this.showsendbutton = "";
  
  this.registered = false;
  
  this.depReceipt = "";
  
  this.sharedata = "";
  
  this.closeonsave = "";
  
  this.init = function() {
    this.prefsTP = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefBranch);
    this.prefService = Components.classes["@mozilla.org/preferences-service;1"].
                        getService(Components.interfaces.nsIPrefService);

    //ThunderPecSql.onLoad();

    try {
      this.pecAccounts = this.prefsTP.getCharPref("thunderpec.accounts");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.accounts","");
      this.prefService.savePrefFile(null);

    }
    try {
      this.pecReceipt = this.prefsTP.getCharPref("thunderpec.receipt");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.receipt","completa");
      this.pecReceipt = "completa";
      this.prefService.savePrefFile(null);

    }

    try {
      this.p7m = this.prefsTP.getCharPref("thunderpec.p7m");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.p7m","on");
      this.p7m = "on";
      this.prefService.savePrefFile(null);

    }

    //v165 start
    try {
      this.onlyeml = this.prefsTP.getCharPref("thunderpec.onlyeml");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.onlyeml","on");
      this.onlyeml = "on";
      this.prefService.savePrefFile(null);

    }

    try {
      this.zname = this.prefsTP.getCharPref("thunderpec.zname");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.zname","subject");
      this.zname = "subject";
      this.prefService.savePrefFile(null);

    }

    //v165 end
    //v170 start
    try {
      this.peccol = this.prefsTP.getCharPref("thunderpec.peccol");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.peccol","off");
      this.peccol = "off";
      this.prefService.savePrefFile(null);

    }
    //v170 end
    //v170pre4 start
    try {
      this.autoarchive = this.prefsTP.getCharPref("thunderpec.autoarchive");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.autoarchive","off");
      this.autoarchive = "off";
      this.prefService.savePrefFile(null);

    }
    try {
      this.archivedir = this.prefsTP.getCharPref("thunderpec.archivedir");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.archivedir","");
      this.archivedir = "";
      this.prefService.savePrefFile(null);

    }
    //v170pre4 end
    try {
      this.bug243833 = this.prefsTP.getBoolPref("mailnews.p7m_external");
    } catch (e){
       if(this.p7m=="on"){
        this.prefsTP.setBoolPref("mailnews.p7m_external", true);
        this.bug243833 = true;
      } else {
        this.prefsTP.setBoolPref("mailnews.p7m_external", false);
        this.bug243833 = false;
      }
      this.prefService.savePrefFile(null);
    }

    //v171pre1 start
    try {
      this.showsendbutton = this.prefsTP.getCharPref("thunderpec.showsendbutton");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.showsendbutton","on");
      this.showsendbutton = "on";
      this.prefService.savePrefFile(null);

    }
    //v171pre1 stop

    try {
      this.debug = this.prefsTP.getCharPref("thunderpec.debug");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.debug","off");
      this.debug = "off";
      this.prefService.savePrefFile(null);

    }
    
    if(this.debug=="on" && !tpecConsoleListener.registered){
      var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
      consoleService.registerListener(tpecConsoleListener); 
      tpecConsoleListener.registered = true;
    }
    
    //v175pre1 strat
    try {
      this.depReceipt = this.prefsTP.getCharPref("thunderpec.depreceipt");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.depreceipt","completa");
      this.depReceipt = "completa";
      this.prefService.savePrefFile(null);

    }
    //v175pre1 stop

    //v180 start
    try {
      this.closeonsave = this.prefsTP.getCharPref("thunderpec.closeonsave");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.closeonsave","on");
      this.closeonsave = "on";
      this.prefService.savePrefFile(null);

    }
    //v180 stop
    //v190 start
    try {
      this.sharedata = this.prefsTP.getCharPref("thunderpec.sharedata");
    } catch (e){
      this.prefsTP.setCharPref("thunderpec.sharedata","on");
      this.sharedata = "on";
      this.prefService.savePrefFile(null);

    }
    //v190 stop

    var previousVersion;
    try {
      previousVersion = this.prefsTP.getCharPref("thunderpec.version");
    } catch (e){
      previousVersion = "";
      this.prefsTP.setCharPref("thunderpec.version",this.version);
      this.prefService.savePrefFile(null);
    }
    
    if(previousVersion!=this.version){
      //v173pre2 start
      //this.showUpdate();
      this.wn = true;
      //v173pre2.stop
      this.prefsTP.setCharPref("thunderpec.version",this.version);
      this.prefService.savePrefFile(null);
    }
    
    this.pecArray = this.pecAccounts.split(",");
    //v170pre5 start
    try {
      this.defaultpec = this.prefsTP.getCharPref("thunderpec.defaultpec");
    } catch (e){
      if(this.pecArray.length==1){
        this.prefsTP.setCharPref("thunderpec.defaultpec",this.pecArray[0]);
        this.defaultpec = this.pecArray[0];
        this.prefService.savePrefFile(null);
      } else {
        this.prefsTP.setCharPref("thunderpec.defaultpec","");
        this.defaultpec = "";
        this.prefService.savePrefFile(null);
      }

    }
    //v170pre5 end
  }
  
  this.exists = function(m){
    if(this.pecArray)
      for (var i=0; i<this.pecArray.length; i++)
        if (this.pecArray[i] == m) return true;
    return false;
  }

  this.check = function(m){
    if(this.pecArray)
      for (var i=0; i<this.pecArray.length; i++)
        if ((this.pecArray[i]!="") && (m.toLowerCase().indexOf(this.pecArray[i].toLowerCase(),0)!=-1)) return true;
    return false;
  }

  this.reread = function() {
    this.pecAccounts = this.prefsTP.getCharPref("thunderpec.accounts");
    this.pecArray = this.pecAccounts.split(",");
    this.pecReceipt = this.prefsTP.getCharPref("thunderpec.receipt");
    this.p7m = this.prefsTP.getCharPref("thunderpec.p7m");
    this.onlyeml = this.prefsTP.getCharPref("thunderpec.onlyeml");
    this.zname = this.prefsTP.getCharPref("thunderpec.zname");
    this.bug243833 = this.prefsTP.getBoolPref("mailnews.p7m_external");
    this.debug = this.prefsTP.getCharPref("thunderpec.debug");
    this.peccol = this.prefsTP.getCharPref("thunderpec.peccol");
    this.autoarchive = this.prefsTP.getCharPref("thunderpec.autoarchive");
    this.archivedir = this.prefsTP.getCharPref("thunderpec.archivedir");
    this.defaultpec = this.prefsTP.getCharPref("thunderpec.defaultpec");
    this.depReceipt = this.prefsTP.getCharPref("thunderpec.depreceipt");
    this.sharedata = this.prefsTP.getCharPref("thunderpec.sharedata");
    this.closeonsave = this.prefsTP.getCharPref("thunderpec.closeonsave");
  }

  this.clear = function() {
    this.pecAccounts = "";
    this.pecArray = Array();
    this.prefsTP.setCharPref("thunderpec.accounts",this.pecAccounts);
    this.prefService.savePrefFile(null);
  }

  
  this.getAccounts = function(){
    return this.pecAccounts;
  }
  
  this.addAccount = function(a){
    if(!this.exists(a)){
      this.pecArray.push(a);
      this.pecAccounts = this.pecArray.join(",");
      this.prefsTP.setCharPref("thunderpec.accounts",this.pecAccounts);
      this.prefService.savePrefFile(null);
      }
  }
  this.removeAccount = function(a){
    if(this.exists(a)){
      var idx =  this.pecArray.indexOf(a);
      this.pecArray.splice(idx,1);
      this.pecAccounts = this.pecArray.join(",");
      this.prefsTP.setCharPref("thunderpec.accounts",this.pecAccounts);
      this.prefService.savePrefFile(null);
      }
  }

  this.getReceipt = function(){
    return this.pecReceipt;
  }

  this.setReceipt = function(r){
    this.prefsTP.setCharPref("thunderpec.receipt",r);
    this.prefService.savePrefFile(null);
    this.pecReceipt = r;
  }

  //175pre1 start
  this.getDepReceipt = function(){
    return this.depReceipt;
  }

  this.setDepReceipt = function(r){
    this.prefsTP.setCharPref("thunderpec.depreceipt",r);
    this.prefService.savePrefFile(null);
    this.depReceipt = r;
  }
  //175pre1 start

  //v170 start 
  this.getPecCol = function(){
    return this.peccol;
  }

  this.setPecCol = function(r){
    this.prefsTP.setCharPref("thunderpec.peccol",r);
    this.prefService.savePrefFile(null);
    this.peccol = r;
  }
  //v170 end
  //v170pre4 start 
  this.getAutoArchive = function(){
    return this.autoarchive;
  }

  this.setAutoArchive = function(r){
    this.prefsTP.setCharPref("thunderpec.autoarchive",r);
    this.prefService.savePrefFile(null);
    this.autoarchive = r;
  }
  this.getArchiveDir = function(){
    return this.archivedir;
  }

  this.setArchiveDir = function(r){
    this.prefsTP.setCharPref("thunderpec.archivedir",r);
    this.prefService.savePrefFile(null);
    this.archivedir = r;
  }
  //v170pre4 end 
  //v170pre5 start 
  this.getDefaultPec = function(){
    return this.defaultpec;
  }

  this.setDefaultPec = function(r){
    this.prefsTP.setCharPref("thunderpec.defaultpec",r);
    this.prefService.savePrefFile(null);
    this.defaultpec = r;
  }
  //v170pre5 end 

  //v165 start 
  this.getOnlyEML = function(){
    return this.onlyeml;
  }

  this.setOnlyEML = function(r){
    this.prefsTP.setCharPref("thunderpec.onlyeml",r);
    this.prefService.savePrefFile(null);
    this.onlyeml = r;
  }


  this.getZName = function(){
    return this.zname;
  }

  this.setZName = function(r){
    this.prefsTP.setCharPref("thunderpec.zname",r);
    this.prefService.savePrefFile(null);
    this.zname = r;
  }

  this.getDebugV = function(){
    return this.debug;
  }

  this.setDebug = function(r){
    this.prefsTP.setCharPref("thunderpec.debug",r);
    this.prefService.savePrefFile(null);
    this.debug = r;
    var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    if(this.debug=="on"){
      if(!tpecConsoleListener.registered)consoleService.registerListener(tpecConsoleListener); 
      tpecConsoleListener.registered = true;
    } else {
      if(tpecConsoleListener.registered)consoleService.unregisterListener(tpecConsoleListener); 
      tpecConsoleListener.registered = false;
    }
  }

  //v165 end
  
  //v171pre1 start
  this.getShowSendButton = function(){
    return this.showsendbutton;
  }
  this.setShowSendButton = function(r){
    this.prefsTP.setCharPref("thunderpec.showsendbutton",r);
    this.prefService.savePrefFile(null);
    this.showsendbutton = r;
  }
  //v171pre1 stop

  //v180 start 
  this.getShareData = function(){
    return this.sharedata;
  }

  this.setShareData = function(r){
    this.prefsTP.setCharPref("thunderpec.sharedata",r);
    this.prefService.savePrefFile(null);
    this.sharedata = r;
  }
  //v180 start 
  //v190 start 
  this.getCloseOnSave = function(){
    return this.closeonsave;
  }

  this.setCloseOnSave = function(r){
    this.prefsTP.setCharPref("thunderpec.closeonsave",r);
    this.prefService.savePrefFile(null);
    this.closeonsave = r;
  }
  //v190 start 
  
  this.getP7M = function(){
    return this.p7m;
  }

  this.setP7M = function(r){
    this.prefsTP.setCharPref("thunderpec.p7m",r);
    this.prefService.savePrefFile(null);
    this.p7m = r;
    if(r=="on"){
      this.prefsTP.setBoolPref("mailnews.p7m_external", true);
      this.bug243833 = true;
    } else {
      this.prefsTP.setBoolPref("mailnews.p7m_external", false);
      this.bug243833 = false;
    }
    this.prefService.savePrefFile(null);
  }

  this.getDebug = function(){
    return this.debug=="on";
  }

  this.getVersion = function(){
    return this.version;
  }

  this.showUpdate = function(){
    
    var url = "http://www.pocketpec.it/thunderbird/?c=cronologia130";
    var tabmail = document.getElementById("tabmail");
    if (!tabmail) {
      // Try opening new tabs in an existing 3pane window
      var mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                                      .getService(Components.interfaces.nsIWindowMediator)
                                      .getMostRecentWindow("mail:3pane");
      if (mail3PaneWindow) {
        tabmail = mail3PaneWindow.document.getElementById("tabmail");
        mail3PaneWindow.focus();
      }
    }
    
    if (tabmail)
      tabmail.openTab("contentTab", {contentPage: url});
    else
      window.openDialog("chrome://messenger/content/", "_blank",
                        "chrome,dialog=no,all", null,
                        { tabType: "contentTab",
                          tabParams: {contentPage: url} }); 
  }
  
  this.log = function(t,s){
      var tmpfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      
      if(t!=tpecConsoleListener.tmpDir)tpecConsoleListener.tmpDir = t;
      
      tmpfile.initWithPath(t);
      tmpfile.append("tpec_log.txt");
      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                               createInstance(Components.interfaces.nsIFileOutputStream);
      foStream.init(tmpfile, 0x02 | 0x08 | 0x10, parseInt("0600",8), 0); 
      foStream.write(s,s.length);
      foStream.close();
  }
  
}
