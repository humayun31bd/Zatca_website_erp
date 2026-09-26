Section 1: General & Value Proposition
Q1: What is this ZATCA + WhatsApp API Platform?
It is a lightweight micro-SaaS API middleware that allows software developers, web agencies, and ERP providers in Saudi Arabia to generate ZATCA Phase 2 compliant e-invoices and instantly send them to clients via WhatsApp through a single, simple API call.

Q2: Who is this service designed for?
Our primary buyers are Software Agencies, Web Developers, POS Vendors, and Custom ERP Providers who want to offer ZATCA Phase 2 compliance and automated WhatsApp billing to their Saudi clients without building complex cryptography from scratch.

Q3: How does this help software agencies make money?
We offer a White-Label Reseller Model. You purchase API access from us at a wholesale rate (e.g., 50 SAR/month per client) and re-sell the branded solution to your end-clients for 150–250 SAR/month, generating pure Monthly Recurring Revenue (MRR) for your agency.

Q4: Why should we buy this API instead of building ZATCA compliance in-house?
Building ZATCA Phase 2 compliance in-house requires 2–4 months of senior engineering work, mastering mTLS security, UBL 2.1 XML formatting, ECDSA signing, and handling ongoing ZATCA API schema changes. Our solution plugs in via REST API in under 15 minutes, saving you thousands of dollars in development costs.

Section 2: ZATCA Phase 2 Technical Compliance
Q5: Is this system fully compliant with ZATCA Phase 2 (Integration Phase) rules?
Yes. The platform generates standardized UBL 2.1 XML files, computes SHA-256 invoice hashes with chaining, signs documents using ECDSA (secp256k1) cryptographic stamps, and generates compliant Base64 TLV QR codes.

Q6: Does the platform support both B2B (Standard) and B2C (Simplified) invoices?
Yes. The API automatically routes B2B Standard Invoices through ZATCA’s real-time Clearance API (blocking clearance before issuance) and queues B2C Simplified Invoices for ZATCA’s 24-hour Reporting API.

Q7: How does the system handle Cryptographic Stamp Identifiers (CSIDs)?
Our API automates the onboarding process. You can request Compliance CSIDs, submit test compliance invoices, and fetch Production CSIDs directly through our platform dashboard or API endpoints.

Q8: Does the API generate compliant PDF/A-3 files with embedded XML?
Yes. For B2C and cleared B2B invoices, our backend automatically generates a PDF/A-3 document with the ZATCA QR code rendered on top and the signed UBL 2.1 XML embedded inside.

Q9: What happens if ZATCA updates its tax regulations or XML schema?
We maintain and update the core middleware engine continuously. Whenever ZATCA updates its validation rules or API specs, we update our backend automatically—meaning your client integrations will never break or fail compliance audits.

Section 3: WhatsApp Integration & Delivery
Q10: How does WhatsApp integration work with ZATCA invoices?
When an invoice is cleared or reported via our API, our system formats an interactive Arabic/English WhatsApp notification via Meta’s Official Cloud API. It sends the invoice details, a preview of the ZATCA QR code, and a direct PDF download link straight to the customer’s WhatsApp inbox.

Q11: Are we required to use Meta’s Official WhatsApp Business API?
Yes. We integrate directly with the Meta Cloud API (BSP) to guarantee 99.9% delivery rates, prevent phone number bans, and support green checkmark verified business accounts.

Q12: Can end-clients pay their invoices directly through WhatsApp?
Yes. You can include hyperlinked payment buttons (supporting MADA, Apple Pay, and credit cards) within the WhatsApp message template so clients can view and pay their cleared invoices immediately.

Q13: Can agencies customize the WhatsApp message templates?
Yes. White-label agency partners can customize the messaging templates with their client's branding, logos, custom Arabic greeting texts, and call-to-action buttons.

Section 4: Infrastructure, Security & Data Regulations
Q14: Does this service comply with Saudi Arabia’s Cloud Data Residency laws?
Yes. Our cloud infrastructure and database nodes are hosted locally within Saudi Arabia (AWS Riyadh me-central-1 / local cloud providers), fully complying with the Cloud Computing Regulatory Framework (CCRF) and NDMO data protection rules.

Q15: How fast is the API response time for invoice clearance?
Our asynchronous Redis queue architecture processes invoice hashing, cryptographic signing, ZATCA mTLS communication, and WhatsApp delivery in under 300 milliseconds.

Q16: How is sensitive business and invoice data secured?
All payload data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. Cryptographic private keys and Production CSID tokens are isolated in secure hardware-level key vaults.

Section 5: Pricing, White-Labeling & Onboarding
Q17: What does the White-Labeling option include for agencies?
White-labeling allows you to hide our branding completely. You get a custom domain endpoint (e.g., zatca-api.youragency.sa), custom-branded WhatsApp messages, and a dedicated tenant dashboard showing your agency logo.

Q18: What are the pricing models available?
We offer flexible tier-based plans based on invoice volume:

Agency Starter: 299 SAR/mo (up to 1,000 invoices/mo)
Agency Growth: 899 SAR/mo (up to 10,000 invoices/mo)
Enterprise: Custom volume-based pricing for high-throughput ERPs.

Q19: How long does it take an agency to integrate the API into an existing web or mobile app?
Because our API accepts simple JSON data (rather than complex XML structures), a developer can complete integration, sandbox testing, and live deployment in less than an hour.

Q20: Do you provide a sandbox environment for testing before going live?
Yes. We provide a full Sandbox Developer Environment with mock ZATCA responses, test CSID generation, and test WhatsApp messaging triggers so you can build and verify your software before going into production