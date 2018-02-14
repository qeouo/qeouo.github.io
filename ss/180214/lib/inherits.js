function inherits(childCtor, parentCtor) {
    // ES6
    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(childCtor.prototype, parentCtor.prototype);
    }
    // ES5
    else if (Object.create) {
        childCtor.prototype = Object.create(parentCtor.prototype);
    }
    // legacy platform
    else {
        function tempCtor() {};
        tempCtor.prototype = parentCtor.prototype;
        childCtor.superClass_ = parentCtor.prototype;
        childCtor.prototype = new tempCtor();
        childCtor.prototype.constructor = childCtor;
    }
};
