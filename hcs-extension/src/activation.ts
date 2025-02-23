import * as vscode from 'vscode';
import { VsCodeFs } from "./fs/vscodeFs";
import { ConfigSet, ConfigSetManager, createConfigSet, getConfigSets } from "hcs-lib";

export function activate(context: vscode.ExtensionContext) {
    // Reprocessing validates all schema mappings, refreshes instances, etc.
    registerCommands(context);
    registerAutoValidation(context);
    console.log("🚀 Extension activated: hcstools");
}

export function deactivate() { }

/**
 * Registers VS Code commands for HCSTools.
 */
export function registerCommands(context: vscode.ExtensionContext) {
    const fs = new VsCodeFs();

    // 🆕 Create Config Set Command
    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.createConfigSet", async () => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

            if (!workspaceFolder) {
                vscode.window.showErrorMessage("❌ No workspace folder is open.");
                return;
            }

            const userInput = await vscode.window.showInputBox({
                prompt: "Enter the name for the new Config Set",
                placeHolder: "my-config-set"
            });

            if (userInput) {
                // Resolve the full path relative to the workspace root
                const configSetPath = vscode.Uri.joinPath(workspaceFolder.uri, userInput).fsPath;

                try {
                    await createConfigSet(configSetPath, fs);
                    vscode.window.showInformationMessage(`✅ Config Set created at ${configSetPath}`);
                } catch (error) {
                    vscode.window.showErrorMessage(`❌ Failed to create Config Set: ${error}`);
                }
            }
        })
    );

    // 📄 Create Schema Command
    // 📄 Create Schema Command
    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.createSchema", async () => {
            const fs = new VsCodeFs();
            const workspaceFolders = vscode.workspace.workspaceFolders;

            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage("❌ No workspace folder found.");
                return;
            }

            // Step 1: Use hcs-lib's getConfigSets to find available config sets
            const basePaths = workspaceFolders.map((folder) => folder.uri.fsPath);
            const configSets = await getConfigSets(basePaths, fs);

            if (configSets.length === 0) {
                vscode.window.showErrorMessage("❌ No valid config sets found in the workspace.");
                return;
            }

            // Step 2: If multiple config sets, prompt the user to select one
            let selectedConfigSet: any;
            if (configSets.length === 1) {
                selectedConfigSet = configSets[0];
            } else {
                const quickPickItems = configSets.map((configSet) => ({
                    label: configSet.getName(),
                    description: configSet.getPath(),
                    configSet,
                }));

                const pickedItem = await vscode.window.showQuickPick(quickPickItems, {
                    placeHolder: "Select the config set to create the schema in",
                });

                if (!pickedItem) {
                    vscode.window.showWarningMessage("⚠️ Schema creation cancelled.");
                    return;
                }

                selectedConfigSet = pickedItem.configSet;
            }

            // Step 3: Prompt user for the schema name
            const schemaName = await vscode.window.showInputBox({
                prompt: "Enter the name of the new schema",
                placeHolder: "newSchema",
            });

            if (!schemaName) {
                vscode.window.showWarningMessage("⚠️ Schema creation cancelled.");
                return;
            }

            // Step 4: Use schemaManager to create the schema
            const configSetManager = new ConfigSetManager(selectedConfigSet, fs);
            await configSetManager.reloadResources();
            const schemaManager = configSetManager.getSchemaManager();
            const schemaPath = `${selectedConfigSet.getPath()}/schemas/${schemaName}.json`;
            
            try {
                await schemaManager.create(schemaName);
                vscode.window.showInformationMessage(`✅ Schema '${schemaName}' created in '${selectedConfigSet.getName()}'.`);

                // Step 5: Open the newly created schema file in the editor
                const doc = await vscode.workspace.openTextDocument(schemaPath);
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Failed to create schema: ${error}`);
            }
        })
    );


// 🏗️ Create Model Command
context.subscriptions.push(
    vscode.commands.registerCommand("hcstools.createModel", async () => {
        const fs = new VsCodeFs();
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("❌ No workspace folder found.");
            return;
        }

        // Step 1: Use hcs-lib's getConfigSets to find available config sets
        const basePaths = workspaceFolders.map((folder) => folder.uri.fsPath);
        const configSets = await getConfigSets(basePaths, fs);

        if (configSets.length === 0) {
            vscode.window.showErrorMessage("❌ No valid config sets found in the workspace.");
            return;
        }

        // Step 2: If multiple config sets, prompt the user to select one
        let selectedConfigSet: any;
        if (configSets.length === 1) {
            selectedConfigSet = configSets[0];
        } else {
            const quickPickItems = configSets.map((configSet) => ({
                label: configSet.getName(),
                description: configSet.getPath(),
                configSet,
            }));

            const pickedItem = await vscode.window.showQuickPick(quickPickItems, {
                placeHolder: "Select the config set to create the model in",
            });

            if (!pickedItem) {
                vscode.window.showWarningMessage("⚠️ Model creation cancelled.");
                return;
            }

            selectedConfigSet = pickedItem.configSet;
        }

        // Step 3: Prompt user for the model name
        const modelName = await vscode.window.showInputBox({
            prompt: "Enter the name of the new model",
            placeHolder: "newModel",
        });

        if (!modelName) {
            vscode.window.showWarningMessage("⚠️ Model creation cancelled.");
            return;
        }

        // Step 4: Use modelManager to create the model
        const configSetManager = new ConfigSetManager(selectedConfigSet, fs);
        await configSetManager.reloadResources();
        const modelManager = configSetManager.getModelManager();
        const modelPath = `${selectedConfigSet.getPath()}/models/${modelName}.json`;

        try {
            await modelManager.create(modelName);
            vscode.window.showInformationMessage(`✅ Model '${modelName}' created in '${selectedConfigSet.getName()}'.`);

            // Step 5: Open the newly created model file in the editor
            const doc = await vscode.workspace.openTextDocument(modelPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Failed to create model: ${error}`);
        }
    })
);


    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.verifyAll", async () => {
            const fs = new VsCodeFs();
            const diagnosticCollection = vscode.languages.createDiagnosticCollection("hcstools");

            // Clear existing diagnostics
            diagnosticCollection.clear();

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage("❌ No workspace folder found.");
                return;
            }

            // Step 1: Load all config sets using hcs-lib's getConfigSets
            const basePaths = workspaceFolders.map((folder) => folder.uri.fsPath);
            const configSets = await getConfigSets(basePaths, fs);

            if (configSets.length === 0) {
                vscode.window.showErrorMessage("❌ No valid config sets found in the workspace.");
                return;
            }

            // Step 2: Validate each config set
            let allValid = true;
            for (const configSet of configSets) {
                try {
                    const configSetManager = new ConfigSetManager(configSet, fs);
                    await configSetManager.reloadResources();
                    const responses = await configSetManager.validateAll();

                    // Handle errors
                    if (!responses.success) {
                        allValid = false;

                        for (const [filePath, errors] of Object.entries(responses.errors)) {
                            const diagnostics: vscode.Diagnostic[] = errors.map((error) => {
                                const range = new vscode.Range(
                                    error.line ?? 0, // Default to line 0 if not provided
                                    error.column ?? 0, // Default to column 0 if not provided
                                    error.line ?? 0,
                                    error.column ?? 1
                                );

                                return new vscode.Diagnostic(
                                    range,
                                    error.message,
                                    vscode.DiagnosticSeverity.Error
                                );
                            });

                            const fileUri = vscode.Uri.file(filePath);
                            diagnosticCollection.set(fileUri, diagnostics);
                        }

                        vscode.window.showErrorMessage(
                            `❌ Validation failed for '${configSet.getName()}'. Check the Problems pane for details.`
                        );
                    } else {
                        vscode.window.showInformationMessage(
                            `✅ Config set '${configSet.getName()}' is valid.`
                        );
                    }
                } catch (error) {
                    allValid = false;
                    vscode.window.showErrorMessage(
                        `❌ Verification failed for '${configSet.getName()}': ${error}`
                    );
                }
            }

            // Step 3: Display final result
            if (allValid) {
                vscode.window.showInformationMessage("✅ All configurations across config sets are valid.");
            } else {
                vscode.window.showErrorMessage("❌ One or more config sets failed validation. Check the Problems pane for details.");
            }
        })
    );



    // 🛠️ Build All Command
    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.buildAll", async () => {
            const fs = new VsCodeFs();
            const diagnosticCollection = vscode.languages.createDiagnosticCollection("hcstools");

            // Clear existing diagnostics
            diagnosticCollection.clear();

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage("❌ No workspace folder found.");
                return;
            }

            // Step 1: Load all config sets using hcs-lib's getConfigSets
            const basePaths = workspaceFolders.map((folder) => folder.uri.fsPath);
            const configSets = await getConfigSets(basePaths, fs);

            if (configSets.length === 0) {
                vscode.window.showErrorMessage("❌ No valid config sets found in the workspace.");
                return;
            }

            // Step 2: Build each config set
            let allSuccessful = true;
            for (const configSet of configSets) {
                try {
                    const configSetManager = new ConfigSetManager(configSet, fs);
                    await configSetManager.reloadResources();
                    await configSetManager.buildAll(false); // Perform the build

                    vscode.window.showInformationMessage(
                        `✅ Build completed successfully for '${configSet.getName()}'.`
                    );
                } catch (error: any) {
                    allSuccessful = false;

                    if (error.errors) {
                        for (const [filePath, errors] of Object.entries(error.errors)) {
                            const diagnostics: vscode.Diagnostic[] = (errors as any[]).map((err: any) => {
                                const range = new vscode.Range(
                                    err.line ?? 0,
                                    err.column ?? 0,
                                    err.line ?? 0,
                                    err.column ?? 1
                                );

                                return new vscode.Diagnostic(
                                    range,
                                    err.message,
                                    vscode.DiagnosticSeverity.Error
                                );
                            });

                            const fileUri = vscode.Uri.file(filePath);
                            diagnosticCollection.set(fileUri, diagnostics);
                        }
                    }

                    vscode.window.showErrorMessage(
                        `❌ Build failed for '${configSet.getName()}'. Check the Problems pane for details.`
                    );
                }
            }

            // Step 3: Final build status
            if (allSuccessful) {
                vscode.window.showInformationMessage("✅ All config sets built successfully.");
            } else {
                vscode.window.showErrorMessage("❌ One or more config sets failed to build. Check the Problems pane for details.");
            }
        })
    );

}
function registerAutoValidation(context: vscode.ExtensionContext) {
    const fs = new VsCodeFs();
    const diagnosticCollection = vscode.languages.createDiagnosticCollection("hcstools");

    /**
     * Validates all config sets and returns whether validation was successful.
     */
    async function runValidation(): Promise<boolean> {
        diagnosticCollection.clear();
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false; // No workspace found
        }

        const basePaths = workspaceFolders.map((folder) => folder.uri.fsPath);
        const configSets = await getConfigSets(basePaths, fs);

        if (configSets.length === 0) {
            vscode.window.showErrorMessage("❌ No valid config sets found for validation.");
            return false;
        }

        let allValid = true;

        for (const configSet of configSets) {
            try {
                const configSetManager = new ConfigSetManager(configSet, fs);
                await configSetManager.reloadResources();
                const result = await configSetManager.validateAll();

                if (!result.success) {
                    for (const [filePath, errors] of Object.entries(result.errors)) {
                        const diagnostics: vscode.Diagnostic[] = errors.map((err: any) => {
                            const range = new vscode.Range(
                                err.line ?? 0,
                                err.column ?? 0,
                                err.line ?? 0,
                                err.column ?? 1
                            );

                            return new vscode.Diagnostic(
                                range,
                                err.message,
                                vscode.DiagnosticSeverity.Error
                            );
                        });

                        const fileUri = vscode.Uri.file(filePath);
                        diagnosticCollection.set(fileUri, diagnostics);
                    }

                    allValid = false;
                }
            } catch (error) {
                console.error(`❌ Validation error for '${configSet.getName()}':`, error);
                allValid = false;
            }
        }

        return allValid;
    }

    /**
     * Runs validation and builds config sets if validation succeeds.
     */
    async function runValidationAndBuild(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage("❌ No workspace folder found.");
            return;
        }

        const basePaths = workspaceFolders.map((folder) => folder.uri.fsPath);
        const configSets = await getConfigSets(basePaths, fs);

        if (configSets.length === 0) {
            vscode.window.showErrorMessage("❌ No valid config sets found for validation and build.");
            return;
        }

        for (const configSet of configSets) {
            try {
                const configSetManager = new ConfigSetManager(configSet, fs);
                await configSetManager.reloadResources();

                const isValid = await runValidation();

                if (isValid) {
                    await configSetManager.buildAll(false);
                    vscode.window.showInformationMessage(`✅ '${configSet.getName()}' validated and built successfully.`);
                } else {
                    vscode.window.showErrorMessage(`❌ Validation failed for '${configSet.getName()}'. Build skipped.`);
                }
            } catch (error) {
                console.error(`❌ Error in validation/build for '${configSet.getName()}':`, error);
                vscode.window.showErrorMessage(`❌ Error during validation/build: ${error}`);
            }
        }
    }

    // Register events that trigger validation and build
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (isConfigFile(document.uri.fsPath)) {
                await runValidationAndBuild();
            }
        }),

        vscode.workspace.onDidCreateFiles(async (event) => {
            if (event.files.some((file) => isConfigFile(file.fsPath))) {
                await runValidationAndBuild();
            }
        }),

        vscode.workspace.onDidDeleteFiles(async (event) => {
            if (event.files.some((file) => isConfigFile(file.fsPath))) {
                await runValidationAndBuild();
            }
        }),

        vscode.window.onDidChangeActiveTextEditor(async () => {
            await runValidationAndBuild(); // Run validation and build on editor changes
        }),

        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            await runValidationAndBuild(); // Run validation and build on workspace changes
        })
    );

    // Initial validation and build when the extension activates
    runValidationAndBuild();
}


/**
 * Checks if a file path belongs to a config set (schema, model, or instance).
 */
function isConfigFile(filePath: string): boolean {
    return (
        filePath.includes("/schemas/") ||
        filePath.includes("/models/") ||
        filePath.includes("/instances/")
    );
}
