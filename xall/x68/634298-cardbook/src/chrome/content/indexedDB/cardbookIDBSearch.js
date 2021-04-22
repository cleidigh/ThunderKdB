var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var cardbookIDBSearch = {
	cardbookSearchDatabaseVersion: "1",
	cardbookSearchDatabaseName: "cardbookSearch",
	doUpgrade: false,

	// first step for getting the mail popularities
	openSearchDB: function() {
		// generic output when errors on DB
		cardbookRepository.cardbookSearchDatabase.onerror = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformation("Search popularity Database error : " + e.value, "Error");
		};

		var request = indexedDB.open(cardbookIDBSearch.cardbookSearchDatabaseName, cardbookIDBSearch.cardbookSearchDatabaseVersion);
	
		request.onupgradeneeded = function(e) {
			var db = e.target.result;
			e.target.transaction.onerror = cardbookRepository.cardbookSearchDatabase.onerror;
			if (e.oldVersion < 1) {
				if (db.objectStoreNames.contains("search")) {
					db.deleteObjectStore("search");
				}
				let store = db.createObjectStore("search", {keyPath: "dirPrefId", autoIncrement: false});
				cardbookIDBSearch.doUpgrade = true;
			}
		};

		// when success, call the observer for starting the load cache and maybe the sync
		request.onsuccess = async function(e) {
			cardbookRepository.cardbookSearchDatabase.db = e.target.result;
			if (cardbookIDBSearch.doUpgrade) {
				let cacheDir = cardbookRepository.getLocalDirectory();
				let dirIterator = new OS.File.DirectoryIterator(cacheDir.path);
				let ABlist = [];
				dirIterator.forEach(entry => {
					if (entry.isDir) {
						ABlist.push(entry.name);
					}
				}).then( async function read() {
					for (let name of ABlist) {
						let myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
						myFile.initWithPath(cacheDir.path);
						myFile.append(name);
						myFile.append(name + ".rul");
						if (myFile.exists()) {
							let promise = await OS.File.read(myFile.path).then(
								function onSuccess(array) {
									let decoder = new TextDecoder();
									let content = decoder.decode(array);
									let relativeHeader = content.match("^searchAB:([^:]*):searchAll:([^:]*)(.*)");
									if (!relativeHeader) {
										return;
									}
									let searchAB = relativeHeader[1];
									let matchAll = false;
									if (relativeHeader[2] == "true") {
										matchAll = true;
									}
									let ruleArray = relativeHeader[3].split(/:case:/);
									let rules = [];
									for (let rule of ruleArray) {
										if (rule) {
											let relative = rule.match("([^:]*):field:([^:]*):term:([^:]*):value:([^:]*)");
											if (relative[4]) {
												rules.push({ case: relative[1], field: relative[2], term: relative[3], value: relative[4] });
											} else {
												rules.push({ case: relative[1], field: relative[2], term: relative[3] });
											}
										}
									}
									cardbookIDBSearch.addSearch( {dirPrefId: name, searchAB: searchAB, matchAll: matchAll, rules: rules} );
								},
								function onError() {
								}
							);
						}
					}
				}).then( () => {;
					cardbookIDBSearch.doUpgrade = false;
				});;
			}
			cardbookRepository.cardbookUtils.notifyObservers("searchDBOpen");
		};
		
		// when error, call the observer for starting the load cache and maybe the sync
		request.onerror = function(e) {
			cardbookRepository.cardbookUtils.notifyObservers("searchDBOpen");
			cardbookRepository.cardbookSearchDatabase.onerror(e);
		};
	},

	// add or override the search to the cache
	addSearch: function(aSearch) {
		var db = cardbookRepository.cardbookSearchDatabase.db;
		var transaction = db.transaction(["search"], "readwrite");
		var store = transaction.objectStore("search");
		var cursorRequest = store.put(aSearch);

		cursorRequest.onsuccess = function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Search " + aSearch.dirPrefId + " written to searchDB");
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookSearchDatabase.onerror(e);
		};
	},

	// delete the search
	removeSearch: function(aDirPrefId) {
		var db = cardbookRepository.cardbookSearchDatabase.db;
		var transaction = db.transaction(["search"], "readwrite");
		var store = transaction.objectStore("search");
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var cursorDelete = store.delete(keyRange);
		
		cursorDelete.onsuccess = async function(e) {
			cardbookRepository.cardbookLog.updateStatusProgressInformationWithDebug2("debug mode : Search " + aDirPrefId + " deleted from searchDB");
		};
		cursorDelete.onerror = function(e) {
			cardbookRepository.cardbookSearchDatabase.onerror(e);
		};
	},

	// once the DB is open, this is the second step 
	loadSearch: function(aDirPrefId, aCallBack) {
		var db = cardbookRepository.cardbookSearchDatabase.db;
		var transaction = db.transaction(["search"], "readonly");
		var store = transaction.objectStore("search");
		var keyRange = IDBKeyRange.bound(aDirPrefId, aDirPrefId + '\uffff');
		var cursorRequest = store.getAll(keyRange);
	
		cursorRequest.onsuccess = async function(e) {
			var result = e.target.result;
			if (result) {
				for (var search of result) {
					cardbookRepository.cardbookComplexSearch[aDirPrefId] = {}
					cardbookRepository.cardbookComplexSearch[aDirPrefId].searchAB = search.searchAB;
					cardbookRepository.cardbookComplexSearch[aDirPrefId].matchAll = search.matchAll;
					cardbookRepository.cardbookComplexSearch[aDirPrefId].rules = [];
					for (let rule of search.rules) {
						if (rule.value) {
							cardbookRepository.cardbookComplexSearch[aDirPrefId].rules.push({case: rule.case, field: rule.field, term: rule.term, value: rule.value});
						} else {
							cardbookRepository.cardbookComplexSearch[aDirPrefId].rules.push({case: rule.case, field: rule.field, term: rule.term, value: ""});
						}
					}
				}
			}
		};

		cursorRequest.onerror = function(e) {
			cardbookRepository.cardbookSearchDatabase.onerror(e);
		};

		transaction.oncomplete = function() {
			aCallBack(aDirPrefId);
		};
	}
};
