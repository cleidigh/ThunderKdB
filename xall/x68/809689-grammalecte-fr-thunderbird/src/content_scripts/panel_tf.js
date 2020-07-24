// JavaScript
// Text formatter

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global GrammalectePanel, oGrammalecte, TextFormatter, bChrome, browser, showError, document, console */

"use strict";


class GrammalecteTextFormatter extends GrammalectePanel {

    constructor (...args) {
        super(...args);
        this.xTFNode = this._createTextFormatter();
        this.xPanelContent.appendChild(this.xTFNode);
        this.xPanel.style.zIndex = 2147483647; /* maximum is 2147483647: https://stackoverflow.com/questions/491052/minimum-and-maximum-value-of-z-index */
        this.bTextChanged = false;

        this.oTextFormatter = new TextFormatter();
        this.formatText = this.oTextFormatter.formatTextRuleCount;
        this.removeHyphenAtEndOfParagraphs = this.oTextFormatter.removeHyphenAtEndOfParagraphsCount;
        this.mergeContiguousParagraphs = this.oTextFormatter.mergeContiguousParagraphsCount;
        this.getParagraph = this.oTextFormatter.getParagraph;

        this.xCloseButton.onclick = () => {
            this.hide();
            if (this.bTextChanged) {
                oGrammalecte.oGCPanel.recheckAll();
                this.bTextChanged = false;
            }
        };
    }

