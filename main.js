let databaseIndex = 14
async function getData_old(func) {
    return fetch(func)
        .then(response => response.json())
        .then(responseJson => responseJson);
}

function generateXY(datasets, xlabel, ylabel) {
    var dataplot = []
    for (var i = 0; i < datasets.length; i++) {
        var data = {}
        data['x'] = datasets[i][xlabel]
        data['y'] = datasets[i][ylabel]
        data['name'] = datasets[i]['name']
        dataplot.push(data)
    }
    
    return dataplot    
}

async function plot() {
    const family_chk = document.querySelectorAll('#family_chk input[type="checkbox"]:checked');

    const dataPromises = Array.from(family_chk).map(checkbox => getData(checkbox.value));
    
    const datasets = await Promise.all(dataPromises);

    // Get the current layout to preserve zoom and axes limits
    const currentLayout = gd11.layout || { autosize: true, xaxis:{title:{text:'x'}}, yaxis:{title:{text:'y'}}, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)"};
    
    var param = document.getElementById('param');
    var xlabel = param[1].value
    var ylabel = param[2].value
    
    currentLayout.xaxis.title.text = xlabel
    currentLayout.yaxis.title.text = ylabel
    
    dataplot = generateXY(datasets, xlabel, ylabel)
    
    // Combine all datasets into one plot
    Plotly.react("gd11", dataplot.flat(), currentLayout);


}

// Add event listeners
const family = document.getElementById('family_chk');
family.addEventListener('change', plot);

const param = document.getElementById('param');
param.addEventListener('change', plot);

// Initial plot (empty since no checkboxes are checked at first)
plot();



function loadFamily(id) {
    return new Promise((resolve, reject) => {
        var dbRequest = indexedDB.open('CRTBP', databaseIndex);

        dbRequest.onerror = () => reject(Error("IndexedDB database error"));

        dbRequest.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (db.objectStoreNames.contains('families')) db.deleteObjectStore('families');
            db.createObjectStore('families', { keyPath: "id" });
        };

        dbRequest.onsuccess = (event) => {
            var database = event.target.result;
            var transaction = database.transaction(['families']);
            var objectStore = transaction.objectStore('families');
            var objectRequest = objectStore.get(id);

            objectRequest.onerror = () => reject(Error('objectStore error'));

            objectRequest.onsuccess = () => {
                if (objectRequest.result) resolve(objectRequest.result);
                else reject(Error('object not found'));
            };
        };
    });
}

function saveFamily(object) {
    return new Promise((resolve, reject) => {
        if (object.id === undefined) reject(Error('object has no id.'));
        var dbRequest = indexedDB.open('CRTBP', databaseIndex);

        dbRequest.onerror = () => reject(Error("IndexedDB database error"));

        dbRequest.onupgradeneeded = (event) => {
            var database = event.target.result;
            if (db.objectStoreNames.contains('families')) db.deleteObjectStore('families');
            database.createObjectStore('families', { keyPath: "id" });
        };

        dbRequest.onsuccess = (event) => {
            var database = event.target.result;
            var transaction = database.transaction(['families'], 'readwrite');
            var objectStore = transaction.objectStore('families');
            var objectRequest = objectStore.put(object);

            objectRequest.onerror = () => reject(Error('Error text'));

            objectRequest.onsuccess = () => resolve('Data saved OK');
        };
    });
}

async function getData(dbkey) {
    try {
        const retrieval = await loadFamily(dbkey);
        return retrieval.family;
    } catch (e) {
        const response = await fetch("EarthMoon/"+dbkey.concat('.json.gz'));
        const decompressedStream = response.body.pipeThrough(new DecompressionStream("gzip"));
        const data = await new Response(decompressedStream).json();
        saveFamily({ id: dbkey, family: data });
        return data;
    }
}
// Function to update axis ranges
function applyAxisRanges() {
    const gd = document.getElementById('gd');

    // Get input values
    const xMin = parseFloat(document.getElementById('xMin').value);
    const xMax = parseFloat(document.getElementById('xMax').value);
    const yMin = parseFloat(document.getElementById('yMin').value);
    const yMax = parseFloat(document.getElementById('yMax').value);
    const zMin = parseFloat(document.getElementById('zMin').value);
    const zMax = parseFloat(document.getElementById('zMax').value);

    // Prepare update object
    const update = {};

    // Validate inputs and assign ranges
    if (!isNaN(xMin) && !isNaN(xMax)) {
        update['scene.xaxis.range'] = [xMin, xMax];
    }
    if (!isNaN(yMin) && !isNaN(yMax)) {
        update['scene.yaxis.range'] = [yMin, yMax];
    }
    if (!isNaN(zMin) && !isNaN(zMax)) {
        update['scene.zaxis.range'] = [zMin, zMax];
    }

    // Ensure aspectmode stays as 'cube'
    update['scene.aspectmode'] = 'cube';

    // Apply updates to the plot
    Plotly.relayout(gd, update);
}

