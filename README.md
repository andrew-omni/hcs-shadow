# 🏢 HCS Monorepo

This monorepo contains all the essential packages for managing HCS configurations, schemas, and models. It is composed of three interconnected sub-packages:

- **hcs-lib**: A TypeScript library for handling core HCS logic like validation, building, and managing configurations.
- **hcs-cli**: A command-line interface built on top of `hcs-lib` for managing HCS resources through terminal commands.
- **hcs-extension**: A Visual Studio Code extension providing a GUI for working with HCS configurations directly within VS Code.

---

## Web Editor

If you'd like to explore the extension without downloading and installing everything, use the web editor in Github and the hcs-demo package.  Visit (hcs-demo)[hcsdemolink]

---

## 🚀 Project Setup

### 📦 Installation

1. **Clone the Monorepo**

```bash
git clone https://github.com/omniscient-ai/hcs.git
cd hcs
```

2. **Build/Test Packages**

```bash
# hcs-lib
cd hcs-lib
yarn build
yarn test

# hcs-cli
cd ../hcs-cli
yarn build
yarn test

# hcs-extension
cd ../hcs-extension
yarn build
yarn test
```

---

## 💻 Developing and Using the VS Code Extension

1. **Activate the Workspace:**  
   You can open the root folder (containing the .git dir), but VSCode testing (Mocha Test Explorer) expects you to be in a VSCode Workspace.  Ppen the `monoweb.code-workspace` file directly:
   - Go to **File → Open Workspace from File...** in VS Code.
   - Select the `monorepo.code-workspace` file.
   - You should now see all tests from `hcs-lib`, `hcs-cli`, and `hcs-extension` in the Mocha Test Explorer.

2. **Launch hcs-lib WATCH**
    - Open the `hcs-lib` folder in VS Code.
    - Run `yarn watch` from the terminal to automatically rebuild the library on file changes.

2. **Launch the Extension:**
   - Open the `hcs-extension` folder in VS Code.
   - Press `F5` to launch the extension in development mode.
   - A new VS Code window will open, allowing you to run commands and manage configurations.
   - Restart the code window to reflect changes in the extension or lib project.

---

## 🚀 Running tests
Install https://marketplace.visualstudio.com/items?itemName=hbenl.vscode-mocha-test-adapter to see tests in the UI.  All tests should load in the extension window.


## buildAll.sh and the Demo Project
buildAll.sh will build, test, and package all sub-packages in the monorepo. It will also copy the output files to a specified `-out` directory.  The externally tracked hcs-demo project uses this approach to repopulate itself with the latest builds.

## 📙 More Information

* Each sub-package has its own detailed `README.md` explaining how to use and develop within that specific package.
* Each project contains checked in .vscode directories which influence how VSCode works and is wired.  This is a bit atypical, but as we're developing an extension via a monorepo, correct configuration is important and non-trivial.

---

## 📂 Monorepo Structure

```
hcs-monorepo/
│
├── hcs-lib/            # Core library for HCS configurations
│
├── hcs-cli/            # Command-line interface tool
│
├── hcs-extension/      # Visual Studio Code extension
│
├── hcs-monorepo.code-workspace  # Workspace configuration
│
├── .devcontainer/      # Visual Studio / GitHub Editor Setup
|
└── README.md           # Main project documentation
```

---

## 🔒 License

This project is proprietary and unlicensed. All rights reserved.

```
"license": "UNLICENSED"
```

---
