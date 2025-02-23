import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet, ConfigSetManager, createConfigSet } from "../../configset/configsetManager";
import { ResourceManager } from "../../configset/resourceManager";
import { validateAll } from "../../validators/validateAll";
import * as path from "path";
import * as fs from "fs/promises";

suite("Validators: ValidateAll Test Suite", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: FsAdapter;
    let configSet: ConfigSet;
    let configSetManager: ConfigSetManager;
    let resourceManager: ResourceManager;
    this.timeout(10000);
    const testDir = path.join(__dirname, "config_test");

    const validInstance = {
        "$id": "config_test.instances.validInstance",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "$version": 1,
        "properties": {
            "name": { "type": "string" }
        }
    };

    const validModel = {
        "$id": "config_test.models.validModel",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "$version": 1,
        "properties": {
            "modelName": { "type": "string" }
        }
    };

    const validSchema = {
        "$id": "config_test.schemas.validSchema",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "$version": 1,
        "properties": {
            "schemaName": { "type": "string" }
        }
    };

    // Invalid versions
    const invalidInstance = {
        "$id": "config_test.instances.invalidInstance",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "$version": 1,
        "properties": {
            "name": { "type": 123 } // Invalid type, should be a string
        }
    };

    const invalidModel = {
        "$id": "config_test.models.invalidModel",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "$version": 1,
        "properties": {
            "modelName": { "type": false } // Invalid type, should be a string
        }
    };

    const invalidSchema = {
        "$id": "config_test.schemas.invalidSchema",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "invalidType" // Invalid type specification
    };

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
        configSetManager = new ConfigSetManager(configSet, fsAdapter);
        resourceManager = new ResourceManager(configSet, fsAdapter);
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

    async function writeConfigFile(subDir: string, fileName: string, content: any) {
        const filePath = path.join(testDir, subDir, fileName);
        await fs.writeFile(filePath, JSON.stringify(content, null, 2));
    }

    // ✅ Valid cases
    test("should validate a valid instance file only", async () => {
        await writeConfigFile("instances", "validInstance.json", validInstance);
        await configSetManager.reloadResources();
        const result = await validateAll(configSetManager);
        expect(result.success).to.be.true;
        expect(result.errors).to.be.empty;
    });

    test("should validate a valid model file only", async () => {
        await writeConfigFile("models", "validModel.json", validModel);
        await configSetManager.reloadResources();
        const result = await validateAll(configSetManager);
        expect(result.success).to.be.true;
        expect(result.errors).to.be.empty;
    });

    test("should validate a valid schema file only", async () => {
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();
        const result = await validateAll(configSetManager);
        expect(result.success).to.be.true;
        expect(result.errors).to.be.empty;
    });

    // ❌ Failure cases
    test("should detect invalid instance file", async () => {
        await writeConfigFile("instances", "invalidInstance.json", invalidInstance);
        await configSetManager.reloadResources();
        const result = await validateAll(configSetManager);

        expect(result.success).to.be.false;
        expect(result.errors).to.have.property(`${testDir}/instances/invalidInstance.json`);
        expect(result.errors[`${testDir}/instances/invalidInstance.json`][0].message).to.include("invalid: data/properties/name/type");
    });

    test("should detect invalid model file", async () => {
        await writeConfigFile("models", "invalidModel.json", invalidModel);
        await configSetManager.reloadResources();
        const result = await validateAll(configSetManager);

        expect(result.success).to.be.false;
        expect(result.errors).to.have.property(`${testDir}/models/invalidModel.json`);
        expect(result.errors[`${testDir}/models/invalidModel.json`][0].message).to.include("invalid: data/properties/modelName/type");
    });

    test("should detect invalid schema file", async () => {
        await writeConfigFile("schemas", "invalidSchema.json", invalidSchema);
        await configSetManager.reloadResources();
        const result = await validateAll(configSetManager);

        expect(result.success).to.be.false;
        expect(result.errors).to.have.property(`${testDir}/schemas/invalidSchema.json`);
        expect(result.errors[`${testDir}/schemas/invalidSchema.json`][0].message).to.include("invalid: data/type");

    });

    test("should detect all failing schemas", async () => {
        await writeConfigFile("schemas", "invalidSchema1.json", invalidSchema);
        await writeConfigFile("schemas", "invalidSchema2.json", invalidSchema);
        await configSetManager.reloadResources();
        const result = await validateAll(configSetManager);

        expect(result.success).to.be.false;
        expect(Object.keys(result.errors)).to.have.length(2);
    });

    test("should validate one failing and one passing file in each directory", async () => {
        // ✅ Valid Files
        await writeConfigFile("instances", "validInstance.json", validInstance);
        await writeConfigFile("models", "validModel.json", validModel);
        await writeConfigFile("schemas", "validSchema.json", validSchema);

        // ❌ Invalid Files
        await writeConfigFile("instances", "invalidInstance.json", invalidInstance);
        await writeConfigFile("models", "invalidModel.json", invalidModel);
        await writeConfigFile("schemas", "invalidSchema.json", invalidSchema);

        await configSetManager.reloadResources();
        const result = await validateAll(configSetManager);

        expect(result.success).to.be.false;
        expect(Object.keys(result.errors)).to.have.length(3);

        expect(result.errors).to.have.property(`${testDir}/instances/invalidInstance.json`);
        expect(result.errors).to.have.property(`${testDir}/models/invalidModel.json`);
        expect(result.errors).to.have.property(`${testDir}/schemas/invalidSchema.json`);
    });
});
