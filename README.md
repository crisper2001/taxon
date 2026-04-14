<img src="public/logo.svg" width="480" alt="Taxon Logo" />

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.en.html)

**Taxon** is an interactive, browser-based web application designed to create, edit, and use taxonomic identification keys. It utilizes a modern JSON format while maintaining compatibility with legacy Lucid keys through a modern, accessible interface. The experience is supercharged by **Spot**, an AI assistant capable of multimodal natural language identification and intelligent key generation.

> [!IMPORTANT]
Lucid and the Lucid Key format are trademarks of Identic Pty Ltd. Taxon is an independent project and is not affiliated with, endorsed by, or sponsored by Identic Pty Ltd.

## Features

### Identification Engine
*   Legacy & Modern Support
*   Advanced Filtering
*   Rich Media & Profiles

### Key Creator
*   Visual Editor
*   Scoring Matrix
*   AI Auto-Suggestions
*   Local Processing

### Spot: The AI Assistant
*   Natural Language Identification
*   Multimodal Support
*   Privacy-First API

### Accessibility & UI
*   Multilingual
*   Responsive & Customizable

## Getting Started

### Prerequisites
Ensure you have Node.js installed on your machine, or Docker and Docker Compose.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/crisper2001/taxon.git
   cd taxon
   ```

#### Option 1: Running locally with Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local Vite URL (usually `http://localhost:5173`).

#### Option 2: Running with Docker Compose

1. Build and start the container:
   ```bash
   docker compose up -d --build
   ```

2. Open your browser and navigate to `http://localhost:3000`.

## Configuration

To use the AI Assistant (**Spot**), you will need a valid Google Gemini API key.

1. Open Taxon in your browser.
2. Click the **Preferences** icon (gear symbol).
3. Navigate to the **AI Configuration** tab.
4. Enter your API key.

> [!NOTE]
The API key is never sent to a backend server; it is stored securely in your browser's `localStorage` and communicates directly with the Google API.

## Tech Stack

*   **Framework:** React + Vite
*   **Styling:** Tailwind CSS
*   **Language:** TypeScript
*   **AI Integration:** Google Gen AI SDK
*   **Icons:** Lucide React

## Credits

Created by **Isaque**

Special thanks to **Gabriel** and **Lêda**