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

### **2 Running the Prebuilt Binary**
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
| `build-all`            | Processes and validates all configuration files        | `config-cli build-all` |

