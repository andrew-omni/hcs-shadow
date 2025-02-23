import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet, ConfigSetManager, createConfigSet } from "../../configset/configsetManager";
import { ModelManager } from "../../configset/modelManager";
import { ResourceManager } from "../../configset/resourceManager";
import { ModelValidator } from "../../validators/modelValidator";
import * as path from "path";
import * as fs from "fs/promises";

suite("Validators: ModelValidator Test Suite", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: FsAdapter;
    let configSet: ConfigSet;
    let modelManager: ModelManager;
    this.timeout(10000);
    const testDir = path.join(__dirname, "config_test");

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        fsAdapter = new NodeFs();
        await fsAdapter.createDirectory(testDir);
    });

    setup(async () => {
        await teardownTestDirectory();
        await fsAdapter.createDirectory(testDir);
        await createConfigSet(testDir, fsAdapter);
        configSet = await ConfigSet.loadConfigSet(testDir, fsAdapter);
        const hcsManager = new ConfigSetManager(configSet, fsAdapter);
        modelManager = hcsManager.getModelManager();
    });

    suiteTeardown(async () => {
        await teardownTestDirectory();
    });

    async function teardownTestDirectory() {
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            console.warn(`⚠️ Error during teardown: ${error}`);
        }
    }

    test("should create a new model JSON file", async () => {
        const modelName = "testModel";
        const modelPath = path.join(testDir, "models", `${modelName}.json`);

        await modelManager.create(modelName);
        const fileExists = await fsAdapter.fileExists(modelPath);

        expect(fileExists).to.be.true;

        const fileContent = await fs.readFile(modelPath, "utf-8");
        const json = JSON.parse(fileContent);

        expect(json).to.have.property("$id");
        expect(json).to.have.property("$version", 1);
    });

    test("should validate a correct model", async () => {
        const modelName = "validModel";
        await modelManager.create(modelName);
        
        const resourceManager = new ResourceManager(configSet, fsAdapter);
        await resourceManager.loadAll();

        const modelValidator = new ModelValidator(resourceManager);

        const model = resourceManager.getResourceById(`config_test.models.${modelName}`);

        const errors = modelValidator.validate(model, `${testDir}/models/${modelName}.json`);
        expect(errors).to.be.empty;
    });

    test("should return validation error for invalid model", async () => {
        const modelName = "invalidModel";
        const modelPath = path.join(testDir, "models", `${modelName}.json`);

        const invalidModel = {
            "$id": `${modelName}.json`,
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "invalidType" // Invalid type
        };

        await fs.writeFile(modelPath, JSON.stringify(invalidModel, null, 2));

        const resourceManager = new ResourceManager(configSet, fsAdapter);
        await resourceManager.loadAll();

        const modelValidator = new ModelValidator(resourceManager);
        
        const model = resourceManager.getResourceById(`${modelName}.json`);

        const errors = modelValidator.validate(model, modelPath);
        expect(errors).to.not.be.empty;
        expect(errors[0].message).to.include("schema is invalid: data/type");
    });
});
