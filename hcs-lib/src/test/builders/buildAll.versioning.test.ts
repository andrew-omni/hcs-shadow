import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet, ConfigSetManager, createConfigSet } from "../../configset/configsetManager";
import { ResourceManager } from "../../configset/resourceManager";
import * as path from "path";
import * as fs from "fs/promises";
import { buildAll, getLatestVersionOnDisk } from "../../builders/buildAll";
import { exec as execCallback } from "child_process";
import { promisify } from "util";

const execAsync = promisify(execCallback);

suite("Builders: BuildAll Versioning Test Suite", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: FsAdapter;
    let configSet: ConfigSet;
    let configSetManager: ConfigSetManager;
    let resourceManager: ResourceManager;
    this.timeout(10000);
    const testDir = path.join(__dirname, "config_test");

    const validSchema = {
        "$id": "config_test.schemas.validSchema",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$version": 1,
        "type": "object",
        "properties": {
            "schemaName": { "type": "string" }
        }
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

        await execAsync("rm -rf .git", { cwd: testDir });
        await execAsync("git init", { cwd: testDir });
        
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

    test("should create initial versioned files and commit to git", async () => {
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();

        await buildAll(configSetManager, false);

        const versionDir = path.join(testDir, "schemas", "validSchema");
        const latestVersion = await getLatestVersionOnDisk(versionDir, fsAdapter);

        expect(latestVersion).to.equal(1);

        await execAsync(`git add .`, { cwd: testDir });
        await execAsync(`git commit -m "Initial version commit"`, { cwd: testDir });

        const versionedFileExists = await fsAdapter.fileExists(path.join(versionDir, "validSchema_1.json"));
        expect(versionedFileExists).to.be.true;

        const unversionedFileExists = await fsAdapter.fileExists(path.join(testDir, "schemas", "validSchema.json"));
        expect(unversionedFileExists).to.be.true;
    });

    test("should create a new version when schema changes and commit to git", async () => {
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();
        await buildAll(configSetManager, false);

        await execAsync(`git add .`, { cwd: testDir });
        await execAsync(`git commit -m "Initial commit for schema"`, { cwd: testDir });

        // Modify schema
        validSchema.properties.schemaName.type = "number";
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();

        await buildAll(configSetManager, false);

        const versionDir = path.join(testDir, "schemas", "validSchema");
        const latestVersion = await getLatestVersionOnDisk(versionDir, fsAdapter);

        expect(latestVersion).to.equal(2);

        await execAsync(`git add .`, { cwd: testDir });
        await execAsync(`git commit -m "Added schema version 2"`, { cwd: testDir });

        const versionedFileExists = await fsAdapter.fileExists(path.join(versionDir, "validSchema_2.json"));
        expect(versionedFileExists).to.be.true;
    });

    test("should overwrite existing version if changed and already tracked by git", async () => {
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();
        await buildAll(configSetManager, false);
        
        let versionDir = path.join(testDir, "schemas", "validSchema");
        let latestVersion = await getLatestVersionOnDisk(versionDir, fsAdapter);
        expect(latestVersion).to.equal(1);
        
        await execAsync(`git add .`, { cwd: testDir });
        await execAsync(`git commit -m "Initial commit for schema"`, { cwd: testDir });

        // Change the file and build, but don't commit
        validSchema.properties.schemaName.type = "boolean";
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        
        await configSetManager.reloadResources();
        await buildAll(configSetManager, false);
        
        latestVersion = await getLatestVersionOnDisk(versionDir, fsAdapter);
        expect(latestVersion).to.equal(2);
        
        const versionedFilePath = path.join(versionDir, "validSchema_2.json");
        const fileContent = await fsAdapter.readFile(versionedFilePath);
        const parsedContent = JSON.parse(fileContent);
        expect(parsedContent.properties.schemaName.type).to.equal("boolean");
    });

    test("should fail build if failOnFileChanges is true and changes detected", async () => {
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();
        await buildAll(configSetManager, false);

        await execAsync(`git add .`, { cwd: testDir });
        await execAsync(`git commit -m "Initial commit"`, { cwd: testDir });

        validSchema.properties.schemaName.type = "number";
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();

        let errorCaught = false;
        try {
            await buildAll(configSetManager, true); // failOnFileChanges = true
        } catch (error) {
            errorCaught = true;
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.include("has changed after build");
        }

        expect(errorCaught).to.be.true;
    });

    test("should not create a new version when schema remains unchanged", async () => {
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();
        await buildAll(configSetManager, false);

        await execAsync(`git add .`, { cwd: testDir });
        await execAsync(`git commit -m "Initial commit"`, { cwd: testDir });

        await buildAll(configSetManager, false);

        const versionDir = path.join(testDir, "schemas", "validSchema");
        const latestVersion = await getLatestVersionOnDisk(versionDir, fsAdapter);

        expect(latestVersion).to.equal(1);
    });
});
