var Nict_TexTra = Nict_TexTra || {};
Nict_TexTra.popup = Nict_TexTra.popup || {};

Nict_TexTra.popup._popup_form = null;
Nict_TexTra.popup._popup_modify_trans = null;
Nict_TexTra.popup._icon_call = null;

Nict_TexTra.popup._str_last_searched = null;
Nict_TexTra.popup._rect_array = null; //選択した文字列の画面位置情報

document.addEventListener("click", function (ev) {

    Nict_TexTra.popup.close_icon();
    if (ev.clientX == 0 && ev.clientY == 0) return;

    if (Nict_TexTra.popup.check_cursor_pos_in_form(ev.clientX, ev.clientY)) return;

    chrome.storage.local.get(
        {
            if_text_selected: "trans"
        }, function (infos) {
            var selected = infos["if_text_selected"];
            if (selected != "trans" && selected != "dict") return;
            Nict_TexTra.popup.show_icon();
        });

}, false);

Nict_TexTra.popup.show_icon = function () {

    var txt = window.getSelection().toString();
    if (Nict_TexTra.utils.is_empty_string(txt)) return;

    var cnt_ranges = window.getSelection().rangeCount;
    if (cnt_ranges <= 0) return;
    var rects = window.getSelection().getRangeAt(cnt_ranges - 1).getClientRects();
    if (rects.length <= 0) return;

    var rect = rects[rects.length - 1];
    var div_img = document.createElement("div");
    Nict_TexTra.popup._icon_call = div_img;

    var style = div_img.style;

    style.position = "absolute";
    style.top = ($(document).scrollTop() + rect.bottom) + "px";
    style.left = ($(document).scrollLeft() + rect.right) + "px";

    // アイコン表示
    var elm_img = document.createElement("img");
    div_img.appendChild(elm_img);
    elm_img.setAttribute("src", chrome.extension.getURL("icons/TexTra_cyan.png"));
    elm_img.setAttribute("style", "margin:5px; width:20px; height:20px;");
    elm_img.onclick = function (ev) {
        chrome.storage.local.set({ "selected_func": "trans" }, function () {
            Nict_TexTra.popup.show_popup("select", ev);
            Nict_TexTra.popup.close_icon();
        });
    };
    document.body.appendChild(div_img);

};

Nict_TexTra.popup.close_icon = function () {
    if (!Nict_TexTra.popup._icon_call) return;
    var pop = Nict_TexTra.popup._icon_call;
    try {
        var elm_p = pop.parentNode;
        if (elm_p) { elm_p.removeChild(pop); }
    } catch (e) { null; }
    Nict_TexTra.popup._icon_call = null;
};

Nict_TexTra.popup.show_popup = function (call_type, ev) {

    var text_org = document.getSelection().toString();
    if (!text_org || text_org.trim() == "") {
        if (call_type == 'menu') { Nict_TexTra.utils.alert_by_id("mes_0404"); } // テキストを選択してください。
        return;
    }

    text_org = Nict_TexTra.utils.cut_str(text_org, 800);

    if (call_type == 'select') {
        //ポップアップ上のボタンクリックなどで検索が発生してしまうため。
        if (Nict_TexTra.popup._str_last_searched == text_org) return;
        if (Nict_TexTra.popup.check_cursor_pos_in_form(ev.clientX, ev.clientY)) return;
    }

    Nict_TexTra.popup._str_last_searched = text_org;
    Nict_TexTra.popup._rect_array = window.getSelection().getRangeAt(0).getClientRects();

    chrome.storage.local.get(
        {
            if_text_selected: "trans", selected_lang_org: "ja", selected_lang_trans: "en",
            user_name: "", api_key: ""
        },
        function (infos) {
            var sel = infos["if_text_selected"];
            var lang_org = infos["selected_lang_org"];
            var lang_trans = infos["selected_lang_trans"];

            if (sel == "dict") {
                if (!Nict_TexTra.popup.check_login_info(infos["user_name"], infos["api_key"])) return;
                Nict_TexTra.popup.show_popup_dict(text_org, lang_org, lang_trans);
                chrome.runtime.sendMessage(
                    {
                        "type": "textra_call_api",
                        "func_api": "refer_dic",
                        "params": { "text_org": text_org }
                    },
                    Nict_TexTra.popup.set_result_from_dict_on_pop);
            } else if (sel == "trans") {
                if (!Nict_TexTra.popup.check_login_info(infos["user_name"], infos["api_key"])) return;
                Nict_TexTra.popup.show_popup_trans(text_org, lang_org, lang_trans);
                chrome.runtime.sendMessage(
                    {
                        "type": "textra_call_api",
                        "func_api": "trans_text",
                        "params": { "text_org": text_org }
                    },
                    Nict_TexTra.popup.set_text_trans_on_popup);
            } else {
                return;
            }
        }
    );

    document.onclick = function (ev) {
        if (ev.clientX == 0 && ev.clientY == 0) return;
        if (!Nict_TexTra.popup.check_cursor_pos_in_form(ev.clientX, ev.clientY)) Nict_TexTra.popup.close_popup();
    };

};

