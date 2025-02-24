export const CONFIGSET_NAME = "config_test";

export const validInstance = {
    basename: "validInstance",
    filename: "validInstance.json",
    json: {
        "$id": "config_test.instances.validInstance",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$version": 1,
        "type": "object",
        "properties": {
            "name": { "type": "string" }
        }
    },

};

export const validModel = {
    basename: "validModel",
    filename: "validModel.json",
    json: {
        "$id": "config_test.models.validModel",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$ref": "config_test.schemas.validSchema",
        "type": "object",
        "$version": 1,
        "properties": {
            "modelName": { "type": "string" }
        }
    }
};

export const validSchema = {
    basename: "validSchema",
    filename: "validSchema.json",
    json: {
        "$id": "config_test.schemas.validSchema",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "$version": 1,
        "properties": {
            "schemaName": { "type": "string" }
        }
    }
};

// Invalid versions
export const invalidInstance = {
    basename: "invalidInstance",
    filename: "invalidInstance.json",
    json: {
        "$id": "config_test.instances.invalidInstance",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "$version": 1,
        "properties": {
            "name": { "type": 123 } // Invalid type, should be a string
        }
    }
};

export const invalidModel = {
    basename: "invalidModel",
    filename: "invalidModel.json",
    json: {
        "$id": "config_test.models.invalidModel",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "$version": 1,
        "properties": {
            "modelName": { "type": false } // Invalid type, should be a string
        }
    }
};

export const invalidSchema = {
    basename: "invalidSchema",
    filename: "invalidSchema.json",
    json: {
        "$id": "config_test.schemas.invalidSchema",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$version": 1,
        "type": "invalidType" // Invalid type specification
    }
};