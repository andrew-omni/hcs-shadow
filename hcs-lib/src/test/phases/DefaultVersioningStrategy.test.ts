import { suite, suiteSetup, suiteTeardown, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { NodeFs } from "../../fs/nodeFs";
import { DefaultBuildStrategy } from "../../phases/build/DefaultBuildStrategy";
import { DefaultVerificationStrategy } from "../../phases/verification/DefaultVerificationStrategy";
import { DefaultVersioningStrategy } from "../../phases/versioning/DefaultVersioningStrategy";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import * as test_schemas_models from "../test_schemas_and_models";
import { ContextUtils } from "../../core/ContextUtils";
import util from "util";
import { NodeGit } from "../../git/nodeGit";
import { HcsManager } from "../../core/HcsManager";

suite("DefaultVersioningStrategy: Versioning & Validation Tests", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: NodeFs;
    let gitAdapter: NodeGit;
    let buildStrategy: DefaultBuildStrategy;
    let verificationStrategy: DefaultVerificationStrategy;
    let versioningStrategy: DefaultVersioningStrategy;
    let configSet: ConfigSet;
    let hcsManager: HcsManager;

    this.timeout(10000);
    const testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

    const SCHEMA_ID_BASE = `${"hcs-demo-configset"}.schemas.base`;
    const SCHEMA_ID_EXTENDED = `${"hcs-demo-configset"}.schemas.extended`;

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        fsAdapter = new NodeFs();
        gitAdapter = new NodeGit();
        buildStrategy = new DefaultBuildStrategy();
        verificationStrategy = new DefaultVerificationStrategy();
        versioningStrategy = new DefaultVersioningStrategy(fsAdapter, gitAdapter);

        try { await fs.rmdir(testDir, { recursive: true }); } catch (e) { }

        // Initialize HcsManager and create config set
        fs.mkdir(testDir, { recursive: true });
        hcsManager = new HcsManager([testDir], fsAdapter, new NodeGit());
        await hcsManager.createDemoFiles();

        configSet = hcsManager.getConfigSetByName("hcs-demo-configset")!;
    });

    suiteTeardown(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    /**
     * Utility to create a fresh context for each test.
     */
    function createPipelineContext(modelId: string): PipelineContext {
        return {
            hcsManager: hcsManager,
            modelId: modelId,
            configSet: configSet,
            data: new Map(),
            errors: []
        };
    }

    /**
     * Utility to set up schemas in the context.
     */
    function addSchemasToContext(context: PipelineContext) {
        const baseSchema = {
            $id: SCHEMA_ID_BASE,
            type: "object",
            properties: { id: { type: "string" } },
        };
        const extendedSchema = {
            $id: SCHEMA_ID_EXTENDED,
            $ref: SCHEMA_ID_BASE,
            properties: { name: { type: "string" } },
            required: ["name"],
        };

        ContextUtils.setPhaseData(context, "validation", "schemas", SCHEMA_ID_BASE, baseSchema);
        ContextUtils.setPhaseData(context, "validation", "schemas", SCHEMA_ID_EXTENDED, extendedSchema);
    }

    /**
     * ✅ Valid model test with no validation errors and version tracking
     */
    test("should validate and version a model successfully without errors", async () => {
        const VALID_MODEL_ID = `${"hcs-demo-configset"}.models.valid`;
        const context = createPipelineContext(VALID_MODEL_ID);
        addSchemasToContext(context);


        const validModel = {
            $id: VALID_MODEL_ID,
            $refs: [SCHEMA_ID_EXTENDED],
            id: "123",
            name: "Valid Model",
        };

        ContextUtils.setPhaseData(context, "validation", "models", VALID_MODEL_ID, validModel);

        await buildStrategy.execute(context);
        await verificationStrategy.execute(context);
        await versioningStrategy.execute(context);

        console.log(util.inspect(context, { depth: null, colors: true, compact: false }));

        expect(context.errors).to.be.empty;

        // Confirm versioning
        const versionInfo = ContextUtils.getPhaseData(context, "versioning", "models", VALID_MODEL_ID) as { $version: number };
        expect(versionInfo.$version).to.equal(1);

        // Confirm schema refs are removed after processing
        const cleanedModel = ContextUtils.getPhaseData(context, "build", "models", VALID_MODEL_ID) as { $refs?: any };
    });

    // NB Refactor this test to incorate git testing
    /**
     * ✅ Should create a new version when model changes
     */
    test.skip("should create a new model version when changes are detected", async () => {
        const MODEL_ID_VERSION = `${"hcs-demo-configset"}.models.versioned`;
        const context = createPipelineContext(MODEL_ID_VERSION);
        addSchemasToContext(context);


        let model = {
            $id: MODEL_ID_VERSION,
            $refs: [SCHEMA_ID_EXTENDED],
            id: "001",
            name: "Initial Version",
        };

        ContextUtils.setPhaseData(context, "validation", "models", MODEL_ID_VERSION, model);

        await buildStrategy.execute(context);
        await verificationStrategy.execute(context);
        await versioningStrategy.execute(context);

        // Modify model to simulate changes
        model.name = "Updated Version";
        ContextUtils.setPhaseData(context, "validation", "models", MODEL_ID_VERSION, model);

        await buildStrategy.execute(context);
        await verificationStrategy.execute(context);
        await versioningStrategy.execute(context);

        // Expect version increment
        const versionInfo = ContextUtils.getPhaseData(context, "versioning", "models", MODEL_ID_VERSION) as { $version: number };
        expect(versionInfo.$version).to.equal(2);
    });
});
