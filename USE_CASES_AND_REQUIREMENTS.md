# Taxon: Use Cases and Functional Requirements

Based on the codebase analysis, **Taxon** is an interactive web application designed to parse, load, and use Lucid identification keys for specimen identification, enhanced with a Gemini-powered AI assistant that interprets natural language descriptions.

## 1. Use Cases

### UC1: Import and Load Identification Key
* **Actor:** User
* **Description:** The user uploads a Lucid key archive file (`.zip`, `.lk4`, `.lk5`). The system processes the nested XML files (`key.data`, `normal.sco`) to build the taxonomy tree, feature lists, and scoring logic.

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

### UC7: Search and Navigation
* **Actor:** User
* **Description:** The user searches for specific entities or chosen features via text input fields, highlighting and auto-expanding relevant tree nodes.

### UC8: Configure Application Preferences
* **Actor:** User
* **Description:** The user accesses the preferences to set the UI theme (Light/Dark), application language, and Gemini API key required for the AI assistant.

---

## 2. Functional Requirements

### 2.1. File Parsing & Data Extraction
* **FR1.1:** The system must accept and parse `.zip` archives containing Lucid key data structures.
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

### 2.4. User Interface & Display
* **FR4.1:** The layout must consist of dynamically resizable panels supporting Features, Chosen Features, Remaining Entities, Discarded Entities, and the AI Assistant sidebar.
* **FR4.2:** The system must display entities in toggleable "List" and "Grid" views.
* **FR4.3:** The application must present modal overlays for Entity details, Feature image views, general Key Information, and an Image Lightbox viewer. The Entity details modal must display characteristics in a recursive, collapsible tree structure matching their hierarchy, and provide global "Expand All" and "Collapse All" controls.
* **FR4.4:** Entity feature scores must be visually represented with badges indicating probability/interpretations (e.g., Common, Rare, Uncertain, Interval, Misinterpreted).
* **FR4.5:** The system must display stacking visual toast notifications when features are selected or cleared, dynamically showing the count of discarded or restored entities alongside the total number of remaining entities. These toasts must act independently and fade out based on their initial appearance time.

### 2.5. Search and Filtering
* **FR5.1:** Tree components must support text-based search filtering, automatically expanding parent groups to reveal matching child nodes.
* **FR5.2:** Nodes matching search criteria must be highlighted, while non-matching siblings in an expanded view must be visually dimmed (reduced opacity).
* **FR5.3:** The system must automatically scroll the view to the current matching search result, visually highlight it, and provide Previous/Next buttons to manually scroll through all search matches within the respective panel.
* **FR5.4:** The system must provide a clear search button (X) within the search input fields to allow users to quickly reset their active filters.

### 2.6. State Management & Persistence
* **FR6.1:** The system must preserve user preferences (API key, language selection, light/dark theme, toast notifications toggle) across sessions using the browser's `localStorage`.
* **FR6.2:** All application states (loaded keys, AI chat history, selected features) must be reset gracefully when a user imports a new key. The user can also manually clear their selections via the clear button in the Chosen Features panel, or clear the AI chat history via the Assistant panel (which prompts for confirmation).

### 2.7. Localization (i18n)
* **FR7.1:** The system must support multi-language translation using an internal dictionary.
* **FR7.2:** Supported languages must include English, Portuguese (BR), Spanish, Russian, Chinese, Japanese, French, German, Latin, and Italian.
* **FR7.3:** The system must automatically detect the user's browser language on first load and fall back to English if the language is unsupported.