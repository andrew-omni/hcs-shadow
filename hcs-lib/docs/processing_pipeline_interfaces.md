### 📄 **Configuration Processing Pipeline Documentation**

### 🔑 **External Interfaces: How Clients Interact with the Pipeline**

#### 📦 **1. Pipeline API**

```typescript
interface Pipeline {
  run(modelId: string): Promise<PipelineResult>;
  validateModel(modelId: string): Promise<ValidationError[]>;
  getModelState(modelId: string): Promise<ModelState>;
  resolveProblems(modelId: string, fixes: ProblemFix[]): Promise<PipelineResult>;
  registerPhase(phaseName: string, phase: Phase): void;
  clearCache(): void;
}

export interface PipelineCoordinator {
  buildAll(): Promise<PipelineResult[]>;
  buildConfigSet(configSetName: string): Promise<PipelineResult[]>;
  buildModel(modelId: string): Promise<PipelineResult>;
  clearCache(): void;
}

```

**Usage Example:**
```typescript
const pipeline = new Pipeline();
const result = await pipeline.run("model-123");
const validation = await pipeline.validateModel("model-123");
await pipeline.resolveProblems("model-123", [{ field: "missingField", fix: "addDefaultValue" }]);
pipeline.registerPhase("customValidation", new CustomValidationPhase());
```

#### 🏗️ **2. ConfigSetManager API**

```typescript
interface ConfigSetManager {
  discoverConfigSets(): Promise<ConfigSet[]>;
  getIdsInConfigSet(configSetName: string): Promise<string[]>;
  getConfigSet(configSetName: string): Promise<ConfigSet>;
}
```

**Usage Example:**
```typescript
const manager = new ConfigSetManager();
const sets = await manager.discoverConfigSets();
const ids = await manager.getIdsInConfigSet("main-config-set");
```

#### 🔄 **3. Event Hooks and Listeners**

```typescript
interface PipelineEventListener {
  onPhaseStart(phaseName: string, modelId: string): void;
  onPhaseComplete(phaseName: string, modelId: string): void;
  onValidationError(modelId: string, errors: ValidationReport): void;
  onPipelineComplete(result: PipelineResult): void;
}
```

**Usage Example:**
```typescript
pipeline.addEventListener({
  onPhaseStart: (phase, modelId) => console.log(`Phase ${phase} started for model ${modelId}`),
  onPhaseComplete: (phase, modelId) => console.log(`Phase ${phase} completed for model ${modelId}`),
  onValidationError: (modelId, errors) => console.error(`Validation errors for ${modelId}:`, errors),
  onPipelineComplete: (result) => console.log("Pipeline finished successfully", result),
});
```

#### 🔌 **4. Strategy Injection API**

```typescript
interface StrategyRegistry {
  registerStrategy(phaseName: string, strategy: PhaseStrategy): void;
  unregisterStrategy(phaseName: string): void;
}
```

**Usage Example:**
```typescript
pipeline.registerStrategy("ingest", new CustomDatabaseIngestStrategy());
```

#### 🔑 **5. Types and Results**

```typescript
interface PipelineResult {
  modelId: string;
  success: boolean;
  errors?: ValidationError[];
  outputPath?: string;
}

interface ValidationError {
  filePath: string;
  line: number;
  column: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning";
}

interface ModelState {
  modelId: string;
  currentPhase: string;
  valid: boolean;
  problems?: ValidationReport;
}
```
