/**
 * data2model
 * Author: michael
 * Date: 19.09.15.
 * License: MIT
 */
'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var sax = require('sax');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs-extra'));
var log = require('deep-logger').deepLogger;
var __ = require('le-map-e');
var appRoot = require('app-root-path');
var reqLib = appRoot.require;

var XmlParser = (function () {
    function XmlParser(options) {
        _classCallCheck(this, XmlParser);

        if (!options) options = {};
        this.options = Object.assign({
            shouldQueryNow: true,
            useStrict: true
        }, options);
        this.parser = new sax.parser(this.options.useStrict);
        this.models = [];
    }

    _createClass(XmlParser, [{
        key: 'handleModel',
        value: function handleModel(models) {
            return models.map(function (val) {
                return reqLib('/models/' + val + '.js');
            });
        }
    }, {
        key: 'parse',
        value: function parse(xml, models, options) {
            var _this = this;

            var pr = this.handleModel(models);
            return Promise.all(pr).then(function (val) {
                var models = new Map();
                var toFind = new Map();
                var tagToName = new Map();
                val.forEach(function (v) {
                    var options = {
                        database: _this.options.database,
                        shouldQueryNow: _this.options.shouldQueryNow
                    };
                    var model = new v(options);
                    _this.models.push(model);
                    var colsToFind = Object.keys(model.columns).filter(function (val) {
                        return model.columns[val].find;
                    }).map(function (v) {
                        return model.columns[v].find;
                    });
                    var colsToBeEqual = Object.keys(model.columns).filter(function (val) {
                        return model.columns[val].equals;
                    }).map(function (v) {
                        return [model.columns[v].equals, v];
                    });
                    var tags = Object.keys(model.columns).filter(function (val) {
                        return model.columns[val].find;
                    }).map(function (v) {
                        return [model.columns[v].find, v];
                    });
                    var valueOptions = Object.keys(model.columns).filter(function (val) {
                        return model.columns[val].valueOptions;
                    }).map(function (v) {
                        return [v, model.columns[v].valueOptions];
                    });
                    models.set(model.constructor.name, new Map([['groupBy', model.groupBy], ['toFind', colsToFind], ['foundValues', (function () {
                        var values = new Map();
                        Object.keys(model.columns).filter(function (val) {
                            return model.columns[val].defaultValue;
                        }).forEach(function (data) {
                            values.set(data, model.columns[data].defaultValue);
                        });
                        return values;
                    })()], ['equalCols', new Map(colsToBeEqual)], ['valueOptions', new Map(valueOptions)]]));
                    colsToFind.forEach(function (col) {
                        toFind.setOrCombine(col, [model.constructor.name]);
                    });
                    tags.forEach(function (tag) {
                        tagToName.setOrCombine(tag[0], [tag[1]]);
                    });
                });
                return [models, toFind, tagToName];
            }).spread(function (models, toFind, tagToName) {
                var results = new Set(),
                    foundNext = false;
                _this.parser.onopentag = function (node) {
                    var parser = _this.parser,
                        tagName = _this.createDotNotation(parser.tags, parser.tag.name);
                    if (toFind.has(tagName) && parser.tag.isSelfClosing == true) {
                        results.deepMapAppendOrNew(tagToName.get(tagName), '');
                    }
                };
                _this.parser.ontext = function (text) {
                    var parser = _this.parser,
                        textNode = text.replace(/\\n/g, '').trim(),
                        tagName = _this.createDotNotation(parser.tags, parser.tag.name);
                    if (toFind.has(tagName) && textNode !== '') {
                        results.deepMapAppendOrNew(tagToName.get(tagName), _this.valueFunctions(textNode, tagToName.get(tagName), models));
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
                _this.parser.write(xml);
                return [results, models, toFind, tagToName];
            }).spread(function (res, models, toFind, tagToName) {
                var toFill = new Map();
                var resultGroup = undefined;
                _this.parser.close();
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    var _loop = function () {
                        var _step$value = _slicedToArray(_step.value, 2);

                        var modelName = _step$value[0];
                        var modelData = _step$value[1];

                        var finder = new Map();
                        res.forEach(function (result) {
                            var foundValues = new Map();
                            var flattenedUnique = Array.from(result.keys()).reduce(function (a, b) {
                                return a.concat(b);
                            }).filter(function (item, pos, self) {
                                return self.indexOf(item) == pos;
                            });
                            flattenedUnique.forEach(function (col) {
                                modelData.get('toFind').forEach(function (val) {
                                    if (~tagToName.get(val).indexOf(col)) {
                                        var _iteratorNormalCompletion2 = true;
                                        var _didIteratorError2 = false;
                                        var _iteratorError2 = undefined;

                                        try {
                                            for (var _iterator2 = result.entries()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                                var _step2$value = _slicedToArray(_step2.value, 2);

                                                var k = _step2$value[0];
                                                var v = _step2$value[1];

                                                if (~k.indexOf(col)) {
                                                    foundValues.set(col, v);
                                                }
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
                                    }
                                });
                            });
                            if (modelData.get('groupBy').length > 0) {
                                modelData.get('groupBy').forEach(function (group) {
                                    if (~flattenedUnique.indexOf(group)) {
                                        var _iteratorNormalCompletion3 = true;
                                        var _didIteratorError3 = false;
                                        var _iteratorError3 = undefined;

                                        try {
                                            for (var _iterator3 = result.entries()[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                                                var _step3$value = _slicedToArray(_step3.value, 2);

                                                var k = _step3$value[0];
                                                var v = _step3$value[1];

                                                if (~k.indexOf(group)) {
                                                    resultGroup = v;
                                                }
                                            }
                                        } catch (err) {
                                            _didIteratorError3 = true;
                                            _iteratorError3 = err;
                                        } finally {
                                            try {
                                                if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                                                    _iterator3['return']();
                                                }
                                            } finally {
                                                if (_didIteratorError3) {
                                                    throw _iteratorError3;
                                                }
                                            }
                                        }
                                    }
                                    if (resultGroup) {
                                        foundValues.set(group, resultGroup);
                                    }
                                });
                            }
                            var _iteratorNormalCompletion4 = true;
                            var _didIteratorError4 = false;
                            var _iteratorError4 = undefined;

                            try {
                                for (var _iterator4 = modelData.get('foundValues').entries()[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                                    var _step4$value = _slicedToArray(_step4.value, 2);

                                    var dKey = _step4$value[0];
                                    var dValue = _step4$value[1];

                                    foundValues.set(dKey, dValue);
                                }
                            } catch (err) {
                                _didIteratorError4 = true;
                                _iteratorError4 = err;
                            } finally {
                                try {
                                    if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                                        _iterator4['return']();
                                    }
                                } finally {
                                    if (_didIteratorError4) {
                                        throw _iteratorError4;
                                    }
                                }
                            }

                            var _iteratorNormalCompletion5 = true;
                            var _didIteratorError5 = false;
                            var _iteratorError5 = undefined;

                            try {
                                for (var _iterator5 = modelData.get('equalCols').entries()[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                                    var _step5$value = _slicedToArray(_step5.value, 2);

                                    var eKey = _step5$value[0];
                                    var eValue = _step5$value[1];

                                    foundValues.set(eValue, foundValues.get(eKey));
                                }
                            } catch (err) {
                                _didIteratorError5 = true;
                                _iteratorError5 = err;
                            } finally {
                                try {
                                    if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                                        _iterator5['return']();
                                    }
                                } finally {
                                    if (_didIteratorError5) {
                                        throw _iteratorError5;
                                    }
                                }
                            }

                            finder.set(finder.size, new Map(Array.from(foundValues.entries()).sort()));
                        });
                        toFill.set(modelName, finder);
                    };

                    for (var _iterator = models.entries()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        _loop();
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

                return toFill;
            }).then(function (toFill) {
                return _this.models.map(function (model) {
                    var name = model.constructor.name;
                    model.functionsAfterParse.forEach(function (func) {
                        Promise.resolve(model._getFunctions(func)({
                            table: name,
                            fields: toFill.get(name)
                        })).then(function (val) {
                            return val;
                        });
                    });
                });
            });
        }
    }, {
        key: 'valueFunctions',
        value: function valueFunctions(text, column, models) {
            var tmp = column[0];
            this.models.forEach(function (model) {
                if (models.get(model.constructor.name).get('valueOptions').has(tmp)) {
                    (function () {
                        var all = models.get(model.constructor.name).get('valueOptions').get(tmp);
                        Object.keys(all).forEach(function (val) {
                            if (~['replace', 'regex'].indexOf(val)) {
                                var re = new RegExp(Object.keys(all[val]).join("|"), "gi");
                                text = text.replace(re, function (matched) {
                                    return all[val][matched];
                                });
                            }
                        });
                    })();
                }
            });
            return text;
        }
    }, {
        key: 'createDotNotation',
        value: function createDotNotation(arr, name) {
            return arr.map(function (val) {
                return val.name;
            }).join('.') + (name ? '.' + name : '');
        }
    }, {
        key: 'parseString',
        value: function parseString(xml, models, options) {
            if ('object' === typeof models && models.toDotNotation === true) {
                return Promise.resolve(this.getDotNotation(xml));
            }
            return Promise.resolve(this.parse(xml, models, options));
        }
    }, {
        key: 'parseFile',
        value: function parseFile(file, models, options) {
            var _this2 = this;

            if ('object' === typeof models && models.toDotNotation === true) {
                return fs.readFileAsync(file).then(function (val) {
                    return _this2.getDotNotation(val.toString());
                });
            }
            return fs.readFileAsync(file).then(function (val) {
                return _this2.parse(val.toString(), models, options);
            });
        }
    }, {
        key: 'getDotNotation',
        value: function getDotNotation(xml) {
            var _this3 = this;

            var dotNotated = [];
            this.parser.ontext = function (text) {
                var parser = _this3.parser;
                dotNotated.push(_this3.createDotNotation(parser.tags, parser.tag.name));
            };
            this.parser.write(xml).close();
            return dotNotated.filter(function (item, pos, self) {
                return self.indexOf(item) == pos;
            });
        }
    }]);

    return XmlParser;
})();

module.exports = XmlParser;

//# sourceMappingURL=XmlParser.js.map