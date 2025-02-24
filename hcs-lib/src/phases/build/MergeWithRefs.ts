import { CircularRefError, UnresolvedRefError } from "../../core/errors";
import { Log } from "../../logger";

const LOG_CLS_SHORT = "MergeWithRefs";

export class MergeWithRefs {
  /**
   * 🔍 Merges references (`$ref` and `$refs`) recursively for both models and schemas.
   * - Fully resolves model-to-model references.
   * - Resolves schema references inside schemas.
   * - Preserves schema `$refs` inside models for later validation.
   *
   * @param entity - The entity being merged (schema/model).
   * @param availableEntities - A map of all available schemas and models.
   * @param isSchema - Determines if the entity being merged is a schema.
   * @returns The fully merged entity with resolved references.
   */
  public merge(entity: any, availableEntities: Map<string, any>, isSchema: boolean): any {
    Log.debug(LOG_CLS_SHORT, "merge", `Starting merge for entity: ${entity.$id || "unknown"}`);

    if (!entity.$id || entity.$id.split(".").length < 3 || entity.$id.split(".").length > 4) {
      throw new Error(`Invalid $id format for entity: ${entity.$id}`);
    }

    // Check all the IDs of available entities.  This shouldn't happen, but is critical
    // to guard against
    const allIds = Array.from(availableEntities.keys());
    // Confirm all IDs exist and can be split into 3 or 4 parts
    allIds.forEach((id) => {
      if (id.split(".").length !== 3 && id.split(".").length !== 4) {
        throw new Error("Invalid $id of availableEntites format for entity: " + id);
      }
    })

    const visitedRefs = new Set<string>();
    const entityCopy = JSON.parse(JSON.stringify(entity)); // Ensure deep copy before processing
    Log.debug(LOG_CLS_SHORT, "merge", `Merging ${entity.$id || "unknown"} with available entities: ${allIds.join(", ")}`);
    
    const fullMergedEntity = this.resolveReferences(entityCopy, availableEntities, visitedRefs, isSchema);
    const cleanedEntity = this.cleanRefs(fullMergedEntity);

    Log.debug(LOG_CLS_SHORT, "merge", `Merge completed for entity: ${entity.$id || "unknown"}`);
    return cleanedEntity;
  }

  private resolveReferences(
    obj: any,
    availableEntities: Map<string, any>,
    visitedRefs: Set<string>,
    isSchema: boolean
  ): any {
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    if (obj.$ref) {
      return this.handleSingleRef(obj, availableEntities, visitedRefs, isSchema);
    }

    if (Array.isArray(obj.$refs)) {
      return this.handleMultipleRefs(obj, availableEntities, visitedRefs, isSchema);
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        obj[key] = this.resolveReferences(obj[key], availableEntities, visitedRefs, isSchema);
      }
    }

