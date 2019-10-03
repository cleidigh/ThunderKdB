var opml = {
	file : null,
	dom : null,
	dictionary : null,

	parse : function (callback) {
		if (opml.file === null) {
			log.writeLn("opml.parse: No file to parse", true);
			callback(false);
			return;
		}

		opml.dom = null;
		NetUtil.asyncFetch(opml.file, function(inputStream, status) {
			if (!Components.isSuccessCode(status)) {
				callback(false);
				return;
			}

			let theXml = NetUtil.readInputStreamToString(inputStream, inputStream.available(), { charset : "UTF-8" });
			let parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
				.createInstance(Components.interfaces.nsIDOMParser);
			opml.dom = parser.parseFromString(theXml, "text/xml");
			let chkCollection = opml.dom.getElementsByTagName("parsererror");
			if (chkCollection.length > 0) {
				log.writeLn("opml.parse: Error parsing opml", true);
				opml.dom = null;
				callback(false);
				return;
			}

			function toDictionary() {
				opml.dictionary = {};
			    let bodyNode = opml.dom.getElementsByTagName("body")[0];
			    let category = bodyNode.firstElementChild;
			    while (category !== null) {
			    	let feedTitle = category.firstElementChild;
			    	while (feedTitle !== null) {
			    		let feed = feedTitle.firstElementChild;
			    		let id = feed.getAttribute("xmlUrl");
			    		opml.dictionary[id] = { category : category.getAttribute("title"), title : feed.getAttribute("title") };
			    		feedTitle = feedTitle.nextElementSibling;
			    	}
			    	category = category.nextElementSibling;
			    }
			}

			toDictionary();
			callback(true);
		});
	},

	compare2JsonFile : function(jsonFile, callback) {
		NetUtil.asyncFetch(jsonFile, function(inputStream, status) {
			if (!Components.isSuccessCode(status)) {
				callback(false);
				return;
			}

			let jsonStr = NetUtil.readInputStreamToString(inputStream, inputStream.available());
			let jsonObj = null;
			try {
				jsonObj = JSON.parse(jsonStr);
				synch.compare2JsonObj(jsonObj, callback);
			}
			catch (err) {
				callback(false);
				return;
			}
		});
	},

	compare2JsonObj : function(jsonObj, callback) {
		opml.parse(function(success) {
			if (success === false) {
				log.writeLn("MISSED 3: Error while parsing file", true);
				callback(false);
				return;
			}
			compareParsed(jsonObj);
		});

		function compareParsed(json) {
			// Copy to a local array, to leave opml.dictionary unchanged for later user
			let dict = {};
			for (var key in opml.dictionary) {
				dict[key] = Object.assign({}, opml.dictionary[key]);
			}			
			
		    for (var subIdx = 0; subIdx < json.length; subIdx++) {
		        let feed = json[subIdx];
		        let feedId = feed.id.substring(5, feed.id.length); // Get rid of "feed/" prefix
		        let categoryName = "";
		        for (var categoryIdx = 0; categoryIdx < feed.categories.length; categoryIdx++) {
		        	if (feed.categories.length > 0)
		        		categoryName = feed.categories[categoryIdx].label;
		        	else
		        		categoryName = _("uncategorized", retrieveLocale());
		        }

		        if (dict[feedId] === undefined) {
		        	callback(false);
		        	return;
		        }
		        else if (dict[feedId].category !== categoryName) {
		        	callback(false);
		        	return;
		        }
		        else
		        	delete dict[feedId];
		    }

		    callback(Object.keys(dict).length === 0);
		}
	},
};
