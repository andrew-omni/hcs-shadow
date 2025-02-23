import * as vscode from "vscode";
import { GitAdapter } from "hcs-lib";

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
            console.error("❌ Failed to activate Git API.");
        } else {
            console.log("✅ Git API activated.");
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
            console.log(`✅ Found repository: ${repo.rootUri.fsPath}`);
        } else {
            console.warn(`⚠️ No repository found for: ${filePath}`);
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

        console.log(`🔍 File ${filePath} is ${tracked ? "tracked" : "untracked"}`);
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

        console.log(`🔍 Git change status for ${filePath}: ${hasChanges ? "CHANGED" : "UNCHANGED"}`);
        return hasChanges;
    }

    async getGitRoot(filePath: string): Promise<string | null> {
        console.error("vscodeGit.getGitRoot called but method not implemented.");
        return null;
    }
}
