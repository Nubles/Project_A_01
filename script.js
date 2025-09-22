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
const pinnedTasksListEl = document.getElementById('pinned-tasks-list');
const pinBtn = document.getElementById('pin-btn');
const showRandomizerBtn = document.getElementById('show-randomizer-btn');
const showBrowserBtn = document.getElementById('show-browser-btn');
const randomizerView = document.getElementById('randomizer-view');
const taskBrowserView = document.getElementById('task-browser-view');
const taskBrowserTableBody = document.querySelector('#task-browser-table tbody');


let currentTask = null;
let pinnedTasks = new Set(JSON.parse(localStorage.getItem('pinnedTasks')) || []);

const SKILL_LIST = [
    'Agility', 'Archaeology', 'Attack', 'Construction', 'Cooking', 'Crafting',
    'Defence', 'Divination', 'Dungeoneering', 'Farming', 'Firemaking', 'Fishing',
    'Fletching', 'Herblore', 'Constitution', 'Hunter', 'Invention', 'Magic',
    'Mining', 'Necromancy', 'Prayer', 'Ranged', 'Runecrafting', 'Slayer',
    'Smithing', 'Strength', 'Summoning', 'Thieving', 'Woodcutting'
];

var playerStats = null; // Use var to make it a property of the window object for testing

function getFilteredTasks() {
    const location = locationFilter.value;
    const points = parseInt(pointsFilter.value, 10);
    const skill = skillFilter.value;
    const keyword = keywordFilter.value.toLowerCase();

    return allTasks.filter(task => {
        const isCompleted = completedTasks.has(task.id);
        if (isCompleted) return false;

        const locationMatch = location === 'all' || task.locality === location;
        const pointsMatch = isNaN(points) || task.pts === points;
        const skillMatch = skill === 'all' || task.skills.includes(skill);
        const keywordMatch = keyword === '' ||
                             task.task.toLowerCase().includes(keyword) ||
                             task.information.toLowerCase().includes(keyword) ||
                             task.requirements.toLowerCase().includes(keyword);

        let completableMatch = true;
        if (completableToggle.checked && playerStats) {
            const unmetReqs = getUnmetRequirements(playerStats, task);
            if (unmetReqs.length > 0) {
                completableMatch = false;
            }
        }

        return locationMatch && pointsMatch && skillMatch && keywordMatch && completableMatch;
    });
}


function updateAvailableTasks() {
    availableTasks = getFilteredTasks();
    taskCountEl.textContent = availableTasks.length;
}

function renderTaskBrowser() {
    taskBrowserTableBody.innerHTML = '';
    const filteredTasks = getFilteredTasks();

    for (const task of filteredTasks) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.task}</td>
            <td>${task.locality}</td>
            <td>${task.pts}</td>
            <td>${task.requirements}</td>
        `;
        taskBrowserTableBody.appendChild(row);
    }
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

    const skills = [...new Set(allTasks.flatMap(task => task.skills))];
    skillFilter.innerHTML = '<option value="all">All Skills</option>';
    for (const skill of skills.sort()) {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        skillFilter.appendChild(option);
    }
}

function formatRequirements(requirements) {
    if (!requirements || requirements.trim() === 'N/A') {
        return 'None';
    }

    let formattedHtml = '';
    let reqs = requirements;

    // 1. Extract and link quests
    const questRegex = /((?:Partial c|C)ompletion of\s+.*?(?=\s*\d+\s\w+|$|Completion of|Partial completion of))/g;
    const questMatches = reqs.match(questRegex) || [];
    if (questMatches.length > 0) {
        const questLinks = questMatches.map(matchText => {
            // Extract just the quest name for the URL
            const questName = matchText.replace(/(?:Partial c|C)ompletion of\s+/, '').trim();
            const wikiUrl = `https://runescape.wiki/w/${questName.replace(/ /g, '_')}`;
            return `<li><a href="${wikiUrl}" target="_blank">${matchText.trim()}</a></li>`;
        }).join('');
        formattedHtml += `<div class="req-section"><strong>Quests:</strong><ul>${questLinks}</ul></div>`;
        // Remove the matched quests from the string
        questMatches.forEach(m => reqs = reqs.replace(m, ''));
    }

    // 2. Extract skill levels
    let skills = [];
    SKILL_LIST.forEach(skill => {
        const skillRegex = new RegExp(`(\\d+)\\s+${skill}(?:\\s+${skill})?`, 'ig');
        const skillMatches = reqs.match(skillRegex);
        if (skillMatches) {
            skills = [...skills, ...skillMatches];
            skillMatches.forEach(m => reqs = reqs.replace(m, ''));
        }
    });

    if (skills.length > 0) {
        // Clean up skill names (e.g., "19 Mining Mining" -> "19 Mining")
        const cleanedSkills = skills.map(s => s.split(' ').slice(0, 2).join(' '));
        formattedHtml += `<div class="req-section"><strong>Skills:</strong><ul>${cleanedSkills.map(s => `<li>${s}</li>`).join('')}</ul></div>`;
    }

    // 3. Display other items
    const otherReqs = reqs.replace(/, ,/g, ',').replace(/,$/, '').replace(/\s\s+/g, ' ').trim();
    if (otherReqs && otherReqs !== ',') {
        formattedHtml += `<div class="req-section"><strong>Other:</strong> ${otherReqs}</div>`;
    }

    return formattedHtml;
}

