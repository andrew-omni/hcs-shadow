export interface ValidationError {
    filePath: string;
    line: number;
    column: number;
    endColumn: number;
    message: string;
    severity: 'error' | 'warning';
  }
  