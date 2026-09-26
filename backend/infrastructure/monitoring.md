# Monitoring & S3 Lifecycle Policies

## CloudWatch Alarms
Ensure the following alarms are configured in `me-central-1`:

1. **API Rate Limit Exceeded (429s)**
   - Metric: ALB `HTTPCode_Target_4XX_Count`
   - Threshold: > 100 per minute
   - Action: SNS Notification to engineering team.

2. **ZATCA Clearance Failures**
   - Custom Metric: `ZatcaClearanceFailureCount`
   - Threshold: > 5 per 5 minutes
   - Action: PagerDuty high-priority alert.

3. **RDS Database CPU/Storage**
   - Metric: `CPUUtilization` > 80%
   - Metric: `FreeStorageSpace` < 10GB

## S3 Lifecycle Policy (ZATCA Archival)
ZATCA mandates retaining invoices for up to 6 years.

```json
{
  "Rules": [
    {
      "ID": "MoveToGlacierAfter1Year",
      "Prefix": "cleared-invoices/",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 2190
      }
    }
  ]
}
```