function displayRandomTask(keepCurrent = false) {
    if (!keepCurrent) {
        updateAvailableTasks();
        if (availableTasks.length === 0) {
            taskTitleEl.textContent = "No tasks available!";
            taskInfoEl.innerHTML = "<p>Try adjusting your filters or resetting your completed tasks.</p>";
            completeBtn.style.display = 'none';
            pinBtn.style.display = 'none';
            currentTask = null;
            return;
        }
        const randomIndex = Math.floor(Math.random() * availableTasks.length);
        currentTask = availableTasks[randomIndex];
    }

    if (!currentTask) {
        taskTitleEl.textContent = "No task selected.";
        taskInfoEl.innerHTML = "<p>Click 'Get Random Task' or adjust filters.</p>";
        completeBtn.style.display = 'none';
        pinBtn.style.display = 'none';
        return;
    }

    taskTitleEl.textContent = currentTask.task;
    const requirementsHtml = formatRequirements(currentTask.requirements);

    taskInfoEl.innerHTML = `
        <p><strong>Location:</strong> ${currentTask.locality}</p>
        <p><strong>Points:</strong> ${currentTask.pts}</p>
        <p><strong>Info:</strong> ${currentTask.information}</p>
        <div><strong>Requires:</strong></div>
        ${requirementsHtml}
    `;

    completeBtn.style.display = 'inline-block';
    pinBtn.style.display = 'inline-block';
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

        const taskText = document.createElement('span');
        taskText.textContent = `[${task.pts} pts] ${task.task}`;

        const undoBtn = document.createElement('button');
        undoBtn.textContent = 'Undo';
        undoBtn.classList.add('undo-btn');
        undoBtn.dataset.taskId = task.id;

        undoBtn.addEventListener('click', (e) => {
            const taskId = parseInt(e.target.dataset.taskId, 10);
            completedTasks.delete(taskId);
            localStorage.setItem('completedTasks', JSON.stringify([...completedTasks]));
            updateAvailableTasks();
            renderCompletedTasks();
        });

        li.appendChild(taskText);
        li.appendChild(undoBtn);
        completedTasksListEl.appendChild(li);
    }
}

function renderPinnedTasks() {
    pinnedTasksListEl.innerHTML = '';
    const pinned = allTasks.filter(task => pinnedTasks.has(task.id));
    for (const task of pinned.sort((a,b) => a.task.localeCompare(b.task))) {
        const li = document.createElement('li');

        const taskText = document.createElement('span');
        taskText.textContent = `[${task.pts} pts] ${task.task}`;

        const unpinBtn = document.createElement('button');
        unpinBtn.textContent = 'Unpin';
        unpinBtn.classList.add('unpin-btn'); // Add a class for styling
        unpinBtn.dataset.taskId = task.id;

        unpinBtn.addEventListener('click', (e) => {
            const taskId = parseInt(e.target.dataset.taskId, 10);
            pinnedTasks.delete(taskId);
            localStorage.setItem('pinnedTasks', JSON.stringify([...pinnedTasks]));
            renderPinnedTasks();
        });

        li.appendChild(taskText);
        li.appendChild(unpinBtn);
        pinnedTasksListEl.appendChild(li);
    }
}

