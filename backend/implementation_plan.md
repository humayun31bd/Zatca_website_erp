# ZATCA Phase 2 & WhatsApp Middleware Engine Implementation

Based on `prompt.md` and `architecture.md`, here is the plan to proceed with the development of the API Engine and the White-Label Agency Portal.

## Open Questions

Before we dive into the code generation and implementation of the missing prompts, please clarify the following architectural decisions outlined in `architecture.md`:

> [!IMPORTANT]
> 1. **Frontend Dashboard:** Do you want to start building the White-Label UI Dashboard simultaneously with the API, or should we focus strictly on the API routes first?
> 2. **Database ORM:** For the future database, do you prefer **Prisma** or **Drizzle ORM**? (We can set up the schema now, even if we use Mock data initially).
> 3. **Queue System:** Next.js Serverless functions have time limits. For future queueing (WhatsApp background sending), do you want to use a separate Node.js worker, or a service like **Upstash QStash/Inngest** which works perfectly with Next.js?

## Proposed Implementation Plan

The project directory already contains a Next.js app setup. We will proceed by implementing the missing pieces step-by-step as outlined in the prompts.

### Phase 1: Foundation & Architecture Setup
- **Prompt 2 (Types & Interfaces):** 
  - Define interfaces for ZATCA Standard/Simplified invoice JSON payloads and Zod schemas in `src/types/invoice.ts`.
  - Define response structures for ZATCA and CSID in `src/types/zatca.ts`.
  - Define WhatsApp payload structures in `src/types/whatsapp.ts`.
  - Create Service Interfaces in `src/lib/services/interfaces.ts`.

### Phase 2: Mock Engine & Service Locator Setup
- **Prompt 3 (Mock ZATCA Engine):** 
  - Implement `MockZatcaService` in `src/lib/mock/mockZatcaService.ts`.
  - Create mock datasets in `src/lib/mock/mockInvoices.json`.
- **Prompt 4 (Mock WhatsApp Engine):** 
  - Implement `MockWhatsAppService` in `src/lib/mock/mockWhatsAppService.ts` to simulate Meta API deliveries and webhooks.
- **Prompt 5 (Service Locator):** 
  - Create `src/lib/services/serviceLocator.ts` to switch between Mock and Live services.
  - Create API Key validator in `src/lib/auth/keyValidator.ts`.

### Phase 3: Core API Endpoints Implementation
- **Prompt 6 (Unified Invoice Processing API):** 
  - Build `POST /api/v1/invoices/zatca-whatsapp` to handle clearance/reporting and WhatsApp delivery orchestration.
- **Prompt 7 (CSID & Webhooks):** 
  - Implement `/api/v1/csid/compliance`, `/api/v1/csid/production`, and `/api/v1/webhooks/whatsapp`.

### Phase 4 & 5: UI & Verification
- **Prompt 8 & 9:** 
  - Build the Agency Portal UI in `src/app/(dashboard)`.
  - Create the `scripts/test-api.ts` QA script.

## Verification Plan

### Automated Tests
- We will use the generated `scripts/test-api.ts` to send test B2B/B2C invoice payloads and verify mock clearances and WhatsApp deliveries.

### Manual Verification
- Testing API endpoints locally via VS Code REST Client or Postman.
- Validating the Next.js frontend UI dashboard for accurate tracking of mock invoice statuses.
