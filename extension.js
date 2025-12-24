const translate = require('./src/index.js');
/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    translate.init(context)
}
exports.activate = activate;

function deactivate() {
}

module.exports = {
    activate,
    deactivate
}
