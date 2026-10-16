# Pawlingo ingest server

Receives the sound clips and labels that people opt in to share from the app, so they can be used to train a real pet-sound model later.

- **Clips** go to a Cloud Storage bucket: `clips/<dog|cat>/<installId>/<clipId>.m4a`
- **Metadata and owner labels** go to the Firestore collection `clips`
- **`DELETE /me`** removes everything for an install (the app's "Delete everything I've shared" button)

No names, accounts or locations are stored. Each phone has a random install ID.

## Deploy (Google Cloud, about 10 minutes)

Run these in Cloud Shell or anywhere `gcloud` is logged in. Replace `YOUR_PROJECT` with your project ID.

```bash
PROJECT=YOUR_PROJECT
REGION=africa-south1            # Johannesburg
BUCKET=$PROJECT-pawlingo-clips
APP_KEY=$(openssl rand -hex 24)  # save this, the app build needs it

gcloud config set project $PROJECT
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com storage.googleapis.com

# Skip this if the project already has a Firestore database
gcloud firestore databases create --location=$REGION

gcloud storage buckets create gs://$BUCKET --location=$REGION --uniform-bucket-level-access

# Run from the repo root
gcloud functions deploy pawlingo-ingest --gen2 --runtime=python312 --region=$REGION \
  --source=server --entry-point=ingest --trigger-http --allow-unauthenticated \
  --memory=256Mi --max-instances=5 \
  --set-env-vars=BUCKET=$BUCKET,APP_KEY=$APP_KEY

gcloud functions describe pawlingo-ingest --gen2 --region=$REGION --format='value(serviceConfig.uri)'
```

The last command prints the function URL. `--allow-unauthenticated` is needed because phones call it directly; the app key and input checks guard it.

## Connect the app builds

In the GitHub repo, go to **Settings → Secrets and variables → Actions**:

- **Variables** tab: add `PAWLINGO_API` = the function URL
- **Secrets** tab: add `PAWLINGO_KEY` = the `APP_KEY` from above

The next APK build picks them up. Builds without them still work; clips just wait on the phone until a build with them is installed.

## Exporting data for training

```bash
gcloud storage cp -r gs://$BUCKET/clips ./clips
```

Labels and metadata can be exported from Firestore (`gcloud firestore export gs://$BUCKET/exports`) or read with the Firestore client library.

## Tests

```bash
cd server
pip install functions-framework pytest
APP_KEY=test python -m pytest -q
```

## Before going public

- **Privacy policy:** Google Play requires one that matches the in-app consent text (clips may include background voices, a random ID, deletion on request). POPIA applies to South African users, GDPR if you allow EU downloads. Have your lawyer check it.
- **Play Console "Data safety":** declare audio recordings and app interactions, collected only with opt-in, deletable on request.
- **App key:** anyone can extract it from the APK. If abuse shows up, add Firebase App Check or per-install rate limits.
