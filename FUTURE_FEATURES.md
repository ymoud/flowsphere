# Future Features & Enhancements

This document tracks potential improvements and feature requests for the HTTP Sequence Runner.

## 1. Cookie Management
- Automatic cookie jar support
- Save/load cookies between steps
- Handle Set-Cookie headers automatically

### Retry Logic
- Configurable retry attempts on failure
- Exponential backoff
- Retry only on specific status codes

### Parallel Execution
- Execute independent steps in parallel
- Define dependency graphs
- Improve performance for large sequences

### Environment Variables
- Load config from environment variables
- Template syntax: `{{ .env.API_KEY }}`
- Support for .env files

### Response Assertions
- More validation types (regex, greater/less than, array length)
- Custom assertion functions
- JSON schema validation

### Output Formats
- JSON output mode for CI/CD
- JUnit XML for test reporting
- Markdown report generation

---

**Contributing:** Feel free to propose additional features by creating an issue or pull request!
