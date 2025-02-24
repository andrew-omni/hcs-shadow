import { PipelineManager } from './PipelineManager';
import { ConfigSetManager } from './ConfigSetManager';
import { CacheManager } from './CacheManager';
import { Phase } from './interfaces/Phase';
import { ConfigSet } from './ConfigSet';
import { FsAdapter } from '../fs/fsAdapter';
import { PipelineResult, PipelineResults } from './interfaces/PipelineResult';
import { Log } from '../logger';

// Default Phases & Strategies
import { IngestPhase } from '../phases/ingest/IngestPhase';
import { FileSystemIngestStrategy } from '../phases/ingest/FileSystemIngestStrategy';
import { ConversionPhase } from '../phases/conversion/ConversionPhase';
import { DefaultConversionStrategy } from '../phases/conversion/DefaultConversionStrategy';
import { ValidationPhase } from '../phases/validation/ValidationPhase';
import { DefaultValidationStrategy } from '../phases/validation/DefaultValidationStrategy';
import { BuildPhase } from '../phases/build/BuildPhase';
import { DefaultBuildStrategy } from '../phases/build/DefaultBuildStrategy';
import { VerificationPhase } from '../phases/verification/VerificationPhase';
import { DefaultVerificationStrategy } from '../phases/verification/DefaultVerificationStrategy';
import { ProblemResolutionPhase } from '../phases/problem-resolution/ProblemResolutionPhase';
import { DefaultProblemResolutionStrategy } from '../phases/problem-resolution/DefaultProblemResolutionStrategy';
import { VersioningPhase } from '../phases/versioning/VersioningPhase';
import { DefaultVersioningStrategy } from '../phases/versioning/DefaultVersioningStrategy';
import { OutputConversionPhase } from '../phases/output-conversion/OutputConversionPhase';
import { DefaultOutputConversionStrategy } from '../phases/output-conversion/DefaultOutputConversionStrategy';
import { SerializationPhase } from '../phases/serialization/SerializationPhase';
import { DefaultSerializationStrategy } from '../phases/serialization/DefaultSerializationStrategy';
import { PipelineContext } from './interfaces/PipelineContext';
import { GitAdapter } from '../git/gitAdapter';
import { createDemoFiles } from './demoSetCreator';
import { ValidationError } from './interfaces/ValidationError';

export class HcsManager {
    private pipelineManager: PipelineManager;
    private configSetManager: ConfigSetManager;
    private cacheManager: CacheManager;
    private isInitialized = false;
    private fsAdapter: FsAdapter;
    private gitAdapter: GitAdapter;
    private paths: string[];

