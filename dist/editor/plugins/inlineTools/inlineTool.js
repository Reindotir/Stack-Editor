export default class inTool {
    tag = "";
    api;
    editor;
    btn = null;
    isWrap = false;
    config = {};
    constructor(api, config, tag) {
        this.editor = api;
        this.api = api.inline;
        this.tag = tag;
        this.editor.allowed.tags.push(tag);
        this.config = config;
    }
    getNode() {
        return document.createElement(this.tag);
    }
    attachBtn(btn) {
        this.btn = btn;
    }
    onReady() {
        this.isWrap = this.api.isWrap(this.tag);
        if (this.isWrap) {
            this.btn?.classList.add("active");
        }
        else {
            this.btn?.classList.remove('active');
        }
    }
    render() {
        let tag = this.getNode();
        if (this.isWrap) {
            this.api.unwrapText(this.tag);
        }
        else {
            this.api.wrapText(tag);
        }
    }
}
