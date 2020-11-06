window.onload = function () {

    var doc = window.document;

    doc.getElementById("btn_refer_dic").onclick = start_lookup;
    doc.getElementById("btn_replace_lang").onclick = replace_language_button;
    doc.getElementById("textbox_target").focus();

    set_language_button();

    var st = browser.storage.local.get();
    st.then(function (datas) {
        if (!Nict_TexTra.utils.is_empty_string(datas.lookup_target)) doc.getElementById("textbox_target").value = datas.lookup_target;
        if (datas.flg_start_lookup) { doc.getElementById("btn_refer_dic").click(); }
        browser.storage.local.remove(["lookup_target", "flg_start_lookup"]);
    });

    doc.getElementById("textbox_target").onkeypress = function (e) {
        var key = e.keyCode || e.charCode || 0;
        if (key == 13) start_lookup();
    };

    Nict_TexTra.utils.set_link(doc, "link_top", "./Home.html");

    adapt_multi_locale();

};

function start_lookup() {

    var doc = window.document;

    var txt_org = doc.getElementById("textbox_target").value;
    if (Nict_TexTra.utils.is_empty_string(txt_org)) {alert("辞書引きする文字列を入力してください。"); return;}
    if (txt_org.length > 15) {alert("文字は１５文字以下にしてください。"); return;}

    doc.getElementById("btn_refer_dic").disabled = true;
    doc.getElementById("img_wait").style.display = "block";
    doc.getElementById("div_refer_dic").style.display = "none";

    var elm_org = doc.getElementById("div_text_org");
    Nict_TexTra.utils.remove_all_children(elm_org);

    var len_txt_org = txt_org.length;

    // 原文を色付けする処理
    for (ind = 0; ind < len_txt_org; ind++) {
        var elm_org_char = doc.createElement("span");
        elm_org.appendChild(elm_org_char);
        elm_org_char.setAttribute("id", "text_org_char_" + ind);
        elm_org_char.innerText = txt_org.substr(ind, 1);
    }

    Nict_TexTra.api.call_api(Nict_TexTra.api.refer_dic,
        set_result_from_dict, null, { "text_org": txt_org });

}

// 辞書引き 結果表示
function set_result_from_dict(infos) {

    document.getElementById("img_wait").style.display = "none";
    document.getElementById("btn_refer_dic").disabled = false;
    document.getElementById("div_refer_dic").style.display = "block";

    var result_lookups = infos["resultset"]["result"]["lookup"];

    var elm_dic_result = document.getElementById("div_dic_result");
    while (elm_dic_result.firstChild) elm_dic_result.removeChild(elm_dic_result.firstChild);
    $.each(result_lookups, function (ind_term, res_lookup) {

        var elm_term = document.createElement("span");
        elm_dic_result.appendChild(elm_term);
        elm_term.setAttribute("id", "term_" + ind_term);
        elm_term.innerText = (ind_term + 1) + ". " + res_lookup["hit"];

        var elm_hr = document.createElement("hr");
        elm_dic_result.appendChild(elm_hr);
        elm_hr.setAttribute("style", "margin-top:0");
        elm_hr.setAttribute("width", "80%");
        elm_hr.setAttribute("align", "left");

        var elm_res = document.createElement("div");
        elm_dic_result.appendChild(elm_res);
        elm_res.setAttribute("id", "ref_dic_results_" + ind_term);

        var result_terms = res_lookup["term"];
        var list_terms = [];
        $.each(result_terms, function (ind_target, res_term) {
            list_terms.push(res_term["target"]);
        });
        elm_res.innerText = list_terms.join(", ");

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
    if (result_lookups.length == 0) elm_dic_result.innerHTML = "結果無し";
    elm_dic_result.style.display = "block";

}

function replace_language_button() {

    chrome.storage.local.get(
        { selected_lang_org: "ja", selected_lang_trans: "en" },
        function (infos) {
            var lang1 = infos.selected_lang_org;
            var lang2 = infos.selected_lang_trans;

            chrome.storage.local.set(
                { selected_lang_org: lang2, selected_lang_trans: lang1 },
                function () {
                    set_language_button();
                });
        }
    );

}

function set_language_button() {

    chrome.storage.local.get(
        { selected_lang_org: "ja", selected_lang_trans: "en" },
        function (infos) {
            var doc = window.document;
            var lang1 = infos.selected_lang_org;
            var lang2 = infos.selected_lang_trans;
            doc.getElementById("btn_replace_lang").value = Nict_TexTra.utils.get_2lang_name(lang1, lang2);
            doc.getElementById("label_langs").innerText = Nict_TexTra.utils.get_2lang_name(lang1, lang2);
        }
    );

}

function adapt_multi_locale() {
    document.getElementById("span_title").innerText = chrome.i18n.getMessage('mes_0004'); // 辞書引き
    document.getElementById("link_top").innerText = chrome.i18n.getMessage('mes_0013'); // トップ
    document.getElementById("btn_refer_dic").value = chrome.i18n.getMessage('mes_0016'); // 検索
    //document.getElementById("").innerText = chrome.i18n.getMessage('mes_000'); //
}