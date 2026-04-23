# Infrastructure (Terraform + Google Cloud)

## Prerequisites

```bash
brew install terraform
brew install infracost
brew install google-cloud-sdk

gcloud auth login
gcloud auth application-default login
```

## Setup

1. Create a GCP project:
```bash
gcloud projects create diploma-thesis-2026 --name="Diploma Thesis"
gcloud config set project diploma-thesis-2026
```

2. Enable Compute Engine API:
```bash
gcloud services enable compute.googleapis.com
```

3. Link billing account (required, even with free trial):
```bash
gcloud billing accounts list
gcloud billing projects link diploma-thesis-2026 --billing-account=XXXXXX-XXXXXX-XXXXXX
```

4. Generate SSH key:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519
```

5. Configure variables:
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project ID
```

## Deploy

```bash
terraform init
terraform plan
terraform apply
terraform output instance_ip
```

## Cost estimation (Infracost)

```bash
infracost auth login
infracost breakdown --path .
```

## After VM is created

```bash
ssh deploy@$(terraform output -raw instance_ip)

# On the VM:
git clone https://github.com/YOUR_USERNAME/DiplomaThesis.git
cd DiplomaThesis
bash generate-env.sh > .env
# Edit .env — replace localhost with VM IP in VITE_API_URL and ALLOWED_ORIGINS
docker compose -f docker-compose.prod.yml up -d --build
```

## Destroy

```bash
terraform destroy
```

## Estimated cost

| Resource | Spec | Cost/month |
|---|---|---|
| e2-medium VM | 2 vCPU, 4 GB RAM | ~$24 |
| 30 GB pd-standard disk | | ~$1.20 |
| Static IP (in use) | | $0 |
| **Total** | | **~$25/month** |

Covered by $300 free trial credits (90 days).
