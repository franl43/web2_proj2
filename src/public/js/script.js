const sqliEnabled = document.getElementById('sqli-enable');
sqliEnabled?.addEventListener('change', handleChange);

const brokenAuthEnabled = document.getElementById('broken-auth-enable');
brokenAuthEnabled?.addEventListener('change', handleChange);

function handleChange(event) {
    let cb = event.currentTarget
    let lable = cb.nextSibling
    setLableText(lable, cb.checked)
}

// checkbox cheked doesn't refresh on page reload, manual lable text set
function initialLableValue() {
    let lable = sqliEnabled ? sqliEnabled?.nextSibling : brokenAuthEnabled?.nextSibling;
    if(lable)
        setLableText(lable, sqliEnabled?.checked || brokenAuthEnabled?.checked)
}

function setLableText(lable, enabled) {
    if(enabled) {
        lable.textContent = "Ranjivost uključena"
    } else {
        lable.textContent = "Ranjivost isključena"
    }
}

const copyButtons = document.getElementsByClassName('copy')

for(let button of copyButtons) {
    button.addEventListener('click', copyToClipboard)
}

function copyToClipboard(event) {
    let button = event.currentTarget
    let text = button.previousSibling.textContent
    navigator.clipboard.writeText(text)
}

const showCookiesButton = document.getElementById('show-cookies')
showCookiesButton?.addEventListener('click', () => {alert(document.cookie)})

initialLableValue();