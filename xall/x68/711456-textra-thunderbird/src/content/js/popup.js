var Nict_TexTra = Nict_TexTra || {};
Nict_TexTra.popup = Nict_TexTra.popup || {};

Nict_TexTra.utils.get_browser_params();

Nict_TexTra.popup._popup_form = null;
Nict_TexTra.popup._popup_modify_trans = null;

Nict_TexTra.popup.show_popup = function (str_func) {

    //Nict_TexTra.utils.console_log("show_popup_aaa");
    var table_locale = document.getElementById('table_locale');
    var text_org = window.content.getSelection().toString();
    if (!text_org || text_org.trim() == "") { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes11_001")); return; } // テキストを選択してください。

    if (str_func == "dict") {
        Nict_TexTra.popup.show_popup_dict(text_org);
        Nict_TexTra.api.call_api(Nict_TexTra.api.refer_dic, Nict_TexTra.popup.set_result_from_dict_on_pop, null, { "text_org": text_org });
    } else if (str_func == "trans") {
        Nict_TexTra.popup.show_popup_trans(text_org);
        Nict_TexTra.api.call_api(Nict_TexTra.api.trans_text_split, Nict_TexTra.popup.set_text_trans_on_popup, null, { "text_org": text_org });
    } else {
        alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes11_002") + " > " + str_func); // 異常なパラメータの指定
        return;
    }

    var doc = window.content.document;
    $(doc).on("click", function (ev) {
        var popup_form = Nict_TexTra.popup._popup_form;
        if (popup_form) {
            var rect = popup_form.getBoundingClientRect();
            var mx = ev.clientX; var my = ev.clientY;
            if (!(rect.left < mx && mx < rect.right
                && rect.top < my && my < rect.bottom))
                Nict_TexTra.popup.close_popup();
        }
    });

};

Nict_TexTra.popup.show_popup_trans = function (text_org) {

    Nict_TexTra.popup.close_popup();
    Nict_TexTra.popup.close_popup_modify_trans();

    var doc = window.content.document;
    var pop = doc.createElement("div");
    Nict_TexTra.popup._popup_form = pop;

    var style = pop.style;
    Nict_TexTra.popup.set_popup_style(style);

    doc.body.appendChild(pop);

    var lang_org = Nict_TexTra.browser_params.getCharPref("selected_lang_org");
    var lang_trans = Nict_TexTra.browser_params.getCharPref("selected_lang_trans");

    var elm_div_title = doc.createElement("div");
    pop.appendChild(elm_div_title);

    var table_locale = document.getElementById('table_locale');
    var elm_table_title = doc.createElement("table"); elm_div_title.appendChild(elm_table_title);
    elm_table_title.setAttribute("width", "100%");
    elm_table_title.setAttribute("bgcolor", "#FFFFFF");
    var elm_table_tr = doc.createElement("tr"); elm_table_title.appendChild(elm_table_tr);
    var elm_table_td1 = doc.createElement("td"); elm_table_tr.appendChild(elm_table_td1);
    elm_table_td1.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px; border-style: none;");
    elm_table_td1.setAttribute("align", "left");
    elm_table_td1.setAttribute("width", "60%");
    elm_table_td1.innerText = "TexTra " + Nict_TexTra.utils.bundle.GetStringFromName("Translation") + " [" + Nict_TexTra.utils.get_2lang_name(lang_org, lang_trans) + "]"; // 翻訳
    var elm_table_td2 = doc.createElement("td"); elm_table_tr.appendChild(elm_table_td2);
    elm_table_td2.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px; border-style: none;");
    elm_table_td2.setAttribute("align", "right");
    elm_table_td2.setAttribute("width", "40%");

    var elm_btn_replace_lang = doc.createElement("input");
    elm_table_td2.appendChild(elm_btn_replace_lang);
    elm_btn_replace_lang.setAttribute("type", "button");
    elm_btn_replace_lang.setAttribute("id", "btn_replace_lang");
    elm_btn_replace_lang.setAttribute("style", "width:50px;");
    elm_btn_replace_lang.setAttribute("value", Nict_TexTra.utils.get_2lang_name(lang_trans, lang_org));
    elm_btn_replace_lang.onclick = function () {
        Nict_TexTra.browser_params.setCharPref("selected_lang_org", lang_trans);
        Nict_TexTra.browser_params.setCharPref("selected_lang_trans", lang_org);
        Nict_TexTra.popup.show_popup_trans(text_org);
        Nict_TexTra.api.call_api(Nict_TexTra.api.trans_text_split, Nict_TexTra.popup.set_text_trans_on_popup, null, { "text_org": text_org });
    };

    var elm_div_wait = doc.createElement("div");
    pop.appendChild(elm_div_wait);
    elm_div_wait.setAttribute("id", "text_trans_wait");
    elm_div_wait.setAttribute("style", "margin:5px;");
    elm_div_wait.setAttribute("align", "left");
    var elm_table = doc.createElement("table");
    elm_div_wait.appendChild(elm_table);
    var elm_tr = doc.createElement("tr");
    elm_table.appendChild(elm_tr);
    var elm_td = doc.createElement("td");
    elm_tr.appendChild(elm_td);
    elm_td.setAttribute("style", "border: 0px; vertical-align: middle; background: #F4F7DE;");
    elm_td.innerText = Nict_TexTra.utils.bundle.GetStringFromName("Mes11_003"); // 翻訳中・・・

    var elm_div_trans = doc.createElement("div");
    pop.appendChild(elm_div_trans);
    elm_div_trans.setAttribute("id", "text_trans");
    elm_div_trans.setAttribute("style", "margin:5px; overflow:scroll; height:300px;");
    elm_div_trans.setAttribute("align", "left");

};

Nict_TexTra.popup.set_popup_style = function (style) {

    var rect_arrey = window.content.getSelection().getRangeAt(0).getClientRects();
    var rect_st = rect_arrey[0];
    var rect_ed = rect_arrey[rect_arrey.length - 1];
    var doc = window.content.document;

    style.position = "absolute";
    style.top = ($(doc).scrollTop() + rect_ed.bottom) + "px";
    style.left = ($(doc).scrollLeft() + rect_st.left + 10) + "px";
    style.width = "400px";
    style.backgroundColor = "#F4F7DE";
    style.border = "5px #B9D2BD solid";
    style.borderRadius = "10px";
    style.boxShadow = "5px 5px 10px #444";
    style.font = "14px 'ＭＳ ゴシック'";
    style.color = "black";
    style.zindex = "2147483647"; //memo:style.positionの指定が必要
};

Nict_TexTra.popup.set_text_trans_on_popup = function (infos) {

    var doc = window.content.document;
    var table_locale = document.getElementById('table_locale');
    var elm_trans_area = doc.getElementById("text_trans");
    var len_texts = infos["len_split"];
    var ind_texts = infos["ind_split"];
    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];

    if (elm_trans_area.childNodes.length == 0) {

        for (var ind = 0; ind < len_texts; ind++) {
            var elm_trans = doc.createElement("div");
            elm_trans_area.appendChild(elm_trans);
            elm_trans.setAttribute("id", "TexTra_trans_" + ind);

            var elm_text_org = doc.createElement("div");
            elm_trans.appendChild(elm_text_org);
            elm_text_org.setAttribute("id", "text_org_" + ind);

            var elm_text_trans = doc.createElement("div");
            elm_trans.appendChild(elm_text_trans);
            elm_text_trans.setAttribute("id", "text_trans_" + ind);

            var elm_src = doc.createElement("div");
            elm_trans.appendChild(elm_src);
            elm_src.setAttribute("id", "src_" + ind);
            elm_src.setAttribute("style", "display:none;");

            var elm_str_src = doc.createElement("div");
            elm_trans.appendChild(elm_str_src);
            elm_str_src.setAttribute("id", "str_src_" + ind);

            var elm_buttons = doc.createElement("div");
            elm_trans.appendChild(elm_buttons);
            elm_buttons.setAttribute("style", "margin:10px;");
            elm_buttons.setAttribute("align", "right");

            var elm_btn_trans_good = doc.createElement("input");
            elm_buttons.appendChild(elm_btn_trans_good);
            elm_btn_trans_good.setAttribute("type", "button");
            elm_btn_trans_good.setAttribute("id", "btn_trans_good_" + ind);
            elm_btn_trans_good.setAttribute("style", "width:25%; height:30px;");
            elm_btn_trans_good.setAttribute("value", "Good!!");

            var elm_btn_reffer_dic = doc.createElement("input");
            elm_buttons.appendChild(elm_btn_reffer_dic);
            elm_btn_reffer_dic.setAttribute("type", "button");
            elm_btn_reffer_dic.setAttribute("id", "btn_reffer_dic_" + ind);
            elm_btn_reffer_dic.setAttribute("style", "width:25%; height:30px;");
            elm_btn_reffer_dic.setAttribute("value", Nict_TexTra.utils.bundle.GetStringFromName("Mes11_004")); // 辞書

            var elm_btn_modify_trans = doc.createElement("input");
            elm_buttons.appendChild(elm_btn_modify_trans);
            elm_btn_modify_trans.setAttribute("type", "button");
            elm_btn_modify_trans.setAttribute("id", "btn_modify_trans_" + ind);
            elm_btn_modify_trans.setAttribute("style", "width:25%; height:30px;");
            elm_btn_modify_trans.setAttribute("value", Nict_TexTra.utils.bundle.GetStringFromName("Mes11_005")); // 修正

            var elm_br = doc.createElement("br"); elm_trans.appendChild(elm_br);

        }

        for (var ind = 0; ind < 5; ind++) {
            var elm_br2 = doc.createElement("br"); elm_trans_area.appendChild(elm_br2);
        }

        for (var ind = 0; ind < len_texts; ind++) {
            doc.getElementById("btn_trans_good_" + ind).onclick = (function (num) {
                return function () {
                    var src = doc.getElementById("src_" + num).innerText;
                    if (!src) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes11_006")); return; }  // 登録済みです。// 類似文の再登録を防ぐ
                    var text_org = doc.getElementById("text_org_" + num).innerText;
                    var text_trans = doc.getElementById("text_trans_" + num).innerText;
                    Nict_TexTra.api.call_api(Nict_TexTra.api.search_taiyaku_dic, regist_taiyaku_for_modify_trans, null,
                        { "text_org": text_org, "text_trans": text_trans });
                };
            })(ind);
            doc.getElementById("btn_reffer_dic_" + ind).onclick = (function (num) {
                return function () {
                    var text_org = doc.getElementById("text_org_" + num).innerText;
                    Nict_TexTra.popup.close_popup();
                    Nict_TexTra.popup.show_popup_dict(text_org);
                    Nict_TexTra.api.call_api(Nict_TexTra.api.refer_dic, Nict_TexTra.popup.set_result_from_dict_on_pop, null, { "text_org": text_org });
                };
            })(ind);
            doc.getElementById("btn_modify_trans_" + ind).onclick = (function (num) {
                return function () {
                    var text_org = doc.getElementById("text_org_" + num).innerText;
                    var text_trans = doc.getElementById("text_trans_" + num).innerText;
                    Nict_TexTra.popup.show_popup_modify_trans(text_org, text_trans, lang_org, lang_trans);
                };
            })(ind);
        }
    }

    var text_org = infos["text_org"];
    var text_trans = infos["text_trans"];
    var str_src_trans = "";
    var src_trans = infos["src"];
    switch (src_trans) {
        case "ruiji": str_src_trans = "[" + Nict_TexTra.utils.bundle.GetStringFromName("Mes11_007") + "]"; break; // 対訳集より
    }
    doc.getElementById("text_org_" + ind_texts).innerText = text_org;
    doc.getElementById("text_trans_" + ind_texts).innerText = text_trans;
    doc.getElementById("src_" + ind_texts).innerText = src_trans;
    doc.getElementById("str_src_" + ind_texts).innerText = str_src_trans;

    var cnt_txt = 0;
    var len_txt = 0;

    $.each(elm_trans_area.childNodes, function (ind, nd) {
        if (nd.id.indexOf("TexTra_trans_") < 0) return;
        if (nd.firstChild.innerText) cnt_txt++;
        len_txt++;
    });

    if (cnt_txt == len_txt) {
        var elm_wait = doc.getElementById("text_trans_wait");
        while (elm_wait.firstChild) elm_wait.removeChild(elm_wait.firstChild);
    }

    Nict_TexTra.utils.add_history_translate(text_org, text_trans, lang_org, lang_trans);

};

