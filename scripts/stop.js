const { execSync } = require('child_process');

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = output.trim().split('\n');
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const state = parts[3];
        const pid = parts[parts.length - 1];
        if (state === 'LISTENING' && pid && pid !== '0') {
          pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          console.log(`Terminating process on port ${port} (PID: ${pid})...`);
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch (_) {}
      }
    } else {
      try {
        execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
        console.log(`Terminated processes listening on port ${port}`);
      } catch (_) {
        const pids = execSync(`lsof -t -i:${port}`, { encoding: 'utf8' }).trim().split('\n');
        for (const pid of pids) {
          if (pid) {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            console.log(`Terminated process on port ${port} (PID: ${pid})`);
          }
        }
      }
    }
  } catch (_) {
    // Port might not be in use
  }
}

console.log('Stopping Recharge Portal backend and frontend services...');
killPort(3000);
killPort(4200);
console.log('Done.');
