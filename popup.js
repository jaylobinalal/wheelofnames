// Popup script for Wheel Rigger extension

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const statusEl = document.getElementById('status');
  const winnerSelect = document.getElementById('winner-select');
  const manualWinner = document.getElementById('manual-winner');
  const refreshBtn = document.getElementById('refresh-btn');
  const rigBtn = document.getElementById('rig-btn');
  const clearRigBtn = document.getElementById('clear-rig-btn');
  const autoRigCheckbox = document.getElementById('auto-rig');
  const riggedStatus = document.getElementById('rigged-status');
  const riggedName = document.getElementById('rigged-name');
  const controls = document.getElementById('controls');

  // Check if we're on wheelofnames.com
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isOnWheelOfNames = tab.url && (
    tab.url.includes('wheelofnames.com')
  );

  if (isOnWheelOfNames) {
    statusEl.textContent = 'Connected to wheelofnames.com';
    statusEl.className = 'status-active';
    winnerSelect.disabled = false;

    // Load names from the page
    loadNamesFromPage(tab.id);
  } else {
    statusEl.textContent = 'Not on wheelofnames.com';
    statusEl.className = 'status-inactive';
    addLog('Navigate to wheelofnames.com to use this extension');
  }

  // Load saved settings
  const saved = await chrome.storage.local.get(['riggedWinner', 'autoRig']);
  if (saved.riggedWinner) {
    showRiggedStatus(saved.riggedWinner);
  }
  autoRigCheckbox.checked = saved.autoRig || false;

  // Event listeners
  refreshBtn.addEventListener('click', () => {
    if (isOnWheelOfNames) {
      loadNamesFromPage(tab.id);
    }
  });

  rigBtn.addEventListener('click', async () => {
    const winner = manualWinner.value.trim() || winnerSelect.value;
    if (!winner) {
      addLog('ERROR: Please select or enter a winner');
      return;
    }

    await setRiggedWinner(tab.id, winner);
    showRiggedStatus(winner);
    addLog(`Rigged wheel for: ${winner}`);
  });

  clearRigBtn.addEventListener('click', async () => {
    await clearRig(tab.id);
    hideRiggedStatus();
    addLog('Rig cleared');
  });

  autoRigCheckbox.addEventListener('change', async () => {
    await chrome.storage.local.set({ autoRig: autoRigCheckbox.checked });
    addLog(`Auto-rig ${autoRigCheckbox.checked ? 'enabled' : 'disabled'}`);
  });

  function showRiggedStatus(winner) {
    controls.classList.add('hidden');
    riggedStatus.classList.remove('hidden');
    riggedName.textContent = winner;
  }

  function hideRiggedStatus() {
    controls.classList.remove('hidden');
    riggedStatus.classList.add('hidden');
    riggedName.textContent = '';
  }
}

async function loadNamesFromPage(tabId) {
  const winnerSelect = document.getElementById('winner-select');

  try {
    addLog('Loading names from wheel...');

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Try to get names from the wheel
        return window.__wheelRigger?.getNames() || [];
      }
    });

    const names = results[0]?.result || [];

    if (names.length > 0) {
      winnerSelect.innerHTML = '<option value="">-- Select winner --</option>';
      names.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        winnerSelect.appendChild(option);
      });
      winnerSelect.disabled = false;
      addLog(`Loaded ${names.length} names`);
    } else {
      winnerSelect.innerHTML = '<option value="">-- No names found --</option>';
      addLog('No names found. Make sure the wheel has entries.');
    }
  } catch (err) {
    console.error('Error loading names:', err);
    addLog('Error loading names. Try refreshing the page.');
  }
}

async function setRiggedWinner(tabId, winner) {
  await chrome.storage.local.set({ riggedWinner: winner });

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (winnerName) => {
        if (window.__wheelRigger) {
          window.__wheelRigger.setWinner(winnerName);
        }
      },
      args: [winner]
    });
  } catch (err) {
    console.error('Error setting winner:', err);
  }
}

async function clearRig(tabId) {
  await chrome.storage.local.remove('riggedWinner');

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (window.__wheelRigger) {
          window.__wheelRigger.clearWinner();
        }
      }
    });
  } catch (err) {
    console.error('Error clearing rig:', err);
  }
}

function addLog(message) {
  const log = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const time = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  entry.innerHTML = `<span class="log-time">${time}</span>${message}`;
  log.insertBefore(entry, log.firstChild);

  // Keep only last 20 entries
  while (log.children.length > 20) {
    log.removeChild(log.lastChild);
  }
}
