import * as vscode from "vscode";
import { FsAdapter } from "hcs-lib";

export class VsCodeFs implements FsAdapter {

    buildAbsPathForId(configSetRootPath: string, id: string): string {
        // Extract the category (e.g., models, schemas, instances) and filename
        const idParts = id.split('.');
        if (idParts.length < 3) {
            throw new Error(`Invalid ID format: ${id}. Expected format 'configset.type.name'`);

        }
        const category = idParts[1]; // e.g., 'models'
        const baseFilename = `${idParts[2]}`; // e.g., 'validModel'

        // Build the absolute path
        if (idParts.length === 4) {
            // Versioned files live in a directory named after the base filename
            return `${configSetRootPath}/${category}/${baseFilename}/${baseFilename}_${idParts[3]}.json`;
        } else if (idParts.length === 3) {
            return `${configSetRootPath}/${category}/${baseFilename}.json`;
        } else {
            throw new Error(`Invalid ID format: ${id}. Expected format 'configset.type.name' or 'configset.type.name.version'`);
        }
    }

    async readFile(filePath: string): Promise<string> {
        const uri = vscode.Uri.file(filePath);
        const buffer = await vscode.workspace.fs.readFile(uri);
        return Buffer.from(buffer).toString("utf-8");
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        const uri = vscode.Uri.file(filePath);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
    }

    async isExists(filePath: string): Promise<boolean> {
        const uri = vscode.Uri.file(filePath);
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
    }

    async isDirectory(filePath: string): Promise<boolean> {
        const uri = vscode.Uri.file(filePath);
        const stats = await vscode.workspace.fs.stat(uri);
        return stats.type === vscode.FileType.Directory;
    }

    async readDirectory(dirPath: string): Promise<string[]> {
        const uri = vscode.Uri.file(dirPath);
        const entries = await vscode.workspace.fs.readDirectory(uri);
        return entries.map(([name]) => name);
    }

    async createDirectory(dirPath: string): Promise<void> {
        const uri = vscode.Uri.file(dirPath);
        await vscode.workspace.fs.createDirectory(uri);
    }
}