// 辞書引きポップアップ
Nict_TexTra.popup.show_popup_dict = function (text_org) {

    Nict_TexTra.popup.close_popup();
    var doc = window.content.document;
    var pop = doc.createElement("div");
    Nict_TexTra.popup._popup_form = pop;

    var style = pop.style;
    Nict_TexTra.popup.set_popup_style(style);

    doc.body.appendChild(pop);

    var lang_org = Nict_TexTra.browser_params.getCharPref("selected_lang_org");
    var lang_trans = Nict_TexTra.browser_params.getCharPref("selected_lang_trans");

    var elm_div_title = doc.createElement("div");
    pop.appendChild(elm_div_title);

    var table_locale = document.getElementById('table_locale');
    var elm_table_title = doc.createElement("table"); elm_div_title.appendChild(elm_table_title);
    elm_table_title.setAttribute("width", "100%");
    elm_table_title.setAttribute("bgcolor", "#FFFFFF");
    var elm_table_tr = doc.createElement("tr"); elm_table_title.appendChild(elm_table_tr);
    var elm_table_td1 = doc.createElement("td"); elm_table_tr.appendChild(elm_table_td1);
    elm_table_td1.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px; border-style: none;");
    elm_table_td1.setAttribute("align", "left");
    elm_table_td1.setAttribute("width", "60%");
    elm_table_td1.innerText = "TexTra " + Nict_TexTra.utils.bundle.GetStringFromName("Lookup") + " [" + Nict_TexTra.utils.get_2lang_name(lang_org, lang_trans) + "]"; // 辞書引き
    var elm_table_td2 = doc.createElement("td"); elm_table_tr.appendChild(elm_table_td2);
    elm_table_td2.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px; border-style: none;");
    elm_table_td2.setAttribute("align", "right");
    elm_table_td2.setAttribute("width", "40%");

    var elm_btn_replace_lang = doc.createElement("input");
    elm_table_td2.appendChild(elm_btn_replace_lang);
    elm_btn_replace_lang.setAttribute("type", "button");
    elm_btn_replace_lang.setAttribute("id", "btn_replace_lang");
    elm_btn_replace_lang.setAttribute("style", "width:50px;");
    elm_btn_replace_lang.setAttribute("value", Nict_TexTra.utils.get_2lang_name(lang_trans, lang_org));
    elm_btn_replace_lang.onclick = function () {
        Nict_TexTra.browser_params.setCharPref("selected_lang_org", lang_trans);
        Nict_TexTra.browser_params.setCharPref("selected_lang_trans", lang_org);
        Nict_TexTra.popup.show_popup_dict(text_org);
        Nict_TexTra.api.call_api(Nict_TexTra.api.refer_dic, Nict_TexTra.popup.set_result_from_dict_on_pop, null, { "text_org": text_org });
    };

    var elm_text_org = doc.createElement("div");
    pop.appendChild(elm_text_org);
    elm_text_org.setAttribute("id", "text_org_span");
    elm_text_org.setAttribute("style", "margin:5px;");
    var elm_table1 = doc.createElement("table");
    elm_text_org.appendChild(elm_table1);
    var elm_tr1 = doc.createElement("tr");
    elm_table1.appendChild(elm_tr1);
    var elm_td1 = doc.createElement("td");
    elm_tr1.appendChild(elm_td1);
    elm_td1.setAttribute("align", "left");

    var len_text_org = text_org.length;
    for (var ind = 0; ind < len_text_org; ind++) {
        var elm_char = doc.createElement("span");
        elm_char.setAttribute("id", "text_org_char_" + ind);
        elm_char.setAttribute("style", "float: left;");
        elm_td1.appendChild(elm_char);
    }

    var elm_dic_result = doc.createElement("div");
    pop.appendChild(elm_dic_result);
    elm_dic_result.setAttribute("id", "dic_result");
    elm_dic_result.setAttribute("style", "overflow:scroll; height:200px;");
    elm_dic_result.setAttribute("align", "left");
    var elm_table2 = doc.createElement("table");
    elm_dic_result.appendChild(elm_table2);
    var elm_tr2 = doc.createElement("tr");
    elm_table2.appendChild(elm_tr2);
    var elm_td2 = doc.createElement("td");
    elm_tr2.appendChild(elm_td2);
    elm_td2.setAttribute("style", "border: 0px; vertical-align: middle; background: #F4F7DE;");
    elm_td2.innerText = Nict_TexTra.utils.bundle.GetStringFromName("Mes11_008"); // 辞書引き中・・・

    for (var ind = 0; ind < len_text_org; ind++) {
        var c = text_org.substr(ind, 1);
        c = c.replace(/ /g, '\u00a0');
        doc.getElementById("text_org_char_" + ind).innerText = c;
    }

};

