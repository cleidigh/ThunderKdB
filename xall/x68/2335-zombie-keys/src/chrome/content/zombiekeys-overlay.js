 "use strict";
 
/*===============
  Project History
  ===============

  Personnel:
	KB - Kai Bolay owner of the Zombiekeys extension
	AG - Lead Developer and owner of the Zombiekeys Mozdev project



  Version 1.0 - Released: 03/04/2006

	KB First Official Release, compatible with Firefox 1.5.* and Thunderbird 1.5.*


  Version 1.0.1 - Released: 06/11/2006

	KB Marked as compatible with Firefox 2.0


  Version 1.1.3 - Released: 03/05/2007

	KB support Thunderbird 2.0
	KB support SeaMonkey 1.1 / SuiteRunner 1.5a - thanks to Philip Chee
	KB added XBL binding to operate on html::input and derived elements - thanks to Arno Renevier
	KB French localization - thanks to Arno Renevie


  Version 1.1.4 - Released: 08/05/2007

	KB Support Thunderbird 2.0
	KB Support SeaMonkey 1.1 / SuiteRunner 1.5a - thanks to Philip Chee
	KB added XBL binding to operate on chrome://global/content/platformHTMLBindings.xml#inputFields and derived elements - thanks to Arno Renevier and Philip Chee
	KB French localization - thanks to Arno Renevier


  Version 1.3 - Released: 20/10/2010

	bumped compatibility to TB 3.1.*, FX 3.6 (27/06/2010)
	AG Added Postbox 1.1 support
	AG New Addon Icon.


  Version 2.0 - Released: 20/01/2011

	AG Adds compatibility to Firefox 4 and Postbox 2.1.
	AG I also redesigned the icon, and a 64 pixel version for the new detail view in Firefox 4
	AG Added lightning support for new event window


  Version 2.1 - Released: 05/07/2011

	AG Compatibility Update for Fx version 5


  Version 2.5 - Released: 23/09/2011

	AG Bumped up max Compatibility for Thunderbird and Firefox to 6.* to better align with Mozilla's new rapid release cycle
	AG Added Zombiekeys Toolbar button
	AG Added multiple keyboard layout support
	AG Added Configuration dialog
	AG Added Version Check and Debug logging
	AG Added Working jumo to Mozdev support page
	AG Hiding debug output in private browsing mode
	AG Added dynamic layout shortcuts that describe shortcuts accurately depending on selected keyboard layout (locale)
	Known issue: French localization is incomplete

  Version 2.6 - 18/10/2011
	AG Added icelandic thorn and eth characters
	AG Added French Layout
	AG Fixed broken <ctrl>-, + c
	AG Added "circled" letters
	AG Improved display of shortcuts on menu
	AG Improved shortcuts for additional diacritics
	AG added overlay to following XUL windows: Search/Replace, common Dialog (Rename), Password Manager
	AG added overlay to mail specific windows: Message Filter Editor, Edit Task/Event, Identity Settings, Folder Properties,
					Mail Account Setup, Other Account Wizard, SMTP Server Settings, License Code (Postbox), Subscribe
	AG added overlay to browser specific windows: Preferences (Options), All  Histor, All Bookmarks, New Bookmark + Folder Properties
	AG added support for some Add-Ons: Console2, QuickFolders, Save Password Editor, DOM inspector
	AG Support for new Postbox 3 beta
	AG added option to display key mappings in javascript console (not yet localized)
  Known Issues
	In the search box (only), Zombiekey letters are put in the wrong position. So far no idea why?
	On clicking the Zombiekeys toolbar button the first time in a session, there is a noticable delay (3secs)

  Version 2.8
	AG added Italian keyboard layout
	AG added Brazilian locale: Mauro Jose da Silva
	AG added Italian locale: Manlio Fierro
	AG added "display map option"
	AG completed localization for all settings in config dialog
	AG added u~ v~ y~ u* y* w* g_ e, h, l,
	AG Postbox 3.x compatible
	AG added German keyboard layout

  Version 2.9
	AG Added Firefox Scratchpad support
	AG Added smart quotes shortcuts - use the keys 9 and 0 for inserting the quotes.
	AG Added Russian keyboard layout (fully supported only in English Mode)
	AG Added Swedish keyboard layout: thanks to Mikael Hiort af Ornas for collaboration
	AG Added experimental russian keys support (incomplete): thanks to Anton Pinsky for collaboration
	AG also display mapping when waking zombies from menu
	AG tidied console output
	AG raised Tb+Fx minVer to 3.5
	AG removed jar file
	AG added greek letters

  Version 2.9.1
	AG fixed UK and IRL layouts (tilde) and FR (circumflex) as they ignored the altKey due to a typo in the code
	AG bumped maxVer of Fx/Tb to 11.* for Aurora users
	AG Fixed error with empty tabs on update / firstRun
	AG added thunderBrowse support

  Version 2.10
	AG fixed [bug 24735] in Gmail Compose Mail window, which affects Fx10+; also Tb10 Compose window
	AG overwrote global shortcut for Tab Group switching (CTRL+' becomes ALT+') thanks to Kent E. Soule
	AG stability fixes for inserting into nodes that have no selectionStart etc.
	AG fixed faulty duplication of aliveKeys (removes superfluous up event)
	AG added chatZilla support
	AG Russian in kyrillic mode - this is still work in progress

  Version 2.11
	AG resized toolbar icon to 16*16
	AG added tooltip to button
	AG added support of subscript + superscript numbers to underdot/overdot shortcuts
	AG fixed list of characters in overdot menu
	AG added donation menu item
	AG added support for message filters dialog ('find filters' box in QuickFolders)

  Version 2.11.1
	AG bugfix for superscripts 2, 3 and 4 - these are actually unicode exceptions
	AG bumped up compatibility to Fx12 / Tb12

  Version 2.12 - 18/07/2012
	AG fixed a problem with russian keyboard (sha key for o+overdot was double, lowercase be for was missing for m+overdot)
	AG version bump to 15.*
	AG removed some obsolete warnings

  Version 2.13 - 08/11/2012
	AG Added new option to create T and S characters with comma below (instead of cedilla) for Romanian languages
	AG fixed [Bug 25202]  Some keyboard shortcuts broken in UK layout
	AG added support for our SmartTemplate4 extension

  Version 2.14 - 31/01/2013
	AG [Bug 25202] Reopened - Fixed Acute for IRL / UK keyboards.
	AG Fx 20+: support per-tab private browsing mode 
	AG icon size fix for large icon mode (forces 24px)
	AG bumped up compatibility to Seamonkey 2.21, TB+Fx 24.0
	
	Version 2.15 - 13/11/2013
	AG added support for folder rename dialog
	AG addons: enigmail, extension list dumper, get selected mail, quickpasswords (sso change),
	
	Version 2.16 - 23/02/2015
	AG Added c with acute for croatian languages 
	AG Use "o" as shortcut for circled letters
  AG Minor fixes in UK locale 
	AG exposed all data structures for xbl binding, thus avoiding duplication of all Javascript code.
  AG fixed buttonAutoInstall function
	AG Added support for Thunderbird's new Folder Dialog
	
	Version 2.17 - 13/06/2016
	AG [Bug 25979] Toolbar Icon returns after being removed.
	AG [Bug 26199] Add support for ŵ and ŷ
	AG [Bug 25648] CTRL+> and CTRL+< modify font sizes
	AG Norwegian on German keyboard: use CTRL+0 for å
	AG German layout: fixed accelerator key for Grave `
	AG Fixed Zombiekey button in composer for brighttext themes
	
	Version 2.18 - 04/12/2016
	AG Double Accute not working on American keyboards
	AG [Bug 26263] Added Hungarian keyboard layout

	
	Version 2.19 - 13/01/2017
	AG [Bug 26309] Added Spanish locale
	AG Spanish keyboard layout
	AG Added support for Firefox Pale Moon
	AG Ensured Postbox 5.0 Compatibility
	
	Version 2.20 - 07/05/2018
	AG [Bug 26442] Thunderbird 57 doesn't start up with Zombiekeys enabled

	
	Version 2.21 - interlink only - 12/02/2019
	AG Made compatible with Pale Moon and released on https://addons.palemoon.org to make available to alternative XUL platforms
	
	Version 2.21.1 - 08/04/2019
	AG Made install.rdf compatible with Thunderbird 60
	AG Removed donation tab when updating ZombieKeys.
	AG Removed obsolete Addon Manager interface.
	
	Version 2.22 - WIP
	AG make version that is compatible with Thunderbird 68 (wrapped as web extension)
	
	
  === 
	
	 /mail/components/compose/content/messengercompose.xul overlays editorOverlay.xul
   mxr.mozilla.org/comm-central/source/editor/ui/composer/content/editorOverlay.xul#99
	 editorKeys has some bad key definitions for increasing / decreasing fonts that get in the way of the ZK shortcuts
	 mxr.mozilla.org/comm-central/source/editor/ui/composer/content/editorOverlay.xul#103
	
========
	TO DO: Make e10s compatible amd change em:multiprocessCompatible to true
  */

