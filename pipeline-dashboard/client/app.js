// Scraper Controller Functions
async function fetchScraperStatus() {
  try {
    const res = await fetch('/pipeline/scraper/status');
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch scraper status:', err);
    return null;
  }
}

async function startScraper() {
  const btn = document.getElementById('start-btn');
  btn.disabled = true;
  btn.textContent = 'Starting...';

  try {
    const res = await fetch('/pipeline/scraper/start', { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      alert('Scraper started successfully (PID: ' + data.pid + ')');
      updateScraperController();
    } else {
      alert('Failed to start scraper: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error starting scraper: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Start Scraper';
  }
}

async function stopScraper() {
  const btn = document.getElementById('stop-btn');
  btn.disabled = true;
  btn.textContent = 'Stopping...';

  try {
    const res = await fetch('/pipeline/scraper/stop', { method: 'POST' });
    const data = await res.json();
    
    if (data.success) {
      alert('Scraper stopped successfully');
      updateScraperController();
    } else {
      alert('Failed to stop scraper: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error stopping scraper: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Stop Scraper';
  }
}

async function sampleAudit(count) {
  try {
    const res = await fetch(`/pipeline/scraper/audit-sample?count=${count}`);
    const data = await res.json();
    
    const samples = data.strains.map(s => `  - ${s.slug} (index ${s.index})`).join('\n');
    alert(`Audit Sample (${data.count} strains):\n\n${samples}`);
  } catch (err) {
    alert('Error sampling strains: ' + err.message);
  }
}

async function updateScraperController() {
  const status = await fetchScraperStatus();
  if (!status) {
    document.getElementById('scraper-controller').innerHTML = 
      '<div class="card bad">Failed to load scraper status</div>';
    return;
  }

  const el = document.getElementById('scraper-controller');
  const runningClass = status.running ? 'ok' : 'bad';
  const runningText = status.running ? 'RUNNING' : 'STOPPED';
  
  const resourcesHtml = `
    <div style="margin-top: 8px; font-size: 12px;">
      <strong>Resources:</strong><br/>
      Configured: ${status.resources.configured.join(', ')}<br/>
      Active: ${status.resources.active.length > 0 ? status.resources.active.join(', ') : 'none'}<br/>
      Completed: ${status.resources.completed.length > 0 ? status.resources.completed.join(', ') : 'none'}
    </div>
  `;

  el.innerHTML = `
    <div class="card" style="border: 2px solid ${status.running ? '#6cff8f' : '#ff6b6b'};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 18px;">Scraper Controller</h2>
        <span class="${runningClass}" style="font-weight: bold; font-size: 14px;">
          ${runningText}
        </span>
      </div>

      <div style="margin-bottom: 12px;">
        <strong>Status:</strong><br/>
        PID: ${status.pid || '—'}<br/>
        Current Index: ${status.current !== null ? status.current : '—'}<br/>
        Current Strain: ${status.strain_name || '—'}<br/>
        State Valid: <span class="${status.state_valid ? 'ok' : 'bad'}">
          ${status.state_valid ? 'Yes' : 'No'}
        </span>
      </div>

      ${resourcesHtml}

      <div style="margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap;">
        <button 
          id="start-btn" 
          ${status.running ? 'disabled' : ''}
          style="padding: 8px 16px; background: #6cff8f; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
        >
          Start Scraper
        </button>
        <button 
          id="stop-btn" 
          ${!status.running ? 'disabled' : ''}
          style="padding: 8px 16px; background: #ff6b6b; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
        >
          Stop Scraper
        </button>
        <button 
          id="audit-1-btn"
          style="padding: 8px 16px; background: #ffd166; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
        >
          Audit Sample (1)
        </button>
        <button 
          id="audit-3-btn"
          style="padding: 8px 16px; background: #ffd166; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;"
        >
          Audit Sample (3)
        </button>
      </div>
    </div>
  `;

  // Attach event listeners after rendering
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');
  const audit1Btn = document.getElementById('audit-1-btn');
  const audit3Btn = document.getElementById('audit-3-btn');

  if (startBtn) startBtn.addEventListener('click', startScraper);
  if (stopBtn) stopBtn.addEventListener('click', stopScraper);
  if (audit1Btn) audit1Btn.addEventListener('click', () => sampleAudit(1));
  if (audit3Btn) audit3Btn.addEventListener('click', () => sampleAudit(3));
}

// Pipeline Status Functions
async function fetchStatus() {
  try {
    const res = await fetch('/api/pipeline/status');
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    const data = await res.json();

    const el = document.getElementById('status');
    el.innerHTML = `
      <div class="card">
        <strong>Vault:</strong>
        <span class="${data.vault.mounted ? 'ok' : 'bad'}">
          ${data.vault.mounted ? 'Mounted' : 'NOT mounted'}
        </span>
      </div>

      <div class="card">
        <strong>Scraper State:</strong><br/>
        Index: ${data.scraper.current ?? '—'} / ${data.scraper.total ?? '—'}<br/>
        Strain: ${data.scraper.strain_name ?? '—'}<br/>
        State: ${data.scraper.state ?? '—'}<br/>
        Valid: <span class="${data.scraper.valid ? 'ok' : 'bad'}">
          ${data.scraper.valid}
        </span>
      </div>

      <div class="card">
        <strong>Hero Images:</strong><br/>
        Generated: ${data.heroes.generated}<br/>
        Missing: ${data.heroes.missing}
      </div>

      <div class="card">
        <strong>Filesystem:</strong>
        <span class="${data.filesystem.ok ? 'ok' : 'bad'}">
          ${data.filesystem.ok ? 'OK' : 'Missing paths'}
        </span>
      </div>

      <div class="card" style="font-size: 12px; opacity: 0.7;">
        Last updated: ${data.timestamp || new Date().toISOString()}
      </div>
    `;
  } catch (err) {
    const el = document.getElementById('status');
    el.innerHTML = `<div class="card bad">Failed to load status: ${String(err)}</div>`;
  }
}

// Minimal Controls
async function startScraper() {
  const res = await fetch('/pipeline/scraper/start', { method: 'POST' });
  const data = await res.json();
  document.getElementById('controlStatus').innerText =
    data.error || 'Scraper started';
  fetchStatus();
}

async function stopScraper() {
  const res = await fetch('/pipeline/scraper/stop', { method: 'POST' });
  const data = await res.json();
  document.getElementById('controlStatus').innerText =
    data.error || 'Scraper stopped';
  fetchStatus();
}

async function updateControlButtons() {
  const res = await fetch('/pipeline/scraper/status');
  const data = await res.json();

  document.getElementById('startBtn').disabled = data.running;
  document.getElementById('stopBtn').disabled = !data.running;
}

document.getElementById('startBtn').onclick = startScraper;
document.getElementById('stopBtn').onclick = stopScraper;

// Initialize
updateScraperController();
fetchStatus();
updateControlButtons();

// hook into existing polling
setInterval(updateControlButtons, 3000);
setInterval(() => {
  updateScraperController();
  fetchStatus();
}, 5000);
