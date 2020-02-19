self.onmessage = function(event) {
	let {oldData, newData, ratio, func} = event.data;

	self[func](oldData, newData, ratio);

	self.postMessage(newData);
};

/* exported nineResample*/
function nineResample(oldData, newData) {
	let oldPix = oldData.data;
	let oldWidth = oldData.width;
	let newPix = newData.data;
	let newLength = newPix.length;

	let rowLength = oldWidth * 4;
	let rowLengthTimes2 = rowLength * 2;
	let row0 = 0;
	let row1 = rowLength;
	let row2 = rowLengthTimes2;

	let r, g, b, nextRow;
	let offset = 0;
	while (offset < newLength) {
		nextRow = row1;
		while (row0 < nextRow) {
			r = g = b = 0;

			r += oldPix[row0++];
			g += oldPix[row0++];
			b += oldPix[row0++];
			row0++;
			r += oldPix[row0++];
			g += oldPix[row0++];
			b += oldPix[row0++];
			row0++;
			r += oldPix[row0++];
			g += oldPix[row0++];
			b += oldPix[row0++];
			row0++;

			r += oldPix[row1++];
			g += oldPix[row1++];
			b += oldPix[row1++];
			row1++;
			r += oldPix[row1++];
			g += oldPix[row1++];
			b += oldPix[row1++];
			row1++;
			r += oldPix[row1++];
			g += oldPix[row1++];
			b += oldPix[row1++];
			row1++;

			r += oldPix[row2++];
			g += oldPix[row2++];
			b += oldPix[row2++];
			row2++;
			r += oldPix[row2++];
			g += oldPix[row2++];
			b += oldPix[row2++];
			row2++;
			r += oldPix[row2++];
			g += oldPix[row2++];
			b += oldPix[row2++];
			row2++;

			newPix[offset++] = r * 0.11111;
			newPix[offset++] = g * 0.11111;
			newPix[offset++] = b * 0.11111;
			newPix[offset++] = 255;
		}
		row0 += rowLengthTimes2;
		row1 += rowLengthTimes2;
		row2 += rowLengthTimes2;
	}
}

/* exported fourResample*/
function fourResample(oldData, newData) {
	let oldPix = oldData.data;
	let oldWidth = oldData.width;
	let newPix = newData.data;
	let newLength = newPix.length;

	let rowLength = oldWidth * 4;
	let row0 = 0;
	let row1 = rowLength;

	let r, g, b, nextRow;
	let offset = 0;
	while (offset < newLength) {
		nextRow = row1;
		while (row0 < nextRow) {
			r = g = b = 0;

			r += oldPix[row0++];
			g += oldPix[row0++];
			b += oldPix[row0++];
			row0++;
			r += oldPix[row0++];
			g += oldPix[row0++];
			b += oldPix[row0++];
			row0++;

			r += oldPix[row1++];
			g += oldPix[row1++];
			b += oldPix[row1++];
			row1++;
			r += oldPix[row1++];
			g += oldPix[row1++];
			b += oldPix[row1++];
			row1++;

			newPix[offset++] = r * 0.25;
			newPix[offset++] = g * 0.25;
			newPix[offset++] = b * 0.25;
			newPix[offset++] = 255;
		}
		row0 += rowLength;
		row1 += rowLength;
	}
}

/* exported floatResample*/
function floatResample(oldData, newData, ratio) {
	let oldPix = oldData.data;
	let oldWidth = oldData.width;
	let newPix = newData.data;
	let newWidth = newData.width;
	let newHeight = newData.height;

	let y, startY, endY, oldY;
	let x, startX, endX, oldX;
	let r, g, b, count, i, offset;
	let newIndex = 0;

	endY = 0;
	for (y = 1; y <= newHeight; ++y) {
		startY = endY;
		endY = Math.floor(y * ratio);

		endX = 0;
		for (x = 1; x <= newWidth; ++x) {
			startX = endX;
			endX = Math.floor(x * ratio);

			r = g = b = 0;
			count = (endX - startX) * (endY - startY);
			i = startY * oldWidth;

			for (oldY = startY; oldY < endY; ++oldY) {
				for (oldX = startX; oldX < endX; ++oldX) {
					offset = (i + oldX) * 4;
					r += oldPix[offset++];
					g += oldPix[offset++];
					b += oldPix[offset++];
				}
				i += oldWidth;
			}

			newPix[newIndex++] = r / count;
			newPix[newIndex++] = g / count;
			newPix[newIndex++] = b / count;
			newPix[newIndex++] = 255;
		}
	}
}