Nict_TexTra.popup.set_result_from_dict_on_pop = function (infos) {

    var doc = window.content.document;
    var txt = "[" + infos["resultset"]["request"]["text"] + "]";
    var result_lookups = infos["resultset"]["result"]["lookup"];

    var elm_dic_result = doc.getElementById("dic_result");
    while (elm_dic_result.firstChild) elm_dic_result.removeChild(elm_dic_result.firstChild);
    $.each(result_lookups, function (ind_term, res_lookup) {

        var elm_term = doc.createElement("span");
        elm_dic_result.appendChild(elm_term);
        elm_term.setAttribute("id", "term_" + ind_term);

        var elm_hr = doc.createElement("hr");
        elm_dic_result.appendChild(elm_hr);
        elm_hr.setAttribute("style", "margin-top:0");
        elm_hr.setAttribute("width", "80%");
        elm_hr.setAttribute("align", "left");

        var elm_res = doc.createElement("div");
        elm_dic_result.appendChild(elm_res);
        elm_res.setAttribute("id", "ref_dic_results_" + ind_term);

        var result_terms = res_lookup["term"];
        var list_terms = [];
        $.each(result_terms, function (ind_target, res_term) {
            list_terms.push(res_term["target"]);
        });
        elm_res.innerText = list_terms.join(", ");

        elm_term.innerText = (ind_term + 1) + ". " + res_lookup["hit"];
        elm_term.onmouseenter = function () {
            var ind_st = Number(res_lookup["position"]);
            var ind_ed = ind_st + Number(res_lookup["length"]);
            for (var ind_char = res_lookup["position"]; ind_char < ind_ed; ind_char++) {
                doc.getElementById("text_org_char_" + ind_char).style.background = "orange";
            }
        };
        elm_term.onmouseleave = function () {
            var ind_st = Number(res_lookup["position"]);
            var ind_ed = ind_st + Number(res_lookup["length"]);
            for (var ind_char = res_lookup["position"]; ind_char < ind_ed; ind_char++) {
                doc.getElementById("text_org_char_" + ind_char).style.background = null;
            }
        };
    });

    Nict_TexTra.utils.add_history_refer_dic(infos["text_org"], infos["lang_org"], infos["lang_trans"]);

};

