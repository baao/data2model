/**
 *  data2model
 * Author: michael
 * Date: 22.09.15.
 * License: MIT
 */
'use strict';
const _Parser = require('./../index');
const XmlParser = _Parser.xml;
const CsvParser = _Parser.csv;
let parser = new XmlParser({database: 'databaseToUse'});
parser.parseFile("./examples/example.xml", ['exampleModel'])
    .catch(err => {
        console.log(err);
    });
parser.parseFile("./examples/example.xml", {toDotNotation:true}).then(val => console.log(val));
let model = new CsvParser({
    model: 'model',
    file: 'file.csv',
    database: 'database'
});
model.parse();