    _createTextFormatter () {
        let xTFNode = document.createElement("div");
        try {
            // Options
            let xOptions = oGrammalecte.createNode("div", {id: "grammalecte_tf_options"});
            let xColumn1 = oGrammalecte.createNode("div", {className: "grammalecte_tf_column"});
            let xSSP = this._createFieldset("group_ssp", true, "Espaces surnuméraires");
            xSSP.appendChild(this._createBlockOption("o_start_of_paragraph", true, "En début de paragraphe"));
            xSSP.appendChild(this._createBlockOption("o_end_of_paragraph", true, "En fin de paragraphe"));
            xSSP.appendChild(this._createBlockOption("o_between_words", true, "Entre les mots"));
            xSSP.appendChild(this._createBlockOption("o_before_punctuation", true, "Avant les points (.), les virgules (,)"));
            xSSP.appendChild(this._createBlockOption("o_within_parenthesis", true, "À l’intérieur des parenthèses"));
            xSSP.appendChild(this._createBlockOption("o_within_square_brackets", true, "À l’intérieur des crochets"));
            xSSP.appendChild(this._createBlockOption("o_within_quotation_marks", true, "À l’intérieur des guillemets “ et ”"));
            let xSpace = this._createFieldset("group_space", true, "Espaces manquants");
            xSpace.appendChild(this._createBlockOption("o_add_space_after_punctuation", true, "Après , ; : ? ! . …"));
            xSpace.appendChild(this._createBlockOption("o_add_space_around_hyphens", true, "Autour des tirets d’incise"));
            let xNBSP = this._createFieldset("group_nbsp", true, "Espaces insécables");
            xNBSP.appendChild(this._createBlockOption("o_nbsp_before_punctuation", true, "Avant : ; ? et !"));
            xNBSP.appendChild(this._createBlockOption("o_nbsp_within_quotation_marks", true, "Avec les guillemets « et »"));
            xNBSP.appendChild(this._createBlockOption("o_nbsp_before_symbol", true, "Avant % ‰ € $ £ ¥ ˚C"));
            xNBSP.appendChild(this._createBlockOption("o_nbsp_within_numbers", true, "À l’intérieur des nombres"));
            xNBSP.appendChild(this._createBlockOption("o_nbsp_before_units", true, "Avant les unités de mesure"));
            xNBSP.appendChild(this._createBlockOption("o_nbsp_titles", true, "Après les titres de civilité"));
            let xDelete = this._createFieldset("group_delete", true, "Suppressions");
            xDelete.appendChild(this._createBlockOption("o_erase_non_breaking_hyphens", true, "Tirets conditionnels"));
            let xColumn2 = oGrammalecte.createNode("div", {className: "grammalecte_tf_column"});
            let xTypo = this._createFieldset("group_typo", true, "Signes typographiques");
            xTypo.appendChild(this._createBlockOption("o_ts_apostrophe", true, "Apostrophe (’)"));
            xTypo.appendChild(this._createBlockOption("o_ts_ellipsis", true, "Points de suspension (…)"));
            xTypo.appendChild(this._createBlockOption("o_ts_dash_middle", true, "Tirets d’incise :"));
            xTypo.appendChild(this._createRadioBoxHyphens("o_ts_m_dash_middle", "o_ts_n_dash_middle", false));
            xTypo.appendChild(this._createBlockOption("o_ts_dash_start", true, "Tirets en début de paragraphe :"));
            xTypo.appendChild(this._createRadioBoxHyphens("o_ts_m_dash_start", "o_ts_n_dash_start", true));
            xTypo.appendChild(this._createBlockOption("o_ts_quotation_marks", true, "Modifier les guillemets droits (\" et ')"));
            xTypo.appendChild(this._createBlockOption("o_ts_units", true, "Points médians des unités (N·m, Ω·m…)"));
            xTypo.appendChild(this._createBlockOption("o_ts_spell", true, "Ligatures et diacritiques (cœur, ça,État…)"));
            xTypo.appendChild(this._createRadioBoxLigatures());
            xTypo.appendChild(this._createLigaturesSelection());
            let xMisc = this._createFieldset("group_misc", true, "Divers");
            xMisc.appendChild(this._createOrdinalOptions());
            xMisc.appendChild(this._createBlockOption("o_etc", true, "Et cætera, etc."));
            xMisc.appendChild(this._createBlockOption("o_missing_hyphens", true, "Traits d’union manquants"));
            xMisc.appendChild(this._createBlockOption("o_ma_word", true, "Apostrophes manquantes"));
            xMisc.appendChild(this._createSingleLetterOptions());
            xColumn1.appendChild(xSSP);
            xColumn1.appendChild(xSpace);
            xColumn1.appendChild(xNBSP);
            xColumn1.appendChild(xDelete);
            xColumn2.appendChild(xTypo);
            xColumn2.appendChild(xMisc);
            if (!bThunderbird) {
                let xStruct = this._createFieldset("group_struct", false, "Restructuration [!]");
                xStruct.appendChild(this._createBlockOption("o_remove_hyphens_at_end_of_paragraphs", false, "Enlever césures en fin de ligne/paragraphe [!]"));
                xStruct.appendChild(this._createBlockOption("o_merge_contiguous_paragraphs", false, "Fusionner les paragraphes contigus [!]"));
                xColumn2.appendChild(xStruct);
            }
            xOptions.appendChild(xColumn1);
            xOptions.appendChild(xColumn2);
            // Actions
            let xActions = oGrammalecte.createNode("div", {id: "grammalecte_tf_actions"});
            let xDefaultButton = oGrammalecte.createNode("div", {id: "grammalecte_tf_reset", textContent: "Par défaut", className: "grammalecte_tf_button"});
            xDefaultButton.addEventListener("click", () => { this.reset(); });
            let xApplyButton = oGrammalecte.createNode("div", {id: "grammalecte_tf_apply", textContent: "Appliquer", className: "grammalecte_tf_button"});
            xApplyButton.addEventListener("click", () => { this.saveOptions(); this.apply(); });
            xActions.appendChild(xDefaultButton);
            xActions.appendChild(oGrammalecte.createNode("progress", {id: "grammalecte_tf_progressbar"}));
            xActions.appendChild(oGrammalecte.createNode("span", {id: "grammalecte_tf_time_res", textContent: "…"}));
            xActions.appendChild(xApplyButton);
            //xActions.appendChild(oGrammalecte.createNode("div", {id: "grammalecte_infomsg", textContent: "blabla"}));
            // create result
            xTFNode.appendChild(xOptions);
            xTFNode.appendChild(xActions);
        }
        catch (e) {
            showError(e);
        }
        return xTFNode;
    }

    // Common options
    _createFieldset (sId, bDefault, sLabel) {
        let xFieldset = oGrammalecte.createNode("div", {id: sId, className: "grammalecte_tf_groupblock"});
        let xGroupOption = oGrammalecte.createNode("div", {id: "o_"+sId, className: "grammalecte_tf_option grammalecte_tf_option_title_off", textContent: sLabel}, {selected: "false", default: bDefault, linked_ids: ""});
        xGroupOption.addEventListener("click", (xEvent) => { this.switchOption(xEvent.target.id); this.switchGroup(xEvent.target.id); });
        xFieldset.appendChild(xGroupOption);
        return xFieldset;
    }

