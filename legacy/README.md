# Legacy Bash Version

This folder contains the original Bash implementation of FlowSphere, which has been replaced by the Node.js version.

## Why It's Here

The Bash version is archived for:
- **Reference:** Understanding the original implementation
- **Fallback:** In case of Node.js compatibility issues (temporary)
- **Git History:** Preserving the evolution of the project

## Status: Deprecated

**⚠️ This version is no longer maintained.**

Please use the Node.js version instead:
```bash
# Install globally
npm install -g flowsphere

# Or run locally
node bin/flowsphere.js config.json
```

## If You Need the Bash Version

The Bash version still works but requires:
- bash (4.0+)
- curl
- jq

**To use:**
```bash
./legacy/flowsphere config.json
```

**Note:** The Bash version will be removed in a future release once the Node.js version is proven stable in production.

## Migration

All existing config files are 100% compatible with the Node.js version. No changes needed!

```bash
# Old way
./flowsphere examples/config-simple.json

# New way (same configs work)
flowsphere examples/config-simple.json
```

## Differences

The Node.js version is:
- ✅ **2-10x faster** (0.010-0.084s vs 0.128-0.198s per step)
- ✅ **Cross-platform** (native Windows support, no WSL needed)
- ✅ **Easier to install** (`npm install -g flowsphere`)
- ✅ **Integrated studio** (`flowsphere studio` command)
- ✅ **Better debugging** (JavaScript tooling)
- ✅ **Programmatic API** (use as a library)

Feature parity is 100% - all Bash features are supported in Node.js.
