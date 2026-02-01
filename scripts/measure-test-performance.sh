#!/usr/bin/env bash
# Test Performance Measurement Script
# Tracks timing for each test suite and outputs structured data for CI telemetry

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Output file for metrics
METRICS_FILE="${METRICS_FILE:-test-metrics.json}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "📊 Starting test performance measurement..."
echo "Timestamp: $TIMESTAMP"
echo ""

# Initialize metrics array
echo "{" > "$METRICS_FILE"
echo "  \"timestamp\": \"$TIMESTAMP\"," >> "$METRICS_FILE"
echo "  \"suites\": [" >> "$METRICS_FILE"

# Helper function to run and time a test suite
measure_suite() {
  local suite_name=$1
  local command=$2
  
  echo -e "${YELLOW}Running: $suite_name${NC}"
  
  # Measure time
  local start_time=$(date +%s)
  
  # Run the command and capture exit code
  set +e
  eval "$command"
  local exit_code=$?
  set -e
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Determine status
  local status="passed"
  if [ $exit_code -ne 0 ]; then
    status="failed"
  fi
  
  # Output result
  echo -e "${GREEN}✓ $suite_name: ${duration}s ($status)${NC}"
  echo ""
  
  # Append to metrics file
  echo "    {" >> "$METRICS_FILE"
  echo "      \"name\": \"$suite_name\"," >> "$METRICS_FILE"
  echo "      \"duration\": $duration," >> "$METRICS_FILE"
  echo "      \"status\": \"$status\"," >> "$METRICS_FILE"
  echo "      \"exit_code\": $exit_code" >> "$METRICS_FILE"
  echo "    }," >> "$METRICS_FILE"
  
  return $exit_code
}

# Track overall success
overall_success=0

# Run all test suites
measure_suite "unit" "npm run test:unit" || overall_success=$?
measure_suite "integration" "npm run test:integration" || overall_success=$?
measure_suite "operations" "npm run test:operations" || overall_success=$?
measure_suite "extraction" "npm run test:extraction" || overall_success=$?
measure_suite "performance" "npm run test:performance" || overall_success=$?
measure_suite "downloads" "npm run test:downloads" || overall_success=$?

# Close JSON (remove trailing comma from last suite)
sed -i.bak '$ s/,$//' "$METRICS_FILE" && rm -f "${METRICS_FILE}.bak"
echo "  ]," >> "$METRICS_FILE"

# Calculate total duration
total_start=$(date -d "$TIMESTAMP" +%s 2>/dev/null || echo "0")
total_end=$(date +%s)
total_duration=$((total_end - total_start))

echo "  \"total_duration\": $total_duration," >> "$METRICS_FILE"
echo "  \"overall_status\": \"$([ $overall_success -eq 0 ] && echo 'passed' || echo 'failed')\"" >> "$METRICS_FILE"
echo "}" >> "$METRICS_FILE"

# Output summary
echo ""
echo "📈 Performance Summary"
echo "===================="
if command -v jq &> /dev/null; then
  cat "$METRICS_FILE" | jq -r '.suites[] | "\(.name): \(.duration)s (\(.status))"'
  echo ""
  echo "Total: $(cat "$METRICS_FILE" | jq -r '.total_duration')s"
else
  cat "$METRICS_FILE"
fi
echo ""
echo "Metrics saved to: $METRICS_FILE"

exit $overall_success
