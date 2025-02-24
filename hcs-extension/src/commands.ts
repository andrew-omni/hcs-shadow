
import * as vscode from 'vscode';
import { VsCodeFs } from "./fs/vscodeFs";

import { getHcsManager, promptUserToSelectConfigSet, runPipelineForAll } from './activation';
const fs = new VsCodeFs();

/**
 * Command: Create a new Config Set.
 */
export async function createConfigSetCommand() {
    const fs = new VsCodeFs();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
        vscode.window.showErrorMessage("❌ No workspace folder is open.");
        return;
    }

    const configSetName = await vscode.window.showInputBox({
        prompt: "Enter the name for the new Config Set",
        placeHolder: "my-config-set",
    });

    if (configSetName) {
        const hcsManager = getHcsManager();
        let configSet = hcsManager.getConfigSetByName(configSetName);

        if (configSet) {
            vscode.window.showWarningMessage(`⚠️ Config Set already exists: ${configSetName}`);
            return;
        }

        try {
            // This will also add the configset to the list of loaded configsets
            configSet = await hcsManager.createConfigSet(configSetName);
            vscode.window.showInformationMessage(`✅ Config Set created at ${configSet.absolutePath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Failed to create Config Set: ${error}`);
        }
    }
}

/**
 * Command: Create a new Schema within a Config Set.
 */
export async function createSchemaCommand() {
    const fs = new VsCodeFs();
    const selectedConfigSet = await promptUserToSelectConfigSet(fs);

    if (!selectedConfigSet) return;

    const schemaName = await vscode.window.showInputBox({
        prompt: "Enter the name of the new schema",
        placeHolder: "newSchema",
    });

    if (!schemaName) {
        vscode.window.showWarningMessage("⚠️ Schema creation cancelled.");
        return;
    }

    const configSetName = selectedConfigSet.name;
    const hcsManager = getHcsManager();
    const configSet = hcsManager.getConfigSetByName(configSetName);

    if (!configSet) {
        vscode.window.showErrorMessage(`❌ Could not find config set: ${configSetName}`);
        return;
    }

    try {
        const id = await configSet.createSchema(schemaName);

        if (!id) {
            vscode.window.showErrorMessage(`❌ Failed to create schema; call successful but no ID returned: ${schemaName}`);
            return;
        }
        const absPath = configSet.schemaIdsToAbsPathMap.get(id);

        if (!absPath) {
            vscode.window.showErrorMessage(`❌ Failed to fetch schema after create: ${schemaName}, ID: ${id}`);
            return;
        }

        vscode.window.showInformationMessage(`✅ Schema '${schemaName}' created.`);

        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absPath));
        await vscode.window.showTextDocument(doc);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to create schema: ${error}`);
    }
}

/**
 * Command: Create a new Model within a Config Set.
 */
export async function createModelCommand() {
    const fs = new VsCodeFs();
    const selectedConfigSet = await promptUserToSelectConfigSet(fs);

    if (!selectedConfigSet) return;

    const modelName = await vscode.window.showInputBox({
        prompt: "Enter the name of the new model",
        placeHolder: "newModel",
    });

    if (!modelName) {
        vscode.window.showWarningMessage("⚠️ Model creation cancelled.");
        return;
    }

    const configSetName = selectedConfigSet.name;
    const hcsManager = getHcsManager();
    const configSet = hcsManager.getConfigSetByName(configSetName);

    if (!configSet) {
        vscode.window.showErrorMessage(`❌ Could not find config set: ${configSetName}`);
        return;
    }

    try {
        const id = await configSet.createModel(modelName);

        if (!id) {
            vscode.window.showErrorMessage(`❌ Failed to create model; call successful but no ID returned: ${modelName}`);
            return;
        }
        const absPath = configSet.modelIdsToAbsPathMap.get(id);

        if (!absPath) {
            vscode.window.showErrorMessage(`❌ Failed to fetch model after create: ${modelName}, ID: ${id}`);
            return;
        }

        vscode.window.showInformationMessage(`✅ Model '${modelName}' created.`);

        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absPath));
        await vscode.window.showTextDocument(doc);
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to create model: ${error}`);
    }
}

/**
 * Command: Build all config sets.
 */
export async function buildAllCommand() {
    // Handles diagnostics and display messages for us
    return await runPipelineForAll();
}