const fs = require("fs");
const path = require("path");

// Path to package.json
const packageJsonPath = path.resolve(__dirname, "../package.json");

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Modify dependencies: replace "file:../hcs-lib" with "^1.0.0"
if (packageJson.dependencies && packageJson.dependencies["hcs-lib"]) {
  packageJson.dependencies["hcs-lib"] = "^1.0.0";
}

// Write modified package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log("✅ Updated package.json for production packaging.");
