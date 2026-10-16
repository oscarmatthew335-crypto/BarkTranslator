#!/usr/bin/env bash
# Updates the Pawlingo backend and sets up the weekly training job.
# Run from the repo root in Cloud Shell:  bash server/deploy.sh
# Safe to run again; it updates what's already there.
set -euo pipefail
PROJECT=${PROJECT:-pawlingo-a14f2d}
REGION=${REGION:-africa-south1}
# Cloud Scheduler is not offered in africa-south1; it only holds the timer and
# starts the job in $REGION, so the data stays in South Africa.
SCHED_REGION=${SCHED_REGION:-europe-west1}
BUCKET=$PROJECT-clips
SA=pawlingo-fn@$PROJECT.iam.gserviceaccount.com
gcloud config set project $PROJECT >/dev/null

echo ">> Updating the server (keeps your existing app key)"
APP_KEY=$(gcloud functions describe pawlingo-ingest --gen2 --region=$REGION \
  --format='value(serviceConfig.environmentVariables.APP_KEY)')
gcloud functions deploy pawlingo-ingest --gen2 --runtime=python312 --region=$REGION \
  --source=server --entry-point=ingest --trigger-http --allow-unauthenticated \
  --service-account=$SA --memory=256Mi --max-instances=5 \
  --set-env-vars=BUCKET=$BUCKET,APP_KEY=$APP_KEY --quiet >/dev/null
URL=$(gcloud functions describe pawlingo-ingest --gen2 --region=$REGION --format='value(serviceConfig.uri)')
echo -n "   model check (should say 204, no model yet): "
curl -s -o /dev/null -w "%{http_code}\n" "$URL/model?species=dog&fv=f1" \
  -H "X-App-Key: $APP_KEY" -H "X-Install-Id: $(printf 'a%.0s' {1..32})"

echo ">> Training job (builds a container, 3-6 minutes)"
gcloud services enable cloudscheduler.googleapis.com >/dev/null
gcloud run jobs deploy pawlingo-train --source=server/train --region=$REGION \
  --service-account=$SA --set-env-vars=BUCKET=$BUCKET \
  --memory=1Gi --task-timeout=30m --max-retries=0 --quiet

echo ">> Weekly schedule (Mondays 03:00 SA time)"
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA \
  --role=roles/run.invoker --condition=None -q >/dev/null
RUN_URI="https://run.googleapis.com/v2/projects/$PROJECT/locations/$REGION/jobs/pawlingo-train:run"
SCHED_ARGS=(--schedule="0 3 * * 1" --time-zone="Africa/Johannesburg" --uri="$RUN_URI"
  --http-method=POST --oauth-service-account-email=$SA)
if gcloud scheduler jobs describe pawlingo-train-weekly --location=$SCHED_REGION >/dev/null 2>&1; then
  gcloud scheduler jobs update http pawlingo-train-weekly --location=$SCHED_REGION "${SCHED_ARGS[@]}" >/dev/null
else
  gcloud scheduler jobs create http pawlingo-train-weekly --location=$SCHED_REGION "${SCHED_ARGS[@]}" >/dev/null
fi

echo ">> First training run (expect 'no labelled data yet' or 'need ... phones')"
gcloud run jobs execute pawlingo-train --region=$REGION --wait >/dev/null || true
sleep 10
gcloud logging read "resource.type=cloud_run_job AND resource.labels.job_name=pawlingo-train" \
  --limit=10 --format='value(textPayload)' --freshness=15m | grep -E '^\{' || echo "   (logs not in yet; check later)"
echo; echo "===== DONE ====="
