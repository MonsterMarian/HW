// Registry of behavioural device models (chips, connectors, external equipment).
// Each entry: { meta, pins: {inputs, outputs}, widths?, pulls?, joins?, passive?, netNames?, clocks?(comp, engine), init?(comp), eval(comp, engine) }
import { NV1_DEVICES } from './nv1Card.js';

export const DEVICES = { ...NV1_DEVICES };
