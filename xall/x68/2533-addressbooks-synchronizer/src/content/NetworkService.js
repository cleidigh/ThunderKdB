var { NetUtil } = ChromeUtils.import("resource://gre/modules/NetUtil.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

//see omni\modules\socket.jsm
const NS_ERROR_MODULE_NETWORK = 2152398848; //z.B. in http://lxr.mozilla.org/mozilla/source/browser/base/content/web-panels.js
const NS_BINDING_ABORTED = NS_ERROR_MODULE_NETWORK + 2; // z.B. in http://lxr.mozilla.org/mozilla/source/netwerk/base/public/nsNetError.h

//see omni\modules\services-common\rest.js

de_ggbs_abs.gUploadService=
{
  _channel:null,
  _callback:null,
  _errorData:"",

  start: function(data,URI,contenttype,callback)
  {
    if( !data || !URI)
      return -1;
//Services.console.logStringMessage('ABS: Upload: start URI='+URI);
    this._callback=callback;
    let stream=Components.classes["@mozilla.org/io/string-input-stream;1"]
                      .createInstance(Components.interfaces.nsIStringInputStream);
    try{
      this._channel=NetUtil.newChannel({uri: URI, loadUsingSystemPrincipal: true});
      stream.setData(data, data.length);  //was -1
      this._channel.QueryInterface(Components.interfaces.nsIUploadChannel);
      this._channel.setUploadStream(stream, contenttype, data.length);    //was -1
      this._channel.asyncOpen(this, null);
      this._callback("send", 0);
    } catch(e) {
      Components.utils.reportError('ABS: Remote Upload: '+e);
      return 'ABS: Remote Upload: '+e;
    }
    return 0;
  },

  cancel: function()
  {
    if (this._channel)
      this._channel.cancel(NS_BINDING_ABORTED);
  },

  onDataAvailable: function (channel, stream, off, count){
//Services.console.logStringMessage('ABS: Upload: onDataAvailable');
    this._inputStream = Cc["@mozilla.org/scriptableinputstream;1"]
                            .createInstance(Ci.nsIScriptableInputStream);
    this._inputStream.init(stream);
    this._errorData += this._inputStream.read(count);
  },
  onStartRequest: function (channel) {
//Services.console.logStringMessage('ABS: Upload: OnStartRequest');
  },
  onStopRequest: function (channel, statusCode)
  {
//Services.console.logStringMessage('ABS: Upload: OnStopRequest: status='+statusCode);
    try {
      var httpchannel=channel.QueryInterface(Components.interfaces.nsIHttpChannel);
      var res=0;
      if (!statusCode) {
        res = httpchannel.responseStatus;
//Services.console.logStringMessage('ABS: Upload: response='+res+' '+httpchannel.responseStatusText);
      }
//Services.console.logStringMessage('ABS: Upload: res='+res);
      if (res==200 || res==201 || res==204)   // 200:OK 201:Created 204:No Content
        statusCode=0;
      if (this._errorData)
        statusCode=res;
      if (this._errorData && res==200)
        Components.utils.reportError('ABS: Upload: statusCode=200 && errordata='+this._errorData+' ???');
    } catch(e) {  //is ftp
//Services.console.logStringMessage('ABS: Upload: is FTP');
    }

    if (this._callback)
      this._callback("done", statusCode);
  }
};

de_ggbs_abs.gDownloadService=
{
  _channel:null,
  _scheme:null,
  data:null,
  length:null,
  remoteLastModTime:null,

  _lastModifiedTime:null,
  _callback:null,
  _dir:null,

  start:function(URI,callback,usePost, flmt, dir)
  {
    if( !URI )
      return -1;
//Services.console.logStringMessage('ABS: Download: start: '+URI+' usePost='+usePost+' flmt='+flmt);

    this._callback=callback;
    this._lastModifiedTime=flmt;
    this._dir=dir;

    try{
      var ioService  = Services.io;
      this.streamLoader=Components.classes["@mozilla.org/network/stream-loader;1"]
                    .createInstance(Components.interfaces.nsIStreamLoader);
      this._channel=NetUtil.newChannel({uri: URI, loadUsingSystemPrincipal: true});
      this._scheme=this._channel.originalURI.scheme;
      if(this._scheme=="http" || this._scheme=="https") {
        this._channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        if (usePost) {
          this._channel.QueryInterface(Components.interfaces.nsIHttpChannel).requestMethod='POST';
        }
//this._channel.QueryInterface(Components.interfaces.nsIHttpChannel).requestMethod='HEAD';
      }
      this._channel.asyncOpen(this , null);
    } catch(e) {
      Components.utils.reportError('ABS: Remote Download(start): '+e);
      return 'ABS: Remote Download: '+e;
    }
    return 0;
  },

  cancel: function()
  {
    if (this._channel)
      this._channel.cancel(NS_BINDING_ABORTED);
  },


  onDataAvailable: function(channel, stream, offset, count) {
//Services.console.logStringMessage('ABS: Download: onDataAvailable: '+offset+' '+count);

    try {
      this._inputStream = Cc["@mozilla.org/scriptableinputstream;1"]
                            .createInstance(Ci.nsIScriptableInputStream);
      this._inputStream.init(stream);
      this.data += this._inputStream.read(count);

      if (this.length==0 && this._lastModifiedTime) { // on first data, check time
//Services.console.logStringMessage('ABS: Download: onDataAvailable: first call, check rlmt');
        var rlmt=null;
        //Data must start with: // <!-- <mdb:mork:z v="1.4"/> --> otherwise its LDIF or a HTML error page
        if (this.data.substr( 0, 19 )=='// <!-- <mdb:mork:z') {
            //extract lastModifiedDate from mork line
          var matches=this.data.match(/-->([^\r\n]*)/);
          rlmt=new Date(matches[1]);  //invalid date, if no match => rlmt<=this._lastModifiedTime is false!
//Services.console.logStringMessage('ABS: Download: onDataAvailable: got rlmt from data: '+rlmt);
          if (rlmt=='Invalid Date') rlmt=null;
        }
        if (!rlmt && (this._scheme=="http" || this._scheme=="https")) {
//Services.console.logStringMessage('ABS: Download: onDataAvailable: no rlmt from file, cheack http header');
          var httpc=this._channel.QueryInterface(Components.interfaces.nsIHttpChannel);
          if (httpc.responseStatus>=200 && httpc.responseStatus<300)
            //only available, if status is ok!
            rlmt=new Date(httpc.getResponseHeader('Last-Modified'));
//Services.console.logStringMessage('ABS: Download: onDataAvailable: got rlmt from header: '+rlmt);
            if (rlmt=='Invalid Date') rlmt=null;
        }
        if (rlmt) {  // get date from
//Services.console.logStringMessage('ABS: Download: onDataAvailable: check rlmt');
          this.remoteLastModTime=rlmt;
          if (rlmt<=this._lastModifiedTime) {
//Services.console.logStringMessage('ABS: Download: onDataAvailable: remote<file, cancel request');
            //Components.results.NS_BINDING_ABORTED ist leider undefined, daher oben definiert
            channel.cancel(NS_BINDING_ABORTED);
          } else if (!de_ggbs_abs.askOverwrite(this._dir, false)) {
//Services.console.logStringMessage('ABS: Download: onDataAvailable: asked, cancel request');
            this.remoteLastModTime=null;
            channel.cancel(NS_BINDING_ABORTED);
          }
        }
      }
      this.length+=count;
//Services.console.logStringMessage('ABS: Download: onDataAvailable: length now '+this.length);


    } catch(e) {
//TODO!?
      //if (e.result!=NS_BINDING_ABORTED) alert(e+'\noffset='+offset+' count='+count);
      Components.utils.reportError('ABS: Remote Download(onDataAvailable): '+e);

    }
  },
  onStartRequest: function(request) {
//Services.console.logStringMessage('ABS: Download: onStartRequest');
    this.length=0;
    this.data='';
  },
  onStopRequest: function(request, statusCode) {
//Services.console.logStringMessage('ABS: Download: onStopRequest '+request.status.toString(16)+' '+statusCode.toString(16));
    var httpStatusText='';
//    if (statusCode) {
//      if (statusCode!=NS_BINDING_ABORTED)
//        Services.console.logStringMessage('ABS: Download: onStopRequest: unexpected status '+statusCode.toString(16)+' data='+this.data.substr(0,256));
//    }
    if (!statusCode && (this._scheme=="http" || this._scheme=="https")) {
      var httpc=request.QueryInterface(Components.interfaces.nsIHttpChannel);
      try {
        if (httpc.responseStatus!=200) statusCode=httpc.responseStatus;
        httpStatusText=httpc.responseStatusText;
//Services.console.logStringMessage('ABS: Download: onStopRequest: HTTP Status: '+httpc.responseStatus+' '+httpc.responseStatusText);
      } catch(e) {
        /*statusCode=999;*/
        httpStatusText=e;
      }
    }
    if (this._callback)
      this._callback("done", statusCode, httpStatusText);
  }
};
