//see omni\modules\socket.jsm
const NS_ERROR_MODULE_NETWORK = 2152398848; //z.B. in http://lxr.mozilla.org/mozilla/source/browser/base/content/web-panels.js
const NS_BINDING_ABORTED = NS_ERROR_MODULE_NETWORK + 2; // z.B. in http://lxr.mozilla.org/mozilla/source/netwerk/base/public/nsNetError.h

//see omni\modules\services-common\rest.js

gUploadService=
{
  _channel:null,
  _callback:null,
  _errorData:"",

  start: function(data, URI, contenttype, callback)
  {
    if( !data || !URI)
      return -1;
//debug('start URI='+URI);
    this._callback=callback;
    let stream=Cc["@mozilla.org/io/string-input-stream;1"]
                      .createInstance(Ci.nsIStringInputStream);
    try{
      this._channel=NetUtil.newChannel({uri: URI, loadUsingSystemPrincipal: true});
      stream.setData(data, data.length);  //was -1
      this._channel.QueryInterface(Ci.nsIUploadChannel);
      this._channel.setUploadStream(stream, contenttype, data.length);    //was -1
      this._channel.asyncOpen(this, null);
      this._callback("send", 0);
    } catch(e) {
      debug('throws: '+e, e);
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
//debug('onDataAvailable');
    this._inputStream = Cc["@mozilla.org/scriptableinputstream;1"]
                            .createInstance(Ci.nsIScriptableInputStream);
    this._inputStream.init(stream);
    this._errorData += this._inputStream.read(count);
  },
  onStartRequest: function (channel) {
//debug('OnStartRequest');
  },
  onStopRequest: function (channel, statusCode)
  {
//debug('OnStopRequest: status='+statusCode);
    try {
      let httpchannel=channel.QueryInterface(Ci.nsIHttpChannel);
      let res=0;
      if (!statusCode) {
        res = httpchannel.responseStatus;
//debug('response='+res+' '+httpchannel.responseStatusText);
      }
//debug('res='+res);
      if (res==200 || res==201 || res==204)   // 200:OK 201:Created 204:No Content
        statusCode=0;
      if (this._errorData)
        statusCode=res;
      if (this._errorData && res==200)
        Components.utils.reportError('ABS: Upload: statusCode=200 && errordata='+this._errorData+' ???');
    } catch(e) {  //is ftp
//debug('is FTP');
    }

    if (this._callback)
      this._callback("done", statusCode);
  }
};

gDownloadService=
{
  _channel:null,
  _scheme:null,
  data:'',
  length:null,
  remoteLastModTime:null,

  _lastModifiedTime:null,
  _callback:null,
  _dir:null,

  start:function(URI, callback, usePost, flmt, dir)
  {
    if( !URI )
      return -1;
debug('start: usePost='+usePost+' flmt='+flmt);

    this._callback=callback;
    this._lastModifiedTime=flmt?flmt.getTime()/1000:0;	//Date() to number TODO: 0 as default?
    this._dir=dir;

    try{
      let ioService  = Services.io;
      this.streamLoader=Cc["@mozilla.org/network/stream-loader;1"]
                    .createInstance(Ci.nsIStreamLoader);
      this._channel=NetUtil.newChannel({uri: URI, loadUsingSystemPrincipal: true});
      this._scheme=this._channel.originalURI.scheme;
      if(this._scheme=="http" || this._scheme=="https") {
        this._channel.loadFlags |= Ci.nsIRequest.LOAD_BYPASS_CACHE;
        if (usePost) {
          this._channel.QueryInterface(Ci.nsIHttpChannel).requestMethod='POST';
        }
//this._channel.QueryInterface(Ci.nsIHttpChannel).requestMethod='HEAD';
      }
      this._channel.asyncOpen(this , null);
    } catch(e) {
      debug('throws: '+e, e);
      return 'ABS: '+e;
    }
    return 0;
  },

  cancel: function()
  {
    if (this._channel)
      this._channel.cancel(NS_BINDING_ABORTED);
  },


  onDataAvailable: function(channel, stream, offset, count) {
debug('onDataAvailable: '+offset+' '+count);

    try {
//      this._inputStream = Cc["@mozilla.org/scriptableinputstream;1"]
//                            .createInstance(Ci.nsIScriptableInputStream);
//      this._inputStream.init(stream);

      this.data += NetUtil.readInputStreamToString(stream, count);

      if (this.length==0 && this._lastModifiedTime) { // on first data, check time
debug('onDataAvailable: first call, check rlmt');
        let rlmt=null;
        if (this._scheme=="http" || this._scheme=="https") {
debug('onDataAvailable: check http header');
          let httpc=this._channel.QueryInterface(Ci.nsIHttpChannel);
          if (httpc.responseStatus>=200 && httpc.responseStatus<300)
            //only available, if status is ok!
            rlmt=new Date(httpc.getResponseHeader('Last-Modified'));
debug('onDataAvailable: got rlmt from header: '+rlmt);
            if (rlmt=='Invalid Date') rlmt=null;
						else rlmt=Date.parse(rlmt)/1000;
        } else {	
          let ftpc=this._channel.QueryInterface(Ci.nsIFTPChannel);
debug('onDataAvailable: ftp channel lmd='+ftpc.lastModifiedTime+' (file='+this._lastModifiedTime+')');
					rlmt=ftpc.lastModifiedTime/1000000;		//is in microSeconds!
				}
        if (rlmt) {  // got date
debug('onDataAvailable: have rlmt='+rlmt+' local mod='+this._lastModifiedTime);
          this.remoteLastModTime=rlmt;
debug('onDataAvailable: askOverwrite(7) if rlmt>local');
          if (rlmt<=this._lastModifiedTime) {
debug('onDataAvailable: remote<file, cancel request');
            //Components.results.NS_BINDING_ABORTED ist leider undefined, daher oben definiert
            channel.cancel(NS_BINDING_ABORTED);
          } else if (!askOverwrite(this._dir, false)) {
debug('onDataAvailable: asked, cancel request');
            this.remoteLastModTime=null;
            channel.cancel(NS_BINDING_ABORTED);
          }
        }
      }
      this.length+=count;
//debug('onDataAvailable: length now '+this.length);


    } catch(e) {
      if (e.result!=NS_BINDING_ABORTED)
				debug('onDataAvailable throws: '+e, e);
    }
  },
  onStartRequest: function(request) {
//debug('onStartRequest');
    this.length=0;
    this.data='';
  },
  onStopRequest: function(request, statusCode) {
//debug('onStopRequest '+request.status.toString(16)+' '+statusCode.toString(16));
    let httpStatusText='';
//    if (statusCode) {
//      if (statusCode!=NS_BINDING_ABORTED)
//        debug('onStopRequest: unexpected status '+statusCode.toString(16)+' data='+this.data.substr(0,256));
//    }
    if (!statusCode && (this._scheme=="http" || this._scheme=="https")) {
      let httpc=request.QueryInterface(Ci.nsIHttpChannel);
      try {
        if (httpc.responseStatus!=200) statusCode=httpc.responseStatus;
        httpStatusText=httpc.responseStatusText;
//debug('onStopRequest: HTTP Status: '+httpc.responseStatus+' '+httpc.responseStatusText);
      } catch(e) {
        /*statusCode=999;*/
        httpStatusText=e;
      }
    }
    if (this._callback)
      this._callback("done", statusCode, httpStatusText);
  }
};
