export default class Link {
    api;
    inline;
    tag = 'a';
    btn = null;
    node = null;
    config = {};
    menu;
    constructor(api, config) {
        this.inline = api.inline;
        this.api = api;
        this.api.allowed.tags.push(this.tag);
        this.config = { ...{
                name: "Ссылка",
                menuMode: true,
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512.06 512.06"><g><path d="M295.407,368.363l-69.589,69.589c-42.453,41.318-110.362,40.398-151.68-2.054c-40.521-41.633-40.53-107.959-0.021-149.604   l69.589-69.653c8.33-8.336,8.325-21.846-0.011-30.176c-8.336-8.33-21.846-8.325-30.176,0.011l-69.568,69.653   c-58.539,58.569-58.515,153.503,0.053,212.043s153.503,58.515,212.043-0.053l69.589-69.589c8.185-8.475,7.95-21.98-0.524-30.165   c-8.267-7.985-21.374-7.985-29.641,0H295.407z"/><path d="M468.186,43.969C440.146,15.736,401.971-0.098,362.18,0.001l0,0c-39.769-0.106-77.93,15.695-105.984,43.883L186.5,113.494   c-8.336,8.33-8.341,21.84-0.011,30.176c8.33,8.336,21.84,8.341,30.176,0.011l69.653-69.589   c20.061-20.182,47.363-31.497,75.819-31.424l0,0c59.24,0.02,107.248,48.059,107.228,107.299   c-0.009,28.432-11.307,55.698-31.41,75.805l-69.589,69.589c-8.336,8.336-8.336,21.851,0,30.187c8.336,8.336,21.851,8.336,30.187,0   l0,0l69.589-69.547C526.599,197.417,526.618,102.575,468.186,43.969z"/><path d="M304.964,176.918l-128,128c-8.475,8.185-8.709,21.691-0.524,30.165s21.691,8.709,30.165,0.524   c0.178-0.172,0.352-0.346,0.524-0.524l128-128c8.185-8.475,7.95-21.98-0.525-30.165   C326.338,168.934,313.232,168.934,304.964,176.918L304.964,176.918z"/></g></svg>',
                placeholder: "Введите ссылку"
            }, ...config };
        this.initMenu();
    }
    initUI() {
        const ui = this.api.ui;
        ui.add(".elib-inLink-menu", {
            width: "300px",
            height: "150px",
            borderRadius: "8px",
            transform: 'scale(0.8)',
            transition: "transform 0.3s",
            "&.active": {
                transform: 'scale(1)'
            }
        });
        ui.add(".elib-inLink-box", {
            padding: "5px",
            display: "flex",
            flexDirection: 'column',
            alignItems: "center",
            gap: "8px",
            justifyContent: "center",
        });
    }
    initMenu() {
        this.initUI();
        const menu = document.createElement("div");
        menu.classList.add('elib-inLink-menu');
        const box = document.createElement('div');
        menu.appendChild(box);
        box.classList.add('elib-inLink-box');
        const inp = this.api.create("input", {
            placeholder: this.config.placeholder,
            scrollAble: true,
        });
        box.appendChild(inp);
        const btn = document.createElement("button");
        btn.classList.add('accent-btn');
        box.appendChild(btn);
        this.menu = menu;
    }
    getNode(href) {
        const a = document.createElement('a');
        a.setAttribute('nofollow', '');
        a.href = href;
        return a;
    }
    attachBtn(btn) {
        this.btn = btn;
    }
    onReady() {
        let res = this.inline.isWrap(this.tag, true);
        if (res instanceof HTMLLinkElement) {
            this.node = res;
        }
        else {
            this.node = null;
        }
        if (this.node) {
            this.btn?.classList.add("active");
        }
        else {
            this.btn?.classList.remove('active');
        }
    }
    render() {
        if (this.node) {
            let sel = this.node.nodeName + `[href="${this.node.href}"]`;
            this.inline.unwrapText(sel);
            return;
        }
        if (this.api.cont.contains(this.menu)) {
            this.closeMenu();
        }
        this.inline.fakeRange();
        this.openMenu().then((href) => {
            if (!href)
                return;
            this.inline.wrapText(this.getNode(href));
        });
    }
    openMenu() {
        return new Promise((res, rej) => {
            this.api.on("closeInlineLinkMenu", () => {
            }, { once: true });
        });
    }
    closeMenu() {
        if (!this.api.cont.contains(this.menu))
            return;
        this.menu.classList.remove('active');
        setTimeout(() => this.menu.remove(), 300);
        this.api.emit("closeInlineLinkMenu");
    }
}
