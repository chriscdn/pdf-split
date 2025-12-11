import { type ExecException } from "child_process";

const isExecException = (e: any): e is ExecException =>
    e &&
    typeof e === "object" &&
    "stdout" in e &&
    "stderr" in e;

const isPasswordRequiredException = (e: any) => (isExecException(e) && (
    e.stderr?.trim() ===
        "pdfcpu: please provide the correct password"
));

export { isPasswordRequiredException };