var ZombieKeys = new function() {
	let debugLevel = 0, mAppver = null, mAppName = null,
	    lastAliveKeyDown = null,
	    disableListeners = false;

	// modifiers: [ctrl, shift, alt]
	// make deadKeys accessible from outside (this. instead of var)
	// additional unicode keys from http://www.fileformat.info/info/unicode/
	// ideas for additional diacritics support from http://dry.sailingissues.com/us-international-keyboard-layout.html
	// create a floating panel with a "cheat sheet" which shows the screenshot of the configured locale. best make it resizable.
	var deadKeys= [
				{	"modifiers": {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"id" : 1,
					"keyCode": 192, // Grave "`" US=192
					"mapping": { // latin                 // cyrilic
							 "A": "\u00c0", "a": "\u00e0", "\u0424": "\u00c0", "\u0444": "\u00e0"
							,"E": "\u00c8", "e": "\u00e8", "\u0423": "\u00c8", "\u0443": "\u00e8"
							,"I": "\u00cc", "i": "\u00ec", "\u0428": "\u00cc", "\u0448": "\u00ec"
							,"O": "\u00d2", "o": "\u00f2", "\u0429": "\u00d2", "\u0449": "\u00f2"
							,"U": "\u00d9", "u": "\u00f9", "\u0413": "\u00d9", "\u0433": "\u00f9"
								},
					"menuFake": false},

				{	"modifiers": {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"id": 2,
					"keyCode":  39, // Acute "'"
					"mapping": {
								 "A": "\u00c1", "a": "\u00e1", "\u0424": "\u00c0", "\u0444": "\u00e0"
								,"D": "\u00d0", "d": "\u00f0"
                ,"C": "\u0106", "c": "\u0107"   // croatian
								,"E": "\u00c9", "e": "\u00e9", "\u0423": "\u00c8", "\u0443": "\u00e8"
								,"I": "\u00cd", "i": "\u00ed", "\u0428": "\u00cc", "\u0448": "\u00ec"
								,"O": "\u00d3", "o": "\u00f3", "\u0429": "\u00d2", "\u0449": "\u00f2"
								,"U": "\u00da", "u": "\u00fa", "\u0413": "\u00d9", "\u0433": "\u00f9"
								,"Y": "\u00dd", "y": "\u00fd"
								,"9": "\u2018", "0": "\u2019" //Smart single quotes
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 3,
					"keyCode": 54, // Circumflex "^"
					"mapping": {
								 "A": "\u00c2", "a": "\u00e2", "\u0424": "\u00c2", "\u0444": "\u00e2"
								,"E": "\u00ca", "e": "\u00ea", "\u0423": "\u00ca", "\u0443": "\u00ea"
								,"I": "\u00ce", "i": "\u00ee", "\u0428": "\u00ce", "\u0448": "\u00ee"
								,"O": "\u00d4", "o": "\u00f4", "\u0429": "\u00d4", "\u0449": "\u00f4"
								,"U": "\u00db", "u": "\u00fb", "\u0413": "\u00db", "\u0433": "\u00fb"
								,"W": "\u0174", "w": "\u0175"
								,"Y": "\u0176", "y": "\u0177"
								},
					"menuFake": false},

				// can not user CTRL+SHIFT+# on UK keyboard as it switches tab groups in Fx 5.0
				{	"modifiers":   {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 4,
					"keyCode": 192, // Tilde "~"
					"mapping": {
								 "A": "\u00c3", "a": "\u00e3", "\u0424": "\u00c3", "\u0444": "\u00e3"
								,"E": "\u1ebc", "e": "\u1ebd", "\u0423": "\u1ebc", "\u0443": "\u1ebd"
								,"I": "\u0128", "i": "\u0129", "\u0428": "\u0128", "\u0448": "\u0129"
								,"N": "\u00d1", "n": "\u00f1"
								,"O": "\u00d5", "o": "\u00f5", "\u0429": "\u00d5", "\u0449": "\u00f5"
								,"U": "\u0168", "u": "\u0169", "\u0413": "\u0168", "\u0433": "\u0169"
								,"V": "\u1e7c", "v": "\u1e7d"
								,"Y": "\u1ef8", "y": "\u1ef9"
								},
					"menuFake": false},

				{	"modifiers": {"ctrlKey": true, "shiftKey":	true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 5,
					"keyCode": 59, // Umlaut ":"
					"mapping": {
								 "A": "\u00c4", "a": "\u00e4", "\u0424": "\u00c4", "\u0444": "\u00e4"
								,"E": "\u00cb", "e": "\u00eb", "\u0423": "\u00cb", "\u0443": "\u00eb"
								,"I": "\u00cf", "i": "\u00ef", "\u0428": "\u00cf", "\u0448": "\u00ef"
								,"O": "\u00d6", "o": "\u00f6", "\u0429": "\u00d6", "\u0449": "\u00f6"
								,"U": "\u00dc", "u": "\u00fc", "\u0413": "\u00dc", "\u0433": "\u00fc"
								,"Y": "\u0178", "y": "\u00ff"
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 6,
					"keyCode": 50, // Ring "@"
					"mapping": {
								 "A": "\u00c5", "a": "\u00e5"
								,"U": "\u016e", "u": "\u016f"
								,"y": "\u1e99"
								,"w": "\u1e98"
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 7,
					"keyCode": 55, // AE,OE,Sharp S "&", section sign (paragraph)
					"mapping": { "a": "\u00e6"
								,"A": "\u00c6"
								,"o": "\u0153"
								,"O": "\u0152"
								,"s": "\u00df"
								,"$": "\u00a7"
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"id": 8,
					"keyCode": 191, // Stroke "/"+CTRL
					"mapping": {
								 "O": "\u00d8", "o": "\u00f8"
								,"c": "\u00a2"
								,"d": "\u00f0", "D": "\u00d0" /* eth */
								,"u": "\u00fe", "U": "\u00de" /* thorn */
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 9,
					"keyCode": 190, // Caron (Hacek) ">" - problem: how to type d>z?
					"mapping": {
								 "A": "\u01cd", "a": "\u01ce", "\u0424": "\u01cd", "\u0444": "\u01ce"
								,"C": "\u010c", "c": "\u010d"
								,"D": "\u010e", "d": "\u010f"
								,"E": "\u011a", "e": "\u011B", "\u0423": "\u011a", "\u0443": "\u011B"
								,"G": "\u01e6", "g": "\u01e7"
								,"H": "\u021e", "h": "\u021f"
								,"I": "\u01cf", "i": "\u01d0", "\u0428": "\u01cf", "\u0448": "\u01d0"
								,"j": "\u01f0"
								,"K": "\u01e8", "k": "\u01e9"
								,"L": "\u013d", "l": "\u013e"
								,"N": "\u0147", "n": "\u0148"
								,"O": "\u01d1", "o": "\u01d2", "\u0429": "\u01d0", "\u0449": "\u01d2"
								,"R": "\u0158", "r": "\u0159"
								,"S": "\u0160", "s": "\u0161"
								,"T": "\u0164", "t": "\u0165"
								,"U": "\u01d3", "u": "\u01d4", "\u0413": "\u01d3", "\u0433": "\u01d4"
								,"Z": "\u017d", "z": "\u017e"
								," ": "\u02c7"
								},
					"menuFake": false},

				{"modifiers":   {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"id": 10,
					"keyCode": 188, // "<" Comma below / Cedilla ","
					"mapping": {
								 "C": "\u00c7", "c": "\u00e7"
								,"D": "\u1e10", "d": "\u1e11"
								,"E": "\u0228", "e": "\u0229", "\u0423": "\u0228", "\u0443": "\u0229"
								,"G": "\u0122", "g": "\u0123"
								,"H": "\u1e28", "h": "\u1e29"
								,"K": "\u0136", "k": "\u0137"
								,"L": "\u013b", "l": "\u013c"
								,"N": "\u0145", "n": "\u0146"
								,"R": "\u0156", "r": "\u0157"
								,"S": "\u015e", "s": "\u015f"
								,"T": "\u0162", "t": "\u0163"
								," ": "\u00b8"
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 11,
					"keyCode": 57, // Breve "("
					"mapping": {
								 "A": "\u0102", "a": "\u0103", "\u0424": "\u0102", "\u0444": "\u0103"
								,"E": "\u0114", "e": "\u0115", "\u0423": "\u0114", "\u0443": "\u0115"
								,"G": "\u011e", "g": "\u011f"
								,"H": "\u1e2a", "h": "\u1e2b" // breve below
								,"I": "\u012c", "i": "\u012d", "\u0428": "\u012c", "\u0448": "\u012d"
								,"O": "\u014e", "o": "\u014f", "\u014e": "\u00d6", "\u0449": "\u014f"
								,"U": "\u016c", "u": "\u016d", "\u016c": "\u00dc", "\u0433": "\u016d"
								,"X": "\u04c1", "x": "\u04c2"  // ZHE
								," ": "\u02D8"
								},
					"menuFake": false},

				{	"modifiers": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 12,
					"keyCode": 56, // Ogonek "*"
					"mapping": {
								 "A": "\u0104", "a": "\u0105", "\u0424": "\u0104", "\u0444": "\u0105"
								,"E": "\u0118", "e": "\u0119", "\u0423": "\u0118", "\u0443": "\u0119"
								,"I": "\u012e", "i": "\u012f", "\u0428": "\u012e", "\u0448": "\u012f"
								,"O": "\u01ea", "o": "\u01eb", "\u0429": "\u01ea", "\u0449": "\u01eb"
								,"U": "\u0172", "u": "\u0173", "\u0413": "\u0172", "\u0433": "\u0173"
								," ": "\u02Db"
								},
					"menuFake": false},

				{	"modifiers": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 13,
					"keyCode": 109, // Macron "_" how to do ae ?
					"mapping": {
								 "A": "\u0100", "a": "\u0101", "\u0424": "\u0100", "\u0444": "\u0101"
								,"E": "\u0112", "e": "\u0113", "\u0423": "\u0112", "\u0443": "\u0113"
								,"G": "\u1e20", "g": "\u1e21"
								,"I": "\u012a", "i": "\u012b", "\u0428": "\u012a", "\u0448": "\u012b"
								,"O": "\u014c", "o": "\u014d", "\u0429": "\u014c", "\u0449": "\u014d"
								,"U": "\u016a", "u": "\u016b", "\u0413": "\u016a", "\u0433": "\u016b"
								,"Y": "\u0232", "y": "\u0233"
								," ": "\u00af"
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"id": 14,
					"keyCode": 190, // Overdot "."
					"mapping": {
								 "A": "\u0226", "a": "\u0227", "\u0424": "\u0226", "\u0444": "\u0227"
								,"C": "\u010a", "c": "\u010b"
								,"E": "\u0116", "e": "\u0117", "\u0423": "\u0116", "\u0443": "\u0117"
								,"I": "\u0130"               , "\u0428": "\u0130"
								,"M": "\u1e40", "m": "\u1e41", "\u0411": "\u022e" // cyrillic small be
								,"N": "\u1e44", "n": "\u1e45"
								,"O": "\u022e", "o": "\u022f", "\u0429": "\u1e40", "\u0449": "\u1e41" // cyrillic sha
								,"P": "\u1e56", "p": "\u1e57"
								,"R": "\u1e58", "r": "\u1e59"
								,"S": "\u1e60", "s": "\u1e61"
								,"W": "\u1e86", "w": "\u1e87"
								,"X": "\u1e8a", "x": "\u1e8b"
								,"Y": "\u1e8e", "y": "\u1e8f"
								,"Z": "\u017b", "z": "\u017c"
								,"0": "\u2070", "1": "\u00b9", "2": "\u00b2", "3": "\u00b3", "4": "\u2074", "5": "\u2075", "6": "\u2076", "7": "\u2077", "8": "\u2078", "9": "\u2079"
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": false, "altKey": false},
					"id": 15,
					"keyCode": 59, // Underdot ";"
					"mapping": {
								 "A": "\u1ea0", "a": "\u1ea1", "\u0424": "\u1ea0", "\u0444": "\u1ea1"
								,"D": "\u1e0c", "d": "\u1e0d"
								,"E": "\u1eb8", "e": "\u1eb9", "\u0423": "\u1eb8", "\u0443": "\u1eb9"
								,"H": "\u1e24", "h": "\u1e25"
								,"I": "\u1eca", "i": "\u1ecb"
								,"K": "\u1e32", "k": "\u1e33"
								,"L": "\u1e36", "l": "\u1e37"
								,"O": "\u1ecc", "o": "\u1ecd", "\u0429": "\u1ecc", "\u0449": "\u1ecd"
								,"S": "\u1e62", "s": "\u1e63"
								,"T": "\u1e6c", "t": "\u1e6d"
								,"U": "\u1ee4", "u": "\u1ee5", "\u0413": "\u1ee4", "\u0433": "\u1ee5"
								,"V": "\u1e7e", "v": "\u1e7f"
								,"W": "\u1e88", "w": "\u1e89"
								,"Y": "\u1ef4", "y": "\u1ef5"
								," ": "\u0323"
								,"0": "\u2080", "1": "\u2081", "2": "\u2082", "3": "\u2083", "4": "\u2084", "5": "\u2085", "6": "\u2086", "7": "\u2087", "8": "\u2088", "9": "\u2089"
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 16,
					"keyCode": 50, // Double Accute """, smart double quotes
					"mapping": {
								 "O": "\u0150","o": "\u0151", "\u0429": "\u014c", "\u0449": "\u014d"
								,"U": "\u0170","u": "\u0171", "\u0413": "\u0172", "\u0433": "\u016b"
								," ": "\u02dd"
								,"9": "\u201C", "0": "\u201D"  //Smart double quotes
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"defaultmods": {"ctrlKey": true, "shiftKey": true, "altKey": false},
					"id": 17,
					"keyCode": 79, // o "o" circled letters!
					"mapping": {
								 "A": "\u24b6","a": "\u24d0"
								,"B": "\u24b7","b": "\u24d1"
								,"C": "\u24b8","c": "\u24d2"
								,"D": "\u24b9","d": "\u24d3"
								,"E": "\u24ba","e": "\u24d4"
								,"F": "\u24bb","f": "\u24d5"
								,"G": "\u24bc","g": "\u24d6"
								,"H": "\u24bd","h": "\u24d7"
								,"I": "\u24be","i": "\u24d8"
								,"J": "\u24bf","j": "\u24d9"
								,"K": "\u24c0","k": "\u24da"
								,"L": "\u24c1","l": "\u24db"
								,"M": "\u24c2","m": "\u24dc"
								,"N": "\u24c3","n": "\u24dd"
								,"O": "\u24c4","o": "\u24de"
								,"P": "\u24c5","p": "\u24df"
								,"Q": "\u24c6","q": "\u24e0"
								,"R": "\u24c7","r": "\u24e1"
								,"S": "\u24c8","s": "\u24e2"
								,"T": "\u24c9","t": "\u24e3"
								,"U": "\u24ca","u": "\u24e4"
								,"V": "\u24cb","v": "\u24e5"
								,"W": "\u24cc","w": "\u24e6"
								,"X": "\u24cd","x": "\u24e7"
								,"Y": "\u24ce","y": "\u24e8"
								,"Z": "\u24cf","z": "\u24e9"
								},
					"menuFake": false},

				{	"modifiers":   {"ctrlKey": true, "shiftKey": false, "altKey": true},
					"defaultmods": {"ctrlKey": true, "shiftKey": false, "altKey": true},
					"id": 18,
					"keyCode": 71, // G greek letters!
					"mapping": {
								 "A": "\u0391","a": "\u03b1"  // alpha
								,"B": "\u0392","b": "\u03b2"  // beta
								,"C": "\u03a8","c": "\u03c8"  // psi
								,"D": "\u0394","d": "\u03b4"  // delta
								,"E": "\u0395","e": "\u03b5"  // epsilon
								,"F": "\u03a6","f": "\u03c6"  // phi
								,"G": "\u0393","g": "\u03b3"  // gamma
								,"H": "\u0397","h": "\u03b7"  // eta
								,"I": "\u0399","i": "\u03b9"  // iota
								,"J": "\u039e","j": "\u03be"  // xi
								,"K": "\u039a","k": "\u03ba"  // kappa
								,"L": "\u039b","l": "\u03bb"  // lambda
								,"M": "\u039c","m": "\u03bc"  // mu
								,"N": "\u039d","n": "\u03bd"  // nu
								,"O": "\u039f","o": "\u03bf"  // omicron
								,"P": "\u03a0","p": "\u03c0"  // pi
								,"R": "\u03a1","r": "\u03c1"  // rho
								,"S": "\u03a2","s": "\u03c3"  // sigma
								,"T": "\u03a4","t": "\u03c4"  // tau
								,"U": "\u0398","u": "\u03b8"  // theta
								,"V": "\u03a4","v": "\u03c9"  // omega
								,"W": "\u03c2","w": "\u03c2"  // final sigma/sin
								,"X": "\u03a7","x": "\u03c7"  // chi
								,"Y": "\u03a5","y": "\u03c5"  // upsilon
								,"Z": "\u0386","z": "\u03b6"  // zeta
								},
					"menuFake": false}


					];


	var aliveKeys = [
					{ "id": 1,
					  "modifiers":   {"ctrlKey": true, "shiftKey":  true, "altKey":  true},
					  "defaultmods": {"ctrlKey": true, "shiftKey":  true, "altKey":  true},
					  "charCode": 0,    // "?"
					  "keyCode": 191,
					  "target": "\u00bf"},

					{ "id": 2,
					  "modifiers":   {"ctrlKey": true, "shiftKey":  true, "altKey":  true},
					  "defaultmods": {"ctrlKey": true, "shiftKey":  true, "altKey":  true},
					  "charCode": 33,  // "!"
					  "keyCode": 49, 
					  "target": "\u00a1"},

					{ "id": 3,
					  "modifiers":   {"ctrlKey": true, "shiftKey": false, "altKey":  true},
					  "defaultmods": {"ctrlKey": true, "shiftKey": false, "altKey":  true},
					  "charCode": 101,  // "E"
					  "keyCode": 52,    // us=charCode 101 "e" - not necessary on Irish keyboard - it has Euro symbol on ALT-GR + 4
					  "target": "\u20ac"}];  //Euro

	// Locale Specific Layouts
	// we can add optional shiftKey overrides to cater for the locale!
	// add charCode for overriding accelerators during keypress
	var layouts = [{ "locale" : "us_int",
					 "map_deadKeys" : [
						 {"id" : 1, "keyCode": 192, "key": "`", "otherKey":"~"} /* grave */
						,{"id" : 2, "keyCode": 222, "key": "'"} /* acute */
						,{"id" : 3, "keyCode":  54, "key": "^", "otherKey":"6"} /* circumflex */
						,{"id" : 4, "keyCode": 192, "key": "~", "otherKey":"`"} /* tilde */
						,{"id" : 5, "keyCode":  59, "key": ":", "otherKey":";"} /* umlaut */
						,{"id" : 6, "keyCode":  50, "key": "@", "otherKey":"2", "charCode":  0}  /* ring */
						,{"id" : 7, "keyCode":  55, "key": "&", "otherKey":"7"} /* sharp s */
						,{"id" : 8, "keyCode": 191, "key": "/", "otherKey":"?"} /* stroke */
						,{"id" : 9, "keyCode": 190, "charCode": 62, "key": ">", "otherKey":"."} /* caron */
						,{"id" :10, "keyCode": 188, "charCode": 44, "key": "comma", "otherKey":"<"}  /* cedilla */
						,{"id" :11, "keyCode":  57, "key": "(", "otherKey":"9"} /* breve */
						,{"id" :12, "keyCode":  56, "key": "*", "otherKey":"8"} /* ogonek */
						,{"id" :13, "keyCode": 109, "key": "_", "otherKey":"-"} /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":">"} /* overdot */
						,{"id" :15, "keyCode":  59, "key": ";", "otherKey":":"} /* underdot */
						,{"id" :16, "keyCode": 222, "key": "\"", "otherKey":"'"} /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o"} /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					 ],
					 "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 191, "key": "?"}
						 ,{"id": 2, "charCode":  33, "keyCode":  49, "key": "!"}
						 ,{"id": 3, "charCode": 101, "keyCode": 101, "key": "e"}
					  ]
					}
,
					{ "locale" : "us_dvorak",
    				  "map_deadKeys" : [
						 {"id" : 1, "keyCode": 192, "key": "`", "otherKey":"~"} /* grave */
						,{"id" : 2, "keyCode": 222, "key": "'", "otherKey":"\""} /* acute */
						,{"id" : 3, "keyCode":  54, "key": "^", "otherKey":"6"} /* circumflex */
						,{"id" : 4, "keyCode": 192, "key": "~", "otherKey":"`"} /* tilde */
						,{"id" : 5, "keyCode":  59, "key": ":", "otherKey":";"} /* umlaut */
						,{"id" : 6, "keyCode":  50, "key": "@", "otherKey":"2", "charCode":  0}  /* ring */
						,{"id" : 7, "keyCode":  55, "key": "&", "otherKey":"7"} /* sharp s */
						,{"id" : 8, "keyCode": 191, "key": "/", "otherKey":"?"} /* stroke */
						,{"id" : 9, "keyCode": 190, "key": ".", "otherKey":">"} /* caron */
						,{"id" :10, "keyCode": 188, "key": "comma", "otherKey":"<"}  /* cedilla */
						,{"id" :11, "keyCode":  57, "key": "(", "otherKey":"9"} /* breve */
						,{"id" :12, "keyCode":  56, "key": "*", "otherKey":"8"} /* ogonek */
						,{"id" :13, "keyCode": 109, "key": "_", "otherKey":"-"} /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":">"} /* overdot */
						,{"id" :15, "keyCode":  59, "key": ";", "otherKey":":"} /* underdot */
						,{"id" :16, "keyCode": 222, "key": "\"", "otherKey":"'"} /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o"} /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 191, "key": "?"}
						 ,{"id": 2, "charCode":  33, "keyCode":  49, "key": "!"}
						 ,{"id": 3, "charCode": 101, "keyCode": 101, "key": "e"}
					  ]
					}
,
/* use charCode to override accelerators! */
					{ "locale" : "irl",
					  "map_deadKeys" : [
						 {"id" : 1, "keyCode": 192, "charCode": 96, "key": "`"} /* grave */
						,{"id" : 2, "keyCode": 222, "key": "'", "otherKey":"@"} /* acute */
						,{"id" : 3, "keyCode":  54, "key": "^", "otherKey":"6"} /* circumflex */
						,{"id" : 4, "keyCode": 163, "key": "~", "otherKey":"#", "shiftKey":false, "altKey": true} /* tilde */
						,{"id" : 5, "keyCode":  59, "key": ":", "otherKey":";"} /* umlaut */
						,{"id" : 6, "keyCode": 222, "key": "@", "otherKey":"'", "shiftKey":true} /* ring */
						,{"id" : 7, "keyCode":  55, "key": "&", "otherKey":"7"} /* sharp s */
						,{"id" : 8, "keyCode": 191, "key": "/", "otherKey":"?"} /* stroke */
						,{"id" : 9, "keyCode": 190, "key": ".", "otherKey":">", "shiftKey":true} /* caron */
						,{"id" :10, "keyCode": 188, "key": "comma", "otherKey":"<"}  /* cedilla */
						,{"id" :11, "keyCode":  57, "key": "(", "otherKey":"9"} /* breve */
						,{"id" :12, "keyCode":  56, "key": "*", "otherKey":"8"} /* ogonek */
						,{"id" :13, "keyCode": 173, "key": "_", "otherKey":"-"} /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":">"} /* overdot */
						,{"id" :15, "keyCode":  59, "key": ";", "otherKey":":"} /* underdot */
						,{"id" :16, "keyCode":  50, "key": "\"", "otherKey":"|"} /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o"} /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 191, "key": "?"}
						 ,{"id": 2, "charCode":  33, "keyCode":  49, "key": "!"}
						 ,{"id": 3, "charCode": 101, "keyCode":  36, "key": "$"}
					  ]
					}
,
					{ "locale" : "uk",
    				"map_deadKeys" : [
						 {"id" : 1, "keyCode": 192, "key": "`"} /* grave */
						,{"id" : 2, "keyCode": 222, "key": "'", "otherKey":"@"} /* acute */
						,{"id" : 3, "keyCode":  54, "key": "^", "otherKey":"6"} /* circumflex */
						,{"id" : 4, "keyCode": 163, "key": "~", "otherKey":"#", "shiftKey":false, "altKey": true} /* #~ tilde */
						,{"id" : 5, "keyCode":  59, "key": ":", "otherKey":";"} /* umlaut */
						,{"id" : 6, "keyCode": 222, "key": "@", "otherKey":"'", "shiftKey":true} /* @' ring */
						,{"id" : 7, "keyCode":  55, "key": "&", "otherKey":"7"} /* sharp s */
						,{"id" : 8, "keyCode": 191, "key": "/", "otherKey":"?"} /* stroke */
						,{"id" : 9, "keyCode": 190, "key": ".", "otherKey":">", "shiftKey":true} /* caron */
						,{"id" :10, "keyCode": 188, "key": "comma", "otherKey":"<"}   /* cedilla */
						,{"id" :11, "keyCode":  57, "key": "(", "otherKey":"9"} /* breve */
						,{"id" :12, "keyCode":  56, "key": "*", "otherKey":"8"} /* ogonek */
						,{"id" :13, "keyCode": 173, "key": "_", "otherKey":"-"} /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":">"} /* overdot */
						,{"id" :15, "keyCode":  59, "key": ";", "otherKey":":"} /* underdot */
						,{"id" :16, "keyCode":  50, "key": "\"", "otherKey":"|"} /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o"} /* o - circle (ctrlshift c is taken by lightning)*/
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 191, "key": "?"}
						 ,{"id": 2, "charCode":  33, "keyCode":  49, "key": "!"}
						 ,{"id": 3, "charCode": 101, "keyCode":  36, "key": "$"}
					  ]
					}
,
					{ "locale" : "fr",
    				"map_deadKeys" : [
						 {"id" : 1, "keyCode":  55, "key": "7", "otherKey":"`", "ctrlKey":true, "shiftKey":false}                  /* grave */
						,{"id" : 2, "keyCode":  52, "key": "4", "otherKey":"'", "ctrlKey":true, "shiftKey":true}                   /* acute */
						,{"id" : 3, "keyCode": 221, "key": "^", "otherKey":"9", "ctrlKey":false, "shiftKey":false, "altKey":false} /* circumflex */
						,{"id" : 4, "keyCode":  50, "key": "~", "otherKey":"2", "altKey": true}                                    /* tilde */
						,{"id" : 5, "keyCode": 221, "key": "..", "otherKey":"^", "ctrlKey":false, "shiftKey":true}                 /* umlaut */
						,{"id" : 6, "keyCode":  48, "key": "0", "otherKey":"@", "ctrlKey":true, "shiftKey":true}                   /* ring */
						,{"id" : 7, "keyCode":  49, "key": "&", "otherKey":"1", "ctrlKey":true, "shiftKey":true}                   /* sharp s */
						,{"id" : 8, "keyCode": 191, "key": "/", "otherKey":":", "ctrlKey":true}                                    /* stroke */
						,{"id" : 9, "keyCode": 226, "key": "<", "otherKey":">", "ctrlKey":true, "shiftKey":false}                  /* caron */
						,{"id" :10, "keyCode": 188, "key": ",", "otherKey":"?", "ctrlKey":true, "shiftKey":false}                  /* cedilla */
						,{"id" :11, "keyCode":  53, "key": "(", "otherKey":"5", "ctrlKey":true, "shiftKey":true}                   /* breve */
						,{"id" :12, "keyCode": 220, "key": "*", "ctrlKey":true, "shiftKey":false}                  /* ogonek */
						,{"id" :13, "keyCode":  56, "key": "_", "otherKey":"8", "ctrlKey":true, "shiftKey":true}                   /* macron */
						,{"id" :14, "keyCode": 190, "key": ".", "otherKey":";", "ctrlKey":true, "shiftKey":true}                   /* overdot */
						,{"id" :15, "keyCode": 190, "key": ";", "otherKey":".", "ctrlKey":true, "shiftKey":false}                  /* underdot */
						,{"id" :16, "keyCode":  51, "key": "\"", "otherKey":"8", "ctrlKey":true, "shiftKey":false}                 /* double acute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o"}                                                    /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 188, "key": "?"}
						 ,{"id": 2, "charCode":   0, "keyCode": 223, "key": "!"}
						 ,{"id": 3, "charCode": 101, "keyCode":  59, "key": "$"}
					  ]
					}
,
					{ "locale" : "it",
					  "map_deadKeys" : [
						 {"id" : 1, "keyCode":  59, "key": "&#232;", "shiftKey": false} /* grave */
						,{"id" : 2, "keyCode":  59, "key": "&#233;", "shiftKey": true } /* acute */
						,{"id" : 3, "keyCode": 221, "key": "^",      "shiftKey": true } /* circumflex */
						,{"id" : 4, "keyCode": 220, "key": "|", "otherKey":"\\",      "shiftKey": true } /* tilde */
						,{"id" : 5, "keyCode": 190, "key": ":", "otherKey":".",      "shiftKey": true } /* umlaut */
						,{"id" : 6, "keyCode": 222, "key": "&#778;", "otherKey":"#", "shiftKey": true } /* ring */
						,{"id" : 7, "keyCode":  54, "key": "&", "otherKey":"6",      "shiftKey": true } /* sharp s */
						,{"id" : 8, "keyCode":  55, "key": "/", "otherKey":"7",      "shiftKey": true } /* stroke */
						,{"id" : 9, "keyCode": 226, "key": ">", "otherKey":"\\",      "shiftKey": true } /* caron */
						,{"id" :10, "keyCode": 188, "key": "comma", "otherKey":";",  "shiftKey": false} /* cedilla */
						,{"id" :11, "keyCode":  56, "key": "(", "otherKey":"8",      "shiftKey": true } /* breve */
						,{"id" :12, "keyCode": 107, "key": "*", "otherKey":"+",      "shiftKey": true } /* ogonek */
						,{"id" :13, "keyCode": 109, "key": "_", "otherKey":"-",      "shiftKey": true } /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":":",      "shiftKey": false} /* overdot */
						,{"id" :15, "keyCode": 188, "key": ";", "otherKey":",",      "shiftKey": true } /* underdot */
						,{"id" :16, "keyCode":  50, "key": "\"", "otherKey":"2",     "shiftKey": true } /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o",      "shiftKey": true } /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 219, "key": "?"}
						 ,{"id": 2, "charCode":   0, "keyCode":  49, "key": "!"} /* already supported natively by italian keyboard */
						 ,{"id": 3, "charCode":   0, "keyCode":  52, "key": "$"}
					  ]
					}
,
					{ "locale" : "de",
					  "map_deadKeys" : [
						 {"id" : 1, "keyCode": 192, "charCode": 96, "key": "&#96;",  "shiftKey": true } /* grave */
						,{"id" : 2, "keyCode": 192, "charCode": 39, "key": "&#180;", "shiftKey": false} /* acute */
						,{"id" : 3, "keyCode": 220, "key": "^",      "shiftKey": false } /* circumflex */
						,{"id" : 4, "keyCode": 107, "key": "*", "otherKey":"+",      "shiftKey": true } /* tilde */
						,{"id" : 5, "keyCode": 190, "key": ":", "otherKey":".",      "shiftKey": true } /* umlaut */
						,{"id" : 6, "keyCode":  48, "key": "0", "otherKey":"-",      "shiftKey": false } /* ring above */
						,{"id" : 7, "keyCode":  54, "key": "&", "otherKey":"6",      "shiftKey": true } /* sharp s */
						,{"id" : 8, "keyCode":  55, "key": "/", "otherKey":"7",      "shiftKey": true } /* stroke */
						,{"id" : 9, "keyCode": 226, "key": ">", "otherKey":"<",      "shiftKey": true } /* caron */
						,{"id" :10, "keyCode": 188, "key": "comma", "otherKey":";",  "shiftKey": false} /* cedilla */
						,{"id" :11, "keyCode":  56, "key": "(", "otherKey":"8",      "shiftKey": true } /* breve */
						,{"id" :12, "keyCode": 191, "key": "'", "otherKey":"#",      "shiftKey": true } /* ogonek */
						,{"id" :13, "keyCode": 109, "key": "_", "otherKey":"-",      "shiftKey": true } /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":":",      "shiftKey": false} /* overdot */
						,{"id" :15, "keyCode": 188, "key": ";", "otherKey":",",      "shiftKey": true } /* underdot */
						,{"id" :16, "keyCode":  50, "key": "\"", "otherKey":"?",     "shiftKey": true } /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o",      "shiftKey": true } /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 219, "key": "?"}
						 ,{"id": 2, "charCode":   0, "keyCode":  49, "key": "!"}
						 ,{"id": 3, "charCode":   0, "keyCode":  52, "key": "$"}
					  ]
					}
,
					{ "locale" : "sv",
					  "map_deadKeys" : [
						 {"id" : 1, "keyCode": 219, "key": "&#96;", "shiftKey": true } /* grave */
						,{"id" : 2, "keyCode": 219, "key": "&#180;", "shiftKey": false} /* acute */
						,{"id" : 3, "keyCode":  59, "key": "^", "otherKey":"\"",      "shiftKey": true } /* circumflex */
						,{"id" : 4, "keyCode":  59, "key": "~", "otherKey":"^",      "shiftKey": false} /* tilde */
						,{"id" : 5, "keyCode": 190, "key": ":", "otherKey":".",      "shiftKey": true } /* umlaut */
						,{"id" : 6, "keyCode":  52, "key": "&#164;", "shiftKey": true } /* ring */
						,{"id" : 7, "keyCode":  54, "key": "&", "otherKey":"6",      "shiftKey": true } /* sharp s */
						,{"id" : 8, "keyCode":  55, "key": "/", "otherKey":"7",      "shiftKey": true } /* stroke */
						,{"id" : 9, "keyCode": 226, "key": ">", "otherKey":"<",      "shiftKey": true } /* caron */
						,{"id" :10, "keyCode": 188, "key": "comma", "otherKey":";",  "shiftKey": false} /* cedilla */
						,{"id" :11, "keyCode":  56, "key": "(", "otherKey":"8",      "shiftKey": true } /* breve */
						,{"id" :12, "keyCode": 191, "key": "'", "otherKey":"*",      "shiftKey": false} /* ogonek */
						,{"id" :13, "keyCode":  48, "key": "=", "otherKey":"0",      "shiftKey": true } /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":":",      "shiftKey": false} /* overdot */
						,{"id" :15, "keyCode": 188, "key": ";", "otherKey":",",      "shiftKey": true } /* underdot */
						,{"id" :16, "keyCode":  50, "key": "\"", "otherKey":"?",     "shiftKey": true } /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o",      "shiftKey": true } /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode":  107, "key": "?"}
						 ,{"id": 2, "charCode":   0, "keyCode":   49, "key": "!"}
						 ,{"id": 3, "charCode":   0, "keyCode": 9999, "key": "%"} /* not used */
					  ]
					}
,
					{ "locale" : "ru",
					  "map_deadKeys" : [
						 {"id" : 1, "keyCode": 226, "key": "\\",     "shiftKey": false} /* grave */
						,{"id" : 2, "keyCode": 220, "key": "/", "otherKey":"?",      "shiftKey": true } /* acute */
						,{"id" : 3, "keyCode":  54, "key": "^", "otherKey":"6",      "shiftKey": true } /* circumflex */
						,{"id" : 4, "keyCode": 192, "key": "~",      "shiftKey": true } /* tilde */
						,{"id" : 5, "keyCode":  59, "key": ":", "otherKey":";",      "shiftKey": true } /* umlaut */
						,{"id" : 6, "keyCode":  51, "key": "3", "otherKey":"#",      "shiftKey": true } /* ring */
						,{"id" : 7, "keyCode":  52, "key": "$", "otherKey":"4",      "shiftKey": true } /* sharp s */
						,{"id" : 8, "keyCode":  53, "key": "%", "otherKey":"5",      "shiftKey": true } /* stroke */
						,{"id" : 9, "keyCode": 190, "key": ">", "otherKey":".",      "shiftKey": true } /* caron */
						,{"id" :10, "keyCode": 188, "key": "comma", "otherKey":"<",  "shiftKey": false} /* cedilla */
						,{"id" :11, "keyCode":  57, "key": "(", "otherKey":"9",      "shiftKey": true } /* breve */
						,{"id" :12, "keyCode":  56, "key": "*", "otherKey":"8",      "shiftKey": true } /* ogonek */
						,{"id" :13, "keyCode": 226, "key": "|", "otherKey":"\\",      "shiftKey": true } /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":">",      "shiftKey": false} /* overdot */
						,{"id" :15, "keyCode":  59, "key": ";", "otherKey":":",      "shiftKey": false} /* underdot */
						,{"id" :16, "keyCode": 222, "key": "\"", "otherKey":"'",     "shiftKey": true } /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o",      "shiftKey": true } /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 219, "key": "?"}
						 ,{"id": 2, "charCode":   0, "keyCode":  49, "key": "!"}
						 ,{"id": 3, "charCode":   0, "keyCode":  52, "key": "$"}
					  ]
					}
,
					{ "locale" : "hu",
    				"map_deadKeys" : [
						 {"id" : 1, "keyCode":  55, "key": "7", "otherKey":"=", "shiftKey":true} /* grave */
						,{"id" : 2, "keyCode":  57, "key": "9", "otherKey":")", "shiftKey":true} /* acute */
						,{"id" : 3, "keyCode":  51, "key": "3", "otherKey":"6"} /* circumflex ^ */
						,{"id" : 4, "keyCode":  49, "key": "1", "otherKey":"'"} /* tilde ~ */
						,{"id" : 5, "keyCode":   0, "charCode": 220, "key": "Ü", "shiftKey":true}  /* umlaut */
						,{"id" : 6, "keyCode":  53, "key": "5", "otherKey":"%", "shiftKey":true} /* ring */
						,{"id" : 7, "keyCode":   0, "charCode": 225, "key": "Á", "shiftKey":false} /* sharp s - no key up event */
						,{"id" : 8, "keyCode":  68, "charCode": 68, "key": "D", "shiftKey":true} /* stroke */
						,{"id" : 9, "keyCode":  50, "key": "2", "shiftKey":true} /* caron */
						,{"id" :10, "keyCode": 188, "charCode": 44, "key": "comma", "otherKey":"?"}  /* cedilla */
						,{"id" :11, "keyCode":  52, "key": "4", "otherKey":"!"} /* breve */
						,{"id" :12, "keyCode":  54, "key": "6", "shiftKey":true, "otherKey":"/"} /* ogonek little tail */
						,{"id" :13, "keyCode": 173, "charCode": 95, "key": "-", "otherKey":"_"} /* macron bar over */
						,{"id" :14, "keyCode":  56, "charCode": 40, "key": "8", "shiftKey":true, "otherKey":"("} /* overdot */
						,{"id" :15, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":":"} /* underdot */
						,{"id" :16, "keyCode":   0, "charCode": 246, "key": "Ö", "otherKey":"˝", "shiftKey":false} /* double accute - no key up event*/
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o"} /* o - circle (ctrlshift c is taken by lightning)*/
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode": 191, "key": "?"}
						 ,{"id": 2, "charCode":  33, "keyCode":  49, "key": "!"}
						 ,{"id": 3, "charCode": 101, "keyCode":  36, "key": "$"}
					  ]
					}
,
					{ "locale" : "es",
					  "map_deadKeys" : [
						 {"id" : 1, "keyCode": 192, "key": "&#96;", "shiftKey": false } /* grave */
						,{"id" : 2, "keyCode":  0,  "charCode": 180, "key": "&#180;", "shiftKey": false} /* acute */
						,{"id" : 3, "keyCode": 192, "key": "^", "otherKey":"&#96;", "shiftKey": true } /* circumflex */
						,{"id" : 4, "keyCode":  52, "key": "4", "otherKey":"$",  "shiftKey":true} /* tilde */
						,{"id" : 5, "keyCode":   0, "charCode": 168, "key": "&#776;", "otherKey":"&#776;"} /* umlaut */
						,{"id" : 6, "keyCode":   0, "charCode": 186, "key": "&#176;", "shiftKey": true, "altKey": true } /* ring  */
						,{"id" : 7, "keyCode":  54, "key": "&", "otherKey":"6",      "shiftKey": true } /* sharp s */
						,{"id" : 8, "keyCode":  55, "key": "/", "otherKey":"7",      "shiftKey": true } /* stroke */
						,{"id" : 9, "keyCode":  60, "key": ">", "otherKey":"<",      "shiftKey": true } /* caron */
						,{"id" :10, "keyCode": 188, "key": "comma", "otherKey":";",  "shiftKey": false} /* cedilla */
						,{"id" :11, "keyCode":  56, "key": "(", "otherKey":"8",      "shiftKey": true } /* breve */
						,{"id" :12, "keyCode": 171, "key": "plus", "otherKey":"*",   "shiftKey": true} /* ogonek */
						,{"id" :13, "keyCode": 173, "key": "-", "otherKey":"_",      "shiftKey": true } /* macron */
						,{"id" :14, "keyCode": 190, "charCode": 46, "key": ".", "otherKey":":",  "shiftKey": false} /* overdot */
						,{"id" :15, "keyCode": 188, "key": ";", "otherKey":",",      "shiftKey": true } /* underdot */
						,{"id" :16, "keyCode":  50, "key": "\"", "otherKey":"2",     "shiftKey": true } /* double accute */
						,{"id" :17, "keyCode":  79, "key": "O", "otherKey":"o",      "shiftKey": true } /* circle */
						,{"id" :18, "keyCode":  71, "key": "G", "otherKey":"g"} /* greek */
					  ],
					  "map_liveKeys" : [
						  {"id": 1, "charCode":   0, "keyCode":  222, "key": "?"}
						 ,{"id": 2, "charCode":   0, "keyCode":   49, "key": "!"}
						 ,{"id": 3, "charCode":   0, "keyCode": 9999, "key": "%"} /* not used */
					  ]
					}
				 ];

	let currentLayout = null,
	    hexUnicodeKey = {"modifiers": {"ctrlKey": false, "shiftKey": false,
									   "altKey":  true},
						 "keyCode": 88}, // "x"
	    decUnicodeModifiers = {"ctrlKey": false, "shiftKey": false,
							   "altKey":  true},
	    decUnicode = "";

// 	function log(message) {
// 		var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
// 			.getService(Components.interfaces.nsIConsoleService);
// 		consoleService.logStringMessage("[ZombieKeys] " + message + (message != "\n" ? " " : ""));
// 	};
//
	function logKey(why, event) {
		const util = ZombieKeys.Util;
	  if (util.isPrivateBrowsing)
			return;
		let keyEventProps = ['keyCode', 'charCode', 'shiftKey', 'altKey', 'ctrlKey'];

		let message=why,
		    key_Pressed='';
		for (let k=0; k<keyEventProps.length; k++) {
			message += keyEventProps[k] + "=" + event[keyEventProps[k]]+" ";

			if(keyEventProps[k] == 'keyCode' && event[keyEventProps[k]]>0 )
				key_Pressed += '  kC [' + String.fromCharCode(event[keyEventProps[k]]) + ']';
			if(keyEventProps[k] == 'charCode' && event[keyEventProps[k]]>0)
				key_Pressed += '  cC [' + String.fromCharCode(event[keyEventProps[k]]) + ']';

		}
		message += key_Pressed;
		util.logToConsole(message+"\n");
	}

	this.logMappingString = function (mapping) {
		let message="";
		for (let mappee in mapping) {
			if (mappee.charCodeAt(0) < 256) // filter out cyrillic
				message += mappee+" ("+mappee.charCodeAt(0)+") => "+
					mapping[mappee]+" ("+mapping[mappee].charCodeAt(0)+") ";
		}
		return message+"\n";
	}

	this.displayMapping = function (k) {
		let map = deadKeys[k].mapping;
		if (ZombieKeys.Preferences.isPreference('showMapping') && !ZombieKeys.Util.isPrivateBrowsing) {
			ZombieKeys.Util.logToConsole("created zombie id "+ (k+1) +" you can now press: \n" + ZombieKeys.logMappingString(map));
		}
	};

	function checkModifiers(event, modifiers) {
		for (let key in modifiers) {
			if (event[key] != modifiers[key]) {
				return false;
			}
		}
		return true;
	}

	// THIS INSERTS THE ZOMBIEFIED CHARACTER
	function fakeKey(event, chr, createKeyUp) {
		const util = ZombieKeys.Util;
		try {
			let isDebug = ZombieKeys.Preferences.isDebugOption('fakeKey');
			if (isDebug) {
				ZombieKeys.logKey("fakeKey: ('" + chr + "' " + event.type + ")", event);
				if (event.type=='keypress')
					ZombieKeys.LastAliveKeyDown = chr; // remember keyPress
				else {
					if (chr==ZombieKeys.LastAliveKeyDown) { // avoid duplication on keyup!
						ZombieKeys.LastAliveKeyDown = null;
						return;
					}
					ZombieKeys.LastAliveKeyDown = null;
				}
				debugger;
			}

			// var view = window; // event.view;
			let target = event.originalTarget ? event.originalTarget : (event.target ? event.target : document.commandDispatcher.focusedElement);

			if (ZombieKeys.Preferences.isPreference('subComma')) {
				switch (chr) {
					case "\u015e": // S-cedilla
						chr = "\u0218";
						break;
					case "\u015f": // s-cedilla
						chr = "\u0219";
						break;
					case "\u0162": // T-cedilla
						chr = "\u021a";
						break;
					case "\u0163": // t-cedilla
						chr = "\u021b";
						break;
					case "\u1e10": // D-cedilla - does not exist in Unicode
						break;
					case "\u1e11": // d-cedilla - does not exist in Unicode
						break;
				}
			}
			
			// compose window or elements that do not expose selection (e.g. gmail compose area)
			if (target.nodeName=="HTML" ||
				null==target.selectionStart ||
				isNaN(target.selectionStart)
				) {

				// PRESS
				let keypress_event = document.createEvent("KeyboardEvent"), // KeyEvents
				    eventView = (event.view) ? event.view : keypress_event.view; // make xbl compatible (?)
				if (util.Application=='Postbox' && util.AppVersion>=5.0) {
					// Postbox 5.0
				  // nsDOMKeyboardEvent::InitKeyEvent - got an additional character.
					keypress_event.initKeyEvent("keypress", true, true, eventView,
									 false, false, false, false, false,  // ctrlKeyArg, altKeyArg, shiftKeyArg, metaKeyArg, aIsRepeat
									 0, chr.charCodeAt(0)); 
					
				}
        else  {
					keypress_event.initKeyEvent("keypress", true, true, eventView,
									 false, false, false, false,     // ctrlKeyArg, altKeyArg, shiftKeyArg, metaKeyArg, 
									 0, chr.charCodeAt(0));
				}
									 
				util.logDebugOptional("fakeKey", ("faking '" + chr + "': " + keypress_event.type + " + target: " + target.id + "\n---"));
				target.dispatchEvent(keypress_event);
			}
			else {
				ZombieKeys.insertAtCaret(target, chr);
			}
			// "keypress" or "keyup"
			event.preventDefault();
			event.stopPropagation();

		}
		catch(ex) {
			util.logToConsole("exception during fakekey: " + ex.toString());
		}

	};

	// get string preceeding cursor
	function getPreceedingString(elt, numchars) {
		let pos = elt.selectionStart;
		if (pos < numchars) {numchars=pos;}
		return elt.value.slice(pos-numchars,pos);
	}

	// replace string preceeding cursor
	function replacePreceedingString(elt, numchars, newtext) {
		let posStart = elt.selectionStart,
		    posEnd = elt.selectionEnd,
		    scrollTop = elt.scrollTop,
		    scrollLeft = elt.scrollLeft;

		if (posStart < numchars) {numchars=posStart;}

		elt.value = elt.value.slice(0,posStart-numchars)+
					newtext+
					elt.value.slice(posEnd);
		let newpos = posStart+newtext.length;
		elt.selectionStart = newpos;
		elt.selectionEnd = newpos;

		elt.scrollTop = scrollTop;
		elt.scrollLeft = scrollLeft;
		elt.focus();
	}


	// modify the key mappings according to the selected locale
	this.initLocale = function(locale) {
		const util = ZombieKeys.Util;
		util.logDebug("Initialize key locale: " + locale + " ...\nsearching through " + typeof layouts);
		let theLayout; // determine locale
		theLayout = layouts.find(el => el.locale==locale); // replace Array.forEach
		if (theLayout) {
			util.logDebug("found match: " + theLayout.locale);
		}
		else return;
		
		try {
			for (let k=0; k<deadKeys.length; k++) {
				let deadKey = deadKeys[k],
						foundMap = theLayout.map_deadKeys.find(map => map.id == deadKey.id) || null;
						
				if (foundMap) {
					// replace deadKey array element
					deadKey.keyCode = foundMap.keyCode;
					// Special mods
					if (typeof foundMap.charCode !== "undefined") {
						deadKey.charCode = foundMap.charCode;
						util.logDebug('Overwrite deadKey[' + (k+1) + '].charCode = ' + deadKey.charCode);
					}
					else
						if (layouts[0].map_deadKeys[k].charCode)
							deadKey.charCode = layouts[0].map_deadKeys[k].charCode; // us_int as default

					if (typeof foundMap.shiftKey !== "undefined")
						deadKey.modifiers.shiftKey = foundMap.shiftKey;
					else
						deadKey.modifiers.shiftKey = deadKey.defaultmods.shiftKey;

					if (typeof foundMap.altKey !== "undefined")
						deadKey.modifiers.altKey = foundMap.altKey;
					else
						deadKey.modifiers.altKey = deadKey.defaultmods.altKey;
				}
			}
		}
		catch(ex) {
			util.logException('error during deadKeys initialisation', ex);
		}
		
		try {
			for (let k=0; k<aliveKeys.length; k++) {
				let foundMap = theLayout.map_liveKeys.find(map => map.id == aliveKeys[k].id) || null;
				if (foundMap) {
					let liveKey = aliveKeys[k];
					liveKey.keyCode = Map.keyCode;
					liveKey.charCode = Map.charCode;

					if (typeof Map.ctrlKey !== "undefined" )
						liveKey.modifiers.ctrlKey = Map.ctrlKey;
					else
						liveKey.modifiers.ctrlKey = liveKey.defaultmods.ctrlKey;

					if (typeof Map.shiftKey !== "undefined" )
						liveKey.modifiers.shiftKey = Map.shiftKey;
					else
						liveKey.modifiers.shiftKey = liveKey.defaultmods.shiftKey;

					if (typeof Map.altKey !== "undefined" )
						liveKey.modifiers.altKey = Map.altKey;
					else
						liveKey.modifiers.altKey = liveKey.defaultmods.altKey;
				};
			}
		}
		catch(ex) {
			util.logException('error during aliveKeys initialisation', ex);
		}
		
		// publish current Layout
		this.currentLayout = theLayout;	
	}


	function keyPressHandler(event) {
	  if (ZombieKeys.DisableListeners) return;
		const util = ZombieKeys.Util;
		let isDebug = ZombieKeys.Preferences.isDebugOption('keyPressHandler');
		if (isDebug) { ZombieKeys.logKey("press: ", event); }

		// check "alive" keys which fire during "keypress"
		for (let k=0; k<aliveKeys.length; k++) {
			if (  ( (event.keyCode && event.keyCode  == aliveKeys[k].keyCode)
					||
				    (event.charCode && event.charCode == aliveKeys[k].charCode)    )
				&&
				checkModifiers(event, aliveKeys[k].modifiers)) {
				fakeKey(event, aliveKeys[k].target);
				return;
			}
		}

		// check if/which "dead" key is active
		for (let k=0; k<deadKeys.length; k++) {
			let deadKey = deadKeys[k],
			    deadCharCode = deadKey.charCode || 0,
					deadkeyCode = deadKey.keyCode || 0;
			if (deadKey.alive) {
				if (isDebug) debugger;
				deadKey.alive = false;
				// check if there's a mapping for this character
				// entered after "dead" key
				util.logDebugOptional("zombieCreation", "keyPressHandler( ) detected zombie id "+ (k+1) + " for " + event.charCode +
						" => " + ZombieKeys.logMappingString(deadKey.mapping));
				let code = String.fromCharCode(event.charCode);
				if (deadKey.mapping[code]) {
					if (deadKey.menuFake && event.type=='keypress') {
						// make it a pair of events
						deadKey.menuFake = false;
						fakeKey(event, deadKey.mapping[code], true); // copy event with keyup!
					}
					else
						fakeKey(event, deadKey.mapping[code], false);
					return;
				}
				else {
					util.logDebugOptional("zombieCreation", "no mapping found - sending deadkey[" + (k+1) + "] back to sleep");
				}
			}
      // consume accelerators!
      else {
				
				util.logDebugOptional("accelerators", "[" + (k+1) + "] keyDown - check for accelerator:\n"
					  + 'keyCode = ' + deadkeyCode + ' {' + (event.keyCode == deadkeyCode) + '}\n'
					  + 'charCode = ' + deadCharCode + ' {' + (event.charCode == deadCharCode) + '}');
        if (
				((event.keyCode == deadkeyCode && deadkeyCode)
				 ||
				 (event.charCode && event.charCode == deadCharCode))
				&&
				 checkModifiers(event, deadKey.modifiers))  {
					util.logDebug(' discarding keypress after match\n'
					  + 'keyCode = ' + event.keyCode + '\n'
					  + 'charCode = ' + event.charCode);
					let preventDefault = true;
					
					//exception: key without a key-up 
					if (deadkeyCode==0) {
						if (event.charCode == deadCharCode) {
							util.logDebugOptional("keyPressHandler","Special case: no keyCode - activating deadKey[" + k + "]");
							ZombieKeys.displayMapping(k);
							deadKey.alive = true;
						}
						else
							preventDefault = false; // legit shortcut
					}
					
					if (preventDefault) {
						// throw away the keypress event.
						event.preventDefault();
						event.stopPropagation();
					}
					
					break;
        }
      }
		}
	};

	function keyUpHandler(event) {
		if (ZombieKeys.DisableListeners || event.keyCode<20)
			return; // ignore CTRL,SHIFT and ALT
		let isDebug = ZombieKeys.Preferences.isDebugOption('keyUpHandler');
		if (isDebug) {ZombieKeys.logKey("up: ", event);}

		// check "alive" keys which only fire on "keyup"
		for (let k=0; k<aliveKeys.length; k++) {
			if (( (event.keyCode && event.keyCode  == aliveKeys[k].keyCode)
					||
				    (event.charCode && event.charCode == aliveKeys[k].charCode)    )
				&&
				checkModifiers(event, aliveKeys[k].modifiers)) {
				ZombieKeys.fakeKey(event, aliveKeys[k].target);
				return;
			}
		}

		// check if "dead" key is activated
		// match on charCode of deadkeys?
		for (let k=0; k<deadKeys.length; k++) {
			let deadKey = deadKeys[k];
			if (
				(
				 (event.keyCode == deadKey.keyCode)
				 ||
				 (!event.keyCode && deadKey.charCode && event.charCode == deadKey.charCode)
				)
				&&
				checkModifiers(event, deadKey.modifiers))
			{
				ZombieKeys.displayMapping(k);
				deadKey.alive = true;
				event.preventDefault();
				event.stopPropagation();
				return;
			}
		}

		// process ALT+X (treat preceeding 4 chars as hex unicode string
		// and replace with corresponding char)
		if ((event.keyCode == ZombieKeys.HexUnicodeKey.keyCode) &&
			checkModifiers(event, ZombieKeys.HexUnicodeKey.modifiers)) {
			let hexUnicode = getPreceedingString(event.target, 4),
			    code = parseInt(hexUnicode, 16);
			replacePreceedingString(event.target, 4, String.fromCharCode(code));
			return;
		}

		// process ALT+<numeric keypad>
		if (checkModifiers(event, ZombieKeys.DecUnicodeModifiers)) {
			if ((event.keyCode >= 96) && (event.keyCode <= 105)) {
				decUnicode += (event.keyCode-96).toString(); // add digit
				event.preventDefault();
				event.stopPropagation();
				return;
			} else if (event.keyCode == 18) {
				// released ALT - let's insert
				if (decUnicode != "") {
					let code = parseInt(decUnicode, 10);
					ZombieKeys.fakeKey(event, String.fromCharCode(code));
					decUnicode = "";
				}
				event.preventDefault();
				event.stopPropagation();
				return;
			}
		}
	};

	function insertAtCaret(element, chr) {
		const util = ZombieKeys.Util;
		if (!element) {
			util.logToConsole("insertAtCaret for chr '" + chr.toString() + "' cannot be done - no element passed!");
			return;
		}

		let el = '', node;
		el +=  element.id ? "  id=" + element.id : "";
		el +=  element.nodeName ? "  nodeName=" + element.nodeName : "";
		el +=  element.name ? "  name=" + element.name : "";
		util.logDebugOptional("insertAtCaret", "insertAtCaret(" + el + "): char = " + chr);
		try {
			node = element.nodeName;
			element.focus();
			if (node=="HTML") { // Composer Windows /
			    if (window.getSelection && window.getSelection().getRangeAt) {
			        range = window.getSelection().getRangeAt(0);
			        node = range.createContextualFragment(chr.toString());
			        range.insertNode(node);
			    } else if (document.selection && document.selection.createRange) {
			        document.selection.createRange().pasteHTML(chr.toString());
			    }
			}
			else {
				let startSel = element.selectionStart,
				    endSel = element.selectionEnd;
				if (!element.value)
					element.value = "" + chr;
				else
					element.value = element.value.substring(0, startSel) + chr + element.value.substring(endSel, element.value.length);
				element.selectionStart = startSel+1;
				element.selectionEnd = startSel+1;
			}
		}
		catch(e) {
			util.logToConsole("Exception in insertAtCaret; (nodeName=" + node  +")\n" + e.toString());
		}
	}


	this.viewOptions = function () {
		let oldLocale = this.getCurrentLocale();
		window.openDialog('chrome://zombiekeys/content/zombiekeys-options.xul',
			'zombiekeys-options','dialog,chrome,titlebar,centerscreen,innerWidth=500,innerHeight=450',ZombieKeys).focus();
		/*
		let newLocale = this.getCurrentLocale();
		// for safety, force to initialize locale after options are closed
		ZombieKeys.Util.logDebug("old locale=" + oldLocale + " - initialize new locale=" + newLocale + "...");
		this.initLocale(newLocale);
		*/
	}

	this.getStringBundle = function() {
		let zk_bundle =
			Components.classes["@mozilla.org/intl/stringbundle;1"]
				.getService(Components.interfaces.nsIStringBundleService)
				.createBundle("chrome://zombiekeys/locale/zombiekeys.properties");
		return zk_bundle;
	}

	this.getResourceString = function(id) {
		try {
			let txt = ZombieKeys.getStringBundle().GetStringFromName('extensions.zombiekeys.' + id);
			return txt;
		}
		catch (ex) {
			return 'Missing Resource string {extensions.zombiekeys.' + id + '}\n'
					+ ex.toString();
		}
	}

	this.showHowToUse = function() {
		let text = ZombieKeys.getResourceString('howToUse');
		alert (text);
	}

	this.gotoSupportPage = function() {
		//this.showContentTab();
		ZombieKeys.Util.openURL('http://zombiekeys.mozdev.org/index.html');
	}

	this.getCurrentLocale = function () {
		return Components.classes["@mozilla.org/preferences-service;1"]
 					.getService(Components.interfaces.nsIPrefBranch)
 					.getCharPref('extensions.zombiekeys.currentLayout');
	}

	this.setDebugLevel = function(level) {
		debugLevel = level;
		Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch)
				.setIntPref('extensions.zombiekeys.debugLevel', level);
	}

	this.init = function(that) {
		let locale = that.getCurrentLocale();
		ZombieKeys.Util.logDebug("Call initLocale (" + locale + ") ...");

		that.initLocale(locale);
		if (window) {
			window.addEventListener('keypress', keyPressHandler, true);
			window.addEventListener('keyup',	keyUpHandler,	 true);
		}
	}

	this.showPopup = function(button, popupId) {
		let p =  document.getElementById(popupId);
		if (p) {
				document.popupNode = button;
				this.preparePopupMenuAccelerators(p);
				if (typeof p.openPopup=='undefined')
						p.showPopup(button, -1,-1,"context","bottomleft","topleft");
				else
						p.openPopup(button,'after_start', -1,-1,"context",false);
		}
	}

	this.awakeZombie = function (id) {
		const util = ZombieKeys.Util;
		for (let k=0; k<deadKeys.length; k++) {
			let aDeadKey = deadKeys[k];
			if (aDeadKey.id === id)
			{
				util.logDebugOptional("zombieCreation", "awakeZombie(" + id + ") matched keyCode: " + aDeadKey.keyCode + "\n\nZombiefy the dead key...");
				ZombieKeys.displayMapping(k);
				aDeadKey.menuFake = true;
				aDeadKey.alive = true; // activate modifiers
				break;
			}
		}
	}

	this.fakeAliveKey = function(id) {
		let target = document.commandDispatcher.focusedElement,
        theKey;
		// initKeyEvent(type, canBubble, cancelable, view, ctrlKey, altKey, shiftKey, metaKey, keyCode, charCode);
		// DOWN
		for (let k=0; k<aliveKeys.length; k++) {
			if (aliveKeys[k].id ===id)
				theKey=aliveKeys[k];
		}

		let keydown_event = document.createEvent("KeyboardEvent"); // KeyEvents
		keydown_event.initKeyEvent("keydown", true, true, null,
							 	theKey.modifiers.ctrlKey,
							 	theKey.modifiers.altKey,
							 	theKey.modifiers.shiftKey,
							 	false,
							 	theKey.keyCode,
							 	theKey.charCode);

		if (theKey)
		{
			this.insertAtCaret(target, theKey.target);
			return;
		}

		keydown_event.preventDefault();
		keydown_event.stopPropagation();

// UP
// 		var keyup_event = document.createEvent("KeyboardEvent");
// 		keyup_event.initKeyEvent("keyup", true, true, null,
// 							 	ctrl, alt, shift, false,
// 							 	keyCode, charCode); // .charCodeAt(0)
// 		target.dispatchEvent(keyup_event);
// 		if (debugLevel > 0) {ZombieKeys.Util.logToConsole("faking '"+chr+"': " + keyup_event.type + " + target: " + target.id + "\n", keyup_event);}
//


    }

	this.showContentTab = function(URL) {
		ZombieKeys.Util.openURL(URL);

		return true;

	}

	this.preparePopupMenuAccelerators = function(popupMenu) {
		const util = ZombieKeys.Util;
		function html_entity_decode(str) {
			try {
				let s = str.toString();
				util.logDebugOptional("entities","html_entity_decode(" + s + ")");
				let ss= s.substring(2,s.length-1);
				util.logDebugOptional("entities","substring = " + ss);

				return String.fromCharCode(ss);
			}
			catch(ex) {
				util.logToConsole("exception during html_entity_decode (" + s + ")");
				return str;
			}
		}

		// find owning button
		let currentLocale = this.getCurrentLocale();
		try {
			for (let b=0; b<popupMenu.children.length; b++) {
				let menuItem = popupMenu.children[b];
				if ( menuItem.tagName && menuItem.tagName==='menuitem'
					&&
					 (!menuItem.getAttribute('zk_locale') || menuItem.getAttribute('zk_locale') !== currentLocale)
					&&
					 menuItem.id
					&&
					 (0 === menuItem.id.indexOf('zombiekeys-deadkey') ||  0 === menuItem.id.indexOf('zombiekeys-alivekey') )
					 )
				{
					menuItem.setAttribute('zk_locale', currentLocale);
					// change the content by finding the last occurence of triple spaces and truncating the string.
					let i = menuItem.label.indexOf('  ');
					if (i > 0) {
						// cut off any hard coded accelerators
						menuItem.label = menuItem.label.substring(0, i);
					}

					let acceleratorText = "",
					    cmd = menuItem.getAttribute('oncommand'),
					    j;

					if (cmd) {
						j = cmd.indexOf('awakeZombie(');
						if (j>0) {
							// add accelerator from locale
							try {
								let dZ = parseInt( cmd.substring(j+12), 10); // 12 = length ( 'awakeZombie(' )
								if (!isNaN(dZ)) {
									dZ--;
									let dk = deadKeys[dZ],
									    keyStringDisplay = ZombieKeys.currentLayout.map_deadKeys[dZ].key;
									// convert entities to viewable characters:
									if (keyStringDisplay.length>1
									 && keyStringDisplay.substr(0,1)=='&'
									 && keyStringDisplay.substr(1,1)=='#')
									 {
										 keyStringDisplay = html_entity_decode (ZombieKeys.currentLayout.map_deadKeys[dZ].key.toString());
									 }

									// use the locale modifiers instead!
									if (dk.modifiers.ctrlKey)
										acceleratorText = acceleratorText + ZombieKeys.getResourceString('modifier.controlKey') + '+';
									if (dk.modifiers.shiftKey)
										acceleratorText = acceleratorText + ZombieKeys.getResourceString('modifier.shiftKey') + '+';
									if (dk.modifiers.altKey)
										acceleratorText = acceleratorText + ZombieKeys.getResourceString('modifier.altKey') + '+';
									acceleratorText = acceleratorText
											+ keyStringDisplay
									 		+ ' , ' + ZombieKeys.getResourceString('theKey');
								}
							}
							catch(ex) {
								util.logToConsole("exception during preparePopupMenuAccelerators (deadKeys[" + dZ + "]): " + ex.toString());
							};
						}
						else {
							j = cmd.indexOf('fakeAliveKey');
							if (j>0) {
								// add accelerator from locale
								try {
									let aZ = parseInt( cmd.substring(j+13), 10); // 13 = length ( 'awakeZombie(' )
									if (!isNaN(aZ)) {
										aZ--;
										let ak = aliveKeys[aZ];
										if (ak.modifiers.ctrlKey)
											acceleratorText = acceleratorText + ZombieKeys.getResourceString('modifier.controlKey') + '+';
										if (ak.modifiers.shiftKey)
											acceleratorText = acceleratorText + ZombieKeys.getResourceString('modifier.shiftKey') + '+';
										if (ak.modifiers.altKey)
											acceleratorText = acceleratorText + ZombieKeys.getResourceString('modifier.altKey') + '+';
										acceleratorText = acceleratorText + ZombieKeys.currentLayout.map_liveKeys[aZ].key;

									}
								}
								catch(ex) {
									util.logToConsole("exception during preparePopupMenuAccelerators (aliveKeys[" + aZ + "]): " + ex.toString());
								};

							}
						}

					}
					if (""!=acceleratorText)
						menuItem.setAttribute('acceltext', acceleratorText);

				}
			}
		}
		catch (ex) {
			alert(ex.toString());
		}

	}

  // expose all data structures for xbl
  this.DeadKeys = deadKeys;
	this.AliveKeys = aliveKeys;
	this.Layouts = layouts;
  this.LastAliveKeyDown =	lastAliveKeyDown;
	this.HexUnicodeKey = hexUnicodeKey;
	this.DecUnicodeModifiers = decUnicodeModifiers;
	this.DisableListeners = disableListeners; // this is a kludge to disable processing in the options window.
  // expose some functions:
	this.insertAtCaret = insertAtCaret;
	this.fakeKey = fakeKey;
	this.logKey = logKey;
	this.checkModifiers = checkModifiers;
};


if (window) {
	window.addEventListener("load", function() {setTimeout(
		function () {
			ZombieKeys.Util.checkVersionFirstRun();
			ZombieKeys.init(ZombieKeys);}
		,3000
	);}, false);
}
