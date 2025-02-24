import * as vscode from 'vscode';
import { FsAdapter } from 'hcs-lib';

import { Log } from "./logger";
import { getHcsManager, diagnostics } from './activation';
const LOG_CLS_SHORT = "clp";

export class ConfigLinkProvider implements vscode.DocumentLinkProvider {
    private debounceTimer: NodeJS.Timeout | null = null;
    private idReferenceMap: Map<string, Set<string>> = new Map(); // ID -> Set of document URIs
    private links: vscode.DocumentLink[] = [];

    constructor(private fsAdapter: FsAdapter) { }

    async provideDocumentLinks(document: vscode.TextDocument): Promise<vscode.DocumentLink[]> {
        // if (this.debounceTimer) {
        //   clearTimeout(this.debounceTimer);
        // }

        // return new Promise((resolve) => {
        //   this.debounceTimer = setTimeout(async () => {
        const links = await this.generateLinks(document);
        Log.silly(LOG_CLS_SHORT, "PDL", `🔗 Returning links for document ${document.uri.toString()}: ${JSON.stringify(links)}`);
        return links;

        //     resolve(links);
        //   }, 200);
        // });
    }

    // 🔄 **Refresh Links in a Document**
    async refreshLinks(document: vscode.TextDocument): Promise<void> {
        // Do not clear previous diagnostics
        // diagnostics.delete(document.uri);

        // 2. Generate new links
        const links = await this.generateLinks(document);

        // 3. Force VS Code to re-render the document
        vscode.languages.registerDocumentLinkProvider(
            { scheme: 'file', language: 'json' },
            this
        );
    }

    private async generateLinks(document: vscode.TextDocument): Promise<vscode.DocumentLink[]> {
        const links: vscode.DocumentLink[] = [];
        const linkPattern = /([\w-]+\.(schemas|models|instances)\.[\w-]+)/g;
        
        const linkPromises: Promise<void>[] = [];
        const hcsManager = getHcsManager();
        // Clear existing ID references for this document
        this.clearIdReferencesForDocument(document.uri.toString());

        for (let line = 0; line < document.lineCount; line++) {
            const textLine = document.lineAt(line);
            let match: RegExpExecArray | null;

            // Reset regex index before each new line to avoid skipping matches
            linkPattern.lastIndex = 0;

            while ((match = linkPattern.exec(textLine.text)) !== null) {
                const idRef = match[1];
                const absPath = await hcsManager.resolveAbsPathFromId(idRef);
                const matchIndex = match.index;
                const matchLength = match[0].length;

                if (textLine.text.includes(`"$id": "${idRef}"`)) continue;

                this.addIdReference(idRef, document.uri.toString()); // Track which documents reference this ID

                if (!absPath) {
                    // Do nothing - error added by build
                } else {
                    linkPromises.push(
                        this.fileExists(absPath).then((exists) => {
                            if (!exists) {
                                this.createDiagnostic(
                                    document,
                                    textLine,
                                    matchIndex,
                                    matchLength,
                                    `Internal error: File for ${idRef} does not exist on disk.`
                                );
                            } else {
                                // Create a clickable, highlighted link for valid references
                                const startPos = new vscode.Position(line, matchIndex);
                                const endPos = new vscode.Position(line, matchIndex + matchLength);
                                const link = new vscode.DocumentLink(
                                    new vscode.Range(startPos, endPos),
                                    vscode.Uri.file(absPath)
                                );
                                link.tooltip = `Open ${idRef}`;
                                links.push(link);
                            }
                        })
                    );
                }
            }
        }

        await Promise.all(linkPromises);
        this.links = links;
        return this.links;
    }

    private createDiagnostic(
        document: vscode.TextDocument,
        line: vscode.TextLine,
        start: number,
        length: number,
        message: string
    ) {
        const range = new vscode.Range(
            new vscode.Position(line.lineNumber, start),
            new vscode.Position(line.lineNumber, start + length)
        );
        const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
        const existingDiagnostics = diagnostics.get(document.uri) || [];
        diagnostics.set(document.uri, [...existingDiagnostics, diagnostic]);
    }

    private async fileExists(absPath: string): Promise<boolean> {
        return await this.fsAdapter.isExists(absPath);
    }

    // ✅ Fix for per-document invalidation logic
    invalidateIdReference(idRef: string, sourceDocumentUri: string) {
        const documents = this.idReferenceMap.get(idRef);
        if (documents) {
            for (const docUri of documents) {
                if (docUri !== sourceDocumentUri) {
                    // Only revalidate other documents, not the one being edited
                    vscode.workspace.openTextDocument(docUri).then((doc) => {
                        this.provideDocumentLinks(doc); // Re-link only the affected documents
                    });
                }
            }
        }
    }

    private addIdReference(idRef: string, documentUri: string) {
        if (!this.idReferenceMap.has(idRef)) {
            this.idReferenceMap.set(idRef, new Set());
        }
        this.idReferenceMap.get(idRef)!.add(documentUri);
    }

    private clearIdReferencesForDocument(documentUri: string) {
        for (const [idRef, documents] of this.idReferenceMap) {
            documents.delete(documentUri);
            if (documents.size === 0) {
                this.idReferenceMap.delete(idRef);
            }
        }
    }
}
