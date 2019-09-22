if ("undefined" == typeof(XMLToJSONParser)) {
	function XMLToJSONParser(doc) {
		this._buildTree(doc);
	}
	
	XMLToJSONParser.prototype = {
		_buildTree: function XMLToJSONParser_buildTree(doc) {
			let nodeName = doc.documentElement.localName;
			this[nodeName] = [this._translateNode(doc.documentElement)];
		},
		
		_translateNode: function XMLToJSONParser_translateNode(node) {
			let value = null;
			if (node.childNodes.length) {
				let textValue = "";
				let dictValue = {};
				let hasElements = false;
				for (let i = 0; i < node.childNodes.length; i++) {
					let currentNode = node.childNodes[i];
					let nodeName = currentNode.localName;
					if (currentNode.nodeType == currentNode.TEXT_NODE) {
						textValue += currentNode.nodeValue;
					} else if (currentNode.nodeType == currentNode.CDATA_SECTION_NODE) {
						textValue += currentNode.nodeValue;
					} else if (currentNode.nodeType == currentNode.ELEMENT_NODE) {
						hasElements = true;
						let nodeValue = this._translateNode(currentNode);
						if (!dictValue[nodeName]) {
							dictValue[nodeName] = [];
						}
						dictValue[nodeName].push(nodeValue);
					}
				}
				if (hasElements) {
					value = dictValue;
				} else {
					value = textValue;
				}
			}
			return value;
		}
	};
};

