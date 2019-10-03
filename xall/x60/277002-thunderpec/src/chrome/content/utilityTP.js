
var ThunderPecUtility = {

  tmp:"",
  savedFile:"",
  p7mFile:"",
  content:"",
  message:"",
  xmlcontent:"",
  txtcontent:"",
  checkpec:false,
  pecheaders: ["X-Riferimento-Message-ID","X-Ricevuta","X-VerificaSicurezza","X-Trasporto","X-TipoRicevuta"],
  hasXML: false,
  hasP7M: false,
  internalP7M: false,
  hasP7MBug: false,
  p7mStatus: false,
  is60: false,
	_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  
  jsdump: function(str){
    if(tpec_org.xtc.tp.getDebug()){
      Components.classes['@mozilla.org/consoleservice;1']
                .getService(Components.interfaces.nsIConsoleService)
                .logStringMessage("ThunderPEC["+Date.now()+"]: "+str);
                }
  },

  mimeCallback: function(msgHdr,mimePart) {
    ThunderPecUtility.internalP7M = false;
    var attachments = mimePart.allAttachments;
    for (var i=0;i<attachments.length;i++) {
      if(attachments[i].contentType == "application/pkcs7-mime" || attachments[i].contentType == "application/x-pkcs7-mime"){
        ThunderPecUtility.internalP7M = true;
        ThunderPecUtility.jsdump("OK: p7m identified by internal parser");
      }
    }
  },

  check60:function(){
    var info = Components.classes["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    ThunderPecUtility.jsdump("versione 60 "+info.version);

    if(versionChecker.compare(info.version, "60.0") < 0) {
      ThunderPecUtility.is60 = false;
    } else {
      ThunderPecUtility.is60 = true;
    }
  },
  checkXML:function(t){

    ThunderPecUtility.getXML(t);
    return ThunderPecUtility.hasXML;
    },
  check:function(t){
    var content = "";
    var cnt = "";
    var URL = null;
    var loops = 0;
    
    ThunderPecUtility.checkpec = false;
    ThunderPecUtility.savedFile = null;
    ThunderPecUtility.hasXML = false;
    ThunderPecUtility.xmlcontent = null;
    ThunderPecUtility.txtcontent = null;
    ThunderPecUtility.hasP7M = false;
    ThunderPecUtility.hasP7MBug = false;
    ThunderPecUtility.p7mStatus = false;
    ThunderPecUtility.internalP7M = false;
    ThunderPecUtility.is60 = false;
    
    ThunderPecUtility.check60();
    ThunderPecUtility.p7mStatus = tpec_org.xtc.tp.getP7MStatus()=="on";
    
    var info = Components.classes["@mozilla.org/xre/app-info;1"]
           .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                                   .getService(Components.interfaces.nsIVersionComparator);
    if(versionChecker.compare(info.version, "27.0a1") < 0) {
      ThunderPecUtility.internalP7M = false;
      ThunderPecUtility.jsdump("TB Version < 27 "+info.version);
    } else {
      ThunderPecUtility.internalP7M = true;
      ThunderPecUtility.jsdump("TB Version >= 27 "+info.version);
    }
    
    if(gFolderDisplay.selectedMessageUris[0]){
      var MessageURI = gFolderDisplay.selectedMessageUris[0];
      //p7m section
      //try{
      var msgHdrP7M = messenger.messageServiceFromURI(MessageURI).messageURIToMsgHdr(MessageURI);
      ThunderPecUtility.jsdump(msgHdrP7M.getStringProperty("X-Riferimento-Message-ID"));
      //  var mimeMessageP7M = MsgHdrToMimeMessage(msgHdrP7M,null,this.mimeCallback,true);
      //} catch (ex) {
      //  ThunderPecUtility.jsdump("KO: error in MshHdrToMimeMessage");
      //}
      //p7m section
      var MsgService = messenger.messageServiceFromURI(MessageURI);
      var MsgStream =  Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
      var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
      var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
      var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
      ThunderPecUtility.jsdump("OK: START streaming message");
      ScriptInputStream.init(consumer);
      try {
        MsgService.streamMessage(MessageURI, MsgStream, msgWindow, null, false, null);
      } catch (ex) {
        ThunderPecUtility.jsdump("KO: error in StreamMessage");
      }
      ScriptInputStream.available();
      cnt = ScriptInputStream.read(65535);
      loops = 0;
      while (cnt!="") {
        content = content + cnt;
        cnt = ScriptInputStream.read(65535);
        loops++;
      }
      ScriptInputStream = null;
      ThunderPecUtility.jsdump("OK: END streaming message "+loops);
      //ThunderPecUtility.jsdump("CONTENT: "+content.length);

      var mymail = new ThunderPecParser;
      mymail.hasInternalP7M(ThunderPecUtility.internalP7M);
      mymail.setContent(content);
      mymail.processII(mymail,0,content.length,0);
      //ThunderPecUtility.jsdump("DUMP:\n"+mymail.dump());
      //P7M: verify p7m
      ThunderPecUtility.hasP7M = mymail.containsP7M;
      ThunderPecUtility.hasP7MBug =  ThunderPecUtility.hasP7M && !ThunderPecUtility.internalP7M && ThunderPecUtility.p7mStatus
      //P7M
      ThunderPecUtility.jsdump("CONTENT : "+mymail.contentType["content-type"]);
      if(mymail.contentType["content-type"].toLowerCase()=="multipart/signed"){
        for (var i=0; i<ThunderPecUtility.pecheaders.length;i++){
          if(mymail.headers[ThunderPecUtility.pecheaders[i].toLowerCase()]!=undefined){
            ThunderPecUtility.checkpec = true;
          }
        }
      }
      if(ThunderPecUtility.checkpec){  
        ThunderPecUtility.jsdump("OK: isPEC");
        }
      
      var hdr = messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = filename.replace(/>/g,"");
      ThunderPecUtility.jsdump("OK: filename "+filename);
      
      if(ThunderPecUtility.checkpec==true){
        ThunderPecUtility.jsdump("OK: postprocessing PEC message");
        var emlFilename = filename+".eml";
        var emlfile = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsIFile);
        emlfile.initWithPath(t);
        emlfile.append(emlFilename);
        ThunderPecUtility.performSave(emlfile,mymail);    
        
        //working on xml
        ThunderPecUtility.performXML(mymail);
        if(ThunderPecUtility.hasXML==true){
          var xmlFilename = filename+".xml";;
          var xmlfile = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsIFile);
          xmlfile.initWithPath(t);
          xmlfile.append(xmlFilename);
          try{
            var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                     createInstance(Components.interfaces.nsIFileOutputStream);
            foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
            //foStream.write(ThunderPecUtility.xmlcontent, ThunderPecUtility.xmlcontent.length);
            //foStream.close();
            ThunderPecUtility.jsdump("OK: using utf8 converter on XML");
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(foStream, "UTF-8", 0, 0);
            converter.writeString(ThunderPecUtility.xmlcontent);
            converter.close(); 
          } catch (ex) {
            ThunderPecUtility.jsdump("KO: error saving xml file"+ex);
          }
        }
        //working on txt
        ThunderPecUtility.performTXT(mymail);
        var txtFilename = filename+".txt";;
        var txtfile = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsIFile);
        txtfile.initWithPath(t);
        txtfile.append(txtFilename);
        try{
          var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                   createInstance(Components.interfaces.nsIFileOutputStream);
          foStream.init(txtfile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
          //foStream.write(ThunderPecUtility.txtcontent, ThunderPecUtility.txtcontent.length);
          //foStream.close();
          ThunderPecUtility.jsdump("OK: using utf8 converter on PREAMBLE");
          var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
              createInstance(Components.interfaces.nsIConverterOutputStream);
          converter.init(foStream, "UTF-8", 0, 0);
          converter.writeString(ThunderPecUtility.txtcontent);
          converter.close(); 
        } catch (ex) {
          ThunderPecUtility.jsdump("KO: error saving txt file");
        }
        

      }
      //patch p7m error and save whole email content 
      //if(ThunderPecUtility.hasP7MBug==true && ThunderPecUtility.checkpec==false){     //commented out in order to handle print of CONSEGNA with p7m
      if(ThunderPecUtility.hasP7MBug==true){
        ThunderPecUtility.jsdump("OK: postprocessing P7M message");
        var wholeFilename = filename+"-p7m.eml";;
        var wholeFile = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsIFile);
        wholeFile.initWithPath(t);
        wholeFile.append(wholeFilename);
        ThunderPecUtility.jsdump("OK: START patching message");
        content = mymail.p7mpatch(content);
        ThunderPecUtility.jsdump("OK: END patching message");
        try{
          var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                   createInstance(Components.interfaces.nsIFileOutputStream);
          foStream.init(wholeFile, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
          foStream.write(content, content.length);
          foStream.close();
          ThunderPecUtility.p7mFile = wholeFile;
        } catch (ex) {
          ThunderPecUtility.jsdump("KO: error saving p7m file");
        }
      }
      mymail.destroy();

    }
    return ThunderPecUtility.checkpec;
  },
  
  saveEML:function(t){
    var content = "";
    var cnt;
    var URL = null;
    ThunderPecUtility.jsdump("EXECUTING saveEML");
    ThunderPecUtility.savedFile = null;
    ThunderPecUtility.hasXML = false;
    if(gFolderDisplay.selectedMessageUris[0]){
      var MessageURI = gFolderDisplay.selectedMessageUris[0];
      var hdr = messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = filename.replace(/>/g,"");
      filename += ".eml";
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(!chkfile.exists()){
        var MsgService = messenger.messageServiceFromURI(MessageURI);
        var MsgStream =  Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
        var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
        var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
        var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
        ScriptInputStream.init(consumer);
        try {
          MsgService.streamMessage(MessageURI, MsgStream, msgWindow, null, false, null);
        } catch (ex) {
          //alert("error: "+ex)
        }
        ScriptInputStream.available();
        cnt = ScriptInputStream.read(65535);
        while (cnt!="") {
          content = content + cnt;
          cnt = ScriptInputStream.read(65535);
        }
        var mymail = new ThunderPecParser;
        mymail.hasInternalP7M(ThunderPecUtility.internalP7M);
        mymail.setContent(content);
        mymail.processII(mymail,0,content.length,0);
        //ThunderPecUtility.jsdump("DUMP:\n"+mymail.dump());
        //mymail.dump();
        ThunderPecUtility.performSave(chkfile,mymail);
        mymail.destroy();
      } //else {
        ThunderPecUtility.savedFile = chkfile;
      //}

      var ios = Components.classes["@mozilla.org/network/io-service;1"].
                  getService(Components.interfaces.nsIIOService);
      URL = ios.newFileURI(ThunderPecUtility.savedFile).QueryInterface(Components.interfaces.nsIURL);
      if(!ThunderPecUtility.is60){
        URL.query = "type=application/x-message-display";
      } else {
        URL = URL.mutate().setQuery("type=application/x-message-display").finalize();
      }
      //ThunderPecUtility.message = mymail;
      }
    return URL;
  },
  
  saveP7M:function(t){
    var content = "";
    var cnt;
    var URL = null;
    ThunderPecUtility.p7mFile = null;
    ThunderPecUtility.hasXML = false;
    if(gFolderDisplay.selectedMessageUris[0]){
      var MessageURI = gFolderDisplay.selectedMessageUris[0];
      var hdr = messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = filename.replace(/>/g,"");
      filename += "-p7m.eml";
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(!chkfile.exists()){
//         var MsgService = messenger.messageServiceFromURI(MessageURI);
//         var MsgStream =  Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
//         var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
//         var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
//         var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
//         ScriptInputStream.init(consumer);
//         try {
//           MsgService.streamMessage(MessageURI, MsgStream, msgWindow, null, false, null);
//         } catch (ex) {
//           //alert("error: "+ex)
//         }
//         ScriptInputStream.available();
//         cnt = ScriptInputStream.read(8192);
//         while (cnt!="") {
//           content = content + cnt;
//           cnt = ScriptInputStream.read(8192);
//         }
//         var mymail = new ThunderPecParser;
//         mymail.process(content);
//         //mymail.dump();
//         ThunderPecUtility.performSave(chkfile,mymail);
//         mymail.destroy();
      } else {
        ThunderPecUtility.p7mFile = chkfile;
      }

      var ios = Components.classes["@mozilla.org/network/io-service;1"].
                  getService(Components.interfaces.nsIIOService);
      URL = ios.newFileURI(ThunderPecUtility.p7mFile).QueryInterface(Components.interfaces.nsIURL);
      if(!ThunderPecUtility.is60){
        URL.query = "type=application/x-message-display";
      } else {
        URL = URL.mutate().setQuery("type=application/x-message-display").finalize();
      }
      //ThunderPecUtility.jsdump(chkfile);
      }
    return URL;
  },

  getXML:function(t){
    var content = "";
    var cnt = "";
    var URL = null;
    ThunderPecUtility.xmlcontent = null;
    ThunderPecUtility.hasXML = false;
    if(gFolderDisplay.selectedMessageUris[0]){
      var MessageURI = gFolderDisplay.selectedMessageUris[0];
      var hdr = messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = filename.replace(/>/g,"");
      filename += ".xml";
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(chkfile.exists()){
//         var MsgService = messenger.messageServiceFromURI(MessageURI);
//         var MsgStream =  Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
//         var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
//         var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
//         var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
//         ScriptInputStream.init(consumer);
//         try {
//           MsgService.streamMessage(MessageURI, MsgStream, msgWindow, null, false, null);
//         } catch (ex) {
//           //alert("error: "+ex)
//         }
//         ScriptInputStream.available();
//         cnt = ScriptInputStream.read(8192);
//         while (cnt!="") {
//           content = content + cnt;
//           cnt = ScriptInputStream.read(8192);
//         }
//   
//         var mymail = new ThunderPecParser;
//         mymail.process(content);
//         //mymail.dump();
//         ThunderPecUtility.performXML(mymail);
//         mymail.destroy();
        ThunderPecUtility.hasXML = true;
        ThunderPecUtility.xmlcontent = "";
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
          ThunderPecUtility.xmlcontent += str.value;
        } while (read != 0);

        cstream.close(); 
  
      } 
    }
    return ThunderPecUtility.xmlcontent;
  },

  getTxt:function(t){
    var content = "";
    var cnt = "";
    var URL = null;
    ThunderPecUtility.txtcontent = null;
    if(gFolderDisplay.selectedMessageUris[0]){
      var MessageURI = gFolderDisplay.selectedMessageUris[0];
      var hdr = messenger.msgHdrFromURI(MessageURI);
      var filename = hdr.messageId;
      filename = filename.replace(/@/g,"-");
      filename = filename.replace(/\./g,"");
      filename = filename.replace(/</g,"");
      filename = filename.replace(/>/g,"");
      filename += ".txt";
      var chkfile = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
      chkfile.initWithPath(t);
      chkfile.append(filename);
      if(chkfile.exists()){
//         var MsgService = messenger.messageServiceFromURI(MessageURI);
//         var MsgStream =  Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance();
//         var consumer = MsgStream.QueryInterface(Components.interfaces.nsIInputStream);
//         var ScriptInput = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
//         var ScriptInputStream = ScriptInput.QueryInterface(Components.interfaces.nsIScriptableInputStream);
//         ScriptInputStream.init(consumer);
//         try {
//           MsgService.streamMessage(MessageURI, MsgStream, msgWindow, null, false, null);
//         } catch (ex) {
//           //alert("error: "+ex)
//         }
//         ScriptInputStream.available();
//         cnt = ScriptInputStream.read(8192);
//         while (cnt!="") {
//           content = content + cnt;
//           cnt = ScriptInputStream.read(8192);
//         }
//   
//         var mymail = new ThunderPecParser;
//         mymail.process(content);
//         //mymail.dump();
//         ThunderPecUtility.performTXT(mymail);
//         mymail.destroy();
        ThunderPecUtility.txtcontent = "";
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
          ThunderPecUtility.txtcontent += str.value;
        } while (read != 0);
        cstream.close(); 
        
      }
    }
    return ThunderPecUtility.txtcontent;
  },


  performSave:function(f,m){
    if(m.mimeXML!=null){
      if(!ThunderPecUtility.hasXML){
        ThunderPecUtility.hasXML = true;
        }
    }
    if(m.mimeEML!=null){
      if(ThunderPecUtility.savedFile==null){
        var content = m.content.substr(m.mimeEML.sections[0][0],m.mimeEML.sections[0][1]);
        try {
          var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                                   createInstance(Components.interfaces.nsIFileOutputStream);
          foStream.init(f, 0x02 | 0x08 | 0x20, parseInt("0600",8), 0); 
          if(ThunderPecUtility.p7mStatus){
            content = m.p7mpatch(content);
          }
          foStream.write(content, content.length);
          foStream.close();
          ThunderPecUtility.savedFile = f;
          content = null;
        } catch (ex) {
          ThunderPecUtility.jsdump("KO: error saving eml file"+ex+" "+f);
        }
      }
    } 
  },

  performXML:function(m){
    if(m.mimeXML!=null){
      if(ThunderPecUtility.xmlcontent==null){
        ThunderPecUtility.hasXML = true;
        var content = m.content.substr(m.mimeXML.sections[0][0],m.mimeXML.sections[0][1]);;
        if(m.mimeXML.headers["content-transfer-encoding"]=="base64"){
          content = ThunderPecUtility.decodeB64(content);
        }
        if(m.mimeXML.headers["content-transfer-encoding"]=="quoted-printable"){
          content = ThunderPecUtility.decodeQP(content);
        }
        ThunderPecUtility.xmlcontent = content;
      }
    }  
  },

  performTXT:function(m){
    if(m.mimeTXT!=null){
      if(ThunderPecUtility.txtcontent==null){
        var content = m.content.substr(m.mimeTXT.sections[0][0],m.mimeTXT.sections[0][1]);
        if(m.mimeTXT.headers["content-transfer-encoding"]=="base64"){
          content = ThunderPecUtility.decodeB64(content);
        }
        if(m.mimeTXT.headers["content-transfer-encoding"]=="quoted-printable"){
          content = ThunderPecUtility.decodeQP(content);
        }
        ThunderPecUtility.txtcontent = content;
      }
    } 
  },

  _getEML:function(m){
    var content = "";
    if(m.contentType["content-type"]){
      if(m.contentType["content-type"].toLowerCase()=="message/rfc822"){
        content = m.sections[0];
      } else {
        var i = 0;
        for(i=0;i<m.mimeparts.length;i++){
          ThunderPecUtility._getEML(m.mimeparts[i]);
        }
      } 
    }
  },
  
  getEML:function(){
    ThunderPecUtility._getEML(ThunderPecUtility.message);
    return content;
  },

  decodeB64:function(input) {
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
 
		output = ThunderPecUtility.utf8decode(output);
 
		return output;
 
	},

  utf8decode:function(utftext) {
		var string = "";
		var i = 0;
		var c = 0;
    var c1 = 0;
    var c2 = 0;
 
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
	},
  decodeQP : function (s){
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
  },
  
  escapeHtmlEntities: function (text) {
      return text.replace(/[\u00A0-\u2666<>\&]/g, function(c) {
          return '&' + (ThunderPecUtility.entityTable[c.charCodeAt(0)] || '#'+c.charCodeAt(0)) + ';';
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



function ThunderPecParser() {
  this.headers = new Array();
  this.contentType = new Array();
  this.sections = new Array();
  this.mimeparts = new Array();
  this.p7mheaders = new Array();
  this.p7mattachments = new Array();
  this.containsP7M = false;
  this.internalP7M = false;
  
  this.content = "";
  this.mimeEML = null;
  this.mimeTXT = null;
  this.mimeXML = null;
  this.esitoXML = null;
  this.fatturaXML = null;
  this.fatturaZIP = null;
  
  this.prefTP = null;
  
  //this.crlf = String.fromCharCode(0x0d)+String.fromCharCode(0x0a);
  //this.crlfsp = String.fromCharCode(0x0d)+String.fromCharCode(0x0a)+String.fromCharCode(0x20);
  //this.crlftab = String.fromCharCode(0x0d)+String.fromCharCode(0x0a)+String.fromCharCode(0x09);
  this.crlf = String.fromCharCode(0x0a);
  this.crlfsp = String.fromCharCode(0x0a)+String.fromCharCode(0x20);
  this.crlftab = String.fromCharCode(0x0a)+String.fromCharCode(0x09);
  this.fx = new RegExp("[a-zA-Z0-9\_]*\_(RC|NS|MC|NE|MT|EC|SE|DT)\_[a-zA-Z0-9]{1,3}\.xml","g");
  this.zx = new RegExp("[a-zA-Z0-9\_]*\_(AT)\_[a-zA-Z0-9\_]{1,3}\.zip","g");
  
  this.jsdump = function(str){
    if(this.prefTP==null){
      this.prefTP = new ThunderPecPrefs();
      this.prefTP.init();
    }
    if(this.prefTP.getDebug()){
      Components.classes['@mozilla.org/consoleservice;1']
                .getService(Components.interfaces.nsIConsoleService)
                .logStringMessage("ThunderPEC["+Date.now()+"] (async): "+str);
                }
  };

  this.split = function(s,n){
    var left = "";
    var right = "";
    var ar = new Array();
    if(s.length>0){
      var p = s.indexOf(n);
      if(p>0){
        left = s.substr(0,p);
        right = s.substr(p+1);
        ar.push(left);
        ar.push(right);
        return ar;
      } 
    }
    ar.push(s);
    return ar;
  };
  
  this.hasInternalP7M = function(m){
    this.internalP7M = m;
    this.jsdump("HAS INTERNAL P7M: "+m);
  }
  
  this.view = function(){
  if(this.mimeEML != null)this.jsdump("HAS EML");
  if(this.mimeTXT != null)this.jsdump("HAS TXT");
  if(this.mimeXML != null)this.jsdump("HAS XML");
  if(this.esitoXML != null)this.jsdump("HAS ESITO");
  if(this.fatturaXML != null)this.jsdump("HAS FATTURA");
  if(this.fatturaZIP != null)this.jsdump("HAS FATTURAZIP");
 
  }
  
  this.setContent = function(m){
    this.content = m.replace(new RegExp(String.fromCharCode(0x0d),"g"),"");
    this.jsdump("CONTENT: "+this.content.length);
    //ThunderPecUtility.jsdump("CONTENT: "+this.content);
  }
  
  this.process = function(m){
    if(m.length>0){

      m = m.replace(new RegExp(String.fromCharCode(0x0d),"g"),"");

      if(!this.containsP7M){
        this.containsP7M = this.p7m(m);
      }  

      var p = m.indexOf(this.crlf+this.crlf);
      if(p>0){
        var headersString = m.substr(0,p);
        //P7M: looking for a p7m attachment
//         if(headersString.indexOf("Content-Type: application/pkcs7-mime;")>0){
//           this.p7mheaders.push(headersString);
//           if(!this.containsP7M){
//             this.containsP7M = true;
//           }
//         }  
        //P7M

        headersString = headersString.replace(new RegExp(this.crlfsp,"g")," ");
        headersString = headersString.replace(new RegExp(this.crlftab,"g")," ");
        var headers = headersString.split(this.crlf);
        var i = 0;
        var splitHeader;
        for(i=0;i<headers.length;i++){
          splitHeader = this.split(headers[i],":");
          this.headers[splitHeader[0].toLowerCase()] = splitHeader[1].replace(/^\s+|\s+$/g,"");
        }
        this.jsdump("OK: "+this.headers);
        var cTypes = this.headers["content-type"].split(";");
        var splitTypes;
        for(i=0;i<cTypes.length;i++){
          splitTypes = this.split(cTypes[i],"=");
          if(splitTypes.length==2){
            this.contentType[splitTypes[0].replace(/^\s+|\s+$/g,"")] = splitTypes[1].replace(/^\s+|\s+$/g,"");
          } else {
            this.contentType["content-type"] = splitTypes[0].replace(/^\s+|\s+$/g,"");
          }
        }
        if(this.contentType["boundary"]!=null){
          var boundary = this.contentType["boundary"];
          boundary = boundary.replace(new RegExp(String.fromCharCode(0x22),"g"),"");
          boundary = "--"+boundary;
          var pstart = 0;
          var pend = p;
          var plen = 0;
          while(pend!=-1 && pstart!=-1){
            pstart = m.indexOf(boundary,pend);
            pend = m.indexOf(boundary,pstart+boundary.length);
            plen = pend-pstart-boundary.length-this.crlf.length
            if(pend!=-1 && pstart!=-1){
              var sect = m.substr(pstart+boundary.length+this.crlf.length,plen);
              this.sections.push(sect)
              var mimepart = new ThunderPecParser();
              this.mimeparts.push(mimepart);
              mimepart.process(sect);
              //pend += boundary.length;
            }
          }
        } else {
          this.sections.push(m.substr(p+2*this.crlf.length))
        }
      }
    }
  
  };

  this.processII = function(parent,bstart,blen,level){
    //ThunderPecUtility.jsdump("PROCESS II: "+parent.content.substr(bstart,256));
    if(blen>0){


      if(!this.internalP7M && !parent.containsP7M && parent==this){
        parent.containsP7M = this.p7m(parent.content);
      }  

      var p = parent.content.indexOf(this.crlf+this.crlf,bstart);
      //ThunderPecUtility.jsdump("PROCESS II: "+p+" "+bstart+" "+blen);
      if(p>bstart && p<=(bstart+blen)){
        var headersString = parent.content.substr(bstart,p-bstart);
      
        //this.jsdump("HEADERSTRING: "+headersString);

        headersString = headersString.replace(new RegExp(this.crlfsp,"g")," ");
        headersString = headersString.replace(new RegExp(this.crlftab,"g")," ");
        //ThunderPecUtility.jsdump("OK: "+headersString);
        var headers = headersString.split(this.crlf);
        var i = 0;
        var splitHeader;
        for(i=0;i<headers.length;i++){
          splitHeader = this.split(headers[i],":");
          this.headers[splitHeader[0].toLowerCase()] = splitHeader[1].replace(/^\s+|\s+$/g,"");
        }
        var cTypes = this.headers["content-type"].split(";");
        var splitTypes;
        for(i=0;i<cTypes.length;i++){
          splitTypes = this.split(cTypes[i],"=");
          if(splitTypes.length==2){
            this.contentType[splitTypes[0].replace(/^\s+|\s+$/g,"")] = splitTypes[1].replace(/^\s+|\s+$/g,"");
          } else {
            this.contentType["content-type"] = splitTypes[0].replace(/^\s+|\s+$/g,"");
          }
        }
        if(this.contentType["content-type"].toLowerCase()=="application/xml" && level==2){
          parent.mimeXML = this;
        }
        if(this.contentType["content-type"].toLowerCase()=="text/plain" && (level==2 || level==3)){
          parent.mimeTXT = this;
        }
        if(this.contentType["content-type"].toLowerCase()=="message/rfc822" && level==2){
          parent.mimeEML = this;
        }
        if(("name" in this.contentType) && ((this.contentType["name"].toLowerCase()=="\"esitoatto.xml\"")||(this.contentType["name"].toLowerCase()=="esitoatto.xml"))){
          parent.esitoXML = this;
          this.jsdump("ESITO XML: "+level);
        }
        if(("name" in this.contentType) && ((this.contentType["name"].toLowerCase()=="\"eccezione.xml\"")||(this.contentType["name"].toLowerCase()=="eccezione.xml"))){
          parent.esitoXML = this;
          this.jsdump("ESITO XML: "+level);
        }
        if("name" in this.contentType){
          this.jsdump("ATTACHMENT: "+this.contentType["name"]);
          if(this.fx.exec(this.contentType["name"])){
            parent.fatturaXML = this;
            this.jsdump("FATTURA XML: "+level);
          }
          if(this.zx.exec(this.contentType["name"])){
            parent.fatturaZIP = this;
            this.jsdump("FATTURA ZIP: "+level);
          }
        }
        if(this.contentType["boundary"]!=null){
          var boundary = this.contentType["boundary"];
          boundary = boundary.replace(new RegExp(String.fromCharCode(0x22),"g"),"");
          boundary = "--"+boundary;
          var pstart = bstart;
          var pend = p;
          var lastbound = 0;
          var plen = 0;
          while(pend!=lastbound){
            pstart = parent.content.indexOf(boundary,pend);
            pend = parent.content.indexOf(boundary,pstart+boundary.length);
            lastbound = parent.content.indexOf(boundary+"--",pstart+boundary.length)
            plen = pend-pstart-boundary.length-this.crlf.length
            if(pend!=-1 && pstart!=-1 && pend<=(bstart+blen) && pstart<=(bstart+blen)){
              var sect = new Array(pstart+boundary.length+this.crlf.length,plen);
              this.sections.push(sect)
              var mimepart = new ThunderPecParser();
              this.mimeparts.push(mimepart);
              mimepart.hasInternalP7M(this.internalP7M);
              mimepart.processII(parent,sect[0],sect[1],level+1);
              //pend += boundary.length;
            }
          }
        } else {
          var sect = new Array(p+2*this.crlf.length,blen-(p+2*this.crlf.length)+bstart);
          this.sections.push(sect)
        }
      }
    }
  
  };
  
  this.p7mpatch = function(m){
    var originalHeader;
    var newHeader;
    for (var i=0;i<this.p7mheaders.length;i++){
      originalHeader = this.p7mheaders[i];
      newHeader = originalHeader.replace(new RegExp("Content-Type: application/pkcs7-mime","gi"),"Content-Type: application/p7m");
      newHeader = newHeader.replace(new RegExp("Content-Type: application/x-pkcs7-mime","gi"),"Content-Type: application/p7m");
      newHeader = newHeader.replace(new RegExp("Content-Type: application/octet-stream","gi"),"Content-Type: application/p7m");
      originalHeader = originalHeader.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
      this.jsdump("OK: applying patch to header: "+originalHeader);
      this.jsdump("OK: patched header: "+newHeader);
      m = m.replace(new RegExp(originalHeader,"g"),newHeader);
      originalHeader = originalHeader.replace(new RegExp(String.fromCharCode(0x0a),"g"),String.fromCharCode(0x0d)+String.fromCharCode(0x0a));
      newHeader = newHeader.replace(new RegExp(String.fromCharCode(0x0a),"g"),String.fromCharCode(0x0d)+String.fromCharCode(0x0a));
      m = m.replace(new RegExp(originalHeader,"g"),newHeader);
    }
    return m;
  }
  
  this.p7m = function(m){
    var result = false;
    var tmpB;
    var innerB;
    var pstart;
    var pend;
    var plen;
    var headers;
    var smallHeaders;
    var inside;
    
    var boundary = m.match(/boundary=.*/ig);
    if(boundary!=null){
      this.jsdump("BOUNDARY: "+boundary);
      for(var j=0;j<boundary.length  ;j++){
        tmpB = this.split(boundary[j],"=");
        innerB = "--"+tmpB[1].replace(new RegExp(String.fromCharCode(0x22),"g"),"");
        pstart = 0;
        pend = 0;
        while(pend!=-1 && pstart!=-1 ){
          pstart = m.indexOf(innerB,pend);
          pend = m.indexOf(this.crlf+this.crlf,pstart+innerB.length);
          plen = pend-pstart;
          if(pend!=-1 && pstart!=-1){
            headers = m.substr(pstart,plen);
            smallHeaders = headers.toLowerCase();
            //ThunderPecUtility.jsdump("SMALLHEADERS: "+smallHeaders);
            if(smallHeaders.indexOf("content-type: application/pkcs7-mime;")>0 || smallHeaders.indexOf("content-type: application/x-pkcs7-mime;")>0){
              inside = false;
              for(var k=0;k<this.p7mheaders.length && !inside;k++){
                inside = headers==this.p7mheaders[k];
              }
              if(!inside)this.p7mheaders.push(headers);
              result = true;
            }
            if(smallHeaders.indexOf("content-type: application/octet-stream;")>0 && smallHeaders.search("name=.*\.p7m")!=-1){
              inside = false;
              for(var k=0;k<this.p7mheaders.length && !inside;k++){
                inside = headers==this.p7mheaders[k];
              }
              if(!inside)this.p7mheaders.push(headers);
              result = true;
            }
            var pp7m = smallHeaders.search("name=.*\.p7m"); 
            if(pp7m>0){
              var fname = smallHeaders.match( /name\=.*\.p7m/gm );
              fname[0] = fname[0].substr(6);
              this.p7mattachments.push(fname[0]);
              this.jsdump("P7M: "+fname[0]);
              }

          }
        }
      }
    }
    if(result){
      this.jsdump("OK: p7m identified by tpec parser");
    } else {
      this.jsdump("OK: no p7m attachment");
    }
    return result;
  };

  
  this.dump = function(){
    var content = "";
    var i = 0;
    
    content += "-----HEADERS--------\n";
    for(var idx in this.headers){
      content += idx+"->"+this.headers[idx]+"\n";
    }
    content += "-----HEADERS--------\n";
    content += "-----CONTENT TYPE--------\n";
    for(var idx in this.contentType){
      content += idx+"->"+this.contentType[idx]+"\n";
    }
    content += "-----CONTENT TYPE--------\n";
    content += "-----SECTIONS--------\n";
    for(i=0;i<this.sections.length;i++){
      content += "-----SECTIONS("+i+")--------\n";
      content += "start: "+this.sections[i][0]+" end: "+(this.sections[i][0]+this.sections[i][1])+"\n";
    }
    content += "-----SECTIONS--------\n";
    for(i=0;i<this.mimeparts.length;i++){
      content += "-----MIMEPART("+i+")--------\n";
      content += this.mimeparts[i].dump();
    }
    content += "-----MIMEPART--------\n";
    
    return content;
    
  }
  
  this.destroy = function(){
    var i = 0;
    var j = 0;
    var mimepart = null;
    for(i=0;i<this.mimeparts.length;i++){
      mimepart = this.mimeparts[i];
      mimepart.destroy();
      for(var idx in this.headers){
        delete this.headers[idx];
      }
      for(var idx in this.contentType){
        delete this.contentType[idx];
      }
      for(j=0;j<this.sections.length;j++){
        delete this.sections[j];
      }
      for(j=0;j<this.p7mheaders.length;j++){
        delete this.p7mheaders[j];
      }
    }
  } 

}



