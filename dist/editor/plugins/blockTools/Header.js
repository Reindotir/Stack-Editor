export class Header {
    api;
    data = null;
    config = {};
    setData(data) {
        this.data = data;
    }
    render() {
        const inp = this.api.create("input", {
            placeholder: this.config.placeholder,
        });
        inp.style.fontSize = this.config.size;
        inp.style.fontWeight = "bold";
        if (this.data && typeof this.data.text === "string") {
            inp.innerHTML = this.data.text;
        }
        return inp;
    }
    post(block) {
        const div = block.querySelector("[contenteditable]");
        if (!div)
            return;
        div.classList.remove("elib-placeholder");
        div.setAttribute("contenteditable", "false");
    }
    save(block) {
        const div = block.querySelector("[contenteditable]");
        return {
            text: div?.innerHTML || ""
        };
    }
}
