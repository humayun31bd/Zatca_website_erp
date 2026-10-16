export function calculateNextRunDate(
  currentRunDate: Date,
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'
): Date {
  const nextDate = new Date(currentRunDate.getTime());

  if (frequency === 'MONTHLY') {
    nextDate.setMonth(nextDate.getMonth() + 1);
  } else if (frequency === 'QUARTERLY') {
    nextDate.setMonth(nextDate.getMonth() + 3);
  } else if (frequency === 'ANNUAL') {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  }

  return nextDate;
}
