const form8 = window.document.getElementById('form8');
form8.addEventListener('click', notifyBackgroundPage8);

function handleResponse8(message) {console.log(`Message from background8: ${message.response8}`)};

function notifyBackgroundPage8(e) {var sending8 = browser.runtime.sendMessage({execute8: "Executing from form8"});
                                                 sending8.then(handleResponse8);}