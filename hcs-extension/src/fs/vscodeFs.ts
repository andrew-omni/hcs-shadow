import * as vscode from "vscode";
import { FsAdapter } from "hcs-lib";

export class VsCodeFs implements FsAdapter {

    buildFullPathFromRelativePath(configSetRootPath: string, relativePath: string): string {
        const fullPathUri = vscode.Uri.joinPath(vscode.Uri.file(configSetRootPath), relativePath);
        return fullPathUri.fsPath;
    }

    buildStripRelPathAndBuildFullPath(configSetRootPath: string, relativePath: string): string {
        const strippedRelPath = relativePath.replace(/\.\.\//g, "");
        const fullPathUri = vscode.Uri.joinPath(vscode.Uri.file(configSetRootPath), strippedRelPath);
        return fullPathUri.fsPath;
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

    async fileExists(filePath: string): Promise<boolean> {
        const uri = vscode.Uri.file(filePath);
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
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
