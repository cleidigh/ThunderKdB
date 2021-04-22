window.onload = function () {

    var doc = window.document;
    var elm_textarea = document.getElementById("textbox_target");

    elm_textarea.oninput = function () { change_textarea_height(elm_textarea); };
    elm_textarea.onchange = function () { change_textarea_height(elm_textarea); };

    Nict_TexTra.utils.add_lang_to_select_box(doc.getElementById('lang1'), 'ja');
    Nict_TexTra.utils.add_lang_to_select_box(doc.getElementById('lang2'), 'en');
    load_func();

    $("#bt_lang_replace").click(function () {
        Nict_TexTra.utils.replace_lang_combo($("#lang1")[0], $("#lang2")[0]);
    });
    doc.getElementById("link_minhon").onclick = function () {
        Nict_TexTra.utils.get_url_minhon(function (url) {
            browser.tabs.create({ url: url });
        });
    };

    doc.getElementById("btn_translation").onclick = start_translation;
    doc.getElementById("btn_clear").onclick = function () {
        suspend_translation();
        elm_textarea.value = "";
        change_textarea_height(elm_textarea);
        elm_textarea.focus();
    };
    elm_textarea.focus();

    var func_start_trans = function (txt_org) {
        elm_textarea.value = txt_org;
        change_textarea_height(elm_textarea);
        if (!Nict_TexTra.utils.is_empty_string(txt_org)) start_translation();
    };
    doc.getElementById("btn_paste_org").onclick = function () {
        suspend_translation();
        navigator.clipboard.readText().then(cb_txt => {
            elm_textarea.value = cb_txt;
        });
    };
    doc.getElementById("btn_copy_trans").onclick = function () {
        navigator.clipboard.writeText(doc.getElementById("textbox_trans").value);
    };

    doc.getElementById("link_help").onclick = function () {
        Nict_TexTra.utils.get_url_minhon(function (url) {
            browser.tabs.create({ url: url + "content/help/detail.html?q_pid=TOOL_TEXTRATHUNDERBIRD"});
        });
    };
    doc.getElementById("link_trans_history").onclick = show_translation_history;

    Nict_TexTra.utils.set_link(doc, "link_lookup", "./Lookup_terms.html");
    Nict_TexTra.utils.set_link(doc, "link_ログイン", "./API_Settings.html");
    Nict_TexTra.utils.set_link(doc, "link_機械翻訳API", "./MT_API_settings.html");

    change_2_textareas_height();
    adapt_multi_locale();

    var chk_gh = doc.getElementById('chk_gyaku_honyaku');
    var tb_gh = doc.getElementById('textbox_trans_gyaku');
    chk_gh.onchange = async function () {
        tb_gh.style.display = chk_gh.checked ? 'block' : 'none';
        tb_gh.value = '';
        Nict_TexTra.utils.set_datas_from_storage({ gyaku_honyaku: chk_gh.checked });
        start_translation_gyaku();
    };

    var st = browser.storage.local.get();
    st.then(function (datas) {
        if (datas.txt_cont_menu) {
            // コンテキストメニューからの翻訳
            browser.storage.local.remove(["txt_cont_menu"]);
            func_start_trans(datas.txt_cont_menu);
        }
    });

    var elm_btn_clear_all = doc.getElementById("btn_clear_history");
    elm_btn_clear_all.onclick = function () {
        if (!confirm(I18Nmes('mes_0027'))) return;
        Nict_TexTra.utils.clear_history_translate();
        show_translation_history(null, true);
    };

};

function save_api_info() {
    var doc = window.document;
    var lang1 = doc.getElementById("lang1").value;
    var lang2 = doc.getElementById("lang2").value;

    var infos = {
        "selected_lang_org": lang1,
        "selected_lang_trans": lang2
    };
    chrome.storage.local.set(infos);
}

function load_func() {

    chrome.storage.local.get(
        {
            selected_lang_org: "ja", selected_lang_trans: "en", if_text_selected: "trans",
            user_name: null, gyaku_honyaku: false
        },
        function (infos) {
            var doc = window.document;
            doc.getElementById("lang1").value = infos.selected_lang_org;
            doc.getElementById("lang2").value = infos.selected_lang_trans;
            doc.getElementById("chk_gyaku_honyaku").checked = infos.gyaku_honyaku;
            doc.getElementById('textbox_trans_gyaku').style.display = infos.gyaku_honyaku ? 'block' : 'none';

            doc.getElementById("alert_login").style.display = infos.user_name ? "none" : "inline";
        }
    );

}

