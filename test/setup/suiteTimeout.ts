import fs from 'node:fs';
import path from 'node:path';

let suiteTimeoutHandle: NodeJS.Timeout | null = null;

export function setupSuiteTimeout() {
  const SUITE_TIMEOUT_MS = 180_000; // 3 minutes
  const startTime = Date.now();

  suiteTimeoutHandle = setTimeout(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // Attempt to read partial metrics for diagnostic context
    let completedSuites = '';
    try {
      const metricsPath = path.join(process.cwd(), 'test-metrics.json');
      if (fs.existsSync(metricsPath)) {
        const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
        const completed = metrics.suites?.filter((s: any) => s.status) || [];
        completedSuites = `\n  Completed: ${completed.map((s: any) => `${s.name} (${s.duration}s)`).join(', ')}`;
      }
    } catch (e) {
      // Graceful degradation if metrics unavailable
    }

    console.error(
      `\n[Timeout] Suite exceeded ${SUITE_TIMEOUT_MS / 1000}s limit (elapsed: ${elapsed}s)${completedSuites}\n` +
      `  Terminating to prevent CI hang. Check logs for stalled operation.\n`
    );

    process.exit(1);
  }, SUITE_TIMEOUT_MS);
}

export function teardownSuiteTimeout() {
  if (suiteTimeoutHandle) {
    clearTimeout(suiteTimeoutHandle);
    suiteTimeoutHandle = null;
  }
}

