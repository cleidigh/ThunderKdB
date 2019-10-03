(function() {
	var project = com.namespace("com.github.shimamu.asbcustom.options");

	function init() {
		var p_hbox = document.getElementById("search_word_boxs");

		var keywords_num = 20;
		com.github.shimamu.asbcustom.customPrefs.prefs.setIntPref(
			"asbcustom_input_helper.searchWord.num", keywords_num);

		var vbox;
		for (var i = 0; i < keywords_num; i++) {
			if (i % 10 == 0) {
				vbox = document.createElement("vbox");
				p_hbox.appendChild(vbox);
			}
			var hbox = document.createElement("hbox");
			hbox.setAttribute("align", "right");
			hbox.setAttribute("class", "indent");

			var label = document.createElement("label");
			label.setAttribute("value", (i + 1) + ".");

			var textbox = document.createElement("textbox");
			textbox.setAttribute("id", "searchWord0" + i);
			textbox.setAttribute("size", "30");
			textbox.setAttribute("prefstring", "asbcustom_input_helper.searchWord" + i);

			hbox.appendChild(label);
			hbox.appendChild(textbox);
			vbox.appendChild(hbox);
		}

		com.github.shimamu.asbcustom.prefs.initPrefs();
	}

	project.init = init;
}());
