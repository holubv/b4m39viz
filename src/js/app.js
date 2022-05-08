import * as d3 from 'd3';
import {default as Airport, Flight} from './airport';
import {max} from "d3";

const width = document.body.clientWidth;
const height = 600;

const projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2]);

const path = d3.geoPath(projection);

const svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

const g = svg.append('g');

const div = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);


let zoom = d3.zoom()
    .on('zoom', e => {
        g.attr('transform', e.transform);
    });

svg.call(zoom);


const main = async () => {

    const geoJson = await import('/res/gz_2010_us_040_00_20m.json');

    g.selectAll('path')
        .data(geoJson.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style('stroke', '#fff')
        .style('stroke-width', '1')
        .style('fill', d => {

            return 'rgb(213,222,217)';
        });


    /**
     * @type {Airport[]}
     */
    const airports = [];

    let file = await import('bundle-text:/res/airlines.graphml');
    let xml = new DOMParser().parseFromString(file, 'text/xml');

    let graph = xml.querySelector('graph');
    graph.querySelectorAll('node').forEach(node => {
        airports.push(Airport.parseFromXML(node));
    });

    graph.querySelectorAll('edge').forEach(edge => {
        let fromId = Number(edge.getAttribute('source'));
        let toId = Number(edge.getAttribute('target'));

        if (fromId < toId) {

            let from = airports.find(Airport.byId(fromId));
            let to = airports.find(Airport.byId(toId));

            let flight = new Flight();
            flight.airport1 = from;
            flight.airport2 = to;

            from.flights.push(flight);
            to.flights.push(flight);
        }
    });

    //console.log(airports);

    let maxFlights = airports.reduce((acc, val) => {
        if (val.flights.length > acc) {
            return val.flights.length;
        }
        return acc;
    }, 0);

    airports.forEach(airport => {
        airport.size = airport.flights.length / maxFlights;
    });

    airports.sort((a, b) => b.size - a.size);

    console.log(airports);

    const airportSizeScale = d3.scaleLinear()
        .domain([0, 1])
        .range([1, 20])


    g.selectAll('circle')
        .data(airports)
        .enter()
        .append('circle')
        .attr('cx', a => projection([a.lon, a.lat])[0])
        .attr('cy', a => projection([a.lon, a.lat])[1])
        .attr('r', a => {
            return airportSizeScale(a.size);
        })
        .style('fill', "rgb(217,91,67)")
        .style('opacity', 0.85)
        .on('mouseover', (e, airport) => {
            console.log(airport);
            div.style('opacity', 1);
            div.text(airport.name + ': ' + airport.flights.length)
                .style('left', (e.pageX) + 'px')
                .style('top', (e.pageY - 28) + 'px');
        })
        .on('mouseout', (e, airport) => {
            div.style('opacity', 0);
        });

};

main().then(() => {
});
