const fs = require("fs");
const path = require("path");

// Path to package.json
const packageJsonPath = path.resolve(__dirname, "../package.json");

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Restore dependencies: set "hcs-lib" back to "file:../hcs-lib"
if (packageJson.dependencies && packageJson.dependencies["hcs-lib"]) {
  packageJson.dependencies["hcs-lib"] = "file:../hcs-lib";
}

// Write modified package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log("🔄 Restored package.json to development mode (hcs-lib as file:../hcs-lib).");
