if (!reminderfox)     var reminderfox = {};
if (!reminderfox.network)    reminderfox.network = {};
if (!reminderfox.network.download)    reminderfox.network.download = {};


if(!reminderfox.network.download.reminderFox_download_headless)
	reminderfox.network.download.reminderFox_download_headless = null;

if(!reminderfox.network.download.reminderFox_editWindowCallback)
	reminderfox.network.download.reminderFox_editWindowCallback = null;

if(!reminderfox.network.download.reminderFox_subscriptionCallback)
	reminderfox.network.download.reminderFox_subscriptionCallback = null;

if(!reminderfox.network.download.reminderFox_subscriptionReminders)
	reminderfox.network.download.reminderFox_subscriptionReminders = null;

reminderfox.network.download.reminderFox_download_statustxt = function(aStatus, aError) {
	if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
		document.getElementById("status").value = (aError) ? reminderfox.network.download.reminderFox_download_getErrorMsg(aError) : aStatus;
	} else {
		var value = null;
		if(aError == -1) {
			value = aStatus;
		} else {
			value = (aError) ? reminderfox.network.download.reminderFox_download_getErrorMsg(aError) : aStatus;
		}
		reminderfox.core.logMessageLevel("  Download (headless): "  + value, reminderfox.consts.LOG_LEVEL_FINE);
	}
}

reminderfox.network.download.reminderFox_download_Startup = function() {

    reminderfox.core.logMessageLevel("   [.network.download.reminderFox_download_Startup ] ",        reminderfox.consts.LOG_LEVEL_INFO);
	reminderfox.network.download.reminderFox_download_headless = reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI;
	reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.upload.ready.label"), 0);
	reminderfox.network.download.reminderFox_editWindowCallback = null;
	setTimeout(reminderfox.network.download.reminderFox_downloadDelayedStartup, 0);

}

reminderfox.network.download.reminderFox_download_Startup_headless = function(headlessLevel, callback) {
	reminderfox.network.download.reminderFox_download_headless = headlessLevel;
	reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.upload.ready.label"), 0);
	reminderfox.network.download.reminderFox_editWindowCallback = callback;
	reminderfox.network.download.reminderFox_downloadDelayedStartup();
}

reminderfox.network.download.reminderFox_download_Startup_headless_URL = function(headlessLevel, callback, url, downloadedReminders, downloadedTodos) {
	reminderfox.network.download.reminderFox_download_headless = headlessLevel;
	reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.upload.ready.label"), 0);
	reminderfox.network.download.reminderFox_subscriptionCallback = callback;
	reminderfox.network.download.reminderFox_subscriptionReminders = downloadedReminders;

	var _ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

	var downloadURI = _ioService.newURI(url, null, null);
	if(gDownloadService.start(downloadURI, reminderfox.network.download.reminderFox_downloadCallbackURL))
		reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.upload.request.label"), 0);
	else {
		//statustxt(reminderfox.string("rf.net.done"),0);
		reminderfox.network.download.reminderFox_downloadCallbackURL(reminderfox.string("rf.net.done"), -1);
	}
}