// document.getElementById('orbit').addEventListener('input', async function(event) {
//     const orbitIndex = parseInt(event.target.value);
//     const selectedFamily = document.getElementById('family-dropdown').value;
//     const dataset = await getData(selectedFamily);
    
//     const xlabel = document.getElementById('x-select').value;
//     const ylabel = document.getElementById('y-select').value;
    
//     const xValue = dataset[xlabel][orbitIndex];
//     const yValue = dataset[ylabel][orbitIndex];
    
//     const newPoint = {
//         x: [xValue],
//         y: [yValue],
//         mode: 'markers',
//         type: 'scatter',
//         marker: { size: 10, color: 'red' },
//         name: `Current Orbit`
//     };
    
//     // Get the existing plot data
//     const currentData = gd11.data ? gd11.data.slice(0) : [];
    
//     // Remove previous orbit point if it exists (assumes last trace is the orbit point)
//     if (currentData.length > 0 && currentData[currentData.length - 1].name.startsWith('Current Orbit')) {
//         currentData.pop();
//     }
    
//     currentData.push(newPoint);
    
//     Plotly.react("gd11", currentData, gd11.layout);
    
// });

function generateXYZ(dataset, idx) {
    return {
        x: dataset[String(idx).concat('_0')],
        y: dataset[String(idx).concat('_1')],
        z: dataset[String(idx).concat('_2')],
        type: 'scatter3d',
        mode: 'lines',
        opacity: 1,
        line: { width: 2 },
        showlegend: false,
    };
}
var maxIndex = 405
async function plotAllCurves() {
    const gd = document.getElementById('gd');

    const selectedFamily = document.getElementById('family-dropdown').value;
    const dataset = await getData(selectedFamily);
    maxIndex = dataset["param"].length; 
    document.getElementById("orbitInput").max = maxIndex-1
    document.getElementById("orbit").max = maxIndex-1
    document.getElementById("orbitInput").value = 0
    document.getElementById("orbit").value = 0
    
    const allData = [];

    for (let i = 0; i <= maxIndex; i++) {
        allData.push(generateXYZ(dataset, i));
    }

    const points = [
        { x: -0.01215, y: 0, z: 0 , color : "red", label : "Primary"},
        { x: 0.98785, y: 0, z: 0, color : "blue", label : "Secondary"},
        { x: 0.8369180073169304, y: 0, z: 0 , color : "green", label : "L1"},
        { x: 1.1556799130947355, y: 0, z: 0 , color : "purple", label : "L2"},
        { x: -1.0050624018204988, y: 0, z: 0, color : "yellow", label : "L3" },
        { x: 0.48785, y: 0.8660254037844386, z: 0 , color : "orange", label : "L4"},
        { x: 0.48785, y: -0.8660254037844386, z: 0 , color : "pink", label : "L5"},
    ];

    const pointTraces = points.map(point => ({
        x: [point.x],
        y: [point.y],
        z: [point.z],
        mode: 'markers',
        type: 'scatter3d',
        marker: {
            size: 4, 
            color: point.color, 
            symbol: 'diamond',
        },
        name: point.label, 
        showlegend: true 
    }));

    const allDataWithPoints = allData.concat(pointTraces); 

    const layout = {
        autosize: true,
        paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
        scene: {
            xaxis: { title: { text: 'x' } },
            yaxis: { title: { text: 'y' } },
            zaxis: { title: { text: 'z' } },
            aspectmode: 'cube'
        },
    };

    Plotly.react("gd", allDataWithPoints, gd.layout || layout);
}

