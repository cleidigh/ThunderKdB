/* globals fetch */
var EXPORTED_SYMBOLS = ['ShrunkedImage'];

/* globals ExifData, OS, Services, Shrunked */
ChromeUtils.defineModuleGetter(this, 'ExifData', 'resource://shrunked/ExifData.jsm');
ChromeUtils.defineModuleGetter(this, 'OS', 'resource://gre/modules/osfile.jsm');
ChromeUtils.defineModuleGetter(this, 'Services', 'resource://gre/modules/Services.jsm');
ChromeUtils.defineModuleGetter(this, 'Shrunked', 'resource://shrunked/Shrunked.jsm');

var XHTMLNS = 'http://www.w3.org/1999/xhtml';

function ShrunkedImage(source, maxWidth, maxHeight, quality) {
	this.maxWidth = maxWidth;
	this.maxHeight = maxHeight;
	this.quality = quality;

	if (typeof source == 'string') {
		this.sourceURI = Services.io.newURI(source, null, null);
		if (this.sourceURI.schemeIs('file')) {
			let file = this.sourceURI.QueryInterface(Ci.nsIFileURL).file;
			this.path = file.path;
			this.basename = file.leafName;
		} else if (this.sourceURI.schemeIs('data')) {
			let meta = source.substring(0, source.indexOf(',')).split(';');
			for (let part of meta) {
				if (part.startsWith('filename=')) {
					this.basename = decodeURIComponent(part.substring(9));
				}
			}
		} else {
			let match = /[?&]filename=([\w.-]+)/.exec(this.sourceURI.spec);
			if (match) {
				this.basename = match[1];
			} else {
				match = /\/([\w.-]+\.jpg)$/i.exec(this.sourceURI.spec);
				if (match) {
					this.basename = match[1];
				}
			}
		}
	} else if (source instanceof Ci.nsIFile) {
		this.sourceURI = Services.io.newFileURI(source);
		this.path = source.path;
		this.basename = source.leafName;
	}

	if (!this.sourceURI) {
		throw new Error('Unexpected source passed to ShrunkedImage');
	}
}
ShrunkedImage.prototype = {
	async resize() {
		let orientation = 0;
		if (Shrunked.options.exif) {
			await this.readExifData();
			if (Shrunked.options.orientation && this.exifData) {
				orientation = this.exifData.orientation;
			}
		}
		let image = await this.loadImage();
		let canvas = await this.drawOnCanvas(image, orientation);

		if (this.exifData && this.exifData.exif2 && this.exifData.exif2['a002']) {
			this.exifData.exif2['a002'].value = canvas.width;
			this.exifData.exif2['a003'].value = canvas.height;
		}

		let blob = await this.getBytes(canvas);
		return new File([blob], this.basename, {type:'image/jpeg'});
	},
	async readExifData() {
		try {
			let readable;
			if (this.sourceURI.schemeIs('file')) {
				readable = await OS.File.open(this.path, { read: true });
			} else {
				readable = await Readable(this.sourceURI.spec);
			}

			this.exifData = new ExifData();
			await this.exifData.read(readable);
		} catch (ex) {
			Shrunked.warn(ex);
			delete this.exifData;
		}
	},
	loadImage() {
		return new Promise((resolve, reject) => {
			let image = getWindow().document.createElementNS(XHTMLNS, 'img');
			image.onload = function() {
				// https://bugzilla.mozilla.org/show_bug.cgi?id=574330#c54
				if (!image.complete) {
					image.src = image.src; // eslint-disable-line no-self-assign
					return;
				}
				resolve(image);
			};
			image.onerror = reject;
			image.src = this.sourceURI.spec;
		});
	},
	drawOnCanvas(image, orientation, resample = true) {
		return new Promise((resolve) => {
			let ratio = Math.max(1, image.width / this.maxWidth, image.height / this.maxHeight);
			let resampleRatio = 1;
			if (resample && Shrunked.options.resample) {
				resampleRatio = Math.min(ratio, 3);
				if (resampleRatio > 2 && resampleRatio < 3) {
					resampleRatio = 2;
				}
			}

			let width = Math.floor(image.width / ratio);
			let height = Math.floor(image.height / ratio);

			if (orientation == 90 || orientation == 270) {
				[width, height] = [height, width];
			}

			let canvas = getWindow().document.createElementNS(XHTMLNS, 'canvas');
			canvas.width = Math.floor(width * resampleRatio);
			canvas.height = Math.floor(height * resampleRatio);

			let context = canvas.getContext('2d');
			if (orientation == 90) {
				context.translate(0, canvas.height);
				context.rotate(-0.5 * Math.PI);
			} else if (orientation == 180) {
				context.translate(canvas.width, canvas.height);
				context.rotate(Math.PI);
			} else if (orientation == 270) {
				context.translate(canvas.width, 0);
				context.rotate(0.5 * Math.PI);
			}
			context.drawImage(image, 0, 0, image.width / ratio * resampleRatio, image.height / ratio * resampleRatio);

			if (resampleRatio > 1) {
				let oldData = context.getImageData(0, 0, canvas.width, canvas.height);
				canvas.width = width;
				canvas.height = height;
				let newData = context.createImageData(canvas.width, canvas.height);

				let worker = new ChromeWorker('resource://shrunked/worker.js');
				worker.onmessage = function(event) {
					context.putImageData(event.data, 0, 0);
					resolve(canvas);
				};
				worker.postMessage({
					oldData,
					newData,
					func: (resampleRatio == 3 ? 'nineResample' : (resampleRatio == 2 ? 'fourResample' : 'floatResample')),
					ratio: resampleRatio // only for floatResample
				});
			} else {
				resolve(canvas);
			}
		});
	},
	getBytes(canvas) {
		return new Promise((resolve, reject) => {
			canvas.toBlob(function(blob) {
				try {
					resolve(blob);
				} catch (ex) {
					reject(ex);
				}
			}, 'image/jpeg', 'quality=' + this.quality);
		});
	},
	estimateSize() {
		return this.loadImage()
			.then(image => this.drawOnCanvas(image, 0, false))
			.then(canvas => this.getBytes(canvas))
			.then(bytes => bytes.size);
	}
};

async function Readable(url) {
	let response = await fetch(url);
	let bytes = await response.arrayBuffer();

	return {
		data: new Uint8Array(bytes),
		pointer: 0,
		read(count) {
			let result;
			if (count) {
				result = this.data.subarray(this.pointer, this.pointer + count);
				this.pointer += count;
			} else {
				result = this.data.subarray(this.pointer);
				this.pointer = this.data.length;
			}
			return result;
		},
		setPosition(position) {
			this.pointer = position;
		},
		close() {
			delete this.data;
		}
	};
}

function getWindow() {
	return Services.wm.getMostRecentWindow('mail:3pane');
}
