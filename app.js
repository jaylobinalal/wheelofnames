const textarea = document.getElementById('namesInput');
const listEl = document.getElementById('namesList');
const selectedEl = document.getElementById('selectedName');
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinButton = document.getElementById('spinButton');
const resultEl = document.getElementById('result');

let names = [];
let selectedName = null;
let currentRotation = 0;

function parseNames() {
  return textarea.value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function setSelectedName(name) {
  selectedName = name;
  selectedEl.textContent = name ? `Rigged for: ${name}` : 'No selected name';
  renderNames();
}

function renderNames() {
  names = parseNames();

  if (selectedName && !names.includes(selectedName)) {
    selectedName = null;
    selectedEl.textContent = 'No selected name';
  }

  listEl.innerHTML = '';

  names.forEach((name) => {
    const li = document.createElement('li');
    li.textContent = name;
    if (name === selectedName) li.classList.add('selected');
    li.addEventListener('dblclick', () => setSelectedName(name));

    if (name === selectedName) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Selected';
      li.appendChild(badge);
    }

    listEl.appendChild(li);
  });

  drawWheel();
}

function getClickedLine(textareaEl) {
  const pos = textareaEl.selectionStart;
  const value = textareaEl.value;
  const start = value.lastIndexOf('\n', pos - 1) + 1;
  const end = value.indexOf('\n', pos);
  const line = value.slice(start, end === -1 ? value.length : end).trim();
  return line || null;
}

function colorForIndex(index) {
  const hue = (index * 360) / Math.max(8, names.length);
  return `hsl(${hue}, 70%, 55%)`;
}

function drawWheel() {
  const size = canvas.width;
  const radius = size / 2 - 6;
  ctx.clearRect(0, 0, size, size);

  if (!names.length) {
    ctx.fillStyle = '#1f2a44';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9aa7c2';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Add names to spin the wheel', size / 2, size / 2);
    return;
  }

  const arc = (2 * Math.PI) / names.length;
  const startAngle = -Math.PI / 2;

  names.forEach((name, i) => {
    const angle = startAngle + i * arc;
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.arc(size / 2, size / 2, radius, angle, angle + arc);
    ctx.fillStyle = colorForIndex(i);
    ctx.fill();

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(angle + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0e1320';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(name, radius - 20, 6);
    ctx.restore();
  });
}

function spinWheel() {
  names = parseNames();
  if (!names.length) {
    resultEl.textContent = 'Add at least one name to spin.';
    return;
  }

  const targetIndex = selectedName && names.includes(selectedName)
    ? names.indexOf(selectedName)
    : Math.floor(Math.random() * names.length);

  const slice = 360 / names.length;
  const base = ((currentRotation % 360) + 360) % 360;
  const targetOffset = -1 * (targetIndex * slice + slice / 2);
  const spins = 6;
  const delta = spins * 360 + (targetOffset - base);
  const finalRotation = currentRotation + delta;

  canvas.style.transition = 'transform 5s cubic-bezier(.17,.67,.16,1.05)';
  canvas.style.transform = `rotate(${finalRotation}deg)`;
  resultEl.textContent = 'Spinning...';

  const handleEnd = () => {
    canvas.removeEventListener('transitionend', handleEnd);
    currentRotation = finalRotation;
    const winner = names[targetIndex];
    setSelectedName(winner);
    resultEl.textContent = `Result: ${winner}`;
  };

  canvas.addEventListener('transitionend', handleEnd);
}

textarea.addEventListener('input', renderNames);
textarea.addEventListener('dblclick', (event) => {
  const line = getClickedLine(event.target);
  if (line && names.includes(line)) {
    setSelectedName(line);
  }
});

spinButton.addEventListener('click', spinWheel);

textarea.value = ['Ada', 'Grace', 'Linus', 'Claude', 'Edsger', 'Anita', 'Alan', 'Margaret'].join('\n');
renderNames();
