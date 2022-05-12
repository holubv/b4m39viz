import {AirportInfo, AirportMenu, AirportFilter} from "./ui";

export class AirportMap {

    /**
     * @type {AirportInfo}
     */
    infoBox = null;

    /**
     * @type {AirportMenu}
     */
    menu = null;

    /**
     * @type {AirportFilter}
     */
    filter = null;

    /**
     * @type {Airport[]}
     */
    airports = [];

    /**
     * @type {Flight[]}
     */
    flights = [];

    /**
     * Max number of flights on an airport
     * @type {number}
     */
    maxFlights = 0;

    /**
     * @type {HTMLDivElement}
     */
    tooltipEl = null;

    /**
     * @type {Airport|null}
     */
    selectedAirport = null;

    /**
     * @type {number}
     */
    zoomLevel = 1;

    constructor() {
        this.infoBox = new AirportInfo(this);
        this.menu = new AirportMenu(this);
        this.filter = new AirportFilter(this);
    }

    init() {
        this.registerListeners();
        this.updateZoomFilter();
        this.menu.init();
        this.filter.init();
    }

    registerListeners() {
        this.airports.forEach(airport => {
            airport.el.addEventListener('mouseover', e => {
                this.highlightAirports(airport);
                this.highlightFlights(airport.flights);

                let elBox = airport.el.getBoundingClientRect();

                this.tooltipEl.style.display = 'block';
                this.tooltipEl.style.top = (elBox.top - 18) + 'px';
                this.tooltipEl.style.left = (elBox.left + elBox.width + 8) + 'px';
                this.tooltipEl.textContent = airport.name;

            });

            airport.el.addEventListener('mouseout', e => {
                this.removeHighlights();

                this.tooltipEl.style.display = 'none';
            });

            airport.el.addEventListener('click', e => {
                e.preventDefault();
                if (this.selectedAirport === airport) {
                    // clicked on already selected airport -> remove selection
                    this.selectAirport(null);
                    return;
                }
                this.selectAirport(airport);
            })
        });
    }

    onFilterChange() {

        if (this.selectedAirport) {
            // airport detail is shown, ignore filtering
            return;
        }

        if (!this.filter.active) {
            // filtering is not active
            // return to default zoom filter
            this.updateZoomFilter();
            return;
        }

        this.airports.forEach(a => {
            a.el.style.display = null;
            a.flights.forEach(f => f.el.style.display = null);
        });
        this.airports.forEach(a => {
            if (a.filteredOut) {
                a.el.style.display = 'none';
                a.flights.forEach(f => f.el.style.display = 'none');
            }
        });
    }

    selectAirport(airport) {

        this.selectedAirport = airport;

        if (airport === null) {
            this.airports.forEach(a => {
                a.el.style.display = null;
                a.el.classList.remove('selected');
            });
            this.flights.forEach(f => {
                f.el.style.display = null;
                f.el.classList.remove('selected');
            });
            this.onFilterChange();
            this.infoBox.hide();
            this.filter.show();
            return;
        }

        this.infoBox.showInfo(airport);
        this.filter.hide();

        this.airports.forEach(a => {
            a.el.style.display = null;
            a.el.classList.remove('selected');
            if (a !== airport) {
                if (!a.hasDirectFlightConnection(airport)) {
                    a.el.style.display = 'none';
                }
            }
        });

        airport.el.classList.add('selected');

        this.flights.forEach(f => {
            f.el.style.display = null;
            f.el.classList.remove('selected');
            if (f.airport1 !== airport && f.airport2 !== airport) {
                f.el.style.display = 'none';
            } else {
                f.el.classList.add('selected');
            }
        });
    }

    notifyZoom(k) {
        if (k === this.zoomLevel) {
            return;
        }

        this.zoomLevel = k;
        this.updateZoomFilter();
    }

    updateZoomFilter() {

        if (this.selectedAirport) {
            // airport detail is shown, ignore zoom filter
            return;
        }

        if (this.filter.active) {
            // manual filter is active, ignore zoom filter
            return;
        }

        const thresholds = {
            1: 0.1,
            1.5: 0.05,
            2: 0.005,
            2.5: 0
        };

        let levels = Object.keys(thresholds).sort((a, b) => b - a);
        let level = 1;
        for (let l of levels) {
            if (this.zoomLevel > l) {
                level = l;
                break;
            }
        }

        let threshold = thresholds[level];
        this.airports.forEach(a => {
            a.el.style.display = null;
            a.flights.forEach(f => f.el.style.display = null);
        });
        this.airports.forEach(a => {
            if (a.size < threshold) {
                a.el.style.display = 'none';
                a.flights.forEach(f => f.el.style.display = 'none');
            }
        });
    }


