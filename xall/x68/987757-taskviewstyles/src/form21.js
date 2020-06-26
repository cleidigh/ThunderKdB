const form21 = window.document.getElementById('form21');
form21.addEventListener('click', notifyBackgroundPage21);

function handleResponse21(message) {console.log(`Message from background21: ${message.response21}`)};

function notifyBackgroundPage21(e) {var sending21 = browser.runtime.sendMessage({execute21: "Executing from form21"});
                                                 sending21.then(handleResponse21);}