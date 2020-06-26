const form20 = window.document.getElementById('form20');
form20.addEventListener('click', notifyBackgroundPage20);

function handleResponse20(message) {console.log(`Message from background20: ${message.response20}`)};

function notifyBackgroundPage20(e) {var sending20 = browser.runtime.sendMessage({execute20: "Executing from form20"});
                                                 sending20.then(handleResponse20);}