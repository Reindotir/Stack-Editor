import { Header } from "../Header.js";
export default class HeaderH3 extends Header {
    api;
    config;
    constructor(api, config) {
        super();
        this.config = {
            name: "Заголовок 3",
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m12,5v14c0,.553-.447,1-1,1s-1-.447-1-1v-6H2v6c0,.553-.447,1-1,1s-1-.447-1-1V5c0-.553.447-1,1-1s1,.447,1,1v6h8v-6c0-.553.447-1,1-1s1,.447,1,1Zm9.797,5.857c.742-.727,1.203-1.739,1.203-2.857,0-2.206-1.794-4-4-4h-4c-.553,0-1,.447-1,1s.447,1,1,1h4c1.103,0,2,.897,2,2s-.897,2-2,2h-2c-.553,0-1,.447-1,1s.447,1,1,1h2c1.654,0,3,1.346,3,3s-1.346,3-3,3h-4c-.553,0-1,.447-1,1s.447,1,1,1h4c2.757,0,5-2.243,5-5,0-1.722-.875-3.243-2.203-4.143Z"/></svg>',
            placeholder: "Ваш заголовок",
            description: "Средний заголовок",
            size: '150%',
            category: "Header",
        };
        Object.assign(this.config, config);
        this.api = api;
    }
}
