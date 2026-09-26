export interface ClearanceResponse {
  clearanceStatus: 'CLEARED' | 'FAILED' | 'PENDING';
  clearedXml?: string;
  clearedInvoice?: string;
  qrCodeBase64?: string;
  xmlHash?: string;
  validationResults?: any[];
}

export interface ReportingResponse {
  reportingStatus: 'REPORTED' | 'FAILED';
  reportingRequestId?: string;
  qrCodeBase64?: string;
  xmlHash?: string;
  warnings?: any[];
  validationResults?: any[];
}

export interface CsidComplianceResponse {
  complianceRequestId: string;
  binarySecurityToken: string;
  secret: string;
}

export interface CsidProductionResponse {
  issuedAt: string;
  expiresAt: string;
  csidToken: string;
}
