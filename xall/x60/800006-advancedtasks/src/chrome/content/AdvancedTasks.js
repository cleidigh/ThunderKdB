Components.utils.import("resource://calendar/modules/calUtils.jsm");
Components.utils.import("resource://calendar/modules/calRecurrenceUtils.jsm");

var advancedTask = {
	init: function(){
		var ligthningFunction = taskDetailsView.onSelect;
		taskDetailsView.onSelect = function(event) {
			ligthningFunction.apply(event);
			var mardownFrame = document.getElementById("advancedTaskDescription");
			mardownFrame.contentWindow.document.getElementById("marked-generated").innerHTML = advancedTask.getMarkDownAsHTML();
			mardownFrame.contentWindow.appendJSFunctions();
		};
	},
	htmlToMarkdown: function(htmlString){
		var markdown = toMarkdown(htmlString, { gfm: true });
		let oldItem = document.getElementById("calendar-task-tree").currentTask;
		let item = document.getElementById("calendar-task-tree").currentTask.clone();
		var description = item.hasProperty("DESCRIPTION") ? item.getProperty("DESCRIPTION") : null;

		var label_close = new RegExp("<\\/label>","mg");
		var label_Regex = new RegExp('<label.*for="checkbox\\d*"><\\/label>',"mg");

		markdown = markdown.replace(label_Regex,'');

		//calculate Progess in %
		var count_uncheck = markdown.split("[ ]").length - 1;
		var count_check = markdown.split("[x]").length - 1;
		var progress_count = parseInt((count_check / (count_check + count_uncheck))*100);

		//Set Values
		setItemProperty(item, "DESCRIPTION", markdown);
		setItemProperty(item, "PERCENT-COMPLETE", progress_count);

		//Save
		item.makeImmutable();
        doTransaction('modify', item, item.calendar, oldItem, null);
	},
	escapeRegExp: function(string){
		return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");

	},
	getMarkDownAsHTML: function(){
		var item = document.getElementById("calendar-task-tree").currentTask;
		if(item != null){
			var description = item.hasProperty("DESCRIPTION") ? item.getProperty("DESCRIPTION") : null;
			if(description != null){
				return advancedTask.ownMarked(description);
			}
		}
		return '';
	},
	getParentsFontColor: function(){
		var color = window.getComputedStyle(document.getElementById('advancedTaskDescription-container'), null).getPropertyValue("color");
		return color;
	},
	ownMarked: function(markdownString){
		
			var myRenderer = new marked.Renderer();
			myRenderer.checkboxCount = 0;

				myRenderer.listitem = function(text) {
					if(text.includes("[x]") || text.includes("[ ]")){
						return '<li class="checkbox_item">' + text + '</li>\n';
					}else{
						return '<li>' + text + '</li>\n';
					}
				};

				// Synchronous highlighting with highlight.js
				marked.setOptions({
				  highlight: function codeHighlight(code) {
				    return hljs.highlightAuto(code).value;
				  }
				});

				var options = {renderer: myRenderer};
				var html = marked(markdownString, options);
				html = html.replace(/\[(\s|x)\]/g,function(x){
					myRenderer.checkboxCount ++;
					var checked = x.includes("[x]") ? true : false;
					return '<input id="checkbox'+myRenderer.checkboxCount+'" type="checkbox"'+(checked ? ' checked' : '')+'/><label for="checkbox'+myRenderer.checkboxCount+'"></label>';
				});
			return html;
	}
};
	
window.addEventListener("load", function(){
    advancedTask.init();  
},false);