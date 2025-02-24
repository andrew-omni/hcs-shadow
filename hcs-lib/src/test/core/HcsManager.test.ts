import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { HcsManager } from "../../core/HcsManager";
import * as test_schemas_models from "../test_schemas_and_models";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet } from "../../core/ConfigSet";
import { NodeGit } from "../../git/nodeGit";

suite("HcsManager: Test Suite", function () {
  let chai: any;
  let expect: any;
  let hcsManager: HcsManager;
  let fsAdapter: NodeFs;
  let configSet: ConfigSet;
  let gitAdapter: NodeGit;
  let testDir: string;

  this.timeout(10000);
  testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;
    fsAdapter = new NodeFs();
    gitAdapter = new NodeGit();
  });

  setup(async () => {
    await teardownTestDirectory();
    await fs.mkdir(testDir, { recursive: true });
    hcsManager = new HcsManager([testDir], fsAdapter, gitAdapter);
    await hcsManager.initialize();
    configSet = await hcsManager.createConfigSet(test_schemas_models.CONFIGSET_NAME);
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

  /**
   * ✅ Utility to check if a file exists.
   */
  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ✅ Tests schema and model creation.
   */
  test("should create schema and model in the config set", async () => {
    const schemaId = await hcsManager.createSchemaInConfigSet(configSet, test_schemas_models.validSchema.basename);
    const modelId = await hcsManager.createModelInConfigSet(configSet, test_schemas_models.validModel.basename);

    const schemaIds = configSet.getSchemaIds();
    const modelIds = configSet.getModelIds();

    expect(schemaIds).to.include(schemaId);
    expect(modelIds).to.include(modelId);
  });

  /**
   * ✅ Tests pipeline execution for a single model and verifies file persistence.
   */
  test("should successfully run single model pipeline and create expected files", async () => {
    const schemaId = await hcsManager.createSchemaInConfigSet(configSet, test_schemas_models.validSchema.basename);
    const modelId = await hcsManager.createModelInConfigSet(configSet, test_schemas_models.validModel.basename);

    try {
      const result = await hcsManager.runPipelineForModel(modelId);
      expect(result.success).to.be.true;
    } catch (error) {
      throw new Error(`Expected pipeline to succeed, but it failed with: ${error}`);
    }

    // Expected file paths
    const modelFilePath = path.join(configSet.absolutePath, "models", "validModel.json");
    const modelVersionedFilePath = path.join(configSet.absolutePath, "models", "validModel", "validModel_1.json");
    const instanceFilePath = path.join(configSet.absolutePath, "instances", "validModel.json");
    const instanceVersionedFilePath = path.join(configSet.absolutePath, "instances", "validModel", "validModel_1.json");

    // Verify files exist
    expect(await fileExists(modelFilePath)).to.be.true;
    expect(await fileExists(modelVersionedFilePath)).to.be.true;
    expect(await fileExists(instanceFilePath)).to.be.true;
    expect(await fileExists(instanceVersionedFilePath)).to.be.true;
  });

  /**
   * ✅ Tests running the pipeline for all models and verifies file persistence.
   */
  test("should successfully run the pipeline for all models and create expected files", async () => {
    await hcsManager.createSchemaInConfigSet(configSet, test_schemas_models.validSchema.basename);
    await hcsManager.createModelInConfigSet(configSet, test_schemas_models.validModel.basename);

    const pipelineResults = await hcsManager.runPipelineForAll();

    expect(pipelineResults.results.length).to.equal(1);
    expect(pipelineResults.hasErrors).to.be.false;

    // Expected file paths
    const modelFilePath = path.join(configSet.absolutePath, "models", "validModel.json");
    const modelVersionedFilePath = path.join(configSet.absolutePath, "models", "validModel", "validModel_1.json");
    const instanceFilePath = path.join(configSet.absolutePath, "instances", "validModel.json");
    const instanceVersionedFilePath = path.join(configSet.absolutePath, "instances", "validModel", "validModel_1.json");

    // Verify files exist
    expect(await fileExists(modelFilePath)).to.be.true;
    expect(await fileExists(modelVersionedFilePath)).to.be.true;
    expect(await fileExists(instanceFilePath)).to.be.true;
    expect(await fileExists(instanceVersionedFilePath)).to.be.true;
  });

  /**
   * ✅ Tests listing all configuration sets.
   */
  test("should list all discovered config sets", async () => {
    const configSets = await hcsManager.listConfigSets();
    expect(configSets).to.have.lengthOf(1);
    expect(configSets[0].name).to.equal(test_schemas_models.CONFIGSET_NAME);
  });

  /**
   * ✅ Tests clearing the internal cache.
   */
  test("should clear cache without errors", async () => {
    await hcsManager.clearCache();
    expect(() => hcsManager.clearCache()).to.not.throw;
  });

  /**
   * ✅ Tests that an uninitialized manager initializes automatically.
   */
  test("should auto-initialize if not already initialized", async () => {
    const uninitializedManager = new HcsManager([testDir], fsAdapter, gitAdapter);
    const configSets = await uninitializedManager.listConfigSets();
    expect(configSets).to.have.lengthOf(1);
  });
});
