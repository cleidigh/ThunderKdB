var request = require('request-promise-native');
const fs = require('fs-extra');
const download = require('download');
const url = require('url');
const path = require('path');
var GitHub = require('github-api');
var JSZip = require("jszip");
const _7z = require('7zip-min');
const xml_util = require('./xml-util.js');


// Create directory array
// Map directory walk
// Read extension json
// Read ExtensionList template
// Create extension entry row
// Id | Name | Description | Source | XPI |

const rootDir = "C:/Dev/Thunderbird/ThunderKdB";
const repoRoot = "/ThunderKdB";
const extGroupAllDir = 'xall';
const extGroupTB68Dir = 'x68';
const extGroupTB60Dir = 'x60';
const extGroupTBOtherDir = 'xOther';

const ext68CompDirU = '/extensions-all/exts-tb68-comp';


const extsAllJsonFileName = `${rootDir}/xall/xall.json`;

let ext_exdata = [
	// {id: 324492, slug: "importexporttools", alt_ext_tb68: 986686, adoptme: false, fWIP: false, alt_ext_tb68_tooltip: "ImportExportTools NG : Alternate Fork", bLink: '#986686-importexporttools-ng'},
	{id: 4394, slug: "stationary", alt_ext_tb68: 324497, adoptme: true, fWIP: false, alt_ext_tb68_tooltip: "SmartTemplates4", bLink: "#324497-smarttemplate4"},
	{id: 881, slug: "display-quota", alt_ext_tb68: 505906, adoptme: false, fWIP: false, alt_ext_tb68_tooltip: "IMAP Quota (Free Space)", bLink: "#505906-imap-quota-free-space"},
	// {id: 330424, slug: "printingtools", alt_ext_tb68: -1, adoptme: false, fWIP: true},
	{id: 5582, slug: "confirm-address-5582", alt_ext_tb68: 986279, adoptme: false, fWIP: false, alt_ext_tb68_tooltip: "Confirm Address2", bLink: "#986279-confirm-address2"},
	// {id: , slug: "", alt_ext_68: , adoptme: false, fWIP: false},
	{id: 634298, slug: "cardbook", alt_ext_tb68: -1, adoptme: false, help_maintainer: false, fWIP: false},
	// {id: 2487, slug: "nostalgy", alt_ext_tb68: -1, adoptme: false, fWIP: true},
	{id: 508686, slug: "just_restart", alt_ext_tb68: -1, adoptme: false, fWIP: true},

];

const cBadge_alt_ext_tb68_setup = { bLeftText: '68', bRightText: 'Alt%20+', bColor: 'brightgreen', bTooltip: '', badgeBasedURL: 'https://img.shields.io/badge/'};

const cBadge_tb78p_setup = { bLeftText: '78', bRightText: '%20cV', bColor: 'orange', bTooltip: 'Current Version: TB78 Compatible', badgeBasedURL: 'https://img.shields.io/badge/'};
const cBadge_tb78_pv_setup = { bLeftText: '78', bRightText: '%20pV', bColor: 'orange', bTooltip: 'Prior Version: TB78 Compatible', badgeBasedURL: 'https://img.shields.io/badge/'};


const cBadge_tb68_setup = { bLeftText: '68', bRightText: '%20cV', bColor: 'brightgreen', bTooltip: 'Current Version: TB68 Compatible', badgeBasedURL: 'https://img.shields.io/badge/'};
const cBadge_tb68_pv_setup = { bLeftText: '68', bRightText: '%20pV', bColor: 'green', bTooltip: 'Prior Version: TB68 Compatible', badgeBasedURL: 'https://img.shields.io/badge/'};

const cBadge_tb60_setup = { bLeftText: '60', bRightText: '%20cV', bColor: 'darkgreen', bTooltip: 'Current Version: TB60 Compatible', badgeBasedURL: 'https://img.shields.io/badge/'};
const cBadge_tb60_pv_setup = { bLeftText: '60', bRightText: '%20pV', bColor: 'darkgreen', bTooltip: 'Prior Version: TB60 Compatible', badgeBasedURL: 'https://img.shields.io/badge/'};

