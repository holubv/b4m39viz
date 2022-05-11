export class AirportMap {
    /**
     * @type {Airport[]}
     */
    airports = [];

    /**
     * @type {Flight[]}
     */
    flights = [];

    /**
     * @type {HTMLDivElement}
     */
    tooltipEl = null;

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

                this.airports.forEach(a => {
                    a.el.style.display = null;
                    if (a !== airport) {
                        if (!a.hasDirectFlightConnection(airport)) {
                            a.el.style.display = 'none';
                        }
                    }
                });

                this.flights.forEach(f => {
                    f.el.style.display = null;
                    f.el.classList.remove('selected');
                    if (f.airport1 !== airport && f.airport2 !== airport) {
                        f.el.style.display = 'none';
                    } else {
                        f.el.classList.add('selected');
                    }
                })
            })
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

        let maxFlights = this.airports.reduce((acc, val) => {
            if (val.flights.length > acc) {
                return val.flights.length;
            }
            return acc;
        }, 0);

        this.airports.forEach(airport => {
            airport.size = airport.flights.length / maxFlights;
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

    size = 0;

    /**
     * @type {SVGCircleElement|null}
     */
    el = null;

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
     * @type {SVGPathElement|null}
     */
    el = null;

    equals(f) {
        return this.airport1.id === f?.airport1?.id && this.airport2.id === f?.airport2?.id;
    }
}
