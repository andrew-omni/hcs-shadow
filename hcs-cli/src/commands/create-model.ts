import { HcsManager, NodeFs, NodeGit } from "hcs-lib";

export async function createModel(configsetPath: string, modelName: string) {
  const fs = new NodeFs();
  const git = new NodeGit();
  
  try {
    const hcsManager = new HcsManager([configsetPath], fs, git);
    await hcsManager.initialize();
    const configSets = await hcsManager.listConfigSets();

    if (configSets.length === 0) {
      console.error(`❌ No config sets found in ${configsetPath}.`);
      process.exit(1);
    }

    if (configSets.length > 1) {
      console.error(`❌ Multiple config sets found in ${configsetPath}.`);
      process.exit(1);
    }

    const configSet = configSets[0];
    await hcsManager.createModelInConfigSet(configSet, modelName);
  } catch (error) {
    process.exit(1);
  }
}
