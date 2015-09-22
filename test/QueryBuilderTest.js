/**
 * xml2model
 * Author: michael
 * Date: 15.09.15.
 * License: MIT
 */
'use strict';
const QueryBuilder = require('./../bin/QueryBuilder.js');
const assert = require("assert");

describe('QueryBuilder', function () {

    describe('#createTable()', function () {
        it('should create a table called testTable0815', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            let testData = new Map();
            testData.set('testColumn1', 'VARCHAR(150)');
            testData.set('testColumn2', 'INT');
            builder.createTable('testTable0815', testData).then(val => {
                done();

            });
        });
    });

    describe('#upsert()', function () {
        it('should insert the testdata into the table', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            let testData = new Map();
            for (let i = 0; i < 100; i++) {
                testData.set(i, new Map([['testColumn1', i], ['testColumn2', i * 2], ['updated_at', new Date().toISOString()]]));
            }
            builder.upsert('testTable0815', testData).then(val => {
                done();

            });
        });
    });

    describe('#insert()', function () {
        it('should insert the testdata into the table', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            let testData = new Map();
            for (let i = 0; i < 100; i++) {
                testData.set(i, new Map([['testColumn1', i * 100], ['testColumn2', i * 200], ['updated_at', new Date().toISOString()]]));
            }
            builder.insert('testTable0815', testData).then(val => {
                done();

            });
        });
    });

    describe('#update()', function () {
        it('should update testColumn1 from 25 to 2000', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            builder.update('testTable0815', new Map([['update', new Map([['testColumn1', 2000]])], ['where', new Map([['testColumn1', 25]])]])).then(val => {
                done();

            });
        });
    });

    describe('#select()', function () {
        it('should find all rows from the table without conditions', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            builder.select('testTable0815').then(val => {
                assert.equal(200, val.length);
                done();

            });
        });
    });

    describe('#select()', function () {
        it('should find all columns and rows from the table with matching conditions', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            builder.select('testTable0815', new Map([['where', new Map([['testColumn1', 50]])]])).then(val => {
                assert.equal(1, val.length);
                done();

            });
        });
    });

    describe('#select()', function () {
        it('should find the columns id,updated_at,testColumn2,testColumn1 from the row where testColumn1 has the value 50', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            builder.select('testTable0815', new Map([['whereIn', new Map([['testColumn1', [50, 51]]])], ['select', ['id', 'updated_at', 'testColumn2', 'testColumn1']]])).then(val => {
                assert.equal(2, val.length);
                done();

            });
        });
    });

    describe('#rm()', function () {
        it('should delete the row where testColumn1 has the value 75', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            builder.rm('testTable0815', new Map([['whereIn', new Map([['testColumn1', [76, 77]]])]])).then(val => {
                assert.equal(2, val.affectedRows);
                done();

            });
        });
    });

    describe('#truncate()', function () {
        it('should truncate the table', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            builder.truncate('testTable0815').then(val => {
                done();

            });
        });
    });

    describe('#dropTable()', function () {
        it('should drop a table called testTable0815', function (done) {
            let builder = new QueryBuilder('usertable200', {shouldQueryNow: true});
            builder.drop('testTable0815').then(val => {
                done();

            });
        });
    });
});
