/**
 * data2model
 * Author: michael
 * Date: 09.09.15.
 * License: MIT
 */
import fs from 'fs-extra';
import appRoot from 'app-root-path';
const reqLib = appRoot.require;

class ModelCreator {
    constructor(data) {
        let ws = fs.createOutputStream(`${appRoot}/models/${data.get('_tableName_')}.es6`),
            columnData = [],
            tableName = data.get('_tableName_'),
            comment = '/**\n * xml2model model for ' + tableName + '\n * createdBy: ModelCreator\n * created: ' + new Date().toISOString() + '\n * License: MIT\n **/',
            requireFiles = '"use strict";\nconst _BaseModel = require("./_BaseModel.js");',
            fileHeader = `
class ${tableName} extends _BaseModel {
    constructor(options) {
        options = options || {};
        super(options);
        this.groupBy = [];
        this.firstLine = [];
        this.functionsBeforeParse = [];
        this.functionsAfterParse = [];
        this.checkFunctionAfterParse = '';
        // this.savePoint = '';
        // this.needTemporaryTable = false;
        this.columns = {
            :columnData:
        }`;
        data.delete('_tableName_');
        for (let [key,value] of data.entries()) {
            columnData.push(`
            ${key} : {
                ${value.has('find') ? 'find: "' + value.get('find') + '"' : '// find: null'},
                ${value.has('exclude') ? 'exclude: true' : '//exclude: null'},
                ${value.has('defaultValue') ? 'defaultValue: ' + value.get('defaultValue') : '// defaultValue: false'},
                // valueOptions: {
                //    replace: {},
                //    regex: {}
                // }
            },
            `)
        }
        fileHeader = fileHeader.replace(':columnData:', columnData.join(' ').trim().replace(/,$/, ''));
        ws.write(comment + '\n\n' + requireFiles + '\n\n' + fileHeader + '\n\n\t}\n}\n\n' + 'export default ' + tableName + ';');
        return true;
    }
}
export default ModelCreator;