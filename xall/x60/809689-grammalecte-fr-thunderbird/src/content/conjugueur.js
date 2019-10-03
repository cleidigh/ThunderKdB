// JavaScript

//const Cu = Components.utils;
//const { require } = Cu.import("resource://gre/modules/commonjs/toolkit/require.js", {});
//const conj = require("resource://grammalecte/fr/conj.js");


let oConj = {
    init: function () {
        console.log("Init conjugueur");
        try {
            // button
            document.getElementById('conjugate').addEventListener("click", (xEvent) => {
                this.getVerbAndConjugate();
            });
            // text field
            document.getElementById('verb').addEventListener("change", (xEvent) => {
                this.getVerbAndConjugate();
            });
            // options
            document.getElementById('oneg').addEventListener("click", (xEvent) => {
                this._displayResults();
            });
            document.getElementById('opro').addEventListener("click", (xEvent) => {
                this._displayResults();
            });
            document.getElementById('oint').addEventListener("click", (xEvent) => {
                this._displayResults();
            });
            document.getElementById('ofem').addEventListener("click", (xEvent) => {
                this._displayResults();
            });
            document.getElementById('otco').addEventListener("click", (xEvent) => {
                this._displayResults();
            });
        }
        catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
        this.conjugate("être");
    },

    oVerb: null,

    getVerbAndConjugate: function () {
        this.conjugate(document.getElementById('verb').value);
    },

    conjugate: function (sVerb) {
        try {
            document.getElementById('oneg').checked = false;
            document.getElementById('opro').checked = false;
            document.getElementById('oint').checked = false;
            document.getElementById('otco').checked = false;
            document.getElementById('ofem').checked = false;
            document.getElementById('smallnote').hidden = true;

            // request analyzing
            sVerb = sVerb.trim().toLowerCase().replace(/’/g, "'").replace(/  +/g, " ");
            if (sVerb) {
                if (sVerb.startsWith("ne pas ")) {
                    document.getElementById('oneg').checked = true;
                    sVerb = sVerb.slice(7);
                }
                if (sVerb.startsWith("se ")) {
                    document.getElementById('opro').checked = true;
                    sVerb = sVerb.slice(3);
                } else if (sVerb.startsWith("s'")) {
                    document.getElementById('opro').checked = true;
                    sVerb = sVerb.slice(2);
                }
                if (sVerb.endsWith("?")) {
                    document.getElementById('oint').checked = true;
                    sVerb = sVerb.slice(0,-1).trim();
                }

                if (!conj.isVerb(sVerb)) {
                    document.getElementById('verb').style = "color: #BB4411;";
                } else {
                    document.getElementById('verb_title').textContent = sVerb;
                    document.getElementById('verb').style = "color: #999999;";
                    document.getElementById('verb').value = "";
                    this.oVerb = new Verb(sVerb);
                    let sRawInfo = this.oVerb._sRawInfo;
                    document.getElementById('info').textContent = this.oVerb.sInfo;
                    document.getElementById('opro').textContent = "pronominal";
                    if (sRawInfo.endsWith("zz")) {
                        document.getElementById('opro').checked = false;
                        document.getElementById('opro').disabled = true;
                        document.getElementById('opro').style = "color: #CCC;";
                        document.getElementById('otco').checked = false;
                        document.getElementById('otco').disabled = true;
                        document.getElementById('otco').style = "color: #CCC;";
                        document.getElementById('smallnote').hidden = false;
                    } else {
                        if (sRawInfo[5] == "_") {
                            document.getElementById('opro').checked = false;
                            document.getElementById('opro').disabled = true;
                            document.getElementById('opro').style = "color: #CCC;";
                        } else if (["q", "u", "v", "e"].includes(sRawInfo[5])) {
                            document.getElementById('opro').checked = false;
                            document.getElementById('opro').disabled = false;
                            document.getElementById('opro').style = "color: #000;";
                        } else if (sRawInfo[5] == "p" || sRawInfo[5] == "r") {
                            document.getElementById('opro').checked = true;
                            document.getElementById('opro').disabled = true;
                            document.getElementById('opro').style = "color: #CCC;";
                        } else if (sRawInfo[5] == "x") {
                            document.getElementById('opro').textContent = "cas particuliers";
                            document.getElementById('opro').checked = false;
                            document.getElementById('opro').disabled = true;
                            document.getElementById('opro').style = "color: #CCC;";
                        } else {
                            document.getElementById('opro').textContent = "# erreur #";
                            document.getElementById('opro').checked = false;
                            document.getElementById('opro').disabled = true;
                            document.getElementById('opro').style = "color: #CCC;";
                        }
                        document.getElementById('otco').disabled = false;
                        document.getElementById('otco').style = "color: #000;";
                    }
                    this._displayResults();
                }
            }
        }
        catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    },

    _displayResults: function () {
        if (this.oVerb === null) {
            return;
        }
        try {
            let opro = document.getElementById('opro').checked;
            let oneg = document.getElementById('oneg').checked;
            let otco = document.getElementById('otco').checked;
            let oint = document.getElementById('oint').checked;
            let ofem = document.getElementById('ofem').checked;
            // titles
            this._setTitles();
            // participes passés
            document.getElementById('ppas1').textContent = this.oVerb.participePasse(":Q1") || " "; // something or nbsp
            document.getElementById('ppas2').textContent = this.oVerb.participePasse(":Q2") || " ";
            document.getElementById('ppas3').textContent = this.oVerb.participePasse(":Q3") || " ";
            document.getElementById('ppas4').textContent = this.oVerb.participePasse(":Q4") || " ";
            // infinitif
            document.getElementById('infi').textContent = this.oVerb.infinitif(opro, oneg, otco, oint, ofem);
            // participe présent
            document.getElementById('ppre').textContent = this.oVerb.participePresent(opro, oneg, otco, oint, ofem) || " ";
            // conjugaisons
            document.getElementById('ipre1').textContent = this.oVerb.conjugue(":Ip", ":1s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipre2').textContent = this.oVerb.conjugue(":Ip", ":2s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipre3').textContent = this.oVerb.conjugue(":Ip", ":3s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipre4').textContent = this.oVerb.conjugue(":Ip", ":1p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipre5').textContent = this.oVerb.conjugue(":Ip", ":2p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipre6').textContent = this.oVerb.conjugue(":Ip", ":3p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('iimp1').textContent = this.oVerb.conjugue(":Iq", ":1s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('iimp2').textContent = this.oVerb.conjugue(":Iq", ":2s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('iimp3').textContent = this.oVerb.conjugue(":Iq", ":3s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('iimp4').textContent = this.oVerb.conjugue(":Iq", ":1p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('iimp5').textContent = this.oVerb.conjugue(":Iq", ":2p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('iimp6').textContent = this.oVerb.conjugue(":Iq", ":3p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipsi1').textContent = this.oVerb.conjugue(":Is", ":1s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipsi2').textContent = this.oVerb.conjugue(":Is", ":2s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipsi3').textContent = this.oVerb.conjugue(":Is", ":3s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipsi4').textContent = this.oVerb.conjugue(":Is", ":1p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipsi5').textContent = this.oVerb.conjugue(":Is", ":2p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ipsi6').textContent = this.oVerb.conjugue(":Is", ":3p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ifut1').textContent = this.oVerb.conjugue(":If", ":1s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ifut2').textContent = this.oVerb.conjugue(":If", ":2s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ifut3').textContent = this.oVerb.conjugue(":If", ":3s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ifut4').textContent = this.oVerb.conjugue(":If", ":1p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ifut5').textContent = this.oVerb.conjugue(":If", ":2p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('ifut6').textContent = this.oVerb.conjugue(":If", ":3p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('conda1').textContent = this.oVerb.conjugue(":K", ":1s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('conda2').textContent = this.oVerb.conjugue(":K", ":2s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('conda3').textContent = this.oVerb.conjugue(":K", ":3s", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('conda4').textContent = this.oVerb.conjugue(":K", ":1p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('conda5').textContent = this.oVerb.conjugue(":K", ":2p", opro, oneg, otco, oint, ofem) || " ";
            document.getElementById('conda6').textContent = this.oVerb.conjugue(":K", ":3p", opro, oneg, otco, oint, ofem) || " ";
            if (!oint) {
                document.getElementById('spre1').textContent = this.oVerb.conjugue(":Sp", ":1s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('spre2').textContent = this.oVerb.conjugue(":Sp", ":2s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('spre3').textContent = this.oVerb.conjugue(":Sp", ":3s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('spre4').textContent = this.oVerb.conjugue(":Sp", ":1p", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('spre5').textContent = this.oVerb.conjugue(":Sp", ":2p", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('spre6').textContent = this.oVerb.conjugue(":Sp", ":3p", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('simp1').textContent = this.oVerb.conjugue(":Sq", ":1s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('simp2').textContent = this.oVerb.conjugue(":Sq", ":2s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('simp3').textContent = this.oVerb.conjugue(":Sq", ":3s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('simp4').textContent = this.oVerb.conjugue(":Sq", ":1p", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('simp5').textContent = this.oVerb.conjugue(":Sq", ":2p", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('simp6').textContent = this.oVerb.conjugue(":Sq", ":3p", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('impe1').textContent = this.oVerb.imperatif(":2s", opro, oneg, otco, ofem) || " ";
                document.getElementById('impe2').textContent = this.oVerb.imperatif(":1p", opro, oneg, otco, ofem) || " ";
                document.getElementById('impe3').textContent = this.oVerb.imperatif(":2p", opro, oneg, otco, ofem) || " ";
            } else {
                document.getElementById('spre_temps').textContent = " ";
                document.getElementById('spre1').textContent = " ";
                document.getElementById('spre2').textContent = " ";
                document.getElementById('spre3').textContent = " ";
                document.getElementById('spre4').textContent = " ";
                document.getElementById('spre5').textContent = " ";
                document.getElementById('spre6').textContent = " ";
                document.getElementById('simp_temps').textContent = " ";
                document.getElementById('simp1').textContent = " ";
                document.getElementById('simp2').textContent = " ";
                document.getElementById('simp3').textContent = " ";
                document.getElementById('simp4').textContent = " ";
                document.getElementById('simp5').textContent = " ";
                document.getElementById('simp6').textContent = " ";
                document.getElementById('impe_temps').textContent = " ";
                document.getElementById('impe1').textContent = " ";
                document.getElementById('impe2').textContent = " ";
                document.getElementById('impe3').textContent = " ";
            }
            if (otco) {
                document.getElementById('condb1').textContent = this.oVerb.conjugue(":Sq", ":1s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('condb2').textContent = this.oVerb.conjugue(":Sq", ":2s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('condb3').textContent = this.oVerb.conjugue(":Sq", ":3s", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('condb4').textContent = this.oVerb.conjugue(":Sq", ":1p", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('condb5').textContent = this.oVerb.conjugue(":Sq", ":2p", opro, oneg, otco, oint, ofem) || " ";
                document.getElementById('condb6').textContent = this.oVerb.conjugue(":Sq", ":3p", opro, oneg, otco, oint, ofem) || " ";
            } else {
                document.getElementById('condb1').textContent = " ";
                document.getElementById('condb2').textContent = " ";
                document.getElementById('condb3').textContent = " ";
                document.getElementById('condb4').textContent = " ";
                document.getElementById('condb5').textContent = " ";
                document.getElementById('condb6').textContent = " ";
            }
            document.getElementById('verb').Text = "";
        }
        catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    },

    _setTitles: function () {
        try {
            if (!document.getElementById('otco').checked) {
                document.getElementById('ipre_temps').textContent = "Présent";
                document.getElementById('ifut_temps').textContent = "Futur";
                document.getElementById('iimp_temps').textContent = "Imparfait";
                document.getElementById('ipsi_temps').textContent = "Passé simple";
                document.getElementById('spre_temps').textContent = "Présent";
                document.getElementById('simp_temps').textContent = "Imparfait";
                document.getElementById('conda_temps').textContent = "Présent";
                document.getElementById('condb_temps').textContent = " ";
                document.getElementById('impe_temps').textContent = "Présent";
            } else {
                document.getElementById('ipre_temps').textContent = "Passé composé";
                document.getElementById('ifut_temps').textContent = "Futur antérieur";
                document.getElementById('iimp_temps').textContent = "Plus-que-parfait";
                document.getElementById('ipsi_temps').textContent = "Passé antérieur";
                document.getElementById('spre_temps').textContent = "Passé";
                document.getElementById('simp_temps').textContent = "Plus-que-parfait";
                document.getElementById('conda_temps').textContent = "Passé (1ʳᵉ forme)";
                document.getElementById('condb_temps').textContent = "Passé (2ᵉ forme)";
                document.getElementById('impe_temps').textContent = "Passé";
            }
        }
        catch (e) {
            console.error(e);
            // Cu.reportError(e);
        }
    }
};

conj.init(helpers.loadFile("resource://grammalecte/fr/conj_data.json"));
oConj.init();
