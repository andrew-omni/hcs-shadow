import { suite, suiteSetup, suiteTeardown, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { NodeFs } from "../../fs/nodeFs";
import { DefaultValidationStrategy } from "../../phases/validation/DefaultValidationStrategy";
import { DefaultConversionStrategy } from "../../phases/conversion/DefaultConversionStrategy";
import { FileSystemIngestStrategy } from "../../phases/ingest/FileSystemIngestStrategy";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import * as test_schemas_models from "../test_schemas_and_models";
import { ContextUtils } from "../../core/ContextUtils";
import { HcsManager } from "../../core/HcsManager";
import { NodeGit } from "../../git/nodeGit";

suite("DefaultValidationStrategy: Test Suite", function () {
  let chai: any;
  let expect: any;
  let fsAdapter: NodeFs;
  let configSet: ConfigSet;
  let validationStrategy: DefaultValidationStrategy;
  let conversionStrategy: DefaultConversionStrategy;
  let ingestStrategy: FileSystemIngestStrategy;
  let context: PipelineContext;

  this.timeout(10000);
  const testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;
    fsAdapter = new NodeFs();
    validationStrategy = new DefaultValidationStrategy();
    conversionStrategy = new DefaultConversionStrategy();
    ingestStrategy = new FileSystemIngestStrategy(fsAdapter);

    // Create and load a ConfigSet
    await fs.mkdir(testDir, { recursive: true });
    const hcsManager = new HcsManager([testDir], fsAdapter, new NodeGit());
    let configSet = await hcsManager.createConfigSet(test_schemas_models.CONFIGSET_NAME);

    await writeFile(configSet, "models", test_schemas_models.validModel.filename, test_schemas_models.validModel.json);
    await writeFile(configSet, "schemas", test_schemas_models.validSchema.filename, test_schemas_models.validSchema.json);
    await hcsManager.initialize();  // Initialize again to load the new config set

    context = {
      hcsManager: hcsManager,
      modelId: test_schemas_models.validModel.json.$id,
      configSet: hcsManager.getConfigSetByName(test_schemas_models.CONFIGSET_NAME)!,
      data: new Map(),
      errors: [],
    };

    // Preload context with ingested data and execute conversion
    await ingestStrategy.execute(context);
    await conversionStrategy.execute(context);
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

  async function writeFile(configSet: ConfigSet, subDir: string, fileName: string, content: any) {
    const filePath = path.join(configSet.absolutePath, subDir, fileName);
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  /**
   * ✅ Should validate all converted models and schemas successfully.
   */
  test("should validate all converted models and schemas successfully", async () => {
    await validationStrategy.execute(context);

    const schemaErrors = ContextUtils.getPhaseData(context, "validation", "schemas", context.modelId);
    const modelErrors = ContextUtils.getPhaseData(context, "validation", "models", context.modelId);

    expect(context.errors).to.be.an("array").that.is.empty;
  });

  /**
   * ✅ Should record validation errors for invalid models.
   */
  test("should detect and record validation errors for invalid models", async () => {
    const invalidModel = { "version": "not" };
    ContextUtils.setPhaseData(context, "conversion", "models", context.modelId, invalidModel);
    await context.hcsManager.initialize();
    context.configSet = context.hcsManager.getConfigSetByName(test_schemas_models.CONFIGSET_NAME)!;

    await validationStrategy.execute(context);

    expect(context.errors).to.be.an("array").that.is.not.empty;
    if (Array.isArray(context.errors)) {
      expect(context.errors[0].message).to.include("Missing or invalid $id");
    }
  });


  /**
   * ✅ Should not overwrite unrelated phase data.
   */
  test("should not overwrite unrelated phase data", async () => {
    const unrelatedData = { someKey: "someValue" };
    ContextUtils.setPhaseData(context, "otherPhase", "models", context.modelId, unrelatedData);
    await context.hcsManager.initialize();
    context.configSet = context.hcsManager.getConfigSetByName(test_schemas_models.CONFIGSET_NAME)!;

    await validationStrategy.execute(context);

    const retrievedUnrelatedData = ContextUtils.getPhaseData(context, "otherPhase", "models", context.modelId);
    expect(retrievedUnrelatedData).to.deep.equal(unrelatedData);
  });

});
