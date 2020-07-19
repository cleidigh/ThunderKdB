window.addEventListener("load", window_load_refer_dic);

function window_load_refer_dic() {
    document.getElementById("link_open_history_refer_dic").onclick = function () {
        show_panels("hist_trans");
        set_history_panel("dic");
    };
}

// 辞書引き
function call_refer_dic() {
    var text_org = document.getElementById("tb_ref_dic_txt_org").value;
    var lang_org = Nict_TexTra.browser_params.getCharPref("selected_lang_org");
    var lang_trans = Nict_TexTra.browser_params.getCharPref("selected_lang_trans");
    if (!text_org) {
        var table_locale = document.getElementById('table_locale');
        alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes05_001")); // 単語を入力してください。
        return false;
    }
    call_refer_dic2(text_org, lang_org, lang_trans);
}

var _ignore_history_ref_dic;

function call_refer_dic2(text_org, lang_org, lang_trans, ignore_history) {
    document.getElementById("img_refer_dic_please_wait").style.display = "block";
    Nict_TexTra.api.call_api(Nict_TexTra.api.refer_dic, set_result_refer_dic, null, 
        { "text_org": text_org, "lang_org": lang_org, "lang_trans": lang_trans });
    _ignore_history_ref_dic = ignore_history;
}

// 辞書引き 結果表示
function set_result_refer_dic(infos) {

    document.getElementById("img_refer_dic_please_wait").style.display = "none";

    var result_lookups = infos["resultset"]["result"]["lookup"];

    var list_result = [];
    var ind0 = 0;
    $.each(result_lookups, function (ind1, res_lookup) {
        var result_terms = res_lookup["term"];
        var term_hit = res_lookup["hit"];
        var list_terms = [];
        $.each(result_terms, function (ind2, res_term) {
            list_terms.push(res_term["target"]);
        });
        list_result.push((ind0 + 1) + ". " + term_hit +
            "\r=======================\r" +
            list_terms.join(", "));
        ind0++;
    });

    var txt_result = list_result.join("\r\r");
    for (var cnt = 0; cnt < 10; cnt++) txt_result += "\r";
    document.getElementById("tb_ref_dic_result").value = txt_result;

    if (!_ignore_history_ref_dic) Nict_TexTra.utils.add_history_refer_dic(infos["text_org"], infos["lang_org"], infos["lang_trans"]);

}

