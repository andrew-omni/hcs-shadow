import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";

import { ContextUtils } from "../../core/ContextUtils";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSetManager } from "../../core/ConfigSetManager";
import { NodeGit } from "../../git/nodeGit";
import { HcsManager } from "../../core/HcsManager";
import path from "path";

suite("ContextUtils: Test Suite", function () {
    let context: PipelineContext;
    let chai: any;
    let expect: any;
    let fs: NodeFs
    let configSetManager: ConfigSetManager;
    const testDir = path.join(__dirname, "test_context_utils");


    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;

        // Use the real filesystem adapter
        fs = new NodeFs();
        configSetManager = new ConfigSetManager(fs);
    });

    setup(async () => {
        // Initialize a new empty PipelineContext before each test
        context = {
            hcsManager: new HcsManager([testDir], fs, new NodeGit()),
            modelId: "test-model",
            configSet: new ConfigSet('', fs),
            data: new Map(),
            errors: [],
        };
    });

    /**
     * ✅ Test setting and getting phase data
     */
    test("should set and retrieve data correctly", () => {
        const modelData = { name: "Test Model", fields: [] };

        ContextUtils.setPhaseData(context, "ingest", "models", "test-model", modelData);

        const retrievedData = ContextUtils.getPhaseData<typeof modelData>(context, "ingest", "models", "test-model");

        expect(retrievedData).to.deep.equal(modelData);
    });

    /**
     * ✅ Test retrieving non-existing data
     */
    test("should return null for non-existing data", () => {
        const retrievedData = ContextUtils.getPhaseData(context, "ingest", "models", "non-existing-model");
        expect(retrievedData).to.be.null;
    });

    /**
     * ✅ Test overwriting existing data
     */
    test("should overwrite existing data for the same key", () => {
        const modelData1 = { name: "First Model" };
        const modelData2 = { name: "Updated Model" };

        ContextUtils.setPhaseData(context, "ingest", "models", "test-model", modelData1);
        ContextUtils.setPhaseData(context, "ingest", "models", "test-model", modelData2);

        const retrievedData = ContextUtils.getPhaseData<typeof modelData2>(context, "ingest", "models", "test-model");
        expect(retrievedData).to.deep.equal(modelData2);
    });

    /**
     * ✅ Test timestamp property existence
     */
    test("should store a timestamp when setting data", () => {
        const modelData = { name: "Timestamp Test" };
        const beforeTime = Date.now();

        ContextUtils.setPhaseData(context, "ingest", "models", "timestamp-test", modelData);

        const key = "ingest:models:timestamp-test";
        const storedEntry = context.data.get(key);

        expect(storedEntry).to.exist;
        expect(storedEntry?.timestamp).to.be.a("number");
        expect(storedEntry!.timestamp).to.be.greaterThanOrEqual(beforeTime);
    });

    /**
     * ✅ Test storing multiple entries under different keys
     */
    test("should handle multiple entries across phases", () => {
        const modelData = { name: "Model Data" };
        const schemaData = { name: "Schema Data" };

        ContextUtils.setPhaseData(context, "ingest", "models", "model-1", modelData);
        ContextUtils.setPhaseData(context, "conversion", "schemas", "schema-1", schemaData);

        const retrievedModel = ContextUtils.getPhaseData<typeof modelData>(context, "ingest", "models", "model-1");
        const retrievedSchema = ContextUtils.getPhaseData<typeof schemaData>(context, "conversion", "schemas", "schema-1");

        expect(retrievedModel).to.deep.equal(modelData);
        expect(retrievedSchema).to.deep.equal(schemaData);
    });

    /**
     * ✅ Test error handling for corrupted entries
     */
    test("should return null for corrupted entries", () => {
        // Simulate a corrupted entry
        const key = "ingest:model:corrupted";
        context.data.set(key, undefined);

        const result = ContextUtils.getPhaseData(context, "ingest", "models", "corrupted");
        expect(result).to.be.null;
    });
});
