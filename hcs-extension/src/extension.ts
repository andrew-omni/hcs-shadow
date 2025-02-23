import * as vscode from 'vscode';
import { activate as activateExtension, deactivate as deactivateExtension } from './activation';

export function activate(context: vscode.ExtensionContext) {
    activateExtension(context);

    // We are active, now do a full scan
    console.log("🚀 Extension activated: omni-hcscs-extension");
}

export function deactivate() {
    deactivateExtension();
    console.log("❌ Extension deactivated: omni-hcscs-extension");
}
