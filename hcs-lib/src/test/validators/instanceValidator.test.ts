import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet, ConfigSetManager, createConfigSet } from "../../configset/configsetManager";
import { InstanceManager } from "../../configset/instanceManager";
import { ResourceManager } from "../../configset/resourceManager";
import { InstanceValidator } from "../../validators/instanceValidator";
import * as path from "path";
import * as fs from "fs/promises";

suite("Validators: InstanceValidator Test Suite", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: FsAdapter;
    let configSet: ConfigSet;
    let instanceManager: InstanceManager;
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
        instanceManager = hcsManager.getInstanceManager();
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

    test("should create a new instance JSON file", async () => {
        const instanceName = "testInstance";
        const instancePath = path.join(testDir, "instances", `${instanceName}.json`);

        await instanceManager.create(instanceName);
        const fileExists = await fsAdapter.fileExists(instancePath);

        expect(fileExists).to.be.true;

        const fileContent = await fs.readFile(instancePath, "utf-8");
        const json = JSON.parse(fileContent);

        expect(json).to.have.property("$id");
        expect(json).to.have.property("$version", 1);
    });

    test("should validate a correct instance", async () => {
        const instanceName = "validInstance";
        await instanceManager.create(instanceName);
        
        const resourceManager = new ResourceManager(configSet, fsAdapter);
        await resourceManager.loadAll();

        const instanceValidator = new InstanceValidator(resourceManager);

        const instance = resourceManager.getResourceById(`config_test.instances.${instanceName}`);

        const errors = instanceValidator.validate(instance, `${testDir}/instances/${instanceName}.json`);
        expect(errors).to.be.empty;
    });

    test("should return validation error for invalid instance", async () => {
        const instanceName = "invalidInstance";
        const instancePath = path.join(testDir, "instances", `${instanceName}.json`);

        const invalidInstance = {
            "$id": `${instanceName}.json`,
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "invalidType" // Invalid type
        };

        await fs.writeFile(instancePath, JSON.stringify(invalidInstance, null, 2));

        const resourceManager = new ResourceManager(configSet, fsAdapter);
        await resourceManager.loadAll();

        const instanceValidator = new InstanceValidator(resourceManager);
        
        const instance = resourceManager.getResourceById(`${instanceName}.json`);

        const errors = instanceValidator.validate(instance, instancePath);
        expect(errors).to.not.be.empty;
        expect(errors[0].message).to.include("schema is invalid: data/type");
    });
});
