import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { HcsManager } from "../../core/HcsManager";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet } from "../../core/ConfigSet";
import { NodeGit } from "../../git/nodeGit";
import { createDemoFiles, DEMO_CONFIGSET_NAME, expectedExtendedInstance, expectedBaseInstance, baseModel as expectedBaseModel } from "../../../src/core/demoSetCreator";
import { promisify } from "util";
import { exec } from "child_process";
import util from "util";
import { Log } from "../../logger";

const execAsync = promisify(exec);

suite("HcsManager: Demo ConfigSet Git Tracking Test", function () {
  let chai: any;
  let expect: any;
  let hcsManager: HcsManager;
  let fsAdapter: NodeFs;
  let gitAdapter: NodeGit;
  let testDir: string;

  this.timeout(30000);
  testDir = path.join(__dirname, DEMO_CONFIGSET_NAME);

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;
    fsAdapter = new NodeFs();
    gitAdapter = new NodeGit();
  });

  setup(async () => {
    await teardownTestDirectory();
    await fs.mkdir(testDir, { recursive: true });

    // Initialize HcsManager and create config set
    hcsManager = new HcsManager([__dirname], fsAdapter, gitAdapter);
    await hcsManager.createDemoFiles();

    // Run pipeline
    const pipelineResults = await hcsManager.runPipelineForAll();
    expect(pipelineResults.hasErrors).to.be.false;

    // Initialize Git and commit the initial config set
    await execAsync("git init", { cwd: testDir });
    await execAsync("git add .", { cwd: testDir });
    await execAsync('git commit -m "Initial commit of demo config set"', { cwd: testDir });
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

  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ✅ Modifies the base model and verifies the versioned files.
   */
  test("should detect changes and version new model and instance files", async () => {
    Log.setLevel('silly')
    const baseModelPath = path.join(testDir, "models", "base-model.json");
    const modifiedBaseModel = {
      ...expectedBaseModel,
      some_prop: "Updated value in base-model",
    };

    // Modify base-model.json
    await fs.writeFile(baseModelPath, JSON.stringify(modifiedBaseModel, null, 2));

    // Ensure Git detects the change
    const gitStatusBefore = await execAsync("git status --porcelain", { cwd: testDir });
    expect(gitStatusBefore.stdout).to.include("models/base-model.json");

    // Run pipeline
    const pipelineResults = await hcsManager.runPipelineForAll();
    expect(pipelineResults.hasErrors).to.be.false;

    // Expected new versioned files
    const expectedFiles = [
      "models/base-model/base-model_2.json",

      "instances/base-model/base-model_2.json",
      "instances/extended-model/extended-model_2.json",
    ];

    console.log(util.inspect(pipelineResults, { depth: null, colors: true, compact: false }));

    for (const file of expectedFiles) {
      const filePath = path.join(testDir, file);
      expect(await fileExists(filePath), `Expected file missing: ${filePath}`).to.be.true;
    }

    // Check some of the file contents
    // Confirm base-model creates a new version w/ updated content
    const baseModelContent = JSON.parse(await fs.readFile(path.join(testDir, "models", "base-model/base-model_2.json"), "utf-8"));
    expect(baseModelContent).to.deep.equal({
      ...modifiedBaseModel,
      $id: "hcs-demo-configset.models.base-model.2", // New versioned ID
      $version: 2,
      some_prop: "Updated value in base-model"
    });

    // Confirm instances/extended-model is created correctly
    const extendedInstanceContent = JSON.parse(await fs.readFile(path.join(testDir, "instances", "extended-model.json"), "utf-8"));
    expect(extendedInstanceContent).to.deep.equal({
      ...expectedExtendedInstance,
      $id: "hcs-demo-configset.instances.extended-model", // New versioned ID
      $version: 2,
      some_prop: "Updated value in base-model"
    });

    // Verify Git sees the modified files
    const gitStatusAfter = await execAsync("git status --porcelain", { cwd: testDir });
    expect(gitStatusAfter.stdout).to.include("instances/extended-model.json");

    // Commit the new changes
    await execAsync("git add .", { cwd: testDir });
    await execAsync('git commit -m "Updated base-model and regenerated dependent files"', { cwd: testDir });

    // Verify Git sees a clean state
    const gitStatusFinal = await execAsync("git status --porcelain", { cwd: testDir });
    expect(gitStatusFinal.stdout).to.be.empty;
  });
});
