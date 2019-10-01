var request = require('request-promise-native');
const fs = require('fs-extra');
const download = require('download');
const url = require('url');
const path = require('path');
var GitHub = require('github-api');
var JSZip = require("jszip");
const _7z = require('7zip-min');


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

const cBadge_tb68 = "![Thunderbird 68 Compatible](https://img.shields.io/badge/68-%20cV-green.png)"
const cBadge_tb68_pv = "![Thunderbird 68 Compatible](https://img.shields.io/badge/68-%20pV-green.png)"
const cBadge_tb68_plus = "![Thunderbird 68 Compatible](https://img.shields.io/badge/69+-%20cV-blue.png)"
const cBadge_tb60 = "![Thunderbird 68 Compatible](https://img.shields.io/badge/60-%20cV-darkgreen.png)"
const cBadge_tb60_plus = "![Thunderbird 68 Compatible](https://img.shields.io/badge/61+-%20cV-darkblue.png)" 
const cBadge_maxv_star_warn = "![Thunderbird 68 Compatible](https://img.shields.io/badge/v*-%20!-orange.png)"
const cBadge_mx = "![Thunderbird 68 Compatible](https://img.shields.io/badge/MX-%20+-purple.png)"

function genExtensionListFromFolders() {
	let extsListFile = fs.readFileSync('extension-list-tb68-templ.md', 'utf8');
	let extRows = "";

	console.debug(extsListFile);
	// Create directory array
	let extsDirs = getDirectories(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}/`);
	console.debug(extsDirs);
	extsDirs.map( dir => {
		let extJson = fs.readJSONSync(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}/${dir}/${dir}.json`);
		console.debug('Extension '+dir+' '+extJson.id);
		return createExtMDTableRow(extJson);
	})
	.map( extRow => {
		console.debug('Row '+ extRow);
		extRows += extRow;
	});
	extsListFile = extsListFile.replace('__ext-table-tb68__', extRows);
	console.debug(extsListFile );
	fs.writeFileSync(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}/extension-list-tb68.md`, extsListFile);
	console.debug('Done');
}


function genExtensionListFromJson(extsJson) {

	// let extsListFile = fs.readFileSync('extension-list-all-templ.md', 'utf8');
	let extsListFile = fs.readFileSync('extension-list-tb68-templ.md', 'utf8');
	// let extsListFile = fs.readFileSync('extension-list-tb60-templ.md', 'utf8');
	
	let extRows = "";

	// console.debug(extsListFile);

	extsJson.map( (extJson, index) => {
		console.debug('ExtensionIndex ' + index);

		if (extJson  === null) {
			return "";
		}
		// console.debug('Extension ' + extJson.id);

		extJson.xpilib = {};
		extJson.xpilib.rank = index+1;
		return createExtMDTableRow(extJson);
	})
	.map( extRow => {
		// console.debug('Row '+ extRow);
		extRows += extRow;
	});
	extsListFile = extsListFile.replace('__ext-table-tb68__', extRows);
	// console.debug(extsListFile );
	fs.writeFileSync(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}/extension-list-tb68.md`, extsListFile);
	// fs.writeFileSync(`${rootDir}/${extGroupAllDir}/extension-list-all.md`, extsListFile);
	// fs.writeFileSync(`${rootDir}/${extGroupAllDir}/${extGroupTB60Dir}/extension-list-tb60.md`, extsListFile);

	console.debug('Done');
}

