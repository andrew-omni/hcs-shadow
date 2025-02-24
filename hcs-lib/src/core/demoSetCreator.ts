import { HcsManager } from "./HcsManager";
export const DEMO_CONFIGSET_NAME: string = 'hcs-demo-configset';

export async function createDemoFiles(hcsManager: HcsManager) {
    const configSet = await hcsManager.createConfigSet(DEMO_CONFIGSET_NAME);

    await configSet.createSchema('base-schema', baseSchema);
    await configSet.createSchema('extended-schema', extendedSchema)
    await configSet.createModel('base-model', baseModel);
    await configSet.createModel('extended-model', extendedModel);
}

export const baseSchema = {
    $id: 'hcs-demo-configset.schemas.base-schema',
    $version: 1,
    properties: {
        some_prop: {
            type: 'string',
            description: 'A property for the base schema',
        },
    },
};


export const baseModel = {
    $id: 'hcs-demo-configset.models.base-model',
    $version: 1,
    $ref: 'hcs-demo-configset.schemas.base-schema',
    some_prop: "Example value in base-model",
};


export const extendedSchema = {
    $id: 'hcs-demo-configset.schemas.extended-schema',
    $version: 1,
    $inheritsFrom: 'hcs-demo-configset.schemas.base-schema',
    properties: {
        name: {
            type: 'string',
            description: 'The name of the entity',
        },
    },
};

export const extendedModel = {
    $id: 'hcs-demo-configset.models.extended-model',
    $version: 1,
    $refs: [
        'hcs-demo-configset.schemas.extended-schema',
        'hcs-demo-configset.models.base-model'
    ],
    // Will inherit some_prop from base_model
    name: "Name from extended-model",
};

export const expectedBaseInstance = {
    $id: 'hcs-demo-configset.instances.base-model',
    $version: 1,
    some_prop: "Example value in base-model",
};

export const expectedExtendedInstance = {
    $id: 'hcs-demo-configset.instances.extended-model',
    $version: 1,
    some_prop: "Example value in base-model",
    name: "Name from extended-model",
};




