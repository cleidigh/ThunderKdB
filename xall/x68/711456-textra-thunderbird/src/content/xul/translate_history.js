function set_history_panel(target) {

    var elm_trans = document.getElementById("tbl_hist_trans");
    var elm_dic = document.getElementById("tbl_hist_dic");
    if (!target) {
        if (elm_trans.style.display != "none") target = "trans";
        else if (elm_dic.style.display != "none") target = "dic";
    }

    elm_dic.style.display = "none";
    elm_trans.style.display = "none";

    var elm_link_trs = document.getElementById("link_history_trs");
    var elm_link_dic = document.getElementById("link_history_dic");
    elm_link_trs.style.background = null;
    elm_link_dic.style.background = null;

    switch (target) {
        case "trans":
            elm_trans.style.display = "block";
            elm_link_trs.style.backgroundColor = "mistyrose";
            set_history_trans();
            break;
        case "dic":
            elm_dic.style.display = "block";
            elm_link_dic.style.backgroundColor = "mistyrose";
            set_history_dic();
            break;
    }

}

var STR_NS_HTML = "http://www.w3.org/1999/xhtml";

function set_history_trans() {

    var elm_table = document.getElementById("tbl_hist_trans");

    while (elm_table.firstChild) { elm_table.removeChild(elm_table.firstChild); }

    var list_hist = Nict_TexTra.utils.get_history_translate();
    var table_locale = document.getElementById('table_locale');
    var locale = Nict_TexTra.utils.bundle.GetStringFromName("system_lang");
    $.each(list_hist, function (ind, hist_data) {

        var tm = new Date(Date.parse(hist_data["time"]));
        var str_time = locale == "ja" ?
            tm.getMonth() + "月" + tm.getDate() + "日 " +
            tm.getHours() + "時" + tm.getMinutes() + "分" :
            tm.getMonth() + "/" + tm.getDate() +
            tm.getHours() + ":" + tm.getMinutes();

        var elm_tr = document.createElementNS(STR_NS_HTML, "html:tr");
        elm_table.appendChild(elm_tr);
        var elm_td = document.createElementNS(STR_NS_HTML, "html:td");
        elm_tr.appendChild(elm_td);
        elm_td.setAttribute("width", "999999");
        elm_td.appendChild(document.createTextNode(
            "[" + Nict_TexTra.utils.get_2lang_name(hist_data["lang_org"], hist_data["lang_trans"]) + "] " + str_time));
        elm_td.appendChild(document.createElementNS(STR_NS_HTML, "html:br"));

        var elm_link_text_org = document.createElement("label");
        elm_td.appendChild(elm_link_text_org);
        elm_link_text_org.setAttribute("id", "link_text_org_histrs" + ind);
        elm_link_text_org.setAttribute("class", "text-link");
        elm_link_text_org.setAttribute("value", hist_data["text_org"]);
        elm_link_text_org.onclick = function () { move_to_translate(ind); };
        elm_td.appendChild(document.createElementNS(STR_NS_HTML, "html:br"));

        var elm_text_trans = document.createElement("label");
        elm_td.appendChild(elm_text_trans);
        elm_text_trans.setAttribute("id", "text_trans_histrs" + ind);
        elm_text_trans.setAttribute("value", hist_data["text_trans"]);
        elm_td.appendChild(document.createElementNS(STR_NS_HTML, "html:br"));

        var elm_dic_lang_org = document.createElement("label");
        elm_td.appendChild(elm_dic_lang_org);
        elm_dic_lang_org.setAttribute("id", "hist_trs_lang_org" + ind);
        elm_dic_lang_org.setAttribute("hidden", "true");
        elm_dic_lang_org.setAttribute("value", hist_data["lang_org"]);

        var elm_dic_lang_trs = document.createElement("label");
        elm_td.appendChild(elm_dic_lang_trs);
        elm_dic_lang_trs.setAttribute("id", "hist_trs_lang_trs" + ind);
        elm_dic_lang_trs.setAttribute("hidden", "true");
        elm_dic_lang_trs.setAttribute("value", hist_data["lang_trans"]);

    });

}