const cBadge_tb78p = makeBadgeElement(cBadge_tb78p_setup);
const cBadge_tb78_pv = makeBadgeElement(cBadge_tb78_pv_setup);

const cBadge_tb68 = makeBadgeElement(cBadge_tb68_setup);
const cBadge_tb68_pv = makeBadgeElement(cBadge_tb68_pv_setup);

const cBadge_tb60 = makeBadgeElement(cBadge_tb60_setup);
const cBadge_tb60_pv = makeBadgeElement(cBadge_tb60_pv_setup);
 
// const cBadge_tb68_pv = "![Thunderbird 68 Compatible](https://img.shields.io/badge/68-%20pV-green.png)"
// const cBadge_tb69_plus = "![Thunderbird 68 Compatible](https://img.shields.io/badge/69+-%20cV-blue.png)"
const cBadge_tb69_plus = makeBadgeElement({ bLeftText: '69+', bRightText: '%20cV', bColor: 'blue', bTooltip: 'Current Version: TB69+ Compatible', badgeBasedURL: 'https://img.shields.io/badge/'});
const cBadge_tb61_plus = makeBadgeElement({ bLeftText: '61+', bRightText: '%20cV', bColor: 'blue', bTooltip: 'Current Version: TB61+ Compatible', badgeBasedURL: 'https://img.shields.io/badge/'});

// const cBadge_tb60 = "![Thunderbird 68 Compatible](https://img.shields.io/badge/60-%20cV-darkgreen.png)"
// const cBadge_tb60_pv = "![Thunderbird 68 Compatible](https://img.shields.io/badge/60-%20pV-darkgreen.png)"
// const cBadge_tb61_plus = "![Thunderbird 68 Compatible](https://img.shields.io/badge/61+-%20cV-darkblue.png)"
const cBadge_maxv_star_warn = "![Thunderbird 68 Compatible](https://img.shields.io/badge/v*-%20!-orange.png)"
// const cBadge_mx = "![Thunderbird 68 Compatible](https://img.shields.io/badge/MX-%20+-purple.png)"

var cBadge_type_setup = { bLeftText: 'Type', bRightText: '', bColor: 'purple', bTooltip: '', badgeBasedURL: 'https://img.shields.io/badge/'};
const cBadge_mx = makeBadgeElement({ bLeftText: 'MX', bRightText: '%20+', bColor: 'purple', bTooltip: 'MailExtension (has manifest.json)', badgeBasedURL: 'https://img.shields.io/badge/'});

var cBadge_webexp_setup = { bLeftText: 'WebExp', bRightText: '%20+', bColor: 'blue', bTooltip: 'MailExtension WebExperiment API (Click for manifest)', badgeBasedURL: 'https://img.shields.io/badge/'};

// const cBadge_legacy_rs = "![Thunderbird 68 Compatible](https://img.shields.io/badge/Leg-%20rs-purple.png)"
const cBadge_legacy_rs = makeBadgeElement({ bLeftText: 'Leg', bRightText: '%20rs', bColor: 'purple', bTooltip: 'Legacy - Requires Restart', badgeBasedURL: 'https://img.shields.io/badge/'});
const cBadge_legacy_bs = makeBadgeElement({ bLeftText: 'Leg', bRightText: '%20bs', bColor: 'purple', bTooltip: 'Legacy - Bootstrap', badgeBasedURL: 'https://img.shields.io/badge/'});

// const cBadge_legacy_bs = "![Thunderbird 68 Compatible](https://img.shields.io/badge/Leg-%20bs-purple.png)"
// const cBadge_tb60_date_warning = "![Thunderbird 68 Compatible](https://img.shields.io/badge/60cV-%20Date%20Warning-darkyellow.png)"
const cBadge_tb60_date_warning = makeBadgeElement({ bLeftText: '60cV', bRightText: 'Date Warning', bColor: 'yellow', bTooltip: 'Created before 60ESR - Compatibility Questionable', badgeBasedURL: 'https://img.shields.io/badge/'});


