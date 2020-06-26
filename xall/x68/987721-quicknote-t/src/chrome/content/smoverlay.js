var QNsmoverlay= {
	qntoolbarbuttonsm: function() {
		window.removeEventListener('load', QNsmoverlay.qntoolbarbuttonsm, false);
		var firstRun = QN_globalvar.qnprefs.getBoolPref('firststart');
		if (firstRun) {
			var myId		= "quicknote-buttonsm"; // ID of button to add
			var afterId = "stop-button";		// ID of element to insert after
			var toolBar = document.getElementById("nav-bar");
			var curSet	= toolBar.currentSet.split(",");
			if (curSet.indexOf(myId) == -1) {
				var pos = curSet.indexOf(afterId) + 1 || curSet.length;
				var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));
				toolBar.setAttribute("currentset", set.join(","));
				toolBar.currentSet = set.join(",");
				document.persist(toolBar.id, "currentset");
			}
			QN_globalvar.qnprefs.setBoolPref('firststart', false);
		}
	}
}

window.addEventListener("load", QNsmoverlay.qntoolbarbuttonsm, false);