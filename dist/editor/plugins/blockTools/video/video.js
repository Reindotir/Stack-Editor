import { menu } from "../LinkMenu.js";
import { Link } from "../MenuTabs.js";
export default class Video {
    api;
    config;
    data = null;
    menu;
    constructor(api, config) {
        this.api = api;
        this.config = { ...{
                name: "Видео",
                icon: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m19 24h-14a5.006 5.006 0 0 1 -5-5v-14a5.006 5.006 0 0 1 5-5h14a5.006 5.006 0 0 1 5 5v14a5.006 5.006 0 0 1 -5 5zm-14-22a3 3 0 0 0 -3 3v14a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-14a3 3 0 0 0 -3-3zm4.342 15.005a2.368 2.368 0 0 1 -1.186-.323 2.313 2.313 0 0 1 -1.164-2.021v-5.322a2.337 2.337 0 0 1 3.5-2.029l5.278 2.635a2.336 2.336 0 0 1 .049 4.084l-5.376 2.687a2.2 2.2 0 0 1 -1.101.289zm-.025-8a.314.314 0 0 0 -.157.042.327.327 0 0 0 -.168.292v5.322a.337.337 0 0 0 .5.293l5.376-2.688a.314.314 0 0 0 .12-.266.325.325 0 0 0 -.169-.292l-5.274-2.635a.462.462 0 0 0 -.228-.068z"/></svg>',
                description: "Обычное видео",
                altPlaceholder: "Описание видео",
                settings: null,
                customSettings: false,
                extentions: ["mp4", "webm", "ogg"],
            }, ...config };
        const settings = {
            controls: true,
            autoplay: false,
            muted: false,
            loop: false,
            poster: "",
            preload: "metadata",
            crossorigin: null,
            playsinline: false,
            currentTime: 0,
            volume: 1,
            playbackRate: 1,
        };
        if (this.config.settings && !this.config.customSettings) {
            this.config.settings = { ...this.config.settings, ...settings };
        }
        else {
            this.config.settings = settings;
        }
        this.menu = menu(this.api, {
            tabs: {
                link: {
                    class: Link,
                    placeholder: "Вставьте ссылку на видео",
                    btnContent: "Вставить видео",
                    info: "Работает с любыми видео из интернета",
                    extentions: this.config.extentions,
                }
            }
        });
        this.initUI();
    }
    initUI() {
        const ui = this.api.ui;
        ui.add(".elib-video-box", {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
        });
        ui.add(".elib-video-content", {
            display: "flex",
            alignItems: "center",
            flexDirection: "column",
            padding: "10px 0px",
            gap: "8px",
            height: "auto",
            width: "100%"
        });
        ui.add(".elib-video-video", {
            borderRadius: "8px",
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
        });
        ui.add(".elib-video-descBox", {
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: "8px",
            maxWidth: "100%",
        });
        ui.add(".elib-video-indicator", {
            alignSelf: "stretch",
            width: "3px",
            borderRadius: "2px",
            backgroundColor: "rgb(var(--color-nd))"
        });
        ui.add(".elib-video-inp", {
            margin: "5px 0px",
            color: "rgb(var(--color-nd))",
            wordBreak: "break-word",
            maxWidth: "100%"
        });
    }
    setData(data) {
        this.data = data;
    }
    render(block, conf) {
        if (this.data) {
            return this.renderVideo(block);
        }
        if (conf.data) {
            this.setData(conf.data);
            const res = this.renderVideo(block);
            this.setData(null);
            return res;
        }
        this.menu.on("newData", (data) => {
            let content = block.querySelector(".elib-block-content");
            this.setData(data.data);
            let res = this.renderVideo(block);
            this.setData(null);
            content?.appendChild(res);
            this.api.focusBlock(block);
        }, { once: true });
        return this.renderMenu();
    }
    renderVideo(block) {
        const blockContent = block.querySelector(".elib-block-content");
        blockContent.innerHTML = "";
        const box = document.createElement("div");
        box.classList.add("elib-video-box");
        const content = document.createElement("div");
        content.classList.add("elib-video-content");
        box.appendChild(content);
        const video = document.createElement("video");
        video.classList.add("elib-video-video");
        Object.assign(video, this.config.settings);
        content.appendChild(video);
        const descBox = document.createElement("div");
        descBox.classList.add("elib-video-descBox");
        content.appendChild(descBox);
        const indicator = document.createElement("div");
        indicator.classList.add("elib-video-indicator");
        descBox.appendChild(indicator);
        const inp = this.api.create("input", {
            placeholder: this.config.altPlaceholder,
            class: "elib-input elib-video-inp"
        });
        inp.setAttribute("data-elib-inline", "");
        descBox.appendChild(inp);
        this.api.on("delBlockOnBackspace", (e) => {
            e.prevent();
        });
        if (this.data) {
            if (this.data.src) {
                video.src = this.data.src;
            }
            if (this.data.settings) {
                Object.assign(video, this.data.settings);
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
        function mergeObjects(target, source) {
            const newObj = {};
            for (const key in target) {
                if (target[key] !== source[key]) {
                    newObj[key] = source[key];
                }
            }
            return newObj;
        }
        const video = block.querySelector('video');
        if (!video)
            return false;
        const inp = block.querySelector("[contenteditable]");
        let sets = mergeObjects(this.config.settings, video);
        return {
            src: video?.src || "",
            description: inp?.textContent || "",
            settings: sets,
        };
    }
}
