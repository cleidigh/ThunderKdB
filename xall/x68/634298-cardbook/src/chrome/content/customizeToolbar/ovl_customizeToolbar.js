// for displaying the labels
// onLoad
(function() {
	// Keep a reference to the original function.
	var _original = onLoad;
	
	// Override a function.
	onLoad = function() {
		
		var rv = _original.apply(null, arguments);
		cardbookLocales.updateDocument();
		
	};
})();

// for displaying the labels
// toolboxChanged
(function() {
	// Keep a reference to the original function.
	var _original = toolboxChanged;
	
	// Override a function.
	toolboxChanged = function() {
		
		var rv = _original.apply(null, arguments);
		cardbookLocales.updateDocument();
		
	};
})();
