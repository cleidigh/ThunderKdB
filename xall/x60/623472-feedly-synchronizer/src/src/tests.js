// Feedly Synchronizer AddOn for Mozilla Thunderbird
// Developed by Antonio Miras Aróstegui
// Published under Mozilla Public License, version 2.0 (https://www.mozilla.org/MPL/2.0/)

include("src/opml.js");
Services.scriptloader.loadSubScript("chrome://messenger-newsblog/content/feed-subscriptions.js");

var tests = {

	saved : {
		accountKey : "",
		tokenAccess : "",
		tokenRefresh : "",
	},

	count : 5,

	begin : function() {
		auth.testing = true;
		statusFile.reset();

		let id = addonId;
		opml.file = FileUtils.getFile("ProfD", [id, "data", "testSubs.opml"], false);

		// Save current state
		tests.saved.accountKey = getPref("synch.account");
		tests.saved.tokenAccess = auth.tokenAccess;
		tests.saved.tokenRefresh = auth.tokenRefresh;

		// Create new account to perform tests in
		let account = FeedUtils.createRssAccount("Tests Account");
		setPref("synch.account", account.key);

		tests.login();
	},

	login : function() {
		auth.tokenAccess = "";
		auth.tokenRefresh = "";
		setPref("auth.tokenRefresh", "");

		let action = function() {
			log.writeLn("PASSED 1/" + tests.count + " : Full Authenticaton", true);
			tests.resumeLogin();
		};
		let error = function() {
			log.writeLn("MISSED 1", true);
			tests.end();
		};
		synch.authAndRun(action, error);
	},

	resumeLogin : function () {
		auth.tokenAccess = "";

		let action = function() {
			log.writeLn("PASSED 2/" + tests.count + " : Partial Authentication", true);
			tests.importOpml();
		};
		let error = function() {
			log.writeLn("MISSED 2", true);
			tests.end();
		};
		synch.authAndRun(action);
	},

	scopeDOMParser : null,

	importOpml : function() {
		function onCompareOmplJsonFinished(result) {
			if (result) {
				log.writeLn("PASSED 3/" + tests.count + " : Import OPML locally", true);
				tests.deleteAllLocal();
			}
			else {
				log.writeLn("MISSED 3: Opml and subscriptions differ", true);
				tests.end();
			}
		}

		let server = getIncomingServer();
		if (opml.file.exists() && server !== null) {

			// feed-subscriptions.js is not designed to work as an stand alone module
			// This is a HACK to make the functions necessary for importOPMLFile
			// to work available within the scope
			tests.scopeDOMParser = DOMParser;
			DOMParser = function() {
				return Components.classes["@mozilla.org/xmlextras/domparser;1"]
					.createInstance(Components.interfaces.nsIDOMParser);
			};
			setTimeout = function(callback) {
				win.setTimeout(callback);
			};

			synch.onSubscribeFeedsFinished = function() {
				// I believe it's safe to assume  local import will be done before subscriptions
				synch.getFeedlySubs(function(jsonResponse) {
					opml.compare2JsonObj(jsonResponse, onCompareOmplJsonFinished);
				});
			};
			FeedSubscriptions.importOPMLFile(opml.file, server, function() {
				// Undo HACK. Clean Scope
				DOMParser = tests.scopeDOMParser;
				setTimeout = undefined;
			});
		}
		else {
			log.writeLn("MISSED 3: No OPML file in directory or unable to retrieve server", true);
			tests.end();
		}
	},

	deleteAllLocal : function() {
		synch.onSubscribeFeedsFinished = function() {
			synch.getFeedlySubs(function(jsonResponse) {
				if (jsonResponse.length === 0) {
					log.writeLn("PASSED 4/" + tests.count + " : Delete all local", true);
					tests.subscribeRemote();
				}
				else {
					log.writeLn("MISSED 4: Some subscriptions remain after everything was deleted", true);
					tests.end();
				}
			});
		};

		let rootFolder = getRootFolder();
		if (rootFolder === null) {
			log.writeLn("MISSED 4: Unable to retrieve root folder", true);
			tests.end();
			return;
		}

		let fldTreeViewOp = { refresh : false };
		for (var fldCategory of fixIterator(rootFolder.subFolders, Components.interfaces.nsIMsgFolder)) {
			for (var fldName of fixIterator(fldCategory.subFolders, Components.interfaces.nsIMsgFolder)) {
				let tbSub = synch.getFeedFromFolder(fldName);
				if (tbSub === null)
					continue;

				synch.removeFromTB(fldName, fldTreeViewOp);
			}
		}
		win.gFolderTreeView._rebuild();
	},

	subscribeRemote : function() {
		function onCompareOmplJsonFinished(result) {
			if (result) {
				log.writeLn("PASSED 5/" + tests.count + " : Synchronize. Subscribe locally", true);
				tests.end();
			}
			else {
				log.writeLn("MISSED 5: Opml and subscriptions differ", true);
				tests.end();
			}
		}

		// By now, OPML file should've already been parsed
		if (opml.dom === null || opml.dictionary === null) {
			log.writeLn("MISSED 5: Error while parsing file", true);
			tests.end();
			return;
		}

		let subscribe = [];
		for (var key in opml.dictionary) {
			subscribe.push( { id : key, name : opml.dictionary[key].title, category : opml.dictionary[key].category } );
		}

		// After step 4, no remote subscriptions remain. We need first to subscribe again, then synchronize locally
		synch.subscribe(subscribe, "Testing");
		synch.onSubscribeFeedsFinished = function() {
			synch.onUpdateFinished = function() {
				synch.getFeedlySubs(function(jsonResponse) {
					opml.compare2JsonObj(jsonResponse, onCompareOmplJsonFinished);
				});
			};
			synch.begin();
		};

	},

	end : function() {
		function onSynchAccountRemoved() {
			setPref("synch.account", tests.saved.accountKey);
			auth.tokenAccess = tests.saved.tokenAccess;
			auth.tokenRefresh = tests.saved.tokenRefresh;
			setPref("auth.tokenRefresh", auth.tokenRefresh);

			auth.testing = false;
			opml.file = null;
		}

		feedEvents.onSynchAccountRemoved = onSynchAccountRemoved;

		// Remove tests account
		let accountKey = getPref("synch.account");
		let account = MailServices.accounts.getAccount(accountKey);
		MailServices.accounts.removeAccount(account);
	},
};