window.onblur = save_api_info;
window.onbeforeunload = save_api_info;

_id_trans = null;

function start_translation() {

    save_api_info();
    var doc = window.document;

    var txt_org = doc.getElementById("textbox_target").value;
    if (Nict_TexTra.utils.is_empty_string(txt_org)) {
        alert(I18Nmes("mes_0028")); // 翻訳する文字列を入力してください。
        return;
    }

    doc.getElementById("btn_translation").disabled = true;

    doc.getElementById("img_wait").style.display = "block";
    _id_trans = txt_org;
    var infos = { text_org: txt_org, id: _id_trans };
    Nict_TexTra.api.call_api(Nict_TexTra.api.trans_text, show_result_translation, null, infos);

}

function show_result_translation(infos) {

    if (infos.id !== _id_trans) return;

    var doc = window.document;

    var text_org = infos["text_org"];
    var text_trans = infos["text_trans"];
   
    var elm_trans_area = doc.getElementById("textbox_trans");
    elm_trans_area.value = text_trans;
    change_textarea_height(elm_trans_area);

    doc.getElementById("img_wait").style.display = "none";
    doc.getElementById("btn_translation").disabled = false;

    if (text_org !== text_trans) {
        Nict_TexTra.utils.add_history_translate(
            text_org, text_trans, infos["lang_org"], infos["lang_trans"], function () {
                if (doc.getElementById("div_trans_history").style.display !== "none") {
                    show_translation_history(null, true); // 非表示
                }
            });
    }
    start_translation_gyaku();
}

// 逆翻訳
async function start_translation_gyaku() {

    var doc = window.document;
    if (!doc.getElementById('chk_gyaku_honyaku').checked) return;

    var txt_org = doc.getElementById("textbox_trans").value;
    if (Nict_TexTra.utils.is_empty_string(txt_org)) return;

    doc.getElementById("btn_translation").disabled = true;

    doc.getElementById("img_wait").style.display = "block";
    _id_trans = txt_org;

    var infos_lang = await Nict_TexTra.utils.get_datas_from_storage({
        selected_lang_org: "ja", selected_lang_trans: "en"
    });

    var infos = {
        text_org: txt_org, id: _id_trans,
        lang_org: infos_lang.selected_lang_trans,
        lang_trans: infos_lang.selected_lang_org
    };
    Nict_TexTra.api.call_api(Nict_TexTra.api.trans_text, show_result_translation_gyaku, null, infos);

}

function show_result_translation_gyaku(infos) {

    if (infos.id !== _id_trans) return;

    var doc = window.document;
    if (!doc.getElementById('chk_gyaku_honyaku').checked) return;

    var text_trans = infos["text_trans"];

    var elm_trans_area = doc.getElementById("textbox_trans_gyaku");
    elm_trans_area.value = text_trans;
    change_textarea_height(elm_trans_area);

    doc.getElementById("img_wait").style.display = "none";
    doc.getElementById("btn_translation").disabled = false;

}

function suspend_translation() {
    _id_trans = null;
    document.getElementById("img_wait").style.display = "none";
    document.getElementById("btn_translation").disabled = false;
}

// 内容に合わせてTextAreaの大きさを変更する。
function change_textarea_height(elm_textarea) {
    elm_textarea.style.height = "10px";
    var ht = parseInt(elm_textarea.scrollHeight); // スクロールまで含めた高さ
    var lht = parseInt(elm_textarea.style.lineHeight.replace(/px/, '')); // １行の高さ
    if (ht < lht * 2) { ht = lht * 2; }
    elm_textarea.style.height = (ht + 10) + "px";
}

function change_2_textareas_height() {
    change_textarea_height(document.getElementById("textbox_target"));
    change_textarea_height(document.getElementById("textbox_trans"));
}