    _createBlockOption (sId, bDefault, sLabel) {
        let xLine = oGrammalecte.createNode("div", {className: "grammalecte_tf_blockopt grammalecte_tf_underline"});
        xLine.appendChild(this._createOption(sId, bDefault, sLabel));
        xLine.appendChild(oGrammalecte.createNode("div", {id: "res_"+sId, className: "grammalecte_tf_result", textContent: "·"}));
        return xLine;
    }

    _createOption (sId, bDefault, sLabel, sLinkedOptionsId="") {
        let xOption = oGrammalecte.createNode("div", {id: sId, className: "grammalecte_tf_option grammalecte_tf_option_off", textContent: sLabel}, {selected: "false", default: bDefault, linked_ids: sLinkedOptionsId});
        xOption.addEventListener("click", (xEvent) => { this.switchOption(xEvent.target.id); });
        return xOption;
    }

    // Hyphens
    _createRadioBoxHyphens (sIdEmDash, sIdEnDash, bDefaultEmDash) {
        let xLine = oGrammalecte.createNode("div", {className: "grammalecte_tf_blockopt grammalecte_tf_indent"});
        xLine.appendChild(this._createOption(sIdEmDash, bDefaultEmDash, "cadratin (—)", sIdEnDash));
        xLine.appendChild(this._createOption(sIdEnDash, !bDefaultEmDash, "demi-cadratin (—)", sIdEmDash));
        return xLine;
    }

    // Ligatures
    _createRadioBoxLigatures () {
        let xLine = oGrammalecte.createNode("div", {className: "grammalecte_tf_blockopt grammalecte_tf_underline"});
        xLine.appendChild(this._createOption("o_ts_ligature", true, "Ligatures"));
        xLine.appendChild(this._createOption("o_ts_ligature_do", false, "faire", "o_ts_ligature_undo"));
        xLine.appendChild(this._createOption("o_ts_ligature_undo", true, "défaire", "o_ts_ligature_do"));
        xLine.appendChild(oGrammalecte.createNode("div", {id: "res_"+"o_ts_ligature", className: "grammalecte_tf_result", textContent: "·"}));
        return xLine;
    }

    _createLigaturesSelection () {
        let xLine = oGrammalecte.createNode("div", {className: "grammalecte_tf_blockopt grammalecte_tf_indent"});
        xLine.appendChild(this._createOption("o_ts_ligature_ff", true, "ff"));
        xLine.appendChild(this._createOption("o_ts_ligature_fi", true, "fi"));
        xLine.appendChild(this._createOption("o_ts_ligature_ffi", true, "ffi"));
        xLine.appendChild(this._createOption("o_ts_ligature_fl", true, "fl"));
        xLine.appendChild(this._createOption("o_ts_ligature_ffl", true, "ffl"));
        xLine.appendChild(this._createOption("o_ts_ligature_ft", true, "ft"));
        xLine.appendChild(this._createOption("o_ts_ligature_st", false, "st"));
        return xLine;
    }

    // Apostrophes
    _createSingleLetterOptions () {
        let xLine = oGrammalecte.createNode("div", {className: "grammalecte_tf_blockopt grammalecte_tf_indent"});
        xLine.appendChild(this._createOption("o_ma_1letter_lowercase", false, "lettres isolées (j’ n’ m’ t’ s’ c’ d’ l’)"));
        xLine.appendChild(this._createOption("o_ma_1letter_uppercase", false, "Maj."));
        return xLine;
    }

    // Ordinals
    _createOrdinalOptions () {
        let xLine = oGrammalecte.createNode("div", {className: "grammalecte_tf_blockopt grammalecte_tf_underline"});
        xLine.appendChild(this._createOption("o_ordinals_no_exponant", true, "Ordinaux (15e, XXIe…)"));
        xLine.appendChild(this._createOption("o_ordinals_exponant", true, "e → ᵉ"));
        xLine.appendChild(oGrammalecte.createNode("div", {id: "res_"+"o_ordinals_no_exponant", className: "grammalecte_tf_result", textContent: "·"}));
        return xLine;
    }


