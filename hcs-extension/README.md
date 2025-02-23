# 🧹 HCS-Extension

The **HCS-Extension** is a Visual Studio Code extension designed for managing HCS configuration sets, schemas, and models. It provides a user-friendly interface for creating, validating, and building HCS resources directly within VS Code.

## 🚀 Project Setup

### 📅 Prerequisites

- Node.js >= 14.x  
- Yarn (preferred)  
- Visual Studio Code  
- HCS-Lib (included via the monorepo)  

### 📦 Installation

1. **Clone the Monorepo**  
   First, clone the main repository that contains both the `hcs-lib` and `hcs-extension`:

   ```bash
   git clone https://github.com/omniscient-ai/hcs.git
   cd hcs
   ```

2. **Build the HCS-Extension**  
   Navigate to the extension directory and build it:

   ```bash
   cd hcs-extension
   yarn clean && yarn build
   ```

3. **Run Tests** (Optional)  
   To verify everything works as expected:

   ```bash
   yarn test
   ```

### 🏃 Running the Extension in Development Mode

To launch the extension in development/test mode:

1. Open the `hcs-extension` folder in VS Code.
2. Press `F5` or run the **"Run Extension"** launch configuration from the debug panel.
3. A new VS Code window will open with the extension loaded in development mode.

---

## 🛠️ Available Commands

The extension adds the following commands to VS Code’s Command Palette (`Cmd/Ctrl+Shift+P`):

- **HCSTools: Create Config Set** – Initializes a new HCS configuration set.
- **HCSTools: Create Schema** – Creates a new schema within a selected config set.
- **HCSTools: Create Model** – Generates a new model within a selected config set.
- **HCSTools: Verify All** – Validates all schemas, models, and configurations in your workspace.
- **HCSTools: Build All** – Builds all schemas and models across all configuration sets.

---

## 🧪 Testing the Extension

We use **Mocha** for testing the extension:

- To run all test suites:

  ```bash
  yarn test
  ```

- To run tests in watch mode (re-runs tests on file changes):

  ```bash
  yarn test:watch
  ```

### 🔍 Debugging Tests in VS Code

1. Install the **Mocha Test Explorer** extension in VS Code.  
2. Open the **Test Explorer** view from the sidebar.  
3. Click **Run** or **Debug** on individual tests or test suites.

---

## 🛠️ Scripts Overview

| Command             | Description                                 |
|---------------------|---------------------------------------------|
| `yarn build`        | Builds the extension for use in VS Code     |
| `yarn clean`        | Cleans the `out/` directory                 |
| `yarn test`         | Runs all tests using Mocha                  |
| `yarn test:watch`   | Runs tests and watches for file changes     |
| `yarn watch`        | Rebuilds the extension automatically on changes |

---

## 📂 Project Structure

```
hcs-extension/
│
├── src/                 # Source code
│   ├── commands/        # VS Code command implementations
│   ├── utils/           # Utility functions
│   ├── extension.ts     # Extension entry point
│
├── out/                 # Compiled output (generated)
├── .vscode/             # VS Code configuration
│   ├── settings.json    # VS Code-specific settings
│   └── launch.json      # Debugging configurations
│
├── package.json         # Project configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # Project documentation
```

---

## 🔒 License

This project is proprietary and unlicensed. All rights reserved.

```
"license": "UNLICENSED"
```

---

## 🙏 Contributing

Contributions are welcome! Please open issues or submit pull requests if you have improvements or suggestions.

Happy coding! 🚀

