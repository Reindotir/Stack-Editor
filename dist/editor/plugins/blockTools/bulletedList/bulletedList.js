export default class {
    api;
    config;
    data = null;
    sprite;
    constructor(api, config) {
        this.api = api;
        this.config = { ...{
                name: "Маркированный список",
                icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m4 6a2.982 2.982 0 0 1 -2.122-.879l-1.544-1.374a1 1 0 0 1 1.332-1.494l1.585 1.414a1 1 0 0 0 1.456.04l3.604-3.431a1 1 0 0 1 1.378 1.448l-3.589 3.414a2.964 2.964 0 0 1 -2.1.862zm20-2a1 1 0 0 0 -1-1h-10a1 1 0 0 0 0 2h10a1 1 0 0 0 1-1zm-17.9 9.138 3.589-3.414a1 1 0 1 0 -1.378-1.448l-3.6 3.431a1.023 1.023 0 0 1 -1.414 0l-1.59-1.585a1 1 0 0 0 -1.414 1.414l1.585 1.585a3 3 0 0 0 4.226.017zm17.9-1.138a1 1 0 0 0 -1-1h-10a1 1 0 0 0 0 2h10a1 1 0 0 0 1-1zm-17.9 9.138 3.585-3.414a1 1 0 1 0 -1.378-1.448l-3.6 3.431a1 1 0 0 1 -1.456-.04l-1.585-1.414a1 1 0 0 0 -1.332 1.494l1.544 1.374a3 3 0 0 0 4.226.017zm17.9-1.138a1 1 0 0 0 -1-1h-10a1 1 0 0 0 0 2h10a1 1 0 0 0 1-1z"/></svg>',
                description: "Список с маркерами",
                placeholder: "Контент элемента",
                elementIcons: [
                    {
                        name: "Точка",
                        id: "elib-list-dot",
                        symbol: '<symbol id="elib-list-dot" viewBox="0 0 24 24"><path d="M12,17c-2.76,0-5-2.24-5-5s2.24-5,5-5,5,2.24,5,5-2.24,5-5,5Z"/></symbol>',
                    },
                    {
                        name: "Квадрат",
                        id: "elib-list-dot",
                        symbol: '<symbol id="elib-list-square" viewBox="0 0 24 24"><path d="M14.5,19h-5c-2.48,0-4.5-2.02-4.5-4.5v-5c0-2.48,2.02-4.5,4.5-4.5h5c2.48,0,4.5,2.02,4.5,4.5v5c0,2.48-2.02,4.5-4.5,4.5Z"/></symbol>'
                    }
                ],
            }, ...config };
        this.initUI();
        this.sprite = this.initIcons();
        api.on("newBlockOnEnter", (e) => {
            const block = api.state.focusedBlock.block;
            let toolName = block.getAttribute("data-tool");
            if (!toolName)
                return;
            if (api.tools.block[toolName] !== this)
                return;
            let content = block.querySelector(".elib-block-content");
            if (content.querySelector("[contenteditable]")?.textContent === "") {
                this.api.deleteBlock(block);
                return;
            }
            let use = content.querySelector("use");
            let iconName = use.getAttribute("href").slice(1);
            if (!iconName)
                return;
            e.prevent();
            e.event.preventDefault();
            api.newBlock({
                tool: toolName,
                iconName: iconName
            });
        });
    }
    initUI() {
        const ui = this.api.ui;
        ui.add(".elib-bulletedList-box", {
            width: "100%",
            display: "flex",
            gap: "8px",
            height: "auto",
            alignItems: "center",
        });
        ui.add(".elib-bulletedList-icon", {
            aspectRatio: "1/1",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3px',
            width: '25px',
            height: '25px',
        });
        ui.add(".elib-bulletedList-icon svg", {
            width: '20px',
            height: '20px',
            fill: "rgb(var(--color))"
        });
    }
    initIcons() {
        const sprite = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        sprite.setAttribute("style", "display: none");
        this.config.elementIcons.forEach((icon) => {
            sprite.innerHTML += icon.symbol;
        });
        document.body.prepend(sprite);
        return sprite;
    }
    setData(data) {
        this.data = data;
    }
    render(_, conf) {
        const box = document.createElement("div");
        box.classList.add("elib-bulletedList-box");
        let iconName = conf.iconName || this.data?.iconName || "elib-list-dot";
        const icon = document.createElement("div");
        icon.classList.add("elib-bulletedList-icon");
        icon.innerHTML = `<svg><use href="#${iconName}"></use></svg>`;
        box.appendChild(icon);
        const inp = this.api.create("input", {
            placeholder: this.config.placeholder,
        });
        if (this.data) {
            inp.innerHTML = this.data.text || "";
        }
        if (this.data) {
            if (this.data.text) {
                inp.innerHTML = this.data.text;
            }
            if (this.data.icon) {
                icon.innerHTML = this.data.icon;
            }
        }
        box.appendChild(inp);
        return box;
    }
    save(block) {
        const icon = block.querySelector('.elib-bulletedList-icon')?.getAttribute("href")?.slice(0) || "elib-list-dot";
        const text = block.querySelector("[contenteditable]")?.innerHTML;
        return {
            icon: icon,
            text: text
        };
    }
    destroy() {
        this.sprite.remove();
    }
}
class ChangeType {
    api;
    config;
    constructor(api, config) {
        this.api = api;
        this.config = { ...{}, ...config };
    }
    onFocus() {
        const tool = this.api.tools.block[this.api.state.focusedBlock.block.getAttribute("data-tool")];
        const icons = tool.config.elementIcons;
    }
    onBlur() {
    }
}
