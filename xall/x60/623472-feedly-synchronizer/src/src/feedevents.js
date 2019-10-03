Components.utils.import("resource:///modules/FeedUtils.jsm");
include("src/statusFile.js");
include("src/synch.js");

var feedEvents = {
		retryCount : 0,

		importOPMLFinishedBak : null,

		mainWndCmdListener : function(event) {
			if (event === null || event.target === null)
				return;
			if (event.target.id !== "folderPaneContext-subscribe")
				return;

			// Wait until subscriptions window is ready to trap its commands
			// There must be a better way to do this but...
			feedEvents.retryCount = 0;
			let subscriptionsWindow = null;
			let interval = win.setInterval(function() {
				subscriptionsWindow =
				    Services.wm.getMostRecentWindow("Mail:News-BlogSubscriptions");
				if (subscriptionsWindow !== null) {
					win.clearInterval(interval);
					log.writeLn("FeedEvents.mainWndCmdListener");

					// Trap OPML import ending
					let feedSubscriptions = subscriptionsWindow.FeedSubscriptions;
					feedEvents.importOPMLFinishedBak = feedSubscriptions.importOPMLFinished;
					feedSubscriptions.importOPMLFinished = function (aStatusReport, aLastFolder, aWin) {
						feedSubscriptions.importOPMLFinished = feedEvents.importOPMLFinishedBak;
						feedSubscriptions.importOPMLFinished(aStatusReport, aLastFolder, aWin);
						feedEvents.importOPMLFinishedBak = null;
						feedEvents.onImportOPMLFinished();
					};
				}
				else if (feedEvents.retryCount < 20) {
					feedEvents.retryCount++;
				}
				else {
					log.writeLn("feedEvents.mainWndCmdListener. Unable to get subscription dialog");
					win.clearInterval(interval);
				}
			}, 300);
		},

		// Thunderbird Server, Feed and Folder hierarchy:
		// Only the first feed of feedname-level folders will be synchronized
		//		Server1 => Local (Not marked as synchronizable in TB Settings)
		//		Server2 => Syncronized (Marked)
		//			Folder2-1, ..., Folder2-N: Category n name => Synchronized
		//				Feed2-n-1, ..., Feed2-n-K  => Local
		//				Folder2-n-1, ..., Folder2-n-L: Feed l name => Synchronized
		//					Feed2-n-l-1 => Synchronized
		//					Feed2-n-l-2, ..., Feed2-n-l-M => Local
		//					Folder(...) : All folder in lower levels are local
		checkFolderLevel : function(aFolder) {
			if (aFolder === null)
				return false;
			let aParentFolder = aFolder.parent;
			if (aParentFolder === null)
				return false;
			let rootFolder = getRootFolder();
			if (rootFolder === null)
				return false;
			if (aParentFolder.parent !== rootFolder)
				return false;
			return true;
		},

		subscribed : [],

		onImportOPMLFinished : function() {
			if (synchDirection.isDownload())
				return;

			if (feedEvents.subscribed.length <= 0)
				return;
			log.writeLn("FeedEvents.onImportOPMLFinished. Count=" + feedEvents.subscribed.length);
			feedEvents.feedFolders = {};
			let action = function() {
				synch.subscribe(feedEvents.subscribed, "FeedEvents.onImportOPMLFinished");
				feedEvents.subscribed = [];
			};
			synch.authAndRun(action);
		},

		// Helper dictionary. Stores whether a folder contains feeds
		// Intended to avoid calling repeatedly FeedUtils.getFeedUrlsInFolder which seems inefficient
		feedFolders : {},

		onAddFeed : function(aFeed) {
			if (synchDirection.isDownload())
				return;

			if (synch.updateRunning)
				return;
			if (FeedSubscriptions === undefined || FeedSubscriptions === null) {
				log.writeLn("FeedEvents.onAddFeed. No FeedSubscriptions object within scope. Unexpected situation");
				return;
			}
			if (!feedEvents.checkFolderLevel(aFeed.folder))
				return;
			if (aFeed.mFolder === null || aFeed.mFolder.parent === null) {
				log.writeLn("FeedEvents.onAddFeed. No parent folder. Cannot retrieve category");
				return;
			}

			if (FeedSubscriptions.mActionMode !== FeedSubscriptions.kImportingOPML) {
				let feedUrlArray = FeedUtils.getFeedUrlsInFolder(aFeed.mFolder);
				if (feedUrlArray !== null && feedUrlArray.length > 1) {
					log.writeLn("FeedEvents.onAddFeed. Only first feed of folder will be synchronized. Ignored: " + aFeed.url);
					return;
				}
				let action = function() {
					synch.subscribe( { id : aFeed.url, name : aFeed.title, category : aFeed.mFolder.parent.name },
						"FeedEvents.onAddFeed");
				};
				synch.authAndRun(action);
			}
			else {
				switch (feedEvents.feedFolders[aFeed.mFolder.URI]) {
				// Mark as processed to avoid subsequent calling
				case undefined:
					feedEvents.feedFolders[aFeed.mFolder.URI] = true;
					let feedUrlArray = FeedUtils.getFeedUrlsInFolder(aFeed.mFolder);
					if (feedUrlArray !== null && feedUrlArray.length > 1)
						return;
					break;

				// The folder has subscribed a feed
				case true:
					return;
				}
				feedEvents.subscribed.push( { id : aFeed.url, name : aFeed.title, category : aFeed.mFolder.parent.name } );
			}
		},

		isRootFolder : function(item) {
			if (item === null)
				return false;
			if (!(item instanceof Components.interfaces.nsIMsgFolder))
				return false;

			let parentItem = item.parent;
			if (parentItem !== null)
				return false;
			if (item.server === null || item.server.type !== "rss")
				return false;

			let accountKey = getPref("synch.account");
			if (accountKey === "")
				return false;

			let account = MailServices.accounts.getAccount(accountKey);
			if (account === null) {
				log.writeLn("synch.isRootFolder. Account not found: " + accountKey);
				return false;
			}

			return account.incomingServer === item.server;
		},

		isCategoryFolder : function(item) {
			return feedEvents.isRootFolder(item.parent);
		},

		isFeedFolder : function(item) {
			return feedEvents.isCategoryFolder(item.parent);
		},

		unsubscribed : [],

		onSynchAccountRemoved : null,

		OnItemRemoved : function(parentItem, item) {
			// If an account was selected but root folder cannot be retrieved
			// it is safe to assume it was deleted
			let accountKey = getPref("synch.account");
			let rootFolder = getRootFolder();
			if (accountKey !== "" && rootFolder === null) {
				log.writeLn("FeedEvents.OnItemRemoved. Removing synchronized account");
				setPref("synch.account", "");
				statusFile.reset();

				if (feedEvents.onSynchAccountRemoved !== null) {
					feedEvents.onSynchAccountRemoved();
					feedEvents.onSynchAccountRemoved = null;
				}
				return;
			}

			if (synchDirection.isDownload())
				return;
			if (synch.updateRunning)
				return;
			if (feedEvents.unsubscribed.length <= 0)
				return;

			log.writeLn("FeedEvents.OnItemRemoved. Count=" + feedEvents.unsubscribed.length);
			let action = function () {
				synch.unsubscribe(feedEvents.unsubscribed, "FeedEvents.OnItemRemoved");
				feedEvents.unsubscribed = [];
			};
			synch.authAndRun(action);
		},

	    folderRenamed : function(aOrigFolder, aNewFolder) {
	    	if (feedEvents.isFeedFolder(aNewFolder)) {
		    	// To rename a feed, simply subscribe again
				let feedId = synch.getFeedFromFolder(aNewFolder);
	    		synch.subscribe( { id : feedId, name : aNewFolder.prettyName, category : aNewFolder.parent.prettyName },
					"FeedEvents.folderRenamed");
	    	}
	    	else if (feedEvents.isCategoryFolder(aNewFolder))
	    		synch.renameCategory(aOrigFolder.prettyName, aNewFolder.prettyName);
	    },

		onDeleteFeed : function(aFeed) {
			if (synchDirection.isDownload())
				return;

			if (synch.updateRunning)
				return;

			// Do not use synch.checkFolderLevel. By this point, parent folder is recycle bin
			let rootFolder = getRootFolder();
			if (rootFolder === null)
				return;
			if (aFeed.folder.rootFolder !== rootFolder)
				return;
			if (statusFile.find(aFeed.resource.Value) === null)
				return;

			let subsWnd = Services.wm.getMostRecentWindow("Mail:News-BlogSubscriptions");
			if (subsWnd !== null) {
				let action = function() {
					synch.unsubscribe( { id : aFeed.resource.Value },
						"FeedEvents.onDeleteFeed");
				};
				synch.authAndRun(action);
			}
			else
				feedEvents.unsubscribed.push( { id : aFeed.resource.Value } );
		},

		addFeedBak : null,
		deleteFeedBak : null,

		addFeed : function(aFeed) {
			FeedUtils.addFeed = feedEvents.addFeedBak;
			FeedUtils.addFeed(aFeed);
			FeedUtils.addFeed = feedEvents.addFeed;
			feedEvents.onAddFeed(aFeed);
		},

		deleteFeed : function(aFeed) {
			feedEvents.onDeleteFeed(aFeed);
			FeedUtils.deleteFeed = feedEvents.deleteFeedBak;
			FeedUtils.deleteFeed(aFeed);
			FeedUtils.deleteFeed = feedEvents.deleteFeed;
		},

		addListener : function() {
			log.writeLn("FeedEvents.AddListener. Locale = " + retrieveLocale());

			// Folder events listeners
			MailServices.mailSession.AddFolderListener(this,
					Components.interfaces.nsIFolderListener.removed);
		    MailServices.mfn.addListener(this,
		    		Components.interfaces.nsIMsgFolderNotificationService.folderRenamed);

			// Main window command listener
			win.addEventListener("command", feedEvents.mainWndCmdListener, false);

			// We need to know when user's subscribed/unsuscbrided to a Feed
			feedEvents.addFeedBak = FeedUtils.addFeed;
			FeedUtils.addFeed = feedEvents.addFeed;
			feedEvents.deleteFeedBak = FeedUtils.deleteFeed;
			FeedUtils.deleteFeed = feedEvents.deleteFeed;

			// Update timer and preference listener
			Services.prefs.addObserver("extensions.FeedlySync.synch.timeout", synch, false);
			Services.prefs.addObserver("extensions.FeedlySync.synch.account", synch, false);
			synch.setTimer();
		},

		removeListener : function() {
			log.writeLn("FeedEvents.RemoveListener");

			MailServices.mailSession.RemoveFolderListener(this);
			MailServices.mfn.removeListener(this);

			win.removeEventListener("command", feedEvents.mainWndCmdListener);

			FeedUtils.addFeed = feedEvents.addFeedBak;
			feedEvents.addFeedBak = null;
			FeedUtils.deleteFeed = feedEvents.deleteFeedBak;
			feedEvents.deleteFeedBak = null;

			Services.prefs.removeObserver("extensions.FeedlySync.synch.timeout", synch);
			Services.prefs.removeObserver("extensions.FeedlySync.synch.account", synch);
			synch.delTimer();
		}
	};
