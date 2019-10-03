Components.utils.import("chrome://thunderpec/content/globalsTP.jsm");

var tpecColumnHandler = {
   pec: [],
   folder: null,
   getCellText: function(row, col) {
    var value = "";
    var hdr = gDBView.getMsgHdrAt(row);
    if(this.folder!=hdr.folder){
      tpecColumnHandler.pec = [];
      this.folder = hdr.folder;
      tpecGlobals.jsdump("tpecColumnHandler: FOLDER CHANGE "+hdr.folder.prettyName);
    }
    if(typeof tpecColumnHandler.pec[row] === 'undefined') {
      var aDBConnection = ThunderPecSql.dbConnection; 
      var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE :mid;");
      stmt.params.mid =  hdr.messageId;
      stmt.executeAsync({
        esitoValue:0,
        fatturaValue:"",
        handleResult: function(aResultSet){
          var r = aResultSet.getNextRow();
          this.esitoValue =  r.getResultByName("esitoValue");
          this.fatturaValue =  r.getResultByName("fatturaValue");
        },
        handleError: function(aError){
          tpecGlobals.jsdump("tpecColumnHandler: handleError "+aError);
        },
        handleCompletion: function(aReason){
          if(this.esitoValue!=0){
            tpecColumnHandler.pec[row] = [];
            tpecColumnHandler.pec[row]["mid"] = hdr.messageId;
            switch (this.esitoValue){
              case 1: tpecColumnHandler.pec[row]["text"] ="DEC";break;
              case 2: tpecColumnHandler.pec[row]["text"] ="DAC";break;
              case 10: tpecColumnHandler.pec[row]["text"] ="DEP";break;
              case -1: 
              if(hdr.mime2DecodedSubject.indexOf("POSTA CERTIFICATA: ACCETTAZIONE DEPOSITO")==0){
                tpecColumnHandler.pec[row]["text"] ="DAC";                                                                             
              } else {
                tpecColumnHandler.pec[row]["text"] ="DEC";                                                                             
              }
              break;
              case -3: tpecColumnHandler.pec[row]["text"] ="DNE";break;
              case 888: tpecColumnHandler.pec[row]["text"]  = "F"+this.fatturaValue.substring(0,2);break;
            }
            tpecColumnHandler.pec[row]["color"] = "pecGreen";
            if(this.esitoValue==-1||this.esitoValue==-3){
              tpecColumnHandler.pec[row]["color"] = "pecRed";
            } else if(this.esitoValue==888){
              if(this.fatturaValue=="NS")tpecColumnHandler.pec[row]["color"] = "pecRed";
              if(this.fatturaValue=="AT")tpecColumnHandler.pec[row]["color"] = "pecRed";
              if(this.fatturaValue=="DT")tpecColumnHandler.pec[row]["color"] = "pecRed";
              if(this.fatturaValue=="MC")tpecColumnHandler.pec[row]["color"] = "pecRed";
              if(this.fatturaValue=="SE")tpecColumnHandler.pec[row]["color"] = "pecRed";
              if(this.fatturaValue=="ECEC02")tpecColumnHandler.pec[row]["color"] = "pecRed";
              if(this.fatturaValue=="NEEC02")tpecColumnHandler.pec[row]["color"] = "pecRed";
            }
            var threadTree = document.getElementById("threadTree");
            if(threadTree){
              threadTree.treeBoxObject.invalidateCell(row, col);
            }
            
          }
        }
      });
      stmt.finalize();
    } else {
      if(tpecColumnHandler.pec[row]["mid"]==hdr.messageId){
        value = tpecColumnHandler.pec[row]["text"];
      } else {
        this.folder = null;
        var threadTree = document.getElementById("threadTree");
        if(threadTree){
          var peccolumn = threadTree.treeBoxObject.columns.getNamedColumn("pecColumn");
          threadTree.treeBoxObject.invalidateColumn(peccolumn);
        }
      }
    }
    return value;
  },
   getSortStringForRow: function(hdr) {return null;},
   isString:            function() {return true;},
   getCellProperties:   function(row, col, props){
    /*
    var hdr = gDBView.getMsgHdrAt(row);
    var aDBConnection = ThunderPecSql.dbConnection; 
    var stmt = aDBConnection.createStatement("SELECT * FROM pec WHERE msgId LIKE '"+hdr.messageId+"';");
    var value = "pecGreen";
    if(stmt.executeStep()){
      if(stmt.row.esitoValue==-1||stmt.row.esitoValue==-3){
        value = "pecRed";
      } else if(stmt.row.esitoValue==888){
        if(stmt.row.fatturaValue=="NS")value = "pecRed";
        if(stmt.row.fatturaValue=="AT")value = "pecRed";
        if(stmt.row.fatturaValue=="DT")value = "pecRed";
        if(stmt.row.fatturaValue=="MC")value = "pecRed";
        if(stmt.row.fatturaValue=="SE")value = "pecRed";
        if(stmt.row.fatturaValue=="ECEC02")value = "pecRed";
        if(stmt.row.fatturaValue=="NEEC02")value = "pecRed";
        
      }
    }
    stmt.finalize();  
    */
    var value = "pecGreen";
    if(typeof tpecColumnHandler.pec[row] !== 'undefined') {
      value = tpecColumnHandler.pec[row]["color"];
    }
    
    if (props) {
      var aserv = Components.classes["@mozilla.org/atom-service;1"].getService(Components.interfaces.nsIAtomService);
      var atom = aserv.getAtom(value);
      props.AppendElement(atom);
    } else {
      return value;
    }

   },
   getRowProperties: function(row, props){
   },
   getImageSrc:         function(row, col) {return null;},
   getSortLongForRow:   function(hdr) {return 0;}
}



