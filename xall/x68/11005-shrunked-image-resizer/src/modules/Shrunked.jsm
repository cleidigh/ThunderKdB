var EXPORTED_SYMBOLS = ['Shrunked'];

var ID = 'shrunked@darktrojan.net';
var CHANGELOG_URL = 'https://addons.thunderbird.net/addon/shrunked-image-resizer/versions/';
var DONATE_URL = 'https://darktrojan.github.io/donate.html?shrunked';

const { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
const { XPCOMUtils } = ChromeUtils.import('resource://gre/modules/XPCOMUtils.jsm');

/* globals AddonManager, FileUtils, PluralForm, ShrunkedImage */
ChromeUtils.defineModuleGetter(this, 'AddonManager', 'resource://gre/modules/AddonManager.jsm');
ChromeUtils.defineModuleGetter(this, 'FileUtils', 'resource://gre/modules/FileUtils.jsm');
ChromeUtils.defineModuleGetter(this, 'PluralForm', 'resource://gre/modules/PluralForm.jsm');
ChromeUtils.defineModuleGetter(this, 'ShrunkedImage', 'resource://shrunked/ShrunkedImage.jsm');

/* globals idleService */
XPCOMUtils.defineLazyServiceGetter(this, 'idleService', '@mozilla.org/widget/idleservice;1', 'nsIIdleService');

if (!('FileReader' in this)) {
	this.FileReader = Services.appShell.hiddenDOMWindow.FileReader;
}

var Shrunked = {
	get fileSizeMinimum() {
		return Shrunked.prefs.getIntPref('fileSizeMinimum') * 1000;
	},
	fileLargerThanThreshold(path) {
		let file;
		if (/^file:/.test(path)) {
			let uri = Services.io.newURI(path, null, null);
			file = uri.QueryInterface(Ci.nsIFileURL).file;
		} else {
			file = new FileUtils.File(path);
		}
		return file.fileSize >= this.fileSizeMinimum;
	},
	imageIsJPEG(image) {
		let request = image.getRequest(Ci.nsIImageLoadingContent.CURRENT_REQUEST);
		return !!request && request.mimeType == 'image/jpeg';
	},
	resize(sourceFile, maxWidth, maxHeight, quality, name) {
		let image = new ShrunkedImage(sourceFile, maxWidth, maxHeight, quality);
		if (name) {
			image.basename = name;
		}
		return image.resize();
	},
	getDataURLFromFile(file) {
		return new Promise(function(resolve) {
			let reader = new FileReader();
			reader.onloadend = function() {
				let dataURL = reader.result;
				dataURL = 'data:image/jpeg;filename=' + encodeURIComponent(file.name) + dataURL.substring(15);
				resolve(dataURL);
			};
			reader.readAsDataURL(file);
		});
	},
	versionUpgrade() {
		function parseVersion(version) {
			let match = /^\d+(\.\d+)?/.exec(version);
			return match ? match[0] : version;
		}

		let currentVersion = 0;
		let oldVersion = 0;
		let shouldRemind = true;

		if (Shrunked.prefs.getPrefType('version') == Ci.nsIPrefBranch.PREF_STRING) {
			oldVersion = parseVersion(Shrunked.prefs.getCharPref('version'));
		}
		if (Shrunked.prefs.getPrefType('donationreminder') == Ci.nsIPrefBranch.PREF_INT) {
			let lastReminder = Shrunked.prefs.getIntPref('donationreminder') * 1000;
			shouldRemind = Date.now() - lastReminder > 604800000;
		}

		AddonManager.getAddonByID(ID).then(addon => {
			currentVersion = parseVersion(addon.version);
			Shrunked.prefs.setCharPref('version', addon.version);

			if (!shouldRemind || oldVersion === 0 || Services.vc.compare(oldVersion, currentVersion) >= 0) {
				return;
			}

			idleService.addIdleObserver({
				observe(service, state) {
					if (state != 'idle') {
						return;
					}

					idleService.removeIdleObserver(this, 10);
					Shrunked.showNotification(currentVersion);
				}
			}, 10);
		});
	},
	showNotification(currentVersion) {
		let callbackObject = {};
		let label = Shrunked.strings.formatStringFromName('donate_notification', [currentVersion], 1);
		let buttons = [{
			label: Shrunked.strings.GetStringFromName('changelog_button_label'),
			accessKey: Shrunked.strings.GetStringFromName('changelog_button_accesskey'),
			callback() {
				callbackObject.resolve('changelog');
			}
		}, {
			label: Shrunked.strings.GetStringFromName('donate_button_label'),
			accessKey: Shrunked.strings.GetStringFromName('donate_button_accesskey'),
			popup: null,
			callback() {
				callbackObject.resolve('donate');
			}
		}];

		let recentWindow = Services.wm.getMostRecentWindow('mail:3pane');
		if (!recentWindow) {
			return;
		}
		let shrunkedWindow = recentWindow.ShrunkedMessenger;
		shrunkedWindow.showNotificationBar(label, buttons, callbackObject).then(function(which) {
			switch (which) {
			case 'changelog': {
				let version = Shrunked.prefs.getCharPref('version');
				shrunkedWindow.notificationCallback(CHANGELOG_URL + version);
				break;
			}
			case 'donate':
				shrunkedWindow.notificationCallback(DONATE_URL);
				break;
			}
		});

		Shrunked.prefs.setIntPref('donationreminder', Date.now() / 1000);
	},
	log(message) {
		if (this.logEnabled) {
			let frame = Components.stack.caller;
			let filename = frame.filename ? frame.filename.split(' -> ').pop() : null;
			let scriptError = Cc['@mozilla.org/scripterror;1'].createInstance(Ci.nsIScriptError);
			scriptError.init(
				message, filename, null, frame.lineNumber, frame.columnNumber,
				Ci.nsIScriptError.infoFlag, 'component javascript'
			);
			Services.console.logMessage(scriptError);
			dump(message + '\n');
		}
	},
	warn(message) {
		if (this.logEnabled) {
			let caller = Components.stack.caller;
			let filename = caller.filename ? caller.filename.split(' -> ').pop() : null;
			let scriptError = Cc['@mozilla.org/scripterror;1'].createInstance(Ci.nsIScriptError);
			scriptError.init(
				message, filename, null, caller.lineNumber, caller.columnNumber,
				Ci.nsIScriptError.warningFlag, 'component javascript'
			);
			Services.console.logMessage(scriptError);
		}
	},
	options: {
		get exif() {
			return Shrunked.prefs.getBoolPref('options.exif');
		},
		get orientation() {
			return Shrunked.prefs.getBoolPref('options.orientation');
		},
		get gps() {
			return Shrunked.prefs.getBoolPref('options.gps');
		},
		get resample() {
			return Shrunked.prefs.getBoolPref('options.resample');
		}
	},
	get icon16() {
		return 'chrome://shrunked/content/icon16.png';
	}
};
XPCOMUtils.defineLazyGetter(Shrunked, 'prefs', function() {
	return Services.prefs.getBranch('extensions.shrunked.');
});
XPCOMUtils.defineLazyGetter(Shrunked, 'logEnabled', function() {
	this.prefs.addObserver('log.enabled', {
		observe() {
			Shrunked.logEnabled = Shrunked.prefs.getBoolPref('log.enabled');
		}
	}, false);
	return this.prefs.getBoolPref('log.enabled');
});
XPCOMUtils.defineLazyGetter(Shrunked, 'strings', function() {
	return Services.strings.createBundle('chrome://shrunked/locale/shrunked.properties');
});
XPCOMUtils.defineLazyGetter(Shrunked, 'getPluralForm', function() {
	let pluralForm = Shrunked.strings.GetStringFromName('question_pluralform');
	let [getPlural] = PluralForm.makeGetter(pluralForm);
	return getPlural;
});

Shrunked.versionUpgrade();
