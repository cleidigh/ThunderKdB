/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals React, PropTypes */

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
  return React.createElement("li", {
    className: "tag" + (isLight ? " light-tag" : ""),
    style: {
      backgroundColor: color
    }
  }, name, expanded && React.createElement("span", {
    className: "tag-x",
    onClick: onClickX
  }, " ", "x"));
}

MessageTag.propTypes = {
  onClickX: PropTypes.func.isRequired,
  expanded: PropTypes.bool.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired
};

function MessageTags({
  expanded,
  tags = [],
  onTagsChange
}) {
  function removeTag(tagId) {
    const filtered = tags.filter(tag => tag.id !== tagId);

    if (filtered.length !== tags.length) {
      // Only trigger a change if we actually removed a tag
      onTagsChange(filtered);
    }
  }

  return React.createElement("ul", {
    className: "tags regular-tags"
  }, tags.map((tag, i) => React.createElement(MessageTag, {
    color: tag.color,
    expanded: expanded,
    id: tag.id,
    key: i,
    name: tag.name,
    onClickX: () => {
      removeTag(tag.id);
    }
  })));
}

MessageTags.propTypes = {
  expanded: PropTypes.bool.isRequired,
  tags: PropTypes.array.isRequired,
  onTagsChange: PropTypes.func.isRequired
};

function Icon(props) {
  const {
    path
  } = props;
  return React.createElement("svg", {
    className: "icon",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    xmlnsXlink: "http://www.w3.org/1999/xlink"
  }, React.createElement("use", {
    xlinkHref: path
  }));
}

Icon.propTypes = {
  path: PropTypes.string.isRequired
};

function DkimTooltip({
  strings
}) {
  const [primaryString, secondaryStrings = []] = strings;
  const primaryTooltip = React.createElement("div", null, primaryString);
  const secondaryTooltip = secondaryStrings.length ? React.createElement(React.Fragment, null, React.createElement("hr", null), secondaryStrings.map((s, i) => React.createElement("div", {
    key: i
  }, s)), React.createElement("div", null)) : null;
  return React.createElement("span", null, primaryTooltip, secondaryTooltip);
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
  return React.createElement("li", {
    className: classNames + " special-tag" + (onClick ? " can-click" : ""),
    title: title,
    onClick: onClick
  }, React.createElement(Icon, {
    path: icon
  }), name, tooltip.type === "dkim" && React.createElement(DkimTooltip, {
    strings: tooltip.strings
  }));
}

SpecialMessageTag.propTypes = {
  classNames: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  title: PropTypes.string,
  onClick: PropTypes.func,
  tooltip: PropTypes.object.isRequired
};

function SpecialMessageTags({
  onTagClick,
  onFolderClick = null,
  specialTags,
  strings,
  inView,
  folderName
}) {
  let folderItem = null;

  if (folderName && !inView) {
    folderItem = React.createElement("li", {
      className: "in-folder",
      onClick: onFolderClick,
      title: strings.get("jumpToFolder")
    }, strings.get("inFolder", [folderName]));
  }

  return React.createElement("ul", {
    className: "tags special-tags"
  }, specialTags.map((tag, i) => React.createElement(SpecialMessageTag, {
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
  specialTags: PropTypes.array.isRequired,
  strings: PropTypes.object.isRequired
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