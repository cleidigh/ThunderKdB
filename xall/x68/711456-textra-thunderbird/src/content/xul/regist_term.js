Nict_TexTra.utils.get_browser_params();

window.addEventListener("load", window_load);

function window_load() {
    let lang1 = Nict_TexTra.browser_params.getCharPref("selected_lang_org");
    let lang2 = Nict_TexTra.browser_params.getCharPref("selected_lang_trans");
    Nict_TexTra.utils.add_lang_to_select_box(document.getElementById("sb_lang_org"), lang1);
    Nict_TexTra.utils.add_lang_to_select_box(document.getElementById("sb_lang_trans"), lang2);
    search_term_dics();
}

// 検索 用語集 コンボボックス
function search_term_dics() {
    var lang_org = document.getElementById("sb_lang_org").value;
    var lang_trans = document.getElementById("sb_lang_trans").value;

    Nict_TexTra.api.call_api(Nict_TexTra.api.search_term_dic, set_list_term_dic, null, { "lang_org": lang_org, "lang_trans": lang_trans });
}

// 用語集コンボボックス
function set_list_term_dic(infos) {

    var obj_select = document.getElementById("sb_dic_term");
    obj_select.removeAllItems();

    var list_dic_info = infos["resultset"]["result"]["list"];
    var len_list = list_dic_info.length;
    for (var ind = 0; ind < len_list; ind++) {
        var dic_info = list_dic_info[ind];
        obj_select.appendItem(dic_info["name"], dic_info["id"]);
    }
    obj_select.selectedIndex = 0;
    set_url_on_combo_dic();
}

function set_url_on_combo_dic() {
    var id = document.getElementById("sb_dic_term").value;
    var url = Nict_TexTra.utils.get_url_minhon("content/menu/");
    if (id) url = Nict_TexTra.utils.get_url_minhon("content/term/index.html?q_kind=term&q_term_root_id=" + id);
    document.getElementById("link_dic_term").href = url;
}

function regist_term() {

    var table_locale = document.getElementById('table_locale');
    var select_dic = document.getElementById("sb_dic_term");
    if (select_dic.selectedIndex == -1) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes02_001")); return; } // 用語集を選択してください。

    var selected_item = select_dic.selectedItem;
    var id = select_dic.value;
    var term_org = document.getElementById("text_term_org").value.trim();
    var term_trans = (document.getElementById("text_term_trans").value + "").trim();

    if (!id) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes02_001")); return; } // 用語集を選択してください。
    if (!term_org) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes02_002")); return; } // 用語を入力してください。
    if (!term_trans) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes02_003")); return; } // 訳を入力してください。

    // 以下を用語集に登録します。\nよろしいですか？、登録先、用語、訳
    var dic_name = selected_item.label;
    if (!confirm(Nict_TexTra.utils.bundle.GetStringFromName("Mes02_004") + "\n\n" + 
        Nict_TexTra.utils.bundle.GetStringFromName("Mes02_005") + " >> " + dic_name + "\n" +            
        Nict_TexTra.utils.bundle.GetStringFromName("Mes02_006") + "：" + term_org + "\n" +               
        Nict_TexTra.utils.bundle.GetStringFromName("Mes02_007") + "　：" + term_trans + "\n")) return; 

    Nict_TexTra.api.call_api(Nict_TexTra.api.regist_term_dic, function () { alert("登録しました。"); }
        , null, { "id": id, "term_org": term_org, "term_trans": term_trans });

}

function replace_language() {
    Nict_TexTra.utils.replace_lang_combo(document.getElementById("sb_lang_org"), document.getElementById("sb_lang_trans"));
}

function check_lang_combo1() {
    Nict_TexTra.utils.change_different_lang(document.getElementById("sb_lang_org"), document.getElementById("sb_lang_trans"));
}

function check_lang_combo2() {
    Nict_TexTra.utils.change_different_lang(document.getElementById("sb_lang_trans"), document.getElementById("sb_lang_org"));
}

function open_dic_page() {
    var url = document.getElementById("link_dic_term").href;
    Nict_TexTra.utils.show_other_site(url);
}
