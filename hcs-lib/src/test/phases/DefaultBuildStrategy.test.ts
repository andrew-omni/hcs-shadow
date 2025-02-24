import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { NodeFs } from "../../fs/nodeFs";
import { DefaultBuildStrategy } from "../../phases/build/DefaultBuildStrategy";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import * as test_schemas_models from "../test_schemas_and_models";
import { ContextUtils } from "../../core/ContextUtils";
import { NodeGit } from "../../git/nodeGit";
import { HcsManager } from "../../core/HcsManager";
import { Log } from "../../logger";

suite("DefaultBuildStrategy: Test Suite", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: NodeFs;
    let configSet: ConfigSet;
    let buildStrategy: DefaultBuildStrategy;
    let context: PipelineContext;

    this.timeout(10000);
    const testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

    const SCHEMA_ID_BASE = `${test_schemas_models.CONFIGSET_NAME}.schemas.base`;
    const SCHEMA_ID_EXTENDED = `${test_schemas_models.CONFIGSET_NAME}.schemas.extended`;
    const MODEL_ID_BASE = `${test_schemas_models.CONFIGSET_NAME}.models.base`;
    const MODEL_ID_EXTENDED = `${test_schemas_models.CONFIGSET_NAME}.models.extended`;

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        fsAdapter = new NodeFs();
        buildStrategy = new DefaultBuildStrategy();

        await fs.mkdir(path.join(testDir, "schemas"), { recursive: true });
        await fs.mkdir(path.join(testDir, "models"), { recursive: true });

        configSet = await ConfigSet.loadConfigSet(testDir, fsAdapter);

        context = {
            hcsManager: new HcsManager([testDir], fsAdapter, new NodeGit()),
            modelId: "test-model",
            configSet,
            data: new Map(),
            errors: [],
        };

        preloadValidationContext();
    });

    suiteTeardown(async () => {
        await teardownTestDirectory();
    });

    async function teardownTestDirectory() {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            console.warn(`⚠️ Error cleaning up directory ${testDir}: ${error}`);
        }
    }
    const baseSchema = {
        $id: SCHEMA_ID_BASE,
        type: "object",
        properties: { id: { type: "string" } },
    };
    const extendedSchema = {
        $id: SCHEMA_ID_EXTENDED,
        $ref: SCHEMA_ID_BASE,
        properties: { name: { type: "string" } },
    };

    const baseModel = { $id: MODEL_ID_BASE, data: { id: "123" } };
    const extendedModel = {
        $id: MODEL_ID_EXTENDED,
        $refs: [MODEL_ID_BASE, SCHEMA_ID_EXTENDED],
        data: { name: "Test Model" },
    };
    function preloadValidationContext() {


        ContextUtils.setPhaseData(context, "validation", "schemas", SCHEMA_ID_BASE, baseSchema);
        ContextUtils.setPhaseData(context, "validation", "schemas", SCHEMA_ID_EXTENDED, extendedSchema);
        ContextUtils.setPhaseData(context, "validation", "models", MODEL_ID_BASE, baseModel);
        ContextUtils.setPhaseData(context, "validation", "models", MODEL_ID_EXTENDED, extendedModel);
    }

    test("should build all schemas successfully and resolve $ref", async () => {
        await buildStrategy.execute(context);

        const builtBaseSchema = ContextUtils.getPhaseData(context, "build", "schemas", SCHEMA_ID_BASE);
        const builtExtendedSchema = ContextUtils.getPhaseData(context, "build", "schemas", SCHEMA_ID_EXTENDED);

        expect(builtBaseSchema).to.deep.equal({
            $id: SCHEMA_ID_BASE,
            type: "object",
            properties: { id: { type: "string" } },
        });

        expect(builtExtendedSchema).to.deep.equal({
            $id: SCHEMA_ID_EXTENDED,
            type: "object",
            properties: {
                id: { type: "string" },
                name: { type: "string" },
            },
        });
    });

    test("should build all models successfully and resolve $ref", async () => {
        Log.setLevel('silly');

        await buildStrategy.execute(context);

        const builtBaseModel = ContextUtils.getPhaseData(context, "build", "models", MODEL_ID_BASE);
        const builtExtendedModel = ContextUtils.getPhaseData(context, "build", "models", MODEL_ID_EXTENDED);
        const builtInstanceModel = ContextUtils.getPhaseData(context, "build", "instances", MODEL_ID_EXTENDED.replace(".models.", ".instances."));

        expect(builtBaseModel).to.deep.equal({
            $id: MODEL_ID_BASE,
            data: { id: "123" },
        });

        expect(builtInstanceModel).to.deep.equal({
            $id: MODEL_ID_EXTENDED.replace(".models.", ".instances."),
            data: {
                id: "123", name: "Test Model"
            }
        });

        // Extended model shouldn't change when base model is built
        expect(builtExtendedModel).to.deep.equal(extendedModel);
    });
});
