var { Shrunked } = ChromeUtils.import('resource://shrunked/Shrunked.jsm');

/* globals fixIterator, updateAttachmentPane, UpdateAttachmentBucket, gMessenger, gNotification */
var ShrunkedCompose = {
	OPTIONS_DIALOG: 'chrome://shrunked/content/options.xul',
	POPUP_ARGS: 'chrome,centerscreen,modal',

	droppedCache: new Map(),
	inlineImages: [],
	timeout: null,

	init() {
		if (Shrunked.prefs.getBoolPref('resizeAttachmentsOnSend')) {
			this.oldGenericSendMessage = window.GenericSendMessage;
			window.GenericSendMessage = this.newGenericSendMessage.bind(this);
		} else {
			addEventListener('attachments-added', this.attachmentsAdded);
		}

		// the editor's document isn't available immediately
		let editFrame = document.getElementById('content-frame');
		editFrame.addEventListener('pageshow', function addObserver() {
			editFrame.removeEventListener('pageshow', addObserver, false);
			let target = editFrame.contentDocument.body;
			let config = { attributes: false, childList: true, characterData: false, subtree: true };
			let observer = new MutationObserver(function(mutations) {
				for (let mutation of mutations) {
					if (mutation.addedNodes && mutation.addedNodes.length) {
						Shrunked.log('Nodes added to message: ' + mutation.addedNodes.length);
						for (let target of mutation.addedNodes) {
							ShrunkedCompose.maybeResizeInline(target);
						}
					}
				}
			});
			observer.observe(target, config);
		});
		editFrame.addEventListener('drop', (event) => {
			for (let file of event.dataTransfer.files) {
				Shrunked.log('File dropped: ' + file.name);
				ShrunkedCompose.droppedCache.set(file.name, file.size);
			}
		});

		let contentContext = document.getElementById('msgComposeContext') ||
				document.getElementById('contentAreaContextMenu');
		contentContext.addEventListener('popupshowing', function() {
			let target = document.popupNode;
			let shouldShow = false;
			if (target.nodeName == 'IMG') {
				Shrunked.log('Context menu on an <IMG>');
				if (Shrunked.imageIsJPEG(target)) {
					if (target.width > 500 || target.height > 500) {
						shouldShow = true;
					} else {
						Shrunked.log('Not resizing - image is too small');
					}
				} else {
					Shrunked.log('Not resizing - image is not JPEG');
				}
			}

			let menuitem = document.getElementById('shrunked-content-context-item');
			menuitem.hidden = !shouldShow;
			if (shouldShow) {
				let labels = Shrunked.strings.GetStringFromName('context_label');
				menuitem.label = Shrunked.getPluralForm(1, labels);
			}
			document.getElementById('shrunked-content-context-separator').hidden = !shouldShow;
		});

		let attachmentContext = document.getElementById('msgComposeAttachmentItemContext');
		if (!attachmentContext) {
			return;
		}
		attachmentContext.addEventListener('popupshowing', function() {
			Shrunked.log('Context menu on attachments');
			let imageCount = 0;
			let items = document.getElementById('attachmentBucket').selectedItems;
			for (let i = 0; i < items.length; i++) {
				let attachment = items[i].attachment;
				if ((attachment.url.startsWith('data:image/jpeg;') || /\.jpe?g$/i.test(attachment.url)) &&
						attachment.size >= Shrunked.fileSizeMinimum) {
					imageCount++;
				}
			}

			let menuitem = document.getElementById('shrunked-attachment-context-item');
			menuitem.hidden = !imageCount;
			if (imageCount >= 1) {
				let labels = Shrunked.strings.GetStringFromName('context_label');
				menuitem.label = Shrunked.getPluralForm(imageCount, labels);
			} else {
				Shrunked.log('Not resizing - no attachments were JPEG and large enough');
			}
		});
	},
	maybeResizeInline(target) {
		if (target.nodeName == 'IMG') {
			try {
				Shrunked.log('<IMG> found, source is ' + target.src.substring(0, 100) + (target.src.length <= 100 ? '' : '\u2026'));
				let parent = target.parentNode;
				while (parent && 'classList' in parent) {
					if (parent.classList.contains('moz-signature')) {
						Shrunked.log('Not resizing - image is part of signature');
						return;
					}
					if (parent.getAttribute('type') == 'cite') {
						Shrunked.log('Not resizing - image is part of message being replied to');
						return;
					}
					if (parent.classList.contains('moz-forward-container')) {
						Shrunked.log('Not resizing - image is part of forwarded message');
						return;
					}
					parent = parent.parentNode;
				}

				if (!target.complete) {
					target.addEventListener('load', function targetOnLoad() {
						target.removeEventListener('load', targetOnLoad, false);
						Shrunked.log('Image now loaded, calling maybeResizeInline');
						ShrunkedCompose.maybeResizeInline(target);
					});
					Shrunked.log('Image not yet loaded');
					return;
				}

				if (target.hasAttribute('shrunked:resized')) {
					Shrunked.log('Not resizing - image already has shrunked attribute');
					return;
				}
				if (!Shrunked.imageIsJPEG(target)) {
					Shrunked.log('Not resizing - image is not JPEG');
					return;
				}
				if (target.width < 500 && target.height < 500) {
					Shrunked.log('Not resizing - image is too small');
					return;
				}

				let src = target.getAttribute('src');
				if (/^data:/.test(src)) {
					let srcSize = (src.length - src.indexOf(',') - 1) * 3 / 4;
					if (src.endsWith('=')) {
						srcSize--;
						if (src.endsWith('==')) {
							srcSize--;
						}
					}
					if (srcSize < Shrunked.fileSizeMinimum) {
						Shrunked.log('Not resizing - image file size is too small');
						return;
					}
					if (!target.maybesrc) {
						for (let [name, size] of this.droppedCache) {
							if (srcSize == size) {
								target.maybesrc = name;
								break;
							}
						}
					}
				} else if (/^file:/.test(src) && !Shrunked.fileLargerThanThreshold(src)) {
					Shrunked.log('Not resizing - image file size is too small');
					return;
				}

				this.inlineImages.push(target);
				if (this.timeout) {
					clearTimeout(this.timeout);
				}

				this.timeout = setTimeout(() => {
					this.timeout = null;
					this.droppedCache.clear();

					this.showNotification({
						images: this.inlineImages,
						onResize(image, dataURL) {
							image.src = dataURL;
							image.removeAttribute('width');
							image.removeAttribute('height');
							image.setAttribute('shrunked:resized', 'true');
						},
						onResizeComplete() {
							ShrunkedCompose.inlineImages = [];
						},
						onResizeCancelled() {
							for (let img of ShrunkedCompose.inlineImages) {
								img.setAttribute('shrunked:resized', 'false');
							}
							ShrunkedCompose.inlineImages = [];
						}
					});
				}, 500);
			} catch (e) {
				Cu.reportError(e);
			}
		} else if (target.nodeType == Node.ELEMENT_NODE) {
			Shrunked.log('<' + target.nodeName + '> found, checking children');
			for (let child of target.children) {
				this.maybeResizeInline(child);
			}
		}
	},
	attachmentsAdded(event) {
		let bucket = document.getElementById('attachmentBucket');
		let images = [];
		for (let attachment of fixIterator(event.detail, Ci.nsIMsgAttachment)) {
			if (/\.jpe?g$/i.test(attachment.url) && attachment.size >= Shrunked.fileSizeMinimum) {
				Shrunked.log('JPEG attachment detected');
				images.push({
					attachment,
					src: attachment.url
				});
			}
		}

		if (images.length) {
			ShrunkedCompose.showNotification({
				images,
				onResize(imageData, dataURL, size) {
					let attachment = imageData.attachment;
					attachment.contentLocation = attachment.url;
					attachment.url = dataURL;
					window.gAttachmentsSize += size - attachment.size;
					attachment.size = size;

					updateAttachmentPane(true);

					setTimeout(() => {
						for (let index = 0; index < bucket.getRowCount(); index++) {
							let item = bucket.getItemAtIndex(index);
							if (item.attachment == attachment) {
								let sizeLabel = item.querySelector('.attachmentcell-size');
								let sizeString = gMessenger.formatFileSize(attachment.size);
								item.setAttribute('size', sizeString);
								sizeLabel.setAttribute('value', sizeString);
							}
						}
					});
				},
				onResizeComplete() {
				},
				onResizeCancelled() {
				}
			});
		}
	},
	onContentContextMenuCommand() {
		this.showOptionsDialog({
			images: [document.popupNode],
			onResize(image, dataURL) {
				image.src = dataURL;
				image.removeAttribute('width');
				image.removeAttribute('height');
				image.setAttribute('shrunked:resized', 'true');
			},
			onResizeComplete() {},
			onResizeCancelled() {}
		});
	},
	onAttachmentContextMenuCommand() {
		let items = document.getElementById('attachmentBucket').selectedItems;
		let images = [];
		for (let i = 0; i < items.length; i++) {
			let attachment = items[i].attachment;
			if ((attachment.url.startsWith('data:image/jpeg;') || /\.jpe?g$/i.test(attachment.url)) &&
					attachment.size >= Shrunked.fileSizeMinimum) {
				images.push({
					attachment,
					item: items[i],
					src: attachment.url
				});
			}
		}
		this.showOptionsDialog({
			images,
			onResize(imageData, dataURL, size) {
				let attachment = imageData.attachment;
				attachment.contentLocation = attachment.url;
				attachment.url = dataURL;
				window.gAttachmentsSize += size - attachment.size;
				attachment.size = size;

				updateAttachmentPane(true);

				let sizeLabel = imageData.item.querySelector('.attachmentcell-size');
				let sizeString = gMessenger.formatFileSize(attachment.size);
				imageData.item.setAttribute('size', sizeString);
				sizeLabel.setAttribute('value', sizeString);
			},
			onResizeComplete() {},
			onResizeCancelled() {}
		});
	},
	showNotification(callbackObject) {
		Shrunked.log('Showing resize notification');
		let notifyBox = gNotification.notificationbox;
		let notification = notifyBox.getNotificationWithValue('shrunked-notification');
		if (notification) {
			Shrunked.log('Notification already visible');
			return;
		}

		let buttons = [{
			accessKey: Shrunked.strings.GetStringFromName('yes_accesskey'),
			callback: () => {
				Shrunked.log('Resizing started');
				this.showOptionsDialog(callbackObject);
			},
			label: Shrunked.strings.GetStringFromName('yes_label')
		}, {
			accessKey: Shrunked.strings.GetStringFromName('no_accesskey'),
			callback() {
				Shrunked.log('Resizing cancelled');
				callbackObject.onResizeCancelled();
			},
			label: Shrunked.strings.GetStringFromName('no_label')
		}];

		let questions = Shrunked.strings.GetStringFromName('questions');
		let question = Shrunked.getPluralForm(callbackObject.images.length, questions);

		notifyBox.appendNotification(
			question, 'shrunked-notification', Shrunked.icon16, notifyBox.PRIORITY_INFO_HIGH, buttons
		);
	},
	async showOptionsDialog(callbackObject) {
		let returnValues = { cancelDialog: true };
		if (callbackObject.isAttachment) {
			returnValues.isAttachment = true;
		}
		let imageURLs = [];
		let imageNames = [];
		for (let image of callbackObject.images) {
			imageURLs.push(image.src);
			if (image.src.startsWith('data:image/jpeg;filename=')) {
				imageNames.push(decodeURIComponent(image.src.substring(25, image.src.indexOf(';', 25))));
			} else {
				imageNames.push(image.maybesrc);
			}
		}

		window.openDialog(this.OPTIONS_DIALOG, 'options', this.POPUP_ARGS, returnValues, imageURLs, imageNames);

		if (returnValues.cancelDialog) {
			Shrunked.log('Resizing cancelled');
			callbackObject.onResizeCancelled();
			return;
		}

		if (returnValues.maxWidth == -1) {
			Shrunked.log('No maximum size selected');
			callbackObject.onResizeComplete();
			return;
		}

		try {
			let {maxWidth, maxHeight} = returnValues;
			let quality = Shrunked.prefs.getIntPref('default.quality');
			Shrunked.log('Resizing to ' + maxWidth + ' \u00D7 ' + maxHeight + ', ' + quality + ' quality');
			let count = 0;
			this.setStatus(callbackObject.images.length);
			for (let image of callbackObject.images) {
				try {
					let destFile = await Shrunked.resize(image.src, maxWidth, maxHeight, quality, image.maybesrc);
					let dataURL = await Shrunked.getDataURLFromFile(destFile);
					callbackObject.onResize(image, dataURL, destFile.size);
					Shrunked.log('Successfully resized ' + destFile.name);
					this.setStatusCount(++count);
				} catch (ex) {
					Cu.reportError(ex);
				}
			}
			this.clearStatus();
			Shrunked.log('Resizing complete');
			callbackObject.onResizeComplete();
		} catch (ex) {
			Cu.reportError(ex);
		}
	},
	newGenericSendMessage(msgType) {
		let doResize = msgType == Ci.nsIMsgCompDeliverMode.Now ||
				msgType == Ci.nsIMsgCompDeliverMode.Later;
		let images = [];

		try {
			if (doResize) {
				let bucket = document.getElementById('attachmentBucket');
				for (let index = 0; index < bucket.getRowCount(); index++) {
					let attachment = bucket.getItemAtIndex(index).attachment;
					if (/\.jpe?g$/i.test(attachment.url) && attachment.size >= Shrunked.fileSizeMinimum) {
						Shrunked.log('JPEG attachment detected');
						images.push({
							attachment,
							src: attachment.url
						});
					}
				}

				if (images.length) {
					ShrunkedCompose.showOptionsDialog({
						isAttachment: true,
						images,
						onResize(imageData, dataURL, size) {
							let attachment = imageData.attachment;
							attachment.contentLocation = attachment.url;
							attachment.url = dataURL;
							window.gAttachmentsSize += size - attachment.size;
							attachment.size = size;

							UpdateAttachmentBucket(true);
							for (let index = 0; index < bucket.getRowCount(); index++) {
								let item = bucket.getItemAtIndex(index);
								if (item.attachment == attachment) {
									item.setAttribute('size', gMessenger.formatFileSize(item.attachment.size));
								}
							}
						},
						onResizeComplete() {
							finish();
						},
						onResizeCancelled() {
							finish();
						}
					});
					return;
				}
			}

			finish();
		} catch (e) {
			Cu.reportError(e);
		}

		function finish() {
			ShrunkedCompose.oldGenericSendMessage(msgType);

			// undo, in case send failed
			if (doResize) {
				for (let imageData of images) {
					let attachment = imageData.attachment;
					let contentLocation = attachment.contentLocation;
					if (contentLocation && /\.jpe?g$/i.test(contentLocation)) {
						attachment.url = contentLocation;
						attachment.contentLocation = null;
					}
				}
			}
		}
	},
	setStatus(total) {
		let statusText = document.getElementById('statusText');
		let meter = document.getElementById('compose-progressmeter');
		let statuses = Shrunked.strings.GetStringFromName('status_resizing');

		/* globals ToggleWindowLock */
		ToggleWindowLock(true);
		statusText.setAttribute('label', Shrunked.getPluralForm(total, statuses));
		meter.setAttribute('mode', total == 1 ? 'undetermined' : 'normal');
		meter.setAttribute('value', 0);
		meter.setAttribute('max', total);
		meter.parentNode.collapsed = false;
	},
	setStatusCount(count) {
		let meter = document.getElementById('compose-progressmeter');

		meter.setAttribute('value', count);
	},
	clearStatus() {
		let statusText = document.getElementById('statusText');
		let meter = document.getElementById('compose-progressmeter');

		ToggleWindowLock(false);
		statusText.setAttribute('label', '');
		meter.setAttribute('value', 0);
		meter.removeAttribute('max');
		meter.parentNode.collapsed = true;
	}
};

window.addEventListener('load', ShrunkedCompose.init.bind(ShrunkedCompose));
