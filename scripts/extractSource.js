
var Git = require("nodegit");
const fs = require('fs-extra');
const download = require('download');
const url = require('url');
const path = require('path');
var extract = require('extract-zip')
const git = require('simple-git/promise');

const rootDir = "C:/Dev/Thunderbird/ThunderKdB";
const extGroupAllDir = 'xall';
const extGroupTB68Dir = 'x68';
const extGroupTB60Dir = 'x60';
const extGroupTBOtherDir = 'xOther';
const extsAllJsonFileName = `${rootDir}/xall/xall.json`;

const USER = 'cleidigh@gmail.com';
const PASS = 'Crete1997';
const REPO = 'github.com/cleidigh/ThunderKdB';

const remote = `https://${USER}:${PASS}@${REPO}`;


async function repo_status(workingDir) {

	let statusSummary = null;
	try {
		statusSummary = await git(workingDir).status();
	}
	catch (e) {
		// handle the error
		console.debug('StatusError: ' + e);
	}

	return statusSummary;
}


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

function unzipFile(filename, destination) {
	// _7zCommand = ['x', `${filename}`, `-o${destination}`];
	console.debug('Starting unzip: ' + filename);
	fileUnzip(`${filename}`, { dir: `${destination}` });
	console.debug('unpacked source');
}

function readExtJson(filename) {

	return fs.readJSONSync(filename);
	// console.debug('Extension '+dir+' '+extJson.id);
}

async function repo_commit(message) {
	let commitStatus = null;
	try {
		//    commitStatus = await git(rootDir).commit(message);
		commitStatus = await git(rootDir).raw([
			"commit",
			"-m",
			message
		])
	}
	catch (e) {
		// handle the error
		console.debug('CommitError: ' + e);
	}

	return commitStatus
}


async function walkFolders(parentFolder, options) {
	let dirs = getDirectories(parentFolder);

	let start = (typeof options.start === 'number') ? options.start : 0;
	let end = (typeof options.end === 'number') ? options.end : dirs.length;

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

			// fs.ensureDirSync(`${extDir}/xpi`);
			try {
				await downloadURL(xpiFileURL, `${parentFolder}/${extDir}/xpi`);
				console.debug('Downloaded filename ' + xpiFileName);
			} catch (e) {
				console.debug('Download Error ' + e);
			}



		}
		if (!fs.existsSync(`${parentFolder}/${extDir}/src`)) {
			console.debug('Missing: ' + `index: ${index} : ${extDir}/src`);
			extJson = readExtJson(`${parentFolder}/${extDir}/${extDir}.json`);
			console.debug('ExtensionId: ' + extJson.id);

			const xpiFileURL = extJson.current_version.files[0].url;
			const xpiFileName = path.posix.basename(url.parse(xpiFileURL).pathname);

			unzipFile(`${parentFolder}/${extDir}/xpi/${xpiFileName}`, `${parentFolder}/${extDir}/src`);
		}

	}
}

let extsJson = fs.readJSONSync(extsAllJsonFileName);
walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}`, { extsJson: extsJson, start: 0, end: 4 });
// walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTB60Dir}`, { extsJson: extsJson });
// walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTBOtherDir}`, { extsJson: extsJson });

// using the async function
// repo_status(`${rootDir}`).then(status => console.log(status));
// repo_commit("test source commit").then(status => console.log(status));