Nict_TexTra.popup.close_popup = function () {
    if (!Nict_TexTra.popup._popup_form) return;
    var pop = Nict_TexTra.popup._popup_form;
    try {
        var elm_p = pop.parentNode;
        if (elm_p) { elm_p.removeChild(pop); }
    } catch (e) {
    }
    Nict_TexTra.popup._popup_form = null;
};

Nict_TexTra.popup.show_popup_modify_trans = function (text_org, text_trans, lang_org, lang_trans) {

    Nict_TexTra.popup.close_popup_modify_trans();

    var doc = window.content.document;
    var pop = doc.createElement("div");
    Nict_TexTra.popup._popup_modify_trans = pop;

    var style = pop.style;
    Nict_TexTra.popup.set_popup_style(style);

    doc.body.appendChild(pop);

    var table_locale = document.getElementById('table_locale');
    var elm_div_title = doc.createElement("div");
    pop.appendChild(elm_div_title);
    elm_div_title.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px;");
    elm_div_title.setAttribute("align", "left");
    elm_div_title.innerText = "TexTra " + Nict_TexTra.utils.bundle.GetStringFromName("Mes11_009") + " [" + Nict_TexTra.utils.get_2lang_name(lang_org, lang_trans) + "]"; // 翻訳修正

    var elm_text_trans = doc.createElement("div");
    pop.appendChild(elm_text_trans);
    elm_text_trans.setAttribute("id", "text_trans");
    elm_text_trans.setAttribute("style", "margin:5px;");
    elm_text_trans.setAttribute("align", "left");
    elm_text_trans.appendChild(doc.createTextNode("原文"));
    elm_text_trans.appendChild(doc.createElement("br"));
    var elm_text_area_org = doc.createElement("textarea");
    elm_text_trans.appendChild(elm_text_area_org);
    elm_text_area_org.setAttribute("id", "textarea_text_org");
    elm_text_area_org.setAttribute("cols", "40");
    elm_text_area_org.setAttribute("rows", "5");
    elm_text_area_org.innerText = text_org;
    elm_text_trans.appendChild(doc.createElement("br"));
    elm_text_trans.appendChild(doc.createElement("br"));
    elm_text_trans.appendChild(doc.createTextNode("訳文"));
    elm_text_trans.appendChild(doc.createElement("br"));
    var elm_text_area_trs = doc.createElement("textarea");
    elm_text_trans.appendChild(elm_text_area_trs);
    elm_text_area_trs.setAttribute("id", "textarea_text_trs");
    elm_text_area_trs.setAttribute("cols", "40");
    elm_text_area_trs.setAttribute("rows", "5");
    elm_text_area_trs.innerText = text_trans;
    elm_text_trans.appendChild(doc.createElement("br"));

    var elm_buttons = doc.createElement("div");
    pop.appendChild(elm_buttons);
    elm_buttons.setAttribute("style", "margin:10px;");
    elm_buttons.setAttribute("align", "right");

    var elm_btn_close_without = doc.createElement("input");
    elm_buttons.appendChild(elm_btn_close_without);
    elm_btn_close_without.setAttribute("type", "button");
    elm_btn_close_without.setAttribute("id", "btn_close_form_regist_taiyaku");
    elm_btn_close_without.setAttribute("style", "width:40%; height:30px;");
    elm_btn_close_without.setAttribute("value", Nict_TexTra.utils.bundle.GetStringFromName("Mes11_010")); // 登録せずに閉じる

    var elm_btn_close_with_regist = doc.createElement("input");
    elm_buttons.appendChild(elm_btn_close_with_regist);
    elm_btn_close_with_regist.setAttribute("type", "button");
    elm_btn_close_with_regist.setAttribute("id", "btn_regist_takyaku");
    elm_btn_close_with_regist.setAttribute("style", "width:40%; height:30px;");
    elm_btn_close_with_regist.setAttribute("value", Nict_TexTra.utils.bundle.GetStringFromName("Mes11_011")); // 訳文を登録

    elm_btn_close_with_regist.onclick = function () {
        var text_org = doc.getElementById("textarea_text_org").value;
        var text_trans = doc.getElementById("textarea_text_trs").value;
        Nict_TexTra.popup.close_popup_modify_trans();
        Nict_TexTra.api.call_api(Nict_TexTra.api.search_taiyaku_dic, Nict_TexTra.popup.regist_taiyaku_from_popup, null,
            { "text_org": text_org, "text_trans": text_trans });
    };

    elm_btn_close_without.onclick = Nict_TexTra.popup.close_popup_modify_trans;

};

