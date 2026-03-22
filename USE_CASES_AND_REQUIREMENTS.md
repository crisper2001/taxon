# Taxon: Use Cases and Functional Requirements

Based on the codebase analysis, **Taxon** is an interactive web application designed to parse, load, and use Lucid identification keys for specimen identification, enhanced with a Gemini-powered AI assistant that interprets natural language descriptions.

## 1. Use Cases

### UC1: Import and Load Identification Key
* **Actor:** User
* **Description:** The user clicks "Identify" on the welcome screen (or uses the "Open Key" action in the header or sidebar, or uses global drag-and-drop) to upload a Lucid key archive file (`.zip`, `.lk4`, `.lk5`) or a native Taxon JSON file (`.json`). The system processes the file to build the taxonomy tree, feature lists, and scoring logic.

### UC2: Manual Specimen Identification
* **Actor:** User
* **Description:** The user browses available characteristics (features and states) in the "Features" panel and selects the ones that match their specimen (including specific numeric values or states).

### UC3: Automatic Filtering of Entities
* **Actor:** User
* **Description:** As the user selects features, the system dynamically filters the entities. Entities that match all chosen features remain in the "Entities Remaining" panel, while mismatched entities are moved to the "Entities Discarded" panel.

### UC4: Explore Taxon Details
* **Actor:** User
* **Description:** The user clicks on an entity to open a detailed modal containing the taxon's hierarchical path, list of characteristic features (with score probabilities like "Common", "Rare", "Uncertain"), and an image gallery. Features are grouped hierarchically, with the ability to expand or collapse individual groups or all groups at once.

### UC5: AI-Assisted Identification
* **Actor:** User
* **Description:** Instead of manually picking features, the user opens the "Spot" AI Assistant and types a natural language description of the specimen. The AI interprets the description, updates the running characteristics, maps them to the Lucid key's exact features, and highlights the matching entities.

### UC6: Ask Questions About the Key
* **Actor:** User
* **Description:** The user asks the AI assistant general or specific questions about the key's features, entities, or metadata (e.g., "What is feature X?", "Who authored this key?"). The AI leverages the parsed key data to provide informative answers.

### UC7: Multimodal Image Identification
* **Actor:** User
* **Description:** The user uploads an image of a specimen to the AI assistant along with an optional text description. The AI analyzes the visual features of the image, maps them to the Lucid key's characteristics, and identifies matching entities.

### UC8: Search and Navigation
* **Actor:** User
* **Description:** The user searches for specific entities or chosen features via text input fields, highlighting and auto-expanding relevant tree nodes.

### UC9: Configure Application Preferences
* **Actor:** User
* **Description:** The user accesses the preferences (available directly from the welcome screen, the desktop header, or the mobile sidebar) to set the UI theme (Light/Dark), application language, toggle toast notifications, hide the AI assistant, provide the Gemini API key required for the AI assistant, and delete all locally saved data.

### UC10: Create and Edit Identification Keys
* **Actor:** User
* **Description:** The user selects "Create" on the welcome screen to author a new identification key or edit an existing one (from an empty slate or a loaded `.json` key). They can add, duplicate, or delete entities and features, establish hierarchical relationships via drag-and-drop, assign images (with captions and copyright metadata), input Markdown descriptions, and define score matrices. The user can leverage the AI Assistant to generate suggested structures (which dynamically avoids duplicating existing items), test the key instantly in the Identify engine, revert mistakes using Undo/Redo, and export the finalized key as a custom JSON file.

### UC11: Return to Main Menu
* **Actor:** User
* **Description:** The user clicks the Taxon logo to return to the initial Welcome Screen. The application preserves the currently active key or builder draft, allowing the user to seamlessly resume their identification or editing session.

---

## 2. Functional Requirements

### 2.1. File Parsing & Data Extraction
* **FR1.1:** The system must accept and parse `.zip` archives containing Lucid key data structures, as well as native `.json` drafting schemas. The system must support opening files via standard file dialogs and global drag-and-drop interactions (with specific drop targets on the Main Menu).
* **FR1.2:** The system must parse nested ZIP structures to read `key.data` (XML) for entities, features, and media definitions, and `normal.sco` (XML) for scoring matrices.
* **FR1.3:** The system must generate temporary object URLs (`Blob`) to display images stored locally inside the ZIP's `Media/` directory without requiring a backend.

### 2.2. Identification Engine
* **FR2.1:** The system must support two types of features: categorical (states) and numeric (ranges).
* **FR2.2:** The system must identify "Direct Matches" (entities that strictly match all selected features and numeric thresholds).
* **FR2.3:** The system must compute "Indirect Matches" (parent/group nodes that contain at least one remaining valid child entity).
* **FR2.4:** The system must discard entities that lack a score for a chosen feature, have a state score of '0', or fall outside the allowed numeric score range (`omin` / `omax`).

