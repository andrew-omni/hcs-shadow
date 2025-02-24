# 🏗️ HCS-Lib

HCS-Lib is a TypeScript library for managing HCS configuration sets, schemas, and models. It provides validation, building, and management tools for HCS-based workflows.

## 🚀 Project Setup

### 📦 Installation

Clone the parent repository and install dependencies:

```bash
yarn install
yarn clean && yarn build
yarn watch
```

## 🔨 Build Process

We use `tsup` as the bundler for this library.

### Why tsup?

- ⚡ **Fast builds**: Leverages `esbuild` under the hood for rapid TypeScript builds.  
- 📄 **Auto-generates Type Declarations**: Automatically generates `.d.ts` files for TypeScript consumers.  
- 🔧 **Simple configuration**: Minimal setup compared to other bundlers.

### Building the Library

To build the project and generate output in the `dist/` folder:

```bash
yarn build
```

This will:

- Compile TypeScript files to CommonJS (`.cjs` format).  
- Generate TypeScript declaration files (`.d.ts`).  
- Output everything to the `dist/` directory.

### 🔁 Watch for Changes (Development)

For development with automatic rebuilding on changes:

```bash
yarn watch
```

This is critical for hcs-cli and hcs-extension development to run smoothly!

### 🔁 Bundle for deployment

For development with automatic rebuilding on changes:

```bash
yarn package
```

## ✅ Running Tests

We use Mocha for testing, combined with `ts-node` for TypeScript execution without pre-compilation.

### Running Tests

To run all test suites:

```bash
yarn test
```