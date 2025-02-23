import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { FsAdapter } from "../../fs/fsAdapter";
import { NodeFs } from "../../fs/nodeFs";
import { getConfigSets, setConfigSets, createConfigSet, ConfigSet } from "../../configset/configsetManager";

suite("ConfigSet: ConfigsetManager Test Suite", () => {
    let chai: any;
    let expect: any;
    let fsAdapter: FsAdapter;

    const testDir = `${__dirname}/config_test`;
    const requiredDirs = ["models", "schemas", "instances"];

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        console.log("📂 Setting up test directory...");
        fsAdapter = new NodeFs(); // Using NodeFs for real FS testing

        await fsAdapter.createDirectory(testDir);
    });

    setup(async () => {
        console.log("📝 Resetting test directory...");
        await teardownTestDirectory();
        await fsAdapter.createDirectory(testDir);
        setConfigSets([]); // Clear cached roots
    });

    suiteTeardown(async () => {
        console.log("🧹 Cleaning up test directory...");
        await teardownTestDirectory();
    });

    async function teardownTestDirectory() {
        const fs = await import("fs").then((mod) => mod.promises);
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            console.warn(`⚠️ Error during teardown: ${error}`);
        }
    }

    test("should create a config set with required directories", async () => {
        const configsetPath = `${testDir}/test1`;
        await createConfigSet(configsetPath, fsAdapter);

        for (const dir of requiredDirs) {
            const exists = await fsAdapter.fileExists(`${configsetPath}/${dir}`);
            expect(exists).to.be.true;
        }
    });

    test("should detect a single valid config root", async () => {
        const configsetPath = `${testDir}/test1`;
        await createConfigSet(configsetPath, fsAdapter);

        const roots = await getConfigSets([testDir], fsAdapter);
        expect(roots.map(configSet => configSet.path)).to.deep.equal([configsetPath]);
    });

    test("should detect multiple valid config roots", async () => {
        const configsetPath1 = `${testDir}/test1`;
        const configsetPath2 = `${testDir}/test2`;
        await createConfigSet(configsetPath1, fsAdapter);
        await createConfigSet(configsetPath2, fsAdapter);

        const roots = await getConfigSets([testDir], fsAdapter);
        expect(roots.map(configSet => configSet.path)).to.have.members([configsetPath1, configsetPath2]);
    });

    test("should return an empty list if no valid config roots exist", async () => {
        await teardownTestDirectory();

        const roots = await getConfigSets([testDir], fsAdapter);
        expect(roots).to.deep.equal([]);
    });

    test("should return cached results on second getConfigRoots call", async () => {
        const configsetPath = `${testDir}/test1`;
        await createConfigSet(configsetPath, fsAdapter);

        const firstCall = await getConfigSets([testDir], fsAdapter);
        const secondCall = await getConfigSets([testDir], fsAdapter);

        expect(secondCall.map(configSet => configSet.path)).to.deep.equal(firstCall.map(configSet => configSet.path));
    });

    test("should reset cache when setConfigRoots is called", async () => {
        const configsetPath = `${testDir}/test1`;
        await createConfigSet(configsetPath, fsAdapter);

        let rootsBefore = await getConfigSets([testDir], fsAdapter);
        setConfigSets([]); // Clear cache
        let rootsAfter = await getConfigSets([testDir], fsAdapter);

        expect(rootsBefore.map(configSet => configSet.path)).to.deep.equal(rootsAfter.map(configSet => configSet.path));
    });

    test("should ignore directories without required structure", async () => {
        await fsAdapter.createDirectory(`${testDir}/random_folder`);
        const roots = await getConfigSets([testDir], fsAdapter);

        expect(roots).to.deep.equal([]);
    });

    test("should add new configset to configRoots", async () => {
        const configsetPath = `${testDir}/test1`;
        await createConfigSet(configsetPath, fsAdapter);
        const roots = await getConfigSets([testDir], fsAdapter);

        expect(roots.map(configSet => configSet.path)).to.include(configsetPath);
    });

    test("should not duplicate configRoots if same configset is created twice", async () => {
        const configsetPath = `${testDir}/test1`;
        await createConfigSet(configsetPath, fsAdapter);
        await createConfigSet(configsetPath, fsAdapter);
        const roots = await getConfigSets([testDir], fsAdapter);

        expect(roots.map(configSet => configSet.path)).to.deep.equal([configsetPath]); // Ensure it's added only once
    });

    test("should correctly handle multiple configsets in the same test directory", async () => {
        const configsetPath1 = `${testDir}/test1`;
        const configsetPath2 = `${testDir}/test2`;
        const configsetPath3 = `${testDir}/test3`;
        await createConfigSet(configsetPath1, fsAdapter);
        await createConfigSet(configsetPath2, fsAdapter);
        await createConfigSet(configsetPath3, fsAdapter);

        const roots = await getConfigSets([testDir], fsAdapter);
        expect(roots.map(configSet => configSet.path)).to.have.members([configsetPath1, configsetPath2, configsetPath3]);
    });
});
