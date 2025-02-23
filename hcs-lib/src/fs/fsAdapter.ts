export interface FsAdapter {
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    fileExists(filePath: string): Promise<boolean>;
    readDirectory(dirPath: string): Promise<string[]>;
    createDirectory(dirPath: string): Promise<void>;
    buildFullPathFromRelativePath(configSetRootPath: string, relativePath: string): string;
    buildStripRelPathAndBuildFullPath(configSetRootPath: string, relativePath: string): string;
}
