
var Git = require("nodegit");
const fs = require('fs-extra');
const download = require('download');
const url = require('url');
const path = require('path');
var JSZip = require("jszip");
const _7z = require('7zip-min');
var extract = require('extract-zip')

const rootDir = "C:/Dev/Thunderbird/ThunderKdB";
const extGroupAllDir = 'xall';
const extGroupTB68Dir = 'x68';
const extGroupTB60Dir = 'x60';
const extGroupTBOtherDir = 'xOther';
const extsAllJsonFileName = `${rootDir}/xall/xall.json`;



const getDirectories = source =>
	fs.readdirSync(source, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name)

function fileUnzip(source, options) {
	extract(source, options, function (err) {
		// extraction is complete. make sure to handle the err
		console.debug('extract done: ' + err);
	});
}



var getMostRecentCommit = function (repository) {
	return repository.getBranchCommit("master");
};

var getCommitMessage = function (commit) {
	return commit.message();
};

// Git.Repository.open("..\\")
// 	.then(getMostRecentCommit)
// 	.then(getCommitMessage)
// 	.then(function (message) {
// 		console.log(message);
// 	});

async function downloadURL(url, destFile) {
	await download(url, `${destFile}`);
	// console.log('done!');
}

function readExtJson(filename) {

	return fs.readJSONSync(filename);
	// console.debug('Extension '+dir+' '+extJson.id);
}

async function walkFolders(parentFolder) {
	let dirs = getDirectories(parentFolder);

	let start = 0;
	let end = dirs.length;

	for (let index = start; index < end; index++) {
		const extDir = dirs[index];

		// check XPI
		if (!fs.existsSync(`${parentFolder}/${extDir}/xpi`)) {
			// fs.removeSync(`${extDir}/xpi`);
			console.debug('Missing: ' + `index: ${index} : ${extDir}/xpi`);
			extJson = readExtJson(`${parentFolder}/${extDir}/${extDir}.json`);
			console.debug('ExtensionId: ' + extJson.id);

			const xpiFileURL = extJson.current_version.files[0].url;
			const xpiFileName = path.posix.basename(url.parse(xpiFileURL).pathname);

			await downloadURL(xpiFileURL, `${extDir}/xpi`);
			console.debug('Downloaded filename ' + xpiFileName);
			// fs.ensureDirSync(`${extRootDir}/xpi`);

		}


	}
}

let extsJson = fs.readJSONSync(extsAllJsonFileName);
// walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}`, { extsJson: extsJson });
// walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTB60Dir}`, { extsJson: extsJson });
walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTBOtherDir}`, { extsJson: extsJson });