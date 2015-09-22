/**
 * data2model
 * Author: michael
 * Date: 19.09.15.
 * License: MIT
 */
'use strict';
const sax = require('sax');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const log = require('deep-logger').deepLogger;
const __ = require('le-map-e');
const appRoot = require('app-root-path');
const reqLib = appRoot.require;

class XmlParser {
    constructor(options) {
        if (!options) options = {};
        this.options = Object.assign({
            shouldQueryNow: true,
            useStrict: true
        }, options);
        this.parser = new sax.parser(this.options.useStrict);
        this.models = [];
    }

    handleModel(models) {
        return models.map(val => reqLib(`/models/${val}.js`));
    }

    parse(xml, models, options) {
        let pr = (this.handleModel(models));
        return Promise.all(pr).then(val => {
            let models = new Map();
            let toFind = new Map();
            let tagToName = new Map();
            val.forEach(v => {
                let options = {
                    database: this.options.database,
                    shouldQueryNow: this.options.shouldQueryNow
                };
                let model = new v(options);
                this.models.push(model);
                let colsToFind = Object.keys(model.columns).filter(val => model.columns[val].find).map(v => model.columns[v].find);
                let colsToBeEqual = Object.keys(model.columns).filter(val => model.columns[val].equals).map(v => [model.columns[v].equals, v]);
                let tags = Object.keys(model.columns).filter(val => model.columns[val].find).map(v => [model.columns[v].find, v]);
                let valueOptions = Object.keys(model.columns).filter(val => model.columns[val].valueOptions).map(v => [v, model.columns[v].valueOptions]);
                models.set(model.constructor.name, new Map([
                    ['groupBy', model.groupBy],
                    ['toFind', colsToFind],
                    [
                        'foundValues', (() => {
                        let values = new Map();
                        Object.keys(model.columns).filter(val => model.columns[val].defaultValue).forEach(data => {
                            values.set(data, model.columns[data].defaultValue)
                        });
                        return values;
                    })()
                    ],
                    ['equalCols', new Map(colsToBeEqual)],
                    ['valueOptions', new Map(valueOptions)]
                ]));
                colsToFind.forEach(col => {
                    toFind.setOrCombine(col, [model.constructor.name]);
                });
                tags.forEach(tag => {
                    tagToName.setOrCombine(tag[0], [tag[1]]);
                });

            });
            return [models, toFind, tagToName];
        }).spread((models, toFind, tagToName) => {
            let results = new Set(),
                foundNext = false;
            this.parser.onopentag = node => {
                let parser = this.parser,
                    tagName = this.createDotNotation(parser.tags, parser.tag.name);
                if (toFind.has(tagName) && parser.tag.isSelfClosing == true) {
                    results.deepMapAppendOrNew(tagToName.get(tagName), '');
                }
            };
            this.parser.ontext = text => {
                let parser = this.parser,
                    textNode = text.replace(/\\n/g, '').trim(),
                    tagName = this.createDotNotation(parser.tags, parser.tag.name);
                if (toFind.has(tagName) && textNode !== '') {
                    results.deepMapAppendOrNew(tagToName.get(tagName), this.valueFunctions(textNode, tagToName.get(tagName), models))
                }
                /*if (!foundNext && toFind.has(textNode + ':' + tagName) && textNode !== '') {
                 foundNext = tagToName.get(textNode + ':' + tagName);
                 } else if (foundNext && toFind.has(textNode + ':' + tagName) && textNode !== ''){
                 for (let val of models.values()) {
                 val.get('toFind').forEach(data => {
                 if (tagToName.get(data) == foundNext) {
                 results.deepMapAppendOrNew(tagToName.get(data), this.valueFunctions(textNode, tagToName.get(data), models));
                 }
                 })
                 }
                 foundNext = false;
                 }*/
            };
            this.parser.write(xml);
            return [results, models, toFind, tagToName];
        }).spread((res, models, toFind, tagToName) => {
            let toFill = new Map();
            let resultGroup;
            this.parser.close();
            for (let [modelName, modelData] of models.entries()) {
                let finder = new Map();
                res.forEach(result => {
                    let foundValues = new Map();
                    let flattenedUnique = Array.from(result.keys())
                        .reduce((a, b) => a.concat(b))
                        .filter((item, pos, self) => self.indexOf(item) == pos);
                    flattenedUnique.forEach(col => {
                            modelData.get('toFind').forEach(val => {
                                if (~tagToName.get(val).indexOf(col)) {
                                    for (let [k,v] of result.entries()) {
                                        if (~k.indexOf(col)) {
                                            foundValues.set(col, v)
                                        }
                                    }
                                }
                            });
                        });
                    if (modelData.get('groupBy').length > 0) {
                        modelData.get('groupBy').forEach(group => {
                            if (~flattenedUnique.indexOf(group)) {
                                for (let [k,v] of result.entries()) {
                                    if (~k.indexOf(group)) {
                                        resultGroup = v;
                                    }
                                }
                            }
                            if (resultGroup) {
                                foundValues.set(group, resultGroup)
                            }
                        })
                    }
                    for (let [dKey,dValue] of modelData.get('foundValues').entries()) {
                        foundValues.set(dKey, dValue);
                    }
                    for (let [eKey,eValue] of modelData.get('equalCols').entries()) {
                        foundValues.set(eValue, foundValues.get(eKey))
                    }
                    finder.set(finder.size, new Map(Array.from(foundValues.entries()).sort()));
                });
                toFill.set(modelName, finder);
            }
            return toFill;
        }).then(toFill => {
            return this.models.map(model => {
                let name = model.constructor.name;
                model.functionsAfterParse.forEach(func => {
                    Promise.resolve(model._getFunctions(func)({
                        table: name,
                        fields: toFill.get(name)
                    })).then(val => val);
                });
            });
        });
    }

    valueFunctions(text, column, models) {
        let tmp = column[0];
        this.models.forEach(model => {
            if (models.get(model.constructor.name).get('valueOptions').has(tmp)) {
                let all = models.get(model.constructor.name).get('valueOptions').get(tmp);
                Object.keys(all).forEach(val => {
                    if (~['replace', 'regex'].indexOf(val)) {
                        let re = new RegExp(Object.keys(all[val]).join("|"), "gi");
                        text = text.replace(re, matched => all[val][matched]);
                    }
                });
            }
        });
        return text;
    }

    createDotNotation(arr, name) {
        return arr.map(val => val.name).join('.') + (name ? '.' + name : '');
    }

    parseString(xml, models, options) {
        if ('object' === typeof models && models.toDotNotation === true) {
            return Promise.resolve(this.getDotNotation(xml));
        }
        return Promise.resolve(this.parse(xml, models, options));
    }

    parseFile(file, models, options) {
        if ('object' === typeof models && models.toDotNotation === true) {
            return fs.readFileAsync(file).then(val => this.getDotNotation(val.toString()));
        }
        return fs.readFileAsync(file).then(val => this.parse(val.toString(), models, options));
    }

    getDotNotation(xml) {
        let dotNotated = [];
        this.parser.ontext = text => {
            let parser = this.parser;
            dotNotated.push(this.createDotNotation(parser.tags, parser.tag.name))
        };
        this.parser.write(xml).close();
        return dotNotated.filter((item, pos, self) => self.indexOf(item) == pos);
    }

}

module.exports = XmlParser;

