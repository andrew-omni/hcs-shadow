config-pipeline/
│
├── src/
│   ├── core/
│   │   ├── PipelineManager.ts        # Coordinates phases and handles execution flow
│   │   ├── ConfigSetManager.ts       # Manages config sets and ID scanning
│   │   ├── CacheManager.ts           # Handles caching and invalidation
│   │   └── interfaces/
│   │       ├── Phase.ts              # Interface for pipeline phases (for DI)
│   │       ├── ConfigSet.ts          # Interface for ConfigSet representation
│   │       ├── Model.ts              # Interface for models
│   │       └── Schema.ts             # Interface for schemas
│   │
│   ├── phases/
│   │   ├── ingest/
│   │   │   ├── IngestPhase.ts        # Ingest implementation
│   │   │   ├── IngestStrategy.ts     # Interface for injectable strategies
│   │   ├── conversion/
│   │   │   ├── ConversionPhase.ts    # Conversion implementation
│   │   │   ├── ConversionStrategy.ts # Interface for different converters (YAML, JSON5)
│   │   ├── validation/
│   │   │   ├── ValidationPhase.ts    # Validation implementation
│   │   │   ├── ValidationStrategy.ts # Interface for pluggable validators
│   │   ├── build/
│   │   │   ├── BuildPhase.ts         # Schema/model merging logic
│   │   ├── verification/
│   │   │   ├── VerificationPhase.ts  # Applies schemas to models for validation
│   │   ├── problem-resolution/
│   │   │   ├── ProblemResolutionPhase.ts # Debugging and problem detection
│   │   ├── versioning/
│   │   │   ├── VersioningPhase.ts    # Determines changes and applies versions
│   │   ├── output-conversion/
│   │   │   ├── OutputConversionPhase.ts # Converts to target formats
│   │   ├── serialization/
│   │   │   ├── SerializationPhase.ts # Final write to disk
│   │
│   ├── fs/
│   │   ├── FsAdapter.ts
│   │   ├── NodeFs.ts
│   ├── git/
│   │   ├── GitAdapter.ts
│   │   ├── NodeGit.ts
│   │
│   ├── index.ts                      # Entry point for running the pipeline
│   ├── logger.ts                 # Central logging utility
│   └── config/
│       ├── default-config.json       # Default configuration
│       └── pipeline-config.json      # Pluggable strategy configuration
│
├── tests/
│   ├── core/
│   ├── phases/
│   └── integration/
│
├── package.json
├── tsconfig.json
└── README.md
