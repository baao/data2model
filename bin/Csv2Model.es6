/**
 * data2model
 * Author: michael
 * Date: 11.09.15.
 * License: MIT
 */
'use strict';
require('dotenv').load();
const log = require('deep-logger').deepLogger;
const sax = require('sax');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs-extra'));
const Exceptions = require('./Exceptions.js');
const NotFoundError = Exceptions.NotFoundError;
const ModelNotFoundError = Exceptions.ModelNotFoundError;
const NoInputFile = Exceptions.NoInputFile;
const appRoot = require('app-root-path');
const reqLib = appRoot.require;

class Csv2Model {
    constructor(options) {
        if (!options) {
            options = {};
        }
        this.file = appRoot + options.file;
        this.loadModel = options.model;
        this.options = Object.assign({
            delimiter: '\t',
            lineEnding: '\n',
            enclosedBy: '\"',
            encoding: 'utf8',
            useAlias: false,
            useHeader: 0,
            shouldQueryNow: false
        }, options);
        // TODO: DELIMITER
        this.options._delimiter = '\\t';
    }

    saveFile(fileName, data) {
        return Promise.resolve(fs.createOutputStream(appRoot + '/' + fileName))
            .then(file => {
                file.write(data)
            });
    }

    parse() {
        return Promise.try(() => {
            if (!this.file || !this.loadModel) {
                let errorMsg = this.loadModel ? 'No csv selected' : 'No model selected';
                throw new NoInputFile(errorMsg)
            }
            try {
                return reqLib(`/models/${this.loadModel}`)
            } catch (e) {
            }
        }).then(model => {
            if (typeof model == 'function') {
                let options = {
                    database: this.options.database,
                    shouldQueryNow: this.options.shouldQueryNow
                };
                this.model = new model(options);
                if (this.model.functionsBeforeParse) {
                    this.runModelFunctions({
                        table: this.options.table || this.loadModel.replace('-compiled', ''),
                        timing: 'functionsBeforeParse'
                    });
                }
                return true;
            }
            throw new ModelNotFoundError(`The model ${this.loadModel} was not found!`)
        }).then(() => {
            if (this.model.firstLine && typeof this.model.firstLine[this.options.useHeader] == 'string') {
                return this.model.firstLine[this.options.useHeader]
                    .split(this.options.delimiter)
                    .map(val => val.trim());
            } else {
                return fs.readFileAsync(this.file)
                    .then(val => val.toString()
                        .split(this.options.lineEnding)[0]
                        .split(this.options.delimiter)
                        .map(val => val.trim())
                );
            }
        }).then(firstLine => {
            let result = new Map(),
                length = firstLine.length,
                insertMap = new Map(),
                setSet = new Set();
            Object.keys(this.model.columns)
                .filter(val => (this.model.columns[val].find || this.model.columns[val].defaultValue || this.model.columns[val].equals))
                .forEach(val => {
                    let options = this.model.columns[val],
                        findOption = 'find';
                    options.name = val;
                    options.shouldVariable = '';
                    if (options.alias && (typeof this.options.useAlias == 'boolean' && this.options.useAlias == true) || (this.options.useAlias instanceof Array && ~this.options.useAlias.indexOf(val))) {
                        findOption = 'alias';
                    }
                    if (~firstLine.indexOf(options[findOption])) {
                        options.indexes = firstLine.indexOf(options[findOption]);
                        options.shouldVariable = options.valueOptions ? '@' : '';
                        options.addSet = options.valueOptions ? val : false;
                        if (options.addSet) {
                            setSet.add(options.shouldVariable + val);
                        }
                        insertMap.set(options.indexes, options.shouldVariable + val);
                    } else {
                        if (!options[findOption]) {
                            if (options.defaultValue) {
                                options.addSet = val;
                                setSet.add(options.shouldVariable + val);
                            } else {
                                if (!options[findOption]) {
                                    throw new NotFoundError(val + ' has no finder')
                                } else {
                                    throw new NotFoundError('No index found for ' + options[findOption])
                                }
                            }
                        }
                    }
                    result.set(options.shouldVariable + val, options);
                });
            return [result, insertMap, setSet, length];
        }).spread((res, inserts, sets, length) => {
            let insertsMap = new Map(),
                columnsString,
                setsString = '';
            for (let [i,field] of this.getQueryDummy(0, length, 1)) {
                insertsMap.set(i, inserts.has(i) ? inserts.get(i) : field);
            }
            columnsString = Array.from(insertsMap.values())
                .toString()
                .replace(/(,@dummy)+$/, '');

            for (let key of sets.keys()) {
                setsString += key.replace('@', '') + '=' +
                    (res.get(key).defaultValue ?
                    '"' + (res.get(key).defaultValue + '", ') :
                    (Object.keys(res.get(key).valueOptions)[0] + '(' + res.get(key).valueOptions[Object.keys(res.get(key).valueOptions)[0]]).replace(/(:\w+)/, key) + '), ');
            }
            setsString = setsString.replace(/(, )+$/, '');
            return [columnsString, setsString];
        }).spread((cs, ss) => {
            return Promise.resolve(this.runModelFunctions({
                file: this.file,
                table: this.options.table || this.loadModel.replace('-compiled', ''),
                timing: 'functionsAfterParse',
                cs: cs,
                ss: ss
            }));
        })
            .catch(NotFoundError, err => (err))
            .catch(ModelNotFoundError, err => (err))
            .catch(NoInputFile, err => (err))
            .catch(Error, err => (err))
    }

    runModelFunctions(options) {
        if (!options) {
            options = {}
        }
        options = Object.assign({
            options: {
                encoding: this.options.encoding.toUpperCase(),
                delimiter: this.options._delimiter,
                enclosedBy: this.options.enclosedBy
            },
            needTemporaryTable: this.model.needTemporaryTable
        }, options);
        return Promise.each(this.model[options.timing], (v) => {
            this.model._getFunctions(v)(options).then(val => {
                if (val.length > 1) {
                    this.model.transactionQuery(val.join(';'), {
                        table: options.table,
                        runChecks: this.model.checkFunctionAfterParse,
                        savePoint: this.model.savePoint,
                        needTemporaryTable: options.needTemporaryTable,
                        timing: options.timing
                    }).then(res => res);
                } else {
                    this.model.query(val.toString()).then(res => res);
                }
            });
        });
    }

    *getQueryDummy(start, end, step) {
        while (start < end) {
            yield [start, '@dummy'];
            start += step;
        }
    }
}

module.exports = Csv2Model;