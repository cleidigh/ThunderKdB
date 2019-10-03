var EXPORTED_SYMBOLS = ["tpecFatturaXML","tpecXMLEntities","tpecXMLParsers","tpecXMLFile","tpecXMLDescriptor","EccezioneXML"];

var tpecXMLParsers = Array();

var tpecFatturaXML = {
  xmlReader: Components.classes["@mozilla.org/saxparser/xmlreader;1"].createInstance(Components.interfaces.nsISAXXMLReader),
  tipo: "",
  intermediariocondupliceruolo: "",
  versione: "",
  identificativosdi: "",
  nomefile: "",
  dataoraricezione: "",
  dataoraconsegna: "",
  codice:"",
  descrizione:"",
  messageid:"",
  riferimentoarchivio: { 
    identificativosdi: "", 
    nomefile:""
  },
  ra:false,
  listaerrori:[],
  le:false,
  esitocommittente: {
    versione:"", 
    identificativosdi: "", 
    riferimentofattura: {
      numerofattura:"",
      annofattura:"",
      posizionefattura:""
    },
    esito:"", 
    descrizione:"",
    messageidcommittente:""
  },
  ec: false,
  destinatario : {
    codice: "",
    descrizione: ""
  },
  de: false,
  hashfileoriginale: "",
  pecmessageid:"",
  codicedestinatario: "",
  formato: "",
  tentativiinvio: "",
  riferimentofattura: {
    numerofattura:"",
    annofattura:"",
    posizionefattura:""
  },
  esito:"", 
  messageidcommittente:"",
  scarto: "",
  signature: false,
 
  note:"",
  value: "", 
  htmlDoc: "",
  parseFromString: function(xmlDoc){
    this.tipo = "";
    this.intermediariocondupliceruolo = "";
    this.versione = "", 
    this.identificativosdi = "",
    this.nomefile = "",
    this.dataoraricezione = "",
    this.dataoraconsegna = "",
    this.codice = "",
    this.descrizione = "",
    this.messageid = "",
    this.note = "",
    this.riferimentoarchivio = { 
      identificativosdi: "",
      nomefile:""
    },  
    this.ra = false,
    this.listaerrori = [], 
    this.errore = {codice:"",descrizione:""}, 
    this.le = false,
    this.esitocommittente = {
      versione:"", 
      identificativosdi: "", 
      riferimentofattura: {
        numerofattura:"",
        annofattura:"",
        posizionefattura:""
      },
      esito:"", 
      descrizione:"",
      messageidcommittente:""
    };
    this.ec = false;
    this.destinatario = {
      codice: "",
      descrizione: ""
    };
    this.de = false;
    this.hashfileoriginale = "";
    this.pecmessageid = "";
    this.codicedestinatario = "";
    this.formato = "";
    this.tentativiinvio= "";
    this.riferimentofattura = {
      numerofattura:"",
      annofattura:"",
      posizionefattura:""
    };
    this.esito = ""; 
    this.messageidcommittente = "";
    this.scarto = "";
    this.signature = false;
    
    this.value = "";
    this.htmlDoc = "";
    this.xmlReader.contentHandler = this.contentHandler;
    this.xmlReader.parseFromString(xmlDoc, "text/xml");
    return this.htmlDoc;
  },
  ec2s:function(s){
   if(s=="EC01")return " (ACCETTAZIONE)";
   if(s=="EC02")return " (RIFIUTO)";
   return "";
  },
  sc2s:function(s){
   if(s=="EN00")return " (NOTIFICA NON CONFORME AL FORMATO)";
   if(s=="EN01")return " (NOTIFICA NON AMMISSIBILE)";
   return "";
  },
  contentHandler: {
    startDocument: function() {
      tpecFatturaXML.htmlDoc = "";
      tpecFatturaXML.htmlDoc += "<html>\n";
      tpecFatturaXML.htmlDoc += "<head>\n";
      tpecFatturaXML.htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n";
      tpecFatturaXML.htmlDoc += "<meta charset=\"utf-8\" />\n";
      tpecFatturaXML.htmlDoc += "<style type=\"text/css\">\n";
      tpecFatturaXML.htmlDoc += "<!--\n";
      tpecFatturaXML.htmlDoc += ".desc16 {font-size:18px;font-weight:bold;text-transform:capitalize;color:#0000cc;}\n";
      tpecFatturaXML.htmlDoc += ".desc {font-size:14px;font-weight:bold;}\n";
      tpecFatturaXML.htmlDoc += ".value {font-size:14px;font-weight:normal;}\n";
      tpecFatturaXML.htmlDoc += ".valuec {font-size:14px;font-weight:normal;text-transform:capitalize;}\n";
      tpecFatturaXML.htmlDoc += ".redline {height:2px;background:#E52B50;padding:0px;}\n";
      tpecFatturaXML.htmlDoc += ".blueline {height:2px;background:#6495ED;padding:0px;}\n";
      tpecFatturaXML.htmlDoc += ".maintable {background:#fff;margin-left:auto;margin-right:auto;border-color:#000000;border-style:solid;border-width:2px 2px;padding:5px;}\n";
      tpecFatturaXML.htmlDoc += "-->\n";
      tpecFatturaXML.htmlDoc += "</style>\n";
      tpecFatturaXML.htmlDoc += "</head>\n";
      tpecFatturaXML.htmlDoc += "<body>\n";
      
    },
    endDocument: function() {
      tpecFatturaXML.htmlDoc += "</body>\n";
      tpecFatturaXML.htmlDoc += "</html>\n";
    },
    startElement: function(uri, localName, qName, attributes) {
      var attrs = new Array();
      for(var i=0; i<attributes.length; i++) {
        attrs[attributes.getQName(i)]=attributes.getValue(i);
      }
      if(qName.indexOf(":RicevutaConsegna")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Ricevuta Consegna</td></tr>";
		    if(attrs["IntermediarioConDupliceRuolo"])tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Intermediario Con Duplice Ruolo: </td><td class=\"valuec\">"+attrs["IntermediarioConDupliceRuolo"]+"</td></tr>\n";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        if(attrs["IntermediarioConDupliceRuolo"])tpecFatturaXML.intermediariocondupliceruolo = attrs["IntermediarioConDupliceRuolo"];
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "RC";
      }
      if(qName.indexOf(":NotificaScarto")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Notifica Scarto</td></tr>";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "NS";
      }
      if(qName.indexOf(":NotificaMancataConsegna")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Notifica Mancata Consegna</td></tr>";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "MC";
      }
      if(qName.indexOf(":NotificaEsito")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Notifica Esito</td></tr>";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "NE";
      }
      if(qName.indexOf(":AttestazioneTrasmissioneFattura")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Attestazione Trasmissione Fattura</td></tr>";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "AT";
      }
      if(qName.indexOf(":MetadatiInvioFile")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Metadati Invio File</td></tr>";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "MT";
      }
      if(qName.indexOf(":NotificaEsitoCommittente")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Notifica Esito Committente</td></tr>";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "EC";
      }
      if(qName.indexOf(":ScartoEsitoCommittente")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Scarto Esito Committente</td></tr>";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "SE";
      }
      if(qName.indexOf(":NotificaDecorrenzaTermini")>-1){
        tpecFatturaXML.htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc16\" colspan=\"2\">Notifica Decorrenza Termini</td></tr>";
		    tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Versione: </td><td class=\"valuec\">"+attrs["versione"]+"</td></tr>\n";
        tpecFatturaXML.versione = attrs["versione"];
        tpecFatturaXML.tipo = "DT";
      }
      if(qName=="IdentificativoSdI"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Identificativo SdI: </td><td class=\"value\">";
      }
      if(qName=="NomeFile"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Nome File: </td><td class=\"value\">";
      }
      if(qName=="DataOraRicezione"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Data Ora Ricezione: </td><td class=\"value\">";
      }
      if(qName=="DataOraConsegna"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Data Ora Consegna: </td><td class=\"value\">";
      }
      //if(qName=="Destinatario"){
      //  tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\" colspan=\"2\">Destinatario</td></tr>";
      //  tpecFatturaXML.htmlDoc += "<tr><td class=\"redline\" colspan=\"2\"></td></tr>";
      //}
      if(qName=="Codice"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Codice: </td><td class=\"value\">";
      }
      if(qName=="Descrizione"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Descrizione: </td><td class=\"value\">";
      }
      if(qName=="MessageId"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">MessageId: </td><td class=\"value\">";
      }
      if(qName=="Note"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Note: </td><td class=\"value\">";
      }
      if(qName=="RiferimentoArchivio"){
        tpecFatturaXML.ra = true;
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\" colspan=\"2\">Riferimento Archivio</td></tr>";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="ListaErrori"){
        tpecFatturaXML.le = true;
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\" colspan=\"2\">Lista Errori</td></tr>";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="Errore"){
        tpecFatturaXML.errore = {codice:"",descrizione:""};
      }
      if(qName=="EsitoCommittente"){
        tpecFatturaXML.ec = true;
        tpecFatturaXML.esitocommittente.versione = attrs["versione"];
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\" colspan=\"2\">Esito Committente</td></tr>";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="RiferimentoFattura"){
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\" colspan=\"2\">Riferimento Fattura</td></tr>";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="PecMessageId"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">PEC MessageId: </td><td class=\"value\">";
      }
      if(qName=="NumeroFattura"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Numero Fattura: </td><td class=\"value\">";
      }
      if(qName=="AnnoFattura"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Anno Fattura: </td><td class=\"value\">";
      }
      if(qName=="PosizioneFattura"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Posizione Fattura: </td><td class=\"value\">";
      }
      if(qName=="Esito"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Esito: </td><td class=\"value\">";
      }
      if(qName=="MessageIdCommittente"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">MessageId Committente: </td><td class=\"value\">";
      }
      if(qName=="Destinatario"){
        tpecFatturaXML.de = true;
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\" colspan=\"2\">Destinatario</td></tr>";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="HashFileOriginale"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Hash File Originale: </td><td class=\"value\">";
      }
      if(qName=="CodiceDestinatario"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Codice Destinatario: </td><td class=\"value\">";
      }
      if(qName=="Formato"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Formato: </td><td class=\"value\">";
      }
      if(qName=="TentativiInvio"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Tentativi Invio: </td><td class=\"value\">";
      }
      if(qName=="Scarto"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.htmlDoc += "<tr><td class=\"desc\">Scarto: </td><td class=\"value\">";
      }
      if(qName=="ds:Signature"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.signature = true;
      }
    },
    endElement: function(uri, localName, qName) {
      if(qName.indexOf(":RicevutaConsegna")>-1||qName.indexOf(":NotificaScarto")>-1||qName.indexOf(":NotificaMancataConsegna")>-1||qName.indexOf(":NotificaEsito")>-1){
        tpecFatturaXML.htmlDoc += "</table>";
      }
      if(qName.indexOf(":AttestazioneTrasmissioneFattura")>-1||qName.indexOf(":MetadatiInvioFile")>-1||qName.indexOf(":NotificaEsitoCommittente")>-1||qName.indexOf(":ScartoEsitoCommittente")>-1){
        tpecFatturaXML.htmlDoc += "</table>";
      }
      if(qName.indexOf(":NotificaDecorrenzaTermini")>-1){
        tpecFatturaXML.htmlDoc += "</table>";
      }
      if(qName=="IdentificativoSdI"){
        if(tpecFatturaXML.ra){
          tpecFatturaXML.riferimentoarchivio.identificativosdi = tpecFatturaXML.value;
        } else if(tpecFatturaXML.ec){
          tpecFatturaXML.esitocommittente.identificativosdi = tpecFatturaXML.value;
        } else{
          tpecFatturaXML.identificativosdi = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="NomeFile"){
        if(tpecFatturaXML.ra){
          tpecFatturaXML.riferimentoarchivio.nomefile = tpecFatturaXML.value;
        } else {
          tpecFatturaXML.nomefile = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="DataOraRicezione"){
        tpecFatturaXML.dataoraricezione = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="DataOraConsegna"){
        tpecFatturaXML.dataoraconsegna = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      //if(qName=="Destinatario"){
      //  tpecFatturaXML.htmlDoc += "<tr><td class=\"redline\" colspan=\"2\"></td></tr>";
      //}
      if(qName=="Codice"){
        if(tpecFatturaXML.le){
          tpecFatturaXML.errore.codice = tpecFatturaXML.value;
        } else if(tpecFatturaXML.de){
          tpecFatturaXML.destinatario.codice = tpecFatturaXML.value;
        } else{
          tpecFatturaXML.codice = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="Descrizione"){
        if(tpecFatturaXML.le){
          tpecFatturaXML.errore.descrizione = tpecFatturaXML.value;
        } else if(tpecFatturaXML.ec){
          tpecFatturaXML.esitocommittente.descrizione = tpecFatturaXML.value;
        } else if(tpecFatturaXML.de){
          tpecFatturaXML.destinatario.descrizione = tpecFatturaXML.value;
        } else {
          tpecFatturaXML.descrizione = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="MessageId"){
        tpecFatturaXML.messageid = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="Note"){
        tpecFatturaXML.note = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="RiferimentoArchivio"){
        tpecFatturaXML.ra = false;
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="ListaErrori"){
        tpecFatturaXML.le = false;
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="Errore"){
        tpecFatturaXML.listaerrori.push(tpecFatturaXML.errore);
      }
      if(qName=="EsitoCommittente"){
        tpecFatturaXML.ec = false;
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="RiferimentoFattura"){
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="NumeroFattura"){
        if(tpecFatturaXML.ec){
          tpecFatturaXML.esitocommittente.riferimentofattura.numerofattura = tpecFatturaXML.value;
        } else {
          tpecFatturaXML.riferimentofattura.numerofattura = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="AnnoFattura"){
        if(tpecFatturaXML.ec){
          tpecFatturaXML.esitocommittente.riferimentofattura.annofattura = tpecFatturaXML.value;
        } else {
          tpecFatturaXML.riferimentofattura.annofattura = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += "</td></tr>";
     }
      if(qName=="PosizioneFattura"){
        if(tpecFatturaXML.ec){
          tpecFatturaXML.esitocommittente.riferimentofattura.posizionefattura = tpecFatturaXML.value;
        } else {
          tpecFatturaXML.riferimentofattura.posizionefattura = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="Esito"){
        if(tpecFatturaXML.ec){
          tpecFatturaXML.esitocommittente.esito = tpecFatturaXML.value;
        } else {
          tpecFatturaXML.esito = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += tpecFatturaXML.ec2s(tpecFatturaXML.value)+"</td></tr>";
      }
      if(qName=="MessageIdCommittente"){
        if(tpecFatturaXML.ec){
          tpecFatturaXML.esitocommittente.messageidcommittente = tpecFatturaXML.value;
        } else {
          tpecFatturaXML.messageidcommittente = tpecFatturaXML.value;
        }
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="PecMessageId"){
        tpecFatturaXML.pecmessageid = tpecFatturaXML.value;
        tpecFatturaXML.pecmessageid = tpecFatturaXML.pecmessageid.replace("&lt;","").replace("&gt;","");
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="Destinatario"){
        tpecFatturaXML.de = false;
        tpecFatturaXML.htmlDoc += "<tr><td class=\"blueline\" colspan=\"2\"></td></tr>";
      }
      if(qName=="HashFileOriginale"){
        tpecFatturaXML.hashfileoriginale = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="CodiceDestinatario"){
        tpecFatturaXML.codicedestinatario = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="Formato"){
        tpecFatturaXML.formato = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="TentativiInvio"){
        tpecFatturaXML.tentativiinvio = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += "</td></tr>";
      }
      if(qName=="Scarto"){
        tpecFatturaXML.scarto = tpecFatturaXML.value;
        tpecFatturaXML.htmlDoc += tpecFatturaXML.sc2s(tpecFatturaXML.value)+"</td></tr>";
      }
      if(qName=="ds:Signature"){
        tpecFatturaXML.value = "";
        tpecFatturaXML.signature = false;
      }

    },
    characters: function(value) {
      if(!tpecFatturaXML.signature)tpecFatturaXML.htmlDoc += tpecXMLEntities.escapeHtmlEntities(value);
      tpecFatturaXML.value += tpecXMLEntities.escapeHtmlEntities(value);
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
  
}

var tpecXMLEntities = {
  escapeHtmlEntities: function (text) {
    return text.replace(/[\u00A0-\u2666<>\&]/g, function(c) {
        return '&' + (tpecXMLEntities.entityTable[c.charCodeAt(0)] || '#'+c.charCodeAt(0)) + ';';
    });
  },
  entityTable: {
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
    }

}


function tpecXMLDescriptor() {
  this.name = "";
  this.begin = "" ;
  this.end = "";
  this.value = "";
  this.saveValue = false;
  this.attributes = new Array();
  this.reset = function() {
    this.value = "";
    this.attributes.length = 0;
  }
} 

function tpecXMLFile(family,filename) {
  this.xmlReader = Components.classes["@mozilla.org/saxparser/xmlreader;1"].createInstance(Components.interfaces.nsISAXXMLReader);
  this.family = family;
  this.filename = filename;
  this.keyword = new Array();
  this.hmtlDoc = "";
  this._save = false;
  this.parse = function(str) {
    for (var key in this.keyword) {
        this.keyword[key].reset();
    }    
    this.contentHandler._parent = this;
    this.xmlReader.contentHandler = this.contentHandler;
    this.xmlReader.parseFromString(str, "text/xml");
  };
  this.contentHandler = {
    _parent: null,
    _save: false,
    _value: "",
    _skip:false,
    startDocument: function() {
      this._parent.htmlDoc = "";
      this._parent.htmlDoc += "<html>\n";
      this._parent.htmlDoc += "<head>\n";
      this._parent.htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n";
      this._parent.htmlDoc += "<meta charset=\"utf-8\" />\n";
      this._parent.htmlDoc += "<style type=\"text/css\">\n";
      this._parent.htmlDoc += "<!--\n";
      this._parent.htmlDoc += ".desc16 {font-size:18px;font-weight:bold;text-transform:capitalize;color:#0000cc;}\n";
      this._parent.htmlDoc += ".desc {font-size:14px;font-weight:bold;}\n";
      this._parent.htmlDoc += ".value {font-size:14px;font-weight:normal;}\n";
      this._parent.htmlDoc += ".valuec {font-size:14px;font-weight:normal;text-transform:capitalize;}\n";
      this._parent.htmlDoc += ".redline {height:2px;background:#E52B50;padding:0px;}\n";
      this._parent.htmlDoc += ".blueline {height:2px;background:#6495ED;padding:0px;}\n";
      this._parent.htmlDoc += ".maintable {background:#fff;margin-left:auto;margin-right:auto;border-color:#000000;border-style:solid;border-width:2px 2px;padding:5px;}\n";
      this._parent.htmlDoc += "-->\n";
      this._parent.htmlDoc += "</style>\n";
      this._parent.htmlDoc += "</head>\n";
      this._parent.htmlDoc += "<body>\n";      
    },
    endDocument: function() {
      this._parent.htmlDoc += "</body>\n";
      this._parent.htmlDoc += "</html>\n";
    },
    startElement: function(uri, localName, qName, attributes) {
      var element = this._parent.keyword[qName.toLowerCase()];
      if(element!=null){
        for(var i=0; i<attributes.length; i++) {
          element.attributes[attributes.getQName(i)]=attributes.getValue(i);
        }
        this._parent.htmlDoc += element.begin;
        if(element.saveValue){
          this._save = true; 
          this._value = ""
        }
      }
      
      
    },
    endElement: function(uri, localName, qName) {
      var element = this._parent.keyword[qName.toLowerCase()];
      if(element!=null){
        this._parent.htmlDoc += element.end;
        if(element.saveValue){
          this._save = false;
          element.value = this._value;
          } 
        }
    },
    characters: function(value) {
      if(!this._skip){
        this._parent.htmlDoc += tpecXMLEntities.escapeHtmlEntities(value);
        this._value += tpecXMLEntities.escapeHtmlEntities(value); 
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

} 


var elementXML = null;
var EccezioneXML = new tpecXMLFile("PCT","Eccezione.xml");

tpecXMLParsers[EccezioneXML.filename.toLowerCase()] = EccezioneXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "Eccezione";
elementXML.begin = "<table class=\"maintable\" width=\"100%\">\n";
elementXML.end = "</table>\n";
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "IdMsgSMTP";
elementXML.begin = "<tr><td class=\"desc\">ID del messaggio inviato: </td><td class=\"value\">";
elementXML.end = "</td></tr>\n";
elementXML.saveValue = true;
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "IdMsgPdA";
elementXML.begin = "<tr><td class=\"redline\" colspan=\"2\"></td></tr>\n";
elementXML.end = "</td></tr>\n";
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "CodicePdA";
elementXML.begin = "<tr><td class=\"desc\">Codice PDA: </td><td class=\"value\">";
elementXML.end = "</td></tr>\n";
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "Anno";
elementXML.begin = "<tr><td class=\"desc\">Anno: </td><td class=\"value\">";
elementXML.end = "</td></tr>\n";
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "IdMsg";
elementXML.begin = "<tr><td class=\"desc\">Id Messaggio: </td><td class=\"value\">";
elementXML.end = "</td></tr>\n";
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "DatiEccezione";
elementXML.begin = "<tr><td class=\"redline\" colspan=\"2\"></td></tr>\n";
elementXML.end = "</td></tr>\n";
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "CodiceEccezione";
elementXML.begin = "<tr><td class=\"desc\">Codice Eccezione: </td><td class=\"value\">";
elementXML.end = "</td></tr>\n";
elementXML.saveValue = true;
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;

elementXML = new tpecXMLDescriptor();
elementXML.name = "DescrizioneEccezione";
elementXML.begin = "<tr><td class=\"desc\">Descrizione Eccezione: </td><td class=\"value\">";
elementXML.end = "</td></tr>\n";
elementXML.saveValue = true;
EccezioneXML.keyword[elementXML.name.toLowerCase()] = elementXML;
