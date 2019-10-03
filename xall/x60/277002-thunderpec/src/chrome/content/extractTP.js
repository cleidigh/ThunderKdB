"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("chrome://thunderpec/content/globalsTP.jsm");

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.extract) tpec_org.xtc.tp.extract = {};


tpec_org.xtc.tp.extract = function(){
  function pub(){};


  var extractCount = 0;
  var extractMessages = null;
  var extractInline = false;

  var extractIDX = 0;
  var extractArray = null;
  var extractPath = null;
  var progressBar = null; 
  var messenger;
  var stringBundle;

  pub.init = function(){
    if("arguments" in window && window.arguments.length > 0) {
      extractPath = window.arguments[0].path;
      extractMessages = window.arguments[0].earray;
    }
    tpecGlobals.jsdump("extract init");
    
    extractCount = extractMessages.length;
    extractIDX = 0;
    extractArray = new Array();
    extractInline = Services.prefs.getBoolPref("mail.inline_attachments");
    Services.prefs.setBoolPref("mail.inline_attachments", true);
    
    messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
    messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
    stringBundle = document.getElementById("tpecStringBundle");

    progressBar = document.getElementById('tpecExtractProgress');
    progressBar.value = 0;
    progressBar.max = extractMessages.length;
    document.getElementById("extractOperation").value = stringBundle.getString('tpec.extract.find');
    tpec_org.xtc.tp.extract.extractSingle();
  }

  var gStreamListener = {
    QueryInterface: function(iid)  {
            if (iid.equals(Components.interfaces.nsIStreamListener) ||  
                iid.equals(Components.interfaces.nsISupports))
            return this;
            throw Components.results.NS_NOINTERFACE;
            return 0;
    },
    stream: null,
    count:0,
    init:function(){this.stream = null;},
    onStartRequest: function (aRequest, aContext) {
      this.count=0;
      tpecGlobals.jsdump("EXTRACT: onStartRequest ");
      },
    onStopRequest: function (aRequest, aContext, aStatusCode) {
      tpecGlobals.jsdump("EXTRACT: onStopRequest "+aRequest+" "+aContext+" "+aStatusCode+" "+this.count); 
      extractIDX++;
      if(extractIDX<extractCount){
        progressBar.value = extractIDX;
        tpec_org.xtc.tp.extract.extractSingle();
      } else {
        Services.prefs.setBoolPref("mail.inline_attachments", extractInline);
        if(extractArray.length>0){
          extractIDX = 0;
          progressBar.value = 0;
          progressBar.max = extractArray.length;
          document.getElementById("extractOperation").value = stringBundle.getString('tpec.extract.save');
          tpec_org.xtc.tp.extract.extract();
        } else {
          tpecGlobals.jsdump("no attachments");
          window.close();
        }
      }
    
    },
    onDataAvailable: function (aRequest,aContext,aInputStream,aOffset,aCount) {
      if (this.stream === null) {
        this.stream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
        this.stream.init(aInputStream);
      }
      if(aInputStream==null || this.stream==null) tpecGlobals.jsdump("EXTRACT: NULL ");
      this.count += aCount;
    }
  };
  var gMessageHeaderSink = {
    attachmentCount: 0,
    mSaveHdr: null,
    handleAttachment: function(aContentType, aUrl, aDisplayName, aUri,
                               aIsExternalAttachment) {
      if(aDisplayName!="daticert.xml" && aDisplayName!="postacert.eml"){
        extractArray.push([aDisplayName,aUrl,aContentType,extractMessages[extractIDX]]);
        tpecGlobals.jsdump("EXTRACT: handleAttachment "+aDisplayName);      
      }
      this.attachmentCount++;
    },
    // stub functions from nsIMsgHeaderSink
    addAttachmentField: function(aName, aValue) {},
    onStartHeaders: function() {},
    onEndHeaders: function() {},
    processHeaders: function(aHeaderNames, aHeaderValues, dontCollectAddrs) {},
    onEndAllAttachments: function() {
      tpecGlobals.jsdump("EXTRACT: onEndAllAttachments "+extractIDX+" "+extractCount);      
    },
    onEndMsgDownload: function() {
      tpecGlobals.jsdump("EXTRACT: onEndMsgDownload ");      
    },
    onEndMsgHeaders: function(aUrl) {},
    onMsgHasRemoteContent: function(aMsgHdr, aContentURI) {},
    securityInfo: null,
    mDummyMsgHeader: null,
    properties: null,
    resetProperties: function () {
      this.attachmentCount = 0;
    },
  };
  
  pub.extractSingle = function(){
    var aMsg;
    var uri; 
    
    aMsg =  extractMessages[extractIDX];
    uri = aMsg.folder.getUriForMsg(aMsg);
    try {
      var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"].createInstance(Components.interfaces.nsIMsgWindow);
      msgWindow.msgHeaderSink = gMessageHeaderSink;      
      let msgService = messenger.messageServiceFromURI(uri);
      gStreamListener.init();
      let streamURI = msgService.streamMessage(uri,gStreamListener,msgWindow, null, true, "",null);
    } catch (e) {
      tpecGlobals.jsdump("error in extractSingle : "+e);
      extractIDX++;
      if(extractIDX<extractCount){
        progressBar.value = extractIDX;
        tpec_org.xtc.tp.extract.extractSingle();
      } else {
        Services.prefs.setBoolPref("mail.inline_attachments", extractInline);
        if(extractArray.length>0){
          extractIDX = 0;
          progressBar.value = 0;
          progressBar.max = extractArray.length;
          document.getElementById("extractOperation").value = stringBundle.getString('tpec.extract.save');
          tpec_org.xtc.tp.extract.extract();
        } else {
          tpecGlobals.jsdump("no attachments");
          window.close();
        }
      }

    }
    
  };

  pub.extract = function(){
    var attach = extractArray[extractIDX];
    var filename;
    var tmpfile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
    
    filename = ("000" + extractIDX).slice(-4)+" "+attach[0];
    tpecGlobals.jsdump("saveSingle : "+filename+" "+attach[1]+" "+attach[3].folder.getUriForMsg(attach[3])+" "+attach[2]);
    tmpfile.initWithPath(extractPath);
    tmpfile.append(filename);
    tmpfile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, parseInt("0666",8));
    messenger.saveAttachmentToFile(tmpfile,attach[1],attach[3].folder.getUriForMsg(attach[3]),attach[2],{
      OnStartRunningUrl : function (url) {},
      OnStopRunningUrl : function (url,code) {
         extractIDX++;
         progressBar.value = extractIDX;
         if(extractIDX<extractArray.length){
            tpec_org.xtc.tp.extract.extract();
         } else {
            window.close();
         }
      }
    });
  }
  return pub;
}();
