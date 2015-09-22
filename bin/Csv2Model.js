/**
 * data2model
 * Author: michael
 * Date: 11.09.15.
 * License: MIT
 */
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

require('dotenv').load();
var log = require('deep-logger').deepLogger;
var sax = require('sax');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var Exceptions = require('./Exceptions.js');
var NotFoundError = Exceptions.NotFoundError;
var ModelNotFoundError = Exceptions.ModelNotFoundError;
var NoInputFile = Exceptions.NoInputFile;
var appRoot = require('app-root-path');
var reqLib = appRoot.require;

var Csv2Model = (function () {
    function Csv2Model(options) {
        _classCallCheck(this, Csv2Model);

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

    _createClass(Csv2Model, [{
        key: 'saveFile',
        value: function saveFile(fileName, data) {
            return Promise.resolve(fs.createOutputStream(appRoot + '/' + fileName)).then(function (file) {
                file.write(data);
            });
        }
    }, {
        key: 'parse',
        value: function parse() {
            var _this = this;

            return Promise['try'](function () {
                if (!_this.file || !_this.loadModel) {
                    var errorMsg = _this.loadModel ? 'No csv selected' : 'No model selected';
                    throw new NoInputFile(errorMsg);
                }
                try {
                    return reqLib('/models/' + _this.loadModel);
                } catch (e) {}
            }).then(function (model) {
                if (typeof model == 'function') {
                    var options = {
                        database: _this.options.database,
                        shouldQueryNow: _this.options.shouldQueryNow
                    };
                    _this.model = new model(options);
                    if (_this.model.functionsBeforeParse) {
                        _this.runModelFunctions({
                            table: _this.options.table || _this.loadModel.replace('-compiled', ''),
                            timing: 'functionsBeforeParse'
                        });
                    }
                    return true;
                }
                throw new ModelNotFoundError('The model ' + _this.loadModel + ' was not found!');
            }).then(function () {
                if (_this.model.firstLine && typeof _this.model.firstLine[_this.options.useHeader] == 'string') {
                    return _this.model.firstLine[_this.options.useHeader].split(_this.options.delimiter).map(function (val) {
                        return val.trim();
                    });
                } else {
                    return fs.readFileAsync(_this.file).then(function (val) {
                        return val.toString().split(_this.options.lineEnding)[0].split(_this.options.delimiter).map(function (val) {
                            return val.trim();
                        });
                    });
                }
            }).then(function (firstLine) {
                var result = new Map(),
                    length = firstLine.length,
                    insertMap = new Map(),
                    setSet = new Set();
                Object.keys(_this.model.columns).filter(function (val) {
                    return _this.model.columns[val].find || _this.model.columns[val].defaultValue || _this.model.columns[val].equals;
                }).forEach(function (val) {
                    var options = _this.model.columns[val],
                        findOption = 'find';
                    options.name = val;
                    options.shouldVariable = '';
                    if (options.alias && (typeof _this.options.useAlias == 'boolean' && _this.options.useAlias == true) || _this.options.useAlias instanceof Array && ~_this.options.useAlias.indexOf(val)) {
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
                                    throw new NotFoundError(val + ' has no finder');
                                } else {
                                    throw new NotFoundError('No index found for ' + options[findOption]);
                                }
                            }
                        }
                    }
                    result.set(options.shouldVariable + val, options);
                });
                return [result, insertMap, setSet, length];
            }).spread(function (res, inserts, sets, length) {
                var insertsMap = new Map(),
                    columnsString = undefined,
                    setsString = '';
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = _this.getQueryDummy(0, length, 1)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var _step$value = _slicedToArray(_step.value, 2);

                        var i = _step$value[0];
                        var field = _step$value[1];

                        insertsMap.set(i, inserts.has(i) ? inserts.get(i) : field);
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                columnsString = Array.from(insertsMap.values()).toString().replace(/(,@dummy)+$/, '');

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = sets.keys()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var key = _step2.value;

                        setsString += key.replace('@', '') + '=' + (res.get(key).defaultValue ? '"' + (res.get(key).defaultValue + '", ') : (Object.keys(res.get(key).valueOptions)[0] + '(' + res.get(key).valueOptions[Object.keys(res.get(key).valueOptions)[0]]).replace(/(:\w+)/, key) + '), ');
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                setsString = setsString.replace(/(, )+$/, '');
                return [columnsString, setsString];
            }).spread(function (cs, ss) {
                return Promise.resolve(_this.runModelFunctions({
                    file: _this.file,
                    table: _this.options.table || _this.loadModel.replace('-compiled', ''),
                    timing: 'functionsAfterParse',
                    cs: cs,
                    ss: ss
                }));
            })['catch'](NotFoundError, function (err) {
                return log(err);
            })['catch'](ModelNotFoundError, function (err) {
                return log(err);
            })['catch'](NoInputFile, function (err) {
                return log(err);
            })['catch'](Error, function (err) {
                return log(err);
            });
        }
    }, {
        key: 'runModelFunctions',
        value: function runModelFunctions(options) {
            var _this2 = this;

            if (!options) {
                options = {};
            }
            options = Object.assign({
                options: {
                    encoding: this.options.encoding.toUpperCase(),
                    delimiter: this.options._delimiter,
                    enclosedBy: this.options.enclosedBy
                },
                needTemporaryTable: this.model.needTemporaryTable
            }, options);
            return Promise.each(this.model[options.timing], function (v) {
                _this2.model._getFunctions(v)(options).then(function (val) {
                    if (val.length > 1) {
                        _this2.model.transactionQuery(val.join(';'), {
                            table: options.table,
                            runChecks: _this2.model.checkFunctionAfterParse,
                            savePoint: _this2.model.savePoint,
                            needTemporaryTable: options.needTemporaryTable,
                            timing: options.timing
                        }).then(function (res) {
                            return res;
                        });
                    } else {
                        _this2.model.query(val.toString()).then(function (res) {
                            return res;
                        });
                    }
                });
            });
        }
    }, {
        key: 'getQueryDummy',
        value: regeneratorRuntime.mark(function getQueryDummy(start, end, step) {
            return regeneratorRuntime.wrap(function getQueryDummy$(context$2$0) {
                while (1) switch (context$2$0.prev = context$2$0.next) {
                    case 0:
                        if (!(start < end)) {
                            context$2$0.next = 6;
                            break;
                        }

                        context$2$0.next = 3;
                        return [start, '@dummy'];

                    case 3:
                        start += step;
                        context$2$0.next = 0;
                        break;

                    case 6:
                    case 'end':
                        return context$2$0.stop();
                }
            }, getQueryDummy, this);
        })
    }]);

    return Csv2Model;
})();

module.exports = Csv2Model;

//# sourceMappingURL=Csv2Model.js.map