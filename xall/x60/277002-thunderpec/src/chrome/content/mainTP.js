"use strict";

Components.utils.import("chrome://thunderpec/content/globalsTP.jsm");
Components.utils.import("chrome://thunderpec/content/xmlParserTP.jsm");
Components.utils.import("chrome://thunderpec/content/modules/tpecdata.js");

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource:///modules/mailServices.js");

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};

//Components.utils.import("resource:///modules/searchSpec.js");
//Components.utils.import("resource:///modules/quickFilterManager.js");


tpec_org.xtc.tp = function(){
  
  function pub(){};

  const MSG_FLAG_PARTIAL = 0x400;

  var hiddenTPWindow = null;
  var hiddenHdr = null;
  var hiddenURL = null;
  var isPEC = false;
  var hasP7MBug = false;
  var loadingPEC = false;
  var signedValue = "";
  var hiddenSignerCert = null;
  var hiddenEncryptionCert = null;
  var hiddenSignatureStatus = null;
  var hiddenEncryptionStatus = null;
  var hiddenNotificationBar = null;
  var hiddenNBIndex = 0;
  var smimeHdr = null;
  var tpecCS = null;
  var tpecCT = null;
  var hiddenOP = 0;
  var enableTP = false;
  var prefTP = null;
  var tmpDirFile = null;
  var tmpDir = "";
  var removeReply = false;
  var latestEvent = null;
  var needRedirect = false;
  var hFeatures = "chrome,dialog=no,status=no,toolbar=no,width=100,height=0";
  
  var utility;
  var tpRemoteContent = false;
  
  var hasEsitoXML = false;
  var hasFatturaXML = false;
  
  var stringBundle;
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);  
  
  var pecs = null;
  var pecsIDX = 0;
  
  var extractCount = 0;
  var extractIDX = 0;
  var extractMessages = null;
  var extractArray = null;
  var extractPath = null;
  var extractInline = false;
  
  var synctimer = null;
  var firstinterval = 5;
  var syncinterval = 30;
  var sharedb = {
    notify : function(timer){
      tpec_org.xtc.tp.jsdump("Calling SYNC Timer "+Date());

      synctimer.delay = syncinterval*60*1000;
      
      var aDBConnection = ThunderPecSql.dbConnection; 
      var eestmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pecdata WHERE sync=0;");
      eestmt.executeAsync({
        records:[],
        handleResult: function(aResultSet) {
          for (let row = aResultSet.getNextRow();row;row = aResultSet.getNextRow()) {
              let record = {};
              record["p"] = row.getResultByName("pec"); 
              record["s"] = row.getResultByName("status"); 
              record["c"] = row.getResultByName("created")/1000; 
              record["m"] = row.getResultByName("modified")/1000; 
              this.records.push(record);
          }
        },
        handleError: function(aError) {tpecGlobals.jsdump("DB SYNC ERROR 0x100");},
        handleCompletion: function(aReason) {
          if(this.records.length>0){
            tpec_org.xtc.tp.jsdump("SYNC Data "+JSON.stringify(this.records));
            try {  
              var http = new XMLHttpRequest();
              var url = "https://data.pocketpec.it/tpec/sharedb.php";
              var params = "j="+JSON.stringify(this.records);
              http.open("POST", url, true);
              
              //Send the proper header information along with the request
              http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
              
              http.onreadystatechange = function() {//Call a function when the state changes.
                  if(http.readyState == 4 && http.status == 200) {
                      if(http.responseText.indexOf("OK:")==0){
                        let response = JSON.parse(http.responseText.slice(3));
                        for(var key in response){
                          tpec_org.xtc.tp.jsdump("SHAREDB "+key+" "+response[key]);
                          if(response[key]=="u"){
                            var query = "UPDATE pecdata SET sync=1 WHERE pec LIKE :pec;"
                            var ustmt = ThunderPecSql.dbConnection.createStatement(query); 
                            ustmt.params.pec = key;
                            ustmt.executeAsync(null);
                            ustmt.finalize();
                          } else if(response[key]=="d"){
                            var query = "DELETE FROM pecdata WHERE pec LIKE :pec;"
                            var ustmt = ThunderPecSql.dbConnection.createStatement(query); 
                            ustmt.params.pec = key;
                            ustmt.executeAsync(null);
                            ustmt.finalize();
                          }
                        }
                      }
                  }
              }
              http.send(params); 
              tpec_org.xtc.tp.jsdump("SHAREDB CALL SERVER");  
             } catch(e){
              tpec_org.xtc.tp.jsdump("SHAREDB CALL SERVER FAIL "+e);
             } 
          }
        }
       });
       eestmt.finalize();
    }
  };


  
  pub.jsdump = function(str){
    if(prefTP.getDebug()){
      Components.classes['@mozilla.org/consoleservice;1']
                .getService(Components.interfaces.nsIConsoleService)
                .logStringMessage("ThunderPEC: "+str);
      prefTP.log(tmpDir,"mainTP: "+str+"\n");
      }
  };

  pub.init = function() {
    
    ThunderPecSql.onLoad();
    
    prefTP = new ThunderPecPrefs();
    prefTP.init();
    
    stringBundle = document.getElementById("tpecStringBundle");

    
    var dirService = Components.classes["@mozilla.org/file/directory_service;1"]
                           .getService(Components.interfaces.nsIProperties);
    tmpDirFile = dirService.get("TmpD", Components.interfaces.nsIFile);
//    tmpDirFile.append('thunderpec');
    var tstamp = new Date().getTime();
    tmpDirFile.append('tp'+tstamp);
    if( !tmpDirFile.exists() || !tmpDirFile.isDirectory() ) {   
      try {
        //tmpDirFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0700);  
        tmpDirFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, parseInt("0700", 8));   //ver 1.5.2
      } catch (e){
        //tpec_org.xtc.tp.jsdump("KO: error in creating "+tmpDirFile.path+" directory"); 
      }
        
    } else {
//       var files = tmpDirFile.directoryEntries;
//       var file = "";
//       while (files.hasMoreElements()) {  
//         file = files.getNext().QueryInterface(Components.interfaces.nsIFile); 
//         file.remove(false);
//       }
     }
    tmpDir = tmpDirFile.path;
    tpec_org.xtc.tp.jsdump("OK: "+tmpDirFile.path+" directory created"); 

    tpecCS = Components.classes["@mozilla.org/messengercompose;1"].getService();
    tpecCS = tpecCS.QueryInterface(Components.interfaces.nsIMsgComposeService);
    
    tpecCT = Components.interfaces.nsIMsgCompType;
    
    if(typeof(gMessageListeners) != "undefined") {
      gMessageListeners.push(messageListener);
      tpec_org.xtc.tp.jsdump("OK: registering message listener"); 
    } else {
      tpec_org.xtc.tp.jsdump("KO: registering message listener"); 
    }
    document.getElementById("tpecToolbox").hidden = true; 
    
    //v166 start
    var notificationService =  Components.classes["@mozilla.org/messenger/msgnotificationservice;1"].getService(Components.interfaces.nsIMsgFolderNotificationService);  
    notificationService.addListener(tpecListener, notificationService.msgAdded |
        notificationService.msgsClassified |
        notificationService.msgsDeleted |
        notificationService.msgsMoveCopyCompleted |
        notificationService.msgKeyChanged |
        notificationService.folderAdded |
        notificationService.folderDeleted |
        notificationService.folderMoveCopyCompleted |
        notificationService.folderRenamed |
        notificationService.itemEvent);  

    var CreateDbObserver = {
      observe: function(aMsgFolder, aTopic, aData){  
        tpec_org.xtc.tp.jsdump("CreateDbObserver"); 
        addTPECColumnHandler();
      }
    } 
    var ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    ObserverService.addObserver(CreateDbObserver, "MsgCreateDBView", false);
    if(window.document.getElementById('folderTree')!=null){
      window.document.getElementById('folderTree').addEventListener("select",addTPECColumnHandler,false);
    } else {
      tpec_org.xtc.tp.jsdump("NO Folder TREE"); 
    }
    
                     
    tpecGlobals.tmpDir = tmpDir;
    tpecGlobals.prefTP = prefTP;
    
    //v166 end
    
    tpec_org.xtc.tp.utility = null;
    
    var bnp =  document.getElementById('button-newpec');
    var bnm =  document.getElementById('button-newmsg');
    var mb3 =  document.getElementById('mail-bar3');
    
    mb3.insertBefore(bnp,bnm.nextSibling);
    if(prefTP.getShowSendButton()=="off"){
        bnp.hidden = true;
    } else {
        bnp.hidden = false;
    }
    
    if(prefTP.getAccounts()==""){
        tpec_org.xtc.tp.jsdump("No PEC Account found");
        pecs  = [];
        var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager); 
        var accounts = acctMgr.accounts;  
        var accNum = (accounts.Count?accounts.Count():accounts.length);
        var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
        for (var i = 0; i < accNum; i++) {  
          var account = query(i, Components.interfaces.nsIMsgAccount);
          if(account.defaultIdentity){
            tpec_org.xtc.tp.jsdump("MAIN Account "+account.defaultIdentity.email);
            pecs.push(account.defaultIdentity.email);
          }
        }
        tpec_org.xtc.tp.jsdump("MAIN Account Num "+pecs.length);
        pecsIDX = 0 
        if(pecs.length>0)tpec_org.xtc.tp.ispec();
    } else {
      if(prefTP.getShareData()=="on")tpec_org.xtc.tp.examinepec();
    }
    
    if(prefTP.getShareData()=="on") {
      synctimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
      synctimer.initWithCallback(sharedb, firstinterval*60*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    }

    
    //EccezioneXML.parse("<eccezione><IdMsgSMTP><![CDATA[<opec275.20150801182934.26281.07.1.49@pec.aruba.it>]]></IdMsgSMTP><IdMsgPdA><CodicePdA/><Anno/><IdMsg/></IdMsgPdA><DatiEccezione><CodiceEccezione>E0606</CodiceEccezione><DescrizioneEccezione><![CDATA[Messaggio non riconosciuto]]></DescrizioneEccezione></DatiEccezione></eccezione>");
    //tpec_org.xtc.tp.jsdump("TTT "+EccezioneXML.htmlDoc); 
    //tpec_org.xtc.tp.jsdump("TTT "+EccezioneXML.keyword["idmsgsmtp"].value); 
    //tpec_org.xtc.tp.jsdump("TTT "+EccezioneXML.keyword["codiceeccezione"].value); 
    //tpec_org.xtc.tp.jsdump("TTT "+EccezioneXML.keyword["DescrizioneEccezione".toLowerCase()].value); 
    

  };
  
  pub.end = function() {
//     var dirService = Components.classes["@mozilla.org/file/directory_service;1"]
//                            .getService(Components.interfaces.nsIProperties);
//     var tmpDirFile = dirService.get("TmpD", Components.interfaces.nsIFile);
//     tmpDirFile.append('thunderpec');
    if( tmpDirFile.exists() && tmpDirFile.isDirectory() ) {   
//       var files = tmpDirFile.directoryEntries;
//       var file = "";
//       while (files.hasMoreElements()) {  
//         file = files.getNext().QueryInterface(Components.interfaces.nsIFile); 
//         file.remove(false);
//       }
      tmpDirFile.remove(true);
     }
    try{
      window.document.getElementById('folderTree').removeEventListener("select",addTPECColumnHandler,false);
    } catch(ex){}
    if(synctimer)synctimer.cancel();
    //ThunderPecSql.onUnload();
  };
  
  pub.getTmpDir = function(){
    return tmpDir;
  };

  pub.addAccount = function() {
    var optwin = window.openDialog("chrome://thunderpec/content/accountTP.xul","account","centerscreen, dialog, modal=yes, chrome");
    prefTP.reread();
    //v166 start
    tpecGlobals.prefTP = prefTP;
    //v166 end
  };

  pub.selectAccount = function(folder) {
    if(folder=='folder'){
      var fld = GetSelectedMsgFolders()[0];
      var root = fld;
      if(root!=null){
        while (root.parent!=null)root = root.parent;
      }
      var account = tpec_org.xtc.tp.findAccountFromFolder(root);
      if(account && account.defaultIdentity){
          var mbxName = account.defaultIdentity.email;
          tpec_org.xtc.tp.jsdump("OK: select account "+mbxName);
          if(prefTP.exists(mbxName)){
            prefTP.removeAccount(mbxName);
            if(mbxName==prefTP.getDefaultPec()){
              prefTP.setDefaultPec("");
              prefTP.reread();
              tpecGlobals.prefTP.reread();
            } 
          } else {
            prefTP.addAccount(mbxName);
          }
      }
    } else {
      var optwin = window.openDialog("chrome://thunderpec/content/selectTP.xul","account","centerscreen, dialog, modal=yes, chrome");
    }
    prefTP.reread();
    //v166 start
    tpecGlobals.prefTP = prefTP;
    //v166 stop
  };

  pub.Enable = function(){
    document.getElementById("replyMainMenu").setAttribute("disabled", "true");
    document.getElementById("replySenderMainMenu").setAttribute("disabled", "true");
  };


  pub.help = function() {
    var optwin = window.openDialog("chrome://thunderpec/content/helpTP.xul","Help","centerscreen, dialog, modal=yes, chrome");
  };

  pub.about = function() {
    var optwin = window.openDialog("chrome://thunderpec/content/aboutTP.xul","About","centerscreen, dialog, modal=yes, chrome");
  };

  pub.support = function() {
    var osString = Components.classes["@mozilla.org/xre/app-info;1"]
               .getService(Components.interfaces.nsIXULRuntime).OS;
    var info = Components.classes["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);
    var sBody = "%0A%0A%0A%0A%0A--------------------------%0AOS: "+osString+"%0ATB Version: "+ info.version+"%0ATPEC Version: "+ prefTP.getVersion();       
    var sURL="mailto:thunderpec@gmail.com?subject=ThunderPEC: &body="+sBody;

    var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"]
      .getService(Components.interfaces.nsIMsgComposeService);
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);

    var aURI = ioService.newURI(sURL, null, null);
    msgComposeService.OpenComposeWindowWithURI (null, aURI);  
    };



  pub.getFrame = function(win, frameName) {
    for (var j=0; j<win.frames.length; j++) {
      if (win.frames[j].name == frameName) {
        return win.frames[j];
      }
    }
    return null;
  }
  
  pub.handleMsg = function(event,action){
    ThunderPecUtility.jsdump("MSG CMD: "+needRedirect);
    if(!needRedirect){
      if(action=="forward"){
        MsgForwardMessage(event);
      } else if (action=="reply"){
        MsgReplySender(event);      
      } else if (action=="replyall"){
        MsgReplyToAllMessage(event);      
      } 
      return;
    }
    needRedirect = false;
    var externalMsg = gFolderDisplay.selectedMessageIsExternal;
    hiddenURL = tpec_org.xtc.tp.utility.saveEML(tmpDir);
    ThunderPecUtility.jsdump("MSG CMD: "+hiddenURL.spec);
    var folder = gFolderDisplay ? GetFirstSelectedMsgFolder() : null;
    var identity = null;
    if(!externalMsg) {
      var server = folder.server;
      identity = getIdentityForServer(server);
    }

    var type = "";
    if(action=="forward"){
      type = tpecCT.ForwardInline;
    } else if (action=="reply"){
      type = tpecCT.Reply;      
    } else if (action=="replyall"){
      type = tpecCT.ReplyAll;      
    }
    var hdr = messenger.msgHdrFromURI(hiddenURL.spec);
    messenger.setWindow(window, msgWindow);
   
    if(tpecCS){
      var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"]
        .getService(Components.interfaces.nsIMsgComposeService);
      msgComposeService.OpenComposeWindow( null, hdr,hiddenURL.spec, type, 0, identity, msgWindow);
    }
  }

  pub.handleButton = function(action){
    
    var externalMsg = gFolderDisplay.selectedMessageIsExternal;
    hiddenURL = tpec_org.xtc.tp.utility.saveEML(tmpDir);
    var folder = gFolderDisplay ? GetFirstSelectedMsgFolder() : null;
    var identity = null;
    if(!externalMsg) {
      var server = folder.server;
      identity = getIdentityForServer(server);
    }

    var type = "";
    if(action=="forward"){
      type = tpecCT.ForwardInline;
    } else if (action=="reply"){
      type = tpecCT.Reply;      
    } else if (action=="replyall"){
      type = tpecCT.ReplyAll;      
    }
    var hdr = messenger.msgHdrFromURI(hiddenURL.spec);
    messenger.setWindow(window, msgWindow);
   
    if(tpecCS){
      var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"]
        .getService(Components.interfaces.nsIMsgComposeService);
      msgComposeService.OpenComposeWindow( null, hdr,hiddenURL.spec, type, 0, identity, msgWindow);
    }
  }

  pub.handlePrintButton = function(action){
    hiddenURL = tpec_org.xtc.tp.utility.saveEML(tmpDir);
    var tpMessageList = new Array();
    tpMessageList.push(hiddenURL.spec);
    var tpStatusFeedback = Components.classes["@mozilla.org/messenger/statusfeedback;1"]
                        .createInstance(Components.interfaces.nsIMsgStatusFeedback);
    tpStatusFeedback.setWrappedStatusFeedback(window.MsgStatusFeedback);
    var doPrintPreview = false;
    var msgType = Components.interfaces.nsIMsgPrintEngine.MNAB_PRINT_MSG;
    if(action=="printpreview"){
      doPrintPreview = true;
      msgType = Components.interfaces.nsIMsgPrintEngine.MNAB_PRINTPREVIEW_MSG
    }
    window.openDialog("chrome://messenger/content/msgPrintEngine.xul", "",
                      "chrome,dialog=no,all,centerscreen",
                      tpMessageList.length, tpMessageList, tpStatusFeedback,
                      doPrintPreview, msgType, window);
  }     

  pub.receiptButton = function(action){
    var folder = gFolderDisplay.displayedFolder;
//     if(folder){
//       while(folder.parent!=null){
//         folder = folder.parent;
//       }
//       var mbxName = folder.name;
      var addresses = "";
      if(gFolderDisplay.selectedMessage){
        addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
      }

//      if(prefTP.exists(mbxName)){
      if(prefTP.check(addresses)){
        if(gFolderDisplay.selectedMessage){
          var subject = gFolderDisplay.selectedMessage.subject;
          if(subject.indexOf("POSTA CERTIFICATA")==0 || subject.indexOf("ANOMALIA MESSAGGIO")==0){
            hiddenURL = tpec_org.xtc.tp.utility.getXML(tmpDir);
            if(hiddenURL!=null){
              var optwin = window.openDialog("chrome://thunderpec/content/xmlTP.xul","","centerscreen, dialog, modal=yes, chrome",{xml:hiddenURL,dir:tmpDir,which:"daticert"});
            }
          } else {
            hiddenURL = tpec_org.xtc.tp.utility.getXML(tmpDir);
            if(hiddenURL!=null){
              var optwin = window.openDialog("chrome://thunderpec/content/xmlTP.xul","","centerscreen, dialog, modal=yes, chrome",{xml:hiddenURL,dir:tmpDir,which:"daticert"});
            }
          }
        }
      }
//    }
  }  

  pub.esitoButton = function(action){
    var folder = gFolderDisplay.displayedFolder;
//     if(folder){
//       while(folder.parent!=null){
//         folder = folder.parent;
//       }
//       var mbxName = folder.name;
      var addresses = "";
      if(gFolderDisplay.selectedMessage){
        addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
      }

//      if(prefTP.exists(mbxName)){
      if(prefTP.check(addresses)){
        tpec_org.xtc.tp.jsdump("OK: esitoatto 01"+addresses); 
        if(gFolderDisplay.selectedMessage){
          var subject = gFolderDisplay.selectedMessage.subject;
          var subject2 = gFolderDisplay.selectedMessage.mime2DecodedSubject;
          tpec_org.xtc.tp.jsdump("OK: esitoatto 02"+subject); 
          tpec_org.xtc.tp.jsdump("OK: esitoatto 02"+gFolderDisplay.selectedMessage.mime2DecodedSubject); 
          if(subject.indexOf("POSTA CERTIFICATA")==0 || subject2.indexOf("POSTA CERTIFICATA")==0){
            hiddenURL = tpec_org.xtc.tp.utility.getEsitoXML(tmpDir);
            tpec_org.xtc.tp.jsdump("OK: esitoatto 03"+hiddenURL); 
            var etype = "esitoatto";
            if(hiddenURL.indexOf("Eccezione.dtd")>0)etype="eccezione";
            if(hiddenURL!=null){
              var optwin = window.openDialog("chrome://thunderpec/content/xmlTP.xul","","centerscreen, dialog, modal=yes, chrome",{xml:hiddenURL,dir:tmpDir,which:etype});
            }
          } 
        }
      }
//    }
  }  

  pub.fatturaButton = function(action){
    var folder = gFolderDisplay.displayedFolder;
      var addresses = "";
      if(gFolderDisplay.selectedMessage){
        addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
      }

      if(prefTP.check(addresses)){
        tpec_org.xtc.tp.jsdump("OK: fattura 01"+addresses); 
        if(gFolderDisplay.selectedMessage){
          var subject = gFolderDisplay.selectedMessage.subject;
          var subject2 = gFolderDisplay.selectedMessage.mime2DecodedSubject;
          tpec_org.xtc.tp.jsdump("OK: fattura 02"+subject); 
          tpec_org.xtc.tp.jsdump("OK: fattura 02"+gFolderDisplay.selectedMessage.mime2DecodedSubject); 
          if(subject.indexOf("POSTA CERTIFICATA")==0 || subject2.indexOf("POSTA CERTIFICATA")==0){
            hiddenURL = tpec_org.xtc.tp.utility.getFatturaXML(tmpDir);
            tpec_org.xtc.tp.jsdump("OK: fattura 03"+hiddenURL); 
            if(hiddenURL!=null){
              var optwin = window.openDialog("chrome://thunderpec/content/xmlTP.xul","","centerscreen, dialog, modal=yes, chrome",{xml:hiddenURL,dir:tmpDir,which:"fattura"});
            }
          } 
        }
      }
  }  

  pub.envelopeButton = function(action){
//     var folder = gFolderDisplay.displayedFolder;
     var envelopeTXT = "";
//     if(folder){
//       while(folder.parent!=null){
//         folder = folder.parent;
//       }
//       var mbxName = folder.name;
      var addresses = "";
      if(gFolderDisplay.selectedMessage){
        addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
      }

//      if(prefTP.exists(mbxName)){
      if(prefTP.check(addresses)){
        if(gFolderDisplay.selectedMessage){
          var subject = gFolderDisplay.selectedMessage.subject;
          envelopeTXT = tpec_org.xtc.tp.utility.getTxt(tmpDir);
          var optwin = window.openDialog("chrome://thunderpec/content/certTP.xul","","centerscreen, dialog, modal=yes, chrome",{cert:envelopeTXT,dir:tmpDir});
          }
        }
//      }
    }

  pub.handlePrint = function(event,action){
    
    tpec_org.xtc.tp.jsdump("OK: handle print "+tpec_org.xtc.tp.utility.hasP7MBug); 

    if(!needRedirect && !tpec_org.xtc.tp.utility.hasP7MBug){
      if(action=="printpreview"){
        PrintEnginePrintPreview(event);
      } else if (action=="print"){
        PrintEnginePrint(event);      
      } 
      return;
    } else if (!needRedirect && tpec_org.xtc.tp.utility.hasP7MBug){
      needRedirect = false;
      hiddenURL = tpec_org.xtc.tp.utility.saveP7M(tmpDir);
    } else {
      needRedirect = false;
      hiddenURL = tpec_org.xtc.tp.utility.saveEML(tmpDir);    
    }
    

    ThunderPecUtility.jsdump("PRINT CMD: "+hiddenURL);
    var tpMessageList = new Array();
    tpMessageList.push(hiddenURL.spec);
    var tpStatusFeedback = Components.classes["@mozilla.org/messenger/statusfeedback;1"]
                        .createInstance(Components.interfaces.nsIMsgStatusFeedback);
    tpStatusFeedback.setWrappedStatusFeedback(window.MsgStatusFeedback);
    var doPrintPreview = false;
    var msgType = Components.interfaces.nsIMsgPrintEngine.MNAB_PRINT_MSG;
    if(action=="printpreview"){
      doPrintPreview = true;
      msgType = Components.interfaces.nsIMsgPrintEngine.MNAB_PRINTPREVIEW_MSG
    }
    window.openDialog("chrome://messenger/content/msgPrintEngine.xul", "",
                      "chrome,dialog=no,all,centerscreen",
                      tpMessageList.length, tpMessageList, tpStatusFeedback,
                      doPrintPreview, msgType, window);
  }     


  pub.handleLoadEvent = function(event){
    var chkHeaders = false;
    var externalMsg = gFolderDisplay.selectedMessageIsExternal;
    tpec_org.xtc.tp.jsdump("message is external "+externalMsg);
    var folder = gFolderDisplay.displayedFolder;    
    var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"]
                      .createInstance(Components.interfaces.nsIMsgWindow);
    var notificationBar;
    
    tpec_org.xtc.tp.jsdump("handleLoadEvent "+loadingPEC);
    if(!loadingPEC){
      isPEC = false;
      hiddenHdr = null;
      loadingPEC = false;
      hasP7MBug = false;
      if(folder || externalMsg){
        if(folder){
          while(folder.parent!=null){
            folder = folder.parent;
          }
          var mbxName = folder.name;
          var subject = currentHeaderData.subject.headerValue;
          removeReply = false;
          if(gFolderDisplay.selectedMessageUris[0]){
            var tmpHdr = messenger.msgHdrFromURI(gFolderDisplay.selectedMessageUris[0]);
            if(tmpHdr.flags & MSG_FLAG_PARTIAL){
              tpec_org.xtc.tp.jsdump("partial");
            }
          }
        } else if(externalMsg){
          var subject = currentHeaderData.subject.headerValue;          
          tpec_org.xtc.tp.jsdump("message is external "+subject);
          removeReply = false;
          if(gFolderDisplay.selectedMessageUris[0]){
            var tmpHdr = messenger.msgHdrFromURI(gFolderDisplay.selectedMessageUris[0]);
            if(tmpHdr.flags & MSG_FLAG_PARTIAL){
              tpec_org.xtc.tp.jsdump("partial");
            }
          }
        }
        
        
        //
        tpec_org.xtc.tp.tpRemoteContent = tmpHdr.getUint32Property("remoteContentPolicy");
        tpec_org.xtc.tp.jsdump("remoteContentPolicy "+ tpec_org.xtc.tp.tpRemoteContent);             
        if(tpec_org.xtc.tp.utility!=null)tpec_org.xtc.tp.utility=null;
        tpec_org.xtc.tp.utility = new ThunderPecUtilityAsync();
        tpec_org.xtc.tp.utility.check(tmpDir,tpec_org.xtc.tp.handleLoadEventCallback,null);
        tpec_org.xtc.tp.jsdump("Calling handleLoadEvent ");
        //

      }
    } else {
      //need message hdr here 

      if(isPEC){
        tpec_org.xtc.tp.hideReply();
        document.getElementById("smimeBox").collapsed = false;    
        document.getElementById("signedHdrIcon").collapsed = false;   
        document.getElementById("signedHdrIcon").setAttribute("signed",signedValue);
        signedValue = ""; 
        gSignerCert = hiddenSignerCert;   
        gEncryptionCert = hiddenEncryptionCert;
        gSignatureStatus = hiddenSignatureStatus;
        gEncryptionStatus = hiddenEncryptionStatus;
        notificationBar = document.getElementById("msgNotificationBar");
        notificationBar.setAttribute("collapsed",hiddenNotificationBar);
        notificationBar.setAttribute("selectedIndex",hiddenNBIndex);
        hiddenSignerCert = null;
        hiddenEncryptionCert = null;
        hiddenSignatureStatus = null;
        hiddenEncryptionStatus = null;
        hiddenNotificationBar = null;
        hiddenNBIndex = null;
      } else {
        if(hasP7MBug==true){
          document.getElementById("smimeBox").collapsed = false;    
          document.getElementById("signedHdrIcon").collapsed = false;   
          document.getElementById("signedHdrIcon").setAttribute("signed",signedValue);
          signedValue = ""; 
          gSignerCert = hiddenSignerCert;   
          gEncryptionCert = hiddenEncryptionCert;
          gSignatureStatus = hiddenSignatureStatus;
          gEncryptionStatus = hiddenEncryptionStatus;
          notificationBar = document.getElementById("msgNotificationBar");
          notificationBar.setAttribute("collapsed",hiddenNotificationBar);
          notificationBar.setAttribute("selectedIndex",hiddenNBIndex);
          hiddenSignerCert = null;
          hiddenEncryptionCert = null;
          hiddenSignatureStatus = null;
          hiddenEncryptionStatus = null;
          hiddenNotificationBar = null;
          hiddenNBIndex = null;
        } 
        var MessageURI = gFolderDisplay.selectedMessageUris[0];
        var msgHdr = messenger.messageServiceFromURI(MessageURI).messageURIToMsgHdr(MessageURI);
        if(msgHdr)msgHdr.markRead(true);
      }
      isPEC = false;
      loadingPEC = false;
      hasP7MBug = false;
    }
  }


  pub.handleLoadEventCallback = function(tpua){
    var chkHeaders = false;
    var isNotification = false;
    var externalMsg = gFolderDisplay.selectedMessageIsExternal;
    tpec_org.xtc.tp.jsdump("message is external "+externalMsg);
    var folder = gFolderDisplay.displayedFolder;    
    var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"]
                      .createInstance(Components.interfaces.nsIMsgWindow);
    var notificationBar;
    
    tpec_org.xtc.tp.jsdump("Calling handleLoadEventCallback ");
    if(!loadingPEC){
      isPEC = false;
      hiddenHdr = null;
      loadingPEC = true;
      hasP7MBug = false;
      if(folder || externalMsg){
        if(folder){
          while(folder.parent!=null){
            folder = folder.parent;
          }
          var mbxName = folder.name;
          var subject = currentHeaderData.subject.headerValue;
          removeReply = false;
          if(gFolderDisplay.selectedMessageUris[0]){
            var tmpHdr = messenger.msgHdrFromURI(gFolderDisplay.selectedMessageUris[0]);
            if(tmpHdr.flags & MSG_FLAG_PARTIAL){
              tpec_org.xtc.tp.jsdump("partial");
            }
          }
        } else if(externalMsg){
          var subject = currentHeaderData.subject.headerValue;          
          tpec_org.xtc.tp.jsdump("message is external "+subject);
          removeReply = false;
          if(gFolderDisplay.selectedMessageUris[0]){
            var tmpHdr = messenger.msgHdrFromURI(gFolderDisplay.selectedMessageUris[0]);
            if(tmpHdr.flags & MSG_FLAG_PARTIAL){
              tpec_org.xtc.tp.jsdump("partial");
            }
          }
        }
        
        
        chkHeaders = tpua.checkpec;
        
        if(prefTP.check(tmpHdr.ccList+","+tmpHdr.recipients) && chkHeaders==true){
          isPEC = true;
          signedValue = document.getElementById("signedHdrIcon").getAttribute("signed");
          hiddenSignerCert = gSignerCert;   
          hiddenEncryptionCert = gEncryptionCert;
          hiddenSignatureStatus = gSignatureStatus;
          hiddenEncryptionStatus = gEncryptionStatus;
          notificationBar = document.getElementById("msgNotificationBar");
          hiddenNotificationBar = notificationBar.getAttribute("collapsed");
          hiddenNBIndex = notificationBar.getAttribute("selectedIndex");
          tpec_org.xtc.tp.jsdump("OK: signature status "+ signedValue);
          tpec_org.xtc.tp.jsdump("POS  ("+ subject.indexOf("POSTA CERTIFICATA")+","+subject.indexOf("ANOMALIA MESSAGGIO")+")");
          if(subject.indexOf("POSTA CERTIFICATA")==0 || subject.indexOf("ANOMALIA MESSAGGIO")==0){
            //document.getElementById("tpecToolbox").hidden = false;
            var URL = tpua.saveEML(tmpDir);
            tpec_org.xtc.tp.handleToolbar(true,tpua.checkXML(tmpDir),tpua.hasEsitoXML,tpua.hasFatturaXML);
            if (URL!=null){
              tpec_org.xtc.tp.jsdump("remoteContentPolicy "+ tpec_org.xtc.tp.tpRemoteContent);             
              hiddenHdr = messenger.msgHdrFromURI(URL.spec);
              hiddenHdr.setUint32Property("remoteContentPolicy", tpec_org.xtc.tp.tpRemoteContent);
              tpec_org.xtc.tp.jsdump("openurl "+ JSON.stringify(URL)); 
              try {
                messenger.openURL(URL.spec);
              } catch(e){
                tpec_org.xtc.tp.jsdump("messenger.openURL "+e);      
              }
            }
          } else {
            //document.getElementById("tpecToolbox").hidden = true;
            tpec_org.xtc.tp.handleToolbar(false,tpua.checkXML(tmpDir),false,false);
            tpec_org.xtc.tp.hideReply();
            removeReply = true;
            loadingPEC = false;
            isNotification = true;
          }
        } else {
          document.getElementById("header-view-toolbox").hidden = false;    
          document.getElementById("tpecToolbox").hidden = true; 
          isPEC = false;
          loadingPEC = false;  
          } 
        if((tpua.hasP7MBug && !tpua.checkpec) || (tpua.hasP7MBug && isNotification)){
          hasP7MBug = chkHeaders;
          signedValue = document.getElementById("signedHdrIcon").getAttribute("signed");
          hiddenSignerCert = gSignerCert;   
          hiddenEncryptionCert = gEncryptionCert;
          hiddenSignatureStatus = gSignatureStatus;
          hiddenEncryptionStatus = gEncryptionStatus;
          notificationBar = document.getElementById("msgNotificationBar");
          hiddenNotificationBar = notificationBar.getAttribute("collapsed");
          hiddenNBIndex = notificationBar.getAttribute("selectedIndex");
            
          var URL = tpua.saveP7M(tmpDir);
          if (URL!=null){
           messenger.openURL(URL.spec);
           loadingPEC = true;
          }
        }
        //}
      }
    } else {
    
      if(isPEC){
        tpec_org.xtc.tp.hideReply();
        document.getElementById("smimeBox").collapsed = false;    
        document.getElementById("signedHdrIcon").collapsed = false;   
        document.getElementById("signedHdrIcon").setAttribute("signed",signedValue);
        signedValue = ""; 
        gSignerCert = hiddenSignerCert;   
        gEncryptionCert = hiddenEncryptionCert;
        gSignatureStatus = hiddenSignatureStatus;
        gEncryptionStatus = hiddenEncryptionStatus;
        notificationBar = document.getElementById("msgNotificationBar");
        notificationBar.setAttribute("collapsed",hiddenNotificationBar);
        notificationBar.setAttribute("selectedIndex",hiddenNBIndex);
        hiddenSignerCert = null;
        hiddenEncryptionCert = null;
        hiddenSignatureStatus = null;
        hiddenEncryptionStatus = null;
        hiddenNotificationBar = null;
        hiddenNBIndex = null;
      } else {
        if(hasP7MBug==true){
          document.getElementById("smimeBox").collapsed = false;    
          document.getElementById("signedHdrIcon").collapsed = false;   
          document.getElementById("signedHdrIcon").setAttribute("signed",signedValue);
          signedValue = ""; 
          gSignerCert = hiddenSignerCert;   
          gEncryptionCert = hiddenEncryptionCert;
          gSignatureStatus = hiddenSignatureStatus;
          gEncryptionStatus = hiddenEncryptionStatus;
          notificationBar = document.getElementById("msgNotificationBar");
          notificationBar.setAttribute("collapsed",hiddenNotificationBar);
          notificationBar.setAttribute("selectedIndex",hiddenNBIndex);
          hiddenSignerCert = null;
          hiddenEncryptionCert = null;
          hiddenSignatureStatus = null;
          hiddenEncryptionStatus = null;
          hiddenNotificationBar = null;
          hiddenNBIndex = null;
        } 
        var MessageURI = gFolderDisplay.selectedMessageUris[0];
        var msgHdr = messenger.messageServiceFromURI(MessageURI).messageURIToMsgHdr(MessageURI);
        if(msgHdr)msgHdr.markRead(true);
      }
      isPEC = false;
      loadingPEC = false;
      hasP7MBug = false;
    }
  }

  pub.mainMenu = function(){
    var folder = gFolderDisplay.displayedFolder;
    if(folder){
      while(folder.parent!=null){
        folder = folder.parent;
      }
      var mbxName = folder.name;

      var mainMenu = document.getElementById("messageMenuPopup");
      if(mainMenu){
        var firstChild = mainMenu.firstChild;
        if(firstChild.getAttribute('id')!="tpecMenu") {
          var separator = document.createElement("menuseparator");
          mainMenu.insertBefore(separator,firstChild);
          firstChild = mainMenu.firstChild;
          mainMenu.insertBefore(document.getElementById("tpecMenu"),firstChild);
        }
      }
      
      var addresses = "";
      if(gFolderDisplay.selectedMessage){
        addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
        
        //
        if(tpec_org.xtc.tp.utility!=null)tpec_org.xtc.tp.utility=null;
        tpec_org.xtc.tp.utility = new ThunderPecUtilityAsync();
        tpec_org.xtc.tp.utility.check(tmpDir,this.mainMenuCallback,null);
        tpec_org.xtc.tp.jsdump("Calling MainMenu ");
        //
        
      }
    }
  }

  pub.mainMenuCallback = function(tpua){
    var folder = gFolderDisplay.displayedFolder;
    if(folder){
      while(folder.parent!=null){
        folder = folder.parent;
      }
      var mbxName = folder.name;

      var mainMenu = document.getElementById("messageMenuPopup");
      if(mainMenu){
        var firstChild = mainMenu.firstChild;
        if(firstChild.getAttribute('id')!="tpecMenu") {
          var separator = document.createElement("menuseparator");
          mainMenu.insertBefore(separator,firstChild);
          firstChild = mainMenu.firstChild;
          mainMenu.insertBefore(document.getElementById("tpecMenu"),firstChild);
        }
      }
      
      var addresses = "";
      var sameMessage =  (gFolderDisplay.selectedMessageUris[0] == tpua.msgURI);
      if(gFolderDisplay.selectedMessageUris[0] == tpua.msgURI){
        addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;

        tpec_org.xtc.tp.jsdump("Calling MainMenuCallback "+ sameMessage+" isPEC: "+tpua.checkpec);

        if(prefTP.check(addresses) && (tpua.checkpec==true || tpua.hasP7MBug==true)){
          if(gFolderDisplay.selectedMessage){
            var subject = gFolderDisplay.selectedMessage.subject;
            removeReply = true;
            needRedirect = false;
            document.getElementById("tpecMenu").setAttribute("disabled", "false");
            if(subject.indexOf("POSTA CERTIFICATA")==0 || subject.indexOf("ANOMALIA MESSAGGIO")==0){
              removeReply = false;
              needRedirect = true;
              document.getElementById("tpecMenuReply").setAttribute("disabled", "false");
              if(tpec_org.xtc.tp.checkReplyAll(messageHeaderSink.mSaveHdr)){
                document.getElementById("tpecMenuReplyAll").disabled = false;
              } else {
                document.getElementById("tpecMenuReplyAll").disabled = true;
              }
            }
            if(removeReply){
              document.getElementById("tpecMenuReply").setAttribute("disabled", "true");
              document.getElementById("tpecMenuReplyAll").setAttribute("disabled", "true");
            }
          } 
        } else {
            document.getElementById("tpecMenu").setAttribute("disabled", "true");
        }
      }
    }
  }
 
  pub.contextMenu = function(){
    var folder = gFolderDisplay.displayedFolder;
    if(folder){
      while(folder.parent!=null){
        folder = folder.parent;
      }
      var mbxName = folder.name;

      var contextMenu = document.getElementById("mailContext");
      if(contextMenu){
        var firstChild = contextMenu.firstChild;
        if(firstChild.getAttribute('id')!="tpecContext") {
          var separator = document.createElement("menuseparator");
          contextMenu.insertBefore(separator,firstChild);
          firstChild = contextMenu.firstChild;
          contextMenu.insertBefore(document.getElementById("tpecContext"),firstChild);
        }
      }
      var addresses = "";
      var tmpMessage = gFolderDisplay.selectedMessage;
      if(tmpMessage){
        addresses = tmpMessage.ccList+","+tmpMessage.recipients;
        document.getElementById("tpecContext").setAttribute("disabled", "true");
        
        //
        if(tpec_org.xtc.tp.utility!=null)tpec_org.xtc.tp.utility=null;
        tpec_org.xtc.tp.utility = new ThunderPecUtilityAsync();
        tpec_org.xtc.tp.utility.check(tmpDir,this.contextMenuCallback,null);
        tpec_org.xtc.tp.jsdump("Calling ContextMenu ");
        //
      }
    }
  }


  pub.contextMenuCallback = function(tpua){
    var folder = gFolderDisplay.displayedFolder;
    if(folder){
      while(folder.parent!=null){
        folder = folder.parent;
      }
      var mbxName = folder.name;

      var contextMenu = document.getElementById("mailContext");
      if(contextMenu){
        var firstChild = contextMenu.firstChild;
        if(firstChild.getAttribute('id')!="tpecContext") {
          var separator = document.createElement("menuseparator");
          contextMenu.insertBefore(separator,firstChild);
          firstChild = contextMenu.firstChild;
          contextMenu.insertBefore(document.getElementById("tpecContext"),firstChild);
        }
      }
      var addresses = "";
      var tmpMessage = gFolderDisplay.selectedMessage;
      if(tmpMessage){      //check URI
        addresses = tmpMessage.ccList+","+tmpMessage.recipients;
        document.getElementById("tpecContext").setAttribute("disabled", "true");
        var chkHeaders =  tpua.checkpec;
        tpec_org.xtc.tp.jsdump("Calling ContextMenuCallBack ");
        document.getElementById("tpecContext").setAttribute("disabled", "false");
        if(prefTP.check(addresses) && (tpua.checkpec==true || tpua.hasP7MBug==true)){
          var subject = tmpMessage.subject;
          removeReply = true;
          needRedirect = false;
          document.getElementById("tpecContext").setAttribute("disabled", "false");
          if(subject.indexOf("POSTA CERTIFICATA")==0 || subject.indexOf("ANOMALIA MESSAGGIO")==0){
            removeReply = false;
            needRedirect = true;
            document.getElementById("tpecContextReply").setAttribute("disabled", "false");
            if(tpec_org.xtc.tp.checkReplyAll(messageHeaderSink.mSaveHdr)){
              document.getElementById("tpecContextReplyAll").disabled = false;
            } else {
              document.getElementById("tpecContextReplyAll").disabled = true;
            }
          }
          if(removeReply){
            document.getElementById("tpecContextReply").setAttribute("disabled", "true");
            document.getElementById("tpecContextReplyAll").setAttribute("disabled", "true");
          }
        } else {
            document.getElementById("tpecContext").setAttribute("disabled", "true");
        }
      }
    }
  }


  var messageListener = {
    smime:null,
    element:null,
    
    onStartHeaders: function() {
      tpec_org.xtc.tp.jsdump("messageListener onStartHeaders");
    },
    onBeforeShowHeaderPane: function() {
    },
    onEndHeaders: function() {
      var msgFrame = tpec_org.xtc.tp.getFrame(window,"messagepane");
      tpec_org.xtc.tp.jsdump("messageListener onEndHeaders "+msgFrame);
      msgFrame.addEventListener("load", tpec_org.xtc.tp.handleLoadEvent, false);
      if(prefTP.wn){
        prefTP.wn = false;
        var showwn = prompts.confirm(null, stringBundle.getString('tpec.wn'), stringBundle.getString('tpec.wnmsg'));  
        if(showwn){
          var url = "http://www.pocketpec.it/site/wn.tpec.php";
          var uri = Components.classes["@mozilla.org/network/simple-uri;1"].getService(Components.interfaces.nsIURI)
          uri.spec = url
          Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService).loadUrl(uri);
        }
      }

    },
    onEndAttachments: function() {
      if(isPEC && !document.getElementById("tpecToolbox").hidden){
        if(tpec_org.xtc.tp.checkReplyAll(messageHeaderSink.mSaveHdr)){
          document.getElementById("tpecReplyAllButton").hidden = false;
        } else {
          document.getElementById("tpecReplyAllButton").hidden = true;
        }
      }
    }
  };                  

  pub.hideReply = function(){
    if(document.getElementById("hdrReplyButton")!=null){
      document.getElementById("hdrReplyButton").hidden = true;
      }
    if(document.getElementById("hdrReplyAllButton")!=null){
      document.getElementById("hdrReplyAllButton").hidden = true;
      }
    if(document.getElementById("hdrReplyAllSubButton")!=null){
      document.getElementById("hdrReplyAllSubButton").hidden = true;
      }
    if(document.getElementById("hdrReplyAllSubButtonSep")!=null){
      document.getElementById("hdrReplyAllSubButtonSep").hidden = true;
      }
    if(document.getElementById("hdrReplyListButton")!=null){
      document.getElementById("hdrReplyListButton").hidden = true;  
      }
    if(document.getElementById("hdrReplyToSenderButton")!=null){
      document.getElementById("hdrReplyToSenderButton").hidden = true;
      }
  };      
  
  pub.handleToolbar= function(b,x,esito,fattura){
    hasEsitoXML = esito;
    hasFatturaXML = fattura;

    document.getElementById("tpecToolbox").hidden = false;    
    if(b){
      document.getElementById("tpecFatturaButton").hidden = !fattura;
      document.getElementById("tpecEsitoButton").hidden = !esito;
      //document.getElementById("tpecSearchButton").hidden = true;
      document.getElementById("tpecSearchButton").hidden = !(esito || fattura);
      document.getElementById("tpecReceiptButton").hidden = !x;
      document.getElementById("tpecForwardButton").hidden = false;
      document.getElementById("tpecReplyButton").hidden = false;
      document.getElementById("tpecReplyAllButton").hidden = false;
      document.getElementById("tpecPrintButton").hidden = false;
    } else {
      document.getElementById("tpecFatturaButton").hidden = !fattura;
      document.getElementById("tpecEsitoButton").hidden = !esito;
      document.getElementById("tpecSearchButton").hidden = !x;
      document.getElementById("tpecReceiptButton").hidden = !x;
      document.getElementById("tpecForwardButton").hidden = true;
      document.getElementById("tpecReplyButton").hidden = true;
      document.getElementById("tpecReplyAllButton").hidden = true;
      document.getElementById("tpecPrintButton").hidden = true;
      if(!x){
        document.getElementById("tpecToolbox").hidden = true;
      }
    }
  }            

  pub.checkReplyAll = function(hdr){
    var numAddresses = 1;
    var imInAddresses = false;
    var countMyAddresses = 0;
    if(hdr){
      //var folder = gFolderDisplay ? GetFirstSelectedMsgFolder() : null;
      //var server = folder.server;
      var addresses = hdr.author + "," + hdr.recipients + "," + hdr.ccList;
      //var identity = getIdentityForServer(server);
      //if(identity){
      //  var myEmail = identity.email;
      //  imInAddresses = myEmail && (addresses.toLowerCase().indexOf(myEmail.toLowerCase()) != -1);
      //}
      
      var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager); 
      var accounts = acctMgr.accounts;  
      var accNum = (accounts.Count?accounts.Count():accounts.length);
      var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
      for (var i = 0; i < accNum; i++) {  
        var account = query(i, Components.interfaces.nsIMsgAccount);
        if(account.defaultIdentity){
          if(addresses.toLowerCase().indexOf(account.defaultIdentity.email.toLowerCase()) != -1)countMyAddresses++;
        }
      }
        
      var hdrParser = Components.classes["@mozilla.org/messenger/headerparser;1"]
                          .getService(Components.interfaces.nsIMsgHeaderParser);
      var uniqueAddresses = hdrParser.removeDuplicateAddresses(addresses, "");
      var emailAddresses = {};
      numAddresses = hdrParser.parseHeadersWithArray(uniqueAddresses,
                            emailAddresses, {}, {});
      for (var i in emailAddresses.value)
      {
        if (/:/.test(emailAddresses.value[i]))
          numAddresses--;
        if (emailAddresses.value[i]=="null")
          numAddresses--;
      }
      //if (imInAddresses)
      //  numAddresses--;
      //}
      numAddresses = numAddresses-countMyAddresses;
      tpec_org.xtc.tp.jsdump("Check replyall "+countMyAddresses+" tot: "+numAddresses);
      }
    return numAddresses > 1;
    };                  

    pub.receiptMenu = function(){
      var receipt = prefTP.getReceipt();
      var menuC = document.getElementById("tpecComplete");
      var menuB = document.getElementById("tpecBrief");
      var menuS = document.getElementById("tpecSynth");
      
      menuC.setAttribute("checked", false);
      menuB.setAttribute("checked", false);
      menuS.setAttribute("checked", false);
      
      if(receipt=="completa")menuC.setAttribute("checked", true);
      if(receipt=="breve")menuB.setAttribute("checked", true);
      if(receipt=="sintetica")menuS.setAttribute("checked", true);
    };

    pub.setReceiptType = function(r){
      prefTP.setReceipt(r);
    };
    
    pub.setP7MStatus = function(r){
      prefTP.setP7M(r);
    };

    pub.p7mMenu = function(){
      var p7m = prefTP.getP7M();
      var menuC = document.getElementById("tpecP7MOn");
      var menuB = document.getElementById("tpecP7MOff");
      
      menuC.setAttribute("checked", false);
      menuB.setAttribute("checked", false);
      
      if(p7m=="on")menuC.setAttribute("checked", true);
      if(p7m=="off")menuB.setAttribute("checked", true);
    };

    pub.receiptMenuVb = function(){
      var receipt = prefTP.getReceipt();
      var menuC = document.getElementById("tpecComplete-vb");
      var menuB = document.getElementById("tpecBrief-vb");
      var menuS = document.getElementById("tpecSynth-vb");
      
      menuC.setAttribute("checked", false);
      menuB.setAttribute("checked", false);
      menuS.setAttribute("checked", false);
      
      if(receipt=="completa")menuC.setAttribute("checked", true);
      if(receipt=="breve")menuB.setAttribute("checked", true);
      if(receipt=="sintetica")menuS.setAttribute("checked", true);
    };

    pub.p7mMenuVb = function(){
      var p7m = prefTP.getP7M();
      var menuC = document.getElementById("tpecP7MOn-vb");
      var menuB = document.getElementById("tpecP7MOff-vb");
      
      menuC.setAttribute("checked", false);
      menuB.setAttribute("checked", false);
      
      if(p7m=="on")menuC.setAttribute("checked", true);
      if(p7m=="off")menuB.setAttribute("checked", true);
    };

    pub.setP7MStatus = function(r){
      prefTP.setP7M(r);
    };

    pub.getP7MStatus = function(){
      return prefTP.getP7M();
    };
    
    pub.getDebug = function(){
      return prefTP.getDebug();
    };


    pub.findAccountFromIdentity = function(id) {
        if (!id)
            return null;
        var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        var accounts = acctMgr.accounts;
        var accNum = (accounts.Count?accounts.Count():accounts.length);
        var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
        for (var i = 0; i < accNum; i++) {
            var account = query(i, Components.interfaces.nsIMsgAccount);
            if(account.defaultIdentity == id)
                return account.QueryInterface(Components.interfaces.nsIMsgAccount);
            var identities = account.identities;
            var idNum = (identities.Count?identities.Count():identities.length);
            var idQuery = (identities.queryElementAt?identities.queryElementAt:identities.QueryElementAt);
            for(var j=0;j<idNum;j++){
              var ids = idQuery(j, Components.interfaces.nsIMsgIdentity);
              if(ids == id)
                  return account.QueryInterface(Components.interfaces.nsIMsgAccount);
            }             
        }
        return null;
    };
    
    pub.searchButton = function () {
      var addresses = "";
      if(gFolderDisplay.selectedMessage){
        var msg = gFolderDisplay.selectedMessage;
        addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
      }
      if(gFolderDisplay.displayedFolder){
        tpec_org.xtc.tp.jsdump("searchTP: gFolderDisplay "+gFolderDisplay.displayedFolder.name);
      }
      var account = tpec_org.xtc.tp.findAccountFromIdentity(getIdentityForHeader(msg));
      if(account){
        tpec_org.xtc.tp.jsdump("searchTP: account OK "+account.incomingServer.rootFolder);
        var folder = account.incomingServer.rootFolder;
        if(folder){
          tpec_org.xtc.tp.jsdump("searchTP: folder OK "+folder.name);
          while(folder.parent!=null){
            folder = folder.parent;
          }
          var mbxName = folder.name;
          tpec_org.xtc.tp.jsdump("searchTP: "+addresses);
  
    //      if(prefTP.exists(mbxName)){
          if(prefTP.check(addresses)){
            if(gFolderDisplay.selectedMessage){
              var subject = gFolderDisplay.selectedMessage.subject;
              var subject2 = gFolderDisplay.selectedMessage.mime2DecodedSubject;
              //if(subject.indexOf("POSTA CERTIFICATA")==-1 && subject.indexOf("ANOMALIA MESSAGGIO")==-1){
              if(!(subject.indexOf("POSTA CERTIFICATA")==0 || subject.indexOf("ANOMALIA MESSAGGIO")==0 || subject2.indexOf("POSTA CERTIFICATA")==0 || subject2.indexOf("ANOMALIA MESSAGGIO")==0)){
                hiddenURL = tpec_org.xtc.tp.utility.getXML(tmpDir);
                tpec_org.xtc.tp.jsdump("searchTP: "+hiddenURL);
                if(hiddenURL!=null){
                  var optwin = window.openDialog("chrome://thunderpec/content/searchTP.xul","","centerscreen, dialog, modal=yes, chrome",{start:gFolderDisplay.displayedFolder,msg:gFolderDisplay.selectedMessage,xml:hiddenURL,dir:tmpDir,fld:folder,archive:null,which:"daticert"});
                }
  
              }
              if(subject.indexOf("POSTA CERTIFICATA")==0 || subject2.indexOf("POSTA CERTIFICATA")==0){
                if(hasEsitoXML){
                  hiddenURL = tpec_org.xtc.tp.utility.getEsitoXML(tmpDir);
                  tpec_org.xtc.tp.jsdump("searchTP: esito XML "+hiddenURL);
                  if(hiddenURL!=null){
                    var optwin = window.openDialog("chrome://thunderpec/content/searchTP.xul","","centerscreen, dialog, modal=yes, chrome",{start:gFolderDisplay.displayedFolder,msg:gFolderDisplay.selectedMessage,xml:hiddenURL,dir:tmpDir,fld:folder,archive:null,which:"esitoatto"});
                  }
                }
                if(hasFatturaXML){
                  tpec_org.xtc.tp.jsdump("searchTP: fattura XML "+gFolderDisplay.selectedMessage.messageId);
                  var optwin = window.openDialog("chrome://thunderpec/content/searchTP.xul","","centerscreen, dialog, modal=yes, chrome",{start:gFolderDisplay.displayedFolder,msg:gFolderDisplay.selectedMessage,xml:null,dir:tmpDir,fld:folder,archive:null,which:"fatturapa"});
                }
  
              }
            }
          }
        }
      } else {
        tpec_org.xtc.tp.jsdump("seachTP: account KO");      
      }
    };

    pub.searchPA = function() {
      window.openDialog("chrome://thunderpec/content/spcdataTP.xul","","centerscreen, dialog, modal=yes, chrome",{from:"main",win:this});
    }

    pub.ppecQR = function(folder) {
      var pec = "";
      if(folder=='folder'){
        var fld = GetSelectedMsgFolders()[0];
        var root = fld;
        if(root!=null){
          while (root.parent!=null)root = root.parent;
        }
        var account = tpec_org.xtc.tp.findAccountFromFolder(root);
        if(account && account.defaultIdentity){
            var mbxName = account.defaultIdentity.email;
            tpec_org.xtc.tp.jsdump("OK: ppecQR "+mbxName);
            if(prefTP.exists(mbxName)){
              pec = mbxName;
            }
        }
      }     
    
      window.openDialog("chrome://thunderpec/content/qrTP.xul","","centerscreen, dialog, modal=yes, chrome",{address:pec});
    }

    pub.share = function(share) {
      prompts.alert(null, stringBundle.getString('tpec.share'), stringBundle.getString('tpec.sharemsg'));  

      var url = "http://www.pocketpec.it/share/share.html";
      var uri = Components.classes["@mozilla.org/network/simple-uri;1"].getService(Components.interfaces.nsIURI)
      uri.spec = url
      Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService).loadUrl(uri);
    }

    pub.handleArchive = function() {
      var selectedMessages = gFolderDisplay.selectedMessages;
      if (!selectedMessages.length)
        return;

      var addresses = "";
      if(gFolderDisplay.selectedMessage){
        var msg = gFolderDisplay.selectedMessage;
        addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
      }
      var account = tpec_org.xtc.tp.findAccountFromIdentity(getIdentityForHeader(msg));
      if(account){
        tpec_org.xtc.tp.jsdump("searchTP: account OK");
        var folder = account.incomingServer.rootFolder;
        if(folder){
          tpec_org.xtc.tp.jsdump("searchTP: folder OK");
          while(folder.parent!=null){
            folder = folder.parent;
          }
          var mbxName = folder.name;
          tpec_org.xtc.tp.jsdump("searchTP: "+addresses);
  
    //      if(prefTP.exists(mbxName)){
          if(prefTP.check(addresses)){
            var optwin = window.openDialog("chrome://thunderpec/content/searchTP.xul","","centerscreen, dialog, modal=yes, chrome",{xml:null,dir:tmpDir,fld:folder,archive:selectedMessages});
          }
        }
      } else {
        tpec_org.xtc.tp.jsdump("archive: account KO");      
      }

     }
     
    pub.tpecMenu = function(){
      var tmpfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      tmpfile.initWithPath(tmpDir);
      tmpfile.append("tpec_log.txt");
      if(prefTP.getDebug() && tmpfile.exists()){
        if(document.getElementById("tpecLog-vb"))document.getElementById("tpecLog-vb").hidden = false;      
        document.getElementById("tpecLog").hidden = false;      
      } else {
        if(document.getElementById("tpecLog-vb"))document.getElementById("tpecLog-vb").hidden = true;      
        document.getElementById("tpecLog").hidden = true;      
      }
    
    }

  pub.supportlog = function() {
      var tmpfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      tmpfile.initWithPath(tmpDir);
      tmpfile.append("tpec_log.txt");
      if(tmpfile.exists()){
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
          .getService(Components.interfaces.nsIIOService);
        var url = ioService.newFileURI(tmpfile);
        var osString = Components.classes["@mozilla.org/xre/app-info;1"]
                   .getService(Components.interfaces.nsIXULRuntime).OS;
        var info = Components.classes["@mozilla.org/xre/app-info;1"]
               .getService(Components.interfaces.nsIXULAppInfo);
        var sBody = "\n\n\n\n\n--------------------------\nOS: "+osString+"\nTB Version: "+ info.version+"\nTPEC Version: "+ prefTP.getVersion();       
        var sURL="mailto:thunderpec@gmail.com?subject=ThunderPEC: &body="+sBody+"&attachment='"+url.spec+"'";
        
        tpec_org.xtc.tp.jsdump("supportlog: "+sURL);      
    
        /*
        var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"]
          .getService(Components.interfaces.nsIMsgComposeService);
    
        var aURI = ioService.newURI(sURL, null, null);
        msgComposeService.OpenComposeWindowWithURI (null, aURI);  
        */
        
        var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"].
        getService(Components.interfaces.nsIMsgComposeService);
        var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].
          createInstance(Components.interfaces.nsIMsgComposeParams);
        var fields = Components.classes["@mozilla.org/messengercompose/composefields;1"].
          createInstance(Components.interfaces.nsIMsgCompFields);
        var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"].
          createInstance(Components.interfaces.nsIMsgAttachment);
        attachment.name = "tpec_log.txt";
        attachment.url = url.spec;
        fields.addAttachment(attachment);
        fields.characterSet ="UTF-8";
        fields.to = "thunderpec@gmail.com";
        fields.subject = "ThunderPEC: ";
        fields.body = sBody;
        params.type = Components.interfaces.nsIMsgCompType.New;
        params.format = Components.interfaces.nsIMsgCompFormat.Default;
        params.composeFields = fields;
        msgComposeService.OpenComposeWindowWithParams(null, params);
      }
    };
    
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
    		if(theFolder==rootFolder.QueryInterface(Components.interfaces.nsIMsgFolder)){
    				return account.QueryInterface(Components.interfaces.nsIMsgAccount);
        }
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
    
  pub.folderMenu = function() {
    var menuF = document.getElementById("tpecFolderSelect");
    menuF.setAttribute("checked", false);
    var fld = GetSelectedMsgFolders()[0];
    tpec_org.xtc.tp.jsdump("folderMenu "+(fld.flags & Components.interfaces.nsMsgFolderFlags.Inbox));
    var root = fld;
    if(root!=null){
      while (root.parent!=null)root = root.parent;
    }
    var account = tpec_org.xtc.tp.findAccountFromFolder(root);
    if(account && account.defaultIdentity){
        var mbxName = account.defaultIdentity.email;
        tpec_org.xtc.tp.jsdump("OK: folderMenu "+mbxName);
        if(prefTP.exists(mbxName)){
          menuF.setAttribute("checked", true);
          document.getElementById("tpecFolderDefault").hidden = false;
          if(mbxName==prefTP.getDefaultPec()){
            document.getElementById("tpecFolderDefault").setAttribute("checked", true);
          } else {
            document.getElementById("tpecFolderDefault").setAttribute("checked", false);
          }
        } else {
          menuF.setAttribute("checked", false);
          document.getElementById("tpecFolderDefault").hidden = true;
       }
    }
  };
  
  pub.preferences = function() {
    var optwin = window.openDialog("chrome://thunderpec/content/preferencesTP.xul","About","centerscreen, dialog, modal=yes, chrome");
    //v166 start
    //prefTP = new ThunderPecPrefs();
    //prefTP.init();
    prefTP.reread();
    tpecGlobals.prefTP = prefTP;
    //v166 stop
    //v171pre1 start
    var bnp =  document.getElementById('button-newpec');
    tpec_org.xtc.tp.jsdump("PREFERENCES "+bnp+" "+prefTP.getShowSendButton());
    if(prefTP.getShowSendButton()=="off"){
        bnp.setAttribute("hidden", true);
    } else {
        bnp.removeAttribute("hidden");
    }
    //v171pre1 stop
    //v173pre2 start
    addTPECColumnHandler();
    //v173pre2 stop

  };
  
  pub.rebuildDB = function() {
    var fld = GetSelectedMsgFolders()[0];
    var msgArray = fld.messages;
    var result = prompts.confirm(null, stringBundle.getString('tpec.db.rebuild'), stringBundle.getString('tpec.db.ask'));
    if(result){
      tpecListener.running = (tpecListener.messages.length>0);
      while( msgArray.hasMoreElements() ) {
        var msgHdr = msgArray.getNext().QueryInterface(Components.interfaces.nsIMsgDBHdr);
        tpecListener.messages.push([msgHdr,0])
      }
      tpecListener.msgRebuild();
    }
  };

  pub.emailMenu = function(elt) {
    var menuF = document.getElementById("tpecEASelect");
    while (elt.getAttribute("popup") != 'emailAddressPopup') {
      elt = elt.parentNode;
      if (elt == null)
        return null;
    }
    var mbxName = elt.parentNode.getAttribute("emailAddress");
    tpec_org.xtc.tp.jsdump("OK: folderMenu "+mbxName);
    if(prefTP.exists(mbxName)){
      menuF.setAttribute("checked", true);
    } else {
      menuF.setAttribute("checked", false);
    }

  };

  pub.selectEmail = function(elt) {
    while (elt.getAttribute("popup") != 'emailAddressPopup') {
      elt = elt.parentNode;
      if (elt == null)
        return null;
    }
    tpec_org.xtc.tp.jsdump("OK: select email "+elt.parentNode.getAttribute("emailAddress"));
    var mbxName = elt.parentNode.getAttribute("emailAddress");
    tpec_org.xtc.tp.jsdump("OK: select email "+mbxName);
    if(prefTP.exists(mbxName)){
      prefTP.removeAccount(mbxName);
    } else {
      prefTP.addAccount(mbxName);
    }
    prefTP.reread();
    tpecGlobals.prefTP = prefTP;

  };

  pub.writepec = function() {
        
    	var email = prefTP.getDefaultPec();
      var identity = null;
      
      if(email==""){
        var result = prompts.confirm(null,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.dp.notice'));
        if(result){
          var items = prefTP.pecAccounts.split(",");
          for(var i=0;i<items.length;i++){
            if(items[i].length==0){
               items.splice(i, 1);
            }
          }
          var selected = {};
          result = prompts.select(null, stringBundle.getString('tpec.dp.value'), "", items.length, items, selected);
          if(result){
            tpec_org.xtc.tp.jsdump("DEFAULT PEC: "+items[selected.value]);
            prefTP.setDefaultPec(items[selected.value]);
            email = items[selected.value];
            prefTP.reread();
            tpecGlobals.prefTP.reread(); 
          }    
        }
      }
      
      if(email==""){
        tpec_org.xtc.tp.jsdump("DEFAULT PEC NOT SET");
        return;
      }      
      var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
    		.getService(Components.interfaces.nsIMsgAccountManager);
    	var accounts = acctMgr.accounts;
      var accNum = (accounts.Count?accounts.Count():accounts.length);
      var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
    	for (var i = 0; i < accNum; i++) {
    		var account = query(i, Components.interfaces.nsIMsgAccount);
    		identity = account.defaultIdentity; 
    		if(identity!=null && identity.email==email){
          var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"].
          getService(Components.interfaces.nsIMsgComposeService);
          var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].
            createInstance(Components.interfaces.nsIMsgComposeParams);
          var fields = Components.classes["@mozilla.org/messengercompose/composefields;1"].
            createInstance(Components.interfaces.nsIMsgCompFields);
          fields.characterSet ="UTF-8";
          fields.from = email;
          params.type = Components.interfaces.nsIMsgCompType.New;
          params.format = Components.interfaces.nsIMsgCompFormat.Default;
          params.identity = identity;
          params.composeFields = fields;
          msgComposeService.OpenComposeWindowWithParams(null, params);
          return;
        }
    	}

    }
  pub.defaultAccount = function() {
    var menuF = document.getElementById("tpecFolderSelect");
    menuF.setAttribute("checked", false);
    var fld = GetSelectedMsgFolders()[0];
    tpec_org.xtc.tp.jsdump("defaultAccount "+(fld.flags & Components.interfaces.nsMsgFolderFlags.Inbox));
    var root = fld;
    if(root!=null){
      while (root.parent!=null)root = root.parent;
    }
    var account = tpec_org.xtc.tp.findAccountFromFolder(root);
    if(account && account.defaultIdentity){
        var mbxName = account.defaultIdentity.email;
        prefTP.setDefaultPec(mbxName);
        prefTP.reread();
        tpecGlobals.prefTP.reread(); 
        tpec_org.xtc.tp.jsdump("defaultAccount set to "+mbxName);
    }
  };

  pub.ispec = function(){
    if(pecsIDX<pecs.length){
      var pec = pecs[pecsIDX].split('@');
      try {
        var request = new XMLHttpRequest();
        request.open('GET', 'https://data.pocketpec.it/tpec/ispec.php?d='+pec[1], true);
        request.onreadystatechange = function (oEvent) {
          if (request.readyState === 4) {
            if (request.status === 200) {
              tpec_org.xtc.tp.jsdump("ISPEC response: "+pecsIDX+") "+pecs[pecsIDX]+": "+request.responseText);
              if(request.responseText.indexOf("yes")!==-1)prefTP.addAccount(pecs[pecsIDX]);
              request = null;
              pecsIDX++;
              tpec_org.xtc.tp.ispec();
            } else {
             tpec_org.xtc.tp.jsdump("ISPEC CONNECTION ERROR pocketpec.it");
            } 
          }
        };
        request.send(null);
      } catch(e){
        tpec_org.xtc.tp.jsdump("ISPEC CONNECTION EXCEPTION pocketpec.it "+e);      
      }
    }
  };
  
  pub.examinepec = function(){
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager); 
    var accounts = acctMgr.accounts;  
    var accNum = (accounts.Count?accounts.Count():accounts.length);
    var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
    var data = [];
    var inserted = "";
    var df = false;
    for (var i = 0; i < accNum; i++) {  
      var account = query(i, Components.interfaces.nsIMsgAccount);
      if(account.defaultIdentity){
        if(prefTP.check(account.defaultIdentity.email)){
          var dinfo = {};
          var domain = account.defaultIdentity.email.split('@');
          dinfo["domain"] = domain[1];
          if(df)tpec_org.xtc.tp.jsdump("EXAMINE "+account.defaultIdentity.email);
          var incoming = account.incomingServer;
          dinfo["incoming"] = {"t":incoming.type,"h":incoming.hostName,"p":incoming.port,"s":incoming.socketType,"u":(incoming.username==account.defaultIdentity.email?1:0)};
          if(df)tpec_org.xtc.tp.jsdump("EXAMINE INCOMING "+incoming.type+":"+incoming.hostName+":"+incoming.port+":"+incoming.socketType+":"+(incoming.username==account.defaultIdentity.email));
          var outgoing = MailServices.smtp.getServerByKey(account.defaultIdentity.smtpServerKey);
          if(df)tpec_org.xtc.tp.jsdump("EXAMINE OUTGOING "+"smtp:"+outgoing.hostname+":"+outgoing.port+":"+outgoing.socketType+":"+(outgoing.username==account.defaultIdentity.email));
          dinfo["outgoing"] = {"t":"smtp","h":outgoing.hostname,"p":outgoing.port,"s":outgoing.socketType,"u":(outgoing.username==account.defaultIdentity.email?1:0)};
          var rootFolder = account.incomingServer.rootFolder;
          if(df)tpec_org.xtc.tp.jsdump("EXAMINE ROOTFOlDER "+rootFolder);
          dinfo["folders"] = [];
          if (rootFolder.hasSubFolders && incoming.type=="imap") {
            var subFolders = rootFolder.subFolders; 
            while(subFolders.hasMoreElements()) {
              var folder = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
              var imapFolder = folder.QueryInterface(Components.interfaces.nsIMsgImapMailFolder);
              if(df)tpec_org.xtc.tp.jsdump("EXAMINE IMAPFOLDER "+imapFolder.onlineName);
              var fname = folder.URI.replace(incoming.serverURI,"");
              dinfo["folders"].push(imapFolder.onlineName);
              //dinfo["folders"].push(fname);
              //if(df)tpec_org.xtc.tp.jsdump("EXAMINE SUBFOLDER "+fname);
              if(fname.toLowerCase().indexOf("inbox")!=-1 && folder.hasSubFolders){
              var subInbox = folder.subFolders;
              while(subInbox.hasMoreElements()) {
                var sfolder = subInbox.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
                var imapFolder = sfolder.QueryInterface(Components.interfaces.nsIMsgImapMailFolder);
                if(df)tpec_org.xtc.tp.jsdump("EXAMINE UNDER INBOX IMAPFOLDER "+imapFolder.onlineName);
                var sname = sfolder.URI.replace(incoming.serverURI,"");
                dinfo["folders"].push(imapFolder.onlineName);
                 //dinfo["folders"].push(sname);
                //if(df)tpec_org.xtc.tp.jsdump("EXAMINE UNDER INBOX "+sname);
                }
              }
            }
          }
          if(inserted.toLowerCase().indexOf(dinfo["domain"])==-1){
            data.push(dinfo);
            inserted += dinfo["domain"]+":";
            }
        }
      }
    }
    
    tpec_org.xtc.tp.jsdump("EXAMINE DATA "+JSON.stringify(data));
    if(inserted!=""){
      try{
        var http = new XMLHttpRequest();
        var url = "https://data.pocketpec.it/tpec/cdomain.php";
        var params = "j="+JSON.stringify(data);
        http.open("POST", url, true);
        
        //Send the proper header information along with the request
        http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        
        http.onreadystatechange = function() {//Call a function when the state changes.
            if(http.readyState == 4 && http.status == 200) {
                tpec_org.xtc.tp.jsdump("EXAMINE SERVER "+http.responseText);
            }
        }
        http.send(params); 
        tpec_org.xtc.tp.jsdump("EXAMINE CALL SERVER");   
      } catch(e){
        tpec_org.xtc.tp.jsdump("EXAMINE CALL SERVER EXCEPTION "+e);   
      }
    }
  };

  pub.extract = function(){
      extractMessages = gFolderDisplay.selectedMessages;
      if (!extractMessages.length)
        return;
      
      var aMsg = null;
      extractArray = new Array();
      for (var i=0; i<extractMessages.length;i++) {
          aMsg = extractMessages[i];
          if(aMsg.mime2DecodedSubject.indexOf("POSTA CERTIFICATA")==0 || aMsg.mime2DecodedSubject.indexOf("ANOMALIA MESSAGGIO")==0){
            tpec_org.xtc.tp.jsdump("EXTRACT MESSAGE: "+aMsg.mime2DecodedSubject);
            extractArray.push(aMsg);
          } else {
            tpec_org.xtc.tp.jsdump("EXTRACT NOTIFICATION: "+aMsg.mime2DecodedSubject);
          }
      }      
        
      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      fp.init(window, stringBundle.getString('tpec.extract.folder'), nsIFilePicker.modeGetFolder);
      /*
      var res = fp.show();
      if (res != nsIFilePicker.returnCancel){
        var thefile = fp.file;
        tpec_org.xtc.tp.jsdump("EXTRACT FOLDER: "+thefile.path);
        
        var addresses = "";
        if(gFolderDisplay.selectedMessage){
          var msg = gFolderDisplay.selectedMessage;
          addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
        }
        var account = tpec_org.xtc.tp.findAccountFromIdentity(getIdentityForHeader(msg));
        if(account){
          tpec_org.xtc.tp.jsdump("EXTRACT: account OK");
          var folder = account.incomingServer.rootFolder;
          if(folder){
            tpec_org.xtc.tp.jsdump("EXTRACT: folder OK");
            while(folder.parent!=null){
              folder = folder.parent;
            }
            var mbxName = folder.name;
            tpec_org.xtc.tp.jsdump("EXTRACT: "+addresses);
    
            if(prefTP.check(addresses)){
                //extractCount = extractMessages.length;
                //extractIDX = 0;
                //extractArray = new Array();
                extractPath = thefile.path;
                //extractInline = Services.prefs.getBoolPref("mail.inline_attachments");
                //Services.prefs.setBoolPref("mail.inline_attachments", true);
                var optwin = window.openDialog("chrome://thunderpec/content/extractTP.xul","","centerscreen, dialog, modal=yes, chrome",{path:extractPath,earray:extractArray});
                //tpec_org.xtc.tp.extractSingle();
            }
          }
        } else {
          tpec_org.xtc.tp.jsdump("EXTRACT: account KO");      
        }
        
      } 
      */ 
      
      fp.open(rv => {
        if (rv != nsIFilePicker.returnOK || !fp.file) {
          return;
        }
        var thefile = fp.file;
        tpec_org.xtc.tp.jsdump("EXTRACT FOLDER: "+thefile.path);
        
        var addresses = "";
        if(gFolderDisplay.selectedMessage){
          var msg = gFolderDisplay.selectedMessage;
          addresses = gFolderDisplay.selectedMessage.ccList+","+gFolderDisplay.selectedMessage.recipients;
        }
        var account = tpec_org.xtc.tp.findAccountFromIdentity(getIdentityForHeader(msg));
        if(account){
          tpec_org.xtc.tp.jsdump("EXTRACT: account OK");
          var folder = account.incomingServer.rootFolder;
          if(folder){
            tpec_org.xtc.tp.jsdump("EXTRACT: folder OK");
            while(folder.parent!=null){
              folder = folder.parent;
            }
            var mbxName = folder.name;
            tpec_org.xtc.tp.jsdump("EXTRACT: "+addresses);
    
            if(prefTP.check(addresses)){
                //extractCount = extractMessages.length;
                //extractIDX = 0;
                //extractArray = new Array();
                extractPath = thefile.path;
                //extractInline = Services.prefs.getBoolPref("mail.inline_attachments");
                //Services.prefs.setBoolPref("mail.inline_attachments", true);
                var optwin = window.openDialog("chrome://thunderpec/content/extractTP.xul","","centerscreen, dialog, modal=yes, chrome",{path:extractPath,earray:extractArray});
                //tpec_org.xtc.tp.extractSingle();
            }
          }
        } else {
          tpec_org.xtc.tp.jsdump("EXTRACT: account KO");      
        }
    });

  }; 
   
  var gStreamListener = {
    QueryInterface: function(iid)  {
            if (iid.equals(Components.interfaces.nsIStreamListener) ||  
                iid.equals(Components.interfaces.nsISupports))
            return this;
            throw Components.results.NS_NOINTERFACE;
            return 0;
    },
    stream: null,
    init:function(){this.stream = null;},
    onStartRequest: function (aRequest, aContext) {},
    onStopRequest: function (aRequest, aContext, aStatusCode) {tpec_org.xtc.tp.jsdump("EXTRACT: aStatusCode "+aRequest+" "+aContext+" "+aStatusCode); },
    onDataAvailable: function (aRequest,aContext,aInputStream,aOffset,aCount) {
      if (this.stream === null) {
        this.stream = Cc["@mozilla.org/scriptableinputstream;1"].
                      createInstance(Ci.nsIScriptableInputStream);
        this.stream.init(aInputStream);
      }
    }
  };
  var gMessageHeaderSink = {
    attachmentCount: 0,
    mSaveHdr: null,
    handleAttachment: function(aContentType, aUrl, aDisplayName, aUri,
                               aIsExternalAttachment) {
      if(aDisplayName!="daticert.xml" && aDisplayName!="postacert.eml"){
        extractArray.push([aDisplayName,aUrl,aContentType,extractMessages[extractIDX]]);
        tpec_org.xtc.tp.jsdump("EXTRACT: handleAttachment "+aDisplayName);      
      }
      this.attachmentCount++;
    },
    // stub functions from nsIMsgHeaderSink
    addAttachmentField: function(aName, aValue) {},
    onStartHeaders: function() {},
    onEndHeaders: function() {},
    processHeaders: function(aHeaderNames, aHeaderValues, dontCollectAddrs) {},
    onEndAllAttachments: function() {
      tpec_org.xtc.tp.jsdump("EXTRACT: onEndAllAttachments "+extractIDX+" "+extractCount);      
      extractIDX++;
      if(extractIDX<extractCount){
        tpec_org.xtc.tp.extractSingle();
      } else {
        Services.prefs.setBoolPref("mail.inline_attachments", extractInline);
        if(extractArray.length>0){
          extractIDX = 0;
          tpec_org.xtc.tp.saveSingle();
        }
      }
    },
    onEndMsgDownload: function() {},
    onEndMsgHeaders: function(aUrl) {},
    onMsgHasRemoteContent: function(aMsgHdr, aContentURI) {},
    securityInfo: null,
    mDummyMsgHeader: null,
    properties: null,
    resetProperties: function () {
      this.attachmentCount = 0;
    },
  };
  
  pub.extractSingle = function(){
    var aMsg;
    var uri; 
    
    aMsg =  extractMessages[extractIDX];
    uri = aMsg.folder.getUriForMsg(aMsg);
    try {
      var msgWindow = Cc["@mozilla.org/messenger/msgwindow;1"].createInstance(Ci.nsIMsgWindow);
      msgWindow.msgHeaderSink = gMessageHeaderSink;      
      let msgService = messenger.messageServiceFromURI(uri);
      gStreamListener.init();
      let streamURI = msgService.streamMessage(uri,gStreamListener,msgWindow, null, true, "",null);
    } catch (e) {
      tpec_org.xtc.tp.jsdump("error in extractSingle : "+e);
      extractIDX++;
      if(extractIDX<extractCount){
        tpec_org.xtc.tp.extractSingle();
      } else {
        Services.prefs.setBoolPref("mail.inline_attachments", extractInline);
        if(extractArray.length>0){
          extractIDX = 0;
          tpec_org.xtc.tp.saveSingle();
        }
      }

    }
    
  };

  pub.saveSingle = function(){
  
    var optwin = window.openDialog("chrome://thunderpec/content/extractTP.xul","","centerscreen, dialog, modal=yes, chrome",{path:extractPath,earray:extractArray});
    
  };

  return pub;
}();