reminderfox.network.download.reminderFox_downloadCallbackURL = function(aStatus, aError) {
	if(aStatus != reminderfox.string("rf.net.done") && aError == 0) {
		reminderfox.network.download.reminderFox_download_statustxt(aStatus, aError);
		return;
	}

	switch(aError) {

		case -2:
			reminderFox_download_statutxt(aStatus, aError);
			if(reminderfox.network.download.reminderFox_subscriptionCallback != null) {
				var statustxt = (aError) ? reminderfox.network.download.reminderFox_download_getErrorMsg(aError) : aStatus;
				reminderfox.network.download.reminderFox_subscriptionCallback(statustxt, 0);
			}
			return;
			break;
		case 0:

			reminderfox.core.logMessageLevel("  Downloading subscribed reminders...", reminderfox.consts.LOG_LEVEL_FINE);

			if(reminderfox.network.download.reminderFox_subscriptionCallback != null) {
				reminderfox.network.download.reminderFox_subscriptionCallback(reminderfox.string("rf.add.network.status.download.label"), 0);
			}
			var processtime = null;
			if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
				processtime = document.getElementById("processtime");
			}
			var time = gDownloadService.time;
			if(processtime != null) {
				processtime.value = gDownloadService.length.toString() + " bytes  " + (time / 1000).toString() + " sec  ";
			}
			var start = new Date();

			reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.upload.process.label"), 0);
			try {
				reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.download.importing.label"), 0);

				var is = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
				is.setData(gDownloadService.data, -1);
				// -1 ... length should be computed

				var downloadedTodos = new Array();
				reminderfox.core.readInRemindersAndTodosICSFromStream(reminderfox.network.download.reminderFox_subscriptionReminders, downloadedTodos, is, true);

				// if successful, close immediately
				if(window.arguments != null && window.arguments[0] != null && window.arguments[0].closeOnNoErrors == 1) {
					close();
					return;
				}

				var end = new Date();
				if(processtime != null) {
					processtime.value += ((end.getTime() - start.getTime()) / 1000).toString() + " sec";
				}
				reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.net.done"), 0);

				if(reminderfox.network.download.reminderFox_subscriptionCallback != null) {
					reminderfox.network.download.reminderFox_subscriptionCallback(null, 2, reminderfox.network.download.reminderFox_subscriptionReminders);
				}

			} catch(e) {
				reminderfox.network.download.reminderFox_download_statustxt(e.toString(), 0);
				if(e && e.toString().match(/^rem\:(.+)$/))
					reminderfox.network.download.reminderFox_download_statustxt(RegExp.$1, 0);
				return;
			}

			break;
		default:
			var status = aError % 0x804b0000;

			reminderfox.network.download.reminderFox_download_statustxt(aStatus, aError);

			if(reminderfox.network.download.reminderFox_subscriptionCallback != null) {
				var statustxt = (aError) ? reminderfox.network.download.reminderFox_download_getErrorMsg(aError) : aStatus;
				reminderfox.network.download.reminderFox_subscriptionCallback(statustxt, 0);
			}
			break;
	}

	if(aError == 0) {
		if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
			reminderfox.network.download.reminderFox_closeWindow();
		}
	}
}

reminderfox.network.download.reminderFox_downloadDelayedStartup = function() {
	var _downloadURL = "";
	var _ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);

	var proto = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.PROTOCOL, reminderfox.consts.NETWORK.PROTOCOL_DEFAULT);
	var address = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.ADDRESS, "");
	var _username = reminderfox.core.getPreferenceValue(reminderfox.consts.NETWORK.USERNAME, "");

	if(address == null || address.length == 0) {
		reminderfox.network.download.reminderFox_downloadCallback(reminderfox.string("rf.net.done"), -1);
		return;
	}

	var loginData = {
		ljURL : proto + "://" + address,
		username : _username,
		password : ''
	};
	loginData = reminderFox_getPassword(loginData);

	// if no username is specified, allow to pass through
	if((_username != null && _username != "" ) && (loginData == null || loginData.password == null)) {
		// this is the end
		reminderfox.network.download.reminderFox_downloadCallback(reminderfox.string("rf.upload.noPasswordSet.label"), 3);
		return;
	}

	if(loginData == null) {
		_downloadURL = proto + "://" + address;
	} else {
		// uri-encode username and password
		_username = encodeURIComponent(_username);
		var _password = encodeURIComponent(loginData.password);
		_downloadURL = proto + "://" + _username + ":" + _password + "@" + address;
	}

	var downloadURI = _ioService.newURI(_downloadURL, null, null);
	//statustxt("DEBUG VYPIS!",0);

	//gStartTime = new Date().getTime();

	if(gDownloadService.start(downloadURI, reminderfox.network.download.reminderFox_downloadCallback)){
	
		reminderfox.core.logMessageLevel("   [reminderFox_downloadDelayedStartup]   "  + reminderfox.string("rf.upload.request.label"));

		reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.upload.request.label"), 0);
	}
	else {
		//statustxt(reminderfox.string("rf.net.done"),0);

		reminderfox.core.logMessageLevel("   [reminderFox_downloadDelayedStartup]   "  + reminderfox.string("rf.net.done"));

		reminderfox.network.download.reminderFox_downloadCallback(reminderfox.string("rf.net.done"), -1);
	}
}