// const cBadge_alt_ext_68 = "![Thunderbird 68 Compatible](https://img.shields.io/badge/Alt%2068-%20+-brightgreen.png)"
// const cBadge_wip_fork = "![Thunderbird 68 Compatible](https://img.shields.io/badge/WIP-%20Fork-blue.png)"
const cBadge_wip_fork =  makeBadgeElement({ bLeftText: 'WIP', bRightText: 'Fork', bColor: 'blue', bTooltip: 'Work In Progress: Extension Fork', badgeBasedURL: 'https://img.shields.io/badge/'});

// const cBadge_help_adoptme = "![Thunderbird 68 Compatible](https://img.shields.io/badge/Help-AdoptMe-darkred.png)"
const cBadge_help_adoptme = makeBadgeElement({ bLeftText: 'Help', bRightText: 'Adopt%20Me', bColor: 'darkred', bTooltip: 'Help Wanted: Adopt this Extension', badgeBasedURL: 'https://img.shields.io/badge/'});
const cBadge_help_maintainer = makeBadgeElement({ bLeftText: 'Help', bRightText: 'Maintainer', bColor: 'darkred', bTooltip: 'Help Wanted: Maintainer Help for this Extension', badgeBasedURL: 'https://img.shields.io/badge/'});

// const cBadge_help_maintainer = "![Thunderbird 68 Compatible](https://img.shields.io/badge/Help-Maintainer-darkred.png)"


// function makeBadgeElement(bLink, badge, bLeftText, bRightText, bColor) {
	function makeBadgeElement(bOpt) {
		var badgeBase = `<a href='${bOpt.bLink}' ><img src='${bOpt.badgeBasedURL}/${bOpt.bLeftText}-${bOpt.bRightText}-${bOpt.bColor}.png' title='${bOpt.bTooltip}'></a>`;
	
		return badgeBase;
}

var reports = {
	all: {
		baseReportName: "extension-list-all",
		reportFilter: null
	},
	tb60Only: {
		baseReportName: "extension-list-tb60",
		 reportFilter: function (extJson) {
			// target 60 - !68
			let compSet = extJson.xpilib.ext_comp;
			// console.debug('reportFilter ' + extJson.id + ' '+ JSON.stringify(extJson.current_version));
			console.debug('reportFilter ' + extJson.id + ' '+ JSON.stringify(extJson.current_version.files[0].created));
	
			console.debug(`comp ${compSet} `);
			if ( (compSet.comp60 || compSet.comp60pv) && (!compSet.comp68 && !compSet.comp68pv )) {
				console.debug('True');
				return true;
			} else {
				return false;
			}
		}
	},
	tb60: {
		baseReportName: "extension-list-tb60all",
		reportFilter: function (extJson) {
			// target 60 - !68
			let compSet = extJson.xpilib.ext_comp;
			console.debug('reportFilter 60 all' + extJson.id + ' '+ JSON.stringify(extJson.current_version.files[0].created));
			console.debug(`comp ${compSet} `);
			if ( (compSet.comp60 || compSet.comp60pv) ) {
				console.debug('True');
				return true;
			} else {
				return false;
			}
		}
	},
	tb68: {
		baseReportName: "extension-list-tb68",
		reportFilter: function (extJson) {
			// target 60 - !68
			let compSet = extJson.xpilib.ext_comp;
			console.debug(`comp ${compSet} `);
			if ( (compSet.comp68 || compSet.comp68pv) ) {
				console.debug('True');
				return true;
			} else {
				return false;
			}
		}
	},
	tbmx: {
		baseReportName: "extension-list-tbmx",
		reportFilter: function (extJson) {
			let compSet = extJson.xpilib.ext_comp;

			
			console.debug(`comp ${compSet} `);
			if ( (compSet.comp78plus || compSet.comp78pv) ) {
				compSet.comp61plus = false;
				compSet.comp69plus = false;
				compSet.comp60pv = false;
				compSet.comp60 = false;
				compSet.comp68pv = false;
				extJson.xpilib.ext_comp.comp68 = false;
				if (compSet.comp78plus && compSet.comp78pv) {
					compSet.comp78pv = false;
				}
				
				console.debug('True');
				return true;
			} else {
				return false;
			}
		}
	},
	
	recentActivity: {
		baseReportName: "extension-list-recent-activity",
		reportFilter: function (extJson) {
			// console.debug(extJson);
			console.debug('reportFilter recent' + extJson.id + ' '+ JSON.stringify(extJson.current_version.files[0].created));
			// return false;

			let c = extJson.current_version.id;
			console.debug(c);
			c = extJson.current_version.files[0].created;
			console.debug(c);
			let cv = new Date(c);
			let today = new Date();
			const msDay = 24*60*60*1000;
			console.debug('current '+cv);
			console.debug('today '+today);

			console.debug('current subtracted'+ (today-(14 * msDay)));
			let d = (today-cv)/msDay;
			console.debug('DaysOld '+d );
			if (d <= 14) {
				console.debug('CurrentTrue');
				return true;
			} else {
				return false;
			}
		}
	},


}

