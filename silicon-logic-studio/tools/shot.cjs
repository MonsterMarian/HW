// Usage: electron shot.cjs <steps.json> <outdir>
// steps: [{js:"..."} | {wait:ms} | {shot:"name"} | {click:[x,y], dbl:true}]
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const [stepsFile, outDir] = process.argv.slice(-2);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const logs = [];
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1500, height: 920, show: false, webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } });
  win.webContents.on('preload-error', (e, p, err) => logs.push('PRELOAD ' + err));
  win.webContents.on('did-finish-load', () => win.webContents.executeJavaScript(`
    window.__errs = []; window.addEventListener('error', e => window.__errs.push(e.message));
    window.__view = (t) => [...document.querySelectorAll('button')].find(b => b.innerText.replace(/\\s+/g,' ').includes(t)).click();
    window.__dbl = (x, y, z = 1, vx = 80, vy = 70) => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: r.left + vx + x * z, clientY: r.top + vy + y * z })); };
    window.__crumb = () => [...document.querySelectorAll('button')].map(b => b.innerText).filter(t => /^L\\d/.test(t.trim())).join(' > ');
  `));
  win.webContents.on('console-message', (e) => { const m = e.message ?? arguments[2]; logs.push(`[${e.level}] ${m}`); });
  win.webContents.on('render-process-gone', (e, d) => logs.push('GONE ' + JSON.stringify(d)));
  await win.loadURL('http://localhost:5199/');
  await new Promise(r => setTimeout(r, 2500));
  for (const s of steps) {
    try {
      if (s.wait) await new Promise(r => setTimeout(r, s.wait));
      if (s.js) { const v = await win.webContents.executeJavaScript(s.js); logs.push('JS> ' + JSON.stringify(v)); }
      if (s.click) {
        const [x, y] = s.click; const n = s.dbl ? 2 : 1;
        for (let i = 1; i <= n; i++) {
          win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: i });
          win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: i });
        }
        await new Promise(r => setTimeout(r, 400));
      }
      if (s.key) { win.webContents.sendInputEvent({ type: 'keyDown', keyCode: s.key }); win.webContents.sendInputEvent({ type: 'keyUp', keyCode: s.key }); }
      if (s.shot) { const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(outDir, s.shot + '.png'), img.toPNG()); }
    } catch (err) { logs.push('STEP ERR ' + err.message); }
  }
  fs.writeFileSync(path.join(outDir, 'log.txt'), logs.join('\n'));
  app.quit();
});
