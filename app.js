// Elements
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const textarea = document.getElementById('namesInput');
const entryCountEl = document.getElementById('entryCount');
const wheelWrapper = document.getElementById('wheelWrapper');
const wheelCenter = document.querySelector('.wheel-center');
const modalOverlay = document.getElementById('modalOverlay');
const winnerNameEl = document.getElementById('winnerName');
const closeModalBtn = document.getElementById('closeModalBtn');
const removeWinnerBtn = document.getElementById('removeWinnerBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const sortBtn = document.getElementById('sortBtn');
const confettiContainer = document.getElementById('confetti');

// State
let names = [];
let currentRotation = 0;
let isSpinning = false;
let lastWinner = null;

// Secret rigging - no visual indication
let riggedName = null;

// Wheel colors (matching wheelofnames.com palette)
const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
  '#FF7F50', '#9370DB', '#3CB371', '#FF69B4'
];

// Parse names from textarea
function parseNames() {
  return textarea.value
    .split(/\r?\n/)
    .map(n => n.trim())
    .filter(Boolean);
}

// Update entry count
function updateEntryCount() {
  names = parseNames();
  entryCountEl.textContent = names.length;

  // Clear rigged name if it's no longer in the list
  if (riggedName && !names.includes(riggedName)) {
    riggedName = null;
  }

  drawWheel();
}

// Get color for slice
function getColor(index) {
  return colors[index % colors.length];
}

// Draw the wheel
function drawWheel() {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 5;

  ctx.clearRect(0, 0, size, size);

  if (names.length === 0) {
    // Empty wheel
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#e0e0e0';
    ctx.fill();

    ctx.fillStyle = '#999';
    ctx.font = '18px Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Add names to spin', center, center);
    return;
  }

  const sliceAngle = (Math.PI * 2) / names.length;

  names.forEach((name, i) => {
    const startAngle = i * sliceAngle - Math.PI / 2;
    const endAngle = startAngle + sliceAngle;

    // Draw slice
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = getColor(i);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw text
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Roboto, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Truncate long names
    let displayName = name;
    const maxWidth = radius - 45;
    while (ctx.measureText(displayName).width > maxWidth && displayName.length > 3) {
      displayName = displayName.slice(0, -1);
    }
    if (displayName !== name) displayName += '…';

    ctx.fillText(displayName, radius - 20, 5);
    ctx.restore();
  });

  // Draw outer ring
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// Spin the wheel
function spinWheel() {
  if (isSpinning || names.length === 0) return;

  isSpinning = true;
  wheelWrapper.classList.add('spinning');

  // Determine winner index
  let winnerIndex;
  if (riggedName && names.includes(riggedName)) {
    // Use rigged name
    winnerIndex = names.indexOf(riggedName);
  } else {
    // Random selection
    winnerIndex = Math.floor(Math.random() * names.length);
  }

  const winner = names[winnerIndex];

  // Calculate target rotation
  const sliceAngle = 360 / names.length;
  // Target: the pointer is at top (270deg in standard coords, or -90deg)
  // We need the center of the winning slice to be at the top
  const targetSliceCenter = winnerIndex * sliceAngle + sliceAngle / 2;
  // The wheel needs to rotate so that targetSliceCenter is at 270deg (top)
  const targetOffset = 270 - targetSliceCenter;

  // Add multiple full rotations for effect
  const spins = 5 + Math.random() * 3;
  const totalRotation = spins * 360 + targetOffset;

  // Calculate final rotation (add to current)
  const finalRotation = currentRotation + totalRotation;

  // Apply rotation animation
  canvas.style.transition = 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
  canvas.style.transform = `rotate(${finalRotation}deg)`;

  // Handle animation end
  setTimeout(() => {
    currentRotation = finalRotation % 360;
    isSpinning = false;
    wheelWrapper.classList.remove('spinning');
    lastWinner = winner;

    // Clear rigged name after spin (one-time use)
    riggedName = null;

    // Show winner modal
    showWinnerModal(winner);
  }, 5000);
}

// Show winner modal with confetti
function showWinnerModal(winner) {
  winnerNameEl.textContent = winner;
  modalOverlay.classList.add('active');
  createConfetti();
}

// Close modal
function closeModal() {
  modalOverlay.classList.remove('active');
  confettiContainer.innerHTML = '';
}

// Remove winner from list
function removeWinner() {
  if (!lastWinner) return;

  const lines = textarea.value.split('\n');
  const newLines = [];
  let removed = false;

  for (const line of lines) {
    if (!removed && line.trim() === lastWinner) {
      removed = true;
      continue;
    }
    newLines.push(line);
  }

  textarea.value = newLines.join('\n');
  updateEntryCount();
  closeModal();
}

// Create confetti animation
function createConfetti() {
  confettiContainer.innerHTML = '';
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD', '#F7DC6F'];

  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
    confetti.style.width = (Math.random() * 10 + 5) + 'px';
    confetti.style.height = (Math.random() * 10 + 5) + 'px';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';

    confetti.style.animation = `confettiFall ${1.5 + Math.random() * 2}s ease-out forwards`;
    confetti.style.animationDelay = Math.random() * 0.5 + 's';

    confettiContainer.appendChild(confetti);
  }
}

// Add confetti animation styles
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
  @keyframes confettiFall {
    0% {
      opacity: 1;
      transform: translateY(-20px) rotate(0deg);
    }
    100% {
      opacity: 0;
      transform: translateY(300px) rotate(720deg);
    }
  }
`;
document.head.appendChild(confettiStyle);

// Shuffle names
function shuffleNames() {
  const currentNames = parseNames();
  for (let i = currentNames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [currentNames[i], currentNames[j]] = [currentNames[j], currentNames[i]];
  }
  textarea.value = currentNames.join('\n');
  updateEntryCount();
}

// Sort names
function sortNames() {
  const currentNames = parseNames();
  currentNames.sort((a, b) => a.localeCompare(b));
  textarea.value = currentNames.join('\n');
  updateEntryCount();
}

// Get line at cursor position in textarea
function getLineAtPosition(text, position) {
  const lines = text.split('\n');
  let currentPos = 0;

  for (const line of lines) {
    const lineEnd = currentPos + line.length;
    if (position >= currentPos && position <= lineEnd) {
      return line.trim();
    }
    currentPos = lineEnd + 1; // +1 for newline character
  }
  return null;
}

// SUBTLE RIGGING: Double-click on textarea to select rigged winner
// No visual indication - completely invisible to observers
textarea.addEventListener('dblclick', (e) => {
  const cursorPos = textarea.selectionStart;
  const clickedLine = getLineAtPosition(textarea.value, cursorPos);

  if (clickedLine && names.includes(clickedLine)) {
    // Set rigged name - no visual feedback at all
    riggedName = clickedLine;
  }
});

// Event listeners
textarea.addEventListener('input', updateEntryCount);
wheelWrapper.addEventListener('click', spinWheel);
wheelCenter.addEventListener('click', (e) => {
  e.stopPropagation();
  spinWheel();
});
closeModalBtn.addEventListener('click', closeModal);
removeWinnerBtn.addEventListener('click', removeWinner);
shuffleBtn.addEventListener('click', shuffleNames);
sortBtn.addEventListener('click', sortNames);

// Close modal on overlay click
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    closeModal();
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
    closeModal();
  }
});

// Initialize with sample names
textarea.value = `Alice
Bob
Charlie
Diana
Edward
Fiona
George
Hannah`;

updateEntryCount();
