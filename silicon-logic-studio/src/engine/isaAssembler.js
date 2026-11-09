// SILICON // LOGIC STUDIO - CUSTOM ISA & ASSEMBLER ENGINE
// Allows defining custom instruction sets and compiling assembly to bytecode for ROM/RAM.

export const DEFAULT_ISA = {
  name: 'SILICON-8 RISC',
  instructions: [
    { mnemonic: 'NOP',  opcode: 0x00, format: '0000 0000', desc: 'No operation' },
    { mnemonic: 'LDI',  opcode: 0x01, format: '0001 {r:2} {imm:4}', desc: 'Load immediate value into register' },
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

      if (line.endsWith(':')) {
        const labelName = line.slice(0, -1).trim();
        labels.set(labelName, address);
        continue;
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

      if (mnemonic === 'LDI') {
        const reg = this.parseReg(parts[1]);
        const imm = Number(parts[2]) & 0x03;
        byte |= (reg << 2) | imm;
      } else if (mnemonic === 'MOV' || mnemonic === 'ADD' || mnemonic === 'SUB' || mnemonic === 'AND' || mnemonic === 'OR' || mnemonic === 'PIX') {
        const rd = this.parseReg(parts[1]);
        const rs = this.parseReg(parts[2]);
        byte |= (rd << 2) | rs;
      } else if (mnemonic === 'JMP' || mnemonic === 'JZ') {
        let target = parts[1];
        let targetAddr = labels.has(target) ? labels.get(target) : Number(target);
        byte |= (targetAddr & 0x0F);
      }

      bytecode[item.addr] = byte;
    }

    return { bytecode, parsedInstructions };
  }

  parseReg(name) {
    if (!name) return 0;
    const clean = name.toUpperCase().replace('R', '');
    return (Number(clean) || 0) & 0x03; // 4 registers: R0, R1, R2, R3
  }
}
