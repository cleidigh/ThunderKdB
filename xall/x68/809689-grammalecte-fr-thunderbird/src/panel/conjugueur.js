// JavaScript

let oVerb = null;

// button
document.getElementById('conjugate').addEventListener("click", function (event) {
    createVerbAndConjugate(document.getElementById('verb').value);
});

// text field
document.getElementById('verb').addEventListener("change", function (event) {
    createVerbAndConjugate(document.getElementById('verb').value);
});

// options
document.getElementById('oneg').addEventListener("click", function (event) {
    _displayResults();
});
document.getElementById('opro').addEventListener("click", function (event) {
    _displayResults();
});
document.getElementById('oint').addEventListener("click", function (event) {
    _displayResults();
});
document.getElementById('ofem').addEventListener("click", function (event) {
    _displayResults();
});
document.getElementById('otco').addEventListener("click", function (event) {
    _displayResults();
});

function createVerbAndConjugate (sVerb) {
    try {
        document.getElementById('oneg').checked = false;
        document.getElementById('opro').checked = false;
        document.getElementById('oint').checked = false;
        document.getElementById('otco').checked = false;
        document.getElementById('ofem').checked = false;

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
                oVerb = new Verb(sVerb);
                document.getElementById('info').textContent = oVerb.sInfo;
                document.getElementById('opro').textContent = oVerb.sProLabel;
                if (oVerb.bUncomplete) {
                    document.getElementById('opro').checked = false;
                    document.getElementById('opro').disabled = true;
                    document.getElementById('opro_lbl').style = "color: #CCC;";
                    document.getElementById('otco').checked = false;
                    document.getElementById('otco').disabled = true;
                    document.getElementById('otco_lbl').style = "color: #CCC;";
                    document.getElementById('smallnote').textContent = "Ce verbe n’a pas encore été vérifié. C’est pourquoi les options “pronominal” et “temps composés” sont désactivées.";
                } else {
                    document.getElementById('otco').disabled = false;
                    document.getElementById('otco_lbl').style = "color: #000;";
                    if (oVerb.nPronominable == 0) {
                        document.getElementById('opro').disabled = false;
                        document.getElementById('opro_lbl').style = "color: #000;";
                    } else if (oVerb.nPronominable == 1) {
                        document.getElementById('opro').checked = true;
                        document.getElementById('opro').disabled = true;
                        document.getElementById('opro_lbl').style = "color: #CCC;";
                    } else { // -1 or 1 or error
                        document.getElementById('opro').checked = false;
                        document.getElementById('opro').disabled = true;
                        document.getElementById('opro_lbl').style = "color: #CCC;";
                    }
                    document.getElementById('smallnote').textContent = "❦";
                }
                _displayResults();
            }
        }
    }
    catch (e) {
        console.error(e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
    }
}

