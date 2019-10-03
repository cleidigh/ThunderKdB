Components.utils.import("resource://gre/modules/NetUtil.jsm");

function ThunderPecUtilityAsync() {

  this.tmp = "";
  this.tmpDir = null;
  this.savedFile = "";
  this.p7mFile = "";
  this.content = "";
  this.message = "",
  this.xmlcontent = "",
  this.esitocontent = "",
  this.fatturacontent = "",
  this.txtcontent = "",
  this.checkpec = false,
  this.pecheaders = ["X-Riferimento-Message-ID","X-Ricevuta","X-VerificaSicurezza","X-Trasporto","X-TipoRicevuta"],
  this.hasXML = false,
  this.hasEsitoXML = false,
  this.hasFatturaXML = false,
  this.hasP7M = false,
  this.internalP7M = false,
  this.hasP7MBug = false,
  this.p7mStatus = false,
	this._keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	
	this.msgURI = null;
	this.filename = "";
	this.callback = null;
	this.prefTP = null;
	this.messenger = null;
	
	this.p7mattachments = null;
  
  this.is60 = false;
  
  this.jsdump = function(str){
    if(this.prefTP.getDebug()){
      Components.classes['@mozilla.org/consoleservice;1']
                .getService(Components.interfaces.nsIConsoleService)
                .logStringMessage("ThunderPEC["+Date.now()+"] (async): "+str);
      if(this.tmpDir!=null)this.prefTP.log(this.tmpDir,"ThunderPEC["+Date.now()+"] (async): "+str+"\n");

                }
  };

  this.check60 = function(){
    var info = Components.classes["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    this.jsdump("versione 60 "+info.version);
    if(versionChecker.compare(info.version, "60.0") < 0) {
      this.is60 = false;
    } else {
      this.is60 = true;
    }
  },

  this.checkXML = function(t){

    this.getXML(t);
    this.jsdump("Check XML "+this.hasXML);
    return this.hasXML;
    };
    
  this.check = function(t,c,u){
    var content = "";
    var cnt = "";
    var URL = null;
    var loops = 0;
    
    this.tmpDir = t;
    this.checkpec = false;
    this.savedFile = null;
    this.hasXML = false;
    this.hasEsitoXML = false;
    this.hasFatturaXML = false;
    this.xmlcontent = null;
    this.txtcontent = null;
    this.esitocontent = null;
    this.fatturacontent = null;
    this.hasP7M = false;
    this.hasP7MBug = false;
    this.p7mStatus = false;
    this.internalP7M = false;
    this.is60 = false;
    
    this.callback = c;
    
    this.prefTP = new ThunderPecPrefs();
    this.prefTP.init();
    this.messenger = Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger);
    this.check60();

    
    this.p7mStatus = this.prefTP.getP7M()=="on";

    this.jsdump("P7M Status : "+this.p7mStatus);
    
    var info = Components.classes["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    if(versionChecker.compare(info.version, "27.0a1") < 0) {
      this.internalP7M = false;
      this.jsdump("TB Version < 27 "+info.version);
    } else {
      this.internalP7M = true;
      this.jsdump("TB Version >= 27 "+info.version);
    }
    
    this.msgURI = null;
    if(u!=null){
      this.msgURI = u;
    } else {
      this.msgURI = gFolderDisplay.selectedMessageUris[0];
    }
   
    this.jsdump("Messenger "+this.messenger+" uri "+this.msgURI);
    
    if(this.msgURI){
    
      
      this.filename = "tp-email";
      try{
        var hdr = this.messenger.msgHdrFromURI(this.msgURI);
        this.filename = hdr.messageId;
        this.filename = this.filename.replace(/@/g,"-");
        this.filename = this.filename.replace(/\./g,"");
        this.filename = this.filename.replace(/</g,"");
        this.filename = this.filename.replace(/>/g,"");
        this.filename = "tp-"+this.filename.replace(/>/g,"");
        this.jsdump("OK: filename "+this.filename);

      
        var streamListener = {
          foStream : null,
          chkfile : null,
          content : "",
          loops : 0,
          parent : null, 
          QueryInterface : function(iid)  {
                  if (iid.equals(Components.interfaces.nsIStreamListener) ||  
                      iid.equals(Components.interfaces.nsISupports))
                  return this;
                  throw Components.results.NS_NOINTERFACE;
                  return 0;
          },
          init : function(t){
            this.parent = t;
            return this;
          }, 
          onStartRequest : function (aRequest, aContext) {
            this.parent.jsdump("Start Async Streaming");
            this.content = "";
          },
          onStopRequest : function (aRequest, aContext, aStatusCode) {
            this.parent.jsdump("End Async Streaming "+this.loops+","+this.content.length);
  
            var mymail = new ThunderPecParser();
            mymail.hasInternalP7M(this.parent.internalP7M);
            mymail.setContent(this.content);
            mymail.processII(mymail,0,this.content.length,0);
            //this.parent.jsdump("DUMP:\n"+mymail.dump());
            //P7M: verify p7m
            this.parent.hasP7M = mymail.containsP7M;
            this.parent.hasP7MBug =  this.parent.hasP7M && !this.parent.internalP7M && this.parent.p7mStatus
            //P7M
            this.parent.jsdump("CONTENT : "+mymail.contentType["content-type"]);
            if(mymail.contentType["content-type"].toLowerCase()=="multipart/signed"){
              for (var i=0; i<this.parent.pecheaders.length;i++){
                if(mymail.headers[this.parent.pecheaders[i].toLowerCase()]!=undefined){
                  this.parent.checkpec = true;
                }
              }
            }
            if(this.parent.checkpec){  
              this.parent.jsdump("OK: isPEC");
            }
            
            if(this.parent.checkpec==true){
              this.parent.jsdump("OK: postprocessing PEC message");
              var emlFilename = this.parent.filename+".eml";
              var emlfile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
              emlfile.initWithPath(t);
              emlfile.append(emlFilename);
              this.parent.performSave(emlfile,mymail);    
              
              //working on xml
              this.parent.performXML(mymail);
              if(this.parent.hasXML==true){
                var xmlFilename = this.parent.filename+".xml";;
                var xmlfile = Components.classes["@mozilla.org/file/local;1"]
                  .createInstance(Components.interfaces.nsIFile);
                xmlfile.initWithPath(t);
                xmlfile.append(xmlFilename);
                try{
                  var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                           createInstance(Components.interfaces.nsIFileOutputStream);
                  foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
                  this.parent.jsdump("OK: using utf8 converter on XML");
                  
                  var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                      createInstance(Components.interfaces.nsIConverterOutputStream);
                  converter.init(foStream, "UTF-8", 0, 0);
                  converter.writeString(this.parent.xmlcontent);
                  converter.close(); 
                  
                  foStream.close();
                  
                } catch (ex) {
                  this.parent.jsdump("KO: error saving xml file"+ex);
                }
              }
              
              //working on esitoXML
              if(mymail.esitoXML!=null){
                this.parent.performEsitoXML(mymail);
                if(this.parent.hasEsitoXML==true){
                  var xmlFilename = this.parent.filename+"_esito.xml";;
                  var xmlfile = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsIFile);
                  xmlfile.initWithPath(t);
                  xmlfile.append(xmlFilename);
                  try{
                    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                             createInstance(Components.interfaces.nsIFileOutputStream);
                    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
                    this.parent.jsdump("OK: using utf8 converter on XML");
                    
                    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                        createInstance(Components.interfaces.nsIConverterOutputStream);
                    converter.init(foStream, "UTF-8", 0, 0);
                    converter.writeString(this.parent.esitocontent);
                    converter.close(); 
                    
                    foStream.close();
                    
                    //v166 start
                    if(hdr.mime2DecodedSubject.indexOf("POSTA CERTIFICATA")==0){
                      var regex = new RegExp("\<CodiceEsito\>(.*)\<\/CodiceEsito\>","g");
                      var match = regex.exec(this.parent.esitocontent);
                      if(match!=null){
                        var esitoValue = match[1];
                        this.parent.jsdump("ESITO : "+match[1]);
                        
                        regex = new RegExp("\<IdMsg\>(.*)\<\/IdMsg\>","g");
                        match = regex.exec(this.parent.esitocontent);
                        var pecReference =  match[1].replace(/\&lt;|\&gt;/g,"");
                        this.parent.jsdump("ESITO : "+match[1].replace(/\&lt;|\&gt;/g,""));
                        this.parent.jsdump("ESITO : "+hdr.messageId);
                        
                        var aDBConnection = ThunderPecSql.dbConnection; 
                        var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
                        stmt.params.mid = hdr.messageId;
                        stmt.executeAsync({
                          rows:0,
                          handleResult: function(aResultSet) {this.rows = 1;},
                          handleError: function(aError) {streamListener.parent.jsdump("ESITO : "+aError.message);},
                          handleCompletion: function(aReason) {
                            streamListener.parent.jsdump("ESITO ROWS: "+this.rows);
                            if (aReason==Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED && this.rows==0){
                              streamListener.parent.jsdump("ESITO INSERTING ROW ");
                              var st = aDBConnection.createStatement("INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES (:mid,:dis,'',:ref,'',:val,'');");
                              st.params.mid = hdr.messageId;
                              st.params.dis = hdr.dateInSeconds;
                              st.params.ref = pecReference;
                              st.params.val = esitoValue;
                              st.executeAsync({
                                handleResult: function() {},
                                handleError: function(aError) {streamListener.parent.jsdump("ESITO : "+aError.message);},
                                handleCompletion: function(aReason) {}
                              });
                              st.finalize();
                            }
                          }
                        });
                        stmt.finalize();
                        
                      }
                    }
                    
                  } catch (ex) {
                    this.parent.jsdump("KO: error saving esito xml file"+ex);
                  }
                }
              
              }
              //working on FatturaXML
              if(mymail.fatturaXML!=null){
                this.parent.performFatturaXML(mymail);
                if(this.parent.hasFatturaXML==true){
                  var xmlFilename = this.parent.filename+"_fattura.xml";;
                  var xmlfile = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsIFile);
                  xmlfile.initWithPath(t);
                  xmlfile.append(xmlFilename);
                  try{
                    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                             createInstance(Components.interfaces.nsIFileOutputStream);
                    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
                    this.parent.jsdump("OK: using utf8 converter on XML");
                    
                    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                        createInstance(Components.interfaces.nsIConverterOutputStream);
                    converter.init(foStream, "UTF-8", 0, 0);
                    converter.writeString(this.parent.fatturacontent);
                    converter.close(); 
                    
                    foStream.close();
                    
                  } catch (ex) {
                    this.parent.jsdump("KO: error saving esito xml file"+ex);
                  }
                }
              
              }
              //working on FatturaZIP
              if(mymail.fatturaZIP!=null){
                this.parent.performFatturaZIP(t,mymail);
                if(this.parent.hasFatturaXML==true){
                  var xmlFilename = this.parent.filename+"_fattura.xml";;
                  var xmlfile = Components.classes["@mozilla.org/file/local;1"]
                    .createInstance(Components.interfaces.nsIFile);
                  xmlfile.initWithPath(t);
                  xmlfile.append(xmlFilename);
                  try{
                    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                             createInstance(Components.interfaces.nsIFileOutputStream);
                    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
                    this.parent.jsdump("OK: using utf8 converter on XML");
                    
                    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                        createInstance(Components.interfaces.nsIConverterOutputStream);
                    converter.init(foStream, "UTF-8", 0, 0);
                    converter.writeString(this.parent.fatturacontent);
                    converter.close(); 
                    
                    foStream.close();
                    
                  } catch (ex) {
                    this.parent.jsdump("KO: error saving esito xml file"+ex);
                  }
                }
              
              }
              //working on txt
              this.parent.performTXT(mymail);
              var txtFilename = this.parent.filename+".txt";;
              var txtfile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
              txtfile.initWithPath(t);
              txtfile.append(txtFilename);
              try{
                var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                         createInstance(Components.interfaces.nsIFileOutputStream);
                foStream.init(txtfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
                this.parent.jsdump("OK: using utf8 converter on PREAMBLE");
                var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                    createInstance(Components.interfaces.nsIConverterOutputStream);
                converter.init(foStream, "UTF-8", 0, 0);
                converter.writeString(this.parent.txtcontent);
                converter.close(); 
                foStream.close();
              } catch (ex) {
                this.parent.jsdump("KO: error saving txt file");
              }
            }
                
            //patch p7m error and save whole email content 
            //if(this.hasP7MBug==true && this.checkpec==false){     //commented out in order to handle print of CONSEGNA with p7m
            if(this.parent.hasP7MBug==true){
              this.parent.jsdump("OK: postprocessing P7M message");
              var wholeFilename = this.parent.filename+"-p7m.eml";;
              var wholeFile = Components.classes["@mozilla.org/file/local;1"]
                .createInstance(Components.interfaces.nsIFile);
              wholeFile.initWithPath(t);
              wholeFile.append(wholeFilename);
              this.parent.jsdump("OK: START patching message");
              this.content = mymail.p7mpatch(this.content);
              this.parent.jsdump("OK: END patching message");
              try{
                var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                         createInstance(Components.interfaces.nsIFileOutputStream);
                foStream.init(wholeFile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
                foStream.write(this.content, this.content.length);
                foStream.close();
                this.parent.p7mFile = wholeFile;
                this.parent.p7mattachments = mymail.p7mattachments;
                this.parent.jsdump("p7m attachments: "+this.parent.p7mattachments);
              } catch (ex) {
                this.jsdump("KO: error saving p7m file");
              }
            }
            mymail.destroy();
            
            this.parent.callback(this.parent);
  
          },
          onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount) {
        		var stream = Components.classes["@mozilla.org/scriptableinputstream;1"].
                             createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
        		stream.init(aInputStream);
        		cnt = stream.read(aCount);
        		if(cnt!="")this.content = this.content+cnt;
        		this.loops++;
          }
        }.init(this);
        
        try {
          var messageService = this.messenger.messageServiceFromURI(this.msgURI).QueryInterface(Components.interfaces.nsIMsgMessageService);
          messageService.streamMessage(this.msgURI, streamListener, null, null, false, "fetchCompleteMessage=true");
        } catch (ex) {
          this.jsdump("KO: Error in Async Streaming");
        }
      } catch (ex) {
        this.jsdump("KO: generating filename "+ex);
      }
    }

  };
  
  this.saveEML = function(t){
    var content = "";
    var cnt;
    var URL = null;
    this.jsdump("EXECUTING saveEML");
    this.savedFile = null;
    this.hasXML = false;
    if(this.msgURI){
      var MessageURI = this.msgURI;
      var hdr = this.messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = "tp-"+filename.replace(/>/g,"");
      filename += ".eml";
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(!chkfile.exists()){
      } else {
        this.savedFile = chkfile;
      }

      var ios = Components.classes["@mozilla.org/network/io-service;1"].
                  getService(Components.interfaces.nsIIOService);
      URL = ios.newFileURI(this.savedFile).QueryInterface(Components.interfaces.nsIURL);
      if(!this.is60){
        URL.query = "type=application/x-message-display";
      } else {
        URL = URL.mutate().setQuery("type=application/x-message-display").finalize();
      }
      //this.message = mymail;
      }
    return URL;
  };
  
  this.saveP7M = function(t){
    var content = "";
    var cnt;
    var URL = null;
    this.p7mFile = null;
    this.hasXML = false;
    if(this.msgURI){
      var MessageURI = this.msgURI;
      var hdr = this.messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = "tp-"+filename.replace(/>/g,"");
      filename += "-p7m.eml";
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(!chkfile.exists()){
      } else {
        this.p7mFile = chkfile;
      }

      var ios = Components.classes["@mozilla.org/network/io-service;1"].
                  getService(Components.interfaces.nsIIOService);
      URL = ios.newFileURI(this.p7mFile).QueryInterface(Components.interfaces.nsIURL);
      if(!this.is60){
        URL.query = "type=application/x-message-display";
      } else {
        URL = URL.mutate().setQuery("type=application/x-message-display").finalize();
      }
      //this.jsdump(chkfile);
      }
    return URL;
  };
  
  this.getXML = function(t){
    var content = "";
    var cnt = "";
    var URL = null;
    this.xmlcontent = null;
    this.hasXML = false;
    if(this.msgURI){
      var MessageURI = this.msgURI;
      var hdr = this.messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = "tp-"+filename.replace(/>/g,"");
      filename += ".xml";
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(chkfile.exists()){
        this.hasXML = true;
        this.xmlcontent = "";
        var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                      createInstance(Components.interfaces.nsIFileInputStream);
        var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                      createInstance(Components.interfaces.nsIConverterInputStream);
        fstream.init(chkfile, -1, 0, 0);
        cstream.init(fstream, "UTF-8", 0, 0); 
        
        //changed for tb45
        var str = {};
        var read = 0;
        do { 
          read = cstream.readString(0xffffffff, str); 
          this.xmlcontent += str.value;
        } while (read != 0);

        cstream.close(); 
  
      } 
    }
    return this.xmlcontent;
  };

  this.getEsitoXML = function(t){
    var content = "";
    var cnt = "";
    var URL = null;
    this.esitocontent = null;
    this.hasEsitoXML = false;
    if(this.msgURI){
      var MessageURI = this.msgURI;
      var hdr = this.messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = "tp-"+filename.replace(/>/g,"");
      filename += "_esito.xml";
      this.jsdump("getEsitoXML: "+filename);
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(chkfile.exists()){
        this.hasEsitoXML = true;
        this.esitocontent = "";
        var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                      createInstance(Components.interfaces.nsIFileInputStream);
        var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                      createInstance(Components.interfaces.nsIConverterInputStream);
        fstream.init(chkfile, -1, 0, 0);
        cstream.init(fstream, "UTF-8", 0, 0); 
        
        //changed for tb45
        var str = {};
        var read = 0;
        do { 
          read = cstream.readString(0xffffffff, str); 
            this.esitocontent += str.value;
        } while (read != 0);
        cstream.close(); 
  
      } 
    }
    return this.esitocontent;
  };

   this.getFatturaXML = function(t){
    var content = "";
    var cnt = "";
    var URL = null;
    this.fatturacontent = null;
    this.hasFatturaXML = false;
    if(this.msgURI){
      var MessageURI = this.msgURI;
      var hdr = this.messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = "tp-"+filename.replace(/>/g,"");
      filename += "_fattura.xml";
      this.jsdump("getfatturaXML: "+filename);
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(chkfile.exists()){
        this.hasFatturaXML = true;
        this.fatturacontent = "";
        var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                      createInstance(Components.interfaces.nsIFileInputStream);
        var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                      createInstance(Components.interfaces.nsIConverterInputStream);
        fstream.init(chkfile, -1, 0, 0);
        cstream.init(fstream, "UTF-8", 0, 0); 
        
        //changed for tb45
        var str = {};
        var read = 0;
        do { 
          read = cstream.readString(0xffffffff, str); 
          this.fatturacontent += str.value;
        } while (read != 0);
        cstream.close(); 
  
      } 
    }
    return this.fatturacontent;
  };

  this.getTxt = function(t){
    var content = "";
    var cnt = "";
    var URL = null;
    this.txtcontent = null;
    if(this.msgURI){
      var MessageURI = this.msgURI;
      var hdr = this.messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = "tp-"+filename.replace(/>/g,"");
      filename += ".txt";
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(chkfile.exists()){
        this.txtcontent = "";
        var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                      createInstance(Components.interfaces.nsIFileInputStream);
        var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                      createInstance(Components.interfaces.nsIConverterInputStream);
        fstream.init(chkfile, -1, 0, 0);
        cstream.init(fstream, "UTF-8", 0, 0); 
        
        //changed for tb45
        var str = {};
        var read = 0;
        do { 
          read = cstream.readString(0xffffffff, str); 
          this.txtcontent += str.value;
        } while (read != 0);
        cstream.close(); 
        
      }
    }
    return this.txtcontent;
  };


  this.performSave = function(f,m){
    if(m.mimeXML!=null){
      if(!this.hasXML){
        this.hasXML = true;
        }
    }
    if(m.mimeEML!=null){
      if(this.savedFile==null){
        var content = m.content.substr(m.mimeEML.sections[0][0],m.mimeEML.sections[0][1]);
        try {
          this.jsdump("Saving EML file: "+f);
          var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                   createInstance(Components.interfaces.nsIFileOutputStream);
          foStream.init(f, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
          if(this.p7mStatus){
            content = m.p7mpatch(content);
          }
          
          foStream.write(content, content.length);
          foStream.close();
          this.savedFile = f;
          //v173pre2 start
          this.jsdump("--------------MAIL COMPONENTS--------------");
          m.view();
          this.jsdump("--------------MAIL COMPONENTS--------------");
          var emlmail = new ThunderPecParser();
          emlmail.hasInternalP7M(m.internalP7M);
          emlmail.setContent(content);
          emlmail.processII(emlmail,0,content.length,0);
          this.jsdump("--------------EML COMPONENTS--------------");
          emlmail.view();
          this.jsdump("--------------EML COMPONENTS--------------");
          if(emlmail.esitoXML!=null){
            m.esitoXML = emlmail.esitoXML;
            m.esitoXML.sections[0][0] += m.mimeEML.sections[0][0];
          }
          if(emlmail.fatturaXML!=null){
            m.fatturaXML = emlmail.fatturaXML;
            m.fatturaXML.sections[0][0] += m.mimeEML.sections[0][0];
          }
          if(emlmail.fatturaZIP!=null){
            m.fatturaZIP = emlmail.fatturaZIP;
            m.fatturaZIP.sections[0][0] += m.mimeEML.sections[0][0];
          }
          /* inserted in v173pre2
          //v1.6.3
          //this.jsdump("EML:"+content);           
          if(content.toLowerCase().search("name=\"esitoatto\.xml\"")!=-1 || content.toLowerCase().search("filename=\"esitoatto\.xml\"")!=-1 || content.toLowerCase().search("name=esitoatto\.xml")!=-1 || content.toLowerCase().search("filename=esitoatto\.xml")!=-1){
            var pctmail = new ThunderPecParser();
            pctmail.hasInternalP7M(m.internalP7M);
            pctmail.setContent(content);
            pctmail.processII(pctmail,0,content.length,0);
            m.esitoXML = pctmail.esitoXML;
            m.esitoXML.sections[0][0] += m.mimeEML.sections[0][0];
          }
          if(content.toLowerCase().search("name=\"eccezione\.xml\"")!=-1 || content.toLowerCase().search("filename=\"eccezione\.xml\"")!=-1 || content.toLowerCase().search("name=eccezione\.xml")!=-1 || content.toLowerCase().search("filename=eccezione\.xml")!=-1){
            var pctmail = new ThunderPecParser();
            pctmail.hasInternalP7M(m.internalP7M);
            pctmail.setContent(content);
            pctmail.processII(pctmail,0,content.length,0);
            m.esitoXML = pctmail.esitoXML;
            m.esitoXML.sections[0][0] += m.mimeEML.sections[0][0];
          }
          //v1.6.3
          //v1.7.0
          var fx = new RegExp("[a-zA-Z][a-zA-Z][a-zA-Z0-9\_]*\_(RC|NS|MC|NE|MT|EC|SE|DT)\_[a-zA-Z0-9]{1,3}\.xml","g");
          //if(fx.exec(content)){
          if(content.search(fx)!=-1){
            var fatturamail = new ThunderPecParser();
            fatturamail.hasInternalP7M(m.internalP7M);
            fatturamail.setContent(content);
            fatturamail.processII(fatturamail,0,content.length,0);
            m.fatturaXML = fatturamail.fatturaXML;
            m.fatturaXML.sections[0][0] += m.mimeEML.sections[0][0];
          }
          var fx = new RegExp("[a-zA-Z][a-zA-Z][a-zA-Z0-9\_]*\_(AT)\_[a-zA-Z0-9\_]{1,3}\.zip","g");
          //if(fx.exec(content)){
          if(content.search(fx)!=-1){
            var fatturamail = new ThunderPecParser();
            fatturamail.hasInternalP7M(m.internalP7M);
            fatturamail.setContent(content);
            fatturamail.processII(fatturamail,0,content.length,0);
            m.fatturaZIP = fatturamail.fatturaZIP;
            m.fatturaZIP.sections[0][0] += m.mimeEML.sections[0][0];
          }
          
          //v1.7.0
          
          */
          
          //173pre2 stop
          content = null;
        } catch (ex) {
          this.jsdump("KO: error saving eml file"+ex+" "+f);
        }
      }
    } 
  };

  this.performXML = function(m){
    this.jsdump("PerformXML "+m.mimeXML);

    if(m.mimeXML!=null){
      if(this.xmlcontent==null){
        this.hasXML = true;
        var content = m.content.substr(m.mimeXML.sections[0][0],m.mimeXML.sections[0][1]);;
        if(m.mimeXML.headers["content-transfer-encoding"]=="base64"){
          content = this.decodeB64(content);
        }
        if(m.mimeXML.headers["content-transfer-encoding"]=="quoted-printable"){
          content = this.decodeQP(content);
        }
        this.xmlcontent = content;
      }
    }  
  };

this.performEsitoXML = function(m){
    this.jsdump("PerformEsitoXML "+m.esitoXML);

    if(m.esitoXML!=null){
      if(this.esitocontent==null){
        this.hasEsitoXML = true;
        var content = m.content.substr(m.esitoXML.sections[0][0],m.esitoXML.sections[0][1]);;
        if(m.esitoXML.headers["content-transfer-encoding"]=="base64"){
          content = this.decodeB64(content);
        }
        if(m.esitoXML.headers["content-transfer-encoding"]=="quoted-printable"){
          content = this.decodeQP(content);
        }
        
        var oParser = new DOMParser();
        var oDOM = oParser.parseFromString(content, "text/xml");
        var oSerializer = new XMLSerializer();
        content = oSerializer.serializeToString(oDOM);

        this.jsdump("performEsitoXML: "+content);
        
        this.esitocontent = content;
      }
    }  
  };

 this.performFatturaXML = function(m){
    this.jsdump("PerformFatturaXML "+m.fatturaXML);

    if(m.fatturaXML!=null){
      if(this.fatturacontent==null){
        this.hasFatturaXML = true;
        var content = m.content.substr(m.fatturaXML.sections[0][0],m.fatturaXML.sections[0][1]);;
        if(m.fatturaXML.headers["content-transfer-encoding"]=="base64"){
          content = this.decodeB64(content);
        }
        if(m.fatturaXML.headers["content-transfer-encoding"]=="quoted-printable"){
          content = this.decodeQP(content);
        }
        
        var oParser = new DOMParser();
        var oDOM = oParser.parseFromString(content, "text/xml");
        var oSerializer = new XMLSerializer();
        content = oSerializer.serializeToString(oDOM);

        this.jsdump("PerformFatturaXML: "+content);
        
        this.fatturacontent = content;
      }
    }  
  };
 
 this.performFatturaZIP = function(t,m){
    this.jsdump("PerformFatturaZIP "+m.fatturaZIP);

    if(m.fatturaZIP!=null){
      if(this.fatturacontent==null){
        var content = m.content.substr(m.fatturaZIP.sections[0][0],m.fatturaZIP.sections[0][1]);;
        //this.jsdump("PerformFatturaZIP "+content);
        if(m.fatturaZIP.headers["content-transfer-encoding"]=="base64"){
          content = this.decodeB64bin(content);
        }

        var xmlFilename = "fattura.zip";
        var xmlfile = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsIFile);
        xmlfile.initWithPath(t);
        xmlfile.append(xmlFilename);
        try{
          var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                   createInstance(Components.interfaces.nsIFileOutputStream);
          foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
          foStream.write(content, content.length);          
          foStream.close();
          
          var zr = Components.classes["@mozilla.org/libjar/zip-reader;1"].createInstance(Components.interfaces.nsIZipReader);
          try {
            zr.open(xmlfile);
            var zx = new RegExp("[a-zA-Z0-9\_]*\_(AT)\_[a-zA-Z0-9\_]{1,3}\.xml","g");
            var nx = null;
            var entries = zr.findEntries('*'); 
            while (entries.hasMore()) {
              var entryPointer = entries.getNext(); 
              var entry = zr.getEntry(entryPointer);
              this.jsdump("FATTURA ZIP: "+entryPointer);
              nx = zx.exec(entryPointer);
              if(nx!=null){
                  this.hasFatturaXML = true;
                  var inputStream = zr.getInputStream(entryPointer);
                  var reusableStreamInstance = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);                            
                  reusableStreamInstance.init(inputStream);
                  var fileContents = reusableStreamInstance.read(entry.realSize);
              }
            }
          } catch (ex) {
          } finally {
            zr.close();
          }                    
          
          
        } catch (ex) {
          this.parent.jsdump("KO: error saving esito xml file"+ex);
        }

        this.jsdump("PerformFatturaZIP: "+fileContents);
        
        this.fatturacontent = fileContents;
      }
    }  
  };


  this.performTXT = function(m){
    if(m.mimeTXT!=null){
      if(this.txtcontent==null){
        var content = m.content.substr(m.mimeTXT.sections[0][0],m.mimeTXT.sections[0][1]);
        if(m.mimeTXT.headers["content-transfer-encoding"]=="base64"){
          content = this.decodeB64(content);
        }
        if(m.mimeTXT.headers["content-transfer-encoding"]=="quoted-printable"){
          content = this.decodeQP(content);
        }
        this.txtcontent = content;
      }
    } 
  };

  this._getEML = function(m){
		var content = "";   //ver 1.5.2
    if(m.contentType["content-type"]){
      if(m.contentType["content-type"].toLowerCase()=="message/rfc822"){
        content = m.sections[0];
      } else {
        var i = 0;
        for(i=0;i<m.mimeparts.length;i++){
          this._getEML(m.mimeparts[i]);
        }
      } 
    }
  };
  
  this.getEML = function(){
    this._getEML(this.message);
    return content;
  };

  this.decodeB64 = function(input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		output = this.utf8decode(output);
 
		return output;
 
	};

  this.decodeB64bin = function(input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
 
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 
		while (i < input.length) {
 
			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));
 
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
 
			output = output + String.fromCharCode(chr1);
 
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
 
		}
 
		//output = this.utf8decode(output);
 
		return output;
 
	};

  this.utf8decode = function(utftext) {
		var string = "";
		var i = 0;
		var c = 0;
    var c1 = 0;
    var c2 = 0;
    var c3 = 0;
 
		while ( i < utftext.length ) {
 
			c = utftext.charCodeAt(i);
 
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
 
		}
 
		return string;
	};
  this.decodeQP = function (s){
    var content = s;
    content = content.replace(new RegExp("=\n","ig"),"");
    var mt = content.match(/=[0-9A-F][0-9A-F]/ig);
    if(mt!=null){
      var val = 0;
      var rgx = "";
      for(var j=0;j<mt.length;j++){
        val = parseInt(mt[j].substr(1,2),16);
        rgx = new RegExp(mt[j],"ig");
        content = content.replace(rgx,String.fromCharCode(val));
      }
      rgx = new RegExp("="+String.fromCharCode(0x0d)+String.fromCharCode(0x0a),"ig");
      content = content.replace(rgx,"");
    }
    return content;
  };
  
  this.escapeHtmlEntities = function (text) {
      return text.replace(/[\u00A0-\u2666<>\&]/g, function(c) {
          return '&' + (this.entityTable[c.charCodeAt(0)] || '#'+c.charCodeAt(0)) + ';';
      });
  };

 this.entityTable = {
      34 : 'quot', 
      38 : 'amp', 
      39 : 'apos', 
      60 : 'lt', 
      62 : 'gt', 
      160 : 'nbsp', 
      161 : 'iexcl', 
      162 : 'cent', 
      163 : 'pound', 
      164 : 'curren', 
      165 : 'yen', 
      166 : 'brvbar', 
      167 : 'sect', 
      168 : 'uml', 
      169 : 'copy', 
      170 : 'ordf', 
      171 : 'laquo', 
      172 : 'not', 
      173 : 'shy', 
      174 : 'reg', 
      175 : 'macr', 
      176 : 'deg', 
      177 : 'plusmn', 
      178 : 'sup2', 
      179 : 'sup3', 
      180 : 'acute', 
      181 : 'micro', 
      182 : 'para', 
      183 : 'middot', 
      184 : 'cedil', 
      185 : 'sup1', 
      186 : 'ordm', 
      187 : 'raquo', 
      188 : 'frac14', 
      189 : 'frac12', 
      190 : 'frac34', 
      191 : 'iquest', 
      192 : 'Agrave', 
      193 : 'Aacute', 
      194 : 'Acirc', 
      195 : 'Atilde', 
      196 : 'Auml', 
      197 : 'Aring', 
      198 : 'AElig', 
      199 : 'Ccedil', 
      200 : 'Egrave', 
      201 : 'Eacute', 
      202 : 'Ecirc', 
      203 : 'Euml', 
      204 : 'Igrave', 
      205 : 'Iacute', 
      206 : 'Icirc', 
      207 : 'Iuml', 
      208 : 'ETH', 
      209 : 'Ntilde', 
      210 : 'Ograve', 
      211 : 'Oacute', 
      212 : 'Ocirc', 
      213 : 'Otilde', 
      214 : 'Ouml', 
      215 : 'times', 
      216 : 'Oslash', 
      217 : 'Ugrave', 
      218 : 'Uacute', 
      219 : 'Ucirc', 
      220 : 'Uuml', 
      221 : 'Yacute', 
      222 : 'THORN', 
      223 : 'szlig', 
      224 : 'agrave', 
      225 : 'aacute', 
      226 : 'acirc', 
      227 : 'atilde', 
      228 : 'auml', 
      229 : 'aring', 
      230 : 'aelig', 
      231 : 'ccedil', 
      232 : 'egrave', 
      233 : 'eacute', 
      234 : 'ecirc', 
      235 : 'euml', 
      236 : 'igrave', 
      237 : 'iacute', 
      238 : 'icirc', 
      239 : 'iuml', 
      240 : 'eth', 
      241 : 'ntilde', 
      242 : 'ograve', 
      243 : 'oacute', 
      244 : 'ocirc', 
      245 : 'otilde', 
      246 : 'ouml', 
      247 : 'divide', 
      248 : 'oslash', 
      249 : 'ugrave', 
      250 : 'uacute', 
      251 : 'ucirc', 
      252 : 'uuml', 
      253 : 'yacute', 
      254 : 'thorn', 
      255 : 'yuml', 
      402 : 'fnof', 
      913 : 'Alpha', 
      914 : 'Beta', 
      915 : 'Gamma', 
      916 : 'Delta', 
      917 : 'Epsilon', 
      918 : 'Zeta', 
      919 : 'Eta', 
      920 : 'Theta', 
      921 : 'Iota', 
      922 : 'Kappa', 
      923 : 'Lambda', 
      924 : 'Mu', 
      925 : 'Nu', 
      926 : 'Xi', 
      927 : 'Omicron', 
      928 : 'Pi', 
      929 : 'Rho', 
      931 : 'Sigma', 
      932 : 'Tau', 
      933 : 'Upsilon', 
      934 : 'Phi', 
      935 : 'Chi', 
      936 : 'Psi', 
      937 : 'Omega', 
      945 : 'alpha', 
      946 : 'beta', 
      947 : 'gamma', 
      948 : 'delta', 
      949 : 'epsilon', 
      950 : 'zeta', 
      951 : 'eta', 
      952 : 'theta', 
      953 : 'iota', 
      954 : 'kappa', 
      955 : 'lambda', 
      956 : 'mu', 
      957 : 'nu', 
      958 : 'xi', 
      959 : 'omicron', 
      960 : 'pi', 
      961 : 'rho', 
      962 : 'sigmaf', 
      963 : 'sigma', 
      964 : 'tau', 
      965 : 'upsilon', 
      966 : 'phi', 
      967 : 'chi', 
      968 : 'psi', 
      969 : 'omega', 
      977 : 'thetasym', 
      978 : 'upsih', 
      982 : 'piv', 
      8226 : 'bull', 
      8230 : 'hellip', 
      8242 : 'prime', 
      8243 : 'Prime', 
      8254 : 'oline', 
      8260 : 'frasl', 
      8472 : 'weierp', 
      8465 : 'image', 
      8476 : 'real', 
      8482 : 'trade', 
      8501 : 'alefsym', 
      8592 : 'larr', 
      8593 : 'uarr', 
      8594 : 'rarr', 
      8595 : 'darr', 
      8596 : 'harr', 
      8629 : 'crarr', 
      8656 : 'lArr', 
      8657 : 'uArr', 
      8658 : 'rArr', 
      8659 : 'dArr', 
      8660 : 'hArr', 
      8704 : 'forall', 
      8706 : 'part', 
      8707 : 'exist', 
      8709 : 'empty', 
      8711 : 'nabla', 
      8712 : 'isin', 
      8713 : 'notin', 
      8715 : 'ni', 
      8719 : 'prod', 
      8721 : 'sum', 
      8722 : 'minus', 
      8727 : 'lowast', 
      8730 : 'radic', 
      8733 : 'prop', 
      8734 : 'infin', 
      8736 : 'ang', 
      8743 : 'and', 
      8744 : 'or', 
      8745 : 'cap', 
      8746 : 'cup', 
      8747 : 'int', 
      8756 : 'there4', 
      8764 : 'sim', 
      8773 : 'cong', 
      8776 : 'asymp', 
      8800 : 'ne', 
      8801 : 'equiv', 
      8804 : 'le', 
      8805 : 'ge', 
      8834 : 'sub', 
      8835 : 'sup', 
      8836 : 'nsub', 
      8838 : 'sube', 
      8839 : 'supe', 
      8853 : 'oplus', 
      8855 : 'otimes', 
      8869 : 'perp', 
      8901 : 'sdot', 
      8968 : 'lceil', 
      8969 : 'rceil', 
      8970 : 'lfloor', 
      8971 : 'rfloor', 
      9001 : 'lang', 
      9002 : 'rang', 
      9674 : 'loz', 
      9824 : 'spades', 
      9827 : 'clubs', 
      9829 : 'hearts', 
      9830 : 'diams', 
      338 : 'OElig', 
      339 : 'oelig', 
      352 : 'Scaron', 
      353 : 'scaron', 
      376 : 'Yuml', 
      710 : 'circ', 
      732 : 'tilde', 
      8194 : 'ensp', 
      8195 : 'emsp', 
      8201 : 'thinsp', 
      8204 : 'zwnj', 
      8205 : 'zwj', 
      8206 : 'lrm', 
      8207 : 'rlm', 
      8211 : 'ndash', 
      8212 : 'mdash', 
      8216 : 'lsquo', 
      8217 : 'rsquo', 
      8218 : 'sbquo', 
      8220 : 'ldquo', 
      8221 : 'rdquo', 
      8222 : 'bdquo', 
      8224 : 'dagger', 
      8225 : 'Dagger', 
      8240 : 'permil', 
      8249 : 'lsaquo', 
      8250 : 'rsaquo', 
      8364 : 'euro'
  };

}