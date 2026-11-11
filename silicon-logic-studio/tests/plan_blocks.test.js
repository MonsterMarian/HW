// Bloky z PLAN_PROJEKTU.md §4.3–4.4: aritmetické akcelerátory, MMIO dekodér, řadič přerušení, DMA, režimy monitoru.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LogicEngine, WireState, screenInfo, screenRgb, formatProbe } from '../src/engine/logicEngine.js';

const part = (id, type, extra = {}) => ({ id, type, x: 0, y: 0, inputs: {}, outputs: {}, ...extra });
const sw = (id, v = 0) => part(id, 'INPUT', { outputs: { out: v } });
const build = (parts, wires) => {
  const e = new LogicEngine();
  parts.forEach((p) => e.addComponent(p));
  wires.forEach(([a, ap, b, bp]) => e.addWire(a, ap, b, bp));
  e.propagate();
  return e;
};
const set = (e, id, v) => { e.components.get(id).outputs.out = v; e.propagate(); };
const out = (e, id) => e.components.get(id).outputs;
const tick = (e, clk = 'clk') => { set(e, clk, 1); set(e, clk, 0); };
const f16 = (x) => new Uint16Array(new Float16Array([x]).buffer)[0];

describe('aritmetické akcelerátory', () => {
  it('násobička 8×8 → 16 bitů, neznámý vstup dá X', () => {
    const e = build([sw('a', 200), sw('b', 123), part('m', 'MULTIPLIER_8BIT')], [['a', 'out', 'm', 'a'], ['b', 'out', 'm', 'b']]);
    assert.equal(out(e, 'm').p, 24600);
    set(e, 'a', WireState.CONFLICT);
    assert.equal(out(e, 'm').p, WireState.CONFLICT);
  });

  it('barrel shifter rotuje 8 bitů doleva o 0–7', () => {
    const e = build([sw('d', 0b10010001), sw('s', 0), part('r', 'BARREL_SHIFTER_8BIT')], [['d', 'out', 'r', 'in'], ['s', 'out', 'r', 'shift']]);
    assert.equal(out(e, 'r').out, 0b10010001);
    set(e, 's', 1);
    assert.equal(out(e, 'r').out, 0b00100011);
    set(e, 's', 7);
    assert.equal(out(e, 'r').out, 0b11001000);
  });

  it('FPU IEEE 754 binary16: součet, součin, zaokrouhlení k sudé, přetečení do nekonečna', () => {
    const e = build([sw('a', f16(1.5)), sw('b', f16(2.25)), sw('op', 0), part('f', 'FPU_HALF')],
      [['a', 'out', 'f', 'a'], ['b', 'out', 'f', 'b'], ['op', 'out', 'f', 'op']]);
    assert.equal(out(e, 'f').out, f16(3.75));
    set(e, 'op', 1);
    assert.equal(out(e, 'f').out, f16(3.375));
    set(e, 'op', 0);
    set(e, 'a', 0x3C00); set(e, 'b', 0x0001); // 1 + nejmenší denormál → zpět 1 (zaokrouhlení)
    assert.equal(out(e, 'f').out, 0x3C00);
    set(e, 'op', 1);
    set(e, 'a', 0x7BFF); set(e, 'b', 0x4000); // největší číslo × 2 → +nekonečno
    assert.equal(out(e, 'f').out, 0x7C00);
  });
});

