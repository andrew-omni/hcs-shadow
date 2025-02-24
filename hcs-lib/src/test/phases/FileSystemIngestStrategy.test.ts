import { suite, suiteSetup, suiteTeardown, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { NodeFs } from "../../fs/nodeFs";
import { FileSystemIngestStrategy } from "../../phases/ingest/FileSystemIngestStrategy";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import * as test_schemas_models from "../test_schemas_and_models";
import { ContextUtils } from "../../core/ContextUtils";
import { NodeGit } from "../../git/nodeGit";
import { HcsManager } from "../../core/HcsManager";

suite("FileSystemIngestStrategy: Test Suite", function () {
  let chai: any;
  let expect: any;
  let fsAdapter: NodeFs;
  let configSet: ConfigSet;
  let ingestStrategy: FileSystemIngestStrategy;
  let context: PipelineContext;
  const testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

  this.timeout(10000);

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;
    fsAdapter = new NodeFs();
    ingestStrategy = new FileSystemIngestStrategy(fsAdapter);

    await setupTestEnvironment();
  });

  suiteTeardown(async () => {
    await teardownTestDirectory();
  });

  async function setupTestEnvironment() {
    await fs.mkdir(testDir, { recursive: true });

    // Define schema, model, and a referencing model
    const schemaData = {
      $id: "config_test.schemas.test-schema",
      type: "object",
      properties: {
        name: { type: "string" }
      }
    };

    const referencedModelData = {
      $id: "config_test.models.referenced-model",
      someKey: "someValue"
    };

    const mainModelData = {
      $id: "config_test.models.main-model",
      $refs: ["config_test.schemas.test-schema", "config_test.models.referenced-model"],
      name: "Test Model"
    };

    const hcsManager = new HcsManager([testDir], fsAdapter, new NodeGit());
    let configSet = await hcsManager.createConfigSet(test_schemas_models.CONFIGSET_NAME);

    // Write schema, referenced model, and main model files
    await writeFile(configSet, "schemas", "test-schema.json", schemaData);
    await writeFile(configSet, "models", "referenced-model.json", referencedModelData);
    await writeFile(configSet, "models", "main-model.json", mainModelData);
    await hcsManager.initialize();  // Initialize again to load the new config set
    configSet = hcsManager.getConfigSetByName(test_schemas_models.CONFIGSET_NAME)!;

    context = {
      hcsManager: hcsManager,
      modelId: "config_test.models.main-model",
      configSet,
      data: new Map(),
      errors: [],
    };

  }

  async function teardownTestDirectory() {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️ Error cleaning up directory ${testDir}: ${error}`);
    }
  }

  async function writeFile(configSet: ConfigSet, subDir: string, fileName: string, content: any) {
    const filePath = path.join(configSet.absolutePath, subDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  /**
   * ✅ Should ingest a model and its referenced schema & model
   */
  test("should ingest model and recursively load referenced schema and model", async () => {
    await ingestStrategy.execute(context);

    // Validate main model is in context
    const ingestedMainModel = ContextUtils.getPhaseData(context, "ingest", "models", "config_test.models.main-model");
    expect(ingestedMainModel).to.exist;
    expect(JSON.parse(ingestedMainModel as string)).to.deep.equal({
      $id: "config_test.models.main-model",
      $refs: ["config_test.schemas.test-schema", "config_test.models.referenced-model"],
      name: "Test Model"
    });

    // Validate referenced schema is in context
    const ingestedSchema = ContextUtils.getPhaseData(context, "ingest", "schemas", "config_test.schemas.test-schema");
    expect(ingestedSchema).to.exist;
    expect(JSON.parse(ingestedSchema as string)).to.deep.equal({
      $id: "config_test.schemas.test-schema",
      type: "object",
      properties: { name: { type: "string" } }
    });

    // Validate referenced model is in context
    const ingestedReferencedModel = ContextUtils.getPhaseData(context, "ingest", "models", "config_test.models.referenced-model");
    expect(ingestedReferencedModel).to.exist;
    expect(JSON.parse(ingestedReferencedModel as string)).to.deep.equal({
      $id: "config_test.models.referenced-model",
      someKey: "someValue"
    });
  });

  /**
   * ✅ Should throw an error if model ID is not found
   */
  test("should throw an error if model ID is not found", async () => {
    const invalidContext = {
      ...context,
      modelId: "non-existent-model-id",
    };

    try {
      await ingestStrategy.execute(invalidContext);
      throw new Error("Expected error for non-existent model ID, but none was thrown.");
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).to.include("Model ID non-existent-model-id not found in config set.");
      } else {
        throw error;
      }
    }
  });

  /**
   * ✅ Should throw an error if the file does not exist.
   */
  test("should throw an error if the file does not exist", async () => {
    const missingFileContext = {
      ...context,
      modelId: "config_test.models.missing-model",
    };

    try {
      await ingestStrategy.execute(missingFileContext);
      throw new Error("Expected error for missing file, but none was thrown.");
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).to.include("not found in config set");
      } else {
        throw error;
      }
    }
  });

  /**
   * ✅ Should properly store ingested data in the context.
   */
  test("should correctly store ingested data into pipeline context", async () => {
    await ingestStrategy.execute(context);

    const ingestedData = ContextUtils.getPhaseData(context, "ingest", "models", context.modelId);
    const parsedData = JSON.parse(ingestedData as string);
    expect(parsedData).to.be.an("object");
    if (typeof parsedData === "object" && parsedData !== null && "$id" in parsedData) {
      expect((parsedData as any).$id).to.equal('config_test.models.main-model');
    } else {
      throw new Error("Ingested data is not in the expected format.");
    }
  });
});
