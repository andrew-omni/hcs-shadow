import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { NodeGit } from "../../git/nodeGit";
import * as path from "path";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

suite("FsAdapter: Git Test Suite", () => {
    let chai: any;
    let expect: any;
    let nodeGit: NodeGit;
    const testDir = path.join(__dirname, "git_test");

    const trackedFilePath = path.join(testDir, "trackedFile.txt");
    const untrackedFilePath = path.join(testDir, "untrackedFile.txt");

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        nodeGit = new NodeGit();
    });

    setup(async () => {
        console.log("📝 Resetting test directory...");

        await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
        await fs.mkdir(testDir, { recursive: true });

        console.log("📂 Initializing new Git repository...");
        await execAsync("git init", { cwd: testDir });

        console.log("📝 Creating a tracked file...");
        await fs.writeFile(trackedFilePath, "This is a tracked file.");
        await execAsync("git add trackedFile.txt", { cwd: testDir });
        await execAsync('git commit -m "Initial commit for tracked file"', { cwd: testDir });

        console.log("✅ Tracked file committed to Git.");
    });

    suiteTeardown(async () => {
        console.log("🧹 Cleaning up test directory...");
        await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
    });

    test("should return true for a tracked file", async () => {
        const isTracked = await nodeGit.isFileTracked(trackedFilePath);
        expect(isTracked).to.be.true;
    });

    test("should return false for an untracked file", async () => {
        await fs.writeFile(untrackedFilePath, "This file is untracked.");
        const isTracked = await nodeGit.isFileTracked(untrackedFilePath);
        expect(isTracked).to.be.false;
    });

    test("should return false for a non-existent file", async () => {
        const nonExistentFile = path.join(testDir, "doesNotExist.txt");
        const isTracked = await nodeGit.isFileTracked(nonExistentFile);
        expect(isTracked).to.be.false;
    });

    test("should correctly detect modified tracked files", async () => {
        await fs.writeFile(trackedFilePath, "This tracked file has been modified.");
        const isModified = await nodeGit.isFileChangedFromGit(trackedFilePath);
        expect(isModified).to.be.true;
    });

    test("should return false for an unmodified tracked file", async () => {
        // Ensure file is reset before checking
        await execAsync('git checkout -- trackedFile.txt', { cwd: testDir });

        const isModified = await nodeGit.isFileChangedFromGit(trackedFilePath);
        expect(isModified).to.be.false;
    });

    test("should correctly detect staged changes", async () => {
        await fs.writeFile(trackedFilePath, "This tracked file is staged.");
        await execAsync("git add trackedFile.txt", { cwd: testDir });

        const isModified = await nodeGit.isFileChangedFromGit(trackedFilePath);
        expect(isModified).to.be.true;
    });

    test("should return false for committed changes", async () => {
        await fs.writeFile(trackedFilePath, "This tracked file has been modified again.");
        await execAsync("git add trackedFile.txt", { cwd: testDir });
        await execAsync('git commit -m "Updated tracked file"', { cwd: testDir });

        const isModified = await nodeGit.isFileChangedFromGit(trackedFilePath);
        expect(isModified).to.be.false;
    });

    test("should correctly detect untracked files as changed", async () => {
        await fs.writeFile(untrackedFilePath, "This file is untracked.");
        const isModified = await nodeGit.isFileChangedFromGit(untrackedFilePath);
        expect(isModified).to.be.true;
    });
});
