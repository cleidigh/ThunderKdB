"use strict";

QuickPasswords.Observer = {

	initObserver : function () {
		try {

			let ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
			                   .getService(Components.interfaces.nsIWindowWatcher);

			let watcher = {
				observe: function(subject, topic, data) {
					if (topic == "domwindowopened") {
						// unfortunately you can't get anything useful from subject here.
						// You need to wait for it to load. The best way to do
						// that is to hook it's load event:
						let txt = "domwindow opened - subject..location: ";
						let loc = subject.document ? (subject.document.location ? subject.document.location.toString() : "location not defined") : "subject.document not found";
						// does this location end with passwordManager ?
						if (/passwordManager.xul$/.test(subject.document.location.toString())) {
							subject.addEventListener("load", QuickPasswords.loadPasswordManager, false);
							 // window.setTimeout(function() { QuickPasswords.Util.logDebug(txt + "{" + "}"); }, 0);
						}
					}
				}
			};

			ww.registerNotification(watcher);

		}
		catch(ex) {
			alert(ex);
		}
	}
}

QuickPasswords.Observer.initObserver();

