# 🧹 HCS-Extension

The **HCS-Extension** is a Visual Studio Code extension designed for managing HCS configuration sets, schemas, and models. It provides a user-friendly interface for creating, validating, and building HCS resources directly within VS Code.

## 🚀 Project Setup

### 📦 Installation

0. ** Build Library **

   See build / install steps in the hcs-lib README.md.  Running `yarn watch` from that package is recommended.

1. ** Install **
   ```bash
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
