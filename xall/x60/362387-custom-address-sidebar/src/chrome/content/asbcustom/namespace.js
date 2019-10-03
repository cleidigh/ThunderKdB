var com = com || {};

com.namespace = function(string) {
	var object = window;
	var levels = string.split(".");

	for (var i = 0, l = levels.length; i < l; i++) {
		if (typeof object[levels[i]] == "undefined") {
			object[levels[i]] = {};
		}

		object = object[levels[i]];
	}

	return object;
}
