#!/bin/bash

# List of all phases
phases=("ingest" "conversion" "validation" "build" "verification" "problem-resolution" "versioning" "output-conversion" "serialization")

# Function to convert kebab-case to PascalCase
to_pascal_case() {
  echo "$1" | awk -F- '{for (i=1; i<=NF; i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' OFS=''
}

# Create interfaces directory if it doesn't exist
mkdir -p src/core/interfaces

# Generate Phase Interface
cat > src/core/interfaces/Phase.ts <<EOL
export interface Phase {
  execute(modelId: string): Promise<any>;
}
EOL

# Generate ConfigSet Interface
cat > src/core/interfaces/ConfigSet.ts <<EOL
export interface ConfigSet {
  name: string;
  schemas: string[];
  models: string[];
  instances: string[];
}
EOL

# Generate Model Interface
cat > src/core/interfaces/Model.ts <<EOL
export interface Model {
  id: string;
  filePath: string;
  content: any; // Raw JSON or YAML content
}
EOL

# Generate Schema Interface
cat > src/core/interfaces/Schema.ts <<EOL
export interface Schema {
  id: string;
  filePath: string;
  definition: any; // JSON Schema definition
}
EOL

# Loop through each phase and generate files
for phase in "${phases[@]}"; do
  phase_pascal=$(to_pascal_case $phase)
  phase_dir="src/phases/$phase"

  # Create phase directory if it doesn't exist
  mkdir -p "$phase_dir"

  # Generate Phase implementation
  cat > "$phase_dir/${phase_pascal}Phase.ts" <<EOL
import { Phase } from '../../core/interfaces/Phase';
import { ${phase_pascal}Strategy } from './${phase_pascal}Strategy';
import { Log } from '../../logger';

const LOG_CLS_SHORT = '${phase_pascal}';

export class ${phase_pascal}Phase implements Phase {
  constructor(private strategy: ${phase_pascal}Strategy) {}

  async execute(modelId: string): Promise<any> {
    Log.info(LOG_CLS_SHORT, 'exe', 'Phase ${phase_pascal} executed for model ID: ' + modelId);
    return await this.strategy.execute(modelId);
  }
}
EOL

  # Generate Strategy interface
  cat > "$phase_dir/${phase_pascal}Strategy.ts" <<EOL
export interface ${phase_pascal}Strategy {
  execute(modelId: string): Promise<any>;
}
EOL

  # Generate Default Strategy implementation
  cat > "$phase_dir/Default${phase_pascal}Strategy.ts" <<EOL
import { ${phase_pascal}Strategy } from './${phase_pascal}Strategy';
import { Log } from '../../logger';

const LOG_CLS_SHORT = '${phase_pascal}';

export class Default${phase_pascal}Strategy implements ${phase_pascal}Strategy {
  async execute(modelId: string): Promise<any> {
    Log.info(LOG_CLS_SHORT, '${phase_pascal}', 'Executing default strategy for model ID: ' + modelId);
    return { id: modelId, phase: '${phase_pascal}', content: 'Default content' };
  }
}
EOL

done

echo "✅ Phases, strategies, and default implementations generated successfully!"
