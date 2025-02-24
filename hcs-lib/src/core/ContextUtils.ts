import { PipelineContext } from "./interfaces/PipelineContext";

export class ContextUtils {
  static setPhaseData<T>(
    context: PipelineContext,
    phase: string,
    resourceType: string,
    resourceId: string,
    value: T
  ): void {
    context.data.set(`${phase}:${resourceType}:${resourceId}`, {
      value,
      timestamp: Date.now(),
    });
  }

  static getPhaseData<T>(
    context: PipelineContext,
    phase: string,
    resourceType: "models" | "schemas" | "instances",
    resourceId: string
  ): T | null {
    const entry = context.data.get(`${phase}:${resourceType}:${resourceId}`);
    return entry ? (entry.value as T) : null;
  }
}
