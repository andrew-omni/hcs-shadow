import { NodeFs } from "hcs-lib";
import { createConfigSet as libCreateConfigSet} from "hcs-lib";

export async function createConfigSet(path: string) {
  const fs = new NodeFs();
  const nodeFs = new NodeFs();

  try {
    await libCreateConfigSet(path, nodeFs);
  } catch (error) {
    console.error(`❌ Error creating configset:`, error);
    process.exit(1);
  }
}