describe('CPU ↔ GPU', () => {
  it('MMIO dekodér: 0xF000–0xFFFF jde do registrů GPU, ostatní do RAM', () => {
    const e = build([sw('addr', 0xF012), sw('we', 1), part('d', 'MMIO_DECODER')], [['addr', 'out', 'd', 'addr'], ['we', 'out', 'd', 'we']]);
    assert.deepEqual({ ...out(e, 'd') }, { sel: 1, reg: 0x012, io_we: 1, mem_we: 0 });
    set(e, 'addr', 0xEFFF);
    assert.deepEqual({ ...out(e, 'd') }, { sel: 0, reg: 0xFFF, io_we: 0, mem_we: 1 });
    set(e, 'we', 0);
    assert.equal(out(e, 'd').mem_we, 0);
  });

  it('řadič přerušení: zachytí hranu, respektuje masku, priorita nižšího čísla, ACK maže', () => {
    const e = build(
      [sw('i0'), sw('i1'), sw('i2'), sw('mask', 0b111), sw('ack'), sw('clk'), part('q', 'IRQ_CONTROLLER')],
      [['i0', 'out', 'q', 'irq0'], ['i1', 'out', 'q', 'irq1'], ['i2', 'out', 'q', 'irq2'], ['mask', 'out', 'q', 'mask'], ['ack', 'out', 'q', 'ack'], ['clk', 'out', 'q', 'clk']]
    );
    assert.equal(out(e, 'q').int, 0);
    set(e, 'i2', 1); set(e, 'i2', 0); // krátký pulz zůstane zachycený
    assert.deepEqual({ ...out(e, 'q') }, { int: 1, vector: 2 });
    set(e, 'i0', 1);
    assert.equal(out(e, 'q').vector, 0); // V-Sync má přednost
    set(e, 'mask', 0b100);
    assert.equal(out(e, 'q').vector, 2); // maskovaná linka se nehlásí
    set(e, 'mask', 0b111);
    set(e, 'ack', 1); tick(e); // potvrzení smaže obsluhovanou linku (0)
    assert.deepEqual({ ...out(e, 'q') }, { int: 1, vector: 2 });
    tick(e);
    assert.equal(out(e, 'q').int, 0);
  });

  it('DMA zkopíruje blok RAM → RAM na pozadí a po dokončení pulzne IRQ', () => {
    const src = part('src', 'RAM', { memory: Uint8Array.from({ length: 256 }, (_, i) => (i * 7) & 0xFF) });
    const e = build(
      [sw('clk'), sw('start'), sw('s', 10), sw('d', 100), sw('n', 5), src, part('dst', 'RAM'), part('dma', 'DMA_CONTROLLER')],
      [
        ['clk', 'out', 'dma', 'clk'], ['clk', 'out', 'dst', 'clk'], ['start', 'out', 'dma', 'start'],
        ['s', 'out', 'dma', 'src'], ['d', 'out', 'dma', 'dst'], ['n', 'out', 'dma', 'len'],
        ['dma', 'raddr', 'src', 'addr'], ['src', 'dout', 'dma', 'din'],
        ['dma', 'waddr', 'dst', 'addr'], ['dma', 'dout', 'dst', 'din'], ['dma', 'we', 'dst', 'we'],
      ]
    );
    set(e, 'start', 1); tick(e); set(e, 'start', 0);
    assert.equal(out(e, 'dma').busy, 1);
    let irqSeen = 0;
    for (let i = 0; i < 8; i++) { tick(e); irqSeen += out(e, 'dma').irq; }
    assert.equal(out(e, 'dma').busy, 0);
    assert.equal(irqSeen, 1);
    const dst = e.components.get('dst').memory;
    assert.deepEqual([...dst.slice(100, 105)], [70, 77, 84, 91, 98]);
    assert.equal(dst[105], 0);
    assert.equal(dst[99], 0);
  });
});

describe('virtuální monitor', () => {
  const screen = (extra) => build(
    [sw('x', 0), sw('y', 0), sw('c', 0), sw('we', 1), sw('clk'), part('scr', 'VIRTUAL_SCREEN', extra)],
    [['x', 'out', 'scr', 'x'], ['y', 'out', 'scr', 'y'], ['c', 'out', 'scr', 'color'], ['we', 'out', 'scr', 'we'], ['clk', 'out', 'scr', 'clk']]
  );

  it('výchozí je 64×64, 8bitová paleta 3-3-2 (staré obvody se nemění)', () => {
    const e = screen();
    set(e, 'x', 63); set(e, 'y', 2); set(e, 'c', 0xE0); tick(e);
    const scr = e.components.get('scr');
    assert.deepEqual(screenInfo(scr), { cols: 64, rows: 64, mode: 'INDEXED8' });
    assert.equal(scr.vram[2 * 64 + 63], 0xE0);
    assert.deepEqual(screenRgb(scr, 0xE0), [252, 0, 0]);
  });

  it('320×240 RGB565 a 1bitový režim; zápis mimo obrazovku se zahodí', () => {
    const e = screen({ cols: 320, rows: 240, colorMode: 'RGB565' });
    set(e, 'x', 319); set(e, 'y', 239); set(e, 'c', 0xFFFF); tick(e);
    const scr = e.components.get('scr');
    assert.equal(scr.vram.length, 320 * 240);
    assert.equal(scr.vram[239 * 320 + 319], 0xFFFF);
    assert.deepEqual(screenRgb(scr, 0xFFFF), [255, 255, 255]);
    assert.deepEqual(screenRgb(scr, 0xF800), [255, 0, 0]);
    set(e, 'x', 320); set(e, 'y', 0); tick(e);
    assert.equal(scr.vram[0], 0);
    assert.equal(scr.vram[320], 0);
    const m = screen({ cols: 160, rows: 120, colorMode: 'MONO' });
    set(m, 'c', 6); tick(m); // 1bitový režim bere jen bit 0
    assert.equal(m.components.get('scr').vram[0], 0);
    assert.deepEqual(screenRgb(m.components.get('scr'), 1), [255, 255, 255]);
  });

  it('skener generuje H-Sync na konci řádku a V-Sync na posledním řádku', () => {
    const e = screen({ cols: 4, rows: 3 });
    const seen = [];
    for (let i = 0; i < 12; i++) { tick(e); seen.push(`${out(e, 'scr').hsync}${out(e, 'scr').vsync}`); }
    assert.deepEqual(seen, ['00', '00', '10', '00', '00', '00', '10', '01', '01', '01', '11', '00']);
  });
});

