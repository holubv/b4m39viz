import {DualHRangeBar} from 'dual-range-bar'

export class AirportInfo {

    /**
     * @type {AirportMap}
     */
    airportMap = null;

    /**
     * @type {HTMLDivElement}
     */
    infoEl = null;

    /**
     * @type {HTMLSpanElement}
     */
    nameEl = null;

    /**
     * @type {HTMLSpanElement}
     */
    flightsNumEl = null;

    /**
     * @type {HTMLUListElement}
     */
    destinationsListEl = null;

    /**
     * @type {HTMLButtonElement}
     */
    closeBtn = null;

    constructor(airportMap) {

        this.airportMap = airportMap;

        this.infoEl = document.querySelector('.airport-info');
        this.nameEl = this.infoEl.querySelector('.name');
        this.flightsNumEl = this.infoEl.querySelector('.flights-num');
        this.destinationsListEl = this.infoEl.querySelector('.destinations');
        this.closeBtn = this.infoEl.querySelector('.btn-close-detail');

        this.closeBtn.addEventListener('click', e => {
            e.preventDefault();
            this.airportMap.selectAirport(null);
        });
    }

    /**
     * @param {Airport} airport
     */
    showInfo(airport) {

        this.nameEl.textContent = airport.name;
        this.flightsNumEl.textContent = airport.flights.length + '';
        this.destinationsListEl.innerHTML = '';

        let destinations = airport.getDestinations();
        destinations.sort((a, b) => a.name.localeCompare(b.name));
        destinations.forEach(a => {
            let flight = airport.findFlightTo(a);
            let li = document.createElement('li');

            let aEl = document.createElement('a');
            aEl.href = 'https://www.google.com/travel/flights?q=' + flight.airport1.name + '+' + flight.airport2.name;
            aEl.target = '_blank';
            aEl.textContent = a.name + ' (' + Math.round(flight.distance / 1000) + ' km)';

            li.appendChild(aEl);
            this.destinationsListEl.appendChild(li);
        });

        this.infoEl.style.display = 'block';
    }

    hide() {
        this.infoEl.style.display = 'none';
    }


}

export class AirportMenu {

    /**
     * @type {AirportMap}
     */
    airportMap = null;

    /**
     * @type {HTMLInputElement}
     */
    searchInputEl = null;

    /**
     * @type {HTMLUListElement}
     */
    airportListEl = null;

    /**
     * @type {HTMLLIElement[]}
     */
    airportNameEls = [];

    constructor(airportMap) {

        this.airportMap = airportMap;

        this.searchInputEl = document.querySelector('.airport-search');
        this.airportListEl = document.querySelector('.airport-list');

        this.airportListEl.innerHTML = '';

        this.searchInputEl.addEventListener('input', e => {
            let val = this.searchInputEl.value.trim().toUpperCase();
            this.search(val);
        });
    }

    init() {

        this.airportMap.airports
            .map(a => a)
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(a => {

                let li = document.createElement('li');
                li.textContent = a.name;
                this.airportListEl.appendChild(li);

                li.addEventListener('click', e => {
                    e.preventDefault();

                    this.airportMap.selectAirport(a);
                });

                this.airportNameEls.push(li);
            });
    }

    search(query) {

        this.airportNameEls.forEach(li => {
            li.style.display = null;
        });

        let foundName = null;
        let numOfResults = 0;

        this.airportNameEls.forEach(li => {
            if (!li.textContent.includes(query)) {
                li.style.display = 'none';
            } else {
                foundName = li.textContent;
                numOfResults++;
            }
        });

        if (numOfResults === 1) {
            let airport = this.airportMap.airports.find(a => a.name === foundName);
            if (airport) {
                this.airportMap.selectAirport(airport);
            }
        }
    }

}


export class AirportFilter {

    active = false;

    /**
     * @type {AirportMap}
     */
    airportMap = null;

    /**
     * @type {HTMLDivElement}
     */
    filtersWrapperEl = null;

    /**
     * @type {DualHRangeBar}
     */
    sizeBar = null;

    /**
     * @type {HTMLDivElement}
     */
    sizeMinNumEl = null;

    /**
     * @type {HTMLDivElement}
     */
    sizeMaxNumEl = null;

    /**
     * @type {HTMLButtonElement}
     */
    sizeResetBtn = null;

    sizeMin = 0;
    sizeMax = 0;

    constructor(airportMap) {

        this.airportMap = airportMap;

        this.filtersWrapperEl = document.querySelector('.filters');
        //this.sizeSliderEl = document.getElementById('filter-size');
        //this.sizeNumEl = document.getElementById('filter-size-num');

        this.sizeMinNumEl = document.querySelector('.filter-size-min');
        this.sizeMaxNumEl = document.querySelector('.filter-size-max');
        this.sizeResetBtn = document.querySelector('.filter-size-reset');

        this.sizeBar = new DualHRangeBar(document.getElementById('filter-size-slider'));

        // this.sizeSliderEl.addEventListener('change', e => {
        //     this.updateSizeFilter(Number(this.sizeSliderEl.value));
        // });
        //
        // this.sizeNumEl.addEventListener('change', e => {
        //     this.updateSizeFilter(Number(this.sizeNumEl.value));
        // });

        this.sizeBar.addEventListener('update', e => {
            let min = Math.floor(e.detail.lower);
            let max = Math.floor(e.detail.upper);
            if (min !== this.sizeMin || max !== this.sizeMax) {
                this.sizeMin = min;
                this.sizeMax = max;
                this.updateSizeFilter(min, max);
            }
        });

        this.sizeResetBtn.addEventListener('click', e => {
            e.preventDefault();
            this.sizeMin = 0;
            this.sizeMax = this.airportMap.maxFlights;
            this.sizeBar.lower = this.sizeMin;
            this.sizeBar.upper = this.sizeMax;
            this.updateSizeFilter(this.sizeMin, this.sizeMax);
        });
    }

    updateSizeFilter(min, max) {
        this.sizeMinNumEl.textContent = '' + Math.floor(min);
        this.sizeMaxNumEl.textContent = '' + Math.floor(max);

        this.airportMap.airports.forEach(a => {
            a.filteredOut = a.flights.length < min || a.flights.length > max;
        });

        this.active = min > 0 || max < this.airportMap.maxFlights;
        this.airportMap.onFilterChange();
    }

    init() {
        this.sizeBar.minSpan = 0.1;

        this.sizeBar.lowerBound = 0;
        this.sizeBar.lower = 0;
        //this.sizeBar.maxSpan = this.airportMap.maxFlights;
        this.sizeBar.upperBound = this.airportMap.maxFlights;
        this.sizeBar.upper = this.airportMap.maxFlights;

        this.sizeBar.update();

        this.updateSizeFilter(0, this.airportMap.maxFlights);
    }

    show() {
        this.filtersWrapperEl.style.display = null;
    }

    hide() {
        this.filtersWrapperEl.style.display = 'none';
    }
}
