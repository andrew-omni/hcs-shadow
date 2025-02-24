import { suite, suiteSetup, suiteTeardown, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { NodeFs } from "../../fs/nodeFs";
import { DefaultConversionStrategy } from "../../phases/conversion/DefaultConversionStrategy";
import { FileSystemIngestStrategy } from "../../phases/ingest/FileSystemIngestStrategy";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import * as test_schemas_models from "../test_schemas_and_models";
import { ContextUtils } from "../../core/ContextUtils";
import { HcsManager } from "../../core/HcsManager";
import { NodeGit } from "../../git/nodeGit";

suite("DefaultConversionStrategy: Test Suite", function () {
  let chai: any;
  let expect: any;
  let fsAdapter: NodeFs;
  let configSet: ConfigSet;
  let conversionStrategy: DefaultConversionStrategy;
  let ingestStrategy: FileSystemIngestStrategy;
  let context: PipelineContext;

  this.timeout(10000);
  const testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;
    fsAdapter = new NodeFs();
    conversionStrategy = new DefaultConversionStrategy();
    ingestStrategy = new FileSystemIngestStrategy(fsAdapter);

    // Create and load a ConfigSet
    await fs.mkdir(path.join(testDir, "models"), { recursive: true });
    await writeFile("models", test_schemas_models.validModel.filename, test_schemas_models.validModel.json);

    configSet = await ConfigSet.loadConfigSet(testDir, fsAdapter);

    context = {
      hcsManager: new HcsManager([testDir], fsAdapter, new NodeGit()),

      modelId: test_schemas_models.validModel.json.$id,
      configSet,
      data: new Map(),
      errors: [],
    };

    // Preload context with ingested data
    await ingestStrategy.execute(context);
  });

  suiteTeardown(async () => {
    await teardownTestDirectory();
  });

  async function teardownTestDirectory() {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️ Error cleaning up directory ${testDir}: ${error}`);
    }
  }

  async function writeFile(subDir: string, fileName: string, content: any) {
    const filePath = path.join(testDir, subDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  /**
   * ✅ Should convert all ingested models and verify valid JSON documents
   */
  test("should convert all ingested models and verify JSON validity", async () => {
    await conversionStrategy.execute(context);

    let allValid = true;
    for (const [key, value] of context.data.entries()) {
      const [phase, resourceType] = key.split(":");
      if (phase === "conversion" && resourceType === "models") {
        try {
          JSON.stringify(value.value); // Will throw an error if not valid JSON
        } catch (e) {
          allValid = false;
          break;
        }
      }
    }

    expect(allValid).to.be.true;
  });

  /**
   * ✅ Should convert a valid ingested model successfully.
   */
  test("should successfully convert an ingested model", async () => {
    await conversionStrategy.execute(context);

    const convertedData = ContextUtils.getPhaseData(context, "conversion", "models", context.modelId);
    expect(convertedData).to.deep.equal({
      ...test_schemas_models.validModel.json,
    });
  });

  /**
   * ✅ Should skip conversion if no ingested data is present.
   */
  test("should skip conversion if no ingested data is present", async () => {
    const emptyContext: PipelineContext = {
      hcsManager: new HcsManager([testDir], fsAdapter, new NodeGit()),

      modelId: "non-existent-model-id",
      configSet,
      data: new Map(),
      errors: [],
    };

    await conversionStrategy.execute(emptyContext);
    const convertedData = ContextUtils.getPhaseData(emptyContext, "conversion", "models", emptyContext.modelId);
    expect(convertedData).to.be.null;
  });

  /**
   * ✅ Should not overwrite unrelated phase data.
   */
  test("should not overwrite unrelated phase data", async () => {
    const unrelatedData = { someKey: "someValue" };
    ContextUtils.setPhaseData(context, "otherPhase", "models", context.modelId, unrelatedData);

    await conversionStrategy.execute(context);

    const retrievedUnrelatedData = ContextUtils.getPhaseData(context, "otherPhase", "models", context.modelId);
    expect(retrievedUnrelatedData).to.deep.equal(unrelatedData);
  });

  /**
   * ✅ Should log an error if JSON parsing fails.
   */
  test("should log an error for invalid JSON", async () => {
    const invalidJsonContent = "{ invalid json }";
    await writeFile("models", "invalid-model.json", invalidJsonContent);

    const invalidModelContext: PipelineContext = {
      hcsManager: new HcsManager([testDir], fsAdapter, new NodeGit()),
      modelId: "invalid-model-id",
      configSet,
      data: new Map([
        [`ingest:models:invalid-model-id`, { value: invalidJsonContent }],
      ]),
      errors: [],
    };

    await conversionStrategy.execute(invalidModelContext);
    expect(invalidModelContext.errors.length).to.be.greaterThan(0);
    const validationError = invalidModelContext.errors[0];
    expect(validationError.message).to.include("JSON parsing error");
  });
});