var locked;
async function updateVisibility(selectedIndex) {
    if (locked) return;
    locked = true;
    const gd = document.getElementById('gd'); // Reference to the plot element

    // Create an array to store visibility updates for each trace
    const visibilityUpdates = new Array(gd.data.length).fill("legendonly");
    
    // Set the selected orbit trace to "true" (visible)
    visibilityUpdates[selectedIndex] = true;

    // Ensure that the 7 points (indexes 490 and above) remain visible
    for (let i = maxIndex; i < gd.data.length; i++) {
        visibilityUpdates[i] = true;
    }
    
    const layout = {
        autosize: true,
        paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
        scene: {
            xaxis: { title: { text: 'x' } },
            yaxis: { title: { text: 'y' } },
            zaxis: { title: { text: 'z' } },
            aspectmode: 'cube'
        },
    };

    // Apply visibility updates
    const update = { visible: visibilityUpdates };
    await Plotly.update("gd", update, gd.layout || layout);

    // Reapply the camera settings to maintain the current view
    //Plotly.relayout("gd", { 'scene.camera': currentCamera });
    // Plotly.relayout("gd", { 'scene.camera': currentCamera });

    // Update point information display
    const selectedFamily = document.getElementById('family-dropdown').value;
    const dataset = await getData(selectedFamily);
    const key = `point_${selectedIndex}`;
    const pointData = dataset[key];
    const pointInfo = pointData
        ? `
            <strong>Selected family: #${selectedFamily} <br /></strong>
            Selected orbit: #${selectedIndex} <br />
            Parameter: ${JSON.stringify(dataset["param"][selectedIndex])}<br />
            Coordinates: ${JSON.stringify(pointData)}<br />
            Period: ${JSON.stringify(dataset["period"][selectedIndex])}<br />
            Eigenvalue 1: ${JSON.stringify(dataset["lam1_mag"][selectedIndex])}*e^(${JSON.stringify(dataset["lam1_ang"][selectedIndex])}i)<br />
            Eigenvalue 2: ${JSON.stringify(dataset["lam2_mag"][selectedIndex])}*e^(${JSON.stringify(dataset["lam2_ang"][selectedIndex])}i)<br />
            Eigenvalue 3: ${JSON.stringify(dataset["lam3_mag"][selectedIndex])}*e^(${JSON.stringify(dataset["lam3_ang"][selectedIndex])}i)<br />
            Eigenvalue 4: ${JSON.stringify(dataset["lam4_mag"][selectedIndex])}*e^(${JSON.stringify(dataset["lam4_ang"][selectedIndex])}i)<br />
            Eigenvalue 5: ${JSON.stringify(dataset["lam5_mag"][selectedIndex])}*e^(${JSON.stringify(dataset["lam5_ang"][selectedIndex])}i)<br />
            Eigenvalue 6: ${JSON.stringify(dataset["lam6_mag"][selectedIndex])}*e^(${JSON.stringify(dataset["lam6_ang"][selectedIndex])}i)
        `
        : `<strong>No data found for ${key}</strong>`;
    document.getElementById('point-data').innerHTML = pointInfo;
    
    const xlabel = document.getElementById('x-select').value;
    const ylabel = document.getElementById('y-select').value;
    
    const xValue = dataset[xlabel][selectedIndex];
    const yValue = dataset[ylabel][selectedIndex];
    
    const newPoint = {
        x: [xValue],
        y: [yValue],
        mode: 'markers',
        type: 'scatter',
        marker: { size: 10, color: 'red' },
        name: `Current Orbit`
    };
    
    // Get the existing plot data
    const currentData = gd11.data ? gd11.data.slice(0) : [];
    
    // Remove previous orbit point if it exists (assumes last trace is the orbit point)
    if (currentData.length > 0 && currentData[currentData.length - 1].name.startsWith('Current Orbit')) {
        currentData.pop();
    }
    
    currentData.push(newPoint);
    
    Plotly.react("gd11", currentData, gd11.layout);

    
    locked = false;
}

// Add event listener to the button
document.getElementById('applyRange').addEventListener('click', function (event) {
    event.preventDefault(); // Prevents the default behavior (e.g., page reload)
    applyAxisRanges();
});

document.getElementById('orbitInput').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission or page reload
        event.target.dispatchEvent(new Event('change')); // Trigger the change event
    }
});

document.getElementById('orbitInput').addEventListener('change', (event) => {
    const selectedIndex = parseInt(event.target.value, 10);
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex > 10000) {
        document.getElementById('point-data').innerHTML = `<strong>Please enter a valid index between 0 and 489.</strong>`;
        return;
    }

    // Update the slider to reflect the selected index
    document.getElementById('orbit').value = selectedIndex;

    // Call the function to update visibility based on the selected index
    updateVisibility(selectedIndex);
});

document.getElementById('family-dropdown').addEventListener('change', plotAllCurves);

document.getElementById('orbit').addEventListener('input', (event) => {
    const selectedIndex = parseInt(event.target.value, 10);
    document.getElementById('orbitInput').value = selectedIndex;
    updateVisibility(selectedIndex);
});

plotAllCurves();