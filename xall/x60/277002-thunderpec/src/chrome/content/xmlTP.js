"use strict";
Components.utils.import("chrome://thunderpec/content/xmlParserTP.jsm");

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.xml) tpec_org.xtc.tp.xml = {};


tpec_org.xtc.tp.xml = function(){
  function pub(){};

  var xmlReader = Components.classes["@mozilla.org/saxparser/xmlreader;1"]
                        .createInstance(Components.interfaces.nsISAXXMLReader);
  var xmlDoc = "";
  var tmpDir = "";
  var which = "";
  var htmlDoc = "";
  var attrs = null;
  var zone = "";
  var dv,df,hv,hf;
  var currentView="";

  xmlReader.contentHandler = {
    startDocument: function() {
      htmlDoc = "";
      htmlDoc += "<html>\n";
      htmlDoc += "<head>\n";
      htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n";
      htmlDoc += "<meta charset=\"utf-8\" />\n";
      htmlDoc += "<style type=\"text/css\">\n";
      htmlDoc += "<!--\n";
      htmlDoc += ".desc {font-size:14px;font-weight:bold;}\n";
      htmlDoc += ".value {font-size:14px;font-weight:normal;}\n";
      htmlDoc += ".valuec {font-size:14px;font-weight:normal;text-transform:capitalize;}\n";
      htmlDoc += ".redline {height:2px;background:#E52B50;padding:0px;}\n";
      htmlDoc += ".blueline {height:2px;background:#6495ED;padding:0px;}\n";
      htmlDoc += ".maintable {background:#fff;margin-left:auto;margin-right:auto;border-color:#000000;border-style:solid;border-width:2px 2px;padding:5px;}\n";
      htmlDoc += "-->\n";
      htmlDoc += "</style>\n";
      htmlDoc += "</head>\n";
      htmlDoc += "<body>\n";
      
      df = 0;
      hf = 0;
      dv = "";
      hv = "";
      
    },
    endDocument: function() {
      htmlDoc += "</body>\n";
      htmlDoc += "</html>\n";
    },
    startElement: function(uri, localName, qName, attributes) {
      attrs = new Array();
      for(var i=0; i<attributes.length; i++) {
        attrs[attributes.getQName(i)]=attributes.getValue(i);
      }
      if(qName=="postacert"){
        htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
		    htmlDoc += "<tr><td class=\"desc\">Tipo: </td><td class=\"valuec\">"+attrs["tipo"]+"</td></tr>\n";
		    htmlDoc += "<tr><td class=\"desc\">Errore: </td><td class=\"valuec\">"+attrs["errore"]+"</td></tr>\n";
      }
      if(qName=="intestazione"){
        htmlDoc += "<tr><td class=\"redline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="mittente"){
        htmlDoc += "<tr><td class=\"desc\">Da: </td><td class=\"value\">";
      }
      if(qName=="destinatari"){
        htmlDoc += "<tr><td class=\"desc\">A: </td><td class=\"value\">";
      }
      if(qName=="risposte"){
        htmlDoc += "<tr><td class=\"desc\">Rispondi a: </td><td class=\"value\">";
      }
      if(qName=="oggetto"){
        htmlDoc += "<tr><td class=\"desc\">Oggetto: </td><td class=\"value\">";
      }
      if(qName=="dati"){
        htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="gestore-emittente"){
        htmlDoc += "<tr><td class=\"desc\">Gestore PEC: </td><td class=\"value\">";
      }
      if(qName=="data"){
        htmlDoc += "<tr><td class=\"desc\">Data: </td><td class=\"value\">";
        zone = attrs["zona"];
      }
      if(qName=="giorno"){
        htmlDoc += "";
        df = 1;
      }
      if(qName=="ora"){
        htmlDoc += " ";
        hf = 1;
      }
      if(qName=="identificativo"){
        htmlDoc += "<tr><td class=\"desc\">Identificativo PEC: </td><td class=\"value\">";
      }
      if(qName=="msgid"){
        htmlDoc += "<tr><td class=\"desc\">ID del messaggio originale: </td><td class=\"value\">";
      }
      if(qName=="ricevuta"){
        htmlDoc += "<tr><td class=\"desc\">Tipo di ricevuta: </td><td class=\"valuec\">"+attrs["tipo"];
      }
      if(qName=="consegna"){
        htmlDoc += "<tr><td class=\"desc\">Consegnato a: </td><td class=\"value\">";
      }
      if(qName=="ricezione"){
        htmlDoc += "<tr><td class=\"desc\">Ricezione: </td><td class=\"value\">";
      }
      if(qName=="errore-esteso"){
        htmlDoc += "<tr><td class=\"desc\">Descrizione errore: </td><td class=\"valuec\">";
      }
    },
    endElement: function(uri, localName, qName) {
      if(qName=="postacert"){
        htmlDoc += "</table>";
      }
      if(qName=="intestazione"){
        htmlDoc += "<tr><td class=\"redline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="dati"){
        htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="mittente"||qName=="risposte"||qName=="oggetto"||qName=="gestore-emittente"||qName=="identificativo"){
        htmlDoc += "</td></tr>";
      }
      if(qName=="msgid"||qName=="ricevuta"||qName=="consegna"||qName=="ricezione"||qName=="errore-esteso"){
        htmlDoc += "</td></tr>";
      }
      if(qName=="destinatari"){
        htmlDoc += " (destinatario "+attrs["tipo"]+")</td></tr>";
      }
      if(qName=="giorno"){
        df = 0;
      }
      if(qName=="ora"){
        hf = 0;
      }
      if(qName=="data"){
        htmlDoc += "(GMT"+zone+")</td></tr>";
        
        var tmpdate = dv.split('/');
        var newdate = tmpdate[1]+"/"+tmpdate[0]+"/"+tmpdate[2];
        var jsdate = new Date(newdate +" "+hv+" GMT "+zone);
        var attr_ts = jsdate.getTime()/1000;
        htmlDoc += "<tr><td class=\"desc\">Timestamp: </td><td class=\"value\">"+attr_ts+"</td></tr>";
      }
    },
    characters: function(value) {
      //if(value=="<")value = "&lt;"
      //if(value==">")value = "&gt;"
      htmlDoc += ThunderPecUtility.escapeHtmlEntities(value);
      if(df==1)dv += ThunderPecUtility.escapeHtmlEntities(value);
      if(hf==1)hv += ThunderPecUtility.escapeHtmlEntities(value);
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
  var algoritmo = null;
  var codifica = null;
  var tipoImpronta = null;

  esitoReader.contentHandler = {
    startDocument: function() {
      algoritmo = null;
      codifica = null;
      tipoImpronta = null;
      htmlDoc = "";
      htmlDoc += "<html>\n";
      htmlDoc += "<head>\n";
      htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n";
      htmlDoc += "<meta charset=\"utf-8\" />\n";
      htmlDoc += "<style type=\"text/css\">\n";
      htmlDoc += "<!--\n";
      htmlDoc += ".desc {font-size:14px;font-weight:bold;}\n";
      htmlDoc += ".value {font-size:14px;font-weight:normal;}\n";
      htmlDoc += ".valuec {font-size:14px;font-weight:normal;text-transform:capitalize;}\n";
      htmlDoc += ".redline {height:2px;background:#E52B50;padding:0px;}\n";
      htmlDoc += ".blueline {height:2px;background:#6495ED;padding:0px;}\n";
      htmlDoc += ".maintable {background:#fff;margin-left:auto;margin-right:auto;border-color:#000000;border-style:solid;border-width:2px 2px;padding:5px;}\n";
      htmlDoc += "-->\n";
      htmlDoc += "</style>\n";
      htmlDoc += "</head>\n";
      htmlDoc += "<body>\n";

      df = 0;
      hf = 0;
      dv = "";
      hv = "";
    },
    endDocument: function() {
      htmlDoc += "</body>\n";
      htmlDoc += "</html>\n";
    },
    startElement: function(uri, localName, qName, attributes) {
      attrs = new Array();
      for(var i=0; i<attributes.length; i++) {
        attrs[attributes.getQName(i)]=attributes.getValue(i);
      }
      qName = qName.toLowerCase();
      if(qName=="esitoatto"){
        htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
      }
      if(qName=="idmsgmitt"){
        htmlDoc += "<tr><td class=\"desc\">Oggetto del messaggio originale: </td><td class=\"value\">";
      }
      if(qName=="idmsgpda"){
        htmlDoc += "<tr><td class=\"redline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="codicepda"){
        htmlDoc += "<tr><td class=\"desc\">Codice PDA: </td><td class=\"value\">";
      }
      if(qName=="anno"){
        htmlDoc += "<tr><td class=\"desc\">Anno: </td><td class=\"value\">";
      }
      if(qName=="idmsg"){
        htmlDoc += "<tr><td class=\"desc\">ID del messaggio originale: </td><td class=\"value\">";
      }
      if(qName=="datiesito"){
        htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="impronta"){
        algoritmo = attrs["algoritmo"];
        codifica = attrs["codifica"];
        tipoImpronta = attrs["tipoImpronta"];
        htmlDoc += "<tr><td class=\"desc\">Impronta: </td><td class=\"value\">";
      }
      if(qName=="numeroruolo"){
        htmlDoc += "<tr><td class=\"desc\">Numero Ruolo: </td><td class=\"value\">";
      }
      if(qName=="codiceesito"){
        htmlDoc += "<tr><td class=\"desc\">Codice Esito: </td><td class=\"value\">";
      }
      if(qName=="descrizioneesito"){
        htmlDoc += "<tr><td class=\"desc\">Descrizione Esito: </td><td class=\"value\">";
      }
      if(qName=="data"){
        htmlDoc += "<tr><td class=\"desc\">Data: </td><td class=\"value\">";
      }
      if(qName=="ora"){
        htmlDoc += "<tr><td class=\"desc\">Ora: </td><td class=\"value\">";
        zone = attrs["zoneDesignator"];
      }
    },
    endElement: function(uri, localName, qName) {
      qName = qName.toLowerCase();
      if(qName=="esitoatto"){
        htmlDoc += "</table>";
      }
      if(qName=="idmsgmitt"||qName=="codicepda"||qName=="anno"||qName=="idmsg"){
        htmlDoc += "</td></tr>";
      }
      if(qName=="numeroruolo"||qName=="codiceesito"||qName=="descrizioneesito"||qName=="data"){
        htmlDoc += "</td></tr>";
      }
      if(qName=="idmsgpda"){
        htmlDoc += "<tr><td class=\"redline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="datiesito"){
        htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="impronta"){
        htmlDoc += " ("+algoritmo+","+codifica+","+tipoImpronta+")</td></tr>";
      }
      if(qName=="ora"){
        htmlDoc += " (GMT"+zone+")</td></tr>";
      }
    },
    characters: function(value) {
      //if(value=="<")value = "&lt;"
      //if(value==">")value = "&gt;"
      htmlDoc += ThunderPecUtility.escapeHtmlEntities(value);
      if(df==1)dv += ThunderPecUtility.escapeHtmlEntities(value);
      if(hf==1)hv += ThunderPecUtility.escapeHtmlEntities(value);
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
    if("arguments" in window && window.arguments.length > 0) {
      xmlstring = window.arguments[0].xml;
      tmpDir = window.arguments[0].dir;
      which = window.arguments[0].which;
    }
    xmlDoc = xmlstring;
    currentView = "HTML";
    if(which=="daticert")this.viewHTML();
    if(which=="esitoatto")this.viewEsitoHTML();
    if(which=="eccezione")this.viewEccezioneHTML();
    if(which=="fattura")this.viewFatturaHTML();
  }

  pub.original = function(){
    if(currentView=="XML") {
      if(which=="daticert")this.viewHTML();
      if(which=="esitoatto")this.viewEsitoHTML();
      if(which=="eccezione")this.viewEccezioneHTML();
      if(which=="fattura")this.viewFatturaHTML();
      currentView = "HTML";
    } else {
      this.viewXML();
      currentView = "XML";
   
    }
  }

  pub.ok = function(){
    window.close();
  }

  pub.print = function(){
    var receipt = document.getElementById("tpecReceiptViewer");
    receipt.contentWindow.print();
  }

  pub.viewHTML = function() {
    xmlReader.parseFromString(xmlDoc, "text/xml");
    var filename = "xml.html";
    var xmlfile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    xmlfile.initWithPath(tmpDir);
    xmlfile.append(filename);
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                             createInstance(Components.interfaces.nsIFileOutputStream);
    //foStream.init(xmlfile, 0x02 | 0x08 | 0x20, 0600, 0); 
    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600", 8), 0);       //ver 1.5.2
    foStream.write(htmlDoc, htmlDoc.length);
    foStream.close();
    var ios = Components.classes["@mozilla.org/network/io-service;1"].
                getService(Components.interfaces.nsIIOService);
    var url = ios.newFileURI(xmlfile);
    
    document.getElementById("tpecReceiptViewer").setAttribute('src', url.spec);
    }

  pub.viewFatturaHTML = function() {
    htmlDoc = tpecFatturaXML.parseFromString(xmlDoc);
    var filename = "xml.html";
    var xmlfile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    xmlfile.initWithPath(tmpDir);
    xmlfile.append(filename);
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                             createInstance(Components.interfaces.nsIFileOutputStream);
    //foStream.init(xmlfile, 0x02 | 0x08 | 0x20, 0600, 0); 
    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600", 8), 0);       //ver 1.5.2
    foStream.write(htmlDoc, htmlDoc.length);
    foStream.close();
    var ios = Components.classes["@mozilla.org/network/io-service;1"].
                getService(Components.interfaces.nsIIOService);
    var url = ios.newFileURI(xmlfile);
    
    document.getElementById("tpecReceiptViewer").setAttribute('src', url.spec);
    }

  pub.viewEsitoHTML = function() {
    esitoReader.parseFromString(xmlDoc, "text/xml");
    var filename = "xml.html";
    var xmlfile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    xmlfile.initWithPath(tmpDir);
    xmlfile.append(filename);
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                             createInstance(Components.interfaces.nsIFileOutputStream);
    //foStream.init(xmlfile, 0x02 | 0x08 | 0x20, 0600, 0); 
    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600", 8), 0);       //ver 1.5.2
    foStream.write(htmlDoc, htmlDoc.length);
    foStream.close();
    var ios = Components.classes["@mozilla.org/network/io-service;1"].
                getService(Components.interfaces.nsIIOService);
    var url = ios.newFileURI(xmlfile);
    
    document.getElementById("tpecReceiptViewer").setAttribute('src', url.spec);
    }

  pub.viewEccezioneHTML = function() {
    EccezioneXML.parse(xmlDoc);
    htmlDoc =  EccezioneXML.htmlDoc;
    var filename = "xml.html";
    var xmlfile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    xmlfile.initWithPath(tmpDir);
    xmlfile.append(filename);
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                             createInstance(Components.interfaces.nsIFileOutputStream);
    //foStream.init(xmlfile, 0x02 | 0x08 | 0x20, 0600, 0); 
    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600", 8), 0);       //ver 1.5.2
    foStream.write(htmlDoc, htmlDoc.length);
    foStream.close();
    var ios = Components.classes["@mozilla.org/network/io-service;1"].
                getService(Components.interfaces.nsIIOService);
    var url = ios.newFileURI(xmlfile);
    
    document.getElementById("tpecReceiptViewer").setAttribute('src', url.spec);
    }

  pub.viewXML = function(){
    var content = xmlDoc;
    content = content.replace(new RegExp("<","ig"),"&lt;");
    content = content.replace(new RegExp(">","ig"),"&gt;");
    content = content.replace(new RegExp("\n","ig"),"<br/>");

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
    htmlDoc += ".maintable {background:#fff;margin-left:auto;margin-right:auto;border-color:#000000;border-style:solid;border-width:2px 2px;padding:5px;}\n";
    htmlDoc += "-->\n";
    htmlDoc += "</style>\n";
    htmlDoc += "</head>\n";
    htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
    htmlDoc += "<tr><td class=\"value\">"+content+"</td></tr>\n";
    htmlDoc += "</table>";
    htmlDoc += "</body>\n";
    htmlDoc += "</html>\n";

    var filename = "original.html";
    var xmlfile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    xmlfile.initWithPath(tmpDir);
    xmlfile.append(filename);
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                             createInstance(Components.interfaces.nsIFileOutputStream);
    //foStream.init(xmlfile, 0x02 | 0x08 | 0x20, 0600, 0); 
    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600", 8), 0);       //ver 1.5.2
    foStream.write(htmlDoc, htmlDoc.length);
    foStream.close();
    var ios = Components.classes["@mozilla.org/network/io-service;1"].
                getService(Components.interfaces.nsIIOService);
    var url = ios.newFileURI(xmlfile);
    
    
    document.getElementById("tpecReceiptViewer").setAttribute('src', url.spec);
  };
  

  
  return pub;
}();
