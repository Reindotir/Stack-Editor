import { StackEditor } from "./editor/editor.js";
import { PluginManager } from "./editor/plugins/plugins.js";
import { Theme } from "./libs/Shader.js";
const ui = new Theme("editor");
ui.add(".editor-cont", {
    width: "100%",
    display: "flex",
    flexDirection: 'column',
    alignItems: "center",
    padding: "50px 20px 0 70px",
});
ui.add("@media screen and (max-width: 768px)", {
    ".editor-cont": {
        padding: "50px 20px 0 20px"
    }
});
const root = new Theme("root")
root.add(":root", {
    accent: "0, 122, 255",
    accentHover: "0, 95, 204",

    error: "255, 59, 48",
    success: "52, 199, 89",
    warning: "255, 149, 0",
    info: "0, 122, 255",

    white: "255, 255, 255",
    black: "0, 0, 0",

    transition: "cubic-bezier(0.25, 1, 0.5, 1)",
    transitionRe: "cubic-bezier(0.4, 0, 1, 1)",
}, { toVar: true })

root.add(".light-mode", {
    color: '0, 0, 0',  
    colorNd: '141, 141, 147',
    colorRd: '141, 141, 147',
    placeholder: '174, 174, 178', 

    bgSite: "242, 242, 247",
    bgSt: '229, 229, 234',
    bgNd: '209, 209, 214',
    bgRd: '199, 199, 204',

    component: '174, 174, 178',  
    componentd: '199, 199, 204',

    border: '216, 216, 220',
    borderNd: "199, 199, 204",
    borderRd: "174, 174, 178",

    opacity: "0.8",
}, { toVar: true })

root.add(".dark-mode", {
    color: '255, 255, 255',
    colorNd: '138, 138, 142',
    colorRd: '109, 109, 114',
    placeholder: '142, 142, 147',

    bgSite: '10, 10, 11',
    bgSt: '22, 22, 23',
    bgNd: '44, 44, 46',
    bgRd: '58, 58, 60',  

    component: '72, 72, 74',   
    componentNd: '99, 99, 102',

    border: '58, 58, 60',
    borderNd: '72, 72, 74',
    borderRd: '99, 99, 102',

    opacity: "0.5",
}, { toVar: true })
document.body.classList.add("dark-mode")
const main = document.querySelector("main")


ui.add(".file-cont", {
    width: "100%",
    height: "auto",
    padding: "5px 50px",
    display: "flex",
    alignItems: "center",
    gap: "20px",

    "button": {
        all: "unset",
        width: "auto",
        height: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgb(var(--color))",
        fontSize: "16px",
        cursor: "pointer",
    },
})

const fileCont = document.createElement("div")
fileCont.classList.add("file-cont")
main.appendChild(fileCont)

const create = document.createElement("button")
create.innerHTML = "Новая статья"
create.addEventListener("click", () => {
    editor.destroy()
    editor = createEditor()
})
fileCont.appendChild(create)

const save = document.createElement("button")
save.innerHTML = "Сохранить"
save.addEventListener("click", async () => {
    const data = await editor.save()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "editor_data.json";
    a.click();

    URL.revokeObjectURL(url);
})
fileCont.appendChild(save)

const open = document.createElement("button")
const input = document.createElement("input")
input.setAttribute("type", "file")
input.style.display = "none"
fileCont.appendChild(input)
input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
        const json = JSON.parse(event.target.result);
        editor.destroy()
        editor = createEditor({ data: json })
    }
    
    reader.readAsText(file)
})
open.innerHTML = "Открыть"
open.addEventListener("click", () => {
    input.click()
})
fileCont.appendChild(open)


const createEditor = (conf = {}) => {
    const config = { ...{ 
        data: { 
            blocks: [
                {
                    id: "123",
                    tool: "paragraph",
                    data: {
                        text: ""
                    }
                },
            ]
        },
        optionInfo: () => {
            return `Время: ${Date.now()}, <br>Другая инфоормация`;
        },
        showBtnsOnLeave: main,
        autofocus: true,
        autoInit: false,
        ...plugins
    }, ...conf }
    const editorBox = document.createElement("div");
    editorCont.appendChild(editorBox);
    config.holder = editorBox

    const editor = new StackEditor(config);
    editor.init();
    editor.on("ready", () => {
        console.log("Редактор готов");
        main.querySelector("[contenteditable]").focus()
    });

    return editor
}


const editorCont = document.createElement("div");
editorCont.classList.add("editor-cont");
main.appendChild(editorCont);

const pluginManager = new PluginManager();
const plugins = await pluginManager.getPlugins();

let editor = createEditor()
