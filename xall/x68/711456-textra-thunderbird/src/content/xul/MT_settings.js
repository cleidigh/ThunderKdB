Nict_TexTra.utils.get_browser_params();

window.addEventListener("load", window_load);

function window_load() {

    let lang1 = Nict_TexTra.browser_params.getCharPref("selected_lang_org");
    let lang2 = Nict_TexTra.browser_params.getCharPref("selected_lang_trans");
    Nict_TexTra.utils.add_lang_to_select_box(document.getElementById("sb_lang_org"), lang1);
    Nict_TexTra.utils.add_lang_to_select_box(document.getElementById("sb_lang_trans"), lang2);
    set_url();
    set_link_MT_list();

}

function set_url() {

    var lang_org = document.getElementById("sb_lang_org").value;
    var lang_trans = document.getElementById("sb_lang_trans").value;

    var elm_txt_url = document.getElementById("text_URL");
    var str_MT_urls = Nict_TexTra.browser_params.getCharPref("mt_api_urls");
    var url = JSON.parse(str_MT_urls)[lang_org + "_" + lang_trans];
    elm_txt_url.value = url ? url : "";

}

function save_url(erase) {

    var lang_org = document.getElementById("sb_lang_org").value;
    var lang_trans = document.getElementById("sb_lang_trans").value;
    var elm_txt_url = document.getElementById("text_URL");
    if (erase) elm_txt_url.value = "";

    var str_MT_urls = Nict_TexTra.browser_params.getCharPref("mt_api_urls");
    var urls_before = JSON.parse(str_MT_urls);
    var urls = JSON.parse(str_MT_urls);

    urls[lang_org + "_" + lang_trans] = elm_txt_url.value;

    Nict_TexTra.browser_params.setCharPref("mt_api_urls", JSON.stringify(urls));

    var table_locale = document.getElementById('table_locale');
    var func_success = function () {
        alert(!erase ? Nict_TexTra.utils.bundle.GetStringFromName("Saved") : Nict_TexTra.utils.bundle.GetStringFromName("SetAsDefault")); // 保存しました/デフォルトに設定しました。
    };

    var func_fail = function () {
        Nict_TexTra.browser_params.setCharPref("mt_api_urls", JSON.stringify(urls_before));
        alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes01_001")); // 指定されたURLでは\nAPIを呼び出すことができませんでした。
    };

    Nict_TexTra.api.call_api(Nict_TexTra.api.trans_text,
        func_success, func_fail,
        { "text_org": "this is api test.", "lang_org": lang_org, "lang_trans": lang_trans });

}

function save_default_url(erase) {
    Nict_TexTra.browser_params.setCharPref("mt_api_urls", "{}");
}

function replace_language() {
    Nict_TexTra.utils.replace_lang_combo(document.getElementById("sb_lang_org"), document.getElementById("sb_lang_trans"));
    set_url();
}

function check_lang_combo1() {
    Nict_TexTra.utils.change_different_lang(document.getElementById("sb_lang_org"), document.getElementById("sb_lang_trans"));
    set_url();
}

function check_lang_combo2() {
    Nict_TexTra.utils.change_different_lang(document.getElementById("sb_lang_trans"), document.getElementById("sb_lang_org"));
    set_url();
}

// 翻訳API一覧を開くリンク
function set_link_MT_list() {

    var elm_link = document.getElementById("link_MT_list");
    elm_link.href = Nict_TexTra.utils.get_url_minhon("content/mt/");

}