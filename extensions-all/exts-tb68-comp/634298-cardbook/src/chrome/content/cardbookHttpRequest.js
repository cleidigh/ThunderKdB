/*
 * This file is part of CardBook, contributed by John Bieling.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. 
 *
 * Limitations:
 * - no real event support (cannot add eventlisteners)
 * - send only supports string body/data
 * - onprogress not supported
 * - readyState 2 & 3 not supported
 */
 
 "use strict";

 var CardbookHttpRequest = class {
	constructor() {
		// a private object to store xhr related properties
		this._xhr = {};
		this._xhr.useStreamLoader = true;
		this._xhr.headers = {};
		this._xhr.readyState = 0;
		this._xhr.responseStatus = null;
		this._xhr.responseStatusText = null;
		this._xhr.responseText = null;
		this._xhr.httpchannel = null;
		this._xhr.mozBackgroundRequest = false;		
		this._xhr.method = null;
		this._xhr.uri = null;
		this._xhr.async = true;
		this._xhr.user = "";
		this._xhr.password = "";
		this._xhr.timeout = 0;
		this._xhr.timer = Components.classes["@mozilla.org/timer;1"].createInstance(
                      Components.interfaces.nsITimer);

		this.onreadystatechange = function () {};
		this.onerror = function () {};
		this.onload = function () {};
		this.ontimeout = function () {};
		
		var self = this;

		this.notificationCallbacks = {
			// nsIInterfaceRequestor
			getInterface : function(aIID) {
				if (aIID.equals(Components.interfaces.nsIAuthPrompt2)) {
					// implement a custom nsIAuthPrompt2 - needed for auto authorization
				} else if (aIID.equals(Components.interfaces.nsIAuthPrompt)) {
					// implement a custom nsIAuthPrompt
				} else if (aIID.equals(Components.interfaces.nsIAuthPromptProvider)) {
					// implement a custom nsIAuthPromptProvider
				} else if (aIID.equals(Components.interfaces.nsIPrompt)) {
					// implement a custom nsIPrompt
				} else if (aIID.equals(Components.interfaces.nsIProgressEventSink)) {
					// implement a custom nsIProgressEventSink
				} else if (aIID.equals(Components.interfaces.nsIChannelEventSink)) {
					// implement a custom nsIChannelEventSink
					return self.redirect;
				}
				throw Components.results.NS_ERROR_NO_INTERFACE;
			},
		};
			
		this.redirect = {
			// nsIChannelEventSink implementation
			asyncOnChannelRedirect: function(aOldChannel, aNewChannel, aFlags, aCallback) {
				let uploadData;
				let uploadContent;
				if (aOldChannel instanceof Ci.nsIUploadChannel &&
					aOldChannel instanceof Ci.nsIHttpChannel &&
					aOldChannel.uploadStream) {
					uploadData = aOldChannel.uploadStream;
					uploadContent = aOldChannel.getRequestHeader("Content-Type");
				}

				aNewChannel.QueryInterface(Ci.nsIHttpChannel);
				aOldChannel.QueryInterface(Ci.nsIHttpChannel);
							
				function copyHeader(aHdr) {
					try {
						let hdrValue = aOldChannel.getRequestHeader(aHdr);
						if (hdrValue) {
							console.log("test Copy header <"+aHdr+":"+hdrValue+">");
							aNewChannel.setRequestHeader(aHdr, hdrValue, false);
						}
					} catch (e) {
						if (e.code != Components.results.NS_ERROR_NOT_AVAILIBLE) {
							// The header could possibly not be available, ignore that
							// case but throw otherwise
							throw e;
						}
					}
				}

				// If any other header is used, it should be added here. We might want
				// to just copy all headers over to the new channel.
				copyHeader("Prefer");
				copyHeader("Depth");
				copyHeader("Originator");
				copyHeader("Recipient");
				copyHeader("If-None-Match");
				copyHeader("If-Match");
				
				// CAUTION: Only copy Authorization headers you manually added
				// If you use the auto authorization feature of nsIHttpChannel, you must not copy the
				// header, as nsIHttpChannel will see the header and will stop being in charge for any
				// subsequent call.
				copyHeader("Authorization");
				
				self._prepHttpChannelUploadData(
					aNewChannel, 
					aOldChannel.requestMethod, 
					uploadData, 
					uploadContent);
				aCallback.onRedirectVerifyCallback(Components.results.NS_OK);
			}
		};
		
		this.listener = {
			_data: "",
			_stream: null,

			//nsIStreamListener (aUseStreamLoader = false)
			onStartRequest: function(aRequest, aContext) {
				//Services.console.logStringMessage("[onStartRequest] ");
				this._data = "";
			},
			onDataAvailable: function (aRequest, aContext, aInputStream, aOffset, aCount) {
				//Services.console.logStringMessage("[onDataAvailable] " + aCount);
				if (this._stream == null) {
					this._stream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
					this._stream.init(aInputStream);
				}
				let d = this._stream.read(aCount);
				this._data += d;
			},        
			onStopRequest: function(aRequest, aContext, aStatusCode) {
				//Services.console.logStringMessage("[onStopRequest] " + aStatusCode);
				this.processResponse(aRequest.QueryInterface(Components.interfaces.nsIHttpChannel), aContext, aStatusCode,  this._data);
			},
		


			//nsIStreamLoaderObserver (aUseStreamLoader = true)
			onStreamComplete: function(aLoader, aContext, aStatus, aResultLength, aResult) {
				let result = self._convertByteArray(aResult);  
				this.processResponse(aLoader.request.QueryInterface(Components.interfaces.nsIHttpChannel), aContext, aStatus, result);
			},
			
			processResponse: function(aChannel, aContext, aStatus, aResult) {
				self._xhr.httpchannel = aChannel;
				self._xhr.responseText = aResult;
				self._xhr.responseStatus = aStatus;
				
				try {
					self._xhr.responseStatus = aChannel.responseStatus;
				} catch (ex) {
					console.log("test Error: " + self._xhr.responseStatus);
					self.onerror();
					return;
				}
				self._xhr.responseStatusText = aChannel.responseStatusText;
				self._xhr.responseText = aResult;
				self._xhr.readyState = 4;
				console.log("test OK: " + self._xhr.responseStatus);
				self.onreadystatechange();				
				self.onload();
			}
		};
	}

	/** private **/
	
	_b64EncodeUnicode (aString) {
		return btoa(encodeURIComponent(aString).replace(/%([0-9A-F]{2})/g, function(match, p1) {
			return String.fromCharCode('0x' + p1);
		}));
	}

	// copied from lightning
	_prepHttpChannelUploadData(aHttpChannel, aMethod, aUploadData, aContentType) {
		if (aUploadData) {
			aHttpChannel.QueryInterface(Components.interfaces.nsIUploadChannel);
			let stream;
			if (aUploadData instanceof Components.interfaces.nsIInputStream) {
				// Make sure the stream is reset
				stream = aUploadData.QueryInterface(Components.interfaces.nsISeekableStream);
				stream.seek(Components.interfaces.nsISeekableStream.NS_SEEK_SET, 0);
			} else {
				// Otherwise its something that should be a string, convert it.
				let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
					.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
				converter.charset = "UTF-8";
				stream = converter.convertToInputStream(aUploadData.toString());
			}

		  // If aContentType is empty, the protocol will assume that no content headers are to be
		  // added to the uploaded stream and that any required headers are already encoded in
		  // the stream. In the case of HTTP, if this parameter is non-empty, then its value will
		  // replace any existing Content-Type header on the HTTP request. In the case of FTP and
		  // FILE, this parameter is ignored.
		  aHttpChannel.setUploadStream(stream, aContentType, -1);
		}	

		//must be set after setUploadStream
		//https://developer.mozilla.org/en-US/docs/Mozilla/Creating_sandboxed_HTTP_connections
		aHttpChannel.QueryInterface(Ci.nsIHttpChannel);
		aHttpChannel.requestMethod = aMethod;
	}
  
	/**
     * Convert a byte array to a string - copied from lightning
     *
     * @param {octet[]} aResult         The bytes to convert
     * @param {String} aCharset         The character set of the bytes, defaults to utf-8
     * @param {Boolean} aThrow          If true, the function will raise an exception on error
     * @returns {?String}                The string result, or null on error
     */
	_convertByteArray(aResult, aCharset="utf-8", aThrow) {
        try {
            return new TextDecoder(aCharset).decode(Uint8Array.from(aResult));
        } catch (e) {
            if (aThrow) {
                throw e;
            }
        }
        return null;
    }
	
	_startTimeout() {
		let rv = Components.results.NS_ERROR_NET_TIMEOUT;
		let xhr = this._xhr;
		let event = {
			notify: function(timer) {
				if (xhr.httpchannel) xhr.httpchannel.cancel(rv);
			}
		}
		this._xhr.timer.initWithCallback(
			event, 
			this._xhr.timeout, 
			Components.interfaces.nsITimer.TYPE_ONE_SHOT);
	}






	/** public **/

	abort() {
		let rv = Components.results.NS_BINDING_ABORTED;
		if (this._xhr.httpchannel) this._xhr.httpchannel.cancel(rv);
	}

	get timeout() {return this._xhr.timeout};
	set timeout(v) {this._xhr.timeout = v};
	
	setRequestHeader(header, value) {
		this._xhr.headers[header] = value;
	}

	get readyState() {return this._xhr.readyState};

	open(method, url, async = true, user = "", password = "") {
		this._xhr.method = method;
		try {
			this._xhr.uri = Services.io.newURI(url);
		} catch (e) {
			Components.utils.reportError(e);
			throw new Error("Invalid URL <"+url+">");
		}
		if (!async) throw new Error ("Sync HttpRequests not supported");
		this._xhr.async = true;
		
		this._xhr.user = user;
		this._xhr.password = password;
		this._xhr.readyState = 1;
		this.onreadystatechange();
	}

	send(data) {
		console.log("test Data: " + data);
		let channel = Services.io.newChannelFromURI(
			this._xhr.uri,
			null,
			Services.scriptSecurityManager.createCodebasePrincipal(this._xhr.uri, { /* userContextId */ }),
			null,
			Components.interfaces.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
			Components.interfaces.nsIContentPolicy.TYPE_OTHER);

		this._xhr.httpchannel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
		this._xhr.httpchannel.loadFlags |= Components.interfaces.nsIRequest.LOAD_BYPASS_CACHE;
		this._xhr.httpchannel.notificationCallbacks = this.notificationCallbacks;
		
		// Set default content type.
		if (!this._xhr.headers.hasOwnProperty("Content-Type")) {
		  this._xhr.headers["Content-Type"] = "application/xml; charset=utf-8";
		}
		
		// Set default accept value.
		if (!this._xhr.headers.hasOwnProperty("Accept")) {
		  this._xhr.headers["Accept"] = "*/*";
		}

		// if user and password have been specified, add Authorization header
		if (this._xhr.user && this._xhr.password) {
			console.log("test Adding BASIC AUTH: " + this._xhr.user + ':' + this._xhr.password);
			this._xhr.headers["Authorization"] = "Basic " + this._b64EncodeUnicode(this._xhr.user + ':' + this._xhr.password);
		}
		
		for (let header in this._xhr.headers) {
		  if (this._xhr.headers.hasOwnProperty(header)) {
			console.log("test Sending header <"+header+":"+this._xhr.headers[header]+">");
			this._xhr.httpchannel.setRequestHeader(header, this._xhr.headers[header], false);
		  }
		}


		
		// Will overwrite the Content-Type, so it must be called after the headers have been set.
		this._prepHttpChannelUploadData(this._xhr.httpchannel, this._xhr.method, data, this._xhr.headers["Content-Type"]);

		if (this._xhr.useStreamLoader) {
			let loader =  Components.classes["@mozilla.org/network/stream-loader;1"].createInstance(Components.interfaces.nsIStreamLoader);
			loader.init(this.listener);
			this.listener = loader;
		}        

		this._startTimeout();
		this._xhr.httpchannel.asyncOpen(this.listener, this._xhr.httpchannel);
	}

	get responseURL() {return this._xhr.httpchannel.URI.spec; }
	get responseText() {return this._xhr.responseText};
	get status() {return this._xhr.responseStatus};
	get statusText() {return this._xhr.responseStatusText};
	get channel() {return this._xhr.httpchannel};
	
	getResponseHeader(header) {
		try {
			return this._xhr.httpchannel.getResponseHeader(header);
		} catch (e) {
			if (e.code != Components.results.NS_ERROR_NOT_AVAILIBLE) {
				// The header could possibly not be available, ignore that
				// case but throw otherwise
				throw e;
			}			
		}
		return null;
	}
	
	
	
	

	/** todo **/

	get mozBackgroundRequest() {return this._xhr.mozBackgroundRequest};
	set mozBackgroundRequest(v) {this._xhr.mozBackgroundRequest = v};

	overrideMimeType(mime) {
		// silent ignore, no idea what this does
	}
	
	//redirects
	//handle Content-Length

	/* not used by cardbook */
	
	get responseXML() {throw new Error("responseXML not implemented");};

	get response() {throw new Error("response not implemented");};
	set response(v) {throw new Error("response not implemented");};

	get responseType() {throw new Error("response not implemented");};
	set responseType(v) {throw new Error("response not implemented");};

	get upload() {throw new Error("upload not implemented");};
	set upload(v) {throw new Error("upload not implemented");};

	get withCredentials() {throw new Error("withCredentials not implemented");};
	set withCredentials(v) {throw new Error("withCredentials not implemented");};

}
