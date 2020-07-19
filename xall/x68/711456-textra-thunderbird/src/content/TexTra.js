Nict_TexTra.utils.get_browser_params();

function show_popup(str_func) {
    Nict_TexTra.utils.console_log("TexTra.js");
    Nict_TexTra.utils.console_log(document.getElementById('table_locale'));
    Nict_TexTra.utils.console_log("TexTra.js2 >> ffdsa");
	Nict_TexTra.popup.show_popup(str_func);
}

function show_property() {
    window.openDialog("chrome://TexTra/content/xul/API_settings.xul", "TexTra_property", "chrome, toolbar, dependent, centerscreen, alwaysRaised");
}

function show_regist_terms() {
    window.openDialog("chrome://TexTra/content/xul/regist_term.xul", "TexTra_regist_term", "chrome, dependent, centerscreen, alwaysRaised");
}

function show_translate_form() {
    window.openDialog("chrome://TexTra/content/xul/main.xul", "TexTra_translate", "chrome, toolbar, dependent, centerscreen, alwaysRaised, resizable");
}

function show_menu_on_toolbar_button() {
    show_translate_form();
}

