# RuneScape Task Randomizer

## Overview

The RuneScape Task Randomizer is a dynamic web application designed to help players of the popular MMORPG, RuneScape, navigate and complete in-game tasks for events like Leagues or other task-based challenges. It provides a user-friendly interface to view, filter, and randomly select tasks, track completion progress, and synchronize with real-time player data from the official RuneScape Wiki API.

This tool is perfect for players who want to strategize their task completion, discover new challenges, or simply add an element of randomness to their gameplay.

## Core Features

-   **Dynamic Task Filtering:** Filter a comprehensive list of in-game tasks by:
    -   **Location:** Narrow down tasks to specific regions in the game world.
    -   **Points:** Select tasks based on their point value (e.g., Easy, Medium, Hard).
    -   **Skills:** Find tasks that require specific player skills (e.g., Mining, Smithing).
    -   **Keywords:** Search for tasks using specific terms.
-   **Player Stats Integration:** Look up any RuneScape player to:
    -   Fetch and display their current skill levels.
    -   Automatically check off tasks that have already been completed in-game.
    -   Filter tasks to show only those that are completable with the player's current skill levels.
-   **Two Viewing Modes:**
    -   **Randomizer View:** Get a randomly selected task from the filtered list, perfect for spontaneous gameplay.
    -   **Task Browser:** View all available tasks in a sortable, filterable table to plan your next steps.
-   **Persistent Task Tracking:**
    -   **Complete Tasks:** Manually mark tasks as complete. This progress is saved locally in the browser's storage.
    -   **Pin Tasks:** Pin tasks of interest to a dedicated "Pinned" list for easy access.
    -   **Undo Completion:** Easily undo a completed task if you make a mistake.
-   **External Wiki Links:** Task requirements, such as quests or achievements, are automatically converted into clickable links that lead to the relevant RuneScape Wiki page for more information.

## How It Works

The application is composed of a data processing script and a frontend interface that work together to deliver a seamless experience.

### 1. Data Processing

-   **`raw_tasks.txt`**: This file contains the raw, tab-separated data for all the tasks, copied directly from the RuneScape Wiki.
-   **`process_tasks.js`**: This is a Node.js script responsible for parsing the `raw_tasks.txt` file. It cleans the data, handles multi-line entries, and transforms the raw text into a structured JSON format.
-   **`tasks.json`**: The output of the processing script. This file is a clean, well-formatted JSON array of task objects that the frontend application can easily consume.

To generate or update the task data, you run the command:
```bash
node process_tasks.js
```

### 2. Frontend Logic (`script.js`)

The frontend is a static web application that handles all user interactions and data visualization.

-   **Initialization**: On page load, the application fetches the `tasks.json` file to get the full list of tasks. It also loads any completed or pinned tasks from the browser's `localStorage`.
-   **Filtering**: The filtering system dynamically updates the list of "available tasks" based on the user's selections. When the "Only show completable tasks" toggle is active, it cross-references task requirements with the fetched player stats.
-   **Player Stats**: When a user looks up a player name, the app sends a request to the `sync.runescape.wiki` API. The returned data includes the player's skill levels and a list of officially completed task IDs. The application uses this data to update the UI, mark tasks as complete, and enable the completability filter.
-   **Task Display**: The app formats task information, converting skill requirements into color-coded indicators (red for unmet, green for met) and creating hyperlinks for quests and achievements.
-   **State Management**: User-specific data, such as completed and pinned tasks, is stored in `localStorage`, ensuring that progress is saved between sessions.

## How to Use

### Prerequisites

-   [Node.js](https://nodejs.org/) must be installed on your system to run the data processing script.

### Setup Instructions

1.  **Clone or download the repository.**
2.  **Generate the Task Data**: Before you can run the application, you need to create the `tasks.json` file. Open your terminal in the project's root directory and run:
    ```bash
    node process_tasks.js
    ```
    This will generate the `tasks.json` file in the same directory.

3.  **Run the Application**: Once the `tasks.json` file is present, simply open the `index.html` file in your preferred web browser.

You can now start filtering tasks, looking up player stats, and discovering new challenges in RuneScape!