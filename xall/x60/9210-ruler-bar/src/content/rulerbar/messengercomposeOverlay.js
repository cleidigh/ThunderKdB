/* ***** BEGIN LICENSE BLOCK ***** 
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is "Ruler Bar".
 *
 * The Initial Developer of the Original Code is ClearCode Inc.
 * Portions created by the Initial Developer are Copyright (C) 2008-2016
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): YUKI "Piro" Hiroshi <piro.outsider.reflex@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
 
var RulerBar = { 
	
	kBAR         : 'ruler-bar', 
	kCURSOR      : 'ruler-cursor',
	kWRAP_MARKER : 'ruler-wrap',
	kWRAP_POPUP  : 'ruler-wrap-popup',
	kWRAP_INDICATOR : 'ruler-wrap-indicator',
	kSCALEBAR    : 'ruler-scalebar',
	kRULER_CELL  : 'ruler-cell',
	kWRAP_CELL   : 'wrap-cell',
	kCURRENT     : 'current',

	kRULER_BAR_DRAG_TYPE : 'application/x-rulerbar-ruler',

	kLINE_TOP : 1,
	kLINE_END : 2,
	kLINE_MIDDLE : 4,
	lastPosition : 1, // kLINE_END

	kSTRUCTURE_ELEMENTS : 'HTML HEAD BODY',
	kBLOCK_ELEMENTS : 'P OL UL LI DL DT DD TABLE TD TH CAPTION DIV PRE ADDRESS H1 H2 H3 H4 H5 H6',
 
/* properties */ 
	
	tabWidth : 8, 
	maxCount : 300,
	nonAsciiWidth : 2,
	shouldRoop : true,
	columnLevel3 : 20,
	columnLevel1 : 2,
	scale : 100,
	physical : false,
 
	get wrapLength() 
	{
		var editor = this.editor;
		return (editor && !editor.wrapWidth && !this.bodyWidth) ? 0 :
			this._wrapLength ;
	},
	_wrapLength : 0,
	
	get bodyWidth() 
	{
		var value = this.contentBody.style.width;
		if (!value) return 0;
		var match = value.match(/^(\d+)ch$/i);
		if (match) return parseInt(match[1]);
		return 0;
	},
  
	get fontFamily() 
	{
		var w = this.frame.contentWindow;
		return w.getComputedStyle(this.contentBody, '').fontFamily;
	},
 
	get fontSize() 
	{
		var w = this.frame.contentWindow;
		var d = this.frame.contentDocument;
		var size = w.getComputedStyle(this.contentBody, '').fontSize;
		size = parseInt(size.match(/^\d+/));
		var scale = Math.max(1, this.scale);
		return size * (scale / 100);
	},
 
	get needUpdated() 
	{
		return (window.getComputedStyle(this.bar, '').fontSize != this.frame.contentWindow.getComputedStyle(this.contentBody, '').fontSize);
	},
 
	get offset() 
	{
		var w = this.frame.contentWindow;
		var d = this.frame.contentDocument;
		var targets = [];

		var root = w.getComputedStyle(d.documentElement, '');
		targets.push(root.borderLeftWidth);
		targets.push(root.marginLeft);
		targets.push(root.paddingLeft);

		var body = w.getComputedStyle(this.contentBody, '');
		targets.push(body.borderLeftWidth);
		targets.push(body.marginLeft);
		targets.push(body.paddingLeft);

		var offset = 0;
		targets.forEach(function(aTarget) {
			offset += parseInt(String(aTarget).match(/^\d+/))
		});

		return offset;
	},
 
	get color() 
	{
		return this.frame.contentWindow.getComputedStyle(this.contentBody, '').color;
	},
 
	get backgroundColor() 
	{
		var color = this.frame.contentWindow.getComputedStyle(this.contentBody, '').backgroundColor;
		if (color == 'transparent' ||
		    /(rgb|hsl)a\(.+,\s*0\)/.test(color) ||
		    /#(...0|......00)/.test(color))
			color = this.prefs.getPref('browser.display.use_system_colors') ?
				'-moz-Field' :
				this.prefs.getPref('browser.display.background_color');
		return color;
	},
  
/* elements */ 
	
	get bar() 
	{
		return document.getElementById(this.kBAR);
	},
 
	get scaleBar() 
	{
		return document.getElementById(this.kSCALEBAR);
	},
 
	get cursor() 
	{
		return document.getElementById(this.kCURSOR);
	},
 
	get currentCell() 
	{
		var nodes = document.getElementsByAttribute(this.kCURRENT, 'true');
		return nodes && nodes.length ? nodes[0] : null ;
	},
	get wrapCell()
	{
		var nodes = document.getElementsByAttribute(this.kWRAP_CELL, 'true');
		return nodes && nodes.length ? nodes[0] : null ;
	},
 
	get wrapMarker() 
	{
		return document.getElementById(this.kWRAP_MARKER);
	},
	get wrapPopup()
	{
		return document.getElementById(this.kWRAP_POPUP);
	},
	get wrapIndicator()
	{
		return this.editor.document.getElementById(this.kWRAP_INDICATOR);
	},
 
	get marks() 
	{
		return [...document.getElementsByAttribute(this.kRULER_CELL, 'true')];
	},
 
	get frame() 
	{
		return document.getElementById('content-frame');
	},
 
	get editor() 
	{
		return GetCurrentEditor();
	},
 
	get contentBody() 
	{
		return this.frame.contentDocument.body;
	},
 
	get calculator() 
	{
		return document.getElementById('rulerbar-calculator-frame');
	},
  
/* utilities */ 
	
	evaluateXPath : function(aExpression, aContext, aResultType) 
	{
		return (aContext.ownerDocument || aContext || document).evaluate(
				aExpression,
				aContext || document,
				null,
				aResultType,
				null
			);
	},
	
	getConditionToMatchElements : function(aElementNames) 
	{
		return 'contains(" '+aElementNames+' ", concat(" ",local-name()," "))';
	},
  
	getBoxObjectFor : function(aNode) 
	{
		return window['piro.sakura.ne.jp'].boxObject.getBoxObjectFor(aNode);
	},
 
	calculateWrapLength : function(aEvent) 
	{
		var unit = this.wrapCell.boxObject.width || 1;
		return Math.round((aEvent.screenX - this.scaleBar.boxObject.screenX) / unit);
	},
 
	setWrapLengthToCell : function(aCell) 
	{
		while (aCell)
		{
			if (aCell.nodeType == Node.ELEMENT_NODE && aCell.hasAttribute(this.kRULER_CELL))
				break;
			aCell = aCell.parentNode;
		}
		if (aCell)
			this.prefs.setPref('mailnews.wraplength', parseInt(aCell.getAttribute('count')));
	},
  
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'DOMContentLoaded':
				this.init();
				break;

			case 'unload':
				this.destroy();
				break;

			case 'keypress':
				this.lastKeyCode = aEvent.keyCode;
				break;

			case 'click':
				if (aEvent.currentTarget.id == 'ruler-bar-container')
					return this.onClickOnBar(aEvent);
			case 'dragover':
				this.lastClickedScreenX = aEvent.screenX;
				this.lastClickedScreenY = aEvent.screenY;
				break;

			case 'scroll':
				this.bar.style.marginLeft = (-this.frame.contentWindow.scrollX)+'px';
				break;

			case 'dblclick':
				return this.onDblClickOnBar(aEvent);


			case 'mousedown':
				return this.onWrapMarkerDragStart(aEvent);

			case 'mousemove':
				return this.onWrapMarkerDragging(aEvent);

			case 'mouseup':
				return this.onWrapMarkerDragEnd(aEvent);


			case 'DOMAttrModified':
				if (
					aEvent.target == this.contentBody &&
					(aEvent.attrName == 'text' || aEvent.attrName == 'bgcolor')
					) {
					this.updateRulerAppearanceWithDelay();
				}
				break;

			case 'load':
				if (this.needUpdated)
					this.updateRulerAppearance(); // force update with the correct font-size
				break;

			case 'compose-window-init':
				this.delayedInit();
				break;

			case 'compose-window-close':
				this.contentBody.removeEventListener('DOMAttrModified', this, true);
//				this.contentBody.removeEventListener('DOMNodeInserted', this, true);
				this.deactivateWrapMarker();
				break;
		}
	},
	
	lastKeyCode : -1, 
	lastClickedScreenX : -1,
	lastClickedScreenY : -1,
 
	onClickOnBar : function(aEvent) 
	{
		var selection = this.editor.selection;
		if (!selection.rangeCount) return;

		var doc = this.editor.document;
		var marker = doc.createElement('span');
		var range = selection.getRangeAt(0).cloneRange();
		range.insertNode(marker);
		range.detach();

		var clientX = aEvent.screenX - this.scaleBar.boxObject.screenX;
		var clientY = this.getBoxObjectFor(marker).screenY
						 - this.getBoxObjectFor(doc.body).screenY
						  - doc.defaultView.scrollY;

		var line = marker.parentNode;
		line.removeChild(marker);
		line.normalize();

		var windowUtils = doc.defaultView
							.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
							.getInterface(Components.interfaces.nsIDOMWindowUtils);
		if (windowUtils.sendMouseEvent) {
			windowUtils.sendMouseEvent('mousedown', clientX, clientY + 1, 0, 1, 0, false);
			windowUtils.sendMouseEvent('mouseup', clientX, clientY + 1, 0, 1, 0, false);
		}
	},
 
	onDblClickOnBar : function(aEvent) 
	{
		this.setWrapLengthToCell(aEvent.originalTarget);
	},
 
	onWrapMarkerDragStart : function(aEvent) 
	{
		this.activateWrapMarker();

		this.onWrapMarkerDragging(aEvent);
	},
 
	onWrapMarkerDragging : function(aEvent) 
	{
		if (!this.wrapMarker.hasAttribute('dragging'))
			return;

		var wrap = this.calculateWrapLength(aEvent);
		this.wrapPopup.firstChild.setAttribute('value', wrap);
		this.wrapPopup.openPopup(this.wrapMarker, 'after_pointer', 0, 0, false, false);
		this.updateWrapMarker(wrap);

		var indicator = this.wrapIndicator;
		if (indicator)
			indicator.style.marginLeft = this.wrapMarker.style.marginLeft;
	},
 
	onWrapMarkerDragEnd : function(aEvent) 
	{
		if (!this.wrapMarker.hasAttribute('dragging'))
			return;

		this.wrapPopup.hidePopup();
		this.deactivateWrapMarker();

		var wrap = this.calculateWrapLength(aEvent);
		this.updateWrapMarker(wrap);
		if (wrap != this.wrapLength)
			this.prefs.setPref('mailnews.wraplength', wrap);
	},
 
	activateWrapMarker : function() 
	{
		if (this.wrapMarker.hasAttribute('dragging'))
			return;

		this.wrapMarker.setAttribute('dragging', true);

		var indicator = this.wrapIndicator;
		if (indicator)
			indicator.parentNode.removeChild(indicator);

		var doc = this.editor.document;
		indicator = doc.createElement('span');
		indicator.setAttribute('id', this.kWRAP_INDICATOR);
		indicator.setAttribute('style',
			'position: fixed !important;'+
			'top: 0 !important;'+
			'left: 0 !important;'+
			'width: 0 !important;'+
			'height: '+this.frame.boxObject.height+'px !important;'+
			'border-left: 1px dashed '+this.color+' !important;'+
			'opacity: 0.65 !important;'
		);
		doc.body.appendChild(indicator);

		this.bar.addEventListener('mousemove', this, false);
		this.bar.addEventListener('mouseup', this, false);
		this.frame.addEventListener('mousemove', this, true);
		this.frame.addEventListener('mouseup', this, true);
	},
 
	deactivateWrapMarker : function() 
	{
		if (!this.wrapMarker.hasAttribute('dragging'))
			return;

		this.wrapMarker.removeAttribute('dragging');

		var indicator = this.wrapIndicator;
		if (indicator)
			indicator.parentNode.removeChild(indicator);

		this.bar.removeEventListener('mousemove', this, false);
		this.bar.removeEventListener('mouseup', this, false);
		this.frame.removeEventListener('mousemove', this, true);
		this.frame.removeEventListener('mouseup', this, true);
	},
 
	onCharsetChange : function(aCharset) 
	{
		if (!aCharset) {
			aCharset = this.frame.contentDocument.characterSet;
		}
		if (!aCharset) {
			return;
		}
		try {
			var docCharset = this.calculator.docShell
					.QueryInterface(Components.interfaces.nsIDocCharset);
			docCharset.charset = aCharset;
			var webNav = this.calculator.webNavigation;
			var self = this;
			this.calculator.addEventListener('DOMContentLoaded', function() {
				self.calculator.removeEventListener('DOMContentLoaded', arguments.callee, false);
				self.updateRulerAppearance();
			}, false);
			webNav.reload(webNav.LOAD_FLAGS_CHARSET_CHANGE);
		}
		catch(e) {
			this._isChangingCharset = false;
		}
	},
  
