function xpunge_ge_doMenuActionOptions() {
	xpunge_ge_ShowPrefsWindow();
}

function xpunge_ge_ShowPrefsWindow() {
	window.openDialog('chrome://xpunge/content/xpunge_options.xul', 'xpunge-prefs', 'chrome');
}
