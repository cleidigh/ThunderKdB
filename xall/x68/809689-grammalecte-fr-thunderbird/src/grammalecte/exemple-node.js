// JavaScript

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global require, console */

"use strict";

//console.log('\x1B[2J\x1B[0f'); //Clear the console (cmd win)

var oGrammalecte = require('./fr/gc_engine.js');

oGrammalecte.load();

var sPhrase = 'Le silences s’amasses Étoile brillantesss';
console.log('\x1b[36m%s \x1b[32m%s\x1b[0m', 'Test de vérification de:', sPhrase);
console.log( oGrammalecte.parse(sPhrase) );

var sWord = 'toutt';
console.log('\x1b[36m%s \x1b[32m%s\x1b[0m', 'Test de suggestion:', sWord);
var oSpellCheckGramma = oGrammalecte.getSpellChecker();
console.log( Array.from( oSpellCheckGramma.suggest(sWord) ) );
