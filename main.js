async function getData(func) {
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
    const currentLayout = gd.layout || { width: 600, height: 400 , xaxis:{title:{text:'x'}}, yaxis:{title:{text:'y'}}};
    
    var param = document.getElementById('param');
    var xlabel = param[1].value
    var ylabel = param[2].value
    
    currentLayout.xaxis.title.text = xlabel
    currentLayout.yaxis.title.text = ylabel
    
    dataplot = generateXY(datasets, xlabel, ylabel)

    // Combine all datasets into one plot
    Plotly.react("gd", dataplot.flat(), currentLayout);
}

// Add event listeners
const family = document.getElementById('family_chk');
family.addEventListener('change', plot);

const param = document.getElementById('param');
param.addEventListener('change', plot);

// Initial plot (empty since no checkboxes are checked at first)
plot();


