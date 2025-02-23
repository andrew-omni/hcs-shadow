# Config CLI - Usage Guide

## 🚀 Running the CLI

### **1⃣ Direct Execution**
If you've built the CLI using `npm run build`, you can run it directly with Node.js:

```sh
node dist/cli.js <command> [options]
```

For example:
```sh
node dist/cli.js create-configset ./my-configset
```

---

### **3⃣ Using `npx` (Without Installation)**
If you want to run the CLI without globally installing it, you can use `npx`:

```sh
npx config-cli <command> [options]
```

Example:
```sh
npx config-cli validate-all
```

---

### **4⃣ Running the CLI in Development Mode**
During development, use `ts-node` to run the TypeScript source directly:

```sh
npx ts-node src/cli.ts <command> [options]
```

Example:
```sh
npx ts-node src/cli.ts build-all
```

---

### **5⃣ Installing the CLI Globally**
To use `config-cli` as a global command, install it globally:

```sh
npm install -g .
```

After installation, run it anywhere:

```sh
config-cli create-schema ./schemas/user.json
```

---

### **6⃣ Running the Prebuilt Binary**
If you have packaged the CLI using `pkg`, you can run the generated binary:

```sh
./build/config-cli <command> [options]
```

On Windows:
```sh
.\build\config-cli.exe <command> [options]
```

---

## 🛠 Available Commands

| Command                | Description                                             | Example Usage |
|------------------------|---------------------------------------------------------|--------------|
| `create-configset`     | Creates a new config set                               | `config-cli create-configset ./configs/new` |
| `get-configsets`       | Lists all detected config sets                         | `config-cli get-configsets` |
| `create-schema`        | Creates a new schema                                   | `config-cli create-schema ./schemas/mySchema.json` |
| `create-model`         | Creates a new model                                    | `config-cli create-model ./models/myModel.json` |
| `validate-all`         | Validates all schemas and models                       | `config-cli validate-all` |
| `build-all`            | Processes and validates all configuration files        | `config-cli build-all` |

---

## 🔍 Debugging Issues

If you encounter issues running the CLI:
1. **Ensure the CLI is built**:
   ```sh
   npm run build
   ```
2. **Try running it with `ts-node`**:
   ```sh
   node dist/cli.ts <command>
   ```