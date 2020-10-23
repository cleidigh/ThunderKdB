/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals React, PropTypes, ContactLabel */

/* exported MessageDetails */
class ContactLine extends React.PureComponent {
  render() {
    return this.props.contacts.map((to, i) => {
      return /*#__PURE__*/React.createElement(ContactLabel, {
        className: "",
        contact: to,
        detailView: true,
        key: i
      });
    });
  }

}

ContactLine.propTypes = {
  className: PropTypes.string.isRequired,
  contacts: PropTypes.array.isRequired
};

class MessageDetails extends React.PureComponent {
  render() {
    return /*#__PURE__*/React.createElement("div", null, !!this.props.from && /*#__PURE__*/React.createElement("div", {
      className: "detailsLine fromLine"
    }, /*#__PURE__*/React.createElement("u", null, browser.i18n.getMessage("message.fromHeader")), " ", /*#__PURE__*/React.createElement(ContactLabel, {
      className: "",
      contact: this.props.from,
      detailView: true
    })), !!this.props.to.length && /*#__PURE__*/React.createElement("div", {
      className: "detailsLine toLine"
    }, /*#__PURE__*/React.createElement("u", null, browser.i18n.getMessage("message.toHeader")), " ", /*#__PURE__*/React.createElement(ContactLine, {
      className: "to",
      contacts: this.props.to
    })), !!this.props.cc.length && /*#__PURE__*/React.createElement("div", {
      className: "detailsLine ccLine"
    }, /*#__PURE__*/React.createElement("u", null, browser.i18n.getMessage("message.ccHeader")), " ", /*#__PURE__*/React.createElement(ContactLine, {
      className: "cc",
      contacts: this.props.cc
    })), !!this.props.bcc.length && /*#__PURE__*/React.createElement("div", {
      className: "detailsLine bccLine"
    }, /*#__PURE__*/React.createElement("u", null, browser.i18n.getMessage("compose.fieldBcc")), " ", /*#__PURE__*/React.createElement(ContactLine, {
      className: "bcc",
      contacts: this.props.bcc
    })), !!this.props.extraLines && !!this.props.extraLines.length && this.props.extraLines.map((line, i) => {
      return /*#__PURE__*/React.createElement("div", {
        className: "detailsLine",
        key: i
      }, /*#__PURE__*/React.createElement("u", null, line.key, ":"), " ", line.value);
    }));
  }

}

MessageDetails.propTypes = {
  bcc: PropTypes.array.isRequired,
  cc: PropTypes.array.isRequired,
  extraLines: PropTypes.array,
  from: PropTypes.object.isRequired,
  to: PropTypes.array.isRequired
};