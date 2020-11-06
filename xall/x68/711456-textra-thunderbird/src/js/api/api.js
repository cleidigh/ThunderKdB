var Nict_TexTra = Nict_TexTra || {};
Nict_TexTra.api = Nict_TexTra.api || {};

Nict_TexTra.api.ENC_KEY = "TexTra_Chrome_2018";

Nict_TexTra.api.encrypt = function (str) {
    var encrypted = CryptoJS.AES.encrypt(str, Nict_TexTra.api.ENC_KEY);
    return encrypted.toString();
};

Nict_TexTra.api.decrypt = function (str) {
    var decrypted = CryptoJS.AES.decrypt(str, Nict_TexTra.api.ENC_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
};

// APIメソッドを呼ぶ前にこのメソッドを経由する。
// Chrome Strageに保存されている設定を取得する。
Nict_TexTra.api.call_api = function (func_api, func_success, func_fail, infos) {

    if (!infos) infos = {};
    if (!func_fail) func_fail = Nict_TexTra.api.func_fail_api_default;
    chrome.storage.local.get(
        {
            user_name: "", api_key: "", api_secret: "", api_prot: "", api_url: "",
            selected_lang_org: "ja", selected_lang_trans: "en"
        },
        function (login_info) {
            infos["LOGIN_INFO"] = login_info;
            login_info.api_secret = Nict_TexTra.api.decrypt(login_info.api_secret);
            func_api(func_success, func_fail, infos);
        }
    );

};

Nict_TexTra.api.get_api_url = function (api_id, infos) {
    var login_info = infos["LOGIN_INFO"];
    return login_info.api_prot + "://" + login_info.api_url + "/api/" + api_id + "/";
};

// 言語判定
Nict_TexTra.api.judge_lang = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("langdetect", infos);

    if (!infos) infos = {};
    infos["REQ_PARAMS"] = [
        ["text", infos["text"]]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 翻訳APIのURLを取得する
Nict_TexTra.api.get_url_MT_API = function (lang_org, lang_trans, infos, func_next, func_fail) {

    chrome.storage.local.get(
        { MT_API_urls: "{}" },
        function (datas) {
            var key = lang_org + "_" + lang_trans;
            var url = datas["MT_API_urls"][key];
            if (!url) {
                var api_lang = urls_trans_API[key];
                if (api_lang) url = Nict_TexTra.api.get_api_url('mt/' + api_lang, infos);
            }
            if (!url) {
                // 指定された言語の翻訳APIが設定されていません。\n「機械翻訳API設定」で設定を行ってください。
                infos['error_message'] = chrome.i18n.getMessage('mes_0501');
                if (func_fail) func_fail(infos);
                return;
            }
            func_next(url);
        }
    );

};

// 翻訳
Nict_TexTra.api.trans_text = function (func_success, func_fail, infos) {

    var login_info = infos["LOGIN_INFO"];
    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    if (!lang_org) lang_org = login_info["selected_lang_org"];
    if (!lang_trans) lang_trans = login_info["selected_lang_trans"];

    Nict_TexTra.api.get_url_MT_API(lang_org, lang_trans, infos, function (url) {

        infos["REQ_PARAMS"] = [
            ["text", infos["text_org"]],
            ["split", "0"]
        ];

        func_success_trans = function (infos) {
            infos["text_org"] = infos["resultset"]["request"]["text"];
            infos["text_trans"] = infos["resultset"]["result"]["text"];
            infos["lang_org"] = lang_org;
            infos["lang_trans"] = lang_trans;
            infos["src"] = "trans";
            return func_success(infos);
        };

        Nict_TexTra.api.call_api2(url, func_success_trans, func_fail, infos);
    }, func_fail);

};

// 類似文→翻訳（文章区切り）
Nict_TexTra.api.trans_text_split = function (func_success, func_fail, infos) {

    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    if (!lang_org) { lang_org = infos["LOGIN_INFO"]["selected_lang_org"]; infos["lang_org"] = lang_org; }
    if (!lang_trans) { lang_trans = infos["LOGIN_INFO"]["selected_lang_trans"]; infos["lang_trans"] = lang_trans; }

    var texts_org = infos["text_org"];
    var login_info = infos["LOGIN_INFO"];

    var infos_text = {};
    infos_text["LOGIN_INFO"] = login_info;
    infos_text["text_org"] = texts_org;
    infos_text["lang_org"] = lang_org;
    infos_text["lang_trans"] = lang_trans;
    infos_text["ind_split"] = 0;
    infos_text["len_split"] = 1;

    func_success_trans = function (infos) {
        infos["text_org"] = infos["resultset"]["request"]["text"];
        infos["text_trans"] = infos["resultset"]["result"]["text"];
        infos["src"] = "trans";
        return func_success(infos);
    };

    Nict_TexTra.api.trans_text(func_success_trans, func_fail, infos_text);

};

// 類似文検索
Nict_TexTra.api.search_ruijibun = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("sim", infos);

    infos["REQ_PARAMS"] = [
        ["pid", infos["ruiji_dic_cds"]],
        ["text", infos["text"]],
        ["score", infos["score"]]
    ];

    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

Nict_TexTra.api._TABLE_DIC_FOR_LANG = {
    "ja-en": "ld.ja-en", "en-ja": "ld.en-ja",
    "ja-zh-CN": "er.ja-zh-CN", "zh-CN-ja": "er.zh-CN-ja",
    "ja-ko": "kj.ja-ko", "ko-ja": "kj.ko-ja"
};

// 辞書引き
Nict_TexTra.api.refer_dic = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("lookup", infos);

    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    if (!lang_org) lang_org = infos["LOGIN_INFO"]["selected_lang_org"];
    if (!lang_trans) lang_trans = infos["LOGIN_INFO"]["selected_lang_trans"];

    var func_refer_dic = function (infos) {

        var list_dic_info = infos["resultset"]["result"]["list"];
        var list_id = [];
        $.each(list_dic_info, function (ind, dic_info) { list_id.push(dic_info["id"]); });

        var id_big_dic = Nict_TexTra.api._TABLE_DIC_FOR_LANG[lang_org + "-" + lang_trans];
        if (id_big_dic) list_id.push(id_big_dic);
        if (list_id.length == 0) {
            Nict_TexTra.utils.alert(chrome.i18n.getMessage('mes_0502')); // 用語集がありません。
            infos["error_cd"] = "no_dic";
            func_fail(infos);
            return;
        }

        infos["REQ_PARAMS"] = [
            ["text", infos["text_org"]],
            ["pid", list_id.join(",")],
            ["lang_s", lang_org]
        ];
        Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);
    };

    infos["lang_org"] = lang_org;
    infos["lang_trans"] = lang_trans;
    infos["ignore_error_cd"] = ["532"];
    Nict_TexTra.api.search_term_dic(func_refer_dic, func_fail, infos);

};

