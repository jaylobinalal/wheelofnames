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
    console.log('[Wheel Rigger Popup] Starting loadNamesFromPage, tabId:', tabId);

    // First, check if the content script is loaded
    console.log('[Wheel Rigger Popup] Checking if content script is loaded...');
    const checkResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const hasRigger = !!window.__wheelRigger;
        console.log('[Wheel Rigger] Content script check - __wheelRigger exists:', hasRigger);
        if (hasRigger) {
          console.log('[Wheel Rigger] __wheelRigger methods:', Object.keys(window.__wheelRigger));
        }
        return {
          hasRigger,
          url: window.location.href,
          readyState: document.readyState,
          bodyExists: !!document.body,
          bodyChildCount: document.body?.children?.length || 0
        };
      }
    });

    const checkResult = checkResults[0]?.result;
    console.log('[Wheel Rigger Popup] Content script check result:', checkResult);
    addLog(`Page state: readyState=${checkResult?.readyState}, hasRigger=${checkResult?.hasRigger}`);

    if (!checkResult?.hasRigger) {
      addLog('ERROR: Content script not loaded! Try refreshing the page.');
      console.error('[Wheel Rigger Popup] Content script not loaded - window.__wheelRigger is undefined');
      winnerSelect.innerHTML = '<option value="">-- Content script not loaded --</option>';
      return;
    }

    // Now get the names
    console.log('[Wheel Rigger Popup] Calling getNames()...');
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        console.log('[Wheel Rigger] getNames() called from popup');
        try {
          const names = window.__wheelRigger?.getNames() || [];
          console.log('[Wheel Rigger] getNames() returning:', names);
          return {
            names,
            error: null
          };
        } catch (e) {
          console.error('[Wheel Rigger] getNames() error:', e);
          return {
            names: [],
            error: e.message
          };
        }
      }
    });

    console.log('[Wheel Rigger Popup] executeScript results:', results);
    const result = results[0]?.result;
    const names = result?.names || [];

    if (result?.error) {
      console.error('[Wheel Rigger Popup] getNames error:', result.error);
      addLog(`ERROR in getNames: ${result.error}`);
    }

    console.log('[Wheel Rigger Popup] Extracted names:', names);
    addLog(`getNames returned ${names.length} name(s)`);

    if (names.length > 0) {
      winnerSelect.innerHTML = '<option value="">-- Select winner --</option>';
      names.forEach((name, i) => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        winnerSelect.appendChild(option);
        console.log(`[Wheel Rigger Popup] Added option ${i}: "${name}"`);
      });
      winnerSelect.disabled = false;
      addLog(`Loaded ${names.length} names successfully`);
    } else {
      winnerSelect.innerHTML = '<option value="">-- No names found --</option>';
      addLog('No names found. Check browser console for debug info.');
      console.warn('[Wheel Rigger Popup] No names returned. Check the content script console logs on the page for detailed extraction info.');
    }
  } catch (err) {
    console.error('[Wheel Rigger Popup] Error loading names:', err);
    console.error('[Wheel Rigger Popup] Error stack:', err.stack);
    addLog(`Error: ${err.message}`);
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
