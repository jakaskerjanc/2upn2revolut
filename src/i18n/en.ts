import type { sl } from './sl';

export const en: Record<keyof typeof sl, string> = {
  'app.title': '2upn2revolut',
  'app.tagline': 'Turns a UPN code into an EPC code Revolut can read',

  'step.scan': 'Scan',
  'step.pay': 'Pay',

  'desktop.title': 'Use your phone',
  'desktop.instruction': 'Scanning the UPN code needs a phone with a camera.',
  'desktop.qrHint': 'Scan this code with your phone to open the page there.',
  'desktop.qrLabel': 'Link to open on your phone',

  'phone.scanTitle': 'Scan the UPN code',
  'phone.scanInstruction': 'Point your phone at the QR code on the bill',
  'phone.cameraDenied': 'Camera access denied',
  'phone.cameraDeniedHelp': 'Allow the camera in your browser settings, then try again.',
  'phone.cameraNotFound': 'No camera found',
  'phone.cameraInsecure': 'The camera only works over HTTPS',
  'phone.cameraRetry': 'Try again',
  'phone.ready': 'EPC code ready',
  'phone.saveInstruction': 'Save the EPC code, then import it into Revolut',
  'phone.saveButton': 'Save EPC code',
  'phone.saveHelp': 'If it does not save on its own, press and hold the code and choose Save Image.',
  'phone.payInstruction': 'In Revolut open the scanner and pick the image from your gallery',
  'phone.openRevolut': 'Open Revolut',
  'phone.revolutFailed': 'Revolut did not open. Open it manually and tap Scan.',
  'phone.revolutStore': 'Go to revolut.com',
  'phone.scanAnother': 'Scan another bill',

  'payment.name': 'Recipient',
  'payment.iban': 'IBAN',
  'payment.amount': 'Amount',
  'payment.purpose': 'Purpose code',
  'payment.reference': 'Reference',
  'payment.remittance': 'Payment purpose',

  'error.unknown': 'Something unexpected went wrong.',
  'error.upnMalformed': 'That UPN code is malformed.',
  'error.epcAmount': 'The amount on this bill is not valid for an EPC code.',
  'error.epcIban': 'This bill has no IBAN.',
  'error.saveFailed': 'Could not save the code. Press and hold the image to save it manually.',

  'lang.label': 'Language',
};
