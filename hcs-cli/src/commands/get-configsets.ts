import { HcsManager, NodeFs, NodeGit } from "hcs-lib";

export async function getConfigSets(rootDir?: string) {
  const searchDir = rootDir || process.cwd(); // Default to current directory

  const fs = new NodeFs();
  const git = new NodeGit();

  try {
    const hcsManager = new HcsManager([searchDir], fs, git);
    await hcsManager.initialize();
    const configSets = await hcsManager.listConfigSets();

    // Itereate over the config sets and print the name of each
    console.log("Config sets found:");
    configSets.forEach((configSet) => {
      console.log(configSet.name);
    }
    );
  } catch (error) {
    process.exit(1);
  }
}
