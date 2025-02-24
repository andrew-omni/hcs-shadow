const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Set paths
const vsixFile = "hcs-extension-0.0.1.vsix"; // Change this if needed
const extractDir = "vsix_temp";
const packageJsonPath = path.join(extractDir, "extension", "package.json");

// Step 1: Extract the .vsix package
console.log("📦 Extracting VSIX package...");
execSync(`unzip -o ${vsixFile} -d ${extractDir}`, { stdio: "inherit" });

// Step 2: Modify package.json
console.log("✏️ Modifying package.json...");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Change "hcs-lib" to use the correct version reference
if (packageJson.dependencies && packageJson.dependencies["hcs-lib"]) {
  packageJson.dependencies["hcs-lib"] = "^1.0.0"; // Replace with the actual version
}

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log("✅ package.json updated.");

// Step 3: Repackage the VSIX file
console.log("📦 Repackaging VSIX...");
execSync(`cd ${extractDir} && zip -r ../${vsixFile} *`, { stdio: "inherit" });

// Step 4: Cleanup extracted files
console.log("🧹 Cleaning up...");
execSync(`rm -rf ${extractDir}`, { stdio: "inherit" });

console.log("🎉 VSIX package successfully updated!");
