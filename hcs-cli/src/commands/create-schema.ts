import { NodeFs, ConfigSetManager, ConfigSet } from "hcs-lib";

export async function createSchema(configsetPath: string, schemaName: string) {
  const fsAdapter = new NodeFs();
  
  const configSet = await ConfigSet.loadConfigSet(configsetPath, fsAdapter);
  const hcsManager = new ConfigSetManager(configSet, fsAdapter);
  const configManager = hcsManager.getSchemaManager();

  try {
    await configManager.create(schemaName);
  } catch (error) {
    process.exit(1);
  }
}
