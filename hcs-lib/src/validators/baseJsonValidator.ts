import { ResourceManager } from "../configset/resourceManager";

export type ValidationError = {
  filePath: string;
  line: number;
  column: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning";
};

export abstract class BaseJsonValidator {
  resourceManager: ResourceManager;

  constructor(resourceManager: ResourceManager) {
    this.resourceManager = resourceManager;
  }

  abstract validate(jsonObject: any, filePath: string): ValidationError[];

  protected formatValidationError(
    filePath: string,
    line: number,
    startChar: number,
    endChar: number,
    message: string,
    severity: "error" | "warning"
  ): ValidationError {
    return {
      filePath,
      line,
      column: startChar,
      endColumn: endChar, // Pass the end character
      message,
      severity,
    };
  }
  
  /**
 * Extracts an approximate line number from the AJV error's `instancePath`.
 */
  protected extractLineNumber(instancePath: string): number {
    const pathParts = instancePath.split("/");
    return pathParts.length ? parseInt(pathParts[pathParts.length - 1]) || 0 : 0;
  }

  protected findFieldPositionInFile(
    jsonContent: object,
    fieldName: string,
    highlightValue: boolean = false
  ): { line: number; startChar: number; endChar: number } {
    // Convert JSON object to a formatted string
    const jsonString = JSON.stringify(jsonContent, null, 2);
    const lines = jsonString.split("\n");

    console.log(`🔍 Starting search for field: "${fieldName}" (highlightValue: ${highlightValue})`);
    console.log(`🔍 Total lines in JSON: ${lines.length}`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`🔍 Analyzing line ${i + 1}: ${line}`);

      // Create RegExp to find the field in the line
      const fieldRegex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"]+)"`);
      console.log(`🔍 Using RegExp: ${fieldRegex}`);

      const match = fieldRegex.exec(line);

      if (match) {
        console.log(`✅ Match found on line ${i + 1}: ${match[0]}`);

        if (highlightValue) {
          // Highlight the value (e.g., "newsccc.json")
          const value = match[1]; // Captured value
          const valueIndex = line.indexOf(value, match.index);

          if (valueIndex === -1) {
            console.warn(`⚠️ Value '${value}' not found in line.`);
          }

          const startChar = valueIndex;
          const endChar = valueIndex + value.length;

          console.log(`🎯 Highlighting value from char ${startChar} to ${endChar} on line ${i + 1}`);
          return { line: i, startChar, endChar };
        } else {
          // Highlight the key (e.g., "$id")
          const startChar = match.index + 1; // Skip the starting quote
          const endChar = startChar + fieldName.length;

          console.log(`🎯 Highlighting key from char ${startChar} to ${endChar} on line ${i + 1}`);
          return { line: i, startChar, endChar };
        }
      } else {
        console.log(`❌ No match found for "${fieldName}" on line ${i + 1}`);
      }
    }

    // Default: Top of file if not found
    console.warn(`❌ Field "${fieldName}" not found in the entire file.`);
    return { line: 0, startChar: 0, endChar: 0 };
  }



}
