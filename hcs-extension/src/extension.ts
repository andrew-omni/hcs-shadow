import * as vscode from 'vscode';
import { activate as activateExtension, deactivate as deactivateExtension } from './activation';

import { Log } from "./logger";
const LOG_CLS_SHORT = "ext";

export async function activate(context: vscode.ExtensionContext) {
    Log.setLevel("verbose");
    await activateExtension(context);
    Log.info(LOG_CLS_SHORT, "act", "🚀 Extension activated: omni-hcscs-extension");
}

export function deactivate() {
    deactivateExtension();
    Log.info(LOG_CLS_SHORT, "dct", "❌ Extension deactivated: omni-hcscs-extension");
}
