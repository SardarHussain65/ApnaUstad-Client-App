/**
 * Notification localization helper for Urdu & English.
 * Translates backend system notification titles, messages, and timestamps dynamically.
 */

const TITLE_TRANSLATIONS: Record<string, string> = {
  'Complaint submitted': 'شکایت درج ہو گئی',
  'Complaint received': 'شکایت موصول ہوئی',
  'Complaint resolved': 'شکایت حل ہو گئی',
  'Complaint closed': 'شکایت بند کر دی گئی',
  'Complaint closed — All clear': 'شکایت بند — سب کلیئر',
  'Complaint decision on booking': 'بکنگ پر شکایت کا فیصلہ',
  'New Job Request! 📅': 'کام کی نئی درخواست! 📅',
  'New Job Request': 'کام کی نئی درخواست',
  '🎉 CNIC Verified!': '🎉 شناختی کارڈ تصدیق شدہ!',
  'CNIC Verified': 'شناختی کارڈ تصدیق شدہ',
  '⚠️ CNIC Verification Update': '⚠️ شناختی کارڈ تصدیق اپڈیٹ',
  'Category activated': 'کیٹیگری آن ہو گئی',
  'Specialty request rejected': 'ہنر کی درخواست مسترد',
  'Weekly Earnings Summary': 'ہفتہ وار کمائی کا خلاصہ',
  'Official notice — ApnaUstad': 'سرکاری نوٹس — اپنا استاد',
  'Official warning — ApnaUstad': 'سرکاری وارننگ — اپنا استاد',
  'Account suspended': 'اکاؤنٹ معطل',
  'Ustad account suspended': 'استاد اکاؤنٹ معطل',
  'Booking accepted': 'بکنگ قبول ہو گئی',
  'Booking cancelled': 'بکنگ منسوخ ہو گئی',
  'Job started': 'کام شروع ہو گیا',
  'Job completed': 'کام مکمل ہو گیا',
  'Payment received': 'ادائیگی موصول ہو گئی',
  'New Review': 'نیا تبصرہ اور ریٹنگ',
  'Review received': 'نیا تبصرہ موصول ہوا',
};

