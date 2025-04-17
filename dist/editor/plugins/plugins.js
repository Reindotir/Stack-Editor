import * as HeaderH1 from './blockTools/headerH1/headerH1.js'
import * as HeaderH2 from './blockTools/headerH2/headerH2.js'
import * as HeaderH3 from './blockTools/headerH3/headerH3.js'
import * as HeaderH4 from './blockTools/headerH4/headerH4.js'
import * as LineDelmiter from './blockTools/lineDelmiter/lineDelmiter.js'
import * as Paragraph from './blockTools/paragraph/paragraph.js'
import * as Picture from './blockTools/picture/picture.js'
import * as Quote from './blockTools/quote/quote.js'
import * as Spoiler from './blockTools/spoiler/spoiler.js'
import * as Video from './blockTools/video/video.js'

import * as InlineTool from './inlineTools/inlineTool.js'
import * as Link from './inlineTools/link/link.js'

import * as BlockDown from './optionTools/blockDown/blockDown.js'
import * as BlockUp from './optionTools/blockUp/blockUp.js'
import * as Delete from './optionTools/delete/delete.js'
import * as TurnInto from './optionTools/turnInto/turnInto.js'


export class PluginManager {
    plugins;
    nameSort(target, template) {
        if (!Object.keys(target).length || !template.length)
            return {};
        return Object.fromEntries(Object.entries(target)
            .sort(([keyA], [keyB]) => {
            let indexA = template.indexOf(keyA);
            let indexB = template.indexOf(keyB);
            if (indexA === -1)
                indexA = template.length;
            if (indexB === -1)
                indexB = template.length;
            return indexA - indexB;
        }));
    }
    orderSort(source, template) {
        if (!Object.keys(source).length || !template.length)
            return [];
        return template.map(group => Object.fromEntries(group.map(key => [key, source[key]])));
    }
    async importPlugins() {
        const plugins = {}
    
        // BlockTools
        plugins.blockTools = {
            headerH1: HeaderH1.default,
            headerH2: HeaderH2.default,
            headerH3: HeaderH3.default,
            headerH4: HeaderH4.default,
            lineDelmiter: LineDelmiter.default,
            paragraph: Paragraph.default,
            picture: Picture.default,
            quote: Quote.default,
            spoiler: Spoiler.default,
            video: Video.default,
        };
    
        // InlineTools
        plugins.inlineTools = {
            inlineTool: InlineTool.default,
            link: Link.default,
        };
    
        // OptionTools
        plugins.optionTools = {
            blockDown: BlockDown.default,
            blockUp: BlockUp.default,
            delete: Delete.default,
            turnInto: TurnInto.default,
        };
    
        // Возвращаем объект plugins
        this.plugins = plugins;
    }
    async getPlugins() {
        await this.importPlugins();
        const plugins = {};
        await this.getInline(plugins);
        await this.getBlock(plugins);
        await this.getCore(plugins);
        await this.getOption(plugins);
        return plugins;
    }
    async createInlinePlugins(tags) {
        const inTool = (await import('./inlineTools/inlineTool.js')).default;
        const plugs = {};
        for (const name in tags) {
            const { tag, icon } = tags[name];
            plugs[name] = class extends inTool {
                constructor(api, config) {
                    super(api, { ...{ icon: icon }, ...config }, tag);
                }
            };
        }
        return plugs;
    }
    async getInline(target) {
        let plugs = this.plugins.inlineTools || {};
        const template = [
            [
                "bold",
                "idiom",
                "stroke",
                "link",
            ],
            [
                "underline",
                "code",
                "sub",
                "sup",
            ]
        ];
        const tags = {
            bold: {
                tag: "b",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17.954,10.663A6.986,6.986,0,0,0,12,0H5A2,2,0,0,0,3,2V22a2,2,0,0,0,2,2H15a6.994,6.994,0,0,0,2.954-13.337ZM7,4h5a3,3,0,0,1,0,6H7Zm8,16H7V14h8a3,3,0,0,1,0,6Z"/></svg>',
            },
            idiom: {
                tag: "i",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21,0H6A1.5,1.5,0,0,0,6,3h5.713L9.259,21H3a1.5,1.5,0,0,0,0,3H18a1.5,1.5,0,0,0,0-3H12.287L14.741,3H21a1.5,1.5,0,0,0,0-3Z"/></svg>',
            },
            stroke: {
                tag: "s",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m24,12c0,.553-.448,1-1,1H1c-.552,0-1-.447-1-1s.448-1,1-1h4.081c-1.863-1.003-3.081-2.97-3.081-5.151C2,2.624,4.624,0,7.848,0h8.235c3.262,0,5.917,2.654,5.917,5.917v1.083c0,.553-.448,1-1,1s-1-.447-1-1v-1.083c0-2.16-1.757-3.917-3.917-3.917H7.848c-2.122,0-3.848,1.727-3.848,3.849,0,1.732,1.167,3.26,2.84,3.714l5.293,1.438h10.867c.552,0,1,.447,1,1Zm-3.943,3.11c-.495.244-.698.844-.454,1.34.259.524.396,1.113.396,1.701,0,2.122-1.726,3.849-3.848,3.849H7.917c-2.16,0-3.917-1.757-3.917-3.917v-1.083c0-.553-.448-1-1-1s-1,.447-1,1v1.083c0,3.263,2.654,5.917,5.917,5.917h8.235c3.225,0,5.848-2.624,5.848-5.849,0-.894-.208-1.788-.604-2.588-.245-.494-.844-.699-1.339-.453Z"/></svg>',
            },
            underline: {
                tag: 'u',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,18.989a9.01,9.01,0,0,0,9-9V1.5a1.5,1.5,0,0,0-3,0V9.989a6,6,0,0,1-12,0V1.5a1.5,1.5,0,0,0-3,0V9.989A9.01,9.01,0,0,0,12,18.989Z"/><path d="M22.544,21H1.5a1.5,1.5,0,0,0,0,3H22.544a1.5,1.5,0,0,0,0-3Z"/></svg>',
            },
            code: {
                tag: "code",
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9.97,14.47l-7.44,7.11c-.29,.28-.66,.42-1.04,.42-.4,0-.79-.16-1.08-.46-.57-.6-.55-1.55,.05-2.12l7.41-7.09c.17-.17,.17-.49-.02-.68L.46,4.58c-.6-.57-.62-1.52-.05-2.12,.57-.6,1.52-.62,2.12-.05l7.41,7.09c1.39,1.39,1.39,3.61,.02,4.97Zm12.53,4.53H11.5c-.83,0-1.5,.67-1.5,1.5s.67,1.5,1.5,1.5h11c.83,0,1.5-.67,1.5-1.5s-.67-1.5-1.5-1.5Z"/></svg>',
            },
            sub: {
                tag: 'sub',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m24,14.5v8c0,.828-.671,1.5-1.5,1.5s-1.5-.672-1.5-1.5v-4.585c-.516.183-1.114.073-1.537-.331-.599-.572-.62-1.522-.047-2.121l1.913-2c.283-.296.675-.463,1.084-.463.829,0,1.587.672,1.587,1.5ZM14.437.329c-.646-.519-1.59-.413-2.108.233l-4.829,6.036L2.671.562C2.154-.084,1.209-.189.563.329-.084.847-.189,1.79.329,2.438l5.25,6.562L.329,15.562c-.518.647-.413,1.591.234,2.108.276.222.607.329.936.329.44,0,.876-.192,1.172-.562l4.829-6.036,4.829,6.036c.296.37.732.562,1.172.562.329,0,.66-.107.936-.329.647-.518.752-1.461.234-2.108l-5.25-6.562,5.25-6.562c.518-.647.413-1.591-.234-2.108Z"/></svg>',
            },
            sup: {
                tag: 'sup',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="m24,1.5v8c0,.828-.671,1.5-1.5,1.5s-1.5-.672-1.5-1.5v-4.585c-.517.182-1.113.074-1.537-.331-.599-.572-.62-1.522-.047-2.121l1.913-2c.283-.296.675-.463,1.084-.463.829,0,1.587.672,1.587,1.5Zm-9.563,4.829c-.646-.519-1.59-.413-2.108.233l-4.829,6.036L2.671,6.562c-.518-.646-1.461-.752-2.108-.233-.647.518-.752,1.461-.234,2.108l5.25,6.562L.329,21.562c-.518.647-.413,1.591.234,2.108.276.222.607.329.936.329.44,0,.876-.192,1.172-.562l4.829-6.036,4.829,6.036c.296.37.732.562,1.172.562.329,0,.66-.107.936-.329.647-.518.752-1.461.234-2.108l-5.25-6.562,5.25-6.562c.518-.647.413-1.591-.234-2.108Z"/></svg>',
            },
        };
        const inPlugs = await this.createInlinePlugins(tags);
        plugs = { ...plugs, ...inPlugs };
        const plugins = this.orderSort(plugs, template);
        target.inlineTools = plugins;
    }
    async getBlock(target) {
        const plugs = this.plugins.blockTools || {};
        const customize = [
            {
                tools: ["paragraph"],
                config: {
                    category: "Типография"
                }
            },
            {
                tools: ["headerH1", "headerH2", "headerH3", "headerH4"],
                config: {
                    category: "Заголовок"
                }
            },
            {
                tools: ["lineDelmiter", "astDelmiter"],
                config: {
                    category: "Делитель"
                }
            },
            {
                tools: ["numberedList", "bulletedList"],
                config: {
                    category: "Списки"
                }
            },
            {
                tools: ["spoiler", "quote"],
                config: {
                    category: "Текстовые элементы"
                }
            },
            {
                tools: ["picture", "video"],
                config: {
                    category: "Медиа"
                }
            }
        ];
        const template = [];
        for (const custom of customize) {
            for (const tool of custom.tools) {
                if (!template.includes(tool))
                    template.push(tool);
                let vl = plugs[tool];
                if (!vl)
                    continue;
                if (typeof vl === "function") {
                    vl = {
                        class: vl
                    };
                }
                Object.assign(vl, custom.config);
                plugs[tool] = vl;
            }
        }
        target.blockTools = this.nameSort(plugs, template);
    }
    async getCore(target) {
        target.coreTools = this.plugins.coreTools || {};
    }
    async getOption(target) {
        const plugs = this.plugins.optionTools || {};
        const template = [
            [
                "blockUp",
                "delete",
                "blockDown",
            ],
        ];
        const plugins = this.orderSort(plugs, template);
        target.optionTools = plugins;
    }
}