Nict_TexTra.popup.check_cursor_pos_in_form = function (mx, my) {
    if (Nict_TexTra.popup._popup_form) {
        var rect = Nict_TexTra.popup._popup_form.getBoundingClientRect();
        if (rect.left < mx && mx < rect.right
            && rect.top < my && my < rect.bottom) {
            return true;
        }
    }
    return false;
};

Nict_TexTra.popup.check_login_info = function (api_name, api_key) {
    if (api_name.trim() == "" ||
        api_key.trim() == "") { Nict_TexTra.utils.alert_by_id("mes_0014"); return false; } // API設定を行ってください。
    return true;
};

Nict_TexTra.popup.show_popup_trans = function (text_org, lang_org, lang_trans) {

    Nict_TexTra.popup.close_popup();
    Nict_TexTra.popup.close_icon();

    // 基本枠
    {
        var pop = document.createElement("div");
        Nict_TexTra.popup._popup_form = pop;

        var style = pop.style;
        Nict_TexTra.popup.set_popup_style(style);

        document.body.appendChild(pop);

        var elm_div_title = document.createElement("div");
        pop.appendChild(elm_div_title);

        var elm_table_title = document.createElement("table"); elm_div_title.appendChild(elm_table_title);
        elm_table_title.setAttribute("width", "100%");
        elm_table_title.setAttribute("bgcolor", "#FFFFFF");
        var elm_table_tr = document.createElement("tr"); elm_table_title.appendChild(elm_table_tr);
        var elm_table_td1 = document.createElement("td"); elm_table_tr.appendChild(elm_table_td1);
        elm_table_td1.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px; border-style: none;");
        elm_table_td1.setAttribute("align", "left");
        elm_table_td1.setAttribute("width", "60%");
        elm_table_td1.innerText = "TexTra " + chrome.i18n.getMessage('mes_0003'); // 翻訳
        var elm_table_td2 = document.createElement("td"); elm_table_tr.appendChild(elm_table_td2);
        elm_table_td2.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px; border-style: none;");
        elm_table_td2.setAttribute("align", "right");
        elm_table_td2.setAttribute("width", "40%");
    }

    // 翻訳エリア
    var elm_trans_area = document.createElement("div");
    pop.appendChild(elm_trans_area);
    elm_trans_area.setAttribute("id", "text_trans_area");
    elm_trans_area.setAttribute("style", "margin:5px; overflow:scroll; height:300px;");
    elm_trans_area.setAttribute("align", "left");

    var elm_combo_lang_org = document.createElement("select");
    elm_trans_area.appendChild(elm_combo_lang_org);
    elm_combo_lang_org.setAttribute("style", "margin:5px; -webkit-appearance: button;");
    Nict_TexTra.utils.set_lang_list(document, elm_combo_lang_org);
    elm_combo_lang_org.value = lang_org;

    var elm_btn_langs = document.createElement("input");
    elm_trans_area.appendChild(elm_btn_langs);
    elm_btn_langs.setAttribute("type", "button");
    elm_btn_langs.setAttribute("value", "⇔");

    var elm_trans = document.createElement("div");
    elm_trans_area.appendChild(elm_trans);
    elm_trans.setAttribute("id", "TexTra_trans");

    var elm_text_org = document.createElement("div");
    elm_trans.appendChild(elm_text_org);
    elm_text_org.setAttribute("id", "text_org");
    elm_text_org.innerText = text_org;
    elm_text_org.setAttribute("style", "margin:5px;");
    elm_trans.appendChild(document.createElement("br"));

    var elm_hr = document.createElement("hr");
    elm_trans.appendChild(elm_hr);
    elm_hr.setAttribute("style", "margin-top:0");
    elm_hr.setAttribute("width", "80%");
    elm_hr.setAttribute("align", "left");

    var elm_combo_lang_trs = document.createElement("select");
    elm_trans.appendChild(elm_combo_lang_trs);
    elm_combo_lang_trs.setAttribute("style", "margin:5px; -webkit-appearance: button;");
    Nict_TexTra.utils.set_lang_list(document, elm_combo_lang_trs);
    elm_combo_lang_trs.value = lang_trans;

    var elm_text_trans = document.createElement("div");
    elm_trans.appendChild(elm_text_trans);
    elm_text_trans.setAttribute("id", "text_trans");
    elm_text_trans.setAttribute("style", "margin:5px;");

    // wait icon
    {
        var elm_div_wait = document.createElement("div");
        elm_trans.appendChild(elm_div_wait);
        elm_div_wait.setAttribute("id", "text_trans_wait");
        elm_div_wait.setAttribute("style", "margin:5px;");
        elm_div_wait.setAttribute("align", "left");

        var elm_table = document.createElement("table");
        elm_div_wait.appendChild(elm_table);
        var elm_tr = document.createElement("tr");
        elm_table.appendChild(elm_tr);
        var elm_td1 = document.createElement("td");
        elm_tr.appendChild(elm_td1);
        elm_td1.setAttribute("style", "border: 0px; background: #F4F7DE;");
        var elm_img = document.createElement("img");
        elm_td1.appendChild(elm_img);
        elm_img.setAttribute("src", chrome.extension.getURL("icons/please_wait.gif"));
        elm_img.setAttribute("style", "margin:5px;");
        var elm_td2 = document.createElement("td");
        elm_tr.appendChild(elm_td2);
        elm_td2.setAttribute("style", "border: 0px; vertical-align: middle; background: #F4F7DE;");
        elm_td2.innerText = chrome.i18n.getMessage('mes_0401'); // 翻訳中
    }

    // 言語コンボ
    var func_chage_lang = function (ev) {
        lang_org = elm_combo_lang_org.value;
        lang_trans = elm_combo_lang_trs.value;

        elm_div_wait.style.display = "block";
        elm_text_trans.innerText = "";

        chrome.storage.local.set({ "selected_lang_org": lang_org, "selected_lang_trans": lang_trans }, function () {
            chrome.runtime.sendMessage(
                {
                    "type": "textra_call_api",
                    "func_api": "trans_text",
                    "params": { "text_org": text_org, "lang_trans": lang_trans }
                },
                Nict_TexTra.popup.set_text_trans_on_popup);
        });

    };
    elm_combo_lang_org.onchange = func_chage_lang;
    elm_combo_lang_trs.onchange = func_chage_lang;

    // 言語交換
    elm_btn_langs.onclick = function (ev) {
        lang_org = elm_combo_lang_org.value;
        lang_trans = elm_combo_lang_trs.value;
        elm_combo_lang_org.value = lang_trans;
        elm_combo_lang_trs.value = lang_org;
        func_chage_lang();
    };

};

