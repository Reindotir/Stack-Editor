export default class NumberedList {
    api;
    config;
    data = null;
    constructor(api, config) {
        this.api = api;
        this.config = { ...{
                name: "Нумерованный список",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M7,6H23a1,1,0,0,0,0-2H7A1,1,0,0,0,7,6Z"/><path d="M23,11H7a1,1,0,0,0,0,2H23a1,1,0,0,0,0-2Z"/><path d="M23,18H7a1,1,0,0,0,0,2H23a1,1,0,0,0,0-2Z"/><circle cx="2" cy="5" r="2"/><circle cx="2" cy="12" r="2"/><circle cx="2" cy="19" r="2"/></svg>',
                description: "Список с цифрами",
                placeholder: "Элемент списка"
            }, ...config };
        this.initUI();
        const isIt = (block) => {
            let toolName = block.getAttribute("data-tool");
            if (!toolName)
                return false;
            if (api.tools.block[toolName] !== this)
                return false;
            return true;
        };
        const onChange = () => {
            const packs = [];
            const workspaces = this.api.cont.querySelectorAll(".elib-blocks");
            for (const workspace of workspaces) {
                const blocks = workspace.querySelectorAll(".elib-block");
                let isLine = false;
                let queue = [];
                for (const block of blocks) {
                    if (isIt(block)) {
                        isLine = true;
                        queue.push(block);
                    }
                    else {
                        isLine = false;
                        if (queue.length)
                            packs.push(queue);
                        queue = [];
                    }
                }
                if (queue.length)
                    packs.push(queue);
            }
            packs.forEach((pack) => {
                let i = 1;
                pack.forEach((block) => {
                    const orderHolder = block.querySelector(".elib-numberedList-order span");
                    if (!orderHolder)
                        return;
                    orderHolder.textContent = `${i}.`;
                    i++;
                });
            });
        };
        this.api.on('change', (_, mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList" && mutation.target.nodeType === 1 && mutation.target.matches(".elib-blocks")) {
                    onChange();
                }
            });
        });
        this.api.on("newBlockOnEnter", (e) => {
            const block = this.api.state.focusedBlock.block;
            if (!isIt(block))
                return;
            let toolName = block.getAttribute("data-tool");
            e.event.preventDefault();
            e.prevent();
            const inp = block.querySelector("[contenteditable]");
            if (inp?.textContent === "") {
                this.api.deleteBlock(block);
                this.api.newBlock();
                return;
            }
            this.api.newBlock({ tool: toolName });
        });
    }
    initUI() {
        const ui = this.api.ui;
        ui.add(".elib-numberedList-box", {
            width: "100%",
            display: "flex",
            height: "auto",
            alignItems: "center",
        });
        ui.add(".elib-numberedList-order", {
            aspectRatio: "1/1",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '3px',
            width: '25px',
            height: '25px',
        });
        ui.add(".elib-numberedList-order span", {
            width: '20px',
            height: '20px',
            fill: "rgb(var(--color))"
        });
    }
    setData(data) {
        this.data = data;
    }
    render() {
        const box = document.createElement("div");
        box.classList.add("elib-numberedList-box");
        const order = document.createElement('div');
        order.classList.add("elib-numberedList-order");
        const span = document.createElement("span");
        order.appendChild(span);
        box.appendChild(order);
        const inp = this.api.create("input", {
            placeholder: this.config.placeholder,
        });
        box.appendChild(inp);
        if (this.data) {
            inp.innerHtml = this.data.text || "";
            span.textContent = this.data.order || "";
        }
        return box;
    }
    save(block) {
        const content = block.querySelector("[contenteditable")?.innerHTML || "";
        const order = block.querySelector(".elib-numberedList-order span")?.textContent || "";
        return {
            text: content,
            order: order,
        };
    }
}
