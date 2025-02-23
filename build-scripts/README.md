# 📦 `buildAll.sh` Script Documentation

## 🛠️ Overview

The `buildAll.sh` script is designed to streamline the build process for the HCS monorepo. It automates:

- **Cleaning** existing build artifacts
- **Building** all sub-packages
- **Running tests** for each package
- **Packaging** the output for distribution

This script processes all packages sequentially:
1. `hcs-lib` - Core library for handling HCS configurations
2. `hcs-cli` - Command-line interface for managing HCS resources
3. `hcs-extension` - Visual Studio Code extension for working with HCS configurations

---

## 🚀 Usage

### 🔹 Basic Command

To build, test, and package all components:

```bash
./buildAll.sh
```

### 🔹 Specify Output Directory

To copy the built and packaged files to a specific destination, use the `-out` flag:

```bash
./buildAll.sh -out /path/to/output
```

- If `-out` is provided, the script will copy:
  - `.tgz` files from `hcs-lib`
  - Packaged CLI scripts from `hcs-cli`
  - `.vsix` extension file from `hcs-extension`

### 🔹 Example:

```bash
./buildAll.sh -out ./dist/packages
```

This will:
- Build, test, and package all sub-packages
- Copy all output files to `./dist/packages`

---

## ⚠️ Error Handling

- The script will **exit immediately** if any command fails.
- If an unknown argument is provided, the script will display an error message and terminate.

---

## 📂 Output Structure

```
/path/to/output/
│
├── hcs-lib-x.y.z.tgz       # Packaged tarball of hcs-lib
├── cli.js                   # Packaged CLI tool
└── hcs-extension-x.y.z.vsix # VS Code extension (if applicable)
```

---

## 🔒 Permissions

Make the script executable (if needed):

```bash
chmod +x buildAll.sh
```

---

## 🙏 Contributions

If you encounter issues or have suggestions for improvements, feel free to submit a pull request or open an issue.

Happy coding! 🚀

