/**
 * Vortex Zero-Latency Worker (Platinum Edition) - JS VERSION
 */

const COLORS = [
  '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', 
  '#f59e0b', '#ef4444', '#3b82f6', '#6366f1'
];

let points = [];
let stars = [];
let width = 0;
let height = 0;
let rotationY = 0;
let time = 0;

function init(pCount, sCount, w, h) {
  width = w;
  height = h;
  points = Array.from({ length: pCount }, () => ({
    x: (Math.random() - 0.5) * 1000,
    y: (Math.random() - 0.5) * 1000,
    z: (Math.random() - 0.5) * 1000,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 2 + 1,
    driftX: 0,
    driftY: 0
  }));

  stars = Array.from({ length: sCount }, () => ({
    x: (Math.random() - 0.5) * 3000,
    y: (Math.random() - 0.5) * 3000,
    z: 2000 + Math.random() * 2000,
    size: Math.random() * 0.8
  }));
}

function project(p, rx, ry, w, h) {
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;

  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y1 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;

  const focalLength = 800;
  const scale = focalLength / (focalLength + z2);
  const screenX = x1 * scale + w / 2 + (p.driftX || 0);
  const screenY = y1 * scale + h / 2 + (p.driftY || 0);

  return { x: screenX, y: screenY, scale, z: z2 };
}

function update(mx, my, mrx, mry) {
  time += 0.005;
  rotationY += 0.0015;
  
  const rx = mrx * 0.35;
  const ry = rotationY + mry * 0.35;

  const renderedStars = stars.map(s => {
    const proj = project(s, mrx * 0.05, mry * 0.05, width, height);
    return { x: proj.x, y: proj.y, scale: proj.scale, size: s.size };
  });

  const renderedPoints = points.map(p => {
    const proj = project(p, rx, ry, width, height);
    
    const dx = proj.x - mx;
    const dy = proj.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = 180;

    if (dist < radius) {
      const force = (radius - dist) / radius;
      const factor = force * 25;
      p.driftX += (dx / dist) * factor;
      p.driftY += (dy / dist) * factor;
    }

    p.driftX *= 0.92;
    p.driftY *= 0.92;

    const depthOpacity = Math.max(0, Math.min(1, (1200 - proj.z) / 2000));
    const opacity = Math.max(0.05, Math.min(1, proj.scale * depthOpacity));

    return { 
      x: proj.x, 
      y: proj.y, 
      scale: proj.scale, 
      color: p.color, 
      size: p.size, 
      opacity,
      isBloom: proj.scale > 1.1
    };
  });

  return { stars: renderedStars, points: renderedPoints, time };
}

self.onmessage = (e) => {
  const { type, payload } = e.data;

  if (type === 'INIT') {
    init(payload.pCount, payload.sCount, payload.width, payload.height);
  } else if (type === 'RESIZE') {
    width = payload.width;
    height = payload.height;
  } else if (type === 'UPDATE') {
    const result = update(payload.mx, payload.my, payload.mrx, payload.mry);
    self.postMessage({ type: 'RENDER', payload: result });
  }
};
