import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { ConfigSet } from "../../core/ConfigSet";
import { NodeFs } from "../../fs/nodeFs";
import * as test_schemas_models from "../test_schemas_and_models";

suite("ConfigSet: Test Suite", function () {
  let chai: any;
  let expect: any;
  let nodeFs: NodeFs;
  let configSet: ConfigSet;

  this.timeout(10000);
  const testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;

    // Use the real filesystem adapter
    nodeFs = new NodeFs();
  });

  setup(async () => {
    await teardownTestDirectory();
    await fs.mkdir(path.join(testDir, "schemas"), { recursive: true });
    await fs.mkdir(path.join(testDir, "models"), { recursive: true });
    await fs.mkdir(path.join(testDir, "instances"), { recursive: true });

    // Write the schema, model, and instance using predefined valid data
    await writeFile("schemas", test_schemas_models.validSchema.filename, test_schemas_models.validSchema.json);
    await writeFile("models", test_schemas_models.validModel.filename, test_schemas_models.validModel.json);
    await writeFile("instances", test_schemas_models.validInstance.filename, test_schemas_models.validInstance.json);

    // Load the config set from the test directory
    configSet = await ConfigSet.loadConfigSet(testDir, nodeFs);
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

  async function writeFile(subDir: string, fileName: string, content: any) {
    const filePath = path.join(testDir, subDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  /**
   * ✅ Tests that the config set loads schemas, models, and instances correctly.
   */
  test("should load schemas, models, and instances correctly", async () => {
    expect(configSet.getSchemaIds()).to.include(test_schemas_models.validSchema.json.$id);
    expect(configSet.getModelIds()).to.include(test_schemas_models.validModel.json.$id);
    expect(configSet.getInstanceIds()).to.include(test_schemas_models.validInstance.json.$id);
  });

  /**
   * ✅ Tests that `exists()` correctly identifies existing config sets.
   */
  test("should confirm the config set exists on disk", async () => {
    const exists = await configSet.exists();
    expect(exists).to.be.true;
  });

  /**
   * ✅ Tests that loading a non-existing config set throws an error.
   */
  test("should throw an error when loading a non-existing config set", async () => {
    try {
      await ConfigSet.loadConfigSet(path.join(__dirname, "non-existing-configset"), nodeFs);
      throw new Error("Expected loadConfigSet to throw an error for non-existing config set");
    } catch (error) {
      expect(error).to.exist;
      if (error instanceof Error) {
        expect(error.message).to.include("Failed to read directory");
      } else {
        throw error;
      }
    }
  });

  /**
   * ✅ Tests that empty directories result in empty mappings.
   */
  test("should return empty maps for empty schema, model, and instance directories", async () => {
    await teardownTestDirectory();
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, "schemas"));
    await fs.mkdir(path.join(testDir, "models"));
    await fs.mkdir(path.join(testDir, "instances"));

    configSet = await ConfigSet.loadConfigSet(testDir, nodeFs);

    expect(configSet.getSchemaIds()).to.be.empty;
    expect(configSet.getModelIds()).to.be.empty;
    expect(configSet.getInstanceIds()).to.be.empty;
  });

  /**
   * ✅ Tests creating a new schema and checking if it appears in the schemas map.
   */
  test("should create a new schema and add it to the schemas map", async () => {
    const newSchemaName = "new-schema";
    const schemaId = await configSet.createSchema(newSchemaName);

    expect(configSet.getSchemaIds()).to.include(schemaId);
    expect(await nodeFs.isExists(path.join(testDir, "schemas", `${newSchemaName}.json`))).to.be.true;
  });

  /**
   * ✅ Tests creating a new model and checking if it appears in the models map.
   */
  test("should create a new model and add it to the models map", async () => {
    const newModelName = "new-model";
    const modelId = await configSet.createModel(newModelName);

    expect(configSet.getModelIds()).to.include(modelId);
    expect(await nodeFs.isExists(path.join(testDir, "models", `${newModelName}.json`))).to.be.true;
  });

  /**
   * ✅ Tests preventing duplicate schema creation.
   */
  test("should throw an error when trying to create a duplicate schema", async () => {
    const duplicateSchemaName = "duplicate-schema";
    await configSet.createSchema(duplicateSchemaName);

    try {
      await configSet.createSchema(duplicateSchemaName);
      throw new Error("Expected an error for creating a duplicate schema");
    } catch (error) {
      expect(error).to.exist;
      if (error instanceof Error) {
        expect(error.message).to.include("File already exists");
      } else {
        throw error;
      }
    }
  });

  /**
   * ✅ Tests preventing duplicate model creation.
   */
  test("should throw an error when trying to create a duplicate model", async () => {
    const duplicateModelName = "duplicate-model";
    await configSet.createModel(duplicateModelName);

    try {
      await configSet.createModel(duplicateModelName);
      throw new Error("Expected an error for creating a duplicate model");
    } catch (error) {
      expect(error).to.exist;
      if (error instanceof Error) {
        expect(error.message).to.include("File already exists");
      } else {
        throw error;
      }
    }
  });
});
