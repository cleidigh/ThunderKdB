
// var Git = require("nodegit");
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

function getExtJson(extsJson, id) {
	console.debug('GetJ: '+extsJson.length);
	for (let index = 0; index < extsJson.length; index++) {
		const ext = extsJson[index];
		if (ext === null) {
			console.debug('no extension');
			break;
		}
		// console.debug('\n\n' + JSON.stringify(ext));
		if (ext.id === Number(id)) {
			console.debug('extension '+index+ '  '+ ext.id+'  '+ext.slug);

			return ext;
		}
	}
	return null;
}

async function writePrettyJSONFile(f, json) {
	try {
		return await fs.outputFile(f, JSON.stringify(json, null, 4));
	} catch (err) {
		console.error(err);
		throw err;
	}
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
	console.debug(`WalkFolder: ${parentFolder}  : ${options.checkOnly}`);
	let dirs = getDirectories(parentFolder);

	let start = (typeof options.start === 'number') ? options.start : 0;
	let end = (typeof options.end === 'number') ? options.end : dirs.length;
	let extJson = {};

	// console.debug(dirs);
	for (let index = start; index < end; index++) {
		const extDir = dirs[index];

		console.debug(`Checking: ${parentFolder}/${extDir}`);
		// check XPI
		if (!fs.existsSync(`${parentFolder}/${extDir}/xpi`)) {
			if (options.checkOnly) {
				console.debug('Missing: ' + `index: ${index} : ${extDir}/xpi  : Ignore`);
				continue;
			}
			
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

		console.debug(`Check Source: ${parentFolder}/${extDir}/src`);
		if (!fs.existsSync(`${parentFolder}/${extDir}/src`) || options.forceSourceUnzip) {
			if (options.checkOnly) {
				console.debug('Missing: ' + `index: ${index} : ${extDir}/src  : Ignore`);
				continue;
			}
			
			console.debug('Missing: ' + `index: ${index} : ${extDir}/src`);
			console.debug('Unzip XPI');
			try {
				extJson = readExtJson(`${parentFolder}/${extDir}/${extDir}.json`);
				
			} catch (error) {
				console.debug('File err: '+error);
				extJson = getExtJson(options.extsJson, extDir.split('-')[0]);
				let jfile = `${parentFolder}/${extDir}/${extDir}.json`;
				writePrettyJSONFile(jfile, extJson)
				console.debug(extJson.slug);

			}

			console.debug('ExtensionId: ' + extJson.id);

			const xpiFileURL = extJson.current_version.files[0].url;
			const xpiFileName = path.posix.basename(url.parse(xpiFileURL).pathname);

			unzipFile(`${parentFolder}/${extDir}/xpi/${xpiFileName}`, `${parentFolder}/${extDir}/src`);
		}

	}
}

let extsJson = fs.readJSONSync(extsAllJsonFileName);
// walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTB60Dir}`, { extsJson: extsJson, start: 0, end: 100 });
walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTB68Dir}`, { extsJson: extsJson, start: 280, end: 290, checkOnly: false , forceSourceUnzip: true});
// walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTB60Dir}`, { extsJson: extsJson });
// walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTBOtherDir}`, { extsJson: extsJson });
// walkFolders(`${rootDir}/${extGroupAllDir}/${extGroupTBOtherDir}`, { extsJson: extsJson, start: 0, end: 10 });

// using the async function
// repo_status(`${rootDir}`).then(status => console.log(status));
// repo_commit("test source commit").then(status => console.log(status));