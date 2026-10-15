# Still

A quiet, local-first focus companion in forest green, rain, and fog.

## What works

- Pomodoro focus, short-break, and long-break modes
- Deep forest dark mode by default, with an optional light theme
- A radial time-remaining visualization and optional paced-breathing anchor
- Custom timer lengths, keyboard shortcuts, pause/reset, and refresh-safe state
- A single auto-saving focus intention
- Locally generated rain ambience with volume control
- Editable distraction blocklist and daily session rhythm
- A Chrome/Edge/Brave extension that enforces the blocklist while focus is running, even when the app tab is closed
- Responsive layout and reduced-motion support

## Use the web app

Open the published Site or run `python3 -m http.server 4173 --directory dist` from this folder.

Browsers do not let ordinary web pages control other tabs, so the hosted version demonstrates quiet mode but cannot enforce it by itself.

## Enable real blocking

1. Open `chrome://extensions` in Chrome, Edge, Brave, or another Chromium browser.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `extension` folder in this project.
4. Pin **Still**. Clicking its icon opens the full app.

The extension uses Chrome's built-in declarative blocking API. It receives no browsing history and sends no data anywhere.

## Rebuild

Run `npm run build`. This refreshes both `dist/` and `extension/` from the shared source.
