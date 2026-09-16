import { type ExecException } from "child_process";

const isExecException = (error: unknown): error is ExecException => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ("cmd" in error || "killed" in error || "signal" in error)
  );
};

class PasswordError extends Error {}

/**
 *
 *
 * @param e
 * @returns
 */
const isPasswordRequiredException = (e: unknown) => {
  if (isExecException(e)) {
    return String(e.stderr)
      .trim()
      .includes("please provide the correct password");
  } else {
    return false;
  }
};

export { isPasswordRequiredException, PasswordError };