/* selection */ 
	
	notifySelectionChanged : function(aDocument, aSelection, aReason) 
	{
		window.setTimeout(function(aSelf) {
			aSelf.updateCursor(aReason);
		}, 0, this, aReason);
	},
 
	initEditor : function() 
	{
		if (!this.editor) {
			window.setTimeout(function(aSelf) {
				aSelf.initEditor();
			}, 10, this);
			return;
		}
		var wrapLength = this.wrapLength;
		this.editor.document.body.style.width = wrapLength > 0 ? wrapLength+'ch' : '' ;
		this.addSelectionListener();
	},
 
	addSelectionListener : function() 
	{
		if (this._selectionListening) return;
		this.editor
			.selection
			.QueryInterface(Components.interfaces.nsISelectionPrivate)
			.addSelectionListener(this);
		this._selectionListening = true;
	},
	_selectionListening : false,
 
	removeSelectionListener : function() 
	{
		if (!this._selectionListening) return;
		this.editor
			.selection
			.QueryInterface(Components.interfaces.nsISelectionPrivate)
			.removeSelectionListener(this);
		this._selectionListening = false;
	},
  
/* initialize */ 
	
	init : function() 
	{
		window.removeEventListener('DOMContentLoaded', this, false);

		this.overrideFunctions();

		window.addEventListener('unload', this, false);
		document.documentElement.addEventListener('compose-window-init', this, false);
		document.documentElement.addEventListener('compose-window-close', this, false);
		this.frame.addEventListener('keypress', this, false);
		this.frame.addEventListener('click', this, false);
		this.frame.addEventListener('dragover', this, false);
		this.frame.addEventListener('scroll', this, false);
		this.frame.addEventListener('load', this, true);

		this.prefs = Components.utils.import('resource://rulerbar-modules/prefs.js', {}).prefs;
		this.prefs.addPrefListener(this);

		this._wrapLength = this.prefs.getPref('mailnews.wraplength');
		this.cursor.hidden = !(this.physical = this.prefs.getPref('extensions.rulerbar.physicalPositioning'));
		this.tabWidth = this.prefs.getPref('extensions.rulerbar.tabWidth');
		this.nonAsciiWidth = this.prefs.getPref('extensions.rulerbar.nonAsciiWidth');
		this.shouldRoop = this.prefs.getPref('extensions.rulerbar.shouldRoop');
		this.maxCount = this.prefs.getPref('extensions.rulerbar.maxCount');
		this.columnLevel3 = this.prefs.getPref('extensions.rulerbar.column.level3');
		this.columnLevel1 = this.prefs.getPref('extensions.rulerbar.column.level1');
		this.scale = this.prefs.getPref('extensions.rulerbar.scale');
		this.initRuler();
	},
	
	overrideFunctions : function() 
	{
		eval('window.SetDocumentCharacterSet = '+window.SetDocumentCharacterSet.toSource().replace(
			'{',
			'{ RulerBar.onCharsetChange(arguments[0]); '
		));
	},
 
	delayedInit : function() 
	{
		this.initRuler();
		window.setTimeout(function(aSelf) {
			aSelf.initEditor();
			aSelf.contentBody.addEventListener('DOMAttrModified', aSelf, true);
//			aSelf.contentBody.addEventListener('DOMNodeInserted', aSelf, true);
		}, 0, this);
	},
  
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);
		document.documentElement.removeEventListener('compose-window-init', this, false);
		document.documentElement.removeEventListener('compose-window-close', this, false);
		this.frame.removeEventListener('keypress', this, false);
		this.frame.removeEventListener('click', this, false);
		this.frame.removeEventListener('dragover', this, false);
		this.frame.removeEventListener('scroll', this, false);
		this.frame.removeEventListener('load', this, true);
		this.prefs.removePrefListener(this);
		this.removeSelectionListener();
	},
 
	initRuler : function() 
	{
		this.updateRulerAppearance();
		if (this._initRulerTimer) {
			window.clearTimeout(this._initRulerTimer);
		}
		this._initRulerTimer = window.setTimeout(function(aSelf) {
			aSelf.onCharsetChange();
			aSelf._initRulerTimer = null;
		}, 0, this);
	},
	
	updateRulerAppearance : function() 
	{
		this.bar.style.marginLeft = 0;

		var range = document.createRange();
		range.selectNodeContents(this.scaleBar);
		range.deleteContents();
		range.detach();

		this.bar.setAttribute(
			'style',
			'font-size:'+this.fontSize+'px;'+
			'color:'+this.color+';'+
			'background-color:'+this.backgroundColor+';'
		);

		if (this._updateRulerAppearanceTimer) {
			window.clearTimeout(this._updateRulerAppearanceTimer);
		}
		this._updateRulerAppearanceTimer = window.setTimeout(function(aSelf) {
			aSelf.calculator.style.visibility = 'hidden';
			aSelf.updateOffset();
			aSelf.buildRulerMarks();
			aSelf.updateWrapMarker();
			aSelf.updateCursor();
			aSelf._updateRulerAppearanceTimer = null;
		}, 0, this);
	},
	
	updateRulerAppearanceWithDelay : function() 
	{
		if (this._updateRulerAppearanceWithDelayTimer) {
			window.clearTimeout(this._updateRulerAppearanceWithDelayTimer);
			this._updateRulerAppearanceWithDelayTimer = null;
		}
		this._updateRulerAppearanceWithDelayTimer = window.setTimeout(function(aSelf) {
			aSelf.updateRulerAppearance();
			aSelf._updateRulerAppearanceWithDelayTimer = null;
		}, 0, this);
	},
	_updateRulerAppearanceWithDelayTimer : null,
  
	buildRulerMarks : function() 
	{
		var rulerBox = this.scaleBar;

		var fontSize = this.fontSize;
		var size = parseInt(fontSize / 2);
		var numCellWidth = 5;
		var wrapLength = this.wrapLength;
		var maxCount = Math.max(wrapLength * 3, this.maxCount);
		var counterCol = this.columnLevel3;
		if (counterCol <= 0) counterCol = 20;
		var minCol = this.columnLevel1;
		if (minCol <= 0) minCol = 2;

		var unit, level;
		var fragment = document.createDocumentFragment();
		for (let i = 0; i < maxCount; i++)
		{
			level = i % counterCol == 0 ? 3 :
					i % 10 == 0 ? 2 :
					i % minCol == 0 ? 1 :
					0 ;
			unit = document.createElement('vbox');
			unit.setAttribute('class', this.kRULER_CELL+' level'+level);
			unit.setAttribute(this.kRULER_CELL, true);
			if (wrapLength && i == wrapLength)
				unit.setAttribute(this.kWRAP_CELL, true);
			unit.setAttribute('style', 'width:'+size+'px');
			unit.setAttribute('count', i);
			unit.setAttribute('tooltiptext', i);
			fragment.appendChild(unit);

			if (level == 3) {
				unit.appendChild(document.createElement('label'))
					.setAttribute('value', i);
				unit.setAttribute(
					'style',
					'width:'+(size*numCellWidth)+'px;'+
					'margin-right:-'+(size*(numCellWidth-1))+'px;'
				);
			}
		}
		rulerBox.appendChild(fragment);
	},
 
	updateWrapMarker : function(aWrap) 
	{
		if (!aWrap || aWrap < 0)
			aWrap = this.wrapLength;

		var position = !aWrap ?
						0 :
					aWrap == this.wrapLength ?
						this.wrapCell.boxObject.screenX - this.scaleBar.boxObject.screenX :
						aWrap * this.wrapCell.boxObject.width;

		this.wrapMarker.style.marginLeft = (position + this.offset)+'px';
		if (position)
			this.wrapMarker.setAttribute('tooltiptext', aWrap);
		else
			this.wrapMarker.removeAttribute('tooltiptext');
	},
 
	updateOffset : function() 
	{
		var offset = this.offset;
		for (let node of this.bar.childNodes)
		{
			node.style.marginLeft = offset+'px';
		}
	},
  
	updateCursor : function(aReason) 
	{
		if (this._updating || !this.editor) return;

		this._updating = true;
		this.lastReason = aReason || 0 ;

		try {
			var lastPos = 0;
			var current = this.currentCell;
			var marks = this.marks;
			if (current) {
				lastPos = marks.indexOf(current);
				current.removeAttribute(this.kCURRENT);
			}

			var line = this.getCurrentLine(this.editor.selection);
			if ('physicalPosition' in line) {
				this.cursor.style.marginLeft = (this.offset + line.physicalPosition)+'px';
			}
			else {
				var pos = (this.lastPosition == this.kLINE_TOP) ? 0 : line.leftCount ;
				if (pos in marks)
					marks[pos].setAttribute(this.kCURRENT, true);
			}
		}
		catch(e) {
			dump(e+'\n');
		}

		this._updating = false;
	},
	_updating : false,
	lastReason : -1,
	
	getCurrentLine : function(aSelection, aForcePhysical) 
	{
		var isPhysical = aForcePhysical || this.physical;
		if (!aSelection.rangeCount) {
			var line = {
				left       : '',
				leftCount  : 0,
				right      : '',
				rightCount : 0
			};
			if (isPhysical) line.physicalPosition = 0;
			return line;
		}

		var node = aSelection.focusNode;
		var leftRange = node.ownerDocument.createRange();
		var rightRange = node.ownerDocument.createRange();
		var offset = aSelection.focusOffset;
		if (node.nodeType != Node.TEXT_NODE) {
			node = this.getPreviousNodeFromSelection(aSelection) || node;
			offset = (node.nodeType == Node.TEXT_NODE) ? node.nodeValue.length : 0 ;
		}
		var focusNode = node;

		leftRange.selectNode(node);
		rightRange.selectNode(node);
		if (node.nodeType == Node.TEXT_NODE) {
			leftRange.setEnd(node, offset);
			rightRange.setStart(node, offset);
		}
		else {
			rightRange.collapse(false);
		}

		node = this.getLineTopOrEnd(focusNode, -1);
		if (node && (node != node.ownerDocument.body))
			leftRange.setStartBefore(node);

		node = this.getLineTopOrEnd(focusNode, 1);
		if (node && (node != node.ownerDocument.body))
			rightRange.setEndAfter(node);

		var line  = {
				focusNode : focusNode
			};

		if (isPhysical) {
			this.updateCalculator();

			let doc = this.calculator.contentDocument;
			let startMarker = doc.createElement('span');
			startMarker.setAttribute('id', 'start-marker');
			let endMarker = doc.createElement('span');
			endMarker.setAttribute('id', 'end-marker');

			let fragment = doc.createDocumentFragment();
			fragment.appendChild(startMarker);
			if (!leftRange.collapsed)
				fragment.appendChild(doc.importNode(leftRange.cloneContents(), true));
			fragment.appendChild(endMarker);
			if (!rightRange.collapsed)
				fragment.appendChild(doc.importNode(rightRange.cloneContents(), true));

			let cRange = doc.createRange();
			cRange.selectNodeContents(doc.body);
			cRange.deleteContents();
			cRange.insertNode(fragment);
			cRange.detach();

			line.physicalPosition = this.getBoxObjectFor(endMarker).x - this.getBoxObjectFor(startMarker).x;
			return line;
		}
		else {
			var left = leftRange.toString();
			line.left      = left;
			line.leftCount = this.getLogicalLength(left);

			var right = rightRange.toString();
			line.right      = right;
			line.rightCount = this.getLogicalLength(right);

			return this.processWrap(line);
		}
	},
	
	getPreviousNodeFromSelection : function(aSelection) 
	{
		var condition = this.getConditionToMatchElements('BR BODY');
		var nodes = this.evaluateXPath(
				'descendant-or-self::*['+condition+'] | descendant::text()',
				aSelection.focusNode,
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
			);
		var selectionRange = aSelection.getRangeAt(0);
		var node;
		var nodeRange = aSelection.focusNode.ownerDocument.createRange();
		for (var i = 0, maxi = nodes.snapshotLength; i < maxi; i++)
		{
			node = nodes.snapshotItem(i);
			nodeRange.selectNode(node);
			if (nodeRange.compareBoundaryPoints(Range.START_TO_END, selectionRange) == 0)
				return node;
		}
		return null;
	},
 
