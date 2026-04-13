# Taxon: Functional Requirements, Business Rules, and Use Cases

Based on the codebase analysis, **Taxon** is an interactive web application designed to parse, load, and use Lucid identification keys for specimen identification, enhanced with a Gemini-powered AI assistant that interprets natural language descriptions.

## 1. Functional Requirements

### 1.1. File Parsing & Data Extraction
* **FR1.1:** The system must accept and parse `.zip` archives containing Lucid key data structures, as well as native `.json` drafting schemas. The system must support opening files via standard file dialogs and global drag-and-drop interactions (with specific drop targets on the Main Menu).
* **FR1.2:** The system must parse nested ZIP structures to read `key.data` (XML) for entities, features, and media definitions, and `normal.sco` (XML) for scoring matrices.
* **FR1.3:** The system must generate temporary object URLs (`Blob`) to display images stored locally inside the ZIP's `Media/` directory without requiring a backend.

### 1.2. Identification Engine
* **FR2.1:** The system must support two types of features: categorical (states) and numeric (ranges).
* **FR2.2:** The system must identify "Direct Matches" (entities that strictly match all selected features and numeric thresholds).
* **FR2.3:** The system must compute "Indirect Matches" (parent/group nodes that contain at least one remaining valid child entity).
* **FR2.4:** The system must discard entities that lack a score for a chosen feature, fall outside the allowed numeric score range (`min` / `max`), or have a state score of '0'. Entities with 'Uncertain' ('3') or 'Misinterpreted' ('4', '5') scores must be dynamically retained or discarded based on user-configurable identification tolerances.
* **FR2.5:** The system must support advanced feature matching rules defined by the key author. Categorical features can evaluate their selected states using logical OR (Match Any), logical AND (Match All), or enforce a strict SINGLE selection constraint.

### 1.3. AI Assistant Integration
* **FR3.1:** The system must communicate with the Google Gemini API using a user-provided API key.
* **FR3.2:** The AI must maintain a consolidated, running context of the user's description across chat messages, and the system must provide the multi-turn chat history to the API to allow natural follow-up questions.
* **FR3.3:** The AI must map the natural language description exclusively to the available feature IDs derived from the loaded Lucid key and output a strictly formatted JSON response.
* **FR3.4:** The chat interface must parse the AI's returned features and explicitly highlight the count and names of entities that still match the described criteria.
* **FR3.5:** The AI must support conversational Q&A about the key's metadata, available features, and entity characteristics. The AI must structure its responses predictably (e.g., direct answer followed by bullet points) and explicitly reject off-topic questions.
* **FR3.6:** The system must gracefully handle AI API errors, specifically alerting the user when an API key is invalid or when the API quota has been exceeded.
* **FR3.7:** The system must display a disclaimer indicating that AI-generated answers may contain incorrect information.
* **FR3.8:** The system must pre-filter the entity profiles sent to the AI context to optimize token usage. Profiles are dynamically included if they match the user's direct input, were referenced by the AI in the previous conversational turn, or if the overall remaining match pool is narrow enough (≤10 entities) to warrant full analytical consideration. The feature list is intentionally sent in its entirety to allow the AI to perform semantic matching (e.g., mapping user synonyms to existing features).
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
* **FR3.22:** The chat interface must include an inline `@` mention system, allowing the user to search and explicitly tag specific features and entities within their prompt to enforce context.
* **FR3.23:** The system must automatically intercept and collapse adjacent chat messages of the same role (e.g., consecutive user messages) into a single unified payload before transmission to prevent Gemini API 500 sequence errors.