export function localizeNotificationTitle(rawTitle: string | undefined | null, isUrdu: boolean): string {
  if (!rawTitle) return '';
  if (!isUrdu) return rawTitle;

  const trimmed = rawTitle.trim();

  // Exact match
  if (TITLE_TRANSLATIONS[trimmed]) {
    return TITLE_TRANSLATIONS[trimmed];
  }

  // Pattern: "New message in complaint #ABC123" or "New message in complaint ..."
  const complaintMsgMatch = trimmed.match(/^New message in complaint\s*(?:#?([A-Za-z0-9]+)|\.\.\.)?/i);
  if (complaintMsgMatch) {
    const caseRef = complaintMsgMatch[1];
    return caseRef ? `شکایت #${caseRef} میں نیا پیغام` : 'شکایت میں نیا پیغام';
  }

  // Pattern: "New <Category> Job Near You!"
  const newJobMatch = trimmed.match(/^New\s+(.+?)\s+Job Near You!?$/i);
  if (newJobMatch) {
    return `آپ کے قریب ${newJobMatch[1]} کا نیا کام!`;
  }

  return rawTitle;
}

export function localizeNotificationMessage(rawMessage: string | undefined | null, isUrdu: boolean): string {
  if (!rawMessage) return '';
  if (!isUrdu) return rawMessage;

  let msg = rawMessage.trim();

  // Pattern: "We received your report for booking #<REF>. Our team will review and update you soon."
  const reportReceived = msg.match(/^We received your report for booking\s*#?([A-Za-z0-9]+)\.\s*Our team will review and update you soon\.?/i);
  if (reportReceived) {
    return `ہمیں بکنگ #${reportReceived[1]} کی رپورٹ موصول ہو گئی ہے۔ ہماری ٹیم جلد جائزہ لے کر آگاہ کرے گی۔`;
  }

  // Pattern: "The <party> reported an issue on booking #<REF>. ApnaUstad will review it fairly."
  const disputeOpen = msg.match(/^The\s+(customer|worker|Customer|Worker|Ustad|ustad)\s+reported an issue on booking\s*#?([A-Za-z0-9]+)\.\s*ApnaUstad will review it fairly\.?/i);
  if (disputeOpen) {
    return `بکنگ #${disputeOpen[2]} پر شکایت درج کی گئی ہے۔ اپنا استاد کی ٹیم اس کا منصفانہ جائزہ لے گی۔`;
  }

  // Pattern: "Your report for booking #<REF> was resolved. Cash payment agreement was cancelled."
  const reportResolved = msg.match(/^Your report for booking\s*#?([A-Za-z0-9]+)\s*was resolved\.\s*Cash payment agreement was cancelled\.?(.*)$/i);
  if (reportResolved) {
    const extra = reportResolved[2]?.trim();
    return `بکنگ #${reportResolved[1]} کی رپورٹ حل ہو گئی۔ نقد ادائیگی کا معاہدہ منسوخ ہو گیا۔${extra ? ` ${extra}` : ''}`;
  }

  // Pattern: "Our team checked your report for booking #<REF> and closed it."
  const reportClosed = msg.match(/^Our team checked your report for booking\s*#?([A-Za-z0-9]+)\s*and closed it\.?(.*)$/i);
  if (reportClosed) {
    const extra = reportClosed[2]?.trim();
    return `ہماری ٹیم نے بکنگ #${reportClosed[1]} کی رپورٹ چیک کر کے بند کر دی۔${extra ? ` ${extra}` : ''}`;
  }

  // Pattern: "Good news! The report on booking #<REF> was closed in your favour."
  const clearClosed = msg.match(/^Good news!\s*The report on booking\s*#?([A-Za-z0-9]+)\s*was closed in your favour\.(.*?)Normal cash payment can continue\.?/i);
  if (clearClosed) {
    return `خوشخبری! بکنگ #${clearClosed[1]} کی رپورٹ آپ کے حق میں بند کر دی گئی۔ معمول کی نقد ادائیگی جاری رہ سکتی ہے۔`;
  }

  // Pattern: "Complaint review finished on booking #<REF>."
  const reviewFinished = msg.match(/^Complaint review finished on booking\s*#?([A-Za-z0-9]+)\.(.*)$/i);
  if (reviewFinished) {
    const extra = reviewFinished[2]?.trim();
    return `بکنگ #${reviewFinished[1]} پر شکایت کا جائزہ مکمل ہو گیا۔${extra ? ` ${extra}` : ''}`;
  }

  // Pattern: "A customer requested your <Category> service. Tap to see details."
  const bookingReq = msg.match(/^A customer requested your\s+(.+?)\s+service\.\s*Tap to see details\.?/i);
  if (bookingReq) {
    return `ایک کسٹمر نے آپ کی ${bookingReq[1]} سروس کی درخواست کی ہے۔ تفصیل کے لیے ٹیپ کریں۔`;
  }

  // Pattern: "A customer near you needs <Category> work: "<desc>""
  const nearJob = msg.match(/^A customer near you needs\s+(.+?)\s+work:\s*["“](.+?)["”]/i);
  if (nearJob) {
    return `آپ کے قریب ایک کسٹمر کو ${nearJob[1]} کے کام کی ضرورت ہے: "${nearJob[2]}"`;
  }

  // Pattern: "Your CNIC has been verified! A starter bonus of Rs. <X> has been credited to your wallet."
  const cnicBonus = msg.match(/^Your CNIC has been verified!\s*A starter bonus of Rs\.\s*([\d,]+)\s*has been credited to your wallet\.?/i);
  if (cnicBonus) {
    return `آپ کا شناختی کارڈ تصدیق ہو گیا! Rs. ${cnicBonus[1]} کا بونس آپ کے والٹ میں کریڈٹ کر دیا گیا ہے۔`;
  }

  // Pattern: "Your CNIC verification has been approved! You now have the Verified Ustad badge."
  if (/^Your CNIC verification has been approved/i.test(msg)) {
    return 'آپ کے شناختی کارڈ کی تصدیق منظور ہو گئی! اب آپ کو تصدیق شدہ استاد کا بیج مل گیا ہے۔';
  }

  // Pattern: "You earned Rs. <X> this week!"
  const earnings = msg.match(/^You earned Rs\.\s*([\d,]+)\s*this week!?/i);
  if (earnings) {
    return `آپ نے اس ہفتے Rs. ${earnings[1]} کمائے!`;
  }

  // Dispute room sender prefixes
  if (/^ApnaUstad Team:\s*/i.test(msg)) {
    return msg.replace(/^ApnaUstad Team:\s*/i, 'اپنا استاد ٹیم: ');
  }
  if (/^Customer:\s*/i.test(msg)) {
    return msg.replace(/^Customer:\s*/i, 'کسٹمر: ');
  }
  if (/^Ustad\s*([^:]*):\s*/i.test(msg)) {
    return msg.replace(/^Ustad\s*([^:]*):\s*/i, 'استاد $1: ');
  }

  // Warning & suspension notices
  const warnMatch = msg.match(/^Warning regarding complaint on booking\s*#?([A-Za-z0-9]+):\s*(.+)$/i);
  if (warnMatch) {
    return `بکنگ #${warnMatch[1]} پر شکایت کے حوالے سے وارننگ: ${warnMatch[2]}`;
  }

  const noticeMatch = msg.match(/^Notice regarding booking\s*#?([A-Za-z0-9]+):\s*(.+)$/i);
  if (noticeMatch) {
    return `بکنگ #${noticeMatch[1]} کے حوالے سے نوٹس: ${noticeMatch[2]}`;
  }

  const suspendedMatch = msg.match(/^Your ApnaUstad (?:Ustad )?account was suspended after complaint review\.\s*Reason:\s*(.+)$/i);
  if (suspendedMatch) {
    return `شکایت کے جائزے کے بعد آپ کا اکاؤنٹ معطل کر دیا گیا۔ وجہ: ${suspendedMatch[1]}`;
  }

  return rawMessage;
}

export function formatLocalizedTime(value: string, t: any, isUrdu: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('notifications.recently');

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return t('notifications.now');
  if (minutes < 60) return isUrdu ? `${minutes} منٹ پہلے` : `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isUrdu ? `${hours} گھنٹے پہلے` : `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return isUrdu ? `${days} دن پہلے` : `${days}d`;

  return date.toLocaleDateString(isUrdu ? 'ur-PK' : 'en-US', { month: 'short', day: 'numeric' });
}

