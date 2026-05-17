# todo-tui

A terminal user interface (TUI) Todo app built with Node.js + [`blessed`](https://github.com/chjj/blessed).

## Requirements

- Node.js v20+
- macOS or Linux terminal

## Install

```sh
npm install
```

## Run

```sh
npm start
# or
node src/index.js
```

Todos are persisted to `~/.todo-app/todos.json`.

## Keybindings

| Key       | Action                |
| --------- | --------------------- |
| `↑` / `↓` | Navigate list         |
| `a`       | Add new todo          |
| `Enter`   | View detail           |
| `Space`   | Toggle complete       |
| `d`       | Delete selected       |
| `/`       | Cycle filter mode     |
| `q`       | Quit                  |
| `Ctrl+C`  | Quit                  |

## Features

- Split-pane layout (list on the left, detail on the right)
- Arrow-key navigation with highlighted selection
- Color coding: pending (white), completed (green + strikethrough)
- Status bar with keybinding hints
- Confirmation prompt before deleting
- Filter by status: All / Active / Completed
- Atomic JSON persistence (tmp-file + rename) — graceful exit cannot corrupt the data file

## Project structure

```
todo-app/
├── src/
│   ├── index.js          # Entry point
│   ├── ui/
│   │   ├── App.js        # Root component
│   │   ├── TodoList.js   # List panel
│   │   └── TodoDetail.js # Detail panel
│   ├── store/
│   │   └── todos.js      # CRUD + file persistence
│   └── utils/
│       └── uuid.js       # ID generation
├── tests/
│   ├── store.test.js
│   └── uuid.test.js
├── package.json
└── README.md
```

## Tests

```sh
npm test
```
