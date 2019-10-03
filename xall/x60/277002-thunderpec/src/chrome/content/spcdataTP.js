"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.spcdata) tpec_org.xtc.tp.spcdata = {};

//Components.utils.import("resource://gre/modules/NetUtil.jsm");

tpec_org.xtc.tp.spcdata = function(){
  
  function pub(){};

  var from;
  var odd = true;
  var prefTP = null;
  var limit = 50;
  var offset = 0;
  var num_records;
  var stringBundle;
  var searchString;
  var maxTextLen = 70;
  var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);  
  
//  var dflt_query = "select distinct ?name, ?pec where { "+
//    "?x <http://www.w3.org/2000/01/rdf-schema#label> ?name . "+ 
//    "?x <http://spcdata.digitpa.gov.it/PEC> ?pec . "+
//    "FILTER regex(?name,\"***searchstring***\",\"i\")}";
  var dflt_query = "SELECT DISTINCT ?name, ?pec, ?cec WHERE { "+
    "?x <http://www.w3.org/2000/01/rdf-schema#label> ?name . "+ 
    "?x <http://spcdata.digitpa.gov.it/PEC> ?pec . "+
    "OPTIONAL{?x <http://spcdata.digitpa.gov.it/CEC-PAC> ?cec} . "+
    "FILTER regex(?name,\"***searchstring***\",\"i\")} ORDER BY ?name OFFSET ***offset*** LIMIT ***limit***";
  var count_query = "SELECT COUNT(DISTINCT ?pec) AS ?nr WHERE { "+
    "?x <http://www.w3.org/2000/01/rdf-schema#label> ?name . "+ 
    "?x <http://spcdata.digitpa.gov.it/PEC> ?pec . "+
    "FILTER regex(?name,\"***searchstring***\",\"i\")}";
  var dlftl_url = "http://spcdata.digitpa.gov.it:8899/sparql";
  
  pub.jsdump = function(str){
  if(prefTP.getDebug()){
    Components.classes['@mozilla.org/consoleservice;1']
              .getService(Components.interfaces.nsIConsoleService)
              .logStringMessage("ThunderPEC: "+str);
              }
  };

  pub.init = function(){
    prefTP = new ThunderPecPrefs();
    prefTP.init();
    
    stringBundle = document.getElementById("tpecStringBundle");
    document.getElementById("tpecSearchPANavigation").hidden = true;

    if("arguments" in window && window.arguments.length > 0) {
      from = window.arguments[0].from;
    }
    document.getElementById("tpecFatturaPA").hidden = true;
    if(from=="compose"){
      document.getElementById("tpecSearchPATo").hidden = false;
      document.getElementById("tpecSearchPACc").hidden = false;
      document.getElementById("tpecSearchPASend").hidden = true;
    }
    if(from=="main"){
      document.getElementById("tpecSearchPATo").hidden = true;
      document.getElementById("tpecSearchPACc").hidden = true;
      document.getElementById("tpecSearchPASend").hidden = false;
    }
  };

  pub.keypress = function(e){
    if(e.keyCode==13)tpec_org.xtc.tp.spcdata.search();
  };
  
  pub.search = function(){
      document.getElementById("tpecSearchPAButton").setAttribute("disabled", "true");
      document.getElementById("tpecSearchPANavigation").hidden = true;
      tpec_org.xtc.tp.spcdata.empty_list();
      searchString = document.getElementById("tpecSearchPAText").value;
      if(searchString.length==0){
        tpec_org.xtc.tp.spcdata.showError(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.emptysearchstring'));
      } else {
        offset = 0;
        num_records = 0;
        
        searchString = searchString.replace(new RegExp("[^a-zA-Z0-9 ]","gi"),"");
        searchString = searchString.replace(/^\s\s*/, '').replace(/\s\s*$/, '').replace(/\s\s+/g, ' ');
        document.getElementById("tpecSearchPAText").value = searchString;         
        searchString = searchString.replace(new RegExp(" ","ig"),"%25");
        if(searchString.length==0){
          tpec_org.xtc.tp.spcdata.showError(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.emptysearchstring'));
          return;
        }
        
        var fa = "";
        if(document.getElementById("tpecFatturaPA").checked)fa = "&fa=1";
        
        //var records_query = count_query.replace('***searchstring***',searchString); 
        //tpec_org.xtc.tp.spcdata.jsdump("Checking SPARQL query: "+records_query);

        document.getElementById("tpecSearchPAStatus").value = stringBundle.getString('tpec.status.connecting')+" indicepa.gov.it";

        try{
          //var query_string = "default-graph-uri=&should-sponge=&timeout&format="+encodeURIComponent("application/sparql-results+json")+"&";
          //query_string += "query="+encodeURIComponent(records_query).replace('%20','+');
          
          //var nativeJSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON);  
          var request = new XMLHttpRequest();
          tpec_org.xtc.tp.spcdata.jsdump("IPA Count "+"http://www.pocketpec.it/ipa/count.wide.php?q="+searchString+fa)
          request.open('GET', 'http://www.pocketpec.it/ipa/count.wide.php?q='+searchString+fa, true);
          request.onreadystatechange = function (oEvent) {
            if (request.readyState === 4) {
              if (request.status === 200) {
                tpec_org.xtc.tp.spcdata.jsdump("IPA response: "+request.responseText);
                var count = JSON.parse(request.responseText);
                tpec_org.xtc.tp.spcdata.jsdump("IPA response: "+count["count"]);

                  num_records = count["count"];
                  tpec_org.xtc.tp.spcdata.jsdump("Found "+ num_records+" records");
                  if(num_records>0){
                    tpec_org.xtc.tp.spcdata.sparql_query(searchString,offset,limit);
                    if(num_records>50){
                      document.getElementById("tpecSearchPANavigation").hidden = false;
                      document.getElementById("tpecSearchPAPrevious").setAttribute("disabled", "true");
                    } 
                    //document.getElementById("tpecSearchPAStatus").value = (num_records>50 ? stringBundle.getString('tpec.status.fromrecord')+" "+
                    //  (offset+1)+" "+stringBundle.getString('tpec.status.torecord')+" "+(offset+limit)+"; ":"")+
                    //  stringBundle.getString('tpec.status.totalrecords')+" "+num_records;
                  } else {
                    tpec_org.xtc.tp.spcdata.showError(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.error.norecords'));
                  }

                 request = null;
              } else {
               tpec_org.xtc.tp.spcdata.showError(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.error.connectionerror')+" indicepa.gov.it");
              } 
            }
          };
          request.send(null);

        } catch(e){
          tpec_org.xtc.tp.spcdata.jsdump(e);
          tpec_org.xtc.tp.spcdata.showError(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.error.connectionerror')+" indicepa.gov.it");
        }
      }
      
  };

  pub.previous = function(){
    tpec_org.xtc.tp.spcdata.empty_list();
    offset -=  limit;
    document.getElementById("tpecSearchPANext").setAttribute("disabled", "true");
    document.getElementById("tpecSearchPAPrevious").setAttribute("disabled", "true");
    if((offset)<=0){
      offset = 0;
    }
    try{
      document.getElementById("tpecSearchPAStatus").value = stringBundle.getString('tpec.status.connecting')+" indicepa.gov.it";
      tpec_org.xtc.tp.spcdata.sparql_query(searchString,offset,limit);    
    } catch(e){
      tpec_org.xtc.tp.spcdata.jsdump(e);
      tpec_org.xtc.tp.spcdata.showError(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.error.connectionerror')+" indicepa.gov.it");
    }
  };
  
  pub.next = function(){
    tpec_org.xtc.tp.spcdata.empty_list();
    offset +=  limit;
    document.getElementById("tpecSearchPANext").setAttribute("disabled", "true");
    document.getElementById("tpecSearchPAPrevious").setAttribute("disabled", "true");
    try{
      document.getElementById("tpecSearchPAStatus").value = stringBundle.getString('tpec.status.connecting')+" indicepa.gov.it";
      tpec_org.xtc.tp.spcdata.sparql_query(searchString,offset,limit);    
    } catch(e){
      tpec_org.xtc.tp.spcdata.jsdump(e);
      tpec_org.xtc.tp.spcdata.showError(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.error.connectionerror')+" indicepa.gov.it");
    }
  };
  
  pub.addto = function(){
      var listresult = document.getElementById("tpecSearchPAResult");
      if(listresult.selectedIndex!=-1){
        window.arguments[0].to = listresult.selectedItem.label;
        window.arguments[0].cc = null;
        window.close();
      }
  };

  pub.addcc = function(){
      var listresult = document.getElementById("tpecSearchPAResult");
      if(listresult.selectedIndex!=-1){
        window.arguments[0].to = null;
        window.arguments[0].cc = listresult.selectedItem.label;
        window.close();
      }
  };

  pub.sendto = function(){
      var listresult = document.getElementById("tpecSearchPAResult");
      if(listresult.selectedIndex!=-1){
          var sURL="mailto:"+listresult.selectedItem.label;

          var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"]
            .getService(Components.interfaces.nsIMsgComposeService);
          var ioService = Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
      
          var aURI = ioService.newURI(sURL, null, null);
          msgComposeService.OpenComposeWindowWithURI (null, aURI);  
          
          window.close();

      }
  };

  pub.clear = function(){
    tpec_org.xtc.tp.spcdata.empty_list();
    document.getElementById("tpecSearchPAText").value = "";
    document.getElementById("tpecSearchPANavigation").hidden = true;
    document.getElementById("tpecFatturaPA").hidden = true;
    document.getElementById("tpecFatturaPA").setAttribute("checked", "false");
  };

  pub.close = function(){
    window.close();
  };

  pub.empty_list = function(){
    var listresult = document.getElementById('tpecSearchPAResult');
    var count = listresult.itemCount;
    while(count-- > 0){
      listresult.removeItemAt(0);
    }
    document.getElementById("tpecSearchPAStatus").value = "";
  };

  pub.sparql_query = function(s,o,l){
  
    var listresult = document.getElementById("tpecSearchPAResult");
    odd = true;
    
    document.getElementById("tpecSearchPAButton").setAttribute("disabled", "true");

    var fa = "";
    if(document.getElementById("tpecFatturaPA").checked)fa = "&fa=1";
    
    //var this_query =  dflt_query.replace('***searchstring***',s);
    //this_query =  this_query.replace('***offset***',o);
    //this_query =  this_query.replace('***limit***',l);

    //tpec_org.xtc.tp.spcdata.jsdump("Real SPARQL query: "+this_query);

    //var query_string = "default-graph-uri=&should-sponge=&timeout&format="+encodeURIComponent("application/sparql-results+json")+"&";
    //query_string += "query="+encodeURIComponent(this_query).replace('%20','+');


    var request = new XMLHttpRequest();
    tpec_org.xtc.tp.spcdata.jsdump("IPA Records "+"http://www.pocketpec.it/ipa/records.php?q="+searchString+"&f="+o+"&t="+l+fa)
    request.open('GET', "http://www.pocketpec.it/ipa/records.wide.php?q="+searchString+"&f="+o+"&t="+l+fa, true);
    request.onreadystatechange = function (oEvent) {
      if (request.readyState === 4) {
        if (request.status === 200) {
          tpec_org.xtc.tp.spcdata.jsdump(request.status);
          tpec_org.xtc.tp.spcdata.jsdump(request.responseText);

            var a = JSON.parse(request.responseText);
            for(var i=0;i<a.length;i++){
              var y = a[i]["description"].toLowerCase();;
      				var pec = a[i]["email"].toLowerCase();
              
              var newitem = document.createElement('listitem');
              newitem.setAttribute('tooltiptext', y );
              var newcell = document.createElement('listcell');
              newcell.setAttribute('label', y );
              newcell.setAttribute('value', y );
              newitem.appendChild( newcell );
              
              newcell = document.createElement('listcell');
              newcell.setAttribute('label', pec );
              newcell.setAttribute('value', pec );
              newitem.appendChild( newcell );
              
              if(odd){
                newitem.setAttribute('class', "tpecListboxRowOdd" );
              } else {
                newitem.setAttribute('class', "tpecListboxRowEven" );
              }
              newitem.setAttribute('label', pec);
              listresult.appendChild(newitem);
              
              odd = !odd;
            }
            document.getElementById("tpecSearchPAStatus").value = (num_records>50 ? stringBundle.getString('tpec.status.fromrecord')+" "+
              (offset+1)+" "+stringBundle.getString('tpec.status.torecord')+" "+(offset+limit)+"; ":"")+
              stringBundle.getString('tpec.status.totalrecords')+" "+num_records;
            document.getElementById("tpecFatturaPA").hidden = false;

          //response = null;
          request = null;
          document.getElementById("tpecSearchPAButton").setAttribute("disabled", "false");
          tpec_org.xtc.tp.spcdata.enableNav();
        } else {
          tpec_org.xtc.tp.spcdata.showError(window,stringBundle.getString('tpec.error'),stringBundle.getString('tpec.error')+" "+request.status);
        }
      }
    };
    request.send(null);

  };

  pub.showError = function(w,t,m){
    prompts.alert(w,t,m);
    document.getElementById("tpecSearchPAButton").setAttribute("disabled", "false");
    document.getElementById("tpecSearchPAStatus").value = "";
    tpec_org.xtc.tp.spcdata.enableNav();
    }

    pub.enableNav = function() {
      if((offset)<=0){
        offset = 0;
        document.getElementById("tpecSearchPAPrevious").setAttribute("disabled", "true");
      } else {
        document.getElementById("tpecSearchPAPrevious").setAttribute("disabled", "false");
      }
      if((offset+limit)>=num_records){
        document.getElementById("tpecSearchPANext").setAttribute("disabled", "true");
      } else {
        document.getElementById("tpecSearchPANext").setAttribute("disabled", "false");
      }
    
    }
   
  return pub;
}();
