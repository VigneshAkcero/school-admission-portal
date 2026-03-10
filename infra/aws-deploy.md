# AWS Deployment Blueprint

## Core resources
- VPC with public + private subnets in 2 AZs
- RDS PostgreSQL 15 in private subnets
- API service on EC2 (or Elastic Beanstalk) behind ALB
- WebSocket API via API Gateway (route messages to backend service)
- S3 + CloudFront for `admin` and `student` static hosting
- Cognito user pool (optional if replacing custom admin JWT flow)
- Secrets Manager for DB/JWT secrets
- Route53 + ACM certificates

## DNS / domains
- `admin.yourschool.in` -> CloudFront admin distribution
- `exam.yourschool.in` -> CloudFront student distribution
- `api.yourschool.in` -> ALB
- `ws.yourschool.in` -> API Gateway WebSocket custom domain

## Build and publish
1. Build portals (`npm run build`) and upload static output to S3 buckets.
2. Invalidate CloudFront caches.
3. Deploy backend artifact to EC2/Beanstalk.
4. Store secrets in Secrets Manager and inject env vars into backend service.
5. Run health check: `/health`.

## Required backend env vars
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ADMIN_ORIGIN=https://admin.yourschool.in`
- `STUDENT_ORIGIN=https://exam.yourschool.in`

## Scaling notes
- Start: RDS `db.t3.micro`, single API instance.
- Next: add auto-scaling group and RDS read replica if needed.