function move_to_translate(ind) {
    var text_org = document.getElementById("link_text_org_histrs" + ind.toString()).value;
    var lang_org = document.getElementById("hist_trs_lang_org" + ind.toString()).value;
    var lang_trs = document.getElementById("hist_trs_lang_trs" + ind.toString()).value;

    document.getElementById("tb_trs_txt_org").value = text_org;
    
    call_trans_text2(text_org, lang_org, lang_trs, true);
    show_panels('trans');
}

function set_history_dic() {

    var elm_table = document.getElementById("tbl_hist_dic");
    while (elm_table.firstChild) { elm_table.removeChild(elm_table.firstChild); }

    var list_hist = Nict_TexTra.utils.get_history_refer_dic();
    var table_locale = document.getElementById('table_locale');
    var locale = Nict_TexTra.utils.bundle.GetStringFromName("system_lang");
    $.each(list_hist, function (ind, hist_data) {

        var tm = new Date(Date.parse(hist_data["time"]));
        var str_time = locale == "ja" ?
            tm.getMonth() + "月" + tm.getDate() + "日 " +
            tm.getHours() + "時" + tm.getMinutes() + "分" :
            tm.getMonth() + "/" + tm.getDate() +
            tm.getHours() + ":" + tm.getMinutes();

        var elm_tr = document.createElementNS(STR_NS_HTML, "html:tr");
        elm_table.appendChild(elm_tr);
        var elm_td = document.createElementNS(STR_NS_HTML, "html:td");
        elm_tr.appendChild(elm_td);
        elm_td.setAttribute("width", "999999");
        elm_td.appendChild(document.createTextNode(
            "[" + Nict_TexTra.utils.get_2lang_name(hist_data["lang_org"], hist_data["lang_trans"]) + "] " + str_time));
        elm_td.appendChild(document.createElementNS(STR_NS_HTML, "html:br"));
        
        var elm_link_text_org = document.createElement("label");
        elm_td.appendChild(elm_link_text_org);
        elm_link_text_org.setAttribute("id", "link_text_org_hisdic" + ind);
        elm_link_text_org.setAttribute("class", "text-link");
        elm_link_text_org.setAttribute("value", hist_data["text_org"]);
        elm_link_text_org.onclick = function () { move_to_dic(ind); };
        elm_td.appendChild(document.createElementNS(STR_NS_HTML, "html:br"));

        var elm_dic_lang_org = document.createElement("label");
        elm_td.appendChild(elm_dic_lang_org);
        elm_dic_lang_org.setAttribute("id", "hist_dic_lang_org" + ind);
        elm_dic_lang_org.setAttribute("hidden", "true");
        elm_dic_lang_org.setAttribute("value", hist_data["lang_org"]);

        var elm_dic_lang_trs = document.createElement("label");
        elm_td.appendChild(elm_dic_lang_trs);
        elm_dic_lang_trs.setAttribute("id", "hist_dic_lang_trs" + ind);
        elm_dic_lang_trs.setAttribute("hidden", "true");
        elm_dic_lang_trs.setAttribute("value", hist_data["lang_trans"]);

    });

}

function move_to_dic(ind) {
    var text_org = document.getElementById("link_text_org_hisdic" + ind.toString()).value;
    var lang_org = document.getElementById("hist_dic_lang_org" + ind.toString()).value;
    var lang_trs = document.getElementById("hist_dic_lang_trs" + ind.toString()).value;

    document.getElementById("tb_ref_dic_txt_org").value = text_org;

    call_refer_dic2(text_org, lang_org, lang_trs, true);
    show_panels('ref_dic');
}

function clear_history() {
    var target;

    var elm_trans = document.getElementById("tbl_hist_trans");
    var elm_dic = document.getElementById("tbl_hist_dic");
    if (elm_trans.style.display != "none") target = "trans";
    else if (elm_dic.style.display != "none") target = "dic";

    var table_locale = document.getElementById('table_locale');
    if (!confirm(Nict_TexTra.utils.bundle.GetStringFromName("Mes04_001"))) return; // 翻訳履歴をクリアします。\nよろしいですか？
    switch (target) {
        case "trans":
            Nict_TexTra.utils.clear_history_translate();
            break;
        case "dic":
            Nict_TexTra.utils.clear_history_refer_dic();
            break;
        default: return;
    }
    set_history_panel(target);
}