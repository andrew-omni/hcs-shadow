import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet, ConfigSetManager, createConfigSet } from "../../configset/configsetManager";
import { SchemaManager } from "../../configset/schemaManager";
import * as path from "path";
import * as fs from "fs/promises";

suite("ConfigSet: SchemaManager Test Suite", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: FsAdapter;
    let configSet: ConfigSet;
    let schemaManager: SchemaManager;
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
        schemaManager = hcsManager.getSchemaManager();
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

    test("should create a new schema JSON file", async () => {
        const schemaName = "testSchema";
        const schemaPath = path.join(testDir, "schemas", `${schemaName}.json`);

        await schemaManager.create(schemaName);
        const fileExists = await fsAdapter.fileExists(schemaPath);

        expect(fileExists).to.be.true;

        const fileContent = await fs.readFile(schemaPath, "utf-8");
        const json = JSON.parse(fileContent);

        expect(json).to.have.property("$id");
        expect(json).to.have.property("$version", 1);
    });
});
