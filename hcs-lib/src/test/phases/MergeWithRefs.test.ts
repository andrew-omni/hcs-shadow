import { suite, suiteSetup, suiteTeardown, setup, test } from "mocha";
import { MergeWithRefs } from "../../phases/build/MergeWithRefs";
import { CircularRefError, UnresolvedRefError } from "../../core/errors";
import { Log } from "../../logger";

suite("MergeWithRefs: Test Suite", function () {
    let mergeWithRefs: MergeWithRefs;
    let availableEntities: Map<string, any>;
    let chai: any;
    let expect: any;

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
        mergeWithRefs = new MergeWithRefs();
    });

    setup(() => {
        Log.setLevel('silly');

        availableEntities = new Map<string, any>();
        availableEntities.set("mergewithrefs.schemas.base", {
            $id: "mergewithrefs.schemas.base",
            value: "BaseValue",
            nested: {
                propA: "A",
                propB: "B",
            },
        });
        availableEntities.set("mergewithrefs.schemas.extended", {
            $id: "mergewithrefs.schemas.extended",
            $ref: "mergewithrefs.schemas.base",
            extra: "ExtendedValue",
            nested: {
                propB: "OverriddenB",
                propC: "C",
            },
        });
    });

    test("should resolve a valid $ref correctly", () => {
        const entity = {
            $id: "mergewithrefs.schemas.testEntity",
            $ref: "mergewithrefs.schemas.base",
            additional: "AdditionalValue",
        };
        const merged = mergeWithRefs.merge(entity, availableEntities, true);

        expect(merged).to.deep.equal({
            $id: "mergewithrefs.schemas.testEntity", // Retains source entity's ID
            value: "BaseValue",
            nested: {
                propA: "A",
                propB: "B",
            },
            additional: "AdditionalValue",
        });
    });

    test("should throw an error for unresolved $ref", () => {
        const entity = {
            $id: "mergewithrefs.schemas.unknownEntity",
            $ref: "mergewithrefs.schemas.unknown"
        };

        expect(() => {
            mergeWithRefs.merge(entity, availableEntities, true);
        }).to.throw(UnresolvedRefError);
    });

    test("should resolve nested $refs recursively", () => {
        const nestedEntity = {
            $id: "mergewithrefs.schemas.nestedTestEntity",
            $ref: "mergewithrefs.schemas.extended",
            additional: "NestedValue",
        };
        const merged = mergeWithRefs.merge(nestedEntity, availableEntities, true);

        expect(merged).to.deep.equal({
            $id: "mergewithrefs.schemas.nestedTestEntity",
            value: "BaseValue",
            nested: {
                propA: "A",
                propB: "OverriddenB",
                propC: "C",
            },
            extra: "ExtendedValue",
            additional: "NestedValue",
        });
    });

    test("should detect circular $ref and throw an error", () => {
        availableEntities.set("mergewithrefs.schemas.circularA", {
            $id: "mergewithrefs.schemas.circularA",
            $ref: "mergewithrefs.schemas.circularB"
        });
        availableEntities.set("mergewithrefs.schemas.circularB", {
            $id: "mergewithrefs.schemas.circularB",
            $ref: "mergewithrefs.schemas.circularA"
        });

        const circularEntity = {
            $id: "mergewithrefs.schemas.circularTestEntity",
            $ref: "mergewithrefs.schemas.circularA"
        };

        expect(() => {
            mergeWithRefs.merge(circularEntity, availableEntities, true);
        }).to.throw(CircularRefError);
    });

    test("should handle objects without $ref correctly", () => {
        const entity = {
            $id: "mergewithrefs.schemas.objectEntity",
            simple: "object",
        };
        const merged = mergeWithRefs.merge(entity, availableEntities, false);

        expect(merged).to.deep.equal({
            $id: "mergewithrefs.schemas.objectEntity",
            simple: "object"
        });
    });

    test("should merge nested objects correctly", () => {
        const entity = {
            $id: "mergewithrefs.schemas.nestedMergeEntity",
            $ref: "mergewithrefs.schemas.extended",
            nested: {
                propC: "OverriddenC",
                propD: "NewD",
            },
        };

        const merged = mergeWithRefs.merge(entity, availableEntities, true);

        expect(merged).to.deep.equal({
            $id: "mergewithrefs.schemas.nestedMergeEntity",
            value: "BaseValue",
            nested: {
                propA: "A",
                propB: "OverriddenB",
                propC: "OverriddenC",
                propD: "NewD",
            },
            extra: "ExtendedValue",
        });
    });

    test("should override existing values in target", () => {
        const entity = {
            $id: "mergewithrefs.schemas.overrideEntity",
            $ref: "mergewithrefs.schemas.extended",
            value: "NewBaseValue",
            extra: "OverriddenExtra",
        };

        const merged = mergeWithRefs.merge(entity, availableEntities, true);

        expect(merged).to.deep.equal({
            $id: "mergewithrefs.schemas.overrideEntity",
            value: "NewBaseValue",
            nested: {
                propA: "A",
                propB: "OverriddenB",
                propC: "C",
            },
            extra: "OverriddenExtra",
        });
    });

    test("should retain schema references for models", () => {
        Log.setLevel('silly');
        const entity = {
            $id: "mergewithrefs.models.newModel",
            $refs: ["mergewithrefs.schemas.extended", "mergewithrefs.schemas.base"],
            data: { id: "123" },
        };

        const merged = mergeWithRefs.merge(entity, availableEntities, false);

        expect(merged).to.deep.equal({
            $id: "mergewithrefs.models.newModel",
            $refs: ["mergewithrefs.schemas.extended", "mergewithrefs.schemas.base"],
            data: { id: "123" }
        });
    });


    test("should fully extend and keep schemas", () => {
        Log.setLevel('silly');
        const entity = {
            $id: "mergewithrefs.models.newModel",
            // A bit fake as extended would probably be on the extended model already, but
            // shows we inherit model stats and retain schema refs
            $refs: ["mergewithrefs.schemas.extended", "mergewithrefs.models.extendeded"],
            data: { id: "123" },
        };

        const extendedEntity = {
            $id: "mergewithrefs.models.extendeded",
            value: "BaseValue",
            nested: {
                propA: "A",
                propB: "OverriddenB",
                propC: "C",
            },
            extra: "ExtendedValue"
        };
        availableEntities.set("mergewithrefs.models.extendeded", extendedEntity);

        const merged = mergeWithRefs.merge(entity, availableEntities, false);

        expect(merged).to.deep.equal({
            $id: "mergewithrefs.models.newModel",
            $refs: ["mergewithrefs.schemas.extended"],
            value: "BaseValue",
            nested: {
                propA: "A",
                propB: "OverriddenB",
                propC: "C",
            },
            extra: "ExtendedValue",
            data: { id: "123" },
        });
    });
});
