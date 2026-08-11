import type { z } from 'zod';

type FormErrors = Record<string, string>;

export function zodMantineValidate<T>(schema: z.ZodType) {
  return (values: T): FormErrors => {
    const result = schema.safeParse(values);
    if (result.success) {
      return {};
    }

    return result.error.issues.reduce<FormErrors>((errors, issue) => {
      const path = issue.path.join('.');
      if (path && !errors[path]) {
        errors[path] = issue.message;
      }
      return errors;
    }, {});
  };
}

export function focusFirstFormError(errors: Record<string, unknown>) {
  const firstPath = Object.keys(errors).find((key) => Boolean(errors[key]));
  if (!firstPath || typeof document === 'undefined') {
    return;
  }

  window.requestAnimationFrame(() => {
    const escapedPath = CSS.escape(firstPath);
    const target = document.querySelector<HTMLElement>(
      `[name="${escapedPath}"], [data-path="${escapedPath}"]`,
    );

    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  });
}
