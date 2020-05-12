/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* globals PropTypes, React, ReactDOM, ReactRedux, StringBundle */

/* exported ContactDetail */
class _ContactDetail extends React.PureComponent {
  constructor(props) {
    super(props);
    this.strings = new StringBundle("chrome://conversations/locale/template.properties");
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
    this.props.dispatch({
      type: "SEND_EMAIL",
      name: this.props.name,
      email: this.props.realEmail
    });
  }

  showInvolving(event) {
    event.stopPropagation();
    event.preventDefault();
    this.props.dispatch({
      type: "SHOW_MESSAGES_INVOLVING",
      name: this.props.name,
      email: this.props.realEmail
    });
  }

  render() {
    const name = this.props.name;
    const pos = this.props.parentSpan && this.props.parentSpan.getBoundingClientRect() || {
      left: 0,
      top: 0,
      bottom: 0
    };
    const elm = React.createElement("div", {
      className: "tooltip",
      style: {
        left: pos.left,
        top: pos.top + window.scrollY + (pos.bottom - pos.top) * 2
      },
      onClick: this.onGeneralClick
    }, React.createElement("div", {
      className: "arrow"
    }), React.createElement("div", {
      className: "arrow inside"
    }), React.createElement("div", {
      className: "authorInfoContainer"
    }, React.createElement("div", {
      className: "authorInfo"
    }, React.createElement("span", {
      className: "name",
      title: name
    }, name), React.createElement("span", {
      className: "authorEmail"
    }, React.createElement("span", {
      className: "authorEmailAddress",
      title: this.props.realEmail
    }, this.props.realEmail), React.createElement("button", {
      className: "copyEmail",
      title: this.strings.get("copyEmail"),
      onClick: this.copyEmail
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#content_copy"
    }))))), React.createElement("div", {
      className: "authorPicture"
    }, React.createElement("img", {
      src: this.props.avatar
    }))), React.createElement("div", {
      className: "tipFooter"
    }, React.createElement("button", {
      className: "sendEmail",
      title: this.strings.get("sendEmail"),
      onClick: this.sendEmail
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#mail"
    }))), React.createElement("button", {
      className: "showInvolving",
      title: this.strings.get("recentConversations"),
      onClick: this.showInvolving
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#history"
    }))), this.props.hasCard ? React.createElement("button", {
      className: "editContact",
      title: this.strings.get("editCardAb"),
      onClick: this.editContact
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#edit"
    }))) : React.createElement("button", {
      className: "addContact",
      title: this.strings.get("addToAb"),
      onClick: this.addContact
    }, React.createElement("svg", {
      className: "icon",
      viewBox: "0 0 24 24",
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink"
    }, React.createElement("use", {
      xlinkHref: "chrome://conversations/skin/material-icons.svg#add"
    }))), React.createElement("button", {
      className: "createFilter",
      onClick: this.createFilter
    }, this.strings.get("createFilter")))); // In TB 68, when an element with `tabIndex` gets focused,
    // it gets set as the position parent. It shouldn't. To resolve
    // this issue, reparent the popup to <body> so its parent will never
    // change. See https://github.com/protz/thunderbird-conversations/pull/1432

    return ReactDOM.createPortal(elm, document.querySelector("body"));
  }

}

_ContactDetail.propTypes = {
  dispatch: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  realEmail: PropTypes.string.isRequired,
  avatar: PropTypes.string.isRequired,
  hasCard: PropTypes.bool.isRequired,
  parentSpan: PropTypes.object.isRequired
};
const ContactDetail = ReactRedux.connect()(_ContactDetail);