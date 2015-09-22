/**
 * data2model
 * Author: michael
 * Date: 16.09.15.
 * License: MIT
 */
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var QueryBuilder = require('./../bin/QueryBuilder.js');
var Promise = require('bluebird');

var _BaseModel = (function (_QueryBuilder) {
    _inherits(_BaseModel, _QueryBuilder);

    function _BaseModel(options) {
        var _this = this;

        _classCallCheck(this, _BaseModel);

        _get(Object.getPrototypeOf(_BaseModel.prototype), 'constructor', this).call(this, options.database, { shouldQueryNow: options.shouldQueryNow });
        this._options = {};
        this._functions = new Map([['saveData', function (data) {
            return Promise.all([_this.upsert(data.table, data.fields, { onDuplicateKeyUpdate: [] })]);
        }]]);
    }

    _createClass(_BaseModel, [{
        key: '_getFunctions',
        value: function _getFunctions(name) {
            return this._functions.get(name);
        }
    }]);

    return _BaseModel;
})(QueryBuilder);

module.exports = _BaseModel;

//# sourceMappingURL=_BaseModel.js.map