export default class LineDelmiter {
    api;
    config;
    constructor(api, config) {
        this.config = {
            name: 'Линейный разделитель',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.5,14H1.5c-.83,0-1.5-.67-1.5-1.5s.67-1.5,1.5-1.5H22.5c.83,0,1.5,.67,1.5,1.5s-.67,1.5-1.5,1.5Z"/></svg>',
            description: "Стремные у разделителей названия...",
            paddingTB: '15px',
            paddingLR: '5px',
            category: "Delmiter"
        };
        Object.assign(this.config, config);
        this.api = api;
    }
    render() {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = `
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: ${this.config.paddingTB} ${this.config.paddingLR};
        `;
        const line = document.createElement("div");
        line.style.cssText = `
            width: 100%;
            height: 2px;
            background-color: rgb(var(--placeholder));
        `;
        wrapper.appendChild(line);
        if (!this.api.state.initDataMode) {
            setTimeout(() => {
                this.api.newBlock();
            });
        }
        return wrapper;
    }
}
