window.addEventListener("dialogaccept", function(event) {
	gENFDelAttach.onOK();
	return true;
});

window.addEventListener("dialogcancel", function(event) {
	gENFDelAttach.onCancel();
	return true;
});

var gENFDelAttach = {
	arg: null,
	listbox: null,
	onload: function() {
		this.arg = window.arguments[0];
		this.init();
	},
	
	init: function() {
		this.listbox = document.getElementById("ENFAttachList");
		var attachments = this.arg.attachments;
		var name = "";
		for (name in attachments) {
			var attachment = attachments[name];
			var size = attachment.size < 1024 * 1024
							 ? (Math.floor((attachment.size / 1024) * 10) / 10) + "KB"
							 : (Math.floor((attachment.size / 1024 / 1024) * 10) / 10) + "MB";
			var checkbox = document.createElement("checkbox");
			checkbox.setAttribute("label", name + " (" + size + ")");
			checkbox.setAttribute("checked", true);
			var listitem = document.createElement("richlistitem");
			listitem.value = name;
			listitem.appendChild(checkbox);

			this.listbox.appendChild(listitem);
			
			/*
			var listitem = this.listbox.appendItem(name + " (" + size + ")", name);
			listitem.setAttribute("type", "checkbox");
			listitem.setAttribute("checked", true);
			listitem.setAttribute("allowevents", true);
			*/
			//this.listbox.ensureElementIsVisible(listitem);
		}
		this.listbox.selectedIndex = 0;
		this.listbox.ensureIndexIsVisible(0);
	},
	
	onOK: function() {
		var ret = [];
		var len = this.listbox.itemCount;
		for (var i=0; i<len; i++) {
			var listitem = this.listbox.getItemAtIndex(i);
			//this.arg.attachments[listitem.value].del = !listitem.checked;
			this.arg.attachments[listitem.value].del = !listitem.firstChild.checked;
		}
		this.arg.canceled = false;
	},
	
	onCancel: function() {
		this.arg.canceled = true;
	},
	
	selectAll: function(sel) {
		var len = this.listbox.itemCount;
		for (var i=0; i<len; i++) {
			var listitem = this.listbox.getItemAtIndex(i);
			//if (sel ) listitem.setAttribute("checked", true);
			//else listitem.removeAttribute("checked");
			if (sel ) listitem.firstChild.setAttribute("checked", true);
			else listitem.firstChild.removeAttribute("checked");
		}
	}
};