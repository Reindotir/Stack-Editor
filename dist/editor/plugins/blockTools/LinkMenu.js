import { EventEmmiter } from "../../../libs/EventEmmiter.js";
export class LinkMenu extends EventEmmiter {
    api;
    config;
    menu;
    content;
    indicator;
    plugins = {};
    pages = {};
    tabs = {};
    constructor(api, conf) {
        super();
        this.api = api;
        this.config = { ...{
                tabs: {}
            }, ...conf };
        this.init();
    }
    init() {
        this.initUI();
        this.initMenu();
        this.initPlugins();
        this.initTabs();
        this.initContent();
        this.navigate(0);
    }
    initUI() {
        const ui = this.api.ui;
        ui.add(".elib-linkMenu", {
            borderRadius: "12px",
            backgroundColor: "rgba(var(--bg-nd), 0.7)",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            margin: "10px 0"
        });
        ui.add(".elib-linkMenu-header", {
            position: "relative",
            width: "100%",
            height: "45px",
            borderBottom: "1px solid rgb(var(--color-nd))"
        });
        ui.add(".elib-linkMenu-indicator", {
            position: "absolute",
            backgroundColor: "rgb(var(--color))",
            height: "2px",
            top: "99%",
            borderRadius: "3px",
            transition: "width 0.3s, left 0.3s",
        });
        ui.add(".elib-linkMenu-tabs", {
            width: "100%",
            height: "100%",
            overflow: "hidden",
            overflowX: "auto",
            padding: "5px",
            display: "flex",
            alignItems: "center",
        });
        ui.add(".elib-linkMenu-main", {
            width: "100%",
            padding: "5px",
        });
        ui.add(".elib-linkMenu-content", {
            width: "100%",
            height: "auto",
            overflowY: "auto",
            transition: "height 0.3s"
        });
        ui.add(".elib-linkMenu-tab", {
            all: "unset",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2px 5px",
            gap: "8px",
            cursor: "pointer",
            flexDirection: "row",
            width: "100px",
            height: "30px",
            color: "rgb(var(--color-nd))",
            background: "none",
            transition: "all 0.3s",
            borderRadius: "5px",
            "&:hover": {
                color: "rgb(var(--color))",
                backgroundColor: "rgba(var(--component), 0.6)",
                "svg": {
                    fill: "rgb(var(--color))"
                }
            },
            "&.active": {
                color: "rgb(var(--color))",
                "svg": {
                    fill: "rgb(var(--color))"
                }
            }
        });
        ui.add(".elib-linkMenu-iconBox", {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "svg": {
                width: "20px",
                height: "20px",
                aspectRatio: "1/1",
                fill: "rgb(var(--color-nd))",
                transition: "fill 0.3s",
            }
        });
        ui.add(".elib-linkMenu-nameBox", {
            "span": {}
        });
    }
    initMenu() {
        const menu = document.createElement("div");
        menu.classList.add('elib-linkMenu');
        menu.setAttribute("data-elib-noProxy", "");
        const header = document.createElement("div");
        header.classList.add("elib-linkMenu-header");
        menu.appendChild(header);
        const indicator = document.createElement("div");
        indicator.classList.add("elib-linkMenu-indicator");
        this.indicator = indicator;
        header.appendChild(indicator);
        const tabs = document.createElement("div");
        tabs.classList.add("elib-linkMenu-tabs");
        header.appendChild(tabs);
        const main = document.createElement("div");
        main.classList.add("elib-linkMenu-main");
        menu.appendChild(main);
        const content = document.createElement("div");
        content.classList.add("elib-linkMenu-content");
        main.appendChild(content);
        this.content = content;
        this.menu = menu;
    }
    initPlugins() {
        for (const pluginName in this.config.tabs) {
            let conf;
            const pluginClass = this.config.tabs[pluginName];
            if (typeof pluginClass === "function") {
                conf = {
                    class: pluginClass
                };
            }
            else {
                conf = pluginClass;
            }
            const plugin = new conf.class(this, conf);
            this.plugins[pluginName] = plugin;
        }
    }
    initTabs() {
        const tabsBox = this.menu.querySelector(".elib-linkMenu-tabs");
        for (const pluginName in this.plugins) {
            const plugin = this.plugins[pluginName];
            const { name, icon } = plugin.config;
            const btn = document.createElement("button");
            btn.addEventListener("click", (e) => {
                this.navigate(pluginName);
            });
            btn.classList.add("elib-linkMenu-tab");
            btn.setAttribute("data-elib-linkMenu-plugin", pluginName);
            const iconBox = document.createElement("div");
            iconBox.classList.add("elib-linkMenu-iconBox");
            iconBox.innerHTML = icon || "";
            if (icon)
                btn.appendChild(iconBox);
            const nameBox = document.createElement("div");
            nameBox.classList.add("elib-linkMenu-nameBox");
            const nameSpan = document.createElement("span");
            nameSpan.innerHTML = name;
            nameBox.appendChild(nameSpan);
            btn.appendChild(nameBox);
            this.tabs[pluginName] = btn;
            tabsBox?.appendChild(btn);
        }
    }
    initContent() {
        for (const pluginName in this.plugins) {
            const plugin = this.plugins[pluginName];
            const page = document.createElement("div");
            page.classList.add("elib-linkMenu-page");
            plugin.build(page);
            this.pages[pluginName] = page;
        }
    }
    navigate(idx) {
        if (typeof idx === "number") {
            const tab = Object.values(this.tabs)[idx];
            if (!tab)
                return;
            let id = tab.getAttribute("data-elib-linkMenu-plugin");
            if (id)
                this.navigate(id);
        }
        else if (typeof idx === "string") {
            this.clear();
            const tool = this.plugins[idx];
            const tab = this.tabs[idx];
            const page = this.pages[idx];
            if (!page || !tab || !tool)
                return;
            tab.classList.add("active");
            this.content.appendChild(page);
            this.navigateIndicator(tab);
            tool.onReady();
        }
    }
    navigateIndicator(tab) {
        const rect = tab.getBoundingClientRect();
        this.indicator.style.left = `${tab.offsetLeft}px`;
        this.indicator.style.width = `${rect.width}px`;
    }
    clear() {
        this.emit("clear");
        this.content.innerHTML = "";
        for (const tabName in this.tabs) {
            const tab = this.tabs[tabName];
            tab.classList.remove("active");
        }
    }
}
export const menu = (api, conf) => new LinkMenu(api, conf);