reminderfox.network.download.reminderFox_downloadCallback = function(aStatus, aError) {
	if(aStatus != reminderfox.string("rf.net.done") && aError == 0) {
		reminderfox.network.download.reminderFox_download_statustxt(aStatus, aError);
		return;
	}

	switch(aError) {
		case -2:
			reminderfox.network.download.reminderFox_download_statustxt(aStatus, aError);
			if(reminderfox.network.download.reminderFox_editWindowCallback != null) {
				var statustxt = (aError) ? reminderfox.network.download.reminderFox_download_getErrorMsg(aError) : aStatus;
				reminderfox.network.download.reminderFox_editWindowCallback(statustxt, -1);
			}
			return;
			break;
		case 0:
			var remotetimestamp = reminderfox.core.getICSXLastmodifiedFromString(gDownloadService.data);
			var lastRecordedLocalTimeStamp = reminderfox._prefsBRANCH.getCharPref(reminderfox.consts.LAST_MODIFIED) + "";

			if(remotetimestamp == -1) {
				// when syncing with a remote calendaring service (such as memotoo.com) and not just with other ReminderFox
				// instances, the remote file will not have the ReminderFox-last-modified timestamp.  In that case we will just assume
				// that the remote file is the master list (by treating it as a newer timestamp) and download them.
				// This means on download, the remote always wins, so on upload you want to make sure that your local reminders
				// are uploaded and current; otherwise the remote reminders will overwrite local changes the next download attempt.
				remotetimestamp = new Date().getTime();
				reminderfox.core.logMessageLevel("  Remote reminders have no timestamp; assume they are newer... ", reminderfox.consts.LOG_LEVEL_FINE);
			}

			// if we are calling Download from the options, force it to download whether the remote reminders are newer or not...
			if(window.arguments != null && window.arguments[0] != null && window.arguments[0].forceDownload != null && window.arguments[0].forceDownload == true) {
				reminderfox.network.download.reminderFox_download_statustxt(aStatus, aError);
				lastRecordedLocalTimeStamp = -2;
				// use  -2, as if there's no timestamp in the remote file, it comes back as -1.  So we need to be less than that value
			}

			var done = false;
			if(remotetimestamp == lastRecordedLocalTimeStamp) {
				reminderfox.core.logMessageLevel("  Remote and Local reminders are identical: " + remotetimestamp, reminderfox.consts.LOG_LEVEL_FINE);

				if(reminderfox.network.download.reminderFox_editWindowCallback != null) {
					reminderfox.network.download.reminderFox_editWindowCallback(null, 1);
				}

				if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
					reminderfox.network.download.reminderFox_closeWindow();
				}
				return;
			} else if(remotetimestamp < lastRecordedLocalTimeStamp) {
				reminderfox.core.logMessageLevel("  Local  reminders are newer than remote --  uploading local reminders... (local: " + lastRecordedLocalTimeStamp + ", remote: " + remotetimestamp + ")", reminderfox.consts.LOG_LEVEL_FINE);
				reminderfox.core.logMessageLevel("  Read timestamp from file (should be == to local): " + reminderfox.core.getICSfileTimeStamp(), reminderfox.consts.LOG_LEVEL_FINE);
				if(reminderfox.network.download.reminderFox_editWindowCallback != null) {
					reminderfox.network.download.reminderFox_editWindowCallback(reminderfox.string("rf.add.network.status.upload.label"), 0);
				}
				// don't upload if this was called from the options window...
				if(window.arguments != null && window.arguments[0] != null && window.arguments[0].closeOnNoErrors != null && window.arguments[0].closeOnNoErrors == 1) {
					setTimeout(reminderfox.core.uploadReminders, 0);
				}

				if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS) {
					reminderfox.network.upload.reminderFox_upload_Startup_headless(reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS);
				}
				if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
					setTimeout(reminderfox.network.download.reminderFox_closeWindow, 1);
				}

				if(reminderfox.network.download.reminderFox_editWindowCallback != null) {
					reminderfox.network.download.reminderFox_editWindowCallback(null, 1);
				}

				return;
			} else if(remotetimestamp > lastRecordedLocalTimeStamp) {
				reminderfox.core.logMessageLevel("  Remote reminders newer than local -- downloading remote reminders... (local: " + lastRecordedLocalTimeStamp + ", remote: " + remotetimestamp + ")", reminderfox.consts.LOG_LEVEL_FINE);
				reminderfox.core.logMessageLevel("  Read timestamp from file (should be == to local): " + reminderfox.core.getICSfileTimeStamp(), reminderfox.consts.LOG_LEVEL_FINE);

				if(reminderfox.network.download.reminderFox_editWindowCallback != null) {
					reminderfox.network.download.reminderFox_editWindowCallback(reminderfox.string("rf.add.network.status.download.label"), 0);
				}
				var processtime = 0;
				if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
					processtime = document.getElementById("processtime");
				}
				var time = gDownloadService.time;
				processtime.value = gDownloadService.length.toString() + " bytes  " + (time / 1000).toString() + " sec  ";
				var start = new Date();

				reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.upload.process.label"), 0);
				try {
					reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.download.importing.label"), 0);

					var is = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
					is.setData(gDownloadService.data, -1);
					// -1 ... length should be computed

					reminderEvents = new Array();
					reminderTodos = new Array();
					var originalExtraInfos = reminderfox.core.reminderFox_reminderFoxExtraInfo;
					reminderfox.core.readInRemindersAndTodosICSFromStream(reminderEvents, reminderTodos, is);

					// check to see if any todos in remote file...
					var hasTodos = false;
					for(var n in reminderTodos ) {
						var reminderFoxTodos = reminderTodos[n];
						if(reminderFoxTodos.length > 0) {
							hasTodos = true;
							break;
						}
					}

					// safety check: if there are no events and no todo's in the remote file, we will assume that this an error condition
					// (this happens frequently with icalx.com where the remote file gets cleared) and will not overwrite the local reminders
					if(reminderEvents.length == 0 && !hasTodos) {
						reminderfox.core.logMessageLevel("  Failed: remote file with timestamp " + remotetimestamp + " has no events or todo's...", reminderfox.consts.LOG_LEVEL_FINE);
						reminderfox.core.reminderFox_reminderFoxExtraInfo = originalExtraInfos;
						// switch back to original extra info
						// WE DON'T WANT TO OVERWRITE LOCAL IF NO REMOTE...
					} else {
						// Overwrite
						reminderfox.core.reminderFoxEvents = reminderEvents;
						reminderfox.core.reminderFoxTodosArray = reminderTodos;
						reminderfox.core.importRemindersUpdateAll(true, remotetimestamp);
					}

					// if successful, close immediately
					if(window.arguments != null && window.arguments[0] != null && window.arguments[0].closeOnNoErrors != null && window.arguments[0].closeOnNoErrors == 1) {
						close();
						return;
					}

					var end = new Date();
					processtime.value += ((end.getTime() - start.getTime()) / 1000).toString() + " sec";
					reminderfox.network.download.reminderFox_download_statustxt(reminderfox.string("rf.net.done"), 0);

					if(reminderfox.network.download.reminderFox_editWindowCallback != null) {
						reminderfox.network.download.reminderFox_editWindowCallback(null, 2);
					}

				} catch(e) {
					reminderfox.network.download.reminderFox_download_statustxt(e.toString(), 0);
					if(e && e.toString().match(/^rem\:(.+)$/))
						reminderfox.network.download.reminderFox_download_statustxt(RegExp.$1, 0);
					return;
				}
			}

			break;
		default:
			var status = aError % 0x804b0000;
			if(status == 22) {
				reminderfox.core.logMessageLevel("  No remote file -- uploading local reminders...", reminderfox.consts.LOG_LEVEL_FINE);

				// don't upload if this was called from the options window...
				if(window.arguments != null && window.arguments[0] != null && window.arguments[0].closeOnNoErrors == 1) {
					setTimeout(reminderfox.core.uploadReminders, 0);
				} else if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS) {
					reminderfox.network.upload.reminderFox_upload_Startup_headless(reminderfox.consts.UI_MODE_HEADLESS_SHOW_ERRORS);
				}
				if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
					setTimeout(reminderfox.network.download.reminderFox_closeWindow, 1);
				}
				if(reminderfox.network.download.reminderFox_editWindowCallback != null) {
					reminderfox.network.download.reminderFox_editWindowCallback(null, 1);
				}
			} else {
				reminderfox.network.download.reminderFox_download_statustxt(aStatus, aError);
				if(reminderfox.network.download.reminderFox_editWindowCallback != null) {
					var statustxt = null;
					if(aError == -1) {
						statustxt = aStatus;
					} else {
						statustxt = (aError) ? reminderfox.network.download.reminderFox_download_getErrorMsg(aError) : aStatus;
					}

					reminderfox.network.download.reminderFox_editWindowCallback(statustxt, -1);
				}
				break;
			}
	}
	if(aError == 0) {
		if(reminderfox.network.download.reminderFox_download_headless == reminderfox.consts.UI_MODE_HEADLESS_SHOW_ALL_UI) {
			reminderfox.network.download.reminderFox_closeWindow();
		}
	}
}

