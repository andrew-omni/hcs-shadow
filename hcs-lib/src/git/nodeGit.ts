import { exec } from "child_process";
import { GitAdapter } from "./gitAdapter";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

import { Log } from "../logger";
const LOG_CLS_SHORT = "ngt";
export class NodeGit implements GitAdapter {
    /**
     * Discovers the root of the Git repository by traversing up the directory tree.
     */
    private async findGitRoot(startDir: string): Promise<string | null> {
        let currentDir = path.resolve(startDir);

        while (true) {
            const gitPath = path.join(currentDir, ".git");

            try {
                const stats = await fs.promises.stat(gitPath);
                if (stats.isDirectory()) {
                    return currentDir; // Found the .git directory
                }
            } catch {
                // .git directory not found in this directory
            }

            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                break; // Reached the root of the filesystem
            }
            currentDir = parentDir;
        }

        return null; // Git repository not found
    }

    /**
     * Checks if a file is tracked by Git.
     */
    async isFileTracked(filePath: string): Promise<boolean> {
        const repoPath = await this.findGitRoot(filePath);

        if (!repoPath) {
            console.warn(`⚠️ Not inside a Git repository: ${filePath}`);
            return false;
        }

        try {
            const relativePath = path.relative(repoPath, filePath);

            if (relativePath.startsWith("..")) {
                console.warn(`⚠️ File ${filePath} is outside the repository root.`);
                return false;
            }

            // Check if the file is tracked
            Log.verbose(LOG_CLS_SHORT, "GIT", `Checking if file is tracked in Git: ${filePath}`);
            await execAsync(`git ls-files --error-unmatch "${relativePath}"`, { cwd: repoPath });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Checks if a file has uncommitted changes in Git.
     */
    async isFileChangedFromGit(filePath: string): Promise<boolean> {
        const repoPath = await this.findGitRoot(filePath);

        if (!repoPath) {
            console.warn(`⚠️ Not inside a Git repository: ${filePath}`);
            return false;
        }
        Log.verbose(LOG_CLS_SHORT, "GIT", `Checking if file is changed in Git: ${filePath}`);

        try {
            if (!fs.existsSync(filePath)) {
                Log.warn(LOG_CLS_SHORT, "GIT", `⚠️ File does not exist: ${filePath}`);
                return false;
            }

            // Check for uncommitted changes using `git status`
            const { stdout } = await execAsync(`git status --porcelain "${filePath}"`, { cwd: repoPath });

            if (stdout.trim().length > 0) {
                Log.debug(LOG_CLS_SHORT, "GIT", `❌ File is modified or untracked: ${filePath}`);
                return true;
            }

            Log.verbose(LOG_CLS_SHORT, "GIT", `✅ File is unchanged from Git: ${filePath}`);
            return false;
        } catch (error) {
            Log.error(LOG_CLS_SHORT, "GIT", `❌ Error checking Git changes for: ${filePath}: ${error}`);
            return true; // Fail-safe: Assume file is changed
        }
    }

    /**
     * Retrieves the Git root for a given file.
     */
    async getGitRoot(filePath: string): Promise<string | null> {
        return await this.findGitRoot(filePath);
    }
}
