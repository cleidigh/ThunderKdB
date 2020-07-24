// Javascript

"use strict";

/*
    No way to import HTML in content scripts.
    Waiting for: https://bugzilla.mozilla.org/show_bug.cgi?id=1364404

    @Reviewers:
    This file only defines HTML nodes in const values
*/


const sGrammalecteConjugueurHTML = `
    <div class="centered_bar">
        <div contenteditable="true" id="grammalecte_conj_verb" autofocus >entrez un verbe</div>
        <div id="grammalecte_conj_button">Conjuguer</div>
    </div>

    <div class="grammalecte_clearer"></div>

    <h1 class="grammalecte_conj_title" id="grammalecte_conj_verb_title" class="center">&nbsp;</h1>
    <div id="grammalecte_conj_verb_info" class="center">&nbsp;</div>

    <div id="grammalecte_conj_options">
        <div id="grammalecte_conj_oneg" class="grammalecte_conj_option_off" data-selected="off">Négation</div>
        · <div id="grammalecte_conj_oint" class="grammalecte_conj_option_off" data-selected="off">Interrogatif</div>
        · <div id="grammalecte_conj_ofem" class="grammalecte_conj_option_off" data-selected="off">Féminin</div>
        <br/>
        <div id="grammalecte_conj_opro" class="grammalecte_conj_option_off" data-selected="off">Pronominal</div>
        · <div id="grammalecte_conj_otco" class="grammalecte_conj_option_off" data-selected="off">Temps composés</div>
    </div>
    <div id="grammalecte_conj_note">❦</div>

    <!-- section 1 -->
    <div class="grammalecte_conj_container">
        <div class="grammalecte_conj_column">
            <div id="infinitif">
                <h2 class="grammalecte_conj_title" id="infinitif_title">Infinitif</h2>
                <div id="grammalecte_conj_infi">&nbsp;</div>
            </div>
            <div id="imperatif">
                <h2 class="grammalecte_conj_title" id="imperatif_title">Impératif</h2>
                <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_impe">Présent</h3>
                <div id="grammalecte_conj_impe1">&nbsp;</div>
                <div id="grammalecte_conj_impe2">&nbsp;</div>
                <div id="grammalecte_conj_impe3">&nbsp;</div>
            </div>
        </div>

        <div class="grammalecte_conj_column">
            <div id="partpre">
                <h2 class="grammalecte_conj_title" id="partpre_title">Participe présent</h2>
                <div id="grammalecte_conj_ppre">&nbsp;</div>
            </div>
            <div id="partpas">
                <h2 class="grammalecte_conj_title" id="partpas_title">Participes passés</h2>
                <div id="grammalecte_conj_ppas1">&nbsp;</div>
                <div id="grammalecte_conj_ppas2">&nbsp;</div>
                <div id="grammalecte_conj_ppas3">&nbsp;</div>
                <div id="grammalecte_conj_ppas4">&nbsp;</div>
            </div>
        </div>
    </div>

    <div class="grammalecte_clearer"></div>

    <!-- section 2 -->
    <div class="grammalecte_conj_container">
        <div class="grammalecte_conj_column">
            <div id="grammalecte_conj_indicatif">
                <h2 class="grammalecte_conj_title" id="grammalecte_conj_indicatif_title">Indicatif</h2>
                <div id="grammalecte_conj_ipre">
                    <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_ipre">Présent</h3>
                    <div id="grammalecte_conj_ipre1">&nbsp;</div>
                    <div id="grammalecte_conj_ipre2">&nbsp;</div>
                    <div id="grammalecte_conj_ipre3">&nbsp;</div>
                    <div id="grammalecte_conj_ipre4">&nbsp;</div>
                    <div id="grammalecte_conj_ipre5">&nbsp;</div>
                    <div id="grammalecte_conj_ipre6">&nbsp;</div>
                </div>
                <div id="grammalecte_conj_iimp">
                    <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_iimp">Imparfait</h3>
                    <div id="grammalecte_conj_iimp1">&nbsp;</div>
                    <div id="grammalecte_conj_iimp2">&nbsp;</div>
                    <div id="grammalecte_conj_iimp3">&nbsp;</div>
                    <div id="grammalecte_conj_iimp4">&nbsp;</div>
                    <div id="grammalecte_conj_iimp5">&nbsp;</div>
                    <div id="grammalecte_conj_iimp6">&nbsp;</div>
                </div>
                <div id="grammalecte_conj_ipsi">
                    <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_ipsi">Passé simple</h3>
                    <div id="grammalecte_conj_ipsi1">&nbsp;</div>
                    <div id="grammalecte_conj_ipsi2">&nbsp;</div>
                    <div id="grammalecte_conj_ipsi3">&nbsp;</div>
                    <div id="grammalecte_conj_ipsi4">&nbsp;</div>
                    <div id="grammalecte_conj_ipsi5">&nbsp;</div>
                    <div id="grammalecte_conj_ipsi6">&nbsp;</div>
                </div>
                <div id="grammalecte_conj_ifut">
                    <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_ifut">Futur</h3>
                    <div id="grammalecte_conj_ifut1">&nbsp;</div>
                    <div id="grammalecte_conj_ifut2">&nbsp;</div>
                    <div id="grammalecte_conj_ifut3">&nbsp;</div>
                    <div id="grammalecte_conj_ifut4">&nbsp;</div>
                    <div id="grammalecte_conj_ifut5">&nbsp;</div>
                    <div id="grammalecte_conj_ifut6">&nbsp;</div>
                </div>
            </div>
        </div>

        <div class="grammalecte_conj_column">
            <div id="grammalecte_conj_subjonctif">
                <h2 class="grammalecte_conj_title" id="grammalecte_conj_subjontif_title">Subjonctif</h2>
                <div id="grammalecte_conj_spre">
                    <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_spre">Présent</h3>
                    <div id="grammalecte_conj_spre1">&nbsp;</div>
                    <div id="grammalecte_conj_spre2">&nbsp;</div>
                    <div id="grammalecte_conj_spre3">&nbsp;</div>
                    <div id="grammalecte_conj_spre4">&nbsp;</div>
                    <div id="grammalecte_conj_spre5">&nbsp;</div>
                    <div id="grammalecte_conj_spre6">&nbsp;</div>
                </div>
                <div id="grammalecte_conj_simp">
                    <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_simp">Imparfait</h3>
                    <div id="grammalecte_conj_simp1">&nbsp;</div>
                    <div id="grammalecte_conj_simp2">&nbsp;</div>
                    <div id="grammalecte_conj_simp3">&nbsp;</div>
                    <div id="grammalecte_conj_simp4">&nbsp;</div>
                    <div id="grammalecte_conj_simp5">&nbsp;</div>
                    <div id="grammalecte_conj_simp6">&nbsp;</div>
                </div>
            </div>
            <div id="grammalecte_conj_conditionnel">
                <h2 class="grammalecte_conj_title" id="grammalecte_conj_conditionnel_title">Conditionnel</h2>
                <div id="grammalecte_conj_conda">
                    <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_conda">Présent</h3>
                    <div id="grammalecte_conj_conda1">&nbsp;</div>
                    <div id="grammalecte_conj_conda2">&nbsp;</div>
                    <div id="grammalecte_conj_conda3">&nbsp;</div>
                    <div id="grammalecte_conj_conda4">&nbsp;</div>
                    <div id="grammalecte_conj_conda5">&nbsp;</div>
                    <div id="grammalecte_conj_conda6">&nbsp;</div>
                </div>
                <div id="grammalecte_conj_condb">
                    <h3 class="grammalecte_conj_title" id="grammalecte_conj_t_condb">&nbsp;</h3>
                    <div id="grammalecte_conj_condb1">&nbsp;</div>
                    <div id="grammalecte_conj_condb2">&nbsp;</div>
                    <div id="grammalecte_conj_condb3">&nbsp;</div>
                    <div id="grammalecte_conj_condb4">&nbsp;</div>
                    <div id="grammalecte_conj_condb5">&nbsp;</div>
                    <div id="grammalecte_conj_condb6">&nbsp;</div>
                </div>
            </div>
        </div>
    </div>

    <div class="grammalecte_clearer"></div>
`;


