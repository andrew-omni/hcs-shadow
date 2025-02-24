import * as vscode from 'vscode';
import { VsCodeFs } from "./fs/vscodeFs";
import { VsCodeGit } from './git/vscodeGit';
import { HcsManager, FsAdapter, GitAdapter, PipelineResult, PipelineResults } from "hcs-lib";
import { registerLinkBehaviorCommands } from './linkBehavior';
import { WorkspaceController } from './WorkspaceController';
import { createConfigSetCommand, createModelCommand, createSchemaCommand, buildAllCommand } from './commands';
import { Log } from "./logger";
const LOG_CLS_SHORT = "act";

let hcsManager: HcsManager;
let workspaceController: WorkspaceController;
let fs: FsAdapter;
let git: GitAdapter;

export const diagnostics = vscode.languages.createDiagnosticCollection('hcs-tools');

export async function activate(context: vscode.ExtensionContext) {

    /*
    Monitors workspace changes and triggers validation and building of config sets
    on changes. It reports any issues validation issues using VS Code's diagnostic collection, these appear in the
    Problems pane.  All validation issues in the panel should come from this class.
    */
    workspaceController = new WorkspaceController(context, fs);

    /*
        Initializes the library and ConfigSetManagers for the workspace.
        This is done by finding all available config sets in the workspace and creating a ConfigSetManager for each.
        We do this first as others may require the ConfigSetManagers to be available.
    */
    await initializeHcsLib();

    /*
         Registers all VS Code commands for HCSTools that appear in the Command Palette
         (Ctrl+Shift+P or Cmd+Shift+P).
     */
    await registerCommands(context);

    /*
        Registers the Link Behavior commands which control highlighting and navigation (on click) of links in schemas.
        This sets red error squiggles on invalid reference IDs in editor windows, allows CMD+Click behavior and
        registers QuickFixes for invalid references.
    */
    await registerLinkBehaviorCommands(context, fs);

}

export function deactivate() { }

export function getHcsManager() {
    return hcsManager;
}

export async function initializeHcsLib() {
    fs = new VsCodeFs();
    git = new VsCodeGit();

    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage("❌ No workspace folder found.");
        return;
    }

    // Step 1: Use hcs-lib's getConfigSets to find available config sets
    const basePaths = workspaceFolders.map((folder) => folder.uri.fsPath);
    hcsManager = new HcsManager(basePaths, fs, git);
    await hcsManager.initialize();

    await runPipelineForAll();
}

/**
 * Registers all VS Code commands for HCSTools.
 */
export async function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.createConfigSet", createConfigSetCommand)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.createSchema", createSchemaCommand)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.createModel", createModelCommand)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.buildAll", buildAllCommand)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("hcstools.createDemoFiles", createDemoFiles)
    );
}

/**
 * Helper: Prompt user to select a Config Set.
 */
export async function promptUserToSelectConfigSet(fs: VsCodeFs) {
    const configSets = await hcsManager.listConfigSets();

    if (!configSets) return null;

    if (configSets.length === 1) {
        return configSets[0];
    }

    const quickPickItems = configSets.map((configSet) => ({
        label: configSet.name,
        description: configSet.absolutePath,
        configSet,
    }));

    const pickedItem = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: "Select the config set",
    });

    return pickedItem?.configSet ?? null;
}

export function pushPipelineResultToDiagnostics(
    pipelineResult: PipelineResult
) {
    if (!pipelineResult.errors || pipelineResult.errors.length === 0) {
        return; // No errors to report
    }

    for (const error of pipelineResult.errors) {
        const fileUri = vscode.Uri.file(error.filePath);

        const range = new vscode.Range(
            error.line ?? 0,
            error.column ?? 0,
            error.line ?? 0,
            error.endColumn ?? (error.column ?? 1)
        );

        const severity = error.severity === "error"
            ? vscode.DiagnosticSeverity.Error
            : vscode.DiagnosticSeverity.Warning;

        const newDiagnostic = new vscode.Diagnostic(range, error.message, severity);

        // Get existing diagnostics for this file
        const existingDiagnostics = diagnostics.get(fileUri) || [];

        // Check if this diagnostic message is already present
        const isDuplicate = existingDiagnostics.some(
            (existingDiagnostic) =>
                existingDiagnostic.message === newDiagnostic.message &&
                existingDiagnostic.range.isEqual(newDiagnostic.range) &&
                existingDiagnostic.severity === newDiagnostic.severity
        );

        if (!isDuplicate) {
            diagnostics.set(fileUri, [...existingDiagnostics, newDiagnostic]);
        }
    }
}


let isRunning = false;
let lastRunTime = 0;
const DEBOUNCE_TIME_MS = 3000; // 3 seconds

/**
 * Runs the pipeline for all config sets in the workspace and sets diagnostics.
 */
export async function runPipelineForAll() {
    const now = Date.now();

    if (isRunning) {
        Log.silly(LOG_CLS_SHORT, "rpf", "⚠️ Suppressed pipeline run: A pipeline execution is already in progress.");
        return;
    }

    if (now - lastRunTime < DEBOUNCE_TIME_MS) {
        Log.silly(LOG_CLS_SHORT, "rpf", `⚠️ Suppressed pipeline run: Last execution was within ${DEBOUNCE_TIME_MS / 1000}s.`);
        return;
    }

    isRunning = true;
    diagnostics.clear();
    const startTime = process.hrtime(); // High-resolution timer
    
    try {
        Log.info(LOG_CLS_SHORT, "rpf", "🚀 Running pipeline for all config sets...");
        const pipelineResults: PipelineResults = await hcsManager.runPipelineForAll();
        
        const elapsedSeconds = getElapsedTimeInSeconds(startTime);

        if (pipelineResults.hasErrors) {
            vscode.window.showErrorMessage(`❌ Build failed due to validation or processing errors. (${elapsedSeconds}s)`);
            Log.info(LOG_CLS_SHORT, "rpf", `❌ Build pipeline completed w/ errors in ${elapsedSeconds}s.`);

            for (const pipelineResult of pipelineResults.results) {
                pushPipelineResultToDiagnostics(pipelineResult);
            }
        } else {
            vscode.window.showInformationMessage(`✅ All config sets built successfully. (${elapsedSeconds}s)`);
            Log.info(LOG_CLS_SHORT, "rpf", `✅ Pipeline completed in ${elapsedSeconds}s.`);
        }
        return pipelineResults;
    } catch (error) {
        const elapsedSeconds = getElapsedTimeInSeconds(startTime);
        Log.error(LOG_CLS_SHORT, "rpf", `❌ Unhandled exception while running pipeline: ${error} (${elapsedSeconds}s)`);
        vscode.window.showErrorMessage(`❌ Failed to run pipeline for all config sets: ${error} (${elapsedSeconds}s)`);
    } finally {
        isRunning = false;
        lastRunTime = Date.now();
        Log.info(LOG_CLS_SHORT, "rpf", `⏳ Next execution allowed after ${DEBOUNCE_TIME_MS / 1000}s.`);
    }
}

/**
 * Returns the elapsed time in seconds with 1 decimal precision.
 */
function getElapsedTimeInSeconds(startTime: [number, number]): string {
    const elapsed = process.hrtime(startTime);
    return (elapsed[0] + elapsed[1] / 1e9).toFixed(1); // Converts to seconds with 1 decimal
}

function createDemoFiles() {
    vscode.window.showInformationMessage("Creating demo files...");
    hcsManager.createDemoFiles();
}