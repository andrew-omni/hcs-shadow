export function findFieldPositionInFile(
    jsonContent: object,
    searchValue: string,
    highlightValue: boolean = false
): { line: number; startChar: number; endChar: number } {
    const jsonString = typeof jsonContent === "string" 
        ? JSON.stringify(JSON.parse(jsonContent), null, 2) 
        : JSON.stringify(jsonContent, null, 2);
    const lines = jsonString.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!highlightValue) {
            // Match JSON key exactly, handling special characters like "$id"
            const keyPattern = new RegExp(`^\\s*"${searchValue.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}"\\s*:`, "m");
            const keyMatch = keyPattern.exec(line);
            if (keyMatch) {
                const startChar = line.indexOf(`"${searchValue}"`);
                return { line: i, startChar, endChar: startChar + searchValue.length + 2 };
            }
        } else {
            // Match JSON values inside objects and arrays, including numbers, booleans, null, and quoted strings
            const valuePattern = new RegExp(
                `(:\\s*|\\[\\s*)("(?:[^"\\\\]|\\\\.)*"|\\d+|true|false|null)(\\s*,|\\s*\\])?`, "m"
            );
            const valueMatch = valuePattern.exec(line);

            if (valueMatch) {
                const value = valueMatch[2].replace(/(^"|"$)/g, ""); // Remove surrounding quotes
                if (value === searchValue) {
                    const startChar = line.indexOf(valueMatch[2]);
                    return { line: i, startChar, endChar: startChar + valueMatch[2].length };
                }
            }
        }
    }

    return { line: 0, startChar: 0, endChar: 0 };
}