function _displayResults () {
    if (oVerb === null) {
        return;
    }
    try {
        let bPro = document.getElementById('opro').checked;
        let bNeg = document.getElementById('oneg').checked;
        let bTCo = document.getElementById('otco').checked;
        let bInt = document.getElementById('oint').checked;
        let bFem = document.getElementById('ofem').checked;
        let oConjTable = oVerb.createConjTable(bPro, bNeg, bTCo, bInt, bFem);
        document.getElementById('verb').Text = "";
        // infinitif
        document.getElementById('infi').textContent = oConjTable["infi"] || " "; // something or nbsp
        // participe présent
        document.getElementById('ppre').textContent = oConjTable["ppre"] || " ";
        // participes passés
        document.getElementById('ppas1').textContent = oConjTable["ppas1"] || " ";
        document.getElementById('ppas2').textContent = oConjTable["ppas2"] || " ";
        document.getElementById('ppas3').textContent = oConjTable["ppas3"] || " ";
        document.getElementById('ppas4').textContent = oConjTable["ppas4"] || " ";
        // impératif
        document.getElementById('impe_temps').textContent = oConjTable["t_impe"] || " ";
        document.getElementById('impe1').textContent = oConjTable["impe1"] || " ";
        document.getElementById('impe2').textContent = oConjTable["impe2"] || " ";
        document.getElementById('impe3').textContent = oConjTable["impe3"] || " ";
        // présent
        document.getElementById('ipre_temps').textContent = oConjTable["t_ipre"] || " ";
        document.getElementById('ipre1').textContent = oConjTable["ipre1"] || " ";
        document.getElementById('ipre2').textContent = oConjTable["ipre2"] || " ";
        document.getElementById('ipre3').textContent = oConjTable["ipre3"] || " ";
        document.getElementById('ipre4').textContent = oConjTable["ipre4"] || " ";
        document.getElementById('ipre5').textContent = oConjTable["ipre5"] || " ";
        document.getElementById('ipre6').textContent = oConjTable["ipre6"] || " ";
        // imparfait
        document.getElementById('iimp_temps').textContent = oConjTable["t_iimp"] || " ";
        document.getElementById('iimp1').textContent = oConjTable["iimp1"] || " ";
        document.getElementById('iimp2').textContent = oConjTable["iimp2"] || " ";
        document.getElementById('iimp3').textContent = oConjTable["iimp3"] || " ";
        document.getElementById('iimp4').textContent = oConjTable["iimp4"] || " ";
        document.getElementById('iimp5').textContent = oConjTable["iimp5"] || " ";
        document.getElementById('iimp6').textContent = oConjTable["iimp6"] || " ";
        // passé simple
        document.getElementById('ipsi_temps').textContent = oConjTable["t_ipsi"] || " ";
        document.getElementById('ipsi1').textContent = oConjTable["ipsi1"] || " ";
        document.getElementById('ipsi2').textContent = oConjTable["ipsi2"] || " ";
        document.getElementById('ipsi3').textContent = oConjTable["ipsi3"] || " ";
        document.getElementById('ipsi4').textContent = oConjTable["ipsi4"] || " ";
        document.getElementById('ipsi5').textContent = oConjTable["ipsi5"] || " ";
        document.getElementById('ipsi6').textContent = oConjTable["ipsi6"] || " ";
        // futur
        document.getElementById('ifut_temps').textContent = oConjTable["t_ifut"] || " ";
        document.getElementById('ifut1').textContent = oConjTable["ifut1"] || " ";
        document.getElementById('ifut2').textContent = oConjTable["ifut2"] || " ";
        document.getElementById('ifut3').textContent = oConjTable["ifut3"] || " ";
        document.getElementById('ifut4').textContent = oConjTable["ifut4"] || " ";
        document.getElementById('ifut5').textContent = oConjTable["ifut5"] || " ";
        document.getElementById('ifut6').textContent = oConjTable["ifut6"] || " ";
        // Conditionnel
        document.getElementById('conda_temps').textContent = oConjTable["t_conda"] || " ";
        document.getElementById('conda1').textContent = oConjTable["conda1"] || " ";
        document.getElementById('conda2').textContent = oConjTable["conda2"] || " ";
        document.getElementById('conda3').textContent = oConjTable["conda3"] || " ";
        document.getElementById('conda4').textContent = oConjTable["conda4"] || " ";
        document.getElementById('conda5').textContent = oConjTable["conda5"] || " ";
        document.getElementById('conda6').textContent = oConjTable["conda6"] || " ";
        document.getElementById('condb_temps').textContent = oConjTable["t_condb"] || " ";
        document.getElementById('condb1').textContent = oConjTable["condb1"] || " ";
        document.getElementById('condb2').textContent = oConjTable["condb2"] || " ";
        document.getElementById('condb3').textContent = oConjTable["condb3"] || " ";
        document.getElementById('condb4').textContent = oConjTable["condb4"] || " ";
        document.getElementById('condb5').textContent = oConjTable["condb5"] || " ";
        document.getElementById('condb6').textContent = oConjTable["condb6"] || " ";
        // subjonctif présent
        document.getElementById('spre_temps').textContent = oConjTable["t_spre"] || " ";
        document.getElementById('spre1').textContent = oConjTable["spre1"] || " ";
        document.getElementById('spre2').textContent = oConjTable["spre2"] || " ";
        document.getElementById('spre3').textContent = oConjTable["spre3"] || " ";
        document.getElementById('spre4').textContent = oConjTable["spre4"] || " ";
        document.getElementById('spre5').textContent = oConjTable["spre5"] || " ";
        document.getElementById('spre6').textContent = oConjTable["spre6"] || " ";
        // subjonctif imparfait
        document.getElementById('simp_temps').textContent = oConjTable["t_simp"] || " ";
        document.getElementById('simp1').textContent = oConjTable["simp1"] || " ";
        document.getElementById('simp2').textContent = oConjTable["simp2"] || " ";
        document.getElementById('simp3').textContent = oConjTable["simp3"] || " ";
        document.getElementById('simp4').textContent = oConjTable["simp4"] || " ";
        document.getElementById('simp5').textContent = oConjTable["simp5"] || " ";
        document.getElementById('simp6').textContent = oConjTable["simp6"] || " ";
    }
    catch (e) {
        console.error(e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
    }
}

createVerbAndConjugate("être");

document.getElementById("verb").focus();
