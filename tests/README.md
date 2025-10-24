# Test Configurations

This folder contains test configurations used for validating specific features of the HTTP Sequence Runner.

## Test Configs

| File | Purpose |
|------|---------|
| **config-test-variables.json** | Tests global variables feature (`{{ .vars.variableName }}`) |
| **config-test-multiple-validations.json** | Tests multiple JSON path validations on a single step |
| **config-test-defaults.json** | Tests defaults merging behavior (baseUrl, headers, timeout, validations) |
| **config-test-comparisons.json** | Tests numeric comparison validations (greaterThan, lessThan, etc.) |

## Running Tests

```bash
# From repository root
./apiseq.sh tests/config-test-variables.json
```

## Purpose

These configurations are designed for:
- Feature validation during development
- Regression testing
- Documentation of edge cases
- Verification of bug fixes

For learning the tool, see the [`examples/`](../examples/) folder instead.
