export function deriveQueueName(input: string): string {
  const withoutSuffix = input.replace(/Queue$/, '');
  const kebab = withoutSuffix
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return kebab || input.toLowerCase();
}

export function deriveBindingName(queueName: string): string {
  return `QUEUE_${queueName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toUpperCase()}`;
}

export function makeImportName(queueName: string, isDefaultExport: boolean, exportName: string): string {
  if (!isDefaultExport) {
    return exportName;
  }
  return `__queue_${queueName.replace(/-/g, '_')}`;
}
