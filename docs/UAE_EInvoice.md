Core tax invoice (shared by every vertical)

These are the standard UAE VAT fields. The e-invoicing PINT AE schema adds structured fields, so check the Ministry of Finance mandatory-field list before locking the data model.

Header: the words "Tax Invoice" (Arabic and English), supplier name and address, supplier TRN, sequential invoice number, issue date, and supply date if different.
Customer: name, address, and TRN if VAT-registered.
Lines: description, quantity, unit price, discount, VAT rate (5%, 0%, exempt), line amount.
Totals: taxable amount, VAT amount in AED, total payable. If the invoice is in foreign currency, show the exchange rate and the VAT in AED.
Credit notes: a reference to the original invoice number and a reason code.

A simplified tax invoice (fewer fields) is generally allowed for sales to unregistered customers or low-value sales. Confirm the current threshold with the FTA.

Vertical add-ons
Vertical	Extra invoice fields and behavior
Retail	Barcode/SKU, serial or IMEI, return/exchange policy text, loyalty points earned and redeemed, a QR code, and a split-tender payment breakdown (cash, card, Tabby).
F&B / restaurant	Table number, covers, order type (dine-in, takeaway, delivery), service charge and tips as separate lines, delivery platform order ID, and kitchen/bar split.
Trading / wholesale	Delivery note and PO reference, Incoterms, payment terms (Net 30), credit limit status, lot/batch and expiry, customs and HS code for imports, and an Arabic/English packing list.
Contracting / projects	Project/contract reference, progress or milestone % billed, retention held (typically 5 to 10%), advance payment recovery, variation order reference, and cumulative billed-to-date.
Professional services	Engagement ID, timesheet hours by consultant, rate cards, disbursements, and retainer drawdown.
Clinics / healthcare	Patient ID, visit/encounter ID, doctor, service/CPT code, insurance split (insurer vs. patient co-pay), and VAT zero-rating/exemption flags for qualifying healthcare.
Real estate / property management	Unit and tenancy contract number, Ejari reference, rent period, and VAT treatment (residential vs. commercial).
Logistics	Shipment/AWB number, origin and destination, weight/volume, and disbursement lines for customs duty and demurrage.
Salon / services	Staff member, appointment ID, package or membership redemption, and a tip line.
Automotive / workshop	Plate number, chassis (VIN), odometer reading, a parts vs. labor split, and warranty flag.
Template behaviors for your product
Bilingual (Arabic RTL and English) by default, with an Arabic-only option.
A language toggle per customer.
Auto-select the correct VAT treatment (standard, zero-rated, exempt, reverse charge, designated zone).
A QR code on every invoice, in line with the e-invoicing format when applicable.
Locked invoice numbering with no gaps, plus an audit trail.
A logo and brand color theme per tenant.
