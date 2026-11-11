// SILICON // LOGIC STUDIO - CUSTOM ISA & ASSEMBLER ENGINE
// Allows defining custom instruction sets and compiling assembly to bytecode for ROM/RAM.

export const DEFAULT_ISA = {
  name: 'SILICON-8 RISC',
  instructions: [
    { mnemonic: 'NOP',  opcode: 0x00, format: '0000 0000', desc: 'No operation' },
    { mnemonic: 'LDI',  opcode: 0x01, format: '0001 {r:2} {imm:2}', desc: 'Load immediate 0-3 into register' },
    { mnemonic: 'MOV',  opcode: 0x02, format: '0010 {rd:2} {rs:2}', desc: 'Copy register rs into rd' },
    { mnemonic: 'ADD',  opcode: 0x03, format: '0011 {rd:2} {rs:2}', desc: 'Add rd = rd + rs' },
    { mnemonic: 'SUB',  opcode: 0x04, format: '0100 {rd:2} {rs:2}', desc: 'Subtract rd = rd - rs' },
    { mnemonic: 'AND',  opcode: 0x05, format: '0101 {rd:2} {rs:2}', desc: 'Bitwise AND rd = rd & rs' },
    { mnemonic: 'OR',   opcode: 0x06, format: '0110 {rd:2} {rs:2}', desc: 'Bitwise OR rd = rd | rs' },
    { mnemonic: 'JMP',  opcode: 0x07, format: '0111 {addr:4}', desc: 'Unconditional jump to address' },
    { mnemonic: 'JZ',   opcode: 0x08, format: '1000 {addr:4}', desc: 'Jump if zero flag is set' },
    { mnemonic: 'PIX',  opcode: 0x09, format: '1001 {rx:2} {ry:2}', desc: 'Draw pixel on virtual GPU screen' },
    { mnemonic: 'HLT',  opcode: 0x0F, format: '1111 0000', desc: 'Halt execution' },
  ],
};

export class IsaAssembler {
  constructor(isa = DEFAULT_ISA) {
    this.isa = isa;
  }

  // Assembles assembly text to Uint8Array bytecode
  assemble(sourceCode) {
    const lines = sourceCode.split('\n');
    const bytecode = new Uint8Array(256);
    const labels = new Map();
    const parsedInstructions = [];
    let address = 0;

    // Pass 1: Parse labels and clean up comments
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].split(';')[0].trim(); // remove comments
      if (!line) continue;

      // návěští může stát samo na řádku i před instrukcí (`loop: ADD R1, R2`)
      const label = line.match(/^(\w+):\s*(.*)$/);
      if (label) {
        labels.set(label[1], address);
        line = label[2];
        if (!line) continue;
      }

      parsedInstructions.push({ lineIndex: i, text: line, addr: address });
      address++;
    }

    // Pass 2: Encode instructions into bytes
    for (const item of parsedInstructions) {
      const parts = item.text.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
      const mnemonic = parts[0]?.toUpperCase();
      const spec = this.isa.instructions.find((ins) => ins.mnemonic === mnemonic);

      if (!spec) {
        throw new Error(`Line ${item.lineIndex + 1}: Unknown instruction '${mnemonic}'`);
      }

      let byte = (spec.opcode & 0x0F) << 4;
      // chybný operand je chyba překladu: tiché oříznutí by do ROM zapsalo jinou instrukci, než je ve zdrojáku
      const fail = (msg) => { throw new Error(`Line ${item.lineIndex + 1}: ${msg}`); };
      const reg = (name) => {
        const m = /^R([0-3])$/i.exec(name || '');
        return m ? Number(m[1]) : fail(`neplatný registr '${name ?? ''}' (R0–R3)`);
      };
      const num = (text, max, what) => {
        const v = Number(text);
        return text !== undefined && Number.isInteger(v) && v >= 0 && v <= max ? v : fail(`${what} '${text ?? ''}' mimo rozsah 0–${max}`);
      };

      if (mnemonic === 'LDI') {
        byte |= (reg(parts[1]) << 2) | num(parts[2], 3, 'hodnota');
      } else if (mnemonic === 'MOV' || mnemonic === 'ADD' || mnemonic === 'SUB' || mnemonic === 'AND' || mnemonic === 'OR' || mnemonic === 'PIX') {
        byte |= (reg(parts[1]) << 2) | reg(parts[2]);
      } else if (mnemonic === 'JMP' || mnemonic === 'JZ') {
        const target = parts[1];
        if (!labels.has(target) && !/^\d/.test(target || '')) fail(`neznámé návěští '${target ?? ''}'`);
        byte |= num(labels.has(target) ? String(labels.get(target)) : target, 15, 'adresa');
      }

      bytecode[item.addr] = byte;
    }

    return { bytecode, parsedInstructions };
  }
}
