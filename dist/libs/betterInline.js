export class Inline {
    state = {};
    highestNode(node) {
        let tempNode = node.parentNode;
        while (tempNode?.textContent === node.textContent && !tempNode?.isContentEditable) {
            node = tempNode;
            tempNode = tempNode.parentNode;
        }
        return node;
    }
    lowestNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE)
            return node;
        let text = node.textContent || "";
        let current = node;
        while (current.children.length === 1 &&
            current.children[0].textContent === text) {
            current = current.children[0];
        }
        return current;
    }
    select(node) {
        const newRange = document.createRange();
        newRange.selectNodeContents(node);
        let select = window.getSelection();
        select.removeAllRanges();
        select.addRange(newRange);
    }
    selectionHtml(range) {
        if (!range) {
            let select = window.getSelection();
            if (!select || !select.toString())
                return "";
            range = select.getRangeAt(0);
        }
        const content = range.cloneContents();
        const temp = document.createElement("div");
        temp.appendChild(content);
        return temp.innerHTML;
    }
    wrapSelection() {
        let selection = window.getSelection();
        if (!selection || !selection.toString())
            return;
        let range = selection.getRangeAt(0);
        let selectedText = range.toString();
        let wrappedText = `{{${selectedText}}}`;
        let textNode = document.createTextNode(wrappedText);
        range.deleteContents();
        range.insertNode(textNode);
    }
    unwrapSelection(node) {
        let match = node.textContent?.match(/\{\{(.*?)\}\}/);
        if (!match)
            return;
        let startOffset = match.index;
        if (startOffset === undefined)
            return;
        let endOffset = startOffset + match[0].length;
        let cleanText = match[1];
        node.textContent = node.textContent?.slice(0, startOffset) + cleanText + node.textContent?.slice(endOffset);
        let selection = window.getSelection();
        let range = document.createRange();
        range.setStart(node, startOffset);
        range.setEnd(node, startOffset + cleanText.length);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    selection() {
        const data = {
            selection: window.getSelection(),
            range: window.getSelection()?.getRangeAt(0) || null,
            content: window.getSelection()?.toString() || "",
            html: this.selectionHtml(),
            input: this.getInput(),
            container: this.getContainer(),
            nodes: this.getSelectedNodes(),
            lowestNode: null,
            highestNode: null,
        };
        if (data.container) {
            data.lowestNode = this.lowestNode(data.container);
            data.highestNode = this.highestNode(data.container);
        }
        return data;
    }
    wrapText(node) {
        const { range, html, content } = this.selection();
        if (!range || !content)
            return;
        node.innerHTML += html;
        range.deleteContents();
        range.insertNode(node);
        this.select(node);
        this.cleanHtml();
    }
    unwrapText(selector) {
        this.wrapSelection();
        let { lowestNode, content } = this.selection();
        if (!content || !lowestNode || !(lowestNode instanceof Element))
            return;
        const node = lowestNode.closest(selector);
        if (!node)
            return;
        let outer = node.outerHTML;
        let html = node.innerHTML;
        let text = node.textContent;
        const getAttrs = (element) => {
            return Array.from(element.attributes)
                .map(attr => attr.name + '=' + '"' + attr.value + '"')
                .join(" ");
        };
        let tag = node.tagName.toLowerCase();
        if (content === text) {
            outer = html;
        }
        else {
            outer = outer.replace(content, `</${tag}${getAttrs(node)}>${content}<${tag}>`);
        }
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = outer;
        const frag = document.createDocumentFragment();
        const nodes = [...tempDiv.childNodes];
        nodes.forEach((node) => {
            frag.appendChild(node);
        });
        node.replaceWith(frag);
        const observ = (node) => {
            if (node.nodeName !== "#text") {
                node.childNodes.forEach(observ);
                return;
            }
            if (/\{\{.*?\}\}/.test(node.textContent || ''))
                this.unwrapSelection(node);
        };
        nodes.forEach(observ);
        this.cleanHtml();
    }
    getInput() {
        const cont = this.getContainer();
        if (!cont)
            return null;
        const inp = cont.closest('[contenteditable]');
        return inp;
    }
    getContainer() {
        let selection = window.getSelection();
        if (!selection || !selection.toString())
            return null;
        let range = selection.getRangeAt(0);
        let cont = range.commonAncestorContainer;
        if (cont.nodeName === "#text") {
            cont = cont.parentElement;
        }
        return cont;
    }
    getSelectedNodes() {
        let selection = window.getSelection();
        if (!selection.rangeCount)
            return [];
        const range = selection.getRangeAt(0);
        let inp;
        if (range.commonAncestorContainer.nodeType !== 1) {
            inp = range.commonAncestorContainer.parentElement?.closest("[contenteditable]");
        }
        else {
            inp = range.commonAncestorContainer.closest("[contenteditable]");
        }
        if (!inp)
            return [];
        let startNode = range.startContainer;
        let endNode = range.endContainer;
        if (startNode === endNode && startNode.nodeType === 1) {
            let node = startNode.querySelector('*');
            if (node) {
                while (node && node.nodeType === 1 && node?.textContent === selection.toString()) {
                    startNode = node;
                    endNode = node;
                    node = node.querySelector('*');
                }
            }
        }
        function collectParents(node) {
            let parents = [];
            while (node && node !== inp) {
                if (node.nodeType === 1)
                    parents.push(node);
                node = node.parentNode;
            }
            return parents;
        }
        let startContainers = collectParents(startNode);
        let endContainers = collectParents(endNode);
        if (startNode === endNode)
            return startContainers;
        return startContainers.filter(el => endContainers.includes(el));
    }
    isWrap(selector, getEl = false) {
        const nodes = this.getSelectedNodes();
        const node = nodes.filter((node) => node.matches(selector));
        if (!node.length)
            return false;
        if (getEl)
            return node[0];
        return true;
    }
    fakeRange() {
        if (document.querySelector('.elib-fakeRange')) {
            return false;
        }
        this.state.isFakeRange = true;
        const span = document.createElement('span');
        span.classList.add('elib-fakeRange');
        this.wrapText(span);
        let sel = window.getSelection();
        sel.removeAllRanges();
    }
    delFakeRange() {
        const span = document.querySelector('.elib-fakeRange');
        if (!span)
            return false;
        let sel = window.getSelection();
        let ran = document.createRange();
        sel.removeAllRanges();
        ran.selectNodeContents(span);
        sel.addRange(ran);
        this.unwrapText('span');
        this.state.isFakeRange = false;
    }
    cleanHtml(inp) {
        if (!inp) {
            let res = this.selection().input;
            if (!res)
                return;
            inp = res;
        }
        const clearEmpty = (node) => {
            Array.from(node.children).forEach(node => {
                if (node.nodeType === 1) {
                    clearEmpty(node);
                    if (!node.innerHTML.trim())
                        node.remove();
                }
            });
        };
        const clearNested = (el) => {
            const els = el.querySelectorAll('*');
            els.forEach(node => {
                const tagName = node.tagName.toLowerCase();
                const classes = node.className ? `.${node.className.split(' ').join('.')}` : '';
                const id = node.id ? `#${node.id}` : '';
                const attributes = [...node.attributes].map(attr => `[${attr.name}="${attr.value}"]`).join('');
                const selector = `${tagName}${classes}${id}${attributes}`;
                const nested = node.querySelectorAll(selector);
                nested.forEach(nested => {
                    el.innerHTML = el.innerHTML.replace(nested.outerHTML, nested.textContent || "");
                });
            });
        };
        clearEmpty(inp);
        clearNested(inp);
        if (!inp.textContent)
            inp.innerHTML = '';
    }
}