reminderfox.network.download.reminderFox_closeWindow = function() {
	if(window.arguments != null && window.arguments[0] != null && window.arguments[0].closeOnNoErrors == 1) {
		close();
	} else {
		var reminderFox_download_button = document.getElementById("reminderFox_download_button");
		reminderFox_download_button.setAttribute("label", reminderfox.string("rf.net.done"));
	}
}

reminderfox.network.download.reminderFox_cancelDownload = function() {
	gDownloadService.cancel();
	close();
}

reminderfox.network.download.reminderFox_download_getErrorMsg = function(aStatus) {
	if(aStatus == 0)
		return "ok";

	var status = aStatus % 0x804b0000;
	var error = reminderfox.string("rf.upload.unexpected.label");
	switch(status) {
		case 1:
			error = reminderfox.string("rf.upload.unexpected.label");
			break;
		case 2:
			error = reminderfox.string("rf.upload.usercancel.label");
			break;
		case 3:
			error = reminderfox.string("rf.upload.noPasswordSet.label");
			break;
		case 13:
			error = reminderfox.string("rf.upload.refused.label");
			break;
		case 14:
			error = reminderfox.string("rf.upload.netTimeout.label");
			break;
		case 16:
			error = reminderfox.string("rf.upload.netOffline.label");
			break;
		case 21:
			error = reminderfox.string("rf.upload.loginfailure.label");
			break;
		case 22:
			error = reminderfox.string("rf.upload.ftpcwd.label");
			break;
		case 23:
			error = reminderfox.string("rf.upload.ftppasv.label");
			break;
		case 24:
			error = reminderfox.string("rf.upload.ftppwd.label");
			break;
		case 25:
			error = reminderfox.string("rf.upload.ftplist.label");
			break;
		case 30:
			error = reminderfox.string("rf.upload.unknown.label");
			break;
		case 201:
			error = reminderfox.string("rf.upload.created.label");
			break;
		case 401:
			error = reminderfox.string("rf.upload.loginfailure.label");
			break;
		case 405:
			error = reminderfox.string("rf.upload.methodNotAllowed.label");
			break;
		default:
			error = reminderfox.string("rf.upload.unexpected.label");
			break;
	}

	var formatted = (aStatus < 0x804b0000) ? aStatus.toString(10) : "0x" + aStatus.toString(16).toUpperCase();
	return error + " (" + formatted + ")";
}