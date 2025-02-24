import { IngestStrategy } from './IngestStrategy';
import { FsAdapter } from '../../fs/fsAdapter';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { Log } from '../../logger';
import { ContextUtils } from '../../core/ContextUtils';
import { findFieldPositionInFile } from "../../utils/findElementInJSON"
import { ValidationError } from '../../core/interfaces/ValidationError';

const LOG_CLS_SHORT = "FS_INGEST";

export class FileSystemIngestStrategy implements IngestStrategy {

  constructor(private fsAdapter: FsAdapter) { }
  protected alreadyLoaded = new Set<string>();

  /**
   * Ingests content from the filesystem.
   * @param resourcePath - The path to the file to ingest.
   */
  async execute(context: PipelineContext): Promise<any> {
    try {

      // We've scanned the DIR and know the ID and filePath mapping, so read the file
      const resourcePath = context.configSet.modelIdsToAbsPathMap.get(context.modelId);

      if (!resourcePath) {
        throw new Error(`Model ID ${context.modelId} not found in config set.`);
      }

      const content = await this.fsAdapter.readFile(resourcePath);

      if (!content) {
        throw new Error(`File not found at: ${resourcePath}`);
      }

      if (content == '' || content == '""') {
        throw new Error(`File is empty: ${resourcePath}`);
      }

      // The model is ingested as raw text.  We now recursively resolve references - we look for known
      // ID paths, if we find them, we try to load them.  If they are invalid / we can't find, we register
      // an error ane exit.
      ContextUtils.setPhaseData(context, 'ingest', 'models', context.modelId, content);
      this.alreadyLoaded = new Set<string>();
      await this.recursivelyResolveReferences(context, resourcePath, content);

      Log.info(LOG_CLS_SHORT, 'ingest', `Ingested file from: ${resourcePath}`);

    } catch (error) {
      Log.error(LOG_CLS_SHORT, 'ingest', `Error ingesting file: ${error}`);
      throw error;
    }
  }

  async recursivelyResolveReferences(context: PipelineContext, filePath: string, content: string): Promise<void> {
    const extractedRefs = this.extractReferences(content);
    let sourceDocId: string = '';
    try {
      sourceDocId = JSON.parse(content).$id;
    } catch (e) {
      Log.error(LOG_CLS_SHORT, 'ingest', `No $id found in source document - cannot parse`);
      const validationError: ValidationError = {
        filePath: filePath,
        line: 0,
        column: 0,
        endColumn: 0,
        message: `No $id found in source document - cannot parse`,
        severity: 'error',
      };

      context.errors.push(validationError);
      return;
    }

    for (const refId of extractedRefs) {
      if (this.alreadyLoaded.has(refId)) {
        Log.warn(LOG_CLS_SHORT, "ingest", `Skipping already loaded reference: ${refId}`);
        continue;
      } else {
        Log.info(LOG_CLS_SHORT, "ingest", `Resolving reference: ${refId}`);
      }

      const type = refId.split(".")[1]; // schemas | models | instances

      try {
        const absPath = await context.hcsManager.buildFilePathById(refId);
        if (!absPath) {
          Log.error(LOG_CLS_SHORT, "ingest", `Reference not found: ${refId} while parsing ${filePath}`);
          this.handleRefError(context, sourceDocId, content, refId);
          continue;
        }

        const newContent = await this.fsAdapter.readFile(absPath);
        if (!newContent) {
          Log.error(LOG_CLS_SHORT, "ingest", `Empty or missing file for reference: ${refId}`);
          this.handleRefError(context, sourceDocId, content, refId);
          continue;
        }

        // Store the loaded file in context
        ContextUtils.setPhaseData(context, "ingest", type, refId, newContent);
        this.alreadyLoaded.add(refId);

        // Recursively resolve references within the newly loaded content
        await this.recursivelyResolveReferences(context, absPath, newContent);

      } catch (error) {
        Log.error(LOG_CLS_SHORT, "ingest", `Error resolving reference: ${refId}, ${error}`);
        this.handleRefError(context, sourceDocId, content, refId);
      }
    }
  }

  /**
   * Extracts references (IDs) from a JSON string.
   * - IDs are strings that, when split by '.', contain 3 or 4 elements.
   * - The second element must be 'schemas', 'models', or 'instances'.
   */
  private extractReferences(content: string): string[] {
    try {
      const jsonData = JSON.parse(content);
      const refs: Set<string> = new Set();

      const traverse = (obj: any) => {
        if (typeof obj !== "object" || obj === null) return;
        for (const key in obj) {
          if (!obj.hasOwnProperty(key)) continue;

          const value = obj[key];
          if (typeof value === "string" && this.isValidId(value)) {
            refs.add(value);
          } else if (typeof value === "object") {
            traverse(value);
          }
        }
      };

      traverse(jsonData);
      return Array.from(refs);
    } catch (error) {
      Log.error(LOG_CLS_SHORT, "extractReferences", `Invalid JSON content: ${error}`);
      return [];
    }
  }

  /**
   * Checks if a given string is a valid reference ID.
   */
  private isValidId(id: string): boolean {
    const parts = id.split(".");
    return parts.length === 3 || parts.length === 4 && ["schemas", "models", "instances"].includes(parts[1]);
  }

  private handleRefError(
    context: PipelineContext,
    sourceDocId: string,
    rawContent: any,
    refId: string,
  ): void {

    const absPath = context.hcsManager.getConfigSetManager().buildAbsFilePathById(sourceDocId);
    const type = sourceDocId.split(".")[1]; // schemas | models | instances
    // The error is the ID of the invalid reference
    const invalidRefId: string = refId;

    // Find the line, col and endColumn of the invalid reference
    const errorRange = findFieldPositionInFile(JSON.parse(rawContent), invalidRefId, true);

    let errorDetails = `Unresolved reference`;

    const validationError: ValidationError = {
      filePath: absPath,
      line: errorRange.line,
      column: errorRange.startChar,
      endColumn: errorRange.endChar,
      message: `Unable to resolve ref: ${refId}`,
      severity: 'error',
    };

    context.errors.push(validationError);
    Log.error(LOG_CLS_SHORT, `${type.charAt(0).toUpperCase()}`, `❌ Failed to resolve ref in ${sourceDocId}: ${refId}`);
  }
}  