// pixel-based method 
	
	getLineTopOrEnd : function(aBase, aDir) 
	{
		var axis1 = aDir < 0 ? 'preceding' : 'following' ;
		var axis2 = aDir < 0 ? 'ancestor' : 'descendant' ;
		var backAxis1 = aDir < 0 ? 'following' : 'preceding' ;
		var backAxis2 = aDir < 0 ? 'descendant' : 'ancestor' ;
		var rejectList = 'BR '+this.kSTRUCTURE_ELEMENTS+' '+this.kBLOCK_ELEMENTS;
		var condition = '['+this.getConditionToMatchElements(rejectList)+' or @_moz_quote="true"]';
		var nodes = this.evaluateXPath(
				'self::*'+condition+' | '+axis1+'::*'+condition+' | '+axis2+'::*'+condition,
				aBase,
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
			);
		var node = nodes.snapshotItem(aDir < 0 ? nodes.snapshotLength-1 : 0 );
		var useBackAxis = false;
		if (node) {
			axis1 = backAxis1;
			axis2 = backAxis2;
			useBackAxis = true;
		}
		nodes = this.evaluateXPath(
			axis1+'::* | '+axis1+'::text() | '+axis2+'::* | '+axis2+'::text()',
			node || aBase,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
		);
		node = !nodes.snapshotLength ? null :
				nodes.snapshotItem(
					(useBackAxis) ?
						(aDir < 0 ? 0 : nodes.snapshotLength-1 ) :
						(aDir < 0 ? nodes.snapshotLength-1 : 0 )
				);

		if (node) {
			var selectionRange = aBase.ownerDocument.createRange();
			selectionRange.selectNode(aBase);
			var nodeRange = aBase.ownerDocument.createRange();
			nodeRange.selectNode(node);
			if (aDir < 0 ?
				(nodeRange.compareBoundaryPoints(Range.END_TO_START, selectionRange) >= 0) :
				(nodeRange.compareBoundaryPoints(Range.START_TO_END, selectionRange) <= 0)) {
				node = null;
			}
		}

		return node;
	},
 
	initCalculator : function() 
	{
		var d = this.calculator.contentDocument;
		var head = d.getElementsByTagName('HEAD')[0];
		if (head.getAttribute('initialized') == 'true') return;

		var link = d.createElement('LINK');
		link.setAttribute('rel', 'stylesheet');
		link.setAttribute('href', 'chrome://messenger/skin/messageBody.css');
		head.appendChild(link);
		head.setAttribute('initialized', 'true');
	},
 
	updateCalculator : function() 
	{
		if (!this.calculator.contentDocument ||
			!this.calculator.contentDocument.body) return;

		this.initCalculator();

		var w = this.frame.contentWindow;
		var d = this.frame.contentDocument;
		var b = this.contentBody;

		var calculatorStyle = this.calculator.contentDocument.body.style;
		calculatorStyle.margin = w.getComputedStyle(b, '').margin;
		calculatorStyle.padding = w.getComputedStyle(b, '').padding;
		calculatorStyle.fontSize = this.fontSize+'px';
		calculatorStyle.fontFamily = this.fontFamily;
		var wrapLength = this.wrapLength;
		calculatorStyle.width = wrapLength ?
				wrapLength+'ch' :
				this.getBoxObjectFor(b).width+'px' ;
		calculatorStyle.whiteSpace = (wrapLength || this.frame.editortype == 'textmail')  ?
				'pre-wrap' :
				'normal' ;
	},
  
