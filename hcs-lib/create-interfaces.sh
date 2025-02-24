mkdir -p src/core/interfaces && \
cat > src/core/interfaces/PipelineResult.ts <<EOL
import { ValidationError } from './ValidationError';

export interface PipelineResult {
  modelId: string;
  success: boolean;
  errors?: ValidationError[];
  outputPath?: string;
}
EOL
&& \
cat > src/core/interfaces/ValidationError.ts <<EOL
export interface ValidationError {
  filePath: string;
  line: number;
  column: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning';
}
EOL
&& \
cat > src/core/interfaces/ModelState.ts <<EOL
import { ValidationError } from './ValidationError';

export interface ModelState {
  modelId: string;
  currentPhase: string;
  valid: boolean;
  problems?: ValidationError[];
}
EOL
