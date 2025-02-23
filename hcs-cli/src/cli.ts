#!/usr/bin/env node
import { Command } from "commander";
import { createConfigSet } from "./commands/create-configset";
import { getConfigSets } from "./commands/get-configsets";
import { createSchema } from "./commands/create-schema";
import { createModel } from "./commands/create-model";
import { validateAllCommand } from "./commands/validate-all";
import { buildAll } from "./commands/build-all";
import { verifyBuild } from "./commands/verify-build";

const program = new Command();

program
  .name("config-cli")
  .description("CLI tool for managing configuration sets")
  .version("1.0.0");

program
  .command("create-configset <path>")
  .description("Create a new configset in the specified directory")
  .action(createConfigSet);

program
  .command("get-configsets [rootDir]") // Use square brackets to make it optional
  .description("List all configsets in the specified root directory (defaults to current directory)")
  .action(getConfigSets);

program
  .command("create-schema <configsetPath> <schemaName>")
  .description("Create a new schema in the specified configset")
  .action(createSchema);

program
  .command("create-model <configsetPath> <modelName>")
  .description("Create a new model in the specified configset")
  .action(createModel);

program
  .command("validate-all <configsetPath>")
  .description("Validate all schemas and models in the specified configset")
  .action(validateAllCommand);

program
  .command("build-all <configsetPath>")
  .description("Process and build all configset files")
  .action(buildAll);

program
  .command("verify-build <configsetPath>")
  .description("Process and build all configset files, but exit w/ exception if any files change.\nUse this in your CI/CD pipeline to force users to update configs before committing.")
  .action(verifyBuild);

program.parse(process.argv);
