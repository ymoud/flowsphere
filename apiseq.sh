#!/usr/bin/env bash

# apiseq.sh - HTTP Sequence Runner
# Executes a sequence of HTTP requests defined in a JSON configuration file
# Dependencies: bash, curl, jq

set -euo pipefail

# Disable MSYS path conversion on Windows (Git Bash)
# This prevents paths like /posts/1 from being converted to C:/Program Files/Git/posts/1
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Array to store responses from each step
declare -a responses_json=()
# Array to store status codes from each step
declare -a responses_status=()
# Storage for user input (as JSON object)
USER_INPUT_JSON="{}"

# Temporary directory for storing response files
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Global defaults
DEFAULTS_JSON="{}"

# Debug mode (disabled by default)
ENABLE_DEBUG=false

# Function to print usage
usage() {
    echo "Usage: $0 <config.json>"
    echo ""
    echo "Execute a sequence of HTTP requests defined in a JSON configuration file."
    echo ""
    echo "Requirements:"
    echo "  - curl"
    echo "  - jq"
    exit 1
}

# Function to output debug logs (only if debug is enabled)
debug_log() {
    if [ "$ENABLE_DEBUG" = "true" ]; then
        echo "$@" >&2
    fi
}

# Function to prompt user for input
# Takes a JSON object with key-value pairs (variable: prompt message)
# Updates USER_INPUT_JSON with the collected values
prompt_user_input() {
    local prompts_json="$1"
    local step_num="$2"

    echo ""
    echo -e "${BLUE}Step $step_num requires user input:${NC}"

    # Reset user input for this step
    USER_INPUT_JSON="{}"

    # Iterate through each prompt
    local keys=$(echo "$prompts_json" | jq -r 'keys[]')
    while IFS= read -r key; do
        local prompt_message=$(echo "$prompts_json" | jq -r ".[\"$key\"]")
        echo -n "$prompt_message "
        read -r user_value

        # Add to USER_INPUT_JSON
        USER_INPUT_JSON=$(echo "$USER_INPUT_JSON" | jq --arg k "$key" --arg v "$user_value" '. + {($k): $v}')
        debug_log "DEBUG: User input collected - $key=$user_value"
    done <<< "$keys"

    echo ""
}

# Function to launch browser with URL
# Takes a URL and opens it in the default browser
launch_browser() {
    local url="$1"
    local step_num="$2"

    echo -e "${BLUE}Opening browser to: $url${NC}"
    debug_log "DEBUG: Launching browser for step $step_num"

    # Detect OS and use appropriate command
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$url" &> /dev/null &
        else
            echo "Warning: xdg-open not found, cannot open browser" >&2
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        open "$url" &> /dev/null &
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        start "$url" &> /dev/null &
    else
        echo "Warning: Unsupported OS, cannot open browser" >&2
    fi
}

# Function to detect OS and package manager
detect_package_manager() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            echo "apt"
        elif command -v yum &> /dev/null; then
            echo "yum"
        elif command -v dnf &> /dev/null; then
            echo "dnf"
        else
            echo "unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            echo "brew"
        else
            echo "none"
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        if command -v winget &> /dev/null; then
            echo "winget"
        elif command -v choco &> /dev/null; then
            echo "choco"
        elif command -v scoop &> /dev/null; then
            echo "scoop"
        else
            echo "none"
        fi
    else
        echo "unknown"
    fi
}

# Function to attempt installing a package
install_package() {
    local package_name="$1"
    local pkg_manager=$(detect_package_manager)

    echo ""
    echo "Attempting to install $package_name..."

    case "$pkg_manager" in
        apt)
            echo "Using apt-get (requires sudo)..."
            sudo apt-get update && sudo apt-get install -y "$package_name"
            ;;
        yum)
            echo "Using yum (requires sudo)..."
            sudo yum install -y "$package_name"
            ;;
        dnf)
            echo "Using dnf (requires sudo)..."
            sudo dnf install -y "$package_name"
            ;;
        brew)
            echo "Using Homebrew..."
            brew install "$package_name"
            ;;
        winget)
            echo "Using winget..."
            # winget uses different package names for jq
            if [ "$package_name" = "jq" ]; then
                winget install jqlang.jq --silent
            else
                winget install "$package_name" --silent
            fi
            ;;
        choco)
            echo "Using Chocolatey (requires admin)..."
            choco install "$package_name" -y
            ;;
        scoop)
            echo "Using Scoop..."
            scoop install "$package_name"
            ;;
        none)
            echo "No package manager found."
            return 1
            ;;
        unknown)
            echo "Unsupported operating system."
            return 1
            ;;
    esac

    return $?
}

