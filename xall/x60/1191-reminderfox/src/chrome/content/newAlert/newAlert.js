/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


var ALERT_LEFT = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERTSLIDER_LEFT, false);
var ALERT_TOP = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERTSLIDER_TOP, false);
var ALERT_MAX_SIZE = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERTSLIDER_MAX_HEIGHT, reminderfox.consts.ALERTSLIDER_MAX_HEIGHT_DEFAULT);

var gOpenTime = 4000; // total time the alert should stay up once we are done animating.


function onAlertLoad() {
	var todaysReminders = window.arguments[0].todaysReminders;
	var upcomingReminders = window.arguments[0].upcomingReminders;
	var alertType = window.arguments[0].alertTypeToShow;

	rmFX_prefillAlertInfo(todaysReminders, upcomingReminders);
	setTimeout(function() {showAlert();}, 0);
}


function rmFX_prefillAlertInfo(todaysReminders, upcomingReminders) {
	var node;
	var hideGayPaw = reminderfox.core.getPreferenceValue(reminderfox.consts.HIDE_FOX_PAW, false);
	if (hideGayPaw) {
		document.getElementById('reminderfox-foxpaw').setAttribute("hidden", "true");
	}

	//	remove old reminders boxes
	var todayDescription = document.getElementById( "reminderfox-todaysRemindersBox2" );
	while (todayDescription.firstChild) todayDescription.removeChild(todayDescription.firstChild);

	var upcomingBox = document.getElementById( "reminderfox-upcomingRemindersBox2" );
	while (upcomingBox.firstChild) upcomingBox.removeChild(upcomingBox.firstChild);

	// get the nodes from the tooltip
	var i;
	if (todaysReminders != null ) {
		var todaysReminderClone =  todaysReminders.cloneNode( true );
		for (i = 0; i < todaysReminderClone.childNodes.length; i++ ) {
			node = document.importNode( todaysReminderClone.childNodes[i], true);
			var cloneNode = node.cloneNode( true );
			todayDescription.appendChild(cloneNode);
		}
	}

	if (upcomingReminders != null ) {
		var upcomingReminderClone = upcomingReminders.cloneNode( true );
		for (i = 0; i < upcomingReminderClone.childNodes.length; i++ ) {
			node = document.importNode( upcomingReminderClone.childNodes[i], true);
			upcomingBox.appendChild(node.cloneNode(true));
		}
	}
}


function showAlert() {
	// resize the alert based on our current content
	resizeAlert();

	var alertContainer = document.getElementById("alertContainer");

	// get gOpenTime (it is specified in seconds - so multiply by 1000)
	gOpenTime = reminderfox.core.getPreferenceValue(reminderfox.consts.ALERTSLIDER_OPEN_TIME, 5) * 1000;

	alertContainer.addEventListener("animationend", function hideAlert(event) {
		if (event.animationName == "fade-in") {
			alertContainer.removeEventListener("animationend", hideAlert, false);
			var remaining = Math.max(Math.round(gOpenTime - event.elapsedTime * 1000), 0);
			setTimeout(function() {fadeOutAlert();}, remaining);
		}
	}, false);
	alertContainer.setAttribute("fade-in", true);
}


function resizeAlert() {
	var alertTextBox = document.getElementById("tooltipChildrenReminders2");
	var alertImageBox = document.getElementById("reminderfox-foxpaw");
	alertImageBox.style.minHeight =  "5px";

	sizeToContent();
	var gFinalHeight = window.outerHeight;

	var alertSliderMaxHeight = ALERT_MAX_SIZE;
	if (alertSliderMaxHeight <= 0 ) {
		alertSliderMaxHeight = 150;
	}

	if (gFinalHeight > alertSliderMaxHeight ) {
		gFinalHeight = alertSliderMaxHeight;
	}

	window.resizeTo(
		window.outerWidth,
		gFinalHeight
	);

	// Determine position
	var x = ALERT_LEFT ? 0 : (screen.width - window.outerWidth);
	var y = ALERT_TOP ? 0 : (screen.height - window.outerHeight);

	// Offset the alert by 20 / 40 pixels from the edge of the screen
	y += ALERT_TOP ? 20 : -20;
	x += ALERT_LEFT ? 40 : -40;
	window.moveTo(x, y);


var logMsg = " NewAlert Slider on screen details  " +
	"  ALERT_LEFT " + ALERT_LEFT + "  ALERT_TOP " + ALERT_TOP +
	"\n  final   x:"+ x + " y:" + y +
	"\n  screen.width  | window.outerWidth   :: " +
	screen.width +" | "+  window.outerWidth +

	"\n  screen.height | window.outerHeight   :: " +
	screen.height +" | "+  window.outerHeight +
	"\n  alertSliderMaxHeight | gFinalHeight  :: " +
	alertSliderMaxHeight +" | "+ gFinalHeight +
	"\n";
//reminderfox.util.Logger('alert',logMsg)
}


function fadeOutAlert(goClose) {
	var alertContainer = document.getElementById("alertContainer");

	if (goClose) {
		window.close();
	} else {

	if (gOpenTime != 0) {
		alertContainer.addEventListener("animationend", function fadeOut(event) {
			if (event.animationName == "fade-out") {
				alertContainer.removeEventListener("animationend", fadeOut, false);
				window.close();
			}
		}, false);
		alertContainer.setAttribute("fade-out", true);
	}
	}
}
