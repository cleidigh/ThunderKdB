"use strict";

Components.utils.import("resource:///modules/mailServices.js");
Components.utils.import("chrome://thunderpec/content/globalsTP.jsm");

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.compose) tpec_org.xtc.tp.compose = {};



tpec_org.xtc.tp.compose = function(){
  
  function pub(){};

  var prefTP = null;
  var localPref = "";
  var senderIdentity = "";
  var tmpPref = "";
  var tmpDirFile = null;
  var tmpDir = "";
  var sha256 = "";
  var idx = 0;
  var nBox = null;
  
  var autoarch = 0;
  
  var isDeposito = false;
  var encPresented = false;
  var depPresented = false;
  var depPecPresented = false;
  var depPecDestination = false;
  var pecDestination = false;
  var destErrorCount = 0;
  var destErrorString = document.createDocumentFragment();
  
  var daddress = [];
  var jaddress = {};
  
  var timer;
  var checkcompose = {
    notify : function(timer){
       
      //tpec_org.xtc.tp.compose.jsdump("Compose gMsgCompose "+gMsgCompose);
      if(gMsgCompose==null){
        tpec_org.xtc.tp.compose.unload();
        return;
      }
      
      if(prefTP.getShareData()=="on"){
        let addressingWidgetItems = document.querySelectorAll("#addressingWidget .addressingWidgetItem");
        //tpec_org.xtc.tp.compose.jsdump("Compose DEST LEN: "+addressingWidgetItems.length);
        let obtainedFields = [];
        for (let i = 0; i < addressingWidgetItems.length; i++) {
          let addrTextbox = addressingWidgetItems[i].querySelector("textbox");
          if(!addrTextbox.value)continue;
          let eaddr = MailServices.headerParser.extractHeaderAddressMailboxes(addrTextbox.value).split(",");
          for(var j=0;j<eaddr.length;j++){
            let taddr = MailServices.headerParser.extractHeaderAddressMailboxes(eaddr[j]);
            if((taddr.includes("@", 1) && !taddr.endsWith("@")) && !(taddr in jaddress)){
              tpec_org.xtc.tp.compose.jsdump("Compose DEST: "+daddress.length+" "+taddr);
              let saddress = {};
              jaddress[taddr] = 1;
              saddress["e"] = taddr;
              saddress["v"] = -1;
              saddress["p"] = "no";
              saddress["s"] = "no.error";
              saddress["c"] = "";
              saddress["m"] = "";
              saddress["n"] = "";  
              daddress.push(saddress);                      
            }
          }
        }
  
        for(let i=0; i<daddress.length;i++){
          if(daddress[i]["v"]==-1){
            try{
              var http = new XMLHttpRequest();
              var url = "https://data.pocketpec.it/tpec/validate.php";
              var params = "e="+daddress[i]["e"];
              http.open("GET", url+"?"+params, true);
              http.onreadystatechange = function() {//Call a function when the state changes.
                  if(http.readyState == 4 && http.status == 200) {
                      tpec_org.xtc.tp.compose.jsdump("VALIDATE "+http.responseText);
                      if(http.responseText.indexOf("OK:")==0){
                        let response = JSON.parse(http.responseText.slice(3));
                        let errCount = 0;
                        let errString = "";
                        for(let j=0;j<daddress.length;j++){
                          if(daddress[j]["e"]==response["e"]){
                            daddress[j]["v"] = 0;
                            daddress[j]["p"] = response["p"];
                            daddress[j]["s"] = response["s"];
                            daddress[j]["c"] = response["c"];
                            daddress[j]["m"] = response["m"];
                            daddress[j]["n"] = response["n"]; 
                            //verify PEC 
                            var email = MailServices.headerParser.extractHeaderAddressMailboxes(document.getElementById("msgIdentity").selectedItem.label);
                            if(daddress[j]["p"]=="yes" && !prefTP.check(email) && !depPecDestination){
                              depPecDestination = true;
                              let button1 = {
                                  isDefault: false,
                                  label: stringBundle.GetStringFromName('tpec.yes'),
                                  callback: tpec_org.xtc.tp.compose.senderYES,
                                  type: "", 
                                  popup: null
                              };
                              let button2 = {
                                  isDefault: false,
                                  label: stringBundle.GetStringFromName('tpec.no'),
                                  callback: tpec_org.xtc.tp.compose.senderNO,
                                  type: "", 
                                  popup: null
                              };
                              if(prefTP.getDefaultPec()!=""){
                                nBox.appendNotification(
                                  stringBundle.GetStringFromName('tpec.compose.pec'), 
                                  "TPcomposePEC",
                                  "chrome://thunderpec/content/img/qfbon.png",
                                  nBox.PRIORITY_INFO_HIGH, 
                                  [button1,button2]
                                );
                              } else {
                                nBox.appendNotification(
                                  stringBundle.GetStringFromName('tpec.compose.pec.nodflt'), 
                                  "TPcomposePEC",
                                  "chrome://thunderpec/content/img/qfbon.png",
                                  nBox.PRIORITY_INFO_HIGH, 
                                  []
                                );
                              }
                            }
                            if(daddress[j]["p"]=="yes" && prefTP.check(email) && !pecDestination && email!=prefTP.getDefaultPec() && prefTP.getDefaultPec()!=""){
                              pecDestination = true;
                              let button1 = {
                                  isDefault: false,
                                  label: stringBundle.GetStringFromName('tpec.yes'),
                                  callback: tpec_org.xtc.tp.compose.senderYES,
                                  type: "", 
                                  popup: null
                              };
                              let button2 = {
                                  isDefault: false,
                                  label: stringBundle.GetStringFromName('tpec.no'),
                                  callback: tpec_org.xtc.tp.compose.senderNO,
                                  type: "", 
                                  popup: null
                              };
                              nBox.appendNotification(
                                stringBundle.GetStringFromName('tpec.compose.defaultpec'), 
                                "TPcomposePEC",
                                "chrome://thunderpec/content/img/qfbon.png",
                                nBox.PRIORITY_INFO_HIGH, 
                                [button1,button2]
                              );
                            }

                            var aDBConnection = ThunderPecSql.dbConnection; 
                            var eestmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pecdata WHERE pec LIKE :pec;");
                            eestmt.params.pec = daddress[j]["e"];
                            eestmt.executeAsync({
                              rows:0,
                              modified: 0,
                              handleResult: function(aResultSet) {
                                this.rows = 1;
                                var row = aResultSet.getNextRow();
                                this.modified =  row.getResultByName("modified");
                              },
                              handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x100");},
                              handleCompletion: function(aReason) {
                                if(this.rows==0 && daddress[j]["s"]!="no.error"){
                                  var query =  "INSERT INTO pecdata(pec,status,created,modified,sync) VALUES(:pec,:status,:created,:modified,0);";
                                  tpec_org.xtc.tp.compose.jsdump("DATICERT STATUS: "+query);
                                  var eistmt = ThunderPecSql.dbConnection.createStatement(query);
                                  eistmt.params.pec = daddress[j]["e"];
                                  eistmt.params.status = daddress[j]["s"];
                                  eistmt.params.created = daddress[j]["c"]*1000;
                                  eistmt.params.modified = daddress[j]["m"]*1000;
                                  eistmt.executeAsync({
                                    handleResult: function(aResultSet) {},
                                    handleError: function(aError) {tpec_org.xtc.tp.compose.jsdump("DB LISTENER ERROR 0x16");},
                                    handleCompletion: function(aReason) {}
                                  });
                                  eistmt.finalize();
                                } else {
                                  if(daddress[j]["s"]!="no.error"){
                                    if(daddress[j]["m"]*1000>this.modified){
                                      var query = "UPDATE pecdata SET status=:status,modified=:modified,sync=0 WHERE pec LIKE :pec;";
                                      var eustmt = ThunderPecSql.dbConnection.createStatement(query);
                                      eustmt.params.status = daddress[j]["s"];
                                      eustmt.params.modified = daddress[j]["m"]*1000;
                                      eustmt.params.pec = daddress[j]["e"];
                                      eustmt.executeAsync(null);
                                      eustmt.finalize();
                                    }
                                  } else {
                                    var query = "DELETE FROM pecdata WHERE pec LIKE :pec;"
                                    var ustmt = ThunderPecSql.dbConnection.createStatement(query); 
                                    ustmt.params.pec = daddress[j]["e"];
                                    ustmt.executeAsync(null);
                                    ustmt.finalize();
                                  }
                                }
                              }
                             });
                             eestmt.finalize();
                             //popup error
                             
                          }
                        }
                      }
                  }
              }
              http.send(params); 
              tpec_org.xtc.tp.compose.jsdump("VALIDATE CALL SERVER");  
             } catch(e){
                tpec_org.xtc.tp.compose.jsdump("VALIDATE CALL SERVER EXCEPTION "+e);   
             } 
          }
        }
        
        let errCount = 0;
        let errString = "";
        destErrorString = document.createDocumentFragment();
        for(let i=0; i<daddress.length;i++){
          if(daddress[i]["v"]==0 && daddress[i]["s"]!="no.error"){
            errCount++;
            let strdata = new Date(daddress[i]["m"]*1000);
            let errSingle = stringBundle.GetStringFromName('tpec.compose.derror').replace('*pec*',daddress[i]["e"]);
            errSingle = errSingle.replace("*data*",strdata.toLocaleString());
            errSingle = errSingle.replace("*cnt*",daddress[i]["n"]);
            errSingle = errSingle.replace("*errore*",daddress[i]["s"]);
            errString += errSingle;
            //estErrorString.appendChild(document.createRange().createContextualFragment('<b>black text</b>'));
            //destErrorString.appendChild(document.createTextNode(errSingle));
            //destErrorString.appendChild(document.createElement("br"));
            //tpec_org.xtc.tp.compose.jsdump("DEST ERROR "+errSingle);
          }
        }

        var tempDiv = document.createElement("div");
        tempDiv.innerHTML = errString;
        var fragment = document.createDocumentFragment();
        while(tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild)
        }
        destErrorString = fragment;

        //destErrorString = document.createRange().createContextualFragment('<p>black text</p><p>red text</p>');
        if(errCount>destErrorCount){
          tpec_org.xtc.tp.compose.jsdump("DEST ERROR NOTIFICATION "+errCount+" "+destErrorCount);
          destErrorCount = errCount; 
          let notification = nBox.getNotificationWithValue("TPdestError");
          if(notification){
            tpec_org.xtc.tp.compose.jsdump("REMOVE NOTIFICATION");
            nBox.removeNotification(notification);
          }
          nBox.appendNotification(
            destErrorString, 
            "TPdestError",
            "chrome://thunderpec/content/img/qfbon.png",
            nBox.PRIORITY_INFO_HIGH, 
            []
          );
        }

        
      }

      if(!isDeposito && document.getElementById("msgSubject").value.indexOf("DEPOSITO")==0) {
        tpec_org.xtc.tp.compose.jsdump("Compose DEPOSITO "+document.getElementById("msgSubject").value);
        isDeposito = true; 
      }
      if(isDeposito){
        if(!depPresented){  // DEPOSITO: parametri di default
          tpec_org.xtc.tp.compose.jsdump("Compose deposito settings"); 
          depPresented = true;
          let button1 = {
              isDefault: false,
              label: stringBundle.GetStringFromName('tpec.yes'),
              callback: tpec_org.xtc.tp.compose.depYES,
              type: "", 
              popup: null
          };
          let button2 = {
              isDefault: false,
              label: stringBundle.GetStringFromName('tpec.no'),
              callback: tpec_org.xtc.tp.compose.depNO,
              type: "", 
              popup: null
          };
          nBox.appendNotification(
            stringBundle.GetStringFromName('tpec.compose.deposito'), 
            "TPdepSettings",
            "chrome://thunderpec/content/img/qfbon.png",
            nBox.PRIORITY_INFO_HIGH, 
            [button1,button2]
            );
        }
        if(!depPecPresented){ // DEPOSITO: indirizzo PEC sender
          depPecPresented = true;
          var email = MailServices.headerParser.extractHeaderAddressMailboxes(document.getElementById("msgIdentity").selectedItem.label);
          tpec_org.xtc.tp.compose.jsdump("Compose deposito pec address "+email); 
          if(prefTP.check(email)) {
            let button1 = {
                isDefault: false,
                label: stringBundle.GetStringFromName('tpec.yes'),
                callback: tpec_org.xtc.tp.compose.senderYES,
                type: "", 
                popup: null
            };
            let button2 = {
                isDefault: false,
                label: stringBundle.GetStringFromName('tpec.no'),
                callback: tpec_org.xtc.tp.compose.senderNO,
                type: "", 
                popup: null
            };
            nBox.appendNotification(
              stringBundle.GetStringFromName('tpec.compose.defaultpec'), 
              "TPdefaultPEC",
              "chrome://thunderpec/content/img/qfbon.png",
              nBox.PRIORITY_INFO_HIGH, 
              [button1,button2]
              );
          } else {
              if(prefTP.getDefaultPec()!=""){
                tpec_org.xtc.tp.compose.senderDfltPec();
              } else {
              nBox.appendNotification(
                stringBundle.GetStringFromName('tpec.compose.pec.nodflt'), 
                "TPnoPEC",
                "chrome://thunderpec/content/img/qfbon.png",
                nBox.PRIORITY_INFO_HIGH, 
                []
                );
              }
          }
        }        
        if(!encPresented){ // DEPOSITO: attachment ENC
          tpec_org.xtc.tp.compose.jsdump("Compose search .enc attachment"); 
          var encpresent = false;
          var bucket = GetMsgAttachmentElement();
          tpec_org.xtc.tp.compose.jsdump("Compose attachment "+bucket.childNodes.length); 
          if(bucket.childNodes.length!=0){
            for(var idx=0; idx < bucket.childNodes.length;idx++){
              var attachment = bucket.childNodes[idx].attachment;
              if(attachment){
                var attachmentName = attachment.name.toLowerCase();
                if(attachmentName.indexOf(".enc", attachmentName.length - ".enc".length)!==-1){
                  encpresent = true;
                  tpec_org.xtc.tp.compose.jsdump("Compose .enc attachment found "+attachmentName); 
                  break;
                }
              }
            } 
          }
        
          if(!encpresent){
            encPresented = true;
            let button1 = {
                isDefault: false,
                label: stringBundle.GetStringFromName('tpec.yes'),
                callback: tpec_org.xtc.tp.compose.encYES,
                type: "", 
                popup: null
            };
            let button2 = {
                isDefault: false,
                label: stringBundle.GetStringFromName('tpec.no'),
                callback: tpec_org.xtc.tp.compose.encNO,
                type: "", 
                popup: null
            };
            nBox.appendNotification(
              stringBundle.GetStringFromName('tpec.enc.notice'), 
              "TPencAttach",
              "chrome://thunderpec/content/img/qfbon.png",
              nBox.PRIORITY_INFO_HIGH, 
              [button1,button2]
              );
          }
        }
      }
    }
  };

  pub.encYES = function(theNotification, buttonInfo, eventTarget) {
    var attc =  document.getElementById("button-attachPopup_attachFileItem");
    var commandA = document.createEvent("XULCommandEvent");
    commandA.initCommandEvent("command", true, true, window, 0, false, false,false, false, null);
    attc.dispatchEvent(commandA);
  };
  pub.encNO = function(theNotification, buttonInfo, eventTarget) {
      
  };
  pub.depYES = function(theNotification, buttonInfo, eventTarget) {
    var plain =  document.getElementById("format_plain");
    var commandP = document.createEvent("XULCommandEvent");
    commandP.initCommandEvent("command", true, true, window, 0, false, false,false, false, null);
    plain.dispatchEvent(commandP);
    
    localPref =  prefTP.getDepReceipt();
    tpec_org.xtc.tp.compose.jsdump("Setting receipt to: "+localPref);
  };
  pub.depNO = function(theNotification, buttonInfo, eventTarget) {
      
  };
  pub.senderYES = function(theNotification, buttonInfo, eventTarget) {
      tpec_org.xtc.tp.compose.senderDfltPec();
  };
  pub.senderNO = function(theNotification, buttonInfo, eventTarget) {
      
  };


  var stringBundle;
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService); 
  
    pub.jsdump = function(str){
      //if(prefTP.getDebug()){
      //  Components.classes['@mozilla.org/consoleservice;1']
      //            .getService(Components.interfaces.nsIConsoleService)
      //            .logStringMessage("ThunderPEC: "+str);
      //  }
      tpecGlobals.jsdump(str);
    };
    
    
    pub.init = function(){
        prefTP = new ThunderPecPrefs();
        prefTP.init();
        localPref =  "";
        
        nBox = document.getElementById("tpecNotification");
        tpec_org.xtc.tp.compose.jsdump("Compose NBOX: "+nBox);
        nBox.removeAllNotifications(true);
        
        isDeposito = false;
        encPresented = false;
        depPresented = false;
        depPecPresented = false;
        depPecDestination = false;
        pecDestination = false;
        destErrorCount = 0;
        destErrorString = document.createDocumentFragment();
        daddress = [];
        jaddress = {};

        
        var stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);
        stringBundle = stringBundleService.createBundle("chrome://thunderpec/locale/thunderpec.properties");
        //stringBundle = document.getElementById("tpecStringBundle");
        
        // wisestamp patch
        tpec_org.xtc.tp.compose.jsdump("Compose: "+tpecGlobals.tmpDir+" "+stringBundle); 
        tpec_org.xtc.tp.compose.jsdump("Compose autoarch: "+prefTP.getAutoArchive()); 
        

        var m = null;
        
        var x = document.getElementById("msgComposeAttachmentItemContext");
        if(x)m=x;
        var y = document.getElementById("msgComposeAttachmentContext");
        if(y)m=y;
        
        var found = -1;
        var cl = m.childNodes.length
        for(var i=0;i<cl;i++){
          tpec_org.xtc.tp.compose.jsdump("SHA256 "+m.childNodes[i].label); 
          if(m.childNodes[i].label=="SHA256"){
            tpec_org.xtc.tp.compose.jsdump("SHA256 menu found"); 
            found = 1;
            break;
          }
        }
        
        if(found==-1){
          tpec_org.xtc.tp.compose.jsdump("SHA256 adding menu"); 
          var tempItem = document.createElement("menuseparator");
          if(m)m.appendChild(tempItem);
  
          var tempItem = document.createElement("menuitem");
          tempItem.setAttribute("label", "SHA256");
          tempItem.setAttribute("value","SHA256");
          tempItem.setAttribute("oncommand","tpec_org.xtc.tp.compose.attachSHA();");
          if(m)m.appendChild(tempItem);
        }

        tpec_org.xtc.tp.compose.jsdump("SHA256 menu"+x+" "+y); 
        
        // wisestamp patch

        senderIdentity = gCurrentIdentity.email;
        if(senderIdentity!=""){
           if(prefTP.check(senderIdentity)){
              document.getElementById("tpecCompose").hidden = false;
           } else {
              document.getElementById("tpecCompose").hidden = true;
           }
        }
        
        if(prefTP.getAutoArchive()=='on'){
          if(prefTP.getArchiveDir()!='') {
            autoarch = 1;
            document.getElementById("tpecZIP").setAttribute("checked",true);
          } else {
            var result = prompts.confirm(null,stringBundle.GetStringFromName('tpec.error'),stringBundle.GetStringFromName('tpec.aa.notice'));
            if(result){
              var nsIFilePicker = Components.interfaces.nsIFilePicker;
              var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
              fp.init(window, stringBundle.GetStringFromName('tpec.aa.folder'), nsIFilePicker.modeGetFolder);
              /*
              var res = fp.show();
              if (res != nsIFilePicker.returnCancel){
                var thefile = fp.file;
                tpec_org.xtc.tp.compose.jsdump("AA FOLDER: "+thefile.path);
                prefTP.setArchiveDir(thefile.path);
                tpecGlobals.prefTP.reread();
                autoarch = 1;
                document.getElementById("tpecZIP").setAttribute("checked",true);
              }  else {
                autoarch = 0;
                document.getElementById("tpecZIP").removeAttribute("checked");
              }
              */
              fp.open(rv => {
                if (rv != nsIFilePicker.returnOK || !fp.file) {
                  autoarch = 0;
                  document.getElementById("tpecZIP").removeAttribute("checked");
                  return;
                }
                var thefile = fp.file;
                tpec_org.xtc.tp.compose.jsdump("AA FOLDER: "+thefile.path);
                prefTP.setArchiveDir(thefile.path);
                tpecGlobals.prefTP.reread();
                autoarch = 1;
                document.getElementById("tpecZIP").setAttribute("checked",true);
              });
              
            } else {
              autoarch = 0;
              document.getElementById("tpecZIP").removeAttribute("checked");
            }
          }
        } else {
          document.getElementById("tpecZIP").removeAttribute("checked");
        }
        
    tpec_org.xtc.tp.compose.jsdump("Compose TYPE "+gComposeType+" "+(gComposeType==Components.interfaces.nsIMsgCompType.MailToUrl)); 
    tpec_org.xtc.tp.compose.jsdump("Compose SENDER "+ MailServices.headerParser.extractHeaderAddressMailboxes(document.getElementById("msgIdentity").selectedItem.label)); 
    var subject = document.getElementById("msgSubject");
    var comptype =  Components.interfaces.nsIMsgCompType;
    if(subject.value.indexOf("DEPOSITO")==0 && (gComposeType==comptype.MailToUrl || gComposeType==comptype.New)) {
      tpec_org.xtc.tp.compose.jsdump("Compose DEPOSITO "+subject);
      isDeposito = true; 
       }
    timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
    timer.initWithCallback(checkcompose, 2000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    };
    
    pub.unload = function(){
      if(timer!=null){
        tpec_org.xtc.tp.compose.jsdump("Compose TIMER STOP ");
        timer.cancel();
      }
    }



    pub.senderDfltPec = function(){
      if(prefTP.getDefaultPec()!=""){
        var idt = document.getElementById("msgIdentityPopup");
        var email = "";
        for(var i=0;i<idt.childNodes.length;i++){
          email = idt.childNodes[i].label;
          tpec_org.xtc.tp.compose.jsdump("IDENTITY "+email); 
          if(email.indexOf(prefTP.getDefaultPec())!=-1){
            tpec_org.xtc.tp.compose.jsdump("IDENTITY DEFAULT PEC FOUND");
            document.getElementById("msgIdentity").selectedItem = idt.childNodes[i]; 
            var commandM = document.createEvent("XULCommandEvent");
            commandM.initCommandEvent("command", true, true, window, 0, false, false,false, false, null);
            document.getElementById("msgIdentity").dispatchEvent(commandM);
            break;
          }
        }
      }
    }

    pub.sender = function(){
        senderIdentity = gCurrentIdentity.email;
        if(senderIdentity!=""){
           if(prefTP.check(senderIdentity)){
              document.getElementById("tpecCompose").hidden = false;
           } else {
              document.getElementById("tpecCompose").hidden = true;
           }
        }
    }
    
    pub.receiptMenuShow = function(){
      if(prefTP==null){
        prefTP = new ThunderPecPrefs();
        prefTP.init();
        //localPref =  prefTP.getReceipt();
      }
      //senderIdentity = document.getElementById("msgIdentity").getAttribute('description');
      senderIdentity = gCurrentIdentity.email;
      if(senderIdentity!=""){
         if(prefTP.check(senderIdentity)){
            document.getElementById("tpecReceipt").setAttribute("disabled", "false");
         } else {
            document.getElementById("tpecReceipt").setAttribute("disabled", "true");
         }
      }
    };

    pub.receiptMenu = function(){
      if(prefTP==null){
        prefTP = new ThunderPecPrefs();
        prefTP.init();
        //localPref =  prefTP.getReceipt();
      }
      //senderIdentity = document.getElementById("msgIdentity").getAttribute('description');
      senderIdentity = gCurrentIdentity.email;
      if(senderIdentity!=""){
         if(prefTP.check(senderIdentity)){
            var receipt = localPref;
            if(receipt==""){
              receipt =  prefTP.getReceipt();
            }
            var menuC = document.getElementById("tpecComplete");
            var menuB = document.getElementById("tpecBrief");
            var menuS = document.getElementById("tpecSynth");
            
            menuC.setAttribute("checked", false);
            menuB.setAttribute("checked", false);
            menuS.setAttribute("checked", false);
            
            if(receipt=="completa")menuC.setAttribute("checked", true);
            if(receipt=="breve")menuB.setAttribute("checked", true);
            if(receipt=="sintetica")menuS.setAttribute("checked", true);        
         } 
      }
    };

    pub.setReceiptType = function(r){
      localPref = r;
    };

    pub.send = function(r){
      
      //tpec_org.xtc.tp.compose.unload();
      
      if(prefTP==null){
        prefTP = new ThunderPecPrefs();
        prefTP.init();
        //localPref =  prefTP.getReceipt();
      }
      //senderIdentity = document.getElementById("msgIdentity").getAttribute('description');
      if(localPref==""){
        localPref =  prefTP.getReceipt();
      }
      senderIdentity = gCurrentIdentity.email;
      if(senderIdentity!=""){
         if(prefTP.check(senderIdentity)){
          if(localPref!="completa"){
            if ("otherRandomHeaders" in gMsgCompose.compFields) {
              // TB <= 36
              gMsgCompose.compFields.otherRandomHeaders += "X-TipoRicevuta: "+localPref+"\r\n";
              //gMsgCompose.compFields.otherRandomHeaders += hdr +": " + val + "\r\n";
            } else {
              gMsgCompose.compFields.setHeader("X-TipoRicevuta", localPref);
            }
          }
          if(autoarch==1){
            tpec_org.xtc.tp.compose.jsdump("SEND AUTOARCH "+senderIdentity+" "+gMsgCompose.compFields.subject);
            var csender = senderIdentity;
            var csubject = gMsgCompose.compFields.subject;
            var aDBConnection = ThunderPecSql.dbConnection;
            var query = "SELECT * FROM autoarch WHERE msgId LIKE '' AND sender LIKE '"+senderIdentity+"' AND subject LIKE '"+gMsgCompose.compFields.subject+"';";
            tpec_org.xtc.tp.compose.jsdump("SEND AUTOARCH "+query);
            var stmt = aDBConnection.createStatement("SELECT * FROM autoarch WHERE msgId LIKE '' AND sender LIKE :sender AND subject LIKE :subject;"); 
            stmt.params.sender = csender;
            stmt.params.subject = csubject;
            tpec_org.xtc.tp.compose.jsdump("SEND AUTOARCH "+query);
            stmt.executeAsync({
              rows:0,
              handleResult: function(aResultSet) {this.rows = 1;},
              handleError: function(aError) {tpec_org.xtc.tp.compose.jsdump("SELECT AUTOARCH ERROR "+aError.message);},
              handleCompletion: function(aReason) {
                tpec_org.xtc.tp.compose.jsdump("SELECT ROWS "+this.rows);
                if (aReason==Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED && this.rows==0){
                  tpec_org.xtc.tp.compose.jsdump("SELECT INSERTING NEW ROW");
                  var st = aDBConnection.createStatement("INSERT INTO autoarch(msgId,pecMsgId,sender,subject,destination,zip) VALUES('','',:sender,:subject,'','');");
                  st.params.sender =  csender;
                  st.params.subject =  csubject;
                  st.executeAsync({
                    handleResult: function() {},
                    handleError: function(aError) {tpec_org.xtc.tp.compose.jsdump("INSERT AUTOARCH ERROR "+aError.message);},
                    handleCompletion: function(aReason) {tpec_org.xtc.tp.compose.jsdump("ROW INSERTED");}
                  });
                  st.finalize();
                }
              }
            });
            stmt.finalize();
          }
         } 
      }
    };

    pub.searchPA = function() {
      var params =  { from: "compose", to: null, cc:null };
      window.openDialog("chrome://thunderpec/content/spcdataTP.xul","","centerscreen, dialog, modal=yes, chrome",params);
      if(params.to!=null)awAddRecipients(gMsgCompose.compFields, "addr_to", params.to);
      if(params.cc!=null)awAddRecipients(gMsgCompose.compFields, "addr_cc", params.cc);
    }
    
    pub.toHexString = function(charCode){
      return ("0" + charCode.toString(16)).slice(-2);
    }

    pub.allSHA = function(aSHA){
      if(aSHA=='start'){
        aSHA = "";
        idx = 0;
        document.getElementById("tpecSHA").disabled = true;
      }
      tpec_org.xtc.tp.compose.jsdump("allSHA "+aSHA); 
      var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                               .getService(Components.interfaces.nsIClipboardHelper);
      var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]  
                        .getService(Components.interfaces.nsIPromptService);  
      var bucket = GetMsgAttachmentElement();
      if(bucket.childNodes.length==0){
        document.getElementById("tpecSHA").disabled = false;
        return;
      }
      var sha256 = "";
      if(idx < bucket.childNodes.length){
        var attachment = bucket.childNodes[idx].attachment;
        if (attachment){
          var attachmentName = attachment.name; 
          var attachmentUrl = attachment.url; 
          var messagePrefix = /^mailbox-message:|^imap-message:|^news-message:/i;
          if (!messagePrefix.test(attachmentUrl)){
            tpec_org.xtc.tp.compose.jsdump("SHA256 attachmentUrl "+attachmentUrl); 
            var attachmentURI = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService)
                        .newURI(attachmentUrl, null, null);
            
            var file = attachmentURI.QueryInterface(Components.interfaces.nsIFileURL).file;
            var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]           
                          .createInstance(Components.interfaces.nsIFileInputStream);
            istream.init(file, 0x01, 0x0444, 0);
            var ch = Components.classes["@mozilla.org/security/hash;1"]
                               .createInstance(Components.interfaces.nsICryptoHash);
            ch.init(ch.SHA256);
            const PR_UINT32_MAX = 0xffffffff;
            ch.updateFromStream(istream, PR_UINT32_MAX);
            var hash = ch.finish(false);
            sha256 = "";
            for(var i in hash)sha256 += tpec_org.xtc.tp.compose.toHexString(hash.charCodeAt(i));
            sha256 = sha256.toUpperCase();
            //[tpec_org.xtc.tp.compose.toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
            sha256 = "FILE: "+attachmentName+"\n"+"SHA256: "+sha256;
            tpec_org.xtc.tp.compose.jsdump("SHA256 "+sha256+" "+attachmentName+" loop: "+idx); 
        
            var utc = (new Date(file.lastModifiedTime)).toISOString();  
            tpec_org.xtc.tp.compose.jsdump("TIMESTAMP "+file.lastModifiedTime+" "+utc);
            sha256 = sha256+"\n"+"TIMESTAMP: "+utc; 
            aSHA += sha256+"\n\n";
            idx++;
            tpec_org.xtc.tp.compose.allSHA(aSHA);
/*
            try{
              var request = new XMLHttpRequest();
              request.open('GET', 'http://gate.pocketpec.com/gate/utc.php', true);
              request.onreadystatechange = function (oEvent) {
                //tpec_org.xtc.tp.compose.jsdump("TIMESTAMP "+request.readyState+" "+request.status); 
                if (request.readyState === 4) {
                  if (request.status === 200) {
                    var result = request.responseText.trim();
                    var chunks = result.split("::");
                    tpec_org.xtc.tp.compose.jsdump("TIMESTAMP "+request.responseText+" "+chunks[1]); 
                    if(chunks.length==2){
                      sha256 = sha256+"\n"+"TIMESTAMP: "+chunks[1];
                    }
                    request = null;
                    aSHA += sha256+"\n\n";
                    idx++;
                    tpec_org.xtc.tp.compose.allSHA(aSHA);
                  } else {
                    aSHA += sha256+"\n\n";
                    idx++;
                    tpec_org.xtc.tp.compose.allSHA(aSHA);
                  }
                }
              };
              request.send(null);
    
            } catch(e){
              tpec_org.xtc.tp.compose.jsdump(e);
              aSHA += sha256+"\n\n";
              idx++;
              tpec_org.xtc.tp.compose.allSHA(aSHA);
            }
*/
            
 
          }
        }
      } else {
        document.getElementById("tpecSHA").disabled = false;
        gClipboardHelper.copyString(aSHA);
        prompts.alert(null, "SHA256 (in Clipboard)", aSHA);
      }  
    }
    
    pub.attachSHA = function(){

        var bucket = GetMsgAttachmentElement();
        if (bucket.selectedItems.length == 1){
          var attachmentName = bucket.getSelectedItem(0).attachment.name; 
          var attachmentUrl = bucket.getSelectedItem(0).attachment.url; 
          var messagePrefix = /^mailbox-message:|^imap-message:|^news-message:/i;
          if (!messagePrefix.test(attachmentUrl)){
            tpec_org.xtc.tp.compose.jsdump("SHA256 attachmentUrl "+attachmentUrl); 
            var attachmentURI = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService)
                        .newURI(attachmentUrl, null, null);
            
            var file = attachmentURI.QueryInterface(Components.interfaces.nsIFileURL).file;
            var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]           
                          .createInstance(Components.interfaces.nsIFileInputStream);
            istream.init(file, 0x01, 0x0444, 0);
            var ch = Components.classes["@mozilla.org/security/hash;1"]
                               .createInstance(Components.interfaces.nsICryptoHash);
            ch.init(ch.SHA256);
            const PR_UINT32_MAX = 0xffffffff;
            ch.updateFromStream(istream, PR_UINT32_MAX);
            var hash = ch.finish(false);
            sha256 = "";
            for(var i in hash)sha256 += tpec_org.xtc.tp.compose.toHexString(hash.charCodeAt(i));
            sha256 = sha256.toUpperCase();
            //sha256 = [tpec_org.xtc.tp.compose.toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
            sha256 = "FILE: "+attachmentName+"\n"+"SHA256: "+sha256;
            tpec_org.xtc.tp.compose.jsdump("SHA256 "+sha256+" "+file.leafName); 
            var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                     .getService(Components.interfaces.nsIClipboardHelper);
            var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]  
                              .getService(Components.interfaces.nsIPromptService);  
        
            var utc = (new Date(file.lastModifiedTime)).toISOString();  
            tpec_org.xtc.tp.compose.jsdump("TIMESTAMP "+file.lastModifiedTime+" "+utc);
            sha256 = sha256+"\n"+"TIMESTAMP: "+utc; 
            gClipboardHelper.copyString(sha256);
            prompts.alert(null, "SHA256 (in Clipboard)", sha256);  