Nict_TexTra.popup.set_popup_style = function (style) {

    var rect_arrey = Nict_TexTra.popup._rect_array;
    var rect_st = rect_arrey[0];
    var rect_ed = rect_arrey[rect_arrey.length - 1];

    style.position = "absolute";
    style.top = ($(document).scrollTop() + rect_ed.bottom) + "px";
    style.left = ($(document).scrollLeft() + rect_st.left + 10) + "px";
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

    document.getElementById("text_trans_wait").style.display = "none";
    if (infos["error_message"]) { Nict_TexTra.utils.alert(infos["error_message"]); return; }

    var text_org = infos["text_org"];
    var text_trans = infos["text_trans"];

    document.getElementById("text_org").innerText = text_org;
    document.getElementById("text_trans").innerText = text_trans;

    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    Nict_TexTra.utils.add_history_translate(text_org, text_trans, lang_org, lang_trans);

};

// 辞書引きポップアップ
Nict_TexTra.popup.show_popup_dict = function (text_org, lang_org, lang_trans) {

    Nict_TexTra.popup.close_popup();
    Nict_TexTra.popup.close_icon();

    // 基本枠
    {
        var pop = document.createElement("div");
        Nict_TexTra.popup._popup_form = pop;

        var style = pop.style;
        Nict_TexTra.popup.set_popup_style(style);

        document.body.appendChild(pop);

        var elm_div_title = document.createElement("div");
        pop.appendChild(elm_div_title);

        var elm_table_title = document.createElement("table"); elm_div_title.appendChild(elm_table_title);
        elm_table_title.setAttribute("width", "100%");
        elm_table_title.setAttribute("bgcolor", "#FFFFFF");
        var elm_table_tr = document.createElement("tr"); elm_table_title.appendChild(elm_table_tr);
        var elm_table_td1 = document.createElement("td"); elm_table_tr.appendChild(elm_table_td1);
        elm_table_td1.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px; border-style: none;");
        elm_table_td1.setAttribute("align", "left");
        elm_table_td1.setAttribute("width", "60%");
        elm_table_td1.innerText = "TexTra " + chrome.i18n.getMessage('mes_0004'); // 辞書引き
        var elm_table_td2 = document.createElement("td"); elm_table_tr.appendChild(elm_table_td2);
        elm_table_td2.setAttribute("style", "font-weight:bold; background:#FFFFFF; color:#1E90FF; padding:5px; border-style: none;");
        elm_table_td2.setAttribute("align", "right");
        elm_table_td2.setAttribute("width", "40%");
    }

    // 翻訳エリア
    var elm_combo_lang_org = document.createElement("select");
    pop.appendChild(elm_combo_lang_org);
    elm_combo_lang_org.setAttribute("style", "margin:5px; -webkit-appearance: button;");
    Nict_TexTra.utils.set_lang_list(document, elm_combo_lang_org);
    elm_combo_lang_org.value = lang_org;

    var elm_btn_langs = document.createElement("input");
    pop.appendChild(elm_btn_langs);
    elm_btn_langs.setAttribute("type", "button");
    elm_btn_langs.setAttribute("value", "⇔");

    // 原文
    {
        var elm_text_org = document.createElement("div");
        pop.appendChild(elm_text_org);
        elm_text_org.setAttribute("style", "margin:5px;");
        var elm_table1 = document.createElement("table");
        elm_text_org.appendChild(elm_table1);
        var elm_tr1 = document.createElement("tr");
        elm_table1.appendChild(elm_tr1);
        var elm_td = document.createElement("td");
        elm_tr1.appendChild(elm_td);
        elm_td.setAttribute("align", "left");

        var len_text_org = text_org.length;
        for (var ind = 0; ind < len_text_org; ind++) {
            var elm_char = document.createElement("span");
            elm_char.setAttribute("id", "text_org_char_" + ind);
            elm_char.setAttribute("style", "float: left;");
            elm_td.appendChild(elm_char);
        }

        pop.appendChild(document.createElement("br"));

        for (var ind2 = 0; ind2 < len_text_org; ind2++) {
            var c = text_org.substr(ind2, 1);
            c = c.replace(/ /g, '\u00a0');
            document.getElementById("text_org_char_" + ind2).innerText = c;
        }
    }

    var elm_combo_lang_trs = document.createElement("select");
    pop.appendChild(elm_combo_lang_trs);
    elm_combo_lang_trs.setAttribute("style", "margin:5px; -webkit-appearance: button;");
    Nict_TexTra.utils.set_lang_list(document, elm_combo_lang_trs);
    elm_combo_lang_trs.value = lang_trans;

    var elm_dic_result = document.createElement("div");
    pop.appendChild(elm_dic_result);
    elm_dic_result.setAttribute("id", "dic_result");
    elm_dic_result.setAttribute("style", "overflow:scroll; height:200px; margin:5px;");
    elm_dic_result.setAttribute("align", "left");
    var elm_table2 = document.createElement("table");
    elm_dic_result.appendChild(elm_table2);
    var elm_tr2 = document.createElement("tr");
    elm_table2.appendChild(elm_tr2);
    var elm_td21 = document.createElement("td");
    elm_tr2.appendChild(elm_td21);
    elm_td21.setAttribute("style", "border: 0px; background: #F4F7DE;");
    elm_dic_result.style.display = "none";

    // wait icon
    {
        var elm_div_wait = document.createElement("div");
        pop.appendChild(elm_div_wait);
        elm_div_wait.setAttribute("id", "text_trans_wait");
        elm_div_wait.setAttribute("style", "margin:5px;");
        elm_div_wait.setAttribute("align", "left");

        var elm_table = document.createElement("table");
        elm_div_wait.appendChild(elm_table);
        var elm_tr = document.createElement("tr");
        elm_table.appendChild(elm_tr);
        var elm_td1 = document.createElement("td");
        elm_tr.appendChild(elm_td1);
        elm_td1.setAttribute("style", "border: 0px; background: #F4F7DE;");
        var elm_img = document.createElement("img");
        elm_td1.appendChild(elm_img);
        elm_img.setAttribute("src", chrome.extension.getURL("icons/please_wait.gif"));
        elm_img.setAttribute("style", "margin:5px;");
        var elm_td2 = document.createElement("td");
        elm_tr.appendChild(elm_td2);
        elm_td2.setAttribute("style", "border: 0px; vertical-align: middle; background: #F4F7DE;");
        elm_td2.innerText = chrome.i18n.getMessage('mes_0402'); // 辞書引き中・・・
    }

    // 言語コンボ
    var func_chage_lang = function (ev) {
        lang_org = elm_combo_lang_org.value;
        lang_trans = elm_combo_lang_trs.value;

        elm_div_wait.style.display = "block";
        elm_dic_result.style.display = "none";

        chrome.storage.local.set({ "selected_lang_org": lang_org, "selected_lang_trans": lang_trans }, function () {
            chrome.runtime.sendMessage(
                {
                    "type": "textra_call_api",
                    "func_api": "refer_dic",
                    "params": { "text_org": text_org, "lang_trans": lang_trans }
                },
                Nict_TexTra.popup.set_result_from_dict_on_pop);
        });

    };
    elm_combo_lang_org.onchange = func_chage_lang;
    elm_combo_lang_trs.onchange = func_chage_lang;

    // 言語交換
    elm_btn_langs.onclick = function (ev) {
        lang_org = elm_combo_lang_org.value;
        lang_trans = elm_combo_lang_trs.value;
        elm_combo_lang_org.value = lang_trans;
        elm_combo_lang_trs.value = lang_org;
        func_chage_lang();
    };

};

