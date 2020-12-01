/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { React, ReactDOM } from "../content/es-modules/ui.js";
import { Main, actions, store } from "./compose.js"; // Render the options to the root of the page

ReactDOM.render(React.createElement(Main, null), document.querySelector("#root"));
let params = new URLSearchParams(document.location.search);
store.dispatch(actions.initCompose(params.get("accountId"), params.get("identityId")));