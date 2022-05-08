export default class Airport {

    id = -1;
    name = '';
    lat = 0;
    lon = 0;

    /**
     * @type {Flight[]}
     */
    flights = [];

    size = 0;

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
}
