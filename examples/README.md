# Example Configurations

This folder contains ready-to-run example configurations demonstrating various features of the HTTP Sequence Runner.

## Examples

| File | Description | Key Features |
|------|-------------|--------------|
| **config-simple.json** | **Start here** — Basic authentication flow | Uses public JSONPlaceholder API, no setup required |
| **config-oauth-example.json** | OAuth authentication workflow | Browser auto-launch, user input prompts, form-urlencoded bodies |
| **config-test-features.json** | Interactive user input | Demonstrates prompt collection and variable substitution |
| **config-user-input.json** | User input demonstration | Shows how to collect and use user-provided values |
| **config.json** | Full-featured example | Complete workflow with authentication, validation, and defaults |
| **config-ids-token.json** | NBG token acquisition | Single-step token request with form-urlencoded body and validations |

## Running Examples

```bash
# From repository root
./flowsphere examples/config-simple.json

# Start from a specific step (useful for debugging)
./flowsphere examples/config.json 3
```

## Using the Visual Editor

All examples can be loaded and edited in the visual config editor:

1. Open `config-editor/index.html` in your browser
2. Click "Load Existing Config"
3. Select an example file from this folder
4. Edit and export as needed
