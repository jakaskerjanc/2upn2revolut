export const sl = {
  'app.title': '2upn2revolut',
  'app.tagline': 'UPN koda v EPC kodo, ki jo Revolut zna prebrati',

  'step.scan': 'Skeniraj',
  'step.pay': 'Plačaj',

  'desktop.title': 'Uporabite telefon',
  'desktop.instruction': 'Za skeniranje UPN kode potrebujete telefon s fotoaparatom.',
  'desktop.qrHint': 'S telefonom skenirajte to kodo, da odprete stran na njem.',
  'desktop.qrLabel': 'Povezava za odpiranje na telefonu',

  'phone.scanTitle': 'Skenirajte UPN kodo',
  'phone.scanInstruction': 'Telefon usmerite v QR kodo na položnici',
  'phone.cameraDenied': 'Dostop do fotoaparata je zavrnjen',
  'phone.cameraDeniedHelp': 'V nastavitvah brskalnika dovolite fotoaparat in poskusite znova.',
  'phone.cameraNotFound': 'Fotoaparata ni mogoče najti',
  'phone.cameraInsecure': 'Fotoaparat deluje samo prek HTTPS',
  'phone.cameraRetry': 'Poskusi znova',
  'phone.ready': 'EPC koda pripravljena',
  'phone.saveInstruction': 'Shranite EPC kodo in jo uvozite v Revolut',
  'phone.saveButton': 'Shrani EPC kodo',
  'phone.saveHelp': 'Če se koda ne shrani sama, jo pritisnite in zadržite ter izberite Shrani sliko.',
  'phone.payInstruction': 'V Revolutu odprite skener in izberite sliko iz galerije',
  'phone.openRevolut': 'Odpri Revolut',
  'phone.revolutFailed': 'Revoluta ni bilo mogoče odpreti. Odprite ga ročno in tapnite Skeniraj.',
  'phone.revolutStore': 'Pojdi na revolut.com',
  'phone.scanAnother': 'Skeniraj naslednjo položnico',

  'payment.name': 'Prejemnik',
  'payment.iban': 'IBAN',
  'payment.amount': 'Znesek',
  'payment.purpose': 'Koda namena',
  'payment.reference': 'Referenca',
  'payment.remittance': 'Namen plačila',

  'error.unknown': 'Prišlo je do nepričakovane napake.',
  'error.upnMalformed': 'Ta UPN koda je poškodovana.',
  'error.epcAmount': 'Znesek na položnici ni veljaven za EPC kodo.',
  'error.epcIban': 'Na položnici ni IBAN številke.',
  'error.saveFailed': 'Kode ni bilo mogoče shraniti. Pritisnite in zadržite sliko ter jo shranite ročno.',

  'lang.label': 'Jezik',
} as const;
