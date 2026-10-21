export interface CountryDialCode {
  name: string;
  code: string;
  dialCode: string;
}

export const HR_COUNTRY_CODES: CountryDialCode[] = [
  { name: 'Saudi Arabia', code: 'SA', dialCode: '+966' },
  { name: 'United Arab Emirates', code: 'AE', dialCode: '+971' },
  { name: 'Kuwait', code: 'KW', dialCode: '+965' },
  { name: 'Qatar', code: 'QA', dialCode: '+974' },
  { name: 'Bahrain', code: 'BH', dialCode: '+973' },
  { name: 'Oman', code: 'OM', dialCode: '+968' },
  { name: 'Egypt', code: 'EG', dialCode: '+20' },
  { name: 'Jordan', code: 'JO', dialCode: '+962' },
  { name: 'Lebanon', code: 'LB', dialCode: '+961' },
  { name: 'Bangladesh', code: 'BD', dialCode: '+880' },
  { name: 'India', code: 'IN', dialCode: '+91' },
  { name: 'Pakistan', code: 'PK', dialCode: '+92' },
  { name: 'Philippines', code: 'PH', dialCode: '+63' },
  { name: 'United States / Canada', code: 'US', dialCode: '+1' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44' },
  { name: 'Germany', code: 'DE', dialCode: '+49' },
  { name: 'France', code: 'FR', dialCode: '+33' },
  { name: 'Turkey', code: 'TR', dialCode: '+90' },
  { name: 'Sudan', code: 'SD', dialCode: '+249' },
  { name: 'Yemen', code: 'YE', dialCode: '+967' }
];

export const HR_NATIONALITIES: string[] = [
  'Saudi Arabian',
  'Emirati',
  'Kuwaiti',
  'Qatari',
  'Bahraini',
  'Omani',
  'Egyptian',
  'Jordanian',
  'Lebanese',
  'Bangladeshi',
  'Indian',
  'Pakistani',
  'Filipino',
  'Sudanese',
  'Yemeni',
  'Turkish',
  'Other'
];

export const HR_DEPARTMENTS: string[] = [
  'Human Resources (HR)',
  'Information Technology (IT)',
  'Finance & Accounting',
  'Sales & Marketing',
  'Operations & Logistics',
  'Customer Support',
  'Legal & Compliance',
  'Administration',
  'Research & Development'
];

export const HR_DESIGNATIONS: string[] = [
  'Software Engineer',
  'Senior Software Engineer',
  'Tech Lead / Architect',
  'HR Manager',
  'HR Officer / Generalist',
  'Chief Accountant',
  'Accountant',
  'Financial Analyst',
  'Sales Executive',
  'Sales Manager',
  'Operations Manager',
  'Marketing Specialist',
  'Customer Support Specialist',
  'Administrative Assistant',
  'General Manager'
];

export const HR_SHIFTS: string[] = [
  'Day Shift (09:00 AM - 05:00 PM)',
  'Morning Shift (08:00 AM - 04:00 PM)',
  'Evening Shift (02:00 PM - 10:00 PM)',
  'Night Shift (10:00 PM - 06:00 AM)',
  'Rotational Shift',
  'Flexible Working Hours (8 Hours/Day)'
];

export const HR_OFF_DAYS: string[] = [
  'Friday & Saturday',
  'Saturday & Sunday',
  'Friday Only',
  'Sunday Only',
  'Rotational Off Days'
];

export const HR_YEARLY_BENEFITS: string[] = [
  'Annual Bonus (1 Month Salary)',
  'Air Ticket Allowance (Annual Return Ticket)',
  'Medical Insurance (Class A - VIP Coverage)',
  '30 Days Paid Annual Vacation',
  'Housing Allowance (25% of Basic)',
  'Transportation Allowance (10% of Basic)',
  'End of Service Benefit (EOSB) as per Saudi Labor Law'
];

export const HR_POPULAR_SKILLS: string[] = [
  'Flutter & Dart',
  'ZATCA E-Invoicing',
  'Financial Accounting',
  'HR & Payroll Management',
  'Saudi Labor Law Compliance',
  'Node.js & TypeScript',
  'PostgreSQL / SQLite',
  'ERP Operations',
  'Project Management',
  'Sales & CRM',
  'Customer Relations'
];

export const HR_DOCUMENT_TYPES: string[] = [
  'National ID / Iqama Copy',
  'Saudi ID',
  'Passport Copy',
  'Driving License',
  'Iqama',
  'Visa',
  'Work Permit',
  'Employment Contract',
  'Educational Certificate',
  'Medical Fitness Certificate',
  'GOSI / Social Insurance Copy',
  'Other Document'
];

export const HR_GENDERS: string[] = ['Male', 'Female'];

export const HR_EMPLOYMENT_TYPES: string[] = [
  'Full-time',
  'Part-time',
  'Contract',
  'Temporary',
  'Intern'
];

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
