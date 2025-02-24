import * as vscode from "vscode";
import { GitAdapter } from "hcs-lib";

import { Log } from "../logger";
const LOG_CLS_SHORT = "vgt";

export class VsCodeGit implements GitAdapter {
    private gitApi: any | null = null;

    constructor() {
        this.initializeGitApi();
    }

    /**
     * Initializes the Git API from the VS Code Git extension.
     */
    private async initializeGitApi() {
        const gitExtension = vscode.extensions.getExtension("vscode.git");

        if (!gitExtension) {
            console.warn("⚠️ Git extension not found.");
            return;
        }

        this.gitApi = await gitExtension.activate();

        if (!this.gitApi) {
            Log.error(LOG_CLS_SHORT, "VGT", "Failed to activate Git API.");
        } else {
            Log.verbose(LOG_CLS_SHORT, "VGT", "Git API activated.");
        }
    }

    /**
     * Finds the Git repository containing the specified file.
     * @param filePath Path of the file to search for.
     */
    private findRepository(filePath: string): any | null {
        if (!this.gitApi) {
            console.warn("⚠️ Git API not initialized.");
            return null;
        }

        const repositories = this.gitApi.getAPI(1).repositories;

        const repo = repositories.find((repo: { rootUri: vscode.Uri }) =>
            filePath.startsWith(repo.rootUri.fsPath)
        );

        if (repo) {
            Log.verbose(LOG_CLS_SHORT, "VGT", `Found repository: ${repo.rootUri.fsPath}`);
        } else {
            Log.warn(LOG_CLS_SHORT, "VGT", `No repository found for: ${filePath}`);
        }

        return repo || null;
    }

    /**
     * Helper to check if a file exists in specific changes (staged, unstaged, etc.).
     * @param filePath Path of the file to check.
     * @param changes Array of changes from Git.
     */
    private isFileInChanges(filePath: string, changes: Array<{ uri: vscode.Uri }>): boolean {
        const fileUri = vscode.Uri.file(filePath);
        return changes.some(change => change.uri.fsPath === fileUri.fsPath);
    }

    /**
     * Checks if a file is tracked by Git (exists in index or working tree).
     * @param filePath Path of the file to check.
     */
    async isFileTracked(filePath: string): Promise<boolean> {
        if (!this.gitApi) return false;

        const repo = this.findRepository(filePath);
        if (!repo) return false;

        const tracked = this.isFileInChanges(filePath, repo.state.indexChanges) ||
                        this.isFileInChanges(filePath, repo.state.workingTreeChanges);

        Log.debug(LOG_CLS_SHORT, "VGT", `File ${filePath} is ${tracked ? "tracked" : "untracked"}`);
        return tracked;
    }

    /**
     * Checks if a file has uncommitted changes (modified, staged, or untracked).
     * @param filePath Path of the file to check.
     */
    async isFileChangedFromGit(filePath: string): Promise<boolean> {
        if (!this.gitApi) return false;

        const repo = this.findRepository(filePath);
        if (!repo) return false;

        const hasChanges = this.isFileInChanges(filePath, repo.state.workingTreeChanges) ||
                           this.isFileInChanges(filePath, repo.state.indexChanges) ||
                           this.isFileInChanges(filePath, repo.state.mergeChanges);
        Log.debug(LOG_CLS_SHORT, "VGT", `File ${filePath} has ${hasChanges ? "changes" : "no changes"}`);
        return hasChanges;
    }

    async getGitRoot(filePath: string): Promise<string | null> {
        console.error("vscodeGit.getGitRoot called but method not implemented.");
        return null;
    }
}
