Components.utils.import("chrome://thunderpec/content/globalsTP.jsm");
Components.utils.import("chrome://thunderpec/content/xmlParserTP.jsm");

const PR_RDONLY      = 0x01;
const PR_WRONLY      = 0x02;
const PR_RDWR        = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND      = 0x10;
const PR_TRUNCATE    = 0x20;
const PR_SYNC        = 0x40;
const PR_EXCL        = 0x80;

"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.search) tpec_org.xtc.tp.search = {};

Components.utils.import("resource:///modules/gloda/mimemsg.js");
Components.utils.import("resource:///modules/gloda/connotent.js");

tpec_org.xtc.tp.search = function(){
  function pub(){};

  var xmlReader = Components.classes["@mozilla.org/saxparser/xmlreader;1"]
                        .createInstance(Components.interfaces.nsISAXXMLReader);
  var which = "";
  var xmlDoc = "";
  var msgHdr = null;
  var tmpDir = "";
  var htmlDoc = "";
  var attrs = null;
  var attrsArray = null;
  var zone = "";
  var currentView="";
  var folder = null;
  var msgId = null;
  var rifMsgId = null;
  var getChar = false;
  var getValue = "";
  var dstAddr = 0;
  var daticert = null;

  
  var searchSession = null;
  var searchPrefs = null;
  var searchCycle = 0;
  var tpecArrayHdrs = ["message-id", "X-Riferimento-Message-ID","X-Ricevuta"];
  var tpecFirstHeader = Components.interfaces.nsMsgSearchAttrib.OtherHeader + 1;
  var tpecContains = Components.interfaces.nsMsgSearchOp.Contains;
  
  var tpecSentHdr = null;
  var xmlSentHdr = new Array();
  var tpecNotificationsHdr = new Array();
  var timestampNotifications = new Array();
  var pctNotifications = new Array();
  var tpecIdx = 0;
  var pctFound = 0;
  var secondTry = 0;
  

  var fpaFound = 0;
  var fpaSentId = null;
  var fpaNotificationsId = new Array();
  var fpaReceiptId = new Array();
  var fpaSDI = "";
  var fpaIdx = 0;
  var fpaHdr = new Array();
  var fpaNotifications = new Array();
  var fpaDate = new Array();
  
  var certifiedHdr = new Array();
  var certIdx = 0;
    
  var sentMeta = null;
  var sentSnippet = null;
  var sentAttachments = null;
  
  var messenger;
  
  var dstAttribute = null;
  var msgAttribute = null;
  
  var showLegend = false;
  
  var prefTP;
  
  var char12;
  var char10;   
  
  var originalMsgId;
  var pecMsgId;
  
  var hasP7MBug = false;
  var sentMsgURL = null;
  
  var startHDR = null;
  var startFLD = null;
  
  var localFld = new Array();
  

  var translateStatus = new Array();
  translateStatus["accettazione"] = "A";
  translateStatus["non-accettazione"] = "NA";
  translateStatus["presa-in-carico"] = "PI";
  translateStatus["avvenuta-consegna"] = "AC";
  translateStatus["posta-certificata"] = "PEC";
  translateStatus["posta-certificata(pct)"] = "PCT";
  translateStatus["posta-certificata(pctok)"] = "PCT OK";
  translateStatus["posta-certificata(pctko)"] = "PCT KO";
  translateStatus["posta-certificata(pctne)"] = "PCT NE";
  translateStatus["errore-consegna"] = "EC";
  translateStatus["preavviso-errore-consegna"] = "PE";
  translateStatus["rilevazione-virus"] = "RV";
  
  translateStatus["fatturapa(RC)"] = "FRC";
  translateStatus["fatturapa(MC)"] = "FMC";
  translateStatus["fatturapa(MT)"] = "FMT";
  translateStatus["fatturapa(ECOK)"] = "FEC";
  translateStatus["fatturapa(NEOK)"] = "FNE";
  translateStatus["fatturapa(ECKO)"] = "FEC";
  translateStatus["fatturapa(NEKO)"] = "FNE";
  translateStatus["fatturapa(NS)"] = "FNS";
  translateStatus["fatturapa(AT)"] = "FAT";
  translateStatus["fatturapa(DT)"] = "FDT";
  translateStatus["fatturapa(SE)"] = "FSE";
  
  var translateFPA = new Array();
  translateFPA["RC"] = "Ricevuta di consegna";
  translateFPA["MC"] = "Notifica di mancata consegna";
  translateFPA["MT"] = "File dei metadati";
  translateFPA["EC"] = "Notifica di esito cessionario - committente";
  translateFPA["NE"] = "Notifica esito cedente - prestatore";
  translateFPA["NS"] = "Notifica di scarto";
  translateFPA["AT"] = "Attestazione di avvenuta trasmissione della fattura con impossibilità di recapito";
  translateFPA["DT"] = "Notifica decorrenza termini";
  translateFPA["SE"] = "Notifica di scarto";
  

  
  var clearStatus = ["accettazione","avvenuta-consegna","presa-in-carico","posta-certificata","posta-certificata(pct)","posta-certificata(pctok)","fatturapa(ECOK)","fatturapa(NEOK)","fatturapa(RC)","fatturapa(MT)"];
  
  var stringBundle;
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService); 
  
  var showArchive = false; 

  
  pub.jsdump = function(str){
    if(prefTP.getDebug()){
      Components.classes['@mozilla.org/consoleservice;1']
                .getService(Components.interfaces.nsIConsoleService)
                .logStringMessage("ThunderPEC: "+str);
      prefTP.log(tmpDir,"searchTP: "+str+"\n");
      }
  }
  
  xmlReader.contentHandler = {
    startDocument: function() {
      attrs = new Array();
      getChar = false; 
      getValue = ""; 
      dstAddr = 0;
      tpec_org.xtc.tp.search.jsdump("start XML document processing");
    },
    endDocument: function() {
        tpec_org.xtc.tp.search.jsdump("stop XML document processing");
    },
    startElement: function(uri, localName, qName, attributes) {
      getChar = true;
      getValue = qName;
      if(!(getValue in attrs)){
        attrs[getValue] = new Array();
        }    
      if(getValue.toLowerCase()=="destinatari") {
        attrs[getValue][dstAddr] = new Array();
        attrsArray = attrs[getValue][dstAddr];
      } else {
        attrsArray = attrs[getValue];
      }
      attrsArray["_value"] = "";
      for(var i=0; i<attributes.length; i++) {
        attrsArray[attributes.getQName(i)]=attributes.getValue(i);
      }
    },
    endElement: function(uri, localName, qName) {
      getChar = false;
      getValue = "";
      if(qName.toLowerCase()=="destinatari") {
        dstAddr++;
      }
    },
    characters: function(value) {
      if(getChar)attrsArray["_value"] +=value;
    },
    processingInstruction: function(target, data) {
    },
    ignorableWhitespace: function(whitespace) {
    },
    startPrefixMapping: function(prefix, uri) {
    },
    endPrefixMapping: function(prefix) {
    },
    QueryInterface: function(iid) {
      if(!iid.equals(Components.interfaces.nsISupports) &&
         !iid.equals(Components.interfaces.nsISAXContentHandler))
        throw Components.results.NS_ERROR_NO_INTERFACE;
      return this;
    }
  }

  var esitoReader = Components.classes["@mozilla.org/saxparser/xmlreader;1"]
                      .createInstance(Components.interfaces.nsISAXXMLReader);
  var esitoAttrs = null;
  var esitoAttrsArray = null;
  var eAttrs = null;
  var esitoVal;

  esitoReader.contentHandler = {
    startDocument: function() {
      if(esitoAttrs==null)esitoAttrs = new Array();
      esitoAttrs[tpecIdx] = new Array();
      esitoAttrsArray =  esitoAttrs[tpecIdx];
      tpec_org.xtc.tp.search.jsdump("ESITOREADER XML "+tpecIdx);
      getChar = false; 
      getValue = ""; 
      dstAddr = 0;
      tpec_org.xtc.tp.search.jsdump("start esito XML document processing");
    },
    endDocument: function() {
        tpec_org.xtc.tp.search.jsdump("stop esito XML document processing");
    },
    startElement: function(uri, localName, qName, attributes) {
      eAttrs = new Array();
      for(var i=0; i<attributes.length; i++) {
        eAttrs[attributes.getQName(i)]=attributes.getValue(i);
      }
      getChar = true;
      getValue = qName;

      if(getValue.toLowerCase()=="idmsg") {
        esitoAttrsArray["idmsg"] = "";
        esitoVal = "idmsg";
      }
      if(getValue.toLowerCase()=="idmsgmitt") {
        esitoAttrsArray["idmsgmitt"] = "";
        esitoVal = "idmsgmitt";
      }
      if(getValue.toLowerCase()=="numeroruolo") {
        esitoAttrsArray["numeroruolo"] = "";
        esitoVal = "numeroruolo";
      }
      if(getValue.toLowerCase()=="codiceesito") {
        esitoAttrsArray["codiceesito"] = "";
        esitoVal = "codiceesito";
      }
      if(getValue.toLowerCase()=="descrizioneesito") {
        esitoAttrsArray["descrizioneesito"] = "";
        esitoVal = "descrizioneesito";
      }
      if(getValue.toLowerCase()=="data") {
        esitoAttrsArray["data"] = "";
        esitoVal = "data";
      }
      if(getValue.toLowerCase()=="ora") {
        esitoAttrsArray["zoneDesignator"] = eAttrs["zoneDesignator"];
        esitoAttrsArray["ora"] = "";
        esitoVal = "ora";
      }
    },
    endElement: function(uri, localName, qName) {
      getChar = false;
      getValue = "";
      esitoVal = "";

      if(qName.toLowerCase()=="idmsg") {
        esitoAttrsArray["idmsg"] = esitoAttrsArray["idmsg"].replace("&lt;","");
        esitoAttrsArray["idmsg"] = esitoAttrsArray["idmsg"].replace("&gt;","");
        esitoAttrsArray["idmsg"] = esitoAttrsArray["idmsg"].replace("<","");
        esitoAttrsArray["idmsg"] = esitoAttrsArray["idmsg"].replace(">","");
      }
    },
    characters: function(value) {
      if(getChar) {
        if(esitoAttrsArray!=null && esitoAttrsArray[esitoVal]!=null)esitoAttrsArray[esitoVal] +=value;
      }
    },
    processingInstruction: function(target, data) {
    },
    ignorableWhitespace: function(whitespace) {
    },
    startPrefixMapping: function(prefix, uri) {
    },
    endPrefixMapping: function(prefix) {
    },
    QueryInterface: function(iid) {
      if(!iid.equals(Components.interfaces.nsISupports) &&
         !iid.equals(Components.interfaces.nsISAXContentHandler))
        throw Components.results.NS_ERROR_NO_INTERFACE;
      return this;
    }
  }

  pub.init = function(){
    var xmlstring;
    var selectedArray;

    stringBundle = document.getElementById("tpecStringBundle");

    if("arguments" in window && window.arguments.length > 0) {
      xmlstring = window.arguments[0].xml;
      tmpDir = window.arguments[0].dir;
      folder = window.arguments[0].fld;
      selectedArray = window.arguments[0].archive;
      which = window.arguments[0].which;
      startHDR = window.arguments[0].msg;
      startFLD = window.arguments[0].start;
    }
    
      
    showArchive = (selectedArray!=null);
    
    prefTP = new ThunderPecPrefs();
    prefTP.init();

    // tpec 1.7.2
    if(startFLD!=null && typeof startFLD!=='undefined'){
      tpec_org.xtc.tp.search.jsdump("START FOLDER "+startFLD.name);
      localFld.push(startFLD);
    }
      
    searchPrefs =  Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefBranch);
    searchPrefs.setCharPref("mailnews.customHeaders", tpecArrayHdrs.join(": "));

    messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
    messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);

    char12 = 12;
    char10 = 10;   
    
    //v165
    if (prefTP.getOnlyEML()=='on'){
      document.getElementById("tpecArchiveExtended").setAttribute("checked", true);
    } else {
      document.getElementById("tpecArchiveExtended").setAttribute("checked", false);
    }
    
    //find local folder inbox and sent
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager); 
    var accounts = acctMgr.accounts;  
    var accNum = (accounts.Count?accounts.Count():accounts.length);
    var query = (accounts.queryElementAt?accounts.queryElementAt:accounts.QueryElementAt);
    for (var i = 0; i < accNum; i++) {  
      var account = query(i, Components.interfaces.nsIMsgAccount);
      tpec_org.xtc.tp.search.jsdump("FOLDER "+account.incomingServer.type+" "+account.incomingServer.rootFolder.name);
      if(account.incomingServer.type=="none"){
        var rootFld = account.incomingServer.rootFolder;
        var subFolders = rootFld.subFolders;
        while (subFolders.hasMoreElements()) {
          var nextFolder = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
          if ((nextFolder.flags & Components.interfaces.nsMsgFolderFlags.Inbox)==Components.interfaces.nsMsgFolderFlags.Inbox) {
              tpec_org.xtc.tp.search.jsdump("adding Inbox folder : ("+nextFolder.name+")");
              localFld.push(nextFolder);
          }
          if ((nextFolder.flags & Components.interfaces.nsMsgFolderFlags.SentMail)==Components.interfaces.nsMsgFolderFlags.SentMail) {
              tpec_org.xtc.tp.search.jsdump("adding SentMail folder : ("+nextFolder.name+")");
              localFld.push(nextFolder);
          }
        }
      }
    }
 

    if(!showArchive){
      tpec_org.xtc.tp.search.jsdump("SEARCH: show message status"); 
      
      document.getElementById("tpecReadButton").hidden = false;
      document.getElementById("tpecPrintButton").hidden = false;
      document.getElementById("tpecPintAllButton").hidden = false;
      document.getElementById("tpecLegendButton").hidden = false;
      document.title = stringBundle.getString('tpec.statuswindow');

      document.getElementById("tpecReadButton").setAttribute('disabled', true);     
      
      xmlDoc = xmlstring;
      if(which=="daticert")this.doSearch();
      if(which=="esitoatto")this.doSearchEsito();
      if(which=="fatturapa"){
        tpec_org.xtc.tp.search.jsdump("SEARCH: FPA START "+startHDR.messageId); 
        fpaFound = 1;
        var aDBConnection = ThunderPecSql.dbConnection; 
        var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
        stmt.params.mid =  startHDR.messageId;
        stmt.executeAsync({
          referenceId:"",
          fpaId:"",
          handleResult: function(aResultSet) {
            var row = aResultSet.getNextRow();
            this.referenceId =  row.getResultByName("referenceId");
            tpec_org.xtc.tp.search.jsdump("SEARCH: FPA REFERENCE "+this.referenceId);
          },
          handleError: function() {ThunderPecSql._log("SEARCH: REFERENCE ERROR 0x01");},
          handleCompletion: function(aReason) { 
            fpaSDI = this.referenceId;
            if(this.referenceId!=""){
              var nstmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE referenceId LIKE :mid;");          //select  fpa notification
              nstmt.params.mid = this.referenceId;
              nstmt.executeAsync({
                referenceId:"",
                fpaId:"",
                handleResult: function(aResultSet) {
                  for(var row=aResultSet.getNextRow();row;row=aResultSet.getNextRow()){
                    this.fpaId = row.getResultByName("msgId");
                    if(row.getResultByName("referencePecId")!="" && this.referenceId=="")this.referenceId = row.getResultByName("referencePecId");
                    fpaReceiptId.push(this.fpaId);
                    tpec_org.xtc.tp.search.jsdump("SEARCH: FPA RECEIPT FPA "+this.fpaId+" "+this.referenceId); 
                  }
                  tpec_org.xtc.tp.search.jsdump("SEARCH: FPA RECEIPT "+this.referenceId);
                },
                handleError: function() {ThunderPecSql._log("SEARCH: REFERENCE ERROR 0x02");},
                handleCompletion: function(aReason) { 
                  if(this.referenceId!=""){
                    var rstmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE referenceId LIKE :mid;");          //select  fpa receipt
                    rstmt.params.mid = this.referenceId;
                     rstmt.executeAsync({
                      referenceId:"",
                      fpaId:"",
                      handleResult: function(aResultSet) {
                        for(var row=aResultSet.getNextRow();row;row=aResultSet.getNextRow()){
                          this.fpaId = row.getResultByName("msgId");
                          if(row.getResultByName("referenceId")!="" && fpaSentId==""){
                            fpaSentId =  row.getResultByName("referenceId");
                            tpec_org.xtc.tp.search.jsdump("SEARCH: FPA SENT "+fpaSentId); 
                          }
                          fpaReceiptId.push(this.fpaId);
                          tpec_org.xtc.tp.search.jsdump("SEARCH: FPA NOTIFICATION "+this.fpaId); 
                        }
                        tpec_org.xtc.tp.search.jsdump("SEARCH: FPA NOTIFICATION "+this.referenceId);
                      },
                      handleError: function() {ThunderPecSql._log("SEARCH: REFERENCE ERROR 0x03");},
                      handleCompletion: function(aReason) { 
                        tpec_org.xtc.tp.search.doSearchFpa();
                      }
                    }); //select  fpa receipt end
                    rstmt.finalize();
                  }   //if
                }     //handleCompletion
              });     //select  fpa notification end
              nstmt.finalize();
            } else {
              tpec_org.xtc.tp.search.doSearchFpa();
            }         //if
          }           //handleCompletion
        });           //executeAsync
        stmt.finalize();

        
        /*
        var referenceId = "";
        var fpaId = ""
        if(stmt.executeStep()){
          referenceId =  stmt.row.referenceId;
          tpec_org.xtc.tp.search.jsdump("SEARCH: FPA REFERENCE "+referenceId); 
        }
        stmt.finalize();  
        fpaSDI = referenceId;
        if(referenceId!=""){
          var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE referenceId LIKE '"+referenceId+"';");          //select  fpa notification
          referenceId = "";
          while(stmt.executeStep()){
            fpaId = stmt.row.msgId;
            if(stmt.row.referencePecId!="" && referenceId=="")referenceId = stmt.row.referencePecId ;     //need this to find notifications
            fpaReceiptId.push(fpaId);
            tpec_org.xtc.tp.search.jsdump("SEARCH: FPA RECEIPT "+fpaId); 
          }
          stmt.finalize(); 
          if(referenceId!="") {
            fpaSentId = "";
            var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE referenceId LIKE '"+referenceId+"';");       //select PEC notifications
            while(stmt.executeStep()){
              fpaId = stmt.row.msgId;
              if(stmt.row.referencePecId!="" && fpaSentId==""){
                fpaSentId = stmt.row.referencePecId;     //need this to find sent message
                tpec_org.xtc.tp.search.jsdump("SEARCH: FPA SENT "+fpaSentId); 
                }
              fpaNotificationsId.push(fpaId);
              tpec_org.xtc.tp.search.jsdump("SEARCH: FPA NOTIFICATION "+fpaId); 
            }
            stmt.finalize(); 
          }
        }
        this.doSearchFpa();
        */
      }
    } else {
      tpec_org.xtc.tp.search.jsdump("SEARCH: process archive"); 

      document.getElementById("tpecReadButton").hidden = true;
      document.getElementById("tpecPrintButton").hidden = true;
      document.getElementById("tpecPintAllButton").hidden = true;
      document.getElementById("tpecLegendButton").hidden = true;
      document.title = stringBundle.getString('tpec.archivewindow');

      for (var i=0;i<selectedArray.length;i++){
        tpecNotificationsHdr.push(selectedArray[i]);
      }
      tpecIdx = 0;
      //certIdx = 0;
      //tpec_org.xtc.tp.search.processCertified();
      tpec_org.xtc.tp.search.processNotifications();
      
    }
  }

  pub.getP7MStatus = function(){
    return prefTP.getP7M();
  };

  pub.ok = function(){
    window.close();
  }

  pub.legend = function(){
    showLegend = !showLegend;
    tpec_org.xtc.tp.search.refresh();
  }

  pub.print = function(){
    var receipt = document.getElementById("tpecSearchViewer");
    receipt.contentWindow.print();
  }

  pub.printall = function(){
    tpec_org.xtc.tp.search.jsdump("Print all: "+hasP7MBug); 
    tpec_org.xtc.tp.search.jsdump("Print all: "+sentMsgURL); 
    
    //var receipt = document.getElementById("tpecSearchViewer");
    //receipt.contentWindow.print();
    
    var tpMessageList = new Array();
    if(tpecSentHdr){
      if(hasP7MBug){
        tpMessageList.push(sentMsgURL.spec);
      } else {
        tpMessageList.push(tpecSentHdr.folder.getUriForMsg(tpecSentHdr));
      }
    }
    
     for(var i = 0;i<tpecNotificationsHdr.length;i++){
       tpMessageList.push(tpecNotificationsHdr[i].folder.getUriForMsg(tpecNotificationsHdr[i]));
     }    

    var tpStatusFeedback = Components.classes["@mozilla.org/messenger/statusfeedback;1"]
                        .createInstance(Components.interfaces.nsIMsgStatusFeedback);
    //window.MsgStatusFeedback = new nsMsgStatusFeedback();
    //tpStatusFeedback.setWrappedStatusFeedback(window.MsgStatusFeedback);
    var msgType = Components.interfaces.nsIMsgPrintEngine.MNAB_PRINT_MSG;
    window.openDialog("chrome://messenger/content/msgPrintEngine.xul", "",
                      "chrome,dialog=no,all,centerscreen",
                      tpMessageList.length, tpMessageList, null,
                      false, msgType, window);
    
  }


  pub.callback = function(tpua){
    var inside;
     
    tpec_org.xtc.tp.search.jsdump(" Callback from utility: "+tpua.hasP7MBug); 
    if(tpua.hasP7MBug){
      hasP7MBug = true;
      sentMsgURL =  tpua.saveP7M(tmpDir);
      tpec_org.xtc.tp.search.jsdump("Msg URL: "+sentMsgURL);
      tpec_org.xtc.tp.search.jsdump(" Callback from utility: "+tpua.p7mattachments+":"+tpua.p7mattachments.length); 
      for(var k=0;k<tpua.p7mattachments.length ;k++){
        if(sentAttachments==null)sentAttachments = new Array();
        inside = false;
        for(var j=0;j<sentAttachments.length && !inside;j++){
          inside = sentAttachments[j].name.toLowerCase()==tpua.p7mattachments[k].toLowerCase();
        }
        if(!inside){
          var natt = new Array();
          natt['name'] =  tpua.p7mattachments[k];
          sentAttachments.push(natt);
          tpec_org.xtc.tp.search.jsdump("Adding p7m attachment: "+tpua.p7mattachments[k]);
        }
  
     }
 
    }
   
    certIdx = 0;
    tpec_org.xtc.tp.search.processCertified();
   //tpec_org.xtc.tp.search.processNotifications(); 
  
  }
  
  var tpecSearchListener = {
    onSearchHit: function(dbHdr, folder){ 
      if(searchCycle==0){
        tpecSentHdr = dbHdr;
        tpec_org.xtc.tp.search.jsdump("found sent message with id : "+msgId); 
        try {
          MsgHdrToMimeMessage(dbHdr, null, function(aMsgHdr, aMimeMsg) {
            if(aMimeMsg == null)return;
            sentAttachments = aMimeMsg.allAttachments;  
            sentAttachments = sentAttachments.filter(function (x) {return x.isRealAttachment});  
            [sentSnippet, sentMeta] = mimeMsgToContentSnippetAndMeta(aMimeMsg,aMsgHdr.folder,300);
            if(sentSnippet.length==0)sentSnippet = "[empty body]"
            },true);

        //} catch (e if e.result == Components.results.NS_ERROR_FAILURE) {
        } catch (e) {
          sentSnippet = "...";
        }
      } else  {
        //TODO: AVOID DUPLICATE
        var hdrFound = 0;
        for(var tpecJdx=0;tpecJdx<tpecNotificationsHdr.length;tpecJdx++){
          if(dbHdr==tpecNotificationsHdr[tpecJdx]){
            hdrFound = 1;
            break;
          }
        }
        for(var tpecJdx=0;tpecJdx<certifiedHdr.length;tpecJdx++){
          //tpec_org.xtc.tp.search.jsdump("ceritfiedHdr: "+(dbHdr.messageId==certifiedHdr[tpecJdx].messageId)); 
          if(dbHdr==certifiedHdr[tpecJdx] || dbHdr.messageId==certifiedHdr[tpecJdx].messageId){
            hdrFound = 1;
            break;
          }
        }
        if(hdrFound==0){
          //if(dbHdr.subject.toLowerCase().indexOf("posta certificata")==0){
          if(searchCycle==2 || searchCycle==3){
            certifiedHdr.push(dbHdr);
            tpec_org.xtc.tp.search.jsdump("found certifiedHdr"); 
          } else {
            tpecNotificationsHdr.push(dbHdr);
            tpec_org.xtc.tp.search.jsdump("found tpecNotificationsHdr"); 
          }
        }
        //timestampNotifications.push(0);
      }
    },
    onSearchDone: function(status){
      if(searchCycle==0){
        searchSession = null;
        searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
          .createInstance(Components.interfaces.nsIMsgSearchSession);
        searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
        //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
        tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
        tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
        searchCycle = 1;
        
        var searchTerm = searchSession.createTerm();
        var value = searchTerm.value;
        searchTerm.attrib = tpecFirstHeader+1;
        value.str = msgId;
        value.attrib =  tpecFirstHeader+1;
        searchTerm.arbitraryHeader = tpecArrayHdrs[tpecFirstHeader+1 - 1 - Components.interfaces.nsMsgSearchAttrib.OtherHeader];
        searchTerm.value = value;
        searchTerm.op = tpecContains;
        searchTerm.booleanAnd = false;
        
        searchSession.appendTerm(searchTerm);
        searchSession.registerListener(tpecSearchListener);
        searchSession.search(null);         
        //tpec_org.xtc.tp.search.refresh();
      } else if (searchCycle==3) {
        //tpec_org.xtc.tp.search.refresh();
        if(tpecNotificationsHdr.length >0){
          tpecIdx = 0;
          //tpec_org.xtc.tp.search.processNotifications();
          tpec_org.xtc.tp.search.jsdump("Calling utility :"+tpecSentHdr); 
          
          // start sorting
          var tmpHdr;
          var ts1;
          var ts2;
          for(var tpecIdx=0;tpecIdx<tpecNotificationsHdr.length-1;tpecIdx++){
            ts1 =  tpecNotificationsHdr[tpecIdx].dateInSeconds;
            for(var tpecJdx=tpecIdx+1;tpecJdx<tpecNotificationsHdr.length;tpecJdx++){
              ts2 = tpecNotificationsHdr[tpecJdx].dateInSeconds;
              tpec_org.xtc.tp.search.jsdump("Sorting "+ts1+" : "+ts2); 
              if(ts1>ts2){
                tmpHdr = tpecNotificationsHdr[tpecIdx];
                tpecNotificationsHdr[tpecIdx] = tpecNotificationsHdr[tpecJdx];
                tpecNotificationsHdr[tpecJdx] = tmpHdr;
                ts1 =  tpecNotificationsHdr[tpecIdx].dateInSeconds;
              }
            }
          }
          // end sorting
 
          
        }

        if(tpecSentHdr!=null){
          var utility = new ThunderPecUtilityAsync();
          utility.check(tmpDir,tpec_org.xtc.tp.search.callback,tpecSentHdr.folder.getUriForMsg(tpecSentHdr));
        } else {
          certIdx = 0;
          tpec_org.xtc.tp.search.processCertified();
          //tpec_org.xtc.tp.search.processNotifications();
        }

      } else if (searchCycle==1) {
        searchSession = null;
        searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
          .createInstance(Components.interfaces.nsIMsgSearchSession);
        searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
        //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
        tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
        tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
        
        var searchTerm = searchSession.createTerm();
        var value = searchTerm.value;
        searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
        value.str = "POSTA CERTIFICATA";
        searchTerm.value = value;
        searchTerm.op = Components.interfaces.nsMsgSearchOp.BeginsWith;
        searchTerm.booleanAnd = true;
        searchSession.appendTerm(searchTerm);

        if(xmlSentHdr["subject"]!=""){
          searchCycle = 2;
          var searchTerm = searchSession.createTerm();
          var value = searchTerm.value;
          searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
          value.str = xmlSentHdr["subject"];
          searchTerm.value = value;
          searchTerm.op = Components.interfaces.nsMsgSearchOp.EndsWith;
          searchTerm.booleanAnd = true;
          searchSession.appendTerm(searchTerm);
        } else {
          searchCycle = 3;
          var searchTerm = searchSession.createTerm();
          var value = searchTerm.value;
          searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
          value.str = "NOTIFICA ECCEZIONE";
          searchTerm.value = value;
          searchTerm.op = Components.interfaces.nsMsgSearchOp.EndsWith;
          searchTerm.booleanAnd = true;
          searchSession.appendTerm(searchTerm);
        }

        searchSession.registerListener(tpecSearchListener);
        searchSession.search(null);         
      } else if (searchCycle==2) {    // notifica eccezioen
        searchSession = null;
        searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
          .createInstance(Components.interfaces.nsIMsgSearchSession);
        searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
        //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
        tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
        tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
        searchCycle = 3;
        
        var searchTerm = searchSession.createTerm();
        var value = searchTerm.value;
        searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
        value.str = "POSTA CERTIFICATA";
        searchTerm.value = value;
        searchTerm.op = Components.interfaces.nsMsgSearchOp.BeginsWith;
        searchTerm.booleanAnd = true;
        searchSession.appendTerm(searchTerm);

        var searchTerm = searchSession.createTerm();
        var value = searchTerm.value;
        searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
        value.str = "NOTIFICA ECCEZIONE";
        searchTerm.value = value;
        searchTerm.op = Components.interfaces.nsMsgSearchOp.EndsWith;
        searchTerm.booleanAnd = true;
        searchSession.appendTerm(searchTerm);

        searchSession.registerListener(tpecSearchListener);
        searchSession.search(null);         
      }
    },
    onNewSearch: function(){
    }
  };

  var xmlSearchListener = {
    xmlfiles: [],
    onSearchHit: function(dbHdr, folder){ 
        tpec_org.xtc.tp.search.jsdump("XMLSEARCH find MESSAGE : ("+dbHdr.mime2DecodedSubject+") ");
        try {
          MsgHdrToMimeMessage(dbHdr, null, function(aMsgHdr, aMimeMsg) {
            if(aMimeMsg == null)return;
            var attachs = aMimeMsg.allAttachments;
            var xmlAttach = null;
            for(var x in attachs){
              tpec_org.xtc.tp.search.jsdump("XMLSEARCH find attachment type : ("+attachs[x].contentType.toLowerCase()+") ");
              if (attachs[x].contentType.toLowerCase()=="application/xml"){
                if (attachs[x].name.toLowerCase()=="daticert.xml"){
                  xmlAttach = attachs[x];
                  tpec_org.xtc.tp.search.jsdump("XMLSEARCH find XML : ("+attachs[x].name.toLowerCase()+") ");
                }
              }
            }

            if(xmlAttach!=null){
              xmlSearchListener.xmlfiles.push([xmlAttach,aMsgHdr,dbHdr]);
              /*
              var tmpfile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
              tmpfile.initWithPath(tmpDir);
              tmpfile.append(xmlAttach.name);
              tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
              tpec_org.xtc.tp.search.jsdump("XML file : ("+tmpfile.path+") ");
              messenger.saveAttachmentToFile(tmpfile,xmlAttach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),xmlAttach.contenType,{
                OnStartRunningUrl : function (url) {},
                OnStopRunningUrl : function (url,code) {
                  tpec_org.xtc.tp.search.jsdump("saving XML attachment");
                  var xmldata = "";
                  var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                                createInstance(Components.interfaces.nsIFileInputStream);
                  var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                                createInstance(Components.interfaces.nsIConverterInputStream);
                  fstream.init(tmpfile, -1, 0, 0);
                  cstream.init(fstream, "UTF-8", 0, 0);
                  //changed for tb45
                  var str = {};
                  var read = 0;
                  do { 
                    read = cstream.readString(0xffffffff, str); 
                    xmldata += str.value;
                  } while (read != 0);
                  cstream.close(); 
                  tmpfile.remove(true);
                  xmlReader.parseFromString(xmldata, "text/xml");
                  var pmi =  attrs["identificativo"]["_value"].replace(/<|>/gi,"");
                  tpec_org.xtc.tp.search.jsdump("XMLSEARCH id idx:"+tpecIdx);
                  if((esitoAttrs!=null) && (typeof esitoAttrs[tpecIdx] !== 'undefined')) {
                    tpec_org.xtc.tp.search.jsdump("XMLSEARCH id :"+pmi+" "+esitoAttrs[tpecIdx]["idmsg"]);
                    if(pmi==esitoAttrs[tpecIdx]["idmsg"]){
                      startHDR = dbHdr;
                      daticert = xmldata;
                      tpec_org.xtc.tp.search.jsdump("XMLSEARCH daticert :"+daticert);
                    }
                  }
                }
              });
              */
            }
          },true);
        //} catch (e if e.result == Components.results.NS_ERROR_FAILURE) {
        } catch (e) {
          tpec_org.xtc.tp.search.jsdump("error in XMLSEARCH : "+e);
        }
    },
    onSearchDone: function(status){
      if(xmlSearchListener.xmlfiles.length>0){
          tpec_org.xtc.tp.search.jsdump("XMLSEARCH NUM: "+xmlSearchListener.xmlfiles.length); 
          var xmlelement = xmlSearchListener.xmlfiles.shift();
          var xmlAttach = xmlelement[0];
          var aMsgHdr = xmlelement[1];
          var dbHdr = xmlelement[2];

          var tmpfile = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsIFile);
          tmpfile.initWithPath(tmpDir);
          tmpfile.append(xmlAttach.name);
          tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
          tpec_org.xtc.tp.search.jsdump("XML file : ("+tmpfile.path+") ");
          messenger.saveAttachmentToFile(tmpfile,xmlAttach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),xmlAttach.contenType,{
            OnStartRunningUrl : function (url) {},
            OnStopRunningUrl : function (url,code) {
              tpec_org.xtc.tp.search.jsdump("saving XML attachment");
              var xmldata = "";
              var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                            createInstance(Components.interfaces.nsIFileInputStream);
              var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                            createInstance(Components.interfaces.nsIConverterInputStream);
              fstream.init(tmpfile, -1, 0, 0);
              cstream.init(fstream, "UTF-8", 0, 0);
              //changed for tb45
              var str = {};
              var read = 0;
              do { 
                read = cstream.readString(0xffffffff, str); 
                xmldata += str.value;
              } while (read != 0);
              cstream.close(); 
              tmpfile.remove(true);
              xmlReader.parseFromString(xmldata, "text/xml");
              var pmi =  attrs["identificativo"]["_value"].replace(/<|>/gi,"");
              tpec_org.xtc.tp.search.jsdump("XMLSEARCH id idx:"+tpecIdx);
              if((esitoAttrs!=null) && (typeof esitoAttrs[tpecIdx] !== 'undefined')) {
                tpec_org.xtc.tp.search.jsdump("XMLSEARCH id :"+pmi+" "+esitoAttrs[tpecIdx]["idmsg"]);
                if(pmi==esitoAttrs[tpecIdx]["idmsg"]){
                  startHDR = dbHdr;
                  daticert = xmldata;
                  tpec_org.xtc.tp.search.jsdump("XMLSEARCH daticert :"+daticert);
                  xmlSearchListener.onSearchEnd(0)
                } else {
                  xmlSearchListener.onSearchDone(0);
                }
              } else {
                xmlSearchListener.onSearchDone(0);
              }
            }
          });
      } else {
        xmlSearchListener.onSearchEnd(0)
      }
    },    
    onSearchEnd: function(status){
      if(daticert!=null){
        xmlDoc = daticert;
        esitoAttrs = null;
        attrs = null;
        tpecIdx = 0;
        tpec_org.xtc.tp.search.doSearch();
      } else { 
        tpec_org.xtc.tp.search.jsdump("running secondTry :"+secondTry+" "+esitoAttrs[tpecIdx]["idmsgmitt"]);
        if(secondTry==0){
          searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
            .createInstance(Components.interfaces.nsIMsgSearchSession);
          searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
          //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
          tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
          tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
          searchCycle = 0;
          daticert = null;

          secondTry = 1;

          var searchTerm = searchSession.createTerm();
          var value = searchTerm.value;
          searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
          value.str = "ACCETTAZIONE";
          searchTerm.value = value;
          searchTerm.op = Components.interfaces.nsMsgSearchOp.BeginsWith;
          searchTerm.booleanAnd = true;
          searchSession.appendTerm(searchTerm);
      
          if(esitoAttrs[tpecIdx]["idmsgmitt"]!=""){
            var searchTerm = searchSession.createTerm();
            var value = searchTerm.value;
            searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
            value.str = esitoAttrs[tpecIdx]["idmsgmitt"];
            searchTerm.value = value;
            searchTerm.op = Components.interfaces.nsMsgSearchOp.Contains;
            searchTerm.booleanAnd = true;
            searchSession.appendTerm(searchTerm);
          }
          
          searchSession.registerListener(xmlSearchListener);
          searchSession.search(null);   
        } else {
          /*
          tpec_org.xtc.tp.search.showError("Notifica PEC \"CONSEGNA o ACCETTAZIONE: "+esitoAttrs[tpecIdx]["idmsgmitt"]+"\" non trovata");
          document.getElementById("tpecArchiveButton").setAttribute('disabled', true);      
          document.getElementById("tpecPlusButton").setAttribute('disabled', true);      
          document.getElementById("tpecMinusButton").setAttribute('disabled', true);      
          document.getElementById("tpecReadButton").setAttribute('disabled', true);      
          document.getElementById("tpecPrintButton").setAttribute('disabled', true);      
          document.getElementById("tpecPintAllButton").setAttribute('disabled', true);      
          document.getElementById("tpecLegendButton").setAttribute('disabled', true);      
          document.getElementById("tpecArchiveExtended").setAttribute('disabled', true); 
          */
          
          msgId = "";
          originalMsgId = msgId;

          searchSession = null;

          searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
            .createInstance(Components.interfaces.nsIMsgSearchSession);
          searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
          //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
          tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
          tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
          searchCycle = 2;
          daticert = null;
     
          var searchTerm = searchSession.createTerm();
          var value = searchTerm.value;
          searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
          value.str = esitoAttrs[tpecIdx]["idmsgmitt"];
          searchTerm.value = value;
          searchTerm.op = Components.interfaces.nsMsgSearchOp.Contains;
          searchTerm.booleanAnd = true;
          searchSession.appendTerm(searchTerm);
          
          esitoAttrs = null;
          attrs = null;
          tpecIdx = 0;

          searchSession.registerListener(tpecSearchListener);
          searchSession.search(null);   
            
        }   
      }
    },
    onNewSearch: function(){
        tpec_org.xtc.tp.search.jsdump("XMLSEARCH NEW SEARCH");
        xmlSearchListener.xmlfiles = [];
    }
  };

    
  var fpaSearchListener = {
    onSearchHit: function(dbHdr, folder){ 
      if(searchCycle==2){
        tpecSentHdr = dbHdr;
        xmlSentHdr["subject"] = dbHdr.mime2DecodedSubject;
        originalMsgId = dbHdr.messageId;
        tpec_org.xtc.tp.search.jsdump("SEARCH FPA: found sent"); 
        try {
          MsgHdrToMimeMessage(dbHdr, null, function(aMsgHdr, aMimeMsg) {
            if(aMimeMsg == null)return;
            sentAttachments = aMimeMsg.allAttachments;  
            sentAttachments = sentAttachments.filter(function (x) {return x.isRealAttachment});  
            [sentSnippet, sentMeta] = mimeMsgToContentSnippetAndMeta(aMimeMsg,aMsgHdr.folder,300);
            if(sentSnippet.length==0)sentSnippet = "[empty body]"
            },true);

        //} catch (e if e.result == Components.results.NS_ERROR_FAILURE) {
        } catch (e) {
          sentSnippet = "...";
        }
      } else if(searchCycle==0){
        tpec_org.xtc.tp.search.jsdump("SEARCH FPA: check fpa "+tpecNotificationsHdr.indexOf(dbHdr));
        if(tpecNotificationsHdr.indexOf(dbHdr)==-1){ 
          tpecNotificationsHdr.push(dbHdr);
          fpaNotifications.push("");
          fpaDate.push("");
        }
        tpec_org.xtc.tp.search.jsdump("SEARCH FPA: found fpa "+dbHdr.mime2DecodedSubject); 
      } else if(searchCycle==1){
        tpec_org.xtc.tp.search.jsdump("SEARCH FPA: check fpa "+tpecNotificationsHdr.indexOf(dbHdr));
        if(tpecNotificationsHdr.indexOf(dbHdr)==-1){ 
          tpecNotificationsHdr.push(dbHdr);
          fpaNotifications.push("");
          fpaDate.push("");
        }
        tpec_org.xtc.tp.search.jsdump("SEARCH FPA: found not"); 
      } 
      
    },
    onSearchDone: function(status){
      var tmpMsgId = "";
      tpec_org.xtc.tp.search.jsdump("SEARCH FPA: fpaIdx "+fpaIdx+" cicle "+searchCycle+" "+fpaReceiptId.length+" "+fpaNotificationsId.length); 
      if(searchCycle==0){
        fpaIdx++;
        if(fpaIdx>=fpaReceiptId.length){
          fpaIdx=0;
          searchCycle=1;
          if(fpaNotificationsId.length>0){
            tmpMsgId = fpaNotificationsId[fpaIdx];
          }
        } else {
          tmpMsgId = fpaReceiptId[fpaIdx];
        }
      } else if(searchCycle==1){
        fpaIdx++;
        if(fpaIdx>=fpaNotificationsId.length){
          fpaIdx=0;
          searchCycle=2;
          tmpMsgId = fpaSentId;
        } else {
          tmpMsgId = fpaNotificationsId[fpaIdx];
        }
      } else if(searchCycle==2){

      }
        
      tpec_org.xtc.tp.search.jsdump("SEARCH FPA: serach for '"+tmpMsgId+"' cicle "+searchCycle); 

      if(tmpMsgId!=""){
        searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
          .createInstance(Components.interfaces.nsIMsgSearchSession);
        searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
        tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
        tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
        
        var searchTerm = searchSession.createTerm();
        var value = searchTerm.value;
        searchTerm.attrib = tpecFirstHeader;
        value.str = tmpMsgId;
        value.attrib =  tpecFirstHeader;
        searchTerm.arbitraryHeader = tpecArrayHdrs[tpecFirstHeader - 1 - Components.interfaces.nsMsgSearchAttrib.OtherHeader];
        tpec_org.xtc.tp.search.jsdump("SEARCH FPA: TERM "+searchTerm.arbitraryHeader); 
        searchTerm.value = value;
        searchTerm.op = tpecContains;
        searchTerm.booleanAnd = false;
        
        searchSession.appendTerm(searchTerm);
        searchSession.registerListener(fpaSearchListener);
        searchSession.search(null);         
      } else {
       if(tpecNotificationsHdr.length >0){
          tpecIdx = 0;
          tpec_org.xtc.tp.search.jsdump("Calling utility :"+tpecSentHdr); 
          
          // start sorting
          var tmpHdr;
          var ts1;
          var ts2;
          for(var tpecIdx=0;tpecIdx<tpecNotificationsHdr.length-1;tpecIdx++){
            ts1 =  tpecNotificationsHdr[tpecIdx].dateInSeconds;
            for(var tpecJdx=tpecIdx+1;tpecJdx<tpecNotificationsHdr.length;tpecJdx++){
              ts2 = tpecNotificationsHdr[tpecJdx].dateInSeconds;
              tpec_org.xtc.tp.search.jsdump("Sorting "+ts1+" : "+ts2); 
              if(ts1>ts2){
                tmpHdr = tpecNotificationsHdr[tpecIdx];
                tpecNotificationsHdr[tpecIdx] = tpecNotificationsHdr[tpecJdx];
                tpecNotificationsHdr[tpecJdx] = tmpHdr;
                ts1 =  tpecNotificationsHdr[tpecIdx].dateInSeconds;
              }
            }
          }
        }

        if(tpecSentHdr!=null){
          var utility = new ThunderPecUtilityAsync();
          utility.check(tmpDir,tpec_org.xtc.tp.search.callback,tpecSentHdr.folder.getUriForMsg(tpecSentHdr));
        } else {
          certIdx = 0;
          tpec_org.xtc.tp.search.processCertified();
          //tpec_org.xtc.tp.search.processNotifications();
        }
      }

    },
    onNewSearch: function(){
    }
  };
  
  pub.tpecSubFolders = function(folder, searchSession) {
    var subFolders = folder.subFolders;
    
    
    while (subFolders.hasMoreElements()) {
      var nextFolder = subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
      
      if (!(nextFolder.flags & Components.interfaces.nsMsgFolderFlags.Virtual)) {
          tpec_org.xtc.tp.search.jsdump("adding search folder : ("+nextFolder.name+")");
          searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail,nextFolder);
          tpec_org.xtc.tp.search.tpecSubFolders(nextFolder, searchSession);
      }
    }
  };
  
  pub.tpecLocalFolders = function(searchSession) { 
    for(var x in localFld){
      tpec_org.xtc.tp.search.jsdump("adding local folder : ("+localFld[x].name+")");
      searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail,localFld[x]);
    }
  }

  
  pub.doSearch = function() {
    tpec_org.xtc.tp.search.jsdump("DOSEARCH: "+xmlDoc);

    xmlReader.parseFromString(xmlDoc, "text/xml");
    //setting xmlSentHdr
    xmlSentHdr["from"] =  attrs["mittente"]["_value"];
    xmlSentHdr["subject"] = attrs["oggetto"]["_value"];
    var attrsArray = attrs["destinatari"];
    var toString = "";
    for(var x in attrsArray){
      if(toString!="")toString += ",";
      toString += attrsArray[x]["_value"];
    } 
    xmlSentHdr["to"] = toString;
    
    pecMsgId =  attrs["identificativo"]["_value"].replace(/<|>/gi,"");
    tpec_org.xtc.tp.search.jsdump("PEC Msg ID : "+pecMsgId);
    //fpa start
    fpaSDI = "";
    
    tpec_org.xtc.tp.search.jsdump("SEARCH: FPA START DOSEARCH "+startHDR.messageId); 
    var aDBConnection = ThunderPecSql.dbConnection; 
    var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE referencePecId LIKE :mid AND esitoValue=888;");
    stmt.params.mid =  pecMsgId;
    stmt.executeAsync({
      referenceId:"",
      fpaId:"",
      handleResult: function(aResultSet) {
        var row = aResultSet.getNextRow();
        this.referenceId =  row.getResultByName("referenceId");
        tpec_org.xtc.tp.search.jsdump("SEARCH: FPA REFERENCE "+this.referenceId);
      },
      handleError: function() {ThunderPecSql._log("SEARCH: REFERENCE ERROR 0x04");},
      handleCompletion: function(aReason) { 
        fpaSDI = this.referenceId;
        tpec_org.xtc.tp.search.jsdump("FPA ID : "+fpaSDI);
        if(fpaSDI!=""){
            fpaFound = 1;
           if(this.referenceId!=""){
              fpaFound = 1;
              var nstmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE referenceId LIKE :mid;");          //select  fpa notification
              nstmt.params.mid = this.referenceId;
              nstmt.executeAsync({
                referenceId:"",
                fpaId:"",
                handleResult: function(aResultSet) {
                  for(var row=aResultSet.getNextRow();row;row=aResultSet.getNextRow()){
                    this.fpaId = row.getResultByName("msgId");
                    if(row.getResultByName("referencePecId")!="" && this.referenceId=="")this.referenceId = row.getResultByName("referencePecId");
                    fpaReceiptId.push(this.fpaId);
                    tpec_org.xtc.tp.search.jsdump("SEARCH: FPA RECEIPT FPA "+this.fpaId+" "+this.referenceId); 
                  }
                  tpec_org.xtc.tp.search.jsdump("SEARCH: FPA RECEIPT "+this.referenceId);
                },
                handleError: function() {ThunderPecSql._log("SEARCH: REFERENCE ERROR 0x05");},
                handleCompletion: function(aReason) { 
                  if(this.referenceId!=""){
                    var rstmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE referenceId LIKE :mid;");          //select  fpa receipt
                    rstmt.params.mid = this.referenceId;
                     rstmt.executeAsync({
                      referenceId:"",
                      fpaId:"",
                      handleResult: function(aResultSet) {
                        for(var row=aResultSet.getNextRow();row;row=aResultSet.getNextRow()){
                          this.fpaId = row.getResultByName("msgId");
                          if(row.getResultByName("referenceId")!="" && fpaSentId==""){
                            fpaSentId =  row.getResultByName("referenceId");
                            tpec_org.xtc.tp.search.jsdump("SEARCH: FPA SENT "+fpaSentId); 
                          }
                          fpaReceiptId.push(this.fpaId);
                          tpec_org.xtc.tp.search.jsdump("SEARCH: FPA NOTIFICATION "+this.fpaId); 
                        }
                        tpec_org.xtc.tp.search.jsdump("SEARCH: FPA NOTIFICATION "+this.referenceId);
                      },
                      handleError: function() {ThunderPecSql._log("SEARCH: REFERENCE ERROR 0x06");},
                      handleCompletion: function(aReason) { 
                        tpec_org.xtc.tp.search.doSearchFpa();
                      }
                    }); //select  fpa receipt end
                    rstmt.finalize();
                  }   //if
                }     //handleCompletion
              });     //select  fpa notification end
              nstmt.finalize();
            } else {
              tpec_org.xtc.tp.search.doSearchFpa();
            }         //if
          } else {          //if
            //proceed normally
            tpec_org.xtc.tp.search.jsdump("SEARCH: PROCEED NORMALLY");
            if("msgid" in attrs) {
              msgId = attrs["msgid"]["_value"].replace(/<|>/gi,"");
              originalMsgId = msgId;
              //msgId = msgId.replace(/<|>/gi,"");
              tpec_org.xtc.tp.search.jsdump("XML msgid: "+msgId);
              
              searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
                .createInstance(Components.interfaces.nsIMsgSearchSession);
              searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
              //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
              tpec_org.xtc.tp.search.jsdump("addScopeTerm : "+folder.name);
              tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
              tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
              searchCycle = 0;
              
              var searchTerm = searchSession.createTerm();
              var value = searchTerm.value;
              searchTerm.attrib = tpecFirstHeader;
              value.str = msgId;
              value.attrib =  tpecFirstHeader;
              searchTerm.arbitraryHeader = tpecArrayHdrs[tpecFirstHeader - 1 - Components.interfaces.nsMsgSearchAttrib.OtherHeader];
              searchTerm.value = value;
              searchTerm.op = tpecContains;
              searchTerm.booleanAnd = false;
              
              searchSession.appendTerm(searchTerm);
              searchSession.registerListener(tpecSearchListener);
              searchSession.search(null);    
            } else {
              try {
                MsgHdrToMimeMessage(startHDR, null, function (aMsgHdr, aMimeMsg) {
                  if (aMimeMsg.has("X-Riferimento-Message-ID")){
                    msgId = aMimeMsg.get("X-Riferimento-Message-ID").replace(/<|>/gi,"");
                    originalMsgId = msgId;
                    //msgId = msgId.replace(/<|>/gi,"");
                    tpec_org.xtc.tp.search.jsdump("HEADER msgid: "+msgId);
                    
                    searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
                      .createInstance(Components.interfaces.nsIMsgSearchSession);
                    searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
                    //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
                    tpec_org.xtc.tp.search.jsdump("addScopeTerm : "+folder.name);
                    tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
                    tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
                    searchCycle = 0;
                    
                    var searchTerm = searchSession.createTerm();
                    var value = searchTerm.value;
                    searchTerm.attrib = tpecFirstHeader;
                    value.str = msgId;
                    value.attrib =  tpecFirstHeader;
                    searchTerm.arbitraryHeader = tpecArrayHdrs[tpecFirstHeader - 1 - Components.interfaces.nsMsgSearchAttrib.OtherHeader];
                    searchTerm.value = value;
                    searchTerm.op = tpecContains;
                    searchTerm.booleanAnd = false;
                    
                    searchSession.appendTerm(searchTerm);
                    searchSession.registerListener(tpecSearchListener);
                    searchSession.search(null);    
                   } else {
                    msgId = "";
                    originalMsgId = msgId;
        
                    searchSession = null;
                    searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
                      .createInstance(Components.interfaces.nsIMsgSearchSession);
                    searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
                    //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
                    tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
                    tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
                    searchCycle = 2;
                    
                    var searchTerm = searchSession.createTerm();
                    var value = searchTerm.value;
                    searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
                    value.str = xmlSentHdr["subject"];
                    searchTerm.value = value;
                    searchTerm.op = Components.interfaces.nsMsgSearchOp.EndsWith;
                    searchTerm.booleanAnd = true;
                    searchSession.appendTerm(searchTerm);
            
                    searchSession.registerListener(tpecSearchListener);
                    searchSession.search(null);                    
                   }
                  }, true, {partsOnDemand: true,}
                );
              } catch(e){
                  tpec_org.xtc.tp.search.jsdump("HEADER msgid ERROR");
              }
            }
          }
      }           //handleCompletion
    });           //executeAsync
    stmt.finalize();
    
    
    /*
    var aDBConnection = ThunderPecSql.dbConnection; 
    var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE referencePecId LIKE '"+pecMsgId+"' AND esitoValue=888;");
    var referenceId = "";
    var fpaId = ""
    if(stmt.executeStep()){
      referenceId =  stmt.row.referenceId;
      tpec_org.xtc.tp.search.jsdump("SEARCH: FPA REFERENCE "+referenceId); 
    }
    stmt.finalize();  
    fpaSDI = referenceId;
    tpec_org.xtc.tp.search.jsdump("FPA ID : "+fpaSDI);
    if(fpaSDI!=""){
        fpaFound = 1;
        if(referenceId!=""){
          var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE referenceId LIKE '"+referenceId+"';");          //select  fpa notification
          referenceId = "";
          while(stmt.executeStep()){
            fpaId = stmt.row.msgId;
            if(stmt.row.referencePecId!="" && referenceId=="")referenceId = stmt.row.referencePecId ;     //need this to find notifications
            fpaReceiptId.push(fpaId);
            tpec_org.xtc.tp.search.jsdump("SEARCH: FPA RECEIPT "+fpaId); 
          }
          stmt.finalize(); 
          if(referenceId!="") {
            fpaSentId = "";
            var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE referenceId LIKE '"+referenceId+"';");       //select PEC notifications
            while(stmt.executeStep()){
              fpaId = stmt.row.msgId;
              if(stmt.row.referencePecId!="" && fpaSentId==""){
                fpaSentId = stmt.row.referencePecId;     //need this to find sent message
                tpec_org.xtc.tp.search.jsdump("SEARCH: FPA SENT "+fpaSentId); 
                }
              fpaNotificationsId.push(fpaId);
              tpec_org.xtc.tp.search.jsdump("SEARCH: FPA NOTIFICATION "+fpaId); 
            }
            stmt.finalize(); 
          }
        }
        this.doSearchFpa();
        return;    
    }
    //fpa stop

    if("msgid" in attrs) {
      msgId = attrs["msgid"]["_value"].replace(/<|>/gi,"");
      originalMsgId = msgId;
      //msgId = msgId.replace(/<|>/gi,"");
      tpec_org.xtc.tp.search.jsdump("XML msgid: "+msgId);
      
      searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
        .createInstance(Components.interfaces.nsIMsgSearchSession);
      searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
      //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
      tpec_org.xtc.tp.search.jsdump("addScopeTerm : "+folder.name);
      tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
      tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
      searchCycle = 0;
      
      var searchTerm = searchSession.createTerm();
      var value = searchTerm.value;
      searchTerm.attrib = tpecFirstHeader;
      value.str = msgId;
      value.attrib =  tpecFirstHeader;
      searchTerm.arbitraryHeader = tpecArrayHdrs[tpecFirstHeader - 1 - Components.interfaces.nsMsgSearchAttrib.OtherHeader];
      searchTerm.value = value;
      searchTerm.op = tpecContains;
      searchTerm.booleanAnd = false;
      
      searchSession.appendTerm(searchTerm);
      searchSession.registerListener(tpecSearchListener);
      searchSession.search(null);    
    } else {
      try {
        MsgHdrToMimeMessage(startHDR, null, function (aMsgHdr, aMimeMsg) {
          if (aMimeMsg.has("X-Riferimento-Message-ID")){
            msgId = aMimeMsg.get("X-Riferimento-Message-ID").replace(/<|>/gi,"");
            originalMsgId = msgId;
            //msgId = msgId.replace(/<|>/gi,"");
            tpec_org.xtc.tp.search.jsdump("HEADER msgid: "+msgId);
            
            searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
              .createInstance(Components.interfaces.nsIMsgSearchSession);
            searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
            //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
            tpec_org.xtc.tp.search.jsdump("addScopeTerm : "+folder.name);
            tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
            tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
            searchCycle = 0;
            
            var searchTerm = searchSession.createTerm();
            var value = searchTerm.value;
            searchTerm.attrib = tpecFirstHeader;
            value.str = msgId;
            value.attrib =  tpecFirstHeader;
            searchTerm.arbitraryHeader = tpecArrayHdrs[tpecFirstHeader - 1 - Components.interfaces.nsMsgSearchAttrib.OtherHeader];
            searchTerm.value = value;
            searchTerm.op = tpecContains;
            searchTerm.booleanAnd = false;
            
            searchSession.appendTerm(searchTerm);
            searchSession.registerListener(tpecSearchListener);
            searchSession.search(null);    
           } else {
            msgId = "";
            originalMsgId = msgId;

            searchSession = null;
            searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
              .createInstance(Components.interfaces.nsIMsgSearchSession);
            searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
            //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
            tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
            tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
            searchCycle = 2;
            
            var searchTerm = searchSession.createTerm();
            var value = searchTerm.value;
            searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
            value.str = xmlSentHdr["subject"];
            searchTerm.value = value;
            searchTerm.op = Components.interfaces.nsMsgSearchOp.EndsWith;
            searchTerm.booleanAnd = true;
            searchSession.appendTerm(searchTerm);
    
            searchSession.registerListener(tpecSearchListener);
            searchSession.search(null);                    
           }
          }, true, {partsOnDemand: true,}
        );
      } catch(e){
          tpec_org.xtc.tp.search.jsdump("HEADER msgid ERROR");
      }
    }
    */
  }

    
  pub.doSearchEsito = function() {
    tpecIdx = 999;
    if(xmlDoc.indexOf("Eccezione.dtd")>0){
      EccezioneXML.parse(xmlDoc);
      if(esitoAttrs==null)esitoAttrs = new Array();
      esitoAttrs[tpecIdx] = new Array();
      pecMsgId = EccezioneXML.keyword["idmsgsmtp"].value.replace(/\&lt;|\&gt;/g,"");
      esitoAttrs[tpecIdx]["idmsg"] = pecMsgId;
      xmlSentHdr["subject"] = "";
      esitoAttrs[tpecIdx]["idmsgmitt"] = "";
      tpec_org.xtc.tp.search.jsdump("doSearchEsito from eccezione: "+pecMsgId);
    } else {
      esitoReader.parseFromString(xmlDoc, "text/xml");
      pecMsgId =  esitoAttrs[tpecIdx]["idmsg"].replace(/<|>/gi,"");
      xmlSentHdr["subject"] = esitoAttrs[tpecIdx]["idmsgmitt"];
      tpec_org.xtc.tp.search.jsdump("doSearchEsito : "+esitoAttrs[tpecIdx]["idmsg"]+"  "+esitoAttrs[tpecIdx]["idmsgmitt"]);
    }
    
 

    xmlSentHdr["from"] =  "";
    xmlSentHdr["to"] = "";

    searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
      .createInstance(Components.interfaces.nsIMsgSearchSession);
    searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
    //if(startFLD)searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, startFLD);
    tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
    tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
    searchCycle = 0;
    daticert = null;
    
    secondTry = 0;
    
    var searchTerm = searchSession.createTerm();
    var value = searchTerm.value;
    searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
    value.str = "CONSEGNA";
    searchTerm.value = value;
    searchTerm.op = Components.interfaces.nsMsgSearchOp.BeginsWith;
    searchTerm.booleanAnd = true;
    searchSession.appendTerm(searchTerm);

    if(esitoAttrs[tpecIdx]["idmsgmitt"]!=""){
      var searchTerm = searchSession.createTerm();
      var value = searchTerm.value;
      searchTerm.attrib = Components.interfaces.nsMsgSearchAttrib.Subject;
      value.str = esitoAttrs[tpecIdx]["idmsgmitt"];
      searchTerm.value = value;
      searchTerm.op = Components.interfaces.nsMsgSearchOp.Contains;
      searchTerm.booleanAnd = true;
      searchSession.appendTerm(searchTerm);
    }
    
    searchSession.registerListener(xmlSearchListener);
    searchSession.search(null);   
    }
    
  pub.doSearchFpa = function() {
    xmlSentHdr["from"] =  "";
    xmlSentHdr["to"] = "";
    xmlSentHdr["subject"] = "";

    searchSession = Components.classes["@mozilla.org/messenger/searchSession;1"]
      .createInstance(Components.interfaces.nsIMsgSearchSession);
    searchSession.addScopeTerm(Components.interfaces.nsMsgSearchScope.offlineMail, folder);
    tpec_org.xtc.tp.search.tpecSubFolders(folder, searchSession);
    tpec_org.xtc.tp.search.tpecLocalFolders(searchSession);
    searchCycle = 0;
    fpaIdx = 0;
    
    var searchTerm = searchSession.createTerm();
    var value = searchTerm.value;
    searchTerm.attrib = tpecFirstHeader;
    value.str = fpaReceiptId[fpaIdx];
    value.attrib =  tpecFirstHeader;
    searchTerm.arbitraryHeader = tpecArrayHdrs[tpecFirstHeader - 1 - Components.interfaces.nsMsgSearchAttrib.OtherHeader];
    tpec_org.xtc.tp.search.jsdump("SEARCH FPA: TERM "+searchTerm.arbitraryHeader); 
    searchTerm.value = value;
    searchTerm.op = tpecContains;
    searchTerm.booleanAnd = false;
    
    searchSession.appendTerm(searchTerm);
    searchSession.registerListener(fpaSearchListener);
    searchSession.search(null);         


    }

    pub.processNotifications = function() {
      var tmpHdr;
      tpec_org.xtc.tp.search.jsdump("processNotifications : "+tpecIdx+" "+tpecNotificationsHdr.length);
      if(tpecIdx<tpecNotificationsHdr.length){
        tmpHdr = tpecNotificationsHdr[tpecIdx];
        tpec_org.xtc.tp.search.jsdump("process XML notifications : ("+tpecIdx+") "+tmpHdr.subject);
        try {
          MsgHdrToMimeMessage(tmpHdr, null, function(aMsgHdr, aMimeMsg) {
            if(aMimeMsg == null)return;
            var attachs = aMimeMsg.allAttachments;
            var xmlAttach = null;
            var esitoAttach = null;
            var excAttach = null;
            for(var x in attachs){
              tpec_org.xtc.tp.search.jsdump("find attachment type : ("+attachs[x].contentType.toLowerCase()+") ");
              if (attachs[x].name.toLowerCase()=="esitoatto.xml"){
                esitoAttach = attachs[x];
                tpec_org.xtc.tp.search.jsdump("find XML : ("+attachs[x].name.toLowerCase()+") ");
              }
              if (attachs[x].name.toLowerCase()=="eccezione.xml"){
                excAttach = attachs[x];
                tpec_org.xtc.tp.search.jsdump("find XML : ("+attachs[x].name.toLowerCase()+") ");
              }
              if (attachs[x].contentType.toLowerCase()=="application/xml"){
                if (attachs[x].name.toLowerCase()=="daticert.xml"){
                  xmlAttach = attachs[x];
                  tpec_org.xtc.tp.search.jsdump("find XML : ("+attachs[x].name.toLowerCase()+") ");
                }
              }
            }

            pctNotifications[tpecIdx] = 0;
            if(esitoAttach!=null||excAttach!=null){
              var insideAttach = null;
              if(excAttach!=null){
                insideAttach = excAttach;
              } else if(esitoAttach!=null){
                insideAttach = esitoAttach;
              }
              var pctfile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
              pctfile.initWithPath(tmpDir);
              pctfile.append(insideAttach.name);
              pctfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
              tpec_org.xtc.tp.search.jsdump("XML file : ("+pctfile.path+") ");
              messenger.saveAttachmentToFile(pctfile,insideAttach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),insideAttach.contenType,{
                OnStartRunningUrl : function (url) {},
                OnStopRunningUrl : function (url,code) {
                  tpec_org.xtc.tp.search.jsdump("saving XML attachment");
                  var xmldata = "";
                  var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                                createInstance(Components.interfaces.nsIFileInputStream);
                  var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                                createInstance(Components.interfaces.nsIConverterInputStream);
                  fstream.init(pctfile, -1, 0, 0);
                  cstream.init(fstream, "UTF-8", 0, 0);
                  //changed for tb45
                  var str = {};
                  var read = 0;
                  do { 
                    read = cstream.readString(0xffffffff, str); 
                    xmldata += str.value;
                  } while (read != 0);
                  cstream.close(); 
                  pctfile.remove(true);
                  tpec_org.xtc.tp.search.jsdump("ESITO XML: "+xmldata);
                  if(xmldata.indexOf("Eccezione.dtd")>0){
                    EccezioneXML.parse(xmldata);
                    if(esitoAttrs==null)esitoAttrs = new Array();
                    esitoAttrs[tpecIdx] = new Array();
                    esitoAttrs[tpecIdx]["idmsg"] = EccezioneXML.keyword["idmsgsmtp"].value.replace(/\&lt;|\&gt;/g,"");
                    esitoAttrs[tpecIdx]["codiceesito"] = -3;
                    esitoAttrs[tpecIdx]["descrizioneesito"] = EccezioneXML.keyword["DescrizioneEccezione".toLowerCase()].value;
                    //esitoAttrs[tpecIdx]["data"] = "";
                  } else {
                    esitoReader.parseFromString(xmldata, "text/xml");
                  }
                  tpec_org.xtc.tp.search.jsdump("start processing notification attributes");
                  tpec_org.xtc.tp.search.jsdump("PROCESSNOTIFICATIONS id :"+pecMsgId+" "+esitoAttrs[tpecIdx]["idmsg"]);
                  if(pecMsgId==esitoAttrs[tpecIdx]["idmsg"]){
                    pctNotifications[tpecIdx] = (("codiceesito" in esitoAttrs[tpecIdx])&&(typeof esitoAttrs[tpecIdx]["codiceesito"] !== 'undefined')?esitoAttrs[tpecIdx]["codiceesito"]:1);
                    pctFound = 1;
                    //esitoAttrs[tpecIdx]["subject"] = tmpHdr.subject;
                    esitoAttrs[tpecIdx]["subject"] = tmpHdr.mime2DecodedSubject;
                    tpec_org.xtc.tp.search.jsdump("PROCESSNOTIFICATIONS subject :"+esitoAttrs[tpecIdx]["subject"]);
                  } else {
                    pctNotifications[tpecIdx] = 0;
                  }
                  tpec_org.xtc.tp.search.jsdump("end processing notification  attributes");
                  //tpec_org.xtc.tp.search.jsdump("xmldoc: "+attrs["consegna"]);
                }
              });
            }

            if(xmlAttach!=null){
              var tmpfile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
              tmpfile.initWithPath(tmpDir);
              tmpfile.append(xmlAttach.name);
              tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
              tpec_org.xtc.tp.search.jsdump("XML file : ("+tmpfile.path+") ");
              messenger.saveAttachmentToFile(tmpfile,xmlAttach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),xmlAttach.contenType,{
                OnStartRunningUrl : function (url) {},
                OnStopRunningUrl : function (url,code) {
                  tpec_org.xtc.tp.search.jsdump("saving XML attachment");
                  var xmldata = "";
                  var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                                createInstance(Components.interfaces.nsIFileInputStream);
                  var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                                createInstance(Components.interfaces.nsIConverterInputStream);
                  fstream.init(tmpfile, -1, 0, 0);
                  cstream.init(fstream, "UTF-8", 0, 0);
                  //changed for tb45
                  var str = {};
                  var read = 0;
                  do { 
                    read = cstream.readString(0xffffffff, str); 
                    xmldata += str.value;
                  } while (read != 0);
                  cstream.close(); 
                  tmpfile.remove(true);
                  xmlReader.parseFromString(xmldata, "text/xml");
                  tpec_org.xtc.tp.search.jsdump("start processing attributes :"+attrs["identificativo"]["_value"]+" "+pecMsgId);
                  //ver 1.7.0 start
                  var aDBConnection = ThunderPecSql.dbConnection; 
                  var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE (msgId LIKE :mid and esitoValue=888);");
                  stmt.params.mid = tmpHdr.messageId;
                  stmt.executeAsync({
                    fpaValue:"",
                    handleResult: function(aResultSet) {
                      var row = aResultSet.getNextRow();
                      this.fpaValue =  row.getResultByName("fatturaValue");
                      tpec_org.xtc.tp.search.jsdump("SEARCH: FPA processNotifications "+this.fpaValue);
                      fpaNotifications[tpecIdx] = this.fpaValue;
                    },
                    handleError: function() {ThunderPecSql._log("SEARCH: REFERENCE ERROR 0x06");},
                    handleCompletion: function(aReason) { 
                      timestampNotifications[tpecIdx] = tpec_org.xtc.tp.search.processAttributes(insideAttach,pctNotifications[tpecIdx],this.fpaValue);
                      tpec_org.xtc.tp.search.jsdump("end processing attributes");
                      tpecIdx += 1;
                      tpec_org.xtc.tp.search.processNotifications();
                    }
                  });
                  stmt.finalize();  
                  
                  /*
                  var fpaValue = ""
                  if(stmt.executeStep()){
                    fpaValue =  stmt.row.fatturaValue;
                    tpec_org.xtc.tp.search.jsdump("SEARCH: FPA processNotifications "+fpaValue); 
                    fpaNotifications[tpecIdx] = fpaValue;
                  }
                  stmt.finalize();  

                  //ver 1.7.0 end
                  //ver 1.6.0 start
                  //timestampNotifications[tpecIdx] = tpec_org.xtc.tp.search.processAttributes(esitoAttach,pctNotifications[tpecIdx],fpaValue);
                  timestampNotifications[tpecIdx] = tpec_org.xtc.tp.search.processAttributes(insideAttach,pctNotifications[tpecIdx],fpaValue);
                  //ver 1.6.0 end
                  tpec_org.xtc.tp.search.jsdump("end processing attributes");
                  //tpec_org.xtc.tp.search.jsdump("xmldoc: "+attrs["consegna"]);
                  tpecIdx += 1;
                  tpec_org.xtc.tp.search.processNotifications();
                  */
                }
              });
            } else {
              timestampNotifications[tpecIdx] = 0;
              tpecIdx += 1;
              tpec_org.xtc.tp.search.processNotifications();
            }
            },true);
        } catch (e) {
          tpec_org.xtc.tp.search.jsdump("error in searchTP : "+e);
          timestampNotifications[tpecIdx] = 0;
          tpecIdx += 1;
          tpec_org.xtc.tp.search.processNotifications();
        }
        
      } else {
        tpec_org.xtc.tp.search.refresh();
      }
    }

    pub.processCertified = function() {
      var tmpHdr;
      tpec_org.xtc.tp.search.jsdump("processCertified : "+certIdx+" "+certifiedHdr.length);
      if(certIdx<certifiedHdr.length){
        tmpHdr = certifiedHdr[certIdx];
        tpec_org.xtc.tp.search.jsdump("processCertified XML notifications : ("+certIdx+") "+tmpHdr.subject);
        try {
          MsgHdrToMimeMessage(tmpHdr, null, function(aMsgHdr, aMimeMsg) {
            if(aMimeMsg == null)return;
            var attachs = aMimeMsg.allAttachments;
            var xmlAttach = null;
            var esitoAttach = null;
            var excAttach = null;
            for(var x in attachs){
              tpec_org.xtc.tp.search.jsdump("find attachment type : ("+attachs[x].contentType.toLowerCase()+") ");
              if (attachs[x].name.toLowerCase()=="esitoatto.xml"){
                esitoAttach = attachs[x];
                tpec_org.xtc.tp.search.jsdump("find Esito XML : ("+attachs[x].name.toLowerCase()+") ");
              }
              if (attachs[x].name.toLowerCase()=="eccezione.xml"){
                excAttach = attachs[x];
                tpec_org.xtc.tp.search.jsdump("find Eccezione XML : ("+attachs[x].name.toLowerCase()+") ");
              }
              if (attachs[x].contentType.toLowerCase()=="application/xml"){
                if (attachs[x].name.toLowerCase()=="daticert.xml"){
                  xmlAttach = attachs[x];
                  tpec_org.xtc.tp.search.jsdump("find XML : ("+attachs[x].name.toLowerCase()+") ");
                }
              }
            }

            if((esitoAttach==null) && (xmlAttach==null) &&(excAttach==null)){
              tpec_org.xtc.tp.search.jsdump("NO XML "+aMsgHdr.subject);
            }
            if(esitoAttach!=null || excAttach!=null){
              var insideAttach = null;
              if(excAttach!=null){
                insideAttach = excAttach;
              } else if(esitoAttach!=null){
                insideAttach = esitoAttach;
              } 
              var pctfile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
              pctfile.initWithPath(tmpDir);
              pctfile.append(insideAttach.name);
              pctfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
              tpec_org.xtc.tp.search.jsdump("ESITO XML file : ("+pctfile.path+") ");
              messenger.saveAttachmentToFile(pctfile,insideAttach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),insideAttach.contenType,{
                OnStartRunningUrl : function (url) {},
                OnStopRunningUrl : function (url,code) {
                  tpec_org.xtc.tp.search.jsdump("saving ESITO XML attachment");
                  var xmldata = "";
                  var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                                createInstance(Components.interfaces.nsIFileInputStream);
                  var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                                createInstance(Components.interfaces.nsIConverterInputStream);
                  fstream.init(pctfile, -1, 0, 0);
                  cstream.init(fstream, "UTF-8", 0, 0);
                  //changed for tb45
                  var str = {};
                  var read = 0;
                  do { 
                    read = cstream.readString(0xffffffff, str); 
                    xmldata += str.value;
                  } while (read != 0);
                  cstream.close(); 
                  pctfile.remove(true);
                  tpec_org.xtc.tp.search.jsdump("ESITO XML: "+xmldata);
                  
                  if(xmldata.toLowerCase().indexOf(pecMsgId.toLowerCase())>-1){
                    tpecNotificationsHdr.push(certifiedHdr[certIdx]);
                    tpec_org.xtc.tp.search.jsdump("PROCESSCERTIFIED FOUND :"+pecMsgId);
                  }
                  
                  //v164
                  if(xmlAttach!=null){
                    tpec_org.xtc.tp.search.jsdump("INSIDE XMLATTACH");
                    var tmpfile = Components.classes["@mozilla.org/file/local;1"]
                      .createInstance(Components.interfaces.nsIFile);
                    tmpfile.initWithPath(tmpDir);
                    tmpfile.append(xmlAttach.name);
                    tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
                    tpec_org.xtc.tp.search.jsdump("XML file : ("+tmpfile.path+") ");
                    messenger.saveAttachmentToFile(tmpfile,xmlAttach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),xmlAttach.contenType,{
                      OnStartRunningUrl : function (url) {},
                      OnStopRunningUrl : function (url,code) {
                        tpec_org.xtc.tp.search.jsdump("saving XML attachment");
                        var xmldata = "";
                        var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                                      createInstance(Components.interfaces.nsIFileInputStream);
                        var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                                      createInstance(Components.interfaces.nsIConverterInputStream);
                        fstream.init(tmpfile, -1, 0, 0);
                        cstream.init(fstream, "UTF-8", 0, 0);
                        //changed for tb45
                        var str = {};
                        var read = 0;
                        do { 
                          read = cstream.readString(0xffffffff, str); 
                          xmldata += str.value;
                        } while (read != 0);
                        cstream.close(); 
                        tmpfile.remove(true);
                        xmlReader.parseFromString(xmldata, "text/xml");
                        tpec_org.xtc.tp.search.jsdump("start processCertified attributes :"+attrs["identificativo"]["_value"]+" "+pecMsgId);
                        //ver 1.6.0 start
                        if(attrs["identificativo"]["_value"]==pecMsgId)tpecNotificationsHdr.push(certifiedHdr[certIdx]);;
                        //ver 1.6.0 end
                        tpec_org.xtc.tp.search.jsdump("end processCertified attributes");
                        //tpec_org.xtc.tp.search.jsdump("xmldoc: "+attrs["consegna"]);
                        certIdx += 1;
                        tpec_org.xtc.tp.search.processCertified();
                      }
                    });
                  } else {
                    certIdx += 1;
                    tpec_org.xtc.tp.search.processCertified();
                  }
                
                }
              });
            } else {

              if(xmlAttach!=null){
                tpec_org.xtc.tp.search.jsdump("OUTSIDE XMLATTACH");
                var tmpfile = Components.classes["@mozilla.org/file/local;1"]
                  .createInstance(Components.interfaces.nsIFile);
                tmpfile.initWithPath(tmpDir);
                tmpfile.append(xmlAttach.name);
                tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
                tpec_org.xtc.tp.search.jsdump("XML file : ("+tmpfile.path+") ");
                messenger.saveAttachmentToFile(tmpfile,xmlAttach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),xmlAttach.contenType,{
                  OnStartRunningUrl : function (url) {},
                  OnStopRunningUrl : function (url,code) {
                    tpec_org.xtc.tp.search.jsdump("saving XML attachment");
                    var xmldata = "";
                    var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                                  createInstance(Components.interfaces.nsIFileInputStream);
                    var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                                  createInstance(Components.interfaces.nsIConverterInputStream);
                    fstream.init(tmpfile, -1, 0, 0);
                    cstream.init(fstream, "UTF-8", 0, 0);
                    //changed for tb45
                    var str = {};
                    var read = 0;
                    do { 
                      read = cstream.readString(0xffffffff, str); 
                      xmldata += str.value;
                    } while (read != 0);
                     cstream.close(); 
                    tmpfile.remove(true);
                    xmlReader.parseFromString(xmldata, "text/xml");
                    tpec_org.xtc.tp.search.jsdump("start processCertified attributes :"+attrs["identificativo"]["_value"]+" "+pecMsgId);
                    //ver 1.6.0 start
                    if(attrs["identificativo"]["_value"]==pecMsgId)tpecNotificationsHdr.push(certifiedHdr[certIdx]);;
                    //ver 1.6.0 end
                    tpec_org.xtc.tp.search.jsdump("end processCertified attributes");
                    //tpec_org.xtc.tp.search.jsdump("xmldoc: "+attrs["consegna"]);
                    certIdx += 1;
                    tpec_org.xtc.tp.search.processCertified();
                  }
                });
              } else {
                certIdx += 1;
                tpec_org.xtc.tp.search.processCertified();
              }
            }
            },true);
        //} catch (e if e.result == Components.results.NS_ERROR_FAILURE) {
        } catch (e) {
          tpec_org.xtc.tp.search.jsdump("error in searchTP : "+e);
          certIdx += 1;
          tpec_org.xtc.tp.search.processCertified();
        }
        
      } else {
        // start sorting
        var tmpHdr;
        var ts1;
        var ts2;
/*
        for(var tpecIdx=0;tpecIdx<tpecNotificationsHdr.length-1;tpecIdx++){
          ts1 =  tpecNotificationsHdr[tpecIdx].dateInSeconds;
          for(var tpecJdx=tpecIdx+1;tpecJdx<tpecNotificationsHdr.length;tpecJdx++){
            ts2 = tpecNotificationsHdr[tpecJdx].dateInSeconds;
            tpec_org.xtc.tp.search.jsdump("Sorting "+ts1+" : "+ts2); 
            if(ts1>ts2){
              tmpHdr = tpecNotificationsHdr[tpecIdx];
              tpecNotificationsHdr[tpecIdx] = tpecNotificationsHdr[tpecJdx];
              tpecNotificationsHdr[tpecJdx] = tmpHdr;
              ts1 =  tpecNotificationsHdr[tpecIdx].dateInSeconds;
            }
          }
        }
*/
        for(var tpecIdx=0;tpecIdx<tpecNotificationsHdr.length-1;tpecIdx++){
          for(var tpecJdx=tpecIdx+1;tpecJdx<tpecNotificationsHdr.length;tpecJdx++){
            ts1 =  tpecNotificationsHdr[tpecJdx-1].dateInSeconds;
            ts2 = tpecNotificationsHdr[tpecJdx].dateInSeconds;
            tpec_org.xtc.tp.search.jsdump("Sorting "+ts1+" : "+ts2); 
            if(ts1>ts2){
              tmpHdr = tpecNotificationsHdr[tpecJdx-1];
              tpecNotificationsHdr[tpecJdx-1] = tpecNotificationsHdr[tpecJdx];
              tpecNotificationsHdr[tpecJdx] = tmpHdr;
            }
          }
        }
        // end sorting
        tpec_org.xtc.tp.search.jsdump("END PROCESS CERTIFIED");
        tpecIdx = 0;
        tpec_org.xtc.tp.search.processNotifications();
      }
    }
 
    pub.processAttributes = function(esito,pct,fpa){
        var pointer;
        var tmpdate;
        var newdate;
        var jsdate;
        var attr_ts;
        
        attr_ts = 0;
        
        
        if(!showArchive){
          if(dstAttribute==null){
            dstAttribute = new Array();
            attrsArray = attrs["destinatari"];
            for(var x in attrsArray){
              tpec_org.xtc.tp.search.jsdump("processing attribute: "+attrsArray[x]["_value"]);
              
              pointer = attrsArray[x]["_value"].toLowerCase();
              dstAttribute[pointer] = new Array();
              dstAttribute[pointer]["type"] = attrsArray[x]["tipo"];            
            }
          }
          //tpec_org.xtc.tp.search.jsdump("consegna erroreesteso: "+attrs["consegna"]["_value"]); 
          if("consegna" in attrs){
            tpec_org.xtc.tp.search.jsdump("processAttribute: "+attrs["consegna"]["_value"]);
            
            pointer = attrs["consegna"]["_value"].toLowerCase();
            dstAttribute[pointer]["status"] = attrs["postacert"]["tipo"];  
            dstAttribute[pointer]["error"] = attrs["postacert"]["errore"]; 
            //dstAttribute[attrs["consegna"]["_value"]]["error"] = (attrs["postacert"]["errore"]!="nessuno"?attrs["errore-esteso"]["_value"]:"nessuno"); 
            //tpec_org.xtc.tp.search.jsdump("erroreesteso: "+attrs["errore-esteso"]["_value"]); 
            dstAttribute[pointer]["provider"] = attrs["gestore-emittente"]["_value"];
            dstAttribute[pointer]["date"] = attrs["giorno"]["_value"]+" "+attrs["ora"]["_value"]+"(GMT "+attrs["data"]["zona"]+")";
            //ver 1.6.0 start
            tmpdate = attrs["giorno"]["_value"].split('/');
            newdate = tmpdate[1]+"/"+tmpdate[0]+"/"+tmpdate[2];
            jsdate = new Date(newdate +" "+attrs["ora"]["_value"]+" GMT "+attrs["data"]["zona"]);
            dstAttribute[pointer]["timestamp"] =  jsdate.getTime()/1000;
            attr_ts = jsdate.getTime()/1000;
            //ver 1.6.0 end
          } else {
            if(msgAttribute==null){
              msgAttribute = new Array();
            }
            var tmpAttribute = new Array();
            tmpAttribute["status"] = attrs["postacert"]["tipo"];
            if(pct==1){
              tmpAttribute["status"] = attrs["postacert"]["tipo"]+" (pct)"; 
            } else if(pct==2) {
              tmpAttribute["status"] = attrs["postacert"]["tipo"]+" (pct ok)"; 
            } else if(pct==-1) {
              tmpAttribute["status"] = attrs["postacert"]["tipo"]+" (pct ko)"; 
            } else if(pct==-3) {
              tmpAttribute["status"] = attrs["postacert"]["tipo"]+" (pct ne)"; 
            }  
            
            //ver 1.7.0 start
            if(fpa!=""){
              tmpAttribute["status"] = "fatturapa"+" ("+fpa.substring(0,2)+")";
              if(fpa=="ECEC02")tmpAttribute["status"] = "fatturapa"+" (EC KO)";
              if(fpa=="ECEC01")tmpAttribute["status"] = "fatturapa"+" (EC OK)";
              if(fpa=="NEEC02")tmpAttribute["status"] = "fatturapa"+" (NE KO)";
              if(fpa=="NEEC01")tmpAttribute["status"] = "fatturapa"+" (NE OK)";
            }
            fpaDate[tpecIdx] = attrs["giorno"]["_value"]+" "+attrs["ora"]["_value"]+"(GMT "+attrs["data"]["zona"]+")";
            tmpAttribute["error"] = attrs["postacert"]["error"];  
            tmpAttribute["provider"] = attrs["gestore-emittente"]["_value"];
            tmpAttribute["date"] = attrs["giorno"]["_value"]+" "+attrs["ora"]["_value"]+"(GMT "+attrs["data"]["zona"]+")";
            //ver 1.6.0 start
            tmpdate = attrs["giorno"]["_value"].split('/');
            newdate = tmpdate[1]+"/"+tmpdate[0]+"/"+tmpdate[2];
            jsdate = new Date(newdate +" "+attrs["ora"]["_value"]+" GMT "+attrs["data"]["zona"]);
            tmpAttribute["timestamp"] =  jsdate.getTime()/1000;
            attr_ts = jsdate.getTime()/1000;
            //ver 1.6.0 end
            if((esito==null) || ((esito!=null)&&(pct!=0)))msgAttribute.push(tmpAttribute);
          }
        } else {
          //ver 1.6.0 start
          tmpdate = attrs["giorno"]["_value"].split('/');
          newdate = tmpdate[1]+"/"+tmpdate[0]+"/"+tmpdate[2];
          jsdate = new Date(newdate +" "+attrs["ora"]["_value"]+" GMT "+attrs["data"]["zona"]);
          //tmpAttribute["timestamp"] =  jsdate.getTime()/1000;
          attr_ts = jsdate.getTime()/1000;
          tpec_org.xtc.tp.search.jsdump("processing attribute: timestamp="+attr_ts);
          //ver 1.6.0 end
        }
        return attr_ts;
    }    

    pub.renderSubject = function(subject){
      var result = tpec_org.xtc.tp.search.toHTML(subject);
      var subjectStatus;
      var bubbleStyle;
      
      for(var x in msgAttribute){
        subjectStatus = (("status" in msgAttribute[x])&&(typeof msgAttribute[x]["status"] !== 'undefined')?msgAttribute[x]["status"]:"")
        if(subjectStatus!=""){
          subjectStatus = subjectStatus.replace(/ /gi,"");
          //tpec_org.xtc.tp.search.jsdump("renderSubject: "+clearStatus.join(",").indexOf(subjectStatus));
          if(clearStatus.join(",").indexOf(subjectStatus)==-1){
            bubbleStyle="redbubble";
          } else{ 
            bubbleStyle="bluebubble";
            }
          result += "&nbsp;<font class=\""+bubbleStyle+"\">&nbsp;["+translateStatus[subjectStatus]+"]&nbsp;</font>"
        }
      }
      return result;
    }

    pub.renderAddresses = function(addresses,withbr){
      var result = "";
      var addressArray;
      var addressStatus;
      var bubbleStyle;
      var singleAddress;
      var realAddress;
      var spc;
      
      addressArray = addresses.split(",");
      spc = (withbr?"<br/>":"&nbsp;");
      for (var a=0;a<addressArray.length;a++){
        if(result!="")result += ","+spc;
        
        singleAddress = addressArray[a];
        if(singleAddress.indexOf("<")!=-1){
          realAddress = singleAddress.substring(
             singleAddress.indexOf("<")+1,
             singleAddress.indexOf(">")
          );
        } else {
        realAddress = singleAddress;
        }
        realAddress =  realAddress.replace(/ /gi,"").toLowerCase();
        tpec_org.xtc.tp.search.jsdump("REALADDRESS "+realAddress);
        addressStatus = (("status" in dstAttribute[realAddress])&&(typeof dstAttribute[realAddress]["status"] !== 'undefined')?dstAttribute[realAddress]["status"]:"")
        //tpec_org.xtc.tp.search.jsdump("renderAddresses: "+addressStatus);
        if(addressStatus!=""){
          if(clearStatus.join(",").indexOf(addressStatus)==-1){
            bubbleStyle="redbubble";
          } else{ 
            bubbleStyle="bluebubble";
            }
          result += tpec_org.xtc.tp.search.toHTML(singleAddress)+"&nbsp;<font class=\""+bubbleStyle+"\">&nbsp;["+translateStatus[addressStatus]+"]&nbsp;</font>";
        } else {
          result += tpec_org.xtc.tp.search.toHTML(singleAddress);
        }
      }
      //tpec_org.xtc.tp.search.jsdump("renderAddresses: "+result);
      return result;
    }
    
    pub.refresh = function(){ 
      if(!showArchive){
        tpec_org.xtc.tp.search.refreshSearch();
      } else {
        tpec_org.xtc.tp.search.refreshArchive();      
      }
    }

    pub.refreshSearch = function(){
      tpec_org.xtc.tp.search.jsdump("SEARCH: calling refresh search "+showArchive);

      htmlDoc = "";
      htmlDoc += "<html>\n";
      htmlDoc += "<head>\n";
      htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n";
      htmlDoc += "<style type=\"text/css\">\n";
      htmlDoc += "<!--\n";
      htmlDoc += ".desc {font-size:14px;font-weight:bold;}\n";
      htmlDoc += ".value {font-size:14px;font-weight:normal;}\n";
      htmlDoc += ".valuec {font-size:14px;font-weight:normal;text-transform:capitalize;}\n";
      htmlDoc += ".redline {height:2px;background:#E52B50;padding:0px;}\n";
      htmlDoc += ".blueline {height:2px;background:#6495ED;padding:0px;}\n";
      htmlDoc += "table.maintable {border-width:2px;border-spacing:0px;border-style:solid;border-color:black;border-collapse:separate;background-color:#f0f0f0;;}\n";
      htmlDoc += "table.maintable th {border-width:1px;padding:0px;border-style:solid;border-color:black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.maintable td {border-width:1px;padding:0px;border-style:solid;border-color:black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable {border-width:0px 0px 5px 0px;border-spacing:0px;border-style:ridge;border-color:gray;border-collapse:collapse;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable th {border-width:0px;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable td {border-width:0px;background-color:#f0f0f0;}\n";
      htmlDoc += ".headernames {text-align:right;font-size:"+char12+"px;font-weight:normal;color:rgb(136, 138, 133);}\n";
      htmlDoc += ".headervalues {text-align:left;font-size:"+char12+"px;font-weight:normal;}\n";
      htmlDoc += ".headervaluesbold {text-align:left;font-size:"+char12+"px;font-weight:bold;}\n";
      htmlDoc += "table.bodytable {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.bodytable th {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.bodytable td {border-width:0px;background-color:white;}\n";
      htmlDoc += ".bodytext {text-align:left;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += "table.attachtable {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.attachtable th {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.attachtable td {border-width:0px;background-color:white;}\n";
      htmlDoc += ".attachtext {text-align:left;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += "table.notificationtable {border-width:0px;background-color:white;;}\n";
      htmlDoc += "table.notificationtable th {border-width:1px;border-style: outset;border-color: black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.notificationtable td {border-width:1px;border-style: outset;border-color: black;background-color:white;}\n";
      htmlDoc += ".notificationtext {text-align:center;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += ".notificationhdr {text-align:center;font-size:"+char10+"px;font-weight:bold;}\n";
      htmlDoc += "table.legendtable {border-width:0px;background-color:white;;}\n";
      htmlDoc += "table.legendntable th {border-width:0px;border-style: outset;border-color: black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.legendtable td {border-width:0px;border-style: outset;border-color: black;background-color:white;}\n";
      htmlDoc += ".legendtext {text-align:center;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += ".redbubble {text-align:center;font-size:"+char12+"px;font-weight:bold;background-color:#ff0000;-moz-border-radius:5px;color:white;}\n";
      htmlDoc += ".bluebubble {text-align:center;font-size:"+char12+"px;font-weight:bold;background-color:#0000ff;-moz-border-radius:5px;color:white;}\n";
      //htmlDoc += "@page {size: A4; margin: 0; margin-top: 1cm;}\n";
      //htmlDoc += "@media print {html, body {width: 210mm;height: 297mm;}}\n";
      htmlDoc += "-->\n";
      htmlDoc += "</style>\n";
      htmlDoc += "</head>\n";
      htmlDoc += "<body>\n";
      htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
	    htmlDoc += "<tr><td>\n";
      tpec_org.xtc.tp.search.jsdump("SEARCH: refresh legend "+showLegend);
	    if(showLegend){
        htmlDoc += "<table class=\"legendtable\" width=\"100%\">\n";
  	    //htmlDoc += "<tr><td colspan=\"2\" align=\"center\" class=\"legendtext\"><font class=\"bluebubble\">&nbsp;Normale&nbsp;</font>&nbsp;notifica normale&nbsp;</td><td colspan=\"2\" align=\"center\" class=\"legendtext\"><font class=\"redbubble\">&nbsp;Errore&nbsp;</font>&nbsp;notifica di errore&nbsp;</td></tr>\n";
        var oddLegend = 1;
        var bubbleLegend;
        for(var x in translateStatus){
          if(clearStatus.join(",").indexOf(x)==-1){
            bubbleLegend = "redbubble";
          } else {
            bubbleLegend = "bluebubble";
          }
          if(oddLegend==1){
            htmlDoc +=  "<tr><td class=\"legendtext\"><font class=\""+bubbleLegend+"\">&nbsp;["+translateStatus[x]+"]&nbsp;</font>&nbsp;=&nbsp;"+x+"</td>\n";
          } else if(oddLegend==4){
            htmlDoc +=  "<td class=\"legendtext\"><font class=\""+bubbleLegend+"\">&nbsp;["+translateStatus[x]+"]&nbsp;</font>&nbsp;=&nbsp;"+x+"</td></tr>\n";
          } else {
            htmlDoc +=  "<td class=\"legendtext\"><font class=\""+bubbleLegend+"\">&nbsp;["+translateStatus[x]+"]&nbsp;</font>&nbsp;=&nbsp;"+x+"</td>\n";                
          }
          oddLegend = (oddLegend==4?1:oddLegend+1);
        }
        htmlDoc += "</table>\n";       
        htmlDoc += "<tr><td>\n";
      }
      tpec_org.xtc.tp.search.jsdump("SEARCH: refresh tpecSentHdr "+tpecSentHdr);
	    if(tpecSentHdr!=null){
        htmlDoc += "<table class=\"headertable\" width=\"100%\" align=\"left\">\n";
  	    htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">da:&nbsp;&nbsp;</td><td class=\"headervalues\">"+tpec_org.xtc.tp.search.toHTML(tpecSentHdr.author)+"</td></tr>\n";
  	    //htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">oggetto:&nbsp;&nbsp;</td><td class=\"headervaluesbold\">"+tpec_org.xtc.tp.search.renderSubject(tpecSentHdr.subject)+"</td></tr>\n";
  	    htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">oggetto:&nbsp;&nbsp;</td><td class=\"headervaluesbold\">"+tpec_org.xtc.tp.search.renderSubject(xmlSentHdr["subject"])+"</td></tr>\n";
  	    htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">a:&nbsp;&nbsp;</td><td class=\"headervalues\">"+tpec_org.xtc.tp.search.renderAddresses(tpecSentHdr.recipients,false)+"</td></tr>\n";
  	    if(tpecSentHdr.ccList!=""){
          htmlDoc += "<tr><td class=\"headernames\">cc:&nbsp;&nbsp;</td><td class=\"headervalues\">"+tpec_org.xtc.tp.search.renderAddresses(tpecSentHdr.ccList,false)+"</td></tr>\n";
        }
        var msgDate = new Date(tpecSentHdr.date/1000);
  	    htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">inviato:&nbsp;&nbsp;</td><td class=\"headervalues\">"+tpec_org.xtc.tp.search.toHTML(msgDate.toLocaleString())+"</td></tr>\n";
  	    htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">msg id:&nbsp;&nbsp;</td><td class=\"headervalues\">"+originalMsgId+"</td></tr>\n";
  	    if(fpaFound==1)htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">Id SDI:&nbsp;&nbsp;</td><td class=\"headervalues\">"+fpaSDI+"</td></tr>\n";
        htmlDoc += "</table>\n";       
  	    if(sentSnippet!=""){
          htmlDoc += "<table class=\"bodytable\" width=\"100%\">\n";
          htmlDoc += "<tr><td><pre class=\"bodytext\">"+tpec_org.xtc.tp.search.toHTML(sentSnippet)+"</pre></td></tr>\n";
          htmlDoc += "</table>\n";       
        }
        if((sentAttachments!=null)&&(sentAttachments.length>0)){
          htmlDoc += "<table class=\"attachtable\" width=\"100%\">\n";
          htmlDoc += "<tr><td colspan=\"2\" class=\"bodytext\"><hr/></td></tr>\n";       
          htmlDoc += "<tr><td class=\"bodytext\"><b>Allegati</b></td><td></td></tr>\n";
          var oddNumber = true;
          for(var x in sentAttachments){
                if(oddNumber){
                  htmlDoc +=  "<tr><td class=\"attachtext\">"+sentAttachments[x].name+"</td>";
                } else {
                  htmlDoc +=  "<td class=\"attachtext\">"+sentAttachments[x].name+"</td></tr>\n";                
                }
                oddNumber = !oddNumber;
          }
          if(!oddNumber)htmlDoc +=  "<td></td></tr>\n";
          htmlDoc += "</table>\n";       
          
        }
      } else {
        htmlDoc += "<table class=\"headertable\" width=\"100%\" align=\"left\">\n";
  	    if(xmlSentHdr["from"])htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">da:&nbsp;&nbsp;</td><td class=\"headervalues\">"+xmlSentHdr["from"]+"</td></tr>\n";
  	    if(xmlSentHdr["subject"])htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">oggetto:&nbsp;&nbsp;</td><td class=\"headervaluesbold\">"+tpec_org.xtc.tp.search.renderSubject(xmlSentHdr["subject"])+"</td></tr>\n";
  	    if(xmlSentHdr["to"])htmlDoc += "<tr><td class=\"headernames\" width=\"10%\" valign=\"top\">a/cc:&nbsp;&nbsp;</td><td class=\"headervalues\">"+(xmlSentHdr["to"]!="" ? tpec_org.xtc.tp.search.renderAddresses(xmlSentHdr["to"],true):"&nbsp;")+"</td></tr>\n";      
  	    if(originalMsgId)htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">msg id:&nbsp;&nbsp;</td><td class=\"headervalues\">"+originalMsgId+"</td></tr>\n";
  	    if(fpaFound==1)htmlDoc += "<tr><td class=\"headernames\" width=\"10%\">Id SDI:&nbsp;&nbsp;</td><td class=\"headervalues\">"+fpaSDI+"</td></tr>\n";
        htmlDoc += "</table>\n";       
      }
      htmlDoc += "</td></tr>\n";
	    htmlDoc += "<tr><td>\n";
      tpec_org.xtc.tp.search.jsdump("SEARCH: refresh msgAttribute "+msgAttribute);
	    if(msgAttribute!=null){
          tpec_org.xtc.tp.search.jsdump("msgAttribute: "+msgAttribute.length);    
          htmlDoc += "<table class=\"notificationtable\" width=\"100%\">\n";
          htmlDoc += "<tr><th colspan=\"4\" class=\"notificationhdr\">Stato del messaggio</th></tr>\n";
          htmlDoc += "<tr>";
          htmlDoc += "<td class=\"notificationhdr\">Stato</td>";            
          htmlDoc += "<td class=\"notificationhdr\">Gestore PEC</td>";            
          htmlDoc += "<td class=\"notificationhdr\">Data</td>"; 
          htmlDoc += "<td class=\"notificationhdr\">Errore</td>";            
          htmlDoc += "</tr>\n";
          for(var x in msgAttribute){
            htmlDoc += "<tr>";
            htmlDoc += "<td class=\"notificationtext\">"+(("status" in msgAttribute[x])&&(typeof msgAttribute[x]["status"] !== 'undefined')?msgAttribute[x]["status"]:"&nbsp;")+"</td>";            
            htmlDoc += "<td class=\"notificationtext\">"+(("provider" in msgAttribute[x])&&(typeof msgAttribute[x]["provider"] !== 'undefined')?msgAttribute[x]["provider"]:"&nbsp;")+"</td>";            
            htmlDoc += "<td class=\"notificationtext\">"+(("date" in msgAttribute[x])&&(typeof msgAttribute[x]["date"] !== 'undefined')?msgAttribute[x]["date"]:"&nbsp;")+"</td>"; 
            htmlDoc += "<td class=\"notificationtext\">"+(("error" in msgAttribute[x])&&(typeof msgAttribute[x]["error"] !== 'undefined')?msgAttribute[x]["error"]:"&nbsp;")+"</td>";            
            htmlDoc += "</tr>\n";
          }
          htmlDoc += "</table>\n";       
      }	    
      tpec_org.xtc.tp.search.jsdump("SEARCH: refresh dstAttribute "+dstAttribute);
	    if(dstAttribute!=null){
          htmlDoc += "<table class=\"notificationtable\" width=\"100%\">\n";
          htmlDoc += "<tr><th colspan=\"6\" class=\"notificationhdr\">Stato dei destinatari</th></tr>\n";
          htmlDoc += "<tr>";
          htmlDoc += "<td class=\"notificationhdr\">Destinatario</td>";
          htmlDoc += "<td class=\"notificationhdr\">Tipo</td>";
          htmlDoc += "<td class=\"notificationhdr\">Stato</td>";            
          htmlDoc += "<td class=\"notificationhdr\">Gestore PEC</td>";            
          htmlDoc += "<td class=\"notificationhdr\">Data</td>"; 
          htmlDoc += "<td class=\"notificationhdr\">Errore</td>";            
          htmlDoc += "</tr>\n";
          for(var x in dstAttribute){
            htmlDoc += "<tr>";
            htmlDoc += "<td class=\"notificationtext\">"+x.replace("@","@&#8203")+"</td>";
            htmlDoc += "<td class=\"notificationtext\">"+dstAttribute[x]["type"]+"</td>";
            htmlDoc += "<td class=\"notificationtext\">"+(("status" in dstAttribute[x])&&(typeof dstAttribute[x]["status"] !== 'undefined')?dstAttribute[x]["status"]:"&nbsp;")+"</td>";            
            htmlDoc += "<td class=\"notificationtext\">"+(("provider" in dstAttribute[x])&&(typeof dstAttribute[x]["provider"] !== 'undefined')?dstAttribute[x]["provider"]:"&nbsp;")+"</td>";            
            htmlDoc += "<td class=\"notificationtext\">"+(("date" in dstAttribute[x])&&(typeof dstAttribute[x]["date"] !== 'undefined')?dstAttribute[x]["date"]:"&nbsp;")+"</td>"; 
            htmlDoc += "<td class=\"notificationtext\">"+(("error" in dstAttribute[x])&&(typeof dstAttribute[x]["error"] !== 'undefined')?dstAttribute[x]["error"]:"&nbsp;")+"</td>";            
            htmlDoc += "</tr>\n";
          }
          htmlDoc += "</table>\n";       
      }	    
      tpec_org.xtc.tp.search.jsdump("SEARCH: refresh pctFound "+pctFound);
	    if(pctFound!=0){
          htmlDoc += "<table class=\"notificationtable\" width=\"100%\">\n";
          htmlDoc += "<tr><th colspan=\"4\" class=\"notificationhdr\">PCT</th></tr>\n";
          htmlDoc += "<tr>";
          htmlDoc += "<td class=\"notificationhdr\">Esito</td>";
          htmlDoc += "<td class=\"notificationhdr\">Numero Ruolo</td>";
          htmlDoc += "<td class=\"notificationhdr\">Descrizione</td>";            
          htmlDoc += "<td class=\"notificationhdr\">Data</td>";            
          htmlDoc += "</tr>\n";
          for(var x in esitoAttrs){
            if(pctNotifications[x]!=0){
              htmlDoc += "<tr>";
              htmlDoc += "<td class=\"notificationtext\">"+(("codiceesito" in esitoAttrs[x])&&(typeof esitoAttrs[x]["codiceesito"] !== 'undefined')?(esitoAttrs[x]["codiceesito"]==-3?"Notifica eccezione":esitoAttrs[x]["codiceesito"]):"&nbsp;")+"</td>";
              htmlDoc += "<td class=\"notificationtext\">"+(("numeroruolo" in esitoAttrs[x])&&(typeof esitoAttrs[x]["numeroruolo"] !== 'undefined')?esitoAttrs[x]["numeroruolo"]:"&nbsp;")+"</td>";
              htmlDoc += "<td class=\"notificationtext\">"+(("descrizioneesito" in esitoAttrs[x])&&(typeof esitoAttrs[x]["descrizioneesito"] !== 'undefined')?esitoAttrs[x]["descrizioneesito"]:"&nbsp;")+"</td>";
              htmlDoc += "<td class=\"notificationtext\">"+(("data" in esitoAttrs[x])&&(typeof esitoAttrs[x]["data"] !== 'undefined')?esitoAttrs[x]["data"]:"&nbsp;")+"&nbsp;"+(("ora" in esitoAttrs[x])&&(typeof esitoAttrs[x]["ora"] !== 'undefined')?esitoAttrs[x]["ora"]:"&nbsp;")+"&nbsp;"+(("zoneDesignator" in esitoAttrs[x])&&(typeof esitoAttrs[x]["zoneDesignator"] !== 'undefined')?"(GMT "+esitoAttrs[x]["zoneDesignator"]+")":"&nbsp;")+"</td>";
              htmlDoc += "</tr>\n"; 
            }           
          }
          htmlDoc += "</table>\n";       
      }	    
	    if(fpaFound!=0){
          htmlDoc += "<table class=\"notificationtable\" width=\"100%\">\n";
          htmlDoc += "<tr><th colspan=\"4\" class=\"notificationhdr\">FatturaPA</th></tr>\n";
          htmlDoc += "<tr>";
          htmlDoc += "<td class=\"notificationhdr\">Descrizione</td>";            
          htmlDoc += "<td class=\"notificationhdr\">Data</td>";            
          htmlDoc += "<td class=\"notificationhdr\">Esito</td>";
          htmlDoc += "</tr>\n";
          var fpaError = "";
          for(var x=0;x<fpaNotifications.length;x++){
            if(fpaNotifications[x]!=""){
              if(fpaNotifications[x].length>2){
                var s =  fpaNotifications[x].substr(2);
                if(s=="EC01")fpaError = "ACCETTAZIONE";
                if(s=="EC02")fpaError = "RIFIUTO";
                if(s=="EN00")fpaError = "NOTIFICA NON CONFORME AL FORMATO";
                if(s=="EN01")fpaError = "NOTIFICA NON AMMISSIBILE";
              } else {
                fpaError = "&nbsp;";
              }
              htmlDoc += "<tr>";
              htmlDoc += "<td class=\"notificationtext\">"+translateFPA[fpaNotifications[x].substr(0,2)]+"</td>";
              htmlDoc += "<td class=\"notificationtext\">"+fpaDate[x]+"</td>"; 
              htmlDoc += "<td class=\"notificationtext\">"+fpaError+"</td>";
              htmlDoc += "</tr>\n"; 
            }           
          }
          htmlDoc += "</table>\n";       
      }	    
      htmlDoc += "</td></tr>\n";
      htmlDoc += "</table>\n";
      htmlDoc += "</body>\n";
      htmlDoc += "</html>\n";

	    var toRemove = new Array();
      if(pctFound!=0){
         for(var x in esitoAttrs){
            tpec_org.xtc.tp.search.jsdump("esitoAttrs :"+x);
            if(pctNotifications[x]==0){
              tpecNotificationsHdr.splice(x, 1);
              toRemove.push(x);
              tpec_org.xtc.tp.search.jsdump("REMOVE :"+x);
            }           
          }
      }	    
      for(var x in toRemove){
        pctNotifications.splice(x, 1);
        esitoAttrs.splice(x, 1);
      }
      toRemove = null;

      //tpec_org.xtc.tp.search.jsdump("msgID: "+msgId);    
      var filename = "search.html";
      var xmlfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      xmlfile.initWithPath(tmpDir);
      xmlfile.append(filename);
      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                               createInstance(Components.interfaces.nsIFileOutputStream);
      foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
      //foStream.write(htmlDoc, htmlDoc.length);
      //foStream.close();
      var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
          createInstance(Components.interfaces.nsIConverterOutputStream);
      converter.init(foStream, "UTF-8", 0, 0);
      converter.writeString(htmlDoc);
      converter.close(); 
      var ios = Components.classes["@mozilla.org/network/io-service;1"].
                  getService(Components.interfaces.nsIIOService);
      var url = ios.newFileURI(xmlfile);
      
      var timestamp = new Date().getTime();      
      document.getElementById("tpecSearchViewer").setAttribute('src', url.spec+"?t="+timestamp);
      document.getElementById("tpecReadButton").setAttribute('disabled', false);        
    };


    pub.refreshArchive = function(){
      tpec_org.xtc.tp.search.jsdump("SEARCH: calling refresh achive"+showArchive);
      htmlDoc = "";
      htmlDoc += "<html>\n";
      htmlDoc += "<head>\n";
      htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n";
      htmlDoc += "<style type=\"text/css\">\n";
      htmlDoc += "<!--\n";
      htmlDoc += ".desc {font-size:14px;font-weight:bold;}\n";
      htmlDoc += ".value {font-size:14px;font-weight:normal;}\n";
      htmlDoc += ".valuec {font-size:14px;font-weight:normal;text-transform:capitalize;}\n";
      htmlDoc += ".redline {height:2px;background:#E52B50;padding:0px;}\n";
      htmlDoc += ".blueline {height:2px;background:#6495ED;padding:0px;}\n";
      htmlDoc += "table.maintable {border-width:2px;border-spacing:0px;border-style:solid;border-color:black;border-collapse:separate;background-color:#f0f0f0;;}\n";
      htmlDoc += "table.maintable th {border-width:1px;padding:0px;border-style:solid;border-color:black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.maintable td {border-width:1px;padding:0px;border-style:solid;border-color:black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable {border-width:0px 0px 5px 0px;border-spacing:0px;border-style:ridge;border-color:gray;border-collapse:collapse;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable th {border-width:0px;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable td {border-width:0px;background-color:#f0f0f0;}\n";
      htmlDoc += ".headernames {text-align:right;font-size:"+char12+"px;font-weight:normal;color:rgb(136, 138, 133);}\n";
      htmlDoc += ".headervalues {text-align:left;font-size:"+char12+"px;font-weight:normal;}\n";
      htmlDoc += ".headervaluesbold {text-align:left;font-size:"+char12+"px;font-weight:bold;}\n";
      htmlDoc += "table.bodytable {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.bodytable th {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.bodytable td {border-width:0px;background-color:white;}\n";
      htmlDoc += ".bodytext {text-align:left;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += "table.attachtable {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.attachtable th {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.attachtable td {border-width:0px;background-color:white;}\n";
      htmlDoc += ".attachtext {text-align:left;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += "table.notificationtable {border-width:0px;background-color:white;;}\n";
      htmlDoc += "table.notificationtable th {border-width:1px;border-style: outset;border-color: black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.notificationtable td {border-width:1px;border-style: outset;border-color: black;background-color:white;}\n";
      htmlDoc += ".notificationtitle {text-align:center;font-size:"+char12+"px;font-weight:normal;}\n";
      htmlDoc += ".notificationtext {text-align:center;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += ".notificationhdr {text-align:center;font-size:"+char10+"px;font-weight:bold;}\n";
      htmlDoc += "table.legendtable {border-width:0px;background-color:white;;}\n";
      htmlDoc += "table.legendntable th {border-width:0px;border-style: outset;border-color: black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.legendtable td {border-width:0px;border-style: outset;border-color: black;background-color:white;}\n";
      htmlDoc += ".legendtext {text-align:center;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += ".redbubble {text-align:center;font-size:"+char12+"px;font-weight:bold;background-color:#ff0000;-moz-border-radius:5px;color:white;}\n";
      htmlDoc += ".bluebubble {text-align:center;font-size:"+char12+"px;font-weight:bold;background-color:#0000ff;-moz-border-radius:5px;color:white;}\n";
      htmlDoc += "-->\n";
      htmlDoc += "</style>\n";
      htmlDoc += "</head>\n";
      htmlDoc += "<body>\n";
      htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
      
      htmlDoc += "<table class=\"notificationtable\" width=\"100%\">\n";
      htmlDoc += "<tr><th colspan=\"6\" class=\"notificationtitle\">Premere <b>Archivia</b> per archiviare i messaggi</th></tr>\n";
      htmlDoc += "<tr>";
      htmlDoc += "<td class=\"notificationhdr\">Oggetto</td>";
      htmlDoc += "<td class=\"notificationhdr\">Timestamp</td>";            
      htmlDoc += "</tr>\n";
      for(var tpecIdx=0;tpecIdx<tpecNotificationsHdr.length;tpecIdx++){
        htmlDoc += "<tr>";
        htmlDoc += "<td class=\"notificationtext\">"+tpecNotificationsHdr[tpecIdx].mime2DecodedSubject+"</td>";
        htmlDoc += "<td class=\"notificationtext\">"+(timestampNotifications[tpecIdx]!=0?timestampNotifications[tpecIdx]:"&nbsp;")+"</td>";
        htmlDoc += "</tr>\n";
      }    
      htmlDoc += "</table>\n";       
      
      htmlDoc += "</table>\n";
      htmlDoc += "</body>\n";
      htmlDoc += "</html>\n";

      //tpec_org.xtc.tp.search.jsdump("msgID: "+msgId);    
      var filename = "search.html";
      var xmlfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      xmlfile.initWithPath(tmpDir);
      xmlfile.append(filename);
      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                               createInstance(Components.interfaces.nsIFileOutputStream);
      foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
      //foStream.write(htmlDoc, htmlDoc.length);
      //foStream.close();
      var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
          createInstance(Components.interfaces.nsIConverterOutputStream);
      converter.init(foStream, "UTF-8", 0, 0);
      converter.writeString(htmlDoc);
      converter.close(); 
      var ios = Components.classes["@mozilla.org/network/io-service;1"].
                  getService(Components.interfaces.nsIIOService);
      var url = ios.newFileURI(xmlfile);
      
      var timestamp = new Date().getTime();      
      document.getElementById("tpecSearchViewer").setAttribute('src', url.spec+"?t="+timestamp);
    };

    pub.showError = function(txt){
      tpec_org.xtc.tp.search.jsdump("SEARCH: calling show error "+txt);
      htmlDoc = "";
      htmlDoc += "<html>\n";
      htmlDoc += "<head>\n";
      htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n";
      htmlDoc += "<style type=\"text/css\">\n";
      htmlDoc += "<!--\n";
      htmlDoc += ".desc {font-size:14px;font-weight:bold;}\n";
      htmlDoc += ".value {font-size:14px;font-weight:normal;}\n";
      htmlDoc += ".valuec {font-size:14px;font-weight:normal;text-transform:capitalize;}\n";
      htmlDoc += ".redline {height:2px;background:#E52B50;padding:0px;}\n";
      htmlDoc += ".blueline {height:2px;background:#6495ED;padding:0px;}\n";
      htmlDoc += "table.maintable {border-width:2px;border-spacing:0px;border-style:solid;border-color:black;border-collapse:separate;background-color:#f0f0f0;;}\n";
      htmlDoc += "table.maintable th {border-width:1px;padding:0px;border-style:solid;border-color:black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.maintable td {border-width:1px;padding:0px;border-style:solid;border-color:black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable {border-width:0px 0px 5px 0px;border-spacing:0px;border-style:ridge;border-color:gray;border-collapse:collapse;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable th {border-width:0px;background-color:#f0f0f0;}\n";
      htmlDoc += "table.headertable td {border-width:0px;background-color:#f0f0f0;}\n";
      htmlDoc += ".headernames {text-align:right;font-size:"+char12+"px;font-weight:normal;color:rgb(136, 138, 133);}\n";
      htmlDoc += ".headervalues {text-align:left;font-size:"+char12+"px;font-weight:normal;}\n";
      htmlDoc += ".headervaluesbold {text-align:left;font-size:"+char12+"px;font-weight:bold;}\n";
      htmlDoc += "table.bodytable {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.bodytable th {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.bodytable td {border-width:0px;background-color:white;}\n";
      htmlDoc += ".bodytext {text-align:left;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += "table.attachtable {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.attachtable th {border-width:0px;background-color:white;}\n";
      htmlDoc += "table.attachtable td {border-width:0px;background-color:white;}\n";
      htmlDoc += ".attachtext {text-align:left;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += "table.notificationtable {border-width:0px;background-color:white;;}\n";
      htmlDoc += "table.notificationtable th {border-width:1px;border-style: outset;border-color: black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.notificationtable td {border-width:1px;border-style: outset;border-color: black;background-color:white;}\n";
      htmlDoc += ".notificationtitle {text-align:center;font-size:"+char12+"px;font-weight:normal;}\n";
      htmlDoc += ".notificationtext {text-align:center;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += ".notificationhdr {text-align:center;font-size:"+char10+"px;font-weight:bold;}\n";
      htmlDoc += "table.legendtable {border-width:0px;background-color:white;;}\n";
      htmlDoc += "table.legendntable th {border-width:0px;border-style: outset;border-color: black;background-color:#f0f0f0;}\n";
      htmlDoc += "table.legendtable td {border-width:0px;border-style: outset;border-color: black;background-color:white;}\n";
      htmlDoc += ".legendtext {text-align:center;font-size:"+char10+"px;font-weight:normal;}\n";
      htmlDoc += ".redbubble {text-align:center;font-size:"+char12+"px;font-weight:bold;background-color:#ff0000;-moz-border-radius:5px;color:white;}\n";
      htmlDoc += ".bluebubble {text-align:center;font-size:"+char12+"px;font-weight:bold;background-color:#0000ff;-moz-border-radius:5px;color:white;}\n";
      htmlDoc += "-->\n";
      htmlDoc += "</style>\n";
      htmlDoc += "</head>\n";
      htmlDoc += "<body>\n";
      htmlDoc += "<p align=\"center\"><h3>"+txt+"</h3></p>\n";
      htmlDoc += "</body>\n";
      htmlDoc += "</html>\n";

      //tpec_org.xtc.tp.search.jsdump("msgID: "+msgId);    
      var filename = "search.html";
      var xmlfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      xmlfile.initWithPath(tmpDir);
      xmlfile.append(filename);
      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                               createInstance(Components.interfaces.nsIFileOutputStream);
      foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
      //foStream.write(htmlDoc, htmlDoc.length);
      //foStream.close();
      var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
          createInstance(Components.interfaces.nsIConverterOutputStream);
      converter.init(foStream, "UTF-8", 0, 0);
      converter.writeString(htmlDoc);
      converter.close(); 
      var ios = Components.classes["@mozilla.org/network/io-service;1"].
                  getService(Components.interfaces.nsIIOService);
      var url = ios.newFileURI(xmlfile);
      
      var timestamp = new Date().getTime();      
      document.getElementById("tpecSearchViewer").setAttribute('src', url.spec+"?t="+timestamp);
    };

    pub.toHTML = function(s){
      var result = s;
      //result = result.replace(/</gi,"&lt;");
      //result = result.replace(/>/gi,"&gt;");
      result = ThunderPecUtility.escapeHtmlEntities(result);
      return result;
      }
      
    pub.markread = function(){
        for(var i = 0;i<tpecNotificationsHdr.length;i++){
          tpecNotificationsHdr[i].markRead(true);
        }    
    }
    pub.charUp = function(){
        if(char12<20){
          char12++;
          char10++;
          tpec_org.xtc.tp.search.refresh();
        }   
    }
    pub.charDown = function(){
        if(char12>12){
          char12--;
          char10--;
          tpec_org.xtc.tp.search.refresh();
        }   
    }
  
  
    pub.archive = function() {
    
      document.getElementById("tpecArchiveButton").setAttribute('disabled', true);      
      var suffix = new Date().toISOString().replace(new RegExp("[-:.]","g"),"");
      var reportsuffix = suffix;
      var filezip;
      var pctsuffix;

      if(prefTP.getZName()=='subject'){
        if (("subject" in xmlSentHdr)&&(typeof xmlSentHdr["subject"] !== 'undefined')&&(xmlSentHdr["subject"] != "")) {
          tpec_org.xtc.tp.search.jsdump("SEARCH: filename "+xmlSentHdr["subject"]);
          reportsuffix =  xmlSentHdr["subject"].replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
          if(reportsuffix.length>175)reportsuffix = reportsuffix.substring(0, 175);
          suffix = reportsuffix;
          tpec_org.xtc.tp.search.jsdump("REPORT SUFFIX : "+reportsuffix);
        } else {
          if(fpaFound!=0)suffix = "SDI_"+fpaSDI;
        }
      }

      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
      fp.init(window, stringBundle.getString('tpec.search.save'), nsIFilePicker.modeSave);
      fp.appendFilter("File ZIP","*.zip");
      fp.defaultExtension = ".zip";
      fp.defaultString = suffix+".zip";

      var chkbx =  document.getElementById("tpecArchiveExtended");
      /*
      var rv = fp.show();
      if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
        tpec_org.xtc.tp.search.jsdump(fp.file+" "+fp.file.path);
       
        try {
          var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
          var zipW = new zipWriter();
          zipW.open(fp.file, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);
          if(!chkbx.checked)zipW.addEntryDirectory('script', Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, false);
          
          if(!showArchive){
            var htmlfile = Components.classes["@mozilla.org/file/local;1"]
              .createInstance(Components.interfaces.nsIFile);
            htmlfile.initWithPath(tmpDir);
            htmlfile.append(reportsuffix+"-report.html");
            if(!htmlfile.exists()){
              var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                       createInstance(Components.interfaces.nsIFileOutputStream);
              foStream.init(htmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
              foStream.write(htmlDoc,htmlDoc.length);
              foStream.close();
              if(!chkbx.checked)zipW.addEntryFile(htmlfile.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, htmlfile, false);
            }
          }
          //ver 1.6.0 start
          if(!chkbx.checked)tpec_org.xtc.tp.search.saveToFile("baltimore.pem",TPECBaltimorePEM,tmpDir,zipW,'');
          //ver 1.6.0 end

          var msgArray = new Array();
          
          var uri;
          var filename;
          if(tpecSentHdr){
            filename = suffix+"-000-messaggio.eml";
            uri = tpecSentHdr.folder.getUriForMsg(tpecSentHdr);
            msgArray.push([filename,uri]);
          }
          
          var tmpHdr;
          var count = 1;
          var subject;
          var colon;
          var sslcmd;
          var sslfile;
          var sslf;
          var ts;
          

         
          for(tpecIdx in tpecNotificationsHdr){
          //for(var tpecIdx=0;tpecIdx<tpecNotificationsHdr.length;tpecIdx++){
            
            ts = timestampNotifications[tpecIdx];
            

            tmpHdr = tpecNotificationsHdr[tpecIdx];
            var countString = "000000000" + count;
            //filename = suffix+"-"+(count<9?"0"+count:count);
            filename = suffix+"-"+countString.substr(countString.length-3);
            count++;
            uri = tmpHdr.folder.getUriForMsg(tmpHdr);
            subject = tmpHdr.mime2DecodedSubject.toLowerCase();
            colon = subject.indexOf(':');
            subject = subject.substring(0,colon).replace(/ /gi,"");
            filename += "-"+subject;

            tpec_org.xtc.tp.search.jsdump("pctNotifications "+tpecIdx+" "+pctNotifications[tpecIdx]);
            if(pctFound!=0){
              if(pctNotifications[tpecIdx]!=0){
                pctsuffix = esitoAttrs[tpecIdx]["subject"].toLowerCase();
                tpec_org.xtc.tp.search.jsdump("pctsuffix "+pctsuffix+" "+xmlSentHdr["subject"]);
                pctsuffix = pctsuffix.substring("posta certificata:".length);
                if(pctsuffix.indexOf("notifica eccezione")==-1)pctsuffix = pctsuffix.substring(0,pctsuffix.length-xmlSentHdr["subject"].length);
                if(pctsuffix.indexOf("accettazione")>-1)pctsuffix = "accettazione deposito";
                pctsuffix =  pctsuffix.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                filename = filename.replace(new RegExp("postacertificata$","g"),pctsuffix);
              }
             }           
            if(fpaFound!=0){
              if(fpaNotifications[tpecIdx]!=""){
                filename += "-f"+fpaNotifications[tpecIdx].toLowerCase();
              }
            }          
            
            if(ts!=0 && !chkbx.checked){
              //windows openssl
              sslfile = filename+".bat";
              sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+".eml -attime "+ts+"\n";
              sslcmd += "pause\n";
              tpec_org.xtc.tp.search.saveToFile(sslfile,sslcmd,tmpDir,zipW,'script');
              
              //*nix openssl
              sslfile = filename+".sh";
              sslcmd = "#!/bin/bash\n\n";
              sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+".eml -attime "+ts+"\n";
              sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
              tpec_org.xtc.tp.search.saveToFile(sslfile,sslcmd,tmpDir,zipW,'script');
            }
            
            filename += ".eml";
            msgArray.push([filename,uri]);
           }
           
           tpec_org.xtc.tp.search.asyncSaveToFile(msgArray,tmpDir,0,zipW,fp.file.path);
   
        } catch(e){
          tpec_org.xtc.tp.search.jsdump("Exception : "+e);
          prompts.alert(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.error.savezip')+" "+fp.file.path);        
          document.getElementById("tpecArchiveButton").setAttribute('disabled', false);    
        }
      } else {
        document.getElementById("tpecArchiveButton").setAttribute('disabled', false);            
      } 
      */
      fp.open(rv => {
        if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
          tpec_org.xtc.tp.search.jsdump(fp.file+" "+fp.file.path);
         
          try {
            var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
            var zipW = new zipWriter();
            zipW.open(fp.file, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);
            if(!chkbx.checked)zipW.addEntryDirectory('script', Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, false);
            
            if(!showArchive){
              var htmlfile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
              htmlfile.initWithPath(tmpDir);
              htmlfile.append(reportsuffix+"-report.html");
              if(!htmlfile.exists()){
                var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                         createInstance(Components.interfaces.nsIFileOutputStream);
                foStream.init(htmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
                foStream.write(htmlDoc,htmlDoc.length);
                foStream.close();
                if(!chkbx.checked)zipW.addEntryFile(htmlfile.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, htmlfile, false);
              }
            }
            //ver 1.6.0 start
            if(!chkbx.checked)tpec_org.xtc.tp.search.saveToFile("baltimore.pem",TPECBaltimorePEM,tmpDir,zipW,'');
            //ver 1.6.0 end
  
            var msgArray = new Array();
            
            var uri;
            var filename;
            if(tpecSentHdr){
              filename = suffix+"-000-messaggio.eml";
              uri = tpecSentHdr.folder.getUriForMsg(tpecSentHdr);
              msgArray.push([filename,uri]);
            }
            
            var tmpHdr;
            var count = 1;
            var subject;
            var colon;
            var sslcmd;
            var sslfile;
            var sslf;
            var ts;
            
  
           
            for(tpecIdx in tpecNotificationsHdr){
            //for(var tpecIdx=0;tpecIdx<tpecNotificationsHdr.length;tpecIdx++){
              
              ts = timestampNotifications[tpecIdx];
              
  
              tmpHdr = tpecNotificationsHdr[tpecIdx];
              var countString = "000000000" + count;
              //filename = suffix+"-"+(count<9?"0"+count:count);
              if(!showArchive){
                filename = suffix+"-"+countString.substr(countString.length-3);
              } else {
                filename = countString.substr(countString.length-3);
              }
              count++;
              uri = tmpHdr.folder.getUriForMsg(tmpHdr);
              subject = tmpHdr.mime2DecodedSubject.toLowerCase();
              colon = subject.indexOf(':');
              subject = subject.substring(0,colon).replace(/ /gi,"");
              filename += "-"+subject;
  
              tpec_org.xtc.tp.search.jsdump("pctNotifications "+tpecIdx+" "+pctNotifications[tpecIdx]);
              if(pctFound!=0){
                if(pctNotifications[tpecIdx]!=0){
                  pctsuffix = esitoAttrs[tpecIdx]["subject"].toLowerCase();
                  tpec_org.xtc.tp.search.jsdump("pctsuffix "+pctsuffix+" "+xmlSentHdr["subject"]);
                  pctsuffix = pctsuffix.substring("posta certificata:".length);
                  if(pctsuffix.indexOf("notifica eccezione")==-1)pctsuffix = pctsuffix.substring(0,pctsuffix.length-xmlSentHdr["subject"].length);
                  if(pctsuffix.indexOf("accettazione")>-1)pctsuffix = "accettazione deposito";
                  pctsuffix =  pctsuffix.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                  filename = filename.replace(new RegExp("postacertificata$","g"),pctsuffix);
                }
               }           
              if(fpaFound!=0){
                if(fpaNotifications[tpecIdx]!=""){
                  filename += "-f"+fpaNotifications[tpecIdx].toLowerCase();
                }
              }          
              
              if(ts!=0 && !chkbx.checked){
                //windows openssl
                sslfile = filename+".bat";
                sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+".eml -attime "+ts+"\n";
                sslcmd += "pause\n";
                tpec_org.xtc.tp.search.saveToFile(sslfile,sslcmd,tmpDir,zipW,'script');
                
                //*nix openssl
                sslfile = filename+".sh";
                sslcmd = "#!/bin/bash\n\n";
                sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+".eml -attime "+ts+"\n";
                sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                tpec_org.xtc.tp.search.saveToFile(sslfile,sslcmd,tmpDir,zipW,'script');
              }
              
              filename += ".eml";
              msgArray.push([filename,uri]);
             }
             
             tpec_org.xtc.tp.search.asyncSaveToFile(msgArray,tmpDir,0,zipW,fp.file.path);
     
          } catch(e){
            tpec_org.xtc.tp.search.jsdump("Exception : "+e);
            prompts.alert(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.error.savezip')+" "+fp.file.path);        
            document.getElementById("tpecArchiveButton").setAttribute('disabled', false);    
          }
        } else {
          document.getElementById("tpecArchiveButton").setAttribute('disabled', false);            
        } 
      });
      

    };
    
    
  pub.saveToFile = function(filename,filecontent,tmpDir,zip,subdir){
      var tmpfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      tmpfile.initWithPath(tmpDir);
      tmpfile.append(filename);
      if(!tmpfile.exists()){
        var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                 createInstance(Components.interfaces.nsIFileOutputStream);
        foStream.init(tmpfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
        foStream.write(filecontent,filecontent.length);
        foStream.close();
      }
      if(subdir!=""){
        subdir += "/";
      }
      zip.addEntryFile(subdir+tmpfile.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, tmpfile, false);
  
  };
  
  pub.asyncSaveToFile = function(auri,path,idx,zip,fzip) {
      var streamListener = {
        foStream : null,
        chkfile : null,
        QueryInterface : function(iid)  {
                if (iid.equals(Components.interfaces.nsIStreamListener) ||  
                    iid.equals(Components.interfaces.nsISupports))
                return this;
                throw Components.results.NS_NOINTERFACE;
                return 0;
        },
        onStartRequest : function (aRequest, aContext) {
          if(idx<auri.length){
            this.chkfile = Components.classes["@mozilla.org/file/local;1"]
              .createInstance(Components.interfaces.nsIFile);
            this.chkfile.initWithPath(path);
            this.chkfile.append(auri[idx][0]);
            tpec_org.xtc.tp.search.jsdump("OK: START saving message "+auri[idx][0]);
            this.foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                     createInstance(Components.interfaces.nsIFileOutputStream);
            this.foStream.init(this.chkfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
          }
        },
        onStopRequest : function (aRequest, aContext, aStatusCode) {
          if(idx<auri.length){
            this.foStream.close();
            this.foStream = null;
            tpec_org.xtc.tp.search.jsdump("OK: END saving message "+auri[idx][0]);
            zip.addEntryFile(this.chkfile.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, this.chkfile, false);
            idx++;
            if(idx<auri.length){
              tpec_org.xtc.tp.search.asyncSaveToFile(auri,path,idx,zip,fzip);  
            } else {
              if (("subject" in xmlSentHdr)&&(typeof xmlSentHdr["subject"] !== 'undefined')) {
                zip.comment =  xmlSentHdr["subject"];
                tpec_org.xtc.tp.search.jsdump("ZIP COMMENT : "+zip.comment);
              }
              zip.close();
              prompts.alert(window,stringBundle.getString('tpec.search.operationdone'),fzip+" "+stringBundle.getString('tpec.search.filesaved'))
              document.getElementById("tpecArchiveButton").setAttribute('disabled', false);    
              if (prefTP.getCloseOnSave()=='on'){
                window.close();
              }
            }
          }
        },
        onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount) {
      		var stream = Components.classes["@mozilla.org/scriptableinputstream;1"].
                           createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
      		stream.init(aInputStream);
          this.foStream.write(stream.read(aCount),aCount);
        }
      };
	var messageService = messenger.messageServiceFromURI(auri[idx][1]).QueryInterface(Components.interfaces.nsIMsgMessageService);
	messageService.streamMessage(auri[idx][1], streamListener, null, null, false, null);
  };      
      
  return pub;
}();
