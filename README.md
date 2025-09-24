# Task Randomizer

A simple web application to help you randomly select tasks from a list, with various filtering options.

## Features

-   **Random Task Generation:** Get a random task from the available list.
-   **Filtering:** Filter tasks by location, points, required skills, and keywords.
-   **Task Browser:** View all tasks in a sortable and filterable table.
-   **Task Completion:** Mark tasks as complete. Your completed tasks are saved in your browser's local storage.
-   **Task Pinning:** Pin tasks you want to save for later.

## How to Run

This is a static web application. To run it, you first need to generate the `tasks.json` file.

### Prerequisites

You must have [Node.js](https://nodejs.org/) installed to run the data processing script.

### Generating Task Data

The `tasks.json` file is required for the application to run. It is generated from the `raw_tasks.txt` file. To generate it, run the following command in your terminal:

```bash
node process_tasks.js
```

This will create the `tasks.json` file in the root of the project.

### Running the Application

Once you have generated `tasks.json`, simply open the `index.html` file in your web browser.