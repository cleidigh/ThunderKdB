"use strict";
var miczLightningColorRemindersPref = {

	onLoad: function(){
		//Fixing window height
		sizeToContent();
		var vbox = document.getElementById('cr_tabbox');
		vbox.height = vbox.boxObject.height;
		sizeToContent();
	},
};
