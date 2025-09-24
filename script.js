let allTasks = [];
let availableTasks = [];
let completedTasks = new Set(JSON.parse(localStorage.getItem('completedTasks')) || []);
let pinnedTasks = new Set(JSON.parse(localStorage.getItem('pinnedTasks')) || []);
let taskIdMap = new Map();

const randomizeBtn = document.getElementById('randomize-btn');
const taskTitleEl = document.getElementById('task-title');
const taskInfoEl = document.getElementById('task-info');
const completeBtn = document.getElementById('complete-btn');
const resetBtn = document.getElementById('reset-btn');
const taskCountEl = document.getElementById('task-count');
const locationFilter = document.getElementById('location-filter');
const pointsFilter = document.getElementById('points-filter');
const skillFilter = document.getElementById('skill-filter');
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
let playerStats = null;

const playerNameInput = document.getElementById('player-name');
const lookupBtn = document.getElementById('lookup-btn');
const statsContentEl = document.getElementById('stats-content');
const completableToggle = document.getElementById('completable-toggle');


function renderPlayerStats() {
    statsContentEl.innerHTML = '';
    if (!playerStats) {
        statsContentEl.innerHTML = '<p>Look up a player to see their stats.</p>';
        return;
    }

    let totalLevel = 0;
    const skillOrder = [
        "Attack", "Strength", "Defence", "Ranged", "Prayer", "Magic", "Runecrafting", "Construction", "Constitution",
        "Agility", "Herblore", "Thieving", "Crafting", "Fletching", "Slayer", "Hunter", "Mining", "Smithing",
        "Fishing", "Cooking", "Firemaking", "Woodcutting", "Farming", "Divination", "Summoning",
        "Dungeoneering", "Invention", "Archaeology", "Necromancy"
    ];

    for (const skill of skillOrder) {
        if (playerStats[skill]) {
            const level = playerStats[skill];
            totalLevel += level;
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            statItem.innerHTML = `
                <span class="skill-name">${skill}</span>
                <span class="level">${level}</span>
            `;
            statsContentEl.appendChild(statItem);
        }
    }
    const totalLevelEl = document.createElement('div');
    totalLevelEl.id = 'total-level';
    totalLevelEl.textContent = `Total Level: ${totalLevel}`;
    statsContentEl.prepend(totalLevelEl);
}

async function fetchPlayerStats() {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert('Please enter a player name.');
        return;
    }

    statsContentEl.innerHTML = '<p>Loading stats...</p>';

    try {
        const response = await fetch(`https://sync.runescape.wiki/runescape/player/${playerName}/LEAGUE_1`);
        if (!response.ok) {
            throw new Error(`Player not found or API error (status: ${response.status})`);
        }
        const data = await response.json();

        completedTasks.clear();
        // The API returns completed tasks in a `league_tasks` property.
        if (data.league_tasks && Array.isArray(data.league_tasks)) {
            data.league_tasks.forEach(completedTaskId => {
                if (taskIdMap.has(completedTaskId)) {
                    const internalId = taskIdMap.get(completedTaskId);
                    completedTasks.add(internalId);
                }
            });
        }
        localStorage.setItem('completedTasks', JSON.stringify([...completedTasks]));
        renderCompletedTasks();

        playerStats = data.levels;
        renderPlayerStats();
        updateAvailableTasks(); // Re-filter tasks with the new stats
    } catch (error) {
        console.error('Failed to fetch player stats:', error);
        statsContentEl.innerHTML = `<p>Could not load stats for "${playerName}". Please check the name and try again.</p>`;
        playerStats = null;
        updateAvailableTasks(); // Re-filter tasks without stats
    }
}


function getFilteredTasks() {
    const location = locationFilter.value;
    const points = parseInt(pointsFilter.value, 10);
    const skill = skillFilter.value;
    const keyword = keywordFilter.value.toLowerCase();
    const showOnlyCompletable = completableToggle.checked;

    return allTasks.filter(task => {
        if (completedTasks.has(task.id)) return false;

        const locationMatch = location === 'all' || task.locality === location;
        const pointsMatch = isNaN(points) || task.points === points;
        const skillMatch = skill === 'all' || (task.skills && task.skills.includes(skill));
        const keywordMatch = keyword === '' ||
                             task.task.toLowerCase().includes(keyword) ||
                             task.information.toLowerCase().includes(keyword) ||
                             task.requirements.toLowerCase().includes(keyword);

        let meetsRequirements = true;
        if (showOnlyCompletable && playerStats) {
            const reqString = task.requirements;
            const skillReqRegex = /(\d+)\s+(\w+)/g;
            let match;
            while ((match = skillReqRegex.exec(reqString)) !== null) {
                const requiredLevel = parseInt(match[1], 10);
                const skillName = match[2].toLowerCase();
                const playerLevel = playerStats[skillName] || 0;

                if (playerLevel < requiredLevel) {
                    meetsRequirements = false;
                    break;
                }
            }
        }

        return locationMatch && pointsMatch && skillMatch && keywordMatch && meetsRequirements;
    });
}

