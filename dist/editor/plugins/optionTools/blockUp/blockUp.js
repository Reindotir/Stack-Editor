export default class BlockUp {
    api;
    config;
    constructor(api, config) {
        this.api = api;
        this.config = {
            name: 'Вверх',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22.5,18a1.5,1.5,0,0,1-1.061-.44L13.768,9.889a2.5,2.5,0,0,0-3.536,0L2.57,17.551A1.5,1.5,0,0,1,.449,15.43L8.111,7.768a5.505,5.505,0,0,1,7.778,0l7.672,7.672A1.5,1.5,0,0,1,22.5,18Z"/></svg>',
        };
    }
    render() {
        const block = this.api.state.focusedBlock.block;
        let last = block.previousElementSibling;
        let par = block.closest(".elib-blocks");
        if (!last) {
            return false;
        }
        par?.insertBefore(block, last);
        block.click();
        this.api.focus(this.api.CET(block));
    }
}