# Function to provide manual installation instructions
show_install_instructions() {
    local package_name="$1"

    echo ""
    echo "Manual installation instructions for $package_name:"
    echo ""

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Ubuntu/Debian:  sudo apt-get update && sudo apt-get install $package_name"
        echo "RHEL/CentOS:    sudo yum install $package_name"
        echo "Fedora:         sudo dnf install $package_name"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS:          brew install $package_name"
        echo "                (Install Homebrew from https://brew.sh if needed)"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        if [ "$package_name" = "jq" ]; then
            echo "Windows:        winget install jqlang.jq"
            echo "    Or:         choco install jq"
            echo "                (Install Chocolatey from https://chocolatey.org if needed)"
            echo "    Or:         Download from https://stedolan.github.io/jq/download/"
        else
            echo "Windows:        curl is included with Git Bash"
            echo "                Download Git Bash from https://git-scm.com/ if needed"
        fi
    fi

    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    local missing_packages=()

    # Check curl
    if ! command -v curl &> /dev/null; then
        missing_packages+=("curl")
    fi

    # Check jq
    if ! command -v jq &> /dev/null; then
        missing_packages+=("jq")
    fi

    # If all dependencies are present, return success
    if [ ${#missing_packages[@]} -eq 0 ]; then
        return 0
    fi

    # Display missing packages
    echo "Missing required dependencies: ${missing_packages[*]}"
    echo ""

    # Prompt user for auto-install
    read -p "Would you like to attempt automatic installation? (y/n): " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        local install_failed=0

        for package in "${missing_packages[@]}"; do
            if install_package "$package"; then
                # Verify installation succeeded
                if command -v "$package" &> /dev/null; then
                    echo "✓ Successfully installed $package"
                else
                    echo "✗ Installation appeared to succeed but $package is still not in PATH"
                    install_failed=1
                fi
            else
                echo "✗ Failed to install $package"
                install_failed=1
            fi
        done

        if [ $install_failed -eq 1 ]; then
            echo ""
            echo "Some packages could not be installed automatically."
            for package in "${missing_packages[@]}"; do
                if ! command -v "$package" &> /dev/null; then
                    show_install_instructions "$package"
                fi
            done
            exit 1
        fi
    else
        # User declined auto-install, show manual instructions
        echo ""
        for package in "${missing_packages[@]}"; do
            show_install_instructions "$package"
        done
        exit 1
    fi
}

# Function to merge defaults with step configuration
merge_with_defaults() {
    local step_json="$1"
    local merged="$step_json"

    # Get baseUrl from defaults
    local base_url=$(echo "$DEFAULTS_JSON" | jq -r '.baseUrl // empty')
    if [ -n "$base_url" ]; then
        # Replace {baseUrl} placeholder or prepend if URL starts with /
        local url=$(echo "$step_json" | jq -r '.url // empty')
        if [ -n "$url" ]; then
            if [[ "$url" == /* ]]; then
                merged=$(echo "$merged" | jq --arg baseUrl "$base_url" --arg url "$url" '.url = ($baseUrl + $url)')
            else
                merged=$(echo "$merged" | jq --arg baseUrl "$base_url" '.url = (.url | gsub("\\{baseUrl\\}"; $baseUrl))')
            fi
        fi
    fi

    # Merge default headers with step headers (step headers override)
    if echo "$DEFAULTS_JSON" | jq -e '.headers' > /dev/null 2>&1; then
        local default_headers=$(echo "$DEFAULTS_JSON" | jq '.headers')
        local step_headers=$(echo "$step_json" | jq '.headers // {}')
        local merged_headers=$(echo "$default_headers $step_headers" | jq -s '.[0] * .[1]')
        merged=$(echo "$merged" | jq --argjson headers "$merged_headers" '.headers = $headers')
    fi

    # Merge default expect with step expect (step expect overrides)
    if echo "$DEFAULTS_JSON" | jq -e '.expect' > /dev/null 2>&1; then
        local default_expect=$(echo "$DEFAULTS_JSON" | jq '.expect')
        local step_expect=$(echo "$step_json" | jq '.expect // {}')
        local merged_expect=$(echo "$default_expect $step_expect" | jq -s '.[0] * .[1]')
        merged=$(echo "$merged" | jq --argjson expect "$merged_expect" '.expect = $expect')
    fi

    # Merge default timeout with step timeout (step timeout overrides)
    if echo "$DEFAULTS_JSON" | jq -e '.timeout' > /dev/null 2>&1; then
        if ! echo "$step_json" | jq -e '.timeout' > /dev/null 2>&1; then
            local default_timeout=$(echo "$DEFAULTS_JSON" | jq '.timeout')
            merged=$(echo "$merged" | jq --argjson timeout "$default_timeout" '.timeout = $timeout')
        fi
    fi

    echo "$merged"
}

# Function to substitute variables in a string
# Supports syntax: {{ .responses[N].field.subfield }} and {{ .input.key }}
substitute_variables() {
    local input="$1"
    local output="$input"

    debug_log "DEBUG: substitute_variables - input=$input"
    debug_log "DEBUG: substitute_variables - responses_json array size=${#responses_json[@]}"
    debug_log "DEBUG: substitute_variables - user_input_json=$USER_INPUT_JSON"

    # Find all {{ .input.key }} patterns and replace with user input
    local input_iteration=0
    while [[ "$output" =~ \{\{[[:space:]]*\.input\.([a-zA-Z0-9_]+)[[:space:]]*\}\} ]]; do
        input_iteration=$((input_iteration + 1))
        local input_key="${BASH_REMATCH[1]}"
        local full_match="${BASH_REMATCH[0]}"
        debug_log "DEBUG: substitute_variables - input pattern found: key=$input_key, full_match=$full_match"

        # Get the value from USER_INPUT_JSON
        local value=$(echo "$USER_INPUT_JSON" | jq -r ".[\"$input_key\"]")
        debug_log "DEBUG: substitute_variables - extracted input value=$value"
        if [ "$value" = "null" ] || [ -z "$value" ]; then
            echo "Error: Could not extract user input value for .input.$input_key" >&2
            exit 1
        fi

        # Escape glob special characters
        local escaped_full_match="$full_match"
        escaped_full_match="${escaped_full_match//\*/\\*}"
        escaped_full_match="${escaped_full_match//\?/\\?}"
        escaped_full_match="${escaped_full_match//\[/\\[}"
        escaped_full_match="${escaped_full_match//\]/\\]}"
        output="${output//$escaped_full_match/$value}"
        debug_log "DEBUG: substitute_variables - replaced input pattern, output=$output"

        if [ $input_iteration -gt 10 ]; then
            echo "ERROR: substitute_variables - infinite loop detected in input substitution" >&2
            exit 1
        fi
    done

    # Find all {{ .responses[N]... }} patterns
    local iteration=0
    while [[ "$output" =~ \{\{[[:space:]]*\.responses\[([0-9]+)\]\.([^}]+)[[:space:]]*\}\} ]]; do
        iteration=$((iteration + 1))
        debug_log "DEBUG: substitute_variables - iteration $iteration"
        local index="${BASH_REMATCH[1]}"
        local jsonpath="${BASH_REMATCH[2]}"
        # Trim whitespace from jsonpath
        jsonpath=$(echo "$jsonpath" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        local full_match="${BASH_REMATCH[0]}"
        debug_log "DEBUG: substitute_variables - index=$index, jsonpath=$jsonpath, full_match=$full_match"

        # Get the value from the stored response
        if [ "$index" -lt "${#responses_json[@]}" ]; then
            debug_log "DEBUG: substitute_variables - extracting from responses_json[$index]"
            debug_log "DEBUG: substitute_variables - response data: ${responses_json[$index]}"
            local value=$(echo "${responses_json[$index]}" | jq -r ".$jsonpath")
            debug_log "DEBUG: substitute_variables - extracted value=$value"
            if [ "$value" = "null" ] || [ -z "$value" ]; then
                echo "Error: Could not extract value from .responses[$index].$jsonpath" >&2
                exit 1
            fi
            # Replace the placeholder with the actual value
            # For bash string replacement, we need to escape glob special chars: * ? [ ]
            debug_log "DEBUG: substitute_variables - replacing '$full_match' with '$value'"
            # Escape glob special characters by replacing them with [x] pattern
            local escaped_full_match="$full_match"
            escaped_full_match="${escaped_full_match//\*/\\*}"
            escaped_full_match="${escaped_full_match//\?/\\?}"
            escaped_full_match="${escaped_full_match//\[/\\[}"
            escaped_full_match="${escaped_full_match//\]/\\]}"
            debug_log "DEBUG: escaped_full_match=$escaped_full_match"
            output="${output//$escaped_full_match/$value}"
            debug_log "DEBUG: substitute_variables - output after replacement=$output"
        else
            echo "Error: Response index $index not found (only ${#responses_json[@]} responses stored)" >&2
            exit 1
        fi

        if [ $iteration -gt 10 ]; then
            echo "ERROR: substitute_variables - infinite loop detected, breaking" >&2
            exit 1
        fi
    done

    debug_log "DEBUG: substitute_variables - returning output=$output"
    echo "$output"
}

# Function to generate a UUID v4
generate_uuid() {
    # Generate UUID v4 (random)
    if command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        # Fallback: generate pseudo-random UUID using /dev/urandom
        cat /proc/sys/kernel/random/uuid 2>/dev/null || \
        od -N 16 -x /dev/urandom | head -1 | awk '{OFS="-"; print $2$3,$4,$5,$6,$7$8$9}' | sed 's/^0*//' | tr '[:upper:]' '[:lower:]'
    fi
}

# Function to process body and substitute variables
process_body() {
    local body_json="$1"

    # Convert body JSON to string, substitute variables, then parse back
    local body_str=$(echo "$body_json" | jq -c '.')

    # Replace GENERATED_GUID placeholders with actual UUIDs
    while [[ "$body_str" =~ \"GENERATED_GUID\" ]]; do
        local new_uuid=$(generate_uuid)
        debug_log "DEBUG: Replacing GENERATED_GUID with $new_uuid"
        body_str="${body_str/\"GENERATED_GUID\"/\"$new_uuid\"}"
    done

    body_str=$(substitute_variables "$body_str")

    echo "$body_str"
}

# Function to evaluate a condition
# Returns 0 (true) if condition passes, 1 (false) if it fails
evaluate_condition() {
    local condition_json="$1"
    local step_num="$2"

    # Extract condition parameters
    local response_index=$(echo "$condition_json" | jq -r '.response // empty')

    # Check if response index is valid
    if [ -z "$response_index" ]; then
        echo "Error: Step $step_num condition missing 'response' index" >&2
        exit 1
    fi

    if [ "$response_index" -ge "${#responses_json[@]}" ]; then
        echo "Error: Step $step_num condition references response[$response_index] but only ${#responses_json[@]} responses available" >&2
        exit 1
    fi

    # Check for statusCode condition
    if echo "$condition_json" | jq -e '.statusCode' > /dev/null 2>&1; then
        local expected_status=$(echo "$condition_json" | jq -r '.statusCode')
        local actual_status="${responses_status[$response_index]}"

        if [ "$actual_status" = "$expected_status" ]; then
            return 0  # Condition passes
        else
            return 1  # Condition fails
        fi
    fi

    # Check for field-based conditions
    if echo "$condition_json" | jq -e '.field' > /dev/null 2>&1; then
        local field=$(echo "$condition_json" | jq -r '.field')
        local response_body="${responses_json[$response_index]}"

        # Check for 'exists' condition
        if echo "$condition_json" | jq -e '.exists' > /dev/null 2>&1; then
            local should_exist=$(echo "$condition_json" | jq -r '.exists')
            local value=$(echo "$response_body" | jq -r "$field" 2>/dev/null || echo "null")

            if [ "$should_exist" = "true" ]; then
                if [ "$value" != "null" ] && [ -n "$value" ]; then
                    return 0  # Field exists
                else
                    return 1  # Field doesn't exist
                fi
            else
                if [ "$value" = "null" ] || [ -z "$value" ]; then
                    return 0  # Field doesn't exist (as expected)
                else
                    return 1  # Field exists (but shouldn't)
                fi
            fi
        fi

        # Check for 'equals' condition
        if echo "$condition_json" | jq -e '.equals' > /dev/null 2>&1; then
            local expected_value=$(echo "$condition_json" | jq -r '.equals')
            local actual_value=$(echo "$response_body" | jq -r "$field" 2>/dev/null || echo "null")

            if [ "$actual_value" = "$expected_value" ]; then
                return 0  # Values match
            else
                return 1  # Values don't match
            fi
        fi

        # Check for 'notEquals' condition
        if echo "$condition_json" | jq -e '.notEquals' > /dev/null 2>&1; then
            local unwanted_value=$(echo "$condition_json" | jq -r '.notEquals')
            local actual_value=$(echo "$response_body" | jq -r "$field" 2>/dev/null || echo "null")

            if [ "$actual_value" != "$unwanted_value" ]; then
                return 0  # Values don't match (as expected)
            else
                return 1  # Values match (but shouldn't)
            fi
        fi
    fi

    # If no recognizable condition found
    echo "Error: Step $step_num has invalid condition format" >&2
    exit 1
}

# Function to execute a single HTTP request step
execute_step() {
    local step_index="$1"
    local step_json="$2"
    local step_num=$((step_index + 1))

    debug_log "DEBUG: execute_step - start, step_num=$step_num"

    # Check if step requires user input
    if echo "$step_json" | jq -e '.prompts' > /dev/null 2>&1; then
        local prompts=$(echo "$step_json" | jq '.prompts')
        prompt_user_input "$prompts" "$step_num"
    fi

    # Merge step with defaults
    debug_log "DEBUG: execute_step - calling merge_with_defaults"
    step_json=$(merge_with_defaults "$step_json")
    debug_log "DEBUG: execute_step - merge completed"

    # Extract step details
    debug_log "DEBUG: execute_step - extracting step details"
    local name=$(echo "$step_json" | jq -r '.name')
    local method=$(echo "$step_json" | jq -r '.method')
    local url=$(echo "$step_json" | jq -r '.url')
    debug_log "DEBUG: execute_step - extracted url=$url"

    # Substitute variables in URL
    debug_log "DEBUG: execute_step - calling substitute_variables with url=$url"
    url=$(substitute_variables "$url")
    debug_log "DEBUG: execute_step - after substitution url=$url"

    # Build curl command
    local curl_cmd="curl -s -w '\n%{http_code}' -X $method"

    # Add timeout if present
    if echo "$step_json" | jq -e '.timeout' > /dev/null 2>&1; then
        local timeout=$(echo "$step_json" | jq -r '.timeout')
        curl_cmd+=" --max-time $timeout"
    fi

    # Add headers if present
    if echo "$step_json" | jq -e '.headers' > /dev/null 2>&1; then
        debug_log "DEBUG: Headers found in step_json"
        local headers_json=$(echo "$step_json" | jq -c '.headers')
        debug_log "DEBUG: step_json headers: $headers_json"

        # Use to_entries to get key-value pairs together
        local header_entries=$(echo "$headers_json" | jq -r 'to_entries[] | @json')
        while IFS= read -r entry; do
            if [ -n "$entry" ]; then
                local key=$(echo "$entry" | jq -r '.key')
                local value=$(echo "$entry" | jq -r '.value')
                debug_log "DEBUG: Processing header: $key = $value"

                # Substitute variables in header value
                value=$(substitute_variables "$value")
                debug_log "DEBUG: After substitution: $key = $value"

                # Add header to curl command
                curl_cmd+=" -H '$key: $value'"
            fi
        done <<< "$header_entries"
    fi

    # Add body if present
    if echo "$step_json" | jq -e '.body' > /dev/null 2>&1; then
        local body=$(echo "$step_json" | jq -c '.body')
        body=$(process_body "$body")
        curl_cmd+=" -d '$body'"
    fi

    # Add URL
    curl_cmd+=" '$url'"

    debug_log "DEBUG: Final curl command: $curl_cmd"

    # Execute curl and capture response
    local response_file="$TEMP_DIR/response_$step_index.txt"
    eval "$curl_cmd" > "$response_file" 2>&1
    local curl_exit_code=$?

    # Check for curl errors (including timeout)
    if [ $curl_exit_code -eq 28 ]; then
        echo -e "Step $step_num: $method $url ${RED}❌ Request timed out${NC}"
        if echo "$step_json" | jq -e '.timeout' > /dev/null 2>&1; then
            local timeout=$(echo "$step_json" | jq -r '.timeout')
            echo "Timeout limit: ${timeout}s"
        fi
        exit 1
    elif [ $curl_exit_code -ne 0 ]; then
        echo -e "Step $step_num: $method $url ${RED}❌ Curl failed with exit code $curl_exit_code${NC}"
        cat "$response_file"
        exit 1
    fi

    # Extract status code (last line) and body (everything else)
    local status_code=$(tail -n 1 "$response_file")
    local response_body=$(head -n -1 "$response_file")

    # Store response JSON and status code for future reference
    responses_json+=("$response_body")
    responses_status+=("$status_code")

    # Validate response
    local expect_status=200
    if echo "$step_json" | jq -e '.expect.status' > /dev/null 2>&1; then
        expect_status=$(echo "$step_json" | jq -r '.expect.status')
    fi

    # Check status code
    if [ "$status_code" != "$expect_status" ]; then
        echo -e "Step $step_num: $method $url ${RED}❌ Status $status_code (expected $expect_status)${NC}"
        echo "Response body: $response_body"
        exit 1
    fi

    # Check JSON path if specified
    if echo "$step_json" | jq -e '.expect.jsonpath' > /dev/null 2>&1; then
        local jsonpath=$(echo "$step_json" | jq -r '.expect.jsonpath')
        local extracted=$(echo "$response_body" | jq -r "$jsonpath" 2>/dev/null || echo "null")

        # Check for 'exists' expectation
        if echo "$step_json" | jq -e '.expect.exists' > /dev/null 2>&1; then
            local should_exist=$(echo "$step_json" | jq -r '.expect.exists')

            if [ "$should_exist" = "true" ]; then
                if [ "$extracted" = "null" ] || [ -z "$extracted" ]; then
                    echo -e "Step $step_num: $method $url ${RED}❌ Status $status_code OK, but expected field '$jsonpath' to exist${NC}"
                    exit 1
                fi
            else
                if [ "$extracted" != "null" ] && [ -n "$extracted" ]; then
                    echo -e "Step $step_num: $method $url ${RED}❌ Status $status_code OK, but expected field '$jsonpath' to NOT exist${NC}"
                    exit 1
                fi
            fi
        else
            # If no 'exists' check, default behavior: field should exist
            if [ "$extracted" = "null" ] || [ -z "$extracted" ]; then
                echo -e "Step $step_num: $method $url ${RED}❌ Status $status_code OK, but JSON path '$jsonpath' not found${NC}"
                exit 1
            fi
        fi

        # Check if equals is specified
        if echo "$step_json" | jq -e '.expect.equals' > /dev/null 2>&1; then
            local expected_value=$(echo "$step_json" | jq -r '.expect.equals')
            if [ "$extracted" != "$expected_value" ]; then
                echo -e "Step $step_num: $method $url ${RED}❌ Status $status_code OK, but '$jsonpath' = '$extracted' (expected '$expected_value')${NC}"
                exit 1
            fi
        fi

        # Check if notEquals is specified
        if echo "$step_json" | jq -e '.expect.notEquals' > /dev/null 2>&1; then
            local unwanted_value=$(echo "$step_json" | jq -r '.expect.notEquals')
            if [ "$extracted" = "$unwanted_value" ]; then
                echo -e "Step $step_num: $method $url ${RED}❌ Status $status_code OK, but '$jsonpath' = '$extracted' (expected NOT '$unwanted_value')${NC}"
                exit 1
            fi
        fi
    fi

    # Check if step should launch browser
    if echo "$step_json" | jq -e '.launchBrowser' > /dev/null 2>&1; then
        local browser_jsonpath=$(echo "$step_json" | jq -r '.launchBrowser')
        local browser_url=$(echo "$response_body" | jq -r "$browser_jsonpath" 2>/dev/null || echo "null")

        if [ "$browser_url" != "null" ] && [ -n "$browser_url" ]; then
            launch_browser "$browser_url" "$step_num"
        else
            echo "Warning: Could not extract URL from response using jsonpath '$browser_jsonpath'" >&2
        fi
    fi

    # Print success
    echo -e "Step $step_num: $method $url ${GREEN}✅ Status $status_code OK${NC}"
    debug_log "DEBUG: execute_step returning for step $step_num"
}

# Main execution
main() {
    # Check for config file argument
    if [ $# -eq 0 ]; then
        usage
    fi

    local config_file="$1"

    # Check if config file exists
    if [ ! -f "$config_file" ]; then
        echo "Error: Configuration file '$config_file' not found"
        exit 1
    fi

    # Check prerequisites
    check_prerequisites

    # Load configuration
    local config=$(cat "$config_file")

    # Validate JSON
    if ! echo "$config" | jq empty 2>/dev/null; then
        echo "Error: Invalid JSON in configuration file"
        exit 1
    fi

    # Load defaults if present
    if echo "$config" | jq -e '.defaults' > /dev/null 2>&1; then
        DEFAULTS_JSON=$(echo "$config" | jq '.defaults')
        echo "Loaded defaults from configuration"
    fi

    # Load enableDebug setting if present (defaults to false)
    if echo "$config" | jq -e '.enableDebug' > /dev/null 2>&1; then
        local enable_debug_value=$(echo "$config" | jq -r '.enableDebug')
        if [ "$enable_debug_value" = "true" ]; then
            ENABLE_DEBUG=true
            echo "Debug mode enabled"
        fi
    fi

    # Get number of steps
    local num_steps=$(echo "$config" | jq '.steps | length')

    if [ "$num_steps" -eq 0 ]; then
        echo "Error: No steps defined in configuration"
        exit 1
    fi

    echo "Starting HTTP sequence with $num_steps steps..."
    echo ""

    # Track execution stats
    local steps_executed=0
    local steps_skipped=0

    # Execute each step
    for ((i=0; i<num_steps; i++)); do
        debug_log "DEBUG: Loop iteration $i of $num_steps"
        local step=$(echo "$config" | jq ".steps[$i]")
        local step_num=$((i + 1))
        local name=$(echo "$step" | jq -r '.name')
        local method=$(echo "$step" | jq -r '.method')
        local url=$(echo "$step" | jq -r '.url')
        debug_log "DEBUG: Processing step $step_num: $name"

        # Check if step has a condition
        if echo "$step" | jq -e '.condition' > /dev/null 2>&1; then
            local condition=$(echo "$step" | jq '.condition')

            # Evaluate the condition
            if evaluate_condition "$condition" "$step_num"; then
                # Condition passed, execute step
                execute_step "$i" "$step"
                steps_executed=$((steps_executed + 1))
            else
                # Condition failed, skip step
                echo -e "Step $step_num: $method $url ${BLUE}⊘ SKIPPED${NC} (condition not met)"
                steps_skipped=$((steps_skipped + 1))

                # Store empty response and status for skipped steps to maintain indexing
                responses_json+=("{}")
                responses_status+=("0")
            fi
        else
            # No condition, execute step normally
            debug_log "DEBUG: About to execute step $step_num (no condition)"
            execute_step "$i" "$step"
            debug_log "DEBUG: Completed executing step $step_num"
            steps_executed=$((steps_executed + 1))
        fi
        debug_log "DEBUG: End of loop iteration $i"
    done
    debug_log "DEBUG: Exited loop"

    echo ""
    echo -e "${GREEN}Sequence completed: $steps_executed executed, $steps_skipped skipped 🎉${NC}"
}

# Run main function
main "$@"