### 1.4. User Interface & Display
* **FR4.1:** The application must provide a dedicated Welcome Screen allowing users to branch into either "Identify" or "Create" modes before loading the main interface.
* **FR4.2:** The main layout must consist of dynamically resizable floating panels supporting Features, Chosen Features, Remaining Entities, Discarded Entities, and the AI Assistant panel (which can be hidden via user preferences). The application headers and bottom navigation bars must also employ a cohesive "floating island" design rather than strictly adhering to screen edges.
* **FR4.3:** The system must display entities in toggleable "List" and "Grid" views.
* **FR4.4:** The application must present modal overlays for Entity details, Feature details (displaying image galleries, Markdown descriptions, and metadata such as type, units, and associated states), general Key Information, Preferences, an Image Lightbox viewer (which must support zooming, panning, and viewing images uploaded within the AI chat), and confirmation dialogs for destructive actions. The Entity details modal must display descriptions and characteristics in distinct visually elevated sections, feature a recursive collapsible tree structure, provide global "Expand All" and "Collapse All" controls, and offer a "Back to Top" scrolling button.
* **FR4.5:** Entity feature scores must be visually represented with badges indicating probability/interpretations (e.g., Common, Rare, Uncertain, Interval, Misinterpreted) or author-defined custom values and icons.
* **FR4.6:** The system must display stacking visual toast notifications when features are selected or cleared, dynamically showing the count of discarded or restored entities alongside the total number of remaining entities. These toasts must act independently and fade out based on their initial appearance time.
* **FR4.7:** The application must be fully responsive for mobile devices, dynamically transforming the desktop multi-pane grid layout into horizontally swipeable tab views anchored by a persistent bottom navigation bar.
* **FR4.8:** Media lightboxes and modal image viewers must support native-feeling mobile touch gestures, allowing users to smoothly swipe horizontally to navigate between images with visual edge-resistance.
* **FR4.9:** The system must utilize custom-styled UI form elements (such as glassmorphic dropdown menus, text inputs, and checkboxes) consistently across all modes and modals to maintain visual cohesion, replacing default native browser elements.
* **FR4.10:** The application must dynamically generate and update the browser's Favicon (via an inline SVG data URI) and `theme-color` meta tag to perfectly synchronize with the user's selected UI theme and active accent color.
* **FR4.11:** The system must visually indicate fuzzy matches (e.g., misinterpreted or uncertain traits) with specific warning badges inline within the entity list panels.

### 1.5. Search and Filtering
* **FR5.1:** Tree components must support text-based search filtering, automatically expanding parent groups to reveal matching child nodes.
* **FR5.2:** Nodes matching search criteria must be highlighted, while non-matching siblings in an expanded view must be visually dimmed (reduced opacity).
* **FR5.3:** The system must automatically scroll the view to the current matching search result, visually highlight it, and provide Previous/Next buttons to manually scroll through all search matches within the respective panel.
* **FR5.4:** The system must provide a clear search button (X) within the search input fields to allow users to quickly reset their active filters.

### 1.6. State Management & Persistence
* **FR6.1:** The system must preserve user preferences (API key, language selection, light/dark theme, toast notifications toggle, AI assistant visibility, UI animations toggle, identification tolerances for misinterpretations and uncertainties, panel layout sizes, and entities view modes) across sessions using the browser's `localStorage`.
* **FR6.2:** All application states (loaded keys, AI chat history, selected features) must be reset gracefully when a user opens a new key. The user can also manually clear their selections via the clear button in the Chosen Features panel, or clear the AI chat history via the Assistant panel (both of which prompt for confirmation via a custom modal).
* **FR6.3:** Chat histories and active states must be strictly isolated between the Identify and Builder modes to prevent contextual overlap.
* **FR6.4:** The system must provide an option in the preferences menu to safely delete all locally saved data, wiping the `localStorage` and resetting the application state entirely.

### 1.7. Localization (i18n)
* **FR7.1:** The system must support multi-language translation using an internal dictionary.
* **FR7.2:** Supported languages must include English, Portuguese (BR), Portuguese (PT), Spanish, Russian, Chinese, Japanese, Korean, French, German, Latin, Italian, Greek, Hindi, Arabic, and Hebrew.
* **FR7.3:** The system must automatically detect the user's browser language on first load and fall back to English if the language is unsupported.

