/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals PropTypes, React, ReactDOM, ReactRedux, SvgIcon, summaryActions */

/* exported ContactDetail */
class _ContactDetail extends React.PureComponent {
  constructor(props) {
    super(props);
    this.addContact = this.addContact.bind(this);
    this.editContact = this.editContact.bind(this);
    this.createFilter = this.createFilter.bind(this);
    this.copyEmail = this.copyEmail.bind(this);
    this.sendEmail = this.sendEmail.bind(this);
    this.showInvolving = this.showInvolving.bind(this);
    this.onGeneralClick = this.onGeneralClick.bind(this);
  }

  onGeneralClick(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  addContact(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch({
      type: "ADD_CONTACT",
      name: this.props.name,
      email: this.props.realEmail
    });
  }

  createFilter(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch({
      type: "CREATE_FILTER",
      email: this.props.realEmail
    });
  }

  copyEmail(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch({
      type: "COPY_EMAIL",
      email: this.props.realEmail
    });
  }

  editContact(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch({
      type: "EDIT_CONTACT",
      name: this.props.name,
      email: this.props.realEmail
    });
  }

  sendEmail(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(summaryActions.sendEmail({
      name: this.props.name,
      email: this.props.realEmail
    }));
  }

  showInvolving(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch(summaryActions.showMessagesInvolving({
      name: this.props.name,
      email: this.props.realEmail
    }));
  }

  render() {
    const name = this.props.name;
    const pos = this.props.parentSpan && this.props.parentSpan.getBoundingClientRect() || {
      left: 0,
      top: 0,
      bottom: 0
    };
    const elm = /*#__PURE__*/React.createElement("div", {
      className: "tooltip",
      style: {
        left: pos.left,
        top: pos.top + window.scrollY + (pos.bottom - pos.top) * 2
      },
      onClick: this.onGeneralClick
    }, /*#__PURE__*/React.createElement("div", {
      className: "arrow"
    }), /*#__PURE__*/React.createElement("div", {
      className: "arrow inside"
    }), /*#__PURE__*/React.createElement("div", {
      className: "authorInfoContainer"
    }, /*#__PURE__*/React.createElement("div", {
      className: "authorInfo"
    }, /*#__PURE__*/React.createElement("span", {
      className: "name",
      title: name
    }, name), /*#__PURE__*/React.createElement("span", {
      className: "authorEmail"
    }, /*#__PURE__*/React.createElement("span", {
      className: "authorEmailAddress",
      title: this.props.realEmail
    }, this.props.realEmail), /*#__PURE__*/React.createElement("button", {
      className: "copyEmail",
      title: browser.i18n.getMessage("contact.copyEmailTooltip"),
      onClick: this.copyEmail
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "content_copy"
    })))), /*#__PURE__*/React.createElement("div", {
      className: "authorPicture"
    }, /*#__PURE__*/React.createElement("img", {
      src: this.props.avatar
    }))), /*#__PURE__*/React.createElement("div", {
      className: "tipFooter"
    }, /*#__PURE__*/React.createElement("button", {
      className: "sendEmail",
      title: browser.i18n.getMessage("contact.sendEmailTooltip"),
      onClick: this.sendEmail
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "mail"
    })), /*#__PURE__*/React.createElement("button", {
      className: "showInvolving",
      title: browser.i18n.getMessage("contact.recentConversationsTooltip"),
      onClick: this.showInvolving
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "history"
    })), this.props.contactId ? /*#__PURE__*/React.createElement("button", {
      className: "editContact",
      title: browser.i18n.getMessage("contact.editContactTooltip"),
      onClick: this.editContact
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "edit"
    })) : /*#__PURE__*/React.createElement("button", {
      className: "addContact",
      title: browser.i18n.getMessage("contact.addContactTooltip"),
      onClick: this.addContact
    }, /*#__PURE__*/React.createElement(SvgIcon, {
      hash: "add"
    })), /*#__PURE__*/React.createElement("button", {
      className: "createFilter",
      onClick: this.createFilter
    }, browser.i18n.getMessage("contact.createFilterTooltip")))); // In TB 68, when an element with `tabIndex` gets focused,
    // it gets set as the position parent. It shouldn't. To resolve
    // this issue, reparent the popup to <body> so its parent will never
    // change. See https://github.com/thunderbird-conversations/thunderbird-conversations/pull/1432

    return ReactDOM.createPortal(elm, document.querySelector("body"));
  }

}

_ContactDetail.propTypes = {
  dispatch: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  realEmail: PropTypes.string.isRequired,
  avatar: PropTypes.string.isRequired,
  contactId: PropTypes.string,
  parentSpan: PropTypes.object.isRequired
};
const ContactDetail = ReactRedux.connect()(_ContactDetail);