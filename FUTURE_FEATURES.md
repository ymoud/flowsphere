# Future Features & Enhancements

This document tracks potential improvements and feature requests for the HTTP Sequence Runner.

## Cookie Management
- Automatic cookie jar support
- Save/load cookies between steps
- Handle Set-Cookie headers automatically

## Retry Logic
- Configurable retry attempts on failure
- Exponential backoff
- Retry only on specific status codes

## Parallel Execution
- Execute independent steps in parallel
- Define dependency graphs
- Improve performance for large sequences

## Environment Variables
- Load config from environment variables
- Template syntax: `{{ .env.API_KEY }}`
- Support for .env files

## Response Assertions
- More validation types (regex, greater/less than, array length)
- Custom assertion functions
- JSON schema validation

## Collection Validations
Support for validating collections (arrays/objects) with conditions that apply to all, some, or none of the items.

**Use Cases:**
- Verify all items in an array meet certain criteria
- Check if at least one item matches a condition
- Ensure no items have invalid values
- Filter and validate nested collections

**Proposed Syntax:**

### 1. Validate All Items in Collection
```json
{
  "validations": [
    {
      "jsonpath": ".users",
      "all": {
        "field": ".active",
        "equals": true
      }
    }
  ]
}
```
**Example Response:**
```json
{
  "users": [
    {"name": "Alice", "active": true, "role": "admin"},
    {"name": "Bob", "active": true, "role": "user"}
  ]
}
```
**Result:** ✅ Pass (all users have active=true)

### 2. Validate At Least One Item Matches
```json
{
  "validations": [
    {
      "jsonpath": ".users",
      "any": {
        "field": ".role",
        "equals": "admin"
      }
    }
  ]
}
```
**Result:** ✅ Pass (at least one user has role=admin)

### 3. Validate No Items Match (None)
```json
{
  "validations": [
    {
      "jsonpath": ".products",
      "none": {
        "field": ".price",
        "equals": 0
      }
    }
  ]
}
```
**Example Response:**
```json
{
  "products": [
    {"name": "Widget", "price": 19.99},
    {"name": "Gadget", "price": 29.99}
  ]
}
```
**Result:** ✅ Pass (no products have price=0)

### 4. String Collection Validations
```json
{
  "validations": [
    {
      "jsonpath": ".tags",
      "contains": "production"
    },
    {
      "jsonpath": ".tags",
      "all": {
        "notEquals": ""
      }
    }
  ]
}
```
**Example Response:**
```json
{
  "tags": ["production", "api", "v2"]
}
```
**Result:** ✅ Pass (tags contains "production" and all tags are non-empty)

### 5. Complex Collection Criteria
```json
{
  "validations": [
    {
      "jsonpath": ".orders",
      "all": {
        "field": ".total",
        "greaterThan": 0
      }
    },
    {
      "jsonpath": ".orders",
      "any": {
        "field": ".status",
        "equals": "completed"
      }
    }
  ]
}
```
**Example Response:**
```json
{
  "orders": [
    {"id": 1, "total": 99.99, "status": "completed"},
    {"id": 2, "total": 49.99, "status": "pending"}
  ]
}
```
**Result:** ✅ Pass (all orders have total > 0 AND at least one is completed)

### 6. Nested Collection Validations
```json
{
  "validations": [
    {
      "jsonpath": ".departments",
      "all": {
        "field": ".employees | length",
        "greaterThan": 0
      }
    }
  ]
}
```
**Example Response:**
```json
{
  "departments": [
    {"name": "Engineering", "employees": ["Alice", "Bob"]},
    {"name": "Sales", "employees": ["Charlie"]}
  ]
}
```
**Result:** ✅ Pass (all departments have at least one employee)

### 7. Collection Count Validations
```json
{
  "validations": [
    {
      "jsonpath": ".items",
      "count": {
        "field": ".status",
        "equals": "active",
        "min": 1,
        "max": 5
      }
    }
  ]
}
```
**Example Response:**
```json
{
  "items": [
    {"id": 1, "status": "active"},
    {"id": 2, "status": "inactive"},
    {"id": 3, "status": "active"}
  ]
}
```
**Result:** ✅ Pass (2 items with status=active, within range 1-5)

**Supported Operators:**
- `all`: Every item must match
- `any`: At least one item must match
- `none`: No items can match
- `count`: Count items matching criteria, validate min/max
- `contains`: Collection contains specific value (for string arrays)

**Supported Criteria:**
- `equals`, `notEquals`: Exact value matching
- `exists`: Field existence check
- `greaterThan`, `lessThan`: Numeric comparisons
- `greaterThanOrEqual`, `lessThanOrEqual`: Inclusive comparisons
- `matches`: Regex pattern matching
- `contains`: String/substring matching

## Output Formats
- JSON output mode for CI/CD
- JUnit XML for test reporting
- Markdown report generation

---

**Contributing:** Feel free to propose additional features by creating an issue or pull request!
