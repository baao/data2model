/**
 * data2model
 * Author: michael
 * Date: 12.09.15.
 * License: MIT
 */
class Exceptions {
    constructor(message) {
        Error.call(this, message);
        this.message = message;
        Error.captureStackTrace(this, this.constructor);
        Object.defineProperty(this, 'name', {
            configurable: true,
            enumerable: false,
            value: this.constructor.name
        });
    }
}

Exceptions.prototype = new Error();

class NotFoundError extends Exceptions {
    constructor(message) {
        super(message);
        this.message = message;
    }
}
class ModelNotFoundError extends Exceptions {
    constructor(message) {
        super(message)
        this.message = message;
    }
}

class NoInputFile extends Exceptions {
    constructor(message) {
        super(message);
        this.message = message;
    }
}

export {
    Exceptions as default,
    NotFoundError as NotFoundError,
    NoInputFile as NoInputFile,
    ModelNotFoundError as ModelNotFoundError
}