import { suite, suiteSetup, suiteTeardown, test } from "mocha";
import { findFieldPositionInFile } from "../../utils/findElementInJSON";

suite("findFieldPositionInFile", function () {
    let chai: any;
    let expect: any;

    this.timeout(10000);

    suiteSetup(async () => {
        chai = await import("chai");
        expect = chai.expect;
    });

    const jsonContent = {
        $id: "foo.models.biz",
        name: "Test Model",
        $ref: "foo.schemas.bar",
        nested: {
            key: "value",
        },
        numberField: 42,
    };

    /**
     * ✅ Tests key positions
     */
    test("should find the correct position of a string key", function () {
        const position = findFieldPositionInFile(jsonContent, "name", false);
        console.log("Position of 'name' key:", position);
        expect(position.line).to.be.greaterThan(0);
        expect(position.startChar).to.be.greaterThan(0);
        expect(position.endChar).to.be.greaterThan(position.startChar);
    });

    test("should find the correct position of a key with special character ($id)", function () {
        const position = findFieldPositionInFile(jsonContent, "$id", false);
        console.log("Position of '$id' key:", position);
        expect(position.line).to.be.greaterThan(0);
        expect(position.startChar).to.be.greaterThan(0);
        expect(position.endChar).to.be.greaterThan(position.startChar);
    });

    test("should find the correct position of a key inside a nested object", function () {
        const position = findFieldPositionInFile(jsonContent, "key", false);
        console.log("Position of 'key' in nested object:", position);
        expect(position.line).to.be.greaterThan(0);
        expect(position.startChar).to.be.greaterThan(0);
        expect(position.endChar).to.be.greaterThan(position.startChar);
    });

    /**
     * ✅ Tests value positions
     */
    test("should find the correct position of a string value", function () {
        const position = findFieldPositionInFile(jsonContent, "Test Model", true);
        console.log("Position of 'Test Model' value:", position);
        expect(position.line).to.be.greaterThan(0);
        expect(position.startChar).to.be.greaterThan(0);
        expect(position.endChar).to.be.greaterThan(position.startChar);
    });

    test("should find the correct position of a reference value", function () {
        const position = findFieldPositionInFile(jsonContent, "foo.schemas.bar", true);
        console.log("Position of 'foo.schemas.bar' value:", position);
        expect(position.line).to.be.greaterThan(0);
        expect(position.startChar).to.be.greaterThan(0);
        expect(position.endChar).to.be.greaterThan(position.startChar);
    });

    test("should find the correct position of a numeric value", function () {
        const position = findFieldPositionInFile(jsonContent, "42", true);
        console.log("Position of '42' value:", position);
        expect(position.line).to.be.greaterThan(0);
        expect(position.startChar).to.be.greaterThan(0);
        expect(position.endChar).to.be.greaterThan(position.startChar);
    });

    test("should find the correct position of a nested value", function () {
        const position = findFieldPositionInFile(jsonContent, "value", true);
        console.log("Position of 'value' in nested object:", position);
        expect(position.line).to.be.greaterThan(0);
        expect(position.startChar).to.be.greaterThan(0);
        expect(position.endChar).to.be.greaterThan(position.startChar);
    });

    /**
     * ❌ Edge Cases: Should handle non-existent fields gracefully
     */
    test("should return default position for a non-existent key", function () {
        const position = findFieldPositionInFile(jsonContent, "nonExistentKey", false);
        console.log("Position of non-existent key:", position);
        expect(position.line).to.equal(0);
        expect(position.startChar).to.equal(0);
        expect(position.endChar).to.equal(0);
    });

    test("should return default position for a non-existent value", function () {
        const position = findFieldPositionInFile(jsonContent, "nonExistentValue", true);
        console.log("Position of non-existent value:", position);
        expect(position.line).to.equal(0);
        expect(position.startChar).to.equal(0);
        expect(position.endChar).to.equal(0);
    });
});
