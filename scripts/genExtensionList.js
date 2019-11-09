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



const cBadge_tb68 = "![Thunderbird 68 Compatible](https://img.shields.io/badge/68-%20cV-3bc059.png)"
const cBadge_tb68_pv = "![Thunderbird 68 Compatible](https://img.shields.io/badge/68-%20pV-green.png)"
const cBadge_tb69_plus = "![Thunderbird 68 Compatible](https://img.shields.io/badge/69+-%20cV-blue.png)"
const cBadge_tb60 = "![Thunderbird 68 Compatible](https://img.shields.io/badge/60-%20cV-darkgreen.png)"
const cBadge_tb60_pv = "![Thunderbird 68 Compatible](https://img.shields.io/badge/60-%20pV-darkgreen.png)"
const cBadge_tb61_plus = "![Thunderbird 68 Compatible](https://img.shields.io/badge/61+-%20cV-darkblue.png)"
const cBadge_maxv_star_warn = "![Thunderbird 68 Compatible](https://img.shields.io/badge/v*-%20!-orange.png)"
const cBadge_mx = "![Thunderbird 68 Compatible](https://img.shields.io/badge/MX-%20+-purple.png)"
const cBadge_legacy_rs = "![Thunderbird 68 Compatible](https://img.shields.io/badge/Leg-%20rs-purple.png)"
// const cBadge_legacy_bs = "![Thunderbird 68 Compatible](https://img.shields.io/badge/Leg-%20bs-40a156.png)"
const cBadge_legacy_bs = "![Thunderbird 68 Compatible](https://img.shields.io/badge/Leg-%20bs-purple.png)"


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

	// const srcLink = `[Src](https://github.com\\cleidigh\\ThunderKdB\\tree\\master\\${ext68CompDir}\\${extJson.id}-${extJson.slug}\\src)`
	const srcLink = `[Src](./${extJson.id}-${extJson.slug}/src)`
	// const name_link = `[${name}](./${extJson.id}-${extJson.slug}/${extJson.id}-${extJson.slug}-summary.html)`

	// https://github.com/cleidigh/ThunderKdB/tree/master/extensions-all/exts-tb68-comp/90003-localfolder/src
	const xpiLink = `[XPI](${extGroupTB68Dir}/${extJson.id}-${extJson.slug}/xpi)`;
	// const srcLink = "s";

	// const homepage_icon = "![ATN Homepage](/ThunderKdB/docs/images/home1.png)"
	const ext_homepage = extJson.url;
	const homepage_icon = `<a href="${ext_homepage}"><img src='/ThunderKdB/docs/images/home1.png' tooltip='test link' height='18px' width='18px' style="padding-bottom: -2px; padding-right: 6px;" /></a>`;
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


	if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp !== undefined) {
		console.debug(extJson.xpilib);
		compSet = extJson.xpilib.ext_comp;
		if (extJson.xpilib !== undefined && extJson.xpilib.ext_comp.comp68 === true) {
			comp_badges += cBadge_tb68;
		}
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

		if (compSet.compNoMax) {
			comp_badges += " " + cBadge_maxv_star_warn;
		}

		if (compSet.mext == true) {
			comp_badges += " " + cBadge_mx;
		}
		if (compSet.legacy == true && (compSet.legacy_type == 'xul' || compSet.legacy_type === undefined)) {
			comp_badges += " " + cBadge_legacy_rs;
		} else if (compSet.legacy == true && compSet.legacy_type == 'bootstrap') {
			comp_badges += " " + cBadge_legacy_bs;
		}
	}

	let targetGroupDir = "";

	if (comp_badges.includes(cBadge_tb68)) {
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

	// row += `${extJson.id} | ${name} | ${summary} | ${extJson.current_version.version} | ${extJson.current_version.files[0].created.split('T')[0]} | ${extJson.average_daily_users} | ${comp_badges} | 60.0 - 69.* |\n`;
	row += `${rank} | ${extJson.id} |  ${homepage_icon} ${name_link} | ${extJson.current_version.version.substr(0, 12)} | ${extJson.current_version.files[0].created.split('T')[0]} | ${extJson.average_daily_users} | ${v_min} | ${v_max} | ${comp_badges} |\n`;

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