if ("undefined" == typeof(cardbookWebDAV)) {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var { CardbookHttpRequest } = ChromeUtils.import("chrome://cardbook/content/cardbookHttpRequest.jsm");

	function cardbookWebDAV(connection, target, etag, asJSON) {
		this.prefId = connection.connPrefId;
		this.url = connection.connUrl;
		this.logDescription = connection.connDescription;
		this.target = target;
		this.etag = etag;
		var requestsTimeout = cardbookPreferences.getStringPref("extensions.cardbook.requestsTimeout");
		this.addonVersion = cardbookPreferences.getStringPref("extensions.cardbook.addonVersion");
		this.timeout = requestsTimeout * 1000;
	
		this.requestJSONResponse = false;
		this.requestXMLResponse = false;
		if (typeof asJSON != "undefined") {
			this.requestJSONResponse = asJSON;
			this.requestXMLResponse = !asJSON;
		}
		
		this.username = connection.connUser;
		this.password = "";
		this.accessToken = connection.accessToken;
		this.reportLength = 0;
		this.askCertificate = false;
		this.hideResponse = false;
		
		this.nc = 1;
	}
	
	cardbookWebDAV.prototype = {
		// btoa does not encode €
		b64EncodeUnicode: function (aString) {
			return btoa(encodeURIComponent(aString).replace(/%([0-9A-F]{2})/g, function(match, p1) {
				return String.fromCharCode('0x' + p1);
			}));
		},

		isItADigestCandidate: function (aXhr, aXhrOrig) {
			if (aXhr.status == 401) {
				if (!aXhrOrig) {
					var challenge = aXhr.getResponseHeader('WWW-Authenticate');
					if (challenge === null || challenge === undefined) {
						return false;
					}
					var pos = challenge.indexOf(" ");
					var pairs = challenge.substr(pos).trim().split(',');
					var tokens = {};
					for (var token in pairs) {
						var pair = pairs[token].trim().split('=');
						tokens[pair[0]] = pair[1];
					}
					if (tokens.qop && tokens.realm && tokens.nonce && tokens.opaque) {
						return true;
					}
				}
			}
			return false;
		},

		lpad: function (aString, aPadString, aLength) {
			while (aString.length < aLength) {
				aString = aPadString + aString;
			}
			return aString;
		},

		getMd5: function (aString) {
			let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			let trash = {};
			converter.charset = "UTF-8";
			let data = converter.convertToByteArray(aString, trash);
			
			let hasher = Components.classes['@mozilla.org/security/hash;1'].createInstance(Components.interfaces.nsICryptoHash);
			hasher.init(Components.interfaces.nsICryptoHash.MD5);
			hasher.update(data, data.length);
			let hash = hasher.finish(false);
			
			// return the two-digit hexadecimal code for a byte
			function toHexString(charCode) {
				return ("0" + charCode.toString(16)).slice(-2);
			}
			
			// convert the binary hash data to a hex string.
			let hex = Object.keys(hash).map(i => toHexString(hash.charCodeAt(i)));
			return hex.join("");
		},

		unquotes: function (aString) {
			return aString.replace(/^\"+|\"+$/gm, '');
		},

		genNonce: function (aLength) {
			var text = "";
			var possible = "ABCDEF0123456789";
			for (var i=0; i<aLength; i++) {
				text += possible.charAt(Math.floor(Math.random() * possible.length));
			}
			return text;
		},

		setDigestCredentials: function (aHeader, aXhrOrig, aMethod, aBody) {
			if (aXhrOrig === null) {
				return
			}
			var challenge = aXhrOrig.getResponseHeader('WWW-Authenticate');
			if (challenge === null || challenge === undefined) {
				return
			}
			var pos = challenge.indexOf(" ");
			var tokens = {cnonce: this.genNonce(16)};
			var pairs = challenge.substr(pos).trim().split(',');
			tokens.nc = this.lpad(this.nc++ + '', '0', 8);

			for (var token in pairs) {
				var pair = pairs[token].trim().split('=');
				tokens[pair[0]] = pair[1];
			}

			var HA1 = this.getMd5(this.username + ":" + this.unquotes(tokens.realm) + ":" + this.password);
			var shortUrl = this.url.replace(cardbookSynchronization.getRootUrl(this.url), '');
			if (this.unquotes(tokens.qop) == 'auth-int') {
				var HA2 = this.getMd5(aMethod + ':' + shortUrl + ':' + this.getMd5(aBody));
			} else {
				var HA2 = this.getMd5(aMethod + ':' + shortUrl);
			}
			var response = this.getMd5(HA1 + ':' + 
								this.unquotes(tokens.nonce) + ':' +
								tokens.nc + ':' +
								tokens.cnonce + ':' +
								this.unquotes(tokens.qop) + ':' +
								HA2);
			aHeader["Authorization"] = "Digest " +
				'username="' + this.username + '"' +
				', realm=' + tokens.realm +
				', nonce=' + tokens.nonce +
				', uri="' + shortUrl + '"' +
				', response="' + response + '"' +
				', opaque=' + tokens.opaque +
				', qop=' + this.unquotes(tokens.qop) +
				', nc=' + tokens.nc +
				', cnonce="' + tokens.cnonce + '"';
		},
	
		setCredentials: function (aHeader) {
			if (this.accessToken) {
				if (this.accessToken !== "NOACCESSTOKEN") {
					aHeader["Authorization"] = this.accessToken;
					aHeader["GData-Version"] = "3";
				}
				this.username = "";
				this.password = "";
			} else {
				if (!this.username) {
					if (this.prefId) {
						this.username = cardbookPreferences.getUser(this.prefId);
					} else {
						this.username = "";
					}
				}
				if (this.username) {
					this.password = cardbookPasswordManager.getNotNullPassword(this.username, this.prefId, this.url);
				}
				aHeader["Authorization"] = "Basic " + this.b64EncodeUnicode(this.username + ':' + this.password);
			}
		},
	
		createTCPErrorFromFailedChannel: function (aChannel) {
			let status = aChannel.channel.QueryInterface(Components.interfaces.nsIRequest).status;
			let errType;
			
			if ((status & 0xff0000) === 0x5a0000) { // Security module
				const nsINSSErrorsService = Components.interfaces.nsINSSErrorsService;
				let nssErrorsService = Components.classes['@mozilla.org/nss_errors_service;1'].getService(nsINSSErrorsService);
				let errorClass;
				
				// getErrorClass will throw a generic NS_ERROR_FAILURE if the error code is
				// somehow not in the set of covered errors.
				try {
					errorClass = nssErrorsService.getErrorClass(status);
				} catch (ex) {
					//catching security protocol exception
					errorClass = 'SecurityProtocol';
				}
				
				if (errorClass == nsINSSErrorsService.ERROR_CLASS_BAD_CERT) {
					errType = 'SecurityCertificate';
				} else {
					errType = 'SecurityProtocol';
				}
				
				// NSS_SEC errors (happen below the base value because of negative vals)
				if ((status & 0xffff) < Math.abs(nsINSSErrorsService.NSS_SEC_ERROR_BASE)) {
					this.askCertificate = true;
					// The bases are actually negative, so in our positive numeric space, we
					// need to subtract the base off our value.
					let nssErr = Math.abs(nsINSSErrorsService.NSS_SEC_ERROR_BASE) - (status & 0xffff);
					
					switch (nssErr) {
						case 11: // SEC_ERROR_EXPIRED_CERTIFICATE, sec(11)
							errName = 'SecurityExpiredCertificateError';
							break;
						case 12: // SEC_ERROR_REVOKED_CERTIFICATE, sec(12)
							errName = 'SecurityRevokedCertificateError';
							break;
						// per bsmith, we will be unable to tell these errors apart very soon,
						// so it makes sense to just folder them all together already.
						case 13: // SEC_ERROR_UNKNOWN_ISSUER, sec(13)
						case 20: // SEC_ERROR_UNTRUSTED_ISSUER, sec(20)
						case 21: // SEC_ERROR_UNTRUSTED_CERT, sec(21)
						case 36: // SEC_ERROR_CA_CERT_INVALID, sec(36)
							errName = 'SecurityUntrustedCertificateIssuerError';
							break;
						case 90: // SEC_ERROR_INADEQUATE_KEY_USAGE, sec(90)
							errName = 'SecurityInadequateKeyUsageError';
							break;
						case 176: // SEC_ERROR_CERT_SIGNATURE_ALGORITHM_DISABLED, sec(176)
							errName = 'SecurityCertificateSignatureAlgorithmDisabledError';
							break;
						default:
							errName = 'SecurityError';
							break;
					}
				} else {
					// Calculating the difference
					let sslErr = Math.abs(nsINSSErrorsService.NSS_SSL_ERROR_BASE) - (status & 0xffff);
					switch (sslErr) {
						case 3: // SSL_ERROR_NO_CERTIFICATE, ssl(3)
							errName = 'SecurityNoCertificateError';
							break;
						case 4: // SSL_ERROR_BAD_CERTIFICATE, ssl(4)
							errName = 'SecurityBadCertificateError';
							break;
						case 8: // SSL_ERROR_UNSUPPORTED_CERTIFICATE_TYPE, ssl(8)
							errName = 'SecurityUnsupportedCertificateTypeError';
							break;
						case 9: // SSL_ERROR_UNSUPPORTED_VERSION, ssl(9)
							errName = 'SecurityUnsupportedTLSVersionError';
							break;
						case 12: // SSL_ERROR_BAD_CERT_DOMAIN, ssl(12)
							errName = 'SecurityCertificateDomainMismatchError';
							break;
						default:
							errName = 'SecurityError';
							break;
					}
				}
			} else {
				errType = 'Network';
				switch (status) {
					// connect to host:port failed
					case 0x804B000C: // NS_ERROR_CONNECTION_REFUSED, network(13)
						errName = 'ConnectionRefusedError';
						break;
					// network timeout error
					case 0x804B000E: // NS_ERROR_NET_TIMEOUT, network(14)
						errName = 'NetworkTimeoutError';
						break;
					// hostname lookup failed
					case 0x804B001E: // NS_ERROR_UNKNOWN_HOST, network(30)
						errName = 'DomainNotFoundError';
						break;
					case 0x804B0047: // NS_ERROR_NET_INTERRUPT, network(71)
						errName = 'NetworkInterruptError';
						break;
					default:
						errName = 'NetworkError';
						break;
				}
			}
			
			cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : Connection status : Failed : " + errName);
			this.dumpSecurityInfo(aChannel);
			// XXX: errType goes unused
		},
	
		dumpSecurityInfo: function (aChannel) {
			let channel = aChannel.channel;
			try {
				let secInfo = channel.securityInfo;
				
				// Print general connection security state
				cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : Security Information :");
				if (secInfo instanceof Components.interfaces.nsITransportSecurityInfo) {
					secInfo.QueryInterface(Components.interfaces.nsITransportSecurityInfo);
					cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : Security state of connection :");
					
					// Check security state flags
					if ((secInfo.securityState & Components.interfaces.nsIWebProgressListener.STATE_IS_SECURE) == Components.interfaces.nsIWebProgressListener.STATE_IS_SECURE) {
						cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : Secure connection");
					} else if ((secInfo.securityState & Components.interfaces.nsIWebProgressListener.STATE_IS_INSECURE) == Components.interfaces.nsIWebProgressListener.STATE_IS_INSECURE) {
						cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : Insecure connection");
					} else if ((secInfo.securityState & Components.interfaces.nsIWebProgressListener.STATE_IS_BROKEN) == Components.interfaces.nsIWebProgressListener.STATE_IS_BROKEN) {
						cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : Unknown");
						cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : Security description : " + secInfo.shortSecurityDescription);
						cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : Security error message : " + secInfo.errorMessage);
					}
				} else {
					cardbookLog.updateStatusProgressInformationWithDebug2(this.logDescription + " : debug mode : No security info available for this channel");
				}
			}
			catch(e) {
				var prompts = Services.prompt;
				var errorTitle = "dumpSecurityInfo error";
				prompts.alert(null, errorTitle, e);
			}
		},
	
		makeHTTPRequest: function(method, body, headers, aCleanBody, aXhrOrig) {
			headers["User-Agent"] = cardbookRepository.userAgent;
			
			if (aXhrOrig) {
				this.setDigestCredentials(headers, aXhrOrig, method, body);
			} else {
				this.setCredentials(headers);
			}

			// CardbookHttpRequest must be called after the username is fix, so it must be
			// called after setCredentials(), which may change it.
			var httpChannel = CardbookHttpRequest(this.url, this.username);
			if (this.timeout) {
				httpChannel.timeout = this.timeout;
			}
			
			cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : method : ", method);
			if (headers) {
				cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : headers : ", cardbookUtils.cleanWebObject(headers));
			}
			if (aCleanBody) {
				cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : body : ", aCleanBody);
			} else {
				cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : body : ", body);
			}
			cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : username : ", this.username);
			cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : url : ", this.url);

			// httpChannel.open(method, this.url, true, this.username, this.password);
			httpChannel.open(method, this.url, true);
			
			if (headers) {
				for (let header in headers) {
					httpChannel.setRequestHeader(header, headers[header]);
				}
			}
			return httpChannel;
		},
	
		sendHTTPRequest: function(method, body, headers, aCleanBody, aXhrOrig, aOverrideMime) {
			try {
				if (body) {
					var textEncoder = new TextEncoder();
					var encoded = textEncoder.encode(body);
					headers["Content-Length"] = encoded.length;
				}
				var xhr = this.makeHTTPRequest(method, body, headers, aCleanBody, aXhrOrig);

				var this_ = this;
				xhr.onerror = function() {
					if (this_.isItADigestCandidate(xhr, aXhrOrig)) {
						this_.sendHTTPRequest(method, body, headers, aCleanBody, xhr);
					} else {
						this_.createTCPErrorFromFailedChannel(xhr);
						this_.handleHTTPResponse(xhr, xhr.status, xhr.responseText.length, xhr.responseText);
					}
				};
				xhr.ontimeout = function() {
					this_.createTCPErrorFromFailedChannel(xhr);
					this_.handleHTTPResponse(xhr, 408, xhr.responseText.length, xhr.responseText);
				};
				xhr.onload = function() {
					if (this_.isItADigestCandidate(xhr, aXhrOrig)) {
						this_.sendHTTPRequest(method, body, headers, aCleanBody, xhr);
					} else {
						this_.handleHTTPResponse(xhr, xhr.status, xhr.responseText.length, xhr.responseText);
					}
				};

				if (aOverrideMime) {
					xhr.overrideMimeType('text/plain; charset=x-user-defined');
				}
				if (body) {
					xhr.send(body);
				} else {
					xhr.send();
				}
	
			}
			catch(e) {
				var prompts = Services.prompt;
				var errorTitle = "sendHTTPRequest error";
				prompts.alert(null, errorTitle, e);
				if (this.target && this.target.onDAVQueryComplete) {
					this.target.onDAVQueryComplete(666, "", this.askCertificate, "", 0);
				}
			}
		},
	
		handleHTTPResponse: function(aChannel, aStatus, aResultLength, aResult) {
			var status = aStatus;
			var headers = {};
			var response = null;
			if (!this.hideResponse) {
				cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : response text : ", aResult);
				cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : response code : ", aStatus);
				cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : response etag : ", aChannel.getResponseHeader("etag"));
			}
			if (status !== 499 && status !== 0 && status !== 408) {
				if (aResultLength > 0) {
					var responseText = aResult;
					if (this.requestJSONResponse || this.requestXMLResponse) {
						let xmlParser = new DOMParser();
						xmlParser.forceEnableXULXBL();
						let responseXML = xmlParser.parseFromString(responseText, "text/xml");
						if (this.requestJSONResponse) {
							let parser = new XMLToJSONParser(responseXML);
							response = parser;
						} else {
							response = responseXML;
						}
					} else {
						response = responseText;
					}
				}
			}
			if (this.target && this.target.onDAVQueryComplete) {
				this.target.onDAVQueryComplete(status, response, this.askCertificate, aChannel.getResponseHeader("ETag"), this.reportLength);
			}
		},
	
		load: function(operation, parameters) {
			if (operation == "GET") {
				var headers = {};
				if (parameters.accept !== null) {
					headers.accept = parameters.accept;
				}
				this.sendHTTPRequest(operation, null, headers);
			} else if (operation == "GETIMAGE") {
				var headers = {};
				if (parameters.accept !== null) {
					headers.accept = parameters.accept;
				}
				this.sendHTTPRequest("GET", null, headers, null, null, true);
			} else if (operation == "PUT") {
				if (this.etag && this.etag != "0") {
					this.sendHTTPRequest(operation, parameters.data, { "Content-Type": parameters.contentType,
																		"If-Match": this.etag });
				} else {
					this.sendHTTPRequest(operation, parameters.data, { "Content-Type": parameters.contentType,
																		"If-None-Match": "*" });
				}
			} else if (operation == "PROPFIND") {
				let headers = { "depth": (parameters.deep ? "1": "0"), "Content-Type": "application/xml; charset=utf-8"};
				let query = this._buildPropfindRequest(parameters.props);
				this.sendHTTPRequest(operation, query, headers);
		   } else if (operation == "REPORTMULTIGET") {
				let headers = { "depth": (parameters.deep ? "1": "0"), "Content-Type": "application/xml; charset=utf-8"};
				let query = this._buildMultigetRequest(parameters.props);
				this.sendHTTPRequest("REPORT", query, headers);
		   } else if (operation == "REPORTQUERY") {
				let headers = { "depth": (parameters.deep ? "1": "0"), "Content-Type": "application/xml; charset=utf-8"};
				let query = this._buildQueryRequest(parameters.props);
				this.sendHTTPRequest("REPORT", query, headers);
			} else if (operation == "DELETE") {
				this.sendHTTPRequest(operation, null, {});
			}
		},
	
		get: function(accept) {
			this.load("GET", {accept: accept});
		},
	
		getimage: function(accept) {
			this.load("GETIMAGE", {accept: accept});
		},
	
		put: function(data, contentType) {
			this.load("PUT", {data: data, contentType: contentType});
		},
	
		propfind: function(props, deep) {
			if (typeof deep == "undefined") {
				deep = true;
			}
			this.load("PROPFIND", {props: props, deep: deep});
		},
	
		reportMultiget: function(props, deep) {
			if (typeof deep == "undefined") {
				deep = true;
			}
			this.load("REPORTMULTIGET", {props: props, deep: deep});
		},
	
		reportQuery: function(aProps, aValue, deep) {
			if (typeof deep == "undefined") {
				deep = true;
			}
			this.load("REPORTQUERY", {props: {value: aValue, props: aProps}, deep: deep});
		},
	
		googleToken: function(aType, aParams, aHeaders) {
			this.hideResponse = true;
			var paramsArray = [];
			for (var param in aParams) {
				paramsArray.push(param + "=" + encodeURIComponent(aParams[param]));
			}
			this.sendHTTPRequest(aType, paramsArray.join("&"), aHeaders, cardbookUtils.cleanWebArray(paramsArray));
		},
		
		yahooToken: function(aType, aParams, aHeaders, aClientId, aClientSecret) {
			this.hideResponse = true;
			var paramsArray = [];
			for (var param in aParams) {
				paramsArray.push(param + "=" + encodeURIComponent(aParams[param]));
			}
			aHeaders["Authorization"] = "Basic " + this.b64EncodeUnicode(aClientId + ':' + aClientSecret);
			this.sendHTTPRequest(aType, paramsArray.join("&"), aHeaders, cardbookUtils.cleanWebArray(paramsArray));
		},
		
		delete: function() {
			this.load("DELETE");
		},
		
		_buildMultigetRequest: function(props) {
			var query = "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
			query += "<C:addressbook-multiget xmlns:D=\"DAV:\" xmlns:C=\"urn:ietf:params:xml:ns:carddav\">";
			query += "<D:prop><D:getetag/><C:address-data Content-Type='text/vcard'/></D:prop>";
			for (var i = 0; i < props.length; i++) {
				this.reportLength++;
				query += "<D:href>" + this._formatRelativeHref(props[i]) + "</D:href>";
			}
			query += "</C:addressbook-multiget>";
			return query;
		},
	
		_buildPropfindRequest: function(props) {
			var query = "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
			query += "<D:propfind xmlns:D=\"DAV:\" xmlns:C=\"urn:ietf:params:xml:ns:carddav\">";
			query += "<D:prop>";
			for (var i = 0; i < props.length; i++) {
				query += "<" + props[i] + "/>";
			}
			query += "</D:prop></D:propfind>";
			return query;
		},
	
		_buildQueryRequest: function(props) {
			var query = "<?xml version=\"1.0\" encoding=\"utf-8\"?>";
			query += "<C:addressbook-query xmlns:D=\"DAV:\" xmlns:C=\"urn:ietf:params:xml:ns:carddav\">";
			query += "<D:prop>";
			for (var i = 0; i < props.props.length; i++) {
				query += "<" + props.props[i] + "/>";
			}
			query += "</D:prop>";
			query += "<C:filter test=\"anyof\">";
			query += "<C:prop-filter name=\"FN\"><C:text-match collation=\"i;unicode-casemap\" match-type=\"contains\">" + props.value + "</C:text-match></C:prop-filter>";
			query += "<C:prop-filter name=\"EMAIL\"><C:text-match collation=\"i;unicode-casemap\" match-type=\"contains\">" + props.value + "</C:text-match></C:prop-filter>";
			query += "</C:filter>";
			query += "</C:addressbook-query>";
			return query;
		},
	
		_formatRelativeHref: function(aString) {
			var decodeReport = true;
			try {
				decodeReport = cardbookPreferences.getBoolPref("extensions.cardbook.decodeReport");
			} catch (e) {
				decodeReport = true;
			}
			var relative = aString.match("(https?)(://[^/]*)/([^#?]*)");
			if (relative && relative[3]) {
				var relativeHrefArray = [];
				relativeHrefArray = relative[3].split("/");
				for (var i = 0; i < relativeHrefArray.length; i++) {
					if (decodeReport) {
						relativeHrefArray[i] = decodeURIComponent(relativeHrefArray[i]);
					} else {
						relativeHrefArray[i] = encodeURIComponent(relativeHrefArray[i]);
					}
				}
				return "/" + relativeHrefArray.join("/");
			}
			cardbookLog.updateStatusProgressInformationWithDebug1(this.logDescription + " : debug mode : can not parse relative href : ", aString);
			return "";
		}
	};

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/cardbookPasswordManager.js", {});
	loader.loadSubScript("chrome://cardbook/content/preferences/cardbookPreferences.js", {});
};
