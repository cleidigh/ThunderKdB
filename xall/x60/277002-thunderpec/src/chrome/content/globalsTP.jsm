var EXPORTED_SYMBOLS = ["tpecGlobals", "ThunderPecSql","tpecConsoleListener"];

var tpecConsoleListener = {
  tmpDir:"",
  registered: false,
  observe: function(msg){
    var tmpfile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    
    if(this.lastTmpDir!="" && (msg.logLevel==3||msg.logLevel==2)){
    //if(this.tmpDir!=""){
      var s = "LOG ERROR ["+msg.logLevel+"]: "+msg.message+"\n";
      tmpfile.initWithPath(this.tmpDir);
      tmpfile.append("tpec_log.txt");
      var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                               createInstance(Components.interfaces.nsIFileOutputStream);
      foStream.init(tmpfile, 0x02 | 0x08 | 0x10, parseInt("0600",8), 0); 
      foStream.write(s,s.length);
      foStream.close();
    }
  },
};

var tpecGlobals = {
  tmpDir: null,
  prefTP: null,
  hdrParser: Components.classes["@mozilla.org/messenger/headerparser;1"].createInstance(Components.interfaces.nsIMsgHeaderParser),
  cs: Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService),
  messenger: Components.classes["@mozilla.org/messenger;1"].createInstance(Components.interfaces.nsIMessenger),
  jsdump: function(str){
    if(this.prefTP!=null && this.prefTP.getDebug()){
      this.cs.logStringMessage("ThunderPEC: "+str);
      this.prefTP.log(this.tmpDir,"ThunderPEC: "+str+"\n");
      }
  },
  excdump: function(str){
    if(this.prefTP!=null ){
      this.cs.logStringMessage("ThunderPEC exception: "+str);
      this.prefTP.log(this.tmpDir,"ThunderPEC exception: "+str+"\n");
      }
  },
  
  jsdumpext: function(s,str){
    if(this.prefTP!=null && this.prefTP.getDebug()){
      this.cs.logStringMessage("ThunderPEC: "+s+" "+str);
      this.prefTP.log(this.tmpDir,"ThunderPEC: "+s+" "+str+"\n");
      }
  },
  
  findAccountFromFolder: function(theFolder) {
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
        if (rootFolder.hasSubFolders) {
            var subFolders = rootFolder.subFolders; // nsIMsgFolder
            while(subFolders.hasMoreElements()) {
                if (theFolder == subFolders.getNext().QueryInterface(Components.interfaces.nsIMsgFolder))
                    return account.QueryInterface(Components.interfaces.nsIMsgAccount);
            }
        }
    }
    return null;
  },
  
  attachContent: function(attach,aMsgHdr,process){
    if(attach!=null){
        var pctfile = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsIFile);
        pctfile.initWithPath(tpecGlobals.tmpDir);
        pctfile.append(attach.name);
        pctfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
        tpecGlobals.jsdump("tpecListener XML file : ("+pctfile.path+") ");
        
        this.messenger.saveAttachmentToFile(pctfile,attach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),attach.contenType,{
          OnStartRunningUrl : function (url) {},
          OnStopRunningUrl : function (url,code) {
            tpecGlobals.jsdump("saving XML attachment");
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
            tpecGlobals.jsdump("ESITO XML: "+xmldata);

            process(xmldata);
          }
        });
      }  
  },    

  zipContent: function(attach,aMsgHdr,process){
    if(attach!=null){
        var pctfile = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsIFile);
        pctfile.initWithPath(tpecGlobals.tmpDir);
        pctfile.append(attach.name);
        pctfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0600",8));
        tpecGlobals.jsdump("tpecListener ZIP file : ("+pctfile.path+") ");
        
        this.messenger.saveAttachmentToFile(pctfile,attach.url,aMsgHdr.folder.getUriForMsg(aMsgHdr),attach.contenType,{
          OnStartRunningUrl : function (url) {},
          OnStopRunningUrl : function (url,code) {
            tpecGlobals.jsdump("processing ZIP attachment");
            process(pctfile);
            pctfile.remove(true);
          }
        });
      }  
  }    

}

