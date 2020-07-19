window.addEventListener("load", window_load_trs);

function window_load_trs() {
    document.getElementById("link_open_history_trs").onclick = function () {
        show_panels("hist_trans");
        set_history_panel("trans");
    };

    set_link_open_taiyaku_dic();
}

// 翻訳APIを呼び出す。
function call_trans_text() {

    var text_org = document.getElementById("tb_trs_txt_org").value;
    var lang_org = Nict_TexTra.browser_params.getCharPref("selected_lang_org");
    var lang_trans = Nict_TexTra.browser_params.getCharPref("selected_lang_trans");
    if (!text_org) {
        var table_locale = document.getElementById('table_locale');
        alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes07_001")); // 原文を入力してください。
        return false;
    }
    call_trans_text2(text_org, lang_org, lang_trans);

}

var _ignore_history_trans = false;

function call_trans_text2(text_org, lang_org, lang_trans, ignore_history) {
    document.getElementById("hdn_trs_lang_org").value = lang_org;
    document.getElementById("hdn_trs_lang_trs").value = lang_trans;
    document.getElementById("img_trs_please_wait").style.display = "block";

    var elm_trans = document.getElementById("box_trs_trans");
    while (elm_trans.firstChild) { elm_trans.removeChild(elm_trans.firstChild); }

    Nict_TexTra.api.call_api(Nict_TexTra.api.trans_text_split, show_trans_text2, null,
        { "text_org": text_org, "lang_org": lang_org, "lang_trans": lang_trans });

    set_link_open_taiyaku_dic();
    _ignore_history_trans = ignore_history;

}

// APIから送られてきた翻訳文をセットする。
// 区切られた文ごとに複数回呼ばれる。
function show_trans_text2(infos) {

    var elm_trans = document.getElementById("box_trs_trans");
    document.getElementById("img_trs_please_wait").style.display = "none";

    var len_texts = infos["len_split"];
    var ind_texts = infos["ind_split"];
    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];

    var str_src_trans = "";
    var src_trans = infos["src"];
    var table_locale = document.getElementById('table_locale');
    switch (src_trans) {
        case "ruiji": str_src_trans = "[" + Nict_TexTra.utils.bundle.GetStringFromName("Mes07_002") + "]"; break; // 対訳集より
    }

    if (elm_trans.childNodes.length == 0) {

        //var in_text = "";
        for (var ind = 0; ind < len_texts; ind++) {

            var elm_box_1 = document.createElement("box");
            elm_trans.appendChild(elm_box_1);

            var elm_img_trs_wait = document.createElement("image");
            elm_box_1.appendChild(elm_img_trs_wait);
            elm_img_trs_wait.setAttribute("id", "img_trs_please_wait" + ind);
            elm_img_trs_wait.setAttribute("src", "chrome://TexTra/skin/icons/please_wait.gif");

            var elm_box_2 = document.createElement("box");
            elm_trans.appendChild(elm_box_2);
            elm_box_2.setAttribute("id", "TexTra_trans_" + ind);
            elm_box_2.setAttribute("orient", "vertical");
            elm_box_2.setAttribute("hidden", "true");

            var elm_label_org = document.createElement("label");
            elm_box_2.appendChild(elm_label_org);
            elm_label_org.setAttribute("value", "= " + (ind + 1) + " = " + str_src_trans);

            var elm_tb_org = document.createElement("textbox");
            elm_box_2.appendChild(elm_tb_org);
            elm_tb_org.setAttribute("id", "text_org_" + ind);
            elm_tb_org.setAttribute("multiline", "true");

            var elm_tb_trans = document.createElement("textbox");
            elm_box_2.appendChild(elm_tb_trans);
            elm_tb_trans.setAttribute("id", "text_trans_" + ind);
            elm_tb_trans.setAttribute("multiline", "true");

            var label_src = document.createElement("label");
            elm_box_2.appendChild(label_src);
            label_src.setAttribute("id", "src_" + ind);
            label_src.setAttribute("hidden", "true");

            var elm_box_3 = document.createElement("box");
            elm_box_2.appendChild(elm_box_3);
            elm_box_3.setAttribute("orient", "horizon");
            elm_box_3.setAttribute("align", "right");

            var elm_btn_trans_good = document.createElement("image");
            elm_box_3.appendChild(elm_btn_trans_good);
            elm_btn_trans_good.setAttribute("id", "btn_trans_good_" + ind);
            elm_btn_trans_good.setAttribute("src", "chrome://TexTra/skin/icons/trans_good.png");
            elm_btn_trans_good.setAttribute("style", "width:30px; height:30px; vertical-align:middle;");
            elm_btn_trans_good.setAttribute("title", "Good!");

            var elm_btn_reffer_dic = document.createElement("image");
            elm_box_3.appendChild(elm_btn_reffer_dic);
            elm_btn_reffer_dic.setAttribute("id", "btn_reffer_dic_" + ind);
            elm_btn_reffer_dic.setAttribute("src", "chrome://TexTra/skin/icons/dic.png");
            elm_btn_reffer_dic.setAttribute("style", "width:30px; height:30px; vertical-align:middle;");
            elm_btn_reffer_dic.setAttribute("title", Nict_TexTra.utils.bundle.GetStringFromName("Mes07_003")); // 辞書を引く

            var elm_btn_modify_trans = document.createElement("image");
            elm_box_3.appendChild(elm_btn_modify_trans);
            elm_btn_modify_trans.setAttribute("id", "btn_modify_trans_" + ind);
            elm_btn_modify_trans.setAttribute("src", "chrome://TexTra/skin/icons/modify_trans.png");
            elm_btn_modify_trans.setAttribute("style", "width:30px; height:30px; vertical-align:middle;");
            elm_btn_modify_trans.setAttribute("title", Nict_TexTra.utils.bundle.GetStringFromName("Mes07_004")); // 翻訳を修正

            var elm_box = document.createElement("box");
            elm_trans.appendChild(elm_box);
            elm_box.setAttribute("height", "10");

            elm_btn_trans_good.onclick = (function (ind_click) {
                return function () { func_btn_trans_good(ind_click); };
            })(ind);
            elm_btn_reffer_dic.onclick = (function (ind_click) {
                return function () { func_btn_reffer_dic(ind_click); };
            })(ind);
            elm_btn_modify_trans.onclick = (function (ind_click) {
                return function () { func_btn_modify_trans(ind_click); };
            })(ind);

        }

        var elm_box = document.createElement("box");
        elm_trans.appendChild(elm_box);
        elm_box.setAttribute("height", "50");

    }

    var text_org = infos["text_org"];
    var text_trans = infos["text_trans"];
    document.getElementById("text_org_" + ind_texts).setAttribute("value", text_org);
    document.getElementById("text_trans_" + ind_texts).setAttribute("value", text_trans);
    document.getElementById("src_" + ind_texts).setAttribute("value", src_trans);

    document.getElementById("img_trs_please_wait" + ind_texts).hidden = true;
    document.getElementById("TexTra_trans_" + ind_texts).hidden = false;

    if (!_ignore_history_trans) Nict_TexTra.utils.add_history_translate(text_org, text_trans, lang_org, lang_trans);

}