/*
            try{
              var request = new XMLHttpRequest();
              request.open('GET', 'http://gate.pocketpec.com/gate/utc.php', true);
              request.onreadystatechange = function (oEvent) {
                //tpec_org.xtc.tp.compose.jsdump("TIMESTAMP "+request.readyState+" "+request.status); 
                if (request.readyState === 4) {
                   tpec_org.xtc.tp.compose.jsdump("TIMESTAMP status"+request.status); 
                   if (request.status === 200) {
                    var result = request.responseText.trim();
                    tpec_org.xtc.tp.compose.jsdump("TIMESTAMP "+result); 
                    var chunks = result.split("::");
                    tpec_org.xtc.tp.compose.jsdump("TIMESTAMP "+request.responseText+" "+chunks[1]); 
                    if(chunks.length==2){
                      sha256 = sha256+"\n"+"TIMESTAMP: "+chunks[1];
                    }
                    gClipboardHelper.copyString(sha256);
                    prompts.alert(null, "SHA256 (in Clipboard)", sha256);  
                    request = null;
                  } else {
                    gClipboardHelper.copyString(sha256);
                    prompts.alert(null, "SHA256 (in Clipboard)", sha256);  
                  } 
                }
              };
              request.send(null);
    
            } catch(e){
              tpec_org.xtc.tp.compose.jsdump(e);
              gClipboardHelper.copyString(sha256);
              prompts.alert(null, "SHA256 (in Clipboard)", sha256);  
            }
*/            
 
          }
        } // if one attachment selected


    }
    
  pub.autoarchive = function(){
    if(autoarch==1){
      autoarch = 0;
      document.getElementById("tpecZIP").removeAttribute("checked");
    } else {
      if(prefTP.getArchiveDir()!='') {
        autoarch = 1;
        document.getElementById("tpecZIP").setAttribute("checked",true);
      } else {
        var result = prompts.confirm(null,stringBundle.GetStringFromName('tpec.error'),stringBundle.GetStringFromName('tpec.aa.notice'));
        if(result){
          var nsIFilePicker = Components.interfaces.nsIFilePicker;
          var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
          fp.init(window, stringBundle.GetStringFromName('tpec.aa.folder'), nsIFilePicker.modeGetFolder);
          /*
          var res = fp.show();
          if (res != nsIFilePicker.returnCancel){
            var thefile = fp.file;
            tpec_org.xtc.tp.compose.jsdump("AA FOLDER: "+thefile.path);
            prefTP.setArchiveDir(thefile.path);
            tpecGlobals.prefTP.reread();
            autoarch = 1;
            document.getElementById("tpecZIP").setAttribute("checked",true);
          }  else {
            autoarch = 0;
            document.getElementById("tpecZIP").removeAttribute("checked");
          }
          */
          fp.open(rv => {
            if (rv != nsIFilePicker.returnOK || !fp.file) {
              autoarch = 0;
              document.getElementById("tpecZIP").removeAttribute("checked");
              return;
            }
            var thefile = fp.file;
            tpec_org.xtc.tp.compose.jsdump("AA FOLDER: "+thefile.path);
            prefTP.setArchiveDir(thefile.path);
            tpecGlobals.prefTP.reread();
            autoarch = 1;
            document.getElementById("tpecZIP").setAttribute("checked",true);
          });
        } else {
          autoarch = 0;
          document.getElementById("tpecZIP").removeAttribute("checked");
        }
      }
    }
    tpec_org.xtc.tp.compose.jsdump("Compose autoarchive(): "+autoarch); 
  }

  return pub;
}();

