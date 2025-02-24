import { suite, test, suiteSetup, suiteTeardown } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { NodeFs } from "../../fs/nodeFs";
import { DefaultSerializationStrategy } from "../../phases/serialization/DefaultSerializationStrategy";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import { ContextUtils } from "../../core/ContextUtils";
import { FsAdapter } from "../../fs/fsAdapter";
import { HcsManager } from "../../core/HcsManager";
import { NodeGit } from "../../git/nodeGit";

suite("DefaultSerializationStrategy: Serialization Tests", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: NodeFs;
    let serializationStrategy: DefaultSerializationStrategy;
    let configSet: ConfigSet;
    let testDir: string;
    let context: PipelineContext;

    this.timeout(10000);

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        fsAdapter = new NodeFs();
        serializationStrategy = new DefaultSerializationStrategy(fsAdapter);
        testDir = path.join(__dirname, "test_serialization");

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

    test("should serialize and write output entries correctly", async () => {
        context = createPipelineContext();

        const MODEL_ID = "testConfig.models.example";
        const SCHEMA_ID = "testConfig.schemas.example";

        const modelData = { $id: MODEL_ID, name: "Test Model", version: 1 };
        const schemaData = { $id: SCHEMA_ID, type: "object", properties: { name: { type: "string" } } };

        // Store in 'output' phase before serialization
        ContextUtils.setPhaseData(context, "output", "models", MODEL_ID, JSON.stringify(modelData));
        ContextUtils.setPhaseData(context, "output", "schemas", SCHEMA_ID, JSON.stringify(schemaData));

        await serializationStrategy.execute(context);

        // Verify files are created
        const modelFilePath = fsAdapter.buildAbsPathForId(testDir, MODEL_ID);
        const schemaFilePath = fsAdapter.buildAbsPathForId(testDir, SCHEMA_ID);

        const modelFileExists = await fsAdapter.isExists(modelFilePath);
        const schemaFileExists = await fsAdapter.isExists(schemaFilePath);

        expect(modelFileExists).to.be.true;
        expect(schemaFileExists).to.be.true;

        // Verify content
        const modelFileContent = await fsAdapter.readFile(modelFilePath);
        const schemaFileContent = await fsAdapter.readFile(schemaFilePath);

        expect(JSON.parse(modelFileContent)).to.deep.equal(modelData);
        expect(JSON.parse(schemaFileContent)).to.deep.equal(schemaData);
    });

    test("should log warning when no output entries are found", async () => {
        context = createPipelineContext();

        await serializationStrategy.execute(context);

        expect(context.data.size).to.equal(0);
    });

    test("should create directories if they do not exist", async () => {
        context = createPipelineContext();

        const NEW_MODEL_ID = "testConfig.models.newExample";
        const modelData = { $id: NEW_MODEL_ID, name: "New Test Model", version: 2 };

        ContextUtils.setPhaseData(context, "output", "models", NEW_MODEL_ID, JSON.stringify(modelData));

        const absDirPath = path.dirname(fsAdapter.buildAbsPathForId(testDir, NEW_MODEL_ID));

        // Ensure directory doesn't exist before test
        await fs.rm(absDirPath, { recursive: true, force: true });

        await serializationStrategy.execute(context);

        const dirExists = await fsAdapter.isExists(absDirPath);
        expect(dirExists).to.be.true;
    });

    test("should handle serialization errors gracefully", async () => {
        context = createPipelineContext();

        const BROKEN_MODEL_ID = "testConfig.models.broken";
        const cyclicData: any = { $id: BROKEN_MODEL_ID };
        cyclicData.circular = cyclicData; // Creates a circular reference

        ContextUtils.setPhaseData(context, "output", "models", BROKEN_MODEL_ID, cyclicData);

        let caughtError = null;
        try {
            await serializationStrategy.execute(context);
        } catch (err) {
            caughtError = err;
        }

        expect(caughtError).to.be.an("error");
    });
});