function updateAvailableTasks() {
    availableTasks = getFilteredTasks();
    taskCountEl.textContent = availableTasks.length;
}

function populateFilters() {
    const locations = [...new Set(allTasks.map(task => task.locality))];
    locationFilter.innerHTML = '<option value="all">All Locations</option>';
    locations.sort().forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationFilter.appendChild(option);
    });

    // Use a hardcoded map for points to ensure correct tiers and labels
    const pointsTiers = {
        10: 'Easy',
        30: 'Medium',
        80: 'Hard',
        200: 'Elite',
        400: 'Master'
    };
    pointsFilter.innerHTML = '<option value="all">All Points</option>';
    for (const [value, label] of Object.entries(pointsTiers)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${label} (${value} pts)`;
        pointsFilter.appendChild(option);
    }

    // Use a hardcoded list of official skills to prevent incorrect entries
    const officialSkills = [
        "Attack", "Strength", "Defence", "Ranged", "Prayer", "Magic", "Runecrafting", "Construction", "Constitution",
        "Agility", "Herblore", "Thieving", "Crafting", "Fletching", "Slayer", "Hunter", "Mining", "Smithing",
        "Fishing", "Cooking", "Firemaking", "Woodcutting", "Farming", "Divination", "Summoning",
        "Dungeoneering", "Invention", "Archaeology", "Necromancy"
    ];
    skillFilter.innerHTML = '<option value="all">All Skills</option>';
    officialSkills.sort().forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        skillFilter.appendChild(option);
    });
}

function formatRequirements(requirements) {
    if (!requirements || requirements.trim().toLowerCase() === 'n/a') {
        return 'None';
    }

    let html = '';
    let questMatches = [];
    let skillMatches = [];
    let achievementMatches = [];
    let otherReqs = requirements;

    const questRegex = /(?:completion of|quest:)\s*([^,]+)/gi;
    let match;
    while ((match = questRegex.exec(otherReqs)) !== null) {
        questMatches.push(match[1].trim());
    }
    otherReqs = otherReqs.replace(questRegex, '');

    const achievementRegex = /Achievement:\s*([^,]+)/gi;
    while ((match = achievementRegex.exec(otherReqs)) !== null) {
        achievementMatches.push(match[1].trim());
    }
    otherReqs = otherReqs.replace(achievementRegex, '');

    const skillRegex = /(\d[\d,]*)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/g;
    while ((match = skillRegex.exec(otherReqs)) !== null) {
        skillMatches.push(match[0].trim());
    }
    otherReqs = otherReqs.replace(skillRegex, '');

    otherReqs = otherReqs.replace(/,/g, ' ').replace(/\s\s+/g, ' ').trim();

    if (questMatches.length > 0) {
        html += '<div class="req-section"><strong>Quests:</strong><ul>';
        questMatches.forEach(quest => {
            const questLink = `https://runescape.wiki/w/${quest.replace(/ /g, '_')}`;
            html += `<li><a href="${questLink}" target="_blank">${quest}</a></li>`;
        });
        html += '</ul></div>';
    }

    if (achievementMatches.length > 0) {
        html += '<div class="req-section"><strong>Achievements:</strong><ul>';
        achievementMatches.forEach(ach => {
            let achLink;
            const specialCases = ["TzTok-Jad", "Har-Aken", "Sanctum of Rebirth", "Rasial, the First Necromancer", "Araxxor"];
            if (specialCases.includes(ach)) {
                 achLink = `https://runescape.wiki/w/Combat_Achievements#${ach.replace(/ /g, '_')}`;
            } else {
                 achLink = `https://runescape.wiki/w/${ach.replace(/ /g, '_')}_achievements`;
            }
            html += `<li><a href="${achLink}" target="_blank">${ach}</a></li>`;
        });
        html += '</ul></div>';
    }


    if (skillMatches.length > 0) {
        html += '<div class="req-section"><strong>Skills & Items:</strong><ul>';
        skillMatches.forEach(skill => {
            html += `<li>${skill}</li>`;
        });
        html += '</ul></div>';
    }

    if (otherReqs) {
        html += `<div class="req-section"><strong>Other:</strong> ${otherReqs}</div>`;
    }

    return html || 'None';
}


