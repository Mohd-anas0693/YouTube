class ApiErrors extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        statck = "") {
        super(message)
        this.statusCode = statusCode;
        this.message = message;
        this.errors = errors;
        if (statck) {
            this.statck = statck
        }
        else {
            Error.captureStackTrace(this, this, constructor)
        }
    }
}
export { ApiErrors };   