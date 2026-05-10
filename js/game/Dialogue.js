// ============================================================
// Dialogue.js — speech bubble DOM system
// Bubbles track a world-space position; call tick() each frame.
// ============================================================

export class Dialogue {
  constructor() {
    this._el    = null;
    this._worldX = 0;
    this._worldY = 0;
  }

  // Show a new bubble at world coords. variant: 'demon' | 'midnight' | ''
  show(worldX, worldY, text, variant = '') {
    this._dismiss();

    const el = document.createElement('div');
    el.className = 'speech-bubble' + (variant ? ` speech-bubble--${variant}` : '');
    el.textContent = text;
    document.body.appendChild(el);

    this._el     = el;
    this._worldX = worldX;
    this._worldY = worldY;
  }

  // Call every frame with current camera offset to reposition
  tick(camX, camY) {
    if (!this._el) return;
    const sx = this._worldX - camX;
    const sy = this._worldY - camY;
    this._el.style.left      = sx + 'px';
    this._el.style.top       = sy + 'px';
    this._el.style.transform = 'translate(-50%, -100%)';
  }

  // Update tracked world position (call when entity moves)
  moveTo(worldX, worldY) {
    this._worldX = worldX;
    this._worldY = worldY;
  }

  hide() {
    this._dismiss();
  }

  _dismiss() {
    if (!this._el) return;
    const el = this._el;
    this._el = null;
    el.classList.add('speech-bubble--out');
    setTimeout(() => el.isConnected && el.remove(), 350);
  }
}
