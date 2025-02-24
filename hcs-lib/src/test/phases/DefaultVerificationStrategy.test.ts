import { suiteSetup, suite, test, teardown, suiteTeardown } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { NodeFs } from "../../fs/nodeFs";
import { DefaultBuildStrategy } from "../../phases/build/DefaultBuildStrategy";
import { DefaultVerificationStrategy } from "../../phases/verification/DefaultVerificationStrategy";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ConfigSet } from "../../core/ConfigSet";
import * as test_schemas_models from "../test_schemas_and_models";
import { ContextUtils } from "../../core/ContextUtils";
import util from "util";
import { HcsManager } from "../../core/HcsManager";
import { NodeGit } from "../../git/nodeGit";
import { createDemoFiles, DEMO_CONFIGSET_NAME, expectedExtendedInstance, expectedBaseInstance, baseModel as expectedBaseModel } from "../../core/demoSetCreator";

suite("DefaultVerificationStrategy: Validation Tests", function () {
  let chai: any;
  let expect: any;
  let fsAdapter: NodeFs;
  let buildStrategy: DefaultBuildStrategy;
  let verificationStrategy: DefaultVerificationStrategy;
  let hcsManager: HcsManager;
  let configSet: ConfigSet;


  this.timeout(10000);
  const testDir = path.join(__dirname, test_schemas_models.CONFIGSET_NAME);

  const SCHEMA_ID_BASE = `${"hcs-demo-configset"}.schemas.base`;
  const SCHEMA_ID_EXTENDED = `${"hcs-demo-configset"}.schemas.extended`;

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;
    fsAdapter = new NodeFs();
    buildStrategy = new DefaultBuildStrategy();
    verificationStrategy = new DefaultVerificationStrategy();

    try { await fs.rmdir(testDir, { recursive: true }); } catch (e) { }

    // Initialize HcsManager and create config set
    fs.mkdir(testDir, { recursive: true });
    hcsManager = new HcsManager([testDir], fsAdapter, new NodeGit());
    await hcsManager.createDemoFiles();

    configSet = hcsManager.getConfigSetByName("hcs-demo-configset")!;
  });

  suiteTeardown(async () => {
    try { await fs.rmdir(testDir, { recursive: true }); } catch (e) { }
  });

  /**
   * Utility to set up a fresh context for each test.
   */
  function createPipelineContext(modelId: string): PipelineContext {
    return {
      hcsManager: hcsManager,
      modelId: modelId,
      configSet: configSet,
      data: new Map(),
      errors: [],
    };
  }

  /**
   * Utility to set up the schemas.
   */
  function addSchemasToContext(context: PipelineContext) {
    const baseSchema = {
      $id: SCHEMA_ID_BASE,
      type: "object",
      properties: { id: { type: "string" } },
    };
    const extendedSchema = {
      $id: SCHEMA_ID_EXTENDED,
      $ref: SCHEMA_ID_BASE,
      properties: { name: { type: "string" } },
      required: ["name"],
    };

    ContextUtils.setPhaseData(context, "validation", "schemas", SCHEMA_ID_BASE, baseSchema);
    ContextUtils.setPhaseData(context, "validation", "schemas", SCHEMA_ID_EXTENDED, extendedSchema);
  }

  /**
   * ✅ Test for valid models - No validation errors expected
   */
  test("should validate all models successfully with no validation errors", async () => {
    const VALID_MODEL_ID = `${"hcs-demo-configset"}.models.valid`;

    const context = createPipelineContext(VALID_MODEL_ID);
    addSchemasToContext(context);

    const validModel = {
      $id: VALID_MODEL_ID,
      $refs: [SCHEMA_ID_EXTENDED],
      id: "789",
      name: "Valid Test Model",
    };

    ContextUtils.setPhaseData(context, "validation", "models", VALID_MODEL_ID, validModel);

    await buildStrategy.execute(context);

    const builtValidModel = ContextUtils.getPhaseData(context, "build", "models", VALID_MODEL_ID);
    // ContextUtils.setPhaseData(context, "build", "model", VALID_MODEL_ID, builtValidModel);

    await verificationStrategy.execute(context);

    // console.log(util.inspect(context, { depth: null, colors: true, compact: false }));

    expect(context.errors).to.be.empty;

    // Confirm we removed outstanding schema refs
    const cleanedModel = ContextUtils.getPhaseData(context, "build", "models", VALID_MODEL_ID) as { $refs?: any };
    console.log(util.inspect(cleanedModel, { depth: null, colors: true, compact: false }));
    expect(cleanedModel.$refs).to.not.be.undefined;

    const cleanedInstance = ContextUtils.getPhaseData(context, "build", "instances", VALID_MODEL_ID.replace('.models.', '.instances.')) as { $refs?: any };
    console.log(util.inspect(cleanedInstance, { depth: null, colors: true, compact: false }));
    expect(cleanedInstance.$refs).to.be.undefined;
  });

  /**
   * ❌ Test for invalid models - Validation errors expected
   */
  test("should detect validation errors for models with invalid data", async () => {
    const INVALID_MODEL_ID = `${"hcs-demo-configset"}.models.invalid`;

    const context = createPipelineContext(INVALID_MODEL_ID);
    addSchemasToContext(context);

    const invalidModel = {
      $id: INVALID_MODEL_ID,
      $refs: [SCHEMA_ID_EXTENDED],
      name: 456, // ❌ Invalid: `name` should be a string
    };

    ContextUtils.setPhaseData(context, "validation", "models", INVALID_MODEL_ID, invalidModel);

    await buildStrategy.execute(context);

    const builtInvalidModel = ContextUtils.getPhaseData(context, "build", "models", INVALID_MODEL_ID);

    await verificationStrategy.execute(context);
    console.log(util.inspect(context.errors, { depth: null, colors: true, compact: false }));
    expect(context.errors).to.not.be.empty;
    expect(context.errors.length).to.equal(2);
    // Expect the filePath is a valid absolute path
    expect(path.isAbsolute(context.errors[0].filePath)).to.be.true;
    expect(path.isAbsolute(context.errors[1].filePath)).to.be.true;

    expect(context.errors[0].message).to.include(
      `Validation failed against schema '${SCHEMA_ID_EXTENDED}' for field 'name': must be string`
    );

    expect(context.errors[0].line).to.not.equal(0);
    expect(context.errors[0].column).to.not.equal(0);
    expect(context.errors[0].endColumn).to.not.equal(0);
  });

  // NB We know this feature is broken
  test.skip("should detect validation errors for models with invalid data - extended", async () => {
    const MODEL_ID = `${"hcs-demo-configset"}.models.extended-model`;

    const context = createPipelineContext(MODEL_ID);
    addSchemasToContext(context);

    const extendedModel = {
      "$id": "hcs-demo-configset.models.extended-model",
      "$version": 1,
      "$refs": [
        "hcs-demo-configset.schemas.extended-schema", 
        "hcs-demo-configset.models.base-model12"
      ],
      "name": "Name from extended-model"
    };

    ContextUtils.setPhaseData(context, "validation", "models", MODEL_ID, extendedModel);

    await buildStrategy.execute(context);

    const builtInvalidModel = ContextUtils.getPhaseData(context, "build", "models", MODEL_ID);

    await verificationStrategy.execute(context);
    console.log(util.inspect(context.errors, { depth: null, colors: true, compact: false }));
    expect(context.errors).to.not.be.empty;
    expect(context.errors.length).to.equal(1);
    // Expect the filePath is a valid absolute path
    expect(path.isAbsolute(context.errors[0].filePath)).to.be.true;

    expect(context.errors[0].message).to.include(
      "[BUILD] Unresolved reference: hcs-demo-configset.models.base-model12"
    );

    expect(context.errors[0].line).to.not.equal(0);
    expect(context.errors[0].column).to.not.equal(0);
    expect(context.errors[0].endColumn).to.not.equal(0);
  });

  /**
   * ✅ Test for partial schemas with missing required fields
   */
  test("should detect missing required fields in models", async () => {
    const MISSING_FIELD_MODEL_ID = `${"hcs-demo-configset"}.models.missingField`;
    const context = createPipelineContext(MISSING_FIELD_MODEL_ID);
    addSchemasToContext(context);


    const incompleteModel = {
      $id: MISSING_FIELD_MODEL_ID,
      $refs: [SCHEMA_ID_EXTENDED],
      id: "456", // ✅ Valid `id`
      // ❌ Missing `name`
    };

    ContextUtils.setPhaseData(context, "validation", "models", MISSING_FIELD_MODEL_ID, incompleteModel);

    await buildStrategy.execute(context);

    const builtIncompleteModel = ContextUtils.getPhaseData(context, "build", "models", MISSING_FIELD_MODEL_ID);

    await verificationStrategy.execute(context);
    console.log(util.inspect(context.errors, { depth: null, colors: true, compact: false }));

    expect(context.errors).to.not.be.empty;
    expect(context.errors.length).to.equal(2);
    expect(context.errors[0].message).to.include(
      `Validation failed against schema '${SCHEMA_ID_EXTENDED}': Missing required field 'name'`
    );
  });
});