### 1.8. Key Builder (Authoring Mode)
* **FR8.1:** The system must provide a dedicated UI mode for building and editing keys.
* **FR8.2:** The system must allow users to add, edit, duplicate, and safely delete (via a confirmation modal) entities, features, and individual states. It must also safely intercept and confirm destructive operations, such as switching a populated categorical feature to a numeric type.
* **FR8.3:** The system must allow users to establish parent-child hierarchical relationships for entities and features, and move individual states between different categorical features, via visual drag-and-drop interaction (supporting both desktop mouse events and mobile long-press touch gestures with custom visual ghost elements that track finger position), featuring visual depth indicators and collapsible groups.
* **FR8.4:** The system must allow users to assign all supported score types connecting entities to features and states. Authors can use the default probability scores (e.g., Common, Rare, Uncertain, Misinterpreted) or define entirely custom state values with customizable colors and icons.
* **FR8.5:** The system must maintain an internal history stack to support Undo and Redo operations.
* **FR8.6:** The system must allow users to attach, preview (via lightbox modal), and reorder (via drag-and-drop) local images for entities, features, and states, capturing caption and copyright metadata. Attached images must be automatically processed and compressed (max 1024x1024 pixels) to optimize builder payload sizes.
* **FR8.7:** The system must allow adding Markdown-formatted descriptions to entities, features, and states.
* **FR8.8:** The system must support resuming work by natively loading previously exported custom `.json` keys directly into the builder.
* **FR8.9:** The system must support exporting the constructed key data into a custom JSON format.
* **FR8.10:** The system must preserve the active draft key locally (via `localStorage`) to prevent accidental data loss across browser refreshes, while still allowing the user to seamlessly navigate between the builder and the Main Menu.
* **FR8.11:** The system must provide a "Test Key" function that instantly loads the working draft into the Identification Engine for real-time testing without requiring file exports.
* **FR8.12:** The system must integrate the AI Assistant within the Builder Mode to provide and directly ingest taxonomic feature and entity suggestions. The AI context must dynamically include a compacted schema of the draft's existing features and entities to prevent duplicates and optimize token usage. Additionally, AI message blocks must store deep state snapshots to provide a contextual "Undo" button, allowing users to instantly cleanly revert complex, multi-item taxonomy ingestions.
* **FR8.13:** The system must intelligently track draft modifications (using JSON snapshot comparisons) and provide a safe "New Key" or "Open Key" workflow that prompts the user to export their current draft only if unsaved edits exist.
* **FR8.14:** The system must provide a dedicated, horizontally-scrollable Scoring Matrix interface that plots entities against features/states. The matrix must support interactive crosshair highlighting for row/column tracking (highlighting strictly upwards and leftwards from the cursor), allow setting numeric range bounds (`min`/`max`) via modals, and support left-click (quick cycle) and right-click (dropdown selection) interactions for categorical state assignments. It must also provide a global "Clear Matrix" action with a safety confirmation modal to instantly wipe all existing score assignments.
* **FR8.15:** The system must allow authors to configure the matching behavior of categorical features, toggling between Match Any (OR), Match All (AND), or Single Selection.

---

## 2. Business Rules

### 2.1. Entity Filtering & Identification Logic
* **BR1.1 (Direct Matches):** An entity is considered a direct match only if it meets the criteria for all currently chosen features. If no features are selected, all entities are considered direct matches.
* **BR1.2 (Direct Discards):** An entity is immediately discarded if it fails to match even one chosen feature. A mismatch occurs if:
  * The entity lacks any score data for the chosen feature.
  * For categorical (state) features, the entity's score value is '0' (indicating absence), or it is an 'Uncertain' ('3') or 'Misinterpreted' ('4', '5') score that the user has explicitly disallowed via application preferences.
  * For numeric features, the user's chosen value falls strictly outside the entity's defined minimum and maximum threshold (`< min` or `> max`).
* **BR1.3 (Indirect Matches):** Group (parent) entities are considered indirect matches if they are not themselves direct matches, but they contain at least one descendant child node that is a direct match. They remain visible in the tree to preserve hierarchy.
* **BR1.4 (Dimming Discarded Groups):** Group nodes that are technically discarded but contain child nodes that still need to be displayed are kept in the DOM but visually dimmed.
* **BR1.5 (Fuzzy Matches):** Entities that match via an 'Uncertain' or 'Misinterpreted' score (and are permitted by user preferences) are retained as direct matches but must be visually flagged to the user.
* **BR1.6 (Feature Logical Constraints):** If a categorical feature is configured as 'AND', an entity is discarded unless it possesses valid scores for *all* the user's selected states for that feature. If configured as 'OR' or 'SINGLE', it requires only one match among the selected states. 'SINGLE' additionally restricts the UI to prevent multiple state selections simultaneously.

