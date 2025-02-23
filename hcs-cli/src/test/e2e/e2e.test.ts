import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { execa } from "execa";
import * as path from "path";
import * as fs from "fs/promises";

const CLI_PATH = path.resolve(__dirname, "../../../dist/cli.js"); // Use the built CLI

suite("E2E: CLI Tests", () => {
  const testDir = path.join(__dirname, "cli_test");
  const modelName = "testModel";
  const schemaName = "testSchema";
  let chai: any;
  let expect: any;

  suiteSetup(async () => {
    chai = await import("chai");
    expect = chai.expect;
  });

  setup(async () => {
    console.log("📝 Resetting test directory...");
    await fs.rm(testDir, { recursive: true, force: true });
  });

  suiteTeardown(async () => {
    console.log("🧹 Cleaning up test directory...");
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test("should create a new configset", async () => {
    const { stdout } = await execa("node", [CLI_PATH, "create-configset", testDir]);
    const outputLines = stdout.split("\n");
    expect(outputLines).to.satisfy((lines: string[]) => lines.some(line => line.includes("Created config set")));

    // Confirm configset directory exists
    const exists = await fs.stat(testDir).then(() => true).catch(() => false);
    expect(exists).to.be.true;
  });

  test("should list configsets", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    const { stdout } = await execa("node", [CLI_PATH, "get-configsets", testDir]);
    expect(stdout).to.include(testDir);
  });

  test("should create a new model", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    const modelPath = path.join(testDir, "models", `${modelName}.json`);

    const { stdout } = await execa("node", [CLI_PATH, "create-model", testDir, modelName]);
    expect(stdout).to.include("Successfully created");

    // Validate file exists
    const exists = await fs.stat(modelPath).then(() => true).catch(() => false);
    expect(exists).to.be.true;

    // Read file and validate JSON content
    const content = await fs.readFile(modelPath, "utf-8");
    const json = JSON.parse(content);
    expect(json).to.have.property("$id");
    expect(json).to.have.property("$version", 1);
  });

  test("should create a new schema", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    const schemaPath = path.join(testDir, "schemas", `${schemaName}.json`);

    const { stdout } = await execa("node", [CLI_PATH, "create-schema", testDir, schemaName]);
    expect(stdout).to.include("Successfully created");

    // Validate file exists
    const exists = await fs.stat(schemaPath).then(() => true).catch(() => false);
    expect(exists).to.be.true;

    // Read file and validate JSON content
    const content = await fs.readFile(schemaPath, "utf-8");
    const json = JSON.parse(content);
    expect(json).to.have.property("$id");
    expect(json).to.have.property("$version", 1);
  });

  test("should pass validation when all config files are valid", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    await execa("node", [CLI_PATH, "create-model", testDir, modelName]);
    await execa("node", [CLI_PATH, "create-schema", testDir, schemaName]);

    const { exitCode } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });

    expect(exitCode).to.equal(0);
  });

  test("should fail validation when schema is invalid", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    await execa("node", [CLI_PATH, "create-model", testDir, modelName]);

    // Create an invalid schema file
    const schemaPath = path.join(testDir, "schemas", "invalidSchema.json");
    const invalidSchema = { "$id": "invalidSchema.json", "type": "invalidType" };
    await fs.writeFile(schemaPath, JSON.stringify(invalidSchema, null, 2));

    const { exitCode, stderr } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });

    expect(exitCode).to.not.equal(0);
  });

  test("should fail validation when model is invalid", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    await execa("node", [CLI_PATH, "create-schema", testDir, schemaName]);

    // Create an invalid model file
    const modelPath = path.join(testDir, "models", "invalidModel.json");
    const invalidModel = { "$id": "invalidModel.json", "type": "invalidType" };
    await fs.writeFile(modelPath, JSON.stringify(invalidModel, null, 2));

    const { exitCode, stderr } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });

    expect(exitCode).to.not.equal(0);
  });

  test("should fail validation when instance is invalid", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    await execa("node", [CLI_PATH, "create-model", testDir, modelName]);

    // Create an invalid instance file
    const instancePath = path.join(testDir, "instances", "invalidInstance.json");
    const invalidInstance = { "$id": "invalidInstance.json", "type": "invalidType" };
    await fs.writeFile(instancePath, JSON.stringify(invalidInstance, null, 2));

    const { exitCode, stderr } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });

    expect(exitCode).to.not.equal(0);
  });

  test("should fail validation when all categories contain invalid files", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);

    // Create invalid schema, model, and instance files
    const invalidSchema = { "$id": "invalidSchema.json", "type": "invalidType" };
    const invalidModel = { "$id": "invalidModel.json", "type": "invalidType" };
    const invalidInstance = { "$id": "invalidInstance.json", "type": "invalidType" };

    await fs.writeFile(path.join(testDir, "schemas", "invalidSchema.json"), JSON.stringify(invalidSchema, null, 2));
    await fs.writeFile(path.join(testDir, "models", "invalidModel.json"), JSON.stringify(invalidModel, null, 2));
    await fs.writeFile(path.join(testDir, "instances", "invalidInstance.json"), JSON.stringify(invalidInstance, null, 2));

    const { exitCode, stderr } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });

    expect(exitCode).to.not.equal(0);
  });

  test("should fail validation when some files are valid but others are invalid", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    await execa("node", [CLI_PATH, "create-model", testDir, modelName]);
    await execa("node", [CLI_PATH, "create-schema", testDir, schemaName]);

    // Create an invalid instance file
    const instancePath = path.join(testDir, "instances", "invalidInstance.json");
    const invalidInstance = { "$id": "invalidInstance.json", "type": "invalidType" };
    await fs.writeFile(instancePath, JSON.stringify(invalidInstance, null, 2));

    const { exitCode, stderr } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });

    expect(exitCode).to.not.equal(0);
  });

  
  test("should fail verify-build after creating a new schema", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    await execa("node", [CLI_PATH, "create-model", testDir, modelName]);
    await execa("node", [CLI_PATH, "create-schema", testDir, schemaName]);

    // First build (to settle state)
    await execa("node", [CLI_PATH, "build-all", testDir]);

    // Add a new schema
    const newSchema = {
      "$id": "newSchema.json",
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "title": { "type": "string" }
      }
    };
    await createSchemaFile("newSchema", newSchema);

    // Run verify-build and expect failure
    const { exitCode, stderr } = await execa("node", [CLI_PATH, "verify-build", testDir], {
      reject: false,
    });

    expect(exitCode).to.not.equal(0);
    expect(stderr).to.include("Build failed due to validation or processing errors");

    // Clean up the added schema
    const schemaPath = path.join(testDir, "schemas", "newSchema.json");
    await fs.rm(schemaPath);
  });

  test("should fail verify-build if an invalid schema exists", async () => {
    await execa("node", [CLI_PATH, "create-configset", testDir]);
    await execa("node", [CLI_PATH, "create-model", testDir, modelName]);

    // Add an invalid schema
    const invalidSchema = {
      "$id": "invalidSchema.json",
      "type": "invalidType"
    };
    await createSchemaFile("invalidSchema", invalidSchema);

    // Run verify-build and expect failure
    const { exitCode, stderr } = await execa("node", [CLI_PATH, "verify-build", testDir], {
      reject: false
    });

    expect(exitCode).to.not.equal(0);
    expect(stderr).to.include("Build failed due to validation or processing errors");
  });

  async function createSchemaFile(fileName: string, schemaContent: any) {
    const schemaDir = path.join(testDir, "schemas");
    await fs.mkdir(schemaDir, { recursive: true });
    const schemaPath = path.join(schemaDir, `${fileName}.json`);
    await fs.writeFile(schemaPath, JSON.stringify(schemaContent, null, 2));
  }
});
