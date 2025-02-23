import { NodeFs } from "hcs-lib";
import { getConfigSets as libGetConfigSets } from "hcs-lib";

export async function getConfigSets(rootDir?: string) {
  const fs = new NodeFs();
  const searchDir = rootDir || process.cwd(); // Default to current directory

  try {
    const configRoots = await libGetConfigSets([searchDir], fs);
  } catch (error) {
    process.exit(1);
  }
}
