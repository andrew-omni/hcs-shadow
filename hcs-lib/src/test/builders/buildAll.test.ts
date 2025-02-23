import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet, ConfigSetManager, createConfigSet } from "../../configset/configsetManager";
import { ResourceManager } from "../../configset/resourceManager";
import * as path from "path";
import * as fs from "fs/promises";
import { buildAll, getLatestVersionOnDisk } from "../../builders/buildAll";
import { GitAdapter } from "../../git/gitAdapter";
import { NodeGit } from "../../git/nodeGit";

suite("Builders: BuildAll Test Suite", function () {
    let chai: any;
    let expect: any;
    let fsAdapter: FsAdapter;
    let gitAdapter: GitAdapter;
    let configSet: ConfigSet;
    let configSetManager: ConfigSetManager;
    let resourceManager: ResourceManager;
    this.timeout(10000);
    const testDir = path.join(__dirname, "config_test");

    const validInstance = {
        "$id": "config_test.instances.validInstance",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$version": 1,
        "type": "object",
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
        "$version": 1,
        "type": "invalidType" // Invalid type specification
    };

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        fsAdapter = new NodeFs();
        gitAdapter = new NodeGit();
        await fsAdapter.createDirectory(testDir);
    });

    setup(async () => {
        await teardownTestDirectory();
        await fsAdapter.createDirectory(testDir);
        await createConfigSet(testDir, fsAdapter);
        configSet = await ConfigSet.loadConfigSet(testDir, fsAdapter);
        configSetManager = new ConfigSetManager(configSet, fsAdapter, gitAdapter);
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

    /**
     * Validates that buildAll succeeds without errors.
     */
    test("should successfully build when schema is valid", async () => {
        await writeConfigFile("schemas", "validSchema.json", validSchema);
        await configSetManager.reloadResources();

        try {
            await buildAll(configSetManager, false);
        } catch (error) {
            throw new Error(`Expected buildAll to succeed, but it failed with: ${error}`);
        }
    });

    /**
     * Validates that buildAll fails when schema validation fails.
     */
    test("should fail to build when schema validation fails", async () => {
        await writeConfigFile("schemas", "invalidSchema.json", invalidSchema);
        await configSetManager.reloadResources();

        try {
            await buildAll(configSetManager, false);
            throw new Error("Expected buildAll to fail, but it succeeded.");
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            if (error instanceof Error) {
                expect(error.message).to.include("validation errors");
            } else {
                throw error;
            }
        }
    });

    test("should return 0 when the version directory does not exist", async () => {
        const nonExistentDir = path.join(testDir, "schemas", "non_existent");
        const version = await getLatestVersionOnDisk(nonExistentDir, fsAdapter);
        expect(version).to.equal(0);
    });

    test("should return 0 when the version directory is empty", async () => {
        const versionDir = path.join(testDir, "schemas", "empty_schema");
        await fsAdapter.createDirectory(versionDir);
        const version = await getLatestVersionOnDisk(versionDir, fsAdapter);
        expect(version).to.equal(0);
    });

    test("should return the highest version number for sequential files", async () => {
        const versionDir = path.join(testDir, "schemas", "test_schema");
        await fsAdapter.createDirectory(versionDir);

        await fsAdapter.writeFile(path.join(versionDir, "test_schema_1.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "test_schema_2.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "test_schema_3.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "test_schema_4.json"), "{}");

        const version = await getLatestVersionOnDisk(versionDir, fsAdapter);
        expect(version).to.equal(4);
    });

    test("should ignore non-versioned files in the directory", async () => {
        const versionDir = path.join(testDir, "schemas", "mixed_files");
        await fsAdapter.createDirectory(versionDir);

        await fsAdapter.writeFile(path.join(versionDir, "mixed_files_1.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "mixed_files_2.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "random_file.json"), "{}"); // Should be ignored
        await fsAdapter.writeFile(path.join(versionDir, "mixed_files_3.json"), "{}");

        const version = await getLatestVersionOnDisk(versionDir, fsAdapter);
        expect(version).to.equal(3);
    });

    test("should return the highest version number even with gaps in versions", async () => {
        const versionDir = path.join(testDir, "schemas", "gapped_versions");
        await fsAdapter.createDirectory(versionDir);

        await fsAdapter.writeFile(path.join(versionDir, "gapped_versions_1.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "gapped_versions_3.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "gapped_versions_5.json"), "{}");

        const version = await getLatestVersionOnDisk(versionDir, fsAdapter);
        expect(version).to.equal(5);
    });

    test("should handle non-numeric suffixes correctly and only consider numbered versions", async () => {
        const versionDir = path.join(testDir, "schemas", "invalid_versions");
        await fsAdapter.createDirectory(versionDir);

        await fsAdapter.writeFile(path.join(versionDir, "invalid_versions_1.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "invalid_versions_2.json"), "{}");
        await fsAdapter.writeFile(path.join(versionDir, "invalid_versions_final.json"), "{}"); // Should be ignored
        await fsAdapter.writeFile(path.join(versionDir, "invalid_versions_4.json"), "{}");

        const version = await getLatestVersionOnDisk(versionDir, fsAdapter);
        expect(version).to.equal(4);
    });

    test("should return 0 if only an unversioned base file exists", async () => {
        const versionDir = path.join(testDir, "schemas", "base_only");
        await fsAdapter.createDirectory(versionDir);

        await fsAdapter.writeFile(path.join(testDir, "base_only.json"), "{}"); // This is NOT a versioned file

        const version = await getLatestVersionOnDisk(versionDir, fsAdapter);
        expect(version).to.equal(0); // No versioned files exist
    });


});
