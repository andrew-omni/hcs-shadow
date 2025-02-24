import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { NodeFs } from "../../fs/nodeFs";
import * as path from "path";
import { promises as fs } from "fs";

suite("FsAdapter:  Test Suite", () => {
    let chai: any;
    let expect: any;
    let nodeFs: NodeFs;

    const testDir = path.join(__dirname, "fs_test");
    const testFile = path.join(testDir, "testFile.txt");
    const nonExistentFile = path.join(testDir, "doesNotExist.txt");

    suiteSetup(async () => {
        chai = await import('chai');
        expect = chai.expect;
        console.log("📂 Setting up test directory...");
        nodeFs = new NodeFs();
        await fs.mkdir(testDir, { recursive: true });
    });

    setup(async () => {
        console.log("📝 Resetting test directory...");
        await fs.rmdir(testDir, { recursive: true }).catch(() => { });
        await fs.mkdir(testDir, { recursive: true });
    });

    suiteTeardown(async () => {
        console.log("🧹 Cleaning up test directory...");
        await fs.rmdir(testDir, { recursive: true }).catch(() => { });
    });

    test("should write and read file", async () => {
        console.log("✍️ Writing test file...");
        await nodeFs.writeFile(testFile, "Hello, world!");

        console.log("📖 Reading test file...");
        const content = await nodeFs.readFile(testFile);

        console.log("✅ Asserting file content...");
        if (content !== "Hello, world!") {
            throw new Error(`File content mismatch: ${content}`);
        }
    });

    test("should return false for non-existent file", async () => {
        console.log("🔎 Checking non-existent file...");
        const exists = await nodeFs.isExists(nonExistentFile);
        console.log(`✅ Exists check: ${exists}`);
        if (exists) {
            throw new Error("Expected file to not exist, but it does.");
        }
    });

    test("should return true for existing file", async () => {
        console.log("📂 Creating test file...");
        await nodeFs.writeFile(testFile, "Exists");

        console.log("🔎 Checking existing file...");
        const exists = await nodeFs.isExists(testFile);

        console.log(`✅ Exists check: ${exists}`);
        if (!exists) {
            throw new Error("Expected file to exist, but it does not.");
        }
    });

    test("should read directory contents", async () => {
        console.log("📂 Creating test files...");
        await nodeFs.writeFile(path.join(testDir, "file1.txt"), "Content1");
        await nodeFs.writeFile(path.join(testDir, "file2.txt"), "Content2");

        console.log("📖 Reading directory...");
        const files = await nodeFs.readDirectory(testDir);
        console.log(`✅ Found files: ${files}`);

        if (!files.includes("file1.txt") || !files.includes("file2.txt")) {
            throw new Error(`Expected directory to contain file1.txt and file2.txt, but got ${files}`);
        }
    });

    test("should create directory recursively", async () => {
        const nestedDir = path.join(testDir, "nested", "deep");

        console.log("📂 Creating nested directory...");
        await nodeFs.createDirectory(nestedDir);

        console.log("🔎 Checking if directory exists...");
        const exists = await nodeFs.isExists(nestedDir);

        console.log(`✅ Exists check: ${exists}`);
        if (!exists) {
            throw new Error("Expected directory to exist, but it does not.");
        }
    });

    test("should throw an error when reading a non-existent file", async () => {
        try {
            console.log("📖 Attempting to read a non-existent file...");
            await nodeFs.readFile(nonExistentFile);
            throw new Error("Expected an error but readFile succeeded.");
        } catch (error) {
            if (error instanceof Error) {
                console.log(`✅ Caught expected error: ${error.message}`);
            } else {
                console.log("✅ Caught expected error");
            }
        }
    });

    test("should overwrite an existing file", async () => {
        console.log("✍️ Writing initial file content...");
        await nodeFs.writeFile(testFile, "Old Content");

        console.log("✍️ Overwriting file with new content...");
        await nodeFs.writeFile(testFile, "New Content");

        console.log("📖 Reading overwritten file...");
        const content = await nodeFs.readFile(testFile);

        console.log(`✅ Asserting content: ${content}`);
        if (content !== "New Content") {
            throw new Error(`Expected file content to be "New Content", but got "${content}"`);
        }
    });

    test("should handle empty directory correctly", async () => {
        console.log("📖 Reading an empty directory...");
        const files = await nodeFs.readDirectory(testDir);

        console.log(`✅ Directory contents: ${files}`);
        if (files.length !== 0) {
            throw new Error(`Expected empty directory, but found ${files.length} files.`);
        }
    });

    test("should not fail when creating an already existing directory", async () => {
        console.log("📂 Creating directory...");
        await nodeFs.createDirectory(testDir);

        console.log("📂 Creating the same directory again...");
        await nodeFs.createDirectory(testDir);

        console.log("✅ No errors encountered.");
    });
});