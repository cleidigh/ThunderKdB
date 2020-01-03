if (!reminderfox)     var reminderfox = {};
if (!reminderfox.network)    reminderfox.network = {};
if (!reminderfox.network.services)    reminderfox.network.services = {};

//upload.xul, download.xul, and browser.xul(Overlay)
var gUploadService=
{
  _channel:null,
  _callback:null,
  _data:"",
  _scheme:"",
  _errorData:"",

  start:function(aStr,aURI,aType,aCallback)
  {
    if( !aStr || !aURI)
      return false;
    this._callback=aCallback;
    this._scheme=aURI.scheme;
    const ioService  = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
    const stringStream=Components.classes["@mozilla.org/io/string-input-stream;1"]
                      .createInstance(Components.interfaces.nsIStringInputStream);
    var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                              .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset =  "UTF-8";
    this._channel = ioService.newChannelFromURI( aURI )
                      .QueryInterface(Components.interfaces.nsIUploadChannel);
    // const stringStream = converter.convertToInputStream(aStr);  // Firefox 1.5+ only	

   var chunk = null;
   try {
           chunk = converter.ConvertFromUnicode(aStr);
   } catch( e ) {
          chunk = aStr;
    }
    try{
      stringStream.setData(chunk, chunk.length);
      this._channel.setUploadStream(stringStream,aType,-1);
      this._channel.asyncOpen(this, null);
      this._callback(reminderfox.string("rf.net.sending.label"),status);
      this._data=chunk;

    //  stringStream.close();  // don't call close() - https://bugzilla.mozilla.org/show_bug.cgi?id=423291
      return true;
    }catch(e){window.alert("__network__\n\n"+e);}
    return false;
  },

  cancel:function()
  {
    if(this._channel)
      this._channel.cancel(0x804b0002);
  },

  onDataAvailable: function (channel, ctxt, input, sourceOffset, count){
    const sis=Components.classes["@mozilla.org/scriptableinputstream;1"]
                      .createInstance(Components.interfaces.nsIScriptableInputStream);

    sis.init(input);
    this._errorData +=sis.read(count);
  },
  onStartRequest: function (channel, ctxt){  },
  onStopRequest: function (channel, ctxt, status)  {
    if(this._scheme != "ftp"){
      var res=0;
      try{
        res = channel.QueryInterface(Components.interfaces.nsIHttpChannel)
                       .responseStatus;
      }catch(e){}
      if(res==200||res==201 || res==204)
        status=0;
      /*
        200:OK
        201:Created
        204:No Content
        This is an uploading channel, no need to "GET" the file contents.
      */
      if(this._errorData)
        status=res;
      if(this._errorData && res==200)
        alert(this._errorData);
    }
    
    if(this._callback) {
      this._callback(reminderfox.string("rf.net.done"),status);  
      }
  }
};

var gDownloadService=
{

  _channel:null,
  streamLoader:null,
  data:null,
  length:null,

  _callback:null,
  _startTime:0,
  _endTime:0,

  start:function(aURI,aCallback)
  {
    //reminderfox.core.logMessageLevel("RmFX   gDownloadService.start " , reminderfox.consts.LOG_LEVEL_INFO);

    if( !aURI )
      return false;

    this._callback=aCallback;

    try{
      var ioService  = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
      this.streamLoader=Components.classes["@mozilla.org/network/stream-loader;1"]
                    .createInstance(Components.interfaces.nsIStreamLoader);
                 
      this._channel = ioService.newChannelFromURI( aURI );

    //reminderfox.core.logMessageLevel("RmFX   gDownloadService.start    aURI.scheme: " + aURI.scheme
    //	+ "  nsIStreamLoader.number: " + Components.interfaces.nsIStreamLoader.number, reminderfox.consts.LOG_LEVEL_INFO);


// nsIStreamLoader.number: {323bcff1-7513-4e1f-a541-1c9213c2ed1b}

      if(aURI.scheme=="http" || aURI.scheme=="https")
        this._channel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
        
        	// Required to be trunk and branch compatible.
            if (Components.interfaces.nsIStreamLoader.number ==
                "{31d37360-8e5a-11d3-93ad-00104ba0fd40}") {
            	//  FF2, seamonkey, etc
                this.streamLoader.init(this._channel, this , null);
            } else if 
                  ((Components.interfaces.nsIStreamLoader.number == "{8ea7e890-8211-11d9-8bde-f66bad1e3f3a}")
                   || (Components.interfaces.nsIStreamLoader.number == "{323bcff1-7513-4e1f-a541-1c9213c2ed1b}"))
              {
            	// FF3
                this.streamLoader.init(this );
			    this._channel.asyncOpen( this.streamLoader, null );
            } 
      this._startTime=(new Date()).getTime();
    }catch(e){ alert(e); 
    return false;}
    return true;
  },

  cancel:function()
  {
    if(this._channel)
      this._channel.cancel(0x804b0002);
  },
  
   onStreamComplete :function ( loader , ctxt , status , resultLength , result )
  {
    this.data="";
    this._endTime=(new Date()).getTime();
    if(status==0)
    {
      this.length=resultLength;
      if(typeof(result)=="string")
        this.data=result;
      else
      {
        while(result.length > (256*192) )
        {
          this.data += String.fromCharCode.apply(this,result.splice(0,256*192));
        }
        this.data += String.fromCharCode.apply(this,result);
      }
    }

    if(this._callback){
      this._callback(reminderfox.string("rf.net.done"),status);
    }
  },

  get time(){
    return this._endTime-this._startTime;
  }
};

