import { Log } from "../../logger";
import { ValidationError } from "../interfaces/ValidationError";
import { ContextUtils } from "../ContextUtils";
import { PipelineContext } from "../interfaces/PipelineContext";
import { findFieldPositionInFile } from "../../utils/findElementInJSON"
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

const LOG_CLS_SHORT = "BaseJsonValidator";

export abstract class BaseJsonValidator {

    /**
     * Extracts an approximate line number from the AJV error's `instancePath`.
     */
    protected extractLineNumber(instancePath: string): number {
        const pathParts = instancePath.split("/");
        return pathParts.length ? parseInt(pathParts[pathParts.length - 1]) || 0 : 0;
    }

    /**
     * Formats a validation error into a standardized structure.
     */
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
            endColumn: endChar,
            message,
            severity,
        };
    }

    /**
     * Runs AJV compilation to ensure the object is a well-formed JSON Schema.
     */
    protected validateJsonStructure(
        jsonContent: any,
        fullFilePath: string
    ): ValidationError[] {
        const validationErrors: ValidationError[] = [];

        try {
            // Initialize Ajv with non-strict mode
            const ajv = new Ajv2020({
                strict: false, // Disables strict mode, allowing unresolved $ref without throwing
                allErrors: true
            });

            addFormats(ajv);

            // Compile the schema
            const validateSchemaFn = ajv.compile(jsonContent);

            // Validate the JSON
            if (!validateSchemaFn(jsonContent)) {
                for (const ajvError of validateSchemaFn.errors || []) {
                    // Skip missing $ref errors
                    if (ajvError.keyword === "$ref" && ajvError.message?.includes("can't resolve reference")) {
                        Log.warn(LOG_CLS_SHORT, "VALIDATE_JSON", `Skipping unresolved $ref in ${fullFilePath}`);
                        continue;
                    }

                    validationErrors.push(
                        this.formatValidationError(
                            fullFilePath,
                            this.extractLineNumber(ajvError.instancePath),
                            0,
                            0,
                            `JSON validation error: ${ajvError.message}`,
                            "error"
                        )
                    );
                }
            }
        } catch (error) {
            Log.error(
                LOG_CLS_SHORT,
                "VALIDATE_JSON",
                `❌ Error validating JSON structure: ${error}`
            );
            validationErrors.push(
                this.formatValidationError(
                    fullFilePath,
                    0,
                    0,
                    0,
                    `JSON structure error: ${error}`,
                    "error"
                )
            );
        }

        return validationErrors;
    }


    /**
     * Validates core fields ($id, $version, $inheritsFrom) and resolves references.
     */
    baseValidations(
        jsonContent: any,
        fullFilePath: string,
        context: PipelineContext
    ): ValidationError[] {
        const validationErrors: ValidationError[] = [];

        const pathParts = fullFilePath.split("/");
        const configSetName = pathParts[pathParts.length - 3];
        const expectedType = pathParts[pathParts.length - 2];
        const fileName = pathParts[pathParts.length - 1].split(".")[0];

        const expectedId = `${configSetName}.${expectedType}.${fileName}`;

        // ✅ Validate $id
        if (!jsonContent.$id || typeof jsonContent.$id !== "string") {
            const position = findFieldPositionInFile(jsonContent, "$id");
            validationErrors.push(
                this.formatValidationError(
                    fullFilePath,
                    position.line,
                    position.startChar,
                    position.endChar,
                    `Missing or invalid $id field. Expected: "${expectedId}"`,
                    "error"
                )
            );
        } else if (jsonContent.$id !== expectedId) {
            const position = findFieldPositionInFile(jsonContent, "$id");
            validationErrors.push(
                this.formatValidationError(
                    fullFilePath,
                    position.line,
                    position.startChar,
                    position.endChar,
                    `Expected $id to be "${expectedId}", but found "${jsonContent.$id}".`,
                    "error"
                )
            );
        }

        // ✅ Validate $version
        if (typeof jsonContent.$version !== "number") {
            const position = findFieldPositionInFile(jsonContent, "$version");
            validationErrors.push(
                this.formatValidationError(
                    fullFilePath,
                    position.line,
                    position.startChar,
                    position.endChar,
                    `Missing or invalid $version. Expected a valid number.`,
                    "error"
                )
            );
        }

        // ✅ Validate JSON Schema structure
        // validationErrors.push(...this.validateJsonStructure(jsonContent, fullFilePath));

        // ✅ Validate $inheritsFrom references
        validationErrors.push(
            ...this.inheritsFromCheck(jsonContent, fullFilePath, context)
        );

        return validationErrors;
    }

    /**
     * Checks if $inheritsFrom references resolve correctly.
     */
    private inheritsFromCheck(
        jsonContent: any,
        fullFilePath: string,
        context: PipelineContext
    ): ValidationError[] {
        const validationErrors: ValidationError[] = [];

        const checkReferences = (obj: any) => {
            if (typeof obj !== "object" || obj === null) return;

            for (const key in obj) {
                if (key === "$inheritsFrom") {
                    const refId = obj[key];
                    const referenceExists = ContextUtils.getPhaseData<any>(
                        context,
                        "conversion",
                        "schemas",
                        refId
                    );

                    if (!referenceExists) {
                        const position = findFieldPositionInFile(
                            jsonContent,
                            "$inheritsFrom"
                        );
                        validationErrors.push(
                            this.formatValidationError(
                                fullFilePath,
                                position.line,
                                position.startChar,
                                position.endChar,
                                `Reference error: '$inheritsFrom' refers to non-existent schema ID: ${refId}`,
                                "error"
                            )
                        );
                    }
                } else {
                    checkReferences(obj[key]);
                }
            }
        };

        checkReferences(jsonContent);
        return validationErrors;
    }
}