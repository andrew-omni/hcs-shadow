import { suiteSetup, suite, test, setup } from "mocha";
import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";  // <-- Import ajv-formats
suite("AJV Schemas: Validation Test Suite", function () {
    let ajv: Ajv;
    let chai: any;
    let expect: any;

    // ✅ Setup for all tests
    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
    });

    setup(() => {
        ajv = new Ajv({
            allErrors: true,
            strict: true,
            // removeAdditional: true,
            // allowUnionTypes: true,
            // strictTuples: true,
            // strictTypes: true,
            // strictRequired: true,
        });

        addFormats(ajv);  // Enable built-in formats like "date-time"

    });

    /**
     * ✅ Test: Simple Schema Validation (Valid Model)
     */
    test("should validate a simple model successfully", () => {
        const schema = {
            $id: "simple.schema",
            type: "object",
            properties: {
                id: { type: "string" },
                name: { type: "string" },
            },
            required: ["id", "name"],
            additionalProperties: false,
        };

        const model = {
            id: "123",
            name: "Valid Model",
        };

        const validate = ajv.compile(schema);
        const result = validate(model);

        expect(result).to.be.true;
        expect(validate.errors).to.be.null;
    });

    /**
     * ❌ Test: Missing Required Fields
     */
    test("should fail validation when required fields are missing", () => {
        const schema = {
            $id: "required-fields.schema",
            type: "object",
            properties: {
                id: { type: "string" },
                name: { type: "string" },
            },
            required: ["id", "name"],
            additionalProperties: false,
        };

        const model = {
            id: "123",
        };

        const validate = ajv.compile(schema);
        const result = validate(model);

        expect(result).to.be.false;
        expect(validate.errors).to.have.length.greaterThan(0);
        expect(validate.errors![0].message).to.include("must have required property 'name'");
    });

    /**
     * ❌ Test: Type Mismatch in Model Properties
     */
    test("should fail validation due to type mismatch", () => {
        const schema = {
            $id: "type-mismatch.schema",
            type: "object",
            properties: {
                id: { type: "string" },
                count: { type: "number" },
            },
            required: ["id", "count"],
            additionalProperties: false,
        };

        const model = {
            id: "123",
            count: "not-a-number",
        };

        const validate = ajv.compile(schema);
        const result = validate(model);

        expect(result).to.be.false;
        expect(validate.errors).to.have.length.greaterThan(0);
        expect(validate.errors![0].message).to.include("must be number");
    });

    /**
     * ❌ Test: Additional Properties Not Allowed
     */
    test("should fail validation for additional properties", () => {
        const schema = {
            $id: "no-additional.schema",
            type: "object",
            properties: {
                id: { type: "string" },
            },
            required: ["id"],
            additionalProperties: false,
        };

        const model = {
            id: "123",
            extraProperty: "Not allowed",
        };

        const validate = ajv.compile(schema);
        const result = validate(model);

        expect(result).to.be.false;
        expect(validate.errors).to.have.length.greaterThan(0);
        expect(validate.errors![0].message).to.include("must NOT have additional properties");
    });

    /**
     * ✅ Test: Nested Object Validation
     */
    test("should validate nested objects correctly", () => {
        const schema = {
            $id: "nested.schema",
            type: "object",
            properties: {
                id: { type: "string" },
                metadata: {
                    type: "object",
                    properties: {
                        createdBy: { type: "string" },
                        timestamp: { type: "string", format: "date-time" },
                    },
                    required: ["createdBy", "timestamp"],
                },
            },
            required: ["id", "metadata"],
            additionalProperties: false,
        };

        const model = {
            id: "123",
            metadata: {
                createdBy: "tester",
                timestamp: "2023-12-31T23:59:59Z",
            },
        };

        const validate = ajv.compile(schema);
        const result = validate(model);

        expect(result).to.be.true;
        expect(validate.errors).to.be.null;
    });

    /**
     * ❌ Test: Invalid Nested Object
     */
    test("should fail validation for invalid nested object", () => {
        const schema = {
            $id: "nested-invalid.schema",
            type: "object",
            properties: {
                id: { type: "string" },
                metadata: {
                    type: "object",
                    properties: {
                        createdBy: { type: "string" },
                        timestamp: { type: "string", format: "date-time" },
                    },
                    required: ["createdBy", "timestamp"],
                },
            },
            required: ["id", "metadata"],
            additionalProperties: false,
        };

        const model = {
            id: "123",
            metadata: {
                createdBy: "tester",
                timestamp: "invalid-date",
            },
        };

        const validate = ajv.compile(schema);
        const result = validate(model);

        expect(result).to.be.false;
        expect(validate.errors).to.have.length.greaterThan(0);
        expect(validate.errors![0].message).to.include("must match format \"date-time\"");
    });
});
