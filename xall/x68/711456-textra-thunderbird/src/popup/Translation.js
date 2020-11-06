window.onload = function () {

    var doc = window.document;

    doc.getElementById("btn_translation").onclick = start_translation;
    doc.getElementById("btn_replace_lang").onclick = replace_language_button;
    doc.getElementById("textbox_target").focus();
    doc.getElementById("btn_show_all").onclick = show_all_text_org;

    set_language_button();

    var st = browser.storage.local.get();
    st.then(function (datas) {
        if (!Nict_TexTra.utils.is_empty_string(datas.trans_target)) {
            var text_org = datas.trans_target;
            doc.getElementById("textbox_target").value = text_org;
            doc.getElementById("div_txt_org").innerText = text_org;
        }
        if (datas.flg_start_trans) { doc.getElementById("btn_translation").click(); }
        browser.storage.local.remove(["trans_target", "flg_start_trans"]);
    });

    adapt_multi_locale();

};

function start_translation() {

    var doc = window.document;

    var txt_org = doc.getElementById("textbox_target").value;
    if (Nict_TexTra.utils.is_empty_string(txt_org)) {
        alert("翻訳する文字列を入力してください。");
        return;
    }

    doc.getElementById("btn_translation").disabled = true;

    Nict_TexTra.utils.remove_all_children(doc.getElementById("trans_result"));
    Nict_TexTra.utils.remove_element_children(doc.getElementById("div_txt_trs"));

    doc.getElementById("img_wait").style.display = "block";
    var infos = { text_org: txt_org };
    Nict_TexTra.api.call_api(Nict_TexTra.api.trans_text, show_result_translation, null, infos);

}

function show_result_translation(infos) {

    var doc = window.document;

    var text_trans = infos["text_trans"];

    var elm_trans_area = doc.getElementById("trans_result");
    var elm_trans_area_all = doc.getElementById("div_txt_trs");

    elm_trans_area.innerText = text_trans;
    elm_trans_area_all.innerText = text_trans;

    doc.getElementById("img_wait").style.display = "none";
    doc.getElementById("btn_translation").disabled = false;

}


// 翻訳修正 対訳集情報取得後
function regist_taiyaku_for_modify_trans(infos) {

    var list_dic = infos["resultset"]["result"]["list"];
    if (list_dic.length == 0) { alert("登録先の対訳集がありませんでした。\n「みんなの自動翻訳」で対訳集を作成してください。"); return; };

    var dic_info = list_dic[0];
    Nict_TexTra.api.call_api(Nict_TexTra.api.regist_taiyaku, show_message_registed_taiyaku, null,
        { "id": dic_info["id"], "text_org": infos["text_org"], "text_trans": infos["text_trans"] });

}

// 訳文登録後
function show_message_registed_taiyaku(infos) {

    alert("翻訳文を登録しました。\n\n" +
        "原文：\n" + infos["text_org"] + "\n\n" +
        "訳文：\n" + infos["text_trans"] + "\n");

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

            var elm_org = doc.getElementById("textbox_target");
            var elm_trs = doc.getElementById("trans_result");
            var txt_org = elm_org.value;
            var txt_trs = elm_trs.innerText;
            elm_org.value = txt_trs;
            elm_trs.innerText = txt_org;

            var elm_org_all = doc.getElementById("div_txt_org");
            var elm_trs_all = doc.getElementById("div_txt_trs");
            elm_org_all.innerText = txt_trs;
            elm_trs_all.innerText = txt_org;
        }
    );

}

// 「全文」ボタン
function show_all_text_org() {

    var doc = window.document;
    var elm_txt_org = doc.getElementById("textbox_target");
    var elm_txt_org_all = doc.getElementById("div_txt_org");
    var is_all = elm_txt_org_all.style.display == "block";

    elm_txt_org_all.innerText = elm_txt_org.value;
    if (Nict_TexTra.utils.is_empty_string(elm_txt_org_all.innerText)) elm_txt_org_all.innerHTML = "&nbsp;";

    elm_txt_org.style.display = is_all ? "block" : "none";
    elm_txt_org_all.style.display = !is_all ? "block" : "none";

    var elm_txt_trs = doc.getElementById("trans_result");
    var elm_txt_trs_all = doc.getElementById("div_txt_trs");
    elm_txt_trs.style.display = is_all ? "block" : "none";
    elm_txt_trs_all.style.display = !is_all ? "block" : "none";
    if (Nict_TexTra.utils.is_empty_string(elm_txt_trs_all.innerText)) elm_txt_trs_all.innerHTML = "&nbsp;";

}

function adapt_multi_locale() {
    document.getElementById("span_title").innerText = chrome.i18n.getMessage('mes_0003'); // 翻訳
    document.getElementById("link_top").innerText = chrome.i18n.getMessage('mes_0013'); // トップ
    document.getElementById("btn_translation").value = chrome.i18n.getMessage('mes_0003'); // 翻訳
    document.getElementById("btn_show_all").value = chrome.i18n.getMessage('mes_0701'); // 全文
    //document.getElementById("").innerText = chrome.i18n.getMessage('mes_000'); //
}
