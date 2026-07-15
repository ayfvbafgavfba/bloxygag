const { spawn } = require('child_process');

console.log('Attempting to spawn local redis-server on port 6379...');

try {
  const child = spawn('redis-server', ['--port', '6379'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log('Spawned redis-server (detached). If you see "command not found" next, install redis or use Docker.');
} catch (err) {
  console.error('Failed to spawn redis-server:', err && err.message);
  console.log('If redis is not installed, install it or run `docker compose up -d` in the Backend folder.');
}
