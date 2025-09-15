#!/bin/bash

# Test Perplexity integration with clone-gpt MCP architecture
# Quick validation script for Unix-like systems

set -e

# Configuration
MCP_BASE_URL="${MCP_BASE_URL:-http://127.0.0.1:4000}"
CLONE_GPT_URL="${CLONE_GPT_URL:-http://localhost:8080}"
PERPLEXITY_KEY="${PERPLEXITY_API_KEY}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

test_endpoint() {
    local url=$1
    local description=$2
    
    if curl -s --max-time 10 "$url" > /dev/null; then
        success "$description is accessible"
        return 0
    else
        error "$description is not accessible"
        return 1
    fi
}

test_mcp_tools() {
    log "Testing MCP tool listing..."
    
    local response=$(curl -s --max-time 15 -X POST "$MCP_BASE_URL/mcp" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","id":1,"method":"listTools","params":{}}')
    
    if echo "$response" | jq -e '.result.tools[] | select(.name == "fetch_perplexity_data")' > /dev/null 2>&1; then
        success "Perplexity tool found in MCP server"
        return 0
    else
        error "Perplexity tool not found in MCP server"
        echo "Available tools:"
        echo "$response" | jq -r '.result.tools[].name // empty' | sed 's/^/  - /'
        return 1
    fi
}

test_clone_gpt_tools() {
    log "Testing Clone-GPT tool listing..."
    
    local response=$(curl -s --max-time 15 "$CLONE_GPT_URL/api/mcp/tools")
    
    if echo "$response" | jq -e '.tools[] | select(.name == "fetch_perplexity_data")' > /dev/null 2>&1; then
        success "Perplexity tool available through Clone-GPT"
        return 0
    else
        error "Perplexity tool not accessible through Clone-GPT"
        return 1
    fi
}

test_perplexity_call() {
    if [ -z "$PERPLEXITY_KEY" ]; then
        warn "No Perplexity API key provided. Skipping API call test."
        return 0
    fi
    
    log "Testing Perplexity search with API key..."
    
    local response=$(curl -s --max-time 30 -X POST "$CLONE_GPT_URL/api/mcp/tool" \
        -H "Content-Type: application/json" \
        -H "X-Perplexity-Key: $PERPLEXITY_KEY" \
        -d '{
            "name": "fetch_perplexity_data",
            "arguments": {
                "query": "what is the golden ratio?",
                "recency": "month",
                "max_results": 3
            }
        }')
    
    if echo "$response" | jq -e '.content[0].text' > /dev/null 2>&1; then
        success "Perplexity search completed successfully"
        
        # Check for expected response structure
        local search_data=$(echo "$response" | jq -r '.content[0].text')
        if echo "$search_data" | jq -e '.search_metadata.query' > /dev/null 2>&1; then
            success "Response structure is valid"
        fi
        
        if echo "$search_data" | jq -e '.sources[]' > /dev/null 2>&1; then
            local source_count=$(echo "$search_data" | jq '.sources | length')
            success "Sources included: $source_count sources"
        fi
        
        return 0
    else
        error "Perplexity search failed"
        echo "Response: $response"
        return 1
    fi
}

main() {
    log "Starting Perplexity Integration Tests"
    log "Target URLs: MCP=$MCP_BASE_URL, Clone-GPT=$CLONE_GPT_URL"
    
    local tests_passed=0
    local tests_total=0
    
    # Test 1: Basic connectivity
    log "=== Test 1: Basic Connectivity ==="
    ((tests_total++))
    if test_endpoint "$MCP_BASE_URL/health" "MCP server health endpoint"; then
        ((tests_passed++))
    fi
    
    ((tests_total++))
    if test_endpoint "$CLONE_GPT_URL/api/ping" "Clone-GPT API endpoint"; then
        ((tests_passed++))
    fi
    
    # Test 2: MCP tool listing
    log "=== Test 2: MCP Tool Discovery ==="
    ((tests_total++))
    if test_mcp_tools; then
        ((tests_passed++))
    fi
    
    # Test 3: Clone-GPT tool listing
    log "=== Test 3: Clone-GPT Tool Discovery ==="
    ((tests_total++))
    if test_clone_gpt_tools; then
        ((tests_passed++))
    fi
    
    # Test 4: Perplexity call
    log "=== Test 4: Perplexity API Call ==="
    ((tests_total++))
    if test_perplexity_call; then
        ((tests_passed++))
    fi
    
    # Summary
    log "=== Test Summary ==="
    echo
    echo -e "${BLUE}Tests Passed: ${GREEN}$tests_passed${BLUE}/$tests_total${NC}"
    
    if [ $tests_passed -eq $tests_total ]; then
        success "All tests passed! Perplexity integration is working correctly."
        exit 0
    elif [ $tests_passed -ge $((tests_total * 80 / 100)) ]; then
        warn "Most tests passed. Some issues may need attention."
        exit 1
    else
        error "Many tests failed. Please check the configuration and services."
        exit 2
    fi
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    error "jq is required but not installed"
    exit 1
fi

main "$@"
