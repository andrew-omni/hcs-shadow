import { OutputConversionStrategy } from './OutputConversionStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { ContextUtils } from '../../core/ContextUtils';

const LOG_CLS_SHORT = 'OutputConversion';

export class DefaultOutputConversionStrategy implements OutputConversionStrategy {
  async execute(context: PipelineContext): Promise<void> {
    Log.info(LOG_CLS_SHORT, 'OutputConversion', `🚀 Starting output conversion for model ID: ${context.modelId}`);

    const versionedEntries = this.getEntries(context);

    if (versionedEntries.size === 0) {
      Log.warn(LOG_CLS_SHORT, 'OutputConversion', '⚠️ No entries from "versioning" found in context.');
      return;
    }

    for (const [id, content] of versionedEntries.entries()) {
      try {
        const serializedContent = JSON.stringify(content, null, 2); // Pretty-print for readability

        // Store in context under 'output' phase
        ContextUtils.setPhaseData(context, 'output', id.split('.')[1], id, serializedContent);

        Log.info(LOG_CLS_SHORT, 'OutputConversion', `✅ Converted and stored: ${id}`);
      } catch (error) {
        Log.error(LOG_CLS_SHORT, 'OutputConversion', `❌ Failed to convert ${id}: ${(error as Error).message}`);
        throw new Error(`Failed to convert ${id}: ${(error as Error).message}`);
      }
    }

    Log.info(LOG_CLS_SHORT, 'OutputConversion', `🎉 Output conversion completed for model ID: ${context.modelId}`);
  }

  /**
   * Retrieves all versioned objects from the context.
   */
  private getEntries(context: PipelineContext): Map<string, any> {
    const versionedEntries = new Map<string, any>();

    for (const [key, value] of context.data.entries()) {
      const [phase, type, resourceId] = key.split(':');

      // Filter only versioned objects
      if (phase === 'versioning') {
        versionedEntries.set(resourceId, value.value);
      }
    }

    return versionedEntries;
  }
}
