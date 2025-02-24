interface PhaseData<T> {
    value: T;
    timestamp: number; // To track the last update time (useful for caching)
    source?: string; // Optional: Identify the source (e.g., config set name)
  }
  