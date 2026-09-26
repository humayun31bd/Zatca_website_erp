import { InvoicePayload } from "@/types/invoice";
import { WaDeliveryPayload, WaDeliveryResult } from "@/types/whatsapp";
import { ClearanceResponse, ReportingResponse, CsidComplianceResponse, CsidProductionResponse } from "@/types/zatca";

export interface IZatcaService {
  clearInvoice(invoice: InvoicePayload): Promise<ClearanceResponse>;
  reportInvoice(invoice: InvoicePayload): Promise<ReportingResponse>;
}

export interface IWhatsAppService {
  sendInvoice(payload: WaDeliveryPayload): Promise<WaDeliveryResult>;
}

export interface ICsidService {
  issueComplianceCsid(otp: string): Promise<CsidComplianceResponse>;
  issueProductionCsid(complianceRequestId: string): Promise<CsidProductionResponse>;
}
