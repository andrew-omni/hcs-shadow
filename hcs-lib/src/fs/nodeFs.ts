import { promises as fs } from "fs";
import { FsAdapter } from "./fsAdapter";
import * as path from "path";

export class NodeFs implements FsAdapter {
    
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
        return fs.readFile(filePath, "utf-8");
    }

    async writeFile(filePath: string, content: string): Promise<void> {
        await fs.writeFile(filePath, content, "utf-8");
    }

    async isExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async isDirectory(filePath: string): Promise<boolean> {
        const stats = await fs.stat(filePath);
        return stats.isDirectory();
    }

    async readDirectory(dirPath: string): Promise<string[]> {
        return fs.readdir(dirPath);
    }

    async createDirectory(dirPath: string): Promise<void> {
        await fs.mkdir(dirPath, { recursive: true });
    }
}
