#!/usr/bin/env bash
# Run as the project owner in Google Cloud Shell, not using the MCP service key.
# Creates a keyless push identity. Grants no project-wide Owner/Admin roles.
set -euo pipefail
project_id=picket-510311
push_identity=picket-rtdn-push@picket-510311.iam.gserviceaccount.com
mcp_identity=play-console-mcp@picket-510311.iam.gserviceaccount.com
pubsub_agent=service-18042168468@gcp-sa-pubsub.iam.gserviceaccount.com

gcloud services enable iam.googleapis.com pubsub.googleapis.com --project="$project_id"
if ! gcloud iam service-accounts describe "$push_identity" --project="$project_id" >/dev/null 2>&1; then
  gcloud iam service-accounts create picket-rtdn-push --project="$project_id" --display-name="PicKet RTDN push identity"
fi
gcloud beta services identity create --service=pubsub.googleapis.com --project="$project_id" --quiet
gcloud iam service-accounts add-iam-policy-binding "$push_identity" --project="$project_id" \
  --member="serviceAccount:$mcp_identity" --role=roles/iam.serviceAccountUser --quiet
gcloud iam service-accounts add-iam-policy-binding "$push_identity" --project="$project_id" \
  --member="serviceAccount:$pubsub_agent" --role=roles/iam.serviceAccountTokenCreator --quiet
printf 'RTDN push identity is configured. No private key was created.\n'
