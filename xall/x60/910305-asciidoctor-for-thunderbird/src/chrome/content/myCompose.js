// ChromeUtils.import("resource:///modules/MsgComposeCommands.js");

var textOri;
var isAsciiButtonChecked = false;
var myObserver = new Object()
var nbHtmlAsciiUpdate = 0;

myObserver.EditAction = function edit() {
	if (isAsciiButtonChecked) {
		nbHtmlAsciiUpdate++;
	}
}

var ThunderHTMLedit_ = new Object();
ThunderHTMLedit_.stateListener = {
	NotifyComposeBodyReady: function () {
		GetCurrentEditor().addEditorObserver(myObserver);
	}
}

window.addEventListener('compose-window-unload', function (event) {
	// Debugging showed that gMsgCompose is null by the time we get here.
	// From TB 48 we can listen to "compose-window-unload" ... if we care.
	if (gMsgCompose) {
		gMsgCompose.UnregisterStateListener(ThunderHTMLedit_.stateListener);
	}
}, true);

window.addEventListener('compose-window-init', function (event) {

	gMsgCompose.RegisterStateListener(ThunderHTMLedit_.stateListener);

}, true);

function buildAscii() {




	isAsciiButtonChecked = document.getElementById('asciime').checked;

	let editor = GetCurrentEditor();

	editor.beginTransaction();
	editor.selectAll();

	let selection = editor.selection.toString();
	let html;


	if (!isAsciiButtonChecked && textOri) {
		if (nbHtmlAsciiUpdate > 1) {
			if (window.confirm("Modification added to processed document will be lost, are you sure?")) {
				editor.selection.deleteFromDocument();
				html = textOri;
				nbHtmlAsciiUpdate = 0;
			} else {
				document.getElementById('asciime').checked = true;

			}
		} else {
			editor.selection.deleteFromDocument();
			html = textOri;
			nbHtmlAsciiUpdate = 0;
		}

	} else {

		textOri = editor.document.documentElement.innerHTML;
		editor.selection.deleteFromDocument();
		var attrs = {
			'nofooter': '',
			'stylesheet': 'asciidoctor-plus.css',
			'stylesdir': 'chrome://asciidoctor_tb/content/',
			'copycss!': '',
			'icons': '',
			'source-highlighter': 'highlight.js'
		};
		var options = {
			doctype: 'article',
			safe: 'unsafe',
			header_footer: true,
			attributes: attrs
		};
		html = Asciidoctor().convert(selection, options);


	}


	var editor_type = GetCurrentEditorType();

	editor.beginningOfDocument(); // seek to beginning  
	if (editor_type == "textmail" || editor_type == "text") {
		editor.insertText("NOT SUPPORTED");
		editor.insertLineBreak();
	} else {
		html = html.replace(new RegExp("./images/icons/", 'g'), "chrome://asciidoctor_tb/content/images/font-awesome-4.7.0PNG/");
		let doc = new DOMParser().parseFromString(html, "text/html");
		let codes = doc.getElementsByTagName('code');
		for (var i = 0; i < codes.length; i++) {
			hljs.highlightBlock(codes.item(i));
		}
		editor.insertHTML(doc.documentElement.innerHTML);
	}
	editor.endTransaction();

	let imagesToConvert = [];
	for (let img of editor.document.images) {
		imagesToConvert.push(img.src);
	}

	imagesToConvert.forEach(url => {

		try {
			loadBlockedImage(url, false)
		} catch (ex) {
			console.warn("Error while loading "+url+" ("+ex+")");
		}

	});



}

function loadBlockedImage(aURL, aReturnDataURL = false) {
	let filename;
	if (/^(file|chrome):/i.test(aURL)) {
		filename = aURL.substr(aURL.lastIndexOf("/") + 1);
	} else {
		let fnMatch = /[?&;]filename=([^?&]+)/.exec(aURL);
		filename = (fnMatch && fnMatch[1]) || "";
	}
	filename = decodeURIComponent(filename);
	let uri = Services.io.newURI(aURL);
	let contentType;
	if (filename) {
		try {
			contentType = Components.classes["@mozilla.org/mime;1"]
				.getService(Components.interfaces.nsIMIMEService)
				.getTypeFromURI(uri);
		} catch (ex) {
			contentType = "image/png";
		}

		if (!contentType.startsWith("image/")) {
			// Unsafe to unblock this. It would just be garbage either way.
			throw new Error("Won't unblock; URL=" + aURL +
				", contentType=" + contentType);
		}
	} else {
		// Assuming image/png is the best we can do.
		contentType = "image/png";
	}
	let channel = Services.io.newChannelFromURI2(uri,
		null,
		Services.scriptSecurityManager.getSystemPrincipal(),
		null,
		Components.interfaces.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,
		Components.interfaces.nsIContentPolicy.TYPE_OTHER);
	let inputStream = channel.open();
	let stream = Components.classes["@mozilla.org/binaryinputstream;1"]
		.createInstance(Components.interfaces.nsIBinaryInputStream);
	stream.setInputStream(inputStream);
	let streamData = "";
	try {
		while (stream.available() > 0) {
			streamData += stream.readBytes(stream.available());
		}
	} catch (e) {
		stream.close();
		throw new Error("Couln't read all data from URL=" + aURL + " (" + e + ")");
	}
	stream.close();
	let encoded = btoa(streamData);
	let dataURL = "data:" + contentType +
		(filename ? ";filename=" + encodeURIComponent(filename) : "") +
		";base64," + encoded;

	if (aReturnDataURL)
		return dataURL;

	let editor = GetCurrentEditor();
	for (let img of editor.document.images) {
		if (img.src == aURL) {
			img.src = dataURL; // Swap to data URL.
			img.classList.remove("loading-internal");
		}
	}
}