    removeHighlights() {
        this.highlightAirports(null);
        this.highlightFlights(null);
    }

    highlightAirports(airports) {
        if (!airports?.length) {
            airports = [airports];
        }

        this.airports.forEach(a => {
            if (airports.find(toA => toA?.id === a.id)) {
                a.el.classList.add('highlight');
            } else {
                a.el.classList.remove('highlight');
            }
        });
    }

    highlightFlights(flights) {
        if (!flights?.length) {
            flights = [flights];
        }

        this.flights.forEach(f => {
            if (flights.find(toF => f.equals(toF))) {
                f.el.classList.add('highlight');
            } else {
                f.el.classList.remove('highlight');
            }
        });
    }

    async loadFromFile() {
        let file = await import('bundle-text:/res/airlines.graphml');
        let xml = new DOMParser().parseFromString(file, 'text/xml');

        let graph = xml.querySelector('graph');
        graph.querySelectorAll('node').forEach(node => {
            this.airports.push(Airport.parseFromXML(node));
        });

        graph.querySelectorAll('edge').forEach(edge => {
            let fromId = Number(edge.getAttribute('source'));
            let toId = Number(edge.getAttribute('target'));

            if (fromId < toId) {

                let from = this.airports.find(Airport.byId(fromId));
                let to = this.airports.find(Airport.byId(toId));

                let flight = new Flight();
                flight.airport1 = from;
                flight.airport2 = to;

                from.flights.push(flight);
                to.flights.push(flight);
                this.flights.push(flight);
            }
        });

        this.maxFlights = this.airports.reduce((acc, val) => {
            if (val.flights.length > acc) {
                return val.flights.length;
            }
            return acc;
        }, 0);

        this.airports.forEach(airport => {
            airport.size = airport.flights.length / this.maxFlights;
        });
    }
}

export class Airport {

    id = -1;
    name = '';
    lat = 0;
    lon = 0;

    x = 0;
    y = 0;

    /**
     * @type {Flight[]}
     */
    flights = [];

    totalFlightsDistance = 0;

    size = 0;

    /**
     * @type {SVGCircleElement|null}
     */
    el = null;

    filteredOut = false;

    /**
     * @param {Element} node
     */
    static parseFromXML(node) {

        let id = Number(node.id);
        //let x = Number(node.querySelector('data[key="x"]').textContent);
        //let y = Number(node.querySelector('data[key="y"]').textContent);
        let data = node.querySelector('data[key="tooltip"]').textContent;

        let match = data.match(/([A-Z]+)\(lngx=(.+),laty=(.+)\)/);

        let airport = new Airport();
        airport.id = id;
        airport.name = match[1];
        airport.lon = Number(match[2]);
        airport.lat = Number(match[3]);
        return airport;
    }

    static byId(id) {
        return airport => airport.id === id;
    }

    hasDirectFlightConnection(airport) {

        let id = airport.id;

        return this.flights.some(f => {
            return f.airport1.id === id || f.airport2.id === id;
        });
    }

    /**
     * @returns {Airport[]}
     */
    getDestinations() {
        return this.flights.map(f => {
            if (f.airport1.id === this.id) {
                return f.airport2;
            } else {
                return f.airport1;
            }
        });
    }

    /**
     * @param {Airport} airport
     * @returns {Flight|undefined}
     */
    findFlightTo(airport) {
        return this.flights.find(f => {
            return f.airport1.id === airport.id || f.airport2.id === airport.id;
        });
    }
}

export class Flight {

    /**
     * @type {Airport}
     */
    airport1 = null;
    /**
     * @type {Airport}
     */
    airport2 = null;

    /**
     * Distance between airports in meters
     * @type {number}
     */
    distance = 0;

    /**
     * @type {SVGPathElement|null}
     */
    el = null;

    /**
     * @param {Airport} airport
     * @returns {Airport|null}
     */
    getAdjacentAirport(airport) {
        if (this.airport1.id === airport.id) {
            return this.airport2;
        }
        if (this.airport2.id === airport.id) {
            return this.airport1;
        }
        return null;
    }

    equals(f) {
        return this.airport1.id === f?.airport1?.id && this.airport2.id === f?.airport2?.id;
    }
}
