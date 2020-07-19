function modify_taiyaku_rt() {

    var text_org = document.getElementById("tb_rt_txt_org").value;
    var text_trans = document.getElementById("tb_rt_txt_trans").value;
    var table_locale = document.getElementById('table_locale');
    if (!confirm(Nict_TexTra.utils.bundle.GetStringFromName("Mes06_001") + "\n\n" +
            Nict_TexTra.utils.bundle.GetStringFromName("Org_Sent") + "：\n" + text_org + "\n" +
            Nict_TexTra.utils.bundle.GetStringFromName("Trs_Sent") + "：\n" + text_trans + "\n")) return; // 以下を対訳集に登録します。\nよろしいですか？、原文、訳文

    Nict_TexTra.api.call_api(Nict_TexTra.api.search_taiyaku_dic, regist_taiyaku_for_modify_trans, null,
        { "text_org": text_org, "text_trans": text_trans });
}

// 翻訳修正 対訳集情報取得後
function regist_taiyaku_for_modify_trans(infos) {

    var table_locale = document.getElementById('table_locale');
    var list_dic = infos["resultset"]["result"]["list"];
    if (list_dic.length == 0) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes06_002")); return; }; // 登録先の対訳集がありませんでした。\n「みんなの自動翻訳」で対訳集を作成してください。

    var dic_info = list_dic[0];
    Nict_TexTra.api.call_api(Nict_TexTra.api.regist_taiyaku, show_message_registed_taiyaku, null,
        { "id": dic_info["id"], "text_org": infos["text_org"], "text_trans": infos["text_trans"] });


}

// 訳文登録後
function show_message_registed_taiyaku(infos) {

    var table_locale = document.getElementById('table_locale');
    alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes06_003") + "\n\n" +
        Nict_TexTra.utils.bundle.GetStringFromName("Org_Sent") + "：\n" + infos["text_org"] + "\n\n" +
        Nict_TexTra.utils.bundle.GetStringFromName("Trs_Sent") + "：\n" + infos["text_trans"] + "\n"); // 翻訳文を登録しました。、原文、訳文

}
