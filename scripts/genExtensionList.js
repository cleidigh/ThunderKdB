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

const ext68CompDir = '..\\extensions-all\\exts-tb68-comp';
function genExtensionList() {
	let extsListFile = fs.readFileSync('extension-list-tb68-templ.md', 'utf8');
	let extRows = "";

	console.debug(extsListFile);
	// Create directory array
	let extsDirs = getDirectories(ext68CompDir);
	console.debug(extsDirs);
	extsDirs.map( dir => {
		let extJson = fs.readJSONSync(`${ext68CompDir}\\${dir}\\${dir}.json`);
		console.debug('Extension '+dir);
		return createExtMDTableRow(extJson);
	})
	.map( extRow => {
		console.debug('Row '+ extRow);
		extRows += extRow;
	});
	extsListFile = extsListFile.replace('__ext-table-tb68__', extRows);
	console.debug(extsListFile );
	fs.writeFileSync(`${ext68CompDir}\\extension-list-tb68.md`, extsListFile);

}

function createExtMDTableRow(extJson) {
	let row = "|";
	let default_locale = extJson.default_locale;
	if (default_locale === undefined) {
		default_locale = "en-US";
	}
	
	const name = extJson.name[default_locale];
	
	let summary = extJson.summary[default_locale].substr(0,42);
	summary = summary.replace(/\n/g, ' ');
	const srcLink = `[Src](${ext68CompDir}\\${extJson.id}-${extJson.slug}\\src)`
	const xpiLink = `[XPI](${ext68CompDir}\\${extJson.id}-${extJson.slug}\\xpi)`;
	// const srcLink = "s";
	row += `${extJson.id} | ${name} | ${summary} | ${srcLink} | ${xpiLink}|\n`;
	return row;
}

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)



console.debug('Generate ExtensionList:');
genExtensionList();