    /*
        Actions
    */
    start () {
        if (bChrome) {
            browser.storage.local.get("tf_options", this.setOptions.bind(this));
        } else {
            let xPromise = browser.storage.local.get("tf_options");
            xPromise.then(this.setOptions.bind(this), this.reset.bind(this));
        }
    }

    setOptions (oOptions) {
        if (oOptions.hasOwnProperty("tf_options")) {
            oOptions = oOptions.tf_options;
        }
        let elmOpt = this.xParent.getElementById('grammalecte_tf_options');
        for (let xOption of elmOpt.getElementsByClassName("grammalecte_tf_option")) {
            //console.log(xOption.id + " > " + oOptions.hasOwnProperty(xOption.id) + ": " + oOptions[xOption.id] + " [" + xOption.dataset.default + "]");
            xOption.dataset.selected = (oOptions.hasOwnProperty(xOption.id)) ? oOptions[xOption.id] : xOption.dataset.default;
            xOption.className = (xOption.dataset.selected == "true") ? xOption.className.replace("_off", "_on") : xOption.className.replace("_on", "_off");
            if (this.xParent.getElementById("res_"+xOption.id) !== null) {
                this.xParent.getElementById("res_"+xOption.id).textContent = "";
            }
            if (xOption.id.startsWith("o_group_")) {
                this.switchGroup(xOption.id);
            }
        }
    }

    switchGroup (sOptName) {
        if (this.xParent.getElementById(sOptName).dataset.selected == "true") {
            this.xParent.getElementById(sOptName.slice(2)).style.opacity = 1;
        } else {
            this.xParent.getElementById(sOptName.slice(2)).style.opacity = 0.3;
        }
        this.resetProgressBar();
    }

    switchOption (sOptName) {
        let xOption = this.xParent.getElementById(sOptName);
        if (xOption.dataset.linked_ids === "") {
            xOption.dataset.selected = (xOption.dataset.selected == "true") ? "false" : "true";
            xOption.className = (xOption.dataset.selected == "true") ? xOption.className.replace("_off", "_on") : xOption.className.replace("_on", "_off");
        } else {
            this.setOption(sOptName, true);
            for (let sOptName of xOption.dataset.linked_ids.split("|")) {
                this.setOption(sOptName, false);
            }
        }
    }

    setOption (sOptName, bValue) {
        let xOption = this.xParent.getElementById(sOptName);
        xOption.dataset.selected = bValue;
        xOption.className = (xOption.dataset.selected == "true") ? xOption.className.replace("_off", "_on") : xOption.className.replace("_on", "_off");
    }

    reset () {
        this.resetProgressBar();
        //on Shadow DOM getElementsByClassName don't work directly ;)
        let elmOpt = this.xParent.getElementById('grammalecte_tf_options');
        for (let xOption of elmOpt.getElementsByClassName("grammalecte_tf_option")) {
            xOption.dataset.selected = xOption.dataset.default;
            xOption.className = (xOption.dataset.selected == "true") ? xOption.className.replace("_off", "_on") : xOption.className.replace("_on", "_off");
            if (xOption.id.startsWith("o_group_")) {
                this.switchGroup(xOption.id);
            }
        }
    }

    resetProgressBar () {
        this.xParent.getElementById('grammalecte_tf_progressbar').value = 0;
        this.xParent.getElementById('grammalecte_tf_time_res').textContent = "";
    }

    saveOptions () {
        let oOptions = {};
        let elmOpt = this.xParent.getElementById('grammalecte_tf_options');
        for (let xOption of elmOpt.getElementsByClassName("grammalecte_tf_option")) {
            oOptions[xOption.id] = (xOption.dataset.selected == "true");
            //console.log(xOption.id + ": " + xOption.checked);
        }
        browser.storage.local.set({"tf_options": oOptions});
    }

    isSelected (sOptName) {
        if (this.xParent.getElementById(sOptName)) {
            return (this.xParent.getElementById(sOptName).dataset.selected === "true");
        }
        return false;
    }