Nict_TexTra.popup.set_result_from_dict_on_pop = function (infos) {

    var elm_div_wait = document.getElementById("text_trans_wait");
    elm_div_wait.style.display = "none";

    var elm_dic_result = document.getElementById("dic_result");
    elm_dic_result.style.display = "block";

    var err_cd = infos["error_cd"];
    if (err_cd == "no_dic") {
        elm_dic_result.innerText = chrome.i18n.getMessage('mes_0403'); // 選択された言語の辞書がありません。
        return;
    }

    var result_lookups = infos["resultset"]["result"]["lookup"];
    Nict_TexTra.utils.remove_element_children(elm_dic_result);
    var len_result = result_lookups.length - 1;
    $.each(result_lookups, function (ind_term, res_lookup) {

        // 構成
        var elm_term = document.createElement("span");
        elm_dic_result.appendChild(elm_term);
        elm_term.setAttribute("id", "term_" + ind_term);
        elm_term.setAttribute("style", "margin:5px;");

        var elm_res = document.createElement("div");
        elm_dic_result.appendChild(elm_res);
        elm_res.setAttribute("id", "ref_dic_results_" + ind_term);
        elm_res.setAttribute("style", "margin:5px;");

        var elm_br = document.createElement("br");
        elm_dic_result.appendChild(elm_br);

        if (ind_term < len_result) {
            var elm_hr = document.createElement("hr");
            elm_dic_result.appendChild(elm_hr);
            elm_hr.setAttribute("style", "margin-top:0");
            elm_hr.setAttribute("width", "80%");
            elm_hr.setAttribute("align", "left");
        }

        // データ
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
                document.getElementById("text_org_char_" + ind_char).style.background = "orange";
            }
        };
        elm_term.onmouseleave = function () {
            var ind_st = Number(res_lookup["position"]);
            var ind_ed = ind_st + Number(res_lookup["length"]);
            for (var ind_char = res_lookup["position"]; ind_char < ind_ed; ind_char++) {
                document.getElementById("text_org_char_" + ind_char).style.background = null;
            }
        };
    });

    Nict_TexTra.utils.add_history_refer_dic(infos["text_org"], infos["lang_org"], infos["lang_trans"]);

};

Nict_TexTra.popup.close_popup = function () {
    Nict_TexTra.popup._str_last_searched = null;
    if (!Nict_TexTra.popup._popup_form) return;
    var pop = Nict_TexTra.popup._popup_form;
    try {
        var elm_p = pop.parentNode;
        if (elm_p) { elm_p.removeChild(pop); }
    } catch (e) { true; } 
    Nict_TexTra.popup._popup_form = null;
};

