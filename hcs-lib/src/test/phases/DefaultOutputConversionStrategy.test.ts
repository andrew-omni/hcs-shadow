import { suite, test, suiteSetup, suiteTeardown } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { NodeFs } from "../../fs/nodeFs";
import { DefaultOutputConversionStrategy } from "../../phases/output-conversion/DefaultOutputConversionStrategy";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import { ContextUtils } from "../../core/ContextUtils";
import { NodeGit } from "../../git/nodeGit";
import { HcsManager } from "../../core/HcsManager";

suite("DefaultOutputConversionStrategy: Conversion Tests", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: NodeFs;
    let outputConversionStrategy: DefaultOutputConversionStrategy;
    let configSet: ConfigSet;
    let testDir: string;
    let context: PipelineContext;

    this.timeout(10000);

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        fsAdapter = new NodeFs();
        outputConversionStrategy = new DefaultOutputConversionStrategy();
        testDir = path.join(__dirname, "test_output_conversion");

        // Ensure test directory exists
        await fs.mkdir(testDir, { recursive: true });

        // Load config set for the test
        configSet = await ConfigSet.loadConfigSet(testDir, fsAdapter);
    });

    suiteTeardown(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    function createPipelineContext(): PipelineContext {
        return {
            hcsManager: new HcsManager([testDir], fsAdapter, new NodeGit()),

            modelId: "test-model",
            configSet,
            data: new Map(),
            errors: [],
        };
    }

    test("should convert and store output entries correctly", async () => {
        context = createPipelineContext();

        const MODEL_ID = "testConfig.models.example";
        const SCHEMA_ID = "testConfig.schemas.example";

        const modelData = { $id: MODEL_ID, name: "Test Model", version: 1 };
        const schemaData = { $id: SCHEMA_ID, type: "object", properties: { name: { type: "string" } } };

        // Store versioned models and schemas in context
        ContextUtils.setPhaseData(context, "versioning", "models", MODEL_ID, modelData);
        ContextUtils.setPhaseData(context, "versioning", "schemas", SCHEMA_ID, schemaData);

        await outputConversionStrategy.execute(context);

        // Verify output phase has correct data
        const convertedModel = ContextUtils.getPhaseData<string>(context, "output", "models", MODEL_ID) as string;
        const convertedSchema = ContextUtils.getPhaseData<string>(context, "output", "schemas", SCHEMA_ID) as string;

        expect(convertedModel).to.be.a("string");
        expect(JSON.parse(convertedModel)).to.deep.equal(modelData);

        expect(convertedSchema).to.be.a("string");
        expect(JSON.parse(convertedSchema)).to.deep.equal(schemaData);
    });

    test("should log warning when no versioned entries are found", async () => {
        context = createPipelineContext();

        await outputConversionStrategy.execute(context);

        expect(context.data.size).to.equal(0);
    });

    test("should handle JSON.stringify errors gracefully", async () => {
        context = createPipelineContext();

        const BROKEN_MODEL_ID = "testConfig.models.broken";
        const cyclicData: any = { $id: BROKEN_MODEL_ID };
        cyclicData.circular = cyclicData; // Creates a circular reference

        ContextUtils.setPhaseData(context, "versioning", "models", BROKEN_MODEL_ID, cyclicData);

        let caughtError = null;
        try {
            await outputConversionStrategy.execute(context);
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).to.be.an("error");
        expect((caughtError as Error).message).to.include("Converting circular structure to JSON");
    });
});