var ThunderPecSql = {

  onLoad: function() {
    // initialization code
    ThunderPecSql._log("onLoad");
    this.initialized = true;
    this.dbInit();
    ThunderPecSql._log("connection: "+this.dbConnection);
 },
  onUnload: function() {
    // initialization code
    ThunderPecSql._log("onUnload");
    if(this.dbConnection!=null)this.dbConnection.asyncClose(null);
  },

  dbConnection: null,
  initialized: false,
  dbVersion: 3,
  restartDB: false,
  cver: 0,

  
  dbSchema: {
     tables: {
       parameters:  "id INTEGER PRIMARY KEY,name TEXT,value TEXT NOT NULL",
       pec:         "id INTEGER PRIMARY KEY,msgId TEXT,receiptDate INTEGER,pecId TEXT,referencePecId TEXT,referenceId TEXT,esitoValue INTEGER,fatturaValue TEXT",
       autoarch:    "id INTEGER PRIMARY KEY,msgId TEXT,pecMsgId TEXT,sender TEXT,subject TEXT,destination TEXT,zip TEXT,cnt INTEGER",
       pecdata:     "id INTEGER PRIMARY KEY,pec TEXT,status TEXT,created INTEGER,modified INTEGER,sync INTEGER",
    },
     init: {
       0:  "INSERT INTO parameters(name,value) VALUES('dbversion','4');",

    },
  },

  dbInit: function() {
    var dirService = Components.classes["@mozilla.org/file/directory_service;1"].
      getService(Components.interfaces.nsIProperties);

    var dbFile = dirService.get("ProfD", Components.interfaces.nsIFile);
    dbFile.append("thunderpec.sqlite");

    var dbService = Components.classes["@mozilla.org/storage/service;1"].
      getService(Components.interfaces.mozIStorageService);
    

    if (!dbFile.exists())
      this._dbCreate(dbService, dbFile);
    else {
      this.dbConnection = dbService.openDatabase(dbFile);
      if(this.restartDB){
        this._dbDropTables(this._dbCreateTables);
      } else {
        this._dbUpdate();
      }
    }
  },

  _dbCreate: function(aDBService, aDBFile) {
    this.dbConnection = aDBService.openDatabase(aDBFile);
    this._dbCreateTables(null);
  },

  _dbCreateTables: function(nextop) {
    var aDBConnection = ThunderPecSql.dbConnection;
    var stmt = [];
    var st = null;
    
    for(var name in ThunderPecSql.dbSchema.tables)aDBConnection.createTable(name, ThunderPecSql.dbSchema.tables[name]);
    for(var idx in ThunderPecSql.dbSchema.init){
      st = aDBConnection.createAsyncStatement(ThunderPecSql.dbSchema.init[idx]);
      stmt.push(st);
    }
    aDBConnection.executeAsync(stmt,stmt.length,{
      handleResult: function() {},
      handleError: function() {},
      handleCompletion: function(aReason) {ThunderPecSql._log("table created");}
    });
  },

  _dbDropTables: function(nextop) {
    var aDBConnection = ThunderPecSql.dbConnection;
    var stmt = [];   
    var st = null;
    for(var name in ThunderPecSql.dbSchema.tables){
      st = aDBConnection.createAsyncStatement("DROP TABLE "+name+";");
      stmt.push(st);      
    }
    aDBConnection.executeAsync(stmt,stmt.length,{
      handleResult: function() {ThunderPecSql._log("table result");},
      handleError: function() {ThunderPecSql._log("table error");},
      handleCompletion: function(aReason) {
        ThunderPecSql._log("table deleted");
        if(nextop)nextop(ThunderPecSql.dbConnection);
      }
    });
  },
  
  _dbUpdate: function() {
    var aDBConnection = ThunderPecSql.dbConnection;
    ThunderPecSql.cver = 0;
    var stmt = aDBConnection.createStatement("SELECT * FROM parameters WHERE name LIKE 'dbversion';");
    stmt.executeAsync({
      handleResult: function(aResultSet) {
        let row = aResultSet.getNextRow();
        ThunderPecSql.cver =  parseInt(row.getResultByName("value"));
      },
      handleError: function() {ThunderPecSql._log("update table error");},
      handleCompletion: function(aReason) {
        ThunderPecSql._log("dbversion "+ThunderPecSql.cver );
        var astmt = [];
        //var cver = parseInt(stmt.row.value);
        if(ThunderPecSql.cver>0 && ThunderPecSql.cver<2){
          ThunderPecSql.cver = 2;
          ThunderPecSql.dbConnection.createTable("autoarch", ThunderPecSql.dbSchema.tables["autoarch"]);
          var st = ThunderPecSql.dbConnection.createStatement("UPDATE parameters SET value=:cver WHERE name LIKE 'dbversion';");
          st.params.cver = ThunderPecSql.cver;
          astmt.push(st);
        }
        if(ThunderPecSql.cver>0 && ThunderPecSql.cver<3){
          ThunderPecSql.cver = 3;
          ThunderPecSql.dbConnection.executeSimpleSQL("ALTER TABLE autoarch ADD COLUMN pecMsgId TEXT;");
          astmt.push(ThunderPecSql.dbConnection.createStatement("UPDATE autoarch SET pecMsgId='';"));
          var st = ThunderPecSql.dbConnection.createStatement("UPDATE parameters SET value=:cver WHERE name LIKE 'dbversion';");
          st.params.cver = ThunderPecSql.cver;
          astmt.push(st);
        }
        if(ThunderPecSql.cver>0 && ThunderPecSql.cver<4){
          ThunderPecSql.cver = 4;
          ThunderPecSql.dbConnection.createTable("pecdata", ThunderPecSql.dbSchema.tables["pecdata"]);
          var st = ThunderPecSql.dbConnection.createStatement("UPDATE parameters SET value=:cver WHERE name LIKE 'dbversion';");
          st.params.cver = ThunderPecSql.cver;
          astmt.push(st);
        }
        if(astmt.length>0){
          ThunderPecSql.dbConnection.executeAsync(astmt,astmt.length,{
            handleResult: function() {},
            handleError: function(aError) {ThunderPecSql._log("table update error "+aError.message);},
            handleCompletion: function(aReason) {ThunderPecSql._log("table updated");}
          });
        }
        ThunderPecSql._log("update end "+astmt.length );

      }
    });
    stmt.finalize();

      
                
  },
  
  _log: function(str) {
      Components.classes['@mozilla.org/consoleservice;1']
                .getService(Components.interfaces.nsIConsoleService)
                .logStringMessage("ThunderPecSql: "+str);
  }
  
}
