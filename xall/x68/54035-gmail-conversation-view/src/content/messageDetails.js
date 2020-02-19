/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals React, PropTypes, ContactLabel */

/* exported MessageDetails */
class ContactLine extends React.PureComponent {
  render() {
    return this.props.contacts.map((to, i) => {
      return React.createElement(ContactLabel, {
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
    return React.createElement("div", null, !!this.props.from && React.createElement("div", {
      className: "detailsLine fromLine"
    }, React.createElement("u", null, this.props.strings.get("fieldFrom")), " ", React.createElement(ContactLabel, {
      className: "",
      contact: this.props.from,
      detailView: true
    })), !!this.props.to.length && React.createElement("div", {
      className: "detailsLine toLine"
    }, React.createElement("u", null, this.props.strings.get("fieldTo")), " ", React.createElement(ContactLine, {
      className: "to",
      contacts: this.props.to
    })), !!this.props.cc.length && React.createElement("div", {
      className: "detailsLine ccLine"
    }, React.createElement("u", null, this.props.strings.get("fieldCc")), " ", React.createElement(ContactLine, {
      className: "cc",
      contacts: this.props.cc
    })), !!this.props.bcc.length && React.createElement("div", {
      className: "detailsLine bccLine"
    }, React.createElement("u", null, this.props.strings.get("fieldBcc")), " ", React.createElement(ContactLine, {
      className: "bcc",
      contacts: this.props.bcc
    })), this.props.extraLines && !!this.props.extraLines.length && this.props.extraLines.map((line, i) => {
      return React.createElement("div", {
        className: "detailsLine",
        key: i
      }, React.createElement("u", null, line.key, ":"), " ", line.value);
    }));
  }

}

MessageDetails.propTypes = {
  bcc: PropTypes.array.isRequired,
  cc: PropTypes.array.isRequired,
  extraLines: PropTypes.array.isRequired,
  from: PropTypes.object.isRequired,
  strings: PropTypes.object.isRequired,
  to: PropTypes.array.isRequired
};