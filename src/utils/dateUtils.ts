import { format, parseISO, subDays } from 'date-fns';

// Format timestamp to readable time
export const formatTime = (timestamp: number): string => {
  return format(timestamp, 'h:mm a');
};

// Format timestamp to readable date
export const formatDate = (timestamp: number): string => {
  return format(timestamp, 'MMM d, yyyy');
};

// Format minutes to hours and minutes
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
};

// Get date range for the past week
export const getPastWeekDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    dates.push(format(date, 'yyyy-MM-dd'));
  }
  
  return dates;
};

// Get date range for the past month
export const getPastMonthDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = subDays(today, i);
    dates.push(format(date, 'yyyy-MM-dd'));
  }
  
  return dates;
};

// Get the day of week (Monday, Tuesday, etc.) from a date string
export const getDayOfWeek = (dateString: string): string => {
  return format(parseISO(dateString), 'EEE');
}; 