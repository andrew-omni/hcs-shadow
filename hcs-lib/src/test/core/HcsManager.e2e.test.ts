import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import * as path from "path";
import * as fs from "fs/promises";
import { HcsManager } from "../../core/HcsManager";
import { NodeFs } from "../../fs/nodeFs";
import { ConfigSet } from "../../core/ConfigSet";
import { NodeGit } from "../../git/nodeGit";

suite("HcsManager: End-to-End Pipeline Test", function () {
  let chai: any;
  let expect: any;
  let hcsManager: HcsManager;
  let fsAdapter: NodeFs;
  let configSet: ConfigSet;
  let gitAdapter: NodeGit;
  let testDir: string;

  this.timeout(20000);
  testDir = path.join(__dirname, "configset-alpha");

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;
    fsAdapter = new NodeFs();
    gitAdapter = new NodeGit();
  });

  setup(async () => {
    await teardownTestDirectory();
    await fs.mkdir(testDir, { recursive: true });
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

  async function writeSchema(fileName: string, content: any) {
    const filePath = path.join(testDir, "schemas", fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  async function writeModel(fileName: string, content: any) {
    const filePath = path.join(testDir, "models", fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  }

  /**
   * ✅ Runs the full pipeline and ensures no errors occur.
   */
  test("should successfully run full pipeline without errors", async () => {
    hcsManager = new HcsManager([__dirname], fsAdapter, gitAdapter);
    await hcsManager.initialize();
    configSet = await hcsManager.createConfigSet("configset-alpha");

    // Write test schemas and models to disk
    await writeSchema("base-schema.json", baseSchema);
    await writeSchema("extended-schema.json", extendedSchema);
    await writeModel("base-model.json", baseModel);
    await writeModel("second-model.json", secondModel);
    await hcsManager.initialize();
    const pipelineResults = await hcsManager.runPipelineForAll();

    expect(pipelineResults.hasErrors).to.be.false;

    // Validate expected output files exist
    const expectedFiles = [
      "models/base-model.json",
      "models/base-model/base-model_1.json",
      "models/second-model.json",
      "models/second-model/second-model_1.json",
      "schemas/base-schema.json",
      "schemas/extended-schema.json",
      "schemas/base-schema/base-schema_1.json",
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(testDir, file);
      expect(await fileExists(filePath), `Expected file missing: ${filePath}`).to.be.true;
    }
  });


  test("build fails on bad ref", async () => {
    hcsManager = new HcsManager([__dirname], fsAdapter, gitAdapter);
    await hcsManager.initialize();
    configSet = await hcsManager.createConfigSet("configset-alpha");

    // Write test schemas and models to disk
    await writeSchema("base-schema.json", baseSchema);
    
    let badExtendedSchema = { ...extendedSchema, "$inheritsFrom": "configset-alpha.schemas.bad-schema" };
    await writeSchema("extended-schema.json", badExtendedSchema);

    await writeModel("base-model.json", baseModel);
    await writeModel("second-model.json", secondModel);
    
    await hcsManager.initialize();
    const pipelineResults = await hcsManager.runPipelineForAll();

    expect(pipelineResults.hasErrors).to.be.true;

    const err = pipelineResults!.results![0].errors![0];
    console.log(err)
    expect(err.line).to.be.greaterThan(0);
    expect(err.column).to.be.greaterThan(0);
    expect(err.endColumn).to.be.greaterThan(0);
  });

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
   * ✅ Test models and schemas
   */
  const baseModel = {
    "$id": "configset-alpha.models.base-model",
    "$version": 1,
    "$ref": "configset-alpha.schemas.extended-schema"
  };

  const secondModel = {
    "$id": "configset-alpha.models.second-model",
    "$version": 1,
    "$inheritsFrom": "configset-alpha.schemas.extended-schema"
  };

  const baseSchema = {
    "$id": "configset-alpha.schemas.base-schema",
    "$version": 1,
    "some_prop": "Hello, World"
  };

  const extendedSchema = {
    "$id": "configset-alpha.schemas.extended-schema",
    "$version": 2,
    "$inheritsFrom": "configset-alpha.schemas.base-schema"
  };
});
