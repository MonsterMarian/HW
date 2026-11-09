// SILICON // LOGIC STUDIO - ULTRA HIGH-PERFORMANCE RUST SIMULATION CORE
// Architecture: Bit-Sliced SIMD, Cache-Aligned SoA, Zero-Copy VRAM.

use serde::{Deserialize, Serialize};

#[repr(u8)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WireState {
    Low = 0,
    High = 1,
    HighZ = 2,
    Conflict = 3,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum GateType {
    And,
    Or,
    Xor,
    Nand,
    Nor,
    Not,
    Mux,
    TriState,
    DFlipFlop,
    Register8,
}

/// Cache-friendly Structure of Arrays (SoA) representing the entire circuit netlist
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SiliconCircuit {
    pub wire_values: Vec<u64>,       // 64-parallel bit-sliced values
    pub wire_floating: Vec<u64>,     // 64-parallel High-Z masks
    pub gate_types: Vec<GateType>,
    pub gate_in_a: Vec<usize>,
    pub gate_in_b: Vec<usize>,
    pub gate_in_c: Vec<usize>,       // Select or Enable
    pub gate_out: Vec<usize>,
    pub dff_state: Vec<u64>,         // Registers & Flip-Flops persistent state
    pub vram: Vec<u8>,               // 64x64 or 320x240 Zero-Copy display buffer
}

impl SiliconCircuit {
    pub fn new() -> Self {
        Self {
            wire_values: Vec::new(),
            wire_floating: Vec::new(),
            gate_types: Vec::new(),
            gate_in_a: Vec::new(),
            gate_in_b: Vec::new(),
            gate_in_c: Vec::new(),
            gate_out: Vec::new(),
            dff_state: Vec::new(),
            vram: vec![0u8; 64 * 64],
        }
    }

    /// Evaluates 64 circuit states in parallel via SIMD bit-slicing
    #[inline(always)]
    pub fn step_cycle(&mut self, clk: bool) {
        let gate_count = self.gate_types.len();

        for i in 0..gate_count {
            let in_a = self.wire_values[self.gate_in_a[i]];
            let in_b = if self.gate_in_b[i] < self.wire_values.len() {
                self.wire_values[self.gate_in_b[i]]
            } else {
                0
            };
            let out_idx = self.gate_out[i];

            match self.gate_types[i] {
                GateType::Not => {
                    self.wire_values[out_idx] = !in_a;
                }
                GateType::And => {
                    self.wire_values[out_idx] = in_a & in_b;
                }
                GateType::Or => {
                    self.wire_values[out_idx] = in_a | in_b;
                }
                GateType::Xor => {
                    self.wire_values[out_idx] = in_a ^ in_b;
                }
                GateType::Nand => {
                    self.wire_values[out_idx] = !(in_a & in_b);
                }
                GateType::Nor => {
                    self.wire_values[out_idx] = !(in_a | in_b);
                }
                GateType::Mux => {
                    let sel = self.wire_values[self.gate_in_c[i]];
                    // Bitwise mux: (A & !sel) | (B & sel)
                    self.wire_values[out_idx] = (in_a & !sel) | (in_b & sel);
                }
                GateType::TriState => {
                    let en = self.wire_values[self.gate_in_c[i]];
                    self.wire_values[out_idx] = in_a;
                    self.wire_floating[out_idx] = !en; // 1 if disconnected
                }
                GateType::DFlipFlop => {
                    if clk {
                        self.dff_state[i] = in_a;
                    }
                    self.wire_values[out_idx] = self.dff_state[i];
                }
                GateType::Register8 => {
                    let we = self.wire_values[self.gate_in_c[i]];
                    if clk {
                        self.dff_state[i] = (self.dff_state[i] & !we) | (in_a & we);
                    }
                    self.wire_values[out_idx] = self.dff_state[i];
                }
            }
        }
    }

    /// Direct VRAM access for GPU monitor
    #[inline(always)]
    pub fn write_pixel(&mut self, x: usize, y: usize, color: u8) {
        if x < 64 && y < 64 {
            self.vram[y * 64 + x] = color;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_and_gate_simd() {
        let mut circuit = SiliconCircuit::new();
        circuit.wire_values = vec![0b1010, 0b1100, 0];
        circuit.wire_floating = vec![0, 0, 0];
        circuit.gate_types.push(GateType::And);
        circuit.gate_in_a.push(0);
        circuit.gate_in_b.push(1);
        circuit.gate_in_c.push(0);
        circuit.gate_out.push(2);

        circuit.step_cycle(true);
        assert_eq!(circuit.wire_values[2], 0b1000);
    }
}
