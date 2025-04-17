export class Theme {
    shader = shader;
    _name = "";
    config = {};
    attachedPacks = [];
    setRulesLater = [];
    _envSelector = "";
    style;
    _savedTheme = null;
    deleted = false;
    sheet = null;
    setThemeLater = null;
    mixins = {};
    initialized = false;
    constructor(option = {}) {
        if (typeof option === "string") {
            option = { name: option };
        }
        this.createNode();
        Object.assign(this, option);
        if (option.autoInit !== false)
            this.init();
    }
    set envSelector(vl) {
        if (vl && !vl.endsWith(" "))
            vl = vl + " ";
        this._envSelector = vl;
    }
    get envSelector() {
        return this._envSelector;
    }
    set name(name) {
        if (this.style)
            this.style.setAttribute("data-theme", name);
        this._name = name;
    }
    get name() {
        return this._name;
    }
    get theme() {
        const theme = {
            name: this.name,
            comps: {},
            option: {},
            config: this.config,
        };
        let oldStyle;
        if (!this.sheet) {
            oldStyle = this.style;
            this.style = document.createElement("style");
            this.style.disabled = true;
            document.querySelector("head")?.appendChild(this.style);
            this.sheet = this.style.sheet;
            if (this.setThemeLater) {
                this.theme = this.setThemeLater;
            }
            this.setRulesLater.forEach((rule) => {
                this.add(...rule);
            });
        }
        let rules = this.sheet?.cssRules || [new CSSRule()];
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            const option = {};
            const selector = rule.selectorText;
            const styles = rule.style;
            const props = {};
            let onlyVars = true;
            for (let j = 0; j < styles.length; j++) {
                const name = styles[j];
                if (!name.startsWith("--")) {
                    onlyVars = false;
                }
                props[name] = styles.getPropertyValue(name);
            }
            if (onlyVars) {
                option.toVar = true;
            }
            theme.option[selector] = option;
            theme.comps[selector] = props;
        }
        if (oldStyle) {
            this.style.remove();
            this.style = oldStyle;
            this.sheet = null;
        }
        return theme;
    }
    set theme(theme) {
        if (!this.style) {
            this.setThemeLater = theme;
            return;
        }
        this.reset();
        for (const selector in theme.comps) {
            this.add(selector, theme.comps[selector], theme.option[selector]);
        }
        this.config = theme.config;
        if (!this.name)
            this.name = theme.name;
    }
    createNode() {
        this.style = document.createElement("style");
        this.style.setAttribute("data-theme", this.name);
        this.style.themeLink = this;
    }
    init() {
        if (this.initialized)
            return;
        document.querySelector("head")?.appendChild(this.style);
        this.sheet = this.style.sheet;
        if (this.setThemeLater) {
            this.theme = this.setThemeLater;
            this.setThemeLater = null;
        }
        this.setRulesLater.forEach((rule) => {
            this.add(...rule);
        });
        this.setRulesLater = [];
        this.initialized = true;
    }
    restore(name, init = true) {
        this.name = name;
        this.createNode();
        if (this._savedTheme)
            this.theme = this._savedTheme;
        if (init)
            this.init();
    }
    attach(pack) {
        this.attachedPacks.push(pack);
    }
    detach(pack) {
        let toDel = -1;
        for (let i = 0; i <= this.attachedPacks.length; i++) {
            if (this.attachedPacks[i] === pack) {
                toDel = i;
                break;
            }
        }
        if (toDel === -1)
            this.attachedPacks.splice(toDel, 1);
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
            styles = this.shader.toVar(styles);
        }
        if (selector.startsWith("@mixin")) {
            let name = selector.split(" ")[1];
            shader.mixins[name] = styles;
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
                let rule = this.find(styles[key]) || shader.find(styles[key]);
                if (!rule)
                    continue;
                rule = shader.parse(rule.cssText);
                extender = { ...extender, ...rule };
            }
            else if (key === "@include") {
                let rule = this.mixins[styles[key]] || shader.mixins[styles[key]];
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
        let rules = shader.toString(styles);
        let rule = `${selector} ${rules}`;
        if (!op.index)
            op.index = op.sheet.cssRules.length;
        op.sheet.insertRule(rule, op.index);
        nested.forEach((rule) => {
            this.add(...rule);
        });
    }
    remove(selector) {
        if (typeof selector === "string") {
            const rules = this.sheet?.cssRules || [new CSSRule()];
            for (let i = 0; i < rules.length; i++) {
                const rule = rules[i];
                if (rule.selectorText === selector) {
                    this.sheet?.deleteRule(i);
                    return true;
                }
            }
        }
        else if (isNaN(selector)) {
            let index = selector;
            const rules = this.sheet?.cssRules || [new CSSRule()];
            if (index >= 0 && index < rules.length) {
                this.sheet?.deleteRule(index);
                return true;
            }
        }
        return false;
    }
    removeAll(selector) {
        const matches = this.findAll(selector, "index");
        matches.forEach((index) => {
            if (typeof index === "number") {
                this.sheet?.deleteRule(index);
            }
        });
    }
    find(selector) {
        if (!this.sheet)
            return null;
        let cureRule = null;
        for (const rule of this.sheet.cssRules) {
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
    findAll(selector, type = "rule") {
        const matches = [];
        let rules = this.sheet?.cssRules || [new CSSRule()];
        for (let i = 0; i < rules.length; i++) {
            const rule = this.sheet?.cssRules[i];
            if (rule.selectorText !== selector)
                return [];
            if (type === "rule") {
                matches.push(rule);
            }
            else if (type === "index") {
                matches.push(i);
            }
            else if (type === "text") {
                matches.push(rule.cssText);
            }
        }
        return matches;
    }
    reset() {
        if (!this.sheet)
            return;
        while (this.sheet.cssRules.length > 0) {
            this.sheet.deleteRule(0);
        }
    }
    active() {
        this.style.disabled = false;
    }
    disable() {
        this.style.disabled = true;
    }
    delete() {
        this._savedTheme = this.theme;
        this.deleted = true;
        this.style.remove();
        for (const pack of this.attachedPacks) {
            pack.del(this);
        }
    }
    save(name = this.name) {
        const theme = this.theme;
        if (name)
            theme.name = name;
        this.shader.saveTheme(theme);
        return theme;
    }
    copy(name = "", op = {}) {
        return new Theme({ ...{
                name: name,
                theme: this.theme || this._savedTheme,
                autoInit: true
            }, ...op });
    }
}
export class Pack {
    name = "";
    themes = [];
    shader = shader;
    autoInit = false;
    config = {};
    constructor(option = {}) {
        Object.assign(this, option);
        const themes = [...this.themes];
        this.themes = [];
        this.add(...themes);
        if (this.autoInit)
            this.init();
    }
    get pack() {
        const pack = {
            name: this.name,
            themes: {},
            config: this.config,
        };
        this.themes.forEach((theme) => {
            const themeObj = theme.theme;
            const key = themeObj.name;
            pack.themes[key] = themeObj;
        });
        return pack;
    }
    set pack(pack) {
        if (!this.name)
            this.name = pack.name;
        this.reset();
        for (let name in pack.themes) {
            const theme = pack.themes[name];
            const themeClass = new Theme({
                name: name,
                theme: theme,
            });
            this.add(themeClass);
        }
        this.config = pack.config;
    }
    add(...themes) {
        themes.forEach((theme) => {
            for (const themeClass of this.themes) {
                if (theme === themeClass)
                    return;
            }
            this.themes.push(theme);
            theme.attach(this);
        });
    }
    del(...themes) {
        themes.forEach((theme) => {
            let toDel = -1;
            for (let i = 0; i <= this.themes.length; i++) {
                if (this.themes[i] === theme) {
                    theme.detach(this);
                    toDel = i;
                    break;
                }
            }
            if (toDel !== -1)
                this.themes.splice(toDel, 1);
        });
    }
    save(name = this.name) {
        const pack = this.pack;
        pack.name = name;
        this.shader.savePack(pack);
        return pack;
    }
    reset() {
        this.themes.forEach((theme) => {
            theme.detach(this);
        });
    }
    active() {
        this.themes.forEach((theme) => {
            theme.active();
        });
    }
    disable() {
        this.themes.forEach((theme) => {
            theme.disable();
        });
    }
    init() {
        this.themes.forEach((theme) => {
            theme.init();
        });
    }
    delete(delThemes = false) {
        this.themes.forEach((theme) => {
            theme.detach(this);
            if (delThemes)
                theme.delete();
        });
        this.shader.delPack(this.name);
    }
    copy(name = "", init = false) {
        return new Pack({
            name: name,
            pack: this.pack,
            autoInit: init,
        });
    }
}
export class Shader {
    op;
    mixins = {};
    Theme;
    Pack;
    constructor(conf = {}) {
        this.op = {
            themeKey: "shader-theme-store",
            packKey: "shader-pack-store",
        };
        Object.assign(this.op, conf);
        this.Theme = Theme;
        this.Pack = Pack;
        if (localStorage.getItem(this.op.themeKey) === null) {
            localStorage.setItem(this.op.themeKey, "{}");
        }
        if (localStorage.getItem(this.op.packKey) === null) {
            localStorage.setItem(this.op.packKey, "{}");
        }
    }
    get themes() {
        const themes = localStorage.getItem(this.op.themeKey);
        if (!themes)
            return null;
        return JSON.parse(themes);
    }
    get packs() {
        const packs = localStorage.getItem(this.op.packKey);
        if (!packs)
            return null;
        return JSON.parse(packs);
    }
    toVar(oldPack) {
        const pack = {};
        for (const key in oldPack) {
            let newVar = key;
            if (key.slice(0, 2) !== "--" && typeof oldPack[key] === "string") {
                newVar = ("--" + key);
            }
            pack[newVar] = oldPack[key];
        }
        return pack;
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
    find(selector) {
        let cureRule = null;
        for (const sheet of document.styleSheets) {
            if (cureRule)
                break;
            for (const rule of sheet.cssRules) {
                if (cureRule)
                    break;
                if (rule instanceof CSSStyleRule) {
                    if (rule.selectorText === selector) {
                        cureRule = rule;
                    }
                }
            }
        }
        return cureRule;
    }
    loadPack(name, init = false) {
        const pack = this.packs[name];
        if (!pack)
            return null;
        return new Pack({
            pack: pack,
            autoInit: init,
        });
    }
    savePack(...Packs) {
        Packs.forEach((pack) => {
            const packs = this.packs;
            packs[pack.name] = pack.pack;
            localStorage.setItem(this.op.packKey, JSON.stringify(packs));
        });
    }
    delPack(name) {
        const packs = this.packs;
        delete packs[name];
        localStorage.setItem(this.op.packKey, JSON.stringify(packs));
    }
    hasPack(name) {
        if (this.packs[name])
            return true;
        return false;
    }
    loadTheme(name, init = false) {
        const theme = this.themes[name];
        if (!theme)
            return null;
        return new Theme({
            theme: theme,
            autoInit: init,
        });
    }
    saveTheme(...themes) {
        themes.forEach((theme) => {
            const Themes = this.themes;
            Themes[theme.name] = theme;
            localStorage.setItem(this.op.themeKey, JSON.stringify(Themes));
        });
    }
    delTheme(themeName) {
        const themes = this.themes;
        delete themes[themeName];
        localStorage.setItem(this.op.themeKey, themes);
    }
    hasTheme(themeName) {
        let theme = this.themes[themeName];
        if (theme)
            return true;
        return false;
    }
}
export const shader = new Shader();
