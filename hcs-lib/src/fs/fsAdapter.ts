export interface FsAdapter {
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    isExists(filePath: string): Promise<boolean>;
    isDirectory(filePath: string): Promise<boolean>;
    readDirectory(dirPath: string): Promise<string[]>;
    createDirectory(dirPath: string): Promise<void>;
    buildAbsPathForId(configSetRootPath: string, id: string): string;
}
