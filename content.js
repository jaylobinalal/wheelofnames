// Content script for Wheel Rigger - injected into wheelofnames.com
(function() {
  'use strict';

  console.log('%c[Wheel Rigger] Extension loaded!', 'color: #ff6b6b; font-weight: bold; font-size: 14px;');

  // Store state
  let riggedWinner = null;
  let wheelNames = [];
  let isRigging = false;

  // Store original Math.random
  const originalRandom = Math.random;

  // Create our rigger API
  window.__wheelRigger = {
    getNames: function() {
      return extractWheelNames();
    },
    setWinner: function(name) {
      riggedWinner = name;
      console.log('%c[Wheel Rigger] Winner set to: ' + name, 'color: #2ed573; font-weight: bold;');
      injectRigger();
    },
    clearWinner: function() {
      riggedWinner = null;
      restoreRandom();
      console.log('%c[Wheel Rigger] Rig cleared', 'color: #ffa502; font-weight: bold;');
    },
    getWinner: function() {
      return riggedWinner;
    }
  };

  // Extract names from the wheel
  function extractWheelNames() {
    const names = [];

    // Method 1: Try to get from textarea (entry list)
    const textarea = document.querySelector('textarea');
    if (textarea && textarea.value) {
      const textNames = textarea.value.split('\n').map(n => n.trim()).filter(n => n);
      if (textNames.length > 0) {
        console.log('[Wheel Rigger] Found names in textarea:', textNames);
        return textNames;
      }
    }

    // Method 2: Try to get from wheel segments (SVG text elements)
    const svgTexts = document.querySelectorAll('svg text');
    svgTexts.forEach(text => {
      const name = text.textContent?.trim();
      if (name && name.length > 0 && !name.match(/^[\d\s]*$/)) {
        names.push(name);
      }
    });
    if (names.length > 0) {
      console.log('[Wheel Rigger] Found names in SVG:', names);
      return names;
    }

    // Method 3: Try to find in any input fields
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
      const name = input.value?.trim();
      if (name && name.length > 0) {
        names.push(name);
      }
    });
    if (names.length > 0) {
      console.log('[Wheel Rigger] Found names in inputs:', names);
      return names;
    }

    // Method 4: Look for common wheel entry containers
    const entrySelectors = [
      '.entry', '.wheel-entry', '.name', '.participant',
      '[class*="entry"]', '[class*="name"]', '[class*="wheel"] span',
      '.wheel-slice', '.slice-text'
    ];

    entrySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const name = el.textContent?.trim();
          if (name && name.length > 0 && name.length < 100) {
            names.push(name);
          }
        });
      } catch (e) {}
    });

    // Deduplicate
    const uniqueNames = [...new Set(names)];
    console.log('[Wheel Rigger] Extracted names:', uniqueNames);
    wheelNames = uniqueNames;
    return uniqueNames;
  }

  // Inject the rigging mechanism
  function injectRigger() {
    if (!riggedWinner) return;

    console.log('[Wheel Rigger] Injecting rigging mechanism...');

    // Get current wheel names
    wheelNames = extractWheelNames();

    // Find the index of our rigged winner
    const winnerIndex = wheelNames.findIndex(name =>
      name.toLowerCase() === riggedWinner.toLowerCase() ||
      name.toLowerCase().includes(riggedWinner.toLowerCase()) ||
      riggedWinner.toLowerCase().includes(name.toLowerCase())
    );

    if (winnerIndex === -1) {
      console.warn('[Wheel Rigger] Winner not found in wheel! Names:', wheelNames);
    }

    // Override Math.random to control the outcome
    let callCount = 0;
    Math.random = function() {
      callCount++;

      // If we're spinning and have a winner set
      if (riggedWinner && wheelNames.length > 0) {
        const targetIndex = winnerIndex !== -1 ? winnerIndex : 0;
        const numSegments = wheelNames.length;

        // Calculate what random value would land on our target segment
        // The wheel divides 360 degrees by number of segments
        // We want to return a value that lands in the middle of our target segment
        const segmentSize = 1 / numSegments;
        const targetValue = (targetIndex * segmentSize) + (segmentSize / 2);

        // Add small variation to look natural but stay in target segment
        const variation = (originalRandom() - 0.5) * segmentSize * 0.3;
        const riggedValue = Math.max(0, Math.min(0.9999, targetValue + variation));

        console.log(`[Wheel Rigger] Call #${callCount}: Returning rigged value ${riggedValue.toFixed(4)} for segment ${targetIndex} (${wheelNames[targetIndex]})`);

        return riggedValue;
      }

      return originalRandom();
    };

    // Also try to intercept any wheel libraries
    interceptWheelLibraries();

    console.log('%c[Wheel Rigger] Rigging active! Wheel will land on: ' + riggedWinner, 'color: #ff6b6b; font-weight: bold; font-size: 12px;');
  }

  // Try to intercept common wheel libraries
  function interceptWheelLibraries() {
    // Watch for Vue/React state changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.style && target.style.transform && target.style.transform.includes('rotate')) {
            // Wheel is rotating - potentially intercept
            console.log('[Wheel Rigger] Detected wheel rotation');
          }
        }
      });
    });

    // Observe the wheel container
    const wheelContainers = document.querySelectorAll('[class*="wheel"], svg, canvas');
    wheelContainers.forEach(container => {
      observer.observe(container, { attributes: true, subtree: true });
    });

    // Hook into setTimeout/setInterval used for animations
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;

    window.setTimeout = function(fn, delay, ...args) {
      // Log animation-related timeouts
      if (delay > 1000 && delay < 10000) {
        console.log(`[Wheel Rigger] setTimeout detected: ${delay}ms`);
      }
      return originalSetTimeout.call(window, fn, delay, ...args);
    };

    // Try to access Vuex store or React state
    tryAccessFrameworkState();
  }

  // Try to access Vue/React state for more precise control
  function tryAccessFrameworkState() {
    // Vue.js detection
    if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('[Wheel Rigger] Vue.js detected');
    }

    // Look for Vue app instance
    const vueApp = document.querySelector('#app')?.__vue__;
    if (vueApp) {
      console.log('[Wheel Rigger] Vue app instance found');
      // Could potentially modify state here
    }

    // Look for React fiber
    const reactRoot = document.getElementById('root');
    if (reactRoot && reactRoot._reactRootContainer) {
      console.log('[Wheel Rigger] React detected');
    }
  }

  // Restore original random
  function restoreRandom() {
    Math.random = originalRandom;
    console.log('[Wheel Rigger] Math.random restored');
  }

  // Load any saved rigged winner from storage
  async function loadSavedWinner() {
    try {
      const result = await chrome.storage.local.get(['riggedWinner', 'autoRig']);
      if (result.riggedWinner && result.autoRig) {
        riggedWinner = result.riggedWinner;
        console.log('[Wheel Rigger] Auto-loading saved winner:', riggedWinner);
        setTimeout(() => {
          injectRigger();
        }, 1000);
      }
    } catch (e) {
      // Storage not available
    }
  }

  // Create visual indicator
  function createIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'wheel-rigger-indicator';
    indicator.innerHTML = `
      <style>
        #wheel-rigger-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
          color: white;
          padding: 10px 16px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
          z-index: 999999;
          cursor: pointer;
          transition: transform 0.2s, opacity 0.2s;
          display: none;
        }
        #wheel-rigger-indicator:hover {
          transform: scale(1.05);
        }
        #wheel-rigger-indicator.active {
          display: block;
        }
        #wheel-rigger-indicator .winner-name {
          color: #fff;
          font-weight: 700;
        }
      </style>
      <span>RIGGED: <span class="winner-name"></span></span>
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  // Update indicator
  function updateIndicator() {
    let indicator = document.getElementById('wheel-rigger-indicator');
    if (!indicator) {
      indicator = createIndicator();
    }

    if (riggedWinner) {
      indicator.classList.add('active');
      indicator.querySelector('.winner-name').textContent = riggedWinner;
    } else {
      indicator.classList.remove('active');
    }
  }

  // Watch for rigged winner changes
  chrome.storage?.onChanged?.addListener((changes) => {
    if (changes.riggedWinner) {
      riggedWinner = changes.riggedWinner.newValue;
      if (riggedWinner) {
        injectRigger();
      } else {
        restoreRandom();
      }
      updateIndicator();
    }
  });

  // Initialize
  function init() {
    console.log('[Wheel Rigger] Initializing...');

    // Wait for page to fully load
    setTimeout(() => {
      extractWheelNames();
      loadSavedWinner();
      updateIndicator();
    }, 1500);

    // Re-extract names when DOM changes
    const observer = new MutationObserver(() => {
      if (!isRigging) {
        wheelNames = extractWheelNames();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
