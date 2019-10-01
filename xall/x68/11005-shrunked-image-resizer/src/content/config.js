/* globals Preferences */
Preferences.addAll([
	{ id: "extensions.shrunked.fileSizeMinimum", type: "int" },
	{ id: "extensions.shrunked.default.maxWidth", type: "int" },
	{ id: "extensions.shrunked.default.maxHeight", type: "int" },
	{ id: "extensions.shrunked.default.quality", type: "int" },
	{ id: "extensions.shrunked.options.resample", type: "bool" },
	{ id: "extensions.shrunked.options.exif", type: "bool" },
	{ id: "extensions.shrunked.options.orientation", type: "bool" },
	{ id: "extensions.shrunked.options.gps", type: "bool" },
	{ id: "extensions.shrunked.log.enabled", type: "bool" },
	{ id: "extensions.shrunked.resizeAttachmentsOnSend", type: "bool" },
]);

var p_minsize = Preferences.get("extensions.shrunked.fileSizeMinimum");
var p_maxwidth = Preferences.get("extensions.shrunked.default.maxWidth");
var p_maxheight = Preferences.get("extensions.shrunked.default.maxHeight");
var p_quality = Preferences.get("extensions.shrunked.default.quality");

/* globals tb_minsize, rg_size, r_noresize,
   r_small, r_medium, r_large, r_custom, l_width, tb_width, l_height, tb_height, s_quality,
   cb_exif, cb_orient, cb_gps */
for (let element of document.querySelectorAll('[id]')) {
	window[element.id] = element;
}

/* exported load */
function load() {
	tb_minsize.value = p_minsize.value;
	let maxWidth = p_maxwidth.value;
	let maxHeight = p_maxheight.value;
	if (maxWidth == -1 && maxHeight == -1) {
		rg_size.selectedIndex = 0;
	} else if (maxWidth == 500 && maxHeight == 500) {
		rg_size.selectedIndex = 1;
	} else if (maxWidth == 800 && maxHeight == 800) {
		rg_size.selectedIndex = 2;
	} else if (maxWidth == 1200 && maxHeight == 1200) {
		rg_size.selectedIndex = 3;
	} else {
		rg_size.selectedIndex = 4;
		tb_width.value = maxWidth;
		tb_height.value = maxHeight;
	}
	setSize();

	s_quality.value = p_quality.value;

	enableExif();
}

/* exported setSize */
function setSize() {
	l_width.disabled = tb_width.disabled =
		l_height.disabled = tb_height.disabled = !r_custom.selected;
	if (r_noresize.selected) {
		p_maxwidth.value = -1;
		p_maxheight.value = -1;
	} else if (r_small.selected) {
		p_maxwidth.value = 500;
		p_maxheight.value = 500;
	} else if (r_medium.selected) {
		p_maxwidth.value = 800;
		p_maxheight.value = 800;
	} else if (r_large.selected) {
		p_maxwidth.value = 1200;
		p_maxheight.value = 1200;
	} else {
		p_maxwidth.value = tb_width.value;
		p_maxheight.value = tb_height.value;
	}
}

/* exported enableExif */
function enableExif() {
	cb_orient.disabled = cb_gps.disabled = !cb_exif.checked;
}