Nict_TexTra.popup.regist_taiyaku_from_popup = function (infos) {

    var table_locale = document.getElementById('table_locale');
    var list_dic = infos["resultset"]["result"]["list"];
    if (list_dic.length == 0) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes11_012")); return; }; // 登録先の対訳集がありませんでした。\n「みんなの自動翻訳」で対訳集を作成してください。

    var dic_info = list_dic[0];
    Nict_TexTra.api.call_api(Nict_TexTra.api.regist_taiyaku, Nict_TexTra.popup.show_message_registed_taiyaku, null,
        { "id": dic_info["id"], "text_org": infos["text_org"], "text_trans": infos["text_trans"] });


};

Nict_TexTra.popup.show_message_registed_taiyaku = function (infos) {

    var table_locale = document.getElementById('table_locale');
    alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes11_013") + "\n\n" + // 翻訳文を登録しました。
        Nict_TexTra.utils.bundle.GetStringFromName("Org_Sent") + "：\n" + infos["text_org"] + "\n\n" + // 原文
        Nict_TexTra.utils.bundle.GetStringFromName("Trs_Sent") + "：\n" + infos["text_trans"] + "\n"); // 訳文

};

// 翻訳修正 対訳集情報取得後
Nict_TexTra.popup.regist_taiyaku_for_modify_trans = function (infos) {

    var table_locale = document.getElementById('table_locale');
    var list_dic = infos["resultset"]["result"]["list"];
    if (list_dic.length == 0) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes11_012")); return; } // 登録先の対訳集がありませんでした。\n「みんなの自動翻訳」で対訳集を作成してください。

    var dic_info = list_dic[0];
    Nict_TexTra.api.call_api(Nict_TexTra.api.regist_taiyaku, Nict_TexTra.popup.show_message_registed_taiyaku, null,
        { "id": dic_info["id"], "text_org": infos["text_org"], "text_trans": infos["text_trans"] });

};

// 訳文登録後
Nict_TexTra.popup.show_message_registed_taiyaku = function (infos) {

    var table_locale = document.getElementById('table_locale');
    alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes11_013") + "\n\n" + // 翻訳文を登録しました。
        Nict_TexTra.utils.bundle.GetStringFromName("Org_Sent") + "：\n" + infos["text_org"] + "\n\n" + // 原文
        Nict_TexTra.utils.bundle.GetStringFromName("Trs_Sent") + "：\n" + infos["text_trans"] + "\n"); // 訳文

};

Nict_TexTra.popup.close_popup_modify_trans = function () {
    if (!Nict_TexTra.popup._popup_modify_trans) return;
    var pop = Nict_TexTra.popup._popup_modify_trans;
    var elm_p = pop.parentNode;
    if (elm_p) { elm_p.removeChild(pop); }
    Nict_TexTra.popup._popup_modify_trans = null;
};


