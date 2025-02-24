import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { HcsManager } from "../../core/HcsManager";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet } from "../../core/ConfigSet";
import { NodeGit } from "../../git/nodeGit";
import { createDemoFiles, DEMO_CONFIGSET_NAME, expectedExtendedInstance, expectedBaseInstance, baseModel as expectedBaseModel } from "../../core/demoSetCreator";

suite("HcsManager: Demo ConfigSet Creation Test", function () {
  let chai: any;
  let expect: any;
  let hcsManager: HcsManager;
  let fsAdapter: NodeFs;
  let gitAdapter: NodeGit;
  let testDir: string;

  this.timeout(20000);
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
   * ✅ Ensures that the demo config set is created with expected files.
   */
  test("should create the demo config set with all expected files", async () => {
    // Expected file paths
    const pipelineResults = await hcsManager.runPipelineForAll();
    const expectedFiles = [
      "schemas/base-schema.json",
      "schemas/base-schema/base-schema_1.json",
      "schemas/extended-schema.json",
      "schemas/extended-schema/extended-schema_1.json",

      "models/base-model.json",
      "models/base-model/base-model_1.json",
      "models/extended-model.json",
      "models/extended-model/extended-model_1.json",

      "instances/base-model.json",
      "instances/base-model/base-model_1.json",
      "instances/extended-model.json",
      "instances/extended-model/extended-model_1.json",
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(testDir, file);
      expect(await fileExists(filePath), `Expected file missing: ${filePath}`).to.be.true;
    }
  });

  /**
   * ✅ Runs the pipeline to ensure there are no errors.
   */
  test("should successfully run pipeline with no errors", async () => {
    const pipelineResults = await hcsManager.runPipelineForAll();
    expect(pipelineResults.hasErrors).to.be.false;
  });

  test("should generate the correct model base file structure", async () => {
    const pipelineResults = await hcsManager.runPipelineForAll();
    expect(pipelineResults.hasErrors).to.be.false;

    const modelFilePath = path.join(testDir, "models", "base-model.json");

    expect(await fileExists(modelFilePath)).to.be.true;

    // Validate file content matches expected instance output
    const modelContent = JSON.parse(await fs.readFile(modelFilePath, "utf-8"));
    expect(modelContent).to.deep.equal(expectedBaseModel);
  });

  test("should generate the correct instance base file structure", async () => {
    const pipelineResults = await hcsManager.runPipelineForAll();
    expect(pipelineResults.hasErrors).to.be.false;

    const instanceFilePath = path.join(testDir, "instances", "base-model.json");
    const instanceVersionedFilePath = path.join(testDir, "instances", "base-model", "base-model_1.json");

    expect(await fileExists(instanceFilePath)).to.be.true;
    expect(await fileExists(instanceVersionedFilePath)).to.be.true;

    // Validate file content matches expected instance output
    const instanceContent = JSON.parse(await fs.readFile(instanceFilePath, "utf-8"));
    expect(instanceContent).to.deep.equal(expectedBaseInstance);

    const instanceVersionedContent = JSON.parse(await fs.readFile(instanceVersionedFilePath, "utf-8"));
    expect(instanceVersionedContent).to.deep.equal({
      ...expectedBaseInstance,
      $id: "hcs-demo-configset.instances.base-model.1", // Versioned ID
    });
  });

  /**
   * ✅ Validates instance file structure.
   */
  test("should generate the correct instance extended file structure", async () => {
    await hcsManager.runPipelineForAll();

    const instanceFilePath = path.join(testDir, "instances", "extended-model.json");
    const instanceVersionedFilePath = path.join(testDir, "instances", "extended-model", "extended-model_1.json");

    expect(await fileExists(instanceFilePath)).to.be.true;
    expect(await fileExists(instanceVersionedFilePath)).to.be.true;

    // Validate file content matches expected instance output
    const instanceContent = JSON.parse(await fs.readFile(instanceFilePath, "utf-8"));
    expect(instanceContent).to.deep.equal(expectedExtendedInstance);

    const instanceVersionedContent = JSON.parse(await fs.readFile(instanceVersionedFilePath, "utf-8"));
    expect(instanceVersionedContent).to.deep.equal({
      ...expectedExtendedInstance,
      $id: "hcs-demo-configset.instances.extended-model.1", // Versioned ID
    });
  });
});
