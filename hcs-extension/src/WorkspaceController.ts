import * as vscode from 'vscode';
import { FsAdapter } from 'hcs-lib';
import { getHcsManager, runPipelineForAll } from './activation';
import { Log } from './logger';

const LOG_CLS_SHORT = 'csmc';

/**
 * ConfigSetManagerController combines the responsibilities of rebuilding and validating configuration sets.
 * It automatically watches for changes, validates, and builds the configuration sets, reporting errors in VS Code.
 */
export class WorkspaceController {
  private fs: FsAdapter;
  private ignoreNextChange = false;

  constructor(private context: vscode.ExtensionContext, fsAdapter: FsAdapter) {
    this.fs = fsAdapter;
    this.registerFileSystemWatcher();
    this.registerCommands();
    this.registerEventListeners();
  }

  /**
   * Registers file system watchers for changes in relevant directories.
   */
  private registerFileSystemWatcher() {
    const watcher = vscode.workspace.createFileSystemWatcher('**/{schemas,models,instances}/**/*.json');
    watcher.onDidChange((uri) => this.handleFileChange(uri));
    watcher.onDidCreate((uri) => this.handleFileChange(uri));
    watcher.onDidDelete((uri) => this.handleFileChange(uri));
    this.context.subscriptions.push(watcher);
  }

  /**
   * Registers commands for manual rebuilds and validations.
   */
  private registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand('hcsTools.rebuildAll', async () => {
        return runPipelineForAll();
      })
    );
  }

  /**
   * Registers workspace folder change listeners.
   */
  private registerEventListeners() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        return runPipelineForAll();
      })
    );
  }

  /**
   * Handles file changes, triggering rebuilds.
   */
  private async handleFileChange(uri: vscode.Uri) {
    Log.debug(LOG_CLS_SHORT, 'HFC', `🔄 File change detected: ${uri.fsPath}`);
    if (this.ignoreNextChange) {
      this.ignoreNextChange = false;
      return;
    }
    return runPipelineForAll();
  }

  /**
   * Triggers a programmatic rebuild without causing recursive change detection.
   */
  public triggerExtensionBuild() {
    this.ignoreNextChange = true;
    vscode.commands.executeCommand('hcsTools.rebuildAll');
  }
}