// 対訳集を開くリンク
function set_link_open_taiyaku_dic() {
    var lang_org = Nict_TexTra.browser_params.getCharPref("selected_lang_org");
    var lang_trans = Nict_TexTra.browser_params.getCharPref("selected_lang_trans");
    Nict_TexTra.api.call_api(Nict_TexTra.api.search_taiyaku_dic, set_link_open_taiyaku_dic2, null,
        { "lang_org": lang_org, "lang_trans": lang_trans });
}

// 対訳集を開くリンク
function set_link_open_taiyaku_dic2(infos) {

    var list_taiyaku_dic = infos["resultset"]["result"]["list"];
    var has_dic = list_taiyaku_dic.length > 0;
    var link_trs = document.getElementById("link_dic_taiyaku_trs");
    var link_rt = document.getElementById("link_dic_taiyaku_rt");

    if (has_dic) {
        var id_dic = list_taiyaku_dic[0]["id"];
        var url =
            Nict_TexTra.utils.get_url_minhon("content/term/index.html" +
                "?q_kind=bilingual&q_term_root_id=" + id_dic);
        link_trs.href = url;
        link_rt.href = url;
    } else {
        link_trs.href = null;
        link_rt.href = null;
    }

}

function open_dic_taiyaku_page() {
    var url = document.getElementById("link_dic_taiyaku_trs").href;
    Nict_TexTra.utils.show_other_site(url);
}

// goodボタン処理
function func_btn_trans_good(ind_click) {
    var text_org = document.getElementById("text_org_" + ind_click).value;
    var text_trans = document.getElementById("text_trans_" + ind_click).value;
    var table_locale = document.getElementById('table_locale');

    if (!confirm(Nict_TexTra.utils.bundle.GetStringFromName("Mes07_005") + "\n\n" +
        Nict_TexTra.utils.bundle.GetStringFromName("Org_Sent") + "：\n" + text_org + "\n" +
        Nict_TexTra.utils.bundle.GetStringFromName("Trs_Sent") + "：\n" + text_trans + "\n")) return; // 以下を対訳集に登録します。\nよろしいですか？、原文、訳文

    Nict_TexTra.api.call_api(Nict_TexTra.api.search_taiyaku_dic, regist_taiyaku_for_modify_trans, null,
        { "text_org": text_org, "text_trans": text_trans });
}

// 翻訳修正 対訳集情報取得後
function regist_taiyaku_for_modify_trans(infos) {

    var list_dic = infos["resultset"]["result"]["list"];
    var table_locale = document.getElementById('table_locale');
    if (list_dic.length == 0) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes07_006")); return; }; // 登録先の対訳集がありませんでした。\n「みんなの自動翻訳」で対訳集を作成してください。

    var dic_info = list_dic[0];
    Nict_TexTra.api.call_api(Nict_TexTra.api.regist_taiyaku, show_message_registed_taiyaku, null,
        { "id": dic_info["id"], "text_org": infos["text_org"], "text_trans": infos["text_trans"] });


}

// 訳文登録後
function show_message_registed_taiyaku(infos) {

    var table_locale = document.getElementById('table_locale');
    alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes07_005") + "\n\n" +
        Nict_TexTra.utils.bundle.GetStringFromName("Org_Sent") + "：\n" + infos["text_org"] + "\n\n" +
        Nict_TexTra.utils.bundle.GetStringFromName("Trs_Sent") + "：\n" + infos["text_trans"] + "\n"); // 翻訳文を登録しました。、原文、訳文

}

//辞書引き
function func_btn_reffer_dic(ind_click) {
    var text_org = document.getElementById("text_org_" + ind_click).value;
    document.getElementById("tb_ref_dic_txt_org").value = text_org;
    call_refer_dic();
    show_panels('ref_dic');
}

//対訳登録
function func_btn_modify_trans(ind_click) {
    var text_org = document.getElementById("text_org_" + ind_click).value;
    var text_trs = document.getElementById("text_trans_" + ind_click).value;
    document.getElementById("tb_rt_txt_org").value = text_org;
    document.getElementById("tb_rt_txt_trans").value = text_trs;
    show_panels('regist_taiyaku');
}


