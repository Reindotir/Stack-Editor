export default class Spoiler {
    api;
    config;
    data = null;
    constructor(api, config) {
        this.api = api;
        this.config = { ...{
                name: "Спойлер",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22,14c0,.552-.447,1-1,1H9c-.552,0-1-.448-1-1s.448-1,1-1h12c.553,0,1,.448,1,1ZM5,12H3c-.552,0-1,.448-1,1v2c0,.552,.448,1,1,1h2c.552,0,1-.448,1-1v-2c0-.552-.448-1-1-1Zm16,7H9c-.552,0-1,.448-1,1s.448,1,1,1h12c.553,0,1-.448,1-1s-.447-1-1-1Zm-16-1H3c-.552,0-1,.448-1,1v2c0,.552,.448,1,1,1h2c.552,0,1-.448,1-1v-2c0-.552-.448-1-1-1ZM24,4v2c0,2.206-1.794,4-4,4H4C1.794,10,0,8.206,0,6v-2C0,1.794,1.794,0,4,0H20c2.206,0,4,1.794,4,4Zm-2,0c0-1.103-.897-2-2-2H4c-1.103,0-2,.897-2,2v2c0,1.103,.897,2,2,2H20c1.103,0,2-.897,2-2v-2Zm-2.886-.5h-4.257c-.697,0-1.043,.846-.546,1.334l1.858,1.825c.455,.455,1.177,.455,1.632,0l1.858-1.825c.498-.489,.152-1.334-.546-1.334Z"/></svg>',
                btnIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g><path d="M19.948,23H4.052A4.03,4.03,0,0,1,.6,21.088a3.947,3.947,0,0,1-.182-3.86L8.38,3.212a4.068,4.068,0,0,1,7.253.026l7.922,13.941a3.967,3.967,0,0,1-.156,3.909A4.03,4.03,0,0,1,19.948,23Z"/></g></svg>',
                placeholder: "Спойлер",
            }, ...config };
        this.initUI();
    }
    setData(data) {
        this.data = data;
    }
    initUI() {
        const ui = this.api.ui;
        ui.add(".elib-spoiler-box", {
            display: "flex",
            alignItems: "center",
            width: "100%",
            height: 'auto',
            gap: "5px",
        });
        ui.add(".elib-spoiler-btnSide", {
            width: "30px",
            height: "100%",
            display: "flex",
            justifyContent: "center",
        });
        ui.add(".elib-spoiler-btn", {
            all: "unset",
            cursor: "pointer",
            borderRadius: "5px",
            width: "21px",
            height: "21px",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.3s, transform 0.3s",
            "&:hover": {
                backgroundColor: "rgba(var(--component), 0.6)"
            },
            "svg": {
                width: "13px",
                height: "13px",
                aspectRatio: "1/1",
                fill: "rgb(var(--color))"
            }
        });
        ui.add(".elib-spoiler-contentSide", {
            width: "100%",
            height: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
        });
        ui.add(".elib-spoiler-inpBox", {
            width: "100%",
            height: "30px",
            display: "flex",
            alignItems: "center",
            "div": {
                fontSize: "100%",
            }
        });
        ui.add(".elib-spoiler-content", {});
    }
    render(block) {
        const box = document.createElement("div");
        box.classList.add('elib-spoiler-box');
        const btnSide = document.createElement("div");
        btnSide.classList.add("elib-spoiler-btnSide");
        box.appendChild(btnSide);
        const btn = document.createElement("button");
        btn.classList.add("elib-spoiler-btn");
        btn.addEventListener("click", () => {
            if (content.style.display === "none") {
                content.style.display = "flex";
                btn.style.transform = "rotate(0deg)";
            }
            else {
                content.style.display = "none";
                btn.style.transform = "rotate(180deg)";
            }
        });
        btnSide.appendChild(btn);
        btn.innerHTML = this.config.btnIcon;
        const contentSide = document.createElement("div");
        contentSide.classList.add("elib-spoiler-contentSide");
        box.appendChild(contentSide);
        const inpBox = document.createElement("div");
        inpBox.classList.add("elib-spoiler-inpBox");
        contentSide.appendChild(inpBox);
        const inp = this.api.create("input", {
            placeholder: this.config.placeholder
        });
        inp.addEventListener("keydown", (e) => {
            if (inp.textContent === "" && e.code === "Backspace") {
                this.api.on("delBlockOnBackspace", (e) => e.prevent(), { once: true });
            }
            const target = e.target;
            if (target.closest(".elib-block") !== block)
                return;
            if (e.shiftKey || e.ctrlKey)
                return;
            if (e.code === "Enter") {
                e.preventDefault();
                if (content.style.display === "none")
                    return;
                this.api.on("newBlockOnEnter", (e) => e.prevent(), { once: true });
                let block = workspace.querySelector(".elib-block");
                this.api.focusBlock(block, { focusInp: true });
            }
        });
        inpBox.appendChild(inp);
        const content = document.createElement("div");
        content.classList.add("elib-spoiler-content");
        contentSide.appendChild(content);
        const workspace = this.api.workspace(false);
        content.appendChild(workspace);
        if (this.data) {
            if (this.data.text) {
                inp.innerHTML = this.data.text;
            }
            if (this.data.data) {
                this.api.initData(this.data.data, workspace);
            }
            else {
                this.api.newBlock({ box: workspace });
            }
        }
        if (!workspace.querySelector(".elib-block")) {
            this.api.newBlock({ box: workspace });
        }
        return box;
    }
    async save(block) {
        const inp = block.querySelector(".elib-spoiler-inpBox div");
        const data = await this.api.save(block.querySelector(".elib-blocks"));
        return {
            text: inp.innerHTML,
            data: data
        };
    }
}