function pinCurrentTask() {
    if (currentTask) {
        pinnedTasks.add(currentTask.id);
        localStorage.setItem('pinnedTasks', JSON.stringify([...pinnedTasks]));
        renderPinnedTasks();
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

function getUnmetRequirements(stats, task) {
    const unmetReqs = [];
    if (!stats) return unmetReqs; // Cannot check reqs without stats

    for (const [skill, level] of Object.entries(task.skillReqs)) {
        if (!stats[skill] || stats[skill] < level) {
            unmetReqs.push(`${level} ${skill}`);
        }
    }
    return unmetReqs;
}

function displayRequirementStatus(stats, task) {
    const reqCheckContainer = document.getElementById('req-check-container');
    reqCheckContainer.innerHTML = ''; // Clear previous results

    if (!stats) {
        reqCheckContainer.innerHTML = `<p class="req-note">Look up a player to check skill requirements.</p>`;
        return;
    }

    const unmetReqs = getUnmetRequirements(stats, task);

    if (Object.keys(task.skillReqs).length === 0) {
         reqCheckContainer.innerHTML = `<p class="req-note">This task has no specific skill level requirements.</p>`;
    } else if (unmetReqs.length === 0) {
        reqCheckContainer.innerHTML = `<p class="req-met">✅ You meet all skill level requirements!</p>`;
    } else {
        reqCheckContainer.innerHTML = `<p class="req-unmet">❌ You do not meet the following requirements: ${unmetReqs.join(', ')}</p>`;
    }
}

async function lookupPlayer() {
    const playerNameInput = document.getElementById('player-name');
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert('Please enter a player name.');
        return;
    }

    const apiUrl = `https://sync.runescape.wiki/runescape/player/${playerName}/LEAGUE_1`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Hiscores not found for player: ${playerName}. Status: ${response.status}`);
        }
        const data = await response.json();
        const playerData = parseWikiHiscores(data);
        playerStats = playerData.stats;

        // Display the stats
        displayPlayerStats(playerStats);

        if (playerData.completedTaskIds && playerData.completedTaskIds.length > 0) {
            const confirmOverwrite = confirm(
                `Found ${playerData.completedTaskIds.length} completed tasks for ${playerName}. ` +
                `Do you want to replace your current completed task list with this player's progress?`
            );

            if (confirmOverwrite) {
                completedTasks = new Set(playerData.completedTaskIds);
                localStorage.setItem('completedTasks', JSON.stringify([...completedTasks]));
                alert(`Completed tasks have been updated based on ${playerName}'s progress.`);
            }
        } else {
            alert(`Successfully looked up stats for ${playerName}. No completed task data was found.`);
        }


        // Refresh all UI components that depend on task completion
        updateAvailableTasks();
        renderCompletedTasks();
        renderTaskBrowser();

        if(currentTask) {
            displayRandomTask(true); // Re-check requirements for the current task
        }
    } catch (error) {
        console.error('Error fetching hiscores:', error);
        alert(`Could not fetch hiscores. The player may not exist or the wiki API may be down.`);
        playerStats = null;
        displayPlayerStats(null); // Clear the stats panel on error
    }
}

function parseWikiHiscores(data) {
    return {
        stats: data.levels || {},
        completedTaskIds: data.league_tasks || []
    };
}

function displayPlayerStats(stats) {
    const statsContent = document.getElementById('stats-content');
    if (!stats || Object.keys(stats).length === 0) {
        statsContent.innerHTML = '<p>Look up a player to see their stats.</p>';
        return;
    }

    let totalLevel = 0;
    let statsHTML = '';

    const displaySkills = SKILL_LIST.filter(skill => skill !== 'Overall' && stats[skill]);

    for (const skillName of displaySkills) {
        const level = stats[skillName] || 0;
        totalLevel += level;
        statsHTML += `
            <div class="stat-item">
                <span class="level">${level}</span>
                <span class="name">${skillName}</span>
            </div>
        `;
    }

    statsContent.innerHTML = `
        <div id="total-level">Total Level: ${totalLevel}</div>
        ${statsHTML}
    `;
}

