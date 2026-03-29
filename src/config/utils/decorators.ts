// ── Logger utilities ─────────────────────────────────────────

const SEP = '━'.repeat(55);

/**
 * Log a separator line
 */
export function logSep(): void {
  console.log(SEP);
}

/**
 * Log a key-value field
 */
export function logField(label: string, value: string | number): void {
  console.log(`  ${label.padEnd(22)} : ${value}`);
}

/**
 * Log a URL field
 */
export function logUrl(label: string, url: string): void {
  console.log(`  ${label.padEnd(22)} → ${url}`);
}

/**
 * Log a success message
 */
export function logSuccess(message: string): void {
  console.log(`  ✔  ${message}`);
}

// ── Test logging functions ───────────────────────────────────

/**
 * LOG SUITE: Logs when a test suite (describe block) starts.
 * Usage: logSuite('Suite Name')
 */
export function logSuite(name: string): void {
  console.log(`\n@suite :: ${name}`);
}

/**
 * LOG TEST: Logs when a test case starts.
 * Usage: logTest('Test Name')
 */
export function logTest(name: string): void {
  console.log(`\n  @test :: ${name}`);
}

/**
 * Decorator for page methods.
 * Logs method name as a step before execution and as success after execution.
 * Works with async methods.
 * 
 * Supports both old (experimentalDecorators) and new TC39 decorator syntax.
 */
export function step(target: any, context?: any): any {
  // New decorator syntax (TS 5.2+): target is the method, context has metadata
  if (context && typeof context === 'object' && context.name !== undefined) {
    const methodName = context.name;
    const originalMethod = target;

    return function (this: any, ...args: any[]) {
      // Call the original method
      const result = originalMethod.apply(this, args);

      // If result is a promise, chain logging after resolution
      if (result instanceof Promise) {
        return result
          .then((value) => {
            logSuccess(methodName);
            return value;
          })
          .catch((error) => {
            logSuccess(methodName);
            throw error;
          });
      }

      // For synchronous methods, log success immediately
      logSuccess(methodName);
      return result;
    };
  }

  // Old syntax fallback (traditional experimentalDecorators)
  const descriptor = context as PropertyDescriptor;
  if (!descriptor || typeof descriptor.value !== 'function') {
    return descriptor;
  }

  const originalMethod = descriptor.value;
  const methodName = target; // In old syntax, target is the property key

  descriptor.value = function (this: any, ...args: any[]) {
    const result = originalMethod.apply(this, args);

    if (result instanceof Promise) {
      return result
        .then((value) => {
          logSuccess(String(methodName));
          return value;
        })
        .catch((error) => {
          logSuccess(String(methodName));
          throw error;
        });
    }

    logSuccess(String(methodName));
    return result;
  };

  return descriptor;
}
