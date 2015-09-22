/**
 * xml2model
 * Author: michael
 * Date: 11.09.15.
 * License: MIT
 */
'use strict';
const Csv2Model = require('./../bin/Csv2Model.js');
const fs = require('fs-extra');
var assert = require("assert");
function ModelNotFoundError(message) {
    this.message = message;
    this.name = "ModelNotFoundError";
    Error.captureStackTrace(this, ModelNotFoundError);
}
ModelNotFoundError.prototype = Object.create(Error.prototype);
ModelNotFoundError.prototype.constructor = ModelNotFoundError;
describe('Csv2Model', function () {

    describe('#saveFile()', ()  => {
        it('should save a file with the given data', done => {
            let fileName = "/opt/PhpstormProjects/xml2model/xml2model/userData/file.csv";
            let data = 'a\tb\tc\t\n2\t3\t4\t\n';
            new Csv2Model().saveFile(fileName, data).then(() => {
                fs.readFileAsync(fileName).then(val => {

                    done();
                });
            });
        });
    });

    describe('#parse()', function () {
        it('shouldnt throw any errors', done => {
            let model = new Csv2Model({
                model: 'de_products-compiled',
                file: 'fileLarge.csv',
                database: 'usertable200'
            });
            model.parse().then(val => {
                console.log(val);
                done();
            });
        })
    });
});

