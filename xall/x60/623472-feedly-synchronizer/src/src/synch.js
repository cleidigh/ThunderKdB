// Feedly Synchronizer AddOn for Mozilla Thunderbird
// Developed by Antonio Miras Aróstegui
// Published under Mozilla Public License, version 2.0 (https://www.mozilla.org/MPL/2.0/)

Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource:///modules/iteratorUtils.jsm");
Components.utils.importGlobalProperties(["XMLHttpRequest"]);

var synch = {
	activityMng : null,
	process : null,

	// Object initialization
	startup : function() {
		if (synch.activityMng === null) {
			synch.activityMng = Components.classes["@mozilla.org/activity-manager;1"].
				getService(Components.interfaces.nsIActivityManager);
		}
		statusFile.read();
	},

	// Begin synchronization process
	begin : function () {
		synch.getFeedlySubs();
	},

	actionInProgress : null,

	openSettingsDialog : function(addon) {
		log.writeLn("synch.OpenSettingDialog");
		Services.ww.openWindow(null, addon.optionsURL, null, "chrome,private,centerscreen,modal", this);
		if (getPref("synch.account") === "")
			log.writeLn("synch.OpenSettingDialog. No account. Action=" + synch.actionInProgress);
		else
			synch.authAndRun(synch.actionInProgress);
		synch.actionInProgress = null;
	},

	// Ensure account and authentication before running action
	authAndRun : function(action, error) {
		let account = getPref("synch.account");
		let ready = auth.ready();

		log.writeLn("synch.authAndRun. Account = " + account + " Ready = " + ready);

		if (account === "") {
			AddonManager.getAddonByID(addonId, synch.openSettingsDialog);
			synch.actionInProgress = action;
			return;
		}

		if (!ready) {
			auth.onFinished = function(success) {
				// I'd better null the handler before running the action, in case another authentication
				// operation is called
				auth.onFinished = null;

				if (success)
					action();
				else {
					log.writeLn("synch.authAndRun. Unable to authenticate. Action=" + action);
					if (error !== undefined)
						error();
				}
			};
			auth.init();
		}
		else
			action();
	},

	getFeedlySubs : function(callback) {
		log.writeLn("synch.getFeedlySubs");

		let req = new XMLHttpRequest();
		let fullUrl = auth.getBaseUrl() + getPref("synch.subsOp");
		fullUrl = encodeURI(fullUrl);
		req.open("GET", fullUrl, true);
		req.setRequestHeader(getPref("synch.tokenParam"), auth.tokenAccess);
		req.onload = function (e) {
			if (e.currentTarget.readyState == 4) {
				log.writeLn(formatEventMsg("synch.getFeedlySubs", e));
				if (e.currentTarget.status == 200) {
					let jsonResponse = JSON.parse(e.currentTarget.responseText);
					if (callback === undefined)
						synch.update(jsonResponse);
					else
						callback(jsonResponse);
				}
				else {
					synch.updateTout429(e);
					return;
				}
			}
		};
		req.onerror = function (error) {
			log.writeLn(formatEventMsg("synch.getFeedlySubs. Error", error));
		};

		if (synch.isOkTout429()) {
			log.writeLn("synch.getFeedlySubs. Url: " + fullUrl);
			req.send(null);
		}
	},

	subscribeFeed : function(feed, op, next) {
		let onLoadAdd = function(e) {
			if (e.currentTarget.readyState == 4) {
				log.writeLn(formatEventMsg("synch.subscribeFeed.onLoadAdd ", e));
				if (e.currentTarget.status == 200) {
					if (statusFile.find(feed.id) === null)
						statusFile.add(feed.id);
					else
						log.writeLn("synch.subscribeFeed.onLoadAdd. Already in status file");
				}
				else
					synch.updateTout429(e);

				next();
			}
		};

		let onLoadDel = function(e) {
			if (e.currentTarget.readyState == 4) {
				log.writeLn(formatEventMsg("synch.subscribeFeed.onLoadDel ", e));
				if (statusFile.find(feed.id) !== null) {
					if (e.currentTarget.status == 200)
						statusFile.remove(feed.id);
					else {
						synch.updateTout429(e);
						statusFile.markAsDeleted(feed.id);
					}
				}
				else
					log.writeLn("synch.subscribeFeed.onLoadDel. Not in status file. Unexpected situation");

				next();
			}
		};

		let onErrorAdd = function(error) {
			log.writeLn(formatEventMsg("synch.subscribeFeed.onErrorAdd ", error));
			next();
		};

		let onErrorDel = function(error) {
			log.writeLn(formatEventMsg("synch.subscribeFeed.onErrorDel ", error));

			// Unable to unsubscribe. Mark feed as deleted. It will be removed in the future.
			if (statusFile.find(feed.id) !== null)
				statusFile.markAsDeleted(feed.id);
			else
				log.writeLn("synch.subscribeFeed.onErrorDel. Not in status file. Unexpected situation");

			next();
		};

		let req = new XMLHttpRequest();
		let jsonSubscribe = null;
		let fullUrl = encodeURI(auth.getBaseUrl() + getPref("synch.subsOp") + "/");

		if (op) {
			req.open("POST", fullUrl, true);
			req.setRequestHeader(getPref("synch.tokenParam"), auth.tokenAccess);
			req.setRequestHeader("Content-Type", "application/json");
			jsonSubscribe = "{\n";
			if (!synch.isUncategorized(feed.category)) {
				jsonSubscribe += "\t\"categories\" : [\n";
				jsonSubscribe += "\t\t{\n";
				jsonSubscribe += "\t\t\t\"id\" : \"user/" + auth.userId +
								"/category/" + feed.category + "\",\n";
				jsonSubscribe += "\t\t\t\"label\" : \"" + feed.category + "\"\n";
				jsonSubscribe += "\t\t}\n";
				jsonSubscribe += "\t],\n";
			}
			else
				jsonSubscribe += "\t\"categories\" : [],\n";
			jsonSubscribe += "\t\"id\" : \"feed/" + feed.id + "\",\n";
			jsonSubscribe += "\t\"title\" : \"" + feed.name + "\"\n";
			jsonSubscribe += "}";

			req.onload = onLoadAdd;
			req.onerror = onErrorAdd;
		}
		else {
			fullUrl = fullUrl + encodeURIComponent("feed/" + feed.id);

			req.open("DELETE", fullUrl, true);
			req.setRequestHeader(getPref("synch.tokenParam"), auth.tokenAccess);

			req.onload = onLoadDel;
			req.onerror = onErrorDel;
		}

		if (synch.isOkTout429()) {
			log.writeLn("synch.subscribeFeed. Add: " + op + " Url: " + fullUrl + " Json: " + jsonSubscribe);
			req.send(jsonSubscribe);
		}
	},

	onSubscribeFeedsFinished : null,
	subsTo : [],
	subsOp : [],

	subscribeFeeds : function(subs, addOp, message) {
		if (synchDirection.isDownload()) {
			log.writeLn("synch.subscribeFeeds. In download mode. Unexpected situation. Aborted");
			return;
		}
		if (Object.prototype.toString.call(subs) !== "[object Array]") {
			subs = [].concat(subs);
		}
		if (subs.length <= 0)
			return;

		// Looks like the server is limited to one subscription each time.
		// Sometimes when trying to subscribe when another operation is running, we get
		// a response 200 status, but truth is the feed hasn't subscribed
		// Enqueue all ops
		let running = synch.subsTo.length > 0;
		synch.subsTo.push(subs);
		synch.subsOp.push(addOp);
		if (running) {
			log.writeLn("synch.subscribeFeeds. Queued. Add = " + addOp + " Entries = " + subs.length +
					" Op. Count = " + synch.subsTo.length + " Caller = " + message);
			return;
		}
		else
			log.writeLn("synch.subscribeFeeds. Begin. Add = " + addOp + " Entries = " +
					synch.subsTo.length + " Caller = " + message);

		let procOp = 0;
		let procEntry = 0;

		let subTo;
		let subOp;
		let subLogMsg;

		let begin = function() {
			// All operations done. Quit
			if (procOp >= synch.subsTo.length) {
				synch.subsTo = [];
				synch.subsOp = [];
				statusFile.write();
				if (synch.onSubscribeFeedsFinished !== null) {
					synch.onSubscribeFeedsFinished();
					synch.onSubscribeFeedsFinished = null;
				}

				return;
			}

			synch.process = Components.classes["@mozilla.org/activity-process;1"].
				createInstance(Components.interfaces.nsIActivityProcess);

			let folder = getRootFolder();
			let procCaption = addOp ? _("beginSubs", retrieveLocale()) : _("beginUnsubs", retrieveLocale());
			synch.process.init(procCaption + ": " + folder.prettyName, null);
			synch.process.contextType = "account";
			synch.process.contextObj = folder.server;
			synch.activityMng.addActivity(synch.process);

			procEntry = 0;
			subTo = synch.subsTo[procOp];
			subOp = synch.subsOp[procOp];

			log.writeLn("synch.subscribeFeeds. " +
					"Entries (" + (procEntry + 1) + "/" + subTo.length + ") " +
					"Ops (" + (procOp + 1) + "/" + synch.subsTo.length + ")");
			synch.subscribeFeed(subTo[procEntry], subOp, next);
		};

		let next = function() {
			if (procEntry == subTo.length - 1) {
				synch.process.state = Components.interfaces.nsIActivityProcess.STATE_COMPLETED;
				synch.activityMng.removeActivity(synch.process.id);

				let event = Components.classes["@mozilla.org/activity-event;1"].
					createInstance(Components.interfaces.nsIActivityEvent);
				let folder = getRootFolder();

				let evntCaption = addOp ? _("endSubs", retrieveLocale()) : _("endUnsubs", retrieveLocale());
				event.init(evntCaption + ": " + folder.prettyName,
				           null,
				           "",
				           synch.process.startTime,
				           Date.now());
				event.contextType = synch.process.contextType;
				event.contextObj = synch.process.contextObj;
				synch.activityMng.addActivity(event);
				synch.process = null;

				procOp++;
				begin();
			}
			else {
				let procCaption = addOp ? _("runSubs", retrieveLocale()) : _("runUnsubs", retrieveLocale());
				let msg = procCaption + ": (" + (procEntry + 1) + "/" + subTo.length +")";
				synch.process.setProgress(msg,
						procEntry + 1, subTo.length);

				procEntry++;
				log.writeLn("synch.subscribeFeeds. " +
						"Entries (" + (procEntry + 1) + "/" + subTo.length + ") " +
						"Ops (" + (procOp + 1) + "/" + synch.subsTo.length + ")");
				synch.subscribeFeed(subTo[procEntry], subOp, next);
			}
		};

		begin();
	},

	subscribe : function(subscribe, message) {
		synch.subscribeFeeds(subscribe, true, message);
	},

	unsubscribe : function(unsubscribe, message) {
		synch.subscribeFeeds(unsubscribe, false, message);
	},

	renameCategory : function(oldName, newName) {
		let req = new XMLHttpRequest();
		let fullUrl = encodeURI(auth.getBaseUrl() + getPref("synch.categoryOp") + "/");
		fullUrl = fullUrl + encodeURIComponent("user/" + auth.userId + "/category/"  + oldName);

		req.open("POST", fullUrl, true);
		req.setRequestHeader(getPref("synch.tokenParam"), auth.tokenAccess);
		req.setRequestHeader("Content-Type", "application/json");
		let jsonRename = "{\n";
		jsonRename += "\t\"label\" : \"" + newName + "\"\n";
		jsonRename += "}";
		req.onload = function(e) {
			if (e.currentTarget.readyState == 4) {
				log.writeLn(formatEventMsg("synch.renameCategory.onLoad ", e));
			}
		};
		req.onerror = function (error) {
			log.writeLn(formatEventMsg("synch.renameCategory.onerror ", error));
		};

		if (synch.isOkTout429()) {
			log.writeLn("synch.renameCategory. Url: " + fullUrl + " Json: " + jsonRename);
			req.send(jsonRename);
		}
	},

	// Returns feed url, given a Thunderbird folder
	//		tbFolder: nsIMsgFolder
	getFeedFromFolder : function(tbFolder) {
		let tbSubs = FeedUtils.getFeedUrlsInFolder(tbFolder);
		if (tbSubs === null)
			return null;

		let tbSub = null;

		// Select the one at the bigger index position, as Thundebird store the older in the last position
		for (var i = tbSubs.length - 1; i >= 0; i--) {
			// Sometimes an element is empty
			if (tbSubs[i] === "")
				continue;

			// A synchronized entry prevails over the rest.
			if (statusFile.find(tbSubs[i]) !== null) {
				tbSub = tbSubs[i];
				break;
			}
			if (tbSub === null)
				tbSub = tbSubs[i];
		}
		return tbSub;
	},

	// Returns the name if feed with the id was removed from subscription list
	// 		id: string containing feed url
	//		category: string contaning feed category name
	// 		feedlySubs: JSON retrieved from server
	getNameAndRemove : function(id, category, feedlySubs) {
		let i, j;
		let found = false;

	    for (i = 0; i < feedlySubs.length; i++) {
	        let feed = feedlySubs[i];

	        // Keep in mind "feed/" prefix
	        if (feed.id.substring(0, 5) != "feed/") {
	        	log.writeLn("synch.update. Missing 'feed/' in feed identifier");
	        	continue;
	        }
	        let feedId = feed.id.substring(5, feed.id.length);
	        if (feedId == id) {
	        	if (synch.isUncategorized(category)) {
	        		found = true;
	        		break;
	        	}
	        	else {
			        for (j = 0; j < feed.categories.length; j++) {
			        	if (feed.categories[j].label == category) {
			        		found = true;
			        		break;
			        	}
			        }
	        	}
	        }
	        if (found)
	        	break;
	    }

	    // Remove feed from list so it won't be processed in second pass
	    let feedName = null;
	    if (found) {
	    	feedName = feedlySubs[i].title;

	    	if (!synch.isUncategorized(category))
	    		feedlySubs[i].categories.splice(j, 1);
			if (feedlySubs[i].categories.length === 0)
				feedlySubs.splice(i, 1);
	    }

	    return feedName;
	},

	isUncategorized : function(category) {
		return category === "" || category === _("uncategorized", retrieveLocale());
	},

	removeFromTB : function(fldName, fldTreeViewOp) {
		let fldCategory = fldName.parent;
		if (fldCategory === null) {
			log.writeLn("synch.removeFromTB. Unable to get category folder. Unexpected situation");
			return;
		}
		let fldAccount = fldCategory.parent;
		if (fldAccount === null) {
			log.writeLn("synch.removeFromTB. Unable to get account folder. Unexpected situation");
			return;
		}

		// If the folder we're about to delete is collapsed, refreshing the tree will be necessary
		if (fldTreeViewOp !== undefined) {
			if (!fldTreeViewOp.refresh) {
				let index = win.gFolderTreeView.getIndexOfFolder(fldCategory);
				if (index === null || !win.gFolderTreeView.isContainerOpen(index)) {
					fldTreeViewOp.refresh = true;
					log.writeLn("synch.removeFromTB. Category folder collapsed (" +
							fldCategory.prettyName + ")");
				}
			}
		}

		// Delete rss folder
		let array = toXPCOMArray([fldName], Components.interfaces.nsIMutableArray);
		fldCategory.deleteSubFolders(array, null);

		// Delete category folder if empty
		if (!fldCategory.subFolders.hasMoreElements()) {
			let array = toXPCOMArray([fldCategory], Components.interfaces.nsIMutableArray);
			fldAccount.deleteSubFolders(array, null);
		}
	},

	// Flag to indicate whether synch.update method is running
	updateRunning : false,
	onUpdateFinished : null,

	// Synchronize Thunderbird and Feedly
	update : function (feedlySubs) {
		let rootFolder = getRootFolder();
		if (rootFolder === null)
			return;

		let fldTreeViewOp = { refresh : false };
		let writeDOM = false;
		synch.updateRunning = true;

		try {
			// TODO: Hay que ver que se hace con los uncategorized
			// First pass: Thunderbird subscriptions
			let subscribe = [];
			for (var fldCategory of fixIterator(rootFolder.subFolders, Components.interfaces.nsIMsgFolder)) {
				for (var fldName of fixIterator(fldCategory.subFolders, Components.interfaces.nsIMsgFolder)) {

					let tbSub = synch.getFeedFromFolder(fldName);
					if (tbSub === null)
						continue;

				    // Find pair (feedId-category) in Thunderbird's selected account
					let tbCategory = fldCategory.prettyName;
					let nameInServer = synch.getNameAndRemove(tbSub, tbCategory, feedlySubs);
					if (nameInServer !== null) {
						// If Feed is subscribed in Thunderbird, it should also be present in
						// status file. Add otherwise
						if (statusFile.find(tbSub) === null) {
							writeDOM = true;
							log.writeLn("synch.update. Not found in status file, but present on both sides. Add. (" +
									fldName.prettyName + ")");
							statusFile.add(tbSub);
						}

						// Feed name might have changed
						if (nameInServer !== fldName.prettyName) {
							if (synchDirection.isDownload()) {
								let selFlds = win.gFolderTreeView.getSelectedFolders();
								if (selFlds.length > 0) {
									if (selFlds[0] === fldName)
										win.gFolderTreeView.selection.clearSelection();
								}
								fldName.rename(nameInServer, null);
							}
						}

						// (feedId-category) found both in server and client. Nothing else to do
						continue;
					}

				    // Subscribed in Thunderbird but not in Feedly
			    	// Check whether this feed was previously synchronized. If so, delete locally
					if (statusFile.find(tbSub) !== null) {
						if (synchDirection.isUpload()) {
							subscribe.push( { id : tbSub , name : fldName.prettyName,
								category : tbCategory } );
						}
						else {
							synch.removeFromTB(fldName, fldTreeViewOp);

							switch (statusFile.getStatus(tbSub)) {
							case FEED_LOCALSTATUS_SYNC:
								log.writeLn("synch.update. Svr=0 TB=1. Removing from TB: " + tbSub);
								break;
							case FEED_LOCALSTATUS_DEL:
								log.writeLn("synch.update. Svr=0 TB=1. Removing from TB: " + tbSub +
									" Status deleted in ctrl file. Unexpected situation");
								break;
							default:
								log.writeLn("synch.Update. Svr=0 TB=1. Removing from TB: " + tbSub +
									" Ctrl file may be corrupted 1");
							};

							// Remove DOM node from Ctrl file
							writeDOM = true;
							statusFile.remove(tbSub);
						}
					}

					// Not synchronized. Add to Feedly
					else {
						if (synchDirection.isDownload()) {
							synch.removeFromTB(fldName, fldTreeViewOp);
							log.writeLn("synch.update. Svr=0 TB=1. Removing from TB: " + tbSub);
						}
						else {
							subscribe.push( { id : tbSub , name : fldName.prettyName,
								category : tbCategory } );
						}
					}
				}
			}

			// Second pass: Feedly subscriptions.
			// After first pass, remaining categories are guaranteed not to be present in Thunderbird
			let unsubscribe = [];
		    for (var subIdx = 0; subIdx < feedlySubs.length; subIdx++) {
		        let feed = feedlySubs[subIdx];
		        let feedId = feed.id.substring(5, feed.id.length); // Get rid of "feed/" prefix
		        let runOnce = true;
		        for (var categoryIdx = 0; categoryIdx < feed.categories.length || runOnce; categoryIdx++) {
		        	runOnce = false;
		        	let categoryName;
		        	if (feed.categories.length > 0)
		        		categoryName = feed.categories[categoryIdx].label;
		        	else
		        		categoryName = _("uncategorized", retrieveLocale());

					// Check whether this feed was locally deleted. If so, delete on server
					if (statusFile.find(feedId, FEED_LOCALSTATUS_DEL) !== null) {
						if (!synchDirection.isDownload()) {
							let fullUrl = encodeURI(feedId);

							// Just save the Id of the feed I want to unsubscribe. Will be processed later
							unsubscribe.push( { id : fullUrl } );
						}
					}

					// Feed not found in Thunderbird
					else {
						if (synchDirection.isUpload()) {
							let fullUrl = encodeURI(feedId);
							unsubscribe.push( { id : fullUrl } );
						}
						else {
							// Create category if necessary
							let fldCategory2;
							try {
								fldCategory2 = rootFolder.getChildNamed(categoryName);
							}
							catch (ex) {
								fldCategory2 = null;
							}
							if (fldCategory2 === null) {
								rootFolder.QueryInterface(Components.interfaces.nsIMsgLocalMailFolder).
									createLocalSubfolder(categoryName);
								fldCategory2 = rootFolder.getChildNamed(categoryName);
								log.writeLn("synch.update. Svr=1 TB=0. Add to TB. Creating category: " + categoryName);
							}
							else
								log.writeLn("synch.update. Svr=1 TB=0. Add to TB. Category found: " + categoryName);

							// Create feed folder
							let feedName = feed.title;
							let fldFeed;
							let wasCreated = false;
							try {
								fldFeed = fldCategory2.getChildNamed(feedName);
							}
							catch (ex) {
								fldFeed = null;
							}
							if (fldFeed === null) {
								fldCategory2.QueryInterface(Components.interfaces.nsIMsgLocalMailFolder).
									createLocalSubfolder(feedName);
								fldFeed = fldCategory2.getChildNamed(feedName);
								wasCreated = true;
							}

							// Subscribe
							if (!FeedUtils.feedAlreadyExists(feedId, fldFeed.server)) {
								let feedAux = new Feed(feedId, fldFeed);
								feedAux.title = feedName;
								FeedUtils.addFeed(feedAux);
								log.writeLn("synch.update. Svr=1 TB=0. Add to TB. Url: " + feedId + " Name: " + feedName);
							}
							else {
								if (wasCreated)
									fldFeed.parent.propagateDelete(fldFeed, true, win.msgWindow);

								log.writeLn("synch.update. Svr=1 TB=0. Feed Already Exists? Url: " + feedId + " Name: " + feedName);
								continue;
							}

							writeDOM = true;
							statusFile.add(feedId);
						}
					}
		        }
		    }

		    // Save Ctrl File for synchronous operations
		    if (subscribe.length <= 0 && unsubscribe.length <= 0) {
		    	if (writeDOM)
		    		statusFile.write();
		    }

		    if (!synchDirection.isDownload()) {
		    	// In case category name was changed, it's better to unsubscribe first
		    	synch.unsubscribe(unsubscribe, "synch.update. Svr=0 TB=1");
			    synch.subscribe(subscribe, "synch.update. Svr=0 TB=1");
		    }

			// After a folder in a collapsed branch is deleted, FolderPane is left in
			// an unstable state. The folder is shown, despite being deleted, and exceptions
			// are thrown. Refresh folder pane
		    if (fldTreeViewOp.refresh) {
		    	log.writeLn("synch.update. Rebuild Folder Pane");
		    	win.gFolderTreeView._rebuild();
		    }
		}
		catch (err) {
			log.writeLn("synch.update. Exception thrown: " + err);
		}
		finally {
			synch.updateRunning = false;

			if (synch.onUpdateFinished !== null) {
				synch.onUpdateFinished();
				synch.onUpdateFinished = null;
			}
		}
	},

	synchTimerId : null,

	setTimer : function () {
		let timeoutMin = getPref("synch.timeout");
		if (timeoutMin < 1) {
			log.writeLn("synch.setTimer. The user interval of choice is too short: " + timeoutMin + " . Revert to 1 minutes");
			timeoutMin = 1;
		}

		let timeout = timeoutMin * 60 * 1000;
		log.writeLn("synch.setTimer. Timeout = " + timeout);

		// Synchronization timeout
		// Set timer to renew access token before expiration
		if (synch.synchTimerId !== null)
			win.clearInterval(synch.synchTimerId);

		synch.synchTimerId = win.setInterval(function synchTimeout() {
			let account = getPref("synch.account");
			let ready = auth.ready();
			log.writeLn("synch.synchTimeout Account = " + account + " Ready = " + ready);

			// Doesn't look like a good idea to automatically show a window without user interaction
			if (account !== "" && ready)
				syncTBFeedly();
		}, timeout);
	},

	delTimer : function () {
		log.writeLn("synch.delTimer");

		if (synch.synchTimerId !== null) {
			win.clearInterval(synch.synchTimerId);
			synch.synchTimerId = null;
		}
	},

	observe : function (aSubject, aTopic, aData) {
		switch (aData) {
		case "extensions.FeedlySync.synch.timeout":
			log.writeLn("synch.observe. Timeout preference changed");
			synch.delTimer();
			synch.setTimer();
			break;
		case "extensions.FeedlySync.synch.account":
			log.writeLn("synch.observe. Account changed");
			statusFile.reset();
			break;
		}
    },

	tout429 : -1,
	updateTout429 : function (e) {
		if (e.currentTarget.status == 429) {
			let newTimeout = e.currentTarget.getResponseHeader("Retry-After");
			if (newTimeout !== null) {
				log.writeLn("synch.updateTout429: Time limit excedeed. Retry-After=" + newTimeout);

				// Timeout in seconds. See https://developer.feedly.com/cloud/ (Rate Limiting)
				let newTimeoutMsec = newTimeout * 1000;
				newTimeoutMsec += 5000; // Plus 5 secs to avoid mismatches between server and client clocks
				let tout429 = Date.now() + newTimeoutMsec;
				if (tout429 > synch.tout429) {
					synch.tout429 = tout429;
					log.writeLn("synch.updateTout429: New timeout=" + newTimeoutMsec);
				}
			}
		}
	},

	isOkTout429 : function() {
		if (synch.tout429 === -1)
			return true;

		let now = Date.now();
		if (now >= synch.tout429) {
			synch.tout429 = -1;
			log.writeLn("synch.isOkTout429: Time limit disabled");
			return true;
		}
		else
			return false;
	},
};