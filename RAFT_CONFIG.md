# Raft Configuration for Weaviate Embedded

This document describes the environment variables used to configure Raft consensus behavior in Weaviate Embedded, particularly for testing environments.

## Environment Variables

### Startup Configuration
- `WEAVIATE_STARTUP_TIMEOUT`: Maximum time to wait for Weaviate to start (default: 120000ms = 2 minutes)

### Raft Consensus Configuration
- `RAFT_BOOTSTRAP_EXPECT`: Number of expected nodes in cluster (default: 1 for single-node)
- `RAFT_ELECTION_TIMEOUT`: Time before starting new election if no heartbeat (default: 1000ms)
- `RAFT_HEARTBEAT_TIMEOUT`: Heartbeat interval between nodes (default: 500ms)
- `RAFT_LEADER_LEASE_TIMEOUT`: Leader lease timeout (default: 500ms)
- `RAFT_SNAPSHOT_INTERVAL`: How often to take snapshots (default: 120000ms = 2 minutes)
- `RAFT_SNAPSHOT_THRESHOLD`: Log entries before snapshot (default: 8192)

### Test Retry Configuration
- `WEAVIATE_COLLECTION_RETRY_MAX`: Maximum retries for collection operations (default: 20)
- `WEAVIATE_COLLECTION_RETRY_DELAY`: Base delay between retries (default: 2500ms = 2.5 seconds)

## Usage Examples

### For CI/CD Environments (Faster timeouts)
```bash
export WEAVIATE_STARTUP_TIMEOUT=180000
export RAFT_ELECTION_TIMEOUT=500
export RAFT_HEARTBEAT_TIMEOUT=250
export WEAVIATE_COLLECTION_RETRY_MAX=25
```

### For Development (More lenient timeouts)
```bash
export WEAVIATE_STARTUP_TIMEOUT=300000
export RAFT_ELECTION_TIMEOUT=2000
export RAFT_HEARTBEAT_TIMEOUT=1000
export WEAVIATE_COLLECTION_RETRY_MAX=30
```

### For Debugging (Verbose logging)
```bash
export WEAVIATE_STARTUP_TIMEOUT=600000
export WEAVIATE_COLLECTION_RETRY_MAX=50
# Check logs for detailed Raft election progress
```

## Troubleshooting

If tests are still timing out:

1. **Increase startup timeout**: `WEAVIATE_STARTUP_TIMEOUT=180000`
2. **Reduce Raft election timeouts**: `RAFT_ELECTION_TIMEOUT=500`
3. **Increase retry attempts**: `WEAVIATE_COLLECTION_RETRY_MAX=30`
4. **Check system resources**: Ensure sufficient CPU/memory for Raft operations
5. **Enable verbose logging**: Look for "🔄 Raft system not ready" messages

## Diagnostics

The embedded client now includes diagnostic methods:
- `getClusterHealth()`: Returns cluster statistics and Raft status
- Enhanced logging with emojis for better visibility in CI logs

## Default Values Summary

| Variable | Default | Purpose |
|----------|---------|---------|
| WEAVIATE_STARTUP_TIMEOUT | 120000ms | Max startup wait time |
| RAFT_ELECTION_TIMEOUT | 1000ms | Election trigger timeout |
| RAFT_HEARTBEAT_TIMEOUT | 500ms | Heartbeat interval |
| WEAVIATE_COLLECTION_RETRY_MAX | 20 | Max collection operation retries |
| WEAVIATE_COLLECTION_RETRY_DELAY | 2500ms | Base retry delay |

