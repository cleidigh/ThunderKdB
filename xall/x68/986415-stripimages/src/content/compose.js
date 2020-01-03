var stripImages = {
  run: null
};

(function () {
  var isWindows = ("@mozilla.org/windows-registry-key;1" in Components.classes);

	if (document.location.href != "chrome://messenger/content/messengercompose/messengercompose.xul") {
		return;
	}
	stripImages.run = function (event, silent) {
		console.log('stripImages');
		//var v = document.getElementById('content-frame').contentDocument.body;
		var doc = document.getElementById('content-frame').contentDocument;
	
		doc.querySelectorAll("img").forEach(node => node.remove());
	
		//var re = new RegExp();
		//v.innerHTML = v.innerHTML.replace(/<img[^>]+>(<\/img)?/g, '');
	};
})()
