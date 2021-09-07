var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { cardbookRepository } = ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");

var cardbookLightning = {
	// code taken from createEventWithDialog
	createLightningEvent: function(aContactList, aListener) {
		let event = new CalEvent();
		let calendar = cal.view.getCompositeCalendar(window).defaultCalendar;
		let refDate = cal.dtz.now();
		setDefaultItemValues(event, calendar, null, null, refDate, null);
		for (let contact of aContactList) {
			let attendee = new CalAttendee();
			attendee.id = contact[0];
			attendee.commonName = contact[1];
			attendee.isOrganizer = false;
			attendee.role = "REQ-PARTICIPANT";
			attendee.userType = "INDIVIDUAL";
			event.addAttendee(attendee);
		}
		openEventDialog(event, event.calendar, "new", aListener, null);
	},

	// code taken from createTodoWithDialog
	createLightningTodo: function(aTitle, aDescription, aListener) {
		let todo = new CalTodo();
		let calendar = cal.view.getCompositeCalendar(window).defaultCalendar;
		let refDate = cal.dtz.now();
		setDefaultItemValues(todo, calendar, null, null, refDate);
		// title should be in lowercase
		cal.item.setItemProperty(todo, "title", aTitle);
		cal.item.setItemProperty(todo, "DESCRIPTION", aDescription);
		openEventDialog(todo, todo.calendar, "new", aListener, null, refDate);
	}
};