async function initializeApp() {
    try {
        const response = await fetch('tasks.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allTasks = await response.json();

        // Once data is loaded, initialize the app
        populateFilters();
        updateAvailableTasks();
        renderCompletedTasks();
        renderPinnedTasks();
        renderTaskBrowser();
        taskTitleEl.textContent = 'Welcome!';
        taskInfoEl.textContent = 'Click "Get Random Task" to start.';

    } catch (error) {
        console.error('Failed to load task data:', error);
        taskTitleEl.textContent = 'Error!';
        taskInfoEl.textContent = 'Could not load task data. Please try refreshing the page.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const lookupBtn = document.getElementById('lookup-btn');

    lookupBtn.addEventListener('click', lookupPlayer);
    randomizeBtn.addEventListener('click', () => displayRandomTask(false));
    completeBtn.addEventListener('click', completeCurrentTask);
    pinBtn.addEventListener('click', pinCurrentTask);
    resetBtn.addEventListener('click', resetTasks);

    showRandomizerBtn.addEventListener('click', () => {
        randomizerView.style.display = 'block';
        taskBrowserView.style.display = 'none';
        showRandomizerBtn.classList.add('active');
        showBrowserBtn.classList.remove('active');
    });

    showBrowserBtn.addEventListener('click', () => {
        randomizerView.style.display = 'none';
        taskBrowserView.style.display = 'block';
        showRandomizerBtn.classList.remove('active');
        showBrowserBtn.classList.add('active');
    });

    const filterElements = [locationFilter, pointsFilter, skillFilter, completableToggle, keywordFilter];
    filterElements.forEach(el => {
        const eventType = el.type === 'checkbox' || el.type === 'text' ? 'input' : 'change';
        el.addEventListener(eventType, () => {
            updateAvailableTasks();
            renderTaskBrowser();
        });
    });

    // Separate listener for randomizer display update
    locationFilter.addEventListener('change', () => displayRandomTask());
    pointsFilter.addEventListener('change', () => displayRandomTask());
    skillFilter.addEventListener('change', () => displayRandomTask());

    document.querySelectorAll('#task-browser-table th').forEach(headerCell => {
        headerCell.addEventListener('click', () => {
            const tableElement = headerCell.parentElement.parentElement.parentElement;
            const headerIndex = Array.prototype.indexOf.call(headerCell.parentElement.children, headerCell);
            const currentIsAscending = headerCell.classList.contains('th-sort-asc');

            sortTableByColumn(tableElement, headerIndex, !currentIsAscending);
        });
    });

    initializeApp();
});

function sortTableByColumn(table, columnIndex, ascending = true) {
    const dirModifier = ascending ? 1 : -1;
    const tBody = table.tBodies[0];
    const rows = Array.from(tBody.querySelectorAll('tr'));

    const sortedRows = rows.sort((a, b) => {
        const aColText = a.querySelector(`td:nth-child(${columnIndex + 1})`).textContent.trim();
        const bColText = b.querySelector(`td:nth-child(${columnIndex + 1})`).textContent.trim();

        const aVal = isNaN(parseFloat(aColText)) ? aColText.toLowerCase() : parseFloat(aColText);
        const bVal = isNaN(parseFloat(bColText)) ? bColText.toLowerCase() : parseFloat(bColText);

        return aVal > bVal ? (1 * dirModifier) : (-1 * dirModifier);
    });

    while (tBody.firstChild) {
        tBody.removeChild(tBody.firstChild);
    }

    tBody.append(...sortedRows);

    table.querySelectorAll('th').forEach(th => th.classList.remove('th-sort-asc', 'th-sort-desc'));
    table.querySelector(`th:nth-child(${columnIndex + 1})`).classList.toggle('th-sort-asc', ascending);
    table.querySelector(`th:nth-child(${columnIndex + 1})`).classList.toggle('th-sort-desc', !ascending);
}
