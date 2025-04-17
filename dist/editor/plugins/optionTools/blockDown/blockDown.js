export default class BlockDown {
    api;
    config;
    constructor(api, config) {
        this.api = api;
        this.config = {
            name: "Вниз",
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,17.17a5,5,0,0,1-3.54-1.46L.29,7.54A1,1,0,0,1,1.71,6.12l8.17,8.17a3,3,0,0,0,4.24,0l8.17-8.17a1,1,0,1,1,1.42,1.42l-8.17,8.17A5,5,0,0,1,12,17.17Z"/></svg>',
        };
        Object.assign(this.config, config);
    }
    render() {
        const block = this.api.state.focusedBlock.block;
        let par = block.closest(".elib-blocks");
        let next = block.nextElementSibling;
        if (!next) {
            return false;
        }
        par?.insertBefore(next, block);
        block.click();
        this.api.focus(this.api.CET(block));
    }
}
