class CustomError extends Error {
    constructor(detailsObj) {
        super(detailsObj.message);
        Object.assign(this, detailsObj);
        this.name = this.constructor.name;
    }
}

module.exports = CustomError;