function displayRandomTask() {
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

    taskTitleEl.textContent = currentTask.task;
    taskInfoEl.innerHTML = formatRequirements(currentTask.requirements);

    completeBtn.style.display = 'inline-block';
    pinBtn.style.display = 'inline-block';
    pinBtn.textContent = pinnedTasks.has(currentTask.id) ? 'Unpin Task' : 'Pin Task';
}

function completeCurrentTask() {
    if (currentTask) {
        completedTasks.add(currentTask.id);
        localStorage.setItem('completedTasks', JSON.stringify([...completedTasks]));
        if (pinnedTasks.has(currentTask.id)) {
            pinnedTasks.delete(currentTask.id);
            localStorage.setItem('pinnedTasks', JSON.stringify([...pinnedTasks]));
            renderPinnedTasks();
        }
        displayRandomTask();
        renderCompletedTasks();
    }
}

function renderCompletedTasks() {
    completedTasksListEl.innerHTML = '';
    const completed = allTasks.filter(task => completedTasks.has(task.id));
    completed.sort((a, b) => a.task.localeCompare(b.task)).forEach(task => {
        const li = document.createElement('li');
        li.innerHTML = `<span>[${task.points} pts] ${task.task}</span>`;
        const undoBtn = document.createElement('button');
        undoBtn.textContent = 'Undo';
        undoBtn.className = 'undo-btn';
        undoBtn.onclick = () => {
            completedTasks.delete(task.id);
            localStorage.setItem('completedTasks', JSON.stringify([...completedTasks]));
            renderCompletedTasks();
            updateAvailableTasks();
        };
        li.appendChild(undoBtn);
        completedTasksListEl.appendChild(li);
    });
}

function renderPinnedTasks() {
    pinnedTasksListEl.innerHTML = '';
    const pinned = allTasks.filter(task => pinnedTasks.has(task.id));
    pinned.sort((a, b) => a.task.localeCompare(b.task)).forEach(task => {
        const li = document.createElement('li');
        li.innerHTML = `<span>[${task.points} pts] ${task.task}</span>`;
        const unpinBtn = document.createElement('button');
        unpinBtn.textContent = 'Unpin';
        unpinBtn.className = 'unpin-btn';
        unpinBtn.onclick = () => {
            pinnedTasks.delete(task.id);
            localStorage.setItem('pinnedTasks', JSON.stringify([...pinnedTasks]));
            renderPinnedTasks();
            if (currentTask && currentTask.id === task.id) {
                pinBtn.textContent = 'Pin Task';
            }
        };
        li.appendChild(unpinBtn);
        pinnedTasksListEl.appendChild(li);
    });
}

function togglePin() {
    if (!currentTask) return;
    if (pinnedTasks.has(currentTask.id)) {
        pinnedTasks.delete(currentTask.id);
        pinBtn.textContent = 'Pin Task';
    } else {
        pinnedTasks.add(currentTask.id);
        pinBtn.textContent = 'Unpin Task';
    }
    localStorage.setItem('pinnedTasks', JSON.stringify([...pinnedTasks]));
    renderPinnedTasks();
}

function resetTasks() {
    if (confirm('Are you sure you want to reset all completed tasks? This cannot be undone.')) {
        completedTasks.clear();
        localStorage.removeItem('completedTasks');
        updateAvailableTasks();
        renderCompletedTasks();
    }
}

function renderTaskBrowser() {
    taskBrowserTableBody.innerHTML = '';
    const tasksToRender = getFilteredTasks();
    tasksToRender.forEach(task => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.task}</td>
            <td>${task.locality}</td>
            <td>${task.points}</td>
            <td>${task.requirements}</td>
        `;
        taskBrowserTableBody.appendChild(row);
    });
}

async function initializeApp() {
    try {
        const response = await fetch('tasks.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allTasks = await response.json();

        allTasks.forEach(task => {
            if (task.taskId !== undefined) {
                taskIdMap.set(task.taskId, task.id);
            }
            task.skills = [];
            const skillRegex = /(\d+)\s+(\w+)/g;
            let match;
            while ((match = skillRegex.exec(task.requirements)) !== null) {
                task.skills.push(match[2]);
            }
        });

        populateFilters();
        updateAvailableTasks();
        renderCompletedTasks();
        renderPinnedTasks();
        renderTaskBrowser();
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
    pinBtn.addEventListener('click', togglePin);

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
        renderTaskBrowser();
    });

    const changeFilterElements = [locationFilter, pointsFilter, skillFilter, completableToggle];
    changeFilterElements.forEach(el => {
        el.addEventListener('change', () => {
            updateAvailableTasks();
            renderTaskBrowser();
        });
    });

    keywordFilter.addEventListener('input', () => {
        updateAvailableTasks();
        renderTaskBrowser();
    });
    lookupBtn.addEventListener('click', fetchPlayerStats);

    initializeApp();
});