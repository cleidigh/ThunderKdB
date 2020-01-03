/**
 * HTTP and JSON support
 */
reminderfox.HTTP = {
//-------------------------------------------------------------
	HEADER_NAME : new RegExp("^([a-zA-Z0-9_-]+):")
}

	reminderfox.HTTP.request = function (caller) {
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		var request      = caller.callback
		caller.ID        = new Date().getTime()

		var callerPW = reminderfox.HTTP.handlePW(caller);

		if ((callerPW == null) && (caller.username != "")) {
			status = "401"; statusText = "Unauthorized"
			text = "Check 'username' and/or 'password' for "
			    + "\n" + caller.urlstr;
			xml = {}; headers = {};
			caller[caller.onError](status,xml,text,headers,statusText, caller)
			return
		}

		reminderfox.HTTP.call(caller.method, caller.urlstr, { /* options */
				username      : encodeURIComponent(caller.username ),   // ; caller.username,
				password      : encodeURIComponent (callerPW.password),

			//	username      : (caller.username ),   // ; caller.username,
			//	password      : (callerPW.password),

				timeout       : parseInt(caller.timeout) * 1000,

				contentType   : caller.contentType,
				body          : caller.body,
				headers       : caller.headers,
				returnHeaders : true,
				responseType  : caller.responseType,

				onOpened: function(request) {
				},
				onHeaders: function(request) {
				},
				onLoading: function(request) {
				},
				onSuccess: function(status,xml,text,headers,statusText) {
					caller[caller.callback](status,xml,text,headers,statusText, caller)
				},
				onFailure: function(status,xml,text,headers,statusText) {
					caller[caller.onError](status,xml,text,headers,statusText, caller)
				}
		})
}

	/** 
	 * The following keys can be sent:
	 * onSuccess (required) a function called when the response is 2xx
	 * onFailure				a function called when the response is not 2xx
	 * username					The username for basic auth
	 * password					The password for basic auth
	 * overrideMimeType		The mime type to use for non-XML response mime types
	 * timeout					A timeout value in milliseconds for the response
	 * onTimeout				A function to call if the request times out.
	 * body						A string containing the entity body of the request
	 * contentType				The content type of the entity body of the request
	 * headers					A hash of optional headers
	 */
	reminderfox.HTTP.call= function(method,url,options) {
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		var requester = new XMLHttpRequest();
		var timeout = null;

		if (!options.synchronizedRequest) {
			requester.onreadystatechange = function() {
				switch (requester.readyState) {
					case 0:
						if (options.onUnsent) {
							options.onUnsent(requester);
						}
					break;
					case 1:
						if (options.onOpened) {
							options.onOpened(requester);
						}
					break;
					case 2:
						if (options.onHeaders) {
							options.onHeaders(requester);
						}
					break;
					case 3:
						if (options.onLoading) {
							options.onLoading(requester);
						}
					break;
					case 4:
						if (timeout) {
							clearTimeout(timeout);
						}

						if ((options.responseType) && (options.responseType == 'text')) { 
							options.onSuccess(
								requester.status,
								null,
								requester.responseText,
								options.returnHeaders ? reminderfox.HTTP.parseHeaders(requester.getAllResponseHeaders()) : null,
								requester.statusText
							);
						} else {
							options.onSuccess(
								requester.status,
								requester.responseXML,
								requester.responseText,
								options.returnHeaders ? reminderfox.HTTP.parseHeaders(requester.getAllResponseHeaders()) : null,
								requester.statusText
							);
						}
					break;
				}
			}
		}

		if (options.overrideMimeType) {
			requester.overrideMimeType(options.overrideMimeType);
		}
		if (options.username) {
			requester.open(method,url,!options.synchronizedRequest,options.username,options.password);
		} else {
			requester.open(method,url,!options.synchronizedRequest);
		}
		if (options.timeout && !options.synchronizedRequest) {

//console.error("http timeout:", options.timeout, options.onTimeout, options.onFailure); //XXXdebug

			timeout = setTimeout( function() {
		//			 var callback = options.onTimeout ? options.onTimeout : options.onFailure;
		//			 callback(0,"Operation timeout.");
					options.onSuccess(0,"HTTP.js  Operation timeout.");
				 },
				 options.timeout
			);
		}
		if (options.headers) {
			for (var name in options.headers) {
				requester.setRequestHeader(name,options.headers[name]);
			}
		}
		if (options.contentType  && options.contentType.length > 0) {
			requester.setRequestHeader("Content-Type",options.contentType);
		}
		if (options.responseType) { 
			requester.responseType = options.responseType;
		}

		if (options.body) {
			requester.setRequestHeader("Content-Type",options.contentType);
		
			requester.send(options.body);
		} else {
			requester.send(null);
		}


		if (options.synchronizedRequest) {
			if (requester.status==0 || (requester.status>=200 && requester.status<300)) {

				options.onSuccess(
					requester.status,
					requester.responseXML,
					requester.responseText,
					options.returnHeaders ? reminderfox.HTTP.parseHeaders(requester.getAllResponseHeaders()) : null,
					requester.statusText
				);
			} else {
				if (options.onFailure) {
					options.onFailure(
						requester.status,
						requester.responseXML,
						requester.responseText,
						options.returnHeaders ? reminderfox.HTTP.parseHeaders(requester.getAllResponseHeaders()) : null,
						requester.statusText
					);
				}
			}
			return {
				abort: function() {
				}
			};
		} else {
			return {
				abort: function() {
					clearTimeout(timeout);
					requester.abort();
				}
			};
		}
	}


	/**
	 *  Convert XML object to a JS object
	 *  see   https://developer.mozilla.org/en-US/docs/JXON#JXON_reverse_algorithms
	 */
	reminderfox.HTTP.JXONTree = function (oXMLParent) {
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

			function parseText (sValue) {
				if(/^\s*$/.test(sValue)) {
					return null;
				}
				if(/^(?:true|false)$/i.test(sValue)) {
					return sValue.toLowerCase() === "true";
				}
				if(isFinite(sValue)) {
					return parseFloat(sValue);
				}
				if(isFinite(Date.parse(sValue))) {
					return new Date(sValue);
				}
				return sValue;
			};

		var nAttrLen = 0, nLength = 0, sCollectedTxt = "";
		if(oXMLParent.hasChildNodes()) {
			for(var oNode, sProp, vContent, nItem = 0; nItem < oXMLParent.childNodes.length; nItem++) {
				oNode = oXMLParent.childNodes.item(nItem);
				if((oNode.nodeType - 1 | 1) === 3) {
					sCollectedTxt += oNode.nodeType === 3 ? oNode.nodeValue.trim() : oNode.nodeValue;
				}
				else if(oNode.nodeType === 1) {// nodeType is "Element" (1)
					sProp = oNode.nodeName.toLowerCase();
					if (sProp.indexOf(':') > -1) sProp = sProp.split(":")[1];
	
					vContent = new reminderfox.HTTP.JXONTree(oNode);
					if(this.hasOwnProperty(sProp)) {
						if(this[sProp].constructor !== Array) {
							this[sProp] = [this[sProp]];
						}
						this[sProp].push(vContent);
					} else {
						this[sProp] = vContent;
						nLength++;
					}
				}
			}
			if (sCollectedTxt != "") this.keyValue = parseText(sCollectedTxt);
		}
		try {
		if(oXMLParent.hasAttributes()) {
			var oAttrib;
			this.keyAttributes = {};
			for(nAttrLen; nAttrLen < oXMLParent.attributes.length; nAttrLen++) {
				oAttrib = oXMLParent.attributes.item(nAttrLen);
				this.keyAttributes[oAttrib.name.toLowerCase()] = parseText(oAttrib.value.trim());
			}
		};
		} catch (ex) { /* no Attributes */}
	}

	/**
	 * Get JS object from JXON tree
	 *   @param {JXON object}
	 *   @param {string} object name to search for
	 */
	reminderfox.HTTP.XMLobject = function (xml, objectId) {
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		for(var item in xml) {
			var itemTyp = typeof (xml[item]);
			if((item === objectId) && (itemTyp == 'object')) {
				return xml[item];
			} else {
				if (itemTyp == 'object') {
					var sObj = reminderfox.HTTP.XMLobject (xml[item], objectId)
					if (sObj) return sObj;
				} else  return null;
			}
		}
		return null;
	}


	reminderfox.HTTP.parseHeaders = function (headerText) {
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
		var headers = {};
		if (headerText) {
			var eol = headerText.indexOf("\n");
			while (eol>=0) {
				var line = headerText.substring(0,eol);
				headerText = headerText.substring(eol+1);
				while (headerText.length>0 && !headerText.match(reminderfox.HTTP.HEADER_NAME)) {
					eol = headerText.indexOf("\n");
					var nextLine = eol<0 ? headerText : headerText.substring(0,eol);
					line = line+' '+nextLine;
					headerText = eol<0 ? "" : headerText.substring(eol+1);
				}
				// Parse the name value pair
				var colon = line.indexOf(':');
				var name = line.substring(0,colon);
				var value = line.substring(colon+1);
				headers[name] = value;
				eol = headerText.indexOf("\n");
			}
			if (headerText.length>0) {
				var colon = headerText.indexOf(':');
				var name = headerText.substring(0,colon);
				var value = headerText.substring(colon+1);
				headers[name] = value;
			}
		}
		return headers;
	}


	reminderfox.HTTP.handlePW= function (call) {
	//---------------------------------------------------------------
		if ((call.password === "") && (call.username !== "")) {

			var callDetails = reminderFox_getPassword ({
				ljURL    : call.urlstr,
				username : call.username,
				password : call.password
			});

			return callDetails

		} else {
			return {
				username : call.username,
				password : call.password
			};
		}
	};