window.addEventListener("dialogaccept", function(event) {
	gENFReminder.onOK();
	return true;
});

window.addEventListener("dialogcancel", function(event) {
	return true;
});

var gENFReminder = {
	arg: null,
	onload: function() {
		this.arg = window.arguments[0];
		this.onToggleReminderType(0);
		this.init();
	},
	
	init: function() {
		var today = new Date();
		var year = today.getFullYear();
		var month = today.getMonth() + 1;
		var date = today.getDate() + 1; //default is tomorrow
		if (month < 10) month = "0" + month;
		if (date < 10) date = "0" + date;
		document.getElementById("ENFRemDate").value = new Date(year + "-" + month + "-" + date);
	},
	
	onOK: function() {
		var type = document.getElementById("ENFRemType").value;
		var rem = document.getElementById("ENFRemDate").value;
		//if (type == 1) this.arg.date = rem.replace(/\-/g, "/");
		if (type == 1) {
			this.arg.date = rem.getFullYear() + "/" + (rem.getMonth() + 1) + "/" + rem.getDate();
		}
		this.arg.enable = true;
	},
	
	onToggleReminderType: function(value) {
		if (value == 0) document.getElementById("ENFRemDate").setAttribute("disabled", true);
		else if (value == 1) document.getElementById("ENFRemDate").removeAttribute("disabled");
	}
};