// 対訳集 一覧取得
Nict_TexTra.api.search_taiyaku_dic = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("list/bilingual", infos);

    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    if (!lang_org) lang_org = infos["LOGIN_INFO"]["selected_lang_org"];
    if (!lang_trans) lang_trans = infos["LOGIN_INFO"]["selected_lang_trans"];

    infos["REQ_PARAMS"] = [
        ["lang_s", lang_org],
        ["lang_t", lang_trans]
    ];
    infos["ignore_error_cd"] = ["532"];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 対訳登録
Nict_TexTra.api.regist_taiyaku = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("register/bilingual", infos);

    infos["REQ_PARAMS"] = [
        ["pid", infos["id"]],
        ["text_s", infos["text_org"]],
        ["text_t", infos["text_trans"]]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 文章区切り
Nict_TexTra.api.split_sentence = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("split", infos);

    var lang_org = infos["lang_org"];
    if (!lang_org) lang_org = infos["LOGIN_INFO"]["selected_lang_org"];

    infos["REQ_PARAMS"] = [
        ["lang", lang_org],
        ["text", infos["text_org"]]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 用語集 検索
Nict_TexTra.api.search_term_dic = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("list/term", infos);

    infos["REQ_PARAMS"] = [
        ["lang_s", infos["lang_org"]],
        ["lang_t", infos["lang_trans"]]
    ];

    infos["ignore_error_cd"] = ["532"];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 用語 登録
Nict_TexTra.api.regist_term_dic = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("register/term", infos);

    infos["REQ_PARAMS"] = [
        ["pid", infos["id"]],
        ["text_s", infos["term_org"]],
        ["text_t", infos["term_trans"]]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

Nict_TexTra.api._que_req = null;
Nict_TexTra.api._executing_req = false;
Nict_TexTra.api._executing_req_last_time = new Date().getTime();

// APIを呼び出す
Nict_TexTra.api.call_api2 = function (url, func_success, func_fail, infos) {

    if (!func_fail) func_fail = Nict_TexTra.api.func_fail_api_default;
    var login_info = infos["LOGIN_INFO"];
    var params = [
        ["name", login_info["user_name"]],
        ["key", login_info["api_key"]],
        ["type", "json"]
    ];
    params = params.concat(infos["REQ_PARAMS"]);
    //console.log("api url >> " + url + "\n" +
    //            "request parameters >> \n" + JSON.stringify(params));
    infos["resultset"] = null;

    var accessor = {
        consumerKey: login_info["api_key"],
        consumerSecret: login_info["api_secret"]
    };

    var message = { method: "POST", action: url, parameters: params };
    var requestBody = OAuth.formEncode(message.parameters);
    OAuth.completeRequest(message, accessor);

    var req = new XMLHttpRequest();
    req.addEventListener('loadend', function () {

        if (req.status == 200) {

            var flg_success = false;
            //console.log("api response >> " + this.response);
            var obj_json = JSON.parse(this.response);
            var code_res = obj_json["resultset"]["code"];
            var list_ignore = infos["ignore_error_cd"];
            if (code_res == "0" ||
                (list_ignore && $.inArray(code_res + '', list_ignore) >= 0)) {
                infos["resultset"] = obj_json["resultset"];
                func_success(infos);
                flg_success = true;
            }

            if (!flg_success) {
                infos["api_response"] = JSON.parse(this.response);
                Nict_TexTra.api.func_fail_api(func_fail, infos, this.response);
                //console.log("failed :: " + url);
                //console.log(this.response);
            }

            Nict_TexTra.api._executing_req = false;

        }

    });

    req.open(message.method, message.action, true);
    req.setRequestHeader("Access-Control-Allow-Origin", "*");

    var realm = "";
    req.setRequestHeader("Authorization", OAuth.getAuthorizationHeader(realm, message.parameters));
    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    if (!Nict_TexTra.api._que_req) {
        Nict_TexTra.api._que_req = [];
        setInterval(Nict_TexTra.api.func_execute_request, 1000);
    }

    Nict_TexTra.api._que_req.push(
        function () { req.send(requestBody); }
    );
};

// APIを呼び出しを連続させないための処理
Nict_TexTra.api.func_execute_request = function () {

    if (new Date().getTime() - Nict_TexTra.api._executing_req_last_time < 30 * 1000) {
        Nict_TexTra.api._executing_req = false;
    }

    if (Nict_TexTra.api._executing_req) { return; }

    var func = Nict_TexTra.api._que_req.shift();
    if (func) {
        Nict_TexTra.api._executing_req = true;
        Nict_TexTra.api._executing_req_last_time = new Date().getTime();
        func();
    }

};

Nict_TexTra.api.func_fail_login = function () {
    // ログインに失敗しました。
    // ログイン情報の設定を行ってください。
    // 上部ポップアップ→ログイン情報
    //
    // またはサーバメンテナンス中の可能性があります。
    // みんなの自動翻訳サイトをご確認ください。
    Nict_TexTra.utils.alert(chrome.i18n.getMessage('mes_0503'));
};

Nict_TexTra.api.func_fail_api_default = function (infos) {

    var resp = infos["api_response"];
    var result = resp ? resp["resultset"] : null;
    var cd = result ? result["code"] : null;

    if (cd == "500" || cd == "501" ||
        cd == "522" || cd == "523") {
        Nict_TexTra.api.func_fail_login();
    } else {
        // API処理に失敗しました。
        // このメッセージの画像、エラー発生時の状態を 
        // 開発者までお知らせください。
        // パラメータ：
        Nict_TexTra.utils.alert(chrome.i18n.getMessage('mes_0504') + JSON.stringify(infos));
    }

};

Nict_TexTra.api.func_fail_api = function (func_dail_default, infos, response) {
    if (response.indexOf("503 Service Unavailable") != -1) {
        // みんなの自動翻訳サーバが停止しています。
        // メンテナンス情報をご確認ください。
        Nict_TexTra.utils.alert(chrome.i18n.getMessage('mes_0505'));
    } else {
        func_dail_default(infos);
    }
};

const urls_trans_API = {
    'ja_en': 'generalNT_ja_en',
    'en_ja': 'generalNT_en_ja',
    'ja_zh-CN': 'generalNT_ja_zh-CN',
    'zh-CN_ja': 'generalNT_zh-CN_ja',
    'ja_zh-TW': 'generalNT_ja_zh-TW',
    'zh-TW_ja': 'generalNT_zh-TW_ja',
    'ja_ko': 'generalN_ja_ko',
    'ko_ja': 'generalN_ko_ja',
    'ja_fr': 'generalN_ja_fr',
    'fr_ja': 'generalN_fr_ja',
    'ja_de': 'generalN_ja_de',
    'de_ja': 'generalN_de_ja',
    'ja_id': 'generalN_ja_id',
    'id_ja': 'generalN_id_ja',
    'ja_fp': 'voicetraN_ja_fp',
    'fp_ja': 'voicetraN_fp_ja',
    'ja_es': 'generalN_ja_es',
    'es_ja': 'generalN_es_ja',
    'ja_vi': 'generalN_ja_vi',
    'vi_ja': 'generalN_vi_ja',
    'ja_my': 'generalN_ja_my',
    'my_ja': 'generalN_my_ja',
    'ja_th': 'generalN_ja_th',
    'th_ja': 'generalN_th_ja',
    'ja_pt-BR': 'voicetraN_ja_pt-BR',
    'pt-BR_ja': 'voicetraN_pt-BR_ja',
    'en_fr': 'generalN_en_fr',
    'fr_en': 'generalN_fr_en',
    'en_de': 'generalN_en_de',
    'de_en': 'generalN_de_en',
    'en_id': 'generalN_en_id',
    'id_en': 'generalN_id_en',
    'en_es': 'generalN_en_es',
    'es_en': 'generalN_es_en',
    'en_vi': 'generalN_en_vi',
    'vi_en': 'generalN_vi_en',
    'en_my': 'generalN_en_my',
    'my_en': 'generalN_my_en',
    'en_th': 'generalN_en_th',
    'th_en': 'generalN_th_en',
    'en_pt': 'generalN_en_pt',
    'pt_en': 'generalN_pt_en',
    'fr_my': 'voicetraN_fr_my',
    'my_fr': 'voicetraN_my_fr',
    'zh-CN_ko': 'voicetraN_zh-CN_ko',
    'ko_zh-CN': 'voicetraN_ko_zh-CN',
    'zh-TW_ko': 'voicetraN_zh-TW_ko',
    'ko_zh-TW': 'voicetraN_ko_zh-TW'
};
