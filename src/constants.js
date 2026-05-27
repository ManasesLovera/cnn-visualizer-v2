// Shared constants for the CNN Visualizer

export const COLOR = {
  bg:        0xfafafa,
  primary:   0x1976d2,
  primary2:  0x90caf9,
  secondary: 0x7c4dff,
  cat:       0x26a69a,
  dog:       0xef5350,
  surface:   0xffffff,
  outline:   0xe0e0e0,
  textSoft:  0x9e9e9e,
};

export const POS = {
  input:   -9,
  conv1:   -5.5,
  conv2:   -2,
  pool:     1.2,
  flatten:  4,
  dense:    6.5,
  output:   9,
};

export const LAYER_LABELS = [
  { id: 'input',   txt: 'Input',     sub: '64×64×3',  x: POS.input,   y: 1.7 },
  { id: 'conv1',   txt: 'Conv2D',    sub: '32@30×30', x: POS.conv1,   y: 1.7 },
  { id: 'conv2',   txt: 'Conv2D',    sub: '64@13×13', x: POS.conv2,   y: 1.7 },
  { id: 'pool',    txt: 'MaxPool',   sub: '64@6×6',   x: POS.pool,    y: 1.7 },
  { id: 'flatten', txt: 'Flatten',   sub: '2304',     x: POS.flatten, y: 2.3 },
  { id: 'dense',   txt: 'Dense',     sub: 'ReLU · 128', x: POS.dense,  y: 1.9 },
  { id: 'output',  txt: 'Output',    sub: 'softmax',  x: POS.output,  y: 1.7 },
];

// Image metadata (paths resolved relative to public at runtime)
export const IMAGES = [
  { kind: 'cat', label: 'Cat · 01', file: '/images/cat1.jpg' },
  { kind: 'cat', label: 'Cat · 02', file: '/images/cat2.jpg' },
  { kind: 'dog', label: 'Dog · 01', file: '/images/dog1.jpg' },
  { kind: 'dog', label: 'Dog · 02', file: '/images/dog2.jpg' },
];

export const PARTICLE_COUNT = 160;
