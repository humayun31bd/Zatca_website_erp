# ECS Fargate Deployment Guide (me-central-1)

## Architecture Overview
- **Compute:** AWS ECS Fargate (Serverless Containers).
- **Load Balancing:** Application Load Balancer (ALB) acting as the entry point, handling TLS termination.
- **Database:** Amazon RDS for PostgreSQL (Multi-AZ deployment for high availability).
- **Caching:** Amazon ElastiCache (Redis) for API Rate Limiting.
- **Secrets:** AWS Secrets Manager for `DATABASE_URL`, `META_WHATSAPP_TOKEN`, and ZATCA CSID.

## Deployment Steps
1. Build and push the Docker image to Amazon ECR.
2. Define an ECS Task Definition using the pushed image.
   - Allocate 1 vCPU and 2GB RAM minimum.
   - Inject environment variables via Secrets Manager ARNs.
3. Create an ECS Service attached to the ALB Target Group.
4. Configure Auto-Scaling:
   - Target Tracking Policy on CPU Utilization > 70%.
5. Ensure Security Groups restrict RDS access ONLY to the ECS Fargate subnets.
