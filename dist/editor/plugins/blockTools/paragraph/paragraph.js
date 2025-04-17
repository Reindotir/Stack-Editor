export default class Paragraph {
    api;
    config;
    wrapper;
    data = null;
    constructor(api, config) {
        this.config = {
            placeholder: 'Вводите текст; ctrl + /  -  вызов меню настроек блока. ctrl + Enter  -  вызов меню нового блока.',
            name: 'Текст',
            icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m19 0h-14a5.006 5.006 0 0 0 -5 5v14a5.006 5.006 0 0 0 5 5h14a5.006 5.006 0 0 0 5-5v-14a5.006 5.006 0 0 0 -5-5zm3 19a3 3 0 0 1 -3 3h-14a3 3 0 0 1 -3-3v-14a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3zm-4-10a1 1 0 0 1 -2 0 1 1 0 0 0 -1-1h-2v8h1a1 1 0 0 1 0 2h-4a1 1 0 0 1 0-2h1v-8h-2a1 1 0 0 0 -1 1 1 1 0 0 1 -2 0 3 3 0 0 1 3-3h6a3 3 0 0 1 3 3z"/></svg>',
            category: "Typography",
            description: "Обычный блок текста. Да, жесть",
        };
        Object.assign(this.config, config);
        this.api = api;
    }
    setData(data) {
        this.data = data;
    }
    render() {
        const inp = this.api.create("input", {
            placeholderType: "onFocus",
            placeholder: this.config.placeholder,
            html: this.data?.text || ""
        });
        return inp;
    }
    post(block) {
        const inp = this.api.CET(block);
        inp.setAttribute('contenteditable', 'false');
        inp.classList.remove('elib-placeholder');
    }
    save(block) {
        const div = block.querySelector('[contenteditable]');
        return {
            text: div?.innerHTML || ""
        };
    }
}