### 2.2. AI Assistant Context & Constraints
* **BR2.1 (Trait Accumulation):** During identification, the AI must continuously accumulate visual and textual traits into a running "Current Description". Traits are only replaced if corrected by the user, and only cleared if explicitly requested.
* **BR2.2 (Categorical Mapping):** When mapping user descriptions to categorical features, the AI must output the specific state's ID, never the parent feature's ID.
* **BR2.3 (Context Pruning):** To optimize token usage, the AI is provided with all features for semantic matching, but only a subset of Entity Profiles. Detailed profiles are only injected if they match keywords in the user's input, were mentioned in the previous turn, or if the current list of matching entities is 10 or fewer.
* **BR2.4 (Model Selection):** The system defaults to fast, text-optimized models (e.g., `gemini-3.1-flash-lite-preview`) for standard chat, but automatically switches to multimodal models (e.g., `gemini-flash-latest`) when an image payload is detected. Fallback mechanisms to older models (e.g., `gemini-2.5-flash-lite`, `gemini-2.5-flash`) must be in place.
* **BR2.5 (Builder AI Actions):** When the AI is used in Builder Mode to edit keys:
  * To delete an item, the AI must output the object with `"action": "delete"`.
  * To clear all scores for an entity, the AI must set the specific flag `"clear_scores": true` rather than attempting to delete scores individually.
* **BR2.6 (Identification Interaction):** In Identification mode, when attempting to identify a specimen, the AI must leave the conversational "answer" string empty and rely on the system to generate the appropriate translated UI response based on the "features_used" and "entities_used" arrays.

### 2.3. Key Building & Scoring Matrix
* **BR3.1 (Default States):** If custom score values are not defined for a state, the system defaults to standard probability scores: Common ('1'), Rare ('2'), Uncertain ('3'), Common (misinterpreted) ('4'), and Rare (misinterpreted) ('5').
* **BR3.2 (Numeric Score Inference):** When an author inputs only a `min` or only a `max` value for a numeric score assignment, the system automatically duplicates the value to both bounds, converting it into an exact discrete value.
* **BR3.3 (Matrix Highlighting):** The scoring matrix implements strict "crosshair" highlighting—when hovering over a data cell, only the cells to the left (same row) and upwards (same column) are highlighted to connect the cell to its row and column headers, preventing visual clutter from full-row/column highlights.

---

## 3. Use Cases

### UC1: Import and Load Identification Key
* **Actor:** User
* **Description:** The user clicks "Identify" on the welcome screen (or uses the "Open Key" action in the header or sidebar, or uses global drag-and-drop) to upload a Lucid key archive file (`.zip`, `.lk4`, `.lk5`) or a native Taxon JSON file (`.json`). The system processes the file to build the taxonomy tree, feature lists, and scoring logic.
* **Associated Functional Requirements:** FR1.1, FR1.2, FR1.3, FR4.1
* **Associated Business Rules:** None

### UC2: Manual Specimen Identification
* **Actor:** User
* **Description:** The user browses available characteristics (features and states) in the "Features" panel and selects the ones that match their specimen (including specific numeric values or states). The user can click the info icon or thumbnail of any feature or state to open a detailed modal containing its image gallery, description, and metadata (such as feature type, physical units, or scoring ranges).
* **Associated Functional Requirements:** FR2.1, FR4.2, FR4.4, FR4.5, FR4.6
* **Associated Business Rules:** BR3.1

### UC3: Automatic Filtering of Entities
* **Actor:** User
* **Description:** As the user selects features, the system dynamically filters the entities. Entities that match all chosen features remain in the "Entities Remaining" panel, while mismatched entities are moved to the "Entities Discarded" panel. Entities matching via uncertain or misinterpreted traits are flagged with visual warning badges.
* **Associated Functional Requirements:** FR2.2, FR2.3, FR2.4, FR4.2
* **Associated Business Rules:** BR1.1, BR1.2, BR1.3, BR1.4

