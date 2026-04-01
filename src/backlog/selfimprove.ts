export function addLesson(_lesson: Record<string, unknown>): string {
  return "LESSON-1";
}

export function listLessons(
  _filters: Record<string, unknown>,
): Array<{ category: string; severity: string; title: string }> {
  return [];
}