describe('sonda', () => {
  it('formátuje hodnotu sběrnice jako DEC / HEX / BIN / ASCII', () => {
    assert.equal(formatProbe(65, 'DEC'), '65');
    assert.equal(formatProbe(65, 'HEX'), '0x41');
    assert.equal(formatProbe(5, 'BIN'), '101');
    assert.equal(formatProbe(65, 'ASCII'), 'A');
    assert.equal(formatProbe(7, 'ASCII'), '·'); // netisknutelný znak
    assert.equal(formatProbe(WireState.HIGH_Z, 'HEX'), 'Z');
    assert.equal(formatProbe(undefined), '-');
  });
});

describe('opravy z review knihovny (2026-11-11)', () => {
  const X = WireState.CONFLICT;
  it('MUX a DEMUX výstup vždy budí: plovoucí vstup dá X, ne Z', () => {
    const e = build([sw('a', 1), sw('en', 1), part('t', 'TRI_STATE_BUFFER'), sw('s', 0), part('m', 'MUX'), part('d', 'DEMUX')],
      [['a', 'out', 't', 'in'], ['en', 'out', 't', 'enable'], ['t', 'out', 'm', 'a'], ['s', 'out', 'm', 'sel'], ['t', 'out', 'd', 'in'], ['s', 'out', 'd', 'sel']]);
    assert.equal(out(e, 'm').out, 1);
    set(e, 'en', 0); // budič se odpojí, síť plave
    assert.equal(out(e, 'm').out, X);
    assert.equal(out(e, 'd').out0, X);
    assert.equal(out(e, 'd').out1, 0);
  });

  it('ROM s kratším obsahem čte nenaprogramované buňky jako 0xFF a výstup budí', () => {
    const e = new LogicEngine();
    e.loadCircuit({ components: [sw('a', 200), part('r', 'ROM', { memory: [1, 2, 3] })], wires: [{ from: { id: 'a', pin: 'out' }, to: { id: 'r', pin: 'addr' } }] });
    assert.equal(out(e, 'r').dout, 0xFF);
    set(e, 'a', 1);
    assert.equal(out(e, 'r').dout, 2);
  });

  it('RAM s neznámou adresou čte X a nic nezapíše', () => {
    const e = build([sw('a', X), sw('d', 0x99), sw('we', 1), sw('clk'), part('r', 'RAM')],
      [['a', 'out', 'r', 'addr'], ['d', 'out', 'r', 'din'], ['we', 'out', 'r', 'we'], ['clk', 'out', 'r', 'clk']]);
    tick(e);
    assert.equal(out(e, 'r').dout, X);
    assert.equal(e.components.get('r').memory[0], 0);
  });

  it('registr s neznámým WE přejde do X (nezapíše potichu)', () => {
    const e = build([sw('d', 0x11), sw('we', X), sw('clk'), part('r', 'REGISTER_8BIT')],
      [['d', 'out', 'r', 'd'], ['we', 'out', 'r', 'we'], ['clk', 'out', 'r', 'clk']]);
    tick(e);
    assert.equal(out(e, 'r').q, X);
  });

  it('odpojený vstup se vrátí na výchozí úroveň (nedrží poslední hodnotu drátu)', () => {
    const e = build([sw('a', 1), sw('b', 1), part('g', 'AND')], [['a', 'out', 'g', 'a'], ['b', 'out', 'g', 'b']]);
    assert.equal(out(e, 'g').out, 1);
    e.removeWire(e.wires.find((w) => w.to.pin === 'b').id);
    e.propagate();
    assert.equal(out(e, 'g').out, 0);
  });
});

describe('zbytky z review knihovny', () => {
  const X = WireState.CONFLICT;
  it('SR latch po zakázaném stavu (S=R=1 → obě 0 naráz) skončí v X, ne v nemožném stavu 1/1', () => {
    const e = build([sw('s', 1), sw('r', 1), part('q', 'NOR'), part('nq', 'NOR')],
      [['r', 'out', 'q', 'a'], ['nq', 'out', 'q', 'b'], ['s', 'out', 'nq', 'a'], ['q', 'out', 'nq', 'b']]);
    assert.deepEqual([out(e, 'q').out, out(e, 'nq').out], [0, 0]);
    e.components.get('s').outputs.out = 0; e.components.get('r').outputs.out = 0; e.propagate();
    assert.equal(e.oscillating, true);
    assert.deepEqual([out(e, 'q').out, out(e, 'nq').out], [X, X]);
    set(e, 's', 1); // platný vstup latch zase srovná
    assert.deepEqual([out(e, 'q').out, out(e, 'nq').out], [1, 0]);
  });

  it('úplná sčítačka: přenos je znám, když ho určují dva známé vstupy', () => {
    const e = build([sw('a', 1), sw('b', 1), sw('c', X), part('fa', 'FULL_ADDER')], [['a', 'out', 'fa', 'a'], ['b', 'out', 'fa', 'b'], ['c', 'out', 'fa', 'cin']]);
    assert.deepEqual([out(e, 'fa').s, out(e, 'fa').cout], [X, 1]);
    set(e, 'a', 0); set(e, 'b', 0);
    assert.equal(out(e, 'fa').cout, 0);
    set(e, 'b', 1);
    assert.equal(out(e, 'fa').cout, X);
  });
});