### 2.3. AI Assistant Integration
* **FR3.1:** The system must communicate with the Google Gemini API using a user-provided API key.
* **FR3.2:** The AI must maintain a consolidated, running context of the user's description across chat messages, and the system must provide the multi-turn chat history to the API to allow natural follow-up questions.
* **FR3.3:** The AI must map the natural language description exclusively to the available feature IDs derived from the loaded Lucid key and output a strictly formatted JSON response.
* **FR3.4:** The chat interface must parse the AI's returned features and explicitly highlight the count and names of entities that still match the described criteria.
* **FR3.5:** The AI must support conversational Q&A about the key's metadata, available features, and entity characteristics. The AI must structure its responses predictably (e.g., direct answer followed by bullet points) and explicitly reject off-topic questions.
* **FR3.6:** The system must gracefully handle AI API errors, specifically alerting the user when an API key is invalid or when the API quota has been exceeded.
* **FR3.7:** The system must display a disclaimer indicating that AI-generated answers may contain incorrect information.
* **FR3.8:** The system must pre-filter the entity profiles and feature list based on user input (including proper tokenization/matching for CJK languages) before sending them to the AI context to optimize token usage and minimize hallucinations.
* **FR3.9:** The AI must formulate any conversational answers or descriptions in the application's currently selected language, regardless of the language used in the user's input.
* **FR3.10:** The system must supply core persona rules and constraints via the API's dedicated system instructions payload to ensure strong instruction adherence and reduce the risk of prompt injection.
* **FR3.11:** The chat interface must allow users to copy the plain text content of AI responses to the system clipboard, stripping out any internal interactive markup.
* **FR3.12:** The chat interface must automatically truncate excessively long AI responses to maintain readability, providing a user toggle to expand or collapse the full text.
* **FR3.13:** The chat interface must isolate the data explicitly considered by the AI (e.g., features and entities) into a dedicated, togglable dropdown section below the corresponding message.
* **FR3.14:** The chat interface must allow the user to regenerate the latest AI response, safely rewinding the chat history and description state.
* **FR3.15:** The chat interface must allow the user to edit their most recent message inline within the chat bubble, replacing the history and triggering a new AI response upon submission.
* **FR3.16:** The system must track all generated AI answer versions for a given prompt, providing UI controls to navigate back and forth to restore previous conversational states and correct context.
* **FR3.17:** The system must allow users to provide image inputs to the AI assistant for multimodal specimen analysis.
* **FR3.18:** The system must encode user-uploaded images as base64 and structure them as inline data within the Gemini API payload.
* **FR3.19:** The system must automatically process, resize (max 1024x1024 pixels), and compress uploaded images to JPEG via an HTML Canvas before transmission to optimize token usage and bandwidth.
* **FR3.20:** The system must support drag-and-drop, clipboard paste, and manual file selection for uploading images to the AI assistant.
* **FR3.21:** The system must dynamically select a vision-optimized AI model when an image is attached, and provide an automatic fallback to a lighter model if the primary model request fails.

### 2.4. User Interface & Display
* **FR4.1:** The application must provide a dedicated Welcome Screen allowing users to branch into either "Identify" or "Create" modes before loading the main interface.
* **FR4.2:** The main layout must consist of dynamically resizable floating panels supporting Features, Chosen Features, Remaining Entities, Discarded Entities, and the AI Assistant panel (which can be hidden via user preferences). The application headers and bottom navigation bars must also employ a cohesive "floating island" design rather than strictly adhering to screen edges.
* **FR4.3:** The system must display entities in toggleable "List" and "Grid" views.
* **FR4.4:** The application must present modal overlays for Entity details, Feature image views, general Key Information, an Image Lightbox viewer (which must support zooming, panning, and viewing images uploaded within the AI chat), and confirmation dialogs for destructive actions. The Entity details modal must display descriptions and characteristics in distinct visually elevated sections, feature a recursive collapsible tree structure, provide global "Expand All" and "Collapse All" controls, and offer a "Back to Top" scrolling button.
* **FR4.5:** Entity feature scores must be visually represented with badges indicating probability/interpretations (e.g., Common, Rare, Uncertain, Interval, Misinterpreted).
* **FR4.6:** The system must display stacking visual toast notifications when features are selected or cleared, dynamically showing the count of discarded or restored entities alongside the total number of remaining entities. These toasts must act independently and fade out based on their initial appearance time.
* **FR4.7:** The application must be fully responsive for mobile devices, dynamically transforming the desktop multi-pane grid layout into horizontally swipeable tab views anchored by a persistent bottom navigation bar.
* **FR4.8:** Media lightboxes and modal image viewers must support native-feeling mobile touch gestures, allowing users to smoothly swipe horizontally to navigate between images with visual edge-resistance.
* **FR4.9:** The system must utilize custom-styled UI form elements (such as glassmorphic dropdown menus, text inputs, and checkboxes) consistently across all modes and modals to maintain visual cohesion, replacing default native browser elements.