    return obj;
  }

  private resolveReferenceEntity(
    refId: string,
    availableEntities: Map<string, any>,
    visitedRefs: Set<string>,
    isSchema: boolean
  ): any {
    if (visitedRefs.has(refId)) {
      Log.warn(LOG_CLS_SHORT, "resolveReferenceEntity", `Circular reference detected: ${refId}`);
      throw new CircularRefError(refId);
    }

    const referencedEntity = availableEntities.get(refId);
    if (!referencedEntity) {
      Log.error(LOG_CLS_SHORT, "resolveReferenceEntity", `Unresolved reference: ${refId}`);
      throw new UnresolvedRefError(refId);
    }

    visitedRefs.add(refId);
    return JSON.parse(JSON.stringify(referencedEntity)); // Ensure deep copy
  }

  private handleSingleRef(
    obj: any,
    availableEntities: Map<string, any>,
    visitedRefs: Set<string>,
    isSchema: boolean
  ): any {
    const refId = obj.$ref;
    Log.debug(LOG_CLS_SHORT, "handleSingleRef", `Resolving $ref: ${refId}`);

    if (!isSchema && refId.includes(".schemas.")) {
      Log.debug(LOG_CLS_SHORT, "handleSingleRef", `Preserving schema reference in model: ${refId}`);
      return { ...obj };
    }

    const resolvedRef = this.resolveReferenceEntity(refId, availableEntities, visitedRefs, isSchema);
    const fullyResolvedRef = this.resolveReferences(resolvedRef, availableEntities, visitedRefs, isSchema);
    const mergedObj = this.deepMerge(fullyResolvedRef, JSON.parse(JSON.stringify(obj)));

    Log.debug(LOG_CLS_SHORT, "handleSingleRef", `Merged entity: ${JSON.stringify(mergedObj)}`);
    return mergedObj;
  }

  private handleMultipleRefs(
    obj: any,
    availableEntities: Map<string, any>,
    visitedRefs: Set<string>,
    isSchema: boolean
  ): any {
    let mergedEntity = {};
    let retainedRefs: string[] = [];

    Log.debug(LOG_CLS_SHORT, "handleMultipleRefs", `Resolving multiple $refs: ${obj.$refs.join(", ")}`);

    for (const refId of obj.$refs) {
      if (visitedRefs.has(refId)) {
        Log.warn(LOG_CLS_SHORT, "handleMultipleRefs", `Circular reference detected: ${refId}`);
        throw new CircularRefError(refId);
      }

      if (!isSchema && refId.includes(".schemas.")) {
        retainedRefs.push(refId);
        continue;
      }

      const resolvedRef = this.resolveReferenceEntity(refId, availableEntities, visitedRefs, isSchema);
      const fullyResolvedRef = this.resolveReferences(resolvedRef, availableEntities, visitedRefs, isSchema);
      mergedEntity = this.deepMerge(mergedEntity, fullyResolvedRef);
    }

    const finalMergedEntity = this.deepMerge(mergedEntity, JSON.parse(JSON.stringify(obj)));
    if (!isSchema && retainedRefs.length > 0) {
      finalMergedEntity.$refs = retainedRefs;
    }

    Log.debug(LOG_CLS_SHORT, "handleMultipleRefs", `Final merged entity: ${JSON.stringify(finalMergedEntity)}`);
    return finalMergedEntity;
  }

  private cleanRefs(obj: any): any {
    if (typeof obj !== "object" || obj === null) return obj;

    // Preserve schema references if this is a model
    if (obj.$id && obj.$id.includes(".models.")) {
      Log.debug(LOG_CLS_SHORT, "cleanRefs", `Preserving schema $refs in model: ${obj.$id}`);
      obj.$refs = obj.$refs?.filter((ref: string) => ref.includes(".schemas.")) || [];

      if (obj.$ref && obj.$ref.$id && obj.$ref.$id.includes(".models.")) {
        delete obj.$ref;
      }
    } else {
      delete obj.$ref;
      delete obj.$refs;
    }

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        obj[key] = this.cleanRefs(obj[key]);
      }
    }

    return obj;
  }


  private deepMerge(target: any, source: any): any {
    if (typeof target !== "object" || target === null) return source;
    if (typeof source !== "object" || source === null) return target;

    Log.debug(LOG_CLS_SHORT, "deepMerge", `Merging target: ${JSON.stringify(target)} with source: ${JSON.stringify(source)}`);
    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;

      const sourceValue = source[key];
      const targetValue = target[key];

      if (Array.isArray(sourceValue)) {
        target[key] = sourceValue;
      } else if (typeof sourceValue === "object" && sourceValue !== null) {
        if (Object.keys(sourceValue).length === 0) {
          target[key] = {};
        } else {
          target[key] = this.deepMerge(targetValue && typeof targetValue === "object" ? targetValue : {}, sourceValue);
        }
      } else {
        target[key] = sourceValue;
      }
    }

    Log.debug(LOG_CLS_SHORT, "deepMerge", `Merged target: ${JSON.stringify(target)}`);

    return target;
  }
}
