let allTasks = [];
let availableTasks = [];
let completedTasks = new Set(JSON.parse(localStorage.getItem('completedTasks')) || []);

const randomizeBtn = document.getElementById('randomize-btn');
const taskTitleEl = document.getElementById('task-title');
const taskInfoEl = document.getElementById('task-info');
const completeBtn = document.getElementById('complete-btn');
const resetBtn = document.getElementById('reset-btn');
const taskCountEl = document.getElementById('task-count');
const locationFilter = document.getElementById('location-filter');
const pointsFilter = document.getElementById('points-filter');
const skillFilter = document.getElementById('skill-filter');
const completableToggle = document.getElementById('completable-toggle');
const keywordFilter = document.getElementById('keyword-filter');
const completedTasksListEl = document.getElementById('completed-tasks-list');

let currentTask = null;

function updateAvailableTasks() {
    const location = locationFilter.value;
    const points = parseInt(pointsFilter.value, 10);
    const skill = skillFilter.value;
    const keyword = keywordFilter.value.toLowerCase();

    availableTasks = allTasks.filter(task => {
        const isCompleted = completedTasks.has(task.id);
        if (isCompleted) return false;

        const locationMatch = location === 'all' || task.locality === location;
        const pointsMatch = isNaN(points) || task.pts === points;

        // Check if task.skills is an array before calling includes
        const skillMatch = skill === 'all' || (Array.isArray(task.skills) && task.skills.includes(skill));

        const keywordMatch = keyword === '' ||
                             task.task.toLowerCase().includes(keyword) ||
                             task.information.toLowerCase().includes(keyword) ||
                             task.requirements.toLowerCase().includes(keyword);

        return locationMatch && pointsMatch && skillMatch && keywordMatch;
    });

    taskCountEl.textContent = availableTasks.length;
}

function populateFilters() {
    const locations = [...new Set(allTasks.map(task => task.locality))];
    locationFilter.innerHTML = '<option value="all">All Locations</option>';
    for (const location of locations.sort()) {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationFilter.appendChild(option);
    }

    const points = [...new Set(allTasks.map(task => task.pts))];
    pointsFilter.innerHTML = '<option value="all">All Points</option>';
    for (const point of points.sort((a, b) => a - b)) {
        const option = document.createElement('option');
        option.value = point;
        option.textContent = `${point} pts`;
        pointsFilter.appendChild(option);
    }

    const skills = [...new Set(allTasks.flatMap(task => task.skills || []))];
    skillFilter.innerHTML = '<option value="all">All Skills</option>';
    for (const skill of skills.sort()) {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        skillFilter.appendChild(option);
    }
}

function displayRandomTask() {
    updateAvailableTasks();
    if (availableTasks.length === 0) {
        taskTitleEl.textContent = "No tasks available!";
        taskInfoEl.innerHTML = "<p>Try adjusting your filters or resetting your completed tasks.</p>";
        completeBtn.style.display = 'none';
        currentTask = null;
        return;
    }
    const randomIndex = Math.floor(Math.random() * availableTasks.length);
    currentTask = availableTasks[randomIndex];

    taskTitleEl.textContent = currentTask.task;
    taskInfoEl.innerHTML = `
        <p><strong>Location:</strong> ${currentTask.locality}</p>
        <p><strong>Points:</strong> ${currentTask.pts}</p>
        <p><strong>Info:</strong> ${currentTask.information}</p>
        <p><strong>Requires:</strong> ${currentTask.requirements}</p>
    `;

    completeBtn.style.display = 'inline-block';
}

function completeCurrentTask() {
    if (currentTask) {
        completedTasks.add(currentTask.id);
        localStorage.setItem('completedTasks', JSON.stringify([...completedTasks]));

        taskTitleEl.textContent = '';
        taskInfoEl.textContent = '';
        completeBtn.style.display = 'none';
        currentTask = null;

        updateAvailableTasks();
        renderCompletedTasks();
    }
}

function renderCompletedTasks() {
    completedTasksListEl.innerHTML = '';
    const completed = allTasks.filter(task => completedTasks.has(task.id));
    for (const task of completed.sort((a,b) => a.task.localeCompare(b.task))) {
        const li = document.createElement('li');
        li.textContent = `[${task.pts} pts] ${task.task}`;
        completedTasksListEl.appendChild(li);
    }
}

function resetTasks() {
    if (confirm('Are you sure you want to reset all completed tasks? This cannot be undone.')) {
        completedTasks.clear();
        localStorage.removeItem('completedTasks');

        locationFilter.value = 'all';
        pointsFilter.value = 'all';
        skillFilter.value = 'all';
        keywordFilter.value = '';

        updateAvailableTasks();
        renderCompletedTasks();

        taskTitleEl.textContent = 'Welcome!';
        taskInfoEl.textContent = 'Click "Get Random Task" to start.';
        completeBtn.style.display = 'none';
        currentTask = null;
    }
}

async function initializeApp() {
    try {
        const response = await fetch('tasks.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allTasks = await response.json();

        // Parse skills from requirements
        allTasks.forEach(task => {
            task.skills = [];
            const skillRegex = /\d+\s+(\w+)/g;
            let match;
            while ((match = skillRegex.exec(task.requirements)) !== null) {
                task.skills.push(match[2]);
            }
        });

        // Once data is loaded and processed, initialize the app
        populateFilters();
        updateAvailableTasks();
        renderCompletedTasks();
        taskTitleEl.textContent = 'Welcome!';
        taskInfoEl.innerHTML = 'Click "Get Random Task" to start.';

    } catch (error) {
        console.error('Failed to load task data:', error);
        taskTitleEl.textContent = 'Error!';
        taskInfoEl.textContent = 'Could not load task data. Please try refreshing the page.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    randomizeBtn.addEventListener('click', displayRandomTask);
    completeBtn.addEventListener('click', completeCurrentTask);
    resetBtn.addEventListener('click', resetTasks);

    const filterElements = [locationFilter, pointsFilter, skillFilter, keywordFilter];
    filterElements.forEach(el => {
        el.addEventListener('change', updateAvailableTasks);
    });
    keywordFilter.addEventListener('input', updateAvailableTasks);

    initializeApp();
});
