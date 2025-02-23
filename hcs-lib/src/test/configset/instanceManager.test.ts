import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet, ConfigSetManager, createConfigSet } from "../../configset/configsetManager";
import { InstanceManager } from "../../configset/instanceManager";
import * as path from "path";
import * as fs from "fs/promises";

suite("ConfigSet: InstanceManager Test Suite", function () {
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
});