    apply () {
        try {
            const t0 = Date.now();
            //window.setCursor("wait"); // change pointer
            this.resetProgressBar();
            let sText = oGrammalecte.oGCPanel.oTextControl.getText();
            this.xParent.getElementById('grammalecte_tf_progressbar').max = 7;
            let n1 = 0, n2 = 0, n3 = 0, n4 = 0, n5 = 0, n6 = 0, n7 = 0;

            // Restructuration
            if (this.isSelected("o_group_struct")) {
                if (this.isSelected("o_remove_hyphens_at_end_of_paragraphs")) {
                    [sText, n1] = this.removeHyphenAtEndOfParagraphs(sText);
                    this.xParent.getElementById('res_o_remove_hyphens_at_end_of_paragraphs').textContent = n1;
                }
                if (this.isSelected("o_merge_contiguous_paragraphs")) {
                    [sText, n1] = this.mergeContiguousParagraphs(sText);
                    this.xParent.getElementById('res_o_merge_contiguous_paragraphs').textContent = n1;
                }
                this.setOption("o_group_struct", false);
                this.switchGroup("o_group_struct");
            }
            this.xParent.getElementById('grammalecte_tf_progressbar').value = 1;

            // espaces surnuméraires
            if (this.isSelected("o_group_ssp")) {
                if (this.isSelected("o_end_of_paragraph")) {
                    [sText, n1] = this.formatText(sText, "end_of_paragraph");
                    this.xParent.getElementById('res_o_end_of_paragraph').textContent = n1;
                }
                if (this.isSelected("o_between_words")) {
                    [sText, n1] = this.formatText(sText, "between_words");
                    this.xParent.getElementById('res_o_between_words').textContent = n1;
                }
                if (this.isSelected("o_start_of_paragraph")) {
                    [sText, n1] = this.formatText(sText, "start_of_paragraph");
                    this.xParent.getElementById('res_o_start_of_paragraph').textContent = n1;
                }
                if (this.isSelected("o_before_punctuation")) {
                    [sText, n1] = this.formatText(sText, "before_punctuation");
                    this.xParent.getElementById('res_o_before_punctuation').textContent = n1;
                }
                if (this.isSelected("o_within_parenthesis")) {
                    [sText, n1] = this.formatText(sText, "within_parenthesis");
                    this.xParent.getElementById('res_o_within_parenthesis').textContent = n1;
                }
                if (this.isSelected("o_within_square_brackets")) {
                    [sText, n1] = this.formatText(sText, "within_square_brackets");
                    this.xParent.getElementById('res_o_within_square_brackets').textContent = n1;
                }
                if (this.isSelected("o_within_quotation_marks")) {
                    [sText, n1] = this.formatText(sText, "within_quotation_marks");
                    this.xParent.getElementById('res_o_within_quotation_marks').textContent = n1;
                }
                this.setOption("o_group_ssp", false);
                this.switchGroup("o_group_ssp");
            }
            this.xParent.getElementById('grammalecte_tf_progressbar').value = 2;

            // espaces insécables
            if (this.isSelected("o_group_nbsp")) {
                if (this.isSelected("o_nbsp_before_punctuation")) {
                    [sText, n1] = this.formatText(sText, "nbsp_before_punctuation");
                    [sText, n2] = this.formatText(sText, "nbsp_repair");
                    this.xParent.getElementById('res_o_nbsp_before_punctuation').textContent = n1 - n2;
                }
                if (this.isSelected("o_nbsp_within_quotation_marks")) {
                    [sText, n1] = this.formatText(sText, "nbsp_within_quotation_marks");
                    this.xParent.getElementById('res_o_nbsp_within_quotation_marks').textContent = n1;
                }
                if (this.isSelected("o_nbsp_before_symbol")) {
                    [sText, n1] = this.formatText(sText, "nbsp_before_symbol");
                    this.xParent.getElementById('res_o_nbsp_before_symbol').textContent = n1;
                }
                if (this.isSelected("o_nbsp_within_numbers")) {
                    [sText, n1] = this.formatText(sText, "nbsp_within_numbers");
                    this.xParent.getElementById('res_o_nbsp_within_numbers').textContent = n1;
                }
                if (this.isSelected("o_nbsp_before_units")) {
                    [sText, n1] = this.formatText(sText, "nbsp_before_units");
                    this.xParent.getElementById('res_o_nbsp_before_units').textContent = n1;
                }
                if (this.isSelected("o_nbsp_titles")) {
                    [sText, n1] = this.formatText(sText, "nbsp_titles");
                    this.xParent.getElementById('res_o_nbsp_titles').textContent = n1;
                }
                this.setOption("o_group_nbsp", false);
                this.switchGroup("o_group_nbsp");
            }
            this.xParent.getElementById('grammalecte_tf_progressbar').value = 3;

            // espaces manquants
            if (this.isSelected("o_group_typo")) {
                if (this.isSelected("o_ts_units")) {
                    [sText, n1] = this.formatText(sText, "ts_units");
                    this.xParent.getElementById('res_o_ts_units').textContent = n1;
                }
            }
            if (this.isSelected("o_group_space")) {
                if (this.isSelected("o_add_space_after_punctuation")) {
                    [sText, n1] = this.formatText(sText, "add_space_after_punctuation");
                    [sText, n2] = this.formatText(sText, "add_space_repair");
                    this.xParent.getElementById('res_o_add_space_after_punctuation').textContent = n1 - n2;
                }
                if (this.isSelected("o_add_space_around_hyphens")) {
                    [sText, n1] = this.formatText(sText, "add_space_around_hyphens");
                    this.xParent.getElementById('res_o_add_space_around_hyphens').textContent = n1;
                }
                this.setOption("o_group_space", false);
                this.switchGroup("o_group_space");
            }
            this.xParent.getElementById('grammalecte_tf_progressbar').value = 4;

            // suppression
            if (this.isSelected("o_group_delete")) {
                if (this.isSelected("o_erase_non_breaking_hyphens")) {
                    [sText, n1] = this.formatText(sText, "erase_non_breaking_hyphens");
                    this.xParent.getElementById('res_o_erase_non_breaking_hyphens').textContent = n1;
                }
                this.setOption("o_group_delete", false);
                this.switchGroup("o_group_delete");
            }
            this.xParent.getElementById('grammalecte_tf_progressbar').value = 5;

            // signes typographiques
            if (this.isSelected("o_group_typo")) {
                if (this.isSelected("o_ts_apostrophe")) {
                    [sText, n1] = this.formatText(sText, "ts_apostrophe");
                    this.xParent.getElementById('res_o_ts_apostrophe').textContent = n1;
                }
                if (this.isSelected("o_ts_ellipsis")) {
                    [sText, n1] = this.formatText(sText, "ts_ellipsis");
                    this.xParent.getElementById('res_o_ts_ellipsis').textContent = n1;
                }
                if (this.isSelected("o_ts_dash_start")) {
                    if (this.isSelected("o_ts_m_dash_start")) {
                        [sText, n1] = this.formatText(sText, "ts_m_dash_start");
                    } else {
                        [sText, n1] = this.formatText(sText, "ts_n_dash_start");
                    }
                    this.xParent.getElementById('res_o_ts_dash_start').textContent = n1;
                }
                if (this.isSelected("o_ts_dash_middle")) {
                    if (this.isSelected("o_ts_m_dash_middle")) {
                        [sText, n1] = this.formatText(sText, "ts_m_dash_middle");
                    } else {
                        [sText, n1] = this.formatText(sText, "ts_n_dash_middle");
                    }
                    this.xParent.getElementById('res_o_ts_dash_middle').textContent = n1;
                }
                if (this.isSelected("o_ts_quotation_marks")) {
                    [sText, n1] = this.formatText(sText, "ts_quotation_marks");
                    this.xParent.getElementById('res_o_ts_quotation_marks').textContent = n1;
                }
                if (this.isSelected("o_ts_spell")) {
                    [sText, n1] = this.formatText(sText, "ts_spell");
                    this.xParent.getElementById('res_o_ts_spell').textContent = n1;
                }
                if (this.isSelected("o_ts_ligature")) {
                    // ligatures typographiques : fi, fl, ff, ffi, ffl, ft, st
                    if (this.isSelected("o_ts_ligature_do")) {
                        if (this.isSelected("o_ts_ligature_ffi")) {
                            [sText, n1] = this.formatText(sText, "ts_ligature_ffi_do");
                        }
                        if (this.isSelected("o_ts_ligature_ffl")) {
                            [sText, n2] = this.formatText(sText, "ts_ligature_ffl_do");
                        }
                        if (this.isSelected("o_ts_ligature_fi")) {
                            [sText, n3] = this.formatText(sText, "ts_ligature_fi_do");
                        }
                        if (this.isSelected("o_ts_ligature_fl")) {
                            [sText, n4] = this.formatText(sText, "ts_ligature_fl_do");
                        }
                        if (this.isSelected("o_ts_ligature_ff")) {
                            [sText, n5] = this.formatText(sText, "ts_ligature_ff_do");
                        }
                        if (this.isSelected("o_ts_ligature_ft")) {
                            [sText, n6] = this.formatText(sText, "ts_ligature_ft_do");
                        }
                        if (this.isSelected("o_ts_ligature_st")) {
                            [sText, n7] = this.formatText(sText, "ts_ligature_st_do");
                        }
                    }
                    if (this.isSelected("o_ts_ligature_undo")) {
                        if (this.isSelected("o_ts_ligature_ffi")) {
                            [sText, n1] = this.formatText(sText, "ts_ligature_ffi_undo");
                        }
                        if (this.isSelected("o_ts_ligature_ffl")) {
                            [sText, n2] = this.formatText(sText, "ts_ligature_ffl_undo");
                        }
                        if (this.isSelected("o_ts_ligature_fi")) {
                            [sText, n3] = this.formatText(sText, "ts_ligature_fi_undo");
                        }
                        if (this.isSelected("o_ts_ligature_fl")) {
                            [sText, n4] = this.formatText(sText, "ts_ligature_fl_undo");
                        }
                        if (this.isSelected("o_ts_ligature_ff")) {
                            [sText, n5] = this.formatText(sText, "ts_ligature_ff_undo");
                        }
                        if (this.isSelected("o_ts_ligature_ft")) {
                            [sText, n6] = this.formatText(sText, "ts_ligature_ft_undo");
                        }
                        if (this.isSelected("o_ts_ligature_st")) {
                            [sText, n7] = this.formatText(sText, "ts_ligature_st_undo");
                        }
                    }
                    this.xParent.getElementById('res_o_ts_ligature').textContent = n1 + n2 + n3 + n4 + n5 + n6 + n7;
                }
                this.setOption("o_group_typo", false);
                this.switchGroup("o_group_typo");
            }
            this.xParent.getElementById('grammalecte_tf_progressbar').value = 6;

            // divers
            if (this.isSelected("o_group_misc")) {
                if (this.isSelected("o_ordinals_no_exponant")) {
                    if (this.isSelected("o_ordinals_exponant")) {
                        [sText, n1] = this.formatText(sText, "ordinals_exponant");
                    } else {
                        [sText, n1] = this.formatText(sText, "ordinals_no_exponant");
                    }
                    this.xParent.getElementById('res_o_ordinals_no_exponant').textContent = n1;
                }
                if (this.isSelected("o_etc")) {
                    [sText, n1] = this.formatText(sText, "etc");
                    this.xParent.getElementById('res_o_etc').textContent = n1;
                }
                if (this.isSelected("o_missing_hyphens")) {
                    [sText, n1] = this.formatText(sText, "missing_hyphens");
                    this.xParent.getElementById('res_o_missing_hyphens').textContent = n1;
                }
                if (this.isSelected("o_ma_word")) {
                    [sText, n1] = this.formatText(sText, "ma_word");
                    if (this.isSelected("o_ma_1letter_lowercase")) {
                        [sText, n1] = this.formatText(sText, "ma_1letter_lowercase");
                        if (this.isSelected("o_ma_1letter_uppercase")) {
                            [sText, n1] = this.formatText(sText, "ma_1letter_uppercase");
                        }
                    }
                    this.xParent.getElementById('res_o_ma_word').textContent = n1;
                }
                this.setOption("o_group_misc", false);
                this.switchGroup("o_group_misc");
            }
            this.xParent.getElementById('grammalecte_tf_progressbar').value = this.xParent.getElementById('grammalecte_tf_progressbar').max;
            // end of processing

            //window.setCursor("auto"); // restore pointer

            const t1 = Date.now();
            this.xParent.getElementById('grammalecte_tf_time_res').textContent = this.getTimeRes((t1-t0)/1000);
            oGrammalecte.oGCPanel.oTextControl.loadText(sText);
            this.bTextChanged = true;
        }
        catch (e) {
            showError(e);
        }
    }

    getTimeRes (n) {
        // returns duration in seconds as string
        if (n < 10) {
            return n.toFixed(3).toString() + " s";
        }
        if (n < 100) {
            return n.toFixed(2).toString() + " s";
        }
        if (n < 1000) {
            return n.toFixed(1).toString() + " s";
        }
        return n.toFixed().toString() + " s";
    }
}
