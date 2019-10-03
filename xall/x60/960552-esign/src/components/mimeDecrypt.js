"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm"); // Export XPCOMUtils
Cu.import("resource://esign/crypto.jsm");           // Export EsignCrypto
Cu.import("resource://esign/dataMsg.jsm");          // Export EsignDataMsg

const MIME_JS_DECRYPTOR_CONTRACTID = "@mozilla.org/mime/pgp-mime-js-decrypt;1";
const MIME_JS_DECRYPTOR_CID = Components.ID("{c24d2b8b-951a-4b82-889d-16e6c7bad80b}");

var gConv;
var inStream;
var gLastEncryptedUri = "";

const throwErrors = {
	onDataAvailable: function() {
		throw "error";
	},
	onStartRequest: function() {
		throw "error";
	},
	onStopRequest: function() {
		throw "error";
	}
};

// -----------------------------------------------------
// UnknownProtoHandler - это обработчик по умолчанию для неизвестных протоколов.
// Это гарантирует, что подписанная часть сообщения всегда отображается без каких-либо дальнейших действий.
// -----------------------------------------------------

function UnknownProtoHandler() {
	if (!gConv) {
		gConv = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
	}

	if (!inStream) {
		inStream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
	}
}

UnknownProtoHandler.prototype = {
	onStartRequest: function(request) {
		this.mimeSvc = request.QueryInterface(Ci.nsIPgpMimeProxy);
		this.mimeSvc.onStartRequest(null, null);
		this.bound = EsignDataMsg.getBoundary(this.mimeSvc.contentType);
		/*
			readMode:
				0: before message
				1: inside message
				2: afer message
		*/
		this.readMode = 0;
	},

	onDataAvailable: function(req, sup, stream, offset, count) {
		if (count > 0) {
			inStream.init(stream);
			let data = inStream.read(count);
			let l = data.replace(/\r\n/g, "\n").split(/\n/);

			if (data.search(/\n$/) >= 0) {
				l.pop();
			}

			let startIndex = 0;
			let endIndex = l.length;

			if (this.readMode < 2) {
				for (let i = 0; i < l.length; i++) {
					if (l[i].indexOf("--") === 0 && l[i].indexOf(this.bound) === 2) {
						++this.readMode;
						if (this.readMode === 1) {
							startIndex = i + 1;
						}
						else if (this.readMode === 2) {
							endIndex = i - 1;
						}
					}
				}

				if (this.readMode >= 1 && startIndex < l.length) {
					let out = l.slice(startIndex, endIndex).join("\n") + "\n";
					gConv.setData(out, out.length);
					this.mimeSvc.onDataAvailable(null, null, gConv, 0, out.length);
				}
			}
		}
	},

	onStopRequest: function() {
		this.mimeSvc.onStopRequest(null, null, 0);
	}
};

// -----------------------------------------------------
// Обработчик для зашифрованных и подписанных сообщений.
// Данные обрабатываются из libmime -> nsPgpMimeProxy
// -----------------------------------------------------

function mimeDecrypt() {
}

mimeDecrypt.prototype = {
	classDescription: "Esign JS Decryption Handler",
	classID: MIME_JS_DECRYPTOR_CID,
	contractID: MIME_JS_DECRYPTOR_CONTRACTID,
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIStreamListener]),
	inStream: Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream),

	onStartRequest: function (request, uri) {
		let mimeSvc = request.QueryInterface(Ci.nsIPgpMimeProxy);
		let ct = mimeSvc.contentType;
		let reSignature = new RegExp(EsignDataMsg.SIGNATURE_HEADER, "g");
		let cth = null;

		// Обработчик для подписанных сообщений
		if (ct.search(reSignature) > 0) {
			cth = EsignCrypto.signatureVerifier();
		}

		// Обработчик по умолчанию
		if (!cth) {
			cth = new UnknownProtoHandler();
		}

		if (cth) {
			this.onDataAvailable = cth.onDataAvailable.bind(cth);
			this.onStopRequest = cth.onStopRequest.bind(cth);
			return cth.onStartRequest(request, uri);
		}
	},

	onDataAvailable: function (req, sup, stream, offset, count) {
	},

	onStopRequest: function (request, win, status) {
	},

};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([mimeDecrypt]);
