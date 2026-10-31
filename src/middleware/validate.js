import { ValidationError } from "../errors/AppError.js";

export function validate(schemas) {
    return (req, res, next) => {
        const validated = {};
        const details = [];

        for (const part of ["params", "query", "body"]) {
            if (!schemas[part]) continue;

            const result = schemas[part].safeParse(req[part] ?? {});
            if (result.success) {
                validated[part] = result.data;
            } else {
                details.push(...result.error.issues.map(issue => ({
                    location: part,
                    field: issue.path.join("."),
                    message: issue.message
                })));
            }
        }

        if (details.length > 0) return next(new ValidationError(details));

        req.validated = validated;
        next();
    };
}
