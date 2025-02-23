import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet, createConfigSet } from "../../configset/configsetManager";
import { ResourceManager } from "../../configset/resourceManager";
import * as path from "path";
import * as fs from "fs/promises";

suite("ConfigSet: ResourceManager Test Suite", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: FsAdapter;
    let configSet: ConfigSet;
    let resourceManager: ResourceManager;
    this.timeout(10000);
    const testDir = path.join(__dirname, "config_test");

    const modelFile = "models/foo.json";
    const schemaFile = "schemas/bar.json";
    const instanceFile = "instances/baz.json";

    const modelData = { $id: "config_test.models.model-foo", $version: 1, type: "object" };
    const schemaData = { $id: "config_test.schemas.schema-bar", $version: 1, type: "string" };
    const instanceData = { $id: "config_test.instances.instance-baz", $version: 1, value: 42 };

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
        resourceManager = new ResourceManager(configSet, fsAdapter);

        await createTestFiles();
        await resourceManager.loadAll();
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

    async function createTestFiles() {
        await fsAdapter.writeFile(path.join(testDir, modelFile), JSON.stringify(modelData, null, 2));
        await fsAdapter.writeFile(path.join(testDir, schemaFile), JSON.stringify(schemaData, null, 2));
        await fsAdapter.writeFile(path.join(testDir, instanceFile), JSON.stringify(instanceData, null, 2));
    }

    test("should load all models, schemas, and instances", async () => {
        expect(resourceManager.getResourceById("config_test.models.model-foo")).to.deep.equal(modelData);
        expect(resourceManager.getResourceById("config_test.schemas.schema-bar")).to.deep.equal(schemaData);
        expect(resourceManager.getResourceById("config_test.instances.instance-baz")).to.deep.equal(instanceData);
    });

    test("should retrieve resources by $id", async () => {
        const model = resourceManager.getResourceById("config_test.models.model-foo");
        const schema = resourceManager.getResourceById("config_test.schemas.schema-bar");
        const instance = resourceManager.getResourceById("config_test.instances.instance-baz");

        expect(model).to.deep.equal(modelData);
        expect(schema).to.deep.equal(schemaData);
        expect(instance).to.deep.equal(instanceData);
    });

    test("should retrieve resources by $ref", async () => {
        const model = resourceManager.getResourceByRef("../models/foo.json");
        const schema = resourceManager.getResourceByRef("../schemas/bar.json");
        const instance = resourceManager.getResourceByRef("../instances/baz.json");

        expect(model).to.deep.equal(modelData);
        expect(schema).to.deep.equal(schemaData);
        expect(instance).to.deep.equal(instanceData);
    });

    test("should return null for missing $id", async () => {
        const missingResource = resourceManager.getResourceById("nonexistent-id");
        expect(missingResource).to.be.null;
    });

    test("should return null for missing $ref", async () => {
        const missingRef = resourceManager.getResourceByRef("../models/missing.json");
        expect(missingRef).to.be.null;
    });

    test("should clear and reload resources correctly", async () => {
        await resourceManager.loadAll(); // Reload to ensure cache clears correctly

        expect(resourceManager.getResourceById("config_test.models.model-foo")).to.deep.equal(modelData);
        expect(resourceManager.getResourceById("config_test.schemas.schema-bar")).to.deep.equal(schemaData);
        expect(resourceManager.getResourceById("config_test.instances.instance-baz")).to.deep.equal(instanceData);
    });
});
