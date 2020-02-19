window.addEventListener("dialogaccept", function(event) {
	gENFConfirm.updateNoteInfo();
	return true;
});

window.addEventListener("dialogcancel", function(event) {
	return true;
});

var gENFConfirm = {
	arg: null,
	onload: function() {
		this.arg = window.arguments[0];
		this.fillListItems();
	},
	
	fillListItems: function() {
		var tree = document.getElementById("ENFNoteTreeBody");
		var len = this.arg.length;
		for (var i=0; i<len; i++) {
			var info = this.arg[i];
			var treeitem = document.createElement("treeitem");
			var treerow = document.createElement("treerow");

			var cancelcell = document.createElement("treecell");
			cancelcell.setAttribute("id", "cancelElem"+i);
			cancelcell.setAttribute("value", "true");
			cancelcell.setAttribute("editable", "true");
			treerow.appendChild(cancelcell);

			var titlecell = document.createElement("treecell");
			titlecell.setAttribute("label", info.title);
			titlecell.setAttribute("id", "titleElem"+i);
			titlecell.setAttribute("editable", "true");
			treerow.appendChild(titlecell);
			
			var appendcell = document.createElement("treecell");
			appendcell.setAttribute("id", "appendElem"+i);
			appendcell.setAttribute("editable", "true");

			if (info.append) {
				appendcell.setAttribute("value", "true");
			} else {
				appendcell.setAttribute("value", "false");
			}
			treerow.appendChild(appendcell);
			
			var remcell = document.createElement("treecell");
			remcell.setAttribute("id", "remElem"+i);
			remcell.setAttribute("editable", "true");
			
			if (info.reminder) {
				remcell.setAttribute("value", "true");
			} else {
				remcell.setAttribute("value", "false");
			}
			treerow.appendChild(remcell);
			
			var datecell = document.createElement("treecell");
			datecell.setAttribute("id", "dateElem"+i);
			datecell.setAttribute("editable", "true");

			if (info.reminderDate) datecell.setAttribute("label", info.reminderDate);
			else datecell.setAttribute("label", "----/--/--");
			treerow.appendChild(datecell);
			
			var notebookcell = document.createElement("treecell");
			notebookcell.setAttribute("id", "noteElem"+i);
			notebookcell.setAttribute("editable", "true");
			notebookcell.setAttribute("label", info.notebook);
			treerow.appendChild(notebookcell);

			var tagscell = document.createElement("treecell");
			tagscell.setAttribute("id", "tagsElem"+i);
			tagscell.setAttribute("editable", "true");
			tagscell.setAttribute("label", info.tags.join(","));
			treerow.appendChild(tagscell);
			
			treeitem.appendChild(treerow);
			tree.appendChild(treeitem);
		}
	},
	
	updateNoteInfo: function() {
		var len = this.arg.length;
		var sendNum = 0;
		for (var i=0; i<len; i++) {
			var info = this.arg[i];
			var canceled = document.getElementById("cancelElem"+i).getAttribute("value") == "false";
			info.canceled = canceled;
			if (!canceled) {
				var title = document.getElementById("titleElem"+i).getAttribute("label");
				var append = document.getElementById("appendElem"+i).getAttribute("value") == "true";
				var reminder = document.getElementById("remElem"+i).getAttribute("value") == "true";
				var reminderDate = document.getElementById("dateElem"+i).getAttribute("label");
				if (!reminder || !/\d{4}\/\d{2}\/\d{2}/.test(reminderDate)) reminderDate = "";
				var note = document.getElementById("noteElem"+i).getAttribute("label");
				var tags = document.getElementById("tagsElem"+i).getAttribute("label");
				info.title = title;
				info.append = append;
				if (!append) {
					info.reminder = reminder;
					info.reminderDate = reminderDate;
					info.notebook = note;
					info.tags = tags.split(/\s*,\s*/);
				}
				sendNum++;
			}
		}
		this.arg.sendNum = sendNum;
		
		gENFPreferences.setBoolPref("extensions.enforward.show_conf_dialog", !(document.getElementById("ENFNotShowDialog").checked));
	}
};