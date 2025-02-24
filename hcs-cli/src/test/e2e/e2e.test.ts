import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { execa } from "execa";
import * as path from "path";
import * as fs from "fs/promises";

const CLI_PATH = path.resolve(__dirname, "../../../dist/cli.js"); // Use the built CLI

suite("E2E: CLI Tests", () => {
  const CONFIG_SET_NAME = "cli_test";
  const testDir = path.join(__dirname, "../../../", CONFIG_SET_NAME);
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
    const { stdout } = await execa("node", [CLI_PATH, "create-configset", CONFIG_SET_NAME]);
    const outputLines = stdout.split("\n");
    expect(outputLines).to.satisfy((lines: string[]) => lines.some(line => line.includes("Created config set")));

    // Confirm configset directory exists
    const exists = await fs.stat(testDir).then(() => true).catch(() => false);
    expect(exists).to.be.true;
  });

  test("should list configsets", async () => {
    await execa("node", [CLI_PATH, "create-configset", CONFIG_SET_NAME]);
    const { stdout } = await execa("node", [CLI_PATH, "get-configsets", testDir]);
    expect(stdout).to.include("cli_test");
  });

  test("should create a new model", async () => {
    await execa("node", [CLI_PATH, "create-configset", CONFIG_SET_NAME]);
    const modelPath = path.join(testDir, "models", `${modelName}.json`);

    const { stdout } = await execa("node", [CLI_PATH, "create-model", CONFIG_SET_NAME, modelName]);
    expect(stdout).to.include("Created model");

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
    await execa("node", [CLI_PATH, "create-configset", CONFIG_SET_NAME]);
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
    await execa("node", [CLI_PATH, "create-configset", CONFIG_SET_NAME]);
    await execa("node", [CLI_PATH, "create-model", CONFIG_SET_NAME, modelName]);
    await execa("node", [CLI_PATH, "create-schema", testDir, schemaName]);

    const { exitCode, stdout, stderr } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);

    expect(exitCode).to.equal(0);
  });

  // We are testing that a failed validation causes the CLI to exit w/ non-zero
  test("should fail when validation fails", async () => {
    await execa("node", [CLI_PATH, "create-configset", CONFIG_SET_NAME]);
    await execa("node", [CLI_PATH, "create-schema", testDir, schemaName]);

    // Create an invalid model file
    const modelPath = path.join(testDir, "models", "invalidModel.json");
    const invalidModel = { "$id": `${CONFIG_SET_NAME}.models.invalidModel`, "type": "invalidType" };
    await fs.writeFile(modelPath, JSON.stringify(invalidModel, null, 2));

    const { exitCode, stdout, stderr } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);
    expect(exitCode).to.not.equal(0);
  });

  test("should fail validation when all categories contain invalid files", async () => {
    await execa("node", [CLI_PATH, "create-configset", CONFIG_SET_NAME]);

    // Create invalid schema, model, and instance files
    const invalidSchema = { "$id": "invalidSchema.json", "type": "invalidType" };
    const invalidModel = { "$id": "invalidModel.json", "type": "invalidType" };
    const invalidInstance = { "$id": "invalidInstance.json", "type": "invalidType" };

    await fs.writeFile(path.join(testDir, "schemas", "invalidSchema.json"), JSON.stringify(invalidSchema, null, 2));
    await fs.writeFile(path.join(testDir, "models", "invalidModel.json"), JSON.stringify(invalidModel, null, 2));
    await fs.writeFile(path.join(testDir, "instances", "invalidInstance.json"), JSON.stringify(invalidInstance, null, 2));

    const { exitCode, stdout, stderr } = await execa("node", [CLI_PATH, "validate-all", testDir], { reject: false });
    console.log("stdout:", stdout);
    console.log("stderr:", stderr);
    expect(exitCode).to.not.equal(0);
  });

  test("should fail verify-build if an invalid schema exists", async () => {
    await execa("node", [CLI_PATH, "create-configset", CONFIG_SET_NAME]);
    await execa("node", [CLI_PATH, "create-model", CONFIG_SET_NAME, modelName]);

    // Add an invalid schema
    const invalidSchema = {
      "$id": "invalidSchema.json",
      "type": "invalidType"
    };
    await createSchemaFile("invalidSchema", invalidSchema);

    // Run verify-build and expect failure
    const { exitCode, stdout, stderr } = await execa("node", [CLI_PATH, "verify-build", CONFIG_SET_NAME], {
      reject: false
    });

    console.log("stdout:", stdout);
    console.log("stderr:", stderr);
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
