import { format } from 'date-fns';

/**
 * Safely formats a date string, handling null, undefined, empty strings, and invalid dates
 * @param dateString - The date string to format
 * @param formatString - The format string for date-fns (default: 'MMM dd, yyyy')
 * @param fallback - The fallback text to display for invalid dates (default: 'Invalid date')
 * @returns Formatted date string or fallback text
 */
export function safeFormatDate(
  dateString: string | null | undefined, 
  formatString: string = 'MMM dd, yyyy',
  fallback: string = 'Invalid date'
): string {
  // Handle null, undefined, or empty string
  if (!dateString || dateString === '') {
    return fallback;
  }
  
  try {
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return fallback;
    }
    
    return format(date, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return fallback;
  }
}

/**
 * Safely checks if a date string represents a valid date
 * @param dateString - The date string to validate
 * @returns true if the date is valid, false otherwise
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  if (!dateString || dateString === '') {
    return false;
  }
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (error) {
    return false;
  }
}

/**
 * Safely converts a date string to a Date object
 * @param dateString - The date string to convert
 * @returns Date object or null if invalid
 */
export function safeParseDate(dateString: string | null | undefined): Date | null {
  if (!dateString || dateString === '') {
    return null;
  }
  
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
}

/**
 * Gets a safe display text for assignment/admin-assigned certification dates
 * @param cert - The certification object
 * @returns Display text for the date
 */
export function getAssignmentDateDisplay(cert: any): string {
  if (cert.status === 'ADMIN_ASSIGNED') {
    if (cert.assignmentDetails?.assignedDate) {
      return `Assigned ${safeFormatDate(cert.assignmentDetails.assignedDate)}`;
    }
    if (cert.assignedDate) {
      return `Assigned ${safeFormatDate(cert.assignedDate)}`;
    }
    return 'Assigned by Admin';
  }
  
  if (!cert.obtainedDate || cert.obtainedDate === '') {
    return 'Date pending';
  }
  
  return safeFormatDate(cert.obtainedDate);
}