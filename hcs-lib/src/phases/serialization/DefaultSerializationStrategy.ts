import { SerializationStrategy } from './SerializationStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { ContextUtils } from '../../core/ContextUtils';
import { FsAdapter } from '../../fs/fsAdapter';
import * as path from 'path';

const LOG_CLS_SHORT = 'Serialization';

export class DefaultSerializationStrategy implements SerializationStrategy {
  private fsAdapter: FsAdapter;

  constructor(fsAdapter: FsAdapter) {
    this.fsAdapter = fsAdapter;
  }

  async execute(context: PipelineContext): Promise<void> {
    Log.info(LOG_CLS_SHORT, 'Serialization', `🚀 Starting serialization for model ID: ${context.modelId}`);

    const outputEntries = this.getEntries(context);

    if (outputEntries.size === 0) {
      Log.warn(LOG_CLS_SHORT, 'Serialization', '⚠️ No entries from "output" found in context.');
      return;
    }

    for (const [id, content] of outputEntries.entries()) {
      try {
        // Determine file path
        const absFilePath = this.fsAdapter.buildAbsPathForId(context.configSet.absolutePath, id);

        // Ensure directory exists
        const dirPath = path.dirname(absFilePath);
        await this.ensureDirectoryExists(dirPath);

        // Write serialized content to file
        await this.fsAdapter.writeFile(absFilePath, content);

        Log.info(LOG_CLS_SHORT, 'Serialization', `✅ Serialized and wrote to file: ${absFilePath}`);
      } catch (error) {
        Log.error(LOG_CLS_SHORT, 'Serialization', `❌ Failed to serialize ${id}: ${(error as Error).message}`);
        throw new Error(`Failed to serialize ${id}: ${(error as Error).message}`);
      }
    }

    Log.info(LOG_CLS_SHORT, 'Serialization', `🎉 Serialization completed for model ID: ${context.modelId}`);
  }

  /**
   * Retrieves all entries from the 'output' phase in the context.
   */
  private getEntries(context: PipelineContext): Map<string, any> {
    const outputEntries = new Map<string, any>();

    for (const [key, value] of context.data.entries()) {
      const [phase, type, resourceId] = key.split(':');

      // Filter only output phase entries
      if (phase === 'output') {
        outputEntries.set(resourceId, value.value);
      }
    }

    return outputEntries;
  }

  /**
   * Ensures that a directory exists; creates it if necessary.
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    if (!(await this.fsAdapter.isExists(dirPath))) {
      await this.fsAdapter.createDirectory(dirPath);
      Log.info(LOG_CLS_SHORT, 'Serialization', `📁 Created directory: ${dirPath}`);
    }
  }
}
