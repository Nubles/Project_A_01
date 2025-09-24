const fs = require('fs');

// A list of all possible location prefixes that start a new task record.
const prefixes = [
    'Anachronia', 'Asgarnia: Burthorpe', 'Asgarnia: Falador', 'Asgarnia: Port Sarim',
    'Asgarnia: Taverley', 'Desert: Menaphos', 'Desert: General', 'Fremennik: Lunar Isles',
    'Fremennik: Mainland', 'Global', 'Misthalin: Draynor Village', 'Misthalin: Edgeville',
    'Misthalin: Fort Forinthry', 'Misthalin: Lumbridge', 'Misthalin: City of Um',
    'Misthalin: Varrock', 'Morytania', 'Elven Lands: Tirranwn', 'Wilderness: General',
    'Wilderness: Daemonheim', 'Kandarin: Gnomes', 'Kandarin: Feldip Hills', 'Kandarin: Ardougne',
    'Kandarin: Seers Village', 'Kandarin: Yanille', 'Karamja'
];

function isNewRecord(line) {
    // A line is considered a new record if it starts with one of the known prefixes followed by a tab.
    for (const prefix of prefixes) {
        if (line.startsWith(prefix + '\t')) {
            return true;
        }
    }
    return false;
}

// This function takes an array of lines that constitute a single record,
// joins them, and parses them into a task object.
function processRecord(recordLines, id) {
    if (!recordLines || recordLines.length === 0) {
        return null;
    }

    // Join all buffered lines into a single string, replacing the erroneous newlines with a space.
    const fullRecordString = recordLines.join(' ');

    const columns = fullRecordString.split('\t');

    // After joining, a valid record should have exactly 6 columns.
    if (columns.length !== 6) {
        console.error(`Skipping malformed record (column count is ${columns.length}, expected 6): ${fullRecordString}`);
        return null;
    }

    const points = parseInt(columns[4].trim(), 10);
    if (isNaN(points)) {
        console.error(`Skipping malformed record (invalid points): ${fullRecordString}`);
        return null;
    }

    return {
        id: id,
        locality: columns[0].trim(),
        task: columns[1].trim(),
        information: columns[2].trim(),
        requirements: columns[3].trim(),
        points: points
    };
}


const rawData = fs.readFileSync('raw_tasks.txt', 'utf8');
// Normalize line endings to prevent issues with \r\n vs \n
const lines = rawData.replace(/\r\n/g, '\n').trim().split('\n');
const tasks = [];
let recordBuffer = [];
let id = 0;

// Start from i = 1 to skip the header row.
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (isNewRecord(line)) {
        // When a new record starts, process the buffered one.
        const task = processRecord(recordBuffer, id);
        if (task) {
            tasks.push(task);
            id++;
        }
        // Start a new buffer with the current line.
        recordBuffer = [line];
    } else {
        // If it's not a new record, it's a continuation line.
        if (recordBuffer.length > 0) {
            recordBuffer.push(line);
        }
    }
}

// Process the very last record remaining in the buffer.
const lastTask = processRecord(recordBuffer, id);
if (lastTask) {
    tasks.push(lastTask);
}

fs.writeFileSync('tasks.json', JSON.stringify(tasks, null, 2));
console.log('Successfully created tasks.json with ' + tasks.length + ' tasks.');