function createExtMDTableRow(extJson) {
	let row = "|";
	let default_locale = extJson.default_locale;
	console.debug('name: '+ JSON.stringify(extJson.name) + '  '+default_locale);
	if (default_locale === undefined) {
		console.debug('NoLocale: '+ extJson.name);
		if (typeof extJson.name["en-US"]  === 'string'){
			default_locale = "en-US";
		} else {
			let locales = Object.keys(extJson.name);
			console.debug('Locales: '+locales);
			default_locale = extJson.name[locales[0]];
			console.debug('Locale 0: '+default_locale);
		}
	} else {
		if (typeof extJson.name["en-US"]  !== 'string'){
			let locales = Object.keys(extJson.name);
			console.debug('Locales: '+locales);
			default_locale = locales[0];
			console.debug('Locale 0: '+default_locale);
		}
	}
	
	const name = extJson.name[default_locale].substr(0,38);
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
	
	let v_min = `${extJson.current_version.compatibility.thunderbird.min}`;
	let v_max = `${extJson.current_version.compatibility.thunderbird.max}`;
	let mext = extJson.current_version.files[0].is_webextension;

	const p = /[\d\.]+/;
	let v_max_num = p.exec(v_max);
	let v_min_num = p.exec(v_min);

	console.debug('versions '+ Number(v_max) + " n: "+v_max_num + " ME "+mext);
	
	let comp_badges =" ";
	const  tb68_threshold_date = new Date("2019-2-1");

	if (v_min_num <= 68 && v_max_num >= 68) {
		comp_badges += cBadge_tb68;
	} else if (mext && v_max !== "*" && v_max_num >= 68) {
		comp_badges += cBadge_tb68;
		
	} else if (mext && v_max === "*" && v_min_num >= 61) {
		comp_badges += cBadge_tb68;
	} else if (mext && v_max === "*" && ( new Date(extJson.current_version.files[0].created.split('T')[0]) > tb68_threshold_date) ) {
		comp_badges += cBadge_tb68;
	}


	if (v_max_num >= 69) {
		comp_badges += " " + cBadge_tb68_plus;
	}

	if (v_min_num <= 60 && (v_max_num >= 60 || v_max === "*") ) {
		comp_badges += " " + cBadge_tb60;
		if (v_max_num >= 61 && v_max_num < 68) {
			comp_badges += " " + cBadge_tb60_plus;
		}
	}

	if (v_max  ===  "*") {
		comp_badges += " " + cBadge_maxv_star_warn;
	}

	if (mext == true) {
		comp_badges += " " + cBadge_mx;
	}

	let targetGroupDir = "";

	if (comp_badges.includes(cBadge_tb68) ) {
		targetGroupDir = extGroupTB68Dir;

	} else if (comp_badges.includes(cBadge_tb60)) {
		targetGroupDir = extGroupTB60Dir;
	} else {
		targetGroupDir = extGroupTBOtherDir;
	}

	// const extRootName = `${addon_identifier}-${ext.slug}`;
	// const extRootDir = `${rootDir}/${extGroupAllDir}/${targetGroupDir}/${extRootName}`;

	// const name_link = `[${name}](/${extGroupAllDir}/${targetGroupDir}/${extJson.id}-${extJson.slug}/${extJson.id}-${extJson.slug}-summary.html)`
	const name_link = `[${name}](/${repoRoot}/${extGroupAllDir}/${targetGroupDir}/${extJson.id}-${extJson.slug}/${extJson.id}-${extJson.slug}-summary.html)`


	// vision filters
	// if ( !(comp_badges.includes(cBadge_tb60) || comp_badges.includes(cBadge_tb68)) ) {
	// 	return "";
	// }

	// target 60
	// if ( !(comp_badges.includes(cBadge_tb60)) || comp_badges.includes(cBadge_tb68))  {
	// 	return "";
	// }

	if ( !(comp_badges.includes(cBadge_tb68) ) ) {
		return "";
	}

	let rank = extJson.xpilib.rank;
	
	// row += `${extJson.id} | ${name} | ${summary} | ${extJson.current_version.version} | ${extJson.current_version.files[0].created.split('T')[0]} | ${extJson.average_daily_users} | ${comp_badges} | 60.0 - 69.* |\n`;
	row += `${rank} | ${extJson.id} | ${name_link} | ${extJson.current_version.version.substr(0,12)} | ${extJson.current_version.files[0].created.split('T')[0]} | ${extJson.average_daily_users} | ${v_min} | ${v_max} | ${comp_badges} |\n`;
	
	return row;
}

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)



console.debug('Generate ExtensionList:');

let extsJson = fs.readJSONSync(extsAllJsonFileName);
// genExtensionListFromFolders();
genExtensionListFromJson(extsJson);
