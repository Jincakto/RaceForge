(function (root) {
    "use strict";

    const statusNames = {
        400: "Bad Request", 401: "Unauthorized", 402: "Payment Required", 403: "Forbidden",
        404: "Not Found", 405: "Method Not Allowed", 406: "Not Acceptable",
        407: "Proxy Authentication Required", 408: "Request Timeout", 409: "Conflict",
        410: "Gone", 411: "Length Required", 412: "Precondition Failed", 413: "Content Too Large",
        414: "URI Too Long", 415: "Unsupported Media Type", 416: "Range Not Satisfiable",
        417: "Expectation Failed", 421: "Misdirected Request", 422: "Unprocessable Content",
        423: "Locked", 424: "Failed Dependency", 425: "Too Early", 426: "Upgrade Required",
        428: "Precondition Required", 429: "Too Many Requests", 431: "Request Header Fields Too Large",
        451: "Unavailable For Legal Reasons", 500: "Internal Server Error", 501: "Not Implemented",
        502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout",
        505: "HTTP Version Not Supported", 506: "Variant Also Negotiates", 507: "Insufficient Storage",
        508: "Loop Detected", 510: "Not Extended", 511: "Network Authentication Required"
    };
    const nonEmpty = value => typeof value === "string" && value.trim() ? value.trim() : null;

    function errorLabel(response) {
        const status = Number(response.get("status"));
        if (!(status >= 400 && status <= 599)) {
            return response.get("error") && !(status > 0) ? "Unable to connect to the server." : null;
        }
        let body;
        try {
            body = JSON.parse(response.get("text"));
        } catch (_) {
            body = null;
        }
        const message = nonEmpty(body && body.message) || nonEmpty(body && body.data && body.data.message)
            || statusNames[status] || "HTTP Error";
        return status + " \u2014 " + message;
    }

    function plugin(system) {
        return {
            wrapComponents: {
                liveResponse: Original => function LiveResponse(props) {
                    const label = errorLabel(props.response);
                    if (label === null) {
                        return system.React.createElement(Original, props);
                    }
                    // Override only the live error heading; response body and headers remain untouched.
                    const getComponent = (name, ...args) => name === "Markdown"
                        ? () => system.React.createElement("div", { className: "raceforge-error-message" }, label)
                        : props.getComponent(name, ...args);
                    return system.React.createElement(Original, {
                        ...props,
                        response: props.response.set("error", true),
                        getComponent
                    });
                }
            }
        };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { errorLabel, plugin };
    }
    if (root.SwaggerUIBundle) {
        root.SwaggerUIBundle = new Proxy(root.SwaggerUIBundle, {
            apply(target, receiver, args) {
                const options = args[0] || {};
                return Reflect.apply(target, receiver, [{
                    ...options, plugins: [...(options.plugins || []), plugin]
                }, ...args.slice(1)]);
            }
        });
    }
})(globalThis);
