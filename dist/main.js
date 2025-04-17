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
const editorCont = document.createElement("div");
editorCont.classList.add("editor-cont");
main.appendChild(editorCont);
const editorBox = document.createElement("div");
editorCont.appendChild(editorBox);
const pluginManager = new PluginManager();
const plugins = await pluginManager.getPlugins();
let data = localStorage.getItem("article");
if (data) data = JSON.parse(data);
if (!data) data = { blocks: [
            {
                id: "123",
                tool: "paragraph",
                data: {
                    text: ""
                }
            }
        ]};
const config = { ...{
        holder: editorBox,
        autofocus: true,
        autoInit: false,
        data: data,
        optionInfo: () => {
            return `Время: ${Date.now()}, <br>Другая инфоормация`;
        },
        showBtnsOnLeave: main,
    }, ...plugins };
const editor = new StackEditor(config);
editor.init();
editor.on("ready", () => {
    console.log("Редактор готов");
    main.querySelector("[contenteditable]").focus()
});
editor.on("change", () => {
    editor.save().then((data) => {
        const res = JSON.stringify(data, null, 4);
        localStorage.setItem("article", res);
    });
});
