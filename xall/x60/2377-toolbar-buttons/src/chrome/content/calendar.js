toolbar_buttons.toolbar_button_loader(toolbar_buttons, {
		deleteEvent: function(event) {
		var win = event.target.ownerDocument.defaultView;
		try{
			win.deleteEventCommand();
		} catch(e) {
			win.goDoCommand('calendar_delete_event_command');
			win.goDoCommand('delete_command');
		}
	},
	deleteTasks: function(event) {
		var win = event.target.ownerDocument.defaultView;
		try {
			win.deleteToDoCommand();
		} catch(e){
			win.goDoCommand('calendar_delete_todo_command');
			win.goDoCommand('delete_todo_command');
		}
	},
	toggleTasks: function(event) {
		try {
			return toolbar_buttons.toggleToolbar(event, 'taskBox');
		} catch(e) {
			return toolbar_buttons.toggleToolbar(event, 'todo-tab-panel');
		}
	}
});