### UC4: Explore Taxon Details
* **Actor:** User
* **Description:** The user clicks on an entity to open a detailed modal containing the taxon's hierarchical path, list of characteristic features (with score probabilities like "Common", "Rare", "Uncertain"), and an image gallery. Features are grouped hierarchically, with the ability to expand or collapse individual groups or all groups at once.
* **Associated Functional Requirements:** FR4.3, FR4.4, FR4.5, FR4.8
* **Associated Business Rules:** None

### UC5: AI-Assisted Identification
* **Actor:** User
* **Description:** Instead of manually picking features, the user opens the "Spot" AI Assistant and types a natural language description of the specimen. The AI interprets the description, updates the running characteristics, maps them to the Lucid key's exact features, and highlights the matching entities.
* **Associated Functional Requirements:** FR3.1, FR3.2, FR3.3, FR3.4, FR3.6, FR3.8, FR3.9, FR3.10, FR3.13, FR3.14, FR3.15, FR3.16, FR3.22, FR3.23
* **Associated Business Rules:** BR2.1, BR2.2, BR2.3, BR2.6

### UC6: Ask Questions About the Key
* **Actor:** User
* **Description:** The user asks the AI assistant general or specific questions about the key's features, entities, or metadata (e.g., "What is feature X?", "Who authored this key?"). The AI leverages the parsed key data to provide informative answers.
* **Associated Functional Requirements:** FR3.5, FR3.7, FR3.9, FR3.11, FR3.12
* **Associated Business Rules:** None

### UC7: Multimodal Image Identification
* **Actor:** User
* **Description:** The user uploads an image of a specimen to the AI assistant along with an optional text description. The AI analyzes the visual features of the image, maps them to the Lucid key's characteristics, and identifies matching entities.
* **Associated Functional Requirements:** FR3.17, FR3.18, FR3.19, FR3.20, FR3.21
* **Associated Business Rules:** BR2.4

### UC8: Search and Navigation
* **Actor:** User
* **Description:** The user searches for specific entities or chosen features via text input fields, highlighting and auto-expanding relevant tree nodes.
* **Associated Functional Requirements:** FR5.1, FR5.2, FR5.3, FR5.4
* **Associated Business Rules:** None

### UC9: Configure Application Preferences
* **Actor:** User
* **Description:** The user accesses the preferences (available directly from the welcome screen, the desktop header, or the mobile sidebar) to set the UI theme (Light/Dark), application language, toggle toast notifications, toggle the AI assistant, toggle UI animations, adjust identification tolerances (allowing misinterpretations or uncertainties), provide the Gemini API key required for the AI assistant, view application information in the About section, and delete all locally saved data.
* **Associated Functional Requirements:** FR4.10, FR6.1, FR6.4, FR7.1, FR7.2, FR7.3
* **Associated Business Rules:** None

### UC10: Create and Edit Identification Keys
* **Actor:** User
* **Description:** The user selects "Create" on the welcome screen to author a new identification key or edit an existing one (from an empty slate or a loaded `.json` key). They can add, duplicate, or delete entities and features, establish hierarchical relationships via drag-and-drop, assign images (with captions and copyright metadata), input Markdown descriptions, and define score matrices. The user can leverage the AI Assistant to generate suggested structures (which dynamically avoids duplicating existing items), test the key instantly in the Identify engine, revert mistakes using Undo/Redo, and export the finalized key as a custom JSON file.
* **Associated Functional Requirements:** FR4.9, FR8.1, FR8.2, FR8.3, FR8.4, FR8.5, FR8.6, FR8.7, FR8.8, FR8.9, FR8.10, FR8.11, FR8.12, FR8.13, FR8.14
* **Associated Business Rules:** BR2.5, BR3.1, BR3.2, BR3.3

### UC11: Return to Main Menu
* **Actor:** User
* **Description:** The user clicks the Taxon logo to return to the initial Welcome Screen. The application preserves the currently active key or builder draft, allowing the user to seamlessly resume their identification or editing session.
* **Associated Functional Requirements:** FR4.1, FR6.2, FR6.3
* **Associated Business Rules:** None