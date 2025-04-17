import { menu } from "../LinkMenu.js";
import { Link } from "../MenuTabs.js";
export default class Picture {
    api;
    config;
    data = null;
    menu;
    constructor(api, config) {
        this.api = api;
        this.config = { ...{
                name: "Картинка",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19,0H5A5.006,5.006,0,0,0,0,5V19a5.006,5.006,0,0,0,5,5H19a5.006,5.006,0,0,0,5-5V5A5.006,5.006,0,0,0,19,0ZM5,2H19a3,3,0,0,1,3,3V19a2.951,2.951,0,0,1-.3,1.285l-9.163-9.163a5,5,0,0,0-7.072,0L2,14.586V5A3,3,0,0,1,5,2ZM5,22a3,3,0,0,1-3-3V17.414l4.878-4.878a3,3,0,0,1,4.244,0L20.285,21.7A2.951,2.951,0,0,1,19,22Z"/><path d="M16,10.5A3.5,3.5,0,1,0,12.5,7,3.5,3.5,0,0,0,16,10.5Zm0-5A1.5,1.5,0,1,1,14.5,7,1.5,1.5,0,0,1,16,5.5Z"/></svg>',
                description: "Картинка или gif",
                altPlaceholder: "Описание картинки (важно!)"
            }, ...config };
        this.menu = menu(this.api, {
            tabs: {
                link: Link
            }
        });
        this.initUI();
    }
    initUI() {
        const ui = this.api.ui;
        ui.add(".elib-picture-box", {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
        });
        ui.add(".elib-picture-content", {
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            padding: "10px 0px",
            gap: "8px",
            height: "auto",
            width: "100%"
        });
        ui.add(".elib-picture-img", {
            borderRadius: "8px",
        });
        ui.add(".elib-picture-descBox", {
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: "8px",
            maxWidth: "100%",
        });
        ui.add(".elib-picture-indicator", {
            alignSelf: "stretch",
            width: "3px",
            borderRadius: "2px",
            backgroundColor: "rgb(var(--color-nd))"
        });
        ui.add(".elib-picture-inp", {
            margin: "5px 0px",
            color: "rgb(var(--color-nd))",
            wordBreak: "break-word",
            maxWidth: "100%",
        });
    }
    setData(data) {
        this.data = data;
    }
    render(block, conf) {
        if (this.data) {
            return this.renderPic(block);
        }
        if (conf.data) {
            this.setData(conf.data);
            const res = this.renderPic(block);
            this.setData(null);
            return res;
        }
        this.menu.on("newData", (data) => {
            let content = block.querySelector(".elib-block-content");
            this.setData(data.data);
            let res = this.renderPic(block);
            this.setData(null);
            content?.appendChild(res);
            this.api.focusBlock(block);
        }, { once: true });
        return this.renderMenu();
    }
    renderPic(block) {
        const blockContent = block.querySelector(".elib-block-content");
        blockContent.innerHTML = "";
        const box = document.createElement("div");
        box.classList.add("elib-picture-box");
        const content = document.createElement("div");
        content.classList.add("elib-picture-content");
        box.appendChild(content);
        const img = document.createElement("img");
        img.classList.add("elib-picture-img");
        content.appendChild(img);
        const descBox = document.createElement("div");
        descBox.classList.add("elib-picture-descBox");
        content.appendChild(descBox);
        const indicator = document.createElement("div");
        indicator.classList.add("elib-picture-indicator");
        descBox.appendChild(indicator);
        const inp = this.api.create("input", {
            placeholder: this.config.altPlaceholder,
            class: "elib-input elib-picture-inp"
        });
        inp.setAttribute("data-elib-inline", "");
        descBox.appendChild(inp);
        this.api.on("delBlockOnBackspace", (e) => {
            e.prevent();
        });
        inp.addEventListener("input", () => {
            img.alt = inp.textContent;
        });
        if (this.data) {
            if (this.data.src) {
                img.src = this.data.src;
            }
            if (this.data.alt) {
                img.alt = this.data.alt;
                inp.textContent = this.data.alt;
            }
        }
        setTimeout(() => inp.focus());
        return box;
    }
    renderMenu() {
        setTimeout(() => this.menu.navigate(0));
        return this.menu.menu;
    }
    save(block) {
        const img = block.querySelector('img');
        if (!img)
            return false;
        return {
            src: img?.src || "",
            alt: img?.alt || ""
        };
    }
}
