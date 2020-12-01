/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
"use strict";

import { React, PropTypes } from "../content/es-modules/ui.js";
export function TextBox({
  disabled = false,
  title,
  value = "",
  name,
  onChange = () => {}
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", null, title)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    },
    disabled: disabled
  })));
}
TextBox.propTypes = {
  disabled: PropTypes.bool.isRequired,
  title: PropTypes.string,
  value: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};
export function TextArea({
  value = "",
  name,
  onChange = () => {}
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("textarea", {
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    }
  })));
}
TextArea.propTypes = {
  value: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};