    constructor(paths: string[], fsAdapter: FsAdapter, gitAdapter: GitAdapter, useDefaultPipeline = true) {
        Log.setLevel("verbose");

        this.paths = paths;
        this.fsAdapter = fsAdapter;
        this.gitAdapter = gitAdapter;
        this.configSetManager = new ConfigSetManager(this.fsAdapter);
        this.cacheManager = new CacheManager();
        this.pipelineManager = new PipelineManager(this.configSetManager, this.cacheManager);

        // Automatically register default phases if required
        if (useDefaultPipeline) {
            this.registerDefaultPipeline();
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    public async initialize(): Promise<void> {
        Log.info('HcsManager', 'init', 'Initializing HCS Manager for path locations: [ ' + this.paths.join(', ') + ' ]');
        await this.configSetManager.discoverConfigSets(this.paths);
        this.isInitialized = true;
    }

    /**
     * Registers all default phases with their default strategies.
     */
    private registerDefaultPipeline(): void {
        Log.debug('HcsManager', 'dp', 'Registering default pipeline phases...');
        this.registerPhase(new IngestPhase(new FileSystemIngestStrategy(this.fsAdapter)));
        this.registerPhase(new ConversionPhase(new DefaultConversionStrategy()));
        this.registerPhase(new ValidationPhase(new DefaultValidationStrategy()));
        this.registerPhase(new BuildPhase(new DefaultBuildStrategy()));
        this.registerPhase(new VerificationPhase(new DefaultVerificationStrategy()));
        this.registerPhase(new ProblemResolutionPhase(new DefaultProblemResolutionStrategy()));
        this.registerPhase(new VersioningPhase(new DefaultVersioningStrategy(this.fsAdapter, this.gitAdapter)));
        this.registerPhase(new OutputConversionPhase(new DefaultOutputConversionStrategy()));
        this.registerPhase(new SerializationPhase(new DefaultSerializationStrategy(this.fsAdapter)));
    }

    /**
     * Allows consumers to register custom phases.
     */
    registerPhase(phase: Phase): void {
        this.pipelineManager.registerPhase(phase);
        Log.debug('HcsManager', 'rp', `Registered phase: ${phase.constructor.name}`);
    }

    async runPipelineForModel(modelId: string): Promise<PipelineResult> {
        await this.ensureInitialized();
        Log.verbose('HcsManager', 'rpm', `Running pipeline for model ID: ${modelId}`);

        // Confirm the model exists in a known config set
        const configSet = this.configSetManager.getConfigSetByResourceId(modelId);

        if (!configSet) {
            throw new Error(`Model ID ${modelId} not found in any config set.`);
        }

        const context: PipelineContext = {
            hcsManager: this,
            modelId,
            configSet,
            data: new Map(),
            errors: [],
        };

        await this.pipelineManager.executePipeline(context);

        // Return the result including any errors encountered
        return {
            modelId,
            success: context.errors.length === 0,
            errors: context.errors.length ? context.errors : [],
        };
    }

    async runPipelineForAll(failOnFileChanges: boolean = false): Promise<PipelineResults> {
        // Re-init the configsets, etc.  Rescans disk.
        await this.initialize();

        if (failOnFileChanges) {
            throw new Error('Not implemented: failOnFileChanges');
        }

        const configSets = this.configSetManager.getConfigSets();

        if (configSets.length === 0) {
            throw new Error('No config sets found.  Try creating one before running the pipeline.');
        }

        const results: PipelineResult[] = [];

        const configSetNames = configSets.map((configSet) => configSet.absolutePath).join(', ');
        Log.info('HcsManager', 'rpf', `Running pipelines for all models in config sets: [ ${configSetNames} ]`);

        for (const configSet of configSets) {
            // Iterate through model IDs from modelIdsToAbsPathMap
            const modelIds = Array.from(configSet.modelIdsToAbsPathMap.keys());
            if (modelIds.length === 0) {
                Log.warn('HcsManager', 'rpf', `No models found in config set: ${configSet.name}`);
                continue;
            }

            for (const modelId of modelIds) {
                const result = await this.runPipelineForModel(modelId);
                results.push(result);
            }
        }

        // Determine if any errors occurred during the pipeline execution
        const hasErrors = results.some((result) => !result.success);

        if (hasErrors) {
            Log.warn('HcsManager', 'rpf', `Pipeline completed with errors.`);

            // Some errors are registered as duplicates - a derived model fails against the schema as does the parent
            // Remove duplicate errors based on resource (file path) + message
            const uniqueErrors = new Set<string>();
            const deduplicatedErrors: ValidationError[] = [];

            results.forEach((result) => {
                if (!result.success && result.errors) {
                    // Log.error("HcsManager", "rpf", `Errors for model ID: ${result.modelId}`);

                    result.errors.forEach((error) => {
                        // Create a unique key using both resource (file path) and message
                        const errorKey = `${error.filePath}::${error.message}`;

                        if (!uniqueErrors.has(errorKey)) {
                            uniqueErrors.add(errorKey);
                            deduplicatedErrors.push(error);
                            // Log.error("HcsManager", "rpf", `  ${error.message} (File: ${error.filePath})`);
                        }
                    });

                    // Replace original errors with deduplicated list
                    result.errors = deduplicatedErrors;
                }
            });
            console.log(JSON.stringify(uniqueErrors, null, 2));
            console.log(JSON.stringify(deduplicatedErrors, null, 2));
            console.log(JSON.stringify(results, null, 2));
            for (const result of results) {
                Log.error('HcsManager', 'rpf', `Errors for model ID: ${result.modelId}`);
                result.errors!.forEach((error) => {
                    Log.error('HcsManager', 'rpf', `  ${error.message}`);
                });
            }
        } else {
            Log.info('HcsManager', 'rpf', `Pipeline completed successfully.`);
        }
        await this.initialize();
        return {
            results,
            hasErrors,
        };
    }

    /**
     * Clears the internal cache for all models.
     */
    clearCache(): void {
        this.cacheManager.clearCache();
        Log.info('HcsManager', 'cc', 'Cleared all cached data.');
    }

    /**
     * Lists all discovered configuration sets.
     */
    async listConfigSets(): Promise<ConfigSet[]> {
        await this.ensureInitialized();
        return this.configSetManager.getConfigSets();
    }

    /**
     * Creates a new ConfigSet and registers it.
     */
    async createConfigSet(name: string): Promise<ConfigSet> {
        await this.ensureInitialized();
        const configSetPath = `${this.paths[0]}/${name}`;
        Log.info('HcsManager', 'ccs', `Creating new ConfigSet: ${name} at ${configSetPath}`);
        return await this.configSetManager.createConfigSet(configSetPath, this.fsAdapter);
    }

    /**
     * Creates a schema in the given ConfigSet.
     */
    async createSchemaInConfigSet(configSet: ConfigSet, schemaName: string): Promise<string> {
        await this.ensureInitialized();
        return await configSet.createSchema(schemaName);
    }

    /**
     * Creates a model in the given ConfigSet.
     */
    async createModelInConfigSet(configSet: ConfigSet, modelName: string): Promise<string> {
        await this.ensureInitialized();
        return await configSet.createModel(modelName);
    }

    async getConfigSetByResourceId(id: string): Promise<ConfigSet | null> {
        await this.ensureInitialized();
        return this.configSetManager.getConfigSetByResourceId(id);
    }

    // Works only if file has been ingested into configset already
    async resolveAbsPathFromId(id: string): Promise<string> {
        await this.ensureInitialized();
        return this.configSetManager.resolveAbsPathFromId(id);
    }

    // Works regardless of if file exists or not
    async buildFilePathById(id: string): Promise<string> {
        await this.ensureInitialized();
        return this.configSetManager.buildAbsFilePathById(id);
    }

    getConfigSetByName(name: string): ConfigSet | null {
        return this.configSetManager.getConfigSetByName(name);
    }

    getConfigSetManager(): ConfigSetManager {
        return this.configSetManager;
    }

    async createDemoFiles() {
        // Reinit before and after for safety
        await this.initialize();
        await createDemoFiles(this);
        await this.initialize();

    }

    getFsAdapter(): FsAdapter {
        return this.fsAdapter;
    }
}
