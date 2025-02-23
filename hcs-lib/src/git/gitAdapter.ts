export interface GitAdapter {
    
    getGitRoot(filePath: string): Promise<string | null>;

    /**
     * Checks if a file is tracked in Git.
     * @param filePath The absolute path to the file.
     * @returns A promise resolving to `true` if the file is tracked, otherwise `false`.
     */
    isFileTracked(filePath: string): Promise<boolean>;

    /**
     * Checks if a file has been modified or is untracked since the last commit.
     * @param filePath The absolute path to the file.
     * @returns A promise resolving to `true` if the file is modified or untracked, otherwise `false`.
     */
    isFileChangedFromGit(filePath: string): Promise<boolean>;
}