function addTPECColumnHandler2() { 
  document.getElementById("pecColumn").ordinal = "999";
  if(document.getElementById("pecColumn").hidden==true){
    if(tpecGlobals.prefTP.getPecCol()=='on'){
      document.getElementById("pecColumn").hidden = false;
    }  else {
      var folder = gFolderDisplay.displayedFolder;
      var account = tpecGlobals.findAccountFromFolder(folder);
      var regex = new RegExp("mailbox:\/\/nobody(.*)\/Inbox","g");
      var match = regex.exec(gFolderDisplay.displayedFolder.URI);
      tpecGlobals.jsdump("searchTP: ColumnTP "+gFolderDisplay.displayedFolder.URI+" "+match);
      if(match){   //global inbox
        tpecGlobals.jsdump("ColumnTP: activate toolbar on global inbox");      
        document.getElementById("pecColumn").hidden = false;
      } else {
        if(account) {
          document.getElementById("pecColumn").hidden = true;
          var mbxName = "     ";
          if(account.defaultIdentity){
            mbxName = account.defaultIdentity.email;
          }
          tpecGlobals.jsdump("ColumnTP: mbxname: "+mbxName);      
          if(tpecGlobals.prefTP.exists(mbxName)){
            tpecGlobals.jsdump("ColumnTP: activate toolbar");      
            document.getElementById("pecColumn").hidden = false;
          } else {
            tpecGlobals.jsdump("ColumnTP: deactivate toolbar");      
            document.getElementById("pecColumn").hidden = true;
          }
        } else {
          tpecGlobals.jsdump("ColumnTP: account not found; deactivate toolbar");      
          document.getElementById("pecColumn").hidden = true;
        }
      }
    }
  } 
  if(gDBView) {
    gDBView.addColumnHandler("pecColumn", tpecColumnHandler);
    tpecGlobals.jsdump("addTPECColumnHandler: ");
  } else {
    tpecGlobals.jsdump("gDBView is NULL ");
  }
}


function addTPECColumnHandler() {
  if(document.getElementById("pecColumn")){
    document.getElementById("pecColumn").ordinal = "999";
  }
  if(tpecGlobals.prefTP.getPecCol()=='off'){
    if(document.getElementById("pecColumn")){
      document.getElementById("pecColumn").hidden = true;
    }
  }  else {
    var folder = gFolderDisplay.displayedFolder;
    var account = tpecGlobals.findAccountFromFolder(folder);
    var regex = new RegExp("mailbox:\/\/nobody(.*)\/Inbox","g");
    var match = regex.exec(gFolderDisplay.displayedFolder.URI);
    tpecGlobals.jsdump("searchTP: ColumnTP "+gFolderDisplay.displayedFolder.URI+" "+match);
    if(match){   //global inbox
      tpecGlobals.jsdump("ColumnTP: activate toolbar on global inbox");      
      document.getElementById("pecColumn").hidden = false;
    } else {
      if(account) {
        document.getElementById("pecColumn").hidden = true;
        var mbxName = "     ";
        if(account.defaultIdentity){
          mbxName = account.defaultIdentity.email;
        }
        tpecGlobals.jsdump("ColumnTP: mbxname: "+mbxName);      
        if(tpecGlobals.prefTP.exists(mbxName)){
          tpecGlobals.jsdump("ColumnTP: activate toolbar");      
          document.getElementById("pecColumn").hidden = false;
          //document.getElementById("pecColumn").ordinal = document.getElementById("subjectCol").ordinal+1;
        } else {
          tpecGlobals.jsdump("ColumnTP: deactivate toolbar");      
          document.getElementById("pecColumn").hidden = true;
        }
      } else {
        tpecGlobals.jsdump("ColumnTP: account not found; deactivate toolbar");      
        document.getElementById("pecColumn").hidden = true;
      }
    }
  }
  if(document.getElementById("pecColumn")){
    if(document.getElementById("pecColumn").hidden==false) {
      if(gDBView) {
        gDBView.addColumnHandler("pecColumn", tpecColumnHandler);
        tpecGlobals.jsdump("addTPECColumnHandler: ");
      } else {
        tpecGlobals.jsdump("gDBView is NULL ");
      }
    }
  }
}