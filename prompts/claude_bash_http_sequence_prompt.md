# Claude Sonnet 4.5 Master Prompt — HTTP Sequence Runner in Bash

**System role:**  
You are an expert DevOps engineer and Bash scripting specialist.  
Your task is to design and implement a *cross-platform command-line Bash application* that sequentially executes HTTP requests defined in a JSON configuration file, using `curl` and `jq`.  
Your code must be clean, portable, and easy to understand.

---

## 🎯 Objective
Create a **command-line Bash script** named `apiseq.sh` that:
1. Reads a JSON configuration file provided as an argument (e.g., `./apiseq.sh config.json`).
2. Sequentially executes a list of HTTP requests defined in the configuration file.
3. Each request includes:
   - `method` (GET, POST, PUT, DELETE)
   - `url`
   - Optional `headers` (key-value pairs)
   - Optional `body`
   - Optional `validations` (e.g., `"httpStatusCode":200`, `"jsonpath":".success", "equals":true`)
4. Prints one line after each step showing:
   ```
   Step 2: POST /api/token ✅ Status 200 OK
   ```
5. If a validation fails, prints a ❌ failure message and **stops execution**.
6. Later steps may reference data from previous responses using **`jq` expressions** on stored responses.  
   Example:
   ```json
   "body": {
       "userId": ".responses[0].data.id"
   }
   ```
7. Works on **Windows (Git Bash or WSL)**, **macOS**, and **Linux** with minimal dependencies:
   - `bash`
   - `curl`
   - `jq`

---

## 🧩 Configuration File Example
Claude must produce a **sample `config.json`** like this:

```json
{
  "steps": [
    {
      "name": "Authenticate",
      "method": "POST",
      "url": "https://api.example.com/login",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "username": "demo",
        "password": "demo123"
      },
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".token", "exists": true }
      ]
    },
    {
      "name": "Get user profile",
      "method": "GET",
      "url": "https://api.example.com/profile",
      "headers": {
        "Authorization": "Bearer {{ .responses[0].token }}"
      },
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".id", "exists": true }
      }
    }
  ]
}
```

---

## 🧠 Implementation Details
Claude should:
- Use `jq` to extract and substitute values from previous responses.  
- Store responses in an array `responses[]`.  
- Validate both **HTTP status code** and optional **JSON field values**.  
- Print a compact line after each step with ✅ or ❌ indicators.  
- Exit immediately on failure.  
- Include helpful comments in the Bash script.  
- At the end, print a summary:
  ```
  All 5 steps completed successfully 🎉
  ```

---

## 🧪 Expected Deliverables
Claude must output:
1. The **complete Bash script** (`apiseq.sh`).
2. The **sample `config.json`** configuration file.
3. **Run instructions**, e.g.:
   ```bash
   chmod +x apiseq.sh
   ./apiseq.sh config.json
   ```
4. Brief notes on portability and prerequisites (`curl`, `jq`).

---

## ✨ Style & Quality Guidelines
- Prefer clarity over compactness.
- Add short inline comments explaining critical logic.
- Avoid advanced Bashisms that reduce portability.
- Make sure all `jq` and `curl` commands are POSIX-compliant.
- Always use double quotes around variables for safety.
