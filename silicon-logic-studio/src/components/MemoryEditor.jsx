import React, { useEffect, useReducer, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { memory256 } from '../engine/logicEngine';

const hex2 = (v) => v.toString(16).toUpperCase().padStart(2, '0');
const ROWS = Array.from({ length: 16 }, (_, r) => r * 16);
const COLS = Array.from({ length: 16 }, (_, c) => c);

/** Paměť vybrané RAM / ROM (256 B) šestnáctkově, živě za běhu; klik na bajt ho přepíše (PLAN_PROJEKTU §4.2). */
export function MemoryEditor({ engine, compId }) {
  const [, refresh] = useReducer((n) => n + 1, 0);
  const [edit, setEdit] = useState(null); // { addr, text }
  useEffect(() => engine.subscribe(refresh), [engine]);

  const comp = engine.components.get(compId);
  if (!comp || (comp.type !== 'RAM' && comp.type !== 'ROM')) return null;
  const blank = comp.type === 'ROM' ? 0xFF : 0; // smazaná ROM čte FF
  const mem = comp.memory || [];
  const current = typeof comp.inputs.addr === 'number' ? comp.inputs.addr & 0xFF : -1;

  const commit = () => {
    const v = /^[0-9a-f]{1,2}$/i.test(edit.text.trim()) ? parseInt(edit.text, 16) : null;
    if (v !== null) {
      comp.memory = memory256(comp.memory, blank);
      comp.memory[edit.addr] = v;
      engine.propagate(); // výstup dout se přepočítá hned, i když hodiny stojí
      engine.notify();
    }
    setEdit(null);
  };

  return (
    <div data-memory-editor className="absolute top-14 right-4 z-30 bg-(--bg-dark) border border-(--line) p-3 font-mono text-[10px] leading-[15px] select-none">
      <div className="flex items-baseline gap-2 mb-2">
        <HardDrive size={12} className="text-(--accent-amber) self-center" />
        <span className="panel-title">{comp.type} 256 B</span>
        <span className="text-(--text-muted)">{comp.label || comp.id} · klik na bajt = přepsat</span>
      </div>
      <div className="text-(--text-muted) pl-[26px]">{COLS.map((c) => <span key={c} className="inline-block w-[19px] text-center">{c.toString(16).toUpperCase()}</span>)}</div>
      {ROWS.map((row) => (
        <div key={row}>
          <span className="inline-block w-[26px] text-(--text-muted)">{hex2(row)}</span>
          {COLS.map((c) => {
            const addr = row + c;
            if (edit?.addr === addr) {
              return (
                <input
                  key={c}
                  autoFocus
                  value={edit.text}
                  maxLength={2}
                  onChange={(e) => setEdit({ addr, text: e.target.value })}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    e.stopPropagation(); // Escape jinak zruší výběr součástky a editor zmizí
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') setEdit(null);
                  }}
                  className="w-[19px] h-[15px] p-0 text-center bg-(--accent-amber) text-black outline-none"
                />
              );
            }
            const v = (mem[addr] ?? blank) & 0xFF;
            return (
              <span
                key={c}
                data-addr={addr}
                onClick={() => setEdit({ addr, text: hex2(v) })}
                title={`adresa 0x${hex2(addr)} = ${v}`}
                className={`inline-block w-[19px] text-center cursor-pointer hover:bg-(--line) ${addr === current ? 'bg-(--accent-amber) text-black' : v === blank ? 'text-(--text-muted)' : 'text-(--text-light)'}`}
              >
                {hex2(v)}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