### 2.5. Search and Filtering
* **FR5.1:** Tree components must support text-based search filtering, automatically expanding parent groups to reveal matching child nodes.
* **FR5.2:** Nodes matching search criteria must be highlighted, while non-matching siblings in an expanded view must be visually dimmed (reduced opacity).
* **FR5.3:** The system must automatically scroll the view to the current matching search result, visually highlight it, and provide Previous/Next buttons to manually scroll through all search matches within the respective panel.
* **FR5.4:** The system must provide a clear search button (X) within the search input fields to allow users to quickly reset their active filters.

### 2.6. State Management & Persistence
* **FR6.1:** The system must preserve user preferences (API key, language selection, light/dark theme, toast notifications toggle, AI assistant visibility, panel layout sizes, and entities view modes) across sessions using the browser's `localStorage`.
* **FR6.2:** All application states (loaded keys, AI chat history, selected features) must be reset gracefully when a user opens a new key. The user can also manually clear their selections via the clear button in the Chosen Features panel, or clear the AI chat history via the Assistant panel (both of which prompt for confirmation via a custom modal).
* **FR6.3:** Chat histories and active states must be strictly isolated between the Identify and Builder modes to prevent contextual overlap.
* **FR6.4:** The system must provide an option in the preferences menu to safely delete all locally saved data, wiping the `localStorage` and resetting the application state entirely.

### 2.7. Localization (i18n)
* **FR7.1:** The system must support multi-language translation using an internal dictionary.
* **FR7.2:** Supported languages must include English, Portuguese (BR), Portuguese (PT), Spanish, Russian, Chinese, Japanese, Korean, French, German, Latin, Italian, Greek, Hindi, Arabic, and Hebrew.
* **FR7.3:** The system must automatically detect the user's browser language on first load and fall back to English if the language is unsupported.

### 2.8. Key Builder (Authoring Mode)
* **FR8.1:** The system must provide a dedicated UI mode for building and editing keys.
* **FR8.2:** The system must allow users to add, edit, duplicate, and safely delete (via a confirmation modal) entities, features, and individual states. It must also safely intercept and confirm destructive operations, such as switching a populated categorical feature to a numeric type.
* **FR8.3:** The system must allow users to establish parent-child hierarchical relationships for entities and features, and move individual states between different categorical features, via visual drag-and-drop interaction (supporting both desktop mouse events and mobile long-press touch gestures with custom visual ghost elements that track finger position), featuring visual depth indicators and collapsible groups.
* **FR8.4:** The system must allow users to assign all supported score types (e.g., Common, Rare, Uncertain, Misinterpreted) connecting entities to features and states.
* **FR8.5:** The system must maintain an internal history stack to support Undo and Redo operations.
* **FR8.6:** The system must allow users to attach, preview (via lightbox modal), and reorder (via drag-and-drop) local images for entities, features, and states, capturing caption and copyright metadata. Attached images must be automatically processed and compressed (max 1024x1024 pixels) to optimize builder payload sizes.
* **FR8.7:** The system must allow adding Markdown-formatted descriptions to entities, features, and states.
* **FR8.8:** The system must support resuming work by natively loading previously exported custom `.json` keys directly into the builder.
* **FR8.9:** The system must support exporting the constructed key data into a custom JSON format.
* **FR8.10:** The system must preserve the active draft key locally (via `localStorage`) to prevent accidental data loss across browser refreshes, while still allowing the user to seamlessly navigate between the builder and the Main Menu.
* **FR8.11:** The system must provide a "Test Key" function that instantly loads the working draft into the Identification Engine for real-time testing without requiring file exports.
* **FR8.12:** The system must integrate the AI Assistant within the Builder Mode to provide and directly ingest taxonomic feature and entity suggestions based on user domain descriptions. The AI context must dynamically include the draft's existing features and entities to prevent the assistant from suggesting duplicates.
* **FR8.13:** The system must provide a safe "New Key" workflow that prompts the user to export their current draft before wiping the active builder state.
* **FR8.14:** The system must provide a dedicated, horizontally-scrollable Scoring Matrix interface that plots entities against features/states. The matrix must support interactive crosshair highlighting for row/column tracking, allow setting numeric range bounds (`min`/`max`) via modals, and support left-click (quick cycle) and right-click (dropdown selection) interactions for categorical state assignments.