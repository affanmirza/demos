export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function sanitizePhoneNumber(phone: string): string {
  // Remove any non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}

export function isValidPhoneNumber(phone: string): boolean {
  // Basic validation for international phone numbers
  const cleanPhone = sanitizePhoneNumber(phone);
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

export function extractMessageType(message: string): 'doctor_inquiry' | 'review' | 'general' {
  const lowerMessage = message.toLowerCase();
  
  // Check for review-related keywords
  const reviewKeywords = ['review', 'feedback', 'ulasan', 'penilaian', 'puas', 'suka', 'bagus', 'buruk'];
  if (reviewKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'review';
  }
  
  // Check for doctor inquiry keywords
  const doctorKeywords = [
    'dokter', 'doctor', 'jadwal', 'schedule', 'spesialis', 'specialist',
    'kontrol', 'checkup', 'appointment', 'janji', 'booking', 'reservasi',
    'gejala', 'symptom', 'sakit', 'pain', 'konsultasi', 'consultation'
  ];
  
  if (doctorKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return 'doctor_inquiry';
  }
  
  return 'general';
}

export function generateRandomDoctorName(): string {
  const doctors = [
    'Dr. Sulaiman',
    'Dr. Sarah',
    'Dr. Ahmad',
    'Dr. Maria',
    'Dr. Budi',
    'Dr. Siti',
    'Dr. John',
    'Dr. Lisa'
  ];
  return doctors[Math.floor(Math.random() * doctors.length)];
}

export function generateRandomTime(): string {
  const hours = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
  return hours[Math.floor(Math.random() * hours.length)];
}

export function formatTimestamp(timestamp: string | Date): string {
  const date = new Date(timestamp);
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
} 