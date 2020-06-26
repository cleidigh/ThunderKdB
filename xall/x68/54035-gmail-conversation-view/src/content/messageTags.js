/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals React, PropTypes, SvgIcon */

/* exported MessageTags, SpecialMessageTags */

/**
 * Determine if a background color is light enough to require dark text.
 *
 * @param {string} color
 * @returns {boolean}
 */
function isColorLight(color) {
  const rgb = color.substr(1) || "FFFFFF";
  const [, r, g, b] = rgb.match(/(..)(..)(..)/).map(x => parseInt(x, 16) / 255);
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return l > 0.8;
}

function MessageTag({
  onClickX,
  expanded,
  name,
  color
}) {
  const isLight = isColorLight(color);
  return /*#__PURE__*/React.createElement("li", {
    className: "tag" + (isLight ? " light-tag" : ""),
    style: {
      backgroundColor: color
    }
  }, name, expanded && /*#__PURE__*/React.createElement("span", {
    className: "tag-x",
    onClick: onClickX
  }, " ", "x"));
}

MessageTag.propTypes = {
  onClickX: PropTypes.func.isRequired,
  expanded: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired
};

function MessageTags({
  expanded,
  tags = [],
  onTagsChange
}) {
  function removeTag(tagId) {
    const filtered = tags.filter(tag => tag.key !== tagId);

    if (filtered.length !== tags.length) {
      // Only trigger a change if we actually removed a tag
      onTagsChange(filtered);
    }
  }

  return /*#__PURE__*/React.createElement("ul", {
    className: "tags regular-tags"
  }, tags.map((tag, i) => /*#__PURE__*/React.createElement(MessageTag, {
    color: tag.color,
    expanded: expanded,
    key: i,
    name: tag.name,
    onClickX: () => {
      removeTag(tag.key);
    }
  })));
}

MessageTags.propTypes = {
  expanded: PropTypes.bool.isRequired,
  tags: PropTypes.array.isRequired,
  onTagsChange: PropTypes.func.isRequired
};

function DkimTooltip({
  strings
}) {
  const [primaryString, secondaryStrings = []] = strings;
  const primaryTooltip = /*#__PURE__*/React.createElement("div", null, primaryString);
  const secondaryTooltip = secondaryStrings.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("hr", null), secondaryStrings.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, s)), /*#__PURE__*/React.createElement("div", null)) : null;
  return /*#__PURE__*/React.createElement("span", null, primaryTooltip, secondaryTooltip);
}

DkimTooltip.propTypes = {
  strings: PropTypes.array.isRequired
};

function SpecialMessageTag({
  icon,
  name,
  title = "",
  tooltip = {},
  onClick = null,
  classNames
}) {
  return /*#__PURE__*/React.createElement("li", {
    className: classNames + " special-tag" + (onClick ? " can-click" : ""),
    title: title,
    onClick: onClick
  }, /*#__PURE__*/React.createElement(SvgIcon, {
    fullPath: icon
  }), name, tooltip.type === "dkim" && /*#__PURE__*/React.createElement(DkimTooltip, {
    strings: tooltip.strings
  }));
}

SpecialMessageTag.propTypes = {
  classNames: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  title: PropTypes.string,
  onClick: PropTypes.func,
  tooltip: PropTypes.object
};

function SpecialMessageTags({
  onTagClick,
  onFolderClick = null,
  specialTags,
  inView,
  folderName
}) {
  let folderItem = null;

  if (folderName && !inView) {
    folderItem = /*#__PURE__*/React.createElement("li", {
      className: "in-folder",
      onClick: onFolderClick,
      title: browser.i18n.getMessage("tags.jumpToFolder.tooltip")
    }, browser.i18n.getMessage("tags.inFolder", [folderName]));
  }

  return /*#__PURE__*/React.createElement("ul", {
    className: "tags special-tags"
  }, specialTags && specialTags.map((tag, i) => /*#__PURE__*/React.createElement(SpecialMessageTag, {
    classNames: tag.classNames,
    icon: tag.icon,
    key: i,
    name: tag.name,
    onClick: tag.details && (event => onTagClick(event, tag)),
    title: tag.title,
    tooltip: tag.tooltip
  })), folderItem);
}

SpecialMessageTags.propTypes = {
  onTagClick: PropTypes.func.isRequired,
  onFolderClick: PropTypes.func,
  folderName: PropTypes.string.isRequired,
  inView: PropTypes.bool.isRequired,
  specialTags: PropTypes.array
}; // This is temporary code to allow using using this as both
// an es-module and as-is with global variables. This code
// should be removed when the transition to a WebExtension is
// complete.

if (window.esExports) {
  window.esExports.MessageTag = MessageTag;
  window.esExports.MessageTags = MessageTags;
  window.esExports.SpecialMessageTag = SpecialMessageTag;
  window.esExports.SpecialMessageTags = SpecialMessageTags;
}