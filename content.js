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

    console.log('%c[Wheel Rigger] === Starting name extraction ===', 'color: #00bcd4; font-weight: bold;');
    console.log('[Wheel Rigger] Current URL:', window.location.href);
    console.log('[Wheel Rigger] Document readyState:', document.readyState);
    console.log('[Wheel Rigger] Body children count:', document.body?.children?.length || 0);

    // Method 1: Try to get from textarea (entry list)
    console.log('%c[Wheel Rigger] Method 1: Checking textareas...', 'color: #9c27b0;');
    const allTextareas = document.querySelectorAll('textarea');
    console.log('[Wheel Rigger] Found', allTextareas.length, 'textarea element(s)');
    allTextareas.forEach((ta, i) => {
      console.log(`[Wheel Rigger]   Textarea ${i}: id="${ta.id}", class="${ta.className}", value length=${ta.value?.length || 0}`);
      if (ta.value) {
        console.log(`[Wheel Rigger]   Textarea ${i} content preview:`, ta.value.substring(0, 200));
      }
    });

    const textarea = document.querySelector('textarea');
    if (textarea && textarea.value) {
      const textNames = textarea.value.split('\n').map(n => n.trim()).filter(n => n);
      if (textNames.length > 0) {
        console.log('%c[Wheel Rigger] SUCCESS: Found names in textarea:', 'color: #4caf50; font-weight: bold;', textNames);
        return textNames;
      } else {
        console.log('[Wheel Rigger] Textarea exists but no valid names after parsing');
      }
    } else {
      console.log('[Wheel Rigger] No textarea found or textarea is empty');
    }

    // Method 2: Try to get from wheel segments (SVG text elements)
    console.log('%c[Wheel Rigger] Method 2: Checking SVG text elements...', 'color: #9c27b0;');
    const allSvgs = document.querySelectorAll('svg');
    console.log('[Wheel Rigger] Found', allSvgs.length, 'SVG element(s)');
    allSvgs.forEach((svg, i) => {
      console.log(`[Wheel Rigger]   SVG ${i}: id="${svg.id}", class="${svg.className?.baseVal || svg.className}", dimensions=${svg.width?.baseVal?.value || 'auto'}x${svg.height?.baseVal?.value || 'auto'}`);
    });

    const svgTexts = document.querySelectorAll('svg text');
    console.log('[Wheel Rigger] Found', svgTexts.length, 'SVG text element(s)');
    svgTexts.forEach((text, i) => {
      const content = text.textContent?.trim();
      const isNumeric = content?.match(/^[\d\s]*$/);
      console.log(`[Wheel Rigger]   SVG text ${i}: "${content}" (numeric-only: ${!!isNumeric})`);
      if (content && content.length > 0 && !isNumeric) {
        names.push(content);
      }
    });
    if (names.length > 0) {
      console.log('%c[Wheel Rigger] SUCCESS: Found names in SVG:', 'color: #4caf50; font-weight: bold;', names);
      return names;
    } else {
      console.log('[Wheel Rigger] No valid names found in SVG text elements');
    }

    // Method 3: Try to find in any input fields
    console.log('%c[Wheel Rigger] Method 3: Checking input fields...', 'color: #9c27b0;');
    const inputs = document.querySelectorAll('input[type="text"]');
    console.log('[Wheel Rigger] Found', inputs.length, 'text input element(s)');
    inputs.forEach((input, i) => {
      console.log(`[Wheel Rigger]   Input ${i}: id="${input.id}", name="${input.name}", class="${input.className}", value="${input.value}"`);
      const name = input.value?.trim();
      if (name && name.length > 0) {
        names.push(name);
      }
    });
    if (names.length > 0) {
      console.log('%c[Wheel Rigger] SUCCESS: Found names in inputs:', 'color: #4caf50; font-weight: bold;', names);
      return names;
    } else {
      console.log('[Wheel Rigger] No valid names found in input fields');
    }

    // Method 4: Look for common wheel entry containers
    console.log('%c[Wheel Rigger] Method 4: Checking CSS selectors...', 'color: #9c27b0;');
    const entrySelectors = [
      '.entry', '.wheel-entry', '.name', '.participant',
      '[class*="entry"]', '[class*="name"]', '[class*="wheel"] span',
      '.wheel-slice', '.slice-text'
    ];

    entrySelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        console.log(`[Wheel Rigger]   Selector "${selector}": found ${elements.length} element(s)`);
        elements.forEach((el, i) => {
          const name = el.textContent?.trim();
          console.log(`[Wheel Rigger]     Element ${i}: tag=${el.tagName}, class="${el.className}", text="${name?.substring(0, 50)}"`);
          if (name && name.length > 0 && name.length < 100) {
            names.push(name);
          }
        });
      } catch (e) {
        console.log(`[Wheel Rigger]   Selector "${selector}": ERROR -`, e.message);
      }
    });

    // Deduplicate
    const uniqueNames = [...new Set(names)];
    console.log('%c[Wheel Rigger] === Extraction complete ===', 'color: #00bcd4; font-weight: bold;');
    console.log('[Wheel Rigger] Final extracted names:', uniqueNames);
    console.log('[Wheel Rigger] Total unique names:', uniqueNames.length);

    // Additional DOM debugging if no names found
    if (uniqueNames.length === 0) {
      console.log('%c[Wheel Rigger] === DOM Debug Info (no names found) ===', 'color: #ff9800; font-weight: bold;');
      console.log('[Wheel Rigger] Document title:', document.title);
      console.log('[Wheel Rigger] Main content areas:');
      ['#app', '#root', '.app', '.main', 'main', '[class*="wheel"]', '[class*="spinner"]'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) {
          console.log(`[Wheel Rigger]   ${sel}: found, innerHTML length=${el.innerHTML.length}`);
        }
      });
      console.log('[Wheel Rigger] Canvas elements:', document.querySelectorAll('canvas').length);
      console.log('[Wheel Rigger] All classes containing "wheel":',
        [...document.querySelectorAll('[class*="wheel"]')].map(el => el.className).slice(0, 10));
      console.log('[Wheel Rigger] All classes containing "entry":',
        [...document.querySelectorAll('[class*="entry"]')].map(el => el.className).slice(0, 10));
    }

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
    console.log('%c[Wheel Rigger] Initializing...', 'color: #2196f3; font-weight: bold; font-size: 14px;');
    console.log('[Wheel Rigger] Init state:', {
      readyState: document.readyState,
      url: window.location.href,
      bodyExists: !!document.body,
      bodyChildCount: document.body?.children?.length || 0
    });

    // Wait for page to fully load
    console.log('[Wheel Rigger] Scheduling initial extraction in 1500ms...');
    setTimeout(() => {
      console.log('%c[Wheel Rigger] Running delayed initialization...', 'color: #2196f3;');
      console.log('[Wheel Rigger] Post-delay state:', {
        readyState: document.readyState,
        bodyChildCount: document.body?.children?.length || 0
      });
      extractWheelNames();
      loadSavedWinner();
      updateIndicator();
    }, 1500);

    // Also try extraction at different intervals to catch late-loading content
    [3000, 5000, 8000].forEach(delay => {
      setTimeout(() => {
        console.log(`[Wheel Rigger] Retry extraction at ${delay}ms...`);
        const names = extractWheelNames();
        if (names.length > 0) {
          console.log(`%c[Wheel Rigger] Found ${names.length} names at ${delay}ms delay!`, 'color: #4caf50; font-weight: bold;');
        }
      }, delay);
    });

    // Re-extract names when DOM changes
    let mutationCount = 0;
    const observer = new MutationObserver((mutations) => {
      mutationCount++;
      if (mutationCount <= 10 || mutationCount % 50 === 0) {
        console.log(`[Wheel Rigger] DOM mutation #${mutationCount}, ${mutations.length} change(s)`);
      }
      if (!isRigging) {
        // Debounce extraction
        clearTimeout(window.__wheelRiggerExtractTimeout);
        window.__wheelRiggerExtractTimeout = setTimeout(() => {
          console.log('[Wheel Rigger] Re-extracting names after DOM mutation...');
          wheelNames = extractWheelNames();
        }, 500);
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log('[Wheel Rigger] MutationObserver attached to body');
    } else {
      console.warn('[Wheel Rigger] document.body not available for observer!');
    }
  }

  // Run initialization
  console.log('[Wheel Rigger] Script executing, readyState:', document.readyState);
  if (document.readyState === 'loading') {
    console.log('[Wheel Rigger] Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Wheel Rigger] DOMContentLoaded fired');
      init();
    });
  } else {
    console.log('[Wheel Rigger] Document already loaded, running init immediately');
    init();
  }

})();