// 翻訳履歴表示
function show_translation_history(ev, redraw) {

    var doc = document;
    var div_his = doc.getElementById("div_trans_history");

    if (redraw || div_his.style.display === "none") {

        var tbl_history = doc.getElementById("tbl_trans_history");
        tbl_history.setAttribute("style", "table-layout:fixed;");
        Nict_TexTra.utils.remove_element_children(tbl_history);

        var func_show_his = function (list_his) {

            $.each(list_his, function (ind, his) {

                var tm = new Date(Date.parse(his["time"]));
                var str_time = Nict_TexTra.utils.get_time(tm);

                var elm_tr = doc.createElement("tr");
                tbl_history.appendChild(elm_tr);
                elm_tr.setAttribute("bgcolor", "#FFFFFF");
                var elm_td = doc.createElement("td");
                elm_tr.appendChild(elm_td);

                var elm_tbl_td = doc.createElement("Table");
                elm_td.appendChild(elm_tbl_td);
                elm_tbl_td.setAttribute("style", "width: 100%;");

                var elm_tr2 = doc.createElement("tr");
                elm_tbl_td.appendChild(elm_tr2);

                var elm_td2 = doc.createElement("td");
                elm_tr2.appendChild(elm_td2);

                elm_td2.appendChild(doc.createTextNode((ind + 1) + " : [" + Nict_TexTra.utils.get_2lang_name(his["lang_org"], his["lang_trans"]) + "] " + str_time + " "));

                elm_td2 = doc.createElement("td");
                elm_tr2.appendChild(elm_td2);
                elm_td2.setAttribute("align", "right");

                var elm_btn_delete = doc.createElement("input");
                elm_td2.appendChild(elm_btn_delete);
                elm_btn_delete.setAttribute("type", "button");
                elm_btn_delete.setAttribute("value", "✕");
                elm_btn_delete.onclick = function () {
                    Nict_TexTra.utils.remove_history_translate(
                        [].slice.call(tbl_history.children).indexOf(elm_tr));
                    tbl_history.removeChild(elm_tr);
                };

                elm_tr2 = doc.createElement("tr");
                elm_tbl_td.appendChild(elm_tr2);
                elm_td2 = doc.createElement("td");
                elm_tr2.appendChild(elm_td2);
                elm_td2.setAttribute("colspan", "2");

                var elm_link = doc.createElement("a");
                elm_td2.appendChild(elm_link);
                elm_link.setAttribute("id", "link_hist_" + ind);
                elm_link.setAttribute("href", "#");
                elm_link.innerText = his["text_org"];

                var elm_trans_hist = doc.createElement("div");
                elm_td2.appendChild(elm_trans_hist);
                elm_trans_hist.setAttribute("id", "text_trans_hist_" + ind);
                elm_trans_hist.innerText = his["text_trans"];

                elm_link.onclick =
                    function () {
                        suspend_translation();
                        doc.getElementById("textbox_target").value = his["text_org"];
                        doc.getElementById("textbox_trans").value = his["text_trans"];
                        doc.getElementById("lang1").value = his["lang_org"];
                        doc.getElementById("lang2").value = his["lang_trans"];
                        change_2_textareas_height();
                        doc.getElementById("textbox_target").focus();
                    };
            });

            div_his.style.display = "block";

        };
        Nict_TexTra.utils.get_history_translate(func_show_his);
    } else {
        div_his.style.display = "none";
    }

}

function adapt_multi_locale() {
    document.getElementById("link_minhon").innerText = I18Nmes('mes_0010'); // みんなの自動翻訳

    document.getElementById("btn_clear").innerText = chrome.i18n.getMessage('mes_0018'); // クリア
    document.getElementById("btn_paste_org").value = chrome.i18n.getMessage('mes_0020'); // 貼付け
    document.getElementById("btn_translation").innerText = I18Nmes('mes_0003'); // 翻訳
    document.getElementById("link_trans_history").innerText = I18Nmes('mes_0601'); // 翻訳履歴
    document.getElementById("btn_copy_trans").value = chrome.i18n.getMessage('mes_0019'); // コピー
    document.getElementById("btn_clear_history").value = I18Nmes('mes_0018'); // クリア

    document.getElementById("link_lookup").innerText = I18Nmes('mes_0004'); // 辞書引き
    document.getElementById("link_ログイン").innerText = I18Nmes('mes_0007'); // ログイン設定
    document.getElementById("alert_login").innerText = I18Nmes('mes_0014'); // ログイン設定を行ってください。
    document.getElementById("link_機械翻訳API").innerText = I18Nmes('mes_0008'); // 機械翻訳API設定
    document.getElementById("link_help").innerText = I18Nmes('mes_0009'); // ヘルプ
}