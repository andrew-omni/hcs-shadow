import { ConversionStrategy } from './ConversionStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { ContextUtils } from '../../core/ContextUtils';
import { ValidationError } from '../../core/interfaces/ValidationError';

const LOG_CLS_SHORT = 'Conversion';

export class DefaultConversionStrategy implements ConversionStrategy {
  async execute(context: PipelineContext): Promise<any> {
    try {
      Log.info(LOG_CLS_SHORT, 'Conversion', `Starting conversion for model ID: ${context.modelId}`);

      // Iterate through all ingested data entries for the model
      for (const [key, value] of context.data.entries()) {
        const [phase, resourceType, resourceId] = key.split(':');

        if (phase === 'ingest') {
          const rawIngestedData = value.value;

          if (!rawIngestedData) {
            Log.warn(LOG_CLS_SHORT, 'Conversion', `No ingested data found for model ID: ${resourceId}`);
            continue;
          }

          try {
            // Parse the ingested data as JSON
            const parsedData = JSON.parse(rawIngestedData);

            // Store the successfully parsed data in the context
            ContextUtils.setPhaseData(context, 'conversion', resourceType, resourceId, parsedData);

            Log.info(LOG_CLS_SHORT, 'Conversion', `✅ Successfully converted ${resourceType}: ${resourceId}`);
          } catch (jsonError) {
            // Extract line number for the JSON error if possible
            const errorDetails = this.extractErrorPositionDetails(rawIngestedData, jsonError);

            // Add a ValidationError to the context
            const validationError: ValidationError = {
              filePath: resourceId,
              line: errorDetails.line,
              column: errorDetails.columnStart,
              endColumn: errorDetails.columnEnd,
              message: `JSON parsing error: ${(jsonError as Error).message}`,
              severity: 'error',
            };

            context.errors.push(validationError);

            Log.error(
              LOG_CLS_SHORT,
              'Conversion',
              `❌ JSON parsing failed for ${resourceType} ID: ${resourceId} at line ${errorDetails.line}: ${(jsonError as Error).message}`
            );
          }
        }
      }

      Log.info(LOG_CLS_SHORT, 'Conversion', `Conversion completed for model ID: ${context.modelId}`);
    } catch (error) {
      Log.error(LOG_CLS_SHORT, 'Conversion', `🚨 Error during conversion: ${error}`);
      throw error;
    }
  }

  /**
   * Extracts error details for JSON parsing errors.
   * Returns an approximate line number based on character position.
   */
  private extractErrorPositionDetails(rawJson: string, error: any): { line: number; columnStart: number; columnEnd: number } {
    const lines = rawJson.split('\n');
    let position = this.extractErrorPositionFromMessage(error.message);
    let line = 0;
    let runningCharCount = 0;

    for (let i = 0; i < lines.length; i++) {
      runningCharCount += lines[i].length + 1; // Add 1 for the newline character
      if (position <= runningCharCount) {
        line = i + 1; // Line numbers are 1-based
        const columnStart = position - (runningCharCount - lines[i].length) + 1;
        const columnEnd = columnStart + 1; // Highlighting a single character for the error
        return { line, columnStart, columnEnd };
      }
    }

    // If position couldn't be determined, return the start of the file
    return { line: 1, columnStart: 0, columnEnd: 1 };
  }

  /**
   * Extracts the character position from the error message.
   */
  private extractErrorPositionFromMessage(message: string): number {
    const match = message.match(/position (\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
