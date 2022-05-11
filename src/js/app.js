import * as d3 from 'd3';
import {AirportMap, Airport, Flight} from './airport';

const width = document.body.clientWidth;
const height = 600;

const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2]);

const path = d3.geoPath(projection);

const svgWrapper = d3.select('body').append('div');

const svg = svgWrapper
    .append('svg')
    .attr('width', width)
    .attr('height', height);

const g = svg.append('g');

const tooltipEl = svgWrapper
    .append('div')
    .attr('class', 'tooltip')
    .node();


let zoom = d3.zoom()
    .on('zoom', e => {
        g.attr('transform', e.transform);
    });

svg.call(zoom);

let forceEdgeBundle = () => {
};

const main = async () => {

    {
        // load force edge bundling library
        window.d3 = {};
        await import('../../lib/d3-ForceEdgeBundling');
        forceEdgeBundle = window.d3.ForceEdgeBundling;
        delete window.d3;
    }

    const geoJson = await import('/res/gz_2010_us_040_00_20m.json');
    drawMap(geoJson);

    const map = new AirportMap();

    await map.loadFromFile();

    console.log(map.airports.find(a => a.flights.length === 0));

    map.tooltipEl = tooltipEl;

    map.airports.forEach(airport => {
        // project lat lon to canvas x y
        let p = projection([airport.lon, airport.lat]);
        airport.x = p[0];
        airport.y = p[1];
    });

    drawFlights(map.airports, map.flights);
    drawAirports(map.airports);

    map.registerListeners();

    console.log(map.airports);
};

main().then(() => {
});

function drawMap(geoJson) {
    g.selectAll('path')
        .data(geoJson.features)
        .enter()
        .append('path')
        .attr('class', 'map')
        .attr('d', path)
        // .style('stroke', '#fff')
        // .style('stroke-width', '1')
        // .style('fill', d => {
        //
        //     return 'rgb(213,222,217)';
        // });
}

function drawAirports(airports) {

    let airportSizeSorted = [...airports];
    airportSizeSorted.sort((a, b) => b.size - a.size);

    const airportSizeScale = d3.scaleSqrt()
        .domain([0, 1])
        .range([1, 20]);

    const airportSizeColorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateCool);

    g.selectAll('circle')
        .data(airportSizeSorted)
        .enter()
        .append('circle')
        .attr('class', 'airport')
        .attr('cx', a => a.x)
        .attr('cy', a => a.y)
        .attr('r', a => {
            return airportSizeScale(a.size);
        })
        .style('fill', a => airportSizeColorScale(a.size))
        .style('stroke', a => airportSizeColorScale(a.size))
        //.style('fill', 'rgb(217,91,67)')
        //.style('opacity', 0.85)
        // .on('mouseover', (e, airport) => {
        //     console.log(airport);
        //     div.style('opacity', 1);
        //     div.text(airport.name + ': ' + airport.flights.length)
        //         .style('left', (e.pageX) + 'px')
        //         .style('top', (e.pageY - 28) + 'px');
        // })
        // .on('mouseout', (e, airport) => {
        //     div.style('opacity', 0);
        // })
        .each((airport, index, d) => {
            airports.find(Airport.byId(airport.id)).el = d[index];
        });
}

/**
 * @param {Airport[]} airports
 * @param {Flight[]} flights
 */
function drawFlights(airports, flights) {

    let nodes = airports.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
    }, {});

    let edges = flights.map(f => {
        return {
            'source': f.airport1.id,
            'target': f.airport2.id
        };
    });

    let bundle = (forceEdgeBundle()
        .nodes(nodes)
        .edges(edges))();

    let d3line = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveLinear);

    bundle.forEach((edgePoints, index) => {
        // for each of the arrays in the results
        // draw a line between the subdivions points for that edge
        let path = g.append('path')
            .attr('id', 'edge-' + index)
            .attr('class', 'flight')
            .attr('d', d3line(edgePoints))
            //.style('stroke-width', 1)
            //.style('stroke', '#bd22ff')
            //.style('fill', 'none')
            //.style('stroke-opacity', 0.15)
            .node(); //use opacity as blending

        flights[index].el = path;
    });
}
