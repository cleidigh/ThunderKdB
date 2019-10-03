const Cu = Components.utils;
Cu.import("resource:///modules/StringBundle.js"); // for StringBundle

var LIN_dialogOpen = false;
var LIN_state = "";

window.addEventListener("load", function(e) { 
    LIN_startup();
}, false);

let strings = new StringBundle("chrome://lightninginvitationnotifier/locale/message.properties");

function LIN_startup() {
	setInterval(function() {
		var invitationPending = document.getElementById('calendar-invitations-panel') != null && !document.getElementById('calendar-invitations-panel').hidden && document.getElementById('calendar-invitations-label') != null && document.getElementById('calendar-invitations-label').value.length > 0;

		var update = function () {
            LIN_state = document.getElementById('calendar-invitations-label').value;
            if (invitationPending) {
                LIN_popup(strings.get("invitations"), LIN_state);
                document.getElementById('lin').label = 'LIN: ' + LIN_state;
            } else {
                document.getElementById('lin').label = 'LIN';
			}
		};

		// first invitation!
		if (invitationPending && !LIN_dialogOpen) {
			document.getElementById('calendar-invitations-panel').click();
			LIN_dialogOpen = true;
            update();
			return;
		}
		
		// no more invitations
		if (!invitationPending) {
			LIN_dialogOpen = false;
			update();
			return;
		}
		
		// new additional invitation
		if (LIN_state != document.getElementById('calendar-invitations-label').value) {
            update();
			return;
		}
	}, 5000);
}

function LIN_popup(title, text) {
    try {
        Components.classes['@mozilla.org/alerts-service;1']
                  .getService(Components.interfaces.nsIAlertsService)
                  .showAlertNotification(null, title, text, false, '', null);
    } catch(e) {
        // prevents runtime error on platforms that don't implement nsIAlertsService
    }
}