/**
 * xml2model
 * Author: michael
 * Date: 19.09.15.
 * License: MIT
 */
'use strict';
const XmlParser = require('./../bin/XmlParser.js');
const assert = require("assert");
const should = require('chai').should();
const QueryBuilder = require('./../bin/QueryBuilder.js');
describe('XmlParser', function () {

    describe('#parseFile()', () => {
        it('should save all matched entries from the xml to the database', done => {
                let parser = new XmlParser({database: 'usertable200'});
                parser.parseFile("/opt/PhpstormProjects/xml2model/xml2model/xmllarge.xml", ['all_all_orders-compiled']).then(val => {
                    done();
                });
        });
    });

    describe('#getDotNotation()', () => {
        it('should output an array holding the xml tags dot notated', done => {
            let parser = new XmlParser().parseFile("/opt/PhpstormProjects/xml2model/xml2model/xmllarge.xml", {toDotNotation: true}).then(val => {
                val.should.be.a('Array');
                console.log(val);
                done();
            });
        })
    });

});