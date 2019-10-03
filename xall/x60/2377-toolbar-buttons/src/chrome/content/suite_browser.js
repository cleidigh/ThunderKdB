toolbar_buttons.toolbar_button_loader(toolbar_buttons, {
		cloneSeaTab: function(event) {
		var win = event.target.ownerDocument.defaultView;
		var aTab = win.gBrowser.selectedTab;
		var href = aTab.linkedBrowser.contentDocument.location.href;
		win.gBrowser.selectedTab = win.gBrowser.addTab(href);
	}
});
