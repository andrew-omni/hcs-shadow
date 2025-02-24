import * as vscode from 'vscode';
import { ConfigSet, FsAdapter } from 'hcs-lib';
import { ConfigLinkProvider } from './ConfigLinkProvider';
import { getHcsManager } from './activation';

let fs: FsAdapter;
let configLinkProvider: ConfigLinkProvider;

export async function registerLinkBehaviorCommands(
  context: vscode.ExtensionContext,
  fsAdapter: FsAdapter
) {
  fs = fsAdapter;
  await internalRegisterCommands(context);
}

export async function internalRegisterCommands(context: vscode.ExtensionContext) {
  // Initialize the providers once
  configLinkProvider = new ConfigLinkProvider(fs);

  // ✅ Register Document Link Provider (One-Time Registration)
  context.subscriptions.push(
    vscode.languages.registerDocumentLinkProvider(
      { scheme: 'file', language: 'json' },
      configLinkProvider
    )
  );

  // ✅ Register Quick Fix Provider (One-Time Registration)
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', language: 'json' },
      new ConfigQuickFixProvider(fs),
      { providedCodeActionKinds: ConfigQuickFixProvider.providedCodeActionKinds }
    )
  );

  // ✅ Register Commands (One-Time Registration)
  const commands = ['Schema', 'Model'];
  for (const category of commands) {
    context.subscriptions.push(
      vscode.commands.registerCommand(`hcstools.createMissing${category}`, async (idRef: string) => {
        const hcsManager = getHcsManager();
        const configSet = await hcsManager.getConfigSetByResourceId(idRef);
        
        if (!configSet) {
          vscode.window.showErrorMessage(`Could not find a config set for ${idRef}`);
          return;
        }

        await createMissingFile(configSet, idRef, category);
      })
    );
  }

  // 🔄 File content change handler without re-registering
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      const document = event.document;
      if (document.languageId === 'json') {
        await configLinkProvider.refreshLinks(document);
      }
    })
  );

  // 🔄 Trigger when switching between editors
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.languageId === 'json') {
        await configLinkProvider.refreshLinks(editor.document);
      }
    })
  );

  // 🔄 Trigger on save to refresh links globally for any file
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      await refreshAllLinks(); // Refresh links in all open documents
    })
  );

  // 🔄 Trigger on file creation to refresh links globally
  context.subscriptions.push(
    vscode.workspace.onDidCreateFiles(async (event) => {
      await refreshAllLinks(); // Refresh links in all open documents
    })
  );


  context.subscriptions.push(
    vscode.workspace.onDidDeleteFiles(async (event) => {
      await refreshAllLinks(); // Refresh links in all open documents
    })
  );
}

// 🔁 Helper function to refresh links in all open editors
async function refreshAllLinks() {
  const openEditors = vscode.window.visibleTextEditors;
  for (const editor of openEditors) {
    if (editor.document.languageId === 'json') {
      await configLinkProvider.refreshLinks(editor.document);
    }
  }
}

async function createMissingFile(configSet: ConfigSet, idRef: string, category: string) {
  const filename = idRef.split('.').pop()!;

  switch (category) {
    case 'Schema':
      await configSet.createSchema(filename);
      break;
    case 'Model':
      await configSet.createModel(filename);
      break;
  }

  const absPath = configSet.getAbsFilePathById(idRef);
  if (absPath) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(absPath));
    vscode.window.showTextDocument(doc);
  }
}

class ConfigQuickFixProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  constructor(private fsAdapter: FsAdapter) { }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    return context.diagnostics
      .filter((diagnostic) => diagnostic.message.startsWith('Unable to resolve ref'))
      .map((diagnostic) => {
        const idRef = this.extractReferenceFromError(diagnostic.message);
        const category = this.extractCategoryFromId(idRef);
        const fix = new vscode.CodeAction(
          `Create missing ${category} for ${idRef}`,
          vscode.CodeActionKind.QuickFix
        );

        fix.command = {
          title: 'Create Missing File',
          command: `hcstools.createMissing${category}`,
          arguments: [idRef],
        };

        fix.diagnostics = [diagnostic];
        fix.isPreferred = true;

        return fix;
      });
  }

  private extractReferenceFromError(errorMessage: string): string {
    const parts = errorMessage.split(":");
    return (parts[1] || '').trim();
  }

  private extractCategoryFromId(idRef: string): string {
    if (idRef.includes('.schemas.')) return 'Schema';
    if (idRef.includes('.models.')) return 'Model';
    if (idRef.includes('.instances.')) return 'Instance';
    return 'Unknown';
  }
}
