import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { ConfigSetManager } from "../../core/ConfigSetManager";
import { NodeFs } from "../../fs/nodeFs";
import * as test_schemas_models from "../test_schemas_and_models";

suite("ConfigSetManager: Test Suite", function () {
  let chai: any;
  let expect: any;
  let nodeFs: NodeFs;
  let configSetManager: ConfigSetManager;
  const createdTestDirs: string[] = [];

  this.timeout(10000);
  const testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;

    // Use the real filesystem adapter
    nodeFs = new NodeFs();
    configSetManager = new ConfigSetManager(nodeFs);
  });

  setup(async () => {
    await createTestDirectory(testDir);
    await fs.mkdir(path.join(testDir, "schemas"), { recursive: true });
    await fs.mkdir(path.join(testDir, "models"), { recursive: true });
    await fs.mkdir(path.join(testDir, "instances"), { recursive: true });

    // Write schema, model, and instance using predefined valid data
    await writeFile("schemas", test_schemas_models.validSchema.filename, test_schemas_models.validSchema.json);
    await writeFile("models", test_schemas_models.validModel.filename, test_schemas_models.validModel.json);
    await writeFile("instances", test_schemas_models.validInstance.filename, test_schemas_models.validInstance.json);
  });

  suiteTeardown(async () => {
    await cleanupAllTestDirectories();
  });

  async function createTestDirectory(dirPath: string) {
    createdTestDirs.push(dirPath);
    await fs.mkdir(dirPath, { recursive: true });
  }

  async function cleanupAllTestDirectories() {
    for (const dir of createdTestDirs) {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch (error) {
        console.warn(`⚠️ Error cleaning up directory ${dir}: ${error}`);
      }
    }
  }

  async function writeFile(subDir: string, fileName: string, content: any) {
    const filePath = path.join(testDir, subDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  /**
   * ✅ Tests that the ConfigSetManager discovers config sets correctly.
   */
  test("should discover config sets correctly", async () => {
    const discoveredSets = await configSetManager.discoverConfigSets([__dirname]);
    expect(discoveredSets.length).to.equal(1);
    expect(discoveredSets[0].name).to.equal(test_schemas_models.CONFIGSET_NAME);
  });

  /**
   * ✅ Tests that `getConfigSets()` returns cached config sets.
   */
  test("should return cached config sets after discovery", async () => {
    await configSetManager.discoverConfigSets([__dirname]);
    const cachedSets = configSetManager.getConfigSets();
    expect(cachedSets.length).to.equal(1);
    expect(cachedSets[0].name).to.equal(test_schemas_models.CONFIGSET_NAME);
  });

  /**
   * ✅ Tests clearing cached config sets.
   */
  test("should clear cached config sets", async () => {
    await configSetManager.discoverConfigSets([__dirname]);
    configSetManager.clear();
    const cachedSets = configSetManager.getConfigSets();
    expect(cachedSets.length).to.equal(0);
  });

  /**
   * ✅ Tests creating a new config set programmatically.
   */
  test("should create a new config set", async () => {
    const newConfigSetName = "new-config-set";
    const newConfigSetPath = path.join(__dirname, newConfigSetName);

    await createTestDirectory(newConfigSetPath);
    const newConfigSet = await configSetManager.createConfigSet(newConfigSetPath, nodeFs);

    expect(newConfigSet.name).to.equal(newConfigSetName);
    expect(await nodeFs.isExists(newConfigSetPath)).to.be.true;

    // Check if the required subdirectories exist
    const requiredDirs = ["schemas", "models", "instances"];
    for (const dir of requiredDirs) {
      expect(await nodeFs.isExists(path.join(newConfigSetPath, dir))).to.be.true;
    }
  });

  /**
   * ✅ Test that creating a config set reflects in `getConfigSets()`.
   */
  test("should reflect newly created config set in getConfigSets()", async () => {
    const newConfigSetName = "new-config-set";
    const newConfigSetPath = path.join(__dirname, newConfigSetName);

    await createTestDirectory(newConfigSetPath);
    await configSetManager.createConfigSet(newConfigSetPath, nodeFs);
    const cachedSets = configSetManager.getConfigSets();

    expect(cachedSets.some((set) => set.name === newConfigSetName)).to.be.true;
  });

  /**
   * ✅ Test that newly created config set appears after rediscovery.
   */
  test("should include newly created config set after rediscovery", async () => {
    const newConfigSetName = "rediscovered-config-set";
    const newConfigSetPath = path.join(__dirname, newConfigSetName);

    await createTestDirectory(newConfigSetPath);
    await configSetManager.createConfigSet(newConfigSetPath, nodeFs);
    const discoveredSets = await configSetManager.discoverConfigSets([__dirname]);

    expect(discoveredSets.some((set) => set.name === newConfigSetName)).to.be.true;
  });

  /**
   * ✅ Should return cached results on repeated discovery calls.
   */
  test("should return cached results consistently without re-scanning", async () => {
    await configSetManager.discoverConfigSets([__dirname]);
    const firstCall = configSetManager.getConfigSets();
    const secondCall = configSetManager.getConfigSets();

    expect(firstCall).to.deep.equal(secondCall);
  });

  /**
   * ✅ Should reset cache when clear() is called.
   */
  test("should reset cached config sets when clear() is called", async () => {
    await configSetManager.discoverConfigSets([__dirname]);
    const beforeClear = configSetManager.getConfigSets();

    configSetManager.clear();
    const afterClear = configSetManager.getConfigSets();

    expect(beforeClear.length).to.be.greaterThan(0);
    expect(afterClear.length).to.equal(0);
  });

  /**
   * ✅ Should ignore random directories without valid config structure.
   */
  test("should ignore random directories that are not valid config sets", async () => {
    const invalidDir = path.join(__dirname, "random-folder");
    await createTestDirectory(invalidDir);

    const discoveredSets = await configSetManager.discoverConfigSets([__dirname]);
    expect(discoveredSets.some((set) => set.name === "random-folder")).to.be.false;
  });

  /**
   * ✅ Should not duplicate config sets if created twice.
   */
  test("should not duplicate config sets if the same one is created twice", async () => {
    const duplicateConfigSetPath = path.join(__dirname, "duplicate-config-set");

    await createTestDirectory(duplicateConfigSetPath);
    await configSetManager.createConfigSet(duplicateConfigSetPath, nodeFs);
    await configSetManager.createConfigSet(duplicateConfigSetPath, nodeFs);

    const discoveredSets = configSetManager.getConfigSets();
    const duplicates = discoveredSets.filter((set) => set.name === "duplicate-config-set");

    expect(duplicates.length).to.equal(1);
  });

  /**
   * ✅ Should correctly handle multiple config sets in the same directory.
   */
  test("should handle multiple config sets in the same parent directory", async () => {
    const configSetPaths = [
      path.join(__dirname, "config-set-1"),
      path.join(__dirname, "config-set-2"),
      path.join(__dirname, "config-set-3"),
    ];

    for (const configSetPath of configSetPaths) {
      await createTestDirectory(configSetPath);
      await configSetManager.createConfigSet(configSetPath, nodeFs);
    }

    const discoveredSets = await configSetManager.discoverConfigSets([__dirname]);
    const discoveredPaths = discoveredSets.map((set) => set.name);

    expect(discoveredPaths).to.include.members(["config-set-1", "config-set-2", "config-set-3"]);
  });

  /**
 * ✅ Should return the correct ConfigSet for a valid resource ID.
 */
  test("should return the correct ConfigSet for a valid resource ID", async () => {
    const configSetName = test_schemas_models.CONFIGSET_NAME;
    const validResourceId = `${configSetName}.schemas.${test_schemas_models.validSchema.json.$id}`;

    await configSetManager.discoverConfigSets([__dirname]);
    const configSet = configSetManager.getConfigSetByResourceId(validResourceId);

    expect(configSet).to.not.be.null;
    expect(configSet?.name).to.equal(configSetName);
  });

  /**
   * ✅ Should return null for an invalid resource ID.
   */
  test("should return null for an invalid resource ID", async () => {
    const invalidResourceId = "nonexistent-config-set.schemas.invalidSchema";

    await configSetManager.discoverConfigSets([__dirname]);
    const configSet = configSetManager.getConfigSetByResourceId(invalidResourceId);

    expect(configSet).to.be.null;
  });
});
