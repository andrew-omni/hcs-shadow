import { NodeFs, ConfigSetManager, ConfigSet } from "hcs-lib";

export async function createModel(configsetPath: string, modelName: string) {
  const fsAdapter = new NodeFs();
  
  const configSet = await ConfigSet.loadConfigSet(configsetPath, fsAdapter);
  const hcsManager = new ConfigSetManager(configSet, fsAdapter);
  const configManager = hcsManager.getModelManager();

  try {
    await configManager.create(modelName);
  } catch (error) {
    process.exit(1);
  }
}
