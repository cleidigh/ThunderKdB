Nict_TexTra.utils.get_browser_params();

window.addEventListener("load", window_load);

function window_load() {
    let lang1 = Nict_TexTra.browser_params.getCharPref("selected_lang_org");
    let lang2 = Nict_TexTra.browser_params.getCharPref("selected_lang_trans");
    Nict_TexTra.utils.add_lang_to_select_box(document.getElementById("sb_lang_org"), lang1);
    Nict_TexTra.utils.add_lang_to_select_box(document.getElementById("sb_lang_trans"), lang2);
    Nict_TexTra.utils.console_log(Nict_TexTra.utils.string_to_check_update);
}

function show_panels(cd_box) {

    var box_trans = document.getElementById("box_trs");
    var box_ref_dic = document.getElementById("box_ref_dic");
    var box_regist_taiyaku = document.getElementById("box_regist_taiyaku");
    var box_hist_trans = document.getElementById("box_history");
    var box_lang = document.getElementById("box_lang");
    box_trans.hidden = true;
    box_ref_dic.hidden = true;
    box_regist_taiyaku.hidden = true;
    box_hist_trans.hidden = true;
    box_lang.hidden = true;

    var cate = null;
    var box_target = null;
    var str_2lang = "[" + Nict_TexTra.utils.get_2lang_name(
        Nict_TexTra.browser_params.getCharPref("selected_lang_org"),
        Nict_TexTra.browser_params.getCharPref("selected_lang_trans")) + "]";
    var table_locale = document.getElementById('table_locale');
    switch (cd_box) {
        case "trans": cate = Nict_TexTra.utils.bundle.GetStringFromName("Translation") + str_2lang; box_target = box_trans; break;
        case "ref_dic": cate = Nict_TexTra.utils.bundle.GetStringFromName("Lookup") + str_2lang; box_target= box_ref_dic; break;
        case "regist_taiyaku":
            cate = Nict_TexTra.utils.bundle.GetStringFromName("RegisterBil") + str_2lang; box_target = box_regist_taiyaku; // 対訳登録
            set_link_open_taiyaku_dic();
            break;
        case "hist_trans":
            cate = Nict_TexTra.utils.bundle.GetStringFromName("TransHist"); box_target = box_hist_trans; // 翻訳履歴
            set_history_panel();
            break;
        case "lang": cate = Nict_TexTra.utils.bundle.GetStringFromName("LangSet"); box_target = box_lang; break; // 言語設定
    }

    document.title = "TexTra [" + cate + "]";
    box_target.hidden = false;

}

function replace_language() {
    Nict_TexTra.utils.replace_lang_combo(document.getElementById("sb_lang_org"), document.getElementById("sb_lang_trans"));
    save_lang_property();
}

function check_lang_combo1() {
    Nict_TexTra.utils.change_different_lang(document.getElementById("sb_lang_org"), document.getElementById("sb_lang_trans"));
    save_lang_property();
}

function check_lang_combo2() {
    Nict_TexTra.utils.change_different_lang(document.getElementById("sb_lang_trans"), document.getElementById("sb_lang_org"));
    save_lang_property();
}

function save_lang_property() {
    Nict_TexTra.browser_params.setCharPref("selected_lang_org", document.getElementById("sb_lang_org").value);
    Nict_TexTra.browser_params.setCharPref("selected_lang_trans", document.getElementById("sb_lang_trans").value);
}

function show_form_regist_term() {
    window.openDialog("chrome://TexTra/content/xul/regist_term.xul", "TexTra_regist_term", "chrome, dependent, centerscreen, alwaysRaised");
}

function show_form_api_settings() {
    window.openDialog("chrome://TexTra/content/xul/API_settings.xul", "TexTra_property", "chrome, dependent, centerscreen, alwaysRaised");
}

function show_form_mt_settings() {
    window.openDialog("chrome://TexTra/content/xul/MT_settings.xul", "TexTra_MT_settings", "chrome, dependent, centerscreen, alwaysRaised");
}

function show_help(id_help) {
    var url = Nict_TexTra.utils.get_url_minhon("content/tool/thunderbird/help/");
    Nict_TexTra.utils.show_other_site(url);
}

function show_minhon() {
    var url = Nict_TexTra.utils.get_url_minhon();
    Nict_TexTra.utils.show_other_site(url);
}
