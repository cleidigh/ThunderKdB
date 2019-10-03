/**
 * Load Reminders for (.xul)
 */
function reminderfox_loadReminders(reminderEvent, editing ) {
	loadEvent( reminderEvent, editing );

	var remindUntilComplete = document.getElementById("remindUntilComplete");
	var remindUntilCompleteDefault = false;
	if ( !editing ) {
		remindUntilCompleteDefault = reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_REMIND_UNTIL_COMPLETED, false);
		remindUntilComplete.setAttribute( "checked", remindUntilCompleteDefault );
	}
	else {
		if ( reminderEvent.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED  ||
			reminderEvent.remindUntilCompleted == reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED ) {
				remindUntilComplete.setAttribute( "checked", true );
		}
		else {
				remindUntilComplete.setAttribute( "checked", false );
		}
	}	
	var readonly = window.arguments[0].readonly;
	if ( readonly ) {
		markFieldsReadonly();
	}

//gWiCal  	An invitation/schedule with not beeing the ORGANIZER
//		the 'date/time', 'location, 'summary' items are disabled
	if ((reminderEvent.extraInfo != null) && (reminderEvent.extraInfo.indexOf("ORGANIZER")) > -1) {
		reminderfox.iCal.inviteStatus(reminderEvent);
	}

	//gW_Notes   change NoteLines with prefs "notesLines", 
	//           if prefs not set leave standard = 4 lines;
	try {
		var numLines = 4;
		var maxLines = 8;
		var lines = reminderfox.core.getPreferenceValue("notesLines", numLines);
		numLines = lines.split(',')[0];
		maxLines = lines.split(',')[1];

		var p= 0; n = 1;
		while (p != -1) {
			p = reminderEvent.notes.indexOf('\n',p);
			if (p == -1) break;
			p++; n++;
		}
		numLines = (n > numLines) ? ((n > maxLines)? maxLines : (n -1)) : (numLines -1);
	} catch (ex) {
		var numLines = 4;
	}
	var notesText = document.getElementById("notesText");
	notesText.setAttribute('rows',numLines);
};


function reminderFox_saveReminderOptions(reminderEvent) {
	var success = saveEvent(reminderEvent);
	if (success) {
		var todaysDate = new Date();
		var RUC = document.getElementById("remindUntilComplete").getAttribute("checked" );
		if (RUC == true || RUC == "true") {
			reminderEvent.remindUntilCompleted = (reminderfox.core.compareDates(reminderEvent.date, todaysDate) == -1) ?
				reminderfox.consts.REMIND_UNTIL_COMPLETE_MARKED /*2*/ 
				: reminderfox.consts.REMIND_UNTIL_COMPLETE_TO_BE_MARKED; /*1*/
		}
		else {
			reminderEvent.remindUntilCompleted = reminderfox.consts.REMIND_UNTIL_COMPLETE_NONE;  /*null*/
		}
	}
	return (success == true)
}


/**
 * Load Todos for (xx.xul)
 */
function reminderfox_loadTodos( newTodo, editing ) {
	loadEvent( newTodo, editing );

	var showInTooltip = document.getElementById("showInTooltip");	
	var showInTooltipDefault = true;
	if ( !editing ) {
		try {
			showInTooltipDefault =  reminderfox.core.getPreferenceValue(reminderfox.consts.DEFAULT_SHOW_IN_TOOLTIP, true);
			if ( showInTooltipDefault || newTodo.showInTooltip == true ) {
				showInTooltip.setAttribute( "checked", true );
			}
			else {
				showInTooltip.setAttribute( "checked", false );
			}
		} catch(e) {
		}
	}
	else {
		if ( newTodo.showInTooltip == true ) {
			showInTooltip.setAttribute( "checked", true );
		}
		else {
			showInTooltip.setAttribute( "checked", false );
		}
	}
}


function reminderFox_saveTodoOptions(newTodo) {
	var success = saveEvent( newTodo );
	if (!success) {
		return false;
	}
	var showInTooltip = document.getElementById("showInTooltip");
	var showInTooltipVal =  showInTooltip.getAttribute("checked" );
	if ( showInTooltipVal == true || showInTooltipVal == "true") {
		newTodo.showInTooltip = true;
	}
	else {
		newTodo.showInTooltip = false;
	}

	return true;
}