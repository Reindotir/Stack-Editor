import { EventEmmiter } from "../libs/EventEmmiter.js";
import { Inline } from "../libs/betterInline.js";
class EditorStyleManager {
    config = {};
    _envSelector = "";
    style = document.createElement("style");
    sheet = null;
    mixins = {};
    setRulesLater = [];
    init() {
        if (this.sheet)
            return;
        document.querySelector("head")?.appendChild(this.style);
        this.style.setAttribute("data-elib-uitheme", "");
        this.sheet = this.style.sheet;
    }
    set envSelector(vl) {
        if (vl && !vl.endsWith(" "))
            vl = vl + " ";
        this._envSelector = vl;
    }
    get envSelector() {
        return this._envSelector;
    }
    env(selector) {
        const oldSel = this.envSelector;
        this.envSelector = selector;
        return () => {
            this.envSelector = oldSel;
        };
    }
    add(selector, styles, option = {}) {
        if (!this.sheet && !option.sheet) {
            this.setRulesLater.push([selector, styles, option]);
            return;
        }
        const op = {
            toVar: false,
            index: null,
            global: false,
            sheet: this.sheet,
        };
        Object.assign(op, option);
        if (!op.sheet)
            return;
        if (!op.index) {
            op.index = op.sheet.cssRules.length;
        }
        if (!op.global && !selector.startsWith("@")) {
            selector = this.envSelector + selector;
        }
        if (op.toVar === true && !selector.startsWith("@")) {
            styles = this.toVar(styles);
        }
        if (selector.startsWith("@mixin")) {
            let name = selector.split(" ")[1];
            this.mixins[name] = styles;
            return;
        }
        if (selector.startsWith("@")) {
            let idx = op.sheet.insertRule(`${selector} {}`, op.index);
            const rule = op.sheet.cssRules[idx];
            for (let selector in styles) {
                const value = styles[selector];
                this.add(selector, value, {
                    sheet: rule,
                    global: op.global,
                    toVar: op.toVar
                });
            }
            return;
        }
        let extender = {};
        for (let key in styles) {
            if (key === "@extend") {
                let rule = this.find(styles[key]);
                if (!rule)
                    continue;
                rule = this.parse(rule.cssText);
                extender = { ...extender, ...rule };
            }
            else if (key === "@include") {
                let rule = this.mixins[styles[key]] || this.mixins[styles[key]];
                extender = { ...extender, ...rule };
            }
        }
        styles = { ...extender, ...styles };
        const nested = [];
        for (let key in styles) {
            if (key === "@extend" || key === "@include") {
                delete styles[key];
                continue;
            }
            if (typeof styles[key] !== "object")
                continue;
            let sel;
            if (key.startsWith("&")) {
                sel = selector + key.slice(1);
            }
            else {
                sel = selector + " " + key;
            }
            nested.push([sel, styles[key], { global: true }]);
            delete styles[key];
        }
        let rules = this.toString(styles);
        let rule = `${selector} ${rules}`;
        if (!op.index)
            op.index = op.sheet.cssRules.length;
        op.sheet.insertRule(rule, op.index);
        nested.forEach((rule) => {
            this.add(...rule);
        });
        return () => {
            this.remove(op.index, op.sheet);
        };
    }
    remove(selector, sheet = this.sheet) {
        if (typeof selector === "string") {
            const rules = sheet?.cssRules || [new CSSRule()];
            for (let i = 0; i < rules.length; i++) {
                const rule = rules[i];
                if (rule.selectorText === selector) {
                    sheet?.deleteRule(i);
                    return true;
                }
            }
        }
        else if (isNaN(selector)) {
            let index = selector;
            const rules = sheet?.cssRules || [new CSSRule()];
            if (index >= 0 && index < rules.length) {
                sheet?.deleteRule(index);
                return true;
            }
        }
        return false;
    }
    find(selector, sheet = this.sheet) {
        if (!sheet)
            return null;
        let cureRule = null;
        for (const rule of sheet.cssRules) {
            if (cureRule)
                break;
            if (rule instanceof CSSStyleRule) {
                if (rule.selectorText === selector) {
                    cureRule = rule;
                }
            }
        }
        return cureRule;
    }
    toString(styles) {
        let props = Object.entries(styles)
            .map(([key, value]) => {
            return `\t${key.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value};`;
        })
            .join(`\n`);
        return `{\n ${props} \n}`;
    }
    parse(cssText, type = "styles") {
        const cssObject = {};
        const rules = cssText.replace(/\/\*[\s\S]*?\*\//g, "").match(/([^{]+)\s*\{([^}]+)\}/g);
        if (!rules)
            return cssObject;
        rules.forEach(rule => {
            const match = rule.match(/([^{]+)\s*\{([^}]+)\}/);
            if (!match)
                return;
            const [, selector, properties] = match;
            const styles = properties.split(";").reduce((acc, prop) => {
                const [key, value] = prop.split(":").map(s => s.trim());
                if (key && value) {
                    acc[key] = value;
                }
                return acc;
            }, {});
            cssObject[selector.trim()] = styles;
        });
        if (type === "styles") {
            for (let key in cssObject) {
                return cssObject[key];
            }
        }
        return cssObject;
    }
    toVar(oldPack) {
        const pack = {};
        for (const key in oldPack) {
            let newVar = key;
            if (key.slice(0, 2) !== "--" && typeof oldPack[key] === "string") {
                newVar = "--" + key;
            }
            pack[newVar] = oldPack[key];
        }
        return pack;
    }
    delete() {
        this.style.remove();
    }
}
export class StackEditor extends EventEmmiter {
    op;
    cont;
    content;
    blocksBox;
    btnsBox;
    ui = new EditorStyleManager();
    inline = new Inline();
    comps = {};
    state = {
        isFakeRange: false,
        focusedBlock: null,
    };
    blocksMeta = new WeakMap();
    observer = null;
    tools = {
        core: {},
        block: {},
        blockOption: {},
        option: [],
        inline: [],
    };
    btns = {
        block: {},
        option: [],
        blockOption: {},
        inline: [],
    };
    allowed = {
        tags: [],
        attrs: [],
        inline: [],
    };
    events = {
        "newBlockOnEnter": [],
        "newBlock": [],
    };
    constructor(op = {}) {
        super();
        this.op = {
            holder: "#stackEditor",
            coreTools: {},
            blockTools: {},
            optionTools: [],
            inlineTools: [],
            data: {
                time: Date.now(),
                blocks: [{
                        tool: 'paragraph',
                        data: {
                            text: ""
                        },
                    }]
            },
            comps: {},
            baseTool: 'paragraph',
            autofocus: false,
            purify: null,
            optionInfo: null,
            showBtnsOnLeave: false,
            autoInit: true,
        };
        this.op = Object.assign(this.op, op);
        if (this.op.autoInit)
            this.init();
    }
    async init() {
        await this.initCore();
        if (this.emit("init").prevented)
            return;
        this.initStyles();
        this.initComponents();
        this.initProxyBlocks();
        this.initMenuBtns();
        this.initInline();
        this.initPlugins();
        this.initData(this.op.data, this.blocksBox);
        this.initDesign();
        this.initOther();
        this.emit('ready');
    }
    async initCore() {
        if (!(this.op.holder instanceof HTMLElement)) {
            const editorCont = document.querySelector(this.op.holder);
            if (!editorCont) {
                throw new Error("Element with given selector: " + this.op.holder + " doesn't exist.");
            }
            this.cont = editorCont;
        }
        else {
            this.cont = this.op.holder;
        }
        this.cont.classList.add("elib");
        this.content = document.createElement("div");
        this.content.classList.add("elib-content");
        this.cont.appendChild(this.content);
        this.blocksBox = this.workspace(false);
        this.content.appendChild(this.blocksBox);
        this.ui.init();
        for (const toolName in this.op.coreTools) {
            const toolClass = this.op.tools.core[toolName];
            if (typeof toolClass === "function") {
                console.error("Core tool: " + toolName + " isn't typeof function.");
            }
            try {
                const tool = new toolClass(this);
                if (typeof tool.init !== "function")
                    continue;
                let res = tool.init();
                if (res instanceof Promise)
                    await res;
            }
            catch (e) {
                console.error("Can't init core tool:");
                console.error(e);
            }
        }
    }
    initStyles() {
        this.ui.add(".elib", {
            width: "80%",
            display: "flex",
            flexDirection: "row",
            color: "rgb(var(--color))",
            marginBottom: "100px",
            marginTop: "15px",
            gap: "5px",
            position: "relative",
        });
        this.ui.add(".elib-content", {
            display: "flex",
            alignItems: "end",
            flexDirection: "column",
            width: "100%",
        });
        this.ui.add(".elib-blocks", {
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
        });
        this.ui.add(".elib-hide", {
            display: "none !important",
        });
        this.ui.add(".elib-optionBtn", {
            all: "unset",
            width: "100%",
            height: "25px",
            borderRadius: "5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "5px",
            gap: "10px",
            opacity: "1",
            transition: "opacity 0.5s, background-color 0.4s, transform 0.2s",
        });
        this.ui.add(".elib-optionBtn:active", {
            transform: "scale(0.9)"
        });
        this.ui.add(".elib-optionBtn svg", {
            width: "20px",
            height: "20px",
            fill: "rgb(var(--color))",
        });
        this.ui.add(".elib-optionBtn span", {
            color: "rgb(var(--color))",
            fontSize: "90%",
        });
        this.ui.add(".elib-optionBtn:hover", {
            backgroundColor: "rgba(var(--component), 0.4)",
        });
        this.ui.add(".elib-optionInfo", {
            width: "100%",
            color: "rgb(var(--placeholder))",
            fontSize: "80%",
            paddingLeft: "5px",
        });
        this.ui.add(".elib-notFoundMode", {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "rgb(var(--color-nd))",
            padding: "15px",
        });
        this.ui.add(".elib-notFoundMode > span", {
            fontSize: "90%",
            display: "flex",
            whiteSpace: "wrap",
            color: "rgb(var(--color))",
            margin: "5px",
        });
        this.ui.add(".elib-focusedSearchBtn", {
            border: "1px solid rgb(var(--color))",
        });
        this.ui.add(".elib-searchType", {
            backgroundColor: "rgb(var(--block-nd))",
            borderRadius: "5px",
            maxWidth: "200px",
            width: "auto",
            padding: "5px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            overflowY: "hidden",
            boxSizing: "border-box",
            boxShadow: "0 2px 4px rgba(var(--black), 0.1)",
        });
        this.ui.add(".elib-searchType::-webkit-scrollbar", {
            display: "none",
        });
        this.ui.add(".elib-newBlockMenu", {
            position: "absolute",
            width: "auto",
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(var(--bg-nd), 0.7)",
            height: "300px",
            maxHeight: "400px",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: "2",
            opacity: "0",
            overflowY: "auto",
            boxShadow: `0px 10px 20px rgba(0, 0, 0, 0.19), 
                0px 6px 6px rgba(0, 0, 0, 0.23)`,
            transform: "scale(0.9)",
            transition: "opacity 0.2s, transform 0.2s",
            "&::-webkit-scrollbar": {
                display: 'none'
            }
        });
        this.ui.add(".elib-newBlockMenu.show", {
            opacity: "1",
            transform: "scale(1)",
        });
        this.ui.add(".elib-newBlockMenu > div", {
            display: "flex",
            flexDirection: "column",
            borderBottom: "2px solid rgb(var(--block-rd))",
            width: "100%",
            padding: "5px",
            transition: "background-color 0.3s",
        });
        this.ui.add(".elib-newBlockMenu > div:last-child", {
            border: "none",
        });
        this.ui.add(".elib-newBlockMenu > div > span", {
            marginLeft: "5px",
            marginBottom: "5px",
            fontSize: "85%",
            color: "rgb(var(--placeholder))",
            fontWeight: "bold",
        });
        this.ui.add(".elib-optionMenu", {
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            borderRadius: "5px",
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(var(--bg-nd), 0.2)",
            paddingTop: "5px",
            paddingBottom: "5px",
            gap: "0px",
            alignItems: "center",
            width: "250px",
            maxHeight: "400px",
            height: "auto",
            opacity: "0",
            transform: "scale(0.9)",
            zIndex: "2",
            overflowY: "auto",
            boxShadow: `0px 10px 20px rgba(0, 0, 0, 0.19), 
                0px 6px 6px rgba(0, 0, 0, 0.23)`,
            transition: "opacity 0.2s, transform 0.2s",
            "&::-webkit-scrollbar": {
                display: 'none'
            }
        });
        this.ui.add(".elib-optionMenu.show", {
            opacity: "1",
            transform: "scale(1)",
        });
        this.ui.add(".elib-optionMenu-search", {
            all: "unset",
            width: "90%",
            backgroundColor: "rgba(var(--component), 0.5)",
            border: "1px solid rgb(var(--border-nd))",
            padding: "3px",
            borderRadius: "5px",
            overflowX: "auto",
            whiteSpace: "nowrap",
            overflowY: "hidden",
        });
        this.ui.add(".elib-optionMenu-search::-webkit-scrollbar", {
            display: "none",
        });
        this.ui.add(".elib-optionMenu-btnBox", {
            width: "100%",
            height: "auto",
            maxHeight: "400px",
            overflowY: "scroll",
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            padding: "5px",
        });
        this.ui.add(".elib-optionMenu-btnBox::-webkit-scrollbar", {
            display: "none",
        });
        this.ui.add(".elib-optionMenu-btnBox > div", {
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
            padding: "5px",
            borderBottom: "1px solid rgb(var(--block-rd))",
        });
        this.ui.add(".elib-toolBtns-name", {
            display: "inline-block",
            width: "100%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: "90%",
            fontWeight: "bold",
            color: "rgb(var(--color))",
        });
        this.ui.add(".elib-newBlockBtn", {
            all: "unset",
            width: "auto",
            borderRadius: "5px",
            height: "auto",
            padding: "5px",
            display: "flex",
            flexDirection: "row",
            cursor: "pointer",
            transition: "background 0.3s, transform 0.2s",
            gap: "10px",
            marginBottom: "5px",
        });
        this.ui.add(".elib-newBlockBtn:hover", {
            backgroundColor: "rgba(var(--component), 0.4)",
        });
        this.ui.add(".elib-newBlockBtn:active", {
            transform: "scale(0.9)"
        });
        this.ui.add(".elib-newBlockBtn.elib-focused", {
            border: "1px solid rgb(var(--color-nd))"
        });
        this.ui.add(".elib-newBlockBtn div:nth-of-type(1)", {
            width: "45px",
            height: "45px",
            aspectRatio: "1/1",
            borderRadius: "5px",
            backgroundColor: "rgb(var(--white))",
            padding: "10px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            filter: "grayscale(50%)",
        });
        this.ui.add(".elib-newBlockBtn div:nth-of-type(2)", {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            gap: "5px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
        });
        this.ui.add(".elib-toolBtns-desc", {
            display: "inline-block",
            width: "100%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontSize: "85%",
            color: "rgb(var(--color-nd))",
        });
        this.ui.add(".elib-inlineMenu", {
            position: "absolute",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            borderRadius: "8px",
            height: "35px",
            width: "auto",
            overflow: "hidden",
            opacity: "0",
            transform: "scale(0.95)",
            backdropFilter: "blur(5px)",
            backgroundColor: "rgba(var(--bg-nd), 0.7)",
            boxShadow: "0 4px 10px rgba(var(--block), 0.3)",
            transition: "transform 0.15s, opacity 0.15s, left 0.2s, top 0.2s",
        });
        this.ui.add(".elib-inlineMenu.show", {
            transform: "scale(1)",
            opacity: "1",
        });
        this.ui.add(".elib-inlineMenu > .elib-inlineSector:first-child", {
            borderTopLeftRadius: "7px",
            borderBottomLeftRadius: "7px",
            marginLeft: "0px"
        });
        this.ui.add(".elib-inlineMenu > .elib-inlineSector:last-child", {
            borderTopRightRadius: "7px",
            borderBottomRightRadius: "7px",
            marginRight: "0px",
        });
        this.ui.add(".elib-inlineSector", {
            width: "auto",
            height: "100%",
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            margin: "0px 4px",
        });
        this.ui.add(".elib-inlineDelmiter", {
            width: "1px",
            backgroundColor: "rgb(var(--border))",
            height: "100%",
        });
        this.ui.add(".elib-inlineBtn", {
            height: "100%",
            minWidth: "30px",
            display: "flex",
            alignItems: "center",
            color: "rgb(var(--color))",
            justifyContent: "center",
            padding: "5px 0px",
            cursor: "pointer",
            transition: "background-color 0.15s",
        });
        this.ui.add(".elib-inlineBtn.active", {
            backgroundColor: "rgba(var(--component), 0.5)",
        });
        this.ui.add(".elib-inlineBtn-iconBox", {
            height: "20px",
            width: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "svg": {
                width: "13px",
                height: "13px",
                aspectRatio: "1/1",
                fill: "rgb(var(--color))",
            }
        });
        this.ui.add(".elib-inlineBtn-textBox", {
            width: "auto",
            height: "100%",
            display: "flex",
            alignItems: "center",
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            maxWidth: "100px",
            marginLeft: "2px",
            "span": {
                display: 'inline-block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: "90%",
            }
        });
        this.ui.add(".elib-block-content", {
            width: "100%",
            display: "flex",
        });
        this.ui.add(".elib-block-inner", {
            width: "100%",
            color: "inherit",
            fill: "inherit",
        });
        this.ui.add(".elib-block", {
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            width: "100%",
        });
        this.ui.add(".elib-fakeRange", {
            backgroundColor: "rgba(var(--primary), 0.6)",
            color: "white",
            borderRadius: "1px",
        });
        this.ui.add(".elib-input", {
            all: "unset",
            width: '100%',
            display: "block",
            wordWrap: "break-word",
            whiteSpace: "pre-wrap",
        });
        this.ui.add(".elib-input-scroll", {
            overflow: "hidden",
            overflowX: "auto",
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            "&::-webkit-scrollbar": {
                display: 'none',
            }
        });
        this.ui.add(".elib-placeholder:empty:not([data-elib-has-content])::before", {
            content: "attr(data-placeholder)",
            pointerEvents: "none",
            color: "rgb(var(--placeholder))",
        });
        this.ui.add(".elib-placeholder-onFocus:focus:empty:not([data-elib-has-content])::before", {
            content: "attr(data-placeholder)",
            pointerEvents: "none",
            color: "rgb(var(--placeholder))",
        });
        this.ui.add(".elib-placeholder-notFocus:empty:not([data-elib-has-content]):not(:focus)::before", {
            content: "attr(data-placeholder)",
            pointerEvents: "none",
            color: "rgb(var(--placeholder))",
        });
    }
    initComponents() {
        this.comps.input = (config = {}) => {
            const conf = { ...{
                    trimInp: true,
                    placeholder: "",
                    placeholderType: "",
                    class: "elib-input",
                    scrollAble: false,
                    text: "",
                    html: ""
                }, ...config };
            const inp = document.createElement("div");
            inp.setAttribute("contenteditable", "true");
            if (conf.trimInp) {
                inp.setAttribute("data-elib-trimInp", "");
            }
            if (conf.placeholder) {
                inp.setAttribute('data-placeholder', conf.placeholder);
            }
            if (conf.class) {
                inp.className = conf.class;
            }
            let className = "elib-placeholder";
            if (conf.placeholderType) {
                className += "-" + conf.placeholderType;
            }
            inp.classList.add(className);
            if (conf.scrollAble) {
                inp.classList.add("elib-input-scroll");
            }
            if (conf.text) {
                inp.textContent = conf.text;
            }
            if (conf.html) {
                inp.innerHTML = conf.html;
            }
            return inp;
        };
    }
    initProxyBlocks() {
        const getBlocks = (cont) => {
            const children = Array.from(cont.children);
            return children.filter((child) => {
                const rect = child.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight &&
                    rect.bottom > 0 &&
                    rect.left < window.innerWidth &&
                    rect.right > 0;
                return isVisible;
            });
        };
        const findBlock = (e, workspace = this.blocksBox) => {
            const blocks = getBlocks(workspace);
            const top = e.clientY;
            for (const block of blocks) {
                const rect = block.getBoundingClientRect();
                if (rect.top <= top && rect.top + rect.height >= top) {
                    let workspaces = Array.from(block.querySelectorAll(".elib-blocks"));
                    for (const workspace of workspaces) {
                        let res = findBlock(e, workspace);
                        if (res)
                            return res;
                    }
                    this.focusBlock({
                        block: block,
                        event: e,
                        type: "mousemove",
                    });
                    return true;
                }
            }
            return false;
        };
        document.addEventListener('mousemove', findBlock);
        this.on("destroy", () => {
            document.removeEventListener("mousemove", findBlock);
        });
        this.blocksBox.addEventListener("focusin", (e) => {
            const target = e.target;
            if (!target)
                return;
            const block = target.closest(".elib-block");
            if (!block)
                return;
            this.focusBlock({
                block: block,
                type: "focus",
                event: e,
            });
        });
        this.blocksBox.addEventListener('input', (e) => {
            const target = e.target;
            if (!target)
                return;
            const block = target.closest(".elib-block");
            if (!block)
                return;
            this.focusBlock({
                block: block,
                type: "input",
                event: e,
            });
        });
        this.blocksBox.addEventListener('click', (e) => {
            const target = e.target;
            if (!target)
                return;
            const block = target.closest(".elib-block");
            if (!block)
                return;
            this.focusBlock({
                block: block,
                type: "click",
                event: e,
            });
        });
    }
    async initMenuBtns() {
        const plusBtn = document.createElement("div");
        const opBtn = document.createElement("div");
        const box = document.createElement("div");
        this.ui.add(".elib-btnsBox", {
            display: "flex",
            height: "auto",
            alignItems: "center",
            justifyContent: "center",
            position: "absolute",
            zIndex: "2",
            opacity: "1",
            transition: "opacity 0.1s, top 0.1s",
        });
        this.ui.add("@media screen and (max-width: 768px)", {
            ".elib-btnsBox": {
                borderRadius: "5px",
                backgroundColor: "rgba(var(--component), 0.9)",
            },
            ".elib .elib-btnsBox div svg": {
                width: "22px",
                height: "22px",
            }
        });
        this.ui.add(".elib .elib-block:hover ~ .elib-btnsBox", {
            opacity: "1",
        });
        this.ui.add(".elib-btnsBox.hide", {
            opacity: "0",
        });
        this.ui.add(".elib-btnsBox div", {
            all: "unset",
            display: "flex",
            padding: "5px",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: "3px",
        });
        this.ui.add(".elib-btnsBox div:hover", {
            backgroundColor: "rgb(var(--block-nd))",
        });
        this.ui.add(".elib-btnsBox div svg", {
            fill: "rgb(var(--placeholder))",
            width: "15px",
            height: "15px",
        });
        this.ui.add(".elib-btnsBox div:nth-of-type(2)", {
            cursor: "grab",
        });
        this.ui.add(".elib-btnsBox div:nth-of-type(2):active", {
            cursor: "grabbing",
        });
        box.classList.add("elib-btnsBox");
        this.btnsBox = box;
        this.cont.addEventListener('keyup', (e) => {
            // сделай так что бы при нажатии на клавишу вызвалось меню
        });
        box.appendChild(plusBtn);
        box.appendChild(opBtn);
        plusBtn.innerHTML = '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><path d="M480,224H288V32c0-17.673-14.327-32-32-32s-32,14.327-32,32v192H32c-17.673,0-32,14.327-32,32s14.327,32,32,32h192v192   c0,17.673,14.327,32,32,32s32-14.327,32-32V288h192c17.673,0,32-14.327,32-32S497.673,224,480,224z"/></svg>';
        opBtn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m17,6c-1.654,0-3-1.346-3-3s1.346-3,3-3,3,1.346,3,3-1.346,3-3,3Zm0,18c-1.654,0-3-1.346-3-3s1.346-3,3-3,3,1.346,3,3-1.346,3-3,3Zm0-9c-1.654,0-3-1.346-3-3s1.346-3,3-3,3,1.346,3,3-1.346,3-3,3ZM7,6c-1.654,0-3-1.346-3-3S5.346,0,7,0s3,1.346,3,3-1.346,3-3,3Zm0,18c-1.654,0-3-1.346-3-3s1.346-3,3-3,3,1.346,3,3-1.346,3-3,3Zm0-9c-1.654,0-3-1.346-3-3s1.346-3,3-3,3,1.346,3,3-1.346,3-3,3Z"/></svg>';
        let lastBlock = null;
        box.addEventListener("touchstart", () => {
            if (window.innerWidth < 768)
                lastBlock = this.state.focusedBlock;
        });
        plusBtn.addEventListener("click", () => {
            if (lastBlock) {
                this.focusBlock(lastBlock.block);
                lastBlock = null;
            }
            if (this.cont.querySelector('.elib-newBlockMenu'))
                return;
            this.newBlockMenu();
        });
        let flag = false;
        let isHeld = false;
        let timer;
        opBtn.addEventListener('mousedown', (event) => {
            flag = true;
            isHeld = false;
            timer = setTimeout(() => {
                isHeld = true;
                let block = this.state.focusedBlock?.block;
                // перемещай блок
            }, 500);
        });
        opBtn.addEventListener('mouseup', () => {
            if (!flag)
                return;
            flag = false;
            clearTimeout(timer);
            if (!isHeld) {
                if (lastBlock) {
                    this.focusBlock(lastBlock.block);
                    lastBlock = null;
                }
                if (!this.cont.querySelector('.elib-optionMenu')) {
                    this.optionMenu();
                }
            }
            else {
            }
        });
        this.cont.appendChild(box);
        const place = async (block) => {
            let rect = this.getPosition(block);
            box.style.top = rect.top - 3 + 'px';
            box.style.left = rect.left - 50 - 5 + "px";
            if (window.innerWidth < 768) {
                box.style.top = rect.top + rect.height + 5 + "px";
                box.style.left = rect.left + "px";
            }
        };
        const hideBtns = () => {
            box.classList.add('hide');
        };
        const showBtns = () => {
            box.classList.remove('hide');
        };
        box.addEventListener('click', hideBtns);
        box.addEventListener('mouseenter', showBtns);
        this.op.showBtnsOnLeave.addEventListener('mouseleave', () => {
            hideBtns();
        });
        this.on("focusBlocks", (e) => {
            if (this.emit("replaceBtns", {
                data: e.data,
            }).prevented)
                return;
            let type = e.data.type;
            if (type === "mousemove") {
                showBtns();
            }
            else if (type === "focus") {
                hideBtns();
            }
            else if (type === "click") {
                showBtns();
            }
            else if (type === "input") {
                hideBtns();
            }
            place(e.data.block);
        });
        this.cont.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && e.ctrlKey && !this.cont.querySelector(".elib-newBlocKMenu")) {
                e.preventDefault();
                this.newBlockMenu();
                return;
            }
            if (e.key === "/" && e.ctrlKey && !this.cont.querySelector('.elib-optionMenu')) {
                e.preventDefault();
                this.optionMenu();
                return;
            }
        });
    }
    initInline() {
        let isSelecting = false;
        const proxyStart = () => {
            isSelecting = true;
        };
        const proxyFinish = () => {
            isSelecting = false;
            proxy();
        };
        const proxy = () => {
            if (isSelecting)
                return;
            setTimeout(() => this.inlineMenu(), 200);
        };
        document.addEventListener("selectstart", proxyStart);
        document.addEventListener("mouseup", proxyFinish);
        document.addEventListener("touchend", proxyFinish);
        document.addEventListener('selectionchange', proxy);
        this.on("destroy", () => {
            document.removeEventListener("selectionchange", proxy);
            document.removeEventListener("selectstart", proxyStart);
            document.removeEventListener("mouseup", proxyFinish);
        });
    }
    initPlugins() {
        const methods = ['render', 'config'];
        const proceed = (toolName, obj, type) => {
            let value = obj[toolName];
            let config = {};
            let tool;
            if (typeof value === "object") {
                config = value;
                tool = value.class;
            }
            else if (typeof value === "function") {
                tool = value;
            }
            else {
                console.error(toolName + " must be function or object with property 'class' with typeof value function. I hope u got it.");
                return false;
            }
            let editorTool;
            try {
                editorTool = new tool(this, config);
            }
            catch (e) {
                console.error("Cant create new editor tool:", e);
            }
            if (!editorTool)
                return false;
            for (let method of methods) {
                if (!(method in editorTool)) {
                    console.error("Plugin: " + toolName + " has no method or property: " + method);
                    delete obj[tool];
                    return false;
                }
            }
            if (!type)
                return editorTool;
            this.tools[type][toolName] = editorTool;
            return this.tools[type][toolName];
        };
        for (const className in this.op.blockTools) {
            const tool = proceed(className, this.op.blockTools, "block");
            if (!tool)
                continue;
            const conf = tool.config;
            const category = conf.category || 'Other';
            const name = conf.name;
            const icon = conf.icon;
            const desc = conf.description;
            let btn = document.createElement('button');
            const iconBox = document.createElement('div');
            const textBox = document.createElement('div');
            const nameField = document.createElement('span');
            const descBox = document.createElement('span');
            nameField.classList.add('elib-toolBtns-name');
            descBox.classList.add('elib-toolBtns-desc');
            btn.classList.add('elib-newBlockBtn');
            btn.setAttribute('data-tool', className);
            btn.setAttribute('data-elib-description', desc || "");
            iconBox.innerHTML = icon;
            nameField.innerHTML = name;
            descBox.innerHTML = desc || name;
            textBox.appendChild(nameField);
            textBox.appendChild(descBox);
            btn.appendChild(iconBox);
            btn.appendChild(textBox);
            this.allowed.inline.push(className);
            if (tool.config.isInline === false) {
                this.allowed.inline.pop();
            }
            if (typeof tool.attachBtn === 'function') {
                let newBtn;
                try {
                    newBtn = tool.attachBtn(btn);
                }
                catch (e) {
                    console.error("Can't attach button: ");
                    console.error(e);
                }
                if (newBtn instanceof HTMLElement) {
                    btn = newBtn;
                }
            }
            if (this.btns.block[category]) {
                this.btns.block[category].push(btn);
            }
            else {
                this.btns.block[category] = [btn];
            }
            if (!Array.isArray(conf.options))
                continue;
            this.btns.blockOption[className] = [];
            this.tools.blockOption[className] = {};
            for (const plugins of conf.options) {
                const btns = [];
                for (const pluginName in plugins) {
                    const plugin = proceed(pluginName, plugins);
                    this.tools.blockOption[className][pluginName] = plugin;
                    const conf = plugin.config;
                    const { icon, name, shortCut, desc } = conf;
                    let btn = document.createElement("button");
                    btn.setAttribute("data-tool", className);
                    btn.setAttribute("data-option", pluginName);
                    btn.classList.add("elib-optionBtn");
                    const nameField = document.createElement('span');
                    nameField.innerHTML = name;
                    btn.innerHTML = icon;
                    btn.appendChild(nameField);
                    if (shortCut) {
                        const shortCutField = document.createElement('span');
                        shortCutField.innerHTML = shortCut;
                        btn.appendChild(shortCutField);
                    }
                    btn.setAttribute('data-elib-description', desc);
                    let attrs = conf.allowAttrs;
                    if (attrs) {
                        this.allowed.attrs = this.allowed.attrs.concat(attrs);
                    }
                    let tags = conf.allowNodes;
                    if (tags) {
                        this.allowed.tags = this.allowed.tags.concat(tags);
                    }
                    if (typeof tool.attachBtn === 'function') {
                        let newBtn;
                        try {
                            newBtn = tool.attachBtn(btn);
                        }
                        catch (e) {
                            console.error("Can't attach button: ");
                            console.error(e);
                        }
                        if (newBtn instanceof HTMLElement) {
                            btn = newBtn;
                        }
                    }
                    btns.push(btn);
                }
                if (btns.length)
                    this.btns.blockOption[className].push(btns);
            }
        }
        for (const tools of this.op.optionTools) {
            const btns = [];
            for (let toolName in tools) {
                const tool = proceed(toolName, tools, "option");
                if (!tool)
                    continue;
                const conf = tool.config;
                const icon = conf.icon;
                const name = conf.name;
                const shortCut = conf.shortCut;
                const desc = conf.description;
                let btn = document.createElement('button');
                btn.setAttribute('data-tool', toolName);
                btn.classList.add('elib-optionBtn');
                const nameField = document.createElement('span');
                nameField.innerHTML = name;
                btn.innerHTML = icon;
                btn.appendChild(nameField);
                if (shortCut) {
                    const shortCutField = document.createElement('span');
                    shortCutField.innerHTML = shortCut;
                    btn.appendChild(shortCutField);
                }
                btn.setAttribute('data-elib-description', desc || "");
                let attrs = conf.allowAttrs;
                if (attrs) {
                    this.allowed.attrs = this.allowed.attrs.concat(attrs);
                }
                let tags = conf.allowNodes;
                if (tags) {
                    this.allowed.tags = this.allowed.tags.concat(tags);
                }
                if (typeof tool.attachBtn === 'function') {
                    let newBtn;
                    try {
                        newBtn = tool.attachBtn(btn);
                    }
                    catch (e) {
                        console.error("Can't attach button: ");
                        console.error(e);
                    }
                    if (newBtn instanceof HTMLElement) {
                        btn = newBtn;
                    }
                }
                btns.push(btn);
            }
            if (btns.length)
                this.btns.option.push(btns);
        }
        for (const tools of this.op.inlineTools) {
            const btns = [];
            for (const toolName in tools) {
                const tool = proceed(toolName, tools, 'inline');
                if (!tool)
                    continue;
                const conf = tool.config;
                let { icon, name, description, menuMode, menuModeIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18.71,8.21a1,1,0,0,0-1.42,0l-4.58,4.58a1,1,0,0,1-1.42,0L6.71,8.21a1,1,0,0,0-1.42,0,1,1,0,0,0,0,1.41l4.59,4.59a3,3,0,0,0,4.24,0l4.59-4.59A1,1,0,0,0,18.71,8.21Z"/></svg>', } = conf;
                let btn = document.createElement("div");
                btn.setAttribute("data-tool", toolName);
                btn.classList.add('elib-inlineBtn');
                const iconBox = document.createElement("div");
                iconBox.classList.add("elib-inlineBtn-iconBox");
                iconBox.innerHTML = icon;
                btn.appendChild(iconBox);
                if (name) {
                    const textBox = document.createElement("div");
                    textBox.classList.add("elib-inlineBtn-textBox");
                    const span = document.createElement("span");
                    span.innerHTML = name;
                    textBox.appendChild(span);
                    btn.appendChild(textBox);
                }
                if (menuMode) {
                    const iconBox = document.createElement("div");
                    iconBox.classList.add("elib-inlineBtn-iconBox");
                    iconBox.innerHTML = menuModeIcon;
                    btn.appendChild(iconBox);
                }
                btn.setAttribute('data-elib-description', description || "");
                let attrs = conf.allowAttrs;
                if (attrs) {
                    this.allowed.attrs = this.allowed.attrs.concat(attrs);
                }
                let nodes = conf.allowNodes;
                if (nodes) {
                    this.allowed.tags = this.allowed.tags.concat(nodes);
                }
                if (typeof tool.attachBtn === 'function') {
                    let newBtn;
                    try {
                        newBtn = tool.attachBtn(btn);
                    }
                    catch (e) {
                        console.error("Can't attach button: ");
                        console.error(e);
                    }
                    if (newBtn instanceof HTMLElement) {
                        btn = newBtn;
                    }
                }
                btns.push(btn);
            }
            if (btns.length)
                this.btns.inline.push(btns);
        }
    }
    initData(data, box = this.blocksBox) {
        const { blocks } = data;
        for (let key in blocks) {
            let block = blocks[key];
            let toolName = block.tool;
            let data = block.data;
            let conf = block.config;
            let option = block.option;
            const tool = this.tools.block[toolName];
            if (!tool)
                continue;
            let hasSetData = typeof tool.setData === 'function';
            try {
                tool.initDataMode = true;
                if (hasSetData)
                    tool.setData(data);
                block = this.newBlock({
                    tool: toolName,
                    toFocus: false,
                    id: block.id,
                });
                if (hasSetData)
                    tool.setData(null);
                tool.initDataMode = false;
            }
            catch (e) {
                console.error("Can't create new block trow init data: ");
                console.error(e);
            }
            for (let key in conf) {
                if (typeof this.tools.blockOption[toolName] !== "object")
                    break;
                let option = this.tools.blockOption[toolName][key];
                if (!option)
                    continue;
                let render = option.render;
                if (!(typeof render === "function"))
                    continue;
                let data;
                try {
                    data = render(block, conf[key]);
                }
                catch (e) {
                    console.error("Can't render option on block while init data: ");
                    console.error(e);
                    continue;
                }
                if (data === undefined)
                    data = true;
                this.blockMeta(block, (d) => {
                    d.config[key] = data;
                });
            }
            for (let key in option) {
                const tool = this.tools.option[key];
                if (!tool)
                    continue;
                let data;
                try {
                    data = tool.render(block, option[key]);
                }
                catch (e) {
                    console.error("Cant't render option while init data: ");
                    console.error(e);
                    continue;
                }
                if (data === undefined)
                    data = true;
                this.blockMeta(block, (d) => d.option[key] = data);
            }
            box.appendChild(block);
        }
    }
    initDesign() {
        this.cont.addEventListener("input", (e) => {
            const inp = e.target;
            if ((inp.innerHTML === "<br>" || inp.innerHTML === '\n') && inp.hasAttribute("data-elib-trimInp")) {
                inp.innerHTML = "";
            }
            if (inp.classList.contains("elib-placeholder-onFocus") || inp.classList.contains("elib-placeholder-notFocus") || inp.classList.contains("elib-placeholder")) {
                if (inp.innerText === "") {
                    inp.removeAttribute("data-elib-has-content");
                }
                else {
                    inp.setAttribute("data-elib-has-content", "");
                }
            }
        });
        this.cont.addEventListener("mouseover", (e) => {
            const target = e.target;
            const node = target.closest("[data-elib-description]");
            if (!node)
                return;
            const content = node.getAttribute("[data-elib-description");
            if (!content)
                return;
            const menu = document.createElement("div");
            menu.classList.add("elib-descMenu");
        });
        this.cont.addEventListener("mouseout", (e) => {
            const node = e.target.closest("[data-elib-description]");
            if (!node)
                return;
        });
    }
    initOther() {
        this.blocksBox.addEventListener('input', (e) => {
            const inp = e.target;
            const block = inp.closest('.elib-block');
            if (!block)
                return;
            let tool = block.getAttribute('data-tool');
            if (this.allowed.inline.includes(tool) && inp.getAttribute("data-inline") !== "false") {
                this.inline?.cleanHtml(inp);
            }
        });
        if (this.op.autofocus) {
            let blocks = this.cont.querySelectorAll('.elib-block');
            this.focusBlock(blocks[0]);
        }
        this.observer = new MutationObserver((...args) => {
            this.emit("change", {}, ...args);
        });
        const observerConf = this.op.observerConf || {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true,
        };
        this.observer.observe(this.content, observerConf);
    }
    workspace(addBlock = true) {
        const box = document.createElement("div");
        box.classList.add("elib-blocks");
        if (addBlock) {
            this.newBlock({
                box: box
            });
        }
        return box;
    }
    newBlockMenu(block) {
        if (!block) {
            if (this.state.focusedBlock &&
                this.state.focusedBlock.block.getAttribute("data-tool") === "paragraph" &&
                this.state.focusedBlock.block.querySelector("[contenteditable]")?.textContent === "") {
                block = this.state.focusedBlock.block;
            }
            else {
                let box = this.state.focusedBlock?.block.closest(".elib-blocks");
                block = this.newBlock({
                    box: box
                });
            }
        }
        if (!block)
            return;
        const rect = this.getPosition(block);
        const unHide = (menu) => {
            const btns = menu.querySelectorAll(".elib-newBlockBtn");
            const sectors = menu.querySelectorAll(".elib-newBlockMenu > div");
            let span = menu.querySelector(':scope > span');
            if (span)
                span.remove();
            menu.classList.remove("elib-notFoundMode");
            for (const btn of btns) {
                btn.classList.remove("elib-hide");
                btn.classList.remove("elib-focused");
            }
            for (const sector of sectors) {
                sector.classList.remove("elib-hide");
            }
        };
        const search = (search, text) => {
            search = search.toLowerCase();
            text = text.toLowerCase();
            for (const char of search) {
                if (!text.includes(char)) {
                    return false;
                }
            }
            return true;
        };
        let focusedBtn = null;
        const inpTrack = (e) => {
            const target = e.target;
            let value = target.textContent;
            const menu = this.cont.querySelector(".elib-newBlockMenu");
            if (!menu)
                return;
            if (!value) {
                target.innerHTML = "";
                unHide(menu);
                return;
            }
            let emptyMenu = true;
            for (const sector of menu.children) {
                let empty = true;
                const btns = sector.querySelectorAll(".elib-newBlockBtn");
                for (const btn of btns) {
                    btn.classList.remove("elib-focused");
                    let name = btn.querySelector('.elib-toolBtns-name').textContent || "";
                    if (search(value, name)) {
                        btn.classList.remove("elib-hide");
                        empty = false;
                    }
                    else {
                        btn.classList.add("elib-hide");
                    }
                }
                if (empty) {
                    sector.classList.add("elib-hide");
                }
                else {
                    sector.classList.remove("elib-hide");
                    emptyMenu = false;
                }
            }
            if (emptyMenu) {
                focusedBtn = null;
                let span = document.createElement('span');
                span.textContent = 'К сожалению, такого инструмента нет :(';
                menu.classList.add('elib-notFoundMode');
                menu.appendChild(span);
            }
            else {
                let span = menu.querySelector(":scope > span");
                if (span)
                    span.remove();
                menu.classList.remove('elib-notFoundMode');
                let btns = menu.querySelectorAll(".elib-newBlockBtn");
                for (const btn of btns) {
                    if (window.getComputedStyle(btn).display !== 'none') {
                        focusedBtn = btn;
                        break;
                    }
                }
                focusedBtn?.classList.add("elib-focused");
            }
        };
        const focusTo = (key) => {
            let btns = Array.from(menu.querySelectorAll(".elib-newBlockBtn")).filter((btn) => {
                return !btn.classList.contains("elib-hide");
            });
            if (!btns.length)
                return;
            let focused = btns.indexOf(focusedBtn || btns[0]);
            let nextInx = 0;
            if (key === "ArrowUp") {
                nextInx = focused - 1;
                if (nextInx < 0) {
                    nextInx = btns.length + nextInx;
                }
            }
            else if (key === "ArrowDown") {
                nextInx = focused + 1;
                if (btns.length === nextInx) {
                    nextInx = 0;
                }
            }
            let next = btns[nextInx];
            if (focusedBtn) {
                focusedBtn.classList.remove("elib-focused");
            }
            focusedBtn = next;
            focusedBtn.classList.add("elib-focused");
            focusedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        const offNewblock = this.on('newBlockOnEnter', (e) => {
            e.prevent();
        }, { once: true });
        const offDeleting = this.on("delBlockOnBackspace", (e) => {
            e.prevent();
        });
        const keyTrack = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                unHide(menu);
                if (focusedBtn instanceof HTMLElement) {
                    focusedBtn.click();
                }
                proceed(false);
                this.focusBlock(block);
                block.click();
            }
            else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                focusTo(e.key);
            }
            else if (e.key === "Backspace" && e.target.textContent === "") {
                e.preventDefault();
            }
        };
        let inp;
        let oldPlaceholder;
        let oldDataInline;
        const proceed = (block, clickOnTool = false) => {
            if (block instanceof HTMLElement) {
                inp = block.querySelector("[contenteditable]");
                if (!inp)
                    return;
                inp.classList.add('elib-searchType');
                oldPlaceholder = inp.getAttribute("data-placeholder") || "";
                inp.setAttribute("data-placeholder", "Поиск инструментов");
                if (inp.getAttribute("data-inline")) {
                    oldDataInline = inp.getAttribute("data-inline") || "";
                }
                inp.setAttribute("data-inline", "false");
                inp.addEventListener("input", inpTrack);
                inp.addEventListener("keydown", keyTrack);
                inp.innerHTML = "";
                if (typeof inp.focus === "function")
                    inp.focus();
            }
            else {
                inp.removeEventListener("input", inpTrack);
                inp.removeEventListener("keydown", keyTrack);
                inp.setAttribute("data-placeholder", oldPlaceholder);
                inp.innerHTML = "";
                inp.classList.remove("elib-searchType");
                if (oldDataInline) {
                    inp.setAttribute("data-inline", oldDataInline);
                }
                else {
                    inp.removeAttribute("data-inline");
                }
                if (!clickOnTool && inp === document.activeElement)
                    inp.focus();
            }
        };
        proceed(block);
        const menu = document.createElement("div");
        menu.classList.add("elib-newBlockMenu");
        menu.classList.add("shadow");
        menu.classList.add("scrollable");
        menu.addEventListener('click', (event) => {
            const target = event.target;
            let btn = target.closest('.elib-newBlockBtn');
            if (!btn)
                return;
            let tool = btn.getAttribute('data-tool');
            let callback = this.tools.block[tool].config.newBlock;
            if (typeof callback === "function") {
                callback(tool, true);
                return;
            }
            if (this.state.focusedBlock)
                this.deleteBlock(this.state.focusedBlock.block);
            const box = this.state.focusedBlock?.block.closest(".elib-blocks");
            this.newBlock({
                tool: tool,
                toFocus: true,
                box: box
            });
        });
        for (const category in this.btns.block) {
            const btnsBox = document.createElement("div");
            const span = document.createElement("span");
            span.innerHTML = category;
            btnsBox.appendChild(span);
            for (const btn of this.btns.block[category]) {
                btnsBox.appendChild(btn);
            }
            menu.appendChild(btnsBox);
        }
        menu.style.top = rect.top + rect.height + 15 + "px";
        menu.style.left = rect.left - 5 + "px";
        // ЕРМАК РЕАЛИЗУЙ СЛЕДУЮЩИЕ НАСТРОЙКИ!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        let offReplace = this.on("replaceBtns", (e) => {
            e.prevent();
        }, { last: true });
        let offFocus = this.on('focusBlocks', (e) => {
            e.prevent();
        }, { first: true });
        setTimeout(() => {
            document.addEventListener("click", (e) => {
                offReplace();
                offFocus();
                offDeleting();
                offNewblock();
                menu.classList.remove("show");
                unHide(menu);
                setTimeout(() => {
                    menu.remove();
                }, 200);
                let clickOnTool = false;
                const target = e.target;
                if (target.closest(".elib-newBlockMenu")) {
                    clickOnTool = true;
                }
                proceed(false, clickOnTool);
            }, { once: true, capture: true });
        });
        this.cont.appendChild(menu);
        setTimeout(() => {
            menu.classList.add("show");
        });
        return true;
    }
    async optionMenu() {
        if (!this.state.focusedBlock)
            return false;
        const toolName = this.state.focusedBlock.block.getAttribute("data-tool");
        const optionBtn = this.btnsBox.children[1];
        const rect = this.getPosition(optionBtn);
        const menu = document.createElement("div");
        menu.classList.add("elib-optionMenu");
        menu.classList.add("shadow");
        menu.addEventListener("click", (e) => {
            const target = e.target;
            const btn = target.closest(".elib-optionBtn");
            if (!btn)
                return;
            let tool = btn.getAttribute("data-tool");
            let option = this.tools.option[tool];
            let optionName = btn.getAttribute("data-option");
            if (optionName) {
                option = this.tools.blockOption[tool][optionName];
            }
            if (option && typeof option.render === "function") {
                try {
                    option.render();
                }
                catch (e) {
                    console.error("Failed to render option on block: ");
                    console.error(e);
                }
            }
        });
        const options = [];
        if (this.btns.blockOption[toolName]) {
            for (const btns of this.btns.blockOption[toolName]) {
                const resBtns = [];
                for (let btn of btns) {
                    const tool = this.tools.blockOption[toolName][btn.getAttribute("data-option")];
                    if (typeof tool.onReady === "function") {
                        try {
                            const newBtn = tool.onReady(btn);
                            if (newBtn instanceof HTMLElement) {
                                btn = newBtn;
                            }
                            else if (newBtn === false) {
                                continue;
                            }
                        }
                        catch (e) {
                            console.error("Can't prepare option: ");
                            console.error(e);
                            continue;
                        }
                    }
                    resBtns.push(btn);
                }
                if (resBtns.length)
                    options.push(resBtns);
            }
        }
        for (const btns of this.btns.option) {
            let resBtns = [];
            for (let btn of btns) {
                const toolName = btn.getAttribute("data-tool");
                const tool = this.tools.option[toolName];
                if (typeof tool.onReady === "function") {
                    let res = await tool.onReady(btn);
                    if (res instanceof HTMLElement) {
                        btn = res;
                    }
                    else if (res === false) {
                        continue;
                    }
                }
                resBtns.push(btn);
            }
            if (resBtns.length)
                options.push(resBtns);
        }
        const searchBar = document.createElement("div");
        const search = (search, text) => {
            search = search.toLowerCase();
            text = text.toLowerCase();
            for (const char of search) {
                if (!text.includes(char)) {
                    return false;
                }
            }
            return true;
        };
        const unHide = (menu) => {
            const btns = menu.querySelectorAll(".elib-optionBtn");
            let btnBox = menu.querySelector('.elib-optionMenu-btnBox');
            const sectors = menu.querySelectorAll(".elib-optionMenu-btnBox > div");
            let span = menu.querySelector('.elib-optionMenu-btnBox > span');
            if (span)
                span.remove();
            btnBox.classList.remove("elib-notFoundMode");
            for (const btn of btns) {
                btn.classList.remove("elib-hide");
                btn.classList.remove("elib-focusedSearchBtn");
            }
            for (const sector of sectors) {
                sector.classList.remove("elib-hide");
            }
        };
        let focusedBtn = null;
        searchBar.addEventListener('input', (e) => {
            let value = searchBar.textContent;
            if (!value) {
                const target = e.target;
                target.innerHTML = "";
                unHide(menu);
                return;
            }
            let emptyMenu = true;
            let boxes = menu.querySelectorAll('.elib-optionMenu-btnBox > div');
            for (const sector of boxes) {
                let empty = true;
                const btns = sector.querySelectorAll(".elib-optionBtn");
                for (const btn of btns) {
                    btn.classList.remove("elib-focusedSearchBtn");
                    let name = btn.querySelector('span')?.textContent;
                    if (search(value, name)) {
                        btn.classList.remove("elib-hide");
                        empty = false;
                    }
                    else {
                        btn.classList.add("elib-hide");
                    }
                }
                if (empty) {
                    sector.classList.add("elib-hide");
                }
                else {
                    sector.classList.remove("elib-hide");
                    emptyMenu = false;
                }
            }
            let btnBox = menu.querySelector('.elib-optionMenu-btnBox');
            if (emptyMenu) {
                focusedBtn = null;
                if (btnBox.querySelector(':scope > span')) {
                    return;
                }
                let span = document.createElement('span');
                span.textContent = 'Такой опции нет';
                btnBox.classList.add('elib-notFoundMode');
                btnBox.appendChild(span);
            }
            else {
                let span = btnBox.querySelector(":scope > span");
                if (span)
                    span.remove();
                btnBox.classList.remove('elib-notFoundMode');
                let btns = btnBox.querySelectorAll(".elib-optionBtn");
                for (let btn of btns) {
                    if (window.getComputedStyle(btn).display !== 'none') {
                        focusedBtn = btn;
                        break;
                    }
                }
                focusedBtn?.classList.add("elib-focusedSearchBtn");
            }
        });
        const focusTo = (key) => {
            let btns = Array.from(menu.querySelectorAll(".elib-optionBtn")).filter((btn) => {
                return !btn.classList.contains("elib-hide");
            });
            if (!btns.length)
                return;
            let focused = btns.indexOf(focusedBtn || btns[0]);
            let nextInx = 0;
            if (key === "ArrowUp") {
                nextInx = focused - 1;
                if (nextInx < 0) {
                    nextInx = btns.length + nextInx;
                }
            }
            else if (key === "ArrowDown") {
                nextInx = focused + 1;
                if (btns.length === nextInx) {
                    nextInx = 0;
                }
            }
            let next = btns[nextInx];
            if (focusedBtn) {
                focusedBtn.classList.remove("elib-focusedSearchBtn");
            }
            focusedBtn = next;
            focusedBtn.classList.add("elib-focusedSearchBtn");
            focusedBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        searchBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedBtn) {
                    focusedBtn.click();
                }
                menu.click();
            }
            else if (e.key === 'Backspace' && searchBar.textContent === '') {
                e.preventDefault();
            }
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                focusTo(e.key);
            }
        });
        searchBar.classList.add("elib-optionMenu-search");
        searchBar.classList.add("placeholder");
        searchBar.setAttribute("contenteditable", "true");
        searchBar.setAttribute("data-placeholder", "Поиск");
        menu.appendChild(searchBar);
        const optionBox = document.createElement("div");
        optionBox.classList.add("elib-optionMenu-btnBox");
        for (const btns of options) {
            const box = document.createElement("div");
            for (const btn of btns) {
                box.appendChild(btn);
            }
            optionBox.appendChild(box);
        }
        menu.appendChild(optionBox);
        const infoBox = document.createElement("div");
        infoBox.classList.add("elib-optionInfo");
        if (typeof this.op.optionInfo === 'function') {
            let res;
            try {
                res = this.op.optionInfo();
            }
            catch (e) {
                console.error("Can't get option info:");
                console.error(e);
            }
            if (!res) {
                infoBox.innerHTML = '<i>StackEditor</i>';
            }
            else {
                infoBox.innerHTML = res;
            }
        }
        else {
            infoBox.innerHTML = '<i>StackEditor</i>';
        }
        menu.appendChild(infoBox);
        menu.style.top = rect.top + "px";
        menu.style.left = rect.left + 30 + "px";
        let offReplace = this.on("replaceBtns", (e) => {
            e.prevent();
        });
        let offFocus = this.on('focusBlocks', (e) => {
            e.prevent();
        });
        setTimeout(() => {
            document.addEventListener('click', () => {
                offReplace();
                offFocus();
                menu.classList.remove('show');
                unHide(menu);
                setTimeout(() => {
                    menu.remove();
                    if (this.state.focusedBlock) {
                        const inp = this.CET(this.state.focusedBlock.block);
                        if (inp)
                            this.focus(inp);
                    }
                }, 200);
            }, { once: true, capture: true });
        });
        this.cont.appendChild(menu);
        setTimeout(() => {
            searchBar.focus();
            menu.classList.add("show");
        });
        return true;
    }
    openInline() {
        let menu = this.cont.querySelector(".elib-inlineMenu");
        if (menu)
            return menu;
        menu = document.createElement('div');
        menu.classList.add('elib-inlineMenu');
        const saveRange = (event) => {
            if (!event.cancelable)
                return;
            event.preventDefault();
        };
        menu.addEventListener("mousedown", saveRange);
        menu.addEventListener("touchstart", saveRange);
        menu.addEventListener("click", (e) => {
            let select = window.getSelection();
            const target = e.target;
            const btn = target.closest(".elib-inlineBtn");
            if (!btn)
                return;
            if (select.toString().length === 0)
                return;
            let toolName = btn.getAttribute("data-tool");
            let tool = this.tools.inline[toolName];
            if (typeof tool.render === 'function') {
                try {
                    tool.render();
                }
                catch (e) {
                    console.error("Can't render inline tool: ");
                    console.error(e);
                }
            }
        });
        this.cont.appendChild(menu);
        setTimeout(() => {
            menu.classList.add("show");
        }, 10);
        return menu;
    }
    closeInline() {
        const menu = document.querySelector(".elib-inlineMenu");
        if (!menu)
            return;
        if (!menu.classList.contains("show"))
            return;
        if (this.emit("closeInline", {
            menu: menu,
        }).prevented)
            return;
        const btns = menu.querySelectorAll(".elib-inlineBtn");
        for (const btn of btns) {
            let tool = btn.getAttribute("data-tool");
            if (typeof this.tools.inline[tool].onClose === "function") {
                try {
                    this.tools.inline[tool].onClose();
                }
                catch (e) {
                    console.error("Can't close inline tool: ");
                    console.error(e);
                }
            }
        }
        menu.classList.remove('show');
        setTimeout(() => {
            menu.remove();
        }, 150);
    }
    updateInlineContent(menu) {
        if (!menu)
            return;
        menu.innerHTML = "";
        let menuIsEmpty = true;
        for (const btns of this.btns.inline) {
            const sector = document.createElement('div');
            sector.classList.add("elib-inlineSector");
            let empty = true;
            for (const btn of btns) {
                let toolName = btn.getAttribute('data-tool');
                const tool = this.tools.inline[toolName];
                if (typeof tool.onReady === "function") {
                    let res = false;
                    try {
                        res = tool.onReady();
                    }
                    catch (e) {
                        console.error("Can't prepare inline tool: ");
                        console.error(e);
                    }
                    if (res !== false) {
                        empty = false;
                        sector.appendChild(btn);
                    }
                }
            }
            if (empty) {
                sector.remove();
            }
            else {
                menuIsEmpty = false;
                menu.appendChild(sector);
                const delmiter = document.createElement("div");
                delmiter.classList.add("elib-inlineDelmiter");
                menu.appendChild(delmiter);
            }
        }
        const delmiters = Array.from(menu.querySelectorAll(".elib-inlineDelmiter"));
        if (delmiters.length) {
            delmiters[delmiters.length - 1].remove();
        }
        if (menuIsEmpty) {
            return null;
        }
    }
    replaceInline(menu = this.cont.querySelector(".elib-inlineMenu")) {
        if (!menu)
            return;
        let select = window.getSelection();
        if (!select || !select.toString())
            return;
        const rangeRect = select.getRangeAt(0).getBoundingClientRect();
        const contRect = this.cont.getBoundingClientRect();
        const rect = {
            left: rangeRect.left - contRect.left,
            top: rangeRect.top - contRect.top,
            height: rangeRect.height,
        };
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.top + rect.height + 5}px`;
    }
    isInline(inp) {
        if (!inp) {
            let select = window.getSelection();
            if (!select || !select.toString())
                return false;
            let range = select.getRangeAt(0);
            let par = range.commonAncestorContainer;
            if (par.nodeName === '#text') {
                par = par.parentNode;
            }
            let block = par.closest('.elib-block');
            if (!block)
                return false;
            let tool = block.getAttribute('data-tool');
            if (!this.allowed.inline.includes(tool))
                return false;
            inp = par.closest('[contenteditable="true"]');
        }
        if (inp.getAttribute('data-elib-inline') === 'false')
            return false;
        return true;
    }
    inlineMenu() {
        let select = window.getSelection();
        let fakeRange = this.cont.querySelector(".elib-fakeRange");
        let activeEl = document.activeElement;
        if (!activeEl ||
            !activeEl.closest(".elib") ||
            !(activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable) ||
            (select?.toString().length === 0 && !fakeRange) ||
            (!this.isInline() && !fakeRange)) {
            this.closeInline();
            return;
        }
        const menu = this.openInline();
        this.replaceInline(menu);
        const res = this.updateInlineContent(menu);
        if (res === null) {
            this.closeInline();
            return;
        }
    }
    newBlock(config = {}) {
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        const conf = {
            tool: this.op.baseTool,
            toFocus: true,
            autofocus: true,
            justReturn: false,
            id: generateUUID(),
            box: this.blocksBox,
        };
        Object.assign(conf, config);
        if (!this.tools.block[conf.tool]) {
            console.error('Tool: ' + conf.tool + ' is not initilized.');
            return null;
        }
        let block = document.createElement('div');
        const innerBlock = document.createElement("div");
        const blockContent = document.createElement('div');
        blockContent.classList.add("elib-block-content");
        innerBlock.classList.add("elib-block-inner");
        block.appendChild(innerBlock);
        innerBlock.appendChild(blockContent);
        block.setAttribute("data-block-id", conf.id);
        block.setAttribute('data-tool', conf.tool);
        block.classList.add('elib-block');
        let rend = false;
        try {
            rend = this.tools.block[conf.tool].render(block, conf);
        }
        catch (e) {
            console.error("Can't create new block: ");
            console.error(e);
        }
        if (rend === false) {
            return null;
        }
        if (rend instanceof HTMLElement) {
            if (rend.classList.contains("elib-block")) {
                block = rend;
            }
            else {
                blockContent.appendChild(rend);
            }
        }
        blockContent.addEventListener('keydown', (event) => {
            const target = event.target;
            if (target.closest(".elib-block") !== block)
                return;
            if (target.closest("[data-elib-noProxy]"))
                return;
            if (event.key === 'Enter') {
                if (event.shiftKey || event.ctrlKey)
                    return;
                if (this.emit("newBlockOnEnter", {
                    block: block,
                    event: event,
                    conf: conf,
                }).prevented)
                    return;
                event.preventDefault();
                let box = block.closest(".elib-blocks");
                this.newBlock({
                    box: box
                });
            }
            if (event.key === 'Backspace' && target.textContent === '') {
                if (this.emit("delBlockOnBackspace", {
                    block: block,
                    event: event,
                    conf: conf,
                }).prevented)
                    return;
                event.preventDefault();
                this.deleteBlock(block);
            }
        });
        this.blocksMeta.set(block, {
            option: {},
            config: {}
        });
        if (conf.justReturn) {
            return block;
        }
        if (!conf.toFocus || !this.state.focusedBlock) {
            conf.box.appendChild(block);
        }
        else {
            let nextBlock = this.state.focusedBlock.block.nextElementSibling;
            if (conf.box.contains(this.state.focusedBlock.block) && nextBlock) {
                conf.box.insertBefore(block, nextBlock);
            }
            else {
                conf.box.appendChild(block);
            }
        }
        this.focusBlock(block, { focusInp: conf.autofocus });
        this.emit("newBlock", { block: block, conf: conf });
        return block;
    }
    blockMeta(block, callback) {
        let data = this.blocksMeta.get(block);
        if (!data) {
            this.blocksMeta.set(block, {
                option: {},
                config: {},
            });
            data = this.blocksMeta.get(block);
        }
        if (!callback) {
            return data;
        }
        callback(data);
        this.blocksMeta.set(block, data);
    }
    // ФУНКЦИЯ НЕ РАБОТАЕТ, НЕТ САНИТАЙЗЕРА
    sanitize(html, tool) {
        let tags = this.allowed.tags;
        let attr = this.allowed.attrs;
        let addTags = this.tools[tool].config.allowNodes;
        if (addTags) {
            tags = tags.concat(addTags);
        }
        let addAttr = this.tools[tool].config.allowAttrs;
        if (addAttr) {
            attr = attr.concat(addAttr);
        }
        return html;
    }
    async save(box = this.blocksBox) {
        const blocks = Array.from(box.children);
        blocks.filter((block) => {
            if (block.classList.contains("elib-block"))
                return true;
            return false;
        });
        const resData = {
            blocks: []
        };
        for (const block of blocks) {
            let toolName = block.getAttribute("data-tool");
            let config = this.blocksMeta.get(block)["config"];
            let options = this.blocksMeta.get(block)["option"];
            const tool = this.tools.block[toolName];
            let data = {};
            data.tool = toolName;
            data.id = block.getAttribute("data-block-id");
            let blockData;
            if (typeof tool.save === "function") {
                let res = false;
                try {
                    res = tool.save(block);
                }
                catch (e) {
                    console.error("Can't save block: ");
                    console.error(e);
                }
                if (res instanceof Promise) {
                    blockData = await res;
                }
                else {
                    blockData = res;
                }
            }
            if (blockData === false || blockData === null) {
                continue;
            }
            data.data = blockData;
            if (Object.keys(config).length > 0) {
                data.config = {};
            }
            if (Object.keys(options).length > 0) {
                data.option = {};
            }
            for (let key in config) {
                let plugin = this.tools.blockOption[toolName][key];
                if (!plugin)
                    continue;
                if (typeof plugin.save === "function") {
                    let res = false;
                    try {
                        res = plugin.save(block);
                    }
                    catch (e) {
                        console.error("Can't save data for option: ");
                        console.error(e);
                    }
                    if (res === false)
                        continue;
                    if (res instanceof Promise) {
                        data.config[key] = await res;
                    }
                    else {
                        data.config[key] = res;
                    }
                }
                else {
                    data.config[key] = true;
                }
            }
            for (let key in options) {
                const opTool = this.tools.option[key];
                if (!opTool)
                    continue;
                if (typeof opTool.save === "function") {
                    let res = false;
                    try {
                        res = opTool.save(block);
                    }
                    catch (e) {
                        console.error("Can't save data for option: ");
                        console.error(e);
                    }
                    if (res === false)
                        continue;
                    if (res instanceof Promise) {
                        res = await res;
                        if (res)
                            data.option[key] = res;
                    }
                    else {
                        if (res)
                            data.option[key] = res;
                    }
                }
                else {
                    data.option[key] = true;
                }
            }
            if (data.option && Object.keys(data.option).length === 0) {
                delete data.option;
            }
            if (data.config && Object.keys(data.config).length === 0) {
                delete data.config;
            }
            resData.blocks.push(data);
        }
        const event = this.emit("save", {
            data: resData,
            blocks: blocks,
        });
        return event.data;
    }
    post() {
        const blocks = Array.from(this.blocksBox.querySelectorAll('.elib-block'));
        for (const block of blocks) {
            let toolName = block.getAttribute('data-tool');
            let plugin = this.tools.block[toolName];
            if (typeof plugin.post === 'function') {
                try {
                    plugin.post(block);
                }
                catch (e) {
                    console.error("Can't post block: ");
                    console.error(e);
                }
            }
            const configs = this.blocksMeta.get(block)["config"];
            for (const optionName in configs) {
                let option = this.tools.blockOption[toolName];
                if (!option)
                    continue;
                option = option[optionName];
                if (!option)
                    continue;
                if (typeof option.post === "function") {
                    try {
                        option.post(block);
                    }
                    catch (e) {
                        console.error("Can't post block throw option: ");
                        console.error(e);
                    }
                }
            }
            const options = this.blocksMeta.get(block)["option"];
            for (const optionName in options) {
                let option = this.tools.option[optionName];
                if (typeof option.post === "function") {
                    try {
                        option.post(block);
                    }
                    catch (e) {
                        console.error("Can't post block throw option: ");
                        console.error(e);
                    }
                }
            }
        }
        this.blocksBox.remove();
        this.closeInline();
    }
    applyChange() {
        let blocks = this.cont.querySelector('.elib-blocks');
        blocks.setAttribute('data-toChange', "changed");
    }
    destroy() {
        this.emit("destroy");
        for (const key in this.tools) {
            const tools = this.tools[key];
            for (const key in tools) {
                const tool = tools[key];
                if (typeof tool.destroy === "function") {
                    try {
                        tool.destroy();
                    }
                    catch (e) {
                        console.error("Can't destroy tool: ");
                        console.error(e);
                    }
                }
            }
        }
        this.cont.remove();
        this.ui.delete();
    }
    focusBlock(data, option = {}) {
        if (data instanceof HTMLElement) {
            data = {
                block: data
            };
        }
        const op = { ...{
                focusInp: false,
            }, ...option };
        if (!data.block.classList.contains("elib-block"))
            return;
        const event = this.emit("focusBlocks", { data: data, option: option });
        if (event.prevented)
            return;
        this.state.focusedBlock = data;
        const inp = this.CET(data.block);
        if (op.focusInp && inp) {
            this.focus(inp);
        }
    }
    deleteBlock(block) {
        const box = block.closest(".elib-blocks") || this.blocksBox;
        let newBlock = block.previousElementSibling || block.nextElementSibling;
        if (!newBlock) {
            newBlock = this.newBlock({ autoFocus: false, box: box });
        }
        if (!newBlock)
            return;
        this.blocksMeta.delete(block);
        block.remove();
        this.focusBlock(newBlock, { focusInp: true });
        this.emit("deleteBlock", { block: block });
    }
    focus(inp) {
        inp.focus();
        if (inp instanceof HTMLInputElement || inp instanceof HTMLTextAreaElement) {
            let len = inp.value.length;
            inp.setSelectionRange(len, len);
        }
        else {
            const range = document.createRange();
            range.selectNodeContents(inp);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            if (document.contains(inp))
                selection.addRange(range);
        }
    }
    create(component, config, ...args) {
        const fn = this.comps[component];
        if (!fn)
            return null;
        let comp = null;
        try {
            comp = fn(config, ...args);
        }
        catch (e) {
            console.error("Can't create component: ");
            console.error(e);
        }
        return comp;
    }
    getPosition(element, cont = this.cont) {
        const elRect = element.getBoundingClientRect();
        const parRect = cont.getBoundingClientRect();
        return {
            top: elRect.top - parRect.top,
            left: elRect.left - parRect.left,
            bottom: elRect.bottom - parRect.bottom,
            right: elRect.right - parRect.right,
            height: elRect.height,
            width: elRect.width,
        };
    }
    CET(cont, isNodelist = false) {
        const toNodelist = (el) => {
            let tempCont = null;
            const parent = el.parentNode || (() => {
                tempCont = document.createElement('div');
                tempCont.appendChild(el);
                return tempCont;
            })();
            let attr = "data-elibUnicAttr";
            el.setAttribute(attr, "");
            let list = parent.querySelectorAll(`[${attr}=""]`);
            el.removeAttribute(attr);
            if (tempCont) {
                tempCont.removeChild(el);
            }
            return list;
        };
        if (cont.tagName === 'INPUT' || cont.tagName === 'TEXTAREA') {
            if (isNodelist) {
                return toNodelist(cont);
            }
            else {
                return cont;
            }
        }
        if (cont.tagName === 'DIV' && cont.getAttribute('contenteditable') === 'true') {
            if (isNodelist) {
                return toNodelist(cont);
            }
            else {
                return cont;
            }
        }
        let list;
        list = cont.querySelectorAll('input');
        if (list.length !== 0) {
            if (isNodelist) {
                return list;
            }
            else {
                return list.item(0);
            }
        }
        list = cont.querySelectorAll('textarea');
        if (list.length !== 0) {
            if (isNodelist) {
                return list;
            }
            else {
                return list.item(0);
            }
        }
        list = cont.querySelectorAll('[contenteditable]');
        if (list) {
            if (isNodelist) {
                return list;
            }
            else {
                return list.item(0);
            }
        }
        return null;
    }
}
