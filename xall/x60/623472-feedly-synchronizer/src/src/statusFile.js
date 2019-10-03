// Feedly Synchronizer AddOn for Mozilla Thunderbird
// Developed by Antonio Miras Aróstegui
// Published under Mozilla Public License, version 2.0 (https://www.mozilla.org/MPL/2.0/)

const FEED_LOCALSTATUS_SYNC = 1;
const FEED_LOCALSTATUS_DEL = 2;

const XPR = {
	// XPathResultType
	ANY_TYPE: 0,
	NUMBER_TYPE: 1,
	STRING_TYPE: 2,
	BOOLEAN_TYPE: 3,
	UNORDERED_NODE_ITERATOR_TYPE: 4,
	ORDERED_NODE_ITERATOR_TYPE: 5,
	UNORDERED_NODE_SNAPSHOT_TYPE: 6,
	ORDERED_NODE_SNAPSHOT_TYPE: 7,
	ANY_UNORDERED_NODE_TYPE: 8,
	FIRST_ORDERED_NODE_TYPE: 9
};

var statusFile = {
	dom : null,

	reset : function () {
		log.writeLn("statusFile.reset.");

		let id = addonId;

		// I use a "data" directory for cleanliness, in case the addon is not running packed on a XPI file
		let fileFeedStatus = FileUtils.getFile("ProfD", [id, "data", "feeds.xml"], false);
		if (fileFeedStatus.exists())
			fileFeedStatus.remove(false);
		statusFile.read();
	},

	read : function() {
		statusFile.dom = null;
		let parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
			.createInstance(Components.interfaces.nsIDOMParser);
		let id = addonId;
		let fileFeedStatus = FileUtils.getFile("ProfD", [id, "data", "feeds.xml"], false);
		if (!fileFeedStatus.exists()) {
			log.writeLn("statusFile.read. File not found. Creating");
			fileFeedStatus.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, FileUtils.PERMS_FILE);
			let strDom = "<?xml version=\"1.0\"?>";
			strDom += "<feeds>";
			strDom += "</feeds>";
			let outStream = FileUtils.openSafeFileOutputStream(fileFeedStatus);
			let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
			                createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
			converter.charset = "UTF-8";
			let inStream = converter.convertToInputStream(strDom);
			NetUtil.asyncCopy(inStream, outStream);
			statusFile.dom = parser.parseFromString(strDom, "text/xml");
		}
		else {
			NetUtil.asyncFetch(fileFeedStatus, function(inputStream, status) {
				if (!Components.isSuccessCode(status)) {
					log.writeLn("statusFile.read. Error reading file");
					return;
				}
				let xmlFeedStatus = NetUtil.readInputStreamToString(inputStream, inputStream.available());
				log.writeLn("statusFile.read. Readed XML = " + xmlFeedStatus);
				statusFile.dom = parser.parseFromString(xmlFeedStatus, "text/xml");

				let chkCollection = statusFile.dom.getElementsByTagName("parsererror");
				if (chkCollection.length > 0) {
					log.writeLn("statusFile.read. Error parsing file.");
					statusFile.reset();
				}
			});
		}
	},

	write : function() {
	    let id = addonId;
	    let domSerializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
        					.createInstance(Components.interfaces.nsIDOMSerializer);
		let strDom = domSerializer.serializeToString(statusFile.dom);
		log.writeLn("statusFile.write. Status XML = " + strDom);
		let fileFeedStatus = FileUtils.getFile("ProfD",
				[id, "data", "feeds.xml"], false);
		let outStream = FileUtils.openSafeFileOutputStream(fileFeedStatus);
		let converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
		                createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
		converter.charset = "UTF-8";
		let inStream = converter.convertToInputStream(strDom);
		NetUtil.asyncCopy(inStream, outStream);
	},

	find : function(id, status) {
		let xpathExpression;
		if (status === undefined || status === null)
			xpathExpression = "/feeds/feed[id='" + id + "']";
		else
		    xpathExpression = "/feeds/feed[id='" + id +
    			"' and status=" + status + "]";

	    let xpathResult = statusFile.dom.evaluate(xpathExpression, statusFile.dom,
	    		null, XPR.UNORDERED_NODE_ITERATOR_TYPE, null);
	    if (xpathResult === null)
	    	return null;
	    return xpathResult.iterateNext();
	},

	add : function(id) {
		if (statusFile.find(id) !== null)
			return;

		let nodeFeed = statusFile.dom.createElement("feed");
		let nodeStatus = statusFile.dom.createElement("status");
		nodeStatus.textContent = FEED_LOCALSTATUS_SYNC;
		let nodeId = statusFile.dom.createElement("id");
		nodeId.textContent = id;
		let nodeParent = statusFile.dom.getElementsByTagName("feeds")[0];
		nodeFeed.appendChild(nodeStatus);
		nodeFeed.appendChild(nodeId);
		nodeParent.appendChild(nodeFeed);
	},

	remove : function(id) {
		let domNode = statusFile.find(id);
		if (domNode === null)
			return;

		let parentNode = domNode.parentNode;
		if (parentNode !== null)
			parentNode.removeChild(domNode);
		else
			log.writeLn("statusFile.remove. No parent node. Unexpected situation");
	},

	markAsDeleted : function(id) {
		let domNode = statusFile.find(id);
		if (domNode === null)
			return;

		let statusNodes = domNode.getElementsByTagName("status");
		if (statusNodes.length > 0) {
			let statusNode = statusNodes[0];
			statusNode.textContent = FEED_LOCALSTATUS_DEL;
		}
		else
			log.writeLn("statusFile.markAsDeleted. No status node. Unexpected situation");
	},

	getStatus : function(id) {
		let domNode = statusFile.find(id);
		if (domNode === null)
			return -1;

		let nodeStatus = domNode.getElementsByTagName("status");
		if (nodeStatus !== null && nodeStatus.length == 1)
			return Number(nodeStatus[0].firstChild.nodeValue);
		else
			return -1;
	},
};