export default class {
    api;
    config;
    data = null;
    constructor(api, config) {
        this.api = api;
        this.config = { ...{
                name: "Цитата",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m11,9.5v3.5c0,2.206-1.794,4-4,4-.553,0-1-.447-1-1s.447-1,1-1c1.103,0,2-.897,2-2h-1.5c-.828,0-1.5-.672-1.5-1.5v-1.5c0-1.105.895-2,2-2h1.5c.828,0,1.5.672,1.5,1.5Zm5.5-1.5h-1.5c-1.105,0-2,.895-2,2v1.5c0,.828.672,1.5,1.5,1.5h1.5c0,1.103-.897,2-2,2-.553,0-1,.447-1,1s.447,1,1,1c2.206,0,4-1.794,4-4v-3.5c0-.828-.672-1.5-1.5-1.5Zm7.5-3v14c0,2.757-2.243,5-5,5H5c-2.757,0-5-2.243-5-5V5C0,2.243,2.243,0,5,0h14c2.757,0,5,2.243,5,5Zm-2,0c0-1.654-1.346-3-3-3H5c-1.654,0-3,1.346-3,3v14c0,1.654,1.346,3,3,3h14c1.654,0,3-1.346,3-3V5Z"/></svg>',
                contentPlaceholder: "Цитата",
                signPlaceholder: "Подпись",
                description: "Блок цитаты с подписью"
            }, ...config };
        this.initUI();
    }
    setData(data) {
        this.data = data;
    }
    initUI() {
        const ui = this.api.ui;
        ui.add(".elib-quote-box", {
            width: "100%",
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            margin: "10px 0"
        });
        ui.add(".elib-quote-indent", {
            width: "5px",
            height: "100%",
            borderRadius: "3px",
            backgroundColor: "rgba(var(--color), 0.9)",
        });
        ui.add(".elib-quote-main", {
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
        });
        ui.add(".elib-quote-content", {
            marginTop: "5px",
        });
        ui.add('.elib-quote-content div', {
            wordBreak: "break-word",
            fontStyle: "italic",
            fontSize: "115%",
        });
        ui.add(".elib-quote-signBox", {
            marginBottom: "5px",
            display: 'flex',
            justifyContent: "flex-end",
            padding: "0 10px"
        });
        ui.add(".elib-quote-signInp", {
            wordBreak: "break-word",
            color: "rgb(var(--color-nd))",
            width: "auto",
        });
    }
    render() {
        const box = document.createElement('div');
        box.classList.add("elib-quote-box");
        const indent = document.createElement("div");
        indent.classList.add("elib-quote-indent");
        box.appendChild(indent);
        const main = document.createElement("div");
        main.classList.add("elib-quote-main");
        box.appendChild(main);
        const content = document.createElement("div");
        content.classList.add("elib-quote-content");
        main.appendChild(content);
        const offDeleting = (e) => {
            if (e.textContent !== "" && e.code !== "Backspace")
                return false;
            const off = this.api.on("delBlockOnBackspace", (e) => {
                e.prevent();
                off();
            });
            return true;
        };
        const inp = this.api.create("input", {
            placeholder: this.config.contentPlaceholder
        });
        inp.addEventListener("blur", () => {
            let txt = inp.innerHTML;
            if (!inp.textContent)
                return;
            if (txt[0] !== '"')
                txt = '"' + txt;
            if (txt[txt.length - 1] !== '"')
                txt = txt + '"';
            inp.innerHTML = txt;
        });
        inp.addEventListener("focus", () => {
            let txt = inp.innerHTML;
            if (txt[0] === '"')
                txt = txt.slice(1);
            if (txt[txt.length - 1] === '"')
                txt = txt.slice(0, -1);
            inp.innerHTML = txt;
        });
        inp.addEventListener("keydown", (e) => {
            offDeleting(e);
            if (e.code !== "Enter")
                return;
            if (e.shiftKey || e.ctrlKey)
                return;
            e.preventDefault();
            const off = this.api.on("newBlockOnEnter", (e) => {
                e.prevent();
                off();
            });
            this.api.focus(signInp);
        });
        content.appendChild(inp);
        const signBox = document.createElement("div");
        signBox.classList.add("elib-quote-signBox");
        main.appendChild(signBox);
        const signInp = this.api.create("input", {
            placeholder: this.config.signPlaceholder,
            class: "elib-input elib-quote-signInp"
        });
        signInp.addEventListener("keydown", (e) => {
            if (e.code === "Backspace" && signInp.textContent === "") {
                offDeleting(e);
                this.api.focus(inp);
            }
        });
        signBox.appendChild(signInp);
        if (this.data) {
            if (this.data.text) {
                inp.innerHTML = this.data.text;
            }
            if (this.data.sign) {
                signInp.textContent = this.data.sign;
            }
        }
        return box;
    }
    save(block) {
        const quote = block.querySelector('[contenteditable]')?.innerHTML || "";
        const sign = block.querySelector(".elib-quote-signInp")?.textContent || "";
        return {
            text: quote,
            sign: sign
        };
    }
}
