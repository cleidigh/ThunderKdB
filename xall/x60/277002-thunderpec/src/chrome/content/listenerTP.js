Components.utils.import("chrome://thunderpec/content/globalsTP.jsm");
Components.utils.import("chrome://thunderpec/content/xmlParserTP.jsm");
Components.utils.import("chrome://thunderpec/content/baltimoreTP.js");
var folderFlags = Components.interfaces.nsMsgFolderFlags;
//  [a-zA-Z0-9\_]*\_(RC|NS|MC|NE|MT|EC|SE|DT)\_[a-zA-Z0-9\_]{1,3}\.xml
//  [a-zA-Z0-9\_]*\_(AT)\_[a-zA-Z0-9\_]{1,3}\.zip

const PR_RDONLY      = 0x01;
const PR_WRONLY      = 0x02;
const PR_RDWR        = 0x04;
const PR_CREATE_FILE = 0x08;
const PR_APPEND      = 0x10;
const PR_TRUNCATE    = 0x20;
const PR_SYNC        = 0x40;
const PR_EXCL        = 0x80;

var tpecListener = {
  running: false,
  messages: [],
  errorcodes: ["5.1.1","5.2.1","5.2.2"],
  tout: 2000,
  version: "01",
  redraw: function(){
    var threadTree = document.getElementById("threadTree");
    if(threadTree){
      var peccolumn = threadTree.treeBoxObject.columns.getNamedColumn("pecColumn");
      threadTree.treeBoxObject.invalidateColumn(peccolumn);
    }
  },
  msgAdded: function(aMsg) {
    //this.running = (this.messages.length>0);
    tpecGlobals.jsdump("tpecListener: "+"msgAdded "+aMsg.mime2DecodedSubject+" running: "+this.running+" folder: "+(aMsg.folder.flags & folderFlags.Inbox));
    this.messages.push([aMsg,1]);
    if(!this.running){
      this.running = true;
      //this.msgAddedDo();
      setTimeout(tpecListener.msgAddedDo(),tpecListener.tout);
    }
  },
  msgRebuild: function() {
    var stmt = [];
    for(var i=0;i<this.messages.length;i++){
      var x = this.messages[i][0];
      tpecGlobals.jsdump("msgRebuild: "+x.messageId);
      var st = ThunderPecSql.dbConnection.createStatement("DELETE FROM pec WHERE msgId LIKE :mid;");
      st.params.mid = x.messageId; 
      stmt.push(st);
    }
    tpecGlobals.jsdump("msgRebuild: "+stmt.length);
    ThunderPecSql.dbConnection.executeAsync(stmt,stmt.length,{
      handleResult: function(aResultSet){},
      handleError: function(aError){},
      handleCompletion: function(aReason){
        tpecGlobals.jsdump("msgRebuild running: "+tpecListener.running);
        if(!tpecListener.running){
          tpecListener.running = true;
          tpecListener.msgAddedDo();
        }
      }
    });
  },
  msgAddedDo: function() {
    
    if(this.messages.length>0){
      var aRecord = this.messages.shift();
      var aMsg = aRecord[0];
      var aStore = aRecord[1];
      var isInbox = ((aMsg.folder.flags & folderFlags.Inbox)>0);
      tpecGlobals.jsdump("msgAddedDo: "+this.messages.length+" "+aMsg.mime2DecodedSubject+" "+aStore+" "+isInbox);
      var addresses = aMsg.ccList+","+aMsg.recipients;
      if(tpecGlobals.prefTP.check(aMsg.author)){
        tpecGlobals.jsdump("tpecListener: FROM "+aMsg.messageId);
        var p_email = tpecGlobals.hdrParser.extractHeaderAddressMailboxes(aMsg.author);;
        tpecGlobals.jsdump("tpecListener: SENDER "+p_email);
        var aDBConnection = ThunderPecSql.dbConnection;
        var query = "SELECT * FROM autoarch WHERE (msgId LIKE '' OR msgId LIKE :mid) AND sender LIKE :sender AND subject LIKE :subject;";
        tpecGlobals.jsdump("tpecListener: QUERY "+query);
        var stmt = ThunderPecSql.dbConnection.createStatement(query); 
        stmt.params.mid = aMsg.messageId;
        stmt.params.sender = p_email;
        stmt.params.subject = aMsg.mime2DecodedSubject;
        stmt.executeAsync({
          msgId:null,
          zip:null,
          rows:0,
          handleResult: function(aResultSet) {
            this.rows = 1;
            var row = aResultSet.getNextRow();
            this.msgId =  row.getResultByName("msgId");
            this.zip =  row.getResultByName("zip");
            tpecGlobals.jsdump("tpecListener: autoarch found record ("+this.msgId+")");
          },
          handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x01");},
          handleCompletion: function(aReason) {
            if(this.rows!=0){
              tpecGlobals.jsdump("tpecListener: autoarch found record ("+this.msgId+")");
              if(this.msgId==""){
                var suffix = aMsg.mime2DecodedSubject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                var zipname =  aMsg.dateInSeconds.toString(16)+tpecListener.version+"_"+suffix;
                if(zipname.length>175)zipname = zipname.substring(0, 175);
                zipname += ".zip";
                var query = "UPDATE autoarch SET msgId=:mid,zip=:zipname,cnt=0 WHERE msgId LIKE '' AND sender LIKE :sender AND subject LIKE :subject;"
                var ustmt = ThunderPecSql.dbConnection.createStatement(query); 
                ustmt.params.mid = aMsg.messageId;
                ustmt.params.zipname = zipname;
                ustmt.params.sender = p_email;
                ustmt.params.subject = aMsg.mime2DecodedSubject;
                ustmt.executeAsync(null);
                ustmt.finalize();
                var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                file.append(zipname);
                tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                
                var filename = suffix+"-000-messaggio.eml";
                
      
                try {
                  var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                  var zipW = new zipWriter();
                  zipW.open(file, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);
                  if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                    zipW.addEntryDirectory('script', Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, false);
                    tpecListener.saveToFile("baltimore.pem",TPECBaltimorePEM,tpecGlobals.tmpDir,zipW,'');
                  }
                  tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                } catch(e){
                  tpecGlobals.excdump("tpecListener: "+e);
                }
              } else {
                var suffix = aMsg.mime2DecodedSubject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                var zipname =  this.zip;
                var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                file.append(zipname);
                tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                
                var filename = suffix+"-000-messaggio.eml";
      
                try {
                  var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                  var zipW = new zipWriter();
                  zipW.open(file, PR_RDWR);
                  tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                } catch(e){
                  tpecGlobals.excdump("tpecListener: "+e);
                }
              }
              tpecListener.msgAddedDo();
            }
          }
        });
        stmt.finalize();
        /*
        if(stmt.executeStep()){
          tpecGlobals.jsdump("tpecListener: autoarch found record ("+stmt.row.msgId+")");
          if(stmt.row.msgId==""){
            var suffix = aMsg.mime2DecodedSubject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
            var zipname =  aMsg.dateInSeconds.toString(16)+this.version+"_"+suffix;
            if(zipname.length>175)zipname = zipname.substring(0, 175);
            zipname += ".zip";
            aDBConnection.executeSimpleSQL("UPDATE autoarch SET msgId='"+aMsg.messageId+"',zip='"+zipname+"',cnt=0 WHERE msgId LIKE '' AND sender LIKE '"+p_email+"' AND subject LIKE '"+aMsg.mime2DecodedSubject+"';");
            var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
            file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
            file.append(zipname);
            tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
            
            var filename = suffix+"-000-messaggio.eml";
            
  
            try {
              var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
              var zipW = new zipWriter();
              zipW.open(file, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);
              if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                zipW.addEntryDirectory('script', Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, false);
                tpecListener.saveToFile("baltimore.pem",TPECBaltimorePEM,tpecGlobals.tmpDir,zipW,'');
              }
              tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
            } catch(e){
              tpecGlobals.excdump("tpecListener: "+e);
            }
            
            stmt.finalize();
          } else {
            var suffix = aMsg.mime2DecodedSubject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
            var zipname =  stmt.row.zip;
            var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
            file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
            file.append(zipname);
            tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
            
            var filename = suffix+"-000-messaggio.eml";
            
  
            try {
              var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
              var zipW = new zipWriter();
              zipW.open(file, PR_RDWR);
              tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
            } catch(e){
              tpecGlobals.excdump("tpecListener: "+e);
            }
            stmt.finalize();
          }
          tpecListener.msgAddedDo();
        }
        */
      }  // end if(tpecGlobals.prefTP.check(aMsg.author))
      
      if(tpecGlobals.prefTP.check(addresses)){
        if(aMsg.mime2DecodedSubject.indexOf("POSTA CERTIFICATA")==0){
          try {
            MsgHdrToMimeMessage(aMsg, null, function(aMsgHdr, aMimeMsg) {
              if(aMimeMsg == null)return;
              var attachs = aMimeMsg.allAttachments;
              var esitoAttach = null;
              var fatturaAttach = null;
              var fatturaZip = null;
              var encAttach = null;
              var excAttach = null;
              for(var x in attachs){
                tpecGlobals.jsdump("tpecListener: ("+attachs[x].name.toLowerCase()+") ");
                if(attachs[x].name.toLowerCase()=="esitoatto.xml"){
                  esitoAttach = attachs[x];
                } else if(attachs[x].name.toLowerCase()=="eccezione.xml"){
                  excAttach = attachs[x];
                } else{
                  var fx = new RegExp("[a-zA-Z0-9\_]*\_(RC|NS|MC|NE|MT|EC|SE|DT)\_[a-zA-Z0-9]{1,3}\.xml","g");
                  var mx = fx.exec(attachs[x].name);
                  if(mx!=null){
                    tpecGlobals.jsdump("FATTURA REGEX : "+mx[1]);
                    fatturaAttach = attachs[x];
                  }
                  var zx = new RegExp("[a-zA-Z0-9\_]*\_(AT)\_[a-zA-Z0-9\_]{1,3}\.zip","g");
                  var nx = zx.exec(attachs[x].name);
                  if(nx!=null){
                    tpecGlobals.jsdump("FATTURA REGEX ZIP: "+nx[1]);
                    fatturaZip = attachs[x];
                  }
                  var ex = new RegExp("\.enc","g");
                  var ax = ex.exec(attachs[x].name);
                  if(ax!=null){
                    tpecGlobals.jsdump("DEPOSITO ENCP: "+ax[1]);
                    encAttach = attachs[x];
                  }
                }
              }
              
              if(esitoAttach!=null){
                tpecGlobals.attachContent(esitoAttach,aMsgHdr,function(xmldata){
                  var regex = new RegExp("\<CodiceEsito\>(.*)\<\/CodiceEsito\>","g");
                  var match = regex.exec(xmldata);
                  if(match!=null){
                    var esitoValue = match[1];
                    tpecGlobals.jsdump("ESITO : "+match[1]);
                    
                    regex = new RegExp("\<IdMsg\>(.*)\<\/IdMsg\>","g");
                    match = regex.exec(xmldata);
                    var pecReference =  match[1].replace(/\&lt;|\&gt;/g,"");
                    tpecGlobals.jsdump("ESITO : "+match[1].replace(/\&lt;|\&gt;/g,""));
                    tpecGlobals.jsdump("ESITO : "+aMsg.messageId+" "+aMsg.mime2DecodedSubject);
                    var aDBConnection = ThunderPecSql.dbConnection; 
                    var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
                    stmt.params.mid = aMsg.messageId;
                    stmt.executeAsync({
                      rows:0,
                      handleResult: function(aResultSet) {this.rows = 1;},
                      handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x02");},
                      handleCompletion: function(aReason) {
                        if(this.rows==0){
                          var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES(:mid,:ds,'',:reference,'',:esito,'');";
                          tpecGlobals.jsdump("ESITO : "+query);
                          var istmt = ThunderPecSql.dbConnection.createStatement(query);
                          istmt.params.mid = aMsg.messageId;
                          istmt.params.ds = aMsg.dateInSeconds;
                          istmt.params.reference = pecReference;
                          istmt.params.esito = esitoValue;
                          istmt.executeAsync({
                            handleResult: function(aResultSet) {},
                            handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x03");},
                            handleCompletion: function(aReason) {tpecListener.redraw();}
                          });
                          istmt.finalize();
                        } else {
                          aStore = 0;
                        } 
                        if(aStore==1 && isInbox){
                          var aDBConnection = ThunderPecSql.dbConnection;
                          var query = "SELECT * FROM autoarch WHERE pecMsgId LIKE :reference;";
                          var pstmt = ThunderPecSql.dbConnection.createStatement(query);
                          pstmt.params.reference = pecReference; 
                          pstmt.executeAsync({
                            msgId:null,
                            handleResult: function(aResultSet) {
                              var row = aResultSet.getNextRow();
                              this.msgId =  row.getResultByName("msgId");
                            },
                            handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x04");},
                            handleCompletion: function(aReason) {
                              if(this.msgId!=null){
                                pecReference = this.msgId;
                                tpecGlobals.jsdump("tpecListener: esito pecReference "+pecReference);
                              }
                              var query = "SELECT * FROM autoarch WHERE msgId LIKE :reference;";
                              tpecGlobals.jsdump("tpecListener: QUERY "+query);
                              var qstmt = ThunderPecSql.dbConnection.createStatement(query); 
                              qstmt.params.reference = pecReference;
                              qstmt.executeAsync({
                                subject:null,
                                zip:null,
                                cnt:0,
                                handleResult: function(aResultSet) {
                                  var row = aResultSet.getNextRow();
                                  this.subject =  row.getResultByName("subject");
                                  this.zip =  row.getResultByName("zip");
                                  this.cnt =  row.getResultByName("cnt");
                                },
                                handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x05");},
                                handleCompletion: function(aReason) {
                                  if(this.subject!=null){
                                    var suffix = this.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                                    var zipname = this.zip;
                                    var cnt = this.cnt+1;
                                    var countString = "000000000" + cnt;
                                    
                                    var query = "UPDATE autoarch SET cnt=:cnt WHERE msgId LIKE :reference;"
                                    var ustmt = ThunderPecSql.dbConnection.createStatement(query);
                                    ustmt.params.cnt = cnt;
                                    ustmt.params.reference = pecReference;
                                    ustmt.executeAsync(null);
                                    ustmt.finalize();
                                    
                                    
                                    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                                    file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                                    file.append(zipname);
                                    tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                                    
                                    var filename = suffix+"-"+countString.substr(countString.length-3);
                                    
                                    var pctsuffix = aMsg.mime2DecodedSubject.toLowerCase();
                                    pctsuffix = pctsuffix.substring("posta certificata:".length);
                                    pctsuffix = pctsuffix.substring(0,pctsuffix.length-this.subject.length);
                                    if(pctsuffix.indexOf("accettazione")>-1)pctsuffix = "accettazione deposito";
                                    pctsuffix =  pctsuffix.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                                    filename += "-"+pctsuffix+".eml";
                                    tpecGlobals.jsdump("tpecListener: autoarch esito "+filename);
                          
                                    try {
                                      var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                                      var zipW = new zipWriter();
                                      zipW.open(file, PR_RDWR );
                                      if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                                        //windows openssl
                                        var sslfile = "";
                                        var sslcmd = "";
                                        var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-"+pctsuffix;
                                        
                                        sslfile = sslfname+".bat";
                                        sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                        sslcmd += "pause\n";
                                        tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                        
                                        //*nix openssl
                                        sslfile = sslfname+".sh";
                                        sslcmd = "#!/bin/bash\n\n";
                                        sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                        sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                                        tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                      }
                                      tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                                    } catch(e){
                                      tpecGlobals.excdump("tpecListener: "+e);
                                    }
                        
                                  
                                  }
                                  tpecListener.msgAddedDo();
                                }
                              });
                              qstmt.finalize();
                            }
                          });
                          pstmt.finalize();
                        } else {
                          tpecListener.msgAddedDo();
                        }
                        
                      }
                     });
                     stmt.finalize();
                    
                    /*
                    if(!stmt.executeStep()){
                      var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES('"+aMsg.messageId+"',"+aMsg.dateInSeconds+",'','"+pecReference+"','',"+esitoValue+",'');";
                      tpecGlobals.jsdump("ESITO : "+query);
                      aDBConnection.executeSimpleSQL(query);
                      //ReloadMessage();
                      tpecListener.redraw();
                    } else {
                      aStore = 0;
                    }
                    stmt.finalize();
                    //autoarchive start
                    if(aStore==1 && isInbox){
                      var aDBConnection = ThunderPecSql.dbConnection;
                      //var query = "SELECT * FROM pec WHERE referenceId LIKE '"+pecReference+"';";
                      var query = "SELECT * FROM autoarch WHERE pecMsgId LIKE '"+pecReference+"';";
                      var stmt = aDBConnection.createStatement(query); 
                      if(stmt.executeStep()){
                        //pecReference = stmt.row.referencePecId;
                        pecReference = stmt.row.msgId;
                        tpecGlobals.jsdump("tpecListener: esito pecReference "+pecReference);
                      }
                      stmt.finalize();
                      
                      query = "SELECT * FROM autoarch WHERE msgId LIKE '"+pecReference+"';";
                      tpecGlobals.jsdump("tpecListener: QUERY "+query);
                      stmt = aDBConnection.createStatement(query); 
                      if(stmt.executeStep()){
                        var suffix = stmt.row.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                        var zipname = stmt.row.zip;
                        var cnt = stmt.row.cnt+1;
                        var countString = "000000000" + cnt;
                        
                        aDBConnection.executeSimpleSQL("UPDATE autoarch SET cnt="+cnt+" WHERE msgId LIKE '"+pecReference+"';");
                        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                        file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                        file.append(zipname);
                        tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                        
                        var filename = suffix+"-"+countString.substr(countString.length-3);
                        
                        var pctsuffix = aMsg.mime2DecodedSubject.toLowerCase();
                        pctsuffix = pctsuffix.substring("posta certificata:".length);
                        pctsuffix = pctsuffix.substring(0,pctsuffix.length-stmt.row.subject.length);
                        if(pctsuffix.indexOf("accettazione")>-1)pctsuffix = "accettazione deposito";
                        pctsuffix =  pctsuffix.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                        filename += "-"+pctsuffix+".eml";
                        tpecGlobals.jsdump("tpecListener: autoarch esito "+filename);
              
                        try {
                          var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                          var zipW = new zipWriter();
                          zipW.open(file, PR_RDWR );
                          if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                            //windows openssl
                            var sslfile = "";
                            var sslcmd = "";
                            var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-"+pctsuffix;
                            
                            sslfile = sslfname+".bat";
                            sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                            sslcmd += "pause\n";
                            tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                            
                            //*nix openssl
                            sslfile = sslfname+".sh";
                            sslcmd = "#!/bin/bash\n\n";
                            sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                            sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                            tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                          }
                          tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                        } catch(e){
                          tpecGlobals.excdump("tpecListener: "+e);
                        }
                        
                      }
                      stmt.finalize();
                    }
                    
                    //autoarchive stop
                  */
                  }
                  tpecListener.msgAddedDo();
                  });
                } else if(fatturaAttach!=null){            // end if(esitoAttach!=null)
                  tpecGlobals.attachContent(fatturaAttach,aMsgHdr,function(xmldata){
                    var rslcontent = tpecFatturaXML.parseFromString(xmldata);
                    if(tpecFatturaXML.tipo!=""){
                      var fattura = tpecFatturaXML.tipo;
                      if(fattura=="EC"){
                        fattura +=  tpecFatturaXML.esito;
                      }
                      if(fattura=="NE"){
                        fattura +=  tpecFatturaXML.esitocommittente.esito;
                      }
                      var aDBConnection = ThunderPecSql.dbConnection; 
                      var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
                      stmt.params.mid = aMsg.messageId;
                      stmt.executeAsync({
                        rows:0,
                        handleResult: function(aResultSet) {this.rows = 1;},
                        handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x06");},
                        handleCompletion: function(aReason) {
                          if(this.rows==0){
                            var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES(:mid,:ds,'',:reference,:iden,888,:fattura);";
                            tpecGlobals.jsdump("FATTURA : "+query);
                            var istmt = ThunderPecSql.dbConnection.createStatement(query);
                            istmt.params.mid = aMsg.messageId;
                            istmt.params.ds = aMsg.dateInSeconds;
                            istmt.params.reference = tpecFatturaXML.pecmessageid;
                            istmt.params.iden = tpecFatturaXML.identificativosdi;
                            istmt.params.fattura = fattura;
                            istmt.executeAsync({
                              handleResult: function(aResultSet) {},
                              handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x07");},
                              handleCompletion: function(aReason) {tpecListener.redraw();}
                            });
                            istmt.finalize();
                          } else {
                            aStore = 0;
                          } 
                          if(aStore==1 && isInbox){
                            var pecReference =  tpecFatturaXML.pecmessageid;
                            var aDBConnection = ThunderPecSql.dbConnection;
                            var query = "SELECT * FROM autoarch WHERE pecMsgId LIKE :reference;";
                            var pstmt = ThunderPecSql.dbConnection.createStatement(query);
                            pstmt.params.reference = pecReference; 
                            pstmt.executeAsync({
                              msgId:null,
                              handleResult: function(aResultSet) {
                                var row = aResultSet.getNextRow();
                                this.msgId =  row.getResultByName("msgId");
                              },
                              handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x08");},
                              handleCompletion: function(aReason) {
                                if(this.msgId!=null){
                                  pecReference = this.msgId;
                                  tpecGlobals.jsdump("tpecListener: esito pecReference "+pecReference);
                                }
                                var query = "SELECT * FROM autoarch WHERE msgId LIKE :reference;";
                                tpecGlobals.jsdump("tpecListener: QUERY "+query);
                                var qstmt = ThunderPecSql.dbConnection.createStatement(query); 
                                qstmt.params.reference = pecReference;
                                qstmt.executeAsync({
                                  subject:null,
                                  zip:null,
                                  cnt:0,
                                  handleResult: function(aResultSet) {
                                    var row = aResultSet.getNextRow();
                                    this.subject =  row.getResultByName("subject");
                                    this.zip =  row.getResultByName("zip");
                                    this.cnt =  row.getResultByName("cnt");
                                  },
                                  handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x09");},
                                  handleCompletion: function(aReason) {
                                    if(this.subject!=null){
                                      var suffix = this.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                                      var zipname = this.zip;
                                      var cnt = this.cnt+1;
                                      var countString = "000000000" + cnt;
                                      
                                      var query = "UPDATE autoarch SET cnt=:cnt WHERE msgId LIKE :reference;"
                                      var ustmt = ThunderPecSql.dbConnection.createStatement(query);
                                      ustmt.params.cnt = cnt;
                                      ustmt.params.reference = pecReference;
                                      ustmt.executeAsync(null);
                                      ustmt.finalize();
                                      
                                      
                                      var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                                      file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                                      file.append(zipname);
                                      tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                                      
                                      var filename = suffix+"-"+countString.substr(countString.length-3);
                                      filename += "-postacertificata-f"+fattura.toLowerCase()+".eml";
                                      tpecGlobals.jsdump("tpecListener: autoarch fattura "+filename);
                            
                                      try {
                                        var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                                        var zipW = new zipWriter();
                                        zipW.open(file, PR_RDWR );
                                        if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                                          //windows openssl
                                          var sslfile = "";
                                          var sslcmd = "";
                                          var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-postacertificata-f"+fattura.toLowerCase();
                                          
                                          sslfile = sslfname+".bat";
                                          sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                          sslcmd += "pause\n";
                                          tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                          
                                          //*nix openssl
                                          sslfile = sslfname+".sh";
                                          sslcmd = "#!/bin/bash\n\n";
                                          sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                          sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                                          tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                        }
                                        tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                                      } catch(e){
                                        tpecGlobals.excdump("tpecListener: "+e);
                                      }
                          
                                    
                                    }
                                    tpecListener.msgAddedDo();
                                  }
                                });
                                qstmt.finalize();
                              }
                            });
                            pstmt.finalize();
                          } else {
                            tpecListener.msgAddedDo();
                          }
                          
                        }
                       });
                       stmt.finalize();

                      
                      
                      
                      /*
                      var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE '"+aMsg.messageId+"';");
                      if(!stmt.executeStep()){
                        var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES('"+aMsg.messageId+"',"+aMsg.dateInSeconds+",'','"+tpecFatturaXML.pecmessageid+"','"+tpecFatturaXML.identificativosdi+"',888,'"+fattura+"');";
                        tpecGlobals.jsdump("FATTURA : "+query);
                        aDBConnection.executeSimpleSQL(query);
                        //ReloadMessage();
                        tpecListener.redraw();
                      } else {
                        aStore = 0;
                      }

                      stmt.finalize();
                      //autoarchive start
                      if(aStore==1 && isInbox){
                        var pecReference =  tpecFatturaXML.pecmessageid;
                        var aDBConnection = ThunderPecSql.dbConnection;
                        //var query = "SELECT * FROM pec WHERE referenceId LIKE '"+pecReference+"';";
                        var query = "SELECT * FROM autoarch WHERE pecMsgId LIKE '"+pecReference+"';";
                        var stmt = aDBConnection.createStatement(query); 
                        if(stmt.executeStep()){
                          //pecReference = stmt.row.referencePecId;
                          pecReference = stmt.row.msgId;
                          tpecGlobals.jsdump("tpecListener: esito pecReference "+pecReference);
                        }
                        stmt.finalize();
                        
                        query = "SELECT * FROM autoarch WHERE msgId LIKE '"+pecReference+"';";
                        tpecGlobals.jsdump("tpecListener: QUERY "+query);
                        stmt = aDBConnection.createStatement(query); 
                        if(stmt.executeStep()){
                          var suffix = stmt.row.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                          var zipname = stmt.row.zip;
                          var cnt = stmt.row.cnt+1;
                          var countString = "000000000" + cnt;
                          
                          aDBConnection.executeSimpleSQL("UPDATE autoarch SET cnt="+cnt+" WHERE msgId LIKE '"+pecReference+"';");
                          var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                          file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                          file.append(zipname);
                          tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                          
                          var filename = suffix+"-"+countString.substr(countString.length-3);
                          filename += "-postacertificata-f"+fattura.toLowerCase()+".eml";
                          tpecGlobals.jsdump("tpecListener: autoarch fattura "+filename);
                
                          try {
                            var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                            var zipW = new zipWriter();
                            zipW.open(file, PR_RDWR );
                            if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                              //windows openssl
                              var sslfile = "";
                              var sslcmd = "";
                              var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-postacertificata-f"+fattura.toLowerCase();
                              
                              sslfile = sslfname+".bat";
                              sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                              sslcmd += "pause\n";
                              tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                              
                              //*nix openssl
                              sslfile = sslfname+".sh";
                              sslcmd = "#!/bin/bash\n\n";
                              sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                              sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                              tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                            }
                            tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                          } catch(e){
                            tpecGlobals.excdump("tpecListener: "+e);
                          }
                          
                        }
                        stmt.finalize();
                      }
                      
                      //autoarchive stop
                      */
                    }    // end  if(tpecFatturaXML.tipo!="")
                    tpecListener.msgAddedDo();
                    });
                } else if(fatturaZip!=null){    //end if(fatturaAttach!=null)
                  tpecGlobals.zipContent(fatturaZip,aMsgHdr,function(zipfile){
                    var zr = Components.classes["@mozilla.org/libjar/zip-reader;1"].createInstance(Components.interfaces.nsIZipReader);
                    try {
                      zr.open(zipfile);
                      var zx = new RegExp("[a-zA-Z0-9\_]*\_(AT)\_[a-zA-Z0-9\_]{1,3}\.xml","g");
                      var nx = null;
                      var entries = zr.findEntries('*'); 
                      while (entries.hasMore()) {
                        var entryPointer = entries.getNext(); 
                        var entry = zr.getEntry(entryPointer);
                        tpecGlobals.jsdump("FATTURA ZIP: "+entryPointer);
                        nx = zx.exec(entryPointer);
                        if(nx!=null){
                            var inputStream = zr.getInputStream(entryPointer);
                            var reusableStreamInstance = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);                            
                            reusableStreamInstance.init(inputStream);
                            var fileContents = reusableStreamInstance.read(entry.realSize);
                            tpecGlobals.jsdump("FATTURA ZIP: "+fileContents);
                            var rslcontent = tpecFatturaXML.parseFromString(fileContents);
                        }
                      }
                    } catch (ex) {
                    } finally {
                      zr.close();
                    }                    


                    if(tpecFatturaXML.tipo!=""){

                      var aDBConnection = ThunderPecSql.dbConnection; 
                      var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
                      stmt.params.mid = aMsg.messageId;
                      stmt.executeAsync({
                        rows:0,
                        handleResult: function(aResultSet) {this.rows = 1;},
                        handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x0A");},
                        handleCompletion: function(aReason) {
                          if(this.rows==0){
                            var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES(:mid,:ds,'',:reference,:iden,888,:fattura);";
                            tpecGlobals.jsdump("FATTURA : "+query);
                            var istmt = ThunderPecSql.dbConnection.createStatement(query);
                            istmt.params.mid = aMsg.messageId;
                            istmt.params.ds = aMsg.dateInSeconds;
                            istmt.params.reference = tpecFatturaXML.pecmessageid;
                            istmt.params.iden = tpecFatturaXML.identificativosdi;
                            istmt.params.fattura = fattura;
                            istmt.executeAsync({
                              handleResult: function(aResultSet) {},
                              handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x0B");},
                              handleCompletion: function(aReason) {tpecListener.redraw();}
                            });
                            istmt.finalize();
                          } else {
                            aStore = 0;
                          } 
                          if(aStore==1 && isInbox){
                            var pecReference =  tpecFatturaXML.pecmessageid;
                            var aDBConnection = ThunderPecSql.dbConnection;
                            var query = "SELECT * FROM autoarch WHERE pecMsgId LIKE :reference;";
                            var pstmt = ThunderPecSql.dbConnection.createStatement(query);
                            pstmt.params.reference = pecReference; 
                            pstmt.executeAsync({
                              msgId:null,
                              handleResult: function(aResultSet) {
                                var row = aResultSet.getNextRow();
                                this.msgId =  row.getResultByName("msgId");
                              },
                              handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x0C");},
                              handleCompletion: function(aReason) {
                                if(this.msgId!=null){
                                  pecReference = this.msgId;
                                  tpecGlobals.jsdump("tpecListener: esito pecReference "+pecReference);
                                }
                                var query = "SELECT * FROM autoarch WHERE msgId LIKE :reference;";
                                tpecGlobals.jsdump("tpecListener: QUERY "+query);
                                var qstmt = ThunderPecSql.dbConnection.createStatement(query); 
                                qstmt.params.reference = pecReference;
                                qstmt.executeAsync({
                                  subject:null,
                                  zip:null,
                                  cnt:0,
                                  handleResult: function(aResultSet) {
                                    var row = aResultSet.getNextRow();
                                    this.subject =  row.getResultByName("subject");
                                    this.zip =  row.getResultByName("zip");
                                    this.cnt =  row.getResultByName("cnt");
                                  },
                                  handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x0D");},
                                  handleCompletion: function(aReason) {
                                    if(this.subject!=null){
                                      var suffix = this.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                                      var zipname = this.zip;
                                      var cnt = this.cnt+1;
                                      var countString = "000000000" + cnt;
                                      
                                      var query = "UPDATE autoarch SET cnt=:cnt WHERE msgId LIKE :reference;"
                                      var ustmt = ThunderPecSql.dbConnection.createStatement(query);
                                      ustmt.params.cnt = cnt;
                                      ustmt.params.reference = pecReference;
                                      ustmt.executeAsync(null);
                                      ustmt.finalize();
                                      
                                      
                                      var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                                      file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                                      file.append(zipname);
                                      tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                                      
                                      var filename = suffix+"-"+countString.substr(countString.length-3);
                                      filename += "-postacertificata-f"+fattura.toLowerCase()+".eml";
                                      tpecGlobals.jsdump("tpecListener: autoarch fattura "+filename);
                            
                                      try {
                                        var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                                        var zipW = new zipWriter();
                                        zipW.open(file, PR_RDWR );
                                        if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                                          //windows openssl
                                          var sslfile = "";
                                          var sslcmd = "";
                                          var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-postacertificata-f"+tpecFatturaXML.tipo.toLowerCase();
                                          
                                          sslfile = sslfname+".bat";
                                          sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                          sslcmd += "pause\n";
                                          tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                          
                                          //*nix openssl
                                          sslfile = sslfname+".sh";
                                          sslcmd = "#!/bin/bash\n\n";
                                          sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                          sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                                          tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                        }
                                        tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                                      } catch(e){
                                        tpecGlobals.excdump("tpecListener: "+e);
                                      }
                          
                                    
                                    }
                                    tpecListener.msgAddedDo();
                                  }
                                });
                                qstmt.finalize();
                              }
                            });
                            pstmt.finalize();
                          } else {
                            tpecListener.msgAddedDo();
                          }
                          
                        }
                       });
                       stmt.finalize();
                      
                      
                      
                      /*
                      var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE '"+aMsg.messageId+"';");
                      if(!stmt.executeStep()){
                        var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES('"+aMsg.messageId+"',"+aMsg.dateInSeconds+",'','"+tpecFatturaXML.pecmessageid+"','',888,'"+tpecFatturaXML.tipo+"');";
                        tpecGlobals.jsdump("FATTURA : "+query);
                        aDBConnection.executeSimpleSQL(query);
                        //ReloadMessage();
                        tpecListener.redraw();
                      } else {
                        aStore = 0;
                      }

                      stmt.finalize();
                      //autoarchive start
                      if(aStore==1 && isInbox){
                        var pecReference =  tpecFatturaXML.pecmessageid;
                        var aDBConnection = ThunderPecSql.dbConnection;
                        //var query = "SELECT * FROM pec WHERE referenceId LIKE '"+pecReference+"';";
                        var query = "SELECT * FROM autoarch WHERE pecMsgId LIKE '"+pecReference+"';";
                        var stmt = aDBConnection.createStatement(query); 
                        if(stmt.executeStep()){
                          //pecReference = stmt.row.referencePecId;
                          pecReference = stmt.row.msgId;
                          tpecGlobals.jsdump("tpecListener: esito pecReference "+pecReference);
                        }
                        stmt.finalize();
                        
                        query = "SELECT * FROM autoarch WHERE msgId LIKE '"+pecReference+"';";
                        tpecGlobals.jsdump("tpecListener: QUERY "+query);
                        stmt = aDBConnection.createStatement(query); 
                        if(stmt.executeStep()){
                          var suffix = stmt.row.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                          var zipname = stmt.row.zip;
                          var cnt = stmt.row.cnt+1;
                          var countString = "000000000" + cnt;
                          
                          aDBConnection.executeSimpleSQL("UPDATE autoarch SET cnt="+cnt+" WHERE msgId LIKE '"+pecReference+"';");
                          var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                          file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                          file.append(zipname);
                          tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                          
                          var filename = suffix+"-"+countString.substr(countString.length-3);
                          filename += "-postacertificata-f"+tpecFatturaXML.tipo.toLowerCase()+".eml";
                          tpecGlobals.jsdump("tpecListener: autoarch fattura "+filename);
                
                          try {
                            var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                            var zipW = new zipWriter();
                            zipW.open(file, PR_RDWR );
                            if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                              //windows openssl
                              var sslfile = "";
                              var sslcmd = "";
                              var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-postacertificata-f"+tpecFatturaXML.tipo.toLowerCase();
                              
                              sslfile = sslfname+".bat";
                              sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                              sslcmd += "pause\n";
                              tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                              
                              //*nix openssl
                              sslfile = sslfname+".sh";
                              sslcmd = "#!/bin/bash\n\n";
                              sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                              sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                              tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                            }
                            tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                          } catch(e){
                            tpecGlobals.excdump("tpecListener: "+e);
                          }
                          
                        }
                        stmt.finalize();
                      }
                      
                      //autoarchive stop
                      */
                    } //end if(tpecFatturaXML.tipo!="")
                    tpecListener.msgAddedDo();
                    });
                } else if(encAttach!=null && aMsg.mime2DecodedSubject.indexOf("POSTA CERTIFICATA: DEPOSITO")==0){      //end if(fatturaZip!=null)
                  var aDBConnection = ThunderPecSql.dbConnection; 
                  var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
                  stmt.params.mid = aMsg.messageId;
                  stmt.executeAsync({
                    rows:0,
                    handleResult: function(aResultSet) {this.rows = 1;},
                    handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x0E");},
                    handleCompletion: function(aReason) {
                      if(this.rows==0){
                        var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES(:mid,:ds,'',:mid,'',10,'');";
                        tpecGlobals.jsdump("DEPOSITO : "+query);
                        var istmt = ThunderPecSql.dbConnection.createStatement(query);
                        istmt.params.mid = aMsg.messageId;
                        istmt.params.ds = aMsg.dateInSeconds;
                        istmt.executeAsync({
                          handleResult: function(aResultSet) {},
                          handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x0F");},
                          handleCompletion: function(aReason) {tpecListener.redraw();}
                        });
                        istmt.finalize();
                      }
                      tpecListener.msgAddedDo();
                    }
                   });
                   stmt.finalize();  
                  
                  /*
                  var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE '"+aMsg.messageId+"';");
                  if(!stmt.executeStep()){
                    var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES('"+aMsg.messageId+"',"+aMsg.dateInSeconds+",'','"+aMsg.messageId+"','',10,'');";
                    tpecGlobals.jsdump("DEPOSITO : "+query);
                    aDBConnection.executeSimpleSQL(query);
                    //ReloadMessage();
                    tpecListener.redraw();
                  }
                  stmt.finalize();
                  tpecListener.msgAddedDo();
                  */
                } else if(excAttach!=null){       // end if(encAttach!=null && aMsg.mime2DecodedSubject.indexOf("POSTA CERTIFICATA: DEPOSITO")==0)
                  tpecGlobals.attachContent(excAttach,aMsgHdr,function(xmldata){
                    EccezioneXML.parse(xmldata);
                    if(EccezioneXML.keyword["idmsgsmtp"].value!=null){
                      var esitoValue = -3;
                      tpecGlobals.jsdump("ECCEZIONE : "+esitoValue);
                      var pecReference = EccezioneXML.keyword["idmsgsmtp"].value.replace(/\&lt;|\&gt;/g,"");
                      
                      var aDBConnection = ThunderPecSql.dbConnection; 
                      var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
                      stmt.params.mid = aMsg.messageId;
                      stmt.executeAsync({
                        rows:0,
                        handleResult: function(aResultSet) {this.rows = 1;},
                        handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x10");},
                        handleCompletion: function(aReason) {
                          if(this.rows==0){
                            var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES(:mid,:ds,'',:reference,'',:esito,'');";
                            tpecGlobals.jsdump("ECCEZIONE : "+query);
                            var istmt = ThunderPecSql.dbConnection.createStatement(query);
                            istmt.params.mid = aMsg.messageId;
                            istmt.params.ds = aMsg.dateInSeconds;
                            istmt.params.reference = pecReference;
                            istmt.params.esito = esitoValue;
                            istmt.executeAsync({
                              handleResult: function(aResultSet) {},
                              handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x11");},
                              handleCompletion: function(aReason) {tpecListener.redraw();}
                            });
                            istmt.finalize();
                          } else {
                            aStore = 0;
                          } 
                          if(aStore==1 && isInbox){
                            var aDBConnection = ThunderPecSql.dbConnection;
                            var query = "SELECT * FROM autoarch WHERE pecMsgId LIKE :reference;";
                            var pstmt = ThunderPecSql.dbConnection.createStatement(query);
                            pstmt.params.reference = pecReference; 
                            pstmt.executeAsync({
                              msgId:null,
                              handleResult: function(aResultSet) {
                                var row = aResultSet.getNextRow();
                                this.msgId =  row.getResultByName("msgId");
                              },
                              handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x12");},
                              handleCompletion: function(aReason) {
                                if(this.msgId!=null){
                                  pecReference = this.msgId;
                                  tpecGlobals.jsdump("tpecListener: esito pecReference "+pecReference);
                                }
                                var query = "SELECT * FROM autoarch WHERE msgId LIKE :reference;";
                                tpecGlobals.jsdump("tpecListener: QUERY "+query);
                                var qstmt = ThunderPecSql.dbConnection.createStatement(query); 
                                qstmt.params.reference = pecReference;
                                qstmt.executeAsync({
                                  subject:null,
                                  zip:null,
                                  cnt:0,
                                  handleResult: function(aResultSet) {
                                    var row = aResultSet.getNextRow();
                                    this.subject =  row.getResultByName("subject");
                                    this.zip =  row.getResultByName("zip");
                                    this.cnt =  row.getResultByName("cnt");
                                  },
                                  handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x14");},
                                  handleCompletion: function(aReason) {
                                    if(this.subject!=null){
                                      var suffix = this.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                                      var zipname = this.zip;
                                      var cnt = this.cnt+1;
                                      var countString = "000000000" + cnt;
                                      
                                      var query = "UPDATE autoarch SET cnt=:cnt WHERE msgId LIKE :reference;"
                                      var ustmt = ThunderPecSql.dbConnection.createStatement(query);
                                      ustmt.params.cnt = cnt;
                                      ustmt.params.reference = pecReference;
                                      ustmt.executeAsync(null);
                                      ustmt.finalize();
                                      
                                      
                                      var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                                      file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                                      file.append(zipname);
                                      tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                                      
                                      var filename = suffix+"-"+countString.substr(countString.length-3);
                                      
                                      var pctsuffix = aMsg.mime2DecodedSubject.toLowerCase();
                                      pctsuffix = pctsuffix.substring("posta certificata:".length);
                                      //pctsuffix = pctsuffix.substring(0,pctsuffix.length-stmt.row.subject.length);
                                      //if(pctsuffix.indexOf("accettazione")>-1)pctsuffix = "accettazione deposito";
                                      pctsuffix =  pctsuffix.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                                      filename += "-"+pctsuffix+".eml";
                                      tpecGlobals.jsdump("tpecListener: autoarch esito "+filename);
                             
                                      try {
                                        var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                                        var zipW = new zipWriter();
                                        zipW.open(file, PR_RDWR );
                                        if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                                          //windows openssl
                                          var sslfile = "";
                                          var sslcmd = "";
                                          var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-"+pctsuffix;
                                          
                                          sslfile = sslfname+".bat";
                                          sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                          sslcmd += "pause\n";
                                          tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                          
                                          //*nix openssl
                                          sslfile = sslfname+".sh";
                                          sslcmd = "#!/bin/bash\n\n";
                                          sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                          sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                                          tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                        }
                                        tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                                      } catch(e){
                                        tpecGlobals.excdump("tpecListener: "+e);
                                      }
                          
                                    
                                    }
                                    tpecListener.msgAddedDo();
                                  }
                                });
                                qstmt.finalize();
                              }
                            });
                            pstmt.finalize();
                          } else {
                            tpecListener.msgAddedDo();
                          }
                          
                        }
                       });
                       stmt.finalize();





                      /*
                      var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE '"+aMsg.messageId+"';");
                      if(!stmt.executeStep()){
                        var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES('"+aMsg.messageId+"',"+aMsg.dateInSeconds+",'','"+pecReference+"','',"+esitoValue+",'');";
                        tpecGlobals.jsdump("ECCEZIONE : "+query);
                        aDBConnection.executeSimpleSQL(query);
                        //ReloadMessage();
                        tpecListener.redraw();
                      } else {
                        aStore = 0;
                      }

                      stmt.finalize();
                      //autoarchive start
                      if(aStore==1 && isInbox){
                        var aDBConnection = ThunderPecSql.dbConnection;
                        //var query = "SELECT * FROM pec WHERE referenceId LIKE '"+pecReference+"';";
                        var query = "SELECT * FROM autoarch WHERE pecMsgId LIKE '"+pecReference+"';";
                        var stmt = aDBConnection.createStatement(query); 
                        if(stmt.executeStep()){
                          //pecReference = stmt.row.referencePecId;
                          pecReference = stmt.row.msgId;
                          tpecGlobals.jsdump("tpecListener: esito pecReference "+pecReference);
                        }
                        stmt.finalize();
                        
                        query = "SELECT * FROM autoarch WHERE msgId LIKE '"+pecReference+"';";
                        tpecGlobals.jsdump("tpecListener: QUERY "+query);
                        stmt = aDBConnection.createStatement(query); 
                        if(stmt.executeStep()){
                          var suffix = stmt.row.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                          var zipname = stmt.row.zip;
                          var cnt = stmt.row.cnt+1;
                          var countString = "000000000" + cnt;
                          
                          aDBConnection.executeSimpleSQL("UPDATE autoarch SET cnt="+cnt+" WHERE msgId LIKE '"+pecReference+"';");
                          var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                          file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                          file.append(zipname);
                          tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                          
                          var filename = suffix+"-"+countString.substr(countString.length-3);
                          
                          var pctsuffix = aMsg.mime2DecodedSubject.toLowerCase();
                          pctsuffix = pctsuffix.substring("posta certificata:".length);
                          //pctsuffix = pctsuffix.substring(0,pctsuffix.length-stmt.row.subject.length);
                          //if(pctsuffix.indexOf("accettazione")>-1)pctsuffix = "accettazione deposito";
                          pctsuffix =  pctsuffix.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                          filename += "-"+pctsuffix+".eml";
                          tpecGlobals.jsdump("tpecListener: autoarch esito "+filename);
                
                          try {
                            var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                            var zipW = new zipWriter();
                            zipW.open(file, PR_RDWR );
                            if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                              //windows openssl
                              var sslfile = "";
                              var sslcmd = "";
                              var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-"+pctsuffix;
                              
                              sslfile = sslfname+".bat";
                              sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                              sslcmd += "pause\n";
                              tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                              
                              //*nix openssl
                              sslfile = sslfname+".sh";
                              sslcmd = "#!/bin/bash\n\n";
                              sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                              sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                              tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                            }
                            tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                          } catch(e){
                            tpecGlobals.excdump("tpecListener: "+e);
                          }
                          
                        }
                        stmt.finalize();
                      }
                      
                      //autoarchive stop
                      */
                    } //end if(EccezioneXML.keyword["idmsgsmtp"].value!=null)
                    tpecListener.msgAddedDo();
                    });
                  } else {        //end if(excAttach!=null)
                  tpecListener.msgAddedDo();
                }
            },true);
          } catch (e) {
            tpecGlobals.excdump("tpecListener: "+e);
            tpecListener.msgAddedDo();
          }
        } else if(aMsg.mime2DecodedSubject.indexOf("POSTA CERTIFICATA")!=0 && aMsg.mime2DecodedSubject.indexOf("ANOMALIA MESSAGGIO")!=0){
          try {
            MsgHdrToMimeMessage(aMsg, null, function(aMsgHdr, aMimeMsg) {
              if(aMimeMsg == null)return;
              var attachs = aMimeMsg.allAttachments;
              var daticert = null;
              for(var x in attachs){
                tpecGlobals.jsdump("tpecListener: ("+attachs[x].name.toLowerCase()+") ");
                if(attachs[x].name.toLowerCase()=="daticert.xml"){
                  daticert = attachs[x];
                }
              }
              
              if(daticert!=null){
                tpecGlobals.attachContent(daticert,aMsgHdr,function(xmldata){
                  var regex = new RegExp("\<msgid\>(.*)\<\/msgid\>","g");
                  var match = regex.exec(xmldata);
                  if(match!=null){
                    var pecReference = match[1].replace(/\&lt;|\&gt;/g,"");;
                    tpecGlobals.jsdump("DATICERT : "+pecReference);
                    tpecGlobals.jsdump("DATICERT : "+aMsg.messageId+" "+aMsg.mime2DecodedSubject);
                    
                    var regey =  new RegExp("\<identificativo\>(.*)\<\/identificativo\>","g");
                    var matchy = regey.exec(xmldata);
                    var identificativo =  matchy[1].replace(/\&lt;|\&gt;/g,"");;

                    var regec =  new RegExp("\<consegna\>(.*)\<\/consegna\>","g");
                    var matchc = regec.exec(xmldata);
                    var consegna =  "";
                    if(matchc!=null){
                      consegna = matchc[1].replace(/\&lt;|\&gt;/g,"");;
                      tpecGlobals.jsdump("DATICERT CONSEGNA: "+consegna);
                    }
                    
                    regec = new RegExp("\<oggetto\>(.*)\<\/oggetto\>","g");
                    matchc = regec.exec(xmldata);
                    var oggetto =  "";
                    if(matchc!=null){
                      oggetto = matchc[1].replace(/\&lt;|\&gt;/g,"");;
                      tpecGlobals.jsdump("DATICERT OGGETTO: "+oggetto);
                    }

                    regec = new RegExp("\<mittente\>(.*)\<\/mittente\>","g");
                    matchc = regec.exec(xmldata);
                    var mittente =  "";
                    if(matchc!=null){
                      mittente = matchc[1].replace(/\&lt;|\&gt;/g,"");;
                      tpecGlobals.jsdump("DATICERT MITTENTE: "+mittente);
                    }

                    regec = new RegExp("\<errore-esteso\>(.*)\<\/errore-esteso\>","g");
                    matchc = regec.exec(xmldata);
                    var errore_esteso =  "";
                    if(matchc!=null){
                      errore_esteso = matchc[1].replace(/\&lt;|\&gt;/g,"");
                      var fcode = false;
                      for(var i=0;(i<tpecListener.errorcodes.length && !fcode);i++){
                        if(errore_esteso.indexOf(tpecListener.errorcodes[i])!=-1)fcode=true;
                      }
                      if(!fcode)errore_esteso="";
                    } else {
                      errore_esteso = "no.error";
                    }
                    tpecGlobals.jsdump("DATICERT ERRORE ESTESO: "+errore_esteso);
                    
                    regec = new RegExp("\<giorno\>(.*)\<\/giorno\>","g");
                    matchc = regec.exec(xmldata);
                    var giorno =  "";
                    if(matchc!=null){
                      giorno = matchc[1].replace(/\&lt;|\&gt;/g,"");
                      giorno = giorno.substring(6,10)+"-"+giorno.substring(3,5)+"-"+giorno.substring(0,2);
                      tpecGlobals.jsdump("DATICERT GIORNO: "+giorno);
                    }

                    regec = new RegExp("\<ora\>(.*)\<\/ora\>","g");
                    matchc = regec.exec(xmldata);
                    var ora =  "";
                    if(matchc!=null){
                      ora = matchc[1].replace(/\&lt;|\&gt;/g,"");
                      tpecGlobals.jsdump("DATICERT ORA: "+ora);
                    }

                    regec = new RegExp("\<data zona\=\"(.*)\"\>","g");
                    matchc = regec.exec(xmldata);
                    var zona =  "";
                    if(matchc!=null){
                      zona = matchc[1].replace(/\&lt;|\&gt;/g,"");
                      tpecGlobals.jsdump("DATICERT ZONA: "+zona);
                    }
                    
                    var consegna_ts = Date.parse(giorno+"T"+ora+zona);
                    tpecGlobals.jsdump("DATICERT DATE: "+Date.parse(giorno+"T"+ora+zona));
                    
                    if(errore_esteso!="" && consegna!=""){
                      var aDBConnection = ThunderPecSql.dbConnection; 
                      var eestmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pecdata WHERE pec LIKE :pec;");
                      eestmt.params.pec = consegna;
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
                          if(this.rows==0 && errore_esteso!="no.error"){
                            var query =  "INSERT INTO pecdata(pec,status,created,modified,sync) VALUES(:pec,:status,:created,:modified,0);";
                            tpecGlobals.jsdump("DATICERT STATUS: "+query);
                            var eistmt = ThunderPecSql.dbConnection.createStatement(query);
                            eistmt.params.pec = consegna;
                            eistmt.params.status = errore_esteso;
                            eistmt.params.created = consegna_ts;
                            eistmt.params.modified = consegna_ts;
                            eistmt.executeAsync({
                              handleResult: function(aResultSet) {},
                              handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x16");},
                              handleCompletion: function(aReason) {}
                            });
                            eistmt.finalize();
                          } else {
                            if(consegna_ts>this.modified){
                                var query = "UPDATE pecdata SET status=:status,modified=:modified,sync=0 WHERE pec LIKE :pec;";
                                var eustmt = ThunderPecSql.dbConnection.createStatement(query);
                                eustmt.params.status = errore_esteso;
                                eustmt.params.modified = consegna_ts;
                                eustmt.params.pec = consegna;
                                eustmt.executeAsync(null);
                                eustmt.finalize();
                            }
                          }
                        }
                       });
                       eestmt.finalize();
                    }
                    
                    var aDBConnection = ThunderPecSql.dbConnection; 
                    var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
                    stmt.params.mid = aMsg.messageId;
                    stmt.executeAsync({
                      rows:0,
                      handleResult: function(aResultSet) {
                        this.rows = 1;
                        },
                      handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x15");},
                      handleCompletion: function(aReason) {
                        if(this.rows==0){
                          var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES(:mid,:ds,'',:reference,:identificativo,999,:consegna);";
                          tpecGlobals.jsdump("DATICERT : "+query);
                          var istmt = ThunderPecSql.dbConnection.createStatement(query);
                          istmt.params.mid = aMsg.messageId;
                          istmt.params.ds = aMsg.dateInSeconds;
                          istmt.params.reference = pecReference;
                          istmt.params.identificativo = identificativo;
                          istmt.params.consegna = consegna;
                          istmt.executeAsync({
                            handleResult: function(aResultSet) {},
                            handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x16");},
                            handleCompletion: function(aReason) {}
                          });
                          istmt.finalize();
                        } else {
                          aStore = 0;
                        } 
                        tpecGlobals.jsdump("DATICERT ASTORE: "+aStore+" ISINBOX: "+isInbox);
                        if(aStore==1 && isInbox){
                          var aDBConnection = ThunderPecSql.dbConnection;
                          var query = "SELECT * FROM autoarch WHERE msgId LIKE '' AND sender LIKE :mittente AND subject LIKE :oggetto;";
                          var qstmt = ThunderPecSql.dbConnection.createStatement(query);
                          qstmt.params.mittente = mittente; 
                          qstmt.params.oggetto = oggetto;                           
                          qstmt.executeAsync({
                            subject:null,
                            zip:null,
                            cnt:0,
                            handleResult: function(aResultSet) {
                              var row = aResultSet.getNextRow();
                              this.subject =  row.getResultByName("subject");
                              this.zip =  row.getResultByName("zip");
                              this.cnt =  row.getResultByName("cnt");
                            },
                            handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x17");},
                            handleCompletion: function(aReason) {
                              if(this.subject!=null){
                                tpecGlobals.jsdump("tpecListener: autoarch found record with notification receipt");
                                var suffix = this.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                                var zipname =  aMsg.dateInSeconds.toString(16)+tpecListener.version+"_"+suffix;
                                if(zipname.length>175)zipname = zipname.substring(0, 175);
                                zipname += ".zip";
                                
                                var query = "UPDATE autoarch SET msgId=:reference,zip=:zipname,cnt=0 WHERE msgId LIKE '' AND sender LIKE :mittente AND subject LIKE :oggetto;";
                                var ustmt = ThunderPecSql.dbConnection.createStatement(query);
                                ustmt.params.reference = pecReference;
                                ustmt.params.zipname = zipname;
                                ustmt.params.mittente = mittente;
                                ustmt.params.oggetto = oggetto;
                                ustmt.executeAsync(null);
                                ustmt.finalize();
                                
                                
                                var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                                file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                                file.append(zipname);
                                tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                                
                                var filename = suffix+"-000-messaggio.eml";
                       
                                try {
                                  var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                                  var zipW = new zipWriter();
                                  zipW.open(file, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);
                                  if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                                    zipW.addEntryDirectory('script', Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, false);
                                    tpecListener.saveToFile("baltimore.pem",TPECBaltimorePEM,tpecGlobals.tmpDir,zipW,'');
                                  }
                                  zipW.comment = "This is a comment.";
                                  zipW.close();
                                  //this.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                                } catch(e){
                                  tpecGlobals.excdump("tpecListener: "+e);
                                }
                               }
                            
                              var aDBConnection = ThunderPecSql.dbConnection;
                              var query = "SELECT * FROM autoarch WHERE msgId LIKE :reference;";
                              var iqstmt = ThunderPecSql.dbConnection.createStatement(query);
                              iqstmt.params.reference = pecReference; 
                              iqstmt.executeAsync({
                                subject:null,
                                zip:null,
                                cnt:0,
                                handleResult: function(aResultSet) {
                                  var row = aResultSet.getNextRow();
                                  this.subject =  row.getResultByName("subject");
                                  this.zip =  row.getResultByName("zip");
                                  this.cnt =  row.getResultByName("cnt");
                                },
                                handleError: function(aError) {tpecGlobals.jsdump("DB LISTENER ERROR 0x18");},
                                handleCompletion: function(aReason) {
                                  if(this.subject!=null){
                                    var suffix = this.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                                    var zipname = this.zip;
                                    var cnt = this.cnt+1;
                                    var countString = "000000000" + cnt;
                                    
                                    var query = "UPDATE autoarch SET pecMsgId=:identificativo,cnt=:cnt WHERE msgId LIKE :reference;";
                                    var ustmt = ThunderPecSql.dbConnection.createStatement(query);
                                    ustmt.params.reference = pecReference;
                                    ustmt.params.identificativo = identificativo;
                                    ustmt.params.cnt = cnt;
                                    ustmt.executeAsync(null);
                                    ustmt.finalize();
                                    
                                    
                                    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                                    file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                                    file.append(zipname);
                                    tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                                    
                                    var filename = suffix+"-"+countString.substr(countString.length-3);
                                    var subject = aMsg.mime2DecodedSubject.toLowerCase();
                                    var colon = subject.indexOf(':');
                                    var subject = subject.substring(0,colon).replace(/ /gi,"");
                                    filename += "-"+subject+".eml";
                           
                                    try {
                                      var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                                      var zipW = new zipWriter();
                                      zipW.open(file, PR_RDWR );
                                      if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                                        //windows openssl
                                        var sslfile = "";
                                        var sslcmd = "";
                                        var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-"+subject;
                                        
                                        sslfile = sslfname+".bat";
                                        sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                        sslcmd += "pause\n";
                                        tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                        
                                        //*nix openssl
                                        sslfile = sslfname+".sh";
                                        sslcmd = "#!/bin/bash\n\n";
                                        sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                                        sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                                        tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                                      }
                                      tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                                    } catch(e){
                                      tpecGlobals.excdump("tpecListener: "+e);
                                    }
                        
                                    //INSERTION
                                    tpecGlobals.jsdump("DATICERT CONSEGNA TS: "+consegna_ts);
                                  } else {
                                    tpecListener.msgAddedDo();
                                  }
                                }
                              });
                              iqstmt.finalize();
                            //} else {
                            //    tpecListener.msgAddedDo();
                            }
                          });
                          qstmt.finalize();
                        } else {
                          tpecListener.msgAddedDo();
                        }
                        
                      }
                     });
                     stmt.finalize();
                    
                    /*
                    var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE '"+aMsg.messageId+"';");
                    if(!stmt.executeStep()){
                      var query =  "INSERT INTO pec(msgId,receiptDate,pecId,referencePecId,referenceId,esitoValue,fatturaValue) VALUES('"+aMsg.messageId+"',"+aMsg.dateInSeconds+",'','"+pecReference+"','"+identificativo+"',999,'"+consegna+"');";
                      tpecGlobals.jsdump("DATICERT : "+query);
                      aDBConnection.executeSimpleSQL(query);
                    } else {
                        aStore = 0;
                    }

                    stmt.finalize();
                    //autoarchive start
                    if(aStore==1 && isInbox){
                      var aDBConnection = ThunderPecSql.dbConnection;
                      // if notification arrives before sent
                      var query = "SELECT * FROM autoarch WHERE msgId LIKE '' AND sender LIKE '"+mittente+"' AND subject LIKE '"+oggetto+"';";
                      tpecGlobals.jsdump("tpecListener: QUERY "+query);
                      var stmt = aDBConnection.createStatement(query); 
                      if(stmt.executeStep()){
                        tpecGlobals.jsdump("tpecListener: autoarch found record with notification receipt");
                        var suffix = oggetto.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                        var zipname =  aMsg.dateInSeconds.toString(16)+tpecListener.version+"_"+suffix;
                        if(zipname.length>175)zipname = zipname.substring(0, 175);
                        zipname += ".zip";
                        aDBConnection.executeSimpleSQL("UPDATE autoarch SET msgId='"+pecReference+"',zip='"+zipname+"',cnt=0 WHERE msgId LIKE '' AND sender LIKE '"+mittente+"' AND subject LIKE '"+oggetto+"';");
                        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                        file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                        file.append(zipname);
                        tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                        
                        var filename = suffix+"-000-messaggio.eml";
                        
              
                        try {
                          var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                          var zipW = new zipWriter();
                          zipW.open(file, PR_RDWR | PR_CREATE_FILE | PR_TRUNCATE);
                          if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                            zipW.addEntryDirectory('script', Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, false);
                            tpecListener.saveToFile("baltimore.pem",TPECBaltimorePEM,tpecGlobals.tmpDir,zipW,'');
                          }
                          zipW.comment = "This is a comment.";
                          zipW.close();
                          //this.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                        } catch(e){
                          tpecGlobals.excdump("tpecListener: "+e);
                        }
                        
                        stmt.finalize();
                      }

                      // if notification arrives before sent
                      var query = "SELECT * FROM autoarch WHERE msgId LIKE '"+pecReference+"';";
                      tpecGlobals.jsdump("tpecListener: QUERY "+query);
                      var stmt = aDBConnection.createStatement(query); 
                      if(stmt.executeStep()){
                        var suffix = stmt.row.subject.replace(new RegExp("[^a-zA-Z0-9]","g"),"_").replace(new RegExp("^_+|_+$","g"),"");
                        var zipname = stmt.row.zip;
                        var cnt = stmt.row.cnt+1;
                        var countString = "000000000" + cnt;
                        
                        aDBConnection.executeSimpleSQL("UPDATE autoarch SET pecMsgId='"+identificativo+"',cnt="+cnt+" WHERE msgId LIKE '"+pecReference+"';");
                        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
                        file.initWithPath(tpecGlobals.prefTP.getArchiveDir());
                        file.append(zipname);
                        tpecGlobals.jsdump("tpecListener: autoarch file "+file.path);
                        
                        var filename = suffix+"-"+countString.substr(countString.length-3);
                        var subject = aMsg.mime2DecodedSubject.toLowerCase();
                        var colon = subject.indexOf(':');
                        var subject = subject.substring(0,colon).replace(/ /gi,"");
                        filename += "-"+subject+".eml";
              
                        try {
                          var zipWriter = Components.Constructor("@mozilla.org/zipwriter;1", "nsIZipWriter");
                          var zipW = new zipWriter();
                          zipW.open(file, PR_RDWR );
                          if(tpecGlobals.prefTP.getOnlyEML()!='on') {
                            //windows openssl
                            var sslfile = "";
                            var sslcmd = "";
                            var sslfname = suffix+"-"+countString.substr(countString.length-3)+"-"+subject;
                            
                            sslfile = sslfname+".bat";
                            sslcmd = "openssl smime -verify -CAfile ..\\baltimore.pem -in ..\\"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                            sslcmd += "pause\n";
                            tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                            
                            //*nix openssl
                            sslfile = sslfname+".sh";
                            sslcmd = "#!/bin/bash\n\n";
                            sslcmd += "openssl smime -verify -CAfile ../baltimore.pem -in ../"+filename+" -attime "+aMsg.dateInSeconds+"\n";
                            sslcmd += "read -n1 -r -p \"Press any key to continue...\" key\n";
                            tpecListener.saveToFile(sslfile,sslcmd,tpecGlobals.tmpDir,zipW,'script');
                          }
                        tpecListener.asyncSaveToFile([filename,aMsg.folder.getUriForMsg(aMsg)],tpecGlobals.tmpDir,0,zipW);
                        } catch(e){
                          tpecGlobals.excdump("tpecListener: "+e);
                        }
                        
                      }
                      stmt.finalize();
                    }
                    
                    //autoarchive stop
                    */
                  } //end if(match!=null){
                  tpecListener.msgAddedDo();
                  });
                } else {   // end if(daticert!=null)
                  tpecListener.msgAddedDo();
                }
            },true);
          } catch (e) {
            tpecGlobals.excdump("tpecListener: "+e);
            tpecListener.msgAddedDo();
          }
        } else {
          tpecListener.msgAddedDo();
        }
      } else {
        tpecListener.msgAddedDo();
      }
    } else {
      tpecListener.running = false;
    }
  },

  msgsClassified: function(aMsgs, aJunkProcessed,aTraitProcessed) {tpecGlobals.jsdump("tpecListener: "+"msgsClassified");},

  msgsDeleted: function(aMsgs) {
    tpecGlobals.jsdump("tpecListener: "+"msgsDeleted");
    var count = aMsgs.length;
    var aDBConnection = ThunderPecSql.dbConnection; 
    for(var i=0;i<count;i++){
      var msgHdr = aMsgs.queryElementAt(i, Components.interfaces.nsIMsgDBHdr);
      var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
      stmt.params.mid = msgHdr.messageId;
      stmt.executeAsync({
        rows:0,
        handleResult: function(aResultSet) {this.rows = 1;},
        handleError: function(aError) {tpecGlobals.jsdump("msgsDeleted DELETE ERROR");},
        handleCompletion: function(aReason) {
          var dstmt = ThunderPecSql.dbConnection.createStatement("DELETE FROM pec WHERE msgId LIKE :mid;");
          dstmt.params.mid = msgHdr.messageId;
          tpecGlobals.jsdump("msgsDeleted DELETE");
          dstmt.executeAsync({
            handleResult: function(aResultSet) {},
            handleError: function(aError) {tpecGlobals.jsdump("msgsDeleted DELETE ERROR");},
            handleCompletion: function(aReason) {
              tpecListener.redraw();
            }
          });
          dstmt.finalize();
        }
      });
      stmt.finalize();
      /*      
      if(stmt.executeStep()){
        var query =  "DELETE FROM pec WHERE msgId LIKE '"+msgHdr.messageId+"';";
        tpecGlobals.jsdump("msgsDeleted DELETE: "+query);
        aDBConnection.executeSimpleSQL(query);
        //ReloadMessage();
        tpecListener.redraw();
      }
      stmt.finalize();
      */
    } 
  },

  msgsMoveCopyCompleted: function(aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
    tpecGlobals.jsdump("tpecListener: "+"msgsMoveCopyCompleted "+(aDestFolder.flags & folderFlags.Trash));
    if(aDestFolder.flags & folderFlags.Trash) {
      var count = aSrcMsgs.length;
      var aDBConnection = ThunderPecSql.dbConnection; 
      for(var i=0;i<count;i++){
        var msgHdr = aSrcMsgs.queryElementAt(i, Components.interfaces.nsIMsgDBHdr);
        var stmt = ThunderPecSql.dbConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
        stmt.params.mid = msgHdr.messageId;
        stmt.executeAsync({
          rows:0,
          handleResult: function(aResultSet) {this.rows = 1;},
          handleError: function(aError) {tpecGlobals.jsdump("msgsDeleted DELETE ERROR");},
          handleCompletion: function(aReason) {
            var dstmt = ThunderPecSql.dbConnection.createStatement("DELETE FROM pec WHERE msgId LIKE :mid;");
            dstmt.params.mid = msgHdr.messageId;
            tpecGlobals.jsdump("msgsDeleted DELETE");
            dstmt.executeAsync({
              handleResult: function(aResultSet) {},
              handleError: function(aError) {tpecGlobals.jsdump("msgsDeleted DELETE ERROR");},
              handleCompletion: function(aReason) {
                tpecListener.redraw();
              }
            });
            dstmt.finalize();
          }
        });
        stmt.finalize();
        
        /* 
        var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE '"+msgHdr.messageId+"';");
        if(stmt.executeStep()){
          var query =  "DELETE FROM pec WHERE msgId LIKE '"+msgHdr.messageId+"';";
          tpecGlobals.jsdump("msgsMoveCopyCompleted DELETE: "+query);
          aDBConnection.executeSimpleSQL(query);
          //ReloadMessage();
          tpecListener.redraw();
        }
        stmt.finalize();
        */
      } 
    }
  },

  msgKeyChanged: function(aOldMsgKey, aNewMsgHdr) {tpecGlobals.jsdump("tpecListener: "+"msgKeyChanged");},

  folderAdded: function(aFolder) {tpecGlobals.jsdump("tpecListener: "+"folderAdded");},

  folderDeleted: function(aFolder) {tpecGlobals.jsdump("tpecListener: "+"folderDeleted");},

  folderMoveCopyCompleted: function(aMove, aSrcFolder, aDestFolder) {tpecGlobals.jsdump("tpecListener: "+"folderMoveCopyCompleted");},

  folderRenamed: function(aOrigFolder, aNewFolder) {tpecGlobals.jsdump("tpecListener: "+"folderRenamed");},

  itemEvent: function(aItem, aEvent, aData) {tpecGlobals.jsdump("tpecListener: "+"itemEvent");},

  asyncSaveToFile: function(auri,path,idx,zip) {
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
          this.chkfile = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsIFile);
          this.chkfile.initWithPath(path);
          this.chkfile.append(auri[0]);
          tpecGlobals.jsdump("asyncSaveToFile: START saving message "+auri[0]);
          this.foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                   createInstance(Components.interfaces.nsIFileOutputStream);
          this.foStream.init(this.chkfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
        },
        onStopRequest : function (aRequest, aContext, aStatusCode) {
          this.foStream.close();
          this.foStream = null;
          tpecGlobals.jsdump("asyncSaveToFile: END saving message "+auri[0]);
          zip.addEntryFile(this.chkfile.leafName, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, this.chkfile, false);
          zip.close();
        },
        onDataAvailable : function (aRequest, aContext, aInputStream, aOffset, aCount) {
      		var stream = Components.classes["@mozilla.org/scriptableinputstream;1"].
                           createInstance().QueryInterface(Components.interfaces.nsIScriptableInputStream);
      		stream.init(aInputStream);
          this.foStream.write(stream.read(aCount),aCount);
        }
      };
	var messageService = messenger.messageServiceFromURI(auri[1]).QueryInterface(Components.interfaces.nsIMsgMessageService);
	messageService.streamMessage(auri[1], streamListener, null, null, false, null);
  },
  
  saveToFile : function(filename,filecontent,tmpDir,zip,subdir){
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
  
  }
      

};
