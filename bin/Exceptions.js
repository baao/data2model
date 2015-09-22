/**
 * data2model
 * Author: michael
 * Date: 12.09.15.
 * License: MIT
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Exceptions = function Exceptions(message) {
    _classCallCheck(this, Exceptions);

    Error.call(this, message);
    this.message = message;
    Error.captureStackTrace(this, this.constructor);
    Object.defineProperty(this, 'name', {
        configurable: true,
        enumerable: false,
        value: this.constructor.name
    });
};

Exceptions.prototype = new Error();

var NotFoundError = (function (_Exceptions) {
    _inherits(NotFoundError, _Exceptions);

    function NotFoundError(message) {
        _classCallCheck(this, NotFoundError);

        _get(Object.getPrototypeOf(NotFoundError.prototype), 'constructor', this).call(this, message);
        this.message = message;
    }

    return NotFoundError;
})(Exceptions);

var ModelNotFoundError = (function (_Exceptions2) {
    _inherits(ModelNotFoundError, _Exceptions2);

    function ModelNotFoundError(message) {
        _classCallCheck(this, ModelNotFoundError);

        _get(Object.getPrototypeOf(ModelNotFoundError.prototype), 'constructor', this).call(this, message);
        this.message = message;
    }

    return ModelNotFoundError;
})(Exceptions);

var NoInputFile = (function (_Exceptions3) {
    _inherits(NoInputFile, _Exceptions3);

    function NoInputFile(message) {
        _classCallCheck(this, NoInputFile);

        _get(Object.getPrototypeOf(NoInputFile.prototype), 'constructor', this).call(this, message);
        this.message = message;
    }

    return NoInputFile;
})(Exceptions);

exports['default'] = Exceptions;
exports.NotFoundError = NotFoundError;
exports.NoInputFile = NoInputFile;
exports.ModelNotFoundError = ModelNotFoundError;

//# sourceMappingURL=Exceptions.js.map