// character-based method 
	
	getLogicalLength : function(aString) 
	{
		var count = 0;
		aString.split('').forEach(function(aChar) {
			count += this.getLogicalLengthOfCharacter(aChar);
		}, this);
		return count;
	},
	
	getLogicalLengthOfCharacter : function(aChar) 
	{
		var code = aChar.charCodeAt(0);
		if (code == 9) { // Tab
			return this.tabWidth;
		}
		else if (code >=  0 && code <= 127) { // ASCII
			return 1;
		}
		else {
			return this.nonAsciiWidth;
		}
	},
  
	processWrap : function(aLine) 
	{
		if ('physicalPosition' in aLine) return aLine;

		var wrapLength = this.wrapLength;
		if (!this.shouldRoop || wrapLength <= 0) {
			this.lastPosition = this.calculateNewPosition(aLine);
			return aLine;
		}

		var leftCount = aLine.leftCount;
		if (leftCount > wrapLength) {
			leftCount = (leftCount % wrapLength) || wrapLength;
			var oldLeft = aLine.left.split('').reverse();
			var newLeft = '';
			for (let count = 0, char, i = 0; count < leftCount; i++)
			{
				char = oldLeft[i];
				newLeft = char + newLeft;
				count += this.getLogicalLengthOfCharacter(char);
			}
			aLine.left = newLeft;
			aLine.leftCount = leftCount;
			if (aLine.leftCount % 2 != this.getLogicalLength(aLine.left) % 2) {
				if (aLine.leftCount == wrapLength) {
					aLine.leftCount = wrapLength-1;
				}
				else {
					aLine.leftCount++;
				}
			}
		}

		if (aLine.leftCount + aLine.rightCount > wrapLength) {
			var rightCount = wrapLength - aLine.leftCount;
			var oldRight = aLine.right.split('');
			var newRight = '';
			for (let count = 0, char, i = 0; count < rightCount; i++)
			{
				char = oldRight[i];
				newRight = char + newRight;
				count += this.getLogicalLengthOfCharacter(char);
			}
			aLine.right = newRight;
			aLine.rightCount = rightCount;
		}

		this.lastPosition = this.calculateNewPosition(aLine);

		return aLine;
	},
	
	calculateNewPosition : function(aLine) 
	{
		if (!this.shouldRoop || aLine.leftCount != this.wrapLength) {
			return (aLine.focusNode.nodeType == Node.ELEMENT_NODE &&
				aLine.focusNode.localName.toLowerCase() == 'br') ? this.kLINE_TOP :
				!aLine.leftCount ? this.kLINE_TOP :
				!aLine.rightCount ? this.kLINE_END :
				this.kLINE_MIDDLE ;
		}

		// Maybe last of the line or top of the next line
		var onTop = false;
		const nsISelectionListener = Components.interfaces.nsISelectionListener;
		var reason = this.lastReason;
		if (
			!aLine.rightCount &&
			reason &&
			(
				reason & nsISelectionListener.MOUSEDOWN_REASON ||
				reason & nsISelectionListener.MOUSEUP_REASON
			)
			) {
			var bodyBox = this.getBoxObjectFor(this.contentBody);
			onTop = this.lastClickedScreenX < bodyBox.screenX + (bodyBox.width / 3);
		}
		else if (
			reason &&
			reason & nsISelectionListener.KEYPRESS_REASON &&
			!(reason & nsISelectionListener.SELECTALL_REASON)
			) {
			const nsIDOMKeyEvent = Components.interfaces.nsIDOMKeyEvent;
			switch (this.lastKeyCode)
			{
				case nsIDOMKeyEvent.DOM_VK_LEFT:
					onTop = this.lastPosition == this.kLINE_MIDDLE;
					break;

				case nsIDOMKeyEvent.DOM_VK_RIGHT:
					onTop = this.lastPosition == this.kLINE_END;
					break;

				case nsIDOMKeyEvent.DOM_VK_UP:
				case nsIDOMKeyEvent.DOM_VK_DOWN:
				case nsIDOMKeyEvent.DOM_VK_PAGE_UP:
				case nsIDOMKeyEvent.DOM_VK_PAGE_DOWN:
					onTop = this.lastPosition == this.kLINE_TOP;
					break;

				case nsIDOMKeyEvent.DOM_VK_HOME:
					onTop = true;
					break;

				case nsIDOMKeyEvent.DOM_VK_BACK_SPACE:
					onTop = this.lastPosition == this.kLINE_MIDDLE;
					break;

				default:
					break;
			}
		}
		return onTop ? this.kLINE_TOP : this.kLINE_END ;
	},

	observe : function(aSubject, aTopic, aPrefName) 
	{
		if (aTopic != 'nsPref:changed') return;

		var value = this.prefs.getPref(aPrefName);
		switch (aPrefName)
		{
			default:
				if (aPrefName.indexOf('font.size.') == 0) {
					this.initRuler();
				}
				else if (aPrefName.indexOf('browser.display.') == 0) {
					this.updateRulerAppearanceWithDelay();
				}
				return;

			case 'mailnews.wraplength':
				this._wrapLength = value;
				this.editor.document.body.style.width = value+'ch';
				break;

			case 'extensions.rulerbar.tabWidth':
				this.tabWidth = value;
				return;

			case 'extensions.rulerbar.nonAsciiWidth':
				this.nonAsciiWidth = value;
				return;

			case 'extensions.rulerbar.shouldRoop':
				this.shouldRoop = value;
				return;

			case 'extensions.rulerbar.maxCount':
				this.maxCount = value;
				break;

			case 'extensions.rulerbar.column.level3':
				this.columnLevel3 = value;
				break;

			case 'extensions.rulerbar.column.level1':
				this.columnLevel1 = value;
				break;

			case 'extensions.rulerbar.scale':
				this.scale = value;
				break;

			case 'extensions.rulerbar.physicalPositioning':
				this.physical = value;
				this.cursor.hidden = !value;
				break;
		}
		this.initRuler();
	},
	domains : [
		'extensions.rulerbar.',
		'mailnews.wraplength',
		'font.size.',
		'browser.display.foreground_color',
		'browser.display.background_color',
		'browser.display.use_system_colors'
	]
  
}; 

window.addEventListener('DOMContentLoaded', RulerBar, false);
  