function genExtensionListFromFolders() {
	let extsListFile = fs.readFileSync('extension-list-tb68-templ.md', 'utf8');
	let extRows = "";

	console.debug(extsListFile);
	// Create directory array
	let extsDirs = getDirectories(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}/`);
	console.debug(extsDirs);
	extsDirs.map(dir => {
		let extJson = fs.readJSONSync(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}/${dir}/${dir}.json`);
		console.debug('Extension ' + dir + ' ' + extJson.id);
		return createExtMDTableRow(extJson);
	})
		.map(extRow => {
			console.debug('Row ' + extRow);
			extRows += extRow;
		});
	extsListFile = extsListFile.replace('__ext-table-tb68__', extRows);
	console.debug(extsListFile);
	fs.writeFileSync(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}/extension-list-tb68.md`, extsListFile);
	console.debug('Done');
}


function genExtensionListFromJson(extsJson, report) {

	let listBaseName = report.baseReportName;

	let extsListFile = fs.readFileSync(`${listBaseName}-templ.md`, 'utf8');
	// let extsListFile = fs.readFileSync('extension-list-tb68-templ.md', 'utf8');
	// let extsListFile = fs.readFileSync('extension-list-tb60-templ.md', 'utf8');
	// let extsListFile = fs.readFileSync('extension-list-tb60all-templ.md', 'utf8');

	let extRows = "";
	let rows = 0;
	// console.debug(extsListFile);

	extsJson.map((extJson, index) => {
		console.debug('Extension ' + extJson.id + ' Index: '+index);


		if (extJson === null) {
			return "";
		}
		// 
		if (extJson.xpilib === undefined) {
			console.debug('Compatibility UD: ' + extJson.id);
			console.debug(extJson);
			extJson.xpilib = {};
			extJson.xpilib.ext_comp = {compOther: true};

		} else {
		console.debug('Extension ' + extJson.id + ' '+ JSON.stringify(extJson.xpilib.ext_comp));

		}
		// console.debug(extJson.xpilib);
		extJson.xpilib.rank = index + 1;

		let row = "";
		if (report.reportFilter === null || report.reportFilter(extJson)) {
		
			// console.debug('Row '+ report.reportFilter(extJson.xpilib));
			row = createExtMDTableRow(extJson);
			if (row != "") {
				rows++;

			}
		} else {
			console.debug('Skip '+ extJson.slug);
		}

		return row;
	})
		.map(extRow => {
			// console.debug('Row '+ extRow);
			extRows += extRow;
		});

	console.debug('ListRows ' + rows);
	extsListFile = extsListFile.replace('__count__', rows);
	let today = new Date().toISOString().split('T')[0];
	extsListFile = extsListFile.replace('__date__', today);
	extsListFile = extsListFile.replace('__ext-md-table__', extRows);
	console.debug(extsListFile);
	fs.writeFileSync(`${rootDir}/${extGroupAllDir}/${listBaseName}.md`, extsListFile);
	// fs.writeFileSync(`${rootDir}/${extGroupAllDir}/extension-list-all.md`, extsListFile);
	// fs.writeFileSync(`${rootDir}/${extGroupAllDir}/${extGroupTB60Dir}/extension-list-tb60.md`, extsListFile);
	// fs.writeFileSync(`${rootDir}/${extGroupAllDir}/${extGroupTB60Dir}/extension-list-tb60all.md`, extsListFile);

	console.debug('Done');
}

function createExtMDTableRow(extJson) {
	let row = "|";
	let default_locale = extJson.default_locale;
	// console.debug('name: ' + JSON.stringify(extJson.name) + '  ' + default_locale);
	if (default_locale === undefined) {
		// console.debug('NoLocale: ' + extJson.name);
		if (typeof extJson.name["en-US"] === 'string') {
			default_locale = "en-US";
		} else {
			let locales = Object.keys(extJson.name);
			// console.debug('Locales: ' + locales);
			default_locale = extJson.name[locales[0]];
			// console.debug('Locale 0: ' + default_locale);
		}
	} else {
		if (typeof extJson.name["en-US"] !== 'string') {
			let locales = Object.keys(extJson.name);
			// console.debug('Locales: ' + locales);
			default_locale = locales[0];
			// console.debug('Locale 0: ' + default_locale);
		}
	}

	const name = extJson.name[default_locale].substr(0, 38);
	const name_full = extJson.name[default_locale];

	let summary;
	// let summary = extJson.summary[default_locale].substr(0,42);
	// summary = summary.replace(/\n/g, ' ');

	const idSlug =  `${extJson.id}-${extJson.slug}`;
	
	// const srcLink = `[Src](https://github.com\\cleidigh\\ThunderKdB\\tree\\master\\${ext68CompDir}\\${extJson.id}-${extJson.slug}\\src)`
	const srcLink = `[Src](./${extJson.id}-${extJson.slug}/src)`
	// const name_link = `[${name}](./${extJson.id}-${extJson.slug}/${extJson.id}-${extJson.slug}-summary.html)`

	// https://github.com/cleidigh/ThunderKdB/tree/master/extensions-all/exts-tb68-comp/90003-localfolder/src
	const xpiLink = `[XPI](${extGroupTB68Dir}/${extJson.id}-${extJson.slug}/xpi)`;
	// const srcLink = "s";

	// const homepage_icon = "![ATN Homepage](/ThunderKdB/docs/images/home1.png)"
	const ext_homepage = extJson.url;
	const homepage_icon = `<a id="${idSlug}" href="${ext_homepage}"><img src='/ThunderKdB/docs/images/home1.png' tooltip='test link' height='18px' width='18px' style="padding-bottom: -2px; padding-right: 6px;" /></a>`;
	// const homepage_icon = `[[ATN Homepage](/ThunderKdB/docs/images/home1.png)](${ext_homepage})`;
	// const homepage_icon = `![ATN Homepage](/ThunderKdB/docs/images/home1.png)`;

	let v_min = `${extJson.current_version.compatibility.thunderbird.min}`;
	let v_max = `${extJson.current_version.compatibility.thunderbird.max}`;
	let mext = extJson.current_version.files[0].is_webextension;

	const p = /[\d\.]+/;
	let v_max_num = p.exec(v_max);
	let v_min_num = p.exec(v_min);

	// console.debug('versions ' + Number(v_max) + " n: " + v_max_num + " ME " + mext);

	let comp_badges = " ";
	const tb68_threshold_date = new Date("2019-2-1");

	
	if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp78plus === true) {
		comp_badges += cBadge_tb78p;
	}

	if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp78pv === true) {
		comp_badges += cBadge_tb78_pv;
	}

	if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp !== undefined) {
		console.debug(extJson.xpilib);
		compSet = extJson.xpilib.ext_comp;
		if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp68 === true) {
			comp_badges += cBadge_tb68;
		}
		ext_exdata.forEach(ext_x => {
			if (ext_x.id === extJson.id) {
				
				if (ext_x.alt_ext_tb68 !== -1) {
					cBadge_alt_ext_tb68_setup.bTooltip = ext_x.alt_ext_tb68_tooltip;
					cBadge_alt_ext_tb68_setup.bLink = ext_x.bLink;
					cBadge_alt_ext_tb68 = makeBadgeElement(cBadge_alt_ext_tb68_setup);
					comp_badges += " " + cBadge_alt_ext_tb68;
				}
			}
		});


		if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp68pv === true) {
			comp_badges += cBadge_tb68_pv;
		}
		if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp69plus === true) {
			comp_badges += " " + cBadge_tb69_plus;
		}

		if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp60 === true) {
			comp_badges += " " + cBadge_tb60;
		}
		if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp60pv === true) {
			comp_badges += " " + cBadge_tb60_pv;
		}
		if (extJson.xpilib.ext_comp.comp61plus === true && !(compSet.comp68 || compSet.comp68pv)) {
			comp_badges += " " + cBadge_tb61_plus;
		}

		// if (compSet.compNoMax) {
		// 	comp_badges += " " + cBadge_maxv_star_warn;
		// }

		comp_type = [];
		cBadge_type_setup.bTooltip = "Extension Type :";

		if (compSet.mext == true) {
			// comp_badges += " " + cBadge_mx;
			comp_type.push("MX");
			cBadge_type_setup.bTooltip += "&#10; - MX : MailExtension (manifest.json)";
			console.debug('male extent type ');
		}


		if (compSet.legacy == true && (compSet.legacy_type == 'xul' || compSet.legacy_type === undefined)) {
			// comp_badges += " " + cBadge_legacy_rs;
			comp_type.push("RS");
			cBadge_type_setup.bTooltip += "&#10; - RS : Legacy, Requires Restart";
		} else if (compSet.legacy == true && compSet.legacy_type == 'bootstrap') {
			// comp_badges += " " + cBadge_legacy_bs;
			comp_type.push("BS");
			cBadge_type_setup.bTooltip += "&#10; - RS : Legacy, Bootstrap";
		}
		cBadge_type_setup.bRightText = comp_type.join(',');
		// if (comp_type  ===  [] && compSet.comp_other) {
			console.debug(comp_type);
			if (comp_type.length === 0 ) {
			cBadge_type_setup.bRightText = "Legacy";
			cBadge_type_setup.bTooltip = "Legacy";
		}

		let cBadge_type = makeBadgeElement(cBadge_type_setup);
		console.debug('types '+ cBadge_type.bRightText);
		comp_badges += " " + cBadge_type;

		if (extJson.xpilib.ext_comp.webexp) {
			// cBadge_webexp_setup.bTooltip = "test";
			let manifestPath = `..\\xall\\x68\\${extJson.id}-${extJson.slug}\\src\\manifest.json`;
			console.debug(manifestPath);

			cBadge_webexp_setup.bLink = manifestPath;
			cBadge_webexp_setup.bTooltip = "Click for manifest.json&#010;SchemaNames:&#010;";

			if (extJson.xpilib.ext_comp.webexpSchemaNames.includes("WindowsListener")) {
				cBadge_webexp_setup.bLeftText = "WinLAPI"
			}

			var	schema = extJson.xpilib.ext_comp.webexpSchemaNames;
			console.debug('schema names '+ extJson.slug);
			console.debug(schema);

			if (schema) {
				console.debug('SchemaSet');
				cBadge_webexp_setup.bTooltip += "&#10;";
				let max =  Math.min(schema.length, 14);
				console.debug(max);
				for (let index = 0; index < max; index++) {
					const element = schema[index];
					// cBadge_webexp_setup.bTooltip += (element + "&#10;");
					cBadge_webexp_setup.bTooltip += (element + "&#10;" );
					
					console.debug(element);
				};

				if (extJson.xpilib.ext_comp.webexpSchemaNames.length > 15) {
					cBadge_webexp_setup.bTooltip += "&#10;...";
				}


			}

			console.debug(cBadge_webexp_setup.bTooltip);
			cBadge_webexp = makeBadgeElement(cBadge_webexp_setup);

			
			comp_badges += " " + cBadge_webexp;
			
			console.debug(comp_badges);
		}

		if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp60 === true && extJson.xpilib.ext_comp.comp60OldDate === true) {
			comp_badges += " " + cBadge_tb60_date_warning;
		}
		
		ext_exdata.forEach(ext_x => {
			if (ext_x.id === extJson.id) {
				// if (ext_x.alt_ext_68 !== -1) {
				// 	cBadge_alt_ext_tb68_setup.bTooltip = ext_x.alt_ext_tb68_tooltip;
				// 	cBadge_alt_ext_tb68_setup.bLink = ext_x.bLink;
				// 	cBadge_alt_ext_tb68 = makeBadgeElement(cBadge_alt_ext_tb68_setup);
				// 	comp_badges += " " + cBadge_alt_ext_68;
				// }

				if (ext_x.fWIP) {
					comp_badges += " " + cBadge_wip_fork;
				}
				if (ext_x.adoptme) {
					comp_badges += " " + cBadge_help_adoptme;
				}
				if (ext_x.help_maintainer) {
					comp_badges += " " + cBadge_help_maintainer;
				}
			}
		});

	}

	let targetGroupDir = "";

	if (comp_badges.includes(cBadge_tb68) || comp_badges.includes(cBadge_tb78p)) {
		targetGroupDir = extGroupTB68Dir;

	} else if (comp_badges.includes(cBadge_tb60)) {
		targetGroupDir = extGroupTB60Dir;
	} else {
		targetGroupDir = extGroupTBOtherDir;
	}

	
	// const extRootName = `${addon_identifier}-${ext.slug}`;
	// const extRootDir = `${rootDir}/${extGroupAllDir}/${targetGroupDir}/${extRootName}`;

	// const name_link = `[${name}](/${extGroupAllDir}/${targetGroupDir}/${extJson.id}-${extJson.slug}/${extJson.id}-${extJson.slug}-summary.html)`
	const name_link = `[${name}](${repoRoot}/${extGroupAllDir}/${targetGroupDir}/${extJson.id}-${extJson.slug}/${extJson.id}-${extJson.slug}-details.html)`


	let rank = extJson.xpilib.rank;

	// cleidigh fixup for prior versions
	if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp78pv === true) {
		console.debug('Pope prior version route ' + extJson.slug);
		console.debug(`${extJson.xpilib.ext_comp.comp78pv_version}`);
		row += `${rank} | ${extJson.id} |  ${homepage_icon} ${name_link} | ${extJson.xpilib.ext_comp.comp78pv_version} | ${extJson.current_version.files[0].created.split('T')[0]} | ${extJson.average_daily_users} | ${v_min} | ${v_max} | ${comp_badges} |\n`;
		console.debug(row);
	} else {
		row += `${rank} | ${extJson.id} |  ${homepage_icon} ${name_link} | ${extJson.current_version.version.substr(0, 12)} | ${extJson.current_version.files[0].created.split('T')[0]} | ${extJson.average_daily_users} | ${v_min} | ${v_max} | ${comp_badges} |\n`;

	}


	return row;
}

const getDirectories = source =>
	fs.readdirSync(source, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name)



console.debug('Generate ExtensionList:');

let extsJson = fs.readJSONSync(extsAllJsonFileName);
// genExtensionListFromFolders();
genExtensionListFromJson(extsJson, reports.tb68);
genExtensionListFromJson(extsJson, reports.tb60);
genExtensionListFromJson(extsJson, reports.tb60Only);
genExtensionListFromJson(extsJson, reports.all);
genExtensionListFromJson(extsJson, reports.recentActivity);
genExtensionListFromJson(extsJson, reports.tbmx);