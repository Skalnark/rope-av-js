# Rope Algorithm Visualizer

## 🔗 Live demo

You can access the live demo on your browser [clicking here](https://skalnark.github.io/rope-av-js/).

## Features

- Visualizes **Rope** operations with animated, step-by-step tree rendering:
  - **Insert** — split → build → concat, showing the three temporary trees (L, N, R)
  - **Delete** — split → split → discard → concat, showing intermediate trees (L, rest / L, M, R)
  - **Index** — splay-based character lookup
