import { promises as fs } from "fs";
import { FsAdapter } from "./fsAdapter";
import * as path from "path";

export class NodeFs implements FsAdapter {
    buildFullPathFromRelativePath(configSetRootPath: string, relativePath: string): string {
        const fullPath = path.resolve(configSetRootPath, relativePath);
        return fullPath;
    }

    /*
     * Relative paths are good for referencing other files, but badd for communicating errors
    * back to clients.  Sometimes we know a file by it's ref, but we want the full path.
    * In these cases, we don't want to resolve the rootPath + refPath, as that would let 
    * '..' take effect.  Instead, we strip out the '..' and then resolve the path.
    */
    buildStripRelPathAndBuildFullPath(configSetRootPath: string, relativePath: string): string {
        const strippedRelPath = relativePath.replace(/\.\.\//g, "");
        const fullPath = path.resolve(configSetRootPath, strippedRelPath);
        return fullPath;
    }

    async readFile(filePath: string): Promise<string> {
        return fs.readFile(filePath, "utf-8");
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        await fs.writeFile(filePath, content, "utf-8");
    }

    async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async readDirectory(dirPath: string): Promise<string[]> {
        return fs.readdir(dirPath);
    }

    async createDirectory(dirPath: string): Promise<void> {
        await fs.mkdir(dirPath, { recursive: true });
    }
}
